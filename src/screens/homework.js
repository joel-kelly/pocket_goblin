// Goblin's Homework: the goblin did its times tables "all by itself" and some
// answers are wrong. Check each line: ✓ if it's right, ✗ if it's wrong, then
// write the right answer. No timer.
//
// Fact levels: only answers she works out herself count (fixing a wrong line),
// plus any time she gets fooled. Tapping ✓ on a right line is just recognizing
// an answer, which is easier than remembering it, so it doesn't move levels.
import { h, button, floater, modalOpen, kb, nums } from '../ui.js';
import { sfx } from '../audio.js';
import { currentMax, FactPicker } from '../math.js';
import { LINES, pick } from '../lines.js';
import { afterRound } from './games.js';
import { track } from '../track.js';

const LINES_PER_PAGE = 6;
const PERFECT_BONUS = 5;

// A believable wrong answer: the kinds of slips kids (and goblins) make.
export function goblinMistake(p) {
  const c = p.a * p.b;
  let cands;
  if (p.kind === 'mul') {
    // one times table too many or too few (counted one extra), off by a little, digits flipped
    cands = [c + p.a, c - p.a, c + p.b, c - p.b, c + p.a, c - p.b, c + 1, c - 1, c + 2, c - 2];
    if (c >= 20) cands.push(c + 10, c - 10);
    const flip = Number(String(c).split('').reverse().join(''));
    if (c >= 12 && c % 10 !== 0) cands.push(flip, flip);
  } else {
    // ÷ and "missing number" problems: the answer is a single times table step off
    const b = p.answer;
    cands = [b + 1, b - 1, b + 1, b - 1, b + 2, b - 2];
    if (p.a !== b) cands.push(p.a); // mixed up which number goes where
  }
  cands = cands.filter((v) => v > 0 && v !== p.answer);
  return cands[Math.floor(Math.random() * cands.length)];
}

// Which lines the goblin got wrong: usually 2 to 4, sometimes just 1 or as many as 5,
// so there's no pattern to guess.
function pickWrongLines(n) {
  const r = Math.random();
  const count = r < 0.1 ? 1 : r < 0.9 ? 2 + Math.floor(Math.random() * 3) : 5;
  const idx = [...Array(n).keys()].sort(() => Math.random() - 0.5);
  return new Set(idx.slice(0, count));
}

export class HomeworkScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    window.addEventListener('resize', () => this.fit());
    document.fonts?.ready.then(() => this.fit());
  }
  get state() { return this.game.state; }

  // The number pad stays up for the whole page (not just while writing a fix),
  // so the worksheet doesn't jump sideways every time it appears.
  wantsNumpad() { return this.phase === 'check' || this.phase === 'fix' || this.phase === 'between'; }

  enter() {
    const { world, goblin } = this.game;
    world.setView('gauntlet');
    goblin.object.visible = true;
    goblin.lookAt(1, 0);
    this.phase = 'ready';
    this.build();
    this.showReady();
    this.game.line('hwStart', 4);
    goblin.act('wave');
    goblin.emote('smug', 3);
  }
  exit() {
    this.root.innerHTML = '';
    this.game.goblin.lookAt(null);
    clearTimeout(this.timer);
    this.phase = 'gone';
  }

  build() {
    this.coinPill = h('div', { class: 'pill', style: { background: 'var(--gold)' } }, '+0¢');
    this.linePill = h('div', { class: 'pill' }, '');
    this.card = h('div', { class: 'g-card hw-card' });
    this.root.innerHTML = '';
    this.root.append(h('div', { class: 'gauntlet' },
      h('div', { class: 'g-top' },
        h('div', { class: 'pill' }, '✏️ HOMEWORK'),
        this.linePill,
        h('div', { style: { flex: 1 } }),
        this.coinPill,
        button('Quit', () => this.quit(), 'small red')),
      h('div', { class: 'g-box hw-box' }, this.card)));
    this.linePill.classList.add('hidden');
  }

  setCard(...kids) { this.card.replaceChildren(...kids); }

  showReady() {
    const s = this.state;
    this.setCard(
      h('div', { class: 'g-prob', style: { fontSize: '26px' } }, 'HOMEWORK!'),
      h('p', { style: { fontSize: '20px', lineHeight: 1.4 } },
        `${s.gobName} did the times tables homework all alone. Uh oh.`, h('br'),
        'Check every answer! Tap ✓ if it\'s right. Tap ✗ if it\'s wrong, then write the right answer.'),
      h('p', { style: { fontSize: '18px' } }, nums(`No timer. Take your time! Gold stars: ${s.homeworkStars || 0} ⭐`)),
      h('div', { style: { marginTop: '18px' } }, button('START' + kb(' (Enter)'), () => this.startPage(), 'gold big')));
  }

  startPage() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    track('game_start', 'homework');
    sfx.go();
    const picker = new FactPicker(this.state.facts, this.state.settings, currentMax(this.state));
    this.picker = picker;
    this.fast = this.state.settings.fastSeconds;
    const wrong = pickWrongLines(LINES_PER_PAGE);
    this.lines = [];
    for (let i = 0; i < LINES_PER_PAGE; i++) {
      const p = picker.next();
      const isWrong = wrong.has(i);
      // result: 'good' (judged right the first time), 'miss' (fooled, or a bad fix) or 'doubt'
      // (said a right answer was wrong, then wrote the same thing)
      this.lines.push({ p, wrong: isWrong, written: isWrong ? goblinMistake(p) : p.answer, result: null, fixed: null });
    }
    this.i = 0;
    this.coins = 0;
    this.times = [];
    this.streak = 0;
    this.bestStreak = 0;
    this.linePill.classList.remove('hidden');
    this.card.classList.remove('done');
    this.coinPill.textContent = '+0¢';
    this.showLine();
  }

  get line() { return this.lines[this.i]; }

  showLine() {
    this.phase = 'check';
    this.input = '';
    this.t0 = performance.now();
    this.linePill.textContent = `Line ${this.i + 1} / ${LINES_PER_PAGE}`;
    this.render();
  }

  // ---------- drawing ----------

  // One worksheet line, like "3.  7 × 8 = 54  ✗ 56"
  lineEl(l, i) {
    const active = i === this.i && this.phase !== 'results';
    const typing = active && this.phase === 'fix';
    // Cross out the goblin's answer while she writes a fix, and once a wrong line is corrected.
    const struck = typing || (l.result && l.wrong);
    const ans = [h('span', { class: 'hw-gob' + (struck ? ' struck' : '') }, l.written)];
    if (typing) ans.push(h('span', { class: 'hw-input' + (this.input ? '' : ' blink') }, this.input));
    else if (l.result && l.wrong) ans.push(h('span', { class: 'hw-red' }, l.p.answer));
    const { a, b, kind } = l.p;
    const c = a * b;
    const expr = kind === 'missing' ? [`${a} × `, ...ans, ` = ${c}`]
      : kind === 'div' ? [`${c} ÷ ${a} = `, ...ans]
      : [`${a} × ${b} = `, ...ans];
    const mark = !l.result || typing ? '' : l.wrong ? '✗' : '✓';
    return h('div', { class: 'hw-line' + (active ? ' on' : '') + (i > this.i && this.phase !== 'results' ? ' later' : '') },
      h('span', { class: 'hw-n' }, `${i + 1}.`),
      h('span', { class: 'hw-expr' }, ...expr),
      h('span', { class: 'hw-mark' }, mark, l.result === 'good' ? h('span', { class: 'hw-star' }, '⭐') : null));
  }

  render(note = '', noteCls = '') {
    const s = this.state;
    const sheet = h('div', { class: 'hw-sheet' },
      h('div', { class: 'hw-head' }, h('span', {}, `${s.gobName}'s homework`), h('span', {}, 'Times tables')),
      ...this.lines.map((l, i) => this.lineEl(l, i)));
    this.sheet = sheet;
    let ctl;
    if (this.phase === 'check') {
      ctl = h('div', { class: 'hw-ctl' },
        h('div', { class: 'g-hint' }, `Is ${s.gobName}'s answer right?`),
        h('div', { class: 'hw-btns' },
          button('✓ Right' + kb(' (Y)'), () => this.judge(true), 'slime big'),
          button('✗ Wrong' + kb(' (N)'), () => this.judge(false), 'red big')));
    } else if (this.phase === 'fix') {
      const l = this.line;
      ctl = h('div', { class: 'hw-ctl' },
        h('div', { class: 'g-hint' + (this.forced ? ' fix' : '') },
          nums(this.forced ? `It's ${l.p.answer}! Type ${l.p.answer} to fix it.` : 'What should it be? Type it!')),
        h('div', { class: 'hw-btns' }));
    } else {
      ctl = h('div', { class: 'hw-ctl' }, h('div', { class: 'g-hint ' + noteCls }, nums(note)), h('div', { class: 'hw-btns' }));
    }
    this.setCard(sheet, ctl);
    this.fit();
  }

  // Lines never wrap. On narrow screens, shrink the whole sheet's writing to fit the longest line.
  fit() {
    const sheet = this.sheet;
    if (!sheet?.isConnected) return;
    sheet.style.removeProperty('font-size');
    let over = 1;
    for (const el of sheet.querySelectorAll('.hw-line')) over = Math.max(over, el.scrollWidth / el.clientWidth);
    if (over > 1) sheet.style.fontSize = `${Math.floor((parseFloat(getComputedStyle(sheet).fontSize) / over) * 0.97)}px`;
  }

  flash(kind) {
    this.card.classList.remove('right', 'wrong');
    void this.card.offsetWidth;
    this.card.classList.add(kind);
  }

  // ---------- playing ----------

  onKey(e) {
    if (modalOpen()) return;
    if (this.phase === 'ready' || this.phase === 'results') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.startPage(); }
      if (e.key === 'Escape') this.game.go('home');
      return;
    }
    if (e.key === 'Escape') { this.quit(); return; }
    const k = e.key.toLowerCase();
    if (this.phase === 'check') {
      if (k === 'y' || k === 'arrowleft') this.judge(true);
      else if (k === 'n' || k === 'x' || k === 'arrowright') this.judge(false);
      // Just typing a number means "that's wrong, it should be...".
      else if (/^[0-9]$/.test(k)) { this.judge(false, true); this.type(k); }
      return;
    }
    if (this.phase !== 'fix') return;
    if (/^[0-9]$/.test(k)) this.type(k);
    else if (e.key === 'Backspace') { this.input = this.input.slice(0, -1); this.render(); }
    else if (e.key === 'Enter' && this.input) this.submitFix();
  }

  type(d) {
    if (this.input.length >= 3) return;
    this.input += d;
    sfx.tick();
    this.render();
    if (this.input.length >= String(this.line.p.answer).length) this.submitFix();
  }

  // ok: she says the goblin's answer is right. typed: she started typing a fix instead of tapping ✗.
  judge(ok, typed = false) {
    if (this.phase !== 'check') return;
    const l = this.line;
    this.decided = typed ? this.t0 : performance.now();
    if (ok) {
      if (!l.wrong) { this.finish('good'); this.onConfirmed(); return; }
      // Fooled by a wrong answer: that fact is shaky. Show the right answer and copy it.
      this.picker.record(l.p, false, this.fast * 2);
      l.result = 'miss';
      this.streak = 0;
      this.forced = true;
      this.phase = 'fix';
      sfx.wrong();
      this.flash('wrong');
      this.input = '';
      this.render();
      this.game.line('hwMissed', 2.5);
      this.game.goblin.act('scratch');
      this.game.goblin.emote('nervous', 2.5);
      return;
    }
    if (!typed) sfx.click();
    this.forced = false;
    this.phase = 'fix';
    this.input = '';
    this.render();
  }

  submitFix() {
    const l = this.line;
    const val = Number(this.input);
    const right = val === l.p.answer;
    if (this.forced) {
      // Copying the right answer after a mistake.
      if (right) { sfx.correct(0); this.flash('right'); this.finish(l.result || 'miss'); this.nextSoon('Fixed! On to the next one.'); }
      else { sfx.wrong(); this.flash('wrong'); this.input = ''; this.render(); }
      return;
    }
    const secs = (performance.now() - this.decided) / 1000;
    if (l.wrong && right) {
      // Caught the goblin's mistake and wrote the right answer.
      this.picker.record(l.p, true, secs);
      this.finish('good');
      this.onCaught(secs);
    } else if (!l.wrong && right) {
      // Said it was wrong, then wrote the same answer the goblin did.
      this.finish('doubt');
      this.onDoubted();
    } else {
      // Wrote a wrong answer: show the right one and copy it.
      this.picker.record(l.p, false, secs);
      l.result = 'miss';
      this.streak = 0;
      this.forced = true;
      this.input = '';
      sfx.wrong();
      this.flash('wrong');
      this.render();
      this.game.line(l.wrong ? 'hwBadFix' : 'hwDoubtedWrong', 2.5);
      this.game.goblin.act(l.wrong ? 'slump' : 'flex');
      this.game.goblin.emote(l.wrong ? 'dizzy' : 'smug', 2);
    }
  }

  // Mark the current line done.
  finish(result) {
    const l = this.line;
    l.result = result;
    if (result === 'good') {
      this.times.push((performance.now() - this.t0) / 1000);
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    } else this.streak = 0;
  }

  pay(c) {
    this.coins += c;
    this.game.S.addCoins(c);
    this.coinPill.textContent = `+${this.coins}¢`;
    const rect = this.card.getBoundingClientRect();
    floater(rect.left + rect.width / 2, rect.top + 10, `+${c}¢`);
  }

  onConfirmed() {
    const { goblin } = this.game;
    const c = 2 + ((performance.now() - this.t0) / 1000 <= this.fast ? 1 : 0);
    this.pay(c);
    sfx.correct(this.streak);
    this.flash('right');
    goblin.act(Math.random() < 0.5 ? 'nod' : 'hop');
    goblin.emote('smug', 1.6);
    if (Math.random() < 0.5) this.game.line('hwRight', 1.8);
    this.nextSoon('Right! ✓');
  }

  onCaught(secs) {
    const { goblin, world } = this.game;
    const c = 3 + (secs <= this.fast ? 1 : 0);
    this.pay(c);
    sfx.correct(this.streak);
    this.flash('right');
    const r = Math.random();
    if (r < 0.35) { goblin.act('faint'); goblin.emote('fainted', 2); }
    else if (r < 0.7) { goblin.act('tantrum'); goblin.emote('shocked', 2); }
    else { goblin.act('slump'); goblin.emote('crying', 1.8); }
    world.fx.stars(goblin.headTop(), 6);
    this.game.line('hwCaught', 2.6);
    this.nextSoon(secs <= this.fast ? 'Great catch! ⚡' : 'Great catch!');
  }

  onDoubted() {
    const { goblin } = this.game;
    sfx.giggle();
    goblin.act('flex');
    goblin.emote('smug', 2.2);
    this.game.line('hwDoubted', 2.6);
    this.nextSoon(`${this.state.gobName} had it right! No coins for that one.`);
  }

  nextSoon(note) {
    this.phase = 'between';
    this.render(note);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.phase !== 'between') return;
      this.i++;
      if (this.i >= LINES_PER_PAGE) this.end();
      else this.showLine();
    }, 1300);
  }

  quit() {
    if (this.wantsNumpad() && this.lines.some((l) => l.result)) {
      track('game_end', 'homework', this.lines.filter((l) => l.result === 'good').length);
      this.game.S.save();
    }
    this.game.go('home');
  }

  end() {
    const { goblin, world, S } = this.game;
    const s = this.state;
    this.phase = 'results';
    this.linePill.classList.add('hidden');
    const good = this.lines.filter((l) => l.result === 'good').length;
    const wrongLines = this.lines.filter((l) => l.wrong);
    const caught = wrongLines.filter((l) => l.result === 'good').length;
    const rightLines = this.lines.filter((l) => !l.wrong);
    const okd = rightLines.filter((l) => l.result === 'good').length;
    const perfect = good === LINES_PER_PAGE;
    if (perfect) {
      s.homeworkStars = (s.homeworkStars || 0) + 1;
      S.addCoins(PERFECT_BONUS);
    }
    const avg = this.times.length ? this.times.reduce((a, b) => a + b, 0) / this.times.length : 0;
    s.history.push({ t: Date.now(), game: 'homework', correct: good, total: LINES_PER_PAGE, avg, streak: this.bestStreak });
    if (s.history.length > 200) s.history.shift();
    track('game_end', 'homework', good);
    S.addStat('fun', 10);
    S.save();
    afterRound(this.game);

    const tricky = this.lines.filter((l) => l.result !== 'good' && l.result !== 'doubt').map((l) => l.p.full);
    const total = this.coins + (perfect ? PERFECT_BONUS : 0);
    const results = h('div', { class: 'results' },
      h('h2', { style: { fontFamily: 'var(--title)', fontSize: '16px', margin: '0 0 6px' } }, 'All checked!'),
      perfect ? h('div', { class: 'res-best' }, `PERFECT! ⭐ Gold star! +${PERFECT_BONUS}¢`) : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Mistakes caught', h('b', {}, `${caught} / ${wrongLines.length}`)),
        h('div', {}, 'Right ones spotted', h('b', {}, `${okd} / ${rightLines.length}`)),
        h('div', {}, 'Gold stars', h('b', {}, `${s.homeworkStars || 0} ⭐`)),
        h('div', { style: { background: 'var(--gold)' } }, 'Coins earned', h('b', {}, `${total}¢`))),
      tricky.length ? h('div', {}, h('div', { style: { fontWeight: 700, marginTop: '8px' } }, 'Tricky ones to remember:'), h('div', { class: 'tricky' }, ...tricky.map((t) => h('span', {}, t)))) : null,
      h('div', { class: 'row', style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px' } },
        button('Next page!' + kb(' (Enter)'), () => this.startPage(), 'gold'),
        button('Home' + kb(' (Esc)'), () => this.game.go('home'), '')));
    this.render();
    this.card.append(results);
    this.card.classList.add('done');
    this.card.querySelector('.hw-ctl')?.remove();
    this.fit();

    if (perfect) {
      sfx.fanfare();
      goblin.act('dance');
      goblin.emote('ecstatic', 3);
      world.fx.confetti(goblin.headTop(), 60);
      this.game.line('hwPerfect', 3);
      setTimeout(() => { if (this.phase === 'results') this.game.fart(); }, 2600);
    } else {
      goblin.act('cheer');
      goblin.emote('happy', 2);
      this.game.line('hwDone', 3);
    }
  }
}
