from pathlib import Path
import re

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

# app.js: version, storage helpers, dead event branch, and debug/comment residue cleanup.
app = read('app.js')
app = app.replace('const VERSION="47.91";\n// Deletion is available only from edit modals.\n', '''const VERSION="47.92";\nconst STORAGE_KEYS={state:KEY,sections:"moneyRuleSectionPrefs",stats:"moneyRuleStatPrefs"};\nfunction readStorage(key,fallback){try{const raw=localStorage.getItem(key);if(raw===null)return structuredClone(fallback);const value=JSON.parse(raw);return value&&typeof value==="object"?value:structuredClone(fallback);}catch{return structuredClone(fallback);}}\nfunction writeStorage(key,value){localStorage.setItem(key,JSON.stringify(value));}\n''')
old_load = 'try{state=JSON.parse(localStorage.getItem(KEY)||JSON.stringify(defaultState));}catch(e){state=structuredClone(defaultState);}'
if old_load not in app:
    raise SystemExit('state load pattern not found')
app = app.replace(old_load, 'state=readStorage(STORAGE_KEYS.state,defaultState);')
old_save = 'function save(){localStorage.setItem(KEY,JSON.stringify(state));}'
if old_save not in app:
    raise SystemExit('save pattern not found')
app = app.replace(old_save, 'function save(){writeStorage(STORAGE_KEYS.state,state);}')
old_prefs = 'const sectionPrefs=JSON.parse(localStorage.getItem("moneyRuleSectionPrefs")||"{}"),statPrefs=JSON.parse(localStorage.getItem("moneyRuleStatPrefs")||"{}");'
if old_prefs not in app:
    raise SystemExit('prefs load pattern not found')
app = app.replace(old_prefs, 'const sectionPrefs=readStorage(STORAGE_KEYS.sections,{}),statPrefs=readStorage(STORAGE_KEYS.stats,{});')
app = app.replace('localStorage.setItem("moneyRuleSectionPrefs",JSON.stringify(sectionPrefs))', 'writeStorage(STORAGE_KEYS.sections,sectionPrefs)')
app = app.replace('localStorage.setItem("moneyRuleStatPrefs",JSON.stringify(statPrefs))', 'writeStorage(STORAGE_KEYS.stats,statPrefs)')
old_listener = '''document.addEventListener("click",e=>{const b=e.target.closest(".minus-btn");if(b){toggleSection(b.dataset.section);return;}const t=e.target.closest('.stat-toggle-btn[data-stat="income"]');if(t){statPrefs.income=true;writeStorage(STORAGE_KEYS.stats,statPrefs);applyStatPrefs();}});$("incomeToggle").onclick=()=>{statPrefs.income=!Boolean(statPrefs.income);writeStorage(STORAGE_KEYS.stats,statPrefs);applyStatPrefs();};'''
new_listener = '''document.addEventListener("click",e=>{const b=e.target.closest(".minus-btn");if(b)toggleSection(b.dataset.section);});$("incomeToggle").onclick=()=>{statPrefs.income=!Boolean(statPrefs.income);writeStorage(STORAGE_KEYS.stats,statPrefs);applyStatPrefs();};'''
if old_listener not in app:
    raise SystemExit('dead stat-toggle listener pattern not found')
app = app.replace(old_listener, new_listener)
write('app.js', app)

# style.css: remove selectors left behind by earlier dashboard/layout implementations.
css = read('style.css')
patterns = [
    r'^header\{[^\n]*\}\n',
    r'^\.quick-entry\{[^\n]*\}\n',
    r'^\.list\{[^\n]*\}\n',
    r'^\.expense\{[^\n]*\}\n',
    r'^\.expense:last-child\{[^\n]*\}\n',
    r'^\.expense-right\{[^\n]*\}\n',
    r'^\.section-controls\{[^\n]*\}\n',
    r'^\.section-hidden\{[^\n]*\}\n',
    r'^\.stat-toggle-btn\{[^\n]*\}\n',
    r'^\.income-restore\.hidden\{[^\n]*\}\n',
    r'^\.today-budget\{[^\n]*\}\n',
    r'^\.today-budget strong\{[^\n]*\}\n',
    r'^\.today-budget span\{[^\n]*\}\n',
    r'^\.dashboard-grid\{[^\n]*\}\n',
    r'^\.dashboard-grid>div\{[^\n]*\}\n',
    r'^\.dashboard-grid span\{[^\n]*\}\n',
    r'^\.dashboard-grid strong\{[^\n]*\}\n',
    r'^\.spending-status(?:\.[\w-]+)?\{[^\n]*\}\n',
    r'^\.breakdown-row\{[^\n]*\}\n',
    r'^\.breakdown-row:last-of-type\{[^\n]*\}\n',
    r'^\.highlight-row\{[^\n]*\}\n',
    r'^\.budget-breakdown \.muted\{[^\n]*\}\n',
    r'^\.forecast-main\{[^\n]*\}\n',
    r'^\.forecast-main strong\{[^\n]*\}\n',
    r'^\.forecast-main span\{[^\n]*\}\n',
]
for pattern in patterns:
    css = re.sub(pattern, '', css, flags=re.M)
css = css.replace('.validation-ok,.validation-warning{margin-top:8px;font-size:12px;font-weight:600;}\n.validation-warning{color:#b42318;}\n.validation-ok{color:#18794e;}\n', '.validation-warning{margin-top:8px;font-size:12px;font-weight:600;color:#b42318;}\n')
write('style.css', css)

# Version-bearing files.
index = read('index.html').replace('47.91', '47.92')
write('index.html', index)
sw = read('sw.js').replace('47.91', '47.92')
write('sw.js', sw)

readme = '''# 家計簿アプリ\n\n## ver.47.92\n- console.log / デバッグ用出力 / コメントアウトされた旧実装が残っていないことを再確認\n- 旧ダッシュボードや旧レイアウト由来の未使用CSSを削除\n- 廃止済みの収入表示トグル用 `.stat-toggle-btn` のCSS・イベント処理を削除\n- 通常のJSONストレージ読み書きを `readStorage` / `writeStorage` に集約\n- 家計簿本体・セクション開閉設定・収入表示設定の保存処理を共通化\n- バックアップの全キー走査・復元処理は用途が異なるため低レベルの localStorage API を維持\n- 既存の保存キーとデータ構造は変更せず、利用中データとの互換性を維持\n- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.92 に統一\n'''
write('README.md', readme)

# Guardrails for this cleanup.
app = read('app.js')
css = read('style.css')
index = read('index.html')
all_persistent = '\n'.join(read(p) for p in ['README.md','app.js','index.html','manifest.json','style.css','sw.js'])
if 'console.log' in all_persistent or 'console.debug' in all_persistent:
    raise SystemExit('debug console output remains')
if re.search(r'^\s*//\s*(?:const|let|var|function|if\b|for\b|while\b|document\.|state\.|\$\()', app, flags=re.M):
    raise SystemExit('commented-out JS implementation remains')
for token in ['.today-budget', '.dashboard-grid', '.spending-status', '.breakdown-row', '.highlight-row', '.budget-breakdown', '.forecast-main', '.quick-entry', '.section-controls', '.section-hidden', '.stat-toggle-btn', '.validation-ok']:
    if token in css:
        raise SystemExit(f'obsolete CSS remains: {token}')
if '.stat-toggle-btn' in app or '.stat-toggle-btn' in index:
    raise SystemExit('obsolete stat-toggle implementation remains')
if '47.91' in all_persistent:
    raise SystemExit('stale version remains')
for required in ['readStorage(STORAGE_KEYS.state,defaultState)', 'writeStorage(STORAGE_KEYS.state,state)', 'readStorage(STORAGE_KEYS.sections,{})', 'readStorage(STORAGE_KEYS.stats,{})']:
    if required not in app:
        raise SystemExit(f'storage centralization missing: {required}')
