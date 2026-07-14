'use strict';

const $ = s => document.querySelector(s);
const store = {
  get(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback} },
  set(key, value){ localStorage.setItem(key, JSON.stringify(value)) },
  del(key){ localStorage.removeItem(key) }
};
const KEYS={rounds:'gs_rounds_v5',active:'gs_active_v5',players:'gs_players_v5',favorites:'gs_favorites_v5',custom:'gs_custom_courses_v5'};

const demo18={
  id:'demo18',name:'Sýnishornsvöllur 18',location:'Prófunargögn',holes:18,demo:true,
  image:'linear-gradient(145deg,#0c4f35,#79b66c)',
  tees:[
    {id:'gull',name:'Gull',rating:71.2,slope:126,lengths:[356,482,151,392,322,510,168,403,371,344,492,177,381,405,139,525,363,410]},
    {id:'graenn',name:'Grænn',rating:69.4,slope:121,lengths:[332,455,137,366,301,482,151,379,348,321,468,159,356,379,126,496,340,385]}
  ],
  pars:[4,5,3,4,4,5,3,4,4,4,5,3,4,4,3,5,4,4],
  sis:[9,3,17,1,13,7,15,5,11,10,4,18,2,12,16,6,14,8]
};
const demo9={
  id:'demo9',name:'Sýnishornsvöllur 9',location:'Prófunargögn',holes:9,demo:true,
  image:'linear-gradient(145deg,#145f46,#a8c96f)',
  tees:[{id:'gulur',name:'Gulur',rating:35.1,slope:118,lengths:[341,147,455,372,305,498,162,361,388]}],
  pars:[4,3,5,4,4,5,3,4,4],sis:[5,9,1,3,7,2,8,6,4]
};

let state={view:'home',draft:null,active:store.get(KEYS.active,null),selectedRound:null,selectedCourse:null,editingCourse:null};
function courses(){return [demo18,demo9,...store.get(KEYS.custom,[]) ]}
function rounds(){return store.get(KEYS.rounds,[])}
function savedPlayers(){return store.get(KEYS.players,[])}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmt(n){return Number.isInteger(n)?String(n):Number(n).toLocaleString('is-IS',{maximumFractionDigits:2})}
function today(){return new Date().toISOString().slice(0,10)}
function uid(){return crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)}

function shell(content, title='Golfskor', back=false){
  return `<div class="app-shell"><header class="topbar">${back?'<button class="icon-btn" data-action="back">←</button>':''}<div class="brand"><div class="brand-mark">⛳</div>${esc(title)}</div><div class="spacer"></div>${state.active&&state.view==='home'?'<button class="btn btn-secondary" data-action="resume">Halda áfram</button>':''}</header><main>${content}</main></div>`
}
function render(){
  const views={home:renderHome,new:renderNew,course:renderCourseSelect,setup:renderSetup,courseConfig:renderCourseConfig,play:renderPlay,summary:renderSummary,history:renderHistory,players:renderPlayers};
  $('#app').innerHTML=(views[state.view]||renderHome)();
}

function renderHome(){
  const recent=rounds().slice(0,5);
  return shell(`
    <section class="hero"><svg class="hero-art" viewBox="0 0 300 180"><path fill="white" d="M0 160C55 100 90 138 135 76c35-47 88-34 165-70v174H0z"/><circle fill="white" cx="210" cy="38" r="8"/><path stroke="white" stroke-width="4" d="M210 42v72"/><path fill="white" d="m210 43 48 15-48 17z"/></svg><div class="hero-content"><h1>Golfskor</h1><p>Einfalt skorkort fyrir hollið.</p></div></section>
    <div class="section-title"><h2>Hvað viltu gera?</h2></div>
    <div class="grid-2">
      <button class="action-card" data-action="new-round"><div class="action-icon">▶</div><strong>Nýr hringur</strong><span>Veldu völl, leikmenn og keppnisform.</span></button>
      <button class="action-card" data-action="history"><div class="action-icon">📂</div><strong>Síðustu hringir</strong><span>Opnaðu eldri skorkort.</span></button>
      <button class="action-card" data-action="players"><div class="action-icon">👤</div><strong>Leikmenn</strong><span>Vistaðu nöfn og forgjöf.</span></button>
      <button class="action-card" data-action="courses"><div class="action-icon">⭐</div><strong>Golfvellir</strong><span>Uppáhald og sérvellir.</span></button>
    </div>
    <div class="section-title"><h2>Síðustu 5</h2><button class="btn btn-secondary" data-action="history">Sjá allt</button></div>
    ${recent.length?recent.map(roundCard).join(''):'<div class="card empty">Enginn lokinn hringur enn.</div>'}
  `,'Golfskor');
}
function roundCard(r){
  const best=[...r.players].sort((a,b)=>total(r,a.id)-total(r,b.id))[0];
  return `<button class="card action-card round-card" style="width:100%;min-height:auto" data-open-round="${r.id}"><div class="round-date">${new Date(r.date+'T12:00').toLocaleDateString('is-IS',{day:'2-digit',month:'short'})}</div><div class="round-main"><strong>${esc(r.name)}</strong><span>${r.holeCount} holur · ${esc(r.course.name)}</span></div><div><strong>${best?total(r,best.id):'-'}</strong><div class="small muted">lægst</div></div></button>`
}

function initDraft(){
  const ps=savedPlayers();
  state.draft={name:'',date:today(),holeCount:18,withHandicap:false,course:null,teeId:null,players:(ps.length?ps.slice(0,4):[{id:uid(),name:'Egill',handicap:0}]).map(p=>({...p,id:uid()}))};
}
function renderNew(){
  if(!state.draft)initDraft(); const d=state.draft;
  return shell(`<div class="card"><div class="field"><label>Nafn hrings eða golfvöllur *</label><input class="input" id="round-name" value="${esc(d.name)}" placeholder="t.d. Keilir eða Fimmtudagshollið"></div><div class="field"><label>Dagsetning</label><input class="input" id="round-date" type="date" value="${d.date}"></div><div class="field"><label>Fjöldi hola</label><div class="segmented"><button data-holes="9" class="${d.holeCount===9?'active':''}">9 holur</button><button data-holes="18" class="${d.holeCount===18?'active':''}">18 holur</button></div></div><div class="field"><label>Golfvöllur</label><button class="btn btn-ghost" style="width:100%" data-action="select-course">${d.course?esc(d.course.name):'Velja golfvöll →'}</button></div>${d.course?coursePreview(d.course):''}<div class="toggle card"><div><strong>Spila með forgjöf</strong><div class="small muted">Nettóskor og forgjafarhögg á holum.</div></div><button class="switch ${d.withHandicap?'on':''}" data-action="toggle-handicap"><span></span></button></div><div class="section-title"><h2>Leikmenn (${d.players.length}/4)</h2>${d.players.length<4?'<button class="btn btn-secondary" data-action="add-player">+ Bæta við</button>':''}</div>${d.players.map((p,i)=>playerInput(p,i,d.withHandicap)).join('')}<button class="btn btn-primary" data-action="continue-setup">Halda áfram</button></div>`,'Nýr hringur',true)
}
function playerInput(p,i,withH){return `<div class="player-row"><div class="field"><label>Leikmaður ${i+1}</label><input class="input player-name" data-index="${i}" value="${esc(p.name)}" placeholder="Nafn"></div><div class="field"><label>${withH?'Leikforgjöf':'Forgjöf'}</label><input class="input player-hcp" data-index="${i}" type="number" min="0" max="54" step="1" value="${p.handicap??0}" ${withH?'':'disabled'}></div>${i?`<button class="remove-btn" data-remove-player="${i}">×</button>`:'<span></span>'}</div>`}
function coursePreview(c){return `<div class="card course-card"><div class="course-visual" style="background:${c.image||'linear-gradient(145deg,#236846,#8cc98c)'}"></div><div class="course-body"><div class="course-title"><h3>${esc(c.name)}</h3></div><div class="muted small">${esc(c.location||'')} · ${c.holes} holur</div>${c.demo?'<span class="tag">SÝNISHORNSGÖGN</span>':'<span class="tag">SÉRVÖLLUR</span>'}</div></div>`}

function renderCourseSelect(){
  const fav=store.get(KEYS.favorites,[]); const list=[...courses()].sort((a,b)=>(fav.includes(b.id)?1:0)-(fav.includes(a.id)?1:0));
  return shell(`<div class="notice">Sýnishornsvellirnir eru aðeins til að prófa flæðið. Þeir eru ekki raunveruleg skorkort íslenskra golfvalla.</div><div class="section-title"><h2>Veldu golfvöll</h2><button class="btn btn-secondary" data-action="custom-course">+ Sérvöllur</button></div>${list.map(c=>`<div class="card course-card"><div class="course-visual" style="background:${c.image||'linear-gradient(145deg,#236846,#8cc98c)'}"></div><div class="course-body"><div class="course-title"><h3>${esc(c.name)}</h3><button class="favorite" data-favorite="${c.id}">${fav.includes(c.id)?'★':'☆'}</button></div><div class="muted small">${esc(c.location||'')} · ${c.holes} holur</div>${c.demo?'<span class="tag">SÝNISHORN</span>':'<span class="tag">SÉRVÖLLUR</span>'}<div style="margin-top:14px"><button class="btn btn-primary" data-select-course="${c.id}">Velja völl</button></div></div></div>`).join('')}`,'Golfvellir',true)
}

function renderSetup(){
  const d=state.draft,c=d.course; if(!c)return renderNew();
  const compatibleTees=c.tees||[]; if(!d.teeId&&compatibleTees[0])d.teeId=compatibleTees[0].id;
  return shell(`${coursePreview(c)}<div class="card"><div class="field"><label>Teigar</label><select id="tee-select">${compatibleTees.map(t=>`<option value="${t.id}" ${d.teeId===t.id?'selected':''}>${esc(t.name)}${t.rating?` · CR ${t.rating} / Slope ${t.slope}`:''}</option>`).join('')}</select></div><div class="notice">Par, HCP/Stroke Index og lengdir fyllast sjálfkrafa úr vallarupplýsingum. Þú getur yfirfarið þær áður en hringur hefst.</div><button class="btn btn-secondary" style="width:100%;margin-bottom:10px" data-action="edit-hole-data">Yfirfara holuupplýsingar</button><button class="btn btn-primary" data-action="start-round">Hefja hring</button></div>`,'Stilling hrings',true)
}

function renderCourseConfig(){
  const c=state.editingCourse||state.draft?.course; if(!c)return renderHome();
  const n=state.draft?.holeCount||c.holes;
  const tee=(c.tees||[]).find(t=>t.id===(state.draft?.teeId))||c.tees?.[0]||{lengths:[]};
  return shell(`<div class="card"><div class="hole-config head"><span>Hola</span><span>Par</span><span>HCP</span><span>Lengd</span></div>${Array.from({length:n},(_,i)=>`<div class="hole-config"><strong>${i+1}</strong><input class="cfg-par" data-i="${i}" type="number" min="3" max="6" value="${c.pars[i]||4}"><input class="cfg-si" data-i="${i}" type="number" min="1" max="${n}" value="${c.sis[i]||i+1}"><input class="cfg-len" data-i="${i}" type="number" min="0" value="${tee.lengths?.[i]||0}"></div>`).join('')}<button class="btn btn-primary" data-action="save-hole-data">Vista upplýsingar</button></div>`,'Holuupplýsingar',true)
}

function createRound(){
  const d=state.draft,c=structuredClone(d.course); const tee=c.tees.find(t=>t.id===d.teeId)||c.tees[0];
  const n=d.holeCount; c.pars=c.pars.slice(0,n); c.sis=c.sis.slice(0,n); tee.lengths=(tee.lengths||[]).slice(0,n);
  const players=d.players.map(p=>({id:uid(),name:p.name.trim(),handicap:d.withHandicap?Math.max(0,Math.round(Number(p.handicap)||0)):0}));
  const scores=Array.from({length:n},()=>Object.fromEntries(players.map(p=>[p.id,4])));
  return {id:uid(),name:d.name.trim(),date:d.date,holeCount:n,withHandicap:d.withHandicap,course:{id:c.id,name:c.name,location:c.location,pars:c.pars,sis:c.sis,tee:{id:tee.id,name:tee.name,lengths:tee.lengths}},players,scores,currentHole:0,completed:false,createdAt:Date.now()}
}
function renderPlay(){
  const r=state.active;if(!r){state.view='home';return renderHome()} const i=r.currentHole,p=r.course.pars[i],si=r.course.sis[i],len=r.course.tee.lengths?.[i]||0;
  const grossLead=[...r.players].sort((a,b)=>runningTotal(r,a.id,i)-runningTotal(r,b.id,i))[0];
  const winMap=holeWins(r,i); const winLead=[...r.players].sort((a,b)=>(winMap[b.id]||0)-(winMap[a.id]||0))[0];
  return shell(`<div class="hole-header"><div class="hole-number">${esc(r.name)}</div><div class="hole-title">Hola ${i+1}</div><div class="hole-meta"><span class="pill">Par ${p}</span><span class="pill">HCP ${si}</span>${len?`<span class="pill">${len} m</span>`:''}</div></div><div class="progress"><span style="width:${((i+1)/r.holeCount)*100}%"></span></div><div class="leader-strip"><div class="leader-box"><small>Leiðir í höggleik</small><strong>${esc(grossLead.name)} · ${runningTotal(r,grossLead.id,i)} högg</strong></div><div class="leader-box gold"><small>Flestar unnar holur</small><strong>${esc(winLead.name)} · ${fmt(winMap[winLead.id]||0)}</strong></div></div><div class="section-title"><h2>Skrá högg</h2><span class="muted">${i+1}/${r.holeCount}</span></div>${r.players.map(pl=>scoreCard(r,pl,i)).join('')}<div class="bottom-actions"><button class="btn btn-ghost" data-action="prev-hole" ${i===0?'disabled':''}>← Fyrri</button><button class="btn btn-primary" data-action="next-hole">${i===r.holeCount-1?'Ljúka hring':'Næsta →'}</button></div>`,'Golfskor',false)
}
function scoreCard(r,pl,i){const g=r.scores[i][pl.id];const strokes=r.withHandicap?strokesOnHole(pl.handicap,r.course.sis[i],r.holeCount):0;return `<div class="card score-card"><div><div class="score-name">${esc(pl.name)}</div><div class="score-sub">${r.withHandicap?`Nettó ${g-strokes} · ${strokes} forgjafarhögg`:g===r.course.pars[i]?'Par':g<r.course.pars[i]?'Undir pari':'Yfir pari'}</div></div><div class="score-control"><button data-score="minus" data-player="${pl.id}">−</button><span class="score-value">${g}</span><button data-score="plus" data-player="${pl.id}">+</button></div></div>`}
function strokesOnHole(h,si,n){const base=Math.floor(h/n),rem=h%n;return base+(si<=rem?1:0)}
function netScore(r,pi,hi){const g=r.scores[hi][pi];const pl=r.players.find(p=>p.id===pi);return g-(r.withHandicap?strokesOnHole(pl.handicap,r.course.sis[hi],r.holeCount):0)}
function runningTotal(r,pid,last){let t=0;for(let i=0;i<=last;i++)t+=r.scores[i][pid];return t}
function total(r,pid){return r.scores.reduce((s,h)=>s+(Number(h[pid])||0),0)}
function netTotal(r,pid){return r.scores.reduce((s,h,i)=>s+netScore(r,pid,i),0)}
function holeWins(r,last=r.holeCount-1){const out=Object.fromEntries(r.players.map(p=>[p.id,0]));for(let i=0;i<=last;i++){const vals=r.players.map(p=>({id:p.id,v:netScore(r,p.id,i)}));const min=Math.min(...vals.map(x=>x.v));const winners=vals.filter(x=>x.v===min);if(winners.length===r.players.length)continue;const share=1/winners.length;winners.forEach(w=>out[w.id]+=share)}return out}

function finishRound(){const r=state.active;r.completed=true;r.completedAt=Date.now();const arr=[r,...rounds().filter(x=>x.id!==r.id)].slice(0,5);store.set(KEYS.rounds,arr);store.del(KEYS.active);state.active=null;state.selectedRound=r;state.view='summary';render()}
function renderSummary(){
  const r=state.selectedRound||rounds()[0];if(!r)return shell('<div class="empty">Enginn hringur valinn.</div>','Samantekt',true); const wins=holeWins(r);
  const gross=[...r.players].sort((a,b)=>total(r,a.id)-total(r,b.id));const net=[...r.players].sort((a,b)=>netTotal(r,a.id)-netTotal(r,b.id));const winRank=[...r.players].sort((a,b)=>wins[b.id]-wins[a.id]);
  return shell(`<section class="hero" style="min-height:170px;background:${r.course.image||'linear-gradient(145deg,#0c4f35,#79b66c)'}"><div class="hero-content"><h1>${esc(r.name)}</h1><p>${new Date(r.date+'T12:00').toLocaleDateString('is-IS')} · ${r.holeCount} holur · ${esc(r.course.name)}</p></div></section><div class="section-title"><h2>Skorkort</h2></div><div class="table-wrap"><table class="score-table"><thead><tr><th>Hola</th><th>Par</th>${r.players.map(p=>`<th>${esc(p.name)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:r.holeCount},(_,i)=>`<tr><td>${i+1}</td><td>${r.course.pars[i]}</td>${r.players.map(p=>`<td>${r.scores[i][p.id]}${r.withHandicap?`<div class="small muted">n ${netScore(r,p.id,i)}</div>`:''}</td>`).join('')}</tr>`).join('')}<tr><td>Alls</td><td>${r.course.pars.reduce((a,b)=>a+b,0)}</td>${r.players.map(p=>`<td><strong>${total(r,p.id)}</strong>${r.withHandicap?`<div class="small muted">n ${netTotal(r,p.id)}</div>`:''}</td>`).join('')}</tr></tbody></table></div><div class="section-title"><h2>Höggleikur</h2></div><div class="card">${(r.withHandicap?net:gross).map((p,i)=>ranking(p,i,r.withHandicap?netTotal(r,p.id):total(r,p.id),r.withHandicap?'nettó högg':'högg')).join('')}</div><div class="section-title"><h2>Unnar holur</h2></div><div class="card">${winRank.map((p,i)=>ranking(p,i,wins[p.id],'holusigrar')).join('')}</div><div class="btn-row"><button class="btn btn-primary" data-action="share-result">Deila niðurstöðu</button><button class="btn btn-secondary" data-action="home">Heim</button>${rounds().some(x=>x.id===r.id)?'<button class="btn btn-danger" data-action="delete-round">Eyða hring</button>':''}</div>`,'Samantekt',true)
}
function ranking(p,i,val,label){return `<div class="ranking"><div class="rank ${i===0?'first':''}">${i+1}</div><div class="ranking-main"><strong>${esc(p.name)}</strong><span class="small muted">${label}</span></div><div class="ranking-value">${fmt(val)}</div></div>`}

function renderHistory(){const rs=rounds();return shell(`<div class="section-title"><h2>Vistaðir hringir</h2><span class="muted">Síðustu 5</span></div>${rs.length?rs.map(roundCard).join(''):'<div class="card empty">Engir vistaðir hringir.</div>'}`,'Síðustu hringir',true)}
function renderPlayers(){const ps=savedPlayers();return shell(`<div class="card"><div class="field"><label>Nafn leikmanns</label><input class="input" id="saved-player-name" placeholder="Nafn"></div><div class="field"><label>Sjálfgefin leikforgjöf</label><input class="input" id="saved-player-hcp" type="number" min="0" max="54" value="0"></div><button class="btn btn-primary" data-action="save-player">Vista leikmann</button></div><div class="section-title"><h2>Vistaðir leikmenn</h2></div>${ps.length?ps.map(p=>`<div class="card round-card"><div class="round-date">👤</div><div class="round-main"><strong>${esc(p.name)}</strong><span>Forgjöf ${p.handicap}</span></div><button class="btn btn-danger" data-delete-player="${p.id}">Eyða</button></div>`).join(''):'<div class="card empty">Engir vistaðir leikmenn.</div>'}`,'Leikmenn',true)}

function customCourseModal(){
  $('#app').insertAdjacentHTML('beforeend',`<div class="modal-backdrop"><div class="modal"><h2>Stofna sérvöll</h2><div class="field"><label>Nafn vallar</label><input class="input" id="cc-name" placeholder="Nafn"></div><div class="field"><label>Fjöldi hola</label><div class="segmented"><button class="active" data-cc-holes="9">9</button><button data-cc-holes="18">18</button></div></div><div id="cc-holes"></div><div class="btn-row"><button class="btn btn-ghost" data-action="close-modal">Hætta við</button><button class="btn btn-primary" data-action="create-custom-course">Vista völl</button></div></div></div>`);renderCustomRows(9)
}
function renderCustomRows(n){const box=$('#cc-holes');if(!box)return;box.dataset.count=n;box.innerHTML=`<div class="hole-config head"><span>Hola</span><span>Par</span><span>HCP</span><span>Lengd</span></div>${Array.from({length:n},(_,i)=>`<div class="hole-config"><strong>${i+1}</strong><input class="cc-par" type="number" min="3" max="6" value="4"><input class="cc-si" type="number" min="1" max="${n}" value="${i+1}"><input class="cc-len" type="number" min="0" value="0"></div>`).join('')}`}

async function shareResult(r){
  const wins=holeWins(r);const text=`Golfskor – ${r.name}\n${r.players.map(p=>`${p.name}: ${total(r,p.id)} högg${r.withHandicap?`, ${netTotal(r,p.id)} nettó`:''}, ${fmt(wins[p.id])} unnar holur`).join('\n')}`;
  if(navigator.share){try{await navigator.share({title:'Golfskor',text});return}catch(e){if(e.name==='AbortError')return}}
  await navigator.clipboard?.writeText(text);alert('Niðurstaðan var afrituð.');
}

function syncDraftInputs(){if(!state.draft)return;const n=$('#round-name'),d=$('#round-date');if(n)state.draft.name=n.value;if(d)state.draft.date=d.value;document.querySelectorAll('.player-name').forEach(x=>state.draft.players[+x.dataset.index].name=x.value);document.querySelectorAll('.player-hcp').forEach(x=>state.draft.players[+x.dataset.index].handicap=Number(x.value)||0)}

document.addEventListener('click',e=>{
  const b=e.target.closest('button,[data-open-round]');if(!b)return;syncDraftInputs();
  if(b.dataset.action==='back'){if(state.view==='course'||state.view==='setup')state.view='new';else if(state.view==='courseConfig')state.view='setup';else state.view='home';render();return}
  if(b.dataset.action==='home'){state.view='home';render();return}
  if(b.dataset.action==='new-round'){initDraft();state.view='new';render();return}
  if(b.dataset.action==='history'){state.view='history';render();return}
  if(b.dataset.action==='players'){state.view='players';render();return}
  if(b.dataset.action==='courses'){state.view='course';state.draft=state.draft||null;render();return}
  if(b.dataset.action==='resume'){state.active=store.get(KEYS.active,null);state.view='play';render();return}
  if(b.dataset.holes){state.draft.holeCount=+b.dataset.holes;render();return}
  if(b.dataset.action==='toggle-handicap'){state.draft.withHandicap=!state.draft.withHandicap;render();return}
  if(b.dataset.action==='add-player'){state.draft.players.push({id:uid(),name:'',handicap:0});render();return}
  if(b.dataset.removePlayer){state.draft.players.splice(+b.dataset.removePlayer,1);render();return}
  if(b.dataset.action==='select-course'){state.view='course';render();return}
  if(b.dataset.favorite){const fav=store.get(KEYS.favorites,[]);store.set(KEYS.favorites,fav.includes(b.dataset.favorite)?fav.filter(x=>x!==b.dataset.favorite):[...fav,b.dataset.favorite]);render();return}
  if(b.dataset.selectCourse){const c=courses().find(x=>x.id===b.dataset.selectCourse);if(!state.draft)initDraft();state.draft.course=structuredClone(c);state.draft.holeCount=Math.min(state.draft.holeCount,c.holes);if(c.holes===9)state.draft.holeCount=9;state.draft.teeId=c.tees[0]?.id;state.view='new';render();return}
  if(b.dataset.action==='custom-course'){customCourseModal();return}
  if(b.dataset.ccHoles){document.querySelectorAll('[data-cc-holes]').forEach(x=>x.classList.toggle('active',x===b));renderCustomRows(+b.dataset.ccHoles);return}
  if(b.dataset.action==='close-modal'){b.closest('.modal-backdrop').remove();return}
  if(b.dataset.action==='create-custom-course'){const name=$('#cc-name').value.trim();if(!name)return alert('Skráðu nafn vallar.');const pars=[...document.querySelectorAll('.cc-par')].map(x=>+x.value),sis=[...document.querySelectorAll('.cc-si')].map(x=>+x.value),lengths=[...document.querySelectorAll('.cc-len')].map(x=>+x.value);if(new Set(sis).size!==sis.length)return alert('HCP-röðin þarf að vera án endurtekninga.');const c={id:uid(),name,location:'Sérvöllur',holes:pars.length,demo:false,image:'linear-gradient(145deg,#165b3d,#9bc77d)',pars,sis,tees:[{id:'default',name:'Valdir teigar',lengths}]};store.set(KEYS.custom,[...store.get(KEYS.custom,[]),c]);b.closest('.modal-backdrop').remove();render();return}
  if(b.dataset.action==='continue-setup'){const d=state.draft;if(!d.name.trim())return alert('Nafn hrings er skylda.');if(!d.course)return alert('Veldu golfvöll eða stofnaðu sérvöll.');if(!d.players.length||d.players.some(p=>!p.name.trim()))return alert('Skráðu nafn allra leikmanna.');state.view='setup';render();return}
  if(b.dataset.action==='edit-hole-data'){state.editingCourse=state.draft.course;state.view='courseConfig';render();return}
  if(b.dataset.action==='save-hole-data'){const c=state.draft.course,n=state.draft.holeCount;const pars=[...document.querySelectorAll('.cfg-par')].map(x=>+x.value),sis=[...document.querySelectorAll('.cfg-si')].map(x=>+x.value),lens=[...document.querySelectorAll('.cfg-len')].map(x=>+x.value);if(new Set(sis).size!==n)return alert('HCP-röðin þarf að vera án endurtekninga.');c.pars=pars;c.sis=sis;const t=c.tees.find(x=>x.id===state.draft.teeId)||c.tees[0];t.lengths=lens;state.view='setup';render();return}
  if(b.dataset.action==='start-round'){state.draft.teeId=$('#tee-select')?.value||state.draft.teeId;state.active=createRound();store.set(KEYS.active,state.active);state.view='play';render();return}
  if(b.dataset.score){const i=state.active.currentHole,pid=b.dataset.player;state.active.scores[i][pid]=Math.max(1,state.active.scores[i][pid]+(b.dataset.score==='plus'?1:-1));store.set(KEYS.active,state.active);render();return}
  if(b.dataset.action==='prev-hole'){state.active.currentHole=Math.max(0,state.active.currentHole-1);store.set(KEYS.active,state.active);render();return}
  if(b.dataset.action==='next-hole'){if(state.active.currentHole===state.active.holeCount-1){finishRound()}else{state.active.currentHole++;store.set(KEYS.active,state.active);render()}return}
  if(b.dataset.openRound){state.selectedRound=rounds().find(r=>r.id===b.dataset.openRound);state.view='summary';render();return}
  if(b.dataset.action==='share-result'){shareResult(state.selectedRound);return}
  if(b.dataset.action==='delete-round'){if(confirm('Eyða þessum hring?')){store.set(KEYS.rounds,rounds().filter(r=>r.id!==state.selectedRound.id));state.selectedRound=null;state.view='history';render()}return}
  if(b.dataset.action==='save-player'){const name=$('#saved-player-name').value.trim(),handicap=Math.max(0,Math.round(Number($('#saved-player-hcp').value)||0));if(!name)return alert('Skráðu nafn.');store.set(KEYS.players,[...savedPlayers(),{id:uid(),name,handicap}].slice(-20));render();return}
  if(b.dataset.deletePlayer){store.set(KEYS.players,savedPlayers().filter(p=>p.id!==b.dataset.deletePlayer));render();return}
});
document.addEventListener('change',e=>{if(e.target.id==='tee-select'&&state.draft)state.draft.teeId=e.target.value});

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
render();
