# Sicurezza

Kinetica è un’app desktop **offline**. Non elabora pagamenti, non ha account, non espone un server e non richiede telemetria o risorse web per funzionare.

## Segnalare una vulnerabilità

Scrivere in privato a **info.dottdanielegabrovec@gmail.com** (non aprire una issue pubblica se la falla è sfruttabile).

## Ambito

In ambito: esecuzione di codice non atteso da un file JSON di libreria, path traversal sui dialoghi di export, dipendenze Electron/Chromium, evasione del renderer e integrità degli asset pubblicati.

Fuori ambito: «le curve PK non coincidono con il mio prelievo» (è il modello, non una CVE).

## Confini applicativi

- Il renderer usa `contextIsolation` e sandbox; Node.js non è esposto alla UI.
- I canali IPC verificano origine e frame chiamante, e accettano payload limitati e validati.
- Navigazione, nuove finestre, permessi e link esterni seguono liste consentite ristrette.
- I report standalone sfuggono i contenuti dinamici e usano una CSP senza script o connessioni di rete.
- Archivio e import hanno limiti di dimensione, numerosità e intervallo; un file futuro o non valido non viene normalizzato silenziosamente.

## Integrità delle release

Ogni release Windows include un checksum SHA-256. I binari creati dalla pipeline GitHub dispongono di attestazione di provenienza verificabile con `gh attestation verify`.

L’installer non è firmato Authenticode. Un avviso SmartScreen non dimostra né esclude l’integrità: verificare checksum e attestazione dalla release ufficiale. L’acquisto e la custodia di un certificato di firma restano un requisito esterno al repository.

## Dati locali e recupero

L’archivio vive in `%APPDATA%\Kinetica\library.json`. Le scritture usano file temporaneo e rinomina atomica; vengono mantenuti backup/copie di recupero. Nessun dato reale è richiesto per i test: le suite usano directory temporanee e profili sintetici.

## Uso clinico

Il software **non è un dispositivo medico**. Nessuna patch di sicurezza autorizza un uso diagnostico o prescrittivo.
