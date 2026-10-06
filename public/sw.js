// DinhEuro Finanças - Progressive Web App Service Worker
// Versão do Cache Atualizada para Produção e Sincronização em Tempo Real (Hostinger / Live)
const CACHE_NAME = "dinheuro-v12-production";
const OFFLINE_URL = "/";

// Apenas recursos estáticos essenciais do App Shell (NUNCA dados financeiros em tempo real)
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

// 1. Install Event: Pré-carrega o Shell e força ativação imediata (skipWaiting)
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn("[SW] Aviso ao pré-carregar assets estáticos:", err);
        });
      })
  );
});

// 2. Activate Event: Limpa e DELETA AUTOMATICAMENTE todos os caches antigos do navegador
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("[SW] Deletando cache antigo de versão anterior:", cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event Strategy:
// - Cotações & Endpoints Financeiros (/api/* e APIs externas): STRICT NETWORK FIRST.
//   Sempre consulta a rede primeiro para garantir dados 100% atualizados na Hostinger.
// - Assets estáticos: Stale-While-Revalidate com fallback offline seguro.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignora requisições não-GET ou esquemas não HTTP/HTTPS
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // A. REQUISIÇÕES DE DADOS FINANCEIROS E APIS: NETWORK FIRST OBRIGATÓRIO
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("awesomeapi.com.br") ||
    url.hostname.includes("brapi.dev") ||
    url.hostname.includes("hgbrasil.com")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          // Fallback gracioso offline sem travar o aplicativo
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              message: "Conexão de rede offline. Reconecte para obter cotações em tempo real.",
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

  // B. RECURSOS ESTÁTICOS & NAVEGAÇÃO: Stale-While-Revalidate
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

// 4. Ouvinte de Mensagens para atualização instantânea
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
