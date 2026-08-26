import { useMemo } from 'react'
import { PRESETS } from '@shared/catalog'
import { simulate } from '@shared/engine/simulate'
import { StatsPanel } from '../components/StatsPanel'
import { MoleculeLibrary } from '../components/MoleculeLibrary'
import { PkChart } from '../components/PkChart'
import { ProtocolInspector } from '../components/ProtocolInspector'
import { Timeline } from '../components/Timeline'
import { useApp } from '../store/useApp'

export function Simula() {
  const lines = useApp((s) => s.lines)
  const patient = useApp((s) => s.patient)
  const horizonDays = useApp((s) => s.horizonDays)
  const settings = useApp((s) => s.settings)
  const loadPreset = useApp((s) => s.loadPreset)
  const setHorizon = useApp((s) => s.setHorizon)
  const patch = useApp((s) => s.patchSettings)

  const result = useMemo(
    () =>
      simulate({
        lines,
        patient,
        horizonDays,
        cvPercent: settings.showUncertainty ? settings.cvPercent : 0,
        settings
      }),
    [lines, patient, horizonDays, settings]
  )

  return (
    <>
      <MoleculeLibrary />
      <section className="canvas">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          {PRESETS.slice(0, 6).map((p) => (
            <button key={p.id} className="chip" onClick={() => loadPreset(p.id)} title={p.blurb}>
              {p.name}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className={`chip ${settings.showRefMax !== false ? 'on' : ''}`}
            onClick={() => patch({ showRefMax: settings.showRefMax === false })}
          >
            Max
          </button>
          <button
            type="button"
            className={`chip ${settings.showRefAvg !== false ? 'on' : ''}`}
            onClick={() => patch({ showRefAvg: settings.showRefAvg === false })}
          >
            Media
          </button>
          <button
            type="button"
            className={`chip ${settings.showRefMin !== false ? 'on' : ''}`}
            onClick={() => patch({ showRefMin: settings.showRefMin === false })}
          >
            Min
          </button>
          <label className="hair" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Orizzonte
            <input
              type="number"
              min={7}
              max={730}
              value={horizonDays}
              onChange={(e) => setHorizon(Number(e.target.value))}
              style={{
                width: 72,
                background: '#0b1220',
                border: '1px solid #243044',
                padding: '4px 6px',
                fontFamily: 'IBM Plex Mono'
              }}
            />
            g
          </label>
        </div>
        <PkChart result={result} />
        <StatsPanel result={result} />
        <Timeline />
        <p className="disclaimer-bar">
          Simulazione, non prescrizione. © 2026 Daniele Gabrovec · Info nella rail.
        </p>
      </section>
      <ProtocolInspector />
    </>
  )
}
