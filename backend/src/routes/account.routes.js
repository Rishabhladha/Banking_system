const express = require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")


const router = express.Router()


/**
 * POST /api/accounts/
 * Create a new account
 */
router.post("/", authMiddleware, accountController.createAccountController)


/**
 * GET /api/accounts/
 * Get all accounts of the logged-in user
 */
router.get("/", authMiddleware, accountController.getUserAccountsController)


/**
 * GET /api/accounts/balance/:accountId
 * Get balance for a specific account
 */
router.get("/balance/:accountId", authMiddleware, accountController.getAccountBalanceController)


/**
 * NOTE: POST /api/accounts/deposit — REMOVED
 * Direct user deposits are no longer allowed.
 * Users must submit a deposit request via POST /api/deposit-requests
 * which must be approved by an admin before funds are credited.
 */


/**
 * POST /api/accounts/withdraw
 * Withdraw funds from the user's own account (ATM-style debit)
 */
router.post("/withdraw", authMiddleware, accountController.withdrawController)

/**
 * GET /api/accounts/statement/:accountId
 * Get filtered ledger statement for an account
 */
router.get("/statement/:accountId", authMiddleware, accountController.getStatementController)

/**
 * PATCH /api/accounts/:accountId/nickname
 * Update account nickname
 */
router.patch("/:accountId/nickname", authMiddleware, accountController.updateAccountNicknameController)



module.exports = router