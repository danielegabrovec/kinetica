# Changelog

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
