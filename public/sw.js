// DinhEuro Finanças - Progressive Web App Service Worker
// Versão do Cache Forçada para Produção (Hostinger / dinheuro.com)
const CACHE_NAME = "dinheuro-pwa-v15-fresh";
const OFFLINE_URL = "/";

// Recursos estáticos essenciais do App Shell
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
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            console.log("[SW] Deletando cache antigo:", key);
            return caches.delete(key);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event Strategy:
// STRICT NETWORK-FIRST para todas as rotas (estáticas e APIs)
// Sempre busca a versão mais recente publicada no domínio dinheuro.com antes de recorrer ao cache local.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignora requisições não-GET ou esquemas não HTTP/HTTPS
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // A. REQUISIÇÕES DE DADOS FINANCEIROS E APIS (/api/*, AwesomeAPI, BRAPI, HG Brasil)
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

  // B. RECURSOS ESTÁTICOS, SCRIPTS, ESTILOS E NAVEGAÇÃO: NETWORK-FIRST
  event.respondWith(
    fetch(request)
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
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (request.mode === "navigate") {
          return caches.match(OFFLINE_URL);
        }
      })
  );
});

// 4. Ouvinte de Mensagens para atualização instantânea
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
