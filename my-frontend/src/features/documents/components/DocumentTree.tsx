import { useEffect, useState } from 'react'

import { DocumentItem } from './DocumentItem'
import type { DocumentTreeNode } from '../../../types/document'

type DocumentTreeProps = {
  nodes: DocumentTreeNode[]
  activeDocumentId: string
  isLoading: boolean
  onSelect: (documentId: string) => void
  onCreateRoot: () => void
  onCreateChild: (parentId: string) => void
}

const collectNodeIds = (nodes: DocumentTreeNode[]): string[] =>
  nodes.flatMap((node) => [node.id, ...collectNodeIds(node.children)])

export function DocumentTree({
  nodes,
  activeDocumentId,
  isLoading,
  onSelect,
  onCreateRoot,
  onCreateChild,
}: DocumentTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current)

      for (const id of collectNodeIds(nodes)) {
        next.add(id)
      }

      return next
    })
  }, [nodes])

  const handleToggle = (documentId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)

      if (next.has(documentId)) {
        next.delete(documentId)
      } else {
        next.add(documentId)
      }

      return next
    })
  }

  return (
    <section className="panel-dark-soft rounded-[1.75rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Documents
          </div>
          <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold text-white">
            Workspace tree
          </h2>
        </div>

        <button
          type="button"
          onClick={onCreateRoot}
          className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
        >
          New page
        </button>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
            Loading documents...
          </div>
        ) : nodes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
            No pages yet. Create the first workspace page to start your document tree.
          </div>
        ) : (
          <div className="grid gap-1">
            {nodes.map((node) => (
              <DocumentItem
                key={node.id}
                node={node}
                activeDocumentId={activeDocumentId}
                depth={0}
                expandedIds={expandedIds}
                onToggle={handleToggle}
                onSelect={onSelect}
                onCreateChild={onCreateChild}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
