type TabsProps<T extends string> = {
  tabs: Array<{ id: T; label: string }>
  activeTab: T
  onChange: (tab: T) => void
}

export function Tabs<T extends string>({ tabs, activeTab, onChange }: TabsProps<T>) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === tab.id
              ? 'bg-cyan-300 text-slate-950'
              : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
