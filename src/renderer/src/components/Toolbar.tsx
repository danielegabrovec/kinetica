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

  const doSave = async () => {
    if (saveCurrent()) {
      if (await flushPersist()) flash('Salvato')
      return
    }
    openSaveAs()
  }

  const onNew = () => request(() => neu())
  const onLoad = () => request(() => openLoad())
  const onPrint = () => {
    setView('report')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal) return
      const key = e.key.toLowerCase()
      if (!(e.ctrlKey || e.metaKey)) return
      if (key === 's') {
        e.preventDefault()
        if (e.shiftKey) openSaveAs()
        else void doSave()
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
      <button className="tb-btn" aria-label="Nuovo" onClick={onNew} title="Nuovo piano (Ctrl+N)">
        <FilePlus size={15} strokeWidth={1.7} /> <span className="tb-label">Nuovo</span>
      </button>
      <button className="tb-btn" aria-label="Salva" onClick={() => void doSave()} title="Salva (Ctrl+S)">
        <Save size={15} strokeWidth={1.7} /> <span className="tb-label">Salva</span>
      </button>
      <button className="tb-btn" aria-label="Salva con nome" onClick={() => openSaveAs()} title="Salva come nuovo piano (Ctrl+Shift+S)">
        <Copy size={15} strokeWidth={1.7} /> <span className="tb-label">Salva con nome</span>
      </button>
      <button className="tb-btn" aria-label="Carica" onClick={onLoad} title="Carica un piano (Ctrl+O)">
        <FolderOpen size={15} strokeWidth={1.7} /> <span className="tb-label">Carica</span>
      </button>
      <button className="tb-btn" aria-label="Report" onClick={() => setView('report')} title="Report ed export">
        <ScrollText size={15} strokeWidth={1.7} /> <span className="tb-label">Report</span>
      </button>
      <button className="tb-btn" aria-label="Stampa" onClick={onPrint} title="Stampa">
        <Printer size={15} strokeWidth={1.7} /> <span className="tb-label">Stampa</span>
      </button>
      <button className="tb-btn" aria-label="Esporta" onClick={() => setView('report')} title="Esporta HTML / PDF / CSV">
        <FileDown size={15} strokeWidth={1.7} /> <span className="tb-label">Esporta</span>
      </button>
      <button className="tb-btn" aria-label="Info" onClick={() => setView('info')} title="Informazioni, autore e diritti">
        <Info size={15} strokeWidth={1.7} /> <span className="tb-label">Info</span>
      </button>
      {dirty ? <span className="hair">non salvato</span> : null}
      <FileModals />
    </div>
  )
}
