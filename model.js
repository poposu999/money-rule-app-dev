/* Pure schema-50 model. No DOM access, no implicit normalization or writes. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)), fields=['amount','category','memo','due'];
const month=x=>typeof x==='string'&&/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(x);
function date(x){if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||!month(x.slice(0,7)))return false;const [y,m,d]=x.split('-').map(Number);return d>=1&&d<=new Date(y,m,0).getDate();}
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const dueOK=x=>object(x)&&(x.type==='eom'||x.type==='day'&&Number.isInteger(x.day)&&x.day>=1&&x.day<=31);
const valueOK=(k,v)=>k==='amount'?typeof v==='number'&&Number.isFinite(v)&&v>=0:k==='due'?dueOK(v):typeof v==='string'&&(k!=='category'||v.trim()!=='');
function scheduledDate(key,due){if(!month(key)||!dueOK(due))return '';const [y,m]=key.split('-').map(Number),last=new Date(y,m,0).getDate();return key+'-'+String(due.type==='eom'?last:Math.min(last,due.day)).padStart(2,'0');}
function baseConfig(f,key){
  if(!f||!month(key)||key<f.startMonth||f.endMonth&&key>=f.endMonth)return null;
  const out={};for(const c of [...(f.schedule||[])].sort((a,b)=>a.month.localeCompare(b.month)))if(c.month<=key)Object.assign(out,c.patch);
  return out;
}
function config(f,key){const b=baseConfig(f,key);if(!b)return null;const out={...b,...f.overrides?.[key]},payment=f.payments?.[key];if(payment?.values)Object.assign(out,payment.values);return out;}
function payment(f,key){return f.payments?.[key]||{status:'unpaid'};}
function sources(s){
  const out=s.plannedExpenses.map(p=>({kind:'planned',id:p.id,month:p.date?.slice(0,7),record:p,status:p.status==='confirmed'?'paid':'unpaid',expenseId:p.confirmedExpenseId}));
  for(const f of s.fixedExpenses)for(const [key,p]of Object.entries(f.payments||{}))out.push({kind:'fixed',id:f.id,month:key,record:f,status:p.status,expenseId:p.expenseId});return out;
}
const sourceKey=r=>`${r.kind}:${r.id}:${r.kind==='fixed'?r.month:''}`;
function check(s){
  const issues=[];const add=(type,refs=[],months=[],expenses=[],fatal=false,detail='')=>issues.push({type,refs,months:[...new Set(months.filter(month))],expenses:[...new Set(expenses.filter(Boolean))],fatal,detail});
  if(!object(s)||s.schemaVersion!==50||!object(s.months)||!Array.isArray(s.expenses)||!Array.isArray(s.plannedExpenses)||!Array.isArray(s.fixedExpenses)){add('structure',[],[],[],true);return issues;}
  const ids=new Map();
  for(const [kind,arr]of [['expense',s.expenses],['planned',s.plannedExpenses],['fixed',s.fixedExpenses]])for(const r of arr){
    const ref={kind,id:r?.id};if(!object(r)||typeof r.id!=='string'||!r.id){add('missing-id',[ref],[],[],true);continue;}
    if(ids.has(r.id))add('duplicate-id',[ids.get(r.id),ref],[],[],true);else ids.set(r.id,ref);
    if(kind!=='fixed'){
      if(!date(r.date))add('invalid-date',[ref],[],[],true);
      if(!valueOK('amount',r.amount)||!valueOK('category',r.category)||typeof r.memo!=='string')add('invalid-value',[ref],[r.date?.slice(0,7)],kind==='expense'?[r.id]:[],true);
      if(kind==='planned'&&!['pending','confirmed'].includes(r.status))add('invalid-status',[ref],[r.date?.slice(0,7)],r.confirmedExpenseId?[r.confirmedExpenseId]:[]);
    }else{
      if(!month(r.startMonth)||r.endMonth&&(!month(r.endMonth)||r.endMonth<=r.startMonth))add('invalid-month',[ref],[],[],true);
      if(!Array.isArray(r.schedule)||!object(r.overrides)||!object(r.payments)){add('fixed-structure',[ref],[],[],true);continue;}
      const seen=new Set();for(const c of r.schedule){if(!object(c)||!month(c.month)||!object(c.patch)||seen.has(c.month)){add('invalid-history',[ref],[],[],true);continue;}seen.add(c.month);for(const [k,v]of Object.entries(c.patch))if(!fields.includes(k)||!valueOK(k,v))add('invalid-setting',[{...ref,from:c.month}],[c.month],[],false,k);}
      const initial=baseConfig(r,r.startMonth);for(const k of fields)if(!valueOK(k,initial?.[k]))add('invalid-setting',[{...ref,from:r.startMonth}],[r.startMonth],[],false,k);
      for(const [m,p]of Object.entries(r.overrides)){if(!month(m)||!object(p)){add('invalid-override',[ref],[],[],true);continue;}for(const [k,v]of Object.entries(p))if(!fields.includes(k)||!valueOK(k,v))add('invalid-setting',[{...ref,month:m}],[m],[],false,k);}
      for(const [m,p]of Object.entries(r.payments)){if(!month(m)||!object(p)){add('invalid-payment',[ref],[],[],true);continue;}const mr={...ref,month:m};
        if(!['paid','unpaid','skipped'].includes(p.status))add('invalid-status',[mr],[m]);
        if(p.status==='paid'&&p.skipped===true)add('paid-and-skipped',[mr],[m],[p.expenseId]);
        if(p.lastActualDate&&!date(p.lastActualDate))add('invalid-date',[mr],[m],[],true);
        if(p.values&&(!object(p.values)||Object.keys(p.values).some(k=>!['amount','category','memo'].includes(k)||!valueOK(k,p.values[k]))))add('invalid-setting',[mr],[m]);
      }
    }
  }
  for(const [m,r]of Object.entries(s.months)){if(!month(m)||!object(r)){add('invalid-month',[],[],[],true);continue;}for(const k of ['income','bonus'])if(!object(r[k])||typeof r[k].entered!=='boolean'||!Number.isFinite(r[k].value)||r[k].value<0)add('income-structure',[],[m],[],true);}
  if(s.rulePlan!==undefined){const p=s.rulePlan;if(!object(p)||p.version!==1||!object(p.changes)||!object(p.overrides))add('rule-structure',[],[],[],true);else for(const kind of ['changes','overrides'])for(const [m,v]of Object.entries(p[kind]))if(!month(m)||!(kind==='overrides'&&v===null)&&(!object(v)||['minimumTakeHome','savingsTarget','extraAllowancePercent','extraSavingsPercent'].some(k=>!Number.isFinite(v[k])||v[k]<0)||v.extraAllowancePercent+v.extraSavingsPercent!==100))add('rule-value',[],[m],[],true);}
  if(issues.some(i=>i.fatal))return issues;
  const refs=sources(s),ex=new Map(s.expenses.map(e=>[e.id,e])),byExpense=new Map(),bySource=new Map();
  for(const r of refs){if(r.expenseId){const owners=byExpense.get(r.expenseId)||[];owners.push(r);byExpense.set(r.expenseId,owners);}const e=ex.get(r.expenseId);
    if(r.status==='paid'&&!e)add('missing-expense',[r],[r.month],[r.expenseId]);
    if(r.status!=='paid'&&r.expenseId)add('unpaid-link',[r],[r.month,e?.date.slice(0,7)],[r.expenseId]);
    if(e&&(!e.origin||e.origin.type!==r.kind||String(e.origin.sourceId)!==r.id||r.kind==='fixed'&&e.origin.sourceMonth!==r.month))add('mismatched-link',[r],[r.month,e.date.slice(0,7)],[e.id]);
  }
  for(const e of s.expenses){const o=e.origin;if(!o)continue;const er={kind:'expense',id:e.id};if(!object(o)||!['planned','fixed'].includes(o.type)||typeof o.sourceId!=='string'||!o.sourceId){add('invalid-origin',[er],[e.date.slice(0,7)],[e.id]);continue;}
    if(o.type==='fixed'&&!month(o.sourceMonth)){add('invalid-source-month',[er],[],[e.id],true);continue;}
    const owner=refs.find(r=>r.kind===o.type&&r.id===String(o.sourceId)&&(o.type!=='fixed'||r.month===o.sourceMonth));
    const src=o.type==='fixed'?s.fixedExpenses.find(f=>f.id===String(o.sourceId)):s.plannedExpenses.find(p=>p.id===String(o.sourceId));
    const rr=owner||{kind:o.type,id:String(o.sourceId),month:o.type==='fixed'?o.sourceMonth:src?.date.slice(0,7)};
    const matches=bySource.get(sourceKey(rr))||[];matches.push(e);bySource.set(sourceKey(rr),matches);
    if(!src)add('missing-source',[er,rr],[e.date.slice(0,7),rr.month],[e.id]);
    else if(!owner||owner.status!=='paid')add('unpaid-linked-expense',[rr],[rr.month,e.date.slice(0,7)],[e.id]);
    else if(owner.expenseId!==e.id)add('mismatched-link',[rr],[rr.month,e.date.slice(0,7)],[e.id,owner.expenseId]);
    else {const v=o.type==='fixed'?payment(src,o.sourceMonth).values:src;if(!v||['amount','category','memo',...(o.type==='planned'?['date']:[])].some(k=>v[k]!==e[k]))add('value-mismatch',[rr],[rr.month,e.date.slice(0,7)],[e.id]);}
  }
  for(const [eid,rs]of byExpense)if(rs.length>1)add('multiple-sources',rs,[...rs.map(r=>r.month),ex.get(eid)?.date.slice(0,7)],[eid]);
  for(const es of bySource.values())if(es.length>1){const o=es[0].origin;add('multiple-expenses',[{kind:o.type,id:String(o.sourceId),month:o.sourceMonth}],[o.sourceMonth,...es.map(e=>e.date.slice(0,7))],es.map(e=>e.id));}
  return issues.map(i=>({...i,refs:i.refs.map(r=>{const f=r.kind==='fixed'?s.fixedExpenses.find(f=>f.id===r.id):null;const to=r.from&&f?[f.endMonth,...f.schedule.filter(c=>c.month>r.from&&Object.hasOwn(c.patch,i.detail)).map(c=>c.month)].filter(Boolean).sort()[0]:null;return {kind:r.kind,id:r.id,...(r.month?{month:r.month}:{}),...(r.from?{from:r.from}:{}),...(to?{to}:{})};})}));
}
function affected(issue,ref){return issue.refs.some(r=>r.kind===ref.kind&&r.id===ref.id&&(ref.kind!=='fixed'||!ref.month||(r.from?(!r.to||ref.month<r.to)&&(ref.onward||ref.month>=r.from):!r.month||r.month===ref.month||ref.onward&&r.month>=ref.month)))||ref.kind==='expense'&&issue.expenses.includes(ref.id);}
function guard(s,refs){const issues=check(s);if(issues.some(i=>i.fatal||refs.some(r=>affected(i,r))))throw Error('要確認の記録です。データ管理の手動修復を開いてください。');}
function assertCandidate(before,after,repair=false){const issues=check(after);if(issues.some(x=>x.fatal))throw Error('保存できないデータ構造です。');const prev=check(before);if(!repair&&issues.some(i=>!prev.some(p=>equal(p,i))))throw Error('この操作で新しい整合性エラーが発生します。');return issues;}
function patchFixed(f,key,patch,scope){
  const pay=payment(f,key);if(pay.status==='paid'){const values={...config(f,key)};for(const k of ['amount','category','memo'])if(k in patch)values[k]=patch[k];pay.values=Object.fromEntries(['amount','category','memo'].map(k=>[k,values[k]]));if('due'in patch){f.overrides[key]={...f.overrides[key],due:copy(patch.due)};}return;}
  if(scope==='onward'){
    const c=f.schedule.find(c=>c.month===key);if(c)Object.assign(c.patch,copy(patch));else f.schedule.push({month:key,patch:copy(patch)});
    f.schedule.sort((a,b)=>a.month.localeCompare(b.month));
    // The edited fields at the selected month become part of the new baseline.
    for(const k of Object.keys(patch))if(f.overrides[key])delete f.overrides[key][k];
  }else{
    const normal=baseConfig(f,key);for(const [k,v]of Object.entries(patch)){f.overrides[key]??={};if(equal(v,normal[k]))delete f.overrides[key][k];else f.overrides[key][k]=copy(v);}
  }
  if(f.overrides[key]&&!Object.keys(f.overrides[key]).length)delete f.overrides[key];
  // Saved values after rollback are explicit per-month values, not recurring settings.
  if(pay.values)for(const k of Object.keys(patch))if(k!=='due')delete pay.values[k];
}
function findSource(s,ref){return ref.kind==='fixed'?s.fixedExpenses.find(f=>f.id===ref.id):s.plannedExpenses.find(p=>p.id===ref.id);}
function valuesOf(e){return {amount:e.amount,category:e.category,memo:e.memo};}
function link(s,ref,e){const r=findSource(s,ref);if(!r)throw Error('対応元がありません。');
  if(ref.kind==='planned'){Object.assign(r,valuesOf(e),{date:e.date,status:'confirmed',confirmedExpenseId:e.id});}
  else{r.payments[ref.month]={...payment(r,ref.month),status:'paid',expenseId:e.id,values:valuesOf(e),lastActualDate:e.date};delete r.payments[ref.month].skipped;}
  e.origin={type:ref.kind,sourceId:r.id,sourceMonth:ref.kind==='fixed'?ref.month:e.date.slice(0,7)};
}
function rollback(s,ref){const r=findSource(s,ref);if(!r)throw Error('対応元がありません。');const p=ref.kind==='fixed'?payment(r,ref.month):r,e=s.expenses.find(e=>e.id===(ref.kind==='fixed'?p.expenseId:r.confirmedExpenseId));
  if(e){if(ref.kind==='planned')Object.assign(r,valuesOf(e),{date:e.date});else Object.assign(p,{values:valuesOf(e),lastActualDate:e.date});s.expenses=s.expenses.filter(x=>x.id!==e.id);}
  if(ref.kind==='planned'){r.status='pending';r.confirmedExpenseId=null;}else{p.status='unpaid';delete p.expenseId;delete p.skipped;r.payments[ref.month]=p;}
}
function unlinkSource(s,ref){const r=findSource(s,ref);if(!r)return;const eid=ref.kind==='fixed'?payment(r,ref.month).expenseId:r.confirmedExpenseId;
  for(const e of s.expenses)if(e.origin?.type===ref.kind&&String(e.origin.sourceId)===ref.id&&(ref.kind!=='fixed'||e.origin.sourceMonth===ref.month)||e.id===eid&&(!e.origin||!findSource(s,{kind:e.origin.type,id:e.origin.sourceId})))e.origin=null;
  if(ref.kind==='planned'){r.status='pending';r.confirmedExpenseId=null;}else {const p=payment(r,ref.month);p.status='unpaid';delete p.expenseId;delete p.skipped;r.payments[ref.month]=p;}
}
function editExpense(s,e,patch){Object.assign(e,patch);if(e.origin){const ref={kind:e.origin.type,id:String(e.origin.sourceId),month:e.origin.sourceMonth};link(s,ref,e);}}
function commitAction(s,action){const out=copy(s);const {ref}=action;const guarded=ref.kind==='fixed'&&action.type==='delete'?(action.from?{...ref,month:action.from,onward:true}:{kind:ref.kind,id:ref.id}):ref;guard(s,[guarded]);const r=ref.kind==='expense'?out.expenses.find(e=>e.id===ref.id):findSource(out,ref);if(!r)throw Error('記録がありません。');
  if(action.edit){if(ref.kind==='fixed')patchFixed(r,ref.month,action.edit,action.scope||'once');else if(ref.kind==='planned'){Object.assign(r,action.edit);if(r.status==='confirmed'){const e=out.expenses.find(e=>e.id===r.confirmedExpenseId);Object.assign(e,valuesOf(r),{date:r.date});link(out,ref,e);}}else editExpense(out,r,action.edit);}
  if(ref.kind==='fixed'&&payment(r,ref.month).status==='paid'&&(action.edit||action.actualDate)){const e=out.expenses.find(e=>e.id===payment(r,ref.month).expenseId);Object.assign(e,payment(r,ref.month).values);if(action.actualDate)e.date=action.actualDate;link(out,ref,e);}
  if(action.orders){const arr=ref.kind==='fixed'?out.fixedExpenses:ref.kind==='planned'?out.plannedExpenses:out.expenses;for(const x of arr)if(Object.hasOwn(action.orders,x.id)){guard(s,[{kind:ref.kind,id:x.id,month:ref.month}]);x.order=action.orders[x.id];}}
  if(action.type==='confirm'){
    const paid=ref.kind==='fixed'?payment(r,ref.month).status==='paid':r.status==='confirmed';if(paid)throw Error('すでに支払済みです。');
    if(ref.kind==='fixed'&&payment(r,ref.month).status==='skipped')throw Error('先に支払い対象へ戻してください。');
    const v=ref.kind==='fixed'?config(r,ref.month):r,e={id:action.expenseId,...valuesOf(v),amount:action.amount,date:action.date,order:action.order||Date.now(),origin:null};
    if(!date(e.date)||!valueOK('amount',e.amount)||e.amount<=0)throw Error('実際の支払額と日付を確認してください。');out.expenses.push(e);link(out,ref,e);
  }else if(action.type==='rollback')rollback(out,ref.kind==='expense'?{kind:r.origin.type,id:String(r.origin.sourceId),month:r.origin.sourceMonth}:ref);
  else if(action.type==='skip'||action.type==='restore'){
    if(ref.kind!=='fixed'||payment(r,ref.month).status==='paid')throw Error('先に未払いへ戻してください。');r.payments[ref.month]={...payment(r,ref.month),status:action.type==='skip'?'skipped':'unpaid'};
  }else if(action.type==='delete'){
    if(ref.kind==='expense'){if(r.origin)rollback(out,{kind:r.origin.type,id:String(r.origin.sourceId),month:r.origin.sourceMonth});else out.expenses=out.expenses.filter(e=>e.id!==r.id);}
    else if(ref.kind==='planned'){unlinkSource(out,ref);out.plannedExpenses=out.plannedExpenses.filter(p=>p.id!==r.id);}
    else{for(const m of Object.keys(r.payments))if(!action.from||m>=action.from)unlinkSource(out,{...ref,month:m});for(const e of out.expenses)if(e.origin?.type==='fixed'&&e.origin.sourceId===r.id&&(!action.from||e.origin.sourceMonth>=action.from))e.origin=null;
      if(action.from&&action.from>r.startMonth){r.endMonth=action.from;r.schedule=r.schedule.filter(c=>c.month<action.from);for(const kind of ['payments','overrides'])for(const m of Object.keys(r[kind]))if(m>=action.from)delete r[kind][m];}else out.fixedExpenses=out.fixedExpenses.filter(f=>f.id!==r.id);}
  }
  if(ref.kind==='fixed'&&action.type==='edit'&&payment(r,ref.month).status==='paid'){const e=out.expenses.find(e=>e.id===payment(r,ref.month).expenseId);Object.assign(e,payment(r,ref.month).values);if(action.actualDate)e.date=action.actualDate;link(out,ref,e);}
  assertCandidate(s,out);return out;
}
function legacy49(raw){
  const s=copy(raw);if(s.schemaVersion!==49||!Array.isArray(s.fixedExpenses))throw Error('ver.49形式ではありません。');s.schemaVersion=50;
  for(const f of s.fixedExpenses){const last={},schedule=[];if(!Array.isArray(f.changes))throw Error('固定費履歴が不正です。');const seen=new Set();
    for(const c of [...f.changes].sort((a,b)=>String(a.effectiveMonth).localeCompare(String(b.effectiveMonth)))){if(!month(c.effectiveMonth)||seen.has(c.effectiveMonth))throw Error('固定費履歴の対象月が不正・重複しています。');seen.add(c.effectiveMonth);const patch={};for(const k of fields){const value=k==='due'?(c.due??(c.day?{type:'day',day:c.day}:null)):c[k];if(!equal(last[k],value)){patch[k]=copy(value??null);last[k]=copy(value??null);}}if(Object.keys(patch).length)schedule.push({month:c.effectiveMonth,patch});}
    f.schedule=schedule;f.overrides={};f.payments={};for(const [m,p]of Object.entries(f.paidMonths||{}))f.payments[m]={status:'paid',expenseId:p.expenseId};for(const [m,skip]of Object.entries(f.skippedMonths||{})){if(skip!==true)throw Error('支払いなし情報が不正です。');if(f.payments[m])f.payments[m].skipped=true;else f.payments[m]={status:'skipped'};}delete f.changes;delete f.paidMonths;delete f.skippedMonths;
  }
  const issues=check(s);if(issues.some(i=>i.fatal))throw Error('ID・日付・保存構造を安全に変換できません。元データを保持しています。');
  const rs=sources(s);for(const r of rs){if(r.status!=='paid')continue;const e=s.expenses.find(x=>x.id===r.expenseId);const blocking=issues.some(i=>i.type!=='value-mismatch'&&affected(i,r));if(e&&!blocking)link(s,r,e);}
  return s;
}
function legacy48(raw,key){
  if(!object(raw)||!month(key))throw Error('旧形式を判別できません。');const ids=new Set();for(const name of ['expenses','plannedExpenses','fixedExpenses']){if(raw[name]!==undefined&&!Array.isArray(raw[name]))throw Error('旧形式の配列が不正です。');for(const r of raw[name]||[]){if(!r?.id||ids.has(String(r.id)))throw Error('旧形式のID欠落・重複を解決できません。');ids.add(String(r.id));if(name!=='fixedExpenses'&&!date(r.date))throw Error('旧形式の日付が不正です。');}}
  const s={schemaVersion:50,months:{[key]:{income:{entered:true,value:Number(raw.income||0)},bonus:{entered:true,value:Number(raw.bonus||0)},settings:raw.settings||null}},expenses:[],plannedExpenses:[],fixedExpenses:[],memory:copy(raw.memory||{}),meta:{migratedFrom:'48-series'}};
  for(const p of raw.plannedExpenses||[])s.plannedExpenses.push({...copy(p),id:String(p.id),memo:p.memo||'',category:p.category||'その他',status:'pending',confirmedExpenseId:null});
  for(const f of raw.fixedExpenses||[])s.fixedExpenses.push({id:String(f.id),startMonth:key,endMonth:null,order:f.order||0,schedule:[{month:key,patch:{amount:f.amount,category:f.category||'',memo:f.memo||'',due:f.day?{type:'day',day:Number(f.day)}:null}}],overrides:{},payments:{}});
  for(const old of raw.expenses||[]){const e={...copy(old),id:String(old.id),category:old.category||'その他',memo:old.memo||'',origin:null};s.expenses.push(e);if(old.fixedId!==undefined){if(!month(old.fixedMonth))throw Error('旧固定費の元対象月を特定できません。');e.origin={type:'fixed',sourceId:String(old.fixedId),sourceMonth:old.fixedMonth};}else if(old.plannedSourceId!==undefined)e.origin={type:'planned',sourceId:String(old.plannedSourceId),sourceMonth:e.date.slice(0,7)};}
  // Only unique, explicitly represented relationships can be upgraded. Missing sources remain issues.
  for(const e of s.expenses){const o=e.origin;if(!o)continue;const ref={kind:o.type,id:o.sourceId,month:o.sourceMonth},r=findSource(s,ref);const count=s.expenses.filter(x=>x.origin?.type===o.type&&x.origin.sourceId===o.sourceId&&(o.type!=='fixed'||x.origin.sourceMonth===o.sourceMonth)).length;if(r&&count===1&&(o.type!=='fixed'||o.sourceMonth>=r.startMonth))link(s,ref,e);}
  if(check(s).some(i=>i.fatal))throw Error('旧形式を安全に変換できません。');return s;
}
class Store{
  constructor(storage,prefix='moneyRuleDevV50'){this.storage=storage;this.prefix=prefix;this.head=null;this.state=null;}
  load(){const h=this.storage.getItem(this.prefix+':head');this.head=h;if(!h)return null;const head=JSON.parse(h),raw=this.storage.getItem(this.prefix+':'+head.slot);if(!raw)throw Error('保存本体が見つかりません。');const payload=JSON.parse(raw);if(payload.revision!==head.revision||!equal(payload.token,head.token)||check(payload.state).some(i=>i.fatal))throw Error('保存本体を安全に読み込めません。');this.state=payload.state;return copy(this.state);}
  commit(candidate){if(check(candidate).some(i=>i.fatal))throw Error('保存データが不正です。');const current=this.storage.getItem(this.prefix+':head');if(current!==this.head)throw Error('別画面で更新されました。再読み込みしてください。');let old=null,damaged=false;try{old=current?JSON.parse(current):null;if(old&&(!old.slot||!Number.isInteger(old.revision)))damaged=true;}catch{damaged=true;}const slot=damaged?'recovery-'+Date.now()+'-'+Math.random():old?.slot==='a'?'b':'a',revision=(damaged?0:old?.revision||0)+1,token=Date.now()+'-'+Math.random(),body=JSON.stringify({revision,token,state:candidate}),key=this.prefix+':'+slot;
    this.storage.setItem(key,body);if(this.storage.getItem(key)!==body)throw Error('保存後の検証に失敗しました。');if(this.storage.getItem(this.prefix+':head')!==current)throw Error('保存先が変更されました。');
    const head=JSON.stringify({slot,revision,token});this.storage.setItem(this.prefix+':head',head);
    if(this.storage.getItem(this.prefix+':head')!==head){if(current===null)this.storage.removeItem(this.prefix+':head');else this.storage.setItem(this.prefix+':head',current);throw Error('切替後の読み戻しに失敗しました。');}
    this.head=head;this.state=copy(candidate);return copy(candidate);
  }
}
function repair(s,plan){const out=copy(s);if(check(s).some(i=>i.fatal))throw Error('識別できないデータはバックアップから復旧してください。');const ref=plan.ref;
  if(plan.type==='detach-expense'){const e=out.expenses.find(e=>e.id===plan.expenseId);if(!e)throw Error('実支出がありません。');for(const r of sources(out))if(r.expenseId===e.id)unlinkSource(out,r);e.origin=null;}
  else if(plan.type==='unlink'){unlinkSource(out,ref);}
  else if(plan.type==='create'){const r=findSource(out,ref);if(!r)throw Error('元項目がありません。');unlinkSource(out,ref);const v=ref.kind==='fixed'?config(r,ref.month):r;const e={id:plan.newId,...valuesOf(v),amount:plan.amount,date:plan.date,order:Date.now(),origin:null};if(!date(e.date)||!Number.isFinite(e.amount)||e.amount<=0)throw Error('金額と日付を確認してください。');out.expenses.push(e);link(out,ref,e);}
  else if(plan.type==='relink'){
    const e=out.expenses.find(e=>e.id===plan.expenseId);if(!e)throw Error('実支出がありません。');
    // Explicit owner selection releases competing owners, while retaining every expense.
    const others=sources(out).filter(r=>r.expenseId===e.id&&sourceKey(r)!==sourceKey(ref));
    if(others.length&&!plan.releaseOthers)throw Error('他の対応元を未払いに戻す確認が必要です。');
    for(const r of others)unlinkSource(out,r);if(e.origin&&sourceKey({kind:e.origin.type,id:e.origin.sourceId,month:e.origin.sourceMonth})!==sourceKey(ref))unlinkSource(out,{kind:e.origin.type,id:e.origin.sourceId,month:e.origin.sourceMonth});
    unlinkSource(out,ref);link(out,ref,e);
  }else if(plan.type==='skip'){unlinkSource(out,ref);const r=findSource(out,ref);r.payments[ref.month]={...payment(r,ref.month),status:'skipped'};}
  else if(plan.type==='keep-paid'){const r=findSource(out,ref),p=payment(r,ref.month);delete p.skipped;if(!p.expenseId||!out.expenses.some(e=>e.id===p.expenseId))throw Error('対応する実支出を先に修復してください。');}
  else throw Error('修復方法が不明です。');
  assertCandidate(s,out,true);return out;
}
const api={copy,equal,month,date,dueOK,scheduledDate,baseConfig,config,payment,check,guard,affected,sources,sourceKey,patchFixed,commitAction,legacy49,legacy48,repair,Store,findSource,valuesOf,assertCandidate};
if(typeof module!=='undefined')module.exports=api;root.MoneyModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
