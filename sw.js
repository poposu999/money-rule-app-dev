const CACHE_NAME = "money-rule-app-v47.50";
const APP_SHELL = ["./", "./index.html", "./style.css?v=47.50", "./app.js?v=47.50", "./manifest.json"];
const TABLE_STYLE = `
/* ver.47.50: restore ver.47.48 table layout + forecast styling and keep edit modal layout */
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
 .expense-table th:nth-child(2),.expense-table td:nth-child(2){width:39%!important;min-width:0!important}
 .expense-table th:nth-child(3),.expense-table td:nth-child(3){width:14%!important;min-width:0!important}
 .expense-table th:nth-child(4),.expense-table td:nth-child(4){width:18%!important;min-width:0!important}
 .expense-table th:nth-child(5),.expense-table td:nth-child(5){width:20%!important;min-width:0!important}
 .expense-table .amount-col{white-space:nowrap!important;text-align:right!important;padding-right:5px!important}
 .expense-table .amount-col strong{font-weight:400!important;white-space:nowrap!important}
 .expense-table .action-col{white-space:nowrap!important;text-align:right!important}
 .expense-table .action-col .expense-actions,.expense-table .action-col .edit-delete-buttons{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:2px!important;flex-wrap:nowrap!important;white-space:nowrap!important}
 .expense-table .action-col button{margin:0!important;padding:3px 3px!important;font-size:8px!important;line-height:1.05!important;min-width:0!important;white-space:nowrap!important}
 .expense-table .confirm-btn,.expense-table .fixed-paid,.expense-table .edit-btn,.expense-table .delete-btn{font-size:8px!important;padding:3px 3px!important;margin-left:2px!important}
}
.expense-table .delete-btn{display:none!important}
.modal-box{box-sizing:border-box!important;max-height:calc(100vh - 32px)!important;overflow-y:auto!important;overflow-x:hidden!important}

.forecast-box{background:#f8f8f8!important;border-radius:10px!important;padding:11px 12px!important}
.forecast-label{font-size:12px!important}
.forecast-box strong{font-size:20px!important;margin-top:3px!important}
.forecast-status{margin-top:6px!important;font-size:12px!important;font-weight:600!important}
.forecast-status.good{color:#18794e!important}
.forecast-status.danger{color:#b42318!important}
.forecast-status.neutral{color:#6b7280!important}

#editModal .modal-actions,#plannedEditModal .modal-actions,#fixedEditModal .modal-actions{display:flex!important;flex-wrap:wrap!important;gap:8px!important}
#editModal #rollbackToPlanned{order:1!important;flex:0 0 100%!important;width:100%!important}
#editModal #deleteEditExpense,#editModal #cancelEdit,#editModal #saveEdit,
#plannedEditModal #deletePlannedEdit,#plannedEditModal #cancelPlannedEdit,#plannedEditModal #savePlannedEdit,
#fixedEditModal #deleteFixedEdit,#fixedEditModal #cancelFixedEdit,#fixedEditModal #saveFixedEdit{order:2!important;flex:1 1 0!important;min-width:0!important;width:auto!important}
#plannedEditModal #deletePlannedEdit,#fixedEditModal #deleteFixedEdit{order:2!important}
#plannedEditModal #cancelPlannedEdit,#fixedEditModal #cancelFixedEdit{order:3!important}
#plannedEditModal #savePlannedEdit,#fixedEditModal #saveFixedEdit{order:4!important}
#editModal #deleteEditExpense{order:2!important}
#editModal #cancelEdit{order:3!important}
#editModal #saveEdit{order:4!important}
`;
const EDIT_MODAL_SCRIPT = `
(function(){
  function init(){
    const $=id=>document.getElementById(id);
    const addDelete=(modalId,afterId,buttonId,label,handler)=>{
      const modal=$(modalId),after=$(afterId);
      if(!modal||!after||$(buttonId))return;
      const b=document.createElement("button");
      b.id=buttonId;b.type="button";b.className="edit-modal-delete-btn";b.textContent=label;
      b.addEventListener("click",handler);
      after.parentNode.insertBefore(b,after);
    };
    addDelete("plannedEditModal","cancelPlannedEdit","deletePlannedEdit","削除",()=>{
      const id=$("plannedEditModal")?.dataset.id;
      if(!id)return;
      if(!confirm("この予定支出を削除しますか？"))return;
      const i=state.plannedExpenses.findIndex(x=>String(x.id)===String(id));
      if(i<0)return;
      state.plannedExpenses.splice(i,1);save();closePlannedEdit();renderPlannedExpenses();calc();
    });
    addDelete("fixedEditModal","cancelFixedEdit","deleteFixedEdit","削除",()=>{
      const id=$("fixedEditModal")?.dataset.id;
      if(!id)return;
      if(!confirm("この固定費の登録を削除しますか？過去に確定した支出は削除されません。"))return;
      const i=state.fixedExpenses.findIndex(x=>String(x.id)===String(id));
      if(i<0)return;
      state.fixedExpenses.splice(i,1);save();closeFixedEdit();renderFixedExpenses();
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
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
        .replace(/style\.css\?v=47\.45/g, "style.css?v=47.50")
        .replace(/style\.css\?v=47\.47/g, "style.css?v=47.50")
        .replace(/style\.css\?v=47\.48/g, "style.css?v=47.50")
        .replace(/style\.css\?v=47\.49/g, "style.css?v=47.50")
        .replace(/app\.js\?v=47\.45/g, "app.js?v=47.50")
        .replace(/app\.js\?v=47\.47/g, "app.js?v=47.50")
        .replace(/app\.js\?v=47\.48/g, "app.js?v=47.50")
        .replace(/app\.js\?v=47\.49/g, "app.js?v=47.50")
        .replace(/ver\.47\.45/g, "ver.47.50")
        .replace(/ver\.47\.46/g, "ver.47.50")
        .replace(/ver\.47\.47/g, "ver.47.50")
        .replace(/ver\.47\.48/g, "ver.47.50")
        .replace(/ver\.47\.49/g, "ver.47.50")
        .replace(/変更を保存/g, "保存")
        .replace(/<\/head>/i, `<style id="ver4750-table-style">${TABLE_STYLE}</style><script id="ver4750-edit-modal-script">${EDIT_MODAL_SCRIPT}</script>\n</head>`);
      output = new Response(patched, {status: response.status, statusText: response.statusText, headers: response.headers});
    }
    const copy = output.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); return output;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
