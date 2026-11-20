# The pop-up on moving, curved faces (popup-moving-face, 2026-10-29)

The owner: the Canyon is "too steep to catch when big". canyon-catch (#164) had traced it to the pop-up: on 18–20°
faces the board heaved ±0.5–0.9 m/s under a rider pushing up, the contact could not hold the body, and the rider let go
about 0.6 s in. This note finds why the board heaved, fixes it, and measures the result.

The work was done on the M1 Air (8 GB), on the branch `claude/popup-moving-face` from main at 5e19a55d. It used
headless `RideSession` riders only, with no SurfZoneRunner rider sessions.

## In short

- **The cause.** The sea's surface was held still through the bodies' step while the wave moved on.
  - A Big Canyon set's face (20°, travelling at 6 m/s) climbs c tan θ = 2.2 m/s, so it jumped 3.6 cm at every 1/60 s
    step.
  - Within each step, the prone board slid down the frozen face, lost its water and fell free for three quarters of the
    step. At the next step the face stood 3.6 cm higher and kicked the board.
  - This 60 Hz hop is the heave. A rider pushing up could not hold the board through it.
- **The fix.** The board tells the water when each substep's samples are taken. The sea moves each sample's surface
  back to that time at its rise rate, taken from continuity (∂η/∂t = −∇·q).
  - This applies at every spot, to every board and rider in the sea.
  - `?surfaceMotion=old` holds the surface still, as before, for A/Bs.
  - Online rooms run the default.
- **The pop-up on Big Canyon sets.**
  - Replay of one Big set wave, 16 riders: 4 rode before, 16 ride now.
  - Set trials from the default start (good, early and late scripts; 2 seeds): pop-up falls dropped from 13 to 3 of 30.
    Caught waves (standing 1 s on the face) rose from 16 to 21; 3 s rides rose from 10 to 12.
  - Medium sets: pop-up falls dropped from 8 to 1 of 24, and caught waves rose from 9 to 15.
- **What now stops the Big rides is after the pop-up.** These scripted riders do not steer.
  - They stand, run straight down the face to 10–11.6 m/s, and are stopped dead at the bottom about 1.4 s later. This is
    the nose-dive a bottom turn avoids. It is the same with the old surface.
- **What still stops the Point's and the Pool's set catches is different, and is the same either way.**
  - At the Point, the rider pops while the board is in the air off a pitching crest.
  - At the Pool, the take-off lands in the lip's landing.
  - Both are real falls at the cue's timing, not the pop-up's contact.
- **The arms' give was not built.** The heave it was meant to absorb came from the frozen surface. With the face
  moving, the push's contact carries about one body weight per substep, so there is nothing left for it to answer.

## The cause

### 1. Many riders on one wave

`popup-replay.ts` restores a sea saved at the placement of Big seed 1's wave 6 (`catch-probe.ts --save-at`). It places
16 riders spread ±8 m along the shore from the default start, and runs the good script for each. The riders read the
water but do not push it.

- Held surface (`?surfaceMotion=old`, as main): 4 rode, 12 fell popping up. Of the 12, 11 lost the board and 1 slipped
  a foot.
- Moving surface: 16 of 16 rode.

The pops themselves were alike in both runs: 2.3–2.6 m ahead of the crest, 0.77–0.83 of the way up the face, on
17–20°, at 4.7–4.9 m/s against a crest at 5.9–6.0 m/s.

Runs: `runs/replay-big-1.txt`.

### 2. Substep by substep

`--subs` logs every substep's contact. Each entry gives:
- the normal impulse the posture hold asks of the deck, divided by the body's weight over the substep;
- its across and along components;
- the body's external force;
- the drive's and the board's vertical speeds.

With the held surface, every step showed the same shape:
- **The first substep** asked 1.7–3.9 body weights.
- **The other three** asked about 0, sometimes −0.2.

So the composite falls free for three quarters of the step and is kicked at its start. The frame's mean is still about
one body weight.

Then 0.45 s into the push, a slip across the deck started in a refined substep:
- The across impulse grew 0.3 → 0.9 → 2.3 → 21 → 55 → 134 body weights within one step.
- Flight followed.
- The board was kicked +0.86 m/s up and +0.56 m/s forward in that one step.
- The hold then asked −9 to −30 body weights. The body flew apart from the board.
- At 0.63 s the posture error reached 0.25 m, and the rider separated: lost board.

Across the push, the held surface's failing riders saw substep loads of −332 to +343 body weights on wave 6, and up to
+3313 on wave 9. The board's frame-to-frame heave was 0.13–1.1 m/s (rms). With the moving surface, a clean push carries
0.2–2 body weights per substep, with a heave of 0.01–0.06 m/s. Some riders still see brief spikes of about ±3 body
weights, and ride on.

### 3. Why it bites when big

The jump per step is c tan θ dt:
- about 1.8 cm on a Small face (c ≈ 4 m/s, 15°);
- 3.6 cm on a Big set's face (6 m/s, 20°).

The Big pop also comes on the steepest part of the face.

canyon-catch's still-face table already showed the effect without naming it. Faces rising at only 0.4 m/s, held
through each step, cost the pop-up 0.07–0.12 s of infeasible contact, against 0.02 s on still faces.

### 4. A controlled face

`face-popup.ts --speed c` lifts each plane sheet as a face of its slope travelling at c would. `--held` holds it still
through each step.

| Face, speed | Contact infeasible during the pop-up |
|---|---|
| Still face | 0.02–0.03 s |
| 6 m/s, held | 0.12–0.32 s (0.28–0.32 s at 18–25°) |
| 6 m/s, moving | 0.00–0.02 s at 15–22°, 0.07 s at 25°, as on the still face |

A face rising uniformly with its water is the still face seen from a lift. Moving, the ride matches the still face: the
speed after 4 s standing is 8.86 against 8.83 m/s at 18°, and 10.53 against 10.51 at 20°.

Runs: `runs/faces.txt`. The same check is now a test (`movingFace.test.ts`).

## The fix

**The surface's time.**
- In the game and in every probe, the sea steps first and the bodies then integrate over that same step. So the
  water's state is the step's end.
- A new optional `SurfWater.setSampleTime(offset)` lets the board say when its samples are taken.
  - `BoardBody.step` sets it before each substep, refined ones included, to the substep's start: `elapsed − dt`, from
    −dt to 0.
  - It sets it back to 0 after the loop, before the rider's end-of-step cue.
- Everything sampled inside the substep sees that time. This covers the hull patches, fins and rails, and the rider's
  body, hands and wave side.

**The sea's surface at that time.** `PhysicalSurfWater` moves each wet sample's surface by `rise × offset`.
- `rise = −∇·q` is the depth-integrated mass equation's ∂η/∂t, exact for the solver.
- The sample's `flowY` was already reconstructed from the same value at the surface. The impulsive water forces
  (added mass, entry, radiation) already took the surface as moving at `flowY` through the relative velocity. Only the
  height stood still, and now it agrees with them.
- `surfaceAt` moves the same way.
- The plume's air and turbulence are read from the moved surface.
- The rise is computed where the flow already needed it, so a sample costs nothing more. `surfaceAt` adds one
  divergence (four cell reads) per call, for a rider's few calls per substep.

**What it does not move.**
- The swept barrel's contact (Padang's tube) answers its own surface, held as before.
- A roller lens's top rides on the solver's rise rather than the lens's own.
- The test waters (`PlaneWater`, `ChopWater`, `FaceWater`, `BoreWater`) take no sample time and run bit for bit as
  before.
- A fallen surfer swimming samples outside the board's step, at the state's time, as before.

**Scope and A/B.**
- The change is global: every spot's boards and riders, standing as well as prone.
- `SurfZoneConfig.surfaceMotion: 'old'` holds the surface. The `?surfaceMotion=old` dev switch is named for what it
  switches. It holds the surface for every body, not only the pop-up, so it is not called `?popup=old`.
- Online rooms fix it to the default (`main.ts`).
- With `'old'`, the probes reproduce main's results exactly: the Big ensemble's per-rider outcomes are identical.

## Before and after: catching from the default start

**Method.**
- Before: canyon-catch's final runs on main, `canyon-catch-2026-10-29/runs/f-*.json`.
- After: `runs/a-*.json`, run on the same saved seas with `--scripts good,early,late --strokes feather`.
- `caught-pool.mjs` reads them. Each cell gives:
  - rode (standing 3 s on the face ahead of the crest) / caught (standing 1 s there) of n;
  - fell popping up (popped and fell before standing);
  - fell after standing (stood and fell before 3 s);
  - no cue.
- Sets are each run's top third by face at the start.

### The Canyon: set waves, seeds 1 and 2 pooled

| Size | Script | Before | After |
|---|---|---|---|
| Small (9 sets) | good | 3 / 4; 1; 4; 1 | 1 / 4; 0; 7; 1 |
| | early | 4 / 6; 0; 4; 0 | 5 / 6; 0; 3; 0 |
| | late | 1 / 4; 0; 6; 1 | 2 / 2; 0; 5; 1 |
| Medium (8 sets) | good | 2 / 3; 4; 1; 1 | 2 / 5; 0; 5; 1 |
| | early | 2 / 3; 1; 4; 1 | 4 / 6; 0; 3; 1 |
| | late | 2 / 3; 3; 2; 1 | 2 / 4; 1; 4; 1 |
| Big (10 sets) | good | 5 / 6; 3; 1; 1 | 4 / 7; 1; 3; 1 |
| | early | 2 / 5; 4; 2; 0 | 4 / 7; 1; 4; 0 |
| | late | 3 / 5; 5; 2; 0 | 4 / 7; 0; 5; 0 |

**Totals over the three scripts.**

| Size | Pop-up falls | Caught | Rode |
|---|---|---|---|
| Big (of 30) | 13 → 3 | 16 → 21 | 10 → 12 |
| Medium (of 24) | 8 → 1 | 9 → 15 | 6 → 8 |
| Small (of 27) | 1 → 0 | 14 → 12 | 8 → 8 |

At Small, the waves that change flip both ways, among riders who all stood. That is within the noise of scripted rides.

**All waves (good / early / late).**
- Big: rode 11, 9, 7 → 11, 11, 9 of 29; caught 13, 12, 10 → 15, 14, 14; pop-up falls 19 → 3.
- Medium: pop-up falls 9 → 1 of 69 trials.

### The Point and the Pool (medium, seed 1)

The after runs were longer (12 periods, against 8 before). They are compared over the same first waves, with the before
run's sets (`--waves n --sets-from`).

| Spot | Script | Sets before | Sets after | All waves before | All waves after |
|---|---|---|---|---|---|
| Point (3 sets of 9 waves) | good | 0 / 0; 3; 0; 0 | 0 / 0; 3; 0; 0 | 3 / 3 of 9 | 1 / 1 of 9 |
| | early | 0 / 0; 3; 0; 0 | 2 / 2; 1; 0; 0 | 4 / 4 of 9 | 5 / 5 of 9 |
| Pool (3 sets of 8 waves) | good | 0 / 0; 2; 1; 0 | 0 / 0; 3; 0; 0 | 1 / 1 of 8 | 2 / 2 of 8 |
| | early | 1 / 1; 2; 0; 0 | 1 / 1; 2; 0; 0 | 2 / 3 of 8 | 4 / 4 of 8 |

The Point's and the Pool's set catches are not clearly up. Their remaining falls have their own cause, below.

### Still faces and the paddle-balance probes

- **Still faces of 15–25°** (`face-popup.ts`, no speed): identical to canyon-catch's table. The plane holds still, as
  before. Runs: `runs/faces.txt`.
- **Flat water and chop** (the paddle-balance probes, now `AttachedRider.test.ts`): their waters (`PlaneWater`,
  `ChopWater`) take no sample time. They run bit for bit as before, and the tests pass unchanged. No new falls.

## What still stops the catches

These are named and measured, but not changed.

### 1. Big, after standing: the bottom

Big seed 1's wave 9 was replayed with 8 riders (`runs/replay-big-1-w9.txt`).

- **Moving surface:**
  - 7 riders stood. Every one of them fell standing; one fell popping up.
  - The riders who stood ran straight down the face to about 10–10.5 m/s, 7 m ahead of a crest moving at 6.5 m/s.
  - About 1.4 s after standing, the board stopped dead in 3.5 m of water: from 9.6 to 5.1 m/s within four steps
    (0.07 s).
- **Held surface:**
  - 7 of 8 fell popping up.
  - The one who stood reached 11.6 m/s and was stopped the same way, 10 m ahead of the crest.

This is the nose-dive at the bottom, which the brief keeps as a real fall. A player's bottom turn is what avoids it.
These scripted riders do not steer. The probe files these falls as "left on the crest", because the rider popped and
fell. A stop of 4–5 m/s within a few steps is abrupt enough to deserve a look of its own; it is not part of the pop-up.

### 2. The Point's sets: a pitching crest

Wave 7, the biggest set (`runs/replay-point-1-w7.txt`), was replayed with 8 riders: 7 fell popping up, moving and held
alike.

- The rider pops 0.8 of the way up, with the board already in the air off the steepening top. It carries no load for 4
  frames, then lands at up to 16 body weights per substep.
- The gauge's crest speed falls from 5.1 to 2.7 m/s as the crest stands up.
- This is a late take-off on a plunging wave: the cue's timing at the Point, not the pop-up's contact.

### 3. The Pool's sets: the lip

Wave 4 (`runs/replay-pool-1-w4.txt`) was replayed with 8 riders: 2 rode, 3 fell popping up, 3 fell standing.

- The face under the rider who fell swung between −37° and +30° within 0.2 s, with breaking rising from 0 to 0.5.
- The surface along its line, at the moment it fell, drops 46° into the lip's void 0.5–1.25 m ahead of the crest. It
  rises again a metre further on, where the lip lands.
- This is a lip landing on the rider. The cue lights 2.2 s after the crest passed the start, as the wave throws.

### 4. Small and Medium

"Balance" falls 1–2 s after standing are as common as before. The scripted riders give no balance input.

## Real falls stay

No contact limit, grip or separation rule changed. Seen in these runs:
- **The nose-dive at the bottom:** Big wave 9, above.
- **A lip landing on the rider:** the Pool, above.
- **Popping on a board that has lost the wave:** the one fall of 4 riders on Big wave 6 (6 m right of the start,
  moving).
  - The push held, at about one body weight per substep.
  - Then the board slowed from 5.0 to 3.7 m/s and pitched 17° nose up near the top of the face (0.83 → 0.93 up), as the
    crest at 5.9 m/s caught it.
  - Lost board (`runs/replay-big-1.txt`, the end).

## The arms' give, not built

The brief proposed vertical give in the arms and hips (`armsGiveStep`, `PRONE_ROLL_SHIFT`) to absorb the board's heave.
Measured, that heave was the frozen surface's 60 Hz hop, which the fix removes.

With the face moving:
- the contact carries 0.2–2 body weights per substep through a clean push;
- the 16-rider wave rides 16 of 16.

A compliance with no cause left to answer would be the hidden "can't fall in a pop-up" the brief rules out, so none was
added.

## Tests

- `npx tsc --noEmit -p .`: clean.
- The main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude
  "**/SurfZoneRunner.test.ts"`): 305 files passed (30 skipped); 2907 tests passed (18 expected fail, 36 skipped).
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t
  "[Cc]anyon|[Pp]oint|[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`: 24 passed (80 skipped by the filter), 20 min.
- **New:**
  - `movingFace.test.ts`: on 18° and 22° faces travelling at 6 m/s, the pop-up's contact holds as on a still face, and
    the ride matches it within 2 %. Held, the step's jumps cost the contact more than 0.15 s.
  - `PhysicalSurfWater.test.ts`: on a hump travelling at √(gd), the surface moved back through a step lands within a
    tenth of the step's climb of where the step found it (measured within 1 %). The sample agrees with the height. Held
    (`'old'`) and at time 0, it is the state's surface.
  - `PhysicalMode.test.ts`: the `?surfaceMotion=old` switch at every spot, and online rooms on the default.
- **Changed:** `rollerScope.test.ts`'s plume riders are recorded again.
  - The water there is never stepped, so the riders' own pushes make its surface rise.
  - With `surfaceMotion: 'old'`, the old fingerprints are kept bit for bit.
  - The test-water riders are unchanged.
- No rider sessions.

## Tools

Build each tool with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`.

- **`popup-replay.ts`:** one saved wave, many riders.
  - `--state <sea> [--spot canyon|point|pool] [--size big] [--seconds 16]`
  - `--riders n --spread m`
  - `--lead 2`
  - `--surface old`
  - `--subs`: each substep's contact.
  - `--after s --show standing`: log a standing fall.
  - `--quiet`
- **`catch-probe.ts`** (canyon-catch) adds:
  - `--surface old`;
  - `--save-at t --save <sea>`, which keeps the sea at that time for the replay.
- **`face-popup.ts`** (canyon-catch) adds `--speed c [--held]`: faces travelling at c.
- **`caught-pool.mjs`:** pools catch runs into the tables above (`--waves n`, `--sets-from <run>`).

## Shot list for the owner

1. **Canyon, Big, default start:** catch five set waves at the cue.
   - Through the push on the steep face, the board should no longer kick or chatter under the rider.
   - Then repeat with `?surfaceMotion=old` for the A/B.
2. **Canyon, Medium:** the same. The pop-up should hold where it used to throw the rider off.
3. **Big, once standing:** first go straight down and feel the bottom; with no turn, the board stops dead at about
   10 m/s. Then bottom turn: does the turn carry the rider through? Say whether the stop feels like hitting a wall.
4. **Standing anywhere:** the surface no longer steps each frame, so boards plane more steadily and run faster down a
   face. Say whether riding feels different.
5. **Point sets:** note whether the cue lights when the wave is already pitching, with the board in the air at the pop.
6. **Pool:** note whether the take-off lands in the lip.
7. **Online room:** the same as the default, whatever the URL says.
