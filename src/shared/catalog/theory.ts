export const DISCLAIMER = `Kinetica è uno strumento di **simulazione** per uso professionale ed educativo. Non è un dispositivo medico, non prescrive, non sostituisce il giudizio clinico né gli esami di laboratorio.

I parametri (t½, Tmax, Cmax, F) arrivano da studi pubblicati, Riassunti delle caratteristiche del prodotto o — se manca la PK umana — da estrapolazioni etichettate **evidenza C**. La variabilità interindividuale è ampia (metabolismo, sito di iniezione, veicolo, SHBG, peso). La banda di incertezza è una forchetta onesta, non un intervallo di predizione bayesiano.

Non usare queste curve per iniziare, modificare o sospendere una terapia.`

export const THEORY_PAGES: { id: string; title: string; body: string }[] = [
  {
    id: 'modello',
    title: 'Come funziona il modello',
    body: `Kinetica non assume che il livello salga **istantaneamente** al picco. Per i depositi (esteri IM, molte SC) usa una curva di Bateman a due costanti:

\`C(t) = A × [exp(-k_lenta × t) - exp(-k_rapida × t)]\`

- **k_lenta** viene dalla t½ apparente di letteratura (per gli esteri IM è l’assorbimento dal deposito, non l’eliminazione del T libero).
- **k_rapida** è scelta in modo che il **Tmax** coincida con i dati.
- **A** è scalata sul **Cmax** dello studio di riferimento, poi in proporzione alla dose e al peso (Vd ∝ peso/70 kg).

Più dosi: **sovrapposizione lineare** (superposition). Un blend (Sustanon) è la somma dei Bateman dei componenti.

Gel e cerotti usano un modello a **infusione a ordine zero** per le ore di assorbimento, poi washout.

Cosa **non** è: un modello di popolazione NONMEM, un PBPK, un predittore di HCT/PSA/fertilità.`
  },
  {
    id: 'esteri',
    title: 'Esteri e yield',
    body: `Un estere C17β rende la molecola più lipofila: in olio forma un deposito. Le esterasi liberano l’ormone. La catena più lunga → rilascio più lento (van der Vies).

Yield (ormone / estere):

- propionato ~84%
- enantato ~72%
- cipionato ~70%
- decanoato ~65%
- undecanoato ~63%

100 mg di enantato non sono 100 mg di testosterone. Il grafico è calibrato sul Cmax della *preparazione*, lo yield serve a leggere la dose “vera” e l’equivalente giornaliero.

Il veicolo conta: TU in olio di ricino t½ ~34 d; in tea seed ~21 d. Sono due formulazioni distinte nel catalogo.`
  },
  {
    id: 'frequenze',
    title: 'Frequenza e steady state',
    body: `A parità di dose settimanale, un estere **corto** ha meno accumulo: il livello medio a ss è più basso di un estere lungo (stesso mg), perché si elimina tra una dose e l’altra. Non è un bug del grafico.

Regola pratica: intervallo di dosaggio ≲ t½ apparente → valli più alte. Per questo 50 mg di enantato ogni 3,5 giorni è più “piatto” di 100 mg una volta a settimana.

Steady state: circa 4–5 emivite. Nebido ci arriva in mesi; il propionato in pochi giorni.`
  },
  {
    id: 'libero',
    title: 'Testosterone libero (Vermeulen)',
    body: `Se nel profilo paziente inserisci **SHBG** (e albumina, default 4,3 g/dL), Kinetica calcola il T libero con la formula di Vermeulen 1999. È lo stesso approccio di molti laboratori, con i limiti noti (non vale in gravidanza, non sostituisce l’equilibrio di dialisi).

L’E2 “stimato da T” è una frazione molare fissa (~0,4%): serve a non dimenticare l’aromatizzazione, non a predire l’E2 di quel paziente.`
  },
  {
    id: 'unita',
    title: 'Unità',
    body: `Toggle SI / convenzionali.

- Testosterone: nmol/L ↔ ng/dL (× 28,84)
- Estradiolo: pmol/L ↔ pg/mL (÷ 3,671)
- Progesterone: ng/mL (laboratorio italiano frequente)

hCG resta in mIU/L, incretine in µg/L o ng/mL come da studi.`
  },
  {
    id: 'limiti',
    title: 'Limiti onesti',
    body: `1. Linearità: raddoppiare la dose raddoppia la curva. Alcuni farmaci no (saturazione). Steroidplotter ha una regressione per TE/TC; qui preferiamo linearità + nota in scheda.
2. Sito di iniezione, volume, olio: non modellati (v2).
3. Binding: solo Vermeulen se dai SHBG.
4. PD vera (recettori, HCT, libido): fuori perimetro. Sta nelle monografie come testo.
5. Evidenza C: la curva è un disegno qualitativo.`
  },
  {
    id: 'glossario',
    title: 'Glossario',
    body: `**Cmax** concentrazione massima. **Tmax** tempo del picco. **t½** tempo per dimezzare dopo la fase terminale. **MRT** tempo medio di residenza. **AUC** area sotto la curva. **Cavg** AUC / tempo. **Peak/trough** Cmax/Cmin. **Fluctuation** (Cmax−Cmin)/Cavg. **TIR** frazione di tempo nella banda. **F** biodisponibilità. **ka/ke** costanti di assorbimento/eliminazione. **Flip-flop** quando l’assorbimento è più lento dell’eliminazione: la t½ che vedi è ka, non ke.`
  }
]
