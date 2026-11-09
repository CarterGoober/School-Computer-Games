# High / Ultra performance validation

Validated November 9, 2026. This is an optimization of the existing game, not a hardware certification. The complete fixed 16 × 16 km world, terrain height function, three spawn coordinates, original close vehicle/tree models, all other garage games and player storage keys are retained. Authoritative and predicted physics remain at 120 Hz with the same gravity, forces, suspension, colliders and towing.

## Measurement environment and limits

The executor provides three CPU cores and software Chromium: ANGLE / Vulkan SwiftShader, at 960 × 600 with device pixel ratio 1. It has no `/dev/dri` GPU and exposes no `EXT_disjoint_timer_query_webgl2`. No physical Chromebook, integrated Chromebook GPU or powerful PC was available. CPU callback times and delivered frame intervals were measured; actual hardware GPU elapsed time and VRAM were unavailable. The new runtime reports these as unavailable rather than inferring GPU milliseconds from frame latency.

The published baseline commit `02854e2` ran from an isolated archive on port 8002. Optimized code ran on port 8001. Final comparison runs were sequential, without concurrent browser or heavy CPU tests. Each case waits for the selected spawn's near terrain, allows 15 seconds for streaming, then samples eight seconds (25 seconds for Auto). The view and scene coordinates are fixed. Streaming residency varies because faster frames service more completed chunks. These are loading-window measurements, not an identical fully settled GPU workload. The baseline sample counts are small because software rendering is extremely slow. Do not extrapolate these FPS values to a Chromebook.

| Version / mode | Preset | Frame p50 / p95 (ms) | Mean FPS | Submitted triangles/frame | Draws/frame | GPU-facing buffer payload (MiB) | Frame intervals |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Published baseline | High | 2250 / 2733 | 0.44 | 3.30 M | 93 | 17.1 | 7 |
| Published baseline | Ultra | 2117 / 2133 | 0.48 | 3.31 M | 102 | 18.8 | 3 |
| Optimized / full quality | High | 1417 / 1533 | 0.73 | 1.54 M | 92 | 6.5 | 10 |
| Optimized / full quality | Ultra | 1450 / 1550 | 0.68 | 1.66 M | 104 | 7.1 | 5 |
| Optimized / Auto | High | 650 / 933 | 1.49 | 1.08 M | 120 | 7.3 | 42 |
| Optimized / Auto | Ultra | 700 / 1300 | 1.21 | 1.49 M | 144 | 13.2 | 30 |

High full-quality triangle submission fell about 53%; Ultra fell about 50%. Their sampled GPU-facing geometry/instance payloads fell about 62%. Those buffer figures include vertex/index/live instance buffers, not actual GPU VRAM or total application memory. The downloadable report separately counts immutable instance sources and reports browser heap when available. Draw calls did not materially fall; gains came mainly from indexed vertices and removing invisible instances before submission. Auto adds overlapping LOD batches while fading between models, so its call count can rise.

Software rendering remains well below the requested 30/60 FPS goal, even with Auto. The target on physical Chromebooks and powerful PCs remains unverified. The benchmark records raw samples, actual renderer identity, CPU trace, memory counters, pending/resident chunks and screenshots; it does not emulate Chromebook graphics hardware.

## Bottlenecks and changes

The initial High forest submitted approximately 3.3 million triangles per sampled frame; waiting for every chunk to settle timed out after four minutes with 119 still pending and about six million submitted triangles. Main JavaScript callback work was typically single-digit milliseconds, with occasional physics/upload spikes. CPU sampling showed most wall time outside application JavaScript. This identifies graphics processing in the software renderer as the main limitation in this environment; it is not a direct hardware GPU timing measurement.

- **Lossless buffers:** Terrain now shares indexed vertices. Exact expanded hashes verify positions, smooth normals, colors, UVs and water depth against the old worker output. Representative terrain transfers/storage use under 45% of the original bytes. Original Blender model indices are retained instead of expanding every triangle; original model/vehicle attributes and triangle counts match their recorded hashes.
- **Instancing and visibility:** Trees, foliage and stones remain instanced in bounded spatial batches. Immutable matrices/tints are compacted into reusable output buffers according to the camera frustum and actual visible LOD bands. Sphere padding, a view margin and nearby shadow-caster retention protect the visible edges. Tints remain attached to their matching transforms. Camera motion, preset/budget changes and viewport resize invalidate the selection.
- **LOD:** Original detailed models remain nearby. Auto uses the original reduced tree meshes farther away, then new 148/140/113-triangle 3D oak/birch/pine LODs derived in Blender from `nature.blend`. Complementary world-space dither fades blend the levels. Full quality retains the previous detailed model ranges. The original nature/vehicle GLB files were not changed. No billboards or screenshot-derived art were added.
- **Streaming:** Up to three nearby 128 m cells preload in the direction of travel. A return-trip cache has a 16-cell hard limit and an 8 MiB estimated packed-buffer/instance budget. Unpacked main-thread fallback geometry is excluded. Pending work already completed by an in-flight request is skipped. Existing worker packing, GPU upload pacing, complete-cell swaps and world-space terrain coverage remain.
- **Resource reuse:** Ripple/track geometry reuses typed buffers and GPU geometry between frames, growing to a power-of-two capacity only when required and disposing the previous allocation. No empty effect mesh is rebuilt every frame.
- **Shadows/water:** Auto reduces the shadow atlas from the preset maximum through 1024/768/512 and simplifies secondary water highlights/ripples under sustained pressure. Full quality keeps the preset effects. Depth transparency, shoreline blending and basic water animation remain. Water reflections were already a lightweight shader approximation, not an expensive reflection-camera pass.

## Adaptive controls and diagnostics

Pause/settings offers **Optimization: Auto / Full quality**, **Frame goal: Auto / 60 / 30**, and **Download performance report**. Auto is the default. The resolution scale is applied after the device/preset cap; previously Ultra at DPR 1 often stayed at native resolution even when its adaptive multiplier decreased. The current floor is 50% of the capped ratio (with a 0.4 minimum ratio). Sustained pressure reduces effects; quality restoration requires measured CPU/GPU headroom and proceeds slowly. Isolated loading spikes are rejected by the rolling median. Hidden/paused time is excluded from reported frame intervals.

Frame deadlines retain their remainder, so a 60 FPS goal does not become 45 or 48 FPS on 90/144 Hz displays. Tests also cover 165 Hz and resume without burst rendering. CPU work from non-rendered animation frames is accumulated into the next rendered interval when drawing is capped. Component measurements are nested within total callback work and should not be added together.

GPU timing uses asynchronous WebGL2 queries when available, with at most four pending queries and disjoint-result rejection. A seven-frame sampling cadence covers all phases of the eight-frame shadow refresh. There is no `gl.finish()` or synchronous wait. The bounded report contains at most 1,800 rendered-frame samples, settings, memory/counter information and network totals; it excludes usernames, chat and reconnect tokens. It downloads locally and is not uploaded automatically.

## Multiplayer and physics

Held-input command runs preserve beginning/end timing anchors, changes in input, and clock-rebase boundaries. A 48-command unchanged run becomes two commands, with under 10% of that command-array payload. Exact shared-session tests under dropped/rebased batches retain the same positions, velocities, gearing, parking, collisions and cable forces. The input heartbeat remains 70 ms. Every remote snapshot still enters its interpolation buffer; expensive local projection work coalesces to the latest snapshot once per animation frame and clears on recovery/pause/disconnect. Authority, tick rate and collision neighborhoods are unchanged.

The real two-context browser test passed six synchronized gears/HUD, actual reverse and service braking, nameplate requests, chat key isolation, Right Ctrl-only consent, reeling, visible cable, parked tire slip and detach. End-of-run prediction corrections were 0.0042 m and 0.0007 m. Observed round-trip time was about 0.92–1.04 s in the contended software-browser container; this is not an Internet latency benchmark. Four-client stress and physical-device networking were not repeated in this pass. The earlier four-client stress-disconnect limitation is not claimed resolved.

## Verification

- Exact indexed terrain/model attributes, real WebGL culling/camera turns/LOD switching/buffer reuse, adaptive policy/recovery, display pacing, GPU-query scheduling, telemetry privacy/pauses/work accumulation, command equivalence and bounded streaming/cache tests.
- Actual 300 m driving on High across outer-world streamed cells, with finite rigid state and terrain contact. That drive recorded 379 frame samples: p50 199.9 ms, p95 266.7 ms, max 383.4 ms; upload CPU p95 2.1 ms/max 24.1 ms and streaming CPU p95 0.2 ms/max 28 ms. This is a functional software-renderer drive, not Chromebook FPS.
- All three spawn preloads, 360° drag/zoom/recenter, camera ground clearance, touch gears/reverse/parking and simultaneous touch driving/camera movement.
- Auto/full-quality and frame-goal controls, High selection, an actual private report download and a map-free HUD.
- Every cache asset served and a real cached offline solo launch. The check caught the Node server omitting The Trenches font MIME type; `.ttf` is now allowed like the hosted build.

Final targeted checks passed: geometry/visibility/adaptation/telemetry/cache/command tests; world expansion/streaming; rigid, water, network, manual transmission/reconciliation, shared collisions/towing, winch controls/authority, control ordering and server persistence/security; wallet migration, shop/progression, Apex, Sunday Slide, Tideline, Rooftop Rumble, Summit Run and The Trenches core/data; migration journal; hosted Worker/D1 CAS concurrency, token isolation/privacy, gears, chat, tow consent/detach and reconnect. The complete legacy script collection was not run as a single suite. The pre-existing sharp rock-shelf tire-sidewall clipping issue remains outside this optimization and the garage WORK IN PROGRESS banner is preserved. Hardware shadow continuity, every road/region, full 24-player load and actual Chromebook/PC 30–60 FPS remain unverified.

## Reproduce

### Hosted startup

The first publication attempt (saved version 20) was rejected by the host's script-startup CPU limit; version 19 stayed live. Investigation traced the expense to deterministic road grading and landform-grid construction at module initialization. The build now evaluates that data once and embeds the original values in the Worker, without adding a client download or changing physics/world sampling. Exact comparisons cover all road/profile records, both complete Float32 grids, 1,600 terrain/surface samples, road offsets and three spawns. An isolated comparison measured world setup at 5,048 ms CPU before versus 103 ms after; the complete built Worker imported in 584 ms CPU on the local container. These are local CPU measurements, not host timing guarantees. The rebuilt Worker/D1 preview passed concurrency, token isolation/privacy, all gears/reverse, chat, tow consent/detach and reconnect. The package helper now guards complete-entrypoint startup before upload.

Run `node hosting/test-world-bake.cjs` for exact world equivalence and `node hosting/test-worker-startup.cjs` after building for the full-entrypoint check.

### Client benchmarks

Start `node over-the-hill/server.cjs`, then run:

```sh
BENCH_OUT=work/perf-fixed node over-the-hill/benchmark.cjs
BENCH_AUTO=1 BENCH_SECONDS=25 BENCH_OUT=work/perf-auto node over-the-hill/benchmark.cjs
node --test over-the-hill/test-adaptive-quality.cjs over-the-hill/test-command-compaction.cjs over-the-hill/test-performance-telemetry.cjs over-the-hill/test-instance-visibility.cjs over-the-hill/test-packed-geometry.cjs over-the-hill/test-stream-cache.cjs
node over-the-hill/test-model-indexing.cjs
node over-the-hill/test-render-resources.cjs
node over-the-hill/test-performance-ui.cjs
node over-the-hill/test-manual-browser.cjs
node over-the-hill/test-offline.cjs
DRIVE_ONLY=1 DRIVE_QUALITY=2 node over-the-hill/test-expedition-browser.cjs
```

For real hardware, use the same location, viewport and route for High/Ultra comparisons. Run **Full quality** and **Auto** after allowing nearby streaming to complete, drive for at least a minute, then download a report from settings. The renderer identity and GPU-query availability in that report determine what was actually tested.
