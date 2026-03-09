const CACHE = 'skyflow-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './css/tokens.css',
  './css/styles.css',
  './css/admin.css',
  './js/app.js',
  './js/admin/admin.js',
  './assets/branding/logo.svg',
  './assets/branding/favicon.svg',
  './content/index.json'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => cached)));
});
