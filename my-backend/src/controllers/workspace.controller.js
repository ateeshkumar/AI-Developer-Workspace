const workspaceService = require("../services/workspace.service");

const createWorkspace = async (req, res, next) => {
  try {
    const workspace = await workspaceService.createWorkspace(req.body, req.user.id);
    res.status(201).json(workspace);
  } catch (error) {
    next(error);
  }
};

const inviteUser = async (req, res, next) => {
  try {
    const result = await workspaceService.inviteUser(
      req.params.workspaceId,
      req.body,
      req.user.id
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const listMyWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await workspaceService.listWorkspacesForUser(req.user.id);
    res.json(workspaces);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkspace,
  inviteUser,
  listMyWorkspaces,
};
