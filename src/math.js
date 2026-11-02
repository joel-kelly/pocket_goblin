// Times-table fact engine.
// Each fact family (like 7x8, which also covers 8x7, 56÷7, 56÷8) has a "box"
// from 0 (shaky) to 5 (lightning fast). Low boxes and slow facts come up more.
// A correct answer under the target time moves a fact up; mistakes move it down.

export const MIN = 2, MAX = 10;
const BOX_WEIGHT = [7, 5, 3, 2, 1.2, 0.6];

export function familyKey(a, b) { return a <= b ? `${a}x${b}` : `${b}x${a}`; }

export function allFamilies() {
  const out = [];
  for (let a = MIN; a <= MAX; a++) for (let b = a; b <= MAX; b++) out.push([a, b]);
  return out;
}

export function factRecord(facts, a, b) {
  const k = familyKey(a, b);
  return facts[k] || { box: 0, seen: 0, right: 0, avg: null };
}

export class FactPicker {
  constructor(facts, settings) {
    this.facts = facts;
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
    const fams = allFamilies();
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
export function masterySummary(facts, fast) {
  let mastered = 0, shaky = 0, unseen = 0;
  for (const [a, b] of allFamilies()) {
    const r = factRecord(facts, a, b);
    if (!r.seen) unseen++;
    else if (r.box >= 4 && r.avg != null && r.avg <= fast) mastered++;
    else if (r.box === 0 || (r.avg != null && r.avg > fast * 1.5)) shaky++;
  }
  return { mastered, shaky, unseen, total: allFamilies().length };
}
