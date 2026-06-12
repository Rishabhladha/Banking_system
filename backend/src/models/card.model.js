const mongoose = require("mongoose");

// Helper to generate a 16 digit card number
function generateCardNumber() {
    let number = "4"; // Visa starts with 4
    for (let i = 0; i < 15; i++) {
        number += Math.floor(Math.random() * 10).toString();
    }
    // Format as 4444 4444 4444 4444
    return number.match(/.{1,4}/g).join(" ");
}

const cardSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: true
    },
    cardNumber: {
        type: String,
        unique: true,
        default: generateCardNumber
    },
    cardholderName: {
        type: String,
        required: true,
        uppercase: true
    },
    expiryMonth: {
        type: String,
        required: true
    },
    expiryYear: {
        type: String,
        required: true
    },
    cvv: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["ACTIVE", "FROZEN", "CANCELLED"],
        default: "ACTIVE"
    },
    cardType: {
        type: String,
        enum: ["VIRTUAL_DEBIT", "PHYSICAL_DEBIT"],
        default: "VIRTUAL_DEBIT"
    },
    dailyLimit: {
        type: Number,
        default: 50000 // default 50k
    }
}, { timestamps: true });

const cardModel = mongoose.model("card", cardSchema);
module.exports = cardModel;
