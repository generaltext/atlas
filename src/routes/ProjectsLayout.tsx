import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useStore } from '../lib/store'
import { entitiesOfKind, fieldStr, refName } from '../lib/reducer'
import { ProjectCard } from '../components/ProjectCard'
import { useCreate } from '../components/useCreate'
import { Icon } from '../components/Icon'

type Sort = 'created-desc' | 'created-asc' | 'name' | 'updated'
const SORTS: { key: Sort; label: string }[] = [
  { key: 'created-desc', label: 'Newest' },
  { key: 'created-asc', label: 'Oldest' },
  { key: 'name', label: 'Name' },
  { key: 'updated', label: 'Updated' },
]

// The Projects tab body: the project list and the selected project side by side
// (the mockup's split), centered as a unit. The list has its own sort + filter and
// scrolls independently; the content uses the window scroll.
export function ProjectsLayout() {
  const { state } = useStore()
  const create = useCreate()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>(() => {
    const s = typeof localStorage !== 'undefined' ? localStorage.getItem('atlas.projects.sort') : null
    return s === 'created-asc' || s === 'name' || s === 'updated' ? s : 'created-desc'
  })
  const changeSort = (s: Sort) => {
    setSort(s)
    try {
      localStorage.setItem('atlas.projects.sort', s)
    } catch {
      /* ignore */
    }
  }

  const projects = entitiesOfKind(state, 'project')
  const sorted = [...projects].sort((a, b) => {
    if (sort === 'name') return fieldStr(a, 'name').localeCompare(fieldStr(b, 'name'))
    if (sort === 'updated') return a.updatedAt < b.updatedAt ? 1 : -1
    if (sort === 'created-asc') return a.createdAt < b.createdAt ? -1 : 1
    return a.createdAt < b.createdAt ? 1 : -1 // created-desc (newest first)
  })
  const q = query.trim().toLowerCase()
  const list = q
    ? sorted.filter(
        (p) =>
          fieldStr(p, 'name').toLowerCase().includes(q) ||
          refName(state, fieldStr(p, 'client')).toLowerCase().includes(q),
      )
    : sorted

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col sm:flex-row">
      <aside className="flex max-h-[46vh] shrink-0 flex-col border-b border-[var(--border)] sm:sticky sm:top-14 sm:h-[calc(100vh-3.5rem)] sm:max-h-none sm:w-64 sm:self-start sm:border-b-0">
        {/* pinned controls — the list below scrolls, these don't */}
        <div className="shrink-0 px-3 pt-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="eyebrow">Projects</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => create('project')}
                title="New project"
                className="grid h-6 w-6 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
              >
                <Icon name="Plus" size={15} />
              </button>
              <select
                value={sort}
                onChange={(e) => changeSort(e.target.value as Sort)}
                title="Sort projects"
                className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-1.5 py-0.5 font-mono-x text-[11px] text-[var(--muted)] outline-none focus:border-[var(--accent)]"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="relative mb-2">
            <Icon
              name="Search"
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--faint)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1.5 pl-7 pr-2 text-[13px] outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {list.length === 0 ? (
            <div className="px-1 py-3 text-[13px] text-[var(--faint)]">
              {projects.length === 0 ? 'No projects yet.' : 'No matches.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {list.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="max-w-4xl px-5 py-7 sm:px-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
