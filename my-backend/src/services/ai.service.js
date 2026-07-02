const ApiError = require("../utils/api-error");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const queryAssistant = async (payload) => {
  const response = await fetch(`${AI_SERVICE_URL}/ai/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status || 502,
      data.detail || data.error || "AI service request failed"
    );
  }

  return data;
};

const indexRepo = async ({ repoId, repoName, files }) => {
  const response = await fetch(`${AI_SERVICE_URL}/ai/index-repo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ repo_id: repoId, repo_name: repoName, files }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status || 502,
      data.detail || data.error || "AI service request failed"
    );
  }

  return data;
};

module.exports = {
  queryAssistant,
  indexRepo,
};
