const CACHE_NAME = 'fund-monitor-v2';
const APP_BASE = self.registration?.scope ?? self.location.origin + '/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([APP_BASE, `${APP_BASE}manifest.webmanifest`]))
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Network-first: always try the network so newly deployed code is picked up,
  // and fall back to the cache only when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
