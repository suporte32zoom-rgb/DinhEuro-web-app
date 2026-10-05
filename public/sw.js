// DinhEuro Finanças - Progressive Web App Service Worker (Production Hostinger Ready)
const CACHE_NAME = "dinheuro-v5";
const API_CACHE_NAME = "dinheuro-api-cache-v5";
const OFFLINE_URL = "/";

// Only precache core shell static assets (never APIs or dynamic financial quotes)
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

// 1. Install Event: Pre-cache App Shell and skip waiting immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn("[SW] Warning while pre-caching assets:", err);
        });
      })
  );
});

// 2. Activate Event: Clean up all old caches immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME && cache !== API_CACHE_NAME) {
              console.log("[SW] Deleting obsolete cache version:", cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event Strategy:
// - API calls (/api/*): Strict NETWORK FIRST (Always fetch live rates, falling back to cache only when offline)
// - Static assets & navigation: Stale-While-Revalidate with offline fallback
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests and non-http(s) schemes
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // A. Handle API Requests: NETWORK FIRST, falling back to Cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // Save fresh copy in API cache for offline emergency use only
            const responseClone = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed (offline or network disruption) -> fallback to cached API response
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache, return offline JSON response
            return new Response(
              JSON.stringify({
                success: false,
                offline: true,
                message: "Modo offline ativo. Conecte-se à internet para atualizar as cotações em tempo real.",
                timestamp: new Date().toISOString(),
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 200,
              }
            );
          });
        })
    );
    return;
  }

  // B. Handle Static Assets & Navigation (Stale-While-Revalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === location.origin || url.hostname.includes("fonts"))
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Message Handler for instant updates & cache purging
self.addEventListener("message", (event) => {
  if (event.data && (event.data.type === "SKIP_WAITING" || event.data.type === "CLEAR_CACHE")) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
    self.skipWaiting();
  }
});
