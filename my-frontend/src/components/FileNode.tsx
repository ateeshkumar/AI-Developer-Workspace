import type { FileTreeNode } from '../types/repository'

type FileNodeProps = {
  node: FileTreeNode
  depth: number
  activeFileId: string
  expandedPaths: Set<string>
  onToggleFolder: (path: string) => void
  onFileSelect: (fileId: string, filePath: string) => void
}

export function FileNode({
  node,
  depth,
  activeFileId,
  expandedPaths,
  onToggleFolder,
  onFileSelect,
}: FileNodeProps) {
  const paddingLeft = `${depth * 18 + 12}px`

  if (node.type === 'directory') {
    const isExpanded = expandedPaths.has(node.path)

    return (
      <div className="grid gap-1">
        <button
          type="button"
          onClick={() => onToggleFolder(node.path)}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
          style={{ paddingLeft }}
        >
          <span className="text-xs text-slate-400">{isExpanded ? 'v' : '>'}</span>
          <span className="text-amber-200">{isExpanded ? '[D]' : '[>]'} </span>
          <span>{node.name}</span>
        </button>

        {isExpanded ? (
          <div className="grid gap-1">
            {(node.children ?? []).map((child) => (
              <FileNode
                key={child.id ?? child.path}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                expandedPaths={expandedPaths}
                onToggleFolder={onToggleFolder}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  const isActive = node.id === activeFileId

  return (
    <button
      type="button"
      onClick={() => node.id && onFileSelect(node.id, node.path)}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
        isActive
          ? 'bg-cyan-300/14 text-cyan-100'
          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
      }`}
      style={{ paddingLeft }}
    >
      <span className="text-slate-500">-</span>
      <span className="text-slate-400">[F]</span>
      <span className="truncate">{node.name}</span>
    </button>
  )
}
