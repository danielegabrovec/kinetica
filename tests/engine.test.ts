import { describe, expect, it } from 'vitest'
import { esterYield, kFromHalfLife, solveKFast, theoreticalTmax, bateman } from '@shared/engine/bateman'
import { expandDoses, weekdayIndex } from '@shared/engine/schedule'
import { convert } from '@shared/engine/units'
import { vermeulenFreeT } from '@shared/engine/pd'
import { simulate } from '@shared/engine/simulate'
import { getFormulation } from '@shared/catalog'
import type { AppSettings, PatientProfile, ProtocolLine } from '@shared/types'

const patient: PatientProfile = {
  id: 'p',
  alias: 'Test',
  sex: 'male',
  weightKg: 70
}

const settings: Pick<AppSettings, 'showUncertainty' | 'showFreeHormone' | 'showEstimatedE2'> = {
  showUncertainty: true,
  showFreeHormone: false,
  showEstimatedE2: false
}

function line(partial: Partial<ProtocolLine> & Pick<ProtocolLine, 'formulationId'>): ProtocolLine {
  return {
    id: 'l1',
    dose: 100,
    frequencyId: 'weekly',
    durationDays: 84,
    startOffsetDays: 0,
    startHour: 8,
    enabled: true,
    ...partial
  }
}

describe('search', () => {
  it('filtra mentre si digita', async () => {
    const { searchFormulations } = await import('@shared/catalog')
    expect(searchFormulations('enan')[0]?.id).toBe('test-enanthate')
    expect(searchFormulations('cipio').some((f) => f.id === 'test-cypionate')).toBe(true)
    const sust = searchFormulations('sustanon')
    expect(sust.map((f) => f.id)).toEqual(['test-sustanon-250'])
    expect(searchFormulations('nebido').some((f) => f.id === 'test-undecanoate-castor')).toBe(true)
    expect(searchFormulations('xyznonexistent').length).toBe(0)
  })

  it('mentre si digita ignora il chip famiglia del catalogo', async () => {
    const { listFormulations } = await import('@shared/catalog')
    const locked = listFormulations({ q: 'estradiol', cluster: 'testosterone', showEvidenceC: true })
    expect(locked.some((f) => f.cluster === 'estrogens')).toBe(true)
    const idle = listFormulations({ q: '', cluster: 'testosterone', showEvidenceC: true })
    expect(idle.every((f) => f.cluster === 'testosterone')).toBe(true)
  })
})

describe('yield', () => {
  it('enantato ~72%', () => {
    expect(esterYield(288.42, 400.6)).toBeCloseTo(0.72, 2)
  })
  it('catalog enantato 250 mg → ~180 mg T', () => {
    const f = getFormulation('test-enanthate')!
    expect(250 * (f.yieldFraction ?? 0)).toBeCloseTo(180, 0)
  })
})

describe('bateman tmax', () => {
  it('solves kFast so tmax matches', () => {
    const kSlow = kFromHalfLife(4.5)
    const kFast = solveKFast(kSlow, 1.5)
    expect(theoreticalTmax(kSlow, kFast)).toBeCloseTo(1.5, 2)
  })
  it('single dose peaks near tmax', () => {
    const kSlow = kFromHalfLife(4.5)
    const kFast = solveKFast(kSlow, 1.5)
    const tMax = theoreticalTmax(kSlow, kFast)
    const a = 100
    const cPeak = bateman(tMax, kSlow, kFast, a)
    const cBefore = bateman(tMax - 0.3, kSlow, kFast, a)
    const cAfter = bateman(tMax + 0.3, kSlow, kFast, a)
    expect(cPeak).toBeGreaterThan(cBefore)
    expect(cPeak).toBeGreaterThan(cAfter)
  })
})

describe('schedule', () => {
  it('weekly → 12 doses in 84 days', () => {
    const f = getFormulation('test-enanthate')!
    const ev = expandDoses(line({ formulationId: 'test-enanthate' }), f, 90)
    expect(ev.length).toBe(12)
  })
  it('day 0 is Monday', () => {
    expect(weekdayIndex(0)).toBe(1)
    expect(weekdayIndex(6)).toBe(0)
  })
  it('superposition: two identical doses add', () => {
    const res1 = simulate({
      lines: [line({ formulationId: 'test-enanthate', durationDays: 1, frequencyId: 'ed', dose: 100 })],
      patient,
      horizonDays: 14,
      cvPercent: 0,
      settings
    })
    const res2 = simulate({
      lines: [
        line({
          id: 'a',
          formulationId: 'test-enanthate',
          durationDays: 1,
          frequencyId: 'ed',
          dose: 100
        }),
        line({
          id: 'b',
          formulationId: 'test-enanthate',
          durationDays: 1,
          frequencyId: 'ed',
          dose: 100,
          startOffsetDays: 0
        })
      ],
      patient,
      horizonDays: 14,
      cvPercent: 0,
      settings
    })
    const v1 = res1.series[0].points[20].value
    const v2 = res2.series[0].points[20].value
    expect(v2).toBeCloseTo(v1 * 2, 5)
  })
})

describe('units', () => {
  it('nmol/L ↔ ng/dL round-trip', () => {
    const ng = convert(20, 'nmol/L', 'ng/dL')
    expect(ng).toBeCloseTo(576.8, 0)
    expect(convert(ng, 'ng/dL', 'nmol/L')).toBeCloseTo(20, 5)
  })
})

describe('vermeulen', () => {
  it('free T is a small fraction of total', () => {
    const ft = vermeulenFreeT(20, 30, 4.3)
    expect(ft).toBeGreaterThan(0.2)
    expect(ft).toBeLessThan(1.2)
    expect(ft / 20).toBeLessThan(0.08)
  })
})

describe('simulate TRT', () => {
  it('enantato 250 mg single: Cmax in literature band', () => {
    const res = simulate({
      lines: [line({ formulationId: 'test-enanthate', dose: 250, frequencyId: 'ed', durationDays: 1 })],
      patient,
      horizonDays: 21,
      cvPercent: 0,
      settings
    })
    const s = res.series.find((x) => x.analyte === 'testosterone')!
    const cmax = Math.max(...s.points.map((p) => p.value))
    const tmax = s.points.find((p) => p.value === cmax)!.tDays
    expect(cmax).toBeGreaterThan(700)
    expect(cmax).toBeLessThan(1600)
    expect(tmax).toBeGreaterThan(0.4)
    expect(tmax).toBeLessThan(4)
  })

  it('propionato decays faster than enantato', () => {
    const mk = (id: string) =>
      simulate({
        lines: [line({ formulationId: id, dose: 100, frequencyId: 'ed', durationDays: 1 })],
        patient,
        horizonDays: 21,
        cvPercent: 0,
        settings
      })
    const p = mk('test-propionate').series[0]
    const e = mk('test-enanthate').series[0]
    const atDay10 = (s: typeof p) => s.points.find((x) => Math.abs(x.tDays - 10) < 0.1)!.value
    expect(atDay10(p)).toBeLessThan(atDay10(e))
  })

  it('Sustanon is the sum of four esters', () => {
    const res = simulate({
      lines: [line({ formulationId: 'test-sustanon-250', dose: 250, frequencyId: 'ed', durationDays: 1 })],
      patient,
      horizonDays: 28,
      cvPercent: 0,
      settings
    })
    expect(res.series[0].points.some((p) => p.value > 100)).toBe(true)
    expect(res.events).toHaveLength(1)
    expect(res.events[0]?.label).toBe('Sustanon 250')
    expect(res.metrics[0]?.label).toBe('Sustanon 250')
    expect(res.metrics[0]?.injections).toBe(1)
  })

  it('AUC scales with dose', () => {
    const auc = (dose: number) => {
      const r = simulate({
        lines: [line({ formulationId: 'test-enanthate', dose, frequencyId: 'ed', durationDays: 1 })],
        patient,
        horizonDays: 40,
        cvPercent: 0,
        settings
      })
      const pts = r.series[0].points
      let a = 0
      for (let i = 1; i < pts.length; i++) {
        a += 0.5 * (pts[i].value + pts[i - 1].value) * (pts[i].tDays - pts[i - 1].tDays)
      }
      return a
    }
    expect(auc(200) / auc(100)).toBeCloseTo(2, 1)
  })
})
