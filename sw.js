const CACHE_NAME = "money-rule-app-v47.25";
const APP_SHELL = ["./", "./index.html", "./style.css?v=47.25", "./app.js?v=47.25", "./manifest.json"];

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
          .replaceAll("Ver.47.14", "Ver.47.25")
          .replaceAll("ver.47.14", "ver.47.25")
          .replaceAll("Ver.47.15", "Ver.47.25")
          .replaceAll("ver.47.15", "ver.47.25")
          .replaceAll("Ver.47.16", "Ver.47.25")
          .replaceAll("ver.47.16", "ver.47.25")
          .replaceAll("Ver.47.17", "Ver.47.25")
          .replaceAll("ver.47.17", "ver.47.25")
          .replaceAll("Ver.47.18", "Ver.47.25")
          .replaceAll("ver.47.18", "ver.47.25")
          .replaceAll("Ver.47.19", "Ver.47.25")
          .replaceAll("ver.47.19", "ver.47.25")
          .replaceAll("Ver.47.20", "Ver.47.25")
          .replaceAll("ver.47.20", "ver.47.25")
          .replaceAll("Ver.47.21", "Ver.47.25")
          .replaceAll("ver.47.21", "ver.47.25")
          .replaceAll("Ver.47.22", "Ver.47.25")
          .replaceAll("ver.47.22", "ver.47.25")
          .replaceAll("Ver.47.23", "Ver.47.25")
          .replaceAll("ver.47.23", "ver.47.25")
          .replaceAll("Ver.47.24", "Ver.47.25")
          .replaceAll("ver.47.24", "ver.47.25")
          .replaceAll("style.css?v=47.20", "style.css?v=47.25")
          .replaceAll("style.css?v=47.21", "style.css?v=47.25")
          .replaceAll("style.css?v=47.22", "style.css?v=47.25")
          .replaceAll("style.css?v=47.23", "style.css?v=47.25")
          .replaceAll("style.css?v=47.24", "style.css?v=47.25")
          .replaceAll("app.js?v=47.20", "app.js?v=47.25")
          .replaceAll("app.js?v=47.21", "app.js?v=47.25")
          .replaceAll("app.js?v=47.22", "app.js?v=47.25")
          .replaceAll("app.js?v=47.23", "app.js?v=47.25")
          .replaceAll("app.js?v=47.24", "app.js?v=47.25");
        output = new Response(patched, {status: response.status, statusText: response.statusText, headers: response.headers});
      } else if (path.endsWith("/style.css")) {
        const text = await response.text();
        const fix = `
/* ver.47.22: カテゴリをさらに右へ移動。列幅・セル幅は変更しない */
@media(max-width:600px){
  .expense-table th:nth-child(3),.expense-table td:nth-child(3){
    position:static!important;
    left:auto!important;
    transform:none!important;
    padding-left:2px!important;
    text-indent:56px!important;
  }
}

/* ver.47.23: 金額列の幅をさらに縮小 */
@media(max-width:600px){
  .expense-table th:nth-child(4),.expense-table td:nth-child(4){
    width:54px!important;
    min-width:54px!important;
    padding-left:0!important;
    padding-right:2px!important;
  }
}

/* ver.47.24: カテゴリ列を広げ、カテゴリ表示が消えないよう修正 */
@media(max-width:600px){
  .expense-table th:nth-child(3),.expense-table td:nth-child(3){
    width:70px!important;
    min-width:70px!important;
    overflow:visible!important;
    text-overflow:clip!important;
  }
}

/* ver.47.25: 金額列を60pxに変更 */
@media(max-width:600px){
  .expense-table th:nth-child(4),.expense-table td:nth-child(4){
    width:60px!important;
    min-width:60px!important;
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
