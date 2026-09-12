const CACHE_NAME = "money-rule-app-v47.38";
const APP_SHELL = ["./", "./index.html", "./style.css?v=47.38", "./app.js?v=47.38", "./manifest.json"];
const TABLE_STYLE = `
/* ver.47.38: unified table styling + delete moved into edit modal */
.expense-table{width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;font-size:14px!important}
.expense-table th,.expense-table td{font-size:14px!important;padding:10px 8px!important;border-bottom:1px solid #eee!important;text-align:left!important;vertical-align:middle!important}
.expense-table th{font-size:12px!important;font-weight:600!important;color:#777!important;background:#f8f8f8!important}
.expense-table .amount-col{text-align:right!important;padding-right:5px!important}
.expense-table .action-col{text-align:right!important}
.expense-table .confirm-btn,.expense-table .fixed-paid,.expense-table .edit-btn,.expense-table .delete-btn{box-sizing:border-box!important;min-height:0!important}
@media(max-width:600px){
 .expense-table{width:100%!important;min-width:0!important;table-layout:fixed!important;font-size:10px!important}
 .expense-table th,.expense-table td{font-size:10px!important;padding:3px 2px!important;line-height:1.05!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
 .expense-table th{font-size:10px!important;font-weight:600!important;background:#f8f8f8!important;color:#777!important}
 .expense-table th:nth-child(1),.expense-table td:nth-child(1){width:9%!important;min-width:0!important}
 .expense-table th:nth-child(2),.expense-table td:nth-child(2){width:37%!important;min-width:0!important}
 .expense-table th:nth-child(3),.expense-table td:nth-child(3){width:14%!important;min-width:0!important}
 .expense-table th:nth-child(4),.expense-table td:nth-child(4){width:18%!important;min-width:0!important}
 .expense-table th:nth-child(5),.expense-table td:nth-child(5){width:22%!important;min-width:0!important}
 .expense-table .amount-col{white-space:nowrap!important;text-align:right!important;padding-right:5px!important}
 .expense-table .amount-col strong{font-weight:400!important;white-space:nowrap!important}
 .expense-table .action-col{white-space:nowrap!important;text-align:right!important}
 .expense-table .action-col .expense-actions,.expense-table .action-col .edit-delete-buttons{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:2px!important;flex-wrap:nowrap!important;white-space:nowrap!important}
 .expense-table .action-col button{margin:0!important;padding:3px 3px!important;font-size:8px!important;line-height:1.05!important;min-width:0!important;white-space:nowrap!important}
 .expense-table .confirm-btn,.expense-table .fixed-paid,.expense-table .edit-btn,.expense-table .delete-btn{font-size:8px!important;padding:3px 3px!important;margin-left:2px!important}
}
.expense-table .delete-btn{display:none!important}
.edit-modal-delete-btn{display:block!important;width:100%!important;margin-top:10px!important;padding:9px 12px!important;border:1px solid #ddd!important;border-radius:8px!important;background:#fff!important;color:#c44!important;font-size:14px!important;cursor:pointer!important}
`;
const EDIT_MODAL_SCRIPT = `
(function(){
  function setupDeleteButton(modal){
    if(!modal || !modal.id || !/editModal$/i.test(modal.id)) return;
    if(modal.querySelector('.edit-modal-delete-btn')) return;
    const id=modal.dataset.id;
    if(!id) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='edit-modal-delete-btn';
    btn.textContent='削除';
    btn.addEventListener('click',function(){
      let target=null;
      if(modal.id.toLowerCase().includes('fixed')) target=document.querySelector('.expense-table [data-delete-fixed="'+CSS.escape(String(id))+'"]');
      else if(modal.id.toLowerCase().includes('planned')) target=document.querySelector('.expense-table [data-delete-planned="'+CSS.escape(String(id))+'"]');
      else target=document.querySelector('.expense-table [data-delete="'+CSS.escape(String(id))+'"]');
      if(target) target.click();
      else modal.classList.add('hidden');
    });
    modal.appendChild(btn);
  }
  function scan(){document.querySelectorAll('[id$="EditModal"]').forEach(setupDeleteButton);}
  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-id']});
  scan();
})();
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
        .replace(/style\.css\?v=47\.34/g, "style.css?v=47.38")
        .replace(/app\.js\?v=47\.34/g, "app.js?v=47.38")
        .replace(/ver\.47\.34/g, "ver.47.38")
        .replace(/<\/head>/i, `<style id="ver4738-table-style">${TABLE_STYLE}</style><script id="ver4738-delete-script">${EDIT_MODAL_SCRIPT}</script>\n</head>`);
      output = new Response(patched, {status: response.status, statusText: response.statusText, headers: response.headers});
    }
    const copy = output.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); return output;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
