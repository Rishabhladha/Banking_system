const mongoose = require("mongoose")


const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Transaction must be associated with a from account" ],
        index: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Transaction must be associated with a to account" ],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: [ "PENDING", "COMPLETED", "FAILED", "REVERSED" ],
            message: "Status can be either PENDING, COMPLETED, FAILED or REVERSED",
        },
        default: "PENDING"
    },
    amount: {
        type: Number,
        required: [ true, "Amount is required for creating a transaction" ],
        min: [ 0.01, "Transaction amount must be positive" ]
    },
    idempotencyKey: {
        type: String,
        required: [ true, "Idempotency Key is required for creating a transaction" ],
        index: true,
        unique: true
    },
    transactionType: {
        type: String,
        enum: { values: [ "TRANSFER", "WITHDRAWAL", "REVERSAL", "DEPOSIT" ], message: "Invalid transaction type" },
        default: "TRANSFER"
    },
    note: {
        type: String,
        default: null,
        trim: true,
        maxlength: [ 200, "Note cannot exceed 200 characters" ]
    },
    // Extended fields for richer transaction data
    category: {
        type: String,
        enum: {
            values: [ "TRANSFER", "BILL_PAYMENT", "SALARY", "REFUND", "INTEREST", "FEE", "OTHER" ],
            message: "Invalid category"
        },
        default: "TRANSFER"
    },
    reference: {
        type: String,
        default: null,
        trim: true,
        maxlength: [ 100, "Reference cannot exceed 100 characters" ]
    }
}, {
    timestamps: true
})

transactionSchema.index({ fromAccount: 1, createdAt: -1 })
transactionSchema.index({ toAccount: 1, createdAt: -1 })
transactionSchema.index({ status: 1, createdAt: -1 })

const transactionModel = mongoose.model("transaction", transactionSchema)

module.exports = transactionModel