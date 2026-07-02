import { useMemo, useState } from 'react'

import { AIChatPanel } from '../../ai/components/ai-chat-panel'
import { AISidebarPanel } from '../../ai/components/ai-sidebar-panel'
import { useEditorStore } from '../../../store/editor-store'

type AIPanelProps = {
  isOpen: boolean
  onToggle: () => void
}

export function AIPanel({ isOpen, onToggle }: AIPanelProps) {
  const { repoId, filePath, content } = useEditorStore()
  const [seedPrompt, setSeedPrompt] = useState('')

  const contextHint = useMemo(() => {
    const parts: string[] = []

    if (repoId) {
      parts.push(`Repository ID: ${repoId}`)
    }

    if (filePath) {
      parts.push(`Active file: ${filePath}`)
    }

    if (content) {
      parts.push(`Current editor content:\n${content.slice(0, 5000)}`)
    }

    return parts.join('\n\n')
  }, [content, filePath, repoId])

  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? 'Collapse AI panel' : 'Expand AI panel'}
        className="mb-3 flex items-center justify-center gap-2 self-end rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]"
      >
        {isOpen ? 'Hide AI ›' : '‹ AI'}
      </button>

      {isOpen ? (
        <div className="grid gap-4">
          <AISidebarPanel onAction={setSeedPrompt} />
          <AIChatPanel seedPrompt={seedPrompt} contextHint={contextHint} repoId={repoId} />
        </div>
      ) : null}
    </div>
  )
}
