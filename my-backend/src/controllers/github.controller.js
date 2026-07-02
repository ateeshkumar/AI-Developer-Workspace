const githubConnectionService = require("../services/github-connection.service");
const githubImportService = require("../services/github-import.service");
const githubPushService = require("../services/github-push.service");

const connectGithub = async (req, res, next) => {
  try {
    const result = await githubConnectionService.connect(req.user.id, req.body.token);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getGithubConnection = async (req, res, next) => {
  try {
    const result = await githubConnectionService.getStatus(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const disconnectGithub = async (req, res, next) => {
  try {
    const result = await githubConnectionService.disconnect(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const listGithubRepos = async (req, res, next) => {
  try {
    const repos = await githubImportService.listRemoteRepos(req.user.id);
    res.json(repos);
  } catch (error) {
    next(error);
  }
};

const previewGithubImport = async (req, res, next) => {
  try {
    const preview = await githubImportService.previewImport(
      req.user.id,
      req.params.owner,
      req.params.repo
    );
    res.json(preview);
  } catch (error) {
    next(error);
  }
};

const importGithubRepo = async (req, res, next) => {
  try {
    const result = await githubImportService.importRepo(
      req.params.workspaceId,
      req.user.id,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const resyncGithubRepo = async (req, res, next) => {
  try {
    const result = await githubImportService.resyncRepo(req.params.repoId, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const pushGithubRepo = async (req, res, next) => {
  try {
    const result = await githubPushService.pushRepo(req.params.repoId, req.user.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  connectGithub,
  getGithubConnection,
  disconnectGithub,
  listGithubRepos,
  previewGithubImport,
  importGithubRepo,
  resyncGithubRepo,
  pushGithubRepo,
};
