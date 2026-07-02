export type AIMessageRole = 'user' | 'assistant'

export type AIQueryPayload = {
  question: string
  repoId?: string
}

export type IndexRepoResponse = {
  indexed_files: number
  indexed_chunks: number
  included_roots: string[]
  created_at: string | null
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
