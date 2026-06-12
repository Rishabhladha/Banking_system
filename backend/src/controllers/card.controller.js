const cardModel = require("../models/card.model");
const accountModel = require("../models/account.model");
const notificationModel = require("../models/notification.model");

// GET /api/cards
async function getMyCardsController(req, res, next) {
    try {
        const cards = await cardModel.find({ user: req.user._id }).populate("account", "accountNumber accountType");
        return res.status(200).json({ cards });
    } catch (err) {
        next(err);
    }
}

// POST /api/cards
// Issue a new virtual card linked to an account
async function issueCardController(req, res, next) {
    try {
        const { accountId } = req.body;

        if (!accountId) {
            return res.status(400).json({ message: "accountId is required" });
        }

        const account = await accountModel.findOne({ _id: accountId, user: req.user._id });
        if (!account) {
            return res.status(404).json({ message: "Account not found or does not belong to you" });
        }
        if (account.status !== "ACTIVE") {
            return res.status(400).json({ message: "Cannot issue card for inactive account" });
        }

        // Check if a card already exists for this account
        const existingCard = await cardModel.findOne({ account: accountId, status: { $in: ["ACTIVE", "FROZEN"] } });
        if (existingCard) {
            return res.status(400).json({ message: "An active card already exists for this account" });
        }

        // Generate expiry (5 years from now)
        const now = new Date();
        const expiryMonth = String(now.getMonth() + 1).padStart(2, '0');
        const expiryYear = String(now.getFullYear() + 5).slice(-2);
        const cvv = String(Math.floor(100 + Math.random() * 900));

        const card = await cardModel.create({
            user: req.user._id,
            account: accountId,
            cardholderName: req.user.name,
            expiryMonth,
            expiryYear,
            cvv
        });

        // Notify user
        notificationModel.create({
            user: req.user._id,
            title: "Virtual Card Issued! 💳",
            message: `A new virtual debit card ending in ${card.cardNumber.slice(-4)} has been issued for your account ending in ${account.accountNumber.slice(-4)}.`,
            type: "SUCCESS",
            link: "/cards"
        }).catch(() => {});

        return res.status(201).json({ message: "Card issued successfully", card });

    } catch (err) {
        next(err);
    }
}

// POST /api/cards/:id/toggle-freeze
async function toggleCardFreezeController(req, res, next) {
    try {
        const { id } = req.params;
        const card = await cardModel.findOne({ _id: id, user: req.user._id });

        if (!card) return res.status(404).json({ message: "Card not found" });
        if (card.status === "CANCELLED") return res.status(400).json({ message: "Cannot modify a cancelled card" });

        const newStatus = card.status === "ACTIVE" ? "FROZEN" : "ACTIVE";
        card.status = newStatus;
        await card.save();

        return res.status(200).json({ message: `Card ${newStatus.toLowerCase()} successfully`, card });

    } catch (err) {
        next(err);
    }
}

module.exports = {
    getMyCardsController,
    issueCardController,
    toggleCardFreezeController
};
