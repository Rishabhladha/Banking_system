const mongoose = require("mongoose");
const accountModel = require("../models/account.model");
const ledgerModel = require("../models/ledger.model");
const notificationModel = require("../models/notification.model");


async function createAccountController(req, res, next) {
    try {
        const user = req.user;
        const { accountType, nickname } = req.body

        const account = await accountModel.create({
            user: user._id,
            accountType: accountType || "SAVINGS",
            nickname: nickname || null
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
 * NOTE: depositController HAS BEEN REMOVED.
 * Users must submit a deposit request via POST /api/deposit-requests.
 * Only admins can directly credit accounts.
 */

/**
 * - Withdraw funds from the user's own account
 * - POST /api/accounts/withdraw
 * - Creates a DEBIT ledger entry (simulates ATM cash withdrawal)
 */
async function withdrawController(req, res, next) {
    try {
        const { accountId, amount } = req.body

        if (!accountId || !amount) {
            return res.status(400).json({ message: "accountId and amount are required", status: "failed" })
        }

        const parsedAmount = Number(amount)

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: "Amount must be a positive number", status: "failed" })
        }

        if (parsedAmount > 500_000) {
            return res.status(400).json({ message: "Maximum single withdrawal is ₹5,00,000", status: "failed" })
        }

        const session = await mongoose.startSession()

        try {
            session.startTransaction()

            // ATOMIC WRITE LOCK: Lock account to prevent concurrent withdrawals
            const lockedAccount = await accountModel.findOneAndUpdate(
                { _id: accountId, user: req.user._id, status: "ACTIVE" },
                { $set: { updatedAt: new Date() } },
                { session, new: true }
            )

            if (!lockedAccount) {
                throw new Error("Account not found, inactive, or does not belong to you")
            }

            const balance = await lockedAccount.getBalance(session)

            if (balance < parsedAmount) {
                throw new Error(`Insufficient balance. Current balance is ₹${balance.toLocaleString("en-IN")}`)
            }

            await ledgerModel.create([{
                account: lockedAccount._id,
                amount: parsedAmount,
                type: "DEBIT",
                entryType: "WITHDRAWAL",
                description: `ATM/Cash withdrawal from account ${lockedAccount.accountNumber?.slice(-4)}`,
                transaction: null
            }], { session })

            const newBalance = await lockedAccount.getBalance(session)

            await session.commitTransaction()

            // Create notification
            notificationModel.create({
                user: req.user._id,
                title: "Withdrawal Successful",
                message: `₹${parsedAmount.toLocaleString("en-IN")} withdrawn from account ending ${lockedAccount.accountNumber?.slice(-4)}`,
                type: "INFO",
                link: "/transactions"
            }).catch(() => {})

            return res.status(201).json({
                message: "Withdrawal successful",
                accountId: lockedAccount._id,
                withdrawn: parsedAmount,
                newBalance,
                status: "success"
            })

        } catch (txError) {
            await session.abortTransaction()
            console.error("[Withdraw] Aborted:", txError.message)
            return res.status(400).json({
                message: txError.message || "Withdrawal failed",
                status: "failed"
            })
        } finally {
            session.endSession()
        }

    } catch (err) {
        next(err)
    }
}

/**
 * - Get account statement (filtered ledger entries)
 * - GET /api/accounts/statement/:accountId
 */
async function getStatementController(req, res, next) {
    try {
        const { accountId } = req.params
        const { from, to, type, limit = 100 } = req.query

        const account = await accountModel.findOne({ _id: accountId, user: req.user._id })

        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        const filter = { account: accountId }

        if (type && (type === "CREDIT" || type === "DEBIT")) {
            filter.type = type
        }

        if (from || to) {
            filter.createdAt = {}
            if (from) filter.createdAt.$gte = new Date(from)
            if (to) filter.createdAt.$lte = new Date(to)
        }

        const entries = await ledgerModel.find(filter)
            .sort({ createdAt: -1 })
            .limit(Math.min(Number(limit), 500))
            .populate("transaction", "transactionType note fromAccount toAccount")

        const balance = await account.getBalance()

        return res.status(200).json({
            account: {
                _id: account._id,
                accountNumber: account.accountNumber,
                accountType: account.accountType,
                currency: account.currency
            },
            balance,
            entries,
            count: entries.length
        })

    } catch (err) {
        next(err)
    }
}

/**
 * Update account nickname
 * - PATCH /api/accounts/:accountId/nickname
 */
async function updateAccountNicknameController(req, res, next) {
    try {
        const { accountId } = req.params
        const { nickname } = req.body

        const account = await accountModel.findOneAndUpdate(
            { _id: accountId, user: req.user._id },
            { nickname },
            { new: true }
        )

        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        return res.status(200).json({ account })
    } catch (err) {
        next(err)
    }
}


module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    // depositController removed — use /api/deposit-requests instead
    withdrawController,
    getStatementController,
    updateAccountNicknameController
}