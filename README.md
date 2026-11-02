# RDDC – catalogo collezione vintage

App web installabile (PWA): funziona offline, dati salvati sul telefono (IndexedDB).

## Installazione su Android (5 minuti)
1. Crea un repository GitHub (anche privato non va: per Pages gratuito serve pubblico) e carica TUTTI i file di questa cartella.
2. Settings → Pages → Branch `main` / root → Save. Dopo un minuto l'app è su `https://TUONOME.github.io/REPO/`.
3. Apri il link con Chrome su Android → menu ⋮ → **Installa app / Aggiungi a schermata Home**.
(In alternativa: Netlify Drop, Cloudflare Pages, o qualunque hosting statico HTTPS.)

## Recupero dati da EveryMac
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
