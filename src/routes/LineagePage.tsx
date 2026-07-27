import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { edgesOf, entitiesOfKind, fieldStr } from '../lib/reducer'
import { LineageGraph } from '../components/LineageGraph'
import { VisibleTag } from '../components/common'

export function LineagePage() {
  const { state } = useStore()
  const navigate = useNavigate()
  const nodes = entitiesOfKind(state, 'project', true).map((p) => ({
    id: p.id,
    name: fieldStr(p, 'name'),
    period: fieldStr(p, 'period'),
    status: fieldStr(p, 'status'),
  }))
  const edges = edgesOf(state)

  const nameOf = (id: string) => fieldStr(state.entities[id], 'name')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lineage</h1>
        <p className="mt-1 max-w-2xl text-[var(--muted)]">
          How the work connects — what each project grew from, and what it made possible. You curate
          these edges; the ones marked shared appear on client reports.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
        <LineageGraph
          nodes={nodes}
          edges={edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind }))}
          mode="internal"
          height={380}
          onSelect={(id) => navigate(`/p/${id}`)}
        />
      </div>

      <div>
        <h3 className="mb-2 text-[13px] font-semibold">Connections</h3>
        <div className="rowlist">
          {edges.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-[14px]">
              <button className="font-medium hover:text-[var(--accent)]" onClick={() => navigate(`/p/${e.from}`)}>
                {nameOf(e.from)}
              </button>
              <span className="font-mono-x text-[12px] text-[var(--brass)]">— {e.kind} →</span>
              <button className="font-medium hover:text-[var(--accent)]" onClick={() => navigate(`/p/${e.to}`)}>
                {nameOf(e.to)}
              </button>
              {e.clientVisible && (
                <span className="ml-auto">
                  <VisibleTag />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
