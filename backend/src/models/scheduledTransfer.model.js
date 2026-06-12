const mongoose = require("mongoose")

const scheduledTransferSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Scheduled transfer must be associated with a user" ],
        index: true
    },
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "From account is required" ]
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "To account is required" ]
    },
    toAccountNumber: {
        type: String,
        default: null
    },
    amount: {
        type: Number,
        required: [ true, "Amount is required" ],
        min: [ 1, "Amount must be greater than zero" ]
    },
    note: {
        type: String,
        default: null,
        trim: true,
        maxlength: 200
    },
    scheduledDate: {
        type: Date,
        required: [ true, "Scheduled date is required" ]
    },
    status: {
        type: String,
        enum: { values: [ "PENDING", "EXECUTED", "CANCELLED", "FAILED" ], message: "Invalid status" },
        default: "PENDING"
    },
    executedAt: {
        type: Date,
        default: null
    },
    failureReason: {
        type: String,
        default: null
    },
    idempotencyKey: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
})

scheduledTransferSchema.index({ scheduledDate: 1, status: 1 })

const scheduledTransferModel = mongoose.model("scheduledTransfer", scheduledTransferSchema)

module.exports = scheduledTransferModel
