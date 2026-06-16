const CACHE = 'wartung-v5';

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
  // GitHub config: immer Netz versuchen, Offline → Cache
  if (e.request.url.includes('raw.githubusercontent.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Navigation (pull-to-refresh, direkte URL): immer index.html aus Cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match(self.registration.scope + 'index.html')
        .then(r => r || fetch(e.request))
    );
    return;
  }

  // Assets: Cache first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
