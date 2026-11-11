# Garage AI test report

Passed: five gateway unit tests covering input/role/image limits, origin/auth denial, disabled service, trusted user-token forwarding versus provider key, multimodal request composition and quota rejection. Provider responses were mocked; no live AI claim.

Passed on connected Supabase: rollback-only real account/session-context test of question/screen quota exhaustion, suspension denial and anonymous RPC denial. No actual password or browser login was used in this test. Usage changes rolled back.

Browser installation/UI results are recorded at completion. These do not establish working real Gemini responses, successful school-account extension sign-in, actual screenshot permission flow, shortcut invocation or Chromebook performance.

Live provider test blocked until owner configures Gemini credentials, approved origins and enables controlled testing. Endpoint is deployed with fail-closed configuration. No extension store publication, paid purchase, or alteration to games/wallet/progression.

Actual unpacked extension installation was attempted in the managed Chromium browser. Chrome returned “Loading of unpacked extensions is disabled by the administrator.” Testing stopped; no policy bypass attempted. Installation, toolbar/shortcut permissions and real capture remain unverified. External curl access to the Supabase function endpoint was also blocked by the execution network proxy (403 CONNECT); connector deployment succeeded but an HTTP smoke check could not run from this host.

Passed mocked browser UI at desktop 1440px and mobile 390px for both Manual and Automatic settings: screenshot preview/discard, no automatic upload, preserved draft, explicit send, sanitized Markdown, rendered LaTeX and no horizontal overflow. Fixed a math asset path and Markdown delimiter handling exposed by these tests. These are webpage fixtures, not a successful extension installation.

Passed mocked iframe/Shadow DOM integration: expanded the floating panel on a study fixture, moved it with keyboard controls, and resized it within the viewport. This verifies the UI messaging path, not Chrome activeTab permissions. Security advisor reports intentional deny-all private tables and the pre-existing disabled leaked-password protection warning (https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Packaging initially exceeded the existing Worker startup CPU guard (measured 1171.7ms). Static assets are now compressed in the build and decoded as response streams. The unchanged startup guard passes, and a byte-for-byte delivery regression test passes for Garage, Drift, City Heist, Over the Hill, Chat, AI scripts and a KaTeX font. No production FPS improvement is claimed.
