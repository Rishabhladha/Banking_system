const notificationModel = require("../models/notification.model")

/**
 * GET /api/notifications
 * Get notifications for the current user
 */
async function getNotificationsController(req, res, next) {
    try {
        const { unreadOnly, limit = 50 } = req.query

        const filter = { user: req.user._id }
        if (unreadOnly === "true") filter.read = false

        const notifications = await notificationModel.find(filter)
            .sort({ createdAt: -1 })
            .limit(Math.min(Number(limit), 200))

        const unreadCount = await notificationModel.countDocuments({ user: req.user._id, read: false })

        return res.status(200).json({ notifications, unreadCount })
    } catch (err) {
        next(err)
    }
}

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
async function markNotificationReadController(req, res, next) {
    try {
        const { id } = req.params
        await notificationModel.findOneAndUpdate(
            { _id: id, user: req.user._id },
            { read: true }
        )
        return res.status(200).json({ message: "Notification marked as read" })
    } catch (err) {
        next(err)
    }
}

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read
 */
async function markAllNotificationsReadController(req, res, next) {
    try {
        await notificationModel.updateMany(
            { user: req.user._id, read: false },
            { read: true }
        )
        return res.status(200).json({ message: "All notifications marked as read" })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    getNotificationsController,
    markNotificationReadController,
    markAllNotificationsReadController
}
