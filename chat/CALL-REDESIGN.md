# Call-view update

The transport is the existing LiveKit client and Supabase-authorized Edge token service. No new credentials, accounts, media storage, recording or uploads are introduced.

## Implemented

- Click the call name or Open call to expand. Responsive Grid and selected Stage layouts reuse the same track elements; minimizing does not reconnect or restart capture. Speaking borders, names and initial-based avatars reflect connected participants.
- Camera and screen elements are actual LiveKit attached tracks. Camera-off participants get avatar tiles. Multiple screen shares are selectable; Expand and supported native PiP remain available. The grid displays up to six video tiles, with focused streams selectable beyond this budget; LiveKit adaptive streaming/dynacast remain enabled. Sharing defaults to 720p/15fps, camera to 360p simulcast. Hidden game-view video elements allow adaptive streaming to reduce work.
- Right-side text panel reuses the existing authorized conversation and composer, then restores it on minimize/disconnect. No second message transport or copied conversation store.
- Mic, deafen, per-participant volume, optional V push-to-talk, camera and share stop controls preserved. Unsupported browser screen capture is disabled/labeled. Explicit user action and permission remain necessary; no capture on join.
- Official school channels now have idempotent voice configurations on their existing room IDs, excluding announcements. There are currently no acc_servers rows designated as official servers. School voice lounges appear separately in navigation with the same grade restrictions.
- Custom servers retain manually created voice channels, rename/delete/reorder, role overrides and moderation. Existing voice channel editors now expose participant limits and camera/share policy. New servers are not seeded with voice channels.
- Authorized channel rosters show usernames and connection counts using a bounded server RPC and ten-second refresh. Speaking status is immediate for the current LiveKit room, not broadcast to unrelated rooms. No emails, tokens or private unauthorized roster data are returned.
- In-game bar and existing parent/frame session architecture remain. Call name opens the large view; minimizing returns to the game. Profile/report controls expose existing blocking and moderation, and Room controls links to server membership moderation. Existing server bans and global suspension trigger the existing lease/SFU revocation mechanism; this is bounded heartbeat/maintenance enforcement, not an instantaneous kick API.

## Actual verification

- Supabase rollback tests passed official roster access, cross-grade roster denial, suspension denial, anonymous denial, and existing media authorization (server roles, text channel denial, mutes, bans, suspensions).
- 16 media-service tests passed caller authorization, scoped tokens, capacity, provider eviction/retry and secret handling.
- Browser fixtures passed at 1440px and 390px: four participant tiles, camera/screen track-element rendering, Grid/Stage, text panel restore, minimize/reopen and disconnect; voice controls, cancellation of late joins, game document continuity, server settings/navigation and signup regressions also passed.
- Screenshots inspected for mobile and responsive overflow. Fixture tracks do not contain live camera/screen content. These tests do NOT constitute live two-account audio/video tests.
- Security advisor still reports intentional deny-all private tables and the existing disabled leaked-password protection warning: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Real-device acceptance still required

The owner agreed to test with friends after publication. This release is not certified as passing 2–4 real authenticated sessions. Test official/custom allowed and denied rooms, accepted DM/group calls, mic/deafen/volume/PTT, cameras, two concurrent shares, reconnect, leaving, and Games → Back to Chat on desktop and mobile. Report actual device/browser, failure and whether one or both peers observe it; never send credentials or session tokens.

Remaining limits: initial avatars rather than a new avatar catalog; outside-room rosters update on ten-second polling and do not show remote speaking; moderation removal uses existing bans/suspension, not a temporary kick-only action; no measured real-call latency/CPU/GPU figures; no verified actual iOS/Android capture behavior. Native PiP and screen sharing depend on browser support. Full page navigation/refresh still ends calls; use in-app Games navigation. The platform-wide existing 32-session safety limit remains. Provider usage costs follow existing LiveKit/Supabase plans.
