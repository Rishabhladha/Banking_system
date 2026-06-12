const beneficiaryModel = require("../models/beneficiary.model")
const accountModel = require("../models/account.model")

/**
 * GET /api/beneficiaries
 * Get all beneficiaries for the current user
 */
async function getBeneficiariesController(req, res, next) {
    try {
        const beneficiaries = await beneficiaryModel.find({ user: req.user._id }).sort({ createdAt: -1 })
        return res.status(200).json({ beneficiaries })
    } catch (err) {
        next(err)
    }
}

/**
 * POST /api/beneficiaries
 * Add a new beneficiary
 */
async function addBeneficiaryController(req, res, next) {
    try {
        const { accountNumber, nickname, bankName, ifscCode } = req.body

        if (!accountNumber || !nickname) {
            return res.status(400).json({ message: "accountNumber and nickname are required" })
        }

        // Check if already added
        const existing = await beneficiaryModel.findOne({ user: req.user._id, accountNumber })
        if (existing) {
            return res.status(422).json({ message: "Beneficiary with this account number already exists" })
        }

        // Try to resolve to an internal account
        const account = await accountModel.findOne({ accountNumber })

        const beneficiary = await beneficiaryModel.create({
            user: req.user._id,
            accountNumber,
            accountId: account?._id || null,
            nickname,
            bankName: bankName || "NexaBank",
            ifscCode: ifscCode || "NEXA0000001"
        })

        return res.status(201).json({ beneficiary })
    } catch (err) {
        next(err)
    }
}

/**
 * DELETE /api/beneficiaries/:id
 * Remove a beneficiary
 */
async function deleteBeneficiaryController(req, res, next) {
    try {
        const { id } = req.params
        const result = await beneficiaryModel.findOneAndDelete({ _id: id, user: req.user._id })

        if (!result) {
            return res.status(404).json({ message: "Beneficiary not found" })
        }

        return res.status(200).json({ message: "Beneficiary removed successfully" })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    getBeneficiariesController,
    addBeneficiaryController,
    deleteBeneficiaryController
}
