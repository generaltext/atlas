import { useState } from 'react'

import { statusColorVarName, statusLabel, type Config } from '../lib/model'
import { Icon } from './Icon'

/** The status as a single control: a colored pill that IS the dropdown. Replaces
 *  the old pill + separate <select> (which showed the status twice). */
export function StatusControl({
  value,
  config,
  onChange,
}: {
  value: string
  config: Config
  onChange: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const varName = statusColorVarName(config, value)

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="pill"
        style={{ color: `var(${varName})` }}
      >
        <span className="tick" />
        {value ? statusLabel(config, value) : 'set status'}
        <Icon name="ChevronDown" size={11} className="opacity-60" />
      </button>
      {open && (
        <ul className="absolute top-full left-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1 shadow-lg">
          {config.statuses.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(s.key)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-[var(--hover)]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: `var(${statusColorVarName(config, s.key)})` }}
                />
                <span className={value === s.key ? 'font-medium' : ''}>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
