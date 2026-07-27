import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../lib/store'
import { pendingSuggestions } from '../lib/reducer'
import { Icon } from './Icon'

const NAV: { to: string; label: string; icon: string }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/projects', label: 'Projects', icon: 'FolderGit2' },
  { to: '/lineage', label: 'Lineage', icon: 'Waypoints' },
  { to: '/inbox', label: 'Suggestions', icon: 'Milestone' },
  { to: '/clients', label: 'Clients', icon: 'Building2' },
  { to: '/contacts', label: 'Contacts', icon: 'Users' },
  { to: '/contracts', label: 'Contracts', icon: 'FileText' },
  { to: '/activity', label: 'Activity', icon: 'Activity' },
]

export function Layout() {
  const { connected, state } = useStore()
  const pendingCount = pendingSuggestions(state).length
  return (
    <div className="flex h-full flex-col bg-[var(--bg)] text-[var(--fg)] sm:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-[var(--border)] bg-[var(--panel-2)] sm:w-56 sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--fg)] text-[var(--bg)]">
            <Icon name="Waypoints" size={17} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold">Atlas</div>
            <div className="font-mono-x text-[10.5px] text-[var(--faint)]">General Text</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:flex-col sm:overflow-visible sm:pb-0">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-medium transition ${
                  isActive
                    ? 'bg-[var(--panel)] text-[var(--fg)] shadow-sm'
                    : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]'
                }`
              }
            >
              <Icon name={n.icon} size={16} />
              {n.label}
              {n.to === '/inbox' && pendingCount > 0 && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[var(--brass)] px-1.5 font-mono-x text-[10px] font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden items-center gap-2 px-4 py-3 font-mono-x text-[11px] text-[var(--faint)] sm:flex">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: connected ? 'var(--good)' : 'var(--faint)' }}
          />
          {connected ? 'synced' : 'offline'}
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
