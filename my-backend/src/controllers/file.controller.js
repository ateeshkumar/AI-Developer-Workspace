const fileService = require("../services/file.service");
const { getCollaborationGateway } = require("../services/collaboration.service");
const {
  acquireFileLock,
  getFileLock,
  releaseFileLock,
} = require("../services/repo-lock.service");

const createFile = async (req, res, next) => {
  try {
    const result = await fileService.createFile(req.params.repoId, req.user.id, req.body);
    const gateway = getCollaborationGateway();

    if (gateway) {
      gateway.notifyFileSaved("file:created", {
        repoId: req.params.repoId,
        file: result.file,
        version: result.version,
        actor: req.user,
      });
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const updateFile = async (req, res, next) => {
  try {
    const result = await fileService.updateFile(
      req.params.repoId,
      req.params.fileId,
      req.user.id,
      req.body
    );
    const gateway = getCollaborationGateway();

    if (gateway) {
      gateway.notifyFileSaved("file:saved", {
        repoId: req.params.repoId,
        file: result.file,
        version: result.version,
        actor: req.user,
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const result = await fileService.deleteFile(
      req.params.repoId,
      req.params.fileId,
      req.user.id,
      req.body
    );
    const gateway = getCollaborationGateway();

    if (gateway) {
      gateway.notifyFileSaved("file:deleted", {
        repoId: req.params.repoId,
        file: result.file,
        version: result.version,
        actor: req.user,
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getFileTree = async (req, res, next) => {
  try {
    const tree = await fileService.getFileTree(req.params.repoId);
    res.json(tree);
  } catch (error) {
    next(error);
  }
};

const getFileHistory = async (req, res, next) => {
  try {
    const history = await fileService.getFileHistory(req.params.repoId, req.params.fileId);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const uploadFiles = async (req, res, next) => {
  try {
    const uploaded = await fileService.uploadFiles(
      req.body.repoId,
      req.user.id,
      req.body,
      req.files
    );
    const gateway = getCollaborationGateway();

    if (gateway) {
      uploaded.forEach((result) => {
        gateway.notifyFileSaved("file:created", {
          repoId: req.body.repoId,
          file: result.file,
          version: result.version,
          actor: req.user,
        });
      });
    }

    res.status(201).json({
      count: uploaded.length,
      files: uploaded,
    });
  } catch (error) {
    next(error);
  }
};

const getFileLockStatus = async (req, res, next) => {
  try {
    const lock = getFileLock(req.params.repoId, req.params.fileId);
    res.json({ lock });
  } catch (error) {
    next(error);
  }
};

const acquireLock = async (req, res, next) => {
  try {
    const lock = acquireFileLock({
      repoId: req.params.repoId,
      fileId: req.params.fileId,
      user: req.user,
    });
    const gateway = getCollaborationGateway();

    if (gateway) {
      gateway.notifyFileLockChanged("file:lock", {
        repoId: req.params.repoId,
        fileId: req.params.fileId,
        lock,
        actor: req.user,
      });
    }

    res.json({ lock });
  } catch (error) {
    next(error);
  }
};

const releaseLock = async (req, res, next) => {
  try {
    const released = releaseFileLock({
      repoId: req.params.repoId,
      fileId: req.params.fileId,
      userId: req.user.id,
    });
    const gateway = getCollaborationGateway();

    if (gateway && released) {
      gateway.notifyFileLockChanged("file:unlock", {
        repoId: req.params.repoId,
        fileId: req.params.fileId,
        lock: released,
        actor: req.user,
      });
    }

    res.json({ lock: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFile,
  updateFile,
  deleteFile,
  getFileTree,
  getFileHistory,
  uploadFiles,
  getFileLockStatus,
  acquireLock,
  releaseLock,
};
