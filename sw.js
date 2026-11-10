const V = 'kk-v5';
const F = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'css/app.css', 'js/app.js', 'js/db.js', 'js/core.js', 'js/barcode.js', 'js/decoder.js', 'js/scanner.js', 'js/services.js', 'js/reports.js', 'js/ui.js', 'js/pages/dashboard.js', 'js/pages/products.js', 'js/pages/categories.js', 'js/pages/docs.js', 'js/pages/invoices.js', 'js/pages/parties.js', 'js/pages/cash.js', 'js/pages/reports.js', 'js/pages/settings.js', 'js/pages/more.js'];
const FONT = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
// التثبيت لا يفشل بسبب ملف ناقص: نحاول كل ملف على حدة
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(F.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => { })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))));
  self.clients.claim();
});
// الشبكة أولاً (لتصل التحديثات فوراً) ثم الكاش عند انقطاع الإنترنت؛ الخطوط من الكاش أولاً
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const same = u.origin === location.origin, font = FONT.test(u.hostname);
  if (!same && !font) return;
  if (font) {
    e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const cl = res.clone(); caches.open(V).then(x => x.put(r, cl)); } return res; }).catch(() => Response.error())));
    return;
  }
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const cl = res.clone(); caches.open(V).then(x => x.put(r, cl)); }
    return res;
  }).catch(() => caches.match(r).then(c => c || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});