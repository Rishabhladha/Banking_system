const depositRequestModel = require("../models/depositRequest.model")
const accountModel = require("../models/account.model")

/**
 * POST /api/deposit-requests
 * User submits a deposit request — admin must approve before funds are credited
 */
async function createDepositRequestController(req, res, next) {
    try {
        const { accountId, amount, referenceNote } = req.body

        if (!accountId || !amount) {
            return res.status(400).json({ message: "accountId and amount are required" })
        }

        const parsedAmount = Number(amount)
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: "Amount must be a positive number" })
        }

        if (parsedAmount > 10_000_000) {
            return res.status(400).json({ message: "Maximum deposit request is ₹1,00,00,000" })
        }

        // Verify account belongs to this user and is active
        const account = await accountModel.findOne({ _id: accountId, user: req.user._id })
        if (!account) {
            return res.status(404).json({ message: "Account not found or does not belong to you" })
        }

        if (account.status !== "ACTIVE") {
            return res.status(400).json({ message: "Account must be ACTIVE to request a deposit" })
        }

        // Prevent spam — limit pending requests per user to 5
        const pendingCount = await depositRequestModel.countDocuments({
            user: req.user._id,
            status: "PENDING"
        })
        if (pendingCount >= 5) {
            return res.status(429).json({
                message: "You have too many pending deposit requests. Please wait for them to be processed."
            })
        }

        const request = await depositRequestModel.create({
            user: req.user._id,
            account: accountId,
            amount: parsedAmount,
            referenceNote: referenceNote || null
        })

        return res.status(201).json({
            message: "Deposit request submitted successfully. Awaiting admin approval.",
            request
        })

    } catch (err) {
        next(err)
    }
}

/**
 * GET /api/deposit-requests
 * User views their own deposit requests
 */
async function getUserDepositRequestsController(req, res, next) {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const filter = { user: req.user._id }
        if (status && [ "PENDING", "APPROVED", "REJECTED" ].includes(status)) {
            filter.status = status
        }

        const [ requests, total ] = await Promise.all([
            depositRequestModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("account", "accountNumber accountType"),
            depositRequestModel.countDocuments(filter)
        ])

        return res.status(200).json({
            requests,
            pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
        })

    } catch (err) {
        next(err)
    }
}

module.exports = {
    createDepositRequestController,
    getUserDepositRequestsController
}
