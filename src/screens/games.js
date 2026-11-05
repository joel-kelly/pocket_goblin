// "Math Games" picker shown from the home screen.
import { h, modal, closePanel, button, nums } from '../ui.js';
import { sfx } from '../audio.js';
import { unlockProgress, checkUnlock, TOP_MAX } from '../math.js';
import { track } from '../track.js';

// Progress toward the next times table, shown in the games menu.
function progressEl(state) {
  const p = unlockProgress(state);
  const label = !p.next
    ? (p.max >= TOP_MAX ? `All numbers unlocked, up to ${TOP_MAX}! 🏆` : `Numbers up to ${p.max} (set by a grown-up)`)
    : p.lagging === 'newest' && p.max > 10
      ? `Unlock the ${p.next}s: master the ${p.max}s (${Math.min(p.newestSolid, p.newestNeeded)} / ${p.newestNeeded})`
      : `Unlock the ${p.next}s: ${Math.min(p.solid, p.needed)} / ${p.needed} facts solid`;
  const pct = p.next ? p.pct * 100 : 100;
  return h('div', { class: 'unlock' },
    h('div', { class: 'unlock-top' }, h('span', {}, nums(`🔢 Numbers up to ${p.max}`)), h('span', {}, nums(label))),
    h('div', { class: 'unlock-bar' }, h('div', { style: { width: pct + '%' } })),
    p.next ? h('div', { class: 'unlock-tip' }, 'A fact gets "solid" when you answer it fast a few times.') : null);
}

// Call at the end of every math game round: maybe unlock bigger numbers.
export function afterRound(game) {
  const n = checkUnlock(game.state);
  if (!n) return;
  track('unlock', '', n);
  game.S.save();
  setTimeout(() => {
    sfx.fanfare();
    game.say(`WHOA! You unlocked the ${n}s! My brain is getting so big!`, 4);
    const m = modal(h('div', { style: { textAlign: 'center' } },
      h('h2', {}, `🔓 You unlocked the ${n}s!`),
      h('p', {}, nums(`You got so fast that the goblin is giving you bigger numbers. Problems can now go all the way up to ${n} × ${n} = ${n * n}!`)),
      h('div', { class: 'row' }, button('Bring it on!', () => m.close(), 'gold big'))));
  }, 1600);
}

export function openGames(game) {
  closePanel();
  const s = game.state;
  const games = [
    { id: 'gauntlet', emo: '🧮', name: 'Math Dash', desc: '60 seconds. As many as you can!', best: `Best: ${s.best.score} right` },
    { id: 'rocket', emo: '🚀', name: 'Fart Rocket', desc: 'Answer fast to keep the fart fuel flowing. How high can you fly?', best: `Best: ${s.rocketBest || 0} m` },
    { id: 'cafe', emo: '🍔', name: 'Goblin Café', desc: 'Ring up 10 hungry customers. Fast service = big tips!', best: `Best: ${s.cafeBest || 0}¢ tips` },
    { id: 'race', emo: '🏁', name: 'Swamp Sprint', desc: 'Race 3 goblins! Right answers make you run faster.', best: s.raceBest ? `Best: ${s.raceBest.toFixed(1)} s` : 'Best: -' },
    { id: 'squid', emo: '🦑', name: 'Squid Smackdown', desc: 'Box a giant squid! Answer fast to punch and dodge.', best: s.squidBest ? `Fastest K.O.: ${s.squidBest} s` : 'Not beaten yet!' },
    { id: 'homework', emo: '✏️', name: "Goblin's Homework", desc: 'Check the goblin\'s answers and fix the mistakes. No timer!', best: `Gold stars: ${s.homeworkStars || 0} ⭐` },
  ];
  const list = h('div', { class: 'game-pick' });
  const m = modal(h('div', {}, h('h2', {}, 'Pick a math game!'), progressEl(s), list));
  games.forEach((g, i) => {
    list.append(h('button', { class: 'btn game-card', onclick: () => { sfx.click(); m.close(); game.go(g.id); } },
      h('span', { class: 'emo' }, g.emo),
      h('span', { class: 'gname' }, `${g.name}`),
      h('span', { class: 'gdesc' }, g.desc),
      h('span', { class: 'gbest' }, g.best),
      h('span', { class: 'key' }, `press ${i + 1}`)));
  });
  const onKey = (e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= games.length && document.body.contains(list)) { e.stopPropagation(); m.close(); game.go(games[n - 1].id); }
    if (!document.body.contains(list)) window.removeEventListener('keydown', onKey, true);
  };
  window.addEventListener('keydown', onKey, true);
}
