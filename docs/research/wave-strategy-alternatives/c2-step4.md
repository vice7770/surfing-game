# C2, step 4: the water's speed from the library (2026-11-13)

Tags: [M] measured here, [C] read in the code, [R] reasoned, [P] provisional.
The contract is `ruling-33-c2-step3b.md` ("Decision: step 4") and the plan's step 4 (`c2-plan.md`). Step 3b is
`c2-step3b.md`. Everything is still behind `?wave=library` (off by default, rooms pinned).

**In one line:** the game's case files now carry the Basilisk runs' own water speed, the rider's water reads it, and
**the wave pushes 2.5 times harder at the crest than the sea did** (5.06 m/s against 2.04 near the throw). One build
round. **Every bar passes but one, and that one passes at the 99th**: the flow's change under a board at the hand-over
crosses 0.3 m/s in 0.1 % of the 0.1 s windows (worst 1.63), where the sea's own flow at the same seats crosses it in
1.1 %.

| Passes | Misses |
|---|---|
| within 2 % of VELOUT (worst 0.046 %), the crest water's share 0.6 → 0.84 → 1, step 3b's hand-over and joint bars (every number unchanged), off byte-identical (the pool and both Canyons), the page's draw unchanged (5.40 ms against 5.4), the worker's cost unchanged | the jump bar at its worst (0.1 % of windows over 0.3 m/s, worst 1.63; the cause is the composite following the sea's own crest through the blend, not the water) |

## 1. The files

- `caseFormat.ts`'s `gameCase` keeps the velocity: `u` and `v` at the case's two depths, as the float16 the whole case
  file already holds, so the game file's numbers are the run's numbers bit for bit [C]. QOUT and the bore still go
  (step 5). `--no-velocity` writes step 3's file.
- BRL3's version is unchanged (`brl3 1`). The velocity was already a section of the format; step 3's `--game` wrote it
  empty (`velocityDepths: []`) and the reader already handles both. So old files still read, and the frames, uses and
  path sections of the new files are **byte for byte** step 3's (checked on `b1-a1`) [M].
- `public/library/`, rebuilt with
  `npm run barrels -- --format brl3 --game --assets public/library --c2 <each of the nine _c2.json.gz>`:
  1.28 to 1.38 MB a case, **11.81 MB in all** (step 3's nine were 5.90 MB). The plan's budget is about 17 MB [M].
  The page fetches them once and hands the bytes to the worker (`waveCaseBytes`), so the download is 11.8 MB where it
  was 5.9 [C].
- **Where the run gave no sample** the library fills from the nearest point at the same depth (`prepareFrames`, step
  1b's rule). Over the nine cases that is 1.1 to 5.4 % of the samples, and almost all of it is after the throw: **0.01 %
  before the throw, 7.8 % from it** (the thin water of the overturn: crest-to-lip 5.8 %, lip-to-throat 5.0 %)
  [M, `c2-step4-runs/fills.txt`]. So the push on the face a rider rides before the throw is the run's own throughout;
  inside the overturn some of it is a nearest-point fill.
- The depths are the runs' own: 1.5 cells (0.0234 h0) and 0.1 h0, the same in all nine cases (`dx_h0` 0.015625, h0 5 m)
  [M]. In the game they scale with each slice's own h0: at the 2 m pool's h0 they are about 0.1 m and 0.45 m under the surface.

## 2. How the rider's water reads it

`WaveLibrary.flowProfileAt` (new) gives a slice's whole profile at a time t, blended over its cases and frames **with
the surface's own weights** (`surfaceAt`'s): per point and stored depth, the water's (u along the ray, v up), and the
change of those at the fixed point index. It also gives each point's own motion. The library's units do the work: a
case stores velocity in √(g h0) against τ in √(h0/g), so one unit of dV/dτ is exactly g, at any slice's scale [C].

`ZoneSurface.fillFlow` turns that into the water's own **material** acceleration. A stored point is a share of the
curve's arc, not a water particle, so Du/Dt = du_i/dt + (q·∇)u with q the water's velocity less the point's own. The
only gradients the library has are along the curve (the neighbouring points at the same depth) and across it (the two
depths), so q is split into its tangential and normal parts and each takes its own gradient; at the surface the normal
part is small by the kinematic condition, so the tangential term carries it [R]. It is capped at 5 g (`FLOW.cap`), the
same cap the board already puts on the water's acceleration.

`ZoneSurface.flowAt(x, y, z, surfaceY)` is what the rider's water calls. It finds the lane pair at the point (the
footprint's own rule), and on each lane, for each slice shown there:

- the **place**: the nearest place on that slice's own blended curve to (the point's place along the lane, the surface
  over it). That is the surface the body is on, overturned or not: on the wall, in the lip, under a fold. Its depth is
  the distance from the point to that place along the curve's normal, and the water is read between the two stored
  depths and held past them [C];
- the **weight**: the slice's frame weight along its lane (`EDGE`'s band, its lane's end weight) times its blend share
  a. Summed over the slices on one lane and capped at 1, as the lane's heights are, then across the lane pair by the
  weights the nodes use.

`PhysicalSurfWater.zoneFlow` then blends: flow = (1 − share) × the sea's + share × the library's, and the library's
Du/Dt rides on the sample as `WaterSample.flowAccel`, times the same share (the sea does not report its own, so it
fades in with the library's water) [C].

**Why that weight is the surface's.** A node's height is (1 − A) η_sea + B with A = Σ w and B = Σ w h, and each
slice's lane height h is a y_case + (1 − a) η_sea (the blend is in the crest's own frame, `composite`). So the share of
the node that is the case's own is Σ w a, and the sea keeps 1 − Σ w a [R]. `flowAt` returns exactly that sum. The
difference from the surface is that the surface is written on the 1 m render nodes and read back from them, while the
flow is evaluated at the point itself; both are continuous in time and space, so neither can step [R].

**What it replaces.** Where the library's share is 1, the old made-up flows are gone from that water: the solver's
depth-averaged flow with its profile factor, the lip's tip velocity blend (`lipFlow`) and the swept tube's wall rules
are all overwritten by the case's own water. The hand-over is where the two meet [C].

**One judgment call.** `BoardBody` now takes the added mass's push from `WaterSample.flowAccel` wherever the sample
carries it (`waterAccel`), not only in the old tube's wall water. The smoothing and the cap are the old rules'. This is
new behaviour inside `?wave=library` only (no sample outside it carries the field), and the push is small at the
measured sizes (section 3, D). It is one line to gate more tightly if the owner's ride wants it.

## 3. The bars

Same sea as step 3b (`sea21.bin`, 40 to 130 s, the owner's switches, the nine cases), same probe harness,
`c2-step4-bars.ts`. Run: `c2-step4-runs/bars.txt`.

| Bar | Step 4 | |
|---|---|---|
| Within 2 % of VELOUT at the stored points | worst **0.046 %** (median 0.017 %), 62 160 samples over the nine cases | **pass** |
| No jump over 0.3 m/s in 0.1 s under a board at the hand-over (the hand-over's own part) | median 0.000, 90 % 0.061, 99 % 0.149 m/s; 0.1 % over 0.3; worst 1.63 | pass at 99 %, **miss at the worst** |
| … the whole felt flow's change over 0.1 s there | 99 % 0.293; 0.8 % over 0.3; worst 1.68 | |
| … the sea's own change at the same seats (the control) | 99 % 0.302; **1.1 % over 0.3**; worst 0.52 | |
| The crest water's share 0.6 → 0.84 → 1 | the ramp is there: median 0.54 → 0.77, 90 % 0.61 → 0.87 over the last 0.7 s; the fastest water reaches 1.05 at 0.17 s past the throw and 1.12 at 0.34 s | **pass** |
| Step 3b's hand-over and joint bars (rerun unchanged) | **every number unchanged** (`c2-step4-runs/step3b-bars-rerun.txt` against `c2-step3b-runs/bars-nine-cases.txt`: the two files differ only in the wall time and the cost lines, this rerun being under three other jobs) | |
| Off byte-identical | section 5 | **pass** |
| The cost | section 4 | |

**A, the data path** [M]. The library's velocity against the runs' own VELOUT, through the whole chain (the game's
`.bin`, `decodeWaveCase`, the refill, `flowProfileAt` on a one-case slice at an own frame's own τ): worst 0.046 %
relative, 0.00048 √(g h0) absolute. That is float16's own rounding, nothing else. Outside the game's code the same
check on the files alone gives the same worst over 277 566 points, with no NaN moved (`c2-step4-runs/velout-check.txt`).

**B, the hand-over** [M]. 1 615 seats (±10 m along the lane from each new slice's crest, every 4th lane), sampled every
step from the blend's start to 0.5 s past its end, a board's hull 5 cm under the surface: 270 580 windows of 0.1 s.
- The hand-over's **own** part (the change of felt − sea) is 0.000 m/s at the median and 0.149 at the 99th. So where
  the library comes in, it comes in without a step a board can feel.
- The bar's 0.3 m/s is crossed in 303 windows (0.1 %), worst 1.63. Of those 303, only **16** go with a step in the
  library's share over 0.1 [M]. The rest are the matched place on the slice's curve moving: the curve is the composite,
  and while a slice blends the composite follows the **sea's own crest**, which the tracker can lose and re-find
  (`seaCrest`, `stats.seaMissed`). That is the same cause as step 3b's J1 and J2 worsts, and it is the blend's, not the
  water's [R].
- The control says a board is not being shaken by the library: the **sea's own** flow at the same seats crosses
  0.3 m/s in 1.1 % of the windows, more often than the felt flow does (0.8 %).

**C, the crest water's share** [M]. Per slice, the library's own water at the crest landmark over that slice's steady
crest speed (a straight line through its crest's place over the 1.4 s before its throw, the reference's own measure),
1 274 slices:

| from the throw | −0.70 s | −0.34 s | −0.17 s | 0 | +0.17 s | +0.34 s |
|---|---|---|---|---|---|---|
| the crest point, median | 0.544 | 0.638 | 0.701 | 0.766 | 0.784 | 0.767 |
| the crest point, 90 % | 0.613 | 0.711 | 0.779 | 0.873 | 0.840 | 0.834 |
| the fastest water, median | 0.571 | 0.689 | 0.778 | 0.894 | 1.052 | 1.117 |
| **the measured pool small** | 0.59 | 0.70 | 0.75 | 0.80 | 0.83 | 0.86 |

The measured ramp (0.6 before the throw, about 0.84 at it) is reproduced: the 90 % column is within 0.02 to 0.07 of the
reference at every time, and the median within 0.09. The "→ 1" is the **lip's front**, not the crest's top, exactly as
the second look said: the fastest water on the profile passes 1 just after the throw (1.05 at +0.17 s, 1.12 at +0.34 s)
while the crest's top stays at 0.77 to 0.84 [M]. The spread is the nine cases: they run from A0 0.15 (a spill) to 0.36,
and the reference is one level-13 run of another wave, so this is a comparison of shape, not of identity [R].

**E, the push** [M]. At a slice's crest within 0.17 s of its throw, where the library is whole, the flow along the ray
is **5.06 m/s** at the median (90 % 5.52); the sea's own at the same place is **2.04** (90 % 3.03). The library is 2.5
times the sea at the median. The reference measured 5.0 m/s at the throw for the pool's small case. So the wave now
pushes with the run's own water where it used to push with a depth-averaged sea.

**D, the acceleration** [M]. |Du/Dt| where the library has a share: median 0.32, 90 % 1.07, 99 % 1.63 m/s², worst 15.5
(the 5 g cap is 49). So the added mass's new push is small next to gravity, as section 2's judgment call said.

## 4. The cost

**The worker.** The flow is filled only for the slices something reads, and once a step (`fillFlow`): a step shows
about 130 slices, and a rider's samples reach a handful of lanes. So the zone's own cost does not move [M] (the bars
probe, median / 90 %, ms a step; step 3b in brackets):

- the hand-over and slices: 0.85 / 1.29 (0.97 / 1.71);
- the zone's surface: 3.02 / 3.49 (3.10 / 5.54);
- the contact's loft: not timed again here; step 3b measured 1.19 / 1.97.

In all about 5.1 ms against step 3b's 5.3 (both machines were running Basilisk jobs; step 3b's was the busier, so these
are not a clean A/B) [P].

**The bodies.** One flow sample costs **0.016 ms** at the median (90 % 0.024) [M]: the lane pair, then the nearest place
on the curve of each slice on the two lanes. A body that takes 40 samples a step pays about 0.65 ms for them. Against
that, in the library's water the board no longer needs its second sample a wall patch a substep (the `wallFollow` rule),
because the water hands it Du/Dt [C].

**The page.** The drawing is untouched: nothing in the render path reads the velocity, and the page's own draw comes
from the snapshot and the curves as before [C]. The page's **download** grows from 5.90 MB to 11.81 MB (section 1).

**The headless fps trace** (Chrome, WebGPU, the 2 m pool's Barrel at Big, an idle prone rider, 70 s, the two runs back
to back, `c2-step4-runs/fps-*.txt`) [M]: with the switch the **page's library draw is 5.40 ms** a frame from 10 s on,
which is step 3b's 5.4 ms to the hundredth; without the switch it is 0. The frame rate is the same both ways (mean 53.4
fps with, 53.3 without; lowest second 38 and 37). Both runs are far under step 3b's 60.5 fps because this M1 was
running three Basilisk jobs and a Canyon spin-up throughout, so the fps is a with-against-without reading only, not a
machine number [P]. The ride screen comes up 3.4 s later with the switch (22.8 s against 19.4 s), the same 3.3 s gap
step 3 measured with half the bytes, so the bigger files are not what that is.

## 5. Off is unchanged

- **The 2 m pool** (`c2-step3-runs/pool-off-hash.ts`, 900 steps from `sea21.bin`, `wave` unset):
  **0545d279d79bafe7**, lip jets 278: the same as main (`c2-step4-runs/pool-off-hash.txt`). The spun-up cache itself is
  byte for byte the one step 3's session wrote (`sea21.bin`), so the sea is untouched [M].
- **The Canyon byte check** (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, fresh spin-ups,
  `c2-step4-runs/canyon-byte-check.txt`):
  - Canyon B (`?canyonWaves=true`): snapshots **a367d938f15fa934**, state **9e5831f80e38abd9**: the same as main;
  - the default Canyon: snapshots **ea3d57a4d49f4b48**, state **a1a2555739210f96**: the same as main.
- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: both clean.
- **The suite** (`npx vitest run src --maxWorkers=3`, without `SurfZoneSimulation.test.ts` and `SurfZoneRunner.test.ts`):
  349 files passed and 1 failed of 350, 37 skipped; 3 396 tests passed and 1 failed, 23 expected fail, 43 skipped. Main
  has 3 393 tests; the 4 new ones here are the difference. **The one failure is not this branch's**
  [M, `c2-step4-runs/suite.txt`]: `src/wave/barrel/poolBarrelPerf.test.ts` runs about 450 000 `expect`s in one test and
  ran past its 60 s timeout on this M1 (three Basilisk runs and a Canyon spin-up alongside). With
  `--testTimeout=300000` it passes in 65 s, and **main's own `src`, checked out into this worktree, fails it the same
  way under the same load** (75.6 s). Neither that test nor the code it exercises is in this branch's diff.

## 6. What I am unsure of

1. **Deeper than the second stored depth the water is held** [P]. The cases hold two depths, 0.0234 h0 and 0.1 h0: at
   the 2 m pool's scale about 0.1 m and 0.45 m. A board's hull and a rider's legs sit inside that. Below it the
   library's flow holds the deeper value instead of easing back into the sea's own profile. A rider's body in a wipeout
   is deeper than that.
2. **The gradient along the curve inside a fold** [P]. Du/Dt's convective term reads the neighbouring points. On the
   lip's underside they can be centimetres apart, so that gradient is the noisiest part of the acceleration; the 5 g
   cap is what holds it. I did not measure it against a finer source.
3. **The flow's share is evaluated at the point; the surface's is written on the 1 m render nodes and read back from
   them** [R]. The two agree in the limit and both are continuous, but they are not the same arithmetic, so a sample
   can read a share a little different from the one its height took. I did not measure that difference (the measure I
   first wrote compared the flow's share with the node weight A = Σ w, which is a different quantity).
4. **The acceleration fades by the share** [R]. The sea does not report its own Du/Dt, so through the hand-over the
   board reads the library's times the share, not a blend of two accelerations.
5. **A small kink in du/dt at a slice's throw** [P]. Before the throw each case runs at its own rate so that they throw
   together; from the throw every case runs at rate 1. The weighted rate is 1 on both sides, but a single case's is
   not, so a slice blending several cases has a step in du/dt at its own throw. With one case it is exact. Not
   measured.
6. **The old made-up flows are overwritten where the library is whole** [C]: the solver's profile factor, the lip tip's
   velocity blend (`lipFlow`) and the swept tube's wall rules. That is the intent of this step, but the lip blend was
   tuned for the swept tube's feel, and the owner's ride is the judge.
7. **The board's new push** (section 2, "One judgment call").
8. **No ride.** I did not ride it and ran no rider session (the brief's rule). The owner judges whether the push feels
   like the wave.

## Files and how to run them again

- `c2-step4-bars.ts`: step 4's probe (A the data path, B the hand-over, C the crest water's share, D the push):
  ```
  npx rolldown docs/research/wave-strategy-alternatives/c2-step4-bars.ts -o <scratch>/s4.mjs --format esm --platform node
  node <scratch>/s4.mjs --cases public/library --cache <scratch>/sea21.bin --from 40 --until 130
  ```
- `c2-step4-runs/`: this probe's run, step 3b's bars rerun, the fps traces, the pool's off hash, the Canyon check.
- The velocity in the files against the runs' own VELOUT, outside the game's code:
  `python3 -I docs/research/wave-strategy-alternatives/c2-step4-runs/velout-check.py docs/research/pool-c2-library/data public/library`.
