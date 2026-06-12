const express = require("express")
const { adminMiddleware } = require("../middleware/auth.middleware")
const {
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
} = require("../controllers/admin.controller")

const router = express.Router()

// Apply admin middleware to ALL routes in this router
router.use(adminMiddleware)

// Dashboard
router.get("/dashboard", getDashboardStatsController)

// Customer management
router.get("/customers", getCustomersController)
router.get("/customers/:id", getCustomerDetailController)
router.post("/customers/:id/kyc", updateKycController)
router.post("/customers/:id/lock", toggleUserLockController)

// Account management
router.post("/accounts", adminCreateAccountController)
router.post("/accounts/:id/status", changeAccountStatusController)
router.post("/deposit", adminDepositController)

// Deposit Request management
router.get("/deposit-requests", getAdminDepositRequestsController)
router.post("/deposit-requests/:id/approve", approveDepositRequestController)
router.post("/deposit-requests/:id/reject", rejectDepositRequestController)

// Loan management
router.get("/loans", getAllLoansController)
router.put("/loans/:id", updateLoanController)

// Transaction management
router.get("/transactions", getAllTransactionsController)
router.post("/transactions/:id/reverse", reverseTransactionController)

// Audit log
router.get("/audit-log", getAuditLogController)

module.exports = router
