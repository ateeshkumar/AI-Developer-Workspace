const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { sanitizeUser } = require("../utils/auth-response");

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          workspace: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    ...sanitizeUser(user),
    workspaces: user.memberships.map((membership) => ({
      workspaceId: membership.workspaceId,
      workspaceName: membership.workspace.name,
      role: membership.role,
    })),
  };
};

module.exports = {
  getProfile,
};
