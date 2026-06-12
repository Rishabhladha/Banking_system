const express = require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const { getLoansController, applyLoanController, getLoanByIdController } = require("../controllers/loan.controller")

const router = express.Router()

router.get("/", authMiddleware, getLoansController)
router.post("/", authMiddleware, applyLoanController)
router.get("/:id", authMiddleware, getLoanByIdController)

module.exports = router
