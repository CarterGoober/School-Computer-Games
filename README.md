# Afterclass Garage

An installable, offline game hub with three original games for land and sea. No external game links, assets, dependencies, accounts, or ads.

## Games

**Tideline** (`tide.html`): a side-view 2D boat game with layered coastal scenery, detailed ships, animated loading docks, buoyancy and hull pitch, sea spray, wakes, and passing waves. Choose a vessel and Easy, Medium, or Hard waters:

- **M.V. Wayfarer / Cargo ship:** operate the Westhaven crane to load six individual containers from the dock into the ship’s marked bays. A/D moves the trolley; W/S raises/lowers the hook; tapping Space grabs or releases. The rope uses a damped, variable-length pendulum: loads lag during acceleration, swing through braking, and carry momentum when dropped. Lift above neighboring stacks, fill the lower bays before stacking the upper row, and use gentle releases to engage the loading guides. Missed drops are recovered to the dock. All six containers must settle on board before E releases the moorings and switches to sailing controls. Sail to Northstar Pier, stop in the berth, and hold E to unload. Pirates approach in small boats and attempt to board. Aim and click to fire the deck gun, or hold F to fire water cannons on both sides. Water pressure recharges when released. Boarding reaches 100% if pirates are left unchecked.
- **M.S. Sundancer / Cruise ship:** hold E to watch 24 passengers walk along the dock and up the railed gangway into the ship. Passengers count as aboard only after reaching the door; releasing E pauses their walk. Deliver everyone safely. Engine failures require repeated Space presses (holding does not work). If a passenger falls overboard, brake with S, reverse with A / Left back to the life ring, stop nearby, and hold E to rescue them before their timer expires. You cannot finish while a passenger is missing.
- **Rough seas:** large waves and tsunamis approach with warnings, move through the water, pitch and lift the ship smoothly, slow it down, and damage the hull once per impact. Braking reduces impact damage. Higher difficulties have shorter incident/wave intervals, a greater tsunami chance, larger waves, tougher pirates, and shorter rescue timers. Loading and delivery docks are sheltered. A broken hull, a successful pirate boarding, or a missed rescue ends the voyage.
- **Repairs and records:** stop and hold R for three seconds to spend one repair kit and restore up to 35% hull. Easy provides three kits; Medium and Hard provide two. Completed voyages earn a score based on the delivery, hull, difficulty, speed, rescues, and pirates repelled. Best scores are stored locally per ship and difficulty under `tideline-voyages`.

Tideline crane controls: **A/D** moves the trolley, **W/S** raises/lowers the hook, **tap Space** grabs/releases, and **E** departs after all six containers are secured. Arrow keys and on-screen hold buttons also operate the crane. The ship stays moored, hazards stay inactive, and the voyage timer stays stopped during loading. Loaded containers keep their colors and bay positions at sea.

Tideline sailing controls: **D / Right / W / Up** to sail forward, **A / Left** to reverse, **S / Down** to brake, **E** to board passengers/deliver/rescue, **F** for cargo water cannons, **aim + click** for the cargo deck gun, **tap Space** to restart cruise engines, **hold R** to repair, **Escape / P** to pause. On touch devices, hold the sail, brake, context, repair, or cannon buttons; tap the engine button repeatedly. Inactive windows pause automatically. Optional engine audio defaults off. Both ship illustrations, scenery, and interfaces are original Canvas/SVG artwork inspired by a side-view boat-game reference, with no third-party artwork.

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

The four free starter vehicles have different acceleration, grip, steering, and maximum speeds: Sunset Coupe, Trail Pickup, Little Locomotive (with two following wagons), and a stylized Ferrari SF90 fan tribute. Models are original low-poly approximations without branded logos; this is not an official Ferrari product. All street layouts and scenery are original.

Steer while holding the handbrake to slide and earn style points. Sustained slides increase a multiplier. Ramp jumps earn airtime bonuses and trigger a slow-motion orbiting camera with letterbox bars. Turn **JUMP CAM** off to keep real-time driving and the regular chase camera; it defaults off for reduced-motion preferences. Obstacles are solid: hitting a street barrier or barrel slows/rebounds the vehicle and adds one second. A complete lap requires all four checkpoints. Best lap times are stored separately for each vehicle and route. Drift score is shown during and at the end of each run.

## Points, daily tasks, and the garage

Each game has a separate wallet, collection, and three daily tasks. Open **PTS / GARAGE** inside a game to view tasks, buy cargo boxes or spray cans, preview every design, and equip an unlocked item. Tasks rotate at midnight using the device’s local date and automatically award their points once completed. The hub displays each balance. Points are earned through play; there are no payments or accounts.

- Racing: complete a lap for points, earn a larger speed bonus for faster times, and earn a bonus when improving an existing personal best. More difficult circuits multiply the finish reward. Sunday Slide also awards **45 points per jump** and **12 points per full second of sustained drifting**. The original style score remains separate from spendable points.
- Tideline: **20 points per secured container**, plus **120** for a perfect placement: a low, centered, slow release with little swing. Earn **70** for each pirate boat repelled, **40** per engine restart, and **100** per rescue. Medium multiplies incident/completion rewards by **1.5**, Hard by **2.2**. Deliveries also earn a speed bonus and a bonus for improving a previous delivery time. Points already earned remain if a run ends early.
- Daily tasks award **120–260** points each and include finishing, checkpoints, distance, drifts, jumps, cargo, perfect loading, pirates, engine restarts, and rescues as appropriate for the game.

Both racing games offer six independently unlockable vehicles: **Apex GT3**, **Land Yacht** (boat on wheels), **Runway Rebel** (an airplane that drives like a car), **Heartbreaker**, **Crate Escape** (a wheeled cargo box), and **Trident X** (the Ultra car/boat/airplane hybrid). Apex Circuit has seven total rides; Sunday Slide has ten. New vehicles have distinct silhouettes and handling. All thirteen models across the hub, including both ships, have three individually named Rare, Legendary, and Ultra liveries: **39 unique designs** with procedural patterns and colors. Train liveries extend to both drifting wagons.

| Pack tier | Cargo box price | Spray can price | Rare reward | Legendary reward | Ultra reward |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rare | 600 | 300 | 85% | 14% | 1% |
| Legendary | 1,800 | 900 | 25% | 65% | 10% |
| Ultra | 4,800 | 2,700 | 5% | 30% | 65% |

A cargo box unlocks one vehicle; a spray can unlocks one livery for a vehicle already owned in that game. Tideline offers spray cans for its two ships. The reward is selected by rarity, then uniformly from that rarity’s eligible collection, including items already owned. Trident X is the only Ultra vehicle. Every duplicate refunds **exactly two-thirds of the purchase price**; prices are divisible by three. Odds, costs, and refund amounts appear before purchase.

Opening animations use original cargo-box and spray-can artwork with green Rare, gold Legendary, and prismatic Ultra effects. Tap the object to reveal it, or choose **Reveal now**. Reduced-motion settings disable looping effects. Rewards are saved at purchase, so closing an animation does not lose an item. Equipping during a paused game applies on the next run. Progress is saved under `afterclass-progress-apex`, `afterclass-progress-drift`, and `afterclass-progress-tide`, preserving existing lap and voyage records. If storage writes fail, new progress continues for that session and the garage shows a storage notice. Clearing site data removes progress.

## Run locally

```sh
cd /workspace/School-Computer-Games
python3 -m http.server 8000 --bind 0.0.0.0
```

No installation or build needed. Open the served root to choose a game.

Racing controls: WASD or arrow keys to drive; Space for handbrake/drift; C to recover (+2 seconds); R to restart; Escape to pause/resume. Pointer/touch buttons appear on coarse-pointer devices, with a dedicated drift button in Sunday Slide. Inactive windows pause automatically. Click the upper-left HUB logo to return to the hub.

## Install on a Chromebook

Host the files at an HTTPS static host such as GitHub Pages. Open the hub once, wait for **OFFLINE READY**, then use **Install the garage** when available or Chrome's **Install page as app** menu command. Launch Afterclass Garage from the Chromebook Launcher to open it in a standalone app window. All three games and all routes are cached for offline use. Initial load requires an allowed internet connection and installation requires browser/device permission. This app does not bypass school restrictions. Localhost is also a secure context for development; file:// and remote plain HTTP do not support PWA installation.

Existing installed copies of Apex Circuit use the same app identity and scope. After deploying this update, reopen/reload while online so the new service worker installs, then reload to see the hub. Existing Apex lap records are preserved. The new street layouts use separate Sunday Slide lap records so old countryside times are not compared against new routes; the old records remain stored on the device. Clearing site data removes records and cached files.

## Verify

```sh
node --check app.js
node --check drift.js
node --check hub.js
node --check sw.js
node --check tide.js
node --check tide-art.js
node --check tide-physics.js
node --check tide-crane.js
node test-tide-crane.cjs
node test-tide.cjs
node test-tide-boarding.cjs
node test-progression.cjs
node test-physics.cjs
node test-drift.cjs
node test-drift-smoothing.cjs
node test-urban-tracks.cjs
```

Physics tests drive complete circuits, exercise ordered checkpoints, acceleration, drift scoring, each vehicle, wagon following, jumping/landing, recovery, and obstacle penalties. Browser checks cover hub navigation, vehicle/track selection, keyboard driving, jump cinematics, camera toggle, pause, responsive layouts, and offline reload/driving in both games. Rendering uses depth-tested WebGL geometry for Sunday Slide, with a Canvas 2D fallback for devices without WebGL. Apex Circuit uses Canvas 2D projection. Both use capped pixel density and fixed-step physics. Regression tests also cover takeoff direction, landing continuity, independent cargo drift, elevated-road support, the figure-eight crossing, street scenery clearance, and full laps with scenery collisions. Boats and cranes are decorative; buildings and container stacks are solid, and driving into harbor water recovers the vehicle to the road.

Tideline runs on Canvas 2D at capped pixel density, with a separate fixed-step simulation in `tide-physics.js`. Crane tests load all six boxes using the normal controls and verify physical grabs, acceleration/braking swing, damping, mooring, missed-drop recovery, stacking, and explicit departure. Voyage tests complete all six ship/difficulty combinations with two seeds each (including manual crane loading for cargo), and verify boarding, guns, cannon pressure, engine restarts, rescue range/speed/timeouts, delivery requirements, repairs, single wave impacts, speed-dependent damage, sinking, smooth buoyancy, and increasing hazard frequency. Browser checks cover real keyboard and pointer controls, pause/focus, mission completion and records, small screens, and offline play. No test hooks are exposed in the game UI.

Progression tests verify separate wallets, all 39 liveries, tier odds, exact duplicate refunds, ownership/equipment persistence, daily rollover, repeat-event protection, gameplay payouts, storage fallback, and complete laps in all six new Apex vehicles. Sunday Slide tests drive all ten vehicles on all five routes. Boarding tests verify walking and arrival-based counts, paused footsteps, and reverse rescue after overshooting. Browser checks exercise purchases and reveals, equipment, responsive layouts, real controls, and service-worker offline reloads.

All game assets must be included in `sw.js`. Increment its cache version after changing cached assets. Deploy the repository root with GitHub Pages using `main` / `(root)`; `.nojekyll` prevents a Jekyll build. No credentials are shipped to clients.
