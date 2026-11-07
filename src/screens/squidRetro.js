// Squid Smackdown in the Classic 90s look: the fight stays the same, but the
// arena around the ring is painted pixel art. A night sky, stands packed with
// cheering fish (two animation frames), crowd signs, dithered spotlights, and
// waves in front with a few fish poking out of the water.
import * as THREE from '../../vendor/three.module.min.js';
import { hash, paint, blob, strip, sprite, texture, seeded, pixelSign } from '../pixelArt.js';

export const SKY = '#000055';
const FISH = ['#ffaa55', '#55ffff', '#ff55ff', '#aaff55', '#ffff55', '#ff5555', '#aaaaff'];

// One fish fan, facing the ring. `cheer` = fins up and mouth open.
function fish(px, x, y, color, cheer) {
  blob(px, x, y, 5, 4.5, color);
  // fins
  if (cheer) { px(x - 7, y - 3, '#000000'); px(x - 6, y - 2, color); px(x + 7, y - 3, '#000000'); px(x + 6, y - 2, color); }
  else { px(x - 6, y + 2, color); px(x + 6, y + 2, color); }
  // eyes
  for (const ex of [-2, 2]) { px(x + ex, y - 2, '#ffffff'); px(x + ex, y - 1, '#000000'); }
  // mouth
  px(x, y + 2, '#000000');
  if (cheer) { px(x - 1, y + 2, '#000000'); px(x + 1, y + 2, '#000000'); px(x, y + 3, '#aa0000'); }
}

// The stands: rows of bleachers, each packed with fish. Frame 1 bobs every other fish up.
const ROW_H = 15;
function stands(frame) {
  const w = 192, rows = 4, h = rows * ROW_H + 6;
  return paint(w, h, (px) => {
    for (let r = 0; r < rows; r++) {
      const top = r * ROW_H;
      // bleacher step (behind the fish)
      for (let x = 0; x < w; x++) {
        px(x, top + ROW_H - 3, '#000000');
        px(x, top + ROW_H - 2, '#5555ff');
        px(x, top + ROW_H - 1, '#0000aa');
        for (let y = top; y < top + ROW_H - 3; y++) px(x, y, (x + y) % 2 && r % 2 ? '#000055' : '#0000aa');
      }
      for (let i = 0; i < 12; i++) {
        const x = i * 16 + 8 + (r % 2) * 8;
        const bob = frame && (i + r) % 2 ? -2 : 0;
        const color = FISH[Math.floor(hash(i, r) * FISH.length)];
        fish(px, x, top + ROW_H - 8 + bob, color, frame && (i + r) % 2);
      }
    }
    // front rail
    for (let x = 0; x < w; x++) for (let y = h - 6; y < h; y++) px(x, y, y === h - 6 || y === h - 1 ? '#000000' : x % 12 < 2 ? '#aaaaaa' : '#ff5555');
  });
}

const stars = () => paint(128, 64, (px) => {
  const rnd = seeded(11);
  for (let i = 0; i < 26; i++) px(rnd() * 128, Math.floor(rnd() * 64), rnd() < 0.75 ? '#ffffff' : '#ffff55');
  for (let i = 0; i < 3; i++) {
    const x = rnd() * 120 + 4, y = Math.floor(rnd() * 56) + 4;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) px(x + dx, y + dy, dx || dy ? '#55ffff' : '#ffffff');
  }
});

const moon = () => paint(28, 28, (px) => {
  blob(px, 14, 14, 11, 11, '#ffff55');
  // carve out a crescent by painting the sky color over part of it
  for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) if (((x - 19) / 9) ** 2 + ((y - 10) / 9) ** 2 <= 1 && ((x - 14) / 12) ** 2 + ((y - 14) / 12) ** 2 <= 1) px(x, y, SKY);
});

// A searchlight beam, see-through by leaving most pixels empty (classic dithering).
// Narrow at the bottom (the lamp), wide at the top.
const beam = () => paint(48, 170, (px) => {
  for (let y = 0; y < 170; y += 2) {
    const half = 2 + ((170 - y) / 170) * 20;
    for (let x = Math.floor(24 - half); x < 24 + half; x++) if ((x + y / 2) % 3 === 0) px(x, y, '#ffff55');
  }
});

// Waves: a strip of water with crests along the top. Two frames so they lap.
const waves = (frame) => paint(64, 40, (px) => {
  for (let x = 0; x < 64; x++) {
    const crest = 3 + Math.round(2 * Math.sin((x + frame * 8) / 64 * Math.PI * 4));
    for (let y = crest; y < 40; y++) {
      const r = hash(x, y + frame);
      px(x, y, y === crest ? '#ffffff' : y === crest + 1 ? '#55ffff' : r < 0.06 ? '#55aaff' : '#0000aa');
    }
  }
});

// A fish poking out of the water, waving its fins.
const swimmer = (color, cheer) => paint(20, 16, (px) => fish(px, 10, 8, color, cheer));

/**
 * Build the painted arena.
 * Returns { group, setName(name), update(t, excited) }.
 */
export function buildSquidRetro() {
  const group = new THREE.Group();
  const W = 900, X = 60; // wide enough for the shifted fight view; centered a bit right
  const add = (m, x, y, z) => { m.position.set(x, y, z); group.add(m); return m; };

  // Sky: stars and a crescent moon.
  const starTex = texture(stars());
  starTex.wrapT = THREE.RepeatWrapping;
  starTex.repeat.set(W / 128, 200 / 64);
  add(new THREE.Mesh(new THREE.PlaneGeometry(W, 200), new THREE.MeshBasicMaterial({ map: starTex, transparent: true, alphaTest: 0.5 })), X, 120, -420);
  add(sprite(moon()), -58, 92, -410);

  // The stands, with two frames swapped for the bobbing crowd.
  const crowdFrames = [stands(0), stands(1)].map((c) => {
    const t = texture(c, W / c.width);
    return t;
  });
  const crowd = strip(stands(0), W, -12, -300);
  crowd.material.map = crowdFrames[0];
  crowd.position.x = X;
  group.add(crowd);

  // Crowd signs (one cheers for the player's goblin by name).
  const signs = [];
  const addSign = (text, bg, x, y) => {
    const s = add(pixelSign(text, bg), x, y, -290);
    signs.push({ obj: s, y, ph: signs.length * 1.7 });
    return s;
  };
  // (The fight fills the middle and the question card covers the right, so the
  // signs that matter sit on the left; the rest show on wider screens.)
  const NAME_AT = [-38, 52];
  addSign('INKY!', '#ff55ff', 46, 46);
  addSign('8x8=64', '#ffffff', 150, 40);
  addSign('BOO!', '#55ff55', 200, 52);
  let nameSign = addSign('GO GOB!', '#ffff55', ...NAME_AT);

  // Searchlights behind the stands, sweeping the sky.
  const beams = [-1, 1].map((side) => add(sprite(beam()), side * 70 + 30, 30, -350));

  // Waves in front of the ring, and fish fans in the water.
  const waveFrames = [texture(waves(0), W / 64), texture(waves(1), W / 64)];
  const water = strip(waves(0), W, -48, 60);
  water.material.map = waveFrames[0];
  water.position.x = X;
  group.add(water);
  const swimmers = [];
  const rnd = seeded(3);
  for (const x of [-62, -40, 70, 98, 140, 170]) {
    const c = FISH[Math.floor(rnd() * FISH.length)];
    const frames = [texture(swimmer(c, false)), texture(swimmer(c, true))];
    const s = add(sprite(swimmer(c, false)), x, -14, 55);
    s.material.map = frames[0];
    swimmers.push({ obj: s, frames, ph: rnd() * 6 });
  }

  return {
    group,
    // The crowd sign cheers for the goblin by name.
    setName(name) {
      const text = `GO ${String(name || 'GOB').toUpperCase().slice(0, 10)}!`;
      const old = nameSign;
      signs.splice(signs.findIndex((s) => s.obj === old), 1);
      old.removeFromParent();
      old.material.map.dispose();
      nameSign = addSign(text, '#ffff55', ...NAME_AT);
    },
    // excited: Big Inky is down or beaten, so the crowd goes wild.
    update(t, excited) {
      const speed = excited ? 9 : 3;
      crowd.material.map = crowdFrames[Math.floor(t * speed / 2) % 2];
      water.material.map = waveFrames[Math.floor(t * 1.5) % 2];
      beams.forEach((b, i) => { b.rotation.z = (i ? -1 : 1) * (0.3 + 0.2 * Math.sin(t * 0.7 + i * 2)); });
      for (const s of signs) s.obj.position.y = s.y + (Math.sin(t * speed + s.ph) > 0 ? 2 : 0);
      for (const s of swimmers) {
        const up = Math.sin(t * speed + s.ph) > 0;
        s.obj.position.y = up ? -12 : -14;
        s.obj.material.map = s.frames[up && excited ? 1 : 0];
      }
    },
  };
}
