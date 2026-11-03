# Pocket Goblin sync server

A tiny Cloudflare Worker that lets the same goblin be played on more than one
device. It stores one save per "goblin code" in a D1 (SQLite) database. The
free Cloudflare plan is far more than enough.

The game still saves in the browser first, so it works offline and keeps
working if this server is down.

## Set it up (about 5 minutes)

You need Node.js installed. From this folder:

```bash
npx wrangler login
```

```bash
npx wrangler d1 create pocket-goblin
```

That prints a `database_id`. Paste it into `wrangler.toml` in place of
`PASTE-DATABASE-ID-HERE`. If the game isn't at `https://joel-kelly.github.io`,
change `ALLOWED_ORIGINS` in `wrangler.toml` too.

```bash
npx wrangler deploy
```

That prints the Worker's address, like
`https://pocket-goblin-sync.<your-subdomain>.workers.dev`. Put it in
`src/sync.js`:

```js
export const SYNC_URL = 'https://pocket-goblin-sync.<your-subdomain>.workers.dev';
```

Commit and push, and the **Sync between devices** section in Grown-ups turns on.
The database table is created automatically on the first request.

### No Node.js? Use the dashboard instead

1. **Storage & Databases → D1 → Create** a database named `pocket-goblin`.
2. **Workers & Pages → Create → Start with Hello World**, name it `pocket-goblin-sync`, deploy, then **Edit code** and paste in `worker.js`.
3. In the Worker's **Settings → Bindings**, add a **D1 database** binding named `DB` pointing at `pocket-goblin`.
4. In **Settings → Variables and Secrets**, add a text variable `ALLOWED_ORIGINS` = `https://joel-kelly.github.io,http://localhost:8000`.

## How it works

- `GET /save/:code` returns `{ rev, savedAt, data }`.
- `PUT /save/:code` with `{ baseRev, savedAt, data }` saves only if nobody else
  saved since `baseRev`. Otherwise it answers `409` with the newer copy, and the
  game either takes it or (if both devices changed) asks which goblin to keep.
- The code is the only key, so it's long and random (about 41 bits). The
  database stores a SHA-256 hash of it, not the code itself.
- Only pages listed in `ALLOWED_ORIGINS` can call it from a browser.

## Testing locally

```bash
npx wrangler dev
```

Then set `SYNC_URL` to `'http://localhost:8787'` and serve the game on port 8000.
