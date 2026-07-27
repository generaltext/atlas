import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import {
  entitiesOfKind,
  fieldStr,
  graphEdges,
  linkedOfKind,
  mentionedBy,
  mentionsOf,
  refName,
} from '../lib/reducer'
import { statusColorVarName } from '../lib/model'
import { Icon } from '../components/Icon'
import { Card, SectionHead } from '../components/common'
import { StatusControl } from '../components/StatusControl'
import { Button, ConfirmDelete, EditableSelect, EditableText, Labeled, Modal, TextInput } from '../components/ui'
import { RefCombobox } from '../components/RefCombobox'
import { DeliverablesEditor, LogEditor, MilestonesEditor } from '../components/editors'
import { MentionInput } from '../components/MentionInput'
import { LineageGraph } from '../components/LineageGraph'
import { newId } from '../lib/ids'

export function ProjectDetail() {
  const { id = '' } = useParams()
  // Key by id so switching projects remounts — resets the uncontrolled context
  // editor and its ref cleanly.
  return <ProjectDetailInner key={id} id={id} />
}

function ProjectDetailInner({ id }: { id: string }) {
  const navigate = useNavigate()
  const { state, config, dispatch } = useStore()
  const project = state.entities[id]
  const ctxRef = useRef(project ? fieldStr(project, 'context') : '')

  if (!project || project.kind !== 'project') {
    return (
      <div className="text-[var(--muted)]">
        Project not found. <Link className="text-[var(--accent)]" to="/">Back to projects</Link>
      </div>
    )
  }

  const upd = (key: string, val: string | number) =>
    dispatch({ type: 'project.update', subject: id, data: { [key]: val } })

  const clientId = fieldStr(project, 'client')
  const upstream = mentionsOf(state, id).map((pid) => ({ id: pid, name: refName(state, pid) }))
  const downstream = mentionedBy(state, id).map((pid) => ({ id: pid, name: refName(state, pid) }))

  const allProjects = entitiesOfKind(state, 'project')
  const nodes = allProjects.map((p) => ({
    id: p.id,
    name: fieldStr(p, 'name'),
    subtitle: refName(state, fieldStr(p, 'client')),
    colorVar: statusColorVarName(config, fieldStr(p, 'status')),
  }))
  const edges = graphEdges(state)

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="eyebrow">Project</span>
          <ConfirmDelete
            title="Archive project"
            onConfirm={() => {
              dispatch({ type: 'project.archive', subject: id })
              navigate('/')
            }}
          />
        </div>
        <h1 className="text-[26px] font-semibold tracking-tight">
          <EditableText value={fieldStr(project, 'name')} onSave={(v) => upd('name', v)} placeholder="Untitled project" />
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span>for</span>
            <RefCombobox value={clientId} kind="client" onPick={(cid) => upd('client', cid)} placeholder="set client" />
          </span>
          <span className="text-[var(--faint)]">·</span>
          <span className="inline-flex items-center gap-1.5 font-mono-x text-[12.5px]">
            <EditableText value={fieldStr(project, 'start')} onSave={(v) => upd('start', v)} placeholder="start" type="date" />
            <span className="text-[var(--faint)]">→</span>
            <EditableText value={fieldStr(project, 'end')} onSave={(v) => upd('end', v)} placeholder="end" type="date" />
          </span>
          <span className="text-[var(--faint)]">·</span>
          <StatusControl value={fieldStr(project, 'status')} config={config} onChange={(v) => upd('status', v)} />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[14px] text-[var(--muted)]">
          <span>led by</span>
          <RefCombobox value={fieldStr(project, 'lead')} kind="contact" onPick={(cid) => upd('lead', cid)} placeholder="set lead" />
        </div>
      </div>

      {/* deliverables + roadmap */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="p-4">
          <SectionHead title="Deliverables" />
          <DeliverablesEditor projectId={id} />
        </Card>
        <Card className="p-4">
          <SectionHead title="Roadmap" />
          <MilestonesEditor projectId={id} />
        </Card>
      </div>

      {/* contacts */}
      <ContactsSection projectId={id} />

      {/* update log */}
      <Card className="p-4">
        <SectionHead title="Update log" note="manual or agent-pushed" />
        <LogEditor projectId={id} />
      </Card>

      {/* context (drives the graph) */}
      <Card className="p-4">
        <SectionHead title="Context" note="@mention projects to link them" />
        <MentionInput
          value={ctxRef.current}
          excludeId={id}
          placeholder="How this project connects — e.g. “Grew out of @… ; base maps reused by @…”. @mentions build the lineage graph."
          onChange={(v) => (ctxRef.current = v)}
          onCommit={() => upd('context', ctxRef.current)}
        />
        {(upstream.length > 0 || downstream.length > 0) && (
          <p className="mt-2.5 text-[13.5px] text-[var(--muted)]">
            {upstream.length > 0 && (
              <>
                Builds on {upstream.map((u, i) => (
                  <span key={u.id}>
                    {i > 0 && ', '}
                    <button onClick={() => navigate(`/p/${u.id}`)} className="text-[var(--brass)] hover:underline">{u.name}</button>
                  </span>
                ))}
                .{' '}
              </>
            )}
            {downstream.length > 0 && (
              <>
                Informs {downstream.map((d, i) => (
                  <span key={d.id}>
                    {i > 0 && ', '}
                    <button onClick={() => navigate(`/p/${d.id}`)} className="text-[var(--accent)] hover:underline">{d.name}</button>
                  </span>
                ))}
                .
              </>
            )}
          </p>
        )}
      </Card>

      {/* derived lineage graph — only this project's connections */}
      {allProjects.length > 1 && (
        <Card className="p-4">
          <SectionHead title="Lineage" note="derived from context @mentions" />
          {upstream.length > 0 || downstream.length > 0 ? (
            <LineageGraph nodes={nodes} edges={edges} focusId={id} height={260} onSelect={(pid) => navigate(`/p/${pid}`)} />
          ) : (
            <p className="py-6 text-center text-[13px] text-[var(--faint)]">
              No connections yet — @mention another project in Context above to draw the lineage.
            </p>
          )}
        </Card>
      )}
    </div>
  )
}

function ContactsSection({ projectId }: { projectId: string }) {
  const { state, dispatch } = useStore()
  const contacts = linkedOfKind(state, projectId, 'contact')
  const allContacts = entitiesOfKind(state, 'contact').filter(
    (c) => !contacts.some((lc) => lc.id === c.id),
  )
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState('')
  const [neu, setNeu] = useState({ name: '', role: '', email: '' })

  const attachExisting = () => {
    if (!pick) return
    void dispatch({ type: 'link.add', subject: projectId, data: { to: pick } })
    setPick('')
    setOpen(false)
  }
  const createAndAttach = () => {
    if (!neu.name.trim()) return
    const cid = newId('con')
    void dispatch([
      { type: 'contact.create', subject: cid, data: { name: neu.name, role: neu.role, email: neu.email } },
      { type: 'link.add', subject: projectId, data: { to: cid } },
    ])
    setNeu({ name: '', role: '', email: '' })
    setOpen(false)
  }

  return (
    <Card className="p-4">
      <SectionHead title="Contacts" />
      {contacts.length > 0 && (
        <ul className="mb-2 flex flex-col">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 border-t border-[var(--border)] py-2.5 first:border-t-0">
              <Icon name="User" size={15} className="text-[var(--faint)]" />
              <Link to={`/e/${c.id}`} className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium hover:text-[var(--accent)]">{fieldStr(c, 'name')}</div>
                <div className="truncate text-[12px] text-[var(--faint)]">
                  {[fieldStr(c, 'role'), fieldStr(c, 'email')].filter(Boolean).join(' · ')}
                </div>
              </Link>
              <ConfirmDelete title="Remove from project" onConfirm={() => dispatch({ type: 'link.remove', subject: projectId, data: { to: c.id } })} />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
      >
        <Icon name="Plus" size={14} /> Add contact
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a contact">
        <div className="flex flex-col gap-4">
          {allContacts.length > 0 && (
            <div className="flex flex-col gap-2">
              <Labeled label="Existing contact">
                <EditableSelect value={pick} options={allContacts.map((c) => ({ key: c.id, label: fieldStr(c, 'name') }))} onSave={setPick} />
              </Labeled>
              <div className="flex justify-end">
                <Button onClick={attachExisting}>Attach</Button>
              </div>
              <div className="my-1 text-center font-mono-x text-[11px] text-[var(--faint)]">or new</div>
            </div>
          )}
          <Labeled label="Name">
            <TextInput value={neu.name} onChange={(v) => setNeu({ ...neu, name: v })} placeholder="Full name" />
          </Labeled>
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="Role">
              <TextInput value={neu.role} onChange={(v) => setNeu({ ...neu, role: v })} />
            </Labeled>
            <Labeled label="Email">
              <TextInput value={neu.email} onChange={(v) => setNeu({ ...neu, email: v })} type="email" />
            </Labeled>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createAndAttach}>Create & attach</Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
