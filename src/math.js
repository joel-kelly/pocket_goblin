// Times-table fact engine.
// Each fact family (like 7x8, which also covers 8x7, 56÷7, 56÷8) has a "box"
// from 0 (shaky) to 5 (lightning fast). Low boxes and slow facts come up more.
// A correct answer under the target time moves a fact up; mistakes move it down.
//
// Numbers start at 10 and grow one times table at a time (11s, 12s ... 15s)
// once most of the current facts are solid.

export const MIN = 2, START_MAX = 10, TOP_MAX = 15;
export const SOLID_BOX = 3;        // a fact is "solid" at this level or above
export const UNLOCK_SHARE = 0.7;   // share of solid facts needed to unlock the next table
const BOX_WEIGHT = [7, 5, 3, 2, 1.2, 0.6];

export function familyKey(a, b) { return a <= b ? `${a}x${b}` : `${b}x${a}`; }

export function allFamilies(max = START_MAX) {
  const out = [];
  for (let a = MIN; a <= max; a++) for (let b = a; b <= max; b++) out.push([a, b]);
  return out;
}

// Biggest number in play right now ("auto" grows with mastery; grown-ups can pin it).
export function currentMax(state) {
  const pinned = state.settings?.maxFactor;
  if (pinned && pinned !== 'auto') return Number(pinned);
  return Math.min(TOP_MAX, Math.max(START_MAX, state.mathLevel || START_MAX));
}

// How close she is to unlocking the next times table. Two goals must both be met:
// most facts overall are solid, AND most of the newest table is solid
// (so she can't skip past the 11s on the strength of her old facts).
export function unlockProgress(state) {
  const max = currentMax(state);
  const isSolid = ([a, b]) => factRecord(state.facts, a, b).box >= SOLID_BOX;
  const fams = allFamilies(max);
  const newest = fams.filter(([a, b]) => b === max);
  const solid = fams.filter(isSolid).length;
  const newestSolid = newest.filter(isSolid).length;
  const needed = Math.ceil(fams.length * UNLOCK_SHARE);
  const newestNeeded = Math.ceil(newest.length * UNLOCK_SHARE);
  const auto = !state.settings?.maxFactor || state.settings.maxFactor === 'auto';
  // The starting 2-10 range only needs the overall goal.
  const checkNewest = max > START_MAX;
  const ready = solid >= needed && (!checkNewest || newestSolid >= newestNeeded);
  // 0..1, limited by whichever goal is further away
  const pct = Math.min(1, solid / needed, checkNewest ? newestSolid / newestNeeded : 1);
  return {
    max, solid, needed, total: fams.length, newestSolid, newestNeeded, newestTotal: newest.length,
    lagging: checkNewest && newestSolid / newestNeeded < solid / needed ? 'newest' : 'all',
    pct, ready, next: max < TOP_MAX && auto ? max + 1 : null,
  };
}

// Call after a round. Returns the newly unlocked number, or null.
export function checkUnlock(state) {
  const p = unlockProgress(state);
  if (!p.next || !p.ready) return null;
  state.mathLevel = p.next;
  return p.next;
}

export function factRecord(facts, a, b) {
  const k = familyKey(a, b);
  return facts[k] || { box: 0, seen: 0, right: 0, avg: null };
}

export class FactPicker {
  constructor(facts, settings, max = START_MAX) {
    this.facts = facts;
    this.max = max;
    this.fast = settings.fastSeconds || 3;
    this.recent = [];
  }

  weight(a, b) {
    const r = factRecord(this.facts, a, b);
    let w = BOX_WEIGHT[r.box];
    if (r.avg != null && r.avg > this.fast) w *= 1 + Math.min(1.5, (r.avg - this.fast) / this.fast);
    if (a === 10 || b === 10) w *= 0.5; // tens are easy-peasy
    if (a === 2 && b === 2) w *= 0.5;
    if (this.recent.includes(familyKey(a, b))) w *= 0.02;
    return w;
  }

  next() {
    const fams = allFamilies(this.max);
    const ws = fams.map(([a, b]) => this.weight(a, b));
    let r = Math.random() * ws.reduce((s, w) => s + w, 0);
    let i = 0;
    while (r > ws[i] && i < ws.length - 1) { r -= ws[i]; i++; }
    let [a, b] = fams[i];
    if (Math.random() < 0.5) [a, b] = [b, a];
    this.recent.push(familyKey(a, b));
    if (this.recent.length > 5) this.recent.shift();

    const c = a * b;
    const form = Math.random();
    if (form < 0.55) return { a, b, kind: 'mul', text: `${a} × ${b}`, answer: c, fact: [a, b], full: `${a} × ${b} = ${c}` };
    if (form < 0.85) return { a, b, kind: 'div', text: `${c} ÷ ${a}`, answer: b, fact: [a, b], full: `${c} ÷ ${a} = ${b}` };
    return { a, b, kind: 'missing', text: `${a} × ? = ${c}`, answer: b, fact: [a, b], full: `${a} × ${b} = ${c}` };
  }

  record(problem, correct, seconds) {
    const [a, b] = problem.fact;
    const k = familyKey(a, b);
    const r = { ...factRecord(this.facts, a, b) };
    r.seen++;
    if (correct) {
      r.right++;
      r.avg = r.avg == null ? seconds : r.avg * 0.65 + seconds * 0.35;
      if (seconds <= this.fast) r.box = Math.min(5, r.box + 1);
    } else {
      r.avg = r.avg == null ? this.fast * 2 : r.avg * 0.65 + Math.max(seconds, this.fast * 2) * 0.35;
      r.box = Math.max(0, r.box - 2);
    }
    r.last = Date.now();
    this.facts[k] = r;
    return r;
  }
}

// Coins for one correct answer.
export function coinsFor(seconds, combo, fast) {
  let c = 1;
  if (seconds <= fast) c += 1;
  if (seconds <= fast / 2) c += 1;
  c += Math.floor(combo / 5);
  return c;
}

// Summary for the grown-up report.
export function masterySummary(facts, fast, max = START_MAX) {
  let mastered = 0, shaky = 0, unseen = 0;
  for (const [a, b] of allFamilies(max)) {
    const r = factRecord(facts, a, b);
    if (!r.seen) unseen++;
    else if (r.box >= 4 && r.avg != null && r.avg <= fast) mastered++;
    else if (r.box === 0 || (r.avg != null && r.avg > fast * 1.5)) shaky++;
  }
  return { mastered, shaky, unseen, total: allFamilies(max).length };
}
