# Chroma Clash

An original, browser-based **3D multiplayer arena shooter** built for the **Afterclass Garage**. Fast, colorful 1v1 / 2v2 / 5v5 matches run on an authoritative Node server; the browser draws the arena and sends input. All characters, the map, weapons, sounds and branding are original to this project.

> **Live site note:** the supplied site URL (`afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com`) did not resolve from the build environment. Integration was built against this repository's Afterclass Garage source, which is a static vanilla-JS GitHub Pages project with no accounts. See [`docs/INTEGRATION.md`](docs/INTEGRATION.md) for exactly what was inspected and how to attach the game to a separately hosted site.

---

## What is included

| Requirement | Status |
| --- | --- |
| Real-time online matches | Authoritative WebSocket server at a fixed 30 Hz, 20 Hz snapshots |
| Matchmaking for 1v1 / 2v2 / 5v5 | Queues with balanced team assignment; bots backfill quiet queues |
| Guns, melee, healing | 5 guns, 2 melee tools, 2 healing items, all server-validated |
| Loadouts before a match | Four slots (gun, melee, healing, style), saved server-side |
| Unlockables and visual styles | 6 splatter styles and weapon unlocks bought with earned Stardust |
| Progress saved between sessions | Accounts + guest runners stored on the server, never trusted from the browser |
| Score, result, match status | Live score, timer, kill feed, scoreboard, result and rewards |
| Leaving / disconnecting | 20-second reconnect grace in team modes; abandoned matches end cleanly |
| Website integration | New garage launch page at `/` and the game at `/chroma/`; iframe and nav recipes in the docs |
| Secure game services | scrypt passwords, HMAC session tokens, CORS/WS origin checks, rate limits, CSP, static-file allowlist |
| Tests | 37 automated tests covering matchmaking, combat, healing, unlocks, reconnects, APIs and static security |

### Game at a glance

- **Name / brand:** Chroma Clash — "Paint the plaza. Own the block."
- **Map:** *Sundae Square*, a symmetric, colorful plaza with a raised center, corner towers and jumpable cover.
- **Modes:** Team deathmatch, first to 20 eliminations or 4 minutes.
- **Teams:** Citrus (orange) vs Berry (violet). Six original splatter styles share one bean-shaped silhouette family.
- **Currency:** Stardust, earned from matches. Levels unlock gear; Stardust buys it.
- **Accounts:** guests play instantly; linking a runner name and password keeps progress across devices.
- **Audio:** all sound effects are synthesized at runtime with the Web Audio API. No third-party audio or artwork.

#### Weapons and items

| Item | Type | Cost | Level | Notes |
| --- | --- | ---: | ---: | --- |
| Pop Pistol | Gun | Free | 1 | Starter sidearm, 28 damage, headshot ×1.6 |
| Bubble SMG | Gun | 350 | 2 | Automatic, 34-round magazine |
| Citrus Scatter | Gun | 550 | 3 | 8-pellet shotgun, heavy close range |
| Glacier Lance | Gun | 800 | 5 | 62-damage marksman rifle |
| Rave Repeater | Gun | 950 | 7 | Automatic, 20 rounds |
| Foam Bat | Melee | Free | 1 | 34 damage, wide arc |
| Yardstick | Melee | 300 | 2 | Faster, longer reach |
| Juice Box | Healing | Free | 1 | 2 charges × 45 health, 9 s cooldown |
| Sundae Kit | Healing | 500 | 4 | 1 charge × 80 health, 15 s cooldown |
| Six styles | Cosmetic | 0–600 | 1–5 | Body/trim palettes, no gameplay advantage |

---

## Quick start

Requires **Node.js 20+** (built and tested on Node 26).

```sh
npm ci
npm start
```

Open **http://localhost:8787/chroma/**. The same server also serves the garage launch page at **http://localhost:8787/**.

For development, `npm run build` rebuilds `chroma/dist/game.js` after client changes. The committed bundle means a production server does not need a build step.

```sh
npm run build   # esbuild bundles the Three.js client
npm test        # 37 Node tests (builds first)
npm run check   # syntax checks for server and client entry points
```

### Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Aim (click the arena to capture the pointer) |
| Left click | Fire |
| Shift | Sprint |
| Space | Jump |
| R | Reload |
| V | Melee |
| F | Healing item |
| Tab | Scoreboard |
| Esc | Pause menu (the match keeps running) |

Desktop with mouse and keyboard is required. Touch input is not implemented.

---

## Architecture

```
Browser (Three.js client)                    Node game server
─────────────────────────                    ─────────────────────────────────
lobby / shop / loadout  ── HTTPS ──────────▶ REST API: session, accounts,
                                             profile, loadout, shop
mousemove + WASD        ── WebSocket ──────▶ input validation
predicted local motion                         │
                                               ▼
                                             Match @ 30 Hz
                                             · shared movement + collision
                                             · hitscan raycasts vs hitboxes/walls
                                             · healing, reloads, respawns
                                             · score, kills, assists
                                               │
snapshots @ 20 Hz + cosmetic events ◀──────────┘
                                               │
                                             server-side progression
                                             (JSON store, atomic writes)
```

- `shared/` is imported by **both** the browser bundle and the server: one catalog, one map, one movement function, one hit-detection module. This keeps client prediction and server results aligned.
- The server never accepts damage numbers, prices, unlocks, positions or scores from the client. It validates fire cadence, magazine size, reload state, healing charges/cooldowns, loadout ownership, purchase level/funds, map collision and line of sight.
- The browser predicts its own movement for responsiveness, then reconciles to authoritative snapshots. Remote players are interpolated.
- Matches run even when the browser tab is paused; the pause menu releases the pointer and warns the player.

### Repository layout

```
index.html, site.css           Garage launch page for Chroma Clash
404.html                       Themed not-found page
chroma/                        Static game client
  index.html, style.css        Lobby, HUD, result UI
  config.js                    Server origin for static hosting
  src/                         main, net, input, Three.js view, UI, audio
  dist/game.js                 Committed esbuild bundle
  assets/logo.svg              Original splat mark
shared/                        Map, catalog, protocol, movement, combat
server/                        HTTP + WebSocket server
  index.js                     Entry point, APIs, static hosting, security
  hub.js                       Connections, queues, match lifecycle
  match.js                     Authoritative simulation
  store.js, auth.js            Accounts, progression, hashing, tokens
  matchmaking.js               Queue grouping + team balancing
test/                          37 Node tests
docs/                          Integration and deployment handoff
```

---

## Accounts and progression

The existing Afterclass Garage has **no accounts and no backend for game saves** (its only backend is a Supabase feedback form). Chroma Clash therefore ships its own lightweight account system:

1. **Guest runner.** First load creates an anonymous runner on the server. A signed token is kept in `localStorage` so the browser can reconnect; the runner's XP, Stardust, unlocks and loadout live in server storage.
2. **Link a name.** A guest can set a runner name and password. The same account is upgraded in place, keeping all progress and letting the player log in on another device.
3. **Log in.** Existing runners log in with username/password. Passwords are hashed with scrypt and a per-account salt; sessions use HMAC-signed tokens with a 30-day lifetime.
4. **Saved loadouts.** Loadout changes and shop purchases go through the server. An invalid or unowned selection falls back to the starter item, and rewards are calculated from server-tracked stats at the end of a match.

**Security boundaries:** no password, signing secret, or privileged key is ever sent to the browser. CORS and WebSocket origins are allowlisted; auth endpoints and sockets are rate-limited; only public site files are served; HTML gets a CSP; tokens are sent in an `Authorization` header (HTTP) or the first WebSocket message (never a URL).

Upgrading to the site's existing identity provider later is possible, but no SSO is implemented because the site does not have an account system to reuse. See `docs/INTEGRATION.md` for the recommended migration path.

---

## Website integration

Two supported approaches, both documented in [`docs/INTEGRATION.md`](docs/INTEGRATION.md):

- **Same-origin (recommended).** Deploy this repository as one Node service. It serves the garage launch page, the game and the WebSocket arena. Link to `/chroma/` from the site's navigation.
- **Static page + separate game server.** Host `chroma/` on the existing static site (GitHub Pages), set `window.CHROMA_SERVER` in `chroma/config.js` to the server origin, and allow the site origin in `CHROMA_ALLOWED_ORIGINS` and `CHROMA_FRAME_ANCESTORS`.

The game can also be embedded in an iframe:

```html
<iframe
  src="https://your-game-server.example/chroma/"
  title="Chroma Clash"
  allow="fullscreen; gamepad"
  style="width:100%;height:min(80vh,760px);border:0;border-radius:12px"
></iframe>
```

The site's visual identity is reused through the paper/sage launch page and the logo/branding; the game itself uses an original bright arena palette.

---

## Tests

```sh
npm test
```

What is covered:

- **Matchmaking:** 1v1 immediate start, bot backfill delay, bots-disabled behavior, full 5v5 groups, balanced teams, unique bot names.
- **Combat:** ray/AABB hit detection, wall occlusion, headshots, damage falloff, shotgun pellets, no friendly fire, melee range/arc/LOS.
- **Match rules:** server-enforced fire interval, magazine, reload, healing charges/cooldowns/cap, kills, assists, respawn, score limit, time limit, rewards only for humans.
- **Disconnects/reconnects:** 2v2 stays alive when one runner drops and accepts a reconnect; 1v1 ends on abandonment.
- **Progression:** guest upgrades, case-insensitive unique names, scrypt hashing, tamper-proof/expiring tokens, level/funds/ownership purchase checks, loadout validation, persistence across store reloads.
- **Integration:** real HTTP APIs, CORS preflight and origin rejection, static allowlist (server source/data are not served), CSP header, guest sessions, registration/login, and a **two-client WebSocket match with a real disconnect and reconnect**.

**Not verified in this environment:** the 3D rendering, pointer-lock feel and full browser gameplay, because no Chromium/WebGL browser was available in the build sandbox. The client bundle compiles and its imports resolve; the server and shared simulation are covered by the tests above. Run a browser smoke test after deployment (checklist in `docs/DEPLOYMENT.md`).

---

## Hosting, costs and limits

The game needs a **long-running Node process with WebSocket support and a persistent disk**. Static hosting alone cannot run matches.

| Piece | Suggested host | Order-of-magnitude cost |
| --- | --- | --- |
| Node server + WebSockets + static files | Fly.io, Railway, Render (paid instance) | ~$3–8 / month for a small always-on instance |
| Persistent volume for accounts (1 GB) | Host volume / attached disk | ~$0.15 / month |
| HTTPS/WSS | Provided by the host or a reverse proxy | Free |
| Optional static front door | GitHub Pages | Free |
| Optional Postgres/Supabase for scale | Supabase / managed Postgres | Free tier or ~$0–25 / month |

Exact prices change; check the host's current pricing. Serverless static hosts (plain GitHub Pages) cannot host this server.

**Current limitations**

- Single server instance: queues and matches are in memory; the JSON account store is single-writer. Do not horizontally scale without moving sessions/queues to a shared store and replacing the account store with Postgres.
- No TLS in Node itself; terminate TLS at the host/reverse proxy and use `https`/`wss`.
- Bots fill empty queues after a delay. Some players may prefer human-only matchmaking; set `CHROMA_BOTS=0` to disable.
- No mobile/touch combat controls, no voice chat, no spectator mode, no ranked seasons, no anti-cheat beyond server authority (aimbots are not detected), no party system. Region latency is whatever the single host provides.
- The map is one original arena. Additional maps require geometry in `shared/map.js` and matching render support (the renderer already draws any box list).
- Account recovery is password-based only; there is no email reset. Back up the data directory.
- The pause menu does not pause the online match.

---

## Deployment in brief

For a **$0, always-on** deployment, use an Oracle Cloud Always Free VM with the included Docker + Caddy stack: see [`deploy/oracle-cloud.md`](deploy/oracle-cloud.md) and run `deploy/oracle-setup.sh` with a free `sslip.io` hostname. The static launch page is already publishable on GitHub Pages; the arena server needs the VM.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full guide, including Docker, Fly.io, Render/Railway, GitHub Pages, environment variables, backups and a launch checklist.

```sh
# production
npm ci --omit=dev
npm run build          # only needed if you changed chroma/src
CHROMA_SECRET="a-long-random-secret" \
CHROMA_ALLOWED_ORIGINS="https://your-site.example" \
CHROMA_FRAME_ANCESTORS="'self' https://your-site.example" \
PORT=8787 CHROMA_DATA_DIR=/data npm start
```

Required operational rules:

1. **Set `CHROMA_SECRET`** (32+ random bytes) and keep it stable. If it changes, every existing session token becomes invalid.
2. **Mount a persistent volume** at `CHROMA_DATA_DIR`. Without it, accounts disappear on redeploy.
3. **Allow your site origin** in `CHROMA_ALLOWED_ORIGINS` and, if embedding, `CHROMA_FRAME_ANCESTORS`.
4. Back up the data directory (or migrate to Postgres).

A `Dockerfile` and `.env.example` are included.

---

## Handoff notes for the next developer

- Start with `shared/` before changing gameplay: map geometry, item stats, movement and hit detection are single sources of truth.
- Client-only changes need `npm run build` and a commit of `chroma/dist/game.js`.
- Server-only changes need no rebuild; restart the process.
- Progression is intentionally server-owned. Do not add client-side unlocks or "offline currency" without a server-side validation path.
- The test suite is the contract: run `npm test` before and after changes. Add cases for new weapons, maps, modes or account flows.
- For a larger audience, replace `server/store.js` with a Postgres adapter that preserves the same method signatures, then move queues/matchmaking behind a shared store before adding instances.
- To reuse the site's future accounts, replace the token issuance/verification in `server/auth.js` with the site's OIDC flow, keeping the account ID as the stable key for `Store`.

---

## Originality

Chroma Clash is an original production of the Afterclass Garage. It takes broad genre inspiration from fast, colorful arena shooters but copies no assets, maps, names, characters, audio or code from Pixel Gun 3D, Roblox RIVALS, or any other game. All geometry is generated from this repository's code, all UI and the logo are original SVG/CSS, and all sound is synthesized by `chroma/src/audio.js`.
