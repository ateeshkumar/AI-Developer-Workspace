import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createDocument,
  deleteDocument,
  getDocument,
  listWorkspaceDocuments,
  updateDocument,
} from '../services/document'
import type { CreateDocumentPayload, UpdateDocumentPayload } from '../types/document'

export const useWorkspaceDocuments = (workspaceId: string) =>
  useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: () => listWorkspaceDocuments(workspaceId),
    enabled: Boolean(workspaceId),
  })

export const useDocument = (documentId: string) =>
  useQuery({
    queryKey: ['document', documentId],
    queryFn: () => getDocument(documentId),
    enabled: Boolean(documentId),
  })

export const useCreateDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateDocumentPayload) => createDocument(payload),
    onSuccess: (document) => {
      queryClient.invalidateQueries({
        queryKey: ['documents', document.workspaceId],
      })
      queryClient.setQueryData(['document', document.id], document)
    },
  })
}

export const useUpdateDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      payload,
    }: {
      documentId: string
      payload: UpdateDocumentPayload
    }) => updateDocument(documentId, payload),
    onSuccess: (document) => {
      queryClient.invalidateQueries({
        queryKey: ['documents', document.workspaceId],
      })
      queryClient.setQueryData(['document', document.id], document)
    },
  })
}

export const useDeleteDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId }: { documentId: string }) => deleteDocument(documentId),
    onSuccess: (_response, variables) => {
      queryClient.removeQueries({
        queryKey: ['document', variables.documentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['documents'],
      })
    },
  })
}
