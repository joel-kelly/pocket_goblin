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

// ---------------- DECOR ----------------
// Decor grids are 14 wide, 18 tall, 14 deep. The front faces +z.
function petSquid() {
  const m = grid('decor');
  const body = (x, y, z) => (h(x, y, z) < 0.18 ? '#9a3f8a' : '#c860b0');
  m.sphere(7, 10, 7, 3.6, body, 5);
  m.cone(7, 7, 2.2, 0.6, 14, 17, body);
  // fins
  for (const [x, y] of [[2, 13], [2, 14], [3, 15], [11, 13], [11, 14], [10, 15]]) m.set(x, y, 7, '#9a3f8a');
  // tentacles curling out across the floor
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    for (let s = 0; s <= 6; s++) {
      const r = 1.6 + s * 0.75;
      m.set(7 + Math.cos(a) * r, Math.max(0, 5 - s), 7 + Math.sin(a) * r, s % 2 ? '#ffc2dc' : '#b85aa6');
    }
    m.set(7 + Math.cos(a) * 7.2, 1, 7 + Math.sin(a) * 7.2, '#b85aa6'); // curly tip
  }
  // big googly eyes
  for (const ex of [4, 8]) {
    m.box(ex, 9, 10, ex + 2, 12, 11, C.white);
    m.set(ex + (ex < 7 ? 1 : 0), 10, 11, C.black);
  }
  m.box(6, 7, 10, 8, 8, 11, '#7a2a6a'); // little smile
  return m;
}
function fartJar() {
  const m = grid('decor');
  m.cyl(7, 7, 4.2, 0, 1, '#bfe0e0');
  m.cyl(7, 7, 4.6, 1, 11, (x, y, z) => {
    if (z >= 10 && x === 4 && y > 2) return '#f2fbff'; // glare
    if (z >= 10 && y >= 4 && y <= 7 && x >= 5 && x <= 9) return y === 4 || y === 7 ? '#c9b48a' : '#f4f1e6'; // label
    return h(x, y, z) < 0.3 ? '#b6e86a' : h(z, x, y) < 0.15 ? '#6e9a2a' : '#8fc94a';
  });
  // a little brown cloud doodle on the label
  m.set(6, 5, 11, '#7a4a24'); m.set(7, 6, 11, '#7a4a24'); m.set(8, 5, 11, '#7a4a24'); m.set(7, 5, 11, '#7a4a24');
  m.cyl(7, 7, 3.4, 11, 12, '#d8eef5');
  m.cyl(7, 7, 2.8, 12, 15, (x, y) => (y === 13 ? '#8a5a2c' : C.brownL)); // cork
  m.cyl(7, 7, 4.2, 12, 13, '#e2353f'); // red ribbon
  m.set(11, 12, 7, '#e2353f'); m.set(11, 11, 8, '#e2353f');
  return m;
}
function deadPlant() {
  const m = grid('decor');
  m.cone(7, 7, 3.4, 4.2, 0, 6, (x, y, z) => (y === 3 ? '#a8532c' : h(x, y, z) < 0.2 ? '#b85c34' : '#c4683a'));
  m.ring(7, 7, 3.4, 4.8, 6, 7, '#a8532c');
  m.cyl(7, 7, 3.4, 6, 7, '#4f2e14');
  // crooked stem that flops over
  const stem = '#7a5a2c';
  [[7, 7], [7, 8], [7, 9], [6, 10], [6, 11], [6, 12], [7, 13], [8, 14], [9, 14], [10, 13], [11, 12], [11, 11]].forEach(([x, y]) => m.set(x, y, 7, stem));
  // crispy brown leaves
  const leaf = (x, y, z) => m.set(x, y, z, h(x, y, z) < 0.5 ? '#a07a3a' : '#8a6a2a');
  [[5, 9, 7], [4, 8, 7], [8, 11, 7], [9, 10, 7], [5, 12, 8], [4, 11, 8], [7, 12, 6]].forEach(([x, y, z]) => leaf(x, y, z));
  // droopy dead flower
  m.box(10, 9, 6, 13, 11, 9, '#8a5a6a');
  m.set(11, 8, 7, '#8a5a6a');
  m.set(11, 10, 7, '#c9a03a');
  // one leaf already gave up
  m.set(12, 0, 11, '#a07a3a'); m.set(13, 0, 11, '#8a6a2a'); m.set(12, 0, 12, '#a07a3a');
  return m;
}
function petRock() {
  const m = grid('decor');
  m.sphere(7, 3, 7, 4.6, (x, y, z) => (h(x, y, z) < 0.2 ? '#6e6e7a' : h(z, y, x) < 0.2 ? '#a4a4b0' : '#8e8e9a'), 3.4);
  for (const [x, y, z] of [...m.each()]) if (y < 0) m.delete(x, y, z);
  for (const ex of [4, 8]) { m.box(ex, 3, 11, ex + 2, 5, 12, C.white); m.set(ex + 1, 3, 12, C.black); }
  // tiny red bow on top
  m.box(5, 6, 7, 7, 7, 8, C.red); m.box(8, 6, 7, 10, 7, 8, C.red); m.set(7, 6, 7, C.redD);
  return m;
}
function snotLamp() {
  const m = grid('decor');
  m.cone(7, 7, 3.6, 2.4, 0, 3, (x, y) => (y === 0 ? C.grayD : C.silver));
  for (let y = 3; y < 13; y++) {
    const r = 2.2 + 1.3 * Math.sin(Math.PI * (y - 3) / 10);
    m.cyl(7, 7, r, y, y + 1, (x, yy, z) => {
      const blob = Math.sin(x * 1.3 + yy * 0.9) + Math.cos(z * 1.1 - yy * 0.7) > 1.1;
      return blob ? (h(x, yy, z) < 0.3 ? '#b6f04a' : C.slime) : '#6a3fb5';
    });
  }
  m.cone(7, 7, 2.2, 1.2, 13, 16, (x, y) => (y === 15 ? C.grayD : C.silver));
  return m;
}
function goldToilet() {
  const m = grid('decor');
  const gold = (x, y, z) => (h(x, y, z) < 0.15 ? C.yellow : C.gold);
  m.box(5, 0, 6, 9, 3, 10, gold); // pedestal
  m.cyl(7, 8.5, 4.2, 3, 6, gold); // bowl
  m.ring(7, 8.5, 3.0, 4.4, 6, 7, C.goldD); // seat
  m.cyl(7, 8.5, 3.0, 5, 6, C.cyan); // water
  m.box(2, 5, 1, 12, 14, 4, gold); // tank
  m.box(1, 14, 0, 13, 15, 5, C.goldD); // tank lid
  m.box(10, 12, 4, 12, 13, 5, C.silver); // flush handle
  m.set(7, 10, 4, C.red); m.set(6, 9, 4, C.blue); m.set(8, 9, 4, C.blue); // fancy jewels
  return m;
}
function sockTrophy() {
  const m = grid('decor');
  m.box(3, 0, 3, 11, 2, 11, C.brownD);
  m.box(4, 2, 4, 10, 3, 10, C.brown);
  m.set(6, 1, 11, C.gold); m.set(7, 1, 11, C.gold); // plaque
  m.cyl(7, 7, 1.2, 3, 6, C.goldD);
  m.cone(7, 7, 2.2, 4.4, 6, 11, C.gold);
  m.cyl(7, 7, 3.4, 10, 11, C.goldD);
  m.box(1, 8, 6, 2, 11, 8, C.gold); m.box(12, 8, 6, 13, 11, 8, C.gold); // handles
  // a stinky golden sock sticking out the top
  m.box(6, 11, 6, 9, 16, 9, (x, y) => (y === 15 ? C.white : '#ffe14d'));
  m.box(9, 11, 6, 11, 13, 9, '#ffe14d');
  return m;
}
function moldyCake() {
  const m = grid('decor');
  m.cyl(7, 7, 6, 0, 1, '#e8e4f0'); // plate
  m.cyl(7, 7, 5, 1, 4, (x, y, z) => (h(x, y, z) < 0.22 ? '#8db33a' : y === 2 ? C.white : C.pink));
  m.cyl(7, 7, 3.6, 4, 7, (x, y, z) => (h(x, y, z) < 0.25 ? '#8db33a' : y === 5 ? C.white : C.pinkL));
  // candles (one still lit)
  for (const [x, z] of [[5, 6], [8, 6], [7, 9]]) m.box(x, 7, z, x + 1, 10, z + 1, x === 8 ? C.blue : C.yellow);
  m.set(8, 10, 6, C.orange); m.set(8, 11, 6, C.yellow);
  return m;
}

const W = (id, name, slot, price, desc, build) => ({ id, name, slot, price, desc, build, kind: 'wear' });
// Decor: anim = idle animation in the den, poke = what happens when you click it.
const D = (id, name, price, desc, build, extra = {}) => ({ id, name, slot: 'decor', price, desc, build, kind: 'decor', ...extra });
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

  D('deadplant', 'Dead Plant', 15, 'It is not dead. It is just resting. Forever.', deadPlant, {
    anim: 'sway', poke: 'leaf',
    lines: ["Shhh! It's sleeping.", 'I water it with pickle juice every day!', "It's not brown. It's 'autumn colored'.", "Best plant ever. Never needs anything."],
  }),
  D('petrock', 'Pet Rock', 25, 'Very well behaved. Has never once run away.', petRock, {
    poke: 'none',
    lines: ['Rocky says hi! ...Rocky is shy.', "Good boy, Rocky! Who's a good rock?", 'Rocky did a trick! (He sat.)', 'Shh, Rocky is napping. Rocky is always napping.'],
  }),
  D('fartjar', 'Fart Jar', 40, 'A rare vintage. Do NOT open indoors. (Open it indoors.)', fartJar, {
    anim: 'stink', poke: 'fart',
    lines: ['Ahhh. A fine vintage.', "Smell that? That's from my birthday.", 'I collect the good ones.', 'Mmm, notes of egg and old cheese.'],
  }),
  D('squid', 'Pet Squid', 70, 'His name is Squidward Jr. He squishes when happy.', petSquid, {
    anim: 'squish', poke: 'squish',
    lines: ['Squish squish! He likes you!', 'He did a little ink. Sorry.', "Who's my squishy baby? YOU are!", 'He has 8 arms and still lost at thumb wrestling.'],
  }),
  D('moldycake', 'Moldy Birthday Cake', 35, 'Happy birthday! (It was three years ago.)', moldyCake, {
    anim: 'stink', poke: 'stars',
    lines: ['Still good!', 'The green part is extra frosting.', 'Make a wish! I wished for more cake.', "Don't blow out the last candle. It's my nightlight."],
  }),
  D('snotlamp', 'Snot Lava Lamp', 85, 'Groovy goo. Very relaxing. Do not lick.', snotLamp, {
    anim: 'bob', poke: 'bubbles',
    lines: ['So groovy...', 'I licked it. Do not lick it.', 'Ooooh. Blobby.', 'It goes up. It goes down. Amazing.'],
  }),
  D('trophy', 'Golden Sock Trophy', 120, 'For being the Smelliest Goblin Ever. Proudly won.', sockTrophy, {
    poke: 'stars',
    lines: ['I won that! Smelliest goblin THREE years in a row!', 'Champion of stink, baby!', 'I polish it with my tongue.'],
  }),
  D('toilet', 'Royal Golden Toilet', 200, 'A throne fit for a king. A very stinky king.', goldToilet, {
    poke: 'flush',
    lines: ['FLUSHHHH! Ahh, music.', 'Fancy! I only use it for special occasions.', "Don't drink from it. ...Okay, maybe a little sip."],
  }),
];

// ---------------- registry ----------------
const registry = new Map();
const modelCache = new Map();
BUILTIN.forEach((it) => registry.set(it.id, it));

const kindFor = (c) => (c.slot === 'snack' ? (c.drink ? 'drink' : 'food') : c.slot === 'decor' ? 'decor' : 'wear');

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
      kind: kindFor(c),
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
      kind: kindFor(c),
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
