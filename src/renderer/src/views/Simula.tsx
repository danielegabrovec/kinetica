import { useMemo } from 'react'
import { PRESETS } from '@shared/catalog'
import { simulate } from '@shared/engine/simulate'
import { resolveClusterStyle, simClusterLabel } from '@shared/sim-cluster'
import { MoleculeLibrary } from '../components/MoleculeLibrary'
import { OverlayChart } from '../components/PkChart'
import { ProtocolInspector } from '../components/ProtocolInspector'
import { SimClusterPane } from '../components/SimClusterPane'
import { useApp } from '../store/useApp'
import { useFileUi } from '../store/useFileUi'

export function Simula() {
  const simClusters = useApp((s) => s.simClusters)
  const lines = useApp((s) => s.lines)
  const setHorizon = useApp((s) => s.setHorizon)
  const horizonDays = useApp((s) => s.horizonDays)
  const patient = useApp((s) => s.patient)
  const settings = useApp((s) => s.settings)
  const patch = useApp((s) => s.patchSettings)
  const addSimCluster = useApp((s) => s.addSimCluster)
  const loadPresetAction = useApp((s) => s.loadPreset)
  const request = useFileUi((s) => s.request)
  const loadPreset = (id: string) => request(() => loadPresetAction(id))
  const multi = simClusters.length > 1
  const overlayOn = multi && settings.overlayClusters !== false

  const overlayGroups = useMemo(() => {
    if (!overlayOn) return []
    return simClusters
      .map((c, i) => {
        const clusterLines = lines.filter((l) => l.simClusterId === c.id && l.enabled)
        if (!clusterLines.length) return null
        const style = resolveClusterStyle(c, i)
        return {
          label: simClusterLabel(i),
          color: style.color,
          stroke: style.stroke,
          lineWidth: style.lineWidth,
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
        result: ReturnType<typeof simulate>
      }[]
  }, [overlayOn, simClusters, lines, patient, horizonDays, settings])

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
          {multi ? (
            <button
              type="button"
              className={`chip ${settings.overlayClusters !== false ? 'on' : ''}`}
              onClick={() => patch({ overlayClusters: settings.overlayClusters === false })}
              title="Stesso asse, un colore per cluster. Le curve non si sommano."
            >
              Sovrapponi
            </button>
          ) : null}
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
        {overlayGroups.length >= 2 ? (
          <div className="overlay-block">
            <div className="hair" style={{ marginBottom: 6 }}>
              Confronto · colori e tratti dei cluster · curva punteggiata = Δ (Cluster 1 − Cluster 2)
            </div>
            <OverlayChart groups={overlayGroups} />
          </div>
        ) : null}
        <div className={`cluster-stack ${multi ? 'multi' : 'single'}`}>
          {simClusters.map((c, i) => (
            <SimClusterPane
              key={c.id}
              clusterId={c.id}
              index={i}
              canRemove={simClusters.length > 1}
            />
          ))}
        </div>
        <div className="cluster-add-row">
          <button type="button" className="cluster-add" onClick={addSimCluster}>
            Aggiungi cluster
          </button>
        </div>
        <p className="disclaimer-bar">
          Simulazione, non prescrizione. © 2026 Daniele Gabrovec · Info nella rail.
        </p>
      </section>
      <ProtocolInspector />
    </>
  )
}
