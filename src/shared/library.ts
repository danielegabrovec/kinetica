import type { PatientProfile, ProtocolLine, SavedSimulation, SimCluster } from './types'

export const PLAN_FILE_KIND = 'kinetica-plan'
export const PLAN_FILE_VERSION = 1

export type PlanFile = {
  kind: typeof PLAN_FILE_KIND
  version: number
  exportedAt: string
  plan: SavedSimulation
  patient?: PatientProfile
}

function nid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)
}

export function unusedLabel(existing: string[], base: string): string {
  const seed = base.trim() || 'Senza titolo'
  const names = new Set(existing)
  if (!names.has(seed)) return seed
  for (let n = 2; n < 1000; n++) {
    const candidate = `${seed} ${n}`
    if (!names.has(candidate)) return candidate
  }
  return `${seed} ${Date.now()}`
}

export function unusedPlanName(
  library: SavedSimulation[],
  base: string,
  exceptId?: string
): string {
  return unusedLabel(
    library.filter((s) => s.id !== exceptId).map((s) => s.name),
    base
  )
}

export function planLineCount(rec: SavedSimulation): number {
  return rec.lines.filter((l) => l.enabled !== false).length
}

export function planClusterCount(rec: SavedSimulation): number {
  if (rec.simClusters?.length) return rec.simClusters.length
  return new Set(rec.lines.map((l) => l.simClusterId).filter(Boolean)).size || 1
}

export function slugPlanName(name: string): string {
  const s = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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

function isLine(x: unknown): x is ProtocolLine {
  if (!x || typeof x !== 'object') return false
  const o = x as ProtocolLine
  return typeof o.id === 'string' && typeof o.formulationId === 'string' && typeof o.dose === 'number'
}

function isPlan(x: unknown): x is SavedSimulation {
  if (!x || typeof x !== 'object') return false
  const o = x as SavedSimulation
  return typeof o.name === 'string' && Array.isArray(o.lines) && o.lines.every(isLine)
}

export function parsePlanFile(raw: unknown): { ok: true; file: PlanFile } | { ok: false; error: string } {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'Il file non è un JSON valido.' }
    }
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'File vuoto o illeggibile.' }
  const o = raw as Record<string, unknown>
  if (o.kind === PLAN_FILE_KIND && isPlan(o.plan)) {
    return {
      ok: true,
      file: {
        kind: PLAN_FILE_KIND,
        version: typeof o.version === 'number' ? o.version : 1,
        exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : new Date().toISOString(),
        plan: o.plan,
        patient: o.patient && typeof o.patient === 'object' ? (o.patient as PatientProfile) : undefined
      }
    }
  }
  if (isPlan(raw)) {
    return {
      ok: true,
      file: {
        kind: PLAN_FILE_KIND,
        version: 1,
        exportedAt: new Date().toISOString(),
        plan: raw
      }
    }
  }
  return { ok: false, error: 'Non è un piano Kinetica (manca name/lines).' }
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
    horizonDays: plan.horizonDays ?? 84,
    cvPercent: plan.cvPercent ?? 30,
    lines,
    simClusters: clusters.length ? clusters : undefined
  }
}

export function cloneImportedPatient(
  patient: PatientProfile,
  existing: PatientProfile[]
): PatientProfile {
  return {
    ...patient,
    id: nid(),
    alias: unusedLabel(
      existing.map((p) => p.alias),
      patient.alias
    )
  }
}
