const mongoose = require('mongoose');


const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Ledger must be associated with an account" ],
        index: true,
        immutable: true
    },
    amount: {
        type: Number,
        required: [ true, "Amount is required for creating a ledger entry" ],
        min: [ 0.01, "Amount must be positive" ],
        immutable: true
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: false,
        default: null,
        index: true,
        immutable: true
    },
    depositRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "depositRequest",
        required: false,
        default: null,
        index: true,
        immutable: true
    },
    type: {
        type: String,
        enum: {
            values: [ "CREDIT", "DEBIT" ],
            message: "Type can be either CREDIT or DEBIT",
        },
        required: [ true, "Ledger type is required" ],
        immutable: true
    },
    entryType: {
        type: String,
        enum: {
            values: [
                "TRANSFER",
                "DEPOSIT_REQUEST",    // admin-approved user deposit request
                "WITHDRAWAL",         // user ATM-style withdrawal
                "LOAN_DISBURSAL",
                "LOAN_REPAYMENT",
                "INTEREST",
                "FEE",
                "REVERSAL",
                "ADMIN_DEPOSIT",      // direct admin credit
                "INITIAL_FUNDS",      // system seeding
                "OTHER"
            ],
            message: "Invalid entryType"
        },
        default: "OTHER",
        immutable: true
    },
    description: {
        type: String,
        default: null,
        trim: true,
        maxlength: [ 300, "Description cannot exceed 300 characters" ],
        immutable: true
    },
    // Admin who performed this entry (if applicable)
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null,
        immutable: true
    }
}, {
    timestamps: true   // FIX: was missing — statements need createdAt for date filters
})

ledgerSchema.index({ account: 1, createdAt: -1 })
ledgerSchema.index({ entryType: 1, createdAt: -1 })


function preventLedgerModification() {
    throw new Error("Ledger entries are immutable and cannot be modified or deleted");
}

ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
ledgerSchema.pre('updateOne', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('remove', preventLedgerModification);
ledgerSchema.pre('deleteMany', preventLedgerModification);
ledgerSchema.pre('updateMany', preventLedgerModification);
ledgerSchema.pre("findOneAndDelete", preventLedgerModification);
ledgerSchema.pre("findOneAndReplace", preventLedgerModification);


const ledgerModel = mongoose.model('ledger', ledgerSchema);

module.exports = ledgerModel;