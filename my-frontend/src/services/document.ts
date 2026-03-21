import { api } from './api'
import type {
  CreateDocumentPayload,
  DeleteDocumentResponse,
  DocumentRecord,
  DocumentTreeNode,
  UpdateDocumentPayload,
} from '../types/document'

export const listWorkspaceDocuments = async (workspaceId: string) => {
  const { data } = await api.get<DocumentTreeNode[]>(`/document/workspace/${workspaceId}`)
  return data
}

export const getDocument = async (documentId: string) => {
  const { data } = await api.get<DocumentRecord>(`/document/${documentId}`)
  return data
}

export const createDocument = async (payload: CreateDocumentPayload) => {
  const { data } = await api.post<DocumentRecord>('/document', payload)
  return data
}

export const updateDocument = async (
  documentId: string,
  payload: UpdateDocumentPayload,
) => {
  const { data } = await api.put<DocumentRecord>(`/document/${documentId}`, payload)
  return data
}

export const deleteDocument = async (documentId: string) => {
  const { data } = await api.delete<DeleteDocumentResponse>(`/document/${documentId}`)
  return data
}
