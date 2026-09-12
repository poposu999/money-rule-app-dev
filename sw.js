const CACHE_NAME = "money-rule-app-v47.16";
const APP_SHELL = ["./", "./index.html", "./style.css?v=47.16", "./app.js?v=47.16", "./manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then(async response => {
      if (!response || !response.ok) return response;
      const path = url.pathname;
      let output = response;

      if (path.endsWith("/index.html") || path.endsWith("/")) {
        const text = await response.text();
        const patched = text.replaceAll("ver.47.14", "ver.47.16").replaceAll("style.css?v=47.10", "style.css?v=47.16").replaceAll("app.js?v=47.14", "app.js?v=47.16");
        output = new Response(patched, {status: response.status, statusText: response.statusText, headers: response.headers});
      } else if (path.endsWith("/style.css")) {
        const text = await response.text();
        const fix = `\n/* ver.47.16: カテゴリ見出しの白い隙間を解消し、カテゴリ表示を左寄せ */\n@media(max-width:600px){.expense-table th:nth-child(3),.expense-table td:nth-child(3){position:static!important;left:auto!important;transform:none!important}.expense-table th:nth-child(3){text-indent:-6px!important}.expense-table td:nth-child(3){text-indent:-3px!important}}\n`;
        output = new Response(text + fix, {status: response.status, statusText: response.statusText, headers: response.headers});
      }

      const copy = output.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return output;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});
