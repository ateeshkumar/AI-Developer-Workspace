const { Octokit } = require("@octokit/rest");
const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { decryptSecret } = require("../utils/crypto");

const getClientForUser = async (userId) => {
  const connection = await prisma.githubConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    throw new ApiError(404, "GitHub is not connected for this account");
  }

  const token = decryptSecret(connection.encryptedToken);

  return new Octokit({ auth: token });
};

const verifyToken = async (token) => {
  const octokit = new Octokit({ auth: token });

  try {
    const response = await octokit.request("GET /user");
    const scopes = response.headers["x-oauth-scopes"] || "";

    return {
      login: response.data.login,
      scopes,
    };
  } catch (error) {
    throw new ApiError(401, "Invalid GitHub token");
  }
};

module.exports = {
  getClientForUser,
  verifyToken,
};
