const CACHE_NAME = "money-rule-app-v47.75";
const APP_SHELL = ["./","./index.html","./style.css?v=47.75","./app.js?v=47.75","./manifest.json"];

function patchIndexResponse(response) {
  return response.text().then(html => {
    html = html.replace(/ver\.47\.(68|69|70|71|72|73|74)/g, "ver.47.75");
    html = html.replace(/style\.css\?v=47\.(68|69|70|71|72|73|74)/g, "style.css?v=47.75");
    html = html.replace(/app\.js\?v=47\.(68|69|70|71|72|73|74)/g, "app.js?v=47.75");
    html = html.replace(
      '<p>この支出を削除しますか？</p>',
      '<p id="deleteConfirmMessage">この支出を削除しますか？</p>'
    );
    html = html.replace(
      '</head>',
      `<style id="ver47-75-table-restore">
@media(max-width:600px){
  .expense-table{width:100%!important;min-width:0!important;table-layout:fixed!important}
  .expense-table th:nth-child(1),.expense-table td:nth-child(1){width:9%!important;min-width:0!important}
  .expense-table th:nth-child(2),.expense-table td:nth-child(2){width:37%!important;min-width:0!important}
  .expense-table th:nth-child(3),.expense-table td:nth-child(3){width:14%!important;min-width:0!important}
  .expense-table th:nth-child(4),.expense-table td:nth-child(4){width:18%!important;min-width:0!important}
  .expense-table th:nth-child(5),.expense-table td:nth-child(5){width:22%!important;min-width:0!important}
}
.expense-table .confirm-btn,.expense-table .fixed-paid{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  box-sizing:border-box!important;
  flex:0 0 auto!important;
  min-width:5.8em!important;
  height:auto!important;
  min-height:30px!important;
  margin:0 0 0 5px!important;
  padding:5px 7px!important;
  font-size:11px!important;
  line-height:1.25!important;
  white-space:nowrap!important;
  overflow:visible!important;
}
</style></head>`
    );
    html = html.replace(
      '<script>if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}</script>',
      `<script>
if("serviceWorker" in navigator){
  let reloading=false;
  const updateServiceWorker=async()=>{
    try{
      const registration=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
      await registration.update();
      registration.addEventListener("updatefound",()=>{
        const worker=registration.installing;
        if(!worker)return;
        worker.addEventListener("statechange",()=>{
          if(worker.state==="installed"&&navigator.serviceWorker.controller){
            worker.postMessage({type:"SKIP_WAITING"});
          }
        });
      });
    }catch(e){}
  };
  window.addEventListener("load",updateServiceWorker);
  window.addEventListener("pageshow",updateServiceWorker);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")updateServiceWorker();});
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(reloading)return;
    reloading=true;
    window.location.reload();
  });
}
</script>`
    );
    html = html.replace(
      '</body>',
      `<script>
document.addEventListener("click", event => {
  const button = event.target.closest("#deleteEditExpense");
  if (!button) return;
  const id = document.getElementById("editModal")?.dataset.id;
  const expense = typeof state !== "undefined" && Array.isArray(state.expenses)
    ? state.expenses.find(item => String(item.id) === String(id))
    : null;
  const message = document.getElementById("deleteConfirmMessage");
  if (!message || !expense) return;
  const amount = "¥" + Math.round(Number(expense.amount) || 0).toLocaleString("ja-JP");
  message.textContent = (expense.category || "その他") + "　" + (expense.memo || "メモなし") + "　" + amount + " を削除しますか？";
});
</script></body>`
    );
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  });
}

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
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/index.html") || url.pathname === "/") {
    event.respondWith(
      fetch(new Request(event.request, {cache:"no-store"}))
        .then(response => {
          if (!response || !response.ok) throw new Error("network response unavailable");
          if (url.pathname.endsWith("/sw.js")) return response;
          return patchIndexResponse(response);
        })
        .catch(() => caches.match(event.request).then(cached => {
          if (!cached) return caches.match("./index.html").then(fallback => fallback ? patchIndexResponse(fallback) : Response.error());
          return url.pathname.endsWith("/sw.js") ? cached : patchIndexResponse(cached);
        }))
    );
    return;
  }

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