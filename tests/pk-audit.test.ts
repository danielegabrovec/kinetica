import { describe, expect, it } from 'vitest'
import { FREQUENCIES, FORMULATIONS, getFormulation } from '@shared/catalog'
import { simulate, interpolate } from '@shared/engine/simulate'
import { expandDoses } from '@shared/engine/schedule'
import type { AppSettings, PatientProfile, ProtocolLine } from '@shared/types'

const patient: PatientProfile = {
  id: 'p',
  alias: 'T',
  sex: 'male',
  weightKg: 70
}
const settings: Pick<AppSettings, 'showUncertainty' | 'showFreeHormone' | 'showEstimatedE2'> = {
  showUncertainty: false,
  showFreeHormone: false,
  showEstimatedE2: false
}

function line(partial: Partial<ProtocolLine> & Pick<ProtocolLine, 'formulationId'>): ProtocolLine {
  return {
    id: 'l1',
    dose: 100,
    frequencyId: 'ed',
    durationDays: 1,
    startOffsetDays: 0,
    startHour: 0,
    enabled: true,
    ...partial
  }
}

function run(l: ProtocolLine, horizon = 40) {
  return simulate({ lines: [l], patient, horizonDays: horizon, cvPercent: 0, settings })
}

describe('ogni formulazione: singola dose, Cmax e finitezza', () => {
  for (const f of FORMULATIONS) {
    it(`${f.id} produce una curva finita e un picco`, () => {
      const horizon = Math.max(14, f.tHalfDays * 8, f.tMaxDays * 6)
      const res = run(
        line({
          formulationId: f.id,
          dose: f.doseRef,
          frequencyId: 'ed',
          durationDays: 1
        }),
        horizon
      )
      expect(res.series.length).toBeGreaterThan(0)
      const s = res.series[0]
      const vals = s.points.map((p) => p.value)
      expect(vals.every((v) => Number.isFinite(v))).toBe(true)
      const cmax = Math.max(...vals)
      expect(cmax).toBeGreaterThan(0)
      if (!f.blendOf) {
        expect(cmax).toBeGreaterThan(f.cmaxRef * 0.7)
        expect(cmax).toBeLessThan(f.cmaxRef * 1.35)
      }
      const tmax = s.points.find((p) => p.value === cmax)!.tDays
      const expectedT = f.lagDays ? f.tMaxDays : f.tMaxDays
      if (f.model !== 'zero-order') {
        expect(tmax).toBeGreaterThan(expectedT * 0.25)
        expect(tmax).toBeLessThan(Math.max(expectedT * 3, expectedT + 1.5))
      }
    })
  }
})

describe('frequenze: tutte generano eventi', () => {
  const f = getFormulation('test-enanthate')!
  for (const fr of FREQUENCIES) {
    it(fr.id, () => {
      const ev = expandDoses(
        line({
          formulationId: 'test-enanthate',
          dose: 100,
          frequencyId: fr.id,
          everyNDays: fr.id === 'every-n' ? 5 : undefined,
          weeklyDays: fr.kind === 'weekly-days' ? [1, 3, 5] : undefined,
          durationDays: 28,
          startHour: 8
        }),
        f,
        40
      )
      expect(ev.length).toBeGreaterThan(0)
      expect(ev.every((e) => Number.isFinite(e.tDays) && e.dose === 100)).toBe(true)
    })
  }
})

describe('adattamento percentuale', () => {
  it('+20% alza la curva di 1.2', () => {
    const base = run(line({ formulationId: 'test-enanthate', dose: 100, durationDays: 1 }))
    const up = run(
      line({ formulationId: 'test-enanthate', dose: 100, durationDays: 1, scalePercent: 20 })
    )
    const a = Math.max(...base.series[0].points.map((p) => p.value))
    const b = Math.max(...up.series[0].points.map((p) => p.value))
    expect(b / a).toBeCloseTo(1.2, 5)
  })
  it('−20% abbassa a 0.8', () => {
    const base = run(line({ formulationId: 'test-enanthate', dose: 100, durationDays: 1 }))
    const down = run(
      line({ formulationId: 'test-enanthate', dose: 100, durationDays: 1, scalePercent: -20 })
    )
    const a = Math.max(...base.series[0].points.map((p) => p.value))
    const b = Math.max(...down.series[0].points.map((p) => p.value))
    expect(b / a).toBeCloseTo(0.8, 5)
  })
  it('calibra interpolate sul picco', () => {
    const res = run(line({ formulationId: 'test-enanthate', dose: 250, durationDays: 1 }))
    const s = res.series[0]
    const peak = s.points.reduce((m, p) => (p.value > m.value ? p : m), s.points[0])
    expect(interpolate(s.points, peak.tDays)).toBeCloseTo(peak.value, 6)
  })
})

describe('impostazioni cliniche', () => {
  it('riga disattiva non compare', () => {
    const res = simulate({
      lines: [line({ formulationId: 'test-enanthate', dose: 100, enabled: false })],
      patient,
      horizonDays: 21,
      cvPercent: 0,
      settings
    })
    expect(res.series.length).toBe(0)
  })
  it('Sustanon 250 mg ha Cmax nello stesso ordine del prodotto, non la somma dei picchi', () => {
    const res = run(
      line({ formulationId: 'test-sustanon-250', dose: 250, durationDays: 1 }),
      28
    )
    const cmax = Math.max(...res.series[0].points.map((p) => p.value))
    expect(cmax).toBeGreaterThan(900)
    expect(cmax).toBeLessThan(3200)
  })
  it('peso maggiore abbassa Cmax', () => {
    const a = simulate({
      lines: [line({ formulationId: 'test-enanthate', dose: 250, durationDays: 1 })],
      patient: { ...patient, weightKg: 70 },
      horizonDays: 21,
      cvPercent: 0,
      settings
    })
    const b = simulate({
      lines: [line({ formulationId: 'test-enanthate', dose: 250, durationDays: 1 })],
      patient: { ...patient, weightKg: 100 },
      horizonDays: 21,
      cvPercent: 0,
      settings
    })
    const ca = Math.max(...a.series[0].points.map((p) => p.value))
    const cb = Math.max(...b.series[0].points.map((p) => p.value))
    expect(cb).toBeLessThan(ca)
    expect(ca / cb).toBeCloseTo(100 / 70, 1)
  })
  it('4×/die resta dentro la giornata (niente 4ª dose il giorno dopo come prima dose)', () => {
    const f = getFormulation('test-enanthate')!
    const ev = expandDoses(
      line({
        formulationId: 'test-enanthate',
        frequencyId: 'qid',
        durationDays: 1,
        startHour: 8
      }),
      f,
      3
    )
    expect(ev.length).toBe(4)
    expect(Math.max(...ev.map((e) => e.tDays))).toBeLessThan(1.2)
  })
})
