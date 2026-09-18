// 家計簿 ver.49.07
const LEGACY_DEV_CACHES=new Set(["money-rule-app-v48.01"]);
const DEV_CACHE_PREFIX="money-rule-app-dev-";

self.addEventListener("install",event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>LEGACY_DEV_CACHES.has(key)||key.startsWith(DEV_CACHE_PREFIX)).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(new Request(event.request,{cache:"no-store"})));
});
