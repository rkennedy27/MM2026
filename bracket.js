/* ── Bracket Renderer ───────────────────────────────────────────────────── */
// Layout constants
const SLOT_BASE   = 80;   // px — height of one R1 slot
const REGION_H    = 640;  // px — height of one region (8 × SLOT_BASE)
const SIDE_H      = 1280; // px — two regions stacked
const CARD_W      = 160;  // px — game card width
const CONN_W      = 20;   // px — SVG connector strip width
const COL_W       = CARD_W + CONN_W; // 180px total column width

const ROUND_NAMES_LEFT  = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8'];
const ROUND_NAMES_RIGHT = ['Elite 8', 'Sweet 16', 'Round of 32', 'Round of 64'];

// ── Helpers ───────────────────────────────────────────────────────────────
function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function makeSVG(w, h) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.style.cssText = `position:absolute;top:0;overflow:visible;pointer-events:none;`;
  return svg;
}

function addLine(svg, x1, y1, x2, y2) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  line.setAttribute('stroke', 'rgba(100,130,220,0.22)');
  line.setAttribute('stroke-width', '1.5');
  svg.appendChild(line);
}

// ── Game Card ─────────────────────────────────────────────────────────────
function buildGameCard(game) {
  const card = el('div', 'b-game');

  const ta = game.team_a, tb = game.team_b;
  const wId = game.winner.id;
  const prob = game.pred;

  const truncate = s => s.length > 13 ? s.slice(0, 12) + '…' : s;

  const row = (team, isWin) => {
    const d = el('div', `b-team ${isWin ? 'winner' : 'loser'}`);
    const seed = el('span', 'b-seed'); seed.textContent = team.seed ?? '';
    const name = el('span', 'b-name'); name.textContent = truncate(team.name);
    d.append(seed, name);
    return d;
  };

  const bar = el('div', 'b-bar');
  const fill = el('div', 'b-bar-fill');
  fill.style.width = `${(prob * 100).toFixed(1)}%`;
  bar.appendChild(fill);

  const tooltip = el('div', 'b-game-tooltip');
  let tipText = `${game.winner.name} · ${(prob * 100).toFixed(1)}%`;
  if (game.spread != null) {
    tipText += ` · Winner by ${Math.abs(game.spread).toFixed(1)}`;
  }
  if (game.total != null) {
    tipText += ` · Total: ${game.total.toFixed(1)}`;
  }
  tooltip.textContent = tipText;

  card.append(
    row(ta, ta.id === wId),
    row(tb, tb.id === wId),
    bar,
    tooltip
  );
  return card;
}

// ── SVG Connector strip ───────────────────────────────────────────────────
// Draws bracket connectors on the right side of a region-half column.
// Each pair of game slots merges into one slot in the next round.
// side: 'left' = connectors go right; 'right' = connectors go left
function buildConnectorSVG(gameCount, regionOffset, side) {
  const slotH = REGION_H / gameCount;
  const svg = makeSVG(CONN_W, SIDE_H);

  // Position: for left-side, sits at right edge of game cards (x = CARD_W)
  //           for right-side, sits at left edge (x = 0)
  if (side === 'left') {
    svg.style.left = `${CARD_W}px`;
  } else {
    svg.style.left = '0';
  }

  const mid = CONN_W / 2; // 10px — the vertical bar position

  for (let i = 0; i < gameCount; i += 2) {
    const y1   = regionOffset + (i + 0.5) * slotH;
    const y2   = regionOffset + (i + 1.5) * slotH;
    const yMid = regionOffset + (i + 1)   * slotH;

    if (side === 'left') {
      addLine(svg, 0,   y1,   mid, y1);    // top stub  →
      addLine(svg, 0,   y2,   mid, y2);    // bot stub  →
      addLine(svg, mid, y1,   mid, y2);    // vertical  |
      addLine(svg, mid, yMid, CONN_W, yMid); // exit   →
    } else {
      addLine(svg, CONN_W, y1,   mid, y1);    // top stub ←
      addLine(svg, CONN_W, y2,   mid, y2);    // bot stub ←
      addLine(svg, mid,    y1,   mid, y2);    // vertical |
      addLine(svg, mid,    yMid, 0,   yMid);  // exit     ←
    }
  }

  return svg;
}

// ── Build one round column (spans both regions, 1280px tall) ──────────────
// regionA = top region, regionB = bottom region
// roundIdx: 0=R64, 1=R32, 2=S16, 3=E8
// side: 'left' | 'right'
function buildRoundCol(regionA, regionB, roundIdx, side, isOutermost) {
  const col = el('div', `round-col ${side === 'right' ? 'right-side' : ''}`);
  col.style.position = 'relative';
  col.style.height   = `${SIDE_H}px`;

  // Round label (only on outermost columns)
  if (isOutermost) {
    const lbl = el('div', 'round-col-label');
    lbl.textContent = side === 'left' ? ROUND_NAMES_LEFT[roundIdx] : ROUND_NAMES_LEFT[roundIdx];
    col.appendChild(lbl);
  }

  // Connector SVG (all rounds except E8 which feeds into center)
  const isE8 = (roundIdx === 3);
  const gameCount = regionA.rounds[roundIdx].games.length; // 8,4,2,1
  const needsConnector = !isE8 && gameCount > 1;

  if (needsConnector) {
    col.appendChild(buildConnectorSVG(gameCount, 0,         side)); // top region
    col.appendChild(buildConnectorSVG(gameCount, REGION_H,  side)); // bottom region
  }

  // Top region-half games
  col.appendChild(buildRegionHalf(regionA, roundIdx, regionA.region));
  col.appendChild(buildRegionHalf(regionB, roundIdx, regionB.region));

  return col;
}

// ── Build a region-half (640px) with game slots ───────────────────────────
function buildRegionHalf(regionData, roundIdx, regionName) {
  const half = el('div', 'region-half');

  const round  = regionData.rounds[roundIdx];
  const N      = round.games.length;
  const slotH  = REGION_H / N;

  // Region label on outermost round only (R64 for left, R64 for right)
  if (roundIdx === 0) {
    const lbl = el('div', 'region-half-label');
    lbl.textContent = regionName.toUpperCase();
    half.appendChild(lbl);
  }

  round.games.forEach(game => {
    const slot = el('div', 'game-slot');
    slot.style.height = `${slotH}px`;
    slot.appendChild(buildGameCard(game));
    half.appendChild(slot);
  });

  return half;
}

// ── Build one side (left or right) ───────────────────────────────────────
// regionA = top region, regionB = bottom region
// left side:  rounds appear L→R as R64, R32, S16, E8
// right side: rounds appear L→R as E8, S16, R32, R64 (mirrored)
function buildSide(regionA, regionB, side) {
  const sideEl = el('div', 'bracket-side');

  const roundOrder = side === 'left'
    ? [0, 1, 2, 3]   // R64 → E8
    : [3, 2, 1, 0];  // E8  → R64 (mirrored visual)

  roundOrder.forEach((rIdx, colIdx) => {
    const isOutermost = (side === 'left' && colIdx === 0)
                     || (side === 'right' && colIdx === 3);
    const col = buildRoundCol(regionA, regionB, rIdx, side, isOutermost);

    // Label every column
    const lbl = el('div', 'round-col-label');
    lbl.textContent = ROUND_NAMES_LEFT[rIdx];
    col.appendChild(lbl);

    sideEl.appendChild(col);
  });

  return sideEl;
}

// ── Center column ─────────────────────────────────────────────────────────
// Items are absolutely positioned to align with E8 game centers:
//   FF1        at y = REGION_H/2        = 320  (East E8 center)
//   Championship at y = REGION_H        = 640  (midpoint / true center)
//   FF2        at y = REGION_H * 1.5    = 960  (Midwest E8 center)
//   Champion card below FF2             = 1060
function buildCenter(bracket) {
  const center = el('div', 'bracket-center');

  const buildCenterGame = (game, isChamp) => {
    const card = el('div', `center-game ${isChamp ? 'champ-game' : ''}`);
    const ta = game.team_a, tb = game.team_b;
    const wId = game.winner.id;
    const prob = game.pred;
    const row = (team, isWin) => {
      const d = el('div', `b-team ${isWin ? 'winner' : 'loser'}`);
      const name = el('span', 'b-name'); name.textContent = team.name;
      d.appendChild(name);
      return d;
    };
    const bar = el('div', 'b-bar');
    const fill = el('div', 'b-bar-fill');
    fill.style.width = `${(prob * 100).toFixed(1)}%`;
    bar.appendChild(fill);
    card.append(row(ta, ta.id === wId), row(tb, tb.id === wId), bar);
    return card;
  };

  // Place a label + game card so the group is centered at targetY
  const CARD_H = 77; // center-game card height (~34+34+3+borders)
  const LBL_H  = 18;
  const GROUP_H = LBL_H + 5 + CARD_H; // label + gap + card

  const placeGroup = (labelText, gameEl, targetY) => {
    const wrap = el('div', '');
    wrap.style.cssText = `position:absolute;left:0;right:0;padding:0 16px;top:${targetY - GROUP_H / 2}px;`;
    const lbl = el('div', 'center-section-label');
    lbl.textContent = labelText;
    lbl.style.marginBottom = '5px';
    wrap.append(lbl, gameEl);
    center.appendChild(wrap);
  };

  placeGroup('Final Four',   buildCenterGame(bracket.final_four.games[0],    false), REGION_H / 2);       // 320
  placeGroup('Championship', buildCenterGame(bracket.championship.games[0],  true),  REGION_H);            // 640
  placeGroup('Final Four',   buildCenterGame(bracket.final_four.games[1],    false), REGION_H * 1.5);     // 960

  // Champion card — anchored below FF2
  const champWrap = el('div', '');
  // Position right below the Championship game card (centered at REGION_H=640)
  champWrap.style.cssText = `position:absolute;left:0;right:0;padding:0 16px;top:${REGION_H + Math.ceil(GROUP_H / 2) + 8}px;`;
  const card = el('div', 'champion-card');
  const trophy = el('span', 'champion-trophy'); trophy.textContent = '🏆';
  const clbl  = el('div', 'champion-label'); clbl.textContent = 'Predicted Champion';
  const cname = el('div', 'champion-name'); cname.textContent = bracket.champion.name;
  card.append(trophy, clbl, cname);
  champWrap.appendChild(card);
  center.appendChild(champWrap);

  return center;
}

// ── Main render ───────────────────────────────────────────────────────────
function renderBracket(bracket, wrapper) {
  wrapper.innerHTML = '';

  // bracket.regions: [0]=East, [1]=West, [2]=South, [3]=Midwest
  const [east, west, south, midwest] = bracket.regions;

  // Left side:  East (top) + West (bottom), rounds flow left→right
  // Right side: South (top) + Midwest (bottom), rounds flow right→left
  wrapper.appendChild(buildSide(east,  west,    'left'));
  wrapper.appendChild(buildCenter(bracket));
  wrapper.appendChild(buildSide(south, midwest, 'right'));

  // Champion banner in the bracket header
  const banner = document.getElementById('champion-banner');
  if (banner && bracket.champion) {
    banner.innerHTML = `🏆 Predicted Champion: <strong>${bracket.champion.name}</strong>`;
  }
}

// ── Load + lazy init ──────────────────────────────────────────────────────
function loadBracket() {
  const wrapper = document.getElementById('bracket-wrapper');
  if (!window.BRACKET_DATA) {
    wrapper.innerHTML = `<div class="bracket-loading">Bracket data not found.<br><small>Run Code/build_web_data.py to generate assets.</small></div>`;
    return;
  }
  renderBracket(window.BRACKET_DATA, wrapper);
}

let bracketLoaded = false;
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'bracket' && !bracketLoaded) {
      bracketLoaded = true;
      loadBracket();
    }
  });
});
