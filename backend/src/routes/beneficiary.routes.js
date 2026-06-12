const express = require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const { getBeneficiariesController, addBeneficiaryController, deleteBeneficiaryController } = require("../controllers/beneficiary.controller")

const router = express.Router()

router.get("/", authMiddleware, getBeneficiariesController)
router.post("/", authMiddleware, addBeneficiaryController)
router.delete("/:id", authMiddleware, deleteBeneficiaryController)

module.exports = router
