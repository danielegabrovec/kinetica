import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SIM_CLUSTER_ID,
  nextClusterStyle,
  normalizeSimClusters,
  SIM_CLUSTER_COLORS,
  simClusterLabel
} from '@shared/sim-cluster'
import type { ProtocolLine } from '@shared/types'

function line(id: string, cluster?: string): ProtocolLine {
  return {
    id,
    formulationId: 'test-enanthate',
    dose: 100,
    frequencyId: 'weekly',
    durationDays: 84,
    startOffsetDays: 0,
    startHour: 8,
    enabled: true,
    simClusterId: cluster
  }
}

describe('sim clusters', () => {
  it('labels Cluster 1…n', () => {
    expect(simClusterLabel(0)).toBe('Cluster 1')
    expect(simClusterLabel(2)).toBe('Cluster 3')
  })

  it('legacy lines without id go into the default cluster', () => {
    const n = normalizeSimClusters([line('a'), line('b')])
    expect(n.simClusters.map((c) => c.id)).toEqual([DEFAULT_SIM_CLUSTER_ID])
    expect(n.lines.every((l) => l.simClusterId === DEFAULT_SIM_CLUSTER_ID)).toBe(true)
  })

  it('keeps empty extra clusters created with +', () => {
    const n = normalizeSimClusters([line('a', 'c1')], [{ id: 'c1' }, { id: 'c2' }])
    expect(n.simClusters.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(n.lines[0].simClusterId).toBe('c1')
  })

  it('does not mix two clusters into one group', () => {
    const n = normalizeSimClusters([line('a', 'c1'), line('b', 'c2')])
    expect(n.simClusters.map((c) => c.id)).toEqual(['c1', 'c2'])
  })

  it('assigns a free palette color to the next cluster', () => {
    const a = nextClusterStyle([])
    expect(a.color).toBe(SIM_CLUSTER_COLORS[0])
    const b = nextClusterStyle([{ id: 'c1', color: a.color }])
    expect(b.color).toBe(SIM_CLUSTER_COLORS[1])
    expect(b.stroke).toBe('dashed')
  })
})
