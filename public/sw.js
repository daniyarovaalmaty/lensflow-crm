// This service worker intentionally does nothing except clean itself up.
// A previous version intercepted every fetch (including POST requests) via
// `event.respondWith(fetch(event.request))`, which rejected the promise for
// requests with a body and broke API calls (e.g. POS sale creation).
// It now unregisters itself, clears caches, and reloads any controlled clients.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll();
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});

// No fetch handler — let the browser handle all requests normally.
