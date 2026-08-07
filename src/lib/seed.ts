// Sample content for the gallery "Try it live" demo (and local dev), so Atlas opens
// full instead of empty. Only ever runs against a throwaway/empty workspace (see
// store). A small studio (Saltbark) with five interlinked projects; the lineage
// graph is derived from the @mentions embedded in each project's context.

import type { Draft } from './events'
import { newId } from './ids'
import { mentionToken } from './mentions'

export async function seedDemo(dispatch: (d: Draft[]) => Promise<void>): Promise<void> {
  const drafts: Draft[] = []

  // clients
  const trust = newId('cli')
  const alliance = newId('cli')
  const harbor = newId('cli')
  drafts.push(
    {
      type: 'client.create',
      subject: trust,
      data: {
        name: 'Coastal Heritage Trust',
        about: 'Stewards the region’s tidal and maritime archives.',
      },
    },
    {
      type: 'client.create',
      subject: alliance,
      data: { name: 'Riverkeeper Alliance', about: 'Water-quality advocacy across the watershed.' },
    },
    {
      type: 'client.create',
      subject: harbor,
      data: { name: 'Harbor Authority', about: 'Operates the working waterfront.' },
    },
  )

  // contacts
  const maren = newId('con')
  const priya = newId('con')
  const susan = newId('con')
  drafts.push(
    {
      type: 'contact.create',
      subject: maren,
      data: {
        name: 'Maren Holt',
        role: 'Program Director',
        email: 'maren@coastalheritage.example',
      },
    },
    {
      type: 'contact.create',
      subject: priya,
      data: { name: 'Priya Nair', role: 'Executive Director', email: 'priya@riverkeeper.example' },
    },
    {
      type: 'contact.create',
      subject: susan,
      data: { name: 'Susan Delaney', role: 'Operations', email: 'susan@harbor.example' },
    },
  )

  // projects (ids first, so contexts can @mention each other)
  const driftwood = newId('prj')
  const tidewater = newId('prj')
  const shoreline = newId('prj')
  const commonledger = newId('prj')
  const beacon = newId('prj')

  drafts.push(
    {
      type: 'project.create',
      subject: driftwood,
      data: {
        name: 'Driftwood',
        client: trust,
        start: '2023-02-01',
        end: '2023-08-31',
        status: 'done',
        context:
          'Field study of tidal archives along the north shore — the groundwork everything since has drawn on.',
      },
    },
    {
      type: 'project.create',
      subject: tidewater,
      data: {
        name: 'Tidewater',
        client: trust,
        start: '2024-03-01',
        end: '2026-09-30',
        status: 'active',
        context: `A living coastal atlas. Grew out of ${mentionToken(driftwood, 'Driftwood')} — its reference dataset became the atlas foundation.`,
      },
    },
    {
      type: 'project.create',
      subject: shoreline,
      data: {
        name: 'Shoreline',
        start: '2024-06-01',
        end: '',
        status: 'active',
        context: `The shared ingestion & tiling engine, extracted from ${mentionToken(tidewater, 'Tidewater')} so the client work could reuse it.`,
      },
    },
    {
      type: 'project.create',
      subject: commonledger,
      data: {
        name: 'Common Ledger',
        client: alliance,
        start: '2025-01-15',
        end: '2026-08-31',
        status: 'risk',
        context: `An open water-quality ledger, built on the ${mentionToken(shoreline, 'Shoreline')} pipeline and ${mentionToken(tidewater, 'Tidewater')} mapping work.`,
      },
    },
    {
      type: 'project.create',
      subject: beacon,
      data: {
        name: 'Beacon',
        client: harbor,
        start: '2026-02-01',
        end: '2026-11-30',
        status: 'active',
        context: `Dynamic harbor wayfinding that reuses ${mentionToken(tidewater, 'Tidewater')} base maps and story-map patterns.`,
      },
    },
  )

  // contacts ↔ projects
  drafts.push(
    { type: 'link.add', subject: tidewater, data: { to: maren } },
    { type: 'link.add', subject: driftwood, data: { to: maren } },
    { type: 'link.add', subject: commonledger, data: { to: priya } },
    { type: 'link.add', subject: beacon, data: { to: susan } },
  )

  // deliverables — a mix of reference links, delivered items, and due items
  const dlv = (
    projectId: string,
    label: string,
    url: string,
    kind: string,
    order: number,
    date = '',
  ) =>
    drafts.push({
      type: 'deliverable.create',
      subject: newId('dlv'),
      data: {
        projectId,
        label,
        url,
        kind,
        order,
        ...(kind === 'delivered'
          ? { deliveredDate: date }
          : kind === 'due'
            ? { dueDate: date }
            : {}),
      },
    })
  dlv(tidewater, 'tidewater-atlas', 'https://github.com/saltbark/tidewater-atlas', 'reference', 0)
  dlv(
    tidewater,
    'Live coastal atlas',
    'https://atlas.coastalheritage.example',
    'delivered',
    1,
    '2026-05-20',
  )
  dlv(
    tidewater,
    'Public story-map builder',
    'https://atlas.coastalheritage.example/build',
    'due',
    2,
    '2026-09-30',
  )
  dlv(
    commonledger,
    'Water-quality portal',
    'https://ledger.riverkeeper.example',
    'delivered',
    0,
    '2025-12-10',
  )
  dlv(commonledger, 'Open API', '', 'due', 1, '2026-08-31')
  dlv(beacon, 'beacon', 'https://github.com/saltbark/beacon', 'reference', 0)
  dlv(
    beacon,
    'Sign inventory sheet',
    'https://data.saltbark.example/beacon',
    'delivered',
    1,
    '2026-04-15',
  )

  // roadmap
  const mst = (
    projectId: string,
    when: string,
    label: string,
    desc: string,
    status: string,
    order: number,
  ) =>
    drafts.push({
      type: 'milestone.create',
      subject: newId('mst'),
      data: { projectId, when, label, desc, status, order },
    })
  mst(
    tidewater,
    'Nov 2024',
    'Overlays shipped',
    'Four historical shorelines, 1840–2020.',
    'done',
    0,
  )
  mst(
    tidewater,
    'Jul 2026',
    'Depth soundings live',
    'Layered bathymetry from the reference dataset.',
    'done',
    1,
  )
  mst(tidewater, 'Sep 2026', 'Story-map builder', 'Public authoring tool.', 'next', 2)
  mst(commonledger, 'Dec 2025', 'Portal launched', 'Public water-quality ledger live.', 'done', 0)
  mst(commonledger, 'Aug 2026', 'Sampling map', 'Blocked on a data-sharing agreement.', 'next', 1)
  mst(beacon, 'Aug 2026', 'Map integration', 'Wayfinding on Tidewater tiles.', 'next', 0)

  // update log (some manual, some agent-pushed)
  const log = (projectId: string, at: string, title: string, source: string, body = '') =>
    drafts.push({
      type: 'log.create',
      subject: newId('log'),
      data: { projectId, at, title, source, body },
    })
  log(
    tidewater,
    '2026-07-14',
    'Shipped the layered depth-sounding overlay',
    'agent',
    'From 12 commits across tidewater-atlas.',
  )
  log(
    tidewater,
    '2026-07-11',
    'Story-map builder — draft authoring UI',
    'agent',
    'From 18 commits.',
  )
  log(
    tidewater,
    '2026-07-02',
    'Kickoff notes with Maren',
    'manual',
    'Wants the public builder before the fall season.',
  )
  log(commonledger, '2026-07-12', 'Portal: sampling-site clustering', 'agent')
  log(beacon, '2026-07-09', 'Pulled Tidewater base tiles into signage', 'agent')

  await dispatch(drafts)
}
