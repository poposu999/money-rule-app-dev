const CACHE_NAME = "money-rule-app-v47.69";
const APP_SHELL = ["./","./index.html","./style.css?v=47.69","./app.js?v=47.69","./manifest.json"];

function patchIndexResponse(response) {
  return response.text().then(html => {
    html = html.replace(/ver\.47\.68/g, "ver.47.69");
    html = html.replace(/style\.css\?v=47\.68/g, "style.css?v=47.69");
    html = html.replace(/app\.js\?v=47\.68/g, "app.js?v=47.69");
    html = html.replace(
      '<p>この支出を削除しますか？</p>',
      '<p id="deleteConfirmMessage">この支出を削除しますか？</p>'
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
      .then(() => self.clients.matchAll({type:"window", includeUncontrolled:true}))
      .then(clients => clients.forEach(client => client.postMessage({type:"APP_UPDATED"})))
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