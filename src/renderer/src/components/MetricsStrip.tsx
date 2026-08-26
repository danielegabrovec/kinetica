import { formatConc, formatDays } from '@shared/engine/units'
import { convert, preferredUnit } from '@shared/engine/units'
import type { SimulationResult } from '@shared/types'
import { useApp } from '../store/useApp'

export function MetricsStrip({ result }: { result: SimulationResult }) {
  const mode = useApp((s) => s.settings.unitMode)
  const m = result.metrics[0]
  if (!m) {
    return <div className="hair">Aggiungi un composto per vedere Cmax, Cavg, TIR.</div>
  }
  const unit = preferredUnit(m.unit, mode)
  const n = (v: number) => formatConc(convert(v, m.unit, unit), unit)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 12, padding: '10px 2px' }}>
      <div className="metric">
        <b>{n(m.cavg)}</b>
        <span>Cavg (2ª metà)</span>
      </div>
      <div className="metric">
        <b>{n(m.cmax)}</b>
        <span>Cmax</span>
      </div>
      <div className="metric">
        <b>{n(m.cmin)}</b>
        <span>Cmin</span>
      </div>
      <div className="metric">
        <b>{Number.isFinite(m.peakTrough) ? m.peakTrough.toFixed(2) : '—'}</b>
        <span>Peak / trough</span>
      </div>
      <div className="metric">
        <b>{Math.round(m.timeInRange * 100)}%</b>
        <span>Tempo in banda</span>
      </div>
      <div className="metric">
        <b>{formatDays(m.tmaxDays)}</b>
        <span>Tmax (corsa)</span>
      </div>
    </div>
  )
}
