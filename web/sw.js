/* Self · service worker: la app abre sin conexión y se actualiza en segundo plano */
const CACHE='self-v1';
const SHELL=['./','index.html','config.js','manifest.webmanifest','js/util.js','js/demo.js','js/data.js','js/app.js','js/boot.js','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET')return;
  /* Los datos de Supabase siempre van a la red (la app guarda su propia copia) */
  if(url.hostname.endsWith('supabase.co')||url.hostname.endsWith('supabase.in'))return;
  const cacheable=url.origin===location.origin||/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if(!cacheable)return;
  /* Página y configuración: primero la red, para recoger cambios al momento */
  if(req.mode==='navigate'||url.pathname.endsWith('/config.js')||url.pathname.endsWith('/index.html')){
    e.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res}).catch(()=>caches.match(req).then(r=>r||caches.match('index.html'))));
    return;
  }
  /* Resto: copia local inmediata y actualización en segundo plano */
  e.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(req);
    const net=fetch(req).then(res=>{if(res&&(res.ok||res.type==='opaque'))cache.put(req,res.clone());return res}).catch(()=>cached);
    return cached||net;
  }));
});
