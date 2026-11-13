# C2, step 4: the water's speed from the library (2026-11-13)

Tags: [M] measured here, [C] read in the code, [R] reasoned, [P] provisional.
The contract is `ruling-33-c2-step3b.md` ("Decision: step 4") and the plan's step 4 (`c2-plan.md`). Step 3b is
`c2-step3b.md`. Everything is still behind `?wave=library` (off by default, rooms pinned).

**In one line:** the game's case files now carry the Basilisk runs' own water speed, and the rider's water reads it.
PLACEHOLDER_SUMMARY

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

PLACEHOLDER_BARS

## 4. The cost

PLACEHOLDER_COST

## 5. Off is unchanged

PLACEHOLDER_OFF

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
