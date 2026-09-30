// Service worker sederhana untuk PWA "ERP Toko AC".
// Strategi: network-first untuk API (selalu data terbaru), cache-first untuk aset statis.
const CACHE = 'erp-ac-v1';
const ASET = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASET)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Jangan cache API atau request non-GET -> selalu ke jaringan.
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api')) {
    return; // biarkan default (langsung ke network)
  }
  // Cache-first untuk aset statis; fallback ke network.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          // Simpan salinan aset yang berhasil diambil.
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
