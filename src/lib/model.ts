// The entity model. Kinds (project/client/contact) are declared as data so views
// and the mention search are driven by one registry. Deliverables, roadmap
// milestones, and update-log entries are per-project child records handled by the
// reducer. The lineage graph is NOT stored — it is DERIVED from @mentions in each
// project's freeform `context` field (see reducer: graphEdges).

export type EntityKind = 'project' | 'client' | 'contact'

export type FieldType =
  | 'text'
  | 'rich'
  | 'email'
  | 'url'
  | 'ref'
  | 'date'
  | 'select'
  | 'mentions'

export interface SelectOption {
  key: string
  label: string
}

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  /** the field that titles the record (shown as its name everywhere) */
  title?: boolean
  /** for type 'ref': which kind this points at */
  refKind?: EntityKind
  /** for type 'select': the allowed options */
  options?: SelectOption[]
  placeholder?: string
}

export interface KindDef {
  kind: EntityKind
  /** id prefix, e.g. 'prj' → prj_01J… */
  prefix: string
  singular: string
  plural: string
  /** lucide-react icon name */
  icon: string
  /** hash route segment, e.g. 'projects' */
  route: string
  fields: FieldDef[]
}

export const KINDS: Record<EntityKind, KindDef> = {
  project: {
    kind: 'project',
    prefix: 'prj',
    singular: 'Project',
    plural: 'Projects',
    icon: 'FolderGit2',
    route: 'projects',
    fields: [
      { key: 'name', label: 'Name', type: 'text', title: true, placeholder: 'Project name' },
      { key: 'client', label: 'Client', type: 'ref', refKind: 'client' },
      { key: 'lead', label: 'Lead', type: 'ref', refKind: 'contact' },
      { key: 'start', label: 'Start', type: 'date' },
      { key: 'end', label: 'End', type: 'date' },
      { key: 'status', label: 'Status', type: 'select' },
      { key: 'context', label: 'Context', type: 'mentions' },
    ],
  },
  client: {
    kind: 'client',
    prefix: 'cli',
    singular: 'Client',
    plural: 'Clients',
    icon: 'Building2',
    route: 'clients',
    fields: [
      { key: 'name', label: 'Name', type: 'text', title: true, placeholder: 'Client name' },
      { key: 'about', label: 'About', type: 'rich' },
    ],
  },
  contact: {
    kind: 'contact',
    prefix: 'con',
    singular: 'Contact',
    plural: 'Contacts',
    icon: 'User',
    route: 'contacts',
    fields: [
      { key: 'name', label: 'Name', type: 'text', title: true, placeholder: 'Full name' },
      { key: 'role', label: 'Role', type: 'text', placeholder: 'Title or role' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'name@example.com' },
    ],
  },
}

export const KIND_LIST: KindDef[] = [KINDS.project, KINDS.client, KINDS.contact]

export function kindOfId(id: string): EntityKind | null {
  const p = id.slice(0, id.indexOf('_'))
  for (const k of KIND_LIST) if (k.prefix === p) return k.kind
  return null
}

export function titleField(kind: EntityKind): string {
  return KINDS[kind].fields.find((f) => f.title)?.key ?? 'name'
}

// ── child-record vocabularies ────────────────────────────────────────────────

/** Roadmap milestone status. `next` = the one currently in focus. */
export type MilestoneStatus = 'todo' | 'next' | 'done'

/** Where an update-log entry came from. */
export type LogSource = 'manual' | 'agent'

/** A deliverable's kind: a plain reference link, something committed/due (optional
 *  date), or delivered (with a delivered date). Replaces a simple done checkbox. */
export type DeliverableKind = 'reference' | 'due' | 'delivered'

export interface DeliverableKindDef {
  key: DeliverableKind
  label: string
  icon: string
  colorVar: string
}
export const DELIVERABLE_KINDS: DeliverableKindDef[] = [
  { key: 'reference', label: 'Reference', icon: 'Link', colorVar: '--faint' },
  { key: 'due', label: 'Due', icon: 'Clock', colorVar: '--warn' },
  { key: 'delivered', label: 'Delivered', icon: 'CheckCircle2', colorVar: '--good' },
]
export function deliverableKindDef(kind: string): DeliverableKindDef {
  return DELIVERABLE_KINDS.find((k) => k.key === kind) ?? DELIVERABLE_KINDS[0]!
}

// ── Config (project statuses: label + color), stored in v0/config.json ────────
//
// Statuses are USER-CONFIGURABLE (name + color) via the Settings tab, so they live
// in config rather than hardcoded. Milestone statuses (todo/next/done) are a fixed,
// separate vocabulary and are NOT configured here.

/** The swatches a status color can be — each maps to a palette CSS variable. */
export interface StatusColorDef {
  key: string
  label: string
  var: string
}
export const STATUS_COLORS: StatusColorDef[] = [
  { key: 'green', label: 'Green', var: '--good' },
  { key: 'teal', label: 'Teal', var: '--st-teal' },
  { key: 'sky', label: 'Sky', var: '--st-sky' },
  { key: 'marine', label: 'Marine', var: '--info' },
  { key: 'violet', label: 'Violet', var: '--st-violet' },
  { key: 'amber', label: 'Amber', var: '--warn' },
  { key: 'brass', label: 'Brass', var: '--brass' },
  { key: 'red', label: 'Red', var: '--crit' },
  { key: 'grey', label: 'Grey', var: '--muted' },
]

export function colorVarName(color: string): string {
  return STATUS_COLORS.find((c) => c.key === color)?.var ?? '--muted'
}

export interface StatusDef {
  key: string
  label: string
  color: string
}

export interface Config {
  statuses: StatusDef[]
  /** status key new projects start with */
  defaultStatus: string
}

export const DEFAULT_CONFIG: Config = {
  statuses: [
    { key: 'active', label: 'Active', color: 'green' },
    { key: 'risk', label: 'At risk', color: 'amber' },
    { key: 'hold', label: 'On hold', color: 'amber' },
    { key: 'done', label: 'Delivered', color: 'marine' },
    { key: 'archived', label: 'Archived', color: 'grey' },
  ],
  defaultStatus: 'active',
}

export function statusDef(config: Config, key: string): StatusDef | undefined {
  return config.statuses.find((s) => s.key === key)
}

export function statusLabel(config: Config, key: string): string {
  return statusDef(config, key)?.label ?? key
}

/** The palette CSS variable NAME (e.g. `--good`) for a status's color. */
export function statusColorVarName(config: Config, key: string): string {
  const s = statusDef(config, key)
  return s ? colorVarName(s.color) : '--muted'
}

export function statusOptions(config: Config): SelectOption[] {
  return config.statuses.map((s) => ({ key: s.key, label: s.label }))
}
