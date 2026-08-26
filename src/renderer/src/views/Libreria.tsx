import { useApp } from '../store/useApp'

export function Libreria() {
  const library = useApp((s) => s.library)
  const load = useApp((s) => s.loadSimulation)
  const del = useApp((s) => s.deleteSimulation)
  const save = useApp((s) => s.saveSimulation)

  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600 }}>Libreria locale</h1>
        <button
          className="primary"
          onClick={() => {
            const name = prompt('Nome')
            if (name) save(name)
          }}
        >
          Salva corrente
        </button>
      </div>
      <p className="hair" style={{ marginBottom: 16 }}>
        File in cartella dati utente Electron. Niente cloud.
      </p>
      {library.length === 0 ? (
        <p style={{ color: '#93A0B5' }}>Ancora vuota. Salva un protocollo dalla vista Simula.</p>
      ) : (
        library.map((s) => (
          <div key={s.id} className="line-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div className="hair">
                {new Date(s.updatedAt).toLocaleString()} · {s.lines.length} righe · {s.horizonDays} g
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ghost" onClick={() => load(s.id)}>
                Apri
              </button>
              <button className="ghost" onClick={() => del(s.id)}>
                Elimina
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  )
}
