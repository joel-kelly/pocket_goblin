// Voxel models: a set of colored cubes on an integer grid.
// Cell (x, y, z) spans x..x+1, y..y+1, z..z+1. One cell = one world unit.
import * as THREE from '../vendor/three.module.min.js';

const key = (x, y, z) => `${x},${y},${z}`;

export class VoxelModel {
  constructor(size = [16, 16, 16]) {
    this.size = size;
    this.cells = new Map(); // "x,y,z" -> "#rrggbb"
  }

  inBounds(x, y, z) {
    if (!this.size) return true; // unbounded (used for the goblin body)
    const [sx, sy, sz] = this.size;
    return x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz;
  }

  set(x, y, z, color) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (!this.inBounds(x, y, z)) return this;
    this.cells.set(key(x, y, z), color);
    return this;
  }
  get(x, y, z) { return this.cells.get(key(x, y, z)); }
  has(x, y, z) { return this.cells.has(key(x, y, z)); }
  delete(x, y, z) { this.cells.delete(key(x, y, z)); return this; }
  get count() { return this.cells.size; }

  *each() {
    for (const [k, c] of this.cells) {
      const [x, y, z] = k.split(',').map(Number);
      yield [x, y, z, c];
    }
  }

  // ---- drawing helpers (end coordinates are exclusive) ----
  box(x0, y0, z0, x1, y1, z1, color) {
    for (let x = x0; x < x1; x++)
      for (let y = y0; y < y1; y++)
        for (let z = z0; z < z1; z++) this.set(x, y, z, typeof color === 'function' ? color(x, y, z) : color);
    return this;
  }
  // Filled disc layers around (cx, cz), cell centers compared to radius.
  cyl(cx, cz, r, y0, y1, color) {
    return this.cone(cx, cz, r, r, y0, y1, color);
  }
  cone(cx, cz, r0, r1, y0, y1, color) {
    for (let y = y0; y < y1; y++) {
      const t = y1 - y0 <= 1 ? 0 : (y - y0) / (y1 - y0 - 1);
      const r = r0 + (r1 - r0) * t;
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++)
        for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) {
          const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
          if (dx * dx + dz * dz <= r * r) this.set(x, y, z, typeof color === 'function' ? color(x, y, z) : color);
        }
    }
    return this;
  }
  ring(cx, cz, rIn, rOut, y0, y1, color) {
    for (let y = y0; y < y1; y++)
      for (let x = Math.floor(cx - rOut - 1); x <= cx + rOut + 1; x++)
        for (let z = Math.floor(cz - rOut - 1); z <= cz + rOut + 1; z++) {
          const dx = x + 0.5 - cx, dz = z + 0.5 - cz, d = dx * dx + dz * dz;
          if (d <= rOut * rOut && d >= rIn * rIn) this.set(x, y, z, typeof color === 'function' ? color(x, y, z) : color);
        }
    return this;
  }
  sphere(cx, cy, cz, r, color, ry = r) {
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++)
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
        for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) {
          const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / r;
          if (dx * dx + dy * dy + dz * dz <= 1) this.set(x, y, z, typeof color === 'function' ? color(x, y, z) : color);
        }
    return this;
  }
  // Recolor existing cells.
  paint(fn) {
    for (const [x, y, z, c] of [...this.each()]) {
      const n = fn(x, y, z, c);
      if (n) this.set(x, y, z, n);
    }
    return this;
  }

  clone() {
    const m = new VoxelModel(this.size ? [...this.size] : null);
    for (const [k, c] of this.cells) m.cells.set(k, c);
    return m;
  }

  toJSON() {
    const palette = [];
    const index = new Map();
    const voxels = [];
    for (const [x, y, z, c] of this.each()) {
      if (!index.has(c)) { index.set(c, palette.length); palette.push(c); }
      voxels.push([x, y, z, index.get(c)]);
    }
    return { size: this.size, palette, voxels };
  }
  static fromJSON(data) {
    const m = new VoxelModel(data.size);
    for (const [x, y, z, i] of data.voxels) m.set(x, y, z, data.palette[i]);
    return m;
  }
}

// ---------- meshing ----------
// Faces: normal + 4 corners (counter-clockwise seen from outside).
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.88 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.88 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.6 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.95 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.8 },
];
const AO_LEVELS = [0.5, 0.68, 0.84, 1.0];

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const colorCache = new Map();
function rgb(hex) {
  let c = colorCache.get(hex);
  if (!c) {
    const col = new THREE.Color(hex);
    c = [col.r, col.g, col.b];
    colorCache.set(hex, c);
  }
  return c;
}

/**
 * Build a BufferGeometry from a model.
 * opts.offset: [x,y,z] added to every cell (e.g. slot origin minus part pivot)
 * opts.jitter: per-voxel brightness noise amount
 */
export function buildGeometry(model, opts = {}) {
  const off = opts.offset || [0, 0, 0];
  const jitter = opts.jitter ?? 0.06;
  const solid = (x, y, z) => model.cells.has(key(x, y, z));
  const pos = [], nor = [], col = [];

  for (const [x, y, z, hex] of model.each()) {
    const base = rgb(hex);
    const j = 1 - jitter / 2 + hash3(x, y, z) * jitter;
    for (const f of FACES) {
      const [nx, ny, nz] = f.n;
      if (solid(x + nx, y + ny, z + nz)) continue;
      // Tangent axes for ambient occlusion.
      const axis = nx ? 0 : ny ? 1 : 2;
      const ua = (axis + 1) % 3, va = (axis + 2) % 3;
      const ao = f.c.map((corner) => {
        const du = corner[ua] * 2 - 1, dv = corner[va] * 2 - 1;
        const p = [x + nx, y + ny, z + nz];
        const s1p = [...p]; s1p[ua] += du;
        const s2p = [...p]; s2p[va] += dv;
        const cp = [...p]; cp[ua] += du; cp[va] += dv;
        const s1 = solid(...s1p) ? 1 : 0, s2 = solid(...s2p) ? 1 : 0, cc = solid(...cp) ? 1 : 0;
        return s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
      });
      const order = ao[0] + ao[2] > ao[1] + ao[3] ? [0, 1, 2, 0, 2, 3] : [1, 2, 3, 1, 3, 0];
      for (const i of order) {
        const c = f.c[i];
        pos.push(x + c[0] + off[0], y + c[1] + off[1], z + c[2] + off[2]);
        nor.push(nx, ny, nz);
        const b = j * f.shade * AO_LEVELS[ao[i]];
        col.push(base[0] * b, base[1] * b, base[2] * b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

export const voxelMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

export function buildMesh(model, opts = {}) {
  const mesh = new THREE.Mesh(buildGeometry(model, opts), opts.material || voxelMaterial);
  mesh.castShadow = true;
  return mesh;
}

export { key as cellKey };
