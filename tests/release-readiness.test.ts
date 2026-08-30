import { afterEach, describe, expect, it } from 'vitest'
import packageJson from '../package.json'
import { APP_VERSION } from '@shared/catalog/about'
import { DEFAULT_APP_SETTINGS } from '@shared/defaults'
import { expandDoses } from '@shared/engine/schedule'
import { simulate } from '@shared/engine/simulate'
import {
  MAX_HORIZON_DAYS,
  MAX_PROTOCOL_LINES,
  parseLibraryPayload,
  parsePlanFile
} from '@shared/library'
import { getFormulation } from '@shared/catalog'
import type { PatientProfile, ProtocolLine, SavedSimulation } from '@shared/types'
import { protocolHtml } from '../src/renderer/src/lib/export'
import { useApp } from '../src/renderer/src/store/useApp'

const patient: PatientProfile = {
  id: 'patient-safe', alias: 'Profilo sintetico', sex: 'male', weightKg: 70, shbgNmol: 35, albuminGdl: 4.3
}

const line: ProtocolLine = {
  id: 'line-safe', formulationId: 'test-enanthate', dose: 100, frequencyId: 'weekly',
  durationDays: 84, startOffsetDays: 0, startHour: 8, enabled: true, simClusterId: 'cluster-safe'
}

function plan(extra: Partial<SavedSimulation> = {}): SavedSimulation {
  return {
    id: 'plan-safe', name: 'Piano sintetico', createdAt: '2026-08-30T10:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z', horizonDays: 84, cvPercent: 30,
    lines: [line], simClusters: [{ id: 'cluster-safe', color: '#d4a574', stroke: 'solid' }], ...extra
  }
}

describe('release identity', () => {
  it('uses package.json as the single in-app version source', () => {
    expect(APP_VERSION).toBe(packageJson.version)
    expect(APP_VERSION).toBe('1.2.0')
  })
})

describe('bounded import and persistence', () => {
  it('rejects unsupported versions, unknown catalog ids, invalid colors and excessive rows', () => {
    expect(parsePlanFile({ kind: 'kinetica-plan', version: 99, plan: plan() }).ok).toBe(false)
    expect(parsePlanFile(plan({ lines: [{ ...line, formulationId: 'unknown' }] }))).toMatchObject({ ok: false })
    expect(parsePlanFile(plan({ simClusters: [{ id: 'c', color: 'url(javascript:1)' }] }))).toMatchObject({ ok: false })
    expect(parsePlanFile(plan({ lines: Array.from({ length: MAX_PROTOCOL_LINES + 1 }, (_, index) => ({ ...line, id: `l-${index}` })) }))).toMatchObject({ ok: false })
  })

  it('rejects non-finite and out-of-range simulation values', () => {
    expect(parsePlanFile(plan({ horizonDays: Number.POSITIVE_INFINITY })).ok).toBe(false)
    expect(parsePlanFile(plan({ horizonDays: MAX_HORIZON_DAYS + 1 })).ok).toBe(false)
    expect(parsePlanFile(plan({ lines: [{ ...line, durationDays: 1_000_000 }] })).ok).toBe(false)
  })

  it('salvages valid records while reporting invalid local records', () => {
    const parsed = parseLibraryPayload({
      simulations: [plan(), { name: 'rotto', lines: [{ id: 'x' }] }],
      patients: [patient, { id: 'bad' }],
      draft: null
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.payload.simulations).toHaveLength(1)
    expect(parsed.value.payload.patients).toHaveLength(1)
    expect(parsed.value.warnings.length).toBeGreaterThanOrEqual(2)
  })

  it('migrates legacy archives but refuses a newer unknown schema', () => {
    const legacy = parseLibraryPayload({ simulations: [], patients: [], draft: null })
    expect(legacy.ok).toBe(true)
    if (legacy.ok) expect(legacy.value.warnings).toContain('Archivio aggiornato allo schema 2.')

    expect(parseLibraryPayload({ schemaVersion: 3, simulations: [], patients: [], draft: null })).toMatchObject({
      ok: false,
      error: 'Versione archivio non supportata: 3.'
    })
  })
})

describe('engine work and blend accounting', () => {
  it('hard-caps the simulation grid near 8000 points', () => {
    const result = simulate({ lines: [line], patient, horizonDays: MAX_HORIZON_DAYS, cvPercent: 0, settings: DEFAULT_APP_SETTINGS })
    expect(result.horizonDays).toBe(MAX_HORIZON_DAYS)
    expect(result.series[0].points.length).toBeLessThanOrEqual(8_001)
  })

  it('caps dense dose schedules', () => {
    const formulation = getFormulation('test-enanthate')!
    const events = expandDoses({ ...line, frequencyId: 'qid', durationDays: 1_000_000 }, formulation, 1_000_000)
    expect(events.length).toBeLessThanOrEqual(4_000)
    expect(events.at(-1)!.tDays).toBeLessThanOrEqual(801)
  })

  it('reports one Sustanon administration, not four ester events', () => {
    const result = simulate({
      lines: [{ ...line, formulationId: 'test-sustanon-250', dose: 250, frequencyId: 'ed', durationDays: 1 }],
      patient, horizonDays: 28, cvPercent: 0, settings: DEFAULT_APP_SETTINGS
    })
    expect(result.events).toHaveLength(1)
    expect(result.metrics[0]).toMatchObject({ label: 'Sustanon 250', injections: 1, formulationId: 'test-sustanon-250' })
  })
})

describe('saved-plan integrity', () => {
  const initial = useApp.getState()

  afterEach(() => {
    useApp.setState({
      library: initial.library,
      patients: initial.patients,
      patient: initial.patient,
      lines: initial.lines,
      simClusters: initial.simClusters,
      horizonDays: initial.horizonDays,
      settings: initial.settings,
      currentSimId: initial.currentSimId,
      currentName: initial.currentName
    })
  })

  it('restores the saved patient and CV when a plan is opened', () => {
    const other: PatientProfile = { ...patient, id: 'patient-other', alias: 'Profilo salvato', weightKg: 91 }
    const saved = plan({ patientId: other.id, cvPercent: 47 })
    useApp.setState({ library: [saved], patients: [patient, other], patient, settings: { ...DEFAULT_APP_SETTINGS, cvPercent: 5 } })
    useApp.getState().loadSimulation(saved.id)
    expect(useApp.getState().patient).toMatchObject({ id: other.id, weightKg: 91 })
    expect(useApp.getState().settings.cvPercent).toBe(47)
  })
})

describe('standalone report safety', () => {
  it('escapes imported content and disables scripts and network connections', () => {
    const malicious = { ...patient, alias: '<script>globalThis.pwned=true</script>' }
    const html = protocolHtml([], malicious, 'conventional')
    expect(html).not.toContain('<script>globalThis.pwned=true</script>')
    expect(html).toContain('&lt;script&gt;globalThis.pwned=true&lt;/script&gt;')
    expect(html).toContain("script-src 'none'")
    expect(html).toContain("connect-src 'none'")
  })
})
