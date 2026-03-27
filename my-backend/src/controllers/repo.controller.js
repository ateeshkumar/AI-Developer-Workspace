const repoService = require("../services/repo.service");

const createRepo = async (req, res, next) => {
  try {
    const repo = await repoService.createRepo(
      req.params.workspaceId,
      req.user.id,
      req.body
    );

    res.status(201).json(repo);
  } catch (error) {
    next(error);
  }
};

const listRepos = async (req, res, next) => {
  try {
    const repos = await repoService.listRepos(req.params.workspaceId);
    res.json(repos);
  } catch (error) {
    next(error);
  }
};

const searchRepoFiles = async (req, res, next) => {
  try {
    const results = await repoService.searchRepoFiles(req.params.repoId, req.query.q);
    res.json(results);
  } catch (error) {
    next(error);
  }
};

const getRepoActivity = async (req, res, next) => {
  try {
    const activity = await repoService.getRepoActivity(req.params.repoId, req.query.limit);
    res.json(activity);
  } catch (error) {
    next(error);
  }
};

const getRepoWorkspaceSummary = async (req, res, next) => {
  try {
    const summary = await repoService.getRepoWorkspaceSummary(req.params.repoId, req.user.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRepo,
  listRepos,
  searchRepoFiles,
  getRepoActivity,
  getRepoWorkspaceSummary,
};
