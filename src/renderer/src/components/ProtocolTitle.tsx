import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { flushPersist } from '../lib/persist'
import { useApp } from '../store/useApp'

export function ProtocolTitle() {
  const name = useApp((s) => s.currentName)
  const dirty = useApp((s) => s.dirty)
  const rename = useApp((s) => s.renameCurrent)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    input.current?.focus()
    input.current?.select()
  }, [editing])

  const start = () => {
    setDraft(name ?? '')
    setEditing(true)
  }

  const commit = () => {
    rename(draft)
    flushPersist()
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="protocol-title-wrap">
        <div className="hair">Kinetica</div>
        <input
          ref={input}
          className="protocol-title-input"
          value={draft}
          aria-label="Nome del protocollo"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
              commit()
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="protocol-title-wrap">
      <div className="hair">Kinetica</div>
      <button type="button" className="protocol-title" onClick={start} title="Rinomina protocollo">
        <span>
          {dirty ? '• ' : ''}
          {name ?? 'Simulatore'}
        </span>
        <Pencil size={12} strokeWidth={1.8} />
      </button>
    </div>
  )
}
