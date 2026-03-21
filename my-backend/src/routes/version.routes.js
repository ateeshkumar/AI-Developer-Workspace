const express = require("express");

const {
  createCommit,
  getCommitHistory,
} = require("../controllers/version.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRepoRole } = require("../middleware/repo-role.middleware");

const router = express.Router({ mergeParams: true });

router.get("/repos/:repoId/commits", requireAuth, requireRepoRole("VIEWER"), getCommitHistory);
router.post("/repos/:repoId/commits", requireAuth, requireRepoRole("EDITOR"), createCommit);

module.exports = router;
