from pathlib import Path
import re

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

# app.js
app=read('app.js')
if 'const VERSION="47.92";' not in app:
    raise SystemExit('unexpected app version')
app=app.replace('const VERSION="47.92";','const VERSION="47.93";')
app=app.replace('fixedCategory:"住居費"','fixedCategory:""')
old_date='const now=new Date();\nconst today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;'
new_date='function getToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}\nlet lastKnownDate=getToday();'
if old_date not in app:
    raise SystemExit('static date block not found')
app=app.replace(old_date,new_date)
app=re.sub(r'\btoday\b','getToday()',app)
old_fixed_render='const y=now.getFullYear(),m=now.getMonth()+1,last=new Date(y,m,0).getDate();'
new_fixed_render='const current=new Date(),y=current.getFullYear(),m=current.getMonth()+1,last=new Date(y,m,0).getDate();'
if old_fixed_render not in app:
    raise SystemExit('fixed expense date block not found')
app=app.replace(old_fixed_render,new_fixed_render)
app=app.replace('renderMonthlyChart();renderSavingsChart();','renderMonthlyChart();')
app=app.replace('renderMonthlyChart();renderSavingsChart();});','renderMonthlyChart();});')
app,n=re.subn(r'function renderSavingsChart\(\)\{.*?\}\n(?=\$\("saveIncome"\))','',app,flags=re.S)
if n!=1:
    raise SystemExit(f'renderSavingsChart removal count: {n}')
app=app.replace('if(!svg)return {line:()=>{},text:()=>{},poly:()=>{},circle:()=>{},rect:()=>{}};','if(!svg)return {line:()=>{},text:()=>{},poly:()=>{},circle:()=>{}};')
app,n=re.subn(r',rect:\(x,y,w,h,cls="bar"\)=>\{.*?svg\.appendChild\(el\);\}(?=\};\})','',app,flags=re.S)
if n!=1:
    raise SystemExit(f'svg rect removal count: {n}')
old_restore='function restoreInputMemory(){const m=state.memory;$("expenseCategory").value=m.expenseCategory||"食費";sessionExpenseDate=getToday();$("expenseDate").value=getToday();$("expenseMemo").value="";$("plannedCategory").value="食費";$("plannedMemo").value="";$("plannedDate").value=getToday();$("fixedCategory").value="住居費";$("fixedMemo").value="";$("fixedDay").value="";document.querySelectorAll("#categoryQuick button").forEach(b=>b.classList.toggle("selected",b.dataset.category===$("expenseCategory").value));document.querySelectorAll("#fixedCategoryQuick button").forEach(b=>b.classList.toggle("selected",b.dataset.category===$("fixedCategory").value));document.querySelectorAll("#plannedCategoryQuick button").forEach(b=>b.classList.toggle("selected",b.dataset.category===$("plannedCategory").value));}'
new_restore='function restoreInputMemory(){const m=state.memory;$("expenseCategory").value=m.expenseCategory||"食費";sessionExpenseDate=getToday();$("expenseDate").value=getToday();$("expenseMemo").value="";$("plannedCategory").value="食費";$("plannedMemo").value="";$("plannedDate").value=getToday();$("fixedCategory").value="";$("fixedMemo").value="";$("fixedDay").value="";document.querySelectorAll("#categoryQuick button").forEach(b=>b.classList.toggle("selected",b.dataset.category===$("expenseCategory").value));document.querySelectorAll("#fixedCategoryQuick button").forEach(b=>b.classList.toggle("selected",b.dataset.category===$("fixedCategory").value));document.querySelectorAll("#plannedCategoryQuick button").forEach(b=>b.classList.toggle("selected",b.dataset.category===$("plannedCategory").value));}'
if old_restore not in app:
    raise SystemExit('restoreInputMemory pattern not found')
app=app.replace(old_restore,new_restore)
old_add_fixed='$("addFixedExpense").onclick=()=>{const amount=Number(calculateAmountExpression($("fixedAmount").value));const day=Math.round(Number($("fixedDay").value)||0);if(!amount||amount<0){alert("金額を入力してください。例：10000+2000");return;}if(day<1||day>31){alert("支払日は1〜31日で入力してください。");return;}state.fixedExpenses.push({id:Date.now()+Math.random(),amount,category:$("fixedCategory").value,memo:$("fixedMemo").value.trim(),day,order:Date.now(),paidMonths:[]});$("fixedAmount").value="";save();renderFixedExpenses();};'
new_add_fixed='$("addFixedExpense").onclick=()=>{const amount=Number(calculateAmountExpression($("fixedAmount").value));const day=Math.round(Number($("fixedDay").value)||0),category=$("fixedCategory").value;if(!amount||amount<0){alert("金額を入力してください。例：10000+2000");return;}if(!category){alert("カテゴリを選択してください。");return;}if(day<1||day>31){alert("支払日は1〜31日で入力してください。");return;}state.fixedExpenses.push({id:Date.now()+Math.random(),amount,category,memo:$("fixedMemo").value.trim(),day,order:Date.now(),paidMonths:[]});$("fixedAmount").value="";save();renderFixedExpenses();};'
if old_add_fixed not in app:
    raise SystemExit('addFixedExpense pattern not found')
app=app.replace(old_add_fixed,new_add_fixed)
refresh='function refreshDateContext(){const current=getToday();if(current===lastKnownDate)return;const previous=lastKnownDate;lastKnownDate=current;if(!sessionExpenseDate||sessionExpenseDate===previous)sessionExpenseDate=current;const expenseDate=$("expenseDate"),plannedDate=$("plannedDate");if(expenseDate&&(!expenseDate.value||expenseDate.value===previous))expenseDate.value=current;if(plannedDate&&(!plannedDate.value||plannedDate.value===previous))plannedDate.value=current;renderExpenses();renderPlannedExpenses();renderFixedExpenses();calc();}\n'
marker='function renderPaceTimeline(day,last)'
if marker not in app:
    raise SystemExit('renderPaceTimeline marker not found')
app=app.replace(marker,refresh+marker,1)
init_marker='loadSettings();restoreInputMemory();'
if init_marker not in app:
    raise SystemExit('initialization marker not found')
app=app.replace(init_marker,'document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshDateContext();});window.addEventListener("focus",refreshDateContext);\n'+init_marker,1)
write('app.js',app)

# index.html
index=read('index.html')
index=index.replace('47.92','47.93')
old_fixed_select='<select class="category-select" id="fixedCategory"><option>食費</option>'
new_fixed_select='<select class="category-select" id="fixedCategory"><option value="">選択してください</option><option>食費</option>'
if old_fixed_select not in index:
    raise SystemExit('fixedCategory select pattern not found')
index=index.replace(old_fixed_select,new_fixed_select,1)
savings_html='<div class="card chart-card"><h2>月別の貯金額</h2><div class="bar-chart-wrap"><svg aria-label="月別の貯金額" id="savingsChart" role="img" viewbox="0 0 700 260"></svg></div><div class="chart-summary" id="savingsChartSummary"></div></div>'
if savings_html not in index:
    raise SystemExit('savings chart markup not found')
index=index.replace(savings_html,'',1)
write('index.html',index)

# style.css
css=read('style.css')
css=css.replace('.line-chart-wrap,.bar-chart-wrap{width:100%;overflow:hidden;}','.line-chart-wrap{width:100%;overflow:hidden;}')
css=css.replace('.line-chart-wrap svg,.bar-chart-wrap svg{width:100%;height:auto;display:block;}','.line-chart-wrap svg{width:100%;height:auto;display:block;}')
css=css.replace('.bar{fill:#202124;}\n','')
write('style.css',css)

# sw.js
sw=read('sw.js').replace('47.92','47.93')
write('sw.js',sw)

# README.md
readme='''# 家計簿アプリ\n\n## ver.47.93\n- 固定費の新規入力時はカテゴリを未選択の状態で開始し、カテゴリ未選択では登録できないように変更\n- 「月別の貯金額」グラフを画面・描画処理・不要になったSVG/CSS処理ごと削除\n- 起動時に固定していた日付を廃止し、必要な時点で現在日付を取得する方式に変更\n- 日付をまたいでアプリへ戻った場合、現在日付・今月表示・固定費表示・Today位置を自動更新\n- ユーザーが手動で別日付を選んでいる入力欄は、日付更新時に不要に上書きしないよう配慮\n- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.93 に統一\n'''
write('README.md',readme)

# Guardrails
app=read('app.js')
index=read('index.html')
css=read('style.css')
all_text='\n'.join(read(p) for p in ['README.md','app.js','index.html','manifest.json','style.css','sw.js'])
if '47.92' in all_text:
    raise SystemExit('stale version remains')
for token in ['renderSavingsChart','savingsChart','savingsChartSummary','bar-chart-wrap','.bar{','rect:(x,y,w,h']:
    if token in app or token in index or token in css:
        raise SystemExit(f'savings chart residue remains: {token}')
if 'const now=new Date();' in app or re.search(r'\bconst today\b',app):
    raise SystemExit('static date state remains')
for token in ['function getToday()','function refreshDateContext()','visibilitychange','window.addEventListener("focus",refreshDateContext)']:
    if token not in app:
        raise SystemExit(f'dynamic date handling missing: {token}')
if '<select class="category-select" id="fixedCategory"><option value="">選択してください</option>' not in index:
    raise SystemExit('fixed category blank option missing')
if 'if(!category){alert("カテゴリを選択してください。");return;}' not in app:
    raise SystemExit('fixed category validation missing')
