import type { EditorTab } from '../../../types/repository'

type EditorTabsProps = {
  tabs: EditorTab[]
  activeFileId: string
  onSelectTab: (tab: EditorTab) => void
  onCloseTab: (fileId: string) => void
}

export function EditorTabs({
  tabs,
  activeFileId,
  onSelectTab,
  onCloseTab,
}: EditorTabsProps) {
  if (tabs.length === 0) {
    return (
      <div className="border-b border-white/10 px-5 py-3 text-sm text-stone-400">
        No open files
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3">
      {tabs.map((tab) => {
        const isActive = tab.fileId === activeFileId

        return (
          <div
            key={tab.fileId}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
              isActive
                ? 'bg-amber-300 text-stone-950'
                : 'bg-white/5 text-stone-200'
            }`}
          >
            <button type="button" onClick={() => onSelectTab(tab)}>
              {tab.filePath.split('/').pop()}
            </button>
            <button
              type="button"
              onClick={() => onCloseTab(tab.fileId)}
              className={`text-xs ${isActive ? 'text-stone-700' : 'text-stone-400'}`}
            >
              x
            </button>
          </div>
        )
      })}
    </div>
  )
}
