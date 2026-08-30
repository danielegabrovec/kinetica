import { describe, expect, it } from 'vitest'
import {
  PLAN_FILE_KIND,
  cloneImportedPlan,
  parsePlanFile,
  serializePlanFile,
  unusedPlanName
} from '@shared/library'
import type { ProtocolLine, SavedSimulation } from '@shared/types'

function rec(name: string, extra?: Partial<SavedSimulation>): SavedSimulation {
  const line: ProtocolLine = {
    id: 'l',
    formulationId: 'test-enanthate',
    dose: 100,
    frequencyId: 'weekly',
    durationDays: 84,
    startOffsetDays: 0,
    startHour: 8,
    enabled: true,
    simClusterId: 'c1'
  }
  return {
    id: name,
    name,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    horizonDays: 84,
    cvPercent: 30,
    lines: [line],
    simClusters: [{ id: 'c1', color: '#f00', stroke: 'solid' }],
    ...extra
  }
}

describe('library names', () => {
  it('keeps the first free name', () => {
    expect(unusedPlanName([], 'TRT')).toBe('TRT')
  })

  it('numbers a colliding name so Save As never overwrites', () => {
    expect(unusedPlanName([rec('TRT')], 'TRT')).toBe('TRT 2')
    expect(unusedPlanName([rec('TRT'), rec('TRT 2')], 'TRT')).toBe('TRT 3')
  })

  it('lets rename keep the same name (exceptId)', () => {
    expect(unusedPlanName([rec('TRT')], 'TRT', 'TRT')).toBe('TRT')
    expect(unusedPlanName([rec('TRT'), rec('altro')], 'TRT', 'TRT')).toBe('TRT')
    expect(unusedPlanName([rec('TRT'), rec('Altro')], 'Altro', 'TRT')).toBe('Altro 2')
  })
})

describe('plan file', () => {
  it('round-trips the wrapped format', () => {
    const plan = rec('TRT enantato')
    const json = serializePlanFile(plan)
    const parsed = parsePlanFile(json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file.kind).toBe(PLAN_FILE_KIND)
    expect(parsed.file.plan.name).toBe('TRT enantato')
    expect(parsed.file.plan.lines).toHaveLength(1)
  })

  it('accepts a raw SavedSimulation', () => {
    const parsed = parsePlanFile(rec('Nudo'))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file.plan.name).toBe('Nudo')
  })

  it('rejects garbage', () => {
    expect(parsePlanFile('{').ok).toBe(false)
    expect(parsePlanFile({ hello: 1 }).ok).toBe(false)
    expect(parsePlanFile(null).ok).toBe(false)
  })

  it('clones with new ids so import never collides', () => {
    const src = rec('TRT')
    const copy = cloneImportedPlan(src, [src])
    expect(copy.id).not.toBe(src.id)
    expect(copy.name).toBe('TRT 2')
    expect(copy.lines[0]!.id).not.toBe(src.lines[0]!.id)
    expect(copy.simClusters?.[0]?.id).not.toBe('c1')
    expect(copy.lines[0]!.simClusterId).toBe(copy.simClusters?.[0]?.id)
  })
})
