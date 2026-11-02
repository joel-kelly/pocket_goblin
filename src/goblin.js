// The living goblin: body parts, face, outfit, and silly animations.
import * as THREE from '../vendor/three.module.min.js';
import { buildMesh } from './voxel.js';
import { buildGoblinParts, PARTS, SLOTS, SKINS } from './goblinModel.js';
import { drawFace, FACE_W, FACE_H } from './face.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (p) => 1 - (1 - p) * (1 - p);
const bump = (p) => Math.sin(Math.PI * clamp01(p)); // 0 -> 1 -> 0
const window01 = (p, a, b) => clamp01((p - a) / (b - a));

// Each action: duration (s), pose(p, pose, t) and optional events {at: p, name}
const ACTIONS = {
  hop: { dur: 0.45, pose(p, o) { o.y += 5 * bump(p); o.sy *= 1 + 0.15 * bump(p) - 0.12 * bump(p * 4 - 3); } },
  bigHop: { dur: 0.7, pose(p, o) { o.y += 10 * bump(p); o.ry += Math.PI * 2 * easeOut(p); } },
  cheer: {
    dur: 1.0,
    pose(p, o) {
      o.y += 5 * Math.abs(Math.sin(p * Math.PI * 2));
      const up = bump(window01(p, 0, 1)) > 0 ? Math.min(1, p * 5, (1 - p) * 5) : 0;
      o.armL -= 2.6 * up + 0.3 * Math.sin(p * 30) * up;
      o.armR += 2.6 * up + 0.3 * Math.sin(p * 30) * up;
      o.earL -= 0.4 * up; o.earR += 0.4 * up;
    },
  },
  dance: {
    dur: 2.4,
    pose(p, o, t) {
      const e = Math.min(1, p * 6, (1 - p) * 6);
      o.rz += 0.22 * Math.sin(p * Math.PI * 8) * e;
      o.y += 2.5 * Math.abs(Math.sin(p * Math.PI * 8)) * e;
      o.armL -= (1.4 + Math.sin(p * Math.PI * 8) * 1.2) * e;
      o.armR += (1.4 - Math.sin(p * Math.PI * 8) * 1.2) * e;
      o.headRz -= 0.2 * Math.sin(p * Math.PI * 8) * e;
    },
  },
  spin: { dur: 0.8, pose(p, o) { o.ry += Math.PI * 2 * easeOut(p); o.y += 3 * bump(p); } },
  faint: {
    dur: 2.4,
    events: [{ at: 0.25, name: 'thud' }],
    pose(p, o) {
      const wobble = window01(p, 0, 0.18);
      const fall = easeOut(window01(p, 0.12, 0.26)) - easeOut(window01(p, 0.8, 1.0));
      o.rz += 0.15 * Math.sin(wobble * 20) * (1 - fall) * (p < 0.3 ? 1 : 0);
      o.rx -= 1.45 * fall;
      o.y += 3.2 * fall;
      o.armL -= 1.2 * fall; o.armR += 1.2 * fall;
      o.earL += 0.5 * fall; o.earR -= 0.5 * fall;
    },
  },
  shakeNo: { dur: 0.8, pose(p, o) { o.headRy += 0.45 * Math.sin(p * Math.PI * 6) * (1 - p); } },
  nod: { dur: 0.6, pose(p, o) { o.headRx += 0.3 * Math.sin(p * Math.PI * 4) * (1 - p); } },
  eat: {
    dur: 1.4,
    pose(p, o, t) {
      o.headRx += 0.18 * Math.abs(Math.sin(p * Math.PI * 7));
      o.armR += 1.4 * bump(window01(p, 0, 0.4));
      o.sy *= 1 + 0.03 * Math.sin(p * 40);
    },
  },
  fart: {
    dur: 1.8,
    events: [{ at: 0.38, name: 'fart' }],
    pose(p, o) {
      const squat = bump(window01(p, 0, 0.4)) * (p < 0.38 ? 1 : 0) + (p < 0.38 ? 0 : 0);
      const strain = p < 0.38 ? Math.min(1, p * 4) : 0;
      o.sy *= 1 - 0.12 * strain;
      o.sx *= 1 + 0.06 * strain;
      o.torsoRx += 0.35 * strain;
      o.rz += 0.04 * Math.sin(p * 120) * strain;
      const pop = p >= 0.38 ? bump(window01(p, 0.38, 0.62)) : 0;
      o.y += 4 * pop;
      o.sy *= 1 + 0.12 * pop;
      o.earL -= 0.6 * pop; o.earR += 0.6 * pop;
      const after = p >= 0.6 ? Math.min(1, (1 - p) * 5) : 0;
      o.ry += 0.25 * Math.sin(p * 30) * after; // butt wiggle
      o.ry += 2.1 * (easeOut(window01(p, 0, 0.25)) - easeOut(window01(p, 0.75, 1))); // aim the butt at the audience
    },
  },
  burp: {
    dur: 0.9,
    events: [{ at: 0.35, name: 'burp' }],
    pose(p, o) {
      const lean = p < 0.35 ? p / 0.35 : Math.max(0, 1 - (p - 0.35) * 3);
      o.headRx -= 0.35 * lean * (p < 0.35 ? 1 : -1.2);
      o.sy *= 1 + 0.1 * bump(window01(p, 0.3, 0.6));
    },
  },
  shiver: { dur: 1.2, pose(p, o) { o.rz += 0.06 * Math.sin(p * 90) * (1 - p); o.sx *= 1 - 0.05 * bump(p); } },
  wave: {
    dur: 1.4,
    pose(p, o) {
      const up = Math.min(1, p * 5, (1 - p) * 5);
      o.armR += (2.4 + 0.4 * Math.sin(p * Math.PI * 8)) * up;
      o.headRz -= 0.15 * up;
    },
  },
  slump: {
    dur: 1.6,
    pose(p, o) {
      const e = Math.min(1, p * 4, (1 - p) * 4);
      o.headRx += 0.45 * e; o.earL += 0.7 * e; o.earR -= 0.7 * e;
      o.torsoRx += 0.2 * e; o.sy *= 1 - 0.06 * e;
    },
  },
  tantrum: {
    dur: 1.4,
    pose(p, o) {
      const e = Math.min(1, p * 5, (1 - p) * 5);
      o.y += 2.5 * Math.abs(Math.sin(p * Math.PI * 7)) * e;
      o.rz += 0.15 * Math.sin(p * Math.PI * 7) * e;
      o.armL -= (1.5 + 1.2 * Math.sin(p * 50)) * e;
      o.armR += (1.5 + 1.2 * Math.cos(p * 50)) * e;
    },
  },
  model: {
    dur: 2.2,
    pose(p, o) {
      const e = Math.min(1, p * 4, (1 - p) * 4);
      o.ry += 0.6 * Math.sin(p * Math.PI * 2) * e;
      o.armL -= 0.6 * e;
      o.headRz += 0.15 * e;
      o.y += 1.5 * bump(window01(p, 0.7, 0.9));
    },
  },
  wiggle: { dur: 1.2, pose(p, o) { const e = Math.min(1, p * 5, (1 - p) * 5); o.rz += 0.12 * Math.sin(p * 40) * e; o.ry += 0.3 * Math.sin(p * 20) * e; } },
  scratch: {
    dur: 1.4,
    pose(p, o) {
      const e = Math.min(1, p * 5, (1 - p) * 5);
      o.armL -= 0.5 * e; o.armLx -= (0.9 + 0.25 * Math.sin(p * 60)) * e;
      o.headRz += 0.12 * e;
    },
  },
  lookAround: { dur: 2.0, pose(p, o) { o.headRy += 0.5 * Math.sin(p * Math.PI * 2); } },
};

export class Goblin {
  constructor(skin = SKINS['Swamp Green']) {
    this.object = new THREE.Group(); // container (shadow + body)
    this.groups = {};
    for (const [name, def] of Object.entries(PARTS)) {
      const g = new THREE.Group();
      g.name = name;
      this.groups[name] = g;
    }
    for (const [name, def] of Object.entries(PARTS)) {
      const g = this.groups[name];
      if (def.parent) {
        const pp = PARTS[def.parent].pivot;
        g.position.set(def.pivot[0] - pp[0], def.pivot[1] - pp[1], def.pivot[2] - pp[2]);
        this.groups[def.parent].add(g);
      }
    }
    this.object.add(this.groups.root);

    // Blob shadow
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(9, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    this.shadow = shadow;
    this.object.add(shadow);

    // Face
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = FACE_W;
    this.faceCanvas.height = FACE_H;
    this.faceCtx = this.faceCanvas.getContext('2d');
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTex.magFilter = THREE.NearestFilter;
    this.faceTex.minFilter = THREE.NearestFilter;
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 13),
      new THREE.MeshLambertMaterial({ map: this.faceTex, alphaTest: 0.5 })
    );
    face.position.set(0, 20.5 - 14, 5.03);
    this.groups.head.add(face);

    this.partMeshes = {};
    this.itemMeshes = {};
    this.outfit = {};
    this.mood = 'neutral';
    this.emoteName = null;
    this.emoteUntil = 0;
    this.time = 0;
    this.actions = [];
    this.listeners = {};
    this.blinkAt = 2;
    this.blinkUntil = 0;
    this.look = [0, 0];
    this.lookTarget = [0, 0];
    this.lookNext = 1;
    this.lookLock = null;
    this.faceKey = '';
    this.chompUntil = 0;
    this.setSkin(skin);
  }

  on(event, fn) { (this.listeners[event] ||= []).push(fn); }
  emit(event, data) { (this.listeners[event] || []).forEach((fn) => fn(data)); }

  setSkin(skin) {
    this.skin = skin;
    const c = new THREE.Color(skin), hsl = {};
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, Math.max(0, hsl.l - 0.2));
    this.skinDark = '#' + c.getHexString();
    const parts = buildGoblinParts(skin);
    for (const [name, model] of Object.entries(parts)) {
      const old = this.partMeshes[name];
      if (old) { old.parent.remove(old); old.geometry.dispose(); }
      const pv = PARTS[name].pivot;
      const mesh = buildMesh(model, { offset: [-pv[0], -pv[1], -pv[2]] });
      mesh.userData.goblinPart = name;
      this.groups[name].add(mesh);
      this.partMeshes[name] = mesh;
    }
    this.faceKey = '';
    this.updateHair();
  }

  // outfit: { slot: VoxelModel | null }
  setOutfit(outfit) {
    for (const slot of Object.keys(SLOTS)) {
      const model = outfit[slot] || null;
      if (this.outfit[slot] === model) continue;
      const old = this.itemMeshes[slot];
      if (old) { old.parent.remove(old); old.geometry.dispose(); delete this.itemMeshes[slot]; }
      this.outfit[slot] = model;
      if (!model || slot === 'snack') continue;
      const s = SLOTS[slot];
      const pv = PARTS[s.part].pivot;
      const mesh = buildMesh(model, { offset: [s.origin[0] - pv[0], s.origin[1] - pv[1], s.origin[2] - pv[2]] });
      this.groups[s.part].add(mesh);
      this.itemMeshes[slot] = mesh;
    }
    this.updateHair();
  }

  updateHair() {
    if (this.partMeshes.hair) this.partMeshes.hair.visible = !this.outfit.head;
  }

  setMood(name) { this.mood = name; }
  emote(name, seconds = 1.5) {
    this.emoteName = name;
    this.emoteUntil = this.time + seconds;
  }
  clearEmote() { this.emoteUntil = 0; }
  chomp(seconds = 1.2) { this.chompUntil = this.time + seconds; }
  lookAt(x, y) { this.lookLock = x == null ? null : [x, y]; }

  act(name, opts = {}) {
    const def = ACTIONS[name];
    if (!def) return Promise.resolve();
    if (opts.exclusive !== false) this.actions = this.actions.filter((a) => a.def.layer);
    return new Promise((resolve) => {
      this.actions.push({ name, def, t: 0, fired: new Set(), resolve, speed: opts.speed || 1 });
    });
  }
  get busy() { return this.actions.length > 0; }

  worldPoint(part, x, y, z) {
    const pv = PARTS[part].pivot;
    const v = new THREE.Vector3(x - pv[0], y - pv[1], z - pv[2]);
    this.groups[part].updateWorldMatrix(true, false);
    return this.groups[part].localToWorld(v);
  }
  headTop() { return this.worldPoint('head', 0, this.outfit.head ? 34 : 29, 0); }
  mouth() { return this.worldPoint('head', 0, 15.5, 6); }
  butt() { return this.worldPoint('torso', 0, 6, -4); }

  currentExpression() {
    if (this.time < this.chompUntil) return Math.floor(this.time * 7) % 2 ? 'chompShut' : 'chompOpen';
    if (this.time < this.emoteUntil) return this.emoteName;
    return this.mood;
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    const o = { y: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, headRx: 0, headRy: 0, headRz: 0, torsoRx: 0,
      armL: 0, armR: 0, armLx: 0, armRx: 0, earL: 0, earR: 0 };

    // Idle life
    const expr = this.currentExpression();
    const droopy = ['sad', 'crying', 'hungry', 'thirsty', 'bored', 'stinky', 'sleepy'].includes(expr);
    const perky = ['happy', 'ecstatic', 'love', 'money', 'shocked'].includes(expr);
    o.sy *= 1 + 0.018 * Math.sin(t * 2.3);
    o.headRz += 0.035 * Math.sin(t * 1.3);
    o.headRx += droopy ? 0.15 : 0;
    const earBase = droopy ? 0.45 : perky ? -0.25 : 0;
    o.earL += earBase + 0.07 * Math.sin(t * 2.1);
    o.earR -= earBase + 0.07 * Math.sin(t * 2.1 + 0.6);
    o.armL += 0.05 * Math.sin(t * 1.7);
    o.armR -= 0.05 * Math.sin(t * 1.7 + 1);
    if (perky) o.y += 0.6 * Math.abs(Math.sin(t * 4));
    if (this.overlay) this.overlay(o, t); // extra pose from a minigame (e.g. flying)

    // Actions
    for (const a of [...this.actions]) {
      a.t += dt * a.speed;
      const p = Math.min(1, a.t / a.def.dur);
      a.def.pose(p, o, t);
      for (const ev of a.def.events || []) {
        if (p >= ev.at && !a.fired.has(ev.name)) { a.fired.add(ev.name); this.emit(ev.name); }
      }
      if (p >= 1) {
        this.actions.splice(this.actions.indexOf(a), 1);
        a.resolve();
      }
    }

    const g = this.groups;
    g.root.position.y = o.y;
    g.root.rotation.set(o.rx, o.ry, o.rz);
    g.root.scale.set(o.sx, o.sy, o.sx);
    g.torso.rotation.x = o.torsoRx;
    g.head.rotation.set(o.headRx, o.headRy, o.headRz);
    g.armL.rotation.set(o.armLx, 0, o.armL);
    g.armR.rotation.set(o.armRx, 0, o.armR);
    g.earL.rotation.z = o.earL;
    g.earR.rotation.z = o.earR;
    const lift = Math.max(0, o.y);
    this.shadow.scale.setScalar(Math.max(0.4, 1 - lift / 25));

    // Eyes: blink + wander
    if (t > this.blinkAt) { this.blinkUntil = t + 0.13; this.blinkAt = t + 2 + Math.random() * 3.5; }
    if (t > this.lookNext) {
      this.lookTarget = Math.random() < 0.6 ? [0, 0] : [Math.round(Math.random() * 2 - 1), 0];
      this.lookNext = t + 1 + Math.random() * 2.5;
    }
    const target = this.lookLock || this.lookTarget;
    this.look = target;
    const blink = t < this.blinkUntil;
    const frame = Math.floor(t * 10);
    const fkey = `${expr}|${blink}|${this.look}|${frame}`;
    if (fkey !== this.faceKey) {
      this.faceKey = fkey;
      drawFace(this.faceCtx, expr, this.skinDark, { look: this.look, blink, t });
      this.faceTex.needsUpdate = true;
    }
  }
}
