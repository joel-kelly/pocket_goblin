// On-screen number pad for the math games on touch screens.
// Each tap acts like pressing that key, so the games don't need to know about it.
import { h, IS_TOUCH } from './ui.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Backspace', '0', 'Enter'];
const LABEL = { Backspace: 'DEL', Enter: 'OK' };

let el = null;
let shown = false;

// Grown-ups setting: 'auto' (touch screens only), 'on' or 'off'.
export function numpadWanted(settings) {
  const v = settings?.numpad || 'auto';
  return v === 'on' || (v === 'auto' && IS_TOUCH);
}

function build() {
  el = h('div', { id: 'numpad', class: 'numpad hidden' });
  for (const key of KEYS) {
    const b = h('button', { class: 'btn np-key' + (LABEL[key] ? ' np-' + key.toLowerCase() : '') }, LABEL[key] || key);
    // pointerdown (not click) so fast tapping never drops a digit
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.remove('press'); void b.offsetWidth; b.classList.add('press');
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    });
    el.append(b);
  }
  document.getElementById('ui').append(el);
}

export function showNumpad(on) {
  if (on === shown) return;
  if (!el) build();
  shown = on;
  el.classList.toggle('hidden', !on);
  document.documentElement.classList.toggle('numpad-on', on);
}
