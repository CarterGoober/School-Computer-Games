# Public launch preparation — limited testing only

The current deployment is based on the latest site (including the existing NEW Chat homepage feature), not a rollback to v31. `/chat/` and community rules/privacy are public. Protected conversations remain authenticated and invitation-restricted. The homepage badge remains NEW / Limited Testing; NOW LIVE is not enabled.

## Confirmed in the real database

- Two registered accounts, two stored grades, four saved messages. Before/after audit counts match. Owner setup is claimed; that actual account has the trusted admin role and all owner permissions. No moderator has announcement permission, so current announcements are owner-only. No new persistent accounts or messages were created by tests.
- Public registration is false. Private testing is on. Accounts remain unverified test identities; neither a school-looking email nor user-editable metadata proves student identity. Registration still requires a server-issued, email-bound invitation, with one-use redemption, expiry, and revocation.
- All chat tables have RLS. Anonymous message reads/RPC execution are not granted. Clients cannot update trusted grades, owner records or private invitation tables, or execute the legacy authorization-bypass path.
- Message reads/search/send rely on the trusted grade/member/session/block checks. Grade changes and moderator role/permission changes remain owner-controlled. Mod acceptance requires the intended authenticated UUID and a one-time private code; email lookup alone grants nothing.
- Realtime publication includes `acc_messages`; production scripts load the actual Supabase SDK, not fixture transports. Typing/presence/unread refresh still uses lightweight polling. This configuration check is not proof of browser WebSocket delivery.

## Tests performed

`test-launch-existing.sql` ran on Supabase in a rolled-back transaction with the two **existing real account/session contexts**. It did not obtain passwords, mint JWTs, log into browsers, create accounts, or modify verification timestamps. Tested owner permissions, student admin/announcement denial, grade/group privacy, friend-request/acceptance and DM creation, sending/replies/reactions, rate limits, blocking, reporting, group membership, deletion, moderator acceptance/revocation, and suspension/session invalidation. Editing a real user's metadata inside the rolled-back test did not change its trusted role or grade. All profile/message/friend/group/moderator/session changes rolled back.

This verifies database operations/authorization under the existing users' identities, **not** actual two-browser live networking. It must not be described as an end-to-end login or WebSocket test. The user said they can perform the browser checklist but has not yet reported completed results.

Desktop/mobile browser tests passed homepage feature/NEW gating, preserved eight game links, both Chat entry links, public login gate, community rules/privacy navigation, and layout overflow checks. Six delivery-state tests,46 current City Heist core/API tests and garage wallet/shop regressions passed. Hosting packaging checks the existing migration journal and Worker startup. No game simulation, Auth configuration, permission migration or persistent user data was changed in this preparation update.

## Audit finding requiring action

The latest Supabase security advisor reports **WARN: Leaked Password Protection Disabled**. Enable it in Supabase Authentication's password security/provider settings if the project plan supports it. If unavailable, document the plan/provider limitation and keep the pilot restricted rather than marking security checks complete. This new finding supersedes earlier reports saying there were no warning-level findings. The other reported findings are informational RLS-with-no-policy notices on intentionally private/RPC-only tables (plus the preexisting feedback table); adding broad policies to silence those would weaken access control.

## Remaining launch blockers

1. **Identity verification:** email confirmation is off for private testing; no school-email delivery/ownership verification has been implemented or tested. Keep private invitations until school-email verification or a documented secure identity review is available. Do not label these users verified students.
2. **Real browser transport checks:** use two independently logged-in approved accounts on separate browser profiles/devices. Exchange messages/replies/reactions; confirm actual Supabase WebSocket traffic, friend consent/DMs, private-group removal, typing/unreads, and disconnect/reconnect without duplicates. A successful database test or message delivered by polling does not prove WebSocket delivery. Record actual failures/results without sharing credentials.
3. **Password security:** address the leaked-password protection warning above and review the configured password/session settings. Email recovery remains unavailable; test-account password loss needs operator identity review.
4. **Operational moderation:** the owner can moderate, but there are currently zero accepted moderators. Assign a backup if required for the pilot and verify an actual intended user's invitation acceptance, report queue and suspension flow. Database acceptance/revocation passed; real browser acceptance remains unverified.
5. **Load/device testing:** sustained simultaneous-user load, school network/device behavior and long-duration reconnect testing have not been measured.

## Rules, privacy and deletion

Public `/chat/rules.html` explains respectful conduct, prohibited harassment/private data/spam/impersonation, appropriate content, homework learning, DM boundaries, reports and emergency limitations. It clearly states the service is unofficial, student-run, not operated by Little Elm ISD, and test accounts are unverified. Both the login card and logged-in Settings link to it.

Settings retains presence, logout and account deletion. Students can delete chat accounts; owner deletion requires operator transfer to avoid orphaning administration. The page documents private email handling, grade/member permissions, report access, scheduled retention, provider backup limitations, unavailable email recovery, and independence of game progress. No personal student information or transcript is published in the rules or audit report.
