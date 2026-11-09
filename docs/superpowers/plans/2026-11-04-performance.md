# Over the Hill performance implementation plan

> **For agentic workers:** Execute tasks inline using superpowers:executing-plans. Review the final diff before publication.

**Goal:** Measurably reduce High/Ultra rendering, streaming and synchronization costs while retaining world/physics/features and PC quality.
**Architecture:** Existing Three.js/cannon, worker geometry, shared Node/Worker sessions; add a focused performance policy/telemetry module.
**Tech Stack:** JavaScript, WebGL2 timer queries, Playwright/CDP, Node.
**Spec:** ../specs/2026-11-04-performance-design.md

## Global constraints
- No map/physics/collider/save changes. Preserve The Trenches, Summit Run and every other garage game.
- Adaptive visual effects only; never lower physics tick rate or silently change server authority.
- Report software measurements separately from unavailable physical Chromebook/GPU results.

## Review focus
- Indexed buffers retain winding, hard model normals, vertex colors, water depth and fixed terrain seams.
- Streaming/pooling never exposes incomplete cells, leaks old geometry or stalls backpressure.
- Resolution/effects recover slowly and do not oscillate, learn from hidden tabs or strip PC Ultra detail.
- Network batching retains input-change timing, retransmission/recovery and tow/parking interactions.

### 1. Baseline
- [x] Add reproducible benchmark and record High/Ultra CPU, frame, memory, draw and loading metrics.
- [x] Inspect CPU trace/model costs and document supported GPU counters.

### 2. Geometry/streaming
- [x] Add failing invariance/budget tests for measured buffer/LOD/stutter defects.
- [x] Implement exact buffer indexing, measured LOD/culling and resource reuse with bounded uploads.
- [x] Compare geometry, memory, draw/vertex load, chunk transitions and screenshots.

### 3. Adaptive policy and reporting
- [x] Test sustained-load degradation, slow restoration, hidden-tab and loading behavior.
- [x] Add policy, GPU/CPU telemetry, Auto/fixed settings and exportable report.
- [x] Validate shaders, shadows, water, camera and keyboard/touch UI at High/Ultra.

### 4. Shared simulation overhead
- [x] Profile real multi-client traffic/reconciliation/physics and optimize safe overhead with equivalence tests.
- [x] Verify shared collision/winch/parking and reconnect without changing forces or tick rate.

### 5. Final validation/publication
- [x] Repeat same benchmark; compare before/after and list hardware limitations.
- [x] Run relevant physics/network/world/save/other-game regressions and document known failures.
- [ ] Update guide, build/package/merge latest source, publish and verify live backend.
