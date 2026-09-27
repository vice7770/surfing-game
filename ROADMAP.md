# Surf Simulator Work Roadmap

This is the project’s working plan and priority tracker. Update it whenever a project task starts, changes scope, becomes blocked, or finishes; reopen this document in Codex at each task handoff so it stays easy to find.

Priority: **P0** = current critical path; **P1** = next; **P2** = later. Status values: `Backlog`, `Ready`, `In Progress`, `Blocked`, `Done`.

## Next milestone — the game around the waves — `In Progress`

### P0 · Menus and settings (P8) — `Done`

Requirements agreed in a grilling session on 2026-09-26. The plan is [P8 menus and settings](docs/superpowers/plans/2026-09-26-p8-menus-settings.md). P7 is parked on `claude/barrels` meanwhile, and P8 builds on the fixes in PR #7.
- [x] **Main menu:** big icon tiles in PolyTrack's layout, dressed in Breakline's look: teal ink, sand paper, coral accent, DM Sans and DM Mono, the round "B" mark, hand-drawn inline SVG icons.
  - Tiles: **Surf · Wave Lab · Multiplayer (coming soon) · Logbook · Settings**, and a bottom strip with Fullscreen and the version.
  - Behind the menu, live waves only: the practice groundswell, a different spot each time, and a slow cinematic camera along the break. Devices on the Low preset see a still frame.
- [x] **Surf:** cards for Beach, Point, Reef and Canyon. Conditions:
  - Swell: Practice / Small / Medium / Big
  - Tide: Low / Mid / High
  - Wind: Offshore / Calm / Onshore
  - Time of day: Dawn / Midday / Sunset

  Surf always uses the physical surf zone.
- [x] **During a ride:** a clean screen with the prompt, speed and balance, plus key hints on the first ride.
  - Esc pauses: Resume, Replay wave, New wave, Camera, Settings, Quit to menu.
  - An end-of-ride card shows the outcome and reason, distance, top speed and time, and a "new best" badge. Its buttons are Replay (R), New wave, Change spot and Menu.
- [x] **Wave Lab:** today's screen, unchanged, reached from the menu. It sits behind one `devTools` switch together with the telemetry option, the Profile and Below views and the URL flags, so one line hides them all later. *Replaced by L1 (2026-09-27): the Wave Lab is now a player-facing wave viewer, and the legacy playable wave has left the page (see below).*
- [x] **Logbook:** the last 50 rides, and bests per spot for distance, top speed and ride time. No score yet.
- [x] **Settings:** Gameplay · Graphics · Controls · Accessibility. Changes apply instantly and are saved in the browser, each tab has a Reset button, and settings that can only change between waves are marked "next wave".
  - **Gameplay:** units (km/h and m, or mph and ft), default camera, touch controls, and a telemetry option while `devTools` is on.
  - **Graphics:**
    - presets Auto / Low / Medium / High / Ultra;
    - Auto runs a benchmark on first launch behind the menu. It runs again when the graphics card changes, has a Re-detect button, and warns when performance is low. It also carries out the decided CPU fallback: stage 1 when stage 2 cannot keep real time;
    - an Advanced section: render scale and pixel density, frame limit, Water simulation (Fast / Accurate / Auto), sea detail, caustics, spray and mist, ocean view distance, foam.
  - **Controls:** keyboard and gamepad can both be remapped. Every menu works with arrows or D-pad, Enter or A, and Esc or B. The touch layout is fixed, with a left/right-handed swap.
  - **Accessibility:** reduced motion, UI scale, high-contrast HUD.
- [x] **Text and platforms:** English only, with all player-facing text in one typed strings file (a Language tab appears when a second language exists). Desktop keyboard, phone and tablet touch, and gamepad, in portrait and landscape; a ride on a phone suggests landscape. No hover-only interactions.
- [x] **Build:** plain TypeScript and native CSS: no framework and no new dependencies. On launch, the loading screen goes straight to the menu.
- **Record (2026-09-26):**
  - **What shipped:** the main menu, Surf, the ride HUD, pause, the end-of-ride card, the Logbook and Settings. A rebind swaps keys between actions, and Esc and Start stay reserved.
  - **Auto benchmark:** on the development Mac (Apple M1, ANGLE Metal, run while another session was loading the CPU) it chose High with accurate water.
  - **Balance meter:** it reads the rider's distance from its separation threshold (sway or posture error against `RECOVERABLE_ERROR`). The body's balance shift, the plan's first choice, barely moved before a fall.
  - **Spin-ups:** a superseded surf-zone spin-up is now dropped at once, so leaving the menu for a ride no longer waits behind the menu's own waves. The menu never waits for its waves either: it opens on a gradient, and the sea fades in.
  - [Plan and record](docs/superpowers/plans/2026-09-26-p8-menus-settings.md).
- [x] **Follow-ups (2026-09-26):**
  - Esc pauses the Wave Lab even from a focused slider.
  - A second Paddle out during the loading card is ignored.
  - The Auto benchmark samples only the menu's own waves.
  - The menu's and Surf's sun and clock no longer overwrite the Wave Lab's settings.
  - The catch report takes `--spread`, so it can reproduce each Surf swell.
- [x] **Fix (2026-09-27, found by the frame-rate survey):** at High, the menu's first Reef (the GPU tier's 64-component sea, seed 1) never came up, and its worker kept a core busy. The spin-up stepped a quarter second between stability checks; a trough drained a reef cell to 7 cm with 112 m/s of backwash, the step ran at 5× its stable limit, and the water diverged at 2.25 s. The spin-up now checks stability every substep, and water that diverges anyway stops with an error instead of asking for trillions of substeps. Of 24 spin-ups (four spots, 24 and 64 components, seeds 1–3), this was the only one to diverge.
- [x] **Spin-up on the GPU (2026-09-27, the user's choice from the performance study):** where the worker has WebGPU, the surf zone is built warm, the device attached, and the spin-up stepped on the GPU one stable substep at a time; a device that fails hands the rest to the CPU. Diverged water stops the GPU step as it stops the CPU's. Behind the loading card the page no longer draws or steps the sea it replaces, and the menu's waves give way to its gradient while new ones spin up, so the GPU is the new sea's alone. On the M1 Air (load 9–20):

  | | Before (CPU spin-up) | After |
  |---|---:|---:|
  | Menu's waves after launch | 38–44 s | 6.4–7.2 s |
  | Paddle out to riding | 19–27 s | 3.7–5.8 s |
  | Quit to the menu's new waves | 26–27 s | 3.4–4.5 s |

  In the worker, all 24 spin-ups (four spots, 24 and 64 components, seeds 1–3) came up finite in 2.3–5.3 s, against 14.5–23.3 s on the CPU, with the same highest crests.
- [ ] **Open:**
  - **Tune the Surf swell sizes after the take-off layer (P10).** Measured before P7 with 30 ghost riders, 3 min per spot; the counts are riders who stood, and in brackets rides of 3 s or more:

    | Swell | Beach | Point | Reef |
    |---|---|---|---|
    | Small (0.9 m, 9 s) | no cue | 1 | 36 (17) |
    | Medium (1.4 m, 11 s) | 3 (3) | 3 (2) | 2 (2) |
    | Big (2.4 m, 14 s) | 0 | not measured | not measured |

    Medium works everywhere. P7 has since reshaped the Reef, and P10 changes catching, so the table waits for both. The Reef's Small run also showed a 39.9 m/s top speed, an outlier for the gameplay session to check.
  - Bring back a flow bar once a physical flow measure exists (gameplay, P9).

### P1 · Sound (S1) — `Playtest`

Requirements agreed in a grilling session on 2026-09-26. The plan is [S1 sound](docs/superpowers/plans/2026-09-26-s1-sound.md).
- [ ] **Sources:** CC0 recordings (listed in `docs/ASSETS.md`, fetched by a script, shipped as AAC `.m4a`), layered and looped. Every sound also has a synthesised fallback, used until its recording loads or if it fails.
- [x] **Driven by the physics, never scripted:**
  - surf roar from where the water breaks (breaking strength × discharge, by along-shore sector);
  - lip impacts by their landed volume and speed; whitewater bores;
  - distant surf from the swell height; wind from the Wind setting;
  - water rushing under the board with its speed, and rail spray from its sideslip;
  - paddle splashes from each stroke's work; the pop-up; a wipeout plunge, then underwater bubbles.

  Only what you would really hear, with no artificial cues.
- [x] **Space and time:**
  - the camera is the listener: positional sound, fading with distance, heavily muffled underwater;
  - slow motion (the Wave Lab's time scale) slows and pitches the sound down;
  - paused, the sea fades to a low, muffled bed and returns over half a second.
- [x] **Where:** Surf rides, the menu's waves and the Wave Lab's physical mode; subtle interface clicks and a new-best chime. The legacy wave stays silent. No music this phase (backlog).
- [x] **Controls:**
  - an Audio settings tab: Master, Sea, Board and rider, and Interface volumes, and Mute when out of view (on);
  - Mono audio under Accessibility;
  - sound starts at the first click or key; a speaker toggle in the menu strip and the pause menu, and M (rebindable);
  - the iPhone's silent switch is respected.
- [x] **Sound check (dev tools):** a Wave Lab panel auditions each candidate recording and the bus levels; a manifest picks the recording.
- [ ] **Done:** unit tests on the physics-to-sound mapping, a headless sound report over an autopilot ride, and the user's listening playtest. CPU cost is measured, not tied to the graphics presets.
- **Record (2026-09-26):**
  - **The worker reports what makes sound** with each snapshot: the lip landings and paddle strokes since the last one, and the breaking roar in 8 along-shore sectors (B·|q|·area, with its centroid).
  - **A pure mapping turns it into loops, places and one-shots.** A shaper gathers landings by kind and place into a few crashes a second, and a hand's pull into one splash. The first sound report showed about 170 lip one-shots a second in a set without it.
  - **A Web Audio engine plays it** from the camera: HRTF panners, three buses, a muffle filter and a limiter.
  - **Every sound is synthesised for now.** The Wave Lab's sound check auditions each one.
  - **The [sound report](docs/research/sound-report.md)** runs an autopilot ride on the practice swell and checks the sound follows its causes. The roar correlates with the breaking at 0.97 and the board's rush with its speed at 1.00. There is one pop-up sound per pop-up and one plunge per fall. At most 4 one-shots start in a frame, and the mapping takes 9 µs a frame.
  - **Checked in the page (the pane was hidden, so nothing was heard):**
    - suspended out of view, and running with background muting off;
    - the roar placed along the break;
    - pause muffles to 708 Hz and quarters the sea, and silences the board;
    - M and the toggles mute;
    - the Sea slider sets its bus, and Mono folds the output to one channel.
- [ ] **Open:**
  - **CC0 recordings (the user's download approval is pending).** Candidates found, all CC0 Freesound previews, about 50 MB to fetch and about 2.5 MB shipped once trimmed:
    - surf roar: felix.blume #868869 and treytatum3 #815319;
    - distant surf: INNORECORDS #457740;
    - underwater: felix.blume #705058;
    - lip crashes: felix.blume #411509, nobarknoonan #695875 and mlnqr #542183;
    - paddling: craigsmith #438845;
    - plunge: kyles #637823.

    Wind, rush, rail, the pop-up, the click and the chime stay synthesised.
  - **The user's listening playtest,** which tunes the mapping's provisional levels.

### P1 · Online lineup (N1) — `Part A done (playtest open); Part B next`

Grilled with the user on 2026-09-26 (Q1–Q20, every recommendation accepted). [Spec](docs/superpowers/specs/2026-09-26-online-lineup.md) · [plan](docs/superpowers/plans/2026-09-26-n1-online-lineup.md).

Up to 50 friends share one break from a room link. Every player runs the whole sea and their own surfer. A small Node server keeps the room's clock and relays poses; it never runs water.

- [x] **Drift gate** ([drift report](docs/research/drift-report.md)): two copies of the Canyon's sea stayed identical for 240 s under 32-bit rounding and under a paddler's pushes. Late joiners' fresh seas broke up to 2 s and 17 m off, so the user chose the **sea handover**.
- [x] **Sea handover:** a joiner, or a player rebuilding a sea that fell behind, gets the longest-present player's sea through the server:
  - it carries the water, breaking, predictors, foam and lip: 1.4 MB encoded, 763 KB deflated on the Canyon;
  - a restored sea steps on bit-identically, and after 32-bit encoding it stays within 0.1 % of Hs;
  - a donor that stalls is passed over after 10 s, and an empty room starts fresh.
  A state probe found which arrays carry history.
- [x] **Server** (`server/`, Node + `ws`):
  - serves the built game and `/ws`, with rooms in memory;
  - rooms have 8-character codes, a cap of 2–50, a pinned build and a creator's Kick;
  - poses are bundled at 20 Hz;
  - messages are rate-limited, and flooders are disconnected;
  - an empty room closes after 5 minutes.
- [x] **Game:**
  - the sea follows the room's clock (NTP-style offset) and catches up after a join;
  - it rebuilds when more than 1 s behind for 3 s, 5 s behind at once, or 30 s behind before catching up;
  - poses are 76 bytes, and other surfers are interpolated 100 ms behind, drawn on this player's water in their own looks with name tags;
  - their board pushes reach every player's water;
  - spawns and respawns (3 s) go to a free spot in the lineup.
- [x] **Screens:**
  - **Multiplayer:** name, surfer, join by code or create with conditions and a cap; `?room=CODE` links; WebGPU is checked.
  - **Online pause menu:** the sea runs on underneath; it shows the players, the link and Kick, and has Leave room.
  - **During a ride:** surf calls on 1–4 (remappable), a ride feed, notices (catching up and how far, reconnecting, respawning), and online rides marked in the Logbook.
- [x] **Dev bots** (`BOTS=1`, `?bots=N`) replaying an autopilot track, and **Fly.io packaging** (Dockerfile, `fly.toml`, `npm run deploy`).
- **Record (2026-09-26):**
  - **Checked live in the browser pane:**
    - create, join by link, and relay;
    - drawing another surfer with its tag;
    - the handover (`seaSource: 'handed'` in the second tab);
    - calls, the pause menu, and Leave room.
  - **Not judged here:** this M1 Air was loaded (load 7–11, the pane's renderer using a full core), so a GPU step took 5–52 ms and a fresh room's catch-up took about 30 s. Frame times and bandwidth with bots wait for a machine that isn't loaded.
- [ ] **Open:**
  - the user's Fly.io account and first deploy;
  - the playtest with about 5 friends;
  - a bot-filled room measured on the M4 Pro;
  - **Part B, physical collisions,** planned after the playtest.

### P1 · Wave Lab and Surf School (L1–L3) — `L1–L3 done (playtests open)`

Grilled with the user on 2026-09-27 (Q1–Q28, every recommendation accepted). [Spec](docs/superpowers/specs/2026-09-27-wave-lab-surf-school.md) · [L1 plan](docs/superpowers/plans/2026-09-27-l1-wave-lab.md).

- [x] **L1 · Wave Lab:** a place to look at waves up close, for everyone (the tile shows whatever `devTools` says). No rider, nothing to play.
  - **Settings panel** (closed until asked for):
    - spot; Buoy, Storm or Practice swell with their sliders; direction, tide and local wind — these rebuild the sea on **Apply**, and the camera stays where it was;
    - **New sea** rebuilds with a new seed;
    - Dawn / Midday / Sunset with sun height and direction, and the Classic / Rich look, which apply at once;
    - with the dev tools on: solver, compute, the physics readout and the sound check.

    The applied settings are remembered in the browser (`breakline.wavelab.v1`).
  - **Camera:**
    - free flight: WASD, Q/E, Shift, drag to look, the wheel for speed; the pad's sticks, triggers and LB; a touch stick with Up and Down;
    - it goes underwater, and stays within the tank (80 m past its sides, 100 m up the beach);
    - **jump points** 1–4: Overview, Profile, Below, and Cinematic, which sweeps until the player moves;
    - **Follow** (F): rides along with the breaking crest nearest the centre of the view.
  - **Time:** Space pauses the sea while the camera still flies; `.` steps one frame; `[` `]` pick 0.1, 0.25, 0.5 or 1×.
  - **Info card:** the wave under the view in surfers' words ("Plunging · a left at 52° · good for surfing"): face height, period, breaker, peel, breaking share, next set.
  - **Interface:** H hides everything; Esc opens a lab pause menu (Resume, Settings, sound, Quit).
  - **Retired from the page:** the old lab screen, its legacy playable wave and tuning sliders, the lab's telemetry and the run history.
  - **URL flags:**
    - `?physical` starts a Surf ride;
    - `?demo` starts a Surf ride the dev autopilot rides;
    - `?record` and `?waterSheet` run on a bare stage.
- [ ] **L1 open:** the user's playtest, with the browser pane shown, since motion and the gamepad were not judged live in the hidden pane.
- [x] **L2 · Surf School** ([plan](docs/superpowers/plans/2026-09-27-l2-surf-school.md)): a tile after Surf, badged "Start here" until the first lesson is passed.
  - **Nine lessons, all open:** Lean, Trim, Crouch and extend, Bottom turn, Top turn, Hand and stall, Stay in the pocket, Pop up, Paddle and catch.
  - **Free Practice** on the same wave, started standing in the pocket or prone and ready to catch.
  - **Each lesson:**
    - an explanation card over the held wave, with a diagram and the player's keys;
    - attempts with the lesson's prompt and its goal's count, the goals measured from the physics;
    - a miss names why and what to try, and the same wave restarts after 2 s (R at once); three misses bring the card back;
    - a pass offers Next lesson, Again or Lessons, and retires the matching one-time Surf hint.
  - **Pause menu:** restart, the explanation, 0.5× slow motion, camera, settings, the lessons. The balance meter is always on. Nothing goes in the Logbook.
  - **The lesson wave** (`npm run lesson:wave`): the autopilot surfs the Canyon's Practice sea, and each start's moment is taken from its rides and judged as a new player would play it (report: [lesson wave](docs/research/lesson-wave.md)).
    - Each start's sea state is shipped (`public/lessons`, about 0.8 MB each) with where the rider was.
    - It is recorded on stage 2, and the school runs stage 2 on every machine, the Fast water's included (the user's call: stage 1's recording could not be caught). A machine too slow for it plays the lesson slower than real time.
    - A lesson's sea is built from it with no spin-up, and every restart restores it in place (a new `restore` host request; the GPU re-uploads the breaking state).
    - `RideSession.place` puts the rider on the water standing or prone, the one new piece of rider code.
  - **On the reference wave:** recorded on the riding work's Practice swell after it merged. A still rider stands 6.4 s from the pocket, a pop-up on the cue 6.1 s, and the autopilot 3.8 s from waiting. The goals' thresholds stay provisional (the lean's swing is 8°, not 20°, until the turn-rate fix).
- [ ] **L2 open:**
  - tune the goals on the reference wave (the lean's swing first, after the turn-rate fix);
  - on a machine too slow for stage 2 (the Fast water's), how slow the lessons run has not been measured;
  - the user's playtest (the pass card and a live pass were not seen in the hidden pane);
  - trim and the hand have no touch buttons yet, so lessons 2 and 6 need a keyboard or a pad.
- [x] **L3 · Legacy removal:** the legacy wave's code is deleted, now that nothing reaches it. [Plan](docs/superpowers/plans/2026-09-27-l3-legacy-removal.md).
  - **Deleted:** the wave (`WaveModel`, `PlungingSheet`), its board (`BoardPhysics`, `boardTrace`), their views (`LegacySurfaceSource`, `CameraRig`, `BoardWake`, `BreakSpray`, `Seabed`, `PlungingSheetMesh`), the old `Hud` and `RunHistory`, the `report:board-baseline` script, and every test that only drove them.
  - **Trimmed:** `SurfWater` loses its legacy adapter and the `surface` flow regime; `Surfer` keeps only the pose the physical rider falls back to; `BoardInput` moves into `Controls`; the legacy swell readout and board values go; the sky loses the coastline cards the physical sea always hid.
  - **Kept on purpose:** the test waters, test surfers and the report scripts' helpers, which the suite and the reports still use.

### P1 · Performance (2026-09-27) — `Study done; two decisions open`

From the user's M4 Pro frame-rate survey, re-run on the M1 Air: [performance study](docs/research/performance-study.md).
- [x] **The M4 Pro holds 120 fps on every screen at every preset.** Its heaviest reading, the Surf screen, was the survey counting GPU time once per WebGL context. The surfer preview costs about 0.5 ms.
- [x] **A paused game draws only when its view changes,** twice a second otherwise: 15 of 481 paused frames draw, against every frame, and the camera no longer glides after pausing.
- [x] **Fixed separately:** the camera jumping as waves pass a waiting rider (PR #28), and the High Reef menu never coming up (PR #32).
- [x] **Spin-up on the GPU** (PR #39, with the GPU step's guard against diverged water): on the M1 Air the menu's waves now come up in about 4–7 s and a ride in 3–6 s, against 19–44 s (see the P8 section).
- [x] **The survey times the game's WebGL context alone** (PR #41), with the surfer preview's reported apart.
- [ ] **Open:**
  - decide what the menus' waves may cost (a 60 fps cap on faster displays, a lower scale, or holding them still);
  - re-measure High on the M1 Air with no other session running, and have Auto weigh High's resolution if it misses 60 fps.

### P1 · Steam Controller (C1) — `In Progress (hardware check open)`

Requirements agreed in a grilling session on 2026-09-26 ([spec](docs/superpowers/specs/2026-09-26-steam-controller.md)). The plan is [C1 Steam Controller](docs/superpowers/plans/2026-09-26-c1-steam-controller.md). The user's 2026 Steam Controller (Puck and cable) plays in Chrome and Arc through WebHID, because on macOS neither the browser nor Steam exposes it as a gamepad.
- [x] **Driver:**
  - SDL's Triton protocol, ported and credited in `docs/ASSETS.md`, turns the vendor HID report into a standard pad (buttons 0–16, plus L4, R4, L5, R5 and ··· as 17–21).
  - Lizard mode is off while the tab is visible (repeated every second) and handed back when it is hidden.
  - A controller that goes quiet for 1 s, leaves the Puck or is unplugged lets go.
- [x] **Connecting:** a Connect row in Settings › Controls, and a menu-strip button until a controller has connected once. The browser remembers the controller afterwards. Safari says "Needs Chrome or Arc".
- [x] **Precision:**
  - trim moves to the right stick by default, for every gamepad (a Trim stick setting puts it back);
  - Stick response Linear or Precise (Linear until the turn-rate fix);
  - dead zones 0.05 for the Steam Controller and 0.15 for other gamepads, each with a slider;
  - the pad touched last drives the sticks.
- [x] **Buttons:**
  - the hand moves from X to LB and the online party call (N1) from LB to X; on the Steam Controller L4 also does the hand and R4 also pops up;
  - Settings shows two pad slots per action;
  - old saves migrate once;
  - hints and Settings name View, Menu and the grips after the Steam Controller was used last.
- [ ] **The user's hardware check:**
  - open `/controller-check.html` in Chrome on localhost, with the controller on the Puck and then on the cable;
  - confirm the stick stops moving the mouse, the buttons and sticks read right, and the rate at rest (for the 1 s stale rule);
  - download two recordings (at rest and moving) for test fixtures;
  - see whether Steam running alongside is clean.
- [ ] **Done:** the user's hand check in a ride.
- **Later, each with its own grilling:** gyro steering, the trackpads, rumble.

### Later — `Backlog`

Recorded in the same session; each gets its own grilling before work starts.
1. **Multiplayer beach:** players starting on the sand, and a beach bar to hang out in. Rooms, the relay and the shared sea now exist (N1); collisions are N1 Part B. Still to grill: the beach start and the bar, and whether solo play also starts on the sand.
2. **Filmed menu background:** a sequence of waves forming and breaking, filmed with the `?record` tool once the waves are finished. It replaces the live menu background.
3. **Music:** none in S1 (grilling, 2026-09-26). Good CC0 music is scarce; a CC-BY or paid track would need a credits screen.
4. **Whitewater forces on bodies** (G9's backlog): lost buoyancy in aerated water, and hits from the splash-up and the foam ball, once the riding physics settles. A lip and whitewater look for Classic, if weaker machines call for one.

## Next milestone — physical wave formation — `In Progress`

Follows [the wave formation plan](docs/research/wave-formation-plan.md) and [ADR 0004](docs/adr/0004-dispersive-surf-zone-solver.md).

### P0 · GPU displacement from the shared field (G1) — `Done`

- [x] Upload per-node height and foam as a float texture; the vertex shader displaces, shades, and colors the surface with the field's own bilinear lookup. `WaterSurface.update()` fell from 3.36 ms to 1.07 ms per frame (merged in PR #1).

### P0 · SI wave foundation (P1) — `Done`

- [x] Airy dispersion with the explicit Guo wavenumber; seeded JONSWAP sea state with cos-2s spreading, linear elevation and depth-averaged flow, and a set predictor verified against the Munk beat period.
- [x] Froude-consistent time-scale (0.4–1.0) in the Wave Lab; physics readout comparing Airy speed with the legacy simulation speed.
- [ ] g = 9.81 in the solver, removal of the Wave speed slider, and the `legacy` flag move to P2 with the new solver, which keeps the legacy wave playable until the P4 board retune.

### P1 · Spots, sliding window and finite-volume solver (P2) — `Done (view only)`

- [x] P2a: composable seabeds for Beach (Dean profile with seeded sandbar and rips), Point (31° headland contours), Reef (0.15 shelf-edge slope), and Canyon. A well-balanced, positivity-preserving finite-volume shallow-water solver with wet/dry cells, Manning friction, and relaxation zones. Validated against lake at rest, conservation, the Stoker dam break, √(gh) speed, relaxation reflection (0.27 %), Green's law, Snell's law and beach run-up.
- [x] P2b-1: in-place typed-array sweeps (7.9 → 6.3 ms per step for 33.6k cells in bundled Node); open along-shore boundaries; a stretched cross-shore grid (4 m to 1 m, reflection under 5 %); an along-shore sliding window that keeps a lake at rest across the headland.
- [x] P2b-2: fused MUSCL-Hancock stepping, 4.05 ms per step on the 36.2k-cell stretched spot domain (budget 4 ms), with validation unchanged or better. A seeded sea-state relaxation boundary: precomputed row and column phases, correct after window shifts, and 0.95 of the linear Hs generated in a flat channel. A column WKB warm start (exact on a flat bed, Green's-law shoaling, γh cap; spin-up peak 1.12× the initial one). Set-run timing.
- [x] P2c (option a, view only): a Water model switch in the Wave Lab (or `?physical`) shows the stage 1 surf zone for Beach, Point, Reef or Canyon with buoy-style inputs. It has a spot seabed, overview, profile and underwater spectator views, and a live solver and next-set readout; the legacy wave stays playable. The in-browser solver runs at 5.7–7.6 ms per step on the main thread, so the Web Worker and bicubic sampling move to P4 with board coupling.
### P1 · Far-field ocean (G2) — `Done`

- [x] The physical sea continues to the horizon from the tank's own components. It is exact at the tank's offshore boundary, Airy-deepening offshore, and shoaled with a breaking-foam proxy beside the window, with Gerstner crests and a sky fade. Shading-only wind chop is on both water meshes.
### P1 · Emergent breaking and Iribarren lip (P3) — `Done`

- [x] P3a: the physical waves break by themselves (Kennedy test plus a stage 1 bore criterion). Whitewater follows breaking, and the Wave Lab shows breaker type, breaking share, measured peel angle with its Hutt skill rating or a close-out explanation, and local wind (chop and onset shift). The surf zone needs cells of 1 m or finer.
- [x] P3b: storm mode derives the swell from wind, fetch, duration and distance (JONSWAP with a PM cap, CEM duration limit, dispersion and angular spreading). Wind's shift of breaking onset is sourced and scaled by the breaker celerity. Plunging breakers (0.4 ≤ ξ_b ≤ 2) throw a mass-conserving lip, once per wave per column. `npm run report:rideability` writes the per-spot [rideability report](docs/research/rideability-report.md). Ride-time distributions wait for the P4 rider.
### P2 · Shading, foam, board consequences (G3, G4, P4) — `Done`

- [x] G3: physically based water shading on both water meshes: Fresnel (n = 1.333), per-spot turbidity and bed albedo, shallow-water reflectance from the seabed under every node (sandbars and the reef shelf read turquoise from above, channels blue), and sunlight through thin crests marched toward the sun. Stage 1's broad crests glow only at their tops; P5's peaked crests and the rendered lip will show more. [Record](docs/superpowers/plans/2026-09-25-g3-water-shading.md).
- [x] G4: foam carried by the solver's currents in the physical mode: dense whitewater from bore dissipation and lip splashes decays into a lace that lasts longest on the Beach, drawn as a patchy lace network that drifts with the flow, with bubbles under the bores. The legacy wave keeps its soft foam tint. [Record](docs/superpowers/plans/2026-09-25-g4-advected-foam.md).
- [x] G5: caustics from the real surface. Each frame, sun rays refracted through the drawn surface (the solver's heights and the wind chop) light the seabed over a 48 m window ahead of the camera, by the ratio of each ray patch's area under flat water to its area on the bed. The water body lights its bed-reflected share with them, and the Below view's sand fades them by Beer–Lambert. The Reef's clear water shows a bright network; the Beach's turbid surf hides it.
- [x] G6: spray and mist. A pooled particle cloud in the worker splashes drops up from lip impacts with the parcels' momentum, throws them off bores, and feathers mist off steep crests in offshore wind. Drops fly with quadratic drag toward the wind and end when they fall back into the water.
- [x] P4: the board on physical waves, delivered in the sub-phases of the board and surfer physics plan (branch `codex/board-surfer-physics-proposal`, B0–B4):
  - [x] P4a: the physical surf zone runs in a Web Worker behind a snapshot host; the main thread spends 0.10 ms per physical frame (10.8 ms before) and a spot's spin-up no longer freezes the page. The worker step is 5.8 ms against the 4 ms gate, a risk for the board phases. [Record](docs/superpowers/plans/2026-09-25-p4a-surf-zone-worker.md).
  - [x] P4b: one `SurfWater` sampling seam for bodies over legacy and physical water: Catmull-Rom surface agreeing with the rendered vertices, flow at body depth by the §1.10 profile (flagged in bores), explicit dry and outside-domain samples, momentum-conserving reactions. The legacy board and rider fall sample only through it, with golden replays unchanged bit for bit; the reference shortboard and rider are recorded and the [legacy board baseline](docs/research/board-baseline.md) is generated. [Record](docs/superpowers/plans/2026-09-25-p4b-surf-water-seam.md).
  - [x] P4c: a rigid reference shortboard (25.75 L, 2.54 kg, its own inertia) floats, drops and planes on sampled water. The forces are:
    - buoyancy along the surface slope;
    - Savitsky-calibrated planing pressure concentrated behind the spray root;
    - ITTC friction;
    - added mass, water entry and radiation;
    - seabed contact.

    Energy ledgers close. It rides the physical surf zone riderless in the worker, drawn from the same hull curves, and it is the detached surfer's contact body. A towed 75 kg rider planes at 6 m/s but sinks at rest. The worker step is now 6–7 ms against the 4 ms gate. [Record](docs/superpowers/plans/2026-09-25-p4c-board-body.md).
  - [x] P4d: a separate 73 kg rider rides the board through checked contacts: it pushes only along a line through its centre of mass that meets the feet, within friction and a load cap, and it holds on while lying down. It floats and paddles prone at about 1.6 m/s, pops up in 1.2 s when the board planes (and lies back down when it does not), and shifts weight onto a rail to steer. A failed contact separates it into the detached surfer with continuous momentum. The physical mode is now ridden: Space paddles, Enter pops up, the arrows steer and R relaunches; a ride camera follows. Catching a physical wave is not yet possible (P4f), and without fins the board wanders and spins out (P4e). [Record](docs/superpowers/plans/2026-09-25-p4d-rider.md).
  - [x] P4e: a thruster of fins and gripping rails (lift, stall, ventilation), weight-shift carving and prone steering; the paddler keeps its line through oblique swell, and trailing legs sit in the board's wake. Water entry is refined only when a face really enters the water. The plunging lip strikes the rider: a hard push topples a standing rider past its capture point, a splash is ridden out. **Open:** a full-lock carve held past about 2.8 s throws the rider. The standing rider's upright model is an infinitely strong ankle, and a finite-impedance rider is the fix; ¾ steer carves steadily. The catch bot never stood on stage 1 waves (0 of 135 attempts), so P5 comes before P4f. [Record](docs/superpowers/plans/2026-09-26-p4e-fins-rails.md).
  - [x] P4f: physical waves are catchable at real speeds. The kept change is the prone grip, 0.3 → 0.6 body weights: steepening faces had been lifting paddlers off before the cue. With it, 30 ghost riders on a groundswell more than doubled their cues, and every stand rode at least 3 s. The feet and sinking limits were swept and kept; a deeper feet limit lets a rider stand on a face too gentle to plane on. A refused pop-up now says why. Practice is a third swell source (a steady 2 m, 12 s groundswell on the same solver and forces). `npm run report:catch` runs ghost riders on natural and practice seas: natural waves stood riders at the Beach, Point and Reef, with rides up to 11.6 s at 10–12 m/s. **Open:**
    - most attempts still end with the paddler lifted off before the cue;
    - the Canyon never cues;
    - the 30 s practice ride with linked turns is not met: the bots ride straight, the spots mostly close out, and hard carves need the finite-impedance rider (P4e).

    `legacy` stays until catching is reliable. [Record](docs/superpowers/plans/2026-09-26-p4f-catch.md), [natural](docs/research/catch-report.md) and [practice](docs/research/catch-report-practice.md) reports.
  - [x] Paddlers stay on their boards (user's fix list, 2026-09-26). Most catch attempts used to end with the paddler lifted off before the cue. Three causes were found and fixed:
    - lying down, the rider never reacted to the board's roll, and a shortboard under a prone body capsizes on its own. The body now shifts toward the high rail;
    - a relaunch started the board at rest mid-wave, where the flow jolted it. It now drifts with the water;
    - a stroking hand's drag grew without bound with the board's speed. An arm now gives way at 0.4 body weights.

    Paddlers lost the board 156 → 29 times at the natural Point and 420 → 127 in practice (the other spots similarly). Stands rose at the practice Point (5 → 13, longest ride 13.7 s) but fell in the natural sea (10 → 5): the old cues partly rode on the runaway hand thrust. **Next:** sprint paddling at take-off, and pop-ups that fail on late take-offs off the lip. The rider now starts, and relaunches, 6 m outside the break line instead of 25 m, where catches were rare (the ghost riders stood from 4–8 m out).
  - [x] The Canyon cues (user's fix list, 2026-09-26). The rider waited over the canyon's axis, in the shadow its refraction casts: crests there were 0.2–0.3 m, and no ghost rider ever saw the cue. The canyon does gather the swell on its flank (crests 1.7× those of the same shelf without it), but on the window's centreline that focus fell on the open edges. Now:
    - the canyon's axis runs along the window's edge (x = 80), so its focusing flank fills the window and the bed is level across the open boundary. A canyon wall crossing the edge ran the edge cells unstable (3 → 57 m/s in 6 s); the open edge itself is fixed below;
    - the rider waits where the swell gathers: linear rays from the relaxation zone, averaged over half a wavelength, pick the take-off for the day's direction and period. It sits near x = 0 for the Surf screen's swells, and at −24 m for a swell from −10°. In the Boussinesq surf zone, its waves are 89–96 % of the largest along the lineup. Beach, Point and Reef keep their centre transect.

    Ghost riders at the Canyon: 0 → 9 cues and 5 stands in the natural sea (longest 3.1 s), 0 → 34 cues and 5 stands in practice (4 rides ≥ 3 s, longest 5.9 s). Its card is back on the Surf screen. The other spots' rows moved with P7's lip since the last reports: the natural Point held (2 stands, longest 14.0 s); the practice Point's drop was checked over three seeds (below, under Later). [Natural](docs/research/catch-report.md) and [practice](docs/research/catch-report-practice.md) reports.
  - [x] Open edges hold over sloping beds (2026-09-26). With the Canyon's axis 30 m inside the window, its 0.34 wall crossed the open edge and the edge column ran away at t ≈ 67 s. At an open edge the dispersive terms extended the surface with the shallow-water fluxes' zero-gradient ghost. That made the edge's η_xx equal to −η_x/dx, not a curvature, and B g d³ η_xxx a surface-slope force 2.7 times the hydrostatic one in 9 m of water. Over a bed rising toward the edge, an along-shore outflow draws the surface down, and that force pushed on the drawdown until it ran away. The edge column now takes its neighbour's curvature, on the CPU and the GPU:
    - that layout runs 90 s under 3.3 m/s, like the level-bed ones;
    - the GPU matches the CPU to 7e-5 m over 10 s, against 0.2 m without the port;
    - a new test runs an oblique wave train over a canyon wall at both open edges for 90 s.

    Switching dispersion off beside open edges also held, but it was rejected: that border runs the whole cross-shore length, so its waves broke 25 m early and the breaking spread along the crest (the peel test failed). The shipped Canyon keeps its axis on the edge (level bed); the catch reports above predate this fix.
  - [x] Play the surfer, not the board (user request, 2026-09-26): after a fall the camera follows the swimmer, who strokes with Space and steers with the arrows. Enter within reach of the board grabs it and lies back down prone, keeping the pair's linear momentum (surfer plan S3); R still relaunches in the lineup.
### P2 · Boussinesq objective (P5) and WebGPU tier (P6) — `Done`

- [x] P5: the surf zone runs on a Madsen–Sørensen Boussinesq solver with Kennedy eddy-viscosity breaking and a Tonelli–Petti switch to shallow water. It is the default; stage 1 is a Wave Lab 'Solver' setting away.
  - Its phase speed matches its equations within 1 % to kh = 3, and those stay within 2.5 % of Airy.
  - It shoals by linear theory, refracts by Snell, carries groups at the model's group speed and solitary waves at √(g(d + A)).
  - It breaks at H_b/h_b ≈ 0.98 on a 1:40 beach.
  - A fix to the Hancock predictor (it now sees the dispersive acceleration) cut short-wave decay from 8 % to 0.2 % per wavelength.
  - **Performance gate:** on the CPU, stage 2 takes 12–15 ms per step against the 4 ms budget (stage 1 now 7 ms). P6 meets it on the GPU (below). For machines without WebGPU the fallback is still the user's choice (plan §3.3): a narrower window, stage 1 on the low tier, or WebAssembly/SIMD.
  - `legacy` retires at the end of P4f. [Record](docs/superpowers/plans/2026-09-26-p5-boussinesq.md).
- [x] P6: the WebGPU tier. The worker steps the stage 2 water on the GPU when WebGPU answers; the Wave Lab's Compute setting can force the CPU.
  - Sixteen WGSL kernels mirror the CPU solver. Over 20 s on the Reef the device stays within 0.6 mm of the CPU's depth, with breaking agreeing on every cell.
  - A whole frame takes 3.0 ms, against 12–15 ms on the CPU. The full surf-zone step is 4.6 ms, and the worker runs at 2.0× real time where the CPU managed 0.68× under the same load.
  - The tier's sea has 64 components, and its shading chop is a 256² Tessendorf FFT of the local wind sea.
  - **Deviations:** the whole field is read back every frame with no lag, not an async patch: the renderer is WebGL on the page, and the lip, foam and breaking model read the whole grid. 0.5 m cells were measured at a quarter of real time and not adopted.

  [Record](docs/superpowers/plans/2026-09-26-p6-webgpu-tier.md).

### P1 · Barrels (P7) — `In Progress (tubes open; the barrel needs a visual pass)`

Requirements agreed in a grilling session on 2026-09-26. The plan is [P7 barrels](docs/superpowers/plans/2026-09-26-p7-barrels.md).
- [ ] **Scope:** a physical lip sheet the rider can be hit by or covered by. Deliberate tube-riding comes later (see the gameplay list below).
- [ ] **Physics:** a tube forms, or not, from the wave's own state. A column throws when its crest water nears the crest's speed on a steep face, and the local bed slope decides between a plunging jet and a spilling roller. The jet leaves at the crest's surface water speed, so the tube's shape is an outcome, checked against measured ranges: width-to-length 0.25–1, overturn area 0.2–0.4 H² (Feddersen et al. 2023). Values the user's sources will confirm are marked provisional.
- [ ] **The work, in order:**
  1. the throw trigger and speed;
  2. a continuous, water-conserving sheet stitched along a peel;
  3. rider contact (hit versus covered, and a tube can be too small for a standing rider);
  4. a peeling Reef (27–60°);
  5. a translucent sheet with foam;
  6. validation, per-spot tube reports and a video.
- [ ] Every tier gets tubes. If the physics is too heavy, it is sped up later, never faked.
- **Built, 2026-09-26:**
  - the throw trigger and classification;
  - jets at the crest's measured speed, with tubes measured in the crest's frame;
  - the continuous, water-conserving sheet;
  - hit or covered;
  - the translucent sheet;
  - `npm run report:tubes`.
- **Tubes open (2026-09-26, evening).** Each plunging break takes its overturn from Pick & Feddersen's (2026) fits for its bed slope and sea, sized by the wave the solver has. The lip throws the jet's own water and flies it to the overturn's front end at 1.2–1.6 times the crest speed, as measured jets leave (1.15–1.73). The depth-averaged face stands where a real face has gone vertical, so each flying lip carries its void, and the rider, the board, the renderer and the lip's landing meet the void's floor (the user's choice; the solver's water is untouched).
  - At the Wave Lab defaults the Reef's tubes run a median 1.12 m (90th percentile 1.78 m), 97 % inside the measured range. Openings reach 1.1–1.6 m under the lip: a crouching rider fits the bigger ones.
  - Fixed on the way: throws created momentum (they removed the crest's depth-averaged momentum but launched at the jet's speed), which drove the practice Reef's water to 23 m/s; strip parcels were released where the jet, not the crest, had moved to; a non-finite body's lip query spread NaN through the sheet.
  - **Filmed (2026-09-26, user request):** the Reef on the Big swell barrels on camera. The void opens along the crest, the lip curls over it and lands in spray.
    - Two changes made it readable. The lip pours from its crest for its whole flight, as measured jets do (Erinin et al. 2023), so it hangs as a curtain, not a short ribbon. `?renderSpacing=0.5` carves the void on a finer grid.
    - `?record&watch=S` films only while lips fly, from the shoulder ahead of the peel.
    - It is still rough: an 8-parcel curtain, a heightfield under it, and spray that swamps the impact. The visual pass and the tube camera belong to P12.
- **Along the way:**
  - the peel measurement stopped counting shore swash;
  - the Reef's shelf is now 1 m, so waves break on its edge (769 jets a minute against 307);
  - no reef shape reached a 27–60° peel inside the tank.

  [Record](docs/superpowers/plans/2026-09-26-p7-barrels.md), [tube report](docs/research/tube-report.md), [rideability report](docs/research/rideability-report.md).

### P1 · Characters and sky (G7) — `In Progress`

Requirements agreed in a grilling session on 2026-09-26: [G7 spec](docs/superpowers/specs/2026-09-26-g7-characters-and-sky.md). Part A is [recorded](docs/superpowers/plans/2026-09-26-g7a-characters-and-sky.md), and every asset's source and licence is in [ASSETS.md](docs/ASSETS.md).
- [x] **Part A · Surfers:** four semi-realistic MakeHuman surfers (two women, two men, 1.65–1.74 m, CC0), built headless in Blender with MPFB 2 on its Mixamo-compatible skeleton, 1.0–1.6 MB each.
  - The physics owns the body: each frame a humanoid rig solves the skeleton from the worker's seven rider points by two-bone IK. A code-driven layer sets the knee and elbow directions, the chest's turn toward the nose, the head's look and cupped paddling hands.
  - Outfits are crisp per-vertex cuts in the body's shader: full suit, spring suit, rash vest with boardshorts or bikini, with a swappable accent colour.
  - Skin, hair and suits read wet. A low-poly body takes over beyond 8 m. The simple surfer stays as the fallback if a model cannot load.
- [x] **Part A · Board:** the physics hull in resin with a waxed deck, a grooved traction pad and a stringer. The thruster's fins are drawn at the places and sizes `THRUSTER` gives their forces. There are five unbranded designs.
- [x] **Part A · Sky:** three Poly Haven pure-sky photos for dawn, midday and sunset. Each sun is moved out of its HDR into a measured directional light, so the photo lights the shade and the light casts the shadow.
  - The sun-direction control turns the photo, and the sun-height slider snaps to the nearest photo.
  - Neutral tone mapping.
- [x] **Part A · Shadows:** four levels, each checked in the browser:
  - a blob;
  - the rider and board on themselves and the deck;
  - also the water and seabed;
  - soft PCSS.

  The shadow camera follows the rider in whole texels. `?shadows=` picks a level until P8's presets do.
- [x] **Part A · Paddle splashes:** each pulling hand throws spray in proportion to the work it does on the water, at the lip splash's rate.
- [x] **Merged with P8:** P8's Dawn, Midday and Sunset now pick their own photos. Their sun heights match the photos' measured suns, and dawn and sunset suns stand to the side of the seaward cameras (±110°), since looking into a photographed sunset's haze washed out the menu.
- [x] **Part B (2026-09-26):**
  - **A Surfer card on the Surf screen:** pickers for surfer 1–4, the outfit (the rash vest is named for what goes with it on that body: a bikini or boardshorts), the suit's colour as six swatches and the five board designs. Picks apply at once and are saved with P8's settings.
  - **The preview:** the surfer stands on their board, lit by the chosen time of day's photographed sky, with the camera circling at 0.15 rad/s (still with reduced motion). It has its own small WebGL context, released when the screen closes; without WebGL the pickers show alone.
  - **Riding as the choice:** the physical mode loads the chosen body (the latest pick wins a race), dresses it, and builds the board in its design. `?surfer=` still overrides the body.
  - **P8's Time of day picks the sky** (already so since the P8 merge).
  - **The presets pick the surfer's detail:**
    - Low: a blob shadow, the low-poly body and 512 px textures;
    - Medium: the rider's own shadow, the full body within 8 m and 1024 px;
    - High: the shadow on the water and seabed, 12 m and full-size (2048 px) textures;
    - Ultra: soft shadows and 20 m.

    Custom follows the detected preset. A new texture size reloads the surfer. `?shadows=` still picks the level.
  - [Plan and record](docs/superpowers/plans/2026-09-26-g7b-surfer-card-and-presets.md).
- [ ] **Then:** a playtest with the user. `character-sheet.html` is the dev screenshot sheet: every surfer prone, standing and fallen, at chase distance and at 1.5 m, under each sky, plus a sun-alignment check.
- **Backlog:**
  - the beach, sand and coastline;
  - water texture detail;
  - a replay or photo mode;
  - dripping water;
  - a full character creator;
  - motion capture to refine the paddle and pop-up;
  - Mixamo clips (swim, tread water, beach idle), which need the user's Adobe login;
  - moving to the WebGPU renderer;
  - a preset's mass and height fed into the physics (after P9's flexible rider);
  - the leash, drawn once P11 adds it to the physics.

### P1 · Rich water (G8) — `Done (playtest open)`

Requirements agreed on 2026-09-26: [G8 spec](docs/superpowers/specs/2026-09-26-g8-rich-water.md), built as [recorded](docs/superpowers/plans/2026-09-26-g8-rich-water.md). Rendering only; the physics is unchanged.
- [x] **Water look: Classic / Rich** in Graphics › Advanced. Low is Classic, Medium to Ultra are Rich, and old Low saves stay Classic. Classic's shaders are pinned byte for byte by snapshots.
- [x] **Wave face:**
  - the physics' own Catmull-Rom surface, normals per pixel, with a dense 96 m patch at 0.25 m where the camera looks;
  - fine ripples carried by the currents;
  - a glossy finish whose specular anti-aliasing turns distant ripples into a sheen;
  - foam streaks up steep faces along the current.
- [x] **Whitewater:** fresh foam drawn as bright, clumpy churn with relief and creases, opening into the G4 lace as it ages. Thin fresh foam glows when backlit.
- [x] **Mist and spray:** mist lit toward the sun (forward scattering) and softer. Every sprite fades into the water with no hard line.
- [x] **Far ocean:** the same ripples and gloss, meeting the tank without a step.
- [x] **Colour:** Rich mirrors half the sky over a stronger body colour, tuned on the water sheet (`?inpage&waterSheet`) against the reference stills.
- [x] **Cost on the M1 Air:** Rich adds 0.2–0.9 ms per frame at 1280×720 (8.1–8.8 ms Classic, 8.5–9.7 ms Rich, medians of the render alone). Frame intervals per preset wait for a session with the browser pane shown.
- [ ] **Playtest:** Rich against Classic in play, and the frame times per preset.
- **Backlog:**
  - the lip and tube look, once P7's tubes resume;
  - screen-space reflections;
  - refraction of the bed through the face;
  - a middle water level if the M1 Air needs one;
  - the tank/far-field seam: from high up, the tank's offshore ridge shows a thin outline and sand-coloured slivers, in both looks.

### P1 · Barrel and whitewater (G9) — `Done`

Requirements agreed in a grilling session on 2026-09-26: [G9 spec](docs/superpowers/specs/2026-09-26-g9-barrel-whitewater.md); [plan](docs/superpowers/plans/2026-09-26-g9-barrel-whitewater.md).
- [x] **Part A · the barrel look** (Rich only; Classic unchanged, its lip sheet now pinned by a snapshot too):
  - **Tubes reach the page.** The worker sends raw heights and a table of flying tubes. One carve serves the physics, the page's Classic texture and its height lookups; it agrees with the worker to under 0.1 mm.
  - **The void as one shape along the peel.** Between two columns whose tubes belong to one peel (crests within 2 m along their travel, facing the same way), the tube itself is interpolated (crest, opening, size); otherwise the carved surfaces blend. The physics carves with the same function at its 1 m nodes while the Rich water cuts every 0.25 m, so board and eye agree to about 0.2 m inside a void; a finer physics carve can come with P12's tube riding.
  - **The void cut on the GPU**, per vertex in the 0.25 m patch and per pixel, with a 16-step twin of the physics' floor curve, within 5 mm of it.
  - **The lip:** spline-smoothed between its parcels, as thick as its water (never thicker than a compact blob of it), with rounded edges where it ends, shaded with the Rich water's optics. Sunlight, and the sky's light where sky lies behind it, come through it by Beer–Lambert over its own path; it reflects at the Rich balance and whitens to foam as it ages. It is rebuilt only when a snapshot brings new parcels.
  - **Judging it:** `?inpage&waterSheet&spot=reef` holds the practice Reef on an open tube and shoots it beside, from the shoulder and inside.
  - **Cost on the M1 Air** (render alone, 1280×720): Rich tube shots take about 12 ms against Classic's 6 ms; the lineup about 8 ms against 6 ms.
  - **Checked:** a JS mirror of the GPU carve agrees with the physics' to 5 mm; the Rich spray fade and crest light read the carved surface; snapshots carry up to 256 tubes, keeping the newest.
  - **Open, for the playtest:** how the barrel reads in play; a cheaper carve slope (analytic, one evaluation instead of three); the caustics under a void still refract through the uncut surface.
- [x] **Part B · breaking whitewater** (physics in the worker whatever the look, drawn in Rich only, no forces on bodies but the collapse's carve; sources in `docs/research/whitewater-sources.md`, outcomes in `docs/research/whitewater-report.md`):
  - **Air in the water:** an aeration field on the solver grid. Landing lips entrain β = 0.1 of their impact energy against buoyancy, bores β of their dissipation, and collapsing tubes the air they do not blow out. A plunge's air fills a plume as wide as it is deep. The field is carried by the currents, degasses at 0.25 m/s over the plume's depth, and holds at most the measured α_max = 0.2. The Rich churn now shows where the water is fresh with air.
  - **Splash-up:** each landing jet parcel re-throws 30 % of its water up (0.6 of its impact speed) and on (0.8), drawn in Rich as a sheet with the lip's machinery. Water and momentum are conserved.
  - **Collapse and spit:** once its jet has all landed, a tube shrinks over its free-fall time √(2W/g). The rider feels the shrinking void, and its air leaves as the void loses volume. Half of it leaves as spray: out of the peel's open end at the speed mass conservation gives (the spit), or up through the lip where the whole section closes (an eruption). The rest breaks into bubbles. The air balance is exact.
  - **Foam ball:** each collapsing tube rolls a κ_r·H² roller of 0.5–0.8 m churn sprites tumbling with its crest. The tube's whitewater (foam ball, spit, eruption) has a spray pool of its own and is drawn in Rich only.
  - **Bubble plume:** the Rich body whitens as far down as the air went, from above through the water over it and from below.
  - **Report** (Wave Lab defaults, 2 seeds × 12 periods): the Reef throws the most explosive whitewater and the Beach the gentlest with no per-spot values:

    | | Reef | Beach |
    |---|---|---|
    | Splash-up, 90th percentile | 1.12 m | 0.77 m |
    | Spit speed, median (fastest) | 10.5 m/s (52) | 8.8 m/s (42) |
    | Median surveyed void fraction | 0.14 | 0.05 |
    | Surveys at α_max | 22 % | 2 % |
    | Foam-ball sprites, median | 117 | 53 |

    Collapses take 0.3–0.4 s, and the Canyon barely plunges.
  - **Judging it:** `?inpage&waterSheet&whitewater` (with `&spot=reef` or `&spot=beach`) holds the sea on a collapsing tube and shoots its whitewater.
  - **Cost on the M1 Air:**
    - worker step: 17.3 ms on the Reef against Part A's 16.2 ms, and 17.9–18.7 ms on the Beach against 16.2–16.7 ms, mostly the aeration field;
    - render, 1280×720, at the Beach's whitewater: Rich 10–13 ms against Classic's 5–8 ms, the same as Part A's tube shots.
  - **Found and fixed:**
    - by the sheet: collapsing a tube while its jet still poured landed the pour on the crest, and the practice Reef's solver ran away; a regression test now runs it;
    - by the report: the aeration field had no ceiling.
  - **Open, for the playtest:**
    - how the whitewater reads in play;
    - the render values (s_a 40 per m³, the mist shares, the foam-ball size, PLUME_DENSITY);
    - at dawn and sunset a nearby spit's mist glows as an orange haze;
    - the carve's teeth, the barrel's main open item. Two causes, found on the Reef sheets:
      - a void's back stood as a wall half its width deep at the crest, which the mesh drew as a jagged crack along the lip. **Fixed:** its floor now meets the surface over `TUBE_EDGE` (0.35 m) behind it, in the physics and on the GPU alike. The front, where the jet lands, is unchanged, so the tube report still holds;
      - **open:** where a peel's columns collapse at different stages, a column whose void has gone stands as a spike a metre wide between carved neighbours (Part A's instant close did the same). It needs the peel to collapse as one section;
    - the spray pool (4,096) is full a fifth of the time on the Reef and the Point, and the lip's splash gives way first;
    - the review's deferred whitewater fixes are done (2026-09-27): spits no faster than the falling lip drives the air (√(ρ_w/ρ_a)·√(gW/2); the rest erupts); each drop of lip water reported landing once; impact drops thrown up as fast as the splash-up sheet; the aeration follows the window before adding air; its snapshot write halved; the report balances the air on what the tubes trapped.
    - Classic's spray is kept as it was before G9 (the user's call, 2026-09-27): in Classic the lip's impact drops come from the jet's whole water at the old launch speeds (30–80 % up, 20–60 % on), and splash-ups throw none; Rich follows the splash-up. The page tells the worker's spray which look it is drawn in.

    Whitewater forces on bodies and the player's tube camera (P12) stay in the Backlog.

### P1 · Teahupo'o Reef — `Part A in review; Parts B–D next`

Requirements agreed in a grilling session on 2026-09-27: [spec](docs/superpowers/specs/2026-09-27-teahupoo-reef.md); [Part A plan](docs/superpowers/plans/2026-09-27-teahupoo-reef-part-a.md). The A-frame Reef becomes a Teahupo'o-style heavy left: sourced thick lips and round tubes, a solid reef, and P12 tube riding brought ahead of P11.
- [ ] **Part A · the bed and its peel** (branch `claude/teahupoo-reef`):
  - **The bed:** Teahupo'o's published shape ([sources and rulings](docs/research/teahupoo-reef-sources.md)):
    - 30 m of water up a 1:2.29 forereef (Rodríguez-Burguette et al. 2025);
    - a 10 m shelf (Shand 2024);
    - a ledge at 45° to the shore, rising to a crest 1.5 m under the surface (WSL);
    - a pass at the end of the left.

    The Reef always runs stage 2, with the solver's own waves at its 30 m edge, its own long-period swells and Practice, and its riders take off at the peak.
  - **Found and fixed** ([report](docs/research/teahupoo-reef-report.md)):
    - the plane-beach Iribarren bands read the steep ledge as surging and threw no lips. A break over a submerged crest now plunges (provisional until Part B);
    - the Big swell drained the ledge to 0.07 m and ran its backwash to NaN. Dispersion now switches off in a drained trough as at a high crest, on CPU and WGSL;
    - the peel meter measured along x, mixed two waves in a long peel, and counted breaks past the reef's end. It now fits one wave's front along its break line, and the Reef only on its ledge.
  - **The design:** chosen by a sweep of ledge angle, swell direction and shelf depth. It peels a median 13.6 m/s (α 23°) on the Small swell, against today's A-frame's 11° close-outs. About half its waves close out: fast, often made only through the tube.
  - **Catching** on its Practice: 13 riders stood from 756 attempts (today 14 from 1018), with the Reef's first rides of 3 s or more (longest 5.4 s, against 2.6 s).
  - **Open:**
    - the move onto the wave sizes session's swell-sized tank, with the faces calibrated on its size report (Part A, Task 9, after wave sizes' Part B merges);
    - the Big swell's faces;
    - the user's look.
- [ ] **Part B · slab tube physics:** the thick lip and round tube from slab sources (Mead & Black 2001; Blenkinsopp & Chaplin 2008), replacing the provisional submerged-crest rule.
- [ ] **Part C · the look, the sound and a solid reef:** the lip's glow, the step, the coral, spit, the section collapsing as one, the impact sound, and "hit the reef".
- [ ] **Part D · tube riding (P12):** rail grab, the tube camera, the foam ball and spit on the rider, and the Surf School Tube lesson. Waits on Compress, Regular/Goofy and the take-off (PR #43).

### P1 · Gameplay milestone (P9–P12) — `In Progress`

Requirements agreed in a grilling session on 2026-09-26: the [gameplay spec](docs/superpowers/specs/2026-09-26-gameplay-milestone.md), grounded in the [surf-science survey](docs/research/surf-gameplay-research.md).
- Every mechanic is a physical rider input; the player gives intent and the rider's reflexes balance.
- Study outcomes are validation checks, body limits are tunable parameters, and performance is measured, never a gate.
- The branch `claude/gameplay-p9` started on PR #7 and has merged main (P8 menus, P7 barrels, G7 characters).
- **With P8:** P8 (Menus and settings) owns the UI shell. The gameplay layers' physics runs in parallel with it; their player-facing parts are built on P8's HUD, end card, Logbook, Settings and bindings. P8 has merged.
- **With P7:** P7 (barrels) has merged, so the Tube layer can follow P11.

- [ ] **P9 Riding** (`Playtest`, [plan](docs/superpowers/plans/2026-09-26-p9-riding.md), [findings](docs/superpowers/plans/2026-09-26-p9-riding.md#findings)):
  - **Part A, physics — done:**
    - phase 0: speed and position against the crest, speed over ground, a horizon-holding ride camera, an autopilot. It found that catching, not the rider, bounds the rides; the rider outruns closing-out waves onto the flats;
    - the front view holds steady while waves pass a waiting rider (user report, 2026-09-27): its lean toward the crest fades in as a wave comes from 30 m to 15 m out, fades once the crest has passed, and eases. It had cut 5–14° in one frame twice a wave, where the wave gauge's window gains or loses a crest;
    - the rider stands on a leg (a spring and damper in the board's solve): it holds the load it feels, absorbs landings and crouches;
    - trim, stall, crouch, the hand in the face and heading hold;
    - pumping gains speed when timed with the path (Kogelbauer 2024), and nothing on flat water;
    - turns and ride ends read from the ride's trace, and a provisional 0–10 score on the WSL criteria.
  - **Turns redesigned** ([plan](docs/superpowers/plans/2026-09-26-turn-redesign.md), [findings](docs/superpowers/plans/2026-09-26-turn-redesign.md#findings), [carve lab](docs/research/carve-lab.md)):
    - the standing body banks on its ankles as an eighth unknown in the board's solve; the balance caps the ankle where the feet reach their edges, and the upper body's swing takes the rest;
    - the hard turn makes 66° in 1.2 s at 2.1 rad/s on a 50–60° rail (it made 13° at 0.2 rad/s; Forsyth 2024: 99° in 0.96 s at 1.9 rad/s on 42°), and the roll–yaw wobble decays at 7–11 m/s (ζ 0.05–0.07);
    - the carve lab measured the plant: a planing board rights about the rider's load line (850–1,700 N·m/rad), and the turn follows the rail within 0.03 s;
    - play fixes after the user's playtest (PR #27): the arrow keys steer both ways; a pop-up always ends standing and Enter lies the rider back down; below planing the body rides upright over its feet;
    - fall fixes (2026-09-27): the rail stays within its 48° bite and the lean within what a 4.5 m carve holds. Held at full steer at 6 m/s the rail reached 65° and the board bogged (79 % of its speed kept); now 50° and 98 %. The hard turn still makes 65° in 1.2 s. Carrying the body upright at once when the board drops off the plane was tried and tipped the slowing board, so it still stands back up on its ankles first;
    - a crouch held while the feet brake a lean into a turn (2026-09-27): crouched full steer on the trough's flat water threw the rider in 0.65 s (the crouch's drop took the load off the board as the body leaned in, and the ankles rolled the board over instead of stopping the body). It was how the Canyon's rides ended, in their first bottom turn. Now it holds at 8 and 11 m/s;
    - open: full steer held for 2 s or more carves up the plane face, stalls and falls, as a real carve held uphill would. The steer's 50° full bank was chosen with the user for the stronger turn;
    - open: the Canyon's rides are still short. With the play and fall fixes the autopilot made 25 stands and 3 rides of 3 s or more over two seeds × 5 min (mean 6.4 s; before them 7 and 0, and 14 and 10 before the redesign); 282 of 335 attempts missed the wave. Traced ride by ride, the rider pops up straight down a 2.2–2.8 m face, reaches 11–12 m/s against a crest at 6–8 m/s and falls in its first bottom turn, where the rail releases at 12 m/s; broken water does not carry a board. Next: [riding the wave](docs/superpowers/plans/2026-09-27-riding-the-wave.md) (honest ride ends, the curl, the whitewater's push, a 1–1.5 m reference wave, the pocket reflex).
  - **Riding the wave, Part A** ([spec](docs/superpowers/specs/2026-09-27-riding-the-wave.md), [plan](docs/superpowers/plans/2026-09-27-riding-the-wave.md), [findings](docs/superpowers/plans/2026-09-27-riding-the-wave.md#findings)):
    - broken water carries a board (the surface roller's push in the sampler); honest ride ends (a fall, a kick-out, the wave dying, or lost); the gauge finds the curl; the ride report reads the done criteria;
    - the pocket reflex (Settings → Gameplay → Stay near the curl, Practice by default); the Practice swell at Hs 1.4 m for 1–1.5 m faces ([reference wave](docs/research/reference-wave.md));
    - open: the done criteria are not met (median ride 2.6 s against 10; without the roller's push the Canyon gave 17 stands and 1 ride of 3 s, with it 49 and 21). Riders stand on the flat ahead of the crest after a straight take-off (a paddler turns only ~7°/s), stall, and fall as the face passes under the slow board; a crouched full-steer turn at 10 m/s wobbles in yaw. Next: P10's take-off, re-catching, the wobble. Animation and regular/goofy are Part B.
  - **Part B, player-facing — done:**
    - trim (W/S, the stick), crouch (Shift, LT's travel, a touch button) and the hand (E, X), ramped, with context bindings (↑ paddles lying down and trims standing);
    - the end card's time in the pocket, turns with the speed kept, and slow motion; Score rides, with the session's best two and a best per spot in the Logbook; turn callouts;
    - the balance meter on the leg's margin, in Practice by default; one-time hints; the Controls screen explains the standing actions.
  - **Next:** the user's playtest on the M4 Pro, deferred by the user (2026-09-26): it runs well there, so the playtest comes later. It also checks, live, what the automated pass could not reach standing: W/S, crouch, the meter in a carve, hints, callouts and the end card.
- [ ] **P10 Take-off** (`Backlog`): cruise and sprint paddling recalibrated to measured speeds, critical-power stamina, angled take-offs, late take-offs and air drops.
- [ ] **P11 Lineup** (`Backlog`): a sliding window to pick a peak, sets read from the horizon, duck-dives, a surface roller with aeration (hold-downs emerge), breath, a snapping leash, Next set.
- [ ] **P12 Tube** (`Backlog`, after P11; P7 has finished): pulling in and racing out, rail grab and hand drag, crouch clearance, the Regular/Goofy setting, an automatic tube camera.
- **Backlog beyond P12:** multiplayer and community judging, local ride replay, airs, turtle roll and longboard, computer surfers, session-long fatigue. Audio is P8's backlog.

The user's original list of 15 mechanics (2026-09-26) is covered as follows:
- crouch, stall, high/low line, pumping, turns → P9;
- sprint, angled take-off, late take-off, stamina → P10;
- duck-dive, reading sets, wipeout and recovery → P11;
- pull-in/race-out, rail grab/hand drag, tube camera → P12.

### Later — `Backlog`

Follow-ups from the open-edge fix (#14) and the test timeouts (#15), 2026-09-26. The full-lock carve and slow turns were closed by the turn redesign.
1. **Rerun the catch reports.** The Canyon's ghost-rider numbers (#12) and the other spots' rows were measured before the open-edge fix, which changes breaking near the window's edges: in the 40 m Point peel test, lip launches went 28 → 57 and the second wave now breaks in almost every column. Regenerate the [natural](docs/research/catch-report.md) and [practice](docs/research/catch-report-practice.md) reports and the numbers quoted above.
2. **Checked (2026-09-26): the Point over several seeds.** Practice, 3 seeds × 2 min, 30 ghost riders, before P7 against now (tubes and the momentum fix):
   - stands fell 14 → 3 and rides of 3 s or more 4 → 2 (longest 13.7 → 5.5 s); by seed, stands went 13 / 1 / 0 → 2 / 0 / 1, so seed 1's lucky run carries most of the drop;
   - cues fell 225 → 186;
   - lip strikes that knocked a paddler off rose 4 → 18. The lip now flies ahead of its crest, where a paddler heading straight in meets it. Real surfers take off on the shoulder, at an angle: that is P10's angled take-off, not a tuning of the lip.
3. **Watch the settings sweep's timeouts.** Its three other tests take up to 14 s against their 20 s limit at load 12–16. Raise them to 60 s like the rest if they start to flake.

## Current milestone — sustained wave and physical wipeout — `Done for prototype`

- [x] Replace the playable 20 m finish with an open ended ride while retaining the earlier finite-wave path for regression tests.
- [x] Move the shared water grid forward with its swell and replenish the same simulated crest as it propagates; keep the board driven only by sampled water forces.
- [x] Detach the surfer at wipeout and integrate gravity, water-relative drag, buoyancy, and surface contact while the wave and board continue.
- [x] Validate a 140 m default clean ride, 60 m rides on both alternate spots and three more seeds, a 40 m plus carved demo, reset, wipeout immersion, and moving water/scenery in the desktop browser. The browser remained at about 120 FPS in the observed runs.

## Current milestone — physics-driven wave catch

### P0 · Research the interactive-water foundation — `Done`

- [x] Inspect/adapt the Three.js compute-water example as a prototype reference, not as a complete surfing model.
  - [x] Prototype an evolving height field that contains the generated incoming wave as part of its simulation state from the start.
  - [x] Establish one authoritative water state sampled by rendering and board physics.
  - [x] Select a deterministic CPU reference field and retain WebGL 2 for rendering; WebGPU compute remains a future option pending synchronized board sampling and compatibility tests.
  - [x] Verify deterministic fixed-step evolution, board sampling/synchronization, and bounded field values in automated tests; profile browser performance locally.
  - [x] Record selected architecture and limitations in [ADR 0002](docs/adr/0002-interactive-water-field.md).

### P0 · Couple the board to the simulated wave — `Done`

- [x] Derive local water motion from the evolving wave state; the incoming wave is part of the simulated field, not a visual overlay.
  - [x] Apply support/buoyancy and water-relative drag using samples from the shared water field.
  - [x] Make post-pop-up forward travel emerge from water-relative forces and timing—no scripted ride translation or animation.
  - [x] Add modest equal-and-opposite hull momentum feedback; defer detailed paddle/hand fluid interaction.
  - [x] Keep board support bounded with a penetration assertion.

### P0 · Make wave catching an explicit timed action — `Done`

- [x] Keep the run flow `ready → paddling → pop-up window → riding → terminal outcome`.
  - [x] Paddle builds entry speed; local wave/board behavior gates readiness.
  - [x] On-screen **Get Up** and Enter are enabled only when speed and local wave conditions are suitable.
  - [x] Ignore premature attempts; missed and wipeout outcomes are represented.
  - [x] Accepted input stands the rider; tests sustain water-driven travel with paddle released.
  - [x] Preserve Replay (same seed/settings) and New Wave (new seed).

### P0 · Verify the physics and gameplay together — `Done`

- [x] Add deterministic tests for water evolution, incoming-wave propagation, board/water coupling, and the pop-up transition.
  - [x] Confirm paddle input accelerates the board and on still water release permits drag to reduce paddle-generated speed.
  - [x] Confirm that after entering `riding`, no paddle input yields at least 3 seconds and >0.8 m forward travel through simulated water forces.
  - [x] Rendered surface and board-contact samples query the same field instance.
  - [x] Expose local water speed, board-relative speed, crest distance, and pop-up eligibility in the HUD.
  - [x] Profile browser frame rate: the current Codex in-app browser reports about 115–120 FPS during desktop play and 120 FPS in the checked mobile view on this machine. This is a local observation, not a device-wide guarantee.
  - [x] Review desktop and narrow mobile play, Replay, New Wave, profile view, and tuning controls in the browser; no browser console errors observed.
  - [x] Center the mobile follow camera and provide hold-to-paddle and steer touch buttons alongside the existing Get Up action.
  - [x] Obtain an independent agent audit of the physics and presentation changes; resolve all four concrete findings from the audit.

## Current extension — advanced playable ride and peeling break

### P0 · Make the ride physically sustained and steerable — `Done`

- [x] Project four board-contact water pressures along local surface normals and use direction-dependent water drag; no scripted ride translation.
- [x] Catch on the approaching face. With paddle released, a default no-steer ride reaches 20 m on seeds 1–12 in automated simulation.
- [x] Make rail/fin side force turn the board path, not only its heading. Steering can carve across the face or destabilize the board.
- [x] Check extreme settings with deterministic runs and expose specific terminal failure reasons; continue subjective steering feel tuning with player feedback.

### P0 · Add a shared-field peeling break and readable maneuvers — `Done`

- [x] Advance a deterministic peel front along the crest. Break strength follows local slope and crest proximity, dissipates coherent water motion, and raises board instability.
- [x] Render a synchronized foam lip and board wake/spray from the same water field; expose break, balance, FLOW, and physics-detected CARVE/SNAP feedback.
- [x] Refine the foam/lip appearance and verify synchronized rendering, maneuver diagnostics, and frame rate in desktop and mobile browser runs. A full overturning barrel remains outside the shared height-field representation.

### P1 · Finish the playable prototype presentation — `Done`

- [x] Add a coastline, sunset light, and a one-time captured sky/coastline environment map for restrained water reflections while preserving one physics authority. Narrow mobile view uses centered ride framing.

## Repository state

- [x] The analytic baseline is `1fe7ecc`; the playable prototype and physics increments are committed on local `main`. `origin/main` is still at the baseline.

## Next milestone — physics fidelity and learning tools

### P1 · Depth-varying surf shelf — `Done for prototype`

- [x] Add a gentle, configurable seabed shelf to the shared field and evolve elevation through depth-weighted horizontal fluxes.
- [x] Show the same shelf in the underwater seabed view and expose it as a Wave Lab condition.
- [x] Check still-water balance, wave slowdown over the shelf, bounded energy, the steepest setting, and catch/playability across surf spots. Breaking onset remains an authored peel.

### P1 · Couple spilling strength to local depth — `Done for prototype`

- [x] Let the existing local-slope break respond more strongly in shallower water while retaining the deterministic lateral peel.
- [x] Verify that the effect comes from the shared field, remains bounded, and preserves catch/playability and browser performance. Windy Reef still completes in the local browser at 120 FPS.

### P1 · Account for breaker energy loss — `Done for prototype`

- [x] Express the break's horizontal-flow energy loss in the same relative units as total field energy.
- [x] Verify nonnegative, cumulative loss and reset behavior without changing wave or board trajectories; compare the same seeded field with and without breaker damping.

### P1 · Improve model fidelity and explain failures — `Done for prototype`

- [x] Record terminal catch/ride outcomes, failure reasons, settings, timing, and peak measurements in a bounded local run history visible in the Wave Lab.
- [x] Investigate fuller two-way coupling and force directions in [the calibration note](docs/research/surf-physics-calibration.md); feed contact pressure and vertical hull displacement back into the water, use water-relative planing/fin forces, and track wave energy. Coefficients remain tuned for play.
- [x] Check qualitative relationships from [the calibration note](docs/research/surf-physics-calibration.md): a faster configured wave propagates farther, breaking removes field energy, and board turning weakens out of water. Maintain gameplay-tuned coefficients; no comparable measured board and wave dataset is available for quantitative calibration.

## Future scope

### P1 · Upgrade the surfer and board models — `Done for prototype`

- [x] Replace the stick-like rider with two-segment arms and legs, visible hands and feet, a shaped wetsuit torso/pelvis, neck, face, hair, and a readable head silhouette.
- [x] Blend prone paddling into a bent-knee standing stance, animate alternating paddle strokes, preserve physics-driven lean, and move the rider into a fall pose on wipeout.
- [x] Refine the shortboard outline, colored deck/rails/nose, traction pad, deck stripes, and swept fins. Bring chase/profile cameras closer so the model is readable; verify desktop and narrow browser presentation at local 120 FPS.

### P2 · Breaking-wave behavior — `Done for this height-field prototype`

- [x] Investigate breaking, spilling/reforming waves, whitewater, and overturning/overhang representations in [the decision note](docs/research/breaking-wave-representations.md).
- [x] Keep the height field as bulk-water authority; add a bounded curling lip, decaying whitewater, and pooled spray. The lip now has a separate 3D parcel/collision authority described in [ADR 0003](docs/adr/0003-plunging-sheet-collision.md).

### P2 · Board, rider, and environment fidelity — `Done for prototype`

- [x] Add tapered shortboard geometry with rocker and fins, water-relative fin grip, and rider lean that affects board roll. These are lightweight gameplay approximations.
- [x] Feed cross-current and wind into the shared water field; add Training Beach, Glassy Point, and Windy Reef condition presets with distinct coastline palettes and tested catch paths.

### P2 · Water appearance and underwater view — `Done for prototype`

- [x] Compare reflection/refraction, caustic, and underwater approaches in [the water appearance decision note](docs/research/water-appearance.md); retain the deformed shared-field surface instead of a flat-water add-on.
- [x] Add sun height and direction controls, sky color changes, a recaptured sky/coast environment map, and moving field-derived surface normals for view-dependent reflections. A live planar rider mirror and physical refraction remain outside this prototype.
- [x] Add a below-surface camera mode, wave-height-based waterline detection, blue-green distance fog, and decorative seabed caustic bands tied to the shared wave. The bands are a visual approximation, not refracted light transport.

### Further work after this prototype — `Ready`

- [ ] Gather comparable measured board/fin and wave data if quantitative hydrodynamic validation becomes a goal.
- [x] Prototype a separate 3D plunging-water and collision authority, rendered from the same evolving parcels that contact the rider/board. Keep the height field as bulk-water authority and document the hybrid limit in [ADR 0003](docs/adr/0003-plunging-sheet-collision.md).
- [ ] Decide whether a full interactive barrel needs volumetric water and air flow beyond this bounded sheet.
- [ ] Evaluate a low-resolution live scene reflection pass and physical-looking refraction only if playtesting shows a clear visual benefit and frame-time headroom.

## Existing baseline — `Done`

- [x] Browser-based Three.js prototype with deterministic analytic wave, custom water mesh, floating board, paddle/steer controls, tuning, replay/new wave, and diagnostics.
- [x] Automated baseline tests and production build.
- [x] The analytic baseline and playable prototype are recorded in separate local commits.

## Design references

- [Three.js WebGPU compute-water example](https://github.com/mrdoob/three.js/blob/master/examples/webgpu_compute_water.html): GPU-updated height field and floating-object response are useful concepts; this is not a surfboard hydrodynamics solution.
- [Three.js ocean shader example](https://threejs.org/examples/webgl_shaders_ocean): future reference for sun position, sky illumination, and reflective water appearance; not a source for wave or board physics.
- [ThreeJS-water (Martin Renou)](https://github.com/martinRenou/threejs-water): Three.js implementation of Evan Wallace's WebGL water demo; study its surface disturbances, reflection/refraction, and underwater caustics. Its pool-demo assumptions are references to evaluate, not a ready-made open-surf physics model.
- [ThreeJS-water live demo](https://martinrenou.github.io/threejs-water): visual reference for surface and underwater behavior.
- [Surfing-game video reference (embedded video only)](https://www.reddit.com/r/Unity3D/comments/1ro4tyq/new_surfing_game_made_in_unity/): use the video as a visual/gameplay reference for the intended surfing experience. Do not use the surrounding Reddit post, comments, or discussion as design or technical requirements. Unity-specific implementation details are not applicable; translate only relevant observed player-facing qualities to our browser/Three.js game.
- [Three.js WebGPURenderer guide](https://threejs.org/manual/pages/webgpurenderer): renderer backend/fallback guidance; the compute-water path still requires a compatibility and coupling prototype.

## Source documents

- [Requirements](docs/REQUIREMENTS.md) define target behavior and acceptance.
- [Technical plan](docs/PLAN.md) describes the architecture direction and implementation sequence.
- [Implementation tasks](docs/IMPLEMENTATION_TASKS.md) track delivered baseline and execution slices.
- [Wayfinder map](docs/wayfinder/MAP.md) records decisions and unresolved investigations.
- [Domain glossary](CONTEXT.md) and [ADRs](docs/adr/) record shared language and durable decisions.
