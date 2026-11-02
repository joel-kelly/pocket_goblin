// The Shop: spend coins on snacks and fancy goblin gear. Try before you buy!
import { h, button, openPanel, setPanelBody, closePanel, toast } from '../ui.js';
import { sfx } from '../audio.js';
import { allItems, getItem, getModel } from '../items.js';
import { SLOTS, WEAR_SLOTS } from '../goblinModel.js';
import { thumbnail } from '../world.js';

export function openShop(game, startTab = 'snack') {
  const { world, goblin, S } = game;
  let tab = startTab;
  let sel = null;
  world.setView('side');
  goblin.emote('money', 2);
  game.line('buy', 2);

  const tryOn = (id) => {
    const it = id && getItem(id);
    if (it && it.kind === 'wear') { game.applyOutfit({ [it.slot]: id }); goblin.act('model'); }
    else game.applyOutfit();
  };

  const buy = (id) => {
    const s = game.state;
    const it = getItem(id);
    if (s.coins < it.price) {
      sfx.wrong();
      goblin.act('shakeNo');
      goblin.emote('sad', 1.5);
      game.line('broke', 2.5);
      return;
    }
    S.addCoins(-it.price);
    sfx.buy();
    world.fx.confetti(goblin.headTop(), 30);
    goblin.emote('love', 2.2);
    goblin.act('cheer');
    if (it.kind === 'wear') {
      s.owned.push(id);
      s.equipped[it.slot] = id;
      game.applyOutfit();
      toast(`You got the ${it.name}! Now wearing it.`);
      game.line('newOutfit', 3);
    } else {
      s.pantry[id] = (s.pantry[id] || 0) + 1;
      toast(`${it.name} added to the pantry!`);
      game.line('buy', 2);
    }
    S.save();
    render();
  };

  const tabs = () => {
    const el = h('div', { class: 'tabs' });
    for (const slot of ['snack', ...WEAR_SLOTS]) {
      el.append(h('div', { class: 'tab' + (tab === slot ? ' on' : ''), onclick: () => { tab = slot; sel = null; tryOn(null); sfx.click(); render(); } },
        `${SLOTS[slot].icon} ${SLOTS[slot].label}`));
    }
    return el;
  };

  const render = () => {
    const s = game.state;
    const items = allItems().filter((it) => it.slot === tab && !(it.custom && it.kind === 'wear'));
    items.sort((a, b) => a.price - b.price);
    const grid = h('div', { class: 'grid' });
    for (const it of items) {
      const owned = it.kind === 'wear' && s.owned.includes(it.id);
      grid.append(h('div', {
        class: 'card' + (sel === it.id ? ' sel' : ''),
        onclick: () => { sel = it.id; sfx.click(); tryOn(it.id); render(); },
      },
        it.custom ? h('span', { class: 'mine', title: 'Made by you!' }, '⭐') : null,
        it.kind !== 'wear' && s.pantry[it.id] ? h('span', { class: 'count' }, '×' + s.pantry[it.id]) : null,
        h('img', { src: thumbnail(getModel(it.id), it.id) }),
        h('div', { class: 'nm' }, it.name),
        h('div', { class: 'pr' + (owned ? ' owned' : '') }, owned ? 'OWNED ✓' : `${it.price} ¢`)));
    }

    let foot = h('div', { class: 'empty', style: { padding: '6px' } }, 'Click something to check it out!');
    if (sel) {
      const it = getItem(sel);
      const owned = it.kind === 'wear' && s.owned.includes(it.id);
      const btns = h('div', { class: 'btns' });
      if (owned) {
        btns.append(button(s.equipped[it.slot] === it.id ? 'Wearing!' : 'Wear it', () => {
          s.equipped[it.slot] = it.id; S.save(); game.applyOutfit(); goblin.act('model'); game.line('newOutfit'); render();
        }, 'slime'));
      } else {
        btns.append(button(`Buy ${it.price}¢`, () => buy(it.id), s.coins >= it.price ? 'gold' : ''));
      }
      const fx = it.kind === 'wear' ? '' : it.kind === 'drink' ? `💧 +${it.thirst} thirst` : `🍗 +${it.hunger} tummy`;
      foot = h('div', { class: 'detail' },
        h('img', { src: thumbnail(getModel(it.id), it.id) }),
        h('div', { class: 'txt' }, h('h3', {}, it.name), h('p', {}, it.desc), fx ? h('p', { style: { marginTop: '4px', fontWeight: 700 } }, fx) : null),
        btns);
    }
    setPanelBody(h('div', {}, tabs(), grid), foot);
  };

  openPanel('Goblin Mart', h('div'), {
    onClose: () => { game.applyOutfit(); world.setView('home'); },
    extraHead: h('div', { class: 'coins', style: { padding: '6px 10px', fontSize: '12px', boxShadow: 'none', borderWidth: '3px' } }, h('span', { class: 'coin-ico' }), h('span', { class: 'shop-coins' }, game.state.coins)),
  });
  const unsub = S.onChange(() => { const el = document.querySelector('.shop-coins'); if (el) el.textContent = game.state.coins; else unsub(); });
  render();
}
