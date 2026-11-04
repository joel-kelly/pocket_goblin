// Goblin Café: ring up hungry customers. Orders get trickier through the shift:
// single orders (times tables) → two-item orders → splitting the bill (division)
// → making change. Faster service = bigger tips.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button, floater, modalOpen, nums, kb, IS_TOUCH, placeBubble } from '../ui.js';
import { sfx } from '../audio.js';
import { VoxelModel, buildMesh } from '../voxel.js';
import { FX } from '../fx.js';
import { Goblin } from '../goblin.js';
import { SKINS, WEAR_SLOTS } from '../goblinModel.js';
import { currentMax, FactPicker } from '../math.js';
import { allItems, getModel } from '../items.js';
import { thumbnail } from '../world.js';
import { CUSTOMER_NAMES, CUSTOMER_HELLO, CUSTOMER_HAPPY, CUSTOMER_MAD } from '../lines.js';
import { afterRound } from './games.js';
import { QuizCard } from '../quiz.js';
import { track } from '../track.js';

const SHIFT = ['single', 'single', 'single', 'split', 'double', 'single', 'double', 'split', 'change', 'change'];
const PRICES = [3, 4, 6, 7, 8, 9];
const GOB_POS = new THREE.Vector3(-38, 0, -9);
const SPOT = new THREE.Vector3(-4, 0, 14); // where customers stand
const DOOR_X = 75;
const hash = (x, y, z) => {
  let n = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  n = Math.imul(n ^ (n >>> 13), 0x5bd1e995);
  return ((n ^ (n >>> 15)) >>> 0) % 1000 / 1000;
};
const randi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function signTexture(lines, w, hgt, bg, fg, size) {
  const c = document.createElement('canvas');
  c.width = w; c.height = hgt;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, hgt);
  g.fillStyle = fg;
  g.font = `${size}px "Press Start 2P", monospace`;
  g.textBaseline = 'top';
  lines.forEach((l, i) => {
    if (typeof l === 'object') { g.fillStyle = l.color; g.fillText(l.text, l.x ?? 4, l.y ?? 4 + i * (size + 4)); g.fillStyle = fg; }
    else g.fillText(l, 4, 4 + i * (size + 4));
  });
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class CafeScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#3b2a3a');
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 600);
    this.scene.add(new THREE.HemisphereLight('#fff2e0', '#5a4050', 1.7));
    const sun = new THREE.DirectionalLight('#fff3dd', 1.9);
    sun.position.set(30, 70, 60);
    this.scene.add(sun);
    this.fx = new FX(this.scene);
    this.built = false;
    this.customer = null;
    this.token = 0;
  }
  get state() { return this.game.state; }

  buildCafe() {
    this.built = true;
    const S = this.scene;
    const room = new VoxelModel(null);
    room.box(-90, -1, -32, 110, 0, 62, (x, y, z) => ((Math.floor(x / 4) + Math.floor(z / 4)) % 2 ? '#f4d3e0' : '#bfe8d0'));
    room.box(-90, 0, -34, 110, 60, -32, (x, y) => (y < 16 ? (Math.floor(x / 3) % 2 ? '#5fae7a' : '#4f9a6a') : y === 16 ? '#3a6a4a' : '#9fd6b0'));
    // counter
    room.box(-62, 0, 0, 2, 12, 6, (x, y) => (y % 4 === 0 ? '#6b4423' : '#8a5a2a'));
    room.box(-63, 12, -1, 3, 13, 7, '#e8e0d0');
    // potted plant + stool
    room.box(50, 0, -26, 56, 6, -20, '#b8603a');
    room.sphere(53, 11, -23, 6, (x, y, z) => (hash(x, y, z) < 0.3 ? '#2f7a2a' : '#4fae3a'), 6);
    room.cyl(-80, 10, 4, 0, 1, '#5a3a20'); room.box(-81, 1, 9, -79, 7, 11, '#5a3a20'); room.cyl(-80, 10, 4, 7, 8, '#e2353f');
    // jar of eyeballs on the counter
    room.cyl(-52, 3, 2.6, 13, 19, '#cfe8e8');
    for (const [x, y, z] of [[-53, 14, 4], [-51, 15, 4], [-52, 17, 4]]) { room.set(x, y, z, '#ffffff'); }
    room.set(-53, 14, 5, '#1b1020'); room.set(-51, 15, 5, '#1b1020'); room.set(-52, 17, 5, '#1b1020');
    S.add(buildMesh(room, { jitter: 0.06 }));
    if (IS_TOUCH) this.addBackdrop();

    // Signs
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(56, 9), new THREE.MeshBasicMaterial({
      map: signTexture([{ text: 'GOBLIN CAFE', color: '#ffe14d', x: 6, y: 8 }], 128, 22, '#5a2a4a', '#ffe14d', 10),
    }));
    sign.position.set(-28, 46, -31.8);
    S.add(sign);

    // Tip jar (rebuilt as tips come in)
    this.jar = null;
    this.updateJar(0);
  }

  // Phones and tablets pull the camera further back (see frameCamera), which can
  // show past the edges of the room. A big floor and back wall sit just behind the
  // room's own blocks to fill that in.
  addBackdrop() {
    const S = this.scene;
    const tex = (draw, w, h) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'));
      const t = new THREE.CanvasTexture(c);
      t.magFilter = t.minFilter = THREE.NearestFilter;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    // Floor: the same 4-block pink/green checks, 1 px per block.
    const SIZE = 1600;
    const floorTex = tex((g) => {
      for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
        g.fillStyle = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? '#f4d3e0' : '#bfe8d0';
        g.fillRect(x, y, 1, 1);
      }
    }, 8, 8);
    floorTex.repeat.set(SIZE / 8, SIZE / 8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.4;
    S.add(floor);
    // Back wall: dark green stripes up to 16, a trim line, then plain light green.
    const wallTex = tex((g) => {
      g.fillStyle = '#9fd6b0'; g.fillRect(0, 0, 6, 64);
      for (let x = 0; x < 6; x++) { g.fillStyle = Math.floor(x / 3) % 2 ? '#5fae7a' : '#4f9a6a'; g.fillRect(x, 64 - 16, 1, 16); }
      g.fillStyle = '#3a6a4a'; g.fillRect(0, 64 - 17, 6, 1);
    }, 6, 64);
    const W = 1596, H = 64 * 4;
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
    wallTex.repeat.set(W / 6, 1);
    // Bottom 64 rows use the texture; above that is plain wall color.
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(W, 64), wallMat);
    wall.position.set(0, 32, -32.4);
    const upper = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ color: '#9fd6b0' }));
    upper.position.set(0, 64 + H / 2, -32.4);
    S.add(wall, upper);
  }

  updateJar(tips) {
    if (this.jar) { this.scene.remove(this.jar); this.jar.geometry.dispose(); }
    // A short jar; coins pile up above the rim as tips come in.
    const m = new VoxelModel(null);
    const [jx, jz] = [-20, 3];
    m.cyl(jx, jz, 3.4, 13, 14, '#cfe8e8');
    m.ring(jx, jz, 2.4, 3.4, 14, 17, '#cfe8e8');
    const fill = Math.min(9, Math.floor(tips / 7));
    const coin = (x, y, z) => (hash(x, y, z) < 0.4 ? '#c8941c' : '#ffd23f');
    if (fill > 0) m.cone(jx, jz, 2.4, fill > 4 ? 1.2 : 2.4, 14, 14 + fill, coin);
    this.jar = buildMesh(m);
    this.scene.add(this.jar);
  }

  // ---------- lifecycle ----------
  enter() {
    const { world, goblin } = this.game;
    if (!this.built) this.buildCafe();
    world.active = { scene: this.scene, camera: this.camera };
    world.resize();
    this.scene.add(goblin.object);
    goblin.object.visible = true;
    goblin.object.position.copy(GOB_POS);
    goblin.object.rotation.set(0, 0.45, 0);
    goblin.shadow.visible = true;
    goblin.lookAt(1, 0);
    this.camera.position.set(10, 30, 142);
    this.camera.lookAt(10, 18, 0);
    this.snapCam = true;
    this.phase = 'ready';
    this.token++;
    this.build();
    this.rollMenu();
    this.showReady();
    this.game.line('cafeStart', 3);
    goblin.act('wave');
  }
  exit() {
    const { world, goblin } = this.game;
    this.token++;
    world.scene.add(goblin.object);
    goblin.object.position.set(0, 0, 0);
    goblin.object.rotation.set(0, 0, 0);
    goblin.shadow.visible = false;
    goblin.lookAt(null);
    world.active = null;
    this.removeCustomer();
    if (this.food) { this.scene.remove(this.food); this.food = null; }
    this.root.innerHTML = '';
  }

  rollMenu() {
    const snacks = allItems().filter((it) => it.slot === 'snack');
    const mine = shuffle(snacks.filter((it) => it.custom || it.shipped)).slice(0, 2);
    const rest = shuffle(snacks.filter((it) => !mine.includes(it)));
    const items = [...mine, ...rest].slice(0, PRICES.length);
    const prices = shuffle(PRICES);
    this.menu = items.map((it, i) => ({ id: it.id, name: it.name, price: prices[i] }));
  }

  build() {
    this.progressFill = h('div', { class: 'fill', style: { width: '0%' } });
    this.progressLabel = h('div', { class: 't' }, 'Customer 0 / 10');
    this.tipsPill = h('div', { class: 'pill', style: { background: 'var(--gold)' } }, 'Tips: 0¢');
    this.card = h('div', { class: 'g-card ticket-card' });
    this.tipPill = h('div', { class: 'pill combo' }, 'Tip: 5¢');
    this.bestPill = h('div', { class: 'pill' }, `Best shift: ${this.state.cafeBest || 0}¢`);
    this.meta = h('div', { class: 'g-meta' }, this.tipPill, this.bestPill);
    this.custBubble = h('div', { class: 'bubble cust-bubble hidden' });
    this.quiz = new QuizCard(this.card, {
      onAnswer: (ok, secs) => this.onAnswer(ok, secs),
      onFixed: () => this.serve(false),
    });
    this.root.innerHTML = '';
    this.root.append(h('div', { class: 'gauntlet' },
      h('div', { class: 'g-top' },
        h('div', { class: 'pill' }, '🍔 GOBLIN CAFÉ'),
        h('div', { class: 'g-timer' }, this.progressFill, this.progressLabel),
        this.tipsPill,
        button('Quit', () => this.quit(), 'small red')),
      h('div', { class: 'g-box' }, this.card, this.meta)),
      this.custBubble);
  }

  showReady() {
    this.meta.classList.add('hidden');
    const menuList = h('div', { class: 'menu-list' }, ...this.menu.map((m) =>
      h('div', {}, h('img', { src: thumbnail(getModel(m.id), m.id) }), h('span', {}, m.name), h('b', {}, `${m.price}¢`))));
    this.card.replaceChildren(
      h('div', { class: 'g-prob', style: { fontSize: '26px' } }, 'GOBLIN CAFÉ'),
      h('p', { style: { fontSize: '18px', lineHeight: 1.35, margin: '10px 0' } },
        '10 hungry customers are coming! Type the right price to serve them. Faster service = bigger tips!'),
      h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, "Today's menu:"),
      menuList,
      h('div', { style: { marginTop: '14px' } }, button('OPEN THE CAFÉ' + kb(' (Enter)'), () => this.startShift(), 'gold big')));
  }

  startShift() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    if (this.phase === 'results') { this.rollMenu(); }
    track('game_start', 'cafe');
    this.picker = new FactPicker(this.state.facts, this.state.settings, currentMax(this.state));
    this.fast = this.state.settings.fastSeconds;
    this.idx = -1;
    this.tips = 0; this.correct = 0; this.total = 0; this.times = [];
    this.tricky = [];
    this.updateJar(0);
    this.meta.classList.remove('hidden');
    this.phase = 'between';
    this.token++;
    this.nextCustomer();
  }

  // ---------- customers ----------
  removeCustomer() {
    if (!this.customer) return;
    const c = this.customer;
    this.scene.remove(c.object);
    c.object.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    c.faceTex.dispose();
    this.customer = null;
  }

  makeCustomer() {
    const skins = Object.values(SKINS).filter((s) => s !== this.state.skin);
    const c = new Goblin(pickOne(skins));
    c.object.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    const odds = { head: 0.75, face: 0.4, neck: 0.3, body: 0.5, back: 0.2, hand: 0.25, feet: 0.3 };
    const outfit = {};
    for (const slot of WEAR_SLOTS) {
      if (Math.random() > odds[slot]) continue;
      const options = allItems().filter((it) => it.slot === slot && it.kind === 'wear');
      // her own creations show up more often!
      const mine = options.filter((it) => it.custom || it.shipped);
      const it = mine.length && Math.random() < 0.5 ? pickOne(mine) : pickOne(options);
      if (it) outfit[slot] = getModel(it.id);
    }
    c.setOutfit(outfit);
    c.on('fart', () => { sfx.fart(Math.random()); this.fx.fart(c.butt(), 1, new THREE.Vector3(-Math.sin(c.object.rotation.y), 0, -Math.cos(c.object.rotation.y))); });
    c.on('burp', () => { sfx.burp(); this.fx.burp(c.mouth()); });
    c.name = pickOne(CUSTOMER_NAMES);
    c.walkT = 0;
    c.overlay = (o, t) => {
      if (!c.walking) return;
      o.y += Math.abs(Math.sin(t * 12)) * 1.6;
      o.rz += Math.sin(t * 12) * 0.08;
      o.armL += Math.sin(t * 12) * 0.5; o.armR += Math.sin(t * 12) * 0.5;
    };
    return c;
  }

  walk(c, toX, seconds) {
    return new Promise((res) => { c.walking = { fromX: c.object.position.x, toX, t: 0, dur: seconds, res }; });
  }

  say(text, seconds = 2.5) {
    this.custText = text;
    this.custUntil = performance.now() / 1000 + seconds;
    sfx.babble(text, 1.35);
  }

  async nextCustomer() {
    const token = this.token;
    this.idx++;
    if (this.idx >= SHIFT.length) { this.endShift(); return; }
    this.progressLabel.textContent = `Customer ${this.idx + 1} / ${SHIFT.length}`;
    this.progressFill.style.width = (this.idx / SHIFT.length) * 100 + '%';
    this.card.replaceChildren(h('div', { class: 'g-prob', style: { fontSize: '20px', padding: '30px 0' } }, 'Here comes someone...'));
    const c = this.makeCustomer();
    this.customer = c;
    c.object.position.set(DOOR_X, 0, SPOT.z);
    c.object.rotation.y = -Math.PI / 2;
    this.scene.add(c.object);
    await this.walk(c, SPOT.x, 1.3);
    if (token !== this.token) return;
    c.object.rotation.y = -0.5;
    c.lookAt(-1, 0);
    this.problem = this.makeOrder(SHIFT[this.idx]);
    this.say(`${pickOne(CUSTOMER_HELLO)}`, 3);
    this.phase = 'order';
    this.orderStart = performance.now();
    this.quiz.show(this.problem);
  }

  // ---------- orders ----------
  itemRow(m, qty) {
    return h('div', { class: 'ticket-row' },
      h('img', { src: thumbnail(getModel(m.id), m.id) }),
      h('span', { class: 'q' }, `${qty} ×`),
      h('span', { class: 'n' }, m.name),
      h('span', { class: 'p' }, `${m.price}¢ each`));
  }

  ticket(c, rows, question, ans, unit = '¢') {
    return h('div', { class: 'ticket' },
      h('div', { class: 'ticket-head' }, `ORDER #${this.idx + 1} • ${c.name}`),
      ...rows,
      h('div', { class: 'g-prob ticket-q' }, question, ans, unit));
  }

  makeOrder(type) {
    const c = this.customer;
    const byPrice = (p) => this.menu.find((m) => m.price === p);
    if (type === 'single' || type === 'change') {
      let item, qty, fact = null;
      for (let i = 0; i < 12 && !item; i++) {
        const f = this.picker.next();
        const [a, b] = f.fact;
        if (byPrice(b) && a >= 2) { item = byPrice(b); qty = a; fact = [a, b]; }
        else if (byPrice(a) && b >= 2) { item = byPrice(a); qty = b; fact = [b, a]; }
      }
      if (!item) { item = pickOne(this.menu); qty = randi(2, 9); }
      if (type === 'change') qty = Math.min(qty, 6);
      const total = qty * item.price;
      if (type === 'single') {
        return {
          answer: total, fact: type === 'single' ? fact : null, item, kind: 'mul',
          full: `${qty} × ${item.price}¢ = ${total}¢`,
          prompt: (ans) => this.ticket(c, [this.itemRow(item, qty)], 'TOTAL = ', ans),
        };
      }
      const paid = total < 50 ? 50 : 100;
      return {
        answer: paid - total, item, hint: 'First find the total, then the change!',
        full: `${qty} × ${item.price}¢ = ${total}¢\n${paid}¢ - ${total}¢ = ${paid - total}¢`,
        prompt: (ans) => this.ticket(c, [this.itemRow(item, qty), h('div', { class: 'ticket-note' }, nums(`💰 They pay with a ${paid}¢ coin.`))], 'CHANGE = ', ans),
      };
    }
    if (type === 'double') {
      const [i1, i2] = shuffle(this.menu);
      const q1 = randi(2, 5), q2 = randi(2, 5);
      const answer = q1 * i1.price + q2 * i2.price;
      return {
        answer, item: i1, hint: 'Do each line, then add them up!',
        full: `${q1 * i1.price}¢ + ${q2 * i2.price}¢ = ${answer}¢`,
        prompt: (ans) => this.ticket(c, [this.itemRow(i1, q1), this.itemRow(i2, q2)], 'TOTAL = ', ans),
      };
    }
    // split the bill (division)
    const f = this.picker.next();
    let [n, each] = f.fact;
    if (n < 2) [n, each] = [each, n];
    const bill = n * each;
    const item = pickOne(this.menu);
    return {
      answer: each, fact: [n, each], item, kind: 'div',
      full: `${bill}¢ ÷ ${n} = ${each}¢`,
      prompt: (ans) => this.ticket(c, [
        h('div', { class: 'ticket-note big' }, nums(`👥 A table of ${n} goblins.`)),
        h('div', { class: 'ticket-note big' }, nums(`🧾 The bill is ${bill}¢.`)),
        h('div', { class: 'ticket-note' }, 'They split it evenly.'),
      ], 'EACH PAYS ', ans),
    };
  }

  currentTip() {
    const secs = (performance.now() - this.orderStart) / 1000;
    return Math.max(1, 5 - Math.floor(secs / 3));
  }

  onKey(e) {
    if (modalOpen()) return;
    if (this.phase === 'ready' || this.phase === 'results') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.startShift(); }
      if (e.key === 'Escape') this.game.go('home');
      return;
    }
    if (e.key === 'Escape') { this.quit(); return; }
    if (this.phase === 'order') this.quiz.key(e);
  }

  onAnswer(ok, secs) {
    const p = this.problem;
    const { goblin } = this.game;
    this.total++;
    if (p.fact) this.picker.record({ fact: p.fact }, ok, secs);
    if (ok) {
      this.correct++;
      this.times.push(secs);
      this.serve(true);
    } else {
      this.tricky.push(p.full);
      sfx.wrong();
      const c = this.customer;
      c.emote('angry', 2.5);
      c.act('tantrum');
      this.say(pickOne(CUSTOMER_MAD), 2.5);
      goblin.emote('nervous', 2);
      this.game.line('cafeWrong', 1.8);
    }
  }

  async serve(firstTry) {
    const token = this.token;
    const { goblin, S } = this.game;
    const c = this.customer;
    this.phase = 'serving';
    const tip = firstTry ? this.currentTip() : 0;
    const pay = (firstTry ? 2 : 1) + tip;
    this.tips += pay;
    S.addCoins(pay);
    this.tipsPill.textContent = `Tips: ${this.tips}¢`;
    this.updateJar(this.tips);
    sfx.coin();
    const r = this.card.getBoundingClientRect();
    floater(r.left + r.width / 2, r.top + 10, tip ? `+${pay}¢ (tip ${tip}¢!)` : `+${pay}¢`);
    if (firstTry) {
      sfx.correct(this.correct);
      this.quiz.setSpeed(tip >= 5 ? '⚡ SUPER SPEEDY SERVICE!' : tip >= 3 ? 'Quick service!' : '');
      goblin.act('hop'); goblin.emote('happy', 1.5);
      this.game.line('cafeRight', 1.5);
    } else {
      goblin.emote('neutral', 1);
    }
    // food appears on the counter, customer eats it
    const item = this.problem.item;
    if (item) {
      const food = buildMesh(getModel(item.id), { offset: [-5, 0, -5] });
      food.scale.setScalar(0.7);
      food.position.set(SPOT.x - 4, 13, 3);
      this.scene.add(food);
      this.food = food;
    }
    await this.game.wait(0.5);
    if (token !== this.token) return;
    c.emote(firstTry ? 'love' : 'neutral', 2);
    c.act('eat'); c.chomp(1.2); sfx.chomp();
    if (this.food) {
      const f = this.food;
      this.game.tween(1.1, (p) => f.scale.setScalar(Math.max(0.01, 0.7 * (1 - p))), () => { this.scene.remove(f); f.geometry.dispose(); if (this.food === f) this.food = null; });
    }
    await this.game.wait(1.3);
    if (token !== this.token) return;
    this.say(firstTry ? pickOne(CUSTOMER_HAPPY) : 'Hmph. Fine.', 2);
    if (Math.random() < 0.45) { await c.act('fart'); c.emote('smug', 1.5); }
    else if (Math.random() < 0.5) await c.act('burp');
    else await c.act(firstTry ? 'cheer' : 'shakeNo');
    if (token !== this.token) return;
    c.object.rotation.y = Math.PI / 2;
    await this.walk(c, DOOR_X, 1.2);
    if (token !== this.token) return;
    this.removeCustomer();
    this.nextCustomer();
  }

  // Phones and tablets: the order card sits mid-screen (the number pad takes the
  // right side), so move the camera back and over until the cook, counter and
  // customer all fit in the space left of the card.
  frameCamera(dt) {
    const card = this.root.querySelector('.g-box')?.getBoundingClientRect();
    if (!card?.width) return;
    const room = card.left / innerWidth - 0.03; // free space, as a share of screen width
    const EDGE = 0.02;
    const L = -50, LZ = GOB_POS.z; // cook's left side
    const R = SPOT.x + 10, RZ = SPOT.z; // customer's right side
    const T = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect;
    // Solve for the camera distance/position that puts L at EDGE and R at room.
    let z = ((R - L) / (2 * T) + LZ * (0.5 - EDGE) + RZ * (room - 0.5)) / (room - EDGE);
    z = Math.max(142, Math.min(320, z));
    const x = L + (0.5 - EDGE) * 2 * T * (z - LZ);
    const k = this.snapCam ? 1 : Math.min(1, dt * 4);
    this.snapCam = false;
    const cam = this.camera.position;
    cam.set(cam.x + (x - cam.x) * k, 30, cam.z + (z - cam.z) * k);
    this.camera.lookAt(cam.x, 18, 0);
  }

  update(dt) {
    if (IS_TOUCH) this.frameCamera(dt);
    const c = this.customer;
    if (c) {
      c.update(dt);
      const w = c.walking;
      if (w) {
        w.t += dt;
        const p = Math.min(1, w.t / w.dur);
        c.object.position.x = w.fromX + (w.toX - w.fromX) * p;
        if (p >= 1) { c.walking = null; w.res(); }
      }
    }
    this.fx.update(dt);
    if (this.phase === 'order') this.tipPill.textContent = `Tip: ${this.currentTip()}¢`;
    // customer speech bubble
    const el = this.custBubble;
    if (el) {
      const show = c && this.custText && performance.now() / 1000 < this.custUntil;
      el.classList.toggle('hidden', !show);
      if (show) {
        const pos = this.game.world.toScreen(c.headTop());
        el.textContent = this.custText;
        if (IS_TOUCH) placeBubble(el, pos.x, pos.y);
        else {
          el.style.left = Math.max(170, pos.x) + 'px';
          el.style.top = Math.max(el.offsetHeight + 78, pos.y) + 'px';
        }
      }
    }
  }

  quit() {
    if (this.phase === 'ready' || this.phase === 'results') this.game.go('home');
    else this.endShift(true);
  }

  endShift(early = false) {
    const { goblin, S } = this.game;
    const s = this.state;
    this.token++;
    this.phase = 'results';
    this.quiz.problem = null;
    this.removeCustomer();
    if (this.food) { this.scene.remove(this.food); this.food = null; }
    this.progressFill.style.width = '100%';
    this.progressLabel.textContent = early ? 'Café closed early!' : 'Shift over!';
    const newBest = !early && this.tips > (s.cafeBest || 0);
    let bonus = 0;
    if (newBest) { bonus = 10; s.cafeBest = this.tips; S.addCoins(bonus); }
    const avg = this.times.length ? this.times.reduce((a, b) => a + b, 0) / this.times.length : 0;
    if (this.total > 0) {
      s.history.push({ t: Date.now(), game: 'cafe', correct: this.correct, total: this.total, avg, streak: 0, score: this.tips });
      track('game_end', 'cafe', this.correct);
      if (s.history.length > 200) s.history.shift();
      S.addStat('fun', 12);
    }
    S.save();
    afterRound(this.game);
    this.meta.classList.add('hidden');
    this.bestPill.textContent = `Best shift: ${s.cafeBest || 0}¢`;
    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', { style: { fontFamily: 'var(--title)', fontSize: '18px', margin: '0 0 8px' } }, early ? 'CLOSED EARLY' : 'SHIFT OVER!'),
      newBest ? h('div', { class: 'res-best' }, 'RECORD TIPS! +10¢ bonus') : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Served right', h('b', {}, `${this.correct}/${this.total}`)),
        h('div', {}, 'Avg speed', h('b', {}, avg ? avg.toFixed(1) + 's' : '-')),
        h('div', { style: { gridColumn: '1 / -1', background: 'var(--gold)' } }, 'Tips earned', h('b', {}, `${this.tips + bonus}¢`))),
      this.tricky.length ? h('div', {}, h('div', { style: { fontWeight: 700, marginTop: '8px' } }, 'Tricky orders:'), h('div', { class: 'tricky' }, ...this.tricky.slice(0, 6).map((t) => h('span', {}, t.replace('\n', ', '))))) : null,
      h('div', { class: 'row', style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px' } },
        button('New shift!' + kb(' (Enter)'), () => this.startShift(), 'gold'),
        button('Home' + kb(' (Esc)'), () => this.game.go('home'), ''))));
    goblin.act(newBest ? 'dance' : 'cheer');
    goblin.emote(newBest ? 'ecstatic' : 'happy', 3);
    if (newBest) { sfx.fanfare(); this.game.line('newBest', 3); }
  }
}
