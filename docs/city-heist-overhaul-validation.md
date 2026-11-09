# City Heist responsiveness and gameplay overhaul

## Diagnosis and measured comparison

The published baseline (`dca94ca`) predicts walking with a visual offset, but car acceleration, speed and steering use the last server snapshot. Every render also pulls the visual position toward stale authority, which competes with local input. Requests are sequential and wait another90ms after each reply. A failed input immediately reconnects and drops the local run of commands. These paths, rather than steady rendering, explained delayed local controls in a two-browser reproduction.

Both versions were tested sequentially with two independent Chromium contexts on the same container, 1100×760 viewport, software rendering. One client had150ms added before input dispatch plus150ms before response delivery; every13th input was aborted. This is a controlled HTTP-loss approximation, not UDP packet simulation or a physical Chromebook test. Results are individual functional samples, not confidence intervals.

| Metric | Baseline | Overhaul |
| --- | ---: | ---: |
| Key press to first visible local vehicle displacement |1028.8ms|10.4ms|
| Rendered frame interval median / p95 |16.7 /16.8ms|16.7 /16.7ms|
| Canvas render-submission CPU median / p95 |not instrumented|0.7 /1.1ms|
| Measured input HTTP RTT median / p95 |not instrumented|314.6 /325.8ms|
| Outstanding controls at final sample |not implemented|17|
| Final local reconciliation error |not instrumented|0 world units|

Sampled local server headers reported approximately1.07–1.72ms total handling and0.40–1.18ms shared simulation/snapshot CPU on recent requests. These are Node-container measurements; public D1 processing/RTT and hardware GPU time are separate. Canvas CPU submission does not measure GPU execution. The baseline's zero counters in the raw helper output mean unavailable instrumentation, not zero CPU or latency.

## What changed

- `motion.js` is the common40Hz movement implementation for server and client, including acceleration, speed-dependent steering, braking, collision substeps and every car tier. Local input immediately predicts both translation and rotation. Authority consumes sequenced commands, acknowledges applied simulation only, and the client reconstructs the latest state by replaying unacknowledged inputs. Small correction offsets decay; actual transitions use generation barriers.
- The server retains at most half a second of unused per-player simulation credit to catch up delayed command delivery without allowing unlimited client simulation. Catch-up is bounded to2seconds per exchange, command queues to160, and client history to240. Isolated request loss retransmits pending controls; extended connection loss stops prediction and reconnects safely. The fixed40Hz authority is unchanged. Extreme sustained delay beyond these bounds remains a limitation.
- Remote cars and their nameplates use the same timestamped snapshot buffer, shortest-path angle interpolation and an adaptive90–1600ms presentation delay. The longer end protects smoothness on slow HTTP exchanges at the cost of remote-view latency; it does not make the transport low-latency. Car coordinates are resynchronized after authoritative contact projection so sprites and drivers do not disagree.
- Road networks now use connected district streets and a central east/west causeway, with a north route and a south docks bridge. Road crossings, crosswalks, sidewalk frontage paths, parking stalls and storefront arrows replace the overlapping diagonal road lattice. All34 building doors have collision-clear access checks. Saved stash/cash/owned cars are retained; invalid positions in the revised layout recover to a clear roadside.
- Eight vehicle definitions include the free rental, rusty junk, sedan, SUV, van, muscle, sports coupe and an original wedge exotic. Their dimensions, detailing, acceleration, steering, speed curves and smuggler values differ. Existing kind IDs and owned records remain supported. Nine uncommon authored find locations include one exotic. No brand logos or copied sprites are used.
- Exit searches both sides, rear and front at several distances; it never falls back to placing the player inside a parked car. R recovers a stuck/invalid state to a clear road without wiping owned progress. H returns civilians/officers on foot near the hideout, avoiding the former exit/re-enter loop. Spawn staging separates simultaneous arrivals. Permanent loss and extraction rules remain authoritative.
- Original pistol/carbine shapes, short travelling bullet marks, muzzle/recoil effects, server-confirmed impacts/hit feedback and optional synthesized sound replace the full-length glowing beams. The old `pulse` inventory identifier is retained as the carbine upgrade so existing equipment is preserved. Damage, fire rate, wall blocking and elimination remain server validated.
- Police station labels, P map marker, visible doorway and JOIN POLICE prompt include team availability. Enlistment requires entering the building on foot; repeated enlistment cannot refill gear. Store markers show security; contextual START ROBBERY/ROBBING prompts show the next10-second bundle, carried bundles and extraction guidance. Each bundle flashes the bag and names the item/value. Alerts remain shared with officers.

## Verification completed

-24 core/API/shared-motion regressions: existing authority/progression checks plus tier handling, actual left/right vehicle movement, alternate safe exits, invalid-state recovery, duplicate command rejection, simulation-only ACKs, exact pending replay, fixed time-credit limits, post-collision driver/car alignment, full160-command retransmission acceptance, and stale-generation action rejection.
- Two ordinary browser contexts: deploy/drive, four-second criminal hold, chat, map/waypoint and reconnect.
- Two browser contexts with delayed/lost HTTP input: immediate local motion, bounded retransmission, convergence, frame/CPU/RTT collection; the comparative measurements above.
- Two seeded-position browser contexts: police enlistment, immediate robbery alerts, ten-second loot, roof fade, actual doorway traversal and walking to extraction, stash sale and cash surviving server restart. Store/station starting fixtures are explicit; this does not claim navigation from spawn to every store.
- Two seeded-position browser contexts: pistol hit and server-confirmed impact feedback, rifle elimination, optional sound toggle, safe stash/cash after elimination, then all seven owned vehicle classes deployed, accelerated, turned right, exited onto clear ground and returned to the hideout with actual controls. Left/right for every tier also has actual movement tests in the shared core. Audio playback quality on real speakers is unverified.
- The built Worker/D1 adapter is checked for concurrent purchases, replay, currency authority, privacy, deployment, shared chat and reconnect. Over the Hill's hosted tests, wallet migration/shop/progression, The Trenches core, original world bounds/streaming invariants, cache asset availability, Worker startup and migration packaging are checked before release.

Review caught two additional defects:160-command payloads could exceed the original4KiB API/12KiB local-server limits; City input is now bounded to24KiB on both backends while other games retain their existing limit. Stale action envelopes could cross vehicle generation changes even though their controls were rejected; world interactions now validate the generation after simulation. Both have regression coverage.

## Remaining limits

The public backend remains a Cloudflare Worker/D1 request-driven exchange, not a dedicated WebSocket game server. Prediction removes local response dependence on RTT; it cannot remove network travel time, long remote buffers or D1 contention.24 simultaneous browser clients, sustained public-network loss, long-duration play, every road/building approach, physical Chromebook performance and comprehensive moderation remain unverified. The two-browser fixtures and local timing results are not evidence for24-player production capacity. Server profiles still share a JSON checkpoint; a large lifetime guest population needs a storage redesign. Browser secret-key retention remains necessary for guest recovery.

## Reproduce

Start the normal Node server (`node over-the-hill/server.cjs`), then run:

```sh
node --test city-heist/test-core.cjs city-heist/test-api.cjs city-heist/test-overhaul.cjs
node city-heist/test-browser.cjs
node city-heist/test-responsiveness.cjs
node city-heist/test-expedition.cjs
node city-heist/test-combat-cars.cjs
```

The last two launch isolated servers with disposable fixture storage. `TEST_BASE_URL`, `CITY_PROFILE_OUT` and `CITY_BASELINE=1` configure the responsiveness helper. Baseline source was archived locally from `dca94ca`; it is not bundled with the game. For hosted checks build then run `node hosting/preview.mjs`, `node city-heist/test-hosted.cjs` and `TEST_BASE_URL=http://127.0.0.1:8005 node over-the-hill/test-hosted.cjs`.
