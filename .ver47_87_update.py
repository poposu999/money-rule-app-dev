from pathlib import Path
import re

# index.html
p = Path('index.html')
s = p.read_text()
new_dashboard = '''<section class="card budget-dashboard" data-section-content="progress">
<div class="section-title budget-dashboard-title"><h2>今月の予算</h2><button class="minus-btn" data-section="progress">−</button></div>
<div class="budget-hero">
  <span class="budget-hero-prefix">今月残り</span>
  <strong id="dashboardRemaining">¥0</strong>
  <span class="budget-hero-suffix">使える</span>
</div>
<span class="budget-hero-note" id="dashboardRemainingNote">現在の残り予算</span>
<div class="budget-daily-guide">
  <span>1日あたりの目安</span>
  <strong id="dashboardDailyBudget">¥0 / 日</strong>
  <small id="dashboardDailyDays">（残り0日）</small>
</div>
<div class="pace-compare">
  <div class="pace-compare-title"><strong>支出ペース</strong></div>
  <div class="pace-row">
    <div class="pace-row-head"><span>使った金額</span><strong id="budgetSpentValue">¥0</strong></div>
    <div class="pace-bar pace-spending"><div id="budgetProgressBar"></div></div>
  </div>
  <div class="pace-row pace-row-calendar">
    <div class="pace-row-head"><span>今月の経過</span><strong id="monthProgressValue">0日経過</strong></div>
    <div class="pace-bar pace-calendar"><div id="monthProgressBar"></div></div>
    <div class="progress-timeline-labels" id="progressTimelineLabels"></div>
  </div>
</div>
<div class="budget-status neutral" id="dashboardStatus"><strong id="dashboardStatusLabel">データ待ち</strong><span id="dashboardStatusMessage">支出を登録するとペースを判定します。</span></div>
</section>'''
s, n = re.subn(r'<section class="card budget-dashboard" data-section-content="progress">.*?</section>(?=<section class="card entry-section")', new_dashboard, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'index dashboard replace failed: {n}')
s = s.replace('47.86', '47.87')
p.write_text(s)

# app.js
p = Path('app.js')
s = p.read_text()
start = s.find('function renderBudgetDashboard(n,d){')
end = s.find('\nfunction renderValidation', start)
if start < 0 or end < 0:
    raise SystemExit('renderBudgetDashboard block not found')
new_func = '''function renderBudgetDashboard(n,d){const budget=Math.max(0,Number(n.spendingBudget)||0),spent=Math.max(0,Number(n.spent)||0),planned=Math.max(0,Number(n.plannedAmount)||0),remaining=Number(n.remaining)||0,rawPct=budget>0?spent/budget*100:0,pct=Number.isFinite(rawPct)?Math.max(0,rawPct):0,ideal=budget*(d.day/Math.max(1,d.last)),diff=spent-ideal,projected=(!spent&&!planned)?0:(spent/Math.max(1,d.day))*d.last+planned,daily=Math.max(0,remaining)/Math.max(1,d.remainingDays);$("dashboardRemaining").textContent=yen(remaining);$("dashboardRemainingNote").textContent=planned>0?`予定支出 ${yen(planned)} を差し引いた残り`:"現在の残り予算";$("dashboardDailyBudget").textContent=`${yen(daily)} / 日`;$("dashboardDailyDays").textContent=`（残り${d.remainingDays}日）`;$("budgetProgressBar").style.width=Math.min(100,pct)+"%";$("budgetSpentValue").textContent=yen(spent);renderProgressTimeline(d.day,d.last);const status=$("dashboardStatus"),label=$("dashboardStatusLabel"),message=$("dashboardStatusMessage");let level="neutral",statusLabel="データ待ち",statusMessage="支出を登録するとペースを判定します。";if(budget<=0){statusLabel="予算未設定";statusMessage="家計ルールを設定すると支出ペースを判定できます。";}else if(spent>budget||projected>budget*1.1){level="danger";statusLabel="使いすぎ";statusMessage=projected>budget?`このペースだと、月末に予算を${yen(projected-budget)}超える見込みです。`:`現在、予算を${yen(spent-budget)}超えています。`;}else if(diff>budget*0.03||projected>budget){level="warning";statusLabel="少し使いすぎ";statusMessage=projected>budget?`このペースだと、月末に予算を${yen(projected-budget)}超える見込みです。`:`今日時点の目安を${yen(diff)}上回っています。`;}else{level="good";statusLabel="順調";statusMessage=spent||planned?"今のところ予算内のペースです。":"まだ支出はありません。";}status.className=`budget-status ${level}`;label.textContent=statusLabel;message.textContent=statusMessage;}'''
s = s[:start] + new_func + s[end:]
start = s.find('function renderProgressTimeline(')
end = s.find('\nfunction renderCategoryChart', start)
if start < 0 or end < 0:
    raise SystemExit('renderProgressTimeline block not found')
new_timeline = '''function renderProgressTimeline(day,last){const monthPct=last>0?Math.min(100,Math.max(0,day/last*100)):0,monthBar=$("monthProgressBar"),monthText=$("monthProgressValue"),labels=$("progressTimelineLabels");if(monthBar)monthBar.style.width=monthPct+"%";if(monthText)monthText.textContent=`${day}日経過`;if(labels){const ratio=value=>last>0?Math.min(1,Math.max(0,value/last)):0,days=[0,10,20,last];labels.innerHTML=days.map((value,i)=>`<span class="timeline-label timeline-label-${i}">${i===3?"月末":value+"日"}</span>`).join("");labels.querySelectorAll(".timeline-label").forEach((el,i)=>{el.style.left=(ratio(days[i])*100)+"%";});}}'''
s = s[:start] + new_timeline + s[end:]
s = s.replace('47.86', '47.87')
p.write_text(s)

# style.css
p = Path('style.css')
s = p.read_text()
new_css = '''/* Budget dashboard */
.budget-dashboard{padding:18px;}
.budget-dashboard-title{margin-bottom:6px;}
.budget-dashboard-title h2{font-size:15px;color:#4b5563;}
.budget-hero{display:flex;align-items:baseline;justify-content:center;gap:9px;padding:9px 0 2px;text-align:center;}
.budget-hero-prefix,.budget-hero-suffix{font-size:16px;font-weight:700;color:#374151;white-space:nowrap;}
.budget-hero strong{font-size:44px;line-height:1.05;letter-spacing:-1.5px;}
.budget-hero-note{display:block;text-align:center;margin-top:4px;font-size:11px;color:#6b7280;}
.budget-daily-guide{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;margin:12px 0;padding:9px 11px;border-radius:10px;background:#f7f8fa;color:#6b7280;font-size:11px;}
.budget-daily-guide strong{text-align:right;color:#202124;font-size:15px;}
.budget-daily-guide small{font-size:10px;white-space:nowrap;}
.pace-compare{margin-top:6px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;}
.pace-compare-title{margin-bottom:10px;}
.pace-compare-title strong{font-size:14px;color:#202124;}
.pace-row+.pace-row{margin-top:10px;}
.pace-row-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:5px;font-size:11px;color:#6b7280;}
.pace-row-head strong{font-size:13px;color:#202124;}
.pace-bar{height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden;position:relative;width:100%;}
.pace-bar>div{height:100%;width:0;border-radius:999px;transition:width .25s;}
.pace-spending>div{background:#30343a;}
.pace-calendar>div{background:#8b929c;}
.pace-row-calendar{padding-bottom:23px;position:relative;}
.progress-timeline-labels{position:absolute;left:0;right:0;bottom:0;height:16px;font-size:9px;color:#8a8f98;}
.timeline-label{position:absolute;top:3px;transform:translateX(-50%);white-space:nowrap;}
.timeline-label:first-child{transform:none;}
.timeline-label:last-child{transform:translateX(-100%);}
.budget-status{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;margin-top:10px;padding:11px 12px;border-radius:11px;}
.budget-status strong{font-size:14px;white-space:nowrap;}
.budget-status span{font-size:11px;line-height:1.45;}
.budget-status.good{background:#eef7ee;color:#18794e;}
.budget-status.warning{background:#fff7e6;color:#8a5a00;}
.budget-status.danger{background:#fff0f0;color:#b42318;}
.budget-status.neutral{background:#f3f4f6;color:#4b5563;}
@media(max-width:600px){
  .budget-dashboard{padding:15px 12px;}
  .budget-hero{gap:6px;}
  .budget-hero-prefix,.budget-hero-suffix{font-size:14px;}
  .budget-hero strong{font-size:36px;letter-spacing:-1px;}
  .budget-daily-guide{grid-template-columns:auto 1fr;padding:8px 9px;gap:4px 8px;}
  .budget-daily-guide strong{font-size:14px;}
  .budget-daily-guide small{grid-column:2;text-align:right;font-size:9px;}
  .pace-compare{padding:10px 9px;}
  .pace-row-head{font-size:10px;}
  .pace-row-head strong{font-size:12px;}
  .pace-bar{height:11px;}
  .budget-status{gap:7px;padding:10px;}
  .budget-status strong{font-size:13px;}
  .budget-status span{font-size:10px;}
}
'''
s, n = re.subn(r'/\* Budget dashboard \*/.*?(?=\.memo-cell\{)', new_css, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'budget css replace failed: {n}')
p.write_text(s)

# versions
for name in ['sw.js']:
    p = Path(name)
    s = p.read_text().replace('47.86', '47.87')
    p.write_text(s)

Path('README.md').write_text('''# 家計簿アプリ\n\n## ver.47.87\n- 上部の残り予算表示を「今月残り ¥○○ 使える」の1行表示に変更し、金額を大きく強調\n- 支出ペースの％表示を廃止し、使った金額は実額、月の進行は「○日経過」で表示\n- 「○ポイント先行 / ○ポイント余裕 / ほぼ同じペース」の比較文を削除\n- 今月の支出 / 今日時点の目安 / 目安より / 月末予測 の4マスサマリーを削除\n- 支出ペースの補足文と重複していたメーター下の金額・予算表示を削除\n- 1日あたりの目安と、順調 / 少し使いすぎ / 使いすぎ の判定表示は維持\n- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.87 に統一\n''')

# validation
for name in ['README.md','app.js','index.html','style.css','sw.js']:
    text = Path(name).read_text()
    if '47.86' in text:
        raise SystemExit(f'stale 47.86 remains in {name}')
for dead in ['paceComparison','budgetProgressPercent','monthProgressPercent','budgetSpentMeta','budgetTotalMeta','dashboardSpent','dashboardTarget','dashboardPaceDiff','dashboardForecast','budget-summary-grid','budget-meter-meta','pace-comparison']:
    for name in ['index.html','app.js','style.css']:
        if dead in Path(name).read_text():
            raise SystemExit(f'obsolete token {dead} remains in {name}')
if '今月残り' not in Path('index.html').read_text() or '使える' not in Path('index.html').read_text():
    raise SystemExit('new remaining-budget label missing')
if '日経過' not in Path('app.js').read_text():
    raise SystemExit('elapsed-day label missing')
