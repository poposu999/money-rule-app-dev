from pathlib import Path
import re

index = Path('index.html')
html = index.read_text()
new_dashboard = '''<section class="card budget-dashboard" data-section-content="progress">
<div class="section-title budget-dashboard-title"><h2>今月の予算</h2><button class="minus-btn" data-section="progress">−</button></div>
<div class="budget-hero">
  <span class="budget-hero-label">今月あと使える</span>
  <strong id="dashboardRemaining">¥0</strong>
  <span class="budget-hero-note" id="dashboardRemainingNote">現在の残り予算</span>
</div>
<div class="budget-daily-guide">
  <span>1日あたりの目安</span>
  <strong id="dashboardDailyBudget">¥0 / 日</strong>
  <small id="dashboardDailyDays">（残り0日）</small>
</div>
<div class="budget-meter-head"><span>予算使用率</span><strong id="budgetProgressPercent">0%</strong></div>
<div class="budget-combined-meter" id="progressTimelineTrack">
  <div class="progress budget-progress"><div id="budgetProgressBar"></div></div>
  <span id="progressTodayMarker" class="progress-today-marker" aria-label="現在の日付"></span>
  <div class="progress-timeline-labels" id="progressTimelineLabels"></div>
</div>
<div class="budget-meter-meta"><span>使った金額 <strong id="budgetSpentMeta">¥0</strong></span><span>全体の予算 <strong id="budgetTotalMeta">¥0</strong></span></div>
<div class="budget-summary-grid">
  <div class="budget-summary-item"><span>今月の支出</span><strong id="dashboardSpent">¥0</strong></div>
  <div class="budget-summary-item"><span>今日時点の目安</span><strong id="dashboardTarget">¥0</strong></div>
  <div class="budget-summary-item"><span>目安より</span><strong id="dashboardPaceDiff">0円</strong></div>
  <div class="budget-summary-item"><span>月末予測<small>（今のペースの場合）</small></span><strong id="dashboardForecast">¥0</strong></div>
</div>
<div class="budget-status neutral" id="dashboardStatus"><strong id="dashboardStatusLabel">データ待ち</strong><span id="dashboardStatusMessage">支出を登録するとペースを判定します。</span></div>
</section>'''
html, count = re.subn(r'<section class="card budget-dashboard" data-section-content="progress">.*?</section>(?=<section class="card entry-section")', new_dashboard, html, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'index dashboard replace failed: {count}')
html = html.replace('47.84', '47.85')
index.write_text(html)

app = Path('app.js')
js = app.read_text()
match = re.search(r'function renderBudgetDashboard\(n,d\)\{.*?\}\nfunction renderValidation', js, flags=re.S)
if not match:
    raise SystemExit('renderBudgetDashboard not found')
new_func = '''function renderBudgetDashboard(n,d){const budget=Math.max(0,Number(n.spendingBudget)||0),spent=Math.max(0,Number(n.spent)||0),planned=Math.max(0,Number(n.plannedAmount)||0),remaining=Number(n.remaining)||0,rawPct=budget>0?spent/budget*100:0,pct=Number.isFinite(rawPct)?Math.max(0,rawPct):0,ideal=budget*(d.day/Math.max(1,d.last)),diff=spent-ideal,projected=(!spent&&!planned)?0:(spent/Math.max(1,d.day))*d.last+planned,daily=Math.max(0,remaining)/Math.max(1,d.remainingDays);$("dashboardRemaining").textContent=yen(remaining);$("dashboardRemainingNote").textContent=planned>0?`予定支出 ${yen(planned)} を差し引いた残り`:"現在の残り予算";$("dashboardDailyBudget").textContent=`${yen(daily)} / 日`;$("dashboardDailyDays").textContent=`（残り${d.remainingDays}日）`;$("budgetProgressBar").style.width=Math.min(100,pct)+"%";$("budgetProgressPercent").textContent=`${Math.round(pct)}%`;$("budgetSpentMeta").textContent=yen(spent);$("budgetTotalMeta").textContent=yen(budget);$("dashboardSpent").textContent=yen(spent);$("dashboardTarget").textContent=yen(ideal);const diffAmount=Math.round(Math.abs(diff)).toLocaleString("ja-JP");$("dashboardPaceDiff").textContent=diff>0?`${diffAmount}円 多い`:diff<0?`${diffAmount}円 少ない`:"ちょうど";$("dashboardForecast").textContent=yen(projected);const status=$("dashboardStatus"),label=$("dashboardStatusLabel"),message=$("dashboardStatusMessage");let level="neutral",statusLabel="データ待ち",statusMessage="支出を登録するとペースを判定します。";if(budget<=0){statusLabel="予算未設定";statusMessage="家計ルールを設定すると支出ペースを判定できます。";}else if(spent>budget||projected>budget*1.1){level="danger";statusLabel="使いすぎ";statusMessage=projected>budget?`このペースだと、月末に予算を${yen(projected-budget)}超える見込みです。`:`現在、予算を${yen(spent-budget)}超えています。`;}else if(diff>budget*0.03||projected>budget){level="warning";statusLabel="少し使いすぎ";statusMessage=projected>budget?`このペースだと、月末に予算を${yen(projected-budget)}超える見込みです。`:`今日時点の目安を${yen(diff)}上回っています。`;}else{level="good";statusLabel="順調";statusMessage=spent||planned?"今のところ予算内のペースです。":"まだ支出はありません。";}status.className=`budget-status ${level}`;label.textContent=statusLabel;message.textContent=statusMessage;renderProgressTimeline(d.day,d.last);}
function renderValidation'''
js = js[:match.start()] + new_func + js[match.end():]
js = js.replace('47.84', '47.85')
app.write_text(js)

css = Path('style.css')
styles = css.read_text()
new_css = '''/* Budget dashboard */
.budget-dashboard{padding:18px;}
.budget-dashboard-title{margin-bottom:6px;}
.budget-dashboard-title h2{font-size:15px;color:#4b5563;}
.budget-hero{text-align:center;padding:8px 0 8px;}
.budget-hero-label{display:block;font-size:16px;font-weight:700;color:#374151;}
.budget-hero strong{display:block;margin-top:5px;font-size:44px;line-height:1.05;letter-spacing:-1.5px;}
.budget-hero-note{display:block;margin-top:6px;font-size:11px;color:#6b7280;}
.budget-daily-guide{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;margin:4px 0 12px;padding:9px 11px;border-radius:10px;background:#f7f8fa;color:#6b7280;font-size:11px;}
.budget-daily-guide strong{text-align:right;color:#202124;font-size:15px;}
.budget-daily-guide small{font-size:10px;white-space:nowrap;}
.budget-meter-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-top:4px;font-size:12px;color:#6b7280;}
.budget-meter-head strong{font-size:16px;color:#202124;}
.budget-combined-meter{position:relative;height:58px;margin-top:6px;}
.progress{height:14px;background:#e5e7eb;border-radius:999px;overflow:hidden;position:relative;}
.progress>div{height:100%;width:0;background:#4b5563;border-radius:999px;transition:width .25s;}
.budget-progress{position:absolute;left:0;right:0;top:0;}
.progress-timeline-labels{position:absolute;left:0;right:0;top:23px;height:18px;font-size:10px;color:#6b7280;}
.timeline-label{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap;}
.timeline-label:first-child{transform:none;}
.timeline-label:last-child{transform:translateX(-100%);}
.progress-today-marker{position:absolute;top:-2px;width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #202124;box-sizing:border-box;transform:translateX(-50%);z-index:2;pointer-events:none;}
.progress-today-label{position:absolute;top:41px;transform:translateX(-50%);padding:3px 7px;border-radius:6px;background:#374151;color:#fff;font-size:10px;font-weight:700;line-height:1.2;white-space:nowrap;pointer-events:none;}
.budget-meter-meta{display:flex;justify-content:space-between;gap:12px;margin-top:1px;font-size:11px;color:#6b7280;}
.budget-meter-meta strong{color:#4b5563;font-size:12px;}
.budget-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:12px;background:#f7f8fa;border-radius:12px;overflow:hidden;}
.budget-summary-item{padding:12px;min-width:0;}
.budget-summary-item:nth-child(odd){border-right:1px solid #e5e7eb;}
.budget-summary-item:nth-child(-n+2){border-bottom:1px solid #e5e7eb;}
.budget-summary-item span{display:block;font-size:11px;color:#6b7280;}
.budget-summary-item span small{display:block;margin-top:2px;font-size:9px;color:#9ca3af;}
.budget-summary-item strong{display:block;margin-top:4px;font-size:18px;line-height:1.2;overflow-wrap:anywhere;}
.budget-status{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;margin-top:10px;padding:11px 12px;border-radius:11px;}
.budget-status strong{font-size:14px;white-space:nowrap;}
.budget-status span{font-size:11px;line-height:1.45;}
.budget-status.good{background:#eef7ee;color:#18794e;}
.budget-status.warning{background:#fff7e6;color:#8a5a00;}
.budget-status.danger{background:#fff0f0;color:#b42318;}
.budget-status.neutral{background:#f3f4f6;color:#4b5563;}
@media(max-width:600px){
  .budget-dashboard{padding:15px 12px;}
  .budget-hero{padding-top:6px;}
  .budget-hero-label{font-size:15px;}
  .budget-hero strong{font-size:38px;letter-spacing:-1px;}
  .budget-daily-guide{grid-template-columns:auto 1fr;padding:8px 9px;gap:4px 8px;}
  .budget-daily-guide strong{font-size:14px;}
  .budget-daily-guide small{grid-column:2;text-align:right;font-size:9px;}
  .budget-meter-meta{font-size:10px;}
  .budget-meter-meta strong{font-size:11px;}
  .budget-summary-item{padding:10px 9px;}
  .budget-summary-item strong{font-size:15px;}
  .budget-status{gap:7px;padding:10px;}
  .budget-status strong{font-size:13px;}
  .budget-status span{font-size:10px;}
}
'''
styles, count = re.subn(r'/\* Budget dashboard \*/.*?(?=\.memo-cell\{)', new_css, styles, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'CSS dashboard replace failed: {count}')
css.write_text(styles)

sw = Path('sw.js')
sw.write_text(sw.read_text().replace('47.84', '47.85'))

Path('README.md').write_text('''# 家計簿アプリ

## ver.47.85
- 予算使用率と月内の経過日数を1本のメーターに統合
- メーターの塗りで予算使用率、同じ軸上の「今日」マーカーで月の経過位置を表示
- 日数目盛りを 0日 / 10日 / 20日 / 月末 として同一軸で比較可能に調整
- 「差額」を「目安より○円 多い / 少ない」に変更して意味を明確化
- 月末予測に「（今のペースの場合）」の補足を追加
- 「1日あたりの目安」と残り日数を残り予算の近くに追加
- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.85 に統一
''')
