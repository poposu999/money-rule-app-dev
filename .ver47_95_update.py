from pathlib import Path

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

persistent=['README.md','app.js','index.html','manifest.json','style.css','sw.js']

app=read('app.js')
if 'const VERSION="47.94";' not in app:
    raise SystemExit('unexpected app version')
old='todayLabel.className=`getToday()-label${monthPct<8?" left-edge":monthPct>92?" right-edge":""}`;'
new='todayLabel.className=`today-label${monthPct<8?" left-edge":monthPct>92?" right-edge":""}`;'
if app.count(old)!=1:
    raise SystemExit(f'unexpected Today class bug count: {app.count(old)}')
app=app.replace(old,new,1).replace('const VERSION="47.94";','const VERSION="47.95";',1)
write('app.js',app)

index=read('index.html')
if '47.94' not in index:
    raise SystemExit('47.94 missing from index.html')
write('index.html',index.replace('47.94','47.95'))

sw=read('sw.js')
if '47.94' not in sw:
    raise SystemExit('47.94 missing from sw.js')
write('sw.js',sw.replace('47.94','47.95'))

readme='''# 家計簿アプリ\n\n## ver.47.95\n- 支出ペースメーター下の Today 表示で、JS描画時に誤ったクラス名 `getToday()-label` が設定される不具合を修正\n- Today 表示のクラスを本来の `today-label` に戻し、位置追従・中央寄せ・左右端補正のCSSが正しく適用されるよう修正\n- Today の表示内容・日付計算・メーター位置計算は変更なし\n- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.95 に統一\n'''
write('README.md',readme)

all_text='\n'.join(read(p) for p in persistent)
if 'getToday()-label' in all_text:
    raise SystemExit('bad Today class still remains')
if '47.94' in all_text:
    raise SystemExit('stale version remains')
if 'const VERSION="47.95";' not in app:
    raise SystemExit('new app version missing')
if 'todayLabel.className=`today-label${monthPct<8?" left-edge":monthPct>92?" right-edge":""}`;' not in app:
    raise SystemExit('correct Today class assignment missing')
if '.today-label{' not in read('style.css'):
    raise SystemExit('Today CSS selector missing')
