export type AIMessageRole = 'user' | 'assistant'

export type AIQueryPayload = {
  question: string
}

export type AIMessage = {
  id: string
  role: AIMessageRole
  content: string
}

export type AISource = {
  repo_name: string
  rel_path: string
  chunk_index: number
  start_line: number
  end_line: number
  score: number
  content: string
}

export type AIQueryResponse = {
  answer: string
  model: string
  embedding_model: string
  indexed_files: number
  indexed_chunks: number
  sources: AISource[]
  prompt_preview: string
  extra?: unknown
}
