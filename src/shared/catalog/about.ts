export const APP_NAME = 'Kinetica'
export const APP_VERSION = '1.0.0'
export const APP_YEAR = 2026

export const ABOUT = {
  name: APP_NAME,
  version: APP_VERSION,
  tagline: 'Simulatore locale di farmacocinetica ormonale e peptidica',
  author: {
    name: 'Daniele Gabrovec',
    role: 'Biologo Nutrizionista',
    order: 'Ordine dei Biologi del Triveneto n. TRI_A2489',
    pec: 'info.dottdanielegabrovec@gmail.com',
    github: 'https://github.com/danielegabrovec/kinetica'
  },
  copyright: `© ${APP_YEAR} Daniele Gabrovec. Licenza MIT.`,
  rights: [
    'Copyright © 2026 Daniele Gabrovec. Licenza MIT: uso, studio, modifica e redistribuzione con attribuzione.',
    'Il software è fornito «così com’è», senza garanzia di alcun tipo.',
    'Non è un dispositivo medico e non autorizza prescrizioni.',
    'Il catalogo PK contiene stime da letteratura (evidenza A/B/C), non dati di prescrizione.',
    'Codice e installer: https://github.com/danielegabrovec/kinetica'
  ],
  what: `Kinetica costruisce curve di concentrazione nel tempo a partire da dose, frequenza, durata e formulazione (esteri del testosterone, estrogeni, progestinici, asse, tiroide, incretine, GH, peptidi).

Il modello è a due costanti (Bateman / flip-flop per i depositi, infusione a ordine zero per gel e cerotti) con superposition delle dosi. I blend (Sustanon, Omnadren) sommano i componenti. Si possono adattare le curve a un prelievo (±%) e confrontare protocolli.

Tutto gira in locale: nessun account, nessun cloud, nessun invio di dati.`,
  not: [
    'Non è un dispositivo medico (non marcato CE / FDA).',
    'Non prescrive e non sostituisce giudizio clinico, RCP o laboratorio.',
    'Non predice esiti (ematocrito, fertilità, BMD, umore).',
    'Le curve con evidenza C sono illustrative.'
  ]
}
