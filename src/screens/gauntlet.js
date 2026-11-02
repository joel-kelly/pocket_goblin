// Math Dash: 60 seconds of times tables. Type answers with the keyboard.
// Right answers = coins (faster = more). Wrong answers: the goblin is devastated,
// and you type the right answer to keep going (that's how it sticks!).
import { h, button, floater, modalOpen } from '../ui.js';
import { sfx } from '../audio.js';
import { FactPicker, coinsFor, masterySummary } from '../math.js';
import { LINES, pick } from '../lines.js';

const ROUND_SECONDS = 60;

export class GauntletScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
  }
  get state() { return this.game.state; }

  enter() {
    const { world, goblin } = this.game;
    world.setView('gauntlet');
    goblin.object.visible = true;
    goblin.lookAt(1, 0);
    this.phase = 'ready';
    this.build();
    this.showReady();
    this.game.line('mathStart', 3);
    goblin.act('cheer');
  }
  exit() {
    this.root.innerHTML = '';
    this.game.goblin.lookAt(null);
    clearInterval(this.cdTimer);
  }

  build() {
    this.fill = h('div', { class: 'fill', style: { width: '100%' } });
    this.tLabel = h('div', { class: 't' }, ROUND_SECONDS);
    this.coinPill = h('div', { class: 'pill', style: { background: 'var(--gold)' } }, '+0¢');
    this.card = h('div', { class: 'g-card' });
    this.comboPill = h('div', { class: 'pill combo' }, 'Combo 0');
    this.rightPill = h('div', { class: 'pill' }, '✓ 0');
    this.bestPill = h('div', { class: 'pill' }, `Best: ${this.state.best.score}`);
    this.meta = h('div', { class: 'g-meta' }, this.comboPill, this.rightPill, this.bestPill);
    this.root.innerHTML = '';
    this.root.append(h('div', { class: 'gauntlet' },
      h('div', { class: 'g-top' },
        h('div', { class: 'pill' }, '🧮 MATH DASH'),
        h('div', { class: 'g-timer' }, this.fill, this.tLabel),
        this.coinPill,
        button('Quit', () => this.quit(), 'small red')),
      h('div', { class: 'g-box' }, this.card, this.meta)));
  }

  setCard(...kids) {
    this.card.innerHTML = '';
    this.card.append(...kids);
  }

  showReady() {
    this.meta.classList.add('hidden');
    this.setCard(
      h('div', { class: 'g-prob', style: { fontSize: '30px' } }, 'MATH DASH!'),
      h('p', { style: { fontSize: '20px', lineHeight: 1.4 } }, `${ROUND_SECONDS} seconds. Type the answers as fast as you can.`, h('br'), 'Faster answers = more coins!'),
      h('p', { style: { fontSize: '18px' } }, `Your best: ${this.state.best.score} right`),
      h('div', { style: { marginTop: '18px' } }, button('START (Enter)', () => this.countdown(), 'gold big')));
  }

  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    this.phase = 'countdown';
    this.meta.classList.add('hidden');
    let n = 3;
    const show = () => this.setCard(h('div', { class: 'countdown' }, n > 0 ? n : 'GO!'));
    show(); sfx.tick();
    this.cdTimer = setInterval(() => {
      n--;
      show();
      if (n > 0) sfx.tick();
      else { sfx.go(); clearInterval(this.cdTimer); setTimeout(() => this.startRound(), 350); }
    }, 650);
  }

  startRound() {
    this.picker = new FactPicker(this.state.facts, this.state.settings);
    this.fast = this.state.settings.fastSeconds;
    this.timeLeft = ROUND_SECONDS;
    this.correct = 0; this.total = 0; this.combo = 0; this.bestCombo = 0; this.coins = 0;
    this.times = []; this.tricky = new Map();
    this.lastTick = ROUND_SECONDS;
    this.phase = 'play';
    this.meta.classList.remove('hidden');
    this.bestPill.textContent = `Best: ${this.state.best.score}`;
    this.updateMeta();
    this.next();
  }

  next() {
    this.problem = this.picker.next();
    this.input = '';
    this.fixing = false;
    this.t0 = performance.now();
    this.renderProblem();
  }

  renderProblem(hint = '', hintClass = '') {
    const p = this.problem;
    const ans = h('span', { class: 'g-ans' + (this.input ? '' : ' blink') }, this.input || '');
    let line;
    if (p.kind === 'missing') {
      const [l, r] = p.text.split('?');
      line = h('div', { class: 'g-prob' }, l, ans, r);
    } else {
      line = h('div', { class: 'g-prob' }, `${p.text} = `, ans);
    }
    const prob = this.fixing
      ? h('div', {}, h('div', { class: 'g-prob', style: { fontSize: '26px', color: '#b8203a', marginBottom: '12px' } }, p.full), line)
      : line;
    this.speedEl = h('div', { class: 'g-speed' }, '');
    this.setCard(prob, h('div', { class: 'g-hint ' + hintClass }, hint), this.speedEl);
  }

  updateMeta() {
    this.comboPill.textContent = `Combo ${this.combo}${this.combo >= 5 ? ' 🔥' : ''}`;
    this.comboPill.classList.toggle('hot', this.combo >= 5);
    this.rightPill.textContent = `✓ ${this.correct}`;
    this.coinPill.textContent = `+${this.coins}¢`;
  }

  onKey(e) {
    if (modalOpen()) return;
    if (this.phase === 'ready' || this.phase === 'results') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.countdown(); }
      if (e.key === 'Escape') this.game.go('home');
      return;
    }
    if (this.phase !== 'play') return;
    if (e.key === 'Escape') { this.end(); return; }
    if (/^[0-9]$/.test(e.key)) {
      if (this.input.length >= 3) return;
      this.input += e.key;
      sfx.tick();
      const target = String(this.problem.answer);
      if (this.input.length >= target.length) this.submit();
      else this.renderProblem(this.fixing ? `Type ${target} to keep going!` : '', this.fixing ? 'fix' : '');
    } else if (e.key === 'Backspace') {
      this.input = this.input.slice(0, -1);
      this.renderProblem(this.fixing ? `Type ${this.problem.answer} to keep going!` : '', this.fixing ? 'fix' : '');
    } else if (e.key === 'Enter' && this.input) {
      this.submit();
    }
  }

  submit() {
    const p = this.problem;
    const ok = Number(this.input) === p.answer;
    if (this.fixing) {
      if (ok) { sfx.correct(0); this.next(); }
      else { sfx.wrong(); this.input = ''; this.card.classList.remove('wrong'); void this.card.offsetWidth; this.card.classList.add('wrong'); this.renderProblem(`Type ${p.answer} to keep going!`, 'fix'); }
      return;
    }
    const secs = (performance.now() - this.t0) / 1000;
    this.total++;
    this.picker.record(p, ok, secs);
    if (ok) this.onRight(secs);
    else this.onWrong(secs);
  }

  onRight(secs) {
    const { goblin, world, S } = this.game;
    this.correct++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.times.push(secs);
    if (secs > this.fast * 1.6) this.tricky.set(this.problem.full, 'slow');
    const c = coinsFor(secs, this.combo, this.fast);
    this.coins += c;
    S.addCoins(c);
    sfx.correct(this.combo);
    const rect = this.card.getBoundingClientRect();
    floater(rect.left + rect.width / 2, rect.top + 10, `+${c}¢`);
    this.card.classList.remove('right'); void this.card.offsetWidth; this.card.classList.add('right');
    this.updateMeta();

    // Goblin cheers
    const milestone = { 5: 'combo5', 10: 'combo10', 15: 'combo15', 20: 'combo20' }[this.combo] || (this.combo > 20 && this.combo % 5 === 0 ? 'combo20' : null);
    if (milestone) {
      sfx.combo(this.combo);
      this.game.line(milestone, 2.5);
      if (this.combo >= 10) { goblin.act('dance'); world.fx.confetti(goblin.headTop(), 40); goblin.emote('ecstatic', 2.5); }
      else { goblin.act('cheer'); world.fx.stars(goblin.headTop(), 8); goblin.emote('ecstatic', 1.8); }
    } else {
      if (!goblin.busy || Math.random() < 0.5) goblin.act(Math.random() < 0.8 ? 'hop' : 'spin');
      goblin.emote(this.combo >= 5 ? 'ecstatic' : 'happy', 0.9);
      if (Math.random() < 0.25) this.game.say(pick(LINES.correct), 1.2);
    }
    if (this.combo >= 5) world.fx.flames(goblin.object.position.clone());

    this.next();
    const label = secs <= this.fast / 2 ? '⚡ LIGHTNING!' : secs <= this.fast ? 'Quick!' : '';
    this.speedEl.textContent = label;
  }

  onWrong(secs) {
    const { goblin } = this.game;
    const p = this.problem;
    this.tricky.set(p.full, 'wrong');
    this.combo = 0;
    this.updateMeta();
    sfx.wrong();
    const r = Math.random();
    if (r < 0.4) { goblin.act('faint'); goblin.emote('fainted', 2.2); }
    else if (r < 0.7) { goblin.act('tantrum'); goblin.emote('crying', 1.8); }
    else { goblin.act('slump'); goblin.emote('crying', 1.8); }
    this.game.line('wrong', 1.8);
    this.card.classList.remove('wrong'); void this.card.offsetWidth; this.card.classList.add('wrong');
    this.fixing = true;
    this.input = '';
    this.renderProblem(`Type ${p.answer} to keep going!`, 'fix');
  }

  update(dt) {
    if (this.phase !== 'play') return;
    if (!this.fixing) this.timeLeft -= dt;
    const t = Math.max(0, this.timeLeft);
    this.fill.style.width = (t / ROUND_SECONDS) * 100 + '%';
    this.fill.classList.toggle('hurry', t <= 10);
    this.tLabel.textContent = this.fixing ? `${Math.ceil(t)} (paused)` : Math.ceil(t);
    if (t <= 10 && Math.ceil(t) < this.lastTick) { this.lastTick = Math.ceil(t); sfx.tick(); }
    if (t <= 0) this.end();
  }

  quit() {
    if (this.phase === 'play') this.end();
    else this.game.go('home');
  }

  end() {
    const { goblin, world, S } = this.game;
    const s = this.state;
    this.phase = 'results';
    const avg = this.times.length ? this.times.reduce((a, b) => a + b, 0) / this.times.length : 0;
    const newBest = this.correct > s.best.score && this.correct > 0;
    let bonus = 0;
    if (newBest) { bonus = 10; S.addCoins(bonus); s.best.score = this.correct; }
    s.best.streak = Math.max(s.best.streak, this.bestCombo);
    s.history.push({ t: Date.now(), correct: this.correct, total: this.total, avg, streak: this.bestCombo });
    if (s.history.length > 200) s.history.shift();
    if (this.total > 0) S.addStat('fun', 12);
    S.save();

    this.meta.classList.add('hidden');
    this.fill.style.width = '0%';
    this.tLabel.textContent = 'TIME!';
    const acc = this.total ? Math.round((this.correct / this.total) * 100) : 0;
    const sum = masterySummary(s.facts, this.fast);
    const tricky = [...this.tricky.keys()].slice(0, 8);

    this.setCard(h('div', { class: 'results' },
      h('h2', { style: { fontFamily: 'var(--title)', fontSize: '18px', margin: '0 0 6px' } }, 'TIME!'),
      newBest ? h('div', { class: 'res-best' }, `NEW RECORD! +${bonus}¢ bonus`) : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Right answers', h('b', {}, this.correct)),
        h('div', {}, 'Accuracy', h('b', {}, acc + '%')),
        h('div', {}, 'Avg speed', h('b', {}, avg ? avg.toFixed(1) + 's' : '-')),
        h('div', {}, 'Best combo', h('b', {}, this.bestCombo)),
        h('div', { style: { gridColumn: '1 / -1', background: 'var(--gold)' } }, 'Coins earned', h('b', {}, `${this.coins + bonus}¢`))),
      tricky.length ? h('div', {}, h('div', { style: { fontWeight: 700, marginTop: '8px' } }, 'Tricky ones to remember:'), h('div', { class: 'tricky' }, ...tricky.map((t) => h('span', {}, t)))) : h('p', { style: { fontWeight: 700 } }, 'No tricky ones! Perfect round!'),
      h('p', { style: { fontSize: '15px', margin: '10px 0 0' } }, `Super-fast facts: ${sum.mastered} of ${sum.total}`),
      h('div', { class: 'row', style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px' } },
        button('Again! (Enter)', () => this.countdown(), 'gold'),
        button('Home (Esc)', () => this.game.go('home'), ''))));

    if (newBest) {
      sfx.fanfare();
      goblin.act('dance');
      goblin.emote('ecstatic', 3);
      world.fx.confetti(goblin.headTop(), 60);
      this.game.line('newBest', 3);
      setTimeout(() => { if (this.phase === 'results') this.game.fart(); }, 2600);
    } else {
      goblin.act('cheer');
      goblin.emote('happy', 2);
      this.game.line('timeUp', 2.5);
    }
  }
}
