const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { assertFileWriteAllowed } = require("./repo-lock.service");

const TEXT_MIME_PREFIXES = ["text/"];
const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "application/x-sh",
  "application/x-httpd-php",
  "application/x-yaml",
]);

const joinUploadPath = (prefix, filename) => {
  const normalizedPrefix = prefix ? normalizePath(prefix) : "";
  const normalizedFilename = normalizePath(filename);

  return normalizedPrefix ? `${normalizedPrefix}/${normalizedFilename}` : normalizedFilename;
};

const normalizePath = (path) => {
  const normalized = String(path || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    throw new ApiError(400, "File path is required");
  }

  if (normalized.includes("..")) {
    throw new ApiError(400, "File path cannot contain '..'");
  }

  return normalized;
};

const isTextUpload = (file) => {
  const mimeType = String(file?.mimetype || "").toLowerCase();

  return (
    TEXT_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix)) ||
    TEXT_MIME_TYPES.has(mimeType)
  );
};

const encodeUploadedFileContent = (file) => {
  if (isTextUpload(file)) {
    return file.buffer.toString("utf8");
  }

  const mimeType = file.mimetype || "application/octet-stream";
  return `data:${mimeType};base64,${file.buffer.toString("base64")}`;
};

const buildFileTree = (files) => {
  const root = [];
  const directoryMap = new Map();

  const getDirectoryNode = (parts) => {
    let currentPath = "";
    let currentChildren = root;

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!directoryMap.has(currentPath)) {
        const directory = {
          type: "directory",
          name: part,
          path: currentPath,
          children: [],
        };

        directoryMap.set(currentPath, directory);
        currentChildren.push(directory);
      }

      currentChildren = directoryMap.get(currentPath).children;
    }

    return currentChildren;
  };

  files.forEach((file) => {
    const parts = file.path.split("/");
    const filename = parts.pop();
    const parentChildren = getDirectoryNode(parts);

    parentChildren.push({
      type: "file",
      id: file.id,
      name: filename,
      path: file.path,
      updatedAt: file.updatedAt,
    });
  });

  return root;
};

const getNextVersionNumber = async (fileId) => {
  const latestVersion = await prisma.fileVersion.findFirst({
    where: { fileId },
    orderBy: { versionNumber: "desc" },
  });

  return latestVersion ? latestVersion.versionNumber + 1 : 1;
};

const createFile = async (repoId, userId, payload) => {
  const path = normalizePath(payload.path);
  const content = payload.content ?? "";
  const summary = payload.summary ? String(payload.summary).trim() : "File created";
  const name = path.split("/").pop();

  const existingFile = await prisma.repoFile.findUnique({
    where: {
      repoId_path: {
        repoId,
        path,
      },
    },
  });

  if (existingFile && !existingFile.isDeleted) {
    throw new ApiError(409, "A file already exists at this path");
  }

  if (existingFile && existingFile.isDeleted) {
    const versionNumber = await getNextVersionNumber(existingFile.id);

    return prisma.$transaction(async (tx) => {
      const file = await tx.repoFile.update({
        where: { id: existingFile.id },
        data: {
          name,
          isDeleted: false,
        },
      });

      const version = await tx.fileVersion.create({
        data: {
          fileId: file.id,
          createdById: userId,
          versionNumber,
          changeType: "CREATE",
          content: String(content),
          summary,
        },
      });

      return { file, version };
    });
  }

  return prisma.$transaction(async (tx) => {
    const file = await tx.repoFile.create({
      data: {
        repoId,
        path,
        name,
      },
    });

    const version = await tx.fileVersion.create({
      data: {
        fileId: file.id,
        createdById: userId,
        versionNumber: 1,
        changeType: "CREATE",
        content: String(content),
        summary,
      },
    });

    return { file, version };
  });
};

const uploadFiles = async (repoId, userId, payload, files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new ApiError(400, "At least one file is required");
  }

  const pathPrefix = payload.pathPrefix || payload.path || "";

  const uploaded = [];

  for (const file of files) {
    const path = joinUploadPath(pathPrefix, file.originalname);
    const result = await createFile(repoId, userId, {
      path,
      content: encodeUploadedFileContent(file),
      summary: `Uploaded ${file.originalname}`,
    });

    uploaded.push({
      ...result,
      upload: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  }

  return uploaded;
};

const updateFile = async (repoId, fileId, userId, payload) => {
  assertFileWriteAllowed({ repoId, fileId, userId });

  const file = await prisma.repoFile.findFirst({
    where: {
      id: fileId,
      repoId,
    },
  });

  if (!file) {
    throw new ApiError(404, "File not found");
  }

  if (file.isDeleted) {
    throw new ApiError(400, "Deleted files cannot be updated");
  }

  if (typeof payload.content !== "string") {
    throw new ApiError(400, "File content is required");
  }

  const versionNumber = await getNextVersionNumber(file.id);

  const version = await prisma.fileVersion.create({
    data: {
      fileId: file.id,
      createdById: userId,
      versionNumber,
      changeType: "UPDATE",
      content: payload.content,
      summary: payload.summary ? String(payload.summary).trim() : "File updated",
    },
  });

  return { file, version };
};

const deleteFile = async (repoId, fileId, userId, payload = {}) => {
  assertFileWriteAllowed({ repoId, fileId, userId });

  const file = await prisma.repoFile.findFirst({
    where: {
      id: fileId,
      repoId,
    },
  });

  if (!file) {
    throw new ApiError(404, "File not found");
  }

  if (file.isDeleted) {
    throw new ApiError(400, "File is already deleted");
  }

  const versionNumber = await getNextVersionNumber(file.id);

  return prisma.$transaction(async (tx) => {
    const updatedFile = await tx.repoFile.update({
      where: { id: file.id },
      data: { isDeleted: true },
    });

    const version = await tx.fileVersion.create({
      data: {
        fileId: file.id,
        createdById: userId,
        versionNumber,
        changeType: "DELETE",
        content: null,
        summary: payload.summary ? String(payload.summary).trim() : "File deleted",
      },
    });

    return { file: updatedFile, version };
  });
};

const getFileTree = async (repoId) => {
  const files = await prisma.repoFile.findMany({
    where: {
      repoId,
      isDeleted: false,
    },
    orderBy: {
      path: "asc",
    },
  });

  return buildFileTree(files);
};

const getFileHistory = async (repoId, fileId) => {
  const file = await prisma.repoFile.findFirst({
    where: {
      id: fileId,
      repoId,
    },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          commitLinks: {
            include: {
              commit: true,
            },
          },
        },
      },
    },
  });

  if (!file) {
    throw new ApiError(404, "File not found");
  }

  return file;
};

module.exports = {
  createFile,
  uploadFiles,
  updateFile,
  deleteFile,
  getFileTree,
  getFileHistory,
};
