import { useState } from 'react'
import { useStore } from '../lib/store'
import { entitiesOfKind, fieldStr, refName } from '../lib/reducer'
import { KINDS, type EntityKind } from '../lib/model'
import { newId } from '../lib/ids'
import { Icon } from './Icon'

/** Inline ref picker with autocomplete + a "Create …" option when nothing matches.
 *  Click the value to edit; pick an existing record or create one on the fly. */
export function RefCombobox({
  value,
  kind,
  onPick,
  placeholder = 'set',
}: {
  value: string
  kind: EntityKind
  onPick: (id: string) => void
  placeholder?: string
}) {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const [q, setQ] = useState('')
  const current = refName(state, value)

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setEditing(true)
          setQ('')
        }}
        className={`rounded px-1 -mx-1 text-left hover:bg-[var(--hover)] ${current ? '' : 'italic text-[var(--faint)]'}`}
      >
        {current || placeholder}
      </button>
    )
  }

  const query = q.trim()
  const matches = entitiesOfKind(state, kind)
    .filter((e) => !query || fieldStr(e, 'name').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6)
  const exact = matches.some((e) => fieldStr(e, 'name').toLowerCase() === query.toLowerCase())

  const close = () => setEditing(false)
  const pick = (id: string) => {
    onPick(id)
    close()
  }
  const create = () => {
    if (!query) return
    const id = newId(KINDS[kind].prefix)
    void dispatch({ type: `${kind}.create`, subject: id, data: { name: query } })
    pick(id)
  }

  return (
    <span className="relative inline-block">
      <input
        autoFocus
        value={q}
        placeholder={`Find or create ${KINDS[kind].singular.toLowerCase()}…`}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => setTimeout(close, 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
          if (e.key === 'Enter') {
            e.preventDefault()
            if (matches[0]) pick(matches[0].id)
            else if (query) create()
          }
        }}
        className="w-48 rounded-md border border-[var(--accent)] bg-[var(--bg)] px-2 py-1 text-[14px] outline-none"
      />
      <ul className="absolute left-0 top-full z-50 mt-1 max-h-60 w-56 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1 shadow-lg">
        {matches.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                pick(m.id)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--hover)]"
            >
              <Icon name={KINDS[kind].icon} size={14} className="shrink-0 text-[var(--faint)]" />
              <span className="truncate">{fieldStr(m, 'name')}</span>
            </button>
          </li>
        ))}
        {query && !exact && (
          <li>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                create()
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--accent)] hover:bg-[var(--hover)]"
            >
              <Icon name="Plus" size={14} className="shrink-0" />
              Create “{query}”
            </button>
          </li>
        )}
        {matches.length === 0 && !query && (
          <li className="px-3 py-2 text-sm text-[var(--faint)]">Type to search or create</li>
        )}
      </ul>
    </span>
  )
}
