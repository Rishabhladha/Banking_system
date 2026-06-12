const userModel = require("../models/user.model")
const accountModel = require("../models/account.model")
const ledgerModel = require("../models/ledger.model")
const transactionModel = require("../models/transaction.model")
const loanModel = require("../models/loan.model")
const auditLogModel = require("../models/auditLog.model")
const notificationModel = require("../models/notification.model")
const depositRequestModel = require("../models/depositRequest.model")
const mongoose = require("mongoose")
const { LOAN_RATES, calculateEMI } = require("./loan.controller")

/**
 * Helper — create audit log entry
 */
async function createAuditLog(adminId, action, { targetUser, targetAccount, targetTransaction, details, metadata, ip } = {}) {
    return auditLogModel.create({
        admin: adminId,
        action,
        targetUser: targetUser || null,
        targetAccount: targetAccount || null,
        targetTransaction: targetTransaction || null,
        details: details || null,
        metadata: metadata || null,
        ip: ip || null
    }).catch(err => console.error("[AuditLog] Failed to create entry:", err.message))
}

/* =============================================
   DASHBOARD
   ============================================= */

/**
 * GET /api/admin/dashboard
 * System overview statistics
 */
async function getDashboardStatsController(req, res, next) {
    try {
        const [
            totalUsers,
            totalAccounts,
            activeAccounts,
            frozenAccounts,
            totalTransactions,
            pendingLoans,
            totalLoans,
            pendingDepositRequests
        ] = await Promise.all([
            userModel.countDocuments({ role: "customer" }),
            accountModel.countDocuments(),
            accountModel.countDocuments({ status: "ACTIVE" }),
            accountModel.countDocuments({ status: "FROZEN" }),
            transactionModel.countDocuments({ status: "COMPLETED" }),
            loanModel.countDocuments({ status: "PENDING" }),
            loanModel.countDocuments(),
            depositRequestModel.countDocuments({ status: "PENDING" })
        ])

        // Calculate AUM (total credit across all accounts)
        const aumData = await ledgerModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalCredit: { $sum: { $cond: [ { $eq: [ "$type", "CREDIT" ] }, "$amount", 0 ] } },
                    totalDebit:  { $sum: { $cond: [ { $eq: [ "$type", "DEBIT" ] }, "$amount", 0 ] } }
                }
            }
        ])

        const aum = aumData.length > 0 ? aumData[0].totalCredit - aumData[0].totalDebit : 0

        // Daily transaction volume (last 24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const dailyVolume = await transactionModel.aggregate([
            { $match: { createdAt: { $gte: yesterday }, status: "COMPLETED" } },
            { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: "$amount" } } }
        ])

        // Monthly new users for chart (last 6 months)
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        const monthlyUsers = await userModel.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, role: "customer" } },
            {
                $group: {
                    _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ])

        // Monthly transaction volume (last 6 months)
        const monthlyVolume = await transactionModel.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, status: "COMPLETED" } },
            {
                $group: {
                    _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                    count: { $sum: 1 },
                    volume: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ])

        return res.status(200).json({
            stats: {
                totalUsers,
                totalAccounts,
                activeAccounts,
                frozenAccounts,
                totalTransactions,
                pendingLoans,
                totalLoans,
                pendingDepositRequests,
                aum: Math.max(0, aum),
                dailyTransactionCount: dailyVolume[0]?.count || 0,
                dailyTransactionVolume: dailyVolume[0]?.volume || 0
            },
            monthlyUsers,
            monthlyVolume
        })
    } catch (err) {
        next(err)
    }
}

/* =============================================
   CUSTOMER MANAGEMENT
   ============================================= */

/**
 * GET /api/admin/customers
 * List all customers with pagination and search
 */
async function getCustomersController(req, res, next) {
    try {
        const { search, page = 1, limit = 20, kycStatus } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const filter = { role: "customer" }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        }
        if (kycStatus) filter.kycStatus = kycStatus

        const [customers, total] = await Promise.all([
            userModel.find(filter)
                .select("-password -systemUser")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            userModel.countDocuments(filter)
        ])

        return res.status(200).json({
            customers,
            pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
        })
    } catch (err) {
        next(err)
    }
}

/**
 * GET /api/admin/customers/:id
 * Get full customer details including accounts
 */
async function getCustomerDetailController(req, res, next) {
    try {
        const { id } = req.params
        const user = await userModel.findById(id).select("-password -systemUser")

        if (!user) {
            return res.status(404).json({ message: "Customer not found" })
        }

        const accounts = await accountModel.find({ user: id })
        const accountsWithBalance = await Promise.all(
            accounts.map(async (acc) => {
                const balance = await acc.getBalance()
                return { ...acc.toObject(), balance }
            })
        )

        const recentTransactions = await transactionModel.find({
            $or: accounts.map(a => ({ fromAccount: a._id })).concat(accounts.map(a => ({ toAccount: a._id })))
        }).sort({ createdAt: -1 }).limit(10)

        const loans = await loanModel.find({ user: id }).sort({ createdAt: -1 }).limit(5)

        const depositRequests = await depositRequestModel.find({ user: id })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("account", "accountNumber")

        return res.status(200).json({
            customer: user,
            accounts: accountsWithBalance,
            recentTransactions,
            loans,
            depositRequests
        })
    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/admin/customers/:id/kyc
 * Verify or reject KYC
 */
async function updateKycController(req, res, next) {
    try {
        const { id } = req.params
        const { status, note } = req.body

        if (!["VERIFIED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Status must be VERIFIED or REJECTED" })
        }

        const user = await userModel.findByIdAndUpdate(id, { kycStatus: status }, { new: true })

        if (!user) {
            return res.status(404).json({ message: "Customer not found" })
        }

        await createAuditLog(req.user._id, status === "VERIFIED" ? "KYC_VERIFY" : "KYC_REJECT", {
            targetUser: id, details: note || `KYC ${status}`, ip: req.ip
        })

        notificationModel.create({
            user: id,
            title: `KYC ${status === "VERIFIED" ? "Verified" : "Rejected"}`,
            message: status === "VERIFIED"
                ? "Your KYC verification is complete. You now have full access."
                : `Your KYC was rejected. Reason: ${note || "Please contact support."}`,
            type: status === "VERIFIED" ? "SUCCESS" : "WARNING",
            link: "/profile"
        }).catch(() => {})

        return res.status(200).json({ message: `KYC ${status.toLowerCase()} successfully`, user })
    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/admin/customers/:id/lock
 * Lock or unlock a customer account
 */
async function toggleUserLockController(req, res, next) {
    try {
        const { id } = req.params
        const { lock, reason } = req.body  // lock: true = lock, false = unlock

        const user = await userModel.findById(id)
        if (!user) return res.status(404).json({ message: "Customer not found" })
        if (user.role !== "customer") return res.status(400).json({ message: "Can only lock customer accounts" })

        const update = lock
            ? { isLocked: true, lockUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }  // 1 year (effectively permanent until admin unlocks)
            : { isLocked: false, lockUntil: null, failedLoginAttempts: 0 }

        await userModel.findByIdAndUpdate(id, update)

        await createAuditLog(req.user._id, lock ? "USER_LOCK" : "USER_UNLOCK", {
            targetUser: id,
            details: reason || (lock ? "Account locked by admin" : "Account unlocked by admin"),
            ip: req.ip
        })

        notificationModel.create({
            user: id,
            title: lock ? "Account Locked" : "Account Unlocked",
            message: lock
                ? `Your account has been locked. Reason: ${reason || "Contact support for details."}`
                : "Your account has been unlocked. You can now log in.",
            type: lock ? "WARNING" : "SUCCESS",
            link: "/"
        }).catch(() => {})

        return res.status(200).json({ message: `User account ${lock ? "locked" : "unlocked"} successfully` })
    } catch (err) {
        next(err)
    }
}

/* =============================================
   ACCOUNT MANAGEMENT
   ============================================= */

/**
 * POST /api/admin/accounts
 * Create an account for any customer (admin)
 */
async function adminCreateAccountController(req, res, next) {
    try {
        const { userId, accountType, initialDeposit } = req.body

        if (!userId) {
            return res.status(400).json({ message: "userId is required" })
        }

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const account = await accountModel.create({
            user: userId,
            accountType: accountType || "SAVINGS"
        })

        if (initialDeposit && initialDeposit > 0) {
            await ledgerModel.create({
                account: account._id,
                amount: initialDeposit,
                type: "CREDIT",
                entryType: "ADMIN_DEPOSIT",
                description: `Initial deposit on account creation by admin`,
                performedBy: req.user._id,
                transaction: null
            })
        }

        await createAuditLog(req.user._id, "ACCOUNT_CREATE", {
            targetUser: userId,
            targetAccount: account._id,
            details: `Created ${accountType || "SAVINGS"} account with initial deposit ₹${initialDeposit || 0}`,
            metadata: { accountNumber: account.accountNumber },
            ip: req.ip
        })

        return res.status(201).json({ account })
    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/admin/accounts/:id/status
 * Change account status (FREEZE, UNFREEZE, CLOSE)
 */
async function changeAccountStatusController(req, res, next) {
    try {
        const { id } = req.params
        const { status, reason } = req.body

        if (!["ACTIVE", "FROZEN", "CLOSED"].includes(status)) {
            return res.status(400).json({ message: "Status must be ACTIVE, FROZEN, or CLOSED" })
        }

        if (status === "CLOSED") {
            // Check balance is zero before closing
            const account = await accountModel.findById(id)
            if (!account) return res.status(404).json({ message: "Account not found" })
            const balance = await account.getBalance()
            if (balance > 0) {
                return res.status(400).json({
                    message: `Cannot close account with balance of ₹${balance.toLocaleString("en-IN")}. Please transfer all funds first.`
                })
            }
        }

        const account = await accountModel.findByIdAndUpdate(id, { status }, { new: true })

        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        const actionMap = { ACTIVE: "ACCOUNT_UNFREEZE", FROZEN: "ACCOUNT_FREEZE", CLOSED: "ACCOUNT_CLOSE" }
        await createAuditLog(req.user._id, actionMap[status], {
            targetUser: account.user,
            targetAccount: id,
            details: reason || `Account status changed to ${status}`,
            ip: req.ip
        })

        notificationModel.create({
            user: account.user,
            title: `Account ${status === "ACTIVE" ? "Unfrozen" : status === "FROZEN" ? "Frozen" : "Closed"}`,
            message: reason || `Your account ending ${account.accountNumber?.slice(-4)} has been ${status.toLowerCase()}`,
            type: status === "ACTIVE" ? "SUCCESS" : "WARNING",
            link: "/dashboard"
        }).catch(() => {})

        return res.status(200).json({ message: `Account ${status.toLowerCase()} successfully`, account })
    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/admin/deposit
 * Admin direct deposit to any account (emergency / manual credit)
 */
async function adminDepositController(req, res, next) {
    try {
        const { accountId, amount, reason } = req.body

        if (!accountId || !amount) {
            return res.status(400).json({ message: "accountId and amount are required" })
        }

        if (amount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than zero" })
        }

        const account = await accountModel.findById(accountId)
        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        if (account.status !== "ACTIVE") {
            return res.status(400).json({ message: "Account must be ACTIVE to receive deposits" })
        }

        await ledgerModel.create({
            account: accountId,
            amount,
            type: "CREDIT",
            entryType: "ADMIN_DEPOSIT",
            description: reason || `Manual admin deposit by ${req.user.name}`,
            performedBy: req.user._id,
            transaction: null
        })

        const newBalance = await account.getBalance()

        await createAuditLog(req.user._id, "DEPOSIT", {
            targetUser: account.user,
            targetAccount: accountId,
            details: reason || `Admin deposit of ₹${amount.toLocaleString("en-IN")}`,
            metadata: { amount, newBalance },
            ip: req.ip
        })

        notificationModel.create({
            user: account.user,
            title: "Amount Credited",
            message: `₹${Number(amount).toLocaleString("en-IN")} has been credited to your account by the bank`,
            type: "SUCCESS",
            link: "/transactions"
        }).catch(() => {})

        return res.status(201).json({ message: "Deposit successful", newBalance })
    } catch (err) {
        next(err)
    }
}

/* =============================================
   DEPOSIT REQUEST MANAGEMENT
   ============================================= */

/**
 * GET /api/admin/deposit-requests
 * List all deposit requests with filters
 */
async function getAdminDepositRequestsController(req, res, next) {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const filter = {}
        if (status && [ "PENDING", "APPROVED", "REJECTED" ].includes(status)) {
            filter.status = status
        }

        const [ requests, total ] = await Promise.all([
            depositRequestModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("user", "name email")
                .populate("account", "accountNumber accountType")
                .populate("processedBy", "name email"),
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

/**
 * POST /api/admin/deposit-requests/:id/approve
 * Approve a deposit request — credits the account
 */
async function approveDepositRequestController(req, res, next) {
    try {
        const { id: requestId } = req.params
        const { adminNote } = req.body

        const session = await mongoose.startSession()

        try {
            session.startTransaction()

            const request = await depositRequestModel.findById(requestId).session(session)

            if (!request) {
                throw new Error("Deposit request not found")
            }

            if (request.status !== "PENDING") {
                throw new Error("Only PENDING requests can be approved")
            }

            // ATOMIC WRITE LOCK
            const lockedAccount = await accountModel.findOneAndUpdate(
                { _id: request.account, status: "ACTIVE" },
                { $set: { updatedAt: new Date() } },
                { session, new: true }
            )

            if (!lockedAccount) {
                throw new Error("Target account not found or is not ACTIVE")
            }

            // 1. Mark request as APPROVED
            request.status = "APPROVED"
            request.adminNote = adminNote || "Approved by admin"
            request.processedBy = req.user._id
            request.processedAt = new Date()
            await request.save({ session })

            // 2. Create CREDIT ledger entry
            await ledgerModel.create([{
                account: lockedAccount._id,
                amount: request.amount,
                type: "CREDIT",
                entryType: "DEPOSIT",
                description: `Deposit via Request #${request._id.toString().slice(-6)}`,
                performedBy: req.user._id,
                depositRequest: request._id
            }], { session })

            await session.commitTransaction()

            // After commit: send notification
            notificationModel.create({
                user: request.user,
                title: "Deposit Approved",
                message: `Your deposit request for ₹${request.amount.toLocaleString("en-IN")} has been approved.`,
                type: "SUCCESS",
                link: "/transactions"
            }).catch(() => {})

            // Log action
            await auditLogModel.create({
                admin: req.user._id,
                action: "DEPOSIT_REQUEST_APPROVED",
                targetUser: request.user,
                targetAccount: request.account,
                details: { requestId, amount: request.amount, note: request.adminNote }
            })

            return res.status(200).json({ message: "Deposit request approved", request })

        } catch (err) {
            await session.abortTransaction()
            return res.status(400).json({ message: err.message || "Failed to approve deposit request" })
        } finally {
            session.endSession()
        }

    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/admin/deposit-requests/:id/reject
 * Reject a deposit request
 */
async function rejectDepositRequestController(req, res, next) {
    try {
        const { id } = req.params
        const { adminNote } = req.body

        const request = await depositRequestModel.findById(id).populate("account")
        if (!request) return res.status(404).json({ message: "Deposit request not found" })
        if (request.status !== "PENDING") {
            return res.status(400).json({ message: "Only PENDING requests can be rejected" })
        }

        request.status = "REJECTED"
        request.processedBy = req.user._id
        request.processedAt = new Date()
        request.adminNote = adminNote || "Request rejected by admin"
        await request.save()

        await createAuditLog(req.user._id, "DEPOSIT_REQUEST_REJECT", {
            targetUser: request.user,
            targetAccount: request.account?._id,
            details: `Rejected deposit request of ₹${request.amount.toLocaleString("en-IN")}. Reason: ${adminNote || "Not specified"}`,
            ip: req.ip
        })

        notificationModel.create({
            user: request.user,
            title: "Deposit Request Rejected",
            message: `Your deposit request of ₹${request.amount.toLocaleString("en-IN")} was rejected. ${adminNote ? "Reason: " + adminNote : "Please contact support."}`,
            type: "WARNING",
            link: "/deposit-requests"
        }).catch(() => {})

        return res.status(200).json({ message: "Deposit request rejected" })
    } catch (err) {
        next(err)
    }
}

/* =============================================
   LOAN MANAGEMENT
   ============================================= */

/**
 * GET /api/admin/loans
 * List all loans with filters
 */
async function getAllLoansController(req, res, next) {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const filter = {}
        if (status) filter.status = status

        const [loans, total] = await Promise.all([
            loanModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("user", "name email")
                .populate("account", "accountNumber accountType"),
            loanModel.countDocuments(filter)
        ])

        return res.status(200).json({
            loans,
            pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
        })
    } catch (err) {
        next(err)
    }
}

/**
 * PUT /api/admin/loans/:id
 * Approve, reject, or disburse a loan
 */
async function updateLoanController(req, res, next) {
    try {
        const { id } = req.params
        const { action, adminNote } = req.body  // action: approve | reject | disburse

        if (!["approve", "reject", "disburse"].includes(action)) {
            return res.status(400).json({ message: "action must be approve, reject, or disburse" })
        }

        const loan = await loanModel.findById(id).populate("account")

        if (!loan) {
            return res.status(404).json({ message: "Loan not found" })
        }

        if (action === "approve") {
            if (loan.status !== "PENDING") {
                return res.status(400).json({ message: "Only PENDING loans can be approved" })
            }
            const rate = LOAN_RATES[loan.loanType] || 12.0
            const emi = calculateEMI(loan.amount, rate, loan.tenureMonths)

            loan.status = "APPROVED"
            loan.interestRate = rate
            loan.emi = emi
            loan.adminNote = adminNote || null
            loan.reviewedBy = req.user._id
            loan.reviewedAt = new Date()

            await createAuditLog(req.user._id, "LOAN_APPROVE", { targetUser: loan.user, details: `Approved loan ${loan.loanNumber}`, ip: req.ip })

            notificationModel.create({
                user: loan.user,
                title: "Loan Approved! 🎉",
                message: `Your ${loan.loanType} loan of ₹${loan.amount.toLocaleString("en-IN")} has been approved at ${rate}% p.a. EMI: ₹${emi.toLocaleString("en-IN")}`,
                type: "SUCCESS",
                link: "/loans"
            }).catch(() => {})

        } else if (action === "reject") {
            if (loan.status !== "PENDING") {
                return res.status(400).json({ message: "Only PENDING loans can be rejected" })
            }
            loan.status = "REJECTED"
            loan.adminNote = adminNote || "Application did not meet criteria"
            loan.reviewedBy = req.user._id
            loan.reviewedAt = new Date()

            await createAuditLog(req.user._id, "LOAN_REJECT", { targetUser: loan.user, details: `Rejected loan ${loan.loanNumber}`, ip: req.ip })

            notificationModel.create({
                user: loan.user,
                title: "Loan Application Update",
                message: `Your ${loan.loanType} loan application has been rejected. ${adminNote || "Please contact support for details."}`,
                type: "WARNING",
                link: "/loans"
            }).catch(() => {})

        } else if (action === "disburse") {
            if (loan.status !== "APPROVED") {
                return res.status(400).json({ message: "Only APPROVED loans can be disbursed" })
            }

            const account = await accountModel.findById(loan.account)
            if (!account || account.status !== "ACTIVE") {
                return res.status(400).json({ message: "Linked account is not active" })
            }

            // Credit the loan amount to the account
            await ledgerModel.create({
                account: loan.account,
                amount: loan.amount,
                type: "CREDIT",
                entryType: "LOAN_DISBURSAL",
                description: `Loan disbursement — ${loan.loanNumber}`,
                performedBy: req.user._id,
                transaction: null
            })

            loan.status = "DISBURSED"
            loan.disbursedAt = new Date()

            await createAuditLog(req.user._id, "LOAN_DISBURSE", { targetUser: loan.user, targetAccount: loan.account, details: `Disbursed ₹${loan.amount} for loan ${loan.loanNumber}`, ip: req.ip })

            notificationModel.create({
                user: loan.user,
                title: "Loan Disbursed! 💰",
                message: `₹${loan.amount.toLocaleString("en-IN")} has been credited to your account for loan ${loan.loanNumber}`,
                type: "SUCCESS",
                link: "/transactions"
            }).catch(() => {})
        }

        await loan.save()

        return res.status(200).json({ message: `Loan ${action}d successfully`, loan })
    } catch (err) {
        next(err)
    }
}

/* =============================================
   TRANSACTION MANAGEMENT
   ============================================= */

/**
 * GET /api/admin/transactions
 * Search and view all transactions
 */
async function getAllTransactionsController(req, res, next) {
    try {
        const { search, status, page = 1, limit = 20 } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const filter = {}
        if (status) filter.status = status
        if (search) {
            filter.$or = [
                { idempotencyKey: { $regex: search, $options: "i" } }
            ]
            if (mongoose.isValidObjectId(search)) {
                filter.$or.push({ _id: search }, { fromAccount: search }, { toAccount: search })
            }
        }

        const [transactions, total] = await Promise.all([
            transactionModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("fromAccount", "accountNumber user")
                .populate("toAccount", "accountNumber user"),
            transactionModel.countDocuments(filter)
        ])

        return res.status(200).json({
            transactions,
            pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
        })
    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/admin/transactions/:id/reverse
 * Reverse a completed transaction with compensating ledger entries
 */
async function reverseTransactionController(req, res, next) {
    try {
        const { id } = req.params
        const { reason } = req.body

        const transaction = await transactionModel.findById(id)

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" })
        }

        if (transaction.status !== "COMPLETED") {
            return res.status(400).json({ message: "Only COMPLETED transactions can be reversed" })
        }

        const session = await mongoose.startSession()
        try {
            session.startTransaction()

            // ATOMIC WRITE LOCKS
            const lockedFromAcc = await accountModel.findOneAndUpdate(
                { _id: transaction.fromAccount, status: "ACTIVE" },
                { $set: { updatedAt: new Date() } },
                { session }
            )
            const lockedToAcc = await accountModel.findOneAndUpdate(
                { _id: transaction.toAccount, status: "ACTIVE" },
                { $set: { updatedAt: new Date() } },
                { session }
            )

            if (!lockedFromAcc || !lockedToAcc) {
                throw new Error("One or both accounts are not ACTIVE or not found")
            }

            // Compensating entries: credit back from, debit to
            await ledgerModel.create([ {
                account: transaction.fromAccount,
                amount: transaction.amount,
                type: "CREDIT",
                entryType: "REVERSAL",
                description: `Reversal of transaction — ${reason || "Admin reversal"}`,
                performedBy: req.user._id,
                transaction: transaction._id
            } ], { session })

            await ledgerModel.create([ {
                account: transaction.toAccount,
                amount: transaction.amount,
                type: "DEBIT",
                entryType: "REVERSAL",
                description: `Reversal of transaction — ${reason || "Admin reversal"}`,
                performedBy: req.user._id,
                transaction: transaction._id
            } ], { session })

            await transactionModel.findByIdAndUpdate(id, { status: "REVERSED" }, { session })

            await session.commitTransaction()
        } catch (err) {
            await session.abortTransaction()
            return res.status(400).json({ message: err.message || "Failed to reverse transaction" })
        } finally {
            session.endSession()
        }

        await createAuditLog(req.user._id, "TRANSACTION_REVERSE", {
            targetTransaction: id,
            details: reason || `Transaction reversed by admin`,
            ip: req.ip
        })

        return res.status(200).json({ message: "Transaction reversed successfully" })
    } catch (err) {
        next(err)
    }
}

/* =============================================
   AUDIT LOG
   ============================================= */

/**
 * GET /api/admin/audit-log
 * View admin audit log
 */
async function getAuditLogController(req, res, next) {
    try {
        const { page = 1, limit = 30, action } = req.query
        const skip = (Number(page) - 1) * Number(limit)

        const filter = {}
        if (action) filter.action = action

        const [logs, total] = await Promise.all([
            auditLogModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("admin", "name email")
                .populate("targetUser", "name email")
                .populate("targetAccount", "accountNumber"),
            auditLogModel.countDocuments(filter)
        ])

        return res.status(200).json({
            logs,
            pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
        })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    getDashboardStatsController,
    getCustomersController,
    getCustomerDetailController,
    updateKycController,
    toggleUserLockController,
    adminCreateAccountController,
    changeAccountStatusController,
    adminDepositController,
    getAdminDepositRequestsController,
    approveDepositRequestController,
    rejectDepositRequestController,
    getAllLoansController,
    updateLoanController,
    getAllTransactionsController,
    reverseTransactionController,
    getAuditLogController
}
