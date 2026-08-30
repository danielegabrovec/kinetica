import { useState } from 'react'
import { FREQUENCIES, getFormulation, getFrequency } from '@shared/catalog'
import { interpolate, simulate } from '@shared/engine/simulate'
import { convert, preferredUnit } from '@shared/engine/units'
import { useApp } from '../store/useApp'
import { FormulationPicker } from './FormulationPicker'

const WEEKDAYS = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mer' },
  { id: 4, label: 'Gio' },
  { id: 5, label: 'Ven' },
  { id: 6, label: 'Sab' },
  { id: 0, label: 'Dom' }
]

export function ProtocolInspector() {
  const lines = useApp((s) => s.lines)
  const selected = useApp((s) => s.selectedLineId)
  const update = useApp((s) => s.updateLine)
  const changeFormulation = useApp((s) => s.changeFormulation)
  const remove = useApp((s) => s.removeLine)
  const dup = useApp((s) => s.duplicateLine)
  const showC = useApp((s) => s.settings.showEvidenceC)
  const patient = useApp((s) => s.patient)
  const horizonDays = useApp((s) => s.horizonDays)
  const settings = useApp((s) => s.settings)
  const line = lines.find((l) => l.id === selected) ?? lines[0]
  const f = line ? getFormulation(line.formulationId) : undefined
  const freq = line ? getFrequency(line.frequencyId) : undefined
  const scale = line?.scalePercent ?? 0
  const [labDay, setLabDay] = useState(7)
  const [labVal, setLabVal] = useState('')
  const [labMsg, setLabMsg] = useState('')

  const calibra = () => {
    if (!line || !f) return
    const measured = Number(labVal)
    if (!Number.isFinite(measured) || measured <= 0) {
      setLabMsg('Inserisci il valore del prelievo.')
      return
    }
    const thisLine = { ...line, scalePercent: 0 }
    const others = lines.filter(
      (l) => l.id !== line.id && l.enabled && l.simClusterId === line.simClusterId
    )
    const simOpts = {
      patient,
      horizonDays,
      cvPercent: 0,
      settings: {
        ...settings,
        showUncertainty: false,
        showFreeHormone: false,
        showEstimatedE2: false
      }
    }
    const resThis = simulate({ ...simOpts, lines: [thisLine] })
    const seriesThis = resThis.series.find((s) => s.analyte === f.analyte)
    const predThis = seriesThis ? interpolate(seriesThis.points, labDay) : 0
    if (predThis < 1e-8) {
      setLabMsg('A quel giorno il modello è quasi zero: scegli un giorno con curva visibile.')
      return
    }
    const resOthers = others.length
      ? simulate({ ...simOpts, lines: others })
      : null
    const seriesOthers = resOthers?.series.find((s) => s.analyte === f.analyte)
    const predOthers = seriesOthers ? interpolate(seriesOthers.points, labDay) : 0
    const unit = preferredUnit(f.nativeUnit, settings.unitMode)
    const measuredNative = convert(measured, unit, f.nativeUnit)
    const need = measuredNative - predOthers
    if (need <= 0) {
      setLabMsg('Le altre molecole coprono già il prelievo. Spegni una riga o controlla il giorno.')
      return
    }
    const pct = (need / predThis - 1) * 100
    const clipped = Math.max(-80, Math.min(200, pct))
    update(line.id, { scalePercent: Math.round(clipped * 10) / 10 })
    setLabMsg(
      `Modello ${predThis.toFixed(1)} ${f.nativeUnit} vs prelievo ${measured} ${unit} → ${clipped >= 0 ? '+' : ''}${clipped.toFixed(0)}%`
    )
  }

  return (
    <aside className="inspector">
      <div className="hair">Impostazioni</div>
      {!line || !f ? (
        <p style={{ color: '#93A0B5', marginTop: 12 }}>
          Seleziona un cluster sotto il grafico, o trascina una molecola dalla libreria.
        </p>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div className="hair" style={{ marginBottom: 10 }}>
            {f.name}
            {f.evidence === 'C' ? ' · PK stimata' : ''}
          </div>

          <FormulationPicker
            value={line.formulationId}
            showEvidenceC={showC}
            onChange={(id) => changeFormulation(line.id, id)}
          />

          <div className="field">
            <label>Dose ({f.doseUnit})</label>
            <input
              type="number"
              step="any"
              min={0}
              value={Number.isFinite(line.dose) ? line.dose : ''}
              onChange={(e) =>
                update(line.id, { dose: e.target.value === '' ? 0 : Number(e.target.value) })
              }
            />
            {f.vialMgPerMl ? (
              <span className="hair">
                {(line.dose / f.vialMgPerMl).toFixed(2)} mL a {f.vialMgPerMl} mg/mL
              </span>
            ) : null}
          </div>
          <div className="doses" style={{ marginBottom: 12 }}>
            {f.typicalDoses.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${d === line.dose ? 'on' : ''}`}
                onClick={() => update(line.id, { dose: d })}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="field">
            <label>Frequenza</label>
            <select
              value={line.frequencyId}
              onChange={(e) => update(line.id, { frequencyId: e.target.value })}
            >
              {FREQUENCIES.map((fr) => (
                <option key={fr.id} value={fr.id}>
                  {fr.abbrev} — {fr.label}
                </option>
              ))}
            </select>
          </div>
          {line.frequencyId === 'every-n' || freq?.kind === 'every-n-days' ? (
            <div className="field">
              <label>Ogni N giorni</label>
              <input
                type="number"
                min={0.25}
                step={0.5}
                value={
                  line.frequencyId === 'every-n'
                    ? (line.everyNDays ?? 7)
                    : (freq?.n ?? line.everyNDays ?? 1)
                }
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (line.frequencyId === 'every-n') update(line.id, { everyNDays: n })
                  else update(line.id, { frequencyId: 'every-n', everyNDays: n })
                }}
              />
            </div>
          ) : null}
          {freq?.kind === 'weekly-days' ? (
            <div className="field">
              <label>Giorni della settimana</label>
              <div className="doses">
                {WEEKDAYS.map((d) => {
                  const days = line.weeklyDays ?? freq.days ?? [1, 3, 5]
                  const on = days.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={`chip ${on ? 'on' : ''}`}
                      onClick={() => {
                        const next = on ? days.filter((x) => x !== d.id) : [...days, d.id]
                        update(line.id, { weeklyDays: next.length ? next : [d.id] })
                      }}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="field">
            <label>Durata (giorni, step 0,5)</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={line.durationDays}
              onChange={(e) => update(line.id, { durationDays: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Inizio (giorni, step 0,5 — es. 3,5)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={line.startOffsetDays}
              onChange={(e) => update(line.id, { startOffsetDays: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Ora</label>
            <input
              type="number"
              min={0}
              max={23}
              value={line.startHour}
              onChange={(e) => update(line.id, { startHour: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Front-load (prima dose, opzionale)</label>
            <input
              type="number"
              placeholder="—"
              value={line.frontloadDose ?? ''}
              onChange={(e) =>
                update(line.id, {
                  frontloadDose: e.target.value === '' ? undefined : Number(e.target.value)
                })
              }
            />
          </div>

          <div className="field" style={{ marginTop: 6 }}>
            <label>Adattamento curva {scale ? `(${scale > 0 ? '+' : ''}${scale}%)` : '(modello)'}</label>
            <input
              type="range"
              min={-50}
              max={80}
              step={1}
              value={scale}
              onChange={(e) => update(line.id, { scalePercent: Number(e.target.value) })}
            />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                step={1}
                value={scale}
                onChange={(e) =>
                  update(line.id, {
                    scalePercent: e.target.value === '' ? 0 : Number(e.target.value)
                  })
                }
                style={{ width: 72 }}
              />
              <span className="hair">%</span>
              <button type="button" className="ghost" onClick={() => update(line.id, { scalePercent: 0 })}>
                Azzera
              </button>
            </div>
            <span className="hair">
              Prelievo più alto del grafico → +. Più basso → −. +20% = curva × 1,20.
            </span>
          </div>
          <div className="field">
            <label>Calibra da prelievo</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <input
                type="number"
                min={0}
                step={0.1}
                value={labDay}
                onChange={(e) => setLabDay(Number(e.target.value))}
                title="Giorno del prelievo"
              />
              <input
                type="number"
                min={0}
                step="any"
                placeholder={preferredUnit(f.nativeUnit, settings.unitMode)}
                value={labVal}
                onChange={(e) => setLabVal(e.target.value)}
              />
            </div>
            <span className="hair">
              Giorno · valore in {preferredUnit(f.nativeUnit, settings.unitMode)}
            </span>
            <button type="button" className="ghost" onClick={calibra}>
              Calcola adattamento
            </button>
            {labMsg ? <span className="hair">{labMsg}</span> : null}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="ghost" onClick={() => dup(line.id)}>
              Duplica
            </button>
            <button className="ghost" onClick={() => remove(line.id)}>
              Elimina
            </button>
            <label className="hair" style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={line.enabled}
                onChange={(e) => update(line.id, { enabled: e.target.checked })}
              />
              attiva
            </label>
          </div>
        </div>
      )}
    </aside>
  )
}
