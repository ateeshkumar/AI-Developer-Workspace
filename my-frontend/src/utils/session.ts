import type { SessionDraft } from '../types/session'

export const createEmptySessionDraft = (): SessionDraft => ({
  accessToken: '',
  workspaceId: '',
  repoId: '',
  fileId: '',
})
