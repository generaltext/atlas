import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { entitiesOfKind, fieldNum, fieldStr, recentLog, refName } from '../lib/reducer'
import { StatTile, SectionHead, VisibleTag } from '../components/common'
import { Icon } from '../components/Icon'

export function Dashboard() {
  const { state } = useStore()
  const navigate = useNavigate()
  const projects = entitiesOfKind(state, 'project')
  const active = projects.filter((p) => {
    const s = fieldStr(p, 'status')
    return s === 'active' || s === 'risk'
  })
  const atRisk = projects.filter((p) => fieldStr(p, 'status') === 'risk')
  const totalValue = projects.reduce((sum, p) => sum + fieldNum(p, 'value'), 0)
  const commits = Object.values(state.logEntries).reduce((s, l) => s + l.commits, 0)
  const recent = recentLog(state, 6)

  const projName = (id: string) => fieldStr(state.entities[id], 'name')

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-[var(--muted)]">Every engagement, and how the work connects.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Active engagements"
          value={active.length}
          sub={`of ${projects.length} tracked`}
        />
        <StatTile label="Contracted value" value={`$${(totalValue / 1000).toFixed(1)}k`} sub="live contracts" />
        <StatTile label="Commits ingested" value={commits.toLocaleString()} sub="auto-summarized" />
        <StatTile
          label="Needs attention"
          value={atRisk.length}
          sub={atRisk.length ? atRisk.map((p) => fieldStr(p, 'name')).join(', ') : 'all on track'}
        />
      </div>

      <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div>
          <SectionHead
            title="Projects"
            right={
              <button
                onClick={() => navigate('/projects')}
                className="font-mono-x text-[11px] text-[var(--accent)] hover:underline"
              >
                view all →
              </button>
            }
          />
          <div className="rowlist">
            {active.map((p) => (
              <ProjectMini key={p.id} id={p.id} />
            ))}
          </div>
        </div>

        <div>
          <SectionHead title="Recent activity" note="auto-written from git" />
          <div className="flex flex-col gap-3">
            {recent.map((l) => (
              <div key={l.id} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-x text-[11px] text-[var(--faint)]">
                    <span className="text-[var(--accent)]">{l.hash || '·'}</span> · {l.at}
                  </span>
                  {l.clientVisible && <VisibleTag />}
                </div>
                <div className="mt-1 text-[13.5px] font-medium leading-snug">{l.title}</div>
                <div className="mt-1 font-mono-x text-[11px] text-[var(--faint)]">
                  {projName(l.projectId)} · {l.commits} commits · {l.repo}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectMini({ id }: { id: string }) {
  const { state, config } = useStore()
  const navigate = useNavigate()
  const p = state.entities[id]
  if (!p) return null
  const status = fieldStr(p, 'status')
  const tone =
    status === 'active' ? 'good' : status === 'risk' ? 'warn' : status === 'completed' ? 'info' : 'muted'
  void config
  return (
    <button
      onClick={() => navigate(`/p/${id}`)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--hover)]"
    >
      <Icon name="FolderGit2" size={16} className="shrink-0 text-[var(--faint)]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{fieldStr(p, 'name')}</div>
        <div className="truncate text-[12px] text-[var(--muted)]">
          {refName(state, fieldStr(p, 'client')) || '—'}
        </div>
      </div>
      <span className={`pill tone-${tone}`}>
        <span className="tick" />
        {fieldNum(p, 'progress')}%
      </span>
    </button>
  )
}
