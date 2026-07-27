import { useEffect, useRef } from 'react'

// A directed lineage graph rendered on canvas. Edges (from→to = "from builds on
// to") are DERIVED from @mentions in project context — this component just draws
// whatever nodes + edges it's handed. Layered left-to-right by longest path; labels
// sit in the OUTER margins (left of left-side nodes, right of right-side nodes) so
// they never overlap the edges in the middle or collide with each other.

export interface GraphNode {
  id: string
  name: string
  subtitle: string
  /** palette CSS variable NAME for the node color, e.g. '--good' */
  colorVar: string
}
export interface GraphEdge {
  from: string
  to: string
}

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  focusId?: string
  /** minimum height; the canvas grows taller to fit the busiest column */
  height?: number
  onSelect?: (id: string) => void
}

const ROW = 42 // vertical space per node in a column

function cssv(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** ancestors + descendants + self of `id`. */
function lineageSet(id: string, edges: GraphEdge[]): Set<string> {
  const set = new Set<string>([id])
  const up = (n: string) => {
    for (const e of edges)
      if (e.to === n && !set.has(e.from)) {
        set.add(e.from)
        up(e.from)
      }
  }
  const down = (n: string) => {
    for (const e of edges)
      if (e.from === n && !set.has(e.to)) {
        set.add(e.to)
        down(e.to)
      }
  }
  up(id)
  down(id)
  return set
}

/** longest-path layered layout → normalized [0..1] positions. */
function layout(nodeIds: string[], edges: GraphEdge[]): Map<string, [number, number]> {
  const inSet = new Set(nodeIds)
  const es = edges.filter((e) => inSet.has(e.from) && inSet.has(e.to))
  const depth = new Map<string, number>(nodeIds.map((n) => [n, 0]))
  for (let iter = 0; iter < nodeIds.length; iter++) {
    let changed = false
    for (const e of es) {
      const d = (depth.get(e.to) ?? 0) + 1
      if (d > (depth.get(e.from) ?? 0)) {
        depth.set(e.from, d)
        changed = true
      }
    }
    if (!changed) break
  }
  const cols = new Map<number, string[]>()
  for (const n of nodeIds) {
    const d = depth.get(n) ?? 0
    const list = cols.get(d) ?? []
    list.push(n)
    cols.set(d, list)
  }
  const maxD = Math.max(0, ...cols.keys())
  const pos = new Map<string, [number, number]>()
  for (const [d, list] of cols) {
    list.sort()
    list.forEach((n, i) => {
      // depth 0 (built on nothing further) sits on the RIGHT; roots on the left.
      const nx = maxD === 0 ? 0.5 : 1 - d / maxD
      const ny = (i + 1) / (list.length + 1)
      pos.set(n, [nx, ny])
    })
  }
  return pos
}

export function LineageGraph({ nodes, edges, focusId, height = 300, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hitRef = useRef<Array<{ id: string; x: number; y: number; r: number }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const lin = focusId ? lineageSet(focusId, edges) : null
    const vnodes = lin ? nodes.filter((n) => lin.has(n.id)) : nodes
    const byId = new Map(vnodes.map((n) => [n.id, n]))
    const norm = layout(
      vnodes.map((n) => n.id),
      edges,
    )
    // tallest column → the canvas height needed so rows never collide.
    const colCounts = new Map<number, number>()
    for (const n of vnodes) {
      const nx = norm.get(n.id)?.[0] ?? 0.5
      colCounts.set(nx, (colCounts.get(nx) ?? 0) + 1)
    }
    const tallest = Math.max(1, ...colCounts.values())
    const effH = Math.max(height, tallest * ROW + 56)

    function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
      if (!text || ctx.measureText(text).width <= maxW) return text
      let t = text
      while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
      return t + '…'
    }

    function draw() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cssW = canvas.parentElement ? canvas.parentElement.clientWidth : 600
      canvas.style.height = effH + 'px'
      canvas.width = Math.max(280, cssW * dpr)
      canvas.height = effH * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, effH)
      if (vnodes.length === 0) return

      // outer margins hold the labels; keep them generous but responsive.
      const padX = Math.max(40, Math.min(160, cssW * 0.3))
      const padY = 28
      const W = cssW - padX * 2
      const H = effH - padY * 2
      const single = vnodes.length === 1
      const xy = (id: string): [number, number] => {
        const p = norm.get(id) ?? [0.5, 0.5]
        return [single ? cssW / 2 : padX + p[0] * W, padY + p[1] * H]
      }
      const C = { brass: cssv('--brass'), ink: cssv('--fg'), panel: cssv('--panel'), faint: cssv('--faint'), dim: cssv('--faint') }
      const serif = cssv('--serif')
      const mono = cssv('--mono')

      // edges
      for (const e of edges) {
        if (!byId.has(e.from) || !byId.has(e.to)) continue
        const a = xy(e.from)
        const b = xy(e.to)
        const on = lin ? lin.has(e.from) && lin.has(e.to) : true
        const mx = (a[0] + b[0]) / 2
        const my = (a[1] + b[1]) / 2 - Math.abs(b[0] - a[0]) * 0.06 - 8
        ctx.beginPath()
        ctx.moveTo(a[0], a[1])
        ctx.quadraticCurveTo(mx, my, b[0], b[1])
        ctx.lineWidth = 1.2
        ctx.strokeStyle = C.dim
        ctx.globalAlpha = on ? 0.45 : 0.18
        ctx.stroke()
        const ang = Math.atan2(b[1] - my, b[0] - mx)
        const ax = b[0] - Math.cos(ang) * 11
        const ay = b[1] - Math.sin(ang) * 11
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax - Math.cos(ang - 0.4) * 5, ay - Math.sin(ang - 0.4) * 5)
        ctx.lineTo(ax - Math.cos(ang + 0.4) * 5, ay - Math.sin(ang + 0.4) * 5)
        ctx.closePath()
        ctx.fillStyle = C.dim
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // nodes + margin labels
      const hits: Array<{ id: string; x: number; y: number; r: number }> = []
      for (const n of vnodes) {
        const [x, y] = xy(n.id)
        const isFocus = n.id === focusId
        const r = isFocus ? 8 : 6.5
        const col = cssv(n.colorVar)
        if (isFocus) {
          ctx.beginPath()
          ctx.arc(x, y, r + 5, 0, Math.PI * 2)
          ctx.fillStyle = C.brass
          ctx.globalAlpha = 0.16
          ctx.fill()
          ctx.globalAlpha = 1
        }
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = C.panel
        ctx.fill()
        ctx.lineWidth = 2.5
        ctx.strokeStyle = isFocus ? C.brass : col
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, r - 3, 0, Math.PI * 2)
        ctx.fillStyle = col
        ctx.fill()

        // label in the outer margin, vertically centered on the node
        const nx = norm.get(n.id)?.[0] ?? 0.5
        const leftSide = single ? false : nx < 0.5
        const maxLabelW = padX - 14
        const tx = leftSide ? x - r - 8 : x + r + 8
        ctx.textAlign = single ? 'center' : leftSide ? 'right' : 'left'
        const lx = single ? x : tx
        ctx.textBaseline = 'alphabetic'
        ctx.font = (isFocus ? '600 ' : '') + '12px ' + serif
        ctx.fillStyle = C.ink
        ctx.fillText(fit(ctx, n.name, single ? maxLabelW * 2 : maxLabelW), lx, single ? y + r + 16 : y - 1)
        if (n.subtitle) {
          ctx.font = '10px ' + mono
          ctx.fillStyle = C.faint
          ctx.fillText(fit(ctx, n.subtitle, single ? maxLabelW * 2 : maxLabelW), lx, single ? y + r + 30 : y + 12)
        }
        hits.push({ id: n.id, x, y, r: r + 6 })
      }
      hitRef.current = hits
    }

    draw()
    const ro = new ResizeObserver(() => draw())
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    const mo = new MutationObserver(() => draw())
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [nodes, edges, focusId, height])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onSelect) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    for (const h of hitRef.current) {
      if (Math.hypot(px - h.x, py - h.y) <= h.r + 4) {
        onSelect(h.id)
        return
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ display: 'block', width: '100%', cursor: onSelect ? 'pointer' : 'default' }}
    />
  )
}
