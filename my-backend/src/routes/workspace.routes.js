const express = require("express");

const {
  createWorkspace,
  inviteUser,
  listMyWorkspaces,
} = require("../controllers/workspace.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireWorkspaceRole } = require("../middleware/workspace-role.middleware");

const router = express.Router();

router.get("/", requireAuth, listMyWorkspaces);
router.post("/", requireAuth, createWorkspace);
router.post(
  "/:workspaceId/invite",
  requireAuth,
  requireWorkspaceRole("ADMIN"),
  inviteUser
);

module.exports = router;
