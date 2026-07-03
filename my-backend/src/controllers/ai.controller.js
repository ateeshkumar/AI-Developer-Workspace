const aiService = require("../services/ai.service");
const repoService = require("../services/repo.service");
const aiProviderConnectionService = require("../services/ai-provider-connection.service");
const ApiError = require("../utils/api-error");

const queryAssistant = async (req, res, next) => {
  try {
    const { repoId, provider, ...rest } = req.body;
    const normalizedProvider = provider && provider !== "local" ? provider : null;

    let apiKey = null;
    if (normalizedProvider) {
      apiKey = await aiProviderConnectionService.getDecryptedKey(req.user.id, normalizedProvider);
      if (!apiKey) {
        throw new ApiError(400, `Connect your ${normalizedProvider} API key first`);
      }
    }

    const payload = await aiService.queryAssistant({
      ...rest,
      ...(repoId ? { repo_id: repoId } : {}),
      ...(normalizedProvider ? { provider: normalizedProvider, api_key: apiKey } : {}),
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

const getProviderStatus = async (req, res, next) => {
  try {
    const status = await aiProviderConnectionService.getStatus(req.user.id);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

const connectProvider = async (req, res, next) => {
  try {
    const result = await aiProviderConnectionService.connect(req.user.id, req.params.provider, req.body.apiKey);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const disconnectProvider = async (req, res, next) => {
  try {
    const result = await aiProviderConnectionService.disconnect(req.user.id, req.params.provider);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  queryAssistant,
  indexRepo,
  getProviderStatus,
  connectProvider,
  disconnectProvider,
};
