const mongoose = require("mongoose")
const ledgerModel = require("./ledger.model")

// Generate a random 12-digit account number
function generateAccountNumber() {
    return String(Math.floor(100000000000 + Math.random() * 900000000000))
}

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Account must be associated with a user" ],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: [ "ACTIVE", "FROZEN", "CLOSED" ],
            message: "Status can be either ACTIVE, FROZEN or CLOSED",
        },
        default: "ACTIVE"
    },
    currency: {
        type: String,
        required: [ true, "Currency is required for creating an account" ],
        default: "INR"
    },
    accountType: {
        type: String,
        enum: { values: [ "SAVINGS", "CURRENT" ], message: "Account type must be SAVINGS or CURRENT" },
        default: "SAVINGS"
    },
    accountNumber: {
        type: String,
        unique: true,
        default: generateAccountNumber
    },
    nickname: {
        type: String,
        default: null,
        trim: true
    }
}, {
    timestamps: true
})

accountSchema.index({ user: 1, status: 1 })

accountSchema.methods.getBalance = async function (session = null) {

    const aggregateQuery = ledgerModel.aggregate([
        { $match: { account: this._id } },
        {
            $group: {
                _id: null,
                totalDebit: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "DEBIT" ] },
                            "$amount",
                            0
                        ]
                    }
                },
                totalCredit: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "CREDIT" ] },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                balance: { $subtract: [ "$totalCredit", "$totalDebit" ] }
            }
        }
    ]);

    if (session) {
        aggregateQuery.session(session);
    }

    const balanceData = await aggregateQuery;

    if (balanceData.length === 0) {
        return 0
    }

    return balanceData[ 0 ].balance

}


const accountModel = mongoose.model("account", accountSchema)



module.exports = accountModel