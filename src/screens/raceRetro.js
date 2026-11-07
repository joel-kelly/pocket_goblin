// Swamp Sprint in the Classic 90s look: a flat side-scrolling level.
// Lanes are stacked grassy ledges, and painted backdrops (clouds, mountains,
// hills with lollipop trees) scroll slower the farther away they are.
// Everything is painted pixel by pixel on small canvases, 1 pixel = 1 world unit.
import * as THREE from '../../vendor/three.module.min.js';

export const LANE_STEP = 15;            // how much higher each lane further back sits
const TOP = 3 * LANE_STEP;              // the back lane's ledge
export const CAM_Y = 40;                // where the camera looks (height)
export const CAM_DIST = 280;            // sets the zoom (bigger = see more)
export const SKY = '#55aaff';

const hash = (x, y) => {
  let n = (x * 73856093) ^ (y * 19349663);
  n = Math.imul(n ^ (n >>> 13), 0x5bd1e995);
  return ((n ^ (n >>> 15)) >>> 0) % 1000 / 1000;
};

// A canvas plus a pixel setter.
function paint(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const px = (x, y, color) => {
    x = ((Math.round(x) % w) + w) % w; // wrap sideways so the texture tiles
    if (y < 0 || y >= h) return;
    g.fillStyle = color; g.fillRect(x, Math.round(y), 1, 1);
  };
  fn(px, g);
  return c;
}

// Filled pixel ellipse with a black outline (outline drawn first, one pixel bigger).
function blob(px, cx, cy, rx, ry, color, outline = '#000000') {
  for (const [r, c] of [[1, outline], [0, color]]) {
    if (!c) continue;
    const ax = rx + r, ay = ry + r;
    for (let y = -ay; y <= ay; y++) for (let x = -ax; x <= ax; x++) {
      if ((x / ax) ** 2 + (y / ay) ** 2 <= 1) px(cx + x, cy + y, c);
    }
  }
}

function texture(canvas, repeatX = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = repeatX;
  return t;
}

// A flat painted strip, `width` units long, with its bottom edge at y.
function strip(canvas, width, y, z) {
  const mat = new THREE.MeshBasicMaterial({ map: texture(canvas, width / canvas.width), transparent: true, alphaTest: 0.5 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, canvas.height), mat);
  m.position.set(0, y + canvas.height / 2, z);
  return m;
}

// ---------- the painted pieces ----------
const clouds = () => paint(400, 40, (px) => {
  for (const [x, y, s] of [[40, 18, 1], [170, 12, 0.8], [290, 22, 1.2]]) {
    blob(px, x, y + 6, 14 * s, 6 * s, '#ffffff');
    blob(px, x - 10 * s, y + 8, 9 * s, 5 * s, '#ffffff');
    blob(px, x + 12 * s, y + 8, 10 * s, 5 * s, '#ffffff');
    blob(px, x + 2, y, 9 * s, 7 * s, '#ffffff');
  }
  // erase the inner outlines where puffs overlap: repaint centers without outline
  for (const [x, y, s] of [[40, 18, 1], [170, 12, 0.8], [290, 22, 1.2]]) {
    blob(px, x, y + 6, 13 * s, 5 * s, '#ffffff', null);
    blob(px, x - 10 * s, y + 8, 8 * s, 4 * s, '#ffffff', null);
    blob(px, x + 12 * s, y + 8, 9 * s, 4 * s, '#ffffff', null);
    blob(px, x + 2, y, 8 * s, 6 * s, '#ffffff', null);
  }
});

const mountains = () => paint(360, 70, (px) => {
  for (let x = 0; x < 360; x++) {
    const h = 30 + 18 * Math.sin(x / 57) + 12 * Math.sin(x / 23 + 1) + 6 * Math.sin(x / 9);
    for (let y = 0; y < h; y++) {
      // light caps on top, a darker band at the foot
      px(x, 70 - 1 - y, h - y < 4 ? '#55ffff' : y < 8 ? '#5555ff' : '#00aaaa');
    }
  }
});

const hills = () => paint(300, 56, (px) => {
  for (let x = 0; x < 300; x++) {
    const h = 18 + 9 * Math.sin(x / 31) + 5 * Math.sin(x / 13 + 2);
    for (let y = 0; y < h; y++) px(x, 55 - y, h - y < 2 ? '#000000' : hash(x, y) < 0.12 ? '#005500' : '#00aa00');
  }
  // lollipop trees
  for (const [x, s] of [[30, 1], [95, 0.8], [150, 1.1], [215, 0.9], [262, 1]]) {
    const base = 55 - (18 + 9 * Math.sin(x / 31) + 5 * Math.sin(x / 13 + 2)) + 2;
    for (let y = base - 16 * s; y < base; y++) { px(x - 1, y, '#000000'); px(x, y, '#552a00'); px(x + 1, y, '#552a00'); px(x + 2, y, '#000000'); }
    blob(px, x + 0.5, base - 18 * s, 8 * s, 7 * s, '#55aa00');
    blob(px, x - 1.5, base - 20 * s, 3 * s, 2 * s, '#aaff55', null); // shine
  }
});

// One lane's ledge: grass on top (with tufts poking up), dirt and pebbles below.
// `depth` is how far the dirt goes down. Tiles every 64 units.
const LEDGE_UP = 3; // tufts and flowers stick up this far above the ledge
function ledge(depth, seed) {
  return paint(64, depth + LEDGE_UP, (px) => {
    const g0 = LEDGE_UP;
    for (let x = 0; x < 64; x++) {
      // tufts
      if (hash(x, seed) < 0.3) px(x, g0 - 1, '#55ff55');
      if (hash(x, seed + 1) < 0.08) { px(x, g0 - 2, '#55ff55'); px(x, g0 - 3, '#55ff55'); }
      // grass band
      for (let y = 0; y < 4; y++) px(x, g0 + y, y === 0 ? '#55ff55' : hash(x, y + seed) < 0.25 ? '#55aa00' : '#00aa00');
      // wavy grass edge over the dirt
      const lip = 4 + (hash(Math.floor(x / 3), seed + 7) < 0.5 ? 1 : 0);
      px(x, g0 + lip, '#005500');
      for (let y = lip + 1; y < depth; y++) {
        const r = hash(x, y * 3 + seed);
        px(x, g0 + y, r < 0.06 ? '#552a00' : r < 0.1 ? '#aa7744' : '#aa5500');
      }
    }
    // a few flowers
    for (const fx of [9, 41]) { px(fx + seed % 5, g0 - 2, '#ffff55'); px(fx + seed % 5, g0 - 1, '#00aa00'); }
    // pebbles: little outlined rocks
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(hash(i, seed + 3) * 60) + 2, y = g0 + 8 + Math.floor(hash(seed + 3, i) * Math.max(1, depth - 14));
      if (y > g0 + depth - 3) continue;
      blob(px, x, y, 3, 2, '#aaaaaa', '#552a00');
      px(x - 1, y - 1, '#ffffff'); // shine
    }
  });
}

// Black and white checkers, for the start and finish posts.
const checkers = (w, h) => paint(w, h, (px) => {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x, y, (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? '#000000' : '#ffffff');
});

// A sign painted at the game's real pixel size, so the 8-pixel font stays crisp.
// Text is drawn, then snapped to solid pixels (no blurry edges).
const FONT = '8px "Press Start 2P"';
function pixelSign(text, bg) {
  const w = text.length * 8 + 8, h = 14;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  const draw = () => {
    g.fillStyle = '#000000'; g.fillRect(0, 0, w, h);
    g.fillStyle = bg; g.fillRect(1, 1, w - 2, h - 2);
    g.fillStyle = '#000000';
    g.font = FONT + ', monospace';
    g.textBaseline = 'top';
    g.fillText(text, 4, 3);
    const img = g.getImageData(0, 0, w, h);
    const bgRGB = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
    const mid = (bgRGB[0] + bgRGB[1] + bgRGB[2]) / 2;
    for (let i = 0; i < img.data.length; i += 4) {
      const v = img.data[i] + img.data[i + 1] + img.data[i + 2] < mid ? [0, 0, 0] : bgRGB;
      img.data.set([...v, 255], i);
    }
    g.putImageData(img, 0, 0);
  };
  draw();
  const tex = texture(c);
  // First race before the font has loaded: repaint once it arrives.
  if (!document.fonts.check(FONT)) document.fonts.load(FONT).then(() => { draw(); tex.needsUpdate = true; });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

/**
 * Build the side-scroller scenery.
 * length: track length in world units. lanes: z of each lane (front first).
 * Returns { group, layers }: call layers' update(camX) every frame for parallax.
 */
export function buildRetroScenery(length, lanes) {
  const group = new THREE.Group();
  const W = length + 1400; // long enough for the whole race plus the view on either side
  const x0 = length / 2;

  // Painted backdrops. f = how fast it scrolls compared to the track (1 = same).
  const layers = [
    { mesh: strip(clouds(), W, 80, -420), f: 0.08 },
    { mesh: strip(mountains(), W, TOP - 10, -400), f: 0.2 },
    { mesh: strip(hills(), W, TOP - 8, -380), f: 0.45 },
  ];
  for (const l of layers) group.add(l.mesh);

  // One ledge per lane, just in front of where its racers run.
  lanes.forEach((z, i) => {
    const y = i * LANE_STEP;
    const depth = i === 0 ? 90 : LANE_STEP + 6;
    const m = strip(ledge(depth, i * 11 + 5), W, y - depth, z + 8);
    m.position.x = x0;
    group.add(m);
  });

  // Start and finish: a checkered post behind each lane, plus signs.
  const post = checkers(4, 26);
  for (const x of [-2, length + 2]) {
    lanes.forEach((z, i) => {
      const p = strip(post, 4, i * LANE_STEP, z - 4);
      p.position.x = x;
      group.add(p);
    });
  }
  const finish = pixelSign('FINISH', '#ffff55');
  finish.position.set(length + 2, TOP + 38, lanes[lanes.length - 1] - 6);
  const start = pixelSign('START', '#55ff55');
  start.position.set(10, -16, lanes[0] + 20);
  group.add(finish, start);

  // Distance signs every 100 m, up on the back ledge.
  return {
    group,
    addSign(x, text) {
      const sign = pixelSign(text, '#ffdd99');
      sign.position.set(x, TOP + 14, lanes[lanes.length - 1] - 8);
      const pole = new THREE.Mesh(new THREE.PlaneGeometry(2, 11), new THREE.MeshBasicMaterial({ color: '#552a00' }));
      pole.position.set(x, TOP + 5, lanes[lanes.length - 1] - 9);
      group.add(sign, pole);
    },
    update(camX) {
      for (const l of layers) l.mesh.position.x = x0 + camX * (1 - l.f) - x0 * (1 - l.f);
    },
  };
}
