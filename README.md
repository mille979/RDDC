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
**Automatico (consigliato)** – Menu → «☁️ Database su GitHub» → «🔑 Salvataggio automatico su GitHub»: incolla un *token* e l'app sincronizza da sola, in entrambe le direzioni (all'avvio, dopo ogni modifica e quando chiudi l'app). Ogni sincronizzazione è un solo commit; le foto vanno in `foto/` (una volta sola ciascuna) e `collezione.json` resta leggero. Le eliminazioni arrivano anche sugli altri telefoni.
Per creare il token: <https://github.com/settings/personal-access-tokens/new> → *Only select repositories* → questo repository → *Repository permissions* → **Contents: Read and write** → *Generate token*.

**Manuale** – Menu → «💾 Esporta…» → «collezione.json per GitHub», poi su GitHub *Add file → Upload files*. Chi non ha il token (solo lettura) riceve comunque tutto all'avvio.

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
- Promemoria ogni **6 mesi**, già impostati nel modulo di ogni oggetto (modificabili in Impostazioni; per un oggetto anche 3/12 mesi o «Mai»)
- **Batteria**: ricaricabile, tampone PRAM/BIOS (con l'avviso di controllare che non perda) o nessuna; **stato della batteria**: nuova, buona, regge, tampona ma non regge, morta, assente. La ricarica viene chiesta solo per le batterie ricaricabili non morte né assenti; i fissi fanno solo il giro di accensione
- Fuori dal giro: oggetti «In uso», «Ricambi», tutti gli accessori (caricabatterie compresi) e wishlist
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
- **📊 Statistiche** (quarta scheda del Laboratorio): progetti finiti, tempo di lavoro, spesa in pezzi e nel registro, collaudi e percentuale di esiti ok, durata media dei progetti; ore di lavoro, spesa, collaudi e progetti finiti mese per mese; progetti per tipo; guasti più frequenti nei collaudi; gli oggetti che hanno chiesto più lavoro; stato della collezione.
- **Esportazioni CSV** (per Excel / Fogli, separatore «;»): progetti di restauro, pezzi e lista della spesa, collaudi, registro interventi, sessioni di lavoro. Anche da Menu → «🛠️ Esporta il laboratorio (CSV)».
- Filtro «Laboratorio» (in restauro, da collaudare, collaudato, mai collaudato) ed etichetta sulle schede con un progetto aperto. Le foto prima/dopo si sincronizzano su GitHub come le altre foto.

## Oggi
In cima alla collezione, la scheda **☀︎ Oggi** riassume cosa c'è da fare: oggetti da accendere o ricaricare, progetti aperti (e cronometro acceso), oggetti da collaudare, pezzi da comprare o in arrivo, interventi e collaudi in programma, oggetti fuori casa, garanzie in scadenza, annunci con prezzo sceso.

## Ruolo e raccolte
- **Ruolo**: Collezione, **In uso** (es. il computer di tutti i giorni: niente inventario, museo e «da completare», con «Ritira in collezione»), Ricambi, Da vendere; ogni oggetto parte come «Collezione»
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
Le schermate entrano scorrendo da destra e escono all'indietro; aprendo un oggetto dalla lista la sua foto «vola» nella scheda e torna al suo posto chiudendola: è una sola immagine che cambia posizione, misura e angoli, sempre ritagliata come appare, così il ritaglio passa con continuità da quello della miniatura a quello della foto grande (anche con foto orizzontali o verticali). La scheda si chiude anche **tirandola in basso** dalla cima, come nella galleria del telefono: segue il dito rimpicciolendosi (durante il gesto il vetro dentro la pagina si spegne, per restare fluido) e, lasciandola, la foto si posa sulla sua miniatura. Mentre l'app lavora compaiono piccole animazioni: un Macintosh che legge la scheda EveryMac e la passa all'app, una lente d'ingrandimento che scorre un annuncio fino al prezzo, un telefono con un raggio che legge lo screenshot (con avanzamento) e un mappamondo per le ricerche online. Se nel telefono è attiva «Riduci animazioni», l'app le disattiva.

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

## Recupero automatico da EveryMac (worker Cloudflare)
EveryMac non lascia leggere le sue pagine direttamente da un'app web (CORS) e i proxy pubblici gratuiti sono bloccati. Serve un piccolo **worker Cloudflare** tuo, gratuito, che fa da ponte: Menu → «🌐 Ricerca automatica su EveryMac» ha le istruzioni, il codice da copiare e il tasto «Salva e prova».
1. Crea un account gratuito su <https://dash.cloudflare.com/sign-up/workers-and-pages> (non serve la carta di credito).
2. **Compute (Workers) → Workers & Pages → Create → Start with Hello World!**, nome per esempio `rddc`, **Deploy**.
3. **Edit code**: cancella tutto, incolla il codice copiato dall'app, **Deploy**.
4. Copia l'indirizzo (es. `https://rddc.tuonome.workers.dev`), incollalo nell'app e premi **Salva e prova**.

Con il worker collegato l'app usa solo quello (i proxy pubblici restano per chi non l'ha). Il worker accetta solo pagine di everymac.com; il piano gratuito permette 100.000 richieste al giorno (una ricerca ne usa 2–4).
- **Codici vecchi** (Mxxxx, es. M5884): EveryMac li riconosce ma elenca solo i nomi dei modelli, senza link; l'app apre l'indice della famiglia (es. PowerBook G4) e trova da sola la scheda giusta.
- **Condividi → RDDC**: da Chrome su una scheda di EveryMac seleziona tutto il testo e scegli *Condividi → RDDC* (funziona anche senza worker), oppure condividi il link della pagina (serve il worker): si apre l'analisi con la scheda già compilata.
- **RAM e memoria**: lette anche dalle schede di iPhone, iPod e iPad («Onboard RAM», «Storage Capacity») e dei Mac vecchi («Standard Hard Drive»). Quando EveryMac elenca più **tagli** (es. «8, 16 GB», «32 MB, 64 MB»), nel modulo compaiono come scelte rapide sotto Archiviazione e RAM: un tocco aggiorna il campo e, se c'è, anche il nome.
- Trovati i dati, il tasto di ricerca diventa **«✓ Inserisci i dati»** e a sinistra compare un piccolo **↻** per ripetere la ricerca.

## Grafica (2.0): Liquid Glass
- **Icona**: schermo, palmare e ghiera come tre lastre di vetro sovrapposte su fondo grigio scuro neutro (dalla 2.9.1 più scuro, in linea con le icone di sistema) (`icon.svg`, PNG da 192 e 512). C'è la versione «maskable», ritagliabile tonda da Android senza perdere niente, e quella monocromatica per le icone a tema (Android le colora con i colori dello sfondo).
Dalla versione 2.0 l'interfaccia è ridisegnata da capo attorno al vetro liquido, con le stesse funzioni di prima:
- sfondo con macchie di colore morbide (ambra, terracotta, verde), diverse in chiaro e in scuro;
- tutte le superfici (schede della lista, griglia, tabelle, liste, note, campi, pulsanti, finestre) sono di vetro: traslucide, con il bordo luminoso e angoli più tondi;
- titolo grande «Collezione» / «Wishlist», ricerca a capsula e pulsanti tondi con icone disegnate; la sfumatura dietro la ricerca compare solo quando la lista ci scorre sotto;
- barra in basso fluttuante con Collezione/Wishlist (la goccia che scorre) e il pulsante + a parte;
- pagine con intestazione che sfuma e pulsante indietro tondo; intestazioni dei gruppi a capsula.

## Vetro liquido
Barra in alto, pulsante **+**, barra della selezione, avvisi, finestre di conferma, intestazioni delle pagine e pulsanti tondi sopra le foto sono di **vetro liquido**: deformano, sfocano leggermente e illuminano sul bordo quello che ci passa sotto (la lista che scorre, la foto della scheda).
- Il modello WebGL «Liquid Glass» (profilo del bordo a squircle convesso, rifrazione con indice 1,38, dispersione dei colori, riflessi solo sul bordo) calcola per ogni elemento la mappa di rifrazione e quella della luce; il browser le applica all'interfaccia vera con un filtro SVG (`backdrop-filter`). WebGL da solo non può leggere i pixel della pagina, per questo serve il filtro.
- La goccia del selettore Collezione/Wishlist scorre con una molla e si allunga nel verso del moto; il pulsante + e i pulsanti sulle foto si ingrandiscono e rimbalzano quando li premi (la «pressione» del modello).
- Menu → Impostazioni → **Vetro liquido**: Leggero (predefinito, il più fluido), Completo (aggiunge la dispersione dei colori sui bordi, più pesante da calcolare), Spento. La rifrazione vera funziona su Chrome e sui browser basati su Chromium (anche Samsung Internet).
- **iPhone e iPad**: lì ogni browser, Chrome compreso, è obbligato a usare il motore di Safari (WebKit), che non accetta filtri SVG nel `backdrop-filter`. Al posto della rifrazione c'è un vetro **simulato**: sfocatura e saturazione più forti, riflesso in diagonale e bordi luminosi.

## Comodità (2.2)
- **Fold aperto e tablet**: elenco a sinistra e scheda (o qualsiasi pagina) nel pannello a destra; toccando un altro oggetto la scheda si sostituisce. Museo e visore delle foto restano a schermo intero.
- **Scorrere tra le schede**: nella scheda, un gesto a sinistra o a destra (la scheda segue il dito) passa all'oggetto vicino nell'ordine dell'elenco (con ricerca e filtri attivi); sulla foto compare la posizione, es. «5 / 47». Da tastiera: frecce ← →.
- **Filtri salvati**: nella pagina Filtri scegli ricerca e filtri e salvali con un nome; compaiono come capsule sotto la barra di ricerca (un tocco applica, un secondo tocco toglie).
- **Avviso di doppione**: aggiungendo un oggetto con lo stesso nome o modello di uno che hai già, l'app chiede se aggiungerlo come esemplare, salvarlo a parte o annullare.
- **Versioni precedenti** (Menu, serve il token GitHub): ogni sincronizzazione è una versione; scegli una data, vedi cosa è stato eliminato o modificato da allora e ripristina un oggetto (foto comprese) o tutti insieme.
- **Barra delle notifiche**: su iPhone l'app installata ci passa sotto; su Android prende il colore dello sfondo, della foto della scheda, del museo.

## OpenRouter, servizio di riserva
Menu → **🛟 OpenRouter (riserva)**: con una chiave gratuita di openrouter.ai, quando Gemini non risponde (limiti, quota a zero, errori di Google) la ricerca passa da sola a un modello gratuito di OpenRouter («:free»), e la pagina lo dice. Funziona anche senza Gemini.
- L'elenco dei modelli gratuiti si aggiorna da solo (i migliori per primi); si può sceglierne uno o scriverne il nome. Se un modello ha finito le richieste, l'app passa al successivo.
- Limiti dei modelli gratuiti: 20 richieste al minuto e 50 al giorno (1000 con almeno 10 $ di credito). Senza ricerca web rispondono dalla loro memoria: la ricerca web di OpenRouter si può attivare, ma è a pagamento.

## Velocità delle schede online
Dopo «Usa questi dati» (EveryMac incollato, Gemini, OpenRouter, Wikipedia, iFixit…) il modulo si apre subito:
- **niente foto scaricate dalle fonti**: le foto le aggiungi tu (Scatta, Galleria o «Cerca sul web» nel modulo). L'immagine nell'anteprima è solo indicativa. Prima l'app provava a scaricarla anche attraverso proxy pubblici, con attese che potevano superare il minuto;
- **traduzione in sottofondo**: se la descrizione è in inglese viene tradotta dopo il salvataggio, senza bloccare.

## Errori spiegati
Quando qualcosa non va (Gemini, ricerche online, guide iFixit, sincronizzazione) l'app mostra una scheda con **cosa è successo**, **cosa fare**, i **dettagli tecnici** (il messaggio vero del servizio) e i pulsanti **Riprova**, **Impostazioni** e **Copia dettagli**. Gli ultimi 40 errori restano in Menu → **🩺 Registro errori**, da copiare e mandare.

## Chiedi a Gemini (oggetti rari)
Per i dispositivi poco comuni che EveryMac e Wikipedia non conoscono: **✨ Chiedi a Gemini** (dal menu **+** o da «Cerca dati online») fa cercare a Gemini sul web, con Google Search, e compila la scheda: nome, marca, tipologia, anno, hardware, schermo, porte, dati del televisore o dell'accessorio, misure, prezzo di lancio, descrizione in italiano e altre specifiche.
- Prima dei dati mostra l'anteprima con le **fonti consultate** e i dati che Gemini ritiene **incerti**; poi tutto passa nel modulo, da controllare prima di salvare.
- Non tocca i dati personali (luogo, stato, prezzo pagato, note…) e non inventa i valori delle liste (tipologia, formato…): se non corrispondono vengono scartati.
- **Limiti di Google**: Google conta le richieste gratuite modello per modello (al minuto e al giorno) e alcuni modelli, spesso i più nuovi, per certe chiavi ne hanno **zero**. Quando un modello risponde «troppe richieste» o «limite: 0», l'app passa da sola al successivo e se lo ricorda finché il limite si azzera: i secondi indicati da Google, oppure la mezzanotte in California per il limite giornaliero. Se è esaurita solo la quota della ricerca Google, riprova senza ricerca web e lo dice. **Salva e prova** fa una richiesta di prova vera e mostra quali modelli rispondono.
- **Modelli**: in Menu → Gemini il menu mostra i modelli trovati con la tua chiave (la scansione parte appena la incolli e all'avvio dell'app, come in ARGOS) più quelli da provare a mano (3.6 Flash, 3.6 Flash Lite, 3.5, 2.5…); si può anche scrivere un nome qualsiasi. Il modello scelto si usa anche se la scansione non lo elenca.
- **Due ingressi**: le ricerche usano l'ingresso normale di Google, con la ricerca web; se quello non risponde (rete o formato), l'app riprova da sola con l'ingresso «compatibile OpenAI», lo stesso di ARGOS, senza ricerca web, e lo segnala.
- Serve una **chiave API** gratuita: Menu → **✨ Gemini** → incollala (si crea su aistudio.google.com/apikey). La chiave resta solo su quel telefono. L'app sceglie da sola il modello Flash stabile più recente disponibile per la chiave; si può cambiare dallo stesso menu.

## Versioni
Il numero di versione è accanto al logo **RDDC** (toccalo per le novità) e in fondo al menu. Quando arriva un aggiornamento compare l'avviso «RDDC aggiornata alla versione…».
- Si parte da **1.0** (11 novembre 2026); ogni modifica fa salire il numero (1.1, 1.2…), i cambi grandi passano a 2.0.
- Per chi modifica il codice: il numero sta in `APP_VER` (con le novità in `NOVITA`) in `index.html` e in `V` in `sw.js`; devono coincidere, lo controlla una prova automatica.

## Prove automatiche
`npm test` avvia l'app in Chromium (Playwright) e controlla le funzioni principali, compresa la sincronizzazione con una finta API GitHub. Le prove partono da sole su ogni pull request (GitHub Actions, `.github/workflows/test.yml`).

## Backup
I dati stanno solo sul dispositivo: Menu → «💾 Esporta…» → «Backup completo» ogni tanto (include le foto). Dallo stesso tasto: tabella CSV per Excel/Fogli, CSV del laboratorio e `collezione.json` per GitHub.

## Modelli 3D (Gaussian splat)
- **Scansione**: Scaniverse (gratuita, anche su Android) con il **ritaglio fatto dentro Scaniverse**, così i riflessi delle superfici lucide restano dentro l'oggetto; esporta in **SPZ** (compresso). Pulizia facoltativa in SuperSplat (export SPZ o SOG). Meglio sotto i 25 MB, massimo 60 MB.
- **Nella scheda**: ⋯ → «🧊 Aggiungi un modello 3D» (.spz, .sog, .ply, .splat, .ksplat). Compare la sezione «Modello 3D» (Guarda in 3D, Sul piedistallo, Sostituisci, Togli) e il pulsante «3D» sulla foto.
- **Visualizzatore**: [Spark](https://github.com/sparkjsdev/spark) su three.js, caricato solo quando apri un modello e poi tenuto in cache. L'oggetto poggia sulla base; si gira trascinando, due dita per lo zoom, doppio tocco per ricominciare, da fermo ruota piano. L'inclinazione resta **sopra l'orizzonte** (singola scansione: la parte appoggiata non si vede). ⟲ in alto corregge l'orientamento (capovolgi, ruota di 90°) e lo ricorda.
- **Museo**: sul piedistallo il modello prende il posto della foto scontornata (che resta finché il 3D non è pronto); un solo modello attivo alla volta.
- **Sincronizzazione**: il file va su GitHub in `modelli/` (nome = impronta, una volta sola); sugli altri telefoni si scarica alla prima apertura e resta disponibile offline.

## Novità della 2.9
- **Oggi, voci rimandabili**: scorri una voce verso sinistra → «⏰ Domani» o «Rimanda…» (3 giorni, una settimana, due settimane, un mese, una data). Scorrendo fino in fondo va a domani, con ANNULLA. Le voci nascoste si ritrovano con «N voci rimandate · mostra» e tornano da sole alla data scelta (il rimando vale su questo telefono).
- **📷 Dalla foto dell'etichetta** (Aggiungi): Gemini legge marca, modello, EMC, Model ID, numero di serie, part number e alimentazione; poi «Cerca la scheda» (EveryMac col codice letto), «Compila con Gemini» o «Solo questi dati». Il numero di serie letto resta in ogni caso. Nel modulo, sotto il numero di serie, «📷 Leggi dall'etichetta» riempie solo i campi vuoti.
- **✨ Stima con Gemini** nella sezione Valore della scheda: forbice, prezzo tipico, su cosa si basa e fonti; «＋ Nello storico» la aggiunge come valutazione «Stima Gemini».
- **🧩 Cosa manca** (Menu → Collezione): per ogni linea Apple che possiedi, quanti modelli hai sul totale e quali mancano (elenco dei modelli di The Apple Wiki, abbinati per Model ID, codice e nome; un oggetto vale un solo modello). «＋ Wishlist» crea il desiderio con nome, codice e Model ID.
- **Pressione lunga** su un oggetto: oltre ad Apri, Modifica, Seleziona, Piedistallo ed Elimina, anche ⚡ Acceso oggi, 🔋 Caricato oggi, 📍 Sposta e 🔧 Aggiungi intervento.
- **Tira giù** dalla cima dell'elenco per sincronizzare; **scorciatoie** tenendo premuta l'icona dell'app (Aggiungi, Manutenzione, Cerca); **ultime ricerche** suggerite nel campo di ricerca (che già cerca anche nelle specifiche); **codici a barre** con la fotocamera nella ricerca dati online (EAN degli accessori, part number «1P» delle scatole Apple).
- **Giro di manutenzione**: la ✗ chiede cosa non va: «La batteria non regge» o «Batteria morta» aggiornano lo stato della batteria nella scheda (e contano come accensione fatta), «Non si accende» segna «Da riparare». Con batteria «Tampona ma non regge», «Morta» o «Assente» l'oggetto esce dal giro di ricarica e resta in quello di accensione.
- **Animazioni**: finestre, fogli e anteprima si chiudono trascinandoli in basso; l'elenco si riordina con movimento quando cambi filtri, ordine, gruppi o sezione; Salva diventa «✓ Salvato»; nelle statistiche i numeri contano e i grafici si disegnano; vibrazioni leggere uniformi, spegnibili in Impostazioni.

## Menu e scheda (2.7)
- **Menu**: «🤖 Collegamento IA» raccoglie Gemini, OpenRouter e il registro errori; «☁️ Database su GitHub» ha stato, sincronizzazione, token, versioni precedenti e (in «Avanzate») indirizzo di lettura e metodo manuale; «💾 Esporta…» chiede come esportare.
- **Scheda**: in fondo Modifica, Aggiorna e «⋯», che apre un foglio con le altre azioni raggruppate (Incolla da EveryMac, accessori, scontorno, prestito, confronto, duplica; Elimina in rosso).
- **Modifica**: il tasto Salva è anche in alto, accanto a «Dati online».
- **Laboratorio**: un pezzo messo in lista senza prezzo, quando lo segni «Ordinato», chiede quanto l'hai pagato (prezzo del singolo pezzo).
