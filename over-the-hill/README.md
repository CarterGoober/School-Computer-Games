# Over the Hill — Ashen Vale

A peaceful 3D expedition in Afterclass Garage. One original, Blender-built Wren 88 wagon explores a fixed 8 × 8 km watershed: autumn woods, evergreen wilderness, meadows, canyons, lakes, highland passes and snowy ridges. Authored roads, shorelines and landmarks have identical positions for everyone. Spatial streaming changes detail and visibility, never the world layout.

Play: **https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.site/over-the-hill/**

## Run locally

Requires Node.js 18+; the game has no runtime npm dependencies.

```sh
node over-the-hill/server.cjs
```

Open **http://localhost:8001/** for the complete garage, or **http://localhost:8001/over-the-hill/**. Keep the process running. Other devices use the server computer's LAN address, not their own localhost. A static server (`python3 -m http.server 8000`) supports solo play only. An offline first visit cannot download the game; after a successful cached visit, offline solo play remains available.

Choose a temporary name and one of the three previewed starting locations, then PLAY. All locations join **one server/world**. The first driver at a location gets its designated spawn; simultaneous arrivals stage a few metres along that same trail to prevent overlapping rigid bodies. Reconnects preserve identity and position. The tiny person icon counts actual active sessions. No map, minimap, compass, lobby or room code is used. Return to the garage using the corner arrow or pause menu.

## Controls

- **W / Up** accelerate; **S / Down** service brake, then reverse.
- **A / Left** turns left; **D / Right** turns right.
- **Space** toggles the rear-wheel parking brake. Release it before driving; the small PARKING BRAKE indicator shows its state. The touch STOP button toggles the same brake.
- **R** recovers onto a nearby trail. Pause → Return to trailhead resets only the wagon.
- Drag mouse/touchpad/touch to orbit through 360°; scroll to zoom. Auto-center is optional. **C** changes chase distance.
- **Esc / P** pauses. Pausing applies tire brakes; gravity, collisions and towing continue on the server.
- **Enter** opens/sends chat; **Esc** closes chat. Typing does not steer the wagon.
- **People** lists nearby explorers, tow requests, Mute and Report. **Winch** selects your bumper and the target bumper. Request a connection in People; the target must Accept.
- **E / Q** reel the cable in/out; **X** disconnects. Touch buttons support holding the reel controls. Either connected player can disconnect; only the requester controls reeling.

The HUD retains mph/gear, optional controls and small multiplayer buttons. Location captions hold briefly and fade away. Driving hints disappear after learning. Graphics cycle low/balanced/high with adaptive resolution; sound defaults off. Focus loss clears driving inputs and applies brakes. Parking applies friction, never a frozen transform: sufficient towing, impacts or a steep slope can move the car.

## Shared physics and synchronization

`physics.js` uses vendored MIT-licensed cannon-es 0.20.0. All dynamic wagons share **one** six-degree-of-freedom rigid-body scene under `(0,-9.81,0)` gravity, with 1,500 kg compound chassis colliders and four raycast suspension contacts. Suspension springs/damping, tire impulses, braking, speed-sensitive steering, rolling resistance, water drag and bounded partial buoyancy act through forces/impulses. Vehicles can bump, push, block, become airborne and overturn. R is available for recovery. Wheels are attached raycast mechanisms, not separate loose tire bodies.

Nearby terrain heightfields use the same 2 m samples as terrain geometry. Trees, rocks, logs, structures and rails have simplified fixed colliders. Collision neighborhoods are shared and bounded across all nearby players. Grass, soil, rock, gravel, sand and shallow water retain different traction/resistance. Cosmetic splashes, ripples and tracks are reconstructed locally from synchronized movement.

`session.js` is the common authoritative model for both backends. Clients send sequenced, timestamped **controls**, not accepted positions. The server advances all cars together at a fixed 120 Hz, validates commands and acknowledges applied sequences. Local driving predicts with the same physics, replays unacknowledged controls and reconciles gradually. Remote cars use timestamped snapshots, quaternion/wheel interpolation, an adaptive 80–260 ms buffer and at most 100 ms of extrapolation. Intentional recovery uses a generation identifier; ordered snapshot serials prevent older responses from undoing it.

The cable is a bounded unilateral spring/damper between front/rear bumper anchors, with equal/opposite body forces and torque. It reels at 1.5 m/s, spans 2–25 m and caps tension at 20 kN. Requests expire after 15 seconds and are range/permission checked again on acceptance. This is an efficient towing approximation; it does not wrap around scenery or simulate a segmented rope. The visible cable follows interpolated bumper anchors.

Names require 3–18 permitted characters and must be unique among active sessions; blank names receive a temporary Explorer name. Chat is limited to 160 characters, at least 1.2 seconds between messages and eight messages/minute. The server strips control characters and masks a basic profanity/leet word list. It is not comprehensive language moderation. Messages expire after five minutes, with a bounded recent history. Mute is local to the browser. Reports are rate limited and saved privately in the bounded server report log; they are not an automatic ban or a staffed moderation service. Temporary names are removed on leave/expiry. Opaque reconnect tokens and saved positions remain supported without accounts.

## Hosting

### Public Worker / D1

The published Sites build uses a Cloudflare Worker and D1 binding **DB**. `.openai/hosting.json` preserves the existing project identity. Run:

```sh
node hosting/test-migrations.cjs
node hosting/build.cjs
node hosting/package.cjs work/hosted-release.tar.gz
```

For a disposable local hosted-adapter preview, use **Node 22+** and run `node hosting/preview.mjs` after building; it listens on http://127.0.0.1:8005 and applies the exact Drizzle journal in memory. The Node game server itself still supports Node 18+.

The artifact is `dist/server/index.js`, with `dist/.openai/hosting.json` and `dist/drizzle/`. The package helper includes migration SQL **and** `drizzle/meta/_journal.json` at the **archive root**, together with the Worker output and root hosting configuration. Sites discovers migrations separately from the Worker entrypoint; putting them only under `dist/` skips them. Publish the exact committed source and apply both schema migrations through the hosting deployment flow. `drizzle/0001_shared_physics.sql` adds a singleton shared world without deleting the legacy `hill_players` table. Existing legacy positions are imported on reconnect.

Every exchange atomically commits the **entire shared physics checkpoint** using a D1 revision compare-and-swap. Concurrent requests retry against the winning world revision, so independently updated cars cannot overwrite each other's collision results. Input requests also return a full snapshot; this avoids a second snapshot polling request. The Worker advances fixed physics steps on active requests and retains the world while idle; it is not a dedicated continuously ticking game process. Internet RTT and database latency affect exchange frequency. The configured limit is 24 sessions, not a load-tested capacity guarantee. A dedicated Node process is preferable for consistently low-latency physics at larger concurrency.

### Dedicated Node / SSE

Run **one replica** of `node over-the-hill/server.cjs` behind HTTPS. It ticks the shared scene at 120 Hz and broadcasts SSE snapshots at 20 Hz. Keep proxy buffering and caching off and allow long event streams:

```nginx
location / {
    proxy_pass http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
}
```

Set `HOST=127.0.0.1`, `PORT=8001` and `WORLD_DATA=/var/lib/afterclass/hill-shared-world.json`. Use a process supervisor and a persistent writable disk. State is atomically saved every five seconds and on orderly shutdown; a crash can lose up to five seconds. Active names are retired after restart, while reconnect records remain. The default is `work/hill-shared-world.json`; legacy `work/hill-world.json` records are read without deleting them. Multiple independent Node replicas would create different worlds, so do not run them behind a load balancer as separate simulations.

Inputs older than 900 ms apply parking friction; sessions expire after eight seconds without a heartbeat/action. Isolated request failures are tolerated; sustained failure reconnects automatically. Closing a page sends a best-effort signed leave. Keep both server processes and caches out of public static file access. `/api/health` reports the actual backend mode; `connection-check.html` exercises two real sessions, snapshots, motion and reconnect, then removes its test sessions.

## Assets and performance

The original editable sources are `wren.blend` and `nature.blend`. Rebuild using `blender --background --python tools/create_vehicle.py` or `tools/create_nature.py` from the repository root. Runtime GLBs contain independently animated wheels, axles, springs, shocks, arms and steering links, plus full/reduced-detail trees and scenery. These visual mechanisms follow suspension state; they are not a full joint-based suspension solver. No models were extracted from the reference screenshots or commercial games.

Smooth terrain normals and continuous world-coordinate grass/soil/rock/sand colors avoid random triangle patches. Fixed-world cells are built in `stream-worker.js`, with transferable typed arrays, a preload ring, bounded geometry upload and shader preparation. Nearby selected spawn cells load ahead of the coarse backdrop. Trees use instancing/LOD and subtle movement. Renderer detail and resolution adapt to load; no entire-world high-detail render is created. The sky and water reflections are lightweight approximations. Three.js and cannon-es are vendored with their license notices; no external CDN is required at runtime.

Garage save keys, currency, shop, original game profiles, Summit Run and discovery key `hill-journal-v1` are unchanged. `hill-session-v1` retains the reconnect token; `hill-muted-v1` stores only local mute choices. Browser saves remain tied to the website origin and do not automatically transfer between hosts. No runtime save file or credential belongs in the deployment archive.

## Verification

Run from the repository root:

```sh
node over-the-hill/test-multiplayer2.cjs
node over-the-hill/test-network.cjs
node over-the-hill/test-server.cjs
# With a local Worker/D1 preview running:
TEST_BASE_URL=http://127.0.0.1:8005 node over-the-hill/test-hosted.cjs
node over-the-hill/test-rigid.cjs
node over-the-hill/test-physics.cjs
node over-the-hill/test-water.cjs
# With server.cjs running; requires Playwright and Chromium:
node over-the-hill/test-mp2-browser.cjs
node over-the-hill/test-offline.cjs
```

The multiplayer browser test uses independent browser contexts, real input/actions, injected HTTP latency and dropped input requests. `TEST_BASE_URL` selects a local Node or Worker preview. Detailed measurements and remaining limitations are in [docs/multiplayer-2-validation.md](../docs/multiplayer-2-validation.md). Software Chromium measurements are not a Chromebook hardware benchmark. Physical Chromebook frame rates, full 24-player load, long-duration Internet behavior and comprehensive moderation remain unverified.

Earlier world and asset validation: [geography](../docs/ashen-vale-geography.md), [streaming/model upgrade](../docs/wren-streaming-validation.md), [rigid-body validation](../docs/rigid-validation.md). Some historical test scripts assumed terrain snapping, non-colliding cars or an older cache name; current physics/network tests cover the replacement behavior.
