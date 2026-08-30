import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { flushPersist } from '../lib/persist'
import { useApp } from '../store/useApp'

export function Pazienti() {
  const patients = useApp((s) => s.patients)
  const patient = useApp((s) => s.patient)
  const patch = useApp((s) => s.patchPatient)
  const upsert = useApp((s) => s.upsertPatient)
  const select = useApp((s) => s.selectPatient)
  const add = useApp((s) => s.addPatient)
  const dup = useApp((s) => s.duplicatePatient)
  const del = useApp((s) => s.deletePatient)
  const [creating, setCreating] = useState(false)
  const [alias, setAlias] = useState('')
  const [pendingDelete, setPendingDelete] = useState(false)

  const create = () => {
    const name = alias.trim()
    if (!name) return
    add(name)
    flushPersist()
    setAlias('')
    setCreating(false)
  }

  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2', maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600, margin: 0 }}>Profili locali</h1>
          <p className="hair" style={{ marginTop: 6, marginBottom: 0 }}>
            Alias, non una cartella clinica. Tutto resta sul computer.
          </p>
        </div>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setAlias('')
            setCreating(true)
          }}
        >
          Nuovo profilo
        </button>
      </div>

      <div className="profile-list">
        {patients.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`profile-card ${p.id === patient.id ? 'on' : ''}`}
            onClick={() => {
              select(p.id)
              setPendingDelete(false)
            }}
          >
            <strong>{p.alias}</strong>
            <span className="hair">
              {p.sex === 'male' ? 'Maschile' : 'Femminile'} · {p.weightKg} kg
              {p.shbgNmol != null ? ` · SHBG ${p.shbgNmol}` : ''}
            </span>
          </button>
        ))}
      </div>

      {creating ? (
        <form
          className="profile-create"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <label className="field">
            Alias del nuovo profilo
            <input
              autoFocus
              value={alias}
              placeholder="Es. Atleta 90 kg"
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setCreating(false)
              }}
            />
          </label>
          <p className="hair" style={{ marginTop: 0 }}>
            Parte dai valori del profilo aperto (peso, SHBG, albumina). Poi li puoi cambiare.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="primary" disabled={!alias.trim()}>
              Crea
            </button>
            <button type="button" className="ghost" onClick={() => setCreating(false)}>
              Annulla
            </button>
          </div>
        </form>
      ) : null}

      <h2 className="profile-editor-title">Profilo aperto</h2>
      <div className="field">
        <label>Alias</label>
        <input aria-label="Alias profilo" maxLength={80} value={patient.alias} onChange={(e) => patch({ alias: e.target.value })} />
      </div>
      <div className="field">
        <label>Sesso (finestre default)</label>
        <select aria-label="Sesso" value={patient.sex} onChange={(e) => patch({ sex: e.target.value as 'male' | 'female' })}>
          <option value="male">Maschile</option>
          <option value="female">Femminile</option>
        </select>
      </div>
      <div className="field">
        <label>Peso (kg) — scala il Vd</label>
        <input
          type="number"
          aria-label="Peso in kg"
          min={30}
          max={300}
          value={patient.weightKg}
          onChange={(e) => patch({ weightKg: Number(e.target.value) })}
        />
      </div>
      <div className="field">
        <label>SHBG (nmol/L) — per T libero Vermeulen</label>
        <input
          type="number"
          aria-label="SHBG"
          min={0.1}
          max={500}
          value={patient.shbgNmol ?? ''}
          onChange={(e) =>
            patch({ shbgNmol: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
      </div>
      <div className="field">
        <label>Albumina (g/dL)</label>
        <input
          type="number"
          aria-label="Albumina"
          min={1}
          max={7}
          step="0.1"
          value={patient.albuminGdl ?? 4.3}
          onChange={(e) => patch({ albuminGdl: Number(e.target.value) })}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="primary"
          onClick={() => {
            upsert(patient)
            flushPersist()
          }}
        >
          Salva profilo
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            dup(patient.id)
            flushPersist()
          }}
        >
          <Copy size={14} /> Duplica
        </button>
        {pendingDelete ? (
          <span className="file-row-confirm">
            Eliminare {patient.alias}?
            <button
              type="button"
              className="ghost"
              onClick={() => {
                del(patient.id)
                flushPersist()
                setPendingDelete(false)
              }}
            >
              Sì
            </button>
            <button type="button" className="ghost" onClick={() => setPendingDelete(false)}>
              No
            </button>
          </span>
        ) : (
          <button type="button" className="ghost" onClick={() => setPendingDelete(true)}>
            <Trash2 size={14} /> Elimina
          </button>
        )}
      </div>
    </section>
  )
}
