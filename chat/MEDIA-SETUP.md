# Phase 2 — authorization prepared; media still disabled

The user reports all requested Phase 1 tests passed in separate browsers: private invitation, text messages, denied channel and ban. This is user-reported acceptance, not an independently captured test trace. The remaining Phase 1 UI limitations remain documented in SOCIAL-ROADMAP.md.

## What is implemented in this step

- `media-authorization.sql`: candidate trusted Supabase authorization for server voice destinations, accepted-friend DMs, private groups and explicitly configured school voice channels. It uses the actual active Auth session and existing grade/membership/role/pilot checks. Microphone permission respects server/platform mutes. Camera and screen defaults are false. Server text channels cannot masquerade as private group calls. This SQL has been tested in a rolled-back transaction and **has not been applied to production**.
- `hosting/media/authorization.cjs`: candidate server adapter forwards the caller's existing bearer to the fixed Supabase RPC; it accepts only a room ID, rejects client identity/source overrides, checks same-origin requests and validates the returned permissions. It explicitly represents publish=false for fully muted callers, avoiding an empty-source-list grant accidentally allowing all sources. It cannot sign or return a LiveKit JWT. It is **not imported/routed by the deployed Worker**.
- Five Node tests passed for default sources, muted callers, origin/auth/override rejection, denied/unavailable upstreams and malformed/wrong-room grants.
- Database tests passed using a real existing student/session context, with rollback-only server/channel fixtures: identity, camera/screen defaults, text-room bypass denial, join-role denial, mute, ban, pilot revocation and anonymous denial. No passwords, account creation, production permission changes, capture or media traffic were used.

No WebRTC/audio/video implementation is claimed. Capacity is currently a bounded permission result, not enforced live occupancy. Before issuing any real token, implement atomic admission reservations/leases, SFU participant removal/permission updates after revocation, DM/group join consent and active-participant block handling, source-specific grants, reconnect handling, rate limits and authoritative media moderation. Short token expiry alone does not evict an already connected participant.

## Required LiveKit configuration

Production Sites environment inspection found **zero configured environment keys**. No new cloud project or paid service was created.

1. Create or select a LiveKit Cloud project controlled by the platform operator. Choose the hosting region and review its current plan, usage limits and billing budget before adding a payment method. No project/plan purchase is authorized or performed automatically.
2. Copy the public project WebSocket URL (`wss://...`). This URL may be provided in chat; it is not the API secret.
3. Add the project's API credentials directly to the existing After Class Garage Site's **production runtime environment**, using these names: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Mark credentials as secrets. Do not put them in ChatConfig, source files, the browser console, messages or a public repo. Never send the API secret here.
4. Do not set a public media-enable flag yet. The token route, pinned official client/server SDK dependencies, allowed CSP provider hosts and signed webhook/participant-management endpoints still need implementation and testing. No client permission or token generation is active merely because credentials are present.
5. Keep recording/egress off. Add recording/storage only if separately designed and explicitly authorized; this release requests neither.
6. Once configured, test two independently authenticated pilot clients for audio, latency, mute/deafen, participant controls, private access, bans/revocation, permission prompts, camera/screen stops, reconnect and device/game performance before wider rollout.

Official LiveKit permission documentation was consulted in the preceding investigation. Provider fees have not been quoted for this account. Participant minutes, subscribed media bandwidth and plan limits determine cost; see the usage illustration in SOCIAL-ROADMAP.md. Credentials do not imply an approved budget or permission to activate live commerce.

Payments, gifting and the later profile/cosmetic phases are unchanged and unimplemented. Existing Garage games, earned credits and published v37 remain unchanged by this authorization preparation.
