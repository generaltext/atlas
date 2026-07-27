import { useEffect, useRef } from 'react'

export interface GraphNode {
  id: string
  name: string
  period: string
  status: string
}
export interface GraphEdge {
  from: string
  to: string
  kind: string
}

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  focusId?: string
  /** internal shows the whole graph; client shows only the focus's lineage. */
  mode?: 'internal' | 'client'
  height?: number
  onSelect?: (id: string) => void
}

function cssv(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function toneVar(status: string): string {
  switch (status) {
    case 'active':
      return '--good'
    case 'risk':
      return '--warn'
    case 'completed':
      return '--info'
    default:
      return '--faint'
  }
}

/** ancestors + descendants + self of `id`, over the given edges. */
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
      const d = (depth.get(e.from) ?? 0) + 1
      if (d > (depth.get(e.to) ?? 0)) {
        depth.set(e.to, d)
        changed = true
      }
    }
    if (!changed) break
  }
  const maxD = Math.max(0, ...depth.values())
  const cols = new Map<number, string[]>()
  for (const n of nodeIds) {
    const d = depth.get(n) ?? 0
    const list = cols.get(d) ?? []
    list.push(n)
    cols.set(d, list)
  }
  const pos = new Map<string, [number, number]>()
  for (const [d, list] of cols) {
    list.sort()
    list.forEach((n, i) => {
      const nx = maxD === 0 ? 0.5 : d / maxD
      const ny = (i + 1) / (list.length + 1)
      pos.set(n, [nx, ny])
    })
  }
  return pos
}

export function LineageGraph({
  nodes,
  edges,
  focusId,
  mode = 'internal',
  height = 300,
  onSelect,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hitRef = useRef<Array<{ id: string; x: number; y: number; r: number }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const lin = focusId ? lineageSet(focusId, edges) : new Set(nodes.map((n) => n.id))
    const visibleNodes =
      mode === 'client' && focusId ? nodes.filter((n) => lin.has(n.id)) : nodes
    const visIds = visibleNodes.map((n) => n.id)
    const byId = new Map(visibleNodes.map((n) => [n.id, n]))
    const norm = layout(visIds, edges)

    function draw() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cssW = canvas.parentElement ? canvas.parentElement.clientWidth : 600
      const cssH = height
      canvas.style.height = cssH + 'px'
      canvas.width = Math.max(280, cssW * dpr)
      canvas.height = cssH * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)

      const padX = 58
      const padY = 40
      const W = cssW - padX * 2
      const H = cssH - padY * 2
      const xy = (id: string): [number, number] => {
        const p = norm.get(id) ?? [0.5, 0.5]
        return [padX + p[0] * W, padY + p[1] * H]
      }

      const C = {
        dim: cssv('--faint'),
        brass: cssv('--brass'),
        ink: cssv('--fg'),
        panel: cssv('--panel'),
        faint: cssv('--faint'),
      }

      const es = edges.filter((e) => byId.has(e.from) && byId.has(e.to))

      // edges
      for (const e of es) {
        const a = xy(e.from)
        const b = xy(e.to)
        const onLin = lin.has(e.from) && lin.has(e.to)
        const mx = (a[0] + b[0]) / 2
        const my = (a[1] + b[1]) / 2 - Math.abs(b[0] - a[0]) * 0.1 - 10
        ctx.beginPath()
        ctx.moveTo(a[0], a[1])
        ctx.quadraticCurveTo(mx, my, b[0], b[1])
        ctx.lineWidth = onLin ? 2 : 1.2
        ctx.strokeStyle = onLin ? C.brass : C.dim
        ctx.globalAlpha = onLin ? 0.9 : mode === 'client' ? 0.9 : 0.4
        ctx.stroke()
        ctx.globalAlpha = 1
        // arrowhead
        const ang = Math.atan2(b[1] - my, b[0] - mx)
        const nr = 10
        const ax = b[0] - Math.cos(ang) * (nr + 2)
        const ay = b[1] - Math.sin(ang) * (nr + 2)
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax - Math.cos(ang - 0.4) * 6, ay - Math.sin(ang - 0.4) * 6)
        ctx.lineTo(ax - Math.cos(ang + 0.4) * 6, ay - Math.sin(ang + 0.4) * 6)
        ctx.closePath()
        ctx.fillStyle = onLin ? C.brass : C.dim
        ctx.globalAlpha = onLin ? 0.9 : mode === 'client' ? 0.85 : 0.4
        ctx.fill()
        ctx.globalAlpha = 1
        // edge label
        if (onLin) {
          ctx.font = '10px ' + cssv('--mono')
          ctx.textAlign = 'center'
          ctx.fillStyle = C.faint
          ctx.fillText(e.kind, mx, my - 2)
        }
      }

      // nodes
      const hits: Array<{ id: string; x: number; y: number; r: number }> = []
      for (const n of visibleNodes) {
        const [x, y] = xy(n.id)
        const isFocus = n.id === focusId
        const inLin = lin.has(n.id)
        const r = isFocus ? 12 : 9
        const col = cssv(toneVar(n.status))
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
        ctx.globalAlpha = mode === 'internal' && !inLin ? 0.5 : 1
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, r - 4, 0, Math.PI * 2)
        ctx.fillStyle = col
        ctx.fill()
        ctx.globalAlpha = 1

        ctx.font = (isFocus ? '600 ' : '') + '12px ' + cssv('--serif')
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = inLin || mode === 'client' ? C.ink : C.faint
        ctx.fillText(n.name, x, y + r + 5)
        if (mode === 'client') {
          ctx.font = '10px ' + cssv('--mono')
          ctx.fillStyle = C.faint
          ctx.fillText(n.period.replace(' – ', '–'), x, y + r + 21)
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
  }, [nodes, edges, focusId, mode, height])

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
