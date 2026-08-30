import { getFormulation } from '@shared/catalog'
import { DISCLAIMER } from '@shared/catalog/theory'
import { overlayDeltas, overlayTimeGrid, primarySeries, resampleSeries } from '@shared/engine/overlay'
import { frequencyLabel } from '@shared/engine/schedule'
import { convert, formatConc, preferredUnit } from '@shared/engine/units'
import type { PatientProfile, ProtocolLine, SimulationResult } from '@shared/types'

type UnitMode = 'si' | 'conventional'
type ReportBlock = { label: string; color?: string; lines: ProtocolLine[]; result: SimulationResult }
type OverlayGroup = { label: string; color: string; result: SimulationResult }
type ChartSeries = { label: string; color: string; unit: string; points: [number, number][]; dashed?: boolean }

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]!)
}

function safeColor(value: unknown, fallback = '#9b6a3b'): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function csvCell(value: unknown): string {
  const normalized = String(value ?? '')
  return /[",\r\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized
}

export function seriesToCsv(result: SimulationResult, unitMode: UnitMode): string {
  const header = ['t_days', ...result.series.map((s) => `${s.analyteLabel}[${preferredUnit(s.unit, unitMode)}]`)]
  const n = result.series[0]?.points.length ?? 0
  const rows = [header.map(csvCell).join(',')]
  for (let i = 0; i < n; i++) {
    const t = result.series[0].points[i].tDays
    const values = result.series.map((s) => {
      const unit = preferredUnit(s.unit, unitMode)
      return convert(s.points[i].value, s.unit, unit).toFixed(4)
    })
    rows.push([t.toFixed(3), ...values].map(csvCell).join(','))
  }
  return `\ufeff${rows.join('\r\n')}`
}

export function overlayCsv(groups: { label: string; result: SimulationResult }[], unitMode: UnitMode): string {
  if (!groups.length) return '\ufefft_days\r\n'
  const horizon = Math.max(...groups.map((g) => g.result.horizonDays), 1)
  const times = overlayTimeGrid(horizon)
  const columns: { name: string; values: number[] }[] = []
  for (const group of groups) {
    for (const series of primarySeries(group.result)) {
      const unit = preferredUnit(series.unit, unitMode)
      columns.push({
        name: `${group.label} ${series.analyteLabel}[${unit}]`,
        values: resampleSeries(series, times, unit).map((point) => point[1])
      })
    }
  }
  for (const delta of overlayDeltas(groups, times, unitMode)) {
    columns.push({ name: `${delta.name}[${delta.unit}]`, values: delta.delta.map((point) => point[1]) })
  }
  const rows = [['t_days', ...columns.map((column) => column.name)].map(csvCell).join(',')]
  for (let i = 0; i < times.length; i++) {
    rows.push([times[i]!.toFixed(3), ...columns.map((column) => (column.values[i] ?? 0).toFixed(4))].map(csvCell).join(','))
  }
  return `\ufeff${rows.join('\r\n')}`
}

export function protocolHtml(
  blocks: ReportBlock[],
  patient: PatientProfile,
  unitMode: UnitMode,
  overlay: OverlayGroup[] = [],
  reportName = 'Report di simulazione'
): string {
  const created = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())
  const enabledLines = blocks.flatMap((block) => block.lines).filter((line) => line.enabled)
  const comparison = overlay.length >= 2
    ? `<section class="report-section comparison">
        <div class="section-kicker">Confronto</div>
        <h2>Curve indipendenti per cluster</h2>
        <p class="section-copy">Le curve condividono il tempo ma non vengono sommate. Le serie Δ indicano Cluster 1 meno il cluster confrontato.</p>
        ${overlayCharts(overlay, unitMode)}
      </section>`
    : ''
  const sections = blocks.filter((block) => block.lines.length).map((block) => blockHtml(block, unitMode)).join('')
  const sourceRows = [...new Map(enabledLines.map((line) => [line.formulationId, getFormulation(line.formulationId)])).values()]
    .filter(Boolean)
    .map((formulation) => `<tr>
      <td><strong>${escapeHtml(formulation!.name)}</strong><small>${escapeHtml(formulation!.route.toUpperCase())} · evidenza ${escapeHtml(formulation!.evidence)} · ${escapeHtml(regulatoryLabel(formulation!.regulatory))}</small></td>
      <td>${formulation!.sources.map(escapeHtml).join('<br />')}</td>
    </tr>`)
    .join('')
  const patientDetails = [
    `${patient.weightKg} kg`,
    patient.sex === 'male' ? 'Maschile' : 'Femminile',
    patient.age != null ? `${patient.age} anni` : '',
    patient.shbgNmol != null ? `SHBG ${patient.shbgNmol} nmol/L` : '',
    patient.albuminGdl != null ? `Albumina ${patient.albuminGdl} g/dL` : ''
  ].filter(Boolean)
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; script-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'" />
  <title>${escapeHtml(reportName)} - Kinetica</title>
  <style>${REPORT_CSS}</style>
</head>
<body>
  <header class="report-header">
    <div class="brand-row"><div class="brand-mark">K</div><div><div class="brand-name">KINETICA</div><div class="brand-sub">Farmacocinetica locale</div></div></div>
    <div class="document-meta"><span>Generato il ${escapeHtml(created)}</span><span>Uso informativo</span></div>
  </header>
  <main>
    <section class="hero">
      <div class="section-kicker">Dossier di simulazione</div>
      <h1>${escapeHtml(reportName)}</h1>
      <p class="hero-profile">${escapeHtml(patient.alias)}</p>
      <p class="hero-details">${patientDetails.map(escapeHtml).join(' · ')}</p>
      <div class="summary-grid">
        <div><strong>${blocks.length}</strong><span>cluster</span></div>
        <div><strong>${enabledLines.length}</strong><span>formulazioni attive</span></div>
        <div><strong>${Math.max(...blocks.map((block) => block.result.horizonDays), 1)}</strong><span>giorni</span></div>
        <div><strong>${unitMode === 'si' ? 'SI' : 'LAB'}</strong><span>unità</span></div>
      </div>
    </section>
    ${comparison}
    ${sections || '<section class="empty">Nessuna formulazione attiva da riportare.</section>'}
    <section class="appendix">
      <div class="section-kicker">Appendice</div>
      <h2>Metodo, limiti e tracciabilità</h2>
      <div class="method-grid">
        <div><h3>Modello</h3><p>Curve deterministiche a compartimento con assorbimento ed eliminazione, sovrapposte dose per dose. I blend sommano i contributi dei componenti.</p></div>
        <div><h3>Incertezza</h3><p>La banda visualizza la sensibilità al CV impostato. Non rappresenta una previsione clinica individuale né sostituisce un dato di laboratorio.</p></div>
      </div>
      <section class="disclaimer">
        <div class="section-kicker">Limiti e responsabilità</div>
        <h3>Interpretazione del documento</h3>
        <p>${escapeHtml(DISCLAIMER.replace(/\*\*/g, ''))}</p>
      </section>
      ${sourceRows ? `<h3 class="source-heading">Fonti associate alle formulazioni</h3><div class="table-wrap source-table"><table><thead><tr><th>Formulazione</th><th>Riferimenti dichiarati nel catalogo</th></tr></thead><tbody>${sourceRows}</tbody></table></div>` : ''}
      <p class="appendix-meta">Documento generato da Kinetica il ${escapeHtml(created)} · elaborazione interamente locale.</p>
    </section>
  </main>
  <footer class="report-footer"><span>Kinetica - simulazione locale</span><span>${escapeHtml(patient.alias)}</span></footer>
</body>
</html>`
}

function regulatoryLabel(value: 'authorized' | 'off-label' | 'research'): string {
  if (value === 'authorized') return 'autorizzata'
  if (value === 'off-label') return 'off-label'
  return 'ricerca'
}

function blockHtml(block: ReportBlock, unitMode: UnitMode): string {
  const protocolRows = block.lines.map((line) => {
    const formulation = getFormulation(line.formulationId)
    return `<tr>
      <td><strong>${escapeHtml(formulation?.name ?? line.formulationId)}</strong><small>${escapeHtml(formulation?.route?.toUpperCase() ?? '')}</small></td>
      <td>${escapeHtml(line.dose)} ${escapeHtml(formulation?.doseUnit ?? '')}</td>
      <td>${escapeHtml(frequencyLabel(line))}</td>
      <td>${escapeHtml(line.startOffsetDays)} g</td>
      <td>${escapeHtml(line.durationDays)} g</td>
      <td><span class="status ${line.enabled ? 'on' : 'off'}">${line.enabled ? 'Attiva' : 'Esclusa'}</span></td>
    </tr>`
  }).join('')
  const metricRows = block.result.metrics.map((metric) => {
    const unit = preferredUnit(metric.unit, unitMode)
    const value = (n: number) => formatConc(convert(n, metric.unit, unit), unit)
    return `<tr>
      <td><strong>${escapeHtml(metric.label)}</strong></td>
      <td>${escapeHtml(value(metric.cavg))}</td>
      <td>${escapeHtml(value(metric.cmax))}</td>
      <td>${escapeHtml(value(metric.cmin))}</td>
      <td>${Number.isFinite(metric.peakTrough) ? escapeHtml(metric.peakTrough.toFixed(2)) : '-'}</td>
      <td>${Math.round(metric.timeInRange * 100)}%</td>
      <td>${metric.injections}</td>
    </tr>`
  }).join('')
  return `<section class="report-section cluster-section">
    <div class="cluster-heading"><span class="cluster-swatch" style="background:${safeColor(block.color)}"></span><div><div class="section-kicker">Protocollo</div><h2>${escapeHtml(block.label)}</h2></div></div>
    ${resultCharts(block.result, unitMode, block.color)}
    <h3>Schema di somministrazione</h3>
    <div class="table-wrap"><table><thead><tr><th>Formulazione</th><th>Dose</th><th>Frequenza</th><th>Inizio</th><th>Durata</th><th>Stato</th></tr></thead><tbody>${protocolRows}</tbody></table></div>
    ${metricRows ? `<h3>Indicatori del modello</h3><div class="table-wrap"><table><thead><tr><th>Serie</th><th>C media</th><th>C max</th><th>C min</th><th>P/T</th><th>TIR</th><th>Dosi</th></tr></thead><tbody>${metricRows}</tbody></table></div>` : ''}
  </section>`
}

function resultCharts(result: SimulationResult, unitMode: UnitMode, preferredColor?: string): string {
  const grouped = new Map<string, ChartSeries[]>()
  for (const series of result.series) {
    const unit = preferredUnit(series.unit, unitMode)
    const list = grouped.get(unit) ?? []
    list.push({
      label: series.analyteLabel,
      color: list.length === 0 && preferredColor ? safeColor(preferredColor) : safeColor(series.color, '#4f7897'),
      unit,
      points: series.points.map((point) => [point.tDays, convert(point.value, series.unit, unit)])
    })
    grouped.set(unit, list)
  }
  return [...grouped.entries()].map(([unit, series]) => chartSvg(series, result.horizonDays, unit)).join('')
}

function overlayCharts(groups: OverlayGroup[], unitMode: UnitMode): string {
  const horizon = Math.max(...groups.map((group) => group.result.horizonDays), 1)
  const times = overlayTimeGrid(horizon)
  const grouped = new Map<string, ChartSeries[]>()
  for (const group of groups) {
    for (const series of primarySeries(group.result)) {
      const unit = preferredUnit(series.unit, unitMode)
      const key = `${series.analyte}:${unit}`
      const list = grouped.get(key) ?? []
      list.push({ label: `${group.label} · ${series.analyteLabel}`, color: safeColor(group.color), unit, points: resampleSeries(series, times, unit) })
      grouped.set(key, list)
    }
  }
  for (const delta of overlayDeltas(groups, times, unitMode)) {
    const matching = [...grouped.entries()].find(([key]) => key.endsWith(`:${delta.unit}`))
    if (matching) matching[1].push({ label: delta.name, color: '#64748b', unit: delta.unit, points: delta.delta, dashed: true })
  }
  return [...grouped.values()].map((series) => chartSvg(series, horizon, series[0]?.unit ?? '')).join('')
}

function chartSvg(series: ChartSeries[], horizon: number, unit: string): string {
  if (!series.length) return ''
  const width = 820
  const height = 212
  const left = 60
  const right = 18
  const top = 42
  const bottom = 36
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const allValues = series.flatMap((item) => item.points.map((point) => point[1])).filter(Number.isFinite)
  const minValue = Math.min(0, ...allValues)
  const rawMax = Math.max(0, ...allValues)
  const maxValue = rawMax > minValue ? rawMax * 1.08 : minValue + 1
  const x = (time: number) => left + (Math.max(0, Math.min(horizon, time)) / Math.max(horizon, 1)) * plotWidth
  const y = (value: number) => top + (1 - (value - minValue) / Math.max(maxValue - minValue, 1e-9)) * plotHeight
  const horizontal = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    const py = top + ratio * plotHeight
    const label = maxValue - ratio * (maxValue - minValue)
    return `<line x1="${left}" x2="${width - right}" y1="${py}" y2="${py}" class="grid"/><text x="${left - 8}" y="${py + 4}" class="axis" text-anchor="end">${escapeHtml(axisNumber(label))}</text>`
  }).join('')
  const vertical = Array.from({ length: 7 }, (_, index) => {
    const ratio = index / 6
    const px = left + ratio * plotWidth
    return `<line y1="${top}" y2="${height - bottom}" x1="${px}" x2="${px}" class="grid"/><text x="${px}" y="${height - 17}" class="axis" text-anchor="middle">${escapeHtml(axisNumber(horizon * ratio))}</text>`
  }).join('')
  const polylines = series.map((item) => {
    const stride = Math.max(1, Math.ceil(item.points.length / 900))
    const sampled = item.points.filter((_point, index) => index % stride === 0 || index === item.points.length - 1)
    const points = sampled.map(([time, value]) => `${x(time).toFixed(1)},${y(value).toFixed(1)}`).join(' ')
    return `<polyline fill="none" stroke="${safeColor(item.color)}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${item.dashed ? 'stroke-dasharray="7 5"' : ''} points="${points}"/>`
  }).join('')
  const legend = series.map((item, index) => {
    const lx = left + (index % 3) * 245
    const ly = 18 + Math.floor(index / 3) * 17
    return `<line x1="${lx}" x2="${lx + 18}" y1="${ly}" y2="${ly}" stroke="${safeColor(item.color)}" stroke-width="2.5" ${item.dashed ? 'stroke-dasharray="6 4"' : ''}/><text x="${lx + 25}" y="${ly + 4}" class="legend">${escapeHtml(item.label)}</text>`
  }).join('')
  return `<div class="chart-card"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico ${escapeHtml(unit)}" xmlns="http://www.w3.org/2000/svg"><style>.grid{stroke:#dce2e8;stroke-width:.8}.axis{fill:#697586;font:10px Segoe UI,sans-serif}.legend{fill:#263243;font:11px Segoe UI,sans-serif}</style>${horizontal}${vertical}${polylines}${legend}<text x="${width - right}" y="${height - 4}" class="axis" text-anchor="end">giorni</text><text x="${left}" y="${top - 10}" class="axis">${escapeHtml(unit)}</text></svg></div>`
}

function axisNumber(value: number): string {
  const absolute = Math.abs(value)
  if (absolute >= 1000) return value.toFixed(0)
  if (absolute >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

const REPORT_CSS = `
@page{size:A4;margin:14mm 12mm 17mm;@bottom-center{content:"Kinetica · pagina " counter(page) " di " counter(pages);font:9px "Segoe UI",sans-serif;color:#738092}}
*{box-sizing:border-box}html{background:#eef1f4;color:#182231}body{margin:0;font-family:"Segoe UI",Arial,sans-serif;font-size:12px;line-height:1.48;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.report-header{height:74px;padding:18px 28px;border-bottom:1px solid #d8dee6;display:flex;align-items:center;justify-content:space-between;background:#101827;color:#f8fafc}.brand-row{display:flex;align-items:center;gap:12px}.brand-mark{width:36px;height:36px;border:1px solid #d4a574;color:#d4a574;display:grid;place-items:center;font:600 15px ui-monospace,monospace}.brand-name{font-size:14px;font-weight:700;letter-spacing:.16em}.brand-sub{font-size:10px;color:#aeb8c7;letter-spacing:.08em}.document-meta{display:flex;flex-direction:column;align-items:flex-end;font-size:10px;color:#c3ccd8;gap:3px}
main{padding:24px 28px 28px}.hero{padding:4px 0 20px}.section-kicker{text-transform:uppercase;letter-spacing:.16em;font-size:9px;font-weight:700;color:#8b6038}.hero h1{font:600 34px/1.08 Georgia,serif;margin:8px 0 16px;color:#172131}.hero-profile{font:600 18px Georgia,serif;margin:0 0 3px}.hero-details,.section-copy{margin:0;color:#667386}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d8dee6;margin-top:18px}.summary-grid div{padding:12px 14px;border-right:1px solid #d8dee6}.summary-grid div:last-child{border:0}.summary-grid strong{display:block;font:600 19px ui-monospace,monospace;color:#172131}.summary-grid span{text-transform:uppercase;letter-spacing:.08em;font-size:8px;color:#748092}
.report-section{border-top:2px solid #263243;padding:22px 0 6px;break-before:auto}.report-section h2,.appendix>h2{font:600 22px Georgia,serif;margin:4px 0 8px}.report-section h3{font-size:10px;text-transform:uppercase;letter-spacing:.12em;margin:20px 0 8px;color:#5f6c7c}.cluster-heading{display:flex;align-items:center;gap:10px}.cluster-swatch{width:7px;height:34px}.chart-card{border:1px solid #d8dee6;background:#fbfcfd;margin:14px 0;break-inside:avoid}.chart-card svg{display:block;width:100%;height:auto}
.table-wrap{border:1px solid #d8dee6;margin-bottom:14px;break-inside:avoid}table{border-collapse:collapse;width:100%;font-size:10px}th{background:#edf1f5;color:#5d6877;text-transform:uppercase;letter-spacing:.07em;font-size:8px;text-align:left;padding:7px 8px}td{padding:7px 8px;border-top:1px solid #e1e6ec;vertical-align:top}td small{display:block;color:#7b8795;font-size:8px;margin-top:2px}.status{display:inline-block;padding:2px 6px;border-radius:10px;font-size:8px;text-transform:uppercase;letter-spacing:.06em}.status.on{background:#dcf4e4;color:#176235}.status.off{background:#eceff2;color:#687486}
.comparison,.cluster-section{break-before:auto}.cluster-section+.cluster-section,.comparison+.cluster-section{break-before:page}.appendix{break-before:page;border-top:2px solid #263243;padding-top:22px}.method-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.method-grid>div{border:1px solid #d8dee6;background:#fbfcfd;padding:11px 13px}.method-grid h3,.disclaimer h3,.source-heading{margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:.11em;color:#5f6c7c}.method-grid p{margin:0;color:#566171;font-size:10px}.disclaimer{margin-top:10px;padding:10px 16px;border:1px solid #d8dee6;background:#f5f1eb;break-inside:avoid}.disclaimer p{font-size:10px;line-height:1.4;margin:4px 0 0;color:#566171;white-space:pre-line}.source-heading{margin:16px 0 7px}.source-table{break-inside:auto}.source-table tr{break-inside:avoid}.appendix-meta{margin:10px 0 0;color:#778394;font-size:9px}.empty{padding:32px;border:1px dashed #b8c1cc;color:#687486}.report-footer{display:none}
@media screen{body{max-width:920px;margin:24px auto;box-shadow:0 14px 50px rgba(20,31,45,.16)}.report-footer{display:flex;justify-content:space-between;padding:14px 28px;border-top:1px solid #d8dee6;color:#778394;font-size:9px}}
@media print{html,body{background:#fff}body{font-size:11px}.report-header{padding-left:28px;padding-right:28px}.report-section{page-break-inside:auto}.cluster-heading{break-after:avoid}.chart-card,.table-wrap,.disclaimer{page-break-inside:avoid}.source-table{page-break-inside:auto}}
`

export async function saveText(defaultName: string, content: string, ext: string) {
  if (window.kinetica) return window.kinetica.exportFile({ defaultName, content, ext })
  const blob = new Blob([content], { type: ext === 'html' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = defaultName
  anchor.click()
  URL.revokeObjectURL(url)
  return { ok: true }
}
