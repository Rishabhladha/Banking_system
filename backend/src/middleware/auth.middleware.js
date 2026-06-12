const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blackList.model")


/**
 * Shared helper: extract token from cookie or Authorization header,
 * check blacklist, and verify JWT signature.
 * Returns { token, decoded } on success, or sends the error response directly and returns null.
 */
async function extractAndValidateToken(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        res.status(401).json({ message: "Unauthorized access, token is missing" })
        return null
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token })

    if (isBlacklisted) {
        res.status(401).json({ message: "Unauthorized access, token is invalid" })
        return null
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        return { token, decoded }
    } catch (err) {
        res.status(401).json({ message: "Unauthorized access, token is invalid" })
        return null
    }
}


/**
 * Standard auth middleware — verifies any authenticated user
 */
async function authMiddleware(req, res, next) {
    const result = await extractAndValidateToken(req, res)
    if (!result) return  // response already sent

    const user = await userModel.findById(result.decoded.userId)
    req.user = user

    return next()
}

/**
 * System user auth middleware — verifies the user has systemUser: true (RBAC)
 */
async function authSystemUserMiddleware(req, res, next) {
    const result = await extractAndValidateToken(req, res)
    if (!result) return  // response already sent

    const user = await userModel.findById(result.decoded.userId).select("+systemUser")

    if (!user.systemUser) {
        return res.status(403).json({ message: "Forbidden access, not a system user" })
    }

    req.user = user

    return next()
}

/**
 * Admin middleware — verifies the user has role admin or staff
 */
async function adminMiddleware(req, res, next) {
    const result = await extractAndValidateToken(req, res)
    if (!result) return

    const user = await userModel.findById(result.decoded.userId)

    if (!user) {
        return res.status(401).json({ message: "User not found" })
    }

    if (user.role !== "admin" && user.role !== "staff") {
        return res.status(403).json({ message: "Forbidden: Admin or staff access required" })
    }

    req.user = user
    return next()
}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware,
    adminMiddleware
}