const CACHE = 'skyflow-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './css/tokens.css',
  './css/styles.css',
  './css/admin.css',
  './js/app.js',
  './js/game/simulation.js',
  './js/game/map-renderer.js',
  './js/admin/admin.js',
  './assets/branding/logo.svg',
  './assets/branding/favicon.svg',
  './content/core/airports.json',
  './content/core/scenarios.json',
  './build-info.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ||
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached)
    )
  );
});
