import { useMemo } from 'react'
import { getFormulation } from '@shared/catalog'
import { simulate } from '@shared/engine/simulate'
import { convert, formatConc, preferredUnit } from '@shared/engine/units'
import { frequencyLabel } from '@shared/engine/schedule'
import { resolveClusterStyle, simClusterLabel } from '@shared/sim-cluster'
import { OverlayChart } from '../components/PkChart'
import { useApp } from '../store/useApp'

export function Confronta() {
  const lines = useApp((s) => s.lines)
  const simClusters = useApp((s) => s.simClusters)
  const patient = useApp((s) => s.patient)
  const horizonDays = useApp((s) => s.horizonDays)
  const settings = useApp((s) => s.settings)
  const duplicateLine = useApp((s) => s.duplicateLine)

  const groups = useMemo(
    () =>
      simClusters
        .map((c, i) => {
          const clusterLines = lines.filter((l) => l.simClusterId === c.id && l.enabled)
          if (!clusterLines.length) return null
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
              cvPercent: 0,
              settings: { ...settings, showUncertainty: false, showFreeHormone: false, showEstimatedE2: false }
            })
          }
        })
        .filter(Boolean) as {
        label: string
        color: string
        stroke: 'solid' | 'dashed' | 'dotted'
        lineWidth: number
        lines: typeof lines
        result: ReturnType<typeof simulate>
      }[],
    [simClusters, lines, patient, horizonDays, settings]
  )

  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2' }}>
      <p className="hair" style={{ marginBottom: 8 }}>
        Sovrapposizione per cluster. Le curve non si sommano. La punteggiata è il Δ (Cluster 1 − gli altri).
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {lines.map((l) => {
          const f = getFormulation(l.formulationId)
          return (
            <button key={l.id} className="chip" onClick={() => duplicateLine(l.id)} aria-label={`Duplica ${f?.name ?? 'formulazione'}, ${l.dose} ${f?.doseUnit ?? ''}, ${frequencyLabel(l)}`}>
              Duplica {f?.name} · {l.dose} {f?.doseUnit} · {frequencyLabel(l)}
            </button>
          )
        })}
      </div>
      <div style={{ height: '55vh', minHeight: 360 }}>
        {groups.length ? <OverlayChart groups={groups} /> : <p className="hair">Aggiungi molecole in Simula.</p>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
        <thead>
          <tr style={{ color: '#93A0B5', textAlign: 'left' }}>
            <th>Cluster</th>
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
          {groups.flatMap((g) =>
            g.result.metrics.map((m) => {
              const unit = preferredUnit(m.unit, settings.unitMode)
              const n = (v: number) => formatConc(convert(v, m.unit, unit), unit)
              return (
                <tr key={`${g.label}-${m.lineId}`} style={{ borderTop: '1px solid #243044' }}>
                  <td style={{ padding: '8px 4px', color: g.color }}>{g.label}</td>
                  <td>{m.label}</td>
                  <td>{n(m.cavg)}</td>
                  <td>{n(m.cmax)}</td>
                  <td>{n(m.cmin)}</td>
                  <td>{Number.isFinite(m.peakTrough) ? m.peakTrough.toFixed(2) : '—'}</td>
                  <td>{Math.round(m.timeInRange * 100)}%</td>
                  <td>{m.injections}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </section>
  )
}
