// Shared "type the answer" card used by all the math games.
// - Digits type the answer; it checks automatically once enough digits are typed.
// - A wrong answer shows the right one, and you type it to keep going.
import { h } from './ui.js';
import { sfx } from './audio.js';

// Turn a FactPicker problem into something the card can show.
export function factProblem(p) {
  return {
    ...p,
    prompt(ans) {
      if (p.kind === 'missing') {
        const [l, r] = p.text.split('?');
        return h('div', { class: 'g-prob' }, l, ans, r);
      }
      return h('div', { class: 'g-prob' }, `${p.text} = `, ans);
    },
  };
}

export class QuizCard {
  /**
   * card: element to draw into
   * onAnswer(ok, seconds, problem): called on the first try of each problem
   * onFixed(problem): called after a wrong answer has been corrected
   */
  constructor(card, { onAnswer, onFixed }) {
    this.card = card;
    this.onAnswer = onAnswer;
    this.onFixed = onFixed;
    this.problem = null;
    this.input = '';
    this.fixing = false;
    this.locked = false;
  }

  show(problem) {
    this.problem = problem;
    this.input = '';
    this.fixing = false;
    this.locked = false;
    this.speedText = '';
    this.t0 = performance.now();
    this.render();
  }

  get elapsed() { return (performance.now() - this.t0) / 1000; }

  render() {
    const p = this.problem;
    if (!p) return;
    const ans = h('span', { class: 'g-ans' + (this.input ? '' : ' blink') }, this.input);
    const kids = [];
    if (this.fixing) kids.push(h('div', { class: 'g-prob g-fixline' }, p.full));
    kids.push(p.prompt(ans));
    kids.push(h('div', { class: 'g-hint' + (this.fixing ? ' fix' : '') }, this.fixing ? `Type ${p.answer} to keep going!` : (p.hint || '')));
    this.speedEl = h('div', { class: 'g-speed' }, this.fixing ? '' : this.speedText || '');
    kids.push(this.speedEl);
    this.card.replaceChildren(...kids);
  }

  setSpeed(text) { this.speedText = text; if (this.speedEl) this.speedEl.textContent = text; }

  flash(kind) {
    this.card.classList.remove('right', 'wrong');
    void this.card.offsetWidth;
    this.card.classList.add(kind);
  }

  // Returns true if the key was used.
  key(e) {
    if (!this.problem || this.locked) return false;
    if (/^[0-9]$/.test(e.key)) {
      if (this.input.length >= 3) return true;
      this.input += e.key;
      sfx.tick();
      this.render(); // show every digit, including the last one
      if (this.input.length >= String(this.problem.answer).length) this.submit();
      return true;
    }
    if (e.key === 'Backspace') { this.input = this.input.slice(0, -1); this.render(); return true; }
    if (e.key === 'Enter' && this.input) { this.submit(); return true; }
    return false;
  }

  submit() {
    const p = this.problem;
    const ok = Number(this.input) === p.answer;
    if (this.fixing) {
      if (ok) { sfx.correct(0); this.locked = true; this.onFixed?.(p); }
      else { sfx.wrong(); this.input = ''; this.flash('wrong'); this.render(); }
      return;
    }
    const secs = this.elapsed;
    if (ok) {
      this.flash('right');
      this.locked = true;
      this.onAnswer(true, secs, p);
    } else {
      this.flash('wrong');
      this.fixing = true;
      this.speedText = '';
      this.input = '';
      this.render();
      this.onAnswer(false, secs, p);
    }
  }
}
