const CACHE_NAME = "money-rule-app-v47.76";
const APP_SHELL = ["./","./index.html","./style.css?v=47.76","./app.js?v=47.76","./manifest.json"];

function patchIndexResponse(response) {
  return response.text().then(html => {
    html = html.replace(/ver\.47\.(68|69|70|71|72|73|74|75)/g, "ver.47.76");
    html = html.replace(/style\.css\?v=47\.(68|69|70|71|72|73|74|75)/g, "style.css?v=47.76");
    html = html.replace(/app\.js\?v=47\.(68|69|70|71|72|73|74|75)/g, "app.js?v=47.76");
    html = html.replace(
      '<p>この支出を削除しますか？</p>',
      '<p id="deleteConfirmMessage">この支出を削除しますか？</p>'
    );
    html = html.replace(
      '</head>',
      `<style id="ver47-76-table-unify">
/* 固定費一覧を基準に、3つの一覧テーブルを共通レイアウトへ統一 */
.expense-table,.planned-expense-table,.fixed-expense-table{
  width:100%!important;
  table-layout:fixed!important;
  border-collapse:collapse!important;
  font-size:14px!important;
}
.expense-table th,.expense-table td,
.planned-expense-table th,.planned-expense-table td,
.fixed-expense-table th,.fixed-expense-table td{
  box-sizing:border-box!important;
  padding:10px 8px!important;
  border-bottom:1px solid #eee!important;
  vertical-align:middle!important;
  white-space:nowrap;
  text-align:left;
}
.expense-table th,.planned-expense-table th,.fixed-expense-table th{
  font-size:12px!important;
  color:#777!important;
  font-weight:600!important;
  background:#f8f8f8!important;
}
.expense-table th:nth-child(1),.expense-table td:nth-child(1),
.planned-expense-table th:nth-child(1),.planned-expense-table td:nth-child(1),
.fixed-expense-table th:nth-child(1),.fixed-expense-table td:nth-child(1){width:10%!important}
.expense-table th:nth-child(2),.expense-table td:nth-child(2),
.planned-expense-table th:nth-child(2),.planned-expense-table td:nth-child(2),
.fixed-expense-table th:nth-child(2),.fixed-expense-table td:nth-child(2){width:34%!important;white-space:normal;overflow-wrap:anywhere}
.expense-table th:nth-child(3),.expense-table td:nth-child(3),
.planned-expense-table th:nth-child(3),.planned-expense-table td:nth-child(3),
.fixed-expense-table th:nth-child(3),.fixed-expense-table td:nth-child(3){width:14%!important}
.expense-table th:nth-child(4),.expense-table td:nth-child(4),
.planned-expense-table th:nth-child(4),.planned-expense-table td:nth-child(4),
.fixed-expense-table th:nth-child(4),.fixed-expense-table td:nth-child(4){width:18%!important}
.expense-table th:nth-child(5),.expense-table td:nth-child(5),
.planned-expense-table th:nth-child(5),.planned-expense-table td:nth-child(5),
.fixed-expense-table th:nth-child(5),.fixed-expense-table td:nth-child(5){width:24%!important}
.expense-table .amount-col,.planned-expense-table .amount-col,.fixed-expense-table .amount-col{text-align:right!important;padding-right:8px!important}
.expense-table .action-col,.planned-expense-table .action-col,.fixed-expense-table .action-col{text-align:right!important;white-space:nowrap!important}
.expense-table .edit-delete-buttons,.expense-table .expense-actions,
.planned-expense-table .edit-delete-buttons,.planned-expense-table .expense-actions,
.fixed-expense-table .edit-delete-buttons,.fixed-expense-table .expense-actions{
  display:flex!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:nowrap!important;gap:4px!important;
}
.expense-table .confirm-btn,.expense-table .fixed-paid,.expense-table .edit-btn,.expense-table .delete-btn,
.planned-expense-table .confirm-btn,.planned-expense-table .fixed-paid,.planned-expense-table .edit-btn,.planned-expense-table .delete-btn,
.fixed-expense-table .confirm-btn,.fixed-expense-table .fixed-paid,.fixed-expense-table .edit-btn,.fixed-expense-table .delete-btn{
  display:inline-flex!important;align-items:center!important;justify-content:center!important;
  box-sizing:border-box!important;width:auto!important;height:auto!important;min-height:30px!important;
  margin:0!important;padding:5px 7px!important;font-size:11px!important;line-height:1.25!important;
  border-radius:6px!important;white-space:nowrap!important;overflow:visible!important;flex:0 0 auto!important;
}
@media(max-width:600px){
  .expense-table,.planned-expense-table,.fixed-expense-table{min-width:0!important}
  .expense-table th,.expense-table td,.planned-expense-table th,.planned-expense-table td,.fixed-expense-table th,.fixed-expense-table td{padding:6px 4px!important;font-size:10px!important}
  .expense-table th:nth-child(1),.expense-table td:nth-child(1),.planned-expense-table th:nth-child(1),.planned-expense-table td:nth-child(1),.fixed-expense-table th:nth-child(1),.fixed-expense-table td:nth-child(1){width:10%!important}
  .expense-table th:nth-child(2),.expense-table td:nth-child(2),.planned-expense-table th:nth-child(2),.planned-expense-table td:nth-child(2),.fixed-expense-table th:nth-child(2),.fixed-expense-table td:nth-child(2){width:34%!important}
  .expense-table th:nth-child(3),.expense-table td:nth-child(3),.planned-expense-table th:nth-child(3),.planned-expense-table td:nth-child(3),.fixed-expense-table th:nth-child(3),.fixed-expense-table td:nth-child(3){width:14%!important}
  .expense-table th:nth-child(4),.expense-table td:nth-child(4),.planned-expense-table th:nth-child(4),.planned-expense-table td:nth-child(4),.fixed-expense-table th:nth-child(4),.fixed-expense-table td:nth-child(4){width:18%!important}
  .expense-table th:nth-child(5),.expense-table td:nth-child(5),.planned-expense-table th:nth-child(5),.planned-expense-table td:nth-child(5),.fixed-expense-table th:nth-child(5),.fixed-expense-table td:nth-child(5){width:24%!important}
  .expense-table .confirm-btn,.expense-table .fixed-paid,.expense-table .edit-btn,.expense-table .delete-btn,
  .planned-expense-table .confirm-btn,.planned-expense-table .fixed-paid,.planned-expense-table .edit-btn,.planned-expense-table .delete-btn,
  .fixed-expense-table .confirm-btn,.fixed-expense-table .fixed-paid,.fixed-expense-table .edit-btn,.fixed-expense-table .delete-btn{font-size:8px!important;padding:4px 3px!important;min-height:28px!important}
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