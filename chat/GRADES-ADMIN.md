# Grades, owner and moderators

## Required owner action

Sign into your **existing** account and open Settings → Owner setup. Use the separately delivered private owner-setup code. It expires after24hours and can only be redeemed once by the preselected Auth UUID. The candidate was selected from the existing claimed private-signup invitation, not a typed email match. Until you redeem it, nobody has the owner role or announcement posting by default. Do not share the setup code.

Once claimed, Settings → Owner dashboard lets you:
- Users: approve initial/missing grades and requested grade changes, ban/restore accounts, mute/unmute.
- Moderators: look up an already-registered student by email, check the displayed username/Auth UUID against the intended person, and share the generated acceptance code privately. The intended logged-in UUID must explicitly accept in Settings → Accept moderator invitation. An email match does not grant a role. Codes expire after24hours, are single-use, and role revocation deletes pending invitations.
- Configure/revoke accepted moderator permissions: reports, message moderation, temporary mutes, bans, announcement posting. Defaults enable reports/messages/mutes only. Moderators cannot manage users' grades, channels, roles, ownership or community settings.
- Channels: create/rename/configure school-wide, subject or grade-limited channels and owner/permission-only posting. Delete archives the channel and retains history; restoring is supported. Private DMs/groups are not exposed for unrestricted browsing. Reported private messages remain reviewable in the report queue.
- Reports/Messages: review/resolve reports, search authorized school channels and delete messages.
- Settings: pause community chat and control private-group creation. Supabase Auth/SMTP and public-registration policy remain operator controls, not moderator controls.

Assign your own grade in the Users page. The one existing pre-update account is preserved with a pending grade; it cannot access grade chats until you approve an assignment. School-wide, subject, DM and group features remain available under their existing permissions.

## Server implementation

`grades-admin.sql` is an additive migration after `password-testing.sql`. Initial grade9–12 is required in signup and validated/persisted by an Auth INSERT trigger. This is a self-declared initial choice, not a claim that grade was verified externally. Editable metadata is never read for ongoing authorization. Updating metadata after registration cannot change the trusted grade or role. Later changes require an owner action; users can only submit requests.

Grade channel access is enforced by the database helper used in `acc_messages` RLS and every authorized message/search/send operation. Students/moderators see their own grade only; the owner can administer all school grades. Missing grades deny all grade rooms. School/subject channels remain open to approved accounts. Existing room IDs and message history are preserved.

All operations enter `acc_private.manage`, which verifies the real account/session and trusted owner/moderator permissions. The legacy RPC implementation is private and its client execute grant was revoked. The public wrapper remains SECURITY INVOKER. New private tables have RLS and no client table grants. Owner identity is a single protected UUID, never editable metadata or an admin-role string. Own-role deletion/demotion/ban through app controls is blocked. Moderators cannot appoint owners or grant themselves permissions.

Moderation changes and owner actions are audited without storing student email addresses. Email lookup is available only to the authenticated owner, returns the existing account UUID/username and a one-time code, and does not expose emails to student profiles. Accounts remain labelled unverified private-test identities.

## Tests and limits

`test-grades-admin.sql` passed against Supabase in a transaction rolled back after checking four unconfirmed grade registrations, each grade's access restrictions, direct RLS denial, school access, metadata spoof resistance, student admin/announcement denial, owner code recipient binding/replay protection, moderator intended-recipient acceptance, default announcement denial, explicit announcement permission, settings denial, grade requests/approval and role revocation. Fixture accounts/settings/messages do not persist; no email-confirmation timestamp is set.

`test-admin-ui.cjs` passed desktop/mobile owner dashboard tab/wiring checks using an explicitly simulated browser transport. This is a UI test, not a live authenticated owner claim. Existing six delivery tests and46 City Heist core tests passed. Production uses the real Supabase SDK and no simulated transport.

Actual owner redemption and a real second person's moderator acceptance remain required user actions. End-to-end two-real-account Realtime testing remains unverified. Public registration remains false; only private testing is enabled. One real existing account and its profile are preserved; no persistent test accounts/messages were created. Security advisors list only informational deny-by-default/no-policy findings for intentionally private/RPC-only tables.
