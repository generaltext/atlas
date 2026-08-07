import { NavLink } from 'react-router-dom'

import { statusColorVarName, statusLabel } from '../lib/model'
import { fieldStr, refName, type EntityRecord } from '../lib/reducer'
import { useStore } from '../lib/store'

/** A project in the always-visible list. One status cue — a quiet word in the
 *  subline — so the title gets the full width. Highlights when it's the one being
 *  viewed (NavLink active). */
export function ProjectCard({ project }: { project: EntityRecord }) {
  const { state, config } = useStore()
  const id = project.id
  const client = refName(state, fieldStr(project, 'client'))
  const status = fieldStr(project, 'status')

  return (
    <NavLink
      to={`/p/${id}`}
      className={({ isActive }) =>
        `block rounded-xl border bg-[var(--panel)] px-3 py-2.5 transition ${
          isActive
            ? 'border-[var(--accent)] shadow-[var(--shadow)]'
            : 'border-[var(--border)] hover:border-[var(--marine-dim)]'
        }`
      }
    >
      <div className="text-[14px] leading-snug font-semibold text-pretty">
        {fieldStr(project, 'name') || 'Untitled'}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2 text-[12px] text-[var(--muted)]">
        <span className="min-w-0 flex-1 truncate">{client ? `for ${client}` : 'no client'}</span>
        {status && (
          <span
            className="font-mono-x shrink-0 text-[10px] tracking-[0.06em] uppercase"
            style={{ color: `var(${statusColorVarName(config, status)})` }}
          >
            {statusLabel(config, status)}
          </span>
        )}
      </div>
    </NavLink>
  )
}
