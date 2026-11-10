# Social platform and marketplace: staged delivery

## Current delivery: Phase 1 owner-controlled pilot, not the complete requested update

The repository, production Supabase Auth/RLS, notification system and hosted game services were inspected before changes. Existing accounts are school-domain-restricted, unverified identities with separate owner-controlled admission. Chat uses Supabase RPC/Postgres Changes; hosted games use independent D1-backed simulation/session APIs. Current game identities and browser-earned Garage Credits are not already a unified authenticated purchase system. No wallet, progression, game identity, balance, message, friendship or platform role was migrated in this update.

Phase 1 adds real persisted servers, private/unlisted/public visibility, moderation-approved public discovery, server name/description/icon/color/category, text channels, category/order settings, channel drag ordering, hashed expiring/revocable invitations, membership, scoped roles/colors/permissions, channel overrides, bans/mutes and message deletion. Server creation has a three-per-hour anti-spam limit and **no lifetime count limit**. This release uses five built-in server icon symbols; these are not the five original profile avatar assets requested in Phase 4.

School grades and owner-only announcements keep their existing checks. Server ownership never changes platform roles or school grades. Server channels reuse the existing message/RLS/realtime implementation with additional permission checks. Legacy group edits cannot bypass server settings, and server channels do not consume the old private-group quota. Server deletion cleans up its rooms/messages rather than leaving unmapped readable rooms. The phase's additive SQL is `servers.sql`, already applied; do not rerun it as a bootstrap or reapply its CREATE TABLE statements.

### Pilot access

The public rollout switch remains **false**. The platform owner sees **Chat sidebar → Explore Servers**. Inside it, **Pilot access** allows the owner to enable/revoke a specific already-admitted account ID. No tester is enabled automatically. **Listing requests** lets the owner inspect, approve or disable requested public listings. Private/unlisted communities stay out of discovery. Other students see no new server controls until explicitly admitted to this pilot. This is an operational test gate, not a paid feature or a permanent server-count restriction.

### Phase 1 limits / readiness

Not ready for broad rollout. The user reports that independent two-browser private invitation, text messaging, denied-channel and ban tests all passed. These are user-reported acceptance results, not independently captured browser traces. Browser tests used fixtures; database tests used the two real existing user/session contexts, with all test mutations rolled back. Voice channel definitions are configuration only: no joinable media or capture APIs are deployed. Category order currently uses explicit order controls; channel drag ordering works, but category-header drag ordering remains unfinished. More work remains on ownership-transfer UI, role hierarchy UX, a larger dedicated directory layout, member pagination and concurrent-load profiling. Reports use the existing platform report flow with server context; dedicated server/voice/profile case-management entities remain unfinished. The pilot must not be described as all of Phase 1 complete.

### Tests actually performed

- `test-servers.sql`: pilot denial, server creation rate limit, approval requirement, private invitation validation/single use, channel view/post denial, blocked legacy edit route, rejection of platform-role permissions, bans/rejoin denial, direct RLS and server room cleanup. Two existing real account/session contexts; no new accounts or credentials; transaction rolled back.
- Existing launch/security, public registration and notification SQL suites passed after applying the new dispatcher: grade isolation, owner announcements, private groups/DM consent, rate limits, blocking, reporting, moderator acceptance/revocation, suspension and pending-account isolation.
- `test-servers-browser.cjs`: 1440px/390px fixture UI creation/discovery/join/settings, channel edit, drag ordering, no horizontal overflow or JS errors. This is not independently authenticated multiplayer testing.
- Existing inbox, public signup and homepage browser tests passed; six delivery-state tests, 46 City Heist tests and Garage wallet/shop regression tests passed. Existing game simulations and balances were not modified.
- Supabase security advisor: existing leaked-password protection warning remains. New private RPC-only tables have RLS/no-policy informational notices by design; they have no client table grants. No broad policies were added to silence these notices.

## Phase gates and remaining work

| Phase | Status | Deployment readiness |
| --- | --- | --- |
| 1 Servers/discovery | Functional owner-only pilot; limits above | Pilot; user reports all requested two-browser checks passed |
| 2 Voice/video/screens | Restricted voice/video pilot implemented; credential check user-reported passing | Opt-in pilot only; real two-client media testing pending |
| 3 Persistent game voice/stream panel | Architecture only; no session-shell conversion | Not ready |
| 4 Unified profiles/five starter avatars/catalog/ownership | Not implemented | Not ready |
| 5 Gifting/payment preparation | Design notes below only; no checkout, gifts or fulfillment implemented | Not ready; live payments explicitly off |

Your requested order requires testing each phase before advancing. The user has now reported all four Phase 1 two-browser server checks passing. Work has advanced to the Phase 2 authorization boundary, while the remaining Phase 1 UI limitations above stay documented. Voice/video has not been published to students, and no fake checkout, purchase success, ownership unlock, voice simulation or payment form has been added.

## Services and configuration required

### Media recommendation: LiveKit Cloud SFU

Official LiveKit documentation confirms server-issued room grants and per-source publication permissions, plus server-side participant permission updates. Audio/video must travel through the SFU, not database subscriptions. Supabase remains the source of eligibility, memberships, blocks and scoped permissions. Before implementation/deployment, provide a project URL and configure `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` only as server-side hosting secrets. Never put them in ChatConfig or chat. Configure the signed webhook endpoint and provider region/billing budget. The public LiveKit URL has now been supplied and saved as `LIVEKIT_URL`. The operator added the API key and secret to Supabase Edge Function Secrets; the deployed status function confirmed configuration presence without returning values. LiveKit credential validity and media connectivity remain unverified. See [MEDIA-SETUP.md](MEDIA-SETUP.md) for the Phase 2 authorization candidate and exact missing setup.

The token endpoint must validate the actual Supabase user/session and trusted room permissions, issue short-lived grants scoped to an opaque room ID, and explicitly restrict permitted sources. It must never treat an empty publish-source list as deny-all. Enforce membership limits, private-call consent and bans server-side. Revocation requires removing/updating participants through the SFU; expiring JWTs alone are insufficient for active calls. Default camera/screen off, capture only from user gestures, visible stop/sharing controls, recording/egress disabled. Test audio, permission revocation, mute/deafen/PTT, VAD, source-specific publishing, network drops, device changes and game frame times with two real clients before release.

### Cross-page persistence

Full page navigation tears down a page-owned WebRTC connection. A stable same-origin outer application shell can own the connection and compact bar while switching the active game in an inner frame. Current `/chat/` CSP uses `frame-ancestors 'none'`, so framing it without a considered policy/session split would fail. Do not broadly remove clickjacking protection. Use a separately designed authenticated shell, keep the voice client in the parent, frame one game at a time, preserve its current instance on chat overlays, and pass only explicit commands via origin-checked messages. Game keyboard/pointer lock, fullscreen, audio focus, mobile autoplay/PiP and capture policy need browser tests. OS/browser PiP and persistent capture are not universal, especially on mobile. No such shell has been deployed yet.

### Payments recommendation: hosted checkout, sandbox first

Stripe Checkout is a candidate, subject to an eligible adult-controlled business account, supported jurisdiction and product approval. Payment/provider account age terms, student user ages, guardian authorization, merchant identity, privacy notices, tax/refund policy, chargeback handling and receipts need the operator's review before live activation. A provider account has not been supplied/verified. Future secrets include test-mode provider key and webhook signing secret; approved test price IDs and currency belong in a server-owned catalog. No payment information should be supplied in chat.

Checkout creation must resolve SKU/amount/recipient on the server and prevent already-owned duplicates. Only a verified signed webhook, with a unique event/order transaction, can grant an entitlement. A redirect or client message is never proof of payment. Gifting requires accepted friendship, block checks, gift opt-in, guardian purchase authorization where required, a reserved recipient/SKU and a clear exact-price confirmation. Decide the refund path for declined/expired gifts before implementing checkout. Refund/dispute events must update the entitlement ledger and notify both parties without changing Garage Credits. These are design requirements, not implemented transaction claims.

Core chat, servers, media and games stay free. Prices are one-time cosmetic SKUs only ($0.49/$0.99/$1.99 as requested); no paid randomness, subscriptions, credit purchases or cash redemption. Preserve current earned-credit systems separately; do not grant premium entitlements from a client-editable wallet. Credit avatar purchases are not implemented.

## Costs: no new paid service activated

Phase 1 uses the existing Supabase/Sites projects; database/storage/realtime usage can grow, and no new plan or paid project was purchased. A reliable media quote requires participant minutes, concurrency, region and video/screen bitrate. For budgeting, 100 students × 60 minutes × 20 days is **120,000 participant-minutes/month**, not a provider price quote. Video bandwidth can dominate; audio-only defaults and adaptive subscriptions should be measured before choosing a plan. Self-hosting shifts costs to compute, bandwidth/TURN and operations rather than making media free.

For micro-purchases, fixed transaction fees dominate. As an **illustrative assumption only**, a 2.9% + $0.30 fee leaves approximately $0.176 from $0.49, $0.661 from $0.99 and $1.632 from $1.99 before taxes, refunds or other charges. These are not verified provider rates for your account. Obtain actual country/account pricing and minimum-charge rules. Optional clearly priced cosmetic bundles may reduce fee overhead; do not introduce a cash wallet, forced minimum basket or spending pressure to conceal fees. No transaction has been run or claimed successful.

## v39 voice pilot

See [VOICE-PILOT.md](VOICE-PILOT.md) for current code, activation, tests and limitations. Historical preparation statements above are superseded by that report. Phases 3–5 remain unimplemented.
