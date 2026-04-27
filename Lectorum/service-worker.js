// Lectorum service worker
// Estrategia: cache-first para shell, network-first para APIs externas.

const CACHE_NAME = 'lectorum-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './robots.txt',
  './styles/main.css',
  './js/app.js',
  './js/db.js',
  './js/api.js',
  './js/scanner.js',
  './js/views.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No cachear APIs externas (Google Books, OpenLibrary, portadas)
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('openlibrary.org') ||
      url.hostname.includes('googleusercontent.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        // Solo cachear respuestas válidas de mismo origen
        if (resp.ok && url.origin === self.location.origin) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
