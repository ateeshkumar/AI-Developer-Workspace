import { create } from 'zustand'
import type { EditorTab } from '../types/repository'

type EditorState = {
  workspaceId: string
  repoId: string
  fileId: string
  filePath: string
  content: string
  socketConnected: boolean
  openTabs: EditorTab[]
  setWorkspaceId: (value: string) => void
  setRepoId: (value: string) => void
  setFile: (fileId: string, filePath: string) => void
  openFileTab: (fileId: string, filePath: string) => void
  closeFileTab: (fileId: string) => void
  setContent: (value: string) => void
  setSocketConnected: (value: boolean) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  workspaceId: '',
  repoId: '',
  fileId: '',
  filePath: 'src/App.tsx',
  content: `export function AppShell() {\n  return <div>Hello from Monaco Editor</div>\n}\n`,
  socketConnected: false,
  openTabs: [],
  setWorkspaceId: (value) => set({ workspaceId: value }),
  setRepoId: (value) => set({ repoId: value, fileId: '', filePath: '', openTabs: [] }),
  setFile: (fileId, filePath) => set({ fileId, filePath }),
  openFileTab: (fileId, filePath) =>
    set((state) => {
      const alreadyOpen = state.openTabs.some((tab) => tab.fileId === fileId)

      return {
        fileId,
        filePath,
        openTabs: alreadyOpen
          ? state.openTabs
          : [...state.openTabs, { fileId, filePath }],
      }
    }),
  closeFileTab: (fileId) =>
    set((state) => {
      const nextTabs = state.openTabs.filter((tab) => tab.fileId !== fileId)
      const wasActive = state.fileId === fileId
      const fallbackTab = nextTabs[nextTabs.length - 1]

      return {
        openTabs: nextTabs,
        fileId: wasActive ? fallbackTab?.fileId ?? '' : state.fileId,
        filePath: wasActive ? fallbackTab?.filePath ?? '' : state.filePath,
      }
    }),
  setContent: (value) => set({ content: value }),
  setSocketConnected: (value) => set({ socketConnected: value }),
}))
