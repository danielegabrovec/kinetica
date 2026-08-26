import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { CLUSTER_COLOR, getFormulation } from '@shared/catalog'
import { convert, preferredUnit } from '@shared/engine/units'
import type { ProtocolLine, SimulationResult } from '@shared/types'
import { useApp } from '../store/useApp'

export function PkChart({ result }: { result: SimulationResult }) {
  const settings = useApp((s) => s.settings)
  const lines = useApp((s) => s.lines)
  const selected = useApp((s) => s.selectedLineId)
  const patch = useApp((s) => s.patchSettings)
  const option = build(result, settings, selected, lines)

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
  lines: ProtocolLine[]
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
    const color = s.color || CLUSTER_COLOR[s.cluster]
    const dim = selected && !s.lineIds.includes(selected) && lines.length > 1 ? 0.3 : 1
    const data = s.points.map((p) => [round(p.tDays), convert(p.value, s.unit, unit)])

    series.push({
      name: `${s.analyteLabel} (${unit})`,
      type: 'line',
      yAxisIndex,
      data,
      showSymbol: false,
      lineStyle: {
        width: 2.2,
        color,
        opacity: dim,
        type: idx % 2 === 1 ? 'dashed' : 'solid'
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
