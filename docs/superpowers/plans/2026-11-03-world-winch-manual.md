# World, winch and manual transmission implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A larger connected world with PC distance rendering, direct consent towing and a synchronized six-speed manual wagon.

**Architecture:** Retain Three.js, fixed-world worker streaming, cannon-es 120 Hz shared scenes, and common Node/Worker session authority. Extend stable world data; add manual transmission state inside the common physics module.

**Tech Stack:** JavaScript, Three.js, cannon-es, Node HTTP/SSE, Worker/D1, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-world-winch-manual-design.md`.

## Global constraints

- Preserve all current saves and old landmark indices, central terrain/spawns, garage and five original games.
- One fixed shared world; no per-session generation or lobby.
- Keep force-based gravity/collisions and friction parking; never freeze or snap a vehicle for transmission/winch.
- 1–6 forward, Right Shift reverse, Right Ctrl tow acceptance; ignore shortcuts in chat/forms.
- Four graphics presets, with PC Ultra and bounded worker/GPU streaming.

## Review focus

- A downshift or reverse request at high speed must not create an impulse or flip.
- A request can expire or leave range between click and acceptance; authority rechecks both.
- Typing numbers/modifier keys in chat must not change driving state or accept a cable.
- Reconnect/recovery and old serialized cars must initialize transmission safely.
- Coarse/fine chunk replacement must retain terrain coverage and bounded resident geometry during long drives.

### 1. Shared transmission (root)

Files: physics.js, session.js, network.js, game.js, index.html, style.css; new test-manual.cjs.
- [x] Write failing actual-physics tests for six distinct gears, fourth baseline, reverse, shift rejection, hill torque and high-speed stability.
- [x] Implement gear selection/torque/RPM/automatic clutch in common physics; serialize and sanitize gear state for shared prediction.
- [x] Bind actual keys and touch selectors, selected gear MPH HUD and RPM audio, preserving chat isolation.
- [x] Pass manual, rigid, network, shared-session and original-game regression tests.

### 2. Connected world and horizon (world agent)

Files: world.js, renderer.js, stream-worker.js, new expansion tests/geography documentation.
Interfaces: W.graphicsPresets entries {name,range,pixel,...}; renderer.setQuality(index); height.bounds = BOUNDS.
- [x] Write failing checks for expanded bounds, preserved core/spawns, new road content, reachable landmarks and long-range LOD coverage.
- [x] Add intentionally arranged regions/routes/discoveries, append stable indices, expand finite terrain bounds.
- [x] Add four presets and distant terrain/forest LOD, worker preloading and smooth visibility transitions.
- [x] Run world checks; root inspects rendered scenes and profiles streaming.

### 3. Click/Right Ctrl winching (winch agent)

Files: multiplayer-ui.js and new focused tests. Root integrates game nameplate creation and HTML/CSS.
Interface: wireNameplate(element, playerId), acceptLatestTow(); preserve multiplayerAction and server action types.
- [x] Write tests for click-to-request, Right Ctrl-only consent and chat/form isolation.
- [x] Bind clickable accessible nameplates with facing anchors; small incoming prompt and existing buttons; authority remains unchanged except explicit expiry validation.
- [x] Pass tests; root runs actual two-client acceptance, reel/slip/detach and synchronization.

### 4. Integration, review and publication (root)

- [x] Integrate dynamic physics boundaries and preset UI, service-worker cache and documentation.
- [x] Run fresh browser multi-client/manual/region/distance checks; fix observed defects and report actual frame timings.
- [x] Review code; verify build, migration journal and archive root paths.
- [ ] Commit/push exact source to retained Sites repository, publish, verify public join/drive/reconnect and preserve audience.

Final wrap-up retains known limitations rather than marking the entire game finished: strict rock-sidewall contact tolerance is still failing, the four-client stressed browser run disconnects during chat, and the art/hardware performance target remains unmet. See `docs/world-manual-validation.md` for actual partial results and software timings. The WORK IN PROGRESS garage banner is preserved.
