const CACHE_NAME = "money-rule-app-v47.26";
const APP_SHELL = ["./", "./index.html", "./style.css?v=47.26", "./app.js?v=47.26", "./manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(async response => {
    if (!response || !response.ok) return response;
    const path = url.pathname;
    let output = response;
    if (path.endsWith("/index.html") || path.endsWith("/")) {
      const text = await response.text();
      const patched = text.replace(/Ver\.47\.\d+/g, "Ver.47.26").replace(/ver\.47\.\d+/g, "ver.47.26")
        .replace(/style\.css\?v=47\.\d+/g, "style.css?v=47.26").replace(/app\.js\?v=47\.\d+/g, "app.js?v=47.26");
      output = new Response(patched, {status: response.status, statusText: response.statusText, headers: response.headers});
    } else if (path.endsWith("/style.css")) {
      const text = await response.text();
      const fix = `
/* ver.47.26: カテゴリ文字を少し左へ。列幅70pxは維持 */
@media(max-width:600px){
  .expense-table th:nth-child(3),.expense-table td:nth-child(3){
    text-indent:40px!important;
  }
}
`;
      output = new Response(text + fix, {status: response.status, statusText: response.statusText, headers: response.headers});
    }
    const copy = output.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return output;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
