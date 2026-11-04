// Geometry of the coordination tester's zig-zag track, in millimetres on the top plate
// (x to the right, y away from the subject). The stylus must stay within HALF_WIDTH of
// the centre line; the loop matches the "bow-tie" plate sketched in the lab report.

export const PLATE = { w: 300, h: 150 }
export const HALF_WIDTH = 6

export const TRACK: [number, number][] = [
  [-120, 50], [-80, 22], [-40, 50], [0, 22], [40, 50], [80, 22], [120, 50],
  [120, -50], [80, -22], [40, -50], [0, -22], [-40, -50], [-80, -22], [-120, -50],
]

export const START = { x: TRACK[0][0], y: TRACK[0][1] }

const segments = TRACK.map((a, i) => {
  const b = TRACK[(i + 1) % TRACK.length]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return { ax: a[0], ay: a[1], dx, dy, len: Math.hypot(dx, dy) }
})

const offsets: number[] = []
let total = 0
for (const s of segments) {
  offsets.push(total)
  total += s.len
}
export const LOOP_LENGTH = total

export interface Nearest {
  /** Closest point on the centre line. */
  x: number
  y: number
  /** Distance from it. */
  d: number
  /** Arc length along the loop at that point. */
  s: number
}

export function nearestOnTrack(px: number, py: number): Nearest {
  let best: Nearest = { x: 0, y: 0, d: Infinity, s: 0 }
  segments.forEach((seg, i) => {
    const t = Math.max(0, Math.min(1, ((px - seg.ax) * seg.dx + (py - seg.ay) * seg.dy) / (seg.len * seg.len)))
    const x = seg.ax + t * seg.dx
    const y = seg.ay + t * seg.dy
    const d = Math.hypot(px - x, py - y)
    if (d < best.d) best = { x, y, d, s: offsets[i] + t * seg.len }
  })
  return best
}
