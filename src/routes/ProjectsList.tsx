import { useStore } from '../lib/store'
import { entitiesOfKind } from '../lib/reducer'
import { ProjectRow } from '../components/ProjectRow'
import { EmptyState } from '../components/common'
import { Button } from '../components/ui'
import { useCreate } from '../components/useCreate'
import { Icon } from '../components/Icon'

export function ProjectsList() {
  const { state } = useStore()
  const create = useCreate()
  const projects = entitiesOfKind(state, 'project')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-[var(--muted)]">{projects.length} projects across all clients.</p>
        </div>
        <Button onClick={() => create('project')}>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="Plus" size={15} /> New project
          </span>
        </Button>
      </div>
      {projects.length === 0 ? (
        <EmptyState>No projects yet. Create your first one.</EmptyState>
      ) : (
        <div className="rowlist">
          {projects.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}
