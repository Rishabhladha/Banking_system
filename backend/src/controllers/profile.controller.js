const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")

/**
 * GET /api/profile
 * Get current user full profile
 */
async function getProfileController(req, res, next) {
    try {
        const user = await userModel.findById(req.user._id)

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                phone: user.phone,
                address: user.address,
                dateOfBirth: user.dateOfBirth,
                kycStatus: user.kycStatus,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            }
        })
    } catch (err) {
        next(err)
    }
}

/**
 * PUT /api/profile
 * Update user profile (name, phone, address, dateOfBirth)
 */
async function updateProfileController(req, res, next) {
    try {
        const { name, phone, address, dateOfBirth } = req.body

        const updateData = {}
        if (name) updateData.name = name.trim()
        if (phone) updateData.phone = phone.trim()
        if (address) updateData.address = address
        if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth)

        const user = await userModel.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        )

        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                address: user.address,
                dateOfBirth: user.dateOfBirth,
                kycStatus: user.kycStatus
            }
        })
    } catch (err) {
        next(err)
    }
}

/**
 * PUT /api/profile/change-password
 * Change user password (requires current password)
 */
async function changePasswordController(req, res, next) {
    try {
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "currentPassword and newPassword are required" })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" })
        }

        const user = await userModel.findById(req.user._id).select("+password")

        const isValid = await user.comparePassword(currentPassword)

        if (!isValid) {
            return res.status(401).json({ message: "Current password is incorrect" })
        }

        user.password = newPassword
        await user.save()  // pre-save hook will hash it

        return res.status(200).json({ message: "Password changed successfully" })

    } catch (err) {
        next(err)
    }
}

module.exports = {
    getProfileController,
    updateProfileController,
    changePasswordController
}
