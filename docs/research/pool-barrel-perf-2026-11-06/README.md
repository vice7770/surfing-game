# The Wave Pool Barrel's frame rate (pool-barrel-perf, 2026-11-06)

The ask (the coordinator, from the owner, 2026-11-06): on the owner's M4 Pro, Wave Pool → Waves: Barrel runs at about
10 fps since the surfable-tube work (#190, #191, #198, #199). The Barrel before it ran fine. Measure where the time goes,
fix what keeps the output identical, list what would change the look or the physics, and give the owner a way to check
the frame rate on the M4. Branch `claude/pool-barrel-perf` from `main` at `af1279f8`. No browser pane, dev server, rider
session, catch report or autopilot check was run: everything below is Node on this M1 Air, not the M4 Pro.

## Where it stands

- **Measured on this M1, in Node,** at 1.5 and 1.8 m, on a38 (the default) and the pool's own cases
  (`?poolTubeCase=pool`), paired against the Barrel before the tube work (`135782d6`, and today's
  `?tubeFace=old&tubeFrom=piece`, which hashes the same sea at 50 s):
  - the worker's CPU stages a step: **8.3–8.7 ms before the tube, 10.7–11.5 ms today**;
  - the page's barrel work for each new snapshot: **1.7–1.8 ms before, 3.4–4.1 ms today**;
  - the tube mesh: 5.9–6.0 k vertices before, 11.9–14.2 k today (up to 23 k), 0.9 MB of attributes a snapshot against
    1.8–2.2 MB (up to 3.5 MB).
- **The cause** is the barrel's loft, built twice a step (the worker's contact and the page's drawing):
  - it has 2.4–3.3× the slices (a38 27 → 89, the pool's cases 44 → 106 at p50): the slices the clock refinement adds
    where neighbouring clocks differ, and the earlier formation (#191);
  - each lifted vertex now reads the water (the floor's union, #190), where before only the ones resting on it did.
  - Smaller: the crash's anchors and paced points (+0.4 ms), and the jets the crash now throws (5–6 a second, none before),
    which double the spray and send the whole water to the device on 9 % of steps.
- **Fixed here, the output identical, each behind its own `?…=old` switch:** five changes take **1.6–2.0 ms off the
  worker's step** (contact 2.7–3.1 → 1.0–1.3 ms) and **1.0–1.2 ms off the page's snapshot** (3.4–4.1 → 2.5–2.9 ms).
  The regression against the Barrel before the tube work falls from +2.3–2.8 ms to +0.7–0.9 ms in the worker, and from
  +1.7–2.3 ms to +0.7–1.1 ms on the page.
- **These numbers do not reach 10 fps on an M4 Pro.** Scaled to the M4 (about 1.6× this M1 on one core: an estimate from
  published single-core benchmarks, not a measurement), the tube work cost about +1.4–1.8 ms a worker step and +1.1–1.4 ms
  a page frame; the step stays well inside its 16.7 ms. What Node cannot see is the GPU and the WebGPU device. The
  estimates point at the GPU's fill when the camera is in the tube (the jets' spray: up to 1–1.7 M blended fragments a
  frame at 1280 × 720, 3× that at High). Only the owner's M4 run can say which (§6 gives the commands).
- **Not changed:** the default a38, the physics and the look. Online rooms pin all five switches to the default.
- **Added for the owner's check:** a WORKER row in the telemetry (the worker's whole step), and `--waves` in the fps survey
  (§6).

## 1. Measurements

### Machine and method

| | |
|---|---|
| Machine | MacBook Air, Apple M1 (4P + 4E cores, 8-core GPU), 8 GB, Node v22.17.0 |
| Load | 1.7–3 (other sessions idle); some runs shared the machine with a second run, marked |
| Trees | today `af1279f8` (`main`) and this branch; before the tube work `135782d6` (`.m1-cpu-base/`) |
| Tool | `bench.ts` and `arm.ts` here (§ Tools): every arm in one process, stepped in alternating blocks of 25 steps |

- **The worker:** `SurfZoneRunner.forWorker` (the worker's own runner) with the contact and a riderless board in the lineup
  (no rider session), one 1/60 s step and one snapshot fill at a time, as the worker publishes them.
  - The water steps on the CPU solver; its own step (43 ms) is left out of "CPU stages", as on the device it is the GPU's.
  - Inside the stages, instance timers split the front's line, the crash and its anchors, and the contact's loft build.
- **The page:** each snapshot goes to the page's own `WaterSurface` (Rich, the cubic surface) and `SweptBarrel`, as
  `main.ts` draws a frame with a new snapshot (`water.update`, then `drawBarrel`). Inside it are timed the drawing's loft,
  the foam's crests, the mesh's fill and the camera's water test; the mask's raster is the rest.
- **The device's water:** as the device would hold it (its unpack after each step), what the rest of the step marks
  changed (canyon-perf's `markWater`) is what the next device step uploads.
- **The GPU (an estimate, not a GPU measure):** the tube mesh rasterized and the spray's points sized as `SprayPoints` sizes
  them, from two cameras: 3 m seaward of the rider's start and 1.8 m up, looking at the break point; and a rider's in the
  open tube (an open slice's middle, looking 8 slices toward the shoulder). 1280 × 720, 55°. High draws 1.75² (3.1×) as
  many pixels.
- Each arm starts from its sea (its tree's and case's), spun up and stepped to 50 s, saved and reloaded; an arm with
  switches loads its plain arm's sea. 600 steps (10 s, one pool period) after 60 warm ones. ms p50 unless marked.

### The worker, per 1/60 s step (ms p50)

**1.5 m** (`runs/final-medium.txt`; "today" is `main`, every fix off; "fixed" is this branch):

| | Before the tube (pool cases) | Today, a38 | Fixed, a38 | Today, pool cases | Fixed, pool cases |
|---|---|---|---|---|---|
| CPU stages (all but the water) | **8.35** | **10.66** | **9.07** | **11.11** | **9.13** |
| the contact's update | 0.90 | 2.66 | 1.03 | 3.01 | 1.18 |
| of it, its loft's build | 0.84 | 2.54 | 0.91 | 2.86 | 1.04 |
| the front (line, crash, anchors) | 1.21 | 1.55 | 1.55 | 1.55 | 1.56 |
| of it, the crash | 0.11 | 0.35 | 0.35 | 0.37 | 0.37 |
| of it, the anchors (`prepareAnchors`) | 0 | 0.23 | 0.23 | 0.24 | 0.24 |
| the lip | 0.02 | 0.08 | 0.08 | 0.08 | 0.08 |
| the spray | 0.07 | 0.12 | 0.13 | 0.12 | 0.12 |
| the board's water samples (a lone board, 300 samples) | 0.49 | 0.50 | 0.50 | 0.50 | 0.49 |
| the snapshot (its fields 2.3) | 2.52 | 2.57 | 2.59 | 2.71 | 2.55 |
| p95 of the CPU stages | 8.76 | 12.07 | 9.81 | 12.66 | 9.75 |

**1.8 m** (`runs/final-big.txt`):

| | Before the tube (pool cases) | Today, a38 | Fixed, a38 | Today, pool cases | Fixed, pool cases |
|---|---|---|---|---|---|
| CPU stages | **8.74** | **11.42** | **9.44** | **11.49** | **9.59** |
| the contact's update | 0.92 | 2.78 | 1.10 | 3.10 | 1.26 |
| the front (crash 0.11 → 0.41, anchors 0 → 0.27) | 1.21 | 1.59 | 1.59 | 1.59 | 1.60 |
| the spray | 0.12 | 0.22 | 0.21 | 0.21 | 0.20 |
| p95 of the CPU stages | 9.18 | 12.94 | 10.07 | 13.06 | 10.18 |

- Before the tube work, a38 (`135782d6` with `poolTubeCase` a38) was cheaper still: 8.5–8.6 ms, its contact 0.71–0.75 ms
  (`runs/before-*.txt`).
- The breaking, foam, aeration, bubbles and snapshot are the same in every arm (within 0.1 ms).
- Each "today" arm is today's code with the five fixes' switches old: `main`'s path (§3).

### The page, per new snapshot (ms p50)

| | Before, pool | Today, a38 | Fixed, a38 | Today, pool | Fixed, pool |
|---|---|---|---|---|---|
| **1.5 m: the barrel's draw** | **1.74** | **3.42** | **2.46** | **3.97** | **2.84** |
| the drawing's loft | 0.74 | 1.87 | 1.37 | 2.13 | 1.56 |
| the mesh's fill | 0.48 | 0.69 | 0.59 | 0.85 | 0.71 |
| the camera's water test | 0.25 | 0.49 | 0.17 | 0.60 | 0.20 |
| the mask's raster | 0.23 | 0.32 | 0.32 | 0.35 | 0.35 |
| p95 | 2.08 | 5.00 | 3.56 | 5.56 | 3.93 |
| **1.8 m: the barrel's draw** | **1.81** | **3.52** | **2.53** | **4.08** | **2.91** |
| p95 | 2.28 | 5.18 | 3.62 | 5.59 | 3.91 |

The water's own upload (`water.update`) is 0.08–0.10 ms in every arm. The page builds the loft once for every new
snapshot: the worker publishes every 1/60 s step.

### Sizes

1.5 m (1.8 m in brackets where it differs), p50 / max:

| | Before, pool | Today, a38 | Today, pool |
|---|---|---|---|
| front records a snapshot | 27 / 32 (31 / 37) | 34 / 41 (42 / 51) | 37 / 43 (41 / 50) |
| their bytes (9 floats a record before, 13 now) | 1.0 kB | 1.8 kB (2.2) | 1.9 kB (2.1) |
| the snapshot's buffers, transferred (not copied) | 3.87 MB | 3.90 MB | 3.90 MB |
| the tube's slices | 44 / 53 (45 / 58) | 89 / 152 (90 / 159) | 106 / 172 (106 / 161) |
| its vertices | 5.9 k / 7.1 k (6.0 k / 7.8 k) | 11.9 k / 20.4 k (12.1 k / 21.3 k) | 14.2 k / 23.0 k (14.2 k / 21.6 k) |
| its triangles | 11.4 k / 13.8 k | 23.4 k / 39.9 k (23.4 k / 41.8 k) | 27.7 k / 45.2 k (27.7 k / 42.3 k) |
| its attributes uploaded a snapshot (Rich, 128 B a vertex and 4 B an index) | 0.89 / 1.08 MB | 1.81 / 3.09 MB | 2.15 / 3.49 MB |
| the water the device gets a step | 6.8 kB (a board's push) | 158 kB; the whole water, 1.26 MB, on 9 % of steps | 171 kB; 1.26 MB on 10 % |
| the crash's jets a second | 0 | 5.4 (5.2) | 5.6 (5.8) |
| spray particles | 419 (805) | 894 (1744) | 878 (1689) |

- The device gets the whole water when a lip is launched (`PlungingLip.drawFromCrest` marks it all: canyon-perf's rule);
  the jets' landings mark runs that span many rows, so most steps send 100 kB or more.
- The mesh's attributes go to the GPU for every new snapshot.

### The GPU's share (an estimate from the meshes, not a measure)

Fragments a frame at 1280 × 720 (921.6 k pixels), p50 / max:

| | Before, pool | Today, a38 | Today, pool |
|---|---|---|---|
| 1.5 m, from the lineup: the tube mesh (both faces) | 11.9 k / 46.6 k | 26.6 k / 100 k | 28.1 k / 179 k |
| ...the spray | 4.8 k / 20.8 k | 10.3 k / 33.3 k | 10.6 k / 34.8 k |
| 1.5 m, in the tube: the tube mesh | 0.78 M / 1.04 M | 0.79 M / 0.87 M | 0.71 M / 0.78 M |
| ...the spray | 0 / 0.55 M | 0.25 M / 1.04 M | 0 / 0.37 M |
| 1.8 m, from the lineup: the tube mesh | 25.0 k / 106 k | 36.9 k / 517 k | 41.3 k / 533 k |
| 1.8 m, in the tube: the spray | 4.2 k / 0.71 M | 0.25 M / 1.74 M | 0.09 M / 0.65 M |

- From the lineup the tube's fragments are 1.3 % of the frame's pixels before and about 3 % today (19 % at most).
- In the tube they are about one screen's worth either way.
- The spray is the difference: the jets land in front of a rider in the tube. Its points are blended and soft, up to 511 px
  across close to the camera. At High that is about 3 M to 5 M blended fragments a frame (×3.1).

### Over four minutes of sea

`long.ts`, a38 and the pool's cases at 1.5 m, 50–290 s of sea, before the fixes (`runs/long-*.txt`; two runs side by side,
so slower than the paired tables). Nothing grows:
- the front's records stay at 36–51;
- the slices at 104–202 at most a window;
- the CPU stages at 11.7–14.7 ms a 10 s window.

## 2. The cause

The tube work makes the barrel 2–3× as costly on the CPU, on both threads. On this M1 that is +2.3–2.8 ms a worker step
and +1.7–2.3 ms a page frame. In order of size:

1. **The loft has 2.4–3.3× the slices.** a38 27 → 89 and the pool's cases 44 → 106 at p50, and both the worker's contact
   and the page's drawing build all of them every step. Where they come from (the options' runs, §4):
   - the clock refinement (`LOFT.levels`: the 0.5 m slices halved, down to 0.0625 m, where neighbouring clocks differ by
     more than 3 frames; inferred: each point's own clock by distance makes them differ more):
     89 slices with its three levels, 64 with one, 37 with none;
   - the formation by distance (#191, `?tubeForm=old`): each slice forms about 1.6 s before its throw rather than 0.3 s
     (the wall notes, inferred): 89 against 61 slices.
2. **Each lifted vertex reads the water.** The floor's union (#190) keeps every lifted vertex on or over the solver's
   surface (`Math.max(level + profile, heightAt)`); before, only the vertices resting on the water read it. With (1),
   each build reads the water at nearly all of its 12–14 k vertices. The reads were about half of the contact's build and
   a fifth of the page's (the profile below).
3. **The camera's water test and the mesh fill** grow with the mesh (×2.4 vertices).
4. **The crash and its anchors** (#190–#191): +0.25–0.3 ms for the crash's paced points and slices, +0.23–0.28 ms for
   the anchors' reads. Unchanged here.
5. **The jets** (#190's face ruling, and 46–79 % more with #191's throw at the contour): 5–6 a second, none before. They double the spray (worker +0.05–0.10 ms,
   and the page's blended points), and the device gets 160–180 kB of water a step and the whole 1.26 MB on 9 % of steps,
   against 7 kB.

Profile of the two builds before the fixes (`node --cpu-prof`, pool's cases, 1.5 m):
- **the contact:** the 4 × 4 node gathering 35 %, the height's closure 12 %, the loft's own loop 18 %, normals 6 %, the
  profile lookups 6 %;
- **the page:** the cubic height 22 %, the mesh's fill 16 %, the camera's water test 14 %, the mask 10 %, the loft's loop
  8 %.

**The 10 fps.** The numbers above do not make 10 fps on an M4 Pro. Scaled to the M4 (÷1.6, an estimate) the tube work
added about 1.4–1.8 ms to a worker step and 1.1–1.4 ms to a page frame. The worker's CPU stages stay near 7 ms, inside
the 16.7 ms a step has. The page's barrel work is about 2.5 ms a frame. Nothing here grows with time. So the 10 fps is
where Node cannot look:
- **the GPU** (the likeliest, by elimination): the tube mesh doubles but stays small from the lineup; in the tube, the jets' spray adds
  up to 1–1.7 M blended fragments a frame at 1280 × 720, 3–5 M at High, where there was almost none before;
- **the device:** the whole water uploaded on 9 % of steps;
- **a stall on the mesh's bigger dynamic uploads:** 1.8–3.5 MB a snapshot against 0.9–1.2 MB.

§6's survey splits the frame (rendered fps, GPU ms, main thread ms, the solver's ms and the sea's rate). Its A/B URLs
tell the tube's parts apart.

## 3. The fixes (identical output)

Each fix is on by default and has a switch back to the old path. The worker's two are in the config (`SurfZoneConfig`)
and online rooms pin them to the default (`main.ts`); the page's three are the page's own, like `?lipFoam=old`.

| Fix | Switch | Saving on this M1, 1.5 m, alone | What it does |
|---|---|---|---|
| The worker's face contact finds its rows on demand | `?contactRows=old` | the contact −1.1 ms | `SweptContact.forFaceWorker`: the loft's heights (with the floor's rule) and normals are found when a body's query first needs a row, as Padang's worker contact does (`forOrdinaryWorker`); a lone board in the lineup needs almost none |
| The plain surface keeps a stencil it may | `?plainHeight=old` | the contact −0.9 ms | `PlainHeightSurface`: inside a cache scope a sample whose 4 × 4 nodes are the last sample's keeps them; the weights inline, no arrays. Every spot's water |
| The drawing's cubic height | `?barrelHeight=old` | the page −0.7 ms | `sampleCubicHeight`: `sampleCubicSurface`'s height alone, the same sum in the same order, without the slopes or allocations |
| The camera's water test in typed arrays | `?cameraWater=old` | the page −0.3 to −0.4 ms | `BarrelWater`: the same strips, boxes and triangle ranges, in the same order, without an object, a map entry or an array each |
| The mesh's faces-out loop | `?barrelMesh=old` | the page −0.1 to −0.15 ms | `SweptBarrelMesh`: plain locals where it built three small arrays per triangle |

How each saving was measured (paired, 1.5 m):
- the rows on demand alone, the other four on;
- the kept stencil and the cubic height in one A/B, before the rows on demand existed (they act on different threads);
- the camera's water test and the faces-out loop each alone.

The contact's two overlap: with the rows on demand there are fewer reads left for the kept stencil to save.

**All five together** (`runs/final-*.txt`, paired, ms p50):

| | 1.5 m, a38 | 1.5 m, pool | 1.8 m, a38 | 1.8 m, pool |
|---|---|---|---|---|
| the worker's CPU stages | 10.66 → **9.07** (−1.59) | 11.11 → **9.13** (−1.98) | 11.42 → **9.44** (−1.98) | 11.49 → **9.59** (−1.90) |
| its p95 | 12.07 → 9.81 | 12.66 → 9.75 | 12.94 → 10.07 | 13.06 → 10.18 |
| the contact | 2.66 → 1.03 | 3.01 → 1.18 | 2.78 → 1.10 | 3.10 → 1.26 |
| the page's barrel draw | 3.42 → **2.46** (−0.96) | 3.97 → **2.84** (−1.14) | 3.52 → **2.53** (−0.98) | 4.08 → **2.91** (−1.17) |
| its p95 | 5.00 → 3.56 | 5.56 → 3.93 | 5.18 → 3.62 | 5.59 → 3.91 |
| against the Barrel before the tube work (worker / page) | +0.7 / +0.7 | +0.8 / +1.1 | +0.7 / +0.7 | +0.9 / +1.1 |

On the M4 (÷1.6, an estimate) that is about −1.0–1.2 ms a worker step and −0.6–0.7 ms a page frame.

**Why the output is the same:**
- **The lazy rows** compute each row's heights with the same arithmetic as the full build, from the same `heightAt`, when
  first queried. Every query in a step comes before the water's heights change again: the bodies push only discharge, and
  the next update starts a new generation. The floor's rule is kept per vertex (`floorRows`). Only the worker's runner
  uses it (`SurfZoneRunner.forWorker`); `new SweptContact(…)`, the probes and the tests keep the full build.
- **The kept stencil** is kept only inside a cache scope and its epoch, where the 16 cached heights cannot change. The
  weights are `catmullRomWeights`' expressions and the sum runs in the same order.
- **The other three** are the same arithmetic in the same order, without allocations.

**Identity, checked** (`runs/identity-*.txt`):
- `bench.ts --hash 1` hashes, every step:
  - every snapshot array, the drawn mesh's attributes, index and mask;
  - the camera's water answers through the tube (every 7th drawn slice, 9 points from its lip-to-toe middle up past its
    crest, two margins);
  - the worker's contact answers (every field of `query`, and `floorAt`) and the water's full sample
    (`PhysicalSurfWater.sampleAt`) at every 5th drawn slice, 12 points along its profile, 5 cm either side of it.
- All five switches old against all five on: every hash the same, at 1.5 and 1.8 m, on a38, the pool's cases and the old
  piece, 300 steps each.
- The tube work's pin check (`pin-track.ts`) against `main`: every spot's 26 lines identical (§7). It runs the public
  contact (the full build), and builds it and steps its boards inside cache scopes, so it pins the kept stencil at every
  swept barrel and on the Beach's boards.
- *Found on the way:* an arm that spins its own sea up keeps its spray and bubbles from the spin-up, so it hashes apart
  from an arm that loads the same saved sea. The identity runs compare arms that all load.

## 4. Options for the owner (they change the look or the physics; not built)

Measured at 1.5 m on a38 with the fixes on (`runs/options-*.txt`; the loft-depth rows are their own runs against a default
run in the same state). ms p50.

| Option | Worker CPU stages | Contact | Page's draw | Slices / vertices / upload | What changes |
|---|---|---|---|---|---|
| The default | 9.04 | 1.02 | 2.43 | 89 / 11.9 k / 1.81 MB | |
| The clock refinement one level deep (`LOFT.levels` 1, not a switch) | 8.78 (−0.26) | 0.80 | 1.86 (−0.57) | 64 / 8.6 k / 1.30 MB | slices at least 0.25 m apart, not 0.0625 m: a fast peel's lip drawn and felt in coarser steps along the front |
| No clock refinement (`LOFT.levels` 0) | 8.47 (−0.57) | 0.53 | 1.21 (−1.22) | 37 / 5.0 k / 0.75 MB | every 0.5 m everywhere: the clock may step more than 3 frames between slices, which the refinement (the advisor's 2026-10-22 ruling) is there to stop |
| A 1 m base spacing (`LOFT.spacing` 1) | 9.03 | 0.98 | 2.33 (−0.10) | 85 / 11.4 k | little: the refinement sets the count |
| Formation as step 6 (`?tubeForm=old`) | 8.73 (−0.31) | 0.78 | 1.85 (−0.58) | 61 / 8.2 k / 1.23 MB | the wall forms from about 0.3 s before the throw, not 1.6 s (the wall notes' bars) |
| Step 6's whole build (`?tubeAnchor=old&tubeForm=old&wallFlow=old`) | 8.73 (−0.31) | 0.82 | 1.96 (−0.47) | 65 / 8.7 k / 1.32 MB | the wall notes' anchor, formation and wall water all back |
| No wall water (`?wallFlow=old`) | 8.91 (−0.13) | 0.89 | 2.43 | the same | the wall's flow (#191) |
| No nearest surface (`?tubeContact=old`) | 9.04 | 1.03 | 2.43 | the same | per body sample only: +0.7–0.85 µs a sample in the wall (#198's notes) |
| Medium particles in the worker (the Particles setting) | 8.90 | | | spray 438 particles, not 894; in the tube 23 k fragments, not 253 k (max 0.72 M, not 1.04 M) | fewer drops and mist from the jets |
| The barrel drawn on every second snapshot (arithmetic, not run) | | | −1.2 a snapshot on average | | the drawn tube moves at 30 Hz |
| The smooth wall's cost (`?tubeTrack=on`, opt-in, for the record) | 10.29 (+1.25) | 2.17 (+1.15) | 2.43 | | — |

- `?poolCrash=off` (the solver's own lip) is not an option for the frame rate: it throws far more spray (2796 particles;
  in the tube 3.3 M fragments a frame at p50, 36 M at most).
- The GPU's options (a lower render scale or Medium particles at High) are the Graphics settings; the survey's feature rows
  (§6) measure each on the M4.

## 5. The Canyon's work and the Pool

The owner asked whether the Pool lacks the Canyon's "optimization and graphics rework".

| Work | What it was | Where it applies | The Pool |
|---|---|---|---|
| canyon-perf (2026-10-29): the snapshot's fields in one row-wise pass (`73c0798a`) | `SurfZoneSimulation.writeUniformSnapshot` | every spot | has it: the snapshot's fields are 2.3 ms here |
| canyon-perf: the device gets only the water the CPU changed (`034d0c2b`) | `ShallowWaterSolver.markWater`, `GpuBoussinesq` | every spot | has it. But the tube's jets mark the whole water at each launch (5–6 a second) and long runs at each landing, so the Barrel uploads 160–180 kB a step and 1.26 MB on 9 % of steps, against 7 kB before the tube |
| canyon-perf: the spilling front's owner search (`aa71a388`) | `SpillingFront.update` | the Canyon only (`SPILLING_SPOTS`) | no spilling front at the Pool: nothing to bring |
| canyon-beach-look (2026-10-28) | the beach peaks drawn as the reef: the front's groups, the curl, the roller look | the Canyon only (`?canyonBeachLook=off`) | a look for spilling waves, not a speed-up; it does not fit a plunging tube |
| perf-2026-10-22 | measurements; the glow's 2× MSAA (`?glowMsaa`) | every spot | has it |
| Padang's worker contact with rows on demand (`SweptContact.forOrdinaryWorker`) | the contact's heights and normals found by the queries | Padang only | **lacked it.** This branch brings it to the Pool's face contact (fix 1, −1.1 ms) |
| Padang's 2 m render grid where a tank has 200 k nodes or more | `SurfZoneRunner` | Padang only | the Pool's grid is 281 × 511 = 143.6 k nodes: under it, and its snapshot is not the cost here |

So the Pool already had every global piece of the Canyon's work. What it lacked was Padang's lazy worker contact, now
brought over. The Canyon's beach look is not an optimization.

## 6. How the owner checks the frame rate on the M4

**The quick look (the in-game telemetry).**
1. Settings → Gameplay → Show telemetry: on.
2. Surf → Wave Pool → Waves: Barrel → 1.5 m → Paddle out.
3. Read three rows:
   - FRAME RATE: the page's frames a second;
   - WORKER (new here): the worker's whole time a 1/60 s step, and its water, contact and snapshot;
   - SOLVER: "… ms/step", the water and the board alone.

A FRAME RATE near 10 with WORKER under 16.7 ms means the page or the GPU is the limit, not the worker. A WORKER over
16.7 ms means the sea itself falls behind real time. `?tubeFace=old&tubeFrom=piece` in the address shows the same rows for
the Barrel before the tube work.

**The survey (the numbers to send back).** It runs the production build in a fresh Chrome and records rendered fps, GPU ms
a frame, main-thread ms, the solver's ms and the sea's rate. This branch adds `--waves` (the Wave Pool's Waves row).

```
npm run build && npm run preview        # leave it running; another terminal:
npm run survey:fps -- docs/research/fps/2026-11-06-m4-pro-barrel.json --features --spot="Wave Pool" --waves=Barrel --swell="1.5 m" --only="High (baseline),Particles: low,Render scale 0.5" --rideSeconds=30
```

The three rows are High, High with Low particles (the jets' spray) and High at half the render scale (the GPU's fill).
Run the High row again with each of these `--url`s and `--only="High (baseline)"`, writing a new `.json` each time:
1. `--url='http://localhost:4173/?poolTubeCase=pool'`: the owner's own cases;
2. `--url='http://localhost:4173/?tubeFace=old&tubeFrom=piece'`: the fitted piece as before the tube work;
3. `--url='http://localhost:4173/?plainHeight=old&contactRows=old&barrelHeight=old&cameraWater=old&barrelMesh=old'`: this
   branch's fixes off (`main`);
4. `--url='http://localhost:4173/?tubeForm=old'`: the formation as step 6 (fewer slices).

`--swell="1.8 m"` runs the Big Barrel. `npm run report:fps` writes the table.

**What to read** in each line the survey prints:
- `rendered fps`;
- `gpu <p50>/<p95> ms`: over 8.3 ms at 120 Hz means the GPU is the limit;
- `main <ms>`: the page's own work a frame;
- `solver <ms>`;
- `simulation <×>`: the sea's seconds a wall second, 1.00 when it keeps real time.

From the numbers:
- If the fps is low and the GPU ms is high, and `?tubeFace=old&tubeFrom=piece` restores it, it is the drawing (the tube
  mesh or the spray). The Low particles row then tells the spray apart, and the half render scale the fill.
- If the main thread is high, it is the page's CPU work.
- If the simulation rate falls under 1, it is the worker.

## 7. Tests

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- The main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`):
  322 files passed (34 skipped), 3117 tests passed (23 expected fail, 40 skipped), 522 s.
- The SurfZoneSimulation subset (`npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"`):
  SZS_RESULT.
- The pin check (`docs/research/pool-tube-track-2026-11-05/pin-track.ts`, bundled against `main` in `.m1-cpu-main/` and
  against this branch): all 26 lines identical (`runs/pin-main.txt`, `runs/pin-branch.txt`). They cover every spot's sea;
  every swept barrel's front, crash, contact loft and drawn loft; the Barrel's water as the bodies feel it; and lone
  boards stepped on the Beach's and the Barrel's water. The Barrel's lines run its defaults and the old switches, at 1.5
  and 1.8 m, on both case lists.
- New, `src/wave/barrel/poolBarrelPerf.test.ts`, each checked to fail when its fix is broken:
  - the lazy face contact answers every query, floor and normal field as the full build does, on three faces (the
    default, the smooth wall, the union alone), over three generations of wavy water; a contact without the floor's rule
    differs;
  - the plain surface's kept stencil answers `plainSurfaceAt` and every `sampleAt` field as before, in and out of cache
    scopes, across invalidations and the grid's edges;
  - the camera's water test answers the same in typed arrays, including lofts whose strips' triangles interleave;
  - the mesh's faces-out loop gives the same indices.
- `src/scene/water/cubicSurface.test.ts`: `sampleCubicHeight` equals `sampleCubicSurface(…).height` bit for bit at 12,000
  scrambled points and every node, past every edge, at three spacings.
- `src/game/PhysicalMode.test.ts`: the five switches parse, the worker's two reach the config (the contact's at the Barrel
  alone) and an online room's overrides pin them.

## Tools

- `bench.ts` with `arm.ts`: the paired bench above.
  - Arms: `base-pool`, `base-a38` (the pre-tube tree), `a38`, `pool`, `old-a38`, `old-pool` (`?tubeFace=old&tubeFrom=piece`);
    any arm takes `=key:value+key:value` (config switches, or the page's `barrelHeight`, `cameraWater`, `barrelMesh`,
    `particles`).
  - `--hash 1` for the identity hashes; `--loft levels=1` or `--loftSpacing 1` for the options; `--dump` for every step.
- `long.ts`: one arm over minutes of sea, a line every `--every` steps.
- The pre-tube tree: `git archive 135782d6 src | tar -x -C .m1-cpu-base`, then
  `sed 's#\.\./\.\./\.\./src/#../../../.m1-cpu-base/src/#g' arm.ts > arm-base.ts`.
- Build: `rolldown docs/research/pool-barrel-perf-2026-11-06/bench.ts -o dist/scripts/barrel-bench.mjs --format esm --platform node`,
  then `node dist/scripts/barrel-bench.mjs --swell medium --arms base-pool,a38,pool --steps 600`.
  - The first run of an arm spins its sea up (about 2 minutes) and saves it to the scratch directory named in `bench.ts`.
