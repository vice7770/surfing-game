# Ruling 16: `?poolSize=ref` after the lip count on the game's path (2026-11-11)
Tags: [M] measured (step3/ files; or here: three small reads of the case files and one solver run, `--ref --no-library
--until 180`, outputs `r16-*` beside this file), [C] code at e80f09b6, [KB], [R] reasoned, [U] recalled, [P] provisional.

## 1. The cause
**The missing water (0.86) is a fault in one frame of the `big` case, not a starved wave.**
- The crash asks `prospectiveJetArea x width x endWeight` (`SweptCrash.ts:532`); on the pool's raw path that area is the
  case's HELD frame's jet, x scale squared (`crashCurve.ts:311-316`, `:517-523`) [C].
- `periodic-pool-straight-big-l13` holds at frame 176 (`heldFrame`, `ProfileLibrary.ts:204-217`). Its jet reads
  **0.0754 h0²**; frames 172-175 read 0.0314, 0.0322, 0.0329, 0.0336 [M]. In frame 176 the underside (points 64-88) has
  dropped onto the face: the lip has rejoined, and `overturnAt` counts jet + void (0.0336 + 0.0402 = 0.074) [M, R].
  It passes `CLEAR`'s two tests all the same. Every other case steps x 1.02-1.16 into its held frame; this one x 2.24 [M].
- Check against the source: Pick & Feddersen's fit for this run is A_J = 0.118 H_I² = 0.036 h0² (pool-tube-runs
  `barrel-cases.md`) [KB, modelled]. Frame 175 agrees (0.0336); frame 176 is twice it.
- The ask follows exactly: (0.0754 / 0.0422) x (3.34 / 3.43)² = 1.69; measured 1.66 (1.178 against 0.710 m³ a jet) [M].
  So it is not 1.11³ against 1.11²: the scale is nearly today's (3.34 against 3.43 m).
- `SOURCE_SHARE` 0.2 (`PlungingLip.ts:100`) then refuses the excess, as it should: the crest gives 0.87-1.06 m³ a jet [M].
  With the right jet the ask is about 0.53 m³ a jet (585 m³ in the window), under what the crest gives [R].
- Even so, ref takes 1.9 x the right water off each crest and pours it 0.85 s later. That may feed the reef's fastest
  water (7.60, then 6.24, 5.69 m/s per 100 s; the copy of today would be 5.85, 5.47, 5.22) and the fold [R, not traced].

## 2. Answers
1. **Bar A, 2.23 m.** Not yet a miss that matters; do not change the build for it.
   - The library's rise is the lip's path, not the config: the game's config WITHOUT the library reads 2.13 m (12 waves,
     60-180 s), the same as step 2's hand-built one; with the library 2.24 m [M]. Spreading 24 against 1000 does nothing.
   - Why [R]: the fallback lip cuts each crest at its onset and lands the water in the trough ahead; the crash throws
     later, and on s 20-40 on only 21 % / 81 % of points. The game's path is the true reading.
   - An exact copy of today must read today x 1.11 = **2.08 m**. Ref reads 7 % over it because it is not yet a copy:
     the lengths along the line are unscaled, so the convex start is 11 % shorter than the copy's [R].
   - Which "2 m": the **drawn tube at the throw** (1.92 m, what the player sees and hits) with the platform wave (2.05 m).
     The onset face is a per-wave maximum of the solver's water; keep it as the copy's check. Restated in section 4.
2. **The water share.** Section 1: a measuring fault, real only as a symptom. Fix the frame, do not raise the share
   cap and do not restate the bar to 0.86. `paceFast` 23 is 2 % of throws, each clamped to 1.5 x the long-wave speed as
   designed; it does not matter. Report it; ask again above 5 %.
3. **Bar B's count.** The line's end sits ON the bar's mark in both seas: today's lines end at u 147-152 (mark 145), ref's
   at u 127-142 or u 168-200 [M]. So 18 of 21 against 12 of 20 is a 10-20 m shift of one gap, not a lost peel.
   - What ends them [R]: the foot crest falls along the reef (1.21 m at s 65 to 1.01 m at s 150) and varies wave to wave
     (0.86-1.20 m at s 120); the low ones leave a gap near u 115-145 that the tracker reads as the end. Runs of long and
     short lines (not alternating) point to a slow change in the wrapped window, not to the lip: the library-less run
     breaks the same way (6 of 13 to u 145) [M].
   - Along-line x 1.11 plausibly fixes it by similarity: a true copy must end where today ends, x 1.11 = u 163-169 [R].
     Yes, move the stretch with the reef: **u 72-161**.
4. **Order.** Below. Ruling 15's step 2 (the join row) needs no build: `onsetTiming` already scales the 10 s row by the
   foot, lengths x 1.11 and times x 1.054 (`sliceClock.ts:217-248` through `poolRefBarrelSpot`, `barrelSpots.ts:368`) [C].
5. **The default.** Section 5.
6. **Code against the rulings.** (a) the held frame, section 1. (b) `poolRefConfig` forces `poolTubeCase: 'big'`
   (`PhysicalMode.ts:405`) and `?poolTubeCase` cannot override it: my ruling 13 asked for that, but it undoes the owner's
   call of 2026-11-04 (a38, for the larger void) without asking. Call 1. (c) `POOL_FRONT_REACH.behind` 30 m is a length
   across the line; it should already be 33.3 under ref. (d) `TUBE_SEAM.tau` and `.thrown` are fixed seconds
   (`tubeSeam.ts:16`), 5 % short under ref; opt-in, small. (e) the probe reads u and the knots from `POOL_STRAIGHT`.

## 3. First choice: two small builds, one run each (ref only; the default byte-identical)
| Rank | Build | Numbers and places | Decided by |
|---|---|---|---|
| 1 | The held frame's test | `heldFrame` (`ProfileLibrary.ts:204-217`): also refuse a frame whose jet area is over **1.25 x** the frame before's [P]. `big` then holds at frame 175 (jet 0.0336 h0²); the 12 other cases keep their frame (x 1.02-1.16) [M]. Better still, trace frame 176 in the case tool (30 frames were refilled) | D's water share; F; stills |
| 2 | Along-line lengths x 1.11 | `POOL_REF.crestProfile` (`pool.ts:529`): [[0, 5.0], [33.3, 1.78], [72.2, 1.0], [194.3, 1.0], [227.6, 2.2], [260.9, 5.0]]; `startX` 127.7 (new in `POOL_REF`; `poolStraightFrame` / `poolStraightAt`, `pool.ts:456-467`, and the knots read at `:648`, must take it); `startZ` -221 kept [P]; `takeOffS` 44.4 (`:433`); front reach **22.2 / 111 / 33.3** as the ref spot's own `frontAt` (`barrelSpots.ts:298, 328, 368`); `POOL_WINDOW_RANGE`'s note (reef now x -72 to 128); the probe's u, knots and windows from `POOL_REF` | A, B, C, D per bin, the line's end |
| 3 | Probe only: ref with a38 | let `?poolTubeCase` win over `'big'` in the probe; predicted tube 1.18 / 0.31 x 0.592 = 2.25 m, ask 0.9 m³ a jet [R] | call 1 |
| 4 | Onset clock by break line | ruling 15's step 4, unchanged; readouts only | meter, peel readout |
Then `?tubeForm=early` and the colour, as ruling 13. Keep 1 and 2 as two runs (one PR is fine): 1 changes the water B and F
are read on. Build 2 puts the reef's end 17 m nearer the beach (z -53 against -70): read the second line there first.

## 4. The bars, re-stated (all on `step3/crash-probe.ts`, the game's path, CPU, 60-270 s, about 20 waves)
- **A1, the tube.** Drawn trough-to-lip height at the throw, s 22-111, median **2.0 +/- 0.1 m** (now 1.92: pass).
- **A2, the copy.** Reef's largest onset face, take-off 44.4 +/- 10 m of x: **2.08 +/- 0.10 m** (today 1.87 x 1.11). Now 2.23.
- **B.** u 72-161: median **6.3-7.2 m/s** (the copy is 6.25 x 1.054 = 6.59) from at least **15 of 20** waves; the line's end
  median at least u 160. Apart: u 44-72, the halves.
- **C.** First break 1.63 x 1.11 = **1.81 +/- 0.15 m** deep (today on this path reads 1.63, not 1.83). Now 1.78: pass.
- **D.** Points that threw on s 22-111 at least 90 %; thrown / asked at least **0.95**, no 10 m bin under 0.90
  (today 0.974, least 0.945); missed 0, lost 0; `paceFast` under 5 % of throws.
- **E.** As ruling 14 (height shares; slopes cannot change). **F.** Reef at most 8.02 m/s (accepted at the limit), finite;
  swash finite, not growing. After build 1 report the reef's per-100 s values against 5.85 / 5.47 / 5.22.
- **Drift.** 480-600 s within +/- 10 % of 60-180 s, once A1, A2, B, D and F pass.

## 5. Before `?poolSize=ref` becomes the default
All of: A1, A2, B, D, F and the drift bar pass on the game's path after builds 1 and 2; stills at 91 s and 151 s show
no fold at the tube's leading end; the GPU periodic solve runs nx 311 and its bars agree with the CPU's; the Canyon
hash check and fps trace are unchanged; the owner has ridden it on the M4 and answered calls 1-3. The switch itself
changes online rooms' sea and the default's snapshots, so it is its own PR. Tell the owner at once if, after build 2,
A2 is over 2.25 m, B's count is under 12, or D's share is under 0.90: then the copy is not behaving as one.

## 6. Must not
- Do not raise `SOURCE_SHARE`, scale the ask, or restate D to pass 0.86. Do not edit the case's frames by hand.
- Do not change the factor, the feed or the direction for A; do not move `POOL_FRONT_REACH.to` past 111 by hand.
- Do not change `heldFrame` in a way that moves any other case's frame (check all 13; list above).
- Do not judge B's count on u 65-145 again: the mark sits on the line's natural end.

## 7. Not settled
- Whether frame 176 is the tool's landmarks or the run's own topology; frame 175's void height (0.073 h0 at 176 is suspect).
- The fold's cause: the held frame is now the first suspect, the unscaled lengths the second [R].
- Why the foot crest falls 17 % along the reef and swings wave to wave; the 600 s current (-0.14 m/s and growing).
- Whether 1 m cells break the copy (they do not scale): build 2's A2 and B answer it.
- `startZ`: kept, so the reef's end nears the beach; -238 would hold the end at z -70 but nears the machine [R].

## 8. The owner's calls
1. **The tube's case at 2 m.** `big` is the pool's own run (tube 1.92 m, a low void); a38 is your choice of 2026-11-04
   (predicted 2.25 m, about twice the air under the lip). Ref switched to `big` on my ruling 13 without asking you.
2. **Which number is "2 m".** I propose the drawn tube and the platform wave; the take-off face then reads about 2.1 m.
3. **The longer ride.** Build 2 carries the white line to about u 165, but the tube ends at s 111: past it the reef
   plunges on under three waves in four [M, step 2], so the last 50 m is a white shoulder with no lip. Enough, or
   should the tube's length be the next generator question?
