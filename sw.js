const CACHE_NAME = "money-rule-app-v47.21";
const APP_SHELL = ["./", "./index.html", "./style.css?v=47.21", "./app.js?v=47.21", "./manifest.json"];

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
        const patched = text
          .replaceAll("Ver.47.14", "Ver.47.21")
          .replaceAll("ver.47.14", "ver.47.21")
          .replaceAll("Ver.47.15", "Ver.47.21")
          .replaceAll("ver.47.15", "ver.47.21")
          .replaceAll("Ver.47.16", "Ver.47.21")
          .replaceAll("ver.47.16", "ver.47.21")
          .replaceAll("Ver.47.17", "Ver.47.21")
          .replaceAll("ver.47.17", "ver.47.21")
          .replaceAll("Ver.47.18", "Ver.47.21")
          .replaceAll("ver.47.18", "ver.47.21")
          .replaceAll("Ver.47.19", "Ver.47.21")
          .replaceAll("ver.47.19", "ver.47.21")
          .replaceAll("Ver.47.20", "Ver.47.21")
          .replaceAll("ver.47.20", "ver.47.21")
          .replaceAll("style.css?v=47.10", "style.css?v=47.21")
          .replaceAll("style.css?v=47.15", "style.css?v=47.21")
          .replaceAll("style.css?v=47.16", "style.css?v=47.21")
          .replaceAll("style.css?v=47.17", "style.css?v=47.21")
          .replaceAll("style.css?v=47.18", "style.css?v=47.21")
          .replaceAll("style.css?v=47.19", "style.css?v=47.21")
          .replaceAll("style.css?v=47.20", "style.css?v=47.21")
          .replaceAll("app.js?v=47.14", "app.js?v=47.21")
          .replaceAll("app.js?v=47.15", "app.js?v=47.21")
          .replaceAll("app.js?v=47.16", "app.js?v=47.21")
          .replaceAll("app.js?v=47.17", "app.js?v=47.21")
          .replaceAll("app.js?v=47.18", "app.js?v=47.21")
          .replaceAll("app.js?v=47.19", "app.js?v=47.21")
          .replaceAll("app.js?v=47.20", "app.js?v=47.21");
        output = new Response(patched, {status: response.status, statusText: response.statusText, headers: response.headers});
      } else if (path.endsWith("/style.css")) {
        const text = await response.text();
        const fix = `
/* ver.47.21: 金額列の左余白を減らして金額を左へ寄せる。列幅は変更しない */
@media(max-width:600px){
  .expense-table th:nth-child(4),.expense-table td:nth-child(4){
    padding-left:0!important;
  }
}
`;
        output = new Response(text + fix, {status: response.status, statusText: response.statusText, headers: response.headers});
      }

      const copy = output.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return output;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});
