import type { AppSettings, PatientProfile } from './types'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  unitMode: 'conventional',
  theme: 'dark',
  cvPercent: 30,
  showEvidenceC: true,
  showUncertainty: true,
  showFreeHormone: false,
  showEstimatedE2: false,
  showRefMax: true,
  showRefMin: true,
  showRefAvg: true,
  overlayClusters: true,
  disclaimerAccepted: false
}

export function createDefaultPatient(): PatientProfile {
  return {
    id: 'local',
    alias: 'Profilo locale',
    sex: 'male',
    weightKg: 70,
    shbgNmol: 35,
    albuminGdl: 4.3
  }
}
