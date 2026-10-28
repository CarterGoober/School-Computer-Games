# Afterclass Garage

An installable, offline game hub with two original stylized driving games. No external game links, assets, dependencies, accounts, or ads.

## Games

**Apex Circuit** (`apex.html`): the original precision time trial racer, with three circuits, checkpoint recovery, and device-local personal bests. Existing Apex lap records remain intact.

**Sunday Slide** (`drift.html`): a suburban drift-and-jump racer. Asphalt roads, sidewalks, rounded trees and wheels, beveled car bodies, detailed house and shop facades, street lights, and atmospheric distance haze. Five original routes:

| Route | Character | Jumps | Obstacles |
| --- | --- | --- | --- |
| Cloverleaf 8 | Figure-eight with a raised crossing | 1 | 2 |
| Maplewood Loop | Suburban streets and front gardens | 1 | 2 |
| Downtown Grid | City blocks, shops, and crosswalks | 0 | 3 |
| Harbor Run | Waterfront, boats, cranes, and container stacks | 2 | 2 |
| Warehouse District | Loading docks and elevated service roads | 3 | 3 |

Jump flight follows the vehicle’s heading at takeoff and holds that direction through landing, without carrying sideways drift into the air. Lower, rounded ramps and shorter high-speed jump arcs reduce overshoots. Camera position, aim, and slow-motion transitions ease in and out. Vehicles and both train wagons have damped suspension and slope-following body pitch; wagons retain independent lateral momentum while staying coupled. Continuous road support prevents elevation swaps near switchbacks.

Four vehicles have different acceleration, grip, steering, and maximum speeds: Sunset Coupe, Trail Pickup, Little Locomotive (with two following wagons), and a stylized Ferrari SF90 fan tribute. Models are original low-poly approximations without branded logos; this is not an official Ferrari product. All street layouts and scenery are original.

Steer while holding the handbrake to slide and earn style points. Sustained slides increase a multiplier. Ramp jumps earn airtime bonuses and trigger a slow-motion orbiting camera with letterbox bars. Turn **JUMP CAM** off to keep real-time driving and the regular chase camera; it defaults off for reduced-motion preferences. Obstacles are solid: hitting a street barrier or barrel slows/rebounds the vehicle and adds one second. A complete lap requires all four checkpoints. Best lap times are stored separately for each vehicle and route. Drift score is shown during and at the end of each run.

## Run locally

```sh
cd /workspace/School-Computer-Games
python3 -m http.server 8000 --bind 0.0.0.0
```

No installation or build needed. Open the served root to choose a game.

Controls: WASD or arrow keys to drive; Space for handbrake/drift; C to recover (+2 seconds); R to restart; Escape to pause/resume. Pointer/touch buttons appear on coarse-pointer devices, with a dedicated drift button in Sunday Slide. Inactive windows pause automatically. Click the upper-left HUB logo to return to the hub.

## Install on a Chromebook

Host the files at an HTTPS static host such as GitHub Pages. Open the hub once, wait for **OFFLINE READY**, then use **Install the garage** when available or Chrome's **Install page as app** menu command. Launch Afterclass Garage from the Chromebook Launcher to open it in a standalone app window. Both games and all routes are cached for offline use. Initial load requires an allowed internet connection and installation requires browser/device permission. This app does not bypass school restrictions. Localhost is also a secure context for development; file:// and remote plain HTTP do not support PWA installation.

Existing installed copies of Apex Circuit use the same app identity and scope. After deploying this update, reopen/reload while online so the new service worker installs, then reload to see the hub. Existing Apex lap records are preserved. The new street layouts use separate Sunday Slide lap records so old countryside times are not compared against new routes; the old records remain stored on the device. Clearing site data removes records and cached files.

## Verify

```sh
node --check app.js
node --check drift.js
node --check hub.js
node --check sw.js
node test-physics.cjs
node test-drift.cjs
node test-drift-smoothing.cjs
node test-urban-tracks.cjs
```

Physics tests drive complete circuits, exercise ordered checkpoints, acceleration, drift scoring, each vehicle, wagon following, jumping/landing, recovery, and obstacle penalties. Browser checks cover hub navigation, vehicle/track selection, keyboard driving, jump cinematics, camera toggle, pause, responsive layouts, and offline reload/driving in both games. Rendering uses depth-tested WebGL geometry for Sunday Slide, with a Canvas 2D fallback for devices without WebGL. Apex Circuit uses Canvas 2D projection. Both use capped pixel density and fixed-step physics. Regression tests also cover takeoff direction, landing continuity, independent cargo drift, elevated-road support, the figure-eight crossing, street scenery clearance, and full laps with scenery collisions. Boats and cranes are decorative; buildings and container stacks are solid, and driving into harbor water recovers the vehicle to the road.

All game assets must be included in `sw.js`. Increment its cache version after changing cached assets. Deploy the repository root with GitHub Pages using `main` / `(root)`; `.nojekyll` prevents a Jekyll build. No credentials are shipped to clients.
