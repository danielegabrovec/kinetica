import { uid } from '../lib/id'
import { useApp } from '../store/useApp'

export function Pazienti() {
  const patients = useApp((s) => s.patients)
  const patient = useApp((s) => s.patient)
  const patch = useApp((s) => s.patchPatient)
  const upsert = useApp((s) => s.upsertPatient)
  const del = useApp((s) => s.deletePatient)

  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2', maxWidth: 720 }}>
      <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600 }}>Profili locali</h1>
      <p className="hair" style={{ marginBottom: 16 }}>
        Alias, non una cartella clinica. Tutto resta sul computer.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {patients.map((p) => (
          <button
            key={p.id}
            className={`chip ${p.id === patient.id ? 'on' : ''}`}
            onClick={() => patch({ ...p })}
          >
            {p.alias}
          </button>
        ))}
        <button
          className="ghost"
          onClick={() => {
            const alias = prompt('Alias')
            if (!alias) return
            const p = { ...patient, id: uid(), alias }
            upsert(p)
            patch(p)
          }}
        >
          Nuovo
        </button>
      </div>
      <div className="field">
        <label>Alias</label>
        <input value={patient.alias} onChange={(e) => patch({ alias: e.target.value })} />
      </div>
      <div className="field">
        <label>Sesso (finestre default)</label>
        <select value={patient.sex} onChange={(e) => patch({ sex: e.target.value as 'male' | 'female' })}>
          <option value="male">Maschile</option>
          <option value="female">Femminile</option>
        </select>
      </div>
      <div className="field">
        <label>Peso (kg) — scala il Vd</label>
        <input
          type="number"
          value={patient.weightKg}
          onChange={(e) => patch({ weightKg: Number(e.target.value) })}
        />
      </div>
      <div className="field">
        <label>SHBG (nmol/L) — per T libero Vermeulen</label>
        <input
          type="number"
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
          step="0.1"
          value={patient.albuminGdl ?? 4.3}
          onChange={(e) => patch({ albuminGdl: Number(e.target.value) })}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="primary" onClick={() => upsert(patient)}>
          Salva profilo
        </button>
        {patient.id !== 'local' ? (
          <button className="ghost" onClick={() => del(patient.id)}>
            Elimina
          </button>
        ) : null}
      </div>
    </section>
  )
}
