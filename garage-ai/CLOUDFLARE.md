# Cloudflare migration — unpublished candidate

Model: `@cf/meta/llama-3.2-11b-vision-instruct`. Both text and confirmed screenshot requests use the existing Supabase gateway, authenticated quota RPC and unchanged response contract. No Gemini calls or paid fallback remain in the candidate. No remote configuration or publication has been performed.

Official documentation checked November 11, 2026:
- https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/ — supported vision model.
- https://developers.cloudflare.com/workers-ai/guides/tutorials/llama-vision-tutorial/ — messages plus top-level base64 image and first-use Meta license acceptance.
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/ — bearer authentication, account-scoped `/ai/run/{model}`, success/result.response envelope.
- https://developers.cloudflare.com/workers-ai/platform/pricing/ — 10,000 free Neurons/account/day; Free plan stops at allowance, Paid plan can charge overages. This is shared across users, not per student.

The tutorial's image field is deprecated in the raw model schema but still documented in the official tutorial. A real text AND image test is required before enabling access; mock tests cannot establish current endpoint compatibility.

## Operator setup

Keep `GARAGE_AI_ENABLED=false`. Existing `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` stay in Supabase Edge Functions → Secrets. Never paste them into chat or browser code.

1. Confirm the account uses Workers **Free**, not Paid; do not upgrade or enable billing. Then set `GARAGE_AI_CLOUDFLARE_FREE_PLAN_CONFIRMED=true`. This is an operator attestation, not an automated billing check.
2. Review and complete the model license step in Cloudflare's official tutorial yourself. Only then set `GARAGE_AI_CLOUDFLARE_MODEL_TERMS_CONFIRMED=true`. The app never accepts terms automatically.
3. After deployment approval, deploy existing `garage-ai` with index.ts, gateway.js and cloudflare.js. Preserve its existing caller-authenticated RPC architecture and origins. No schema migration is needed.
4. Set `GARAGE_AI_SELF_TEST_ENABLED=true`, keeping student access false. Sign in as the existing owner, open `/garage-ai/diagnostics.html`, and run each fixed test once. They send only 2+2 and a generated solid-red PNG, 64 output tokens each, with existing quota/rate enforcement and no retries. Record returned answer, pass flag and latency. Students cannot invoke the probes.
5. Turn self-test off afterwards. Only after actual results pass and launch is approved, set `GARAGE_AI_CLOUDFLARE_VERIFIED_MODEL=@cf/meta/llama-3.2-11b-vision-instruct` and consider enabling student access. Legacy Gemini enable flags cannot activate Cloudflare by themselves.

Credentials, prompts and screenshots are not intentionally logged. Public errors never include raw provider responses. Failed attempts consume quota. Provider data policies still apply.

## Floating chat / capture

Float uses Document Picture-in-Picture on an explicit click, moves the existing panel and restores it on close. It does not create another login or conversation. Unsupported browsers retain the in-page panel. The originating Garage AI tab must stay open; navigation/closing it ends the floating session. Browser/administrator restrictions are respected.

Capture screenshot requests the browser's screen/tab/window chooser explicitly, captures one resized frame, stops all tracks, then uses the existing preview/confirmation flow. Canceling sends nothing. File upload remains available without capture permission. No background capture or continuous monitoring is added.

## Actual verification

Eight gateway unit tests passed using mocked network responses. Desktop/mobile browser regression tests cover login fixtures, image previews, explicit confirmation, settings, account isolation, sanitization and drafts. PiP transfer/restore is exercised with a simulated window; this is not a real OS always-on-top test.

Real Cloudflare API responses, supplied secrets, account Free-plan status, model license acceptance, native PiP across tabs and native screenshot permission chooser remain unverified. No paid services enabled. No site, gateway, chat, database or game changes published.
