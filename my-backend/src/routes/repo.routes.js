const express = require("express");

const {
  createRepo,
  listRepos,
  searchRepoFiles,
  getRepoActivity,
  getRepoWorkspaceSummary,
} = require("../controllers/repo.controller");
const { indexRepo } = require("../controllers/ai.controller");
const {
  createTerminalSession,
  destroyTerminalSession,
  getTerminalSessionPorts,
} = require("../controllers/terminal.controller");
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
router.post("/repos/:repoId/index", requireAuth, requireRepoRole("VIEWER"), indexRepo);

router.post(
  "/repos/:repoId/terminal/session",
  requireAuth,
  requireRepoRole("EDITOR"),
  createTerminalSession
);
router.get(
  "/repos/:repoId/terminal/session/:sessionId/ports",
  requireAuth,
  requireRepoRole("EDITOR"),
  getTerminalSessionPorts
);
router.delete(
  "/repos/:repoId/terminal/session/:sessionId",
  requireAuth,
  requireRepoRole("EDITOR"),
  destroyTerminalSession
);

module.exports = router;
