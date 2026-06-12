const express = require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const {
    createDepositRequestController,
    getUserDepositRequestsController
} = require("../controllers/depositRequest.controller")

const router = express.Router()

router.use(authMiddleware)

router.post("/", createDepositRequestController)
router.get("/", getUserDepositRequestsController)

module.exports = router
