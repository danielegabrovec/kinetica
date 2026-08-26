import { useMemo } from 'react'
import { getFormulation } from '@shared/catalog'
import { DISCLAIMER } from '@shared/catalog/theory'
import { simulate } from '@shared/engine/simulate'
import { frequencyLabel } from '@shared/engine/schedule'
import { convert, formatConc, preferredUnit } from '@shared/engine/units'
import { protocolHtml, saveText, seriesToCsv } from '../lib/export'
import { PkChart } from '../components/PkChart'
import { useApp } from '../store/useApp'

export function Report() {
  const lines = useApp((s) => s.lines)
  const patient = useApp((s) => s.patient)
  const horizonDays = useApp((s) => s.horizonDays)
  const settings = useApp((s) => s.settings)

  const result = useMemo(
    () =>
      simulate({
        lines,
        patient,
        horizonDays,
        cvPercent: settings.cvPercent,
        settings
      }),
    [lines, patient, horizonDays, settings]
  )

  const exportHtml = async () => {
    const html = protocolHtml(lines, patient, result, settings.unitMode)
    await saveText('kinetica-report.html', html, 'html')
  }
  const exportCsv = async () => {
    await saveText('kinetica-serie.csv', seriesToCsv(result, settings.unitMode), 'csv')
  }
  const printDoc = async () => {
    if (window.kinetica) await window.kinetica.print()
    else window.print()
  }
  const pdf = async () => {
    if (window.kinetica) await window.kinetica.pdf('kinetica-report.pdf')
    else window.print()
  }

  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2', overflow: 'auto' }}>
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="primary" onClick={exportHtml}>
          Esporta HTML
        </button>
        <button className="ghost" onClick={pdf}>
          Esporta PDF
        </button>
        <button className="ghost" onClick={printDoc}>
          Stampa
        </button>
        <button className="ghost" onClick={exportCsv}>
          CSV
        </button>
      </div>
      <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600 }}>Report di simulazione</h1>
      <p className="hair">
        {patient.alias} · {patient.weightKg} kg · orizzonte {horizonDays} giorni
      </p>
      <div style={{ height: 360, margin: '12px 0' }}>
        <PkChart result={result} />
      </div>
      <h2 style={{ fontSize: 16 }}>Protocollo</h2>
      <table style={{ width: '100%', fontFamily: 'IBM Plex Mono', fontSize: 12, borderCollapse: 'collapse' }}>
        <tbody>
          {lines.map((l) => {
            const f = getFormulation(l.formulationId)
            return (
              <tr key={l.id} style={{ borderBottom: '1px solid #243044' }}>
                <td style={{ padding: 6 }}>{f?.name}</td>
                <td>
                  {l.dose} {f?.doseUnit}
                </td>
                <td>{frequencyLabel(l)}</td>
                <td>{l.durationDays} g</td>
                <td className="hair">{f?.sources[0] ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <h2 style={{ fontSize: 16, marginTop: 16 }}>Metriche</h2>
      <table style={{ width: '100%', fontFamily: 'IBM Plex Mono', fontSize: 12, borderCollapse: 'collapse' }}>
        <tbody>
          {result.metrics.map((m) => {
            const u = preferredUnit(m.unit, settings.unitMode)
            const n = (v: number) => formatConc(convert(v, m.unit, u), u)
            return (
              <tr key={m.lineId} style={{ borderBottom: '1px solid #243044' }}>
                <td style={{ padding: 6 }}>{m.label}</td>
                <td>Cavg {n(m.cavg)}</td>
                <td>Cmax {n(m.cmax)}</td>
                <td>Cmin {n(m.cmin)}</td>
                <td>TIR {Math.round(m.timeInRange * 100)}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="disclaimer-bar" style={{ whiteSpace: 'pre-wrap' }}>
        {DISCLAIMER.replace(/\*\*/g, '')}
      </p>
    </section>
  )
}
