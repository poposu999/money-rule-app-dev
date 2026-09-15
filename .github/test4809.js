const fs=require("fs");
const assert=require("assert");
const {JSDOM}=require("jsdom");
const html=fs.readFileSync("index.html","utf8");
const code=fs.readFileSync("app.js","utf8");
const dom=new JSDOM(html,{runScripts:"outside-only",url:"https://example.test/"});
const w=dom.window,d=w.document;
w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};
if(!w.URL.createObjectURL)w.URL.createObjectURL=()=>"blob:test";
if(!w.URL.revokeObjectURL)w.URL.revokeObjectURL=()=>{};
w.eval(code);
const stateKey="moneyRuleDevAppV49";
const state=()=>JSON.parse(w.localStorage.getItem(stateKey));
const set=(id,value)=>{const el=d.getElementById(id);el.value=String(value);el.dispatchEvent(new w.Event("input",{bubbles:true}));};
const click=id=>d.getElementById(id).click();
const monthKey=(delta=0)=>{const n=new Date(),x=new Date(n.getFullYear(),n.getMonth()+delta,1);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`;};

assert.equal(state().schemaVersion,49);
click("prevMonth");
assert.equal(d.getElementById("dashboardStatusLabel").textContent,"未計算");
assert(!d.getElementById("dashboardStatusMessage").textContent.includes("入力してください"));
click("returnCurrentMonth");

set("minimumTakeHome",200000);set("savingsTarget",70000);set("extraAllowancePercent",50);set("extraSavingsPercent",50);click("saveSettings");
click("nextMonth");
assert.equal(d.getElementById("income").value,"");
assert.equal(d.getElementById("minimumTakeHome").value,"200000");
set("income",222222);click("saveIncome");
assert.equal(state().months[monthKey(1)].income.value,222222);
click("prevMonth");
assert.equal(state().months[monthKey(0)].income.entered,false);
click("nextMonth");
assert.equal(d.getElementById("income").value,"222222");

set("plannedAmount",5000);d.getElementById("plannedCategory").value="食費";set("plannedMemo","自動テスト");click("addPlannedExpense");
let st=state();assert.equal(st.plannedExpenses.filter(x=>x.status==="pending").length,1);
d.querySelector("[data-confirm-planned]").click();
st=state();let p=st.plannedExpenses.find(x=>x.memo==="自動テスト"),e=st.expenses.find(x=>x.origin?.sourceId===p.id);assert(p&&e);assert.equal(p.status,"confirmed");assert.equal(p.confirmedExpenseId,e.id);
d.querySelector(`[data-edit="${e.id}"]`).click();
const dest=monthKey(2);set("editDate",dest+"-01");click("saveEdit");
st=state();e=st.expenses.find(x=>x.id===e.id);assert.equal(e.date,dest+"-01");assert.equal(e.origin.sourceId,p.id);
d.querySelector(`[data-edit="${e.id}"]`).click();click("rollbackOrigin");
st=state();p=st.plannedExpenses.find(x=>x.id===p.id);assert.equal(p.status,"pending");assert.equal(p.date,dest+"-01");assert(!st.expenses.some(x=>x.id===e.id));

const clamp=w.eval('fixedDueDate({startMonth:"2027-02",endMonth:null,changes:[{effectiveMonth:"2027-02",amount:1,category:"食費",memo:"",due:{type:"day",day:31}}],paidMonths:{}},"2027-02")');
assert.equal(clamp,"2027-02-28");

const legacyDate=monthKey(0)+"-01";
const migrated=JSON.parse(w.eval(`JSON.stringify(convertLegacyState({income:200000,bonus:0,settings:{minimumTakeHome:200000,savingsTarget:70000,extraAllowancePercent:50,extraSavingsPercent:50},plannedExpenses:[{id:"p1",amount:1000,category:"食費",memo:"予定",date:"${legacyDate}"}],expenses:[{id:"e1",amount:1000,category:"食費",memo:"予定",date:"${legacyDate}",plannedSourceId:"p1"}],fixedExpenses:[]}))`));
assert.equal(migrated.plannedExpenses.length,1);assert.equal(migrated.plannedExpenses[0].status,"confirmed");assert.equal(migrated.expenses[0].origin.sourceId,migrated.plannedExpenses[0].id);
const ambiguous=JSON.parse(w.eval(`JSON.stringify(convertLegacyState({income:200000,bonus:0,settings:{minimumTakeHome:200000,savingsTarget:70000,extraAllowancePercent:50,extraSavingsPercent:50},plannedExpenses:[{id:"dup",amount:1000,category:"食費",memo:"A",date:"${legacyDate}"},{id:"dup",amount:1000,category:"食費",memo:"B",date:"${legacyDate}"}],expenses:[{id:"e2",amount:1000,category:"食費",memo:"A",date:"${legacyDate}",plannedSourceId:"dup"}],fixedExpenses:[]}))`));
assert.equal(ambiguous.plannedExpenses.length,2);assert.equal(ambiguous.expenses[0].origin,null);assert.equal(ambiguous.expenses[0].legacyOrigin.actionable,false);

const rawIssues=w.eval(`validateV49BackupRaw({schemaVersion:49,months:{},expenses:[{date:"${legacyDate}",amount:1}],plannedExpenses:[],fixedExpenses:[]})`);
assert(rawIssues.some(x=>x.includes("IDがありません")));
const dupIssues=w.eval(`validateV49BackupRaw({schemaVersion:49,months:{},expenses:[{id:"x",date:"${legacyDate}",amount:1}],plannedExpenses:[{id:"x",date:"${legacyDate}",amount:1}],fixedExpenses:[]})`);
assert(dupIssues.some(x=>x.includes("重複ID")));

const integrity=w.eval(`collectIntegrityIssues({months:{},expenses:[{id:"e",amount:1,category:"食費",memo:"",date:"${legacyDate}",origin:{type:"planned",sourceId:"p",sourceMonth:"${monthKey(0)}"}}],plannedExpenses:[{id:"p",amount:1,category:"食費",memo:"",date:"${legacyDate}",status:"confirmed",confirmedExpenseId:"other"}],fixedExpenses:[]})`);
assert(integrity.some(x=>x.includes("相互リンクが不整合")));

w.close();
console.log("browser logic smoke tests passed");
