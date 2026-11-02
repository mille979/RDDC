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
1. Dal telefono «principale»: Menu → **Esporta «collezione.json»**.
2. Su GitHub, nel repository dell'app: **Add file → Upload files**, trascina `collezione.json` (sostituisce quello vecchio) → **Commit changes**.
3. Ogni telefono che apre l'app lo carica in automatico (o Menu → «Aggiorna ora»): aggiunge gli oggetti nuovi e aggiorna quelli modificati più di recente.

Le modifiche fatte sul telefono più recenti di quelle del file non vengono sovrascritte, e un oggetto eliminato sul telefono non ricompare. L'indirizzo del file si può cambiare in Menu (es. un `raw.githubusercontent.com/...` di un altro repository pubblico).
⚠️ Il repository è pubblico (serve per GitHub Pages): il file è leggibile da chiunque conosca l'indirizzo, foto comprese.

## Incollare i dati da EveryMac (metodo consigliato)
Quando la ricerca automatica non riesce a leggere EveryMac:
1. **+** → «Incolla la scheda da EveryMac» (oppure dalla ricerca online / dalla scheda: «📋 Incolla da EveryMac»)
2. Apri la pagina del modello su EveryMac (c'è il pulsante «Apri ↗»)
3. Tieni premuto su una parola → **Seleziona tutto** → **Copia** e incolla nel riquadro.
   Va bene anche copiare solo la tabella, oppure salvare la pagina (Chrome ⋮ → ⬇︎ Scarica) e caricarla con «Carica pagina salvata»: il file `.mhtml` contiene anche la foto.

Vengono letti: nome, linea, codici (Axxxx/Mxxxx, EMC, Model ID, n° ordine), date, CPU, RAM, archiviazione, grafica, display, sistema operativo, connettività, porte, batteria, dimensioni (convertite in cm), peso, prezzo USA e Italia, descrizione, colore e tutte le altre specifiche.

## Recupero automatico da EveryMac
EveryMac non permette richieste dirette da altri siti (CORS), quindi l'app usa dei proxy pubblici gratuiti.
Se sono lenti/bloccati, pubblica un proxy tuo gratuito su Cloudflare Workers e incolla l'URL in Menu → Impostazioni:

```js
export default {
  async fetch(req) {
    const u = new URL(req.url).searchParams.get('url') || '';
    if (!/^https:\/\/(www\.)?everymac\.com\//.test(u)) return new Response('no', {status: 403});
    const r = await fetch(u, {headers: {'User-Agent': 'Mozilla/5.0'}});
    return new Response(r.body, {status: r.status, headers: {
      'Content-Type': r.headers.get('Content-Type') || 'text/html',
      'Access-Control-Allow-Origin': '*'}});
  }
}
```
URL da inserire: `https://NOME.TUOACCOUNT.workers.dev/?url={url}`

## Backup
I dati stanno solo sul dispositivo: Menu → "Esporta backup completo" ogni tanto (include le foto).
