## Public game

Play at https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.site/over-the-hill/ . The garage and a shared-world backend are deployed through Sites. The hosted backend uses Cloudflare Workers with durable D1 player positions, server-side simulation of validated inputs, atomic version checks, and snapshots every 150 ms. It advances the simulation on input requests; it does not require the development machine or a player host. All players use the same database and valley. The hosted capacity limit is 24 active sessions, not a load-tested guarantee. The original Node/SSE implementation below remains available for local or self-hosted use.

Run `node hosting/build.cjs` to build the Worker artifact. `.openai/hosting.json` retains the Site identity and DB binding, and `drizzle/` contains the hosted schema migration. The deployment archive includes `dist/server/index.js`, `dist/.openai/hosting.json`, and `drizzle/`. Do not publish runtime saves or credentials. The optional `connection-check.html` page verifies real joins, server-simulated movement, snapshots, and reconnect without requiring WebGL.

Existing saves on another website origin remain there: browser storage does not automatically transfer to this new address.

# Over the Hill — Ashen Vale

An original, peaceful 3D off-road game for Afterclass Garage. One enclosed classic-inspired Wren 88 wagon explores a fixed 8 × 8 km watershed with eight regions, about 30 km of connected routes, 26 landmarks, five irregular lakes/ponds, and an Alder River crossing. There are no races, accounts, room codes, payments, or remote artwork.

## Launch the complete garage and shared world

Requires Node.js 18 or newer; no npm dependencies or build step.

```sh
cd School-Computer-Games
node over-the-hill/server.cjs
```

Open **http://localhost:8001/** for the garage, or **http://localhost:8001/over-the-hill/** for the game. Press **PLAY**. Every browser using this server joins the same Ashen Vale automatically. On another device on your LAN, use this computer's address and port 8001; localhost on another device refers to that other device. The server must remain running. For installed/offline support outside localhost, use HTTPS.

The game has been tested against a local running server, including two independent browser contexts. The public hosted alternative is linked above. The homepage does not advertise LIVE/ONLINE availability. An actual connection must succeed before the game displays the person icon and real player count. A static GitHub Pages deployment plays solo and reports the server unavailable; it cannot host the Node multiplayer server.

For solo development, the original root command still works:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Open `/over-the-hill/`. After an online first visit caches v18, the game also plays solo offline. Multiplayer API requests bypass the service worker and are never cached.

## Controls and flow

- W / Up: accelerate. S / Down: brake moving forward, then reverse.
- A / Left turns left; D / Right turns right. Steering reverses naturally while backing up.
- Space: firm brake. R: recover to the nearest trail, facing its forward direction.
- Escape / P or the gear button: pause/settings. Resume retries a failed server connection. Return to trailhead resets only the wagon; journal discoveries remain.
- C: close/wide chase camera. There is no map, map button, compass, or permanent discovery overlay.
- Fullscreen button: browser fullscreen when permitted.
- Touch: hold steering plus throttle/brake together; simultaneous pointers work. Canceled touches and focus loss clear inputs. Losing focus pauses driving.

The small speed/gear display remains visible. Driving hints fade after 12 seconds of moving. Location captions fade in, hold approximately three seconds, then fade out for two seconds; staying within the same place does not retrigger them. The title appears only on the start/pause card. Optional engine sound starts off. Graphics cycle low/balanced/high; all levels adapt resolution under sustained load.

## How multiplayer works

`server.cjs` is a single authoritative world process. It serves the whole garage, accepts validated control inputs over same-origin HTTP POST, simulates vehicles at 60 Hz, and streams snapshots at 10 Hz over **Server-Sent Events**. This is real server synchronization, not simulated other drivers. Clients predict their own driving, reconcile position, interpolate remote vehicles, and show each connected explorer with a name and a distinct wagon color. Vehicles can pass through each other to keep exploration peaceful. There is no remote chat.

Joining creates an opaque anonymous reconnect token. Rejoining with that token restores identity and position. Event-stream loss removes the vehicle from other clients; the browser retries the join automatically. Stale input brakes on the server after 400 ms. Leaving the browser clears inputs and stops its wagon. Disconnected sessions are retired after 30 seconds. The current capacity is 40 sessions, including recently disconnected sessions. This is not a load-tested concurrency guarantee.

The deterministic landscape is the same for everyone. Player positions are atomically saved every five seconds and on orderly shutdown, and restored after a server restart. `WORLD_DATA` selects the save path; the default is `work/hill-world.json`. Keep that file/volume between deployments. A crash can lose up to five seconds of position. Discoveries remain local to each browser under `hill-journal-v1`; the reconnect token uses `hill-session-v1`. Existing Garage progress, currency, collections, tasks and records are not read or written by this game.

## Deploy a public shared world

1. Copy the **whole repository** to a host with a long-running Node.js process and a persistent disk. Serve this application at the domain root. Static-only/serverless function hosting is insufficient for the permanent simulation and event streams.
2. Run exactly **one instance/replica** of `node over-the-hill/server.cjs`. Set `HOST=127.0.0.1`, `PORT=8001`, and `WORLD_DATA=/var/lib/afterclass/hill-world.json`; give the process user write access to that directory. Use systemd or the host's process supervisor to restart the process on failure. Do not create per-player instances.
3. Put an HTTPS reverse proxy on the same hostname in front of the Node process, forwarding the entire garage. For nginx:

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

4. Enable TLS using your host's certificate workflow. Preserve the persistent save file during redeployment. Keep one replica: multiple independent processes would create separate worlds.
5. Check `https://YOUR-DOMAIN/over-the-hill/api/health`, then open two independent browsers at `/over-the-hill/`. Both should report two explorers and see the other wagon move. Test disconnect/rejoin and a process restart. Do this before advertising online availability.

No custom client URL or lobby configuration is needed: clients connect to their current origin. The public host, HTTPS, cross-network latency, proxy behavior, and production capacity remain deployment validation tasks. A cross-origin multiplayer host is deliberately not configured.

## Art, dynamics and performance

All meshes, terrain, route layout, wagon details, props and materials are original code in this directory. The cover is an actual in-game capture. No Copilot Over the Hill implementation was present in the supplied Git checkout/history, so no previous implementation could be identified for deletion. No pre-existing tracked game or shared renderer was removed or reused. The repository at baseline `264d8ff` contained four playable game entries and the central shop; all remain intact.

Terrain uses continuous height samples and shared vertex colors. Elevation, continuous slope normals, moisture and low-frequency noise blend grass, soil and rock; the terrain bypasses flat face shading. Light procedural surface detail is applied in the shader. Shared grid vertices receive identical colors at chunk boundaries. Props retain low-poly face lighting. The trail is subdivided, has blended shoulders, and clears its underlying terrain mesh. The distant ridges are original layered silhouettes, not fog masks over random terrain colors.

The fixed-step simulation has four independent terrain contacts, damped heave, pitch and roll, speed-sensitive bicycle steering, slope forces, braking, reverse, collision clearance and bounded wheel travel. Tires keep a fixed radius and width; suspension changes their hub positions, never their scale. Physical and rendered wheel centers share compression/droop limits. This is a purpose-built lightweight off-road approximation, not a full rigid-body tire simulation.

The standalone WebGL renderer uploads scenery to cached spatial GPU batches, culls cells by view/distance, limits fine ground detail to nearby cells, and uploads only moving vehicles each frame. Low/balanced/high cap pixel density at 0.6/0.85/1.25 and near/middle draw distances at 900/1300/1700 metres; the coarse full-watershed horizon remains visible. Sustained slow frames reduce resolution automatically. Soft ground shadows use lightweight interpolated vertex colors rather than shadow maps. No external engines, CDNs or image requests are needed. Actual school Chromebook hardware has not been measured in this environment; headless Chromium software rendering is only a useful stress check.

## Verification

From the repository root:

```sh
node over-the-hill/test-physics.cjs
node over-the-hill/test-world.cjs
node over-the-hill/test-server.cjs
# Start the server separately before these browser tests:
node over-the-hill/test-browser.cjs
node over-the-hill/test-visual.cjs
```

Browser tests require Playwright and Chromium, consistent with the existing repository tests. `TEST_BASE_URL` and `CHROMIUM_PATH` are supported by the multiplayer browser suite. Review screenshots are written to `work/hill-review/`; they are not player data. Tests use isolated browser profiles and never submit feedback to the live backend.

Physics checks cover settling, acceleration, braking, reverse, actual left/right displacement, independent slope contacts, tire travel bounds and a long rough-ground run. A route follower drives the complete forest/mountain circuit with scenery collisions. Server tests cover authoritative inputs, snapshots, reconnect identity and disk persistence across restart. Browser tests cover two independent clients, visible remote movement, leave/rejoin/reconnect, real WASD/arrows and simultaneous touch steering, pause/reset, discovery persistence, graphics/camera options and responsive layouts. Visual checks cover shared terrain vertex colors, timed HUD fades, camera clearance, WebGL errors at seven places, flagship placement, offline driving and the four original games offline.

### Results in this checkout

All five new suites passed against the local build. The two-client suite also exercises a silent event stream, page lifecycle reconnect, and parked pause/resume. All 13 existing simulation/economy suites passed, as did the existing `test-browser.cjs` garage/feedback/game/offline suite. `test-shop-browser.cjs` fails its iframe filter assertion at line 22 (`aria-pressed` is initially `false`); this same failure was reproduced against an untouched archive of baseline `264d8ff`. Shop implementation files are unchanged. The feedback database suite was not rerun: this change does not alter its schema or service.

## Fixed watershed and surface interactions

See `docs/ashen-vale-geography.md` for the authored regional plan. The geographic bounds cover 64 km²; the deliberate content consists of the connected 30 km road network and 26 landmark clusters, with deterministic wilderness dressing between them. This is finite terrain, not an infinite generator. All first-time sessions start at (0,0), north-facing. Existing reconnect identities, positions, discovery indices and Garage saves are retained.

The client streams 128 m cells with 8 m near terrain and 32 m distant terrain, plus a coarse full-watershed horizon. Shared-coordinate colors and gradient lighting avoid triangle color seams. Near scenery is batched per cell; lighter distant groves fill the middle distance. GPU buffers and collision caches are bounded and discarded outside the active area. Graphics settings control distance and detail; resolution adapts to frame time.

Stillwater, Mirrorfen, Southwind Mere, Alder Pool and the Three Sisters tarn have authored irregular shorelines, graded sand banks and shallow beds. The Alder River descends south, with a timber crossing and a rock cascade. Water uses depth-based transparency, animated highlights, a cheap sky-reflection approximation and shoreline foam. It does not render ray-traced or full scene reflections.

Server and client use identical wheel-depth, chassis-immersion, traction, drag and bounded buoyancy calculations. Dry sand has greater rolling resistance than wet sand; gravel permits mild steering slip. Deeper water gradually reduces propulsion and steering authority. R recovers onto the nearest route. Tire ripples, splashes and fading sand impressions are bounded local effects derived from synchronized vehicles; no fluid simulation or extra effect network packets are used.

Validation commands: `node over-the-hill/test-water.cjs`, `node over-the-hill/test-watershed.cjs`, `node over-the-hill/test-physics.cjs`, then the browser and visual suites with the server running. The visual suite drives more than 6 km through streamed cells in Chromium after inspecting seven locations. Physical Chromebook frame rates, 24-player load and long-duration Internet latency remain device/deployment checks, not guarantees.

The expanded-world inspection recorded approximately 13–38 FPS using headless Chromium’s CPU-based SwiftShader renderer at seven locations. Dense forest is the heaviest scene; these figures are not measurements of Chromebook hardware. The Node and Worker/D1-preview two-client suites both passed. The offline suite checks the featured Garage link, preserved old game links, and the cached new world launching solo.
