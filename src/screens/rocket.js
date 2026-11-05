// Fart Rocket: the goblin flies on fart power. Fuel drains all the time;
// right answers refuel it (faster answers = more fuel). How high can you go?
import * as THREE from '../../vendor/three.module.min.js';
import { h, button, floater, toast, modalOpen, kb } from '../ui.js';
import { sfx } from '../audio.js';
import { VoxelModel, buildMesh, voxelMaterial } from '../voxel.js';
import { FX } from '../fx.js';
import { currentMax, FactPicker, pace, tunePace } from '../math.js';
import { ROCKET_ZONES } from '../lines.js';
import { afterRound } from './games.js';
import { QuizCard, factProblem } from '../quiz.js';
import { track } from '../track.js';

const SKY = [
  [0, '#8fd3ff'], [300, '#5aa8f0'], [600, '#3a5fc0'], [850, '#1a1f5a'], [1200, '#0b0b24'], [99999, '#05050f'],
];
const hash = (x, y, z) => {
  let n = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  n = Math.imul(n ^ (n >>> 13), 0x5bd1e995);
  return ((n ^ (n >>> 15)) >>> 0) % 1000 / 1000;
};
const rand = (a, b) => a + Math.random() * (b - a);

export class RocketScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY[0][1]);
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 1200);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#6a7a50', 1.8));
    const sun = new THREE.DirectionalLight('#fff3dd', 2.0);
    sun.position.set(40, 80, 60);
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this.fx = new FX(this.scene);
    this.built = false;
    this.alt = 0;
  }
  get state() { return this.game.state; }

  // ---------- the sky world (built once) ----------
  buildWorld() {
    this.built = true;
    const S = this.scene;
    // Launch pad: swamp ground + trees
    const ground = new VoxelModel(null);
    ground.box(-120, -2, -90, 150, 0, 30, (x, y, z) => (hash(x, 0, z) < 0.2 ? '#4f8a2a' : hash(x, 1, z) < 0.6 ? '#5e9a32' : '#6aa83a'));
    ground.cyl(0, 0, 9, 0, 1, '#8a6a4a');
    for (let i = 0; i < 16; i++) {
      const tx = Math.round(rand(-110, 140)), tz = Math.round(rand(-85, -25)), th = Math.round(rand(18, 45));
      ground.box(tx, 0, tz, tx + 2, th, tz + 2, '#6b4423');
      ground.sphere(tx + 1, th + 3, tz + 1, rand(6, 10), (x, y, z) => (hash(x, y, z) < 0.3 ? '#2f7a2a' : '#3f9a35'), rand(5, 8));
    }
    S.add(buildMesh(ground, { jitter: 0.1 }));

    // Clouds
    const clouds = new VoxelModel(null);
    for (let i = 0; i < 34; i++) {
      const cx = rand(-90, 160), cy = rand(130, 560), cz = rand(-100, -30);
      for (let k = 0; k < 4; k++) clouds.sphere(cx + rand(-9, 9), cy + rand(-2, 2), cz + rand(-4, 4), rand(5, 9), '#ffffff', rand(3, 5));
    }
    S.add(buildMesh(clouds, { jitter: 0.05 }));

    // Birds and planes (move sideways)
    this.movers = [];
    const bird = new VoxelModel(null);
    bird.box(0, 0, 0, 4, 2, 2, '#3a3a48'); bird.set(4, 1, 0, '#ffb020'); bird.set(4, 1, 1, '#ffb020');
    bird.box(1, 2, -2, 3, 3, 4, '#55556a');
    const birdGeo = buildMesh(bird).geometry;
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(birdGeo, voxelMaterial);
      m.position.set(rand(-80, 150), rand(290, 490), rand(-70, -20));
      this.movers.push({ obj: m, speed: rand(10, 22), flap: Math.random() * 6 });
      S.add(m);
    }
    const plane = new VoxelModel(null);
    plane.box(0, 0, 0, 22, 4, 4, '#f4f1e6');
    plane.box(22, 1, 1, 24, 3, 3, '#5fd6e8');
    plane.box(8, 1, -10, 13, 2, 14, '#e2353f');
    plane.box(0, 4, 1, 3, 9, 3, '#e2353f');
    for (let i = 0; i < 4; i++) plane.set(5 + i * 4, 2, 4, '#5fd6e8');
    for (let i = 0; i < 3; i++) {
      const m = buildMesh(plane);
      m.position.set(rand(-100, 150), rand(500, 760), rand(-90, -40));
      this.movers.push({ obj: m, speed: rand(25, 40) });
      S.add(m);
    }

    // Stars
    const pts = [];
    for (let i = 0; i < 900; i++) pts.push(rand(-260, 320), rand(650, 4200), rand(-300, -80));
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0 });
    S.add(new THREE.Points(sg, this.starMat));

    // Moon, Planet Pickle, and the space dump
    const space = new VoxelModel(null);
    space.sphere(110, 1250, -110, 26, (x, y, z) => (hash(Math.floor(x / 4), Math.floor(y / 4), Math.floor(z / 4)) < 0.25 ? '#9a9aac' : '#d8d8e4'));
    space.sphere(-60, 1860, -120, 20, (x, y, z) => (hash(x, Math.floor(y / 3), z) < 0.2 ? '#3f7d2a' : '#7fbf3f'), 34);
    const junk = ['#e2353f', '#ffe14d', '#4fb3ff', '#8a5a2a', '#ffffff', '#8e8e9a', '#ff86b8'];
    for (let i = 0; i < 40; i++) {
      const x = rand(-90, 170), y = rand(2400, 3300), z = rand(-120, -40), s = rand(2, 6);
      space.box(Math.round(x), Math.round(y), Math.round(z), Math.round(x + s), Math.round(y + s * rand(0.5, 1.5)), Math.round(z + s), junk[i % junk.length]);
    }
    S.add(buildMesh(space));

    // Emergency underpants parachute
    const chute = new VoxelModel(null);
    chute.sphere(0, 0, 0, 14, (x, y, z) => (hash(x, y, z) < 0.1 ? '#e2353f' : '#f4f1e6'), 7);
    for (const [x, y, z] of [...chute.each()]) if (y < 1) chute.delete(x, y, z);
    for (const sx of [-10, 10]) for (let y = -16; y < 0; y += 2) chute.set(Math.round(sx * (1 + y / 20)), y, 0, '#8e8e9a');
    this.chute = buildMesh(chute);
    this.chute.visible = false;
    S.add(this.chute);
  }

  // ---------- screen lifecycle ----------
  enter() {
    const { world, goblin } = this.game;
    if (!this.built) this.buildWorld();
    world.active = { scene: this.scene, camera: this.camera };
    world.resize();
    this.scene.add(goblin.object);
    goblin.object.visible = true;
    goblin.object.position.set(0, 0, 0);
    goblin.object.rotation.set(0, 0, 0);
    goblin.shadow.visible = false;
    goblin.lookAt(1, 1);
    goblin.overlay = (o, t) => this.pose(o, t);
    this.alt = 0;
    this.phase = 'ready';
    this.build();
    this.showReady();
    this.game.line('rocketStart', 3);
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
    this.chute.visible = false;
  }

  // Flying pose (added on top of the goblin's normal idle wiggles)
  pose(o, t) {
    if (this.phase === 'play' || this.phase === 'countdown') {
      const fly = this.phase === 'play' ? 1 : 0.4;
      o.armL -= 2.7 * fly; o.armR += 2.7 * fly;
      o.rz += 0.06 * Math.sin(t * 5) * fly;
      o.headRx -= 0.2 * fly;
      o.earL -= 0.5 * fly; o.earR += 0.5 * fly;
    } else if (this.phase === 'falling') {
      o.armL -= 2 + Math.sin(t * 30); o.armR += 2 + Math.cos(t * 30);
      o.rz += Math.sin(t * 9) * 0.6;
    } else if (this.phase === 'results' && this.alt > 1) {
      o.armL -= 2.6; o.armR += 2.6; // holding the parachute
      o.rz += 0.1 * Math.sin(t * 2);
    }
  }

  build() {
    this.fuelFill = h('div', { class: 'fill', style: { width: '100%' } });
    this.fuelLabel = h('div', { class: 't' }, 'FART FUEL');
    this.altPill = h('div', { class: 'pill alt-pill' }, '0 m');
    this.card = h('div', { class: 'g-card' });
    this.zonePill = h('div', { class: 'pill' }, ROCKET_ZONES[0].name);
    this.comboPill = h('div', { class: 'pill combo' }, 'Combo 0');
    this.bestPill = h('div', { class: 'pill' }, `Best: ${this.state.rocketBest || 0} m`);
    this.meta = h('div', { class: 'g-meta' }, this.zonePill, this.comboPill, this.bestPill);
    this.quiz = new QuizCard(this.card, {
      onAnswer: (ok, secs, p) => this.onAnswer(ok, secs, p),
      onFixed: () => this.next(),
    });
    this.root.innerHTML = '';
    this.root.append(h('div', { class: 'gauntlet' },
      h('div', { class: 'g-top' },
        h('div', { class: 'pill' }, '🚀 FART ROCKET'),
        h('div', { class: 'g-timer fuel' }, this.fuelFill, this.fuelLabel),
        this.altPill,
        button('Quit', () => this.quit(), 'small red')),
      h('div', { class: 'g-box' }, this.card, this.meta)));
  }

  showReady() {
    this.meta.classList.add('hidden');
    this.card.replaceChildren(
      h('div', { class: 'g-prob', style: { fontSize: '28px' } }, 'FART ROCKET!'),
      h('p', { style: { fontSize: '19px', lineHeight: 1.4 } },
        'Fart fuel runs out all the time. Every right answer refuels it, and FAST answers add extra.', h('br'),
        "Run out and it's the underpants parachute!"),
      h('p', { style: { fontSize: '18px' } }, `Highest flight: ${this.state.rocketBest || 0} m`),
      h('div', { style: { marginTop: '16px' } }, button('BLAST OFF' + kb(' (Enter)'), () => this.countdown(), 'gold big')));
  }

  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    this.phase = 'countdown';
    this.alt = 0; this.vel = 0; this.camY = 0;
    this.chute.visible = false;
    this.game.goblin.object.position.y = 0;
    this.meta.classList.add('hidden');
    let n = 3;
    const show = () => this.card.replaceChildren(h('div', { class: 'countdown' }, n > 0 ? n : 'GO!'));
    show(); sfx.tick();
    this.cdTimer = setInterval(() => {
      n--;
      show();
      if (n > 0) { sfx.tick(); this.game.goblin.act('shiver'); }
      else { clearInterval(this.cdTimer); sfx.fart(1); this.fx.fart(this.game.goblin.butt(), 2, new THREE.Vector3(0, -1, 0)); setTimeout(() => this.startRound(), 250); }
    }, 650);
  }

  startRound() {
    track('game_start', 'rocket');
    this.picker = new FactPicker(this.state.facts, this.state.settings, currentMax(this.state));
    this.fast = this.state.settings.fastSeconds;
    this.pace = pace(this.state, 'rocket');
    this.flightT = 0; this.quitted = false;
    this.fuel = 100; this.alt = 0; this.maxAlt = 0; this.boost = 18;
    this.correct = 0; this.total = 0; this.combo = 0; this.bestCombo = 0; this.times = [];
    this.zone = 0; this.lowWarned = false; this.trailT = 0;
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
    this.zonePill.textContent = ROCKET_ZONES[this.zone].name;
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
    this.total++;
    this.picker.record(p, ok, secs);
    if (ok) {
      this.correct++; this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.times.push(secs);
      const gain = 15 + (secs <= this.fast ? 10 : 0) + (secs <= this.fast / 2 ? 8 : 0) + Math.min(10, this.combo);
      this.fuel = Math.min(100, this.fuel + gain);
      this.boost += 8 + gain * 0.5;
      sfx.fart(0.15 + Math.random() * 0.3);
      sfx.correct(this.combo);
      this.fx.fart(goblin.butt(), 0.7, new THREE.Vector3(0, -1, 0));
      goblin.emote(this.combo >= 5 ? 'ecstatic' : 'happy', 0.9);
      if (this.combo % 5 === 0) { goblin.act('spin'); sfx.combo(this.combo); this.fx.stars(goblin.headTop(), 8); }
      const r = this.card.getBoundingClientRect();
      floater(r.left + r.width / 2, r.top + 10, `+${gain} fuel`, '#9be060');
      this.lowWarned = false;
      this.next();
      this.quiz.setSpeed(secs <= this.fast / 2 ? '⚡ LIGHTNING FART!' : secs <= this.fast ? 'Quick!' : '');
    } else {
      this.combo = 0;
      this.fuel = Math.max(0, this.fuel - 8);
      sfx.wrong();
      goblin.emote('nervous', 1.5);
      goblin.act('shiver');
      this.game.line('rocketWrong', 1.6);
    }
    this.updateMeta();
  }

  update(dt) {
    const { goblin } = this.game;
    const t = performance.now() / 1000;
    if (this.phase === 'play') {
      this.flightT += dt;
      const fixing = this.quiz.fixing;
      if (!fixing) this.fuel -= (5 + this.alt / 150) * this.pace * dt;
      const climb = fixing ? 0 : 3 + Math.max(0, this.fuel) * 0.22;
      this.boost *= Math.pow(0.9, dt * 60);
      this.alt += (climb + this.boost) * dt;
      this.maxAlt = Math.max(this.maxAlt, this.alt);
      // fart trail
      this.trailT -= dt;
      if (this.trailT <= 0 && this.fuel > 0) {
        this.trailT = 0.05;
        const greens = ['#9be060', '#b5d65a', '#7fbf3f', '#c9e27a'];
        this.fx.cube(goblin.butt(), greens[Math.floor(Math.random() * 4)], {
          vel: new THREE.Vector3(rand(-3, 3), rand(-25, -12), rand(-3, 3)), life: 0.9, s0: 1 + this.fuel / 60, s1: 0, drag: 0.95, spin: 3,
        });
      }
      // zones
      while (this.zone + 1 < ROCKET_ZONES.length && this.alt >= ROCKET_ZONES[this.zone + 1].alt) {
        this.zone++;
        toast(`🚀 ${ROCKET_ZONES[this.zone].name.toUpperCase()}!`);
        sfx.combo(this.zone * 2);
        this.game.line('rocketZone', 2);
        this.updateMeta();
      }
      if (this.fuel < 25 && !this.lowWarned) { this.lowWarned = true; this.game.line('rocketLow', 2); goblin.emote('nervous', 2); }
      if (this.fuel <= 0) this.crash();
    } else if (this.phase === 'falling') {
      this.vel -= 120 * dt;
      this.alt = Math.max(0, this.alt + this.vel * dt);
      this.fallT -= dt;
      if (this.fallT <= 0) this.showResults();
    } else if (this.phase === 'results' && this.alt > 0) {
      this.alt = Math.max(0, this.alt - 12 * dt); // floating down on the parachute
      if (this.alt === 0) this.chute.visible = false;
    }

    // world follows the goblin
    goblin.object.position.y = this.alt;
    this.chute.position.set(0, this.alt + 44, 0);
    const lift = this.phase === 'results' && this.chute.visible ? 12 : 0;
    this.camY = (this.camY ?? this.alt) + ((this.alt + lift) - (this.camY ?? this.alt)) * Math.min(1, dt * 6);
    this.camera.position.set(30, this.camY + 12, 118);
    this.camera.lookAt(30, this.camY + 10, 0);
    this.sun.position.set(40, this.alt + 80, 60);
    this.sun.target.position.set(0, this.alt, 0);
    this.scene.background.copy(this.skyColor(this.alt));
    this.starMat.opacity = Math.min(1, Math.max(0, (this.alt - 600) / 300));
    for (const m of this.movers || []) {
      m.obj.position.x += m.speed * dt;
      if (m.obj.position.x > 200) m.obj.position.x = -140;
      if (m.flap != null) m.obj.scale.y = 1 + 0.5 * Math.sin(t * 12 + m.flap);
    }
    this.fx.update(dt);

    if (this.fuelFill && this.phase === 'play') {
      const f = Math.max(0, this.fuel);
      this.fuelFill.style.width = f + '%';
      this.fuelFill.classList.toggle('hurry', f < 25);
      this.fuelLabel.textContent = this.quiz.fixing ? 'FART FUEL (paused)' : 'FART FUEL';
    }
    if (this.altPill) this.altPill.textContent = `${Math.floor(this.alt)} m`;
  }

  skyColor(alt) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const [a0, c0] = SKY[i], [a1, c1] = SKY[i + 1];
      if (alt <= a1) return new THREE.Color(c0).lerp(new THREE.Color(c1), (alt - a0) / (a1 - a0));
    }
    return new THREE.Color(SKY[SKY.length - 1][1]);
  }

  crash() {
    if (this.phase !== 'play') return;
    const { goblin } = this.game;
    this.phase = 'falling';
    this.quiz.problem = null;
    this.vel = 10;
    this.fallT = 1.4;
    this.fuelFill.style.width = '0%';
    this.fuelLabel.textContent = 'OUT OF GAS!';
    sfx.wrong();
    goblin.emote('shocked', 2);
    this.game.line('rocketCrash', 2);
    this.card.replaceChildren(h('div', { class: 'countdown', style: { fontSize: '40px' } }, 'OUT OF GAS!'));
  }

  quit() {
    if (this.phase === 'play') { this.quitted = true; this.crash(); }
    else this.game.go('home');
  }

  showResults() {
    const { goblin, S } = this.game;
    const s = this.state;
    this.phase = 'results';
    this.chute.visible = this.alt > 1;
    sfx.whoosh();
    const height = Math.floor(this.maxAlt);
    const newBest = height > (s.rocketBest || 0) && height > 0;
    let coins = Math.round(height / 20);
    if (newBest) { coins += 10; s.rocketBest = height; }
    S.addCoins(coins);
    const avg = this.times.length ? this.times.reduce((a, b) => a + b, 0) / this.times.length : 0;
    s.history.push({ t: Date.now(), game: 'rocket', correct: this.correct, total: this.total, avg, streak: this.bestCombo, score: height });
    track('game_end', 'rocket', this.correct);
    if (s.history.length > 200) s.history.shift();
    if (!this.quitted && this.total >= 3) tunePace(s, 'rocket', this.flightT < 40 ? 'struggled' : this.flightT >= 90 ? 'great' : 'ok');
    if (this.total > 0) S.addStat('fun', 12);
    S.save();
    afterRound(this.game);
    const acc = this.total ? Math.round((this.correct / this.total) * 100) : 0;
    this.bestPill.textContent = `Best: ${s.rocketBest || 0} m`;
    this.meta.classList.add('hidden');

    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', { style: { fontFamily: 'var(--title)', fontSize: '18px', margin: '0 0 6px' } }, `${height} METERS!`),
      h('p', { style: { margin: '0 0 6px', fontWeight: 700 } }, `You reached ${ROCKET_ZONES[this.zone].name}!`),
      newBest ? h('div', { class: 'res-best' }, 'NEW HEIGHT RECORD! +10¢') : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Right answers', h('b', {}, this.correct)),
        h('div', {}, 'Accuracy', h('b', {}, acc + '%')),
        h('div', {}, 'Avg speed', h('b', {}, avg ? avg.toFixed(1) + 's' : '-')),
        h('div', {}, 'Best combo', h('b', {}, this.bestCombo)),
        h('div', { style: { gridColumn: '1 / -1', background: 'var(--gold)' } }, 'Coins earned', h('b', {}, `${coins}¢`))),
      h('div', { class: 'row', style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px' } },
        button('Fly again!' + kb(' (Enter)'), () => this.countdown(), 'gold'),
        button('Home' + kb(' (Esc)'), () => this.game.go('home'), ''))));
    goblin.emote(newBest ? 'ecstatic' : 'dizzy', 3);
    if (newBest) { sfx.fanfare(); this.game.line('newBest', 3); }
  }
}
