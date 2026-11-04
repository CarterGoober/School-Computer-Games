# Trenches arcade redesign

Implement the supplied redesign brief directly, preserving the football engine, v1 save schema, local roster privacy and unrelated games.

1. Replace the marketing layout with a viewport-fitted arcade fieldhouse: pixel font, compact week/opponent/results strip, interactive timeline, actual local Navy/Gold records, line grade/chemistry, animated player preview and bottom action bar. Separate roster, practice, schedule/statistics and settings screens.
2. Replace aerial-looking rendering with a ground-level pinhole projection behind the QB, using large animated original layered pixel sprites, jersey nameplates and unknown-number markers. Names obey existing private-name display settings. Roster updates immediately affect rendered players. Preserve unconfirmed positions.
3. Keep snap/input/blitz/football progression and old saves. Implement keyboard menu navigation, modal pausing and screen switching; retain all four modes and five drills.
4. Browser-test viewport fit, all menus, timeline, teams/modes, old-save restore, private labels/live roster edits, input ordering, block interactions, full season, training and offline assets. Capture actual home and gameplay screenshots and review against the two references. Run existing regressions.

Design choices: original 5x7 pixel typeface bundled locally; high-contrast requested navy/gold/orange/green palette; chemistry is a labeled game-only metric derived from saved practice and team play. Other team's standings display unplayed rather than fabricated results. No copied Retro Bowl assets or official logos; blank real jersey numbers render temporary 01–05 slot labels marked TMP (QB/RB 00), without storing fake real numbers.


Execution: implemented all four stages. Browser review found stale practice resumption, intercepted native button activation and short-screen standings overlap. Reproducing tests were added before each fix, including panel-child containment. A name-specific formatting condition was removed so source contains no supplied student identifiers. Jersey formatting is generic. Existing core/data tests remain green; v1 schema and unrelated game implementations are unchanged. Screenshots and final regression commands are recorded in README.

Final validation: 17 Node suites passed; all six browser suites passed individually, including three football suites and existing hub/shop/train regressions. The shop browser test initially collided with its own randomized vehicle reward; its isolated guaranteed-purchase fixture was made independent of earlier random ownership, then passed. No shop/game production code changed. Actual final screenshots: `/tmp/trenches-redesign/home-final.png`, `/tmp/trenches-redesign/gameplay-private.png`, and `/tmp/trenches-redesign/mobile-home.png`. No push or deployment performed.
