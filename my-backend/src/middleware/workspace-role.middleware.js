const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");

const workspaceRoleRank = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

const requireWorkspaceRole = (minimumRole = "VIEWER") => async (req, _res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;

    if (!workspaceId) {
      throw new ApiError(400, "workspaceId is required");
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      throw new ApiError(403, "You do not belong to this workspace");
    }

    if (workspaceRoleRank[membership.role] < workspaceRoleRank[minimumRole]) {
      throw new ApiError(403, `Requires ${minimumRole.toLowerCase()} role or higher`);
    }

    req.workspaceMembership = membership;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireWorkspaceRole,
};
