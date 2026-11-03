# The Wave Pool Barrel's surfable tube: steps 4–6, the face anchor (2026-11-03)

Steps 4–6 of the surfable-tube plan (`docs/superpowers/plans/2026-11-03-pool-surfable-tube.md`): build the water-physics
advisor's step 3 ruling (`advisor-ruling.md`, also the consult log's top row) and measure its 13 bars. Branch
`claude/pool-tube-face` from `claude/pool-tube-hole` (33e6a371, on main 4eee1e5f). No rider sessions, catch reports or
autopilot checks were run.

## Where it stands

- **Built (pool only, behind `BarrelSpot.faceAnchor`; every other spot unchanged):**
  - the face anchor;
  - the support's union;
  - the lagged join, with its retire guard and the fallback's formation ramp;
  - the capped thrown clock;
  - thrown ends blended over their height;
  - the four switches.
- **Measuring:** the full runs (1.5 and 1.8 m, the pool's cases and a38, 12 periods; the old switches for the ledger).
- **Found on the way:**
  - The pool's throw depth was clamped to the runs' foot crests (2.19 m), deeper than where the drawn case goes vertical
    (1.51 / 1.94 m). The lagged join keys on it, so in lag mode it is scaled by Froude.
  - Step 2's "the drawn clock runs at 2×" was a measurement of a fixed reef column, not of the clock: each point's clock
    runs at 1.00× (p95 1.01 before the change).
  - Points travel along the reef as they come shoreward, so a fixed column sees a tube pass in about half its life.

## Next steps

1. Fill in the bars from `runs/`.
2. The pin check against main; the tests; ride-camera strips.

## How to verify

- **Types:** `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- **The bars:**
  `PROBE=1 H=1.05 CASE=pool LOG=runs/face-pool-1.05.txt npx vitest run src/wave/probes/poolTubeFace.probe.test.ts --maxWorkers=2`
  - `H=1.32`; `CASE=a38`;
  - `SWITCHES=tubeFace=old,tubeFrom=piece` for the build before (with `LIGHT=1 BODIES=0`, the ledger alone);
  - `BODIES=0`; `PERIODS`.
- **The pin check:** `pin-face.ts` (its header has the command): bundle against main and the branch, then compare.

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

- `?tubeFace=old`: no clamp and no union. The support is the loft's floor wherever the loft is.
- `?tubeFrom=piece`: the fitted piece as before, in full: the crest anchor and the forward rest, the join at the white
  with zero lag, the 2× clock, thrown ends over 1 m.
  - With `?tubeFace=old` it is today's build, byte for byte (`tubeFaceOf` returns none).
  - *(Built so)* `tubeFrom=piece` takes the lag and the clock with it: otherwise the two old switches could not give
    today's build.
- `?tubeLag=0`: the join at the white, zero lag.
- `?tubeClock=old`: a thrown clock catches up at 2×.
