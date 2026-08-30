import { CLUSTER_COLOR } from '../catalog/clusters'
import { FORMULATIONS, getFormulation } from '../catalog'
import { MAX_HORIZON_DAYS, MAX_PROTOCOL_LINES } from '../library'
import type {
  AnalyteSeries,
  AnalyteStats,
  AppSettings,
  DoseEvent,
  Formulation,
  LineMetrics,
  PatientProfile,
  ProtocolLine,
  SeriesPoint,
  SimulationResult
} from '../types'
import {
  bateman,
  batemanAmplitude,
  kFromHalfLife,
  maxBatemanTmax,
  solveKFast,
  theoreticalTmax,
  zeroOrder
} from './bateman'
import { computeCurveStats, metricsFromPoints } from './metrics'
import { convert } from './units'
import { estimatedE2FromT, vermeulenFreeT } from './pd'
import { expandDoses } from './schedule'

const FORM_INDEX = new Map(FORMULATIONS.map((f) => [f.id, f]))

interface Kernel {
  formulation: Formulation
  kSlow: number
  kFast: number
  ampPerMg: number
  infusionDays: number
  lagDays: number
}

function kernelFor(f: Formulation, weightKg: number): Kernel {
  const weightScale = Math.max(weightKg, 30) / 70
  const kSlow = kFromHalfLife(f.tHalfDays)
  const maxT = maxBatemanTmax(kSlow)
  let lag = Math.max(f.lagDays ?? 0, 0)
  let tPeak = Math.max(f.tMaxDays - lag, 1e-4)
  if (f.model !== 'zero-order' && tPeak > maxT) {
    lag += tPeak - maxT
    tPeak = maxT
  }
  const kFast = solveKFast(kSlow, tPeak)
  const tMax = theoreticalTmax(kSlow, kFast)
  const cmax = f.cmaxRef / weightScale
  const amp = f.model === 'zero-order' ? cmax : batemanAmplitude(cmax, kSlow, kFast, tMax)
  return {
    formulation: f,
    kSlow,
    kFast,
    ampPerMg: f.doseRef > 0 ? amp / f.doseRef : 0,
    infusionDays: (f.zeroOrderHours ?? 24) / 24,
    lagDays: lag
  }
}

function contrib(k: Kernel, tauDays: number, dose: number): number {
  const tau = tauDays - k.lagDays
  if (tau < 0 || dose <= 0) return 0
  if (k.formulation.model === 'zero-order') {
    return zeroOrder(tau, k.infusionDays, k.kSlow, k.ampPerMg * dose)
  }
  return bateman(tau, k.kSlow, k.kFast, k.ampPerMg * dose)
}

function blendAmplitude(parent: Formulation, weightKg: number): number {
  if (!parent.blendOf?.length) return 1
  const weightScale = Math.max(weightKg, 30) / 70
  const target = parent.cmaxRef / weightScale
  const parts = parent.blendOf
    .map((p) => {
      const child = FORM_INDEX.get(p.formulationId)
      if (!child) return null
      return { k: kernelFor(child, weightKg), dose: blendScale(parent, p.doseMg, parent.doseRef) }
    })
    .filter(Boolean) as { k: ReturnType<typeof kernelFor>; dose: number }[]
  const tEnd = Math.max(...parts.map((p) => p.k.lagDays + p.k.formulation.tMaxDays * 4), 1)
  const dt = Math.min(0.05, tEnd / 80)
  let cmax = 0
  for (let t = 0; t <= tEnd; t += dt) {
    let c = 0
    for (const p of parts) c += contrib(p.k, t, p.dose)
    if (c > cmax) cmax = c
  }
  if (cmax < 1e-9) return 1
  return target / cmax
}

function blendScale(parent: Formulation, partDoseMg: number, lineDose: number): number {
  const total = parent.blendOf!.reduce((s, p) => s + p.doseMg, 0) || 1
  const denom =
    parent.id === 'test-sustanon-250' || parent.id === 'test-omnadren' ? 250 : total
  return lineDose * (partDoseMg / denom)
}

function expandLine(
  line: ProtocolLine,
  horizonDays: number
): { events: DoseEvent[]; formulation: Formulation }[] {
  const f = FORM_INDEX.get(line.formulationId)
  if (!f) return []
  if (f.blendOf?.length) {
    return f.blendOf.flatMap((part) => {
      const child = FORM_INDEX.get(part.formulationId)
      if (!child) return []
      const scaled: ProtocolLine = {
        ...line,
        formulationId: child.id,
        dose: blendScale(f, part.doseMg, line.dose)
      }
      return [{ events: expandDoses(scaled, child, horizonDays), formulation: child }]
    })
  }
  return [{ events: expandDoses(line, f, horizonDays), formulation: f }]
}

function stepSize(forms: Formulation[], horizonDays: number): number {
  let step = 0.125
  for (const f of forms) {
    const p = Math.min(f.tMaxDays || 1, f.tHalfDays || 1)
    step = Math.min(step, Math.max(0.008, p / 8))
  }
  const maxPoints = 8000
  const minStep = horizonDays / maxPoints
  return Math.max(step, minStep)
}

export function interpolate(points: SeriesPoint[], tDays: number): number {
  if (!points.length) return 0
  if (tDays <= points[0].tDays) return points[0].value
  if (tDays >= points[points.length - 1].tDays) return points[points.length - 1].value
  let lo = 0
  let hi = points.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (points[mid].tDays <= tDays) lo = mid
    else hi = mid
  }
  const a = points[lo]
  const b = points[hi]
  const u = (tDays - a.tDays) / Math.max(b.tDays - a.tDays, 1e-9)
  return a.value + (b.value - a.value) * u
}

export function simulate(opts: {
  lines: ProtocolLine[]
  patient: PatientProfile
  horizonDays: number
  cvPercent: number
  settings: Pick<AppSettings, 'showUncertainty' | 'showFreeHormone' | 'showEstimatedE2'>
}): SimulationResult {
  const horizon = Math.min(MAX_HORIZON_DAYS, Math.max(Number.isFinite(opts.horizonDays) ? opts.horizonDays : 84, 1))
  const safeLines = opts.lines.slice(0, MAX_PROTOCOL_LINES)
  const used: Formulation[] = []
  for (const line of safeLines) {
    if (!line.enabled) continue
    const f = getFormulation(line.formulationId)
    if (!f) continue
    if (f.blendOf) {
      for (const p of f.blendOf) {
        const c = FORM_INDEX.get(p.formulationId)
        if (c) used.push(c)
      }
    } else used.push(f)
  }
  const STEP = stepSize(used, horizon)
  const n = Math.floor(horizon / STEP) + 1
  const times: number[] = Array.from({ length: n }, (_, i) => i * STEP)

  const groups: {
    line: ProtocolLine
    formulation: Formulation
    parentFormulation: Formulation
    parentEvents: DoseEvent[]
    events: DoseEvent[]
    kernel: Kernel
    ampScale: number
  }[] = []

  const blendCache = new Map<string, number>()

  for (const line of safeLines) {
    if (!line.enabled) continue
    const parent = getFormulation(line.formulationId)
    if (!parent) continue
    let ampScale = 1
    if (parent.blendOf?.length) {
      const key = parent.id + ':' + opts.patient.weightKg
      if (!blendCache.has(key)) blendCache.set(key, blendAmplitude(parent, opts.patient.weightKg))
      ampScale = blendCache.get(key)!
    }
    const parentEvents = expandDoses(line, parent, horizon)
    for (const part of expandLine(line, horizon)) {
      groups.push({
        line,
        formulation: part.formulation,
        parentFormulation: parent,
        parentEvents,
        events: part.events,
        kernel: kernelFor(part.formulation, opts.patient.weightKg),
        ampScale
      })
    }
  }

  const byAnalyte = new Map<
    string,
    {
      label: string
      cluster: Formulation['cluster']
      unit: Formulation['nativeUnit']
      values: number[]
      lineIds: Set<string>
    }
  >()

  const lineValues = new Map<string, { f: Formulation; values: number[]; events: DoseEvent[] }>()

  for (const g of groups) {
    const scale = (1 + (g.line.scalePercent ?? 0) / 100) * g.ampScale
    const values = new Float64Array(n)
    const span = Math.max(g.formulation.tHalfDays * 12, g.kernel.lagDays + g.formulation.tMaxDays * 4, 1)
    for (const ev of g.events) {
      const i0 = Math.max(0, Math.floor(ev.tDays / STEP))
      const i1 = Math.min(n - 1, Math.ceil((ev.tDays + span) / STEP))
      for (let i = i0; i <= i1; i++) {
        values[i] += contrib(g.kernel, times[i] - ev.tDays, ev.dose) * scale
      }
    }
    const arr = Array.from(values)
    const existing = lineValues.get(g.line.id)
    if (existing && existing.f.analyte === g.formulation.analyte) {
      for (let i = 0; i < n; i++) existing.values[i] += arr[i]
    } else if (!existing) {
      lineValues.set(g.line.id, { f: g.parentFormulation, values: arr, events: g.parentEvents.slice() })
    } else {
      lineValues.set(`${g.line.id}:${g.formulation.id}`, {
        f: g.formulation,
        values: arr,
        events: g.parentEvents.slice()
      })
    }

    let bucket = byAnalyte.get(g.formulation.analyte)
    if (!bucket) {
      bucket = {
        label: g.formulation.analyteLabel,
        cluster: g.formulation.cluster,
        unit: g.formulation.nativeUnit,
        values: new Array(n).fill(0),
        lineIds: new Set()
      }
      byAnalyte.set(g.formulation.analyte, bucket)
    }
    for (let i = 0; i < n; i++) bucket.values[i] += arr[i]
    bucket.lineIds.add(g.line.id)
  }

  const cv = Math.max(opts.cvPercent, 0) / 100
  const series: AnalyteSeries[] = []

  for (const [analyte, bucket] of byAnalyte) {
    series.push({
      analyte,
      analyteLabel: bucket.label,
      cluster: bucket.cluster,
      unit: bucket.unit,
      color: CLUSTER_COLOR[bucket.cluster],
      lineIds: [...bucket.lineIds],
      points: times.map((t, i) => {
        const v = bucket.values[i]
        return { tDays: t, value: v, low: v * (1 - cv), high: v * (1 + cv) }
      })
    })
  }

  if (opts.settings.showFreeHormone && opts.patient.shbgNmol) {
    const tSeries = series.find((s) => s.analyte === 'testosterone')
    if (tSeries) {
      const albumin = opts.patient.albuminGdl ?? 4.3
      series.push({
        analyte: 'testosterone-free',
        analyteLabel: 'Testosterone libero',
        cluster: 'testosterone',
        unit: 'nmol/L',
        color: '#F0D5A8',
        lineIds: tSeries.lineIds,
        points: tSeries.points.map((p) => {
          const nmol = convert(p.value, tSeries.unit, 'nmol/L')
          const ft = vermeulenFreeT(nmol, opts.patient.shbgNmol!, albumin)
          return { tDays: p.tDays, value: ft, low: ft * (1 - cv), high: ft * (1 + cv) }
        })
      })
    }
  }

  if (opts.settings.showEstimatedE2 && !byAnalyte.has('estradiol')) {
    const tSeries = series.find((s) => s.analyte === 'testosterone')
    if (tSeries) {
      series.push({
        analyte: 'estradiol-est',
        analyteLabel: 'E2 stimato da T',
        cluster: 'estrogens',
        unit: 'pmol/L',
        color: '#E8A0B0',
        lineIds: tSeries.lineIds,
        points: tSeries.points.map((p) => {
          const nmol = convert(p.value, tSeries.unit, 'nmol/L')
          const e2 = estimatedE2FromT(nmol) * 1000
          return { tDays: p.tDays, value: e2, low: e2 * (1 - cv), high: e2 * (1 + cv) }
        })
      })
    }
  }

  const metrics: LineMetrics[] = []
  for (const [lineId, rec] of lineValues) {
    const baseLineId = lineId.split(':')[0]
    const line = safeLines.find((l) => l.id === baseLineId)
    const points: SeriesPoint[] = times.map((t, i) => ({
      tDays: t,
      value: rec.values[i],
      low: rec.values[i],
      high: rec.values[i]
    }))
    const win = rec.f.window
      ? {
          low: convert(rec.f.window.low, rec.f.window.unit, rec.f.nativeUnit),
          high: convert(rec.f.window.high, rec.f.window.unit, rec.f.nativeUnit)
        }
      : undefined
    const yieldF = rec.f.yieldFraction
    const parentEq =
      yieldF != null && line ? (line.dose * yieldF) / Math.max(line.durationDays, 1) : undefined
    metrics.push(
      metricsFromPoints(points, {
        lineId,
        formulationId: rec.f.id,
        label: rec.f.name,
        unit: rec.f.nativeUnit,
        window: win,
        injections: rec.events.length,
        parentEquivalentPerDay: parentEq,
        yieldFraction: yieldF,
        startDays: horizon * 0.45,
        endDays: horizon
      })
    )
  }

  const events: DoseEvent[] = safeLines.flatMap((line) => {
    if (!line.enabled) return []
    const formulation = getFormulation(line.formulationId)
    return formulation ? expandDoses(line, formulation, horizon) : []
  })
  events.sort((a, b) => a.tDays - b.tDays)

  const ssStartDays = horizon * 0.5
  const analyteStats: AnalyteStats[] = series.map((s) => {
    const src = FORMULATIONS.find((f) => f.analyte === s.analyte && f.window)
    const win = src?.window
      ? {
          low: convert(src.window.low, src.window.unit, s.unit),
          high: convert(src.window.high, src.window.unit, s.unit)
        }
      : undefined
    return {
      analyte: s.analyte,
      analyteLabel: s.analyteLabel,
      unit: s.unit,
      ss: computeCurveStats(s.points, s.unit, win, { startDays: ssStartDays, endDays: horizon }),
      full: computeCurveStats(s.points, s.unit, win)
    }
  })

  return { series, events, metrics, analyteStats, horizonDays: horizon, ssStartDays }
}
