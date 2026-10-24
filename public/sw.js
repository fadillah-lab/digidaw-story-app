const CACHE_PREFIX = "story-space-pwa-";
const CACHE_VERSION = "v1";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const appBaseUrl = new URL("./", self.registration.scope);
const manifestUrl = new URL("manifest.webmanifest", appBaseUrl).href;
const icon192Url = new URL("icons/icon-192x192.png", appBaseUrl).href;
const icon512Url = new URL("icons/icon-512x512.png", appBaseUrl).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache the app entry point and PWA metadata. Other same-origin app assets
      // are cached as the user loads them while online.
      await cache.addAll([appBaseUrl.href, manifestUrl, icon192Url, icon512Url]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Avoid caching Vite's development client/HMR internals.
  if (requestUrl.pathname.includes("/@vite/") || requestUrl.pathname.includes("/__vite_ping")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(appBaseUrl.href, response.clone());
          }
          return response;
        } catch {
          const cachedPage = await caches.match(appBaseUrl.href);
          if (cachedPage) return cachedPage;
          return new Response(
            "<!doctype html><html lang=\"id\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Offline</title><body><h1>Kamu sedang offline</h1><p>Buka aplikasi saat online setidaknya sekali agar app shell tersimpan untuk penggunaan offline.</p></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 },
          );
        }
      })(),
    );
    return;
  }

  // Cache-first for same-origin static resources; refresh the cache on a miss.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      try {
        const response = await fetch(request);
        if (response && response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        // External API requests are not intercepted, so this fallback is for
        // same-origin assets only. Missing assets fail clearly while offline.
        throw error;
      }
    })(),
  );
});

// Keep Web Push handling alongside the PWA cache handlers.
self.addEventListener("push", (event) => {
  let data = {
    title: "Dicoding Story",
    options: { body: "Ada notifikasi baru." },
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Dicoding Story", {
      body: data.options?.body || "Ada notifikasi baru.",
      icon: icon192Url,
      badge: icon192Url,
      data: { url: new URL("./#/stories", appBaseUrl).href },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || new URL("./#/stories", appBaseUrl).href;
  event.waitUntil(self.clients.openWindow(targetUrl));
});
