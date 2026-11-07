// Fart Rocket in the Classic 90s look: a vertical scroller through painted
// pixel-art zones (swamp, treetops, clouds, birds, airplanes, space, the Moon,
// Planet Pickle, the space dump and the Butt Nebula). Each landmark sits at its
// zone's altitude (1 meter = 1 world unit). Far-away layers scroll slower.
import * as THREE from '../../vendor/three.module.min.js';
import { hash, paint, blob, strip, sprite, texture } from '../pixelArt.js';

export const CAM_DIST = 150; // zoom: a bit wider than the 3D look, to show more sky

// Sky color by altitude: EGA blues getting darker into space (dithering blends the steps).
export const RETRO_SKY = [[0, '#55aaff'], [300, '#5555ff'], [600, '#0000aa'], [850, '#000055'], [1200, '#000000'], [99999, '#000000']];

// Seeded random numbers, so the scenery is the same every flight.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- painted pieces ----------
const ground = () => paint(128, 44, (px) => {
  for (let x = 0; x < 128; x++) {
    if (hash(x, 1) < 0.3) px(x, 2, '#55ff55');
    if (hash(x, 2) < 0.08) { px(x, 1, '#55ff55'); px(x, 0, '#55ff55'); }
    for (let y = 3; y < 7; y++) px(x, y, y === 3 ? '#55ff55' : hash(x, y) < 0.25 ? '#55aa00' : '#00aa00');
    px(x, 7 + (hash(Math.floor(x / 3), 9) < 0.5 ? 1 : 0), '#005500');
    for (let y = 9; y < 44; y++) { const r = hash(x, y * 3); px(x, y, r < 0.06 ? '#552a00' : r < 0.1 ? '#aa7744' : '#aa5500'); }
  }
  for (let i = 0; i < 6; i++) blob(px, 8 + i * 21, 16 + (i % 3) * 8, 3, 2, '#aaaaaa', '#552a00');
});

const launchPad = () => paint(34, 6, (px) => {
  for (let x = 0; x < 34; x++) for (let y = 0; y < 6; y++) {
    const edge = x === 0 || x === 33 || y === 0 || y === 5;
    px(x, y, edge ? '#000000' : y === 1 ? '#ffaa55' : x % 8 === 0 ? '#552a00' : '#aa7744');
  }
  for (let x = 3; x < 31; x += 4) px(x, 1, '#ffff55'); // hazard stripes
});

function tree(h, r) {
  const w = r * 2 + 6, cv = paint(w, h + r + 4, (px) => {
    const cx = w / 2, base = h + r + 3;
    for (let y = r; y < base; y++) { px(cx - 2, y, '#000000'); px(cx - 1, y, '#552a00'); px(cx, y, '#885533'); px(cx + 1, y, '#000000'); }
    blob(px, cx - 0.5, r + 1, r, r * 0.85, '#55aa00');
    blob(px, cx - r * 0.35, r * 0.6, r * 0.3, r * 0.22, '#aaff55', null);
    for (let i = 0; i < 6; i++) px(cx - r * 0.5 + hash(i, h) * r, r + 1 + hash(h, i) * r * 0.6, '#005500');
  });
  return cv;
}

// Far hills, filled solid all the way down so they never float as the camera rises.
const hills = () => paint(240, 240, (px) => {
  for (let x = 0; x < 240; x++) {
    const h = 220 + 12 * Math.sin(x / 26) + 6 * Math.sin(x / 11 + 1);
    for (let y = 0; y < h; y++) px(x, 239 - y, h - y < 3 ? '#55ffff' : '#00aaaa');
  }
});

function cloud(w, seed, pale = false) {
  const rnd = seeded(seed), h = Math.round(w * 0.55);
  const puffs = [];
  for (let i = 0; i < 4; i++) puffs.push([w * (0.22 + 0.56 * i / 3) + (rnd() - 0.5) * 4, h * 0.55 + (rnd() - 0.5) * 3, w * (0.16 + rnd() * 0.08), h * (0.26 + rnd() * 0.12)]);
  puffs.push([w * 0.5, h * 0.4, w * 0.2, h * 0.32]);
  const fill = pale ? '#aaaaaa' : '#ffffff', line = pale ? '#55aaff' : '#000000';
  return paint(w + 4, h + 4, (px, g) => {
    for (const [x, y, rx, ry] of puffs) blob(px, x + 2, y + 2, rx, ry, line, null);
    for (const [x, y, rx, ry] of puffs) blob(px, x + 2, y + 2, rx - 1, ry - 1, fill, null);
    if (pale) return;
    // shade the bottom edge light blue
    const img = g.getImageData(0, 0, w + 4, h + 4).data;
    for (let x = 0; x < w + 4; x++) {
      for (let y = h + 3; y >= 0; y--) {
        const i = (y * (w + 4) + x) * 4;
        if (img[i + 3] && img[i] > 200) { px(x, y, '#55ffff'); px(x, y - 1, '#55ffff'); break; }
      }
    }
  });
}

// Two wing positions for a flapping bird.
const bird = (up) => paint(12, 8, (px) => {
  blob(px, 5, 4, 3, 1.5, '#555555');
  px(9, 4, '#000000'); px(10, 4, '#ffaa55'); px(11, 4, '#ffaa55'); // head + beak
  px(8, 3, '#555555'); px(8, 3, '#ffffff');
  for (let i = 0; i < 4; i++) px(3 + i, up ? 2 - Math.floor(i / 2) : 6 + Math.floor(i / 2), '#000000');
});

const plane = () => paint(36, 16, (px) => {
  // body
  for (let x = 2; x < 32; x++) for (let y = 6; y < 11; y++) px(x, y, y === 6 || y === 10 ? '#000000' : '#ffffff');
  for (let y = 7; y < 10; y++) px(32, y, '#000000');
  px(33, 8, '#000000');
  for (let x = 8; x < 28; x += 4) px(x, 8, '#55aaff'); // windows
  px(30, 7, '#55ffff'); px(31, 7, '#55ffff');
  // tail and wing
  for (let y = 1; y < 6; y++) for (let x = 2; x < 6 - Math.floor(y / 2); x++) px(x, y, x === 2 || y === 1 ? '#000000' : '#ff5555');
  for (let x = 12; x < 22; x++) { px(x, 11, '#000000'); px(x, 12, x < 21 ? '#ff5555' : '#000000'); px(x, 13, '#000000'); }
  for (let x = 2; x < 32; x++) px(x, 9, x % 2 ? '#aaaaaa' : '#ffffff');
});

const stars = () => paint(128, 128, (px) => {
  const rnd = seeded(7);
  for (let i = 0; i < 60; i++) px(rnd() * 128, Math.floor(rnd() * 128), rnd() < 0.7 ? '#ffffff' : '#ffff55');
  for (let i = 0; i < 5; i++) { // twinkly crosses
    const x = rnd() * 124 + 2, y = Math.floor(rnd() * 124) + 2;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) px(x + dx, y + dy, dx || dy ? '#55ffff' : '#ffffff');
  }
});

const moon = () => paint(70, 70, (px) => {
  blob(px, 35, 35, 32, 32, '#ffaa55');
  blob(px, 31, 31, 27, 27, '#ffdd99', null);
  for (const [x, y, r] of [[22, 24, 6], [44, 20, 4], [40, 44, 8], [20, 46, 4], [52, 34, 3]]) {
    blob(px, x, y, r, r, '#aa7744', null);
    blob(px, x + 1, y + 1, r - 1.5, r - 1.5, '#ffaa55', null);
  }
});

const planetPickle = () => paint(100, 70, (px) => {
  // ring behind
  for (let a = 0; a < 360; a += 0.5) { const t = a * Math.PI / 180; if (Math.sin(t) < 0) { px(50 + Math.cos(t) * 46, 38 + Math.sin(t) * 9, '#ffaa55'); px(50 + Math.cos(t) * 44, 38 + Math.sin(t) * 8, '#aa5500'); } }
  // pickle body
  blob(px, 50, 35, 20, 32, '#55aa00');
  blob(px, 46, 30, 14, 26, '#aaff55', null);
  for (let i = 0; i < 18; i++) blob(px, 34 + hash(i, 3) * 32, 8 + hash(3, i) * 54, 1.5, 1.5, '#005500', null);
  // a goofy face
  blob(px, 43, 28, 3, 3, '#ffffff'); blob(px, 57, 28, 3, 3, '#ffffff');
  px(43, 29, '#000000'); px(57, 29, '#000000');
  for (let x = 44; x < 57; x++) px(x, 40 + Math.round(Math.sin((x - 44) / 12 * Math.PI) * 3), '#000000');
  // ring in front
  for (let a = 0; a < 360; a += 0.5) { const t = a * Math.PI / 180; if (Math.sin(t) >= 0) { px(50 + Math.cos(t) * 46, 38 + Math.sin(t) * 9, '#ffaa55'); px(50 + Math.cos(t) * 44, 38 + Math.sin(t) * 8, '#aa5500'); } }
});

// Space junk: little painted pieces of trash.
const JUNK = [
  () => paint(10, 14, (px) => { // sock
    for (let y = 0; y < 9; y++) for (let x = 3; x < 8; x++) px(x, y, y < 2 ? '#ff5555' : '#ffffff');
    for (let y = 8; y < 12; y++) for (let x = 0; x < 8; x++) px(x, y, '#ffffff');
    for (let x = 0; x < 3; x++) px(x, 11, '#aaaaaa');
  }),
  () => paint(8, 12, (px) => { // soda can
    for (let y = 0; y < 12; y++) for (let x = 1; x < 7; x++) px(x, y, y === 0 || y === 11 ? '#aaaaaa' : y > 3 && y < 7 ? '#ffffff' : '#ff5555');
  }),
  () => paint(16, 8, (px) => { // fish bones
    for (let x = 3; x < 13; x++) px(x, 4, '#ffffff');
    for (let x = 5; x < 12; x += 2) { px(x, 2, '#ffffff'); px(x, 3, '#ffffff'); px(x, 5, '#ffffff'); px(x, 6, '#ffffff'); }
    blob(px, 13.5, 4, 2, 2, '#ffffff'); px(14, 3, '#000000');
    px(1, 2, '#ffffff'); px(2, 3, '#ffffff'); px(1, 6, '#ffffff'); px(2, 5, '#ffffff');
  }),
  () => paint(16, 16, (px) => { // tire
    blob(px, 8, 8, 6.5, 6.5, '#333333');
    blob(px, 8, 8, 2.5, 2.5, '#aaaaaa');
  }),
  () => paint(14, 10, (px) => { // banana peel
    blob(px, 7, 6, 4, 3, '#ffff55');
    for (let i = 0; i < 4; i++) { px(2 - i * 0.3, 6 + i, '#ffff55'); px(12 + i * 0.3, 6 + i, '#ffff55'); }
    px(7, 2, '#552a00'); px(7, 1, '#552a00');
  }),
  () => paint(12, 14, (px) => { // old boot
    for (let y = 0; y < 10; y++) for (let x = 2; x < 7; x++) px(x, y, '#885533');
    for (let y = 9; y < 13; y++) for (let x = 0; x < 11; x++) px(x, y, y === 12 ? '#000000' : '#885533');
    px(5, 3, '#ffdd99'); px(5, 5, '#ffdd99');
  }),
];

// The Butt Nebula: two big pink cheeks of space gas, with stars inside.
const nebula = () => paint(110, 74, (px) => {
  const rnd = seeded(42);
  const inCheek = (x, y) => ((x - 36) / 31) ** 2 + ((y - 42) / 30) ** 2 <= 1 || ((x - 66) / 31) ** 2 + ((y - 42) / 30) ** 2 <= 1;
  for (let y = 0; y < 74; y++) for (let x = 0; x < 110; x++) {
    if (!inCheek(x, y)) continue;
    const edge = !inCheek(x - 3, y) || !inCheek(x + 3, y) || !inCheek(x, y - 3) || !inCheek(x, y + 3);
    const crack = Math.abs(x - 51) < 1 && y > 34;
    const r = rnd();
    if (crack) px(x, y, '#aa00aa');
    else if (edge) { if ((x + y) % 2) px(x, y, '#aa00aa'); } // dithered fuzzy edge
    else px(x, y, r < 0.02 ? '#ffffff' : '#ff55ff');
  }
  // shine on each cheek
  blob(px, 26, 28, 7, 4, '#ffaaaa', null); blob(px, 56, 28, 7, 4, '#ffaaaa', null);
  // a little green whiff drifting off
  for (let i = 0; i < 4; i++) blob(px, 94 + i * 4, 16 - i * 4, 4 - i * 0.6, 3 - i * 0.5, '#aaff55', '#55aa00');
});

/**
 * Build the vertical scroller scenery.
 * Returns { group, update(camY, alt, t, dt) }.
 */
export function buildRocketRetro() {
  const group = new THREE.Group();
  const rnd = seeded(2024);
  const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); group.add(mesh); return mesh; };

  // Parallax layers: far hills near the ground, and pale distant clouds.
  const farHills = add(strip(hills(), 900, 0, 0), 30, 0, -300);
  const farClouds = new THREE.Group();
  const cr = seeded(5);
  for (let i = 0; i < 26; i++) {
    const c = sprite(cloud(18 + cr() * 14, 200 + i, true));
    c.position.set(-110 + cr() * 280, 70 + cr() * 520, -290);
    farClouds.add(c);
  }
  group.add(farClouds);
  const layers = [{ obj: farHills, f: 0.35, y: -85 }, { obj: farClouds, f: 0.5, y: 0 }];

  // Ground, launch pad and trees.
  const g = strip(ground(), 600, -41, 12); // grass top lands at y = 0
  g.position.x = 30;
  group.add(g);
  add(sprite(launchPad()), 0, -3, 6);
  for (const [x, h, r, z] of [[-34, 40, 10, -30], [-14, 58, 12, -40], [52, 50, 11, -34], [78, 64, 13, -44], [24, 30, 8, -26], [104, 44, 10, -30], [-56, 62, 12, -42]]) {
    add(sprite(tree(h, r)), x, 0, z);
  }

  // Cloud Town and above.
  for (let i = 0; i < 30; i++) add(sprite(cloud(26 + rnd() * 26, i)), -60 + rnd() * 170, 130 + rnd() * 440, -40 - rnd() * 20);

  // Birds and airplanes fly sideways.
  const birdFrames = [texture(bird(true)), texture(bird(false))];
  const movers = [];
  for (let i = 0; i < 12; i++) {
    const m = add(sprite(bird(true)), -80 + rnd() * 220, 290 + rnd() * 200, -20);
    m.material.map = birdFrames[0];
    movers.push({ obj: m, speed: 10 + rnd() * 12, flap: rnd() * 6 });
  }
  for (let i = 0; i < 3; i++) movers.push({ obj: add(sprite(plane()), -100 + rnd() * 240, 500 + rnd() * 260, -50), speed: 25 + rnd() * 15 });

  // Stars: a tiled layer that follows the camera and scrolls slowly.
  const starTex = texture(stars());
  starTex.wrapT = THREE.RepeatWrapping;
  starTex.repeat.set(400 / 128, 300 / 128);
  const starMat = new THREE.MeshBasicMaterial({ map: starTex, transparent: true, alphaTest: 0.5, depthWrite: false });
  const starLayer = add(new THREE.Mesh(new THREE.PlaneGeometry(400, 300), starMat), 30, 0, -350);

  // Space landmarks, at their zones' heights.
  add(sprite(moon()), -6, 1215, -60);
  add(sprite(planetPickle()), -4, 1830, -60);
  const junk = [];
  for (let i = 0; i < 34; i++) {
    const j = add(sprite(JUNK[i % JUNK.length]()), -50 + rnd() * 150, 2400 + rnd() * 900, -30 - rnd() * 20);
    junk.push({ obj: j, spin: (rnd() - 0.5) * 2 });
  }
  add(sprite(nebula()), -20, 3490, -80);

  return {
    group,
    update(camY, alt, t, dt) {
      for (const l of layers) l.obj.position.y = l.y + camY * (1 - l.f);
      starLayer.position.y = camY;
      starTex.offset.y = (camY * 0.1) / 128;
      starLayer.visible = alt > 700; // the sky is dark enough for stars here
      for (const m of movers) {
        m.obj.position.x += m.speed * dt;
        if (m.obj.position.x > 160) m.obj.position.x = -100;
        if (m.flap != null) m.obj.material.map = birdFrames[Math.floor(t * 6 + m.flap) % 2];
      }
      for (const j of junk) j.obj.rotation.z += j.spin * dt;
    },
  };
}
