from pathlib import Path

VERSION_OLD = "47.87"
VERSION_NEW = "47.88"

index_path = Path("index.html")
app_path = Path("app.js")
style_path = Path("style.css")
readme_path = Path("README.md")
sw_path = Path("sw.js")

index = index_path.read_text()
app = app_path.read_text()
style = style_path.read_text()
sw = sw_path.read_text()

old_stats = '''<section class="card stats" data-section-content="stats"><div class="section-title full"><h2>今月の状況</h2><button class="minus-btn" data-section="stats">−</button></div><div class="stat"><span>今月使った金額</span><strong id="monthSpent">¥0</strong></div><div class="stat highlight"><span>今月の残り予算 <small id="remainingDaysLabel">（残り0日）</small></span><strong id="remainingBudget">¥0</strong></div><div class="stat"><span>今月の予定支出</span><strong id="plannedExpenseView">¥0</strong></div><div class="stat"><span>1日あたりの目安 <small>（残り予算 ÷ 残り日数）</small></span><strong id="dailyBudget">¥0</strong></div><div class="stat"><span>今月の貯金予定</span><strong id="plannedSavings">¥0</strong></div><div class="stat"><span>今月使える予算</span><strong id="spendingBudget">¥0</strong></div><div class="stat" id="incomeStat"><span>前月の収入</span><strong id="incomeView">¥0</strong></div><div class="stat" id="extraIncomeStat"><span>毎月の最低限の手取りからの超過分</span><strong id="extraIncome">¥0</strong></div><div class="income-restore" id="incomeRestore"><button id="incomeToggle" class="secondary-btn" type="button">前月の収入を非表示</button></div></section>'''
new_stats = '''<section class="card stats" data-section-content="stats"><div class="section-title full"><h2>今月の内訳</h2><button class="minus-btn" data-section="stats">−</button></div><div class="stat"><span>今月使える予算</span><strong id="spendingBudget">¥0</strong></div><div class="stat"><span>今月の予定支出</span><strong id="plannedExpenseView">¥0</strong></div><div class="stat"><span>今月の貯金予定</span><strong id="plannedSavings">¥0</strong></div><div class="stat" id="incomeStat"><span>前月の収入</span><strong id="incomeView">¥0</strong></div><div class="stat" id="extraIncomeStat"><span>超過分</span><strong id="extraIncome">¥0</strong></div><div class="income-restore" id="incomeRestore"><button id="incomeToggle" class="secondary-btn" type="button">前月の収入を非表示</button></div></section>'''
if old_stats not in index:
    raise SystemExit("stats section pattern not found")
index = index.replace(old_stats, new_stats, 1)

old_calc = '''function calc(){const n=getNumbers(),d=getDayInfo(),daily=Math.max(0,n.remaining)/Math.max(1,d.remainingDays);$("incomeView").textContent=yen(n.totalIncome);$("extraIncome").textContent=yen(n.extra);$("plannedSavings").textContent=yen(n.plannedSavings);$("spendingBudget").textContent=yen(n.spendingBudget);$("monthSpent").textContent=yen(n.spent);$("remainingBudget").textContent=yen(n.remaining);$("remainingDaysLabel").textContent=`（残り${d.remainingDays}日）`;$("dailyBudget").textContent=yen(daily);$("plannedExpenseView").textContent=yen(n.plannedAmount);renderBudgetDashboard(n,d);renderValidation(n);renderFixedExpenses();renderCategoryChart(n.es);renderDailyChart(n.es);renderMonthlyChart();renderSavingsChart();}'''
new_calc = '''function calc(){const n=getNumbers(),d=getDayInfo();$("incomeView").textContent=yen(n.totalIncome);$("extraIncome").textContent=yen(n.extra);$("plannedSavings").textContent=yen(n.plannedSavings);$("spendingBudget").textContent=yen(n.spendingBudget);$("plannedExpenseView").textContent=yen(n.plannedAmount);renderBudgetDashboard(n,d);renderValidation(n);renderFixedExpenses();renderCategoryChart(n.es);renderDailyChart(n.es);renderMonthlyChart();renderSavingsChart();}'''
if old_calc not in app:
    raise SystemExit("calc pattern not found")
app = app.replace(old_calc, new_calc, 1)

if '.highlight{border:2px solid #202124;}\n' not in style:
    raise SystemExit("obsolete highlight style pattern not found")
style = style.replace('.highlight{border:2px solid #202124;}\n', '', 1)

anchor = '.income-restore{display:flex;justify-content:center;margin:2px 0 0;padding-top:2px;}\n'
if anchor not in style:
    raise SystemExit("income restore style anchor not found")
style = style.replace(anchor, anchor + '.stats.card .income-restore{grid-column:1/-1;}\n', 1)

for name, text in (("index.html", index), ("app.js", app), ("sw.js", sw)):
    if VERSION_OLD not in text:
        raise SystemExit(f"old version missing from {name}")

index = index.replace(VERSION_OLD, VERSION_NEW)
app = app.replace(VERSION_OLD, VERSION_NEW)
sw = sw.replace(VERSION_OLD, VERSION_NEW)

readme = '''# 家計簿アプリ

## ver.47.88
- 「今月の状況」を「今月の内訳」に変更
- 上部ダッシュボードと重複していた「今月使った金額」「今月の残り予算」「1日あたりの目安」を内訳欄から削除
- 内訳を「今月使える予算 / 今月の予定支出 / 今月の貯金予定 / 前月の収入 / 超過分」の5項目に整理
- 「毎月の最低限の手取りからの超過分」を「超過分」に短縮
- 収入表示の切り替え機能は維持し、切り替えボタンを全幅の行に配置
- 不要になった残り予算強調用スタイルとDOM更新処理を削除
- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.88 に統一
'''

index_path.write_text(index)
app_path.write_text(app)
style_path.write_text(style)
readme_path.write_text(readme)
sw_path.write_text(sw)
