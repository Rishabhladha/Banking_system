const mongoose = require("mongoose")

const beneficiarySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Beneficiary must be associated with a user" ],
        index: true
    },
    accountNumber: {
        type: String,
        required: [ true, "Account number is required" ],
        trim: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        default: null
    },
    nickname: {
        type: String,
        required: [ true, "Nickname is required for a beneficiary" ],
        trim: true,
        maxlength: [ 50, "Nickname cannot exceed 50 characters" ]
    },
    bankName: {
        type: String,
        default: "NexaBank",
        trim: true
    },
    ifscCode: {
        type: String,
        default: "NEXA0000001",
        trim: true
    }
}, {
    timestamps: true
})

beneficiarySchema.index({ user: 1, accountNumber: 1 }, { unique: true })

const beneficiaryModel = mongoose.model("beneficiary", beneficiarySchema)

module.exports = beneficiaryModel
