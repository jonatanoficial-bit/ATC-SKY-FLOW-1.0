const CACHE_NAME = 'skyflow-control-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './css/tokens.css',
  './css/styles.css',
  './css/admin.css',
  './js/app.js',
  './js/admin/admin.js',
  './js/core/storage.js',
  './js/core/profile-manager.js',
  './js/core/content-manager.js',
  './js/core/fallback-content.js',
  './js/game/audio.js',
  './js/game/math.js',
  './js/game/map-renderer.js',
  './js/game/simulation.js',
  './assets/branding/logo.svg',
  './assets/branding/favicon.svg',
  './assets/branding/cover-core.svg',
  './assets/branding/cover-atlantic.svg',
  './assets/branding/cover-pacific.svg',
  './assets/branding/icon-192.png',
  './assets/branding/icon-512.png',
  './assets/branding/apple-touch-icon.png',
  './assets/data/world.geojson',
  './content/index.json',
  './content/core/manifest.json',
  './content/core/airports.json',
  './content/core/routes.json',
  './content/core/scenarios.json',
  './content/dlc_north_atlantic/manifest.json',
  './content/dlc_north_atlantic/airports.json',
  './content/dlc_north_atlantic/routes.json',
  './content/dlc_north_atlantic/scenarios.json',
  './content/dlc_pacific_horizons/manifest.json',
  './content/dlc_pacific_horizons/airports.json',
  './content/dlc_pacific_horizons/routes.json',
  './content/dlc_pacific_horizons/scenarios.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});