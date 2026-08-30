import { create } from 'zustand'
import { PRESETS, getFormulation } from '@shared/catalog'
import { createDefaultPatient, DEFAULT_APP_SETTINGS } from '@shared/defaults'
import { MAX_HORIZON_DAYS, MAX_PROTOCOL_LINES, MAX_SIM_CLUSTERS } from '@shared/library'
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

function clamp(value: number, min: number, max: number, fallback = min): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function normalizeLinePatch(patch: Partial<ProtocolLine>): Partial<ProtocolLine> {
  const next = { ...patch }
  if (next.dose != null) next.dose = clamp(next.dose, 0, 100_000, 0)
  if (next.durationDays != null) next.durationDays = clamp(next.durationDays, 0.25, MAX_HORIZON_DAYS, 0.25)
  if (next.startOffsetDays != null) next.startOffsetDays = clamp(next.startOffsetDays, 0, MAX_HORIZON_DAYS, 0)
  if (next.startHour != null) next.startHour = clamp(next.startHour, 0, 23, 0)
  if (next.everyNDays != null) next.everyNDays = clamp(next.everyNDays, 0.25, MAX_HORIZON_DAYS, 1)
  if (next.frontloadDose != null) next.frontloadDose = clamp(next.frontloadDose, 0, 100_000, 0)
  if (next.cvOverride != null) next.cvOverride = clamp(next.cvOverride, 0, 100, 0)
  if (next.scalePercent != null) next.scalePercent = clamp(next.scalePercent, -50, 80, 0)
  if (next.weeklyDays) next.weeklyDays = [...new Set(next.weeklyDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
  return next
}

function normalizePatientPatch(patch: Partial<PatientProfile>): Partial<PatientProfile> {
  const next = { ...patch }
  if (next.alias != null) next.alias = next.alias.slice(0, 80)
  if (next.weightKg != null) next.weightKg = clamp(next.weightKg, 30, 300, 70)
  if (next.age != null) next.age = clamp(next.age, 0, 120, 0)
  if (next.shbgNmol != null) next.shbgNmol = clamp(next.shbgNmol, 0.1, 500, 35)
  if (next.albuminGdl != null) next.albuminGdl = clamp(next.albuminGdl, 1, 7, 4.3)
  if (next.notes != null) next.notes = next.notes.slice(0, 4_000)
  return next
}

function upsertProfile(list: PatientProfile[], patient: PatientProfile): PatientProfile[] {
  return list.some((p) => p.id === patient.id)
    ? list.map((p) => p.id === patient.id ? patient : p)
    : [...list, patient]
}

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
  patient: createDefaultPatient(),
  patients: [createDefaultPatient()],
  library: [],
  settings: DEFAULT_APP_SETTINGS,
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
    if (!f || get().lines.length >= MAX_PROTOCOL_LINES) return
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
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...normalizeLinePatch(patch) } : l)),
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
    if (!src || get().lines.length >= MAX_PROTOCOL_LINES) return
    const copy = { ...src, id: uid(), ...normalizeLinePatch(patch ?? {}) }
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
    if (get().simClusters.length >= MAX_SIM_CLUSTERS) return
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
  setHorizon: (horizonDays) => set({ horizonDays: clamp(horizonDays, 1, MAX_HORIZON_DAYS, 84), dirty: true }),
  patchPatient: (patch) => set((s) => ({ patient: { ...s.patient, ...normalizePatientPatch(patch) }, dirty: true })),
  patchSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch, ...(patch.cvPercent == null ? {} : { cvPercent: clamp(patch.cvPercent, 0, 100, 30) }) } })),
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
        patients: upsertProfile(s.patients, s.patient),
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
      patients: upsertProfile(s.patients, s.patient),
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
    const state = get()
    const rec = state.library.find((x) => x.id === id)
    if (!rec) return
    const applied = applyProtocol(rec.lines, rec.simClusters)
    const patient = rec.patientId ? state.patients.find((p) => p.id === rec.patientId) : undefined
    set({
      ...applied,
      horizonDays: rec.horizonDays,
      ...(patient ? { patient } : {}),
      settings: { ...state.settings, cvPercent: rec.cvPercent },
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
      const patients = rest.length ? rest : [createDefaultPatient()]
      const patient = s.patient.id === id ? patients[0]! : s.patient
      return {
        patients,
        patient,
        library: s.library.map((rec) => rec.patientId === id ? { ...rec, patientId: undefined } : rec)
      }
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
