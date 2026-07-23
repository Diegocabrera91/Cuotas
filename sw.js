/* Service Worker — Cuotas del Curso
 * Estrategia:
 *  - App shell (HTML, manifest, íconos, fuentes): cache-first con actualización en segundo plano.
 *  - API de Apps Script (script.google.com / googleusercontent.com): SIEMPRE red, nunca caché,
 *    para que los datos de cuotas estén al día.
 * Sube CACHE_VERSION cada vez que publiques cambios del index.html.
 */
const CACHE_VERSION = 'cuotas-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // La API nunca se cachea
  if (url.includes('script.google.com') || url.includes('googleusercontent.com')) {
    return; // dejar pasar a la red directamente
  }

  // App shell y recursos estáticos: cache-first + actualización silenciosa
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cacheado => {
        const red = fetch(event.request).then(resp => {
          if (resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'cors')) {
            const copia = resp.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, copia));
          }
          return resp;
        }).catch(() => cacheado);
        return cacheado || red;
      })
    );
  }
});
