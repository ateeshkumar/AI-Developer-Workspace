type SkeletonProps = {
  className?: string
}

export function Skeleton({
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse-soft rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 ${className}`}
    />
  )
}
