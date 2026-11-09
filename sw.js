/* ==========================================
   وضع التطوير: تعطيل الكاش مؤقتاً لتحديث فوري
   ========================================== */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
  );
  self.registration.unregister();
});

self.addEventListener('fetch', e => {
  // تمرير جميع الطلبات مباشرة للشبكة/المتصفح دون تخزين مؤقت
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
