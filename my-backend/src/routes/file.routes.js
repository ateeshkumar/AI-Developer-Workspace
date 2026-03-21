const express = require("express");
const multer = require("multer");

const {
  createFile,
  updateFile,
  deleteFile,
  getFileTree,
  getFileHistory,
  uploadFiles,
} = require("../controllers/file.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRepoRole } = require("../middleware/repo-role.middleware");

const router = express.Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 20,
  },
});

router.get("/repos/:repoId/files/tree", requireAuth, requireRepoRole("VIEWER"), getFileTree);
router.post(
  "/file/upload",
  requireAuth,
  upload.any(),
  requireRepoRole("EDITOR"),
  uploadFiles
);
router.get(
  "/repos/:repoId/files/:fileId/history",
  requireAuth,
  requireRepoRole("VIEWER"),
  getFileHistory
);
router.post("/repos/:repoId/files", requireAuth, requireRepoRole("EDITOR"), createFile);
router.patch(
  "/repos/:repoId/files/:fileId",
  requireAuth,
  requireRepoRole("EDITOR"),
  updateFile
);
router.delete(
  "/repos/:repoId/files/:fileId",
  requireAuth,
  requireRepoRole("EDITOR"),
  deleteFile
);

module.exports = router;
