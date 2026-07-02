import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { useToast } from './use-toast'
import { queryAI } from '../services/ai'
import type { AIMessage, AIQueryResponse } from '../types/ai'

type UseAIChatOptions = {
  seedPrompt?: string
  contextHint?: string
  repoId?: string
}

const createMessage = (role: AIMessage['role'], content: string): AIMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
})

const buildAssistantResponse = (data: AIQueryResponse) =>
  `${data.answer}\n\n${
    data.sources.length
      ? `### Sources\n${data.sources
          .map(
            (source) =>
              `- \`${source.repo_name}/${source.rel_path}\` (${source.start_line}-${source.end_line})`
          )
          .join('\n')}`
      : ''
  }`

export const useAIChat = ({
  seedPrompt = '',
  contextHint = '',
  repoId,
}: UseAIChatOptions) => {
  const { toast } = useToast()
  const [messages, setMessages] = useState<AIMessage[]>([
    createMessage(
      'assistant',
      'Ask about the codebase, request an explanation, or use the quick actions to start.'
    ),
  ])
  const [input, setInput] = useState(seedPrompt)

  useEffect(() => {
    if (seedPrompt) {
      setInput(seedPrompt)
    }
  }, [seedPrompt])

  const queryMutation = useMutation({
    mutationFn: queryAI,
    onSuccess: (data, variables) => {
      setMessages((current) => [
        ...current,
        createMessage('user', variables.question),
        createMessage('assistant', buildAssistantResponse(data)),
      ])
      setInput('')
      toast({
        title: 'AI response ready',
        description: 'The assistant used the current code context.',
        tone: 'success',
      })
    },
    onError: () => {
      toast({
        title: 'AI request failed',
        description: 'Check whether the backend and AI service are both running.',
        tone: 'error',
      })
    },
  })

  const submitQuestion = (question: string) => {
    const trimmed = question.trim()

    if (!trimmed) {
      return
    }

    const fullPrompt = contextHint ? `${trimmed}\n\nContext:\n${contextHint}` : trimmed
    queryMutation.mutate({ question: fullPrompt, repoId })
  }

  return {
    input,
    isPending: queryMutation.isPending,
    messages,
    setInput,
    submitQuestion,
  }
}
