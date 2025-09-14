/* ===== Core ===== */
const KSET = 'lbs_settings_v3';
const KMK  = 'lbs_mk_markets_v8';
const KPL  = 'lbs_plush_v1';
const KWP  = 'lbs_wips_v1';
const KOR  = 'lbs_orders_v1';
const WNKEY = 'whatsnew_v2231';

const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const today = () => new Date().toISOString().slice(0,10);

let SETTINGS = { currency:'$', currencyType:'USD', sizes:[
  'Mini (3–5")','Small (6–8")','Medium (9–12")','Large (13–16")','XL / Jumbo (17–20")','Giant (21”+)'
], locations:['Parksville'] };
try{ SETTINGS = Object.assign(SETTINGS, JSON.parse(localStorage.getItem(KSET)||'{}')); }catch{}

let MARKETS=[], PLUSH=[], WIPS=[], ORDERS=[];
try{ MARKETS=JSON.parse(localStorage.getItem(KMK)||'[]'); }catch{}
try{ PLUSH =JSON.parse(localStorage.getItem(KPL)||'[]'); }catch{}
try{ WIPS  =JSON.parse(localStorage.getItem(KWP)||'[]'); }catch{}
try{ ORDERS=JSON.parse(localStorage.getItem(KOR)||'[]'); }catch{}

const saveMarkets = ()=> localStorage.setItem(KMK, JSON.stringify(MARKETS));
const savePlush   = ()=> localStorage.setItem(KPL, JSON.stringify(PLUSH));
const saveWips    = ()=> localStorage.setItem(KWP, JSON.stringify(WIPS));
const saveOrders  = ()=> localStorage.setItem(KOR, JSON.stringify(ORDERS));
const saveSettings= ()=> localStorage.setItem(KSET, JSON.stringify(SETTINGS));

const curSym  = ()=> SETTINGS.currency || '$';
const curType = ()=> SETTINGS.currencyType || 'USD';

/* ===== Instructions + What's New ===== */
(function bootWelcome(){
  $('dlgInstructions').showModal();
  $('btnCloseInstructions').onclick = () => {
    $('dlgInstructions').close();
    $('hub').style.display = 'block';
  };
  if (!localStorage.getItem(WNKEY)){
    $('dlgWhatsNew').showModal();
    $('wnClose').onclick = () => {
      $('dlgWhatsNew').close();
      localStorage.setItem(WNKEY,'1');
    };
  }
})();

/* ===== Settings UI ===== */
function rebuildWhereDropdown(){
  const sel = $('mWhere'); if(!sel) return;
  sel.innerHTML='';
  (SETTINGS.locations||[]).forEach(l=> sel.add(new Option(l,l)));
  sel.add(new Option('Other…','__OTHER__'));
}
function applySettingsUI(){
  $('sCurSym').value = SETTINGS.currency||'$';
  $('sCurType').value = SETTINGS.currencyType||'USD';
  $('sSizes').value = (SETTINGS.sizes||[]).join('\n');
  $('sLocs').value  = (SETTINGS.locations||['Parksville']).join('\n');
}
function readSettingsFromUI(persist){
  const lines = t => (t||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  SETTINGS.currency = ($('sCurSym').value||'$').trim()||'$';
  SETTINGS.currencyType = ($('sCurType').value||'USD').trim()||'USD';
  SETTINGS.sizes = lines($('sSizes').value);
  SETTINGS.locations = lines($('sLocs').value);
  if(persist) saveSettings();
  rebuildWhereDropdown();
  buildPlushSizePresetHelper();
}
$('sSave').addEventListener('click', ()=>{ readSettingsFromUI(true); alert('Settings saved'); });
$('sApply').addEventListener('click', ()=>{ readSettingsFromUI(false); alert('Settings applied (not saved)'); });
applySettingsUI();

/* ===== Markets ===== */
function statusBadge(m){
  const t = today();
  const s = m.date, e = m.endDate || m.date;
  if (!s) return '—';
  if (t < s) return 'D-'+Math.ceil((new Date(s)-new Date(t))/86400000);
  if (t >= s && t <= e) return 'ON';
  return 'PAST';
}
function getMarketName(id){ const m = MARKETS.find(x=>x.id===id); return m?m.name:''; }

function renderMarketDirectory(){
  const host=$('mDir'); if(!host) return; host.innerHTML='';
  const q = ($('mSearch').value||'').toLowerCase();
  MARKETS.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')).filter(m=>{
    return !q || [m.name,m.date,(m.endDate||''),m.where].join(' ').toLowerCase().includes(q);
  }).forEach(m=>{
    const row=document.createElement('div'); row.className='row card mini';
    const left=document.createElement('div'); left.className='grow';
    left.innerHTML=`<strong>${m.name||'Untitled'}</strong>${m.date?(' • '+m.date):''}${m.endDate?(' → '+m.endDate):''}${m.where?(' • '+m.where):''}`;
    const btn=document.createElement('button'); btn.textContent='Open'; btn.onclick=()=>openWorkspace(m.id);
    row.append(left,btn); host.appendChild(row);
  });
}
function renderInsights(){
  const t=today();
  const upcoming = MARKETS.filter(m=>(m.endDate||m.date||'')>=t);
  const next = MARKETS.filter(m=>m.date && m.date>=t).sort((a,b)=>(a.date||'').localeCompare(b.date||''))[0];
  const fees = MARKETS.reduce((s,m)=>s+(+m.fee||0),0);
  const sales= MARKETS.reduce((s,m)=>s+(+m.sales||0),0);
  $('insUpcoming').textContent = String(upcoming.length);
  $('insNext').textContent = next? (next.name||'Untitled') : '—';
  $('insNextSub').textContent = next? ((next.date||'')+(next.where?(' • '+next.where):'')) : 'No upcoming markets';
  $('insFees').textContent = `${curSym()}${fees.toFixed(2)} ${curType()}`;
  $('insSales').textContent= `${curSym()}${sales.toFixed(2)} ${curType()}`;
}
function renderMarkets(){
  const list=$('marketList'); if(!list) return; list.innerHTML='';
  MARKETS.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')).forEach(m=>{
    const row=document.createElement('div'); row.className='row card mini';
    const feeTxt = m.fee ? ` • ${curSym()}${(+m.fee).toFixed(2)} ${curType()}` : '';
    const dates = (m.date? (' • '+m.date):'') + (m.endDate?(' → '+m.endDate):'');
    const left=document.createElement('div'); left.className='grow';
    left.innerHTML=`<strong>${m.name||'Untitled'}</strong>${dates}${m.where?(' • '+m.where):''}${feeTxt}`;
    const badge=document.createElement('span'); badge.className='hint'; badge.textContent=statusBadge(m);
    const open=document.createElement('button'); open.textContent='Open'; open.onclick=()=>openWorkspace(m.id);
    const del=document.createElement('button'); del.className='ghost'; del.textContent='Delete';
    del.onclick=()=>{ if(confirm('Delete this market?')){ MARKETS=MARKETS.filter(x=>x.id!==m.id); saveMarkets(); renderAll(); } };
    row.append(left,badge,open,del); list.appendChild(row);
  });
  renderInsights();
  renderMarketDirectory();
  populateMarketMulti($('pMarkets')); populateMarketMulti($('wMarkets'));
  populateMarketSelect($('oMarket'), true); populatePickupLocations($('oPickLoc'));
}
function addMarket(){
  let where = ($('mWhere').value||'');
  if (where==='__OTHER__'){
    const v = prompt('New location?',''); if (v){
      where=v.trim(); if(where && !SETTINGS.locations.includes(where)){ SETTINGS.locations.push(where); saveSettings(); }
    } else { where=''; }
  }
  const m = {
    id: uid(), name: ($('mName').value||'').trim(),
    date:$('mDate').value||'', endDate:$('mEnd').value||'',
    where, fee: parseFloat($('mFee').value||0)||0, sales:0,
    notes: ($('mNotes').value||'').trim(), checklist:[]
  };
  if(!m.name) return alert('Market needs a name');
  MARKETS.push(m); saveMarkets();
  ['mName','mDate','mEnd','mFee','mNotes'].forEach(id=>$(id).value=''); $('mWhere').value='';
  renderMarkets();
}
$('addMarket').addEventListener('click', addMarket);
$('mSearch').addEventListener('input', renderMarketDirectory);
rebuildWhereDropdown();

/* ===== Workspace ===== */
const MASTER = ["Float/Square reader","Cash box","Business cards","Bags","Tablecloth","Display risers","Signage","Scissors & Tape","Sanitizer","Water & snacks"];
function ensureChecklist(m){ if(!Array.isArray(m.checklist)||!m.checklist.length) m.checklist = MASTER.map(t=>({text:t,done:false})); }

function openWorkspace(id){
  const m = MARKETS.find(x=>x.id===id); if(!m) return;
  ensureChecklist(m);
  const fees=(+m.fee||0), sales=(+m.sales||0);
  const html=`
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div>
        <h3>🧺 Workspace — ${m.name||'Untitled'}</h3>
        <div class="hint">${m.date||''}${m.endDate?(' → '+m.endDate):''}${m.where?(' • '+m.where):''}</div>
      </div>
      <button id="wsClose" class="ghost">Close</button>
    </div>
    <div class="grid g3">
      <div class="card">
        <h3>Checklist</h3>
        <div id="wsChecks"></div>
        <div class="row"><input id="wsNew" class="grow" placeholder="Add item…"><button id="wsAdd">Add</button></div>
        <button id="wsReset" class="ghost">Reset from master</button>
      </div>
      <div class="card">
        <h3>Linked Plushies</h3><div id="wsPlush" class="hint">—</div>
        <h3 style="margin-top:12px">Linked W.I.P.s</h3><div id="wsWips" class="hint">—</div>
      </div>
      <div class="card">
        <h3>Orders for this market</h3><div id="wsOrders" class="hint">—</div>
        <hr>
        <div class="row"><div>Table Fee</div><div id="wsFeeTag" class="hint"></div></div>
        <div class="row"><div>Sales</div><div id="wsSalesTag" class="hint"></div></div>
      </div>
    </div>`;
  $('dlgMarketBody').innerHTML = html;
  $('wsFeeTag').textContent = `${curSym()}${fees.toFixed(2)} ${curType()}`;
  $('wsSalesTag').textContent= `${curSym()}${sales.toFixed(2)} ${curType()}`;

  function persist(){ const i=MARKETS.findIndex(x=>x.id===m.id); if(i>=0){ MARKETS[i]=m; saveMarkets(); } }
  const host=$('wsChecks');
  function draw(){
    host.innerHTML='';
    m.checklist.forEach((c,i)=>{
      const row=document.createElement('div'); row.className='row';
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!c.done; cb.onchange=()=>{ c.done=cb.checked; persist(); };
      const tx=document.createElement('input'); tx.value=c.text||''; tx.onchange=()=>{ c.text=tx.value; persist(); };
      const rm=document.createElement('button'); rm.className='ghost'; rm.textContent='🗑'; rm.onclick=()=>{ m.checklist.splice(i,1); persist(); draw(); };
      row.append(cb,tx,rm); host.appendChild(row);
    });
  }
  draw();
  $('wsAdd').onclick=()=>{ const t=($('wsNew').value||'').trim(); if(!t) return; m.checklist.push({text:t,done:false}); $('wsNew').value=''; persist(); draw(); };
  $('wsReset').onclick=()=>{ if(confirm('Reset checklist from master?')){ m.checklist = MASTER.map(t=>({text:t,done:false})); persist(); draw(); } };

  // Inject linked items
  const pHost=$('wsPlush'); const pItems = PLUSH.filter(p=> (p.markets||[]).includes(m.id));
  pHost.innerHTML = pItems.length? pItems.map(p=>`<div>${p.name||'?'} • ${p.status||'Planned'} ${p.price!=null?('• '+curSym()+Number(p.price||0).toFixed(2)+' '+curType()):''}</div>`).join('') : '<div class="hint">None linked</div>';

  const wHost=$('wsWips'); const wItems = WIPS.filter(w=> (w.markets||[]).includes(m.id));
  wHost.innerHTML = wItems.length? wItems.map(w=>`<div>${w.yarn||'?'} • ${w.hook||''} ${w.link?`• <a target="_blank" href="${w.link}">pattern</a>`:''}</div>`).join('') : '<div class="hint">None linked</div>';

  const oHost=$('wsOrders'); const oItems = ORDERS.filter(o=> o.deliveryType==='market' && o.market===m.id);
  oHost.innerHTML = oItems.length? oItems.map(o=>`<div><strong>${o.name}</strong> • ${o.item} • ${o.status||''}</div>`).join('') : '<div class="hint">No orders for this market</div>';

  $('wsClose').onclick=()=> $('dlgMarket').close();
  $('dlgMarket').showModal();
}

/* ===== Plushies ===== */
function populateMarketMulti(sel){
  if(!sel) return; sel.innerHTML='';
  MARKETS.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''))
    .forEach(m=> sel.add(new Option(m.name+(m.date?(' • '+m.date):''), m.id)));
}
function setMulti(sel,vals){ Array.from(sel.options).forEach(o=>o.selected=(vals||[]).includes(o.value)); }
function fmtMarketsTag(ids){ return ids&&ids.length ? ids.map(id=>`<span class="tag">${getMarketName(id)||'?'}</span>`).join(' ') : ''; }

let editingPlush=-1;
function renderPlushies(){
  const host=$('plushList'); if(!host) return; host.innerHTML='';
  const t=document.createElement('table');
  t.innerHTML=`<thead><tr><th>Name</th><th>Size</th><th>Status</th><th>Price</th><th>Markets</th><th>Notes</th><th></th></tr></thead><tbody></tbody>`;
  const tb=t.querySelector('tbody');
  PLUSH.forEach((p,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.name||''}</td><td>${p.size||''}</td><td>${p.status||'Planned'}</td>
      <td>${curSym()}${Number(p.price||0).toFixed(2)} ${curType()}</td>
      <td>${fmtMarketsTag(p.markets||[])}</td><td>${p.notes||''}</td><td></td>`;
    const act=tr.lastElementChild;
    const e=document.createElement('button'); e.className='soft'; e.textContent='✏️ Edit';
    e.onclick=()=>{ editingPlush=i; $('pName').value=p.name||''; $('pSize').value=p.size||''; $('pStatus').value=p.status||'Planned'; $('pPrice').value=(p.price??''); $('pNotes').value=p.notes||''; setMulti($('pMarkets'), p.markets||[]); };
    const d=document.createElement('button'); d.className='ghost'; d.textContent='🗑 Delete'; d.onclick=()=>{ PLUSH.splice(i,1); savePlush(); renderPlushies(); };
    act.append(e, document.createTextNode(' '), d);
    tb.appendChild(tr);
  });
  host.appendChild(t);
}
$('addPlush').addEventListener('click', ()=>{
  const row={ name:($('pName').value||'').trim(), size:($('pSize').value||'').trim(), status:$('pStatus').value||'Planned',
    price:parseFloat($('pPrice').value||0)||0, markets:Array.from(($('pMarkets').selectedOptions||[])).map(o=>o.value),
    notes:($('pNotes').value||'').trim(), added:today() };
  if(!row.name) return alert('Plushie name required');
  if(row.status==='Finished' && !row.finished) row.finished=today();

  if(editingPlush>=0){ row.added = PLUSH[editingPlush].added||row.added; row.finished = row.status==='Finished' ? (PLUSH[editingPlush].finished||today()) : (PLUSH[editingPlush].finished||''); PLUSH[editingPlush]=row; editingPlush=-1; }
  else { PLUSH.push(row); }
  ['pName','pPrice','pNotes'].forEach(id=>$(id).value=''); $('pSize').value=''; $('pStatus').value='Planned'; setMulti($('pMarkets'), []);
  savePlush(); renderPlushies();
});
$('cancelPlush').addEventListener('click',()=>{ editingPlush=-1; ['pName','pPrice','pNotes'].forEach(id=>$(id).value=''); $('pSize').value=''; $('pStatus').value='Planned'; setMulti($('pMarkets'), []); });

function buildPlushSizePresetHelper(){
  const input=$('pSize'); if(!input) return;
  if ($('pSizePreset')) return;
  const sel=document.createElement('select'); sel.id='pSizePreset'; sel.style.marginTop='6px'; sel.style.width='100%';
  (SETTINGS.sizes||[]).forEach(sz=> sel.add(new Option(sz,sz)));
  const btn=document.createElement('button'); btn.className='ghost'; btn.style.marginTop='6px'; btn.textContent='Use selected size'; btn.onclick=()=>{ if(sel.value) input.value=sel.value; };
  input.parentElement.append(sel, btn);
}
buildPlushSizePresetHelper();

/* ===== WIPs ===== */
function setWipMulti(vals){ setMulti($('wMarkets'), vals); }
let editingWip=-1;
function renderWips(){
  const host=$('wipList'); if(!host) return; host.innerHTML='';
  const t=document.createElement('table');
  t.innerHTML=`<thead><tr><th>Yarn</th><th>Hook</th><th>Markets</th><th>Pattern</th><th>Time</th><th>Notes</th><th></th></tr></thead><tbody></tbody>`;
  const tb=t.querySelector('tbody');
  WIPS.forEach((w,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${w.yarn||''}</td><td>${w.hook||''}</td><td>${fmtMarketsTag(w.markets||[])}</td>
    <td>${w.link?`<a target="_blank" href="${w.link}">link</a>`:''}</td><td>${w.time||''}</td><td>${w.notes||''}</td><td></td>`;
    const act=tr.lastElementChild;
    const e=document.createElement('button'); e.className='soft'; e.textContent='✏️ Edit';
    e.onclick=()=>{ editingWip=i; $('wYarn').value=w.yarn||''; $('wHook').value=w.hook||''; $('wLink').value=w.link||''; $('wTime').value=w.time||''; $('wNotes').value=w.notes||''; setWipMulti(w.markets||[]); };
    const d=document.createElement('button'); d.className='ghost'; d.textContent='🗑 Delete'; d.onclick=()=>{ WIPS.splice(i,1); saveWips(); renderWips(); };
    act.append(e, document.createTextNode(' '), d); tb.appendChild(tr);
  });
  host.appendChild(t);
}
$('addWip').addEventListener('click', ()=>{
  const row={ yarn:($('wYarn').value||'').trim(), hook:($('wHook').value||'').trim(), link:($('wLink').value||'').trim(),
    time:($('wTime').value||'').trim(), notes:($('wNotes').value||'').trim(),
    markets:Array.from(($('wMarkets').selectedOptions||[])).map(o=>o.value) };
  if(!row.yarn) return alert('WIP requires yarn');
  if(editingWip>=0){ WIPS[editingWip]=row; editingWip=-1; } else { WIPS.push(row); }
  ['wYarn','wHook','wLink','wTime','wNotes'].forEach(id=>$(id).value=''); setWipMulti([]);
  saveWips(); renderWips();
});
$('cancelWip').addEventListener('click', ()=>{ editingWip=-1; ['wYarn','wHook','wLink','wTime','wNotes'].forEach(id=>$(id).value=''); setWipMulti([]); });

/* ===== Orders ===== */
function populateMarketSelect(sel, includeBlank){
  if(!sel) return; sel.innerHTML=''; if(includeBlank) sel.add(new Option('—',''));
  MARKETS.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).forEach(m=> sel.add(new Option(m.name+(m.date?(' • '+m.date):''), m.id)));
}
function populatePickupLocations(sel){ if(!sel) return; sel.innerHTML=''; (SETTINGS.locations||[]).forEach(l=>sel.add(new Option(l,l))); }
function updateDeliveryUI(){
  const v=($('oDeliveryType')?.value)||'';
  $('oDeliveryMarketWrap').style.display = (v==='market')?'':'none';
  $('oDeliveryShipWrap').style.display   = (v==='shipping')?'':'none';
  $('oDeliveryPickWrap').style.display   = (v==='pickup')?'':'none';
}
$('oDeliveryType').addEventListener('change', updateDeliveryUI);

let editingOrder=-1;
function renderOrders(){
  const host=$('orderList'); if(!host) return; host.innerHTML='';
  const t=document.createElement('table');
  t.innerHTML=`<thead><tr><th>Customer</th><th>Item</th><th>Qty</th><th>Due</th><th>Status</th><th>Delivery</th><th>Notes</th><th></th></tr></thead><tbody></tbody>`;
  const tb=t.querySelector('tbody');
  ORDERS.forEach((o,i)=>{
    const tr=document.createElement('tr');
    let dLab='—';
    if(o.deliveryType==='market') dLab = 'Market: '+(getMarketName(o.market||'')||'—');
    if(o.deliveryType==='shipping'){ const c=isNaN(o.ship?.cost)?0:+o.ship.cost; dLab='Shipping'+(c>0?` (${curSym()}${c.toFixed(2)} ${curType()})`:``); }
    if(o.deliveryType==='pickup'){ dLab='Pickup'+(o.pickup?.loc?` (${o.pickup.loc})`:``); }
    tr.innerHTML=`<td>${o.name||''}</td><td>${o.item||''}</td><td>${o.qty||1}</td><td>${o.due||''}</td><td>${o.status||''}</td><td>${dLab}</td><td>${o.notes||''}</td><td></td>`;
    const act=tr.lastElementChild;
    const e=document.createElement('button'); e.className='soft'; e.textContent='✏️ Edit';
    e.onclick=()=>{ editingOrder=i; vset('oName',o.name); vset('oItem',o.item); vset('oQty',o.qty||1); vset('oDue',o.due); vset('oStatus',o.status||'Planned'); vset('oNotes',o.notes);
      vset('oDeliveryType',o.deliveryType||''); updateDeliveryUI(); populateMarketSelect($('oMarket'), true); populatePickupLocations($('oPickLoc'));
      vset('oMarket',o.market||''); vset('oShipTo',o.ship?.to); vset('oShipAddr',o.ship?.addr); vset('oShipCost',o.ship?.cost??''); vset('oShipTrack',o.ship?.track); vset('oShipNotes',o.ship?.notes);
      vset('oPickLoc',o.pickup?.loc||''); vset('oPickWhen',o.pickup?.when||''); vset('oPickNotes',o.pickup?.notes||''); };
    const d=document.createElement('button'); d.className='ghost'; d.textContent='🗑 Delete'; d.onclick=()=>{ ORDERS.splice(i,1); saveOrders(); renderOrders(); };
    act.append(e, document.createTextNode(' '), d); tb.appendChild(tr);
  });
  host.appendChild(t);
}
window.g = (id)=>{ const el=$(id); return el? (el.value??'').toString().trim() : ''; };
window.vset=(id,v)=>{ const el=$(id); if(el) el.value=(v==null?'':v); };

function bindOrderHandlers(){
  const add=$('addOrder'), can=$('cancelOrder');
  if(add && !add._bound){ add.addEventListener('click', ()=>{
    const row={ name:g('oName'), item:g('oItem'), qty:Number(g('oQty')||1), due:g('oDue'), status:g('oStatus'), notes:g('oNotes'),
      deliveryType:g('oDeliveryType')||'', market:g('oMarket')||'',
      ship:{ to:g('oShipTo'), addr:g('oShipAddr'), cost:parseFloat(g('oShipCost')||0), track:g('oShipTrack'), notes:g('oShipNotes') },
      pickup:{ loc:g('oPickLoc')||'', when:g('oPickWhen')||'', notes:g('oPickNotes') } };
    if(!row.name || !row.item) return alert('Need customer name and item');
    if(editingOrder>=0){ ORDERS[editingOrder]=row; editingOrder=-1; } else { ORDERS.push(row); }
    ['oName','oItem','oQty','oDue','oNotes','oShipTo','oShipAddr','oShipCost','oShipTrack','oShipNotes','oPickWhen','oPickNotes'].forEach(id=>vset(id,'')); vset('oStatus','Planned'); vset('oDeliveryType',''); updateDeliveryUI(); vset('oMarket',''); vset('oPickLoc','');
    saveOrders(); renderOrders();
  }); add._bound=true; }
  if(can && !can._bound){ can.addEventListener('click', ()=>{ editingOrder=-1; ['oName','oItem','oQty','oDue','oNotes','oShipTo','oShipAddr','oShipCost','oShipTrack','oShipNotes','oPickWhen','oPickNotes'].forEach(id=>vset(id,'')); vset('oStatus','Planned'); vset('oDeliveryType',''); updateDeliveryUI(); vset('oMarket',''); vset('oPickLoc',''); }); can._bound=true; }
  updateDeliveryUI();
}
bindOrderHandlers();

/* ===== Boot ===== */
function renderAll(){ renderMarkets(); renderPlushies(); renderWips(); renderOrders(); }
/* === Header menu === */
(function headerMenu(){
  const btn = $('btnMenu');
  const drop = $('menuDrop');
  if(!btn || !drop) return;
  btn.addEventListener('click', ()=>{
    drop.style.display = (drop.style.display==='none' || !drop.style.display) ? 'block' : 'none';
  });
  document.addEventListener('click', (e)=>{
    if (!drop.contains(e.target) && e.target !== btn) drop.style.display='none';
  });

  drop.addEventListener('click', (e)=>{
    const act = e.target?.dataset?.act;
    if(!act) return;
    drop.style.display='none';

    if (act==='settings'){
      $('hub').style.display='block'; // ensure hub is visible
      $('cardSettings')?.scrollIntoView({behavior:'smooth', block:'start'});
    }
    if (act==='instructions'){ $('dlgInstructions')?.showModal(); }
    if (act==='whatsnew'){ $('dlgWhatsNew')?.showModal(); }

    if (act==='export'){
      const blob = new Blob([JSON.stringify({
        settings: SETTINGS, markets: MARKETS, plush: PLUSH, wips: WIPS, orders: ORDERS
      }, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `LBS_MarketHub_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    if (act==='import'){
      const inp = document.createElement('input');
      inp.type='file'; inp.accept='application/json';
      inp.onchange = async ()=>{
        const file = inp.files?.[0]; if(!file) return;
        const text = await file.text();
        try{
          const j = JSON.parse(text);
          if (j.settings) { SETTINGS = j.settings; localStorage.setItem(KSET, JSON.stringify(SETTINGS)); applySettingsUI(); rebuildWhereDropdown(); buildPlushSizePresetHelper(); }
          if (j.markets)  { MARKETS  = j.markets;  localStorage.setItem(KMK,  JSON.stringify(MARKETS)); }
          if (j.plush)    { PLUSH    = j.plush;    localStorage.setItem(KPL,  JSON.stringify(PLUSH)); }
          if (j.wips)     { WIPS     = j.wips;     localStorage.setItem(KWP,  JSON.stringify(WIPS)); }
          if (j.orders)   { ORDERS   = j.orders;   localStorage.setItem(KOR,  JSON.stringify(ORDERS)); }
          renderAll();
          alert('Import complete ✅');
        }catch(err){
          alert('Import failed: '+ err.message);
        }
      };
      inp.click();
    }
  });
})();

renderAll();
