// Service Worker PWA — cache léger, compatible tous navigateurs
const STATIC_CACHE_NAME = 'fikiri-static-v4';

const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

function isCacheableRequest(request) {
  try {
    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    if (request.method !== 'GET') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|png|jpe?g|svg|webp|woff2?|ico)$/i.test(url.pathname)
  );
}

async function cacheResponse(cacheName, request, response) {
  if (!isCacheableRequest(request) || !response || response.status !== 200) {
    return;
  }
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (error) {
    console.warn('[SW] Cache ignoré:', request.url, error?.message || error);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!isCacheableRequest(request)) {
    return;
  }

  const url = new URL(request.url);

  // Ne jamais intercepter les API
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('api.collect.fikiri.co') ||
    url.hostname.includes('localhost:3000')
  ) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cacheResponse(STATIC_CACHE_NAME, request, response);
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Pages HTML : network first, fallback cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        cacheResponse(STATIC_CACHE_NAME, request, response);
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html'))),
  );
});
