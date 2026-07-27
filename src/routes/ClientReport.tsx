import { Link, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import {
  childrenOf,
  deliverablesForProject,
  edgesOf,
  entitiesOfKind,
  fieldNum,
  fieldStr,
  milestonesForProject,
  parentsOf,
  refName,
  resourcesForProject,
} from '../lib/reducer'
import { RESOURCE_ICONS } from '../lib/model'
import { Icon } from '../components/Icon'
import { LineageGraph } from '../components/LineageGraph'

export function ClientReport() {
  const { id = '' } = useParams()
  const { state } = useStore()
  const project = state.entities[id]

  if (!project || project.kind !== 'project') {
    return (
      <div className="text-[var(--muted)]">
        Project not found. <Link className="text-[var(--accent)]" to="/projects">Back</Link>
      </div>
    )
  }

  const client = refName(state, fieldStr(project, 'client'))
  const deliverables = deliverablesForProject(state, id).filter((d) => d.clientVisible)
  const milestones = milestonesForProject(state, id).filter((m) => m.clientVisible)
  const resources = resourcesForProject(state, id).filter((r) => r.clientVisible)
  const done = deliverables.filter((d) => d.status === 'done').length
  const nowItem =
    deliverables.find((d) => d.status === 'now')?.label ??
    milestones.find((m) => m.status === 'next')?.label ??
    '—'

  const nodes = entitiesOfKind(state, 'project', true).map((p) => ({
    id: p.id,
    name: fieldStr(p, 'name'),
    period: fieldStr(p, 'period'),
    status: fieldStr(p, 'status'),
  }))
  const edges = edgesOf(state)
    .filter((e) => e.clientVisible)
    .map((e) => ({ from: e.from, to: e.to, kind: e.kind }))

  const parents = parentsOf(state, id).filter((e) => e.clientVisible).map((e) => fieldStr(state.entities[e.from], 'name')).filter(Boolean)
  const children = childrenOf(state, id).filter((e) => e.clientVisible).map((e) => fieldStr(state.entities[e.to], 'name')).filter(Boolean)
  const name = fieldStr(project, 'name')

  return (
    <div>
      {/* preview banner (internal only — not part of the shared page) */}
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 font-mono-x text-[12px] text-[var(--muted)]">
        <Icon name="Eye" size={15} className="mt-0.5 shrink-0 text-[var(--brass)]" />
        <span>
          <b className="text-[var(--fg)]">Preview of the shared living report.</b> This is what a
          client sees from a link — no login, read-only, only the items you marked shared.{' '}
          <Link to={`/p/${id}`} className="text-[var(--accent)] hover:underline">
            ← back to the internal view
          </Link>
        </span>
      </div>

      <article className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-2">
          <div className="flex items-center gap-2 font-mono-x text-[12px] text-[var(--muted)]">
            <span className="grid h-5 w-5 place-items-center rounded bg-[var(--fg)] text-[var(--bg)]">
              <Icon name="Waypoints" size={12} />
            </span>
            Prepared with Atlas
          </div>
          <div className="flex items-center gap-2 font-mono-x text-[12px] text-[var(--good)]">
            <span className="beacon">
              <i className="ring" />
              <i />
            </span>
            Updates automatically
          </div>
        </div>

        <div className="eyebrow mt-6">Living project report</div>
        <h1 className="font-serif-x mt-2 text-[clamp(32px,6vw,46px)] font-semibold leading-[1.05] tracking-tight">
          {name}
        </h1>
        {fieldStr(project, 'summary') && (
          <p className="font-serif-x mt-3 max-w-[60ch] text-[19px] leading-relaxed text-[var(--muted)]">
            {fieldStr(project, 'summary')}
          </p>
        )}
        <div className="mt-5 font-mono-x text-[12px] tracking-wide text-[var(--faint)]">
          Prepared for <b className="text-[var(--fg)]">{client || '—'}</b> · {fieldStr(project, 'period')}
        </div>

        {/* glance */}
        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
          <Glance k="Progress" v={`${fieldNum(project, 'progress')}%`} sub="of timeline" />
          <Glance k="Delivered" v={String(done)} sub={`of ${deliverables.length} deliverables`} />
          <Glance k="Now underway" v={nowItem} small />
        </div>

        {/* where things stand */}
        {milestones.length > 0 && (
          <Section title="Where things stand" sub="A running account of the work, kept current as it happens.">
            <ol className="flex flex-col">
              {milestones.map((m, i) => {
                const dot = m.status === 'done' ? 'var(--good)' : m.status === 'next' ? 'var(--accent)' : 'var(--faint)'
                return (
                  <li key={m.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span
                        className="z-10 h-3.5 w-3.5 rounded-full border-2"
                        style={{ background: m.status === 'done' ? dot : 'var(--panel)', borderColor: dot }}
                      />
                      {i < milestones.length - 1 && <span className="w-px flex-1 bg-[var(--border)]" />}
                    </div>
                    <div className="-mt-0.5">
                      <div className="font-mono-x text-[11.5px] text-[var(--faint)]">{m.when}</div>
                      <div className="text-[15.5px] font-semibold">{m.label}</div>
                      {m.desc && <div className="mt-0.5 text-[14px] text-[var(--muted)]">{m.desc}</div>}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Section>
        )}

        {/* deliverables */}
        {deliverables.length > 0 && (
          <Section title="Deliverables" sub="What we agreed to hand off, and where each one is.">
            <div className="rowlist">
              {deliverables.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      background: d.status === 'done' ? 'var(--good)' : d.status === 'now' ? 'var(--accent)' : 'transparent',
                      border: d.status === 'todo' ? '2px solid var(--faint)' : 'none',
                    }}
                  />
                  <span className={`flex-1 text-[14.5px] ${d.status === 'done' ? 'text-[var(--muted)]' : ''}`}>
                    {d.label}
                  </span>
                  <span className="font-mono-x text-[11.5px] text-[var(--faint)]">
                    {d.status === 'done' ? `delivered ${d.due}` : d.status === 'now' ? 'in progress' : `planned · ${d.due}`}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* resources */}
        {resources.length > 0 && (
          <Section title="Resources & files" sub="Links to the delivered work and its living pieces.">
            <div className="grid gap-2 sm:grid-cols-2">
              {resources.map((r) => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 transition hover:border-[var(--accent)]"
                >
                  <Icon name={RESOURCE_ICONS[r.type] ?? 'Link'} size={16} className="shrink-0 text-[var(--faint)]" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{r.label}</span>
                  <Icon name="ExternalLink" size={13} className="shrink-0 text-[var(--faint)]" />
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* how this work grew */}
        {(parents.length > 0 || children.length > 0) && (
          <Section title="How this work grew" sub="Your project isn't an island. Here's the lineage — what it grew from, and what it has since made possible.">
            <LineageGraph nodes={nodes} edges={edges} focusId={id} mode="client" height={280} />
            <div className="font-serif-x mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-5 py-4 text-[16.5px] leading-relaxed">
              {parents.length > 0 && (
                <>
                  {name} grew from{' '}
                  <b className="text-[var(--brass)]">{joinNames(parents)}</b>.{' '}
                </>
              )}
              {children.length > 0 && (
                <>
                  Since then, this work has gone on to inform{' '}
                  <b className="text-[var(--accent)]">{joinNames(children)}</b>.
                </>
              )}
            </div>
          </Section>
        )}

        <div className="mt-11 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5 font-mono-x text-[12px] text-[var(--faint)]">
          <span className="text-[var(--accent)]">reports.example.com/{name.toLowerCase().replace(/\s+/g, '-')}</span>
          <span className="inline-flex items-center gap-1.5">🔒 end-to-end encrypted · read-only · no account needed</span>
        </div>
      </article>
    </div>
  )
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function Glance({ k, v, sub, small }: { k: string; v: string; sub?: string; small?: boolean }) {
  return (
    <div className="bg-[var(--panel)] px-4 py-4">
      <div className="font-mono-x text-[10.5px] uppercase tracking-wider text-[var(--faint)]">{k}</div>
      <div className={`font-serif-x mt-1.5 ${small ? 'text-[19px]' : 'text-[26px]'}`}>{v}</div>
      {sub && <div className="mt-0.5 text-[13px] text-[var(--muted)]">{sub}</div>}
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif-x text-[23px] font-semibold">{title}</h2>
      {sub && <p className="mb-4 mt-1 max-w-[62ch] text-[var(--muted)]">{sub}</p>}
      {children}
    </section>
  )
}
