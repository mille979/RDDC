// Prove automatiche di RDDC: avvia un piccolo server statico, apre l'app in Chromium
// (Playwright) e controlla le funzioni principali. La sincronizzazione usa una finta API GitHub.
// Uso: npm test   (oppure: node tests/run.js)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SERVE = new Set(['index.html', 'sw.js', 'manifest.webmanifest', 'traduzioni.json', 'icon.svg', 'icon-192.png', 'icon-512.png']);
const TYPES = { html: 'text/html', js: 'application/javascript', json: 'application/json', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png' };
const server = http.createServer((req, res) => {
  const f = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1)) || 'index.html';
  if (!SERVE.has(f)) { res.writeHead(404); return res.end(); }   // niente collezione.json: si parte da vuoto
  res.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream' });
  fs.createReadStream(path.join(ROOT, f)).pipe(res);
});

// ---------- finta API GitHub (Git Data API) ----------
const gh = { blobs: new Map(), trees: new Map(), commits: new Map(), ref: 'c0', n: 0 };
const sha = b => crypto.createHash('sha1').update(b).digest('hex');
const putBlob = buf => { const s = sha(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])); gh.blobs.set(s, buf); return s; }; // impronta come la calcola Git
const putTree = ents => { const s = sha(JSON.stringify(ents) + Math.random()); gh.trees.set(s, ents); return s; };
gh.commits.set('c0', { tree: putTree([{ path: 'index.html', sha: putBlob(Buffer.from('x')), type: 'blob', mode: '100644' }]), parents: [] });
const ghFiles = () => new Map(gh.trees.get(gh.commits.get(gh.ref).tree).map(e => [e.path, gh.blobs.get(e.sha)]));
async function ghApi(route) {
  const req = route.request(), m = req.method(), p = new URL(req.url()).pathname.replace(/^\/repos\/test\/RDDC\/?/, '');
  const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'content-type': 'application/json' };
  const J = (o, s = 200) => route.fulfill({ status: s, headers: H, body: JSON.stringify(o) });
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
  if (req.headers()['authorization'] !== 'Bearer TOKEN') return J({ message: 'Bad credentials' }, 401);
  if (p === '') return J({ full_name: 'test/RDDC' });
  if (m === 'GET' && p === 'git/ref/heads/main') return J({ object: { sha: gh.ref } });
  let x;
  if (m === 'GET' && (x = p.match(/^git\/commits\/(\w+)$/))) return J({ tree: { sha: gh.commits.get(x[1]).tree } });
  if (m === 'GET' && (x = p.match(/^git\/trees\/(\w+)$/))) return J({ tree: gh.trees.get(x[1]) });
  if (m === 'GET' && (x = p.match(/^git\/blobs\/(\w+)$/))) return route.fulfill({ status: 200, headers: { ...H, 'content-type': 'application/octet-stream' }, body: gh.blobs.get(x[1]) });
  const b = m === 'GET' ? null : JSON.parse(req.postData() || '{}');
  if (m === 'POST' && p === 'git/blobs') return J({ sha: putBlob(Buffer.from(b.content, b.encoding === 'base64' ? 'base64' : 'utf8')) }, 201);
  if (m === 'POST' && p === 'git/trees') { const base = new Map(gh.trees.get(b.base_tree).map(e => [e.path, e])); b.tree.forEach(e => e.sha === null ? base.delete(e.path) : base.set(e.path, e)); return J({ sha: putTree([...base.values()]) }, 201); }
  if (m === 'POST' && p === 'git/commits') { const s = 'c' + (++gh.n); gh.commits.set(s, { tree: b.tree, parents: b.parents, message: b.message, date: new Date(Date.now() + gh.n * 1000).toISOString() }); return J({ sha: s }, 201); }
  if (m === 'GET' && p === 'commits') { const out = []; for (let c = gh.ref; c && gh.commits.get(c); c = (gh.commits.get(c).parents || [])[0]) { const x = gh.commits.get(c); out.push({ sha: c, commit: { message: x.message || 'inizio', committer: { date: x.date || '2026-01-01T00:00:00Z' } } }); } return J(out); }
  if (m === 'PATCH' && p === 'git/refs/heads/main') { if (gh.commits.get(b.sha).parents[0] !== gh.ref) return J({ message: 'Update is not a fast forward' }, 422); gh.ref = b.sha; return J({ object: { sha: b.sha } }); }
  return J({ message: 'not mocked ' + m + ' ' + p }, 404);
}

// ---------- mini harness ----------
let failed = 0, passed = 0;
const results = [];
async function test(name, fn) {
  try { await fn(); passed++; results.push('  ✓ ' + name); }
  catch (e) { failed++; results.push('  ✗ ' + name + '\n      ' + String(e && e.message || e).split('\n')[0]); }
}
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || 'valore'}: atteso ${JSON.stringify(b)}, ottenuto ${JSON.stringify(a)}`); }
function ok(v, msg) { if (!v) throw new Error(msg || 'condizione falsa'); }

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function phone(name, opts = {}) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', ...opts });
    await ctx.route('https://api.github.com/**', ghApi);
    await ctx.route(/^https:\/\/(api\.mymemory|cdn\.jsdelivr|[^/]*everymac|[^/]*wikipedia\.org|www\.ifixit\.com|theapplewiki\.com|live\.icecat\.biz|api\.microlink\.io)/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    await p.goto(URL0); await p.waitForFunction(() => typeof devices !== 'undefined' && typeof saveDev === 'function');
    return p;
  }
  const seed = (p, list) => p.evaluate(async L => { for (const d of L) { d.creato = Date.now(); await saveDev(d); } render(); }, list);

  const p = await phone('A');
  await seed(p, [
    { id: 'a', nome: 'iMac G3 Bondi', marca: 'Apple', tipologia: 'All-in-one', anno: 1998, luogo: 'Damiano', stato: 'Funzionante', acq_anno: 2010, acq_prezzo: 50, valore: 200, seriale: 'W88401234AB' },
    { id: 'b', nome: 'iMac G3 Blueberry', marca: 'Apple', tipologia: 'All-in-one', anno: 1999, luogo: 'Damiano', acq_anno: 2015, acq_prezzo: 80, valore: 150 },
    { id: 'c', nome: 'MacBook Pro 13"', marca: 'Apple', tipologia: 'Portatile', anno: 2012, luogo: 'Alex', ram: '4 GB DDR3', identifier: 'MacBookPro9,2' },
    { id: 'r', nome: 'RAM 4 GB', tipologia: 'Ricambio', part_cat: 'RAM', quantita: 2, compat: ['c'], luogo: 'Alex' },
    { id: 'r2', nome: 'Batteria A1322', tipologia: 'Ricambio', part_cat: 'Batteria', part_compat: 'MacBookPro9,2', luogo: 'Alex' },
  ]);

  await test('la lista mostra gli oggetti e la ricerca filtra', async () => {
    eq(await p.locator('#list [data-id]').count(), 5, 'oggetti in lista');
    await p.fill('#q', 'blueberry'); await p.waitForTimeout(250);
    eq(await p.locator('#list [data-id]').count(), 1, 'risultati della ricerca');
    await p.fill('#q', ''); await p.waitForTimeout(250);
  });

  await test('decodifica del numero di serie Apple', async () => {
    const r = await p.evaluate(() => [decodeSerial('W88401234AB', 1998), decodeSerial('C02J1234DTY3', 2012), decodeSerial('1234567890', 2000)]);
    ok(/Shanghai/.test(r[0].fabbrica) && r[0].anno === 1998, 'seriale a 11 caratteri: ' + JSON.stringify(r[0]));
    ok(r[1].anno === 2012 && /China|Cina/i.test(r[1].fabbrica), 'seriale a 12 caratteri: ' + JSON.stringify(r[1]));
    ok(r[2] && r[2].nota, 'seriale a 10 caratteri: solo una nota');
  });

  await test('magazzino ricambi: compatibili sicuri e probabili', async () => {
    const r = await p.evaluate(() => { const x = partsFor(devices.find(d => d.id === 'c')); return { s: x.sure.map(d => d.id), m: x.maybe.map(d => d.id) }; });
    eq(r.s, ['r'], 'ricambi collegati'); eq(r.m, ['r2'], 'ricambi probabili');
  });

  await test('selezione multipla: sposta di luogo e registra lo spostamento', async () => {
    await p.click('[data-selon]');
    await p.click('[data-id="a"]'); await p.click('[data-id="b"]');
    eq(await p.evaluate(() => SELM.size), 2, 'selezionati');
    await p.click('[data-b="luogo"]'); await p.click('[data-l="Alex"]'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ['a', 'b'].map(id => { const d = devices.find(x => x.id === id); return [d.luogo, d.spostamenti.length, d.spostamenti[0].da]; }));
    eq(r, [['Alex', 1, 'Damiano'], ['Alex', 1, 'Damiano']], 'luogo e storico');
    eq(await p.evaluate(() => [SELM, stack.length, history.state.p]), [null, 0, 0], 'uscita dalla selezione');
  });

  await test('selezione multipla: elimina e annulla', async () => {
    await p.click('[data-selon]'); await p.click('[data-id="b"]');
    await p.click('[data-b="del"]'); await p.click('.modal [data-y]'); await p.waitForTimeout(300);
    ok(!(await p.evaluate(() => devices.some(d => d.id === 'b'))), 'eliminato');
    await p.click('#toast button'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => devices.some(d => d.id === 'b')), 'ripristinato');
  });

  await test('confronto affiancato con «solo differenze»', async () => {
    await p.evaluate(() => openCompare(devices.filter(d => d.id === 'a' || d.id === 'b')));
    const all = await p.locator('.cmp .lab').count();
    await p.check('#onlyd');
    const diff = await p.locator('.cmp .lab').count();
    ok(diff < all && diff > 1, `righe ${all} → ${diff}`);
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('inventario per luogo: presente, non trovato, altrove', async () => {
    await p.evaluate(() => openInventory()); await p.click('[data-il="Alex"]');
    await p.click('[data-ivd="a"] [data-iv="ok"]'); await p.waitForTimeout(150);
    await p.click('[data-ivd="b"] [data-iv="no"]'); await p.waitForTimeout(150);
    await p.click('[data-ivd="c"] [data-iv="mv"]'); await p.click('[data-cl="Damiano"]'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const g = id => devices.find(x => x.id === id); return [!!g('a').verificato, !!g('b').verificato, g('c').luogo, g('c').spostamenti.length, Object.keys(LS.get('rd_inv').st).length]; });
    eq(r, [true, false, 'Damiano', 1, 3], 'esito inventario');
    await p.click('#ivend'); await p.click('#ivtag'); await p.click('#ivclose'); await p.waitForTimeout(400);
    eq(await p.evaluate(() => [LS.get('rd_inv', null), devices.find(x => x.id === 'b').tags]), [null, ['Da cercare']], 'chiusura');
  });

  await test('statistiche e ordinamenti per valore', async () => {
    await p.evaluate(() => openStats());
    const t = await p.evaluate(() => stack[stack.length - 1].textContent);
    for (const k of ['Spesa per anno di acquisto', 'Valore per luogo', 'Da quanto li possiedi']) ok(t.includes(k), 'manca: ' + k);
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
    eq(await p.evaluate(() => { S.sort = 'valore_d'; return devices.slice().sort(sorter()).slice(0, 2).map(d => d.id); }), ['a', 'b'], 'ordine per valore');
    await p.evaluate(() => { S.sort = 'nome'; render(); });
  });

  await test('unione per campo: modifiche a campi diversi non si perdono', async () => {
    const r = await p.evaluate(() => {
      const base = { id: 'm', nome: 'X', luogo: 'Alex', note: '', modificato: 1, fts: { nome: 1, luogo: 1, note: 1 } };
      const l = { ...base, luogo: 'Damiano', modificato: 5, fts: { ...base.fts, luogo: 5 } };
      const rr = { ...base, note: 'nuova', modificato: 6, fts: { ...base.fts, note: 6 } };
      const out = fieldMerge(l, rr).out; return [out.luogo, out.note];
    });
    eq(r, ['Damiano', 'nuova'], 'unione');
  });

  await test('sincronizzazione GitHub: foto in foto/, unione tra due telefoni, file orfani rimossi', async () => {
    const A = await phone('A2'), B = await phone('B2');
    for (const x of [A, B]) await x.evaluate(() => LS.set('rd_gh', { repo: 'test/RDDC', token: 'TOKEN', branch: 'main' }));
    const sync = x => x.evaluate(() => ghSync(true));
    const img = await A.evaluate(() => { const v = document.createElement('canvas'); v.width = v.height = 40; v.getContext('2d').fillRect(0, 0, 40, 40); return v.toDataURL('image/jpeg', .8); });
    await A.evaluate(async img => { await saveDev({ id: 's', nome: 'Macintosh SE', luogo: 'Alex', foto: [img], thumb: img, creato: Date.now() }); }, img);
    await sync(A);
    let files = [...ghFiles().keys()];
    ok(files.includes('collezione.json'), 'collezione.json');
    eq(files.filter(f => f.startsWith('foto/')).length, 1, 'foto caricate in foto/');
    ok(!files.some(f => /^\d+\//.test(f)), 'nessuna cartella numerata');
    await sync(B);
    await A.evaluate(async () => { const d = devices.find(x => x.id === 's'); d.luogo = 'Damiano'; await saveDev(d); });
    await B.evaluate(async () => { const d = devices.find(x => x.id === 's'); d.note = 'Revisionato'; await saveDev(d); });
    await sync(B); await sync(A); await sync(B);
    for (const x of [A, B]) eq(await x.evaluate(() => { const d = devices.find(y => y.id === 's'); return [d.luogo, d.note]; }), ['Damiano', 'Revisionato'], 'unione tra telefoni');
    await A.evaluate(async () => { const d = devices.find(x => x.id === 's'); d.foto = []; d.thumb = ''; await saveDev(d); });
    await sync(A);
    files = [...ghFiles().keys()];
    eq(files.filter(f => f.startsWith('foto/')).length, 0, 'foto non più usata rimossa');
    const ref = gh.ref; await sync(A); await sync(B); await sync(A);
    eq(gh.ref, ref, 'nessun commit inutile');
    await A.context().close(); await B.context().close();
  });

  await test('accessori: dizionario dei codici e scelta della sezione giusta nelle pagine raggruppate', async () => {
    const r = await p.evaluate(() => {
      const l = accLocal('a1424'), m = accLocal('Mouse M5769');
      const secs = ['Magic Mouse', 'Magic Mouse – 1st generation (A1296)', 'Magic Mouse – 2nd generation (A1657)', 'Apple Pro Mouse (M5769)'];
      const best = q => secs.slice().sort((a, b) => secScore(q, b) - secScore(q, a))[0];
      return [l.fields.nome, l.fields.acc_connettore, m.fields.nome, best('Magic Mouse 2'), best('A1296'), best('apple pro mouse'), accTipo('Apple keyboards'), accTipo('MagSafe')];
    });
    eq(r, ['Alimentatore MagSafe 2 da 85 W', 'MagSafe 2', 'Apple Pro Mouse', 'Magic Mouse – 2nd generation (A1657)', 'Magic Mouse – 1st generation (A1296)', 'Apple Pro Mouse (M5769)', 'Tastiera', 'Alimentatore / caricabatterie'], 'risultati');
  });

  await test('accessori: ricerca dal menu «+» compila il modulo (anche senza rete)', async () => {
    await p.click('#fab'); await p.click('[data-a="lookacc"]');
    await p.fill('#lq', 'A1424'); await p.click('#lg');
    await p.waitForSelector('[data-a="0"]', { timeout: 20000 });
    await p.click('[data-a="0"]'); await p.waitForSelector('[data-use]'); await p.click('[data-use]');
    await p.waitForSelector('#f', { timeout: 20000 });
    const v = await p.evaluate(() => ['nome', 'tipologia', 'modello', 'acc_connettore', 'acc_uscita'].map(n => document.querySelector(`#f [name="${n}"]`).value));
    eq(v, ['Alimentatore MagSafe 2 da 85 W', 'Alimentatore / caricabatterie', 'A1424', 'MagSafe 2', '20 V 4,25 A – 85 W'], 'modulo');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('esemplari: un oggetto, più pezzi con dati propri (dividi, filtri, unisci, annulla)', async () => {
    await seed(p, [{ id: 'm1', nome: 'Apple Pro Mouse', marca: 'Apple', tipologia: 'Mouse', anno: 2000, quantita: 2, stato: 'Funzionante', luogo: 'Alex' },
      { id: 'k1', nome: 'Apple Pro Keyboard', tipologia: 'Tastiera', stato: 'Funzionante', luogo: 'Alex', seriale: 'KY1' },
      { id: 'k2', nome: 'Apple Pro Keyboard', tipologia: 'Tastiera', stato: 'Non funzionante', luogo: 'Damiano', note: 'tasto E rotto' }]);
    await p.evaluate(() => openDetail('m1')); await p.click('[data-unit-new]'); await p.waitForTimeout(300);
    const id2 = await p.evaluate(() => devices.find(d => d.id === 'm1').esemplari[1].id);
    await p.click(`[data-unit="${id2}"]`); await p.selectOption('#u_st', 'Non funzionante'); await p.fill('#u_lu', 'Damiano'); await p.click('#u_ok'); await p.waitForTimeout(400);
    eq(await p.evaluate(() => { const d = devices.find(x => x.id === 'm1'); return [d.quantita, unitsSummary(d), vals(d, 'luogo')]; }), [2, '1 funzionante, 1 non funzionante', ['Alex', 'Damiano']], 'esemplari');
    eq(await p.evaluate(() => { S.sel = { stato: ['Non funzionante'] }; const r = devices.filter(d => pass(d)).map(d => d.id).sort(); S.sel = {}; return r; }), ['k2', 'm1'], 'filtro per stato');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
    await p.click('[data-selon]'); await p.click('[data-id="k1"]'); await p.click('[data-id="k2"]'); await p.click('[data-b="merge"]'); await p.click('.modal [data-y]'); await p.waitForTimeout(400);
    eq(await p.evaluate(() => [devices.some(x => x.id === 'k2'), devices.find(x => x.id === 'k1').esemplari.map(u => u.stato + '/' + u.luogo)]), [false, ['Funzionante/Alex', 'Non funzionante/Damiano']], 'unione');
    await p.click('#toast button'); await p.waitForTimeout(300);
    eq(await p.evaluate(() => [devices.some(x => x.id === 'k2'), !!devices.find(x => x.id === 'k1').esemplari]), [true, false], 'annulla unione');
  });

  await test('ricerca per nome: tabelle dei modelli con rowspan e scelta del modello', async () => {
    const r = await p.evaluate(() => {
      const wt = '\n{| class="wikitable"\n! Generation\n! "A" or "M" Number\n! Internal Name\n! Color\n|-\n| iMac G3\n| rowspan="2" | M4984\n| rowspan="2" | iMac,1\n| Bondi Blue\n|-\n| iMac G3 (Fruit Colors)\n| Blueberry\n|}';
      const t = wikiTable(wt)[0];
      const idx = [['iMac G3', 'M4984', 'iMac,1', 'Mac'], ['iMac G3 (Fruit Colors)', 'M4984', 'iMac,1', 'Mac'], ['iMac G4 (Flat Panel)', '', 'PowerMac4,2', 'Mac'], ['PowerBook G4 (12-inch DVI)', 'A1010', '', 'Mac']];
      return [t.rows[1], nameMatches('imac g3', idx).map(x => x[0]), nameMatches('powerbook 12', idx).map(x => x[1]), looksLikeCode('iMac G3'), looksLikeCode('PowerMac2,1'), looksLikeCode('A1424')];
    });
    eq(r, [['iMac G3 (Fruit Colors)', 'M4984', 'iMac,1', 'Blueberry'], ['iMac G3', 'iMac G3 (Fruit Colors)'], ['A1010'], false, true, true], 'risultati');
  });

  await test('annunci: link condiviso → anteprima → nuovo desiderio con prezzo', async () => {
    await p.route('https://r.jina.ai/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ data: { title: 'Macintosh Classic II | Vinted', description: 'Funzionante', content: '![](https://x/logo.svg) Prezzo 1.180,50 € ' } }) }));
    await p.evaluate(() => openShared({ files: [], meta: { title: '', text: 'Guarda: https://www.vinted.it/items/1-mac', url: '' } }));
    await p.waitForSelector('[data-to="new"]');
    eq(await p.evaluate(() => [$('#at').value, $('#ap').value, $('#as').value]), ['Macintosh Classic II', '1180.5', 'Vinted'], 'anteprima');
    await p.fill('#ap', '150'); await p.click('[data-to="new"]'); await p.waitForSelector('#f');
    await p.fill('#f [name=w_budget]', '200'); await p.evaluate(() => document.querySelector('[data-save]').click()); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const d = devices.find(x => x.wish && x.nome === 'Macintosh Classic II'); return [d.annunci.length, d.annunci[0].prezzo, d.w_link, annMeta(d).replace(/<[^>]+>/g, '')]; });
    eq(r, [1, '150', 'https://www.vinted.it/items/1-mac', '🏷️ 1 annuncio · € 150 ✓'], 'desiderio');
    await p.unroute('https://r.jina.ai/**'); await p.evaluate(() => { S.view = 'col'; goBase(); render(); }); await p.waitForTimeout(300);
  });

  await test('annunci da screenshot: dal testo letto a titolo, prezzo, descrizione', async () => {
    const r = await p.evaluate(() => {
      const ocr = '12:41 87%\n< Indietro Condividi Salva\nMacintosh Classic Il con tastiera e\nmouse\n180 €\nMilano (MI) - Oggi alle 10:15\nSpedizione disponibile\nDescrizione\nVendo Macintosh Classic Il perfettamente funzionante,\navvia System 7.1.\nCaratteristiche\nCondizione Usato - Buone condizioni\nAnnunci simili\niMac G3 Bondi 90 €\nContatta';
      const ebay = 'eBay\nApple iMac G3 233 MHz Bondi Blue\nEUR 249,00\nSpedizione gratuita\nDescrizione dell\'oggetto\nFunziona, tastiera inclusa\nInformazioni sul venditore';
      const a = parseListingText(ocr), b = parseListingText(ebay);
      return [a.titolo, a.prezzo, a.luogo, a.condizione, a.desc, b.titolo, b.prezzo, b.sito, b.desc, annTitle('Guarda Apple iMac G3 su eBay!')];
    });
    eq(r, ['Macintosh Classic II con tastiera e mouse', '180', 'Milano (MI)', 'Usato - Buone condizioni', 'Vendo Macintosh Classic II perfettamente funzionante, avvia System 7.1.',
      'Apple iMac G3 233 MHz Bondi Blue', '249', 'eBay', 'Funziona, tastiera inclusa', 'Apple iMac G3'], 'lettura');
  });

  await test('annunci: note, caratteristiche e configurazione per ogni annuncio', async () => {
    await p.evaluate(async () => { await saveDev({ id: 'w9', wish: true, nome: 'MacBook 2008 - 2015', annunci: [{ id: 'a9', url: 'https://www.subito.it/x.htm', sito: 'Subito', titolo: 'MacBook Pro 17" 2010', prezzo: '380' }], creato: Date.now() }); openDetail('w9'); });
    await p.click('[data-annedit="a9"]'); await p.fill('#acf', '17" 2010, i7'); await p.click('[data-atg="Caricabatterie incluso"]'); await p.fill('#ant', 'Graffi sul coperchio'); await p.click('#eok'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const a = devices.find(d => d.id === 'w9').annunci[0]; return [a.config, a.etichette, a.note, devices.find(d => d.id === 'w9')._i.includes('graffi'), !!document.querySelector('.annn')]; });
    eq(r, ['17" 2010, i7', ['Caricabatterie incluso'], 'Graffi sul coperchio', true, true], 'note annuncio');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('transizioni: la scheda si apre e si chiude senza lasciare pagine o nomi di transizione', async () => {
    await p.evaluate(() => { S.view = 'col'; S.q = ''; render(); });
    const id = await p.evaluate(() => document.querySelector('#list [data-id]').dataset.id);
    await p.click(`#list [data-id="${id}"]`); await p.waitForTimeout(600);
    eq(await p.evaluate(() => stack.length), 1, 'scheda aperta');
    await p.evaluate(() => history.back()); await p.waitForTimeout(700);
    eq(await p.evaluate(() => [stack.length, document.querySelectorAll('.page').length, [...document.querySelectorAll('*')].filter(x => x.style && x.style.viewTransitionName).length]), [0, 0, 0], 'dopo indietro');
    eq(await p.evaluate(() => /class="ldr ld-ann"/.test(loader('ann', 'x')) && /ld-mac/.test(loader(ldKind('Cerco su EveryMac…'), 'x'))), true, 'animazioni di attesa');
  });

  await test('manutenzione: giro di accensioni e ricariche, stato batteria, Oggi e calendario', async () => {
    await p.evaluate(async () => {
      const old = addMonths(today(), -8), rec = addMonths(today(), -1);
      for (const d of [
        { id: 'mp', nome: 'PowerBook G4', tipologia: 'Portatile', luogo: 'Alex', man_on: old, man_charge: old, batt_stato: 'Regge' },
        { id: 'mi', nome: 'iBook G3', tipologia: 'Portatile', luogo: 'Alex', man_on: rec, batt_stato: 'Morta' },
        { id: 'ms', nome: 'Macintosh SE', tipologia: 'All-in-one', luogo: 'Damiano', man_on: rec },
        { id: 'mu', nome: 'MacBook Pro 2017', tipologia: 'Portatile', ruolo: 'In uso' }]) { d.creato = Date.now(); await saveDev(d); }
      S.view = 'col'; S.q = ''; S.sel = {}; render();
    });
    const due = await p.evaluate(() => manDue().filter(t => ['mp', 'mi', 'ms', 'mu'].includes(t.d.id)).map(t => t.d.id + (t.st.dueOn ? '+on' : '') + (t.st.dueCh ? '+ch' : '')));
    eq(due, ['mp+on+ch'], 'da fare (batteria morta, fissi recenti e oggetti in uso esclusi)');
    eq(await p.evaluate(() => [manTargets(devices.find(d => d.id === 'mu')).length, missing(devices.find(d => d.id === 'mu')).length, !!document.querySelector('.oggi #manB'), !!document.querySelector('.oggi #warB')]), [0, 0, true, false], 'oggetti in uso e scheda Oggi');
    await p.click('#manB'); await p.click('[data-mid="mp"] [data-mg="on"]'); await p.click('[data-mid="mp"] [data-mg="charge"]'); await p.waitForTimeout(300);
    eq(await p.evaluate(() => { const d = devices.find(x => x.id === 'mp'); return [d.man_on === today(), d.man_charge === today(), d.manutenzioni.map(m => m.tipo), manState({ d, u: null }).dueOn]; }), [true, true, ['on', 'charge'], false], 'giro');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
    const ics = await p.evaluate(() => buildICS());
    ok(/BEGIN:VCALENDAR/.test(ics) && /SUMMARY:⚡ Accendere: PowerBook G4/.test(ics) && /SUMMARY:🔋 Ricaricare: PowerBook G4/.test(ics) && !/garanzia/i.test(ics) && !/Ricaricare: iBook/.test(ics), 'calendario');
    eq(await p.evaluate(() => buildICS() === buildICS()), true, 'calendario stabile (nessun commit inutile)');
  });

  await test('raccolte, ruolo e «Va con» per singolo esemplare', async () => {
    await p.evaluate(async () => { for (const d of [{ id: 'atv', nome: 'Apple TV', tipologia: 'Lettore multimediale', raccolta: 'Apple' }, { id: 'gba', nome: 'GBA SP', tipologia: 'Console', raccolta: 'Console' }, { id: 'rem', nome: 'Apple Remote', tipologia: 'Accessorio', quantita: 2 }]) { d.creato = Date.now(); await saveDev(d); } render(); });
    eq(await p.evaluate(() => { const r = museumItems().filter(d => ['atv', 'gba'].includes(d.id)).map(roomOf); return [r, val(devices.find(d => d.id === 'mu'), 'ruolo')]; }), [['Apple', 'Console'], 'In uso'], 'sale per raccolta e ruolo');
    await p.evaluate(() => openDetail('rem')); await p.click('[data-unit-new]'); await p.waitForTimeout(300);
    const u1 = await p.evaluate(() => devices.find(d => d.id === 'rem').esemplari[0].id);
    await p.click(`[data-unit="${u1}"]`); await p.selectOption('#u_va', 'atv'); await p.click('#u_ok'); await p.waitForTimeout(400);
    await p.evaluate(() => openDetail('atv')); await p.waitForTimeout(300);
    ok(await p.evaluate(() => /Accessori collegati \(1\)/.test(stack[stack.length - 1].textContent) && /esemplare n\. 1/.test(stack[stack.length - 1].textContent)), 'telecomando collegato come esemplare');
    eq(await p.evaluate(() => missing(devices.find(d => d.id === 'rem')).includes('collegato')), false, 'esemplare sciolto non conta come mancante');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('laboratorio: collaudo con guasti → progetto di restauro con fasi', async () => {
    await p.evaluate(async () => { for (const d of [{ id: 'lt', nome: 'PowerBook G3 Pismo', tipologia: 'Portatile', luogo: 'Alex', stato: 'Da testare', marca: 'Apple' }]) { d.creato = Date.now(); await saveDev(d); } S.view = 'col'; S.q = ''; S.sel = {}; render(); });
    ok(await p.evaluate(() => !!document.querySelector('.oggi #labC') && toTest().some(x => x.d.id === 'lt')), 'Oggi: da collaudare');
    eq(await p.evaluate(() => vals(devices.find(d => d.id === 'lt'), 'lab')), ['Da collaudare', 'Mai collaudato'], 'filtro laboratorio');
    await p.evaluate(() => openDetail('lt')); await p.click('[data-colnew]');
    eq(await p.evaluate(() => [...document.querySelectorAll('.crow>span')].map(x => x.firstChild.textContent).slice(0, 2)), ['Si accende', 'Avvia il sistema operativo'], 'voci per portatile');
    const bi = await p.evaluate(() => [...document.querySelectorAll('.crow')].findIndex(x => /^Batteria/.test(x.textContent)));
    await p.click(`.crow[data-ci="${bi}"] [data-ce="ko"]`); await p.fill(`[data-cm="${bi}"]`, 'non tiene la carica');
    await p.click('.crow[data-ci="8"] [data-ce="na"]'); await p.click('[data-call]');
    await p.click('#csv'); await p.click('.modal [data-y]'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const d = devices.find(x => x.id === 'lt'), c = d.collaudi[0], pr = d.progetti[0]; return [c.esito, c.r.filter(x => x.e === 'ko').map(x => x.t + ':' + x.m), d.stato, d.man_on === today(), pr.fasi.map(f => f.t), !!document.querySelector('#ptt')]; });
    eq(r, ['ko', ['Batteria:non tiene la carica'], 'Da riparare', true, ['Riparare: Batteria (non tiene la carica)', 'Collaudo finale'], true], 'collaudo, stato e progetto');
    ok(await p.evaluate(() => /1 ✗ \(Batteria: non tiene la carica\)/.test(collSum(devices.find(x => x.id === 'lt').collaudi[0]))), 'riassunto del collaudo');
  });

  await test('laboratorio: pezzi, lista della spesa, magazzino, cronometro e chiusura nel registro', async () => {
    await p.fill('#pzn', 'Batteria Pismo nuova'); await p.fill('#pzp', '45,50'); await p.click('[data-pza]'); await p.waitForTimeout(200);
    eq(await p.evaluate(() => shopList().map(x => [x.z.t, x.z.prezzo, x.z.stato])), [['Batteria Pismo nuova', '45.5', 'Da comprare']], 'lista della spesa');
    await p.click('[data-pzs]'); await p.waitForTimeout(150); await p.click('[data-pzs]'); await p.click('.modal [data-y]'); await p.waitForTimeout(300);
    const part = await p.evaluate(() => { const d = devices.find(x => x.id === 'lt'), z = d.progetti[0].pezzi[0], pt = devices.find(x => x.id === z.part); return [z.stato, pt && pt.tipologia, pt && pt.part_cat, pt && pt.compat, shopList().length]; });
    eq(part, ['Arrivato', 'Ricambio', 'Batteria', ['lt'], 0], 'arrivato → magazzino');
    await p.click('[data-ptim]'); await p.waitForTimeout(100);
    await p.evaluate(() => { const t = timerGet(); t.t0 -= 30 * 60000; LS.set('rd_timer', t); });
    ok(await p.evaluate(() => /cronometro acceso/.test(oggiHTML()) && /⏱/.test(labBadge(devices.find(x => x.id === 'lt')))), 'cronometro in Oggi e sulla scheda');
    await p.click('[data-ptim]'); await p.click('[data-padd="15"]'); await p.waitForTimeout(200);
    await p.click('.pf input[type=checkbox]'); await p.waitForTimeout(200);
    eq(await p.evaluate(() => { const pr = devices.find(x => x.id === 'lt').progetti[0]; return [pr.min, pr.sess.length, pr.fasi[0].ok, pr.stato, timerGet()]; }), [45, 2, true, 'In corso', null], 'tempo e fasi');
    await p.fill('#pno', 'Pismo: batteria sostituita'); await p.dispatchEvent('#pno', 'change'); await p.waitForTimeout(150);
    await p.evaluate(() => { const i = document.querySelector('#psc'); i.value = addDays(today(), 10); i.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(150);
    ok(await p.evaluate(() => /Scadenza progetto: Riparazione: batteria/.test(buildICS())), 'scadenza nel calendario');
    await p.click('[data-pend]'); await p.click('.modal [data-y]'); await p.waitForTimeout(300); await p.click('.modal [data-n]'); await p.waitForTimeout(300);
    const fin = await p.evaluate(() => { const d = devices.find(x => x.id === 'lt'), pr = d.progetti[0], i = d.interventi.find(x => x.proj === pr.id), pt = devices.find(x => x.id === pr.pezzi[0].part); return [pr.stato, pr.fine === today(), i && i.costo, i && /45 min di lavoro/.test(i.desc), pt.montato_su, pr.pezzi[0].stato]; });
    eq(fin, ['Finito', true, '45.5', true, 'lt', 'Montato'], 'chiusura: registro interventi e ricambio montato');
    await p.evaluate(() => openLab('prog')); await p.waitForTimeout(200);
    ok(await p.evaluate(() => /Finiti \(1 · 45 min · € 45,50\)/.test(stack[stack.length - 1].textContent)), 'elenco progetti finiti');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('laboratorio: collaudo pianificato, esito ok → funzionante, guida iFixit nel progetto', async () => {
    await p.evaluate(async () => { await saveDev({ id: 'lc', nome: 'Trinitron KV-21', tipologia: 'Televisore CRT', stato: 'Da riparare', creato: Date.now() }); render(); });
    await p.evaluate(() => openPlanColl(devices.find(d => d.id === 'lc'), null)); await p.click('[data-pn="1"]'); await p.click('#pcs'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => dueList().some(x => x.d.id === 'lc' && x.i.coll) && /Collaudo/.test(buildICS())), 'collaudo in programma');
    await p.evaluate(() => openCollaudo(devices.find(d => d.id === 'lc'), null)); await p.click('[data-call]'); await p.click('#csv'); await p.click('.modal [data-y]'); await p.waitForTimeout(300);
    eq(await p.evaluate(() => { const d = devices.find(x => x.id === 'lc'); return [d.stato, d.collaudi[0].esito, d.interventi[0].fatto, /^Collaudo: 7 ✓/.test(d.interventi[0].desc), collKind(d)]; }), ['Funzionante', 'ok', true, true, 'tv'], 'collaudo ok');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
    await p.context().route('https://www.ifixit.com/api/2.0/search/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ results: [{ guideid: 7, title: 'Trinitron Capacitor Replacement', subject: 'Capacitors', category: 'Sony Trinitron' }] }) }));
    await p.context().route('https://www.ifixit.com/api/2.0/guides/7', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ title: 'Trinitron Capacitor Replacement', url: 'https://www.ifixit.com/Guide/x/7', difficulty: 'Moderate', time_required: '1 hour', steps: [{}, {}], parts: [{ text: 'Capacitor kit' }], tools: [{ text: 'Soldering Iron' }] }) }));
    await p.evaluate(() => { const d = devices.find(x => x.id === 'lc'); const pr = newProject(d, { titolo: 'Revisione CRT', fasi: ['Pulizia interna', 'Collaudo finale'] }); return saveDev(d).then(() => openProject(d, pr.id)); });
    await p.click('[data-pg]'); await p.waitForSelector('[data-gid="7"]'); await p.click('[data-gid="7"]'); await p.waitForSelector('#gadd'); await p.click('#gadd'); await p.waitForTimeout(500);
    eq(await p.evaluate(() => { const pr = devices.find(x => x.id === 'lc').progetti[0]; return [pr.guide.length, pr.pezzi.map(z => z.t + '/' + z.stato), pr.attrezzi, pr.fasi.map(f => f.t), !!document.querySelector('#ptt'), document.querySelectorAll('[data-pzs]').length]; }),
      [1, ['Capacitor kit/Da comprare'], ['Soldering Iron'], ['Pulizia interna', 'Seguire la guida: Trinitron Capacitor Replacement', 'Collaudo finale'], true, 1], 'guida aggiunta e pagina aggiornata');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('laboratorio: statistiche ed esportazioni CSV', async () => {
    await p.evaluate(() => openLab('stat')); await p.waitForTimeout(300);
    const txt = await p.evaluate(() => stack[stack.length - 1].textContent);
    ok(/Progetti finiti\s*1 di 2/.test(txt) && /Ore di lavoro per mese/.test(txt) && /Guasti più frequenti nei collaudi/.test(txt) && /Batteria/.test(txt) && /Stato della collezione/.test(txt), 'statistiche');
    const c = await p.evaluate(() => [LAB_CSV.progetti[1](), LAB_CSV.collaudi[1](), LAB_CSV.pezzi[1](), LAB_CSV.interventi[1](), LAB_CSV.sessioni[1]()]);
    const rows = c.map(x => x.replace(/^﻿/, '').split('\n'));
    ok(rows[0][0].startsWith('"Oggetto";"Esemplare";"Progetto"') && rows[0].some(r => /"PowerBook G3 Pismo";"";"Riparazione: batteria";"Riparazione";"Finito"/.test(r) && /"45";"0,75";"45,5"/.test(r)), 'CSV progetti');
    ok(rows[1].some(r => /"Problemi";"\d+";"Batteria: non tiene la carica"/.test(r)), 'CSV collaudi');
    ok(rows[2].some(r => /"Batteria Pismo nuova";"1";"45,5";"Montato";"sì";"sì"/.test(r)), 'CSV pezzi');
    ok(rows[3].some(r => /"Riparazione";".*45 min di lavoro";"45,5"/.test(r)) && rows[4].length === 3, 'CSV registro e sessioni');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-csv="collaudi"]')]);
    ok(/^rddc-collaudi-\d{4}-\d{2}-\d{2}\.csv$/.test(dl.suggestedFilename()), 'download');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('laboratorio: le foto prima/dopo dei progetti vanno su GitHub come file', async () => {
    const A = await phone('A3');
    await A.evaluate(() => LS.set('rd_gh', { repo: 'test/RDDC', token: 'TOKEN', branch: 'main' }));
    await A.evaluate(async () => { const v = document.createElement('canvas'); v.width = v.height = 30; const c = v.getContext('2d'); c.fillStyle = '#c33'; c.fillRect(0, 0, 30, 30); const a = v.toDataURL('image/jpeg', .8); c.fillStyle = '#3c3'; c.fillRect(0, 0, 30, 30); const b = v.toDataURL('image/jpeg', .8);
      const d = { id: 'pp', nome: 'Macintosh Classic', creato: Date.now() }; const pr = newProject(d, { titolo: 'Retrobright' }); pr.prima = [a]; pr.dopo = [b]; await saveDev(d); await ghSync(true); });
    const j = JSON.parse(ghFiles().get('collezione.json').toString()), pr = j.devices.find(d => d.id === 'pp').progetti[0];
    ok(/^foto\/[0-9a-f]{40}\.jpg$/.test(pr.prima[0]) && /^foto\/[0-9a-f]{40}\.jpg$/.test(pr.dopo[0]) && ghFiles().has(pr.prima[0]) && ghFiles().has(pr.dopo[0]), 'foto del progetto come file');
    const ref = gh.ref; await A.evaluate(() => ghSync(true)); eq(gh.ref, ref, 'nessun commit inutile');
    const B = await phone('B3'); await B.evaluate(() => LS.set('rd_gh', { repo: 'test/RDDC', token: 'TOKEN', branch: 'main' })); await B.evaluate(() => ghSync(true));
    ok(await B.evaluate(() => /^data:image/.test(devices.find(d => d.id === 'pp').progetti[0].dopo[0])), 'sull\'altro telefono le foto tornano immagini');
    await A.context().close(); await B.context().close();
  });

  await test('versione: visibile accanto al logo e uguale a quella del service worker', async () => {
    const v = await p.evaluate(() => [APP_VER, document.querySelector('#bVer').textContent, NOVITA[0][0]]);
    const sw = (fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/const V='rddc-([^']+)'/) || [])[1];
    eq(v, [sw, sw, sw], 'versione in app, logo, novità e sw.js');
    await p.click('#bVer'); ok(await p.evaluate(() => /Versione \d/.test(stack[stack.length - 1].textContent)), 'pagina novità');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('Gemini: chiave, scelta del modello, ricerca sul web e modulo compilato', async () => {
    const G = await phone('G');
    const calls = [];
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
    let mode = 'ok';
    await G.context().route('https://generativelanguage.googleapis.com/**', r => {
      const q = r.request(); if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
      const u = new URL(q.url()); calls.push([q.method(), u.pathname, q.headers()['x-goog-api-key'], q.postData() ? JSON.parse(q.postData()) : null]);
      const keyOk = q.headers()['x-goog-api-key'] === 'AIzaTEST' || q.headers()['authorization'] === 'Bearer AIzaTEST';
      if (!keyOk) return r.fulfill({ status: 400, headers: H, body: JSON.stringify([{ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }]) });
      if (u.pathname.endsWith('/openai/models')) return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ object: 'list', data: ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-pro', 'gemini-3.6-flash-preview', 'gemini-3.5-flash-image', 'text-embedding-004'].map(n => ({ id: 'models/' + n, object: 'model' })) }) });
      if (u.pathname.endsWith('/models')) return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ models: ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-pro', 'gemini-3.6-flash-preview', 'gemini-3.5-flash-image', 'text-embedding-004'].map(n => ({ name: 'models/' + n, supportedGenerationMethods: n.includes('embedding') ? ['embedContent'] : ['generateContent'] })) }) });
      const body = JSON.parse(q.postData()), conv = !body.tools;
      const obj = { nome: 'Olivetti M24', marca: 'Olivetti', tipologia: 'computer desktop', anno: 'introdotto nel 1984', cpu: 'Intel 8086 a 8 MHz', ram: '128 KB (espandibile a 640 KB)', os_orig: 'MS-DOS 2.11', tv_formato: '5:4', descrizione: 'Personal computer IBM compatibile prodotto da Olivetti.', specs: [['Tastiera', '102 tasti'], { etichetta: 'Video', valore: 'CGA 640×400' }], incerti: ['ram'], immagine: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Olivetti_M24.jpg' };
      const text = mode === 'prosa' && !conv ? 'L\'Olivetti M24 è un personal computer del 1984 con processore 8086.' : '```json\n' + JSON.stringify(obj) + '\n```';
      return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'ragionamento', thought: true }, { text }] }, groundingMetadata: conv ? undefined : { groundingChunks: [{ web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', title: 'wikipedia.org' } }, { web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/def', title: 'oldcomputers.net' } }] } }] }) });
    });
    eq(await G.evaluate(() => gemPick(['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-pro', 'gemini-3.6-flash-preview', 'gemini-flash-latest'])), 'gemini-3.5-flash', 'Flash stabile più recente');
    await G.evaluate(() => openAdd()); await G.click('[data-a="gem"]'); await G.waitForSelector('#gk');
    await G.fill('#gk', 'sbagliata'); await G.click('#gks'); await G.waitForFunction(() => /Chiave API non valida/.test(document.querySelector('#gkm').textContent));
    await G.fill('#gk', 'AIzaTEST'); await G.click('#gks'); await G.waitForSelector('#gmq', { timeout: 5000 });
    eq(await G.evaluate(() => [gemCfg().ok, gemCfg().model, [...document.querySelectorAll('.page')].length]), ['gemini-3.5-flash', '', 2], 'chiave provata con una richiesta vera, modello Flash stabile più recente, pagina Gemini al posto delle impostazioni');
    await G.fill('#gmq', 'Olivetti M24'); await G.fill('#gmm', 'Olivetti'); await G.click('#gmb'); await G.waitForSelector('[data-use]');
    const req = calls.filter(c => c[0] === 'POST').pop();
    ok(/models\/gemini-3\.5-flash:generateContent$/.test(req[1]) && req[3].tools[0].google_search && /Olivetti M24/.test(req[3].contents[0].parts[0].text) && /marca: Olivetti/.test(req[3].contents[0].parts[0].text) && !/"luogo"|"acq_prezzo"|"stato"/.test(req[3].contents[0].parts[0].text), 'richiesta con ricerca Google, senza dati personali');
    ok(await G.evaluate(() => { const t = stack[stack.length - 1].textContent; return /Fonti consultate \(2\)/.test(t) && /Dati incerti secondo Gemini: RAM/.test(t) && /campi compilati/.test(t); }), 'anteprima con fonti e dati incerti');
    await G.evaluate(() => { window.fetchBlob = async () => { throw new Error('offline'); }; });
    await G.click('[data-use]'); await G.waitForSelector('[name="cpu"]');
    eq(await G.evaluate(() => ['nome', 'marca', 'tipologia', 'anno', 'cpu', 'ram', 'os_orig', 'tv_formato'].map(k => (document.querySelector(`[name="${k}"]`) || {}).value)), ['Olivetti M24', 'Olivetti', 'Computer desktop', '1984', 'Intel 8086 a 8 MHz', '128 KB (espandibile a 640 KB)', 'MS-DOS 2.11', ''], 'modulo compilato (tipologia e anno normalizzati, valore non ammesso scartato)');
    mode = 'prosa'; const n0 = calls.length;
    const r2 = await G.evaluate(() => gemAsk('Olivetti M24', '').then(r => [r.fields.nome, r.sources.length, r.specs.length]));
    eq([r2, calls.slice(n0).filter(c => c[0] === 'POST').map(c => !!c[3].tools)], [['Olivetti M24', 2, 2], [true, false]], 'risposta in prosa → seconda chiamata che la trasforma in JSON');
    await G.context().close();
  });

  await test('Gemini: errori di Google spiegati, cambio di modello sul 429 e ricerca senza web come ultima risorsa', async () => {
    const G = await phone('G2');
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
    let plan = {}; const posts = [];
    const q429 = (msg, quotaId, val, retry) => ({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: msg, details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId, quotaValue: val }] }, ...(retry ? [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: retry }] : [])] } });
    await G.context().route('https://generativelanguage.googleapis.com/**', r => {
      const q = r.request(); if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
      const u = new URL(q.url());
      if (u.pathname.endsWith('/openai/models')) return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ data: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].map(n => ({ id: 'models/' + n })) }) });
      if (u.pathname.endsWith('/models')) return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ models: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].map(n => ({ name: 'models/' + n, supportedGenerationMethods: ['generateContent'] })) }) });
      const model = u.pathname.match(/models\/([^:]+):/)[1], body = JSON.parse(q.postData()), search = !!body.tools; posts.push(model + (search ? '+web' : ''));
      const f = plan[model + (search ? '+web' : '')] || plan[model];
      if (f) return r.fulfill({ status: f.status || 429, headers: H, body: JSON.stringify(f.body) });
      return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ nome: 'Psion Series 5mx', marca: 'Psion', anno: 1999 }) }] } }] }) });
    });
    await G.evaluate(() => LS.set('rd_gem', { key: 'AIzaTEST', model: '', ok: '' }));
    // 1) il modello più nuovo non ha richieste gratuite (limite 0): si passa da soli al successivo e lo si ricorda
    plan = { 'gemini-3.5-flash': { body: q429('Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3.5-flash', 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', '0') } };
    const r1 = await G.evaluate(() => gemAsk('Psion Series 5mx', '').then(r => [r.fields.nome, r.tried.map(t => t.join(':')), gemCfg().ok, gemCooling('gemini-3.5-flash').kind]));
    eq(r1, ['Psion Series 5mx', ['gemini-3.5-flash:ricerca gratis0', 'gemini-3.5-flash:gratis0'], 'gemini-2.5-flash', 'gratis0'], 'Piano B dopo il limite 0 (prima senza ricerca, poi altro modello)');
    posts.length = 0; await G.evaluate(() => gemAsk('Psion Series 5mx', ''));
    eq(posts, ['gemini-2.5-flash+web'], 'la volta dopo parte subito dal modello che funziona e salta quello esaurito');
    // 2) nessun modello con quota gratuita → spiegazione chiara con i modelli provati
    await G.evaluate(() => { LS.set('rd_gem_cd', {}); LS.set('rd_gem', { key: 'AIzaTEST', model: '', ok: '' }); });
    plan = Object.fromEntries(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].map(m => [m, { body: q429(`Quota exceeded ... limit: 0, model: ${m}`, 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', '0') }]));
    await G.evaluate(() => openGemini({ q: 'Psion Series 5mx', onResult() {} })); await G.waitForSelector('.errc');
    ok(await G.evaluate(() => { const t = document.querySelector('.errc').textContent; return /Nessun modello gratuito per questa chiave/.test(t) && /modelli provati: gemini-3\.5-flash → ricerca gratis0, gemini-3\.5-flash → gratis0, gemini-2\.5-flash → ricerca gratis0, gemini-2\.5-flash → gratis0/.test(t) && /limit: 0/.test(t) && !!document.querySelector('.errc [data-eretry]') && !!document.querySelector('.errc [data-eset="gem"]'); }), 'scheda d\'errore con rimedio, dettagli, Riprova e Impostazioni');
    await G.evaluate(() => goBase()); await G.waitForTimeout(300);
    // 3) limite giornaliero su tutti: si dice a che ora torna disponibile
    await G.evaluate(() => { LS.set('rd_gem_cd', {}); });
    plan = Object.fromEntries(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].map(m => [m, { body: q429('Quota exceeded for metric: generate_content_free_tier_requests, limit: 20', 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', '20') }]));
    eq(await G.evaluate(() => gemAsk('x', '').catch(e => { const i = errInfo(e); return [e.kind, /Richieste gratuite di oggi finite/.test(i.title), /si azzera alle \d{2}:\d{2}/.test(i.remedy)]; })), ['giorno', true, true], 'limite giornaliero con orario');
    // 4) limite al minuto con retryDelay di Google
    await G.evaluate(() => { LS.set('rd_gem_cd', {}); });
    plan = Object.fromEntries(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].map(m => [m, { body: q429('Resource has been exhausted (e.g. check quota).', 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier', '10', '34s') }]));
    eq(await G.evaluate(() => gemAsk('x', '').catch(e => [e.kind, Math.round(gemCooling('gemini-2.5-flash').until - Date.now()) > 30000 && Math.round(gemCooling('gemini-2.5-flash').until - Date.now()) <= 34000, /riprova tra \d+ secondi/.test(errInfo(e).remedy)])), ['minuto', true, true], 'limite al minuto con attesa di Google');
    // 5) solo la ricerca Google è esaurita: si riprova senza ricerca web e lo si dice
    await G.evaluate(() => { LS.set('rd_gem_cd', {}); LS.set('rd_gem', { key: 'AIzaTEST', model: '', ok: '' }); });
    plan = Object.fromEntries(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].map(m => [m + '+web', { body: q429('Quota exceeded for Google Search grounding requests per day', 'SearchGroundingRequestsPerDay-FreeTier', '500') }]));
    posts.length = 0;
    eq(await G.evaluate(() => gemAsk('Psion Series 5mx', '').then(r => [r.noSearch, r.fields.nome]).catch(e => e.kind + ' ' + e.message)), [true, 'Psion Series 5mx'], 'risultato senza ricerca web');
    eq(posts.slice(-1), ['gemini-3.5-flash'], 'ultimo tentativo senza strumenti di ricerca');
    // 5b) la ricerca web ha limite 0 (messaggio generico, senza parlare di ricerca): stesso modello senza ricerca, e la volta dopo niente ricerca
    await G.evaluate(() => { LS.set('rd_gem_cd', {}); LS.set('rd_gem_ns', null); LS.set('rd_gem', { key: 'AIzaTEST', model: '', ok: '' }); });
    plan = Object.fromEntries(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].map(m => [m + '+web', { body: q429(`Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: ${m}`, 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', '0') }]));
    posts.length = 0;
    eq(await G.evaluate(() => gemAsk('Psion Series 5mx', '').then(r => [r.noSearch, r.searchBlocked, r.fields.nome, gemCooling('gemini-3.5-flash') || null, gemNoSearch()])), [true, true, 'Psion Series 5mx', null, true], 'stesso modello senza ricerca, modello non segnato come esaurito');
    eq(posts, ['gemini-3.5-flash+web', 'gemini-3.5-flash'], 'due sole richieste');
    posts.length = 0; await G.evaluate(() => gemAsk('Psion Series 5mx', '')); eq(posts, ['gemini-3.5-flash'], 'la volta dopo direttamente senza ricerca');
    await G.evaluate(() => LS.set('rd_gem_ns', null));
    // 5c) messaggio reale di Google: «You exceeded your current quota, please check your plan and billing details» senza dettagli → non è fatturazione: si prova il modello successivo
    await G.evaluate(() => { LS.set('rd_gem_cd', {}); LS.set('rd_gem_ns', null); LS.set('rd_gem', { key: 'AIzaTEST', model: '', ok: '' }); });
    const generic = { error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.google.com/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit.' } };
    plan = { 'gemini-3.5-flash': { body: generic }, 'gemini-2.5-flash-lite': { body: generic } };
    posts.length = 0;
    eq(await G.evaluate(() => gemAsk('Psion Series 5mx', '').then(r => [r.fields.nome, gemCfg().ok, r.tried.map(t => t.join(':')), gemCooling('gemini-3.5-flash').kind]).catch(e => 'ERRORE ' + e.kind)), ['Psion Series 5mx', 'gemini-2.5-flash', ['gemini-3.5-flash:ricerca quota', 'gemini-3.5-flash:quota'], 'quota'], 'quota generica: si passa al modello successivo');
    eq(await G.evaluate(() => { const e = new AppErr('x', 'y'); return [errInfo(new AppErr('quota', 'q')).title, ERR_INFO.credito[1]]; }), ['Quota del modello esaurita o non disponibile', 'Fatturazione o credito'], 'messaggi');
    // 6) chiave sbagliata: si ferma subito, senza provare altri modelli
    plan = { 'gemini-3.5-flash+web': { status: 400, body: { error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }] } } } };
    await G.evaluate(() => { LS.set('rd_gem_cd', {}); LS.set('rd_gem', { key: 'AIzaTEST', model: '', ok: '' }); }); posts.length = 0;
    eq(await G.evaluate(() => gemAsk('x', '').catch(e => e.kind)), 'chiave', 'chiave non valida'); eq(posts, ['gemini-3.5-flash+web'], 'nessun altro modello provato');
    // 7) registro degli errori
    ok(await G.evaluate(() => { const a = LS.get('rd_errlog', []); return a.length >= 1 && a.some(x => x.kind === 'gratis0tutti' && /limit: 0/.test(x.d)); }), 'errori nel registro');
    await G.evaluate(() => openErrLog()); ok(await G.evaluate(() => /Nessun modello gratuito/.test(stack[stack.length - 1].textContent)), 'pagina del registro');
    await G.context().close();
  });

  await test('Gemini: modelli scansionati e da provare, scelta manuale, ingresso compatibile come ARGOS', async () => {
    const G = await phone('G3');
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
    const seen = []; let nativeDown = false;
    await G.context().route('https://generativelanguage.googleapis.com/**', r => {
      const q = r.request(); if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
      const u = new URL(q.url()); seen.push(q.method() + ' ' + u.pathname.replace('/v1beta', ''));
      if (u.pathname.endsWith('/openai/models')) return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ data: [{ id: 'models/gemini-2.5-flash' }, { id: 'models/gemini-2.5-flash-lite' }, { id: 'models/text-embedding-004' }] }) });
      if (u.pathname.endsWith('/openai/chat/completions')) return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ nome: 'Olivetti M24', marca: 'Olivetti', anno: 1984 }) } }] }) });
      if (nativeDown) return r.abort();
      return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ nome: 'Olivetti M24', marca: 'Olivetti', anno: 1984 }) }] } }] }) });
    });
    await G.evaluate(() => openGemSettings()); await G.fill('#gk', 'AIzaTEST1234567890abcdefghij'); await G.waitForFunction(() => /2 modelli trovati \(ingresso compatibile\)/.test(document.querySelector('#gmi').textContent), null, { timeout: 5000 });
    const opts = await G.evaluate(() => [...document.querySelectorAll('#gmd optgroup')].map(g => [g.label, [...g.querySelectorAll('option')].map(o => o.value)]));
    eq(opts[0], ['Trovati con la tua chiave (2)', ['gemini-2.5-flash', 'gemini-2.5-flash-lite']], 'modelli scansionati');
    ok(opts[1][1].includes('gemini-3.6-flash') && opts[1][1].includes('gemini-3.6-flash-lite') && opts[1][1].includes('gemini-3.5-flash'), 'nomi da provare a mano');
    await G.selectOption('#gmd', 'gemini-3.6-flash');
    eq(await G.evaluate(() => [gemCfg().model, gemOrder(['gemini-2.5-flash', 'gemini-2.5-flash-lite'])[0]]), ['gemini-3.6-flash', 'gemini-3.6-flash'], 'il modello scelto a mano si usa anche se non è nell\'elenco');
    await G.fill('#gmn', 'models/gemini-9.9-flash'); await G.dispatchEvent('#gmn', 'change');
    eq(await G.evaluate(() => gemCfg().model), 'gemini-9.9-flash', 'nome scritto a mano');
    seen.length = 0;
    eq(await G.evaluate(() => gemAsk('Olivetti M24', '').then(r => [r.fields.nome, r.noSearch, r.via || 'nativo'])), ['Olivetti M24', false, 'nativo'], 'ingresso nativo con ricerca');
    ok(seen.some(x => x === 'POST /models/gemini-9.9-flash:generateContent'), 'chiamata al modello scelto');
    nativeDown = true;
    eq(await G.evaluate(() => gemAsk('Olivetti M24', '').then(r => [r.fields.anno, r.noSearch, r.via])), [1984, true, 'compatibile'], 'ingresso nativo irraggiungibile → compatibile senza ricerca');
    await G.context().close();
  });

  await test('OpenRouter: riserva quando Gemini non risponde, e da solo senza Gemini', async () => {
    const O = await phone('O');
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
    const orCalls = []; let orPlan = {};
    await O.context().route('https://generativelanguage.googleapis.com/**', r => {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
      const u = new URL(r.request().url());
      if (/\/models$/.test(u.pathname)) return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ data: [{ id: 'models/gemini-2.5-flash' }] }) });
      return r.fulfill({ status: 429, headers: H, body: JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'You exceeded your current quota, please check your plan and billing details.' } }) });
    });
    await O.context().route('https://openrouter.ai/api/v1/**', r => {
      const q = r.request(); if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
      const u = new URL(q.url());
      if (u.pathname.endsWith('/models')) return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ data: [
        { id: 'openai/gpt-5', pricing: { prompt: '0.00001', completion: '0.00003' }, context_length: 400000 },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', pricing: { prompt: '0', completion: '0' }, context_length: 131072 },
        { id: 'deepseek/deepseek-chat-v3.1:free', pricing: { prompt: '0', completion: '0' }, context_length: 163840 },
        { id: 'qwen/qwen2.5-vl-32b-instruct:free', pricing: { prompt: '0', completion: '0' }, context_length: 32000 }] }) });
      const b = JSON.parse(q.postData()); orCalls.push([b.model, q.headers()['authorization']]);
      const f = orPlan[b.model]; if (f) return r.fulfill({ status: f.status, headers: H, body: JSON.stringify(f.body) });
      return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: '```json\n' + JSON.stringify({ nome: 'Sony KV-1400', marca: 'Sony', tipologia: 'Televisore CRT', anno: 1968 }) + '\n```' } }] }) });
    });
    // impostazioni: solo modelli gratuiti, ordinati
    await O.evaluate(() => openORSettings()); await O.waitForFunction(() => /3 modelli gratuiti/.test(document.querySelector('#ori').textContent), null, { timeout: 5000 });
    eq(await O.evaluate(() => [...document.querySelectorAll('#orm optgroup option')].map(o => o.value)), ['deepseek/deepseek-chat-v3.1:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen2.5-vl-32b-instruct:free'], 'gratuiti, i migliori prima');
    await O.fill('#ork', 'sk-or-v1-test'); await O.click('#ors'); await O.waitForFunction(() => /OpenRouter collegato/.test(document.querySelector('#orb').textContent), null, { timeout: 5000 });
    eq(orCalls[0], ['deepseek/deepseek-chat-v3.1:free', 'Bearer sk-or-v1-test'], 'prova della chiave');
    await O.evaluate(() => goBase()); await O.waitForTimeout(300);
    // da solo (senza Gemini)
    eq(await O.evaluate(() => aiAsk('Sony KV-1400', '').then(r => [r.via, r.fields.nome, r.fields.tipologia, r.noSearch, /OpenRouter \(deepseek/.test(r.fonteNome)])), ['openrouter', 'Sony KV-1400', 'Televisore CRT', true, true], 'OpenRouter da solo');
    // riserva: Gemini 429 su tutto → OpenRouter, con il primo modello al limite giornaliero
    await O.evaluate(() => LS.set('rd_gem', { key: 'AIzaTEST', model: '', ok: '' }));
    orPlan = { 'deepseek/deepseek-chat-v3.1:free': { status: 429, body: { error: { code: 429, message: 'Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day' } } } };
    const r = await O.evaluate(() => aiAsk('Sony KV-1400', '').then(r => [r.via, r.gemErr && r.gemErr.kind, orCfg().ok, r.tried.map(t => t.join(':')), orCooling('deepseek/deepseek-chat-v3.1:free').kind]));
    eq(r, ['openrouter', 'gratis0tutti', 'meta-llama/llama-3.3-70b-instruct:free', ['deepseek/deepseek-chat-v3.1:free:giorno'], 'giorno'], 'Gemini esaurito → OpenRouter, modello al limite saltato');
    // nella pagina: nota della riserva
    await O.evaluate(() => openGemini({ q: 'Sony KV-1400', onResult() {} })); await O.waitForSelector('[data-use]');
    ok(await O.evaluate(() => /Gemini non ha risposto .*riserva OpenRouter/.test(stack[stack.length - 1].textContent) && /Senza ricerca web/.test(stack[stack.length - 1].textContent)), 'nota della riserva nella pagina');
    await O.evaluate(() => goBase()); await O.waitForTimeout(300);
    // chiave OpenRouter sbagliata: messaggio specifico
    orPlan = { 'meta-llama/llama-3.3-70b-instruct:free': { status: 401, body: { error: { code: 401, message: 'No auth credentials found' } } } };
    eq(await O.evaluate(() => aiAsk('x', '').catch(e => [e.kind, e.via, errInfo(e).title, /prima Gemini/.test(e.raw)])), ['chiave', 'openrouter', 'Chiave OpenRouter non valida', true], 'errore OpenRouter con la storia di Gemini');
    await O.context().close();
  });

  await test('errori di rete nelle ricerche: scheda con spiegazione e Riprova', async () => {
    await p.evaluate(() => openLookup({ prefill: 'Psion', marca: 'Psion', onResult() {} })); await p.click('#lg'); await p.waitForSelector('.errc', { timeout: 8000 });
    ok(await p.evaluate(() => { const c = document.querySelector('.errc'); return /Nessuna connessione|Qualcosa non ha funzionato/.test(c.textContent) && !!c.querySelector('[data-eretry]') && !!c.querySelector('pre'); }), 'scheda d\'errore nella ricerca');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('vetro liquido: mappe calcolate dal modello WebGL e applicate come filtro', async () => {
    const r = await p.evaluate(async () => { lgSet('full'); await new Promise(r => setTimeout(r, 300));
      const f = document.querySelector('#' + ($('#top .search').style.backdropFilter.match(/#(lgf\d+)/) || [])[1]);
      const fab = document.querySelector('#' + ($('#fab').style.backdropFilter.match(/#(lgf\d+)/) || [])[1]);
      const m = [...LG.maps.values()][0];
      const out = [document.documentElement.classList.contains('lg'), !!f, !!fab, f && f.querySelectorAll('feDisplacementMap').length, /^data:image\/png/.test(m.disp) && /^data:image\/png/.test(m.spec)];
      lgSet('lite'); await new Promise(r => setTimeout(r, 300));
      const f2 = document.querySelector('#' + ($('#top .search').style.backdropFilter.match(/#(lgf\d+)/) || [])[1]);
      out.push(f2 && f2.querySelectorAll('feDisplacementMap').length);
      lgSet('off'); out.push(document.documentElement.classList.contains('lg'), $('#top .search').style.backdropFilter);
      lgSet('full'); return out; });
    eq(r, [true, true, true, 3, true, 1, false, ''], 'completo (dispersione RGB), leggero, spento');
    eq(await p.evaluate(() => { const c = document.createElement('canvas'), g = lgGL(), im = new Image(); return new Promise(res => { im.onload = () => { c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const mid = x.getImageData(im.width >> 1, im.height >> 1, 1, 1).data, edge = x.getImageData(2, im.height >> 1, 1, 1).data; res([Math.abs(mid[0] - 128) < 3, Math.abs(edge[0] - 128) > 8]); }; im.src = lgMaps(120, 60, 30, { ext: [0, 0, 0, 0] }).disp; }); }), [true, true], 'nessuno spostamento al centro, rifrazione sul bordo');
  });

  await test('niente scorrimento laterale: link lunghi a capo, fonte abbreviata, testo della scheda animato', async () => {
    await p.evaluate(async () => { await saveDev({ id: 'lng', nome: 'PowerBook G4 400 (Original - Titanium) con un nome lunghissimo', tipologia: 'Portatile', fonte: 'https://everymac.com/systems/apple/powerbook_g4/specs/powerbook_g4_400_original_titanium_specifications_very_long_url.html', note: 'https://example.com/' + 'x'.repeat(160), creato: Date.now() }); render(); openDetail('lng'); });
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => { const b = stack[stack.length - 1].querySelector('.body'); return [b.scrollWidth <= b.clientWidth + 1, document.documentElement.scrollWidth <= innerWidth + 1, /^everymac\.com · powerbook g4 400 original titanium .*…$/.test([...b.querySelectorAll('a')].find(a => /everymac/.test(a.href)).textContent), stack[stack.length - 1].classList.contains('det'), getComputedStyle(stack[stack.length - 1].querySelector('.cap h1')).animationName]; });
    eq(r, [true, true, true, true, 'tx-in'], 'pagina larga quanto lo schermo, fonte abbreviata, titolo animato');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('ricambi: niente sezione Manutenzione né anno, fuori dal giro di ricarica', async () => {
    await p.evaluate(async () => { await saveDev({ id: 'bip', nome: 'Batteria iPod Nano', tipologia: 'Ricambio', part_cat: 'Batteria', anno: 2006, creato: Date.now() }); render(); });
    eq(await p.evaluate(() => [manTargets(devices.find(d => d.id === 'bip')).length, manHTML(devices.find(d => d.id === 'bip')), /class="yr"/.test(card(devices.find(d => d.id === 'bip')))]), [0, '', false], 'giro, scheda ed elenco');
    await p.evaluate(() => openForm(devices.find(d => d.id === 'bip'))); await p.waitForTimeout(300);
    const vis = () => p.evaluate(() => { const pg = stack[stack.length - 1], sec = [...pg.querySelectorAll('.sec-t')].find(x => x.textContent === 'Manutenzione').parentElement, an = pg.querySelector('[name="anno"]').closest('[data-when]'); return [sec.hidden, an.hidden]; });
    eq(await vis(), [true, true], 'nascosti per un ricambio');
    await p.evaluate(() => { const f = stack[stack.length - 1].querySelector('[name="tipologia"]'); f.value = 'Portatile'; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(100);
    eq(await vis(), [false, false], 'ricompaiono cambiando tipologia');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
  });

  await test('doppione all\'inserimento: aggiunto come esemplare dell\'oggetto che c\'è già', async () => {
    const D = await phone('D');
    await D.evaluate(async () => { await saveDev({ id: 'dpa', nome: 'Macintosh Classic II', modello: 'M4150', tipologia: 'All-in-one', stato: 'Funzionante', luogo: 'Damiano', creato: Date.now() }); render(); openForm({ nome: 'Macintosh Classic II', modello: 'M-4150', tipologia: 'All-in-one', stato: 'Da riparare' }); });
    await D.waitForTimeout(300); await D.click('[data-save]'); await D.waitForSelector('.modal .chs');
    ok(await D.evaluate(() => /Hai già «Macintosh Classic II» \(Damiano\)/.test(document.querySelector('.modal').textContent)), 'avviso');
    await D.click('.modal [data-c="0"]'); await D.waitForTimeout(700);
    eq(await D.evaluate(() => { const d = devices.find(x => x.id === 'dpa'); return [d.esemplari.length, d.esemplari.map(u => u.stato), devices.filter(x => x.nome === 'Macintosh Classic II').length]; }), [2, ['Funzionante', 'Da riparare'], 1], 'unito come secondo esemplare');
    await D.context().close();
  });

  await test('filtri salvati: si salvano dalla pagina Filtri e si applicano con un tocco', async () => {
    await p.evaluate(() => { S.view = 'col'; S.q = ''; S.sel = { luogo: ['Alex'] }; render(); openFilters(); }); await p.waitForTimeout(300);
    await p.fill('#sName', 'Da Alex'); await p.click('[data-ssave]'); await p.waitForTimeout(200);
    await p.evaluate(() => { goBase(); S.sel = {}; render(); }); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !$('#smart').hidden && /★ Da Alex/.test($('#smart').textContent)), 'capsula sotto la ricerca');
    await p.click('#smart [data-smart]'); await p.waitForTimeout(150);
    eq(await p.evaluate(() => [S.sel.luogo, $('#smart .chip').classList.contains('on'), render.items.every(id => vals(devices.find(d => d.id === id), 'luogo').includes('Alex'))]), [['Alex'], true, true], 'filtro applicato');
    await p.click('#smart [data-smart]'); await p.waitForTimeout(150);
    eq(await p.evaluate(() => Object.values(S.sel).flat().length), 0, 'secondo tocco: filtro tolto');
  });

  await test('scheda: si passa all\'oggetto vicino nell\'ordine dell\'elenco', async () => {
    await p.evaluate(() => { S.view = 'col'; S.q = ''; S.sel = {}; render(); openDetail(render.items[1]); }); await p.waitForTimeout(500);
    const r = await p.evaluate(() => [stack[stack.length - 1].querySelector('.hpos').textContent, render.items.length]);
    eq(r[0], `2 / ${r[1]}`, 'posizione nell\'elenco');
    await p.evaluate(() => detailStep(render.items[1], 1)); await p.waitForTimeout(500);
    eq(await p.evaluate(() => [stack.length, stack[stack.length - 1].dataset.did === render.items[2], stack[stack.length - 1].classList.contains('sw-next')]), [1, true, true], 'scheda successiva al posto della precedente');
    await p.evaluate(() => goBase()); await p.waitForTimeout(400);
  });

  await test('versioni precedenti: si recupera un oggetto eliminato dalla cronologia su GitHub', async () => {
    const A = await phone('A4');
    await A.evaluate(() => LS.set('rd_gh', { repo: 'test/RDDC', token: 'TOKEN', branch: 'main' }));
    await A.evaluate(async () => { const v = document.createElement('canvas'); v.width = v.height = 20; v.getContext('2d').fillRect(0, 0, 20, 20); const img = v.toDataURL('image/jpeg', .8);
      await saveDev({ id: 'vr1', nome: 'Apple IIc', luogo: 'Alex', foto: [img], thumb: img, creato: Date.now() }); await saveDev({ id: 'vr2', nome: 'Commodore 64', luogo: 'Damiano', creato: Date.now() }); await ghSync(true);
      const d = devices.find(x => x.id === 'vr1'); await DB.del(d.id); markDeleted(d.id); devices = devices.filter(x => x.id !== 'vr1');
      const c = devices.find(x => x.id === 'vr2'); c.luogo = 'Alex'; await saveDev(c); await ghSync(true); render(); });
    await A.evaluate(() => openVersions()); await A.waitForSelector('[data-ver]');
    const n = await A.evaluate(() => document.querySelectorAll('[data-ver]').length); ok(n >= 2, 'cronologia: ' + n + ' versioni');
    await A.click('[data-ver]:nth-child(2)'); await A.waitForSelector('[data-vr]');
    ok(await A.evaluate(() => { const t = stack[stack.length - 1].textContent; return /Apple IIc/.test(t) && /eliminato da allora/.test(t) && /Commodore 64/.test(t) && /modificato da allora/.test(t); }), 'differenze con oggi');
    await A.click('[data-vr="vr1"]'); await A.waitForTimeout(600);
    eq(await A.evaluate(() => { const d = devices.find(x => x.id === 'vr1'); return d ? [d.nome, /^data:image/.test(d.foto[0]), deletedMap().has('vr1')] : null; }), ['Apple IIc', true, false], 'oggetto eliminato ripristinato con la foto');
    await A.context().close();
  });

  await test('Fold aperto: elenco a sinistra e scheda nel pannello a destra', async () => {
    const W = await phone('W', { viewport: { width: 760, height: 900 } });
    await W.evaluate(async () => { for (const [id, n] of [['w1', 'iBook G3'], ['w2', 'PowerBook G4']]) await saveDev({ id, nome: n, tipologia: 'Portatile', creato: Date.now() }); render(); });
    const r = await W.evaluate(() => { const lw = $('#list').getBoundingClientRect().width; return [Math.round(lw), getComputedStyle($('#pane0')).display]; });
    ok(r[0] >= 300 && r[0] <= 440 && r[1] === 'grid', 'colonna dell\'elenco e pannello vuoto: ' + r);
    await W.click('#list [data-id="w1"]'); await W.waitForTimeout(600);
    const pg = await W.evaluate(() => { const b = stack[stack.length - 1].getBoundingClientRect(); return [Math.round(b.left), stack.length]; });
    ok(pg[0] >= 300 && pg[1] === 1, 'scheda nel pannello destro: ' + pg);
    await W.click('#list [data-id="w2"]'); await W.waitForTimeout(600);
    eq(await W.evaluate(() => [stack.length, stack[stack.length - 1].dataset.did]), [1, 'w2'], 'un altro oggetto sostituisce la scheda');
    await W.context().close();
  });

  await test('dati dalle fonti online: il modulo è pronto subito, senza scaricare foto né aspettare la traduzione', async () => {
    const hits = []; await p.context().route('https://img.esempio.test/**', r => { hits.push(r.request().url()); return new Promise(() => {}); });
    const r = await p.evaluate(async () => { LS.set('rd_tr', true); const t0 = performance.now();
      const m = await mergeFetched({ wish: false }, { fields: { nome: 'PowerBook G4 400', descrizione: 'The PowerBook G4 400 is a laptop computer that was introduced by Apple in January 2001 as part of the titanium line. It features a PowerPC G4 processor running at 400 MHz.' }, specs: [['RAM', '128 MB']], imageUrl: 'https://img.esempio.test/foto.jpg', imageAlt: ['https://img.esempio.test/altra.jpg'] }, true);
      return [Math.round(performance.now() - t0) < 300, m.nome, !!(m.foto && m.foto.length), /^The PowerBook/.test(m.descrizione)]; });
    eq(r, [true, 'PowerBook G4 400', false, true], 'pronto in meno di 0,3 s, senza foto, descrizione da tradurre dopo');
    eq(hits.length, 0, 'nessun tentativo di scaricare la foto');
  });

  await test('2.7: interventi leggibili (data sopra al testo) e niente manutenzione per gli accessori', async () => {
    const U = await phone('U');
    await U.evaluate(async () => { await saveDev({ id: 'pb', nome: 'PowerBook G4 400', tipologia: 'Portatile', creato: Date.now(), interventi: [{ id: 'i1', data: '2026-04-20', tipo: 'Retrobright', desc: 'Riverniciatura cardini e restauro completo angolari', costo: '15' }], valori: [{ id: 'v1', data: '2026-01-02', valore: 500, fonte: 'Stima' }], valore: 500 });
      await saveDev({ id: 'ch', nome: 'PowerBook G4 Power Adapter', tipologia: 'Alimentatore / caricabatterie', collegato: 'pb', creato: Date.now() }); render(); openDetail('pb'); });
    await U.waitForTimeout(500);
    const r = await U.evaluate(() => [...document.querySelectorAll('.page.det .li')].map(li => { const a = li.querySelector('.ld').getBoundingClientRect(), b = li.querySelector('.lb').getBoundingClientRect(); return [a.bottom <= b.top + 1, b.width > 250]; }));
    ok(r.length >= 2 && r.every(x => x[0] && x[1]), 'data sopra e testo largo (interventi e valutazioni): ' + JSON.stringify(r));
    eq(await U.evaluate(() => { const c = devices.find(x => x.id === 'ch'); return [manTargets(c).length, manBadge(c), manHTML(c)]; }), [0, '', ''], 'caricabatterie fuori dal giro');
    await U.evaluate(() => goBase(() => openForm(devices.find(x => x.id === 'ch')))); await U.waitForTimeout(400);
    eq(await U.evaluate(() => [...stack[stack.length - 1].querySelectorAll('.sec-t')].find(x => x.textContent === 'Manutenzione').parentElement.hidden), true, 'sezione Manutenzione nascosta per un accessorio');
    await U.evaluate(() => goBase(() => openForm({ nome: 'iMac G3', tipologia: 'All-in-one' }))); await U.waitForTimeout(400);
    eq(await U.evaluate(() => { const pg = stack[stack.length - 1]; return [pg.querySelector('[name="man_freq"]').value, !!pg.querySelector('header [data-save]')]; }), ['6', true], 'accensione e ricarica ogni 6 mesi di serie, Salva in alto');
    await U.evaluate(() => goBase()); await U.waitForTimeout(300);
    await U.context().close();
  });

  await test('2.7: prezzo chiesto quando un pezzo diventa «Ordinato»', async () => {
    const U = await phone('U2');
    await U.evaluate(async () => { await saveDev({ id: 'pp', nome: 'iBook G3', tipologia: 'Portatile', creato: Date.now(), progetti: [{ id: 'pj', titolo: 'Restauro', stato: 'In attesa pezzi', creato: '2026-01-01', pezzi: [{ id: 'z1', t: 'Batteria', qta: 2, stato: 'Da comprare' }, { id: 'z2', t: 'Viti', qta: 1, prezzo: 3, stato: 'Da comprare' }] }] }); });
    U.evaluate(() => { const d = devices.find(x => x.id === 'pp'), p = d.progetti[0]; window._pz = pzNext(d, p, p.pezzi[0]); });
    await U.waitForSelector('#apv'); ok(await U.evaluate(() => /×2/.test(document.querySelector('.modal').textContent)), 'ricorda che è il prezzo di un pezzo');
    await U.fill('#apv', '12.5'); await U.click('.modal [data-y]'); await U.evaluate(() => window._pz);
    eq(await U.evaluate(() => { const z = devices.find(x => x.id === 'pp').progetti[0].pezzi[0]; return [z.stato, z.prezzo]; }), ['Ordinato', 12.5], 'prezzo salvato');
    await U.evaluate(async () => { const d = devices.find(x => x.id === 'pp'), p = d.progetti[0]; await pzNext(d, p, p.pezzi[1]); });
    eq(await U.evaluate(() => [!!document.querySelector('#apv'), devices.find(x => x.id === 'pp').progetti[0].pezzi[1].stato]), [false, 'Ordinato'], 'con il prezzo già scritto non chiede nulla');
    await U.context().close();
  });

  await test('2.7: tasti della scheda ordinati, foglio «Altro», menu semplificato con Esporta…', async () => {
    const U = await phone('U3');
    await U.evaluate(async () => { await saveDev({ id: 'ac', nome: 'Macintosh SE', tipologia: 'All-in-one', creato: Date.now() }); render(); openDetail('ac'); }); await U.waitForTimeout(500);
    eq(await U.evaluate(() => [...document.querySelectorAll('.page.det .acts2>.btn')].map(b => b.textContent.trim())), ['Modifica', '🔎 Aggiorna', '⋯'], 'due tasti principali e «Altro»');
    await U.click('.page.det [data-moreacts]'); await U.waitForSelector('.modal.sheet');
    const it = await U.evaluate(() => [...document.querySelectorAll('.modal.sheet .shi')].map(b => [b.textContent.trim(), b.classList.contains('dng')]));
    ok(it.some(x => /Duplica/.test(x[0])) && it[it.length - 1][0].includes('Elimina') && it[it.length - 1][1], 'azioni raggruppate, Elimina in rosso: ' + JSON.stringify(it));
    await U.evaluate(() => [...document.querySelectorAll('.modal.sheet .shi')].find(b => /Duplica/.test(b.textContent)).click()); await U.waitForTimeout(500);
    ok(await U.evaluate(() => devices.some(x => x.nome === 'Macintosh SE (copia)')), 'la voce del foglio esegue l\'azione');
    await U.evaluate(() => goBase(() => openMenu())); await U.waitForTimeout(400);
    eq(await U.evaluate(() => ['ai', 'db', 'exp', 'imp'].map(k => !!document.querySelector(`[data-m="${k}"]`)).concat([!!document.querySelector('#px'), !!document.querySelector('[data-m="gem"]')])), [true, true, true, true, false, false], 'voci raggruppate, proxy personale tolto');
    await U.evaluate(() => { window._dl = []; window.dl = (n, t, c) => window._dl.push(n); });
    await U.click('[data-m="exp"]'); await U.waitForSelector('.modal.sheet');
    eq(await U.evaluate(() => document.querySelectorAll('.modal.sheet .shi').length), 4, 'quattro modi di esportare');
    await U.click('.modal.sheet [data-c="1"]'); await U.waitForTimeout(200);
    eq(await U.evaluate(() => window._dl), ['rddc.csv'], 'scelta la tabella CSV');
    await U.click('[data-m="ai"]'); await U.waitForTimeout(400);
    eq(await U.evaluate(() => ['gem', 'orset', 'errlog'].map(k => !!stack[stack.length - 1].querySelector(`[data-m="${k}"]`))), [true, true, true], 'Collegamento IA: Gemini, OpenRouter e registro errori');
    await U.evaluate(() => history.back()); await U.waitForTimeout(300); await U.click('[data-m="db"]'); await U.waitForTimeout(400);
    eq(await U.evaluate(() => [stack[stack.length - 1].querySelectorAll('#dbi').length, !!stack[stack.length - 1].querySelector('#ght'), !!stack[stack.length - 1].querySelector('[data-m="vers"]')]), [1, true, true], 'Database su GitHub in una pagina');
    await U.context().close();
  });

  await test('2.7: la scheda si chiude tirandola in basso e torna sulla sua miniatura', async () => {
    const U = await phone('U4', { hasTouch: true, isMobile: true });
    await U.evaluate(async () => { const v = document.createElement('canvas'); v.width = 400; v.height = 300; v.getContext('2d').fillRect(0, 0, 400, 300); const img = v.toDataURL('image/jpeg', .8);
      await saveDev({ id: 'pd', nome: 'Apple IIe', tipologia: 'Computer', foto: [img], thumb: img, creato: Date.now() }); render(); openDetail('pd'); }); await U.waitForTimeout(600);
    const c = await U.context().newCDPSession(U), T = (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await T('touchStart', 200, 300); for (let i = 1; i <= 5; i++) { await T('touchMove', 200, 300 + i * 12); await U.waitForTimeout(20); }
    ok(await U.evaluate(() => { const m = new DOMMatrix(getComputedStyle(stack[0]).transform); return m.a < 1 && m.f > 0; }), 'la scheda segue il dito e si rimpicciolisce');
    await T('touchEnd'); await U.waitForTimeout(500);
    eq(await U.evaluate(() => stack.length), 1, 'trascinamento corto: torna a posto');
    await T('touchStart', 200, 300); for (let i = 1; i <= 12; i++) { await T('touchMove', 200, 300 + i * 20); await U.waitForTimeout(16); }
    await T('touchEnd'); await U.waitForTimeout(800);
    eq(await U.evaluate(() => [stack.length, document.querySelectorAll('.page,.pd-dim').length]), [0, 0], 'chiusa, senza pagine rimaste');
    await U.context().close();
  });

  await test('2.7.1: la foto vola tra miniatura e scheda con lo stesso ritaglio, anche se non è quadrata', async () => {
    const U = await phone('U6', { hasTouch: true, isMobile: true });
    await U.evaluate(async () => { const v = document.createElement('canvas'); v.width = 1200; v.height = 900; v.getContext('2d').fillRect(0, 0, 1200, 900); const img = v.toDataURL('image/jpeg', .8);
      await saveDev({ id: 'fl', nome: 'Apple Lisa', tipologia: 'Computer', foto: [img], thumb: img, creato: Date.now() }); render();
      window._fly = []; const o = heroFly; window.heroFly = (a, b, f, t, op) => { const T = typeof t === 'function' ? t : () => t; const done = op.onDone; return o(a, b, f, t, { ...op, onDone() { const x = T(); window._fly.push([f.r, x && x.r]); done && done(); } }); }; });
    await U.waitForTimeout(300);
    await U.click('#list [data-id="fl"] .th img'); await U.waitForTimeout(800);
    const r1 = await U.evaluate(() => { const h = stack[0].querySelector('.hero').getBoundingClientRect(), th = document.querySelector('#list [data-id="fl"] .th img'); return [window._fly.length, document.querySelectorAll('.hfly').length, stack[0].classList.contains('fly-in'), th.style.visibility, Math.round(window._fly[0][1].width) === Math.round(h.width) && Math.round(window._fly[0][1].height) === Math.round(h.height)]; });
    eq(r1, [1, 0, false, '', true], 'apertura: atterra sulla foto grande e poi sparisce');
    await U.evaluate(() => history.back()); await U.waitForTimeout(800);
    const r2 = await U.evaluate(() => { const t = document.querySelector('#list [data-id="fl"] .th img').getBoundingClientRect(), x = window._fly[1][1]; return [stack.length, document.querySelectorAll('.page,.hfly').length, Math.abs(x.left - t.left) < 1 && Math.abs(x.width - t.width) < 1]; });
    eq(r2, [0, 0, true], 'chiusura: torna esattamente sulla miniatura');
    await U.click('#list [data-id="fl"] .th img'); await U.waitForTimeout(800);
    const c = await U.context().newCDPSession(U), T = (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await T('touchStart', 200, 300); for (let i = 1; i <= 12; i++) { await T('touchMove', 200, 300 + i * 20); await U.waitForTimeout(16); } await T('touchEnd'); await U.waitForTimeout(900);
    eq(await U.evaluate(() => [stack.length, history.state && history.state.p, document.querySelectorAll('.page,.hfly,.pd-dim').length, window._fly.length]), [0, 0, 0, 4], 'tirata in basso: un solo passo indietro, la foto vola sulla miniatura');
    await U.context().close();
  });

  await test('2.8: worker Cloudflare per EveryMac, codici vecchi risolti dall\'indice e tasto «Inserisci i dati»', async () => {
    const U = await phone('U7'); const seen = [];
    const SPEC = `<html><head><title>PowerBook G4 400 (Original - Ti) Specs: EveryMac.com</title></head><body><h1>PowerBook G4 400 (Original - Ti) Specs</h1><table>
      <tr><td>Introduction Date:</td><td>January 9, 2001</td><td>Discontinued Date:</td><td>October 16, 2001</td></tr>
      <tr><td>Processor Speed:</td><td>400 MHz</td><td>Processor Type:</td><td>PowerPC 7410 (G4)</td></tr>
      <tr><td>Standard RAM:</td><td>128 MB</td><td>Maximum RAM:</td><td>1 GB</td></tr>
      <tr><td>Apple Order No:</td><td>M7952LL/A</td><td>Apple Model No:</td><td>M5884</td></tr>
      <tr><td>Model ID:</td><td>PowerBook3,2</td><td>EMC:</td><td>1854</td></tr></table></body></html>`;
    await U.context().route('https://rddc.prova.workers.dev/**', r => { const u = new URL(r.request().url()).searchParams.get('url') || ''; seen.push(u); const H = { 'access-control-allow-origin': '*', 'content-type': 'text/html' };
      if (!u) return r.fulfill({ status: 200, headers: H, body: 'RDDC worker attivo' });
      if (/search_keywords=A1278/.test(u)) return r.fulfill({ status: 200, headers: H, body: '<a class="specs" href="/systems/apple/macbook/specs/macbook-a-specs.html">MacBook A</a><a class="specs" href="/systems/apple/macbook/specs/macbook-b-specs.html">MacBook B</a>' });
      if (/search_keywords=M5884/.test(u)) return r.fulfill({ status: 200, headers: H, body: '<html><body><div id="contentcenter_4colwrapper"><br></div><textarea id="results">PowerBook G4 400 (Original - Ti)\n</textarea></body></html>' });
      if (/\/systems\/apple\/powerbook_g4\/$/.test(u)) return r.fulfill({ status: 200, headers: H, body: '<a href="/systems/apple/powerbook_g4/specs/powerbook_g4_400.html">PowerBook G4 400 (Original - Ti)</a><a href="/systems/apple/powerbook_g4/specs/powerbook_g4_500.html">PowerBook G4 500 (Original - Ti)</a>' });
      if (/powerbook_g4_400\.html$/.test(u)) return r.fulfill({ status: 200, headers: H, body: SPEC });
      return r.fulfill({ status: 404, headers: H, body: '' }); });
    await U.evaluate(() => goBase(() => openMenu())); await U.waitForTimeout(300); await U.click('[data-m="emw"]'); await U.waitForTimeout(300);
    ok(await U.evaluate(() => /export default/.test(stack[stack.length - 1].querySelector('pre').textContent)), 'codice del worker nella pagina');
    await U.fill('#px', 'rddc.prova.workers.dev'); await U.click('[data-w="save"]'); await U.waitForFunction(() => /Funziona|⚠️/.test(document.querySelector('#pxo').textContent));
    eq(await U.evaluate(() => [LS.get('rd_proxy'), /✅ Funziona/.test(document.querySelector('#pxo').textContent), proxies()]), ['https://rddc.prova.workers.dev', true, ['https://rddc.prova.workers.dev']], 'collegato e provato; si usa solo il worker');
    await U.evaluate(() => goBase(() => openLookup({ prefill: 'M5884', onResult: r => { window._used = r.fields.nome } }))); await U.waitForTimeout(400);
    await U.click('#lg'); await U.waitForSelector('#lg.use', { timeout: 8000 });
    eq(await U.evaluate(() => [document.querySelector('#lg').textContent.trim(), !!document.querySelector('.btn.again'), /PowerBook G4 400/.test(document.querySelector('#lo').textContent)]), ['✓ Inserisci i dati', true, true], 'codice vecchio → scheda trovata dall\'indice; il tasto diventa «Inserisci i dati»');
    ok(seen.some(u => /\/systems\/apple\/powerbook_g4\/$/.test(u)), 'indice della famiglia consultato');
    await U.fill('#lq', 'A1278'); eq(await U.evaluate(() => [document.querySelector('#lg').textContent.trim(), !!document.querySelector('.btn.again')]), ['Cerca', false], 'cambiando il codice torna «Cerca»');
    await U.fill('#lq', 'M5884'); await U.click('#lg'); await U.waitForSelector('#lg.use', { timeout: 8000 });
    const n = seen.length; await U.click('.btn.again'); await U.waitForSelector('#lg.use', { timeout: 8000 }); ok(seen.length > n, 'il piccolo ↻ ripete la ricerca');
    await U.click('#lg'); await U.waitForTimeout(200); eq(await U.evaluate(() => window._used), 'PowerBook G4 400 (Original - Ti)', 'il tasto grande inserisce i dati');
    await U.context().close();
  });

  await test('2.8: da EveryMac con «Condividi» la scheda si compila da sola', async () => {
    const U = await phone('U8');
    const txt = 'PowerBook G4 400 (Original - Ti) Specs\nIntroduction Date:\nJanuary 9, 2001\nProcessor Speed:\n400 MHz\nProcessor Type:\nPowerPC 7410 (G4)\nStandard RAM:\n128 MB\nApple Model No:\nM5884\nModel ID:\nPowerBook3,2\nEMC:\n1854\n';
    await U.evaluate(t => openShared({ files: [], meta: { title: '', text: t, url: '' } }), txt); await U.waitForSelector('#pa.use', { timeout: 8000 });
    eq(await U.evaluate(() => [stack[stack.length - 1].querySelector('h2').textContent, /PowerBook3,2/.test(document.querySelector('#po').textContent)]), ['Incolla da EveryMac', true], 'testo condiviso analizzato subito');
    await U.click('#pa'); await U.waitForTimeout(500);
    eq(await U.evaluate(() => stack[stack.length - 1].querySelector('[name="nome"]').value), 'PowerBook G4 400 (Original - Ti)', 'modulo compilato');
    await U.context().close();
  });

  await test('2.8.1: RAM e memoria anche da iPhone/iPod e Mac vecchi, tagli di memoria con un tocco', async () => {
    const U = await phone('U9');
    const r = await U.evaluate(() => { const t = 'iPhone 3G 8, 16 GB Specs\nIntroduction Date:\nJuly 11, 2008\nProcessor Type:\nSamsung ARM 11\nOnboard RAM:\n128 MB\nStorage Capacity:\n8, 16 GB\nApple Model No:\nA1241\n';
      const c = 'Macintosh Classic II Specs\nIntroduction Date:\nOctober 21, 1991\nProcessor Speed:\n16 MHz\nStandard RAM:\n2 MB\nMaximum RAM:\n10 MB\nStandard Hard Drive:\n40 MB, 80 MB\nApple Model No:\nM4150\n';
      const a = importEM({ text: t }), b = importEM({ text: c }); return [a.fields.ram, a.fields.storage, a.fields.tagli.map(x => x.opts), b.fields.ram, b.fields.storage, memCuts('32 MB, 64 MB PC66').opts, memCuts('1 GB, 2 GB, 4 GB').opts, memCuts('128 MB')]; });
    eq(r, ['128 MB', '8, 16 GB', [['8 GB', '16 GB']], '2 MB (max 10 MB)', '40 MB, 80 MB', ['32 MB', '64 MB'], ['1 GB', '2 GB', '4 GB'], null], 'letture e tagli');
    await U.evaluate(async () => { const a = importEM({ text: 'iPhone 3G 8, 16 GB Specs\nIntroduction Date:\nJuly 11, 2008\nOnboard RAM:\n128 MB\nStorage Capacity:\n8, 16 GB\n' }); openForm(await mergeFetched({}, a, true), { fromLookup: true }); });
    await U.waitForTimeout(400);
    eq(await U.evaluate(() => [...document.querySelectorAll('.page .chips.cuts [data-cut]')].map(b => b.textContent)), ['8 GB', '16 GB'], 'scelte sotto Archiviazione');
    await U.click('.page .chips.cuts [data-cut="16 GB"]');
    eq(await U.evaluate(() => { const f = stack[stack.length - 1].querySelector('form'); return [f.nome.value, f.storage.value, document.querySelector('.chips.cuts .on').textContent]; }), ['iPhone 3G 16 GB', '16 GB', '16 GB'], 'un tocco aggiorna memoria e nome');
    await U.click('.page .chips.cuts [data-cut="8 GB"]');
    eq(await U.evaluate(() => { const f = stack[stack.length - 1].querySelector('form'); return [f.nome.value, f.storage.value]; }), ['iPhone 3G 8 GB', '8 GB'], 'si può cambiare taglio');
    await U.context().close();
  });

  await test('2.8.2: foto verticali centrate nelle miniature, il volo atterra sul riquadro, barra in fondo allineata', async () => {
    const U = await phone('U10');
    await U.evaluate(async () => { const v = document.createElement('canvas'); v.width = 900; v.height = 1200; v.getContext('2d').fillRect(0, 0, 900, 1200); const img = v.toDataURL('image/jpeg', .8);
      await saveDev({ id: 'vt', nome: 'iPhone 3G', tipologia: 'Smartphone', foto: [img], thumb: img, creato: Date.now() }); render(); });
    await U.waitForTimeout(400);
    const r = await U.evaluate(() => { const th = document.querySelector('#list [data-id="vt"] .th'), im = th.querySelector('img'), a = th.getBoundingClientRect(), b = im.getBoundingClientRect(), t = thumbOf('vt');
      return [Math.round(b.height) === Math.round(a.height), Math.round(b.top) === Math.round(a.top), Math.round(t.r.height) === Math.round(a.height)]; });
    eq(r, [true, true, true], 'la foto riempie il riquadro (centrata) e il volo usa il riquadro visibile');
    await U.waitForTimeout(400);
    const d = await U.evaluate(() => { const R = e => e.getBoundingClientRect(), dk = R($('#dock')), fb = R($('#fab')), on = R($('#seg button.on')), i = R($('.segi'));
      return [Math.abs((dk.top + dk.height / 2) - (fb.top + fb.height / 2)) < 1, Math.abs(on.left - i.left) < 1.5, Math.abs(on.width - i.width) < 1.5]; });
    eq(d, [true, true, true], 'barra e + centrati, goccia sul pulsante attivo');
    await U.context().close();
  });

  await test('2.9: Oggi — una voce si rimanda scorrendola (Domani, Rimanda…, scorrimento completo) e si ritrova', async () => {
    const U = await phone('V1', { hasTouch: true, isMobile: true });
    await U.evaluate(async () => { await saveDev({ id: 'm1', nome: 'PowerBook G3', tipologia: 'Portatile', creato: Date.now() }); await saveDev({ id: 'm2', nome: 'iBook', tipologia: 'Portatile', creato: Date.now(), interventi: [{ id: 'x', tipo: 'Pulizia', prossimo: '2026-01-01' }] }); render(); });
    await U.waitForTimeout(300);
    const c = await U.context().newCDPSession(U), T = (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const box = async id => U.evaluate(id => { const b = document.querySelector('#' + id).getBoundingClientRect(); return { x: b.x, y: b.y + b.height / 2, w: b.width }; }, id);
    let b = await box('manB');
    await T('touchStart', b.x + b.w - 30, b.y); for (let i = 1; i <= 8; i++) { await T('touchMove', b.x + b.w - 30 - i * 15, b.y); await U.waitForTimeout(16); } await T('touchEnd'); await U.waitForTimeout(400);
    ok(await U.evaluate(() => document.querySelector('.ogw[data-ogk="manB"]').classList.contains('open')), 'scorrendo un po\' compaiono i tasti');
    await U.click('.ogw[data-ogk="manB"] [data-snz="pick"]'); await U.waitForSelector('.modal.sheet');
    await U.click('.modal.sheet [data-c="2"]'); await U.waitForTimeout(500);
    eq(await U.evaluate(() => [LS.get('rd_snooze').manB === addDays(today(), 7), !document.querySelector('#manB'), !!document.querySelector('[data-snzshow]')]), [true, true, true], '«Fra una settimana»: voce nascosta, richiamo presente');
    b = await box('dueB');
    await T('touchStart', b.x + b.w - 20, b.y); for (let i = 1; i <= 14; i++) { await T('touchMove', b.x + b.w - 20 - i * 20, b.y); await U.waitForTimeout(16); } await T('touchEnd'); await U.waitForTimeout(700);
    eq(await U.evaluate(() => [LS.get('rd_snooze').dueB === addDays(today(), 1), /2 voci rimandate/.test(document.querySelector('[data-snzshow]').textContent)]), [true, true], 'scorrimento completo: a domani');
    await U.click('[data-snzshow]'); await U.waitForTimeout(300);
    eq(await U.evaluate(() => [!!document.querySelector('#manB'), !!document.querySelector('#dueB')]), [true, true], '«mostra» le riporta');
    await U.evaluate(() => LS.set('rd_snooze', { manB: today() })); await U.evaluate(() => render());
    ok(await U.evaluate(() => !!document.querySelector('#manB')), 'alla data scelta la voce torna da sola');
    await U.context().close();
  });

  await test('2.9: anteprima a pressione lunga con azioni rapide (acceso, sposta, intervento)', async () => {
    const U = await phone('V2');
    await U.evaluate(async () => { await saveDev({ id: 'q1', nome: 'iMac G4', tipologia: 'All-in-one', luogo: 'Damiano', creato: Date.now() }); render(); openPeek('q1', document.querySelector('#list [data-id="q1"]')); });
    await U.waitForSelector('.peek [data-pk="on"]');
    eq(await U.evaluate(() => [...document.querySelectorAll('.peek [data-pk]')].map(b => b.dataset.pk)), ['open', 'edit', 'on', 'mv', 'int', 'sel', 'mu', 'del'], 'azioni nell\'anteprima, Elimina in fondo');
    await U.click('.peek [data-pk="on"]'); await U.waitForTimeout(500);
    eq(await U.evaluate(() => devices.find(d => d.id === 'q1').man_on), await U.evaluate(() => today()), 'segnato acceso oggi');
    await U.evaluate(() => openPeek('q1', document.querySelector('#list [data-id="q1"]'))); await U.waitForSelector('.peek [data-pk="mv"]');
    await U.click('.peek [data-pk="mv"]'); await U.waitForSelector('.modal [data-cl="Alex"]'); await U.click('.modal [data-cl="Alex"]'); await U.waitForTimeout(400);
    eq(await U.evaluate(() => { const d = devices.find(d => d.id === 'q1'); return [d.luogo, d.spostamenti.length]; }), ['Alex', 1], 'spostato, con lo storico degli spostamenti');
    await U.context().close();
  });

  await test('2.9: Gemini legge l\'etichetta dalla foto e stima il valore (con le fonti) nello storico', async () => {
    const U = await phone('V3'); const seen = [];
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    await U.context().route('https://generativelanguage.googleapis.com/**', r => { const q = r.request(); if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
      const u = new URL(q.url()); if (/\/models$/.test(u.pathname)) return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ data: [{ id: 'gemini-3.5-flash' }], models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }] }) });
      const b = JSON.parse(q.postData()), parts = b.contents[0].parts; seen.push({ img: parts.some(p => p.inline_data), web: !!b.tools });
      const txt = parts.some(p => p.inline_data) ? JSON.stringify({ marca: 'Apple', nome: 'iBook G3', modello: 'M2453', seriale: 'UV0123ABCDE', identifier: 'PowerBook2,1', anno: 2000, alimentazione: '24V 1.875A', certezza: 'alta' })
        : JSON.stringify({ min: 60, max: 140, tipico: 95, valuta: 'EUR', base: 'Vendite eBay 2025-2026', fattori: ['batteria', 'cerniere'], certezza: 'media' });
      return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: txt }] }, finishReason: 'STOP', groundingMetadata: b.tools ? { groundingChunks: [{ web: { uri: 'https://www.ebay.it/x', title: 'eBay' } }] } : undefined }] }) }); });
    await U.evaluate(() => { LS.set('rd_gem', { key: 'AIzaTEST', model: 'gemini-3.5-flash' }); openLabel({ onResult: r => openForm(r.fields, { fromLookup: true }) }); });
    await U.waitForTimeout(300);
    const v = await U.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 200; c.getContext('2d').fillRect(0, 0, 400, 200); return c.toDataURL('image/jpeg').split(',')[1]; });
    const [fc] = await Promise.all([U.waitForEvent('filechooser'), U.click('[data-lb="gal"]')]); await fc.setFiles({ name: 'etichetta.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(v, 'base64') });
    await U.waitForSelector('[data-lb="look"]', { timeout: 8000 });
    eq(await U.evaluate(() => [document.querySelector('[data-lb="look"]').textContent.trim(), /UV0123ABCDE/.test(document.querySelector('#lbo').textContent)]), ['🔎 Cerca la scheda con «PowerBook2,1»', true], 'dati letti, ricerca proposta con il Model ID');
    ok(seen[0].img && !seen[0].web, 'foto inviata, senza ricerca web');
    await U.click('[data-lb="only"]'); await U.waitForTimeout(400);
    eq(await U.evaluate(() => { const f = stack[stack.length - 1].querySelector('form'); return [f.seriale.value, f.modello.value, f.anno.value, /24V/.test(f.note.value)]; }), ['UV0123ABCDE', 'M2453', '2000', true], 'modulo compilato dall\'etichetta');
    await U.evaluate(async () => { await saveDev({ id: 've', nome: 'iBook G3', tipologia: 'Portatile', acq_prezzo: 50, creato: Date.now() }); goBase(() => openValEst(devices.find(d => d.id === 've'))); });
    await U.waitForSelector('[data-ve="add"]', { timeout: 8000 });
    eq(await U.evaluate(() => [document.querySelector('.vest b').textContent, /eBay/.test(document.querySelector('#veo').textContent)]), ['€ 95', true], 'forbice, valore tipico e fonti');
    await U.click('[data-ve="add"]'); await U.waitForTimeout(600);
    eq(await U.evaluate(() => { const d = devices.find(d => d.id === 've'); return [d.valore, d.valori.slice(-1)[0].fonte, d.valori.slice(-1)[0].note]; }), [95, 'Stima Gemini', 'forbice € 60–140'], 'aggiunta allo storico del valore');
    await U.context().close();
  });

  await test('2.9: Cosa manca — linee Apple con i modelli mancanti, in wishlist con un tocco', async () => {
    const U = await phone('V4');
    await U.evaluate(async () => { AWIDX = [['iPod nano (1st generation)', 'A1137', '', 'iPod'], ['iPod nano (2nd generation)', 'A1199', '', 'iPod'], ['iPod nano (3rd generation)', 'A1236', '', 'iPod'], ['iMac G3', 'M4984', 'iMac,1', 'Mac'], ['iMac G3 (Fruit Colors)', 'M4984', 'iMac,1', 'Mac'], ['iMac G3 (Slot Loading)', 'M5521', 'PowerMac2,1', 'Mac'], ['iBook', 'M2453', 'PowerBook2,1', 'Mac'], ['iBook SE', 'M2453', 'PowerBook2,1', 'Mac'], ['iBook Firewire', 'M6411', 'PowerBook2,2', 'Mac']];
      for (const d of [{ id: 'n1', nome: 'iPod nano Original 1 GB', modello: 'A1137', tipologia: 'Lettore musicale' }, { id: 'n2', nome: 'iMac G3/333 (Fruit Colors)', modello: 'M4984', identifier: 'iMac,1', tipologia: 'All-in-one' }, { id: 'n3', nome: 'iBook G3/366 SE (Original/Clamshell)', modello: 'M2453', identifier: 'PowerBook2,1', tipologia: 'Portatile' }]) await saveDev({ ...d, creato: Date.now() }); render(); });
    const g = await U.evaluate(() => gapsData(AWIDX).map(x => [x.f, x.n, x.tot, x.rows.filter(r => r.own.length).map(r => r.x[0])]));
    eq(g.sort(), [['iBook', 1, 3, ['iBook SE']], ['iMac G3', 1, 3, ['iMac G3 (Fruit Colors)']], ['iPod nano', 1, 3, ['iPod nano (1st generation)']]].sort(), 'un modello per oggetto, linee giuste');
    await U.evaluate(() => openGaps()); await U.waitForSelector('[data-gw]', { state: 'attached' }); await U.evaluate(() => { const b = document.querySelector('[data-gw]'); b.closest('details').open = true; }); await U.click('[data-gw]'); await U.waitForTimeout(400);
    ok(await U.evaluate(() => devices.some(d => d.wish && d.marca === 'Apple' && d.linea)), 'modello mancante aggiunto alla wishlist');
    await U.context().close();
  });

  await test('2.13: Cosa manca per scocca — varianti dello stesso computer contate una volta', async () => {
    const U = await phone('V4b');
    await U.evaluate(async () => { AWIDX = [['MacBook Pro (15-inch, Early 2008)', 'A1260', 'MacBookPro4,1', 'Mac'], ['MacBook Pro (17-inch, Early 2008)', 'A1261', 'MacBookPro4,1', 'Mac'], ['MacBook Pro (15-inch, Late 2006)', 'A1211', 'MacBookPro2,2', 'Mac'], ['MacBook Pro (15-inch, Mid 2009)', 'A1286', 'MacBookPro5,4', 'Mac'], ['MacBook Pro (Retina, 15-inch, Mid 2015)', 'A1398', 'MacBookPro11,4', 'Mac'], ['MacBook Pro (15-inch, 2016)', 'A1707', 'MacBookPro13,3', 'Mac'], ['MacBook (13-inch, Late 2008)', 'A1278', 'MacBook5,1', 'Mac'], ['MacBook (13-inch, Mid 2006)', 'A1181', 'MacBook1,1', 'Mac'],
        ['iBook', 'M2453', 'PowerBook2,1', 'Mac'], ['iBook Firewire', 'M6411', 'PowerBook2,2', 'Mac'], ['iBook (Dual USB)', 'M6497', 'PowerBook4,1', 'Mac'], ['iBook (12-inch, Mid 2005)', 'A1133', 'PowerBook6,7', 'Mac'], ['iBook (14-inch, Mid 2005)', 'A1134', 'PowerBook6,7', 'Mac'], ['PowerBook 5300', 'M2785', '', 'Mac'], ['PowerBook 5300c', 'M2785', '', 'Mac'], ['PowerBook 190', 'M3047', '', 'Mac'], ['PowerBook 1400c', 'M3571', '', 'Mac']];
      for (const d of [{ id: 'g1', nome: 'MacBook Pro "Core 2 Duo" 2.6 17" (08)', modello: 'A1261', identifier: 'MacBookPro4,1', tipologia: 'Portatile' }, { id: 'g2', nome: 'iBook G4/1.42 14-Inch (Mid-2005 - Op)', modello: 'A1134', identifier: 'PowerBook6,7', tipologia: 'Portatile' }, { id: 'g3', nome: 'PowerBook 5300c', modello: 'M2785', tipologia: 'Portatile' }]) await saveDev({ ...d, creato: Date.now() }); render(); });
    const g = await U.evaluate(() => Object.fromEntries(gapsData(AWIDX, 'gen').map(x => [x.f, x.rows.map(r => (r.own.length ? '✓' : '') + r.x[0])])));
    eq(g['MacBook Pro'], ['✓MacBook Pro in alluminio (2006–2008)', 'MacBook Pro unibody e Retina (2008–2015)', 'MacBook Pro USB-C e Touch Bar (2016–2022)'], 'MacBook Pro: misure e processori nella stessa scocca, unibody e Retina insieme');
    eq(g.iBook, ['iBook G3 Clamshell (1999–2000)', 'iBook G3 bianco «Dual USB» (2001–2003)', '✓iBook G4 (2003–2005)'], 'iBook per scocca');
    eq(g.PowerBook, ['PowerBook 190 e 5300 (1995)', 'PowerBook 1400 (1996)'].map((x, i) => i ? x : '✓' + x), 'PowerBook classici per scocca');
    ok(!g.MacBook, 'il MacBook unibody (stesso codice A1278 del MacBook Pro 13") resta nella sua linea, non posseduta');
    eq(await U.evaluate(() => gapsData(AWIDX).find(x => x.f === 'MacBook Pro').tot), 6, '«Tutti i modelli» resta disponibile');
    await U.evaluate(() => { LS.set('rd_gapmode', 'gen'); openGaps(); }); await U.waitForSelector('[data-gw]', { state: 'attached' });
    ok(await U.evaluate(() => /varianti/.test(document.querySelector('#gpo').textContent) && document.querySelector('[data-gm="gen"]').classList.contains('on')), 'vista per scocca predefinita, con il numero di varianti');
    await U.evaluate(() => { const b = [...document.querySelectorAll('[data-gw]')].find(b => /unibody e Retina/.test(b.closest('.gapr').textContent)); b.closest('details').open = true; b.click(); }); await U.waitForTimeout(400);
    eq(await U.evaluate(() => { const w = devices.find(d => d.wish && /unibody e Retina/.test(d.nome)); return w && [w.linea, w.modello]; }), ['MacBook Pro', ''], 'scocca in wishlist con la sua linea');
    await U.click('[data-gm="models"]'); await U.waitForTimeout(200);
    ok(await U.evaluate(() => /Late 2006/.test(document.querySelector('#gpo').textContent) && LS.get('rd_gapmode') === 'models'), 'passando a «Tutti i modelli» torna l\'elenco completo');
    await U.context().close();
  });

  await test('2.9: tira giù per sincronizzare, finestre chiuse trascinandole, scorciatoie dall\'icona, elenco animato', async () => {
    const U = await phone('V5', { hasTouch: true, isMobile: true });
    await U.evaluate(async () => { for (let i = 0; i < 6; i++) await saveDev({ id: 'f' + i, nome: 'Oggetto ' + i, anno: 1990 + i, tipologia: 'Computer', creato: Date.now() }); render(); window.syncDB = async () => { window._synced = (window._synced || 0) + 1 }; scrollTo(0, 0); });
    const c = await U.context().newCDPSession(U), T = (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await T('touchStart', 200, 330); for (let i = 1; i <= 12; i++) { await T('touchMove', 200, 330 + i * 16); await U.waitForTimeout(16); } await T('touchEnd'); await U.waitForTimeout(900);
    eq(await U.evaluate(() => window._synced), 1, 'tirando giù dalla cima parte la sincronizzazione');
    await U.evaluate(() => { window._sh = 'attesa'; sheet('Prova', [{ t: 'Uno' }, { t: 'Due' }]).then(i => window._sh = i); }); await U.waitForSelector('.modal.sheet'); await U.waitForFunction(() => !document.querySelector('.modal.sheet>div').getAnimations().some(a => a.playState === 'running')); await U.waitForTimeout(100);
    const b = await U.evaluate(() => { const r = document.querySelector('.modal.sheet>div').getBoundingClientRect(); const t = document.querySelector('#toast'); if (t) t.style.display = 'none'; return { x: r.x + r.width / 2, y: r.y + 24 }; });
    await T('touchStart', b.x, b.y); for (let i = 1; i <= 10; i++) { await T('touchMove', b.x, b.y + i * 22); await U.waitForTimeout(16); } await T('touchEnd'); await U.waitForTimeout(500);
    eq(await U.evaluate(() => [window._sh, !!document.querySelector('.modal')]), [-1, false], 'foglio chiuso trascinandolo in basso (come Annulla)');
    await U.evaluate(() => { S.sel = {}; S.q = ''; render(); S.sort = S.sort === 'anno_d' ? 'anno_a' : 'anno_d'; LS.set('rd_sort', S.sort); render(); });
    ok(await U.evaluate(() => [...document.querySelectorAll('#list [data-id]')].some(x => x.getAnimations().length)), 'cambiando l\'ordine le schede si spostano con un\'animazione');
    ok(await U.evaluate(async () => { const m = await (await fetch('manifest.webmanifest')).json(); return m.shortcuts.map(s => s.url).join() === './index.html?azione=aggiungi,./index.html?azione=manutenzione,./index.html?azione=cerca'; }), 'scorciatoie nel manifest');
    await U.goto(URL0 + '?azione=aggiungi'); await U.waitForFunction(() => typeof stack !== 'undefined' && stack.length && /Aggiungi/.test(stack[stack.length - 1].querySelector('h2').textContent), null, { timeout: 5000 });
    eq(await U.evaluate(() => location.search), '', 'scorciatoia «Aggiungi» apre la pagina e pulisce l\'indirizzo');
    await U.context().close();
  });

  await test('2.9: nel giro la ✗ chiede cosa non va; batteria esaurita = solo accensione', async () => {
    const U = await phone('V6');
    await U.evaluate(async () => { await saveDev({ id: 'bt', nome: 'PowerBook G3 Pismo', tipologia: 'Portatile', luogo: 'Damiano', man_batt: 'Ricaricabile (da tenere carica)', creato: Date.now() }); render(); openMaintenance(); });
    await U.waitForSelector('[data-mid="bt"] [data-mg="ko"]');
    ok(await U.evaluate(() => !!document.querySelector('[data-mid="bt"] [data-mg="charge"]')), 'prima: nel giro di ricarica');
    await U.click('[data-mid="bt"] [data-mg="ko"]'); await U.waitForSelector('.modal.sheet');
    eq(await U.evaluate(() => [...document.querySelectorAll('.modal.sheet .shi b')].map(b => b.textContent)), ['La batteria non regge', 'Batteria morta', 'Non si accende'], 'scelte della ✗');
    await U.click('.modal.sheet [data-c="0"]'); await U.waitForTimeout(500);
    eq(await U.evaluate(() => { const d = devices.find(x => x.id === 'bt'), t = manTargets(d)[0], st = manState(t); return [d.batt_stato, d.man_on === today(), st.rech, st.dueCh, d.stato || '', d.manutenzioni.slice(-1)[0].tipo]; }), ['Tampona ma non regge', true, false, false, '', 'batt'], 'stato batteria nella scheda, accensione fatta, fuori dal giro di ricarica');
    ok(await U.evaluate(() => manTargets(devices.find(x => x.id === 'bt')).length === 1), 'resta nel giro di accensione');
    await U.context().close();
  });

  await test('2.10: modello 3D — caricamento nella scheda, sincronizzazione in modelli/, orientamento, piedistallo', async () => {
    const U = await phone('M3');
    await U.evaluate(async () => { LS.set('rd_gh', { repo: 'test/RDDC', token: 'TOKEN', branch: 'main' }); await saveDev({ id: 'm3', nome: 'iPod classic', tipologia: 'Lettore musicale', creato: Date.now() }); render(); openDetail('m3'); });
    await U.waitForTimeout(400);
    eq(await U.evaluate(() => [m3dType('a.SPZ'), m3dType('b.sog'), m3dType('c.ply'), m3dType('d.ksplat'), m3dType('e.glb')]), ['spz', 'pcsogszip', 'ply', 'ksplat', ''], 'formati riconosciuti');
    await U.click('.page.det [data-moreacts]'); await U.waitForSelector('.modal.sheet');
    const [fc] = await Promise.all([U.waitForEvent('filechooser'), U.evaluate(() => [...document.querySelectorAll('.modal.sheet .shi')].find(b => /modello 3D/.test(b.textContent)).click())]);
    await fc.setFiles({ name: 'ipod.spz', mimeType: 'application/octet-stream', buffer: Buffer.from('finto modello splat '.repeat(50)) });
    await U.waitForFunction(() => stack.length && stack[stack.length - 1].classList.contains('m3root'), null, { timeout: 5000 });
    eq(await U.evaluate(() => { const m = devices.find(d => d.id === 'm3').m3d; return [m.nome, m.tipo, /^local:/.test(m.data), m.rot]; }), ['ipod.spz', 'spz', true, [0, 0, 0]], 'nella scheda solo il riferimento al file (nella cache), pagina 3D aperta');
    await U.waitForSelector('.m3err', { timeout: 15000 });
    ok(await U.evaluate(() => /visualizzatore 3D/.test(document.querySelector('.m3err').textContent)), 'senza rete per la libreria: messaggio chiaro');
    await U.click('[data-m3set]'); await U.waitForSelector('.modal.sheet'); await U.click('.modal.sheet [data-c="0"]'); await U.waitForTimeout(400);
    eq(await U.evaluate(() => devices.find(d => d.id === 'm3').m3d.rot), [180, 0, 0], 'Capovolgi salva l\'orientamento');
    await U.evaluate(() => goBase(() => openDetail('m3'))); await U.waitForTimeout(500);
    eq(await U.evaluate(() => [!!document.querySelector('.page.det .hb3d'), /ipod\.spz/.test(document.querySelector('.page.det .m3sec').textContent)]), [true, true], 'pulsante 3D sulla foto e sezione Modello 3D');
    await U.evaluate(async () => { await ghSync(true); });
    const f = ghFiles(), j = JSON.parse(f.get('collezione.json').toString()), m = j.devices.find(d => d.id === 'm3').m3d;
    ok(/^modelli\/[0-9a-f]{40}\.spz$/.test(m.data) && f.has(m.data) && /finto modello/.test(f.get(m.data).toString()), 'il file del modello va su GitHub in modelli/ (una volta sola): ' + m.data);
    await U.evaluate(() => goBase(() => openPlinth([devices.find(d => d.id === 'm3')], 0, false))); await U.waitForTimeout(800);
    ok(await U.evaluate(() => !!document.querySelector('.pl [data-m3w="m3"]') && /3D/.test(document.querySelector('.pl .m3tag').textContent)), 'sul piedistallo c\'è il posto del modello 3D');
    await U.context().close();
  });

  await test('2.11: seconda modalità 3D (convertibili), nomi, sincronizzazione e pulsante sul piedistallo', async () => {
    const U = await phone('M4');
    await U.evaluate(async () => { LS.set('rd_gh', { repo: 'test/RDDC', token: 'TOKEN', branch: 'main' }); await saveDev({ id: 'cv', nome: 'ThinkPad X41 Tablet', tipologia: 'Portatile', creato: Date.now(), m3d: { id: 'a', nome: 'aperto.spz', size: 10, tipo: 'spz', data: 'data:application/octet-stream;base64,' + btoa('modello aperto'), rot: [0, 0, 0] } }); render(); openDetail('cv'); });
    await U.waitForTimeout(400);
    await U.click('.page.det [data-m3add2]'); await U.waitForSelector('#ml1');
    eq(await U.evaluate(() => [document.querySelector('#ml1').value, document.querySelector('#ml2').value]), ['Portatile', 'Tablet'], 'nomi proposti');
    await U.fill('#ml2', 'Modalità tablet');
    const [fc] = await Promise.all([U.waitForEvent('filechooser'), U.click('.modal [data-y]')]);
    await fc.setFiles({ name: 'tablet.spz', mimeType: 'application/octet-stream', buffer: Buffer.from('modello tablet '.repeat(20)) });
    await U.waitForFunction(() => stack.length && stack[stack.length - 1].classList.contains('m3root'), null, { timeout: 5000 });
    eq(await U.evaluate(() => { const d = devices.find(x => x.id === 'cv'); return [d.m3d.label, d.m3d2.label, d.m3d2.nome, !!document.querySelector('.m3root .m3sw')]; }), ['Portatile', 'Modalità tablet', 'tablet.spz', true], 'seconda modalità salvata, pulsante di cambio nella vista 3D');
    await U.evaluate(() => goBase(() => openDetail('cv'))); await U.waitForTimeout(500);
    ok(await U.evaluate(() => document.querySelectorAll('.page.det .m3sec').length === 2 && /Modalità tablet/.test(document.querySelector('.page.det').textContent)), 'la scheda mostra le due modalità');
    await U.evaluate(async () => { await ghSync(true); });
    const f = ghFiles(), d = JSON.parse(f.get('collezione.json').toString()).devices.find(x => x.id === 'cv');
    ok(/^modelli\//.test(d.m3d.data) && /^modelli\//.test(d.m3d2.data) && f.has(d.m3d2.data) && d.m3d2.label === 'Modalità tablet', 'entrambi i file in modelli/');
    await U.evaluate(() => goBase(() => openPlinth([devices.find(x => x.id === 'cv')], 0, false))); await U.waitForTimeout(700);
    eq(await U.evaluate(() => { const b = document.querySelector('.pl [data-m3sw="cv"]'); return b && [b.textContent.trim(), b.classList.contains('wait')]; }), ['⇄ Modalità tablet', true], 'sul piedistallo il pulsante aspetta che la seconda modalità sia pronta');
    await U.context().close();
  });

  await test('2.11: grafico del valore — arco di tempo e data di acquisto (con il mese) per una sola quotazione', async () => {
    const U = await phone('M5');
    const r = await U.evaluate(async () => { const d = { id: 'va', nome: 'Apple IIc', acq_anno: 2019, acq_mese: 'maggio', acq_prezzo: 100, valore: 300, valori: [{ id: 'v', data: '2026-11-01', valore: 300, fonte: 'Stima iniziale' }], creato: Date.now() };
      const p = valSeries(d, false); const c = clipSeries([{ t: 1, v: 10 }, { t: 5, v: 20 }, { t: 9, v: 30 }], 6);
      return [new Date(p[0].t).toISOString().slice(0, 7), acqLabel(d), c.map(x => [x.t, x.v]), valSeries({ ...d, valori: [...d.valori, { id: 'w', data: '2026-11-10', valore: 320 }] }, false).length]; });
    eq(r, ['2019-05', 'maggio 2019', [[6, 20], [9, 30]], 2], 'una sola quotazione vale dal mese di acquisto; il taglio parte dal valore in vigore');
    await U.evaluate(async () => { await saveDev({ id: 'v1', nome: 'iMac G3', acq_anno: 2020, acq_prezzo: 80, valore: 150, creato: Date.now() }); await saveDev({ id: 'v2', nome: 'iBook', acq_anno: 2023, acq_mese: 'marzo', acq_prezzo: 60, valore: 90, creato: Date.now() }); render(); openStats(); });
    await U.waitForSelector('[data-vr]');
    eq(await U.evaluate(() => [[...document.querySelectorAll('[data-vr]')].map(b => b.textContent), document.querySelector('[data-vr].on').textContent]), [['1 anno', '2 anni', '5 anni', 'Tutto'], '2 anni'], 'scelta dell\'arco, due anni di partenza');
    await U.click('[data-vr="0"]'); eq(await U.evaluate(() => LS.get('rd_vrange')), 0, '«Tutto» ricordato');
    await U.evaluate(() => goBase(() => openForm({ nome: 'Prova' }))); await U.waitForTimeout(400);
    eq(await U.evaluate(() => [...stack[stack.length - 1].querySelector('[name="acq_mese"]').options].map(o => o.value).slice(0, 3)), ['', 'gennaio', 'febbraio'], 'mese di acquisto nel modulo (facoltativo)');
    await U.context().close();
  });

  await test('2.11.1: invio dei modelli 3D visibile — stato nella scheda, copia locale in cache, errore chiaro se GitHub rifiuta', async () => {
    const U = await phone('M6');
    await U.evaluate(async () => { LS.set('rd_gh', { repo: 'test/RDDC', token: 'TOKEN', branch: 'main' }); await saveDev({ id: 'up', nome: 'iPod mini', tipologia: 'Lettore musicale', creato: Date.now(), m3d: { id: 'a', nome: 'mini.spz', size: 20, tipo: 'spz', data: 'data:application/octet-stream;base64,' + btoa('modello mini '.repeat(30)), rot: [0, 0, 0] } }); render(); openDetail('up'); });
    await U.waitForTimeout(400);
    ok(await U.evaluate(() => /Non ancora su GitHub/.test(document.querySelector('.page.det .m3st').textContent)), 'prima dell\'invio: «non ancora su GitHub»');
    let rifiuta = true;
    await U.context().route('https://api.github.com/repos/test/RDDC/git/blobs', r => { const b = r.request().postData() || ''; if (rifiuta && b.length > 400) return r.fulfill({ status: 422, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'too large' }) }); return r.fallback(); });
    await U.evaluate(async () => { await ghSync(false); });
    ok(await U.evaluate(() => /modello 3D.*non riuscito.*troppo grande/.test(document.querySelector('#toast').textContent) && /^(data|local):/.test(devices.find(d => d.id === 'up').m3d.data)), 'errore mostrato anche nella sincronizzazione automatica, il modello resta sul telefono');
    rifiuta = false;
    await U.evaluate(async () => { await ghSync(false); }); await U.waitForTimeout(300);
    const r = await U.evaluate(async () => { const m = devices.find(d => d.id === 'up').m3d, c = await caches.open('rddc-modelli'), hit = await c.match(remoteURL(m.data)); return [/^modelli\/[0-9a-f]{40}\.spz$/.test(m.data), !!hit, hit ? (await hit.text()).slice(0, 12) : '', new TextDecoder().decode(await m3dBytes(m)).slice(0, 12)]; });
    eq(r, [true, true, 'modello mini', 'modello mini'], 'dopo l\'invio: percorso su GitHub nella scheda, file nella cache, il modello si apre ancora');
    await U.evaluate(() => openDetail('up', true)); await U.waitForTimeout(400);
    ok(await U.evaluate(() => /Su GitHub/.test(document.querySelector('.page.det .m3st').textContent)), 'stato «Su GitHub»');
    const n0 = gh.n; await U.evaluate(async () => { await ghSync(false); }); eq(gh.n, n0, 'la sincronizzazione successiva non crea commit inutili');
    await U.context().close();
  });

  await test('2.12: modelli da KIRI (PLY) e formati sbagliati: sempre un messaggio; isola di avanzamento', async () => {
    const U = await phone('M7');
    await U.evaluate(async () => { await saveDev({ id: 'kr', nome: 'Nokia 3310', tipologia: 'Telefono', creato: Date.now() }); render(); });
    let [fc] = await Promise.all([U.waitForEvent('filechooser'), U.evaluate(() => { m3dAdd(devices.find(d => d.id === 'kr')) })]);
    await fc.setFiles({ name: 'scansione.zip', mimeType: 'application/zip', buffer: Buffer.from('PK finto') });
    await U.waitForTimeout(300);
    ok(await U.evaluate(() => /non è un modello riconosciuto/.test(document.querySelector('#toast').textContent) && !devices.find(d => d.id === 'kr').m3d), 'formato sbagliato: lo dice');
    [fc] = await Promise.all([U.waitForEvent('filechooser'), U.evaluate(() => { m3dAdd(devices.find(d => d.id === 'kr')) })]);
    await fc.setFiles({ name: 'kiri.ply', mimeType: 'application/octet-stream', buffer: Buffer.from('ply\nformat binary_little_endian 1.0\nend_header\n' + 'x'.repeat(400)) });
    await U.waitForFunction(() => devices.find(d => d.id === 'kr').m3d, null, { timeout: 15000 });
    eq(await U.evaluate(() => { const m = devices.find(d => d.id === 'kr').m3d; return [m.nome, m.tipo, LS.get('rd_errlog', []).some(e => /conversione in SPZ/.test(e.where || e.w || JSON.stringify(e)))]; }), ['kiri.ply', 'ply', true], 'senza la libreria per comprimere, il PLY si salva così com\'è (e l\'errore resta nel registro)');
    await U.evaluate(() => { isle('t', { t: 'Invio modello 3D · 12 MB', p: .4 }); });
    eq(await U.evaluate(() => { const e = document.querySelector('#isle'); return [e.classList.contains('on'), e.querySelector('.isl-p').textContent, e.querySelector('.isl-bar b').style.width]; }), [true, '40%', '40%'], 'isola con la percentuale');
    await U.evaluate(() => isleEnd('t', 'Modello 3D su GitHub')); ok(await U.evaluate(() => document.querySelector('#isle').classList.contains('ok')), 'isola chiusa con la spunta');
    await U.context().close();
  });

  await test('2.12.1: PLY con opacità e dimensioni «espanse» (KIRI) corretti all\'importazione; PLY standard intatti', async () => {
    const U = await phone('M8');
    const r = await U.evaluate(() => { const mk = (op, sc) => { const props = ['x', 'y', 'z', 'opacity', 'scale_0', 'scale_1', 'scale_2'], h = 'ply\nformat binary_little_endian 1.0\nelement vertex 2\n' + props.map(p => 'property float ' + p + '\n').join('') + 'end_header\n';
        const hb = new TextEncoder().encode(h), u = new Uint8Array(hb.length + 2 * 28); u.set(hb); const dv = new DataView(u.buffer);
        [[0, 0, 0, op[0], sc, sc, sc], [1, 1, 1, op[1], sc, sc, sc]].forEach((v, i) => v.forEach((x, j) => dv.setFloat32(hb.length + i * 28 + j * 4, x, true))); return { u, off: hb.length }; };
      const read = (u, off, i, j) => new DataView(u.buffer, u.byteOffset).getFloat32(off + i * 28 + j * 4, true);
      const a = mk([0.97, 0.5], 0.025), fa = plyFix(a.u), b = mk([4.2, -1.3], -4.6), fb = plyFix(b.u);
      return [fa.op, fa.sc, +read(fa.bytes, a.off, 0, 3).toFixed(3), +read(fa.bytes, a.off, 1, 3).toFixed(3), +read(fa.bytes, a.off, 0, 4).toFixed(3), !!fb.op, !!fb.sc, fb.bytes === b.u]; });
    eq(r, [true, true, 3.476, 0, -3.689, false, false, true], 'opacità → logit e dimensioni → logaritmo solo quando servono');
    await U.context().close();
  });

  await test('2.12.2: i file dei modelli non stanno nelle schede (memoria): le schede vecchie vengono spostate nella cache', async () => {
    const U = await phone('M9');
    await U.evaluate(async () => { await saveDev({ id: 'mg', nome: 'Game Boy', tipologia: 'Console', creato: Date.now(), m3d: { id: 'a', nome: 'gb.spz', size: 9, tipo: 'spz', data: 'data:application/octet-stream;base64,' + btoa('modello GB'), rot: [0, 0, 0] } }); await m3Migrate(); });
    const r = await U.evaluate(async () => { const d = devices.find(x => x.id === 'mg'), rec = (await DB.all()).find(x => x.id === 'mg'); return [/^local:/.test(d.m3d.data), /^local:/.test(rec.m3d.data), new TextDecoder().decode(await m3dBytes(d.m3d)), JSON.stringify(d).length < 2000]; });
    eq(r, [true, true, 'modello GB', true], 'file nella cache, nella scheda (e nel database) solo il riferimento');
    await U.context().close();
  });

  await test('2.14: grandezza reale sul piedistallo — stima dal tipo, cursore in cm salvato nella scheda', async () => {
    const U = await phone('M10');
    eq(await U.evaluate(() => [m3Cm({ nome: 'iPod shuffle (2nd gen)', tipologia: 'Lettore musicale' }), m3Cm({ nome: 'iBook G4', tipologia: 'Portatile' }), m3Cm({ nome: 'X', tipologia: 'Portatile', m3cm: 38 }), m3Scale(4) < m3Scale(12) && m3Scale(12) < m3Scale(33), m3Scale(60), m3Scale(1) >= .2]), [4, 33, 38, true, true, true].map((x, i) => i === 4 ? 1 : x), 'stima automatica e scala (lo shuffle più piccolo del portatile, massimo 1)');
    await U.evaluate(async () => { await saveDev({ id: 'ms', nome: 'iPod shuffle', tipologia: 'Lettore musicale', creato: Date.now(), m3d: { id: 'a', nome: 's.spz', size: 9, tipo: 'spz', data: 'data:application/octet-stream;base64,' + btoa('x'), rot: [0, 0, 0] } }); openModel3D(devices.find(d => d.id === 'ms')); });
    await U.waitForSelector('[data-m3cm]'); ok(await U.evaluate(() => document.querySelector('.m3size').hidden), 'cursore nascosto finché non tocchi 📏');
    await U.click('[data-m3cm]'); eq(await U.evaluate(() => document.querySelector('.m3size b').textContent), '4 cm · auto', 'mostra la stima automatica');
    await U.evaluate(() => { const r = document.querySelector('.m3size input'); r.value = 1000; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }); await U.waitForTimeout(200);
    eq(await U.evaluate(() => [devices.find(d => d.id === 'ms').m3cm, document.querySelector('.m3size b').textContent]), [60, '60 cm'], 'il cursore salva la grandezza nella scheda');
    await U.click('[data-m3auto]'); await U.waitForTimeout(200);
    eq(await U.evaluate(() => [devices.find(d => d.id === 'ms').m3cm, document.querySelector('.m3size b').textContent]), [null, '4 cm · auto'], 'Auto torna alla stima');
    await U.evaluate(() => history.back()); await U.waitForTimeout(120);
    ok(await U.evaluate(() => !!document.querySelector('.page.m3root.m3bye')), 'chiudendo la vista 3D parte la transizione di uscita');
    await U.waitForTimeout(600); ok(await U.evaluate(() => !document.querySelector('.page.m3root')), 'dopo la transizione la vista è chiusa');
    await U.context().close();
  });

  await test('2.14.2: chiudendo la scheda trascinandola in basso il contenuto non scorre (niente doppio movimento)', async () => {
    const U = await phone('M11', { hasTouch: true, isMobile: true });
    await U.evaluate(async () => { await saveDev({ id: 'pc', nome: 'Scheda lunga', tipologia: 'Portatile', note: 'x\n'.repeat(300), creato: Date.now() }); render(); openDetail('pc'); document.addEventListener('touchmove', e => { (window._pm = window._pm || []).push(e.defaultPrevented) }); });
    await U.waitForSelector('.page.det'); await U.waitForTimeout(500);
    const c = await U.context().newCDPSession(U), T = (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await T('touchStart', 200, 150); for (let i = 1; i <= 10; i++) { await T('touchMove', 200, 150 + i * 18); await U.waitForTimeout(16); }
    ok(await U.evaluate(() => window._pm.length && window._pm.every(Boolean)), 'dalla cima ogni movimento verso il basso è della scheda: lo scorrimento nativo non parte');
    eq(await U.evaluate(() => { const b = document.querySelector('.page.det .body'); return [document.querySelector('.page.det').classList.contains('pd-drag'), getComputedStyle(b).overflowY, b.scrollTop]; }), [true, 'hidden', 0], 'durante il trascinamento il contenuto è bloccato');
    await T('touchEnd'); await U.waitForTimeout(60);
    eq(await U.evaluate(() => { const p = document.querySelector('.page.det'); return p ? [getComputedStyle(p.querySelector('.body')).overflowY, p.querySelector('.body').scrollTop] : ['chiusa', 0]; }), ['hidden', 0], 'alzando il dito la scheda si chiude con il contenuto fermo');
    await U.waitForTimeout(600); ok(await U.evaluate(() => !document.querySelector('.page.det')), 'scheda chiusa');
    await U.context().close();
  });

  await test('2.7: vetro liquido simulato su iPhone (anche con Chrome)', async () => {
    const U = await phone('U5', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1' });
    eq(await U.evaluate(() => [LG.supported(), document.documentElement.classList.contains('lg'), document.documentElement.classList.contains('lgs')]), [false, false, true], 'simulato al posto della rifrazione');
    await U.evaluate(() => lgSet('off')); eq(await U.evaluate(() => document.documentElement.classList.contains('lgs')), false, 'spento');
    await U.context().close();
  });

  await test('nessun errore JavaScript', async () => { eq(errors, [], 'errori'); });

  await browser.close(); server.close();
  console.log(results.join('\n'));
  console.log(`\n${passed} superate, ${failed} fallite`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
