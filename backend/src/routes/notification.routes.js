const express = require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const { getNotificationsController, markNotificationReadController, markAllNotificationsReadController } = require("../controllers/notification.controller")

const router = express.Router()

router.get("/", authMiddleware, getNotificationsController)
router.put("/mark-all-read", authMiddleware, markAllNotificationsReadController)
router.put("/:id/read", authMiddleware, markNotificationReadController)

module.exports = router
