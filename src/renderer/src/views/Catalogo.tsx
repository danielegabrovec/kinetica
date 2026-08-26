import { useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import {
  CLUSTER_LABEL,
  CLUSTER_ORDER,
  COMPOUNDS,
  FORMULATIONS,
  getFormulation
} from '@shared/catalog'
import type { ClusterId } from '@shared/types'
import { useApp } from '../store/useApp'

export function Catalogo() {
  const add = useApp((s) => s.addFormulation)
  const showC = useApp((s) => s.settings.showEvidenceC)
  const [cluster, setCluster] = useState<ClusterId | 'all'>('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(COMPOUNDS[0]?.id ?? '')

  const list = useMemo(() => {
    return COMPOUNDS.filter((c) => {
      if (cluster !== 'all' && c.cluster !== cluster) return false
      const forms = c.formulationIds.map((id) => getFormulation(id)!).filter(Boolean)
      if (!showC && forms.every((f) => f.evidence === 'C')) return false
      if (!q.trim()) return true
      const blob = [c.inn, c.classLabel, ...c.aliases, ...forms.map((f) => f.name)].join(' ').toLowerCase()
      return blob.includes(q.toLowerCase())
    })
  }, [cluster, q, showC])

  const compound = COMPOUNDS.find((c) => c.id === open) ?? list[0]

  return (
    <section className="canvas" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
      <div style={{ overflow: 'auto', borderRight: '1px solid #243044', paddingRight: 12 }}>
        <input
          placeholder="Filtra catalogo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: '100%', background: '#0b1220', border: '1px solid #243044', padding: 8, marginBottom: 8 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          <button className={`chip ${cluster === 'all' ? 'on' : ''}`} onClick={() => setCluster('all')}>
            Tutti
          </button>
          {CLUSTER_ORDER.map((id) => (
            <button key={id} className={`chip ${cluster === id ? 'on' : ''}`} onClick={() => setCluster(id)}>
              {CLUSTER_LABEL[id]}
            </button>
          ))}
        </div>
        {list.map((c) => (
          <button
            key={c.id}
            className={`line-card ${c.id === compound?.id ? 'sel' : ''}`}
            onClick={() => setOpen(c.id)}
          >
            <div>{c.inn}</div>
            <div className="hair">
              {CLUSTER_LABEL[c.cluster]} · {c.formulationIds.length} formulazioni
            </div>
          </button>
        ))}
      </div>
      {compound ? (
        <div style={{ overflow: 'auto', paddingRight: 8 }}>
          <div className="hair">{CLUSTER_LABEL[compound.cluster]}</div>
          <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600, fontSize: 32, margin: '4px 0 8px' }}>
            {compound.inn}
          </h1>
          <p className="hair">{compound.classLabel}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
            {compound.formulationIds.map((id) => {
              const f = FORMULATIONS.find((x) => x.id === id)
              if (!f) return null
              return (
                <div key={id} className="line-card" style={{ width: 'auto', minWidth: 220 }}>
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  <div className="hair" style={{ margin: '6px 0' }}>
                    t½ {f.tHalfDays} g · Tmax {f.tMaxDays} g · evidenza {f.evidence}
                  </div>
                  <button className="primary" onClick={() => add(f.id)}>
                    Simula
                  </button>
                </div>
              )
            })}
          </div>
          <div className="prose">
            <Markdown>{compound.monograph}</Markdown>
          </div>
        </div>
      ) : (
        <p style={{ color: '#93A0B5' }}>Nessuna scheda.</p>
      )}
    </section>
  )
}
