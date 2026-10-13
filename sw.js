const CACHE_NAME = 'nodulat-v3';
const ASSETS = [
  './',
  './index.html',
  './logo-pegasus.png',
  './manifest.json',
  './nodu-style.css',
  './nodu-app.js',
  './manifest.json',
  './habitos.html',
  './app.js',
  './style.css',
  './finanzas.html',
  './finanzas-app.js',
  './finanzas-style.css',
  './vitaltrack.html',
  './vitaltrack-app.js',
  './vitaltrack-style.css',
  './seq-task.html',
  './seq-app.js',
  './seq-style.css',
  'https://img.icons8.com/isometric/192/flash-on.png',
  'https://img.icons8.com/isometric/512/flash-on.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
