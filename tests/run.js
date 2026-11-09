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

  await test('nessun errore JavaScript', async () => { eq(errors, [], 'errori'); });

  await browser.close(); server.close();
  console.log(results.join('\n'));
  console.log(`\n${passed} superate, ${failed} fallite`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
