const documentService = require("../services/document.service");

const createDocument = async (req, res, next) => {
  try {
    const document = await documentService.createDocument(req.body, req.user.id);
    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const document = await documentService.getDocumentById(req.params.id, req.user.id);
    res.json(document);
  } catch (error) {
    next(error);
  }
};

const updateDocument = async (req, res, next) => {
  try {
    const document = await documentService.updateDocument(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json(document);
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const result = await documentService.deleteDocument(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const listWorkspaceDocuments = async (req, res, next) => {
  try {
    const documents = await documentService.listWorkspaceDocuments(
      req.params.workspaceId,
      req.user.id
    );
    res.json(documents);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  listWorkspaceDocuments,
};
