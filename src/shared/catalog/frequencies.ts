import type { Frequency } from '../types'

export const FREQUENCIES: Frequency[] = [
  { id: 'qid', kind: 'n-per-day', n: 4, abbrev: 'QID', label: 'QID · 4×/die' },
  { id: 'tid', kind: 'n-per-day', n: 3, abbrev: 'TID', label: 'TID · 3×/die' },
  { id: 'bid', kind: 'n-per-day', n: 2, abbrev: 'BID', label: 'BID · 2×/die' },
  { id: 'ed', kind: 'every-n-days', n: 1, abbrev: 'ED', label: 'ED · 1×/die' },
  { id: 'eod', kind: 'every-n-days', n: 2, abbrev: 'EOD', label: 'EOD · a giorni alterni' },
  { id: 'e3d', kind: 'every-n-days', n: 3, abbrev: 'E3D', label: 'E3D · ogni 3 giorni' },
  { id: 'e4d', kind: 'every-n-days', n: 4, abbrev: 'E4D', label: 'E4D · ogni 4 giorni' },
  { id: 'e5d', kind: 'every-n-days', n: 5, abbrev: 'E5D', label: 'E5D · ogni 5 giorni' },
  { id: 'x6wk', kind: 'weekly-days', days: [1, 2, 3, 4, 5, 6], abbrev: '6xwk', label: '6xwk · lun–sab' },
  { id: 'x5wk', kind: 'weekly-days', days: [1, 2, 3, 4, 5], abbrev: '5xwk', label: '5xwk · lun–ven' },
  { id: 'x4wk', kind: 'weekly-days', days: [1, 2, 4, 5], abbrev: '4xwk', label: '4xwk · lun mar gio ven' },
  { id: 'mwf', kind: 'weekly-days', days: [1, 3, 5], abbrev: '3xwk', label: '3xwk · lun mer ven' },
  { id: 'e3_5d', kind: 'every-n-days', n: 3.5, abbrev: '2xwk', label: '2xwk · ogni 3,5 giorni' },
  { id: 'weekly', kind: 'every-n-days', n: 7, abbrev: 'EW', label: 'EW · 1×/sett' },
  { id: 'e10d', kind: 'every-n-days', n: 10, abbrev: 'E10D', label: 'E10D · ogni 10 giorni' },
  { id: 'e14d', kind: 'every-n-days', n: 14, abbrev: 'E2W', label: 'E2W · ogni 2 settimane' },
  { id: 'e21d', kind: 'every-n-days', n: 21, abbrev: 'E3W', label: 'E3W · ogni 3 settimane' },
  { id: 'e28d', kind: 'every-n-days', n: 28, abbrev: 'E4W', label: 'E4W · ogni 4 settimane' },
  { id: 'e70d', kind: 'every-n-days', n: 70, abbrev: 'E10W', label: 'E10W · ogni 10 settimane' },
  { id: 'e84d', kind: 'every-n-days', n: 84, abbrev: 'E12W', label: 'E12W · ogni 12 settimane' },
  { id: 'every-n', kind: 'every-n-days', n: 7, abbrev: 'EN', label: 'ogni N giorni' }
]

export function getFrequency(id: string): Frequency | undefined {
  return FREQUENCIES.find((f) => f.id === id)
}
