const CACHE_NAME = 'vivica-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch to prevent install failure if external CDNs are temporarily unreachable
      return cache.addAll(ASSETS).catch(err => console.warn('Cache warm-up partial fail:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle standard GET requests for local caching
  if (event.request.method !== 'GET') return;
  
  // Robustness: Handle relative path resolution for blobs/sandboxes
  const url = new URL(event.request.url);
  
  // We prioritize network but fall back to cache for standard assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache valid local responses
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
