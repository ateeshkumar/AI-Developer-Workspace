const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");

const VALID_ROLES = ["ADMIN", "EDITOR", "VIEWER"];

const normalizeRole = (role) => {
  const normalized = String(role || "").toUpperCase();

  if (!VALID_ROLES.includes(normalized)) {
    throw new ApiError(400, `Role must be one of: ${VALID_ROLES.join(", ")}`);
  }

  return normalized;
};

const createWorkspace = async ({ name, description }, userId) => {
  if (!name || !String(name).trim()) {
    throw new ApiError(400, "Workspace name is required");
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return workspace;
};

const inviteUser = async (workspaceId, { email, role }, invitedById) => {
  if (!email || !String(email).trim()) {
    throw new ApiError(400, "Invite email is required");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedRole = normalizeRole(role);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const membership = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: existingUser.id,
        },
      },
      update: {
        role: normalizedRole,
      },
      create: {
        workspaceId,
        userId: existingUser.id,
        role: normalizedRole,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      type: "membership",
      membership,
    };
  }

  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId,
      invitedById,
      email: normalizedEmail,
      role: normalizedRole,
    },
  });

  return {
    type: "invitation",
    invitation,
  };
};

const listWorkspacesForUser = async (userId) =>
  prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          repos: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

module.exports = {
  createWorkspace,
  inviteUser,
  listWorkspacesForUser,
};
