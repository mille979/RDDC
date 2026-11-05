const V='rddc-v13',SHELL=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!=='rddc-share').map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
/* prima la rete, saltando la cache HTTP (così un aggiornamento arriva subito); offline usa la copia salvata */
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  /* Condividi → RDDC da Galleria, Google Foto…: salva i file e apre l'app */
  if(e.request.method==='POST'&&u.origin===location.origin&&u.pathname.endsWith('/condividi')){
    e.respondWith((async()=>{
      const fd=await e.request.formData(),c=await caches.open('rddc-share');
      for(const k of await c.keys())await c.delete(k);
      let i=0;for(const f of fd.getAll('file')){if(!f||!f.size)continue;await c.put(new Request('./condividi/'+Date.now()+'-'+(i++)),new Response(f,{headers:{'content-type':f.type||'application/octet-stream','x-name':encodeURIComponent(f.name||'file')}}))}
      await c.put(new Request('./condividi/meta'),new Response(JSON.stringify({title:fd.get('title')||'',text:fd.get('text')||'',url:fd.get('url')||''})));
      return Response.redirect(new URL('./index.html?condividi=1',self.registration.scope).href,303);
    })());
    return;
  }
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
});
