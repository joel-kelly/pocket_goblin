// Squid Smackdown: a boxing match against Big Inky, a giant squid.
// - Every right answer is a punch. Faster answers punch harder.
// - Big Inky winds up a tentacle. Answer before it lands to DODGE and COUNTER (double damage).
// - Too slow and the tentacle lands. A wrong answer gets you slapped right away.
// - Knock Big Inky down 3 times to win. He gets angrier (and faster) each time he gets up.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button, floater, modalOpen, nums, kb, IS_TOUCH, placeBubble } from '../ui.js';
import { sfx } from '../audio.js';
import { VoxelModel, buildMesh } from '../voxel.js';
import { FX } from '../fx.js';
import { PARTS } from '../goblinModel.js';
import { currentMax, FactPicker, pace, tunePace } from '../math.js';
import { SQUID_TAUNTS, pick } from '../lines.js';
import { afterRound } from './games.js';
import { QuizCard, factProblem } from '../quiz.js';
import { track } from '../track.js';

const SQUID_Z = -58;
const GOB_Z = 10;
const GOB_HP = 100;
const HIT_DMG = 20;   // a tentacle that lands
const SLAP_DMG = 10;  // the slap you get for a wrong answer
const HEAL = 25;      // health back each time Big Inky goes down
const ROUNDS = [
  { hp: 60, wind: 1, tint: '#ffffff' },
  { hp: 80, wind: 0.85, tint: '#ffc4c4' },
  { hp: 100, wind: 0.72, tint: '#ff9090' },
];
const HY = 58; // height of Big Inky's face
const SKIN = '#e8607e', SKIN_D = '#b83a62', SKIN_L = '#ff9ab0';

const hash = (x, y, z) => {
  let n = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  n = Math.imul(n ^ (n >>> 13), 0x5bd1e995);
  return ((n ^ (n >>> 15)) >>> 0) % 1000 / 1000;
};
const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const bump = (p) => Math.sin(Math.PI * clamp01(p));
const lerp = (a, b, k) => a + (b - a) * k;
const cube = new THREE.BoxGeometry(1, 1, 1);

// A boxing glove, drawn so its cuff sits at the origin and the fist points down -y.
function gloveModel(s = 1) {
  const m = new VoxelModel(null);
  const r = Math.round(4 * s), len = Math.round(9 * s);
  m.box(-r, -len, -r, r, -2, r, (x, y, z) => (hash(x, y, z) < 0.15 ? '#c82030' : '#e2353f'));
  m.box(-r - 1, -len + 2, -1, -r, -len + 6, 2, '#e2353f'); // thumb
  m.box(-r + 1, -2, -r + 1, r - 1, 0, r - 1, '#f4f1e6');   // cuff
  return m;
}

export class SquidScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1f2a66');
    this.scene.fog = new THREE.Fog('#1f2a66', 260, 520);
    this.camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 900);
    // Retro look: frame on a point between the goblin and Big Inky so neither looks oversized.
    this.camera.userData.focusZ = -30;
    this.scene.add(new THREE.HemisphereLight('#c8d8ff', '#3a3050', 1.7));
    const sun = new THREE.DirectionalLight('#fff3dd', 1.9);
    sun.position.set(30, 90, 90);
    this.scene.add(sun);
    this.fx = new FX(this.scene);
    this.built = false;
  }
  get state() { return this.game.state; }

  // ---------- the ring + Big Inky (built once) ----------
  buildWorld() {
    this.built = true;
    const S = this.scene;

    // sea
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshLambertMaterial({ color: '#2a5fb0' }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -9;
    S.add(sea);
    this.foam = [];
    for (let i = 0; i < 40; i++) {
      const f = new THREE.Mesh(cube, new THREE.MeshBasicMaterial({ color: '#cfe6ff' }));
      const a = rand(0, Math.PI * 2), d = rand(110, 300);
      f.position.set(Math.cos(a) * d, -8.5, Math.sin(a) * d - 60);
      f.scale.set(rand(4, 10), 1, 1.5);
      f.userData.ph = rand(0, 6);
      S.add(f);
      this.foam.push(f);
    }
    // moon
    const moon = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 2), new THREE.MeshBasicMaterial({ color: '#fff6c0' }));
    moon.position.set(-150, 160, -420);
    S.add(moon);
    const pts = [];
    for (let i = 0; i < 300; i++) pts.push(rand(-600, 600), rand(60, 400), rand(-500, -430));
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    S.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false })));

    // the ring: a floating platform with a blue mat, posts and ropes
    const ring = new VoxelModel(null);
    const X0 = -64, X1 = 64, Z0 = -112, Z1 = 34;
    ring.box(X0, -1, Z0, X1, 0, Z1, (x, y, z) => {
      const edge = x < X0 + 4 || x >= X1 - 4 || z < Z0 + 4 || z >= Z1 - 4;
      if (edge) return '#f4f1e6';
      return hash(x, z, 1) < 0.5 ? '#3a7ad9' : '#3672cf';
    });
    for (let y = -8; y < -1; y++) {
      for (let x = X0; x < X1; x++) { ring.set(x, y, Z0, '#c83040'); ring.set(x, y, Z1 - 1, y % 3 ? '#c83040' : '#ffd23f'); }
      for (let z = Z0; z < Z1; z++) { ring.set(X0, y, z, '#c83040'); ring.set(X1 - 1, y, z, '#c83040'); }
    }
    const posts = [[X0, Z0, '#e2353f'], [X1 - 4, Z0, '#4fb3ff'], [X0, Z1 - 4, '#4fb3ff'], [X1 - 4, Z1 - 4, '#e2353f']];
    for (const [x, z, c] of posts) {
      ring.box(x, 0, z, x + 4, 22, z + 4, c);
      ring.box(x, 22, z, x + 4, 24, z + 4, '#f4f1e6');
    }
    S.add(buildMesh(ring, { jitter: 0.06 }));
    // ropes on the back and sides (none in front, so they don't block the view)
    const ropeCols = ['#f4f1e6', '#e2353f', '#4fb3ff'];
    [8, 14, 20].forEach((y, i) => {
      const mat = new THREE.MeshLambertMaterial({ color: ropeCols[i] });
      const back = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0 - 4, 1.2, 1.2), mat);
      back.position.set(0, y, Z0 + 2);
      S.add(back);
      for (const x of [X0 + 2, X1 - 2]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, Z1 - Z0 - 4), mat);
        side.position.set(x, y, (Z0 + Z1) / 2);
        S.add(side);
      }
    });
    // spotlight beams
    for (const x of [-90, 90]) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(4, 34, 190, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(x * 0.55, 80, -40);
      beam.rotation.z = x > 0 ? -0.45 : 0.45;
      S.add(beam);
    }

    // fishy fans in the water, bobbing and cheering
    this.fans = [];
    const fanCols = ['#ffb020', '#5fd6e8', '#ff86b8', '#9be060', '#c4a0ff'];
    for (let i = 0; i < 14; i++) {
      const m = new VoxelModel(null);
      const c = fanCols[i % fanCols.length];
      m.sphere(0, 0, 0, 5, c, 6);
      m.box(-4, 1, 3, -1, 4, 6, '#ffffff'); m.box(1, 1, 3, 4, 4, 6, '#ffffff');
      m.box(-3, 2, 5, -2, 3, 6, '#1b1020'); m.box(2, 2, 5, 3, 3, 6, '#1b1020');
      m.box(-2, -3, 4, 2, -1, 6, '#5a1020');
      const fan = buildMesh(m);
      const side = i % 2 ? 1 : -1;
      fan.position.set(side * rand(80, 150), -8, rand(-180, 10));
      fan.lookAt(0, -8, -40);
      fan.userData.ph = rand(0, 6);
      S.add(fan);
      this.fans.push(fan);
    }

    this.buildSquid();

    // boxing gloves for the goblin (added to its arms during the fight)
    this.gobGloves = ['armL', 'armR'].map((part) => {
      const pv = PARTS[part].pivot;
      const m = new VoxelModel(null);
      const x0 = part === 'armL' ? -10 : 5;
      m.box(x0, 0, -3, x0 + 5, 6, 3, (x, y, z) => (hash(x, y, z) < 0.15 ? '#c82030' : '#e2353f'));
      m.box(x0, 6, -2, x0 + 5, 7, 2, '#f4f1e6');
      return buildMesh(m, { offset: [-pv[0], -pv[1], -pv[2]] });
    });
  }

  buildSquid() {
    const sq = new THREE.Group();
    this.squid = sq;
    this.mats = [];
    const mkMat = (opts) => { const m = new THREE.MeshLambertMaterial(opts); this.mats.push(m); return m; };
    this.bodyMat = mkMat({ vertexColors: true });
    this.tentMats = [mkMat({ color: SKIN }), mkMat({ color: SKIN_D })];
    this.tentMats.forEach((m) => { m.userData.base = new THREE.Color(m.color); });

    const body = new VoxelModel(null);
    const col = (x, y, z) => (hash(Math.floor(x / 3), Math.floor(y / 3), Math.floor(z / 3)) < 0.2 ? SKIN_D : z > 9 && y < 70 ? SKIN_L : SKIN);
    body.sphere(0, HY, 0, 16, col, 13); // head
    const mantle = (y) => { const p = (y - HY - 10) / 56; return 15 + 3 * Math.sin(p * Math.PI * 0.9) - 11 * p * p; };
    for (let y = HY + 10; y < HY + 66; y++) body.cyl(0.5, 0.5, mantle(y), y, y + 1, col); // the long mantle
    for (let y = HY + 42; y < HY + 66; y++) { // fins at the top
      const p = (y - HY - 42) / 24;
      const r = mantle(y);
      const w = 4 + 12 * Math.sin(p * Math.PI);
      for (let x = Math.floor(r - 2); x < r + w; x++) for (let z = -1; z < 2; z++) {
        body.set(x, y, z, SKIN_D); body.set(-x, y, z, SKIN_D);
      }
    }
    for (const sx of [-9, 9]) body.sphere(sx + 0.5, HY + 3, 10, 7.5, '#fbf7e8'); // eyeballs
    body.box(-4, HY - 9, 13, 4, HY - 6, 15, '#5a1020'); // mouth
    sq.add(buildMesh(body, { material: this.bodyMat, jitter: 0.08 }));

    // pupils, angry brows, and a mouth that opens when he laughs
    const black = new THREE.MeshLambertMaterial({ color: '#1b1020' });
    this.pupils = [-9, 9].map((sx) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 2), black);
      p.position.set(sx + 0.5, HY + 3, 17.6);
      sq.add(p);
      return p;
    });
    this.brows = [-9, 9].map((sx) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(10, 2.4, 3), black);
      b.position.set(sx + 0.5, HY + 12, 15);
      b.rotation.z = sx < 0 ? -0.4 : 0.4;
      sq.add(b);
      return b;
    });
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 1), new THREE.MeshLambertMaterial({ color: '#2a0810' }));
    this.mouth.position.set(0.5, HY - 7.5, 15.2);
    sq.add(this.mouth);

    // A tentacle is a chain of segments. Each segment hangs down -y from its parent.
    const chain = (n, len, th0, th1) => {
      const root = new THREE.Group();
      const segs = [];
      let parent = root;
      for (let i = 0; i < n; i++) {
        const g = new THREE.Group();
        if (i > 0) g.position.y = -len;
        parent.add(g);
        const th = th0 + (th1 - th0) * (i / Math.max(1, n - 1));
        const m = new THREE.Mesh(cube, this.tentMats[i % 2]);
        m.scale.set(th, len + 0.8, th);
        m.position.y = -len / 2;
        g.add(m);
        // suckers
        if (i % 2 === 0 && i < n - 1) {
          const s = new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: '#ffd0dc' }));
          s.scale.set(th * 0.5, th * 0.5, 1);
          s.position.set(0, -len / 2, th / 2);
          g.add(s);
        }
        segs.push(g);
        parent = g;
      }
      return { root, segs, len };
    };

    // 6 legs standing on the mat
    this.legs = [20, -20, 75, -75, 135, -135].map((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const holder = new THREE.Group();
      holder.position.set(Math.sin(a) * 11, HY - 10, Math.cos(a) * 11);
      holder.rotation.y = a;
      const c = chain(8, 7.5, 6, 2.5);
      holder.add(c.root);
      sq.add(holder);
      return { ...c, ph: i * 1.3 };
    });

    // 2 boxing arms
    this.arms = [-1, 1].map((side) => {
      const holder = new THREE.Group();
      holder.position.set(side * 14, HY - 4, 7);
      holder.rotation.y = -side * 0.22; // aim a little inward, at the goblin
      const c = chain(6, 7, 5, 4);
      const glove = buildMesh(gloveModel(1.15));
      glove.position.y = -c.len;
      c.segs[c.segs.length - 1].add(glove);
      holder.add(c.root);
      sq.add(holder);
      return { ...c, side, holder, a0: -0.5, d: -0.25 };
    });

    sq.scale.setScalar(1);
    sq.position.set(0, 0, SQUID_Z);
    this.scene.add(sq);
  }

  // ---------- screen lifecycle ----------
  enter() {
    const { world, goblin } = this.game;
    if (!this.built) this.buildWorld();
    world.active = { scene: this.scene, camera: this.camera };
    world.resize();
    this.scene.add(goblin.object);
    goblin.object.visible = true;
    goblin.object.position.set(0, 0, GOB_Z);
    goblin.object.rotation.set(0, Math.PI, 0); // back to the camera, facing the squid
    goblin.shadow.visible = true;
    goblin.lookAt(null);
    goblin.overlay = (o, t) => this.pose(o, t);
    goblin.groups.armL.add(this.gobGloves[0]);
    goblin.groups.armR.add(this.gobGloves[1]);
    if (goblin.itemMeshes.hand) goblin.itemMeshes.hand.visible = false;
    this.phase = 'ready';
    this.reset();
    this.build();
    this.showReady();
    this.game.line('squidStart', 3);
    setTimeout(() => this.taunt('start'), 1200);
  }
  exit() {
    const { world, goblin } = this.game;
    world.scene.add(goblin.object);
    goblin.object.position.set(0, 0, 0);
    goblin.object.rotation.set(0, 0, 0);
    goblin.shadow.visible = false;
    goblin.overlay = null;
    goblin.groups.armL.remove(this.gobGloves[0]);
    goblin.groups.armR.remove(this.gobGloves[1]);
    if (goblin.itemMeshes.hand) goblin.itemMeshes.hand.visible = true;
    world.active = null;
    this.root.innerHTML = '';
    clearInterval(this.cdTimer);
    this.timers?.forEach(clearTimeout);
  }

  later(sec, fn) { (this.timers ||= []).push(setTimeout(fn, sec * 1000)); }

  reset() {
    this.timers?.forEach(clearTimeout);
    this.timers = [];
    this.round = 0;
    this.squidHP = ROUNDS[0].hp;
    this.gobHP = GOB_HP;
    this.knockdowns = 0;
    this.atk = null;
    this.nextAtk = 3;
    this.punchT = 0; this.punchArm = 0; this.punchSuper = false;
    this.hitT = 0; this.dodgeT = 0; this.dodgeDir = 1;
    this.hurtT = 0; this.flashT = 0; this.shakeT = 0; this.laughT = 0;
    this.downT = 0; this.sqFall = 0; this.lunge = 0;
    this.pending = [];
    this.fightT = 0;
    this.setTint();
  }

  setTint() {
    const tint = new THREE.Color(ROUNDS[this.round].tint);
    this.bodyMat.color.copy(tint);
    for (const m of this.tentMats) m.color.copy(m.userData.base).multiply(tint);
    this.brows.forEach((b) => { b.visible = this.round > 0; });
  }

  // Goblin boxing pose, added on top of its normal idle wiggles.
  pose(o, t) {
    if (this.phase === 'lost') return;
    if (this.phase === 'won') { o.armL -= 2.6; o.armR += 2.6; o.y += 3 * Math.abs(Math.sin(t * 7)); return; }
    o.armLx -= 1.25; o.armRx -= 1.25;
    o.armL += 0.3; o.armR -= 0.3;
    o.y += 0.8 * Math.abs(Math.sin(t * 6));
    o.rz += 0.04 * Math.sin(t * 3);
    if (this.punchT > 0) {
      const e = bump(1 - this.punchT / 0.3);
      const left = this.punchArm === 0;
      if (this.punchSuper) { // uppercut!
        if (left) { o.armLx -= 1.5 * e; o.armL -= 0.3 * e; } else { o.armRx -= 1.5 * e; o.armR += 0.3 * e; }
        o.y += 4 * e;
      } else if (left) { o.armLx -= 0.4 * e; o.armL += 0.25 * e; } else { o.armRx -= 0.4 * e; o.armR -= 0.25 * e; }
      o.ry += (left ? -0.35 : 0.35) * e;
    }
    if (this.hitT > 0) {
      const e = bump(1 - this.hitT / 0.5);
      o.rx -= 0.45 * e;
      o.armLx += 0.9 * e; o.armRx += 0.9 * e;
      o.headRx -= 0.4 * e;
    }
    if (this.dodgeT > 0) o.rz += this.dodgeDir * 0.4 * bump(1 - this.dodgeT / 0.6);
  }

  build() {
    this.gobFill = h('div', { class: 'fill', style: { width: '100%' } });
    this.squidFill = h('div', { class: 'fill', style: { width: '100%' } });
    this.stars = h('div', { class: 'pill ko-pill' });
    this.card = h('div', { class: 'g-card' });
    this.warnFill = h('div', { class: 'fill' });
    this.warn = h('div', { class: 'squid-warn hidden' }, h('div', { class: 'w-text' }, '⚠️ TENTACLE COMING! Answer to DODGE!'), h('div', { class: 'w-bar' }, this.warnFill));
    this.comboPill = h('div', { class: 'pill combo' }, 'Combo 0');
    this.bestPill = h('div', { class: 'pill' }, this.bestText());
    this.meta = h('div', { class: 'g-meta' }, this.comboPill, this.bestPill);
    this.bubble = h('div', { class: 'bubble squid-bubble hidden' });
    this.flash = h('div', { class: 'hit-flash' });
    this.quiz = new QuizCard(this.card, {
      onAnswer: (ok, secs, p) => this.onAnswer(ok, secs, p),
      onFixed: () => this.next(),
    });
    this.root.innerHTML = '';
    this.root.append(h('div', { class: 'gauntlet' },
      this.flash,
      this.bubble,
      h('div', { class: 'g-top' },
        h('div', { class: 'pill' }, '🥊 SQUID SMACKDOWN'),
        h('div', { class: 'g-timer hp gob' }, this.gobFill, h('div', { class: 't' }, (this.state.gobName || 'GOB').toUpperCase())),
        h('div', { class: 'vs' }, 'VS'),
        h('div', { class: 'g-timer hp squid' }, this.squidFill, h('div', { class: 't' }, 'BIG INKY')),
        this.stars,
        button('Quit', () => this.quit(), 'small red')),
      h('div', { class: 'g-box' }, this.warn, this.card, this.meta)));
    this.updateHud();
  }

  bestText() {
    const s = this.state;
    return s.squidBest ? `Fastest K.O.: ${s.squidBest} s` : 'Not beaten yet!';
  }

  showReady() {
    this.meta.classList.add('hidden');
    this.card.replaceChildren(
      h('div', { class: 'g-prob', style: { fontSize: '26px' } }, 'SQUID SMACKDOWN!'),
      h('p', { style: { fontSize: '19px', lineHeight: 1.4, textAlign: 'left' } },
        '🥊 Every right answer is a punch. FAST answers punch harder!', h('br'),
        '⚠️ When Big Inky winds up a tentacle, answer quick to DODGE and hit back double!', h('br'),
        nums('⭐ Knock him down 3 times to win.')),
      h('div', { style: { marginTop: '16px' } }, button('FIGHT!' + kb(' (Enter)'), () => this.countdown(), 'gold big')));
  }

  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    this.phase = 'countdown';
    this.reset();
    this.updateHud();
    this.meta.classList.add('hidden');
    this.game.goblin.object.position.set(0, 0, GOB_Z);
    let n = 3;
    const show = () => this.card.replaceChildren(h('div', { class: 'countdown', style: { fontSize: n > 0 ? '90px' : '60px' } }, n > 0 ? n : 'FIGHT!'));
    show(); sfx.tick();
    this.cdTimer = setInterval(() => {
      n--;
      show();
      if (n > 0) sfx.tick();
      else { clearInterval(this.cdTimer); sfx.bell(); setTimeout(() => this.startFight(), 300); }
    }, 650);
  }

  startFight() {
    if (this.phase !== 'countdown') return;
    track('game_start', 'squid');
    this.picker = new FactPicker(this.state.facts, this.state.settings, currentMax(this.state));
    this.fast = this.state.settings.fastSeconds;
    this.pace = pace(this.state, 'squid');
    this.quitted = false;
    this.correct = 0; this.total = 0; this.combo = 0; this.bestCombo = 0; this.times = [];
    this.counters = 0; this.hitsTaken = 0;
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

  updateHud() {
    if (!this.gobFill) return;
    this.gobFill.style.width = Math.max(0, this.gobHP) + '%';
    this.gobFill.classList.toggle('hurry', this.gobHP <= 30);
    this.squidFill.style.width = Math.max(0, (this.squidHP / ROUNDS[this.round].hp) * 100) + '%';
    this.stars.replaceChildren(...[0, 1, 2].map((i) => h('span', { class: i < this.knockdowns ? 'on' : '' }, '★')));
  }

  onKey(e) {
    if (modalOpen()) return;
    if (this.phase === 'ready' || this.phase === 'results') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.countdown(); }
      if (e.key === 'Escape') this.game.go('home');
      return;
    }
    if (e.key === 'Escape') { this.quit(); return; }
    if (this.phase !== 'play') return;
    this.quiz.key(e);
  }

  windupTime() {
    return Math.max(2.5, this.fast * 1.4 + 1.2) * ROUNDS[this.round].wind / (this.pace || 1);
  }

  onAnswer(ok, secs, p) {
    const { goblin } = this.game;
    this.total++;
    this.picker.record(p, ok, secs);
    if (ok) {
      this.correct++; this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.times.push(secs);
      let dmg = 6 + (secs <= this.fast ? 3 : 0) + (secs <= this.fast / 2 ? 3 : 0) + Math.min(4, Math.floor(this.combo / 3));
      const superPunch = secs <= this.fast / 2;
      sfx.correct(this.combo);
      if (this.atk && this.atk.stage === 'windup') {
        // DODGE! The tentacle misses, then you hit back twice as hard.
        this.counters++;
        this.strike(false);
        this.dodgeT = 0.6;
        this.dodgeDir = this.atk.side > 0 ? -1 : 1;
        this.game.line('squidDodge', 1.4);
        sfx.whoosh();
        this.pending.push({ at: 0.4, fn: () => this.punch(dmg * 2, 'COUNTER!', true) });
      } else {
        this.punch(dmg, superPunch ? 'SUPER PUNCH!' : null, superPunch);
      }
      goblin.emote(this.combo >= 5 ? 'ecstatic' : 'focus', 0.9);
      if (this.combo % 5 === 0) sfx.combo(this.combo);
      this.next();
      this.quiz.setSpeed(superPunch ? '⚡ SUPER PUNCH!' : secs <= this.fast ? 'Quick!' : '');
    } else {
      this.combo = 0;
      sfx.wrong();
      // Big Inky slaps you right away (and forgets about any wind-up).
      this.startAttack(0, SLAP_DMG);
      this.strike(true);
      this.later(0.6, () => this.taunt('wrong', 0.5));
    }
    this.updateMeta();
  }

  punch(dmg, label, big) {
    if (this.phase !== 'play') return;
    this.punchT = 0.3;
    this.punchArm = 1 - this.punchArm;
    this.punchSuper = big;
    this.pending.push({ at: 0.12, fn: () => this.landPunch(dmg, label, big) });
  }

  landPunch(dmg, label, big) {
    if (this.phase !== 'play') return;
    this.squidHP -= dmg;
    this.hurtT = 0.4;
    this.flashT = 0.1;
    sfx.punch(big ? 1 : 0.5);
    const face = this.game.world.toScreen(this.squid.localToWorld(new THREE.Vector3(0, HY + 6, 16)));
    floater(face.x + rand(-30, 30), face.y, label ? `${label} -${dmg}` : `-${dmg}`, big ? '#ffd23f' : '#ffffff');
    const hit = this.squid.localToWorld(new THREE.Vector3(0, HY, 18));
    this.fx.stars(hit, big ? 8 : 4);
    if (big) this.ink(14);
    if (this.atk && this.atk.stage === 'windup' && big) this.atk = null; // a big hit interrupts his wind-up
    this.updateHud();
    if (this.squidHP <= 0) this.knockdown();
  }

  ink(n) {
    const p = this.squid.localToWorld(new THREE.Vector3(0, HY + 30, -10));
    for (let i = 0; i < n; i++) {
      this.fx.cube(p.clone(), i % 3 ? '#1b1020' : '#3a2a50', {
        vel: new THREE.Vector3(rand(-25, 25), rand(15, 35), rand(-20, 5)), gravity: -40, life: 1.2, s0: 3, s1: 1, drag: 0.97, spin: 4,
      });
    }
  }

  // Big Inky starts winding up a tentacle (or slaps right away if windup is tiny).
  startAttack(windup = this.windupTime(), dmg = HIT_DMG) {
    const side = Math.random() < 0.5 ? -1 : 1;
    this.atk = { stage: 'windup', t: 0, dur: windup, side, dmg };
    if (windup > 0.1) sfx.whoosh();
  }

  // The tentacle swings. hits = whether it lands on the goblin.
  strike(hits) {
    if (!this.atk) return;
    Object.assign(this.atk, { stage: 'strike', t: 0, dur: 0.32, hits, landed: false });
  }

  updateAttack(dt) {
    if (this.phase !== 'play') { this.atk = null; return; }
    if (!this.atk) {
      if (!this.quiz.fixing) {
        this.nextAtk -= dt;
        if (this.nextAtk <= 0) this.startAttack();
      }
      return;
    }
    const a = this.atk;
    if (a.stage === 'windup') {
      if (!this.quiz.fixing) a.t += dt;
      if (a.t >= a.dur) this.strike(true);
    } else if (a.stage === 'strike') {
      a.t += dt;
      if (!a.landed && a.t >= a.dur * 0.55) {
        a.landed = true;
        if (a.hits) this.gobHit(a.dmg);
        else { sfx.thud(); this.shakeT = 0.15; }
      }
      if (a.t >= a.dur) Object.assign(a, { stage: 'recover', t: 0, dur: 0.6 });
    } else if (a.stage === 'recover') {
      a.t += dt;
      if (a.t >= a.dur) {
        this.atk = null;
        this.nextAtk = rand(2.5, 5) * ROUNDS[this.round].wind / (this.pace || 1);
      }
    }
  }

  gobHit(dmg) {
    const { goblin } = this.game;
    this.gobHP -= dmg;
    this.hitsTaken++;
    this.combo = 0;
    this.updateMeta();
    this.hitT = 0.5;
    this.shakeT = 0.35;
    sfx.slap();
    this.flash.classList.remove('on'); void this.flash.offsetWidth; this.flash.classList.add('on');
    goblin.emote('dizzy', 1.4);
    const p = this.game.world.toScreen(goblin.headTop());
    floater(p.x, p.y - 20, `-${dmg}`, '#ff6a6a');
    if (dmg >= HIT_DMG) { this.game.line('squidOuch', 1.6); this.later(0.4, () => this.taunt('hit', 0.4)); }
    this.laughT = 1.2;
    this.updateHud();
    if (this.gobHP <= 0) this.lose();
  }

  knockdown() {
    const { goblin } = this.game;
    this.knockdowns++;
    this.updateHud();
    this.phase = 'down';
    this.atk = null;
    this.quiz.problem = null;
    this.warn.classList.add('hidden');
    this.downT = 0;
    sfx.thud();
    this.ink(24);
    goblin.act('cheer');
    goblin.emote('ecstatic', 3);
    this.fx.stars(this.squid.localToWorld(new THREE.Vector3(0, HY + 20, 0)), 10);
    const final = this.knockdowns >= 3;
    this.game.line(final ? 'squidWin' : 'squidKnock', 2.5);
    const showCount = (n) => this.card.replaceChildren(
      h('div', { class: 'g-prob', style: { fontSize: '30px' } }, final ? 'K.O.!!!' : 'DOWN!'),
      h('div', { class: 'countdown' }, n));
    showCount(1); sfx.tick();
    this.later(0.8, () => { showCount(2); sfx.tick(); });
    this.later(1.6, () => { showCount(3); sfx.tick(); });
    if (final) {
      this.later(2.2, () => {
        this.phase = 'won';
        sfx.bell(); sfx.fanfare();
        this.fx.confetti(goblin.headTop(), 80);
        this.taunt('lose', 0);
        goblin.act('dance');
      });
      this.later(4.6, () => this.showResults(true));
      return;
    }
    this.later(2.6, () => {
      // He gets back up, angrier!
      this.round++;
      this.squidHP = ROUNDS[this.round].hp;
      this.setTint();
      this.gobHP = Math.min(GOB_HP, this.gobHP + HEAL);
      this.updateHud();
      this.taunt('getUp', 0);
      this.phase = 'play';
      this.nextAtk = 2.5;
      sfx.bell();
      const r = this.card.getBoundingClientRect();
      floater(r.left + r.width / 2, r.top, `+${HEAL} health`, '#9be060');
      this.next();
    });
  }

  lose() {
    const { goblin } = this.game;
    this.phase = 'lost';
    this.atk = null;
    this.quiz.problem = null;
    this.warn.classList.add('hidden');
    this.card.replaceChildren(h('div', { class: 'countdown', style: { fontSize: '44px' } }, 'OOF!'));
    goblin.act('faint');
    goblin.emote('fainted', 3);
    this.game.line('squidLose', 3);
    this.laughT = 3;
    this.later(0.8, () => this.taunt('win', 0));
    this.later(2.8, () => this.showResults(false));
  }

  quit() {
    if (this.phase === 'play' || this.phase === 'down') {
      this.timers.forEach(clearTimeout);
      this.timers = [];
      this.phase = 'lost';
      this.quiz.problem = null;
      this.quitted = true;
      this.showResults(false);
    } else if (this.phase !== 'lost' && this.phase !== 'won') this.game.go('home');
  }

  taunt(kind, chance = 0) {
    if (Math.random() < chance) return;
    const text = pick(SQUID_TAUNTS[kind]);
    this.bubble.textContent = text;
    this.bubbleUntil = performance.now() / 1000 + Math.min(4, 1.8 + text.length * 0.05);
    sfx.babble(text, 0.6);
  }

  showResults(won) {
    const { goblin, S } = this.game;
    const s = this.state;
    this.phase = 'results';
    this.warn.classList.add('hidden');
    const time = Math.round(this.fightT);
    const newBest = won && (!s.squidBest || time < s.squidBest);
    let coins = this.correct + this.knockdowns * 8 + (won ? 20 : 0);
    if (newBest) { coins += 10; s.squidBest = time; }
    if (won) s.squidWins = (s.squidWins || 0) + 1;
    if (!this.quitted && this.total >= 3) tunePace(s, 'squid', won ? 'great' : this.knockdowns === 0 ? 'struggled' : 'ok');
    S.addCoins(coins);
    const avg = this.times.length ? this.times.reduce((a, b) => a + b, 0) / this.times.length : 0;
    s.history.push({ t: Date.now(), game: 'squid', correct: this.correct, total: this.total, avg, streak: this.bestCombo, score: this.knockdowns });
    track('game_end', 'squid', this.correct);
    if (s.history.length > 200) s.history.shift();
    if (this.total > 0) S.addStat('fun', 12);
    S.save();
    afterRound(this.game);
    const acc = this.total ? Math.round((this.correct / this.total) * 100) : 0;
    this.bestPill.textContent = this.bestText();
    this.meta.classList.add('hidden');

    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', { style: { fontFamily: 'var(--title)', fontSize: '17px', margin: '0 0 6px', lineHeight: 1.5 } }, won ? '🏆 K.O.! YOU BEAT BIG INKY!' : '🦑 Big Inky wins this time!'),
      h('p', { style: { margin: '0 0 6px', fontWeight: 700 } }, nums(won ? `You won in ${time} seconds!` : `You knocked him down ${this.knockdowns} of 3 times. Rematch?`)),
      newBest ? h('div', { class: 'res-best' }, 'NEW FASTEST K.O.! +10¢') : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Right answers', h('b', {}, this.correct)),
        h('div', {}, 'Accuracy', h('b', {}, acc + '%')),
        h('div', {}, 'Counters', h('b', {}, this.counters)),
        h('div', {}, 'Hits taken', h('b', {}, this.hitsTaken)),
        h('div', { style: { gridColumn: '1 / -1', background: 'var(--gold)' } }, 'Coins earned', h('b', {}, `${coins}¢`))),
      h('div', { class: 'row', style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px' } },
        button('Rematch!' + kb(' (Enter)'), () => this.countdown(), 'gold'),
        button('Home' + kb(' (Esc)'), () => this.game.go('home'), ''))));
    if (newBest) this.game.line('newBest', 3);
  }

  // ---------- every frame ----------
  update(dt) {
    const t = performance.now() / 1000;
    const { goblin } = this.game;
    if (this.phase === 'play' || this.phase === 'down') this.fightT += dt;

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.at -= dt;
      if (p.at <= 0) { this.pending.splice(i, 1); p.fn(); }
    }
    this.updateAttack(dt);
    this.punchT = Math.max(0, this.punchT - dt);
    this.hitT = Math.max(0, this.hitT - dt);
    this.dodgeT = Math.max(0, this.dodgeT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.laughT = Math.max(0, this.laughT - dt);

    // warning bar
    const a = this.atk;
    const winding = a && a.stage === 'windup' && a.dur > 0.1;
    this.warn.classList.toggle('hidden', !winding);
    if (winding) {
      const left = 1 - a.t / a.dur;
      this.warnFill.style.width = left * 100 + '%';
      this.warn.classList.toggle('paused', this.quiz.fixing);
    }

    // goblin moves: lunge on punches, knocked back when hit, sidestep on dodges
    const lunge = bump(1 - this.punchT / 0.3) * (this.punchT > 0 ? 1 : 0);
    const knock = this.hitT > 0 ? bump(1 - this.hitT / 0.5) : 0;
    const side = this.dodgeT > 0 ? bump(1 - this.dodgeT / 0.6) : 0;
    goblin.object.position.set(this.dodgeDir * 16 * side, 0, GOB_Z - 9 * lunge + 7 * knock);

    this.animateSquid(dt, t);

    // camera: behind the goblin. The view is shifted so the fight sits on the left side of the screen.
    const W = innerWidth, H = innerHeight, f = 0.28;
    const F = 2 * W * (1 - f);
    this.camera.aspect = F / H;
    this.camera.setViewOffset(F, H, F - W, 0, W, H);
    const sh = this.shakeT > 0 ? this.shakeT * 6 : 0;
    this.camera.position.set(rand(-sh, sh), 54 + rand(-sh, sh), 196);
    this.camera.lookAt(0, 56, -58);

    for (const f2 of this.foam) f2.position.y = -8.6 + 0.4 * Math.sin(t * 2 + f2.userData.ph);
    for (const fan of this.fans) fan.position.y = -8 + 2 * Math.abs(Math.sin(t * (this.phase === 'down' || this.phase === 'won' ? 9 : 3) + fan.userData.ph));
    this.fx.update(dt);

    // squid speech bubble
    const now = performance.now() / 1000;
    const showB = this.bubbleUntil && now < this.bubbleUntil;
    this.bubble.classList.toggle('hidden', !showB);
    if (showB) {
      const p = this.game.world.toScreen(this.squid.localToWorld(new THREE.Vector3(0, HY + 70, 0)));
      if (IS_TOUCH) placeBubble(this.bubble, p.x, p.y);
      else {
        this.bubble.style.left = Math.max(170, p.x) + 'px';
        this.bubble.style.top = Math.max(this.bubble.offsetHeight + 78, p.y) + 'px';
      }
    }
  }

  animateSquid(dt, t) {
    const sq = this.squid;
    const a = this.atk;
    const k = 1 - Math.exp(-dt * 14);
    const down = this.phase === 'down' || this.phase === 'won';
    if (this.phase === 'down') this.downT += dt;
    const fallTarget = down && !(this.phase === 'down' && this.downT > 2.2 && this.knockdowns < 3) ? 1 : 0;
    this.sqFall = lerp(this.sqFall, fallTarget, 1 - Math.exp(-dt * (fallTarget ? 6 : 3)));

    // body: bob, sway, flinch when punched, lunge on a strike
    const strikeLunge = a && a.stage === 'strike' ? bump(a.t / a.dur) * (a.hits ? 1 : 0.7) : 0;
    this.lunge = lerp(this.lunge, strikeLunge, 1 - Math.exp(-dt * 20));
    const hurt = this.hurtT > 0 ? bump(1 - this.hurtT / 0.4) : 0;
    const laugh = this.laughT > 0 ? Math.abs(Math.sin(t * 14)) * Math.min(1, this.laughT) : 0;
    sq.position.set(Math.sin(t * 1.3) * 3 * (1 - this.sqFall), 1.5 * Math.sin(t * 2.2) + laugh * 2 - this.sqFall * 4, SQUID_Z + this.lunge * 18 - hurt * 6 - this.sqFall * 10);
    sq.rotation.set(-0.18 * hurt - 1.25 * this.sqFall, Math.sin(t * 0.9) * 0.08, Math.sin(t * 1.7) * 0.04 + (a && a.stage === 'windup' ? 0.06 * a.side : 0));

    // flash red while winding up, white when punched
    let er = 0, eg = 0, eb = 0;
    if (a && a.stage === 'windup' && a.dur > 0.1) {
      const urgency = a.t / a.dur;
      er = 0.25 + 0.35 * urgency * (0.5 + 0.5 * Math.sin(t * (8 + urgency * 20)));
    }
    if (this.flashT > 0) er = eg = eb = 0.8;
    for (const m of this.mats) m.emissive.setRGB(er, eg, eb);

    // eyes: watch the goblin; spin when knocked down
    this.pupils.forEach((p, i) => {
      const sx = i ? 9.5 : -8.5;
      if (down) {
        p.rotation.z += dt * 12;
        p.position.set(sx + Math.cos(t * 10 + i) * 1.5, HY + 3 + Math.sin(t * 10 + i) * 1.5, 17.6);
      } else {
        p.rotation.z = 0;
        const gx = this.game.goblin.object.position.x / 16;
        p.position.set(sx + gx * 1.5, HY + 2 - (this.hurtT > 0 ? 0 : 1) + (a && a.stage === 'windup' ? 1 : 0), 17.6);
      }
      p.scale.y = this.hurtT > 0 ? 0.3 : 1; // squint when hit
    });
    this.mouth.scale.y = laugh > 0 ? 1 + 2.5 * laugh : hurt > 0 ? 2.5 : 1;

    // legs wiggle
    for (const leg of this.legs) {
      leg.segs.forEach((s, i) => {
        const base = i === 0 ? -0.2 : i < 5 ? 0 : -0.4;
        const wave = 0.12 * Math.sin(t * 2.5 + leg.ph + i * 0.7);
        s.rotation.x = base + wave * (down ? 3 : 1);
      });
    }

    // arms: guard, wind-up overhead, strike, or flop when down
    for (const arm of this.arms) {
      let a0 = -0.5, d = -0.25 + 0.05 * Math.sin(t * 3 + arm.side), yaw = -arm.side * 0.22, shake = 0;
      const mine = a && a.side === arm.side;
      if (down) { a0 = -0.15; d = 0.05 * Math.sin(t * 4 + arm.side); yaw = -arm.side * 0.9; }
      else if (mine && a.stage === 'windup' && a.dur > 0.1) { a0 = -2.3; d = -0.15; yaw = arm.side * 0.8; shake = 0.06 * Math.sin(t * 40); }
      else if (mine && a.stage === 'strike') {
        a0 = -1.1; d = -0.02;
        yaw = Math.atan2(this.game.goblin.object.position.x - arm.side * 14, GOB_Z - SQUID_Z) * (a.hits ? 1 : 0.4);
        if (!a.hits) a0 = -0.8; // misses and smacks the mat
      } else if (this.hurtT > 0) { a0 = -0.4; d = -0.5; }
      const kk = mine && a.stage === 'strike' ? 1 - Math.exp(-dt * 30) : k * 0.6;
      arm.a0 = lerp(arm.a0, a0, kk);
      arm.d = lerp(arm.d, d, kk);
      arm.holder.rotation.y = lerp(arm.holder.rotation.y, yaw, kk);
      arm.segs.forEach((s, i) => { s.rotation.x = (i === 0 ? arm.a0 : arm.d) + shake; });
    }
  }
}
