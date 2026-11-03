// Game state + saving (in the browser's localStorage).
const KEY = 'pocketGoblin.save.v1';

// How fast stats drop, in points per hour (stats go 0..100).
// Tuned so ~10-15 minutes of daily play keeps the goblin happy.
export const DECAY_PER_HOUR = { hunger: 5, thirst: 6, clean: 3, fun: 4 };
export const STAT_INFO = {
  hunger: { label: 'Tummy', icon: '🍗' },
  thirst: { label: 'Thirst', icon: '💧' },
  clean: { label: 'Clean', icon: '🧼' },
  fun: { label: 'Fun', icon: '🎉' },
};

export function newState() {
  return {
    version: 1,
    created: Date.now(),
    lastTick: Date.now(),
    onboarded: false,
    kidName: 'Human',
    gobName: 'Gob',
    skin: '#6cbf3c',
    coins: 30,
    totalCoins: 0,
    stats: { hunger: 70, thirst: 70, clean: 80, fun: 70 },
    pantry: { cheese: 1, swamp: 1 },
    owned: ['cone', 'deadplant'],
    equipped: {},
    decor: ['deadplant'], // item id in each den decor spot (null = empty)
    custom: [],
    facts: {},
    best: { score: 0, streak: 0 },
    rocketBest: 0,
    mathLevel: 10, // biggest times table unlocked so far
    cafeBest: 0,
    raceBest: 0, // fastest Swamp Sprint, in seconds
    raceWins: 0,
    squidBest: 0, // fastest Squid Smackdown K.O., in seconds
    squidWins: 0,
    history: [],
    vacation: null,
    postcards: [],
    settings: { sound: true, fastSeconds: 3, pixelScale: 3, maxFactor: 'auto' },
  };
}

let state = null;
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? fromSaved(JSON.parse(raw)) : newState();
  } catch (e) {
    console.warn('Could not load save', e);
    state = newState();
  }
  state.settings = { ...newState().settings, ...(state.settings || {}) };
  tick();
  return state;
}

// Fill in anything an older save is missing.
function fromSaved(data) {
  const s = { ...newState(), ...data };
  // Saves from before decor existed get the starter Dead Plant, already in the den.
  if (!data.decor && !s.owned.includes('deadplant')) s.owned.push('deadplant');
  return s;
}

export function get() { return state; }

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
  listeners.forEach((fn) => fn(state));
}
export function saveNow() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Save failed', e); }
}
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Apply time-based decay. Paused while on vacation.
export function tick(now = Date.now()) {
  const hours = Math.max(0, (now - state.lastTick) / 3600000);
  state.lastTick = now;
  if (state.vacation) return;
  for (const [k, rate] of Object.entries(DECAY_PER_HOUR)) {
    state.stats[k] = Math.max(0, state.stats[k] - rate * hours);
  }
}

export function addStat(k, amount) {
  state.stats[k] = Math.max(0, Math.min(100, state.stats[k] + amount));
  save();
}

export function addCoins(n) {
  state.coins += n;
  if (n > 0) state.totalCoins += n;
  save();
}

// What face should the goblin make right now?
export function moodFromStats() {
  const s = state.stats;
  const low = Object.entries(s).sort((a, b) => a[1] - b[1])[0];
  if (low[1] < 25) {
    return { hunger: 'hungry', thirst: 'thirsty', clean: 'stinky', fun: 'bored' }[low[0]];
  }
  const avg = (s.hunger + s.thirst + s.clean + s.fun) / 4;
  if (avg > 75) return 'happy';
  if (avg < 40) return 'sad';
  return 'neutral';
}
export function neediest() {
  const s = state.stats;
  const low = Object.entries(s).sort((a, b) => a[1] - b[1])[0];
  return low[1] < 25 ? low[0] : null;
}

export function exportSave() { return JSON.stringify(state, null, 1); }
export function importSave(json) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !data.stats) throw new Error('Not a Pocket Goblin save file');
  state = fromSaved(data);
  saveNow();
  return state;
}
export function resetSave() {
  state = newState();
  saveNow();
  return state;
}
