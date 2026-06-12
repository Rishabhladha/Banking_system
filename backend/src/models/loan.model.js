const mongoose = require("mongoose")

const loanSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Loan must be associated with a user" ],
        index: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Loan must be linked to an account for disbursement" ]
    },
    loanType: {
        type: String,
        enum: { values: [ "PERSONAL", "HOME", "AUTO", "EDUCATION", "BUSINESS" ], message: "Invalid loan type" },
        required: [ true, "Loan type is required" ]
    },
    amount: {
        type: Number,
        required: [ true, "Loan amount is required" ],
        min: [ 10000, "Minimum loan amount is ₹10,000" ],
        max: [ 10000000, "Maximum loan amount is ₹1,00,00,000" ]
    },
    tenureMonths: {
        type: Number,
        required: [ true, "Loan tenure in months is required" ],
        min: [ 6, "Minimum tenure is 6 months" ],
        max: [ 360, "Maximum tenure is 360 months (30 years)" ]
    },
    interestRate: {
        type: Number,
        default: null  // Set by admin on approval
    },
    emi: {
        type: Number,
        default: null  // Calculated on approval
    },
    status: {
        type: String,
        enum: { values: [ "PENDING", "APPROVED", "REJECTED", "DISBURSED", "CLOSED" ], message: "Invalid loan status" },
        default: "PENDING"
    },
    purpose: {
        type: String,
        trim: true,
        maxlength: [ 500, "Purpose cannot exceed 500 characters" ],
        default: null
    },
    adminNote: {
        type: String,
        trim: true,
        default: null
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    disbursedAt: {
        type: Date,
        default: null
    },
    loanNumber: {
        type: String,
        unique: true
    }
}, {
    timestamps: true
})

// Auto-generate loan number
loanSchema.pre("save", function (next) {
    if (!this.loanNumber) {
        this.loanNumber = "LN" + Date.now() + Math.floor(Math.random() * 1000)
    }
    next()
})

const loanModel = mongoose.model("loan", loanSchema)

module.exports = loanModel
