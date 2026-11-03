# Wren and streaming validation

The baseline synchronous world-stream call at spawn took 2,118 ms, with a 36 ms p95 across 30 streaming calls. The browser now uses a worker for terrain, water, scenery construction, normals, colors and typed-buffer packing. Renderer uploads are paced separately. This measures CPU loading work, not hardware GPU frame rate.

In Chromium SwiftShader at 1000×700, high mode, inspected woods, Copperwood rocks, Stillwater shore and Lantern Pass. Before the final bounded-backdrop refinement, stream calls measured 0.9 ms maximum / 0.1 ms p95; GPU geometry preparation measured 3.5 ms maximum / 0.6 ms p95. Worker builds around 145–168 ms ran off the main thread. Software-rendered frame averages remained around 250 ms under concurrent test load; this is not a Chromebook hardware benchmark. The final backdrop keeps distant ground present while nearby detail streams and is limited to the player's vicinity.

Passed: test-vehicle, test-models, test-physics, test-stability, test-network, test-rocks, test-water, test-watershed, test-server, test-network-browser and test-offline. Rock-spur physics runs measured at most 3.34 cm chassis rise per 120 Hz step and bounded wheel contact. Browser checks covered real shared movement, stale snapshot handling, recovery acknowledgement, leaving, saved identity rejoin, camera clearance and offline launch. Existing Summit Run and wallet code is unchanged.

Remaining limits: physical Chromebook profiling, a full multiplayer load test and subjective playtesting. The vehicle uses an efficient four-contact suspension model with animated mechanisms, not a general rigid-body physics engine.

Final bounded-backdrop profile on the same browser: main-thread stream max 0.7 ms / p95 0.1 ms; geometry preparation max 2.9 ms / p95 0.3 ms. Smoothed software frame times remained 157–173 ms in this run. The comparison demonstrates removal of main-thread loading work, not guaranteed total FPS.

## Prepared-trail refinement

The subsequent pass retains all 20 independent vehicle transforms while sharing four wheel/spring/shock/arm mesh families and the axle mesh: the exported GLB is 957,208 bytes (previously 1,673,564 bytes), with seven shared runtime geometries. The lower body and boxed frame have wheel clearance. Front wheels now use inside/outside steering angles. Soil/gravel, grass, rock, sand and water retain distinct continuous response parameters.

Terrain groups now carry cell/LOD identities. Replacement groups are staged one per frame and shown together only when complete; old cell geometry stays visible during preparation. PLAY waits for a complete rendered trailhead. This fixes a 31.9 ms preparation spike seen when all groups in a cell were prepared in one frame. The final Chromium high-mode run measured preparation max 4.0 ms / p95 0.6 ms, stream calls max 5.1 ms / p95 0.1 ms. Final software FPS was 13.7; it is not a physical Chromebook result.

`test-prepared-trails.cjs` verifies prepared PLAY, shared runtime geometry, actual A/D movement, and rendered terrain/camera clearance in Copperwood, the rock garden, Stillwater and Lantern Pass. The run had no page/renderer errors. Physics, all three spurs, all five authored long routes, water crossings, two independent Worker-preview clients, recovery/rejoin, offline loading, Node persistence, Summit Run, wallet migration and shop checks also passed. Physical GPU profiling and full multiplayer-load testing remain open.
