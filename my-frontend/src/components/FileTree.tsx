import { useEffect, useMemo, useState } from 'react'

import { FileNode } from './FileNode'
import type { FileTreeNode } from '../types/repository'

type FileTreeProps = {
  nodes: FileTreeNode[]
  activeFileId: string
  onFileSelect: (fileId: string, filePath: string) => void
}

const collectDirectoryPaths = (nodes: FileTreeNode[]): string[] =>
  nodes.flatMap((node) =>
    node.type === 'directory'
      ? [node.path, ...collectDirectoryPaths(node.children ?? [])]
      : []
  )

export function FileTree({
  nodes,
  activeFileId,
  onFileSelect,
}: FileTreeProps) {
  const initialExpandedPaths = useMemo(() => new Set(collectDirectoryPaths(nodes)), [nodes])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(initialExpandedPaths)

  useEffect(() => {
    setExpandedPaths(new Set(collectDirectoryPaths(nodes)))
  }, [nodes])

  const toggleFolder = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current)

      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }

      return next
    })
  }

  return (
    <section className="panel-dark-soft rounded-[1.75rem] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
        File Explorer
      </div>
      <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold text-white">
        Repository tree
      </h2>

      <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-slate-950/35 p-3">
        {nodes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
            No files found in this repository.
          </div>
        ) : (
          <div className="grid gap-1">
            {nodes.map((node) => (
              <FileNode
                key={node.id ?? node.path}
                node={node}
                depth={0}
                activeFileId={activeFileId}
                expandedPaths={expandedPaths}
                onToggleFolder={toggleFolder}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
