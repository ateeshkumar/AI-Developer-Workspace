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

module.exports = {
  createRepo,
  listRepos,
};
