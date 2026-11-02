// Built-in items. Every item is a little voxel model drawn in its slot's grid.
// (Custom items made in the Workshop are added to the same registry.)
import { VoxelModel, cellKey } from './voxel.js';
import { SLOTS, fitToSlot, partCells } from './goblinModel.js';

const C = {
  purple: '#6a3fb5', purpleD: '#4b2a86', gold: '#f2c230', goldD: '#c8941c', yellow: '#ffe14d',
  red: '#e2353f', redD: '#a3212a', blue: '#3b6fe0', blueD: '#24479c', green: '#47b04b', greenD: '#2e7a32',
  orange: '#ff8a1f', orangeD: '#c9620d', white: '#f4f1e6', black: '#22202a', gray: '#8e8e9a', grayD: '#5c5c68',
  brown: '#7a4a24', brownL: '#a8703c', brownD: '#4f2e14', pink: '#ff86b8', pinkL: '#ffc2dc', tan: '#d9a35a',
  slime: '#8fdc3a', booger: '#9bc33c', cyan: '#5fd6e8', silver: '#c9ced8',
};
const h = (x, y, z) => {
  let n = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  n = Math.imul(n ^ (n >>> 13), 0x5bd1e995);
  return ((n ^ (n >>> 15)) >>> 0) % 1000 / 1000;
};

function grid(slot) { return new VoxelModel([...SLOTS[slot].size]); }

// Cells that hug a body part (6-neighbors of the part's cells), within a world y range.
function shell(m, slot, part, yLo, yHi, color) {
  const o = SLOTS[slot].origin;
  const cells = partCells(part);
  const [sx, sy, sz] = m.size;
  for (let x = 0; x < sx; x++) for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) {
    const wx = x + o[0], wy = y + o[1], wz = z + o[2];
    if (wy < yLo || wy > yHi) continue;
    if (cells.has(cellKey(wx, wy, wz))) continue;
    const near = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
      .some(([dx, dy, dz]) => cells.has(cellKey(wx + dx, wy + dy, wz + dz)) && wy + dy >= yLo && wy + dy <= yHi);
    if (near) m.set(x, y, z, color(wx, wy, wz));
  }
  return m;
}

// ---------------- HATS ----------------
function wizardHat() {
  const m = grid('head');
  m.cyl(10, 8, 9.3, 2, 3, C.purpleD);
  m.cone(10, 8, 6.2, 0.7, 3, 14, (x, y, z) => (h(x, y, z) < 0.12 ? C.yellow : C.purple));
  m.cyl(10, 8, 6.3, 3, 4, C.gold);
  m.set(10, 14, 8, C.purple); m.set(11, 15, 8, C.purple); m.set(12, 15, 8, C.yellow);
  return m;
}
function crown() {
  const m = grid('head');
  m.ring(10, 8, 4.4, 6.4, 3, 6, C.gold);
  m.ring(10, 8, 4.4, 6.4, 6, 8, (x, y, z) => {
    const a = Math.atan2(z + 0.5 - 8, x + 0.5 - 10);
    return Math.round((a / Math.PI) * 6) % 2 === 0 ? C.gold : null;
  });
  for (const [x, y, z, c] of [...m.each()]) if (c === null) m.delete(x, y, z);
  m.paint((x, y, z) => (y === 4 && h(x, y, z) < 0.35 ? (h(z, x, y) < 0.5 ? C.red : C.blue) : null));
  m.paint((x, y, z) => (y === 3 ? C.goldD : null));
  return m;
}
function trafficCone() {
  const m = grid('head');
  m.box(3, 3, 1, 17, 4, 15, C.orangeD);
  m.cone(10, 8, 5.2, 0.8, 4, 15, (x, y) => (y === 7 || y === 8 || y === 11 ? C.white : C.orange));
  return m;
}
function swirlHat() {
  const m = grid('head');
  const br = (x, y, z) => (h(x, y, z) < 0.25 ? '#6b3d1c' : '#87522a');
  m.cyl(10, 8, 7.2, 3, 5, br);
  m.cyl(10, 8, 5.8, 5, 7, br);
  m.cyl(10, 8, 4.3, 7, 9, br);
  m.cyl(10, 8, 2.8, 9, 10, br);
  m.set(10, 10, 8, '#87522a'); m.set(10, 11, 9, '#87522a');
  m.set(8, 6, 13, C.white); m.set(11, 6, 13, C.white); // googly eyes
  m.set(8, 5, 13, C.black); m.set(11, 5, 13, C.black);
  return m;
}
function propellerBeanie() {
  const m = grid('head');
  m.sphere(10, 2, 8, 7.6, (x, y, z) => {
    const q = (x < 10 ? 0 : 1) + (z < 8 ? 0 : 2);
    return [C.red, C.yellow, C.blue, C.green][q];
  }, 6.5);
  for (const [x, y, z] of [...m.each()]) if (y < 2) m.delete(x, y, z);
  m.box(9, 9, 7, 11, 11, 9, C.grayD);
  m.box(2, 11, 7, 18, 12, 9, C.red);
  m.box(9, 11, 1, 11, 12, 15, C.red);
  m.box(9, 11, 7, 11, 12, 9, C.yellow);
  return m;
}

// ---------------- FACE ----------------
function shades() {
  const m = grid('face');
  m.box(2, 7, 0, 8, 10, 1, C.black);
  m.box(10, 7, 0, 16, 10, 1, C.black);
  m.box(1, 10, 0, 17, 11, 1, C.pink);
  m.box(1, 8, 0, 2, 10, 1, C.pink); m.box(16, 8, 0, 17, 10, 1, C.pink);
  m.box(8, 9, 0, 10, 10, 1, C.pink);
  m.set(3, 9, 0, '#8a86b0'); m.set(11, 9, 0, '#8a86b0');
  return m;
}
function monocle() {
  const m = grid('face');
  m.box(10, 6, 0, 16, 11, 1, C.gold);
  m.box(11, 7, 0, 15, 10, 1, '#000'); // marker for hollow
  for (const [x, y, z, c] of [...m.each()]) if (c === '#000') m.delete(x, y, z);
  [[15, 5], [16, 4], [16, 3], [15, 2], [15, 1], [16, 0]].forEach(([x, y]) => m.set(x, y, 0, C.goldD));
  return m;
}
function mustache() {
  const m = grid('face');
  const c = '#4a2a12';
  m.box(4, 2, 1, 14, 3, 2, c);
  m.box(5, 3, 1, 8, 4, 2, c); m.box(10, 3, 1, 13, 4, 2, c);
  m.set(3, 3, 1, c); m.set(14, 3, 1, c); m.set(2, 4, 1, c); m.set(15, 4, 1, c); m.set(2, 5, 1, c); m.set(15, 5, 1, c);
  return m;
}
function clownNose() {
  const m = grid('face');
  m.sphere(9, 3.6, 2.4, 2.4, C.red);
  m.set(8, 5, 3, '#ff9a9a');
  return m;
}

// ---------------- BLING ----------------
function blingChain() {
  const m = grid('neck');
  const o = SLOTS.neck.origin;
  shell(m, 'neck', 'torso', 13, 13, (x, y, z) => ((x + z) % 2 ? C.gold : C.goldD));
  for (let wx = -5; wx < 5; wx++) {
    const wy = 9 + Math.round(Math.pow((wx + 0.5) / 4.5, 2) * 4);
    const wz = wx >= -3 && wx < 3 && wy <= 11 ? 4 : 3;
    m.set(wx - o[0], wy - o[1], wz - o[2], wx % 2 ? C.gold : C.goldD);
  }
  m.box(4, 0, 8, 8, 3, 9, C.gold);
  m.set(5, 1, 8, C.red); m.set(6, 1, 8, C.red);
  return m;
}
function bowTie() {
  const m = grid('neck');
  const o = SLOTS.neck.origin;
  const set = (wx, wy) => m.set(wx - o[0], wy - o[1], 3 - o[2], C.red);
  for (let wy = 10; wy <= 13; wy++) { set(-4, wy); set(-3, wy); set(2, wy); set(3, wy); }
  set(-2, 11); set(-2, 12); set(1, 11); set(1, 12);
  m.set(-1 - o[0], 11 - o[1], 3 - o[2], C.redD); m.set(0 - o[0], 11 - o[1], 3 - o[2], C.redD);
  m.set(-1 - o[0], 12 - o[1], 3 - o[2], C.redD); m.set(0 - o[0], 12 - o[1], 3 - o[2], C.redD);
  return m;
}
function boneNecklace() {
  const m = grid('neck');
  const o = SLOTS.neck.origin;
  shell(m, 'neck', 'torso', 13, 13, () => C.brownD);
  for (const wx of [-4, -2, 1, 3]) {
    m.set(wx - o[0], 12 - o[1], 3 - o[2], C.white);
    m.set(wx - o[0], 11 - o[1], 3 - o[2], C.white);
  }
  // tiny skull
  m.box(-1 - o[0], 10 - o[1], 3 - o[2], 1 - o[0], 13 - o[1], 4 - o[2], C.white);
  m.set(-1 - o[0], 12 - o[1], 4 - o[2], C.black);
  m.set(0 - o[0], 12 - o[1], 4 - o[2], C.black);
  return m;
}

// ---------------- SHIRTS ----------------
function uglySweater() {
  const m = grid('body');
  return shell(m, 'body', 'torso', 8, 13, (x, y, z) => {
    if (y === 10) return (x + z) % 2 ? C.green : C.white;
    if (y === 9 || y === 11) return C.greenD;
    return h(x, y, z) < 0.12 ? C.white : C.red;
  });
}
function tuxedo() {
  const m = grid('body');
  return shell(m, 'body', 'torso', 8, 13, (x, y, z) => {
    if (z >= 3) {
      const d = Math.abs(x + 0.5);
      if (d < 1.5) return (y === 9 || y === 11) && x === -1 ? C.black : C.white;
      if (d < 2.6) return '#3b3b48';
    }
    if (z >= 3 && y === 13 && (x === -1 || x === 0)) return C.red;
    return '#1d1c26';
  });
}
function superShirt() {
  const m = grid('body');
  return shell(m, 'body', 'torso', 8, 13, (x, y, z) => {
    if (y === 8) return C.yellow;
    if (z >= 3 && Math.abs(x + 0.5) + Math.abs(y - 11) <= 2.5) return Math.abs(x + 0.5) < 1 && y === 11 ? C.red : C.yellow;
    return C.blue;
  });
}
function tutu() {
  const m = grid('body');
  m.cyl(8, 5, 7.6, 2, 3, (x, y, z) => ((x + z) % 2 ? C.pink : C.pinkL));
  m.cyl(8, 5, 6.6, 3, 4, (x, y, z) => ((x + z) % 2 ? C.pinkL : C.pink));
  shell(m, 'body', 'torso', 8, 12, () => C.pink);
  return fitToSlot(m, 'body');
}

// ---------------- BACK ----------------
function cape() {
  const m = grid('back');
  const o = SLOTS.back.origin;
  for (let wy = 3; wy <= 13; wy++) {
    const hw = 4.5 + (13 - wy) * 0.3;
    const wz = wy > 8 ? -4 : -5;
    for (let wx = -Math.ceil(hw); wx < Math.ceil(hw); wx++) {
      if (wy === 3 && (wx + 20) % 2) continue;
      m.set(wx - o[0], wy - o[1], wz - o[2], wy === 13 ? C.gold : C.red);
    }
  }
  return m;
}
function butterflyWings() {
  const m = grid('back');
  const o = SLOTS.back.origin;
  const wz = -7 - o[2];
  for (const side of [-1, 1]) {
    for (let wx = -10; wx < 10; wx++) for (let wy = 3; wy < 22; wy++) {
      const cx = wx + 0.5, cy = wy + 0.5;
      const up = ((cx - side * 5.5) / 4.8) ** 2 + ((cy - 15.5) / 5) ** 2;
      const lo = ((cx - side * 4.5) / 3.6) ** 2 + ((cy - 8) / 3.5) ** 2;
      if (Math.sign(cx) !== side) continue;
      if (up <= 1 || lo <= 1) {
        const edge = (up <= 1 ? up : lo) > 0.65;
        const spot = (up <= 1 && up < 0.18) || (lo <= 1 && lo < 0.25);
        m.set(wx - o[0], wy - o[1], wz, edge ? C.purpleD : spot ? C.yellow : C.pink);
      }
    }
  }
  m.box(-1 - o[0], 9 - o[1], -6 - o[2], 1 - o[0], 13 - o[1], -3 - o[2], C.purpleD);
  return m;
}
function jetpack() {
  const m = grid('back');
  const o = SLOTS.back.origin;
  m.box(-4 - o[0], 7 - o[1], -4 - o[2], 4 - o[0], 13 - o[1], -3 - o[2], C.grayD);
  for (const cx of [-2.5, 2.5]) {
    m.cyl(cx - o[0], -6.5 - o[2], 1.9, 6 - o[1], 14 - o[1], C.silver);
    m.cone(cx - o[0], -6.5 - o[2], 1.9, 0.6, 14 - o[1], 17 - o[1], C.red);
    m.cyl(cx - o[0], -6.5 - o[2], 1.2, 5 - o[1], 6 - o[1], C.grayD);
    m.cyl(cx - o[0], -6.5 - o[2], 1.1, 3 - o[1], 5 - o[1], (x, y) => (y === 2 ? C.orange : C.yellow));
  }
  return m;
}

// ---------------- HAND ----------------
function wand() {
  const m = grid('hand');
  m.box(2, 3, 5, 3, 14, 6, C.black);
  m.set(2, 14, 5, C.white);
  [[2, 17], [0, 16], [1, 16], [2, 16], [3, 16], [4, 16], [1, 15], [2, 15], [3, 15], [1, 14], [3, 14]].forEach(([x, y]) => m.set(x, y, 5, C.yellow));
  return m;
}
function baguette() {
  const m = grid('hand');
  m.box(2, 3, 5, 4, 7, 7, C.brownD);
  m.box(0, 7, 5, 6, 8, 7, C.gold);
  m.box(2, 8, 5, 4, 18, 7, (x, y, z) => ((y === 10 || y === 13 || y === 16) && z === 6 ? '#b07a34' : C.tan));
  return m;
}
function fish() {
  const m = grid('hand');
  m.box(1, 3, 4, 5, 4, 7, '#6e8fa6'); // tail fin
  m.box(2, 4, 5, 4, 6, 6, '#6e8fa6');
  for (let y = 6; y < 16; y++) {
    const w = y < 8 || y > 13 ? 1 : 2;
    m.box(3 - w, y, 6 - w, 3 + w, y + 1, 6 + w, (x, yy, z) => (z >= 6 ? '#b8d4e4' : '#7fa3bd'));
  }
  m.set(1, 13, 6, C.black); m.set(4, 13, 6, C.black);
  m.set(2, 16, 5, '#e88a9e'); m.set(3, 16, 5, '#e88a9e');
  return fitToSlot(m, 'hand');
}
function plunger() {
  const m = grid('hand');
  m.box(2, 3, 5, 3, 13, 6, C.brownL);
  m.cyl(2.5, 5.5, 2.5, 13, 15, C.red);
  m.cyl(2.5, 5.5, 1.6, 15, 16, C.redD);
  return m;
}

// ---------------- SHOES ----------------
function sneakers() {
  const m = grid('feet');
  return shell(m, 'feet', 'root', 0, 2, (x, y, z) => (y === 1 && (x === -5 || x === -1 || x === 0 || x === 4) ? C.red : y === 0 ? C.grayD : C.white));
}
function bunnySlippers() {
  const m = grid('feet');
  shell(m, 'feet', 'root', 0, 2, (x, y, z) => (z >= 3 && y === 1 && (x === -3 || x === 2) ? C.black : C.pinkL));
  for (const fx of [-4, -2, 1, 3]) {
    m.set(fx + 6, 3, 5, C.pinkL); m.set(fx + 6, 4, 5, C.pink);
  }
  return m;
}
function clownShoes() {
  const m = grid('feet');
  shell(m, 'feet', 'root', 0, 2, () => C.red);
  m.box(1, 0, 6, 5, 2, 8, C.red);
  m.box(7, 0, 6, 11, 2, 8, C.red);
  return fitToSlot(m, 'feet');
}

// ---------------- SNACKS ----------------
function moldyCheese() {
  const m = grid('snack');
  m.box(1, 0, 2, 9, 5, 8, (x, y, z) => (y === 4 && h(x, y, z) < 0.3 ? C.green : '#f7d046'));
  for (const [x, y, z] of [...m.each()]) if (z > 2 + (9 - x) * 0.75) m.delete(x, y, z);
  m.delete(3, 4, 3); m.delete(2, 2, 2); m.delete(6, 3, 2); m.delete(4, 1, 2);
  return m;
}
function slugSpaghetti() {
  const m = grid('snack');
  m.cyl(5, 5, 3.5, 0, 1, C.white);
  m.ring(5, 5, 3.2, 4.6, 1, 3, C.white);
  m.sphere(5, 3, 5, 3.4, (x, y, z) => (h(x, y, z) < 0.2 ? '#e94e3a' : '#e9d36a'), 2.2);
  m.box(4, 5, 4, 7, 6, 6, '#a07a3a');
  m.set(6, 6, 4, '#a07a3a'); m.set(6, 7, 4, C.black); m.set(6, 6, 5, '#a07a3a'); m.set(6, 7, 5, C.black);
  return m;
}
function boogerBurger() {
  const m = grid('snack');
  m.cyl(5, 5, 4.2, 0, 2, '#d99a4e');
  m.cyl(5, 5, 4.6, 2, 3, C.booger);
  m.cyl(5, 5, 4.4, 3, 4, '#f5c518');
  m.sphere(5, 4, 5, 4.2, (x, y, z) => (h(x, y, z) < 0.12 ? C.white : '#e0a352'), 3.2);
  for (const [x, y, z] of [...m.each()]) if (y < 4 && m.get(x, y, z) === C.white) m.set(x, y, z, '#e0a352');
  m.set(1, 2, 5, C.booger); m.set(1, 1, 5, C.booger); m.set(8, 2, 3, C.booger);
  return m;
}
function ratOnAStick() {
  const m = grid('snack');
  m.box(5, 0, 5, 6, 9, 6, C.tan);
  for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) for (let z = 0; z < 10; z++) {
    const dx = (x + 0.5 - 5) / 3.3, dy = (y + 0.5 - 6.5) / 1.8, dz = (z + 0.5 - 5.5) / 1.8;
    if (dx * dx + dy * dy + dz * dz <= 1) m.set(x, y, z, '#8a8a96');
  }
  m.set(8, 8, 5, '#e88a9e'); m.set(8, 8, 6, '#e88a9e');
  m.set(9, 7, 5, C.red); m.set(9, 7, 6, C.red);
  [[1, 6], [0, 5], [0, 4], [1, 3]].forEach(([x, y]) => m.set(x, y, 5, '#e88a9e'));
  return m;
}
function friedSock() {
  const m = grid('snack');
  const col = (x, y, z) => (h(x, y, z) < 0.25 ? '#e9e2d0' : y % 2 ? '#c98a2e' : '#e0a440');
  m.box(3, 2, 4, 6, 9, 7, col);
  m.box(3, 0, 4, 9, 3, 7, col);
  m.box(3, 9, 4, 6, 10, 7, '#e9e2d0');
  return m;
}
function wormPizza() {
  const m = grid('snack');
  for (let z = 1; z < 10; z++) {
    const hw = (z - 1) * 0.5 + 0.5;
    for (let x = Math.floor(5 - hw); x < Math.ceil(5 + hw); x++) {
      m.set(x, 0, 9 - z + 0, '#e3b25a');
      m.set(x, 1, 9 - z, z === 9 ? '#c88a3a' : h(x, 1, z) < 0.22 ? '#ff8fae' : '#d93a2a');
    }
  }
  return m;
}
function rottenEgg() {
  const m = grid('snack');
  m.sphere(5, 4.2, 5, 3, (x, y, z) => (h(x, y, z) < 0.18 ? '#8db33a' : '#e8e6c8'), 4);
  return m;
}
function swampWater() {
  const m = grid('snack');
  m.cyl(5, 5, 3.2, 0, 1, '#bfe0e0');
  m.ring(5, 5, 2.3, 3.2, 1, 7, '#bfe0e0');
  m.cyl(5, 5, 2.3, 1, 6, '#5e7d2a');
  m.set(4, 6, 5, C.white); m.set(4, 6, 6, C.black);
  return m;
}
function snotSmoothie() {
  const m = grid('snack');
  m.cone(5, 5, 2.4, 3.2, 0, 7, (x, y) => (y > 5 ? '#b6f04a' : C.slime));
  m.box(6, 7, 5, 7, 10, 6, C.pink);
  m.set(5, 9, 5, C.pink);
  return m;
}
function pickleJuice() {
  const m = grid('snack');
  m.cyl(5, 5, 3.4, 0, 7, (x, y, z) => (h(x, y, z) < 0.3 ? '#3f7d2a' : '#a9cf5a'));
  m.cyl(5, 5, 3.0, 7, 8, '#b4442e');
  return m;
}
function slimeSoda() {
  const m = grid('snack');
  m.cyl(5, 5, 2.8, 0, 8, (x, y) => (y === 3 || y === 4 ? C.slime : '#8b3fd6'));
  m.cyl(5, 5, 2.2, 8, 9, C.silver);
  m.set(5, 9, 5, C.grayD);
  return m;
}

const W = (id, name, slot, price, desc, build) => ({ id, name, slot, price, desc, build, kind: 'wear' });
const F = (id, name, price, desc, build, fx) => ({ id, name, slot: 'snack', price, desc, build, kind: fx.thirst > fx.hunger ? 'drink' : 'food', ...fx });

export const BUILTIN = [
  W('wizard', 'Wizard Hat', 'head', 60, 'Grants +3 wisdom. Wisdom not included.', wizardHat),
  W('crown', 'Royal Crown', 'head', 150, 'Stolen from a very sleepy king.', crown),
  W('cone', 'Traffic Cone', 'head', 25, 'Found in a ditch. Smells like road.', trafficCone),
  W('swirl', 'The Royal Swirl', 'head', 99, "It's chocolate. Probably. Don't check.", swirlHat),
  W('propeller', 'Propeller Beanie', 'head', 45, 'Does not fly. Has been tested. Many times.', propellerBeanie),
  W('shades', 'Cool Shades', 'face', 40, 'Too cool to look at the sun. Or math.', shades),
  W('monocle', 'Fancy Monocle', 'face', 70, 'Indeed. Quite. Rather. *burp*', monocle),
  W('mustache', 'Fake Mustache', 'face', 30, 'Made of 100% real eyebrow.', mustache),
  W('clownnose', 'Clown Nose', 'face', 20, 'Honk honk. HONK.', clownNose),
  W('bling', 'Big Bling Chain', 'neck', 120, 'Gold-ish. Mostly painted rock.', blingChain),
  W('bowtie', 'Snazzy Bow Tie', 'neck', 35, 'For fancy dinners like Rat Night.', bowTie),
  W('bones', 'Bone Necklace', 'neck', 50, 'Chicken bones. From a chicken. Who is fine.', boneNecklace),
  W('sweater', 'Ugly Sweater', 'body', 55, 'Knitted by Grandma Goblin with her toes.', uglySweater),
  W('tux', 'Tuxedo', 'body', 110, 'For weddings, funerals, and burping contests.', tuxedo),
  W('super', 'Super Goblin Suit', 'body', 90, 'Superpower: extremely loud chewing.', superShirt),
  W('tutu', 'Ballerina Tutu', 'body', 65, 'Twirl like nobody is sniffing.', tutu),
  W('cape', 'Hero Cape', 'back', 80, 'Swoosh! (You have to say swoosh.)', cape),
  W('wings', 'Butterfly Wings', 'back', 130, 'Flaps beautifully. Flies terribly.', butterflyWings),
  W('jetpack', 'Rocket Jetpack', 'back', 160, 'Powered by beans. Do not ask how.', jetpack),
  W('wand', 'Magic Wand', 'hand', 75, 'Casts one spell: "Oops".', wand),
  W('baguette', 'Baguette of Destiny', 'hand', 55, 'A sword AND a snack.', baguette),
  W('fish', 'Stinky Fish', 'hand', 15, 'Friend? Weapon? Lunch? Yes.', fish),
  W('plunger', 'Toilet Plunger', 'hand', 30, 'Mostly clean. MOSTLY.', plunger),
  W('sneakers', 'Speedy Sneakers', 'feet', 45, '+10 speed when running from baths.', sneakers),
  W('bunnies', 'Bunny Slippers', 'feet', 60, 'The bunnies are judging you.', bunnySlippers),
  W('clownshoes', 'Clown Clompers', 'feet', 40, 'CLOMP. CLOMP. CLOMP.', clownShoes),

  F('cheese', 'Moldy Cheese', 6, 'The green bits are the best bits.', moldyCheese, { hunger: 25, thirst: 0, gas: 0.45, burp: 0.2 }),
  F('slugspag', 'Slug Spaghetti', 9, 'One of the noodles is looking at you.', slugSpaghetti, { hunger: 35, thirst: 5, gas: 0.5, burp: 0.3 }),
  F('burger', 'Booger Burger', 12, 'Fresh-picked daily.', boogerBurger, { hunger: 45, thirst: 0, gas: 0.6, burp: 0.4 }),
  F('rat', 'Rat on a Stick', 8, 'Crunchy outside, squeaky inside.', ratOnAStick, { hunger: 30, thirst: 0, gas: 0.35, burp: 0.3 }),
  F('sock', 'Deep-Fried Sock', 4, 'Sweaty AND crispy.', friedSock, { hunger: 20, thirst: 0, gas: 0.7, burp: 0.2 }),
  F('pizza', 'Worm Pizza', 10, 'Extra wiggly. Hold it still.', wormPizza, { hunger: 35, thirst: 0, gas: 0.5, burp: 0.3 }),
  F('egg', 'Rotten Egg', 3, 'Warning: 100% fart fuel.', rottenEgg, { hunger: 15, thirst: 0, gas: 1.0, burp: 0.1 }),
  F('swamp', 'Swamp Water', 3, 'There is an eyeball in it. It is free.', swampWater, { hunger: 0, thirst: 30, gas: 0.15, burp: 0.5 }),
  F('smoothie', 'Snot Smoothie', 6, 'Thick. Chunky. Nutritious-ish.', snotSmoothie, { hunger: 8, thirst: 40, gas: 0.25, burp: 0.6 }),
  F('pickle', 'Pickle Juice', 5, 'Sour enough to curl your toes.', pickleJuice, { hunger: 0, thirst: 35, gas: 0.2, burp: 0.5 }),
  F('soda', 'Slime Soda', 7, 'Guaranteed mega-burp.', slimeSoda, { hunger: 0, thirst: 45, gas: 0.2, burp: 1.0 }),
];

// ---------------- registry ----------------
const registry = new Map();
const modelCache = new Map();
BUILTIN.forEach((it) => registry.set(it.id, it));

export function allItems() { return [...registry.values()]; }
export function getItem(id) { return registry.get(id); }

export function getModel(id) {
  const it = registry.get(id);
  if (!it) return null;
  if (!modelCache.has(id)) {
    const m = it.custom ? VoxelModel.fromJSON(it.model) : it.build();
    modelCache.set(id, it.slot === 'snack' ? m : fitToSlot(m, it.slot));
  }
  return modelCache.get(id);
}

// Items shipped in the repo's items/ folder (exported from the Workshop).
// They show up in the Shop like any built-in item.
export function addShippedItems(list) {
  for (const c of list) {
    const isFood = c.slot === 'snack';
    registry.set(c.id, {
      id: c.id, name: c.name, slot: c.slot, custom: false, shipped: true,
      model: c.model, build: () => VoxelModel.fromJSON(c.model),
      kind: isFood ? (c.drink ? 'drink' : 'food') : 'wear',
      price: c.price ?? (isFood ? 6 : 50),
      desc: c.desc || (c.by ? `Designed by ${c.by}!` : 'A goblin original.'),
      hunger: c.hunger ?? (isFood ? (c.drink ? 5 : 30) : 0),
      thirst: c.thirst ?? (isFood ? (c.drink ? 35 : 5) : 0),
      gas: c.gas ?? 0.5, burp: c.burp ?? 0.4,
    });
    modelCache.delete(c.id);
  }
}

// Custom items from the Workshop: { id, name, slot, model: json, price? }
export function setCustomItems(list) {
  for (const [id, it] of [...registry]) if (it.custom) { registry.delete(id); modelCache.delete(id); }
  for (const c of list) {
    const isFood = c.slot === 'snack';
    registry.set(c.id, {
      ...c,
      custom: true,
      kind: isFood ? (c.drink ? 'drink' : 'food') : 'wear',
      price: isFood ? 5 : 0,
      desc: c.desc || (isFood ? 'A homemade snack. Made with love (and goo).' : 'Made by YOU in the Workshop!'),
      hunger: isFood ? (c.drink ? 5 : 30) : 0,
      thirst: isFood ? (c.drink ? 35 : 5) : 0,
      gas: 0.5, burp: 0.4,
    });
    modelCache.delete(c.id);
  }
}
export function invalidateModel(id) { modelCache.delete(id); }
