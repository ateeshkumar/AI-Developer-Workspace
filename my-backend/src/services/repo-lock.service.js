const ApiError = require("../utils/api-error");

const LOCK_TTL_MS = Math.max(
  Number(process.env.REPO_FILE_LOCK_TTL_MS || 2 * 60 * 1000),
  30 * 1000
);

const locks = new Map();

const buildKey = (repoId, fileId) => `${repoId}:${fileId}`;

const serializeLock = (lock) => ({
  repoId: lock.repoId,
  fileId: lock.fileId,
  acquiredAt: lock.acquiredAt.toISOString(),
  expiresAt: lock.expiresAt.toISOString(),
  user: {
    id: lock.user.id,
    name: lock.user.name,
    email: lock.user.email,
  },
});

const cleanupExpiredLocks = () => {
  const now = Date.now();

  for (const [key, lock] of locks.entries()) {
    if (lock.expiresAt.getTime() <= now) {
      locks.delete(key);
    }
  }
};

const getFileLock = (repoId, fileId) => {
  cleanupExpiredLocks();
  const lock = locks.get(buildKey(repoId, fileId));
  return lock ? serializeLock(lock) : null;
};

const listRepoLocks = (repoId) => {
  cleanupExpiredLocks();

  return Array.from(locks.values())
    .filter((lock) => lock.repoId === repoId)
    .sort((left, right) => right.acquiredAt.getTime() - left.acquiredAt.getTime())
    .map(serializeLock);
};

const acquireFileLock = ({ repoId, fileId, user }) => {
  cleanupExpiredLocks();

  const key = buildKey(repoId, fileId);
  const existing = locks.get(key);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

  if (existing && existing.user.id !== user.id) {
    throw new ApiError(409, "File is locked by another user", {
      lock: serializeLock(existing),
    });
  }

  const nextLock = {
    repoId,
    fileId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    acquiredAt: existing ? existing.acquiredAt : now,
    expiresAt,
  };

  locks.set(key, nextLock);
  return serializeLock(nextLock);
};

const releaseFileLock = ({ repoId, fileId, userId, force = false }) => {
  cleanupExpiredLocks();

  const key = buildKey(repoId, fileId);
  const existing = locks.get(key);

  if (!existing) {
    return null;
  }

  if (!force && existing.user.id !== userId) {
    throw new ApiError(403, "Only the user holding the lock can release it");
  }

  locks.delete(key);
  return serializeLock(existing);
};

const assertFileWriteAllowed = ({ repoId, fileId, userId }) => {
  const lock = getFileLock(repoId, fileId);

  if (lock && lock.user.id !== userId) {
    throw new ApiError(409, "File is locked by another user", {
      lock,
    });
  }
};

module.exports = {
  LOCK_TTL_MS,
  getFileLock,
  listRepoLocks,
  acquireFileLock,
  releaseFileLock,
  assertFileWriteAllowed,
};
