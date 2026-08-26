import { describe, expect, it } from 'vitest'
import { simulate } from '@shared/engine/simulate'
import type { AppSettings, PatientProfile, ProtocolLine } from '@shared/types'

const patient: PatientProfile = { id: 'p', alias: 'T', sex: 'male', weightKg: 70 }
const settings: Pick<AppSettings, 'showUncertainty' | 'showFreeHormone' | 'showEstimatedE2'> = {
  showUncertainty: false,
  showFreeHormone: false,
  showEstimatedE2: false
}

function L(p: Partial<ProtocolLine> & Pick<ProtocolLine, 'formulationId'>): ProtocolLine {
  return {
    id: 'a',
    dose: 100,
    frequencyId: 'e3_5d',
    durationDays: 84,
    startOffsetDays: 0,
    startHour: 0,
    enabled: true,
    ...p
  }
}

function stats(formulationId: string, extra: Partial<ProtocolLine> = {}, horizon = 84) {
  const res = simulate({
    lines: [L({ formulationId, ...extra })],
    patient,
    horizonDays: horizon,
    cvPercent: 0,
    settings
  })
  const s = res.series[0]
  const pts = s.points.filter((p) => p.tDays >= horizon * 0.5)
  const vals = pts.map((p) => p.value)
  const cmax = Math.max(...vals)
  const cmin = Math.min(...vals)
  const cavg = vals.reduce((a, b) => a + b, 0) / vals.length
  return { cmax, cmin, cavg, unit: s.unit }
}

describe('picco reale singola dose', () => {
  it('log peak', () => {
    const peak = (id: string, dose: number) => {
      const res = simulate({
        lines: [L({ formulationId: id, dose, frequencyId: 'ed', durationDays: 1, startHour: 0 })],
        patient,
        horizonDays: 28,
        cvPercent: 0,
        settings
      })
      const pts = res.series[0].points
      const cmax = Math.max(...pts.map((p) => p.value))
      const tmax = pts.find((p) => p.value === cmax)!.tDays
      return { cmax: Math.round(cmax), tmax: +tmax.toFixed(2) }
    }
    const rows = {
      sust250: peak('test-sustanon-250', 250),
      TE250: peak('test-enanthate', 250),
      TE100: peak('test-enanthate', 100),
      TU1000: peak('test-undecanoate-castor', 1000),
      gel50: peak('test-gel-50', 50),
      prop50: peak('test-propionate', 50)
    }
    console.log(JSON.stringify(rows, null, 2))
    expect(true).toBe(true)
  })
})

describe('livelli attesi (ss, seconda metà)', () => {
  it('Sustanon 100 mg 2×/sett non è schiacciato', () => {
    const s = stats('test-sustanon-250', { dose: 100, frequencyId: 'e3_5d' })
    expect(s.cavg).toBeGreaterThan(1200)
    expect(s.cavg).toBeLessThan(2000)
    expect(s.cmax).toBeGreaterThan(s.cavg)
    expect(s.cmin).toBeGreaterThan(700)
  })

  it('TE 100 mg/sett sta nel range TRT letteratura', () => {
    const s = stats('test-enanthate', { dose: 100, frequencyId: 'weekly' })
    expect(s.cavg).toBeGreaterThan(400)
    expect(s.cavg).toBeLessThan(800)
  })

  it('log', () => {
    const rows = {
      'sust 100 2x/sett': stats('test-sustanon-250', { dose: 100, frequencyId: 'e3_5d' }),
      'sust 250 / 21g': stats('test-sustanon-250', { dose: 250, frequencyId: 'e21d' }),
      'sust 250 single': stats('test-sustanon-250', { dose: 250, frequencyId: 'ed', durationDays: 1 }, 21),
      'TE 100 /sett': stats('test-enanthate', { dose: 100, frequencyId: 'weekly' }),
      'TE 100 2x/sett': stats('test-enanthate', { dose: 50, frequencyId: 'e3_5d' }),
      'TC 100 /sett': stats('test-cypionate', { dose: 100, frequencyId: 'weekly' }),
      'gel 50 /die': stats('test-gel-50', { dose: 50, frequencyId: 'ed' }, 28),
      'nebido 1000 /12sett': stats('test-undecanoate-castor', { dose: 1000, frequencyId: 'e84d' }, 365)
    }
    console.log(JSON.stringify(rows, null, 2))
    expect(true).toBe(true)
  })
})
