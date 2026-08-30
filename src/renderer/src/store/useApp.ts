import { create } from 'zustand'
import { PRESETS, getFormulation } from '@shared/catalog'
import { DEFAULT_SIM_CLUSTER_ID, nextClusterStyle, normalizeSimClusters } from '@shared/sim-cluster'
import type {
  AppSettings,
  PatientProfile,
  ProtocolLine,
  SavedSimulation,
  SimCluster
} from '@shared/types'
import {
  cloneImportedPatient,
  cloneImportedPlan,
  parsePlanFile,
  unusedLabel,
  unusedPlanName
} from '@shared/library'
import { uid } from '../lib/id'

export type ViewId =
  | 'simula'
  | 'catalogo'
  | 'confronta'
  | 'libreria'
  | 'pazienti'
  | 'teoria'
  | 'impostazioni'
  | 'info'
  | 'report'

const defaultSettings: AppSettings = {
  unitMode: 'conventional',
  theme: 'dark',
  cvPercent: 30,
  showEvidenceC: true,
  showUncertainty: true,
  showFreeHormone: false,
  showEstimatedE2: false,
  showRefMax: true,
  showRefMin: true,
  showRefAvg: true,
  overlayClusters: true,
  disclaimerAccepted: false
}

const defaultPatient = (): PatientProfile => ({
  id: 'local',
  alias: 'Profilo locale',
  sex: 'male',
  weightKg: 70,
  shbgNmol: 35,
  albuminGdl: 4.3
})

function presetLines(presetId = 'trt-enanthate-weekly', clusterId = DEFAULT_SIM_CLUSTER_ID): ProtocolLine[] {
  const p = PRESETS.find((x) => x.id === presetId) ?? PRESETS[0]
  return p.lines.map((l) => ({ ...l, id: uid(), simClusterId: clusterId }))
}

const initialLines = presetLines()

export type DraftSnapshot = {
  lines: ProtocolLine[]
  simClusters: SimCluster[]
  selectedSimClusterId: string
  horizonDays: number
  patient: PatientProfile
  settings: AppSettings
  currentName?: string | null
  currentSimId?: string | null
  dirty?: boolean
}

interface State {
  view: ViewId
  lines: ProtocolLine[]
  simClusters: SimCluster[]
  selectedLineId: string | null
  selectedSimClusterId: string
  horizonDays: number
  patient: PatientProfile
  patients: PatientProfile[]
  library: SavedSimulation[]
  settings: AppSettings
  paletteOpen: boolean
  dirty: boolean
  ready: boolean
  compareB: ProtocolLine[] | null
  currentName: string | null
  currentSimId: string | null
  setView: (v: ViewId) => void
  setPalette: (open: boolean) => void
  addFormulation: (formulationId: string, simClusterId?: string) => void
  changeFormulation: (lineId: string, formulationId: string) => void
  updateLine: (id: string, patch: Partial<ProtocolLine>) => void
  removeLine: (id: string) => void
  duplicateLine: (id: string, patch?: Partial<ProtocolLine>) => void
  moveLine: (fromId: string, beforeId: string | null, simClusterId?: string) => void
  selectLine: (id: string | null) => void
  selectSimCluster: (id: string) => void
  addSimCluster: () => void
  removeSimCluster: (id: string) => void
  patchSimCluster: (id: string, patch: Partial<SimCluster>) => void
  loadPreset: (presetId: string) => void
  newProtocol: () => void
  setHorizon: (d: number) => void
  patchPatient: (patch: Partial<PatientProfile>) => void
  patchSettings: (patch: Partial<AppSettings>) => void
  acceptDisclaimer: () => void
  saveCurrent: () => boolean
  saveAs: (name: string) => void
  renameCurrent: (name: string) => void
  renameSimulation: (id: string, name: string) => void
  duplicateSimulation: (id: string) => string | null
  loadSimulation: (id: string) => void
  deleteSimulation: (id: string) => void
  ingestPlanFile: (raw: unknown) => { ok: true; id: string } | { ok: false; error: string }
  planExport: (id?: string) => { plan: SavedSimulation; patient?: PatientProfile } | null
  upsertPatient: (p: PatientProfile) => void
  selectPatient: (id: string) => void
  addPatient: (alias: string) => void
  duplicatePatient: (id: string) => void
  deletePatient: (id: string) => void
  hydrate: (
    data: Partial<
      Pick<
        State,
        | 'library'
        | 'patients'
        | 'settings'
        | 'lines'
        | 'simClusters'
        | 'selectedSimClusterId'
        | 'horizonDays'
        | 'patient'
        | 'currentName'
        | 'currentSimId'
        | 'dirty'
      >
    >
  ) => void
  snapshot: () => {
    simulations: SavedSimulation[]
    patients: PatientProfile[]
    draft: DraftSnapshot
  }
}

function applyProtocol(
  lines: ProtocolLine[],
  clusters?: SimCluster[] | null
): { lines: ProtocolLine[]; simClusters: SimCluster[]; selectedSimClusterId: string } {
  const n = normalizeSimClusters(lines, clusters)
  return {
    ...n,
    selectedSimClusterId: n.simClusters[0]!.id
  }
}

export const useApp = create<State>((set, get) => ({
  view: 'simula',
  lines: initialLines,
  simClusters: [{ id: DEFAULT_SIM_CLUSTER_ID, ...nextClusterStyle([]) }],
  selectedLineId: initialLines[0]?.id ?? null,
  selectedSimClusterId: DEFAULT_SIM_CLUSTER_ID,
  horizonDays: 84,
  patient: defaultPatient(),
  patients: [defaultPatient()],
  library: [],
  settings: defaultSettings,
  paletteOpen: false,
  dirty: false,
  ready: false,
  compareB: null,
  currentName: 'TRT enantato 100 mg / sett',
  currentSimId: null,
  setView: (view) => set({ view }),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  addFormulation: (formulationId, simClusterId) => {
    const f = getFormulation(formulationId)
    if (!f) return
    const s = get()
    const clusterId =
      simClusterId ??
      (s.simClusters.some((c) => c.id === s.selectedSimClusterId)
        ? s.selectedSimClusterId
        : s.simClusters[0]?.id) ??
      DEFAULT_SIM_CLUSTER_ID
    const row: ProtocolLine = {
      id: uid(),
      formulationId,
      dose: f.defaultDose,
      frequencyId: f.defaultFrequencyId,
      everyNDays: f.defaultFrequencyId === 'every-n' ? 7 : undefined,
      durationDays: f.defaultDurationDays,
      startOffsetDays: 0,
      startHour: 8,
      enabled: true,
      simClusterId: clusterId
    }
    set({
      lines: [...s.lines, row],
      selectedLineId: row.id,
      selectedSimClusterId: clusterId,
      dirty: true,
      view: 'simula',
      paletteOpen: false
    })
  },
  changeFormulation: (lineId, formulationId) => {
    const f = getFormulation(formulationId)
    const line = get().lines.find((l) => l.id === lineId)
    if (!f || !line) return
    const prev = getFormulation(line.formulationId)
    const patch: Partial<ProtocolLine> = { formulationId }
    if (prev?.doseUnit !== f.doseUnit) patch.dose = f.defaultDose
    set((s) => ({
      lines: s.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
      selectedLineId: lineId,
      dirty: true
    }))
  },
  updateLine: (id, patch) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      dirty: true
    })),
  removeLine: (id) =>
    set((s) => ({
      lines: s.lines.filter((l) => l.id !== id),
      selectedLineId: s.selectedLineId === id ? null : s.selectedLineId,
      dirty: true
    })),
  duplicateLine: (id, patch) => {
    const src = get().lines.find((l) => l.id === id)
    if (!src) return
    const copy = { ...src, id: uid(), ...patch }
    set((s) => ({
      lines: [...s.lines, copy],
      selectedLineId: copy.id,
      selectedSimClusterId: copy.simClusterId ?? s.selectedSimClusterId,
      dirty: true
    }))
  },
  moveLine: (fromId, beforeId, simClusterId) => {
    const s = get()
    const from = s.lines.find((l) => l.id === fromId)
    if (!from) return
    const moved: ProtocolLine = simClusterId ? { ...from, simClusterId } : from
    const rest = s.lines.filter((l) => l.id !== fromId)
    const place = (before: string | null) => {
      if (!before) {
        const target = moved.simClusterId
        let last = -1
        for (let i = 0; i < rest.length; i++) {
          if (rest[i].simClusterId === target) last = i
        }
        if (last < 0) return [...rest, moved]
        return [...rest.slice(0, last + 1), moved, ...rest.slice(last + 1)]
      }
      const i = rest.findIndex((l) => l.id === before)
      if (i < 0) return [...rest, moved]
      return [...rest.slice(0, i), moved, ...rest.slice(i)]
    }
    set({
      lines: place(beforeId),
      selectedSimClusterId: moved.simClusterId ?? s.selectedSimClusterId,
      dirty: true
    })
  },
  selectLine: (selectedLineId) => {
    if (!selectedLineId) {
      set({ selectedLineId: null })
      return
    }
    const line = get().lines.find((l) => l.id === selectedLineId)
    set({
      selectedLineId,
      selectedSimClusterId: line?.simClusterId ?? get().selectedSimClusterId
    })
  },
  selectSimCluster: (id) => set({ selectedSimClusterId: id }),
  addSimCluster: () => {
    const id = uid()
    set((s) => ({
      simClusters: [...s.simClusters, { id, ...nextClusterStyle(s.simClusters) }],
      selectedSimClusterId: id,
      selectedLineId: null,
      dirty: true
    }))
  },
  patchSimCluster: (id, patch) =>
    set((s) => ({
      simClusters: s.simClusters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      dirty: true
    })),
  removeSimCluster: (id) => {
    const s = get()
    if (s.simClusters.length <= 1) return
    const simClusters = s.simClusters.filter((c) => c.id !== id)
    const fallback = simClusters[0]!.id
    const lines = s.lines.filter((l) => l.simClusterId !== id)
    const selectedGone = s.selectedLineId
      ? !lines.some((l) => l.id === s.selectedLineId)
      : true
    set({
      simClusters,
      lines,
      selectedSimClusterId: s.selectedSimClusterId === id ? fallback : s.selectedSimClusterId,
      selectedLineId: selectedGone ? (lines[0]?.id ?? null) : s.selectedLineId,
      dirty: true
    })
  },
  loadPreset: (presetId) => {
    const p = PRESETS.find((x) => x.id === presetId)
    if (!p) return
    const clusterId = uid()
    const lines = p.lines.map((l) => ({ ...l, id: uid(), simClusterId: clusterId }))
    set({
      lines,
      simClusters: [{ id: clusterId, ...nextClusterStyle([]) }],
      selectedSimClusterId: clusterId,
      horizonDays: p.horizonDays,
      selectedLineId: lines[0]?.id ?? null,
      dirty: true,
      view: 'simula',
      currentName: p.name,
      currentSimId: null
    })
  },
  newProtocol: () => {
    const clusterId = uid()
    set({
      lines: [],
      simClusters: [{ id: clusterId, ...nextClusterStyle([]) }],
      selectedSimClusterId: clusterId,
      selectedLineId: null,
      dirty: false,
      currentName: 'Senza titolo',
      currentSimId: null,
      view: 'simula'
    })
  },
  setHorizon: (horizonDays) => set({ horizonDays, dirty: true }),
  patchPatient: (patch) => set((s) => ({ patient: { ...s.patient, ...patch }, dirty: true })),
  patchSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  acceptDisclaimer: () => set((s) => ({ settings: { ...s.settings, disclaimerAccepted: true } })),
  saveCurrent: () => {
    const s = get()
    if (s.currentSimId && s.library.some((r) => r.id === s.currentSimId)) {
      const now = new Date().toISOString()
      const id = s.currentSimId
      set({
        library: s.library.map((rec) =>
          rec.id === id
            ? {
                ...rec,
                name: s.currentName ?? rec.name,
                updatedAt: now,
                lines: s.lines,
                simClusters: s.simClusters,
                horizonDays: s.horizonDays,
                cvPercent: s.settings.cvPercent,
                patientId: s.patient.id
              }
            : rec
        ),
        dirty: false
      })
      return true
    }
    const name = (s.currentName ?? '').trim()
    if (!name || name === 'Senza titolo') return false
    get().saveAs(name)
    return true
  },
  saveAs: (name) => {
    const s = get()
    const now = new Date().toISOString()
    const rec: SavedSimulation = {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      name: unusedPlanName(s.library, name),
      patientId: s.patient.id,
      notes: '',
      lines: s.lines,
      simClusters: s.simClusters,
      horizonDays: s.horizonDays,
      cvPercent: s.settings.cvPercent
    }
    set({
      library: [rec, ...s.library],
      dirty: false,
      currentSimId: rec.id,
      currentName: rec.name
    })
  },
  renameCurrent: (name) => {
    const trimmed = name.trim() || 'Senza titolo'
    const s = get()
    if (s.currentSimId && s.library.some((r) => r.id === s.currentSimId)) {
      const next = unusedPlanName(s.library, trimmed, s.currentSimId)
      const now = new Date().toISOString()
      const id = s.currentSimId
      set({
        currentName: next,
        library: s.library.map((rec) =>
          rec.id === id ? { ...rec, name: next, updatedAt: now } : rec
        )
      })
      return
    }
    set({ currentName: trimmed, dirty: true })
  },
  renameSimulation: (id, name) => {
    const trimmed = name.trim() || 'Senza titolo'
    set((s) => {
      if (!s.library.some((r) => r.id === id)) return s
      const next = unusedPlanName(s.library, trimmed, id)
      const now = new Date().toISOString()
      return {
        library: s.library.map((rec) =>
          rec.id === id ? { ...rec, name: next, updatedAt: now } : rec
        ),
        currentName: s.currentSimId === id ? next : s.currentName
      }
    })
  },
  duplicateSimulation: (id) => {
    const rec = get().library.find((x) => x.id === id)
    if (!rec) return null
    const now = new Date().toISOString()
    const copy: SavedSimulation = {
      ...rec,
      id: uid(),
      name: unusedPlanName(get().library, `${rec.name} (copia)`),
      createdAt: now,
      updatedAt: now
    }
    set((s) => ({ library: [copy, ...s.library] }))
    return copy.id
  },
  loadSimulation: (id) => {
    const rec = get().library.find((x) => x.id === id)
    if (!rec) return
    const applied = applyProtocol(rec.lines, rec.simClusters)
    set({
      ...applied,
      horizonDays: rec.horizonDays,
      selectedLineId: applied.lines[0]?.id ?? null,
      view: 'simula',
      dirty: false,
      currentSimId: rec.id,
      currentName: rec.name
    })
  },
  deleteSimulation: (id) =>
    set((s) => ({
      library: s.library.filter((x) => x.id !== id),
      currentSimId: s.currentSimId === id ? null : s.currentSimId
    })),
  ingestPlanFile: (raw) => {
    const parsed = parsePlanFile(raw)
    if (!parsed.ok) return parsed
    const s = get()
    const rec = cloneImportedPlan(parsed.file.plan, s.library)
    let patients = s.patients
    if (parsed.file.patient) {
      const p = cloneImportedPatient(parsed.file.patient, patients)
      patients = [...patients, p]
      rec.patientId = p.id
    }
    set({ library: [rec, ...s.library], patients })
    return { ok: true, id: rec.id }
  },
  planExport: (id) => {
    const s = get()
    if (id) {
      const rec = s.library.find((x) => x.id === id)
      if (!rec) return null
      const patient =
        (rec.patientId ? s.patients.find((p) => p.id === rec.patientId) : undefined) ??
        (rec.id === s.currentSimId ? s.patient : undefined)
      return { plan: rec, patient }
    }
    const now = new Date().toISOString()
    const existing = s.currentSimId ? s.library.find((x) => x.id === s.currentSimId) : undefined
    const plan: SavedSimulation = existing
      ? {
          ...existing,
          name: s.currentName ?? existing.name,
          updatedAt: now,
          lines: s.lines,
          simClusters: s.simClusters,
          horizonDays: s.horizonDays,
          cvPercent: s.settings.cvPercent,
          patientId: s.patient.id
        }
      : {
          id: uid(),
          createdAt: now,
          updatedAt: now,
          name: s.currentName ?? 'Senza titolo',
          patientId: s.patient.id,
          notes: '',
          lines: s.lines,
          simClusters: s.simClusters,
          horizonDays: s.horizonDays,
          cvPercent: s.settings.cvPercent
        }
    return { plan, patient: s.patient }
  },
  upsertPatient: (p) =>
    set((s) => {
      const exists = s.patients.some((x) => x.id === p.id)
      return {
        patients: exists ? s.patients.map((x) => (x.id === p.id ? p : x)) : [...s.patients, p],
        patient: s.patient.id === p.id ? p : s.patient
      }
    }),
  selectPatient: (id) => {
    const s = get()
    if (s.patient.id === id) return
    const exists = s.patients.some((x) => x.id === s.patient.id)
    const patients = exists
      ? s.patients.map((x) => (x.id === s.patient.id ? s.patient : x))
      : [...s.patients, s.patient]
    const next = patients.find((x) => x.id === id)
    if (!next) return
    set({ patients, patient: next })
  },
  addPatient: (alias) => {
    const s = get()
    const name = unusedLabel(
      s.patients.map((p) => p.alias),
      alias
    )
    const next: PatientProfile = { ...s.patient, id: uid(), alias: name }
    const exists = s.patients.some((x) => x.id === s.patient.id)
    const patients = exists
      ? s.patients.map((x) => (x.id === s.patient.id ? s.patient : x))
      : [...s.patients, s.patient]
    set({ patients: [...patients, next], patient: next })
  },
  duplicatePatient: (id) => {
    const s = get()
    const src = s.patients.find((x) => x.id === id) ?? (s.patient.id === id ? s.patient : null)
    if (!src) return
    const exists = s.patients.some((x) => x.id === s.patient.id)
    const patients = exists
      ? s.patients.map((x) => (x.id === s.patient.id ? s.patient : x))
      : [...s.patients, s.patient]
    const copy: PatientProfile = {
      ...src,
      id: uid(),
      alias: unusedLabel(
        patients.map((p) => p.alias),
        `${src.alias} (copia)`
      )
    }
    set({ patients: [...patients, copy], patient: copy })
  },
  deletePatient: (id) =>
    set((s) => {
      const rest = s.patients.filter((x) => x.id !== id)
      const patients = rest.length ? rest : [defaultPatient()]
      const patient = s.patient.id === id ? patients[0]! : s.patient
      return { patients, patient }
    }),
  hydrate: (data) =>
    set((s) => {
      const incoming = data.lines !== undefined ? data.lines : s.lines
      const applied = applyProtocol(
        incoming,
        data.simClusters !== undefined ? data.simClusters : s.simClusters
      )
      return {
        library: data.library ?? s.library,
        patients: data.patients && data.patients.length ? data.patients : s.patients,
        ...applied,
        selectedSimClusterId:
          data.selectedSimClusterId &&
          applied.simClusters.some((c) => c.id === data.selectedSimClusterId)
            ? data.selectedSimClusterId
            : applied.selectedSimClusterId,
        horizonDays: data.horizonDays ?? s.horizonDays,
        patient: data.patient ?? s.patient,
        settings: { ...s.settings, ...data.settings },
        selectedLineId: applied.lines[0]?.id ?? s.selectedLineId,
        currentName: data.currentName !== undefined ? data.currentName : s.currentName,
        currentSimId: data.currentSimId !== undefined ? data.currentSimId : s.currentSimId,
        ready: true,
        dirty: data.dirty ?? false
      }
    }),
  snapshot: () => {
    const s = get()
    return {
      simulations: s.library,
      patients: s.patients,
      draft: {
        lines: s.lines,
        simClusters: s.simClusters,
        selectedSimClusterId: s.selectedSimClusterId,
        horizonDays: s.horizonDays,
        patient: s.patient,
        settings: s.settings,
        currentName: s.currentName,
        currentSimId: s.currentSimId,
        dirty: s.dirty
      }
    }
  }
}))
