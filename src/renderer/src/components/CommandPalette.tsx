import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CLUSTER_LABEL, CLUSTER_ORDER, searchFormulations } from '@shared/catalog'
import type { ClusterId } from '@shared/types'
import { useApp } from '../store/useApp'

export function CommandPalette() {
  const open = useApp((s) => s.paletteOpen)
  const setPalette = useApp((s) => s.setPalette)
  const add = useApp((s) => s.addFormulation)
  const showC = useApp((s) => s.settings.showEvidenceC)
  const [q, setQ] = useState('')
  const [cluster, setCluster] = useState<ClusterId | 'all'>('all')
  const [idx, setIdx] = useState(0)

  const hits = useMemo(() => {
    let list = searchFormulations(q)
    if (cluster !== 'all') list = list.filter((f) => f.cluster === cluster)
    if (!showC) list = list.filter((f) => f.evidence !== 'C')
    return list.slice(0, 40)
  }, [q, cluster, showC])

  useEffect(() => setIdx(0), [q, cluster, open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(!useApp.getState().paletteOpen)
      }
      if (!useApp.getState().paletteOpen) return
      if (e.key === 'Escape') setPalette(false)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIdx((i) => Math.min(i + 1, hits.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIdx((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && hits[idx]) add(hits[idx].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [add, hits, idx, setPalette])

  if (!open) return null

  return createPortal(
    <div className="overlay" onClick={() => setPalette(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Cerca composto, estere, brand…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 12px' }}>
          <button className={`chip ${cluster === 'all' ? 'on' : ''}`} onClick={() => setCluster('all')}>
            Tutti
          </button>
          {CLUSTER_ORDER.map((id) => (
            <button key={id} className={`chip ${cluster === id ? 'on' : ''}`} onClick={() => setCluster(id)}>
              {CLUSTER_LABEL[id]}
            </button>
          ))}
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {hits.map((f, i) => (
            <button
              key={f.id}
              className={`hit ${i === idx ? 'active' : ''}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => add(f.id)}
            >
              <span>
                {f.name}
                {f.brand ? <span style={{ color: '#93A0B5' }}> · {f.brand}</span> : null}
              </span>
              <span className="hair">
                {CLUSTER_LABEL[f.cluster]} · {f.evidence}
                {f.regulatory === 'research' ? ' · research' : ''}
              </span>
            </button>
          ))}
          {hits.length === 0 ? (
            <p style={{ padding: 16, color: '#93A0B5' }}>Nessun composto. Prova un altro cluster.</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
