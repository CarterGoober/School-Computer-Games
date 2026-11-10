# After Class Chat — approved pilot setup

The app design and game saves are unchanged. The Supabase project is `afterclass-garage` (`gvurobdhsvcvdywdsgne`). This setup is not complete and is not approval to open public registration.

## Current verified state

- `acc_private.launch.ready=false`: public enrollment remains closed.
- `acc_private.launch.pilot_enabled=false`: private pilot enrollment also stays off until SMTP is configured.
- One user-approved school inbox has a private SHA-256 allowlist entry. Its email is not in repository source or public responses.
- There are **zero Auth accounts**. No student was created or marked verified. No moderator role has been assigned. The provided inbox can be promoted only after genuine email verification and operator confirmation.
- Live read-only Auth settings probe: HTTP200, email provider enabled, `mailer_autoconfirm=false`, `disable_signup=false`. Email confirmation is required. The Auth service accepts signup attempts, but the database registration gate denies creation unless enrollment is allowed. Its global signup toggle cannot be changed through the connected tools; see below.
- Live negative signup probe using a non-school `.invalid` address returned HTTP500/P0001 with the exact-domain rejection message and no user/session. This is the existing trigger rejection, not a successful signup. Activating the supported Before User Created hook provides an earlier403 rejection. No school account was created.
- Live anonymous HTTP checks: chat RPC bootstrap **401**, direct message-table SELECT **401**. No student data was returned.
- `acc_messages` is in the `supabase_realtime` publication; its RLS policy requires actual confirmed school email, active session, enrollment and room membership. Other chat tables deny direct client reads/writes.
- Security advisors show informational no-policy findings on deliberately RPC-only/deny-by-default tables, not broad-access policies.

## Do these dashboard steps

Use the [existing project](https://supabase.com/dashboard/project/gvurobdhsvcvdywdsgne). No new project, service-role key, or Site environment variable is required.

### 1. Configure SMTP in protected settings

Open **Authentication → Email → SMTP settings** (the dashboard may label this **Custom SMTP**).

1. Choose an SMTP provider and verify a sender address/domain you control. You do not need, and should not change, the school district's DNS. The sender can use your own domain; recipient restriction is independent of sender domain.
2. Enter **Sender email**, **Sender name** (`After Class Chat`), **SMTP host**, **port**, **username**, and **password** exactly as issued by that provider. Keep TLS enabled. Use a provider-supported port (commonly465 for implicit TLS or587 for STARTTLS).
3. Store the SMTP password/API key only in Supabase's protected SMTP settings. Do not paste it in chat, `config.js`, Git, or the Sites public environment. Supabase Auth sends these emails directly; the game Worker does not need SMTP credentials.
4. Set a sender domain's required SPF/DKIM records using the provider's instructions. Do not use a district address as From unless you actually administer its sender configuration.
5. Check provider delivery events and inbox/spam delivery for the approved school recipient after controlled signup. SMTP acceptance alone does not prove delivery to school mailboxes.

No SMTP host/password has been invented or configured by the assistant. Provider setup and access to the school mailbox are required from you.

### 2. Set Auth policy and redirects

In **Authentication → Sign In / Providers** (or **Providers → Email**):

- Email/password provider ON; **Confirm email ON**. Keep unused social/phone/anonymous providers OFF.
- Keep **Allow new users to sign up OFF** while configuring SMTP. For approved pilot signup only, turn this Auth toggle ON after the database pilot allowlist is enabled. Public accounts still cannot be created while `ready=false` and the private allowlist is enforced.
- Set minimum password length12; enable stronger/leaked-password checks if supported by the project plan.
- Set email confirmation/recovery OTP expiry to900seconds (15minutes); preserve one-time use. Set a conservative email resend interval (at least60seconds), email rate limits sized for a two-person pilot, and a short JWT lifetime (for example900seconds).
- Keep refresh-token rotation and reuse protection enabled. Record actual dashboard values rather than assuming defaults were changed.

In **Authentication → URL Configuration**:

- **Site URL**: `https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.site/chat/`
- **Redirect URLs**: add that **exact** URL. Avoid wildcard hosts or arbitrary redirect destinations.
- Signup, resend and password recovery all request that same `/chat/` callback. Leave Supabase's confirmation URL in email templates; the bundled SDK handles the PKCE code exchange.
- Templates should identify this as an unofficial, student-run service. Explain link expiry. Do not include student usernames or other private information unnecessarily.

Access/refresh tokens stay in sessionStorage. Only the one-time PKCE verifier is in shared localStorage, enabling a link to open in a new tab on the same browser profile. Another device/profile cannot redeem that browser-bound PKCE flow; request a new link there. The SDK removes the verifier after exchange. Actual email redemption/recovery still requires testing.

### 3. Activate the installed server Auth hooks

Open **Authentication → Hooks** and select the existing Postgres functions:

| Hook | Function |
| --- | --- |
| Before User Created | `public.acc_before_signup` |
| Custom Access Token | `public.acc_before_token` |

The wrappers are SECURITY INVOKER and executable only by `supabase_auth_admin`. Their private implementations enforce approved exact school email; the token hook also requires actual `email_confirmed_at` and a nonsuspended profile. They do not trust user_metadata for roles. Protected chat/RLS/session checks remain in force even before hooks are enabled.

**Installed does not mean active:** connected tools cannot set dashboard Auth hook configuration. Activation and actual login/token-issuance tests are still required. The registration trigger already rejects wrong-domain/unapproved account inserts; active Auth hooks add clear early signup rejection and enforce eligibility before login/refresh tokens are issued. Do not claim Auth-service login enforcement is tested until these hooks are selected and verified.

### 4. Open only the controlled pilot

A second approved, independently controlled `@leisdstudent.ws` inbox is required. Do not create another student identity yourself or use SQL to mark an address verified.

An authorized database operator can add an approved inbox without creating an account:

```sql
select acc_private.approve_pilot('<approved-school-email>');
```

After SMTP, redirects and Auth hooks are configured:

```sql
update acc_private.launch set pilot_enabled=true, ready=false where id;
```

Then change `ChatConfig.emailReady` to `true` and publish that small config update. The flag means email setup is ready for testing, not that public registration is open. No approved addresses should be added to frontend config. The approved users register themselves normally and click the real delivered verification link. Any nonallowlisted inbox remains blocked, including other school inboxes.

To stop the pilot immediately:

```sql
update acc_private.launch set pilot_enabled=false, ready=false where id;
```

### 5. Set the authorized moderator after verification

Once the provided inbox is genuinely confirmed, an authorized operator can run:

```sql
select acc_private.promote_pilot_moderator('<approved-school-email>');
```

This checks that the account actually exists, its email is confirmed, it is nonsuspended and privately allowlisted. Otherwise it raises an error and changes no role. It grants **moderator**, not administrator. Clients cannot execute this function. Role assignment is logged without the email address. No role is assigned merely for being first to register or claiming metadata.

There should be someone actually monitoring the report queue before the second user begins testing.

## Launch test sheet — must be completed with real approved accounts

Keep public `ready=false` for every pilot test.

| Test | Current result |
| --- | --- |
| School-domain matcher, spoofed suffix/subdomain/whitespace rejection | Passed database policy tests |
| Private allowlist does not open public enrollment | Passed rollback-only policy test; no accounts created |
| Anonymous REST/RPC access | Live HTTP401 verified |
| Unverified/sessionless database access and unverified moderator promotion | Rejected in server tests; no verification bypass used |
| Real registration → school inbox delivery → verification → login/logout | **Blocked by SMTP/manual setup** |
| Resend, expired link, reused link, password recovery/update | **Unverified** |
| Auth hook activation and token-issuance denial | Functions installed and negative outputs/privileges checked; **dashboard activation and real login unverified** |
| Two independent verified users: WebSocket messages/replies/reactions | **Unverified; needs second inbox** |
| Friend request → acceptance → DM; unaccepted/blocked DM rejection | Code/RLS inspected; **real-account test unverified** |
| Private group invitation, removal, denied search/report/direct table access | RLS/access implementation inspected; **real-account test unverified** |
| Moderator report review, message deletion, suspension, session revocation | Server code/permissions inspected; **real-account test unverified** |
| Reconnect, uncertain send retry, ordered duplicate snapshots | Six local delivery-state tests passed; **real-network two-account test unverified** |
| PKCE verifier across tabs, tab-local login tokens | Storage unit test passed; **actual emailed link unverified** |
| Desktop/mobile gate and interface | Local browser checks passed; transport fixture tests are not live account verification |
| Existing games, wallet/shop |46 City Heist tests and wallet/shop regressions passed |

Run both browser profiles against the published app, not the simulated transport test. Confirm the UI says **Live**, inspect the actual Supabase WebSocket connection, send at least10messages in each direction, then disconnect one network and reconnect. Verify no duplicate IDs and stable ordering. A polling-delivered message alone does not prove WebSocket delivery. Typing/presence/unread refreshes are still lightweight polling, not WebSocket broadcasts.

Do not run the historical `test-database.sql` to satisfy these launch tests: it creates rollback-only synthetic Auth fixtures from v28. This update intentionally used `test-pilot.sql`, which creates **no Auth users or sessions**. UI fixture tests are explicitly simulated browser diagnostics, never production transport.

## Source and operations

- `pilot-setup.sql`: incremental migration applied to the existing project; no existing student data was deleted. The bootstrap `schema.sql` is historical and must be followed by this migration for a fresh installation.
- `test-pilot.sql`: exact domain, closed gates, allowlist policy, Auth hook ACLs, sessionless RLS/RPC and rejected unverified promotion. Temporary allowlist-only policy row rolls back.
- `delivery.js` / `test-delivery.cjs`: reuse send nonce after uncertain failures, prevent concurrent submits, stable sorted/deduplicated snapshots, logout reset, cross-tab PKCE verifier storage.
- Production loads real `supabase.js` and no fixture transport. The simulated test script is a `.cjs` source test, not a served app script.

No SMTP credentials, inbox passwords, Auth access/refresh tokens or verification links belong in these files. No school email address is published in source. No claim of pilot readiness is made until all required real-account tests above pass.
