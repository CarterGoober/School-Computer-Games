# Watershed expansion validation

- Physics: spring settling, acceleration/braking/reverse, actual left/right displacement, independent wheel articulation, bounded travel, recovery heading and long rough-ground stability passed.
- Water: drove across Stillwater from dry shore through wet sand and the bed to the opposite bank; crossed the Alder River and exited onto land. Per-wheel depth stayed nonnegative, chassis stayed above the terrain, and maximum vertical velocity around tested shores was 1.28 m/s. Same flat-surface throttle test reached 8.52 m/s on grass, 5.78 on dry sand and 1.70 in metre-deep water. Five fixed basins were checked.
- Geography: a physics route follower traversed all five authored roads (~30 km) with scenery collision enabled. Maximum route deviation was 3.4 m on the latest run. Deterministic terrain/vegetation and identical initial spawn were checked.
- Chromium: seven rendered locations inspected (Copperwood, Stillwater beach, shallow lake, Fir Reach, Lantern Pass, White Crown, Redstone Canyon). Camera clearance, shared terrain vertex colors, WebGL errors, caption fade timing, missing map UI and bounded chunk counts passed. Browser-executed physics drove another ~6.7 km in three directions through streaming cells.
- Multiplayer: two independent browser contexts passed on the Node/SSE server and the built Worker/D1 preview. Join, remote movement, leave, reconnect, silent transport recovery, pause/park, keyboard and multi-touch steering passed. The Node persistence suite additionally restarted its own server and restored the same identity and position. The preview uses local SQLite for D1 queries; it is not an Internet latency/load test.
- Offline: checked the flagship link, existing game links and a service-worker-cached world launching solo without a map. Existing old game, shop, wallet and progression implementation files are unchanged by this expansion.

Headless Chromium used CPU-based SwiftShader: approximately 13–38 FPS across the seven inspected locations, with forest scenes the heaviest. Physical Chromebook performance and full-capacity multiplayer load remain unverified. Water reflections are an inexpensive sky approximation, not full scene reflections. Vehicle suspension/traction and buoyancy are lightweight game approximations, not a rigid-body fluid solver.

## Subsequent Blender scenery pass

All 11 model roots and their real vertex/normal data were checked in the GLB; the editable Blender source was validated. Seven locations and ~6.7 km of browser driving passed with the new Three.js renderer. The same two-client Worker-preview and offline suites passed again after moving the network heartbeat out of the rendering loop.

The full-detail CPU-rendered scene was slow (2–5 FPS). The final software fallback reduced the spawn scene to 197,343 triangles / 153 draw calls, measured at roughly 6.5 FPS. No claim of smooth Chromebook hardware performance is made. Actual hardware and 24-player load profiling remain unverified.
