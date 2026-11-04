// The Workshop: a Minecraft-style block editor for making goblin gear & snacks.
// Click or drag on blocks to build/erase/paint (strokes stay on one flat layer),
// right-click/drag erases, drag on empty space (or Shift+drag) spins, scroll zooms.
import * as THREE from '../../vendor/three.module.min.js';
import { VoxelModel, buildMesh } from '../voxel.js';
import { SLOTS, WEAR_SLOTS, buildGoblinParts, isGhostCell } from '../goblinModel.js';
import { allItems, getItem, getModel, setCustomItems } from '../items.js';
import { drawFace, FACE_W, FACE_H } from '../face.js';
import { thumbnail, clearThumb } from '../world.js';
import { h, button, toast, IS_TOUCH } from '../ui.js';
import { sfx } from '../audio.js';
import { track } from '../track.js';

export const PALETTE = [
  '#22202a', '#5c5c68', '#8e8e9a', '#c9ced8', '#ffffff',
  '#a3212a', '#e2353f', '#ff6a3a', '#ff86b8', '#ffc2dc',
  '#c9620d', '#ff8a1f', '#f2c230', '#ffe14d', '#fff3a0',
  '#2e7a32', '#47b04b', '#8fdc3a', '#9bc33c', '#6cbf3c',
  '#24479c', '#3b6fe0', '#4fb3ff', '#5fd6e8', '#bfefff',
  '#4b2a86', '#6a3fb5', '#9a6bd1', '#c4a0ff', '#f0c8ff',
  '#4f2e14', '#7a4a24', '#a8703c', '#d9a35a', '#f2d7a0',
];

const NOUN = { head: 'Hat', face: 'Face Thing', neck: 'Necklace', body: 'Shirt', back: 'Back Thing', hand: 'Hand Thing', feet: 'Shoes', snack: 'Snack', decor: 'Decoration' };
const TOOLS = [
  { id: 'build', label: '🧱 Build', key: 'B' },
  { id: 'erase', label: '💥 Erase', key: 'E' },
  { id: 'paint', label: '🖌️ Paint', key: 'P' },
  { id: 'fill', label: '🪣 Fill color', key: 'F' },
  { id: 'pick', label: '💧 Copy color', key: 'C' },
];
const BRUSHES = [{ size: 1, label: '1×1' }, { size: 3, label: '3×3' }, { size: 5, label: '5×5' }];
const AXES = ['x', 'y', 'z'];

const axisOf = (n) => (Math.abs(n.x) > 0.5 ? 0 : Math.abs(n.y) > 0.5 ? 1 : 2);

export class WorkshopScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    this.bubbleOK = false;
    this.tool = 'build';
    this.color = '#e2353f';
    this.mirror = true;
    this.brush = 1;
    this.undoStack = [];
    this.redoStack = [];
    this.yaw = 0.55; this.pitch = 0.32; this.dist = 60;
    this.center = new THREE.Vector3();
    this.mode = 'pick';

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color('#2f2340');
    scene.add(new THREE.HemisphereLight('#ffffff', '#5a4a70', 2.0));
    const d = new THREE.DirectionalLight('#ffffff', 1.6);
    d.position.set(30, 60, 50);
    scene.add(d);
    const d2 = new THREE.DirectionalLight('#c8b0ff', 0.6);
    d2.position.set(-40, 10, -30);
    scene.add(d2);
    this.camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.5, 800);
    this.raycaster = new THREE.Raycaster();
    this.ghostGroup = new THREE.Group();
    this.helperGroup = new THREE.Group();
    scene.add(this.ghostGroup, this.helperGroup);

    this.cursorFill = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.04, 1.04), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.55, depthWrite: false }));
    this.cursorEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.08, 1.08, 1.08)), new THREE.LineBasicMaterial({ color: '#ffffff' }));
    this.cursorFill.visible = this.cursorEdge.visible = false;
    this.cursorFill.raycast = this.cursorEdge.raycast = () => {};
    scene.add(this.cursorFill, this.cursorEdge);

    const cv = document.getElementById('game');
    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));
    cv.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    // Right-click erases, so never show the browser's menu in the Workshop.
    window.addEventListener('contextmenu', (e) => {
      if (this.game.screen === this && e.target.tagName !== 'INPUT') e.preventDefault();
    }, true);
  }

  get state() { return this.game.state; }
  active() { return this.game.screen === this && this.mode === 'edit'; }

  enter() {
    this.game.world.active = { scene: this.scene, camera: this.camera };
    this.game.world.resize();
    this.showPicker();
  }
  exit() {
    this.game.world.active = null;
    this.root.innerHTML = '';
    this.mode = 'pick';
  }

  // ---------------- picker ----------------
  showPicker() {
    this.mode = 'pick';
    this.clearScene();
    this.camera.position.set(0, 20, 80);
    this.camera.lookAt(0, 14, 0);
    this.buildGhost('body');
    const slots = h('div', { class: 'slotpick' });
    for (const slot of [...WEAR_SLOTS, 'snack', 'decor']) {
      slots.append(h('button', { class: 'btn', onclick: () => { sfx.click(); this.startEdit({ slot }); } },
        h('span', { class: 'emo' }, SLOTS[slot].icon), `New ${NOUN[slot]}`));
    }
    const remix = h('div', { class: 'grid', style: { marginTop: '10px' } });
    const items = allItems().sort((a, b) => (b.custom ? 1 : 0) - (a.custom ? 1 : 0));
    for (const it of items) {
      remix.append(h('div', { class: 'card', onclick: () => {
        sfx.click();
        this.startEdit({ slot: it.slot, model: getModel(it.id).clone(), name: it.custom ? it.name : `My ${it.name}`, editId: it.custom ? it.id : null, drink: it.kind === 'drink' });
      } },
        it.custom ? h('span', { class: 'mine' }, '⭐') : null,
        h('img', { src: thumbnail(getModel(it.id), it.id) }),
        h('div', { class: 'nm' }, it.name)));
    }
    const fileIn = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
    fileIn.onchange = async () => {
      try {
        const data = JSON.parse(await fileIn.files[0].text());
        if (!data.slot || !data.model || !SLOTS[data.slot]) throw new Error('not an item file');
        this.startEdit({ slot: data.slot, model: VoxelModel.fromJSON(data.model), name: data.name || 'Imported thing', drink: !!data.drink });
        toast('Imported! Hit Save to keep it.');
      } catch (e) { toast('Hmm, that file did not work.'); }
    };
    this.root.innerHTML = '';
    this.root.append(h('div', { class: 'ws' }, h('div', { class: 'ws-pick' }, h('div', { class: 'modal' },
      h('h2', {}, '🔨 The Workshop'),
      // Building needs right-click and the scroll wheel, so it only really works on a computer.
      IS_TOUCH ? h('div', { class: 'ws-warn' }, '🖱️ The Workshop only works on a computer with a mouse. On a phone or tablet, building blocks is really tricky!') : null,
      h('p', {}, 'Build stuff out of blocks, just like Minecraft! What do you want to make?'),
      slots,
      h('h2', { style: { marginTop: '22px', fontSize: '12px' } }, 'Or remix something (⭐ = made by you):'),
      remix,
      h('div', { class: 'row' }, button('Import a file', () => fileIn.click(), 'small'), fileIn, button('← Back home', () => this.game.go('home'), 'small red'))))));
  }

  // ---------------- editor ----------------
  startEdit({ slot, model, name, editId = null, drink = false }) {
    this.mode = 'edit';
    this.slot = slot;
    this.model = model ? model.clone() : new VoxelModel([...SLOTS[slot].size]);
    this.model.size = [...SLOTS[slot].size];
    this.editId = editId;
    this.drink = drink;
    this.name = name || `My ${NOUN[slot]}`;
    this.undoStack = []; this.redoStack = [];
    this.tool = 'build';
    this.mirror = slot !== 'hand';
    const s = SLOTS[slot];
    this.origin = new THREE.Vector3(...s.origin);
    this.center.set(s.origin[0] + s.size[0] / 2, s.origin[1] + s.size[1] / 2, s.origin[2] + s.size[2] / 2);
    this.dist = Math.max(...s.size) * 2.9 + 12;
    const view = { head: [0.5, 0.45], face: [0.4, 0.12], neck: [0.5, 0.15], body: [0.5, 0.1], back: [Math.PI - 0.6, 0.25], hand: [0.9, 0.2], feet: [0.5, 0.4], snack: [0.55, 0.5], decor: [0.45, 0.35] }[slot];
    [this.yaw, this.pitch] = view;
    this.clearScene();
    this.buildGhost(slot);
    this.buildHelpers();
    this.rebuild();
    this.buildUI();
  }

  clearScene() {
    for (const g of [this.ghostGroup, this.helperGroup]) {
      for (const c of [...g.children]) { g.remove(c); c.geometry?.dispose(); }
    }
    if (this.itemMesh) { this.scene.remove(this.itemMesh); this.itemMesh.geometry.dispose(); this.itemMesh = null; }
    this.cursorFill.visible = this.cursorEdge.visible = false;
  }

  buildGhost(slot) {
    if (slot === 'snack') {
      const plate = new VoxelModel(null);
      plate.cyl(5, 5, 7, -1, 0, '#e8e4f0');
      plate.ring(5, 5, 6, 7.4, 0, 1, '#d0c8e0');
      const m = buildMesh(plate);
      m.userData.ghost = true;
      this.ghostGroup.add(m);
      return;
    }
    if (slot === 'decor') {
      // A patch of den floor to build on.
      const tile = new VoxelModel(null);
      tile.box(-9, -1, -9, 9, 0, 9, (x, y, z) => ((x + z) % 2 ? '#6e5236' : '#7a5c3c'));
      const m = buildMesh(tile);
      m.userData.ghost = true;
      this.ghostGroup.add(m);
      return;
    }
    const near = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false });
    const far = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.14, depthWrite: false });
    const parts = buildGoblinParts(this.state.skin);
    // Body parts the item sits on stay visible; the rest fade out of the way.
    const NEAR = { head: ['head', 'earL', 'earR'], face: ['head'], neck: ['torso'], body: ['torso', 'armL', 'armR', 'root'], back: ['torso', 'head'], hand: ['armR'], feet: ['root'] };
    for (const [name, model] of Object.entries(parts)) {
      if (name === 'hair') continue;
      const isNear = this.mode !== 'edit' || (NEAR[slot] || []).includes(name);
      const m = buildMesh(model, { material: isNear ? near : far });
      m.userData.ghost = true;
      this.ghostGroup.add(m);
    }
    // Show the face so it's obvious which way is the front
    const c = document.createElement('canvas');
    c.width = FACE_W; c.height = FACE_H;
    drawFace(c.getContext('2d'), 'happy', '#3a6a20');
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(16, 13), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false }));
    face.position.set(0, 20.5, 5.05);
    face.raycast = () => {};
    this.ghostGroup.add(face);
  }

  buildHelpers() {
    const s = SLOTS[this.slot];
    const [sx, sy, sz] = s.size;
    const o = s.origin;
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz)), new THREE.LineBasicMaterial({ color: '#ffe14d', transparent: true, opacity: 0.6 }));
    box.position.copy(this.center);
    box.raycast = () => {};
    this.helperGroup.add(box);
    const pts = [];
    for (let x = 0; x <= sx; x++) pts.push(o[0] + x, o[1], o[2], o[0] + x, o[1], o[2] + sz);
    for (let z = 0; z <= sz; z++) pts.push(o[0], o[1], o[2] + z, o[0] + sx, o[1], o[2] + z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18 }));
    lines.raycast = () => {};
    this.helperGroup.add(lines);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(o[0] + sx / 2, o[1] + 0.001, o[2] + sz / 2);
    floor.userData.floor = true;
    this.floor = floor;
    this.helperGroup.add(floor);
    // "FRONT" label in front of the grid
    const lc = document.createElement('canvas');
    lc.width = 64; lc.height = 16;
    const lg = lc.getContext('2d');
    lg.fillStyle = '#ffe14d';
    lg.font = '8px "Press Start 2P", monospace';
    lg.textAlign = 'center'; lg.textBaseline = 'middle';
    lg.fillText('FRONT', 32, 8);
    const ltex = new THREE.CanvasTexture(lc);
    ltex.magFilter = ltex.minFilter = THREE.NearestFilter;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: ltex, depthTest: false }));
    label.scale.set(16, 4, 1);
    label.position.set(o[0] + sx / 2, o[1] - 1.5, o[2] + sz + 3);
    label.raycast = () => {};
    this.helperGroup.add(label);
  }

  rebuild() {
    if (this.itemMesh) { this.scene.remove(this.itemMesh); this.itemMesh.geometry.dispose(); }
    this.itemMesh = buildMesh(this.model, { offset: SLOTS[this.slot].origin });
    this.scene.add(this.itemMesh);
    if (this.countEl) this.countEl.textContent = `${this.model.count} blocks`;
  }

  buildUI() {
    const nameIn = h('input', { type: 'text', value: this.name, maxlength: 24 });
    nameIn.oninput = () => { this.name = nameIn.value; };
    const tryLabel = { snack: '😋 Feed it to the goblin!', decor: '🪴 Put it in the den!' }[this.slot] || '👕 Try it on!';
    const top = h('div', { class: 'ws-top' },
      h('div', { class: 'ws-title' }, `${SLOTS[this.slot].icon} ${NOUN[this.slot]}`),
      nameIn,
      button('💾 Save', () => this.save(), 'slime'),
      button(tryLabel, () => this.tryIt(), 'gold'),
      h('div', { class: 'spacer' }),
      this.editId ? button('Copy', () => { this.editId = null; this.name = this.name + ' 2'; nameIn.value = this.name; toast('Now editing a copy'); }, 'small') : null,
      button('Export', () => this.exportFile(), 'small'),
      this.editId ? button('🗑️', () => this.deleteItem(), 'small red') : null,
      button('← Back', () => this.showPicker(), 'small red'));

    this.toolBtns = {};
    const left = h('div', { class: 'ws-left' });
    for (const t of TOOLS) {
      const b = button(h('span', {}, t.label, h('span', { class: 'key' }, t.key)), () => this.setTool(t.id), 'small');
      this.toolBtns[t.id] = b;
      left.append(b);
    }
    this.brushBtns = {};
    const brushRow = h('div', { class: 'ws-brush' });
    for (const b of BRUSHES) {
      const el = button(b.label, () => this.setBrush(b.size), 'small');
      this.brushBtns[b.size] = el;
      brushRow.append(el);
    }
    left.append(h('div', { class: 'ws-label' }, 'Brush size  [ ]'), brushRow);
    this.mirrorBtn = button(h('span', {}, '🪞 Mirror', h('span', { class: 'key' }, 'M')), () => this.toggleMirror(), 'small');
    left.append(h('div', { style: { height: '8px' } }), this.mirrorBtn,
      button(h('span', {}, '↩️ Undo', h('span', { class: 'key' }, 'Z')), () => this.undo(), 'small'),
      button(h('span', {}, '↪️ Redo', h('span', { class: 'key' }, 'Y')), () => this.redo(), 'small'),
      button('🧹 Clear all', () => { if (this.model.count && confirm('Remove ALL the blocks?')) { this.pushUndo(); this.model.cells.clear(); this.rebuild(); } }, 'small red'));
    if (this.slot === 'snack') {
      const kind = button(this.drink ? '💧 It\'s a drink' : '🍔 It\'s a food', () => {
        this.drink = !this.drink;
        kind.textContent = this.drink ? '💧 It\'s a drink' : '🍔 It\'s a food';
      }, 'small blue');
      left.append(h('div', { style: { height: '8px' } }), kind);
    }

    this.swatches = h('div', { class: 'swatches' });
    PALETTE.forEach((c, i) => {
      const sw = h('div', { class: 'swatch', style: { background: c }, title: c, onclick: () => this.setColor(c) }, i < 10 ? h('span', { class: 'n' }, (i + 1) % 10) : null);
      sw.dataset.c = c;
      this.swatches.append(sw);
    });
    this.colorIn = h('input', { type: 'color', value: this.color });
    this.colorIn.oninput = () => this.setColor(this.colorIn.value);
    this.countEl = h('div', { class: 'ws-count' }, `${this.model.count} blocks`);
    const right = h('div', { class: 'ws-right' }, h('h3', {}, 'Colors'), this.swatches,
      h('div', { class: 'ws-cur' }, this.colorIn, 'Any color!'), this.countEl);

    const help = h('div', { class: 'ws-help' },
      h('div', {}, 'Click or DRAG on blocks: use tool  •  Right-click/drag: erase'),
      h('div', {}, 'Drag on empty space (or Shift+drag): spin  •  Scroll: zoom  •  Arrow keys: turn'));

    this.root.innerHTML = '';
    this.root.append(h('div', { class: 'ws' }, top, left, right, help));
    this.setTool(this.tool);
    this.setColor(this.color);
    this.setBrush(this.brush);
    this.mirrorBtn.classList.toggle('on', this.mirror);
  }

  setBrush(size) {
    this.brush = size;
    for (const [s, b] of Object.entries(this.brushBtns || {})) b.classList.toggle('on', Number(s) === size);
    this.updateCursor();
  }

  setTool(t) {
    this.tool = t;
    for (const [id, b] of Object.entries(this.toolBtns || {})) b.classList.toggle('on', id === t);
    this.updateCursor();
  }
  setColor(c) {
    this.color = c;
    if (this.tool === 'erase' || this.tool === 'pick') this.setTool('build');
    else this.updateCursor();
    this.swatches?.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s.dataset.c === c));
    if (this.colorIn && /^#[0-9a-f]{6}$/i.test(c)) this.colorIn.value = c;
    this.updateCursor();
  }
  toggleMirror() {
    this.mirror = !this.mirror;
    this.mirrorBtn.classList.toggle('on', this.mirror);
    toast(this.mirror ? 'Mirror ON: both sides match!' : 'Mirror OFF');
  }

  pushUndo() {
    this.undoStack.push(this.model.clone());
    if (this.undoStack.length > 80) this.undoStack.shift();
    this.redoStack = [];
  }
  undo() { if (!this.undoStack.length) return; this.redoStack.push(this.model); this.model = this.undoStack.pop(); this.rebuild(); sfx.remove(); }
  redo() { if (!this.redoStack.length) return; this.undoStack.push(this.model); this.model = this.redoStack.pop(); this.rebuild(); sfx.place(); }

  valid(x, y, z) { return this.model.inBounds(x, y, z) && !isGhostCell(this.slot, x, y, z); }
  mirrorX(x) { return this.model.size[0] - 1 - x; }

  // ---------------- picking ----------------
  pickAt(clientX, clientY) {
    const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = [this.itemMesh, ...this.ghostGroup.children, this.floor].filter(Boolean);
    const hits = this.raycaster.intersectObjects(targets, false);
    const o = SLOTS[this.slot].origin;
    // The ghost goblin is see-through, so clicks pass through it until they
    // land somewhere a block can actually go.
    for (const hit of hits) {
      const p = hit.point;
      if (hit.object === this.itemMesh) {
        const n = hit.face.normal;
        const vx = Math.floor(p.x - n.x * 0.5) - o[0], vy = Math.floor(p.y - n.y * 0.5) - o[1], vz = Math.floor(p.z - n.z * 0.5) - o[2];
        return { voxel: [vx, vy, vz], place: [vx + n.x, vy + n.y, vz + n.z], axis: axisOf(n) };
      }
      let place, axis = 1;
      if (hit.object === this.floor) place = [Math.floor(p.x) - o[0], 0, Math.floor(p.z) - o[2]];
      else {
        const n = hit.face.normal;
        axis = axisOf(n);
        place = [Math.floor(p.x + n.x * 0.5) - o[0], Math.floor(p.y + n.y * 0.5) - o[1], Math.floor(p.z + n.z * 0.5) - o[2]];
      }
      if (this.valid(...place)) return { voxel: null, place, axis };
    }
    return null;
  }

  updateCursor(clientX = this.lastX, clientY = this.lastY) {
    this.cursorFill.visible = this.cursorEdge.visible = false;
    if (!this.active() || clientX == null || this.stroke || this.down?.rotating) return;
    const hit = this.pickAt(clientX, clientY);
    if (!hit) return;
    const tool = this.tool;
    const cell = tool === 'build' ? hit.place : hit.voxel;
    if (!cell) return;
    const single = tool === 'pick' || tool === 'fill';
    const o = SLOTS[this.slot].origin;
    const scale = [1, 1, 1];
    if (!single) for (let a = 0; a < 3; a++) if (a !== hit.axis) scale[a] = this.brush;
    const pos = new THREE.Vector3(cell[0] + o[0] + 0.5, cell[1] + o[1] + 0.5, cell[2] + o[2] + 0.5);
    for (const m of [this.cursorFill, this.cursorEdge]) { m.position.copy(pos); m.scale.set(...scale); }
    this.cursorFill.material.color.set(this.color);
    this.cursorFill.visible = tool === 'build';
    this.cursorEdge.material.color.set(tool === 'build' ? '#ffffff' : tool === 'erase' ? '#ff3b3b' : tool === 'pick' ? '#4fd1ff' : this.color);
    this.cursorEdge.visible = true;
  }

  // ---------------- strokes (click or drag) ----------------
  // A stroke stays on the flat layer where it started, so dragging across the
  // top of a hat paints a flat layer instead of stacking blocks toward you.
  startStroke(tool, hit) {
    const cell = tool === 'build' ? hit.place : hit.voxel;
    if (!cell) return false;
    this.pushUndo();
    this.stroke = { tool, axis: hit.axis, layer: cell[hit.axis], last: cell, changed: 0, sfxAt: 0 };
    this.paintAt(cell);
    return true;
  }

  // Where the mouse ray crosses the stroke's layer.
  strokeCell(clientX, clientY) {
    const st = this.stroke;
    const o = SLOTS[this.slot].origin;
    const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const normal = new THREE.Vector3(); normal[AXES[st.axis]] = 1;
    const plane = new THREE.Plane(normal, -(st.layer + o[st.axis] + 0.5));
    const p = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!p) return null;
    const c = [Math.floor(p.x) - o[0], Math.floor(p.y) - o[1], Math.floor(p.z) - o[2]];
    c[st.axis] = st.layer;
    return c;
  }

  continueStroke(clientX, clientY) {
    const st = this.stroke;
    const c = this.strokeCell(clientX, clientY);
    if (!c || c.every((v, i) => v === st.last[i])) return;
    // fill in the gap so fast drags make a solid line
    const steps = Math.max(...c.map((v, i) => Math.abs(v - st.last[i])));
    for (let k = 1; k <= steps; k++) {
      this.paintAt(st.last.map((v, i) => Math.round(v + ((c[i] - v) * k) / steps)));
    }
    st.last = c;
  }

  // Apply the stroke's tool with the brush (and mirror) around one cell.
  paintAt(cell) {
    const st = this.stroke;
    const m = this.model;
    const r = (this.brush - 1) / 2;
    const [ua, va] = [0, 1, 2].filter((a) => a !== st.axis);
    let changed = 0;
    for (let du = -r; du <= r; du++) for (let dv = -r; dv <= r; dv++) {
      const c = [...cell]; c[ua] += du; c[va] += dv;
      const targets = [c];
      if (this.mirror) { const mx = this.mirrorX(c[0]); if (mx !== c[0]) targets.push([mx, c[1], c[2]]); }
      for (const t of targets) {
        if (st.tool === 'build') {
          if (this.valid(...t) && m.get(...t) !== this.color) { m.set(...t, this.color); changed++; }
        } else if (st.tool === 'erase') {
          if (m.has(...t)) { m.delete(...t); changed++; }
        } else if (st.tool === 'paint') {
          if (m.has(...t) && m.get(...t) !== this.color) { m.set(...t, this.color); changed++; }
        }
      }
    }
    if (!changed) return;
    st.changed += changed;
    this.rebuild();
    const now = performance.now();
    if (now > st.sfxAt) { st.sfxAt = now + 70; st.tool === 'erase' ? sfx.remove() : sfx.place(); }
  }

  endStroke() {
    const st = this.stroke;
    this.stroke = null;
    if (st && !st.changed) this.undoStack.pop(); // nothing happened; don't leave an empty undo step
  }

  // Paint bucket: recolor every touching block of the same color.
  fillAt(voxel) {
    const m = this.model;
    const starts = [voxel];
    if (this.mirror) starts.push([this.mirrorX(voxel[0]), voxel[1], voxel[2]]);
    this.pushUndo();
    let changed = 0;
    for (const start of starts) {
      const from = m.get(...start);
      if (!from || from === this.color) continue;
      const queue = [start];
      while (queue.length) {
        const c = queue.pop();
        if (m.get(...c) !== from) continue;
        m.set(...c, this.color);
        changed++;
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) queue.push([c[0] + dx, c[1] + dy, c[2] + dz]);
      }
    }
    if (!changed) { this.undoStack.pop(); return; }
    this.rebuild();
    sfx.place();
  }

  // ---------------- input ----------------
  onDown(e) {
    if (!this.active()) return;
    this.lastX = e.clientX; this.lastY = e.clientY;
    const hit = this.pickAt(e.clientX, e.clientY);
    const tool = e.button === 2 ? 'erase' : this.tool;
    if (e.button === 2 && !hit?.voxel) return; // right-click only ever erases
    const wantsSpin = e.button === 1 || e.shiftKey || !hit || (tool !== 'build' && !hit.voxel);
    try { e.target.setPointerCapture(e.pointerId); } catch {}
    if (wantsSpin || (e.button !== 0 && e.button !== 2)) {
      this.down = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, rotating: true };
      this.cursorFill.visible = this.cursorEdge.visible = false;
      return;
    }
    if (tool === 'pick') { this.setColor(this.model.get(...hit.voxel)); sfx.click(); return; }
    if (tool === 'fill') { this.fillAt(hit.voxel); this.updateCursor(); return; }
    this.down = { stroke: true };
    this.startStroke(tool, hit);
    this.cursorFill.visible = this.cursorEdge.visible = false;
  }
  onMove(e) {
    if (!this.active()) return;
    this.lastX = e.clientX; this.lastY = e.clientY;
    if (this.down?.rotating) {
      const dx = e.clientX - this.down.x, dy = e.clientY - this.down.y;
      this.yaw = this.down.yaw - dx * 0.008;
      this.pitch = Math.max(-1.2, Math.min(1.45, this.down.pitch + dy * 0.008));
      return;
    }
    if (this.stroke) { this.continueStroke(e.clientX, e.clientY); return; }
    this.updateCursor();
  }
  onUp() {
    if (!this.down && !this.stroke) return;
    this.down = null;
    if (this.stroke) this.endStroke();
    this.updateCursor();
  }
  onWheel(e) {
    if (!this.active()) return;
    e.preventDefault();
    this.dist = Math.max(14, Math.min(160, this.dist * (e.deltaY > 0 ? 1.1 : 0.9)));
  }
  onKey(e) {
    if (!this.active()) { if (e.key === 'Escape') this.game.go('home'); return; }
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); this.redo(); return; }
    if (k === 'z') return this.undo();
    if (k === 'y') return this.redo();
    if (k === 'b') return this.setTool('build');
    if (k === 'e') return this.setTool('erase');
    if (k === 'p') return this.setTool('paint');
    if (k === 'c') return this.setTool('pick');
    if (k === 'f') return this.setTool('fill');
    if (k === '[') return this.setBrush(Math.max(1, this.brush - 2));
    if (k === ']') return this.setBrush(Math.min(5, this.brush + 2));
    if (k === 'm') return this.toggleMirror();
    if (/^[0-9]$/.test(k)) return this.setColor(PALETTE[(Number(k) + 9) % 10]);
    if (k === 'arrowleft' || k === 'a') this.yaw -= 0.2;
    if (k === 'arrowright' || k === 'd') this.yaw += 0.2;
    if (k === 'arrowup' || k === 'w') this.pitch = Math.min(1.45, this.pitch + 0.15);
    if (k === 'arrowdown' || k === 's') this.pitch = Math.max(-1.2, this.pitch - 0.15);
    if (k === '=' || k === '+') this.dist = Math.max(14, this.dist * 0.9);
    if (k === '-') this.dist = Math.min(160, this.dist * 1.1);
    if (k === 'escape') this.showPicker();
  }

  update() {
    if (this.mode !== 'edit') return;
    const cp = Math.cos(this.pitch);
    this.camera.position.set(
      this.center.x + Math.sin(this.yaw) * cp * this.dist,
      this.center.y + Math.sin(this.pitch) * this.dist,
      this.center.z + Math.cos(this.yaw) * cp * this.dist);
    this.camera.lookAt(this.center);
  }

  // ---------------- saving ----------------
  save(quiet = false) {
    const s = this.state;
    if (!this.model.count) { toast('Add some blocks first!'); return null; }
    const isNew = !this.editId;
    const id = this.editId || 'c_' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
    const rec = { id, name: (this.name || `My ${NOUN[this.slot]}`).trim(), slot: this.slot, model: this.model.toJSON(), drink: this.drink, created: Date.now() };
    const i = s.custom.findIndex((c) => c.id === id);
    if (i >= 0) s.custom[i] = rec; else { s.custom.push(rec); track('workshop_make', this.slot); }
    setCustomItems(s.custom);
    clearThumb(id);
    this.editId = id;
    // Creativity bonus for new things (a few per day)
    const today = new Date().toDateString();
    if (s.makerBonus?.day !== today) s.makerBonus = { day: today, n: 0 };
    let bonus = 0;
    if (isNew && this.model.count >= 12 && s.makerBonus.n < 5) { s.makerBonus.n++; bonus = 5; s.coins += 5; }
    this.game.S.save();
    if (!quiet) {
      sfx.buy();
      const where = { snack: 'Find it in the Shop.', decor: 'Find it in Decorate.' }[this.slot] || 'Find it in the Wardrobe.';
      toast(`Saved "${rec.name}"!${bonus ? ' +5¢ creativity bonus!' : ''} ${where}`);
    }
    if (isNew) this.buildUI();
    return id;
  }

  tryIt() {
    const id = this.save(true);
    if (!id) return;
    const s = this.state;
    if (this.slot === 'snack') {
      s.pantry[id] = (s.pantry[id] || 0) + 1;
      this.game.S.save();
      this.game.go('home');
      setTimeout(() => this.game.screens.home.feed(id), 400);
    } else if (this.slot === 'decor') {
      let spot = this.game.placeDecor(id);
      if (spot < 0) { spot = 0; s.decor[0] = id; this.game.S.save(); } // den is full: swap out the first thing
      this.game.go('home');
      this.game.applyDecor();
      setTimeout(() => {
        const { world, goblin } = this.game;
        world.pokeDecor(spot);
        world.fx.stars(world.decorTop(spot, 2), 8);
        goblin.act('cheer');
        goblin.emote('love', 2.5);
        this.game.say(`Ooooh, the ${getItem(id).name}! Did you make this?! It's perfect for my den!`, 4);
      }, 300);
    } else {
      s.equipped[this.slot] = id;
      this.game.S.save();
      this.game.go('home');
      this.game.applyOutfit();
      setTimeout(() => {
        this.game.goblin.act('model');
        this.game.goblin.emote('love', 2.5);
        this.game.world.fx.hearts(this.game.goblin.headTop(), 6);
        this.game.say(`I'm wearing the ${getItem(id).name}! Did you make this?! It's AMAZING!`, 4);
      }, 300);
    }
  }

  exportFile() {
    const data = { pocketGoblinItem: 1, name: this.name, slot: this.slot, drink: this.drink, model: this.model.toJSON() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = `${(this.name || 'item').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  deleteItem() {
    if (!this.editId || !confirm(`Delete "${this.name}" forever?`)) return;
    const s = this.state;
    s.custom = s.custom.filter((c) => c.id !== this.editId);
    for (const [slot, id] of Object.entries(s.equipped)) if (id === this.editId) s.equipped[slot] = null;
    s.decor = (s.decor || []).map((id) => (id === this.editId ? null : id));
    delete s.pantry[this.editId];
    setCustomItems(s.custom);
    this.game.S.save();
    toast('Deleted.');
    this.showPicker();
  }
}
