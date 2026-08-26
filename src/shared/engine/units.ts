import type { DisplayUnit } from '../types'

/** Testosterone: nmol/L × 28.84 ≈ ng/dL. Estradiol: pmol/L / 3.671 ≈ pg/mL. */
const TO_NMOL: Partial<Record<DisplayUnit, number>> = {
  'nmol/L': 1,
  'ng/dL': 1 / 28.84,
  'ng/mL': 10 / 28.84,
  'pmol/L': 0.001,
  'pg/mL': 0.001 / 3.671,
  'ng/L': 1 / 288.4,
  'mIU/L': 1,
  'ug/L': 1,
  'nmol/mL': 1000
}

export function toNmol(value: number, unit: DisplayUnit): number {
  const f = TO_NMOL[unit]
  if (f == null) return value
  return value * f
}

export function fromNmol(nmol: number, unit: DisplayUnit): number {
  const f = TO_NMOL[unit]
  if (f == null || f === 0) return nmol
  return nmol / f
}

export function convert(value: number, from: DisplayUnit, to: DisplayUnit): number {
  if (from === to) return value
  if (from === 'mIU/L' || to === 'mIU/L' || from === 'ug/L' || to === 'ug/L') {
    return from === to ? value : value
  }
  return fromNmol(toNmol(value, from), to)
}

export function preferredUnit(native: DisplayUnit, mode: 'si' | 'conventional'): DisplayUnit {
  if (mode === 'si') {
    if (native === 'ng/dL' || native === 'ng/mL') return 'nmol/L'
    if (native === 'pg/mL') return 'pmol/L'
    return native === 'nmol/L' || native === 'pmol/L' ? native : native
  }
  if (native === 'nmol/L') return 'ng/dL'
  if (native === 'pmol/L') return 'pg/mL'
  return native
}

export function formatConc(value: number, unit: DisplayUnit): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3
  return `${value.toFixed(digits)} ${unit}`
}

export function formatDays(days: number): string {
  if (days < 1) return `${Math.round(days * 24)} h`
  if (days < 14) return `${days.toFixed(days < 3 ? 1 : 0)} g`
  return `${(days / 7).toFixed(1)} sett`
}
