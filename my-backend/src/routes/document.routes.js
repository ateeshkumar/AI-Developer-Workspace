const express = require("express");

const {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  listWorkspaceDocuments,
} = require("../controllers/document.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireWorkspaceRole } = require("../middleware/workspace-role.middleware");

const router = express.Router();

router.get(
  "/document/workspace/:workspaceId",
  requireAuth,
  requireWorkspaceRole("VIEWER"),
  listWorkspaceDocuments
);
router.post("/document", requireAuth, createDocument);
router.get("/document/:id", requireAuth, getDocument);
router.put("/document/:id", requireAuth, updateDocument);
router.delete("/document/:id", requireAuth, deleteDocument);

module.exports = router;
