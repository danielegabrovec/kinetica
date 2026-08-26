import { getFormulation } from '@shared/catalog'
import { DISCLAIMER } from '@shared/catalog/theory'
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

export function protocolHtml(
  lines: ProtocolLine[],
  patient: PatientProfile,
  result: SimulationResult,
  unitMode: 'si' | 'conventional'
): string {
  const svg = sparkSvg(result, unitMode)
  const rows = lines
    .map((l) => {
      const f = getFormulation(l.formulationId)
      return `<tr><td>${f?.name ?? l.formulationId}</td><td>${l.dose} ${f?.doseUnit ?? ''}</td><td>${frequencyLabel(l)}</td><td>${l.durationDays} g</td></tr>`
    })
    .join('')
  const metrics = result.metrics
    .map((m) => {
      const u = preferredUnit(m.unit, unitMode)
      const n = (v: number) => formatConc(convert(v, m.unit, u), u)
      return `<tr><td>${m.label}</td><td>${n(m.cavg)}</td><td>${n(m.cmax)}</td><td>${n(m.cmin)}</td><td>${Math.round(m.timeInRange * 100)}%</td></tr>`
    })
    .join('')
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"/><title>Kinetica — report</title>
<style>
  body{font-family:IBM Plex Sans,Segoe UI,sans-serif;color:#1a1f2b;background:#f7f3ec;margin:32px;max-width:900px}
  h1{font-family:Georgia,serif;font-weight:600}
  table{border-collapse:collapse;width:100%;font-family:ui-monospace,monospace;font-size:13px}
  td,th{border-bottom:1px solid #d8d0c4;padding:6px 8px;text-align:left}
  .note{color:#5b6270;font-size:12px;white-space:pre-wrap;margin-top:24px}
  svg{width:100%;height:240px;background:#fff;border:1px solid #d8d0c4}
</style></head><body>
<h1>Kinetica</h1>
<p>${patient.alias} · ${patient.weightKg} kg · ${patient.sex === 'male' ? 'M' : 'F'}</p>
${svg}
<h2>Protocollo</h2>
<table><thead><tr><th>Formulazione</th><th>Dose</th><th>Frequenza</th><th>Durata</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Metriche (2ª metà orizzonte)</h2>
<table><thead><tr><th></th><th>Cavg</th><th>Cmax</th><th>Cmin</th><th>TIR</th></tr></thead><tbody>${metrics}</tbody></table>
<p class="note">${DISCLAIMER.replace(/\*\*/g, '')}</p>
</body></html>`
}

function sparkSvg(result: SimulationResult, unitMode: 'si' | 'conventional'): string {
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
    <polyline fill="none" stroke="#8c6a45" stroke-width="2" points="${d}"/>
    <text x="${pad}" y="16" fill="#5b6270" font-size="11">${s.analyteLabel} (${unit})</text>
  </svg>`
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
