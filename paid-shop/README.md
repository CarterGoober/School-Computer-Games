# Paid Shop candidate — NOT PUBLISHED

This extends the existing Credits shop. It does not migrate local Garage Credits or use them to pay for cash cosmetics. No production database changes, Edge Function deployment, Stripe account connection, real purchases, subscriptions, or public Paid tab release have occurred.

## Implemented locally

- Credits / Paid / Owned navigation; seven priced preview entries, bundle contents, ownership/equipment controls, purchase history/refresh, checkout confirmation and support link. Credits rendering and progression code are unchanged.
- Chat settings deep-link and cosmetic decoration hooks for message avatars, the member list and profile dialogs. These consume server-confirmed equipment; no local paid unlocks.
- Test-only Stripe hosted checkout transport with server catalog prices, Stripe Price validation, stable order idempotency key, fixed return origins, account authentication and private tester access.
- Exact-body HMAC webhook verification, timestamp tolerance, fail-closed live-event rejection, atomic event deduplication and grants. Paid amount/currency/user/order/session must match. Refund/dispute revocation; won disputes restore eligible grants. Delayed paid events cannot override refunds.
- Server-only catalog mutation for the existing platform owner. Existing bundle membership is seeded; the admin form does not yet edit bundle contents.
- Private RLS-enabled commerce tables with revoked direct client permissions. Access is through narrow authenticated RPCs; payment processing RPC is service-role-only. No owner changes or editable-metadata authorization.
- Inactive $2.99 plan and entitlement schema; proposed limits are provisional, not advertised or applied to free AI.

## Test configuration still required

Use the existing Stripe account in **test mode/sandbox**, without enabling live charges:
1. Create one-time USD test Prices matching `catalog.json`. Do not create recurring prices yet.
2. Put `STRIPE_SECRET_KEY=sk_test_…` in Supabase Edge Functions → Secrets. Never send its value in chat.
3. Confirm a refund policy and publishable policy URL. Support is `cartertc11@gmail.com`; this address has not been independently verified. `GARAGE_REFUND_POLICY_URL` is required; merchant age, guardian purchase rules, tax obligations and Stripe account eligibility still need owner configuration.
4. After private deployment review, apply `schema.sql`, `api.sql`, `seed.sql` in order and deploy `index.ts`, `gateway.mjs`, `stripe.mjs` as `garage-shop` with gateway JWT verification off. The handler performs caller authentication via the trusted account RPC; webhook authentication uses Stripe signatures.
5. Register test webhook destination `https://gvurobdhsvcvdywdsgne.supabase.co/functions/v1/garage-shop/webhook`; subscribe to checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, charge.refunded, charge.dispute.created and charge.dispute.closed. Store its `whsec_…` as `STRIPE_WEBHOOK_SECRET` in Supabase, never chat.
6. Configure `GARAGE_SITE_URL` (HTTPS origin only) and `GARAGE_COMMERCE_TEST_ENABLED=true`. Add approved testers to the private testers table; owner is eligible automatically. Use owner catalog controls to bind each test price and enable test items.
7. Test with two real authenticated accounts and Stripe test payment methods: successful/failed checkout, duplicate deliveries, refunds, disputes, restoration, unauthorized access and Chat appearance consistency. Do not deploy the Paid tab publicly until approved.

Supabase Auth redirects must separately allow the chosen legitimate site origin in the Supabase dashboard. Stripe returns use the single trusted GARAGE_SITE_URL; no browser-controlled URLs or alternate hosting domains are introduced.

## Tests actually run

- Four Node tests: trusted prices and idempotency, live-key rejection, exact signature verification/tampering/expiry/live-event rejection, paid-session binding.
- Local PostgreSQL via PGlite 0.3.14: schemas compile; fixtures verify account/tester/owner permissions, denied table/payment-RPC access, order reuse, mismatched payment denial, fulfillment, duplicate events, equip/duplicate-purchase denial, dispute revocation/win/stale-event handling, refunds and delayed events. Fixtures use synthetic local identities; no production identities or verification bypasses.
- Desktop/mobile Playwright fixtures: tabs, server-snapshot ownership, equip and returning to Credits. No real Stripe session used.
- Existing Credits shop logic tests pass. Production database read-only inspection confirms existing account/owner guards and no commerce schema.

## Remaining blockers / incomplete work

- No Stripe credentials or webhook delivery test; no production schema or endpoint. End-to-end payment integration is not launch-ready.
- Refund policy, guardian/age requirements, merchant eligibility, tax settings and real receipts/support workflow need confirmation and testing. Current conservative behavior revokes the entire order after any refund; policy must define partial-bundle refunds before release.
- Unknown payment-intent refund/dispute events currently retry instead of distinguishing unrelated existing Stripe products; resolve against Stripe metadata before connecting an account-wide webhook. Never acknowledge a relevant revocation before binding it safely.
- Test-only ownership cannot be promoted to live ownership. A reviewed live-mode design and separate approval are required.
- Chat cosmetics hooks need real multi-account verification; custom-server-specific screens and live refresh across every surface remain unverified. Art previews use original simple symbols; detailed avatar artwork and full profile-wide theme application remain incomplete.
- AI Plus has schema only. Cloudflare metering, cost projections, subscription events, customer portal, fair-use enforcement and Billing integration remain incomplete and disabled. No advertised or enabled paid AI benefits.
- Public launch must not reuse the provisional 90-question/15-image plan limits without actual consumption measurements. Stripe fees can consume a large share of $0.99 purchases; obtain account/country-specific pricing before enabling commerce.

Development tests require Playwright already present and a local PGlite install at `/tmp/garage-commerce-tests` (`npm install --prefix /tmp/garage-commerce-tests @electric-sql/pglite@0.3.14`). No paid tools were enabled.
