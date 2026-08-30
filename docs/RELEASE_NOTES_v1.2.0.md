# Kinetica 1.2.0

Questa release porta Kinetica da prototipo funzionante a pacchetto Windows verificato e pronto all'installazione.

## Novità principali

- Report HTML, PDF e stampa ridisegnati su un unico documento A4: copertina operativa, grafico vettoriale, protocollo, metriche e appendice metodologica con fonti e limiti clinici.
- Salvataggio affidabile di piano, profilo e impostazioni; l'ultima modifica viene sincronizzata anche quando la finestra viene chiusa subito.
- Import JSON rigoroso e limitato, recupero degli archivi locali corrotti, backup e scritture atomiche.
- Correzione dei blend Sustanon/Omnadren: una somministrazione resta una somministrazione, mentre la simulazione somma correttamente gli esteri.
- UI più chiara e accessibile, navigabile da tastiera e fruibile alla dimensione minima supportata.
- Avvio interamente offline con font locali e renderer Electron isolato e sandboxed.
- Avvio singola istanza e gestione sicura dei link esterni, dei dialoghi file e dei canali IPC.
- Caricamento differito delle viste e del grafico per ridurre il bundle iniziale.

## Verifiche della release

- TypeScript senza errori.
- 124+ test unitari e di integrazione sul motore, import, persistenza ed export.
- Test end-to-end sull'app Electron reale: salvataggio/riavvio, import, recupero, profili, catalogo, cluster, tutte le viste, accessibilità ed export JSON/CSV/HTML/PDF.
- Audit npm senza vulnerabilità note al livello di rilascio.
- Installer NSIS Windows x64 installato, avviato e disinstallato in ambiente di collaudo prima della pubblicazione.

## Integrità

La release include `SHA256SUMS.txt`. L'installer prodotto da GitHub Actions dispone inoltre di un'attestazione di provenienza verificabile con:

```powershell
gh attestation verify .\Kinetica-Setup-1.2.0.exe -R danielegabrovec/kinetica
```

L'installer non è firmato Authenticode: Windows SmartScreen può quindi richiedere una conferma esplicita.

> Kinetica non è un dispositivo medico e non sostituisce valutazione clinica, RCP, esami o prescrizione.
