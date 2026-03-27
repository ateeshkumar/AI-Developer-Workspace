const { WebSocketServer } = require("ws");

const prisma = require("../config/prisma");
const { verifyAccessToken } = require("../utils/tokens");

const roleRank = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

class CollaborationGateway {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.clients = new Map();
    this.repoSubscriptions = new Map();
    this.fileSubscriptions = new Map();

    this.wss.on("connection", (ws, request) => {
      this.handleConnection(ws, request).catch((error) => {
        this.send(ws, {
          type: "error",
          message: error.message || "WebSocket connection failed",
        });
        ws.close(1008, "Unauthorized");
      });
    });
  }

  async handleConnection(ws, request) {
    const url = new URL(request.url, "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      throw new Error("Missing access token");
    }

    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      throw new Error("Invalid access token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    this.clients.set(ws, {
      user,
      repoIds: new Set(),
      fileIds: new Set(),
    });

    this.send(ws, {
      type: "connection:ready",
      user,
    });

    ws.on("message", async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        this.send(ws, {
          type: "error",
          message: error.message || "Invalid WebSocket message",
        });
      }
    });

    ws.on("close", () => {
      this.cleanupConnection(ws);
    });

    ws.on("error", () => {
      this.cleanupConnection(ws);
    });
  }

  async handleMessage(ws, message) {
    switch (message.type) {
      case "repo:subscribe":
        await this.subscribeRepo(ws, message.repoId);
        return;
      case "repo:unsubscribe":
        this.unsubscribeRepo(ws, message.repoId);
        return;
      case "file:join":
        await this.joinFile(ws, message.repoId, message.fileId);
        return;
      case "file:leave":
        this.leaveFile(ws, message.fileId);
        return;
      case "file:update":
        await this.handleFileUpdate(ws, message);
        return;
      case "presence:ping":
        this.send(ws, {
          type: "presence:pong",
          timestamp: new Date().toISOString(),
        });
        return;
      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }
  }

  async ensureRepoAccess(userId, repoId, minimumRole = "VIEWER") {
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      throw new Error("Repo not found");
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: repo.workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new Error("You do not belong to this repo workspace");
    }

    if (roleRank[membership.role] < roleRank[minimumRole]) {
      throw new Error(`Requires ${minimumRole.toLowerCase()} role or higher`);
    }

    return { repo, membership };
  }

  async subscribeRepo(ws, repoId) {
    const client = this.clients.get(ws);
    await this.ensureRepoAccess(client.user.id, repoId, "VIEWER");

    if (!this.repoSubscriptions.has(repoId)) {
      this.repoSubscriptions.set(repoId, new Set());
    }

    this.repoSubscriptions.get(repoId).add(ws);
    client.repoIds.add(repoId);

    this.send(ws, {
      type: "repo:subscribed",
      repoId,
    });
  }

  unsubscribeRepo(ws, repoId) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.repoIds.delete(repoId);

    const subscribers = this.repoSubscriptions.get(repoId);
    if (!subscribers) return;

    subscribers.delete(ws);
    if (subscribers.size === 0) {
      this.repoSubscriptions.delete(repoId);
    }
  }

  async joinFile(ws, repoId, fileId) {
    const client = this.clients.get(ws);
    await this.ensureRepoAccess(client.user.id, repoId, "VIEWER");

    const file = await prisma.repoFile.findFirst({
      where: {
        id: fileId,
        repoId,
      },
      select: {
        id: true,
        path: true,
      },
    });

    if (!file) {
      throw new Error("File not found");
    }

    if (!this.fileSubscriptions.has(fileId)) {
      this.fileSubscriptions.set(fileId, new Set());
    }

    this.fileSubscriptions.get(fileId).add(ws);
    client.fileIds.add(fileId);

    this.send(ws, {
      type: "file:joined",
      repoId,
      fileId,
      path: file.path,
      presence: this.getFilePresence(fileId),
    });

    this.broadcastToFile(
      fileId,
      {
        type: "presence:update",
        repoId,
        fileId,
        users: this.getFilePresence(fileId),
      },
      ws
    );
  }

  leaveFile(ws, fileId) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.fileIds.delete(fileId);

    const subscribers = this.fileSubscriptions.get(fileId);
    if (!subscribers) return;

    subscribers.delete(ws);

    if (subscribers.size === 0) {
      this.fileSubscriptions.delete(fileId);
      return;
    }

    this.broadcastToFile(fileId, {
      type: "presence:update",
      fileId,
      users: this.getFilePresence(fileId),
    });
  }

  async handleFileUpdate(ws, message) {
    const client = this.clients.get(ws);
    const { repoId, fileId, content, cursor, selection } = message;

    if (!fileId || !repoId) {
      throw new Error("repoId and fileId are required");
    }

    await this.ensureRepoAccess(client.user.id, repoId, "EDITOR");

    this.broadcastToFile(
      fileId,
      {
        type: "file:update",
        repoId,
        fileId,
        content,
        cursor: cursor || null,
        selection: selection || null,
        user: client.user,
        timestamp: new Date().toISOString(),
      },
      ws
    );
  }

  getFilePresence(fileId) {
    const subscribers = this.fileSubscriptions.get(fileId);
    if (!subscribers) return [];

    return Array.from(subscribers)
      .map((socket) => this.clients.get(socket))
      .filter(Boolean)
      .map((client) => client.user);
  }

  notifyFileSaved(eventType, payload) {
    const { repoId, file, version, actor } = payload;

    this.broadcastToRepo(repoId, {
      type: eventType,
      repoId,
      file,
      version,
      actor,
      timestamp: new Date().toISOString(),
    });

    this.broadcastToFile(file.id, {
      type: eventType,
      repoId,
      fileId: file.id,
      file,
      version,
      actor,
      timestamp: new Date().toISOString(),
    });
  }

  notifyCommitCreated(payload) {
    this.broadcastToRepo(payload.repoId, {
      type: "commit:created",
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  notifyFileLockChanged(eventType, payload) {
    this.broadcastToRepo(payload.repoId, {
      type: eventType,
      ...payload,
      timestamp: new Date().toISOString(),
    });

    this.broadcastToFile(payload.fileId, {
      type: eventType,
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToRepo(repoId, message, excludedSocket = null) {
    const subscribers = this.repoSubscriptions.get(repoId);
    if (!subscribers) return;

    for (const socket of subscribers) {
      if (socket !== excludedSocket) {
        this.send(socket, message);
      }
    }
  }

  broadcastToFile(fileId, message, excludedSocket = null) {
    const subscribers = this.fileSubscriptions.get(fileId);
    if (!subscribers) return;

    for (const socket of subscribers) {
      if (socket !== excludedSocket) {
        this.send(socket, message);
      }
    }
  }

  cleanupConnection(ws) {
    const client = this.clients.get(ws);
    if (!client) return;

    for (const repoId of client.repoIds) {
      this.unsubscribeRepo(ws, repoId);
    }

    for (const fileId of client.fileIds) {
      this.leaveFile(ws, fileId);
    }

    this.clients.delete(ws);
  }

  send(ws, payload) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(payload));
    }
  }
}

module.exports = CollaborationGateway;
