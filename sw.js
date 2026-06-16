const CACHE = 'wartung-v6';

self.addEventListener('install', e => {
  const base = self.registration.scope;
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled([
      c.add(base),
      c.add(base + 'index.html'),
      c.add(base + 'manifest.json'),
      c.add(base + 'icons/elumatec_logos.svg'),
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // GitHub config: Netz zuerst
  if (e.request.url.includes('raw.githubusercontent.com')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // HTML-Anfragen (Navigation + pull-to-refresh) → immer index.html aus Cache
  const acceptHeader = e.request.headers.get('accept') || '';
  const isHtml = e.request.mode === 'navigate' || acceptHeader.includes('text/html');
  if (isHtml) {
    e.respondWith(
      caches.match(self.registration.scope + 'index.html')
        .then(r => r || fetch(e.request).catch(() => new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Assets: Cache first, dann Netz
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
