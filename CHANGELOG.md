# Changelog

## 1.2.0 — 2026-08-30

Release di stabilizzazione, sicurezza, qualità visiva e pubblicazione.

### Affidabilità dei dati

- Il piano salvato ripristina anche profilo, peso, SHBG e CV associati.
- Salvataggi dell’archivio atomici con backup, migrazione del vecchio percorso e copia di recupero in caso di JSON corrotto.
- Sincronizzazione della bozza prima della chiusura dell’app e blocco della seconda istanza.
- Validazione rigorosa e limiti dimensionali per archivio e import JSON; gli schemi futuri sconosciuti vengono rifiutati senza sovrascrittura.

### Motore e funzioni

- Corretto il conteggio di Sustanon/Omnadren: una somministrazione non viene più moltiplicata per il numero di esteri del blend.
- Aggiunti limiti a orizzonte, righe, cluster, griglia temporale ed eventi per evitare carichi incontrollati.
- Corretto l’export JSON su Windows e uniformati i nomi file sicuri.

### Report, UI e UX

- HTML, PDF e stampa condividono ora un documento A4 dedicato, con header, riepilogo, grafico SVG, protocollo, metriche e appendice metodologica/fonti.
- Corretti ritagli, unità duplicate, spazi vuoti e proporzioni del grafico nelle esportazioni.
- Font locali, navigazione responsive, etichette accessibili, modali e notifiche semantiche, libreria molecole utilizzabile da tastiera.
- Route caricate in modo differito: il grafico non appesantisce più il bundle iniziale.

### Sicurezza e rilascio

- Aggiornati Electron ed ECharts; audit dipendenze senza vulnerabilità note al rilascio.
- Sandbox e context isolation, CSP restrittiva, IPC verificato, permessi negati e navigazione/link esterni consentiti solo quando previsti.
- CI con typecheck, unit/integration, audit e Playwright sull’app Electron reale.
- Release con installer, checksum SHA-256, GitHub artifact attestation e azioni bloccate a commit immutabili.

## 1.1.0 — 2026-08-30

Cluster di confronto, gestione file completa e profili.

### Simulazione e confronto

- **Cluster di simulazione** (Cluster 1…n): gruppi di molecole con curva propria, colore e tratto (continuo/tratteggiato/puntinato) modificabili; bottone verde «Aggiungi cluster»; trascina una molecola nel cluster (le zone di rilascio si evidenziano).
- **Sovrapposizione** dei cluster su griglia temporale comune: tooltip con entrambi i valori, serie punteggiata **Δ (Cluster 1 − Cluster 2)** e confronto Cavg/Cmax/Cmin/Picco-Valle.
- Report con overlay e Δ in testa quando ci sono almeno 2 cluster; CSV e HTML allineati.

### Ricerca

- Ricerca unica in libreria, picker, menu clip e palette (Ctrl+K): trova per composto, estere e **brand** (Sustanon, Nebido…); mentre digiti il filtro per famiglia si ignora.

### File e piani

- **Salva** (Ctrl+S) crea subito la voce in libreria se il piano non esiste; **Salva con nome** (Ctrl+Shift+S) non sovrascrive mai (aggiunge 2, 3…); **Carica** (Ctrl+O) e **Nuovo** (Ctrl+N) con avviso se ci sono modifiche non salvate.
- **Rinomina** del protocollo dal titolo in alto (clic sulla matita, Invio/Esc) e dei piani salvati nella pagina File.
- Pagina **File**: elenco piani con rinomina, duplica, elimina con conferma, **Importa/Esporta JSON** (`kinetica-plan`, include il profilo; all'import gli id vengono rigenerati, niente sovrascritture).

### Profili

- Pagina Profili rifatta: card, creazione con modulo (niente finestre del browser), duplica, elimina con conferma; il cambio profilo salva automaticamente quello aperto.

## 1.0.0 — 2026-08-26

Prima versione pubblica.

- Motore PK Bateman / flip-flop + gel/cerotto a ordine zero, superposition, blend Sustanon/Omnadren, Vermeulen, adattamento ±% da laboratorio.
- Editor a tracce (libreria, grafico, clip, ispettore) con scatto 0,5 giorni.
- Catalogo a cluster, frequenze QID–E12W, preset TRT/HRT, confronto protocolli.
- Salvataggio locale, export HTML/PDF/stampa/CSV.
- Pagina Informazioni (autore, cosa fa, diritti, avvertenza).
- Installer Windows NSIS x64.
