// Particle effects made of tiny cubes and pixel sprites.
import * as THREE from '../vendor/three.module.min.js';

const box = new THREE.BoxGeometry(1, 1, 1);
const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}

const SPRITES = {
  heart: ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
  star: ['...Y...', '..YYY..', 'YYYYYYY', '.YYYYY.', '.YY.YY.', 'Y.....Y'],
  note: ['..KKK', '..K.K', '..K..', 'KKK..', 'KKK..'],
  stink: ['.G..', 'G...', '.G..', '..G.', '.G..', 'G...'],
  bubble: ['.BBB.', 'B.W.B', 'B...B', 'B...B', '.BBB.'],
  coin: ['.YYY.', 'YOYYY', 'YOYYY', 'YOYYY', '.YYY.'],
  sweat: ['..B..', '.BBB.', 'BBBBB', 'BBBBB', '.BBB.'],
  zap: ['..Y', '.Y.', 'YYY', '.Y.', 'Y..'],
};
const SP_PAL = { R: '#ff3b5c', Y: '#ffe14d', K: '#222', G: '#9be060', B: '#bfefff', W: '#fff', O: '#e0a020' };
const texCache = new Map();
function spriteTex(name) {
  if (texCache.has(name)) return texCache.get(name);
  const rows = SPRITES[name];
  const c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (SP_PAL[ch]) { g.fillStyle = SP_PAL[ch]; g.fillRect(x, y, 1, 1); } }));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(name, t);
  return t;
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
  }

  add(obj, p) {
    this.scene.add(obj);
    this.parts.push({ obj, age: 0, gravity: 0, drag: 0.98, spin: 0, s0: 1, s1: 0, fade: false, ...p });
  }

  cube(pos, color, opts = {}) {
    const m = new THREE.Mesh(box, mat(color));
    m.position.copy(pos);
    this.add(m, opts);
  }

  sprite(pos, name, opts = {}) {
    const material = new THREE.SpriteMaterial({ map: spriteTex(name), transparent: true, depthWrite: false });
    const s = new THREE.Sprite(material);
    s.position.copy(pos);
    this.add(s, { fade: true, ...opts });
  }

  // ---- presets ----
  // dir = direction the butt is pointing (world space)
  fart(pos, size = 1, dir = new THREE.Vector3(0, 0, -1)) {
    const greens = ['#9be060', '#b5d65a', '#7fbf3f', '#c9e27a', '#a3a84a'];
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const n = Math.round(18 + size * 16);
    for (let i = 0; i < n; i++) {
      const v = dir.clone().multiplyScalar(6 + Math.random() * 10)
        .addScaledVector(side, (Math.random() - 0.5) * 14)
        .add(new THREE.Vector3(0, Math.random() * 5 + 1, 0));
      this.cube(pos.clone(), greens[i % greens.length], {
        vel: v.multiplyScalar(size * 0.8 + 0.5), life: 1.8 + Math.random() * 1.2, s0: 0.8, s1: 3.5 + Math.random() * 2.5 * size, s2: 0, drag: 0.93, spin: 2,
      });
    }
    for (let i = 0; i < 3; i++) {
      this.sprite(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 2, -1)), 'stink', {
        vel: new THREE.Vector3(0, 4, 0), life: 2, s0: 3, s1: 4,
      });
    }
  }
  burp(pos) {
    for (let i = 0; i < 10; i++) {
      this.cube(pos.clone(), i % 2 ? '#d8f0a0' : '#ffffff', {
        vel: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 4 + 2, Math.random() * 10 + 6),
        life: 0.9, s0: 0.5, s1: 2, s2: 0, drag: 0.9,
      });
    }
  }
  hearts(pos, n = 5) {
    for (let i = 0; i < n; i++) {
      this.sprite(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 3, 2)), 'heart', {
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 8 + Math.random() * 5, 0), life: 1.4 + Math.random() * 0.5, s0: 2.5, s1: 3.5, delay: i * 0.08,
      });
    }
  }
  stars(pos, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.sprite(pos.clone(), 'star', {
        vel: new THREE.Vector3(Math.cos(a) * 14, Math.sin(a) * 10 + 6, 3), life: 0.9, s0: 3, s1: 1, drag: 0.92,
      });
    }
  }
  coins(pos, n = 5) {
    for (let i = 0; i < n; i++) {
      this.sprite(pos.clone(), 'coin', {
        vel: new THREE.Vector3((Math.random() - 0.5) * 14, 14 + Math.random() * 8, 4), gravity: -40, life: 1.1, s0: 2.5, s1: 2.5,
      });
    }
  }
  notes(pos) {
    for (let i = 0; i < 4; i++) {
      this.sprite(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 0, 2)), 'note', {
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, 7, 0), life: 1.5, s0: 2.5, s1: 2.5, delay: i * 0.25,
      });
    }
  }
  confetti(pos, n = 40) {
    const cols = ['#ff3b5c', '#ffe14d', '#4fd1ff', '#8fdc3a', '#ff86b8', '#9a6bff'];
    for (let i = 0; i < n; i++) {
      this.cube(pos.clone(), cols[i % cols.length], {
        vel: new THREE.Vector3((Math.random() - 0.5) * 40, Math.random() * 30 + 15, (Math.random() - 0.5) * 20 + 5),
        gravity: -45, life: 1.8 + Math.random(), s0: 0.9, s1: 0.9, spin: 8, drag: 0.97,
      });
    }
  }
  bubbles(pos, n = 18) {
    for (let i = 0; i < n; i++) {
      this.sprite(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 18, Math.random() * 25, 4)), 'bubble', {
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 3 + Math.random() * 3, 0), life: 1.5 + Math.random(), s0: 1.5, s1: 3.5, delay: Math.random() * 0.8,
      });
    }
  }
  stink(pos) {
    this.sprite(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 14, 0, 0)), 'stink', {
      vel: new THREE.Vector3(0, 5, 0), life: 1.8, s0: 3, s1: 4,
    });
  }
  sweat(pos) {
    this.sprite(pos.clone(), 'sweat', { vel: new THREE.Vector3(6, 4, 2), gravity: -30, life: 0.8, s0: 2, s1: 2 });
  }
  flames(pos) {
    const cols = ['#ff3b1f', '#ff8a1f', '#ffe14d'];
    for (let i = 0; i < 6; i++) {
      this.cube(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 6)), cols[i % 3], {
        vel: new THREE.Vector3(0, 12 + Math.random() * 6, 0), life: 0.6, s0: 1.6, s1: 0, drag: 0.95,
      });
    }
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (p.delay > 0) { p.delay -= dt; p.obj.visible = false; continue; }
      p.obj.visible = true;
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) {
        this.scene.remove(p.obj);
        if (p.obj.isSprite) p.obj.material.dispose();
        this.parts.splice(i, 1);
        continue;
      }
      if (p.vel) {
        p.vel.y += p.gravity * dt;
        p.vel.multiplyScalar(Math.pow(p.drag, dt * 60));
        p.obj.position.addScaledVector(p.vel, dt);
      }
      // scale: s0 -> s1 (-> s2 at the end if given)
      let s;
      if (p.s2 != null) s = k < 0.5 ? p.s0 + (p.s1 - p.s0) * (k / 0.5) : p.s1 + (p.s2 - p.s1) * ((k - 0.5) / 0.5);
      else s = p.s0 + (p.s1 - p.s0) * k;
      p.obj.scale.setScalar(Math.max(0.001, s));
      if (p.spin && !p.obj.isSprite) { p.obj.rotation.x += p.spin * dt; p.obj.rotation.y += p.spin * dt * 0.7; }
      if (p.fade && p.obj.material) p.obj.material.opacity = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    }
  }
}
