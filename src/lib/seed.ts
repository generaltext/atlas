// Sample content for the gallery "Try it live" demo, so it opens full instead of
// empty. Only ever runs in demo mode against a throwaway workspace (see store).
// A fictional studio (Saltbark) with six interlinked projects.

import type { Draft } from './events'
import { newId } from './ids'

export async function seedDemo(dispatch: (d: Draft[]) => Promise<void>): Promise<void> {
  const drafts: Draft[] = []

  // ── clients ──────────────────────────────────────────────────────────────
  const trust = newId('cli')
  const alliance = newId('cli')
  const press = newId('cli')
  const harbor = newId('cli')
  const internal = newId('cli')
  drafts.push(
    { type: 'client.create', subject: trust, data: { name: 'Coastal Heritage Trust', website: 'https://coastalheritage.example', location: 'Portland, ME', about: 'Stewards the region’s tidal and maritime archives.' } },
    { type: 'client.create', subject: alliance, data: { name: 'Riverkeeper Alliance', website: 'https://riverkeeper.example', location: 'Hudson Valley, NY', about: 'Water-quality advocacy across the watershed.' } },
    { type: 'client.create', subject: press, data: { name: 'Meridian Press', website: 'https://meridian.example', location: 'Boston, MA', about: 'Independent natural-history publisher.' } },
    { type: 'client.create', subject: harbor, data: { name: 'Harbor Authority', location: 'New Bedford, MA', about: 'Operates the working waterfront and berths.' } },
    { type: 'client.create', subject: internal, data: { name: 'Saltbark (internal)', about: 'Our own shared infrastructure.' } },
  )

  // ── contacts ─────────────────────────────────────────────────────────────
  const maren = newId('con')
  const devin = newId('con')
  const priya = newId('con')
  const tom = newId('con')
  const susan = newId('con')
  drafts.push(
    { type: 'contact.create', subject: maren, data: { name: 'Maren Holt', role: 'Program Director', email: 'maren@coastalheritage.example', client: trust } },
    { type: 'contact.create', subject: devin, data: { name: 'Devin Okafor', role: 'Digital Lead', email: 'devin@coastalheritage.example', client: trust } },
    { type: 'contact.create', subject: priya, data: { name: 'Priya Nair', role: 'Executive Director', email: 'priya@riverkeeper.example', client: alliance } },
    { type: 'contact.create', subject: tom, data: { name: 'Tom Reyes', role: 'Managing Editor', email: 'tom@meridian.example', client: press } },
    { type: 'contact.create', subject: susan, data: { name: 'Susan Delaney', role: 'Operations', email: 'susan@harbor.example', client: harbor } },
  )

  // ── projects ─────────────────────────────────────────────────────────────
  const driftwood = newId('prj')
  const tidewater = newId('prj')
  const shoreline = newId('prj')
  const commonledger = newId('prj')
  const fieldguide = newId('prj')
  const beacon = newId('prj')
  drafts.push(
    { type: 'project.create', subject: driftwood, data: { name: 'Driftwood', type: 'Research', status: 'completed', client: trust, period: '2023', value: 28000, progress: 100, summary: 'Field study of tidal archives along the north shore — the groundwork everything since has drawn on.' } },
    { type: 'project.create', subject: tidewater, data: { name: 'Tidewater', type: 'Interactive atlas', status: 'active', client: trust, period: '2024 – 2026', value: 142000, progress: 74, summary: 'A living coastal atlas — layered depth soundings, historical shorelines, and public storytelling maps for the Trust’s archive.' } },
    { type: 'project.create', subject: shoreline, data: { name: 'Shoreline', type: 'Data pipeline', status: 'active', client: internal, period: '2024 – ongoing', value: 'Internal', progress: 60, summary: 'The shared ingestion & tiling engine spun out of Driftwood. Quietly powers the client work.' } },
    { type: 'project.create', subject: commonledger, data: { name: 'Common Ledger', type: 'Public data portal', status: 'risk', client: alliance, period: '2025 – 2026', value: 96500, progress: 88, summary: 'An open water-quality ledger for the Alliance, built on the Shoreline pipeline and Tidewater’s mapping work.' } },
    { type: 'project.create', subject: fieldguide, data: { name: 'Field Guide', type: 'Publishing tool', status: 'active', client: press, period: '2025 – 2026', value: 74000, progress: 52, summary: 'A structured field-guide authoring tool for the Press — species entries, maps, and print export.' } },
    { type: 'project.create', subject: beacon, data: { name: 'Beacon', type: 'Signage & wayfinding', status: 'active', client: harbor, period: '2026', value: 61000, progress: 38, summary: 'Dynamic harbor wayfinding, drawing on Tidewater’s base maps and public story-map patterns.' } },
  )

  // ── contracts ────────────────────────────────────────────────────────────
  drafts.push(
    { type: 'contract.create', subject: newId('ctr'), data: { title: 'Tidewater — build & maintenance', client: trust, value: 142000, start: '2024-03-01', end: '2026-09-30', status: 'active' } },
    { type: 'contract.create', subject: newId('ctr'), data: { title: 'Common Ledger — portal', client: alliance, value: 96500, start: '2025-01-15', end: '2026-08-31', status: 'active' } },
    { type: 'contract.create', subject: newId('ctr'), data: { title: 'Field Guide — authoring tool', client: press, value: 74000, start: '2025-04-01', end: '2026-12-31', status: 'signed' } },
    { type: 'contract.create', subject: newId('ctr'), data: { title: 'Beacon — wayfinding', client: harbor, value: 61000, start: '2026-02-01', end: '2026-11-30', status: 'active' } },
  )

  // ── deliverables ─────────────────────────────────────────────────────────
  const dlv = (
    projectId: string,
    label: string,
    status: string,
    due: string,
    clientVisible: boolean,
    order: number,
  ) => drafts.push({ type: 'deliverable.create', subject: newId('dlv'), data: { projectId, label, status, due, clientVisible, order } })

  dlv(driftwood, 'Archive survey & method', 'done', 'Apr 2023', true, 0)
  dlv(driftwood, 'Reference dataset', 'done', 'Jul 2023', true, 1)
  dlv(driftwood, 'Closeout report', 'done', 'Aug 2023', true, 2)

  dlv(tidewater, 'Base map & tiling pipeline', 'done', 'May 2024', true, 0)
  dlv(tidewater, 'Historical shoreline overlays', 'done', 'Nov 2024', true, 1)
  dlv(tidewater, 'Depth-sounding layer', 'done', 'Jul 2026', true, 2)
  dlv(tidewater, 'Public story-map builder', 'now', 'Sep 2026', true, 3)
  dlv(tidewater, 'Handover & training', 'todo', 'Sep 2026', false, 4)

  dlv(shoreline, 'Ingestion core', 'done', 'Sep 2024', false, 0)
  dlv(shoreline, 'Tiling service', 'done', 'Feb 2025', false, 1)
  dlv(shoreline, 'Multi-project support', 'now', 'Aug 2026', false, 2)

  dlv(commonledger, 'Data model & ETL', 'done', 'Apr 2025', true, 0)
  dlv(commonledger, 'Public portal', 'done', 'Dec 2025', true, 1)
  dlv(commonledger, 'Sampling map', 'now', 'Aug 2026', true, 2)
  dlv(commonledger, 'Open API', 'todo', 'Aug 2026', true, 3)

  dlv(fieldguide, 'Entry editor', 'done', 'Aug 2025', true, 0)
  dlv(fieldguide, 'Map embeds', 'done', 'Feb 2026', true, 1)
  dlv(fieldguide, 'Print export', 'now', 'Oct 2026', true, 2)

  dlv(beacon, 'Sign inventory', 'done', 'Apr 2026', true, 0)
  dlv(beacon, 'Map integration', 'now', 'Aug 2026', true, 1)
  dlv(beacon, 'Live status feed', 'todo', 'Nov 2026', true, 2)

  // ── milestones ───────────────────────────────────────────────────────────
  const mst = (
    projectId: string,
    when: string,
    label: string,
    desc: string,
    status: string,
    clientVisible: boolean,
    order: number,
  ) => drafts.push({ type: 'milestone.create', subject: newId('mst'), data: { projectId, when, label, desc, status, clientVisible, order } })

  mst(driftwood, 'Feb 2023', 'Kickoff', 'Scope set with the Trust.', 'done', true, 0)
  mst(driftwood, 'Apr 2023', 'Survey complete', '112 tidal sites catalogued.', 'done', true, 1)
  mst(driftwood, 'Aug 2023', 'Delivered', 'Archive + method handed off.', 'done', true, 2)

  mst(tidewater, 'Mar 2024', 'Kickoff', 'Built on the Driftwood archive.', 'done', true, 0)
  mst(tidewater, 'Nov 2024', 'Overlays shipped', 'Four historical shorelines, 1840–2020.', 'done', true, 1)
  mst(tidewater, 'Jul 2026', 'Depth soundings live', 'Layered bathymetry from the reference dataset.', 'done', true, 2)
  mst(tidewater, 'Sep 2026', 'Story-map builder', 'Public authoring tool — in progress.', 'next', true, 3)
  mst(tidewater, 'Sep 2026', 'Handover', 'Training + documentation.', 'todo', false, 4)

  mst(commonledger, 'Jan 2025', 'Kickoff', 'Reused Shoreline from day one.', 'done', true, 0)
  mst(commonledger, 'Dec 2025', 'Portal launched', 'Public water-quality ledger live.', 'done', true, 1)
  mst(commonledger, 'Aug 2026', 'Sampling map', 'Blocked on a data-sharing agreement.', 'next', true, 2)

  mst(beacon, 'Feb 2026', 'Kickoff', 'Base maps from Tidewater.', 'done', true, 0)
  mst(beacon, 'Aug 2026', 'Map integration', 'Wayfinding on Tidewater tiles.', 'next', true, 1)
  mst(beacon, 'Nov 2026', 'Live feed', 'Real-time berth status.', 'todo', true, 2)

  // ── resources ────────────────────────────────────────────────────────────
  const res = (
    projectId: string,
    label: string,
    url: string,
    type: string,
    clientVisible: boolean,
    note = '',
  ) => drafts.push({ type: 'resource.create', subject: newId('res'), data: { projectId, label, url, type, clientVisible, note } })

  res(tidewater, 'tidewater-atlas', 'https://github.com/saltbark/tidewater-atlas', 'repo', false)
  res(tidewater, 'tidewater-worker', 'https://github.com/saltbark/tidewater-worker', 'repo', false)
  res(tidewater, 'Live atlas', 'https://atlas.coastalheritage.example', 'deploy', true, 'The public coastal atlas.')
  res(tidewater, 'Depth soundings dataset', 'https://data.saltbark.example/tidewater/soundings', 'dataset', true)
  res(tidewater, 'Design system', 'https://figma.example/tidewater', 'design', false)
  res(driftwood, 'Reference dataset', 'https://data.saltbark.example/driftwood', 'dataset', true)
  res(commonledger, 'common-ledger', 'https://github.com/saltbark/common-ledger', 'repo', false)
  res(commonledger, 'Water-quality portal', 'https://ledger.riverkeeper.example', 'deploy', true)
  res(beacon, 'beacon', 'https://github.com/saltbark/beacon', 'repo', false)

  // ── update log (agent- and human-authored) ─────────────────────────────────
  const log = (
    projectId: string,
    at: string,
    title: string,
    commits: number,
    repo: string,
    hash: string,
    source: string,
    clientVisible: boolean,
    body = '',
  ) => drafts.push({ type: 'log.create', subject: newId('log'), data: { projectId, at, title, commits, repo, hash, source, clientVisible, body } })

  log(tidewater, '2026-07-14', 'Layered depth-sounding overlay shipped', 12, 'tidewater-atlas', 'a3f9c1', 'agent', true)
  log(tidewater, '2026-07-11', 'Story-map builder — draft authoring UI', 18, 'tidewater-atlas', '7e21b8', 'agent', true)
  log(tidewater, '2026-07-08', 'Tile pipeline: 40% faster rebuilds', 7, 'tidewater-worker', 'b90c44', 'agent', false)
  log(tidewater, '2026-07-02', 'Imported 1902 survey into overlays', 5, 'tidewater-data', '1f6ad0', 'agent', true)
  log(commonledger, '2026-07-12', 'Portal: sampling-site clustering', 9, 'common-ledger', 'ff3a10', 'agent', true)
  log(commonledger, '2026-06-29', 'ETL adapted from Shoreline v3', 14, 'common-ledger-etl', '82b7c9', 'agent', false)
  log(fieldguide, '2026-07-10', 'Print export: two-column flow', 10, 'field-guide', '6c02a4', 'agent', true)
  log(beacon, '2026-07-09', 'Pull Tidewater base tiles into signage', 7, 'beacon', 'd5e881', 'agent', true)
  log(shoreline, '2026-07-13', 'Cache layer for tile requests', 8, 'shoreline', '44c1de', 'agent', false)

  // ── lineage (directed edges) ───────────────────────────────────────────────
  const lin = (from: string, to: string, kind: string, clientVisible: boolean, note = '') =>
    drafts.push({ type: 'lineage.add', subject: newId('lin'), data: { from, to, kind, clientVisible, note } })

  lin(driftwood, tidewater, 'seeded', true, 'The reference dataset became the atlas foundation.')
  lin(driftwood, shoreline, 'seeded', false)
  lin(tidewater, shoreline, 'extracted', false)
  lin(shoreline, commonledger, 'reused', false)
  lin(tidewater, commonledger, 'informed', true)
  lin(shoreline, fieldguide, 'reused', false)
  lin(tidewater, beacon, 'reused', true)

  // ── suggestions (agent-proposed, awaiting approval) ────────────────────────
  const sug = (
    projectId: string,
    op: string,
    draftType: string,
    draftData: Record<string, unknown>,
    rationale: string,
    at: string,
    draftSubject = '',
  ) => drafts.push({ type: 'suggestion.create', subject: newId('sug'), data: { projectId, op, draftType, draftSubject, draftData, rationale, source: 'agent', at } })

  sug(
    beacon,
    'New update-log entry',
    'log.create',
    { projectId: beacon, at: '2026-07-16', title: 'Berth-status API prototype', source: 'agent', commits: 6, repo: 'beacon', hash: 'e70a12', clientVisible: true, body: '' },
    'Detected 6 commits under a new `api/` module referencing berth status.',
    '2026-07-16',
  )
  sug(
    tidewater,
    'New deliverable',
    'deliverable.create',
    { projectId: tidewater, label: 'Accessibility pass', status: 'todo', due: 'Sep 2026', clientVisible: false, order: 5 },
    'PRs mention WCAG and keyboard nav; looks like a scoped piece of work not yet tracked.',
    '2026-07-15',
  )
  sug(
    commonledger,
    'Update status',
    'project.update',
    { status: 'active' },
    'The data-sharing agreement was referenced as signed in recent commits — this may no longer be at risk.',
    '2026-07-14',
    commonledger,
  )

  await dispatch(drafts)
}
