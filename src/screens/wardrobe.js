// Wardrobe: dress up the goblin with owned items and Workshop creations.
import { h, button, openPanel, setPanelBody } from '../ui.js';
import { sfx } from '../audio.js';
import { allItems, getModel } from '../items.js';
import { SLOTS, WEAR_SLOTS } from '../goblinModel.js';
import { thumbnail } from '../world.js';
import { track } from '../track.js';

// Poses the goblin can strike. act = animation name in goblin.js.
const ticks = (n, gap) => { for (let i = 0; i < n; i++) setTimeout(() => sfx.tick(), i * gap); };
export const POSES = [
  { act: 'dance', emo: '🕺', name: 'Dance', face: 'ecstatic', sound: () => sfx.fanfare(), say: ['Bust a move!', 'Shake that goblin booty!'] },
  { act: 'model', emo: '💃', name: 'Runway', face: 'smug', say: ['Work it, work it!', 'Fashion goblin, coming through!'] },
  { act: 'flex', emo: '💪', name: 'Flex', face: 'focus', say: ['Look at these MUSCLES!', 'Hnnngh! So strong!'] },
  { act: 'superhero', emo: '🦸', name: 'Superhero', face: 'happy', sound: () => sfx.whoosh(), say: ['Up, up, and a-WAY!', 'Super Goblin to the rescue!'] },
  { act: 'ballerina', emo: '🩰', name: 'Ballerina', face: 'love', say: ['Twirly twirl!', 'I am a graceful swamp swan.'] },
  { act: 'robot', emo: '🤖', name: 'Robot', face: 'focus', sound: () => ticks(8, 400), say: ['BEEP BOOP. I AM GOBLIN-BOT.', 'DOES. NOT. COMPUTE.'] },
  { act: 'dab', emo: '🙆', name: 'Dab', face: 'cheeky', sound: () => sfx.whoosh(), say: ["Dab on 'em!", '*dabs extremely hard*'] },
  { act: 'airplane', emo: '✈️', name: 'Airplane', face: 'ecstatic', sound: () => sfx.whoosh(), say: ['Neeeeeeoowww!', 'This is your captain speaking. Snacks are coming.'] },
  { act: 'zen', emo: '🧘', name: 'Zen Float', face: 'sleepy', say: ['Ommmmmmmm...', 'I am one with the swamp.'] },
  { act: 'cartwheel', emo: '🤸', name: 'Cartwheel', face: 'ecstatic', sound: () => sfx.whoosh(), say: ['Wheeee!', 'Ta-daaa!'] },
  { act: 'headstand', emo: '🙃', name: 'Headstand', face: 'dizzy', sound: () => sfx.whoosh(), say: ['Everything is upside down!', 'All my boogers are going to my brain!'] },
  { act: 'thinker', emo: '🤔', name: 'Thinker', face: 'focus', say: ['Hmmm... what IS a number, really?', 'I am thinking very hard about cheese.'] },
  { act: 'chicken', emo: '🐔', name: 'Chicken', face: 'cheeky', sound: () => sfx.babble('bawk bawk bawk bawk', 1.6), say: ['BAWK BAWK BAWK!', 'Bawk! I laid an egg! Just kidding.'] },
];

export function strikePose(game, pose) {
  const { goblin } = game;
  track('pose', pose.act);
  goblin.act(pose.act);
  goblin.emote(pose.face, goblin.actionLength(pose.act));
  pose.sound?.();
  game.say(pose.say[Math.floor(Math.random() * pose.say.length)], 2.5);
}

export function openWardrobe(game) {
  const { world, goblin, S } = game;
  let tab = 'head';
  let lastPose = null;
  world.setView('side');

  const render = () => {
    const s = game.state;
    const tabs = h('div', { class: 'tabs' });
    for (const slot of WEAR_SLOTS) {
      const wearing = s.equipped[slot] ? ' •' : '';
      tabs.append(h('div', { class: 'tab' + (tab === slot ? ' on' : ''), onclick: () => { tab = slot; sfx.click(); render(); } },
        `${SLOTS[slot].icon} ${SLOTS[slot].label}${wearing}`));
    }
    tabs.append(h('div', { class: 'tab' + (tab === 'poses' ? ' on' : ''), onclick: () => { tab = 'poses'; sfx.click(); render(); } }, '🕺 Poses'));
    const foot = h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'space-between' } },
      button('Take it all off!', () => {
        s.equipped = {};
        S.save(); game.applyOutfit(); goblin.act('wiggle'); game.line('takeOff'); render();
      }, 'small red'),
      button('Strike a pose', () => {
        const pool = POSES.filter((p) => p !== lastPose);
        lastPose = pool[Math.floor(Math.random() * pool.length)];
        strikePose(game, lastPose);
      }, 'small gold'));

    if (tab === 'poses') {
      const grid = h('div', { class: 'grid' });
      for (const pose of POSES) {
        grid.append(h('div', { class: 'card', onclick: () => { sfx.click(); strikePose(game, pose); } },
          h('div', { class: 'pose-emo' }, pose.emo),
          h('div', { class: 'nm' }, pose.name)));
      }
      setPanelBody(h('div', {}, tabs, h('p', { style: { margin: '0 0 10px' } }, 'Click a pose and watch!'), grid), foot);
      return;
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
            track('wear', it.custom ? 'custom' : it.id);
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
    setPanelBody(body, foot);
  };

  openPanel('Wardrobe', h('div'), { onClose: () => world.setView('home') });
  render();
}
