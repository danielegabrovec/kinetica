import { useEffect } from 'react'
import {
  Copy,
  FileDown,
  FilePlus,
  FolderOpen,
  Info,
  Printer,
  Save,
  ScrollText
} from 'lucide-react'
import { FileModals } from './FileDialog'
import { flushPersist } from '../lib/persist'
import { useApp } from '../store/useApp'
import { useFileUi } from '../store/useFileUi'

export function Toolbar() {
  const neu = useApp((s) => s.newProtocol)
  const saveCurrent = useApp((s) => s.saveCurrent)
  const dirty = useApp((s) => s.dirty)
  const setView = useApp((s) => s.setView)
  const openSaveAs = useFileUi((s) => s.openSaveAs)
  const openLoad = useFileUi((s) => s.openLoad)
  const request = useFileUi((s) => s.request)
  const flash = useFileUi((s) => s.flash)
  const modal = useFileUi((s) => s.modal)

  const doSave = () => {
    if (saveCurrent()) {
      flushPersist()
      flash('Salvato')
      return
    }
    openSaveAs()
  }

  const onNew = () => request(() => neu())
  const onLoad = () => request(() => openLoad())
  const onPrint = () => {
    if (window.kinetica) void window.kinetica.print()
    else window.print()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal) return
      const key = e.key.toLowerCase()
      if (!(e.ctrlKey || e.metaKey)) return
      if (key === 's') {
        e.preventDefault()
        if (e.shiftKey) openSaveAs()
        else doSave()
      }
      if (key === 'o') {
        e.preventDefault()
        onLoad()
      }
      if (key === 'n') {
        e.preventDefault()
        onNew()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
      <button className="tb-btn" onClick={onNew} title="Nuovo piano (Ctrl+N)">
        <FilePlus size={15} strokeWidth={1.7} /> Nuovo
      </button>
      <button className="tb-btn" onClick={doSave} title="Salva (Ctrl+S)">
        <Save size={15} strokeWidth={1.7} /> Salva
      </button>
      <button className="tb-btn" onClick={() => openSaveAs()} title="Salva come nuovo piano (Ctrl+Shift+S)">
        <Copy size={15} strokeWidth={1.7} /> Salva con nome
      </button>
      <button className="tb-btn" onClick={onLoad} title="Carica un piano (Ctrl+O)">
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
      <FileModals />
    </div>
  )
}
