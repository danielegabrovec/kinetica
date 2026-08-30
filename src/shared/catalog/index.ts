import type { ClusterId, Compound, Formulation } from '../types'
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

function scoreToken(
  t: string,
  fields: { name: string; brand: string; id: string; inn: string; aliases: string[]; extra: string }
): number {
  if (fields.name.startsWith(t) || fields.brand.startsWith(t)) return 100
  if (fields.name.includes(t) || fields.brand.includes(t)) return 80
  if (fields.id.includes(t)) return 50
  if (fields.inn.startsWith(t)) return 40
  if (fields.inn.includes(t)) return 30
  if (fields.aliases.some((a) => a === t || a.startsWith(t) || a.includes(t))) return 20
  if (fields.extra.includes(t)) return 10
  return 0
}

/** Ranked search. Product names live on formulation name/brand, not on the parent compound. */
export function searchFormulations(q: string): Formulation[] {
  const tokens = norm(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
  if (!tokens.length) return FORMULATIONS
  const scored: { f: Formulation; score: number }[] = []
  for (const f of FORMULATIONS) {
    const c = C_BY_ID.get(f.compoundId)
    const fields = {
      name: norm(f.name),
      brand: norm(f.brand ?? ''),
      id: norm(f.id.replace(/-/g, ' ')),
      inn: norm(c?.inn ?? ''),
      aliases: (c?.aliases ?? []).map(norm),
      extra: norm([f.analyte, f.analyteLabel, f.cluster, c?.classLabel ?? ''].join(' '))
    }
    let score = 0
    let ok = true
    for (const t of tokens) {
      const part = scoreToken(t, fields)
      if (part <= 0) {
        ok = false
        break
      }
      score += part
    }
    if (ok) scored.push({ f, score })
  }
  scored.sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name, 'it'))
  return scored.map((s) => s.f)
}

/**
 * Shared list for every search UI. While the query is non-empty the catalog
 * family chip is ignored so typing "sustanon" is never trapped on Testosterone.
 */
export function listFormulations(opts: {
  q?: string
  cluster?: ClusterId | 'all'
  showEvidenceC?: boolean
}): Formulation[] {
  const q = opts.q ?? ''
  const searching = q.trim().length > 0
  let list = searching ? searchFormulations(q) : FORMULATIONS
  if (!searching && opts.cluster && opts.cluster !== 'all') {
    list = list.filter((f) => f.cluster === opts.cluster)
  }
  if (opts.showEvidenceC === false) list = list.filter((f) => f.evidence !== 'C')
  return list
}
