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

Le modifiche più recenti fatte sul telefono non vengono mai sovrascritte da dati più vecchi.
⚠️ Il repository è pubblico (serve per GitHub Pages): `collezione.json` e le foto sono leggibili da chiunque conosca l'indirizzo.

## Altro
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

## Backup
I dati stanno solo sul dispositivo: Menu → "Esporta backup completo" ogni tanto (include le foto).
