// Cache-Name versioniert — bei Änderung wird der alte Cache automatisch gelöscht
const CACHE = 'wartung-v6';

self.addEventListener('install', e => {
  const base = self.registration.scope; // z.B. https://sg9-evilfly.github.io/elumatec_test/
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled([
      // Promise.allSettled statt Promise.all: ein Fehler beim Cachen einer Datei
      // bricht nicht den gesamten Install-Vorgang ab
      c.add(base),               // Root-URL (Aufruf ohne index.html)
      c.add(base + 'index.html'),
      c.add(base + 'manifest.json'),
      c.add(base + 'icons/elumatec_logos.svg'),
    ]))
  );
  // Neuen SW sofort aktivieren ohne auf das Schließen aller Tabs zu warten
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Alle alten Cache-Versionen löschen um Speicher freizugeben
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  // SW übernimmt sofort die Kontrolle über alle offenen Tabs
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Config von GitHub: immer frisch laden (network-first)
  // Offline → gecachte Version falls vorhanden
  if (e.request.url.includes('raw.githubusercontent.com')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // HTML-Navigation und pull-to-refresh: immer index.html aus Cache zurückgeben
  // Doppelte Prüfung (mode + accept-header) weil iOS den navigate-mode anders behandelt
  const acceptHeader = e.request.headers.get('accept') || '';
  const isHtml = e.request.mode === 'navigate' || acceptHeader.includes('text/html');
  if (isHtml) {
    e.respondWith(
      caches.match(self.registration.scope + 'index.html')
        .then(r => r || fetch(e.request).catch(() => new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Alle anderen Assets (JS, CSS, Bilder): Cache first, bei Miss Netz
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
