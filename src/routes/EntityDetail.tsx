import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { fieldStr, linkedOfKind, projectsForClient } from '../lib/reducer'
import { KINDS, type FieldDef } from '../lib/model'
import { Icon } from '../components/Icon'
import { EditableText, ConfirmDelete } from '../components/ui'

export function EntityDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const rec = state.entities[id]

  if (!rec || rec.kind === 'project') {
    return (
      <div className="text-[var(--muted)]">
        Not found. <Link className="text-[var(--accent)]" to="/">Home</Link>
      </div>
    )
  }
  const kind = rec.kind
  const def = KINDS[kind]
  const backTo = `/${def.route}`
  const titleKey = def.fields.find((f) => f.title)?.key ?? 'name'
  const upd = (key: string, val: string | number) =>
    dispatch({ type: `${kind}.update`, subject: id, data: { [key]: val } })

  const projects =
    kind === 'client' ? projectsForClient(state, id) : linkedOfKind(state, id, 'project')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => navigate(backTo)} className="inline-flex items-center gap-1 font-mono-x text-[12px] text-[var(--faint)] hover:text-[var(--fg)]">
            <Icon name="ChevronLeft" size={14} /> {def.plural}
          </button>
          <ConfirmDelete
            title={`Archive ${def.singular.toLowerCase()}`}
            onConfirm={() => {
              dispatch({ type: `${kind}.archive`, subject: id })
              navigate(backTo)
            }}
          />
        </div>
        <div className="eyebrow">{def.singular}</div>
        <h1 className="text-[26px] font-semibold tracking-tight">
          <EditableText value={fieldStr(rec, titleKey)} onSave={(v) => upd(titleKey, v)} placeholder="Untitled" />
        </h1>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {def.fields
            .filter((f) => !f.title)
            .map((f) => (
              <div key={f.key} className={f.type === 'rich' ? 'sm:col-span-2' : ''}>
                <dt className="mb-1 font-mono-x text-[10.5px] uppercase tracking-wider text-[var(--faint)]">{f.label}</dt>
                <dd className="text-[14px]">
                  <FieldEditor field={f} value={fieldStr(rec, f.key)} onSave={(v) => upd(f.key, v)} />
                </dd>
              </div>
            ))}
        </dl>
      </div>

      {projects.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold">Projects</h3>
          <div className="rowlist">
            {projects.map((p) => (
              <Link key={p.id} to={`/p/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--hover)]">
                <Icon name="FolderGit2" size={15} className="text-[var(--faint)]" />
                <span className="flex-1 text-[14px] font-medium">{fieldStr(p, 'name')}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FieldEditor({ field, value, onSave }: { field: FieldDef; value: string; onSave: (v: string) => void }) {
  const inputType = field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'
  return (
    <EditableText
      value={value}
      onSave={onSave}
      multiline={field.type === 'rich'}
      type={inputType}
      placeholder={field.placeholder ?? 'Empty'}
    />
  )
}
