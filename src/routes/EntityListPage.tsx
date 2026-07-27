import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { entitiesOfKind, fieldStr, refName } from '../lib/reducer'
import { KINDS, statusLabel, type EntityKind } from '../lib/model'
import { formatMoney } from '../lib/format'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/common'
import { Button } from '../components/ui'
import { useCreate } from '../components/useCreate'

export function EntityListPage({ kind }: { kind: EntityKind }) {
  const { state } = useStore()
  const create = useCreate()
  const def = KINDS[kind]
  const rows = entitiesOfKind(state, kind)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{def.plural}</h1>
          <p className="mt-1 text-[var(--muted)]">
            {rows.length} {rows.length === 1 ? def.singular.toLowerCase() : def.plural.toLowerCase()}.
          </p>
        </div>
        <Button onClick={() => create(kind)}>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="Plus" size={15} /> New {def.singular.toLowerCase()}
          </span>
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState>No {def.plural.toLowerCase()} yet.</EmptyState>
      ) : (
        <div className="rowlist">
          {rows.map((r) => (
            <Link
              key={r.id}
              to={`/e/${r.id}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--hover)]"
            >
              <Icon name={def.icon} size={16} className="shrink-0 text-[var(--faint)]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-semibold">
                  {fieldStr(r, 'name') || fieldStr(r, 'title') || 'Untitled'}
                </div>
                <div className="truncate text-[12.5px] text-[var(--muted)]">
                  {secondary(kind, r, state)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function secondary(
  kind: EntityKind,
  r: import('../lib/reducer').EntityRecord,
  state: import('../lib/reducer').State,
): string {
  if (kind === 'client') return [fieldStr(r, 'location'), fieldStr(r, 'website')].filter(Boolean).join(' · ')
  if (kind === 'contact')
    return [fieldStr(r, 'role'), refName(state, fieldStr(r, 'client'))].filter(Boolean).join(' · ')
  if (kind === 'contract')
    return [
      refName(state, fieldStr(r, 'client')),
      formatMoney(fieldStr(r, 'value')),
      statusLabel(fieldStr(r, 'status')),
    ]
      .filter(Boolean)
      .join(' · ')
  return ''
}
