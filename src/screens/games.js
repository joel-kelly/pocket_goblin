// "Math Games" picker shown from the home screen.
import { h, modal, closePanel } from '../ui.js';
import { sfx } from '../audio.js';

export function openGames(game) {
  closePanel();
  const s = game.state;
  const games = [
    { id: 'gauntlet', emo: '🧮', name: 'Math Dash', desc: '60 seconds. As many as you can!', best: `Best: ${s.best.score} right` },
    { id: 'rocket', emo: '🚀', name: 'Fart Rocket', desc: 'Answer fast to keep the fart fuel flowing. How high can you fly?', best: `Best: ${s.rocketBest || 0} m` },
    { id: 'cafe', emo: '🍔', name: 'Goblin Café', desc: 'Ring up 10 hungry customers. Fast service = big tips!', best: `Best: ${s.cafeBest || 0}¢ tips` },
  ];
  const list = h('div', { class: 'game-pick' });
  const m = modal(h('div', {}, h('h2', {}, 'Pick a math game!'), list));
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
