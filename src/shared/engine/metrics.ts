import type { CurveStats, DisplayUnit, LineMetrics, SeriesPoint } from '../types'
import { timeInRange } from './pd'

export function computeCurveStats(
  points: SeriesPoint[],
  unit: DisplayUnit,
  window?: { low: number; high: number },
  range?: { startDays: number; endDays: number }
): CurveStats {
  const start = range?.startDays ?? 0
  const end = range?.endDays ?? Infinity
  const use = points.filter((p) => p.tDays >= start && p.tDays <= end)
  const slice = use.length ? use : points
  let cmax = -Infinity
  let tmax = 0
  let cmin = Infinity
  let tmin = 0
  let auc = 0
  const vals: number[] = []
  for (let i = 0; i < slice.length; i++) {
    const p = slice[i]
    vals.push(p.value)
    if (p.value > cmax) {
      cmax = p.value
      tmax = p.tDays
    }
    if (p.value < cmin) {
      cmin = p.value
      tmin = p.tDays
    }
    if (i > 0) {
      const dt = slice[i].tDays - slice[i - 1].tDays
      auc += 0.5 * (slice[i].value + slice[i - 1].value) * dt
    }
  }
  if (!slice.length) {
    cmax = 0
    cmin = 0
  }
  const span = slice.length ? slice[slice.length - 1].tDays - slice[0].tDays : 0
  const cavg = span > 0 ? auc / span : 0
  const sorted = vals.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = !sorted.length
    ? 0
    : sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  const stdev = vals.length
    ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / vals.length)
    : 0
  let above = 0
  let below = 0
  let inr = 0
  if (window && vals.length) {
    for (const v of vals) {
      if (v > window.high) above++
      else if (v < window.low) below++
      else inr++
    }
    above /= vals.length
    below /= vals.length
    inr /= vals.length
  } else if (window) {
    inr = timeInRange(vals, window.low, window.high)
  }
  return {
    cmax: Number.isFinite(cmax) ? cmax : 0,
    tmaxDays: tmax,
    cmin: Number.isFinite(cmin) ? cmin : 0,
    tminDays: tmin,
    cavg,
    median,
    stdev,
    auc,
    peakTrough: cmin > 1e-9 ? cmax / cmin : cmax > 0 ? Infinity : 0,
    fluctuation: cavg > 1e-9 ? (cmax - cmin) / cavg : 0,
    timeInRange: inr,
    timeAbove: above,
    timeBelow: below,
    unit
  }
}

export function metricsFromPoints(
  points: SeriesPoint[],
  opts: {
    lineId: string
    formulationId: string
    label: string
    unit: LineMetrics['unit']
    window?: { low: number; high: number }
    injections: number
    parentEquivalentPerDay?: number
    yieldFraction?: number
    startDays?: number
    endDays?: number
  }
): LineMetrics {
  const stats = computeCurveStats(points, opts.unit, opts.window, {
    startDays: opts.startDays ?? 0,
    endDays: opts.endDays ?? Infinity
  })
  return {
    lineId: opts.lineId,
    formulationId: opts.formulationId,
    label: opts.label,
    cmax: stats.cmax,
    tmaxDays: stats.tmaxDays,
    cmin: stats.cmin,
    tminDays: stats.tminDays,
    cavg: stats.cavg,
    median: stats.median,
    stdev: stats.stdev,
    auc: stats.auc,
    peakTrough: stats.peakTrough,
    fluctuation: stats.fluctuation,
    timeInRange: stats.timeInRange,
    timeAbove: stats.timeAbove,
    timeBelow: stats.timeBelow,
    parentEquivalentPerDay: opts.parentEquivalentPerDay,
    yieldFraction: opts.yieldFraction,
    injections: opts.injections,
    unit: opts.unit
  }
}
