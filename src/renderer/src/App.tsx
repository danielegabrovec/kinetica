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
import { lazy, Suspense } from 'react'
import { DISCLAIMER } from '@shared/catalog/theory'
import { CommandPalette } from './components/CommandPalette'
import { ProtocolTitle } from './components/ProtocolTitle'
import { Toolbar } from './components/Toolbar'
import { useApp, type ViewId } from './store/useApp'

const Simula = lazy(() => import('./views/Simula').then((module) => ({ default: module.Simula })))
const Catalogo = lazy(() => import('./views/Catalogo').then((module) => ({ default: module.Catalogo })))
const Confronta = lazy(() => import('./views/Confronta').then((module) => ({ default: module.Confronta })))
const Libreria = lazy(() => import('./views/Libreria').then((module) => ({ default: module.Libreria })))
const Pazienti = lazy(() => import('./views/Pazienti').then((module) => ({ default: module.Pazienti })))
const Teoria = lazy(() => import('./views/Teoria').then((module) => ({ default: module.Teoria })))
const Report = lazy(() => import('./views/Report').then((module) => ({ default: module.Report })))
const Impostazioni = lazy(() => import('./views/Impostazioni').then((module) => ({ default: module.Impostazioni })))
const Informazioni = lazy(() => import('./views/Informazioni').then((module) => ({ default: module.Informazioni })))

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
        <ProtocolTitle />
        <Toolbar />
        <span style={{ flex: 1 }} />
        <span className="hair">{patient.alias}</span>
        <button className="chip" aria-label="Cambia unità" onClick={() => patch({ unitMode: unit === 'si' ? 'conventional' : 'si' })}>
          {unit === 'si' ? 'SI' : 'ng/dL'}
        </button>
      </header>
      <Suspense fallback={<div className="view-loading" role="status">Caricamento vista…</div>}>
        {view === 'simula' ? <Simula /> : null}
        {view === 'catalogo' ? <Catalogo /> : null}
        {view === 'confronta' ? <Confronta /> : null}
        {view === 'libreria' ? <Libreria /> : null}
        {view === 'pazienti' ? <Pazienti /> : null}
        {view === 'teoria' ? <Teoria /> : null}
        {view === 'report' ? <Report /> : null}
        {view === 'impostazioni' ? <Impostazioni /> : null}
        {view === 'info' ? <Informazioni /> : null}
      </Suspense>
      <CommandPalette />

      {!settings.disclaimerAccepted ? (
        <div className="overlay">
          <div className="palette" style={{ padding: 24, maxWidth: 560 }} role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
            <div className="hair">Prima di iniziare</div>
            <h2 id="disclaimer-title" style={{ fontFamily: 'Source Serif 4', margin: '8px 0 12px' }}>Simulazione, non prescrizione</h2>
            <p style={{ color: '#c5cedb', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {DISCLAIMER.replace(/\*\*/g, '')}
            </p>
            <button autoFocus className="primary" style={{ marginTop: 16 }} onClick={accept}>
              Ho capito, apri Kinetica
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
