const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { computeBlobSha } = require("../utils/crypto");
const { getClientForUser } = require("./github-client.service");

const PUSH_CONCURRENCY = 8;

const isBinaryContent = (content) => typeof content === "string" && content.startsWith("data:");

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

const pushRepo = async (repoId, userId, { commitMessage } = {}) => {
  const repo = await prisma.repo.findUnique({ where: { id: repoId } });

  if (!repo) {
    throw new ApiError(404, "Repo not found");
  }

  if (repo.provider !== "github" || !repo.githubOwner || !repo.githubRepo) {
    throw new ApiError(400, "Repo is not linked to GitHub");
  }

  const octokit = await getClientForUser(userId);
  const owner = repo.githubOwner;
  const repoName = repo.githubRepo;
  const branch = repo.githubDefaultBranch;

  const files = await prisma.repoFile.findMany({
    where: { repoId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  const changed = [];
  const deleted = [];
  const skipped = [];

  for (const file of files) {
    const latestVersion = file.versions[0] || null;

    if (file.isDeleted) {
      if (file.githubBlobSha) {
        deleted.push(file);
      }
      continue;
    }

    const content = latestVersion?.content ?? "";
    const localSha = computeBlobSha(content);

    if (localSha === file.githubBlobSha) {
      skipped.push(file.path);
      continue;
    }

    changed.push({ file, content });
  }

  if (changed.length === 0 && deleted.length === 0) {
    return { pushed: [], deleted: [], skipped, conflict: null };
  }

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo: repoName,
    ref: `heads/${branch}`,
  });
  const baseCommitSha = refData.object.sha;

  const { data: baseCommit } = await octokit.git.getCommit({
    owner,
    repo: repoName,
    commit_sha: baseCommitSha,
  });
  const baseTreeSha = baseCommit.tree.sha;

  const blobEntries = await mapWithConcurrency(changed, PUSH_CONCURRENCY, async ({ file, content }) => {
    const binary = isBinaryContent(content);

    const { data } = await octokit.git.createBlob({
      owner,
      repo: repoName,
      content: binary ? content.slice(content.indexOf(",") + 1) : content,
      encoding: binary ? "base64" : "utf-8",
    });

    return { file, blobSha: data.sha };
  });

  const treeEntries = [
    ...blobEntries.map(({ file, blobSha }) => ({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: blobSha,
    })),
    ...deleted.map((file) => ({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: null,
    })),
  ];

  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo: repoName,
    base_tree: baseTreeSha,
    tree: treeEntries,
  });

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo: repoName,
    message: commitMessage || "Sync from workspace",
    tree: newTree.sha,
    parents: [baseCommitSha],
  });

  try {
    await octokit.git.updateRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });
  } catch (error) {
    return {
      pushed: [],
      deleted: [],
      skipped: files.map((file) => file.path),
      conflict: {
        message: "Remote has new commits since your last sync — pull and retry",
      },
    };
  }

  const now = new Date();

  await prisma.$transaction([
    ...blobEntries.map(({ file, blobSha }) =>
      prisma.repoFile.update({
        where: { id: file.id },
        data: { githubBlobSha: blobSha, githubSyncStatus: "PUSHED", githubSyncedAt: now },
      })
    ),
    ...deleted.map((file) =>
      prisma.repoFile.update({
        where: { id: file.id },
        data: { githubBlobSha: null, githubSyncStatus: "PUSHED", githubSyncedAt: now },
      })
    ),
    prisma.repo.update({
      where: { id: repoId },
      data: { githubLastSyncedAt: now },
    }),
  ]);

  return {
    pushed: blobEntries.map(({ file }) => file.path),
    deleted: deleted.map((file) => file.path),
    skipped,
    conflict: null,
  };
};

module.exports = {
  pushRepo,
};
