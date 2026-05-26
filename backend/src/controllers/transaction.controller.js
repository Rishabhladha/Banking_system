const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification (fire-and-forget)
 */

async function createTransaction(req, res, next) {

    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than zero" })
    }

    try {

        const fromUserAccount = await accountModel.findOne({ _id: fromAccount })
        const toUserAccount = await accountModel.findOne({ _id: toAccount })

        if (!fromUserAccount || !toUserAccount) {
            return res.status(400).json({ message: "Invalid fromAccount or toAccount" })
        }

        /**
         * 2. Validate idempotency key
         */
        const isTransactionAlreadyExists = await transactionModel.findOne({ idempotencyKey })

        if (isTransactionAlreadyExists) {
            if (isTransactionAlreadyExists.status === "COMPLETED") {
                return res.status(200).json({
                    message: "Transaction already processed",
                    transaction: isTransactionAlreadyExists
                })
            }

            if (isTransactionAlreadyExists.status === "PENDING") {
                return res.status(200).json({ message: "Transaction is still processing" })
            }

            if (isTransactionAlreadyExists.status === "FAILED") {
                return res.status(500).json({ message: "Transaction processing failed, please retry" })
            }

            if (isTransactionAlreadyExists.status === "REVERSED") {
                return res.status(500).json({ message: "Transaction was reversed, please retry" })
            }
        }

        /**
         * 3. Check account status
         */
        if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
            return res.status(400).json({
                message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
            })
        }

        /**
         * 4. Derive sender balance from ledger
         */
        const balance = await fromUserAccount.getBalance()

        if (balance < amount) {
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
            })
        }

        /**
         * 5–9. Run the atomic ledger transaction
         * FIX: session is declared BEFORE try so catch block can always call abortTransaction()
         */
        let transaction
        const session = await mongoose.startSession()

        try {
            session.startTransaction()

            /**
             * 5. Create transaction (PENDING)
             */
            transaction = (await transactionModel.create([ {
                fromAccount,
                toAccount,
                amount,
                idempotencyKey,
                status: "PENDING"
            } ], { session }))[ 0 ]

            /**
             * 6. Create DEBIT ledger entry
             */
            await ledgerModel.create([ {
                account: fromAccount,
                amount: amount,
                transaction: transaction._id,
                type: "DEBIT"
            } ], { session })

            // NOTE: Removed the artificial 15-second delay that was here.
            // It caused MongoDB session timeouts and was purely a simulation artifact.

            /**
             * 7. Create CREDIT ledger entry
             */
            await ledgerModel.create([ {
                account: toAccount,
                amount: amount,
                transaction: transaction._id,
                type: "CREDIT"
            } ], { session })

            /**
             * 8. Mark transaction COMPLETED
             */
            await transactionModel.findOneAndUpdate(
                { _id: transaction._id },
                { status: "COMPLETED" },
                { session }
            )

            /**
             * 9. Commit MongoDB session
             */
            await session.commitTransaction()

        } catch (txError) {
            // FIX: always abort + end session on any error to prevent session leaks
            await session.abortTransaction()
            console.error("[Transaction] Aborted due to error:", txError.message)
            return res.status(500).json({
                message: "Transaction failed and was rolled back. Please retry.",
            })
        } finally {
            session.endSession()
        }

        /**
         * 10. Send email notification (fire-and-forget)
         */
        emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)
            .catch(err => console.error("[Email] Transaction email failed:", err.message))

        return res.status(201).json({
            message: "Transaction completed successfully",
            transaction: {
                _id: transaction._id,
                fromAccount,
                toAccount,
                amount,
                status: "COMPLETED",
                idempotencyKey
            }
        })

    } catch (err) {
        next(err)
    }
}

/**
 * - Create initial funds transaction (system user only)
 * - POST /api/transactions/system/initial-funds
 */
async function createInitialFundsTransaction(req, res, next) {
    try {
        const { toAccount, amount, idempotencyKey } = req.body

        if (!toAccount || !amount || !idempotencyKey) {
            return res.status(400).json({
                message: "toAccount, amount and idempotencyKey are required"
            })
        }

        if (amount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than zero" })
        }

        const toUserAccount = await accountModel.findOne({ _id: toAccount })

        if (!toUserAccount) {
            return res.status(400).json({ message: "Invalid toAccount" })
        }

        const fromUserAccount = await accountModel.findOne({ user: req.user._id })

        if (!fromUserAccount) {
            return res.status(400).json({ message: "System user account not found" })
        }

        const session = await mongoose.startSession()

        let transaction
        try {
            session.startTransaction()

            transaction = new transactionModel({
                fromAccount: fromUserAccount._id,
                toAccount,
                amount,
                idempotencyKey,
                status: "PENDING"
            })

            await ledgerModel.create([ {
                account: fromUserAccount._id,
                amount: amount,
                transaction: transaction._id,
                type: "DEBIT"
            } ], { session })

            await ledgerModel.create([ {
                account: toAccount,
                amount: amount,
                transaction: transaction._id,
                type: "CREDIT"
            } ], { session })

            transaction.status = "COMPLETED"
            await transaction.save({ session })

            await session.commitTransaction()

        } catch (txError) {
            await session.abortTransaction()
            console.error("[InitialFunds] Aborted due to error:", txError.message)
            return res.status(500).json({
                message: "Initial funds transaction failed and was rolled back.",
            })
        } finally {
            session.endSession()
        }

        return res.status(201).json({
            message: "Initial funds transaction completed successfully",
            transaction: transaction
        })

    } catch (err) {
        next(err)
    }
}

/**
 * - Get transaction history for a given account
 * - GET /api/transactions/:accountId
 */
async function getTransactionHistory(req, res, next) {
    try {
        const { accountId } = req.params

        // Verify the account belongs to the requesting user
        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        })

        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        const transactions = await transactionModel.find({
            $or: [
                { fromAccount: accountId },
                { toAccount: accountId }
            ]
        })
            .sort({ createdAt: -1 })   // newest first
            .limit(50)                  // cap at 50 for performance

        return res.status(200).json({ transactions })

    } catch (err) {
        next(err)
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    getTransactionHistory
}
