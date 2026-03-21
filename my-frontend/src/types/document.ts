export type DocumentRecord = {
  id: string
  title: string
  markdown: string
  content: unknown
  position: number
  isArchived: boolean
  workspaceId: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  createdById: string
  updatedById: string | null
}

export type DocumentTreeNode = DocumentRecord & {
  children: DocumentTreeNode[]
}

export type CreateDocumentPayload = {
  workspaceId: string
  title?: string
  parentId?: string | null
  markdown?: string
  content?: unknown
}

export type UpdateDocumentPayload = {
  title?: string
  parentId?: string | null
  markdown?: string
  content?: unknown
  position?: number
}

export type DeleteDocumentResponse = {
  deletedIds: string[]
}
