# Phase 2 — authorization prepared; media still disabled

The user reports all requested Phase 1 tests passed in separate browsers: private invitation, text messages, denied channel and ban. This is user-reported acceptance, not an independently captured test trace. The remaining Phase 1 UI limitations remain documented in SOCIAL-ROADMAP.md.

## What is implemented in this step

- `media-authorization.sql`: candidate trusted Supabase authorization for server voice destinations, accepted-friend DMs, private groups and explicitly configured school voice channels. It uses the actual active Auth session and existing grade/membership/role/pilot checks. Microphone permission respects server/platform mutes. Camera and screen defaults are false. Server text channels cannot masquerade as private group calls. This SQL has been tested in a rolled-back transaction and **has not been applied to production**.
- `hosting/media/authorization.cjs`: candidate server adapter forwards the caller's existing bearer to the fixed Supabase RPC; it accepts only a room ID, rejects client identity/source overrides, checks same-origin requests and validates the returned permissions. It explicitly represents publish=false for fully muted callers, avoiding an empty-source-list grant accidentally allowing all sources. It cannot sign or return a LiveKit JWT. It is **not imported/routed by the deployed Worker**.
- Five Node tests passed for default sources, muted callers, origin/auth/override rejection, denied/unavailable upstreams and malformed/wrong-room grants.
- Database tests passed using a real existing student/session context, with rollback-only server/channel fixtures: identity, camera/screen defaults, text-room bypass denial, join-role denial, mute, ban, pilot revocation and anonymous denial. No passwords, account creation, production permission changes, capture or media traffic were used.

No WebRTC/audio/video implementation is claimed. Capacity is currently a bounded permission result, not enforced live occupancy. Before issuing any real token, implement atomic admission reservations/leases, SFU participant removal/permission updates after revocation, DM/group join consent and active-participant block handling, source-specific grants, reconnect handling, rate limits and authoritative media moderation. Short token expiry alone does not evict an already connected participant.

## Required LiveKit configuration

The operator supplied `wss://after-class-chat-nud0wr9r.livekit.cloud`. It is saved as `LIVEKIT_URL` in Sites production runtime configuration. The operator subsequently added all three values in Supabase Edge Function Secrets. A deployed, values-free check returned `configured:true` and `mediaEnabled:false` (HTTP 200). Secret values were never returned. The credentials have not yet been proven valid against LiveKit itself. No cloud project or paid service was created by this agent. Saving a URL does not verify connectivity or enable media.

1. Create or select a LiveKit Cloud project controlled by the platform operator. Choose the hosting region and review its current plan, usage limits and billing budget before adding a payment method. No project/plan purchase is authorized or performed automatically.
2. Public project URL received and configured: `wss://after-class-chat-nud0wr9r.livekit.cloud`. It is not an API secret. Project ownership and media connectivity have not yet been tested.
3. Add the project's API credentials directly to the existing After Class Garage Site's **production runtime environment**, using these names: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Mark credentials as secrets. Do not put them in ChatConfig, source files, the browser console, messages or a public repo. Never send the API secret here.
4. Do not set a public media-enable flag yet. The token route, pinned official client/server SDK dependencies, allowed CSP provider hosts and signed webhook/participant-management endpoints still need implementation and testing. No client permission or token generation is active merely because credentials are present.
5. Keep recording/egress off. Add recording/storage only if separately designed and explicitly authorized; this release requests neither.
6. Once configured, test two independently authenticated pilot clients for audio, latency, mute/deafen, participant controls, private access, bans/revocation, permission prompts, camera/screen stops, reconnect and device/game performance before wider rollout.

Official LiveKit permission documentation was consulted in the preceding investigation. Provider fees have not been quoted for this account. Participant minutes, subscribed media bandwidth and plan limits determine cost; see the usage illustration in SOCIAL-ROADMAP.md. Credentials do not imply an approved budget or permission to activate live commerce.

Payments, gifting and the later profile/cosmetic phases are unchanged and unimplemented. Existing Garage games, earned credits and published v37 remain unchanged by this authorization preparation.

## Supabase configuration verification

`livekit-status` is deployed to the existing Supabase project. GET returns only `configured` and `mediaEnabled` booleans; POST requires the exact app Origin and an active authenticated platform owner, verified through the existing trusted bootstrap RPC. Gateway JWT verification is disabled deliberately because GET is public and the POST handler performs its own active-session/owner authorization. It does not rely on client metadata.

The owner can open **Chat → Settings → Owner dashboard → Settings → Check LiveKit connection**. The server creates a 60-second HMAC token granting only `roomList`, calls the fixed project's official ListRooms endpoint, discards returned room data and returns only success/failure. It never creates a room, issues participant media tokens, requests capture or exposes credentials. Successful/failed provider responses are cached for 60 seconds per warm function instance. This check is not proof of WebRTC connectivity or audio quality.

Five additional Node tests passed for metadata-only status, owner/origin/auth enforcement, a cryptographically verified limited grant, response redaction and probe caching. A fixture-only desktop/mobile UI test covers the owner connection-check control. The real GET endpoint reported all configuration present; the real authenticated owner POST still needs to be run from the owner's browser. No secret-value reads or exports were used for verification.

Live audio/video, admission leases, active-call revocation, client controls, media moderation and end-to-end two-client tests remain unfinished. Adding the diagnostic does not complete Phase 2 or enable it for students.
