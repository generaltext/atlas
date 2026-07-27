import { useStore } from '../lib/store'
import {
  STATUS_COLORS,
  statusOptions,
  type Config,
  type StatusDef,
} from '../lib/model'
import { newId } from '../lib/ids'
import { Card, SectionHead } from '../components/common'
import { ConfirmDelete, EditableSelect, EditableText } from '../components/ui'
import { Icon } from '../components/Icon'

export function SettingsPage() {
  const { config, saveConfig } = useStore()

  const update = (next: Partial<Config>) => void saveConfig({ ...config, ...next })
  const setStatus = (i: number, patch: Partial<StatusDef>) =>
    update({ statuses: config.statuses.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const addStatus = () =>
    update({ statuses: [...config.statuses, { key: newId('st'), label: 'New status', color: 'grey' }] })
  const removeStatus = (i: number) => {
    const removed = config.statuses[i]
    const statuses = config.statuses.filter((_, j) => j !== i)
    const defaultStatus =
      removed && config.defaultStatus === removed.key ? (statuses[0]?.key ?? '') : config.defaultStatus
    update({ statuses, defaultStatus })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[var(--muted)]">Configure how projects are labelled and shown.</p>
      </div>

      <Card className="p-4">
        <SectionHead title="Project statuses" note="name + color" />
        <ul className="mb-3 flex flex-col">
          {config.statuses.map((s, i) => (
            <li key={s.key} className="flex items-center gap-3 border-t border-[var(--border)] py-2.5 first:border-t-0">
              <div className="flex shrink-0 items-center gap-1.5">
                {STATUS_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    title={c.label}
                    aria-label={c.label}
                    onClick={() => setStatus(i, { color: c.key })}
                    className="h-4 w-4 rounded-full transition"
                    style={{
                      background: `var(${c.var})`,
                      boxShadow:
                        s.color === c.key ? `0 0 0 2px var(--panel), 0 0 0 3.5px var(${c.var})` : 'none',
                    }}
                  />
                ))}
              </div>
              <EditableText
                value={s.label}
                onSave={(v) => setStatus(i, { label: v })}
                className="min-w-0 flex-1 truncate text-[14px]"
                placeholder="Status name"
              />
              <span className="shrink-0">
                {config.statuses.length > 1 && (
                  <ConfirmDelete title="Remove status" onConfirm={() => removeStatus(i)} />
                )}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addStatus}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
        >
          <Icon name="Plus" size={14} /> Add status
        </button>
      </Card>

      <Card className="p-4">
        <SectionHead title="New projects" />
        <label className="flex items-center gap-3 text-[14px]">
          <span className="text-[var(--muted)]">start with status</span>
          <EditableSelect
            value={config.defaultStatus}
            options={statusOptions(config)}
            onSave={(v) => update({ defaultStatus: v })}
          />
        </label>
      </Card>

      <Card className="p-4">
        <SectionHead title="About" />
        <p className="font-mono-x text-[12px] leading-relaxed text-[var(--faint)]">
          Atlas · a General Text app.
          <br />
          Projects, clients, deliverables, and a lineage graph derived from context @mentions.
        </p>
      </Card>
    </div>
  )
}
