(function(){
var $=function(i){return document.getElementById(i)};
var KEY="spps_students",store=[];
var seed=[
{id:"S101",name:"Aarav Mehta",course:"B.Tech CSE",age:20,at:92,im:84,am:88,pm:81,sh:3.5},
{id:"S102",name:"Diya Nair",course:"B.Tech CSE",age:19,at:78,im:66,am:70,pm:64,sh:2},
{id:"S103",name:"Rohan Das",course:"B.Tech CSE",age:20,at:54,im:41,am:48,pm:45,sh:1},
{id:"S104",name:"Sana Khan",course:"B.Tech CSE",age:21,at:88,im:90,am:93,pm:89,sh:4},
{id:"S105",name:"Kabir Rao",course:"B.Tech CSE",age:20,at:67,im:55,am:52,pm:58,sh:1.5}];
var API="http://localhost:5000",online=false;
async function load(){try{var r=await fetch(API+"/students");if(!r.ok)throw 0;store=await r.json();online=true;return}catch(e){}online=false;try{var x=localStorage.getItem(KEY);if(x){store=JSON.parse(x);return}}catch(e){}store=seed.slice()}
function call(m,u,b){return fetch(API+u,{method:m,headers:{"Content-Type":"application/json"},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})})}
function getp(s){return s.p||predict(s)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}}

/* Placeholder formula, used only when the backend is not running */
function predict(s){
var score=0.25*s.at+0.25*s.im+0.15*s.am+0.25*s.pm+Math.min(s.sh,8)*1.25;
score=Math.max(0,Math.min(100,score));
var cat=score>=80?"Excellent":score>=65?"Good":score>=50?"Average":"Needs improvement";
var risk=score>=65?"Low":score>=50?"Medium":"High";
var tips=[];
if(s.at<75)tips.push("Raise attendance above 75%.");
if(s.im<60)tips.push("Revise topics from internal tests.");
if(s.am<60)tips.push("Submit assignments on time and complete all of them.");
if(s.pm<55)tips.push("Revisit weak topics from the previous exam.");
if(s.sh<2)tips.push("Study at least 2 hours per day.");
if(!tips.length)tips.push("Maintain regular attendance and keep submitting assignments on time.");
return{score:Math.round(score),cat:cat,risk:risk,tips:tips};
}
function avg(s){return Math.round((s.im+s.am+s.pm)/3)}
function esc(t){var d=document.createElement("div");d.textContent=t;return d.innerHTML}

var pages=["home","login","dashboard","add","predict","reports"],authed=false;
function show(p){
if(!authed&&["dashboard","add","predict","reports"].indexOf(p)>-1)p="login";
pages.forEach(function(x){$(x).classList.toggle("hide",x!==p)});
$("nav").classList.toggle("hide",!authed);$("nav0").classList.toggle("hide",authed);
document.querySelectorAll("#nav button[data-p]").forEach(function(b){b.classList.toggle("on",b.dataset.p===p)});
if(p==="dashboard")dash();if(p==="reports")rep();if(p==="predict")ids();
window.scrollTo(0,0);
}
document.addEventListener("click",function(e){var t=e.target.closest("[data-p],[data-go]");if(t)show(t.dataset.p||t.dataset.go)});
$("doLogin").onclick=function(){if(!$("u").value.trim()||!$("pw").value){$("lmsg").textContent="Enter a username and password to continue.";return}authed=true;show("dashboard")};
$("logout").onclick=function(){authed=false;show("home")};

function dash(){
var n=store.length,m=n?Math.round(store.reduce(function(a,s){return a+avg(s)},0)/n):0,
a=n?Math.round(store.reduce(function(x,s){return x+s.at},0)/n):0,
pr=store.map(function(s){return getp(s)}),hi=pr.filter(function(p){return p.risk==="High"}).length,
good=pr.filter(function(p){return p.cat==="Good"||p.cat==="Excellent"}).length;
var items=[["Total students",n],["Average marks",m+"%"],["Average attendance",a+"%"],["Students at risk",hi],["Performing well",good]];
$("stats").innerHTML=items.map(function(i){return '<div class="card stat"><b>'+i[1]+'</b><span>'+i[0]+'</span></div>'}).join("");
var k=[["Internal","im"],["Assignment","am"],["Previous","pm"],["Attendance","at"]];
var vals=k.map(function(x){return n?Math.round(store.reduce(function(s,r){return s+r[x[1]]},0)/n):0});
$("bars").innerHTML=vals.map(function(v){return '<div class="bar" style="height:'+v+'%"><span>'+v+'%</span></div>'}).join("");
$("bl").innerHTML=k.map(function(x){return '<div>'+x[0]+'</div>'}).join("");
var c={Low:0,Medium:0,High:0};pr.forEach(function(p){c[p.risk]++});
$("risk").innerHTML=["Low","Medium","High"].map(function(r){var w=n?c[r]/n*100:0;
return '<p style="margin:10px 0 4px"><span class="tag '+r+'">'+r+'</span> '+c[r]+' students</p><div style="background:var(--bg);border-radius:6px;height:12px"><div class="'+r+'" style="width:'+w+'%;height:12px;border-radius:6px"></div></div>'}).join("");
}

function read(){
var g=function(i){return $(i).value.trim()},num=function(i){return parseFloat($(i).value)};
return{id:g("sid"),name:g("nm"),course:g("cr"),age:num("ag")||0,at:num("at"),im:num("im"),am:num("am"),pm:num("pm"),sh:num("sh")};
}
function valid(s){return s.id&&s.name&&[s.at,s.im,s.am,s.pm,s.sh].every(function(v){return !isNaN(v)})}
function idx(id){return store.findIndex(function(s){return s.id.toLowerCase()===id.toLowerCase()})}
$("save").onclick=async function(){var s=read();if(!valid(s)){$("smsg").textContent="Complete every required field before saving.";return}
if(online){var r=await call("POST","/students",s);if(!r.ok){$("smsg").textContent=r.j.error;return}await load();$("smsg").textContent=s.name+" saved to the database.";return}
if(idx(s.id)>-1){$("smsg").textContent="ID "+s.id+" already exists. Use Update details to change it.";return}
store.push(s);persist();$("smsg").textContent=s.name+" saved (browser only, backend offline).";};
$("upd").onclick=async function(){var s=read();if(!valid(s)){$("smsg").textContent="Complete every required field before updating.";return}
if(online){var r=await call("PUT","/students/"+encodeURIComponent(s.id),s);if(!r.ok){$("smsg").textContent=r.j.error;return}await load();$("smsg").textContent=s.name+" updated in the database.";return}
var i=idx(s.id);if(i<0){$("smsg").textContent="No student with ID "+s.id+". Use Save student to add one.";return}
store[i]=s;persist();$("smsg").textContent=s.name+" updated (browser only, backend offline).";};
$("rst").onclick=function(){$("sf").reset();$("smsg").textContent=""};

function ids(){$("ids").innerHTML=store.map(function(s){return '<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>'}).join("")}
$("pid").onchange=function(){var v=$("pid").value.toLowerCase();
var s=store.find(function(r){return r.id.toLowerCase()===v||r.name.toLowerCase()===v});
if(s){$("pa").value=s.at;$("pi").value=s.im;$("pg").value=s.am;$("pp").value=s.pm;$("ph").value=s.sh;$("pmsg").textContent="Loaded "+s.name+"."}};
function idOf(){var v=$("pid").value.toLowerCase(),m=store.find(function(x){return x.id.toLowerCase()===v});return m?{id:m.id}:{}}
async function remote(s){try{var r=await fetch(API+"/predict",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.assign({},s,idOf()))});if(!r.ok)throw 0;var d=await r.json();if(idOf().id)load();return d}catch(e){var p=predict(s);p.offline=true;return p}}
$("go").onclick=async function(){
var s={at:parseFloat($("pa").value),im:parseFloat($("pi").value),am:parseFloat($("pg").value),pm:parseFloat($("pp").value),sh:parseFloat($("ph").value)};
if(Object.keys(s).some(function(k){return isNaN(s[k])})){$("pmsg").textContent="Enter all five values to run a prediction.";return}
var p=await remote(s);$("pmsg").textContent=p.offline?"Backend not running. Showing the placeholder formula.":"Prediction from the trained model.";
$("out").innerHTML='<h3>Student performance report</h3><p><b>'+esc($("pid").value||"Student")+'</b></p>'+
'<p>Predicted performance: <b>'+p.cat+'</b> (estimated '+p.score+'%)</p>'+(p.result?'<p>Result: <b>'+p.result+'</b> ('+p.pass_prob+'% chance of passing)</p>':'')+
'<p>Risk level: <span class="tag '+p.risk+'">'+p.risk+'</span></p>'+
'<h3 style="font-size:16px;margin-top:14px">Recommended actions</h3><ul>'+p.tips.map(function(t){return '<li>'+t+'</li>'}).join("")+'</ul>';
};

function rep(){
var q=$("q").value.toLowerCase(),f=$("fl").value;
var rows=store.filter(function(s){return (s.id+s.name).toLowerCase().indexOf(q)>-1&&(!f||getp(s).cat===f)});
$("tb").innerHTML=rows.length?rows.map(function(s){var p=getp(s);
return '<tr><td>'+esc(s.id)+'</td><td>'+esc(s.name)+'</td><td>'+s.at+'%</td><td>'+avg(s)+'%</td><td>'+p.cat+'</td><td><span class="tag '+p.risk+'">'+p.risk+'</span></td><td><button class="btn alt" data-v="'+esc(s.id)+'">View report</button> <button class="btn alt" data-d="'+esc(s.id)+'">Delete</button></td></tr>'}).join(""):'<tr><td colspan="7">No students match. Clear the search or add a student.</td></tr>';
}
$("q").oninput=rep;$("fl").onchange=rep;
$("tb").addEventListener("click",function(e){var b=e.target.closest("[data-v]");if(!b)return;
var s=store[idx(b.dataset.v)];$("pid").value=s.id;$("pid").onchange();show("predict");$("go").click()});
$("tb").addEventListener("click",async function(e){var b=e.target.closest("[data-d]");if(!b)return;if(!confirm("Delete student "+b.dataset.d+"?"))return;
if(online){await call("DELETE","/students/"+encodeURIComponent(b.dataset.d))}else{store.splice(idx(b.dataset.d),1);persist()}await load();rep()});
$("dl").onclick=function(){
var l=["ID,Name,Attendance,AvgMarks,Predicted,Risk"].concat(store.map(function(s){var p=getp(s);return [s.id,'"'+s.name+'"',s.at,avg(s),p.cat,p.risk].join(",")}));
var a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(l.join("\n"));a.download="student-reports.csv";a.click();
};
load();show("home");
})();