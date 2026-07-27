// The projection: fold the event log into current-state records. Application is
// idempotent (each event id applied at most once) so re-folding a shard tail, or
// seeing our own optimistic write echoed back by the watch, is always safe.
//
// Field conflicts resolve last-writer-wins by log order; on a full rebuild the
// log is applied in file order, and appends are monotonic, so later events
// overwrite earlier ones.

import type { Actor, AtlasEvent } from './events'
import type { EntityKind, ItemStatus, MilestoneStatus } from './model'
import { kindOfId } from './model'

export interface EntityRecord {
  id: string
  kind: EntityKind
  fields: Record<string, string | number>
  tags: string[]
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

export interface Deliverable extends ChildBase {
  id: string
  projectId: string
  label: string
  status: ItemStatus
  due: string
  clientVisible: boolean
  order: number
}

export interface Milestone extends ChildBase {
  id: string
  projectId: string
  when: string
  label: string
  desc: string
  status: MilestoneStatus
  clientVisible: boolean
  order: number
}

export interface Resource extends ChildBase {
  id: string
  projectId: string
  label: string
  url: string
  type: string
  note: string
  clientVisible: boolean
}

export interface LineageEdge extends ChildBase {
  id: string
  from: string
  to: string
  kind: string
  note: string
  clientVisible: boolean
}

export interface LogEntry extends ChildBase {
  id: string
  projectId: string
  title: string
  body: string
  source: 'agent' | 'human'
  commits: number
  repo: string
  hash: string
  at: string
  clientVisible: boolean
}

/** A proposed change (usually from the ingest agent) awaiting human approval.
 *  The default path is manual entry; suggestions are additive and gated. */
export interface Suggestion extends ChildBase {
  id: string
  /** project this concerns, or '' if not project-scoped */
  projectId: string
  /** human-readable label, e.g. "New update-log entry" */
  op: string
  /** the event type to dispatch when approved, e.g. 'log.create' */
  draftType: string
  /** target record id, or '' to mint one on approve (creates) */
  draftSubject: string
  draftData: Record<string, unknown>
  rationale: string
  source: 'agent' | 'human'
  status: 'pending' | 'approved' | 'dismissed'
  at: string
}

export interface State {
  entities: Record<string, EntityRecord>
  deliverables: Record<string, Deliverable>
  milestones: Record<string, Milestone>
  resources: Record<string, Resource>
  lineage: Record<string, LineageEdge>
  logEntries: Record<string, LogEntry>
  suggestions: Record<string, Suggestion>
  /** every applied event, in application order, for the activity feed */
  events: AtlasEvent[]
  applied: Set<string>
}

export function emptyState(): State {
  return {
    entities: {},
    deliverables: {},
    milestones: {},
    resources: {},
    lineage: {},
    logEntries: {},
    suggestions: {},
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
    case 'contract':
      applyEntity(state, ev, verb, data)
      break
    case 'deliverable':
      applyDeliverable(state, ev, verb, data)
      break
    case 'milestone':
      applyMilestone(state, ev, verb, data)
      break
    case 'resource':
      applyResource(state, ev, verb, data)
      break
    case 'log':
      applyLog(state, ev, verb, data)
      break
    case 'lineage':
      applyLineage(state, ev, verb, data)
      break
    case 'suggestion':
      applySuggestion(state, ev, verb, data)
      break
    case 'link':
      applyLink(state, ev, verb, data)
      break
    default:
      // Unknown event type from a newer build: recorded in events (activity),
      // otherwise ignored. Forward-compatible by design.
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
      tags: [],
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

// ── deliverables ──────────────────────────────────────────────────────────────

function applyDeliverable(
  state: State,
  ev: AtlasEvent,
  verb: string,
  data: Record<string, unknown>,
): void {
  if (verb === 'create') {
    if (state.deliverables[ev.subject]) return
    const status = asString(data.status)
    state.deliverables[ev.subject] = {
      id: ev.subject,
      projectId: asString(data.projectId),
      label: asString(data.label),
      status: (status === 'now' || status === 'done' ? status : 'todo') as ItemStatus,
      due: asString(data.due),
      clientVisible: asBool(data.clientVisible),
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
    if ('due' in data) rec.due = asString(data.due)
    if ('order' in data) rec.order = asNum(data.order)
    if ('clientVisible' in data) rec.clientVisible = asBool(data.clientVisible)
    if ('status' in data) {
      const s = asString(data.status)
      if (s === 'todo' || s === 'now' || s === 'done') rec.status = s
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

// ── milestones ────────────────────────────────────────────────────────────────

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
      clientVisible: asBool(data.clientVisible),
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
    if ('clientVisible' in data) rec.clientVisible = asBool(data.clientVisible)
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

// ── resources ─────────────────────────────────────────────────────────────────

function applyResource(
  state: State,
  ev: AtlasEvent,
  verb: string,
  data: Record<string, unknown>,
): void {
  if (verb === 'create') {
    if (state.resources[ev.subject]) return
    state.resources[ev.subject] = {
      id: ev.subject,
      projectId: asString(data.projectId),
      label: asString(data.label),
      url: asString(data.url),
      type: asString(data.type) || 'link',
      note: asString(data.note),
      clientVisible: asBool(data.clientVisible),
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }
  const rec = state.resources[ev.subject]
  if (!rec) return
  if (verb === 'update') {
    if ('label' in data) rec.label = asString(data.label)
    if ('url' in data) rec.url = asString(data.url)
    if ('type' in data) rec.type = asString(data.type) || 'link'
    if ('note' in data) rec.note = asString(data.note)
    if ('clientVisible' in data) rec.clientVisible = asBool(data.clientVisible)
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
      title: asString(data.title),
      body: asString(data.body),
      source: source === 'agent' ? 'agent' : 'human',
      commits: asNum(data.commits),
      repo: asString(data.repo),
      hash: asString(data.hash),
      at: asString(data.at) || ev.ts,
      clientVisible: asBool(data.clientVisible),
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
    if ('clientVisible' in data) rec.clientVisible = asBool(data.clientVisible)
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

// ── lineage edges (directed) ──────────────────────────────────────────────────

function applyLineage(
  state: State,
  ev: AtlasEvent,
  verb: string,
  data: Record<string, unknown>,
): void {
  if (verb === 'add') {
    if (state.lineage[ev.subject]) return
    state.lineage[ev.subject] = {
      id: ev.subject,
      from: asString(data.from),
      to: asString(data.to),
      kind: asString(data.kind) || 'reused',
      note: asString(data.note),
      clientVisible: asBool(data.clientVisible),
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }
  const rec = state.lineage[ev.subject]
  if (!rec) return
  if (verb === 'update') {
    if ('kind' in data) rec.kind = asString(data.kind) || rec.kind
    if ('note' in data) rec.note = asString(data.note)
    if ('clientVisible' in data) rec.clientVisible = asBool(data.clientVisible)
    touch(rec, ev)
  } else if (verb === 'remove') {
    rec.archived = true
    touch(rec, ev)
  }
}

// ── suggestions (agent-proposed, human-approved) ──────────────────────────────

function applySuggestion(
  state: State,
  ev: AtlasEvent,
  verb: string,
  data: Record<string, unknown>,
): void {
  if (verb === 'create') {
    if (state.suggestions[ev.subject]) return
    const source = asString(data.source)
    state.suggestions[ev.subject] = {
      id: ev.subject,
      projectId: asString(data.projectId),
      op: asString(data.op),
      draftType: asString(data.draftType),
      draftSubject: asString(data.draftSubject),
      draftData:
        data.draftData && typeof data.draftData === 'object'
          ? (data.draftData as Record<string, unknown>)
          : {},
      rationale: asString(data.rationale),
      source: source === 'human' ? 'human' : 'agent',
      status: 'pending',
      at: asString(data.at) || ev.ts,
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }
  const rec = state.suggestions[ev.subject]
  if (!rec) return
  if (verb === 'approve') {
    rec.status = 'approved'
    touch(rec, ev)
  } else if (verb === 'dismiss') {
    rec.status = 'dismissed'
    touch(rec, ev)
  }
}

// ── generic entity many-to-many links (kept for forward-compat) ────────────────

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

export function fieldNum(rec: EntityRecord | undefined, key: string): number {
  const v = rec?.fields[key]
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function refName(state: State, id: string): string {
  const rec = state.entities[id]
  if (!rec) return ''
  return fieldStr(rec, 'name') || fieldStr(rec, 'title')
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

export function resourcesForProject(state: State, projectId: string): Resource[] {
  return Object.values(state.resources)
    .filter((r) => r.projectId === projectId && !r.archived)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}

export function logForProject(state: State, projectId: string): LogEntry[] {
  return Object.values(state.logEntries)
    .filter((l) => l.projectId === projectId && !l.archived)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : b.createdAt < a.createdAt ? -1 : 1))
}

export function recentLog(state: State, limit = 12): LogEntry[] {
  return Object.values(state.logEntries)
    .filter((l) => !l.archived)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : b.createdAt < a.createdAt ? -1 : 1))
    .slice(0, limit)
}

export function edgesOf(state: State): LineageEdge[] {
  return Object.values(state.lineage).filter((e) => !e.archived)
}

export function childrenOf(state: State, projectId: string): LineageEdge[] {
  return edgesOf(state).filter((e) => e.from === projectId)
}

export function parentsOf(state: State, projectId: string): LineageEdge[] {
  return edgesOf(state).filter((e) => e.to === projectId)
}

/** the full lineage of a project: itself + all ancestors + all descendants. */
export function lineageSetFor(state: State, projectId: string): Set<string> {
  const edges = edgesOf(state)
  const set = new Set<string>([projectId])
  const up = (id: string) => {
    for (const e of edges)
      if (e.to === id && !set.has(e.from)) {
        set.add(e.from)
        up(e.from)
      }
  }
  const down = (id: string) => {
    for (const e of edges)
      if (e.from === id && !set.has(e.to)) {
        set.add(e.to)
        down(e.to)
      }
  }
  up(projectId)
  down(projectId)
  return set
}

export interface DeliverableStats {
  done: number
  total: number
}

export function deliverableStats(state: State, projectId: string): DeliverableStats {
  const ds = deliverablesForProject(state, projectId)
  return { done: ds.filter((d) => d.status === 'done').length, total: ds.length }
}

export function nextMilestone(state: State, projectId: string): Milestone | null {
  const ms = milestonesForProject(state, projectId)
  return ms.find((m) => m.status === 'next') ?? ms.find((m) => m.status === 'todo') ?? null
}

export function pendingSuggestions(state: State): Suggestion[] {
  return Object.values(state.suggestions)
    .filter((s) => s.status === 'pending')
    .sort((a, b) => (a.at < b.at ? 1 : -1))
}

export function pendingSuggestionsForProject(state: State, projectId: string): Suggestion[] {
  return pendingSuggestions(state).filter((s) => s.projectId === projectId)
}

/** id prefix to mint when approving a "create" suggestion whose subject is blank. */
export function prefixForType(draftType: string): string {
  const entity = draftType.split('.')[0] ?? ''
  const map: Record<string, string> = {
    project: 'prj',
    client: 'cli',
    contact: 'con',
    contract: 'ctr',
    deliverable: 'dlv',
    milestone: 'mst',
    resource: 'res',
    log: 'log',
    lineage: 'lin',
  }
  return map[entity] ?? 'rec'
}
