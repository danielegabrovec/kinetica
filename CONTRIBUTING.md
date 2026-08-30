# Contribuire a Kinetica

Grazie per l’interesse. Kinetica è un simulatore educativo/professionale, non un dispositivo medico.

## Prima di aprire una issue

- Controlla se il comportamento è già descritto in [Teoria](src/shared/catalog/theory.ts) o nel README (variabilità individuale, evidenza C, disclaimer).
- Una curva «diversa da quello che mi aspetto» non è automaticamente un bug: indica studio, dose, peso e t½/Tmax/Cmax di riferimento.

## Codice

1. Fork e branch da `main`.
2. Usa Node.js 22 ed esegui `npm ci` → `npm run verify` → `npm run dev`.
3. Motore PK: solo `src/shared/engine` + test in `tests/`. Ogni cambiamento di cinetica vuole un test.
4. Parametri di letteratura: `src/shared/catalog/formulations.ts` (non hard-codare nel solver).
5. UI in italiano. Non aggiungere telemetria né chiamate di rete obbligatorie.
6. Se tocchi salvataggi/import, aggiungi test di schema e recupero; se tocchi UI/export, aggiungi o aggiorna un E2E in `tests/e2e/` e ispeziona il PDF prodotto.
7. PR con descrizione in italiano o inglese e `npm run verify` verde.

## Gate di rilascio

`npm run verify` esegue typecheck, Vitest, audit delle dipendenze, build ed E2E sull’app Electron reale. `npm run dist` crea l’installer NSIS; `npm run checksums` genera il file di integrità. `npm run smoke:installer -- "C:\\percorso\\Kinetica-Setup-x.y.z.exe"` installa il pacchetto in una directory temporanea, collauda avvio e persistenza, quindi verifica la disinstallazione completa. La pipeline di release esegue automaticamente anche questo gate sul pacchetto reale: non pubblicare un installer che non lo supera.

## Cosa non accettare

- Preset o testi che sembrano prescrizioni («fai così»).
- Insulina come protocollo cliccabile.
- Affermazioni CE/FDA o «uso diagnostico».

## Licenza

Contribuendo accetti che il codice entri sotto la licenza MIT del repository, copyright Daniele Gabrovec.
