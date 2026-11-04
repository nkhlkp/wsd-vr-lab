import type { Metric, Trial } from './types'

// The lab's eye-fatigue reader: fatigue value = 60 − reading (as in the lab report).
export const FATIGUE_BASE = 60
export const fatigueValue = (reading: number) => FATIGUE_BASE - reading

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN
}

/** Value plotted on the learning curve: deviations are judged by their size. */
export function plotValue(value: number, metric: Metric) {
  return metric.kind === 'deviation' ? Math.abs(value) : value
}

export interface PowerFit {
  a: number
  b: number
  /** 2^b: the fraction of the previous value reached each time the trial count doubles. */
  learningRate: number
  r2: number
}

/** Least-squares fit of y = a·n^b on log–log axes (Wright's learning curve). */
export function powerFit(points: { n: number; y: number }[]): PowerFit | null {
  const pts = points.filter((p) => p.y > 0)
  if (pts.length < 3) return null
  const X = pts.map((p) => Math.log(p.n))
  const Y = pts.map((p) => Math.log(p.y))
  const mx = mean(X)
  const my = mean(Y)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < pts.length; i++) {
    sxy += (X[i] - mx) * (Y[i] - my)
    sxx += (X[i] - mx) ** 2
    syy += (Y[i] - my) ** 2
  }
  if (sxx === 0) return null
  const b = sxy / sxx
  return {
    a: Math.exp(my - b * mx),
    b,
    learningRate: 2 ** b,
    r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy),
  }
}

export interface Summary {
  /** Non-faulty trials as plotted points. */
  valid: { n: number; y: number }[]
  fit: PowerFit | null
  firstAvg: number | null
  lastAvg: number | null
  /** (first − last) / first; positive means improvement. */
  improvement: number | null
  /** Trials that jump clearly above both neighbours, read as fatigue. */
  peaks: number[]
  fatigueBefore: number | null
  fatigueAfter: number | null
}

export function summarize(trials: Trial[], metric: Metric, before: number[], after: number[]): Summary {
  const valid = trials.filter((t) => !t.faulty).map((t) => ({ n: t.n, y: plotValue(t.value, metric) }))
  const k = Math.min(3, Math.floor(valid.length / 2))
  const firstAvg = k ? mean(valid.slice(0, k).map((p) => p.y)) : null
  const lastAvg = k ? mean(valid.slice(-k).map((p) => p.y)) : null
  const peaks: number[] = []
  for (let i = 1; i < valid.length - 1; i++) {
    const y = valid[i].y
    if (y > valid[i - 1].y * 1.05 && y > valid[i + 1].y * 1.05) peaks.push(valid[i].n)
  }
  return {
    valid,
    fit: powerFit(valid),
    firstAvg,
    lastAvg,
    improvement: firstAvg && lastAvg !== null ? (firstAvg - lastAvg) / firstAvg : null,
    peaks,
    fatigueBefore: before.length ? mean(before.map(fatigueValue)) : null,
    fatigueAfter: after.length ? mean(after.map(fatigueValue)) : null,
  }
}

/** m:ss.s, the way the lab report writes cycle times. */
export function formatTime(seconds: number) {
  const tenths = Math.round(seconds * 10)
  const m = Math.floor(tenths / 600)
  const s = (tenths - m * 600) / 10
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

export function formatValue(value: number, metric: Metric) {
  if (metric.kind === 'time') return formatTime(value)
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} ${metric.unit}`
}

/** Formats a plotted (non-negative) value for axes and summaries. */
export function formatPlotValue(y: number, metric: Metric) {
  return metric.kind === 'time' ? formatTime(y) : `${y.toFixed(1)} ${metric.unit}`
}
