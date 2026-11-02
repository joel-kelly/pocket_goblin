// Grown-ups corner: fact mastery heatmap, history, settings, save backup.
import { h, button, modal, toast } from '../ui.js';
import { setSoundEnabled } from '../audio.js';
import { MIN, MAX, factRecord, masterySummary } from '../math.js';

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
  const sum = masterySummary(s.facts, fast);

  const heat = h('div', { class: 'heat' }, h('div', { class: 'hd' }, '×'));
  for (let b = MIN; b <= MAX; b++) heat.append(h('div', { class: 'hd' }, b));
  for (let a = MIN; a <= MAX; a++) {
    heat.append(h('div', { class: 'hd' }, a));
    for (let b = MIN; b <= MAX; b++) {
      const r = factRecord(s.facts, a, b);
      const tip = r.seen ? `${a}×${b}: ${r.right}/${r.seen} right, avg ${r.avg?.toFixed(1)}s, level ${r.box}/5` : `${a}×${b}: not seen yet`;
      heat.append(h('div', { title: tip, style: { background: heatColor(r, fast) } }, r.avg ? r.avg.toFixed(1) : '·'));
    }
  }

  const hist = h('table', { class: 'hist' }, h('tr', {}, h('th', {}, 'When'), h('th', {}, 'Right'), h('th', {}, 'Accuracy'), h('th', {}, 'Avg time'), h('th', {}, 'Best streak')));
  for (const r of s.history.slice(-10).reverse()) {
    hist.append(h('tr', {}, h('td', {}, new Date(r.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })),
      h('td', {}, r.correct), h('td', {}, Math.round((r.correct / Math.max(1, r.total)) * 100) + '%'), h('td', {}, r.avg.toFixed(1) + 's'), h('td', {}, r.streak)));
  }

  const fastSel = h('select', {}, ...[2, 2.5, 3, 4, 5].map((v) => h('option', { value: v, selected: v === fast }, `${v} seconds`)));
  fastSel.onchange = () => { s.settings.fastSeconds = Number(fastSel.value); S.save(); toast('Saved!'); };
  const pixSel = h('select', {}, ...[2, 3, 4, 5].map((v) => h('option', { value: v, selected: v === s.settings.pixelScale }, `${v}x ${v === 3 ? '(default)' : v > 3 ? '(chunkier, faster)' : '(sharper)'}`)));
  pixSel.onchange = () => { s.settings.pixelScale = Number(pixSel.value); game.world.setPixelScale(s.settings.pixelScale); S.save(); };

  const fileIn = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  fileIn.onchange = async () => {
    const f = fileIn.files[0];
    if (!f) return;
    try { S.importSave(await f.text()); location.reload(); } catch (e) { toast('That file did not work: ' + e.message); }
  };

  const m = modal(h('div', {},
    h('h2', {}, 'Grown-ups Corner'),
    h('p', {}, `Fact families 2×2 through 10×10 (each covers both orders and both divisions). Numbers = average answer time in seconds. A fact levels up each time it's answered right in under ${fast}s and drops on mistakes. "Mastered" = level 4+ and fast on average.`),
    h('p', { style: { fontWeight: 700 } }, `Mastered: ${sum.mastered}/${sum.total} • Shaky: ${sum.shaky} • Not seen yet: ${sum.unseen}`),
    heat,
    h('div', { class: 'legend' },
      ...[['#3aa83a', 'Mastered'], ['#8fdc3a', 'Good'], ['#ffe14d', 'Getting there'], ['#ffab4a', 'Just started'], ['#ff6b6b', 'Needs practice'], ['#e6e0d0', 'Not seen']]
        .map(([c, l]) => h('span', {}, h('i', { style: { background: c } }), l))),
    h('label', {}, 'Recent Math Dash rounds'),
    s.history.length ? hist : h('p', {}, 'No rounds played yet.'),
    h('label', {}, '"Fast" target time (facts answered faster level up)'), fastSel,
    h('label', {}, 'Pixel size'), pixSel,
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
        if (confirm('Erase EVERYTHING and start over? (Download a backup first if unsure.)')) { S.resetSave(); location.reload(); }
      }, 'small red')),
  ));
}
