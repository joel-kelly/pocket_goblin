// All sounds are made with the Web Audio API, no sound files needed.
// (Later: let the kid record her own farts. Science.)
let ctx = null;
let master = null;
let enabled = true;
let noiseBuf = null;
let unlocked = false; // browsers only allow sound after the first click/keypress

function ac() {
  if (!unlocked) return null;
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setSoundEnabled(on) { enabled = on; }
export function soundEnabled() { return enabled; }
export function unlockAudio() { unlocked = true; if (enabled) ac(); }

function env(g, t, a, peak, d, end = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + d);
}

function tone({ type = 'square', f0, f1 = f0, dur = 0.15, vol = 0.2, delay = 0, attack = 0.005 }) {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, attack, vol, dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise({ dur = 0.2, vol = 0.2, delay = 0, filter = 'lowpass', f0 = 800, f1 = f0, q = 1 }) {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = filter; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = c.createGain();
  env(g, t, 0.01, vol, dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

export const sfx = {
  fart(size = Math.random()) {
    const c = enabled && ac();
    if (!c) return;
    const t = c.currentTime;
    const dur = 0.35 + size * 0.9;
    const base = 70 + Math.random() * 60 - size * 25;
    // buzzy lips
    const o = c.createOscillator(); o.type = 'sawtooth';
    const lfo = c.createOscillator(); lfo.frequency.value = 18 + Math.random() * 22;
    const lfoG = c.createGain(); lfoG.gain.value = base * 0.45;
    lfo.connect(lfoG).connect(o.frequency);
    o.frequency.setValueAtTime(base * 1.3, t);
    o.frequency.exponentialRampToValueAtTime(base * 0.7, t + dur);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380 + Math.random() * 300; f.Q.value = 6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
    // sputter
    const steps = 4 + Math.floor(Math.random() * 6);
    for (let i = 1; i < steps; i++) {
      const tt = t + (dur * i) / steps;
      g.gain.setValueAtTime(0.5 * (0.35 + Math.random() * 0.65), tt);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(master);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    noise({ dur: dur * 0.9, vol: 0.12, f0: 500, f1: 150 });
    if (Math.random() < 0.3) tone({ type: 'square', f0: 600, f1: 900, dur: 0.08, vol: 0.05, delay: dur }); // squeak!
  },
  burp() {
    const c = enabled && ac();
    if (!c) return;
    const t = c.currentTime, dur = 0.5 + Math.random() * 0.4;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(110 + Math.random() * 30, t);
    o.frequency.linearRampToValueAtTime(70, t + dur);
    const lfo = c.createOscillator(); lfo.frequency.value = 30; const lg = c.createGain(); lg.gain.value = 25;
    lfo.connect(lg).connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 3;
    const g = c.createGain(); env(g, t, 0.04, 0.6, dur);
    o.connect(f).connect(g).connect(master);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  },
  chomp() {
    for (let i = 0; i < 4; i++) noise({ dur: 0.06, vol: 0.25, delay: i * 0.16, filter: 'bandpass', f0: 1500, f1: 600, q: 2 });
  },
  gulp() {
    tone({ type: 'sine', f0: 300, f1: 120, dur: 0.15, vol: 0.3 });
    tone({ type: 'sine', f0: 280, f1: 110, dur: 0.15, vol: 0.3, delay: 0.25 });
  },
  correct(combo = 0) {
    const step = Math.min(combo, 12);
    const base = 520 * Math.pow(2, step / 12);
    tone({ type: 'square', f0: base, dur: 0.08, vol: 0.1 });
    tone({ type: 'square', f0: base * 1.5, dur: 0.12, vol: 0.1, delay: 0.07 });
  },
  wrong() {
    tone({ type: 'sawtooth', f0: 330, f1: 300, dur: 0.22, vol: 0.12 });
    tone({ type: 'sawtooth', f0: 280, f1: 250, dur: 0.22, vol: 0.12, delay: 0.22 });
    tone({ type: 'sawtooth', f0: 240, f1: 160, dur: 0.5, vol: 0.12, delay: 0.44 });
  },
  combo(n) {
    [0, 4, 7, 12].forEach((s, i) => tone({ type: 'square', f0: 440 * Math.pow(2, (s + Math.min(n, 20) / 2) / 12), dur: 0.09, vol: 0.09, delay: i * 0.06 }));
  },
  coin() {
    tone({ type: 'square', f0: 988, dur: 0.07, vol: 0.08 });
    tone({ type: 'square', f0: 1319, dur: 0.2, vol: 0.08, delay: 0.07 });
  },
  buy() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.18, delay: i * 0.07 }));
  },
  click() { tone({ type: 'square', f0: 700, dur: 0.03, vol: 0.06 }); },
  place() { tone({ type: 'triangle', f0: 400, f1: 600, dur: 0.06, vol: 0.15 }); noise({ dur: 0.04, vol: 0.06, f0: 3000 }); },
  remove() { tone({ type: 'triangle', f0: 500, f1: 250, dur: 0.07, vol: 0.15 }); noise({ dur: 0.05, vol: 0.06, f0: 1500 }); },
  thud() { tone({ type: 'sine', f0: 120, f1: 40, dur: 0.3, vol: 0.5 }); noise({ dur: 0.15, vol: 0.2, f0: 400 }); },
  splash() { noise({ dur: 0.6, vol: 0.25, filter: 'bandpass', f0: 2500, f1: 600, q: 1 }); },
  whoosh() { noise({ dur: 0.5, vol: 0.2, filter: 'bandpass', f0: 300, f1: 2500, q: 2 }); },
  tick() { tone({ type: 'square', f0: 1200, dur: 0.02, vol: 0.04 }); },
  go() { tone({ type: 'square', f0: 880, dur: 0.3, vol: 0.12 }); },
  giggle() {
    for (let i = 0; i < 5; i++) tone({ type: 'square', f0: 700 + Math.random() * 300, f1: 500, dur: 0.06, vol: 0.07, delay: i * 0.08 });
  },
  fanfare() {
    [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.14, vol: 0.1, delay: [0, 0.12, 0.24, 0.36, 0.6, 0.72, 0.84, 1.0][i] }));
  },
  // Gibberish goblin talking, one blip per letter.
  babble(text, pitch = 1) {
    let d = 0;
    for (const ch of text.slice(0, 40)) {
      if (/[a-z]/i.test(ch)) {
        const v = (ch.toLowerCase().charCodeAt(0) - 97) / 26;
        tone({ type: 'square', f0: (180 + v * 220) * pitch, f1: (150 + v * 200) * pitch, dur: 0.045, vol: 0.05, delay: d });
      }
      d += 0.035;
    }
  },
};
