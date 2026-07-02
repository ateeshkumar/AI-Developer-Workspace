const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { computeBlobSha } = require("../utils/crypto");
const { getClientForUser } = require("./github-client.service");

const MAX_IMPORT_FILES = 2000;
const MAX_FILE_SIZE_BYTES = 1_000_000;
const IMPORT_CONCURRENCY = 8;

const EXCLUDED_DIR_NAMES = new Set([
  ".git",
  ".idea",
  ".vscode",
  "__pycache__",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "vendor",
  ".next",
  ".venv",
]);

const isExcludedPath = (path) => path.split("/").some((part) => EXCLUDED_DIR_NAMES.has(part));

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};

const decodeBlobContent = (base64Content) => {
  const buffer = Buffer.from(base64Content, "base64");
  const decoded = buffer.toString("utf8");

  if (Buffer.from(decoded, "utf8").equals(buffer)) {
    return { content: decoded, isBinary: false };
  }

  return {
    content: `data:application/octet-stream;base64,${buffer.toString("base64")}`,
    isBinary: true,
  };
};

const fetchFilteredTree = async (octokit, owner, repo, branch) => {
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "1",
  });

  if (data.truncated) {
    throw new ApiError(
      400,
      "This repository's file tree is too large to import in one request"
    );
  }

  const skipped = [];
  const included = [];

  for (const entry of data.tree) {
    if (entry.type !== "blob") {
      continue;
    }

    if (isExcludedPath(entry.path)) {
      continue;
    }

    if ((entry.size ?? 0) > MAX_FILE_SIZE_BYTES) {
      skipped.push({ path: entry.path, reason: "File exceeds size limit" });
      continue;
    }

    included.push(entry);
  }

  if (included.length > MAX_IMPORT_FILES) {
    throw new ApiError(
      400,
      `This repository has more than ${MAX_IMPORT_FILES} importable files`
    );
  }

  return { included, skipped };
};

const resolveDefaultBranch = async (octokit, owner, repo) => {
  const { data } = await octokit.repos.get({ owner, repo });
  return data.default_branch;
};

const listRemoteRepos = async (userId) => {
  const octokit = await getClientForUser(userId);

  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "updated",
  });

  return repos.map((repo) => ({
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    defaultBranch: repo.default_branch,
    private: repo.private,
    updatedAt: repo.updated_at,
  }));
};

const previewImport = async (userId, owner, repo) => {
  const octokit = await getClientForUser(userId);
  const defaultBranch = await resolveDefaultBranch(octokit, owner, repo);
  const { included, skipped } = await fetchFilteredTree(octokit, owner, repo, defaultBranch);

  return {
    totalFiles: included.length + skipped.length,
    includedFiles: included.length,
    skipped,
    defaultBranch,
  };
};

const importRepo = async (workspaceId, userId, { owner, repo, name, description }) => {
  if (!owner || !repo) {
    throw new ApiError(400, "GitHub owner and repo are required");
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const octokit = await getClientForUser(userId);
  const defaultBranch = await resolveDefaultBranch(octokit, owner, repo);
  const { included, skipped } = await fetchFilteredTree(octokit, owner, repo, defaultBranch);

  const blobResults = await mapWithConcurrency(included, IMPORT_CONCURRENCY, async (entry) => {
    const { data } = await octokit.git.getBlob({ owner, repo, file_sha: entry.sha });
    const { content } = decodeBlobContent(data.content);

    return { entry, content };
  });

  const now = new Date();
  const repoId = crypto.randomUUID();

  const filesData = blobResults.map(({ entry, content }) => {
    const fileId = crypto.randomUUID();
    const pathParts = entry.path.split("/");

    return {
      fileId,
      content,
      row: {
        id: fileId,
        repoId,
        path: entry.path,
        name: pathParts[pathParts.length - 1],
        githubBlobSha: entry.sha,
        githubSyncStatus: "PULLED",
        githubSyncedAt: now,
      },
    };
  });

  const repoResult = await prisma.$transaction(async (tx) => {
    const createdRepo = await tx.repo.create({
      data: {
        id: repoId,
        workspaceId,
        createdById: userId,
        name: String(name || repo).trim(),
        description: description ? String(description).trim() : null,
        provider: "github",
        remoteUrl: `https://github.com/${owner}/${repo}`,
        githubOwner: owner,
        githubRepo: repo,
        githubDefaultBranch: defaultBranch,
        githubImportedAt: now,
        githubLastSyncedAt: now,
      },
    });

    if (filesData.length > 0) {
      await tx.repoFile.createMany({
        data: filesData.map((file) => file.row),
      });

      await tx.fileVersion.createMany({
        data: filesData.map((file) => ({
          id: crypto.randomUUID(),
          fileId: file.fileId,
          createdById: userId,
          versionNumber: 1,
          changeType: "CREATE",
          content: file.content,
          summary: `Pulled from GitHub (${owner}/${repo}@${defaultBranch})`,
        })),
      });
    }

    return createdRepo;
  });

  return {
    repo: repoResult,
    importedCount: filesData.length,
    skipped,
  };
};

const resyncRepo = async (repoId, userId) => {
  const repo = await prisma.repo.findUnique({ where: { id: repoId } });

  if (!repo) {
    throw new ApiError(404, "Repo not found");
  }

  if (repo.provider !== "github" || !repo.githubOwner || !repo.githubRepo) {
    throw new ApiError(400, "Repo is not linked to GitHub");
  }

  const octokit = await getClientForUser(userId);
  const { included, skipped } = await fetchFilteredTree(
    octokit,
    repo.githubOwner,
    repo.githubRepo,
    repo.githubDefaultBranch
  );

  const existingFiles = await prisma.repoFile.findMany({
    where: { repoId, isDeleted: false },
  });

  const existingByPath = new Map(existingFiles.map((file) => [file.path, file]));
  const remotePaths = new Set(included.map((entry) => entry.path));

  const toCreate = included.filter((entry) => !existingByPath.has(entry.path));
  const toUpdate = included.filter((entry) => {
    const existing = existingByPath.get(entry.path);
    return existing && existing.githubBlobSha !== entry.sha;
  });
  const toDelete = existingFiles.filter((file) => !remotePaths.has(file.path));

  const now = new Date();
  let createdCount = 0;
  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    if (toCreate.length > 0) {
      const blobs = await mapWithConcurrency(toCreate, IMPORT_CONCURRENCY, async (entry) => {
        const { data } = await octokit.git.getBlob({
          owner: repo.githubOwner,
          repo: repo.githubRepo,
          file_sha: entry.sha,
        });
        return { entry, content: decodeBlobContent(data.content).content };
      });

      const filesData = blobs.map(({ entry, content }) => {
        const fileId = crypto.randomUUID();
        const pathParts = entry.path.split("/");

        return {
          fileId,
          content,
          row: {
            id: fileId,
            repoId,
            path: entry.path,
            name: pathParts[pathParts.length - 1],
            githubBlobSha: entry.sha,
            githubSyncStatus: "PULLED",
            githubSyncedAt: now,
          },
        };
      });

      await tx.repoFile.createMany({ data: filesData.map((file) => file.row) });
      await tx.fileVersion.createMany({
        data: filesData.map((file) => ({
          id: crypto.randomUUID(),
          fileId: file.fileId,
          createdById: userId,
          versionNumber: 1,
          changeType: "CREATE",
          content: file.content,
          summary: `Pulled from GitHub (${repo.githubOwner}/${repo.githubRepo})`,
        })),
      });

      createdCount = filesData.length;
    }

    for (const entry of toUpdate) {
      const existing = existingByPath.get(entry.path);
      const { data } = await octokit.git.getBlob({
        owner: repo.githubOwner,
        repo: repo.githubRepo,
        file_sha: entry.sha,
      });
      const { content } = decodeBlobContent(data.content);

      const latestVersion = await tx.fileVersion.findFirst({
        where: { fileId: existing.id },
        orderBy: { versionNumber: "desc" },
      });

      await tx.fileVersion.create({
        data: {
          fileId: existing.id,
          createdById: userId,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          changeType: "UPDATE",
          content,
          summary: `Pulled from GitHub (${repo.githubOwner}/${repo.githubRepo})`,
        },
      });

      await tx.repoFile.update({
        where: { id: existing.id },
        data: { githubBlobSha: entry.sha, githubSyncStatus: "PULLED", githubSyncedAt: now },
      });

      updatedCount += 1;
    }

    for (const file of toDelete) {
      const latestVersion = await tx.fileVersion.findFirst({
        where: { fileId: file.id },
        orderBy: { versionNumber: "desc" },
      });

      await tx.fileVersion.create({
        data: {
          fileId: file.id,
          createdById: userId,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          changeType: "DELETE",
          content: null,
          summary: "Removed on GitHub",
        },
      });

      await tx.repoFile.update({
        where: { id: file.id },
        data: { isDeleted: true, githubSyncStatus: "PULLED", githubSyncedAt: now },
      });
    }

    await tx.repo.update({
      where: { id: repoId },
      data: { githubLastSyncedAt: now },
    });
  });

  return {
    created: createdCount,
    updated: updatedCount,
    deleted: toDelete.length,
    unchanged: existingFiles.length - toUpdate.length - toDelete.length,
  };
};

module.exports = {
  listRemoteRepos,
  previewImport,
  importRepo,
  resyncRepo,
};
