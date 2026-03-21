const express = require("express");

const { queryAssistant } = require("../controllers/ai.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/query", requireAuth, queryAssistant);

module.exports = router;
