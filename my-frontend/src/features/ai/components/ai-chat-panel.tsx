import { useAIChat } from '../../../hooks/use-ai-chat'
import { Skeleton } from '../../../components/ui/skeleton'
import { AIMessageBubble } from './ai-message-bubble'

type AIChatPanelProps = {
  seedPrompt?: string
  contextHint?: string
}

export function AIChatPanel({
  seedPrompt = '',
  contextHint = '',
}: AIChatPanelProps) {
  const { input, isPending, messages, setInput, submitQuestion } = useAIChat({
    seedPrompt,
    contextHint,
  })

  return (
    <section className="panel-dark-soft grid min-h-[720px] grid-rows-[1fr_auto] overflow-hidden rounded-[1.75rem]">
      <div className="grid gap-4 overflow-y-auto p-5">
        {messages.map((message) => (
          <AIMessageBubble key={message.id} message={message} />
        ))}

        {isPending ? (
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="text-sm text-slate-400">Thinking through the codebase...</div>
            <Skeleton className="mt-4 h-4 w-2/3" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </div>
        ) : null}
      </div>

      <form
        className="border-t border-white/10 bg-slate-950/35 p-4"
        onSubmit={(event) => {
          event.preventDefault()
          submitQuestion(input)
        }}
      >
        <label className="grid gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Ask AI
          </span>
          <textarea
            rows={4}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about the current repository, explain the active file, or request a fix/refactor..."
            className="rounded-2xl border border-white/10 bg-slate-900/75 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300"
          />
        </label>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            Responses are rendered as markdown with code blocks.
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </section>
  )
}
