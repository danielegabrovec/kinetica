import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import {
  COMPOUNDS,
  FREQUENCIES,
  getFormulation,
  searchFormulations
} from '@shared/catalog'
import { frequencyLabel } from '@shared/engine/schedule'
import type { Compound, Formulation, ProtocolLine } from '@shared/types'
import { useApp } from '../store/useApp'

const FLY_FREQ = [
  'qid', 'tid', 'bid', 'ed', 'eod', 'e3d', 'e4d', 'e5d',
  'x6wk', 'x5wk', 'x4wk', 'mwf', 'e3_5d', 'weekly',
  'e10d', 'e14d', 'e21d', 'e28d', 'e70d', 'e84d'
]

const DURATIONS = [
  { label: '4 settimane', days: 28 },
  { label: '8 settimane', days: 56 },
  { label: '12 settimane', days: 84 },
  { label: '16 settimane', days: 112 },
  { label: '24 settimane', days: 168 },
  { label: '52 settimane', days: 365 }
]

function snapHalf(n: number) {
  return Math.round(n * 2) / 2
}
function fmtDay(d: number) {
  const x = snapHalf(d)
  return Number.isInteger(x) ? `${x}` : x.toFixed(1)
}
function snapDose(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0.1
  if (raw >= 50) return Math.round(raw / 5) * 5
  if (raw >= 10) return Math.round(raw)
  if (raw >= 1) return Math.round(raw * 10) / 10
  return Math.round(raw * 100) / 100
}

function clampPos(left: number, top: number, w: number, h: number) {
  const pad = 8
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (left + w > vw - pad) left = vw - w - pad
  if (top + h > vh - pad) top = vh - h - pad
  return { left: Math.max(pad, left), top: Math.max(pad, top) }
}

function beside(rect: DOMRect, w: number, h: number) {
  const pad = 8
  let left = rect.right - 2
  if (left + w > window.innerWidth - pad) left = rect.left - w + 2
  let top = rect.top
  if (top + h > window.innerHeight - pad) top = window.innerHeight - h - pad
  return { left: Math.max(pad, left), top: Math.max(pad, top) }
}

type Sub = 'mol' | 'freq' | 'dose' | 'time' | 'duration' | 'curve' | 'track' | null

export function ClipContextMenu({
  x,
  y,
  line,
  onClose
}: {
  x: number
  y: number
  line: ProtocolLine
  onClose: () => void
}) {
  const update = useApp((s) => s.updateLine)
  const changeFormulation = useApp((s) => s.changeFormulation)
  const remove = useApp((s) => s.removeLine)
  const dup = useApp((s) => s.duplicateLine)
  const horizon = useApp((s) => s.horizonDays)
  const setHorizon = useApp((s) => s.setHorizon)
  const showC = useApp((s) => s.settings.showEvidenceC)
  const f = getFormulation(line.formulationId)
  const rootRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(() => clampPos(x, y, 240, 280))
  const [sub, setSub] = useState<Sub>(null)
  const [compoundId, setCompoundId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const compoundRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos(clampPos(x, y, r.width, r.height))
  }, [x, y])

  const freq = FREQUENCIES.find((fr) => fr.id === line.frequencyId)
  const t0 = line.startOffsetDays + line.startHour / 24

  const compounds = useMemo(
    () => COMPOUNDS.filter((c) => (showC ? true : c.formulationIds.some((id) => getFormulation(id)?.evidence !== 'C'))),
    [showC]
  )

  const hits = useMemo(() => {
    let list = searchFormulations(q)
    if (!showC) list = list.filter((x) => x.evidence !== 'C')
    return list
  }, [q, showC])

  const searching = q.trim().length > 0

  const go = (patch: Partial<ProtocolLine>) => {
    update(line.id, patch)
    onClose()
  }

  const pickMol = (id: string) => {
    changeFormulation(line.id, id)
    onClose()
  }

  const pickCompound = (c: Compound) => {
    const forms = c.formulationIds.map((id) => getFormulation(id)).filter(Boolean) as Formulation[]
    const visible = showC ? forms : forms.filter((x) => x.evidence !== 'C')
    if (visible.length <= 1) {
      if (visible[0]) pickMol(visible[0].id)
      return
    }
    setCompoundId(c.id)
  }

  const openForms = compoundId
    ? ((COMPOUNDS.find((c) => c.id === compoundId)?.formulationIds ?? [])
        .map((id) => getFormulation(id))
        .filter(Boolean) as Formulation[])
    : []

  const fly = (id: Sub) => {
    const el = rowRefs.current[id ?? '']
    if (!el) return { left: pos.left + 220, top: pos.top }
    return beside(el.getBoundingClientRect(), id === 'mol' ? 320 : 260, 420)
  }

  const nestPos = () => {
    const el = compoundId ? compoundRefs.current[compoundId] : null
    if (!el) return { left: pos.left + 500, top: pos.top }
    return beside(el.getBoundingClientRect(), 280, 360)
  }

  return (
    <>
      <div
        ref={rootRef}
        className="ctx ctx-layer"
        style={{ left: pos.left, top: pos.top }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          label="Molecola"
          hint={f?.name ?? '—'}
          active={sub === 'mol'}
          bind={(el) => {
            rowRefs.current.mol = el
          }}
          onOpen={() => {
            setSub('mol')
            setCompoundId(null)
          }}
        />
        <MenuItem
          label="Frequenza"
          hint={freq?.abbrev ?? '—'}
          active={sub === 'freq'}
          bind={(el) => {
            rowRefs.current.freq = el
          }}
          onOpen={() => setSub('freq')}
        />
        <MenuItem
          label="Dose"
          hint={`${line.dose} ${f?.doseUnit ?? ''}`}
          active={sub === 'dose'}
          bind={(el) => {
            rowRefs.current.dose = el
          }}
          onOpen={() => setSub('dose')}
        />
        <MenuItem
          label="Inizio"
          hint={`giorno ${fmtDay(t0)}`}
          active={sub === 'time'}
          bind={(el) => {
            rowRefs.current.time = el
          }}
          onOpen={() => setSub('time')}
        />
        <MenuItem
          label="Durata"
          hint={`${fmtDay(line.durationDays)} g`}
          active={sub === 'duration'}
          bind={(el) => {
            rowRefs.current.duration = el
          }}
          onOpen={() => setSub('duration')}
        />
        <MenuItem
          label="Adattamento curva"
          hint={`${line.scalePercent ?? 0}%`}
          active={sub === 'curve'}
          bind={(el) => {
            rowRefs.current.curve = el
          }}
          onOpen={() => setSub('curve')}
        />
        <MenuItem
          label="Traccia"
          hint={frequencyLabel(line)}
          active={sub === 'track'}
          bind={(el) => {
            rowRefs.current.track = el
          }}
          onOpen={() => setSub('track')}
        />
      </div>

      {sub === 'mol'
        ? createPortal(
            <div
              className="ctx ctx-layer"
              style={{ ...fly('mol'), minWidth: 300, maxHeight: '70vh', overflow: 'auto' }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ctx-sec">Cambia molecola</div>
              <input
                autoFocus
                placeholder="Cerca estere, brand, INN…"
                value={q}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  setQ(e.target.value)
                  setCompoundId(null)
                }}
                onKeyDown={(e) => e.stopPropagation()}
                style={{
                  width: 'calc(100% - 16px)',
                  margin: '4px 8px 8px',
                  background: '#0b1220',
                  border: '1px solid #243044',
                  padding: '7px 8px'
                }}
              />
              {searching ? (
                <>
                  <div className="ctx-sec">{hits.length} formulazioni</div>
                  {hits.map((mol) => (
                    <button
                      key={mol.id}
                      type="button"
                      className={mol.id === line.formulationId ? 'on' : ''}
                      onClick={() => pickMol(mol.id)}
                    >
                      {mol.name}
                      {mol.brand ? ` · ${mol.brand}` : ''}
                    </button>
                  ))}
                  {hits.length === 0 ? <p style={{ padding: 12, color: '#93A0B5' }}>Nessun risultato.</p> : null}
                </>
              ) : (
                <>
                  <div className="ctx-sec">Scegli il composto, poi l'estere</div>
                  {compounds.map((c) => {
                    const n = c.formulationIds.length
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={compoundId === c.id || f?.compoundId === c.id ? 'on' : ''}
                        ref={(el) => {
                          compoundRefs.current[c.id] = el
                        }}
                        onMouseEnter={() => {
                          if (n > 1) setCompoundId(c.id)
                        }}
                        onClick={() => pickCompound(c)}
                      >
                        <span>{c.inn}</span>
                        <span className="ctx-hint">
                          {n > 1 ? `${n} esteri/forme` : 'unica'}
                          {n > 1 ? <ChevronRight size={14} /> : null}
                        </span>
                      </button>
                    )
                  })}
                </>
              )}
            </div>,
            document.body
          )
        : null}

      {sub === 'mol' && compoundId && !searching && openForms.length > 1
        ? createPortal(
            <div
              className="ctx ctx-layer"
              style={{ ...nestPos(), minWidth: 260, maxHeight: '70vh', overflow: 'auto' }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ctx-sec">{COMPOUNDS.find((c) => c.id === compoundId)?.inn} — forme</div>
              {openForms.map((mol) => (
                <button
                  key={mol.id}
                  type="button"
                  className={mol.id === line.formulationId ? 'on' : ''}
                  onClick={() => pickMol(mol.id)}
                >
                  {mol.name}
                  {mol.brand ? ` · ${mol.brand}` : ''}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}

      {sub === 'freq'
        ? createPortal(
            <Panel pos={fly('freq')} onClose={onClose}>
              <div className="ctx-sec">Somministrazione</div>
              <div className="ctx-grid">
                {FLY_FREQ.map((id) => {
                  const fr = FREQUENCIES.find((x) => x.id === id)
                  return (
                    <button
                      key={id}
                      type="button"
                      className={line.frequencyId === id ? 'on' : ''}
                      title={fr?.label}
                      onClick={() => go({ frequencyId: id })}
                    >
                      {fr?.abbrev ?? id}
                    </button>
                  )
                })}
              </div>
            </Panel>,
            document.body
          )
        : null}

      {sub === 'dose'
        ? createPortal(
            <Panel pos={fly('dose')}>
              <div className="ctx-sec">Dosi tipiche</div>
              {(f?.typicalDoses ?? []).map((d) => (
                <button key={d} type="button" onClick={() => go({ dose: d })}>
                  {d} {f?.doseUnit}
                </button>
              ))}
              <div className="ctx-sec">Rapido</div>
              <button type="button" onClick={() => go({ dose: snapDose(line.dose * 2) })}>
                Raddoppia dose
              </button>
              <button type="button" onClick={() => go({ dose: snapDose(line.dose / 2) })}>
                Dimezza dose
              </button>
              <button type="button" onClick={() => go({ frontloadDose: line.dose * 2 })}>
                Front-load 2× sulla prima
              </button>
              <button type="button" onClick={() => go({ frontloadDose: undefined })}>
                Togli front-load
              </button>
            </Panel>,
            document.body
          )
        : null}

      {sub === 'time'
        ? createPortal(
            <Panel pos={fly('time')}>
              <div className="ctx-sec">Offset (mezzi giorni)</div>
              <button type="button" onClick={() => go({ startOffsetDays: 0, startHour: 0 })}>
                Giorno 0
              </button>
              <button type="button" onClick={() => go({ startOffsetDays: 1, startHour: 0 })}>
                Giorno 1
              </button>
              {[0.5, 1, 3.5, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    go({
                      startOffsetDays: snapHalf(line.startOffsetDays + line.startHour / 24 + d),
                      startHour: 0
                    })
                  }
                >
                  Sposta di +{fmtDay(d)} g
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  dup(line.id, { startOffsetDays: snapHalf(t0 + 3.5), startHour: 0 })
                  onClose()
                }}
              >
                Duplica dopo 3,5 giorni
              </button>
            </Panel>,
            document.body
          )
        : null}

      {sub === 'duration'
        ? createPortal(
            <Panel pos={fly('duration')}>
              <div className="ctx-sec">Lunghezza protocollo</div>
              {DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => {
                    if (line.startOffsetDays + d.days > horizon) setHorizon(line.startOffsetDays + d.days)
                    go({ durationDays: d.days })
                  }}
                >
                  {d.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => go({ durationDays: Math.max(0.5, horizon - line.startOffsetDays) })}
              >
                Fino alla fine dell'orizzonte
              </button>
            </Panel>,
            document.body
          )
        : null}

      {sub === 'curve'
        ? createPortal(
            <Panel pos={fly('curve')}>
              <div className="ctx-sec">Prelievo vs modello</div>
              {[-20, -10, 10, 20].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => go({ scalePercent: (line.scalePercent ?? 0) + p })}
                >
                  {p > 0 ? '+' : ''}
                  {p}%
                </button>
              ))}
              <button type="button" onClick={() => go({ scalePercent: 0 })}>
                Azzera adattamento
              </button>
            </Panel>,
            document.body
          )
        : null}

      {sub === 'track'
        ? createPortal(
            <Panel pos={fly('track')}>
              <button
                type="button"
                onClick={() => {
                  dup(line.id)
                  onClose()
                }}
              >
                Duplica
              </button>
              <button type="button" onClick={() => go({ enabled: !line.enabled })}>
                {line.enabled ? 'Disattiva (muta)' : 'Riattiva'}
              </button>
              <button
                type="button"
                onClick={() => {
                  remove(line.id)
                  onClose()
                }}
              >
                Elimina
              </button>
            </Panel>,
            document.body
          )
        : null}
    </>
  )
}

function MenuItem({
  label,
  hint,
  active,
  onOpen,
  bind
}: {
  label: string
  hint: string
  active: boolean
  onOpen: () => void
  bind: (el: HTMLButtonElement | null) => void
}) {
  return (
    <button
      type="button"
      ref={bind}
      className={`ctx-row ${active ? 'open' : ''}`}
      onMouseEnter={onOpen}
      onClick={onOpen}
    >
      <span>{label}</span>
      <span className="ctx-hint">
        {hint}
        <ChevronRight size={14} strokeWidth={1.7} />
      </span>
    </button>
  )
}

function Panel({
  pos,
  children
}: {
  pos: { left: number; top: number }
  children: ReactNode
  onClose?: () => void
}) {
  return (
    <div
      className="ctx ctx-layer"
      style={{ ...pos, minWidth: 252, maxHeight: '70vh', overflow: 'auto' }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}
