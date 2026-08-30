export type ClusterId =
  | 'testosterone'
  | 'androgens'
  | 'estrogens'
  | 'progestins'
  | 'axis'
  | 'thyroid'
  | 'incretins'
  | 'gh'
  | 'peptides'
  | 'sarms'

export type Evidence = 'A' | 'B' | 'C'
export type Regulatory = 'authorized' | 'off-label' | 'research'
export type Route = 'im' | 'sc' | 'oral' | 'td' | 'vaginal' | 'nasal' | 'buccal' | 'pellet'
export type ModelKind = 'bateman' | 'zero-order'
export type Sex = 'male' | 'female'

export type DisplayUnit =
  | 'nmol/L'
  | 'ng/dL'
  | 'ng/mL'
  | 'pmol/L'
  | 'pg/mL'
  | 'ng/L'
  | 'mIU/L'
  | 'ug/L'
  | 'nmol/mL'

export interface TherapeuticWindow {
  id: string
  label: string
  low: number
  high: number
  unit: DisplayUnit
}

export interface Formulation {
  id: string
  compoundId: string
  name: string
  brand?: string
  cluster: ClusterId
  analyte: string
  analyteLabel: string
  route: Route
  model: ModelKind
  evidence: Evidence
  regulatory: Regulatory
  /** Apparent terminal half-life (days). */
  tHalfDays: number
  /** Time to peak (days). */
  tMaxDays: number
  /** Reference dose as labeled (mg, or IU for hCG). */
  doseRef: number
  doseUnit: string
  /** Cmax after a single reference dose, in the formulation's nativeUnit. */
  cmaxRef: number
  nativeUnit: DisplayUnit
  bioavailability: number
  parentMw?: number
  esterMw?: number
  yieldFraction?: number
  vialMgPerMl?: number
  typicalDoses: number[]
  defaultDose: number
  defaultFrequencyId: string
  defaultDurationDays: number
  window?: TherapeuticWindow
  sources: string[]
  notes?: string
  blendOf?: { formulationId: string; doseMg: number }[]
  zeroOrderHours?: number
  /** Absorption lag (days). Used when literature Tmax exceeds Bateman maximum. */
  lagDays?: number
}

export interface Compound {
  id: string
  inn: string
  aliases: string[]
  cluster: ClusterId
  classLabel: string
  formulationIds: string[]
  monograph: string
}

export interface Frequency {
  id: string
  kind: 'n-per-day' | 'every-n-days' | 'weekly-days'
  label: string
  abbrev: string
  n?: number
  days?: number[]
}

export type SimStroke = 'solid' | 'dashed' | 'dotted'

export interface SimCluster {
  id: string
  color?: string
  stroke?: SimStroke
  lineWidth?: number
}

export interface ProtocolLine {
  id: string
  formulationId: string
  dose: number
  frequencyId: string
  everyNDays?: number
  weeklyDays?: number[]
  durationDays: number
  startOffsetDays: number
  startHour: number
  frontloadDose?: number
  cvOverride?: number
  /** Multiply this line's curve: 0 = model, +20 = ×1.2, −20 = ×0.8. */
  scalePercent?: number
  enabled: boolean
  /** Visual/compare group (Cluster 1…n). Independent of catalog ClusterId. */
  simClusterId?: string
}

export interface PatientProfile {
  id: string
  alias: string
  sex: Sex
  weightKg: number
  age?: number
  shbgNmol?: number
  albuminGdl?: number
  notes?: string
}

export interface SavedSimulation {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  patientId?: string
  horizonDays: number
  cvPercent: number
  lines: ProtocolLine[]
  simClusters?: SimCluster[]
  notes?: string
}

export interface AppSettings {
  unitMode: 'si' | 'conventional'
  theme: 'dark' | 'light'
  cvPercent: number
  showEvidenceC: boolean
  showUncertainty: boolean
  showFreeHormone: boolean
  showEstimatedE2: boolean
  showRefMax: boolean
  showRefMin: boolean
  showRefAvg: boolean
  overlayClusters: boolean
  disclaimerAccepted: boolean
}

export interface DoseEvent {
  tDays: number
  dose: number
  lineId: string
  formulationId: string
  label: string
}

export interface SeriesPoint {
  tDays: number
  value: number
  low: number
  high: number
}

export interface AnalyteSeries {
  analyte: string
  analyteLabel: string
  cluster: ClusterId
  unit: DisplayUnit
  points: SeriesPoint[]
  color: string
  lineIds: string[]
}

export interface CurveStats {
  cmax: number
  tmaxDays: number
  cmin: number
  tminDays: number
  cavg: number
  median: number
  stdev: number
  auc: number
  peakTrough: number
  fluctuation: number
  timeInRange: number
  timeAbove: number
  timeBelow: number
  unit: DisplayUnit
}

export interface LineMetrics extends CurveStats {
  lineId: string
  formulationId: string
  label: string
  parentEquivalentPerDay?: number
  yieldFraction?: number
  injections: number
}

export interface AnalyteStats {
  analyte: string
  analyteLabel: string
  unit: DisplayUnit
  ss: CurveStats
  full: CurveStats
}

export interface SimulationResult {
  series: AnalyteSeries[]
  events: DoseEvent[]
  metrics: LineMetrics[]
  analyteStats: AnalyteStats[]
  horizonDays: number
  ssStartDays: number
}
