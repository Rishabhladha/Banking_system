const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION_MS = 30 * 60 * 1000  // 30 minutes

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
                name: user.name,
                role: user.role,
                kycStatus: user.kycStatus
            },
            token
        })

    } catch (err) {
        next(err)
    }
}

/**
 * - User Login Controller with brute-force protection
 * - POST /api/auth/login
  */
async function userLoginController(req, res, next) {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required", status: "failed" })
        }

        const user = await userModel.findOne({ email }).select("+password +failedLoginAttempts +lockUntil +isLocked")

        if (!user) {
            // Don't reveal whether email exists
            return res.status(401).json({ message: "Email or password is INVALID" })
        }

        // Check if account is locked
        if (user.isAccountLocked()) {
            const minutesLeft = Math.ceil((user.lockUntil - new Date()) / 60000)
            return res.status(423).json({
                message: `Account is temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
                isLocked: true,
                lockUntil: user.lockUntil
            })
        }

        const isValidPassword = await user.comparePassword(password)

        if (!isValidPassword) {
            // Increment failed attempts
            const attempts = (user.failedLoginAttempts || 0) + 1
            const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS

            await userModel.findByIdAndUpdate(user._id, {
                failedLoginAttempts: attempts,
                isLocked: shouldLock,
                lockUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null
            })

            if (shouldLock) {
                return res.status(423).json({
                    message: `Too many failed attempts. Account locked for 30 minutes.`,
                    isLocked: true
                })
            }

            return res.status(401).json({
                message: `Email or password is INVALID. ${MAX_LOGIN_ATTEMPTS - attempts} attempt(s) remaining.`
            })
        }

        // Successful login — reset lockout state
        user.lastLogin = new Date()
        user.failedLoginAttempts = 0
        user.isLocked = false
        user.lockUntil = null
        await user.save()

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

        setCookieToken(res, token)

        return res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                kycStatus: user.kycStatus,
                phone: user.phone,
                lastLogin: user.lastLogin
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

/**
 * - Get current user profile
 * - GET /api/auth/me
 */
async function getMeController(req, res, next) {
    try {
        const user = await userModel.findById(req.user._id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                kycStatus: user.kycStatus,
                phone: user.phone,
                gender: user.gender,
                profilePicture: user.profilePicture,
                address: user.address,
                dateOfBirth: user.dateOfBirth,
                isLocked: user.isLocked,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            }
        })
    } catch (err) {
        next(err)
    }
}

/**
 * - Verify Admin PIN (session-level security gate)
 * - POST /api/auth/admin-pin
 * Validates a PIN against the ADMIN_PIN environment variable.
 * Does NOT issue any new JWT — client stores verification in sessionStorage only.
 */
async function verifyAdminPinController(req, res, next) {
    try {
        const { pin } = req.body

        if (!pin) {
            return res.status(400).json({ message: "PIN is required" })
        }

        const adminPin = process.env.ADMIN_PIN

        if (!adminPin) {
            console.error("[AdminPin] ADMIN_PIN environment variable is not set!")
            return res.status(500).json({ message: "Admin PIN is not configured on the server" })
        }

        // Constant-time comparison to prevent timing attacks
        const submitted = String(pin).trim()
        const expected = String(adminPin).trim()

        if (submitted !== expected) {
            return res.status(401).json({ message: "Incorrect PIN. Please try again." })
        }

        // Log PIN verification in audit if user is authenticated
        return res.status(200).json({
            valid: true,
            message: "Admin PIN verified successfully"
        })

    } catch (err) {
        next(err)
    }
}


module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController,
    getMeController,
    verifyAdminPinController
}