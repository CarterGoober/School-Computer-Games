# THE TRENCHES — LITTLE ELM FRESHMAN FOOTBALL

Build a complete, polished, retro-style 2D American football game for my existing Afterclass Garage game hub.

IMPORTANT: The entire game is based on the Little Elm High School freshman Navy and Gold football teams in Little Elm, Texas. Remove the previous fictional-school, four-year career, and college recruitment concepts.

Keep the game centered on a realistic freshman football season.

## 1. TEAMS AND ROSTERS

Create two playable teams:

- Little Elm Freshman Gold
- Little Elm Freshman Navy

GOLD OFFENSIVE LINE:
- Center: [private roster import]
- Right Guard: [private roster import]
- Right Tackle: [private roster import]
- Left Guard: [private roster import]
- [private roster import]: tackle, exact assignment unconfirmed

NAVY OFFENSIVE LINE:
- Center: [private roster import]
- [private roster import]: position TBD
- [private roster import]: position TBD
- [private roster import]: position TBD
- [private roster import]: position TBD
- [private roster import]: position TBD

Do not invent missing names, jersey numbers, or positions. Allow them to be edited later.

Use navy, gold, and white as the main uniform and interface colors. Include editable team names and branding. Use original Lobos-inspired visual elements unless permission to use official school branding has been obtained.

Because the roster contains real students, provide an option to keep real-name rosters private and use fictional names in the publicly accessible version until player permission is confirmed.

## 2. CORE GAMEPLAY

The player controls all five offensive linemen together from a retro 2D quarterback-facing perspective.

Before each play, the QB calls an assignment.

The player must:

1. Listen to or read the QB's call.
2. Time the snap correctly using SPACE.
3. Immediately press the correct arrow key.
4. Maintain blocks through automatic movement and active reaction challenges.
5. Prevent defensive penetration and protect the QB or create a running lane.

CONTROLS:

- RIGHT ARROW: 22 — Run block right
- LEFT ARROW: 23 — Run block left
- DOWN ARROW: 55 — Pass protection
- SPACE: Snap

The assignment input must happen AFTER the snap.

All five linemen react together, with individual footwork, animations, and defender interactions.

Incorrect assignments, slow reactions, and poor snaps increase the risk of tackles for loss or sacks.

## 3. SNAP TIMING

Create a moving snap timing meter with a target zone that changes every play.

Grade the player's snap:
- PERFECT
- GOOD
- EARLY
- LATE
- BOTCHED

The timing affects line reaction, defensive pressure, and play success.

Make the system skill-based, fair, and responsive.

## 4. BLOCKING

Use a hybrid blocking system.

After the correct arrow is pressed, linemen automatically engage defenders according to their assignments.

During the play, occasional reaction prompts allow the player to reinforce protection or maintain leverage.

Include:
- Lateral run-blocking footwork
- Pass-protection kick steps
- Blocking engagements
- Defensive resistance
- Pocket formation
- Run-lane creation
- Missed blocks
- Tackles for loss
- QB sacks
- Pancake blocks
- Visible blocking feedback

Individual player ratings influence their performance, but user input should have a meaningful effect.

## 5. BLITZ SYSTEM

Defensive linebackers may approach the line or disguise a blitz.

The player must recognize defensive pressure.

Include:
- Edge blitzes
- Interior blitzes
- Fake blitzes
- QB protection alerts
- Active blitz pickup challenges

A poorly protected blitz can result in a sack.

A correctly identified blitz should give the offensive line a chance to maintain protection.

## 6. FRESHMAN SEASON MODE

Replace the previous four-year career system with one detailed Little Elm freshman football season.

The player chooses Navy or Gold.

Include:
- Team selection
- Roster screen
- Practice drills
- Weekly matchups
- Game-day preparation
- Season schedule
- Wins and losses
- Team statistics
- Offensive-line performance grades
- Rivalry games
- Season-ending results

Support playoffs or postseason games only where appropriate to the game's chosen season format; do not present an invented schedule as the real freshman schedule.

Games should have downs, distance, scoring, quarters, and basic football rules.

If real opponent information is unavailable, use clearly identified fictional practice opponents instead of inventing real matchups.

## 7. PRACTICE MODE

Create interactive offensive-line drills:

SNAP DRILL:
Practice perfect snap timing.

RUN BLOCKING:
React to 22 and 23 calls.

PASS PROTECTION:
Maintain the pocket during 55 calls.

BLITZ PICKUP:
Identify pressure and reinforce the correct side.

REACTION DRILL:
Respond quickly to randomized QB calls.

Earn practice grades and gradually improve the team's offensive-line performance.

## 8. INDIVIDUAL PLAYERS

Every offensive lineman should have:
- Name
- Team
- Jersey number, when provided
- Position
- Strength
- Footwork
- Awareness
- Run blocking
- Pass protection
- Stamina

For unknown information, use editable placeholders.

Avoid inventing claims about real players' abilities. Start with balanced fictional gameplay ratings that can be adjusted independently of real-world evaluations.

## 9. PRESENTATION

Create an original retro pixel-art look.

The game should capture the atmosphere of Little Elm freshman football:
- Navy and gold uniforms
- Stadium lights
- Football field markings
- Animated crowds
- Helmets and shoulder pads
- Visible player numbers
- Coordinated offensive-line movement
- Retro scoreboard
- Whistles and crowd sounds
- Game-day menus
- Smooth blocking animations

Prioritize believable player movement over static placeholder sprites.

## 10. GAME MODES

Implement:

1. Freshman Season — primary mode.
2. Quick Game — choose Navy or Gold and play a matchup.
3. Practice — complete offensive-line drills.
4. Navy vs. Gold Scrimmage — optional intersquad competition.
5. Roster Editor — update names, positions, and numbers.

Single-player only for this release.

Design the architecture so playable defense and multiplayer can be added later without rewriting the entire game.

## 11. GAME INTEGRATION AND PERFORMANCE

Inspect the existing Afterclass Garage project first.

Integrate the game using the existing routing, game cards, save systems, and styling conventions.

Do not delete or break existing games.

Use efficient 2D rendering and aim for smooth 60 FPS performance on desktop browsers.

Persist season progress and settings.

Build working gameplay, not a static demonstration.

## 12. DEVELOPMENT AND TESTING

Build in stages:

1. Integrate the game into Afterclass Garage.
2. Implement camera, field, and player sprites.
3. Implement snap timing and arrow-key assignments.
4. Implement offensive and defensive blocking interactions.
5. Add blitz recognition and active blocking.
6. Build practices, games, and season progression.
7. Add both Little Elm freshman rosters and the editor.
8. Finish animations, menus, sounds, and polish.
9. Test core gameplay and save/load behavior.

Verify that:
- Each assignment works with the correct arrow.
- Assignments cannot execute before snapping.
- Players physically engage defenders.
- Poor blocking can result in sacks.
- Run blocking creates meaningful rushing lanes.
- Both freshman teams are selectable.
- The roster editor saves changes.
- Season progression persists.
- Other Afterclass Garage games still work.

Do not claim incomplete features are finished.

## FINAL GOAL

Make THE TRENCHES feel like a complete, addictive retro football game built specifically around Little Elm freshman Navy and Gold football.

The offensive line is the star of the game.

Prioritize fun blocking mechanics, responsive controls, authentic football atmosphere, and a memorable freshman season.

Report completed features, tested functionality, modified files, and remaining limitations.