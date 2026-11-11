> Current provider/setup: [CLOUDFLARE.md](CLOUDFLARE.md). This supersedes the Gemini deployment instructions below; do not enable Gemini. Current changes remain unpublished.

> Web-first local update: see [WEB-FIRST.md](WEB-FIRST.md). Do not publish or enable provider requests without owner approval. The extension build below remains optional.

# Garage AI — development build

Free-to-student Chrome MV3 study assistant extending After Class Garage. No extension publication or payments are authorized or performed. Games, chat roles and Garage Credits are unchanged.

## Install locally

1. Run `node garage-ai/build.cjs` from the repository root (the unpacked folder is also supplied).
2. Open Chrome → `chrome://extensions` → Developer mode → Load unpacked → select `garage-ai/unpacked`.
3. Extension Details → Extension options → sign in using an existing `@leisdstudent.ws` Garage account. No new account system is created. The account's email identity remains unverified.
4. On a permitted normal webpage, click the extension toolbar icon or Alt+Shift+G. The initial click grants Chrome's temporary activeTab access. Restricted browser/Web Store pages and school policy restrictions are not bypassed.
5. Open the bar, ask a question or select Analyze Screen. Review the preview and explicitly Send. Automatic mode only prepares a preview on opening; it never uploads automatically or watches tab changes.
6. Drag the dotted handle to move the bar. Drag the expanded panel's lower-right corner to resize. Change the shortcut at `chrome://extensions/shortcuts`.

The development extension ID is `epagkmojncpjkaldkhamibbiebjjbkfn`. The manifest public key stabilizes this ID; it is not an API secret or store signing credential. The extension is not in the Chrome Web Store. Do not bypass managed-device installation policy.

## Secure server setup — Supabase

The `garage-ai` Edge Function and per-account quota migration have been deployed to the existing project. Requests remain disabled unless `GARAGE_AI_ENABLED=true` and a Gemini key are configured. The function validates the existing user bearer through a trusted account/session/domain/suspension check in Postgres before any provider request. It uses no frontend service-role key. Platform JWT verification is off because the function performs its own account validation through the authenticated RPC; unsupported origins are rejected too.

1. Open https://supabase.com/dashboard/project/gvurobdhsvcvdywdsgne/functions
2. In the left sidebar choose **Edge Functions → Secrets** (or the Secrets tab on the Edge Functions page).
3. Add `GEMINI_API_KEY` using a key from an approved Google AI Studio/Google Cloud project. Enter it only in Supabase, never chat or extension files.
4. Add `GEMINI_MODEL=gemini-2.5-flash`. Check model availability in your Google project; you may explicitly choose `gemini-2.5-flash-lite`. There is no automatic model retry that can double costs.
5. Add `GARAGE_AI_ORIGINS=https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.site,chrome-extension://epagkmojncpjkaldkhamibbiebjjbkfn` with no trailing slashes.
6. Keep `GARAGE_AI_ENABLED=false` until the API account, data-use policy and budget are approved. Only after the owner confirms an eligible non-billing free-tier project and approves testing, configure the candidate gateway’s `GARAGE_AI_FREE_TIER_CONFIRMED=true` and set `GARAGE_AI_ENABLED=true`, sign in from the extension, send a permitted text question and then one non-sensitive diagram. Check real returned answers. Disable again if the tests fail.
7. Configure Google project spending alerts/budgets and API restrictions. Student usage is free, but Google and Supabase may charge the operator. Limits do not guarantee zero provider cost.

Defaults: 60 questions/day, 10 screen questions/day, 5 requests/minute, keyed to authenticated account; daily reset midnight UTC. Server owner can change the single row in `acc_private.ai_limits` using a trusted SQL Editor. Never grant that table to clients. Provider failures consume an attempt to bound abuse/cost; the UI discloses this. There are no purchases or credit deductions.

## Data handling

- Tokens remain in Chrome `storage.session`, restricted to trusted extension contexts; they are never sent to the host page. Passwords are entered only in the extension's options page, sent directly to Supabase Auth, then cleared. Sign out clears session storage and device text history.
- Manual is default. Sensitive-page heuristics refuse password/payment inputs and common chat/inbox/payment paths. These heuristics cannot reliably detect every sensitive page: students must review every preview and discard private content. The overlay is hidden during capture. A tab or URL change discards the capture.
- Only the question, up to 12 recent text messages, response preference and explicitly submitted image go to the gateway. No DOM text, browsing history or background monitoring.
- Optional history is text-only, stored locally per account. No server conversation history or cross-device history sync is implemented. Clear History removes saved device histories; it cannot erase Google-processed data. Website chat is memory-only.
- Gateway intentionally logs no screenshots, prompts or keys and stores no conversation content. Google retention/training policies depend on the chosen API account/tier; zero retention is NOT promised. Confirm those terms before student rollout.
- Usage rows are pruned on account activity after two previous UTC dates; inactive accounts retain their remaining usage rows until activity or account deletion. Existing account deletion cascades usage rows.
- Output uses pinned local Marked, DOMPurify and KaTeX with HTML sanitization and untrusted math rendering. Remote code execution is not used. Licenses and dependency integrity metadata are included.

## Verification and limits

See TEST-REPORT.md. No successful real Gemini response has been demonstrated. Responses currently return as complete messages rather than streamed tokens. Actual Chromebook hardware measurements, live school-account extension sign-in, toolbar/shortcut capture success and real multimodal answers require device/provider testing. These are launch blockers, not claimed successes.

The Garage launcher and website use the existing Supabase session. The website accepts a deliberately chosen screenshot file; it cannot capture other tabs. A future cosmetic catalog may change visual theme tokens only; no marketplace or credit integration is active.

## Build and tests

`node garage-ai/build.cjs`
`node --test garage-ai/tests/gateway.mjs`
`node garage-ai/tests/ui.cjs` (mocked interface)
`node garage-ai/tests/browser.cjs` (requires an administrator-permitted extension test browser)

`backend/quota.sql` is already applied: do not rerun its CREATE TABLE statements. The tests/quota.sql transaction is rollback-only. All vendor code is local. Source, generated unpacked extension and installation documentation are reviewable without a Chrome Web Store submission.
