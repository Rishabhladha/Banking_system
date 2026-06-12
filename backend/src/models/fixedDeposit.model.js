const mongoose = require("mongoose")

const fixedDepositSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "FD must be associated with a user" ],
        index: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "FD must be associated with an account" ]
    },
    principal: {
        type: Number,
        required: [ true, "Principal amount is required" ],
        min: [ 1000, "Minimum FD amount is ₹1,000" ]
    },
    interestRate: {
        type: Number,
        required: [ true, "Interest rate is required" ],
        min: 0
    },
    tenureMonths: {
        type: Number,
        required: [ true, "Tenure in months is required" ],
        min: [ 1, "Minimum tenure is 1 month" ],
        max: [ 120, "Maximum tenure is 120 months (10 years)" ]
    },
    maturityDate: {
        type: Date,
        required: [ true, "Maturity date is required" ]
    },
    maturityAmount: {
        type: Number,
        required: [ true, "Maturity amount is required" ]
    },
    status: {
        type: String,
        enum: { values: [ "ACTIVE", "MATURED", "CLOSED" ], message: "FD status must be ACTIVE, MATURED or CLOSED" },
        default: "ACTIVE"
    },
    closedAt: {
        type: Date,
        default: null
    },
    fdNumber: {
        type: String,
        unique: true
    }
}, {
    timestamps: true
})

// Auto-generate FD number before save
fixedDepositSchema.pre("save", function (next) {
    if (!this.fdNumber) {
        this.fdNumber = "FD" + Date.now() + Math.floor(Math.random() * 1000)
    }
    next()
})

const fixedDepositModel = mongoose.model("fixedDeposit", fixedDepositSchema)

module.exports = fixedDepositModel
