import { useEffect, useMemo, useState, type DragEvent } from 'react'
import {
  CLUSTER_COLOR,
  CLUSTER_LABEL,
  CLUSTER_ORDER,
  listFormulations
} from '@shared/catalog'
import type { ClusterId } from '@shared/types'
import { useApp } from '../store/useApp'

const MIME = 'text/plain'
export const MOL_MIME = 'application/x-kinetica-mol'

export function dragMolecule(e: DragEvent, formulationId: string) {
  e.dataTransfer.setData(MIME, `mol:${formulationId}`)
  e.dataTransfer.setData(MOL_MIME, formulationId)
  e.dataTransfer.effectAllowed = 'copy'
  document.body.classList.add('dragging-mol')
}

export function endMoleculeDrag() {
  document.body.classList.remove('dragging-mol')
}

export function isMoleculeDrag(e: DragEvent) {
  return e.dataTransfer.types.includes(MOL_MIME) || document.body.classList.contains('dragging-mol')
}

export function readMoleculeDrag(e: DragEvent): string | null {
  const typed = e.dataTransfer.getData(MOL_MIME)
  if (typed) return typed
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

  const hits = useMemo(
    () => listFormulations({ q, cluster, showEvidenceC: showC }),
    [q, cluster, showC]
  )

  useEffect(() => {
    const clear = () => endMoleculeDrag()
    window.addEventListener('dragend', clear)
    window.addEventListener('drop', clear)
    return () => {
      window.removeEventListener('dragend', clear)
      window.removeEventListener('drop', clear)
      endMoleculeDrag()
    }
  }, [])

  return (
    <aside className="library">
      <div className="hair">Molecole</div>
      <input
        placeholder="Cerca mentre digiti…"
        value={q}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          const v = e.target.value
          setQ(v)
          if (v.trim()) setCluster('all')
        }}
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
            role="button"
            tabIndex={0}
            aria-label={`Aggiungi ${f.name} al cluster selezionato`}
            draggable
            onDragStart={(e) => dragMolecule(e, f.id)}
            onDragEnd={endMoleculeDrag}
            onDoubleClick={() => add(f.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                add(f.id)
              }
            }}
            title="Trascina in un cluster, o doppio clic per aggiungere al cluster selezionato"
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
        Trascina in un cluster · doppio clic per aggiungere al cluster selezionato
      </p>
    </aside>
  )
}
