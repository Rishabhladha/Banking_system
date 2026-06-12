const express = require("express");
const { getMyCardsController, issueCardController, toggleCardFreezeController } = require("../controllers/card.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getMyCardsController);
router.post("/issue", issueCardController);
router.post("/:id/toggle-freeze", toggleCardFreezeController);

module.exports = router;
