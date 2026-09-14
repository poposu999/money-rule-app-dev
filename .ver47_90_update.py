from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if text.count(old) != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {text.count(old)}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")

# Dashboard markup: keep fixed labels on the top row, move the actual spent amount
# along the meter, and show the current date as a mirrored Today pointer below.
old_html = '''    <div class="pace-summary-line">
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
    </div>'''
new_html = '''    <div class="pace-summary-line">
      <span>使った金額</span>
      <span class="pace-limit">上限 <strong id="budgetLimitValue">¥0</strong></span>
    </div>
    <div class="pace-spent-row">
      <div class="pace-spent-position" id="budgetSpentPosition">
        <strong id="budgetSpentValue">¥0</strong>
        <span class="pace-spent-arrow" aria-hidden="true">▼</span>
      </div>
    </div>
    <div class="pace-track-wrap">
      <div class="pace-bar pace-spending"><div id="budgetProgressBar"></div></div>
    </div>
    <div class="pace-scale">
      <div class="today-label" id="todayLabel"><span aria-hidden="true">▲</span><strong>Today</strong></div>
      <div class="progress-timeline-labels" id="progressTimelineLabels"></div>
    </div>'''
replace_once("index.html", old_html, new_html)

old_dashboard = '$("budgetProgressBar").style.width=Math.min(100,pct)+"%";$("budgetSpentValue").textContent=yen(spent);$("budgetLimitValue").textContent=yen(budget);renderPaceTimeline(d.day,d.last);'
new_dashboard = 'const displayPct=Math.min(100,pct);$("budgetProgressBar").style.width=displayPct+"%";$("budgetSpentValue").textContent=yen(spent);$("budgetLimitValue").textContent=yen(budget);const spentPos=$("budgetSpentPosition");if(spentPos){spentPos.style.left=displayPct+"%";spentPos.className=`pace-spent-position${displayPct<10?" left-edge":displayPct>90?" right-edge":""}`;}renderPaceTimeline(d.day,d.last);'
replace_once("app.js", old_dashboard, new_dashboard)

old_timeline = 'function renderPaceTimeline(day,last){const monthPct=last>0?Math.min(100,Math.max(0,day/last*100)):0,marker=$("todayMarker"),todayLabel=$("todayLabel"),labels=$("progressTimelineLabels");if(marker)marker.style.left=monthPct+"%";if(todayLabel){todayLabel.style.left=monthPct+"%";todayLabel.className=`today-label${monthPct<8?" left-edge":monthPct>92?" right-edge":""}`;}if(labels){const ratio=value=>last>0?Math.min(1,Math.max(0,value/last)):0,days=[0,10,20,last];labels.innerHTML=days.map((value,i)=>`<span class="timeline-label timeline-label-${i}">${i===3?"月末":value+"日"}</span>`).join("");labels.querySelectorAll(".timeline-label").forEach((el,i)=>{el.style.left=(ratio(days[i])*100)+"%";});}}'
new_timeline = 'function renderPaceTimeline(day,last){const monthPct=last>0?Math.min(100,Math.max(0,day/last*100)):0,todayLabel=$("todayLabel"),labels=$("progressTimelineLabels");if(todayLabel){todayLabel.style.left=monthPct+"%";todayLabel.className=`today-label${monthPct<8?" left-edge":monthPct>92?" right-edge":""}`;}if(labels){const ratio=value=>last>0?Math.min(1,Math.max(0,value/last)):0,days=[0,10,20,last];labels.innerHTML=days.map((value,i)=>`<span class="timeline-label timeline-label-${i}">${i===3?"月末":value+"日"}</span>`).join("");labels.querySelectorAll(".timeline-label").forEach((el,i)=>{el.style.left=(ratio(days[i])*100)+"%";});}}'
replace_once("app.js", old_timeline, new_timeline)

old_css = '''.pace-unified{min-width:0;}
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
.today-label.right-edge{transform:translateX(-100%);}'''
new_css = '''.pace-unified{min-width:0;}
.pace-summary-line{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:2px;font-size:11px;color:#6b7280;}
.pace-limit{text-align:right;white-space:nowrap;}
.pace-limit strong{font-size:12px;color:#4b5563;}
.pace-spent-row{position:relative;height:31px;}
.pace-spent-position{position:absolute;top:0;left:0;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);white-space:nowrap;transition:left .25s;}
.pace-spent-position strong{font-size:13px;line-height:1.1;color:#202124;}
.pace-spent-arrow{margin-top:2px;font-size:10px;line-height:1;color:#30343a;}
.pace-spent-position.left-edge{transform:none;align-items:flex-start;}
.pace-spent-position.right-edge{transform:translateX(-100%);align-items:flex-end;}
.pace-track-wrap{position:relative;}
.pace-bar{height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden;position:relative;width:100%;}
.pace-bar>div{height:100%;width:0;border-radius:999px;transition:width .25s;}
.pace-spending>div{background:#30343a;}
.pace-scale{position:relative;height:48px;margin-top:2px;}
.today-label{position:absolute;top:0;left:0;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);color:#30343a;white-space:nowrap;transition:left .25s;}
.today-label span{font-size:10px;line-height:1;}
.today-label strong{margin-top:2px;font-size:9px;line-height:1.1;}
.today-label.left-edge{transform:none;align-items:flex-start;}
.today-label.right-edge{transform:translateX(-100%);align-items:flex-end;}
.progress-timeline-labels{position:absolute;left:0;right:0;bottom:0;height:16px;font-size:9px;color:#8a8f98;}
.timeline-label{position:absolute;top:3px;transform:translateX(-50%);white-space:nowrap;}
.timeline-label:first-child{transform:none;}
.timeline-label:last-child{transform:translateX(-100%);}'''
replace_once("style.css", old_css, new_css)

old_mobile = '''  .pace-compare{padding:10px 9px;}
  .pace-summary-line{gap:6px;font-size:10px;}
  .pace-summary-line>strong{font-size:12px;}
  .pace-limit strong{font-size:11px;}
  .pace-bar{height:11px;}
  .today-marker{width:13px;height:13px;}'''
new_mobile = '''  .pace-compare{padding:10px 9px;}
  .pace-summary-line{gap:6px;font-size:10px;}
  .pace-limit strong{font-size:11px;}
  .pace-spent-row{height:29px;}
  .pace-spent-position strong{font-size:12px;}
  .pace-spent-arrow{font-size:9px;}
  .pace-bar{height:11px;}'''
replace_once("style.css", old_mobile, new_mobile)

# Version-bearing files.
for filename in ("index.html", "app.js", "sw.js"):
    p = Path(filename)
    text = p.read_text(encoding="utf-8")
    if "47.89" not in text:
        raise SystemExit(f"{filename}: 47.89 not found")
    p.write_text(text.replace("47.89", "47.90"), encoding="utf-8")

Path("README.md").write_text('''# 家計簿アプリ

## ver.47.90
- 「使った金額」の実額を固定位置から外し、予算使用率に合わせてメーター上を左右に追従する表示へ変更
- 支出額の下に ▼ ポインターを表示し、0% / 100% 付近では金額ラベルが枠外にはみ出さないよう端寄せ補正
- 上段は「使った金額」と「上限 ¥○○」だけを固定表示し、移動する支出額との重なりを防止
- 今日の位置はメーター下側の ▲ + Today で表示し、月の経過位置に追従
- 0日 / 10日 / 20日 / 月末 の目盛りは固定表示として維持
- 旧白抜きTodayマーカーと関連する不要なDOM・CSS・JSを削除
- 予算超過時は支出額を実額のまま表示し、位置とメーター本体は100%で上限に固定
- 1日あたりの目安と、順調 / 少し使いすぎ / 使いすぎ の判定表示は維持
- index.html / app.js / sw.js / キャッシュ指定 / アプリ下部のバージョンを ver.47.90 に統一
''', encoding="utf-8")

# Guard against stale selectors from the replaced design.
for filename in ("index.html", "app.js", "style.css"):
    text = Path(filename).read_text(encoding="utf-8")
    if "todayMarker" in text or "today-marker" in text:
        raise SystemExit(f"{filename}: stale today marker remains")
