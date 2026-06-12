const express = require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const { getProfileController, updateProfileController, changePasswordController } = require("../controllers/profile.controller")

const router = express.Router()

router.get("/", authMiddleware, getProfileController)
router.put("/", authMiddleware, updateProfileController)
router.put("/change-password", authMiddleware, changePasswordController)

module.exports = router
