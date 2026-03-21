import { useMemo, useState } from 'react'

import { AISidebarPanel } from './ai-sidebar-panel'
import { AIChatPanel } from './ai-chat-panel'

type AIAssistantContentProps = {
  repoId: string
  filePath: string
  content: string
}

export function AIAssistantContent({
  repoId,
  filePath,
  content,
}: AIAssistantContentProps) {
  const [seedPrompt, setSeedPrompt] = useState('')

  const contextHint = useMemo(() => {
    const parts = []

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
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <AISidebarPanel onAction={setSeedPrompt} />
      <AIChatPanel seedPrompt={seedPrompt} contextHint={contextHint} />
    </div>
  )
}
