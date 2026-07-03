const express = require("express");

const {
  queryAssistant,
  getProviderStatus,
  connectProvider,
  disconnectProvider,
} = require("../controllers/ai.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/query", requireAuth, queryAssistant);
router.get("/providers", requireAuth, getProviderStatus);
router.post("/providers/:provider/connect", requireAuth, connectProvider);
router.delete("/providers/:provider", requireAuth, disconnectProvider);

module.exports = router;
