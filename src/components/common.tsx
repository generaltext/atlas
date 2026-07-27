import type { ReactNode } from 'react'
import { type Config, statusLabel, statusTone, type Tone } from '../lib/model'
import { Icon } from './Icon'

export function toneClass(tone: Tone): string {
  return `tone-${tone}`
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`pill ${toneClass(tone)}`}>
      <span className="tick" />
      {children}
    </span>
  )
}

export function StatusPill({ statusKey, config }: { statusKey: string; config: Config }) {
  if (!statusKey) return null
  return <Pill tone={statusTone(statusKey, config)}>{statusLabel(statusKey)}</Pill>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--panel)] ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionHead({
  title,
  note,
  right,
}: {
  title: string
  note?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
      {right ?? (note ? <span className="font-mono-x text-[11px] text-[var(--faint)]">{note}</span> : null)}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>
}

export function StatTile({
  label,
  value,
  sub,
  bar,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  bar?: number
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3">
      <div className="font-mono-x text-[10.5px] uppercase tracking-wider text-[var(--faint)]">
        {label}
      </div>
      <div className="mt-1 text-[19px] font-semibold tracking-tight tnum">{value}</div>
      {sub != null && <div className="mt-0.5 font-mono-x text-[11px] text-[var(--faint)]">{sub}</div>}
      {bar != null && (
        <div className="bar mt-2.5">
          <i style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} />
        </div>
      )}
    </div>
  )
}

export function VisibleTag({ label = 'shared' }: { label?: string }) {
  return (
    <span className="eye" title="Visible on the client report">
      <Icon name="Eye" size={11} />
      {label}
    </span>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--faint)]">
      {children}
    </div>
  )
}
