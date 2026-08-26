/**
 * Vermeulen 1999 free testosterone.
 * T and SHBG in nmol/L, albumin in g/dL (default 4.3).
 * Returns free T in nmol/L.
 */
export function vermeulenFreeT(
  totalNmol: number,
  shbgNmol: number,
  albuminGdl = 4.3
): number {
  if (totalNmol <= 0) return 0
  const Ka = 3.6e4
  const albuminMol = (albuminGdl * 10) / 69000
  const N = 1 + Ka * albuminMol
  const T = totalNmol * 1e-9
  const S = shbgNmol * 1e-9
  const disc = (N + S - T) * (N + S - T) + 4 * N * T
  const ft = (T - N - S + Math.sqrt(Math.max(disc, 0))) / (2 * N)
  return ft * 1e9
}

/** Very coarse T→E2 molar conversion (default 0.4%). User-adjustable in UI. */
export function estimatedE2FromT(testosteroneNmol: number, fraction = 0.004): number {
  return Math.max(0, testosteroneNmol * fraction)
}

export function timeInRange(
  values: number[],
  low: number,
  high: number
): number {
  if (!values.length) return 0
  let n = 0
  for (const v of values) if (v >= low && v <= high) n++
  return n / values.length
}
