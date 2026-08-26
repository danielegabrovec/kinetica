import { useState } from 'react'
import {
  FileDown,
  FilePlus,
  FolderOpen,
  Info,
  Printer,
  Save,
  ScrollText
} from 'lucide-react'
import { useApp } from '../store/useApp'

export function Toolbar() {
  const save = useApp((s) => s.saveSimulation)
  const load = useApp((s) => s.loadSimulation)
  const del = useApp((s) => s.deleteSimulation)
  const neu = useApp((s) => s.newProtocol)
  const library = useApp((s) => s.library)
  const dirty = useApp((s) => s.dirty)
  const currentName = useApp((s) => s.currentName)
  const setView = useApp((s) => s.setView)
  const [openLoad, setOpenLoad] = useState(false)

  const onSave = () => {
    const name = prompt('Nome della simulazione', currentName ?? 'Simulazione')
    if (name) save(name)
  }

  const onNew = () => {
    if (dirty && !confirm('Scartare le modifiche non salvate?')) return
    neu()
  }

  const onPrint = () => {
    if (window.kinetica) void window.kinetica.print()
    else window.print()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
      <button className="tb-btn" onClick={onNew} title="Nuovo protocollo">
        <FilePlus size={15} strokeWidth={1.7} /> Nuovo
      </button>
      <button className="tb-btn" onClick={onSave} title="Salva in locale">
        <Save size={15} strokeWidth={1.7} /> Salva
      </button>
      <button className="tb-btn" onClick={() => setOpenLoad((v) => !v)} title="Carica una simulazione">
        <FolderOpen size={15} strokeWidth={1.7} /> Carica
      </button>
      <button className="tb-btn" onClick={() => setView('report')} title="Report ed export">
        <ScrollText size={15} strokeWidth={1.7} /> Report
      </button>
      <button className="tb-btn" onClick={onPrint} title="Stampa">
        <Printer size={15} strokeWidth={1.7} /> Stampa
      </button>
      <button className="tb-btn" onClick={() => setView('report')} title="Esporta HTML / PDF / CSV">
        <FileDown size={15} strokeWidth={1.7} /> Esporta
      </button>
      <button className="tb-btn" onClick={() => setView('info')} title="Informazioni, autore e diritti">
        <Info size={15} strokeWidth={1.7} /> Info
      </button>
      {dirty ? <span className="hair">non salvato</span> : null}
      {openLoad ? (
        <div
          className="picker-pop"
          style={{ position: 'absolute', top: 40, left: 80, width: 320, zIndex: 20 }}
        >
          <div className="hair" style={{ padding: '8px 10px' }}>
            Simulazioni salvate
          </div>
          {library.length === 0 ? (
            <p style={{ padding: 12, color: '#93A0B5' }}>Nessun file. Prima Salva.</p>
          ) : (
            library.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  className="hit"
                  style={{ flex: 1 }}
                  onClick={() => {
                    load(s.id)
                    setOpenLoad(false)
                  }}
                >
                  <span>{s.name}</span>
                  <span className="hair">{new Date(s.updatedAt).toLocaleString()}</span>
                </button>
                <button className="icon-btn" title="Elimina" onClick={() => del(s.id)}>
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
