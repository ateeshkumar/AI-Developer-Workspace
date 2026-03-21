import type { FileTreeNode } from '../../../types/repository'

type FileTreeProps = {
  nodes: FileTreeNode[]
  activeFileId: string
  onFileSelect: (fileId: string, filePath: string) => void
}

type FileTreeBranchProps = FileTreeProps & {
  depth?: number
}

function FileTreeBranch({
  nodes,
  activeFileId,
  onFileSelect,
  depth = 0,
}: FileTreeBranchProps) {
  return (
    <div className="grid gap-1">
      {nodes.map((node) => {
        if (node.type === 'directory') {
          return (
            <div key={`${node.path}-${depth}`} className="grid gap-1">
              <div
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300"
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
              >
                {node.name}
              </div>
              <FileTreeBranch
                nodes={node.children ?? []}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                depth={depth + 1}
              />
            </div>
          )
        }

        const isActive = node.id === activeFileId

        return (
          <button
            key={node.id ?? node.path}
            type="button"
            onClick={() => node.id && onFileSelect(node.id, node.path)}
            className={`rounded-xl px-3 py-2 text-left text-sm transition ${
              isActive
                ? 'bg-cyan-300/14 text-cyan-100'
                : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
            }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
          >
            {node.name}
          </button>
        )
      })}
    </div>
  )
}

export function FileTree({
  nodes,
  activeFileId,
  onFileSelect,
}: FileTreeProps) {
  return (
    <section className="panel-dark-soft rounded-[1.75rem] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
        File Explorer
      </div>
      <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-2xl font-semibold text-white">
        Tree structure
      </h2>

      <div className="mt-5">
        {nodes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
            No files found in this repository.
          </div>
        ) : (
          <FileTreeBranch
            nodes={nodes}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
          />
        )}
      </div>
    </section>
  )
}
