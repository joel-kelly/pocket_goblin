// Pocket Goblin save sync: a tiny Cloudflare Worker that stores one save per
// goblin code in a D1 (SQLite) database.
//
//   GET /save/:code   -> { rev, savedAt, data }  or 404
//   PUT /save/:code   body { baseRev, savedAt, data }
//                     -> { rev } on success
//                     -> 409 { rev, savedAt, data } if another device saved first
//
// The code is the only "password", so it's long and random (about 41 bits).
// The database stores a hash of it, never the code itself.

const CODE_RE = /^[A-Z]{2,8}(-[A-Z]{2,8}){3}-[0-9]{4}$/;
const MAX_BYTES = 1_500_000; // D1 rows top out at 2 MB

let tableReady = false;
async function ensureTable(db) {
  if (tableReady) return;
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS saves (id TEXT PRIMARY KEY, rev INTEGER NOT NULL, saved_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, data TEXT NOT NULL)'
  ).run();
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

    const m = new URL(req.url).pathname.match(/^\/save\/([A-Z0-9-]+)$/);
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
