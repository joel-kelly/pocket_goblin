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
  goblin.emote('money', 2);
  game.line('buy', 2);

  // Decor previews in the first free den spot (or the first spot if the den is full).
  const tryOn = (id) => {
    const it = id && getItem(id);
    if (it && it.kind === 'wear') { game.applyOutfit({ [it.slot]: id }); goblin.act('model'); }
    else game.applyOutfit();
    if (it && it.kind === 'decor' && game.decorSpotOf(id) < 0) {
      const spot = Math.max(0, game.freeDecorSpot());
      game.applyDecor({ spot, id });
      world.pokeDecor(spot);
    } else game.applyDecor();
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
    } else if (it.kind === 'decor') {
      s.owned.push(id);
      const spot = game.placeDecor(id);
      game.applyDecor();
      toast(spot >= 0 ? `You got the ${it.name}! It's in the den now.` : `You got the ${it.name}! The den is full, so use Decorate to swap things around.`);
      game.line('newDecor', 3);
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
    for (const slot of ['snack', ...WEAR_SLOTS, 'decor']) {
      el.append(h('div', { class: 'tab' + (tab === slot ? ' on' : ''), onclick: () => { tab = slot; sel = null; tryOn(null); setView(); sfx.click(); render(); } },
        `${SLOTS[slot].icon} ${SLOTS[slot].label}`));
    }
    return el;
  };

  const render = () => {
    const s = game.state;
    const items = allItems().filter((it) => it.slot === tab && !(it.custom && (it.kind === 'wear' || it.kind === 'decor')));
    items.sort((a, b) => a.price - b.price);
    const grid = h('div', { class: 'grid' });
    for (const it of items) {
      const owned = (it.kind === 'wear' || it.kind === 'decor') && s.owned.includes(it.id);
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
      const owned = (it.kind === 'wear' || it.kind === 'decor') && s.owned.includes(it.id);
      const btns = h('div', { class: 'btns' });
      if (owned && it.kind === 'decor') {
        const out = game.decorSpotOf(it.id) >= 0;
        btns.append(button(out ? 'In the den!' : 'Put it out', () => {
          if (out) return;
          if (game.placeDecor(it.id) < 0) { toast('The den is full! Use Decorate to put something away.'); game.line('denFull'); return; }
          world.pokeDecor(game.decorSpotOf(it.id)); game.line('newDecor'); render();
        }, 'slime'));
      } else if (owned) {
        btns.append(button(s.equipped[it.slot] === it.id ? 'Wearing!' : 'Wear it', () => {
          s.equipped[it.slot] = it.id; S.save(); game.applyOutfit(); goblin.act('model'); game.line('newOutfit'); render();
        }, 'slime'));
      } else {
        btns.append(button(`Buy ${it.price}¢`, () => buy(it.id), s.coins >= it.price ? 'gold' : ''));
      }
      const fx = it.kind === 'wear' || it.kind === 'decor' ? '' : it.kind === 'drink' ? `💧 +${it.thirst} thirst` : `🍗 +${it.hunger} tummy`;
      foot = h('div', { class: 'detail' },
        h('img', { src: thumbnail(getModel(it.id), it.id) }),
        h('div', { class: 'txt' }, h('h3', {}, it.name), h('p', {}, it.desc), fx ? h('p', { style: { marginTop: '4px', fontWeight: 700 } }, fx) : null),
        btns);
    }
    setPanelBody(h('div', {}, tabs(), grid), foot);
  };

  const setView = () => world.setView(tab === 'decor' ? 'decor' : 'side');
  setView();

  openPanel('Goblin Mart', h('div'), {
    onClose: () => { game.applyOutfit(); game.applyDecor(); world.setView('home'); },
    extraHead: h('div', { class: 'coins', style: { padding: '6px 10px', fontSize: '12px', boxShadow: 'none', borderWidth: '3px' } }, h('span', { class: 'coin-ico' }), h('span', { class: 'shop-coins' }, game.state.coins)),
  });
  const unsub = S.onChange(() => { const el = document.querySelector('.shop-coins'); if (el) el.textContent = game.state.coins; else unsub(); });
  render();
}
