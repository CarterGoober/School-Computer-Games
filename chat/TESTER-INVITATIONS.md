# Owner signup invitations

Sign into your existing owner account → Settings → Owner dashboard → Invitations.

1. Enter your friend's exact approved `@leisdstudent.ws` email address.
2. Click **Generate invitation**.
3. Click **Copy code** in the result card and send it privately. The code is shown only on generation; navigating away discards the plaintext. If needed, generate a replacement (which revokes previous unused invitations for that email).
4. Your friend opens `/chat/` → Create account, selects grade9–12 and enters that same school email, unique username, password and code in **Private test invitation**.
5. Invitations below the form show Active/Used/Expired/Revoked. Use **Revoke** to invalidate an unused code. Revoking a used code cannot delete or ban an existing account; manage that separately under Users.

Codes contain256bits of server-generated randomness. Only hashes are persisted. Each code expires exactly24hours after creation and is tied to the approved recipient email. Creation/list/revocation require the actual authenticated owner UUID and active eligible session; neither student nor moderator role alone grants access. Rate limit:30 created invitations per hour. Addresses are stored as hashes; invitation lists expose no raw student email addresses. No raw invitation codes go into audit logs.

Redemption is validated in the Auth signup transaction, following the existing per-email row lock. A matching active, unexpired, unrevoked code must exist, and a new Auth user must use the exact school domain. The code is marked redeemed in that same transaction. Failed username/grade/signup validation rolls back the claim; simultaneous claims cannot both succeed. Editing metadata cannot grant roles: new profiles still receive the normal student role, and invitation creation accepts no privilege settings. Moderator invitations and owner setup are separate systems.

`tester-invitations.sql` is an additive migration after `grades-admin.sql`; account access bindings, memberships, owner setup, moderation and game data remain unchanged. New registration codes replace the previous operator-file signup-code validation path. Existing registered accounts do not need to redeem again. Public `ready` remains false.

Tests: `test-tester-invitations.sql` ran on Supabase in a rolled-back transaction using the existing owner/session context and an unconfirmed normal-student fixture. Passed secure generation/expiry, domain/email checks, revoked/expired denial, successful student registration/redemption, replay rejection, metadata role escalation denial and student invitation-admin denial. No persistent test account/invitation/message remains. The fixture does not prove live Auth password login or email ownership.

`test-admin-ui.cjs` passed owner Invitations generation/read-only code/copy fallback/revoke wiring and mobile overflow with an explicitly simulated transport. The production app uses real Supabase RPCs, not that test transport. Existing six delivery tests and46 City Heist tests passed. Actual friend signup in the published app still needs the owner-generated code and the friend choosing their own password.
