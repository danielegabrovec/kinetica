# Contribuire a Kinetica

Grazie per l’interesse. Kinetica è un simulatore educativo/professionale, non un dispositivo medico.

## Prima di aprire una issue

- Controlla se il comportamento è già descritto in [Teoria](src/shared/catalog/theory.ts) o nel README (variabilità individuale, evidenza C, disclaimer).
- Una curva «diversa da quello che mi aspetto» non è automaticamente un bug: indica studio, dose, peso e t½/Tmax/Cmax di riferimento.

## Codice

1. Fork e branch da `main`.
2. `npm install` → `npm test` → `npm run dev`.
3. Motore PK: solo `src/shared/engine` + test in `tests/`. Ogni cambiamento di cinetica vuole un test.
4. Parametri di letteratura: `src/shared/catalog/formulations.ts` (non hard-codare nel solver).
5. UI in italiano. Non aggiungere telemetria né chiamate di rete obbligatorie.
6. PR con descrizione in italiano o inglese, e `npm test` verde.

## Cosa non accettare

- Preset o testi che sembrano prescrizioni («fai così»).
- Insulina come protocollo cliccabile.
- Affermazioni CE/FDA o «uso diagnostico».

## Licenza

Contribuendo accetti che il codice entri sotto la licenza MIT del repository, copyright Daniele Gabrovec.
