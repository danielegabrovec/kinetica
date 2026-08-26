import { useApp } from '../store/useApp'

export function Impostazioni() {
  const s = useApp((x) => x.settings)
  const patch = useApp((x) => x.patchSettings)
  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2', maxWidth: 560 }}>
      <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600 }}>Impostazioni</h1>
      <div className="field" style={{ marginTop: 16 }}>
        <label>Unità</label>
        <select value={s.unitMode} onChange={(e) => patch({ unitMode: e.target.value as 'si' | 'conventional' })}>
          <option value="conventional">Convenzionali (ng/dL, pg/mL)</option>
          <option value="si">SI (nmol/L, pmol/L)</option>
        </select>
      </div>
      <div className="field">
        <label>Incertezza CV%</label>
        <input
          type="number"
          min={0}
          max={80}
          value={s.cvPercent}
          onChange={(e) => patch({ cvPercent: Number(e.target.value) })}
        />
      </div>
      <label className="hair" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type="checkbox" checked={s.showUncertainty} onChange={(e) => patch({ showUncertainty: e.target.checked })} />
        Mostra banda di incertezza
      </label>
      <label className="hair" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type="checkbox" checked={s.showFreeHormone} onChange={(e) => patch({ showFreeHormone: e.target.checked })} />
        Testosterone libero (Vermeulen, serve SHBG)
      </label>
      <label className="hair" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type="checkbox" checked={s.showEstimatedE2} onChange={(e) => patch({ showEstimatedE2: e.target.checked })} />
        E2 stimato da T (frazione fissa, grezzo)
      </label>
      <label className="hair" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type="checkbox" checked={s.showEvidenceC} onChange={(e) => patch({ showEvidenceC: e.target.checked })} />
        Mostra evidenza C (research / PK stimata)
      </label>
      <p className="hair" style={{ marginTop: 28 }}>
        Kinetica · © 2026 Daniele Gabrovec ·{' '}
        <button type="button" className="ghost" onClick={() => useApp.getState().setView('info')}>
          Informazioni e diritti
        </button>
      </p>
    </section>
  )
}
