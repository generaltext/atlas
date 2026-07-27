import { describe, expect, it } from 'vitest'
import {
  applyEvent,
  emptyState,
  deliverablesForProject,
  graphEdges,
  mentionedBy,
  mentionsOf,
  nextMilestone,
} from './reducer'
import { foldFrom } from './log'
import { serializeEvent, type AtlasEvent } from './events'
import { newId } from './ids'
import { mentionToken } from './mentions'

function ev(type: string, subject: string, data?: Record<string, unknown>): AtlasEvent {
  return { id: newId('evt'), ts: new Date().toISOString(), actor: null, type, subject, ...(data ? { data } : {}) }
}

describe('reducer', () => {
  it('creates and updates a project', () => {
    const s = emptyState()
    const prj = newId('prj')
    applyEvent(s, ev('project.create', prj, { name: 'Tidewater', status: 'active' }))
    applyEvent(s, ev('project.update', prj, { status: 'risk' }))
    expect(s.entities[prj]?.fields.name).toBe('Tidewater')
    expect(s.entities[prj]?.fields.status).toBe('risk')
  })

  it('is idempotent — applying an event twice is a no-op', () => {
    const s = emptyState()
    const prj = newId('prj')
    const e = ev('project.create', prj, { name: 'A' })
    applyEvent(s, e)
    applyEvent(s, e)
    expect(s.events.length).toBe(1)
  })

  it('deliverables (kind + dates) and the next milestone fold correctly', () => {
    const s = emptyState()
    const prj = newId('prj')
    applyEvent(s, ev('project.create', prj, { name: 'P' }))
    applyEvent(s, ev('deliverable.create', newId('dlv'), { projectId: prj, label: 'Repo', url: 'https://x', kind: 'reference', order: 0 }))
    applyEvent(s, ev('deliverable.create', newId('dlv'), { projectId: prj, label: 'API', url: 'https://y', kind: 'due', dueDate: '2026-08-01', order: 1 }))
    applyEvent(s, ev('deliverable.create', newId('dlv'), { projectId: prj, label: 'Site', kind: 'delivered', deliveredDate: '2026-05-01', order: 2 }))
    applyEvent(s, ev('milestone.create', newId('mst'), { projectId: prj, label: 'M', status: 'next', order: 0 }))
    const dl = deliverablesForProject(s, prj)
    expect(dl.map((d) => d.kind)).toEqual(['reference', 'due', 'delivered'])
    expect(dl[1]?.dueDate).toBe('2026-08-01')
    expect(dl[2]?.deliveredDate).toBe('2026-05-01')
    expect(nextMilestone(s, prj)?.label).toBe('M')
  })

  it('maps a legacy done/due deliverable event to the new kind', () => {
    const s = emptyState()
    const prj = newId('prj')
    applyEvent(s, ev('project.create', prj, { name: 'P' }))
    applyEvent(s, ev('deliverable.create', newId('dlv'), { projectId: prj, label: 'old-done', done: true, order: 0 }))
    applyEvent(s, ev('deliverable.create', newId('dlv'), { projectId: prj, label: 'old-due', due: true, order: 1 }))
    const dl = deliverablesForProject(s, prj)
    expect(dl.map((d) => d.kind)).toEqual(['delivered', 'due'])
  })

  it('project ↔ contact links are bidirectional and removable', () => {
    const s = emptyState()
    const prj = newId('prj')
    const con = newId('con')
    applyEvent(s, ev('project.create', prj, { name: 'P' }))
    applyEvent(s, ev('contact.create', con, { name: 'Maren' }))
    applyEvent(s, ev('link.add', prj, { to: con }))
    expect(s.entities[prj]?.links).toContain(con)
    expect(s.entities[con]?.links).toContain(prj)
    applyEvent(s, ev('link.remove', prj, { to: con }))
    expect(s.entities[prj]?.links).not.toContain(con)
  })
})

describe('lineage derived from @mentions in context', () => {
  it('derives directional edges (mention = builds on), upstream and downstream', () => {
    const s = emptyState()
    const drift = newId('prj')
    const tide = newId('prj')
    const beacon = newId('prj')
    applyEvent(s, ev('project.create', drift, { name: 'Driftwood', context: 'the groundwork.' }))
    applyEvent(s, ev('project.create', tide, { name: 'Tidewater', context: `grew out of ${mentionToken(drift, 'Driftwood')}.` }))
    applyEvent(s, ev('project.create', beacon, { name: 'Beacon', context: `reuses ${mentionToken(tide, 'Tidewater')} maps.` }))

    expect(mentionsOf(s, tide)).toEqual([drift]) // Tidewater builds on Driftwood
    expect(mentionsOf(s, drift)).toEqual([]) // root
    expect(mentionedBy(s, tide)).toEqual([beacon]) // Beacon builds on Tidewater
    const edges = graphEdges(s)
    expect(edges).toContainEqual({ from: tide, to: drift })
    expect(edges).toContainEqual({ from: beacon, to: tide })
    expect(edges.length).toBe(2)
  })

  it('ignores a self-mention and a mention of a non-existent project', () => {
    const s = emptyState()
    const a = newId('prj')
    const ghost = newId('prj')
    applyEvent(s, ev('project.create', a, { name: 'A', context: `${mentionToken(a, 'A')} and ${mentionToken(ghost, 'Ghost')}` }))
    expect(mentionsOf(s, a)).toEqual([])
    expect(graphEdges(s)).toEqual([])
  })
})

describe('log fold round-trips serialized events', () => {
  it('rebuilds state from a serialized shard', () => {
    const s = emptyState()
    const prj = newId('prj')
    const content =
      [serializeEvent(ev('project.create', prj, { name: 'X' })), serializeEvent(ev('log.create', newId('log'), { projectId: prj, title: 'hi', source: 'agent' }))].join('\n') + '\n'
    foldFrom(s, content, 0)
    expect(s.entities[prj]?.fields.name).toBe('X')
    expect(Object.keys(s.logEntries).length).toBe(1)
  })
})
