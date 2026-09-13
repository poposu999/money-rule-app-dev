const CACHE_NAME = "money-rule-app-v47.48";
const APP_SHELL = ["./", "./index.html", "./style.css?v=47.48", "./app.js?v=47.48", "./manifest.json"];
const TABLE_STYLE = `
/* ver.47.48: forecast box styling */
.forecast-box{background:#f8f8f8!important;border-radius:10px!important;padding:11px 12px!important}
.forecast-label{font-size:12px!important}
.forecast-box strong{font-size:20px!important;margin-top:3px!important}
.forecast-status{margin-top:6px!important;font-size:12px!important;font-weight:600!important}
.forecast-status.good{color:#18794e!important}
.forecast-status.danger{color:#b42318!important}
.forecast-status.neutral{color:#6b7280!important}
`;
const EDIT_MODAL_SCRIPT = `
(function(){});
`;
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
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
      const patched = text
        .replace(/style\.css\?v=47\.45/g, "style.css?v=47.48")
        .replace(/style\.css\?v=47\.47/g, "style.css?v=47.48")
        .replace(/app\.js\?v=47\.45/g, "app.js?v=47.48")
        .replace(/app\.js\?v=47\.47/g, "app.js?v=47.48")
        .replace(/ver\.47\.45/g, "ver.47.48")
        .replace(/ver\.47\.46/g, "ver.47.48")
        .replace(/ver\.47\.47/g, "ver.47.48")
        .replace(/変更を保存/g, "保存")
        .replace(/<\/head>/i, `<style id="ver4748-table-style">${TABLE_STYLE}</style><script id="ver4748-delete-script">${EDIT_MODAL_SCRIPT}</script>\n</head>`);
      output = new Response(patched, {status: response.status, statusText: response.statusText, headers: response.headers});
    }
    const copy = output.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); return output;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
