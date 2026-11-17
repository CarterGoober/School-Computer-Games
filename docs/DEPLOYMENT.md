# Deploying Chroma Clash

## 1. Requirements

- **Node.js 20+** (tested on Node 26).
- **WebSocket support** and a long-running process. A purely static host cannot run matches.
- **Persistent disk** for `CHROMA_DATA_DIR` (accounts, progression, signing secret if not provided).
- **TLS termination** at the host or reverse proxy so the browser can use `https://` and `wss://`.
- **One server instance.** Queues, matches and the JSON account store are in memory/single-writer. Horizontal scaling requires a shared session/queue store and Postgres first.
- Outbound access is not required for gameplay; accounts and matches are local to the server.

---

## 2. Local development

```sh
npm ci
npm run build     # rebuild chroma/dist/game.js after client edits
npm start         # http://localhost:8787/chroma/
npm test          # 37 tests (runs a build first)
```

`PORT`, `HOST` and `CHROMA_DATA_DIR` can be overridden. The server generates `.server-data/secret` on first run if `CHROMA_SECRET` is absent; this is convenient locally but **set an explicit secret in production**.

Serving the repo with a plain static server (for example `python3 -m http.server`) will show the launch page but **not** the game server. Point `chroma/config.js` at `http://localhost:8787` for that setup.

---

## 3. Environment variables

Copy `.env.example` and fill it in, or set these in the host's dashboard.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | HTTP/WebSocket port |
| `HOST` | `0.0.0.0` | Bind address |
| `CHROMA_SECRET` | generated to `<data>/secret` | HMAC signing key for session tokens. **Keep stable.** 32+ random bytes. Changing it logs everyone out. |
| `CHROMA_DATA_DIR` | `.server-data` | Directory for `accounts.json` and the generated secret |
| `CHROMA_ALLOWED_ORIGINS` | *(empty)* | Comma-separated extra browser origins allowed for HTTP/WS. Same-origin and localhost are always allowed. |
| `CHROMA_FRAME_ANCESTORS` | `'self' https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com` | CSP `frame-ancestors` value for HTML |
| `CHROMA_BOTS` | `1` | `0` disables bot backfill (queues then require full human teams) |
| `CHROMA_BOT_DELAY_MS` | `6000` | How long a quiet queue waits before bots backfill |

Example:

```sh
CHROMA_SECRET="$(openssl rand -hex 32)"
CHROMA_ALLOWED_ORIGINS="https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com,https://cartergoober.github.io"
CHROMA_FRAME_ANCESTORS="'self' https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com https://cartergoober.github.io"
CHROMA_DATA_DIR=/data
PORT=8787
```

Do not commit a real `.env`.

---

## 4. Build and packaging

The browser bundle is committed at `chroma/dist/game.js` so the server can run without dev dependencies. Rebuild whenever `chroma/src`, `shared/`, or `three` changes:

```sh
npm ci
npm run build
git add chroma/dist/game.js
```

Server-only changes (`server/`, parts of `shared/` used only by the server) still require a restart, not a rebuild.

`npm ci --omit=dev` is enough to run the server because the client bundle is already present. `three` is a runtime dependency only for building; it is bundled into `game.js`.

A `Dockerfile` is included:

```sh
docker build -t chroma-clash .
docker run --rm -p 8787:8787 \
  -e CHROMA_SECRET="replace-me-with-a-long-random-secret" \
  -v chroma-data:/data \
  chroma-clash
```

The image expects a writable `/data` volume. It copies the repository including the committed bundle; it does not run a build.

---

## 5. Hosting recipes

### Oracle Cloud Always Free (recommended free option)

See [`deploy/oracle-cloud.md`](../deploy/oracle-cloud.md). It uses a free VM, Docker Compose, a named persistent volume and Caddy for automatic HTTPS/WSS, and is the only route here that is both $0 and always-on with durable storage.

### Fly.io (single machine + volume)

```sh
fly launch --no-deploy        # uses the included fly.toml and Dockerfile
fly volumes create chroma_data --size 1 --region iad
fly secrets set CHROMA_SECRET="$(openssl rand -hex 32)"
fly secrets set CHROMA_ALLOWED_ORIGINS="https://your-site.example"
fly secrets set CHROMA_FRAME_ANCESTORS="'self' https://your-site.example"
fly deploy
```

The included `fly.toml` already sets the internal port, `CHROMA_DATA_DIR=/data`, the `/data` volume mount, a `/api/health` check, and `auto_stop_machines = "off"` with `min_machines_running = 1` — machines must not sleep, because matches live in memory and every player holds a WebSocket. Change `app` to a name you own (or let `fly launch` pick one) and keep the volume's region and source name in sync with the mount. Fly provides HTTPS and WebSocket upgrades.

### Railway / Render

- Create a web service from the repository; the included `Dockerfile` is detected.
- Add the environment variables above.
- Attach a persistent volume at `/data`.
- Use a paid always-on instance. Free tiers that sleep will drop WebSocket connections and delay matchmaking.

### VPS with a reverse proxy

Run under a process manager (`systemd`, `pm2`) and proxy WebSockets:

```nginx
server {
  server_name arena.example.com;
  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
  }
}
```

Use Certbot or the host's managed TLS. Never expose port 8787 directly as the public HTTPS endpoint.

### Static site on GitHub Pages

- Publish the repository root (`main` / root) with `.nojekyll`.
- Set `window.CHROMA_SERVER` in `chroma/config.js` to the separate Node host.
- Add the Pages origin to `CHROMA_ALLOWED_ORIGINS` and, if embedding, `CHROMA_FRAME_ANCESTORS`.
- Commit the built bundle. GitHub Pages cannot run the server.
- The game page works on Pages but shows "Arena offline" until the server is configured and reachable.

---

## 6. Costs and capacity

Rough monthly estimates for a small launch; confirm current pricing with the host.

| Item | Estimate |
| --- | --- |
| Small always-on Node instance (256–512 MB) | ~$3–8 |
| 1 GB persistent volume | ~$0.15 |
| TLS/domain | Free TLS; domain optional |
| GitHub Pages static front door | Free |
| Postgres/Supabase upgrade | Free tier or ~$0–25 |

Capacity guidance: a 256 MB instance comfortably runs many small lobbies because matches are lightweight; the practical limit is bandwidth and one process's CPU. Each match ticks at 30 Hz, snapshots at 20 Hz, and sends only small JSON messages. The JSON store rewrites the whole account file on each change — fine for hundreds of accounts, not for tens of thousands. Migrate to Postgres before serious growth.

---

## 7. Data, backups and operations

- Accounts live in `$CHROMA_DATA_DIR/accounts.json`; the signing secret is `$CHROMA_DATA_DIR/secret` when `CHROMA_SECRET` is not set.
- Writes use a temporary file plus atomic rename, serialized through one write chain.
- Back up the data directory daily (host snapshot or `tar`). Test a restore.
- `GET /api/health` returns `{ ok, game, online, queues, uptime }` for uptime checks.
- Logs go to stdout. The server does not log tokens or passwords.
- Restarting the process terminates in-memory matches. Players are returned to the lobby; progression already committed is safe.
- Rotating `CHROMA_SECRET` invalidates all session tokens. Clients create a fresh guest automatically, but existing accounts must log in again. Coordinate rotation.
- If the store cannot be read, it is moved aside with a `.corrupt-<timestamp>` suffix rather than overwritten. Investigate before continuing.

### Moving to Postgres/Supabase

`server/store.js` is intentionally small and account-scoped. To scale:

1. Create `accounts` and a normalized ownership/loadout schema, or store the loadout/owned arrays as JSONB.
2. Implement the same methods (`get`, `createGuest`, `createAccount`, `login`, `buy`, `setLoadout`, `recordMatch`).
3. Move queues and match membership to Redis/Postgres advisory locks before running more than one instance.
4. Keep all validation server-side; do not expose the database to the client.

---

## 8. Launch checklist

- [ ] `CHROMA_SECRET` set and stored in the host's secret manager.
- [ ] Persistent volume mounted at `CHROMA_DATA_DIR`; backup scheduled.
- [ ] HTTPS/WSS confirmed; no mixed-content warnings.
- [ ] `CHROMA_ALLOWED_ORIGINS` includes the real site origin(s).
- [ ] `CHROMA_FRAME_ANCESTORS` includes the site origin if embedded.
- [ ] `npm test` passes on the deployed revision.
- [ ] `/`, `/chroma/`, `/chroma/dist/game.js`, `/api/health` respond correctly.
- [ ] `/server/index.js` and `/.server-data/accounts.json` return 404.
- [ ] Manual browser pass: queue, move, shoot, reload, melee, heal, die, respawn, finish.
- [ ] Account pass: link, reload, log in from a second browser, verify rewards and loadout.
- [ ] Reconnect pass in 2v2: close a tab, reopen, confirm "Reconnected".
- [ ] Two-device data isolation: different runners never see each other's profile/shop.
- [ ] Rate limits and CORS reject unknown origins (spot check).
- [ ] Cost alerts and uptime monitoring enabled.
- [ ] Handoff links in `README.md` updated with the real deployment URLs.

---

## 9. Known limitations before launch

- No anti-cheat beyond server authority. Aimbots and triggerbots are not detected; the server does validate fire rate, ammo, hits, movement and rewards.
- Single arena and one game mode (team deathmatch). No spectator, ranked, parties, chat or mobile controls.
- Bots fill queues after 6 seconds by default. Adjust `CHROMA_BOTS` / `CHROMA_BOT_DELAY_MS` to taste.
- Pausing is client-side only; the match continues.
- Password reset, email verification and account deletion are not implemented. Add them before marketing to a wide audience, and document data retention.
- The JSON store is not suitable for horizontal scaling.
- Latency depends on a single region. Add regional deployments only after moving state out of process.
- The game is desktop-first. Mobile users see a notice; touch controls would require a new input layer and HUD.
