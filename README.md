# Kinetica

Simulatore **locale** di farmacocinetica ormonale e peptidica per Windows.

[![Licenza](https://img.shields.io/badge/licenza-MIT-2dd4bf?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/github/v/release/danielegabrovec/kinetica?style=flat-square)](https://github.com/danielegabrovec/kinetica/releases)
[![Piattaforma](https://img.shields.io/badge/Windows-x64-0b1220?style=flat-square)](https://github.com/danielegabrovec/kinetica/releases)

<p align="center">
  <img src="build/icon.png" width="128" height="128" alt="Icona di Kinetica">
</p>

**Autore:** [Daniele Gabrovec](https://github.com/danielegabrovec) — Biologo Nutrizionista (Ordine dei Biologi del Triveneto n. TRI_A2489).

> **Non è un dispositivo medico.** Non è marcato CE/FDA, non prescrive e non sostituisce giudizio clinico, RCP o laboratorio. I parametri PK sono stime da letteratura (evidenza A/B/C) con variabilità individuale ampia. Non usare le curve per iniziare, modificare o sospendere una terapia.

## Cosa fa

Kinetica costruisce curve di concentrazione nel tempo a partire da dose, frequenza, durata e formulazione:

- esteri del testosterone (enantato, cipionato, propionato, Sustanon, Nebido/TU, gel, patch…)
- estrogeni e progestinici
- asse (GnRH, hCG, clomifene…)
- tiroide, incretine, GH, peptidi

Il modello è a due costanti (Bateman / flip-flop per i depositi, infusione a ordine zero per gel e cerotti) con **superposition** delle dosi. I blend (Sustanon, Omnadren) sommano i componenti. Si possono adattare le curve a un prelievo (±%) e confrontare protocolli.

**Tutto gira in locale:** nessun account, nessun cloud, nessun invio di dati.

## Installazione (Windows)

1. Apri la pagina [Releases](https://github.com/danielegabrovec/kinetica/releases).
2. Scarica `Kinetica-Setup-1.0.0.exe` (installer NSIS, 64 bit).
3. Esegui il file e segui la procedura (lingua italiana, si può scegliere la cartella).
4. All’avvio accetta l’avvertenza di simulazione.

### SmartScreen

L’installer **non è firmato con un certificato Authenticode a pagamento**. Windows può mostrare «Windows ha protetto il PC». Scegli **Ulteriori informazioni** → **Esegui comunque**. Il codice è pubblico in questo repository: si può compilare l’installer in proprio (vedi sotto).

### Disinstallazione

Impostazioni Windows → App → Kinetica → Disinstalla. I JSON salvati restano in `%APPDATA%\kinetica` finché non li cancelli a mano.

Requisiti: Windows 10 o 11, 64 bit.

## Avvio da codice (sviluppo)

Serve [Node.js](https://nodejs.org/) 20 o successivo.

```powershell
git clone https://github.com/danielegabrovec/kinetica.git
cd kinetica
npm install
npm test
npm run dev
```

| Comando | Cosa fa |
|---|---|
| `npm run dev` | App Electron in modalità sviluppo |
| `npm test` | Suite Vitest del motore PK |
| `npm run build` | Bundle produzione in `out/` |
| `npm run dist` | Bundle + installer NSIS in `release/` |

## Come si usa

Layout da editor video:

| Zona | Contenuto |
|---|---|
| Sinistra | Libreria molecole (cerca, trascina sul grafico o sulle tracce) |
| Centro | Grafico concentrazione/tempo (linee Max / Media / Min accendibili) |
| Sotto il grafico | Tracce: ogni clip è una riga di protocollo |
| Destra | Ispettore della clip selezionata (molecola, dose, frequenza, durata, offset, adattamento %) |

- **Trascina** una molecola dalla libreria sulla timeline.
- **Tasto destro** su una clip: frequenza, molecola (con sottomenu esteri del testosterone), dose, durata, cestino. La ricerca nel menu funziona anche con accenti.
- **Trascina in orizzontale** per spostare (scatto 0,5 giorni: es. Sustanon 250 mg al giorno 1 e 100 mg a 3,5 giorni).
- **Trascina il bordo** per allungare/accorciare la durata.
- **Trascina in verticale** (maniglia) per alzare/abbassare la dose. L’altezza della clip segue la dose.
- **Salva / Carica** in alto: JSON locale. I file e i profili stanno in `%APPDATA%\kinetica`.
- **Export:** HTML, PDF, stampa, CSV dalla sezione Report.

Frequenze: QID, TID, BID, ED, EOD, 6×/sett. … E3W, e custom.

## Motore PK

Codice puro in `src/shared/engine`, coperto da Vitest (`tests/`).

- `k_lenta` dalla t½ apparente; `k_rapida` dal Tmax; ampiezza dal Cmax di letteratura, poi proporzionale a dose e peso (Vd ∝ peso/70 kg).
- Se Tmax è oltre il massimo della Bateman (es. TU orale) si applica un lag.
- Blend = somma degli esteri, scalata sul Cmax del prodotto.
- T libero: formula di Vermeulen (opzionale).
- Adattamento laboratorio: fattore `scalePercent` sulla curva.

I parametri vivono in `src/shared/catalog/formulations.ts`. Evidenza **C** = illustrativa, non precisione finta.

## Dati e privacy

Nessun telemetria, nessun account, nessuna rete richiesta dopo l’installazione (il renderer carica i font da Google Fonts se c’è connessione; l’app funziona comunque).

Persistenza: `%APPDATA%\kinetica\library.json`.

## Compilare l’installer

Da Windows, nella cartella del repo:

```powershell
npm install
npm test
npm run dist
```

L’eseguibile esce in `release\Kinetica-Setup-1.0.0.exe`.

## Struttura

```
src/main          processo Electron (file, stampa, PDF)
src/preload       bridge IPC
src/renderer      UI React
src/shared/engine motore PK (Bateman, superposition, metriche)
src/shared/catalog formulazioni, frequenze, preset, testi
tests             Vitest
build             icona e risorse installer
```

Stack: Electron + Vite + React 19 + TypeScript + Tailwind v4 + ECharts + Zustand.

## Licenza

[MIT](LICENSE) © 2026 Daniele Gabrovec. Attribuzione richiesta. Nessuna garanzia. Non è un dispositivo medico.

## Contatti

- Autore: Daniele Gabrovec
- PEC / email: info.dottdanielegabrovec@gmail.com
- Codice: https://github.com/danielegabrovec/kinetica
