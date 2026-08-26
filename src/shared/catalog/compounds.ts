import type { Compound } from '../types'
import { FORMULATIONS } from './formulations'

function ids(compoundId: string): string[] {
  return FORMULATIONS.filter((f) => f.compoundId === compoundId).map((f) => f.id)
}

export const COMPOUNDS: Compound[] = [
  {
    id: 'testosterone',
    inn: 'Testosterone',
    aliases: ['T', 'TRT', 'Nebido', 'Sustanon', 'Testogel'],
    cluster: 'testosterone',
    classLabel: 'Androgeno endogeno',
    formulationIds: ids('testosterone'),
    monograph: `Il testosterone è l’androgeno principale maschile. La molecola libera ha emivita di minuti: gli **esteri in olio** rallentano il rilascio dal deposito IM (cinetica *flip-flop*: l’assorbimento limita l’eliminazione apparente).

**Yield.** Una parte del milligrammo iniettabile è estere, non ormone. Enantato ~72%, cipionato ~70%, propionato ~84%, undecanoato ~63%. Kinetica scala le curve sul Cmax di letteratura della *dose etichettata*, e mostra lo yield come metrica.

**Enantato / cipionato.** t½ apparente 4,5–5 giorni. Un protocollo 100 mg 1×/sett ha picchi e valli; 50 mg 2×/sett riduce il peak/trough a parità di dose settimanale.

**Undecanoato IM (Nebido).** t½ ~34 giorni in olio di ricino. Tmax 7–14 giorni, poco overshoot rispetto a TE/TC.

**Sustanon 250.** Mix 30 mg propionato + 60 mg fenilpropionato + 60 mg isocaproato + 100 mg decanoato. La curva è la **somma** dei quattro Bateman.

**Gel / patch / nasale.** Ingresso transdermico o mucosale, più vicino a un infusione breve che a un deposito oleoso.

Le bande 300–1000 ng/dL (10,4–34,7 nmol/L) sono un riferimento da laboratorio, non un target individuale.`
  },
  {
    id: 'nandrolone',
    inn: 'Nandrolone',
    aliases: ['Deca', 'NPP', '19-nortestosterone'],
    cluster: 'androgens',
    classLabel: '19-nor androgeno',
    formulationIds: ids('nandrolone'),
    monograph: `Il nandrolone è un 19-norandrogeno. Il **decanoato** (Deca-Durabolin) ha t½ apparente ~7,5 giorni; il **fenilpropionato** (NPP) ~1,5 giorni. Stessa dose settimanale: il decanoato accumula di più a steady state.

Uso clinico storico: wasting, anemia. Off-label in altre indicazioni. Aromatizza poco; si riduce a DHN. Non è un sostituto del testosterone per la funzione androgenica piena.`
  },
  {
    id: 'dht',
    inn: 'Androstanolone',
    aliases: ['DHT', 'Andractim'],
    cluster: 'androgens',
    classLabel: 'Androgeno non aromatizzabile',
    formulationIds: ids('dht'),
    monograph: `Il DHT gel (Andractim) non si aromatizza. Utile in contesti di ginecomastia o quando si vuole androgeno periferico senza E2. PK transdermica, evidenza B.`
  },
  {
    id: 'mesterolone',
    inn: 'Mesterolone',
    aliases: ['Proviron'],
    cluster: 'androgens',
    classLabel: 'DHT-derivato orale',
    formulationIds: ids('mesterolone'),
    monograph: `Mesterolone (Proviron): DHT-like orale, non aromatizzabile, t½ ~12 h. Non sopprime l’asse come un estere del T. Curva a dosi ripetute 2–3×/die.`
  },
  {
    id: 'oxandrolone',
    inn: 'Oxandrolone',
    aliases: ['Anavar'],
    cluster: 'androgens',
    classLabel: 'Androgeno orale 17α-alchilato',
    formulationIds: ids('oxandrolone'),
    monograph: `Oxandrolone: 17α-alchilato, t½ ~9–10 h, uso clinico nello wasting. Epatotossicità potenziale. Evidenza A sulla PK, off-label su molti usi.`
  },
  {
    id: 'estradiol',
    inn: 'Estradiolo',
    aliases: ['E2', 'EstroGel', 'Progynova'],
    cluster: 'estrogens',
    classLabel: 'Estrogeno naturale',
    formulationIds: ids('estradiol'),
    monograph: `L’estradiolo 17β è l’estrogeno umano principale. **Orale**: first-pass epatico, più estrone. **Gel/cerotto**: bypass del first-pass, profilo più piatto. **Valerato / cipionato IM**: deposito, analogo concettuale agli esteri del T.

Le bande in grafico sono orientative (fase follicolare): l’indicazione (menopausa, TOM, insufficienza ovarica) cambia il target. Non prescrivere dalla curva.`
  },
  {
    id: 'estriol',
    inn: 'Estriolo',
    aliases: ['E3', 'Ovestin'],
    cluster: 'estrogens',
    classLabel: 'Estrogeno debole',
    formulationIds: ids('estriol'),
    monograph: `Estriolo vaginale: azione locale prevalente, assorbimento sistemico basso ma non nullo. t½ breve.`
  },
  {
    id: 'progesterone',
    inn: 'Progesterone',
    aliases: ['P4', 'Utrogestan'],
    cluster: 'progestins',
    classLabel: 'Progestinico naturale',
    formulationIds: ids('progesterone'),
    monograph: `Il progesterone micronizzato **orale** ha biodisponibilità bassa e metaboliti neuroattivi (allopregnanolone) — sonnolenza. **Vaginale**: meno first-pass, livelli uterini più alti. **IM in olio**: picchi più alti.

t½ apparente ore, non giorni: la frequenza (sera, 1–2×/die) conta più della “mezza vita da depot”.`
  },
  {
    id: 'dydrogesterone',
    inn: 'Didrogesterone',
    aliases: ['Duphaston'],
    cluster: 'progestins',
    classLabel: 'Retroprogesterone',
    formulationIds: ids('dydrogesterone'),
    monograph: `Didrogesterone: orale, poco androgenico, t½ del metabolita ~14–17 h. Spesso 10 mg 1–2×/die nella protezione endometriale.`
  },
  {
    id: 'mpa',
    inn: 'Medrossiprogesterone acetato',
    aliases: ['Provera', 'Depo-Provera'],
    cluster: 'progestins',
    classLabel: 'Progestinico di sintesi',
    formulationIds: ids('mpa'),
    monograph: `MPA orale: t½ ~12–24 h. Depot IM 150 mg: rilascio per 12–13 settimane, t½ apparente molto lunga. Effetti metabolici diversi dal progesterone micronizzato.`
  },
  {
    id: 'cyproterone',
    inn: 'Ciproterone acetato',
    aliases: ['Androcur', 'CPA'],
    cluster: 'progestins',
    classLabel: 'Antiandrogeno / progestinico',
    formulationIds: ids('cyproterone'),
    monograph: `Ciproterone: antiandrogeno steroideo + progestinico. t½ ~38–42 h. Rischio meningioma a dosi alte e durate lunghe: va nel testo, non nel modello.`
  },
  {
    id: 'hcg',
    inn: 'Gonadotropina corionica umana',
    aliases: ['Gonasi', 'Pregnyl'],
    cluster: 'axis',
    classLabel: 'Analogo LH',
    formulationIds: ids('hcg'),
    monograph: `hCG stimola le cellule di Leydig (LH-like). t½ ~24–36 h: 2–3×/sett è tipico. La curva è di **hCG sierico**, non di T indotto (il T indotto dipende dalla riserva leydigiana: non è in questo modello).`
  },
  {
    id: 'anastrozole',
    inn: 'Anastrozolo',
    aliases: ['Arimidex'],
    cluster: 'axis',
    classLabel: 'Inibitore aromatasi non steroideo',
    formulationIds: ids('anastrozole'),
    monograph: `Anastrozolo: t½ ~46 h. La curva è del farmaco, **non** dell’E2 soppresso. L’effetto PD sull’E2 è dose-risposta non lineare e non è simulato in v1.`
  },
  {
    id: 'letrozole',
    inn: 'Letrozolo',
    aliases: ['Femara'],
    cluster: 'axis',
    classLabel: 'Inibitore aromatasi',
    formulationIds: ids('letrozole'),
    monograph: `Letrozolo: t½ ~2 giorni, soppressione E2 più marcata dell’anastrozolo a dosi standard. Stessa avvertenza: curva = farmaco, non E2.`
  },
  {
    id: 'exemestane',
    inn: 'Exemestane',
    aliases: ['Aromasin'],
    cluster: 'axis',
    classLabel: 'Inibitore aromatasi steroideo (suicida)',
    formulationIds: ids('exemestane'),
    monograph: `Exemestane: inattivatore steroideo, t½ ~24 h. Irreversibile sull’aromatasi: l’effetto PD dura più della presenza del farmaco.`
  },
  {
    id: 'tamoxifen',
    inn: 'Tamoxifene',
    aliases: ['Nolvadex'],
    cluster: 'axis',
    classLabel: 'SERM',
    formulationIds: ids('tamoxifen'),
    monograph: `Tamoxifene: t½ 5–7 giorni, metabolita attivo endoxifene (CYP2D6). Accumulo lento. Curva del parent.`
  },
  {
    id: 'clomiphene',
    inn: 'Clomifene',
    aliases: ['Clomid'],
    cluster: 'axis',
    classLabel: 'SERM misto',
    formulationIds: ids('clomiphene'),
    monograph: `Racemo di enclomifene (trans, t½ breve) e zuclomifene (cis, t½ lunga). La curva unica è una semplificazione.`
  },
  {
    id: 'enclomiphene',
    inn: 'Enclomifene',
    aliases: ['Androxal'],
    cluster: 'axis',
    classLabel: 'SERM',
    formulationIds: ids('enclomiphene'),
    monograph: `Enantiomero trans del clomifene, t½ ~10 h, usato off-label per stimolare LH/FSH/T endogeno.`
  },
  {
    id: 'finasteride',
    inn: 'Finasteride',
    aliases: ['Propecia', 'Proscar'],
    cluster: 'axis',
    classLabel: 'Inibitore 5α-reduttasi tipo II',
    formulationIds: ids('finasteride'),
    monograph: `t½ plasmatica ~6–8 h, ma l’effetto tissutale sul DHT dura di più. Curva = farmaco, non DHT.`
  },
  {
    id: 'dutasteride',
    inn: 'Dutasteride',
    aliases: ['Avodart'],
    cluster: 'axis',
    classLabel: 'Inibitore 5α-reduttasi I e II',
    formulationIds: ids('dutasteride'),
    monograph: `t½ ~5 settimane a steady state. Accumulo importante: 3–6 mesi per ss.`
  },
  {
    id: 'levothyroxine',
    inn: 'Levotiroxina',
    aliases: ['T4', 'Eutirox'],
    cluster: 'thyroid',
    classLabel: 'Ormone tiroideo',
    formulationIds: ids('levothyroxine'),
    monograph: `T4: t½ ~7 giorni, ss in 4–6 settimane. La curva è un proxy di fT4, non un modello di conversione T4→T3.`
  },
  {
    id: 'liothyronine',
    inn: 'Liotironina',
    aliases: ['T3', 'Ti-tre'],
    cluster: 'thyroid',
    classLabel: 'Ormone tiroideo',
    formulationIds: ids('liothyronine'),
    monograph: `T3: t½ ~1 giorno, picchi e valli se 1×/die — per questo spesso 2×/die. Non combinare le scale T3 e T4 sullo stesso asse come se fossero uguali.`
  },
  {
    id: 'semaglutide',
    inn: 'Semaglutide',
    aliases: ['Ozempic', 'Wegovy'],
    cluster: 'incretins',
    classLabel: 'GLP-1 RA',
    formulationIds: ids('semaglutide'),
    monograph: `Semaglutide SC: t½ ~7 giorni, 1×/sett. Accumulo fino a 4–5 settimane. PK ben caratterizzata (evidenza A).`
  },
  {
    id: 'tirzepatide',
    inn: 'Tirzepatide',
    aliases: ['Mounjaro', 'Zepbound'],
    cluster: 'incretins',
    classLabel: 'GIP/GLP-1 RA',
    formulationIds: ids('tirzepatide'),
    monograph: `Tirzepatide: t½ ~5 giorni, 1×/sett. Titration lenta (2,5 → 15 mg) è pratica clinica, non un output del modello.`
  },
  {
    id: 'liraglutide',
    inn: 'Liraglutide',
    aliases: ['Saxenda', 'Victoza'],
    cluster: 'incretins',
    classLabel: 'GLP-1 RA',
    formulationIds: ids('liraglutide'),
    monograph: `Liraglutide: t½ ~13 h, 1×/die. Confronto naturale con semaglutide settimanale sulla vista Confronta.`
  },
  {
    id: 'somatropin',
    inn: 'Somatropina',
    aliases: ['GH', 'Genotropin'],
    cluster: 'gh',
    classLabel: 'GH ricombinante',
    formulationIds: ids('somatropin'),
    monograph: `GH SC serale: picco in 3–6 h, t½ breve. IGF-1 (vero marker PD) non è in questa versione: troppa fisiologia in mezzo.`
  },
  {
    id: 'cjc1295',
    inn: 'CJC-1295',
    aliases: ['Mod GRF', 'CJC no DAC'],
    cluster: 'gh',
    classLabel: 'GHRH analog',
    formulationIds: ids('cjc1295'),
    monograph: `Senza DAC l’emivita è di minuti. Evidenza C. La curva serve a ragionare sulla frequenza, non a predire IGF-1.`
  },
  {
    id: 'ipamorelin',
    inn: 'Ipamorelin',
    aliases: [],
    cluster: 'gh',
    classLabel: 'GHRP / ghrelin mimetic',
    formulationIds: ids('ipamorelin'),
    monograph: `Secretagogo GH, t½ ~2 h. Evidenza C nell’umano.`
  },
  {
    id: 'bpc157',
    inn: 'BPC-157',
    aliases: ['Body protection compound'],
    cluster: 'peptides',
    classLabel: 'Peptide research',
    formulationIds: ids('bpc157'),
    monograph: `Nessuna PK umana di qualità. Incluso solo come scheda research con badge evidenza C. Non usare i numeri per decisioni.`
  },
  {
    id: 'rad140',
    inn: 'RAD-140',
    aliases: ['Testolone'],
    cluster: 'sarms',
    classLabel: 'SARM',
    formulationIds: ids('rad140'),
    monograph: `SARM sperimentale. PK umana scarsa. Evidenza C. Catalogo per completezza rispetto ai plotter esistenti, non come endorsement.`
  }
]
