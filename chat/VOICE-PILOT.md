# Phase 2 voice/video — restricted opt-in pilot

The user reports the v38 authenticated connection check returned **LiveKit accepted the server credentials**. That verifies the owner's credential probe, not WebRTC connectivity. Phase 1's four requested browser tests were also reported passing by the user.

## Activation and use

Media is deployed but **disabled by default**. General server rollout remains false. Only the active platform owner and approved server-pilot testers can obtain media admission after the owner enables it.

1. Owner: Chat → Settings → Voice pilot controls → Enable voice pilot for testing.
2. Create/select a server voice channel under Explore Servers → your server → Add channel → Type voice. Click that channel to open its voice controls. Private DMs/groups also have a Call button for pilot accounts; friendship/membership/block checks are enforced. Official school rooms require explicit owner room configuration and retain grade isolation.
3. For camera/sharing tests, the platform owner checks the room's Allow camera / Allow screen sharing options and saves its media permissions. These start false. This permits sources; it does not start capture.
4. Each participant chooses Join with mic/camera off. Use Unmute mic, Camera or Share screen deliberately. The browser must grant capture permission. Use Enable sound if autoplay is blocked. Deafen, individual remote volume, V push-to-talk, speaking indicators, participant list, video fullscreen/PiP where supported and stream selection are included.
5. Disconnect ends local media immediately. A visible floating chat panel contains stop controls and capture state. Report call opens the existing platform report flow with room context.
6. Owner: disable the pilot from the same controls after testing if problems occur. Turning it off prevents new admission/renewal; server cleanup removes active participants on its next pass.

The bar currently exists **inside the chat page**. Page navigation ends the call. Persistent game voice/session-shell conversion is Phase 3 and has not been implemented. This release must not be described as seamless in-game voice.

## Server authority

- Active user/session and existing pilot membership, grades, channel view/join roles, accepted friendship/group membership, mutes, bans and blocks are checked in Supabase, never from editable profile metadata.
- One reservation per account, bound to its Auth session. Retries reuse that reservation. Room admission is serialized under database advisory locks; leases are not recycled before SFU removal succeeds. The pilot has 32 total reservations, rooms default to eight, and owner room configuration accepts 2–24. There is no new server-count limit.
- Reservations renew every 15 seconds and expire after 50 seconds. Per-lease requests and join rates are bounded. An SFU CreateRoom request also enforces the participant ceiling. Participant identity is a random lease UUID; display names contain usernames, not school emails.
- Tokens use HMAC signatures, explicit source grants, no data publishing, and a 120-second initial TTL. Fully muted grants have canPublish=false. Short JWT expiry is not treated as active-call eviction.
- A database cron checks once per minute and invokes cleanup **only when reservations exist**. The Edge Function reevaluates stored real user/session contexts using a service-only RPC, updates SFU permissions or removes participants with an explicit token-revocation cutoff, then acknowledges successful cleanup. Failed SFU work retains the lease for retry. Bans/mutes/network abandonment are therefore enforced on heartbeat/reconciliation cadence, **not instantaneously**. Provider failures can extend cleanup time; no hard latency bound is claimed.
- The maintenance endpoint accepts only a fixed public project credential and exposes no room/member data or arbitrary action. This is not a secret authentication mechanism: safety comes from a database throttle, service-only sweep/ack RPC, and accepting no caller-selected maintenance target. Anonymous callers can at most trigger the same bounded due cleanup. Service-role and LiveKit credentials remain only in Edge environment secrets.
- Gateway verify_jwt=false is intentional for the maintenance route. User actions still require an active authenticated caller through trusted database RPCs, exact app Origin and limited input. No media token is returned without successful admission. The service bridge uses a modern secret as apikey rather than treating it as a user JWT.

## Implemented components

`media-authorization.sql`, `media-sessions.sql` and `media-maintenance.sql` are applied. Do not rerun their table creation statements. `livekit-media` is deployed to the existing Supabase project; the owner status check remains separate. The browser SDK is pinned to LiveKit Client 2.23.0, downloaded from the npm registry and checked against its published SHA-512 integrity. Its license is included in the served JS header; dependency/integrity metadata is in hosting/media/client-dependency.json. The SDK loads lazily when joining; no camera/audio track is created simply by opening Chat.

No recording, egress, media storage or live payment workflow is enabled. Existing games, wallets, school-grade channels, owner announcements, messages and account admission remain unchanged.

## Actual verification

- Rollback-only SQL tests passed with the two existing real account/session contexts: disabled gate, owner-only enable/configuration, retry-stable reservation, two peers, ban/renewal denial, server eviction decisions, acknowledgement and direct-client service-RPC denial. The authorization suite also covers source defaults, muted grants, text-channel bypass rejection, channel join permission and pilot removal. These are not independent browser logins or a concurrent race test.
- Six lifecycle Node tests plus the previous ten authorization/status tests passed: scoped signatures, safe sources, backend admission, SFU room limit request, origin/input denial, removal before acknowledgement, failed eviction retention and the modern-secret header regression. SFU responses were mocked in these tests.
- A **real database → pg_net → deployed Edge Function → service-only database RPC** maintenance smoke request returned HTTP 200 with `{ok:true}`. There were no active reservations, so this does not prove an actual SFU eviction.
- Desktop/mobile browser fixture tests passed: no capture on join, explicit mic/camera/screen actions, deafen, disconnect and layout. Existing inbox/signup/server/homepage browser checks passed. Sixteen server tests, 46 City Heist checks, wallet/shop regressions and deployment packaging/startup checks passed. The real pinned browser SDK also passed a self-only-script CSP load/construction test without any media capture. UI fixtures do not prove audio quality.
- The owner-reported successful credential probe is retained as user-reported evidence. No passwords, actual access tokens or secret values were obtained for testing.

## Remaining acceptance tests / limitations

Use two independently authenticated approved pilot accounts. Check actual voice latency/clarity, microphone denial, mute/deafen/PTT, volumes/speaking indicators, private access/grade denial, camera and screen permissions/stop controls, stream switching, fullscreen/PiP, short network interruptions, an actual ban/mute while connected, room capacity and cleanup after closing a tab. Record actual reconnect/eviction delay and game/device frame times. These have not been observed yet; do not roll this out broadly before they pass.

Camera/screen configuration is currently platform-owner-only. This is a pilot restriction, not the complete requested server-owner media settings interface. Private-call joining is explicit; an incoming ringing/accept/decline call invitation interface is not implemented. Source/track failures need real-browser testing. Longer interruptions require rejoining once the reservation expires. Local PiP/fullscreen and capture availability depend on browser support. Blocks can disconnect a shared pilot call rather than providing sophisticated per-peer SFU isolation. Media-specific case management and large-scale load testing remain unfinished. Phases 3–5 remain pending.

Costs: existing Supabase/Sites usage plus LiveKit participant minutes/bandwidth when testers explicitly join. Cron has one small database tick per minute and invokes the Edge Function only while reservations exist. No new paid plan, external project or live commerce was activated automatically.
