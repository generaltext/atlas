// The projection: fold the event log into current-state records. Application is
// idempotent (each event id applied at most once) so re-folding a shard tail, or
// seeing our own optimistic write echoed back by the watch, is always safe.
//
// The lineage graph is NOT stored: it is derived from @mentions in each project's
// `context` field (see graphEdges / mentionsOf / mentionedBy at the bottom).

import type { Actor, AtlasEvent } from './events'
import type { EntityKind, MilestoneStatus, LogSource, DeliverableKind } from './model'
import { kindOfId } from './model'
import { mentionedIds } from './mentions'

export interface EntityRecord {
  id: string
  kind: EntityKind
  fields: Record<string, string | number>
  /** bidirectional links (project ↔ contact) */
  links: string[]
  archived: boolean
  createdBy: Actor | null
  createdAt: string
  updatedBy: Actor | null
  updatedAt: string
}

interface ChildBase {
  archived: boolean
  createdBy: Actor | null
  createdAt: string
  updatedBy: Actor | null
  updatedAt: string
}

/** A deliverable — a link, to begin with (label + url), optionally checked off. */
export interface Deliverable extends ChildBase {
  id: string
  projectId: string
  label: string
  url: string
  kind: DeliverableKind
  /** optional due date (ISO) — meaningful when kind === 'due' */
  dueDate: string
  /** delivery date (ISO) — set when kind === 'delivered' */
  deliveredDate: string
  order: number
}

export interface Milestone extends ChildBase {
  id: string
  projectId: string
  when: string
  label: string
  desc: string
  status: MilestoneStatus
  order: number
}

/** An update-log entry — added manually or pushed by an agent reading commits. */
export interface LogEntry extends ChildBase {
  id: string
  projectId: string
  at: string
  title: string
  body: string
  source: LogSource
}

export interface State {
  entities: Record<string, EntityRecord>
  deliverables: Record<string, Deliverable>
  milestones: Record<string, Milestone>
  logEntries: Record<string, LogEntry>
  /** every applied event, in application order, for the activity feed */
  events: AtlasEvent[]
  applied: Set<string>
}

export function emptyState(): State {
  return {
    entities: {},
    deliverables: {},
    milestones: {},
    logEntries: {},
    events: [],
    applied: new Set(),
  }
}

// ── coercion helpers ──────────────────────────────────────────────────────────

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}
function asNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}
function asBool(v: unknown): boolean {
  return v === true
}

// ── main dispatch ─────────────────────────────────────────────────────────────

export function applyEvent(state: State, ev: AtlasEvent): void {
  if (state.applied.has(ev.id)) return
  state.applied.add(ev.id)
  state.events.push(ev)

  const [entity, verb = ''] = ev.type.split('.')
  const data = ev.data ?? {}

  switch (entity) {
    case 'project':
    case 'client':
    case 'contact':
      applyEntity(state, ev, verb, data)
      break
    case 'deliverable':
      applyDeliverable(state, ev, verb, data)
      break
    case 'milestone':
      applyMilestone(state, ev, verb, data)
      break
    case 'log':
      applyLog(state, ev, verb, data)
      break
    case 'link':
      applyLink(state, ev, verb, data)
      break
    default:
      // Unknown event type from a newer build: recorded in events, otherwise
      // ignored. Forward-compatible by design.
      break
  }
}

function touch(rec: { updatedAt: string; updatedBy: Actor | null }, ev: AtlasEvent): void {
  rec.updatedAt = ev.ts
  rec.updatedBy = ev.actor
}

// ── entities (registry kinds) ─────────────────────────────────────────────────

function fieldsFrom(data: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' || typeof v === 'number') out[k] = v
  }
  return out
}

function applyEntity(
  state: State,
  ev: AtlasEvent,
  verb: string,
  data: Record<string, unknown>,
): void {
  const kind = kindOfId(ev.subject)
  if (!kind) return

  if (verb === 'create') {
    if (state.entities[ev.subject]) return
    state.entities[ev.subject] = {
      id: ev.subject,
      kind,
      fields: fieldsFrom(data),
      links: [],
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }

  const rec = state.entities[ev.subject]
  if (!rec) return

  if (verb === 'update') {
    Object.assign(rec.fields, fieldsFrom(data))
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

// ── deliverables (links) ──────────────────────────────────────────────────────

/** Resolve a deliverable's kind, mapping the legacy done/due booleans for old events. */
function deliverableKindFrom(data: Record<string, unknown>): DeliverableKind {
  const k = asString(data.kind)
  if (k === 'reference' || k === 'due' || k === 'delivered') return k
  if (asBool(data.done)) return 'delivered'
  if (asBool(data.due)) return 'due'
  return 'reference'
}

function applyDeliverable(
  state: State,
  ev: AtlasEvent,
  verb: string,
  data: Record<string, unknown>,
): void {
  if (verb === 'create') {
    if (state.deliverables[ev.subject]) return
    state.deliverables[ev.subject] = {
      id: ev.subject,
      projectId: asString(data.projectId),
      label: asString(data.label),
      url: asString(data.url),
      kind: deliverableKindFrom(data),
      dueDate: asString(data.dueDate),
      deliveredDate: asString(data.deliveredDate),
      order: asNum(data.order),
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }
  const rec = state.deliverables[ev.subject]
  if (!rec) return
  if (verb === 'update') {
    if ('label' in data) rec.label = asString(data.label)
    if ('url' in data) rec.url = asString(data.url)
    if ('kind' in data) {
      const k = asString(data.kind)
      if (k === 'reference' || k === 'due' || k === 'delivered') rec.kind = k
    }
    if ('dueDate' in data) rec.dueDate = asString(data.dueDate)
    if ('deliveredDate' in data) rec.deliveredDate = asString(data.deliveredDate)
    if ('order' in data) rec.order = asNum(data.order)
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

// ── milestones (roadmap) ──────────────────────────────────────────────────────

function applyMilestone(
  state: State,
  ev: AtlasEvent,
  verb: string,
  data: Record<string, unknown>,
): void {
  if (verb === 'create') {
    if (state.milestones[ev.subject]) return
    const status = asString(data.status)
    state.milestones[ev.subject] = {
      id: ev.subject,
      projectId: asString(data.projectId),
      when: asString(data.when),
      label: asString(data.label),
      desc: asString(data.desc),
      status: (status === 'next' || status === 'done' ? status : 'todo') as MilestoneStatus,
      order: asNum(data.order),
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }
  const rec = state.milestones[ev.subject]
  if (!rec) return
  if (verb === 'update') {
    if ('when' in data) rec.when = asString(data.when)
    if ('label' in data) rec.label = asString(data.label)
    if ('desc' in data) rec.desc = asString(data.desc)
    if ('order' in data) rec.order = asNum(data.order)
    if ('status' in data) {
      const s = asString(data.status)
      if (s === 'todo' || s === 'next' || s === 'done') rec.status = s
    }
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

// ── update-log entries ────────────────────────────────────────────────────────

function applyLog(
  state: State,
  ev: AtlasEvent,
  verb: string,
  data: Record<string, unknown>,
): void {
  if (verb === 'create') {
    if (state.logEntries[ev.subject]) return
    const source = asString(data.source)
    state.logEntries[ev.subject] = {
      id: ev.subject,
      projectId: asString(data.projectId),
      at: asString(data.at) || ev.ts,
      title: asString(data.title),
      body: asString(data.body),
      source: source === 'agent' ? 'agent' : 'manual',
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }
  const rec = state.logEntries[ev.subject]
  if (!rec) return
  if (verb === 'update') {
    if ('title' in data) rec.title = asString(data.title)
    if ('body' in data) rec.body = asString(data.body)
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

// ── project ↔ contact links (bidirectional) ───────────────────────────────────

function applyLink(
  state: State,
  ev: AtlasEvent,
  verb: string,
  data: Record<string, unknown>,
): void {
  const from = state.entities[ev.subject]
  const toId = asString(data.to)
  const to = state.entities[toId]
  if (!from || !to) return
  if (verb === 'add') {
    if (!from.links.includes(toId)) from.links.push(toId)
    if (!to.links.includes(from.id)) to.links.push(from.id)
  } else if (verb === 'remove') {
    from.links = from.links.filter((l) => l !== toId)
    to.links = to.links.filter((l) => l !== from.id)
  }
}

// ── selectors ─────────────────────────────────────────────────────────────────

export function entitiesOfKind(
  state: State,
  kind: EntityKind,
  includeArchived = false,
): EntityRecord[] {
  return Object.values(state.entities)
    .filter((e) => e.kind === kind && (includeArchived || !e.archived))
    .sort((a, b) => (b.updatedAt < a.updatedAt ? -1 : 1))
}

export function fieldStr(rec: EntityRecord | undefined, key: string): string {
  const v = rec?.fields[key]
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

export function refName(state: State, id: string): string {
  const rec = state.entities[id]
  if (!rec) return ''
  return fieldStr(rec, 'name')
}

export function projectsForClient(state: State, clientId: string): EntityRecord[] {
  return entitiesOfKind(state, 'project').filter((p) => fieldStr(p, 'client') === clientId)
}

export function linkedOfKind(state: State, entityId: string, kind: EntityKind): EntityRecord[] {
  const rec = state.entities[entityId]
  if (!rec) return []
  return rec.links
    .map((id) => state.entities[id])
    .filter((e): e is EntityRecord => !!e && e.kind === kind && !e.archived)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}

export function deliverablesForProject(state: State, projectId: string): Deliverable[] {
  return Object.values(state.deliverables)
    .filter((d) => d.projectId === projectId && !d.archived)
    .sort((a, b) => a.order - b.order || (a.createdAt < b.createdAt ? -1 : 1))
}

export function milestonesForProject(state: State, projectId: string): Milestone[] {
  return Object.values(state.milestones)
    .filter((m) => m.projectId === projectId && !m.archived)
    .sort((a, b) => a.order - b.order || (a.createdAt < b.createdAt ? -1 : 1))
}

export function logForProject(state: State, projectId: string): LogEntry[] {
  return Object.values(state.logEntries)
    .filter((l) => l.projectId === projectId && !l.archived)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : b.createdAt < a.createdAt ? -1 : 1))
}

export function nextMilestone(state: State, projectId: string): Milestone | null {
  const ms = milestonesForProject(state, projectId)
  return ms.find((m) => m.status === 'next') ?? ms.find((m) => m.status === 'todo') ?? null
}

// ── derived lineage (from @mentions in the `context` field) ───────────────────

/** Project ids `projectId`'s context mentions (its upstream — what it builds on). */
export function mentionsOf(state: State, projectId: string): string[] {
  const p = state.entities[projectId]
  if (!p || p.kind !== 'project') return []
  const ids = new Set(
    mentionedIds(fieldStr(p, 'context')).filter(
      (id) => id !== projectId && state.entities[id]?.kind === 'project',
    ),
  )
  return [...ids]
}

/** Projects whose context mentions `projectId` (its downstream — what it inspired). */
export function mentionedBy(state: State, projectId: string): string[] {
  const out: string[] = []
  for (const p of entitiesOfKind(state, 'project')) {
    if (p.id === projectId) continue
    if (mentionsOf(state, p.id).includes(projectId)) out.push(p.id)
  }
  return out
}

export interface GraphEdge {
  from: string
  to: string
}

/** The whole directed lineage graph, derived from every project's context. An edge
 *  from→to means "from builds on / draws from to". */
export function graphEdges(state: State): GraphEdge[] {
  const edges: GraphEdge[] = []
  const seen = new Set<string>()
  for (const p of entitiesOfKind(state, 'project', true)) {
    for (const to of mentionsOf(state, p.id)) {
      const key = `${p.id}→${to}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ from: p.id, to })
    }
  }
  return edges
}
