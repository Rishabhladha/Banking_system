const express = require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const { getScheduledTransfersController, createScheduledTransferController, cancelScheduledTransferController } = require("../controllers/scheduledTransfer.controller")

const router = express.Router()

router.get("/", authMiddleware, getScheduledTransfersController)
router.post("/", authMiddleware, createScheduledTransferController)
router.delete("/:id", authMiddleware, cancelScheduledTransferController)

module.exports = router
