// Small DOM helpers: element builder, speech bubble, panels, modals, toasts.
import { sfx } from './audio.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// The body font's digits are hard to tell apart (5/S, 2/8), so numbers inside
// sentences are shown in the blocky title font instead.
export function nums(text) {
  return String(text).split(/(\d+)/).filter(Boolean).map((part) => (/^\d+$/.test(part) ? h('span', { class: 'num' }, part) : part));
}

// Phones and tablets (a finger is the main pointer). Touch screens get an
// on-screen number pad and a layout tuned for small landscape screens.
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
if (IS_TOUCH) document.documentElement.classList.add('touch');

// Keyboard hints like " (Enter)" only make sense with a keyboard.
export const kb = (hint) => (IS_TOUCH ? '' : hint);

export function button(label, onClick, cls = '') {
  return h('button', { class: `btn ${cls}`, onclick: (e) => { sfx.click(); onClick(e); } }, label);
}

// ---------- speech bubble ----------
const bubbleEl = () => document.getElementById('bubble');
let bubble = { text: '', shown: 0, until: 0, full: '' };
export function say(text, seconds) {
  if (!text) return;
  bubble.full = text;
  bubble.shown = 0;
  bubble.until = performance.now() / 1000 + (seconds ?? Math.min(6, 1.8 + text.length * 0.05));
  bubble.babbled = false;
}
export function hush() { bubble.until = 0; }
export function updateBubble(screenPos, babble) {
  const el = bubbleEl();
  const now = performance.now() / 1000;
  if (now > bubble.until || !screenPos) { el.classList.add('hidden'); return; }
  if (!bubble.babbled) { bubble.babbled = true; babble?.(bubble.full); }
  bubble.shown = Math.min(bubble.full.length, bubble.shown + 1.5);
  el.textContent = bubble.full.slice(0, Math.ceil(bubble.shown));
  el.classList.remove('hidden');
  if (IS_TOUCH) { placeBubble(el, screenPos.x, screenPos.y); return; }
  const x = Math.max(170, Math.min(window.innerWidth - 170, screenPos.x));
  const y = Math.max(el.offsetHeight + 78, screenPos.y);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}

// Touch screens: the question card sits mid-screen, so when the speaker is left
// of it or behind it, keep the bubble in the space to the left of the card
// (wrapping narrower if needed) instead of on top of the puzzle.
export function placeBubble(el, x, y) {
  let lo = 8, hi = window.innerWidth - 8;
  const card = document.querySelector('#screen .g-box')?.getBoundingClientRect();
  if (card?.width && x < card.right) hi = card.left - 8;
  el.style.maxWidth = '';
  if (el.offsetWidth > hi - lo) el.style.maxWidth = (hi - lo) + 'px';
  const w = el.offsetWidth;
  el.style.left = Math.max(lo + w / 2, Math.min(hi - w / 2, x)) + 'px';
  el.style.top = Math.max(el.offsetHeight + 78, y) + 'px';
}

// ---------- toasts & floaters ----------
export function toast(text) {
  const el = h('div', { class: 'toast' }, text);
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), 2700);
}
export function floater(x, y, text, color) {
  const el = h('div', { class: 'floater', style: { left: x + 'px', top: y + 'px', color } }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), 1000);
}

// ---------- side panel ----------
let panelClose = null;
export function openPanel(title, body, { foot, onClose, extraHead } = {}) {
  const el = document.getElementById('panel');
  el.innerHTML = '';
  const head = h('div', { class: 'panel-head' }, h('h2', {}, title), extraHead, button('✕', () => closePanel(), 'small red'));
  el.append(head, h('div', { class: 'panel-body' }, body));
  if (foot) el.append(h('div', { class: 'panel-foot' }, foot));
  el.classList.remove('hidden');
  panelClose = onClose;
}
export function setPanelBody(body, foot) {
  const el = document.getElementById('panel');
  const b = el.querySelector('.panel-body');
  const top = b.scrollTop;
  b.innerHTML = '';
  b.append(body);
  b.scrollTop = top;
  let f = el.querySelector('.panel-foot');
  if (foot) {
    if (!f) { f = h('div', { class: 'panel-foot' }); el.append(f); }
    f.innerHTML = '';
    f.append(foot);
  } else if (f) f.remove();
}
export function closePanel() {
  const el = document.getElementById('panel');
  if (el.classList.contains('hidden')) return;
  el.classList.add('hidden');
  const fn = panelClose;
  panelClose = null;
  fn?.();
}
export function panelOpen() { return !document.getElementById('panel').classList.contains('hidden'); }

// ---------- modal ----------
export function modal(content, { onClose, dismissable = true, closeButton = true } = {}) {
  const root = document.getElementById('modal-root');
  const box = h('div', { class: 'modal' });
  const wrap = h('div', { class: 'modal-wrap' }, box);
  const close = () => { wrap.remove(); onClose?.(); };
  if (dismissable) wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
  if (closeButton && dismissable) box.append(button('✕', close, 'small red x'));
  box.append(content);
  root.append(wrap);
  return { close, box };
}
export function modalOpen() { return document.getElementById('modal-root').children.length > 0; }

export function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
