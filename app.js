'use strict';

const HOLES = 18;
const STORAGE_KEY = 'golfskor-pwa-v2';

const defaultState = () => ({
  started: false,
  course: '',
  currentHole: 0,
  players: [],
  scores: Array.from({ length: HOLES }, () => [])
});

let state = loadState();
const $ = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return defaultState();
    return { ...defaultState(), ...saved };
  } catch (_) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  })[char]);
}

function formatWins(value) {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString('is-IS', { maximumFractionDigits: 2 });
}

function buildPlayerInputs() {
  const count = Number($('playerCount').value);
  const root = $('playerInputs');
  root.innerHTML = '';

  for (let i = 0; i < count; i += 1) {
    const label = document.createElement('label');
    label.className = 'player-label';
    label.textContent = `Golfari ${i + 1}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Nafn golfara ${i + 1}`;
    input.maxLength = 30;
    input.autocomplete = 'off';
    input.value = state.players[i]?.name || '';

    label.appendChild(input);
    root.appendChild(label);
  }
}

function startRound() {
  const playerFields = [...$('playerInputs').querySelectorAll('input')];
  if (!playerFields.length) {
    buildPlayerInputs();
    return;
  }

  const names = playerFields.map((input, index) => input.value.trim() || `Golfari ${index + 1}`);
  state = {
    started: true,
    course: $('courseName').value.trim(),
    currentHole: 0,
    players: names.map((name, id) => ({ id, name })),
    scores: Array.from({ length: HOLES }, () => Array(names.length).fill(null))
  };
  saveState();
  render();
  window.scrollTo({ top: 0 });
}

function resetRound() {
  if (!state.started || window.confirm('Viltu eyða núverandi hring og byrja upp á nýtt?')) {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    $('courseName').value = '';
    $('playerCount').value = '2';
    buildPlayerInputs();
    render();
  }
}

function render() {
  $('setupView').classList.toggle('hidden', state.started);
  $('gameView').classList.toggle('hidden', !state.started);
  if (!state.started) return;

  $('courseLabel').textContent = state.course || 'Golfhringur';
  $('holeTitle').textContent = `Hola ${state.currentHole + 1} af ${HOLES}`;
  $('holePill').textContent = String(state.currentHole + 1);
  $('prevBtn').disabled = state.currentHole === 0;
  $('nextBtn').textContent = state.currentHole === HOLES - 1 ? 'Ljúka hring' : 'Vista og næsta';

  renderScoreInputs();
  renderLeaderboard();
}

function renderScoreInputs() {
  const root = $('scoreInputs');
  root.innerHTML = '';

  state.players.forEach((player, playerIndex) => {
    const row = document.createElement('div');
    row.className = 'score-row';

    const name = document.createElement('div');
    name.className = 'score-name';
    name.textContent = player.name;

    const counter = document.createElement('div');
    counter.className = 'counter';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.setAttribute('aria-label', `Fækka höggum hjá ${player.name}`);
    minus.textContent = '−';

    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '1';
    input.max = '30';
    input.setAttribute('aria-label', `Högg hjá ${player.name}`);
    input.value = state.scores[state.currentHole]?.[playerIndex] ?? 4;

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.setAttribute('aria-label', `Fjölga höggum hjá ${player.name}`);
    plus.textContent = '+';

    const commit = (value) => {
      const safe = Math.max(1, Math.min(30, Number(value) || 1));
      input.value = String(safe);
      state.scores[state.currentHole][playerIndex] = safe;
      saveState();
      renderLeaderboard();
    };

    minus.addEventListener('click', () => commit(Number(input.value) - 1));
    plus.addEventListener('click', () => commit(Number(input.value) + 1));
    input.addEventListener('change', () => commit(input.value));

    counter.append(minus, input, plus);
    row.append(name, counter);
    root.appendChild(row);
  });
}

function commitCurrentHole() {
  const inputs = [...$('scoreInputs').querySelectorAll('input')];
  inputs.forEach((input, index) => {
    state.scores[state.currentHole][index] = Math.max(1, Math.min(30, Number(input.value) || 1));
  });
  saveState();
}

function calculateResults() {
  const result = state.players.map((player, playerIndex) => ({
    ...player,
    total: state.scores.reduce((sum, hole) => sum + (Number.isFinite(hole[playerIndex]) ? hole[playerIndex] : 0), 0),
    wins: 0
  }));

  let droppedHoles = 0;
  let splitHoles = 0;
  let completed = 0;

  state.scores.forEach((hole) => {
    const complete = hole.length === state.players.length && hole.every(Number.isFinite);
    if (!complete) return;

    completed += 1;
    const lowest = Math.min(...hole);
    const winners = hole
      .map((score, index) => (score === lowest ? index : -1))
      .filter((index) => index >= 0);

    if (winners.length === state.players.length) {
      droppedHoles += 1;
      return;
    }

    const share = 1 / winners.length;
    winners.forEach((index) => { result[index].wins += share; });
    if (winners.length > 1) splitHoles += 1;
  });

  return { result, completed, droppedHoles, splitHoles };
}

function renderLeaderboard() {
  const { result, completed, droppedHoles, splitHoles } = calculateResults();
  $('completedLabel').textContent = `${completed} ${completed === 1 ? 'hola skráð' : 'holur skráðar'}`;

  const playersWithScores = result.filter((player) => player.total > 0);
  const minTotal = playersWithScores.length ? Math.min(...playersWithScores.map((player) => player.total)) : null;
  const totalLeaders = minTotal === null ? [] : playersWithScores.filter((player) => player.total === minTotal);
  const maxWins = result.length ? Math.max(...result.map((player) => player.wins)) : 0;
  const holeLeaders = maxWins > 0 ? result.filter((player) => Math.abs(player.wins - maxWins) < 0.0001) : [];

  $('leaderSummary').innerHTML = `
    <div class="summary-card">
      <span class="muted">Fæst heildarhögg</span>
      <strong>${totalLeaders.length ? `${totalLeaders.map((p) => escapeHtml(p.name)).join(', ')} – ${minTotal}` : 'Engin skor enn'}</strong>
    </div>
    <div class="summary-card">
      <span class="muted">Flestir holusigrar</span>
      <strong>${holeLeaders.length ? `${holeLeaders.map((p) => escapeHtml(p.name)).join(', ')} – ${formatWins(maxWins)}` : 'Enginn enn'}</strong>
    </div>
  `;

  $('leaderboard').innerHTML = [...result]
    .sort((a, b) => a.total - b.total || b.wins - a.wins)
    .map((player) => `<tr><td>${escapeHtml(player.name)}</td><td>${player.total}</td><td>${formatWins(player.wins)}</td></tr>`)
    .join('');

  $('finalView').classList.toggle('hidden', completed !== HOLES);
  if (completed === HOLES) renderFinal(result, droppedHoles, splitHoles);
}

function renderFinal(result, droppedHoles, splitHoles) {
  const minTotal = Math.min(...result.map((player) => player.total));
  const strokeWinners = result.filter((player) => player.total === minTotal);
  const maxWins = Math.max(...result.map((player) => player.wins));
  const matchWinners = result.filter((player) => Math.abs(player.wins - maxWins) < 0.0001);

  $('finalSummary').innerHTML = `
    <div class="winner-card"><strong>Sigurvegari í höggleik</strong><br>${strokeWinners.map((p) => escapeHtml(p.name)).join(', ')} – ${minTotal} högg</div>
    <div class="winner-card"><strong>Flestir holusigrar</strong><br>${matchWinners.map((p) => escapeHtml(p.name)).join(', ')} – ${formatWins(maxWins)}</div>
    <div class="summary-grid">
      <div class="summary-card"><span class="muted">Skiptir sigrar</span><strong>${splitHoles}</strong></div>
      <div class="summary-card"><span class="muted">Holur felldar niður</span><strong>${droppedHoles}</strong></div>
    </div>
  `;
}

function initialize() {
  $('playerCount').addEventListener('change', buildPlayerInputs);
  $('startBtn').addEventListener('click', startRound);
  $('resetBtn').addEventListener('click', resetRound);
  $('prevBtn').addEventListener('click', () => {
    commitCurrentHole();
    state.currentHole = Math.max(0, state.currentHole - 1);
    saveState();
    render();
  });
  $('nextBtn').addEventListener('click', () => {
    commitCurrentHole();
    if (state.currentHole < HOLES - 1) state.currentHole += 1;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  buildPlayerInputs();
  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

document.addEventListener('DOMContentLoaded', initialize);
