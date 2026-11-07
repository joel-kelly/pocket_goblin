// Goblin Café in the Classic 90s look: a painted diner wall in front of the
// 3D one. Wood paneling, teal wallpaper, a flickering neon sign, a clock that
// shows the real time, a window onto the swamp (day or night, like the den),
// a chalkboard menu, an "Employee of the Month" portrait of the player's
// goblin, a shelf of gross jars, and the door the customers come in through.
import * as THREE from '../../vendor/three.module.min.js';
import { hash, paint, blob, sprite, texture, seeded } from '../pixelArt.js';

const WALL_Z = -31.6; // just in front of the 3D wall (its face is at z = -32)
const FONT = '8px "Press Start 2P"';

// Wallpaper strip: baseboard, wood paneling, trim, then teal paper with little diamonds.
const wall = () => paint(16, 130, (px) => {
  const H = 130, row = (y) => H - 1 - y; // paint by height above the floor
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 130; y++) {
      let c;
      if (y < 2) c = '#552a00';
      else if (y < 16) c = x % 8 === 0 ? '#552a00' : hash(x, y) < 0.1 ? '#885533' : '#aa5500';
      else if (y < 18) c = y === 16 ? '#000000' : '#ffaa55';
      else if (y > 124) c = '#552a00'; // ceiling trim
      else {
        const dx = (x + 4) % 8 - 4, dy = (y - 18 + 4) % 8 - 4;
        c = Math.abs(dx) + Math.abs(dy) === 1 && (Math.floor((y - 18) / 8) % 2 === 0) ? '#55ffff' : '#00aaaa';
      }
      px(x, row(y), c);
    }
  }
});

// Turn text into solid pixels in one color (no blurry edges). Returns a list of [x, y].
function textPixels(text, w, h, x0, y0) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = FONT + ', monospace';
  g.textBaseline = 'top';
  g.fillStyle = '#fff';
  g.fillText(text, x0, y0);
  const d = g.getImageData(0, 0, w, h).data, out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 128) out.push([x, y]);
  return out;
}

// The neon sign. `off` = which letters are flickered out (by index).
function neon(off = []) {
  const text = 'GOBLIN CAFE', w = text.length * 8 + 12, h = 20;
  return paint(w, h, (px) => {
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      px(x, y, edge ? '#000000' : x === 1 || y === 1 || x === w - 2 || y === h - 2 ? '#aa5500' : '#2a1a3a');
    }
    const lit = new Set(), dim = [];
    for (const [x, y] of textPixels(text, w, h, 6, 6)) {
      const letter = Math.floor((x - 6) / 8);
      if (off.includes(letter)) dim.push([x, y]); else lit.add(`${x},${y}`);
    }
    // glow around lit tubes, then the tubes
    for (const k of lit) {
      const [x, y] = k.split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!lit.has(`${x + dx},${y + dy}`)) px(x + dx, y + dy, '#aa00aa');
    }
    for (const k of lit) { const [x, y] = k.split(',').map(Number); px(x, y, '#ff55ff'); }
    for (const [x, y] of dim) px(x, y, '#555555');
  });
}

// A round clock with the real time.
function clock(date) {
  return paint(17, 17, (px) => {
    blob(px, 8, 8, 7, 7, '#ffffff');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; px(8 + Math.sin(a) * 6, 8 - Math.cos(a) * 6, i % 3 ? '#aaaaaa' : '#000000'); }
    const hand = (a, len, color) => { for (let r = 0; r <= len; r += 0.5) px(8 + Math.sin(a) * r, 8 - Math.cos(a) * r, color); };
    const m = date.getMinutes(), hr = (date.getHours() % 12) + m / 60;
    hand(m / 60 * Math.PI * 2, 5, '#000000');
    hand(hr / 12 * Math.PI * 2, 3.5, '#aa0000');
  });
}

// A window onto the swamp, by day or by night.
function windowView(day) {
  return paint(26, 20, (px) => {
    for (let x = 0; x < 26; x++) for (let y = 0; y < 20; y++) {
      const frame = x < 2 || y < 2 || x > 23 || y > 17 || x === 12 || x === 13 || y === 9;
      if (frame) { px(x, y, x === 0 || y === 0 || x === 25 || y === 19 ? '#000000' : '#885533'); continue; }
      const hill = y > 13 - Math.round(2 * Math.sin(x / 4));
      px(x, y, hill ? (day ? '#00aa00' : '#005500') : day ? '#55aaff' : '#000055');
    }
    if (day) blob(px, 19, 5, 2, 2, '#ffff55', null);
    else { blob(px, 6, 5, 2, 2, '#ffffff', null); px(18, 4, '#ffffff'); px(21, 7, '#ffff55'); px(16, 12, '#aaff55'); } // moon, stars, a firefly
  });
}

const chalkboard = () => paint(40, 30, (px, g) => {
  for (let x = 0; x < 40; x++) for (let y = 0; y < 30; y++) {
    const edge = x < 2 || y < 2 || x > 37 || y > 27;
    px(x, y, edge ? (x === 0 || y === 0 || x === 39 || y === 29 ? '#000000' : '#885533') : hash(x, y) < 0.04 ? '#555555' : '#333333');
  }
  for (const [x, y] of textPixels('MENU', 40, 30, 4, 4)) px(x, y, '#ffffff');
  // scribbly "items" with prices
  const rnd = seeded(9);
  for (let r = 0; r < 3; r++) {
    const y = 15 + r * 4;
    for (let x = 4; x < 4 + 14 + rnd() * 8; x++) if (rnd() < 0.8) px(x, y, '#aaaaaa');
    px(31, y, '#ffff55'); px(32, y, '#ffff55'); px(34, y, '#ffff55');
  }
});

// "Employee of the Month": the player's goblin in its own skin color.
function portrait(skin) {
  return paint(24, 30, (px) => {
    for (let x = 0; x < 24; x++) for (let y = 0; y < 30; y++) {
      const edge = x < 2 || y < 2 || x > 21 || y > 21;
      px(x, y, edge ? (x === 0 || y === 0 || x === 23 || y === 22 ? '#000000' : '#ffff55') : y > 22 ? null : '#ffdd99');
    }
    // goblin head with ears
    blob(px, 12, 13, 5, 5, skin);
    for (const s of [-1, 1]) { px(12 + s * 6, 11, skin); px(12 + s * 7, 10, skin); px(12 + s * 8, 9, '#000000'); }
    px(10, 12, '#ffff55'); px(14, 12, '#ffff55'); px(10, 13, '#000000'); px(14, 13, '#000000');
    for (let x = 10; x < 15; x++) px(x, 16, '#000000');
    // gold plaque
    for (let x = 4; x < 20; x++) for (let y = 24; y < 29; y++) px(x, y, y === 24 || y === 28 || x === 4 || x === 19 ? '#000000' : '#ffaa55');
    for (let x = 6; x < 18; x += 2) px(x, 26, '#552a00');
  });
}

const jarShelf = () => paint(36, 20, (px) => {
  // shelf plank and brackets
  for (let x = 0; x < 36; x++) { px(x, 16, '#000000'); px(x, 17, '#aa7744'); px(x, 18, '#885533'); px(x, 19, '#000000'); }
  // jars: eyeballs, worms, slime
  const jar = (x0, fill, bits) => {
    for (let y = 3; y < 16; y++) for (let x = x0; x < x0 + 9; x++) {
      const edge = x === x0 || x === x0 + 8 || y === 15;
      px(x, y, edge ? '#000000' : y < 5 ? '#aa5500' : y === 5 ? '#000000' : fill);
    }
    for (const [x, y, c] of bits) px(x0 + x, y, c);
  };
  jar(1, '#55ffff', [[3, 8, '#ffffff'], [4, 8, '#000000'], [5, 11, '#ffffff'], [6, 11, '#000000'], [2, 12, '#ffffff'], [3, 12, '#000000']]);
  jar(13, '#ffdd99', [[2, 8, '#ff55ff'], [3, 9, '#ff55ff'], [4, 9, '#ff55ff'], [5, 10, '#ff55ff'], [3, 12, '#ff55ff'], [4, 12, '#ff55ff'], [6, 11, '#ff55ff']]);
  jar(25, '#55ff55', [[3, 9, '#aaff55'], [5, 12, '#00aa00'], [2, 13, '#00aa00']]);
});

const door = () => paint(30, 50, (px) => {
  for (let x = 0; x < 30; x++) for (let y = 0; y < 50; y++) {
    const frame = x < 2 || x > 27 || y < 2;
    const outline = x === 0 || x === 29 || y === 0;
    px(x, y, outline ? '#000000' : frame ? '#552a00' : y > 8 && y < 22 && x > 7 && x < 22 ? '#55aaff' : (x - 2) % 6 === 0 ? '#885533' : '#aa5500');
  }
  blob(px, 23, 30, 1.5, 1.5, '#ffff55'); // knob
  // OPEN sign hanging in the glass
  for (let x = 6; x < 24; x++) for (let y = 11; y < 20; y++) px(x, y, x === 6 || x === 23 || y === 11 || y === 19 ? '#000000' : '#ff5555');
  // "OPEN" in a tiny hand-drawn font (too small for the 8-pixel one)
  const GLYPHS = { O: ['111', '101', '101', '101', '111'], P: ['111', '101', '111', '100', '100'], E: ['111', '100', '110', '100', '111'], N: ['1001', '1101', '1011', '1001', '1001'] };
  let gx = 7;
  for (const ch of 'OPEN') {
    GLYPHS[ch].forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') px(gx + x, 13 + y, '#ffffff'); }));
    gx += GLYPHS[ch][0].length + 1;
  }
});

/**
 * Build the painted café wall. Returns { group, setSkin(hex), update(t) }.
 */
export function buildCafeRetro(signPos, doorX) {
  const group = new THREE.Group();
  const add = (m, x, y, z = WALL_Z + 0.2) => { m.position.set(x, y, z); group.add(m); return m; };

  // The wallpaper covers the whole wall (and well past it, for phones that zoom out).
  const W = 1600, wc = wall();
  const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, wc.height), new THREE.MeshBasicMaterial({ map: texture(wc, W / wc.width) }));
  add(wallMesh, 10, wc.height / 2, WALL_Z);

  // Neon sign, with a few flicker frames.
  const neonFrames = [[], [10], [], [3, 4], [], [10]].map((off) => texture(neon(off)));
  const sign = add(sprite(neon()), signPos.x - 6, signPos.y + 26);
  sign.material.map = neonFrames[0];

  let clockMin = -1;
  const clockSprite = add(sprite(clock(new Date())), -2, 52);
  const day = () => { const hr = new Date().getHours(); return hr >= 7 && hr < 19; };
  let isDay = day();
  // Left to right: window with the jar shelf above, the portrait over the cook's
  // head, the clock over the customer's, then the chalkboard (the question card
  // covers the right side on wide screens). The neon sign runs across the top.
  const win = add(sprite(windowView(isDay)), -70, 20);
  add(sprite(jarShelf()), -70, 42);
  const port = add(sprite(portrait('#6cbf3c')), -38, 42);
  add(sprite(chalkboard()), 34, 22);
  add(sprite(door()), doorX, 0);

  return {
    group,
    setSkin(hex) {
      port.material.map.dispose();
      port.material.map = texture(portrait(hex));
    },
    update(t) {
      // neon: mostly on, with a quick flicker now and then
      const k = Math.floor(t * 4) % 23;
      sign.material.map = neonFrames[k < 18 ? 0 : k - 17];
      // repaint the clock each minute, and the window when day turns to night
      const now = new Date();
      if (now.getMinutes() !== clockMin) {
        clockMin = now.getMinutes();
        clockSprite.material.map.dispose();
        clockSprite.material.map = texture(clock(now));
        if (day() !== isDay) { isDay = day(); win.material.map.dispose(); win.material.map = texture(windowView(isDay)); }
      }
    },
  };
}
