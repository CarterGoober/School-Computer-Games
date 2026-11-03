# Multiplayer 2.0 validation

Date: 2026-11-03. Repository tests use isolated browser profiles and local development backends. No live feedback submissions or player save resets were performed.

## Implementation and scope

Both server adapters use `over-the-hill/session.js` and the same cannon-es shared rigid-body simulation. The Node adapter ticks continuously at 120 Hz and emits 20 Hz SSE snapshots. The published Worker adapter commits a singleton D1 checkpoint with compare-and-swap revisions and advances fixed substeps on HTTP exchanges. It is request driven; it is not a continuously running dedicated game server. Clients predict controls, replay them against shared nearby bodies/cables, reconcile gradually, and buffer remote snapshots by 80–260 ms with at most 100 ms extrapolation.

Temporary names, bounded/rate-limited/filter-masked chat, local mute, private bounded reports, consent-based front/rear towing, reeling/detach and rear-wheel parking friction were added. The world geography, spawn-selection locations, lakes/beaches, minimal map-free HUD, garage integration and all original game/save systems remain. Simultaneous arrivals stage along the selected starting trail to avoid overlapping cars.

## Physics and protocol checks

`test-multiplayer2.cjs` passes real shared-body pushing/blocking, a 30 m/s head-on collision without tunneling, required tow consent, invalid consent rejection, reeling, bounded tension and detach. A towing scenario reached approximately 11.81 kN and moved the parked vehicle using forces. Parking holds modest grades and yields to steep gravity on sand, soil and rock. Chat checks cover basic profanity/leet masking, rate limits, private reports and temporary-name removal.

A long-idle regression exposed the engine's default SAP broadphase: it sorted AABB bounds but terminated using differently ordered sphere bounds. After 7,000 parked ticks among mixed terrain/scenery, two overlapping chassis were absent from its candidate pairs; the naive broadphase correctly found them. The replacement uses consistent AABB bounds, updates translated static collider bounds and bounds each terrain tile to its actual height samples. The regression now passes. Solid-wall blocking and three-biome physics checks also pass after that change.

The shared-session identity regression rejects a mismatched token for an occupied public ID. The hosted adapter hashes the entire opaque token before deriving its public ID; `test-hosted.cjs` verifies forged-prefix isolation, token privacy, concurrent commits, shared chat, tow consent and reconnect against the actual Worker preview.

`test-network.cjs` passes bounded gradual correction, stale-packet rejection, latency projection, bounded input lead, chassis-relative wheel interpolation, 100 ms extrapolation limits and shared cable-force projection during reconciliation. `test-server.cjs` passes joins, safe shared-trail staging, SSE snapshots, authoritative controls/rejection of client coordinates, reconnect identity, disk persistence across process restart, same-origin rejection and private-file isolation.

`test-rigid.cjs`, `test-physics.cjs` and `test-water.cjs` pass Earth gravity, airborne momentum/rotation, landing, left/right displacement, acceleration/braking/reverse, slope contacts, rigid-body checkpoints/rollover, biome driving, sand traction and lake/river entry and exit. These are simulations, not physical tire or fluid validation.

On this execution host, four parked cars among 133 bodies measured a warmed shared physics-step median **0.188 ms**, p95 **0.355 ms**, with a **40.38 ms** maximum during concurrent browser testing. This isolates CPU simulation work; it is not total rendered frame time or a Chromebook benchmark.

## Independent browser clients

`test-mp2-browser.cjs` creates four separate browser contexts, 480 × 320 each, with real rendered scenes. It adds 35–65 ms before each API request and 35–55 ms after the response, and drops every eleventh selected input request. It uses the same exchange transport on both adapters so latency/loss is exercised on actual requests. It checks:

- All four clients join one world and see three other vehicles.
- Actual keyboard throttle pushes another player's shared body.
- Enter chat, remote text, server profanity masking, mute and report.
- Front/rear bumper choice, no cable before consent, target acceptance, reel length reduction, tension, parked-body motion, visible cable state and detach.
- Agreement of settled authoritative positions across clients.
- A sustained request outage removes a session and reconnects its original identity into the same world.
- No page/interpolation exceptions.

The Node run passed its connection, pushing, chat and towing assertions. Its 361 observed requests included 30 injected failures; route-layer RTT median was **108 ms**, p95 **146 ms**. Effective browser-observed RTT was **880–1,214 ms**, because the software renderer/main thread was heavily saturated. Final local correction errors were **0.0008–0.0114 m** in the settled scene; these are point samples, not a universal error bound. The 10.04 m tow cable reeled to 6.14 m, with sampled tension 6.42 kN; the braked requester moved about 2.14 m.

Four concurrent SwiftShader scenes were slow: frame median approximately **417 ms**, p95 **600–650 ms**, maximum **967–1,133 ms** over 132–135 samples/client. These results demonstrate functional stress behavior, **not smooth Chromebook rendering**. The earlier Node run failed during test teardown with an in-flight Playwright route callback; cleanup was corrected. The full hosted-adapter rerun and its final metrics are recorded below.

The full Worker/D1-preview four-browser test **passes with exit code 0**, including independent snapshot agreement within one metre, outage expiry/reconnect with the same identity and no page/interpolation errors. It observed **383 requests**, including **34 deliberately dropped inputs**. Route-layer RTT median was **122 ms**, p95 **157 ms**; effective browser-observed RTT under concurrent software rendering was **1,107–1,340 ms**. Frame medians were approximately **433 ms**, p95 **583–600 ms**, with maxima **667–1,117 ms** across 160–166 samples/client. The adaptive remote buffer reached its 260 ms cap. Settled final local correction samples were **0.00066–0.00659 m**. These results are functional validation under severe CPU rendering load, not evidence of smooth hardware play.

The hosted tow cable shortened from **6.76 m to 3.21 m**, with a sampled **3.88 kN** tension. The parked requester moved about **2.42 m** while the partner also moved. The browser waits for actual authoritative cable length and vehicle displacement rather than assuming a fixed amount of wall-clock time: request-driven simulation can advance more slowly during software-rendering stalls. Chat assertions use unique test messages so short-lived history from previous test sessions cannot satisfy or invalidate delivery/mute checks.

An actual rendered screenshot was inspected for the HUD, vehicles and cable. Runtime metrics/captures stay under ignored `work/` or `/tmp`; they are not player data or published assets.

## Preservation and deployment checks

The offline browser suite passes cached solo launch with the new UI assets, no map HUD, and garage links including Summit Run. Wallet migration, central shop, progression, Apex Circuit, Sunday Slide, Tideline, Summit Run and basketball simulation regression suites pass. Existing garage save and wallet implementation files are unchanged. The service-worker cache is bumped to v28 and includes the new client UI module; multiplayer API responses are never cached.

The first public diagnostic caught a deployment-only missing table: the SQL file existed but had no entry in the Drizzle migration journal. Production logs and database overview confirmed that only the legacy table existed. The journal now appends the new migration without changing the old entry, and the package includes `drizzle/` at the archive root rather than only under `dist/`. `hosting/test-migrations.cjs` guards against unregistered schema changes. `hosting/preview.mjs` follows the journal exactly; the hosted API integration suite passes against that preview. The public diagnostic is rerun after publication.

Build using `node hosting/build.cjs`; package using `node hosting/package.cjs`, which validates the root migration paths. Keep the existing Site identity and D1 binding in `.openai/hosting.json`; deploy both migrations. The new singleton table does not drop legacy player records. Node position files stay under ignored `work/` or an explicitly configured persistent volume. No runtime data or credentials are included in the artifact.

## Remaining limitations

- Physical Chromebook/iPad hardware, production Internet RTT, long-duration sessions and 24 simultaneous players have not been benchmarked.
- The hosted D1 transaction/exchange rate can limit smoothness; a dedicated single Node server is the lower-latency deployment option. Snapshot interpolation cannot conceal a prolonged outage.
- Tire suspension uses raycasts and simplified chassis/scenery shapes. The cable is a bounded spring/damper, without scenery wrapping or rope-segment collisions.
- Profanity masking is a basic word/leet list. Reports are stored privately for manual review; there is no automated ban system or staffed moderation service.
- Long-distance gameplay/world art was preserved from the prior build; this change does not claim a new hardware visual-performance audit of the entire map.
