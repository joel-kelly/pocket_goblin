// Device sync: play the same goblin on more than one device.
// The save still lives in this browser first, so the game works offline.
// A tiny Cloudflare Worker (see sync-worker/) keeps a copy under a secret
// "goblin code" so other devices can pick it up.
import * as S from './state.js';
import { h, button, modal, toast } from './ui.js';

// Address of the deployed Worker, like 'https://pocket-goblin-sync.NAME.workers.dev'.
// Leave empty to turn sync off.
export const SYNC_URL = 'https://pocket-goblin-sync.joel-alexander-kelly.workers.dev';

const META_KEY = 'pocketGoblin.sync.v1';
const PUSH_DELAY = 15000; // batch edits: upload at most every 15 seconds
const POLL_EVERY = 60000; // look for changes from other devices while open
const TIMEOUT = 6000;
const CODE_RE = /^[A-Z]{2,8}(-[A-Z]{2,8}){3}-[0-9]{4}$/;

// Four words + four digits, about 41 bits of randomness. Easy to read out loud.
const WORDS = `SWAMP TOAD BURP SLIME MUD BOG MOSS FROG NEWT SLUG SNAIL WORM BEETLE MOTH GNAT TROLL OGRE
  GOBLIN IMP PIXIE GNOME SQUID CRAB EEL OYSTER CLAM PICKLE CHEESE ONION TURNIP RADISH BEAN PEA LEEK KALE
  SOCK BOOT HAT CAPE WAND BROOM CAULDRON POTION SPOON FORK CUP JAR BOTTLE BUCKET BARREL ROCK PEBBLE STUMP
  LOG TWIG ACORN CONE FERN REED LILY PUDDLE CAVE TUNNEL HILL MOON STAR COMET ROCKET CLOUD RAIN FOG STORM
  SNOW ICE FIRE SMOKE EMBER TOOTH NOSE EAR KNEE ELBOW TOE BELLY NOODLE WAFFLE MUFFIN BAGEL PRETZEL TACO
  PIZZA BACON JELLY GRAVY SOUP STEW CRUMB BISCUIT BANANA MANGO LEMON PLUM GRAPE MELON BERRY DONUT CANDY
  GUMMY HONEY SYRUP WIGGLE WOBBLE ZIGZAG SNORT SNEEZE HICCUP GIGGLE FART STINKY SOGGY SLIMY GOOEY LUMPY
  BUMPY FUZZY FLUFFY GRUMPY SNEAKY SPOOKY WONKY BOUNCY TINY GIANT PURPLE ORANGE GREEN YELLOW SILVER GOLDEN`
  .split(/\s+/).filter(Boolean);

// ---------- what this device knows about syncing ----------
// { code, rev (server version we last matched), dirty (edits not uploaded yet), editedAt, syncedAt }
let meta = readMeta();
function readMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; }
}
function writeMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { console.warn('Could not save sync info', e); }
}

export const enabled = () => !!SYNC_URL;
export const linkedCode = () => meta.code || null;
export const linkFor = (code) => `${location.origin}${location.pathname}#sync=${code}`;

export function newCode() {
  const r = crypto.getRandomValues(new Uint32Array(5));
  const words = [0, 1, 2, 3].map((i) => WORDS[r[i] % WORDS.length]);
  return [...words, String(r[4] % 10000).padStart(4, '0')].join('-');
}
// Accepts "swamp toad burp slime 4821", "SWAMP-TOAD-BURP-SLIME-4821", etc.
export function normalizeCode(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------- talking to the server ----------
async function api(code, method, body, { keepalive = false } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const payload = body ? JSON.stringify(body) : undefined;
    const res = await fetch(`${SYNC_URL}/save/${code}`, {
      method,
      body: payload,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      signal: ctrl.signal,
      cache: 'no-store',
      // Lets the upload finish after the tab closes (browsers cap this at 64 KB).
      keepalive: keepalive && payload && payload.length < 60000,
    });
    let json = null;
    try { json = await res.json(); } catch { /* empty body */ }
    return { status: res.status, ok: res.ok, body: json };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- keeping in step ----------
let started = false; // true once the game is running (then taking a new save means restarting it)
let pushTimer = null;
let busy = null;

function markEdited() {
  if (!SYNC_URL || !meta.code) return;
  meta.dirty = true;
  meta.editedAt = Date.now();
  writeMeta();
  schedulePush();
}
function schedulePush() {
  if (pushTimer) return;
  pushTimer = setTimeout(() => { pushTimer = null; syncNow(); }, PUSH_DELAY);
}

// Upload local edits, or pick up edits made on another device. Resolves true if it worked.
export function syncNow(opts) {
  if (!SYNC_URL || !meta.code) return Promise.resolve(false);
  if (busy) return busy;
  busy = run(opts)
    .then(() => true)
    .catch((e) => { console.warn('Sync failed (will try again later)', e); return false; })
    .finally(() => {
      busy = null;
      if (meta.dirty) schedulePush();
    });
  return busy;
}

async function run(opts) {
  if (meta.dirty) return push(meta.rev || 0, opts);
  const res = await api(meta.code, 'GET');
  if (res.status === 404) return push(0, opts); // server has nothing: give it ours
  if (!res.ok) throw new Error(`Server said ${res.status}`);
  return fromServer(res.body, opts);
}

async function push(baseRev, opts = {}) {
  const editedAt = meta.editedAt || Date.now();
  const res = await api(meta.code, 'PUT', { baseRev, savedAt: editedAt, data: S.get() }, opts);
  if (res.status === 200) {
    meta.rev = res.body.rev;
    meta.syncedAt = Date.now();
    if (meta.editedAt === editedAt) meta.dirty = false; // nothing new happened mid-upload
    writeMeta();
  } else if (res.status === 409) {
    await fromServer(res.body, opts); // another device saved first
  } else {
    throw new Error(`Server said ${res.status}`);
  }
}

async function fromServer(remote, opts) {
  if (!remote?.data) return push(0, opts);
  if (remote.rev === meta.rev) {
    meta.syncedAt = Date.now();
    writeMeta();
    if (meta.dirty) return push(meta.rev, opts);
    return;
  }
  // Another device saved since we last matched the server.
  if (!meta.dirty) return take(remote);
  // Both devices changed the goblin (one was probably offline). Ask which to keep.
  if (await askWhich(remote)) return take(remote);
  return push(remote.rev, opts);
}

// Replace this device's goblin with the server's copy.
function take(remote) {
  meta.rev = remote.rev;
  meta.dirty = false;
  meta.syncedAt = Date.now();
  writeMeta();
  S.adopt(remote.data);
  if (started) location.reload(); // restart the game with the new goblin
}

function summary(d, when) {
  return [
    h('b', {}, d.gobName || 'Gob'),
    h('div', {}, `${d.coins ?? 0} coins (${d.totalCoins ?? 0} earned all-time)`),
    h('div', {}, `${(d.history || []).length} math rounds played`),
    h('div', {}, `Last played ${ago(when)}`),
  ];
}
function askWhich(remote) {
  return new Promise((resolve) => {
    const pick = (keepRemote) => { m.close(); resolve(keepRemote); };
    const m = modal(h('div', {},
      h('h2', {}, 'Two different goblins!'),
      h('p', {}, 'The goblin was played on another device while this one was offline. Which one do you want to keep? The other one goes away.'),
      h('div', { class: 'sync-pick' },
        h('div', {}, h('label', {}, 'This device'), ...summary(S.get(), meta.editedAt), button('Keep this one', () => pick(false), 'slime')),
        h('div', {}, h('label', {}, 'Other device'), ...summary(remote.data, remote.savedAt), button('Keep this one', () => pick(true), 'blue'))),
    ), { dismissable: false });
  });
}

export function ago(t) {
  if (!t) return 'never';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---------- linking devices ----------
// Start syncing the goblin on this device under a brand-new code.
export async function turnOn() {
  for (let tries = 0; tries < 3; tries++) {
    const code = newCode();
    const now = Date.now();
    const res = await api(code, 'PUT', { baseRev: 0, savedAt: now, data: S.get() });
    if (res.status === 200) {
      meta = { code, rev: res.body.rev, dirty: false, editedAt: now, syncedAt: now };
      writeMeta();
      return code;
    }
    if (res.status !== 409) throw new Error(`Server said ${res.status}`);
  }
  throw new Error('Could not make a new code');
}

// Look up a goblin by code. Returns { code, remote } for useGoblin().
export async function find(text) {
  const code = normalizeCode(text);
  if (!CODE_RE.test(code)) throw new Error("That doesn't look like a goblin code");
  const res = await api(code, 'GET');
  if (res.status === 404) throw new Error('No goblin has that code');
  if (!res.ok) throw new Error(`Server said ${res.status}`);
  return { code, remote: res.body };
}
// Replace this device's goblin with the one found, and keep it in sync from now on.
export function useGoblin(found) {
  clearTimeout(pushTimer);
  pushTimer = null;
  meta = { code: found.code, rev: 0 };
  take(found.remote);
}

export function unlink() {
  clearTimeout(pushTimer);
  pushTimer = null;
  meta = {};
  writeMeta();
}

// Ask for a code, then switch to that goblin. Used by Grown-ups and first-time setup.
export async function enterCode({ askFirst = true } = {}) {
  const text = prompt('Type the goblin code from the other device (like SWAMP-TOAD-BURP-SLIME-1234):');
  if (!text) return;
  try {
    const found = await find(text);
    const name = found.remote.data.gobName || 'Gob';
    if (askFirst && !confirm(`Switch this device to ${name}? The goblin on this device (${S.get().gobName}) will be replaced. Download a backup first if you want to keep it.`)) return;
    useGoblin(found);
  } catch (e) {
    toast(e.name === 'AbortError' || e instanceof TypeError ? "Couldn't reach the sync server" : e.message);
  }
}

// ---------- startup ----------
// Runs before the game is built, so newer progress from other devices is loaded first.
export async function startup() {
  S.onEdit(markEdited);
  S.load();
  if (!SYNC_URL) return S.get();

  // Opened from a "#sync=CODE" link shared from another device?
  const m = location.hash.match(/sync=([A-Za-z0-9-]+)/);
  if (m) {
    history.replaceState(null, '', location.pathname + location.search);
    const code = normalizeCode(m[1]);
    if (code !== meta.code) {
      try {
        const found = await find(code);
        const name = found.remote.data.gobName || 'Gob';
        if (!S.get().onboarded || confirm(`Switch this device to ${name}? The goblin on this device (${S.get().gobName}) will be replaced. Download a backup first if you want to keep it.`)) {
          useGoblin(found);
          return S.get();
        }
      } catch (e) {
        setTimeout(() => toast(`Sync link didn't work: ${e.message}`), 500);
      }
    }
  }
  if (meta.code) await syncNow();
  return S.get();
}

// Runs once the game is up: background uploads and checks.
export function startSync() {
  started = true;
  if (!SYNC_URL) return;
  setInterval(() => { if (!document.hidden) syncNow(); }, POLL_EVERY);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (!meta.code) return;
    if (document.hidden) {
      hiddenAt = Date.now();
      if (meta.dirty) { clearTimeout(pushTimer); pushTimer = null; syncNow({ keepalive: true }); }
    } else if (Date.now() - hiddenAt > 10000) {
      // Back after a while: check for progress from another device before play resumes.
      const wait = h('div', { class: 'sync-wait' }, 'Checking on your goblin...');
      document.body.append(wait);
      syncNow().finally(() => wait.remove());
    }
  });
}

// ---------- Grown-ups section ----------
export function syncSection(rerender) {
  if (!SYNC_URL) {
    return h('p', {}, 'Device sync is off. To play the same goblin on more than one device, set up the sync server (see sync-worker/README.md).');
  }
  const fail = (e) => toast(e.name === 'AbortError' || e instanceof TypeError ? "Couldn't reach the sync server" : e.message);
  if (!meta.code) {
    return h('div', {},
      h('p', {}, 'Play the same goblin on more than one device, like a tablet and a laptop.'),
      h('div', { class: 'row', style: { justifyContent: 'flex-start', marginTop: 0 } },
        button('Turn on sync', async () => {
          try { await turnOn(); toast('Sync is on!'); rerender(); } catch (e) { fail(e); }
        }, 'small slime'),
        button('I have a code', () => enterCode(), 'small')));
  }
  const status = meta.dirty ? 'Changes waiting to upload' : `Last synced ${ago(meta.syncedAt)}`;
  return h('div', {},
    h('p', {}, 'On another device, open the link below, or choose "I have a code" in its Grown-ups corner and type:'),
    h('div', { class: 'sync-code' }, meta.code),
    h('p', { style: { fontSize: '15px' } }, status),
    h('div', { class: 'row', style: { justifyContent: 'flex-start', marginTop: 0 } },
      button('Copy link', async () => {
        const link = linkFor(meta.code);
        try { await navigator.clipboard.writeText(link); toast('Link copied!'); } catch { prompt('Copy this link:', link); }
      }, 'small blue'),
      button('Sync now', async () => { toast((await syncNow()) ? 'Synced!' : "Couldn't reach the sync server"); rerender(); }, 'small'),
      button('Stop syncing here', () => {
        if (confirm('Stop syncing on this device? It keeps its goblin, and other devices are not affected.')) { unlink(); rerender(); }
      }, 'small red')));
}
