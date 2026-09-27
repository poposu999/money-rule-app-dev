/* Schema-50 UI integration. Loaded after app.js; legacy bootstrap is disabled. */
'use strict';
const M=MoneyModel,v50Store=new M.Store(localStorage);
let v50Issues=[],v50Editor=null,v50Busy=false,v50Committed=null,v50Generation=0;
const v50FieldNames={amount:'金額',category:'カテゴリ',memo:'メモ',due:'毎月の支払日',date:'日付'};
const v50OldRender=renderAll;
function v50Snapshot(){return M.copy(state);}
function v50Accept(candidate,{repair=false}={}){
  if(state)M.assertCandidate(v50Committed||state,candidate,repair);
  const next=v50Store.commit(candidate);state=next;v50Committed=M.copy(next);v50Generation++;v50Issues=M.check(state);return next;
}
async function v50Locked(fn){if(v50Busy)return;v50Busy=true;try{if(navigator.locks)return await navigator.locks.request('money-rule-dev-v50-write',fn);return await fn();}catch(e){await v50Dialog('操作を完了できませんでした',`<p>${escapeHtml(e.message||'保存前のデータを維持しています。')}</p>`,[['cancel','編集画面に戻る']]);}finally{v50Busy=false;}}
function v50Guard(ref){try{M.guard(state,[ref]);return true;}catch(e){void v50Dialog('要確認の記録です',`<p>${escapeHtml(e.message)}</p><p>修復画面へ移る場合、未保存の編集は破棄します。</p>`,[['repair','手動修復を開く'],['cancel','戻る']]).then(answer=>{if(answer){v50CloseEditor();v50ShowIssues();}});return false;}}
function v50Dialog(title,body,buttons,read=()=>null,setup=()=>{}){
  return new Promise(resolve=>{
    const d=document.createElement('dialog');d.className='v50-dialog';d.innerHTML=`<form method="dialog"><h2>${escapeHtml(title)}</h2><div class="v50-dialog-body">${body}</div><div class="modal-actions">${buttons.map(([id,label])=>`<button type="button" data-choice="${id}" ${id==='cancel'?'class="secondary-btn"':''}>${escapeHtml(label)}</button>`).join('')}</div></form>`;
    let done=false;const finish=v=>{if(done)return;done=true;d.close();d.remove();resolve(v);};
    d.addEventListener('cancel',e=>{e.preventDefault();finish(null);});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)finish(null);}const b=e.target.closest('[data-choice]');if(!b)return;if(b.dataset.choice==='cancel')return finish(null);try{const value=read(d,b.dataset.choice);if(value!==false)finish({choice:b.dataset.choice,value});}catch(err){let p=d.querySelector('.v50-error');if(!p){p=document.createElement('p');p.className='v50-error';d.querySelector('.v50-dialog-body').append(p);}p.textContent=err.message;}});
    document.body.append(d);setup(d);d.showModal();
  });
}
function v50BackupObject(){return {format:'money-rule-backup',schemaVersion:50,environment:'development',exportedAt:new Date().toISOString(),state:v50Snapshot(),preferences:{sections:readJson(STORAGE_KEYS.sections,{}),stats:readJson(STORAGE_KEYS.stats,{})}};}
async function v50RequireBackup(data,title){
  const start=await v50Dialog(title,'<p>先にバックアップファイルを保存してください。</p>',[['download','バックアップを書き出す'],['cancel','戻る']]);if(!start)return false;
  downloadJson(data,`money-rule-before-change-${getToday()}.json`);
  return Boolean(await v50Dialog('ファイルの保存確認','<p>ファイルアプリなどでバックアップが保存されていることを確認してください。ダウンロード開始だけでは保存完了を確認できません。</p><label class="v50-check"><input type="checkbox" id="v50-file-saved">ファイルが保存されていることを確認しました</label>',[['continue','確認して続ける'],['cancel','戻る']],d=>{if(!d.querySelector('#v50-file-saved').checked)throw Error('保存を確認してからチェックしてください。');return true;}));
}
function v50Prepare(raw){
  if(!raw||typeof raw!=='object'||(raw.schemaVersion!==undefined&&![48,49,50].includes(raw.schemaVersion)))throw Error('対応していない保存形式です。元データは変更していません。');
  if(raw.schemaVersion!==49&&raw.schemaVersion!==50&&!['expenses','plannedExpenses','fixedExpenses','income','settings'].some(k=>Object.hasOwn(raw,k)))throw Error('旧形式の家計簿データを判別できません。');
  const s=raw.schemaVersion===50?M.copy(raw):raw.schemaVersion===49?M.legacy49(raw):M.legacy48(raw,currentMonthKey());
  initializeRulePlan(s);const issues=M.check(s);if(issues.some(i=>i.fatal))throw Error('ID・日付・構造に問題があります。元データを保持したまま、正常なバックアップから復旧してください。');return s;
}
function v50DecodeBackup(data){
  if(data?.schemaVersion===50&&data.state){const candidate=v50Prepare(data.state);if(data.preferences)candidate.uiPrefs=M.copy(data.preferences);return candidate;}
  if(data?.localStorage){const ls=data.localStorage;const raw=ls.moneyRuleDevAppV49??ls.moneyRuleAppV49??ls.moneyRuleDevAppV2??ls.moneyRuleAppV2;if(typeof raw!=='string')throw Error('対応する家計簿本体が見つかりません。');const candidate=v50Prepare(JSON.parse(raw));candidate.uiPrefs={};for(const [name,key]of [['sections','moneyRuleDevSectionPrefs'],['stats','moneyRuleDevStatPrefs']]){const value=ls[key];if(value!==undefined){const parsed=JSON.parse(value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('表示設定の形式が不正です。');candidate.uiPrefs[name]=parsed;}}return candidate;}
  throw Error('対応していないバックアップ形式です。現在のデータは変更していません。');
}
handleBackupObject=async data=>v50Locked(async()=>{
  const candidate=v50DecodeBackup(data),issues=M.check(candidate),months=candidate.expenses.map(e=>e.date.slice(0,7)).sort();
  if(!state){const raw={};for(const k of ['moneyRuleDevAppV49','moneyRuleDevAppV2','moneyRuleDevV50:head','moneyRuleDevV50:a','moneyRuleDevV50:b']){const value=localStorage.getItem(k);if(value!==null)raw[k]=value;}if(Object.keys(raw).length&&!await v50RequireBackup({format:'money-rule-original',localStorage:raw},'復旧前の元データ保存'))return;}
  if(!await v50Dialog('バックアップを復元',`<p>現在の検証データを置き換えます。</p><p>実支出 ${candidate.expenses.length}件／予定支出 ${candidate.plannedExpenses.length}件／固定費 ${candidate.fixedExpenses.length}件</p><p>実支出の期間：${escapeHtml(months[0]||'なし')}〜${escapeHtml(months.at(-1)||'なし')}</p><p>要確認：${issues.length}件。異常なリンクは自動修復しません。</p>`,[['restore','この内容で復元'],['cancel','キャンセル']]))return;
  // Switching generations preserves the current data until verified write succeeds.
  v50Accept(candidate,{repair:true});$('migrationModal').classList.add('hidden');v50CloseEditor();selectedMonth=currentMonthKey();loadMonthForms();renderAll();v50ShowIssues();setText('migrationStateStatus','新形式：復元済み');
});
exportCurrentBackup=()=>{if(!state)return v50ExportRaw();downloadJson(v50BackupObject(),`money-rule-dev-v50-${getToday()}.json`);setText('backupStatus','バックアップのダウンロードを開始しました。ファイルの保存先をご確認ください。');};
function v50ExportRaw(){const local={};for(const k of ['moneyRuleDevAppV49','moneyRuleDevAppV2',STORAGE_KEYS.sections,STORAGE_KEYS.stats]){const v=localStorage.getItem(k);if(v!==null)local[k]=v;}const head=localStorage.getItem('moneyRuleDevV50:head');if(head!==null){local['moneyRuleDevV50:head']=head;for(const x of ['a','b'])local['moneyRuleDevV50:'+x]=localStorage.getItem('moneyRuleDevV50:'+x);}downloadJson({format:'money-rule-dev-backup',localStorage:local},`money-rule-original-${getToday()}.json`);}
async function v50Migration(rawText,is49){
  const rawBackup={format:'money-rule-dev-backup',schemaVersion:is49?49:48,environment:'development',localStorage:{[is49?'moneyRuleDevAppV49':'moneyRuleDevAppV2']:rawText}};
  if(!await v50RequireBackup(rawBackup,'新形式への初回移行'))return;
  const raw=JSON.parse(rawText),candidate=v50Prepare(raw);v50Accept(candidate,{repair:true});
  $('migrationModal').classList.add('hidden');v50Start();setText('migrationStateStatus','新形式：移行済み（移行前データは保持しています）');
}
function v50Start(){selectedMonth=currentMonthKey();loadMonthForms();resetEntryTab();renderAll();}
function v50Boot(){
  buildCategoryControls();buildDueSelect('fixedDue');buildDueSelect('fixedEditDue');bindEvents();
  // Legacy entry points are bound to schema-50 handlers below, never legacy migration.
  $('migrationBackup').onclick=v50ExportRaw;$('exportBackup').onclick=exportCurrentBackup;$('migrationRestore').onclick=()=>$('importBackup').click();
  try{
    const current=v50Store.load();if(current){state=current;v50Committed=M.copy(current);v50Issues=M.check(state);v50Start();setText('migrationStateStatus','新形式：利用中');return;}
    const old49=localStorage.getItem('moneyRuleDevAppV49'),old48=localStorage.getItem('moneyRuleDevAppV2'),raw=old49??old48;
    if(raw!==null){$('migrationModal').classList.remove('hidden');setText('migrationStatus','移行前のファイル保存確認が必要です。元データはまだ変更していません。');$('startMigration').disabled=false;$('startMigration').onclick=()=>v50Locked(()=>v50Migration(raw,old49!==null));return;}
    const fresh=createEmptyState();fresh.schemaVersion=50;initializeRulePlan(fresh);v50Accept(fresh);v50Start();
  }catch(e){setMigrationStateStatus('読み込み停止：元データを保持しています');appAlert(e.message);showAppPage('data');}
}
// Compatibility adapters are read-only. Rendering never creates month records.
configForFixedMonth=(f,key)=>M.config(f,key);
fixedPaidInfo=(f,key)=>f&&M.payment(f,key).status==='paid'?M.payment(f,key):null;
fixedIsPaid=(f,key)=>Boolean(fixedPaidInfo(f,key));fixedIsSkipped=(f,key)=>f&&M.payment(f,key).status==='skipped';
unpaidFixedEntries=(key=selectedMonth)=>effectiveFixedEntries(key).filter(x=>!x.paid&&!x.skipped&&Number.isFinite(x.config.amount));
ensureMonthRecord=(key)=>state?.months[key]||createMonthRecord(effectiveRule(state,key),continuingRule(state,key).from);
save=()=>{try{const candidate=M.copy(state);state=M.copy(v50Committed);v50Accept(candidate);}catch(e){state=M.copy(v50Committed);throw e;}};
collectIntegrityIssues=s=>M.check(s).map(i=>`${i.type}：${i.refs.map(r=>r.id).join('・')} ${i.months.join('・')}`);
runIntegrityCheck=()=>{v50Issues=M.check(state);v50ShowIssues();};
renderAll=()=>{if(!state)return;v50OldRender();v50RenderWarning();};
annualDetailMonths=report=>annualSearchActive()?report.months.map(m=>{const items=m.items.filter(e=>(!annualSearch.memo||String(e.memo||'').includes(annualSearch.memo))&&(!annualSearch.category||e.category===annualSearch.category));return {...m,items,total:items.reduce((a,e)=>a+e.amount,0)};}).filter(m=>m.items.length):report.months;
function v50StateLabel(text){return `<span class="fixed-status-label v50-state-label">${escapeHtml(text)}</span>`;}
renderPlannedExpenses=()=>{
  const list=state.plannedExpenses.filter(p=>monthOfDate(p.date)===selectedMonth).sort((a,b)=>a.date.localeCompare(b.date)||(a.order||0)-(b.order||0));
  setText('plannedTotal',`未払い合計：${yen(list.filter(p=>p.status!=='confirmed').reduce((a,p)=>a+p.amount,0))}`);
  $('plannedList').innerHTML=list.length?tableHtml(list.map(p=>`<tr><td>${formatExpenseDate(p.date)}</td><td class="memo-cell" data-memo="${escapeHtml(p.memo)}">${escapeHtml(p.memo||'—')}</td><td>${escapeHtml(p.category)}</td><td class="amount-col"><strong>${yen(p.amount)}</strong></td><td class="action-col"><div class="table-actions">${p.status==='confirmed'?v50StateLabel('支払済み'):`<button class="confirm-btn" data-confirm-planned="${escapeHtml(p.id)}">支出に確定</button>`}<button class="edit-btn" data-edit-planned="${escapeHtml(p.id)}">編集</button></div></td></tr>`)):'<p class="muted">予定支出はありません。</p>';
};
renderFixedExpenses=()=>{
  const entries=effectiveFixedEntries(selectedMonth);setText('fixedTotal',`合計：${yen(entries.filter(x=>!x.skipped).reduce((n,x)=>n+Number(x.config.amount||0),0))}`);
  setHidden('fixedListWarning',!isPastSelected()||!entries.some(x=>!x.paid&&!x.skipped));setText('fixedListWarning','この過去月には未払いの固定費があります。');
  $('fixedList').innerHTML=entries.length?tableHtml(entries.map(({fixed:f,config:c,date,paid,skipped})=>`<tr><td>${escapeHtml(formatExpenseDate(date)||'未設定')}</td><td class="memo-cell" data-memo="${escapeHtml(c.memo||'')}">${escapeHtml(c.memo||'—')}</td><td>${escapeHtml(c.category||'未設定')}</td><td class="amount-col${skipped?' fixed-skip-amount':''}"><strong>${yen(c.amount)}</strong></td><td class="action-col"><div class="table-actions">${paid?v50StateLabel('支払済み'):skipped?v50StateLabel('支払いなし'):`<button class="confirm-btn" data-confirm-fixed="${escapeHtml(f.id)}">支出に確定</button>`}<button class="edit-btn" data-edit-fixed="${escapeHtml(f.id)}">編集</button></div></td></tr>`)):'<p class="muted">この月に有効な固定費はありません。</p>';
};
function v50RenderWarning(){let box=$('v50-budget-warning');if(!box){box=document.createElement('button');box.id='v50-budget-warning';box.className='inline-warning';$('budgetIntegrityNotice').append(box);box.onclick=v50ShowIssues;}const affected=v50Issues.some(i=>i.months.includes(selectedMonth)||i.refs.some(r=>r.from&&r.from<=selectedMonth&&(!r.to||selectedMonth<r.to)));box.hidden=!affected;box.textContent='集計要確認：判明しているデータで表示しています。金額が正確でない可能性があります。確認する';}
function v50Input(name,label,value,type='text'){return `<label>${escapeHtml(label)}<input data-field="${name}" type="${type}" value="${escapeHtml(value??'')}" ${type==='number'?'min="0" step="1" inputmode="decimal"':''}></label>`;}
function v50EditorValues(ctx){const out={};ctx.el.querySelectorAll('[data-field]').forEach(el=>{out[el.dataset.field]=el.dataset.field==='amount'?Number(el.value):el.value;});if(ctx.ref.kind==='fixed')out.due=valueToDue(out.due);return out;}
function v50Changed(ctx){return ctx.targetStatus!==ctx.initialStatus||!M.equal(v50EditorValues(ctx),ctx.initial)||Object.keys(ctx.orders).length>0;}
function v50CloseEditor(){if(v50Editor){v50Editor.el.close();v50Editor.el.remove();v50Editor=null;}clearDirty('v50-edit');}
function v50Open(ref,originContext=null){
  if(!v50Guard(ref))return;v50CloseEditor();const fixed=ref.kind==='fixed',expense=ref.kind==='expense',r=expense?state.expenses.find(e=>e.id===ref.id):M.findSource(state,ref);if(!r)return;
  const paid=fixed?fixedIsPaid(r,ref.month):!expense&&r.status==='confirmed',skipped=fixed&&fixedIsSkipped(r,ref.month),value=fixed?M.config(r,ref.month):r;
  if(!value)return;const actual=fixed&&paid?state.expenses.find(e=>e.id===M.payment(r,ref.month).expenseId):null;
  const key=fixed?ref.month:r.date.slice(0,7),title=`${monthLabel(key)}の${fixed?'固定費':expense?'支出':'予定支出'}を編集`,d=document.createElement('dialog');d.className='v50-dialog';
  const dueOptions=Array.from({length:31},(_,i)=>`<option value="day:${i+1}">${i+1}日</option>`).join('')+'<option value="eom">月末</option>';
  d.innerHTML=`<div class="modal-header"><h2>${escapeHtml(title)}</h2><button type="button" data-editor="cancel" class="close-btn">×</button></div>${v50Input('amount',fixed&&paid?'実際の支払額':'金額',value.amount,'number')}<label>カテゴリ<select data-field="category">${[...new Set([...CATEGORIES,value.category])].map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select></label>${v50Input('memo','メモ',value.memo)}${fixed?`<label>毎月の支払日<select data-field="due"><option value="">未設定</option>${dueOptions}</select></label>${paid?v50Input('actualDate','実支出日',actual.date,'date'):''}`:v50Input('date',expense?'支出日':'予定日',value.date,'date')}<div class="modal-reorder"><span>同じ日付内の並び順</span><div><button data-editor="up" class="secondary-btn">▲ 上へ</button><button data-editor="down" class="secondary-btn">▼ 下へ</button></div></div>${expense?'':`<section class="fixed-payment-setting"><h3>${fixed?'この月の支払い':'支払い状態'}</h3><p>${paid?'支払済み':skipped?'支払いなし':'未払い'}</p><div class="fixed-payment-actions">${paid?'<button data-editor="rollback" class="secondary-btn">未払いに戻す</button>':skipped?'<button data-editor="restore" class="secondary-btn">支払い対象に戻す</button>':`<button data-editor="confirm" class="confirm-btn">支出に確定</button>${fixed?'<button data-editor="skip" class="secondary-btn">この月は支払わない</button>':''}`}</div></section>`}${expense&&r.origin?'<button data-editor="rollback" class="secondary-btn">未払いに戻す</button>':''}<div class="modal-actions split-actions">${fixed?'<button data-editor="delete-from" class="danger-btn">この月以降削除</button><button data-editor="delete" class="danger-btn">完全削除</button>':'<button data-editor="delete" class="danger-btn">削除</button>'}</div><div class="modal-actions"><button data-editor="cancel" class="secondary-btn">キャンセル</button><button data-editor="edit">保存</button></div>`;
  d.querySelector('[data-field="category"]').value=value.category;if(fixed)d.querySelector('[data-field="due"]').value=dueToValue(value.due);
  const ctx={ref:M.copy(ref),el:d,orders:{},origin:originContext||{page:activePage,year:annualYear,scroll:window.scrollY,month:selectedMonth},initial:null,generation:v50Generation};ctx.initial=v50EditorValues(ctx);ctx.initialStatus=expense?(r.origin?'paid':null):paid?'paid':skipped?'skipped':'unpaid';ctx.targetStatus=ctx.initialStatus;v50Editor=ctx;v51ArrangeEditor(ctx);v51RenderPayment(ctx);
  d.addEventListener('input',()=>markDirty('v50-edit'));d.addEventListener('change',e=>{markDirty('v50-edit');if(['date','due'].includes(e.target.dataset.field)){ctx.orders={};v50Move(ctx,null);}});
  d.addEventListener('cancel',e=>{e.preventDefault();if(!v50Busy)v50CloseEditor();});d.onclick=e=>{if(e.target===d){const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom){if(!v50Busy)v50CloseEditor();return;}}const b=e.target.closest('[data-editor]');if(!b||v50Busy)return;const a=b.dataset.editor;if(a==='cancel')return v50CloseEditor();if(a==='up'||a==='down')return v50Move(ctx,a);v50Perform(ctx.ref,a,ctx);};document.body.append(d);v50Move(ctx,null);d.showModal();
}
function v50Move(ctx,dir){
  const {ref}=ctx,values=v50EditorValues(ctx);let list;if(ref.kind==='fixed'){const all=effectiveFixedEntries(ref.month),date=M.scheduledDate(ref.month,values.due);list=all.filter(x=>x.fixed.id===ref.id||x.date===date).map(x=>x.fixed);}else{const all=ref.kind==='planned'?state.plannedExpenses:state.expenses;list=all.filter(x=>x.id===ref.id||x.date===values.date);}
  list.sort((a,b)=>(ctx.orders[a.id]??(a.order||0))-(ctx.orders[b.id]??(b.order||0)));let i=list.findIndex(x=>x.id===ref.id),j=dir==='up'?i-1:i+1;
  if(dir&&j>=0&&j<list.length){[list[i],list[j]]=[list[j],list[i]];list.forEach((r,k)=>ctx.orders[r.id]=k+1);i=j;markDirty('v50-edit');}
  ctx.el.querySelector('[data-editor="up"]').disabled=i<=0;ctx.el.querySelector('[data-editor="down"]').disabled=i>=list.length-1;
}
function v50Validate(values,kind){if(!Number.isFinite(values.amount)||values.amount<=0)throw Error('金額は0円より大きい数値を入力してください。');if(!values.category?.trim())throw Error('カテゴリを選択してください。');if(kind==='fixed'){if(!M.dueOK(values.due))throw Error('支払予定日を選択してください。');if(values.actualDate&&!dateAllowed(values.actualDate))throw Error('実支出日を確認してください。');}else if(!M.date(values.date)||!dateAllowed(values.date))throw Error('日付を確認してください。');}
async function v50Perform(ref,type,ctx=null){if(ctx)return v51EditorAction(ctx,type);return v50Locked(async()=>{
  if(!v50Guard({...ref,...(type==='delete-from'?{onward:true}:{})}))return;
  const generation=v50Generation,origin=ctx?.origin||{page:activePage,year:annualYear,scroll:window.scrollY,month:selectedMonth};let edit=null,orders=null,actualDate=null,scope='once';const rawType=type;type=type==='delete-from'?'delete':type;
  if(ctx){let mode=type==='edit'?'save':'discard';if(type!=='edit'&&v50Changed(ctx)){
      const verb={confirm:'確定',rollback:'未払いへ戻す',skip:'支払いなしにする',restore:'支払い対象に戻す',delete:'削除'}[type];
      const answer=await v50Dialog('未保存の変更があります','<p>後続の確認がすべて完了するまで保存しません。</p>',[['save',`保存して${verb}`],['discard',`破棄して${verb}`],['cancel','編集画面に戻る']]);if(!answer)return;mode=answer.choice;
    }
    if(mode==='save'){const values=v50EditorValues(ctx);v50Validate(values,ref.kind);edit=Object.fromEntries(Object.entries(values).filter(([k,v])=>k!=='actualDate'&&!M.equal(v,ctx.initial[k])));actualDate=values.actualDate;orders=M.copy(ctx.orders);}
  }
  const source=ref.kind==='expense'?state.expenses.find(e=>e.id===ref.id):M.findSource(state,ref),paid=ref.kind==='fixed'&&fixedIsPaid(source,ref.month);
  if(ref.kind==='fixed'&&!paid&&edit&&Object.keys(edit).length){const answer=await v50Dialog('変更の適用範囲','<label class="v50-check"><input type="radio" name="scope" value="once" checked>この月だけ</label><label class="v50-check"><input type="radio" name="scope" value="onward">この月以降</label>',[['ok','この範囲で続ける'],['cancel','編集画面に戻る']],d=>d.querySelector('[name="scope"]:checked').value);if(!answer)return;scope=answer.value;if(scope==='onward'&&!v50Guard({...ref,onward:true}))return;}
  const action={ref:{...ref,...(scope==='onward'?{onward:true}:{})},type,edit,orders,scope,actualDate};if(rawType==='delete-from')action.from=ref.month;
  if(type==='confirm'){
    const values={...(ref.kind==='fixed'?M.config(source,ref.month):source),...edit},initialDate=ref.kind==='fixed'?(M.payment(source,ref.month).lastActualDate||M.scheduledDate(ref.month,values.due)):values.date;
    const body=v50Input('amount','実際の支払額',values.amount,'number')+v50Input('date','実支出日',initialDate,'date')+`<p>${ref.kind==='fixed'?`固定費は${escapeHtml(monthLabel(ref.month))}に残り、実支出は実支出日の月に計上されます。`:'確認した金額・日付を元の予定支出にも反映します。日付の月が変わる場合は両方を移動します。'}</p>`;
    const answer=await v50Dialog('支出に確定',body,[['ok','支出に確定'],['cancel','編集画面に戻る']],d=>{const amount=Number(d.querySelector('[data-field="amount"]').value),date=d.querySelector('[data-field="date"]').value;if(!Number.isFinite(amount)||amount<=0||!M.date(date)||!dateAllowed(date))throw Error('実際の支払額と日付を確認してください。');return {amount,date};});if(!answer)return;Object.assign(action,answer.value,{expenseId:newId('e')});
  }else if(type==='rollback'||type==='delete'){
    let text=type==='rollback'?'紐づく実支出を削除し、元の項目を未払いに戻します。':ref.kind==='expense'?(source.origin?'この実支出を削除し、元の項目を未払いに戻します。':'この実支出を削除します。'):'元の項目を削除し、対象の実支出はリンクを解除して通常の実支出として残します。';
    if(rawType==='delete-from')text=`${monthLabel(ref.month)}以降の固定費設定・未払い予定額を削除します。対象の実支出は通常の実支出として残し、それより前の履歴は維持します。`;
    const candidate=M.commitAction(state,action);if(!await v50Dialog(type==='rollback'?'未払いに戻す':'削除の確認',v51OperationSummary(state,ref,type,action.from),[['ok',type==='rollback'?'未払いに戻す':'削除する'],['cancel','キャンセル']]))return;
  }else if(type==='edit'){
    const dest=ref.kind==='fixed'?actualDate?.slice(0,7):edit?.date?.slice(0,7),prev=ref.kind==='fixed'?state.expenses.find(e=>e.id===M.payment(source,ref.month).expenseId)?.date.slice(0,7):source.date.slice(0,7);
    if(dest&&prev&&dest!==prev&&!await v50Dialog('移動先の確認',`<p>実支出を${monthLabel(dest)}へ移動します。${ref.kind==='fixed'?'固定費の対象月は変わりません。':source.origin?.type==='fixed'?'固定費の対象月は変わりません。':'紐づく予定支出があれば一緒に移動します。'}</p>`,[['ok','保存'],['cancel','編集画面に戻る']]))return;
  }
  if(ctx&&v50Editor!==ctx||generation!==v50Generation)throw Error('編集中にデータが変わりました。もう一度開いてください。');
  const candidate=M.commitAction(state,action);v50Accept(candidate);const keep=ctx&&ref.kind!=='expense'&&!['edit','delete'].includes(type);v50CloseEditor();
  let dest=origin.month;
  if(ref.kind==='planned'){const p=M.findSource(state,ref);if(p)dest=p.date.slice(0,7);}
  if(ref.kind==='expense'){const e=state.expenses.find(e=>e.id===ref.id);if(e)dest=e.date.slice(0,7);else if(source.origin?.type==='fixed')dest=source.origin.sourceMonth;else if(source.origin?.type==='planned')dest=M.findSource(state,{kind:'planned',id:source.origin.sourceId})?.date.slice(0,7)||dest;}
  if(origin.page==='annual'){annualYear=origin.year;renderAll();requestAnimationFrame(()=>window.scrollTo({top:origin.scroll,behavior:'auto'}));}
  else {if(dest!==selectedMonth)await switchMonth(dest,{force:true});else renderAll();if(keep&&dest===origin.month)v50Open(ref,origin);}
});}
function v51ArrangeEditor(ctx){
  const d=ctx.el,deletion=d.querySelector('.split-actions'),save=deletion.nextElementSibling;
  const area=document.createElement('section');area.className='v51-delete-area';area.innerHTML='<h3>削除</h3>';deletion.before(area);area.append(deletion);save.classList.add('v51-save-actions');
  if(ctx.ref.kind==='expense'&&ctx.initialStatus){const old=d.querySelector('[data-editor="rollback"]'),section=document.createElement('section');section.className='fixed-payment-setting';old.replaceWith(section);}
}
function v51RenderPayment(ctx){
  const section=ctx.el.querySelector('.fixed-payment-setting');if(!section)return;const status=ctx.targetStatus,fixed=ctx.ref.kind==='fixed',changed=status!==ctx.initialStatus;
  const button=(action,label)=>`<button type="button" class="secondary-btn" data-editor="${action}">${label}</button>`;
  section.innerHTML=`<h3>${fixed?'この月の支払い':'支払い状態'}</h3><p>${status==='paid'?'支払済み':status==='skipped'?'支払いなし':'未払い'}${changed?'（未保存）':''}</p><div class="fixed-payment-actions">${status==='paid'?button('rollback','未払いに戻す'):status==='skipped'?button('restore','支払い対象に戻す'):button('confirm','支出に確定')+(fixed?button('skip','この月は支払わない'):'')}</div>${changed?'<p class="v51-pending">［保存］で反映します。</p>':''}`;
  if(fixed){const input=ctx.el.querySelector('[data-field="amount"]');input.parentElement.firstChild.textContent=status==='paid'?'実際の支払額':'金額';}
}
function v51OperationSummary(s,ref,type,from=null){
  const source=ref.kind==='expense'?s.expenses.find(e=>e.id===ref.id):M.findSource(s,ref);
  const origin=ref.kind==='expense'?source.origin:ref.kind==='fixed'?{type:'fixed',sourceId:ref.id,sourceMonth:ref.month}:{type:'planned',sourceId:ref.id};
  const actual=ref.kind==='expense'?source:s.expenses.find(e=>e.id===(ref.kind==='fixed'?M.payment(source,ref.month).expenseId:source.confirmedExpenseId));
  const savedActual=actual&&(state.expenses.find(e=>e.id===actual.id)||actual);
  const value=ref.kind==='fixed'?M.config(source,ref.month):source;
  const card=v=>`<p class="v51-target"><strong>${escapeHtml(v.memo||v.category||'記録')}</strong><br>${yen(v.amount)}${v.date?` ／ 支払日 ${escapeHtml(v.date)}`:''}</p>`;
  if(type==='rollback'||ref.kind==='expense'&&source.origin){
    const fixed=origin.type==='fixed',target=fixed?origin.sourceMonth:actual.date.slice(0,7),actualMonth=savedActual.date.slice(0,7);
    return card(savedActual)+`<p>この支払いの実支出記録を取り消し、${escapeHtml(monthLabel(target))}の${fixed?'固定費':'予定支出'}を未払いに戻します。</p><p>${escapeHtml(monthLabel(actualMonth))}の支出合計から${yen(savedActual.amount)}を除き、${escapeHtml(monthLabel(target))}の未払い予定額に${yen(actual.amount)}を戻します。</p>${fixed?'<p>翌月以降の固定費設定は変更しません。</p>':''}`;
  }
  if(ref.kind==='expense')return card(savedActual)+`<p>この支出を削除し、${escapeHtml(monthLabel(savedActual.date.slice(0,7)))}の支出合計から${yen(savedActual.amount)}を除きます。</p>`;
  const linked=s.expenses.filter(e=>e.origin?.type===ref.kind&&e.origin.sourceId===ref.id&&(!from||e.origin.sourceMonth>=from));
  return card({...value,date:ref.kind==='fixed'?M.scheduledDate(ref.month,value.due):value.date})+`<p>${ref.kind==='fixed'?(from?escapeHtml(monthLabel(from))+'以降の固定費設定を削除します。それより前の履歴は残します。':'この固定費を全期間から削除します。'):'この予定支出を削除します。'}対象の未払い予定額も集計から除きます。</p>${linked.length?`<p>支払済みの実支出${linked.length}件（合計${yen(linked.reduce((n,e)=>n+e.amount,0))}）は通常の支出として残します。支出合計・支払日は変更しません。</p>`:''}`;
}
async function v51PrepareEditor(ctx){
  const ref=ctx.ref,values=v50EditorValues(ctx);v50Validate(values,ref.kind);
  const edit=Object.fromEntries(Object.entries(values).filter(([k,v])=>k!=='actualDate'&&!M.equal(v,ctx.initial[k])));let scope='once';
  if(ref.kind==='fixed'&&ctx.initialStatus!=='paid'&&Object.keys(edit).length){
    const answer=await v50Dialog('変更の適用範囲','<label class="v50-check"><input type="radio" name="scope" value="once" checked>この月だけ</label><label class="v50-check"><input type="radio" name="scope" value="onward">この月以降</label>',[['ok','この範囲で続ける'],['cancel','キャンセル']],d=>d.querySelector('[name="scope"]:checked').value);if(!answer)return null;scope=answer.value;
  }
  const action={ref:{...ref,...(scope==='onward'?{onward:true}:{})},type:'edit',edit,orders:ctx.orders,actualDate:values.actualDate,scope};
  let candidate=M.commitAction(state,action);
  const original=ref.kind==='expense'?state.expenses.find(e=>e.id===ref.id):M.findSource(state,ref);
  const sourceRef=ref.kind==='expense'&&original.origin?{kind:original.origin.type,id:original.origin.sourceId,month:original.origin.sourceMonth}:ref;
  if(ctx.targetStatus!==ctx.initialStatus){
    if(ctx.initialStatus==='paid'){
      if(!await v50Dialog('未払いに戻す',v51OperationSummary(candidate,ref,'rollback')+(ctx.targetStatus==='skipped'?'<p>その後、この対象月を「支払いなし」にします。</p>':''),[['ok','未払いに戻す'],['cancel','キャンセル']]))return null;
      candidate=M.commitAction(candidate,{ref:sourceRef,type:'rollback'});
    }
    if(ctx.targetStatus==='paid'){
      if(ctx.initialStatus==='skipped')candidate=M.commitAction(candidate,{ref:sourceRef,type:'restore'});
      const r=M.findSource(candidate,sourceRef),v=sourceRef.kind==='fixed'?M.config(r,sourceRef.month):r;
      const date=sourceRef.kind==='fixed'?(M.payment(r,sourceRef.month).lastActualDate||M.scheduledDate(sourceRef.month,v.due)):v.date;
      const answer=await v50Dialog('支出に確定',v50Input('amount','実際の支払額',v.amount,'number')+v50Input('date','実支出日',date,'date')+`<p>${sourceRef.kind==='fixed'?`固定費は${escapeHtml(monthLabel(sourceRef.month))}に残り、実支出は実支出日の月に計上します。`:'確認した金額・日付を予定支出にも反映します。月が変わる場合は両方を移動します。'}</p>`,[['ok','支出に確定'],['cancel','キャンセル']],d=>{const amount=Number(d.querySelector('[data-field="amount"]').value),date=d.querySelector('[data-field="date"]').value;if(!Number.isFinite(amount)||amount<=0||!M.date(date)||!dateAllowed(date))throw Error('実際の支払額と日付を確認してください。');return {amount,date};});if(!answer)return null;
      candidate=M.commitAction(candidate,{ref:sourceRef,type:'confirm',...answer.value,expenseId:newId('e')});
    }else if(ctx.targetStatus==='skipped')candidate=M.commitAction(candidate,{ref:sourceRef,type:'skip'});
    else if(ctx.initialStatus==='skipped')candidate=M.commitAction(candidate,{ref:sourceRef,type:'restore'});
  }else{
    const dest=ref.kind==='fixed'?values.actualDate?.slice(0,7):values.date.slice(0,7),previous=ref.kind==='fixed'?ctx.initial.actualDate?.slice(0,7):ctx.initial.date.slice(0,7);
    if(dest&&previous&&dest!==previous&&!await v50Dialog('移動先の確認',`<p>${escapeHtml(monthLabel(dest))}へ移動します。${ref.kind==='fixed'||original.origin?.type==='fixed'?'固定費の元の対象月は変更しません。':'紐づく予定支出・実支出があれば一緒に移動します。'}</p>`,[['ok','保存'],['cancel','キャンセル']]))return null;
  }
  return candidate;
}
function v51EditorAction(ctx,type){
  if(v50Busy)return;
  if(['confirm','rollback','skip','restore'].includes(type)){ctx.targetStatus=({confirm:'paid',rollback:'unpaid',skip:'skipped',restore:'unpaid'})[type];v51RenderPayment(ctx);markDirty('v50-edit');return;}
  return v50Locked(async()=>{
    if(ctx!==v50Editor||ctx.generation!==v50Generation)throw Error('編集中にデータが変わりました。開き直してください。');
    const ref=ctx.ref,original=ref.kind==='expense'?state.expenses.find(e=>e.id===ref.id):M.findSource(state,ref);let candidate;
    if(type==='edit')candidate=await v51PrepareEditor(ctx);
    else if(['delete','delete-from'].includes(type)){
      let save=false;if(v50Changed(ctx)){const answer=await v50Dialog('未保存の変更があります','<p>削除の確認が完了するまで、保存・削除は行いません。</p>',[['save','保存して削除'],['discard','破棄して削除'],['cancel','編集画面に戻る']]);if(!answer)return;save=answer.choice==='save';}
      candidate=save?await v51PrepareEditor(ctx):M.copy(state);if(!candidate)return;
      const gone=ref.kind==='expense'&&!candidate.expenses.some(e=>e.id===ref.id);
      const body=gone?'<p>この実支出は、選択した「未払いに戻す」で取り消されます。元の項目を未払いに戻して保存します。</p>':v51OperationSummary(candidate,ref,'delete',type==='delete-from'?ref.month:null);
      const result=gone?candidate:M.commitAction(candidate,{ref,type:'delete',...(type==='delete-from'?{from:ref.month}:{})});
      const months=[...new Set([...state.expenses,...result.expenses].map(e=>e.date.slice(0,7)))].sort(),sum=(s,m)=>s.expenses.filter(e=>e.date.startsWith(m)).reduce((a,e)=>a+e.amount,0);
      const impact=months.filter(m=>sum(state,m)!==sum(result,m)).map(m=>`<p>${escapeHtml(monthLabel(m))}の支出合計：${yen(sum(state,m))} → ${yen(sum(result,m))}</p>`).join('');
      if(!await v50Dialog('削除の確認',body+impact+(save?'<p>選択した未保存の変更も合わせて保存します。</p>':v50Changed(ctx)?'<p>未保存の入力・支払い状態の変更は破棄します。</p>':''),[['ok','削除する'],['cancel','キャンセル']]))return;
      candidate=result;
    }else return;
    if(!candidate)return;if(ctx!==v50Editor||ctx.generation!==v50Generation)throw Error('確認中にデータが変わりました。開き直してください。');
    v50Accept(candidate);v50CloseEditor();const origin=ctx.origin;let dest=origin.month;
    if(ref.kind==='planned')dest=M.findSource(state,ref)?.date.slice(0,7)||dest;
    if(ref.kind==='expense'){const e=state.expenses.find(e=>e.id===ref.id);dest=e?e.date.slice(0,7):original.origin?.type==='fixed'?original.origin.sourceMonth:original.origin?.type==='planned'?M.findSource(state,{kind:'planned',id:original.origin.sourceId})?.date.slice(0,7)||dest:dest;}
    if(origin.page==='annual'){annualYear=origin.year;renderAll();requestAnimationFrame(()=>window.scrollTo({top:origin.scroll,behavior:'auto'}));}
    else if(dest!==selectedMonth)await switchMonth(dest,{force:true});else renderAll();
  });
}
openEdit=(id)=>v50Open({kind:'expense',id:String(id)});openPlannedEdit=id=>v50Open({kind:'planned',id:String(id)});openFixedEdit=id=>v50Open({kind:'fixed',id:String(id),month:selectedMonth});
confirmPlanned=id=>v50Perform({kind:'planned',id:String(id)},'confirm');confirmFixed=id=>v50Perform({kind:'fixed',id:String(id),month:selectedMonth},'confirm');
function v50Diff(before,after){
  const rows=[],cell=value=>escapeHtml(value);
  const describe=(s,r,name,key)=>{
    if(!r)return 'なし';
    if(name!=='fixedExpenses'){const origin=r.origin;return `${r.memo||r.category}／${yen(r.amount)}／${r.date}／${r.status==='confirmed'?'支払済み':r.status==='pending'?'未払い':'実支出'}／${origin?`対応元：${origin.type==='fixed'?'固定費':'予定支出'} ${origin.sourceId} ${origin.sourceMonth||''}`:r.confirmedExpenseId?'実支出：'+r.confirmedExpenseId:'リンクなし'}`;}
    const v=M.config(r,key);if(!v)return '対象外';
    const p=M.payment(r,key),e=s.expenses.find(e=>e.id===p.expenseId),due=v.due?.type==='eom'?'月末':v.due?.day?v.due.day+'日':'未設定';
    return `${v.memo||'メモなし'}／${v.category||'未設定'}／${yen(v.amount)}／毎月${due}／${p.status==='paid'?'支払済み':p.status==='skipped'?'支払いなし':'未払い'}${e?'／実支出 '+e.date+' '+yen(e.amount):p.expenseId?'／実支出が見つかりません':''}`;
  };
  for(const [kind,name]of [['実支出','expenses'],['予定支出','plannedExpenses'],['固定費','fixedExpenses']]){
    const b=new Map(before[name].map(x=>[x.id,x])),a=new Map(after[name].map(x=>[x.id,x]));
    for(const id of new Set([...b.keys(),...a.keys()])){
      if(M.equal(b.get(id),a.get(id)))continue;
      const months=name==='fixedExpenses'?[...new Set([b.get(id),a.get(id)].filter(Boolean).flatMap(r=>[r.startMonth,r.endMonth,...r.schedule.map(c=>c.month),...Object.keys(r.overrides),...Object.keys(r.payments)]).filter(Boolean))].sort():[''];
      for(const key of months){const prev=describe(before,b.get(id),name,key),next=describe(after,a.get(id),name,key);if(prev===next)continue;rows.push(`<tr><th>${cell(kind+' '+id+' '+(key?monthLabel(key):''))}</th><td>${cell(prev)}</td><td>${cell(next)}</td></tr>`);}
    }
  }
  return `<div class="v50-diff-wrap"><table class="v50-diff"><thead><tr><th>記録</th><th>変更前</th><th>変更後</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function v50ShowIssues(){if(!state)return;v50Issues=M.check(state);showAppPage('data');const box=$('integrityResult');box.classList.remove('hidden');box.innerHTML=v50Issues.length?v50Issues.map((i,index)=>`<div class="v50-issue"><strong>${escapeHtml(v50IssueName(i.type))}</strong><p>${escapeHtml(i.refs.map(r=>`${r.kind} ${r.id||'ID不明'} ${r.month||''}`).join('／'))}</p><p>対象月：${escapeHtml(i.months.join('・')||'特定できません')}／実支出：${escapeHtml(i.expenses.join('・')||'なし')}</p>${i.fatal?'<p>安全に識別できません。元データを保持して正常なバックアップから復旧してください。</p>':`<button data-repair="${index}">修復内容を確認</button>`}</div>`).join(''):'<p>問題は見つかりませんでした。</p>';box.onclick=e=>{const b=e.target.closest('[data-repair]');if(b)v50Repair(v50Issues[Number(b.dataset.repair)]);};}
function v50IssueName(type){return ({'missing-expense':'支払済みですが実支出がありません','mismatched-link':'相互リンクが一致しません','missing-source':'元の項目がありません','unpaid-link':'未払いの項目にリンクが残っています','unpaid-linked-expense':'未払いの項目に実支出が紐づいています','multiple-expenses':'1つの元項目に複数の実支出があります','multiple-sources':'1つの実支出に複数の元項目があります','paid-and-skipped':'支払済みと支払いなしが重複しています','value-mismatch':'元項目と実支出の保存値が一致しません','invalid-setting':'固定費設定を確認してください'})[type]||type;}
async function v50Repair(issue){return v50Locked(async()=>{
  if(issue.type==='invalid-setting')return v50RepairSetting(issue);
  const generation=v50Generation;if(issue.fatal)throw Error('正常なバックアップから復旧してください。');const refs=issue.refs.filter(r=>r.kind==='planned'||r.kind==='fixed');
  const sourceOptions=[...new Map(refs.map(r=>[M.sourceKey(r),r])).values()].filter(r=>M.findSource(state,r));
  const sourceLabel=r=>{const s=M.findSource(state,r),v=r.kind==='fixed'?M.config(s,r.month)||{}:s;return `${r.kind==='fixed'?'固定費':'予定支出'} ${v.memo||v.category||''} ${r.month||s.date} ${yen(v.amount)} [${r.id}]`;};
  const body=`<p>${escapeHtml(v50IssueName(issue.type))}</p><label>修復方法<select id="v50-repair-kind"><option value="unlink">元のリンクを解除して未払いへ戻す（実支出は残す）</option><option value="relink">選択した実支出へ紐づける（実支出の保存値を使用）</option><option value="create">金額・日付を確認して実支出を作成</option><option value="detach-expense">実支出の不正な参照を解除</option><option value="skip">この月を支払いなしにする（実支出は残す）</option><option value="keep-paid">支払済みを維持して支払いなしを解除</option></select></label><label>対応元<select id="v50-repair-source">${sourceOptions.map((r,i)=>`<option value="${i}">${escapeHtml(sourceLabel(r))}</option>`).join('')}</select></label><label>実支出<select id="v50-repair-expense">${state.expenses.map(e=>`<option value="${escapeHtml(e.id)}">${escapeHtml(`${e.date} ${e.memo||e.category} ${yen(e.amount)} [${e.id}]`)}／${escapeHtml(e.origin?`${e.origin.type} ${e.origin.sourceId} ${e.origin.sourceMonth||''}`:'通常の支出')}</option>`).join('')}</select></label>${v50Input('amount','新規作成する場合の実際の支払額','','number')}${v50Input('date','新規作成する場合の実支出日','','date')}<p>紐づけ直す場合は、選んだ実支出の保存値を元項目へ反映します。変更前後を次の画面で確認できます。</p>`;
  const allowed=({'missing-expense':['create','unlink'],'mismatched-link':['relink','unlink'],'missing-source':['detach-expense'],'invalid-origin':['detach-expense'],'unpaid-link':['relink','unlink'],'unpaid-linked-expense':['relink','unlink'],'multiple-expenses':['relink','unlink'],'multiple-sources':['relink'],'paid-and-skipped':['keep-paid','skip'],'value-mismatch':['relink','unlink'],'invalid-status':['unlink']})[issue.type]||[];
  if(!allowed.length)throw Error('この異常は安全に操作対象を限定できません。元データを保持してバックアップから復旧してください。');
  const choice=await v50Dialog('手動修復の内容',body,[['preview','変更前後を確認'],['cancel','キャンセル']],d=>({type:d.querySelector('#v50-repair-kind').value,ref:sourceOptions[Number(d.querySelector('#v50-repair-source').value)],expenseId:d.querySelector('#v50-repair-expense').value,newId:newId('e'),amount:Number(d.querySelector('[data-field="amount"]').value),date:d.querySelector('[data-field="date"]').value}),d=>{
    const kind=d.querySelector('#v50-repair-kind'),ex=d.querySelector('#v50-repair-expense');[...kind.options].forEach(o=>{if(!allowed.includes(o.value))o.remove();});
    if(issue.expenses.length)ex.value=issue.expenses.find(id=>state.expenses.some(e=>e.id===id))||'';
    if(allowed.length===1&&allowed[0]==='detach-expense')[...ex.options].forEach(o=>{if(!issue.expenses.includes(o.value))o.remove();});
    const refresh=()=>{d.querySelector('#v50-repair-source').parentElement.hidden=kind.value==='detach-expense';ex.parentElement.hidden=!['relink','detach-expense'].includes(kind.value);d.querySelectorAll('[data-field]').forEach(el=>el.parentElement.hidden=kind.value!=='create');};kind.onchange=refresh;refresh();
  });if(!choice)return;const plan=choice.value;
  if(!plan.ref&&plan.type!=='detach-expense')throw Error('対応元を選択してください。');if(['skip','keep-paid'].includes(plan.type)&&plan.ref.kind!=='fixed')throw Error('固定費の対象月を選択してください。');
  if(plan.type==='relink'){const others=M.sources(state).filter(r=>r.expenseId===plan.expenseId&&M.sourceKey(r)!==M.sourceKey(plan.ref));for(const r of others){if(!await v50Dialog('他の対応元を確認',`<p>${escapeHtml(sourceLabel(r))}</p><p>この対応元を未払いへ戻し、選択した実支出とのリンクを解除します。</p>`,[['ok','この対応元の解除を確認'],['cancel','キャンセル']]))return;}plan.releaseOthers=true;}
  const candidate=M.repair(state,plan);if(!await v50Dialog('修復前後の確認',v50Diff(state,candidate)+`<p>修復後の要確認：${M.check(candidate).length}件</p>`,[['ok','この修復内容で進む'],['cancel','キャンセル']]))return;
  if(!await v50RequireBackup(v50BackupObject(),'修復前のバックアップ'))return;
  if(generation!==v50Generation)throw Error('確認中にデータが変わりました。再度確認してください。');v50Accept(candidate,{repair:true});renderAll();v50ShowIssues();
});}
async function v50RepairSetting(issue){
  const ref=issue.refs[0],f=M.findSource(state,ref),key=ref.month||ref.from;if(!f||!M.month(key))throw Error('対象を特定できません。バックアップから復旧してください。');
  const generation=v50Generation,field=issue.detail;
  if(!['amount','category','memo','due'].includes(field))throw Error('設定を安全に特定できません。バックアップから復旧してください。');
  const value=await v50Dialog('固定費設定の修復',`<p>${escapeHtml(f.id)}／${escapeHtml(monthLabel(key))}／${escapeHtml(v50FieldNames[field])}</p>`+(field==='due'?'<label>毎月の支払日<select id="v50-setting">'+Array.from({length:31},(_,i)=>`<option value="day:${i+1}">${i+1}日</option>`).join('')+'<option value="eom">月末</option></select></label>':v50Input(field,v50FieldNames[field],'',field==='amount'?'number':'text')),[['ok','変更前後を確認'],['cancel','キャンセル']],d=>field==='due'?valueToDue(d.querySelector('#v50-setting').value):field==='amount'?Number(d.querySelector('[data-field]').value):d.querySelector('[data-field]').value);
  if(!value)return;const candidate=M.copy(state),target=M.findSource(candidate,ref);
  if(ref.from){let entry=target.schedule.find(c=>c.month===key);if(!entry){entry={month:key,patch:{}};target.schedule.push(entry);}entry.patch[field]=value.value;}
  else{target.overrides[key]??={};target.overrides[key][field]=value.value;}
  if(M.check(candidate).some(i=>i.type==='invalid-setting'&&i.detail===field&&i.refs.some(r=>r.id===ref.id&&r.month===ref.month&&r.from===ref.from)))throw Error('修復する値を確認してください。');
  if(!await v50Dialog('修復前後の確認',v50Diff(state,candidate),[['ok','この内容で進む'],['cancel','キャンセル']]))return;
  if(!await v50RequireBackup(v50BackupObject(),'修復前のバックアップ'))return;
  if(generation!==v50Generation)throw Error('データが変わりました。再確認してください。');v50Accept(candidate,{repair:true});renderAll();v50ShowIssues();
}
// New fixed registration uses the same transactional store and the new schedule.
addFixed=()=>v50Locked(async()=>{const amount=validateAmount($('fixedAmount').value),category=$('fixedCategory').value,memo=$('fixedMemo').value.trim(),due=valueToDue($('fixedDue').value);v50Validate({amount,category,due},'fixed');const c=v50Snapshot();c.fixedExpenses.push({id:newId('f'),startMonth:selectedMonth,endMonth:null,schedule:[{month:selectedMonth,patch:{amount,category,memo,due}}],overrides:{},payments:{},order:Date.now()});c.memory.fixedCategory=category;v50Accept(c);clearDirty('fixed-entry');closeRecordSheet();loadMonthForms();renderAll();});
// Income writes need a concrete record; the read-only renderer never creates one.
saveIncomeEditor=()=>v50Locked(async()=>{const month=$('incomeEditor').dataset.month,values=[$('incomeSalary').value.trim(),$('incomeBonus').value.trim()];if(values.some(v=>v!==''&&(!Number.isFinite(Number(v))||Number(v)<0)))throw Error('収入は0円以上で入力してください。');const c=v50Snapshot(),key=addMonths(month,1);c.months[key]??=createMonthRecord(effectiveRule(c,key),continuingRule(c,key).from);[c.months[key].income,c.months[key].bonus]=values.map(v=>({entered:v!=='',value:v===''?0:Number(v)}));v50Accept(c);renderAll();closeSettingsDialog('incomeEditor');});
saveRuleScope=scope=>v50Locked(async()=>{if(!ruleDraft)return;const c=v50Snapshot(),month=$('ruleEditor').dataset.month;applyRuleChange(c,month,ruleDraft,scope);c.months[month]??=createMonthRecord(effectiveRule(c,month),null);v50Accept(c);ruleDraft=null;$('ruleScopeDialog').close();renderAll();closeSettingsDialog('ruleEditor');});
const v50AddExpense=addExpense,v50AddPlanned=addPlanned;
addExpense=()=>v50Locked(v50AddExpense);addPlanned=()=>v50Locked(v50AddPlanned);
const v50ReadJson=readJson,v50WriteJson=writeJson;
readJson=(key,fallback=null)=>{const name=key===STORAGE_KEYS.sections?'sections':key===STORAGE_KEYS.stats?'stats':null;return name&&state?.uiPrefs?.[name]?M.copy(state.uiPrefs[name]):v50ReadJson(key,fallback);};
writeJson=(key,value)=>{const name=key===STORAGE_KEYS.sections?'sections':key===STORAGE_KEYS.stats?'stats':null;if(!name)return v50WriteJson(key,value);const candidate=v50Snapshot();candidate.uiPrefs??={};candidate.uiPrefs[name]=M.copy(value);v50Accept(candidate);};
v50Boot();
