from pathlib import Path
import re

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

app=read('app.js')
if 'const VERSION="47.93";' not in app:
    raise SystemExit('unexpected app version')
app=app.replace('const VERSION="47.93";','const VERSION="47.94";',1)

app,count=re.subn(r'^function calculateAmountExpression\([^\n]*\)\{[^\n]*\}\n','',app,count=1,flags=re.M)
if count!=1:
    raise SystemExit('amount expression function removal failed')
app,count=re.subn(r'^function bindAmountCalculator\([^\n]*\)\{[^\n]*\}\n','',app,count=1,flags=re.M)
if count!=1:
    raise SystemExit('amount calculator binding removal failed')

replacements={
    'Number(calculateAmountExpression($("expenseAmount").value))':'Number($("expenseAmount").value)',
    'Number(calculateAmountExpression($("fixedAmount").value))':'Number($("fixedAmount").value)',
    'Number(calculateAmountExpression($("fixedEditAmount").value))':'Number($("fixedEditAmount").value)',
    'Number(calculateAmountExpression($("plannedAmount").value))':'Number($("plannedAmount").value)',
    'Number(calculateAmountExpression($("editAmount").value))':'Number($("editAmount").value)',
    'Number(calculateAmountExpression($("plannedEditAmount").value))':'Number($("plannedEditAmount").value)',
    'alert("金額を入力してください。例：1200+300")':'alert("金額を入力してください。")',
    'alert("金額を入力してください。例：10000+2000")':'alert("金額を入力してください。")',
    'alert("金額を入力してください。例：5000+1000")':'alert("金額を入力してください。")',
    'bindAmountCalculator("expenseAmount");bindAmountCalculator("plannedAmount");bindAmountCalculator("editAmount");bindAmountCalculator("plannedEditAmount");':''
}
for old,new in replacements.items():
    if old not in app:
        raise SystemExit(f'expected pattern missing: {old}')
    app=app.replace(old,new)

write('app.js',app)

index=read('index.html').replace('47.93','47.94')
write('index.html',index)
sw=read('sw.js').replace('47.93','47.94')
write('sw.js',sw)

readme='''# 家計簿アプリ\n\n## ver.47.94\n- 金額欄は `type="number"` の数字入力に統一し、計算式入力機能を廃止\n- 金額欄に入力された値はそのまま数値として保存する方式に統一\n- 計算式入力用の関数・blur / Enterイベント・関連する不要コードを削除\n- 支出・予定支出・固定費・各編集画面の金額処理を同じ方式に統一\n- 計算式を案内していたエラーメッセージを通常の金額入力案内に変更\n- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.94 に統一\n'''
write('README.md',readme)

persistent=['README.md','app.js','index.html','manifest.json','style.css','sw.js']
all_text='\n'.join(read(p) for p in persistent)
for token in ['calculateAmountExpression','bindAmountCalculator','1200+300','10000+2000','5000+1000']:
    if token in app:
        raise SystemExit(f'obsolete calculator token remains in app.js: {token}')
if '47.93' in all_text:
    raise SystemExit('stale version remains')
if 'const VERSION="47.94";' not in app:
    raise SystemExit('new app version missing')
for expr in [
    'Number($("expenseAmount").value)',
    'Number($("fixedAmount").value)',
    'Number($("fixedEditAmount").value)',
    'Number($("plannedAmount").value)',
    'Number($("editAmount").value)',
    'Number($("plannedEditAmount").value)'
]:
    if expr not in app:
        raise SystemExit(f'numeric amount read missing: {expr}')
for input_id in ['expenseAmount','fixedAmount','plannedAmount','editAmount','fixedEditAmount','plannedEditAmount']:
    if not re.search(rf'<input[^>]*id="{input_id}"[^>]*type="number"|<input[^>]*type="number"[^>]*id="{input_id}"',index):
        raise SystemExit(f'number input missing: {input_id}')
