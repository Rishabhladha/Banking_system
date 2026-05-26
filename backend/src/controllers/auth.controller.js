const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")

/**
 * Helper: set JWT cookie with security flags
 */
function setCookieToken(res, token) {
    res.cookie("token", token, {
        httpOnly: true,                                          // Prevent JS access (XSS protection)
        secure: process.env.NODE_ENV === "production",          // HTTPS only in production
        sameSite: "strict",                                     // CSRF protection
        maxAge: 3 * 24 * 60 * 60 * 1000                       // 3 days in ms (matches JWT expiry)
    })
}

/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res, next) {
    try {
        const { email, password, name } = req.body

        if (!email || !password || !name) {
            return res.status(400).json({ message: "Email, password and name are required", status: "failed" })
        }

        const isExists = await userModel.findOne({ email })

        if (isExists) {
            return res.status(422).json({
                message: "User already exists with this email.",
                status: "failed"
            })
        }

        const user = await userModel.create({ email, password, name })

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

        setCookieToken(res, token)

        // Fire-and-forget — do NOT await here; email errors must not break the response
        emailService.sendRegistrationEmail(user.email, user.name).catch(err =>
            console.error("[Email] Registration email failed:", err.message)
        )

        return res.status(201).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        })

    } catch (err) {
        next(err)
    }
}

/**
 * - User Login Controller
 * - POST /api/auth/login
  */
async function userLoginController(req, res, next) {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required", status: "failed" })
        }

        const user = await userModel.findOne({ email }).select("+password")

        if (!user) {
            return res.status(401).json({ message: "Email or password is INVALID" })
        }

        const isValidPassword = await user.comparePassword(password)

        if (!isValidPassword) {
            return res.status(401).json({ message: "Email or password is INVALID" })
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

        setCookieToken(res, token)

        return res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        })

    } catch (err) {
        next(err)
    }
}


/**
 * - User Logout Controller
 * - POST /api/auth/logout
  */
async function userLogoutController(req, res, next) {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

        if (!token) {
            return res.status(200).json({ message: "User logged out successfully" })
        }

        await tokenBlackListModel.create({ token })

        res.clearCookie("token")

        return res.status(200).json({ message: "User logged out successfully" })

    } catch (err) {
        next(err)
    }
}


module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}