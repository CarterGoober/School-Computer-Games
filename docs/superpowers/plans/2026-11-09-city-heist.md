# City Heist implementation plan
Goal: a playable continuous shared cops/criminals extraction city, isolated from existing saves.
Architecture: common deterministic 40 Hz authoritative core; D1 revision-CAS persistence in hosted Worker; atomic JSON storage in local Node; Canvas renderer with bounded interpolation/prediction.
Spec: user's City Heist brief (saved in city-heist/README.md scope).
1. Test role/capacity, fixed stepping/collisions, robbery timers/alerts, extraction/loss, gear/cash authority, privacy and reconnect; implement core.js and map.js.
2. Add shared API adapter and new additive migration; wire existing Node/Worker routes without modifying other games' state.
3. Implement original nighttime waterfront Canvas art, interiors/roof fades, driving/combat, hideout/store/loadout, chat/mute/report, maps/navigation, five slots and HUD.
4. Run core/API and two independent browser tests, inspect screenshots, improve observed problems; run existing hosting/world/save checks.
5. Add garage card/offline shell, document guest/storage/hosting limitations; package and publish verified version.
Review: duplicate/replayed actions; concurrent extraction or sales; untrusted coordinates/currency; combat logout; illegal roles; tokens in public snapshots; world bounds/door collisions; stale inputs/reconnect; D1 contention. No existing storage key or game asset is removed.
