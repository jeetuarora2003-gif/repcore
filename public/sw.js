self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== "repcore-v2") {
              return caches.delete(cacheName);
            }
          })
        );
      }),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  
  // Only cache static assets (Next.js chunks, images, fonts)
  if (url.pathname.startsWith("/_next/static/") || 
      url.pathname.match(/\.(png|jpg|jpeg|svg|gif|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open("repcore-v2").then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network First for all HTML and dynamic API/RSC requests
  event.respondWith(
    fetch(event.request)
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || new Response("Offline", { status: 503 });
      })
  );
});
