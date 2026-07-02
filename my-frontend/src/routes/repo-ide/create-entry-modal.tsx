import { useState } from 'react'

import { Modal } from '../../ui/modal'
import type { FileTreeNode } from '../../types/api'

type EntryType = 'file' | 'folder'

type CreateEntryModalProps = {
  isOpen: boolean
  tree: FileTreeNode[]
  defaultDestination?: string
  isCreating: boolean
  onClose: () => void
  onCreate: (path: string, type: EntryType) => void
}

function DestinationTree({
  nodes,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  nodes: FileTreeNode[]
  selectedPath: string
  onSelect: (path: string) => void
  depth?: number
}) {
  const directories = nodes.filter((node) => node.type === 'directory')

  if (directories.length === 0) {
    return null
  }

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 12 }}>
      {directories.map((dir) => (
        <div key={dir.path}>
          <button
            type="button"
            onClick={() => onSelect(dir.path)}
            className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs ${
              selectedPath === dir.path
                ? 'bg-cyan-300/20 text-cyan-100'
                : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            📁 {dir.name}
          </button>
          <DestinationTree
            nodes={dir.children ?? []}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  )
}

export function CreateEntryModal({
  isOpen,
  tree,
  defaultDestination = '',
  isCreating,
  onClose,
  onCreate,
}: CreateEntryModalProps) {
  const [type, setType] = useState<EntryType>('file')
  const [destination, setDestination] = useState(defaultDestination)
  const [name, setName] = useState('')

  // The modal component itself stays mounted (Modal only hides its content when
  // closed), so re-sync the destination each time it transitions to open for a
  // new location, rather than only reading defaultDestination once at mount.
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setDestination(defaultDestination)
    }
  }

  const close = () => {
    setType('file')
    setDestination('')
    setName('')
    onClose()
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const trimmedName = name.trim().replace(/^\/+|\/+$/g, '')

    if (!trimmedName) {
      return
    }

    const fullPath = destination ? `${destination}/${trimmedName}` : trimmedName
    onCreate(fullPath, type)
  }

  return (
    <Modal isOpen={isOpen} title="New file or folder" onClose={close}>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('file')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
              type === 'file' ? 'bg-cyan-300 text-slate-950' : 'border border-white/10 text-slate-300 hover:bg-white/[0.06]'
            }`}
          >
            File
          </button>
          <button
            type="button"
            onClick={() => setType('folder')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
              type === 'folder' ? 'bg-cyan-300 text-slate-950' : 'border border-white/10 text-slate-300 hover:bg-white/[0.06]'
            }`}
          >
            Folder
          </button>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Destination
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2">
            <button
              type="button"
              onClick={() => setDestination('')}
              className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs ${
                destination === '' ? 'bg-cyan-300/20 text-cyan-100' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              📁 (repository root)
            </button>
            <DestinationTree nodes={tree} selectedPath={destination} onSelect={setDestination} />
          </div>
        </div>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={type === 'file' ? 'index.ts' : 'components'}
          autoFocus
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
        />

        <div className="text-xs text-slate-500">
          Will create:{' '}
          <span className="text-slate-300">
            {destination ? `${destination}/` : ''}
            {name.trim() || (type === 'file' ? 'index.ts' : 'components')}
          </span>
        </div>

        <button
          type="submit"
          disabled={isCreating || !name.trim()}
          className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? 'Creating...' : `Create ${type}`}
        </button>
      </form>
    </Modal>
  )
}
