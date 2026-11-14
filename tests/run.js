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
  if (m === 'POST' && p === 'git/commits') { const s = 'c' + (++gh.n); gh.commits.set(s, { tree: b.tree, parents: b.parents, message: b.message }); return J({ sha: s }, 201); }
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
    eq(await p.evaluate(() => /class="ld ld-ann"/.test(loader('ann', 'x')) && /ld-mac/.test(loader(ldKind('Cerco su EveryMac…'), 'x'))), true, 'animazioni di attesa');
  });

  await test('manutenzione: giro di accensioni e ricariche, stato batteria, Oggi e calendario', async () => {
    await p.evaluate(async () => {
      const old = addMonths(today(), -8), rec = addMonths(today(), -1);
      for (const d of [
        { id: 'mp', nome: 'PowerBook G4', tipologia: 'Portatile', luogo: 'Alex', man_on: old, man_charge: old, batt_stato: 'Regge' },
        { id: 'mi', nome: 'iBook G3', tipologia: 'Portatile', luogo: 'Alex', man_on: rec, batt_stato: 'Morta' },
        { id: 'ms', nome: 'Macintosh SE', tipologia: 'All-in-one', luogo: 'Damiano', man_on: rec },
        { id: 'mu', nome: 'MacBook Pro 2017', tipologia: 'Portatile', ruolo: 'In uso', garanzia: addDays(today(), 20) }]) { d.creato = Date.now(); await saveDev(d); }
      S.view = 'col'; S.q = ''; S.sel = {}; render();
    });
    const due = await p.evaluate(() => manDue().filter(t => ['mp', 'mi', 'ms', 'mu'].includes(t.d.id)).map(t => t.d.id + (t.st.dueOn ? '+on' : '') + (t.st.dueCh ? '+ch' : '')));
    eq(due, ['mp+on+ch'], 'da fare (batteria morta, fissi recenti e oggetti in uso esclusi)');
    eq(await p.evaluate(() => [manTargets(devices.find(d => d.id === 'mu')).length, missing(devices.find(d => d.id === 'mu')).length, !!document.querySelector('.oggi #manB'), !!document.querySelector('.oggi #warB')]), [0, 0, true, true], 'oggetti in uso e scheda Oggi');
    await p.click('#manB'); await p.click('[data-mid="mp"] [data-mg="on"]'); await p.click('[data-mid="mp"] [data-mg="charge"]'); await p.waitForTimeout(300);
    eq(await p.evaluate(() => { const d = devices.find(x => x.id === 'mp'); return [d.man_on === today(), d.man_charge === today(), d.manutenzioni.map(m => m.tipo), manState({ d, u: null }).dueOn]; }), [true, true, ['on', 'charge'], false], 'giro');
    await p.evaluate(() => goBase()); await p.waitForTimeout(300);
    const ics = await p.evaluate(() => buildICS());
    ok(/BEGIN:VCALENDAR/.test(ics) && /SUMMARY:⚡ Accendere: PowerBook G4/.test(ics) && /SUMMARY:🔋 Ricaricare: PowerBook G4/.test(ics) && /Scade la garanzia: MacBook Pro 2017/.test(ics) && !/Ricaricare: iBook/.test(ics), 'calendario');
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
      if (q.headers()['x-goog-api-key'] !== 'AIzaTEST') return r.fulfill({ status: 400, headers: H, body: JSON.stringify({ error: { message: 'API key not valid. Please pass a valid API key.' } }) });
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
    eq(r1, ['Psion Series 5mx', ['gemini-3.5-flash:gratis0'], 'gemini-2.5-flash', 'gratis0'], 'Piano B dopo il limite 0');
    posts.length = 0; await G.evaluate(() => gemAsk('Psion Series 5mx', ''));
    eq(posts, ['gemini-2.5-flash+web'], 'la volta dopo parte subito dal modello che funziona e salta quello esaurito');
    // 2) nessun modello con quota gratuita → spiegazione chiara con i modelli provati
    await G.evaluate(() => { LS.set('rd_gem_cd', {}); LS.set('rd_gem', { key: 'AIzaTEST', model: '', ok: '' }); });
    plan = Object.fromEntries(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].map(m => [m, { body: q429(`Quota exceeded ... limit: 0, model: ${m}`, 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', '0') }]));
    await G.evaluate(() => openGemini({ q: 'Psion Series 5mx', onResult() {} })); await G.waitForSelector('.errc');
    ok(await G.evaluate(() => { const t = document.querySelector('.errc').textContent; return /Nessun modello gratuito per questa chiave/.test(t) && /modelli provati: gemini-3\.5-flash → gratis0, gemini-2\.5-flash → gratis0, gemini-2\.5-flash-lite → gratis0/.test(t) && /limit: 0/.test(t) && !!document.querySelector('.errc [data-eretry]') && !!document.querySelector('.errc [data-eset="gem"]'); }), 'scheda d\'errore con rimedio, dettagli, Riprova e Impostazioni');
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
    // 6) chiave sbagliata: si ferma subito, senza provare altri modelli
    plan = { 'gemini-3.5-flash+web': { status: 400, body: { error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }] } } } };
    await G.evaluate(() => LS.set('rd_gem', { key: 'AIzaTEST', model: '', ok: '' })); posts.length = 0;
    eq(await G.evaluate(() => gemAsk('x', '').catch(e => e.kind)), 'chiave', 'chiave non valida'); eq(posts, ['gemini-3.5-flash+web'], 'nessun altro modello provato');
    // 7) registro degli errori
    ok(await G.evaluate(() => { const a = LS.get('rd_errlog', []); return a.length >= 1 && a.some(x => x.kind === 'gratis0tutti' && /limit: 0/.test(x.d)); }), 'errori nel registro');
    await G.evaluate(() => openErrLog()); ok(await G.evaluate(() => /Nessun modello gratuito/.test(stack[stack.length - 1].textContent)), 'pagina del registro');
    await G.context().close();
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

  await test('nessun errore JavaScript', async () => { eq(errors, [], 'errori'); });

  await browser.close(); server.close();
  console.log(results.join('\n'));
  console.log(`\n${passed} superate, ${failed} fallite`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
