import { useMemo, useState, type DragEvent } from 'react'
import {
  CLUSTER_COLOR,
  CLUSTER_LABEL,
  CLUSTER_ORDER,
  searchFormulations
} from '@shared/catalog'
import type { ClusterId } from '@shared/types'
import { useApp } from '../store/useApp'

const MIME = 'text/plain'

export function dragMolecule(e: DragEvent, formulationId: string) {
  e.dataTransfer.setData(MIME, `mol:${formulationId}`)
  e.dataTransfer.effectAllowed = 'copy'
}

export function readMoleculeDrag(e: DragEvent): string | null {
  const raw = e.dataTransfer.getData(MIME) || e.dataTransfer.getData('text/plain')
  if (raw.startsWith('mol:')) return raw.slice(4)
  if (raw.startsWith('line:')) return null
  return raw || null
}

export function MoleculeLibrary() {
  const add = useApp((s) => s.addFormulation)
  const showC = useApp((s) => s.settings.showEvidenceC)
  const [q, setQ] = useState('')
  const [cluster, setCluster] = useState<ClusterId | 'all'>('all')

  const hits = useMemo(() => {
    let list = searchFormulations(q)
    if (cluster !== 'all') list = list.filter((f) => f.cluster === cluster)
    if (!showC) list = list.filter((f) => f.evidence !== 'C')
    return list
  }, [q, cluster, showC])

  return (
    <aside className="library">
      <div className="hair">Molecole</div>
      <input
        placeholder="Cerca mentre digiti…"
        value={q}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          margin: '8px 0',
          background: '#0b1220',
          border: '1px solid #243044',
          padding: '7px 8px'
        }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        <button type="button" className={`chip ${cluster === 'all' ? 'on' : ''}`} onClick={() => setCluster('all')}>
          Tutti
        </button>
        {CLUSTER_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className={`chip ${cluster === id ? 'on' : ''}`}
            onClick={() => setCluster(id)}
            title={CLUSTER_LABEL[id]}
          >
            {CLUSTER_LABEL[id].split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="hair" style={{ marginBottom: 6 }}>
        {hits.length} molecol{hits.length === 1 ? 'a' : 'e'}
      </div>
      <div className="library-list">
        {hits.map((f) => (
          <div
            key={f.id}
            className="mol-item"
            draggable
            onDragStart={(e) => dragMolecule(e, f.id)}
            onDoubleClick={() => add(f.id)}
            title="Trascina nello slot sotto il grafico, o doppio clic"
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: CLUSTER_COLOR[f.cluster],
                  flexShrink: 0
                }}
              />
              <span style={{ fontWeight: 600, fontSize: 12 }}>{f.name}</span>
            </div>
            <div className="hair" style={{ marginTop: 3, paddingLeft: 16 }}>
              {CLUSTER_LABEL[f.cluster]} · {f.evidence}
            </div>
          </div>
        ))}
        {hits.length === 0 ? <p style={{ color: '#93A0B5', padding: 8 }}>Nessun risultato.</p> : null}
      </div>
      <p className="hair" style={{ marginTop: 8 }}>
        Trascina in uno slot · doppio clic per aggiungere
      </p>
    </aside>
  )
}
