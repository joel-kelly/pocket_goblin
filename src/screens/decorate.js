// Decorate: put owned decor out in the den (or put it away), like the Wardrobe for the den.
import { h, button, openPanel, setPanelBody, toast, nums } from '../ui.js';
import { sfx } from '../audio.js';
import { allItems, getModel } from '../items.js';
import { thumbnail, DECOR_SPOTS } from '../world.js';
import { openShop } from './shop.js';

export function openDecorate(game) {
  const { world, goblin, S } = game;
  world.setView('decor');

  const render = () => {
    const s = game.state;
    const items = allItems().filter((it) => it.kind === 'decor' && (it.custom || s.owned.includes(it.id)));
    const used = (s.decor || []).filter((id) => id && items.some((it) => it.id === id)).length;
    const grid = h('div', { class: 'grid' });
    for (const it of items) {
      const spot = game.decorSpotOf(it.id);
      const out = spot >= 0;
      grid.append(h('div', {
        class: 'card' + (out ? ' equipped placed sel' : ''),
        onclick: () => {
          if (out) {
            sfx.remove();
            game.removeDecor(it.id);
            game.line('removeDecor', 2);
            goblin.act('shiver');
          } else {
            const i = game.placeDecor(it.id);
            if (i < 0) {
              sfx.wrong();
              goblin.act('shakeNo');
              game.line('denFull', 2.5);
              toast(`The den is full! Click something that's out to put it away.`);
              return;
            }
            sfx.place();
            world.pokeDecor(i);
            world.fx.stars(world.decorTop(i, 2), 6);
            goblin.act(Math.random() < 0.5 ? 'cheer' : 'hop');
            goblin.emote('love', 1.8);
            game.line('newDecor', 2.5);
          }
          render();
        },
      },
        it.custom ? h('span', { class: 'mine', title: 'Made by you!' }, '⭐') : null,
        h('img', { src: thumbnail(getModel(it.id), it.id) }),
        h('div', { class: 'nm' }, it.name)));
    }
    const body = h('div', {},
      h('p', { style: { margin: '0 0 10px' } }, ...nums(`Click something to put it out in the den, or click it again to put it away. Spots used: ${used} of ${DECOR_SPOTS.length}.`)),
      items.length ? grid : h('div', { class: 'empty' }, 'No decor yet!', h('br'), 'Buy some in the Shop, or build your own in the Workshop. 🔨', h('br'), h('br'),
        button('Go to Shop', () => openShop(game, 'decor'), 'gold')));
    const foot = h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'space-between' } },
      button('Put it all away', () => {
        s.decor = [];
        S.save(); game.applyDecor(); goblin.act('wiggle'); game.line('removeDecor'); render();
      }, 'small red'),
      button('🔀 Move stuff around', () => {
        const ids = DECOR_SPOTS.map((_, i) => s.decor?.[i] || null);
        for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
        s.decor = ids;
        S.save(); game.applyDecor();
        ids.forEach((id, i) => { if (id) world.pokeDecor(i); });
        sfx.whoosh(); goblin.act('spin');
      }, 'small gold'));
    setPanelBody(body, foot);
  };

  openPanel('Decorate the Den', h('div'), { onClose: () => world.setView('home') });
  render();
}
