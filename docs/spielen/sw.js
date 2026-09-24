const CACHE = 'irisa-379deed004fa';
const DATEIEN = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n.startsWith('irisa-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== location.origin) return;
  const seite = anfrage.mode === 'navigate';
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const treffer = await c.match(seite ? 'index.html' : anfrage, { ignoreSearch: true });
      const frisch = fetch(anfrage)
        .then((antwort) => {
          if (antwort.ok) c.put(seite ? 'index.html' : anfrage, antwort.clone());
          return antwort;
        })
        .catch(() => treffer);
      if (treffer) {
        e.waitUntil(frisch.catch(() => {}));
        return treffer;
      }
      return frisch;
    }),
  );
});
