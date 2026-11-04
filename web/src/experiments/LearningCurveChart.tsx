import { formatPlotValue, plotValue, powerFit } from './analysis'
import type { Metric, Trial } from './types'

const W = 640
const H = 300
const M = { l: 64, r: 16, t: 16, b: 44 }

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v))
  const steps = [1, 2, 2.5, 5, 10]
  return (steps.find((s) => s * p >= v) ?? 10) * p
}

/** Trial number vs. time/deviation, like the graph-paper plots in the lab report. */
export default function LearningCurveChart({ trials, metric }: { trials: Trial[]; metric: Metric }) {
  if (trials.length === 0) return null
  const points = trials.map((t) => ({ n: t.n, y: plotValue(t.value, metric), faulty: t.faulty }))
  const valid = points.filter((p) => !p.faulty)
  const fit = powerFit(valid)
  const maxN = Math.max(...points.map((p) => p.n), 2)
  const maxY = niceMax(Math.max(...points.map((p) => p.y), 0.1) * 1.1)

  const x = (n: number) => M.l + ((n - 1) / (maxN - 1)) * (W - M.l - M.r)
  const y = (v: number) => H - M.b - (v / maxY) * (H - M.t - M.b)

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY)
  const xStep = Math.max(1, Math.ceil(maxN / 15))
  const xTicks = Array.from({ length: maxN }, (_, i) => i + 1).filter((n) => n === 1 || n % xStep === 0)

  const line = valid.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(p.y).toFixed(1)}`).join('')
  const fitPath = fit
    ? Array.from({ length: 60 }, (_, i) => 1 + (i / 59) * (maxN - 1))
        .map((n, i) => `${i ? 'L' : 'M'}${x(n).toFixed(1)},${y(Math.min(fit.a * n ** fit.b, maxY)).toFixed(1)}`)
        .join('')
    : ''

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Learning curve: ${metric.label} by trial`}>
        {yTicks.map((v) => (
          <g key={v}>
            <line className="grid" x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} />
            <text className="tick" x={M.l - 8} y={y(v) + 4} textAnchor="end">{formatPlotValue(v, metric)}</text>
          </g>
        ))}
        {xTicks.map((n) => (
          <text key={n} className="tick" x={x(n)} y={H - M.b + 18} textAnchor="middle">{n}</text>
        ))}
        <text className="axis-label" x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">Trial number</text>
        <line className="axis" x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} />
        <line className="axis" x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} />

        {fit && <path className="fit" d={fitPath} />}
        <path className="series" d={line} />
        {points.map((p) => p.faulty ? (
          <g key={p.n}>
            <circle className="pt-faulty" cx={x(p.n)} cy={y(p.y)} r={5} />
            <text className="pt-faulty-label" x={x(p.n)} y={y(p.y) - 9} textAnchor="middle">F</text>
          </g>
        ) : (
          <circle key={p.n} className="pt" cx={x(p.n)} cy={y(p.y)} r={4} />
        ))}
      </svg>
      <figcaption className="small muted">
        {metric.kind === 'deviation' ? `|${metric.label}|` : metric.label} per trial
        {fit && ' · dashed: fitted learning curve y = a·nᵇ'} · F = faulty (excluded from the fit)
      </figcaption>
    </figure>
  )
}
