# Over the Hill performance upgrade

Preserve the entire fixed shared world, three spawns, physics forces/colliders, multiplayer/winches, saves and every garage game. Target 60 fps when hardware permits and stable 30+ otherwise; do not claim a hardware result without a physical device.

Use the existing Three.js/cannon architecture. Measure before changing it: CPU render/physics/stream/reconciliation costs, GPU timer queries where supported, draw calls/triangles, geometry/JS memory, chunk loading and frame spikes. A reproducible browser benchmark records the renderer identity, settings and raw samples. This executor is software SwiftShader with three CPU cores and no /dev/dri; real Chromebook GPU performance is unavailable.

Approaches considered: reducing map/draw distance would lose the requested world; globally lowering High/Ultra would lose PC quality. Choose lossless buffer/resource optimization first, then measured adaptive resolution/effect budgets with full-quality settings retained for powerful devices. This is an implementation choice under the user's existing authorization to proceed, not a new approval gate.

Prefer indexed terrain/model geometry, bounded streaming/cache work and reused transient buffers. Distance LOD must retain close models and crossfade; no world changes. An adaptive controller should react to sustained load, distinguish transient loading/hidden tabs, reduce internal resolution/effects in stages, and restore quality slowly. Add Auto / fixed-quality choices and an optional downloadable performance report in settings, not a permanent HUD.

Optimize network/physics overhead only where profiling shows a cost; retain 120 Hz authoritative and predicted force integration and exact collision neighborhoods. Test deterministic equivalence for payload/broadphase changes. Record existing unrelated failures explicitly.
