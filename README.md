# Afterclass Garage

An installable, offline game hub with four original games for land, sea, and the rooftop. All game assets are local, with no accounts or ads. Public feedback uses Supabase and requires an internet connection.

## Games

**Tideline** (`tide.html`): a side-view 2D boat game with layered coastal scenery, detailed ships, animated loading docks, buoyancy and hull pitch, sea spray, wakes, and passing waves. Choose a vessel and Easy, Medium, or Hard waters:

- **M.V. Wayfarer / Cargo ship:** operate the Westhaven crane to load six individual containers from the dock onto the ship’s open cargo deck. A/D moves the trolley; W/S raises/lowers the hook; tapping Space grabs or releases. The rope uses a damped, variable-length pendulum: loads lag during acceleration, swing through braking, and carry momentum when dropped. Lift above neighboring stacks and release anywhere on the cargo deck. Containers slide under friction, stack where they land, and can be picked up again to rebalance the load—even after all six are aboard. There are no slots or snap-to-position guides. Missed drops are recovered to the dock during loading. All six containers must settle on board before E releases the moorings and switches to sailing controls. At departure the exact layout stays in place. Waves, hull pitch, and acceleration can shift loose cargo; overhanging or tall stacks are less stable. Boxes that fall overboard are lost for that voyage. Each lost container removes one-sixth of the completion/speed bonus, and a partial delivery cannot set a delivery-time record. Action and daily points already earned remain. Sail to Northstar Pier, stop in the berth, and hold E to unload the remaining cargo. Pirates approach in small boats and attempt to board. Aim and click to fire the deck gun, or hold F to fire water cannons on both sides. Water pressure recharges when released. Boarding reaches 100% if pirates are left unchecked.
- **M.S. Sundancer / Cruise ship:** hold E to watch 24 passengers walk along the dock and up the railed gangway into the ship. Passengers count as aboard only after reaching the door; releasing E pauses their walk. Deliver everyone safely. Engine failures require repeated Space presses (holding does not work). If a passenger falls overboard, brake with S, reverse with A / Left back to the life ring, stop nearby, and hold E to rescue them before their timer expires. You cannot finish while a passenger is missing.
- **Rough seas:** large waves and tsunamis approach with warnings, move through the water, pitch and lift the ship smoothly, slow it down, and damage the hull once per impact. Braking reduces impact damage. Higher difficulties have shorter incident/wave intervals, a greater tsunami chance, larger waves, tougher pirates, and shorter rescue timers. Loading and delivery docks are sheltered. A broken hull, a successful pirate boarding, or a missed rescue ends the voyage.
- **Repairs and records:** stop and hold R for three seconds to spend one repair kit and restore up to 35% hull. Easy provides three kits; Medium and Hard provide two. Completed voyages earn a score based on the delivery, hull, difficulty, speed, rescues, and pirates repelled. Best scores are stored locally per ship and difficulty under `tideline-voyages`.

Tideline crane controls: **A/D** moves the trolley, **W/S** raises/lowers the hook, **tap Space** grabs/releases, and **E** departs after all six containers have settled on deck. Arrow keys and on-screen hold buttons also operate the crane. The ship stays moored, hazards stay inactive, and the voyage timer stays stopped during loading. Loaded containers keep their colors and exact placement at sea, moving only when physical forces overcome their support and friction.

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

Steer while holding the handbrake to slide and increase the style score. Sustained slides increase a multiplier. Ramp jumps earn airtime bonuses and trigger a slow-motion orbiting camera with letterbox bars. The camera holds for at least 1.8 seconds of unpaused viewing time, even on a short, fast Ferrari jump, and stays through touchdown before a 0.45-second fade back to driving. Camera timing does not alter the jump trajectory or landing position. Turn **JUMP CAM** off to keep real-time driving and the regular chase camera; it defaults off for reduced-motion preferences. Obstacles are solid: hitting a street barrier or barrel slows/rebounds the vehicle and adds one second. A complete lap requires all four checkpoints. Best lap times are stored separately for each vehicle and route. Drift score is shown during and at the end of each run.

## Rooftop Rumble

`basketball.html` is an original, locally rendered one-button basketball game with four upright players, flexible animated limbs, and a full-viewport court. The paper, sage, olive, and clay colors follow the existing Garage. **2-player mode:** W controls Sage and Up Arrow controls Clay, two characters per team. **4-player mode:** W, R, I, P control characters 1–4. Hold a key, its touch button, or the corresponding court region to jump, move toward the ball (or into shooting position with possession), and progressively raise the shooting arm. Release to shoot. Duration controls power and angle; position, momentum, gravity, wind, defenders and rebounds determine the result. There is no hoop-targeted trajectory solver or forced scoring probability. Holding never auto-fires or repeatedly jumps. Players lean slightly and flex their limbs while their torsos stay upright. Four simultaneous touch controls support local mobile play. Escape or the small menu button pauses; Resume continues and New match resets the match. The menu also offers 2/4-player selection and optional browser full screen. Pause, focus loss and canceled touches clear held input without shooting. Losing focus pauses automatically.

First team to at least 5 wins. Each basket resets the court and randomly changes the conditions: classic, low gravity, icy court, beach ball, heavy ball, tiny ball, long legs, short players, double points, or wind. Double-point baskets count as 2. Player movement, collisions, backboards, rims, gravity, and wind run at a fixed 120 Hz. Players can jump past each other and raised arms can contest possession. There are no remote assets or multiplayer servers. Basketball currently has no collectible items, daily tasks, or point rewards. The central shop covers the other three games.

## Public feedback

The homepage accepts public reviews (1–5 stars), bug reports, and ideas for any game or the hub. Usernames are unverified nicknames; no sign-in is required. Game/type filters show the 20 most recent matching entries. Average ratings use the latest visible review per browser and game. Feedback needs internet access; cached game assets remain playable offline.

See [`feedback-backend/README.md`](feedback-backend/README.md) and [`feedback-backend/setup.sql`](feedback-backend/setup.sql) for setup, validation, permissions, moderation, and rate-limit details. The supplied project already had a feedback table and two functions; the update preserves that table and submissions and adds basketball plus type filtering. Draft fields and retry IDs are stored locally. Failed or unconfirmed requests keep the draft; only a server-confirmed matching submission ID clears it. User text is inserted with `textContent`.

## Points, daily tasks, and the garage

The **central shop** (`shop.html`) uses the shared **Garage Points** wallet. Open **The shop** on the homepage or **Central shop** inside a game’s **PTS / GARAGE**. Games embed this same shop over the paused game, keeping the current run intact. Daily tasks and vehicle/livery selection remain inside each game. Each game keeps its own collection and three daily tasks. Tasks rotate at midnight using the device’s local date and automatically award their points once completed. The homepage and every existing game shop display the same shared balance. Points are earned through play; there are no payments or accounts. New gameplay earnings are 30% lower than the central-shop release (`3ccb7d5`): the previous 0.85 multiplier is now 0.595. Daily rewards are 70% of their previous whole-point values, rounded to whole points. Existing balances and previously claimed rewards are not reduced. Fractional gameplay earnings carry forward across events and reloads before whole points are awarded; drift time also accumulates across short bursts. Cargo boxes and spray cans cost 1.5× their previous prices; individual featured items cost 2×. Odds and the two-thirds duplicate-refund fraction are unchanged, as are existing balances and owned items.

- Racing: complete a lap for points, earn a larger speed bonus for faster times, and earn a bonus when improving an existing personal best. More difficult circuits multiply the finish reward. Sunday Slide also awards **5.355 points per jump** and **1.19 points per second of sustained drifting**, accumulating fractions before awarding whole points. The original style score remains separate from spendable points.
- Tideline: **2.38 points per container loaded**, plus **14.28** for a perfect placement: a low, slow release with little swing that settles on a well-supported base. Loading and perfect-placement awards pay only once per box, even if it is repositioned. Earn **8.33** for each pirate boat repelled, **4.76** per engine restart, and **11.9** per rescue. Medium multiplies incident/completion rewards by **1.5**, Hard by **2.2**. Deliveries also earn a speed bonus and a bonus for improving a previous delivery time. Points already earned remain if a run ends early.
- Daily tasks award **14–31** points each and include finishing, checkpoints, distance, drifts, jumps, cargo, perfect loading, pirates, engine restarts, and rescues as appropriate for the game.

Both racing games offer six independently unlockable vehicles: **Apex GT3**, **Land Yacht** (boat on wheels), **Runway Rebel** (an airplane that drives like a car), **Heartbreaker**, **Crate Escape** (a wheeled cargo box), and **Trident X** (the Ultra car/boat/airplane hybrid). Apex Circuit has seven total rides; Sunday Slide has ten. New vehicles have distinct silhouettes and handling. All thirteen models across the hub, including both ships, have three individually named Rare, Legendary, and Ultra liveries: **39 unique designs** with procedural patterns and colors. Train liveries extend to both drifting wagons. Both ships receive complete material repaints across their original hull, cabins, decks, funnels, lifeboats, and trim, preserving the original outline. Loose cargo containers retain their identifying colors.

| Pack tier | Cargo box price | Spray can price | Rare reward | Legendary reward | Ultra reward |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rare | 900 | 450 | 85% | 14% | 1% |
| Legendary | 2,700 | 1,350 | 25% | 65% | 10% |
| Ultra | 7,200 | 4,050 | 5% | 30% | 65% |

A cargo box unlocks one vehicle; a spray can unlocks one livery for a vehicle already owned in that game. Tideline offers spray cans for its two ships. The reward is selected by rarity, then uniformly from that rarity’s eligible collection, including items already owned. Trident X is the only Ultra vehicle. Every duplicate refunds **exactly two-thirds of the purchase price**; prices are divisible by three. Odds, costs, and refund amounts appear before purchase.

Opening animations use original cargo-box and spray-can artwork with green Rare, gold Legendary, and prismatic Ultra effects. Tap the object to reveal it, or choose **Reveal now**. Reduced-motion settings disable looping effects. Rewards are saved at purchase, so closing an animation does not lose an item. Equipping during a paused game applies on the next run. The first visit migrates the three legacy balances into `afterclass-garage-v2` exactly once. The wallet and game profiles share one storage record so purchases, rewards, and unlocks commit together. Existing owned vehicles, liveries, equipped items, records, and current daily-task progress/claims are retained. Legacy `afterclass-progress-apex`, `afterclass-progress-drift`, and `afterclass-progress-tide` keys remain untouched as recovery copies; separate lap-record keys are also untouched. A failed or unreadable migration never overwrites the legacy saves. The shared wallet is local to this browser and origin, not synchronized across devices. If storage writes fail, new progress continues for that session and the garage shows a storage notice. Clearing site data removes progress.

## Run locally

```sh
cd /workspace/School-Computer-Games
python3 -m http.server 8000 --bind 0.0.0.0
```

No installation or build needed. Open the served root to choose a game.

Racing controls: WASD or arrow keys to drive; Space for handbrake/drift; C to recover (+2 seconds); R to restart; Escape to pause/resume. Pointer/touch buttons appear on coarse-pointer devices, with a dedicated drift button in Sunday Slide. Inactive windows pause automatically. Click the upper-left HUB logo to return to the hub.

## Install on a Chromebook

Host the files at an HTTPS static host such as GitHub Pages. Open the hub once, wait for **OFFLINE READY**, then use **Install the garage** when available or Chrome's **Install page as app** menu command. Launch Afterclass Garage from the Chromebook Launcher to open it in a standalone app window. All five games and all routes are cached for offline use. Initial load requires an allowed internet connection and installation requires browser/device permission. This app does not bypass school restrictions. Localhost is also a secure context for development; file:// and remote plain HTTP do not support PWA installation.

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
node --check tide-cargo.js
node --check drift-cinematic.js
node test-tide-crane.cjs
node test-tide-cargo.cjs
node test-tide.cjs
node test-tide-boarding.cjs
node test-progression.cjs
node test-physics.cjs
node test-drift.cjs
node test-drift-smoothing.cjs
node test-drift-cinematic.cjs
node test-urban-tracks.cjs
```

Physics tests drive complete circuits, exercise ordered checkpoints, acceleration, drift scoring, each vehicle, wagon following, jumping/landing, recovery, and obstacle penalties. Browser checks cover hub navigation, vehicle/track selection, keyboard driving, jump cinematics, camera toggle, pause, responsive layouts, and offline reload/driving in both games. Rendering uses depth-tested WebGL geometry for Sunday Slide, with a Canvas 2D fallback for devices without WebGL. Apex Circuit uses Canvas 2D projection. Both use capped pixel density and fixed-step physics. Regression tests also cover takeoff direction, landing continuity, independent cargo drift, elevated-road support, the figure-eight crossing, street scenery clearance, and full laps with scenery collisions. Boats and cranes are decorative; buildings and container stacks are solid, and driving into harbor water recovers the vehicle to the road.

Tideline runs on Canvas 2D at capped pixel density, with a separate fixed-step simulation in `tide-physics.js`. Crane tests load all six boxes using the normal controls and verify physical grabs, acceleration/braking swing, damping, mooring, missed-drop recovery, stacking, and explicit departure. Cargo regression tests cover free releases and friction, departure continuity, regrabbing, reward deduplication, balanced versus overhanging stacks in the same tsunami, overboard debris, partial deliveries, and bounded completion penalties for all difficulties. Cinematic tests compare identical Ferrari landings with the camera enabled and disabled at three speeds, plus minimum viewing time, pause, recovery, and fade behavior at 30/60/120 FPS. Voyage tests complete all six ship/difficulty combinations with two seeds each (including manual crane loading for cargo), and verify boarding, guns, cannon pressure, engine restarts, rescue range/speed/timeouts, delivery requirements, repairs, single wave impacts, speed-dependent damage, sinking, smooth buoyancy, and increasing hazard frequency. Browser checks cover real keyboard and pointer controls, pause/focus, mission completion and records, small screens, and offline play. No test hooks are exposed in the game UI.

Progression tests verify the shared wallet, all 39 liveries, tier odds, exact duplicate refunds, ownership/equipment persistence, daily rollover, repeat-event protection, reduced gameplay payouts without changing saved balances or prices, storage fallback, and complete laps in all six new Apex vehicles. Sunday Slide tests drive all ten vehicles on all five routes. Boarding tests verify walking and arrival-based counts, paused footsteps, and reverse rescue after overshooting. Browser checks exercise purchases and reveals, equipment, responsive layouts, real controls, and service-worker offline reloads. Rendering comparisons check all six boat liveries across hulls, cabins, and funnels while preserving surrounding pixels; an end-to-end cargo check loads freely, loses an overhanging box to a tsunami, and completes the reduced payout.

All game assets must be included in `sw.js`. Increment its cache version after changing cached assets. Deploy the repository root with GitHub Pages using `main` / `(root)`; `.nojekyll` prevents a Jekyll build. Only the Supabase public publishable key is shipped to clients; no secret or service-role key is used.


### Tests added for this update

```sh
node test-wallet-migration.cjs
node test-basketball.cjs
# Database tests use a disposable in-memory PostgreSQL instance, never live Supabase.
npm install --prefix /tmp/garage-db-tests --save-exact @electric-sql/pglite@0.3.14
NODE_PATH=/tmp/garage-db-tests/node_modules node test-feedback-db.cjs
# Browser tests require Playwright and Chromium, with the local server running.
node test-browser.cjs
```

`test-browser.cjs` accepts `TEST_BASE_URL` and `CHROMIUM_PATH`. It intercepts every Supabase request: submission success/failure and unsafe-text fixtures stay entirely local. It checks actual keyboard and simultaneous touch controls, pause/restart/win screens, shared shop balances, preserved feedback drafts, responsive layouts, and all four games loaded offline. `test-feedback-db.cjs` checks idempotent setup, input validation, permissions, retries, minute/day rate limits, rating deduplication, filters, and moderation in an isolated database. `test-basketball.cjs` checks both modes, upright bodies in all ten conditions, hold/release timing, made and missed physical shots, distance sensitivity, canceled inputs, and complete matches through normal hold/release inputs.


### Preservation review

Compared the revised files with the available `e815bc1` commit. The original hub CSS is retained verbatim; only the added basketball card and shared-balance styles follow it. Measured original header, intro, Tideline card, Sunday Slide card and Apex row dimensions/positions match the reference. The new feedback section is scoped to its own selectors and uses the original theme variables and serif heading style.

Apex/Drift/Tideline styles, original cover assets, track geometry, physics, jump cinematics, scenery, fleet/boat artwork, and crane/cargo code remain byte-identical to `e815bc1`; the existing shop stylesheet is retained with small central-shop container additions. Existing game entry files only have reward wording changes from the shared-wallet update. Vehicle/livery catalog changes are limited to the shared currency name. Shop previews, odds, rarity colors and cargo-box/spray-can reveal animations are retained. Prices are now adjusted as listed above. Reference screenshots were taken from an isolated archive, without resetting the working tree or touching player saves.


### Central shop and daily offers

`shop.html`, `shop.css`, and `shop.js` provide one filtered storefront for Apex Circuit, Sunday Slide, and Tideline. The homepage gains only a navigation link and an updated shop link in its existing strip. Game renderers, artwork, tracks, controls, and physics are unchanged. `garage-ui.js` keeps local collections and tasks, while all shop entry points load the shared storefront. `garage-reveal.js` reuses the original cargo-box/spray-can SVGs, rarity effects, tap animation, reward preview, duplicate message, and equip action. Package details show the actual eligible items, their per-opening odds, ownership, price, and exact duplicate refund before confirmation.

There are exactly two garage-wide featured offers each UTC day: one existing unlockable vehicle and one existing livery. `shop-catalog.js` uses fixed permutations of unique items and the UTC day number, independent of wallet, ownership, locale, or refresh. Consecutive days never repeat an item; the game assignment cycles deterministically among applicable games. Game filters can hide an offer but never generate a replacement. Offers rotate at 00:00 UTC with a countdown, and checkout rejects an expired confirmation.

| Rarity | Guaranteed vehicle | Guaranteed livery |
| --- | ---: | ---: |
| Rare | 4,800 | 2,400 |
| Legendary | 18,000 | 9,000 |
| Ultra | 57,600 | 32,400 |

All prices are Garage Points. Featured purchases guarantee the pictured item for its labeled game and are disabled once owned. A direct livery offer can be bought before its vehicle: the confirmation explicitly says the vehicle is not included, the livery remains saved, and equipping waits until the vehicle is owned. Random cans still draw only from owned vehicles. Tideline has no vehicle boxes because both ships are starters. The economy adjustment doubles these direct prices independently of the 1.5× box/can increase, so the increases do not compound. Task structure, drop odds, and the two-thirds refund fraction remain unchanged. New gameplay and daily-task earnings are 30% lower.

Daily rotation uses the **device clock**, even offline. Devices with the same correct UTC date see identical selections. Changing the clock changes the offers; there is no trusted server time or anti-cheat claim. Purchases/ownership are local to this browser, not account-synced. The shop and its queried in-game URL are cached by service worker v15 for offline browsing, purchases, reveals, and equipping.

Central checkout uses Web Locks to serialize purchases across same-origin tabs, validates current funds/ownership/offer again, and stores the wallet, collection, and retry receipt in a single localStorage write. Repeated confirmations use the same transaction ID; the most recent 128 receipts survive reloads. The UI disables confirmation while pending and during the reveal. A failed durable write leaves the original wallet and collection intact and reports failure. Purchases require an HTTPS/localhost secure context and a current browser supporting Web Locks; unsupported browsers can still browse. This protects normal shop transactions, not deliberate edits to local saves.

Run the additional checks with a local server:

```sh
node test-shop.cjs
node test-wallet-migration.cjs
TEST_BASE_URL=http://127.0.0.1:8000 node test-shop-browser.cjs
```

`test-shop.cjs` covers 900 UTC rotations, yesterday avoidance, exact premium prices, contents/odds, insufficient funds, duplicate refunds, guaranteed ownership, stale offers, simultaneous confirmations/contexts, storage failure, equipment, reloads, unowned-vehicle livery retention, and preserved claims/records/earnings. The Chromium suite tests actual desktop/Chromebook/touch layouts, filters and previews, purchases and reveals, in-game equipping and return links, simultaneous tabs, midnight expiration, persistence, and offline purchases including the embedded query URL. All points and saves used by browser tests belong to isolated local test profiles. Supabase requests are blocked; no live feedback is submitted. Screenshots default to `/tmp/central-shop-review` (`SHOP_SCREENSHOTS` can override).


### Summit Run — mountain train runner

Launch `train.html` from the new Summit Run hub card. The original Little Locomotive proportions, red/umber colors, cab, chimney, roof and two cargo wagons are rebuilt as faceted 3D geometry. Three separate narrow mountain ridges carry one rail line each, with downhill grades, automatic yellow jump ramps, broken tracks and rocks on sections with alternative escape tracks. Original layered peaks rise through a cloud sea directly below the ridges. Sunrise/day/sunset/starry night transition continuously over a 210-second cycle of active play.

Controls: W/Up throttle; S/Down brake; Space jump; A/D or Left/Right steer **only in the air**; Escape pause; R new run. Touch controls support simultaneous throttle/jump and release safely on pointer cancellation or loss of focus. Ramps launch automatically. Stay on the same path or transfer to an open ridge. Brake priority keeps speed positive; the minimum/coasting/maximum pace all increase over the first five minutes, then cap for fair reaction windows. Missing a landing or hitting a rock ends the run. Successful landings add 25 score; track changes add another 35. Distance also adds score. Best score/distance use the separate `afterclass-summit-v1` save.

Garage Points use the current shared-wallet economy multiplier (0.595), with fractions retained between events and runs: successful landing base 6 (3.57 GP), track transfer extra base 3 (1.785 GP), every 10 active seconds base 3 (1.785 GP), every 1,000 score base 10 (5.95 GP), and one personal-best bonus per completed run above the previous record and at least 300 score, base 30 (17.85 GP). Pausing/falling produces no survival awards; failed landings award nothing. `train-rewards.js` deduplicates events by run and milestone; `Progression.awardGarage` credits a separate hub-rewards ledger in the existing wallet, leaving game profiles, daily tasks and collections intact. This game has no new purchasable vehicles/liveries yet.

`train-physics.js` is a pure deterministic 120 Hz simulation with bounded world/history storage. `train-art.js` draws procedural 3D polygons on Canvas 2D with capped device-pixel ratio and distance fade; there are no remote assets. `train.js` manages menus, keyboard/touch, records, rewards and visibility pause. `train-cover.svg` is original artwork. The v16 service worker caches every train asset for offline play; the existing shop and wallet remain available offline. The feedback selector/backend now accepts `train`, with the original validation, permissions and moderation unchanged; no live review fixtures were posted.

Verified checks:

```sh
node test-train.cjs
TEST_BASE_URL=http://127.0.0.1:8000 node test-train-browser.cjs
node test-wallet-migration.cjs
node test-shop.cjs
NODE_PATH=/tmp/garage-db-tests/node_modules node test-feedback-db.cjs
```

Physics tests cover downhill movement, brake priority, increasing pace, on-rail restriction, manual/automatic jumping, midair transfers, landing failures, rocks, bounded memory, and twelve three-minute runs using normal inputs across seeds and throttle/coast/brake strategies. Rewards tests cover current scaling, successful landings, milestones, record thresholds, deduplication and unchanged existing profiles. Actual Chromium checks cover keyboard play, forced transfers, pause/blur, records/reload, wallet updates, real portrait/landscape and simultaneous touch controls, offline play/shop access, and day/sunset/night screenshots. Browser checks use isolated local profiles. No physical Chromebook hardware benchmark is claimed.
