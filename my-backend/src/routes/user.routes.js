const express = require("express");

const { getProfile } = require("../controllers/user.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", requireAuth, getProfile);

module.exports = router;
