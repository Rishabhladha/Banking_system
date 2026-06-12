const express = require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const { getFixedDepositsController, createFixedDepositController, closeFixedDepositController } = require("../controllers/fixedDeposit.controller")

const router = express.Router()

router.get("/", authMiddleware, getFixedDepositsController)
router.post("/", authMiddleware, createFixedDepositController)
router.delete("/:id", authMiddleware, closeFixedDepositController)

module.exports = router
