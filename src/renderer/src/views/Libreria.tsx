import { useMemo, useState } from 'react'
import { planClusterCount, planLineCount } from '@shared/library'
import { PlanRow } from '../components/FileDialog'
import { exportPlanToDisk, pickPlanFile } from '../lib/plan-io'
import { flushPersist } from '../lib/persist'
import { useApp } from '../store/useApp'
import { useFileUi } from '../store/useFileUi'

export function Libreria() {
  const library = useApp((s) => s.library)
  const currentSimId = useApp((s) => s.currentSimId)
  const load = useApp((s) => s.loadSimulation)
  const del = useApp((s) => s.deleteSimulation)
  const dup = useApp((s) => s.duplicateSimulation)
  const rename = useApp((s) => s.renameSimulation)
  const ingest = useApp((s) => s.ingestPlanFile)
  const exportOf = useApp((s) => s.planExport)
  const request = useFileUi((s) => s.request)
  const openSaveAs = useFileUi((s) => s.openSaveAs)
  const close = useFileUi((s) => s.close)
  const flash = useFileUi((s) => s.flash)
  const [q, setQ] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const hits = useMemo(() => {
    const n = q.trim().toLowerCase()
    const list = n ? library.filter((s) => s.name.toLowerCase().includes(n)) : library
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [library, q])

  const onImport = async () => {
    try {
      const content = await pickPlanFile()
      if (!content) return
      const res = ingest(content)
      if (!res.ok) {
        flash(res.error, 'err')
        return
      }
      if (await flushPersist()) flash('Piano importato')
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Importazione non riuscita.', 'err')
    }
  }

  const onExportCurrent = async () => {
    const payload = exportOf()
    if (!payload) return
    try {
      const res = await exportPlanToDisk(payload.plan, payload.patient)
      if (res.ok) flash('Piano esportato')
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Esportazione non riuscita.', 'err')
    }
  }

  return (
    <section className="canvas" style={{ gridColumn: '2 / span 2', maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Source Serif 4', fontWeight: 600, margin: 0 }}>Piani salvati</h1>
          <p className="hair" style={{ marginTop: 6 }}>
            Libreria locale · {library.length} pian{library.length === 1 ? 'o' : 'i'} · niente cloud
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="ghost" onClick={() => void onImport()}>
            Importa
          </button>
          <button type="button" className="ghost" onClick={() => void onExportCurrent()}>
            Esporta
          </button>
          <button type="button" className="primary" onClick={() => openSaveAs()}>
            Salva con nome
          </button>
        </div>
      </div>
      <input
        className="file-search"
        placeholder="Cerca per nome…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginTop: 16 }}
      />
      <div className="file-list" style={{ marginTop: 8 }}>
        {hits.length === 0 ? (
          <p className="file-empty">
            {library.length === 0
              ? 'Nessun piano. Da Simula usa Salva (il nome in alto diventa la voce in lista) o Salva con nome.'
              : 'Nessun nome corrisponde.'}
          </p>
        ) : (
          hits.map((rec) => (
            <PlanRow
              key={rec.id}
              rec={rec}
              current={rec.id === currentSimId}
              pendingDelete={pendingDelete === rec.id}
              onOpen={() =>
                request(() => {
                  load(rec.id)
                  close()
                })
              }
              onRename={(name) => {
                rename(rec.id, name)
                flushPersist()
              }}
              onExport={() => {
                void (async () => {
                  const payload = exportOf(rec.id)
                  if (!payload) return
                  const res = await exportPlanToDisk(payload.plan, payload.patient)
                  if (res.ok) flash('Piano esportato')
                })()
              }}
              onDuplicate={() => {
                dup(rec.id)
                flushPersist()
              }}
              onAskDelete={() => setPendingDelete(rec.id)}
              onCancelDelete={() => setPendingDelete(null)}
              onConfirmDelete={() => {
                del(rec.id)
                flushPersist()
                setPendingDelete(null)
              }}
            />
          ))
        )}
      </div>
      <p className="hair" style={{ marginTop: 16 }}>
        {hits.length
          ? `${hits.reduce((n, r) => n + planLineCount(r), 0)} molecole in ${hits.reduce((n, r) => n + planClusterCount(r), 0)} cluster in questa lista.`
          : null}
      </p>
    </section>
  )
}
