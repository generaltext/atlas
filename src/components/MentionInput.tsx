import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { fieldStr } from '../lib/reducer'
import { mentionToken, parseBody } from '../lib/mentions'

// A contenteditable freeform editor with @-autocomplete over PROJECTS. Typing
// `@name` and choosing a project inserts a durable `@[Label](prj_id)` token; the
// lineage graph is derived from these (see reducer.graphEdges). Adapted from the
// crum mention editor.

interface Match {
  id: string
  title: string
  client: string
}

interface Popup {
  items: Match[]
  active: number
  start: number
  end: number
  node: Text
  rect: { left: number; top: number }
  query: string
}

function buildInitialDom(el: HTMLElement, value: string) {
  el.replaceChildren()
  for (const seg of parseBody(value)) {
    if (seg.type === 'mention') {
      el.appendChild(makeChip(seg.id, seg.label))
    } else {
      const lines = seg.text.split('\n')
      lines.forEach((line, i) => {
        if (i > 0) el.appendChild(document.createElement('br'))
        if (line) el.appendChild(document.createTextNode(line))
      })
    }
  }
}

function makeChip(id: string, label: string): HTMLElement {
  const span = document.createElement('span')
  span.className = 'mention'
  span.contentEditable = 'false'
  span.dataset.id = id
  span.dataset.label = label
  span.textContent = label
  return span
}

function serialize(root: HTMLElement): string {
  let out = ''
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += (child as Text).data
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        if (el.classList.contains('mention')) {
          out += mentionToken(el.dataset.id ?? '', el.dataset.label ?? '')
        } else if (el.tagName === 'BR') {
          out += '\n'
        } else {
          if (/^(DIV|P)$/.test(el.tagName) && out && !out.endsWith('\n')) out += '\n'
          walk(el)
        }
      }
    })
  }
  walk(root)
  return out.replace(/\n+$/, '')
}

export function MentionInput({
  value,
  onChange,
  onCommit,
  excludeId,
  placeholder,
  autoFocus = false,
  minHeight = 96,
}: {
  value: string
  onChange: (next: string) => void
  /** fired on blur — persist here (onChange fires per keystroke; onCommit doesn't) */
  onCommit?: () => void
  /** a project id to omit from the picker (usually the project being edited) */
  excludeId?: string
  placeholder?: string
  autoFocus?: boolean
  minHeight?: number
}) {
  const { state } = useStore()
  const ref = useRef<HTMLDivElement>(null)
  const [popup, setPopup] = useState<Popup | null>(null)

  useEffect(() => {
    if (ref.current) {
      buildInitialDom(ref.current, value)
      if (autoFocus) ref.current.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function search(query: string): Match[] {
    const q = query.trim().toLowerCase()
    return Object.values(state.entities)
      .filter((e) => e.kind === 'project' && !e.archived && e.id !== excludeId)
      .map((e) => ({
        id: e.id,
        title: fieldStr(e, 'name'),
        client: fieldStr(state.entities[fieldStr(e, 'client')], 'name'),
      }))
      .filter((m) => m.title && (q === '' || m.title.toLowerCase().includes(q)))
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 6)
  }

  function detectTrigger() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return setPopup(null)
    const node = sel.anchorNode
    if (!node || node.nodeType !== Node.TEXT_NODE || !ref.current?.contains(node))
      return setPopup(null)
    const text = (node as Text).data
    const before = text.slice(0, sel.anchorOffset)
    const m = /(?:^|\s)@([^\s@]*)$/.exec(before)
    if (!m) return setPopup(null)
    const query = m[1] ?? ''
    const items = search(query)
    const range = sel.getRangeAt(0).cloneRange()
    const rect = range.getBoundingClientRect()
    setPopup((prev) => ({
      items,
      active:
        prev && prev.query === query ? Math.min(prev.active, Math.max(0, items.length - 1)) : 0,
      start: sel.anchorOffset - query.length - 1,
      end: sel.anchorOffset,
      node: node as Text,
      rect: { left: rect.left, top: rect.bottom },
      query,
    }))
  }

  function choose(match: Match) {
    if (!popup) return
    const { node, start, end } = popup
    const range = document.createRange()
    range.setStart(node, start)
    range.setEnd(node, end)
    range.deleteContents()
    const chip = makeChip(match.id, match.title)
    range.insertNode(chip)
    const space = document.createTextNode(' ')
    chip.after(space)
    const after = document.createRange()
    after.setStartAfter(space)
    after.collapse(true)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(after)
    setPopup(null)
    if (ref.current) onChange(serialize(ref.current))
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (popup && popup.items.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPopup({ ...popup, active: (popup.active + 1) % popup.items.length })
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPopup({ ...popup, active: (popup.active - 1 + popup.items.length) % popup.items.length })
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        choose(popup.items[popup.active]!)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setPopup(null)
        return
      }
    }
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={() => {
          if (ref.current) onChange(serialize(ref.current))
          detectTrigger()
        }}
        onKeyUp={detectTrigger}
        onClick={detectTrigger}
        onBlur={() => {
          setTimeout(() => setPopup(null), 150)
          onCommit?.()
        }}
        onKeyDown={onKeyDown}
        className="w-full whitespace-pre-wrap break-words rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[14px] leading-relaxed outline-none focus:border-[var(--accent)]"
        style={{ minHeight }}
      />
      {popup && (
        <ul
          className="fixed z-50 max-h-64 w-72 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1 shadow-lg"
          style={{ left: popup.rect.left, top: popup.rect.top + 4 }}
        >
          {popup.items.length === 0 && (
            <li className="px-3 py-2 text-sm text-[var(--faint)]">No projects match</li>
          )}
          {popup.items.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(m)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
                style={{ background: i === popup.active ? 'var(--hover)' : 'transparent' }}
              >
                <span className="truncate">{m.title}</span>
                {m.client && (
                  <span className="ml-auto truncate text-xs text-[var(--faint)]">{m.client}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
