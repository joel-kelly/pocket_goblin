// Tiny pixel-art kit for the Classic 90s look: paint pictures pixel by pixel on
// small canvases and show them as flat pieces of scenery (1 pixel = 1 world unit).
import * as THREE from '../vendor/three.module.min.js';

export const hash = (x, y) => {
  let n = (x * 73856093) ^ (y * 19349663);
  n = Math.imul(n ^ (n >>> 13), 0x5bd1e995);
  return ((n ^ (n >>> 15)) >>> 0) % 1000 / 1000;
};

// Seeded random numbers, so the scenery is the same every flight.
export function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A canvas plus a pixel setter.
export function paint(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const px = (x, y, color) => {
    x = ((Math.round(x) % w) + w) % w; // wrap sideways so the texture tiles
    if (!color || y < 0 || y >= h) return; // no color = leave it see-through
    g.fillStyle = color; g.fillRect(x, Math.round(y), 1, 1);
  };
  fn(px, g);
  return c;
}

// Filled pixel ellipse with a black outline (outline drawn first, one pixel bigger).
export function blob(px, cx, cy, rx, ry, color, outline = '#000000') {
  for (const [r, c] of [[1, outline], [0, color]]) {
    if (!c) continue;
    const ax = rx + r, ay = ry + r;
    for (let y = -ay; y <= ay; y++) for (let x = -ax; x <= ax; x++) {
      if ((x / ax) ** 2 + (y / ay) ** 2 <= 1) px(cx + x, cy + y, c);
    }
  }
}

export function texture(canvas, repeatX = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = repeatX;
  return t;
}

// A flat painted strip, `width` units long, with its bottom edge at y.
export function strip(canvas, width, y, z) {
  const mat = new THREE.MeshBasicMaterial({ map: texture(canvas, width / canvas.width), transparent: true, alphaTest: 0.5 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, canvas.height), mat);
  m.position.set(0, y + canvas.height / 2, z);
  return m;
}

// A flat picture standing on its bottom-center point (place it with position.set).
export function sprite(canvas, opts = {}) {
  const geo = new THREE.PlaneGeometry(canvas.width, canvas.height);
  geo.translate(0, canvas.height / 2, 0);
  const mat = new THREE.MeshBasicMaterial({ map: texture(canvas), transparent: true, alphaTest: 0.5, ...opts });
  return new THREE.Mesh(geo, mat);
}

// A sign painted at the game's real pixel size, so the 8-pixel font stays crisp.
// Text is drawn, then snapped to solid pixels (no blurry edges).
const FONT = '8px "Press Start 2P"';
export function pixelSign(text, bg) {
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

