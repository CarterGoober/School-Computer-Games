# Ridge roads validation

The final roads follow solved contours on two fixed ridges. An early constant-grade implementation created artificial trenches in screenshots and was replaced before publication. Contour transitions blend neighboring road samples to avoid abrupt elevation switches. Broad-radius switchbacks and 2 m nearby mountain-road meshes improved drivability and rendered contact.

Vehicle measurements, same flat terrain / 120 Hz: cruising speed 8.5309 -> 10.3024 m/s (+20.8%); speed after three seconds 7.3783 -> 9.0489 m/s (+22.6%). Forward force and downhill cap increase 25%. One m/s converts to 2.2369362920544 mph; a browser assertion checks 10 m/s displays 22 mph. Lateral acceleration is bounded at high speed.

Both new roads were driven end to end in both directions using the actual physics, obstacle collisions, throttle, steering and brakes. The driver slows to crawl speed for hairpins. Maximum centreline deviations were 4.08/4.14 m on Longback and 4.63/4.78 m on Eagleback. Chassis pitch reached its 0.55-radian limit on the steepest sections; these are challenging routes. The tests verify finite states, road clearance and completion. Full-lock fast turns, braking and a minute of faster uneven-slope driving also passed.

All five original long roads, all three rock-crawl spurs, lake and river crossings, two independent Worker-preview clients, delayed-snapshot handling, recovery, leaving/rejoining, offline loading and Node persistence passed. Summit Run's physics/rewards checks passed. Existing shared spawn is unchanged.

Chromium inspected Longback hairpins/crown and Eagleback cliffs/pass in high graphics, with no page errors. The final streamed inspection measured stream calls max 0.7 ms / p95 0.1 ms and geometry preparation max 1.6 ms / p95 0.3 ms. CPU SwiftShader rendered about 10.5 FPS. These are loading measurements and software-renderer observations, not a physical Chromebook benchmark or full-server load test. Four-view browser tests use relocation; complete mountain drives are physics tests.

A fixed 225-cell sample contains 4,201 rock candidates (previously 1,973); sampled peak height is about 1,452 m (previously about 1,003 m). New roads total 9.67 km, with summit road elevations near 1,037 and 1,156 m. The map remains the same finite shared watershed.
