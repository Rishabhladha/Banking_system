const accountModel = require("../models/account.model");


async function createAccountController(req, res, next) {
    try {
        const user = req.user;

        const account = await accountModel.create({
            user: user._id
        })

        return res.status(201).json({ account })

    } catch (err) {
        next(err)
    }
}

async function getUserAccountsController(req, res, next) {
    try {
        const accounts = await accountModel.find({ user: req.user._id });

        return res.status(200).json({ accounts })

    } catch (err) {
        next(err)
    }
}

async function getAccountBalanceController(req, res, next) {
    try {
        const { accountId } = req.params;

        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        })

        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        const balance = await account.getBalance();

        return res.status(200).json({
            accountId: account._id,
            balance: balance
        })

    } catch (err) {
        next(err)
    }
}


module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
}