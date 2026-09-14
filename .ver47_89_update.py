from pathlib import Path

VERSION_OLD = "47.88"
VERSION_NEW = "47.89"

# index.html
p = Path("index.html")
s = p.read_text(encoding="utf-8")
start = s.index('<div class="pace-compare">')
end = s.index('<div class="budget-status neutral"', start)
new_pace = '''<div class="pace-compare">
  <div class="pace-compare-title"><strong>支出ペース</strong></div>
  <div class="pace-unified">
    <div class="pace-summary-line">
      <span>使った金額</span>
      <strong id="budgetSpentValue">¥0</strong>
      <span class="pace-limit">上限 <strong id="budgetLimitValue">¥0</strong></span>
    </div>
    <div class="pace-track-wrap">
      <div class="pace-bar pace-spending"><div id="budgetProgressBar"></div></div>
      <span class="today-marker" id="todayMarker" aria-hidden="true"></span>
    </div>
    <div class="pace-scale">
      <div class="progress-timeline-labels" id="progressTimelineLabels"></div>
      <div class="today-label" id="todayLabel">今日</div>
    </div>
  </div>
</div>
'''
s = s[:start] + new_pace + s[end:]
s = s.replace(VERSION_OLD, VERSION_NEW)
p.write_text(s, encoding="utf-8")

# app.js
p = Path("app.js")
s = p.read_text(encoding="utf-8")
s = s.replace('const VERSION="47.88";', 'const VERSION="47.89";')
old_render = '$("budgetProgressBar").style.width=Math.min(100,pct)+"%";$("budgetSpentValue").textContent=yen(spent);renderProgressTimeline(d.day,d.last);'
new_render = '$("budgetProgressBar").style.width=Math.min(100,pct)+"%";$("budgetSpentValue").textContent=yen(spent);$("budgetLimitValue").textContent=yen(budget);renderPaceTimeline(d.day,d.last);'
if old_render not in s:
    raise SystemExit("renderBudgetDashboard target not found")
s = s.replace(old_render, new_render, 1)
fn_start = s.index('function renderProgressTimeline(day,last){')
fn_end = s.index('function renderCategoryChart', fn_start)
new_fn = '''function renderPaceTimeline(day,last){const monthPct=last>0?Math.min(100,Math.max(0,day/last*100)):0,marker=$("todayMarker"),todayLabel=$("todayLabel"),labels=$("progressTimelineLabels");if(marker)marker.style.left=monthPct+"%";if(todayLabel){todayLabel.style.left=monthPct+"%";todayLabel.className=`today-label${monthPct<8?" left-edge":monthPct>92?" right-edge":""}`;}if(labels){const ratio=value=>last>0?Math.min(1,Math.max(0,value/last)):0,days=[0,10,20,last];labels.innerHTML=days.map((value,i)=>`<span class="timeline-label timeline-label-${i}">${i===3?"月末":value+"日"}</span>`).join("");labels.querySelectorAll(".timeline-label").forEach((el,i)=>{el.style.left=(ratio(days[i])*100)+"%";});}}
'''
s = s[:fn_start] + new_fn + s[fn_end:]
p.write_text(s, encoding="utf-8")

# style.css
p = Path("style.css")
s = p.read_text(encoding="utf-8")
css_start = s.index('.pace-compare{')
css_end = s.index('.budget-status{', css_start)
new_css = '''.pace-compare{margin-top:6px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;}
.pace-compare-title{margin-bottom:10px;}
.pace-compare-title strong{font-size:14px;color:#202124;}
.pace-unified{min-width:0;}
.pace-summary-line{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:baseline;gap:10px;margin-bottom:7px;font-size:11px;color:#6b7280;}
.pace-summary-line>strong{font-size:13px;color:#202124;text-align:center;white-space:nowrap;}
.pace-limit{text-align:right;white-space:nowrap;}
.pace-limit strong{font-size:12px;color:#4b5563;}
.pace-track-wrap{position:relative;}
.pace-bar{height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden;position:relative;width:100%;}
.pace-bar>div{height:100%;width:0;border-radius:999px;transition:width .25s;}
.pace-spending>div{background:#30343a;}
.today-marker{position:absolute;top:50%;left:0;width:14px;height:14px;border:2px solid #30343a;background:#fff;border-radius:50%;transform:translate(-50%,-50%);z-index:2;pointer-events:none;}
.pace-scale{position:relative;height:34px;margin-top:3px;}
.progress-timeline-labels{position:absolute;left:0;right:0;top:0;height:16px;font-size:9px;color:#8a8f98;}
.timeline-label{position:absolute;top:3px;transform:translateX(-50%);white-space:nowrap;}
.timeline-label:first-child{transform:none;}
.timeline-label:last-child{transform:translateX(-100%);}
.today-label{position:absolute;top:17px;left:0;transform:translateX(-50%);font-size:9px;font-weight:700;color:#30343a;white-space:nowrap;}
.today-label.left-edge{transform:none;}
.today-label.right-edge{transform:translateX(-100%);}
'''
s = s[:css_start] + new_css + s[css_end:]
old_mobile = '''  .pace-compare{padding:10px 9px;}
  .pace-row-head{font-size:10px;}
  .pace-row-head strong{font-size:12px;}
  .pace-bar{height:11px;}'''
new_mobile = '''  .pace-compare{padding:10px 9px;}
  .pace-summary-line{gap:6px;font-size:10px;}
  .pace-summary-line>strong{font-size:12px;}
  .pace-limit strong{font-size:11px;}
  .pace-bar{height:11px;}
  .today-marker{width:13px;height:13px;}'''
if old_mobile not in s:
    raise SystemExit("mobile pace CSS target not found")
s = s.replace(old_mobile, new_mobile, 1)
p.write_text(s, encoding="utf-8")

# sw.js
p = Path("sw.js")
s = p.read_text(encoding="utf-8").replace(VERSION_OLD, VERSION_NEW)
p.write_text(s, encoding="utf-8")

# README.md
Path("README.md").write_text('''# 家計簿アプリ

## ver.47.89
- 支出ペースを2本メーターから1本の比較メーターに変更
- メーター上部に「使った金額 / 実額 / 上限」を横並びで表示
- メーターの塗りつぶし量で予算使用率を表示
- 同じメーター上に白抜き丸で今日の位置を表示し、下部に「今日」ラベルを追従表示
- 日付目盛りは 0日 / 10日 / 20日 / 月末 を維持
- 旧「今月の経過」メーターと関連する不要なDOM・CSS・JSを削除
- 予算超過時も実額はそのまま表示し、メーター本体は100%で上限表示
- 1日あたりの目安と、順調 / 少し使いすぎ / 使いすぎ の判定表示は維持
- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.89 に統一
''', encoding="utf-8")
