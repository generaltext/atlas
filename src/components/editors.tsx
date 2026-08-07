import { useState } from 'react'

import { newId } from '../lib/ids'
import { DELIVERABLE_KINDS, deliverableKindDef, type DeliverableKind } from '../lib/model'
import {
  deliverablesForProject,
  logForProject,
  milestonesForProject,
  type Deliverable,
} from '../lib/reducer'
import { useStore } from '../lib/store'
import { Icon } from './Icon'
import { MentionText } from './MentionText'
import { Button, ConfirmDelete, EditableText, Labeled, Modal, TextInput } from './ui'

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

// ── Deliverables: reference links, due items, or delivered ───────────────────

const todayISO = () => new Date().toISOString().slice(0, 10)

/** The kind marker — an icon that reflects reference/due/delivered and opens a
 *  menu to change it. Replaces the old checkbox. */
function KindMarker({ kind, onPick }: { kind: string; onPick: (k: DeliverableKind) => void }) {
  const [open, setOpen] = useState(false)
  const def = deliverableKindDef(kind)
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        title={`${def.label} — click to change`}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="grid h-5 w-5 place-items-center"
      >
        <span className="h-3 w-3 rounded-full" style={{ background: `var(${def.colorVar})` }} />
      </button>
      {open && (
        <ul className="absolute top-full left-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1 shadow-lg">
          {DELIVERABLE_KINDS.map((k) => (
            <li key={k.key}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onPick(k.key)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-[var(--hover)]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: `var(${k.colorVar})` }}
                />
                {k.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}

function DeliverableRow({ d }: { d: Deliverable }) {
  const { dispatch } = useStore()
  const upd = (data: Record<string, unknown>) =>
    dispatch({ type: 'deliverable.update', subject: d.id, data })
  const pickKind = (kind: DeliverableKind) => {
    const patch: Record<string, unknown> = { kind }
    if (kind === 'delivered' && !d.deliveredDate) patch.deliveredDate = todayISO()
    upd(patch)
  }
  const dated = d.kind === 'due' || d.kind === 'delivered'
  const dateVal = d.kind === 'due' ? d.dueDate : d.deliveredDate
  const dateColor = d.kind === 'delivered' ? '--good' : '--warn'
  return (
    <li className="group border-t border-[var(--line-soft)] py-2 first:border-t-0">
      {/* line 1: dot + title (dot is centered with the title) */}
      <div className="flex items-center gap-2.5">
        <KindMarker kind={d.kind} onPick={pickKind} />
        <EditableText
          value={d.label}
          onSave={(v) => upd({ label: v })}
          className={`min-w-0 flex-1 truncate text-[14px] leading-tight ${d.kind === 'delivered' ? 'text-[var(--muted)]' : ''}`}
          placeholder="Label"
        />
        <span className="shrink-0 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <ConfirmDelete
            onConfirm={() => dispatch({ type: 'deliverable.archive', subject: d.id })}
          />
        </span>
      </div>
      {/* line 2 (indented under the title): link + its open button, date at the right */}
      <div className="mt-0 flex items-center gap-1.5 pl-[1.875rem] text-[11px] leading-none">
        <EditableText
          value={d.url}
          onSave={(v) => upd({ url: v })}
          className="font-mono-x min-w-0 truncate text-[var(--faint)]"
          placeholder="add link"
          type="url"
        />
        {d.url && (
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open link"
            className="shrink-0 text-[var(--faint)] transition hover:text-[var(--accent)]"
          >
            <Icon name="ExternalLink" size={12} />
          </a>
        )}
        {dated && (
          <span
            className="ml-auto shrink-0 whitespace-nowrap"
            style={{ color: `var(${dateColor})` }}
          >
            <EditableText
              value={dateVal}
              onSave={(v) => upd(d.kind === 'due' ? { dueDate: v } : { deliveredDate: v })}
              className="font-mono-x text-[10.5px] whitespace-nowrap"
              placeholder="date"
              type="date"
            />
          </span>
        )}
      </div>
    </li>
  )
}

export function DeliverablesEditor({ projectId }: { projectId: string }) {
  const { state, dispatch } = useStore()
  const rows = deliverablesForProject(state, projectId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ label: string; url: string; kind: DeliverableKind }>({
    label: '',
    url: '',
    kind: 'reference',
  })

  const save = () => {
    if (!form.label.trim() && !form.url.trim()) return
    const order = rows.reduce((m, r) => Math.max(m, r.order), -1) + 1
    const data: Record<string, unknown> = {
      projectId,
      label: form.label || form.url,
      url: form.url,
      kind: form.kind,
      order,
    }
    if (form.kind === 'delivered') data.deliveredDate = todayISO()
    void dispatch({ type: 'deliverable.create', subject: newId('dlv'), data })
    setForm({ label: '', url: '', kind: 'reference' })
    setOpen(false)
  }

  return (
    <div>
      {rows.length > 0 && (
        <ul className="mb-2 flex flex-col">
          {rows.map((d) => (
            <DeliverableRow key={d.id} d={d} />
          ))}
        </ul>
      )}
      <AddButton label="Add deliverable" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Add a deliverable">
        <div className="flex flex-col gap-3">
          <Labeled label="Label">
            <TextInput
              value={form.label}
              onChange={(v) => setForm({ ...form, label: v })}
              placeholder="e.g. GitHub repo, or “Story-map builder”"
              autoFocus
            />
          </Labeled>
          <Labeled label="Link (optional)">
            <TextInput
              value={form.url}
              onChange={(v) => setForm({ ...form, url: v })}
              placeholder="https://"
              type="url"
            />
          </Labeled>
          <Labeled label="Type">
            <div className="flex gap-1.5">
              {DELIVERABLE_KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setForm({ ...form, kind: k.key })}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] transition ${
                    form.kind === k.key
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--fg)]'
                      : 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: `var(${k.colorVar})` }}
                  />
                  {k.label}
                </button>
              ))}
            </div>
          </Labeled>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Roadmap: milestones ───────────────────────────────────────────────────────

export function MilestonesEditor({ projectId }: { projectId: string }) {
  const { state, dispatch } = useStore()
  const rows = milestonesForProject(state, projectId)
  const add = () => {
    const order = rows.reduce((m, r) => Math.max(m, r.order), -1) + 1
    void dispatch({
      type: 'milestone.create',
      subject: newId('mst'),
      data: { projectId, when: '', label: 'New milestone', desc: '', status: 'todo', order },
    })
  }
  return (
    <div>
      {rows.length > 0 && (
        <ol className="mb-2 flex flex-col">
          {rows.map((m) => {
            const dot =
              m.status === 'done'
                ? 'var(--good)'
                : m.status === 'next'
                  ? 'var(--accent)'
                  : 'var(--faint)'
            const stLabel = m.status === 'done' ? 'Done' : m.status === 'next' ? 'Next' : 'To do'
            const stTone = m.status === 'done' ? 'good' : m.status === 'next' ? 'info' : 'muted'
            const stNext = m.status === 'todo' ? 'next' : m.status === 'next' ? 'done' : 'todo'
            return (
              <li
                key={m.id}
                className="group flex gap-2.5 border-t border-[var(--border)] py-2 first:border-t-0"
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2"
                  style={{
                    background: m.status === 'done' ? dot : 'var(--panel)',
                    borderColor: dot,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <EditableText
                      value={m.when}
                      onSave={(v) =>
                        dispatch({ type: 'milestone.update', subject: m.id, data: { when: v } })
                      }
                      className="font-mono-x w-20 shrink-0 text-[11px] text-[var(--faint)]"
                      placeholder="when"
                    />
                    <EditableText
                      value={m.label}
                      onSave={(v) =>
                        dispatch({ type: 'milestone.update', subject: m.id, data: { label: v } })
                      }
                      className="min-w-0 flex-1 truncate text-[14px] font-medium"
                      placeholder="Milestone"
                    />
                    <button
                      type="button"
                      title="Click to change status"
                      onClick={() =>
                        dispatch({
                          type: 'milestone.update',
                          subject: m.id,
                          data: { status: stNext },
                        })
                      }
                      className={`pill tone-${stTone} shrink-0`}
                    >
                      <span className="tick" />
                      {stLabel}
                    </button>
                    <span className="shrink-0 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <ConfirmDelete
                        onConfirm={() => dispatch({ type: 'milestone.archive', subject: m.id })}
                      />
                    </span>
                  </div>
                  <EditableText
                    value={m.desc}
                    onSave={(v) =>
                      dispatch({ type: 'milestone.update', subject: m.id, data: { desc: v } })
                    }
                    className="mt-0.5 block text-[12.5px] text-[var(--muted)]"
                    placeholder="Add a note"
                  />
                </div>
              </li>
            )
          })}
        </ol>
      )}
      <AddButton label="Add milestone" onClick={add} />
    </div>
  )
}

// ── Update log: manual entries or agent-pushed ────────────────────────────────

export function LogEditor({ projectId }: { projectId: string }) {
  const { state, dispatch } = useStore()
  const rows = logForProject(state, projectId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', at: '' })

  const save = () => {
    if (!form.title.trim()) return
    void dispatch({
      type: 'log.create',
      subject: newId('log'),
      data: {
        projectId,
        title: form.title,
        body: form.body,
        at: form.at || new Date().toISOString().slice(0, 10),
        source: 'manual',
      },
    })
    setForm({ title: '', body: '', at: '' })
    setOpen(false)
  }

  return (
    <div>
      {rows.length > 0 && (
        <div className="mb-2 flex flex-col">
          {rows.map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-t border-[var(--border)] py-3 first:border-t-0"
            >
              <div className="font-mono-x pt-0.5 text-right text-[11px] whitespace-nowrap text-[var(--faint)]">
                {l.at}
              </div>
              <div className="min-w-0">
                <EditableText
                  value={l.title}
                  onSave={(v) =>
                    dispatch({ type: 'log.update', subject: l.id, data: { title: v } })
                  }
                  className="text-[14px] font-medium"
                />
                {l.body && (
                  <MentionText body={l.body} className="mt-0.5 text-[13px] text-[var(--muted)]" />
                )}
                <div className="font-mono-x mt-1 text-[10.5px] tracking-wider text-[var(--faint)] uppercase">
                  {l.source === 'agent' ? '◆ agent' : 'manual'}
                </div>
              </div>
              <ConfirmDelete onConfirm={() => dispatch({ type: 'log.archive', subject: l.id })} />
            </div>
          ))}
        </div>
      )}
      <AddButton label="Add update" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Add an update">
        <div className="flex flex-col gap-3">
          <Labeled label="Title">
            <TextInput
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
              placeholder="What happened"
              autoFocus
            />
          </Labeled>
          <Labeled label="Details (optional)">
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-[14px] outline-none focus:border-[var(--accent)]"
            />
          </Labeled>
          <Labeled label="Date">
            <TextInput value={form.at} onChange={(v) => setForm({ ...form, at: v })} type="date" />
          </Labeled>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
