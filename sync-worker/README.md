# Pocket Goblin sync server

A tiny Cloudflare Worker that lets the same goblin be played on more than one
device, and keeps anonymous play counts (see [Play counts](#play-counts-whats-popular)). It stores one save per "goblin code" in a D1 (SQLite) database. The
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

## Play counts (what's popular)

The same Worker also keeps anonymous play counts, so you can see how many goblins
have been made and which games and activities get used. The game sends small
events like `game_start rocket` or `home_button shop`. Each one has a random ID
for that browser, and never a name, answer or goblin code. Nothing about the
request (IP address, browser) is stored. Grown-ups can switch it off under
**Anonymous play counts**. When the game runs on `localhost`, events are only
logged to the browser console, so testing doesn't pollute the numbers.

After pulling this change, redeploy once (the new table is created automatically):

```bash
npx wrangler deploy
```

To see a summary in your browser, pick a password-like key and store it as a secret:

```bash
npx wrangler secret put STATS_KEY
```

Then open `https://pocket-goblin-sync.<your-subdomain>.workers.dev/stats?key=YOUR_KEY`.
Add `&days=30` to see only the last 30 days. Without the key, `/stats` answers "not found".

| Event | Item | Number |
|---|---|---|
| `app_open` | `new` the first time, otherwise blank | |
| `goblin_created` | | |
| `game_start` | `dash`, `rocket`, `cafe`, `race`, `squid` | |
| `game_end` | same as above (a round played to the end, or quit after answering something) | problems right |
| `home_button` | `mathgames`, `feed`, `shop`, `wardrobe`, `decorate`, `bath`, `vacation`, `postcards`, `workshop` | |
| `buy` | item id (`custom` for Workshop items) | price |
| `feed` | snack id | |
| `wear` | item put on in the Wardrobe | |
| `pose` | pose name | |
| `vacation` | destination id | cost |
| `workshop_make` | slot, like `hat` or `snack` | |
| `unlock` | | the times table unlocked |

In the summary, `times` is how often it happened and `devices` is how many
different browsers did it. One kid on two devices (or after clearing browser
data) counts as two.

For anything else, query the `events` table directly, for example the most popular games:

```bash
npx wrangler d1 execute pocket-goblin --remote --command "SELECT item, COUNT(*) AS starts, COUNT(DISTINCT install) AS devices FROM events WHERE event = 'game_start' GROUP BY item ORDER BY starts DESC"
```

To wipe the counts and start fresh:

```bash
npx wrangler d1 execute pocket-goblin --remote --command "DELETE FROM events"
```

## Testing locally

```bash
npx wrangler dev
```

Then set `SYNC_URL` to `'http://localhost:8787'` and serve the game on port 8000.
