const accountModel = require("../models/account.model");
const ledgerModel = require("../models/ledger.model");


async function createAccountController(req, res, next) {
    try {
        const user = req.user;

        const account = await accountModel.create({
            user: user._id
        })

        return res.status(201).json({ account })

    } catch (err) {
        next(err)
    }
}

async function getUserAccountsController(req, res, next) {
    try {
        const accounts = await accountModel.find({ user: req.user._id });

        return res.status(200).json({ accounts })

    } catch (err) {
        next(err)
    }
}

async function getAccountBalanceController(req, res, next) {
    try {
        const { accountId } = req.params;

        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        })

        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        const balance = await account.getBalance();

        return res.status(200).json({
            accountId: account._id,
            balance: balance
        })

    } catch (err) {
        next(err)
    }
}


/**
 * - Deposit funds into the user's own account
 * - POST /api/accounts/deposit
 * - Creates a direct CREDIT ledger entry (simulates external deposit / ATM)
 */
async function depositController(req, res, next) {
    try {
        const { accountId, amount } = req.body

        if (!accountId || !amount) {
            return res.status(400).json({ message: "accountId and amount are required", status: "failed" })
        }

        if (typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({ message: "Amount must be a positive number", status: "failed" })
        }

        if (amount > 1_000_000) {
            return res.status(400).json({ message: "Maximum single deposit is ₹10,00,000", status: "failed" })
        }

        // Verify account exists and belongs to this user
        const account = await accountModel.findOne({ _id: accountId, user: req.user._id })

        if (!account) {
            return res.status(404).json({ message: "Account not found or does not belong to you", status: "failed" })
        }

        if (account.status !== "ACTIVE") {
            return res.status(400).json({ message: "Account must be ACTIVE to receive deposits", status: "failed" })
        }

        // Create a CREDIT ledger entry (no fromAccount — external source)
        await ledgerModel.create({
            account: account._id,
            amount,
            type: "CREDIT",
            transaction: null   // no linked transaction — direct external deposit
        })

        const newBalance = await account.getBalance()

        return res.status(201).json({
            message: "Deposit successful",
            accountId: account._id,
            deposited: amount,
            newBalance,
            status: "success"
        })

    } catch (err) {
        next(err)
    }
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    depositController
}