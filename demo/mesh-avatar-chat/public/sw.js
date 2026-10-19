// Serves the piper-plus runtime, dictionary and voice model from Cache
// Storage. The page downloads them once with a progress bar and stores them
// here; the engine's own requests then come from the cache, and later visits
// start without downloading.
const CACHE_NAME = 'mesh-avatar-chat-piper-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith('mesh-avatar-chat-piper-') && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const scope = self.registration.scope;
  if (!request.url.startsWith(`${scope}piper/`)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(request, { ignoreSearch: true });
      return hit ?? fetch(request);
    })(),
  );
});
