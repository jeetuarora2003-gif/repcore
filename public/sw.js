const CACHE_NAME = "repcore-v1";

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
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Strategy: Cache First for Static Assets (Next.js chunks, Images, Fonts, Icons)
  const isStaticAsset = 
    url.pathname.includes("_next/static") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|woff|woff2|ico)$/) ||
    event.request.destination === "image" ||
    event.request.destination === "font";

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // Strategy: Network First for HTML and dynamic API/RSC requests
  // This ensures the data is always fresh when online, but works offline if cached.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML/RSC responses for offline fallback
        if (response.ok && (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        
        // Return a basic offline response if both network and cache fail
        return new Response(
          "<html><body style='font-family:sans-serif; text-align:center; padding-top:20vh;'><h1>Offline</h1><p>Please check your internet connection.</p></body></html>",
          { headers: { "Content-Type": "text/html" } }
        );
      })
  );
});
