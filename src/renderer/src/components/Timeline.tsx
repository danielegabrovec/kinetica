import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { CLUSTER_COLOR, getFormulation } from '@shared/catalog'
import { frequencyLabel } from '@shared/engine/schedule'
import type { ProtocolLine } from '@shared/types'
import { useApp } from '../store/useApp'
import { ClipContextMenu } from './ClipContextMenu'
import { isMoleculeDrag, readMoleculeDrag } from './MoleculeLibrary'

const LANE_H = 56

function snapDose(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0.1
  if (raw >= 50) return Math.round(raw / 5) * 5
  if (raw >= 10) return Math.round(raw)
  if (raw >= 1) return Math.round(raw * 10) / 10
  return Math.round(raw * 100) / 100
}

function snapHalf(n: number) {
  return Math.round(n * 2) / 2
}

function fmtDay(d: number) {
  const x = snapHalf(d)
  return Number.isInteger(x) ? `${x}` : x.toFixed(1)
}

function daysFromPx(dx: number, laneW: number, horizon: number) {
  return snapHalf((dx / Math.max(laneW, 1)) * horizon)
}

export function ClusterLanes({ clusterId, color: clusterColor }: { clusterId: string; color?: string }) {
  const allLines = useApp((s) => s.lines)
  const lines = allLines.filter((l) => l.simClusterId === clusterId)
  const selected = useApp((s) => s.selectedLineId)
  const select = useApp((s) => s.selectLine)
  const selectCluster = useApp((s) => s.selectSimCluster)
  const add = useApp((s) => s.addFormulation)
  const remove = useApp((s) => s.removeLine)
  const update = useApp((s) => s.updateLine)
  const moveLine = useApp((s) => s.moveLine)
  const horizon = useApp((s) => s.horizonDays)
  const setHorizon = useApp((s) => s.setHorizon)
  const [over, setOver] = useState(false)
  const [molOver, setMolOver] = useState(false)
  const overCount = useRef(0)
  const [hud, setHud] = useState<{ x: number; y: number; text: string } | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; lineId: string } | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = (e: Event) => {
      const el = e.target as Element | null
      if (el?.closest?.('.ctx-layer')) return
      setMenu(null)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [menu])

  const onDropMol = (e: DragEvent) => {
    e.preventDefault()
    overCount.current = 0
    setOver(false)
    setMolOver(false)
    const raw = e.dataTransfer.getData('text/plain') || ''
    if (raw.startsWith('line:')) {
      moveLine(raw.slice(5), null, clusterId)
      return
    }
    const mol = readMoleculeDrag(e)
    if (mol) add(mol, clusterId)
  }

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault()
    overCount.current += 1
    setOver(true)
    setMolOver(isMoleculeDrag(e))
  }

  const onDragOverZone = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = isMoleculeDrag(e) ? 'copy' : 'move'
  }

  const onDragLeave = () => {
    overCount.current = Math.max(0, overCount.current - 1)
    if (overCount.current === 0) {
      setOver(false)
      setMolOver(false)
    }
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(horizon * f))
  const menuLine = menu ? lines.find((l) => l.id === menu.lineId) : undefined

  return (
    <div
      className={`timeline ${over ? 'over' : ''} ${molOver ? 'mol-over' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOverZone}
      onDragLeave={onDragLeave}
      onDrop={onDropMol}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="ruler">
        {ticks.map((t) => (
          <span key={t}>{t}g</span>
        ))}
      </div>
      {lines.map((l) => {
        const f = getFormulation(l.formulationId)
        const color = clusterColor || (f ? CLUSTER_COLOR[f.cluster] : '#94A3B8')
        const t0 = l.startOffsetDays + l.startHour / 24
        const left = Math.max(0, (t0 / horizon) * 100)
        const width = Math.max(3, (l.durationDays / horizon) * 100)
        const sameUnit = allLines.filter(
          (x) => getFormulation(x.formulationId)?.doseUnit === (f?.doseUnit ?? 'mg')
        )
        const ref = Math.max(
          f?.defaultDose ?? 1,
          ...(f?.typicalDoses ?? []),
          ...sameUnit.map((x) => x.dose),
          1
        )
        const h = 12 + Math.min(1, Math.max(0.12, l.dose / ref)) * (LANE_H - 16)
        const top = Math.max(2, LANE_H - 4 - h)
        return (
          <div key={l.id} className={`track ${l.id === selected ? 'sel' : ''}`}>
            <button
              type="button"
              className="track-label"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', `line:${l.id}`)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onClick={() => select(l.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                select(l.id)
                setMenu({ x: e.clientX, y: e.clientY, lineId: l.id })
              }}
              title="Trascina per riordinare o cambiare cluster · tasto destro: menu"
            >
              {f?.name ?? l.formulationId}
            </button>
            <div
              className="track-lane"
              onClick={() => select(l.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const raw = e.dataTransfer.getData('text/plain')
                if (raw.startsWith('line:')) {
                  moveLine(raw.slice(5), l.id, clusterId)
                  return
                }
                const mol = readMoleculeDrag(e)
                if (mol) add(mol, clusterId)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                select(l.id)
                setMenu({ x: e.clientX, y: e.clientY, lineId: l.id })
              }}
            >
              <div
                className="clip"
                style={{
                  left: `${Math.min(left, 96)}%`,
                  width: `${Math.min(width, 100 - left)}%`,
                  top,
                  height: h,
                  background: color,
                  opacity: l.enabled ? 1 : 0.38
                }}
              >
                <div
                  className="clip-handle"
                  title="Restringi / allunga l'inizio"
                  onPointerDown={(e) => dragEdge(e, 'start', l, horizon, update, setHorizon, setHud)}
                />
                <div
                  className="clip-body"
                  title="Orizzontale: inizio · su/giù: dose · tasto destro: menu"
                  onPointerDown={(e) => dragBody(e, l, f?.doseUnit ?? 'mg', horizon, update, select, setHud)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    select(l.id)
                    setMenu({ x: e.clientX, y: e.clientY, lineId: l.id })
                  }}
                >
                  {l.dose} {f?.doseUnit} · {frequencyLabel(l)} · g{fmtDay(t0)}
                </div>
                <div
                  className="clip-handle"
                  title="Allunga / restringi la durata"
                  onPointerDown={(e) => dragEdge(e, 'end', l, horizon, update, setHorizon, setHud)}
                />
              </div>
            </div>
            <button type="button" className="icon-btn" title="Elimina" onClick={() => remove(l.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        )
      })}
      <div
        className={`drop-slot ${over ? 'over' : ''} ${molOver ? 'mol-over' : ''}`}
        onClick={() => selectCluster(clusterId)}
      >
        {molOver
          ? 'Trascina qui la molecola'
          : lines.length
            ? 'Trascina qui una molecola in questo cluster'
            : 'Spazio vuoto · trascina una molecola'}
      </div>
      <p className="hair" style={{ marginTop: 6 }}>
        Altezza = dose · bordi = durata (mezzi giorni) · su/giù = dose · tasto destro = menu
      </p>

      {hud ? (
        <div className="hud" style={{ left: hud.x + 12, top: hud.y + 12 }}>
          {hud.text}
        </div>
      ) : null}

      {menu && menuLine ? (
        <ClipContextMenu x={menu.x} y={menu.y} line={menuLine} onClose={() => setMenu(null)} />
      ) : null}
    </div>
  )
}

function dragEdge(
  e: ReactPointerEvent,
  which: 'start' | 'end',
  line: ProtocolLine,
  horizon: number,
  update: (id: string, patch: Partial<ProtocolLine>) => void,
  setHorizon: (d: number) => void,
  setHud: (h: { x: number; y: number; text: string } | null) => void
) {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const lane = (el.parentElement?.parentElement as HTMLElement).getBoundingClientRect()
  const startX = e.clientX
  const off0 = line.startOffsetDays
  const dur0 = line.durationDays
  const end0 = off0 + dur0
  const onMove = (ev: Event) => {
    const p = ev as PointerEvent
    const days = daysFromPx(p.clientX - startX, lane.width, horizon)
    if (which === 'end') {
      const dur = Math.max(0.5, snapHalf(dur0 + days))
      update(line.id, { durationDays: dur })
      if (off0 + dur > horizon) setHorizon(Math.ceil(off0 + dur))
      setHud({ x: p.clientX, y: p.clientY, text: `Durata ${fmtDay(dur)} g` })
    } else {
      const off = Math.max(0, Math.min(end0 - 0.5, snapHalf(off0 + days)))
      const dur = Math.max(0.5, snapHalf(end0 - off))
      update(line.id, { startOffsetDays: off, durationDays: dur, startHour: 0 })
      setHud({ x: p.clientX, y: p.clientY, text: `Inizio g ${fmtDay(off)} · durata ${fmtDay(dur)} g` })
    }
  }
  const onUp = (ev: Event) => {
    const p = ev as PointerEvent
    el.releasePointerCapture(p.pointerId)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    setHud(null)
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
}

function dragBody(
  e: ReactPointerEvent,
  line: ProtocolLine,
  unit: string,
  horizon: number,
  update: (id: string, patch: Partial<ProtocolLine>) => void,
  select: (id: string) => void,
  setHud: (h: { x: number; y: number; text: string } | null) => void
) {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const lane = (el.parentElement?.parentElement as HTMLElement).getBoundingClientRect()
  const x0 = e.clientX
  const y0 = e.clientY
  const off0 = line.startOffsetDays + line.startHour / 24
  const dose0 = line.dose
  let mode: 'none' | 'time' | 'dose' = 'none'
  const onMove = (ev: Event) => {
    const p = ev as PointerEvent
    const dx = p.clientX - x0
    const dy = p.clientY - y0
    if (mode === 'none') {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return
      mode = Math.abs(dy) >= Math.abs(dx) - 2 ? 'dose' : 'time'
    }
    if (mode === 'time') {
      const days = daysFromPx(dx, lane.width, horizon)
      const off = Math.max(0, snapHalf(off0 + days))
      update(line.id, { startOffsetDays: off, startHour: 0 })
      setHud({ x: p.clientX, y: p.clientY, text: `Inizio giorno ${fmtDay(off)}` })
    } else {
      const factor = Math.pow(2, -dy / 48)
      const dose = snapDose(dose0 * factor)
      update(line.id, { dose })
      setHud({ x: p.clientX, y: p.clientY, text: `Dose ${dose} ${unit}` })
    }
  }
  const onUp = (ev: Event) => {
    const p = ev as PointerEvent
    try {
      el.releasePointerCapture(p.pointerId)
    } catch {
      /* already released */
    }
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    setHud(null)
    if (mode === 'none') select(line.id)
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
}
