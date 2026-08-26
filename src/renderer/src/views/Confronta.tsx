import { useMemo } from 'react'
import { getFormulation } from '@shared/catalog'
import { simulate } from '@shared/engine/simulate'
import { convert, formatConc, preferredUnit } from '@shared/engine/units'
import { PkChart } from '../components/PkChart'
import { useApp } from '../store/useApp'

export function Confronta() {
  const lines = useApp((s) => s.lines)
  const patient = useApp((s) => s.patient)
  const horizonDays = useApp((s) => s.horizonDays)
  const settings = useApp((s) => s.settings)
  const duplicateLine = useApp((s) => s.duplicateLine)

  const result = useMemo(
    () => simulate({ lines, patient, horizonDays, cvPercent: 0, settings: { ...settings, showUncertainty: false } }),
    [lines, patient, horizonDays, settings]
  )

  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2' }}>
      <p className="hair" style={{ marginBottom: 8 }}>
        Stesso grafico, più righe. Duplica una riga e cambia solo la frequenza — es. 100 mg/sett vs 50 mg 2×/sett.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {lines.map((l) => {
          const f = getFormulation(l.formulationId)
          return (
            <button key={l.id} className="chip" onClick={() => duplicateLine(l.id)}>
              Duplica {f?.name}
            </button>
          )
        })}
      </div>
      <div style={{ height: '55vh' }}>
        <PkChart result={result} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
        <thead>
          <tr style={{ color: '#93A0B5', textAlign: 'left' }}>
            <th>Composto</th>
            <th>Cavg</th>
            <th>Cmax</th>
            <th>Cmin</th>
            <th>P/T</th>
            <th>TIR</th>
            <th>Dosi</th>
          </tr>
        </thead>
        <tbody>
          {result.metrics.map((m) => {
            const unit = preferredUnit(m.unit, settings.unitMode)
            const n = (v: number) => formatConc(convert(v, m.unit, unit), unit)
            return (
              <tr key={m.lineId} style={{ borderTop: '1px solid #243044' }}>
                <td style={{ padding: '8px 4px' }}>{m.label}</td>
                <td>{n(m.cavg)}</td>
                <td>{n(m.cmax)}</td>
                <td>{n(m.cmin)}</td>
                <td>{Number.isFinite(m.peakTrough) ? m.peakTrough.toFixed(2) : '—'}</td>
                <td>{Math.round(m.timeInRange * 100)}%</td>
                <td>{m.injections}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
