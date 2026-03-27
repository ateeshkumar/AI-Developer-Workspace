const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { listRepoLocks } = require("./repo-lock.service");

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

const normalizeSearchQuery = (query) => {
  const normalized = String(query || "").trim().toLowerCase();

  if (!normalized) {
    throw new ApiError(400, "Search query is required");
  }

  return normalized;
};

const buildSnippet = (content, query) => {
  const source = String(content || "");
  const lower = source.toLowerCase();
  const index = lower.indexOf(query);

  if (index === -1) {
    return null;
  }

  const start = Math.max(0, index - 60);
  const end = Math.min(source.length, index + query.length + 80);
  return source.slice(start, end).replace(/\s+/g, " ").trim();
};

const searchRepoFiles = async (repoId, query) => {
  const normalizedQuery = normalizeSearchQuery(query);

  const files = await prisma.repoFile.findMany({
    where: {
      repoId,
      isDeleted: false,
    },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        select: {
          content: true,
          versionNumber: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      path: "asc",
    },
  });

  return files
    .map((file) => {
      const latestVersion = file.versions[0] || null;
      const latestContent = latestVersion?.content || "";
      const isBinary = latestContent.startsWith("data:");
      const pathMatch = file.path.toLowerCase().includes(normalizedQuery);
      const contentMatch = !isBinary && latestContent.toLowerCase().includes(normalizedQuery);

      if (!pathMatch && !contentMatch) {
        return null;
      }

      return {
        fileId: file.id,
        name: file.name,
        path: file.path,
        updatedAt: file.updatedAt,
        versionNumber: latestVersion?.versionNumber || 0,
        matchType: pathMatch && contentMatch ? "path+content" : pathMatch ? "path" : "content",
        snippet: contentMatch ? buildSnippet(latestContent, normalizedQuery) : null,
      };
    })
    .filter(Boolean)
    .slice(0, 50);
};

const getRepoActivity = async (repoId, limit = 30) => {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const [versions, commits] = await Promise.all([
    prisma.fileVersion.findMany({
      where: {
        file: { repoId },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: normalizedLimit,
      include: {
        file: {
          select: {
            id: true,
            path: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.commit.findMany({
      where: { repoId },
      orderBy: {
        createdAt: "desc",
      },
      take: normalizedLimit,
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
                file: {
                  select: {
                    id: true,
                    path: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return [
    ...versions.map((version) => ({
      id: `version:${version.id}`,
      type: "file-version",
      createdAt: version.createdAt,
      actor: version.createdBy,
      file: version.file,
      changeType: version.changeType,
      versionNumber: version.versionNumber,
      summary: version.summary,
    })),
    ...commits.map((commit) => ({
      id: `commit:${commit.id}`,
      type: "commit",
      createdAt: commit.createdAt,
      actor: commit.createdBy,
      commitId: commit.id,
      message: commit.message,
      changedFiles: commit.fileVersions.length,
      files: commit.fileVersions.map((entry) => entry.fileVersion.file),
    })),
  ]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, normalizedLimit);
};

const getRepoWorkspaceSummary = async (repoId, userId) => {
  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
    include: {
      workspace: {
        include: {
          members: {
            where: {
              userId,
            },
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!repo) {
    throw new ApiError(404, "Repo not found");
  }

  return {
    repoId: repo.id,
    workspaceId: repo.workspaceId,
    role: repo.workspace.members[0]?.role || null,
    activeLocks: listRepoLocks(repoId),
  };
};

module.exports = {
  createRepo,
  listRepos,
  searchRepoFiles,
  getRepoActivity,
  getRepoWorkspaceSummary,
};
