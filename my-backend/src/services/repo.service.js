const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");

const createRepo = async (workspaceId, userId, payload) => {
  const { name, description, provider, remoteUrl } = payload;

  if (!name || !String(name).trim()) {
    throw new ApiError(400, "Repo name is required");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  return prisma.repo.create({
    data: {
      workspaceId,
      createdById: userId,
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      provider: provider ? String(provider).trim() : null,
      remoteUrl: remoteUrl ? String(remoteUrl).trim() : null,
    },
  });
};

const listRepos = async (workspaceId) =>
  prisma.repo.findMany({
    where: { workspaceId },
    orderBy: {
      createdAt: "desc",
    },
  });

module.exports = {
  createRepo,
  listRepos,
};
