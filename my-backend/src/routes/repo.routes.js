const express = require("express");

const {
  createRepo,
  listRepos,
  searchRepoFiles,
  getRepoActivity,
  getRepoWorkspaceSummary,
} = require("../controllers/repo.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireWorkspaceRole } = require("../middleware/workspace-role.middleware");
const { requireRepoRole } = require("../middleware/repo-role.middleware");

const router = express.Router({ mergeParams: true });

router.get(
  "/workspaces/:workspaceId/repos",
  requireAuth,
  requireWorkspaceRole("VIEWER"),
  listRepos
);

router.post(
  "/workspaces/:workspaceId/repos",
  requireAuth,
  requireWorkspaceRole("EDITOR"),
  createRepo
);

router.get("/repos/:repoId/search", requireAuth, requireRepoRole("VIEWER"), searchRepoFiles);
router.get("/repos/:repoId/activity", requireAuth, requireRepoRole("VIEWER"), getRepoActivity);
router.get(
  "/repos/:repoId/summary",
  requireAuth,
  requireRepoRole("VIEWER"),
  getRepoWorkspaceSummary
);

module.exports = router;
