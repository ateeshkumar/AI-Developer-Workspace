const aiService = require("../services/ai.service");
const repoService = require("../services/repo.service");

const queryAssistant = async (req, res, next) => {
  try {
    const { repoId, ...rest } = req.body;
    const payload = await aiService.queryAssistant({
      ...rest,
      ...(repoId ? { repo_id: repoId } : {}),
    });
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

const indexRepo = async (req, res, next) => {
  try {
    const { repo, files } = await repoService.getRepoFilesForIndexing(req.params.repoId);
    const result = await aiService.indexRepo({ repoId: repo.id, repoName: repo.name, files });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  queryAssistant,
  indexRepo,
};
