# City Heist — Harbor Home / gameplay overhaul

## What changed

- The menu-only hideout is now Harbor Home: an authored 1,100×960 private neighborhood with a connected lane, paths, lighting, garden details, house furnishings, workshop, smuggler counter and departure office. All four buildings have doors, solid walls/furniture, visible interiors and E prompts. Base movement uses the same 40 Hz prediction/reconciliation as the city, with the base's collision map.
- House storage, backpack and equipment use original icon/grid artwork. Select a stack, choose a quantity and transfer/store/equip. Partial transfers split stacks; matching items stack automatically. Weapon, armor and three medical slots are explicit. Existing200 valuables/50 gear storage limits,20 carried items and five equipment units are enforced. The UI shows the combined250 storage total; the separate old valuables/gear limits still apply.
- Smuggler purchases go into the backpack. Selling requires carried valuables and presence inside the shop. Owned vehicles are selected/sold at the garage; deployment requires the departure building. Extraction returns to the base and secures goods/equipment/current non-rental car. Elimination drops carried gear/goods and applies the existing deployed-car loss rules. Safe cash, stash and un-deployed cars are preserved.
- Steering turns more promptly, with smooth yaw response and existing per-tier handling differences. Space is a held handbrake, with real bounded lateral velocity and exponential traction recovery, shared by client/server. Safe exit searches remain; entering a car now checks the path through walls. Recovery clears lateral/steering momentum.
- Shooting immediately predicts local bullet travel, muzzle feedback and optional sound. Server shot IDs suppress a duplicate tracer and show authoritative impacts only. A bounded urgent input flush sends a firing command without waiting behind the periodic exchange. Server cooldowns advance with consumed fixed steps, fixing collapsed fire cadence when commands arrive together. Damage, range, walls, roles and targets remain server validated.
- Interaction/robbery bars replay pending held inputs and render between fixed steps. Presentation stops just below completion until authority confirms; no client loot or role awards. Loading remains an actual connection state, with no invented percentage.
- Police-issued gear is loaned and cannot be accumulated by repeatedly enlisting and returning home. Personal equipment is restored on safe return, and remains at risk on elimination.

## Persistence, privacy and future parties

Canonical stash/gear/loot/loadout arrays remain compatible with existing saves. `packGear` stores unequipped carried equipment; no new database table or destructive migration. Existing menu-hideout coordinates migrate once to the base spawn; active city runs stay in the city.

Stack IDs reference server-held units and are valid only for an inventory revision. The server validates source/destination, integer quantity, capacity and equipment uniqueness. It obtains value/type from canonical data, never the request. Each successful transfer updates the revision; stale transfers fail. Existing monotonically sequenced actions and Node serialized commits / hosted D1 compare-and-swap prevent replay and concurrent double application.

`base.js` owns the private map, service locations and instance descriptor `{id: 'base:'+owner, kind:'base', owner, access:'private', party:null}`. City scope remains `bluewater-2`. Public snapshots omit other users' base coordinates/inventory; base snapshots omit city cars/projectiles. City collision and combat are city-only. Private bases cannot collide with, shoot or expose each other's contents.

Future party membership/invitation checks can resolve an instance descriptor and deployment group before the existing map/movement/inventory boundary. No invitation, shared house, party roster or squad deployment feature is enabled now. Owner storage remains separate from future visitor movement permissions.

## Actual checks

- **38 core/API/motion tests passed** (`test-core`, `test-api`, `test-overhaul`, `test-base`). Includes base walls/doors/privacy, shop location checks, partial transfer/stack conservation, forged quantities, stale revisions, duplicate equipment, exact extraction quantities, loss rules, once-only garage sale, police loans, entry-through-wall rejection, handbrake slip/recovery, per-tier turn direction, shot cadence/deduplication, bounded input time, prediction replay and original city rules.
- **Two independent Chromium contexts, real keyboard/pointer controls** (`test-base-browser`): walk into house, split a camera stack, equip/unequip, walk to shop, sell/buy/equip, select owned sedan at garage, deploy two private bases into the same city, drive/steer/handbrake, exit, hold F with continuous progress, delayed-network local bullet feedback, and retain stash/cash/equipment after restarting the server. Both contexts saw only themselves in their base. No page errors.
- **Two-browser expedition**: seeded store/station starts; actual police enlistment and robbery alert,10-second loot, interior roof fade, walking out through the door and west to extraction, return to private base, walk to house and smuggler, sell carried goods, restart server and verify cash. Fixtures are not claimed as driving from deployment to the initial store.
- **Two-browser general test**: real deployment, driving, role hold, shared chat, map/waypoint and reload/reconnect.
- **Hosted Worker + migrated SQLite D1 adapter**: four concurrent guests walk to services, make purchases, reject duplicate actions, preserve currency/privacy, deploy, exchange chat, consume acknowledged commands and reconnect. The existing Over the Hill hosted suite also passes (manual gears/reverse, tow permission/attachment/detach, CAS/privacy/reconnect).
- Garage wallet migration, progression, shop and Trenches core tests passed. All service-worker assets served successfully. Ten fixed-world expansion/streaming tests passed. Hosting migration journal and Worker startup checks passed (about371ms startup in the measured run). No Over the Hill gameplay/map files were changed.

## Measured latency and rendering

Local Chromium with two contexts,1100×760 viewport; input interception adds150ms before request and150ms after response. The firing run drops every ninth input request; driving drops every thirteenth. These are short individual samples, not a hardware benchmark or statistical guarantee.

| Measurement | Prior release | This release |
| --- | ---: | ---: |
| Click → visible bullet |754ms|12.8ms|
| Click → confirmed hit feedback |754ms|341.4ms|
| Confirmed target damage |23 HP|23 HP|
| Final prediction correction |0|0|

The old muzzle flash was already local (about4ms); its **bullet** waited for authority. The new visual bullet is speculative; it never awards damage. The priority flush reduced measured confirmation delay, but confirmation still depends on real network/HTTP polling and server/storage latency. There is no historical hit rewind.

Separate final driving sample: **3.6ms** to visible movement; frame median/p95 **16.7/16.7ms**; Canvas submission CPU median/p95 **0.7/1.1ms**; input RTT median/p95 **314.5/329ms**;19 pending commands during injected latency,0 final correction. Recent server wall timings0.60–5.20ms, simulation/snapshot CPU0.08–1.14ms. Handbrake sample: lateral velocity about19.7 units/s while forward speed was63, then normal grip recovery (also unit tested).

Final firing sample:146 frames, median16.7ms/p9516.8ms; Canvas CPU p951.6ms. Earlier general-test reload sample was only18 frames and recorded p95100.1ms; do not interpret the quiet sample as proof that all startup/reload spikes disappeared. Frame telemetry now records uncapped elapsed time, separately from the50ms simulation-delta bound. The prior release capped this telemetry, so its frame-spike distribution is not directly comparable.

Artifacts are local ignored files under `work/`: `base-browser.log`, `base-browser-profile.json`, `base-expedition.log`, `base-hosted.log`, `base-driving-profile.json`, `shot-before.log`, `shot-after-priority.log`, screenshots `base-neighborhood.png`, `base-inventory.png`, `base-smuggler.png`. No guest credentials are included in these reported metrics.

## Limits

No physical Chromebook,24 simultaneous browsers, large persistent population, sustained public-network packet-loss stress or exhaustive district driving test was performed. Canvas CPU submission is not GPU execution time. Hosted transport is still request-driven HTTP/D1 rather than a persistent real-time room server. Server confirmations and remote snapshots can lag on poor connections; local prediction does not make those round trips disappear. Guests still rely on the original browser secret key. Parties are architecture only.
