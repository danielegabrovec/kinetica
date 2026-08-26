import type { ClusterId } from '../types'

export const CLUSTER_LABEL: Record<ClusterId, string> = {
  testosterone: 'Testosterone',
  androgens: 'Altri androgeni',
  estrogens: 'Estrogeni',
  progestins: 'Progestinici',
  axis: 'Asse e modulatori',
  thyroid: 'Tiroide',
  incretins: 'Incretine',
  gh: 'GH e secretagoghi',
  peptides: 'Peptidi',
  sarms: 'SARM e altri'
}

export const CLUSTER_COLOR: Record<ClusterId, string> = {
  testosterone: '#D4A574',
  androgens: '#C9844A',
  estrogens: '#E8A0B0',
  progestins: '#A78BFA',
  axis: '#7DD3FC',
  thyroid: '#FBBF24',
  incretins: '#34D399',
  gh: '#2DD4BF',
  peptides: '#5EEAD4',
  sarms: '#94A3B8'
}

export const CLUSTER_ORDER: ClusterId[] = [
  'testosterone',
  'androgens',
  'estrogens',
  'progestins',
  'axis',
  'thyroid',
  'incretins',
  'gh',
  'peptides',
  'sarms'
]
