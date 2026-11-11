# Web-first candidate — actual verification

Nothing published or deployed. No provider credentials read, changed or supplied; no live Google/Gemini requests or paid services enabled. Existing published site/backend remain unchanged.

Passed:
- Six gateway unit tests: question/history/image limits, origin and missing-auth denial, disabled service, caller bearer versus provider key separation, quota denial, and refusal to contact a provider without free-tier attestation. Network responses mocked.
- Browser flows at 1440×900 and 390×900: existing-account login UI, compact/minimized/expanded panel, typed draft preservation, real browser decoding/resizing of a locally generated PNG, screenshot preview and confirmation, no request before confirmation, manual send, automatic analysis only after confirmation, explicitly added study text, theme/style/history settings, sanitized Markdown and LaTeX, failure/draft retention, account-switch history/draft isolation, sign-out and no horizontal overflow. Supabase Auth and Gemini responses mocked; no real account credentials used.
- Local deployment artifact build and unchanged Worker startup guard passed.
- Byte-for-byte packaged delivery checks passed for Garage, Drift, City Heist, Over the Hill, Chat, the AI page/scripts and a math font. No full multiplayer-game replay was performed because no gameplay code changed.
- Extension builder completed without overwriting the independent web page. Extension source/unpacked runtime files remained unchanged.
- Desktop/mobile screenshots produced for visual review. Actual Chromebook hardware/frame-time measurements were not available.

Fixed during testing:
- Added account/settings controls inside the expanded panel; the page header is covered when expanded.
- Replaced an invalid test PNG with a browser-generated PNG, so the upload path exercises real decoding rather than only setting a preview URL.

Not verified / launch blockers:
- Gemini free-tier account/model availability and billing status.
- Real Gemini text and screenshot answers.
- Real account login against deployed Supabase from the redesigned web interface.
- Actual school Chromebook/network behavior and provider latency.
- Deployment: expressly withheld pending owner approval. The additional free-tier gateway flag exists in source only, not the deployed function.

Known limits: complete responses rather than token streaming; optional history is local to the device/account, not synchronized; confirmed provider requests can still complete after local cancellation and consume a quota attempt; provider retention depends on the approved Google API project. Free-tier attestation is a human configuration check, not proof obtained from Google's billing API.
