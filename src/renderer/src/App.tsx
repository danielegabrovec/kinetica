import {
  Activity,
  BookOpen,
  FileText,
  Folder,
  GitCompare,
  Info,
  LayoutGrid,
  Settings,
  Users
} from 'lucide-react'
import { DISCLAIMER } from '@shared/catalog/theory'
import { CommandPalette } from './components/CommandPalette'
import { Toolbar } from './components/Toolbar'
import { useApp, type ViewId } from './store/useApp'
import { Catalogo } from './views/Catalogo'
import { Confronta } from './views/Confronta'
import { Impostazioni } from './views/Impostazioni'
import { Informazioni } from './views/Informazioni'
import { Libreria } from './views/Libreria'
import { Pazienti } from './views/Pazienti'
import { Report } from './views/Report'
import { Simula } from './views/Simula'
import { Teoria } from './views/Teoria'

const NAV: { id: ViewId; label: string; icon: typeof Activity }[] = [
  { id: 'simula', label: 'Simula', icon: Activity },
  { id: 'catalogo', label: 'Catalogo', icon: LayoutGrid },
  { id: 'confronta', label: 'Confronta', icon: GitCompare },
  { id: 'libreria', label: 'File', icon: Folder },
  { id: 'pazienti', label: 'Profili', icon: Users },
  { id: 'teoria', label: 'Teoria', icon: BookOpen },
  { id: 'report', label: 'Report', icon: FileText },
  { id: 'impostazioni', label: 'Opzioni', icon: Settings },
  { id: 'info', label: 'Info', icon: Info }
]

export function App() {
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  const settings = useApp((s) => s.settings)
  const accept = useApp((s) => s.acceptDisclaimer)
  const unit = useApp((s) => s.settings.unitMode)
  const patch = useApp((s) => s.patchSettings)
  const patient = useApp((s) => s.patient)
  const currentName = useApp((s) => s.currentName)
  const editor = view === 'simula'
  const gridClass = editor ? 'app-grid editor' : 'app-grid wide'

  return (
    <div className={gridClass}>
      <nav className="rail" aria-label="Sezioni">
        <button
          type="button"
          className="brand-mark"
          title="Informazioni su Kinetica"
          onClick={() => setView('info')}
        >
          KN
        </button>
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`rail-btn ${view === item.id ? 'active' : ''}`}
              title={item.label}
              aria-label={item.label}
              onClick={() => setView(item.id)}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <header className="topbar">
        <div style={{ minWidth: 140 }}>
          <div className="hair">Kinetica</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{currentName ?? 'Simulatore'}</div>
        </div>
        <Toolbar />
        <span style={{ flex: 1 }} />
        <span className="hair">{patient.alias}</span>
        <button className="chip" onClick={() => patch({ unitMode: unit === 'si' ? 'conventional' : 'si' })}>
          {unit === 'si' ? 'SI' : 'ng/dL'}
        </button>
      </header>
      {view === 'simula' ? <Simula /> : null}
      {view === 'catalogo' ? <Catalogo /> : null}
      {view === 'confronta' ? <Confronta /> : null}
      {view === 'libreria' ? <Libreria /> : null}
      {view === 'pazienti' ? <Pazienti /> : null}
      {view === 'teoria' ? <Teoria /> : null}
      {view === 'report' ? <Report /> : null}
      {view === 'impostazioni' ? <Impostazioni /> : null}
      {view === 'info' ? <Informazioni /> : null}
      <CommandPalette />

      {!settings.disclaimerAccepted ? (
        <div className="overlay">
          <div className="palette" style={{ padding: 24, maxWidth: 560 }}>
            <div className="hair">Prima di iniziare</div>
            <h2 style={{ fontFamily: 'Source Serif 4', margin: '8px 0 12px' }}>Simulazione, non prescrizione</h2>
            <p style={{ color: '#c5cedb', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {DISCLAIMER.replace(/\*\*/g, '')}
            </p>
            <button className="primary" style={{ marginTop: 16 }} onClick={accept}>
              Ho capito, apri Kinetica
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
