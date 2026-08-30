import { useApp } from '../store/useApp'
import type { AppSettings, PatientProfile, ProtocolLine, SavedSimulation, SimCluster } from '@shared/types'

const LS_KEY = 'kinetica.v1'

type Payload = {
  simulations: SavedSimulation[]
  patients: PatientProfile[]
  draft: {
    lines: ProtocolLine[]
    simClusters?: SimCluster[]
    selectedSimClusterId?: string
    horizonDays: number
    patient: PatientProfile
    currentName?: string | null
    currentSimId?: string | null
    dirty?: boolean
    settings: AppSettings
  } | null
}

async function read(): Promise<Payload | null> {
  try {
    if (window.kinetica) return (await window.kinetica.loadLibrary()) as Payload
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Payload) : null
  } catch {
    return null
  }
}

async function write(payload: Payload) {
  try {
    if (window.kinetica) {
      await window.kinetica.saveLibrary(payload)
      return
    }
    localStorage.setItem(LS_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export async function hydrateStore() {
  const data = await read()
  if (!data) {
    useApp.setState({ ready: true })
    return
  }
  useApp.getState().hydrate({
    library: data.simulations ?? [],
    patients: data.patients?.length ? data.patients : undefined,
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
}

let t: ReturnType<typeof setTimeout> | null = null

export function flushPersist() {
  if (t) {
    clearTimeout(t)
    t = null
  }
  void write(useApp.getState().snapshot())
}

export function bindAutosave() {
  return useApp.subscribe(() => {
    if (!useApp.getState().ready) return
    if (t) clearTimeout(t)
    t = setTimeout(() => {
      const snap = useApp.getState().snapshot()
      void write(snap)
    }, 400)
  })
}
