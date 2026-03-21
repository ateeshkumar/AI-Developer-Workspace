const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");

const workspaceRoleRank = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

const DEFAULT_MARKDOWN = "";
const DEFAULT_CONTENT = [];

const normalizeTitle = (title) => {
  const normalized = String(title || "").trim();
  return normalized || "Untitled";
};

const normalizeMarkdown = (markdown) => {
  if (markdown === undefined) {
    return undefined;
  }

  return markdown === null ? null : String(markdown);
};

const normalizeContent = (content, markdown) => {
  if (content !== undefined) {
    return content;
  }

  if (markdown !== undefined) {
    return [
      {
        type: "markdown",
        content: markdown ?? "",
      },
    ];
  }

  return undefined;
};

const serializeDocument = (document) => ({
  id: document.id,
  title: document.title,
  markdown: document.markdown ?? DEFAULT_MARKDOWN,
  content: document.content ?? DEFAULT_CONTENT,
  position: document.position,
  isArchived: document.isArchived,
  workspaceId: document.workspaceId,
  parentId: document.parentId,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  createdById: document.createdById,
  updatedById: document.updatedById,
});

const assertWorkspaceRole = async (workspaceId, userId, minimumRole) => {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new ApiError(403, "You do not belong to this workspace");
  }

  if (workspaceRoleRank[membership.role] < workspaceRoleRank[minimumRole]) {
    throw new ApiError(403, `Requires ${minimumRole.toLowerCase()} role or higher`);
  }

  return membership;
};

const ensureWorkspaceExists = async (workspaceId) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  return workspace;
};

const getDocumentOrThrow = async (documentId) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document || document.isArchived) {
    throw new ApiError(404, "Document not found");
  }

  return document;
};

const ensureParentDocument = async (parentId, workspaceId, documentId) => {
  if (parentId === undefined) {
    return undefined;
  }

  if (parentId === null) {
    return null;
  }

  const parent = await prisma.document.findUnique({
    where: { id: parentId },
  });

  if (!parent || parent.isArchived) {
    throw new ApiError(404, "Parent document not found");
  }

  if (parent.workspaceId !== workspaceId) {
    throw new ApiError(400, "Parent document must belong to the same workspace");
  }

  if (documentId && parent.id === documentId) {
    throw new ApiError(400, "A document cannot be its own parent");
  }

  let cursor = parent;
  while (cursor.parentId) {
    if (cursor.parentId === documentId) {
      throw new ApiError(400, "A document cannot be moved inside one of its descendants");
    }

    cursor = await prisma.document.findUnique({
      where: { id: cursor.parentId },
    });

    if (!cursor) {
      break;
    }
  }

  return parent;
};

const getNextPosition = async (workspaceId, parentId) => {
  const sibling = await prisma.document.findFirst({
    where: {
      workspaceId,
      parentId: parentId ?? null,
      isArchived: false,
    },
    orderBy: {
      position: "desc",
    },
  });

  return sibling ? sibling.position + 1 : 0;
};

const buildDocumentTree = (documents, parentId = null) =>
  documents
    .filter((document) => (document.parentId ?? null) === parentId)
    .map((document) => ({
      ...serializeDocument(document),
      children: buildDocumentTree(documents, document.id),
    }));

const collectDescendantIds = (documentsByParent, parentId) => {
  const children = documentsByParent.get(parentId) ?? [];

  return children.flatMap((child) => [
    child.id,
    ...collectDescendantIds(documentsByParent, child.id),
  ]);
};

const createDocument = async (payload, userId) => {
  const { workspaceId, parentId } = payload;

  if (!workspaceId || !String(workspaceId).trim()) {
    throw new ApiError(400, "workspaceId is required");
  }

  await ensureWorkspaceExists(workspaceId);
  await assertWorkspaceRole(workspaceId, userId, "EDITOR");

  const normalizedParent = await ensureParentDocument(parentId, workspaceId);
  const markdown = normalizeMarkdown(payload.markdown);
  const content = normalizeContent(payload.content, markdown ?? DEFAULT_MARKDOWN);

  const document = await prisma.document.create({
    data: {
      workspaceId,
      parentId: normalizedParent ? normalizedParent.id : null,
      title: normalizeTitle(payload.title),
      markdown: markdown ?? DEFAULT_MARKDOWN,
      content: content ?? DEFAULT_CONTENT,
      position: await getNextPosition(workspaceId, normalizedParent?.id ?? null),
      createdById: userId,
      updatedById: userId,
    },
  });

  return serializeDocument(document);
};

const getDocumentById = async (documentId, userId) => {
  const document = await getDocumentOrThrow(documentId);
  await assertWorkspaceRole(document.workspaceId, userId, "VIEWER");

  return serializeDocument(document);
};

const updateDocument = async (documentId, payload, userId) => {
  const document = await getDocumentOrThrow(documentId);
  await assertWorkspaceRole(document.workspaceId, userId, "EDITOR");

  const parent = await ensureParentDocument(payload.parentId, document.workspaceId, document.id);
  const markdown = normalizeMarkdown(payload.markdown);
  const content = normalizeContent(payload.content, markdown);

  const nextParentId = parent === undefined ? document.parentId : parent ? parent.id : null;
  const position =
    payload.position !== undefined && Number.isInteger(payload.position)
      ? payload.position
      : parent !== undefined && nextParentId !== document.parentId
        ? await getNextPosition(document.workspaceId, nextParentId)
        : document.position;

  const updatedDocument = await prisma.document.update({
    where: { id: documentId },
    data: {
      title: payload.title !== undefined ? normalizeTitle(payload.title) : undefined,
      markdown,
      content,
      parentId: nextParentId,
      position,
      updatedById: userId,
    },
  });

  return serializeDocument(updatedDocument);
};

const deleteDocument = async (documentId, userId) => {
  const document = await getDocumentOrThrow(documentId);
  await assertWorkspaceRole(document.workspaceId, userId, "EDITOR");

  const descendants = await prisma.document.findMany({
    where: {
      workspaceId: document.workspaceId,
      isArchived: false,
    },
    select: {
      id: true,
      parentId: true,
    },
  });

  const documentsByParent = descendants.reduce((map, item) => {
    const key = item.parentId ?? null;
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
    return map;
  }, new Map());

  const idsToDelete = [document.id, ...collectDescendantIds(documentsByParent, document.id)];

  await prisma.document.deleteMany({
    where: {
      id: {
        in: idsToDelete,
      },
    },
  });

  return {
    deletedIds: idsToDelete,
  };
};

const listWorkspaceDocuments = async (workspaceId, userId) => {
  await ensureWorkspaceExists(workspaceId);
  await assertWorkspaceRole(workspaceId, userId, "VIEWER");

  const documents = await prisma.document.findMany({
    where: {
      workspaceId,
      isArchived: false,
    },
    orderBy: [
      { parentId: "asc" },
      { position: "asc" },
      { createdAt: "asc" },
    ],
  });

  return buildDocumentTree(documents);
};

module.exports = {
  createDocument,
  getDocumentById,
  updateDocument,
  deleteDocument,
  listWorkspaceDocuments,
};
