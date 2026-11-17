# Chroma Clash free hosting assessment

Official documentation checked 2026-11-17. Recommendation only: no provisioning, publication, credentials, billing changes or game modifications.

## Backend fit

The existing server uses Node >=20, HTTP plus `ws`, 30 simulation ticks/sec, 20 snapshots/sec, in-memory matches and file-backed accounts/progression. `accounts.json` and the signing secret must survive restarts. A permanent CHROMA_SECRET environment variable alone preserves token signatures, not missing account records. MAX_CLIENTS=120 is an application ceiling, not measured host capacity.

## Recommendation

There is no verified hosted option here combining no billing requirement, durable storage, reliable always-on service and zero adaptation.

For a no-payment-method multiplayer pilot, Render Free is the best documented low-change candidate: Node/WebSockets, managed TLS/WSS and free compute. Use Hobby + Free compute with no payment method. Its docs describe suspending free services at excess usage without a payment method. If signup requires a card for account-specific verification, stop: it no longer satisfies the strict requirement.

Important: the unchanged file store is NOT suitable for Render Free. Files disappear on sleep/restart/redeploy; lost accounts invalidate saved progression even with a stable secret. Before any saved-progress pilot, implement a scoped server storage adapter to the existing Supabase project (only if its free allowance is available), with least-privilege server-only access. Do not replace Chat accounts or Paid Shop records. No such adapter was implemented for this assessment.

Render limitations: 15 minutes without inbound HTTP/WS messages triggers sleep; startup takes about one minute. Active inbound game traffic qualifies as activity. Workspace gets 750 free instance hours/month shared across free services; allowance exhaustion suspends service. Bandwidth/build quotas also apply; without payment details excess bandwidth suspends services and excess build allowance stops builds. Free service may restart at any time, ending in-memory matches. 512 MB RAM; actual concurrent-player capacity requires hosted load tests. Render's free Postgres expires after 30 days, so it is not a permanent free persistence solution. No artificial keep-alive traffic is proposed.

## Alternatives

- Oracle Always Free VM: closest technical fit for unchanged Node + persistent files + Docker/Caddy WSS. Most users need a phone/card at signup, regional capacity can be unavailable, and idle instances may be reclaimed. It is not a strict no-card/reliable recommendation. Source deployment templates are not evidence that free capacity exists for this account.
- Existing approved always-on computer: preserves the server and local storage; secure HTTPS/WSS needs legitimate public reachability and TLS. No new hosting subscription, but electricity, network availability, administration and existing hardware remain costs/dependencies. Obtain network owner permission; no restriction bypasses.
- Cloudflare Durable Objects Free: supports WebSockets and SQLite with daily limits that fail closed. Requires a server/storage/timer port; it is not Node process hosting. An active 30 Hz match cannot hibernate while simulating. This is a possible later architecture project, not the minimal-change choice. Documented limits include 100,000 requests/day and 13,000 GB-s/day, shared across objects; capacity is not established for this game.

For any chosen host, keep the Garage frontend on its existing site. Configure the existing trusted CHROMA_SERVER_ORIGIN to the arena's HTTPS origin, allow the exact Garage origin server-side, and test WSS and 2–10 real players before publication. The proxy's production WebSocket upgrade path and real latency have not been tested on any host.

## Sources

- https://render.com/docs/free — sleep, ephemeral filesystem, instance hours, no-payment-method quota behavior, expiring Postgres.
- https://render.com/docs/websocket — inbound WebSockets, WSS, no imposed maximum WS duration; interruptions/restarts still possible.
- https://render.com/docs/faq — free-tier billing without/with payment method.
- https://render.com/pricing — Free compute 512 MB; current account allowances must be checked at deployment.
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm — signup verification and free-tier terms.
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm — persistent VM resources, capacity and idle reclamation.
- https://developers.cloudflare.com/durable-objects/platform/pricing/ — Free SQLite/compute quotas and WebSocket duration accounting.
