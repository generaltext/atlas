// A disposable local materialization cache in IndexedDB. The plaintext log is
// always the source of truth; this only lets a returning session hydrate the UI
// instantly. Nuke it (or bump CACHE_VERSION) and a full replay rebuilds identical
// state.

import { emptyState, type State } from './reducer'
import type { AtlasEvent } from './events'

const DB_NAME = 'atlas'
const STORE = 'projection'
// The fold cursor lives in memory and is revalidated each session (a saved char
// offset is not a valid resume point over a CRDT shard). Bump to discard stale
// caches on a schema change.
const CACHE_VERSION = 2

interface SerializedState {
  entities: State['entities']
  deliverables: State['deliverables']
  milestones: State['milestones']
  resources: State['resources']
  lineage: State['lineage']
  logEntries: State['logEntries']
  suggestions: State['suggestions']
  events: AtlasEvent[]
  applied: string[]
}

interface CachedProjection {
  version: number
  workspaceId: string
  state: SerializedState
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function cacheKey(workspaceId: string): string {
  return `proj:${workspaceId}`
}

export async function loadCache(workspaceId: string): Promise<{ state: State } | null> {
  try {
    const db = await open()
    const cached = await idbGet<CachedProjection>(db, cacheKey(workspaceId))
    if (!cached || cached.version !== CACHE_VERSION || cached.workspaceId !== workspaceId) return null
    const s = emptyState()
    s.entities = cached.state.entities
    s.deliverables = cached.state.deliverables
    s.milestones = cached.state.milestones
    s.resources = cached.state.resources
    s.lineage = cached.state.lineage
    s.logEntries = cached.state.logEntries
    s.suggestions = cached.state.suggestions ?? {}
    s.events = cached.state.events
    s.applied = new Set(cached.state.applied)
    return { state: s }
  } catch {
    return null // cache is best-effort; a miss just means a full fold
  }
}

export async function saveCache(workspaceId: string, state: State): Promise<void> {
  try {
    const db = await open()
    const payload: CachedProjection = {
      version: CACHE_VERSION,
      workspaceId,
      state: {
        entities: state.entities,
        deliverables: state.deliverables,
        milestones: state.milestones,
        resources: state.resources,
        lineage: state.lineage,
        logEntries: state.logEntries,
        suggestions: state.suggestions,
        events: state.events,
        applied: [...state.applied],
      },
    }
    await idbPut(db, cacheKey(workspaceId), payload)
  } catch {
    // ignore — losing the cache only costs a re-parse next boot
  }
}
