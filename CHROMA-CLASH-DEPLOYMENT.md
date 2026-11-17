# Chroma Clash: Render Free + Supabase deployment candidate

**Not deployed. No production schema/data changes, Render resource, paid service or public release was made.** Use only after reviewing the candidate and authorizing deployment. Existing Garage, Chat, AI and Paid Shop remain separate.

## Architecture and persistence

Original server: `chroma-arena/server/index.js`; one Node HTTP server serves `ws` upgrades. Simulation is 30 Hz, snapshots 20 Hz; mechanics/art/controls remain original. Production uses `server/postgres-store.js` through `pg`, not Supabase Auth. Local development retains the original JSON store.

Account reads/caches: `Store.accounts` and `usernameIndex`, `get`, `findByUsername`, `isNameTaken`; HTTP bearer lookup and hub authentication/profile/loadout/queue/reward paths consume those caches. Mutations: createGuest, createAccount, upgradeGuest, login/lastSeenAt, touch, buy, setLoadout, recordMatch. Each invokes persist; production queues immutable snapshots, writes only changed accounts in transactions and acknowledges sensitive operations after flush. Reward messages follow committed per-account writes.

`chroma_private.accounts` preserves the entire original account object as JSONB: id, name, usernameKey, guest, salt/hash, dates, xp, stardust, owned, loadout and stats. SQL adds primary ID, unique username, basic constraints, revision, timestamp, RLS and denied browser grants. No existing account IDs/passwords or game balances are migrated into Chat/Auth/commerce.

One PostgreSQL session advisory lock permits only one authoritative writer. Revision CAS detects unexpected concurrent changes. On a failed transaction, cached data is restored to the last acknowledged state, subsequent writes/commands fail closed, and health reports 503. Restart after repairing database connectivity. No automatic DB retry can duplicate rewards. Uncommitted changes at failure may be lost; committed data survives restart. Active matches are memory-only and are not restored after process restart.

The adapter loads accounts at startup (maximum original 50,000 creation ceiling). This is a small-pilot architecture, not horizontal scaling; large account sets need measured memory review and later scoped loading. There are no per-tick database queries.

## 1. Supabase project and schema

Reuse the existing Free project only after confirming capacity; do not upgrade or enable paid add-ons. Supabase Free has independent storage/connections/egress quotas and inactivity pausing policies. Confirm current limits in its dashboard/docs; paused databases prevent startup and persistence.

Apply `chroma-arena/database/schema.sql` in Supabase SQL Editor. First test against a development project; the included PGlite tests do not establish production credentials/network compatibility. The script creates only the isolated game schema; it never deletes existing tables.

From **Connect**, obtain the PostgreSQL direct or **Session pooler** connection string (5432). Render may need the session pooler's IPv4 endpoint. Do NOT use transaction pooling (6543): the writer lock must belong to a persistent DB session. Enter the connection string only in Render's secret environment variable `CHROMA_DATABASE_URL`; never in client config, Git, chat or logs. TLS verification is enabled. Install the official database CA through NODE_EXTRA_CA_CERTS if needed; do not disable certificate verification.

The current adapter uses the trusted DB connection role. Prefer a dedicated login role with only schema usage and SELECT/INSERT/UPDATE on chroma_private.accounts; no DELETE required. Schema installation needs SQL Editor privileges. No SUPABASE_SERVICE_ROLE_KEY is used by this adapter and none should be put in the client.

## 2. Existing accounts migration

Stop every old server before importing. Locate its actual `CHROMA_DATA_DIR/accounts.json`; this workspace contains synthetic test data only, not a verified live account export. Keep the original signing secret as CHROMA_SECRET if existing session tokens must remain valid.

Run from a secure trusted terminal:

```
npm ci --prefix chroma-arena
node chroma-arena/scripts/migrate-accounts.js /absolute/path/accounts.json
```

Set CHROMA_DATABASE_URL securely in that terminal first. Do not place its value in shell history or command arguments. The tool validates version/fields/IDs/progression/hash shapes, creates a permission-restricted backup beside the source, locks against a running writer, imports in one transaction, verifies exact JSONB equality and reports counts only. It never logs password hashes or deletes the source. Repeated identical imports skip existing IDs; a differing existing record rolls back the entire import instead of overwriting newer progress. Retain source and backup securely outside Git.

## 3. Render Free Web Service

After approval, push the reviewed source to an authorized repository branch. The GitHub remote currently differs from the Codex checkout: do not replace the Garage with its older source. Deploy the reviewed branch containing the integrated `chroma-arena/` directory.

In Render: New → Web Service → connect repository → root directory `chroma-arena` → Node runtime → **Free** instance. Build `npm ci --omit=dev`, start `npm start`, health check `/api/health`. Bindings use `0.0.0.0` and Render's PORT. Alternative: use the Blueprint at `chroma-arena/render.yaml`; verify Free before creation. No disk/add-on is required. Do not add payment details or upgrade if signup requires billing.

Secrets/settings:
- NODE_ENV=production (prevents fallback to ephemeral JSON/generated secrets).
- CHROMA_DATABASE_URL: server-only Supabase session/direct PostgreSQL URL.
- CHROMA_SECRET: stable random 32+ character signing secret; retain the original during migration.
- CHROMA_ALLOWED_ORIGINS: exact comma-separated Garage/local approved origins; no wildcard.
- CHROMA_METRICS_TOKEN: independent random bearer for private metrics.
- Optional CHROMA_BOTS/CHROMA_BOT_DELAY_MS retain original bot behavior.

The single-writer lock means overlapping Render deployments cannot both start. For pilot upgrades, stop the old service before starting the replacement. If the replacement logs “Another Chroma writer is active,” confirm the old process has stopped and retry deployment. There is no zero-downtime failover claim. SIGTERM closes sockets, stops simulation and flushes pending saves before exit (20-second failure deadline).

## 4. Garage connection

Render assigns `https://YOUR-SERVICE.onrender.com`. Direct socket is `wss://YOUR-SERVICE.onrender.com/ws`. No separate port or paid domain is required.

Keep the frontend on the existing Garage. Set Site server runtime variable CHROMA_SERVER_ORIGIN to that HTTPS origin; the existing `/chroma/api/*` + `/chroma/ws` proxy preserves the client config `location.origin + '/chroma'`. A deliberate split-host setup can set the public `window.CHROMA_SERVER` to the Render HTTPS origin instead; rebuild only if source changed. The browser receives public origins only, never the database/signing secrets. HTTPS becomes WSS automatically. Verify production proxy upgrades; they have only been exercised locally.

## 5. Test deployed service before approval to launch

Check `/api/health` over HTTPS, then use two independent browsers to join 1v1, move/fire, finish a match, reconnect, log in again and verify committed progression. Restart the service and confirm the same IDs/progression. Confirm no other Garage games/Chat/AI/Shop changed. Test cold-start UI and Retry. Do not claim success from health alone. Do not run destructive test suites against production.

## 6. Monitoring and free limits

Private GET `/api/metrics` requires Authorization: Bearer CHROMA_METRICS_TOKEN. It exposes aggregate connections, process memory/CPU, message count, database write failures and per-match tick count/total/max duration. Never put this token in a public dashboard/client. Compare CPU/message counters across intervals. No usernames, hashes or DB strings are returned.

Render Free sleeps after 15 minutes without incoming traffic, can take about a minute to wake, may restart, and has shared runtime/build/bandwidth allowances. Active gameplay traffic functions normally; no artificial keep-alive service is added. Supabase outages/pauses fail health and writes. This is not guaranteed 24/7 service.

## 7. Reconnection and troubleshooting

The existing connection screen now handles connecting, waking, reconnecting and failure with Retry. A single task retries six times with exponential jittered backoff capped at approximately 18.75 seconds, plus bounded HTTP/WS timeouts. Temporary HTTP failures retain the stored identity token; only 401 clears it. Stale socket callbacks are ignored; gameplay sends require readiness. A server restart returns players to lobby if their match no longer exists. Do not promise live match recovery.

Health 503/storage errors: check DB availability, TLS/session connection, writer lock and Render secrets. Repair then restart; never delete accounts to make startup succeed. For credentials errors, correct secrets only in Render/Supabase. Avoid sharing logs containing connection strings.

## 8. Rollback

Disable the launch card/server route if the pilot fails; restore the previously approved code through Sites/Render deployment history. Stop the new writer before starting an old one. Retain the Supabase schema and backups; do not export old JSON over newer committed records. Original local JSON mode is development-only. Keep secrets stable across code rollback. Database schema is additive; rollback does not require dropping tables.

## Local verification

`npm test --prefix chroma-arena` tests original gameplay, real local WebSockets and new storage/identity cases. PGlite executes PostgreSQL semantics with synthetic local identities, not a real Supabase network. `node chroma-arena/test/garage-browser.cjs` tests two isolated browsers and forced socket-loss recovery. `node chroma-arena/scripts/load.js 2` is bounded to localhost, 2–10 simulated players for 5 seconds; increase only after prior results are acceptable. No remote target is supported.

Initial 2-player local measurement: 5.05 seconds, RSS 66.5 MB, CPU 161 ms user + 60 ms system, 149 received messages, 0 unexpected disconnects, 137 simulation ticks, max measured tick 1.38 ms. Short local measurements are not Render capacity guarantees; the original 120-client cap is not validated capacity.

## Remaining external steps

Schema not applied remotely; no real player file imported. Supabase DB connection/CA/role, Render account/repository authorization and stable secrets must be supplied securely. Real Render/Supabase startup, cold starts, WSS proxy, persistence across restarts and hosted latency/capacity remain unverified. Public deployment requires explicit approval.
