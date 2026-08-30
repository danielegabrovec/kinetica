import type { ProtocolLine, SimCluster, SimStroke } from './types'

export const DEFAULT_SIM_CLUSTER_ID = 'sim-cluster-1'

export function simClusterLabel(index: number): string {
  return `Cluster ${index + 1}`
}

export const SIM_CLUSTER_COLORS = ['#D4A574', '#2DD4BF', '#E8A0B0', '#A78BFA', '#7DD3FC', '#FBBF24']

export const SIM_STROKES: SimStroke[] = ['solid', 'dashed', 'dotted']

export function simClusterColor(index: number): string {
  return SIM_CLUSTER_COLORS[index % SIM_CLUSTER_COLORS.length]!
}

export function resolveClusterStyle(c: SimCluster, index: number) {
  return {
    color: c.color ?? simClusterColor(index),
    stroke: c.stroke ?? SIM_STROKES[index % SIM_STROKES.length]!,
    lineWidth: c.lineWidth ?? 2.4
  }
}

export function nextClusterStyle(existing: SimCluster[]): Pick<SimCluster, 'color' | 'stroke' | 'lineWidth'> {
  const used = new Set(existing.map((c, i) => (c.color ?? simClusterColor(i)).toLowerCase()))
  const color =
    SIM_CLUSTER_COLORS.find((hex) => !used.has(hex.toLowerCase())) ?? simClusterColor(existing.length)
  return {
    color,
    stroke: SIM_STROKES[existing.length % SIM_STROKES.length],
    lineWidth: 2.4
  }
}

export function normalizeSimClusters(
  lines: ProtocolLine[],
  clusters?: SimCluster[] | null
): { lines: ProtocolLine[]; simClusters: SimCluster[] } {
  const fromLines = [
    ...new Set(lines.map((l) => l.simClusterId).filter((id): id is string => Boolean(id)))
  ]
  let simClusters: SimCluster[]
  if (clusters && clusters.length) {
    const known = new Set(clusters.map((c) => c.id))
    const extra: SimCluster[] = []
    for (const id of fromLines.filter((x) => !known.has(x))) {
      extra.push({ id, ...nextClusterStyle([...clusters, ...extra]) })
    }
    simClusters = [...clusters, ...extra]
  } else if (fromLines.length) {
    simClusters = []
    for (const id of fromLines) {
      simClusters.push({ id, ...nextClusterStyle(simClusters) })
    }
  } else {
    simClusters = [{ id: DEFAULT_SIM_CLUSTER_ID, ...nextClusterStyle([]) }]
  }
  const fallback = simClusters[0]!.id
  const known = new Set(simClusters.map((c) => c.id))
  return {
    simClusters,
    lines: lines.map((l) => ({
      ...l,
      simClusterId: l.simClusterId && known.has(l.simClusterId) ? l.simClusterId : fallback
    }))
  }
}
