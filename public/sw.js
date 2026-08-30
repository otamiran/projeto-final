// public/sw.js
// Service worker simples: cacheia o essencial para permitir instalação
// e funcionamento básico offline (cache-first com fallback de rede).

const CACHE_NAME = "passagem-de-turno-v1";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Notificações push ────────────────────────────────────────────────────
// Disparado quando a Edge Function do Supabase envia uma notificação
// (ex.: nova ocorrência adicionada em um relatório aberto).
self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: "Passagem de Turno", corpo: event.data ? event.data.text() : "" };
  }

  const titulo = dados.titulo || "Nova ocorrência";
  const opcoes = {
    body: dados.corpo || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [120, 60, 120],
    data: { url: dados.url || "/", relatorioId: dados.relatorioId || null },
    tag: dados.tag || undefined, // agrupa notificações do mesmo relatório, se informado
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

// Ao tocar na notificação: se já tem uma aba aberta, avisa ela qual
// relatório abrir (postMessage); se não tem nenhuma, abre uma nova já com
// o relatório na URL.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const dados = event.notification.data || {};
  const relatorioId = dados.relatorioId || null;
  const url = dados.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes(self.location.origin) && "focus" in cliente) {
          if (relatorioId) cliente.postMessage({ tipo: "abrir-relatorio", relatorioId });
          return cliente.focus();
        }
      }
      if (clients.openWindow) {
        const destino = relatorioId ? `/?relatorio=${relatorioId}` : url;
        return clients.openWindow(destino);
      }
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Apenas GET deve ser cacheado
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Clona e guarda no cache para próximas vezes
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
