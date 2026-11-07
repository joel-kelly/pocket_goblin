// Home: the goblin's den. Stats, care actions, poking, idle silliness.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button, say, openPanel, setPanelBody, closePanel, panelOpen, modalOpen, toast, fmtTime } from '../ui.js';
import { STAT_INFO } from '../state.js';
import { sfx, setSoundEnabled, soundEnabled } from '../audio.js';
import { getItem, getModel, allItems } from '../items.js';
import { buildMesh } from '../voxel.js';
import { thumbnail } from '../world.js';
import { openShop } from './shop.js';
import { openWardrobe } from './wardrobe.js';
import { openDecorate } from './decorate.js';
import { openVacation, openPostcards } from './vacation.js';
import { openParent } from './parent.js';
import { openGames } from './games.js';
import { VACATION_STATUS, VACATION_STATUS_ANY, pick, LINES } from '../lines.js';
import { track } from '../track.js';

export class HomeScreen {
  constructor(game) {
    this.game = game;
    this.hud = document.getElementById('hud');
    this.busy = false;
    this.idleAt = 6;
    this.chatAt = 25;
    this.t = 0;
    this.stinkAt = 0;
    this.pokes = [];
    this.raycaster = new THREE.Raycaster();
    game.S.onChange(() => this.refresh());
    document.getElementById('game').addEventListener('pointerdown', (e) => this.onCanvasClick(e));
  }

  get state() { return this.game.state; }

  enter(args = {}) {
    const { world, goblin } = this.game;
    world.active = null;
    world.setView(panelOpen() ? 'side' : 'home');
    this.build();
    this.hud.classList.remove('hidden');
    goblin.object.visible = !this.state.vacation && !this.state.returning;
    goblin.lookAt(null);
    this.game.applyOutfit();
    this.game.applyDecor();
    this.game.applyMood();
    if (args.greet && !this.state.vacation) {
      setTimeout(() => {
        const needy = this.game.S.neediest();
        this.game.line(needy === 'hunger' ? 'greetHungry' : 'greet', 5);
        goblin.act(needy ? 'slump' : 'cheer');
      }, 600);
    }
  }
  exit() { this.hud.classList.add('hidden'); }

  // ---------- HUD ----------
  build() {
    const s = this.state;
    const away = !!s.vacation;
    this.coinsEl = h('div', { class: 'coins' }, h('span', { class: 'coin-ico' }), h('span', { class: 'amt' }, s.coins));
    const holdBtn = this.holdButton('Grown-ups', () => openParent(this.game));
    const soundBtn = button(soundEnabled() ? '🔊' : '🔇', () => {
      s.settings.sound = !s.settings.sound;
      setSoundEnabled(s.settings.sound);
      this.game.S.save();
      soundBtn.textContent = s.settings.sound ? '🔊' : '🔇';
    }, 'small');
    const top = h('div', { class: 'topbar' },
      h('div', { class: 'nameplate' }, s.gobName),
      this.coinsEl,
      h('div', { class: 'spacer' }),
      soundBtn, holdBtn);

    this.statEls = {};
    const stats = h('div', { class: 'stats' });
    for (const [k, info] of Object.entries(STAT_INFO)) {
      const fill = h('div', { class: 'fill' });
      stats.append(h('div', { class: 'stat' }, h('span', { class: 'ico' }, info.icon), h('span', { class: 'lbl' }, info.label), h('div', { class: 'bar' }, fill)));
      this.statEls[k] = fill;
    }

    const act = (emo, label, fn, cls = '', disabled = false) => {
      const id = label.toLowerCase().replace(/[^a-z]/g, '');
      const b = h('button', { class: `btn ${cls}`, onclick: () => { sfx.click(); track('home_button', id); fn(); } }, h('span', { class: 'emo' }, emo), label);
      if (disabled) b.disabled = true;
      return b;
    };
    const actions = h('div', { class: 'actions' },
      act('🧮', 'Math Games!', () => openGames(this.game), 'math', away),
      act('🍔', 'Feed', () => this.openFeed(), '', away),
      act('🛒', 'Shop', () => openShop(this.game)),
      act('👕', 'Wardrobe', () => openWardrobe(this.game), '', away),
      act('🪴', 'Decorate', () => openDecorate(this.game)),
      act('🛁', 'Bath', () => this.bath(), '', away),
      act('✈️', 'Vacation', () => openVacation(this.game), '', away),
      act('📬', 'Postcards', () => openPostcards(this.game)),
      act('🔨', 'Workshop', () => this.game.go('workshop'), 'purple'),
    );

    this.hud.innerHTML = '';
    this.hud.append(top, actions);
    if (!away) this.hud.append(stats);
    if (away) {
      this.awayTimer = h('div', { class: 'timer' }, '');
      const dest = s.vacation;
      this.statusEl = h('div', { class: 'status-text' }, '');
      this.hud.append(h('div', { class: 'away-banner' },
        h('h2', {}, `${s.gobName} is on vacation at ${dest.name}!`),
        h('div', { class: 'status' }, h('div', { class: 'status-label' }, 'Current status:'), this.statusEl),
        h('p', {}, 'Back in:'), this.awayTimer,
        h('p', {}, 'While you wait: build something cool in the Workshop!')));
      this.statusAt = 0;
      this.nextStatus();
    }
    this.refresh();
  }

  holdButton(label, fn) {
    const prog = h('div', { class: 'prog' });
    const b = h('button', { class: 'btn small holdbtn', title: 'Press and hold' }, label, prog);
    let timer = null, start = 0, raf = 0;
    const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); prog.style.width = '0'; };
    b.addEventListener('pointerdown', () => {
      start = performance.now();
      const step = () => { prog.style.width = Math.min(100, (performance.now() - start) / 12) + '%'; raf = requestAnimationFrame(step); };
      step();
      timer = setTimeout(() => { stop(); fn(); }, 1200);
    });
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointerleave', stop);
    b.addEventListener('pointercancel', stop);
    b.addEventListener('contextmenu', (e) => e.preventDefault()); // long-press menu on phones
    return b;
  }

  // Silly "what is the goblin doing right now" line while it's away.
  nextStatus() {
    const s = this.state;
    if (!s.vacation || !this.statusEl) return;
    const pool = [...(VACATION_STATUS[s.vacation.id] || []), ...VACATION_STATUS_ANY].filter((x) => x !== this.lastStatus);
    this.lastStatus = pool[Math.floor(Math.random() * pool.length)];
    this.statusEl.textContent = this.lastStatus;
    this.statusEl.classList.remove('pop'); void this.statusEl.offsetWidth; this.statusEl.classList.add('pop');
    this.statusAt = Date.now() + 12000;
  }

  refresh() {
    if (!this.coinsEl) return;
    const s = this.state;
    const amt = this.coinsEl.querySelector('.amt');
    if (amt.textContent !== String(s.coins)) {
      amt.textContent = s.coins;
      this.coinsEl.classList.remove('bump'); void this.coinsEl.offsetWidth; this.coinsEl.classList.add('bump');
    }
    for (const [k, el] of Object.entries(this.statEls || {})) {
      const v = s.stats[k];
      el.style.width = v + '%';
      el.className = 'fill' + (v < 25 ? ' low' : v < 50 ? ' mid' : '');
    }
    if (this.awayTimer && s.vacation) this.awayTimer.textContent = fmtTime(s.vacation.end - Date.now());
  }

  second() {
    this.refresh();
    if (this.state.vacation && this.statusEl && Date.now() > this.statusAt) this.nextStatus();
    if (!this.busy) this.game.applyMood();
  }

  // ---------- idle life ----------
  update(dt) {
    this.t += dt;
    const { goblin, world } = this.game;
    if (this.state.vacation || !goblin.object.visible) return;
    if (this.state.stats.clean < 30 && this.t > this.stinkAt) {
      this.stinkAt = this.t + 1.4;
      world.fx.stink(goblin.worldPoint('torso', 0, 12, 0));
    }
    if (this.busy || modalOpen()) return;
    if (this.t > this.idleAt) {
      this.idleAt = this.t + 7 + Math.random() * 9;
      const r = Math.random();
      if (r < 0.08 && this.state.stats.hunger > 60) { this.game.fart(); setTimeout(() => this.game.line('afterFart'), 1200); }
      else goblin.act(['scratch', 'lookAround', 'wiggle', 'wave', 'nod', 'hop'][Math.floor(Math.random() * 6)]);
    }
    if (this.t > this.chatAt) {
      this.chatAt = this.t + 18 + Math.random() * 20;
      const needy = this.game.S.neediest();
      this.game.line(needy ? { hunger: 'hungry', thirst: 'thirsty', clean: 'stinky', fun: 'bored' }[needy] : Math.random() < 0.3 ? 'happy' : 'idle');
    }
  }

  onKey(e) {
    if (e.key === 'Escape') closePanel();
  }

  // ---------- poking ----------
  onCanvasClick(e) {
    if (this.game.screen !== this || modalOpen()) return;
    const { world, goblin } = this.game;
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, world.viewCamera());
    const gob = goblin.object.visible ? this.raycaster.intersectObject(goblin.object, true)[0] : null;
    const decor = world.decorHit(this.raycaster);
    if (decor && (!gob || decor.distance < gob.distance)) this.pokeDecor(decor.spot);
    else if (gob && !this.state.vacation) this.poke();
  }

  // Clicking decor in the den makes it do its thing.
  pokeDecor(i) {
    const { world, goblin } = this.game;
    const d = world.decor[i];
    const it = d && getItem(d.id);
    if (!it) return;
    world.pokeDecor(i);
    const top = world.decorTop(i, 1);
    switch (it.poke) {
      case 'fart': sfx.fart(0.4); world.fx.fart(top, 0.5, new THREE.Vector3(0.3, 0, 1).normalize()); break;
      case 'squish': sfx.giggle(); world.fx.hearts(top, 3); break;
      case 'leaf':
        sfx.remove();
        world.fx.cube(top.clone().add(new THREE.Vector3(2, -3, 1)), '#a07a3a', { vel: new THREE.Vector3(3, 1, 2), gravity: -6, drag: 0.96, life: 2.2, s0: 1, s1: 1, spin: 3 });
        break;
      case 'bubbles':
        sfx.gulp();
        for (let k = 0; k < 5; k++) world.fx.sprite(top.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, 2)), 'bubble', { vel: new THREE.Vector3(0, 5, 0), life: 1.2, s0: 1, s1: 2.5, delay: k * 0.15 });
        break;
      case 'flush': sfx.splash(); setTimeout(() => sfx.whoosh(), 250); world.fx.bubbles(world.decorTop(i, -14), 10); break;
      case 'none': sfx.click(); break;
      default: sfx.place(); world.fx.stars(top, 6);
    }
    if (!goblin.object.visible || this.busy) return;
    goblin.emote(it.poke === 'fart' ? 'love' : 'happy', 1.6);
    if (!goblin.busy) goblin.act(it.poke === 'fart' ? 'wiggle' : 'nod');
    this.game.say(pick(it.lines || LINES.decorPoke, this.game.vars()), 3);
    this.idleAt = this.t + 6;
    this.chatAt = Math.max(this.chatAt, this.t + 10);
  }

  poke() {
    if (this.busy) return;
    const { goblin } = this.game;
    const now = Date.now();
    this.pokes = this.pokes.filter((t) => now - t < 60000);
    this.pokes.push(now);
    if (this.pokes.length <= 6) this.game.S.addStat('fun', 2);
    const r = Math.random();
    if (r < 0.18 && this.state.stats.hunger > 30) {
      this.game.fart().then(() => this.game.line('pokeFart'));
    } else if (r < 0.4) {
      goblin.act('spin'); sfx.giggle(); goblin.emote('cheeky', 1.5); this.game.line('poke', 2.5);
    } else if (r < 0.55) {
      goblin.act('bigHop'); goblin.emote('shocked', 1); sfx.giggle();
    } else {
      goblin.act('hop'); goblin.emote('happy', 1.2); sfx.giggle(); this.game.line('poke', 2.5);
    }
    this.idleAt = this.t + 8;
  }

  // ---------- feeding ----------
  openFeed() {
    const { world } = this.game;
    world.setView('side');
    const render = () => {
      const pantry = this.state.pantry;
      const ids = Object.keys(pantry).filter((id) => pantry[id] > 0 && getItem(id));
      if (!ids.length) {
        return h('div', { class: 'empty' }, 'The pantry is empty! 😱', h('br'), 'Buy snacks in the Shop.', h('br'), h('br'),
          button('Go to Shop', () => { closePanel(); openShop(this.game, 'snack'); }, 'gold'));
      }
      const grid = h('div', { class: 'grid' });
      for (const id of ids) {
        const it = getItem(id);
        grid.append(h('div', { class: 'card', onclick: () => this.feed(id, () => setPanelBody(render())) },
          h('span', { class: 'count' }, '×' + pantry[id]),
          h('img', { src: thumbnail(getModel(id), id) }),
          h('div', { class: 'nm' }, it.name),
          h('div', { class: 'pr' }, it.kind === 'drink' ? `💧+${it.thirst}` : `🍗+${it.hunger}`)));
      }
      return h('div', {}, h('p', { style: { margin: '0 0 10px' } }, 'Click a snack to toss it in!'), grid);
    };
    openPanel('Feed Me!', render(), { onClose: () => world.setView('home') });
  }

  async feed(id, after) {
    if (this.busy) return;
    const { goblin, world } = this.game;
    const s = this.state;
    const it = getItem(id);
    if (!it || !(s.pantry[id] > 0)) return;
    s.pantry[id]--;
    if (s.pantry[id] <= 0) delete s.pantry[id];
    this.game.S.save();
    track('feed', it.custom ? 'custom' : id);
    after?.();
    this.busy = true;
    const wasFull = it.kind === 'food' && s.stats.hunger > 90;

    // Toss the food into the goblin's mouth
    const mesh = buildMesh(getModel(id), { offset: [-5, -3, -5] });
    world.scene.add(mesh);
    const mouth = goblin.mouth();
    const start = mouth.clone().add(new THREE.Vector3(26, -18, 30));
    mesh.position.copy(start);
    mesh.scale.setScalar(0.7);
    sfx.whoosh();
    goblin.emote('shocked', 0.6);
    goblin.lookAt(1, 1);
    await new Promise((res) => this.game.tween(0.55, (p) => {
      const m = goblin.mouth();
      mesh.position.lerpVectors(start, m, p);
      mesh.position.y += Math.sin(p * Math.PI) * 14;
      mesh.rotation.y = p * 5; mesh.rotation.x = p * 3;
      mesh.scale.setScalar(0.7 - p * 0.25);
    }, res));
    goblin.lookAt(null);
    goblin.act('eat');
    goblin.chomp(1.3);
    if (it.kind === 'drink') sfx.gulp(); else sfx.chomp();
    await new Promise((res) => this.game.tween(1.1, (p) => {
      mesh.position.copy(goblin.mouth());
      mesh.scale.setScalar(Math.max(0.01, 0.45 * (1 - p)));
    }, res));
    world.scene.remove(mesh);
    mesh.geometry.dispose();

    this.game.S.addStat('hunger', it.hunger || 0);
    this.game.S.addStat('thirst', it.thirst || 0);
    this.game.line(wasFull ? 'full' : it.kind === 'drink' ? 'drink' : 'eat', 2.2);
    goblin.emote('happy', 1.5);
    world.fx.hearts(goblin.headTop(), 3);
    await this.game.wait(1.2);

    if (Math.random() < (it.burp ?? 0.3)) {
      await this.game.burp();
      this.game.line('afterBurp', 2);
      await this.game.wait(0.6);
    }
    if (wasFull || Math.random() < (it.gas ?? 0.4)) {
      await this.game.wait(0.4);
      await this.game.fart();
      this.game.line('afterFart', 2.5);
    }
    this.busy = false;
    this.game.applyMood();
  }

  // ---------- bath ----------
  async bath() {
    if (this.busy) return;
    const { goblin, world } = this.game;
    this.busy = true;
    closePanel();
    world.setView('home');
    this.game.line('bath', 2.5);
    goblin.emote('angry', 3.5);
    goblin.act('tantrum');
    sfx.splash();
    const pos = goblin.object.position.clone().add(new THREE.Vector3(0, 0, 4));
    world.fx.bubbles(pos);
    await this.game.wait(1.3);
    sfx.splash();
    world.fx.bubbles(pos, 24);
    goblin.act('shiver');
    goblin.emote('crying', 1.6);
    await this.game.wait(1.6);
    this.game.S.addStat('clean', 100);
    this.game.S.addStat('fun', -5);
    goblin.emote('gross', 3);
    world.fx.stars(goblin.headTop(), 8);
    this.game.line('afterBath', 3);
    await this.game.wait(1);
    this.busy = false;
  }
}
