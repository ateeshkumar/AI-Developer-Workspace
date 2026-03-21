import type { DocumentTreeNode } from '../../../types/document'

type DocumentItemProps = {
  node: DocumentTreeNode
  activeDocumentId: string
  depth: number
  expandedIds: Set<string>
  onToggle: (documentId: string) => void
  onSelect: (documentId: string) => void
  onCreateChild: (parentId: string) => void
}

export function DocumentItem({
  node,
  activeDocumentId,
  depth,
  expandedIds,
  onToggle,
  onSelect,
  onCreateChild,
}: DocumentItemProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isActive = node.id === activeDocumentId

  return (
    <div className="grid gap-1">
      <div className="group flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          disabled={!hasChildren}
          className={`h-7 w-7 rounded-full border text-xs transition ${
            hasChildren
              ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
              : 'cursor-default border-transparent text-slate-600'
          }`}
          aria-label={isExpanded ? 'Collapse page' : 'Expand page'}
        >
          {hasChildren ? (isExpanded ? 'v' : '>') : '.'}
        </button>

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={`flex-1 rounded-2xl px-3 py-2 text-left text-sm transition ${
            isActive
              ? 'bg-cyan-300/14 text-cyan-100'
              : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
          }`}
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div className="truncate font-medium">{node.title || 'Untitled'}</div>
          <div className="mt-1 text-xs text-slate-400">
            Updated {new Date(node.updatedAt).toLocaleDateString()}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
            isActive
              ? 'bg-cyan-300 text-slate-950'
              : 'border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]'
          }`}
          aria-label={`Open ${node.title || 'Untitled'} page`}
        >
          {isActive ? 'Opened' : 'Open'}
        </button>

        <button
          type="button"
          onClick={() => onCreateChild(node.id)}
          className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04] text-sm text-slate-300 opacity-0 transition hover:bg-cyan-300 hover:text-slate-950 group-hover:opacity-100"
          aria-label="Create child page"
        >
          +
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <div className="grid gap-1">
          {node.children.map((child) => (
            <DocumentItem
              key={child.id}
              node={child}
              activeDocumentId={activeDocumentId}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
