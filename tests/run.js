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
const putBlob = buf => { const s = sha(Buffer.concat([Buffer.from('blob'), buf])); gh.blobs.set(s, buf); return s; };
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
    await ctx.route(/^https:\/\/(api\.mymemory|cdn\.jsdelivr|[^/]*everymac|[^/]*wikipedia\.org|www\.ifixit\.com|theapplewiki\.com|live\.icecat\.biz)/, r => r.abort());
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

  await test('nessun errore JavaScript', async () => { eq(errors, [], 'errori'); });

  await browser.close(); server.close();
  console.log(results.join('\n'));
  console.log(`\n${passed} superate, ${failed} fallite`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
