# Chroma Clash — local integration, awaiting publication approval

## Source identified

GitHub repository: https://github.com/CarterGoober/School-Computer-Games

The recent commits are attributed to **Codebuff**, matching the described AI-created game:
- `f12c6cc578caa0a5bb37a3460d54fbef63d9ab6d`: initial game, Node/WebSocket server, shared simulation, browser assets and tests.
- `97a8edfb11311bb56114f34ac99734f890573012`: smaller first-person weapon model (included).
- `fd6b496e60c18bdcec89bc642918831a791cc1c1`: deployment templates/docs (retained for review; not executed).

Imported only the game/runtime into `chroma-arena/`: original `chroma/`, `server/`, `shared/`, `test/`, package/lockfile, Docker/deployment templates and docs. `chroma` at Garage root is a tracked relative symlink to `chroma-arena/chroma`, keeping one copy of the public client and the original relative build imports. The Worker build explicitly packs its public HTML/CSS/config/logo/bundle only; server files, node_modules, source tests and data are not served.

GitHub's root homepage, site.css, service worker, 404, README and retired-game deletions were NOT merged. Current Codex source, including Paid Shop/Stripe candidate, Chat and Garage AI, remains the base. Original integration docs in this directory describe an obsolete Garage and are preserved only as source provenance; use this document for the current site.

## Necessary changes

- Current Garage homepage: additive Chroma Clash launch card at `/chroma/`, its own card stylesheet.
- Client: existing config points to same-origin `/chroma`; added Garage return link. Mechanics, Three.js art, maps, original controls/audio, loadouts, currency and progression stay intact. The bundle is rebuilt from imported source, including the upstream weapon-size fix.
- Existing Worker: serves the new static assets and proxies only `/chroma/api/*` and `/chroma/ws` to a trusted HTTPS `CHROMA_SERVER_ORIGIN`. An unset/invalid/self-referencing origin returns explicit 503; it does not simulate matches.
- Original Node server: accepts the namespaced HTTP/WS paths as aliases, standalone root redirects to the game, and default Garage frame origin is corrected from `.chatgpt.com` to `.chatgpt.site`.
- Package test command uses a file glob supported by Node 24. Standalone landing test reflects redirect behavior. No root package.json or module-type change.
- Existing service-worker version is advanced to refresh the homepage/card; Chroma APIs and WebSocket paths bypass cache.

## Run locally

```
npm ci --prefix chroma-arena
npm start --prefix chroma-arena
```

Open `http://localhost:8787/chroma/` for standalone gameplay. For the whole Garage integration, `node chroma-arena/test/garage-browser.cjs` starts an ephemeral local Garage server and original arena server; it closes both and removes synthetic accounts afterwards. No production data or test accounts are created.

## Actual tests

- Original game suite: **37/37 pass**, including real two-runner WebSockets, matchmaking, combat validation, movement-related simulation, healing, reload timing, respawns, progression, persistence, reconnection, invalid tokens and purchase validation.
- Two independently isolated Chromium contexts: current Garage launch card → actual bundled WebGL game → both enter a 1v1 via real HTTP/WebSocket → movement/fire/reload/melee/heal input smoke → page reload/reconnect. No page errors. Visual screenshot: `work/chroma-game.png` (ignored development capture).
- Input smoke establishes that controls execute without browser exceptions; hit accuracy, subjective aiming/audio quality and actual Chromebook performance have not been measured.
- Packed Worker test: new public assets and existing Garage/game/Chat/AI/Shop assets match source bytes. Existing Worker startup check passed at approximately **511 ms** on this executor.
- New proxy routing test: missing/invalid/self origin fails closed; configured requests preserve method/body and reach only namespaced endpoints. Node/API aliases tested locally; deployed WSS/latency remains unverified.

## Publication blocker

**No publication or hosting provisioning performed.** The existing chatgpt.site Worker cannot run the imported long-lived Node/file-backed simulation itself. Supply an approved persistent Node/WebSocket host with durable data storage, then configure its public HTTPS origin as `CHROMA_SERVER_ORIGIN` on the existing Site. Keep `CHROMA_SECRET` stable and server-only; mount the server data volume; allow the Garage origin in `CHROMA_ALLOWED_ORIGINS`. Never expose its `.server-data` directory.

Docker/Oracle templates are retained but not run. Free-tier availability is account/provider-specific; no guarantee of zero cost or permanent VM availability is made. No paid service, new domain or hosting migration was enabled.

The original game has its own guest/runner identity and Stardust. These are deliberately not mapped onto Supabase Chat accounts, Garage Credits or paid cosmetic entitlements. Existing account systems and balances are untouched. Public server security/capacity and cross-origin deployed multiplayer require review/testing before publication approval.
