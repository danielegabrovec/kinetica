import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Download, Pencil, Trash2 } from 'lucide-react'
import { getFormulation } from '@shared/catalog'
import { planClusterCount, planLineCount } from '@shared/library'
import type { SavedSimulation } from '@shared/types'
import { exportPlanToDisk } from '../lib/plan-io'
import { flushPersist } from '../lib/persist'
import { useApp } from '../store/useApp'
import { useFileUi } from '../store/useFileUi'

export function FileModals() {
  const modal = useFileUi((s) => s.modal)
  const toast = useFileUi((s) => s.toast)
  const toastKind = useFileUi((s) => s.toastKind)
  if (!modal && !toast) return null
  return createPortal(
    <>
      {modal === 'unsaved' ? <UnsavedDialog /> : null}
      {modal === 'save-as' ? <SaveAsDialog /> : null}
      {modal === 'load' ? <LoadDialog /> : null}
      {toast ? <div className={`file-toast ${toastKind === 'err' ? 'err' : ''}`}>{toast}</div> : null}
    </>,
    document.body
  )
}

function UnsavedDialog() {
  const close = useFileUi((s) => s.close)
  const then = useFileUi((s) => s.then)
  const openSaveAs = useFileUi((s) => s.openSaveAs)
  const flash = useFileUi((s) => s.flash)
  const saveCurrent = useApp((s) => s.saveCurrent)
  const name = useApp((s) => s.currentName)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const proceed = () => {
    const fn = then
    close()
    fn?.()
  }

  return (
    <div className="overlay" onClick={close}>
      <div className="file-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="unsaved-title">
        <div className="hair">Piano non salvato</div>
        <h2 id="unsaved-title" className="file-dialog-title">
          {name ?? 'Senza titolo'}
        </h2>
        <p className="file-dialog-copy">Ci sono modifiche non salvate. Vuoi salvarle prima di continuare?</p>
        <div className="file-dialog-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (saveCurrent()) {
                flushPersist()
                flash('Salvato')
                proceed()
                return
              }
              openSaveAs(then ?? undefined)
            }}
          >
            Salva
          </button>
          <button type="button" className="ghost" onClick={proceed}>
            Non salvare
          </button>
          <button type="button" className="ghost" onClick={close}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveAsDialog() {
  const close = useFileUi((s) => s.close)
  const then = useFileUi((s) => s.then)
  const flash = useFileUi((s) => s.flash)
  const library = useApp((s) => s.library)
  const currentName = useApp((s) => s.currentName)
  const saveAs = useApp((s) => s.saveAs)
  const [name, setName] = useState(currentName && currentName !== 'Senza titolo' ? currentName : '')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const commit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    saveAs(trimmed)
    flushPersist()
    flash('Salvato come nuovo piano')
    const fn = then
    close()
    fn?.()
  }

  return (
    <div className="overlay" onClick={close}>
      <div className="file-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="saveas-title">
        <div className="hair">Salva con nome</div>
        <h2 id="saveas-title" className="file-dialog-title">
          Nuovo piano nella libreria locale
        </h2>
        <p className="file-dialog-copy">
          Resta su questo computer. Non sovrascrive i piani già salvati: se il nome esiste già, viene aggiunto un numero.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            commit()
          }}
        >
          <label className="field">
            Nome
            <input
              ref={input}
              value={name}
              placeholder="Es. TRT enantato 100 / sett"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {library.length ? (
            <div className="file-dialog-hint">Piani già in libreria — clicca per riusare un nome come base</div>
          ) : null}
          <div className="file-list compact">
            {library.map((rec) => (
              <button
                key={rec.id}
                type="button"
                className="file-row"
                onClick={() => setName(rec.name)}
              >
                <span className="file-row-name">{rec.name}</span>
                <span className="hair">{when(rec.updatedAt)}</span>
              </button>
            ))}
          </div>
          <div className="file-dialog-actions">
            <button type="submit" className="primary" disabled={!name.trim()}>
              Salva
            </button>
            <button type="button" className="ghost" onClick={close}>
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LoadDialog() {
  const close = useFileUi((s) => s.close)
  const request = useFileUi((s) => s.request)
  const library = useApp((s) => s.library)
  const currentSimId = useApp((s) => s.currentSimId)
  const load = useApp((s) => s.loadSimulation)
  const del = useApp((s) => s.deleteSimulation)
  const dup = useApp((s) => s.duplicateSimulation)
  const rename = useApp((s) => s.renameSimulation)
  const exportOf = useApp((s) => s.planExport)
  const flash = useFileUi((s) => s.flash)
  const [q, setQ] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingDelete) setPendingDelete(null)
        else close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, pendingDelete])

  const hits = useMemo(() => {
    const n = q.trim().toLowerCase()
    const list = n
      ? library.filter((s) => s.name.toLowerCase().includes(n))
      : library
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [library, q])

  const open = (id: string) => {
    request(() => {
      load(id)
      close()
    })
  }

  return (
    <div className="overlay" onClick={close}>
      <div
        className="file-dialog file-dialog-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="load-title"
      >
        <div className="hair">Carica</div>
        <h2 id="load-title" className="file-dialog-title">
          Piani salvati
        </h2>
        <p className="file-dialog-copy">
          Ogni piano è indipendente. Aprirne uno non cancella gli altri. Tutto resta in locale.
        </p>
        <input
          ref={input}
          className="file-search"
          placeholder="Cerca per nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="file-list">
          {hits.length === 0 ? (
            <p className="file-empty">
              {library.length === 0
                ? 'Nessun piano in libreria. Usa Salva (il nome in alto diventa la voce in lista) o Salva con nome.'
                : 'Nessun nome corrisponde.'}
            </p>
          ) : (
            hits.map((rec) => (
              <PlanRow
                key={rec.id}
                rec={rec}
                current={rec.id === currentSimId}
                pendingDelete={pendingDelete === rec.id}
                onOpen={() => open(rec.id)}
                onRename={(name) => {
                  rename(rec.id, name)
                  flushPersist()
                }}
                onExport={async () => {
                  const payload = exportOf(rec.id)
                  if (!payload) return
                  const res = await exportPlanToDisk(payload.plan, payload.patient)
                  if (res.ok) flash('Piano esportato')
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
        <div className="file-dialog-actions">
          <button type="button" className="ghost" onClick={close}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

export function PlanRow({
  rec,
  current,
  pendingDelete,
  onOpen,
  onRename,
  onExport,
  onDuplicate,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete
}: {
  rec: SavedSimulation
  current?: boolean
  pendingDelete?: boolean
  onOpen: () => void
  onRename?: (name: string) => void
  onExport?: () => void
  onDuplicate: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  const n = planLineCount(rec)
  const k = planClusterCount(rec)
  const mols = rec.lines
    .slice(0, 3)
    .map((l) => getFormulation(l.formulationId)?.name ?? l.formulationId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(rec.name)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    input.current?.focus()
    input.current?.select()
  }, [editing])

  const commit = () => {
    const next = draft.trim()
    if (next && next !== rec.name) onRename?.(next)
    setEditing(false)
  }

  return (
    <div className={`file-row-card ${current ? 'on' : ''}`}>
      {editing ? (
        <form
          className="file-row-main"
          onSubmit={(e) => {
            e.preventDefault()
            commit()
          }}
        >
          <input
            ref={input}
            className="file-rename"
            value={draft}
            aria-label="Nome del piano"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                setDraft(rec.name)
                setEditing(false)
              }
            }}
          />
          <span className="hair">Invio per confermare · Esc per annullare</span>
        </form>
      ) : (
        <button type="button" className="file-row-main" onClick={onOpen}>
          <span className="file-row-name">
            {rec.name}
            {current ? <em>aperto</em> : null}
          </span>
          <span className="hair">
            {when(rec.updatedAt)} · {n} molecol{n === 1 ? 'a' : 'e'} · {k} cluster · {rec.horizonDays} g
          </span>
          {mols.length ? <span className="hair">{mols.join(' · ')}</span> : null}
        </button>
      )}
      {pendingDelete ? (
        <div className="file-row-confirm">
          <span>Eliminare?</span>
          <button type="button" className="ghost" onClick={onConfirmDelete}>
            Sì
          </button>
          <button type="button" className="ghost" onClick={onCancelDelete}>
            No
          </button>
        </div>
      ) : editing ? null : (
        <div className="file-row-tools">
          {onRename ? (
            <button
              type="button"
              className="icon-btn"
              title="Rinomina"
              aria-label="Rinomina"
              onClick={() => {
                setDraft(rec.name)
                setEditing(true)
              }}
            >
              <Pencil size={14} />
            </button>
          ) : null}
          {onExport ? (
            <button type="button" className="icon-btn" title="Esporta JSON" aria-label="Esporta JSON" onClick={onExport}>
              <Download size={14} />
            </button>
          ) : null}
          <button type="button" className="icon-btn" title="Duplica" aria-label="Duplica" onClick={onDuplicate}>
            <Copy size={14} />
          </button>
          <button type="button" className="icon-btn" title="Elimina" aria-label="Elimina" onClick={onAskDelete}>
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}
