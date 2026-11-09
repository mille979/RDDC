# RDDC – catalogo collezione vintage

App web installabile (PWA): funziona offline, dati salvati sul telefono (IndexedDB).

## Installazione su Android (5 minuti)
1. Crea un repository GitHub (anche privato non va: per Pages gratuito serve pubblico) e carica TUTTI i file di questa cartella.
2. Settings → Pages → Branch `main` / root → Save. Dopo un minuto l'app è su `https://TUONOME.github.io/REPO/`.
3. Apri il link con Chrome su Android → menu ⋮ → **Installa app / Aggiungi a schermata Home**.
(In alternativa: Netlify Drop, Cloudflare Pages, o qualunque hosting statico HTTPS.)

## Cosa si può schedare
- **Computer e dispositivi** (Apple con dati da EveryMac, altre marche da Wikipedia)
- **Televisori e monitor CRT**: pollici, tubo (Trinitron…), PAL/NTSC, 50/100 Hz, ingressi SCART/RF, audio, televideo, telecomando
- **Accessori, caricabatterie, cavi**: compatibilità, connettore, uscita V/A/W, lunghezza, quantità e «Va con» (collega l'accessorio a un oggetto della collezione, che lo mostra nella sua scheda)
- Per tutti: **colore** (riconosciuto in automatico dai dati EveryMac, es. Blueberry → Mirtillo) e **luogo** (scelta rapida *Damiano* / *Alex*)

## Wishlist
In alto, accanto a «RDDC», si passa da **Collezione** a **Wishlist**. Gli oggetti cercati hanno la stessa scheda (dati da EveryMac/Wikipedia, foto, colore) più priorità, budget massimo, link all'annuncio e note; la lista è raggruppata per priorità e mostra il budget totale.
Dalla scheda: «Cerca su eBay / Subito», avviso se ce l'hai già, e **«✅ Preso!»** per spostarlo in collezione.

## Database su GitHub (collezione condivisa tra telefoni)
**Automatico (consigliato)** – Menu → «🔑 Salvataggio automatico su GitHub»: incolla un *token* e l'app sincronizza da sola, in entrambe le direzioni (all'avvio, dopo ogni modifica e quando chiudi l'app). Ogni sincronizzazione è un solo commit; le foto vanno in `foto/` (una volta sola ciascuna) e `collezione.json` resta leggero. Le eliminazioni arrivano anche sugli altri telefoni.
Per creare il token: <https://github.com/settings/personal-access-tokens/new> → *Only select repositories* → questo repository → *Repository permissions* → **Contents: Read and write** → *Generate token*.

**Manuale** – Menu → «Esporta collezione.json», poi su GitHub *Add file → Upload files*. Chi non ha il token (solo lettura) riceve comunque tutto all'avvio.

Le modifiche vengono unite **campo per campo**: se sui due telefoni si cambiano campi diversi dello stesso oggetto (es. luogo da una parte, note dall'altra) si tengono entrambe; sullo stesso campo vince la modifica più recente. Le foto e gli allegati che non usa più nessuno vengono tolti dal repository alla sincronizzazione.
⚠️ Il repository è pubblico (serve per GitHub Pages): `collezione.json` e le foto sono leggibili da chiunque conosca l'indirizzo.

## Museo 🏛️
Il pulsante 🏛️ accanto a «RDDC» apre il **museo virtuale**: una sala per decennio con gli oggetti in vetrina su scaffali di legno, illuminati da faretti, con targhetta. Si entra con un'apertura a iride dal pulsante e i faretti si accendono scaffale per scaffale. Tocca un oggetto e «vola» sul **piedistallo**, illuminato dal basso (scorri per passare al successivo, ⓘ apre la scheda); ▶︎ avvia la **visita guidata** automatica (lo schermo resta acceso: ideale per un tablet accanto alla collezione). Gli oggetti scontornati hanno un leggero effetto 3D e ruotano un po' inclinando il telefono. Gli accessori non vanno in vetrina.

Le foto vengono **scontornate in automatico** quando lo sfondo è chiaro e uniforme (come quelle di EveryMac); altrimenti l'oggetto compare come foto incorniciata. Dalla scheda, «🏛️ Scontorno per il museo» permette di regolare la sensibilità o di importare un'immagine già scontornata col telefono (Google Foto: tieni premuto sull'oggetto; Samsung: Galleria → Estrai oggetto).

## Accessori e ricambi: dati online
**+** → «🔌 Cerca un accessorio o un ricambio» (o «Cerca dati online» → *Accessorio / ricambio*). Scrivi il codice stampato sotto l'oggetto (A1424, M5769), un codice prodotto (MD827ZM/A), un codice a barre o il nome; l'app interroga insieme:
- **Dizionario RDDC** (offline): alimentatori MagSafe/USB-C/USB, mouse, tastiere, trackpad, EarPods, AirPort, telecomandi… con watt, connettore e compatibilità
- **The Apple Wiki**: dal numero A (es. A1523) al modello, identificativo e codice d'ordine (AirPods, iPod, Apple Watch…)
- **Wikipedia**: anche dentro le pagine che raccolgono più modelli (tutti i mouse, tutte le tastiere, MagSafe, AirPort…) l'app trova e usa **solo la sezione del modello giusto** (es. «Apple pointing devices › Magic Mouse – 2nd generation (A1657)»)
- **iFixit**: descrizione, identificazione e specifiche
- **Icecat**: catalogo prodotti in italiano per codice prodotto o codice a barre (solo per le marche che aderiscono al catalogo libero, es. Philips e Samsung; Apple e Logitech no)

Ogni risultato mostra da quale fonte arriva; nell'anteprima si vede la fonte prima di usare i dati.

## Più pezzi identici: gli esemplari
Due mouse uguali, uno funzionante e uno rotto? Non servono due schede: nella scheda dell'oggetto, sezione **Esemplari**, «Dividi in N esemplari» (se la quantità è più di 1) o «Aggiungi un secondo esemplare». I dati del modello (anno, specifiche, foto, descrizione) restano in comune; ogni esemplare ha i suoi: **funzionamento, condizione estetica, scatola, numero di serie (decodificato), luogo, prezzo pagato, note** e un'etichetta per riconoscerlo.
- La quantità si aggiorna da sola; nella lista compare «🧩 2 esemplari · 1 funzionante, 1 non funzionante»
- I filtri per stato, luogo e scatola trovano l'oggetto se **almeno un esemplare** corrisponde
- «Separa» trasforma un esemplare in un oggetto a sé; eliminando gli esemplari fino a uno, la scheda torna normale
- Doppioni già inseriti come oggetti separati: selezionali e usa **«⧉ Unisci come esemplari»** (foto, allegati, interventi ed etichette vengono riuniti; c'è «Annulla»)

## Ricerca per nome
In «Cerca dati online» (Apple) si può scrivere il **nome** (iMac G3, PowerBook G4 12, iPod classic…): l'app mostra i modelli corrispondenti con codice e identificativo (elenco preso da The Apple Wiki, scaricato una volta e poi disponibile offline per 30 giorni) e cerca i dati con il codice scelto. Anche nel modulo di un oggetto nuovo, mentre scrivi il nome compaiono suggerimenti: modelli, accessori del dizionario e oggetti che hai già (per evitare doppioni).

## Annunci nella wishlist (Vinted, Subito, eBay…)
Dall'app dell'annuncio: **Condividi → RDDC**, oppure **+** → «🏷️ Da un annuncio» e incolla il link. L'app legge un'anteprima (titolo, prezzo, foto) e permette di creare un **nuovo desiderio** o di aggiungere l'annuncio a uno esistente. Ogni desiderio raccoglie più annunci con foto, prezzo e sito; nella lista compare «🏷️ 2 annunci · da € 90 ✓» (la spunta indica che è nel budget). «↻ Aggiorna prezzi» rilegge gli annunci; con «Preso!» il prezzo dell'annuncio diventa il prezzo pagato.
Le anteprime passano da servizi gratuiti di lettura delle pagine (r.jina.ai, con riserva microlink.io). Vinted di solito funziona; **Subito, eBay e Facebook Marketplace bloccano le letture automatiche** (o chiedono l'accesso), e l'app non prova ad aggirarle.

**Note per ogni annuncio**: per un desiderio generico (es. «MacBook 2008 - 2015») ogni annuncio ha la sua **configurazione** (es. «Retina 15" 2014, i7, 16 GB»), le **caratteristiche** da toccare (caricabatterie incluso, con scatola, graffi, da testare, trattabile…) e le **tue note** («graffi sul coperchio», «chiedere i cicli della batteria»). Si inseriscono quando aggiungi l'annuncio o con ✎ sulla scheda; compaiono sotto l'annuncio e si trovano con la ricerca.

**Da screenshot** (per Subito, eBay, Marketplace o qualunque sito): fai uno **screenshot lungo** dell'annuncio e condividilo con RDDC («🏷️ È lo screenshot di un annuncio»), oppure scegli «📷 Leggi i dati da uno screenshot» nella pagina dell'annuncio. Il testo viene letto **sul telefono** (OCR in italiano; la prima volta si scaricano circa 5 MB, poi resta in memoria) e l'app ricava titolo, prezzo, descrizione, condizione e luogo, tutti da controllare prima di salvare. La parte alta dello screenshot può diventare la foto del desiderio e lo screenshot intero resta tra gli allegati (utile quando l'annuncio sparisce). Se condividi link e screenshot insieme, il link resta collegato.

## Manutenzione: giro di accensioni e ricariche
Menu → «🔌 Manutenzione» (o dalla scheda **Oggi**): luogo per luogo, segni ⚡ acceso, 🔋 caricato o ✗ non si accende (che segna «Da riparare» e scrive nel registro interventi). Ogni oggetto, o ogni singolo esemplare, ricorda **ultima accensione** e **ultima carica**, con lo storico.
- Promemoria ogni **6 mesi** (modificabili in Impostazioni; per un oggetto anche 3/12 mesi o «Mai»)
- **Batteria**: ricaricabile, tampone PRAM/BIOS (con l'avviso di controllare che non perda) o nessuna; **stato della batteria**: nuova, buona, regge, tampona ma non regge, morta, assente. La ricarica viene chiesta solo per le batterie ricaricabili non morte né assenti; i fissi fanno solo il giro di accensione
- Fuori dal giro: oggetti «In uso», «Ricambi», accessori senza batteria e wishlist
- **Notifiche**: «🔔 Notifiche sul telefono» in Impostazioni, se il telefono permette i controlli in background; il modo più affidabile è **Google Calendar**: a ogni sincronizzazione l'app aggiorna `calendario.ics` (accensioni, ricariche, interventi, rientri dei prestiti, scadenze delle garanzie) da aggiungere una volta sola in Google Calendar → «Da URL»

## Laboratorio: collaudi, progetti di restauro, lista della spesa
Menu → «🛠️ Laboratorio» (o dalla scheda **Oggi**, o dalla sezione «Laboratorio» di ogni scheda).
- **Collaudo** 🧪: una lista di prove adatta al tipo di oggetto (portatile/fisso, server, CRT, console portatile o da tavolo, telefono, accessorio, ricambio). Per ogni voce ✓ funziona, ✗ non funziona (con «cosa non va») o – non applicabile; alcune voci hanno una misura (cicli e capacità della batteria, ore del disco, temperature…). Le voci aggiunte a mano restano per i collaudi successivi dello stesso tipo.
  - Tutto ok → propone «Funzionante». Con dei guasti → segna «Da riparare» e apre un **progetto di restauro** con una fase per ogni guasto (o li aggiunge al progetto già aperto).
  - Se «Si accende» è ok, conta anche come accensione per il giro di manutenzione. Funziona anche per il singolo esemplare.
  - **📅 Pianifica collaudo**: compare in Oggi, negli interventi in programma e nel calendario; quando lo fai, viene registrato con l'esito.
- **Progetto di restauro** 🛠️: parte da un modello (revisione completa, batteria e pulizia del portatile, upgrade RAM/SSD, revisione CRT, console portatile, retrobright, riparazione, libero) e ha:
  - stato (da iniziare, in corso, in attesa pezzi, in pausa, finito), fasi da spuntare e riordinare, scadenza facoltativa (va nel calendario);
  - **pezzi e materiali** con prezzo e stato (da comprare → ordinato → arrivato → montato); quando un pezzo arriva può entrare nel **magazzino ricambi**; si possono anche usare ricambi già in magazzino (prima i compatibili);
  - **cronometro** ⏱ (uno alla volta, resta acceso anche chiudendo l'app) e tempo aggiunto a mano;
  - **guide iFixit**: cerca le guide per l'oggetto (se il nome completo non dà risultati riprova con uno più corto) e le aggiunge al progetto con i pezzi (nella lista della spesa) e gli attrezzi;
  - **foto prima/dopo** con confronto a tendina; note.
  - **Concludi il progetto**: scrive l'intervento nel registro (fasi fatte, pezzi, tempo, costo), segna come montati i ricambi del magazzino, può aggiungere le foto «dopo» alla galleria e propone il **collaudo finale**.
- **Lista della spesa** 🛒: tutti i pezzi da comprare e ordinati dei progetti aperti, con totale stimato, ricerca su eBay, «Ordinato» / «È arrivato» e condivisione della lista.
- Filtro «Laboratorio» (in restauro, da collaudare, collaudato, mai collaudato), etichetta sulle schede con un progetto aperto, statistiche del laboratorio (progetti finiti, ore di lavoro, spesa in pezzi, collaudi). Le foto prima/dopo si sincronizzano su GitHub come le altre foto.

## Oggi
In cima alla collezione, la scheda **☀︎ Oggi** riassume cosa c'è da fare: oggetti da accendere o ricaricare, progetti aperti (e cronometro acceso), oggetti da collaudare, pezzi da comprare o in arrivo, interventi e collaudi in programma, oggetti fuori casa, garanzie in scadenza, annunci con prezzo sceso.

## Ruolo e raccolte
- **Ruolo**: Collezione, **In uso** (es. il computer di tutti i giorni: niente inventario, museo e «da completare», con scadenza della garanzia e «Ritira in collezione»), Ricambi, Da vendere
- **Raccolta** (es. Apple, Console, Server): filtro, raggruppamento, statistiche e **sale del museo**
- Ogni esemplare ha anche il suo **«Va con»** (es. due telecomandi uguali: uno con l'Apple TV, uno sciolto)
- «Altra marca» in «Cerca dati online» usa anche le sezioni delle pagine Wikipedia che raccolgono più modelli

## Gestione della collezione
- **Selezione multipla**: «☑︎ Seleziona» sopra la lista (o dall'anteprima con pressione lunga), tocca gli oggetti e usa la barra in basso: cambia **luogo**, **stato**, **etichette** (aggiungi/togli), segna come **verificati** o **elimina** (con «Annulla»). «Tutti» seleziona quelli filtrati.
- **Confronto affiancato** di 2 o 3 oggetti: dalla selezione «⇆ Confronta», o dalla scheda «⇆ Confronta con…». «Mostra solo le differenze» nasconde le righe uguali.
- **Inventario** (Menu → 📋 Inventario): scegli un luogo e per ogni oggetto segna ✓ c'è, ✗ non trovato o ↪︎ è altrove (sceglie il nuovo luogo). Si può interrompere e riprendere; alla fine il riepilogo permette di aggiungere #Da cercare ai non trovati. Ogni oggetto ricorda la data dell'ultima verifica.
- **Storico spostamenti**: ogni cambio di luogo (dal modulo, in blocco, dall'inventario o collegando un accessorio) resta nella scheda, in «Spostamenti».
- **Numero di serie Apple**: sotto il seriale la scheda mostra fabbrica e periodo di produzione (formati a 11 e 12 caratteri, fino al 2021; indicativo), con un avviso se non torna con l'anno del modello.
- **Magazzino ricambi**: tipologia «Ricambio» con categoria (RAM, batteria, alimentatore…), specifica, computer compatibili della collezione e altri modelli compatibili (codici, Model ID). La scheda di ogni computer elenca i ricambi in magazzino che vanno bene (sicuri e probabili); «🔧 Monta su…» registra l'intervento sul computer e scala la quantità.
- **Statistiche**: spesa per anno di acquisto, valore per luogo, da quanto possiedi gli oggetti, verifiche dell'inventario. Nuovi ordinamenti: valore, rivalutazione, acquistati di recente, posseduti da più tempo.

## Animazioni
Le schermate entrano scorrendo da destra e escono all'indietro; aprendo un oggetto dalla lista la sua foto «vola» nella scheda (e torna al suo posto chiudendola). Mentre l'app lavora compaiono piccole animazioni: un Macintosh che legge la scheda EveryMac e la passa all'app, una lente d'ingrandimento che scorre un annuncio fino al prezzo, un telefono con un raggio che legge lo screenshot (con avanzamento) e un mappamondo per le ricerche online. Se nel telefono è attiva «Riduci animazioni», l'app le disattiva.

## Altro
- **In italiano**: etichette, valori e date importati da EveryMac e Wikipedia sono mostrati in italiano (dizionario integrato, offline). Le descrizioni e le frasi lunghe vengono tradotte **una volta sola**, in automatico, e la traduzione resta salvata e sincronizzata; l'originale si vede con «Mostra originale». Le traduzioni dell'arretrato sono già pronte in `traduzioni.json`; per i testi nuovi l'app usa il traduttore del telefono, se disponibile, o il servizio gratuito MyMemory (circa 5.000 caratteri al giorno: se il limite è raggiunto riprova da sola più tardi). Si può disattivare in Menu → Impostazioni.
- **Condividi → RDDC**: da Galleria Samsung, Google Foto o qualunque app, «Condividi» → RDDC; l'app chiede se creare un oggetto nuovo o aggiungere le foto (e i PDF come allegati) a uno esistente. Se RDDC non compare tra le app di condivisione, rimuovi l'app dalla schermata Home e reinstallala da Chrome (Android legge la nuova impostazione all'installazione). Le foto in formato HEIC vengono convertite in JPEG (il convertitore si scarica solo la prima volta che serve).
- **Foto**: nel modulo si possono trascinare le foto (dal computer o da un'altra app) o incollarle; si riordinano trascinandole (col dito: tieni premuto e sposta). La prima è la **copertina**: ★ su una miniatura, o «Usa come copertina» nel visualizzatore della scheda.
- **Da completare**: ogni scheda segnala i dati essenziali mancanti (foto, anno, marca, luogo, stato e, a seconda del tipo, modello/CPU/RAM, pollici o «Va con»). Se un dato non esiste o non si saprà mai, toccane «non si sa»: non conta più come mancante e compare «sconosciuto». Filtro «Completezza» e contatore in alto.
- **Etichette libere** (#Preferito, #Raro, #Da restaurare… o nuove), filtrabili.
- **Allegati** nella scheda: manuali PDF, ricevute, foto dell'interno, video (max 15 MB ciascuno); con il token GitHub vanno in `allegati/`.
- **Prestiti ed esposizioni**: a chi o dove, dal, rientro previsto, note; avviso in cima alla lista (rosso se in ritardo), «È rientrato» e storico.
- **Valore nel tempo**: ogni valutazione (data, valore, come è stata stimata) resta nello storico; la scheda mostra il grafico, lo scarto dal prezzo pagato e un link ai venduti su eBay. Cambiare il «valore stimato» nel modulo aggiunge da solo una valutazione. In Statistiche: valore della collezione contro speso nel tempo e oggetti più rivalutati.
- **Tema**: 🌙/☀️ in alto per passare al volo da chiaro a scuro; in Menu → Impostazioni anche «Automatico» (segue il telefono).
- **Anteprima rapida**: tieni premuto un oggetto nella lista per vedere foto, dati principali e azioni (apri, modifica, piedistallo, elimina).
- **Icona ☁︎ di sincronizzazione** (con il token GitHub): frecce che girano mentre sincronizza, spunta quando ha finito, freccia per le modifiche da inviare, «!» in caso di errore; toccala per sincronizzare subito.
- **Doppioni**: per periferiche identiche di due computer, «📋 Copia accessori da…» nella scheda del computer e «✂️ Dividi» sugli accessori con quantità maggiore di 1.
- **Viste**: il pulsante accanto alla ricerca alterna Lista, Griglia (foto grandi) e Linea del tempo.
- **Registro interventi** nella scheda di ogni oggetto (pulizia, condensatori, batteria PRAM…), con costi e promemoria; quelli in scadenza compaiono in cima alla lista.
- **Catalogo PDF**: Menu → «Catalogo PDF» → nella stampa scegli «Salva come PDF».
- **Annulla**: dopo «Elimina» c'è qualche secondo per ripristinare l'oggetto.

## Incollare i dati da EveryMac (metodo consigliato)
Quando la ricerca automatica non riesce a leggere EveryMac:
1. **+** → «Incolla la scheda da EveryMac» (oppure dalla ricerca online / dalla scheda: «📋 Incolla da EveryMac»)
2. Apri la pagina del modello su EveryMac (c'è il pulsante «Apri ↗»)
3. Tieni premuto su una parola → **Seleziona tutto** → **Copia** e incolla nel riquadro.
   Va bene anche copiare solo la tabella, oppure salvare la pagina (Chrome ⋮ → ⬇︎ Scarica) e caricarla con «Carica pagina salvata»: il file `.mhtml` contiene anche la foto.

Vengono letti: nome, linea, codici (Axxxx/Mxxxx, EMC, Model ID, n° ordine), date, CPU, RAM, archiviazione, grafica, display, sistema operativo, connettività, porte, batteria, dimensioni (convertite in cm), peso, prezzo USA e Italia, descrizione, colore e tutte le altre specifiche.

## Recupero automatico da EveryMac
EveryMac non permette richieste dirette da altri siti (CORS) e i proxy pubblici gratuiti ormai sono a pagamento o bloccati: per la ricerca automatica serve un proxy tuo, gratuito, su Cloudflare Workers (5 minuti, istruzioni anche nell'app):

```js
export default {
  async fetch(req) {
    const u = new URL(req.url).searchParams.get('url') || '';
    const h = {'Access-Control-Allow-Origin': '*'};
    if (!/^https:\/\/(www\.)?everymac\.com\//.test(u)) return new Response('Solo everymac.com', {status: 403, headers: h});
    const r = await fetch(u, {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept-Language': 'en-US,en'}, cf: {cacheTtl: 86400}});
    return new Response(r.body, {status: r.status, headers: {...h, 'Content-Type': r.headers.get('Content-Type') || 'text/html', 'Cache-Control': 'public, max-age=86400'}});
  }
}
```
Nell'app basta incollare l'indirizzo del worker (es. `https://rddc.tuonome.workers.dev`) in Menu → Impostazioni e premere «Prova la ricerca». Il codice si copia anche direttamente dall'app.

## Prove automatiche
`npm test` avvia l'app in Chromium (Playwright) e controlla le funzioni principali, compresa la sincronizzazione con una finta API GitHub. Le prove partono da sole su ogni pull request (GitHub Actions, `.github/workflows/test.yml`).

## Backup
I dati stanno solo sul dispositivo: Menu → "Esporta backup completo" ogni tanto (include le foto).
