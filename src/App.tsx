import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AtlasMark } from './components/AtlasMark'
import { Layout } from './components/Layout'
import { AppSkeleton } from './components/Skeleton'
import { useStore } from './lib/store'
import { EntityDetail } from './routes/EntityDetail'
import { EntityListPage } from './routes/EntityListPage'
import { GraphPage } from './routes/GraphPage'
import { ProjectDetail } from './routes/ProjectDetail'
import { ProjectsLayout } from './routes/ProjectsLayout'
import { SettingsPage } from './routes/SettingsPage'

/** Centered single-column page body for the non-Projects tabs. */
function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-5 py-7 sm:px-8">{children}</div>
}

export function App() {
  const { ready } = useStore()
  if (!ready) return <AppSkeleton />

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Projects tab: list + detail side by side in the body */}
        <Route element={<ProjectsLayout />}>
          <Route index element={<Home />} />
          <Route path="/p/:id" element={<ProjectDetail />} />
        </Route>
        {/* other tabs: ordinary single-column pages */}
        <Route
          path="/graph"
          element={
            <Page>
              <GraphPage />
            </Page>
          }
        />
        <Route
          path="/clients"
          element={
            <Page>
              <EntityListPage kind="client" />
            </Page>
          }
        />
        <Route
          path="/contacts"
          element={
            <Page>
              <EntityListPage kind="contact" />
            </Page>
          }
        />
        <Route
          path="/e/:id"
          element={
            <Page>
              <EntityDetail />
            </Page>
          }
        />
        <Route
          path="/settings"
          element={
            <Page>
              <SettingsPage />
            </Page>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Home() {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center text-center text-[var(--faint)]">
      <AtlasMark size={30} className="mb-3" />
      <p className="text-[15px]">Pick a project from the list, or add one with the + above.</p>
    </div>
  )
}
