import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { KINDS, type EntityKind } from '../lib/model'
import { newId } from '../lib/ids'

/** Create an entity with sensible defaults and navigate to its detail page. */
export function useCreate() {
  const { dispatch, config } = useStore()
  const navigate = useNavigate()

  return async function create(kind: EntityKind): Promise<string> {
    const id = newId(KINDS[kind].prefix)
    const data: Record<string, unknown> =
      kind === 'project'
        ? { name: 'Untitled project', status: config.defaultStatus }
        : kind === 'client'
          ? { name: 'New client' }
          : { name: 'New contact' }
    await dispatch({ type: `${kind}.create`, subject: id, data })
    navigate(kind === 'project' ? `/p/${id}` : `/e/${id}`)
    return id
  }
}
