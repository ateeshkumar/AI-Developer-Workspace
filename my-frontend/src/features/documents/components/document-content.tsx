import Editor from '@monaco-editor/react'
import { useEffect, useMemo, useState } from 'react'

import {
  useCreateDocument,
  useDeleteDocument,
  useDocument,
  useUpdateDocument,
  useWorkspaceDocuments,
} from '../../../hooks/use-documents'
import { useToast } from '../../../hooks/use-toast'
import type { DocumentTreeNode } from '../../../types/document'
import { DocumentTree } from './DocumentTree'

type DocumentContentProps = {
  workspaceId: string
  activeDocumentId: string
  onSelectDocument: (documentId: string) => void
}

const findDocumentInTree = (
  nodes: DocumentTreeNode[],
  documentId: string,
): DocumentTreeNode | null => {
  for (const node of nodes) {
    if (node.id === documentId) {
      return node
    }

    const nestedMatch = findDocumentInTree(node.children, documentId)
    if (nestedMatch) {
      return nestedMatch
    }
  }

  return null
}

export function DocumentContent({
  workspaceId,
  activeDocumentId,
  onSelectDocument,
}: DocumentContentProps) {
  const documentsQuery = useWorkspaceDocuments(workspaceId)
  const selectedDocumentQuery = useDocument(activeDocumentId)
  const createDocumentMutation = useCreateDocument()
  const updateDocumentMutation = useUpdateDocument()
  const deleteDocumentMutation = useDeleteDocument()
  const { toast } = useToast()
  const [titleDraft, setTitleDraft] = useState('')
  const [markdownDraft, setMarkdownDraft] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const selectedDocument = selectedDocumentQuery.data
  const treeNodes = documentsQuery.data ?? []

  useEffect(() => {
    if (!activeDocumentId && treeNodes.length > 0) {
      onSelectDocument(treeNodes[0].id)
    }
  }, [activeDocumentId, onSelectDocument, treeNodes])

  useEffect(() => {
    if (!selectedDocument) {
      setTitleDraft('')
      setMarkdownDraft('')
      return
    }

    setTitleDraft(selectedDocument.title)
    setMarkdownDraft(selectedDocument.markdown)
  }, [selectedDocument])

  useEffect(() => {
    if (!selectedDocument) {
      return
    }

    if (
      titleDraft === selectedDocument.title &&
      markdownDraft === selectedDocument.markdown
    ) {
      return
    }

    setSaveState('saving')

    const timeout = window.setTimeout(async () => {
      try {
        await updateDocumentMutation.mutateAsync({
          documentId: selectedDocument.id,
          payload: {
            title: titleDraft,
            markdown: markdownDraft,
            content: [
              {
                type: 'markdown',
                content: markdownDraft,
              },
            ],
          },
        })
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [markdownDraft, selectedDocument, titleDraft, updateDocumentMutation])

  const selectedTreeDocument = useMemo(
    () => findDocumentInTree(treeNodes, activeDocumentId),
    [activeDocumentId, treeNodes],
  )

  const handleCreateDocument = async (parentId?: string) => {
    if (!workspaceId) {
      return
    }

    try {
      const document = await createDocumentMutation.mutateAsync({
        workspaceId,
        parentId: parentId ?? null,
        title: parentId ? 'Untitled sub-page' : 'Untitled page',
        markdown: '',
        content: [],
      })

      onSelectDocument(document.id)
      setSaveState('idle')
      toast({
        title: 'Page created',
        description: parentId
          ? 'A nested page was added to the document tree.'
          : 'A new page was added to the workspace tree.',
        tone: 'success',
      })
    } catch {
      toast({
        title: 'Page creation failed',
        description: 'Please try again after checking the backend.',
        tone: 'error',
      })
    }
  }

  const handleDeleteDocument = async () => {
    if (!selectedDocument) {
      return
    }

    try {
      await deleteDocumentMutation.mutateAsync({
        documentId: selectedDocument.id,
      })
      onSelectDocument('')
      setSaveState('idle')
      toast({
        title: 'Page deleted',
        description: 'The selected page and its nested children were removed.',
        tone: 'success',
      })
    } catch {
      toast({
        title: 'Delete failed',
        description: 'The page could not be removed right now.',
        tone: 'error',
      })
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <DocumentTree
          nodes={treeNodes}
          activeDocumentId={activeDocumentId}
          isLoading={documentsQuery.isLoading}
          onSelect={onSelectDocument}
          onCreateRoot={() => handleCreateDocument()}
          onCreateChild={(parentId) => handleCreateDocument(parentId)}
        />

        <section className="panel-dark-soft rounded-[1.75rem] p-5 text-sm text-slate-300">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Page details
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="font-medium text-white">Selected:</span>{' '}
              {selectedTreeDocument?.title ?? 'No page selected'}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="font-medium text-white">Parent:</span>{' '}
              {selectedTreeDocument?.parentId ?? 'Root page'}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="font-medium text-white">Save state:</span>{' '}
              <span className="capitalize">{saveState}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="grid min-h-[720px] grid-rows-[auto_auto_1fr] overflow-hidden rounded-[2rem] border border-black/10 bg-[#191611] shadow-[0_25px_60px_rgba(35,27,14,0.18)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-stone-100">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-amber-300/70">
              Notion-style editor
            </div>
            <div className="mt-1 font-medium">
              {selectedDocument?.title ?? 'Choose a page from the sidebar'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 capitalize">
              {saveState}
            </span>
            {selectedDocument ? (
              <button
                type="button"
                onClick={handleDeleteDocument}
                className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-red-100 transition hover:bg-red-500/20"
              >
                Delete page
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 border-b border-white/10 bg-[#14110d] px-5 py-4">
          <input
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            placeholder="Untitled page"
            disabled={!selectedDocument}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-lg font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
          />

          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setMarkdownDraft((current) => `${current}\n# Heading\n`)}
              disabled={!selectedDocument}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              /heading
            </button>
            <button
              type="button"
              onClick={() =>
                setMarkdownDraft(
                  (current) =>
                    `${current}\n\`\`\`ts\nfunction hello() {\n  return 'world'\n}\n\`\`\`\n`,
                )
              }
              disabled={!selectedDocument}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              /code
            </button>
          </div>
        </div>

        {selectedDocument ? (
          <Editor
            key={selectedDocument.id}
            height="100%"
            language="markdown"
            theme="vs-dark"
            value={markdownDraft}
            onChange={(value) => setMarkdownDraft(value ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              padding: { top: 18 },
              smoothScrolling: true,
              wordWrap: 'on',
            }}
          />
        ) : (
          <div className="grid place-items-center p-8 text-center text-slate-400">
            <div>
              <div className="text-lg font-semibold text-white">No page selected</div>
              <p className="mt-2 max-w-md text-sm leading-6">
                Choose an existing page from the tree or create a new one to start writing.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
