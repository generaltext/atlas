import { describe, expect, it } from 'vitest'
import { applyEvent, emptyState, deliverableStats, lineageSetFor, nextMilestone, deliverablesForProject, pendingSuggestions } from './reducer'
import { foldFrom } from './log'
import { serializeEvent, type AtlasEvent } from './events'
import { newId } from './ids'

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

  it('folds deliverable stats and picks the next milestone', () => {
    const s = emptyState()
    const prj = newId('prj')
    applyEvent(s, ev('project.create', prj, { name: 'P' }))
    applyEvent(s, ev('deliverable.create', newId('dlv'), { projectId: prj, label: 'a', status: 'done', order: 0 }))
    applyEvent(s, ev('deliverable.create', newId('dlv'), { projectId: prj, label: 'b', status: 'now', order: 1 }))
    applyEvent(s, ev('milestone.create', newId('mst'), { projectId: prj, label: 'M', status: 'next', order: 0 }))
    expect(deliverableStats(s, prj)).toEqual({ done: 1, total: 2 })
    expect(deliverablesForProject(s, prj)[0]?.label).toBe('a')
    expect(nextMilestone(s, prj)?.label).toBe('M')
  })

  it('approving a suggestion applies the draft and clears it from pending', () => {
    const s = emptyState()
    const prj = newId('prj')
    applyEvent(s, ev('project.create', prj, { name: 'P', status: 'risk' }))
    const sug = newId('sug')
    applyEvent(s, ev('suggestion.create', sug, { projectId: prj, op: 'Update status', draftType: 'project.update', draftSubject: prj, draftData: { status: 'active' }, source: 'agent' }))
    expect(pendingSuggestions(s).length).toBe(1)
    // the store approves by dispatching the draft plus suggestion.approve
    applyEvent(s, ev('project.update', prj, { status: 'active' }))
    applyEvent(s, ev('suggestion.approve', sug))
    expect(s.entities[prj]?.fields.status).toBe('active')
    expect(pendingSuggestions(s).length).toBe(0)
  })

  it('computes lineage ancestors and descendants', () => {
    const s = emptyState()
    const a = newId('prj'), b = newId('prj'), c = newId('prj')
    for (const [id, n] of [[a, 'A'], [b, 'B'], [c, 'C']] as const) applyEvent(s, ev('project.create', id, { name: n }))
    applyEvent(s, ev('lineage.add', newId('lin'), { from: a, to: b, kind: 'seeded' }))
    applyEvent(s, ev('lineage.add', newId('lin'), { from: b, to: c, kind: 'reused' }))
    const set = lineageSetFor(s, b)
    expect(set.has(a)).toBe(true)
    expect(set.has(c)).toBe(true)
    expect(set.size).toBe(3)
  })
})

describe('log fold', () => {
  it('round-trips serialized events through foldFrom', () => {
    const s = emptyState()
    const prj = newId('prj')
    const content =
      [serializeEvent(ev('project.create', prj, { name: 'X' })), serializeEvent(ev('deliverable.create', newId('dlv'), { projectId: prj, label: 'd', status: 'todo' }))].join('\n') + '\n'
    foldFrom(s, content, 0)
    expect(s.entities[prj]?.fields.name).toBe('X')
    expect(Object.keys(s.deliverables).length).toBe(1)
  })
})
