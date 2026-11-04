// Vacations: send the goblin away for a few real minutes. It sends a postcard!
import { h, button, modal, toast, modalOpen, closePanel } from '../ui.js';
import { sfx } from '../audio.js';
import { DESTINATIONS, LINES, pick, writePostcard } from '../lines.js';
import { track } from '../track.js';

// ---------- pixel postcard scenes (160 x 100) ----------
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296;
}

export function drawScene(canvas, destId, seed = 1, skin = '#6cbf3c') {
  const W = 160, H = 100;
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const d = DESTINATIONS.find((x) => x.id === destId) || DESTINATIONS[0];
  const r = rng(seed * 7919 + destId.length);
  const R = (x, y, w, hh, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(hh)); };
  const circ = (cx, cy, rad, c) => { for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad) R(cx + x, cy + y, 1, 1, c); };

  // dithered sky
  for (let y = 0; y < 70; y++) for (let x = 0; x < W; x++) {
    const t = y / 70 + ((x + y) % 2 ? 0.04 : -0.04);
    R(x, y, 1, 1, t < 0.5 ? d.sky[0] : d.sky[1]);
  }
  const ground = (y0, c) => R(0, y0, W, H - y0, c);

  if (d.id === 'sock') {
    circ(130, 18, 9, '#fff3a0');
    R(0, 58, W, 14, '#3fa0e0'); for (let x = 0; x < W; x += 6) R(x + (r() * 3 | 0), 60 + (r() * 8 | 0), 3, 1, '#bfefff');
    ground(72, d.ground);
    const cols = ['#ff86b8', '#4fd1ff', '#ffe14d', '#8fdc3a', '#ffffff', '#ff6a3a'];
    for (let i = 0; i < 9; i++) { const x = r() * 150, y = 76 + r() * 18, c = cols[i % 6]; R(x, y, 3, 6, c); R(x, y + 5, 6, 3, c); }
    R(20, 40, 3, 32, '#8a5a2a'); for (let i = 0; i < 4; i++) R(10 + i * 4, 36 - i, 10, 3, '#3a9a3a');
  } else if (d.id === 'sewer') {
    R(0, 0, W, 70, '#2a3a2a');
    for (let y = 0; y < 70; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < W; x += 12) R(x, y, 11, 5, '#3d523a');
    circ(80, 70, 52, '#101810'); circ(80, 70, 44, '#1a281a');
    ground(70, '#4a6a1a');
    for (let x = 0; x < W; x += 5) R(x, 70 + (r() * 3 | 0), 3, 1, '#8fdc3a');
    R(50, 64, 50, 8, '#8a5a2a'); R(56, 60, 38, 4, '#c9a227'); R(74, 46, 2, 14, '#ddd'); R(76, 46, 12, 8, '#e8344a');
    R(110, 78, 10, 5, '#8a8a96'); R(118, 76, 4, 4, '#8a8a96'); R(121, 77, 1, 1, '#e8344a'); R(104, 80, 6, 1, '#e88a9e');
  } else if (d.id === 'volcano') {
    ground(72, d.ground);
    for (let y = 0; y < 50; y++) { const w = 10 + y * 1.7; R(95 - w / 2, 22 + y, w, 1, y % 5 ? '#6a3020' : '#5a2618'); }
    R(88, 18, 14, 6, '#ff3b1f'); for (let i = 0; i < 12; i++) R(80 + r() * 30, 4 + r() * 14, 3, 3, ['#ff3b1f', '#ffe14d', '#ff8a1f'][i % 3]);
    for (let y = 24; y < 72; y += 2) R(94 + Math.sin(y / 4) * 3, y, 3, 2, '#ff8a1f');
    R(10, 78, 50, 12, '#ff6a2a'); R(14, 80, 42, 8, '#ffb03a');
    for (let i = 0; i < 6; i++) circ(18 + i * 7, 79, 2, '#ffe0a0');
  } else if (d.id === 'cheese') {
    ground(70, '#c98a1a');
    const mtn = (cx, w, hh, c) => { for (let y = 0; y < hh; y++) R(cx - (w * y) / hh / 2, 70 - hh + y, (w * y) / hh, 1, c); };
    mtn(40, 90, 50, '#f5c542'); mtn(115, 110, 60, '#ffd65a'); mtn(80, 60, 34, '#f0b832');
    for (let i = 0; i < 14; i++) circ(20 + r() * 130, 40 + r() * 40, 1 + (r() * 3 | 0), '#c99a20');
    for (let i = 0; i < 6; i++) R(r() * 150, 74 + r() * 20, 4, 2, '#6bbf3a');
  } else if (d.id === 'moon') {
    for (let i = 0; i < 40; i++) R(r() * W, r() * 60, 1, 1, '#ffffff');
    circ(130, 20, 10, '#3f8fe0'); R(124, 16, 6, 4, '#4fbf4a'); R(132, 22, 5, 3, '#4fbf4a');
    ground(66, d.ground);
    for (let i = 0; i < 7; i++) { const x = r() * 150, y = 72 + r() * 22; R(x, y, 10, 3, '#9a9aac'); R(x + 2, y + 1, 6, 1, '#7a7a8c'); }
    const junk = ['#e8344a', '#ffe14d', '#4fd1ff', '#8a5a2a', '#ffffff'];
    for (let i = 0; i < 8; i++) R(20 + r() * 120, 60 + r() * 10, 4 + r() * 6, 3 + r() * 5, junk[i % 5]);
  }

  // The goblin, waving, in sunglasses
  const gx = d.id === 'volcano' ? 30 : 30 + (r() * 10 | 0), gy = d.id === 'volcano' ? 64 : 62;
  R(gx, gy, 14, 12, skin); R(gx - 6, gy + 3, 6, 3, skin); R(gx + 14, gy + 3, 6, 3, skin); R(gx - 8, gy + 2, 3, 2, skin); R(gx + 19, gy + 2, 3, 2, skin);
  R(gx + 2, gy + 3, 4, 3, '#1b1020'); R(gx + 8, gy + 3, 4, 3, '#1b1020'); R(gx + 6, gy + 3, 2, 1, '#1b1020');
  R(gx + 3, gy + 8, 8, 2, '#1b1020'); R(gx + 4, gy + 8, 1, 1, '#fff'); R(gx + 9, gy + 8, 1, 1, '#fff');
  if (d.id !== 'volcano') {
    R(gx + 2, gy + 12, 10, 10, skin); R(gx + 12, gy + 6, 2, 8, skin); R(gx + 3, gy + 15, 8, 4, d.accent);
  }
  // Big title
  g.font = '8px "Press Start 2P", monospace';
  g.textBaseline = 'top';
  const title = d.name.toUpperCase();
  g.fillStyle = '#1b1020'; g.fillText(title, 6, 6); g.fillText(title, 5, 7);
  g.fillStyle = '#fff'; g.fillText(title, 5, 6);
  return canvas;
}

// ---------- picking a destination ----------
export function openVacation(game) {
  const s = game.state;
  closePanel();
  const list = h('div', {});
  const m = modal(h('div', {}, h('h2', {}, `Where should ${s.gobName} go?`), h('p', {}, `It costs coins and ${s.gobName} will be gone for a few minutes. Hunger and stuff won't go down while away. You'll get a postcard!`), list));
  for (const d of DESTINATIONS) {
    const cv = drawScene(document.createElement('canvas'), d.id, 3, s.skin);
    list.append(h('div', { class: 'dest', onclick: () => { m.close(); leave(game, d); } },
      cv,
      h('div', { class: 'info' }, h('h3', {}, d.name), h('p', {}, d.desc), h('div', { class: 'meta' }, `${d.cost}¢ • ${d.minutes} min`))));
  }
}

async function leave(game, d) {
  const { goblin, world, S } = game;
  const s = game.state;
  if (s.coins < d.cost) {
    sfx.wrong(); goblin.act('shakeNo'); game.line('broke', 2.5);
    return;
  }
  S.addCoins(-d.cost);
  track('vacation', d.id, d.cost);
  game.line('vacationLeave', 2.5);
  goblin.emote('ecstatic', 3);
  goblin.act('wave');
  await game.wait(1.6);
  sfx.whoosh();
  goblin.act('spin');
  await new Promise((res) => game.tween(0.7, (p) => { goblin.object.position.y = p * p * 90; }, res));
  goblin.object.visible = false;
  goblin.object.position.y = 0;
  s.vacation = { id: d.id, name: d.name, start: Date.now(), end: Date.now() + d.minutes * 60000 };
  S.save();
  if (game.screen === game.screens.home) game.go('home');
}

// Called every second.
export function checkVacation(game) {
  const s = game.state;
  if (s.vacation && Date.now() >= s.vacation.end) {
    const d = DESTINATIONS.find((x) => x.id === s.vacation.id) || DESTINATIONS[0];
    const card = { dest: d.id, date: Date.now(), seed: Math.floor(Math.random() * 1e6), ...writePostcard(d, game.vars()), unread: true };
    s.postcards.unshift(card);
    s.vacation = null;
    s.stats.fun = 100;
    const souvenir = 5 + Math.floor(Math.random() * 11);
    s.coins += souvenir;
    card.souvenir = souvenir;
    s.returning = true;
    game.S.save();
  }
  if (s.returning && game.screen === game.screens.home && !modalOpen()) playReturn(game);
}

async function playReturn(game) {
  const s = game.state;
  const { goblin, world, S } = game;
  s.returning = false;
  S.save();
  game.go('home');
  goblin.object.visible = true;
  goblin.object.position.y = 90;
  await new Promise((res) => game.tween(0.6, (p) => { goblin.object.position.y = 90 * (1 - p * p); }, res));
  goblin.object.position.y = 0;
  sfx.thud();
  world.fx.confetti(goblin.headTop(), 40);
  goblin.act('cheer');
  goblin.emote('ecstatic', 3);
  game.line('vacationBack', 3);
  await game.wait(1.8);
  const card = s.postcards.find((c) => c.unread);
  if (card) showPostcard(game, card);
}

export function postcardEl(game, card) {
  const d = DESTINATIONS.find((x) => x.id === card.dest) || DESTINATIONS[0];
  const cv = drawScene(document.createElement('canvas'), card.dest, card.seed, game.state.skin);
  return h('div', { class: 'postcard' }, cv,
    h('div', { class: 'back' },
      h('div', { class: 'stamp' }, '🦎'),
      h('div', { class: 'from' }, `Greetings from ${d.name}!`),
      h('div', {}, card.opener), h('div', { style: { marginTop: '6px' } }, card.body),
      h('div', { class: 'sig' }, card.closer)));
}

export function showPostcard(game, card) {
  card.unread = false;
  game.S.save();
  sfx.fanfare();
  const extra = card.souvenir ? h('p', { style: { textAlign: 'center', fontWeight: 700 } }, `${game.state.gobName} also brought back ${card.souvenir} coins they found on the ground!`) : null;
  modal(h('div', {}, h('h2', {}, '📬 You got a postcard!'), postcardEl(game, card), extra,
    h('div', { class: 'row' }, button('Cool!', () => document.querySelector('.modal-wrap')?.remove(), 'slime'))));
}

export function openPostcards(game) {
  closePanel();
  const s = game.state;
  const album = h('div', { class: 'album' });
  const m = modal(h('div', {}, h('h2', {}, '📬 Postcard Album'),
    s.postcards.length ? album : h('div', { class: 'empty' }, `No postcards yet! Send ${s.gobName} on a vacation. ✈️`)));
  for (const c of s.postcards) {
    const d = DESTINATIONS.find((x) => x.id === c.dest) || DESTINATIONS[0];
    album.append(h('div', { class: 'thumb', onclick: () => { m.close(); showPostcard(game, c); } },
      drawScene(document.createElement('canvas'), c.dest, c.seed, s.skin),
      h('div', {}, d.name, h('br'), new Date(c.date).toLocaleDateString())));
  }
}
