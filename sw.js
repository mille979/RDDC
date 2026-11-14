const V='rddc-2.0',SHELL=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!=='rddc-share'&&x!=='rddc-meta').map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
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
/* promemoria di manutenzione: controllo periodico (dove il telefono lo permette) e notifica */
async function manCheck(){
  const c=await caches.open('rddc-meta'),r=await c.match('./meta/man');if(!r)return;const m=await r.json();if(!m.notif)return;
  const t=new Date().toISOString().slice(0,10),n=new Set((m.items||[]).filter(x=>x.due&&x.due<=t).map(x=>x.n)).size;if(!n)return;
  const l=await c.match('./meta/notif'),last=l?await l.text():'';if(last&&Date.parse(t)-Date.parse(last)<3*864e5)return;
  await c.put('./meta/notif',new Response(t));
  await self.registration.showNotification('RDDC · manutenzione',{body:n===1?'1 oggetto da accendere o ricaricare':n+' oggetti da accendere o ricaricare',icon:'icon-192.png',badge:'icon-192.png',tag:'rddc-man',data:{url:'./index.html?manutenzione=1'}});
}
self.addEventListener('periodicsync',e=>{if(e.tag==='rddc-man')e.waitUntil(manCheck())});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||'./index.html',self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l)if('focus' in c){c.navigate(url).catch(()=>{});return c.focus()}return clients.openWindow(url)}))});
