// Swamp Sprint: race three rival goblins down the swamp track.
// Right answers give a speed boost (faster answers = bigger boost).
// A wrong answer makes you stumble. Two wrong in a row and you TRIP.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button, floater, modalOpen, nums, kb } from '../ui.js';
import { sfx } from '../audio.js';
import { VoxelModel, buildMesh, voxelMaterial } from '../voxel.js';
import { FX } from '../fx.js';
import { Goblin } from '../goblin.js';
import { SKINS } from '../goblinModel.js';
import { getModel } from '../items.js';
import { currentMax, pace, FactPicker } from '../math.js';
import { LINES, pick } from '../lines.js';
import { afterRound } from './games.js';
import { QuizCard, factProblem } from '../quiz.js';
import { track } from '../track.js';

const U = 4;              // world units per meter
const TRACK = 500;        // race length in meters
const JOG = 3.5;          // slowest running speed (m/s)
const TOP = 22;           // fastest running speed (m/s)
const DECAY = 0.3;        // how quickly a speed boost wears off
const LANES = [24, 0, -24, -48]; // z of each lane. The player runs in front.
const CHUNK = 160;        // length of one repeating piece of scenery
const FACING = 0.9;       // racers are turned a bit toward the camera so you can see faces
const PLACE = ['1st', '2nd', '3rd', '4th'];
const MEDAL = ['🥇', '🥈', '🥉', '🐌'];
const RIVALS = [
  { name: 'Slugsworth', speed: 6.5, outfit: { head: 'propeller' } },
  { name: 'Drippy', speed: 10, outfit: { head: 'cone', feet: 'bunnies' } },
  { name: 'Zippy Zorg', speed: 13.5, outfit: { face: 'shades', back: 'cape', feet: 'sneakers' } },
];
// Rivals get the first skins that don't match the player's goblin.
const RIVAL_SKINS = ['Moldy Gray', 'Bog Blue', 'Pumpkin', 'Grape Slime', 'Bubblegum', 'Swamp Green'];

const hash = (x, y, z) => {
  let n = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  n = Math.imul(n ^ (n >>> 13), 0x5bd1e995);
  return ((n ^ (n >>> 15)) >>> 0) % 1000 / 1000;
};
const rand = (a, b) => a + Math.random() * (b - a);
const bump = (p) => Math.sin(Math.PI * Math.max(0, Math.min(1, p)));

function signMesh(text, w, hgt, bg = '#fff4d6', fg = '#1b1020') {
  const c = document.createElement('canvas');
  c.width = w * 8; c.height = hgt * 8;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg;
  g.font = `${Math.floor(c.height * 0.5)}px "Press Start 2P", monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshLambertMaterial({ map: t }));
}

export class RaceScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#8fd3ff');
    this.scene.fog = new THREE.Fog('#8fd3ff', 350, 1000);
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 1100);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#6a7a50', 1.8));
    const sun = new THREE.DirectionalLight('#fff3dd', 2.0);
    sun.position.set(40, 80, 60);
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this.fx = new FX(this.scene);
    this.built = false;
    this.peels = [];
  }
  get state() { return this.game.state; }

  // ---------- the race track (built once) ----------
  chunkModel(variant) {
    const m = new VoxelModel(null);
    // track: 4 dirt lanes with dashed white lines, grass on both sides
    m.box(0, -1, -140, CHUNK, 0, 130, (x, y, z) => {
      const r = hash(x, z, variant);
      if (z >= 36 || z < -60) return r < 0.25 ? '#4f8a2a' : r < 0.65 ? '#5e9a32' : '#6aa83a';
      if (z === 35 || z === 34 || z === -60 || z === -59) return '#f4f1e6';
      if ([12, 13, -12, -11, -36, -35].includes(z) && x % 10 < 6) return '#f4f1e6';
      return r < 0.2 ? '#9a6c40' : r < 0.6 ? '#b0814f' : '#bb8d5a';
    });
    // trees, bushes and mushrooms behind the track
    for (let i = 0; i < 5; i++) {
      const tx = Math.round(10 + i * 30 + rand(-6, 6)), tz = Math.round(rand(-130, -85)), th = Math.round(rand(16, 34));
      m.box(tx, 0, tz, tx + 3, th, tz + 3, '#6b4423');
      m.sphere(tx + 1.5, th + 4, tz + 1.5, rand(8, 11), (x, y, z) => (hash(x, y, z) < 0.3 ? '#2f7a2a' : '#3f9a35'), rand(6, 8));
    }
    for (let i = 0; i < 6; i++) {
      const bx = rand(0, CHUNK), bz = rand(-80, -66);
      m.sphere(bx, 1, bz, rand(3, 5), (x, y, z) => (hash(x, y, z) < 0.4 ? '#3f8a30' : '#55a83a'), rand(2.5, 4));
    }
    for (let i = 0; i < 4; i++) {
      const mx = Math.round(rand(2, CHUNK - 4)), mz = Math.round(i % 2 ? rand(40, 52) : rand(-78, -64));
      m.box(mx, 0, mz, mx + 1, 3, mz + 1, '#efe6d0');
      m.sphere(mx + 0.5, 3, mz + 0.5, 2.4, (x, y, z) => (hash(x, y, z) < 0.25 ? '#ffffff' : '#e23a3a'), 1.6);
    }
    // a wooden fence along the back
    for (let x = 0; x < CHUNK; x++) {
      if (x % 8 === 0) m.box(x, 0, -64, x + 1, 7, -63, '#7a5230');
      m.set(x, 5, -64, '#8a6238');
      m.set(x, 2, -64, '#8a6238');
    }
    return m;
  }

  buildWorld() {
    this.built = true;
    const S = this.scene;
    const geos = [0, 1, 2].map((v) => buildMesh(this.chunkModel(v), { jitter: 0.1 }).geometry);
    for (let i = -2; i * CHUNK < TRACK * U + 600; i++) {
      const m = new THREE.Mesh(geos[(i + 3) % 3], voxelMaterial);
      m.position.x = i * CHUNK;
      S.add(m);
    }
    // far-away hills (chunky low-res voxels, scaled up)
    for (let x = -400; x < TRACK * U + 700; x += rand(70, 120)) {
      const hm = new VoxelModel(null);
      hm.sphere(0, 0, 0, rand(6, 10), (x, y, z) => (hash(x, y, z) < 0.3 ? '#5f9e5a' : '#6fae6a'), rand(3, 6));
      const hill = buildMesh(hm, { jitter: 0.12 });
      hill.scale.setScalar(7);
      hill.position.set(x, -4, -300 - rand(0, 60));
      S.add(hill);
    }

    // start and finish lines, checkered
    const checker = (x0, x1) => {
      const m = new VoxelModel(null);
      m.box(x0, 0, -60, x1, 1, 36, (x, y, z) => ((Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? '#1b1020' : '#f4f1e6'));
      return m;
    };
    const lines = checker(-4, 0);
    const fx = TRACK * U;
    for (const [x, y, z, c] of checker(fx, fx + 4).each()) lines.set(x, y, z, c);
    // finish arch
    const arch = (x0) => {
      lines.box(x0, 0, 38, x0 + 3, 44, 41, '#e2353f');
      lines.box(x0, 0, -66, x0 + 3, 44, -63, '#e2353f');
      lines.box(x0, 44, -66, x0 + 3, 50, 41, (x, y, z) => ((Math.floor(y / 3) + Math.floor(z / 3)) % 2 ? '#1b1020' : '#f4f1e6'));
    };
    arch(fx);
    S.add(buildMesh(lines, { jitter: 0.04 }));
    const finish = signMesh('FINISH', 64, 9, '#ffd23f');
    finish.position.set(fx + 1.5, 56, 0);
    S.add(finish);
    const start = signMesh('START', 40, 8, '#8fdc3a');
    start.position.set(-2, 8, 58);
    S.add(start);

    // distance signs every 100 m
    for (let d = 100; d < TRACK; d += 100) {
      const post = new VoxelModel(null);
      post.box(0, 0, 0, 2, 10, 2, '#7a5230');
      const pm = buildMesh(post);
      pm.position.set(d * U, 0, 46);
      S.add(pm);
      const sign = signMesh(`${d} m`, 18, 7);
      sign.position.set(d * U + 1, 13, 47.1);
      S.add(sign);
    }

    // banana peel (for tripping)
    const peel = new VoxelModel(null);
    peel.box(0, 0, 0, 4, 1, 2, '#ffe14d');
    peel.box(-2, 0, -1, 0, 1, 1, '#ffe14d'); peel.box(4, 0, 1, 6, 1, 3, '#ffe14d');
    peel.box(1, 0, 2, 3, 1, 4, '#f0c830');
    peel.set(4, 1, 0, '#6b4423');
    this.peelGeo = buildMesh(peel, { offset: [-2, 0, -1] }).geometry;

    // rival goblins
    this.rivals = RIVALS.map((def) => {
      const gob = new Goblin();
      gob.object.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      gob.shadow.visible = true;
      S.add(gob.object);
      return { ...def, gob };
    });
  }

  // ---------- screen lifecycle ----------
  enter() {
    const { world, goblin } = this.game;
    if (!this.built) this.buildWorld();
    world.active = { scene: this.scene, camera: this.camera };
    world.resize();
    this.scene.add(goblin.object);
    goblin.object.visible = true;
    goblin.object.rotation.set(0, FACING, 0);
    goblin.shadow.visible = true;
    goblin.lookAt(1, 0);

    // Rival skins never match the player's goblin.
    const skins = RIVAL_SKINS.map((n) => SKINS[n]).filter((s) => s !== this.state.skin);
    this.rivals.forEach((r, i) => {
      if (r.gob.skin !== skins[i]) r.gob.setSkin(skins[i]);
      const outfit = {};
      for (const [slot, id] of Object.entries(r.outfit)) outfit[slot] = getModel(id);
      r.gob.setOutfit(outfit);
      r.gob.object.rotation.set(0, FACING, 0);
    });
    this.racers = [
      { gob: goblin, name: 'YOU', you: true, lane: 0, color: this.state.skin },
      ...this.rivals.map((r, i) => ({ ...r, lane: i + 1, color: r.gob.skin })),
    ];
    for (const r of this.racers) r.gob.overlay = (o, t) => this.pose(r, o, t);
    this.player = this.racers[0];
    this.phase = 'ready';
    this.resetRacers();
    this.build();
    this.showReady();
    this.game.line('raceStart', 3);
  }
  exit() {
    const { world, goblin } = this.game;
    world.scene.add(goblin.object);
    goblin.object.position.set(0, 0, 0);
    goblin.object.rotation.set(0, 0, 0);
    goblin.shadow.visible = false;
    goblin.overlay = null;
    goblin.lookAt(null);
    world.active = null;
    this.root.innerHTML = '';
    clearInterval(this.cdTimer);
    clearTimeout(this.resultTimer);
  }

  resetRacers() {
    for (const r of this.racers) {
      Object.assign(r, { x: 0, v: 0, stride: Math.random() * 6, tripT: 0, tripDur: 1, wobbleT: 0, finishT: null, dustT: 0 });
      r.wob = Math.random() * 6;
      // Rivals sometimes trip too (it's a muddy track)
      r.slipAt = !r.you && Math.random() < 0.6 ? rand(80, TRACK - 60) : null;
      r.gob.object.position.set(0, 0, LANES[r.lane]);
    }
    for (const p of this.peels) this.scene.remove(p);
    this.peels = [];
    this.order = [];
    this.time = 0;
    this.camX = null;
  }

  // Running pose, added on top of the goblin's normal idle wiggles.
  pose(r, o, t) {
    if (this.phase === 'ready' || this.phase === 'countdown') {
      o.rx += 0.3; o.sy *= 0.95; o.armLx += 0.6; o.armRx += 0.6; // ready... set...
      return;
    }
    if (r.tripT > 0) {
      const p = 1 - r.tripT / r.tripDur;
      const down = Math.min(1, p / 0.12) - Math.max(0, (p - 0.75) / 0.25);
      o.rx += 1.45 * down; o.y += 4 * down;
      o.armLx -= 2.6 * down; o.armRx -= 2.6 * down;
      o.earL += 0.5 * down; o.earR -= 0.5 * down;
      return;
    }
    if (r.finishT != null && r.v < 1.5) {
      // done! arms up
      o.armL -= 2.4; o.armR += 2.4;
      o.y += 2 * Math.abs(Math.sin(t * 6));
      return;
    }
    const k = Math.min(1, r.v / 14);
    const s = Math.sin(r.stride);
    o.y += Math.abs(s) * (0.8 + 2.2 * k);
    o.rx += 0.1 + 0.25 * k;
    o.armLx += s * (0.5 + 0.9 * k);
    o.armRx -= s * (0.5 + 0.9 * k);
    o.rz += 0.05 * s;
    o.earL += 0.35 * k; o.earR -= 0.35 * k;
    if (r.wobbleT > 0) { // stumbling: arms windmill
      const w = r.wobbleT / 0.8;
      o.rx += 0.5 * w;
      o.armL -= (1.5 + Math.sin(t * 25)) * w; o.armR += (1.5 + Math.cos(t * 25)) * w;
      o.rz += 0.25 * Math.sin(t * 18) * w;
    }
  }

  build() {
    this.trackBar = h('div', { class: 'race-bar' });
    this.markers = this.racers.map((r) => {
      const m = h('div', { class: 'race-dot' + (r.you ? ' you' : ''), style: { background: r.color, top: (4 + (3 - r.lane) * 10) + 'px' } }, r.you ? 'YOU' : '');
      this.trackBar.append(m);
      return m;
    });
    this.trackBar.append(h('div', { class: 'race-flag' }, '🏁'));
    this.timePill = h('div', { class: 'pill alt-pill' }, '0.0 s');
    this.placePill = h('div', { class: 'pill place-pill' }, '1st');
    this.card = h('div', { class: 'g-card' });
    this.speedPill = h('div', { class: 'pill' }, 'Speed 0');
    this.comboPill = h('div', { class: 'pill combo' }, 'Combo 0');
    this.bestPill = h('div', { class: 'pill' }, this.bestText());
    this.meta = h('div', { class: 'g-meta' }, this.speedPill, this.comboPill, this.bestPill);
    this.tags = this.rivals.map((r) => h('div', { class: 'race-tag hidden' }, r.name));
    this.quiz = new QuizCard(this.card, {
      onAnswer: (ok, secs, p) => this.onAnswer(ok, secs, p),
      onFixed: () => this.next(),
    });
    this.root.innerHTML = '';
    this.root.append(h('div', { class: 'gauntlet' },
      ...this.tags,
      h('div', { class: 'g-top' },
        h('div', { class: 'pill' }, '🏁 SWAMP SPRINT'),
        this.trackBar,
        this.placePill,
        this.timePill,
        button('Quit', () => this.quit(), 'small red')),
      h('div', { class: 'g-box race-box' }, this.card, this.meta)));
  }

  bestText() {
    const s = this.state;
    return s.raceBest ? `Best: ${s.raceBest.toFixed(1)} s` : 'Best: -';
  }

  showReady() {
    this.meta.classList.add('hidden');
    this.card.replaceChildren(
      h('div', { class: 'g-prob', style: { fontSize: '28px' } }, 'SWAMP SPRINT!'),
      h('p', { style: { fontSize: '19px', lineHeight: 1.4 } },
        nums(`Race ${TRACK} meters against 3 goblins. Every right answer gives you a speed boost, and FAST answers boost more.`), h('br'),
        'A wrong answer makes you stumble. Two in a row and you TRIP!'),
      h('p', { style: { fontSize: '18px' } }, nums(this.state.raceBest ? `Fastest race: ${this.state.raceBest.toFixed(1)} seconds` : 'Can you beat Zippy Zorg?')),
      h('div', { style: { marginTop: '16px' } }, button('START RACE' + kb(' (Enter)'), () => this.countdown(), 'gold big')));
  }

  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    this.phase = 'countdown';
    this.resetRacers();
    this.meta.classList.add('hidden');
    let n = 3;
    const show = () => this.card.replaceChildren(h('div', { class: 'countdown' }, n > 0 ? n : 'GO!'));
    show(); sfx.tick();
    this.cdTimer = setInterval(() => {
      n--;
      show();
      if (n > 0) sfx.tick();
      else { clearInterval(this.cdTimer); sfx.go(); setTimeout(() => this.startRace(), 250); }
    }, 650);
  }

  startRace() {
    track('game_start', 'race');
    this.picker = new FactPicker(this.state.facts, this.state.settings, currentMax(this.state));
    this.fast = this.state.settings.fastSeconds;
    // If a grown-up made the target time longer, the rivals run a bit slower too.
    this.speedScale = Math.max(0.75, Math.min(1.2, Math.sqrt(3 / this.fast))) * Math.sqrt(pace(this.state));
    this.correct = 0; this.total = 0; this.combo = 0; this.bestCombo = 0; this.times = [];
    this.wrongRow = 0; this.trips = 0;
    this.player.v = JOG + 2;
    this.phase = 'play';
    this.meta.classList.remove('hidden');
    this.updateMeta();
    this.next();
  }

  next() {
    if (this.phase !== 'play') return;
    this.quiz.show(factProblem(this.picker.next()));
  }

  updateMeta() {
    this.comboPill.textContent = `Combo ${this.combo}${this.combo >= 5 ? ' 🔥' : ''}`;
    this.comboPill.classList.toggle('hot', this.combo >= 5);
  }

  onKey(e) {
    if (modalOpen()) return;
    if (this.phase === 'ready' || this.phase === 'results') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.countdown(); }
      if (e.key === 'Escape') this.game.go('home');
      return;
    }
    if (this.phase !== 'play') return;
    if (e.key === 'Escape') { this.quit(); return; }
    this.quiz.key(e);
  }

  onAnswer(ok, secs, p) {
    const { goblin } = this.game;
    const me = this.player;
    this.total++;
    this.picker.record(p, ok, secs);
    if (ok) {
      this.correct++; this.combo++; this.wrongRow = 0;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.times.push(secs);
      const boost = 5 + (secs <= this.fast ? 3 : 0) + (secs <= this.fast / 2 ? 2 : 0) + Math.min(3, Math.floor(this.combo / 3));
      if (me.tripT <= 0) me.v = Math.min(TOP, Math.max(me.v, JOG) + boost);
      else me.v = boost; // gets up running
      sfx.correct(this.combo);
      if (secs <= this.fast) sfx.whoosh();
      goblin.emote(this.combo >= 5 ? 'ecstatic' : 'happy', 0.9);
      if (this.combo % 5 === 0) { sfx.combo(this.combo); this.fx.stars(goblin.headTop(), 8); this.game.line('raceBoost', 1.5); }
      const r = this.card.getBoundingClientRect();
      floater(r.left + r.width / 2, r.top + 10, `+${boost} speed`, '#9be060');
      this.next();
      this.quiz.setSpeed(secs <= this.fast / 2 ? '⚡ TURBO BOOST!' : secs <= this.fast ? 'Quick!' : '');
    } else {
      this.combo = 0;
      this.wrongRow++;
      sfx.wrong();
      if (this.wrongRow >= 2) this.trip(me);
      else {
        me.v *= 0.35;
        me.wobbleT = 0.8;
        goblin.emote('nervous', 1.5);
        this.game.line('raceStumble', 1.6);
        this.dust(me, 10);
      }
    }
    this.updateMeta();
  }

  trip(r) {
    r.tripT = r.tripDur = r.you ? 1.6 : 1.1;
    r.v = 0;
    r.wobbleT = 0;
    if (r.you) {
      this.trips++;
      this.wrongRow = 0;
      sfx.thud();
      this.game.goblin.emote('dizzy', 2);
      this.game.line('raceTrip', 2);
      const peel = new THREE.Mesh(this.peelGeo, voxelMaterial);
      peel.position.set(r.x * U - 4, 0.05, LANES[r.lane] + 2);
      peel.rotation.y = rand(-0.5, 0.5);
      this.scene.add(peel);
      this.peels.push(peel);
    } else {
      r.gob.emote('dizzy', 1.5);
      if (Math.abs(r.x - this.player.x) < 25) {
        sfx.thud();
        this.game.say(pick(LINES.raceRivalTrip, { rival: r.name }), 2);
      }
    }
    this.dust(r, 14);
  }

  dust(r, n) {
    const pos = r.gob.object.position;
    for (let i = 0; i < n; i++) {
      this.fx.cube(new THREE.Vector3(pos.x + rand(-4, 4), 1, pos.z + rand(-3, 3)), i % 2 ? '#b0814f' : '#d8b48a', {
        vel: new THREE.Vector3(rand(-10, 4), rand(4, 12), rand(-4, 4)), gravity: -20, life: 0.8, s0: 1.5, s1: 0.3, drag: 0.94, spin: 3,
      });
    }
  }

  // How fast a rival wants to run. They ease off a little when far ahead,
  // and try a bit harder when far behind, so races stay close.
  rivalTarget(r) {
    const gap = r.x - this.player.x;
    let rubber = 1;
    if (this.player.finishT == null) {
      if (gap > 20) rubber = Math.max(0.8, 1 - (gap - 20) / 120);
      else if (gap < -20) rubber = Math.min(1.15, 1 + (-gap - 20) / 150);
    }
    return r.speed * this.speedScale * rubber * (1 + 0.07 * Math.sin(this.time * 0.8 + r.wob));
  }

  update(dt) {
    const t = performance.now() / 1000;
    const running = this.phase === 'play' || this.phase === 'finished' || this.phase === 'results';
    if (this.phase === 'play' || this.phase === 'finished') this.time += dt;
    if (running) {
      for (const r of this.racers) {
        if (r.tripT > 0) {
          r.tripT -= dt; r.v = 0;
          if (r.tripT <= 0 && !r.you) r.v = 3;
        } else if (r.finishT != null || (r.you && this.phase !== 'play')) {
          r.v *= Math.exp(-1.6 * dt); // slow down after the finish line (or after quitting)
        } else if (r.you) {
          const floor = this.quiz.fixing ? JOG * 0.6 : JOG; // limp along while fixing a mistake
          const rate = r.v < floor ? 2 : DECAY;
          r.v = Math.min(TOP, floor + (r.v - floor) * Math.exp(-rate * dt));
        } else {
          r.v += (this.rivalTarget(r) - r.v) * (1 - Math.exp(-1.2 * dt));
        }
        r.wobbleT = Math.max(0, r.wobbleT - dt);
        const before = r.x;
        r.x += r.v * dt;
        r.stride += dt * (4 + r.v * 0.9);
        if (r.slipAt != null && r.x >= r.slipAt) { r.slipAt = null; this.trip(r); }
        if (r.finishT == null && r.x >= TRACK) {
          r.finishT = this.time;
          this.order.push(r);
          if (r.you) this.finish();
          else r.gob.emote('smug', 3);
        }
        // You passed someone!
        if (r.you && this.phase === 'play') {
          for (const o of this.racers) {
            if (o === r || o.finishT != null) continue;
            if (before < o.x && r.x >= o.x) this.passed(o);
          }
        }
        // dust kicked up by fast feet
        r.dustT -= dt;
        if (r.v > 7 && r.dustT <= 0 && r.tripT <= 0) {
          r.dustT = r.you ? 0.06 : 0.12;
          const p = r.gob.object.position;
          this.fx.cube(new THREE.Vector3(p.x - 3, 0.5, p.z + rand(-2, 2)), Math.random() < 0.5 ? '#b0814f' : '#c9a070', {
            vel: new THREE.Vector3(-r.v * 0.8, rand(3, 8), rand(-2, 2)), gravity: -15, life: 0.6, s0: 1.4, s1: 0, drag: 0.95, spin: 4,
          });
        }
      }
    }

    for (const r of this.racers) {
      r.gob.object.position.set(r.x * U, 0, LANES[r.lane]);
      if (!r.you) r.gob.update(dt);
    }

    // camera follows the player, who stays on the left side of the screen
    const target = this.player.x * U + 46;
    this.camX = this.camX == null ? target : this.camX + (target - this.camX) * Math.min(1, dt * 5);
    this.camera.position.set(this.camX, 100, 255);
    this.camera.lookAt(this.camX, 6, -12);
    this.sun.position.set(this.camX + 40, 80, 60);
    this.sun.target.position.set(this.camX, 0, 0);
    this.fx.update(dt);
    this.updateHud();
  }

  updateHud() {
    if (!this.markers) return;
    this.racers.forEach((r, i) => {
      this.markers[i].style.left = `calc(${Math.min(1, r.x / TRACK) * 100}% - ${r.you ? 18 : 7}px)`;
    });
    if (this.phase === 'play') {
      this.timePill.textContent = `${this.time.toFixed(1)} s`;
      this.placePill.textContent = PLACE[this.placeOf(this.player) - 1];
      this.speedPill.textContent = `Speed ${Math.round(this.player.v * 3.6)} km/h`;
    }
    // name tags over the rivals
    this.rivals.forEach((rv, i) => {
      const tag = this.tags[i];
      const r = this.racers[i + 1];
      const p = this.game.world.toScreen(r.gob.headTop().add(new THREE.Vector3(0, 4, 0)));
      const show = this.phase !== 'ready' && p.x > 20 && p.x < innerWidth - 20 && p.y > 70 && !p.behind;
      tag.classList.toggle('hidden', !show);
      if (show) { tag.style.left = p.x + 'px'; tag.style.top = p.y + 'px'; }
    });
  }

  placeOf(r) {
    if (r.finishT != null) return this.order.indexOf(r) + 1;
    return this.order.length + 1 + this.racers.filter((o) => o !== r && o.finishT == null && o.x > r.x).length;
  }

  passed(o) {
    const r = this.card.getBoundingClientRect();
    floater(r.left + r.width / 2, r.top - 20, `Passed ${o.name}!`, '#ffd23f');
    sfx.coin();
    if (Math.random() < 0.6) this.game.say(pick(LINES.racePass, { rival: o.name }), 1.6);
  }

  finish() {
    const { goblin } = this.game;
    this.phase = 'finished';
    this.quiz.problem = null;
    this.place = this.placeOf(this.player);
    this.raceTime = this.player.finishT;
    this.timePill.textContent = `${this.raceTime.toFixed(1)} s`;
    this.placePill.textContent = PLACE[this.place - 1];
    this.card.replaceChildren(h('div', { class: 'countdown', style: { fontSize: '44px' } }, `${PLACE[this.place - 1]}!`));
    if (this.place === 1) {
      sfx.fanfare();
      this.fx.confetti(goblin.headTop(), 60);
      goblin.emote('ecstatic', 3);
      this.game.line('raceWin', 3);
    } else {
      sfx.combo(4 - this.place);
      goblin.emote(this.place === 4 ? 'sad' : 'happy', 3);
      this.game.line(this.place === 4 ? 'raceLast' : 'raceFinish', 3);
    }
    this.resultTimer = setTimeout(() => this.showResults(), 2200);
  }

  quit() {
    if (this.phase === 'play') {
      this.phase = 'finished';
      this.quiz.problem = null;
      this.place = 0;
      this.raceTime = null;
      this.showResults();
    } else this.game.go('home');
  }

  showResults() {
    const { goblin, S } = this.game;
    const s = this.state;
    this.phase = 'results';
    const finished = this.place > 0;
    const newBest = finished && (!s.raceBest || this.raceTime < s.raceBest);
    let coins = this.correct + (finished ? [15, 10, 6, 3][this.place - 1] : 0);
    if (newBest) { coins += 10; s.raceBest = Math.round(this.raceTime * 10) / 10; }
    if (this.place === 1) s.raceWins = (s.raceWins || 0) + 1;
    S.addCoins(coins);
    const avg = this.times.length ? this.times.reduce((a, b) => a + b, 0) / this.times.length : 0;
    s.history.push({ t: Date.now(), game: 'race', correct: this.correct, total: this.total, avg, streak: this.bestCombo, score: this.place });
    track('game_end', 'race', this.correct);
    if (s.history.length > 200) s.history.shift();
    if (this.total > 0) S.addStat('fun', 12);
    S.save();
    afterRound(this.game);
    const acc = this.total ? Math.round((this.correct / this.total) * 100) : 0;
    this.bestPill.textContent = this.bestText();
    this.meta.classList.add('hidden');

    const title = finished ? `${MEDAL[this.place - 1]} ${PLACE[this.place - 1].toUpperCase()} PLACE!` : 'You left the race';
    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', { style: { fontFamily: 'var(--title)', fontSize: '18px', margin: '0 0 6px' } }, title),
      finished ? h('p', { style: { margin: '0 0 6px', fontWeight: 700 } }, nums(`You finished in ${this.raceTime.toFixed(1)} seconds!`)) : null,
      newBest ? h('div', { class: 'res-best' }, 'NEW FASTEST RACE! +10¢') : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Right answers', h('b', {}, this.correct)),
        h('div', {}, 'Accuracy', h('b', {}, acc + '%')),
        h('div', {}, 'Avg speed', h('b', {}, avg ? avg.toFixed(1) + 's' : '-')),
        h('div', {}, 'Trips', h('b', {}, this.trips)),
        h('div', { style: { gridColumn: '1 / -1', background: 'var(--gold)' } }, 'Coins earned', h('b', {}, `${coins}¢`))),
      h('div', { class: 'row', style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px' } },
        button('Race again!' + kb(' (Enter)'), () => this.countdown(), 'gold'),
        button('Home' + kb(' (Esc)'), () => this.game.go('home'), ''))));
    if (newBest) { this.game.line('newBest', 3); }
    if (this.place === 1) goblin.act('dance');
  }
}
