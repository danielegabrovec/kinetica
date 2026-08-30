import type { AnalyteSeries, DisplayUnit, SimulationResult } from '../types'
import { interpolate } from './simulate'
import { convert, preferredUnit } from './units'

export const DELTA_COLOR = '#94A3B8'

export function primarySeries(result: SimulationResult): AnalyteSeries[] {
  return result.series.filter((s) => !s.analyte.endsWith('-est') && !s.analyte.endsWith('-free'))
}

export function overlayTimeGrid(horizonDays: number, step = 0.1): number[] {
  const h = Math.max(horizonDays, 0.1)
  const n = Math.max(1, Math.round(h / step))
  const times: number[] = []
  for (let i = 0; i <= n; i++) {
    times.push(Math.round(((i * h) / n) * 1000) / 1000)
  }
  return times
}

export function resampleSeries(
  s: AnalyteSeries,
  times: number[],
  unit: DisplayUnit
): [number, number][] {
  return times.map((t) => [t, convert(interpolate(s.points, t), s.unit, unit)])
}

export function subtractSeries(a: [number, number][], b: [number, number][]): [number, number][] {
  const n = Math.min(a.length, b.length)
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    out.push([a[i]![0], a[i]![1] - b[i]![1]])
  }
  return out
}

export type OverlayGroupIn = { label: string; result: SimulationResult }

export type DeltaPair = {
  analyte: string
  analyteLabel: string
  unit: DisplayUnit
  aLabel: string
  bLabel: string
  name: string
  a: [number, number][]
  b: [number, number][]
  delta: [number, number][]
}

function mateOf(ref: AnalyteSeries, others: AnalyteSeries[], unitMode: 'si' | 'conventional') {
  const same = others.find((x) => x.analyte === ref.analyte)
  if (same) return same
  if (
    others.length === 1 &&
    preferredUnit(ref.unit, unitMode) === preferredUnit(others[0]!.unit, unitMode)
  ) {
    return others[0]!
  }
  return undefined
}

export function overlayDeltas(
  groups: OverlayGroupIn[],
  times: number[],
  unitMode: 'si' | 'conventional'
): DeltaPair[] {
  if (groups.length < 2) return []
  const ref = groups[0]!
  const refSeries = primarySeries(ref.result)
  const pairs: DeltaPair[] = []
  for (let gi = 1; gi < groups.length; gi++) {
    const g = groups[gi]!
    const others = primarySeries(g.result)
    const onlyOneEach = refSeries.length === 1 && others.length === 1
    for (const s of refSeries) {
      const mate = onlyOneEach ? mateOf(s, others, unitMode) : others.find((x) => x.analyte === s.analyte)
      if (!mate) continue
      const unit = preferredUnit(s.unit, unitMode)
      const a = resampleSeries(s, times, unit)
      const b = resampleSeries(mate, times, unit)
      pairs.push({
        analyte: s.analyte,
        analyteLabel: s.analyteLabel,
        unit,
        aLabel: ref.label,
        bLabel: g.label,
        name: `Δ (${ref.label} − ${g.label})`,
        a,
        b,
        delta: subtractSeries(a, b)
      })
    }
  }
  return pairs
}

export type OverlayDeltaStat = {
  label: string
  analyteLabel: string
  unit: DisplayUnit
  dcavg: number
  dcmax: number
  dcmin: number
  dpt: number
}

export function overlayDeltaStats(
  groups: OverlayGroupIn[],
  unitMode: 'si' | 'conventional'
): OverlayDeltaStat[] {
  if (groups.length < 2) return []
  const ref = groups[0]!
  const aStats = ref.result.analyteStats.filter(
    (s) => !s.analyte.endsWith('-est') && !s.analyte.endsWith('-free')
  )
  const rows: OverlayDeltaStat[] = []
  for (let i = 1; i < groups.length; i++) {
    const g = groups[i]!
    const bStats = g.result.analyteStats.filter(
      (s) => !s.analyte.endsWith('-est') && !s.analyte.endsWith('-free')
    )
    const onlyOneEach = aStats.length === 1 && bStats.length === 1
    for (const a of aStats) {
      const b =
        bStats.find((x) => x.analyte === a.analyte) ??
        (onlyOneEach && preferredUnit(a.unit, unitMode) === preferredUnit(bStats[0]!.unit, unitMode)
          ? bStats[0]
          : undefined)
      if (!b) continue
      const unit = preferredUnit(a.unit, unitMode)
      rows.push({
        label: `Δ (${ref.label} − ${g.label})`,
        analyteLabel: a.analyteLabel,
        unit,
        dcavg: convert(a.ss.cavg, a.unit, unit) - convert(b.ss.cavg, b.unit, unit),
        dcmax: convert(a.ss.cmax, a.unit, unit) - convert(b.ss.cmax, b.unit, unit),
        dcmin: convert(a.ss.cmin, a.unit, unit) - convert(b.ss.cmin, b.unit, unit),
        dpt: a.ss.peakTrough - b.ss.peakTrough
      })
    }
  }
  return rows
}
