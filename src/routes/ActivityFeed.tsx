import { useStore } from '../lib/store'
import { fieldStr, refName } from '../lib/reducer'
import { relativeTime } from '../lib/format'
import { EmptyState } from '../components/common'

// Human-readable label for an event. The event log is the audit trail; we render
// it newest-first.
const VERB_LABEL: Record<string, string> = {
  create: 'created',
  update: 'updated',
  archive: 'archived',
  restore: 'restored',
  add: 'added',
  remove: 'removed',
}

export function ActivityFeed() {
  const { state } = useStore()
  const events = [...state.events].reverse()

  function describe(type: string, subject: string, data: Record<string, unknown> | undefined): string {
    const [entity = '', verb = ''] = type.split('.')
    const v = VERB_LABEL[verb] ?? verb
    if (entity === 'lineage') {
      const from = fieldStr(state.entities[String(data?.from ?? '')], 'name')
      const to = fieldStr(state.entities[String(data?.to ?? '')], 'name')
      return `${v} lineage ${from} → ${to}`
    }
    if (entity === 'log') return `${v} update log`
    const name =
      refName(state, subject) ||
      state.deliverables[subject]?.label ||
      state.milestones[subject]?.label ||
      state.resources[subject]?.label ||
      state.logEntries[subject]?.title ||
      ''
    return `${v} ${entity}${name ? ` · ${name}` : ''}`
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-[var(--muted)]">Every change, in order — the full audit trail.</p>
      </div>
      {events.length === 0 ? (
        <EmptyState>Nothing yet.</EmptyState>
      ) : (
        <div className="rowlist">
          {events.slice(0, 200).map((ev) => (
            <div key={ev.id} className="flex items-baseline gap-3 px-4 py-2.5">
              <span className="flex-1 text-[13.5px]">
                {describe(ev.type, ev.subject, ev.data)}
                {ev.actor?.name && <span className="text-[var(--faint)]"> · {ev.actor.name}</span>}
              </span>
              <span className="whitespace-nowrap font-mono-x text-[11px] text-[var(--faint)]">
                {relativeTime(ev.ts)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
