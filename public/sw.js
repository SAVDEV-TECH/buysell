const CACHE_NAME = 'buysell-cache-v1';
const OFFLINE_URL = '/';

// Static resources to cache immediately during installation
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/icon.png',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg',
  '/window.svg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline essentials');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting obsolete cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Bypass Service Worker entirely for dev servers, real-time Firebase, chat, checkouts, and external API requests
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('paystack') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/actions/')
  ) {
    return; // Let standard browser network handling take over
  }

  // 2. Navigation requests (HTML pages) -> Network First, falling back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response and save to cache
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseCopy);
          });
          return response;
        })
        .catch(() => {
          // If offline, serve the cached page
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to home page if request not cached
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // 3. Static assets (images, styles, scripts, fonts) -> Stale-While-Revalidate
  // Cache first, serving instantaneous results, while fetching from network in the background to update the cache.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseCopy = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseCopy);
              });
            }
            return response;
          })
          .catch(() => {
            // Suppress background fetch errors when offline
          });

        return cachedResponse || networkFetch;
      })
    );
  }
});
