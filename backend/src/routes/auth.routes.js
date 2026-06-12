const authRouter = require("express").Router()

const {
    userRegisterController,
    userLoginController,
    userLogoutController,
    getMeController,
    verifyAdminPinController
} = require("../controllers/auth.controller")

const { authMiddleware, adminMiddleware } = require("../middleware/auth.middleware")

authRouter.post("/register", userRegisterController)
authRouter.post("/login", userLoginController)
authRouter.post("/logout", userLogoutController)
authRouter.get("/me", authMiddleware, getMeController)

// Admin PIN session verification (must be logged in as admin/staff)
authRouter.post("/admin-pin", adminMiddleware, verifyAdminPinController)

module.exports = authRouter