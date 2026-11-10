# Chat homepage announcement

The feature card sits directly below City Heist and links to `/chat/`. The existing navigation Chat link and all eight game links remain. This update changes only homepage markup/new feature styles and presentation script, plus the static-shell cache version/assets. It changes no chat Auth, database, registration flags, games, or student data.

`chat-feature.js` contains the editable announcement config. Its default state is `testing` with all checks false: NEW / Limited Testing / Approved accounts only. To announce NOW LIVE later, explicitly set state to `live` and confirm all four checks after actual successful owner setup, moderation, real messaging and account security tests. Partial/missing/false checks fall back to NEW and Limited Testing. This is an editorial release control, not automatic readiness detection or a security setting. It cannot open registration.

`node test-chat-feature.cjs` runs readiness-state assertions and real desktop/mobile navigation tests (default local server port8030). It checks exact copy, four highlights, preserved game links, Open Chat and main-nav Chat routing, visible unauthenticated chat gate and no horizontal overflow/errors. Screenshots are under ignored work/chat-feature-desktop.png and work/chat-feature-mobile.png. Hosted packaging includes the new root-level assets automatically.
