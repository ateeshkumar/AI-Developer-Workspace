import Editor from '@monaco-editor/react'
import { EditorTabs } from './editor-tabs'
import type { EditorTab } from '../../../types/repository'

const languageByExtension: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  html: 'html',
  css: 'css',
  md: 'markdown',
  py: 'python',
  java: 'java',
  go: 'go',
  rs: 'rust',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'shell',
}

const getEditorLanguage = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  return languageByExtension[extension] ?? 'plaintext'
}

type EditorWorkspaceProps = {
  accessToken: string
  fileId: string
  filePath: string
  content: string
  tabs: EditorTab[]
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  onSelectTab: (tab: EditorTab) => void
  onCloseTab: (fileId: string) => void
  onChange: (value: string) => void
}

export function EditorWorkspace({
  accessToken,
  fileId,
  filePath,
  content,
  tabs,
  saveState,
  onSelectTab,
  onCloseTab,
  onChange,
}: EditorWorkspaceProps) {
  return (
    <section className="grid min-h-[720px] grid-rows-[auto_1fr] overflow-hidden rounded-[2rem] border border-black/10 bg-[#191611] shadow-[0_25px_60px_rgba(35,27,14,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-stone-100">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-300/70">
            Monaco Workspace
          </div>
          <div className="mt-1 font-medium">{filePath}</div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {accessToken ? 'Authenticated' : 'No token'}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            File {fileId || 'pending'}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 capitalize">
            {saveState}
          </span>
        </div>
      </div>

      <EditorTabs
        tabs={tabs}
        activeFileId={fileId}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
      />

      <Editor
        key={fileId || filePath}
        height="100%"
        path={filePath}
        defaultLanguage={getEditorLanguage(filePath)}
        language={getEditorLanguage(filePath)}
        theme="vs-dark"
        value={content}
        onChange={(value) => onChange(value ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          padding: { top: 18 },
          smoothScrolling: true,
        }}
      />
    </section>
  )
}
