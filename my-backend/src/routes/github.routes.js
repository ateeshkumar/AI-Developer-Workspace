const express = require("express");

const {
  connectGithub,
  getGithubConnection,
  disconnectGithub,
  listGithubRepos,
  previewGithubImport,
  importGithubRepo,
  resyncGithubRepo,
  pushGithubRepo,
} = require("../controllers/github.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireWorkspaceRole } = require("../middleware/workspace-role.middleware");
const { requireRepoRole } = require("../middleware/repo-role.middleware");

const router = express.Router({ mergeParams: true });

router.post("/github/connection", requireAuth, connectGithub);
router.get("/github/connection", requireAuth, getGithubConnection);
router.delete("/github/connection", requireAuth, disconnectGithub);

router.get("/github/repos", requireAuth, listGithubRepos);
router.get("/github/repos/:owner/:repo/preview", requireAuth, previewGithubImport);

router.post(
  "/workspaces/:workspaceId/repos/import",
  requireAuth,
  requireWorkspaceRole("EDITOR"),
  importGithubRepo
);

router.post(
  "/repos/:repoId/github/pull",
  requireAuth,
  requireRepoRole("EDITOR"),
  resyncGithubRepo
);

router.post(
  "/repos/:repoId/github/push",
  requireAuth,
  requireRepoRole("EDITOR"),
  pushGithubRepo
);

module.exports = router;
