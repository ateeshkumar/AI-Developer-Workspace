const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");

const createCommit = async (repoId, userId, payload) => {
  const message = String(payload.message || "").trim();

  if (!message) {
    throw new ApiError(400, "Commit message is required");
  }

  let fileVersionIds = Array.isArray(payload.fileVersionIds)
    ? payload.fileVersionIds.filter(Boolean)
    : [];

  if (fileVersionIds.length === 0) {
    const uncommittedVersions = await prisma.fileVersion.findMany({
      where: {
        file: { repoId },
        commitLinks: {
          none: {},
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    fileVersionIds = uncommittedVersions.map((version) => version.id);
  }

  if (fileVersionIds.length === 0) {
    throw new ApiError(400, "No file versions available to commit");
  }

  const versions = await prisma.fileVersion.findMany({
    where: {
      id: { in: fileVersionIds },
      file: { repoId },
    },
    include: {
      commitLinks: true,
      file: {
        select: {
          id: true,
          path: true,
        },
      },
    },
  });

  if (versions.length !== fileVersionIds.length) {
    throw new ApiError(400, "Some file versions do not belong to this repo");
  }

  if (versions.some((version) => version.commitLinks.length > 0)) {
    throw new ApiError(409, "One or more file versions are already linked to a commit");
  }

  return prisma.$transaction(async (tx) => {
    const commit = await tx.commit.create({
      data: {
        repoId,
        createdById: userId,
        message,
      },
    });

    await tx.commitFileVersion.createMany({
      data: versions.map((version) => ({
        commitId: commit.id,
        fileVersionId: version.id,
      })),
    });

    return tx.commit.findUnique({
      where: { id: commit.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        fileVersions: {
          include: {
            fileVersion: {
              include: {
                file: true,
              },
            },
          },
        },
      },
    });
  });
};

const getCommitHistory = async (repoId) =>
  prisma.commit.findMany({
    where: { repoId },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      fileVersions: {
        include: {
          fileVersion: {
            include: {
              file: true,
            },
          },
        },
      },
    },
  });

module.exports = {
  createCommit,
  getCommitHistory,
};
