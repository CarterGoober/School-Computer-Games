# Private password testing — current mode

This mode supersedes the verification-required pilot launch instructions while private testing is enabled. The design and game data are unchanged.

## One required dashboard setting

In [Supabase Authentication](https://supabase.com/dashboard/project/gvurobdhsvcvdywdsgne/auth/providers), open **Sign In / Providers → Email** and turn **Confirm email OFF**. Keep email/password signup enabled for the private pilot. The database, not a public UI flag, still rejects every nonapproved/invitationless account.

The connected Supabase tools cannot change Auth settings; no credentials or SMTP service is needed for this mode. The app checks `/auth/v1/settings` before signup and blocks it if confirmation is still enabled. It never writes `email_confirmed_at` to work around the setting. Supabase may auto-populate that field when confirmation is off; the app's private test-identity record remains authoritative and the account is **unverified** regardless.

The operator has enabled private password testing and pilot enrollment, with public `ready=false`. One previously approved school inbox has a private invitation. The invitation is delivered separately as an owner-only workspace file, not committed to source or published. Keep it private. Use Create account with that approved inbox, a unique username, your own password and the invitation code. The operator never needs the password.

## Identity and access safeguards

- Exact school domain enforced by the Auth user trigger and prepared Auth hooks. Unique usernames remain case-insensitive; passwords remain managed by Supabase Auth.
- Email allowlisting alone is insufficient. Signup requires a high-entropy single-use invitation whose hash is stored in a private table. It is consumed under a row lock and bound to the new Auth UUID. The invitation is removed from stored user metadata after account creation.
- Access requires the private UUID/email binding, enabled allowlist entry, enabled private-testing mode, an actual active Auth session and a nonsuspended profile. No email-confirmation bypass grants general access, and editing user metadata cannot confer membership, identity or roles. Existing RLS room checks, DM consent, groups, blocking and moderation remain in force.
- Accounts are labelled **Unverified test account**. They must not be represented as verified students. No moderator role is automatically assigned. The email-verified moderator helper rejects private-test identities; any test moderator requires an explicit operator decision.
- Recovery and verification resending remain disabled until email delivery is configured. Keep your test password. A lost-password case requires an operator-reviewed reset/invitation rotation, not proving identity by claiming an email address.
- The prepared `acc_before_signup` and `acc_before_token` hooks now understand test bindings. If enabled in Auth settings, use those existing functions. The database's registration/RLS/session gates remain enforced independently of hook activation.
- Public enrollment remains closed. To stop private access too: `update acc_private.launch set ready=false,pilot_enabled=false,password_testing=false where id;`.

## Verification

`test-password-testing.sql` passed against the real database inside a rolled-back transaction. It creates only explicitly unconfirmed test fixtures, never sets an email-confirmation timestamp, and checks invitation match, consumed-token replay rejection, student role, unverified label, metadata impersonation attempts and revocation/RLS. Fixture accounts and sessions are rolled back; none persist. The actual approved invitation is not used by tests.

`test-test-signup.cjs` checks the browser SDK invocation with an isolated stub: confirmation-on prevents signup; confirmation-off permits the invitation-bearing SDK request; wrong-domain addresses are rejected; recovery/resend are unavailable. This is not a successful live signup or login test. Existing two-browser transport-fixture regression and delivery tests cover UI behavior separately; production still uses the real Supabase SDK.

**Still unverified:** successful real Supabase signup/login/logout in this mode, two independently authenticated test accounts, and live WebSocket conversations, until the dashboard toggle is changed and approved testers register themselves. No claim of successful live Auth is made. No email delivery/identity verification is available in this mode.
