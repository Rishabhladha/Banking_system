const loanModel = require("../models/loan.model")
const accountModel = require("../models/account.model")
const notificationModel = require("../models/notification.model")

// Loan interest rates by type
const LOAN_RATES = {
    PERSONAL:  12.5,
    HOME:       8.5,
    AUTO:       9.75,
    EDUCATION: 10.0,
    BUSINESS:  14.0
}

// Calculate EMI using standard formula
function calculateEMI(principal, annualRate, tenureMonths) {
    const r = annualRate / 100 / 12  // monthly rate
    if (r === 0) return principal / tenureMonths
    const emi = principal * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1)
    return Math.round(emi * 100) / 100
}

/**
 * GET /api/loans
 * Get all loans for the current user
 */
async function getLoansController(req, res, next) {
    try {
        const loans = await loanModel.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate("account", "accountNumber accountType")
            .populate("reviewedBy", "name email")

        return res.status(200).json({ loans })
    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/loans
 * Apply for a new loan
 */
async function applyLoanController(req, res, next) {
    try {
        const { accountId, loanType, amount, tenureMonths, purpose } = req.body

        if (!accountId || !loanType || !amount || !tenureMonths) {
            return res.status(400).json({ message: "accountId, loanType, amount, and tenureMonths are required" })
        }

        const account = await accountModel.findOne({ _id: accountId, user: req.user._id })

        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        // Check for pending loan
        const pendingLoan = await loanModel.findOne({ user: req.user._id, status: "PENDING" })
        if (pendingLoan) {
            return res.status(422).json({ message: "You already have a pending loan application" })
        }

        const loan = await loanModel.create({
            user: req.user._id,
            account: accountId,
            loanType,
            amount,
            tenureMonths: Number(tenureMonths),
            purpose: purpose || null,
            status: "PENDING"
        })

        // Notification
        notificationModel.create({
            user: req.user._id,
            title: "Loan Application Submitted",
            message: `Your ${loanType} loan application for ₹${Number(amount).toLocaleString("en-IN")} is under review`,
            type: "INFO",
            link: "/loans"
        }).catch(() => {})

        return res.status(201).json({ loan })
    } catch (err) {
        next(err)
    }
}

/**
 * GET /api/loans/:id
 * Get a specific loan by ID
 */
async function getLoanByIdController(req, res, next) {
    try {
        const loan = await loanModel.findOne({ _id: req.params.id, user: req.user._id })
            .populate("account", "accountNumber accountType")
            .populate("reviewedBy", "name email")

        if (!loan) {
            return res.status(404).json({ message: "Loan not found" })
        }

        return res.status(200).json({ loan })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    getLoansController,
    applyLoanController,
    getLoanByIdController,
    LOAN_RATES,
    calculateEMI
}
