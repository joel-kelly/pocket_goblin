// Pocket Goblin save sync: a tiny Cloudflare Worker that stores one save per
// goblin code in a D1 (SQLite) database.
//
//   GET /save/:code   -> { rev, savedAt, data }  or 404
//   PUT /save/:code   body { baseRev, savedAt, data }
//                     -> { rev } on success
//                     -> 409 { rev, savedAt, data } if another device saved first
//   POST /event       body { id, e, item?, v? }  anonymous play count -> 204
//   GET /stats?key=   summary of the play counts (only if STATS_KEY is set)
//
// The code is the only "password", so it's long and random (about 41 bits).
// The database stores a hash of it, never the code itself.

const CODE_RE = /^[A-Z]{2,8}(-[A-Z]{2,8}){3}-[0-9]{4}$/;
const MAX_BYTES = 1_500_000; // D1 rows top out at 2 MB

// Play counts: who (a random ID per browser, never a name), what, which one, and an optional number.
const EVENT_RE = /^[a-z_]{1,32}$/;
const ITEM_RE = /^[A-Za-z0-9_.:-]{0,40}$/;
const INSTALL_RE = /^[a-f0-9]{8,64}$/;

let tableReady = false;
async function ensureTable(db) {
  if (tableReady) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS saves (id TEXT PRIMARY KEY, rev INTEGER NOT NULL, saved_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, data TEXT NOT NULL)'),
    db.prepare("CREATE TABLE IF NOT EXISTS events (t INTEGER NOT NULL, install TEXT NOT NULL, event TEXT NOT NULL, item TEXT NOT NULL DEFAULT '', value REAL)"),
    db.prepare('CREATE INDEX IF NOT EXISTS events_by_event ON events (event, item)'),
    db.prepare('CREATE INDEX IF NOT EXISTS events_by_time ON events (t)'),
  ]);
  tableReady = true;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function corsHeaders(req, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get('Origin');
  const h = { Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, PUT, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

// The stored save is already JSON text, so splice it in rather than re-parsing it.
function rowBody(row) {
  return `{"rev":${row.rev},"savedAt":${row.saved_at},"data":${row.data}}`;
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    const reply = (body, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    if (url.pathname === '/event' && req.method === 'POST') return logEvent(req, env);
    if (url.pathname === '/stats' && req.method === 'GET') return stats(url, env);

    const m = url.pathname.match(/^\/save\/([A-Z0-9-]+)$/);
    if (!m || !CODE_RE.test(m[1])) return reply({ error: 'not found' }, 404);

    const db = env.DB;
    await ensureTable(db);
    const id = await sha256(m[1]);
    const current = () => db.prepare('SELECT rev, saved_at, data FROM saves WHERE id = ?').bind(id).first();

    if (req.method === 'GET') {
      const row = await current();
      return row ? reply(rowBody(row)) : reply({ error: 'not found' }, 404);
    }

    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > MAX_BYTES) return reply({ error: 'save too big' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return reply({ error: 'bad json' }, 400); }
      const { baseRev, savedAt, data } = body || {};
      if (!Number.isInteger(baseRev) || baseRev < 0 || !Number.isFinite(savedAt) || !data || typeof data !== 'object' || !data.stats) {
        return reply({ error: 'not a Pocket Goblin save' }, 400);
      }
      const json = JSON.stringify(data);
      const now = Date.now();
      // Only write if nobody else saved since this device last synced.
      const res = baseRev === 0
        ? await db.prepare('INSERT INTO saves (id, rev, saved_at, updated_at, data) VALUES (?, 1, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
          .bind(id, savedAt, now, json).run()
        : await db.prepare('UPDATE saves SET rev = rev + 1, saved_at = ?, updated_at = ?, data = ? WHERE id = ? AND rev = ?')
          .bind(savedAt, now, json, id, baseRev).run();
      if (res.meta.changes === 1) return reply({ rev: baseRev + 1 });
      const row = await current();
      return reply(row ? rowBody(row) : { rev: 0, savedAt: 0, data: null }, 409);
    }

    return reply({ error: 'method not allowed' }, 405);
  },
};

// Store one play count. Sent with navigator.sendBeacon, so nobody reads the reply.
async function logEvent(req, env) {
  const done = (status) => new Response(null, { status });
  const origin = req.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  if (origin && !allowed.includes(origin)) return done(403);
  const text = await req.text();
  if (text.length > 1000) return done(413);
  let b;
  try { b = JSON.parse(text); } catch { return done(400); }
  const item = b?.item ?? '';
  const value = b?.v ?? null;
  if (!b || !INSTALL_RE.test(b.id) || !EVENT_RE.test(b.e) || typeof item !== 'string' || !ITEM_RE.test(item)
    || (value !== null && !Number.isFinite(value))) return done(400);
  await ensureTable(env.DB);
  await env.DB.prepare('INSERT INTO events (t, install, event, item, value) VALUES (?, ?, ?, ?, ?)')
    .bind(Date.now(), b.id, b.e, item, value).run();
  return done(204);
}

// A quick look at the play counts: open /stats?key=YOUR_STATS_KEY in a browser.
// Optional ?days=30 limits it to recent activity.
async function stats(url, env) {
  const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  if (!env.STATS_KEY || url.searchParams.get('key') !== env.STATS_KEY) return json({ error: 'not found' }, 404);
  const db = env.DB;
  await ensureTable(db);
  const days = Number(url.searchParams.get('days')) || 0;
  const since = days > 0 ? Date.now() - days * 86400000 : 0;
  const week = Date.now() - 7 * 86400000;
  const [totals, counts, daily] = await db.batch([
    db.prepare(`SELECT COUNT(DISTINCT install) AS devices,
        COUNT(DISTINCT CASE WHEN t >= ? THEN install END) AS devicesLast7Days,
        SUM(event = 'goblin_created') AS goblinsCreated,
        SUM(event = 'game_end') AS mathRoundsFinished
      FROM events WHERE t >= ?`).bind(week, since),
    db.prepare(`SELECT event, item, COUNT(*) AS times, COUNT(DISTINCT install) AS devices, ROUND(AVG(value), 1) AS avgValue
      FROM events WHERE t >= ? GROUP BY event, item ORDER BY event, times DESC`).bind(since),
    db.prepare(`SELECT date(t / 1000, 'unixepoch') AS day, COUNT(DISTINCT install) AS devices, COUNT(*) AS events
      FROM events WHERE t >= ? GROUP BY day ORDER BY day DESC LIMIT 30`).bind(since),
  ]);
  // Group the counts by event: { game_start: [{ item: 'rocket', times, devices }, ...], ... }
  const byEvent = {};
  for (const r of counts.results) {
    (byEvent[r.event] ||= []).push({ item: r.item, times: r.times, devices: r.devices, ...(r.avgValue !== null ? { avgValue: r.avgValue } : {}) });
  }
  return json({ ...(days ? { lastDays: days } : {}), ...totals.results[0], byEvent, daily: daily.results });
}
