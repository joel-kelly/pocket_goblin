// Anonymous play counts, so the game's maker can see which games and activities are popular.
// Each event is tiny, like { e: 'game_start', item: 'rocket' }, and goes to the sync Worker
// (see sync-worker/). No names, answers or goblin codes are sent: just a random ID for this browser.
// Grown-ups can turn it off. On localhost, events are only logged to the console.
import { SYNC_URL } from './sync.js';
import * as S from './state.js';

const ID_KEY = 'pocketGoblin.install.v1';
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

let id = null;
function installId() {
  if (id) return id;
  try {
    id = localStorage.getItem(ID_KEY);
    if (!id) {
      const r = crypto.getRandomValues(new Uint8Array(12));
      id = [...r].map((b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(ID_KEY, id);
    }
  } catch { id = null; }
  return id;
}

export const trackingOn = () => !!SYNC_URL && S.get()?.settings?.analytics !== false;

// e: what happened ('game_start'), item: which one ('rocket'), value: an optional number.
export function track(e, item = '', value) {
  try {
    if (!trackingOn()) return;
    const body = { id: installId(), e, item: String(item ?? '').slice(0, 40) };
    if (Number.isFinite(value)) body.v = value;
    if (LOCAL) { console.debug('[track]', e, body.item, body.v ?? ''); return; }
    if (!body.id) return;
    navigator.sendBeacon?.(`${SYNC_URL}/event`, JSON.stringify(body));
  } catch { /* never let counting break the game */ }
}
