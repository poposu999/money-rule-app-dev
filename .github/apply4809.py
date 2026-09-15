from pathlib import Path

p = Path("app.js")
s = p.read_text(encoding="utf-8")
assert 'const VERSION="48.08";' in s
s = s.replace('const VERSION="48.08";', 'const VERSION="48.09";', 1)

marker = '  const dailyWrap=$("dashboardDailyWrap"),todayLabel=$("todayLabel"),paceScale=$("paceScale");\n'
assert marker in s
past_missing = '''  if(past&&(!n.settings||!n.incomeEntered)){
    setText("dashboardRemaining","未計算");setText("dashboardRemainingNote","過去月の予算は未計算");setText("dashboardDailyBudget","未計算");setText("dashboardDailyDays","");setText("spendingBudget","未計算");setText("plannedSavings","未計算");setText("extraIncome","未計算");setText("budgetLimitValue","—");setText("budgetSpentValue",yen(n.spent+n.plannedAmount+n.unpaidFixedAmount));setText("dashboardStatusLabel","未計算");setText("dashboardStatusMessage","この月は予算計算に必要な情報が未設定です。");$("dashboardStatus").className="budget-status neutral";dailyWrap.classList.add("hidden");todayLabel.classList.add("hidden");renderPaceTimeline(null,null);return;
  }
'''
s = s.replace(marker, marker + past_missing, 1)

legacy_marker = '  const errors=[];if(!legacy||typeof legacy!=="object")return {errors:[{message:"旧データ本体を読み込めません"}]};\n'
assert legacy_marker in s
legacy_structure = '  [["expenses","支出"],["plannedExpenses","予定支出"],["fixedExpenses","固定費"]].forEach(([key,label])=>{if(legacy[key]!==undefined&&!Array.isArray(legacy[key]))errors.push({type:label,field:"structure",message:`${label}データの形式が不正です`});});\n'
s = s.replace(legacy_marker, legacy_marker + legacy_structure, 1)

old_map = '  const pendingPlannedMap=new Map();(Array.isArray(legacy.plannedExpenses)?legacy.plannedExpenses:[]).forEach(p=>{const id=uniqueLegacyId(p.id,"p",used);out.plannedExpenses.push({id,amount:Math.max(0,Number(p.amount)||0),category:String(p.category||"その他"),memo:String(p.memo||""),date:String(p.date),order:Number(p.order)||Date.now(),status:"pending",confirmedExpenseId:null});if(p.id!==undefined&&!pendingPlannedMap.has(String(p.id)))pendingPlannedMap.set(String(p.id),id);});\n'
assert old_map in s
new_map = '  const plannedLegacyMap=new Map();(Array.isArray(legacy.plannedExpenses)?legacy.plannedExpenses:[]).forEach(p=>{const id=uniqueLegacyId(p.id,"p",used);out.plannedExpenses.push({id,amount:Math.max(0,Number(p.amount)||0),category:String(p.category||"その他"),memo:String(p.memo||""),date:String(p.date),order:Number(p.order)||Date.now(),status:"pending",confirmedExpenseId:null});if(p.id!==undefined){const key=String(p.id),list=plannedLegacyMap.get(key)||[];list.push(id);plannedLegacyMap.set(key,list);}});\n'
s = s.replace(old_map, new_map, 1)

old_planned_origin = 'else if(e.plannedSourceId!==undefined){const pid=uniqueLegacyId(e.plannedSourceId,"p",used);out.plannedExpenses.push({id:pid,amount:item.amount,category:item.category,memo:item.memo,date:item.date,order:item.order,status:"confirmed",confirmedExpenseId:id,migratedFromActual:true});item.origin={type:"planned",sourceId:pid,sourceMonth:monthOfDate(item.date),snapshot:{amount:item.amount,category:item.category,memo:item.memo,date:item.date},legacy:true};}'
assert old_planned_origin in s
new_planned_origin = 'else if(e.plannedSourceId!==undefined){const legacyKey=String(e.plannedSourceId),matches=plannedLegacyMap.get(legacyKey)||[];if(matches.length===1){const pid=matches[0],p=out.plannedExpenses.find(x=>String(x.id)===String(pid));if(p){p.status="confirmed";p.confirmedExpenseId=id;item.origin={type:"planned",sourceId:pid,sourceMonth:monthOfDate(item.date),snapshot:{amount:item.amount,category:item.category,memo:item.memo,date:item.date},legacy:true};}}else if(matches.length===0){const pid=uniqueLegacyId(e.plannedSourceId,"p",used);out.plannedExpenses.push({id:pid,amount:item.amount,category:item.category,memo:item.memo,date:item.date,order:item.order,status:"confirmed",confirmedExpenseId:id,migratedFromActual:true});item.origin={type:"planned",sourceId:pid,sourceMonth:monthOfDate(item.date),snapshot:{amount:item.amount,category:item.category,memo:item.memo,date:item.date},legacy:true};}else{item.legacyOrigin={type:"planned",legacySourceId:legacyKey,sourceMonth:monthOfDate(item.date),actionable:false};}}'
s = s.replace(old_planned_origin, new_planned_origin, 1)

old_expense_check = '''  (s.expenses||[]).forEach(e=>{register("支出",e.id);if(!isValidDateString(e.date))issues.push(`支出 ${e.id}：不正な日付 ${e.date||'未入力'}`);if(e.origin?.type==="planned"&&!s.plannedExpenses.some(p=>String(p.id)===String(e.origin.sourceId)))issues.push(`支出 ${e.id}：元の予定支出が存在しません`);if(e.origin?.type==="fixed"&&!s.fixedExpenses.some(f=>String(f.id)===String(e.origin.sourceId)))issues.push(`支出 ${e.id}：元の固定費が存在しません`);});
'''
assert old_expense_check in s
new_expense_check = '''  (s.expenses||[]).forEach(e=>{register("支出",e.id);if(!isValidDateString(e.date))issues.push(`支出 ${e.id}：不正な日付 ${e.date||'未入力'}`);if(e.origin?.type==="planned"){const p=s.plannedExpenses.find(p=>String(p.id)===String(e.origin.sourceId));if(!p)issues.push(`支出 ${e.id}：元の予定支出が存在しません`);else{if(p.status!=="confirmed")issues.push(`支出 ${e.id}：元の予定支出が未確定状態です`);if(String(p.confirmedExpenseId||"")!==String(e.id))issues.push(`支出 ${e.id}：予定支出との相互リンクが不整合です`);}}if(e.origin?.type==="fixed"){const f=s.fixedExpenses.find(f=>String(f.id)===String(e.origin.sourceId));if(!f)issues.push(`支出 ${e.id}：元の固定費が存在しません`);else{const m=String(e.origin.sourceMonth||"");if(!validMonthKey(m))issues.push(`支出 ${e.id}：固定費の元月が不正です`);else if(String(f.paidMonths?.[m]?.expenseId||"")!==String(e.id))issues.push(`支出 ${e.id}：固定費との相互リンクが不整合です`);}}});
'''
s = s.replace(old_expense_check, new_expense_check, 1)

old_planned_check = '''  (s.plannedExpenses||[]).forEach(p=>{register("予定支出",p.id);if(!isValidDateString(p.date))issues.push(`予定支出 ${p.id}：不正な日付 ${p.date||'未入力'}`);if(p.status==="confirmed"&&!s.expenses.some(e=>String(e.id)===String(p.confirmedExpenseId)))issues.push(`予定支出 ${p.id}：確定先の実支出が存在しません`);});
'''
assert old_planned_check in s
new_planned_check = '''  (s.plannedExpenses||[]).forEach(p=>{register("予定支出",p.id);if(!isValidDateString(p.date))issues.push(`予定支出 ${p.id}：不正な日付 ${p.date||'未入力'}`);if(p.status==="confirmed"){const e=s.expenses.find(e=>String(e.id)===String(p.confirmedExpenseId));if(!e)issues.push(`予定支出 ${p.id}：確定先の実支出が存在しません`);else if(e.origin?.type!=="planned"||String(e.origin.sourceId)!==String(p.id))issues.push(`予定支出 ${p.id}：実支出との相互リンクが不整合です`);}else if(p.confirmedExpenseId)issues.push(`予定支出 ${p.id}：未確定なのに確定先IDが残っています`);});
'''
s = s.replace(old_planned_check, new_planned_check, 1)

old_fixed_link = 'else if(e.origin?.type!=="fixed"||String(e.origin.sourceId)!==String(f.id))issues.push(`固定費 ${f.id} ${m}：実支出とのリンクが不整合です`);'
assert old_fixed_link in s
new_fixed_link = 'else if(e.origin?.type!=="fixed"||String(e.origin.sourceId)!==String(f.id))issues.push(`固定費 ${f.id} ${m}：実支出とのリンクが不整合です`);else if(String(e.origin.sourceMonth||"")!==String(m))issues.push(`固定費 ${f.id} ${m}：実支出の元月が不整合です`);'
s = s.replace(old_fixed_link, new_fixed_link, 1)

backup_marker = 'function exportCurrentBackup(){'
assert backup_marker in s
raw_validator = '''function validateV49BackupRaw(raw){
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

'''
s = s.replace(backup_marker, raw_validator + backup_marker, 1)

old_backup_start = '  if(v49raw!==undefined){let candidate;try{candidate=normalizeCurrentState(JSON.parse(v49raw));}catch{}const partialPrefs=()=>{'
assert old_backup_start in s
new_backup_start = '  if(v49raw!==undefined){let rawCandidate=null,parseError=null;try{rawCandidate=JSON.parse(v49raw);}catch(e){parseError=e;}const partialPrefs=()=>{'
s = s.replace(old_backup_start, new_backup_start, 1)
start = s.index('  if(v49raw!==undefined){')
after_prefs = s.index('return restored;};', start) + len('return restored;};')
raw_gate = 'const rawIssues=parseError?["Ver.49データ本体を解析できません"]:validateV49BackupRaw(rawCandidate);if(rawIssues.length){const partial=partialPrefs(),details=rawIssues.slice(0,6).join("\\n");if(!partial.length)return alert(`バックアップ本体に復元できない問題があります。\\n${details}\\n復元できる部分もありません。現在のデータは変更していません。`);if(!confirm(`バックアップ本体に復元できない問題があります。\\n${details}\\n\\n復元可能：${partial.map(x=>x.label).join("・")}\\n家計簿本体は変更せず、この部分だけ復元しますか？`))return;partial.forEach(x=>localStorage.setItem(x.key,x.value));location.reload();return;}const candidate=normalizeCurrentState(rawCandidate);'
s = s[:after_prefs] + raw_gate + s[after_prefs:]

focus_marker = '  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshDateContext();});window.addEventListener("focus",refreshDateContext);\n'
assert focus_marker in s
s = s.replace(focus_marker, focus_marker + '  window.setInterval(refreshDateContext,60000);\n', 1)

p.write_text(s, encoding="utf-8")

p = Path("index.html")
h = p.read_text(encoding="utf-8")
assert "48.08" in h
p.write_text(h.replace("48.08","48.09"), encoding="utf-8")

p = Path("style.css")
css = p.read_text(encoding="utf-8")
css = css.replace("ver.48.08 iOS date input","ver.48.09 iOS date input")
p.write_text(css, encoding="utf-8")

Path("README.md").write_text("""# 家計簿アプリ

## ver.48.09
- 過去月で収入・家計ルールが未設定でも入力要求を出さず、予算結果のみ未計算として表示するよう修正
- Ver.48系からの移行で予定支出と実支出の既存リンクを一意に判定し、重複ID時は推測接続しないよう修正
- Ver.49バックアップを正規化前に検証し、破損データを自動補正して復元しないよう強化
- データ整合性チェックに予定支出・固定費と実支出の双方向リンク確認を追加
- アプリを前面表示したまま日付・月をまたいだ場合も現在日の変化を検知するよう修正
""", encoding="utf-8")
