import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CLUSTER_LABEL,
  CLUSTER_ORDER,
  FORMULATIONS,
  listFormulations
} from '@shared/catalog'
import type { ClusterId, Formulation } from '@shared/types'

export function FormulationPicker({
  value,
  onChange,
  showEvidenceC
}: {
  value: string
  onChange: (formulationId: string) => void
  showEvidenceC: boolean
}) {
  const current = FORMULATIONS.find((f) => f.id === value)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cluster, setCluster] = useState<ClusterId | 'all'>('all')
  const root = useRef<HTMLDivElement>(null)

  const hits = useMemo(
    () => listFormulations({ q, cluster, showEvidenceC: showEvidenceC }),
    [q, cluster, showEvidenceC]
  )

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (open) {
      setQ('')
      setCluster('all')
    }
  }, [open])

  return (
    <div className="field" ref={root}>
      <label>Molecola / formulazione</label>
      <button
        type="button"
        className="picker-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          {current?.name ?? 'Scegli…'}
          {current?.brand ? <em> · {current.brand}</em> : null}
        </span>
        <span className="hair">{open ? 'chiudi' : 'cambia'}</span>
      </button>
      {open ? (
        <div className="picker-pop">
          <input
            autoFocus
            placeholder="Cerca estere, brand, INN…"
            value={q}
            onChange={(e) => {
              const v = e.target.value
              setQ(v)
              if (v.trim()) setCluster('all')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[0]) {
                onChange(hits[0].id)
                setOpen(false)
              }
              if (e.key === 'Escape') setOpen(false)
            }}
          />
          <div className="picker-clusters">
            <button
              type="button"
              className={`chip ${cluster === 'all' ? 'on' : ''}`}
              onClick={() => setCluster('all')}
            >
              Tutti
            </button>
            {CLUSTER_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className={`chip ${cluster === id ? 'on' : ''}`}
                onClick={() => setCluster(id)}
              >
                {CLUSTER_LABEL[id]}
              </button>
            ))}
          </div>
          <div className="picker-list" role="listbox">
            {hits.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`hit ${f.id === value ? 'active' : ''}`}
                onClick={() => {
                  onChange(f.id)
                  setOpen(false)
                }}
              >
                <span>
                  {f.name}
                  {f.brand ? <span style={{ color: '#93A0B5' }}> · {f.brand}</span> : null}
                </span>
                <span className="hair">
                  {CLUSTER_LABEL[f.cluster]} · {routeLabel(f)} · {f.evidence}
                </span>
              </button>
            ))}
            {hits.length === 0 ? <p style={{ padding: 12, color: '#93A0B5' }}>Nessun risultato.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function routeLabel(f: Formulation): string {
  const map: Record<string, string> = {
    im: 'IM',
    sc: 'SC',
    oral: 'orale',
    td: 'transdermico',
    vaginal: 'vaginale',
    nasal: 'nasale',
    buccal: 'buccale',
    pellet: 'pellet'
  }
  return map[f.route] ?? f.route
}
