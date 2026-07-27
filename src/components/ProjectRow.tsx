import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import {
  deliverableStats,
  fieldNum,
  fieldStr,
  nextMilestone,
  refName,
  type EntityRecord,
} from '../lib/reducer'
import { formatMoney } from '../lib/format'
import { StatusPill } from './common'

export function ProjectRow({ project }: { project: EntityRecord }) {
  const { state, config } = useStore()
  const navigate = useNavigate()
  const id = project.id
  const client = refName(state, fieldStr(project, 'client'))
  const value = fieldStr(project, 'value')
  const progress = fieldNum(project, 'progress')
  const stats = deliverableStats(state, id)
  const next = nextMilestone(state, id)

  return (
    <button
      onClick={() => navigate(`/p/${id}`)}
      className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition hover:bg-[var(--hover)]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold">{fieldStr(project, 'name')}</span>
          {project.archived && <span className="badge-archived">archived</span>}
        </div>
        <div className="mt-0.5 truncate text-[12.5px] text-[var(--muted)]">
          {client || '—'}
          {value ? ` · ${formatMoney(value)}` : ''}
        </div>
      </div>
      <div className="row-start-1 flex flex-col items-end gap-1.5">
        <StatusPill statusKey={fieldStr(project, 'status')} config={config} />
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono-x text-[11px] text-[var(--faint)]">
        <span className="flex items-center gap-2">
          <span className="inline-block h-1 w-20 overflow-hidden rounded bg-[var(--border)]">
            <span
              className="block h-full rounded bg-[var(--accent)]"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </span>
          {progress}%
        </span>
        <span className="tnum">
          {stats.done}/{stats.total} deliverables
        </span>
        {next && (
          <span className="truncate">
            next: {next.label} · {next.when}
          </span>
        )}
      </div>
    </button>
  )
}
