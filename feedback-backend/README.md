# Feedback backend

Project: `gvurobdhsvcvdywdsgne` (`https://gvurobdhsvcvdywdsgne.supabase.co`). The frontend uses only the public publishable key in `feedback.js`. No password, secret key, or service-role key belongs in this repository.

`setup.sql` is repeatable and preserves existing rows. Run it as the database owner in the Supabase SQL editor to restore the schema on a new project or update the existing one. The setup was applied to the supplied project during this update; anonymous reads were verified through the database role. Its direct HTTPS endpoint is blocked by this cloud workspace's outbound host policy, so HTTP/CORS behavior must also be checked from the published site.

The table `public.garage_feedback` has RLS enabled with no public policies and no direct privileges for `anon` or `authenticated`. Public API functions use invoker security and call narrowly scoped validated implementations in `garage_private`. Keep `garage_private` out of Supabase's exposed Data API schemas. The private implementations intentionally permit anonymous submissions, use a fixed empty search path, and have explicit execute grants. Reading returns only visible public fields; client IDs remain private. No client can set timestamps/visibility or update/delete a row.

- `submit_garage_feedback`: validates UUIDs, nickname (2–24), title (1–90), message (10–1200), game, kind, and review stars (1–5). A honeypot rejects basic bots. Server-side advisory locking serializes each browser's submissions. One submission per minute, at most five per rolling 24 hours; retries of the same submission UUID return the original acknowledgement without inserting again.
- `list_garage_feedback_v2`: game/type filters, a bounded recent list, counts and average rating. Only the latest visible review per browser/game contributes to ratings. The previous two-argument list endpoint remains compatible.

These are basic per-browser limits, not verified identities. A determined visitor can clear storage or change client IDs; usernames can be reused. For a larger public audience, add a trusted server-side CAPTCHA/IP limiter. Don't put a privileged key in browser code to do that.

## Moderation

Use the Supabase table editor or SQL editor as project owner. Hide an entry without deleting it:

```sql
update public.garage_feedback set visible = false where id = '<submission-uuid>';
```

Set `visible = true` to restore it. Hidden entries do not appear in lists or rating averages. Keep the rate-limit history when moderating rather than deleting rows.

The Supabase advisor's informational “RLS enabled, no policy” finding is expected here: the table is deliberately closed and accessible only through the validated functions. During this update the unrelated internal `public.rls_auto_enable()` event trigger also had its public execute grants revoked; it continues operating as an owner-run DDL trigger.

## Verification

No fake reviews were posted to production. `test-feedback-db.cjs` runs setup and submission tests in isolated PGlite PostgreSQL, including validation, duplicate retries, both rate limits, direct-table denial, filtered reads, private fields and moderation. Browser tests intercept all Supabase traffic. Production checks verify schema/constraints, function permissions, security advisors and read-only results as `anon`.
