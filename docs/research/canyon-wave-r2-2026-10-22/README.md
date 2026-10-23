# The Canyon's wave, round 2: the shoulder breaks at its own threshold (2026-10-22)

Branch `claude/canyon-wave-r2`, from `main` at `578202fd`, with `1577e577` merged in (the tube fix and the Canyon's tube
wiring). Wave only, no riders, on the 8 GB M1 with other agents working. The owner asked for the fixes without his input
or testing: every call below is judged by measured bars.

## In short

- **The cause was in the solver, not the bed.** The breaking age the solver hands on through the diagonal cells behind a
  face ran along the crest beside the peak's break. So the shoulder down the line broke early: on faces of 7–12°, at
  0.45–0.55 of its depth, where a plunger on 1:23 breaks at about 0.9 (the water-physics advisor).
- **The fix is a Canyon-only gate on that age** (`CANYON.ageJoin` 0.5): the diagonals pass it only to water already
  rising at half the fresh threshold. On the CPU and the GPU tier alike. Every other spot is byte-identical.
- **What it does,** 3 seeds × 14 periods a size:
  - Medium rides 15.1 s at the median (9.5 s), the readout says "closes out" 7 % of the time (25 %), and its tracker
    reads 55° (39°).
  - Big closes out 0 times in 45 crests (3 in 52), its upcoast runs fall from 20 to 2, and it rides 16.5 s (9.7 s).
  - The sets 60 and 90 m down the line stand a quarter to a third taller: Medium 1.35 → 1.70 m and 0.90 → 1.14 m, Big
    2.07 → 2.53 m and 1.82 → 2.40 m.
- **The bed is unchanged,** take-off transect included, so the Basilisk tube cases and the join rows stay valid. Bending
  the arm down the line (a steeper or gentler face, the line at 66° or 75°) moved nothing beyond one seed's noise.
- **The window widens to 260 m** (+8 % cells): Medium's −x chevron inshore falls to the Beach's (10.3° against 10.4°);
  Big's barely moves (16.3°, from 17.3°), because its wrap round the reef's end is real refraction, not the mirror.
- **The take-off moves in** (the sets now break shallower: 1.67 + 0.75 Hs) and **Small starts 9 m out** (11 m before),
  from a catch model on the solver's own waves. Medium and Big keep 11 m.
- **`?canyonBed=old`** is now main's Canyon at 578202fd, pinned value for value. **`?canyonAgeJoin=0`** turns the gate
  off on today's layout.
- **Two costs:**
  - Big's CPU step doubles at the median: the fresh breaks' eddy viscosity splits more steps into two.
  - At Big, 30 % of the crests reach the tube's throw depth unbroken (15 %). The well-sized tubes stay; the pods and
    close-out sections go. The join rows need no refit.

## The brief and its constraints

The seven measured issues, ranked: the wave shrinks down the line; the steep wall at an instant is short; the peel is fast
(Medium 39–50°, "closes out" 25–32 %, Big's 3 close-outs); catching (faces 6–7° at the starts, the autopilot short of the
pop-up speed); the −x side's inshore lean; the flanks' shore break and the provisional 1:15 beach; whether Small dumps.

The constraints:

- **The take-off transect stays identical:** x −9, 1:23 from the 6 m foot to the 1 m crest, through the break and the
  touchdown. The owner's three Basilisk cases (`canyon23_a29`, `_a38`, `_a49`) climb it.
- **Kept:** straight crests from one side only; the beach close (starts 140–180 m from the waterline); the start near
  the peak; other spots byte-identical; `?canyonBed=old` as today's main; the rock bed; the barrel code untouched (another
  agent's), and `RollerFrontMesh.ts` and `SpillingCurl.ts` (a third's).

## The diagnosis

**The water-physics advisor** (consult log, 2026-10-22, "Canyon wave round 2"), ranked:

1. **The common cause, in the solver.** Rule A (`src/wave/breakingAge.ts`) passes the breaking age from the cell behind a
   face and its two diagonals. Kennedy's threshold falls with that age, from 0.65 to 0.15 √(g h). Through the diagonals the
   aged threshold travels along the crest at up to the crest's speed, faster than the 70° line peels (about 0.36 c).
   - So any face steeper than about 7–12° beside the break counts as broken: the unbroken faces' 99th percentile was
     11–12°.
   - The sets down the line broke at 0.45–0.55 of their depth; a plunger on 1:23 breaks near 0.9–1.0 (Weggel 1972).
   - In nature each part of a crest breaks at its own threshold (Dally 1990; Goda 1992's sideways spread, 0–C_b).
   - It explains issue 2, most of issue 4, part of issue 3 and part of issue 1. The advisor's 2026-10-06 consult had
     named the artefact; the owner left rule A alone then (2026-10-07), at every spot.
2. **The shrink is also physical.** On the oblique face the crests turn toward the shallow side, and energy flows along
   the crest toward the peak and into the broken water behind the break. Rays give K_r 0.64–0.8 down the line.
3. **Bed changes, ranked:** turn the line to 66–67° downcoast if the peel overshoots once the age is fixed; a gentler face
   downcoast (1:26–1:28). The steeper face I proposed (1:12–1:16) would do the reverse. Lenses, a shallower platform and a
   softer upcoast end: no (Big breaks on anything shallower than 5.7 m; a softer end puts more of it breaking at once).
4. **The wall:** L = d_s / tan α, d_s = H (1/γ_s − 1/γ_b) / s: about 13 H / tan α on 1:23, so 15–21 m at Medium and
   22–32 m at Big at 45–55°. With the shoulder breaking at γ_b under γ_s, the solver's L was at most a few metres.
5. **The beach:** 1:15 needs Dean's A of about 0.30, a coarse or rock-perched beach, plausible for a cove beside a reef;
   Hacking 1998 measured exposed beach faces from 1:13.5 (coarse) to 1:45. Keep it. The flanks' share is their width.
6. **Small** does not dump: ξb under 1 and long rides.

**The screens** (`sweep.txt`, 1 seed × 8 periods each, Medium and Big; the bend's code in `bend-sweep.patch`):

| Candidate | Medium: readout "closes out"; own fits; ride (median) | Medium: sets' face at 30 / 60 / 90 m against the peak | Big: "closes out"; close-outs; ride |
| --- | --- | --- | --- |
| Today | 34 %; 45°; 6.9 s | 0.75 / 0.46 / 0.35 | 30 %; 1; 14.5 s |
| Face 1:15 downcoast | 3 %; 44°; 10.3 s | 0.68 / 0.44 / 0.36 | 23 %; 0; 16.7 s |
| Line turning to 75° | 19 %; 46°; 13.3 s | 0.76 / 0.46 / 0.39 | 9 %; 1; 14.4 s |
| **Age join 0.35 / 0.5 / 0.65** | **9 / 3 / 0 %; 52 / 54 / 49°; 8.5 / 16.0 / 10.7 s** | 0.76 / 0.52 / 0.36 at 0.35, 0.80 / 0.44 / 0.35 at 0.5 | at 0.5: **1 %; 0; 12.8 s** |
| Join 0.5, line turning to 66° | 12 %; 51°; 10.6 s | 0.80 / 0.52 / 0.37 | 0 %; 0; 14.8 s |
| Join 0.5, face 1:27 downcoast | 9 %; 55°; 13.3 s | 0.83 / 0.47 / 0.38 | 1 %; 0; 15.3 s |

What the screens say:

- **The join is the lever for the peel** at both sizes. 0.5 gave the longest rides and the best fits. 0.65 (diagonals only
  to water already at the fresh threshold) closes out least but rides shorter.
- **No bend helped the faces down the line** beyond one seed's noise, with or without the join.
- **A bend would cost the tube.** It would put the down-the-line tube on a slope its Basilisk cases never climbed: the
  barrel reads one transect (`CANYON.pathSlope`) for the whole arm. So the arm stays planar.

## What changed

| | Before (main 578202fd, now `?canyonBed=old`) | Now |
| --- | --- | --- |
| The arm, the beach, the platform | planar 1:23 at 70° from (−17, −120), run on into the 1:15 beach | **the same** (every depth pinned) |
| Breaking age through the diagonals | always (rule A, as every spot) | **only where the cell rises at 0.5 √(g h) or faster** (`CANYON.ageJoin`; `KennedyOptions.diagonalJoin`; CPU, GPU and the stage 1 indicator) |
| Window; cells | 240 m; 240 × 451 = 108,240 | **260 m; 260 × 451 = 117,260** (+8.3 %) |
| Open water to the window's sides | 83 m (−x), 72 m (+x) | **93 m, 82 m** |
| Take-off depth (`CANYON_TAKE_OFF_DEPTH`) | 1.50 + 1.00 Hs | **1.67 + 0.75 Hs** (refitted: the sets break shallower) |
| Take-offs (x −9) | z −130, −141.5, −164.5 | **z −128.5, −137.5, −154.5** |
| Starts (`CANYON_RIDE_LINEUP`) | 11, 11, 11 m out | **9, 11, 11 m** (the catch model) |
| Starts to the waterline | 141, 153, 176 m | **138, 149, 166 m** |
| Rider bounds | x ±99 | **x ±109** (21 m inside each side, as before) |

**`?canyonBed=old`** returns main's Canyon at 578202fd: `CANYON_OLD` (the same arm, `ageJoin` 0, 240 m), its take-off
(1.50 + 1.00 Hs) and its starts (11 m). The test that pins it holds every value read off main's own build
(`pin-main.txt`): bed depths, window, tank, rider bounds, take-offs, starts, grid, curl sizes, the readout's breaker and
the age rule. A 3 s run hashes to main's exactly (`other-spots.txt`). Canyon-layout's short arm, which the switch rode
until now, is gone.

- It runs without the swept barrel, as 578202fd did (`sweptBarrelOn`; the barrel code is not this branch's).
- For a like-for-like A/B of the wave alone, ride today's layout with `?canyonTube=off` against `?canyonBed=old`.

**`?canyonAgeJoin=<J>`** (new dev switch, `SurfZoneConfig.canyonAgeJoin`) sets the join alone on today's layout, its tube
included: `?canyonAgeJoin=0` is rule A. Online rooms always run the default.

**Unchanged:** the bed and the rock bed (`rockBed.ts` reads the same `canyonTerraceDepth`, `shelfDepth` and `shoreSlope`;
its tests now pin the two layouts' rock as one), `BARREL_SPOTS`, `SWEPT_BARREL`, `src/wave/barrel/*`, `SpillingCurl.ts`,
`RollerFrontMesh.ts`.

## How it was measured

Each size's own swell (`SWELLS`: Small Hs 0.9 m and Tp 9 s, Medium 1.4 m and 11 s, Big 2.4 m and 14 s), square, s = 150,
mid tide, calm, stage 2 on the CPU. "Before" is today's bed run on this branch (`--canyon ageJoin=0,alongShore=240`, or
`--bed old`), which reproduces canyon-long-wave's 3 × 14 tables line for line.

The tools (here unless said):

- **`scripts/canyon-size-report.ts`** (3 seeds × 14 periods, `--stability`): the tracker, the readout, each crest's start,
  close-out and upcoast run, the health.
- **`ride-report.ts`:** canyon-long-wave's, plus **the faces down the line.** Each crest's breaks on the reef are placed
  along its break line by arc length from the peak. For each crest: its face near the peak (s within ±15 m), and at 30,
  60 and 90 m along the ride (±7.5 m), whatever its peel. Reported per crest as a ratio to its own peak, and pooled as the
  sets' (top third) faces in each bin.
- **`arm-report.ts`** (canyon-long-wave's): ξb along the arm, the sets' faces and depths at their first break, the
  take-off's column.
- **`wall-probe.ts`:** canyon-long-wave's, read at several steepness thresholds in one run (0, 8, 12 and 17°), the reef's
  columns running on to its end. Also the stills.
- **`catch-probe.ts` and `catch-model.mjs`:** the catch (below).
- **`scripts/crest-angle-report.ts`** (600 s, seed 1, 64 components) and **`twosided.mjs`:** the two-sided count against
  the Beach's p90 per band.
- **`step-bench.ts`** (canyon-long-wave's, with `--canyon` and `--tube off`) and **`substeps.ts`:** the cost, and what
  splits the solver's steps.
- **`other-spots.ts`, `pin-values.ts`, `summary.mjs`, `screen.sh`, `compose.mjs`:** the identity check, the old layout's
  pin, the screens, the stills' pairs.

## The bars, 3 seeds × 14 periods a size (before → now; `sizes-*.txt`, `base-sizes-*.txt`)

| Bar | Small (0.9 m, 9 s) | Medium (1.4 m, 11 s) | Big (2.4 m, 14 s) |
| --- | --- | --- | --- |
| **1. Sets' faces down the line, 30 / 60 / 90 m along the ride, m** | — → 1.66 / 1.05 / 0.98 | **1.97 / 1.35 / 0.90 → 2.18 / 1.70 / 1.14** | **2.42 / 2.07 / 1.82 → 2.68 / 2.53 / 2.40** |
| 1. The same against the sets' peak | — → 0.77 / 0.49 / 0.45 (peak 2.15 m) | 0.80 / 0.55 / 0.36 → 0.84 / 0.66 / 0.44 (peak 2.46 → 2.59 m) | 0.79 / 0.68 / 0.59 → 0.84 / 0.79 / 0.75 (peak 3.06 → 3.20 m) |
| 1. Per crest, against its own peak | — → 0.72 / 0.42 / 0.34 | 0.73 / 0.48 / 0.38 → 0.74 / 0.52 / 0.39 | 0.75 / 0.62 / 0.57 → 0.84 / 0.78 / 0.70 |
| 1. The sets' face ÷ depth at their first break, 5 / 15 / 25 / 35 m downcoast of the peak | 0.91, 0.58, 0.44, 0.42 → 0.97, 0.88, 0.74, 0.81 | 0.92, 0.55, 0.52, 0.53 → 0.96, 0.94, 0.90, 0.75 | 0.85, 0.53, 0.47, 0.50 → 0.98, 0.95, 1.01, 1.07 |
| **3. Tracker: median; clean toward +x** | 38°; 29 of 30 → **50°; 24 of 24** | 39°; 34 of 34 → **55°; 37 of 37** | 44°; 31 of 32 → **56°; 37 of 37** |
| **3. Readout: closes out / a left / a right** | 32 / 65 / 3 % → **13 / 87 / 0 %** | 25 / 74 / 1 % → **7 / 93 / 0 %** | 29 / 68 / 2 % → **10 / 90 / 0 %** |
| 3. Each crest's own fit; peel over the ride | 32°; 48° → 46°; 50° | 44°; 52° → 48°; 56° | 46°; 49° → 53°; 55° |
| **3. Close-outs (≥ 40 m within 2 s), off the beach face** | 0 → 0 | 0 → 0 | **3 → 0** |
| 3. Upcoast runs off the beach face (largest reach) | 0 (7 m) → 1 (20 m) | 4 (26 m) → 0 (4 m) | **20 (39 m) → 2 (15 m)** |
| **Rides: median; ≥ 10 s** | 10.8 s; 21 of 38 → 11.4 s; 23 of 38 | 9.5 s; 21 of 43 → **15.1 s; 29 of 40** | 9.7 s; 23 of 48 → **16.5 s; 31 of 42** |
| Rides along their breaks: median / 90th | 54 / 100 m → 56 / 102 m | 56 / 128 m → **84 / 136 m** | 44 / 138 m → **106 / 158 m** |
| Rides along shore: median / 90th | 18 / 31 m → 18 / 35 m | 19 / 38 m → 26 / 40 m | 18 / 45 m → 32 / 46 m |
| Starts within ±10 m of their median (median x) | 30 of 39 (x −18) → 32 of 41 (x −16) | 39 of 44 (x −19) → 41 of 43 (x −19) | 43 of 52 (x −21) → 41 of 45 (x −22) |
| 7. ξb of the sets over the whole arm; share ≥ 0.4 | 0.46; 64 % → 0.35; 27 % | 0.47; 70 % → 0.40; 50 % | 0.50; 87 % → 0.47; 89 % |
| 6. Onsets on the beach face (the flanks) | 46 % → 40 % | 69 % → 70 % | 69 % → 78 % |
| Take-off's column: 90th-percentile start depth | 2.39 → **2.34 m** | 2.86 → **2.73 m** | 4.00 → **3.47 m** |
| Health: fastest water; Froude caps (in water); volume | 5.7–6.8 m/s; 0; within 0.10 % → 5.9–6.9 m/s; 0; within 0.08 % | 7.3–8.8; 0; 0.39 % → 7.7–9.5; 0; 0.36 % | 10.0–10.6; 105 (0); 1.11 % → 10.1–10.8; 7 (0); 1.22 % |

Small's "before" are canyon-long-wave's 3 × 14 tables (this branch reproduces them); its faces down the line were not
re-run before (Small's issue is only issue 7).

What they say:

- **Issue 3, the peel, is met.** Medium's tracker reads 55° and its own fits 48°, inside 45–55°. The readout says
  "closes out" 7 % of the time (target 20 % or less). Big has no close-out off the beach face, and its upcoast runs fall
  from 20 to 2. No crest reads "a right".
  - The close-out reads came from the start of each crest: the fit over the peak's first, inherited breaks.
- **Issue 1, the shrink, is halved where it mattered.**
  - The sets' faces 60 and 90 m down the line are 26 % and 27 % taller at Medium, 22 % and 32 % at Big.
  - The shoulder now breaks at 0.75–1.07 of its depth, against 0.45–0.55: Weggel's 0.9–1.0 for a plunger on 1:23.
  - Medium still falls to about half its peak by 60 m and 0.44 by 90 m (Big 0.75). That is the physical part (below).
- **Rides run longer** because the peel slows: Medium's median 9.5 → 15.1 s, Big's 9.7 → 16.5 s. Big's run along its
  breaks more than doubles (44 → 106 m).
- **The sets still start at the peak,** on the arm's end and face (41 of 43 and 41 of 45 within ±10 m).
- **The plunge is a little weaker:** the sets break later and taller, so ξb falls (Medium 0.47 → 0.40, Big 0.50 → 0.47),
  still the reel's weak-to-moderate plunging at Medium and Big. Small now mostly spills (0.35).
- **Health:** no Froude cap in water; volumes within 0.08–1.22 % (Big's 1.22 % is seed 3, as before 1.11 %).

## The wall (issue 2; `walls.txt`)

`wall-probe.ts`, seed 1, 8 periods, every 0.5 s: the longest run of reef columns down the line from a break whose unbroken
face stands at least 0.6 Hs, at each steepness.

| | Medium: before → now | Big: before → now |
| --- | --- | --- |
| ≥ 0.6 Hs at any steepness: 75th / 90th / most; ≥ 15 m | 6 / 13 / 27 m; 17 of 176 → **8 / 17 / 39 m; 28 of 176** | 0 / 36 / 65 m; 27 of 224 → 0 / 37 / 66 m; 36 of 224 |
| ≥ 0.6 Hs and ≥ 8°: median / 90th / most | 0 / 3 / 11 m → 1 / 4 / 11 m | 0 / 21 / 51 m → **5 / 22 / 53 m** |
| ≥ 12°: 90th / most | 1 / 4 m → 1 / 4 m | 3 / 13 m → 5 / 17 m |
| Unbroken faces' top third, 50 / 90 / 99 % | 2.7 / 6.3 / 10.9° → 2.9 / 8.0 / 11.4° | 7.0 / 9.5 / 13.5° → 7.5 / 10.5 / 14.9° |

- **The wall as tall water lengthens:** Medium's 0.6 Hs wall reaches 17 m at the 90th percentile (13 m), inside the
  advisor's 15–21 m. Big's already stood 36 m.
- **The steep wall stays short at Medium:** 4 m at the 90th percentile at 8°, nothing at 17°.
- **The limit is the solver's face.** A depth-averaged Boussinesq face steepens only in the last metres before Kennedy's
  rise-rate test breaks it: the unbroken faces' top third tops out at 11–15° (the 99th percentile), against 30°+ in a
  real plunger's last half-second. So at any instant a steep (≥ 8°) wall is d_s / tan α long, with d_s a few metres.
  - Nothing in the bed changes that.
  - A longer instantaneous steep wall needs a faster peel (shorter for the same d_s) or a spilling face, which issue 3
    and the reel rule out.
  - Or a solver that overturns: the swept barrel's drawn tube stands in for it.

## Catching (issue 4; `catch.txt`)

**The catch model** (`catch-model.mjs`, on `catch-probe.ts`'s record of the take-off's column: η, the depth-averaged flow
and the breaking strength every 1/15 s, from 45 m seaward of the take-off to 35 m inside it, 3 seeds × 14 periods a size).
No rider sessions: a point-mass paddler on the solver's own waves.

- **The paddler:**
  - 80 kg, with the prone body and board's drag of `AttachedRider` (45 N at 1.7 m/s, quadratic);
  - the sprint paddle's thrust fitted to settle at 2.1 m/s on flat water, falling to nothing at 4.5 m/s against the water
    (the hand's top speed against the board);
  - the water's speed at the surface (the depth mean times the game's Airy gain, `horizontalProfileGain`), and the
    surface's fall over 1 m adding g S.
- **The attempt:** the paddler waits at rest at the start and sprints from 0.5–6 s before each wave's crest reaches it.
  - **Caught:** the game's take-off window (`inTakeOffWindow`): at least 0.8 of the crest's speed and 3 m/s, half-way up
    the face, 1.1–2.2 face heights ahead of the crest.
  - **Broke on:** the crest breaks within reach of the board first.
  - **Missed:** the crest passes.
- **Calibration:** from today's 11 m starts the board's top speed is 3.6 m/s at the median over Medium's waves (1 seed).
  The dev autopilot reached 3.3–3.9 m/s.

| Sets (top third), best timing; at a 2 s lead; breaking on the paddler; their steepest metre of face | Small | Medium | Big |
| --- | --- | --- | --- |
| Before, from 11 m out (today's take-off) | — | 50 %; 25 %; 6 %; 9.5° | 42 %; 25 %; 0 %; 12.4° |
| Now, 11 m out (the refit take-off) | 13 %; 0 %; 20 %; 6.8° | **44 %; 25 %; 0 %; 9.6°** | **50 %; 38 %; 8 %; 13.3°** |
| Now, 9 m out | **33 %; 0 %; 20 %; 7.0°** | 44 %; 25 %; 0 %; 10.1° | 50 %; 38 %; 8 %; 13.0° |
| Now, 6 m out | 50 %; 6 %; 25 %; 8.0° | 63 %; 44 %; 13 %; 11.0° | 52 %; 35 %; 17 %; 13.1° |
| Now, 3 m out | 69 %; 19 %; 13 %; 8.6° | 71 %; 35 %; 0 %; 11.6° | 65 %; 43 %; 17 %; 13.9° |
| One wave in ten starts breaking (in the take-off's column) | 8 m seaward of the take-off | 10 m seaward | 5 m seaward |
| Waves breaking seaward of the start chosen | 2 of 27 (9 m) | 3 of 36 (11 m) | 3 of 44 (11 m) |

- **The rule** (big-start's, the owner's 2026-10-11 "not on top of the breaking"): as far in as the paddler catches the
  sets best, but seaward of where one wave in ten starts breaking.
  - Small moves in to 9 m: 33 % of its sets caught, against 13 % from 11 m.
  - Medium and Big stay 11 m out. Nearer catches more, but more waves break on the paddler (6 m: 13–17 % of the sets).
  - The take-off itself moved in with the refit (1, 4 and 10 m), so every start is nearer the break line on the bed.
- **What the solver's faces allow.** A paddler sprinting from rest with good timing (about 2 s before the crest, 5 s at
  Small) catches a third to a half of the sets at the starts. The faces there are 7–13° at their steepest metre. The
  17° rule of thumb is met only as the waves break, 18–40 m inside.
- **The join steepens Big's faces** at the start a little (13.3° against 12.4°). It catches 50 % of the sets (42 %) and
  38 % at a fixed 2 s lead (25 %).
- **Why the autopilot misses** (inferred from the model): timing. Its 3.3–3.9 m/s is the all-waves top speed of a sprint
  begun at an unsuited moment; the sets' best-timed sprints reach 5.1–5.9 m/s.

## Straight crests and the window (issue 5; `crests.txt`)

The crest bar (seed 1, 600 s, 64 components), against canyon-long-wave's 240 m window (its `crests.txt`, which this branch
reproduces), the Beach's p90 in brackets. Edge chevron: twice the angle at the edge station, as the edge band mirrors it.

| Band | Medium, −x edge chevron p90: 240 m → 260 m | Big, the same | Two-sided crests (past the Beach's p90 both sides), now |
| --- | --- | --- | --- |
| seaward (2.6°) | 9.0 → 9.4° | 9.9 → 10.3° | Medium 2 of 795; Big 0 of 673 |
| take-off (8.4°) | 7.0 → 8.9° | 9.9 → 9.8° | 0 of 90; 0 of 109 |
| **inside (10.4°)** | **14.7 → 10.3°** | **17.3 → 16.3°** | 0 of 72; 0 of 176 |
| **inner (11.5°)** | **13.5 → 10.9°** | **18.6 → 17.2°** | 0 of 26; 0 of 188 |

- **Medium's −x lean inshore is closed:** its chevron is now within the Beach's spread. The +x side's is 9.3° and 11.3°
  (11.3° and 12.4° before).
- **Big's barely moves** (1–1.4°), and the open water on the −x side inshore reads the same p90 as in the 240 m window
  (15.1°).
  - The 220 → 240 m step had taken 6° off it; the next 20 m took 1°. Big's lean is no longer the mirror's nearness: its
    crests really wrap round the reef's upcoast end.
  - A wider window would not close it. Turning the end would, and the advisor ruled a softer end out (more of Big
    breaking at once).
  - It is near main's short arm's (15.5°, 17.4°).
- **No crest comes from two sides** inshore at either size. Seaward the count is 0–2 of 670–800, as before (0–4).
- **The cost** is 8.3 % more cells: below.

## Stable for 600 s

From the crest runs (seed 1, 600 s, 64 components): Medium's fastest water 9.44 m/s, no Froude cap, volume 0.29 %
(canyon-long-wave: 9.34 m/s, 0, 0.29 %); Big's 10.41 m/s, 39 caps, none in water, volume −0.19 % (10.55 m/s, 9, −0.07 %).
Finite at both. Big's caps all fall in the swash under 5 cm, where the cap only clips it.

## Cost (`cost.txt`)

The whole `SurfZoneSimulation.step` on this M1 (`step-bench.ts`: the game's sea, 64 components, stage 2 on the CPU, 300
steps after spin-up), each change on its own, run in turn twice; load average 1.4–2.6.

| CPU step, p50 (mean) | Medium | Big |
| --- | --- | --- |
| Before (`?canyonBed=old`: 240 m, rule A, no tube) | 47.9–48.6 ms (61.9–62.5) | 49.8–50.2 ms (58.3–58.8) |
| Today's code with rule A in the 240 m window, tube on | — | 49.9 ms (58.2) |
| Now, tube off | 52.6 ms (73.7) | 100.7–101.3 ms (83.3–84.7) |
| Now, tube on | 53.4–53.5 ms (74.1) | 101.5–102.2 ms (84.3–85.4) |
| Cells | 108,240 → 117,260 (+8.3 %) | the same |

- **Medium costs what its cells do:** +10 % (0.44–0.46 µs a cell either way).
- **Big's step doubles at the median, +45 % on the mean.** The tube is not the cause (tube off costs the same), nor the
  window. It is the join: Big's sets now break fresh on taller, steeper faces, so the eddy viscosity peaks higher.
  - Its stable step (0.2 dx² / ν_peak) splits 191 of 300 steps into two substeps, against 67 under rule A
    (`substeps.ts`); the advective limit stays at 0.83 of the step at the median.
  - At 0.35 the join splits 157.
  - The same substeps run on the GPU tier, so its solver's work at Big rises by about as much.
  - Performance is measured, never a gate; this is the change's one real cost.
- **Spin-up:** Medium 24 → 27 s, Big 56 → 62 s, the cells' share.

## The take-off and the start (bar 6)

**The take-off** (`CANYON_TAKE_OFF_DEPTH`, refitted): the least-squares line through each size's 90th-percentile start
depth in the take-off's column (x −9 ± 4 m), **1.67 + 0.75 Hs**: 2.35, 2.72 and 3.47 m for Small, Medium and Big, within
0.01 m of the measured 2.34, 2.73 and 3.47 m.

- **The transect's breaking moved, not its bed.** With the shoulder no longer breaking on the peak's age, the sets in the
  take-off's column start breaking shallower: by 0.05 m at Small, 0.13 m at Medium and 0.53 m at Big.
- **So the take-offs move inshore** by 1, 4 and 10 m, to z −128.5, −137.5 and −154.5.

| | Take-off (x, z), depth | Start, depth | Start to the waterline | Rider's −x / +x bounds |
| --- | --- | --- | --- | --- |
| Small, before | (−9, −130.0), 2.39 m | 11 m out, 2.87 m | 141 m | x ±99 |
| **Small, now** | **(−9, −128.5), 2.35 m** | **9 m out, 2.72 m** | **138 m** | **x ±109** |
| Medium, before | (−9, −141.5), 2.89 m | 11 m out, 3.37 m | 153 m | x ±99 |
| **Medium, now** | **(−9, −137.5), 2.72 m** | **11 m out, 3.19 m** | **149 m** | **x ±109** |
| Big, before | (−9, −164.5), 3.89 m | 11 m out, 4.37 m | 176 m | x ±99 |
| **Big, now** | **(−9, −154.5), 3.47 m** | **11 m out, 3.93 m** | **166 m** | **x ±109** |

The peak stays 120 m from the waterline and 8 m upcoast of the take-off. Small's start is 2 m inside the brief's 140 m;
the ride runs from the peak down the arm to the beach face as before. Online spawns lie 4–19 m beyond the start, ±20 m
along shore.

## The beach and Small (issues 6 and 7)

- **The beach stays 1:15,** now sourced rather than provisional (the advisor):
  - A 1:15 mean slope to 6 m needs Dean's A of about 0.30: a coarse or rock-perched beach, plausible for a cove beside a
    reef. Dean's range tops out at 0.40; sand of 0.2–1 mm gives 0.10–0.21 (Dean 1987; Bosboom & Stive §7.2.2).
  - Hacking 1998 measured exposed New South Wales beach faces from 1:13.5 (coarse) to 1:45.
  - A sandy equilibrium profile (1:25–1:77 to 6 m) would put 4–5 m of water beside the peak: Big would break on the
    flanks, across the window.
- **The flanks' shore break is physical.** The flanks are two thirds of the window (now 175 of its 260 m), and 40–78 % of
  the onsets are theirs.
  - The share rose at Big (69 → 78 %) for two reasons: the window grew, and the reef's own onsets fell as its sets break
    later and in fewer places (the arm's 2,125 → 1,891 per 3 × 14, the platform's 299 → 0).
  - Lowering the share would mean narrowing the flanks, which issue 5 needs wide.
- **Small does not dump.**
  - Its sets' ξb is 0.35 over the arm (0.46 before), spilling to weakly plunging (Battjes: under 0.4 spills, 0.4–2.0
    plunges).
  - A dump would be ξb of about 1 or more with a close-out or rides under about 3 s. Small rides 11.4 s at the median
    along 56 m of breaks, peeling at 50° by the tracker, with no close-out.
  - Unchanged, as the brief asked.

## The tube's join (`tube.txt`)

`BARREL_SPOTS.canyon`'s join rows need no refit.

- **Why:** they come from `spotOnset`, a one-dimensional run (periodic, every column alike) on the take-off's transect.
  There the diagonal parents carry the same age as the one behind, so the gate changes nothing; and the transect is
  untouched.
- **What changes is the two-dimensional sea they are matched against:** the shoulder no longer breaks on the peak's age,
  so more crests reach their throw depth unbroken. The Canyon's tube probe (seed 3, 60 s, 1 m cells; main's code
  reproduces the tube's own final table exactly):

| Big | Rule A (main) | Join 0.35 | **Join 0.5 (now)** |
| --- | --- | --- | --- |
| Joins (late, past the throw depth) | 1,061 (63) | 997 (125) | 950 (136) |
| Unbroken at their throw depth (the advisor's bar about 20 %) | 15.1 % | 27.2 % | **30.3 %** |
| Fronts with an open tube | 95 | 61 | 57 |
| Of them, longest open run 0.84–2.64 H / under / over | 31 / 30 / 34 | 32 / 7 / 22 | **28 / 8 / 21** |
| Open runs a frame: p50 / p90 | 2.0 / 19.4 m | — | 2.1 / 19.0 m |

Medium: unbroken 82.3 → 93.0 % (it was already mostly a curl), fronts with an open tube 24 → 11.

- **The well-sized tubes stay** (31 → 28 fronts in the band). The pods under 0.84 H (30 → 8) and the close-out sections
  over 2.64 H (34 → 21) go.
- **The unbroken share doubles,** past the advisor's 20 % bar: those crests break a little later, where the curl draws
  them.
- **The remedy is the barrel's, not the bed's.** The advisor had ruled out a longer `joinPast` because it would throw on
  the inherited-age fuse's break. At the Canyon that fuse is gone, so a longer `joinPast` (or one measured in depth) would
  now join crests where the solver really breaks them.
  - That is for the barrel's owner, whose code this branch leaves alone.
  - `?canyonAgeJoin=0` restores rule A, tube and all, for the A/B.

## The Surf screen's Canyon faces (`SWELL_SURF.canyon`)

The take-off moved and its sets break taller there, so the faces were re-measured the same way:
`scripts/size-report.ts --spots canyon --swells <size> --tag swell-<size> --no-practice`, seed 1, 240 s each, at the new
take-offs (`docs/research/sizes/canyon-swell-*.json`).

| | Small | Medium | Big |
| --- | --- | --- | --- |
| Typical / sets, m: before → now | 1.85 / 2.10 → **1.99 / 2.14** | 2.41 / 2.68 → **2.49 / 2.70** | 2.96 / 3.20 → **3.07 / 3.53** |
| Waves at the take-off | 44 → 42 | 30 → 36 | 23 → 29 |

The forecast's fit for other seas (`SURF_FORECAST.canyon`, from Hs 1–3 m at 14 s) was not refitted.

## The stills (`still-*.png`)

Each pair is seed 1, the same sea: before (today's bed, rule A, 240 m) on the left, now on the right. Seaward is up and x
grows to the right; the bed's 1–6 m contours are drawn, the take-off red.

- **`still-medium-155.png`, `still-big-155.png`** (`ride-map.ts`): one crest's breaks on the reef, coloured by the time
  since its first (blue, green at about 7 s, yellow at 13 s, red at 20 s); grey is the beach face's shore break.
  - Medium: both peel down the arm to the beach face for 20 s. Before, the first breaks spread upcoast and down at once
    (the hump); now the crest starts in a tight group at the peak. A stretch near the end breaks late, after a gap.
  - Big: 17.0 s before, 19.9 s now, from the peak to the beach face.
- **`still-big-116-water.png`, `still-medium-90-water.png`** (`wall-probe.ts --stills`): the water itself, η shaded and
  breaking white.
  - Big at 116 s: before, the set breaks across 20 m at the peak, with a second break on the open platform upcoast of
    the reef; now it breaks over a short section at the peak, nothing upcoast.
  - Medium at 90 s: before, the next section down the line is already breaking in a streak ahead of the peak's white;
    now one compact section.

## What physics limits

- **The faces down the line.** On a 70° face under square crests, energy turns toward the peak and drains into the broken
  water behind the peel.
  - Rays give K_r 0.64–0.8 against the open beach.
  - Medium's sets 60–90 m down the line are now 1.1–1.7 m, against the open beach's 1.6 m.
  - The slower the peel, the longer the shoulder drains. A faster peel or a less oblique line holds more height but closes
    out more (the screens: 66° gave the same faces).
- **The steep wall at an instant:** the solver's face, as above. As tall water it now reaches the advisor's 15–21 m at
  Medium (17 m at the 90th percentile).
- **Medium's peel** sits at the band's top (tracker 55°, fits 48°): the 70° line under square crests, with the shoulder
  breaking at its own threshold, peels near the geometric angle.
- **Big's −x lean** is refraction round the reef's upcoast end, not the window.

## Risks

- **A solver change at one spot.** The gate is the advisor's inferred fix, not a sourced scheme.
  - Its parts are sourced: FUNWAVE-TVD restarts an inheriting cell's age; Celeris passes it through the same stencil. It
    reopens the owner's 2026-10-07 "rule A left alone", for the Canyon only.
  - Bores oblique to the grid keep breaking where they rise at 0.5 √(g h) or more. On the Canyon's square crests nothing
    in the bars, the health or the stills shows a bore stalling.
  - `ageJoin` 0 restores rule A.
- **The GPU tier.** The WGSL mirrors the CPU line for line; its params and its source are tested, and 0 leaves every other
  spot's shader arithmetic unchanged. No WebGPU device ran it here: the owner's M4 is the first. Check the Canyon on the
  GPU tier against `compute=cpu` once.
- **Big's CPU step doubles at the median** (+45 % on the mean): the eddy viscosity's stable step splits two steps in
  three (one in five before). The GPU tier does the same substeps.
- **The tube at Big:** 30 % of the crests reach their throw depth unbroken (15 % before; the bar about 20 %). The
  well-sized tubes stay; the pods and close-out sections go. A longer `joinPast` at the Canyon is the barrel's follow-up.
- **Small's start** is 9 m out, 138 m from the waterline, 2 m inside the brief's 140 m.
- **Big's −x lean inshore** stays (16.3°, the Beach's 10.4°).
- **Seed noise:** the screens ran 1 seed; the finalist and the before ran 3 × 14. The catch model counts 16–24 sets per
  size: its percentages move by about 6 points per set.
- **Not re-recorded:** the dev bots' track (`server/bots/canyon-medium.bin`).

## What to ride (the owner)

Ride the Canyon, mid tide, calm, several sets each way, recorded. Then the same with **`?canyonBed=old`** (main's Canyon at
578202fd, no tube) and with **`?canyonTube=off`** (today's wave, no tube) for a like-for-like A/B.

1. **Medium from the start (11 m out, 149 m from the beach).** Sprint about 2 s before the crest reaches you.
   - Does the wave peel down the reef to the beach for 15–20 s?
   - The readout should say "a left" nine times in ten.
   - Down the line, does the shoulder stay a wall worth racing to the end?
2. **Big from the start (11 m out, now 166 m from the beach).** Do the sets still pick you up? Does any section close out
   or run back upcoast? Then try `?startOut=6`.
3. **Small from its new start, 9 m out.** It wants an earlier sprint, about 5 s before the crest. Does it spill and peel
   rather than dump?
4. **The crests.** Square across the open water either side. Watch the −x side near the beach at Medium (now straight)
   and Big (still leaning, as on main).
5. **The tube.** At Big, does the tube still open down the line? Fewer short pods and close-out sections should show,
   and more crests drawn by the curl. Then `?canyonAgeJoin=0` (rule A, tube included) for the A/B.
6. **The GPU tier.** The same sets with `compute=cpu` and on the GPU: the peel should read the same.

## Tests

On this branch (2026-10-22/23, the M1), no rider sessions:

- `npx tsc --noEmit -p .`: no errors.
- `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`:
  303 files passed (29 skipped); 2,882 tests passed, 18 expected failures, 33 skipped.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "[Cc]anyon"`: 16 passed. One failed on the first run, on a
  rounding (Medium's start 3.195 m deep against 3.2 to two places); fixed to 3.19 and passed on its own.

New or changed, with provenance in each:

- **`breakingAge.test.ts`** (new): the diagonal parents pass their age only when open.
- **`GpuBoussinesq.test.ts`:** the join's parameter word, and the gate in the WGSL.
- **`SurfZoneSimulation.test.ts`:**
  - the Canyon's join wiring and its `canyonAgeJoin` override; every other spot keeps rule A;
  - the old layout repinned to main's 578202fd values, every one exact, the same bed point for point;
  - the refitted take-off depths and take-offs;
  - the starts: 9, 11 and 11 m, 138–166 m from the waterline.
- **`PhysicalMode.test.ts`:** the `?canyonAgeJoin` switch.
- **`OnlinePlay.test.ts`:** spawns from the Canyon's Small start too.
- **`Bathymetry.test.ts`, `rockBed.test.ts`:** the old layout's arm and rock are today's; the 260 m window.
- **`surfForecast.ts`'s numbers:** checked by the existing `surfForecast.test.ts` and `SurfConditions.test.ts` against
  the re-measured files.
