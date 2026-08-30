import { describe, expect, it } from 'vitest'
import { overlayDeltaStats, overlayDeltas, overlayTimeGrid, subtractSeries } from '@shared/engine/overlay'
import { simulate } from '@shared/engine/simulate'
import type { AppSettings, PatientProfile, ProtocolLine } from '@shared/types'

const patient: PatientProfile = {
  id: 'p',
  alias: 'Test',
  sex: 'male',
  weightKg: 70
}

const settings: Pick<AppSettings, 'showUncertainty' | 'showFreeHormone' | 'showEstimatedE2'> = {
  showUncertainty: false,
  showFreeHormone: false,
  showEstimatedE2: false
}

function line(id: string, formulationId: string, dose: number): ProtocolLine {
  return {
    id,
    formulationId,
    dose,
    frequencyId: 'weekly',
    durationDays: 84,
    startOffsetDays: 0,
    startHour: 8,
    enabled: true
  }
}

describe('overlay delta', () => {
  it('subtractSeries is a − b at each t', () => {
    expect(subtractSeries([[0, 10], [1, 20]], [[0, 4], [1, 6]])).toEqual([
      [0, 6],
      [1, 14]
    ])
  })

  it('two testosterone protocols produce a Δ series on a common grid', () => {
    const a = simulate({
      lines: [line('a', 'test-enanthate', 100)],
      patient,
      horizonDays: 84,
      cvPercent: 0,
      settings
    })
    const b = simulate({
      lines: [line('b', 'test-enanthate', 50)],
      patient,
      horizonDays: 84,
      cvPercent: 0,
      settings
    })
    const times = overlayTimeGrid(84)
    const pairs = overlayDeltas(
      [
        { label: 'Cluster 1', result: a },
        { label: 'Cluster 2', result: b }
      ],
      times,
      'conventional'
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0]!.name).toBe('Δ (Cluster 1 − Cluster 2)')
    expect(pairs[0]!.delta.length).toBe(times.length)
    const mid = Math.floor(times.length / 2)
    expect(pairs[0]!.delta[mid]![1]).toBeGreaterThan(0)

    const stats = overlayDeltaStats(
      [
        { label: 'Cluster 1', result: a },
        { label: 'Cluster 2', result: b }
      ],
      'conventional'
    )
    expect(stats[0]!.dcavg).toBeGreaterThan(0)
    expect(stats[0]!.dcmax).toBeGreaterThan(0)
  })
})
