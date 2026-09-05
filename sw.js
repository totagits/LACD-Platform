// LACD Progressive Web App Service Worker
// Designed for offline resilience across Liberia's 15 counties

const CACHE_NAME = 'lacd-platform-v1';

const STATIC_PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './lacd-logo.jpg',
  './favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('Pre-caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-first strategy for static assets, network-first with cache fallback for pages
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests except specific CDNs if any
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if found
      if (cachedResponse) {
        // Fetch in background to keep cache fresh (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {
          // Offline, ignore network fetch error
        });
        return cachedResponse;
      }

      // If not in cache, fetch from network and store in cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // If both network and cache fail, fallback to root or cached index
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./') || caches.match('./index.html');
        }
      });
    })
  );
});
