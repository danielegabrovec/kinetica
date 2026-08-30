import { useMemo, useRef, useState, type DragEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { simulate } from '@shared/engine/simulate'
import { resolveClusterStyle, SIM_STROKES, simClusterLabel } from '@shared/sim-cluster'
import type { SimStroke } from '@shared/types'
import { useApp } from '../store/useApp'
import { isMoleculeDrag, readMoleculeDrag } from './MoleculeLibrary'
import { PkChart } from './PkChart'
import { StatsPanel } from './StatsPanel'
import { ClusterLanes } from './Timeline'

const STROKE_HINT: Record<SimStroke, string> = {
  solid: 'Continuo',
  dashed: 'Tratteggiato',
  dotted: 'Puntinato'
}

export function SimClusterPane({
  clusterId,
  index,
  canRemove
}: {
  clusterId: string
  index: number
  canRemove: boolean
}) {
  const allLines = useApp((s) => s.lines)
  const cluster = useApp((s) => s.simClusters.find((c) => c.id === clusterId))
  const lines = allLines.filter((l) => l.simClusterId === clusterId)
  const patient = useApp((s) => s.patient)
  const horizonDays = useApp((s) => s.horizonDays)
  const settings = useApp((s) => s.settings)
  const selected = useApp((s) => s.selectedSimClusterId)
  const select = useApp((s) => s.selectSimCluster)
  const remove = useApp((s) => s.removeSimCluster)
  const patch = useApp((s) => s.patchSimCluster)
  const add = useApp((s) => s.addFormulation)
  const label = simClusterLabel(index)
  const on = selected === clusterId
  const style = resolveClusterStyle(cluster ?? { id: clusterId }, index)
  const [emptyOver, setEmptyOver] = useState(false)
  const emptyCount = useRef(0)

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
    <article
      className={`sim-cluster ${on ? 'sel' : ''}`}
      onClick={() => select(clusterId)}
    >
      <header className="cluster-head">
        <label className="cluster-color-wrap" title="Colore della curva" onClick={(e) => e.stopPropagation()}>
          <input
            type="color"
            value={style.color}
            aria-label={`Colore ${label}`}
            onChange={(e) => patch(clusterId, { color: e.target.value })}
          />
        </label>
        <div className="hair">{label}</div>
        <div className="cluster-stroke" onClick={(e) => e.stopPropagation()} role="group" aria-label="Tratto">
          {SIM_STROKES.map((k) => (
            <button
              key={k}
              type="button"
              className={style.stroke === k ? 'on' : ''}
              title={STROKE_HINT[k]}
              aria-label={STROKE_HINT[k]}
              onClick={() => patch(clusterId, { stroke: k })}
            >
              {k === 'solid' ? '━' : k === 'dashed' ? '┅' : '⋯'}
            </button>
          ))}
        </div>
        <span className="hair" style={{ flex: 1 }}>
          {lines.length
            ? `${lines.length} molecol${lines.length === 1 ? 'a' : 'e'} · grafico proprio`
            : 'Spazio vuoto'}
        </span>
        {canRemove ? (
          <button
            type="button"
            className="icon-btn"
            title={`Elimina ${label}`}
            aria-label={`Elimina ${label}`}
            onClick={(e) => {
              e.stopPropagation()
              remove(clusterId)
            }}
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </header>
      {lines.length ? (
        <>
          <PkChart result={result} lines={lines} paint={style} />
          <StatsPanel result={result} />
        </>
      ) : (
        <div
          className={`cluster-empty ${emptyOver ? 'mol-over' : ''}`}
          onDragEnter={(e: DragEvent) => {
            e.preventDefault()
            emptyCount.current += 1
            if (isMoleculeDrag(e)) setEmptyOver(true)
          }}
          onDragOver={(e: DragEvent) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
          }}
          onDragLeave={() => {
            emptyCount.current = Math.max(0, emptyCount.current - 1)
            if (emptyCount.current === 0) setEmptyOver(false)
          }}
          onDrop={(e: DragEvent) => {
            e.preventDefault()
            emptyCount.current = 0
            setEmptyOver(false)
            const mol = readMoleculeDrag(e)
            if (mol) add(mol, clusterId)
          }}
        >
          {emptyOver ? 'Trascina qui la molecola' : `Trascina una molecola in ${label} per il suo grafico`}
        </div>
      )}
      <ClusterLanes clusterId={clusterId} color={style.color} />
    </article>
  )
}
