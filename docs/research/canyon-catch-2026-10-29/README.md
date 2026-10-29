# Catching the Canyon's waves at every size (canyon-catch, 2026-10-29)

The ask (the coordinator, the owner's queue after #163): from the default start (the up peak), at Small, Medium and Big, a
player who paddles and sprints at the right moment should be picked up, not left on the crest or caught by the white
water. Measure it honestly with headless riders (no SurfZoneRunner rider sessions), find the causes, fix them
physically, check the reef's take-off, and keep the other spots byte-identical unless a change is global.

Branch `claude/canyon-catch` from `main` at `4a634fa6`.

**In short.**
- **Honestly measured, a well-timed player catches a third to a half of the set waves from the Canyon's default start.**
  - Small 33 %, Medium 25 %, Big 50 % of the sets (2 seeds, 8–10 sets a size), with a sprint 2 s before the crest and
    the pop-up at the game's cue.
  - The earlier catch model's 90 / 80 / 86 % was a point mass that never had to stand up.
  - Early and late timing do no better (early 44 / 25 / 20 %, late 11 / 25 / 30 %).
- **Two failures, by size, account for almost all the misses:**
  - **Small:** the gentle faces leave the rider behind. The pop-ups land, but on 11–14° faces a standing board cannot
    keep a 4.3–5 m/s crest's pace, and the wave goes on.
  - **Big (and the sets at the Point and the Wave Pool):** riders fall during the pop-up itself on 18–20° faces. This
    is the owner's "too steep to catch when big". The board loses the body while it pushes up ("lost board").
  - **Medium** has both.
- **One physical fault found and fixed, the sprint braking down a face:**
  - The hand sweeps back at about 2.6–2.9 m/s, so once the board outran it, the palm met the water head-on.
  - Down a 12° face the sprint settled at 3.0 m/s, slower than cruising (3.9).
  - Now a hand the board outruns slices in edge-on (`FEATHER_DRAG`), and the sprint keeps the face's speed (4.1 m/s).
  - Flat water is unchanged (cruise 1.6, sprint 2.08 m/s, the sprint's blade refitted).
  - It lights the cue on more waves, but within these samples it does not raise the set catches; the gain shows only
    in all-wave catches at Big (11 against 7 of 29) and the Point (3–4 against 1 of 9).
  - It is global: every spot's rider. `?stroke=old` gives the old stroke back.
- **Not changed, with the reasons measured:**
  - **The starts:** moving them in a few metres, within the one-in-ten breaking rule, changes the depth by about 0.1 m on
    the bar's 1:50 and did not change the catches.
  - **The cue:** stricter and looser candidate rules, and waiting after it, did no better.
  - The reef stays as it is. From its own take-off, 11 m out at Medium, its plunging waves passed every paddler (the cue
    never lit in 9 of 11).
- **What would raise the catches is the pop-up on a moving face, which needs its own study** (section 4). The probe and
  the traces for it are ready here.

## 1. How it was measured

`catch-probe.ts`:
- **The sea:** the game's own Canyon sea at a size (stage 2, 64 components) on the CPU, stepped at the worker's 1/60 s.
- **The riders:** each wave crossing a point 36 m seaward of the start gets a set of headless riders (`RideSession`, as
  the game's), placed prone at rest at the start, nose to the beach.
  - They paddle straight in and read the water without pushing it, so many share one sea.
- **The scripts:** each rider sprints once the crest is a given time away (the gauge's distance to the crest over the
  closing speed) and pops up at the game's cue (the HUD's: the rider's planing cue or `inTakeOffWindow`).
  - **good:** sprint 2 s out.
  - **early:** sprint 4 s out.
  - **late:** sprint 0.8 s out.
  - **lift:** good, and it also pops when the crest is about to pass under it with no cue (as a player might, feeling
    the board lifted).
  - **/old:** the same with the stroke before this branch.
- **Each trial ends as one of:**
  - **rode:** standing at least 2 s on the face ahead of the crest at 0.6 of its speed or more;
  - **no cue:** left lying down;
  - **fell popping up:** off the board before standing;
  - **left on the crest:** stood, but the wave went on;
  - **white water:** knocked off where the crest was breaking.
- **The sets** are each run's top third of the waves by their face at the start (1.05–1.14 m at Small, 1.67–2.0 m at
  Medium, 2.29–2.69 m at Big).
- **Two seeds × 12 periods a size:** 24, 23 and 29 waves.

## 2. Catching from the default start (seeds 1 and 2 pooled; `runs/`, `catch-pool.mjs`)

Each cell gives: rode / no cue / fell popping up / left on the crest / white water. The last column, over the rides, gives
the pop after the crest passed the start (s); the face under the board; how far up the face.

**Small** (start 6 m out, 2.06 m deep, 103 m from the waterline):

| script | sets | all waves | rides: pop; face; up |
|---|---|---|---|
| good | 3 of 9 (33 %) / 1 / 1 / 4 / 0 | 6 of 24 (25 %) / 9 / 1 / 8 / 0 | 2.2 s; 15°; 0.74 |
| early | 4 of 9 (44 %) / 0 / 1 / 4 / 0 | 6 of 24 (25 %) / 8 / 2 / 8 / 0 | 2.3 s; 15°; 0.68 |
| late | 1 of 9 (11 %) / 1 / 1 / 6 / 0 | 4 of 24 (17 %) / 9 / 1 / 10 / 0 | 2.0 s; 16°; 0.72 |
| lift | 3 of 9 (33 %) / 0 / 1 / 5 / 0 | 6 of 24 (25 %) / 4 / 1 / 13 / 0 | |
| good/old | 3 of 9 (33 %) / 1 / 0 / 5 / 0 | 6 of 24 (25 %) / 10 / 0 / 8 / 0 | |
| early/old | 5 of 9 (56 %) / 1 / 0 / 2 / 1 | 7 of 24 (29 %) / 9 / 1 / 6 / 1 | |

**Medium** (start 9 m out, 2.68 m deep, 134 m):

| script | sets | all waves | rides: pop; face; up |
|---|---|---|---|
| good | 2 of 8 (25 %) / 1 / 4 / 1 / 0 | 4 of 23 (17 %) / 8 / 5 / 6 / 0 | 1.7 s; 15°; 0.84 |
| early | 2 of 8 (25 %) / 1 / 1 / 4 / 0 | 6 of 23 (26 %) / 7 / 2 / 8 / 0 | 1.5 s; 17°; 0.73 |
| late | 2 of 8 (25 %) / 1 / 3 / 2 / 0 | 5 of 23 (22 %) / 8 / 3 / 7 / 0 | 1.5 s; 16°; 0.76 |
| lift | 2 of 8 (25 %) / 0 / 4 / 2 / 0 | 4 of 23 (17 %) / 3 / 5 / 11 / 0 | |
| good/old | 2 of 8 (25 %) / 3 / 1 / 2 / 0 | 5 of 23 (22 %) / 13 / 1 / 4 / 0 | |
| early/old | 3 of 8 (38 %) / 1 / 2 / 2 / 0 | 5 of 23 (22 %) / 10 / 2 / 6 / 0 | |

**Big** (start 3 m out, 3.67 m deep, 183.5 m):

| script | sets | all waves | rides: pop; face; up |
|---|---|---|---|
| good | 5 of 10 (50 %) / 1 / 3 / 1 / 0 | 11 of 29 (38 %) / 11 / 5 / 2 / 0 | 0.8 s; 16°; 0.78 |
| early | 2 of 10 (20 %) / 0 / 5 / 3 / 0 | 9 of 29 (31 %) / 9 / 6 / 5 / 0 | 0.9 s; 16°; 0.74 |
| late | 3 of 10 (30 %) / 0 / 5 / 2 / 0 | 7 of 29 (24 %) / 10 / 9 / 3 / 0 | 1.1 s; 14°; 0.81 |
| lift | 5 of 10 (50 %) / 0 / 3 / 2 / 0 | 11 of 29 (38 %) / 0 / 5 / 13 / 0 | |
| good/old | 4 of 10 (40 %) / 2 / 3 / 1 / 0 | 7 of 29 (24 %) / 15 / 5 / 2 / 0 | |
| early/old | 4 of 10 (40 %) / 1 / 3 / 2 / 0 | 10 of 29 (34 %) / 11 / 5 / 3 / 0 | |

**What the numbers say:**

- **The catch, the stand and the face.**
  - **The catch** (the cue) comes 0.8–2.2 s after the crest has passed the start: the rider has paddled in 4–10 m meanwhile.
  - **From the catch to standing:** 1.2 s, the pop-up's own time (0.72 s pushing up and 0.48 s bringing the feet down;
    Borgonovo-Santos et al. 2021).
  - **The faces ridden** are 15–17° under the board at the pop, 0.7–0.84 of the way up.
  - **The misses:**
    - those left on the crest popped on 11–14° faces, or higher than 0.85 up;
    - those that fell popping up were on 18–20° faces.
- **Timing matters less than the face.**
  - The sprint 0.8 s out ("late") does worst everywhere.
  - Between 2 and 4 s the face the wave brings decides it.
  - White water almost never reaches a paddler from these starts: it ended 1 of the 608 trials (76 waves × 8 scripts).
    The start rule does what it was set for.
- **Seed to seed** a size's set catches move by one or two waves in four or five, so differences under about 20 points
  are noise.

### Two failures

**Left on the crest (Small, half of Medium's).**
- A trace of a Small set (`catch-probe.ts --trace 2:good`):
  - The rider sprinted from 2 s out, but the trough before the face carried the water seaward, so the board was at
    0.3–0.5 m/s when the face reached it.
  - The face, 12–18° on its steep middle, took it to 3.3 m/s against a 4.3 m/s crest.
  - The cue lit 0.88 up, where the face is flatter (12°).
  - Through the 1.2 s pop-up the crest gained 1.1 m. The rider stood on 2–4° at the crest, which passed, and the board
    slid down its back.
- **On still faces** (`face-terminal.ts`, `face-popup.ts`; `runs/still-faces.txt`):
  - prone, the board settles at 3.9 m/s on 10°, 4.5 on 12° and 5.2 on 14°;
  - standing, it slows on 15° (to 1.9 m/s) and accelerates on 18° (to 8.6 m/s).
- A face has to stay steeper than about 15–16° under a standing board for it to keep a 4.3–5 m/s crest's pace. Small's
  1 m faces are steeper than that only on their middle third. That is physics, not a rule: a short board on a gentle
  1 m beach wave needs the steepest part of the peak, and a longer board would catch them.

**Fell popping up (Big's sets, and the Point's and the Pool's).**
- A trace of a Big set (`--trace 6:good`):
  - The pop came 2.5 m ahead of the crest, 0.79 up a 20° face, at 4.9 m/s.
  - Through the push the board's vertical speed swung between +0.9 and −0.5 m/s within a few hundredths of a second as
    it rode over the face's curvature.
  - The contact the push needed went beyond what the hands on the rails can give (`projectHold`): flight.
  - The body drifted more than 0.25 m off its pose, and the rider let go ("lost board") 0.6 s into the pop-up.
- On still faces of 18–25°, rising or not, the same pop-up stands up every time. So the fault is in how the push meets a
  curved, moving face, not in the slope.
- **Screens that did not help:**
  - a stronger hold while pushing up (0.6 → 1.0 and 1.5 body weights, the Pool: the same falls);
  - the surface the bodies feel from 0.5 m nodes instead of 1 m (Big: worse, 5 of 5 sets fell);
  - the weight forward from the pop (Big: the same).
- **Elsewhere:** at the Point (Medium, one seed) all 3 sets fell popping up, either stroke; at the Pool 2 of 3 did, and
  6 of 8 waves.
- This is the take-off's main gap, game-wide, and it matches the owner's "the wave is too steep for the surfer to catch
  it if too big".

## 3. What this branch changes

**A hand the board outruns feathers** (`AttachedRider`, `FEATHER_DRAG`; `?stroke=old`):

- **The fault.** The stroke sweeps the hand back over the board on a fixed path, at about 2.6–2.9 m/s on average (the
  sprint's and the cruise's). Down a face the board soon goes faster than that through the water. The pulling hand then
  meets the water head-on from in front and brakes: its drag along the stroke turns negative, and the sprint's broadside
  arm blade more so.
- **The physics.** A paddler cannot pull water that outruns the stroke, and does not hold the palm against it. The hand
  slices in edge-on, and the arm drives no blade.
  - Edge-on, a flat hand's drag is about a fifth of its broadside drag (Berger, de Groot and Hollander 1995: the hand's
    drag coefficient falls from about 1.1 broadside to 0.2–0.3 at small pitch).
  - So a pulling hand moving forward through the water now has FEATHER_DRAG 0.2 of its drag area, and no blade.
- **The refit.** The stroke's slow ends, where even flat-water paddling outruns the hand, had braked a little. The
  sprint's blade (SPRINT_PADDLE_AREA, "fitted to the top speed") is refitted from 2.4 to 1.8, so flat water keeps the
  owner's sprint: 2.084 m/s, as before (`sprint-fit.ts`). The cruise goes from 1.60 to 1.62 m/s.
- **Down still faces** (sprint after 8 s; `runs/still-faces.txt`):

  | Face | Before | Now |
  |---|---|---|
  | 8° | 2.70 | 3.17 |
  | 12° | 3.05 | 4.12 |
  | 16° | 3.44 | 5.48 |
  | 20° | 3.90 | 6.44 m/s |

  The cruise goes from 3.88 to 4.45 m/s at 12°.
- **It is global.**
  - Every spot's rider paddles this way. `?stroke=old` (`SurfZoneConfig.stroke`) brings back the broadside hand and the
    2.4 blade at any spot; online rooms run the default.
  - The waves are untouched, so every spot's sea is byte-identical.
  - The catches change:
    - the Point (Medium, one seed): 3 and 4 of 9 waves against 1 and 1 (good, early);
    - the Pool: 1 and 2 of 8 either way.

**Probes** (dev only): `catch-probe.ts`, `catch-pool.mjs`, `face-terminal.ts`, `face-popup.ts`, `sprint-fit.ts`.

**Not changed, and why:**

- **The starts** (round 3, seed 1: Small 6 against 4.5 m out, Medium 9 against 3, Big 3 against −2; `runs/screens.txt`).
  - None caught more. The good script's set catches, default start against the nearer one:
    - Small: 2 of 4 against 2 of 4;
    - Medium: 2 of 4 against 2 of 5;
    - Big: 2 of 5 against 0 of 5.
  - On the bars' 1:50 a few metres change the depth by 0.03–0.12 m, and the faces with it hardly.
  - Further in breaks the owner's one-in-ten rule:
    - Small's start is already within 1.5 m of where one wave in ten breaks;
    - Medium has 12.5 m of room and Big 8 m, and their screens used half of it.
  - The distances (103, 134 and 183.5 m) stay; their faces are what they are on a spilling bar.
- **The cue** (rounds 3 and 4, seed 1). Against the cue's 2 of 4, 2 of 4 and 2 of 5 sets ridden (Small / Medium / Big,
  the same seas), none of these helped:

  | Candidate | Sets ridden |
  |---|---|
  | Its place on the face with 0.6 of the crest's speed and the face at least 14° under the board (Kimura and Kakinuma's second criterion) | 1 / 1 / 2 |
  | 0.6 of the crest's speed and the face at least 12° | 1 / 1 / 2 |
  | 0.7 of the crest's speed | 1 / 2 / 0 |
  | Stricter: 0.9 of the crest's speed | 2 / 1 / 1 |
  | Stricter: 0.8 and the face at least 14° | 2 / 1 / 2 |
  | Two strokes more after the cue (0.5 s) | 2 / 2 / 2 |
  | Two strokes more after the cue (1 s) | 1 / 2 / 2 |

  - Looser rules pop sooner and lower, so more riders are left on the crest. Stricter ones keep riders lying down.
  - The 0.8 speed share holds up: pops below it were left behind (the lift script's).
- **The reef's take-off** (Medium, seed 1, 11 m out from its take-off at x −9; `runs/f-reef-medium-1.json`):
  - The cue never lit in 9 of 11 waves.
  - 0 of 4 sets were ridden with the new stroke, 1 of 4 with the old.
  - Its plunging waves steepen inside the start and pass a paddler there.
  - The reef stays as it is; it is not the default start.

## 4. What it would take (for the owner)

1. **The pop-up on a moving face** (the main gap, every spot's big waves). The push holds the body to a pose fixed on the
   board, through hands that cannot pull it down beyond their grip. As the board rides over the face's curvature, its
   heave outruns that and the rider is let go.
   - A real paddler's arms give: the body falls with the board under gravity while the arms extend or bend.
   - A compliant push, the arms as a spring with the board's heave taken up, is the physical change to study. A stronger
     grip alone did nothing.
   - The probe and traces here reproduce it on demand (`catch-probe.ts --trace <wave>:good`, Big seed 1, wave 6).
2. **Small's gentle faces.** The physics allows a catch only on the steepest part of the peak. The options:
   - a steeper bar for Small;
   - a longer board;
   - accept that Small is for the peak.
   The bar is the owner's (canyon-beach-break), so this is a design call.
3. **The 140–180 m rule.** Small (103 m) and Big (183.5 m) stay outside it; the catch gives no reason to move them.

## 5. Shot list (the owner rides)

1. **Canyon Medium from the start:** sprint about 2 s before the crest, pop up at the cue. Then the same with
   `?stroke=old`. Does the sprint now carry you down the face, where before it dragged?
2. **Canyon Big from the start**, the sets:
   - Do you fall while pushing up on the steep faces? This is the case to watch.
   - Does popping a little earlier, lower on the face, stand?
3. **Canyon Small from the start:** do the gentle sets leave you behind on the crest after you stand?
4. **The Point and the Wave Pool**, a few sets each, with and without `?stroke=old`. The stroke is every spot's. Is
   paddling the same on flat water, and quicker down a face?
5. **Paddle on flat water** a while, cruising and sprinting. The cruise should be unchanged, and so should the sprint
   (2.08 m/s).

## 6. Tests

TESTS

## Tools

Build each with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`:
- `catch-probe.ts`:
  - `--size`, `--seed`, `--periods`, `--state <sea>`;
  - `--starts a,b`: several starts on one sea;
  - `--scripts` and `--strokes`;
  - `--focus reef`;
  - `--spot point|pool`;
  - `--nodes 0.5`;
  - `--trace <wave>:<script>`;
  - `--json`.
- `catch-pool.mjs` pools runs.
- `face-terminal.ts`: still faces, how fast prone.
- `face-popup.ts`: still faces, the pop-up (`--rise` lifts the face).
- `sprint-fit.ts`: the flat-water sprint.
