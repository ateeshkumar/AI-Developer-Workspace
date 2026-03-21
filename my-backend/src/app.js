const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const aiRoutes = require("./routes/ai.routes");
const userRoutes = require("./routes/user.routes");
const workspaceRoutes = require("./routes/workspace.routes");
const repoRoutes = require("./routes/repo.routes");
const fileRoutes = require("./routes/file.routes");
const versionRoutes = require("./routes/version.routes");
const documentRoutes = require("./routes/document.routes");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api", repoRoutes);
app.use("/api", fileRoutes);
app.use("/api", versionRoutes);
app.use("/api", documentRoutes);

app.use(errorHandler);

module.exports = app;
