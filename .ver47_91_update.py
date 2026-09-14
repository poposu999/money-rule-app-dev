from pathlib import Path

# index.html
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old_title = '  <div class="pace-compare-title"><strong>支出ペース</strong></div>\n'
if old_title not in s:
    raise SystemExit('pace compare title not found')
s = s.replace(old_title, '', 1)
old_label = '      <span>使った金額</span>\n'
if old_label not in s:
    raise SystemExit('spent label not found')
s = s.replace(old_label, '      <span>支出ペース</span>\n', 1)
s = s.replace('47.90', '47.91')
p.write_text(s, encoding='utf-8')

# app.js
p = Path('app.js')
s = p.read_text(encoding='utf-8')
old_note = 'planned>0?`予定支出 ${yen(planned)} を差し引いた残り`:"現在の残り予算"'
new_note = 'planned>0?`(予定支出 ${yen(planned)} を差し引き済み)`:"現在の残り予算"'
if old_note not in s:
    raise SystemExit('planned note expression not found')
s = s.replace(old_note, new_note, 1)
s = s.replace('47.90', '47.91')
p.write_text(s, encoding='utf-8')

# style.css: remove selectors made obsolete by removing the standalone heading
p = Path('style.css')
s = p.read_text(encoding='utf-8')
for obsolete in [
    '.pace-compare-title{margin-bottom:10px;}\n',
    '.pace-compare-title strong{font-size:14px;color:#202124;}\n',
]:
    if obsolete not in s:
        raise SystemExit(f'obsolete CSS not found: {obsolete.strip()}')
    s = s.replace(obsolete, '', 1)
p.write_text(s, encoding='utf-8')

# sw.js
p = Path('sw.js')
s = p.read_text(encoding='utf-8').replace('47.90', '47.91')
p.write_text(s, encoding='utf-8')

# README.md
Path('README.md').write_text('''# 家計簿アプリ\n\n## ver.47.91\n- 支出ペース欄の独立した見出しを削除し、旧「使った金額」の位置を「支出ペース」に変更\n- 移動する支出額・▼ポインター・Today・日付目盛りの構成は維持\n- 予定支出がある場合の残り予算補足を「(予定支出 ¥○○ を差し引き済み)」に変更\n- 不要になった支出ペース見出し用CSSを削除\n- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.91 に統一\n''', encoding='utf-8')
