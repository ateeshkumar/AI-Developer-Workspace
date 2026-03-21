type StatusPillProps = {
  label: string
  tone?: 'emerald' | 'sky' | 'stone'
}

const toneClassMap: Record<NonNullable<StatusPillProps['tone']>, string> = {
  emerald: 'bg-emerald-400/15 text-emerald-300',
  sky: 'bg-sky-400/15 text-sky-300',
  stone: 'bg-white/5 text-stone-200',
}

export function StatusPill({
  label,
  tone = 'stone',
}: StatusPillProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${toneClassMap[tone]}`}
    >
      {label}
    </span>
  )
}
