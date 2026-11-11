> Current provider/setup: [CLOUDFLARE.md](CLOUDFLARE.md). This supersedes the Gemini deployment instructions below; do not enable Gemini. Current changes remain unpublished.

# Garage AI — web-first, free-tier deployment candidate

Status: LOCAL ONLY. No site publication, Edge Function deployment, database change, secret configuration, provider request or billing activation was performed for this update. The previously published v42 site is unchanged. Owner approval is required before any publication.

## Website flow

Open `/garage-ai/` from Garage. The web version needs no extension, Developer Mode, installation or special browser permission. It does not use Chrome APIs, getDisplayMedia, microphone, camera, tab APIs or page-reading scripts.

- Sign in directly with the existing Supabase school account. The existing server session/domain/suspension check and free student quota RPC remain authoritative. Grade chats, roles and wallet data are untouched.
- Open the compact Garage AI panel, minimize without losing the draft, or expand it. Account and settings controls are available inside the panel as well as the page header.
- Ask questions or add study text. Markdown and math reuse the existing local rendering libraries; output HTML is sanitized.
- Add a PNG/JPEG/WebP screenshot through the ordinary file chooser. The browser prepares a local JPEG preview capped at 1600 pixels on the longest side. Source files over 12MB or decoded images over 40MP are rejected. No upload occurs just because a file was chosen.
- Manual mode: confirm the screenshot, then explicitly Send. Added study text goes into the draft.
- Automatic mode: choosing a file still only prepares a local preview. **Confirm & analyze** sends it. **Use this text** sends explicitly added study text. It does not analyze on opening, typing, minimizing, navigating or changing tabs.
- Theme, response style and optional device history are configurable. History is off by default, stores only text, and is separated by authenticated account ID. Switching accounts discards the previous account's unsent/private in-memory state; late responses are ignored. Clearing history also cancels pending requests. Already-submitted provider requests may still finish and count toward quota.
- Sign out uses Supabase's local scope for the current website session. Since Chat and Garage AI share the same site account, signing out of Garage affects that site session; it does not delete the account.
- Error responses retain drafts and confirmed attachments. No simulated answers are shipped.

## Zero-cost boundary

Source/build/distribution use existing local tools and the current Garage hosting/Supabase architecture. No Chrome Web Store submission, store registration fee, new paid host, subscription, payment processing, credits purchase or new paid service is introduced. Keep the existing unpacked extension for devices where administrators permit it.

Free hosting and AI availability are subject to the actual Sites, Supabase and Google account plans, provider availability and free-tier quotas. This implementation cannot guarantee unlimited free hosting or detect a Google project's billing state from an API key. Budget alerts are not hard spending caps.

Before approval to launch:

1. Owner confirms the existing hosting/Supabase projects can remain within their no-cost allowances without overages or paid upgrades.
2. Owner obtains a Gemini API key for an eligible free-tier project/model and verifies that billing/pay-as-you-go will not be used. Do not enter card details or activate billing for this release. If free-tier access is unavailable, keep AI disabled.
3. Keep `GARAGE_AI_ENABLED=false` while awaiting approval. The candidate gateway adds a second required server flag, `GARAGE_AI_FREE_TIER_CONFIRMED=true`, representing the owner's explicit verification. It is not an automatic billing detector. Neither flag was changed remotely.
4. After owner approval, deploy the reviewed website and gateway changes, configure secrets in Supabase Edge Functions → Secrets, and perform a small real text/image test using the approved free tier. Never put keys into frontend files or chat.

Existing daily/minute/screenshot quotas are reused. Provider failures continue to consume an attempt. When free-tier availability or quotas are exhausted, show an error; do not switch to a paid provider/model or upgrade a plan automatically. The candidate code does not implement paid fallbacks.

## Testing

Tests use Playwright browser fixtures for authentication and provider responses; they make no paid requests. The website loads actual HTML/JS/CSS and sanitization/math libraries, and decodes a real locally generated PNG before producing the preview. Results are recorded in WEB-TEST-REPORT.md.

Real Gemini text/image responses, real browser account login, provider free-tier availability and actual school-Chromebook performance remain unverified. The managed test browser's extension restriction is respected; no extension is required for the website tests. Responses remain non-streaming, as in the existing gateway.

## Extension preservation

`node garage-ai/build.cjs` still creates `garage-ai/unpacked` from the existing extension sources. It no longer regenerates/overwrites the independent website. No extension store publication is part of this candidate. The website setup page emphasizes the installation-free path first.
