# The Wave Pool Barrel's surfable tube: step 7 follow-up, the contact's nearest surface (2026-11-05)

The step 7 follow-up of the surfable-tube plan: build the water-physics advisor's second ruling
(`docs/research/pool-tube-wall-2026-11-04/advisor-ruling-2.md`) on a38 at the Wave Pool's straight Barrel, and measure it.
Branch `claude/pool-tube-contact` from main 108d97c3. No rider sessions, catch reports or autopilot checks were run, and no
browser pane or dev server: the bodies in the bars are placed on the water by the probe with no input.

<!-- STATUS -->

<!-- TABLE -->

## What was built

The ruling's changes, at the Wave Pool's straight Barrel only (`BarrelSpot.faceAnchor`), each piece behind its own switch,
all on by default. Where the ruling left something open, or a measurement showed its words needed a frame, the choice is
marked *(built so)* with its cause. Only + − × ÷ and √ throughout (online determinism); `BoardBody` is unchanged.

### 1. The contact's nearest surface (`?tubeContact=old` turns it off)

- **The cast** (`SweptContact.nearestSurface`, `src/wave/barrel/sweptContact.ts:423`, called at `:410`): at a point in the
  case's water with no water floor (the wall), a horizontal ray shoreward along the strip's interpolated ray, at the point's
  height, within `NEAREST.reach` 1 m (`:143`), through the strip's existing 0.5 m buckets (Möller–Trumbore on each quad's two
  triangles). The first crossing ahead gives its normal (the loft's vertex normals by its barycentrics), its surface's
  velocity along the ray and up (`wall.along`/`wall.up` by the same weights) and its place.
- **The choice** (`:508`): the crossing above's depth along its own normal, d_v |n_y| (`verticalDepth`), against the face
  ahead's, d_h |n_a| (`aheadDepth`); the face ahead's share `aheadWeight` is a smoothstep over ±`NEAREST.blend` 0.05 m of their
  difference, and `normalDepth` the blend.
  - *(Built so)* the crossing above also answers along its normal (d_v |n_y|), not vertically: on a plane face the two are
    the same distance, and a vertical d_v blended with d_h |n_a| would read 1.5× the true depth at a 60° plane.
  - *(Built so)* the face ahead also fades out over the cast's last 0.1 m (`NEAREST.fade`), so its answer never steps where
    the face leaves the reach (a body more than about 0.9 m inside the wall).
  - The vertical answer's own fields (`surfaceY`, the normal, `wallAlong`/`wallUp`) are left as they were; the new fields sit
    beside them (`ContactHit.normalDepth`, `.aheadWeight`, `.ahead…`, `:113–136`).
- **The water** (`PhysicalSurfWater.nearestSurface`, `src/physics/PhysicalSurfWater.ts:733`; `sweptNearest`, `:158`, set at
  `:400`): in the wall over the solver's surface (`:710`), and under it where the case's surface stands over it (`:688–696`,
  where `inWall` is now set too), the face ahead's share is kept only where the solver's surface at the face ahead stands under
  the point's height (faded over 0.05 m: else the solver's water goes on past that face), then the two answers are blended:
  `surfaceY = y + depth` along the normal, the blended normal with the existing slope clamp (`MIN_NORMAL_Y` 0.5), and the
  blended surface velocity for the wall's water. The cell weights the flow reads are restored after (`:470`).
- **The kinematic fade** (`wallWaterFlow`, `WALL_WATER.fade`, `:916`, applied at `:944`): the wall water's normal component
  goes linearly from the case's surface's own normal speed at 0.3 m along the normal to the solver's at 0.6 m (inferred, as
  the ruling).

### 2. The anchor's cap (`?tubeCap=old` turns it off)

- `ANCHOR_CONTINUITY.crestWide` 0.45 (`src/wave/barrel/faceAnchor.ts:154`), passed by `CrashCurve.prepareAnchors`
  (`src/wave/barrel/crashCurve.ts:400, 439`) into `continueAnchor`'s new `crestShare` (`faceAnchor.ts:192`).
- **The 1.1–3.8 m single steps, traced** (the probe now lists each with what the anchor did, its point's row step and how many
  steps it spans): two causes, neither the cap.
  1. **A measure artefact, most of them:** the probe compared W's change across 3–43 steps in which it could not read the
     point (its records unread) against one step's C Δt. Counted over consecutive steps only, main's largest single step is
     0.067 m at a38 1.5 m.
  2. **A build artefact at 1.8 m:** after a miss held past 0.5 s the shift "stood with the point", and once its pace has ended
     a point is its crest cell's centre, stepping 1–2 m rows: the drawn crest stepped with it (traced on main: 0.6–1.9 m single
     steps, all `stood`, at τ 2.8–3.4 s). Fixed under the same switch: past the hold a miss runs on at the wave's own advance C
     along the ray (`faceAnchor.ts:223`), in the wave's frame as the cap holds it.

### 3. The holes (`?tubeMerge=old` turns it off)

- **The join beside a front's end** (`BreakingFront.endBeside`, `src/wave/barrel/BreakingFront.ts:668`, used at `:507`;
  `MERGE`, `:15`): a crest joining by distance beside a front's end point (a neighbouring column whose front has no point in
  the crest's), within 1.5 slice spacings (the front's, a column: 1.5 m) and 0.3 s of its clock (τ_e as it joins), takes that
  end's join time, so the split by joins (1 s/m) never parts them.
  - *(Built so)* only where the split would part the two: taking the end's join on every join beside one (903 of 1,000 at
    a38 1.5 m) carried the first join down the whole peel, so the split never parted two waves (folds 0.34 → 0.75 a build).
  - *(Built so, tried)* by the joiner's distance clock (−D/C_p) instead of τ_e: 930 of 1,000 joins merged, holes 0.157 and
    folds 0.99 a build, formation 67 %. Not kept.
- **The drop rule** (`SweptLoft.dropOverlaps`, `src/wave/barrel/sweptLoft.ts:1826–1860`): an open strip at weight ≥ 0.5 is
  never dropped; two such overlapping both stay (a fold, which the contact's first front answers; counted
  `overlapsKept`). A thrown cut end now blends over max(1 m, H) as a front's own thrown end does (`sealRuns`, `:1567`).
  - *(Built so)* between two thrown strips the lighter still gives way, as before. Keeping the earlier-thrown one instead
    (the ruling's words) raised the holes 9× at a38 1.5 m in 12 periods (0.009 → 0.083 a build): in the holes logged, the
    earlier-thrown piece was mostly a short one already faded (weight 0.00–0.02) beside a live one.

### 4. The retire guard (`?tubeGuard=old` turns it off)

The measured gap was not rare: on main, 458 of 672 thrown points (a38 1.5 m, 12 periods) were still flagged unbroken at
their touchdown and 433 of them poured their jets; per jet, only 53.5 % landed on the solver's breaking within ±0.5 H_s.
(Bar 6 per column read 100 % because it reads only slices at weight ≥ 0.5, and these had retired to 0.06–0.3.) Two causes:

1. **A stale flag** (a build artefact): a point thrown before the solver broke it runs on its pace and claims its crest apart
   (`keptCrests`), and that branch never cleared `unbroken` when the claimed crest broke. 154–156 of the flagged points stood
   on the solver's breaking at their touchdown and were retired all the same. Now (`FrontOptions.paceBreak`,
   `BreakingFront.ts:126`, at `:422`) the flag clears when the claimed crest's strength is over 0, as it does off the pace, and
   its retirement recovers at the weight's rate (`sliceClock.ts:372`).
2. **The guard outlasting the open time:** 0.3 s + 0.5 s against a38's 0.70–0.79 s. *(Chosen)* The guard keeps its own
   proportions (3 : 5) and is scaled to each point's case's open time T (`GUARD`, `src/wave/barrel/sliceClock.ts:156`;
   `OnsetTiming.distance.openTime`, `:147`, set at `src/wave/SurfZoneSimulation.ts:1394`): it retires from 0.375 T over
   0.625 T, whole at its touchdown. A point still unbroken at its touchdown then returns its held jet to the crest it left
   (`SweptCrash.ts:364`; `PlungingLip.returnJet`, `src/wave/PlungingLip.ts:878`): its water and the momentum `drawFromCrest`
   took with it (kept on the strip, `taken`, `:298`, and carried by the sea handover) go back to the solver at the point's
   crest, nothing lands and no air is trapped. Cause: the solver never broke that crest, so its lip never plunged; the drawn
   lip has faded back into the wave, and its water with it.


## The switches

- `TubeFace` (`src/wave/barrel/faceAnchor.ts:35`) gains `contact`, `cap`, `merge` and `guard` (`tubeFaceOf`, `:125–128`):
  `contact` needs the union (`?tubeFace=old` turns it off with it), `cap` the continuity (`?tubeAnchor=old`), `guard` the
  contour throw (`?tubeForm=old` or `?tubeThrow=break`).
- `SurfZoneConfig.tubeContact`, `.tubeCap`, `.tubeMerge`, `.tubeGuard` (`src/wave/SurfZoneSimulation.ts:339`); the URL
  reader `tubeFaceSwitches` (`src/game/PhysicalMode.ts:533`); online rooms pin all four to the defaults (`src/main.ts:528`).
- All four old: main's build byte for byte (the pin check, below). The existing switches (`?tubeAnchor`, `?tubeForm`,
  `?wallFlow`, `?tubeThrow`, `?tubeFace`, `?tubeFrom`, `?poolTubeCase`) work as before.


## How to verify

- **Types:** `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- **Tests:**
  - `src/wave/barrel/tubeContact.test.ts`: the cast against a 1 mm march, the choice and its blend, the answer's continuity
    through the blend and the reach's fade, the vertical answer's fields untouched and nothing computed with `?tubeContact=old`,
    the water's surface at the depth along the normal with the slope clamp, the kinematic fade;
  - `src/wave/barrel/tubeFollowUp.test.ts`: the guard by the open time (whole at touchdown, at most 1/18 a step) and the old
    guard, the recovery once broken, `paceBreak`, `returnJet` (water and momentum kept, nothing lands, no air), the crash
    returning an unbroken point's jet with the guard and pouring it without, the join beside a front's end, the drop rule;
  - `src/wave/barrel/faceAnchor.test.ts`: each of the four switches alone and all four old, the 0.45 C cap and the run-on miss
    against `?tubeCap=old`;
  - `src/game/PhysicalMode.test.ts`: the URL switches and the online pin;
  - then the main suite and the SZS subset.
- **The bars:** `PROBE=1 H=1.05 CASE=a38 LOG=runs/default-a38-1.05.txt npx vitest run src/wave/probes/poolTubeFace.probe.test.ts --maxWorkers=2`
  - `H=1.32`; `CASE=pool`;
  - `SWITCHES=tubeContact=old,tubeCap=old,tubeMerge=old,tubeGuard=old` for main's build (the re-measure only);
  - `SWITCHES=tubeContact=old` (and `tubeCap=old`, `tubeMerge=old`, `tubeGuard=old`) for each piece alone;
  - `COST=1 COST_ARMS=followUp` for the cost A/B against main's build;
  - `TRACE_BODIES=1` writes the first lone boards step by step beside the log.
  - 11–13 min a run on this M1, two at a time (12 periods).
- **The pin check:** `pin-contact.ts` (its header has the command). Bundle it against main (a `git archive` of 108d97c3's
  `src` with `node_modules` and `public` linked in) and against the branch, then compare: every line matches but the
  Barrel's defaults (`runs/pin-main.txt`, `runs/pin-branch.txt`): every other spot; the Barrel with the four switches old, and
  with step 7's three old too, on both case lists at both sizes, including the water the bodies feel (`sampleAt` on a grid
  through the waves: its surface, normal, slope, flow and layers). The branch's default runs twice identically.


## The owner's shot list

Wave Pool → Waves: **Barrel**, at **1.5 m** and at **1.8 m**, dev build (the URL switches are read). Record each. The probe's
bodies have no input, so everything about riding is the owner's to judge.

1. **The default.**
   - **A board on the steep face carried up rather than buried:** take off low on the shoulder and let the face stand up
     under you, then stop paddling. With the nearest surface the board takes the face just ahead of it, not the crest's top
     above it, so it should ride up the wall with its water rather than sink into it. Say whether you rise with the face or
     the face runs over you, and where on the face it happened.
   - **Pitched when high:** sit above about half the face as it throws. Expected (call 4, extended): drawn up and pitched
     over the falls with the lip, anywhere on the steepening face above the anchor. Say whether it reads as fair.
   - **No flips or flings:** watch a board you let go on the face (and your own when you fall). Look for a board shoved out
     through the face shoreward or bouncing off the wall, or a board twitching between two pushes. The probe saw more of both
     than main (below): say how often and where.
   - **No holes in the tube:** ride the tube side-on and from inside. Look for a gap where you see through the barrel, or two
     walls crossing where two sections meet.
   - **Sections the solver never breaks:** a lip that throws and then fades back into the wave instead of landing on clear
     water (the guard). Say if a lip vanishes where you expected it to land.
2. **`?tubeContact=old`:** the water from the vertical line through the board, as main. Compare whether a board low on the
   steep face is buried, and whether the flings and flips are fewer.
3. **`?tubeCap=old`:** the anchor's cap at 0.3 C, as main. Compare the wall's motion (hops, a wall that lags its frames)
   just after the throw and late in the collapse.
4. **`?tubeMerge=old`:** joins and drops as main. Compare holes where two sections meet.
5. **`?tubeGuard=old`:** the guard as main (0.3 s + 0.5 s; jets of unbroken sections pour on clear water). Compare where the
   lips land, and whether the waves feel bigger with the guard on (the meter reads higher, below).
6. **`?poolTubeCase=pool`:** the pool's own runs with the default; the same checks.
7. **`?tubeContact=old&tubeCap=old&tubeMerge=old&tubeGuard=old`:** main's build, for the A/B.
8. For each: where you fell and why, how the face felt under the board, any fling, flip, hole or vanishing lip.

