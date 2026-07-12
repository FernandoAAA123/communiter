// sw.js — service worker de Communiter
// Sube este archivo a la MISMA carpeta que Communiter.html (mismo nivel,
// junto al HTML). La app lo registra como './sw.js' de forma relativa,
// así que debe quedar en la misma ruta desde la que se sirve el HTML.
//
// Qué hace: cachea el "app shell" (el propio HTML y cualquier recurso del
// mismo origen) con estrategia "red primero, caché como respaldo" — así,
// si el usuario abre la app sin conexión después de haber cargado una vez,
// sigue viendo la interfaz en vez de una pantalla en blanco. Las llamadas a
// Firebase u otros orígenes (CDNs, APIs) NO se cachean aquí a propósito,
// porque son datos en tiempo real que no deben servirse desde caché.

const CACHE_NAME = 'communiter-shell-v1';

self.addEventListener('install', (event) => {
  // Activa esta versión del SW sin esperar a que se cierren las pestañas viejas
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo interceptamos GET del mismo origen — dejamos pasar todo lo demás
  // (Firebase, Google Fonts, CDNs, Spotify, etc.) directo a la red.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const fresh = await fetch(request);
        // Solo cacheamos respuestas válidas
        if (fresh && fresh.status === 200) {
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (err) {
        // Sin conexión: servir lo último que se guardó en caché, si existe
        const cached = await cache.match(request);
        if (cached) return cached;
        throw err;
      }
    })
  );
});
