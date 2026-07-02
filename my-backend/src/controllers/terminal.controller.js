const repoService = require("../services/repo.service");
const terminalService = require("../services/terminal.service");

const createTerminalSession = async (req, res, next) => {
  try {
    const { repo, files } = await repoService.getRepoFilesForIndexing(req.params.repoId);
    const result = await terminalService.createSession({
      repoId: repo.id,
      repoName: repo.name,
      userId: req.user.id,
      files,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getTerminalSessionPorts = async (req, res, next) => {
  try {
    const result = await terminalService.getSessionPorts(req.params.sessionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const destroyTerminalSession = async (req, res, next) => {
  try {
    const result = await terminalService.destroySession(req.params.sessionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTerminalSession,
  getTerminalSessionPorts,
  destroyTerminalSession,
};
