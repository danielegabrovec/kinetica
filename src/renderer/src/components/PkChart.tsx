import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { CLUSTER_COLOR, getFormulation } from '@shared/catalog'
import {
  DELTA_COLOR,
  overlayDeltaStats,
  overlayDeltas,
  overlayTimeGrid,
  primarySeries,
  resampleSeries
} from '@shared/engine/overlay'
import { convert, formatConc, preferredUnit } from '@shared/engine/units'
import type { DisplayUnit, ProtocolLine, SimStroke, SimulationResult } from '@shared/types'
import { useApp } from '../store/useApp'

export type ChartPaint = { color: string; stroke?: SimStroke; lineWidth?: number }

export function PkChart({
  result,
  lines: linesProp,
  paint
}: {
  result: SimulationResult
  lines?: ProtocolLine[]
  paint?: ChartPaint
}) {
  const settings = useApp((s) => s.settings)
  const storeLines = useApp((s) => s.lines)
  const lines = linesProp ?? storeLines
  const selected = useApp((s) => s.selectedLineId)
  const patch = useApp((s) => s.patchSettings)
  const option = build(result, settings, selected, lines, paint)

  return (
    <div className="chart-wrap">
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        notMerge
        lazyUpdate
        opts={{ renderer: 'canvas' }}
        onEvents={{
          legendselectchanged: (e: { selected: Record<string, boolean> }) => {
            patch({
              showRefMax: e.selected['Max'] !== false,
              showRefAvg: e.selected['Media'] !== false,
              showRefMin: e.selected['Min'] !== false
            })
          }
        }}
      />
    </div>
  )
}

export type OverlayGroup = {
  label: string
  color: string
  stroke?: SimStroke
  lineWidth?: number
  result: SimulationResult
}

export function OverlayChart({ groups }: { groups: OverlayGroup[] }) {
  const settings = useApp((s) => s.settings)
  const unitMode = settings.unitMode
  const horizon = Math.max(...groups.map((g) => g.result.horizonDays), 1)
  const times = overlayTimeGrid(horizon)
  const series: EChartsOption['series'] = []
  const units: string[] = []
  const unitByName = new Map<string, string>()

  for (const g of groups) {
    const stroke = g.stroke ?? 'solid'
    const width = g.lineWidth ?? 2.4
    for (const s of primarySeries(g.result)) {
      const unit = preferredUnit(s.unit, unitMode)
      if (!units.includes(unit)) units.push(unit)
      const yAxisIndex = units[1] && unit === units[1] ? 1 : 0
      const name = `${g.label} · ${s.analyteLabel}`
      unitByName.set(name, unit)
      series.push({
        name,
        type: 'line',
        yAxisIndex,
        color: g.color,
        data: resampleSeries(s, times, unit),
        showSymbol: false,
        connectNulls: true,
        itemStyle: { color: g.color },
        lineStyle: { width, color: g.color, type: stroke },
        emphasis: { focus: 'none', lineStyle: { width, color: g.color } },
        z: 3
      } as never)
    }
  }

  const deltas = overlayDeltas(groups, times, unitMode)
  for (const d of deltas) {
    if (!units.includes(d.unit)) units.push(d.unit)
    const yAxisIndex = units[1] && d.unit === units[1] ? 1 : 0
    unitByName.set(d.name, d.unit)
    series.push({
      name: d.name,
      type: 'line',
      yAxisIndex,
      color: DELTA_COLOR,
      data: d.delta,
      showSymbol: false,
      connectNulls: true,
      itemStyle: { color: DELTA_COLOR },
      lineStyle: { width: 1.6, color: DELTA_COLOR, type: 'dotted' },
      emphasis: { focus: 'none' },
      z: 4
    } as never)
  }

  const y1 = units[0]
  const y2 = units[1]
  const stats = overlayDeltaStats(groups, unitMode)

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    animation: false,
    grid: { left: 58, right: y2 ? 58 : 18, top: 28, bottom: 42 },
    legend: {
      top: 4,
      textStyle: { color: '#93A0B5', fontFamily: 'IBM Plex Sans', fontSize: 11 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', snap: true },
      backgroundColor: '#121A2A',
      borderColor: '#243044',
      confine: true,
      textStyle: { color: '#E8EDF5', fontFamily: 'IBM Plex Mono', fontSize: 12 },
      formatter: (raw) => overlayTooltip(raw, unitByName)
    },
    xAxis: {
      type: 'value',
      name: 'giorni',
      nameTextStyle: { color: '#93A0B5', fontFamily: 'IBM Plex Mono', fontSize: 10 },
      axisLine: { lineStyle: { color: '#243044' } },
      axisLabel: { color: '#93A0B5', fontFamily: 'IBM Plex Mono' },
      splitLine: { lineStyle: { color: 'rgba(36,48,68,0.55)', type: 'dashed' } }
    },
    yAxis: [
      {
        type: 'value',
        name: y1,
        nameTextStyle: { color: '#93A0B5', fontFamily: 'IBM Plex Mono', fontSize: 10 },
        axisLine: { lineStyle: { color: '#243044' } },
        axisLabel: { color: '#93A0B5', fontFamily: 'IBM Plex Mono' },
        splitLine: { lineStyle: { color: 'rgba(36,48,68,0.4)' } }
      },
      {
        type: 'value',
        name: y2 ?? '',
        show: Boolean(y2),
        axisLabel: { color: '#93A0B5', fontFamily: 'IBM Plex Mono' },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      { type: 'inside' },
      {
        type: 'slider',
        height: 12,
        bottom: 8,
        borderColor: '#243044',
        fillerColor: 'rgba(212,165,116,0.14)',
        handleStyle: { color: '#D4A574' },
        textStyle: { color: '#93A0B5', fontSize: 10 }
      }
    ],
    series
  }

  return (
    <div className="overlay-wrap">
      <div className="chart-wrap overlay-chart">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          notMerge
          lazyUpdate
          opts={{ renderer: 'canvas' }}
        />
      </div>
      {stats.length ? (
        <div className="overlay-delta">
          {stats.map((row) => (
            <div key={`${row.label}-${row.analyteLabel}`} className="overlay-delta-row">
              <span className="overlay-delta-label">
                {row.label}
                {stats.length > 1 || row.analyteLabel ? ` · ${row.analyteLabel}` : ''}
                <em> stato stazionario</em>
              </span>
              <span>
                Cavg {signedConc(row.dcavg, row.unit)}
              </span>
              <span>Cmax {signedConc(row.dcmax, row.unit)}</span>
              <span>Cmin {signedConc(row.dcmin, row.unit)}</span>
              <span>
                P/T {Number.isFinite(row.dpt) ? `${row.dpt > 0 ? '+' : ''}${row.dpt.toFixed(2)}` : '—'}
              </span>
            </div>
          ))}
          <p className="hair" style={{ margin: 0 }}>
            Sul grafico, la curva punteggiata è il Δ istantaneo. Il tooltip al cursore mostra entrambi i valori e il Δ.
          </p>
        </div>
      ) : groups.length >= 2 ? (
        <p className="hair" style={{ marginTop: 8 }}>
          Analiti o unità diversi: il tooltip mostra entrambi i valori, senza curva Δ.
        </p>
      ) : null}
    </div>
  )
}

function signedConc(value: number, unit: Parameters<typeof formatConc>[1]) {
  if (!Number.isFinite(value)) return '—'
  const core = formatConc(Math.abs(value), unit)
  if (value > 0) return `+${core}`
  if (value < 0) return `−${core}`
  return core
}

function overlayTooltip(raw: unknown, unitByName: Map<string, string>): string {
  const list = (Array.isArray(raw) ? raw : [raw]) as {
    seriesName?: string
    color?: string
    value?: unknown
  }[]
  const rows = list
    .map((p) => {
      const value = Array.isArray(p.value) ? p.value : null
      if (!value || value.length < 2) return null
      const t = Number(value[0])
      const v = Number(value[1])
      if (!Number.isFinite(t) || !Number.isFinite(v)) return null
      return { name: p.seriesName ?? '', color: p.color ?? '#E8EDF5', t, v }
    })
    .filter(Boolean) as { name: string; color: string; t: number; v: number }[]
  if (!rows.length) return ''
  const t = rows[0]!.t
  const day = t < 10 ? t.toFixed(2) : t.toFixed(1)
  const body = rows
    .map((r) => {
      const unit = (unitByName.get(r.name) || 'ng/dL') as DisplayUnit
      const delta = r.name.startsWith('Δ')
      const shown = delta ? signedConc(r.v, unit) : formatConc(r.v, unit)
      return `<tr>
        <td style="padding:2px 12px 2px 0;white-space:nowrap">
          <span style="color:${esc(r.color)}">●</span> ${esc(r.name)}
        </td>
        <td style="text-align:right;white-space:nowrap">${esc(shown)}</td>
      </tr>`
    })
    .join('')
  return `<div style="font-family:IBM Plex Mono,monospace;font-size:11px">
    <div style="color:#93A0B5;margin-bottom:6px">giorno ${esc(day)}</div>
    <table>${body}</table>
  </div>`
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function build(
  result: SimulationResult,
  settings: {
    unitMode: 'si' | 'conventional'
    showUncertainty: boolean
    showRefMax?: boolean
    showRefMin?: boolean
    showRefAvg?: boolean
  },
  selected: string | null,
  lines: ProtocolLine[],
  paint?: ChartPaint
): EChartsOption {
  const unitMode = settings.unitMode
  const showUnc = settings.showUncertainty
  const units = [...new Set(result.series.map((s) => preferredUnit(s.unit, unitMode)))]
  const y1 = units[0]
  const y2 = units[1]
  const series: EChartsOption['series'] = []

  result.series.forEach((s, idx) => {
    const unit = preferredUnit(s.unit, unitMode)
    const yAxisIndex = y2 && unit === y2 ? 1 : 0
    const color = paint?.color || s.color || CLUSTER_COLOR[s.cluster]
    const selectedHere = Boolean(selected && lines.some((l) => l.id === selected))
    const dim = selectedHere && selected && !s.lineIds.includes(selected) && lines.length > 1 ? 0.3 : 1
    const data = s.points.map((p) => [round(p.tDays), convert(p.value, s.unit, unit)])
    const stroke = paint?.stroke ?? (idx % 2 === 1 ? 'dashed' : 'solid')
    const width = paint?.lineWidth ?? 2.2

    series.push({
      name: `${s.analyteLabel} (${unit})`,
      type: 'line',
      yAxisIndex,
      color,
      data,
      showSymbol: false,
      itemStyle: { color },
      lineStyle: {
        width,
        color,
        opacity: dim,
        type: stroke
      },
      z: 3
    } as never)

    if (showUnc) {
      series.push({
        name: `${s.analyteLabel} ±`,
        type: 'line',
        yAxisIndex,
        data: s.points.map((p) => [round(p.tDays), convert(p.high, s.unit, unit)]),
        showSymbol: false,
        lineStyle: { width: 0 },
        tooltip: { show: false },
        areaStyle: { color, opacity: 0.1 * dim },
        z: 1,
        silent: true
      } as never)
    }
  })

  const marks = thin(result.events, 36)
    .filter((e) => e.tDays <= result.horizonDays)
    .map((e) => ({
      xAxis: e.tDays,
      lineStyle: { color: 'rgba(212,165,116,0.25)', width: 1, type: 'dotted' as const }
    }))

  const windowBand = therapeuticBand(lines, result, unitMode, y1)
  const main = series.find((s) => (s as { z?: number }).z === 3) as {
    markLine?: unknown
    markArea?: unknown
    markPoint?: unknown
  } | undefined
  if (main) {
    main.markLine = { silent: true, symbol: 'none', data: marks, label: { show: false } }
    if (windowBand) {
      main.markArea = {
        silent: true,
        itemStyle: { color: 'rgba(212,165,116,0.08)' },
        data: [[{ yAxis: windowBand.low }, { yAxis: windowBand.high }]]
      }
    }
  }

  const st = result.analyteStats?.[0]?.ss
  const s0 = result.series[0]
  if (st && s0 && y1) {
    const u = preferredUnit(s0.unit, unitMode)
    const x0 = result.ssStartDays ?? 0
    const x1 = result.horizonDays
    const row = (name: string, value: number, color: string, dash: 'solid' | 'dashed' | 'dotted') => ({
      name,
      type: 'line' as const,
      yAxisIndex: 0,
      data: [
        [x0, convert(value, s0.unit, u)],
        [x1, convert(value, s0.unit, u)]
      ],
      showSymbol: false,
      lineStyle: { width: 1.6, color, type: dash },
      z: 5
    })
    if (settings.showRefMax !== false) series.push(row('Max', st.cmax, '#E8B86D', 'dashed') as never)
    if (settings.showRefAvg !== false) series.push(row('Media', st.cavg, '#7DD3FC', 'dotted') as never)
    if (settings.showRefMin !== false) series.push(row('Min', st.cmin, '#94A3B8', 'dashed') as never)
  }

  return {
    backgroundColor: 'transparent',
    animation: false,
    grid: { left: 58, right: y2 ? 58 : 18, top: 28, bottom: 42 },
    legend: {
      top: 4,
      textStyle: { color: '#93A0B5', fontFamily: 'IBM Plex Sans', fontSize: 11 },
      selected: {
        Max: settings.showRefMax !== false,
        Media: settings.showRefAvg !== false,
        Min: settings.showRefMin !== false
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#121A2A',
      borderColor: '#243044',
      textStyle: { color: '#E8EDF5', fontFamily: 'IBM Plex Mono', fontSize: 12 }
    },
    xAxis: {
      type: 'value',
      name: 'giorni',
      nameTextStyle: { color: '#93A0B5', fontFamily: 'IBM Plex Mono', fontSize: 10 },
      axisLine: { lineStyle: { color: '#243044' } },
      axisLabel: { color: '#93A0B5', fontFamily: 'IBM Plex Mono' },
      splitLine: { lineStyle: { color: 'rgba(36,48,68,0.55)', type: 'dashed' } }
    },
    yAxis: [
      {
        type: 'value',
        name: y1,
        nameTextStyle: { color: '#93A0B5', fontFamily: 'IBM Plex Mono', fontSize: 10 },
        axisLine: { lineStyle: { color: '#243044' } },
        axisLabel: { color: '#93A0B5', fontFamily: 'IBM Plex Mono' },
        splitLine: { lineStyle: { color: 'rgba(36,48,68,0.4)' } }
      },
      {
        type: 'value',
        name: y2 ?? '',
        show: Boolean(y2),
        axisLabel: { color: '#93A0B5', fontFamily: 'IBM Plex Mono' },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      { type: 'inside' },
      {
        type: 'slider',
        height: 12,
        bottom: 8,
        borderColor: '#243044',
        fillerColor: 'rgba(212,165,116,0.14)',
        handleStyle: { color: '#D4A574' },
        textStyle: { color: '#93A0B5', fontSize: 10 }
      }
    ],
    series
  }
}

function therapeuticBand(
  lines: ProtocolLine[],
  result: SimulationResult,
  unitMode: 'si' | 'conventional',
  axisUnit: string | undefined
) {
  const first = lines.find((l) => l.enabled)
  if (!first || !axisUnit) return null
  const f = getFormulation(first.formulationId)
  if (!f?.window) return null
  const unit = preferredUnit(f.window.unit, unitMode)
  if (unit !== axisUnit && f.window.unit !== axisUnit) {
    const low = convert(f.window.low, f.window.unit, axisUnit as never)
    const high = convert(f.window.high, f.window.unit, axisUnit as never)
    if (!Number.isFinite(low) || !Number.isFinite(high)) return null
    return { low, high }
  }
  void result
  return {
    low: convert(f.window.low, f.window.unit, unit),
    high: convert(f.window.high, f.window.unit, unit)
  }
}

function thin<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = Math.ceil(arr.length / max)
  return arr.filter((_, i) => i % step === 0)
}

function round(n: number) {
  return Math.round(n * 1000) / 1000
}
