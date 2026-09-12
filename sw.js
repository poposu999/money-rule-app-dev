const CACHE_NAME = "money-rule-app-v47.30";
const APP_SHELL = ["./", "./index.html", "./style.css?v=47.30", "./app.js?v=47.30", "./manifest.json"];
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
      let patched = text.replace(/Ver\.47\.\d+/g, "Ver.47.30").replace(/ver\.47\.\d+/g, "ver.47.30")
        .replace(/style\.css\?v=47\.\d+/g, "style.css?v=47.30").replace(/app\.js\?v=47\.\d+/g, "app.js?v=47.30");
      patched = patched.replace("</body>", `<script>
document.addEventListener("DOMContentLoaded",function(){
  function adjustCategory(){
    if(window.innerWidth>600)return;
    document.querySelectorAll(".expense-table td:nth-child(3),.expense-table th:nth-child(3)").forEach(function(cell){
      cell.classList.remove("category-tight");
      if(cell.scrollWidth>cell.clientWidth) cell.classList.add("category-tight");
    });
  }
  adjustCategory();
  window.addEventListener("resize",adjustCategory);
});
</script></body>`);
      output = new Response(patched, {status: response.status, statusText: response.statusText, headers: response.headers});
    } else if (path.endsWith("/style.css")) {
      const text = await response.text();
      const fix = `
@media(max-width:600px){
  .expense-table th:nth-child(3),.expense-table td:nth-child(3){
    width:78px!important;min-width:78px!important;max-width:78px!important;
    overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;
    text-indent:0!important;
  }
  .expense-table td:nth-child(3).category-tight,.expense-table th:nth-child(3).category-tight{
    text-indent:15px!important;
  }
}
`;
      output = new Response(text + fix, {status: response.status, statusText: response.statusText, headers: response.headers});
    }
    const copy = output.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); return output;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
