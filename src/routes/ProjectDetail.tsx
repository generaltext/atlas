import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import {
  deliverableStats,
  edgesOf,
  entitiesOfKind,
  fieldNum,
  fieldStr,
  nextMilestone,
  pendingSuggestionsForProject,
} from '../lib/reducer'
import { PROJECT_STATUSES } from '../lib/model'
import { Icon } from '../components/Icon'
import { StatTile, SectionHead, StatusPill } from '../components/common'
import { EditableSelect, EditableText, ConfirmDelete } from '../components/ui'
import {
  DeliverablesEditor,
  LineageEditor,
  LogEditor,
  MilestonesEditor,
  ResourcesEditor,
} from '../components/editors'
import { LineageGraph } from '../components/LineageGraph'

export function ProjectDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { state, config, dispatch } = useStore()
  const project = state.entities[id]

  if (!project || project.kind !== 'project') {
    return (
      <div className="text-[var(--muted)]">
        Project not found. <Link className="text-[var(--accent)]" to="/projects">Back to projects</Link>
      </div>
    )
  }

  const upd = (key: string, val: string | number) =>
    dispatch({ type: 'project.update', subject: id, data: { [key]: val } })

  const clientId = fieldStr(project, 'client')
  const stats = deliverableStats(state, id)
  const next = nextMilestone(state, id)
  const contacts = entitiesOfKind(state, 'contact').filter((c) => fieldStr(c, 'client') === clientId)
  const clients = entitiesOfKind(state, 'client')
  const pending = pendingSuggestionsForProject(state, id)

  const nodes = entitiesOfKind(state, 'project', true).map((p) => ({
    id: p.id,
    name: fieldStr(p, 'name'),
    period: fieldStr(p, 'period'),
    status: fieldStr(p, 'status'),
  }))
  const edges = edgesOf(state).map((e) => ({ from: e.from, to: e.to, kind: e.kind }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Link to="/projects" className="inline-flex items-center gap-1 font-mono-x text-[12px] text-[var(--faint)] hover:text-[var(--fg)]">
            <Icon name="ChevronLeft" size={14} /> Projects
          </Link>
          <ConfirmDelete title="Archive project" onConfirm={() => { dispatch({ type: 'project.archive', subject: id }); navigate('/projects') }} />
        </div>

        <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
          <div className="min-w-0 flex-1">
            <EditableText value={fieldStr(project, 'type')} onSave={(v) => upd('type', v)} placeholder="Project type" className="eyebrow" />
            <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight">
              <EditableText value={fieldStr(project, 'name')} onSave={(v) => upd('name', v)} placeholder="Untitled project" />
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--muted)]">
              <span>for</span>
              <EditableSelect value={clientId} options={clients.map((c) => ({ key: c.id, label: fieldStr(c, 'name') }))} onSave={(v) => upd('client', v)} />
              <span>·</span>
              <EditableText value={fieldStr(project, 'period')} onSave={(v) => upd('period', v)} placeholder="period" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <StatusPill statusKey={fieldStr(project, 'status')} config={config} />
              <EditableSelect value={fieldStr(project, 'status')} options={PROJECT_STATUSES} onSave={(v) => upd('status', v)} />
            </div>
            <div className="font-mono-x text-[12px] text-[var(--faint)]">
              <EditableText
                value={fieldStr(project, 'value')}
                onSave={(v) => upd('value', /^\d+$/.test(v.trim()) ? Number(v.trim()) : v)}
                placeholder="value"
              />
            </div>
            <button
              onClick={() => navigate(`/p/${id}/report`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
            >
              <Icon name="Share2" size={14} /> Preview client report
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl text-[15px] leading-relaxed text-[var(--muted)]">
        <EditableText value={fieldStr(project, 'summary')} onSave={(v) => upd('summary', v)} placeholder="Add a summary" multiline />
      </div>

      {pending.length > 0 && (
        <button
          onClick={() => navigate('/inbox')}
          className="flex items-center gap-2.5 rounded-lg border border-[var(--brass)] bg-[color-mix(in_srgb,var(--brass)_10%,transparent)] px-3.5 py-2.5 text-left text-[13px]"
        >
          <Icon name="Milestone" size={16} className="text-[var(--brass)]" />
          <span className="flex-1">
            <b>{pending.length}</b> suggested {pending.length === 1 ? 'update' : 'updates'} from the ingest agent, awaiting review.
          </span>
          <span className="font-mono-x text-[11px] text-[var(--brass)]">review →</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Timeline" value={<EditableText value={String(fieldNum(project, 'progress'))} onSave={(v) => upd('progress', Number(v) || 0)} type="number" />} sub="% elapsed" bar={fieldNum(project, 'progress')} />
        <StatTile label="Deliverables" value={`${stats.done}/${stats.total}`} sub="delivered" bar={stats.total ? (stats.done / stats.total) * 100 : 0} />
        <StatTile label="Next milestone" value={<span className="text-[15px]">{next?.label ?? '—'}</span>} sub={next?.when ?? 'complete'} />
        <StatTile label="Contacts" value={<span className="text-[15px]">{contacts[0] ? fieldStr(contacts[0], 'name') : '—'}</span>} sub={contacts[0] ? fieldStr(contacts[0], 'role') : `${contacts.length} contacts`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <SectionHead title="Deliverables" note={`${stats.done}/${stats.total}`} />
          <DeliverablesEditor projectId={id} />
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <SectionHead title="Roadmap" />
          <MilestonesEditor projectId={id} />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
        <SectionHead title="Resources & links" />
        <ResourcesEditor projectId={id} />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
        <SectionHead title="Update log" note="agent-written + manual" />
        <LogEditor projectId={id} />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
        <SectionHead title="Lineage" note="you curate this" />
        <LineageGraph nodes={nodes} edges={edges} focusId={id} mode="internal" height={280} onSelect={(pid) => navigate(`/p/${pid}`)} />
        <div className="mt-3">
          <LineageEditor projectId={id} />
        </div>
      </div>
    </div>
  )
}
