import { useMemo } from 'react'
import { getFormulation } from '@shared/catalog'
import { DISCLAIMER } from '@shared/catalog/theory'
import { simulate } from '@shared/engine/simulate'
import { frequencyLabel } from '@shared/engine/schedule'
import { convert, formatConc, preferredUnit } from '@shared/engine/units'
import { slugPlanName } from '@shared/library'
import { resolveClusterStyle, simClusterLabel } from '@shared/sim-cluster'
import type { ProtocolLine } from '@shared/types'
import { overlayCsv, protocolHtml, saveText } from '../lib/export'
import { OverlayChart, PkChart } from '../components/PkChart'
import { useApp } from '../store/useApp'
import { useFileUi } from '../store/useFileUi'

export function Report() {
  const lines = useApp((s) => s.lines)
  const simClusters = useApp((s) => s.simClusters)
  const patient = useApp((s) => s.patient)
  const horizonDays = useApp((s) => s.horizonDays)
  const settings = useApp((s) => s.settings)
  const currentName = useApp((s) => s.currentName)
  const flash = useFileUi((s) => s.flash)

  const blocks = useMemo(() => {
    return simClusters.map((c, i) => {
      const clusterLines = lines.filter((l) => l.simClusterId === c.id)
      const style = resolveClusterStyle(c, i)
      return {
        label: simClusterLabel(i),
        color: style.color,
        stroke: style.stroke,
        lineWidth: style.lineWidth,
        lines: clusterLines,
        result: simulate({
          lines: clusterLines,
          patient,
          horizonDays,
          cvPercent: settings.cvPercent,
          settings
        })
      }
    })
  }, [simClusters, lines, patient, horizonDays, settings])

  const overlayGroups = useMemo(
    () =>
      blocks
        .filter((b) => b.lines.some((l) => l.enabled))
        .map((b) => ({
          label: b.label,
          color: b.color,
          stroke: b.stroke,
          lineWidth: b.lineWidth,
          result: b.result
        })),
    [blocks]
  )

  const reportName = currentName && currentName !== 'Senza titolo' ? currentName : 'Report di simulazione'
  const documentHtml = useMemo(
    () => protocolHtml(blocks, patient, settings.unitMode, overlayGroups, reportName),
    [blocks, patient, settings.unitMode, overlayGroups, reportName]
  )
  const fileStem = slugPlanName(reportName)

  const run = async (action: () => Promise<{ ok: boolean }>, success: string) => {
    try {
      const result = await action()
      if (result.ok) flash(success)
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Operazione non riuscita.', 'err')
    }
  }

  const exportHtml = async () => {
    await run(() => saveText(`${fileStem}-report.html`, documentHtml, 'html'), 'Report HTML esportato')
  }
  const exportCsv = async () => {
    await run(() => saveText(`${fileStem}-serie.csv`, overlayCsv(overlayGroups, settings.unitMode), 'csv'), 'Serie CSV esportate')
  }
  const printDoc = async () => {
    if (window.kinetica) await run(() => window.kinetica!.printReport(documentHtml), 'Documento inviato alla stampa')
    else window.print()
  }
  const pdf = async () => {
    if (window.kinetica) await run(() => window.kinetica!.pdfReport({ defaultName: `${fileStem}-report.pdf`, html: documentHtml }), 'Report PDF esportato')
    else window.print()
  }

  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2', overflow: 'auto' }}>
      <div className="no-print report-actions">
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
          Esporta CSV
        </button>
      </div>
      <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600 }}>{reportName}</h1>
      <p className="hair">
        {patient.alias} · {patient.weightKg} kg · orizzonte {horizonDays} giorni
      </p>
      <p className="report-quality-note no-print">
        HTML, PDF e stampa usano lo stesso documento A4 dedicato. Il CSV contiene le serie numeriche complete.
      </p>
      {overlayGroups.length >= 2 ? (
        <div style={{ margin: '16px 0 28px' }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Confronto cluster</h2>
          <p className="hair" style={{ marginBottom: 8 }}>
            Stesso asse, curve indipendenti. La punteggiata è il Δ (Cluster 1 − gli altri).
          </p>
          <div className="report-overlay">
            <OverlayChart groups={overlayGroups} />
          </div>
        </div>
      ) : null}
      {blocks.map((b) => (
        <div key={b.label} style={{ margin: '16px 0 24px' }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>{b.label}</h2>
          {b.lines.length ? (
            <>
              <div className="report-chart-frame">
                <PkChart result={b.result} lines={b.lines} paint={b} />
              </div>
              <table style={{ width: '100%', fontFamily: 'IBM Plex Mono', fontSize: 12, borderCollapse: 'collapse' }}>
                <tbody>{b.lines.map((l) => protocolRow(l))}</tbody>
              </table>
              <table
                style={{
                  width: '100%',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 12,
                  borderCollapse: 'collapse',
                  marginTop: 8
                }}
              >
                <tbody>
                  {b.result.metrics.map((m) => {
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
            </>
          ) : (
            <p className="hair">Nessuna molecola in questo cluster.</p>
          )}
        </div>
      ))}
      <p className="disclaimer-bar" style={{ whiteSpace: 'pre-wrap' }}>
        {DISCLAIMER.replace(/\*\*/g, '')}
      </p>
    </section>
  )
}

function protocolRow(l: ProtocolLine) {
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
}
