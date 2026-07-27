// The entity model. Entity *kinds* (project/client/contact/contract) are declared
// here as data so views, forms, and the command bar are driven by one registry —
// adding a field is a one-line change, and a new kind is a new entry plus a route.
//
// Deliverables, milestones, resources, lineage edges, and update-log entries are
// specialized child records handled directly by the reducer (they carry a
// projectId and their own shapes), not by this generic field machinery.

export type EntityKind = 'project' | 'client' | 'contact' | 'contract'

export type FieldType =
  | 'text'
  | 'rich'
  | 'number'
  | 'money'
  | 'email'
  | 'url'
  | 'ref'
  | 'date'
  | 'select'

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

export const PROJECT_STATUSES: SelectOption[] = [
  { key: 'active', label: 'Active' },
  { key: 'risk', label: 'At risk' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
]

export const CONTRACT_STATUSES: SelectOption[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'signed', label: 'Signed' },
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' },
]

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
      { key: 'type', label: 'Type', type: 'text', placeholder: 'e.g. Interactive atlas' },
      { key: 'status', label: 'Status', type: 'select', options: PROJECT_STATUSES },
      { key: 'client', label: 'Client', type: 'ref', refKind: 'client' },
      { key: 'period', label: 'Period', type: 'text', placeholder: 'e.g. 2024 – 2026' },
      { key: 'value', label: 'Contract value', type: 'money', placeholder: '0' },
      { key: 'progress', label: 'Timeline elapsed (%)', type: 'number', placeholder: '0' },
      { key: 'summary', label: 'Summary', type: 'rich' },
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
      { key: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
      { key: 'location', label: 'Location', type: 'text' },
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
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'client', label: 'Client', type: 'ref', refKind: 'client' },
    ],
  },
  contract: {
    kind: 'contract',
    prefix: 'ctr',
    singular: 'Contract',
    plural: 'Contracts',
    icon: 'FileText',
    route: 'contracts',
    fields: [
      { key: 'title', label: 'Title', type: 'text', title: true, placeholder: 'Contract name' },
      { key: 'client', label: 'Client', type: 'ref', refKind: 'client' },
      { key: 'value', label: 'Value', type: 'money', placeholder: '0' },
      { key: 'start', label: 'Start', type: 'date' },
      { key: 'end', label: 'End', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: CONTRACT_STATUSES },
      { key: 'terms', label: 'Terms', type: 'rich' },
    ],
  },
}

export const KIND_LIST: KindDef[] = [KINDS.project, KINDS.client, KINDS.contact, KINDS.contract]

export function kindOfId(id: string): EntityKind | null {
  const p = id.slice(0, id.indexOf('_'))
  for (const k of KIND_LIST) if (k.prefix === p) return k.kind
  return null
}

export function titleField(kind: EntityKind): string {
  return KINDS[kind].fields.find((f) => f.title)?.key ?? 'name'
}

// ── child-record vocabularies ────────────────────────────────────────────────

/** Deliverable / milestone status. `now` = in progress. */
export type ItemStatus = 'todo' | 'now' | 'done'
export type MilestoneStatus = 'todo' | 'next' | 'done'

export const RESOURCE_TYPES: SelectOption[] = [
  { key: 'repo', label: 'Repository' },
  { key: 'deploy', label: 'Deployed site' },
  { key: 'design', label: 'Design file' },
  { key: 'doc', label: 'Document' },
  { key: 'dataset', label: 'Dataset' },
  { key: 'contract', label: 'Contract' },
  { key: 'report', label: 'Report' },
  { key: 'link', label: 'Link' },
]

/** lucide icon per resource type. */
export const RESOURCE_ICONS: Record<string, string> = {
  repo: 'GitBranch',
  deploy: 'Globe',
  design: 'PenTool',
  doc: 'FileText',
  dataset: 'Database',
  contract: 'FileSignature',
  report: 'FileBarChart',
  link: 'Link',
}

export const LINEAGE_KINDS: SelectOption[] = [
  { key: 'seeded', label: 'seeded' },
  { key: 'extracted', label: 'extracted' },
  { key: 'reused', label: 'reused by' },
  { key: 'informed', label: 'informed' },
  { key: 'forked', label: 'forked into' },
]

// ── Config (project-status palette + resource palette), stored in v0/config.json ─

/** tone drives the pill/dot color: good → green, warn → amber, info → marine, muted → grey. */
export type Tone = 'good' | 'warn' | 'info' | 'muted'

export interface Config {
  /** status key → display tone, so palettes are editable without a code change */
  statusTone: Record<string, Tone>
}

export const DEFAULT_CONFIG: Config = {
  statusTone: {
    active: 'good',
    risk: 'warn',
    completed: 'info',
    archived: 'muted',
    signed: 'good',
    draft: 'muted',
    closed: 'info',
  },
}

export function statusTone(key: string, config: Config): Tone {
  return config.statusTone[key] ?? 'muted'
}

export function statusLabel(key: string): string {
  const all = [...PROJECT_STATUSES, ...CONTRACT_STATUSES]
  return all.find((s) => s.key === key)?.label ?? key
}
