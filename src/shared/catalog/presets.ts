import type { ProtocolLine } from '../types'

export interface Preset {
  id: string
  name: string
  blurb: string
  horizonDays: number
  lines: Omit<ProtocolLine, 'id'>[]
}

function line(
  formulationId: string,
  dose: number,
  frequencyId: string,
  durationDays: number,
  extra: Partial<ProtocolLine> = {}
): Omit<ProtocolLine, 'id'> {
  return {
    formulationId,
    dose,
    frequencyId,
    durationDays,
    startOffsetDays: 0,
    startHour: 8,
    enabled: true,
    ...extra
  }
}

export const PRESETS: Preset[] = [
  {
    id: 'trt-enanthate-weekly',
    name: 'TRT enantato 100 mg / sett',
    blurb: 'Schema classico 1×/sett. Guarda picco e valle, poi duplica a 50 mg 2×/sett.',
    horizonDays: 84,
    lines: [line('test-enanthate', 100, 'weekly', 84)]
  },
  {
    id: 'trt-enanthate-split',
    name: 'TRT enantato 50 mg 2×/sett',
    blurb: 'Stessa dose settimanale, valle più alta.',
    horizonDays: 84,
    lines: [line('test-enanthate', 50, 'e3_5d', 84)]
  },
  {
    id: 'trt-cypionate',
    name: 'TRT cipionato 100 mg / sett',
    blurb: 'Quasi sovrapponibile all’enantato.',
    horizonDays: 84,
    lines: [line('test-cypionate', 100, 'weekly', 84)]
  },
  {
    id: 'trt-propionate',
    name: 'TRT propionato 50 mg EOD',
    blurb: 'Estere corto: serve frequenza alta.',
    horizonDays: 56,
    lines: [line('test-propionate', 50, 'eod', 56)]
  },
  {
    id: 'trt-nebido',
    name: 'Nebido 1000 mg / 12 sett',
    blurb: 'Undecanoato in olio di ricino. Orizzonte 1 anno.',
    horizonDays: 365,
    lines: [line('test-undecanoate-castor', 1000, 'e84d', 365)]
  },
  {
    id: 'trt-sustanon',
    name: 'Sustanon 250 ogni 3 sett',
    blurb: 'Blend a 4 esteri: la curva è la somma.',
    horizonDays: 84,
    lines: [line('test-sustanon-250', 250, 'e21d', 84)]
  },
  {
    id: 'trt-gel',
    name: 'Gel T 50 mg / die',
    blurb: 'Zero-order sulle ~20 h di assorbimento.',
    horizonDays: 28,
    lines: [line('test-gel-50', 50, 'ed', 28)]
  },
  {
    id: 'hrt-e2-gel',
    name: 'E2 gel 0,75 mg / die',
    blurb: 'HRT transdermica.',
    horizonDays: 28,
    lines: [line('e2-gel', 0.75, 'ed', 28)]
  },
  {
    id: 'hrt-p4',
    name: 'Progesterone vaginale 200 mg / die',
    blurb: 'Protezione endometriale, curva a emivita breve.',
    horizonDays: 28,
    lines: [line('p4-vaginal', 200, 'ed', 28)]
  },
  {
    id: 'hcg-1500',
    name: 'hCG 1500 UI 2×/sett',
    blurb: 'Curva di hCG, non del T indotto.',
    horizonDays: 42,
    lines: [line('hcg', 1500, 'e3_5d', 42)]
  },
  {
    id: 'sema-1mg',
    name: 'Semaglutide 1 mg / sett',
    blurb: 'Accumulo su 4–5 settimane.',
    horizonDays: 84,
    lines: [line('semaglutide', 1, 'weekly', 84)]
  }
]
