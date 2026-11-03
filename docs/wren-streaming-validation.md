# Wren and streaming validation

The baseline synchronous world-stream call at spawn took 2,118 ms, with a 36 ms p95 across 30 streaming calls. The browser now uses a worker for terrain, water, scenery construction, normals, colors and typed-buffer packing. Renderer uploads are paced separately. This measures CPU loading work, not hardware GPU frame rate.

In Chromium SwiftShader at 1000×700, high mode, inspected woods, Copperwood rocks, Stillwater shore and Lantern Pass. Before the final bounded-backdrop refinement, stream calls measured 0.9 ms maximum / 0.1 ms p95; GPU geometry preparation measured 3.5 ms maximum / 0.6 ms p95. Worker builds around 145–168 ms ran off the main thread. Software-rendered frame averages remained around 250 ms under concurrent test load; this is not a Chromebook hardware benchmark. The final backdrop keeps distant ground present while nearby detail streams and is limited to the player's vicinity.

Passed: test-vehicle, test-models, test-physics, test-stability, test-network, test-rocks, test-water, test-watershed, test-server, test-network-browser and test-offline. Rock-spur physics runs measured at most 3.34 cm chassis rise per 120 Hz step and bounded wheel contact. Browser checks covered real shared movement, stale snapshot handling, recovery acknowledgement, leaving, saved identity rejoin, camera clearance and offline launch. Existing Summit Run and wallet code is unchanged.

Remaining limits: physical Chromebook profiling, a full multiplayer load test and subjective playtesting. The vehicle uses an efficient four-contact suspension model with animated mechanisms, not a general rigid-body physics engine.

Final bounded-backdrop profile on the same browser: main-thread stream max 0.7 ms / p95 0.1 ms; geometry preparation max 2.9 ms / p95 0.3 ms. Smoothed software frame times remained 157–173 ms in this run. The comparison demonstrates removal of main-thread loading work, not guaranteed total FPS.
