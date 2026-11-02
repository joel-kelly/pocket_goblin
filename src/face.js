// The goblin's face: pixel art drawn onto a 32x26 canvas that sits on the
// front of the head (2 canvas pixels per voxel).
export const FACE_W = 32, FACE_H = 26;

const PAL = {
  K: '#1b1020', // black outline
  W: '#fbf7e8', // white / teeth
  Y: '#f6e35a', // goblin eye yellow
  R: '#e8344a', // red
  O: '#5a1020', // mouth inside
  L: '#ef6f8a', // tongue
  B: '#5ec8ff', // tears / sweat
  P: '#ff8fb0', // blush
  G: '#3a8a2a', // green (money)
  S: '#ffffff',
};

// Each expression is a recipe of parts.
export const EXPRESSIONS = {
  neutral:   { eyes: 'open',   brows: 'flat',  mouth: 'smile' },
  happy:     { eyes: 'happy',  brows: 'up',    mouth: 'grin',   extras: ['blush'] },
  ecstatic:  { eyes: 'star',   brows: 'up',    mouth: 'grin',   extras: ['blush'] },
  love:      { eyes: 'heart',  brows: 'up',    mouth: 'smile',  extras: ['blush'] },
  money:     { eyes: 'money',  brows: 'up',    mouth: 'grin' },
  sad:       { eyes: 'sad',    brows: 'sad',   mouth: 'frown' },
  crying:    { eyes: 'closed', brows: 'sad',   mouth: 'scream', extras: ['tears'] },
  hungry:    { eyes: 'sad',    brows: 'sad',   mouth: 'o',      extras: ['drool'] },
  thirsty:   { eyes: 'sleepy', brows: 'sad',   mouth: 'tongue' },
  stinky:    { eyes: 'sleepy', brows: 'flat',  mouth: 'wavy',   extras: ['sweat'] },
  bored:     { eyes: 'sleepy', brows: 'flat',  mouth: 'flat' },
  angry:     { eyes: 'angry',  brows: 'angry', mouth: 'chomp' },
  shocked:   { eyes: 'wide',   brows: 'raised', mouth: 'o' },
  dizzy:     { eyes: 'swirl',  brows: 'none',  mouth: 'wavy' },
  fainted:   { eyes: 'x',      brows: 'none',  mouth: 'tongue' },
  chompOpen: { eyes: 'happy',  brows: 'up',    mouth: 'o' },
  chompShut: { eyes: 'happy',  brows: 'up',    mouth: 'chomp' },
  smug:      { eyes: 'side',   brows: 'raised', mouth: 'smirk', extras: ['blush'] },
  focus:     { eyes: 'open',   brows: 'angry', mouth: 'flat' },
  gross:     { eyes: 'closed', brows: 'angry', mouth: 'wavy' },
  cheeky:    { eyes: 'happy',  brows: 'raised', mouth: 'tongue', extras: ['blush'] },
  sleepy:    { eyes: 'closed', brows: 'flat',  mouth: 'o' },
  nervous:   { eyes: 'wide',   brows: 'sad',   mouth: 'wavy',   extras: ['sweat'] },
};

// Mouth sprites (centered horizontally at x=16, top at y=20)
const MOUTHS = {
  smile: [
    'K............K',
    '.K....W.W...K.',
    '..KKKKKKKKKK..',
  ],
  grin: [
    'KKKKKKKKKKKKKK',
    'KWOOOOOOOOOOWK',
    '.KOOOOOOOOOOK.',
    '..KOLLLLLLOK..',
    '...KKKKKKKK...',
  ],
  frown: [
    '....KKKKKK....',
    '..KK......KK..',
    '.K..........K.',
  ],
  o: [
    '.KKKK.',
    'KOOOOK',
    'KOLLOK',
    '.KKKK.',
  ],
  wavy: [
    '.KK...KK...KK.',
    'K..K.K..K.K..K',
    '....K....K....',
  ],
  tongue: [
    'KKKKKKKKKKKK',
    '....KLLK....',
    '....KLLK....',
    '.....KK.....',
  ],
  chomp: [
    'KKKKKKKKKKKK',
    'KWKWKWKWKWKK',
    'KKKKKKKKKKKK',
  ],
  flat: [
    'KKKKKKKKKK',
    '.W......W.',
  ],
  smirk: [
    '...........K',
    'KKKKKKKKKKK.',
    '......W.....',
  ],
  scream: [
    '...KKKKKKKK...',
    '..KOOOOOOOOK..',
    '.KOOOOOOOOOOK.',
    '.KOOLLLLLLOOK.',
    '..KKKKKKKKKK..',
  ],
};

const HEART = ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'];
const STAR = ['...Y...', '..YYY..', 'YYYYYYY', '.YYYYY.', '.YY.YY.', 'Y.....Y'];
const MONEY = ['..G..', '.GGGG', 'G.G..', '.GGG.', '..G.G', 'GGGG.', '..G..'];
const SWIRL = ['KKKKKK', 'K....K', 'K.KK.K', 'K.K..K', 'K.KKKK', 'K.....'];
const XEYE = ['K...K', '.K.K.', '..K..', '.K.K.', 'K...K'];

function blit(ctx, rows, x0, y0, flip = false) {
  rows.forEach((row, y) => {
    for (let i = 0; i < row.length; i++) {
      const ch = flip ? row[row.length - 1 - i] : row[i];
      if (ch === '.' || !PAL[ch]) continue;
      ctx.fillStyle = PAL[ch];
      ctx.fillRect(x0 + i, y0 + y, 1, 1);
    }
  });
}
function px(ctx, color, x, y, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

const EYE_Y = 9;
const EYE_X = [8, 24]; // left, right (as seen by viewer)

function drawOpenEye(ctx, cx, cy, look, big = false) {
  const r = big ? 4 : 3;
  for (let y = -r; y < r; y++) for (let x = -r; x < r; x++) {
    const corner = (x === -r || x === r - 1) && (y === -r || y === r - 1);
    if (!corner) px(ctx, PAL.Y, cx + x, cy + y);
  }
  const lx = Math.round(look[0] * (big ? 2 : 1)), ly = Math.round(look[1]);
  if (big) {
    px(ctx, PAL.K, cx - 1 + lx, cy - 1 + ly, 2, 2);
  } else {
    px(ctx, PAL.K, cx - 1 + lx, cy - 2 + ly, 2, 3);
    px(ctx, PAL.S, cx - 1 + lx, cy - 2 + ly, 1, 1);
  }
}

function drawEyes(ctx, type, skinDark, look, t) {
  EYE_X.forEach((cx, side) => {
    const cy = EYE_Y;
    const outward = side === 0 ? -1 : 1;
    switch (type) {
      case 'open': drawOpenEye(ctx, cx, cy, look); break;
      case 'wide': drawOpenEye(ctx, cx, cy, look, true); break;
      case 'closed':
        px(ctx, PAL.K, cx - 3, cy, 6, 1);
        px(ctx, PAL.K, cx - 3 + (side ? 5 : 0), cy - 1, 1, 1);
        break;
      case 'happy':
        [[-3, 1], [-2, 0], [-1, -1], [0, -1], [1, 0], [2, 1]].forEach(([x, y]) => px(ctx, PAL.K, cx + x, cy + y, 1, 2));
        break;
      case 'sad': // droopy lids sloping down to the outside
        drawOpenEye(ctx, cx, cy, [look[0], 1]);
        for (let x = -3; x < 3; x++) {
          const d = x * outward; // -3..2 from inside to outside
          const h = d > 0 ? 3 : 2;
          px(ctx, skinDark, cx + x, cy - 3, 1, h);
        }
        break;
      case 'angry': // lids sloping down to the inside
        drawOpenEye(ctx, cx, cy, look);
        for (let x = -3; x < 3; x++) {
          const d = x * outward;
          const h = d < 0 ? 3 : 1;
          px(ctx, skinDark, cx + x, cy - 3, 1, h);
        }
        break;
      case 'sleepy':
        drawOpenEye(ctx, cx, cy, [look[0], 1]);
        px(ctx, skinDark, cx - 3, cy - 3, 6, 3);
        px(ctx, PAL.K, cx - 3, cy, 6, 1);
        break;
      case 'side':
        drawOpenEye(ctx, cx, cy, [side ? 1 : 1, 0]);
        px(ctx, skinDark, cx - 3, cy - 3, 6, 2);
        px(ctx, PAL.K, cx - 3, cy - 1, 6, 1);
        break;
      case 'heart': {
        const pulse = Math.sin(t * 10) > 0 ? 0 : 1;
        blit(ctx, HEART, cx - 3, cy - 3 + pulse);
        break;
      }
      case 'star': blit(ctx, STAR, cx - 3, cy - 3); break;
      case 'money': blit(ctx, MONEY, cx - 2, cy - 3); break;
      case 'swirl': blit(ctx, SWIRL, cx - 3, cy - 3, side === 1 ? Math.sin(t * 8) > 0 : Math.sin(t * 8) <= 0); break;
      case 'x': blit(ctx, XEYE, cx - 2, cy - 2); break;
    }
  });
}

function drawBrows(ctx, type, skinDark) {
  if (type === 'none') return;
  EYE_X.forEach((cx, side) => {
    const outward = side === 0 ? -1 : 1;
    for (let x = -3; x < 3; x++) {
      const d = (x + 0.5) * outward; // negative = inside
      let y = EYE_Y - 5;
      if (type === 'up') y -= 1;
      if (type === 'raised') y -= side === 1 ? 2 : 0;
      if (type === 'angry') y += d < 0 ? 1 : 0;
      if (type === 'sad') y += d > 0 ? 1 : 0;
      px(ctx, skinDark, cx + x, y, 1, 1);
    }
  });
}

function drawMouth(ctx, type) {
  const rows = MOUTHS[type] || MOUTHS.smile;
  const w = rows[0].length;
  blit(ctx, rows, 16 - Math.floor(w / 2), 20);
}

function drawExtras(ctx, extras, t) {
  for (const e of extras) {
    if (e === 'blush') {
      px(ctx, PAL.P, 3, 13, 3, 1);
      px(ctx, PAL.P, 26, 13, 3, 1);
    } else if (e === 'tears') {
      const k = Math.floor(t * 8) % 4;
      for (const cx of [6, 26]) for (let i = 0; i < 4; i++) px(ctx, PAL.B, cx, 11 + ((i * 2 + k) % 8) + 0, 1, 1);
      px(ctx, PAL.B, 5, 11, 2, 1); px(ctx, PAL.B, 25, 11, 2, 1);
    } else if (e === 'sweat') {
      const k = Math.floor(t * 3) % 3;
      px(ctx, PAL.B, 28, 1 + k, 1, 2); px(ctx, PAL.B, 27, 2 + k, 3, 1);
    } else if (e === 'drool') {
      const k = Math.floor(t * 2) % 3;
      px(ctx, PAL.B, 21, 23, 1, 2 + k);
    }
  }
}

export function drawFace(ctx, name, skinDark, { look = [0, 0], blink = false, t = 0 } = {}) {
  const ex = EXPRESSIONS[name] || EXPRESSIONS.neutral;
  ctx.clearRect(0, 0, FACE_W, FACE_H);
  let eyes = ex.eyes;
  if (blink && ['open', 'wide', 'sad', 'angry', 'sleepy', 'side'].includes(eyes)) eyes = 'closed';
  drawBrows(ctx, ex.brows, skinDark);
  drawEyes(ctx, eyes, skinDark, look, t);
  drawMouth(ctx, ex.mouth);
  drawExtras(ctx, ex.extras || [], t);
}
