export function AppSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--faint)]">
      <div className="flex items-center gap-2 font-mono-x text-sm">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
        Loading Atlas…
      </div>
    </div>
  )
}
