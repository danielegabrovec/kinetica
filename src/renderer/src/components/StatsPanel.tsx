import { convert, formatConc, formatDays, preferredUnit } from '@shared/engine/units'
import type { CurveStats, SimulationResult } from '@shared/types'
import { useApp } from '../store/useApp'

export function StatsPanel({ result }: { result: SimulationResult }) {
  const mode = useApp((s) => s.settings.unitMode)
  const stats = result.analyteStats.filter((s) => !s.analyte.endsWith('-est') && !s.analyte.endsWith('-free'))
  if (!stats.length) {
    return <div className="hair">Trascina una molecola nello slot per vedere picco, valle e media.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0 4px' }}>
      {stats.map((s) => {
        const unit = preferredUnit(s.unit, mode)
        return (
          <div key={s.analyte}>
            <div className="hair" style={{ marginBottom: 6 }}>
              {s.analyteLabel} · stato stazionario (2ª metà, da g {result.ssStartDays.toFixed(0)})
            </div>
            <StatGrid stats={s.ss} native={s.unit} unit={unit} />
            <details style={{ marginTop: 6 }}>
              <summary className="hair" style={{ cursor: 'pointer' }}>
                Corsa intera · mediana, DS, AUC
              </summary>
              <StatGrid stats={s.full} native={s.unit} unit={unit} full />
            </details>
          </div>
        )
      })}
    </div>
  )
}

function StatGrid({
  stats,
  native,
  unit,
  full
}: {
  stats: CurveStats
  native: CurveStats['unit']
  unit: CurveStats['unit']
  full?: boolean
}) {
  const n = (v: number) => formatConc(convert(v, native, unit), unit)
  const items = [
    { k: 'Picco max', v: n(stats.cmax), sub: `giorno ${formatDays(stats.tmaxDays)}` },
    { k: 'Picco min', v: n(stats.cmin), sub: `giorno ${formatDays(stats.tminDays)}` },
    { k: 'Media', v: n(stats.cavg), sub: 'Cavg' },
    { k: 'Mediana', v: n(stats.median), sub: 'p50' },
    { k: 'Peak / trough', v: Number.isFinite(stats.peakTrough) ? stats.peakTrough.toFixed(2) : '—', sub: 'Cmax/Cmin' },
    { k: 'Fluttuazione', v: `${Math.round(stats.fluctuation * 100)}%`, sub: '(Cmax−Cmin)/Cavg' },
    { k: 'In banda', v: `${Math.round(stats.timeInRange * 100)}%`, sub: 'tempo nel range' },
    { k: 'Sopra / sotto', v: `${Math.round(stats.timeAbove * 100)}% / ${Math.round(stats.timeBelow * 100)}%`, sub: 'fuori range' }
  ]
  if (full) {
    items.push(
      { k: 'DS', v: n(stats.stdev), sub: 'deviazione std' },
      { k: 'AUC', v: `${convert(stats.auc, native, unit).toFixed(0)} ${unit}·g`, sub: 'area sotto curva' }
    )
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 10
      }}
    >
      {items.map((it) => (
        <div className="metric" key={it.k}>
          <b>{it.v}</b>
          <span>
            {it.k}
            {it.sub ? ` · ${it.sub}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
