const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const fmt=n=>Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const uid=()=>crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
const defaultData={
  expenses:[],
  cards:[
    {name:'BBVA',cutDay:10,payDay:30},
    {name:'Banamex',cutDay:12,payDay:2},
    {name:'Santander',cutDay:15,payDay:5},
    {name:'Nu',cutDay:20,payDay:10},
    {name:'Apple Card',cutDay:31,payDay:31}
  ],
  apiUrl:''
};
const normalize=d=>{
  d={...defaultData,...(d||{})};
  d.expenses=d.expenses||[];
  d.cards=(d.cards||defaultData.cards).map(c=>typeof c==='string'?{name:c,cutDay:15,payDay:5}:c);
  if(!d.cards.some(c=>String(c.name).toLowerCase()==='santander')) d.cards.splice(2,0,{name:'Santander',cutDay:15,payDay:5});
  return d;
};
const store={get(){try{return normalize(JSON.parse(localStorage.getItem('gastosPro')||'{}'))}catch{return normalize(defaultData)}},set(d){localStorage.setItem('gastosPro',JSON.stringify(normalize(d)));render();}};
let calDate=new Date(); let deferredPrompt=null; let calc='0';
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});
$('#installBtn').onclick=()=>deferredPrompt?.prompt();
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
function init(){ $('#todayLabel').textContent=new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}); bind(); render(); updateRestPreview(); }
function bind(){
 $$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));$$('.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.view).classList.add('active');});
 ['amount','paid'].forEach(id=>$('#'+id).addEventListener('input',updateRestPreview));
 $('#cardName').addEventListener('change',suggestDates);
 $('#purchaseDate').addEventListener('change',suggestDates);
 $('#expenseForm').onsubmit=e=>{e.preventDefault();const d=store.get();const amount=+$('#amount').value||0, paid=+$('#paid').value||0;d.expenses.push({id:uid(),concept:$('#concept').value,amount,paid,remaining:Math.max(0,amount-paid),card:$('#cardName').value,purchaseDate:$('#purchaseDate').value||new Date().toISOString().slice(0,10),dueDate:$('#dueDate').value,category:$('#category').value,notes:$('#notes').value,createdAt:new Date().toISOString(),status:(paid>=amount?'paid':'pending')});store.set(d);e.target.reset();$('#paid').value=0;updateRestPreview();suggestDates();};
 $('#cardForm').onsubmit=e=>{e.preventDefault();const v=$('#newCard').value.trim();if(!v)return;const d=store.get();const existing=d.cards.find(c=>c.name.toLowerCase()===v.toLowerCase());const data={name:v,cutDay:clampDay($('#cutDay').value||15),payDay:clampDay($('#payDay').value||5)}; if(existing) Object.assign(existing,data); else d.cards.push(data);store.set(d);e.target.reset();};
 $('#clearBtn').onclick=()=>confirm('¿Borrar todos los gastos?')&&(store.set({...store.get(),expenses:[]}));
 $('#demoBtn').onclick=()=>{const d=store.get();d.expenses.push({id:uid(),concept:'Cancún',amount:7400,paid:2000,remaining:5400,card:'Santander',purchaseDate:new Date().toISOString().slice(0,10),dueDate:nextPayDate(d.cards.find(c=>c.name==='Santander'),new Date()).toISOString().slice(0,10),category:'Viaje',notes:'Total 7400 · A cuenta 2000 · Restan 5400',createdAt:new Date().toISOString(),status:'pending'});store.set(d)};
 $('#exportBtn').onclick=()=>downloadJSON(); $('#importInput').onchange=importJSON; $('#saveApi').onclick=()=>{const d=store.get();d.apiUrl=$('#apiUrl').value;store.set(d)};
 $('#prevMonth').onclick=()=>{calDate.setMonth(calDate.getMonth()-1);renderCalendar(store.get())}; $('#nextMonth').onclick=()=>{calDate.setMonth(calDate.getMonth()+1);renderCalendar(store.get())};
 ['7','8','9','÷','4','5','6','×','1','2','3','-','0','.','=','+','C'].forEach(k=>{const b=document.createElement('button');b.textContent=k;b.onclick=()=>calcKey(k);$('#calcKeys').appendChild(b)});
}
function render(){const d=store.get(), now=new Date(); $('#monthName').textContent=now.toLocaleDateString('es-MX',{month:'long'}); fillCards(d); renderTotals(d); renderLists(d); renderCalendar(d); $('#jsonPreview').value=JSON.stringify(d,null,2); $('#apiUrl').value=d.apiUrl||''; suggestDates();}
function fillCards(d){$('#cardName').innerHTML=d.cards.map(c=>`<option>${esc(c.name)}</option>`).join('');$('#cardsList').innerHTML=d.cards.map(c=>cardHTML(c)).join('');}
function cardHTML(c){const buy=buyFromDay(c);return `<article class="card-chip"><strong>${esc(c.name)}</strong><span>Corte: día ${c.cutDay||'-'} · Límite pago: día ${c.payDay||'-'}</span><small>Mejor comprar desde el día ${buy} para ganar más plazo.</small></article>`;}
function renderTotals(d){const month=new Date().getMonth(), year=new Date().getFullYear();const m=d.expenses.filter(x=>{const dt=new Date(x.dueDate+'T00:00');return dt.getMonth()==month&&dt.getFullYear()==year});const total=m.reduce((s,x)=>s+x.amount,0), paid=m.reduce((s,x)=>s+(x.status==='paid'?x.amount:x.paid),0), pending=Math.max(0,total-paid);$('#balanceAmount').textContent=fmt(total);$('#paidAmount').textContent=fmt(paid);$('#pendingAmount').textContent=fmt(pending);$('#cardsCount').textContent=d.cards.length;}
function renderLists(d){const sorted=[...d.expenses].sort((a,b)=>a.dueDate.localeCompare(b.dueDate));const upcoming=sorted.filter(x=>x.status!=='paid').slice(0,6);$('#upcomingList').innerHTML=upcoming.map(itemHTML).join('')||'<p class="muted">Sin pagos pendientes.</p>';$('#expenseList').innerHTML=sorted.map(itemHTML).join('')||'<p class="muted">Aún no hay movimientos.</p>';$('#nextPaymentCard').innerHTML=upcoming[0]?`<h3>Siguiente pago</h3><p>${esc(upcoming[0].concept)} vence el ${dateMx(upcoming[0].dueDate)}</p><h2>${fmt(upcoming[0].amount-upcoming[0].paid)}</h2>`:'<h3>Todo limpio ✨</h3><p>No tienes pagos próximos registrados.</p>';$$('.amount-box button').forEach(b=>b.onclick=()=>markPaid(b.dataset.id));}
function itemHTML(x){const rest=Math.max(0,x.amount-x.paid);return `<article class="expense-item"><div><h4>${esc(x.concept)}</h4><p>${esc(x.card)} · ${esc(x.category)}</p><small>Compra: ${dateMx(x.purchaseDate||x.createdAt?.slice(0,10)||x.dueDate)} · Pagar: ${dateMx(x.dueDate)} ${x.notes?'· '+esc(x.notes):''}</small></div><div class="amount-box"><strong>${fmt(x.amount)}</strong><span>${x.status==='paid'?'Pagado':'A cuenta '+fmt(x.paid)+' · Restan '+fmt(rest)}</span><button data-id="${x.id}">✓</button></div></article>`;}
function markPaid(id){const d=store.get();const x=d.expenses.find(e=>e.id===id); if(x){x.paid=x.amount;x.remaining=0;x.status='paid';store.set(d)}}
function renderCalendar(d){const y=calDate.getFullYear(),m=calDate.getMonth();$('#calendarTitle').textContent=calDate.toLocaleDateString('es-MX',{month:'long',year:'numeric'});const first=(new Date(y,m,1).getDay()+6)%7, days=new Date(y,m+1,0).getDate();let html='';for(let i=0;i<first;i++)html+='<div></div>';for(let day=1;day<=days;day++){const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const due=d.expenses.some(x=>x.dueDate===iso);const buy=d.expenses.some(x=>x.purchaseDate===iso);const today=iso===new Date().toISOString().slice(0,10);html+=`<div class="day ${due?'has':''} ${buy?'buy':''} ${today?'today':''}">${day}${due?'<div class="dot"></div>':''}${buy?'<div class="buydot"></div>':''}</div>`}$('#calendarGrid').innerHTML=html;}
function suggestDates(){const d=store.get();const card=d.cards.find(c=>c.name===$('#cardName').value); if(!card)return; const p=$('#purchaseDate').value?new Date($('#purchaseDate').value+'T00:00'):new Date(); const due=nextPayDate(card,p); if(!$('#dueDate').value) $('#dueDate').value=due.toISOString().slice(0,10);}
function nextPayDate(card,date){const y=date.getFullYear(),m=date.getMonth(),day=date.getDate(),cut=clampDay(card?.cutDay||15),pay=clampDay(card?.payDay||5);let payMonth=m+(day>cut?2:1); if(pay>cut) payMonth=m+(day>cut?1:0); return safeDate(y,payMonth,pay);}
function safeDate(y,m,d){return new Date(y,m,Math.min(d,new Date(y,m+1,0).getDate()));}
function buyFromDay(c){return clampDay((c.cutDay||15)+1>31?1:(c.cutDay||15)+1)}
function clampDay(v){return Math.max(1,Math.min(31,parseInt(v)||1));}
function updateRestPreview(){const rest=Math.max(0,(+$('#amount').value||0)-(+$('#paid').value||0));$('#restPreview').textContent=fmt(rest);}
function dateMx(v){if(!v)return 'sin fecha';return new Date(v+'T00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});} 
function downloadJSON(){const blob=new Blob([JSON.stringify(store.get(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='respaldo-mis-gastos.json';a.click();}
function importJSON(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const data=normalize(JSON.parse(r.result));if(!data.expenses||!data.cards)throw Error();store.set(data)}catch{alert('JSON no válido')}};r.readAsText(f);}
function calcKey(k){if(k==='C')calc='0';else if(k==='='){try{calc=String(Function('return '+calc.replaceAll('×','*').replaceAll('÷','/'))())}catch{calc='Error'}}else calc=calc==='0'?k:calc+k;$('#calcDisplay').value=calc;}
function esc(s){return String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
init();
