from pathlib import Path
import re

app=Path('app.js')
s=app.read_text()

def replace_once(old,new):
    global s
    if old not in s:
        raise SystemExit('missing expected text: '+old[:100])
    s=s.replace(old,new,1)

replace_once('const VERSION="48.03";','const VERSION="48.04";')
replace_once('function clearDevRestoreKeys(){[STORAGE_KEYS.state,STORAGE_KEYS.sections,STORAGE_KEYS.stats].forEach(k=>localStorage.removeItem(k));}','function clearDevRestoreKeys(){[STORAGE_KEYS.state,STORAGE_KEYS.sections,STORAGE_KEYS.stats,LEGACY_STORAGE_KEYS.state].forEach(k=>localStorage.removeItem(k));}')
s=s.replace('localStorage.setItem(STORAGE_KEYS.migrated,"1");location.reload();return;}','localStorage.setItem(STORAGE_KEYS.migrated,"complete");location.reload();return;}')
s=s.replace('localStorage.setItem(STORAGE_KEYS.migrated,"1");location.reload();\n}','localStorage.setItem(STORAGE_KEYS.migrated,"complete");location.reload();\n}')
replace_once('localStorage.removeItem(LEGACY_STORAGE_KEYS.state);localStorage.setItem(STORAGE_KEYS.migrated,"1");sessionStorage.setItem("moneyRuleDevV49MigrationCompleted","1");','localStorage.removeItem(LEGACY_STORAGE_KEYS.state);localStorage.setItem(STORAGE_KEYS.migrated,"complete");sessionStorage.setItem("moneyRuleDevV49MigrationCompleted","1");')

helper='''\nfunction setMigrationStateStatus(text){const el=$("migrationStateStatus");if(el)el.textContent=text;}\nfunction showLegacyMigrationGate(legacyRaw,normalized){\n  if(!legacyRaw)return false;\n  $("migrationModal").classList.remove("hidden");\n  const hasTemp=Boolean(normalized);\n  setText("migrationStatus",hasTemp?"旧ver.48.02検証データを検出しました。現在のVer.49仮データは、移行成功時に置き換えます。先にバックアップを保存してください。":"旧ver.48.02検証データを検出しました。移行前バックアップを保存してから開始してください。");\n  setMigrationStateStatus(hasTemp?"移行待ち：旧ver.48.02検証データあり／Ver.49仮データあり":"移行待ち：旧ver.48.02検証データあり");\n  return true;\n}\n'''
replace_once('function applySectionPrefs(){',helper+'\nfunction applySectionPrefs(){')

m=re.search(r'function bootstrap\(\)\{.*?\n\}\nbootstrap\(\);',s,flags=re.S)
if not m:
    raise SystemExit('bootstrap block not found')
bootstrap='''function bootstrap(){
  buildCategoryControls();buildDueSelect("fixedDue");buildDueSelect("fixedEditDue");bindEvents();
  const currentRaw=readJson(STORAGE_KEYS.state,null),normalized=normalizeCurrentState(currentRaw);
  const legacyRaw=readJson(LEGACY_STORAGE_KEYS.state,null);
  const migrationMarker=localStorage.getItem(STORAGE_KEYS.migrated);

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
bootstrap();'''
s=s[:m.start()]+bootstrap+s[m.end():]
app.write_text(s)

idx=Path('index.html')
h=idx.read_text()
h=h.replace('style.css?v=48.03','style.css?v=48.04')
h=h.replace('app.js?v=48.03','app.js?v=48.04')
h=h.replace('ver.48.03','ver.48.04')
old='<div class="section-title"><h2>データ管理</h2><button class="minus-btn" data-section="data-tools">−</button></div>\n    <h3>データ整合性チェック</h3>'
new='<div class="section-title"><h2>データ管理</h2><button class="minus-btn" data-section="data-tools">−</button></div>\n    <p class="entry-hint" id="migrationStateStatus">移行状態を確認中...</p>\n    <h3>データ整合性チェック</h3>'
if old not in h:
    raise SystemExit('data-tools anchor missing')
idx.write_text(h.replace(old,new,1))

Path('README.md').write_text('''# 家計簿アプリ\n\n## ver.48.04\n- Ver.49仮データが先に存在していても、旧ver.48.02検証データが残っている場合は移行画面を優先表示するよう修正\n- 移行成功前は旧ver.48.02検証データを削除せず、移行成功後にのみ旧データを整理するよう移行状態を明確化\n- 誤って作成されたVer.49仮データは、旧データの移行成功時に安全に置き換える仕様に変更\n- データ管理に移行状態を表示し、旧検証データの有無や移行済み状態を確認できるよう改善\n''')
