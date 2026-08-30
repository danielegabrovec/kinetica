import { LIBRARY_SCHEMA_VERSION, parseLibraryPayload, type LibraryPayload } from '@shared/library'
import { useApp } from '../store/useApp'
import { useFileUi } from '../store/useFileUi'

const LS_KEY = 'kinetica.v2'

async function read(): Promise<{ payload: LibraryPayload; warning?: string; recoveryPath?: string } | null> {
  if (window.kinetica) return window.kinetica.loadLibrary() as Promise<{ payload: LibraryPayload; warning?: string; recoveryPath?: string }>
  const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem('kinetica.v1')
  if (!raw) return null
  const parsed = parseLibraryPayload(JSON.parse(raw))
  if (!parsed.ok) throw new Error(parsed.error)
  return {
    payload: parsed.value.payload,
    ...(parsed.value.warnings.length ? { warning: parsed.value.warnings.join(' ') } : {})
  }
}

async function write(payload: LibraryPayload) {
  if (window.kinetica) {
    await window.kinetica.saveLibrary(payload)
    return
  }
  localStorage.setItem(LS_KEY, JSON.stringify(payload))
}

export async function hydrateStore() {
  try {
    const result = await read()
    if (!result) {
      useApp.setState({ ready: true })
      return
    }
    const data = result.payload
    useApp.getState().hydrate({
      library: data.simulations,
      patients: data.patients.length ? data.patients : undefined,
      lines: data.draft?.lines,
      simClusters: data.draft?.simClusters,
      selectedSimClusterId: data.draft?.selectedSimClusterId,
      horizonDays: data.draft?.horizonDays,
      patient: data.draft?.patient,
      settings: data.draft?.settings,
      currentName: data.draft?.currentName,
      currentSimId: data.draft?.currentSimId,
      dirty: data.draft?.dirty
    })
    if (result.warning) {
      const recovery = result.recoveryPath ? ' Una copia di recupero è stata conservata.' : ''
      useFileUi.getState().flash(`${result.warning}${recovery}`, 'err')
    }
  } catch (error) {
    useApp.setState({ ready: true })
    useFileUi.getState().flash(`Archivio non caricato: ${error instanceof Error ? error.message : 'errore sconosciuto'}`, 'err')
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
let lastAutosaveError = ''

export async function flushPersist(): Promise<boolean> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  try {
    await write({ ...useApp.getState().snapshot(), schemaVersion: LIBRARY_SCHEMA_VERSION })
    lastAutosaveError = ''
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'errore sconosciuto'
    useFileUi.getState().flash(`Salvataggio non riuscito: ${message}`, 'err')
    return false
  }
}

export function bindAutosave() {
  return useApp.subscribe(() => {
    if (!useApp.getState().ready) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const payload = { ...useApp.getState().snapshot(), schemaVersion: LIBRARY_SCHEMA_VERSION }
      void write(payload).then(() => {
        lastAutosaveError = ''
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'errore sconosciuto'
        if (message !== lastAutosaveError) useFileUi.getState().flash(`Autosave non riuscito: ${message}`, 'err')
        lastAutosaveError = message
      })
    }, 400)
  })
}
