# Wave Lab and Surf School (L1–L3): specification

Status: **agreed** in a grilling session with the user on 2026-09-27 (Q1–Q28). The user accepted every recommendation. This is the spec the L1–L3 plans argue from.

## What it is

Two modes replace the old Wave Lab:

- **Wave Lab (L1)** is a place to look at waves. It has every physical wave setting, a camera that flies anywhere (up close, underwater, riding along a breaking crest), and pause, slow motion and frame-step. There is no rider and nothing to play.
- **Surf School (L2)** teaches the surfing motions. The player starts already placed on a good wave, in the right spot for the motion. A short explanation comes first, then a goal measured from the physics. Nine lessons are followed by Free Practice on the same wave.

**L3** deletes the legacy (pre-physics) wave code once nothing reaches it.

## Principles

1. **The physics stays as it is.** Both modes run the same surf zone as Surf. The school's wave is a real sea, rebuilt the same way each time, never a scripted one; wave-driven transport (CONTEXT.md) holds in lessons too.
2. **Built beside the riding work.** Another session is fixing short rides (the reference wave, pocket reflex, animation; see the riding requirements). L1–L2 read the ride's snapshot and status only. Rider internals change in one place: the new placement.
3. **Player-facing text lives in `src/ui/strings.ts`**, in English, with native CSS and no frameworks. Anything shown only with `DEV_TOOLS` on (solver, compute, the raw physics readout, the sound check, "provisional wave") may stay out of the strings.
4. **Performance is measured, never a gate** (M4 Pro is the reference; an M1 Air running slowly is acceptable).

## L1 · Wave Lab

### Retiring the old lab

- The old lab's markup in `index.html` goes: the top bar, hero copy, telemetry, tuning panel, run history, control hint and bottom actions. The touch controls stay, because Surf uses them.
- The legacy mode leaves `main.ts`: `startRun`, the legacy frame loop, the tuning panel's bindings, the legacy spot presets, the run history and the legacy readout. The page never runs the legacy wave again, and the modules only it used are deleted in L3.
- **Ride telemetry** is already a dev overlay on Surf rides (Settings → Show telemetry, `DEV_TOOLS` only). Nothing moves there; the lab's copy just goes.
- **Run history** retires (the Logbook covers rides).
- **URL flags:**
  - `?physical` now starts a Surf ride straight away (Surf's default spot and conditions).
  - `?demo` starts the same ride driven by the dev autopilot (`src/dev/Autopilot.ts`).
  - `?record` and `?waterSheet` keep working. They open on a bare stage (no menu, no lab panel) instead of the old lab.
- **Profile and Below** become camera jump points in the new lab.

### Where it sits

- The **Wave Lab** tile is always on the main menu, whatever `DEV_TOOLS` says.
- Choosing it shows the loading card while the lab's sea spins up, then the lab. The lab starts from the settings it had last time (saved in the browser, separately from Surf's conditions). The first visit gets the Canyon on the Practice swell at midday.
- **Esc or Start** opens the lab's pause menu: Resume, Settings (the game's), the sound toggle and Quit to menu. The sea stays paused behind it.

### Settings panel

A panel opened from a toolbar button; it is closed by default so it never covers the wave.

| Group | Settings | Applies |
|---|---|---|
| Break | Spot: Beach, Point, Reef, Canyon | on Apply |
| Swell | Source: Buoy (Hs 0.3–3 m, Tp 6–18 s, spread 0–1), Storm (wind 8–30 m/s, fetch 50–2000 km, duration 3–96 h, distance 0–10 000 km, with the derived swell shown), or Practice (the steady groundswell, with its note); direction −40° to 40° (fixed by Practice) | on Apply |
| Conditions | Tide −1 to 1 m; local wind −12 (offshore) to 12 (onshore) m/s | on Apply |
| Light | Dawn / Midday / Sunset presets, plus sun height and sun direction sliders | at once |
| Water | Look: Classic or Rich; the lab's own choice while in the lab (the graphics setting is untouched) | at once |
| Dev tools only | Solver (Boussinesq or shallow water), compute (GPU when available, or CPU only), the physics readout rows, the sound check | solver and compute on Apply |

- Changes that rebuild the sea wait for **Apply**; a "changes waiting" note shows until then.
- **New sea** rebuilds with the same settings and a new seed.
- Every setting, the time of day and the water look are remembered for the next visit.

### Camera

- **Free flight.** The camera has a position and a look direction (yaw, pitch with pitch clamped to ±85°). Movement eases in and out.
  - Base speed is 6 m/s, ×4 with Shift (or the fast button). The wheel scales the base speed between 1 and 40 m/s.
  - The camera stays inside the simulated window along shore, between the offshore boundary and the beach, above the seabed plus 0.3 m and below 120 m.
  - It can go underwater. The scene's existing underwater look switches on below the surface.
- **Jump points:** 1 Overview, 2 Profile, 3 Below, 4 Cinematic.
  - Overview, Profile and Below put the camera at that view's pose (as today's spectator views place it) and hand control back.
  - Cinematic plays the menu's slow sweep until any move or look input.
- **Follow (F):** locks onto the breaking crest nearest the centre of the view.
  - The camera keeps its offset from a tracked crest point as that point moves shoreward and along the peel. Moving and looking change the offset. F again releases.
  - With nothing breaking near the view, it follows the nearest crest until it breaks.
  - The tracker works on the snapshot's surface (height and foam). From the point where the view ray meets the water:
    1. find the crest (the local surface maximum along the waves' travel, within half a wavelength);
    2. each frame, look for it again near where it should have moved;
    3. along shore, drift toward the breaking edge: where the foam starts along the crest.
- **Controls:**
  - **Keyboard and mouse:**
    - WASD to move, Q/E to go down/up, Shift to go fast;
    - drag (either button) to look, the wheel for speed;
    - F to follow, 1–4 for the jump points, H to hide the whole interface;
    - Space to pause or resume the sea, `.` to step one frame while paused;
    - `[` / `]` for slower or faster slow motion.
    - There is no rewind, so `,` stays free.
  - **Gamepad:**
    - left stick moves, right stick looks, LT/RT go down/up, LB is fast;
    - A pauses or resumes, RB steps a frame, Y follows, X hides the interface, the d-pad picks jump points;
    - Start opens the pause menu.
    - The Steam Controller joins through the same axes once C1 (`claude/steam-controller`) merges.
  - **Touch:** drag to look, a virtual stick (bottom left) to move, up/down buttons, and the toolbar for the rest.

### Time

- **Pause** stops the sea (no steps) while the camera still flies and the scene still draws. Sounds pause.
- **Slow motion** runs 0.1, 0.25, 0.5 or 1× (the toolbar, or `[` `]`).
- **Frame-step** takes one 1/60 s step while paused.
- There is no rewind.

### Info card

A small collapsible card about the wave under the centre of the view (where the view ray meets the water; looking at the sky, the nearest wave ahead of the camera). It is written for players, for example "Plunging · peels left at 52° · good for surfing". It shows:

- the face height, from crest to trough, in the player's units;
- the swell's period;
- the breaker type (spilling, plunging or surging);
- the peel angle, and whether the wave is surfable or closes out;
- how much of the surf zone is breaking;
- when the next set arrives.

H hides it with the rest of the interface. With `DEV_TOOLS` on, the full physics readout sits under it.

### Sound

The sea is heard from the camera (already the listener). Flying into a breaking lip makes the roar grow; going underwater muffles it (as today).

## L2 · Surf School

### Screens

- **Main menu:** Surf · Surf School · Wave Lab · Multiplayer · Logbook · Settings. Surf School carries a "Start here" badge until lesson 1 is passed.
- **The School screen** lists the nine lessons, each with its number, title, one-line blurb and a checkmark once passed. Free Practice comes after them, with a choice of start: Standing in the pocket, or Prone, ready to catch. All lessons are open from the start.
- **A lesson:**
  1. The loading card shows while the lesson's sea is built.
  2. The **explanation card** appears with the sea paused behind it at the lesson's moment. It has a few sentences, a small diagram and the keys for the player's current device (keyboard, gamepad or touch, from their bindings), and ends with Start (Enter or A).
  3. **The attempt.** The ride HUD shows, with the balance meter always on. A live prompt says what to do now (for example "Lean now — hold ←"), with the goal's progress.
  4. **Passing** shows a short card: Next lesson, Again, or Lessons.
  5. **Failing** (a fall, or the ride ending without the goal): one line gives the cause (the existing ride-end labels) and the lesson's tip. The wave restarts after about 2 s, and R restarts it at once. After three misses in a row the explanation card comes back.
- **Pause menu** in a lesson:
  - Resume, Restart, and Show explanation;
  - Slow motion 0.5× (off by default);
  - Camera, Settings, the sound toggle, Lessons and Quit to menu.
- **The camera** starts in the lesson's suggested view, and C still cycles.
- **Logbook:** lesson attempts and Free Practice rides never go in the Logbook, and nothing is scored. Surf's one-time hints stay quiet in the school, because the lessons teach the same things.

### The lessons

The thresholds are **provisional** until the reference wave is recorded (see *The lesson wave*).

| # | Lesson | Starts | View | What it teaches | Passed when |
|---|---|---|---|---|---|
| 1 | Lean | standing in the pocket | Behind | Lean onto a rail to turn: hold ← or → (the stick) | the heading swings at least 20° each way while standing |
| 2 | Trim | standing in the pocket | Side | Weight forward to go faster, back to slow down (W/S, the trim stick) | speed rises 0.5 m/s with weight forward held 1 s, then falls 0.5 m/s with weight back held 1 s |
| 3 | Crouch and extend | standing in the pocket | Side | Crouch low in the turn, extend over the top; pumping gains speed on a curved line (Shift) | three crouch–extend cycles within 8 s, ending no slower than they began |
| 4 | Bottom turn | standing in the pocket | Front | Drop low, lean hard and crouch to turn back up the face | the ride analysis detects a bottom turn |
| 5 | Top turn | standing in the pocket | Front | Up near the lip, turn back down the face | a top turn (or a snap) is detected |
| 6 | Hand and stall | standing in the pocket | Behind | The wave-side hand in the face slows you so the curl catches up (E) | hand held 1 s while speed falls 1 m/s and the crest closes in by 2 m |
| 7 | Stay in the pocket | standing in the pocket | Behind | Stay high on the face beside the breaking part | 5 s in the pocket in all (face ≥ 0.4, crest breaking ≥ 0.3: the ride analysis's pocket) |
| 8 | Pop-up | prone, the wave already carrying the board | Front | When the board is carried, pop up (Enter) | standing, and still up 2 s later |
| 9 | Paddle and catch | prone, waiting where the wave will break | Front | Paddle as the wave arrives (Space), pop up on the cue | caught and standing for 2 s |

Each lesson has an explanation, a tip for misses and a diagram. Passing Lean, Trim, Crouch and extend, or Hand and stall retires the matching one-time hint in Surf rides (`HintBook`).

### Assists

- The **balance meter** is on throughout the school, whatever its setting says.
- **Slow motion** at 0.5× is a pause-menu toggle, off by default.
- **Falls are real.**
- The **pocket reflex** (built by the riding work) is off in every lesson. In Free Practice it follows its setting ("on in Practice").

### Free Practice

The same wave, started standing in the pocket or prone and ready to catch (the waiting placement). The start can be picked on entry and switched in the pause menu.

- The wave restarts about 2 s after a ride ends, and R restarts it at any time.
- The pause menu adds a **How to** list that opens any lesson's explanation card.
- There are no goals.

### Progress

- Passed lessons are kept in the browser (`breakline.school.v1`).
- Storage that fails leaves progress for the session only, as the hint book does.

### The lesson wave

*Amended while building L2 (2026-09-27): the spec first had each entry warm-start a fresh sea timed to the moment and guessed the placements from the crest's shape. A warm start does not reproduce a long-running sea's waves (N1's drift report), and on this sea the shape guesses found no breaking edge. The recorded ride below replaced both.*

- **What it is.** One real ride by the autopilot on the Canyon's Practice sea, recorded at three moments of the same wave:
  - **waiting:** a second before it set off paddling;
  - **caught:** at the pop-up cue;
  - **pocket:** after it stood.

  Each moment is the sea's full state, shipped as an asset (`public/lessons/canyon-s{stage}-{start}.sea`, about 0.8 MB each, deflated). Only the start in use is loaded. Beside the states the record keeps:
  - the rider's placement at each moment (position, heading, speed along the heading on top of the water's own flow, standing or prone);
  - the sea it was recorded on (spot, seed, the swell's values, 64 components), so a later change to the Practice swell cannot break it.
- **Two recordings.** There is one record per solver stage (Boussinesq, and shallow water for machines whose benchmark picked it). The school uses the one matching the graphics settings.
- **Same wave every time.**
  - A lesson's sea is built from the recording with no spin-up, the state taken over as an online join takes a handed-over sea.
  - Every restart restores the start's state **in place**: a `restore` request to the running surf zone imports it and, on the GPU, re-uploads the breaking and predictor fields. It then places the rider, so a retry costs a frame, not a rebuild.
- **Placing the rider** (the one new piece of rider code). `RideSession.place` puts the board on the surface at a point, along a heading, moving with the water plus a speed along the heading:
  - standing places a standing rider (as the carve lab does);
  - prone places a prone one.
  - The runner's ride analysis and counters restart, as a retry does.
  - A ride request field, `place`, carries it (beside `retry` and `spawnAt`).
- **Finding it.** `npm run lesson:wave` has the autopilot surf the sea from the lineup on the CPU, keeping each ride's moments. The pocket is kept at 0.5, 1 and 1.5 s after standing.
  - The five longest rides are replayed from their moments as a new player would play them: no input from the pocket; from caught, a pop-up on the cue and nothing more; from waiting, the autopilot paddles, pops up and rides.
  - The rider's own balance and posture are not recorded, so a replay can differ from the ride.
  - The best total is written, with the pocket moment a still rider rides longest. `docs/research/lesson-wave.md` lists every ride and check.
- **Provisional for now.** Today's records come from the current Canyon Practice sea, and the lessons' thresholds are provisional (the lean's swing is 8° until the turn-rate fix). When the reference wave merges (riding step 3), the records are regenerated and the thresholds tuned. With `DEV_TOOLS` on, the school shows "Provisional wave" until then.
- **The same-wave check.** Two restores must give the same sea:
  - on the CPU, identical (a unit test);
  - on the GPU, the breaking within 1 m and the timing within 0.2 s (the N1 gate's numbers).

  If that fails, work stops and the options go to the user.

## L3 · Legacy removal

The legacy wave's own modules and tests are deleted once L1 leaves them unreached: the legacy water field and plunging sheet, its board physics, surface source, camera rig, surfer, wake, spray, seabed, HUD and run history, and the scripts built only on them. The compiler and the suite decide the exact list. The physical ride's shared pieces (`BoardBody`, the `SurfWater` seam) stay. The docs that describe the legacy wave as current are updated.

## Delivery

- **Order:**
  1. PR 1, L1 Wave Lab, on `claude/wave-lab`.
  2. PR 2, L2 Surf School, on `claude/surf-school` from main after PR 1.
  3. PR 3, L3 legacy removal.
- **How each PR lands:** it is planned, built with tests, checked in the browser, recorded in the ROADMAP and CONTEXT.md (Wave Lab, Surf School, lesson wave, placement, Follow), and merged to main without check-ins.
- **Playtest:** the user playtests at the end.
- **The one stop:** the same-wave check above.

## Testing

- **Unit tests:**
  - L1: free-flight motion and bounds, jump-point poses, the crest tracker on synthetic surfaces, the lab's settings model, what needs Apply, saving and migration, and the info card's model.
  - L2: lesson goals on recorded status frames, school progress, the lesson flow (card, attempt, pass, miss, three misses, restart), `RideSession.place`, and restore reproducing the sea (CPU).
  - L3: nothing new; the suite stays green.
- **Browser checks:**
  - the lab: fly, follow, the jump points, pause, step, slow motion, Apply, New sea, hide the interface, the info card, underwater, the gamepad;
  - the school: every lesson's start, a pass, a miss and its restart, the three-miss card, Free Practice, and the balance meter;
  - the menu with `DEV_TOOLS` off.

## Later

These are out of scope for L1–L3:

- a "Watch it first" autopilot demo in lessons (once the autopilot rides well);
- rewind in the lab;
- a scale figure in the lab;
- Regular/Goofy and the pocket reflex (the riding work);
- regenerating the lesson wave on the reference wave (the riding work's step 3 is the trigger).
