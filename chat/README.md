# After Class Chat

A separate student-run, unofficial community at `/chat/`, integrated through the Garage navigation. Existing games, progress keys, City Heist and Over the Hill remain independent. Chat does not replace or migrate guest game accounts. Game invitations can later reference `acc_rooms.id` and authorized memberships; no party/invitation features alter the games now.

## Implemented

- Supabase Auth password login, signup, email confirmation/resend, recovery and password update flows; PKCE, tab-scoped access/refresh-token storage and logout. Only the one-time PKCE verifier uses shared browser storage so email links can open in another tab. Only the exact `leisdstudent.ws` domain is accepted by the UI **and an Auth database trigger**, including email changes. Unique case-insensitive3–20-character usernames; auth service enforces unique emails. No app password store or public emails.
- Fifteen school, grade and subject channels; announcements restricted to staff. Real Supabase Realtime `postgres_changes` subscription to authorized room messages, with reconnect reconciliation, 6-second message fallback (30-second integrity checks while live) and15-second unread/friend/presence refresh. Typing expires after5seconds, checked every4seconds. Messages ordered by database identity, paginated50 at a time, indexed full-text search. Retry nonces prevent duplicate sends. No fake users/messages in the production application.
- Replies, five reaction choices, timestamps, unread counts, opt-in generic desktop notifications, opt-in presence, blocking, local muting and reports. User content is rendered only through text nodes; no HTML or remote images. No real-name, bio, schedule or location profile fields.
- Friend requests/acceptance before creating or sending DMs. Blocking in either direction hides messages and prevents DMs. Private groups accept up to30 invited accepted friends; owner-only invite/remove/rename, member leave, owner deletion. Removing friendship stops further DM sends. Removed members lose database/Realtime read access.
- Report queue, resolution notes/status, reported-message context, message deletion, suspension with session revocation, restoration, and admin assignment/removal of moderator role. Staff cannot browse unjoined DMs/groups. A reported private message can be reviewed/deleted by staff from that specific report without granting access to the room's other messages. Moderators cannot suspend other staff; admins cannot suspend themselves/other admins through this app.
- Author deletion and staff deletion replace message content with a tombstone. Account deletion removes Auth user/sessions, profile, preferences, friendships, memberships, owned groups and authored message content; game saves remain untouched. Reports/audit records retain pseudonymous safety records on their stated schedule.
-1second minimum between messages;25/minute;100 outgoing friend records;10 owned groups;5 reports/hour;2000-character messages; server-side basic profanity/email-sharing filter. This filter is not comprehensive abuse detection or a staffed response service.

## Launch status — registration intentionally locked

The real existing `afterclass-garage` Supabase project `gvurobdhsvcvdywdsgne` has the additive schema installed. No new paid project was created. The original `garage_feedback` table was left intact. Schema source is `schema.sql`; it was applied and iterated using Supabase SQL tools, not the SQLite/D1 Drizzle migration journal. **Do not rerun bootstrap SQL on the already-installed project**. It is for a fresh project or review; subsequent changes need incremental SQL migrations. CLI migration history was not generated because the CLI download was unavailable in this executor.

`acc_private.launch.ready=false` keeps public registration/access closed. The separate `pilot_enabled=false` flag currently also disables private pilot enrollment. Approved inboxes can later enroll only after that private pilot flag is enabled; email verification and active-session checks remain mandatory. `config.js` also has `emailReady:false` so the UI explains the setup requirement before requesting emails. The prelaunch page is public; no student messages or member information are public.

A read-only live Auth settings probe returned HTTP200, `mailer_autoconfirm:false`, `disable_signup:false`, `external.email:true`. This confirms that email confirmation is enabled. **No school email was sent/received, verification link redeemed, password-reset email delivered, or real multi-account Auth/WebSocket flow verified in this task.** The executor's direct Supabase network request was blocked by its outbound policy; database tests used the authorized Supabase connector, and the settings probe used an isolated external browser.

### Current launch setup

See [PILOT-LAUNCH.md](PILOT-LAUNCH.md) for the current dashboard values, pilot-only enrollment controls, moderator verification and test checklist. Do **not** turn the public `ready` flag on for pilot testing. The new private allowlist supports approved inboxes while public registration remains closed.

This repository needs **no new secret keys** for chat. The shipped key is a public publishable key. The backend authorizes every protected request against the database's actual email confirmation, suspended state and current `auth.sessions` row. User metadata is used only to request a username at registration, never for role decisions. No service-role token is in frontend files.

## Data authorization and retention

RLS is enabled on every chat table. Only `acc_messages` grants direct SELECT, using a session/verification/member/block policy that also applies to Realtime. Other tables deny direct client access. Clients call a public SECURITY INVOKER wrapper into private SECURITY DEFINER operations, each of which validates the user and resource permissions. Private helpers have empty search paths and no anonymous/public execution grants. All writes use database transactions and bounded inputs; profile-row locking serializes sender rate limits and nonce checks. Pair locking deduplicates simultaneous DM creation.

Supabase security advisors reported only informational `rls_enabled_no_policy` findings on intentionally RPC-only/deny-by-default tables (and the preexisting feedback table). These are deliberate: granting broad policies to silence them would weaken the model. There were no warning/error findings in the final security advisor run.

The installed `pg_cron` job `afterclass-chat-retention` runs daily at04:25UTC: deletes messages older than90days, resolved/dismissed reports older than30days, audit rows older than90days, and unconfirmed accounts older than7days. Open reports remain until reviewed. No email or message body is written to application audit records. Provider backups/log retention remain governed by the project's Supabase settings; deletion cannot claim immediate removal from provider backups. Jobs are installed but their future scheduled execution has not yet been observed. Time is UTC for the cron definition, regardless of user locale.

## Verification performed

- `test-database.sql` ran against the **real database** in a transaction that rolled back all fixtures. It creates synthetic verified/unverified users and sessions directly for authorization tests, without sending email or claiming mailbox verification. Covers domain spoof rejection, username uniqueness, unverified RLS/RPC lockout,15 channels, send/retry/rate limit, announcements permission, friend/DM gate, private-group isolation, reactions, block RLS, report review/resolution, admin suspension/session revocation and account deletion. Launch flag returns false after rollback. No test users/messages remain.
- `test-browser.cjs`: two independent desktop/mobile Chromium contexts with an explicitly simulated transport and session fixture. Tests exact-domain client validation,15-channel navigation, message polling/rendering, replies, reactions, search, friend acceptance, DMs, private groups, logout, mobile navigation/overflow and literal rendering of an HTML injection string. This test does **not** validate email, JWT issuance, actual WebSockets, or database authorization. The production app has no fixture hook or mocked client.
- Local unauthenticated gate screenshots and navigation checked with the real bundled SDK. Existing Garage wallet migration/shop tests and all46 current City Heist core/API/bank tests passed. Hosting package verifies existing D1 journal and Worker startup. No D1 schema changes or other-game simulation changes.

## Development

Run the garage's Node server and open `/chat/`. Auth/database are the configured Supabase service; there is no local insecure-login fallback. `node chat/test-browser.cjs` defaults to port8030 (`TEST_BASE_URL` overrides). Run the SQL test only as an authorized database operator; it is transactional and rollback-based.

The Supabase JS2.119.0 SDK is bundled locally into `supabase.js` using pinned esbuild0.25.12. Dependency manifest/lock and entry are in `vendor/`; rebuild with `npm ci` there then `npx esbuild entry.js --bundle --minify --format=iife --platform=browser --outfile=../supabase.js`. SDK licensing is in `vendor/LICENSE-supabase.txt`. Only first-level chat HTML/JS/CSS is packaged as web assets; SQL/tests/manifests stay in source. No runtime CDN dependency.

Remaining limitations: full school-email and WebSocket end-to-end launch tests above; production moderation staffing; load, long-duration reconnect, mobile push and district-network/device testing. Notifications require an open tab and explicit browser permission, not a push service. Realtime updates are followed by ordered database fetches; polling fallback can take6seconds. Presence/typing/unreads are lightweight polls. Group invites add accepted friends directly; there is no separate group-invite acceptance flow. Files, voice/video, party game invitations and cross-device game-save authentication are not implemented.

## v29 launch hardening

`pilot-setup.sql` is the incremental server update applied after the v28 bootstrap. It adds private hash-only pilot enrollment, operator-only verification-gated moderator promotion, and supported Auth hooks (installed but awaiting dashboard activation). Both public and pilot flags remain false; one user-approved inbox is allowlisted, and no Auth account exists. No synthetic verified users were created for this update.

`test-pilot.sql` tests gates, domain matching, hook permissions, no verification bypass, rejected unverified promotion and unverified RPC/RLS access without creating Auth users or sessions. `node --test chat/test-delivery.cjs` verifies stable retries, ordering/deduplication, logout draft reset and cross-tab PKCE verifier/tab-local tokens. v28 synthetic database tests are historical; do not run them as evidence of real mailbox verification, or under the new no-fake-account launch rules. Current live two-account tests remain blocked pending SMTP and a second approved inbox.

## Current private password test mode

The latest requested mode allows only private, invitation-bound **unverified** test accounts without SMTP. See [PRIVATE-PASSWORD-TESTING.md](PRIVATE-PASSWORD-TESTING.md). Public registration remains closed; email recovery/resend are disabled. Supabase's Confirm email switch must be OFF before signup; the frontend checks this and refuses to consume an invitation otherwise. Do not use the older email-verification launch instructions for this private mode.

## Grades and owner administration

See [GRADES-ADMIN.md](GRADES-ADMIN.md). New signup requires grade9–12; trusted database grade controls channel RLS. Old accounts remain pending until owner approval. The actual existing owner candidate must redeem a private, UUID-bound setup code in Settings. Moderator invitations require intended-account acceptance plus a private code; email lookup alone never grants privileges. Public enrollment remains closed.

## Owner-generated tester invitations

The owner can now generate/copy/revoke single-use,24-hour, email-bound student signup codes under Settings → Owner dashboard → Invitations. See [TESTER-INVITATIONS.md](TESTER-INVITATIONS.md). These never grant staff privileges. Existing accounts are preserved; public enrollment stays closed.

## Public launch preparation status

See [PUBLIC-LAUNCH-STATUS.md](PUBLIC-LAUNCH-STATUS.md) for the latest audit, two-existing-account rollback tests, public rules/privacy page and remaining blockers. The new leaked-password-protection warning supersedes earlier advisor summaries. NEW / Limited Testing stays on the homepage; unrestricted registration is not enabled.

## Public signup with reviewed messaging access

The latest incremental update is `public-registration.sql`, applied after the invitation update. Signup requires no code; messaging remains owner-admitted while the public launch checks are incomplete. See [current launch status](PUBLIC-LAUNCH-STATUS.md) for exact behavior, tests and owner steps. Do not rerun the bootstrap schema.
