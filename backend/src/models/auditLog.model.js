const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Audit log must have an admin actor" ],
        index: true
    },
    action: {
        type: String,
        required: [ true, "Action is required in audit log" ],
        enum: {
            values: [
                "ACCOUNT_FREEZE",
                "ACCOUNT_UNFREEZE",
                "ACCOUNT_CLOSE",
                "ACCOUNT_CREATE",
                "DEPOSIT",
                "DEPOSIT_REQUEST_APPROVE",
                "DEPOSIT_REQUEST_REJECT",
                "WITHDRAW",
                "LOAN_APPROVE",
                "LOAN_REJECT",
                "LOAN_DISBURSE",
                "TRANSACTION_REVERSE",
                "KYC_VERIFY",
                "KYC_REJECT",
                "USER_CREATE",
                "USER_LOCK",
                "USER_UNLOCK",
                "ADMIN_LOGIN",
                "ADMIN_VERIFY_PIN"
            ],
            message: "Invalid audit action"
        }
    },
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },
    targetAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        default: null
    },
    targetTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        default: null
    },
    details: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    ip: {
        type: String,
        default: null
    }
}, {
    timestamps: true
})

auditLogSchema.index({ admin: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ targetUser: 1, createdAt: -1 })

const auditLogModel = mongoose.model("auditLog", auditLogSchema)

module.exports = auditLogModel
