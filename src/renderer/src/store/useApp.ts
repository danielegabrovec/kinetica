import { create } from 'zustand'
import { PRESETS, getFormulation } from '@shared/catalog'
import type {
  AppSettings,
  PatientProfile,
  ProtocolLine,
  SavedSimulation
} from '@shared/types'
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

function presetLines(presetId = 'trt-enanthate-weekly'): ProtocolLine[] {
  const p = PRESETS.find((x) => x.id === presetId) ?? PRESETS[0]
  return p.lines.map((l) => ({ ...l, id: uid() }))
}

const initialLines = presetLines()

interface State {
  view: ViewId
  lines: ProtocolLine[]
  selectedLineId: string | null
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
  addFormulation: (formulationId: string) => void
  changeFormulation: (lineId: string, formulationId: string) => void
  updateLine: (id: string, patch: Partial<ProtocolLine>) => void
  removeLine: (id: string) => void
  duplicateLine: (id: string, patch?: Partial<ProtocolLine>) => void
  moveLine: (fromId: string, beforeId: string | null) => void
  selectLine: (id: string | null) => void
  loadPreset: (presetId: string) => void
  newProtocol: () => void
  setHorizon: (d: number) => void
  patchPatient: (patch: Partial<PatientProfile>) => void
  patchSettings: (patch: Partial<AppSettings>) => void
  acceptDisclaimer: () => void
  saveSimulation: (name: string) => void
  loadSimulation: (id: string) => void
  deleteSimulation: (id: string) => void
  upsertPatient: (p: PatientProfile) => void
  deletePatient: (id: string) => void
  hydrate: (data: Partial<Pick<State, 'library' | 'patients' | 'settings' | 'lines' | 'horizonDays' | 'patient'>>) => void
  snapshot: () => {
    simulations: SavedSimulation[]
    patients: PatientProfile[]
    draft: {
      lines: ProtocolLine[]
      horizonDays: number
      patient: PatientProfile
      settings: AppSettings
    }
  }
}

export const useApp = create<State>((set, get) => ({
  view: 'simula',
  lines: initialLines,
  selectedLineId: initialLines[0]?.id ?? null,
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
  addFormulation: (formulationId) => {
    const f = getFormulation(formulationId)
    if (!f) return
    const row: ProtocolLine = {
      id: uid(),
      formulationId,
      dose: f.defaultDose,
      frequencyId: f.defaultFrequencyId,
      everyNDays: f.defaultFrequencyId === 'every-n' ? 7 : undefined,
      durationDays: f.defaultDurationDays,
      startOffsetDays: 0,
      startHour: 8,
      enabled: true
    }
    set((s) => ({
      lines: [...s.lines, row],
      selectedLineId: row.id,
      dirty: true,
      view: 'simula',
      paletteOpen: false
    }))
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
    set((s) => ({ lines: [...s.lines, copy], selectedLineId: copy.id, dirty: true }))
  },
  moveLine: (fromId, beforeId) => {
    const s = get()
    const from = s.lines.find((l) => l.id === fromId)
    if (!from) return
    const rest = s.lines.filter((l) => l.id !== fromId)
    if (!beforeId) {
      set({ lines: [...rest, from], dirty: true })
      return
    }
    const i = rest.findIndex((l) => l.id === beforeId)
    if (i < 0) {
      set({ lines: [...rest, from], dirty: true })
      return
    }
    const next = [...rest.slice(0, i), from, ...rest.slice(i)]
    set({ lines: next, dirty: true })
  },
  selectLine: (selectedLineId) => set({ selectedLineId }),
  loadPreset: (presetId) => {
    const p = PRESETS.find((x) => x.id === presetId)
    if (!p) return
    const lines = p.lines.map((l) => ({ ...l, id: uid() }))
    set({
      lines,
      horizonDays: p.horizonDays,
      selectedLineId: lines[0]?.id ?? null,
      dirty: true,
      view: 'simula',
      currentName: p.name,
      currentSimId: null
    })
  },
  newProtocol: () =>
    set({
      lines: [],
      selectedLineId: null,
      dirty: false,
      currentName: 'Senza titolo',
      currentSimId: null,
      view: 'simula'
    }),
  setHorizon: (horizonDays) => set({ horizonDays, dirty: true }),
  patchPatient: (patch) => set((s) => ({ patient: { ...s.patient, ...patch }, dirty: true })),
  patchSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  acceptDisclaimer: () => set((s) => ({ settings: { ...s.settings, disclaimerAccepted: true } })),
  saveSimulation: (name) => {
    const s = get()
    const now = new Date().toISOString()
    if (s.currentSimId) {
      set({
        library: s.library.map((rec) =>
          rec.id === s.currentSimId
            ? { ...rec, name, updatedAt: now, lines: s.lines, horizonDays: s.horizonDays, cvPercent: s.settings.cvPercent }
            : rec
        ),
        currentName: name,
        dirty: false
      })
      return
    }
    const rec: SavedSimulation = {
      id: uid(),
      name,
      createdAt: now,
      updatedAt: now,
      patientId: s.patient.id,
      horizonDays: s.horizonDays,
      cvPercent: s.settings.cvPercent,
      lines: s.lines,
      notes: ''
    }
    set({ library: [rec, ...s.library], dirty: false, currentSimId: rec.id, currentName: name })
  },
  loadSimulation: (id) => {
    const rec = get().library.find((x) => x.id === id)
    if (!rec) return
    set({
      lines: rec.lines,
      horizonDays: rec.horizonDays,
      selectedLineId: rec.lines[0]?.id ?? null,
      view: 'simula',
      dirty: false,
      currentSimId: rec.id,
      currentName: rec.name
    })
  },
  deleteSimulation: (id) => set((s) => ({ library: s.library.filter((x) => x.id !== id) })),
  upsertPatient: (p) =>
    set((s) => {
      const exists = s.patients.some((x) => x.id === p.id)
      return {
        patients: exists ? s.patients.map((x) => (x.id === p.id ? p : x)) : [...s.patients, p],
        patient: s.patient.id === p.id ? p : s.patient
      }
    }),
  deletePatient: (id) =>
    set((s) => ({ patients: s.patients.filter((x) => x.id !== id) })),
  hydrate: (data) =>
    set((s) => ({
      library: data.library ?? s.library,
      patients: data.patients && data.patients.length ? data.patients : s.patients,
      lines: data.lines && data.lines.length ? data.lines : s.lines,
      horizonDays: data.horizonDays ?? s.horizonDays,
      patient: data.patient ?? s.patient,
      settings: { ...s.settings, ...data.settings },
      ready: true,
      dirty: false
    })),
  snapshot: () => {
    const s = get()
    return {
      simulations: s.library,
      patients: s.patients,
      draft: {
        lines: s.lines,
        horizonDays: s.horizonDays,
        patient: s.patient,
        settings: s.settings
      }
    }
  }
}))
