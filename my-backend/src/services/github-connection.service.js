const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { encryptSecret } = require("../utils/crypto");
const { verifyToken } = require("./github-client.service");

const connect = async (userId, token) => {
  if (!token || !String(token).trim()) {
    throw new ApiError(400, "A GitHub token is required");
  }

  const { login, scopes } = await verifyToken(String(token).trim());
  const encryptedToken = encryptSecret(String(token).trim());

  const connection = await prisma.githubConnection.upsert({
    where: { userId },
    update: {
      encryptedToken,
      githubLogin: login,
      scopes,
    },
    create: {
      userId,
      encryptedToken,
      githubLogin: login,
      scopes,
    },
  });

  return {
    connected: true,
    githubLogin: connection.githubLogin,
    scopes: connection.scopes,
    connectedAt: connection.createdAt,
  };
};

const getStatus = async (userId) => {
  const connection = await prisma.githubConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return { connected: false };
  }

  return {
    connected: true,
    githubLogin: connection.githubLogin,
    scopes: connection.scopes,
    connectedAt: connection.createdAt,
  };
};

const disconnect = async (userId) => {
  await prisma.githubConnection.deleteMany({
    where: { userId },
  });

  return { connected: false };
};

module.exports = {
  connect,
  getStatus,
  disconnect,
};
