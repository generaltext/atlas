import { useState } from 'react'
import { useStore } from '../lib/store'
import { newId } from '../lib/ids'
import {
  deliverablesForProject,
  edgesOf,
  entitiesOfKind,
  fieldStr,
  logForProject,
  milestonesForProject,
  resourcesForProject,
  type Deliverable,
} from '../lib/reducer'
import { LINEAGE_KINDS, RESOURCE_ICONS, RESOURCE_TYPES } from '../lib/model'
import { Icon } from './Icon'
import {
  Button,
  ConfirmDelete,
  EditableSelect,
  EditableText,
  Labeled,
  Modal,
  TextInput,
  VisibilityToggle,
} from './ui'

const DLV_CYCLE: Record<Deliverable['status'], Deliverable['status']> = {
  todo: 'now',
  now: 'done',
  done: 'todo',
}

function DeliverableMark({ status, onClick }: { status: Deliverable['status']; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Cycle status" className="shrink-0">
      {status === 'done' ? (
        <span className="grid h-4 w-4 place-items-center rounded-[5px] bg-[var(--good)] text-white">
          <Icon name="Check" size={11} />
        </span>
      ) : status === 'now' ? (
        <span className="grid h-4 w-4 place-items-center rounded-full border-2 border-[var(--accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </span>
      ) : (
        <span className="block h-4 w-4 rounded-full border-2 border-[var(--faint)]" />
      )}
    </button>
  )
}

export function DeliverablesEditor({ projectId }: { projectId: string }) {
  const { state, dispatch } = useStore()
  const rows = deliverablesForProject(state, projectId)
  const add = () => {
    const order = rows.reduce((m, r) => Math.max(m, r.order), -1) + 1
    void dispatch({
      type: 'deliverable.create',
      subject: newId('dlv'),
      data: { projectId, label: 'New deliverable', status: 'todo', due: '', clientVisible: false, order },
    })
  }
  return (
    <div>
      {rows.length > 0 && (
        <ul className="mb-2 flex flex-col">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center gap-2.5 border-t border-[var(--border)] py-2 first:border-t-0">
              <DeliverableMark
                status={d.status}
                onClick={() => dispatch({ type: 'deliverable.update', subject: d.id, data: { status: DLV_CYCLE[d.status] } })}
              />
              <EditableText
                value={d.label}
                onSave={(v) => dispatch({ type: 'deliverable.update', subject: d.id, data: { label: v } })}
                className="flex-1 text-[14px]"
                placeholder="Deliverable"
              />
              <EditableText
                value={d.due}
                onSave={(v) => dispatch({ type: 'deliverable.update', subject: d.id, data: { due: v } })}
                className="font-mono-x text-[11px] text-[var(--faint)]"
                placeholder="due"
              />
              <VisibilityToggle on={d.clientVisible} onToggle={() => dispatch({ type: 'deliverable.update', subject: d.id, data: { clientVisible: !d.clientVisible } })} />
              <ConfirmDelete onConfirm={() => dispatch({ type: 'deliverable.archive', subject: d.id })} />
            </li>
          ))}
        </ul>
      )}
      <AddButton label="Add deliverable" onClick={add} />
    </div>
  )
}

export function MilestonesEditor({ projectId }: { projectId: string }) {
  const { state, dispatch } = useStore()
  const rows = milestonesForProject(state, projectId)
  const add = () => {
    const order = rows.reduce((m, r) => Math.max(m, r.order), -1) + 1
    void dispatch({
      type: 'milestone.create',
      subject: newId('mst'),
      data: { projectId, when: '', label: 'New milestone', desc: '', status: 'todo', clientVisible: false, order },
    })
  }
  const opts = [
    { key: 'todo', label: 'To do' },
    { key: 'next', label: 'Next' },
    { key: 'done', label: 'Done' },
  ]
  return (
    <div>
      {rows.length > 0 && (
        <ul className="mb-2 flex flex-col">
          {rows.map((m) => (
            <li key={m.id} className="border-t border-[var(--border)] py-2.5 first:border-t-0">
              <div className="flex items-center gap-2.5">
                <EditableText
                  value={m.when}
                  onSave={(v) => dispatch({ type: 'milestone.update', subject: m.id, data: { when: v } })}
                  className="w-24 font-mono-x text-[11px] text-[var(--faint)]"
                  placeholder="when"
                />
                <EditableText
                  value={m.label}
                  onSave={(v) => dispatch({ type: 'milestone.update', subject: m.id, data: { label: v } })}
                  className="flex-1 text-[14px] font-medium"
                  placeholder="Milestone"
                />
                <EditableSelect value={m.status} options={opts} onSave={(v) => dispatch({ type: 'milestone.update', subject: m.id, data: { status: v } })} />
                <VisibilityToggle on={m.clientVisible} onToggle={() => dispatch({ type: 'milestone.update', subject: m.id, data: { clientVisible: !m.clientVisible } })} />
                <ConfirmDelete onConfirm={() => dispatch({ type: 'milestone.archive', subject: m.id })} />
              </div>
              <div className="mt-1 pl-[7rem]">
                <EditableText
                  value={m.desc}
                  onSave={(v) => dispatch({ type: 'milestone.update', subject: m.id, data: { desc: v } })}
                  className="text-[13px] text-[var(--muted)]"
                  placeholder="Add a note"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddButton label="Add milestone" onClick={add} />
    </div>
  )
}

export function ResourcesEditor({ projectId }: { projectId: string }) {
  const { state, dispatch } = useStore()
  const rows = resourcesForProject(state, projectId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ label: '', url: '', type: 'link', note: '', clientVisible: false })

  const save = () => {
    if (!form.label.trim() && !form.url.trim()) return
    void dispatch({ type: 'resource.create', subject: newId('res'), data: { projectId, ...form } })
    setForm({ label: '', url: '', type: 'link', note: '', clientVisible: false })
    setOpen(false)
  }

  return (
    <div>
      {rows.length > 0 && (
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] px-3 py-2">
              <Icon name={RESOURCE_ICONS[r.type] ?? 'Link'} size={16} className="shrink-0 text-[var(--faint)]" />
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium hover:text-[var(--accent)]">{r.label || r.url}</div>
                <div className="truncate font-mono-x text-[11px] text-[var(--faint)]">{r.url}</div>
              </a>
              <VisibilityToggle on={r.clientVisible} onToggle={() => dispatch({ type: 'resource.update', subject: r.id, data: { clientVisible: !r.clientVisible } })} />
              <ConfirmDelete onConfirm={() => dispatch({ type: 'resource.archive', subject: r.id })} />
            </div>
          ))}
        </div>
      )}
      <AddButton label="Add resource" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Add resource">
        <div className="flex flex-col gap-3">
          <Labeled label="Label">
            <TextInput value={form.label} onChange={(v) => setForm({ ...form, label: v })} placeholder="e.g. Live site" autoFocus />
          </Labeled>
          <Labeled label="URL">
            <TextInput value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://" />
          </Labeled>
          <Labeled label="Type">
            <EditableSelect value={form.type} options={RESOURCE_TYPES} onSave={(v) => setForm({ ...form, type: v })} />
          </Labeled>
          <label className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
            <input type="checkbox" checked={form.clientVisible} onChange={(e) => setForm({ ...form, clientVisible: e.target.checked })} />
            Show on the client report
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function LogEditor({ projectId }: { projectId: string }) {
  const { state, dispatch } = useStore()
  const rows = logForProject(state, projectId)
  const repos = [...new Set(rows.map((l) => l.repo).filter(Boolean))]
  const totalCommits = rows.reduce((s, l) => s + l.commits, 0)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', at: '', clientVisible: false })

  const save = () => {
    if (!form.title.trim()) return
    void dispatch({
      type: 'log.create',
      subject: newId('log'),
      data: { projectId, title: form.title, body: form.body, at: form.at || new Date().toISOString().slice(0, 10), source: 'human', commits: 0, repo: '', hash: '', clientVisible: form.clientVisible },
    })
    setForm({ title: '', body: '', at: '', clientVisible: false })
    setOpen(false)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 font-mono-x text-[11px] text-[var(--muted)]">
        <span className="text-[var(--brass)]">◆ atlas-ingest</span>
        <span>reads {repos.length ? repos.join(', ') : 'no repos yet'}</span>
        <span>· {totalCommits.toLocaleString()} commits summarized</span>
      </div>
      {rows.length > 0 && (
        <div className="mb-2 flex flex-col">
          {rows.map((l) => (
            <div key={l.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-t border-[var(--border)] py-3 first:border-t-0">
              <div className="whitespace-nowrap pt-0.5 text-right font-mono-x text-[11px] text-[var(--faint)]">
                <span className="text-[var(--accent)]">{l.hash || (l.source === 'human' ? 'note' : '·')}</span>
                <br />
                {l.at}
              </div>
              <div className="min-w-0">
                <EditableText value={l.title} onSave={(v) => dispatch({ type: 'log.update', subject: l.id, data: { title: v } })} className="text-[14px] font-medium" />
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-x text-[11px] text-[var(--faint)]">
                  {l.repo && <span className="text-[var(--muted)]">{l.repo}</span>}
                  {l.commits > 0 && <span>from {l.commits} commits</span>}
                  <span>{l.source === 'agent' ? 'agent' : 'manual'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <VisibilityToggle on={l.clientVisible} onToggle={() => dispatch({ type: 'log.update', subject: l.id, data: { clientVisible: !l.clientVisible } })} />
                <ConfirmDelete onConfirm={() => dispatch({ type: 'log.archive', subject: l.id })} />
              </div>
            </div>
          ))}
        </div>
      )}
      <AddButton label="Add note" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Add a log note">
        <div className="flex flex-col gap-3">
          <Labeled label="Title">
            <TextInput value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="What happened" autoFocus />
          </Labeled>
          <Labeled label="Details (optional)">
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-[14px] outline-none focus:border-[var(--accent)]" />
          </Labeled>
          <Labeled label="Date">
            <TextInput value={form.at} onChange={(v) => setForm({ ...form, at: v })} type="date" />
          </Labeled>
          <label className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
            <input type="checkbox" checked={form.clientVisible} onChange={(e) => setForm({ ...form, clientVisible: e.target.checked })} />
            Show on the client report
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function LineageEditor({ projectId }: { projectId: string }) {
  const { state, dispatch } = useStore()
  const edges = edgesOf(state).filter((e) => e.from === projectId || e.to === projectId)
  const others = entitiesOfKind(state, 'project').filter((p) => p.id !== projectId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ dir: 'to', other: '', kind: 'reused', clientVisible: false })
  const nameOf = (id: string) => fieldStr(state.entities[id], 'name')

  const save = () => {
    if (!form.other) return
    const from = form.dir === 'to' ? projectId : form.other
    const to = form.dir === 'to' ? form.other : projectId
    void dispatch({ type: 'lineage.add', subject: newId('lin'), data: { from, to, kind: form.kind, clientVisible: form.clientVisible, note: '' } })
    setForm({ dir: 'to', other: '', kind: 'reused', clientVisible: false })
    setOpen(false)
  }

  return (
    <div>
      {edges.length > 0 && (
        <ul className="mb-2 flex flex-col">
          {edges.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] py-2 text-[13.5px] first:border-t-0">
              <span className="font-medium">{nameOf(e.from)}</span>
              <span className="font-mono-x text-[12px] text-[var(--brass)]">— {e.kind} →</span>
              <span className="font-medium">{nameOf(e.to)}</span>
              <span className="ml-auto flex items-center gap-1">
                <VisibilityToggle on={e.clientVisible} onToggle={() => dispatch({ type: 'lineage.update', subject: e.id, data: { clientVisible: !e.clientVisible } })} />
                <ConfirmDelete onConfirm={() => dispatch({ type: 'lineage.remove', subject: e.id })} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <AddButton label="Add connection" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Add a lineage connection">
        <div className="flex flex-col gap-3">
          <Labeled label="Direction">
            <EditableSelect
              value={form.dir}
              options={[
                { key: 'to', label: 'This project → another' },
                { key: 'from', label: 'Another → this project' },
              ]}
              onSave={(v) => setForm({ ...form, dir: v })}
            />
          </Labeled>
          <Labeled label="Other project">
            <EditableSelect value={form.other} options={others.map((p) => ({ key: p.id, label: fieldStr(p, 'name') }))} onSave={(v) => setForm({ ...form, other: v })} />
          </Labeled>
          <Labeled label="Relationship">
            <EditableSelect value={form.kind} options={LINEAGE_KINDS} onSave={(v) => setForm({ ...form, kind: v })} />
          </Labeled>
          <label className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
            <input type="checkbox" checked={form.clientVisible} onChange={(e) => setForm({ ...form, clientVisible: e.target.checked })} />
            Show on the client report
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
    >
      <Icon name="Plus" size={14} /> {label}
    </button>
  )
}
