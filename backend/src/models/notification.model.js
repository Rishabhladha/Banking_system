const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Notification must be associated with a user" ],
        index: true
    },
    title: {
        type: String,
        required: [ true, "Notification title is required" ],
        trim: true
    },
    message: {
        type: String,
        required: [ true, "Notification message is required" ],
        trim: true
    },
    type: {
        type: String,
        enum: { values: [ "INFO", "SUCCESS", "WARNING", "ALERT" ], message: "Invalid notification type" },
        default: "INFO"
    },
    read: {
        type: Boolean,
        default: false
    },
    link: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true
})

notificationSchema.index({ user: 1, read: 1, createdAt: -1 })

const notificationModel = mongoose.model("notification", notificationSchema)

module.exports = notificationModel
