const CACHE_NAME = "money-rule-app-v47.68";
const APP_SHELL = ["./","./index.html","./style.css?v=47.68","./app.js?v=47.68","./manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:"window", includeUncontrolled:true}))
      .then(clients => clients.forEach(client => client.postMessage({type:"APP_UPDATED"})))
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Always check the network for the Service Worker itself and the app shell.
  // Fall back to the cached version when offline.
  if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/index.html") || url.pathname === "/") {
    event.respondWith(
      fetch(new Request(event.request, {cache:"no-store"}))
        .then(response => {
          if (!response || !response.ok) throw new Error("network response unavailable");
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  // Other assets: network first, cached fallback for offline use.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});