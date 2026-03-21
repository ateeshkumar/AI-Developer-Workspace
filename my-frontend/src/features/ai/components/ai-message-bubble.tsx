import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { AIMessage } from '../../../types/ai'

type AIMessageBubbleProps = {
  message: AIMessage
}

export function AIMessageBubble({ message }: AIMessageBubbleProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <article
      className={`rounded-[1.5rem] px-4 py-4 shadow-sm ${
        isAssistant
          ? 'bg-white text-stone-900'
          : 'bg-stone-950 text-stone-50'
      }`}
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
        {isAssistant ? 'AI Assistant' : 'You'}
      </div>

      <div className="prose prose-sm max-w-none prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-stone-950 prose-pre:p-4 prose-pre:text-stone-50 prose-code:rounded prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-stone-900">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
    </article>
  )
}
