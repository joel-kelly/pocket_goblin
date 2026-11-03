// Renderer (chunky pixels!), the goblin's den, cameras, and item thumbnails.
import * as THREE from '../vendor/three.module.min.js';
import { VoxelModel, buildMesh } from './voxel.js';
import { Goblin } from './goblin.js';
import { FX } from './fx.js';

const hash = (x, y, z) => {
  let n = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  n = Math.imul(n ^ (n >>> 13), 0x5bd1e995);
  return ((n ^ (n >>> 15)) >>> 0) % 1000 / 1000;
};

// Camera framings. target = point to look at, pos = camera position.
const VIEWS = {
  home:     { pos: [0, 24, 100], target: [0, 15, 0] },
  side:     { pos: [16, 22, 92],  target: [16, 14, 0] },   // goblin on the left, panel on the right
  gauntlet: { pos: [28, 22, 118], target: [28, 17, 0] },
  closeup:  { pos: [12, 22, 70],  target: [12, 16, 0] },
  away:     { pos: [0, 24, 100], target: [0, 15, 0] },
  decor:    { pos: [20, 30, 150], target: [20, 18, -6] },   // whole den visible left of the panel
};

// Where decor can go in the den (center of the item's floor). Left spots come
// first so new stuff shows up next to the goblin, even with a panel open.
export const DECOR_SPOTS = [
  { name: 'Front left', pos: [-23, 0, 8] },
  { name: 'Back left', pos: [-15, 0, -20] },
  { name: 'Shelf', pos: [-27, 22, -21] },
  { name: 'Front right', pos: [23, 0, 8] },
  { name: 'Back right', pos: [16, 0, -21] },
];
// Decor is drawn a bit smaller than the goblin's blocks so it doesn't crowd the den.
export const DECOR_SCALE = 0.75;

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.pixelScale = 3;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#2b1d33');
    this.scene.fog = new THREE.Fog('#2b1d33', 140, 260);
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 600);
    this.view = 'home';
    this.camPos = new THREE.Vector3(...VIEWS.home.pos);
    this.camTarget = new THREE.Vector3(...VIEWS.home.target);
    this.camera.position.copy(this.camPos);

    this.addLights(this.scene);
    this.buildDen();
    this.decor = [];
    this.decorGroup = new THREE.Group();
    this.scene.add(this.decorGroup);

    this.goblin = new Goblin();
    this.goblin.shadow.visible = false;
    this.goblin.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    this.scene.add(this.goblin.object);
    this.fx = new FX(this.scene);

    this.active = null; // optional override {scene, camera}
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  addLights(scene) {
    scene.add(new THREE.HemisphereLight('#ffe9d0', '#4a3550', 1.6));
    const sun = new THREE.DirectionalLight('#fff3dd', 2.2);
    sun.position.set(30, 70, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -40; sc.near = 1; sc.far = 200;
    sun.shadow.bias = -0.002;
    scene.add(sun);
    this.sun = sun;
  }

  buildDen() {
    const den = new THREE.Group();
    // Floor: mossy dirt, 120 x 90
    const floor = new VoxelModel(null);
    floor.box(-110, -1, -28, 110, 0, 62, (x, y, z) => {
      const r = hash(x, 0, z);
      const rug = ((x / 1.3) ** 2 + ((z - 6) / 0.8) ** 2) < 26 ** 2;
      if (rug) {
        const ring = Math.floor(Math.sqrt((x / 1.3) ** 2 + ((z - 6) / 0.8) ** 2) / 4);
        return ['#b8423a', '#d9813a', '#b8423a', '#e8c25a', '#8a3a5a', '#b8423a', '#d9813a'][ring % 7];
      }
      return r < 0.15 ? '#5e7a32' : r < 0.55 ? '#6e5236' : r < 0.8 ? '#7a5c3c' : '#5a422c';
    });
    const floorMesh = buildMesh(floor, { jitter: 0.1 });
    floorMesh.receiveShadow = true;
    den.add(floorMesh);

    // Back wall with a round window
    const wall = new VoxelModel(null);
    wall.box(-110, 0, -30, 110, 56, -28, (x, y, z) => {
      const row = Math.floor(y / 3);
      const brick = Math.floor((x + (row % 2) * 3) / 6);
      const mortar = y % 3 === 0 || (x + (row % 2) * 3) % 6 === 0;
      if (mortar) return '#3e3346';
      const r = hash(brick, row, 1);
      return r < 0.3 ? '#6d5f78' : r < 0.6 ? '#7c6d86' : r < 0.85 ? '#5f526a' : '#4f8a3a';
    });
    for (let x = 16; x < 37; x++) for (let y = 20; y < 41; y++) {
      if ((x - 26) ** 2 + (y - 30) ** 2 < 49) { wall.delete(x, y, -30); wall.delete(x, y, -29); }
    }
    // wooden window frame + cross bars
    for (let x = 16; x < 37; x++) for (let y = 20; y < 41; y++) {
      const d = (x - 26) ** 2 + (y - 30) ** 2;
      if (d >= 49 && d < 81) wall.set(x, y, -28, '#6b4423');
      else if (d < 49 && (x === 26 || y === 30)) wall.set(x, y, -29, '#7a5230');
    }
    const wallMesh = buildMesh(wall, { jitter: 0.08 });
    wallMesh.receiveShadow = true;
    den.add(wallMesh);
    // Sky behind window
    const skyMat = new THREE.MeshBasicMaterial({ color: '#7fc8ff' });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), skyMat);
    sky.position.set(26.5, 30.5, -31);
    den.add(sky);
    this.skyMat = skyMat;
    const moon = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.5), new THREE.MeshBasicMaterial({ color: '#fff6c0' }));
    moon.position.set(29, 33, -30.8);
    den.add(moon);
    this.moon = moon;
    this.stars = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      st.position.set(20 + Math.random() * 13, 25 + Math.random() * 11, -30.9);
      this.stars.add(st);
    }
    den.add(this.stars);

    // Sock pile bed
    const socks = new VoxelModel(null);
    const sockCols = ['#e9e2d0', '#ff86b8', '#4fd1ff', '#ffe14d', '#8fdc3a', '#ff6a3a', '#9a6bff'];
    socks.sphere(-30, 0, -14, 9, (x, y, z) => sockCols[Math.floor(hash(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2)) * 7)], 4.5);
    den.add(buildMesh(socks, { jitter: 0.1 }));

    // Trash can (goblin pantry)
    const can = new VoxelModel(null);
    can.cyl(30, -14, 5, 0, 12, (x, y) => (y % 4 === 0 ? '#6c7380' : '#8a929e'));
    can.cyl(30, -14, 5.6, 12, 13, '#a0a8b4');
    can.box(29, 13, -15, 32, 14, -13, '#6c7380');
    // fish skeleton poking out
    const bone = '#e9e2d0';
    can.box(25, 15, -11, 33, 16, -10, bone);
    for (const x of [26, 28, 30]) can.box(x, 13, -11, x + 1, 18, -10, bone);
    can.box(33, 14, -11, 35, 17, -10, bone);
    can.set(34, 16, -10, '#1b1020');
    can.box(23, 14, -11, 25, 15, -10, bone); can.box(23, 16, -11, 25, 17, -10, bone);
    const banana = '#ffe14d';
    can.set(33, 13, -12, banana); can.set(34, 14, -12, banana); can.set(35, 14, -12, banana);
    den.add(buildMesh(can));

    // Mushrooms
    const shrooms = new VoxelModel(null);
    for (const [mx, mz, s] of [[-42, 10, 1], [-38, 18, 0.7], [44, 8, 1.2], [40, 20, 0.8], [-44, -4, 0.8], [41, -22, 0.6]]) {
      const hgt = Math.round(3 * s) + 1;
      shrooms.box(mx, 0, mz, mx + 1, hgt, mz + 1, '#efe6d0');
      shrooms.sphere(mx + 0.5, hgt, mz + 0.5, 2.6 * s, (x, y, z) => (hash(x, y, z) < 0.2 ? '#ffffff' : '#e23a3a'), 1.6 * s);
    }
    for (const [x, y, z] of [...shrooms.each()]) {
      const c = shrooms.get(x, y, z);
      if (c !== '#efe6d0' && y < 2) shrooms.delete(x, y, z);
    }
    const shroomMesh = buildMesh(shrooms);
    den.add(shroomMesh);

    // Wooden shelf (a decor spot)
    const shelf = new VoxelModel(null);
    shelf.box(-35, 20, -28, -19, 22, -14, (x, y, z) => (y === 21 ? (hash(x, 3, z) < 0.3 ? '#7a5230' : '#8a5a30') : '#6b4423'));
    for (const bx of [-33, -22]) {
      shelf.box(bx, 16, -28, bx + 1, 20, -26, '#5a3a1a');
      shelf.box(bx, 19, -26, bx + 1, 20, -22, '#5a3a1a');
    }
    const shelfMesh = buildMesh(shelf, { jitter: 0.1 });
    shelfMesh.receiveShadow = true;
    den.add(shelfMesh);

    // Torch on the wall
    const torch = new VoxelModel(null);
    torch.box(-14, 22, -28, -12, 30, -26, '#5a3a1a');
    torch.box(-15, 30, -28, -11, 32, -25, '#7a5a3a');
    den.add(buildMesh(torch));
    this.flame = new THREE.Group();
    const fl = [['#ff3b1f', 2.6], ['#ff8a1f', 1.8], ['#ffe14d', 1]];
    fl.forEach(([c, s], i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 1.4, s), new THREE.MeshBasicMaterial({ color: c }));
      m.position.y = i * 0.6;
      this.flame.add(m);
    });
    this.flame.position.set(-13, 33.5, -26.5);
    den.add(this.flame);
    this.torchLight = new THREE.PointLight('#ff9a4a', 600, 70, 1.6);
    this.torchLight.position.set(-13, 34, -22);
    den.add(this.torchLight);

    this.den = den;
    this.scene.add(den);
  }

  // list[i] = { id, model, anim } for decor spot i, or null for an empty spot.
  setDecor(list) {
    for (let i = 0; i < DECOR_SPOTS.length; i++) {
      const want = list[i] || null;
      const have = this.decor[i];
      if (have && want && have.id === want.id && have.model === want.model) continue;
      if (have) { this.decorGroup.remove(have.group); have.mesh.geometry.dispose(); this.decor[i] = null; }
      if (!want) continue;
      const g = new THREE.Group();
      g.position.set(...DECOR_SPOTS[i].pos);
      const [sx, , sz] = want.model.size;
      const mesh = buildMesh(want.model, { offset: [-sx / 2, 0, -sz / 2] });
      mesh.receiveShadow = true;
      g.add(mesh);
      this.decorGroup.add(g);
      const top = mesh.geometry.boundingBox.max.y;
      this.decor[i] = { ...want, spot: i, group: g, mesh, top, t: Math.random() * 10, poke: 0, puffAt: 2 + Math.random() * 4 };
    }
  }

  // Which decor spot (if any) a ray hits: { spot, distance } or null.
  decorHit(raycaster) {
    const hit = raycaster.intersectObject(this.decorGroup, true)[0];
    const spot = hit ? this.decor.findIndex((d) => d && d.mesh === hit.object) : -1;
    return spot >= 0 ? { spot, distance: hit.distance } : null;
  }
  decorTop(i, extra = 0) {
    const d = this.decor[i];
    return d.group.position.clone().add(new THREE.Vector3(0, d.top * d.group.scale.y + extra, 0));
  }
  pokeDecor(i) { if (this.decor[i]) this.decor[i].poke = 0.8; }

  updateDecor(dt) {
    for (const d of this.decor) {
      if (!d) continue;
      d.t += dt;
      let sx = 1, sy = 1, rz = 0;
      if (d.anim === 'squish') { const w = Math.sin(d.t * 3); sy += 0.07 * w; sx -= 0.04 * w; }
      if (d.anim === 'sway') rz = 0.05 * Math.sin(d.t * 0.9);
      if (d.anim === 'bob') sy += 0.02 * Math.sin(d.t * 1.6);
      if (d.anim === 'stink' && d.t > d.puffAt) {
        d.puffAt = d.t + 2.5 + Math.random() * 4;
        this.fx.sprite(this.decorTop(d.spot, 1), 'stink', { vel: new THREE.Vector3((Math.random() - 0.5) * 2, 4, 0), life: 1.6, s0: 2, s1: 3.2 });
        d.poke = Math.max(d.poke, 0.25);
      }
      if (d.poke > 0) {
        d.poke = Math.max(0, d.poke - dt);
        const k = d.poke / 0.8;
        sy *= 1 + 0.18 * Math.sin(d.poke * 30) * k;
        sx *= 1 - 0.1 * Math.sin(d.poke * 30) * k;
      }
      d.group.scale.set(sx * DECOR_SCALE, sy * DECOR_SCALE, sx * DECOR_SCALE);
      d.group.rotation.z = rz;
    }
  }

  setPixelScale(s) { this.pixelScale = s; this.resize(); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(Math.max(1, Math.ceil(w / this.pixelScale)), Math.max(1, Math.ceil(h / this.pixelScale)), false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.active?.camera) { this.active.camera.aspect = w / h; this.active.camera.updateProjectionMatrix(); }
  }

  setView(name, instant = false) {
    this.view = name;
    if (instant) {
      this.camPos.set(...VIEWS[name].pos);
      this.camTarget.set(...VIEWS[name].target);
    }
  }

  update(dt) {
    const v = VIEWS[this.view];
    const k = 1 - Math.pow(0.02, dt);
    this.camPos.lerp(new THREE.Vector3(...v.pos), k);
    this.camTarget.lerp(new THREE.Vector3(...v.target), k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
    this.goblin.update(dt);
    this.updateDecor(dt);
    this.fx.update(dt);
    const t = performance.now() / 1000;
    this.flame.scale.set(1 + 0.1 * Math.sin(t * 13), 1 + 0.2 * Math.sin(t * 17), 1);
    this.torchLight.intensity = 500 + 120 * Math.sin(t * 11) + 60 * Math.sin(t * 23);
    // Real-world day/night in the window
    const hr = new Date().getHours() + new Date().getMinutes() / 60;
    const day = hr > 7 && hr < 19;
    this.skyMat.color.set(day ? '#7fc8ff' : '#1a1f4a');
    this.moon.material.color.set(day ? '#fff2a0' : '#f4f4ff');
    this.stars.visible = !day;
  }

  render() {
    if (this.active) this.renderer.render(this.active.scene, this.active.camera);
    else this.renderer.render(this.scene, this.camera);
  }

  // CSS pixel position of a world point (for speech bubbles, popups).
  toScreen(v3, camera = this.active?.camera || this.camera) {
    const p = v3.clone().project(camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, behind: p.z > 1 };
  }
}

// ---------- Thumbnails ----------
let thumbRenderer = null, thumbScene = null, thumbCam = null;
const thumbCache = new Map();

export function thumbnail(model, cacheKey) {
  if (cacheKey && thumbCache.has(cacheKey)) return thumbCache.get(cacheKey);
  if (!thumbRenderer) {
    const c = document.createElement('canvas');
    c.width = c.height = 72;
    thumbRenderer = new THREE.WebGLRenderer({ canvas: c, alpha: true, preserveDrawingBuffer: true, antialias: false });
    thumbRenderer.setPixelRatio(1);
    thumbRenderer.setSize(72, 72, false);
    thumbScene = new THREE.Scene();
    thumbScene.add(new THREE.HemisphereLight('#ffffff', '#6a5a80', 2.2));
    const d = new THREE.DirectionalLight('#ffffff', 1.8);
    d.position.set(1, 2, 3);
    thumbScene.add(d);
    thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
  }
  const mesh = buildMesh(model);
  const bb = mesh.geometry.boundingBox;
  const center = new THREE.Vector3(); bb.getCenter(center);
  const size = new THREE.Vector3(); bb.getSize(size);
  const r = Math.max(size.x, size.y, size.z, 1);
  const dir = new THREE.Vector3(0.55, 0.45, 1).normalize();
  thumbCam.position.copy(center).addScaledVector(dir, r * 2.4);
  thumbCam.lookAt(center);
  thumbScene.add(mesh);
  thumbRenderer.render(thumbScene, thumbCam);
  thumbScene.remove(mesh);
  mesh.geometry.dispose();
  const url = thumbRenderer.domElement.toDataURL();
  if (cacheKey) thumbCache.set(cacheKey, url);
  return url;
}
export function clearThumb(key) { thumbCache.delete(key); }
