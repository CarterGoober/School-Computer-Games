# World, winch and manual transmission

Extend the existing Three.js/cannon-es game, preserving saves, shared authority, the three current spawn coordinates, old landmarks/indices, garage and five other games.

Approach: extend the existing authored geography and streaming system; retain the shared force-based simulation. A replacement renderer/physics engine would discard tested collision and multiplayer work. A larger coordinate box alone would not meet the request: new connected roads, distinct terrain/vegetation regions and discoveries are required.

The fixed world grows from 8×8 km to 16×16 km (x -8000…8000, z -5000…11000). Keep old central geography stable, connect additional mountain, lake, canyon and forest districts to existing roads, append landmarks, and use the same map on server/client. New mountains are collidable heightfield terrain and roads are graded for wheel-driven climbing. Publish height.bounds for physics boundaries.

Four graphics presets retain Low/Balanced/High and add PC Ultra. A wider coarse terrain horizon, intermediate terrain/forest LOD, preloading, complete-cell swaps and soft distance transitions replace the short cutoff. PC quality is the priority; software-rendering fallback remains explicit and measurements are reported separately from physical hardware.

Manual: 1–6 select forward gears; Right Shift selects reverse. W is throttle in the selected direction; S is service brake in manual mode. Use an automatic clutch, brief torque interruption during shifts, lower-gear climbing torque, higher-gear low-speed lugging and rev limits. Fourth retains the old force/speed curve; fifth/sixth extend speed. Reject reverse at speed and downshifts that would over-rev. Gear/RPM/shift state and validated controls are serialized for authority and prediction. Legacy clients without a gear field retain the earlier control behavior during rollout. New clients start in first with the parking brake engaged. Touch gets gear controls; MPH/current gear remain minimal.

Winch: clicking a floating nameplate requests a tow with facing bumper anchors. Right Ctrl accepts the active incoming request; existing buttons allow decline/touch acceptance. No cable until authoritative consent, expiry and range validation. Preserve existing reel controls, cable forces, length/tension caps, detach, shared collisions and friction parking brake. Ignore transmission/accept shortcuts while typing chat or editing inputs.

Validation: isolated physics tests for six gears/reverse/shift guards/climbs/high-speed stability; session/Worker tests for gear synchronization and consent/range/expiry; browser keyboard, clickable nameplates, Right Ctrl, chat isolation, touch and two-to-four-client towing. Inspect old/new regions and distance scenery; measure streaming/upload and total frame times. Publish through the retained Sites identity and verify the actual public backend.
