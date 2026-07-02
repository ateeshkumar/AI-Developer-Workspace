import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { useQueryAI } from '../../api/ai'
import { pushToast } from '../../ui/toast'
import { useIde } from './ide-context'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const QUICK_ACTIONS = [
  { label: 'Explain', prompt: 'Explain the currently open file and how it works.' },
  { label: 'Find bugs', prompt: 'Review the currently open file for bugs or edge cases.' },
  { label: 'Refactor', prompt: 'Suggest a refactor for the currently open file, preserving behavior.' },
]

export function AssistantPane() {
  const { repoId, filePath, content, isAiPanelOpen, toggleAiPanel } = useIde()
  const queryMutation = useQueryAI()
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'seed', role: 'assistant', content: 'Ask about this repository, or use a quick action below.' },
  ])
  const [input, setInput] = useState('')

  const buildContextHint = () => {
    const parts: string[] = []
    if (filePath) parts.push(`Active file: ${filePath}`)
    if (content) parts.push(`Current editor content:\n${content.slice(0, 5000)}`)
    return parts.join('\n\n')
  }

  const submit = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return

    const contextHint = buildContextHint()
    const fullPrompt = contextHint ? `${trimmed}\n\nContext:\n${contextHint}` : trimmed

    setMessages((current) => [...current, { id: `${Date.now()}-u`, role: 'user', content: trimmed }])
    setInput('')

    try {
      const response = await queryMutation.mutateAsync({ question: fullPrompt, repoId })
      setMessages((current) => [...current, { id: `${Date.now()}-a`, role: 'assistant', content: response.answer }])
    } catch {
      pushToast({ title: 'AI request failed', description: 'Check that the AI service is running.', tone: 'error' })
    }
  }

  if (!isAiPanelOpen) {
    return (
      <button
        type="button"
        onClick={toggleAiPanel}
        className="flex h-full w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-300 hover:bg-white/[0.06]"
      >
        AI
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-200/75">AI Assistant</span>
        <button type="button" onClick={toggleAiPanel} className="text-xs text-slate-400 hover:text-white">
          Hide ›
        </button>
      </div>

      <div className="flex gap-2 border-b border-white/10 px-4 py-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => void submit(action.prompt)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/[0.08]"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl p-3 ${
              message.role === 'user' ? 'bg-cyan-300/10 text-cyan-100' : 'bg-white/[0.04] text-slate-200'
            }`}
          >
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
          </div>
        ))}
        {queryMutation.isPending ? <div className="text-xs text-slate-500">Thinking...</div> : null}
      </div>

      <form
        className="border-t border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(input)
        }}
      >
        <textarea
          rows={2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this repository..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
        />
        <button
          type="submit"
          disabled={queryMutation.isPending}
          className="mt-2 w-full rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
