const ApiError = require("../utils/api-error");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const createSession = async ({ repoId, repoName, userId, files }) => {
  const response = await fetch(`${AI_SERVICE_URL}/terminal/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo_id: repoId,
      repo_name: repoName,
      user_id: userId,
      files,
    }),
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

const destroySession = async (sessionId) => {
  const response = await fetch(`${AI_SERVICE_URL}/terminal/sessions/${sessionId}`, {
    method: "DELETE",
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

const getSessionPorts = async (sessionId) => {
  const response = await fetch(`${AI_SERVICE_URL}/terminal/sessions/${sessionId}/ports`);

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
  createSession,
  destroySession,
  getSessionPorts,
};
