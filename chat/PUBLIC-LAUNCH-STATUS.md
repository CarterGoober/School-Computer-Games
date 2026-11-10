# Public launch preparation — limited testing only

This records the v35 launch audit. For the subsequent notification/quick-DM update and newer test results, see [NOTIFICATIONS.md](NOTIFICATIONS.md).

The current deployment is based on the latest site (including the existing NEW Chat homepage feature), not a rollback to v31. `/chat/` and community rules/privacy are public. Public signup no longer requires a code. Protected conversations remain authenticated and owner-admitted. New signups cannot access messages until the owner independently reviews their actual account ID. The homepage badge remains NEW / Limited Testing; NOW LIVE is not enabled.

## Confirmed in the real database

- Two registered accounts, two stored grades, four saved messages. Before/after audit counts match. Owner setup is claimed; that actual account has the trusted admin role and all owner permissions. No moderator has announcement permission, so current announcements are owner-only. No new persistent accounts or messages were created by tests.
- `public_signup=true`, `ready=false`, `password_testing=true`. Public registration accepts exact-domain addresses without an invitation; new accounts are pending, not automatically admitted. Accounts remain unverified identities; neither a school-looking email nor editable metadata proves student identity. Existing approved accounts retain access. Previous invitation records remain intact for private-mode rollback but do not grant public signups automatic access.
- All chat tables have RLS. Anonymous message reads/RPC execution are not granted. Clients cannot update trusted grades, owner records or private invitation tables, or execute the legacy authorization-bypass path.
- Message reads/search/send rely on the trusted grade/member/session/block checks. Grade changes and moderator role/permission changes remain owner-controlled. Mod acceptance requires the intended authenticated UUID and a one-time private code; email lookup alone grants nothing.
- Realtime publication includes `acc_messages`; production scripts load the actual Supabase SDK, not fixture transports. Typing/presence/unread refresh still uses lightweight polling. This configuration check is not proof of browser WebSocket delivery.

## Tests performed

`test-launch-existing.sql` ran on Supabase in a rolled-back transaction with the two **existing real account/session contexts**. It did not obtain passwords, mint JWTs, log into browsers, create accounts, or modify verification timestamps. Tested owner permissions, student admin/announcement denial, grade/group privacy, friend-request/acceptance and DM creation, sending/replies/reactions, rate limits, blocking, reporting, group membership, deletion, moderator acceptance/revocation, and suspension/session invalidation. Editing a real user's metadata inside the rolled-back test did not change its trusted role or grade. All profile/message/friend/group/moderator/session changes rolled back.

This verifies database operations/authorization under the existing users' identities, **not** actual two-browser live networking. It must not be described as an end-to-end login or WebSocket test. The user subsequently reported that messages, replies, reactions, consented DMs and disconnect/reconnect all passed in separate browsers. These are user-reported functional results, not independently captured WebSocket traces.

Desktop/mobile browser tests passed homepage feature/NEW gating, preserved eight game links, both Chat entry links, public login gate, community rules/privacy navigation, and layout overflow checks. Six delivery-state tests,46 current City Heist core/API tests and garage wallet/shop regressions passed. Hosting packaging checks the existing migration journal and Worker startup. No game simulation, Auth configuration, permission migration or persistent user data was changed in this preparation update.

## Audit finding requiring action

The latest Supabase security advisor reports **WARN: Leaked Password Protection Disabled**. Enable it in Supabase Authentication's password security/provider settings if the project plan supports it. If unavailable, document the plan/provider limitation and keep the pilot restricted rather than marking security checks complete. This new finding supersedes earlier reports saying there were no warning-level findings. The other reported findings are informational RLS-with-no-policy notices on intentionally private/RPC-only tables (plus the preexisting feedback table); adding broad policies to silence those would weaken access control.

## Remaining launch blockers

1. **Identity verification:** email confirmation is off for private testing; no school-email delivery/ownership verification has been implemented or tested. Keep new messaging access behind owner review until school-email verification or a documented secure identity review and real-browser checks are complete. Do not label these users verified students.
2. **Remaining real browser checks:** the user reports passing messages/replies/reactions, consented DMs and reconnect with the existing accounts. New code-free password signup/login, private-group removal, typing/unreads and independently captured WebSocket delivery have not been verified. A functional message test does not by itself distinguish WebSocket delivery from polling.
3. **Password security:** address the leaked-password protection warning above and review the configured password/session settings. Email recovery remains unavailable; test-account password loss needs operator identity review.
4. **Operational moderation:** the owner can moderate, but there are currently zero accepted moderators. Assign a backup if required for the pilot and verify an actual intended user's invitation acceptance, report queue and suspension flow. Database acceptance/revocation passed; real browser acceptance remains unverified.
5. **Load/device testing:** sustained simultaneous-user load, school network/device behavior and long-duration reconnect testing have not been measured.

## Rules, privacy and deletion

Public `/chat/rules.html` explains respectful conduct, prohibited harassment/private data/spam/impersonation, appropriate content, homework learning, DM boundaries, reports and emergency limitations. It clearly states the service is unofficial, student-run, not operated by Little Elm ISD, and all current accounts have unverified emails and student identities. Both the login card and logged-in Settings link to it.

Settings retains presence, logout and account deletion. Students can delete chat accounts; owner deletion requires operator transfer to avoid orphaning administration. The page documents private email handling, grade/member permissions, report access, scheduled retention, provider backup limitations, unavailable email recovery, and independence of game progress. No personal student information or transcript is published in the rules or audit report.


## Public signup update

The public create-account form has no invitation field. Supabase still manages passwords; unique usernames, required grades 9–12, exact school domain and default student roles are enforced in the database. New profiles get no approved identity binding, so existing `verified()` eligibility and message RLS reject them even when Auth auto-confirms the email internally. Authentication is separate from chat admission. Supabase's confirmation timestamp is not displayed or treated as proof of school identity for these accounts.

New users can log in to view their own pending account ID, check approval, log out or delete the pending account. Only the actual owner can open **Settings → Owner dashboard → Registrations**, independently review the person and account ID, paste that exact ID, and approve student access. No email lookup, client metadata, signup field or invitation grants staff roles or chat admission. Owner approval is an operational review, not a claim of verified school-email ownership. The owner can revoke admission from Users; message access stops through the same server eligibility checks. Other account/role/moderation/grade systems are unchanged.

The new `test-public-registration.sql` passed on Supabase. It tests signup hooks and triggers with an unverified throwaway fixture (no password, session, confirmation or email), then pending/approval/revocation using the two existing account contexts, plus authenticated direct-message RLS denial and anonymous denial. All fixture and user changes rolled back. Exact-domain/subdomain/suffix rejection, unique case-insensitive usernames, grade validation, client-metadata role escalation denial, owner-ID protection and review confirmation checks passed. The existing two-account integration suite also passed after this change. The account/message counts remain two/four.

Desktop/mobile public signup tests passed: no code field, grade selection, clear unverified/approval disclosure, protected message gate and disabled email recovery. A separate UI-only mocked session checked pending controls and logout; it is explicitly not an Auth or live messaging test. Homepage, public rules and six delivery-state tests also passed. New code-free password registration/login remains unverified. The user reports functional two-browser messaging/replies/reactions/DMs and reconnect passing, but transport traces were not captured; moderator acceptance is not confirmed in the database; no passwords/session tokens were requested or inspected. Unrestricted messaging has not been enabled.

A direct live Auth HTTP rejection probe could not reach Supabase from this executor (`EAI_AGAIN` DNS failure). No account was created by the probe. Database connectivity through the Supabase connector worked; do not treat it as proof that this executor reached the public Auth endpoint.


### User-reported browser results and moderator discrepancy

The user reports that the two-account functional checklist all passed, and says an invitation was accepted. A fresh server audit still shows zero accepted moderator invitations and zero active moderators (and no pending moderator invitations). Therefore moderator acceptance cannot be marked verified from that statement. The owner remains active with full moderation permissions. To appoint a moderator, the owner must use **Owner dashboard → Moderators → Create private moderator invitation** and the intended approved account must use **Settings → Accept moderator invitation** with that code. Ordinary signup/friend invitations do not grant staff roles. No role was assigned automatically in response to the report.
