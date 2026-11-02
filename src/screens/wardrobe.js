// Wardrobe: dress up the goblin with owned items and Workshop creations.
import { h, button, openPanel, setPanelBody } from '../ui.js';
import { sfx } from '../audio.js';
import { allItems, getModel } from '../items.js';
import { SLOTS, WEAR_SLOTS } from '../goblinModel.js';
import { thumbnail } from '../world.js';

export function openWardrobe(game) {
  const { world, goblin, S } = game;
  let tab = 'head';
  world.setView('side');

  const render = () => {
    const s = game.state;
    const tabs = h('div', { class: 'tabs' });
    for (const slot of WEAR_SLOTS) {
      const wearing = s.equipped[slot] ? ' •' : '';
      tabs.append(h('div', { class: 'tab' + (tab === slot ? ' on' : ''), onclick: () => { tab = slot; sfx.click(); render(); } },
        `${SLOTS[slot].icon} ${SLOTS[slot].label}${wearing}`));
    }
    const items = allItems().filter((it) => it.slot === tab && it.kind === 'wear' && (it.custom || s.owned.includes(it.id)));
    const grid = h('div', { class: 'grid' });
    for (const it of items) {
      const on = s.equipped[tab] === it.id;
      grid.append(h('div', {
        class: 'card' + (on ? ' equipped sel' : ''),
        onclick: () => {
          sfx.click();
          if (on) {
            s.equipped[tab] = null;
            game.line('takeOff', 2);
            goblin.act('shiver');
          } else {
            s.equipped[tab] = it.id;
            goblin.act(Math.random() < 0.5 ? 'model' : 'spin');
            goblin.emote('love', 1.8);
            world.fx.hearts(goblin.headTop(), 4);
            game.line('newOutfit', 2.5);
          }
          S.save();
          game.applyOutfit();
          render();
        },
      },
        it.custom ? h('span', { class: 'mine', title: 'Made by you!' }, '⭐') : null,
        h('img', { src: thumbnail(getModel(it.id), it.id) }),
        h('div', { class: 'nm' }, it.name)));
    }
    const body = h('div', {}, tabs,
      items.length ? grid : h('div', { class: 'empty' }, `No ${SLOTS[tab].label.toLowerCase()} yet!`, h('br'), 'Buy some in the Shop, or build your own in the Workshop. 🔨'));
    const foot = h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'space-between' } },
      button('Take it all off!', () => {
        s.equipped = {};
        S.save(); game.applyOutfit(); goblin.act('wiggle'); game.line('takeOff'); render();
      }, 'small red'),
      button('Strike a pose', () => { goblin.act('dance'); goblin.emote('ecstatic', 2.4); sfx.fanfare(); }, 'small gold'));
    setPanelBody(body, foot);
  };

  openPanel('Wardrobe', h('div'), { onClose: () => world.setView('home') });
  render();
}
