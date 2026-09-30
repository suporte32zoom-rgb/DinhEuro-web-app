// DinhEuro Finanças - Progressive Web App Service Worker
const CACHE_NAME = "dinheuro-v3";
const OFFLINE_URL = "/";

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

// 1. Install Event: Pre-cache App Shell
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

// 2. Activate Event: Clean up all old caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("[SW] Cleaning up stale cache version:", cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event Strategy:
// - API calls (/api/*): STRICT Network First (bypass cache on network, never serve stale cache when online)
// - Static assets & navigation: Stale-While-Revalidate with offline fallback
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests and non-http(s) schemes
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // A. Handle API Requests: STRICT NETWORK FIRST
  // Always fetches fresh live market data directly from network when online.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // Optionally cache fresh snapshot for offline emergencies only
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed (offline) -> fallback to last cached response if available
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({
              offline: true,
              message: "Modo offline ativo. Conecte-se à internet para atualizar as cotações em tempo real.",
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { "Content-Type": "application/json" },
              status: 200,
            }
          );
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

// 4. Message Handler for updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
