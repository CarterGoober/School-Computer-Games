# Integrating Chroma Clash with the Afterclass Garage site

## 1. What the existing site actually is

The supplied URL was **not reachable from the build environment** (DNS did not resolve `afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com` from the sandbox), so the site was inspected through its repository instead: `CarterGoober/School-Computer-Games`.

Findings from that source and history:

- It is a **static, build-free site**: plain HTML, CSS, Canvas/WebGL JavaScript, a manifest and service worker. It is deployed as static files (the README describes GitHub Pages with `main` / `(root)` and `.nojekyll`).
- The identity is warm and editorial: paper `#f1ebdc`, sage/olive greens, Georgia serif headlines, small uppercase labels, rounded cream cards, coral/lime accents.
- It has **no user accounts and no game-save backend**. Progression lives in `localStorage`; the only remote service is a Supabase project used for public feedback, reached with a public publishable key.
- The most recent commit (`5617bfb`) retired the old playable routes and reduced the deployed root to a retirement page and a service worker that unregisters old caches. The old games' files remain in Git history but are not part of the current site.
- There is an existing Node test convention (`node test-*.cjs`, some with Playwright) and documentation-first handoff style. This project follows the same "explain the test coverage and limitations" habit.

**Consequence:** there is no site account system to reuse. The game must provide its own accounts, and the site must gain a route/link to the arena. The supplied URL still needs to be checked by the site owner; if it is a different deployment than this repository, apply the same steps to that deployment.

---

## 2. What was added to this repository

| Path | Purpose |
| --- | --- |
| `index.html` + `site.css` | New **garage launch page** for Chroma Clash, matching the paper/sage identity. This replaces the retirement-only root with a front door to the arena. |
| `404.html` | Themed not-found page linking home and the arena (replaces the "garage retired" text). |
| `chroma/` | The game client, served at `/chroma/`. Self-contained: no build needed at runtime because `chroma/dist/game.js` is committed. |
| `server/`, `shared/` | Authoritative game server and shared simulation. Not served as static files. |
| `README.md`, `docs/` | Setup, integration, deployment and handoff instructions. |

The launch page intentionally links only to the new game. The retired garage games are not resurrected.

---

## 3. Choose an integration shape

### Option A — one Node service (recommended)

Deploy this whole repository to a host that can run Node and WebSockets (Fly.io, Railway, Render, a VPS). The same process serves:

- `/` — the garage launch page
- `/chroma/` — the game
- `/api/*` — accounts, profile, shop
- `/ws` — arena traffic

Link to `/chroma/` from whatever site shell you use. No CORS configuration is needed because everything is same-origin.

This is the least fragile setup: the client's `chroma/config.js` stays empty and the page opens a `wss://` connection to its own origin.

### Option B — keep the static site, host the arena elsewhere

1. Copy the `chroma/` folder into the static site (or keep this repository as the site and publish the root through GitHub Pages).
2. Deploy `server/` plus `shared/` to the Node host, mounting a persistent volume.
3. Edit `chroma/config.js`:

   ```js
   window.CHROMA_SERVER = "https://your-arena-host.example";
   ```

4. On the game server set:

   ```sh
   CHROMA_ALLOWED_ORIGINS="https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com,https://cartergoober.github.io"
   CHROMA_FRAME_ANCESTORS="'self' https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com https://cartergoober.github.io"
   ```

   Include every origin that will load the game. GitHub Pages project sites live under `https://<user>.github.io`.

5. Rebuild the client if you changed source files: `npm run build`, then commit `chroma/dist/game.js`.

The static host cannot run matches; the game page will show an "Arena offline" message with the configured server host if the server is missing or misconfigured.

### Option C — embed the game in an existing page

Same-origin iframe:

```html
<iframe
  src="/chroma/"
  title="Chroma Clash"
  allow="fullscreen"
  style="width:100%;height:min(80vh,760px);border:0;border-radius:12px;background:#10202b"
></iframe>
```

Cross-origin iframe (static site + separate server): use the absolute game URL and make sure the server's `CHROMA_FRAME_ANCESTORS` includes the parent page's origin. `CHROMA_ALLOWED_ORIGINS` must include the parent origin as well, because the game's fetches and WebSocket originate from the arena host's own page, not the parent — but include the parent anyway if you add links or postMessage integrations.

### Navigation card for the site

The old hub used cream cards with a serif headline. A minimal addition:

```html
<a class="chroma-card" href="/chroma/">
  <span class="badge">NEW IN THE GARAGE / 07</span>
  <h2>Chroma<br><em>Clash.</em></h2>
  <p>Fast 3D online matches. 1v1, 2v2, 5v5.<br>Paint the plaza. Own the block.</p>
  <span class="play">Enter the arena <b>→</b></span>
  <small>5 GUNS · 2 MELEE · HEALING · UNLOCKABLES</small>
</a>
```

Style it with the existing paper/sage variables. Do not put the game's dark arena palette on the site shell; the launch page shows the intended bridge.

---

## 4. Accounts: what exists now and what doesn't

The garage has no accounts, so the game introduces its own:

- **Guest runner** on first load. Progress is stored on the game server and keyed to a signed token kept in `localStorage`.
- **Link a runner** with a 3–16 character name and an 8+ character password. This upgrades the guest in place.
- **Log in** on another device to load the same runner, unlocks and loadout.
- **No email, no password reset.** Back up the server's data directory. If the site later adds accounts, replace the token layer with the site's OIDC provider and keep the server account ID as the stable key.

Why not reuse Supabase? The site's Supabase project is used only for anonymous feedback and exposes a public publishable key. It has no user auth configured for this purpose, and shipping a service-role key to a browser would be unsafe. Doing account linking through Supabase would require server-side credentials and new policies — a valid future upgrade, not something that can be assumed from the current repo.

### Optional future SSO

If the site grows an identity provider:

1. Add an OIDC callback on the game server.
2. Map the provider's stable subject to an existing account (`Store` account ID).
3. Issue the same HMAC session token after the callback, or trust the provider's token in `server/auth.js`.
4. Keep guest linking and the loadout/shop APIs unchanged.
5. Never put a client secret or service-role key in `chroma/`.

---

## 5. Security when connecting the game to the main site

- Serve the game over HTTPS; WebSocket traffic then uses WSS. The Node process expects TLS to be terminated by the host/proxy.
- Allow only known origins in `CHROMA_ALLOWED_ORIGINS`; the default also accepts same-origin and localhost for development.
- Set `CHROMA_FRAME_ANCESTORS` to the site origins if embedding. The server also sends `X-Content-Type-Options`, `Referrer-Policy` and a CSP on HTML.
- Keep the server source, `shared/`, `test/` and the data directory out of the static site. This server's static allowlist already refuses them; if you use a separate static host, only publish `index.html`, `site.css`, `404.html`, `chroma/` and the logo.
- Do not put `CHROMA_SECRET`, account data or any future service key in `chroma/config.js` or the repository.
- Progression, purchases and match rewards are server-owned. The browser never sends XP, currency, ownership, damage or scores.
- Player names are rendered with `textContent` in the client; keep that pattern for any future user-generated text.
- Back up the data directory and restrict access to the host. The JSON store contains password hashes and salts, not plaintext passwords.

---

## 6. Integration test checklist

After deploying:

1. Open `/` and confirm the launch page renders and the "Enter the arena" link works.
2. Open `/chroma/`; the status pill should reach **ONLINE**.
3. Create a guest, queue 1v1 (bots backfill), and confirm movement, firing, reload, melee, healing, death and respawn.
4. Link a runner, reload the page, and confirm the same name, level, Stardust and loadout return.
5. Buy an affordable item, change loadout, play a match, and confirm rewards update the profile.
6. Open a second browser profile, log in, and confirm the same runner loads.
7. In 2v2, close one tab, confirm the match continues, reopen the game, and confirm "Reconnected".
8. From the real site origin, confirm the iframe loads (if used) and there are no CORS or WebSocket 403 errors in the console.
9. Confirm `/server/index.js`, `/shared/map.js` and `/.server-data/accounts.json` return 404 on the deployed host.
10. Run `npm test` on the deployed revision.

The automated suite covers the HTTP/WebSocket paths and the reconnect flow. Browser WebGL/gameplay still needs the manual pass above.
