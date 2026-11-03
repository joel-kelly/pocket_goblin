import * as THREE from '../vendor/three.module.min.js';
import { World, DECOR_SPOTS } from './world.js';
import * as S from './state.js';
import { sfx, setSoundEnabled, unlockAudio } from './audio.js';
import { LINES, pick } from './lines.js';
import { getItem, getModel, setCustomItems, addShippedItems } from './items.js';
import { SKINS } from './goblinModel.js';
import { h, button, say, updateBubble, modal, closePanel } from './ui.js';
import { HomeScreen } from './screens/home.js';
import { GauntletScreen } from './screens/gauntlet.js';
import { WorkshopScreen } from './screens/workshop.js';
import { RocketScreen } from './screens/rocket.js';
import { CafeScreen } from './screens/cafe.js';
import { checkVacation } from './screens/vacation.js';

const state = S.load();
setSoundEnabled(state.settings.sound);
setCustomItems(state.custom);

const world = new World(document.getElementById('game'));
world.setPixelScale(state.settings.pixelScale);
const goblin = world.goblin;
goblin.setSkin(state.skin);

const tweens = [];

export const game = {
  world, goblin, fx: world.fx, S,
  get state() { return S.get(); },
  screen: null,
  screens: {},

  vars() { return { kid: S.get().kidName, gob: S.get().gobName }; },
  line(key, seconds) { const l = pick(LINES[key], this.vars()); say(l, seconds); return l; },
  say,

  go(name, args) {
    closePanel();
    this.screen?.exit?.();
    this.screen = this.screens[name];
    this.screen.enter?.(args);
  },

  applyOutfit(override = {}) {
    const eq = { ...S.get().equipped, ...override };
    const outfit = {};
    for (const [slot, id] of Object.entries(eq)) outfit[slot] = id ? getModel(id) : null;
    goblin.setOutfit(outfit);
  },
  applyMood() { goblin.setMood(S.moodFromStats()); },

  // ---- den decor ----
  // preview = { spot, id } shows an item in a spot without saving (Shop try-on).
  applyDecor(preview) {
    const ids = [...(S.get().decor || [])];
    if (preview) ids[preview.spot] = preview.id;
    world.setDecor(DECOR_SPOTS.map((_, i) => {
      const it = ids[i] && getItem(ids[i]);
      return it ? { id: it.id, model: getModel(it.id), anim: it.anim } : null;
    }));
  },
  decorSpotOf(id) { return (S.get().decor || []).indexOf(id); },
  freeDecorSpot() {
    const d = S.get().decor || [];
    for (let i = 0; i < DECOR_SPOTS.length; i++) if (!d[i] || !getItem(d[i])) return i;
    return -1;
  },
  // Put an item out in the den. Returns its spot, or -1 if the den is full.
  placeDecor(id) {
    const s = S.get();
    const have = this.decorSpotOf(id);
    if (have >= 0) return have;
    const i = this.freeDecorSpot();
    if (i < 0) return -1;
    s.decor = [...(s.decor || [])];
    s.decor[i] = id;
    S.save();
    this.applyDecor();
    return i;
  },
  removeDecor(id) {
    const s = S.get();
    s.decor = (s.decor || []).map((d) => (d === id ? null : d));
    S.save();
    this.applyDecor();
  },

  tween(dur, fn, done) { tweens.push({ t: 0, dur, fn, done }); },
  wait(sec) { return new Promise((r) => setTimeout(r, sec * 1000)); },

  // Effects that happen at goblin body points
  fart(size = Math.random()) {
    goblin.emote('nervous', 0.7);
    return goblin.act('fart').then(() => goblin.emote('smug', 2));
  },
  burp() { return goblin.act('burp'); },
};

goblin.on('fart', () => {
  sfx.fart(Math.random());
  const dir = goblin.butt().sub(goblin.worldPoint('torso', 0, 6, 0)).setY(0).normalize();
  world.fx.fart(goblin.butt(), 1, dir);
});
goblin.on('burp', () => {
  sfx.burp();
  world.fx.burp(goblin.mouth());
});
goblin.on('thud', () => sfx.thud());

game.screens.home = new HomeScreen(game);
game.screens.gauntlet = new GauntletScreen(game);
game.screens.workshop = new WorkshopScreen(game);
game.screens.rocket = new RocketScreen(game);
game.screens.cafe = new CafeScreen(game);

game.applyOutfit();
game.applyMood();
game.applyDecor();

// Load items that were exported from the Workshop and committed to items/
fetch('items/index.json')
  .then((r) => (r.ok ? r.json() : []))
  .then(async (files) => {
    const list = await Promise.all(files.map((f) => fetch('items/' + f).then((r) => r.json()).then((d) => ({ id: 'x_' + f.replace(/\.json$/, ''), ...d }))));
    addShippedItems(list.filter((d) => d.slot && d.model));
    game.applyOutfit();
    game.applyDecor();
  })
  .catch(() => {});

// ---------- first-time setup ----------
function onboarding() {
  let skin = state.skin;
  const kid = h('input', { type: 'text', maxlength: 16, placeholder: 'Your name' });
  const gob = h('input', { type: 'text', maxlength: 16, placeholder: 'Gob', value: '' });
  const skins = h('div', { class: 'skins' });
  for (const [name, hex] of Object.entries(SKINS)) {
    const sw = h('div', { class: 'skin' + (hex === skin ? ' on' : ''), title: name, style: { background: hex } });
    sw.onclick = () => {
      skin = hex;
      skins.querySelectorAll('.skin').forEach((s) => s.classList.remove('on'));
      sw.classList.add('on');
      goblin.setSkin(hex);
      goblin.act('hop');
      sfx.click();
    };
    skins.append(sw);
  }
  const m = modal(h('div', {},
    h('h2', {}, 'A wild goblin appeared!'),
    h('p', {}, "It crawled out of your sock drawer and refuses to leave. Guess you live together now."),
    h('label', {}, "What's YOUR name?"), kid,
    h('label', {}, 'Name your goblin'), gob,
    h('label', {}, 'Pick a goblin color'), skins,
    h('div', { class: 'row' }, button("Let's go!", () => {
      state.kidName = kid.value.trim() || 'Human';
      state.gobName = gob.value.trim() || 'Gob';
      state.skin = skin;
      state.onboarded = true;
      S.save();
      m.close();
      game.go('home');
      setTimeout(() => {
        goblin.act('cheer');
        say(`Hi ${state.kidName}! I'm ${state.gobName}! Solve math to get coins, then buy me snacks and fancy stuff. Deal?`, 7);
      }, 300);
    }, 'slime big'))
  ), { dismissable: false });
  setTimeout(() => kid.focus(), 50);
  m.box.style.marginLeft = '34vw';
  world.setView('side');
}

// ---------- input ----------
window.addEventListener('pointerdown', () => unlockAudio(), { once: false });
window.addEventListener('keydown', (e) => {
  unlockAudio();
  game.screen?.onKey?.(e);
});

// ---------- main loop ----------
let last = performance.now();
let secAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  try { step(now); } catch (e) { console.error(e); }
}
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const p = Math.min(1, tw.t / tw.dur);
    tw.fn(p);
    if (p >= 1) { tweens.splice(i, 1); tw.done?.(); }
  }
  game.screen?.update?.(dt);
  world.update(dt);
  const top = goblin.object.visible ? world.toScreen(goblin.headTop()) : null;
  updateBubble(top && game.screen?.bubbleOK !== false ? top : null, (t) => sfx.babble(t, 1));

  secAcc += dt;
  if (secAcc > 1) {
    secAcc = 0;
    S.tick();
    checkVacation(game);
    game.screen?.second?.();
  }
  world.render();
}

document.getElementById('loading').remove();
if (state.onboarded) game.go('home', { greet: true });
else { game.screen = game.screens.home; onboarding(); }
requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => S.saveNow());
document.addEventListener('visibilitychange', () => { if (document.hidden) S.saveNow(); });

// handy for debugging in the browser console
window.pocketGoblin = game;
