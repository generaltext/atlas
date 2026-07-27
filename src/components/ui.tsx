import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import type { SelectOption } from '../lib/model'

// The gt app sandbox has no window.confirm/prompt/alert, so all input and
// confirmation is built in-app.

export function IconButton({
  name,
  onClick,
  title,
  size = 15,
  className = '',
}: {
  name: string
  onClick: () => void
  title: string
  size?: number
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-md text-[var(--faint)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)] ${className}`}
    >
      <Icon name={name} size={size} />
    </button>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  autoFocus?: boolean
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-[14px] outline-none focus:border-[var(--accent)] ${className}`}
    />
  )
}

export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono-x text-[10.5px] uppercase tracking-wider text-[var(--faint)]">
        {label}
      </span>
      {children}
    </label>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost'
  type?: 'button' | 'submit'
}) {
  const cls =
    variant === 'primary'
      ? 'bg-[var(--accent)] text-white hover:opacity-90'
      : 'border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--accent)]'
  return (
    <button type={type} onClick={onClick} className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition ${cls}`}>
      {children}
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="mt-10 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <IconButton name="Plus" title="Close" onClick={onClose} className="rotate-45" />
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

/** Click a value to edit it inline. Commits on blur / Enter (Esc cancels). */
export function EditableText({
  value,
  onSave,
  placeholder = 'Empty',
  multiline = false,
  type = 'text',
  className = '',
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  multiline?: boolean
  type?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  useEffect(() => {
    if (!editing) setV(value)
  }, [value, editing])

  if (editing) {
    const commit = () => {
      setEditing(false)
      if (v !== value) onSave(v)
    }
    const cancel = () => {
      setEditing(false)
      setV(value)
    }
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={v}
          rows={3}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel()
          }}
          className="w-full rounded-md border border-[var(--accent)] bg-[var(--bg)] px-2 py-1.5 text-[14px] outline-none"
        />
      )
    }
    return (
      <input
        type={type}
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') cancel()
        }}
        className="w-full rounded-md border border-[var(--accent)] bg-[var(--bg)] px-2 py-1 text-[inherit] outline-none"
      />
    )
  }

  return (
    <span
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') setEditing(true)
      }}
      className={`cursor-text rounded px-1 -mx-1 hover:bg-[var(--hover)] ${!value ? 'text-[var(--faint)] italic' : ''} ${className}`}
    >
      {value || placeholder}
    </span>
  )
}

export function EditableSelect({
  value,
  options,
  onSave,
}: {
  value: string
  options: SelectOption[]
  onSave: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onSave(e.target.value)}
      className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[13px] outline-none focus:border-[var(--accent)]"
    >
      {!value && <option value="">—</option>}
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Toggle whether an item appears on the shared client report. */
export function VisibilityToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={on ? 'Shared with client — click to make private' : 'Private — click to share on the client report'}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono-x text-[10px] transition ${
        on ? 'text-[var(--brass)] hover:bg-[var(--hover)]' : 'text-[var(--faint)] hover:bg-[var(--hover)]'
      }`}
    >
      <Icon name={on ? 'Eye' : 'Circle'} size={11} />
      {on ? 'shared' : 'private'}
    </button>
  )
}

/** Two-click delete (no native confirm in the sandbox). */
export function ConfirmDelete({ onConfirm, title = 'Delete' }: { onConfirm: () => void; title?: string }) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  if (armed) {
    return (
      <button
        type="button"
        onClick={() => {
          setArmed(false)
          onConfirm()
        }}
        className="rounded-md px-1.5 py-0.5 font-mono-x text-[10px] text-[var(--crit)] hover:bg-[color-mix(in_srgb,var(--crit)_14%,transparent)]"
      >
        remove?
      </button>
    )
  }
  return (
    <IconButton
      name="Plus"
      title={title}
      size={13}
      className="rotate-45"
      onClick={() => {
        setArmed(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setArmed(false), 3000)
      }}
    />
  )
}
