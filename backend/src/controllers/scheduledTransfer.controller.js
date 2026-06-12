const scheduledTransferModel = require("../models/scheduledTransfer.model")
const accountModel = require("../models/account.model")

/**
 * GET /api/scheduled-transfers
 * Get all scheduled transfers for the current user
 */
async function getScheduledTransfersController(req, res, next) {
    try {
        const transfers = await scheduledTransferModel.find({ user: req.user._id })
            .sort({ scheduledDate: 1 })
            .populate("fromAccount", "accountNumber accountType")
            .populate("toAccount", "accountNumber accountType")

        return res.status(200).json({ transfers })
    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/scheduled-transfers
 * Schedule a future transfer
 */
async function createScheduledTransferController(req, res, next) {
    try {
        const { fromAccountId, toAccountId, amount, scheduledDate, note } = req.body

        if (!fromAccountId || !toAccountId || !amount || !scheduledDate) {
            return res.status(400).json({ message: "fromAccountId, toAccountId, amount, and scheduledDate are required" })
        }

        const sDate = new Date(scheduledDate)
        if (sDate <= new Date()) {
            return res.status(400).json({ message: "Scheduled date must be in the future" })
        }

        const fromAccount = await accountModel.findOne({ _id: fromAccountId, user: req.user._id })
        if (!fromAccount) {
            return res.status(404).json({ message: "From account not found" })
        }

        const toAccount = await accountModel.findById(toAccountId)
        if (!toAccount) {
            return res.status(404).json({ message: "To account not found" })
        }

        const idempotencyKey = `sched-${req.user._id}-${fromAccountId}-${toAccountId}-${Date.now()}`

        const transfer = await scheduledTransferModel.create({
            user: req.user._id,
            fromAccount: fromAccountId,
            toAccount: toAccountId,
            toAccountNumber: toAccount.accountNumber,
            amount,
            note: note || null,
            scheduledDate: sDate,
            idempotencyKey,
            status: "PENDING"
        })

        return res.status(201).json({ transfer })
    } catch (err) {
        next(err)
    }
}

/**
 * DELETE /api/scheduled-transfers/:id
 * Cancel a pending scheduled transfer
 */
async function cancelScheduledTransferController(req, res, next) {
    try {
        const { id } = req.params

        const transfer = await scheduledTransferModel.findOne({ _id: id, user: req.user._id })

        if (!transfer) {
            return res.status(404).json({ message: "Scheduled transfer not found" })
        }

        if (transfer.status !== "PENDING") {
            return res.status(400).json({ message: "Only PENDING transfers can be cancelled" })
        }

        transfer.status = "CANCELLED"
        await transfer.save()

        return res.status(200).json({ message: "Scheduled transfer cancelled" })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    getScheduledTransfersController,
    createScheduledTransferController,
    cancelScheduledTransferController
}
