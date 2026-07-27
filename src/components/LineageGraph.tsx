import { useEffect, useRef } from 'react'

// A directed lineage graph rendered on canvas. Edges (from→to = "from builds on
// to") are DERIVED from @mentions in project context — this component just draws
// whatever nodes + edges it's handed. Layered left-to-right by longest path.

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
  height?: number
  onSelect?: (id: string) => void
}

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
      // from builds on to → to is "earlier"; put `to` further left (smaller depth).
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
      // depth 0 (leaves that build on nothing) sit on the RIGHT; roots on the left.
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
    // when focused, draw ONLY the focus project's connected lineage — not every
    // project (which piles disconnected nodes into one overlapping column).
    const vnodes = lin ? nodes.filter((n) => lin.has(n.id)) : nodes
    const byId = new Map(vnodes.map((n) => [n.id, n]))
    const norm = layout(
      vnodes.map((n) => n.id),
      edges,
    )

    function draw() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cssW = canvas.parentElement ? canvas.parentElement.clientWidth : 600
      canvas.style.height = height + 'px'
      canvas.width = Math.max(280, cssW * dpr)
      canvas.height = height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, height)
      if (vnodes.length === 0) return

      const padX = 58
      const padY = 34
      const W = cssW - padX * 2
      const H = height - padY * 2
      const xy = (id: string): [number, number] => {
        const p = norm.get(id) ?? [0.5, 0.5]
        return [padX + p[0] * W, padY + p[1] * H]
      }
      const C = { dim: cssv('--faint'), brass: cssv('--brass'), ink: cssv('--fg'), panel: cssv('--panel'), faint: cssv('--faint') }

      for (const e of edges) {
        if (!byId.has(e.from) || !byId.has(e.to)) continue
        const a = xy(e.from)
        const b = xy(e.to)
        const on = lin ? lin.has(e.from) && lin.has(e.to) : false
        const mx = (a[0] + b[0]) / 2
        const my = (a[1] + b[1]) / 2 - Math.abs(b[0] - a[0]) * 0.1 - 10
        ctx.beginPath()
        ctx.moveTo(a[0], a[1])
        ctx.quadraticCurveTo(mx, my, b[0], b[1])
        ctx.lineWidth = on ? 2 : 1.2
        ctx.strokeStyle = on ? C.brass : C.dim
        ctx.globalAlpha = on ? 0.9 : lin ? 0.3 : 0.5
        ctx.stroke()
        ctx.globalAlpha = 1
        const ang = Math.atan2(b[1] - my, b[0] - mx)
        const ax = b[0] - Math.cos(ang) * 12
        const ay = b[1] - Math.sin(ang) * 12
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax - Math.cos(ang - 0.4) * 6, ay - Math.sin(ang - 0.4) * 6)
        ctx.lineTo(ax - Math.cos(ang + 0.4) * 6, ay - Math.sin(ang + 0.4) * 6)
        ctx.closePath()
        ctx.fillStyle = on ? C.brass : C.dim
        ctx.globalAlpha = on ? 0.9 : lin ? 0.3 : 0.5
        ctx.fill()
        ctx.globalAlpha = 1
      }

      const hits: Array<{ id: string; x: number; y: number; r: number }> = []
      for (const n of vnodes) {
        const [x, y] = xy(n.id)
        const isFocus = n.id === focusId
        const inLin = lin ? lin.has(n.id) : true
        const r = isFocus ? 12 : 9
        const col = cssv(n.colorVar)
        if (isFocus) {
          ctx.beginPath()
          ctx.arc(x, y, r + 6, 0, Math.PI * 2)
          ctx.fillStyle = C.brass
          ctx.globalAlpha = 0.14
          ctx.fill()
          ctx.globalAlpha = 1
        }
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = C.panel
        ctx.fill()
        ctx.lineWidth = isFocus ? 3 : 2.5
        ctx.strokeStyle = isFocus ? C.brass : col
        ctx.globalAlpha = inLin ? 1 : 0.5
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, r - 4, 0, Math.PI * 2)
        ctx.fillStyle = col
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.font = (isFocus ? '600 ' : '') + '12px ' + cssv('--serif')
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = inLin ? C.ink : C.faint
        ctx.fillText(n.name, x, y + r + 5)
        if (n.subtitle) {
          ctx.font = '10px ' + cssv('--mono')
          ctx.fillStyle = C.faint
          ctx.fillText(n.subtitle, x, y + r + 21)
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
