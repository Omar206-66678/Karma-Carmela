const V='wms-v2';
const F=['./','index.html','manifest.webmanifest','icon.svg','css/app.css','js/app.js','js/db.js','js/core.js','js/services.js','js/reports.js','js/ui.js','js/pages/home.js','js/pages/products.js','js/pages/parties.js','js/pages/docs.js','js/pages/finance.js','js/pages/settings.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(F)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{if(res.ok){const cl=res.clone();caches.open(V).then(x=>x.put(r,cl));}return res;}).catch(()=>r.mode==='navigate'?caches.match('index.html'):Response.error())));
});
