// The goblin's body, built from voxels in "world voxel" coordinates.
// Feet stand on y = 0, the goblin faces +z (toward the camera).
import * as THREE from '../vendor/three.module.min.js';
import { VoxelModel, cellKey } from './voxel.js';

// Where each kind of item sits on the goblin. Items are drawn in a small grid
// (size) whose corner sits at `origin`. `part` is the body part it moves with.
export const SLOTS = {
  head:  { label: 'Hats',        icon: '🎩', origin: [-10, 24, -8], size: [20, 14, 18], part: 'head' },
  face:  { label: 'Face Stuff',  icon: '🕶️', origin: [-9, 14, 5],   size: [18, 13, 4],  part: 'head' },
  neck:  { label: 'Bling',       icon: '📿', origin: [-6, 7, -4],   size: [12, 8, 9],   part: 'torso' },
  body:  { label: 'Shirts',      icon: '👕', origin: [-8, 3, -5],   size: [16, 12, 11], part: 'torso' },
  back:  { label: 'Back Stuff',  icon: '🦋', origin: [-10, 3, -10], size: [20, 19, 7],  part: 'torso' },
  hand:  { label: 'Hand Stuff',  icon: '🪄', origin: [4, 0, -3],    size: [6, 18, 8],   part: 'armR' },
  feet:  { label: 'Shoes',       icon: '👟', origin: [-6, 0, -3],   size: [12, 5, 8],   part: 'root' },
  snack: { label: 'Snacks',      icon: '🍔', origin: [0, 0, 0],     size: [10, 10, 10], part: null },
};
export const WEAR_SLOTS = ['head', 'face', 'neck', 'body', 'back', 'hand', 'feet'];

// Pivot points (world voxel coords) and parents for each body part.
export const PARTS = {
  root:  { pivot: [0, 0, 0],    parent: null },
  torso: { pivot: [0, 5, 0],    parent: 'root' },
  head:  { pivot: [0, 14, 0],   parent: 'torso' },
  earL:  { pivot: [-8, 21, 0],  parent: 'head' },
  earR:  { pivot: [8, 21, 0],   parent: 'head' },
  armL:  { pivot: [-7, 13, 0],  parent: 'torso' },
  armR:  { pivot: [7, 13, 0],   parent: 'torso' },
  hair:  { pivot: [0, 14, 0],   parent: 'head' },
};

export const SKINS = {
  'Swamp Green': '#6cbf3c',
  'Bog Blue': '#4fa6c9',
  'Grape Slime': '#9a6bd1',
  'Pumpkin': '#e98a3b',
  'Bubblegum': '#ee82b4',
  'Moldy Gray': '#9aa58c',
};

function shade(hex, dl, ds = 0) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, Math.max(0, hsl.s + ds)), Math.min(1, Math.max(0, hsl.l + dl)));
  return '#' + c.getHexString();
}

export function buildGoblinParts(skin = SKINS['Swamp Green']) {
  const S = skin;
  const dark = shade(S, -0.12);
  const light = shade(S, 0.1, -0.05);
  const nail = '#e8d36a';
  const pink = '#e98a9e';
  const pants = '#7a4b2a';
  const patch = '#a8763f';
  const rope = '#d7b67a';

  const parts = {};
  for (const p of Object.keys(PARTS)) parts[p] = new VoxelModel(null);

  // Legs + feet (root)
  const L = parts.root;
  for (const [x0, x1] of [[-4, -1], [1, 4]]) {
    L.box(x0, 2, -1, x1, 5, 2, S);
    L.box(x0, 0, -2, x1, 2, 3, dark);
    L.set(x0 + 1, 0, 2, nail);
    L.set(x0, 0, 2, nail);
  }

  // Torso
  const T = parts.torso;
  T.box(-5, 5, -3, 5, 14, 3, S);
  for (let y = 5; y < 14; y++) for (const x of [-5, 4]) for (const z of [-3, 2]) T.delete(x, y, z);
  T.box(-3, 6, 3, 3, 12, 4, light); // pot belly
  T.set(-1, 9, 3, dark); // belly button
  T.paint((x, y, z) => (y < 8 ? pants : null));
  T.paint((x, y, z) => (y === 7 ? rope : null));
  T.set(2, 5, 3, patch); T.set(3, 6, 2, patch); T.set(-4, 5, 2, patch);
  T.set(-1, 5, -3, '#4a2c15'); T.set(-1, 6, -3, '#4a2c15'); // butt crack, obviously

  // Arms (long and dangly)
  for (const [name, x0, x1] of [['armL', -8, -6], ['armR', 6, 8]]) {
    const A = parts[name];
    A.box(x0, 7, -1, x1, 13, 1, S);
    A.box(x0, 5, -1, x1, 7, 2, dark);
    A.set(x0, 4, 1, nail); A.set(x1 - 1, 4, 1, nail); // little claws
  }

  // Head
  const H = parts.head;
  H.box(-8, 14, -5, 8, 27, 5, S);
  for (let y = 14; y < 27; y++) for (const x of [-8, 7]) for (const z of [-5, 4]) H.delete(x, y, z);
  for (let x = -8; x < 8; x++) for (let z = -5; z < 5; z++) {
    if (x < -7 || x > 6 || z < -4 || z > 3) { H.delete(x, 26, z); }
    if (x < -6 || x > 5 || z < -4 || z > 3) { H.delete(x, 14, z); }
  }
  for (const x of [-8, 7]) for (let z = -5; z < 5; z++) { H.delete(x, 25, z); H.delete(x, 15, z); }
  // Big droopy nose
  H.box(-1, 18, 5, 1, 21, 6, dark);
  H.box(-1, 17, 6, 1, 19, 7, dark);
  H.set(-1, 17, 7, dark); H.set(0, 17, 7, dark);
  H.set(4, 19, 5, '#b8a35a'); // a lovely wart

  // Ears (big and pointy)
  const earRows = [[18, 24], [19, 24], [19, 23], [20, 23], [20, 22], [21, 23], [22, 23]];
  earRows.forEach(([y0, y1], i) => {
    for (let y = y0; y < y1; y++) for (let z = -1; z < 1; z++) {
      const inner = i >= 1 && i <= 3 && y > y0 && y < y1 - 1 && z === 0;
      parts.earL.set(-9 - i, y, z, inner ? pink : S);
      parts.earR.set(8 + i, y, z, inner ? pink : S);
    }
  });

  // Hair tufts (hidden under hats)
  const hairC = shade(S, -0.25);
  parts.hair.set(-1, 27, 0, hairC); parts.hair.set(-1, 28, 0, hairC); parts.hair.set(-2, 29, 0, hairC);
  parts.hair.set(2, 27, -1, hairC); parts.hair.set(3, 28, -1, hairC);
  parts.hair.set(-4, 27, 1, hairC);

  return parts;
}

// Cells the goblin occupies (world voxel keys), excluding hair.
let ghostCache = null;
export function goblinCells() {
  if (ghostCache) return ghostCache;
  const parts = buildGoblinParts();
  const set = new Set();
  for (const [name, m] of Object.entries(parts)) {
    if (name === 'hair') continue;
    for (const [x, y, z] of m.each()) set.add(cellKey(x, y, z));
  }
  ghostCache = set;
  return set;
}

// Is a local cell inside a slot blocked by the goblin's body?
export function isGhostCell(slot, x, y, z) {
  const s = SLOTS[slot];
  if (!s || !s.part) return false;
  const o = s.origin;
  return goblinCells().has(cellKey(x + o[0], y + o[1], z + o[2]));
}

// Remove any cells that would be inside the goblin.
export function fitToSlot(model, slot) {
  for (const [x, y, z] of [...model.each()]) if (isGhostCell(slot, x, y, z)) model.delete(x, y, z);
  return model;
}

// World cells of one body part (for building clothes that hug the body).
const partCache = {};
export function partCells(part) {
  if (!partCache[part]) {
    const set = new Set();
    for (const [x, y, z] of buildGoblinParts()[part].each()) set.add(cellKey(x, y, z));
    partCache[part] = set;
  }
  return partCache[part];
}
