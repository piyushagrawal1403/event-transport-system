const SW_VERSION = new URL(self.location.href).searchParams.get('appVersion') || 'dev';
const CACHE_PREFIX = 'event-transport';
const CACHE_NAME = `${CACHE_PREFIX}-${SW_VERSION}`;
const STATIC_DESTINATIONS = new Set(['script', 'style', 'font', 'image']);

function isCacheableResponse(response) {
  return response && response.ok && (response.type === 'basic' || response.type === 'default');
}

async function putInCache(request, response) {
  if (!isCacheableResponse(response)) {
    return response;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, fallbackResponse) {
  try {
    const response = await fetch(request);
    return await putInCache(request, response);
  } catch (error) {
    const cached = await caches.match(request);
    return cached || fallbackResponse;
  }
}

async function cacheFirst(request, fallbackResponse) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    return await putInCache(request, response);
  } catch (error) {
    return fallbackResponse;
  }
}

self.addEventListener('install', () => {
  // Wait for an explicit user action before activating a newly installed worker.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    );

    await clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Network unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(
        request,
        new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      )
    );
    return;
  }

  const isStaticAsset =
    STATIC_DESTINATIONS.has(request.destination) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/vite.svg';

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    cacheFirst(request, new Response('Offline', { status: 503 }))
  );
});

// ─── Push Notification Handling ───
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Event Transport Notification';
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'event-transport',
      requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
