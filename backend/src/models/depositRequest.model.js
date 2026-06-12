const mongoose = require("mongoose")

/**
 * Deposit Request Model
 *
 * Users can submit a deposit request — admin must approve before funds are credited.
 * This enforces proper banking control: only admins can add money to accounts.
 */
const depositRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Deposit request must be associated with a user" ],
        index: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Deposit request must be associated with an account" ],
        index: true
    },
    amount: {
        type: Number,
        required: [ true, "Amount is required" ],
        min: [ 1, "Minimum deposit request is ₹1" ],
        max: [ 10_000_000, "Maximum deposit request is ₹1,00,00,000" ]
    },
    status: {
        type: String,
        enum: {
            values: [ "PENDING", "APPROVED", "REJECTED" ],
            message: "Status must be PENDING, APPROVED, or REJECTED"
        },
        default: "PENDING",
        index: true
    },
    // User-supplied reference/note for this deposit (e.g. "ATM deposit", "Cheque no. 1234")
    referenceNote: {
        type: String,
        default: null,
        trim: true,
        maxlength: [ 200, "Reference note cannot exceed 200 characters" ]
    },
    // Admin fields
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    },
    adminNote: {
        type: String,
        default: null,
        trim: true,
        maxlength: [ 300, "Admin note cannot exceed 300 characters" ]
    },
    // The ledger entry created when approved
    ledgerEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ledger",
        default: null
    }
}, {
    timestamps: true
})

depositRequestSchema.index({ user: 1, status: 1, createdAt: -1 })
depositRequestSchema.index({ status: 1, createdAt: -1 })

const depositRequestModel = mongoose.model("depositRequest", depositRequestSchema)

module.exports = depositRequestModel
