import { useStore } from '../lib/store'
import { fieldStr, pendingSuggestions, prefixForType, type Suggestion } from '../lib/reducer'
import { newId } from '../lib/ids'
import { Icon } from '../components/Icon'
import { Button, VisibilityToggle } from '../components/ui'
import { EmptyState } from '../components/common'
import { useNavigate } from 'react-router-dom'

export function Suggestions() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const pending = pendingSuggestions(state)

  const approve = (s: Suggestion) => {
    const subject = s.draftSubject || newId(prefixForType(s.draftType))
    void dispatch([
      { type: s.draftType, subject, data: s.draftData },
      { type: 'suggestion.approve', subject: s.id },
    ])
  }
  const dismiss = (s: Suggestion) => dispatch({ type: 'suggestion.dismiss', subject: s.id })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suggestions</h1>
        <p className="mt-1 max-w-2xl text-[var(--muted)]">
          Proposed updates from the ingest agent, drawn from your repos. Nothing here is applied until
          you approve it — manual entry is always the default.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState>
          <div className="flex flex-col items-center gap-2">
            <Icon name="Check" size={22} className="text-[var(--good)]" />
            Nothing to review. New agent suggestions will land here.
          </div>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((s) => (
            <div key={s.id} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill tone-brass">
                  <span className="tick" />
                  {s.source === 'agent' ? 'agent' : 'manual'}
                </span>
                <span className="text-[14px] font-semibold">{s.op}</span>
                {s.projectId && (
                  <button
                    onClick={() => navigate(`/p/${s.projectId}`)}
                    className="font-mono-x text-[11px] text-[var(--faint)] hover:text-[var(--accent)]"
                  >
                    {fieldStr(state.entities[s.projectId], 'name')}
                  </button>
                )}
                <span className="ml-auto font-mono-x text-[11px] text-[var(--faint)]">{s.at}</span>
              </div>

              <div className="mt-2.5 rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5">
                <div className="text-[13.5px] font-medium">{previewTitle(s)}</div>
                {previewSub(s) && <div className="mt-0.5 font-mono-x text-[11.5px] text-[var(--faint)]">{previewSub(s)}</div>}
              </div>

              {s.rationale && <p className="mt-2 text-[13px] text-[var(--muted)]">{s.rationale}</p>}

              <div className="mt-3 flex items-center gap-2">
                <Button onClick={() => approve(s)}>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Check" size={14} /> Approve
                  </span>
                </Button>
                <Button variant="ghost" onClick={() => dismiss(s)}>
                  Dismiss
                </Button>
                {'clientVisible' in s.draftData && (
                  <span className="ml-1 flex items-center gap-1 text-[var(--faint)]">
                    <VisibilityToggle on={s.draftData.clientVisible === true} onToggle={() => {}} />
                    <span className="font-mono-x text-[10px]">on approve</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

function previewTitle(s: Suggestion): string {
  const d = s.draftData
  return str(d.title) || str(d.label) || str(d.name) || s.op
}

function previewSub(s: Suggestion): string {
  const d = s.draftData
  const parts: string[] = []
  if (d.repo) parts.push(str(d.repo))
  if (d.commits) parts.push(`${str(d.commits)} commits`)
  if (d.status) parts.push(`status: ${str(d.status)}`)
  if (d.due) parts.push(`due ${str(d.due)}`)
  if (d.url) parts.push(str(d.url))
  return parts.join(' · ')
}
