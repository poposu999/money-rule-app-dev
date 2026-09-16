const VERSION="48.14";
const SCHEMA_VERSION=49;
const PROD_STORAGE_KEYS={state:"moneyRuleAppV2",sections:"moneyRuleSectionPrefs",stats:"moneyRuleStatPrefs"};
const LEGACY_STORAGE_KEYS={state:"moneyRuleDevAppV2",sections:"moneyRuleDevSectionPrefs",stats:"moneyRuleDevStatPrefs"};
const STORAGE_KEYS={state:"moneyRuleDevAppV49",sections:"moneyRuleDevSectionPrefs",stats:"moneyRuleDevStatPrefs",initialized:"moneyRuleDevInitialized",migrated:"moneyRuleDevV49Migrated"};
const DEV_BACKUP_KEYS=[STORAGE_KEYS.state,STORAGE_KEYS.sections,STORAGE_KEYS.stats];
const CATEGORIES=["食費","日用品","水光熱費","交通費","美容","医療関係","娯楽","外食","その他"];
const CATEGORY_LABELS={"食費":"🍚 食費","日用品":"🛒 日用品","水光熱費":"💡 水光熱費","交通費":"🚃 交通費","美容":"💇 美容","医療関係":"🏥 医療関係","娯楽":"🎮 娯楽","外食":"🍴 外食","その他":"その他"};
const DEFAULT_MEMORY={expenseCategory:"食費",plannedCategory:"食費",fixedCategory:"",plannedMemo:"",fixedMemo:""};
const $=id=>document.getElementById(id);
const yen=n=>Number.isFinite(Number(n))?"¥"+Math.round(Number(n)).toLocaleString("ja-JP"):"—";
const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));

function initializeDevStorage(){
  if(localStorage.getItem(STORAGE_KEYS.initialized)==="1")return;
  Object.entries(PROD_STORAGE_KEYS).forEach(([name,prodKey])=>{
    const legacyKey=LEGACY_STORAGE_KEYS[name];
    if(localStorage.getItem(legacyKey)!==null)return;
    const value=localStorage.getItem(prodKey);
    if(value!==null)localStorage.setItem(legacyKey,value);
  });
  localStorage.setItem(STORAGE_KEYS.initialized,"1");
}
initializeDevStorage();

function readJson(key,fallback=null){
  try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch{return fallback;}
}
function readJsonStatus(key){
  const raw=localStorage.getItem(key);
  if(raw===null)return {exists:false,value:null,error:null};
  try{return {exists:true,value:JSON.parse(raw),error:null};}
  catch(error){return {exists:true,value:null,error};}
}
function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value));}
function newId(prefix="id"){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}
function pad2(n){return String(n).padStart(2,"0");}
function getToday(){const d=new Date();return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;}
function currentMonthKey(){return getToday().slice(0,7);}
function validMonthKey(key){return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(key||""));}
function isValidDateString(value){
  const s=String(value||"");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const [y,m,d]=s.split("-").map(Number);
  const dt=new Date(y,m-1,d);
  return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;
}
function monthOfDate(date){return isValidDateString(date)?String(date).slice(0,7):"";}
function monthParts(key){const [y,m]=String(key).split("-").map(Number);return {y,m};}
function monthLabel(key){const {y,m}=monthParts(key);return `${y}年${m}月`;}
function shortMonthLabel(key){return `${monthParts(key).m}月`;}
function addMonths(key,delta){const {y,m}=monthParts(key);const d=new Date(y,m-1+delta,1);return `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;}
function compareMonth(a,b){return String(a).localeCompare(String(b));}
function daysInMonth(key){const {y,m}=monthParts(key);return new Date(y,m,0).getDate();}
function firstDayOfMonth(key){return `${key}-01`;}
function lastDayOfMonth(key){return `${key}-${pad2(daysInMonth(key))}`;}
function maxFutureMonth(){return addMonths(currentMonthKey(),12);}
function monthWithinAllowedRange(key){return validMonthKey(key)&&compareMonth(key,maxFutureMonth())<=0;}
function escapeHtml(str){return String(str??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function formatExpenseDate(date){if(!isValidDateString(date))return String(date||"");const [,m,d]=String(date).split("-");return `${Number(m)}/${Number(d)}`;}
function samePlainObject(a,b){return JSON.stringify(a)===JSON.stringify(b);}

function createEmptyState(){return {schemaVersion:SCHEMA_VERSION,months:{},expenses:[],plannedExpenses:[],fixedExpenses:[],memory:clone(DEFAULT_MEMORY),meta:{createdAt:new Date().toISOString(),migratedFrom:null}};}
function createMonthRecord(settings=null,inheritedFrom=null){return {income:{entered:false,value:0},bonus:{entered:false,value:0},settings:settings?clone(settings):null,inheritedFrom:inheritedFrom||null,createdAt:new Date().toISOString()};}
function normalizeSettings(s){
  if(!s||typeof s!=="object")return null;
  const minimumTakeHome=Math.max(0,Number(s.minimumTakeHome)||0);
  const savingsTarget=Math.max(0,Number(s.savingsTarget)||0);
  const extraAllowancePercent=Math.min(100,Math.max(0,Number(s.extraAllowancePercent)||0));
  const extraSavingsPercent=Math.min(100,Math.max(0,Number(s.extraSavingsPercent)||0));
  return {minimumTakeHome,savingsTarget,extraAllowancePercent,extraSavingsPercent};
}
function normalizeCurrentState(raw){
  const s=raw&&typeof raw==="object"?raw:createEmptyState();
  if(Number(s.schemaVersion)!==SCHEMA_VERSION)return null;
  s.months=s.months&&typeof s.months==="object"?s.months:{};
  s.expenses=Array.isArray(s.expenses)?s.expenses:[];
  s.plannedExpenses=Array.isArray(s.plannedExpenses)?s.plannedExpenses:[];
  s.fixedExpenses=Array.isArray(s.fixedExpenses)?s.fixedExpenses:[];
  s.memory={...DEFAULT_MEMORY,...(s.memory||{})};
  for(const [key,rec] of Object.entries(s.months)){
    if(!validMonthKey(key)||!rec||typeof rec!=="object")continue;
    rec.income={entered:Boolean(rec.income?.entered),value:Math.max(0,Number(rec.income?.value)||0)};
    rec.bonus={entered:Boolean(rec.bonus?.entered),value:Math.max(0,Number(rec.bonus?.value)||0)};
    rec.settings=normalizeSettings(rec.settings);
  }
  s.expenses=s.expenses.filter(Boolean).map(e=>({...e,id:String(e.id||newId("e")),amount:Math.max(0,Number(e.amount)||0),category:String(e.category||"未設定"),memo:String(e.memo||""),date:String(e.date||""),order:Number.isFinite(Number(e.order))?Number(e.order):Date.now(),origin:e.origin&&typeof e.origin==="object"?e.origin:null}));
  s.plannedExpenses=s.plannedExpenses.filter(Boolean).map(p=>({...p,id:String(p.id||newId("p")),amount:Math.max(0,Number(p.amount)||0),category:String(p.category||"未設定"),memo:String(p.memo||""),date:String(p.date||""),order:Number.isFinite(Number(p.order))?Number(p.order):Date.now(),status:p.status==="confirmed"?"confirmed":"pending",confirmedExpenseId:p.confirmedExpenseId?String(p.confirmedExpenseId):null}));
  s.fixedExpenses=s.fixedExpenses.filter(Boolean).map(f=>({...f,id:String(f.id||newId("f")),startMonth:String(f.startMonth||currentMonthKey()),endMonth:f.endMonth?String(f.endMonth):null,changes:Array.isArray(f.changes)?f.changes:[],paidMonths:f.paidMonths&&typeof f.paidMonths==="object"?f.paidMonths:{},needsReview:Boolean(f.needsReview)}));
  return s;
}

let state=null;
let selectedMonth=currentMonthKey();
let lastKnownToday=getToday();
let dirtyAreas=new Set();
let suppressDirty=false;
let pendingDelete=null;
let selectedPickerYear=new Date().getFullYear();
let earliestPickerYear=selectedPickerYear-10;
let migrationBackupReady=false;
let appConfirmResolver=null;
const sessionDates={expense:new Map(),planned:new Map()};

function save(){if(state)writeJson(STORAGE_KEYS.state,state);}
function nearestPriorSettings(key){
  if(!state)return null;
  const candidates=Object.keys(state.months).filter(k=>validMonthKey(k)&&compareMonth(k,key)<0&&state.months[k]?.settings).sort().reverse();
  if(!candidates.length)return null;
  return {settings:clone(state.months[candidates[0]].settings),from:candidates[0]};
}
function ensureMonthRecord(key,{saveNow=true}={}){
  if(!state||!validMonthKey(key))return null;
  if(state.months[key])return state.months[key];
  const inherited=nearestPriorSettings(key);
  state.months[key]=createMonthRecord(inherited?.settings||null,inherited?.from||null);
  if(saveNow)save();
  return state.months[key];
}
function selectedRecord(){return ensureMonthRecord(selectedMonth);}
function isCurrentSelected(){return selectedMonth===currentMonthKey();}
function isPastSelected(){return compareMonth(selectedMonth,currentMonthKey())<0;}
function isFutureSelected(){return compareMonth(selectedMonth,currentMonthKey())>0;}
function monthExpenses(key=selectedMonth){return state.expenses.filter(e=>monthOfDate(e.date)===key);}
function monthPendingPlanned(key=selectedMonth){return state.plannedExpenses.filter(p=>p.status!=="confirmed"&&monthOfDate(p.date)===key);}
function getPlannedSource(id){return state.plannedExpenses.find(p=>String(p.id)===String(id));}
function getFixedSource(id){return state.fixedExpenses.find(f=>String(f.id)===String(id));}

function normalizeDue(due,legacyDay=null){
  if(due&&due.type==="eom")return {type:"eom"};
  if(due&&due.type==="day"&&Number(due.day)>=1&&Number(due.day)<=31)return {type:"day",day:Math.round(Number(due.day))};
  if(Number(legacyDay)>=1&&Number(legacyDay)<=31)return {type:"day",day:Math.round(Number(legacyDay))};
  return null;
}
function configForFixedMonth(f,key){
  if(!f||!validMonthKey(key)||compareMonth(key,f.startMonth)<0)return null;
  if(f.endMonth&&compareMonth(key,f.endMonth)>=0)return null;
  const changes=(Array.isArray(f.changes)?f.changes:[]).filter(c=>validMonthKey(c.effectiveMonth)&&compareMonth(c.effectiveMonth,key)<=0).sort((a,b)=>compareMonth(a.effectiveMonth,b.effectiveMonth));
  if(!changes.length)return null;
  const c=changes[changes.length-1];
  return {amount:Math.max(0,Number(c.amount)||0),category:String(c.category||""),memo:String(c.memo||""),due:normalizeDue(c.due,c.day),effectiveMonth:c.effectiveMonth};
}
function fixedDueDate(f,key,config=configForFixedMonth(f,key)){
  if(!config||!config.due)return "";
  const last=daysInMonth(key);
  const day=config.due.type==="eom"?last:Math.min(last,Math.max(1,Number(config.due.day)||1));
  return `${key}-${pad2(day)}`;
}
function fixedPaidInfo(f,key){const info=f?.paidMonths?.[key];return info&&typeof info==="object"?info:null;}
function fixedIsPaid(f,key){return Boolean(fixedPaidInfo(f,key));}
function effectiveFixedEntries(key=selectedMonth){
  return state.fixedExpenses.map(f=>{const config=configForFixedMonth(f,key);if(!config)return null;return {fixed:f,config,date:fixedDueDate(f,key,config),paid:fixedIsPaid(f,key)};}).filter(Boolean).sort((a,b)=>String(a.date).localeCompare(String(b.date))||(Number(a.fixed.order)||0)-(Number(b.fixed.order)||0));
}
function unpaidFixedEntries(key=selectedMonth){return effectiveFixedEntries(key).filter(x=>!x.paid&&x.config.due);}
function sourceRelationIntact(expense){
  const o=expense?.origin;if(!o)return false;
  if(o.type==="planned")return Boolean(getPlannedSource(o.sourceId));
  if(o.type==="fixed")return Boolean(getFixedSource(o.sourceId));
  return false;
}
function expenseOriginType(expense){return sourceRelationIntact(expense)?expense.origin.type:null;}

function getBudgetData(key=selectedMonth){
  const rec=state.months[key]||null;
  const settings=rec?.settings||null;
  const incomeEntered=Boolean(rec?.income?.entered);
  const income=incomeEntered?Math.max(0,Number(rec.income.value)||0):0;
  const bonus=rec?.bonus?.entered?Math.max(0,Number(rec.bonus.value)||0):0;
  const actual=monthExpenses(key);
  const planned=monthPendingPlanned(key);
  const unpaidFixed=unpaidFixedEntries(key);
  const spent=actual.reduce((a,e)=>a+Number(e.amount||0),0);
  const plannedAmount=planned.reduce((a,e)=>a+Number(e.amount||0),0);
  const unpaidFixedAmount=unpaidFixed.reduce((a,x)=>a+Number(x.config.amount||0),0);
  const derivedActual=actual.filter(e=>["planned","fixed"].includes(expenseOriginType(e))).reduce((a,e)=>a+Number(e.amount||0),0);
  const freeSpend=actual.filter(e=>!expenseOriginType(e)).reduce((a,e)=>a+Number(e.amount||0),0);
  if(!settings||!incomeEntered)return {rec,settings,incomeEntered,income,bonus,totalIncome:income+bonus,actual,planned,unpaidFixed,spent,plannedAmount,unpaidFixedAmount,derivedActual,freeSpend,calculable:false};
  const totalIncome=income+bonus;
  const minimum=Math.max(0,Number(settings.minimumTakeHome)||0),target=Math.max(0,Number(settings.savingsTarget)||0);
  const allowancePct=Math.min(100,Math.max(0,Number(settings.extraAllowancePercent)||0));
  const savingsPct=Math.min(100,Math.max(0,Number(settings.extraSavingsPercent)||0));
  const extra=Math.max(0,totalIncome-minimum),extraSavings=extra*savingsPct/100,plannedSavings=target+extraSavings;
  const spendingBudget=totalIncome-plannedSavings;
  const remaining=spendingBudget-spent-plannedAmount-unpaidFixedAmount;
  const committed=plannedAmount+unpaidFixedAmount+derivedActual;
  const freeBudget=spendingBudget-committed;
  return {rec,settings,incomeEntered,income,bonus,totalIncome,minimum,target,allowancePct,savingsPct,extra,extraSavings,plannedSavings,spendingBudget,actual,planned,unpaidFixed,spent,plannedAmount,unpaidFixedAmount,remaining,derivedActual,freeSpend,committed,freeBudget,calculable:true};
}

function hasUnresolvedMonthData(key){return monthPendingPlanned(key).length>0||unpaidFixedEntries(key).length>0;}

function buildCategoryControls(){
  const targets=[{quick:"categoryQuick",select:"expenseCategory",allowBlank:false},{quick:"plannedCategoryQuick",select:"plannedCategory",allowBlank:false},{quick:"fixedCategoryQuick",select:"fixedCategory",allowBlank:true}];
  targets.forEach(t=>{
    const select=$(t.select),quick=$(t.quick);if(!select||!quick)return;
    select.innerHTML=(t.allowBlank?'<option value="">選択してください</option>':'')+CATEGORIES.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    quick.innerHTML=CATEGORIES.map(c=>`<button type="button" data-category="${escapeHtml(c)}">${escapeHtml(CATEGORY_LABELS[c]||c)}</button>`).join("");
    quick.addEventListener("click",ev=>{const b=ev.target.closest("[data-category]");if(!b)return;select.value=b.dataset.category;quick.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));markDirty(quick.closest("[data-dirty-area]")?.dataset.dirtyArea);});
  });
  ["editCategory","plannedEditCategory","fixedEditCategory"].forEach(id=>{const el=$(id);if(el)el.innerHTML=CATEGORIES.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")+`<option value="未設定">未設定</option>`;});
}
function buildDueSelect(id){
  const el=$(id);if(!el)return;
  el.innerHTML='<option value="">選択してください</option>'+Array.from({length:31},(_,i)=>`<option value="day:${i+1}">${i+1}日</option>`).join("")+'<option value="eom">月末</option>';
}
function dueToValue(due){return due?.type==="eom"?"eom":due?.type==="day"?`day:${due.day}`:"";}
function valueToDue(value){if(value==="eom")return {type:"eom"};const m=String(value||"").match(/^day:(\d{1,2})$/);if(m&&Number(m[1])>=1&&Number(m[1])<=31)return {type:"day",day:Number(m[1])};return null;}
function syncQuickSelection(quickId,selectId){const quick=$(quickId),select=$(selectId);if(!quick||!select)return;quick.querySelectorAll("button").forEach(b=>b.classList.toggle("selected",b.dataset.category===select.value));}

function markDirty(area){if(!suppressDirty&&area)dirtyAreas.add(area);}
function clearDirty(area){dirtyAreas.delete(area);}
function clearAllDirty(){dirtyAreas.clear();}
function hasUnsavedChanges(){return dirtyAreas.size>0;}
function closeAppConfirm(result=false){
  $("appConfirmModal")?.classList.add("hidden");
  const resolve=appConfirmResolver;appConfirmResolver=null;
  if(resolve)resolve(Boolean(result));
}
function appConfirm(message,{title="確認",confirmText="実行する",danger=false}={}){
  if(appConfirmResolver)closeAppConfirm(false);
  const text=String(message||"");
  setText("appConfirmTitle",title);setText("appConfirmMessage",text);
  const accept=$("acceptAppConfirm");
  if(accept){
    if(confirmText==="実行する"&&text.includes("支出に確定"))accept.textContent="支出に確定";
    else if(confirmText==="実行する"&&text.includes("未払いへ戻"))accept.textContent="未払いに戻す";
    else if(confirmText==="実行する"&&text.includes("予定支出へ戻"))accept.textContent="予定支出に戻す";
    else accept.textContent=confirmText;
    accept.classList.toggle("danger-btn",Boolean(danger||/削除|破棄|未払いへ戻|予定支出へ戻/.test(text)));
  }
  $("appConfirmModal")?.classList.remove("hidden");
  return new Promise(resolve=>{appConfirmResolver=resolve;});
}
function bindDirtyTracking(){
  document.addEventListener("input",e=>{const area=e.target.closest?.("[data-dirty-area]")?.dataset.dirtyArea;if(area)markDirty(area);});
  document.addEventListener("change",e=>{const area=e.target.closest?.("[data-dirty-area]")?.dataset.dirtyArea;if(area)markDirty(area);});
}
async function confirmDiscardUnsaved(){return !hasUnsavedChanges()||await appConfirm("保存されていない変更があります。入力内容を破棄して月を移動しますか？");}

function sessionDefaultDate(type,key=selectedMonth){
  const mem=sessionDates[type];if(mem?.has(key))return mem.get(key);
  return key===currentMonthKey()?getToday():firstDayOfMonth(key);
}
function rememberSessionDate(type,date){if(isValidDateString(date))sessionDates[type].set(monthOfDate(date),date);}
function dateAllowed(date){const key=monthOfDate(date);return Boolean(key)&&monthWithinAllowedRange(key);}
async function confirmCrossMonth(source,dest,kind="項目"){
  if(source===dest)return true;
  return await appConfirm(`${kind}の日付を別の月へ変更します。\n\n${monthLabel(source)} → ${monthLabel(dest)}\n\n${monthLabel(dest)}のデータとして保存します。続行しますか？`);
}

function setText(id,text){const el=$(id);if(el)el.textContent=text;}
function setHidden(id,hidden){$(id)?.classList.toggle("hidden",Boolean(hidden));}
function contextTitle(base){return isCurrentSelected()?`今月の${base}`:`${monthLabel(selectedMonth)}の${base}`;}
function updateDynamicTitles(){
  setText("budgetTitle",contextTitle("予算"));setText("expenseListTitle",contextTitle("支出"));setText("plannedListTitle",contextTitle("予定支出"));setText("statsTitle",contextTitle("内訳"));
  setText("expenseEntryHeading",isCurrentSelected()?"今月の支出を追加":`${monthLabel(selectedMonth)}の支出を追加`);
  setText("plannedEntryHeading",isCurrentSelected()?"今月の予定支出を追加":`${monthLabel(selectedMonth)}の予定支出を追加`);
  setText("fixedEntryHeading",isCurrentSelected()?"今月から固定費を開始":`${monthLabel(selectedMonth)}から固定費を開始`);
  setText("spendingBudgetLabel","予算");
  setText("spentAmountLabel","使った金額");
  setText("plannedExpenseLabel","予定支出");
  setText("fixedPendingLabel","未払い固定費");
  setText("plannedSavingsLabel","貯金予定");
  setText("incomeTitle",`${monthLabel(selectedMonth)}で使う前月の収入`);
  setText("settingsTitle",`${monthLabel(selectedMonth)}の家計ルール`);
}

function loadMonthForms(){
  const rec=selectedRecord();suppressDirty=true;
  $("income").value=rec.income.entered?String(rec.income.value):"";
  $("bonus").value=rec.bonus.entered?String(rec.bonus.value):"";
  const s=rec.settings;
  $("minimumTakeHome").value=s?String(s.minimumTakeHome):"";$("savingsTarget").value=s?String(s.savingsTarget):"";$("extraAllowancePercent").value=s?String(s.extraAllowancePercent):"";$("extraSavingsPercent").value=s?String(s.extraSavingsPercent):"";
  setHidden("settingsMissing",Boolean(s));
  $("expenseAmount").value="";$("expenseMemo").value="";$("expenseDate").value=sessionDefaultDate("expense");
  $("plannedAmount").value="";$("plannedMemo").value="";$("plannedDate").value=sessionDefaultDate("planned");
  $("fixedAmount").value="";$("fixedMemo").value="";$("fixedDue").value="";
  $("expenseCategory").value=state.memory.expenseCategory||"食費";$("plannedCategory").value=state.memory.plannedCategory||"食費";$("fixedCategory").value=state.memory.fixedCategory||"";
  syncQuickSelection("categoryQuick","expenseCategory");syncQuickSelection("plannedCategoryQuick","plannedCategory");syncQuickSelection("fixedCategoryQuick","fixedCategory");
  suppressDirty=false;clearAllDirty();
}
function resetEntryTab(){document.querySelectorAll("[data-entry-tab]").forEach(t=>{const active=t.dataset.entryTab==="expense";t.classList.toggle("active",active);t.setAttribute("aria-selected",active?"true":"false");});document.querySelectorAll("[data-entry-panel]").forEach(p=>p.classList.toggle("active",p.dataset.entryPanel==="expense"));}
function closeAllEditModals(){["editModal","plannedEditModal","fixedEditModal","deleteConfirmModal"].forEach(id=>$(id)?.classList.add("hidden"));pendingDelete=null;}
async function switchMonth(next,{force=false}={}){
  if(!monthWithinAllowedRange(next))return;
  if(!force&&!(await confirmDiscardUnsaved()))return;
  selectedMonth=next;ensureMonthRecord(selectedMonth);closeAllEditModals();resetEntryTab();updateDynamicTitles();loadMonthForms();renderAll();window.scrollTo({top:0,behavior:"auto"});
}

function renderMonthNavigation(){
  setText("selectedMonthLabel",monthLabel(selectedMonth));
  setHidden("returnCurrentMonth",isCurrentSelected());
  $("nextMonth").disabled=compareMonth(selectedMonth,maxFutureMonth())>=0;
  const warnings=[];
  if(isPastSelected()&&hasUnresolvedMonthData(selectedMonth))warnings.push("この月には未処理の予定支出または未払い固定費があります。");
  if(isFutureSelected()&&!selectedRecord().income.entered)warnings.push("収入未入力");
  const el=$("monthContextWarning");if(warnings.length){el.textContent=warnings.join(" ");el.classList.remove("hidden");}else el.classList.add("hidden");
}
function renderMonthPicker(){
  const currentYear=new Date().getFullYear();
  const maxYear=monthParts(maxFutureMonth()).y;
  const yearList=$("yearList");
  const years=[];for(let y=maxYear;y>=earliestPickerYear;y--)years.push(y);
  yearList.innerHTML=years.map(y=>`<button type="button" class="year-btn${y===selectedPickerYear?' active':''}" data-year="${y}">${y}年${y===currentYear?'<small>今年</small>':''}</button>`).join("");
  renderMonthGrid(selectedPickerYear);
}
function renderMonthGrid(year){
  selectedPickerYear=Number(year);const grid=$("monthGrid");const cur=currentMonthKey();
  grid.innerHTML=Array.from({length:12},(_,i)=>{const key=`${year}-${pad2(i+1)}`,disabled=!monthWithinAllowedRange(key),markers=[];if(key===cur)markers.push('<span class="month-marker current">今月</span>');if(hasUnresolvedMonthData(key))markers.push('<span class="month-marker warn">未処理</span>');if(compareMonth(key,cur)>0&&(!state.months[key]||!state.months[key].income?.entered))markers.push('<span class="month-marker noincome">収入未入力</span>');return `<button type="button" class="month-choice${key===selectedMonth?' active':''}" data-month="${key}" ${disabled?'disabled':''}><strong>${i+1}月</strong><span class="month-marker-row">${markers.join("")}</span></button>`;}).join("");
  $("yearList").querySelectorAll(".year-btn").forEach(b=>b.classList.toggle("active",Number(b.dataset.year)===selectedPickerYear));
}

function renderBudgetDashboard(){
  const n=getBudgetData(selectedMonth),past=isPastSelected(),future=isFutureSelected();
  setText("spentAmountView",yen(n.spent));setText("plannedExpenseView",yen(n.plannedAmount));setText("fixedPendingView",yen(n.unpaidFixedAmount));setText("incomeView",n.rec?.income?.entered?yen(n.rec.income.value):"未入力");
  const dailyWrap=$("dashboardDailyWrap"),todayLabel=$("todayLabel"),paceScale=$("paceScale");
  if(past&&(!n.settings||!n.incomeEntered)){
    setText("dashboardRemaining","未計算");setText("dashboardRemainingNote","過去月の予算は未計算");setText("dashboardDailyBudget","未計算");setText("dashboardDailyDays","");setText("spendingBudget","未計算");setText("plannedSavings","未計算");setText("extraIncome","未計算");setText("budgetLimitValue","—");setText("budgetSpentValue",yen(n.spent+n.plannedAmount+n.unpaidFixedAmount));setText("dashboardStatusLabel","未計算");setText("dashboardStatusMessage","この月は予算計算に必要な情報が未設定です。");$("dashboardStatus").className="budget-status neutral";dailyWrap.classList.add("hidden");todayLabel.classList.add("hidden");renderPaceTimeline(null,null);return;
  }
  if(!n.settings){
    setText("dashboardRemaining","未計算");setText("dashboardRemainingNote","家計ルールを入力してください");setText("dashboardDailyBudget","未計算");setText("dashboardDailyDays","");setText("spendingBudget","未計算");setText("plannedSavings","未計算");setText("extraIncome","未計算");setText("budgetLimitValue","—");setText("budgetSpentValue",yen(n.spent));setText("dashboardStatusLabel","家計ルール未設定");setText("dashboardStatusMessage","家計ルールを入力してください。");$("dashboardStatus").className="budget-status neutral";dailyWrap.classList.toggle("hidden",past);todayLabel.classList.add("hidden");renderPaceTimeline(null,null);return;
  }
  if(!n.incomeEntered){
    setText("dashboardRemaining","収入を入力してください");setText("dashboardRemainingNote","収入を入力してください");setText("dashboardDailyBudget","未計算");setText("dashboardDailyDays","");setText("spendingBudget","未計算");setText("plannedSavings","未計算");setText("extraIncome","未計算");setText("budgetLimitValue","—");setText("budgetSpentValue",yen(n.spent));setText("dashboardStatusLabel",future?"収入未入力":"収入を入力してください");setText("dashboardStatusMessage",future?"収入入力後に予測します。":"予算結果は収入入力後に計算します。");$("dashboardStatus").className="budget-status neutral";dailyWrap.classList.toggle("hidden",past);todayLabel.classList.add("hidden");renderPaceTimeline(null,null);return;
  }
  setText("spendingBudget",yen(n.spendingBudget));setText("plannedSavings",yen(n.plannedSavings));setText("extraIncome",yen(n.extra));setText("dashboardRemaining",yen(n.remaining));
  let note="現在の残り予算";if(n.plannedAmount&&n.unpaidFixedAmount)note=`（予定支出 ${yen(n.plannedAmount)}・未払い固定費 ${yen(n.unpaidFixedAmount)} を差し引き済み）`;else if(n.plannedAmount)note=`（予定支出 ${yen(n.plannedAmount)} を差し引き済み）`;else if(n.unpaidFixedAmount)note=`（未払い固定費 ${yen(n.unpaidFixedAmount)} を差し引き済み）`;setText("dashboardRemainingNote",note);
  const setPaceMeter=(used,limit)=>{const raw=limit>0?used/limit*100:used>0?100:0,pct=Math.max(0,Math.min(100,Number.isFinite(raw)?raw:0));setText("budgetLimitValue",yen(limit));setText("budgetSpentValue",yen(used));$("budgetProgressBar").style.width=pct+"%";const pos=$("budgetSpentPosition");pos.style.left=pct+"%";pos.className=`pace-spent-position${pct<10?' left-edge':pct>90?' right-edge':''}`;};
  if(past){setPaceMeter(n.spent+n.plannedAmount+n.unpaidFixedAmount,n.spendingBudget);dailyWrap.classList.add("hidden");todayLabel.classList.add("hidden");renderPaceTimeline(null,null);const used=n.spent+n.plannedAmount+n.unpaidFixedAmount,over=used>n.spendingBudget;setText("dashboardStatusLabel",over?"予算超過":"予算内");setText("dashboardStatusMessage",over?`予算を${yen(used-n.spendingBudget)}超えています。`:"現在の登録内容は予算内です。");$("dashboardStatus").className=`budget-status ${over?'danger':'good'}`;return;}
  dailyWrap.classList.remove("hidden");
  if(future){setPaceMeter(n.spent+n.plannedAmount+n.unpaidFixedAmount,n.spendingBudget);todayLabel.classList.add("hidden");renderPaceTimeline(null,null);const days=daysInMonth(selectedMonth);setText("dashboardDailyBudget",`${yen(n.remaining/days)} / 日`);setText("dashboardDailyDays",`（${days}日間）`);const used=n.spent+n.plannedAmount+n.unpaidFixedAmount,over=used>n.spendingBudget;if(used===0){setText("dashboardStatusLabel","予算内");setText("dashboardStatusMessage","現時点の支出予定はありません");$("dashboardStatus").className="budget-status good";}else{setText("dashboardStatusLabel",over?"予算超過":"予算内");setText("dashboardStatusMessage",over?`予定を含めると予算を${yen(used-n.spendingBudget)}超えます。`:"実支出・予定支出・未払い固定費を含めても予算内です。");$("dashboardStatus").className=`budget-status ${over?'danger':'good'}`;}return;}
  const meterUsed=n.spent+n.plannedAmount+n.unpaidFixedAmount;setPaceMeter(meterUsed,n.spendingBudget);
  const today=new Date(),last=daysInMonth(selectedMonth),day=today.getDate(),remainingDays=last-day+1;setText("dashboardDailyBudget",`${yen(n.remaining/Math.max(1,remainingDays))} / 日`);setText("dashboardDailyDays",`（残り${remainingDays}日）`);todayLabel.classList.remove("hidden");renderPaceTimeline(day,last);
  let level="good",label="順調なペース この調子！",msg="自由に使える予算内のペースです。";
  if(n.freeBudget<0){level="danger";label="予定支出を含めると予算超過です";msg=`確保済み支出だけで予算を${yen(Math.abs(n.freeBudget))}超えています。`;}
  else if(n.freeBudget===0){level="warning";label="予定している支出だけで予算上限に達しています";msg="自由に使える予算は残っていません。";}
  else if(n.freeSpend>n.freeBudget){level="danger";label="自由に使える予算を超過しています";msg=`自由支出が予算を${yen(n.freeSpend-n.freeBudget)}超えています。`;}
  else if(n.freeSpend>0){const projected=n.freeSpend/Math.max(1,day)*last;if(projected>n.freeBudget){level="warning";label="使いすぎ注意";msg=`このペースだと自由支出が月末に${yen(projected-n.freeBudget)}予算を超える見込みです。`;}}
  setText("dashboardStatusLabel",label);setText("dashboardStatusMessage",msg);$("dashboardStatus").className=`budget-status ${level}`;
}
function renderPaceTimeline(day,last){const labels=$("progressTimelineLabels");if(!labels)return;if(!day||!last){labels.innerHTML="";return;}const vals=[0,10,20,last];labels.innerHTML=vals.map((v,i)=>`<span class="timeline-label timeline-label-${i}" style="left:${Math.min(100,Math.max(0,v/last*100))}%">${i===3?'月末':v+'日'}</span>`).join("");const pct=Math.min(100,Math.max(0,day/last*100));$("todayLabel").style.left=pct+"%";$("todayLabel").className=`today-label${pct<8?' left-edge':pct>92?' right-edge':''}`;}
function renderValidation(){const n=getBudgetData(selectedMonth),el=$("inputValidation"),issues=[];if(!n.settings){el.classList.add("hidden");return;}if(n.settings.extraAllowancePercent+n.settings.extraSavingsPercent!==100)issues.push(`超過分の割合が合計${n.settings.extraAllowancePercent+n.settings.extraSavingsPercent}%です（100%にしてください）`);if(n.calculable&&n.plannedSavings>n.totalIncome)issues.push(`貯金予定${yen(n.plannedSavings)}が総収入${yen(n.totalIncome)}を上回っています`);if(n.settings.minimumTakeHome<n.settings.savingsTarget)issues.push(`最低限の手取り${yen(n.settings.minimumTakeHome)}より貯金目標${yen(n.settings.savingsTarget)}のほうが大きくなっています`);if(!issues.length){el.classList.add("hidden");return;}el.textContent="⚠️ "+issues.join(" / ");el.className="validation-warning";}

function rowHtml(item,kind){
  const memo=item.memo?escapeHtml(item.memo):'<span class="muted">—</span>',category=escapeHtml(item.category||"未設定"),amount=yen(item.amount),date=escapeHtml(formatExpenseDate(item.date));
  let actions="";if(kind==="expense")actions=`<button type="button" class="edit-btn" data-edit="${escapeHtml(item.id)}">編集</button>`;if(kind==="planned")actions=`<button type="button" class="confirm-btn" data-confirm-planned="${escapeHtml(item.id)}">支出に確定</button><button type="button" class="edit-btn" data-edit-planned="${escapeHtml(item.id)}">編集</button>`;
  return `<tr><td>${date}</td><td class="memo-cell" data-memo="${escapeHtml(item.memo||'')}">${memo}</td><td>${category}</td><td class="amount-col"><strong>${amount}</strong></td><td class="action-col"><div class="table-actions">${actions}</div></td></tr>`;
}
function tableHtml(rows){return `<table class="expense-table"><thead><tr><th>日付</th><th>メモ</th><th>カテゴリ</th><th class="amount-col">金額</th><th class="action-col"></th></tr></thead><tbody>${rows.join("")}</tbody></table>`;}
function renderExpenses(){const es=monthExpenses(selectedMonth).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||(Number(a.order)||0)-(Number(b.order)||0));setText("expenseTotal",`合計：${yen(es.reduce((s,e)=>s+e.amount,0))}`);$("expenseList").innerHTML=es.length?tableHtml(es.map(e=>rowHtml(e,"expense"))):'<div class="muted expense-empty">まだ支出はありません。</div>';}
function renderPlannedExpenses(){const ps=monthPendingPlanned(selectedMonth).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||(Number(a.order)||0)-(Number(b.order)||0));setText("plannedTotal",`合計：${yen(ps.reduce((s,e)=>s+e.amount,0))}`);$("plannedList").innerHTML=ps.length?tableHtml(ps.map(p=>rowHtml(p,"planned"))):'<div class="muted expense-empty">予定支出はありません。</div>';}
function renderFixedExpenses(){
  const entries=effectiveFixedEntries(selectedMonth),total=entries.reduce((s,x)=>s+x.config.amount,0);setText("fixedTotal",`合計：${yen(total)}`);
  const warn=$("fixedListWarning");const unresolvedPast=isPastSelected()&&entries.some(x=>!x.paid);if(unresolvedPast){warn.textContent="この過去月には未払いの固定費があります。";warn.classList.remove("hidden");}else warn.classList.add("hidden");
  if(!entries.length){$("fixedList").innerHTML='<div class="muted expense-empty">この月に有効な固定費はありません。</div>';return;}
  const rows=entries.map(({fixed,config,date,paid})=>`<tr><td>${escapeHtml(formatExpenseDate(date))}</td><td class="memo-cell" data-memo="${escapeHtml(config.memo||'')}">${config.memo?escapeHtml(config.memo):'<span class="muted">—</span>'}</td><td>${escapeHtml(config.category||'未設定')}${fixed.needsReview?' <small>要確認</small>':''}</td><td class="amount-col"><strong>${yen(config.amount)}</strong></td><td class="action-col"><div class="table-actions">${paid?`<button type="button" class="fixed-paid" data-unpay-fixed="${escapeHtml(fixed.id)}">支払済み</button>`:`<button type="button" class="confirm-btn" data-confirm-fixed="${escapeHtml(fixed.id)}" ${config.due?'':'disabled'}>支出に確定</button>`}<button type="button" class="edit-btn" data-edit-fixed="${escapeHtml(fixed.id)}">編集</button></div></td></tr>`);
  $("fixedList").innerHTML=tableHtml(rows);
}

function sourceDataForMonth(key){
  const actual=monthExpenses(key),planned=monthPendingPlanned(key),fixed=unpaidFixedEntries(key).map(x=>({amount:x.config.amount,category:x.config.category||"未設定",date:x.date}));return {actual,planned,fixed};
}
function sourceTotals(data){return {actual:data.actual.reduce((s,e)=>s+Number(e.amount||0),0),planned:data.planned.reduce((s,e)=>s+Number(e.amount||0),0),fixed:data.fixed.reduce((s,e)=>s+Number(e.amount||0),0)};}
function legendHtml(t){const parts=[];if(t.actual>0)parts.push('<span class="legend-chip"><i class="legend-swatch legend-actual"></i>実支出</span>');if(t.planned>0)parts.push('<span class="legend-chip"><i class="legend-swatch legend-planned"></i>予定支出</span>');if(t.fixed>0)parts.push('<span class="legend-chip"><i class="legend-swatch legend-fixed"></i>未払い固定費</span>');return parts.length?`<div class="chart-legend">${parts.join("")}</div>`:"";}
function popupBreakdown(title,vals,event){const popup=$("chartPopup"),total=vals.actual+vals.planned+vals.fixed;popup.innerHTML=`<strong>${escapeHtml(title)}</strong><br>合計 ${yen(total)}<br>実支出 ${yen(vals.actual)}<br>予定支出 ${yen(vals.planned)}<br>未払い固定費 ${yen(vals.fixed)}`;popup.classList.remove("hidden");const x=Math.min(window.innerWidth-12,event.clientX+8),y=Math.min(window.innerHeight-12,event.clientY+8);popup.style.left=x+"px";popup.style.top=y+"px";requestAnimationFrame(()=>{const r=popup.getBoundingClientRect();popup.style.left=Math.max(8,Math.min(window.innerWidth-r.width-8,x))+"px";popup.style.top=Math.max(8,Math.min(window.innerHeight-r.height-8,y))+"px";});clearTimeout(window.__chartPopupTimer);window.__chartPopupTimer=setTimeout(()=>popup.classList.add("hidden"),2600);}
function renderCategoryChart(){
  const data=sourceDataForMonth(selectedMonth),tot=sourceTotals(data),container=$("categoryChart"),map=new Map();const add=(arr,type)=>arr.forEach(e=>{const c=String(e.category||"未設定"),v=map.get(c)||{actual:0,planned:0,fixed:0};v[type]+=Number(e.amount||0);map.set(c,v);});add(data.actual,"actual");add(data.planned,"planned");add(data.fixed,"fixed");const rows=[...map.entries()].map(([name,v])=>({name,...v,total:v.actual+v.planned+v.fixed})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);if(!rows.length){container.innerHTML='<div class="chart-empty">表示できる支出データがありません</div>';return;}const max=Math.max(...rows.map(r=>r.total));container.innerHTML=legendHtml(tot)+rows.map((r,i)=>`<div class="category-bar-row"><span class="category-bar-label">${escapeHtml(r.name)}</span><div class="category-bar-track" data-cat-index="${i}" style="width:100%"><span class="stack-segment stack-actual" style="width:${r.actual/max*100}%"></span><span class="stack-segment stack-planned" style="width:${r.planned/max*100}%"></span><span class="stack-segment stack-fixed" style="width:${r.fixed/max*100}%"></span></div><span class="category-bar-total">${yen(r.total)}</span></div>`).join("");container.querySelectorAll("[data-cat-index]").forEach(el=>el.addEventListener("click",ev=>{const r=rows[Number(el.dataset.catIndex)];popupBreakdown(r.name,r,ev);}));
}
function niceChartScale(maxValue){
  const value=Math.max(0,Number(maxValue)||0);if(!value)return {max:0,ticks:[0]};
  const rough=value/4,power=Math.pow(10,Math.floor(Math.log10(Math.max(1,rough)))),ratio=rough/power;
  const nice=ratio<=1?1:ratio<=2?2:ratio<=2.5?2.5:ratio<=5?5:10,step=Math.max(1,nice*power),top=Math.ceil(value/step)*step;
  return {max:top,ticks:[top,top-step,top-step*2,top-step*3,0].map(v=>Math.max(0,Math.round(v)))};
}
function chartAxisHtml(scale){return `<div class="chart-y-axis" aria-hidden="true">${scale.ticks.map(v=>`<span>${yen(v)}</span>`).join("")}</div>`;}
function chartGridHtml(scale){return `<div class="chart-grid-lines" aria-hidden="true">${scale.ticks.map(()=>'<span></span>').join("")}</div>`;}
function renderDailyChart(){
  const data=sourceDataForMonth(selectedMonth),tot=sourceTotals(data),days=daysInMonth(selectedMonth),vals=Array.from({length:days},()=>({actual:0,planned:0,fixed:0}));const add=(arr,type)=>arr.forEach(e=>{const d=Number(String(e.date||"").slice(8,10));if(d>=1&&d<=days)vals[d-1][type]+=Number(e.amount||0);});add(data.actual,"actual");add(data.planned,"planned");add(data.fixed,"fixed");const totals=vals.map(v=>v.actual+v.planned+v.fixed),max=Math.max(0,...totals),container=$("dailyChart");if(!max){container.innerHTML='<div class="chart-empty">表示できる支出データがありません</div>';return;}const scale=niceChartScale(max),labelDays=new Set([1,5,10,15,20,25,days]);container.innerHTML=legendHtml(tot)+`<div class="vertical-chart-layout">${chartAxisHtml(scale)}<div class="vertical-chart"><div class="vertical-bars-area">${chartGridHtml(scale)}<div class="vertical-bars">${vals.map((v,i)=>{const total=totals[i],h=scale.max?total/scale.max*100:0;return `<div class="bar-column" data-day="${i+1}"><div class="bar-stack" style="height:${h}%"><span class="bar-segment stack-actual" style="height:${total?v.actual/total*100:0}%"></span><span class="bar-segment stack-planned" style="height:${total?v.planned/total*100:0}%"></span><span class="bar-segment stack-fixed" style="height:${total?v.fixed/total*100:0}%"></span></div></div>`}).join("")}</div></div><div class="bar-labels">${vals.map((_,i)=>`<span class="bar-label">${labelDays.has(i+1)?i+1:''}</span>`).join("")}</div></div></div>`;container.querySelectorAll("[data-day]").forEach(el=>el.addEventListener("click",ev=>{const d=Number(el.dataset.day);popupBreakdown(`${monthLabel(selectedMonth)}${d}日`,vals[d-1],ev);}));
}
function renderMonthlyChart(){
  const keys=[];for(let i=5;i>=0;i--)keys.push(addMonths(selectedMonth,-i));const rows=keys.map(k=>{const v=sourceTotals(sourceDataForMonth(k));return {key:k,...v,total:v.actual+v.planned+v.fixed};}),max=Math.max(0,...rows.map(r=>r.total)),container=$("monthlyChart"),sum={actual:rows.reduce((a,r)=>a+r.actual,0),planned:rows.reduce((a,r)=>a+r.planned,0),fixed:rows.reduce((a,r)=>a+r.fixed,0)};if(!max){const msg=isFutureSelected()&&!monthExpenses(selectedMonth).length&&!monthPendingPlanned(selectedMonth).length&&!unpaidFixedEntries(selectedMonth).length?"予定されている支出はありません":"表示できる支出データがありません";container.innerHTML=`<div class="chart-empty">${msg}</div>`;return;}const scale=niceChartScale(max);container.innerHTML=legendHtml(sum)+`<div class="vertical-chart-layout">${chartAxisHtml(scale)}<div class="vertical-chart"><div class="vertical-bars-area">${chartGridHtml(scale)}<div class="vertical-bars">${rows.map(r=>{const h=scale.max?r.total/scale.max*100:0;return `<div class="bar-column" data-month-bar="${r.key}"><div class="bar-stack" style="height:${h}%"><span class="bar-segment stack-actual" style="height:${r.total?r.actual/r.total*100:0}%"></span><span class="bar-segment stack-planned" style="height:${r.total?r.planned/r.total*100:0}%"></span><span class="bar-segment stack-fixed" style="height:${r.total?r.fixed/r.total*100:0}%"></span></div></div>`}).join("")}</div></div><div class="bar-labels">${rows.map(r=>`<span class="bar-label">${shortMonthLabel(r.key)}</span>`).join("")}</div></div></div>`;container.querySelectorAll("[data-month-bar]").forEach(el=>el.addEventListener("click",ev=>{const r=rows.find(x=>x.key===el.dataset.monthBar);popupBreakdown(monthLabel(r.key),r,ev);}));
}

function nextOrderForDate(items,date){const vals=items.filter(x=>x.date===date).map(x=>Number(x.order)||0);return (vals.length?Math.max(...vals):Date.now())+1;}
function validateAmount(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
async function addExpense(){
  const amount=validateAmount($("expenseAmount").value),date=$("expenseDate").value,category=$("expenseCategory").value,memo=$("expenseMemo").value.trim();if(!amount){alert("金額を入力してください。");return;}if(!isValidDateString(date)||!dateAllowed(date)){alert("登録できる日付を確認してください。未来は現在月から1年先までです。");return;}const dest=monthOfDate(date);if(!(await confirmCrossMonth(selectedMonth,dest,"支出")))return;const e={id:newId("e"),amount,category:category||"その他",memo,date,order:nextOrderForDate(state.expenses,date),origin:null};state.expenses.push(e);state.memory.expenseCategory=category||"食費";rememberSessionDate("expense",date);save();clearDirty("expense-entry");if(dest!==selectedMonth){switchMonth(dest,{force:true});return;}$("expenseAmount").value="";$("expenseMemo").value="";$("expenseDate").value=sessionDefaultDate("expense",selectedMonth);renderAll();}
async function addPlanned(){
  const amount=validateAmount($("plannedAmount").value),date=$("plannedDate").value,category=$("plannedCategory").value,memo=$("plannedMemo").value.trim();if(!amount){alert("金額を入力してください。");return;}if(!isValidDateString(date)||!dateAllowed(date)){alert("登録できる予定日を確認してください。未来は現在月から1年先までです。");return;}const dest=monthOfDate(date);if(!(await confirmCrossMonth(selectedMonth,dest,"予定支出")))return;const p={id:newId("p"),amount,category:category||"その他",memo,date,order:nextOrderForDate(state.plannedExpenses,date),status:"pending",confirmedExpenseId:null};state.plannedExpenses.push(p);state.memory.plannedCategory=category||"食費";rememberSessionDate("planned",date);save();clearDirty("planned-entry");if(dest!==selectedMonth){switchMonth(dest,{force:true});return;}$("plannedAmount").value="";$("plannedMemo").value="";$("plannedDate").value=sessionDefaultDate("planned",selectedMonth);renderAll();}
function addFixed(){
  const amount=validateAmount($("fixedAmount").value),category=$("fixedCategory").value,memo=$("fixedMemo").value.trim(),due=valueToDue($("fixedDue").value);if(!amount){alert("金額を入力してください。");return;}if(!category){alert("カテゴリを選択してください。");return;}if(!due){alert("支払日を選択してください。");return;}state.fixedExpenses.push({id:newId("f"),startMonth:selectedMonth,endMonth:null,changes:[{effectiveMonth:selectedMonth,amount,category,memo,due}],paidMonths:{},needsReview:false,order:Date.now()});state.memory.fixedCategory=category;save();clearDirty("fixed-entry");$("fixedAmount").value="";$("fixedMemo").value="";$("fixedDue").value="";renderAll();}

async function confirmPlanned(id){const p=getPlannedSource(id);if(!p||p.status==="confirmed")return;if(!await appConfirm(`${formatExpenseDate(p.date)} ${p.memo||p.category} ${yen(p.amount)} を支出に確定しますか？`))return;const e={id:newId("e"),amount:p.amount,category:p.category,memo:p.memo||"",date:p.date,order:nextOrderForDate(state.expenses,p.date),origin:{type:"planned",sourceId:p.id,sourceMonth:monthOfDate(p.date),snapshot:{amount:p.amount,category:p.category,memo:p.memo||"",date:p.date}}};state.expenses.push(e);p.status="confirmed";p.confirmedExpenseId=e.id;save();renderAll();}
async function confirmFixed(id){const f=getFixedSource(id),config=configForFixedMonth(f,selectedMonth);if(!f||!config||fixedIsPaid(f,selectedMonth)||!config.due)return;const date=fixedDueDate(f,selectedMonth,config);if(!await appConfirm(`${formatExpenseDate(date)} ${config.memo||config.category} ${yen(config.amount)} を支出に確定しますか？`))return;const e={id:newId("e"),amount:config.amount,category:config.category||"未設定",memo:config.memo||"",date,order:nextOrderForDate(state.expenses,date),origin:{type:"fixed",sourceId:f.id,sourceMonth:selectedMonth,snapshot:{amount:config.amount,category:config.category||"未設定",memo:config.memo||"",date}}};state.expenses.push(e);f.paidMonths[selectedMonth]={expenseId:e.id,confirmedAt:new Date().toISOString()};save();renderAll();}
function expenseChangedFromSnapshot(e){const s=e?.origin?.snapshot;if(!s)return false;return Number(s.amount)!==Number(e.amount)||String(s.category||"")!==String(e.category||"")||String(s.memo||"")!==String(e.memo||"")||String(s.date||"")!==String(e.date||"");}
async function unpayFixed(id,month=selectedMonth){const f=getFixedSource(id),info=fixedPaidInfo(f,month);if(!f||!info)return;const e=state.expenses.find(x=>String(x.id)===String(info.expenseId));if(e&&expenseChangedFromSnapshot(e)){if(!await appConfirm("手動編集した支出も削除されます。実支出を削除して未払いへ戻しますか？"))return;}else if(!await appConfirm("実支出を削除して未払いへ戻します。続行しますか？"))return;if(e)state.expenses=state.expenses.filter(x=>String(x.id)!==String(e.id));delete f.paidMonths[month];save();renderAll();}
async function rollbackPlannedExpense(e){const p=getPlannedSource(e.origin?.sourceId);if(!p)return alert("元の予定支出が見つかりません。");if(!await appConfirm("実支出を削除して予定支出へ戻します。続行しますか？"))return;p.amount=e.amount;p.category=e.category;p.memo=e.memo||"";p.date=e.date;p.order=nextOrderForDate(state.plannedExpenses,p.date);p.status="pending";p.confirmedExpenseId=null;state.expenses=state.expenses.filter(x=>String(x.id)!==String(e.id));rememberSessionDate("planned",p.date);save();closeEdit();const dest=monthOfDate(p.date);if(dest!==selectedMonth){switchMonth(dest,{force:true});return;}renderAll();}
async function rollbackFixedExpense(e){const month=e.origin?.sourceMonth,f=getFixedSource(e.origin?.sourceId);if(!f||!month)return alert("元の固定費が見つかりません。");await unpayFixed(f.id,month);if(fixedPaidInfo(f,month))return;closeEdit();if(month!==selectedMonth)await switchMonth(month,{force:true});}

function openEdit(id){const e=state.expenses.find(x=>String(x.id)===String(id));if(!e)return;$("editModal").dataset.id=e.id;suppressDirty=true;$("editAmount").value=e.amount;ensureSelectOption("editCategory",e.category);$("editCategory").value=e.category;$("editMemo").value=e.memo||"";$("editDate").value=e.date;const type=expenseOriginType(e),rollback=$("rollbackOrigin");if(type==="planned"){rollback.textContent="予定支出に戻す";rollback.classList.remove("hidden");}else if(type==="fixed"){rollback.textContent="固定費を未払いに戻す";rollback.classList.remove("hidden");}else rollback.classList.add("hidden");suppressDirty=false;clearDirty("expense-edit");$("editModal").classList.remove("hidden");}
function closeEdit(){clearDirty("expense-edit");$("editModal").classList.add("hidden");}
async function saveExpenseEdit(){const e=state.expenses.find(x=>String(x.id)===String($("editModal").dataset.id));if(!e)return;const amount=validateAmount($("editAmount").value),date=$("editDate").value;if(!amount)return alert("金額を入力してください。");if(!isValidDateString(date)||!dateAllowed(date))return alert("日付を確認してください。");const sourceMonth=monthOfDate(e.date),dest=monthOfDate(date);if(!(await confirmCrossMonth(sourceMonth,dest,"支出")))return;e.amount=amount;e.category=$("editCategory").value;e.memo=$("editMemo").value.trim();if(e.date!==date)e.order=nextOrderForDate(state.expenses,date);e.date=date;rememberSessionDate("expense",date);save();closeEdit();if(dest!==selectedMonth){switchMonth(dest,{force:true});return;}renderAll();}
function requestExpenseDelete(){const e=state.expenses.find(x=>String(x.id)===String($("editModal").dataset.id));if(!e)return;const type=expenseOriginType(e);if(type==="fixed")return alert("この支出は固定費から作成されています。固定費を未払いに戻してください。");if(type==="planned")return alert("この支出は予定支出から作成されています。予定支出に戻してください。");showDeleteConfirm("expense",e);}

function openPlannedEdit(id){const p=getPlannedSource(id);if(!p||p.status==="confirmed")return;$("plannedEditModal").dataset.id=p.id;suppressDirty=true;$("plannedEditAmount").value=p.amount;ensureSelectOption("plannedEditCategory",p.category);$("plannedEditCategory").value=p.category;$("plannedEditMemo").value=p.memo||"";$("plannedEditDate").value=p.date;suppressDirty=false;clearDirty("planned-edit");$("plannedEditModal").classList.remove("hidden");}
function closePlannedEdit(){clearDirty("planned-edit");$("plannedEditModal").classList.add("hidden");}
async function savePlannedEdit(){const p=getPlannedSource($("plannedEditModal").dataset.id);if(!p)return;const amount=validateAmount($("plannedEditAmount").value),date=$("plannedEditDate").value;if(!amount)return alert("金額を入力してください。");if(!isValidDateString(date)||!dateAllowed(date))return alert("予定日を確認してください。");const source=monthOfDate(p.date),dest=monthOfDate(date);if(!(await confirmCrossMonth(source,dest,"予定支出")))return;p.amount=amount;p.category=$("plannedEditCategory").value;p.memo=$("plannedEditMemo").value.trim();if(p.date!==date)p.order=nextOrderForDate(state.plannedExpenses,date);p.date=date;rememberSessionDate("planned",date);save();closePlannedEdit();if(dest!==selectedMonth){switchMonth(dest,{force:true});return;}renderAll();}
function requestPlannedDelete(){const p=getPlannedSource($("plannedEditModal").dataset.id);if(p)showDeleteConfirm("planned",p);}

function ensureSelectOption(id,value){const el=$(id);if(!el||!value)return;if(![...el.options].some(o=>o.value===value)){const o=document.createElement("option");o.value=value;o.textContent=value;el.appendChild(o);}}
function openFixedEdit(id){const f=getFixedSource(id),config=configForFixedMonth(f,selectedMonth);if(!f||!config)return;$("fixedEditModal").dataset.id=f.id;suppressDirty=true;$("fixedEditAmount").value=config.amount;ensureSelectOption("fixedEditCategory",config.category||"未設定");$("fixedEditCategory").value=config.category||"未設定";$("fixedEditMemo").value=config.memo||"";$("fixedEditDue").value=dueToValue(config.due);setHidden("fixedPaidNotice",!fixedIsPaid(f,selectedMonth));suppressDirty=false;clearDirty("fixed-edit");$("fixedEditModal").classList.remove("hidden");}
function closeFixedEdit(){clearDirty("fixed-edit");$("fixedEditModal").classList.add("hidden");}
function upsertFixedChange(f,effectiveMonth,config){const changes=f.changes||[];const idx=changes.findIndex(c=>c.effectiveMonth===effectiveMonth),entry={effectiveMonth,amount:config.amount,category:config.category,memo:config.memo,due:clone(config.due)};if(idx>=0)changes[idx]=entry;else changes.push(entry);changes.sort((a,b)=>compareMonth(a.effectiveMonth,b.effectiveMonth));f.changes=changes;}
async function saveFixedEdit(){
  const f=getFixedSource($("fixedEditModal").dataset.id),old=configForFixedMonth(f,selectedMonth);if(!f||!old)return;const amount=validateAmount($("fixedEditAmount").value),category=$("fixedEditCategory").value,memo=$("fixedEditMemo").value.trim(),due=valueToDue($("fixedEditDue").value);if(!amount)return alert("金額を入力してください。");if(!category)return alert("カテゴリを選択してください。");if(!due)return alert("支払日を選択してください。");let effective=selectedMonth;const dueChanged=JSON.stringify(due)!==JSON.stringify(old.due);if(isPastSelected()&&dueChanged){if(await appConfirm(`支払日の変更を${monthLabel(selectedMonth)}から反映しますか？\n\nOK：選択月から\nキャンセル：次の確認へ`)){effective=selectedMonth;}else if(await appConfirm("今月から反映しますか？")){effective=currentMonthKey();}else return;}
  const later=f.changes.some(c=>compareMonth(c.effectiveMonth,effective)>0);if(later&&!await appConfirm("この固定費には将来の変更予定があります。将来の予定を残したまま、この変更を追加しますか？"))return;
  upsertFixedChange(f,effective,{amount,category,memo,due});f.needsReview=false;
  const paid=fixedPaidInfo(f,selectedMonth);if(paid&&effective===selectedMonth){const e=state.expenses.find(x=>String(x.id)===String(paid.expenseId));if(e&&await appConfirm("この月は支払済みです。選択月の確定済み支出にも変更を反映しますか？")){e.amount=amount;e.category=category;e.memo=memo;e.date=fixedDueDate(f,selectedMonth,{amount,category,memo,due});e.origin=e.origin||{type:"fixed",sourceId:f.id,sourceMonth:selectedMonth};e.origin.snapshot={amount:e.amount,category:e.category,memo:e.memo,date:e.date};}}
  save();closeFixedEdit();renderAll();
}
async function deleteFixedFromMonth(){const f=getFixedSource($("fixedEditModal").dataset.id);if(!f)return;if(!await appConfirm(`${monthLabel(selectedMonth)}以降の固定費設定を削除します。\n過去に確定した実支出は削除されません。続行しますか？`))return;f.endMonth=selectedMonth;f.changes=(f.changes||[]).filter(c=>compareMonth(c.effectiveMonth,selectedMonth)<0);save();closeFixedEdit();renderAll();}
async function deleteFixedCompletely(){const f=getFixedSource($("fixedEditModal").dataset.id);if(!f)return;if(!await appConfirm("この固定費を完全削除します。\n\nすべての固定費設定・変更履歴が削除されます。\n確定済みの実支出は通常の支出として残ります。続行しますか？"))return;state.expenses.forEach(e=>{if(e.origin?.type==="fixed"&&String(e.origin.sourceId)===String(f.id))e.origin=null;});state.fixedExpenses=state.fixedExpenses.filter(x=>String(x.id)!==String(f.id));save();closeFixedEdit();renderAll();}

function moveWithinSameDate(items,id,direction,render,open){const item=items.find(x=>String(x.id)===String(id));if(!item)return;const same=items.filter(x=>x.date===item.date&&x.status!=="confirmed").sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));const pos=same.findIndex(x=>String(x.id)===String(id)),target=direction==="up"?pos-1:pos+1;if(pos<0||target<0||target>=same.length)return;const a=same[pos],b=same[target],tmp=a.order;a.order=b.order;b.order=tmp;save();render();open(id);}
function moveFixedWithinDue(id,direction){const entry=effectiveFixedEntries(selectedMonth).find(x=>String(x.fixed.id)===String(id));if(!entry)return;const same=effectiveFixedEntries(selectedMonth).filter(x=>x.date===entry.date).map(x=>x.fixed).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));const pos=same.findIndex(x=>String(x.id)===String(id)),target=direction==="up"?pos-1:pos+1;if(pos<0||target<0||target>=same.length)return;const a=same[pos],b=same[target],tmp=Number(a.order)||pos;a.order=Number(b.order)||target;b.order=tmp;save();renderFixedExpenses();openFixedEdit(id);}

function showDeleteConfirm(kind,item){pendingDelete={kind,id:String(item.id)};const lines=[`${kind==="expense"?'支出':'予定支出'}を削除しますか？`,`日付：${formatExpenseDate(item.date)}`,`カテゴリ：${item.category||'未設定'}`,`メモ：${String(item.memo||'').trim()||'なし'}`,`金額：${yen(item.amount)}`];$("deleteConfirmMessage").textContent=lines.join("\n");$("deleteConfirmModal").classList.remove("hidden");}
function closeDeleteConfirm(){pendingDelete=null;$("deleteConfirmModal").classList.add("hidden");}
function confirmDelete(){if(!pendingDelete)return;const {kind,id}=pendingDelete;if(kind==="expense")state.expenses=state.expenses.filter(x=>String(x.id)!==id);if(kind==="planned")state.plannedExpenses=state.plannedExpenses.filter(x=>String(x.id)!==id);save();closeDeleteConfirm();closeEdit();closePlannedEdit();renderAll();}

async function saveIncome(){const rec=selectedRecord();if(isPastSelected()&&!await appConfirm("過去月の予算結果が変わります。収入・ボーナスを保存しますか？"))return;const incomeRaw=$("income").value,bonusRaw=$("bonus").value;if(incomeRaw!==""){const v=Number(incomeRaw);if(!Number.isFinite(v)||v<0)return alert("前月の収入を確認してください。");rec.income={entered:true,value:v};}if(bonusRaw!==""){const v=Number(bonusRaw);if(!Number.isFinite(v)||v<0)return alert("ボーナス額を確認してください。");rec.bonus={entered:true,value:v};}save();clearDirty("income");renderAll();}
async function clearIncome(){if(!await appConfirm("前月の収入を未入力状態に戻しますか？"))return;const rec=selectedRecord();rec.income={entered:false,value:0};save();suppressDirty=true;$("income").value="";suppressDirty=false;clearDirty("income");renderAll();}
async function clearBonus(){if(!await appConfirm("ボーナスを未入力状態に戻しますか？"))return;const rec=selectedRecord();rec.bonus={entered:false,value:0};save();suppressDirty=true;$("bonus").value="";suppressDirty=false;clearDirty("income");renderAll();}
async function saveSettings(){const ids=["minimumTakeHome","savingsTarget","extraAllowancePercent","extraSavingsPercent"],raw=ids.map(id=>$(id).value.trim());if(raw.some(v=>v===""))return alert("家計ルールはすべて入力してください。");const vals={minimumTakeHome:Number(raw[0]),savingsTarget:Number(raw[1]),extraAllowancePercent:Number(raw[2]),extraSavingsPercent:Number(raw[3])};if(Object.values(vals).some(v=>!Number.isFinite(v)||v<0))return alert("家計ルールの入力内容を確認してください。");if(vals.extraAllowancePercent>100||vals.extraSavingsPercent>100)return alert("割合は0〜100%で入力してください。");if(vals.extraAllowancePercent+vals.extraSavingsPercent!==100)return alert("超過分のお小遣い割合と貯金割合の合計を100%にしてください。");if(isPastSelected()&&!await appConfirm("過去月の予算結果が変わります。家計ルールを保存しますか？"))return;selectedRecord().settings=normalizeSettings(vals);selectedRecord().inheritedFrom=null;save();clearDirty("settings");setHidden("settingsMissing",true);renderAll();}

function renderAll(){if(!state)return;renderMonthNavigation();updateDynamicTitles();renderBudgetDashboard();renderValidation();renderExpenses();renderPlannedExpenses();renderFixedExpenses();renderCategoryChart();renderDailyChart();renderMonthlyChart();applySectionPrefs();applyStatPrefs();}

function runIntegrityCheck(){const issues=collectIntegrityIssues(state),el=$("integrityResult");if(!issues.length){el.className="integrity-result good";el.innerHTML="<strong>問題は見つかりませんでした。</strong>";}else{el.className="integrity-result bad";el.innerHTML=`<strong>${issues.length}件の確認事項があります。</strong><ul>${issues.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`;}el.classList.remove("hidden");}
function collectIntegrityIssues(s){
  const issues=[],allIds=new Map();const register=(kind,id)=>{const k=String(id||"");if(!k){issues.push(`${kind}にIDがありません`);return;}if(allIds.has(k))issues.push(`重複ID：${k}（${allIds.get(k)} / ${kind}）`);else allIds.set(k,kind);};
  Object.keys(s.months||{}).forEach(k=>{if(!validMonthKey(k))issues.push(`不正な月キー：${k}`);const rec=s.months[k];if(rec?.settings&&(Number(rec.settings.extraAllowancePercent)+Number(rec.settings.extraSavingsPercent)!==100))issues.push(`${monthLabel(k)}：超過分割合の合計が100%ではありません`);});
  (s.expenses||[]).forEach(e=>{register("支出",e.id);if(!isValidDateString(e.date))issues.push(`支出 ${e.id}：不正な日付 ${e.date||'未入力'}`);if(e.origin?.type==="planned"){const p=s.plannedExpenses.find(p=>String(p.id)===String(e.origin.sourceId));if(!p)issues.push(`支出 ${e.id}：元の予定支出が存在しません`);else{if(p.status!=="confirmed")issues.push(`支出 ${e.id}：元の予定支出が未確定状態です`);if(String(p.confirmedExpenseId||"")!==String(e.id))issues.push(`支出 ${e.id}：予定支出との相互リンクが不整合です`);}}if(e.origin?.type==="fixed"){const f=s.fixedExpenses.find(f=>String(f.id)===String(e.origin.sourceId));if(!f)issues.push(`支出 ${e.id}：元の固定費が存在しません`);else{const m=String(e.origin.sourceMonth||"");if(!validMonthKey(m))issues.push(`支出 ${e.id}：固定費の元月が不正です`);else if(String(f.paidMonths?.[m]?.expenseId||"")!==String(e.id))issues.push(`支出 ${e.id}：固定費との相互リンクが不整合です`);}}});
  (s.plannedExpenses||[]).forEach(p=>{register("予定支出",p.id);if(!isValidDateString(p.date))issues.push(`予定支出 ${p.id}：不正な日付 ${p.date||'未入力'}`);if(p.status==="confirmed"){const e=s.expenses.find(e=>String(e.id)===String(p.confirmedExpenseId));if(!e)issues.push(`予定支出 ${p.id}：確定先の実支出が存在しません`);else if(e.origin?.type!=="planned"||String(e.origin.sourceId)!==String(p.id))issues.push(`予定支出 ${p.id}：実支出との相互リンクが不整合です`);}else if(p.confirmedExpenseId)issues.push(`予定支出 ${p.id}：未確定なのに確定先IDが残っています`);});
  (s.fixedExpenses||[]).forEach(f=>{register("固定費",f.id);if(!validMonthKey(f.startMonth))issues.push(`固定費 ${f.id}：開始月が不正です`);if(f.endMonth&&!validMonthKey(f.endMonth))issues.push(`固定費 ${f.id}：終了月が不正です`);if(f.needsReview)issues.push(`固定費 ${f.id}：要確認データです`);const seen=new Set();(f.changes||[]).forEach(c=>{if(!validMonthKey(c.effectiveMonth))issues.push(`固定費 ${f.id}：変更履歴の適用月が不正です`);if(seen.has(c.effectiveMonth))issues.push(`固定費 ${f.id}：${c.effectiveMonth}の変更履歴が重複しています`);seen.add(c.effectiveMonth);if(!normalizeDue(c.due,c.day))issues.push(`固定費 ${f.id}：${c.effectiveMonth}の支払日が不正です`);if(!String(c.category||"").trim())issues.push(`固定費 ${f.id}：${c.effectiveMonth}のカテゴリが未設定です`);});Object.entries(f.paidMonths||{}).forEach(([m,info])=>{if(!validMonthKey(m))issues.push(`固定費 ${f.id}：支払済み月 ${m} が不正です`);const e=s.expenses.find(x=>String(x.id)===String(info?.expenseId));if(!e)issues.push(`固定費 ${f.id} ${m}：確定済み実支出が存在しません`);else if(e.origin?.type!=="fixed"||String(e.origin.sourceId)!==String(f.id))issues.push(`固定費 ${f.id} ${m}：実支出とのリンクが不整合です`);else if(String(e.origin.sourceMonth||"")!==String(m))issues.push(`固定費 ${f.id} ${m}：実支出の元月が不整合です`);});});
  return issues;
}

function validateV49BackupRaw(raw){
  const issues=[],ids=new Map();
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return ["Ver.49データ本体を読み込めません"];
  if(Number(raw.schemaVersion)!==SCHEMA_VERSION)issues.push(`schemaVersionが${SCHEMA_VERSION}ではありません`);
  if(!raw.months||typeof raw.months!=="object"||Array.isArray(raw.months))issues.push("月別データの形式が不正です");else Object.keys(raw.months).forEach(k=>{if(!validMonthKey(k))issues.push(`不正な月キー：${k}`);});
  [["expenses","支出"],["plannedExpenses","予定支出"],["fixedExpenses","固定費"]].forEach(([key,label])=>{if(!Array.isArray(raw[key]))issues.push(`${label}データの形式が不正です`);});
  const register=(kind,id)=>{const k=String(id??"");if(!k){issues.push(`${kind}にIDがありません`);return;}if(ids.has(k))issues.push(`重複ID：${k}（${ids.get(k)} / ${kind}）`);else ids.set(k,kind);};
  if(Array.isArray(raw.expenses))raw.expenses.forEach(e=>{if(!e||typeof e!=="object"){issues.push("支出データの項目形式が不正です");return;}register("支出",e.id);if(!isValidDateString(e.date))issues.push(`支出 ${e.id??'不明'}：不正な日付 ${e.date??'未入力'}`);if(!Number.isFinite(Number(e.amount))||Number(e.amount)<0)issues.push(`支出 ${e.id??'不明'}：金額が不正です`);});
  if(Array.isArray(raw.plannedExpenses))raw.plannedExpenses.forEach(p=>{if(!p||typeof p!=="object"){issues.push("予定支出データの項目形式が不正です");return;}register("予定支出",p.id);if(!isValidDateString(p.date))issues.push(`予定支出 ${p.id??'不明'}：不正な日付 ${p.date??'未入力'}`);if(!Number.isFinite(Number(p.amount))||Number(p.amount)<0)issues.push(`予定支出 ${p.id??'不明'}：金額が不正です`);});
  if(Array.isArray(raw.fixedExpenses))raw.fixedExpenses.forEach(f=>{if(!f||typeof f!=="object"){issues.push("固定費データの項目形式が不正です");return;}register("固定費",f.id);if(!validMonthKey(String(f.startMonth||"")))issues.push(`固定費 ${f.id??'不明'}：開始月が不正です`);if(f.endMonth&&!validMonthKey(String(f.endMonth)))issues.push(`固定費 ${f.id??'不明'}：終了月が不正です`);if(!Array.isArray(f.changes)){issues.push(`固定費 ${f.id??'不明'}：変更履歴の形式が不正です`);}else f.changes.forEach(c=>{if(!c||typeof c!=="object"){issues.push(`固定費 ${f.id??'不明'}：変更履歴の項目形式が不正です`);return;}if(!validMonthKey(String(c.effectiveMonth||"")))issues.push(`固定費 ${f.id??'不明'}：変更履歴の適用月が不正です`);if(!Number.isFinite(Number(c.amount))||Number(c.amount)<0)issues.push(`固定費 ${f.id??'不明'}：変更履歴の金額が不正です`);if(!normalizeDue(c.due,c.day))issues.push(`固定費 ${f.id??'不明'}：変更履歴の支払日が不正です`);});if(f.paidMonths!==undefined&&(typeof f.paidMonths!=="object"||Array.isArray(f.paidMonths)))issues.push(`固定費 ${f.id??'不明'}：支払済み情報の形式が不正です`);});
  return issues;
}

function exportCurrentBackup(){const data={format:"money-rule-dev-backup",version:VERSION,schemaVersion:SCHEMA_VERSION,environment:"development",exportedAt:new Date().toISOString(),localStorage:{}};DEV_BACKUP_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)data.localStorage[k]=v;});downloadJson(data,`money-rule-dev-backup-${getToday().replaceAll('-','')}.json`);setText("backupStatus","検証環境のバックアップを書き出しました。");}
function downloadJson(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function clearDevRestoreKeys(){[STORAGE_KEYS.state,STORAGE_KEYS.sections,STORAGE_KEYS.stats,LEGACY_STORAGE_KEYS.state].forEach(k=>localStorage.removeItem(k));}
function importBackupFile(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);handleBackupObject(data);}catch{alert("バックアップファイルを読み込めませんでした。");}};r.readAsText(file);}
async function handleBackupObject(data){
  if(!data||typeof data!=="object"||!data.localStorage||typeof data.localStorage!=="object")return alert("バックアップ形式を確認できませんでした。");
  const ls=data.localStorage,v49raw=ls[STORAGE_KEYS.state];
  if(v49raw!==undefined){let rawCandidate=null,parseError=null;try{rawCandidate=JSON.parse(v49raw);}catch(e){parseError=e;}const partialPrefs=()=>{const restored=[];[[STORAGE_KEYS.sections,"表示設定"],[STORAGE_KEYS.stats,"表示状態"]].forEach(([key,label])=>{if(ls[key]===undefined)return;try{const v=JSON.parse(String(ls[key]));if(v&&typeof v==="object"&&!Array.isArray(v))restored.push({key,label,value:String(ls[key])});}catch{}});return restored;};const rawIssues=parseError?["Ver.49データ本体を解析できません"]:validateV49BackupRaw(rawCandidate);if(rawIssues.length){const partial=partialPrefs(),details=rawIssues.slice(0,6).join("\n");if(!partial.length)return alert(`バックアップ本体に復元できない問題があります。\n${details}\n復元できる部分もありません。現在のデータは変更していません。`);if(!await appConfirm(`バックアップ本体に復元できない問題があります。\n${details}\n\n復元可能：${partial.map(x=>x.label).join("・")}\n家計簿本体は変更せず、この部分だけ復元しますか？`))return;partial.forEach(x=>localStorage.setItem(x.key,x.value));location.reload();return;}const candidate=normalizeCurrentState(rawCandidate);if(!candidate){const partial=partialPrefs();if(!partial.length)return alert("Ver.49データを検証できませんでした。復元できる部分もありません。現在のデータは変更していません。");if(!await appConfirm(`Ver.49の家計簿本体は復元できません。\n復元可能：${partial.map(x=>x.label).join("・")}\n家計簿本体は変更せず、この部分だけ復元しますか？`))return;partial.forEach(x=>localStorage.setItem(x.key,x.value));location.reload();return;}const issues=collectIntegrityIssues(candidate);if(issues.some(x=>x.includes("不正な日付")||x.includes("IDがありません"))){const partial=partialPrefs();const details=issues.slice(0,5).join("\n");if(!partial.length)return alert(`バックアップ本体に復元できない問題があります。\n${details}\n復元できる部分もありません。現在のデータは変更していません。`);if(!await appConfirm(`バックアップ本体に復元できない問題があります。\n${details}\n\n復元可能：${partial.map(x=>x.label).join("・")}\n家計簿本体は変更せず、この部分だけ復元しますか？`))return;partial.forEach(x=>localStorage.setItem(x.key,x.value));location.reload();return;}if(!await appConfirm(`Ver.49形式のバックアップを復元します。\n確認事項：${issues.length}件\n現在の検証データを置き換えますか？`))return;clearDevRestoreKeys();localStorage.setItem(STORAGE_KEYS.state,JSON.stringify(candidate));if(ls[STORAGE_KEYS.sections]!==undefined)localStorage.setItem(STORAGE_KEYS.sections,String(ls[STORAGE_KEYS.sections]));if(ls[STORAGE_KEYS.stats]!==undefined)localStorage.setItem(STORAGE_KEYS.stats,String(ls[STORAGE_KEYS.stats]));localStorage.setItem(STORAGE_KEYS.migrated,"complete");location.reload();return;}
  const legacyRaw=ls[LEGACY_STORAGE_KEYS.state]??ls[PROD_STORAGE_KEYS.state];if(legacyRaw===undefined){const restorable=[];if(ls[LEGACY_STORAGE_KEYS.sections]??ls[PROD_STORAGE_KEYS.sections])restorable.push("表示設定");if(ls[LEGACY_STORAGE_KEYS.stats]??ls[PROD_STORAGE_KEYS.stats])restorable.push("表示状態");if(!restorable.length)return alert("復元できる家計簿データがありません。現在のデータは変更していません。");if(!await appConfirm(`家計簿本体は復元できません。${restorable.join('・')}だけ部分復元しますか？`))return;if(ls[LEGACY_STORAGE_KEYS.sections]??ls[PROD_STORAGE_KEYS.sections])localStorage.setItem(STORAGE_KEYS.sections,String(ls[LEGACY_STORAGE_KEYS.sections]??ls[PROD_STORAGE_KEYS.sections]));if(ls[LEGACY_STORAGE_KEYS.stats]??ls[PROD_STORAGE_KEYS.stats])localStorage.setItem(STORAGE_KEYS.stats,String(ls[LEGACY_STORAGE_KEYS.stats]??ls[PROD_STORAGE_KEYS.stats]));location.reload();return;}
  let legacy;try{legacy=JSON.parse(legacyRaw);}catch{return alert("旧形式データを解析できません。現在のデータは変更していません。");}const check=validateLegacyState(legacy);if(check.errors.length)return alert(`旧形式バックアップを変換できません。\n${check.errors.slice(0,6).map(x=>x.message).join('\n')}\n現在のデータは変更していません。`);if(!await appConfirm("Ver.48系バックアップをVer.49形式へ変換して検証環境へ復元しますか？"))return;const converted=convertLegacyState(legacy);clearDevRestoreKeys();localStorage.setItem(STORAGE_KEYS.state,JSON.stringify(converted));localStorage.setItem(STORAGE_KEYS.migrated,"complete");location.reload();
}

function validateLegacyState(legacy){
  const errors=[];if(!legacy||typeof legacy!=="object")return {errors:[{message:"旧データ本体を読み込めません"}]};
  [["expenses","支出"],["plannedExpenses","予定支出"],["fixedExpenses","固定費"]].forEach(([key,label])=>{if(legacy[key]!==undefined&&!Array.isArray(legacy[key]))errors.push({type:label,field:"structure",message:`${label}データの形式が不正です`});});
  const checkList=(arr,type)=>{(Array.isArray(arr)?arr:[]).forEach((x,i)=>{if(!isValidDateString(x?.date))errors.push({type,index:i,id:x?.id??"不明",field:"date",value:x?.date??"",message:`${type} ${x?.id??i}：日付が不正です`});if(!Number.isFinite(Number(x?.amount))||Number(x.amount)<0)errors.push({type,index:i,id:x?.id??"不明",field:"amount",message:`${type} ${x?.id??i}：金額が不正です`});});};
  checkList(legacy.expenses,"支出");checkList(legacy.plannedExpenses,"予定支出");
  return {errors};
}
function uniqueLegacyId(raw,prefix,used){let id=String(raw??"");if(!id||used.has(id))id=newId(prefix);used.add(id);return id;}
function convertLegacyState(legacy){
  const now=currentMonthKey(),out=createEmptyState(),used=new Set(),fixedLegacyMap=new Map();out.meta.migratedFrom="48-series";out.months[now]=createMonthRecord(normalizeSettings(legacy.settings),null);out.months[now].income={entered:true,value:Math.max(0,Number(legacy.income)||0)};out.months[now].bonus={entered:true,value:Math.max(0,Number(legacy.bonus)||0)};out.memory={...DEFAULT_MEMORY,...(legacy.memory||{})};
  (Array.isArray(legacy.fixedExpenses)?legacy.fixedExpenses:[]).forEach(f=>{const id=uniqueLegacyId(f.id,"f",used),day=Number(f.day),due=day>=1&&day<=31?{type:"day",day:Math.round(day)}:null,category=String(f.category||""),legacyAmount=Number(f.amount),amount=Number.isFinite(legacyAmount)&&legacyAmount>0?legacyAmount:0,needsReview=!category||!due||amount<=0;out.fixedExpenses.push({id,startMonth:now,endMonth:null,changes:[{effectiveMonth:now,amount,category,memo:String(f.memo||""),due}],paidMonths:{},needsReview,order:Number(f.order)||Date.now()});if(f.id!==undefined){const legacyKey=String(f.id),matches=fixedLegacyMap.get(legacyKey)||[];matches.push(id);fixedLegacyMap.set(legacyKey,matches);}});
  const plannedLegacyMap=new Map();(Array.isArray(legacy.plannedExpenses)?legacy.plannedExpenses:[]).forEach(p=>{const id=uniqueLegacyId(p.id,"p",used);out.plannedExpenses.push({id,amount:Math.max(0,Number(p.amount)||0),category:String(p.category||"その他"),memo:String(p.memo||""),date:String(p.date),order:Number(p.order)||Date.now(),status:"pending",confirmedExpenseId:null});if(p.id!==undefined){const key=String(p.id),list=plannedLegacyMap.get(key)||[];list.push(id);plannedLegacyMap.set(key,list);}});
  (Array.isArray(legacy.expenses)?legacy.expenses:[]).forEach(e=>{const id=uniqueLegacyId(e.id,"e",used),item={id,amount:Math.max(0,Number(e.amount)||0),category:String(e.category||"その他"),memo:String(e.memo||""),date:String(e.date),order:Number(e.order)||Date.now(),origin:null};const fixedLegacyKey=e.fixedId!==undefined?String(e.fixedId):null,fixedMatches=fixedLegacyKey===null?[]:(fixedLegacyMap.get(fixedLegacyKey)||[]);if(fixedMatches.length===1){const fid=fixedMatches[0],sourceMonth=validMonthKey(String(e.fixedMonth||""))?String(e.fixedMonth):monthOfDate(item.date),snapshot={amount:item.amount,category:item.category,memo:item.memo,date:item.date};const f=out.fixedExpenses.find(x=>x.id===fid);if(f&&sourceMonth===now){item.origin={type:"fixed",sourceId:fid,sourceMonth,snapshot,legacy:true};f.paidMonths[now]={expenseId:id,confirmedAt:"migration"};}else{item.legacyOrigin={type:"fixed",sourceId:fid,sourceMonth,snapshot,actionable:false};}}else if(fixedMatches.length>1){const sourceMonth=validMonthKey(String(e.fixedMonth||""))?String(e.fixedMonth):monthOfDate(item.date);item.legacyOrigin={type:"fixed",legacySourceId:fixedLegacyKey,sourceMonth,actionable:false};}else if(e.plannedSourceId!==undefined){const legacyKey=String(e.plannedSourceId),matches=plannedLegacyMap.get(legacyKey)||[];if(matches.length===1){const pid=matches[0],p=out.plannedExpenses.find(x=>String(x.id)===String(pid));if(p){p.status="confirmed";p.confirmedExpenseId=id;item.origin={type:"planned",sourceId:pid,sourceMonth:monthOfDate(item.date),snapshot:{amount:item.amount,category:item.category,memo:item.memo,date:item.date},legacy:true};}}else if(matches.length===0){const pid=uniqueLegacyId(e.plannedSourceId,"p",used);out.plannedExpenses.push({id:pid,amount:item.amount,category:item.category,memo:item.memo,date:item.date,order:item.order,status:"confirmed",confirmedExpenseId:id,migratedFromActual:true});item.origin={type:"planned",sourceId:pid,sourceMonth:monthOfDate(item.date),snapshot:{amount:item.amount,category:item.category,memo:item.memo,date:item.date},legacy:true};}else{item.legacyOrigin={type:"planned",legacySourceId:legacyKey,sourceMonth:monthOfDate(item.date),actionable:false};}}out.expenses.push(item);});
  return out;
}
function exportLegacyBackupForMigration(){
  const data={format:"money-rule-dev-backup",version:"48.02",schemaVersion:48,environment:"development",exportedAt:new Date().toISOString(),localStorage:{}};
  [LEGACY_STORAGE_KEYS.state,LEGACY_STORAGE_KEYS.sections,LEGACY_STORAGE_KEYS.stats].forEach(k=>{const v=localStorage.getItem(k);if(v!==null)data.localStorage[k]=v;});
  downloadJson(data,`money-rule-pre-v49-${getToday().replaceAll('-', '')}.json`);
  migrationBackupReady=true;
  const legacyStatus=readJsonStatus(LEGACY_STORAGE_KEYS.state),canMigrate=legacyStatus.exists&&!legacyStatus.error;
  $("startMigration").disabled=!canMigrate;
  setText("migrationStatus",canMigrate?"バックアップを書き出しました。移行を開始できます。":"バックアップを書き出しました。旧データのJSONが破損しているため、新規データは作成せず停止しています。データを修正して再読み込みしてください。");
}
function renderMigrationErrors(errors,legacy){const box=$("migrationErrors");box.innerHTML=errors.map((er,i)=>`<div class="migration-error-item"><strong>${escapeHtml(er.message)}</strong>${er.field==="date"?`<div class="migration-fix-row"><input type="date" data-migration-fix-date="${i}"><button type="button" data-save-migration-fix="${i}">日付を修正</button></div>`:''}</div>`).join("");box.querySelectorAll("[data-save-migration-fix]").forEach(b=>b.addEventListener("click",()=>{const er=errors[Number(b.dataset.saveMigrationFix)],input=box.querySelector(`[data-migration-fix-date="${b.dataset.saveMigrationFix}"]`);if(!er||!input||!isValidDateString(input.value))return alert("正しい日付を入力してください。");const arr=er.type==="支出"?legacy.expenses:legacy.plannedExpenses;if(!Array.isArray(arr)||!arr[er.index])return;arr[er.index].date=input.value;writeJson(LEGACY_STORAGE_KEYS.state,legacy);setText("migrationStatus","旧データの日付を修正しました。もう一度「移行を開始」を押してください。");}));}
function startMigration(){
  if(!migrationBackupReady)return alert("先にバックアップを保存してください。");
  const legacyStatus=readJsonStatus(LEGACY_STORAGE_KEYS.state);
  if(legacyStatus.error){$("startMigration").disabled=true;setText("migrationStatus","移行を中止しました。旧データのJSONを読み込めません。バックアップを保持したままデータを修正し、再読み込みしてください。");return;}
  const legacy=legacyStatus.value,check=validateLegacyState(legacy);
  if(check.errors.length){setText("migrationStatus",`移行を中止しました。${check.errors.length}件の問題があります。旧データは変更していません。`);renderMigrationErrors(check.errors,legacy);return;}
  const converted=convertLegacyState(legacy);
  const issues=collectIntegrityIssues(converted).filter(x=>x.includes("不正な日付")||x.includes("重複ID"));
  if(issues.length){setText("migrationStatus","移行後データの検証に失敗しました。旧データは変更していません。");return;}
  localStorage.setItem(STORAGE_KEYS.state,JSON.stringify(converted));
  const verify=normalizeCurrentState(readJson(STORAGE_KEYS.state,null));
  if(!verify){localStorage.removeItem(STORAGE_KEYS.state);setText("migrationStatus","保存後の検証に失敗しました。旧データは変更していません。");return;}
  localStorage.removeItem(LEGACY_STORAGE_KEYS.state);
  localStorage.setItem(STORAGE_KEYS.migrated,"complete");
  sessionStorage.setItem("moneyRuleDevV49MigrationCompleted","1");
  setText("migrationStatus","Ver.49へのデータ移行が完了しました。");
  setTimeout(()=>location.reload(),700);
}

function setMigrationStateStatus(text){const el=$("migrationStateStatus");if(el)el.textContent=text;}
function showBrokenLegacyMigrationGate(){
  $("migrationModal").classList.remove("hidden");
  migrationBackupReady=false;
  $("startMigration").disabled=true;
  setText("migrationStatus","旧ver.48.02検証データを読み込めません。新規Ver.49データは作成せず停止しています。先にバックアップを保存し、旧データを修正して再読み込みしてください。");
  setMigrationStateStatus("移行停止：旧ver.48.02検証データのJSONが破損しています");
  return true;
}

function showLegacyMigrationGate(legacyRaw,normalized){
  if(!legacyRaw)return false;
  $("migrationModal").classList.remove("hidden");
  const hasTemp=Boolean(normalized);
  setText("migrationStatus",hasTemp?"旧ver.48.02検証データを検出しました。現在のVer.49仮データは、移行成功時に置き換えます。先にバックアップを保存してください。":"旧ver.48.02検証データを検出しました。移行前バックアップを保存してから開始してください。");
  setMigrationStateStatus(hasTemp?"移行待ち：旧ver.48.02検証データあり／Ver.49仮データあり":"移行待ち：旧ver.48.02検証データあり");
  return true;
}

function applySectionPrefs(){const prefs=readJson(STORAGE_KEYS.sections,{});document.querySelectorAll("[data-section-content]").forEach(section=>{const hidden=prefs?.[section.dataset.sectionContent]===true;section.querySelectorAll(":scope > *:not(.section-title)").forEach(child=>child.classList.toggle("section-body-hidden",hidden));});document.querySelectorAll(".minus-btn").forEach(btn=>{const hidden=prefs?.[btn.dataset.section]===true;btn.textContent=hidden?"＋":"−";});}
function toggleSection(k){const prefs=readJson(STORAGE_KEYS.sections,{})||{};prefs[k]=prefs[k]!==true;writeJson(STORAGE_KEYS.sections,prefs);applySectionPrefs();}
function applyStatPrefs(){const prefs=readJson(STORAGE_KEYS.stats,{})||{},hidden=prefs.income===true;["incomeStat","extraIncomeStat"].forEach(id=>$(id)?.classList.toggle("stat-hidden",hidden));const b=$("incomeToggle");if(b)b.textContent=hidden?"前月の収入を表示":"前月の収入を非表示";}
function toggleIncomeStat(){const prefs=readJson(STORAGE_KEYS.stats,{})||{};prefs.income=!Boolean(prefs.income);writeJson(STORAGE_KEYS.stats,prefs);applyStatPrefs();}
function showMemoPopup(cell,event){const text=cell.dataset.memo||"";if(!text)return;const p=$("memoPopup");p.textContent=text;p.classList.remove("hidden");p.style.left=Math.min(window.innerWidth-12,event.clientX+8)+"px";p.style.top=Math.min(window.innerHeight-12,event.clientY+8)+"px";requestAnimationFrame(()=>{const r=p.getBoundingClientRect();p.style.left=Math.max(8,Math.min(window.innerWidth-r.width-8,event.clientX-r.width/2))+"px";p.style.top=Math.max(8,Math.min(window.innerHeight-r.height-8,event.clientY-r.height-12))+"px";});clearTimeout(window.__memoPopupTimer);window.__memoPopupTimer=setTimeout(()=>p.classList.add("hidden"),2000);}
function refreshDateContext(){const now=getToday();if(now===lastKnownToday)return;lastKnownToday=now;ensureMonthRecord(currentMonthKey());if(isCurrentSelected()){suppressDirty=true;if(!dirtyAreas.has("expense-entry"))$("expenseDate").value=sessionDefaultDate("expense");if(!dirtyAreas.has("planned-entry"))$("plannedDate").value=sessionDefaultDate("planned");suppressDirty=false;}renderAll();}

function bindEvents(){
  bindDirtyTracking();
  $("prevMonth").onclick=()=>switchMonth(addMonths(selectedMonth,-1));$("nextMonth").onclick=()=>switchMonth(addMonths(selectedMonth,1));$("returnCurrentMonth").onclick=()=>switchMonth(currentMonthKey());
  $("openMonthPicker").onclick=()=>{selectedPickerYear=monthParts(selectedMonth).y;earliestPickerYear=Math.min(selectedPickerYear-10,new Date().getFullYear()-10);renderMonthPicker();$("monthPickerModal").classList.remove("hidden");setTimeout(()=>{const active=$("yearList").querySelector(".year-btn.active");active?.scrollIntoView({block:"center"});},0);};$("closeMonthPicker").onclick=()=>$("monthPickerModal").classList.add("hidden");$("monthPickerModal").addEventListener("click",e=>{if(e.target===$("monthPickerModal"))$("monthPickerModal").classList.add("hidden");});
  $("yearList").addEventListener("click",e=>{const b=e.target.closest("[data-year]");if(b)renderMonthGrid(Number(b.dataset.year));});let extendingYears=false;$("yearList").addEventListener("scroll",()=>{const el=$("yearList");if(!extendingYears&&el.scrollTop+el.clientHeight>=el.scrollHeight-40){extendingYears=true;const oldTop=el.scrollTop;earliestPickerYear-=10;renderMonthPicker();requestAnimationFrame(()=>{el.scrollTop=oldTop;extendingYears=false;});}});$("monthGrid").addEventListener("click",e=>{const b=e.target.closest("[data-month]");if(!b)return;const key=b.dataset.month;$("monthPickerModal").classList.add("hidden");switchMonth(key);});
  document.querySelectorAll("[data-entry-tab]").forEach(tab=>tab.addEventListener("click",()=>{const k=tab.dataset.entryTab;document.querySelectorAll("[data-entry-tab]").forEach(t=>{const a=t===tab;t.classList.toggle("active",a);t.setAttribute("aria-selected",a?"true":"false");});document.querySelectorAll("[data-entry-panel]").forEach(p=>p.classList.toggle("active",p.dataset.entryPanel===k));}));
  $("addExpense").onclick=addExpense;$("addPlannedExpense").onclick=addPlanned;$("addFixedExpense").onclick=addFixed;
  $("expenseList").addEventListener("click",e=>{const b=e.target.closest("[data-edit]");if(b)openEdit(b.dataset.edit);});$("plannedList").addEventListener("click",e=>{const c=e.target.closest("[data-confirm-planned]"),ed=e.target.closest("[data-edit-planned]");if(c)return confirmPlanned(c.dataset.confirmPlanned);if(ed)openPlannedEdit(ed.dataset.editPlanned);});$("fixedList").addEventListener("click",e=>{const c=e.target.closest("[data-confirm-fixed]"),u=e.target.closest("[data-unpay-fixed]"),ed=e.target.closest("[data-edit-fixed]");if(c)return confirmFixed(c.dataset.confirmFixed);if(u)return unpayFixed(u.dataset.unpayFixed);if(ed)openFixedEdit(ed.dataset.editFixed);});
  $("closeModal").onclick=closeEdit;$("cancelEdit").onclick=closeEdit;$("saveEdit").onclick=saveExpenseEdit;$("deleteEditExpense").onclick=requestExpenseDelete;$("rollbackOrigin").onclick=()=>{const e=state.expenses.find(x=>String(x.id)===String($("editModal").dataset.id));if(!e)return;const t=expenseOriginType(e);if(t==="planned")rollbackPlannedExpense(e);if(t==="fixed")rollbackFixedExpense(e);};$("moveEditUp").onclick=()=>moveWithinSameDate(state.expenses,$("editModal").dataset.id,"up",renderExpenses,openEdit);$("moveEditDown").onclick=()=>moveWithinSameDate(state.expenses,$("editModal").dataset.id,"down",renderExpenses,openEdit);
  $("closePlannedModal").onclick=closePlannedEdit;$("cancelPlannedEdit").onclick=closePlannedEdit;$("savePlannedEdit").onclick=savePlannedEdit;$("deletePlannedEditExpense").onclick=requestPlannedDelete;$("movePlannedEditUp").onclick=()=>moveWithinSameDate(state.plannedExpenses,$("plannedEditModal").dataset.id,"up",renderPlannedExpenses,openPlannedEdit);$("movePlannedEditDown").onclick=()=>moveWithinSameDate(state.plannedExpenses,$("plannedEditModal").dataset.id,"down",renderPlannedExpenses,openPlannedEdit);
  $("closeFixedModal").onclick=closeFixedEdit;$("cancelFixedEdit").onclick=closeFixedEdit;$("saveFixedEdit").onclick=saveFixedEdit;$("deleteFixedFromMonth").onclick=deleteFixedFromMonth;$("deleteFixedCompletely").onclick=deleteFixedCompletely;$("moveFixedEditUp").onclick=()=>moveFixedWithinDue($("fixedEditModal").dataset.id,"up");$("moveFixedEditDown").onclick=()=>moveFixedWithinDue($("fixedEditModal").dataset.id,"down");
  ["editModal","plannedEditModal","fixedEditModal"].forEach(id=>$(id).addEventListener("click",e=>{if(e.target===$(id)){if(id==="editModal")closeEdit();if(id==="plannedEditModal")closePlannedEdit();if(id==="fixedEditModal")closeFixedEdit();}}));
  $("closeDeleteConfirm").onclick=closeDeleteConfirm;$("cancelDeleteConfirm").onclick=closeDeleteConfirm;$("confirmDeleteExpense").onclick=confirmDelete;$("deleteConfirmModal").addEventListener("click",e=>{if(e.target===$("deleteConfirmModal"))closeDeleteConfirm();});
  $("closeAppConfirm").onclick=()=>closeAppConfirm(false);$("cancelAppConfirm").onclick=()=>closeAppConfirm(false);$("acceptAppConfirm").onclick=()=>closeAppConfirm(true);$("appConfirmModal").addEventListener("click",e=>{if(e.target===$("appConfirmModal"))closeAppConfirm(false);});
  $("saveIncome").onclick=saveIncome;$("clearIncome").onclick=clearIncome;$("clearBonus").onclick=clearBonus;$("saveSettings").onclick=saveSettings;$("incomeToggle").onclick=toggleIncomeStat;
  $("runIntegrityCheck").onclick=runIntegrityCheck;$("exportBackup").onclick=exportCurrentBackup;$("importBackupButton").onclick=()=>$("importBackup").click();$("importBackup").addEventListener("change",e=>{importBackupFile(e.target.files?.[0]);e.target.value="";});
  document.addEventListener("click",e=>{const m=e.target.closest(".memo-cell");if(m)showMemoPopup(m,e);const minus=e.target.closest(".minus-btn");if(minus)toggleSection(minus.dataset.section);});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshDateContext();});window.addEventListener("focus",refreshDateContext);
  window.setInterval(refreshDateContext,60000);
  $("migrationBackup").onclick=exportLegacyBackupForMigration;$("startMigration").onclick=startMigration;
}

function bootstrap(){
  buildCategoryControls();buildDueSelect("fixedDue");buildDueSelect("fixedEditDue");bindEvents();
  const currentRaw=readJson(STORAGE_KEYS.state,null),normalized=normalizeCurrentState(currentRaw);
  const legacyStatus=readJsonStatus(LEGACY_STORAGE_KEYS.state),legacyRaw=legacyStatus.value;
  const migrationMarker=localStorage.getItem(STORAGE_KEYS.migrated);
  if(legacyStatus.exists&&legacyStatus.error&&migrationMarker!=="complete"){showBrokenLegacyMigrationGate();return;}

  if(legacyRaw&&migrationMarker!=="complete"){showLegacyMigrationGate(legacyRaw,normalized);return;}

  if(normalized){
    state=normalized;selectedMonth=currentMonthKey();ensureMonthRecord(selectedMonth);loadMonthForms();resetEntryTab();renderAll();
    setMigrationStateStatus(migrationMarker==="complete"?"Ver.49形式：移行済み":"Ver.49形式：利用中（旧ver.48.02検証データは見つかりません）");
    if(sessionStorage.getItem("moneyRuleDevV49MigrationCompleted")==="1"){sessionStorage.removeItem("moneyRuleDevV49MigrationCompleted");setTimeout(()=>alert("Ver.49へのデータ移行が完了しました。"),50);}
    return;
  }

  if(legacyRaw){showLegacyMigrationGate(legacyRaw,null);return;}

  state=createEmptyState();state.months[currentMonthKey()]=createMonthRecord(null,null);save();
  localStorage.setItem(STORAGE_KEYS.migrated,"fresh");
  selectedMonth=currentMonthKey();loadMonthForms();resetEntryTab();renderAll();
  setMigrationStateStatus("旧ver.48.02検証データが見つからないため、新規Ver.49検証データとして開始しています。");
}
bootstrap();
