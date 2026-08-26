import type { Compound, Formulation } from '../types'
import { COMPOUNDS } from './compounds'
import { FORMULATIONS } from './formulations'

export { COMPOUNDS } from './compounds'
export { FORMULATIONS } from './formulations'
export { FREQUENCIES, getFrequency } from './frequencies'
export { CLUSTER_COLOR, CLUSTER_LABEL, CLUSTER_ORDER } from './clusters'
export { PRESETS } from './presets'
export type { Preset } from './presets'

const F_BY_ID = new Map(FORMULATIONS.map((f) => [f.id, f]))
const C_BY_ID = new Map(COMPOUNDS.map((c) => [c.id, c]))

export function getFormulation(id: string): Formulation | undefined {
  return F_BY_ID.get(id)
}

export function getCompound(id: string): Compound | undefined {
  return C_BY_ID.get(id)
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function searchFormulations(q: string): Formulation[] {
  const tokens = norm(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
  if (!tokens.length) return FORMULATIONS
  return FORMULATIONS.filter((f) => {
    const c = C_BY_ID.get(f.compoundId)
    const blob = norm(
      [
        f.id,
        f.name,
        f.brand ?? '',
        f.analyte,
        f.analyteLabel,
        f.cluster,
        c?.inn ?? '',
        c?.classLabel ?? '',
        ...(c?.aliases ?? [])
      ].join(' ')
    )
    return tokens.every((t) => blob.includes(t))
  })
}
