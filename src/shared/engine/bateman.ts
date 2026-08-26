const LN2 = Math.LN2

export function kFromHalfLife(tHalfDays: number): number {
  return LN2 / Math.max(tHalfDays, 1e-6)
}

/**
 * Solve k_fast so that Tmax = ln(k_fast/k_slow) / (k_fast − k_slow).
 * Larger k_fast → earlier peak.
 */
export function maxBatemanTmax(kSlow: number): number {
  return 0.9 / kSlow
}

export function solveKFast(kSlow: number, tMaxDays: number): number {
  const minTmax = 1e-4
  const maxTmax = maxBatemanTmax(kSlow)
  const target = Math.min(Math.max(tMaxDays, minTmax), maxTmax)
  let lo = kSlow * 1.02
  let hi = kSlow * 800
  for (let i = 0; i < 90; i++) {
    const mid = (lo + hi) / 2
    const tmax = Math.log(mid / kSlow) / (mid - kSlow)
    if (tmax > target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function batemanAmplitude(
  cmax: number,
  kSlow: number,
  kFast: number,
  tMaxDays: number
): number {
  const den = Math.exp(-kSlow * tMaxDays) - Math.exp(-kFast * tMaxDays)
  if (Math.abs(den) < 1e-12) return cmax
  return cmax / den
}

/** C(t) = A (e^{−k_slow t} − e^{−k_fast t}) for t ≥ 0. */
export function bateman(tDays: number, kSlow: number, kFast: number, amp: number): number {
  if (tDays < 0) return 0
  return amp * (Math.exp(-kSlow * tDays) - Math.exp(-kFast * tDays))
}

export function theoreticalTmax(kSlow: number, kFast: number): number {
  return Math.log(kFast / kSlow) / (kFast - kSlow)
}

/**
 * Zero-order infusion of duration T, first-order elimination.
 * Rate is scaled so the plateau-toward Cmax* at t=T for a single dose.
 */
export function zeroOrder(
  tDays: number,
  infusionDays: number,
  kElim: number,
  plateau: number
): number {
  if (tDays < 0) return 0
  const css = plateau / (1 - Math.exp(-kElim * infusionDays))
  if (tDays <= infusionDays) {
    return css * (1 - Math.exp(-kElim * tDays))
  }
  const cEnd = css * (1 - Math.exp(-kElim * infusionDays))
  return cEnd * Math.exp(-kElim * (tDays - infusionDays))
}

export function esterYield(parentMw: number, esterMw: number): number {
  if (!esterMw) return 1
  return parentMw / esterMw
}
