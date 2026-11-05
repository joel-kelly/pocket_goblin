// Grown-ups corner: fact mastery heatmap, history, settings, save backup.
import { h, button, modal, toast } from '../ui.js';
import { setSoundEnabled, sfx } from '../audio.js';
import { SKINS } from '../goblinModel.js';
import { syncSection, linkedCode, unlink, enabled as syncEnabled } from '../sync.js';
import { MIN, TOP_MAX, START_MAX, factRecord, masterySummary, currentMax, unlockProgress } from '../math.js';

// Color = how solid the fact is (its level goes up with fast right answers).
function heatColor(r, fast) {
  if (!r.seen) return '#e6e0d0';
  if (r.box >= 4 && r.avg <= fast) return '#3aa83a';
  if (r.box >= 3) return '#8fdc3a';
  if (r.box >= 2) return '#ffe14d';
  if (r.box >= 1) return '#ffab4a';
  return '#ff6b6b';
}

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function openParent(game) {
  const { S } = game;
  const s = game.state;
  const fast = s.settings.fastSeconds;
  const max = currentMax(s);
  const sum = masterySummary(s.facts, fast, max);
  const prog = unlockProgress(s);

  // Full 2-15 grid; tables that aren't unlocked yet are grayed out.
  const heat = h('div', { class: 'heat', style: { gridTemplateColumns: `26px repeat(${TOP_MAX - MIN + 1}, 1fr)` } }, h('div', { class: 'hd' }, '×'));
  for (let b = MIN; b <= TOP_MAX; b++) heat.append(h('div', { class: 'hd' }, b));
  for (let a = MIN; a <= TOP_MAX; a++) {
    heat.append(h('div', { class: 'hd' }, a));
    for (let b = MIN; b <= TOP_MAX; b++) {
      const r = factRecord(s.facts, a, b);
      if (a > max || b > max) {
        heat.append(h('div', { class: 'locked', title: `${a}×${b}: not unlocked yet` }, r.avg ? r.avg.toFixed(1) : ''));
        continue;
      }
      const tip = r.seen ? `${a}×${b}: ${r.right}/${r.seen} right, avg ${r.avg?.toFixed(1)}s, level ${r.box}/5` : `${a}×${b}: not seen yet`;
      heat.append(h('div', { title: tip, style: { background: heatColor(r, fast) } }, r.avg ? r.avg.toFixed(1) : '·'));
    }
  }

  const maxSel = h('select', {},
    h('option', { value: 'auto', selected: !s.settings.maxFactor || s.settings.maxFactor === 'auto' }, `Auto: grow as she masters facts (now up to ${s.mathLevel || START_MAX})`),
    ...[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((v) => h('option', { value: v, selected: String(s.settings.maxFactor) === String(v) }, `Always up to ${v}`)));
  maxSel.onchange = () => { s.settings.maxFactor = maxSel.value === 'auto' ? 'auto' : Number(maxSel.value); S.save(); toast('Saved!'); m.close(); openParent(game); };

  const hist = h('table', { class: 'hist' }, h('tr', {}, h('th', {}, 'When'), h('th', {}, 'Game'), h('th', {}, 'Right'), h('th', {}, 'Accuracy'), h('th', {}, 'Avg time'), h('th', {}, 'Best streak')));
  for (const r of s.history.slice(-10).reverse()) {
    hist.append(h('tr', {}, h('td', {}, new Date(r.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })),
      h('td', {}, { rocket: '🚀 Rocket', cafe: '🍔 Café', race: '🏁 Sprint', squid: '🦑 Squid', homework: '✏️ Homework' }[r.game] || '🧮 Dash'),
      h('td', {}, r.correct), h('td', {}, Math.round((r.correct / Math.max(1, r.total)) * 100) + '%'), h('td', {}, r.avg.toFixed(1) + 's'), h('td', {}, r.streak)));
  }

  const fastSel = h('select', {}, ...[2, 2.5, 3, 4, 5].map((v) => h('option', { value: v, selected: v === fast }, `${v} seconds`)));
  fastSel.onchange = () => { s.settings.fastSeconds = Number(fastSel.value); S.save(); toast('Saved!'); };
  const ap = s.autoPace || {};
  const pct = (g) => `${Math.round((ap[g] ?? 1) * 100)}%`;
  const paceSel = h('select', {}, ...[
    ['auto', `Auto: normal, quietly slows down if she's struggling (now Rocket ${pct('rocket')}, Squid ${pct('squid')}, Sprint ${pct('race')})`],
    ['normal', 'Always normal'],
    ['relaxed', 'Always relaxed: more time to think']]
    .map(([v, l]) => h('option', { value: v, selected: (s.settings.pace || 'auto') === v }, l)));
  paceSel.onchange = () => { s.settings.pace = paceSel.value; S.save(); toast('Saved!'); };
  const pixSel = h('select', {}, ...[2, 3, 4, 5].map((v) => h('option', { value: v, selected: v === s.settings.pixelScale }, `${v}x ${v === 3 ? '(default)' : v > 3 ? '(chunkier, faster)' : '(sharper)'}`)));
  const padSel = h('select', {}, ...[['auto', 'Auto: show on phones and tablets'], ['on', 'Always show'], ['off', 'Never show (use the keyboard)']]
    .map(([v, l]) => h('option', { value: v, selected: (s.settings.numpad || 'auto') === v }, l)));
  padSel.onchange = () => { s.settings.numpad = padSel.value; S.save(); toast('Saved!'); };
  const statsSel = h('select', {}, ...[[true, 'On'], [false, 'Off']]
    .map(([v, l]) => h('option', { value: String(v), selected: (s.settings.analytics !== false) === v }, l)));
  statsSel.onchange = () => { s.settings.analytics = statsSel.value === 'true'; S.save(); toast('Saved!'); };
  pixSel.onchange = () => { s.settings.pixelScale = Number(pixSel.value); game.world.setPixelScale(s.settings.pixelScale); S.save(); };

  // Goblin color: the starting swatches plus any color at all.
  const setSkin = (hex) => {
    s.skin = hex;
    game.goblin.setSkin(hex);
    game.goblin.act('hop');
    S.save();
    skins.querySelectorAll('.skin').forEach((el) => el.classList.toggle('on', el.dataset.hex === hex));
    custom.value = hex;
  };
  const skins = h('div', { class: 'skins' });
  for (const [name, hex] of Object.entries(SKINS)) {
    const sw = h('div', { class: 'skin' + (hex === s.skin ? ' on' : ''), title: name, style: { background: hex }, onclick: () => { sfx.click(); setSkin(hex); } });
    sw.dataset.hex = hex;
    skins.append(sw);
  }
  const custom = h('input', { type: 'color', class: 'skin-custom', value: s.skin, title: 'Pick any color' });
  custom.oninput = () => setSkin(custom.value);
  skins.append(h('span', { class: 'skin-any' }, 'or any color:'), custom);

  const fileIn = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  fileIn.onchange = async () => {
    const f = fileIn.files[0];
    if (!f) return;
    try { S.importSave(await f.text()); location.reload(); } catch (e) { toast('That file did not work: ' + e.message); }
  };

  const m = modal(h('div', {},
    h('h2', {}, 'Grown-ups Corner'),
    h('p', {}, `Each square is a fact family (covering both orders and both divisions). Numbers = average answer time in seconds. A fact levels up each time it's answered right in under ${fast}s and drops on mistakes. "Mastered" = level 4+ and fast on average. Gray = not unlocked yet.`),
    h('p', { style: { fontWeight: 700 } }, prog.next
      ? `Numbers go up to ${max}. The ${prog.next}s unlock when ${prog.needed} of ${prog.total} facts are solid (level 3+; ${prog.solid} so far) and ${prog.newestNeeded} of the ${prog.newestTotal} newest ${max}s facts are solid (${prog.newestSolid} so far).`
      : `Numbers go up to ${max}.`),
    h('p', { style: { fontWeight: 700 } }, `Mastered: ${sum.mastered}/${sum.total} • Shaky: ${sum.shaky} • Not seen yet: ${sum.unseen}`),
    heat,
    h('div', { class: 'legend' },
      ...[['#3aa83a', 'Mastered'], ['#8fdc3a', 'Good'], ['#ffe14d', 'Getting there'], ['#ffab4a', 'Just started'], ['#ff6b6b', 'Needs practice'], ['#e6e0d0', 'Not seen']]
        .map(([c, l]) => h('span', {}, h('i', { style: { background: c } }), l))),
    h('label', {}, 'Recent math game rounds'),
    s.history.length ? hist : h('p', {}, 'No rounds played yet.'),
    h('label', {}, '"Fast" target time (facts answered faster level up)'), fastSel,
    h('label', {}, 'Biggest number in problems'), maxSel,
    h('label', {}, 'Game pace (Fart Rocket, Squid Smackdown, Swamp Sprint)'), paceSel,
    h('label', {}, 'Pixel size'), pixSel,
    h('label', {}, 'On-screen number pad in math games'), padSel,
    h('label', {}, 'Goblin color'), skins,
    h('label', {}, 'Sync between devices'),
    syncSection(() => { m.close(); openParent(game); }),
    syncEnabled() ? h('label', {}, 'Share play counts') : null,
    syncEnabled() ? h('p', { style: { fontSize: '15px', margin: '0 0 6px' } },
      'The game tells its maker which games and activities are popular. No names or answers are sent.') : null,
    syncEnabled() ? statsSel : null,
    h('label', {}, 'Save file'),
    h('div', { class: 'row', style: { justifyContent: 'flex-start', marginTop: 0 } },
      button('Download backup', () => download(`pocket-goblin-save-${new Date().toISOString().slice(0, 10)}.json`, S.exportSave()), 'small blue'),
      button('Load backup', () => fileIn.click(), 'small'),
      fileIn),
    h('label', {}, 'Testing helpers'),
    h('div', { class: 'row', style: { justifyContent: 'flex-start', marginTop: 0 } },
      button('+100 coins', () => { S.addCoins(100); toast('+100 coins'); }, 'small gold'),
      button('Fill all stats', () => { Object.keys(s.stats).forEach((k) => (s.stats[k] = 100)); S.save(); game.applyMood(); toast('Stats full'); }, 'small slime'),
      button('Make goblin needy', () => { s.stats = { hunger: 10, thirst: 15, clean: 12, fun: 20 }; S.save(); game.applyMood(); toast('Uh oh'); }, 'small'),
      button('Finish vacation now', () => { if (s.vacation) { s.vacation.end = Date.now(); S.save(); m.close(); } else toast('Not on vacation'); }, 'small purple'),
      button('Rename', () => {
        const kid = prompt("Kid's name?", s.kidName); if (kid) s.kidName = kid;
        const gob = prompt("Goblin's name?", s.gobName); if (gob) s.gobName = gob;
        S.save(); game.go('home');
      }, 'small'),
      button('Start over (erase!)', () => {
        const note = linkedCode() ? ' This device will also stop syncing, so your other devices keep their goblin.' : '';
        if (confirm(`Erase EVERYTHING and start over? (Download a backup first if unsure.)${note}`)) { unlink(); S.resetSave(); location.reload(); }
      }, 'small red')),
  ));
}
