import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { AtlasMark } from './AtlasMark'

const pill = (active: boolean) =>
  `rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition ${
    active
      ? 'bg-[var(--panel)] text-[var(--fg)] shadow-sm'
      : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]'
  }`

export function Layout() {
  const { pathname } = useLocation()
  // "Projects" owns both the list (/) and a selected project (/p/:id).
  const projectsActive = pathname === '/' || pathname.startsWith('/p/')

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-4 backdrop-blur sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--fg)] text-[var(--bg)]">
            <AtlasMark size={16} />
          </div>
          <span className="text-[14.5px] font-semibold">Atlas</span>
        </Link>

        <nav className="ml-3 flex items-center gap-1">
          <Link to="/" className={pill(projectsActive)}>
            Projects
          </Link>
          <NavLink to="/graph" className={({ isActive }) => pill(isActive)}>
            Graph
          </NavLink>
          <NavLink to="/clients" className={({ isActive }) => pill(isActive)}>
            Clients
          </NavLink>
          <NavLink to="/contacts" className={({ isActive }) => pill(isActive)}>
            Contacts
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => pill(isActive)}>
            Settings
          </NavLink>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
