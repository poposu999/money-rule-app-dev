from pathlib import Path

OLD='47.78'
NEW='47.79'


def must_replace(text, old, new, label, count=None):
    hits=text.count(old)
    if hits==0:
        raise RuntimeError(f'Expected text not found: {label}')
    if count is not None and hits!=count:
        raise RuntimeError(f'Unexpected occurrence count for {label}: {hits}')
    return text.replace(old,new)


# index.html
p=Path('index.html')
html=p.read_text()
if OLD not in html:
    raise RuntimeError('Old version not found in index.html')
html=html.replace(OLD,NEW)
html=html.replace('>変更を保存</button>','>保存</button>')
old_actions='<div class="modal-actions"><button id="deleteEditExpense" type="button" class="edit-modal-delete-btn">削除</button><button id="rollbackToPlanned" type="button" class="secondary-btn">今月の予定支出に移動</button><button id="cancelEdit" class="secondary-btn">キャンセル</button><button id="saveEdit">保存</button></div>'
new_actions='<div class="edit-modal-danger-row"><button id="deleteEditExpense" type="button" class="edit-modal-delete-btn">削除</button></div><div class="modal-actions expense-edit-actions"><button id="rollbackToPlanned" type="button" class="secondary-btn">今月の予定支出に移動</button><button id="cancelEdit" class="secondary-btn">キャンセル</button><button id="saveEdit">保存</button></div>'
html=must_replace(html,old_actions,new_actions,'expense edit modal action layout',1)
html=html.replace('<p id="deleteConfirmMessage">この項目を削除しますか？</p>','<p id="deleteConfirmMessage">削除する項目を確認してください。</p>')
p.write_text(html)

# app.js
p=Path('app.js')
app=p.read_text()
app=must_replace(app,'const VERSION="47.78";','const VERSION="47.79";','app version',1)
old_message='''      if(message){
        const name=item.memo||item.category||cfg.label;
        message.textContent=kind==="fixed"
? `${cfg.label}「${name}」 ${yen(item.amount)} を削除しますか？ 過去に確定した支出は削除されません。`
: `${cfg.label}「${name}」 ${yen(item.amount)} を削除しますか？`;
      }'''
new_message='''      if(message){
        const memo=String(item.memo||"").trim()||"なし";
        const details=[
          `${cfg.label}を削除しますか？`,
          `カテゴリ：${item.category||"その他"}`,
          `メモ：${memo}`,
          `金額：${yen(item.amount)}`
        ];
        if(kind==="fixed")details.push("※ 過去に確定した支出は削除されません。");
        message.textContent=details.join("\\n");
      }'''
app=must_replace(app,old_message,new_message,'delete confirmation details',1)
app=must_replace(app,'class="edit-delete-buttons"','class="table-actions"','table action class',3)
if 'edit-delete-buttons' in app or 'expense-actions' in app:
    raise RuntimeError('Legacy table action class remains in app.js')
p.write_text(app)

# style.css
p=Path('style.css')
css=p.read_text()
old_group='.expense-table .edit-delete-buttons,.expense-table .expense-actions,.planned-expense-table .edit-delete-buttons,.planned-expense-table .expense-actions,.fixed-expense-table .edit-delete-buttons,.fixed-expense-table .expense-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:nowrap;gap:4px}'
new_group='.expense-table .table-actions,.planned-expense-table .table-actions,.fixed-expense-table .table-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:nowrap;gap:4px}'
css=must_replace(css,old_group,new_group,'canonical table action selector',1)
css=must_replace(css,'padding:6px 6px;border-bottom:1px solid #eee;vertical-align:middle;white-space:nowrap;text-align:left}','padding:4px 6px;border-bottom:1px solid #eee;vertical-align:middle;white-space:nowrap;text-align:left;line-height:1.15}','desktop table row density',1)
css=must_replace(css,'min-height:24px;margin:0;padding:3px 6px;font-size:10px;line-height:1.25','min-height:20px;margin:0;padding:2px 6px;font-size:10px;line-height:1.1','desktop table button density',1)
css=must_replace(css,'padding:4px 3px;font-size:10px}','padding:1px 3px;font-size:10px;line-height:1.1}','mobile table row density',1)
css=must_replace(css,'font-size:8px;padding:2px 3px;min-height:22px}','font-size:8px;padding:1px 3px;min-height:18px;line-height:1.1}','mobile table button density',1)
marker='.edit-modal-delete-btn{margin-right:auto!important;background:#fff0f0;color:#b42318;border:1px solid #efb4b4;}\n'
addition=(marker+
          '.edit-modal-danger-row{display:flex;justify-content:center;margin:4px 0 10px;}\n'
          '.edit-modal-danger-row .edit-modal-delete-btn{margin:0!important;min-width:88px;}\n'
          '.expense-edit-actions{align-items:center;flex-wrap:nowrap;}\n'
          '.expense-edit-actions #rollbackToPlanned{white-space:nowrap;}\n'
          '#deleteConfirmMessage{white-space:pre-line;line-height:1.65;}\n')
css=must_replace(css,marker,addition,'edit modal controls',1)
css += '\n@media(max-width:600px){\n  .expense-edit-actions{gap:5px;}\n  .expense-edit-actions button{padding:8px 8px;font-size:11px;white-space:nowrap;}\n  .expense-edit-actions #rollbackToPlanned{flex:1 1 auto;min-width:0;}\n}\n'
if 'edit-delete-buttons' in css or 'expense-actions' in css:
    raise RuntimeError('Legacy table action CSS remains')
p.write_text(css)

# sw.js
p=Path('sw.js')
sw=p.read_text()
if OLD not in sw:
    raise RuntimeError('Old version not found in sw.js')
p.write_text(sw.replace(OLD,NEW))

# README.md
Path('README.md').write_text(
    '# 家計簿アプリ\n\n'
    '## ver.47.79\n'
    '- スマホ表示の一覧テーブルをさらに高密度化し、1画面で確認できる行数を増加\n'
    '- 一覧の操作ラッパー名を table-actions に整理し、削除撤去後の旧クラスを削除\n'
    '- 削除確認にカテゴリ・メモ・金額を表示し、対象内容を確認しやすく改善\n'
    '- 通常支出の編集画面で削除を独立行にし、その下に「今月の予定支出に移動 / キャンセル / 保存」を配置\n'
    '- 各編集画面の「変更を保存」を「保存」に短縮\n'
    '- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.79 に統一\n'
)
