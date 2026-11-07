// The goblin's den in the Classic 90s look: a painted back wall in place of the
// 3D one. Chunky stone bricks with moss, a round window (day or night), a wall
// torch with a flickering flame, dangling roots, a "HOME SWEET SWAMP"
// sampler and a crayon drawing of the goblin taped up. The shelf, bed, trash can,
// mushrooms and all decor stay 3D (they're part of the game).
import * as THREE from '../vendor/three.module.min.js';
import { hash, paint, blob, sprite, texture, seeded } from './pixelArt.js';

// The 3D wall spans x -110..110, y 0..56, with its front face at z = -28.
const X0 = -110, W = 220, H = 56, Z = -28.4;
const WIN = { x: 26.5, y: 30.5, r: 7 }; // the round window, same spot as the 3D one
const TORCH = { x: -13, y: 22 };

// Map world (x, y) on the wall to canvas pixels.
const cx = (x) => x - X0, cy = (y) => H - 1 - y;

function wall(skin) {
  return paint(W, H, (px) => {
    // Stone bricks: 8 x 4, every other row shifted. Mostly gray stone, some purple,
    // some mossy. Light top edge, dark mortar.
    const KINDS = {
      gray: { top: '#aaaaaa', body: '#555555' },
      purple: { top: '#aaaaaa', body: '#7755aa' },
      moss: { top: '#55aa00', body: '#005500' },
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const row = Math.floor(y / 4), bx = x + (row % 2) * 4, col = Math.floor(bx / 8);
      const u = bx % 8, v = y % 4; // position inside the brick (v = 0 is the bottom)
      const r = hash(col, row);
      const k = KINDS[r < 0.08 ? 'moss' : r < 0.35 ? 'purple' : 'gray'];
      const c = u === 0 || v === 0 ? '#2a1a3a' : v === 3 ? k.top : k.body;
      px(x, H - 1 - y, c);
    }
    // moss dripping down from the top
    for (let x = 0; x < W; x++) {
      const len = Math.floor(hash(x, 99) * 4) + (hash(Math.floor(x / 7), 98) < 0.4 ? 3 : 0);
      for (let y = 0; y < len; y++) px(x, y, y === len - 1 ? '#005500' : '#00aa00');
    }
    // hanging roots
    for (const rx of [-70, -52, 4, 48, 80]) {
      const len = 6 + Math.floor(hash(rx, 5) * 8);
      for (let y = 0; y < len; y++) px(cx(rx) + Math.round(Math.sin(y / 2) * 0.6), y, y % 4 === 3 ? '#552a00' : '#885533');
    }
    // the torch's iron bracket and handle
    const tx = cx(TORCH.x);
    for (let y = cy(TORCH.y + 9); y <= cy(TORCH.y); y++) { px(tx - 1, y, '#000000'); px(tx, y, '#885533'); px(tx + 1, y, '#552a00'); px(tx + 2, y, '#000000'); }
    for (let x = tx - 3; x <= tx + 4; x++) { px(x, cy(TORCH.y + 9), '#000000'); px(x, cy(TORCH.y + 10), '#555555'); px(x, cy(TORCH.y + 11), '#000000'); }
    for (let y = cy(TORCH.y + 4); y <= cy(TORCH.y + 2); y++) for (let x = tx - 2; x <= tx + 3; x++) px(x, y, y === cy(TORCH.y + 3) ? '#555555' : '#000000');

    // "HOME SWEET SWAMP" cross-stitch sampler (tiny hand-drawn letters)
    // (left of the shelf: shows in the wider Decorate view)
    sampler(px, cx(-72), cy(48));
    // crayon drawing of the goblin, taped up next to the window
    drawing(px, cx(40), cy(46), skin);
  });
}

// 3x5 letters for the sampler.
const GLYPHS = {
  H: ['101', '101', '111', '101', '101'], O: ['111', '101', '101', '101', '111'], M: ['101', '111', '111', '101', '101'],
  E: ['111', '100', '110', '100', '111'], S: ['111', '100', '111', '001', '111'], W: ['101', '101', '111', '111', '101'],
  T: ['111', '010', '010', '010', '010'], A: ['111', '101', '111', '101', '101'], P: ['111', '101', '111', '100', '100'], ' ': ['0', '0', '0', '0', '0'],
};
function word(px, x, y, text, color) {
  for (const ch of text) {
    GLYPHS[ch].forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') px(x + i, y + j, color); }));
    x += GLYPHS[ch][0].length + 1;
  }
}
function sampler(px, x0, y0) {
  const w = 26, h = 22;
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    const frame = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
    px(x0 + x, y0 + y, frame ? (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#000000' : '#aa7744') : (x + y) % 2 ? '#ffdd99' : '#ffffff');
  }
  word(px, x0 + 6, y0 + 3, 'HOME', '#aa0000');
  word(px, x0 + 3, y0 + 9, 'SWEET', '#00aa00');
  word(px, x0 + 3, y0 + 15, 'SWAMP', '#5522aa');
  px(x0 + 3, y0 + 4, '#ff5555'); px(x0 + 22, y0 + 4, '#ff5555'); // little hearts
}
function drawing(px, x0, y0, skin) {
  const w = 20, h = 16;
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) px(x0 + x, y0 + y, x === 0 || y === h - 1 || x === w - 1 ? '#aaaaaa' : '#ffffff');
  // tape
  for (const tx of [0, w - 4]) for (let i = 0; i < 4; i++) px(x0 + tx + i, y0 - 1, '#ffdd99');
  // wobbly crayon goblin: round head, big ears, stick body, a sun
  blob(px, x0 + 9, y0 + 6, 3, 3, skin, null);
  px(x0 + 4, y0 + 4, skin); px(x0 + 5, y0 + 5, skin); px(x0 + 14, y0 + 4, skin); px(x0 + 13, y0 + 5, skin);
  px(x0 + 8, y0 + 5, '#000000'); px(x0 + 10, y0 + 5, '#000000');
  px(x0 + 8, y0 + 7, '#aa0000'); px(x0 + 9, y0 + 8, '#aa0000'); px(x0 + 10, y0 + 7, '#aa0000');
  for (let y = 10; y < 14; y++) px(x0 + 9, y0 + y, skin);
  px(x0 + 7, y0 + 11, skin); px(x0 + 11, y0 + 11, skin); px(x0 + 8, y0 + 14, skin); px(x0 + 10, y0 + 14, skin);
  blob(px, x0 + 17, y0 + 2, 1, 1, '#ffff55', null);
}

// The view through the round window. Drawn on its own so it can switch day/night.
function windowView(day) {
  const s = WIN.r * 2 + 6, c = s / 2;
  return paint(s, s, (px) => {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (d > WIN.r + 2.5) continue;
      if (d > WIN.r + 1.5) { px(x, y, '#000000'); continue; }
      if (d > WIN.r - 0.5) { px(x, y, d > WIN.r + 0.5 ? '#552a00' : '#885533'); continue; }
      const hill = y > c + 2 + Math.round(Math.sin(x / 2.5));
      px(x, y, hill ? (day ? '#00aa00' : '#005500') : day ? '#55aaff' : '#000055');
    }
    if (day) blob(px, c + 3, c - 3, 1.5, 1.5, '#ffff55', null);
    else {
      blob(px, c + 3, c - 3, 1.5, 1.5, '#ffffff', null);
      for (const [x, y] of [[c - 4, c - 4], [c - 1, c - 6], [c - 5, c], [c + 5, c + 1]]) px(x, y, '#ffff55');
    }
    // cross bars
    for (let i = -WIN.r + 1; i < WIN.r; i++) { px(c + i, c, '#885533'); px(c, c + i, '#885533'); }
  });
}

// Torch flame with a dithered glow. Three frames for the flicker.
function flame(frame) {
  const s = 32, c = 16;
  return paint(s, s, (px) => {
    const glow = 6 + frame;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d < glow && d > 3 && (x + y * 2 + frame) % 5 === 0) px(x, y, '#ffaa55');
    }
    const lean = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    blob(px, c, c + 2, 3, 4, '#ff5555', null);
    blob(px, c + lean * 0.5, c + 1, 2, 3.5, '#ff8822', null);
    blob(px, c + lean, c + 2, 1, 2, '#ffff55', null);
    px(c + lean, c - 4, '#ff8822'); px(c + lean * 2, c - 5, '#ff5555');
  });
}

/**
 * Build the painted den wall. Returns { group, setSkin(hex), update(t, day) }.
 */
export function buildDenRetro() {
  const group = new THREE.Group();
  let skin = '#6cbf3c';
  const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: texture(wall(skin)) }));
  wallMesh.position.set(X0 + W / 2, H / 2, Z);
  group.add(wallMesh);

  let isDay = null;
  const win = sprite(windowView(true));
  win.position.set(WIN.x, WIN.y - (WIN.r + 3), Z + 0.1);
  group.add(win);

  const flames = [0, 1, 2].map((f) => texture(flame(f)));
  const fire = sprite(flame(0));
  fire.position.set(TORCH.x + 0.5, TORCH.y + 10 - 16 + 3, Z + 0.2);
  fire.material.map = flames[0];
  group.add(fire);

  return {
    group,
    setSkin(hex) {
      if (hex === skin) return;
      skin = hex;
      wallMesh.material.map.dispose();
      wallMesh.material.map = texture(wall(skin));
    },
    update(t, day) {
      fire.material.map = flames[Math.floor(t * 8) % 3];
      if (day !== isDay) {
        isDay = day;
        win.material.map.dispose();
        win.material.map = texture(windowView(day));
      }
    },
  };
}
