const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");

const workspaceRoleRank = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

const requireRepoRole = (minimumRole = "VIEWER") => async (req, _res, next) => {
  try {
    const repoId = req.params.repoId || req.body.repoId;

    if (!repoId) {
      throw new ApiError(400, "repoId is required");
    }

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      throw new ApiError(404, "Repo not found");
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: repo.workspaceId,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      throw new ApiError(403, "You do not belong to this repo workspace");
    }

    if (workspaceRoleRank[membership.role] < workspaceRoleRank[minimumRole]) {
      throw new ApiError(403, `Requires ${minimumRole.toLowerCase()} role or higher`);
    }

    req.repo = repo;
    req.workspaceMembership = membership;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireRepoRole,
};
