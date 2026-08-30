import { getFormulation } from './catalog'
import { getFrequency } from './catalog/frequencies'
import { createDefaultPatient, DEFAULT_APP_SETTINGS } from './defaults'
import type {
  AppSettings,
  PatientProfile,
  ProtocolLine,
  SavedSimulation,
  SimCluster,
  SimStroke
} from './types'

export const PLAN_FILE_KIND = 'kinetica-plan'
export const PLAN_FILE_VERSION = 1
export const LIBRARY_SCHEMA_VERSION = 2
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024
export const MAX_LIBRARY_BYTES = 12 * 1024 * 1024
export const MAX_HORIZON_DAYS = 730
export const MAX_PROTOCOL_LINES = 64
export const MAX_SIM_CLUSTERS = 12
export const MAX_LIBRARY_ITEMS = 500

const MAX_NAME = 120
const MAX_ALIAS = 80
const MAX_NOTES = 4_000
const MAX_ID = 128
const MAX_DOSE = 100_000
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const STROKES = new Set<SimStroke>(['solid', 'dashed', 'dotted'])

export type PlanFile = {
  kind: typeof PLAN_FILE_KIND
  version: number
  exportedAt: string
  plan: SavedSimulation
  patient?: PatientProfile
}

export type DraftPayload = {
  lines: ProtocolLine[]
  simClusters?: SimCluster[]
  selectedSimClusterId?: string
  horizonDays: number
  patient: PatientProfile
  currentName?: string | null
  currentSimId?: string | null
  dirty?: boolean
  settings: AppSettings
}

export type LibraryPayload = {
  schemaVersion: number
  simulations: SavedSimulation[]
  patients: PatientProfile[]
  draft: DraftPayload | null
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

function nid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function text(value: unknown, max: number, fallback?: string): string | null {
  if (typeof value !== 'string') return fallback ?? null
  const normalized = value.trim()
  if (!normalized || normalized.length > max) return fallback ?? null
  return normalized
}

function finite(value: unknown, min: number, max: number, fallback?: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    return fallback ?? null
  }
  return value
}

function optionalFinite(value: unknown, min: number, max: number): number | undefined | null {
  if (value == null) return undefined
  return finite(value, min, max)
}

function optionalText(value: unknown, max: number): string | undefined | null {
  if (value == null || value === '') return undefined
  return text(value, max)
}

function isoDate(value: unknown): string {
  if (typeof value === 'string' && Number.isFinite(Date.parse(value))) return value
  return new Date().toISOString()
}

function parsePatient(value: unknown): Result<PatientProfile> {
  const o = object(value)
  if (!o) return { ok: false, error: 'Profilo paziente non valido.' }
  const id = text(o.id, MAX_ID)
  const alias = text(o.alias, MAX_ALIAS)
  const sex = o.sex === 'male' || o.sex === 'female' ? o.sex : null
  const weightKg = finite(o.weightKg, 30, 300)
  const age = optionalFinite(o.age, 0, 120)
  const shbgNmol = optionalFinite(o.shbgNmol, 0.1, 500)
  const albuminGdl = optionalFinite(o.albuminGdl, 1, 7)
  const notes = optionalText(o.notes, MAX_NOTES)
  if (!id || !alias || !sex || weightKg == null || age === null || shbgNmol === null || albuminGdl === null || notes === null) {
    return { ok: false, error: 'Profilo paziente incompleto o fuori intervallo.' }
  }
  return {
    ok: true,
    value: {
      id,
      alias,
      sex,
      weightKg,
      ...(age == null ? {} : { age }),
      ...(shbgNmol == null ? {} : { shbgNmol }),
      ...(albuminGdl == null ? {} : { albuminGdl }),
      ...(notes == null ? {} : { notes })
    }
  }
}

function parseCluster(value: unknown): Result<SimCluster> {
  const o = object(value)
  if (!o) return { ok: false, error: 'Cluster non valido.' }
  const id = text(o.id, MAX_ID)
  const color = o.color == null ? undefined : typeof o.color === 'string' && HEX_COLOR.test(o.color) ? o.color : null
  const stroke = o.stroke == null ? undefined : typeof o.stroke === 'string' && STROKES.has(o.stroke as SimStroke) ? (o.stroke as SimStroke) : null
  const lineWidth = optionalFinite(o.lineWidth, 1, 6)
  if (!id || color === null || stroke === null || lineWidth === null) return { ok: false, error: 'Stile cluster non valido.' }
  return { ok: true, value: { id, ...(color ? { color } : {}), ...(stroke ? { stroke } : {}), ...(lineWidth == null ? {} : { lineWidth }) } }
}

function parseLine(value: unknown): Result<ProtocolLine> {
  const o = object(value)
  if (!o) return { ok: false, error: 'Riga protocollo non valida.' }
  const id = text(o.id, MAX_ID)
  const formulationId = text(o.formulationId, MAX_ID)
  const frequencyId = text(o.frequencyId, MAX_ID)
  const dose = finite(o.dose, 0, MAX_DOSE)
  const durationDays = finite(o.durationDays, 0.25, MAX_HORIZON_DAYS)
  const startOffsetDays = finite(o.startOffsetDays, 0, MAX_HORIZON_DAYS)
  const startHour = finite(o.startHour, 0, 23)
  const everyNDays = optionalFinite(o.everyNDays, 0.25, MAX_HORIZON_DAYS)
  const frontloadDose = optionalFinite(o.frontloadDose, 0, MAX_DOSE)
  const cvOverride = optionalFinite(o.cvOverride, 0, 100)
  const scalePercent = optionalFinite(o.scalePercent, -50, 80)
  const simClusterId = optionalText(o.simClusterId, MAX_ID)
  const weeklyDays = o.weeklyDays == null
    ? undefined
    : Array.isArray(o.weeklyDays) && o.weeklyDays.length <= 7 && o.weeklyDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      ? [...new Set(o.weeklyDays as number[])].sort((a, b) => a - b)
      : null
  if (
    !id || !formulationId || !getFormulation(formulationId) || !frequencyId ||
    (frequencyId !== 'every-n' && !getFrequency(frequencyId)) || dose == null || durationDays == null ||
    startOffsetDays == null || startHour == null || everyNDays === null || frontloadDose === null ||
    cvOverride === null || scalePercent === null || simClusterId === null || weeklyDays === null
  ) return { ok: false, error: 'Riga protocollo incompleta, sconosciuta o fuori intervallo.' }
  return {
    ok: true,
    value: {
      id, formulationId, dose, frequencyId, durationDays, startOffsetDays, startHour,
      enabled: typeof o.enabled === 'boolean' ? o.enabled : true,
      ...(everyNDays == null ? {} : { everyNDays }),
      ...(weeklyDays == null ? {} : { weeklyDays }),
      ...(frontloadDose == null ? {} : { frontloadDose }),
      ...(cvOverride == null ? {} : { cvOverride }),
      ...(scalePercent == null ? {} : { scalePercent }),
      ...(simClusterId == null ? {} : { simClusterId })
    }
  }
}

function parseSimulation(value: unknown): Result<SavedSimulation> {
  const o = object(value)
  if (!o) return { ok: false, error: 'Piano non valido.' }
  const name = text(o.name, MAX_NAME)
  if (!name || !Array.isArray(o.lines) || o.lines.length > MAX_PROTOCOL_LINES) {
    return { ok: false, error: `Il piano deve avere un nome e al massimo ${MAX_PROTOCOL_LINES} righe.` }
  }
  const lines: ProtocolLine[] = []
  for (const raw of o.lines) {
    const parsed = parseLine(raw)
    if (!parsed.ok) return parsed
    lines.push(parsed.value)
  }
  let simClusters: SimCluster[] | undefined
  if (o.simClusters != null) {
    if (!Array.isArray(o.simClusters) || o.simClusters.length > MAX_SIM_CLUSTERS) {
      return { ok: false, error: `Il piano può contenere al massimo ${MAX_SIM_CLUSTERS} cluster.` }
    }
    simClusters = []
    for (const raw of o.simClusters) {
      const parsed = parseCluster(raw)
      if (!parsed.ok) return parsed
      if (!simClusters.some((c) => c.id === parsed.value.id)) simClusters.push(parsed.value)
    }
  }
  const id = text(o.id, MAX_ID, nid())!
  const patientId = optionalText(o.patientId, MAX_ID)
  const notes = optionalText(o.notes, MAX_NOTES)
  const horizonDays = o.horizonDays == null ? 84 : finite(o.horizonDays, 1, MAX_HORIZON_DAYS)
  const cvPercent = o.cvPercent == null ? 30 : finite(o.cvPercent, 0, 100)
  if (patientId === null || notes === null || horizonDays == null || cvPercent == null) return { ok: false, error: 'Metadati del piano non validi o fuori intervallo.' }
  return {
    ok: true,
    value: {
      id, name, createdAt: isoDate(o.createdAt), updatedAt: isoDate(o.updatedAt), horizonDays, cvPercent, lines,
      ...(patientId == null ? {} : { patientId }),
      ...(simClusters?.length ? { simClusters } : {}),
      ...(notes == null ? {} : { notes })
    }
  }
}

function parseSettings(value: unknown): AppSettings {
  const o = object(value) ?? {}
  const bool = (key: keyof AppSettings) => typeof o[key] === 'boolean' ? (o[key] as boolean) : DEFAULT_APP_SETTINGS[key] as boolean
  return {
    unitMode: o.unitMode === 'si' || o.unitMode === 'conventional' ? o.unitMode : DEFAULT_APP_SETTINGS.unitMode,
    theme: o.theme === 'light' || o.theme === 'dark' ? o.theme : DEFAULT_APP_SETTINGS.theme,
    cvPercent: finite(o.cvPercent, 0, 100, DEFAULT_APP_SETTINGS.cvPercent)!,
    showEvidenceC: bool('showEvidenceC'),
    showUncertainty: bool('showUncertainty'),
    showFreeHormone: bool('showFreeHormone'),
    showEstimatedE2: bool('showEstimatedE2'),
    showRefMax: bool('showRefMax'),
    showRefMin: bool('showRefMin'),
    showRefAvg: bool('showRefAvg'),
    overlayClusters: bool('overlayClusters'),
    disclaimerAccepted: bool('disclaimerAccepted')
  }
}

function parseDraft(value: unknown): Result<DraftPayload | null> {
  if (value == null) return { ok: true, value: null }
  const o = object(value)
  if (!o || !Array.isArray(o.lines) || o.lines.length > MAX_PROTOCOL_LINES) return { ok: false, error: 'Bozza non valida.' }
  const lines: ProtocolLine[] = []
  for (const raw of o.lines) {
    const parsed = parseLine(raw)
    if (!parsed.ok) return { ok: false, error: `Bozza: ${parsed.error}` }
    lines.push(parsed.value)
  }
  let simClusters: SimCluster[] | undefined
  if (o.simClusters != null) {
    if (!Array.isArray(o.simClusters) || o.simClusters.length > MAX_SIM_CLUSTERS) return { ok: false, error: 'Cluster della bozza non validi.' }
    simClusters = []
    for (const raw of o.simClusters) {
      const parsed = parseCluster(raw)
      if (!parsed.ok) return parsed
      simClusters.push(parsed.value)
    }
  }
  const patient = parsePatient(o.patient)
  if (!patient.ok) return patient
  const selectedSimClusterId = optionalText(o.selectedSimClusterId, MAX_ID)
  const currentName = o.currentName == null ? null : text(o.currentName, MAX_NAME)
  const currentSimId = o.currentSimId == null ? null : text(o.currentSimId, MAX_ID)
  if (selectedSimClusterId === null || (currentName === null && o.currentName != null) || (currentSimId === null && o.currentSimId != null)) {
    return { ok: false, error: 'Riferimenti della bozza non validi.' }
  }
  return {
    ok: true,
    value: {
      lines,
      ...(simClusters?.length ? { simClusters } : {}),
      ...(selectedSimClusterId == null ? {} : { selectedSimClusterId }),
      horizonDays: finite(o.horizonDays, 1, MAX_HORIZON_DAYS, 84)!,
      patient: patient.value,
      currentName,
      currentSimId,
      dirty: typeof o.dirty === 'boolean' ? o.dirty : false,
      settings: parseSettings(o.settings)
    }
  }
}

export function emptyLibraryPayload(): LibraryPayload {
  return { schemaVersion: LIBRARY_SCHEMA_VERSION, simulations: [], patients: [], draft: null }
}

export function parseLibraryPayload(raw: unknown): Result<{ payload: LibraryPayload; warnings: string[] }> {
  const o = object(raw)
  if (!o) return { ok: false, error: 'Archivio locale non valido.' }
  const warnings: string[] = []
  if (
    o.schemaVersion != null &&
    (!Number.isInteger(o.schemaVersion) || (o.schemaVersion as number) < 1 || (o.schemaVersion as number) > LIBRARY_SCHEMA_VERSION)
  ) {
    return { ok: false, error: `Versione archivio non supportata: ${String(o.schemaVersion)}.` }
  }
  if (o.schemaVersion !== LIBRARY_SCHEMA_VERSION) {
    warnings.push(`Archivio aggiornato allo schema ${LIBRARY_SCHEMA_VERSION}.`)
  }
  const simulations: SavedSimulation[] = []
  const plans = Array.isArray(o.simulations) ? o.simulations.slice(0, MAX_LIBRARY_ITEMS) : []
  if (!Array.isArray(o.simulations)) warnings.push('Elenco piani mancante: è stato ripristinato vuoto.')
  if (Array.isArray(o.simulations) && o.simulations.length > MAX_LIBRARY_ITEMS) warnings.push(`Sono stati caricati solo i primi ${MAX_LIBRARY_ITEMS} piani.`)
  for (const item of plans) {
    const parsed = parseSimulation(item)
    if (parsed.ok) simulations.push(parsed.value)
    else warnings.push(`Un piano non valido è stato escluso: ${parsed.error}`)
  }
  const patients: PatientProfile[] = []
  const profiles = Array.isArray(o.patients) ? o.patients.slice(0, MAX_LIBRARY_ITEMS) : []
  if (!Array.isArray(o.patients)) warnings.push('Elenco profili mancante: è stato ripristinato vuoto.')
  if (Array.isArray(o.patients) && o.patients.length > MAX_LIBRARY_ITEMS) warnings.push(`Sono stati caricati solo i primi ${MAX_LIBRARY_ITEMS} profili.`)
  for (const item of profiles) {
    const parsed = parsePatient(item)
    if (parsed.ok && !patients.some((p) => p.id === parsed.value.id)) patients.push(parsed.value)
    else if (!parsed.ok) warnings.push(`Un profilo non valido è stato escluso: ${parsed.error}`)
  }
  const draft = parseDraft(o.draft)
  if (!draft.ok) warnings.push(`${draft.error} È stato avviato un piano nuovo.`)
  return {
    ok: true,
    value: {
      payload: {
        schemaVersion: LIBRARY_SCHEMA_VERSION,
        simulations,
        patients,
        draft: draft.ok ? draft.value : null
      },
      warnings
    }
  }
}

export function unusedLabel(existing: string[], base: string): string {
  const seed = base.trim().slice(0, MAX_NAME) || 'Senza titolo'
  const names = new Set(existing)
  if (!names.has(seed)) return seed
  for (let n = 2; n < 1000; n++) {
    const candidate = `${seed} ${n}`
    if (!names.has(candidate)) return candidate
  }
  return `${seed} ${Date.now()}`
}

export function unusedPlanName(library: SavedSimulation[], base: string, exceptId?: string): string {
  return unusedLabel(library.filter((s) => s.id !== exceptId).map((s) => s.name), base)
}

export function planLineCount(rec: SavedSimulation): number {
  return rec.lines.filter((l) => l.enabled !== false).length
}

export function planClusterCount(rec: SavedSimulation): number {
  if (rec.simClusters?.length) return rec.simClusters.length
  return new Set(rec.lines.map((l) => l.simClusterId).filter(Boolean)).size || 1
}

export function slugPlanName(name: string): string {
  const s = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return s || 'piano'
}

export function serializePlanFile(plan: SavedSimulation, patient?: PatientProfile): string {
  const payload: PlanFile = {
    kind: PLAN_FILE_KIND,
    version: PLAN_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    plan,
    ...(patient ? { patient } : {})
  }
  return JSON.stringify(payload, null, 2)
}

export function parsePlanFile(raw: unknown): { ok: true; file: PlanFile } | { ok: false; error: string } {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'Il file non è un JSON valido.' }
    }
  }
  const o = object(raw)
  if (!o) return { ok: false, error: 'File vuoto o illeggibile.' }
  let source: unknown = raw
  let exportedAt = new Date().toISOString()
  let patient: PatientProfile | undefined
  if (o.kind === PLAN_FILE_KIND) {
    if (o.version !== PLAN_FILE_VERSION) return { ok: false, error: `Versione piano non supportata: ${String(o.version)}.` }
    source = o.plan
    exportedAt = isoDate(o.exportedAt)
    if (o.patient != null) {
      const parsedPatient = parsePatient(o.patient)
      if (!parsedPatient.ok) return parsedPatient
      patient = parsedPatient.value
    }
  }
  const plan = parseSimulation(source)
  if (!plan.ok) return { ok: false, error: plan.error }
  return {
    ok: true,
    file: {
      kind: PLAN_FILE_KIND,
      version: PLAN_FILE_VERSION,
      exportedAt,
      plan: plan.value,
      ...(patient ? { patient } : {})
    }
  }
}

export function cloneImportedPlan(plan: SavedSimulation, library: SavedSimulation[]): SavedSimulation {
  const clusters: SimCluster[] = (plan.simClusters ?? []).map((c) => ({ ...c, id: nid() }))
  const idMap = new Map<string, string>()
  ;(plan.simClusters ?? []).forEach((c, i) => {
    const next = clusters[i]
    if (next) idMap.set(c.id, next.id)
  })
  const fallback = clusters[0]?.id
  const lines: ProtocolLine[] = plan.lines.map((l) => ({
    ...l,
    id: nid(),
    simClusterId: (l.simClusterId && idMap.get(l.simClusterId)) || fallback
  }))
  const now = new Date().toISOString()
  return {
    ...plan,
    id: nid(),
    name: unusedPlanName(library, plan.name),
    createdAt: now,
    updatedAt: now,
    lines,
    ...(clusters.length ? { simClusters: clusters } : { simClusters: undefined })
  }
}

export function cloneImportedPatient(patient: PatientProfile, existing: PatientProfile[]): PatientProfile {
  return {
    ...patient,
    id: nid(),
    alias: unusedLabel(existing.map((p) => p.alias), patient.alias).slice(0, MAX_ALIAS)
  }
}

export function safeLibraryFallback(): LibraryPayload {
  return {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    simulations: [],
    patients: [createDefaultPatient()],
    draft: null
  }
}
