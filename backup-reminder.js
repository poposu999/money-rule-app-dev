/* Device-only reminder metadata. Never part of the household state or backup. */
'use strict';
const BackupReminder=(()=>{
  const key='moneyRuleDevBackupReminder',intervals=[7,30,90];
  let midnightTimer;
  function timestamp(value,now=Infinity){
    if(typeof value!=='string'||!value.trim())return null;
    const time=Date.parse(value);
    return Number.isFinite(time)&&time<=now?new Date(time).toISOString():null;
  }
  function read(){
    let data;try{data=JSON.parse(localStorage.getItem(key));}catch{}
    return {enabled:data?.enabled===true,interval:intervals.includes(data?.interval)?data.interval:30,lastBackupAt:timestamp(data?.lastBackupAt),dismissedDate:typeof data?.dismissedDate==='string'?data.dismissedDate:null};
  }
  function write(patch){
    const next={...read(),...patch};
    localStorage.setItem(key,JSON.stringify(next));
    render();
  }
  function localDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  // Calendar ordinals avoid elapsed-hour and daylight-saving differences.
  function dayNumber(date){return Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000;}
  function status(data=read(),now=new Date()){
    const days=data.lastBackupAt===null?null:Math.max(0,dayNumber(now)-dayNumber(new Date(data.lastBackupAt)));
    return {days,due:data.enabled&&data.dismissedDate!==localDate(now)&&(days===null||days>=data.interval)};
  }
  function label(value){
    if(!value)return '記録なし';
    const d=new Date(value),pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function render(){
    const data=read(),info=status(data);
    $('backupReminderEnabled').checked=data.enabled;
    $('backupReminderInterval').value=String(data.interval);
    $('backupReminderInterval').disabled=!data.enabled;
    setText('lastBackupAt',`最終バックアップ：${label(data.lastBackupAt)}`);
    setHidden('backupReminderBanner',activePage!=='home'||!state||!info.due);
    setText('backupReminderMessage',info.days===null?'バックアップの記録がありません。データ保護のため、バックアップをおすすめします。':`最後のバックアップから${info.days}日経過しています。データ保護のため、バックアップをおすすめします。`);
  }
  async function update(patch){
    try{write(patch);return true;}catch{
      render();
      await v50Dialog('バックアップ通知情報を保存できませんでした','<p>端末の保存領域を確認し、もう一度お試しください。</p>',[['cancel','閉じる']]);
      return false;
    }
  }
  function refresh(){
    render();clearTimeout(midnightTimer);
    const now=new Date(),next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
    midnightTimer=setTimeout(refresh,next-now+100);
  }
  function init(){
    $('backupReminderEnabled').onchange=e=>update(e.target.checked?{enabled:true,interval:30}:{enabled:false});
    $('backupReminderInterval').onchange=e=>{const interval=Number(e.target.value);if(intervals.includes(interval))void update({interval});};
    $('dismissBackupReminder').onclick=()=>update({dismissedDate:localDate(new Date())});
    $('reminderExportBackup').onclick=()=>exportCurrentBackup();
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    window.addEventListener('storage',e=>{if(e.key===key||e.key===null)refresh();});
    refresh();
  }
  return {init,render,update,timestamp};
})();
