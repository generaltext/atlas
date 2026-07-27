import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './lib/store'
import { Layout } from './components/Layout'
import { AppSkeleton } from './components/Skeleton'
import { Dashboard } from './routes/Dashboard'
import { ProjectsList } from './routes/ProjectsList'
import { ProjectDetail } from './routes/ProjectDetail'
import { ClientReport } from './routes/ClientReport'
import { EntityListPage } from './routes/EntityListPage'
import { EntityDetail } from './routes/EntityDetail'
import { LineagePage } from './routes/LineagePage'
import { Suggestions } from './routes/Suggestions'
import { ActivityFeed } from './routes/ActivityFeed'

export function App() {
  const { ready } = useStore()
  if (!ready) return <AppSkeleton />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route path="/p/:id" element={<ProjectDetail />} />
        <Route path="/p/:id/report" element={<ClientReport />} />
        <Route path="/clients" element={<EntityListPage kind="client" />} />
        <Route path="/contacts" element={<EntityListPage kind="contact" />} />
        <Route path="/contracts" element={<EntityListPage kind="contract" />} />
        <Route path="/e/:id" element={<EntityDetail />} />
        <Route path="/lineage" element={<LineagePage />} />
        <Route path="/inbox" element={<Suggestions />} />
        <Route path="/activity" element={<ActivityFeed />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
