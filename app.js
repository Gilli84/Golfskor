const STORAGE = {
  current: 'golfskor_current_v3',
  history: 'golfskor_history_v3'
};

const state = {
  view: 'home',
  setup: { name: '', holes: 18, playerCount: 2, players: ['', ''] },
  current: null,
  selectedRound: null,
  error: ''
};

const app = document.getElementById('app');

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('is-IS', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

function formatWins(n) {
  if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
  return n.toLocaleString('is-IS', { maximumFractionDigits: 2 });
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE.history)) || []; }
  catch { return []; }
}

function saveHistory(round) {
  const existing = getHistory().filter(r => r.id !== round.id);
  const next = [round, ...existing].slice(0, 5);
  localStorage.setItem(STORAGE.history, JSON.stringify(next));
}

function saveCurrent() {
  if (state.current) localStorage.setItem(STORAGE.current, JSON.stringify(state.current));
  else localStorage.removeItem(STORAGE.current);
}

function restoreCurrent() {
  try { return JSON.parse(localStorage.getItem(STORAGE.current)); }
  catch { return null; }
}

function roundTotals(round) {
  return round.players.map((player, i) => ({
    name: player,
    total: round.scores.reduce((sum, hole) => sum + (Number(hole[i]) || 0), 0),
    wins: holeWins(round)[i]
  }));
}

function holeWins(round) {
  const wins = Array(round.players.length).fill(0);
  round.scores.forEach(hole => {
    const vals = hole.map(Number);
    if (vals.some(v => !Number.isFinite(v) || v <= 0)) return;
    const min = Math.min(...vals);
    const winners = vals.map((v, i) => v === min ? i : -1).filter(i => i >= 0);
    if (winners.length === round.players.length) return;
    const share = 1 / winners.length;
    winners.forEach(i => wins[i] += share);
  });
  return wins;
}

function completedHoles(round) {
  return round.scores.filter(h => h.every(v => Number(v) > 0)).length;
}

function header(subtitle = '') {
  return `<header class="topbar"><div class="topbar-row"><div class="brand"><div class="logo-ball">⛳</div><div><h1>Golfskor</h1><small>${escapeHtml(subtitle)}</small></div></div></div></header>`;
}

function shell(content, subtitle = '') {
  app.innerHTML = `<div class="app-shell">${header(subtitle)}<main class="container">${content}<div class="footer-note">Gögnin vistast eingöngu í tækinu þínu.</div></main></div>`;
}

function renderHome() {
  const history = getHistory();
  const current = restoreCurrent();
  shell(`
    <section class="card hero">
      <h2>Velkomin(n) í Golfskor</h2>
      <p class="muted">Skráðu 9 eða 18 holu hring fyrir allt að fjóra leikmenn og sjáðu bæði höggleik og unnar holur.</p>
      <div class="actions">
        <button class="btn primary" id="newRound">＋ Nýr hringur</button>
        ${current ? `<button class="btn secondary" id="continueRound">Halda áfram (${completedHoles(current)}/${current.holes})</button>` : ''}
      </div>
    </section>
    <section class="card">
      <h3>Síðustu hringir</h3>
      ${history.length ? `<div class="round-list">${history.map(r => {
        const totals = roundTotals(r).sort((a,b) => a.total - b.total);
        return `<div class="round-item"><div><strong>${escapeHtml(r.name)}</strong><div class="round-meta">${formatDate(r.completedAt || r.createdAt)} · ${r.holes} holur · ${escapeHtml(totals[0]?.name || '')}: ${totals[0]?.total || 0} högg</div></div><button class="btn ghost open-round" data-id="${r.id}">Opna</button></div>`;
      }).join('')}</div>` : `<div class="empty">Enginn vistaður hringur enn.</div>`}
    </section>
  `, 'Einfalt skorkort');

  document.getElementById('newRound').onclick = () => { state.view = 'setup'; state.error = ''; render(); };
  if (current) document.getElementById('continueRound').onclick = () => { state.current = current; state.view = 'score'; render(); };
  document.querySelectorAll('.open-round').forEach(btn => btn.onclick = () => {
    state.selectedRound = history.find(r => r.id === btn.dataset.id);
    state.view = 'summary';
    render();
  });
}

function renderSetup() {
  const s = state.setup;
  s.players = s.players.slice(0, s.playerCount);
  while (s.players.length < s.playerCount) s.players.push('');
  shell(`
    <section class="card">
      <h2>Nýr hringur</h2>
      <div class="grid">
        <div class="field"><label for="roundName">Nafn hrings eða golfvallar *</label><input id="roundName" type="text" maxlength="50" placeholder="t.d. Keilir eða Föstudagsgolf" value="${escapeHtml(s.name)}"></div>
        <div><span class="section-label">Fjöldi hola</span><div class="segmented"><button data-holes="9" class="${s.holes===9?'active':''}">9 holur</button><button data-holes="18" class="${s.holes===18?'active':''}">18 holur</button></div></div>
        <div><span class="section-label">Fjöldi leikmanna</span><div class="player-count">${[1,2,3,4].map(n => `<button data-count="${n}" class="${s.playerCount===n?'active':''}">${n}</button>`).join('')}</div></div>
        <div class="grid two">${s.players.map((p,i) => `<div class="field"><label for="p${i}">Leikmaður ${i+1} *</label><input id="p${i}" class="player-name" data-index="${i}" type="text" maxlength="30" placeholder="Nafn" value="${escapeHtml(p)}"></div>`).join('')}</div>
      </div>
      ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ''}
      <div class="actions" style="margin-top:18px"><button class="btn ghost" id="backHome">Til baka</button><button class="btn primary" id="startRound">Hefja hring</button></div>
    </section>
  `, 'Nýr hringur');

  document.getElementById('roundName').oninput = e => state.setup.name = e.target.value;
  document.querySelectorAll('[data-holes]').forEach(b => b.onclick = () => { state.setup.holes = Number(b.dataset.holes); renderSetup(); });
  document.querySelectorAll('[data-count]').forEach(b => b.onclick = () => { state.setup.playerCount = Number(b.dataset.count); renderSetup(); });
  document.querySelectorAll('.player-name').forEach(inp => inp.oninput = e => state.setup.players[Number(e.target.dataset.index)] = e.target.value);
  document.getElementById('backHome').onclick = () => { state.view = 'home'; render(); };
  document.getElementById('startRound').onclick = startRound;
}

function startRound() {
  const name = state.setup.name.trim();
  const players = state.setup.players.slice(0, state.setup.playerCount).map(p => p.trim());
  if (!name) { state.error = 'Nafn hrings eða golfvallar er skylda.'; renderSetup(); return; }
  if (players.some(p => !p)) { state.error = 'Skrá þarf nafn allra leikmanna.'; renderSetup(); return; }
  if (new Set(players.map(p => p.toLowerCase())).size !== players.length) { state.error = 'Leikmenn þurfa að hafa mismunandi nöfn.'; renderSetup(); return; }
  state.current = {
    id: uid(), name, holes: state.setup.holes, players,
    scores: Array.from({length: state.setup.holes}, () => Array(players.length).fill(0)),
    currentHole: 0, createdAt: new Date().toISOString(), completedAt: null
  };
  saveCurrent(); state.view = 'score'; state.error = ''; render();
}

function liveStandings(round) {
  const totals = roundTotals(round);
  return `<table class="standings"><thead><tr><th>Leikmaður</th><th>Högg</th><th>Unnar holur</th></tr></thead><tbody>${totals.map(t => `<tr><td>${escapeHtml(t.name)}</td><td>${t.total || '–'}</td><td>${formatWins(t.wins)}</td></tr>`).join('')}</tbody></table>`;
}

function renderScore() {
  const r = state.current;
  if (!r) { state.view='home'; render(); return; }
  const h = r.currentHole;
  const complete = r.scores[h].every(v => Number(v) > 0);
  shell(`
    <section class="card">
      <div class="hole-title"><div><span class="badge">${escapeHtml(r.name)}</span><h2 style="margin:8px 0 2px">Hola ${h+1} af ${r.holes}</h2><div class="muted">${r.players.length} leikmenn</div></div><button class="btn ghost" id="exitRound">Forsíða</button></div>
      <div class="progress-wrap"><div class="progress" style="width:${((h+1)/r.holes)*100}%"></div></div>
    </section>
    <section class="card">
      ${r.players.map((p,i) => `<div class="score-row"><div class="score-name">${escapeHtml(p)}</div><div class="stepper"><button class="dec" data-i="${i}" aria-label="Minnka högg">−</button><input class="score-input" data-i="${i}" type="number" min="1" max="30" inputmode="numeric" value="${r.scores[h][i] || ''}" placeholder="–"><button class="inc" data-i="${i}" aria-label="Auka högg">＋</button></div></div>`).join('')}
      ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ''}
      <div class="actions" style="margin-top:18px"><button class="btn ghost" id="prevHole" ${h===0?'disabled':''}>← Fyrri</button><button class="btn primary" id="nextHole">${h===r.holes-1?'Ljúka hring':'Næsta →'}</button></div>
    </section>
    <section class="card"><h3>Staðan</h3>${liveStandings(r)}</section>
  `, `${r.name} · Hola ${h+1}/${r.holes}`);

  const setScore = (i, value) => {
    r.scores[h][i] = Math.max(0, Math.min(30, Number(value) || 0));
    saveCurrent();
  };
  document.querySelectorAll('.inc').forEach(b => b.onclick = () => { const i=+b.dataset.i; setScore(i, (r.scores[h][i]||0)+1); renderScore(); });
  document.querySelectorAll('.dec').forEach(b => b.onclick = () => { const i=+b.dataset.i; setScore(i, Math.max(1,(r.scores[h][i]||1)-1)); renderScore(); });
  document.querySelectorAll('.score-input').forEach(inp => inp.onchange = e => { setScore(+e.target.dataset.i, e.target.value); renderScore(); });
  document.getElementById('prevHole').onclick = () => { if(h>0){r.currentHole--; state.error=''; saveCurrent(); renderScore();} };
  document.getElementById('nextHole').onclick = () => {
    if (!r.scores[h].every(v => Number(v)>0)) { state.error='Skrá þarf högg hjá öllum leikmönnum áður en haldið er áfram.'; renderScore(); return; }
    state.error='';
    if (h === r.holes-1) finishRound(); else { r.currentHole++; saveCurrent(); renderScore(); }
  };
  document.getElementById('exitRound').onclick = () => { saveCurrent(); state.view='home'; render(); };
}

function finishRound() {
  const r = state.current;
  r.completedAt = new Date().toISOString();
  saveHistory(r);
  localStorage.removeItem(STORAGE.current);
  state.selectedRound = r;
  state.current = null;
  state.view = 'summary';
  render();
}

function rankingRows(round, mode) {
  const totals = roundTotals(round);
  const sorted = [...totals].sort((a,b) => mode==='strokes' ? a.total-b.total : b.wins-a.wins);
  return sorted.map((t,i) => `<tr class="${i===0?'leader':''}"><td>${i+1}.</td><td>${escapeHtml(t.name)}</td><td>${mode==='strokes' ? `${t.total} högg` : formatWins(t.wins)}</td></tr>`).join('');
}

function renderSummary() {
  const r = state.selectedRound;
  if (!r) { state.view='home'; render(); return; }
  const totals = roundTotals(r);
  const strokeMin = Math.min(...totals.map(t=>t.total));
  const strokeWinners = totals.filter(t=>t.total===strokeMin).map(t=>t.name);
  const maxWins = Math.max(...totals.map(t=>t.wins));
  const winWinners = totals.filter(t=>Math.abs(t.wins-maxWins)<0.0001).map(t=>t.name);
  shell(`
    <section class="card hero">
      <span class="badge">Lokið</span>
      <h2 style="margin:10px 0 4px">${escapeHtml(r.name)}</h2>
      <div class="muted">${formatDate(r.completedAt || r.createdAt)} · ${r.holes} holur · ${r.players.length} leikmenn</div>
    </section>
    <section class="card">
      <h3>Skor á öllum holum</h3>
      <div class="table-scroll"><table class="scorecard"><thead><tr><th>Hola</th>${r.players.map(p=>`<th>${escapeHtml(p)}</th>`).join('')}</tr></thead><tbody>${r.scores.map((hole,i)=>`<tr><td>${i+1}</td>${hole.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}<tr><th>Samtals</th>${totals.map(t=>`<th>${t.total}</th>`).join('')}</tr></tbody></table></div>
    </section>
    <section class="grid two">
      <div class="card"><h3>Höggleikur</h3><div class="summary-winner">${strokeWinners.length===1?'Sigurvegari':'Jafnir'}: ${escapeHtml(strokeWinners.join(' og '))}</div><table class="standings"><tbody>${rankingRows(r,'strokes')}</tbody></table></div>
      <div class="card"><h3>Unnar holur</h3><div class="summary-winner">${winWinners.length===1?'Sigurvegari':'Jafnir'}: ${escapeHtml(winWinners.join(' og '))}</div><table class="standings"><tbody>${rankingRows(r,'wins')}</tbody></table><p class="muted" style="font-size:.85rem">Tveir jafnir fá ½ hvor, þrír fá ⅓ hver. Ef allir eru jafnir fellur holan niður.</p></div>
    </section>
    <section class="card"><div class="actions"><button class="btn primary" id="homeBtn">Forsíða</button><button class="btn secondary" id="newBtn">Nýr hringur</button><button class="btn danger" id="deleteBtn">Eyða þessum hring</button></div></section>
  `, 'Samantekt');

  document.getElementById('homeBtn').onclick = () => { state.view='home'; render(); };
  document.getElementById('newBtn').onclick = () => { state.setup={name:'',holes:18,playerCount:r.players.length,players:[...r.players]}; state.view='setup'; render(); };
  document.getElementById('deleteBtn').onclick = () => {
    if (confirm('Ertu viss um að þú viljir eyða þessum hring?')) {
      const next = getHistory().filter(x=>x.id!==r.id);
      localStorage.setItem(STORAGE.history, JSON.stringify(next));
      state.selectedRound=null; state.view='home'; render();
    }
  };
}

function render() {
  if (state.view==='home') renderHome();
  else if (state.view==='setup') renderSetup();
  else if (state.view==='score') renderScore();
  else if (state.view==='summary') renderSummary();
}

window.addEventListener('load', () => {
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
});
