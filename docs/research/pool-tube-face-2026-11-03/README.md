# The Wave Pool Barrel's surfable tube: steps 4–6, the face anchor (2026-11-03 – 11-04)

Steps 4–6 of the surfable-tube plan (`docs/superpowers/plans/2026-11-03-pool-surfable-tube.md`): build the water-physics
advisor's step 3 ruling (`advisor-ruling.md`, also the consult log's row) and measure its 13 bars. Branch
`claude/pool-tube-face` from `claude/pool-tube-hole` (33e6a371, on main 4eee1e5f), with main merged in twice since (Snap
rounds 1–2; Canyon C, 135782d6). No rider sessions, catch reports or autopilot checks were run: the bodies in the bars
are placed on the water by the probe, with no input.

## Where it stands (2026-11-04)

- **Built (pool only, behind `BarrelSpot.faceAnchor`; every other spot unchanged):** the face anchor; the support's
  union; the lagged join, with its retire guard and the fallback's formation ramp; the capped thrown clock; thrown ends
  blended over their height; the four switches. Since the owner's call of 2026-11-04, **a38 is the Wave Pool's default
  tube case** (`?poolTubeCase=pool` for the pool's own runs).
- **Measured:** all four runs again on this head (1.5 and 1.8 m, a38 and the pool's cases, 12 periods; `runs/`), the old
  switches' ledger, the pin check against main 135782d6, the cost A/B, and the tests.
- **The bars, in short** (the table below):
  - **pass:** the support never under the solver's surface (bar 1); the clock and the open time (bar 7); the ray advance and
    the shift's slope (bar 8, in part); the meter within ±5 % of main (bar 10, in part); the pin check (bar 11); and, with
    a38, the air under the lip (bar 5) and the landing's distance (bar 6, in part).
  - **fail:** the bodies (bar 2); the lower face's match (bar 3); the rise per step (bar 4); with the pool's cases, the
    air (bar 5) and the landing's distance (bar 6); with a38, the landing where the solver breaks, by 1–3 points (bar 6);
    holes, folds and the saddle's tail (bar 8); the jets against main, which throws none at the pool (bar 10).
  - **dropped by the owner:** bar 9's forced fall (lip hits are left to the physics; reported as information).
  - **not measured:** the M4 Pro's cost (bar 12) and the ride-camera strips (bar 13: they need the browser's renderer).
- **Found on the way:**
  - The pool's throw depth was clamped to the runs' foot crests (2.19 m), deeper than where the drawn case goes vertical
    (1.51 / 1.94 m). The lagged join keys on it, so in lag mode it is scaled by Froude.
  - Step 2's "the drawn clock runs at 2×" was a measurement of a fixed reef column, not of the clock: each point's clock
    runs at 1.00× (p95 1.01 before the change).
  - Points travel along the reef as they come shoreward, so a fixed column sees a tube pass in about half its life.
  - Main's pool Barrel throws no crash jets: over the old switches' 12 periods, 507–733 points were paced and none had a jet
    volume (5–6 jets since the start). *Inferred:* with zero lag every point joins already thrown, while its slice's end
    blend is still at 0, so its jet asks for no water (`SweptCrash.throwJet`: volume = jet area × width × end weight).

## The owner's decisions (2026-11-04)

1. **a38 is the Wave Pool's default tube case** until the bigger-tube work lands. `?poolTubeCase=pool` switches back to
   the pool's own two level-13 runs; `?poolTubeCase=a38` still works and is the default. Online rooms pin the default.
   The pin check's pool default changes on purpose; every other spot must hash as on main.
2. **Lip hits are left to the physics.** Today's drag rule stays, with no forced wipeout ("most surfers stand on hits").
   Bar 9's "lip on head or torso → fall ≥ 90 %" is dropped; what the drag rule gives is reported as information.
3. **The bigger tube comes next,** after this merges (not started here; what it needs is below).

## The bars

The ruling's bars (`advisor-ruling.md`, "Bars for step 6"), frame by frame at reef columns s 30–95 (30 Hz reads; the
rise every 1/60 s step), 12 periods after 50 s, CPU. Values are p50 unless said; p10 / p50 / p90 where three are given.
"Old" is the build before (`?tubeFace=old&tubeFrom=piece`, main's build byte for byte): its support, air and bodies from
step 2's hole runs (`docs/research/pool-tube-hole-2026-11-03/runs/`, the same sea), its clock, ledger and meter from this
probe's light runs (`runs/old-*.txt`).

| Bar (the ruling's value) | a38, 1.5 m | a38, 1.8 m | pool's cases, 1.5 m | pool's cases, 1.8 m | Old (main's build) | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Support − solver ≥ −0.02 m on 100 % of face reads (0.05–1.0 H_s) | 100.0 % (min −0.000 m) | 100.0 % | 100.0 % | 100.0 % | 98–100 % of reads at 0.3–0.7 of the face are > 0.1 m under; mid-face −0.64 / −0.80 m (pool), −0.60 / −0.79 m (a38) | **Pass** |
| 2. No lone board drops > 0.1 m; prone riders on at 3 s within 1 of the solver-only A/B | boards under the game's support 34 of 50 (solver alone 0), under the solver's surface 29 of 50 (0); prone on 6 of 50 (42) | boards 68 / 55 of 88 (1 / 1); prone 12 of 88 (64) | boards 37 / 26 of 52 (0 / 0); prone 12 of 52 (45) | boards 58 / 41 of 80 (0 / 0); prone 15 of 80 (57) | open tube only: boards under the solver's face 8–24 of 16–24 (solver alone 0); prone on 3–7 of 16–24 (15–24) | **Fail** |
| 3. Lower faces: \|case − solver\| over 0.05–0.4 H_s through life 0.6: p50 ≤ 0.05 H_s, p95 ≤ 0.15 H_s | 0.065 / 0.273 | 0.089 / 0.331 | 0.077 / 0.274 | 0.093 / 0.299 | the piece's mid-face 1.8–2.4 m behind the solver's | **Fail** |
| 4. Rise ≤ 0.02 m a step at points fixed in the wave's frame; never under the solver | p50 0.013, p99 0.40 m; 17.3 % of steps over; under 0.0 % | 0.015, 0.46 m; 19.8 %; 0.0 % | 0.009, 0.32 m; 15.5 %; 0.0 % | 0.011, 0.37 m; 17.5 %; 0.0 % | under the solver by 0.3–1.1 m (the hole) | **Fail** (rise); pass (never under) |
| 5. Air under the lip, life 0.1–0.8: > 0 on ≥ 90 %; p50 within ±30 % of the case's own; 1.8 / 1.5 m ratio 1.1–1.45 | > 0 on 99.2 %; 0.20 / 0.48 / 0.70 m, own 0.65 m (0.73) | 98.8 %; 0.28 / 0.59 / 0.88 m, own 0.82 m (0.72); ratio 1.23 | 79.3 %; 0.00 / 0.21 / 0.44 m, own 0.36 m (0.58) | 78.5 %; 0.00 / 0.27 / 0.56 m, own 0.43 m (0.62); ratio 1.29 | the void 0.08 / 0.10 m (pool), 0.48 / 0.64 m (a38), inside the solver's water (filled 1.5–10×) | **Pass** (a38); **fail** (pool's cases) |
| 6. Touchdown: solver's breaking ≥ 0.3 within ±0.5 H_s on ≥ 90 %; 0.6–1.5 H ahead of the drawn crest | 88.5 %; 1.02 H_s (within 98.4 %), 0.93 drawn H | 86.9 %; 1.08 H_s (97.4 %), 0.98 drawn H | 93.6 %; 1.79 H_s (2.4 %), 1.75 drawn H | 90.3 %; 1.92 H_s (1.8 %), 1.82 drawn H | the tip 0.82–1.05 m ahead of the crest, 0.17–0.57 m under the solver's surface | **Fail**: a38 on breaking (by 1.5–3 points), the pool's cases on distance |
| 7. Clock after the throw p50 0.95–1.05×, p95 ≤ 1.25×; open in solver time within ±15 % of the case's | 1.000 / 1.250× (16.7 % at the cap); open 0.68 s against 0.70 (97.7 % within) | 1.000 / 1.250× (15.1 %); 0.76 s against 0.79 (99.3 %) | 1.000 / 1.250× (9.3 %); 1.22 s against 1.25 (100 %) | 1.000 / 1.250× (7.5 %); 1.37 s against 1.40 (100 %) | per point 1.000 / 1.01–1.08×, max 2.0×; in a column 1.76–2.03 s of τ a second | **Pass** |
| 8. No holes or folds; ray advance ≥ 0; \|dδ/dσ\| p95 ≤ 0.3; saddle ≤ 0.1 H_s | folds 0.54 a build, holes 0.061; advance ≥ 0.0039 m; 0.172; saddle 0.096 H_s (p95 0.227) | folds 1.35, holes 0.180; 0.0034 m; 0.263; 0.089 (0.223) | folds 1.03, holes 0.343; 0.0024 m; 0.173; 0.064 (0.177) | folds 1.18, holes 0.243; 0.0043 m; 0.235; 0.053 (0.170) | not measured (the light runs build no reads) | **Fail** (holes, folds, the saddle's p95); pass (advance, slope, the saddle's p50) |
| 9. *(Dropped, 2026-11-04.)* The lip's water on a placed rider's head or torso before touchdown, and of those, falls within 0.5 s | standing 3 → 3 fell; prone 0 | standing 11 → 9; prone 1 → 1 | standing 4 → 1; prone 1 → 1 | standing 2 → 0; prone 2 → 2 | 3 of 160 placements in the tube | Information: 17 of 24 fell within 0.5 s under the drag rule |
| 10. The ledger within ±5 % of main: jets thrown and poured; the meter's H | 412 jets, 181.8 of 192.2 m³; meter 1.592 m (main 1.633: −2.5 %) | 463 jets, 331.6 of 353.4 m³; 1.885 m (1.982: −4.9 %) | 379 jets, 117.2 of 118.8 m³; 1.612 m (1.633: −1.3 %) | 388 jets, 193.4 of 197.5 m³; 1.897 m (1.992: −4.7 %) | 0 jets in the 12 periods (see above) | Meter **pass** (the 1.8 m runs at the edge); jets **fail**: main throws none |
| 11. Pin check: identical for every other spot; two pool runs identical | Against main 135782d6 (`runs/pin-main.txt`, `runs/pin-branch.txt`): 17 of 20 lines identical: the ten water-only seas (beach, point, reef, Padang, Canyon, the pool's four Training seas, its A-frame), the three other swept barrels (Padang; the Canyon, tube on; the Reef), and the Barrel with the old switches on both case lists at 1.5 and 1.8 m. Only the Barrel's default differs, as intended (a38 under the face ruling: 39 / 77 jets in 240 steps against main's 2 / 6). Each tree's two default runs are identical. | | | | | **Pass** |
| 12. Cost on the M1 and the M4 Pro | COST_ROW |
| 13. Ride-camera strips at the throw, mid-open and touchdown | Not made: a ride camera needs the page's renderer (WebGPU in a browser), and the owner ruled out the browser pane and the dev server for this work. The headless frame probes write top-down maps only. | | | | | **Not measured** |

**Against the ruling's expected values** (`advisor-ruling.md`, "What the owner will see"):

| | Expected | a38, 1.5 / 1.8 m | pool's cases, 1.5 / 1.8 m |
| --- | --- | --- | --- |
| The wall over today's slope at the throw (\|τ\| < 0.1 s; each read's most support − solver over the solver's face points, a lower bound) | 0.75–0.9 / 1.0–1.2 m (pool case: 0.76 / 1.02) | 0.83 / 1.01 m (p10–p90 0.50–1.13 / 0.71–1.32) | 0.73 / 0.85 m (0.43–1.00 / 0.59–1.12) |
| ...and before it (τ −0.5…−0.1 s) | growing over 1.7–1.9 s from ≤ 0.07–0.10 m | 0.50 / 0.60 m; each point first seen 0.29 / 0.30 s before its throw on its clock (1.00 / 1.03 s before in solver time) | 0.42 / 0.49 m; 0.29 / 0.30 s (0.98 / 0.95 s) |
| Air under the lip (p50, life 0.1–0.8; in the open tube, life 0.3–0.6) | pool case 0.2–0.45 / 0.4–0.6 m; a38 0.5–0.7 / 0.7–0.9 m | 0.48 / 0.59 m; open 0.59 / 0.72 m | 0.21 / 0.27 m; open 0.22 / 0.31 m |
| Open (per point, τ 0 → touchdown, solver time) | pool case 1.24 / 1.40 s; a38 0.70 / 0.79 s | 0.68 / 0.76 s | 1.22 / 1.37 s |

- **The wall** stands where the ruling foresaw at a38 and a little low at the pool's cases. It doesn't grow from the case's
  earliest frame: each point's clock starts 0.29–0.30 s before its throw (its fitted start, as step 2's), so slices form
  over the fallback's ramp (0.85 / 0.96 s) and the wall is already 0.4–0.6 m high 0.1–0.5 s before the throw.
- **The air** is the case's own less about 30 % at a38 (the ratio 0.72–0.73, inside the bar) and 40 % at the pool's
  cases (0.58–0.62, outside it): the union raises the floor under the lip to the solver's surface.
- **The open time** follows each case's own to within 2–4 %.
- **Bar 2, the bodies.** The support never lies under the solver's surface (bar 1), so this is not step 2's hole. The
  case's wall and lip stand 0.5–1.1 m over the solver's slope where bodies placed at 0.3 and 0.6 of the solver's face go
  with no input: the game's support over the solver's under the boards reaches 0.4–1.1 m (p50 of each group's most), and they
  end up under it (overrun) and under the solver's surface by up to 0.2–1.6 m (p90; driven under by the curl's water,
  which drags and doesn't float). On the solver's water alone they stay on. *Inferred:* bodies with no input drift up the
  face as the wave overtakes them, into the case's wall; the ruling foresaw the pitch above half height at the throw, but
  it reaches bodies placed at 0.3 too. A rider's own line is the owner's test.
- **Bar 4, the rise.** The largest rises (0.4–0.9 m in a step; the first 40 over 0.2 m in each run) are 0.5–2.5 m up the
  face from the solver's 0.3 crossing, mostly within 0.4 s of the throw (τ −0.4…+0.3 s for 21–34 of the 40), at full slice
  weight. *Inferred:* the case's near-vertical wall passing a point fixed in the wave's frame. The support is
  single-valued, so a steep wall's arrival reads as a rise; whether the bar applies under a wall is a question for the
  advisor.

## What the bigger tube needs (from these numbers; not started)

The owner's Barrel goal (pool-barrel, 2026-11-01): 1.5–1.8 m faces with a 1–1.2 m open tube for 2–3 s per arm.

- **Air:** a38 gives 0.48 / 0.59 m under the lip (0.59 / 0.72 m in the open tube) and the face anchor keeps 0.72–0.73 of
  the case's own gap. So 1–1.2 m under the lip needs a case whose own gap is about 1.4–1.7 m at these faces: about twice
  a38's at 1.8 m (0.82 m). *Inferred from the ratio.*
- **Open time:** 0.68 / 0.76 s a point at a38, 1.22 / 1.37 s at the pool's cases. Each follows its case within 2–4 %, so
  the open time comes from the case: 2–3 s is about 3× a38's.
- **Where it lands:** a38's tip lands 1.0–1.1 H_s ahead of the drawn crest (inside 0.6–1.5 H, as Surf Ranch's 0.9–1.0 H),
  where the solver breaks on 87–89 % (the bar is 90 %). The pool's cases land 1.8–1.9 H_s out, where the bar fails. The
  bigger tube's case should land as a38's does.
- **The lower face:** the case's lower face sits 0.06–0.16 m under the solver's at 0.2–0.3 H_s in the open tube (p50; bar 3:
  p50 0.065–0.093 H_s over 0.05–0.4 H_s). The union lifts it to the solver's, so the board rides the solver's face there. Runs on the game's own reef sized by the game's crest (the ruling's A0 ≈ 0.19 / 0.245) should
  match it closer. *Inferred.*
- **The wall:** a bigger tube means a bigger wall over the solver's slope (0.83 / 1.01 m at the throw at a38 now). Bars 2
  and 4 already fail on today's wall: what bodies and riders meet there grows with it.
- **Formation:** slices start 0.3 s before the throw on their clock, not at the case's earliest frame (1.7–1.9 s), so the
  wall appears at 0.4–0.6 m. A bigger case makes that step bigger.

## The owner's shot list

Wave Pool → Waves: **Barrel**, at **1.5 m** and at **1.8 m** (dev build, so the URL switches are read). Record each.

1. **The default (a38).** Start where the game puts you and take off on the straight right-hander from the +x wall.
   - **Where to sit:** set your line in the lower third of the face, below about 0.4 of its height. There the board is on
     the wave's own water. From mid-face up stands the case's wall (0.5–0.8 m over the slope in the probe's reads); a board
     there is lifted into it and pitched.
   - **Under the lip:** air about 0.5 m at 1.5 m (a crouch only just fits) and about 0.6 m at 1.8 m (0.7 m mid-tube); each
     piece of the tube stays open about 0.7 s, peeling down the line at about 8 / 10 m/s.
   - **On the face:** does the board hold, or drop, as the wall stands up and throws? Watch for a step in the water as the
     wall arrives (bar 4's rises), and where the lip lands: about 1–1.1 face heights ahead of the crest.
   - **The lip:** when it hits your head or shoulders, do you stand or fall? There is no forced wipeout, only the drag
     rule (in the probe, 17 of 24 placed riders hit there fell within 0.5 s).
2. **`?poolTubeCase=pool`** (the pool's own runs). The same, with a thicker, lower curl: air about 0.2 m at 1.5 m and
   0.3 m at 1.8 m (no room to crouch), open longer (1.2–1.4 s), its lip landing further out (about 1.8 face heights).
3. **`?tubeFace=old&tubeFrom=piece`** (the build before, main's tube). The fitted piece as you rode it on 2026-11-03: the
   hole under the face (the support 0.3–1.1 m under the wave's water). Add `&poolTubeCase=pool` for main's case exactly.
4. Things to say for each: where you fell and why, how the face felt under the lip, whether the tube looked like the
   wave's own water, and whether the 1.8 m tube felt bigger than the 1.5 m one.

## How to verify

- **Types:** `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- **Tests:** `src/game/PhysicalMode.test.ts` (the switches; `?poolTubeCase` and the face's), `src/game/PhysicalMode.barrel.test.ts`
  (the fetch: the default and a38 once, the pool's own apart), `src/wave/barrel/poolTube.test.ts` (the default case),
  `src/wave/barrel/faceAnchor.test.ts` (the ruling's parts); then the main suite and the SZS subset (`TEST_COUNTS`).
- **The bars:**
  `PROBE=1 H=1.05 CASE=a38 LOG=runs/face-a38-1.05.txt npx vitest run src/wave/probes/poolTubeFace.probe.test.ts --maxWorkers=2`
  - `H=1.32`; `CASE=pool`;
  - `SWITCHES=tubeFace=old,tubeFrom=piece` for the build before (with `LIGHT=1 BODIES=0`, the ledger alone);
  - `BODIES=0`, or `BODIES_ONLY=1` (bars 2 and 9 alone); `PERIODS`; `COST=1` (bar 12's A/B).
  - The probe reads each list by name (`CASE`), whatever the game's default.
  - `runs/face-*.txt` are this head's four full runs. `runs/bodies-a38-1.05.txt` repeats the a38 1.5 m bodies with the
    fall through the solver's face measured apart (added after that full run; the other three full runs have it).
- **The pin check:** `pin-face.ts` (its header has the command): bundle against main and the branch, then compare. Main's
  tree can be a `git archive` of `origin/main`'s `src` with `node_modules` and `public` linked in.

## What was built

The ruling is built as written, at the Wave Pool's straight Barrel only. Where it left something open, the choice is
marked *(built so)*.

### 1. The face anchor (`src/wave/barrel/faceAnchor.ts`; `sweptLoft.ts`, `crashCurve.ts`)

- **The match:** each front point's case stands so its lower face's crossing at 0.3 of its height over its trough sits
  on the solver's at 0.3 of its own (`FaceAnchor.shift`).
  - The solver's surface is read every 0.25 m along the point's ray, from 1 m behind it to 3 H ahead. Its trough is the
    lowest read; its crest is the highest before the trough.
  - The case's crossing is searched from its crest before the throw and from its throat after it (from the crest if
    there is none from the throat).
  - From life 0.5 the crossing runs on at its mean speed over life 0.3–0.5.
- **The shift:** the result is where the case's crest stands along the ray from the point. It is smoothed along σ with
  the clock's biweight, over the front's points, and interpolated to each slice. The profile's origin is
  `S + (δ − c) n`, in place of `S − c n`.
  - With no clean crossing the crest anchor stands (counted).
  - *(Built so)* The crossing is taken from the shape the slice draws: a `contact` hold freezes it at its clear frame,
    so a held shape moves with its point.
- **The anchor's motion** (the lip's flow): `Ṡ − ẋ_c n`, from the case's crossing's speed. It is 0 for a held shape.
- **The crash** places its slices, landings and footprints by the same smoothed shifts (`CrashCurve.prepareShifts`), so
  the pour lands where the drawn lip does.

### 2. The support (`sweptLoft.ts`, `PhysicalSurfWater.ts`)

- **The loft:** its floor vertices never lie under the solver's surface: the back slope, the face from the throat on,
  the extensions, and the whole profile before it overturns. The lip's vertices are left as they are.
- **The water** is the union (`PhysicalSurfWaterOptions.sweptUnion`):
  - under the solver's surface, a point is in water;
  - over it, the swept surface answers, its floor raised to the solver's where it lies under it;
  - `surfaceAt` is the higher of the two.
- **The forward rest** is unchanged: it now ends at once and stays only as a guard.

### 3. The clock (`sliceClock.ts`)

A thrown point's clock catches up at 1.25× at most (`OnsetTiming.thrownRate`; 2× elsewhere and with `?tubeClock=old`).

**The trace the ruling asked for:**
- Measured per point (id), step to step, the clock already ran at 1.00×: p50 1.000, p95 1.013, 1.3 % of steps at the
  2× cap, with the build before.
- The 1.8–2.0× of step 2 was τ against time at a fixed reef column.
- The front's points move along their solver columns (x fixed, z shoreward), and the crest lines lie 7–13° off the reef.
  So a point's reef s grows by about 3 m/s, and a fixed column meets points that threw earlier.
- No τ feedback through the crash's pace was found.

### 4. The lagged join (`BreakingFront.ts`, `sliceClock.ts`, `barrelSpots.ts`)

- **The join** (`FrontOptions.lead`): a sized crest joins 0.45–0.50 m deeper than its throw depth (`POOL_LEAD`, linear in
  the foot crest), whether or not the solver breaks it yet. It is `unbroken` until the solver does.
- **The throw** is at the later of its crest's throw-depth crossing and the solver's break. Until then its clock holds
  just short of 0.
- **The guard** (`LEAD_RETIRE`): unbroken 0.3 s past its own foreseen throw, it retires over 0.5 s (the record's `fade`)
  and leaves the front.
- **The throw depth** *(built so)*:
  - The pool's line through its two runs is clamped to their foot crests. Every game crest (0.84 / 1.08 m) therefore
    threw at 2.19 m, 0.7 m deeper than the drawn case goes vertical at its size (1.51 / 1.94 m) and than the solver's
    white (1.43 / 1.91 m).
  - With zero lag that was harmless (the join was at the white). Under the lag it held every slice frozen before its
    throw for about 1.5 s, and the guard retired most of them: in the first measurement no jet was thrown in 20 s.
  - So in lag mode, under the small run's foot crest, the depth is the small run's scaled by Froude with the foot crest
    (`throwDepth.froude`).
- **The fallback's formation ramp** *(added)*:
  - The clock's fit along σ starts a new point near its neighbours' clocks (τ −0.4–0 s), not at its case's earliest frame
    (−1.7 s). Measured from first seen to its throw, a point's lead is 0.7–1.35 s.
  - So each joined slice forms over the ruling's fallback ramp, 0.85 / 0.96 s (`poolRamp`), as well as being lagged.

### 5. Thrown ends

A thrown front end blends over at least its height H, as a young end does (`endBlendLength`'s `thrownEnds`).

### 6. Overlapping pieces *(added)*

- **The problem:** the guard splits a front where a point retires unbroken. Its leading piece, not yet thrown, then sat
  over the thrown front's end, and the loft's "first front wins" cut 0.5 holes a build out of the tube.
- **The rule** (face ruling only): a thrown strip wins over an unthrown one, and otherwise a weaker earlier strip gives
  way.

### 7. The switches (`SurfZoneConfig`; the page and the worker alike; online rooms pin the defaults)

All are read only at the Wave Pool's Barrel (`surfZoneConfigFor`, `src/game/PhysicalMode.ts`), and only with the dev
tools on.

- `?tubeFace=old`: no clamp and no union. The support is the loft's floor wherever the loft is.
- `?tubeFrom=piece`: the fitted piece as before, in full: the crest anchor and the forward rest, the join at the white
  with zero lag, the 2× clock, thrown ends over 1 m.
  - With `?tubeFace=old` it is main's build before this branch, byte for byte (`tubeFaceOf` returns none), on whichever
    case list is drawn; add `&poolTubeCase=pool` for main's exactly.
  - *(Built so)* `tubeFrom=piece` takes the lag and the clock with it: otherwise the two old switches could not give
    the build before.
- `?tubeLag=0`: the join at the white, zero lag.
- `?tubeClock=old`: a thrown clock catches up at 2×.
- `?poolTubeCase=pool`: the tube drawn and felt from the pool's own two level-13 runs (`POOL_TUBE_CASES`), the default
  until 2026-11-04. `?poolTubeCase=a38` names the default.

### 8. The default case (the owner, 2026-11-04)

- `PoolTubeCase` is `'a38' | 'pool'`; `DEFAULT_POOL_TUBE_CASE` is `'a38'` and `poolTubeCaseOf` resolves an unset config
  to it (`src/wave/barrel/barrelLibrary.ts:61–69`). `barrelCasesFor('pool')` lists the a38 unless the config says
  `'pool'` (`:75`).
- `poolTubeCaseSwitch` reads `?poolTubeCase=pool` and `?poolTubeCase=a38` (`src/game/PhysicalMode.ts:538`); the page
  fetches the default and `a38` once, and the pool's own apart (`barrelCaseBytes`, `:703`).
- Online rooms set `poolTubeCase: undefined` with the tube face's four switches (`src/main.ts:527`): the default on every
  client.
- The node reader takes the case too (`readBarrelCases(spot, entries, poolTubeCase)`,
  `src/wave/barrel/nodeBarrelCases.ts:11`); the probes and the pin check name their lists.
- The spot's own timing stays the pool's (the throw depth, the lead, the ramp): only the drawn and felt case changes, as
  `?poolTubeCase=a38` did before.
