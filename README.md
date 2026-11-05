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

## Gestione della collezione
- **Selezione multipla**: «☑︎ Seleziona» sopra la lista (o dall'anteprima con pressione lunga), tocca gli oggetti e usa la barra in basso: cambia **luogo**, **stato**, **etichette** (aggiungi/togli), segna come **verificati** o **elimina** (con «Annulla»). «Tutti» seleziona quelli filtrati.
- **Confronto affiancato** di 2 o 3 oggetti: dalla selezione «⇆ Confronta», o dalla scheda «⇆ Confronta con…». «Mostra solo le differenze» nasconde le righe uguali.
- **Inventario** (Menu → 📋 Inventario): scegli un luogo e per ogni oggetto segna ✓ c'è, ✗ non trovato o ↪︎ è altrove (sceglie il nuovo luogo). Si può interrompere e riprendere; alla fine il riepilogo permette di aggiungere #Da cercare ai non trovati. Ogni oggetto ricorda la data dell'ultima verifica.
- **Storico spostamenti**: ogni cambio di luogo (dal modulo, in blocco, dall'inventario o collegando un accessorio) resta nella scheda, in «Spostamenti».
- **Numero di serie Apple**: sotto il seriale la scheda mostra fabbrica e periodo di produzione (formati a 11 e 12 caratteri, fino al 2021; indicativo), con un avviso se non torna con l'anno del modello.
- **Magazzino ricambi**: tipologia «Ricambio» con categoria (RAM, batteria, alimentatore…), specifica, computer compatibili della collezione e altri modelli compatibili (codici, Model ID). La scheda di ogni computer elenca i ricambi in magazzino che vanno bene (sicuri e probabili); «🔧 Monta su…» registra l'intervento sul computer e scala la quantità.
- **Statistiche**: spesa per anno di acquisto, valore per luogo, da quanto possiedi gli oggetti, verifiche dell'inventario. Nuovi ordinamenti: valore, rivalutazione, acquistati di recente, posseduti da più tempo.

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
