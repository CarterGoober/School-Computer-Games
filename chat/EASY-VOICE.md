# Automatic student access and calls — release 40

This supersedes the invitation, manual admission and individual voice-pilot instructions in older release reports. The school-domain policy, unverified-identity disclosure, trusted grades, platform owner, moderation and private-room permissions remain in place.

## Available behavior

- Students register with a unique username, password, exact `@leisdstudent.ws` email and grade. No admission code or owner approval. Supabase manages passwords. These are unverified accounts; typing an email proves no school identity. Recovery still requires configured email delivery.
- Access requires a real active Supabase session and an unsuspended school-domain account. Client profile metadata supplies no role, grade or admission privilege. Announcements remain owner-posted and text-only.
- Every eligible account can join permitted voice rooms. School grade isolation, server channel roles, group membership, blocking, mutes and capacity are checked server-side. The owner can pause voice globally in Settings → Voice service.
- DM Call now sends a private, expiring incoming invitation. Only the intended recipient can accept; server-validated acceptance is required before either party gets a room token. An accepted friendship is required. Decline, cancel, expiration, blocking and suspension are enforced. Incoming calls can be disabled in notification preferences.
- Groups and eligible school/server channels have direct Join Voice / Leave Voice controls. Group members join the shared group call; group ringing is not implemented.
- Microphone and camera start off. Accepting a call joins listen-only. Capture/sharing requires an explicit control and browser permission. No recording or media storage is enabled. Camera/screen capabilities are available by default unless a room manager disables them.
- Clicking Games in Chat during a call opens the Garage in a same-origin game frame. Chat and LiveKit stay in the parent document. Back to Chat preserves the game document; Games returns to it. The compact top-center bar has mic, deafen, camera, sharing, disconnect, room/speaking state and expanded controls.
- Call errors remain visible with retry. Disconnect during a pending token response cancels that attempt instead of reconnecting later.

## Tests actually performed

On the connected Supabase database, seven rollback-only suites passed: automatic registration/admission, grade/announcement/role restrictions, existing chat authorization, notifications, servers, media authorization and media leases. The new call suite exercised accepted/declined calls, recipient-only acceptance, no token before consent, third-party denial, anonymous denial, suspension and ordinary capture capabilities. SQL tests used transaction-scoped claims and rolled back their fixtures; they are not independent browser logins.

Desktop/mobile browser fixtures passed signup without admission UI; incoming/outgoing call states; explicit capture controls; deafen; disconnect; delayed-token cancellation; persistent connection failure; notifications; server UI; and Garage feature navigation. The game-frame test loaded the actual Garage and Drift game and preserved the same game instance across chat/game switches with one mocked voice connection. These checks did not transmit actual peer media.

All 16 hosting/media service tests passed, including caller-token forwarding, trusted authorization, scoped provider tokens, capacity, revocation retries, no secret disclosure and owner-only credential probes. City Heist core (13 checks), Over the Hill rigid physics and release packaging/startup checks also passed.

The owner explicitly reported that the existing call and all its controls worked in an actual two-account test. No measured real-device latency, audio quality or frame-time claim is made. New ringing, automatic new-account access and voice continuity across game switching still require an actual two-browser/device acceptance check after refreshing both clients.

Supabase security advisor: no new exposed-table warning; intentional deny-all RLS tables remain informational because access is through scoped trusted functions. The pre-existing leaked-password protection warning remains. Owner configuration: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Browser and service limits

Use Games / Back to Chat inside the app to preserve the call. A full page refresh, direct address-bar navigation or closing the parent tab ends that browser's media session. Use the parent game toolbar's Fullscreen to keep the bar visible; a game's own child-frame fullscreen can hide the parent controls until Esc. The game frame has no camera, microphone or screen-capture permission. Mobile operating systems may suspend background tabs/audio. Browser permissions and HTTPS are required for capture.

LiveKit usage incurs the account's provider charges/quotas; no new plan, payment account, recording or paid purchase was activated. Supabase keeps existing limits. No further credentials are needed for this release. Existing LiveKit API credentials remain only in Supabase Edge secrets.

## Release acceptance on two real devices

1. Refresh both chat pages. Log in normally; register an approved real tester if checking new-account signup. No invitation or approval should appear.
2. Friend accounts, open the DM, Call, then explicitly Accept on the other device. Confirm capture is off, then test mic/deafen and explicit camera/share start-stop.
3. Join a permitted grade/group/server voice room; confirm a denied grade/private room remains denied. Check blocking, mute and suspension.
4. Open Games, drive/play, return Back to Chat, then Games. Confirm actual audio continues and the game does not restart. Test reconnect after a brief network interruption and stop sharing/disconnect.

Report device/browser and actual failures without sharing passwords, tokens or secrets. New in-game continuity and ringing have automated coverage; their real-device results remain unverified at publication.
