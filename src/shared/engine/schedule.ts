import { FREQUENCIES, getFrequency } from '../catalog/frequencies'
import type { DoseEvent, Formulation, ProtocolLine } from '../types'

export function expandDoses(
  line: ProtocolLine,
  formulation: Formulation,
  horizonDays: number
): DoseEvent[] {
  const events: DoseEvent[] = []
  const start = line.startOffsetDays
  const end = start + line.durationDays
  const cap = Math.min(horizonDays + formulation.tHalfDays * 6, 800)
  const hourFrac = line.startHour / 24
  const freq = getFrequency(line.frequencyId)
  const label = formulation.name

  const push = (tDays: number, dose: number) => {
    if (tDays > cap + 1) return
    events.push({
      tDays,
      dose,
      lineId: line.id,
      formulationId: formulation.id,
      label
    })
  }

  if (!freq) return events

  if (freq.kind === 'n-per-day') {
    const n = Math.max(freq.n ?? 1, 1)
    const intervalH = 24 / n
    const days = Math.max(Math.ceil(line.durationDays), 1)
    for (let d = 0; d < days; d++) {
      for (let i = 0; i < n; i++) {
        const hours = line.startHour + i * intervalH
        const extra = Math.floor(hours / 24)
        const hod = ((hours % 24) + 24) % 24
        const t = start + d + extra + hod / 24
        if (t < start - 1e-9) continue
        push(t, line.dose)
      }
    }
  } else if (freq.kind === 'every-n-days') {
    const n = Math.max(line.everyNDays ?? freq.n ?? 1, 0.25)
    for (let t = start + hourFrac, i = 0; t < end - 1e-9 && i < 4000; t += n, i++) {
      push(t, line.dose)
    }
  } else if (freq.kind === 'weekly-days') {
    const days = (line.weeklyDays ?? freq.days ?? [1]).slice().sort((a, b) => a - b)
    const startWeekday = weekdayIndex(start)
    for (let abs = 0; start + abs < end + 7; abs++) {
      const wd = (startWeekday + abs) % 7
      if (!days.includes(wd)) continue
      const t = start + abs + hourFrac
      if (t < start - 1e-9) continue
      if (t >= end - 1e-9) break
      if (t > cap) break
      push(t, line.dose)
    }
  }

  events.sort((a, b) => a.tDays - b.tDays)
  if (line.frontloadDose && events.length > 0) {
    events[0] = { ...events[0], dose: line.frontloadDose }
  }
  return events
}

/** Day 0 of a protocol is Monday. Monday = 1 … Sunday = 0. */
export function weekdayIndex(dayOffset: number): number {
  const x = Math.floor(dayOffset)
  return (((x + 1) % 7) + 7) % 7
}

export function frequencyLabel(line: ProtocolLine): string {
  if (line.frequencyId === 'every-n') {
    const n = line.everyNDays ?? 1
    if (n === 1) return '1×/die'
    return `ogni ${n} g`
  }
  const f = FREQUENCIES.find((x) => x.id === line.frequencyId)
  return f?.label ?? line.frequencyId
}
