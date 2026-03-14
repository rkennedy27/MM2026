/* ── Matchup Predictor ──────────────────────────────────────────────────── */

// Data is loaded via <script> tags as window.TEAMS_DATA / window.MATCHUPS_DATA

let teams = [];
let matchups = {};
let selectedA = null;
let selectedB = null;

// ── Tab switching ─────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

// ── Load data ─────────────────────────────────────────────────────────────
function loadData() {
  teams    = window.TEAMS_DATA    || [];
  matchups = window.MATCHUPS_DATA || {};
  initSelectors();
}

// ── Team selectors ────────────────────────────────────────────────────────
function initSelectors() {
  setupSelector('a', teams, onTeamSelect);
  setupSelector('b', teams, onTeamSelect);
  document.getElementById('swap-btn').addEventListener('click', swapTeams);
}

function setupSelector(side, teamList, onChange) {
  const input = document.getElementById(`search-${side}`);
  const dropdown = document.getElementById(`dropdown-${side}`);

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    renderDropdown(dropdown, teamList.filter(t =>
      t.name.toLowerCase().includes(q)
    ), side, onChange);
    dropdown.classList.toggle('open', q.length > 0);
  });

  input.addEventListener('focus', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length > 0) dropdown.classList.add('open');
  });

  document.addEventListener('click', e => {
    if (!input.closest('.team-selector').contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  // Keyboard navigation
  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('.dropdown-item');
    let focused = dropdown.querySelector('.dropdown-item.focused');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!focused) { items[0]?.classList.add('focused'); }
      else {
        focused.classList.remove('focused');
        const next = focused.nextElementSibling;
        if (next) next.classList.add('focused');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focused) {
        focused.classList.remove('focused');
        const prev = focused.previousElementSibling;
        if (prev) prev.classList.add('focused');
      }
    } else if (e.key === 'Enter') {
      if (focused) focused.click();
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('open');
    }
  });
}

function renderDropdown(dropdown, filtered, side, onChange) {
  dropdown.innerHTML = '';
  if (filtered.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-empty">No teams found</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  filtered.slice(0, 80).forEach(team => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.textContent = team.name;
    item.addEventListener('click', () => {
      onChange(side, team);
      dropdown.classList.remove('open');
      document.getElementById(`search-${side}`).value = '';
    });
    frag.appendChild(item);
  });
  dropdown.appendChild(frag);
}

function onTeamSelect(side, team) {
  if (side === 'a') selectedA = team;
  else selectedB = team;
  renderPill(side, team);
  renderResult();
}

function renderPill(side, team) {
  const el = document.getElementById(`selected-${side}`);
  el.innerHTML = `<div class="team-pill filled">${team.name}</div>`;
}

function swapTeams() {
  if (!selectedA && !selectedB) return;
  const tmp = selectedA;
  selectedA = selectedB;
  selectedB = tmp;
  if (selectedA) renderPill('a', selectedA);
  else document.getElementById('selected-a').innerHTML = '<div class="team-pill empty">No team selected</div>';
  if (selectedB) renderPill('b', selectedB);
  else document.getElementById('selected-b').innerHTML = '<div class="team-pill empty">No team selected</div>';
  renderResult();
}

// ── Result rendering ──────────────────────────────────────────────────────
function renderResult() {
  const card = document.getElementById('result-card');
  if (!selectedA || !selectedB) {
    card.innerHTML = `<div class="result-placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
      <p>Select two teams above to see the prediction</p>
    </div>`;
    return;
  }
  if (selectedA.id === selectedB.id) {
    card.innerHTML = `<div class="result-placeholder"><p>Select two different teams</p></div>`;
    return;
  }

  const loId = Math.min(selectedA.id, selectedB.id);
  const hiId = Math.max(selectedA.id, selectedB.id);
  const key = `${loId}_${hiId}`;
  const entry = matchups[key];

  // MATCHUPS_DATA is [prob, spread, total]
  let probA, spreadA, total;
  if (entry != null && Array.isArray(entry)) {
    const [prob, spread, tot] = entry;
    probA = (selectedA.id === loId) ? prob : (1 - prob);
    spreadA = (selectedA.id === loId) ? spread : -spread;
    total = tot;
  } else {
    probA = 0.5;
    spreadA = 0;
    total = 0;
  }
  const probB = 1 - probA;

  const winnerIsA = probA >= probB;
  const pctA = (probA * 100).toFixed(1);
  const pctB = (probB * 100).toFixed(1);

  card.innerHTML = `
    <div class="result-filled">
      <div class="result-teams">
        <div class="result-team ${winnerIsA ? 'winner' : 'loser'}">
          <div class="result-team-name">${selectedA.name}</div>
          <div class="result-team-prob">${pctA}%</div>
          <div class="result-team-label">Win Probability</div>
          ${winnerIsA ? '<div class="winner-badge">🏆 Predicted Winner</div>' : ''}
        </div>
        <div class="result-divider"></div>
        <div class="result-team ${!winnerIsA ? 'winner' : 'loser'}">
          <div class="result-team-name">${selectedB.name}</div>
          <div class="result-team-prob">${pctB}%</div>
          <div class="result-team-label">Win Probability</div>
          ${!winnerIsA ? '<div class="winner-badge">🏆 Predicted Winner</div>' : ''}
        </div>
      </div>

      <div class="result-stats">
        <div class="result-stat">
          <div class="result-stat-label">Predicted Spread</div>
          <div class="result-stat-value">${spreadA > 0 ? '+' : ''}${spreadA.toFixed(1)}</div>
          <div class="result-stat-sub">${selectedA.name} ${spreadA <= 0 ? 'favored' : 'underdog'}</div>
        </div>
        <div class="result-stat-divider"></div>
        <div class="result-stat">
          <div class="result-stat-label">Predicted Total</div>
          <div class="result-stat-value">${total.toFixed(1)}</div>
          <div class="result-stat-sub">Over/Under</div>
        </div>
      </div>

      <div class="result-bar-wrap">
        <div class="result-bar-labels">
          <span>${selectedA.name}</span>
          <span>${selectedB.name}</span>
        </div>
        <div class="result-bar">
          <div class="result-bar-fill" id="bar-fill" style="width: 0%"></div>
        </div>
      </div>
    </div>`;

  // Animate bar
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const fill = document.getElementById('bar-fill');
      if (fill) fill.style.width = `${pctA}%`;
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────
loadData();
