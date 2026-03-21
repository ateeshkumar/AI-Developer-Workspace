const express = require("express");

const { createRepo, listRepos } = require("../controllers/repo.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireWorkspaceRole } = require("../middleware/workspace-role.middleware");

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

module.exports = router;
