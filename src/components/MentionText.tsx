import { Link } from 'react-router-dom'

import { parseBody } from '../lib/mentions'
import { fieldStr } from '../lib/reducer'
import { useStore } from '../lib/store'

/** Render stored context: newlines preserved, project mentions as live links
 *  (resolving the CURRENT project name, falling back to the stored label). */
export function MentionText({ body, className = '' }: { body: string; className?: string }) {
  const { state } = useStore()
  if (!body.trim()) return null
  const segments = parseBody(body)
  return (
    <div className={`leading-relaxed break-words whitespace-pre-wrap ${className}`}>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <Link key={i} to={`/p/${seg.id}`} className="mention">
            {refNameOr(state, seg.id, seg.label)}
          </Link>
        ),
      )}
    </div>
  )
}

function refNameOr(
  state: ReturnType<typeof useStore>['state'],
  id: string,
  fallback: string,
): string {
  return fieldStr(state.entities[id], 'name') || fallback
}
