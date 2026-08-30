import { getFormulation } from '@shared/catalog'
import { DISCLAIMER } from '@shared/catalog/theory'
import { overlayDeltas, overlayTimeGrid, primarySeries, resampleSeries } from '@shared/engine/overlay'
import { frequencyLabel } from '@shared/engine/schedule'
import { convert, formatConc, preferredUnit } from '@shared/engine/units'
import type { PatientProfile, ProtocolLine, SimulationResult } from '@shared/types'

export function seriesToCsv(result: SimulationResult, unitMode: 'si' | 'conventional'): string {
  const header = ['t_days', ...result.series.map((s) => `${s.analyteLabel}[${preferredUnit(s.unit, unitMode)}]`)]
  const n = result.series[0]?.points.length ?? 0
  const rows = [header.join(',')]
  for (let i = 0; i < n; i++) {
    const t = result.series[0].points[i].tDays
    const vals = result.series.map((s) => {
      const u = preferredUnit(s.unit, unitMode)
      return convert(s.points[i].value, s.unit, u).toFixed(4)
    })
    rows.push([t.toFixed(3), ...vals].join(','))
  }
  return rows.join('\n')
}

export function overlayCsv(
  groups: { label: string; result: SimulationResult }[],
  unitMode: 'si' | 'conventional'
): string {
  if (!groups.length) return 't_days\n'
  const horizon = Math.max(...groups.map((g) => g.result.horizonDays), 1)
  const times = overlayTimeGrid(horizon)
  const cols: { name: string; values: number[] }[] = []
  for (const g of groups) {
    for (const s of primarySeries(g.result)) {
      const unit = preferredUnit(s.unit, unitMode)
      cols.push({
        name: `${g.label} ${s.analyteLabel}[${unit}]`,
        values: resampleSeries(s, times, unit).map((p) => p[1])
      })
    }
  }
  for (const d of overlayDeltas(groups, times, unitMode)) {
    cols.push({
      name: `${d.name}[${d.unit}]`,
      values: d.delta.map((p) => p[1])
    })
  }
  const header = ['t_days', ...cols.map((c) => c.name)]
  const rows = [header.join(',')]
  for (let i = 0; i < times.length; i++) {
    rows.push([times[i]!.toFixed(3), ...cols.map((c) => (c.values[i] ?? 0).toFixed(4))].join(','))
  }
  return rows.join('\n')
}

export function protocolHtml(
  blocks: { label: string; color?: string; lines: ProtocolLine[]; result: SimulationResult }[],
  patient: PatientProfile,
  unitMode: 'si' | 'conventional',
  overlay?: { label: string; color: string; result: SimulationResult }[]
): string {
  const sections = blocks
    .map((b) => {
      const svg = sparkSvg(b.result, unitMode, b.color)
      const rows = b.lines
        .map((l) => {
          const f = getFormulation(l.formulationId)
          return `<tr><td>${f?.name ?? l.formulationId}</td><td>${l.dose} ${f?.doseUnit ?? ''}</td><td>${frequencyLabel(l)}</td><td>${l.durationDays} g</td></tr>`
        })
        .join('')
      const metrics = b.result.metrics
        .map((m) => {
          const u = preferredUnit(m.unit, unitMode)
          const n = (v: number) => formatConc(convert(v, m.unit, u), u)
          return `<tr><td>${m.label}</td><td>${n(m.cavg)}</td><td>${n(m.cmax)}</td><td>${n(m.cmin)}</td><td>${Math.round(m.timeInRange * 100)}%</td></tr>`
        })
        .join('')
      return `<h2>${b.label}</h2>
${svg}
<table><thead><tr><th>Formulazione</th><th>Dose</th><th>Frequenza</th><th>Durata</th></tr></thead><tbody>${rows}</tbody></table>
<table><thead><tr><th></th><th>Cavg</th><th>Cmax</th><th>Cmin</th><th>TIR</th></tr></thead><tbody>${metrics}</tbody></table>`
    })
    .join('')
  const compare =
    overlay && overlay.length >= 2
      ? `<h2>Confronto cluster</h2>
<p style="color:#5b6270;font-size:13px">Curve indipendenti. La linea tratteggiata è il Δ (Cluster 1 − gli altri).</p>
${overlaySvg(overlay, unitMode)}`
      : ''
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"/><title>Kinetica — report</title>
<style>
  body{font-family:IBM Plex Sans,Segoe UI,sans-serif;color:#1a1f2b;background:#f7f3ec;margin:32px;max-width:900px}
  h1{font-family:Georgia,serif;font-weight:600}
  table{border-collapse:collapse;width:100%;font-family:ui-monospace,monospace;font-size:13px;margin-bottom:16px}
  td,th{border-bottom:1px solid #d8d0c4;padding:6px 8px;text-align:left}
  .note{color:#5b6270;font-size:12px;white-space:pre-wrap;margin-top:24px}
  svg{width:100%;height:240px;background:#fff;border:1px solid #d8d0c4;margin-bottom:12px}
</style></head><body>
<h1>Kinetica</h1>
<p>${patient.alias} · ${patient.weightKg} kg · ${patient.sex === 'male' ? 'M' : 'F'}</p>
${compare}
${sections}
<p class="note">${DISCLAIMER.replace(/\*\*/g, '')}</p>
</body></html>`
}

function sparkSvg(result: SimulationResult, unitMode: 'si' | 'conventional', color = '#8c6a45'): string {
  const s = result.series[0]
  if (!s) return ''
  const unit = preferredUnit(s.unit, unitMode)
  const pts = s.points
  const w = 860
  const h = 220
  const pad = 28
  const xs = pts.map((p) => p.tDays)
  const ys = pts.map((p) => convert(p.value, s.unit, unit))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs) || 1
  const minY = 0
  const maxY = Math.max(...ys) * 1.08 || 1
  const xy = pts.map((p, i) => {
    const x = pad + ((p.tDays - minX) / (maxX - minX)) * (w - pad * 2)
    const y = h - pad - ((ys[i] - minY) / (maxY - minY)) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const d = xy.join(' ')
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <polyline fill="none" stroke="${color}" stroke-width="2" points="${d}"/>
    <text x="${pad}" y="16" fill="#5b6270" font-size="11">${s.analyteLabel} (${unit})</text>
  </svg>`
}

function overlaySvg(
  groups: { label: string; color: string; result: SimulationResult }[],
  unitMode: 'si' | 'conventional'
): string {
  const horizon = Math.max(...groups.map((g) => g.result.horizonDays), 1)
  const times = overlayTimeGrid(horizon)
  const series = groups.flatMap((g) => {
    const s = primarySeries(g.result)[0]
    if (!s) return []
    const unit = preferredUnit(s.unit, unitMode)
    return [{ label: `${g.label} · ${s.analyteLabel}`, color: g.color, unit, pts: resampleSeries(s, times, unit) }]
  })
  const deltas = overlayDeltas(groups, times, unitMode)
  for (const d of deltas) {
    series.push({ label: d.name, color: '#64748b', unit: d.unit, pts: d.delta })
  }
  if (!series.length) return ''
  const w = 860
  const h = 240
  const pad = 28
  const ys = series.flatMap((s) => s.pts.map((p) => p[1]))
  const minX = 0
  const maxX = horizon || 1
  const minY = Math.min(0, ...ys)
  const maxY = Math.max(...ys, 0) * 1.08 || 1
  const toXy = (pts: [number, number][]) =>
    pts
      .map(([t, v]) => {
        const x = pad + ((t - minX) / (maxX - minX)) * (w - pad * 2)
        const y = h - pad - ((v - minY) / (maxY - minY)) * (h - pad * 2)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  const lines = series
    .map((s, i) => {
      const dash = s.label.startsWith('Δ') ? ' stroke-dasharray="4 4"' : ''
      return `<polyline fill="none" stroke="${s.color}" stroke-width="${i >= groups.length ? 1.4 : 2}"${dash} points="${toXy(s.pts)}"/>`
    })
    .join('')
  const legend = series
    .map((s, i) => `<text x="${pad + i * 200}" y="16" fill="${s.color}" font-size="11">${s.label}</text>`)
    .join('')
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${legend}${lines}</svg>`
}

export async function saveText(defaultName: string, content: string, ext: string) {
  if (window.kinetica) return window.kinetica.exportFile({ defaultName, content, ext })
  const blob = new Blob([content], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = defaultName
  a.click()
  return { ok: true }
}
