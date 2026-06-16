const CACHE = 'wartung-v4';

self.addEventListener('install', e => {
  const base = self.registration.scope;
  const ASSETS = [
    base,
    base + 'index.html',
    base + 'manifest.json',
    base + 'icons/elumatec_logos.svg',
  ];
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(url => c.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // GitHub config immer live holen, bei Offline gecachte Version
  if (e.request.url.includes('raw.githubusercontent.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Alles andere: Cache first, dann Netz, Fallback index.html
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(() =>
        caches.match(self.registration.scope + 'index.html')
      );
    })
  );
});
