# Afterclass Garage

An installable, offline game hub with two original low-poly driving games. No external game links, assets, dependencies, accounts, or ads.

## Games

**Apex Circuit** (`apex.html`): the original precision time trial racer, with three circuits, checkpoint recovery, and device-local personal bests. Existing Apex lap records remain intact.

**Sunday Slide** (`drift.html`): a relaxed countryside drift-and-jump racer. Warm colors, cottages, fences, dusty roads, and an original scenic style. Five routes:

| Route | Character | Jumps | Obstacles |
| --- | --- | --- | --- |
| Golden Meadows | Broad, easy sweepers | 1 | 2 |
| Canyon Postcards | Desert curves | 2 | 2 |
| Pine & Switchback | Technical hairpins | 0 | 3 |
| Lakeside Leisure | Wide lakeside roads | 2 | 2 |
| The Long Way Home | Rolling elevated roads | 3 | 3 |

Jump flight follows the vehicle’s heading at takeoff and holds that direction through landing, without carrying sideways drift into the air. Lower, rounded ramps and shorter high-speed jump arcs reduce overshoots. Camera position, aim, and slow-motion transitions ease in and out. Vehicles and both train wagons have damped suspension and slope-following body pitch; wagons retain independent lateral momentum while staying coupled. Continuous road support prevents elevation swaps near switchbacks.

Four vehicles have different acceleration, grip, steering, and maximum speeds: Sunset Coupe, Trail Pickup, Little Locomotive (with two following wagons), and a stylized Ferrari SF90 fan tribute. Models are original low-poly approximations without branded logos; this is not an official Ferrari product. Sunday Slide is not affiliated with Over the Hill.

Steer while holding the handbrake to slide and earn style points. Sustained slides increase a multiplier. Ramp jumps earn airtime bonuses and trigger a slow-motion orbiting camera with letterbox bars. Turn **JUMP CAM** off to keep real-time driving and the regular chase camera; it defaults off for reduced-motion preferences. Obstacles are solid: hitting a hay bale or log slows/rebounds the vehicle and adds one second. A complete lap requires all four checkpoints. Best lap times are stored separately for each vehicle and route. Drift score is shown during and at the end of each run.

## Run locally

```sh
cd /workspace/School-Computer-Games
python3 -m http.server 8000 --bind 0.0.0.0
```

No installation or build needed. Open the served root to choose a game.

Controls: WASD or arrow keys to drive; Space for handbrake/drift; C to recover (+2 seconds); R to restart; Escape to pause/resume. Pointer/touch buttons appear on coarse-pointer devices, with a dedicated drift button in Sunday Slide. Inactive windows pause automatically. Click the upper-left HUB logo to return to the hub.

## Install on a Chromebook

Host the files at an HTTPS static host such as GitHub Pages. Open the hub once, wait for **OFFLINE READY**, then use **Install the garage** when available or Chrome's **Install page as app** menu command. Launch Afterclass Garage from the Chromebook Launcher to open it in a standalone app window. Both games and all routes are cached for offline use. Initial load requires an allowed internet connection and installation requires browser/device permission. This app does not bypass school restrictions. Localhost is also a secure context for development; file:// and remote plain HTTP do not support PWA installation.

Existing installed copies of Apex Circuit use the same app identity and scope. After deploying this update, reopen/reload while online so the new service worker installs, then reload to see the hub. Existing lap records are preserved. Clearing site data removes records and cached files.

## Verify

```sh
node --check app.js
node --check drift.js
node --check hub.js
node --check sw.js
node test-physics.cjs
node test-drift.cjs
node test-drift-smoothing.cjs
```

Physics tests drive complete circuits, exercise ordered checkpoints, acceleration, drift scoring, each vehicle, wagon following, jumping/landing, recovery, and obstacle penalties. Browser checks cover hub navigation, vehicle/track selection, keyboard driving, jump cinematics, camera toggle, pause, responsive layouts, and offline reload/driving in both games. Rendering uses depth-tested WebGL geometry for Sunday Slide, with a Canvas 2D fallback for devices without WebGL. Apex Circuit uses Canvas 2D projection. Both use capped pixel density and fixed-step physics. Regression tests also cover takeoff direction, landing continuity, independent cargo drift, and elevated-road support.

All game assets must be included in `sw.js`. Increment its cache version after changing cached assets. Deploy the repository root with GitHub Pages using `main` / `(root)`; `.nojekyll` prevents a Jekyll build. No credentials are shipped to clients.
