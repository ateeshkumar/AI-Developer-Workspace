import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'])

const getDataUrlMimeType = (content: string) => {
  const match = content.match(/^data:([^;]+);base64,/)
  return match?.[1]?.toLowerCase() ?? ''
}

const getFileKind = (path: string, content: string) => {
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  const mimeType = content.startsWith('data:') ? getDataUrlMimeType(content) : ''

  if (imageExtensions.has(extension) || mimeType.startsWith('image/')) {
    return 'image'
  }

  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf'
  }

  if (extension === 'md' || extension === 'markdown') {
    return 'markdown'
  }

  if (content.startsWith('data:')) {
    return 'binary'
  }

  return 'text'
}

type EditorWorkspaceProps = {
  accessToken: string
  fileId: string
  filePath: string
  content: string
  tabs: EditorTab[]
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  role: 'ADMIN' | 'EDITOR' | 'VIEWER' | null
  isEditable: boolean
  lockOwnerName: string | null
  currentUserOwnsLock: boolean
  lockActionPending: boolean
  presenceUsers: Array<{
    id: string
    name: string
    email: string
  }>
  onAcquireLock: () => void
  onReleaseLock: () => void
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
  role,
  isEditable,
  lockOwnerName,
  currentUserOwnsLock,
  lockActionPending,
  presenceUsers,
  onAcquireLock,
  onReleaseLock,
  onSelectTab,
  onCloseTab,
  onChange,
}: EditorWorkspaceProps) {
  const fileKind = getFileKind(filePath, content)
  const isBinaryViewer = fileKind === 'image' || fileKind === 'pdf' || fileKind === 'binary'

  const renderEditor = () => {
    if (!fileId) {
      return (
        <div className="flex h-full items-center justify-center p-10 text-center text-sm text-stone-400">
          Choose a file from the repository tree to open it here.
        </div>
      )
    }

    if (fileKind === 'image') {
      return (
        <div className="flex h-full items-center justify-center bg-[#120f0c] p-6">
          <img
            src={content}
            alt={filePath}
            className="max-h-full max-w-full rounded-2xl border border-white/10 bg-white p-2 shadow-2xl"
          />
        </div>
      )
    }

    if (fileKind === 'pdf') {
      return <iframe title={filePath} src={content} className="h-full w-full bg-white" />
    }

    if (fileKind === 'binary') {
      return (
        <div className="flex h-full items-center justify-center p-10 text-center text-sm text-stone-400">
          This file is stored as binary content and is not editable in the inline workspace yet.
        </div>
      )
    }

    if (fileKind === 'markdown') {
      return (
        <div className="grid h-full min-h-0 lg:grid-cols-2">
          <Editor
            key={fileId || filePath}
            height="100%"
            path={filePath}
            defaultLanguage="markdown"
            language="markdown"
            theme="vs-dark"
            value={content}
            onChange={(value) => onChange(value ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              padding: { top: 18 },
              smoothScrolling: true,
              readOnly: !isEditable,
            }}
          />
          <div className="overflow-y-auto border-t border-white/10 bg-[#120f0c] px-6 py-5 text-stone-200 lg:border-l lg:border-t-0">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-300/70">Preview</div>
            <article className="prose prose-invert mt-4 max-w-none prose-pre:rounded-2xl prose-pre:bg-black/40">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || '*Nothing to preview yet.*'}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      )
    }

    return (
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
          readOnly: !isEditable,
        }}
      />
    )
  }

  return (
    <section className="grid min-h-[720px] grid-rows-[auto_1fr] overflow-hidden rounded-[2rem] border border-black/10 bg-[#191611] shadow-[0_25px_60px_rgba(35,27,14,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-stone-100">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-300/70">
            Repository Workspace
          </div>
          <div className="mt-1 font-medium">{filePath}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {accessToken ? 'Authenticated' : 'No token'}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            File {fileId || 'pending'}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Role {role ?? 'unknown'}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {isBinaryViewer ? `Viewer: ${fileKind}` : isEditable ? 'Editable' : 'Read only'}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 capitalize">
            {saveState}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {presenceUsers.length} active
          </span>
          {fileId && !isBinaryViewer && role !== 'VIEWER' ? (
            currentUserOwnsLock ? (
              <button
                type="button"
                onClick={onReleaseLock}
                disabled={lockActionPending}
                className="rounded-full border border-emerald-300/40 bg-emerald-300/12 px-3 py-1 font-semibold text-emerald-100 disabled:opacity-60"
              >
                Release lock
              </button>
            ) : (
              <button
                type="button"
                onClick={onAcquireLock}
                disabled={lockActionPending || Boolean(lockOwnerName)}
                className="rounded-full border border-cyan-300/40 bg-cyan-300/12 px-3 py-1 font-semibold text-cyan-100 disabled:opacity-60"
              >
                {lockOwnerName ? `Locked by ${lockOwnerName}` : 'Lock to edit'}
              </button>
            )
          ) : null}
        </div>
      </div>

      <EditorTabs
        tabs={tabs}
        activeFileId={fileId}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
      />

      <div className="grid min-h-0 grid-rows-[auto_1fr]">
        {fileId ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/10 px-5 py-3 text-xs text-stone-300">
            {lockOwnerName ? (
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-amber-100">
                Lock owner: {lockOwnerName}
              </span>
            ) : (
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-emerald-100">
                No active lock
              </span>
            )}
            {presenceUsers.map((user) => (
              <span
                key={user.id}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
              >
                {user.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="min-h-0">{renderEditor()}</div>
      </div>
    </section>
  )
}
