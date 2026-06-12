const fixedDepositModel = require("../models/fixedDeposit.model")
const accountModel = require("../models/account.model")
const ledgerModel = require("../models/ledger.model")
const notificationModel = require("../models/notification.model")

// Interest rate tiers by tenure
function getInterestRate(tenureMonths) {
    if (tenureMonths <= 3)  return 5.5
    if (tenureMonths <= 6)  return 6.0
    if (tenureMonths <= 12) return 6.75
    if (tenureMonths <= 24) return 7.0
    if (tenureMonths <= 36) return 7.25
    if (tenureMonths <= 60) return 7.5
    return 7.75  // 5–10 years
}

// Calculate maturity amount using compound interest (quarterly compounding)
function calculateMaturityAmount(principal, annualRate, tenureMonths) {
    const r = annualRate / 100 / 4       // quarterly rate
    const n = tenureMonths / 3           // number of quarters
    return Math.round(principal * Math.pow(1 + r, n) * 100) / 100
}

/**
 * GET /api/fixed-deposits
 * Get all FDs for the current user
 */
async function getFixedDepositsController(req, res, next) {
    try {
        const fds = await fixedDepositModel.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate("account", "accountNumber accountType")

        return res.status(200).json({ fixedDeposits: fds })
    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/fixed-deposits
 * Open a new Fixed Deposit
 */
async function createFixedDepositController(req, res, next) {
    try {
        const { accountId, principal, tenureMonths } = req.body

        if (!accountId || !principal || !tenureMonths) {
            return res.status(400).json({ message: "accountId, principal, and tenureMonths are required" })
        }

        if (principal < 1000) {
            return res.status(400).json({ message: "Minimum FD amount is ₹1,000" })
        }

        const account = await accountModel.findOne({ _id: accountId, user: req.user._id })

        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        if (account.status !== "ACTIVE") {
            return res.status(400).json({ message: "Account must be ACTIVE to open an FD" })
        }

        const balance = await account.getBalance()

        if (balance < principal) {
            return res.status(400).json({ message: `Insufficient balance. Available: ₹${balance.toLocaleString("en-IN")}` })
        }

        const interestRate = getInterestRate(Number(tenureMonths))
        const maturityDate = new Date()
        maturityDate.setMonth(maturityDate.getMonth() + Number(tenureMonths))
        const maturityAmount = calculateMaturityAmount(principal, interestRate, Number(tenureMonths))

        // Debit the principal from account
        await ledgerModel.create({
            account: account._id,
            amount: principal,
            type: "DEBIT",
            transaction: null
        })

        const fd = await fixedDepositModel.create({
            user: req.user._id,
            account: account._id,
            principal,
            interestRate,
            tenureMonths: Number(tenureMonths),
            maturityDate,
            maturityAmount,
            status: "ACTIVE"
        })

        // Notification
        notificationModel.create({
            user: req.user._id,
            title: "Fixed Deposit Opened",
            message: `FD of ₹${principal.toLocaleString("en-IN")} opened for ${tenureMonths} months at ${interestRate}% p.a.`,
            type: "SUCCESS",
            link: "/fixed-deposits"
        }).catch(() => {})

        return res.status(201).json({ fixedDeposit: fd })
    } catch (err) {
        next(err)
    }
}

/**
 * DELETE /api/fixed-deposits/:id
 * Close (prematurely) a Fixed Deposit — penalty applied (90% of interest)
 */
async function closeFixedDepositController(req, res, next) {
    try {
        const { id } = req.params

        const fd = await fixedDepositModel.findOne({ _id: id, user: req.user._id })

        if (!fd) {
            return res.status(404).json({ message: "Fixed deposit not found" })
        }

        if (fd.status !== "ACTIVE") {
            return res.status(400).json({ message: "Fixed deposit is not active" })
        }

        // Calculate premature withdrawal amount (principal + 90% of accrued interest)
        const monthsElapsed = Math.floor((Date.now() - fd.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))
        const accruedInterest = calculateMaturityAmount(fd.principal, fd.interestRate, Math.max(1, monthsElapsed)) - fd.principal
        const penaltyAmount = accruedInterest * 0.10  // 10% penalty
        const payoutAmount = Math.round((fd.principal + accruedInterest - penaltyAmount) * 100) / 100

        // Credit back to account
        await ledgerModel.create({
            account: fd.account,
            amount: payoutAmount,
            type: "CREDIT",
            transaction: null
        })

        fd.status = "CLOSED"
        fd.closedAt = new Date()
        await fd.save()

        return res.status(200).json({
            message: "Fixed deposit closed successfully",
            payoutAmount,
            penalty: Math.round(penaltyAmount * 100) / 100
        })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    getFixedDepositsController,
    createFixedDepositController,
    closeFixedDepositController
}
