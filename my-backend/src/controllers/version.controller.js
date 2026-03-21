const versionService = require("../services/version.service");
const { getCollaborationGateway } = require("../services/collaboration.service");

const createCommit = async (req, res, next) => {
  try {
    const commit = await versionService.createCommit(req.params.repoId, req.user.id, req.body);
    const gateway = getCollaborationGateway();

    if (gateway) {
      gateway.notifyCommitCreated({
        repoId: req.params.repoId,
        commit,
        actor: req.user,
      });
    }

    res.status(201).json(commit);
  } catch (error) {
    next(error);
  }
};

const getCommitHistory = async (req, res, next) => {
  try {
    const commits = await versionService.getCommitHistory(req.params.repoId);
    res.json(commits);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCommit,
  getCommitHistory,
};
