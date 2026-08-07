import { useNavigate } from 'react-router-dom'

import { EmptyState } from '../components/common'
import { LineageGraph } from '../components/LineageGraph'
import { statusColorVarName } from '../lib/model'
import { entitiesOfKind, fieldStr, graphEdges, refName } from '../lib/reducer'
import { useStore } from '../lib/store'

export function GraphPage() {
  const { state, config } = useStore()
  const navigate = useNavigate()
  const projects = entitiesOfKind(state, 'project')
  const nodes = projects.map((p) => ({
    id: p.id,
    name: fieldStr(p, 'name'),
    subtitle: refName(state, fieldStr(p, 'client')),
    colorVar: statusColorVarName(config, fieldStr(p, 'status')),
  }))
  const edges = graphEdges(state)
  const nameOf = (id: string) => fieldStr(state.entities[id], 'name')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lineage</h1>
        <p className="mt-1 max-w-xl text-[var(--muted)]">
          How the work connects, derived from @mentions in each project's context. An arrow means
          “builds on”.
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState>No projects yet.</EmptyState>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <LineageGraph
            nodes={nodes}
            edges={edges}
            height={440}
            onSelect={(id) => navigate(`/p/${id}`)}
          />
        </div>
      )}

      {edges.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold">Connections</h3>
          <div className="rowlist">
            {edges.map((e) => (
              <div
                key={`${e.from}-${e.to}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-[14px]"
              >
                <button
                  className="font-medium hover:text-[var(--accent)]"
                  onClick={() => navigate(`/p/${e.from}`)}
                >
                  {nameOf(e.from)}
                </button>
                <span className="font-mono-x text-[12px] text-[var(--brass)]">· builds on →</span>
                <button
                  className="font-medium hover:text-[var(--accent)]"
                  onClick={() => navigate(`/p/${e.to}`)}
                >
                  {nameOf(e.to)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
