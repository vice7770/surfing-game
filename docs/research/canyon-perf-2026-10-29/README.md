# The Canyon's frame rate on the M1 (canyon-perf, 2026-10-29)

The ask (the coordinator, the owner's queue after #162): a smooth frame rate at the Canyon. Its window grew from 240 m to
260 m to 400 m (+54 % cells), Big gained eddy-viscosity substeps (#156), and the beach look (#162) added work on the CPU
and the GPU. Four things were asked:

- measure on this M1 at each size, on both tiers, against the Canyon before #158 (`b11d63ef`);
- find the biggest costs;
- fix what keeps the output identical, with a test that pins it;
- list, with measured savings, the options that would change the look or the physics.

Branch `claude/canyon-perf` from `main` at `8c7b6b22`.

**In short**

- **Before #158 the GPU tier kept real time at the Medium preset; today it does not.**
  - Before (260 m): the worker took 12.0–12.1 ms a step (1.35× real time).
  - Today (400 m): 17.7–18.4 ms (0.89–0.90×), against the 16.7 ms a 1/60 s step allows.
  - At the High preset: 23–28 ms (0.60–0.74×), against 16.6–17.3 ms (0.94–1.03×) before.
- **The cause is the window.** Every stage that walks the cells or the render nodes costs about 50–60 % more. The snapshot is the biggest of them.
- **What else did not cost anything:**
  - Big's substeps cost nothing in the game: at the worker's 1/60 s step, Big splits none of 1800 steps. #156's doubling was timed at 1/30 s.
  - The beach look costs 0.8–1.0 ms of CPU a step (#162's notes).
- **This branch takes 3.5–4.1 ms off each step on the device (−13 to −15 %), paired against main, with the output identical:**
  - the snapshot's passes;
  - the water sent to the device: only the cells the CPU changed, 15–33 kB a step instead of 2.2 MB;
  - the front's owner search.

  At the Medium preset in the worker's fast state, that puts the step at about 15.6 ms (about 1.07× real time). That figure is estimated from the paired ratio; the pairs ran in the slow state. High still falls short.
- **The page's GPU frame from the start camera:**
  - +1.4 ms at the Medium preset (7.5 → 8.9 ms at 1280 × 720);
  - +0.9 ms at High (9.95 → 10.8 ms).

  The beach look's meshes and roller look cost under 0.1 ms there. The rest is the larger window's water.
- **Correction to #162's notes:** the machine they measured was this M1 Air, not an M4 Pro. Those notes are corrected here.

## Machine and conditions

| | |
|---|---|
| Machine | MacBook Air, Apple M1 (4P + 4E cores, 8-core GPU), 8 GB |
| Browser | the Claude desktop app's pane (Chromium, ANGLE Metal, WebGPU), hidden throughout: no live frame rate (requestAnimationFrame barely runs), so the frame times are GPU timers |
| Load | 1–4 (other sessions idle). Node runs and page runs were kept apart except where a table says so |
| Trees | today `8c7b6b22` (main, #162); before #158 `b11d63ef` (`.m1-cpu-base/`); this branch against main (`.m1-cpu-main/`) |

**The worker's two states.**
- The page's worker ran in a fast state for the first runs (main 18.4 ms a step at Medium/Medium) and in a slow state later (27.2 ms, the same sea and settings).
- The slow state is probably the hidden pane's worker on the efficiency cores, as perf-2026-10-22 saw.
- Paired arms share the state, so their difference and ratio hold; absolute numbers need the state named.

## 1. Measurements

### The GPU tier: the game's worker on the device, paired against `b11d63ef`

`gpu-check.html?mode=pipeline&arms=base` runs the game's host and worker with an idle rider, one step per request as in play. The two trees run in turn, in 2 s slots, for 12 s each. Total ms a step at p50; real time is the sea seconds per wall second.

| Size | Preset | Before #158 | Today | Before, real time | Today, real time | State |
|---|---|---|---|---|---|---|
| Small | Medium (24 components) | 12.0 | 17.7 | 1.35× | 0.89× | fast |
| Medium | Medium | 12.1 | 18.4 | 1.35× | 0.90× | fast |
| Big | Medium | 17.8 | 27.8 | 0.91× | 0.60× | slow |
| Small | High (64 components) | 17.1 | 23.2 | 1.03× | 0.74× | slow, with a Node run alongside |
| Medium | High | 17.3 | 26.4 | 0.94× | 0.62× | slow |
| Big | High | 16.6 | 27.5 | 0.97× | 0.60× | slow |

**The budgets** (`Graphics.ts`):
- one step must fit in 16.7 ms (`STEP_BUDGET_MS`) for the sea to keep real time;
- the Auto benchmark's stage-2 test is a median water-and-board step ≤ 15 ms (`STAGE2_REALTIME_MS`);
- its sea test is 1.2 × the median worker step ≤ 16.7 ms, i.e. ≤ 13.9 ms.

The pipeline above is the ride's whole worker. Today it misses the step budget at every size and preset; before #158 it held it at the Medium preset.

**Where today's step goes** (Medium swell, Medium preset, fast state, ms):
- step 11.2. In it:
  - the water's commit 0.9;
  - packing and sending the water 1.1;
  - the CFL scan 0.6;
  - foam 3.5;
  - aeration 1.9;
  - breaking and the spilling front 1.3;
  - the board 0.5;
  - the rest (roller, curl, bubbles, spray) about 1.4.
- snapshot 6.7 (its fields 6.2);
- summary 0.4.

The device waits about 7.3 ms for its readback. The solo worker's prefetch hides that wait behind the rest.

Each step sends 2.2 MB up and reads 6.5 MB back. Raw runs: `pipeline.txt`.

### The worker's CPU stages and the CPU tier (Node, paired against `b11d63ef`)

`scripts/m1-cpu-ab.ts` steps both trees on their own saved seas, with the order alternated every step. 300 steps, ridden (idle, then paddling), 64 components, ms p50. "CPU stages" are what the worker runs on the CPU on the GPU tier (everything but the water). "Water" is the stage-2 solver on the CPU.

| | Small, before | Small, today | Medium, before | Medium, today | Big, before | Big, today |
|---|---|---|---|---|---|---|
| CPU stages | 8.79 | 11.95 | 8.56 | 12.80 | 8.05 | 13.65 |
| snapshot (its fields) | 2.95 (2.69) | 4.81 (4.36) | 3.00 (2.73) | 5.05 (4.55) | 2.91 (2.66) | 5.41 (4.87) |
| foam | 1.59 | 2.63 | 1.58 | 2.61 | 1.48 | 2.66 |
| aeration | 0.74 | 1.17 | 0.69 | 1.38 | 0.67 | 1.30 |
| breaking and spilling front | 0.55 | 1.09 | 0.56 | 1.24 | 0.55 | 1.30 |
| roller | 0.10 | 0.41 | 0.19 | 0.64 | 0.13 | 0.74 |
| the swept barrel's front (the tube, off since #158) | 1.34 | 0 | 1.03 | 0 | 0.86 | 0 |
| water on the CPU (stage 2) | 48.6 | 76.5 | 48.5 | 78.4 | 48.8 | 79.2 |

**The grids:**
- before: 260 × 451 = 117,260 cells, 261 × 511 render nodes;
- today: 400 × 451 = 180,400 cells (+53.9 %), 401 × 511 nodes (+53.6 %).

The CPU stages grow 36–70 %. The cells' share of that is offset by the tube's front, which today's Canyon no longer runs.

**The CPU tier** (`m1-cpu-bench.ts --stage 1`, the Fast tier's stage-1 water, which Auto picks when the stage-2 step misses 15 ms; Medium; not paired; it ran alongside another Node run):
- before: water 24.7 ms and CPU stages 17.1 ms (its breaking model on the CPU 4.8), about 42 ms a step;
- today: water 37.7 ms and CPU stages 25.1 ms (breaking 8.8), about 63 ms a step.
- Neither keeps real time on the M1 (0.40× before, 0.27× today). Stage 2 on the CPU (79 ms of water) is further still.

### Big's substeps in the game

`substeps60.ts`, from Big's saved sea, t 28–58 s:

| Step | Steps split | Split by the eddy viscosity | Substeps a step |
|---|---|---|---|
| 1/60 s (the worker's) | 0 of 1800 | 0 | 1.000 |
| 1/30 s (canyon-wave-r2's bench) | 534 of 900 | 534 | 1.593 |

Big's eddy viscosity limits the stable step to between 1/60 and 1/30 s. A 1/30 s step splits; the game's 1/60 s step does not. The device reported 1.00 substeps a step at every size too (`deviceSubsteps`).

### The page's GPU frame from the start camera (paired in one page)

`perf-2026-10-22/tools/ab.html`:
- both trees' water sheets (`?inpage&waterSheet&diagnostics&compute=gpu&swell=medium`) in two iframes;
- each tree's steady-state frame timed in turn, 8 cycles of 20 frames;
- Rich, 1280 × 720;
- `ride` is the game's own camera at the take-off;
- the paired difference is given with its range.

| Preset | View | Before #158 | Today | Paired difference | Main-thread submission |
|---|---|---|---|---|---|
| Medium | ride (the start camera) | 7.52 | 8.91 | +1.41 [1.27, 1.48] | 2.1 / 2.3 |
| Medium | horizon | 8.72 | 9.86 | +1.15 [1.00, 1.19] | 1.9 / 2.1 |
| High (64 components; the sheet's own 1280 × 720, not High's 1.75 density) | ride | 9.95 | 10.78 | +0.88 [0.55, 1.15] | 2.4 / 2.4 |
| High | horizon | 10.90 | 12.25 | +1.33 [1.10, 1.48] | 0.7 / 2.4 |

Today's frame alone, the ride view, Medium preset (throughput arms, the look's parts switched off in turn):
- the roller look in the water shader: +0.01 ms;
- the curl and roller-front meshes: +0.01 ms;
- both: +0.02 ms.

The +1.4 ms is the larger window's water: its render grid and its textures, +54 % of nodes. In a game frame on the M1 the page's drawing shares the GPU with the water's own step, which reads back 6.5 MB a step. Raw: `frames.txt`.

## 2. Where the time goes

**The window's cells (+54 %).** Every stage that walks the cells or the render nodes grows with them:
- the snapshot's fields (the render nodes);
- foam, aeration and the breaking model (the cells);
- the device's 9 readback fields and its upload.

Against `b11d63ef` the CPU stages gain 3.2–5.6 ms a step and the stage-2 CPU water 28–30 ms.

**The substeps.** Nothing at the game's 1/60 s step (above).

**The front, the roller and the curl.**
- Breaking plus the spilling front: 1.1–1.3 ms.
- The roller: 0.4–0.7 ms. Its "crowded" seating is 0.1 ms of `writeTable`: nothing to win.
- The curl's slices and the roller front: under 0.1 ms on the GPU.
- #162's measure of the beach look on the CPU: 0.8–1.0 ms a step.

**The snapshot.**
- The single biggest CPU stage: 4.4–4.9 ms in Node, 6–10 ms in the page's worker.
- It resamples the 180,400 cells to 204,911 render nodes, six floats a node, every step: one step per snapshot (`MAX_BATCH_STEPS` 1).

**The device's traffic.**
- The water went up whole, 2.2 MB, before every step: 1.1 ms to pack, and the transfer ahead of the step.
- 6.5 MB comes back: 0.9–2.1 ms to unpack nine fields.
- The CFL scan on the CPU: 0.6–1.1 ms.

**The drawing.** +0.9 to +1.4 ms of GPU a frame from the start camera; the look's parts are under 0.1 ms of it.

## 3. What this branch changes (identical output)

1. **The snapshot's fields** (`SurfZoneSimulation.writeUniformSnapshot`).
   - The pass over the cells goes row by row:
     - each cell's foam cover (dense + lace) is summed once;
     - the plume's void fraction and the curl's air share are computed inline, with no call or remainder per cell (`SpillingCurl.airShareAt`);
     - each row notes whether it holds any foam, or any air or plume.
   - The pass over the nodes branches once on wet. Where neither of a node's solver rows holds foam (or air and plume), it writes the +0 that a weighted sum of zeros gives, without reading them.
   - Same arithmetic, same order.
2. **The water sent to the device** (`ShallowWaterSolver.markWater`, `GpuBoussinesq`).
   - Before every device step the water (h, qx, qz) went up whole, though it had just come back from the device. Only a board's push (`PhysicalSurfWater.push`) or a lip's landing had touched it since.
   - The solver now notes which cells the CPU changed. These mark all of it:
     - its own CPU step;
     - a window shift;
     - an import;
     - a warm start;
     - a lip's launch (`PlungingLip.drawFromCrest`).
   - The device holds the solver's water only from an unpack until its next submission. Between those it sends just the changed run of cells, from the same f32 bits. Otherwise (at creation, or after a step whose result never came back) it sends it all.
   - Upload: 2.2 MB → 15–33 kB a step.
3. **The spilling front's owner search** (`SpillingFront.update`). A breaking cell asks only the live waves that have joined its column, in order. A wave with no onset there can never own the cell, so the owner is the same. With the beach look's 40-odd live waves, the old search asked every wave for every breaking cell.

**Identity.**
- **Node** (`scripts/m1-cpu-ab.ts` against main, from saved seas):
  - every snapshot array of every step identical, and the final state's SHA-256 the same;
  - Medium t 22 and t 82, Big t 28 and t 88, 300 steps each.
- **The device** (`gpu-check.html?mode=replay`, 240 frames, ridden, every snapshot filled): the hashes of all 22 arrays and of the snapshots are the same as main's on this M1's WebGPU device:
  - Medium on the prefetching solo path;
  - Big on the ordinary path.

  Raw: `replay.txt`.
- **Tests:**
  - `src/wave/uniformSnapshot.test.ts` compares the snapshot's fields byte for byte with main's algorithm. It uses scrambled seas: wet and dry, rows with and without foam or air, ±0, the Canyon's curl and the Beach without one. Checked to fail on a broken row note.
  - `GpuBoussinesq.test.ts` gains a stand-in device with memory, which checks step by step that the device's water is the CPU's bits:
    - a whole upload first;
    - nothing when nothing changed;
    - only the changed run;
    - all of it after a step without readback;
    - all of it after a CPU step.

    Checked to fail when a changed run is not sent.

**What it saves.**

The worker on the device, paired against main in one page (`gpu-check.html?mode=pipeline&arms=base&baseDir=.m1-cpu-main`, 16 s each, the slow state in both arms), ms a step at p50:

| Size | Preset | Main | This branch | Difference | Real time, main → branch | Snapshot | Device wait for readback | Pack |
|---|---|---|---|---|---|---|---|---|
| Medium | Medium | 27.2 | 23.1 | −4.1 (−15 %) | 0.605× → 0.711× | 10.7 → 8.1 | 11.6 → 9.1 | 1.1 → 0.0 |
| Medium | High | 26.4 | 22.6 | −3.8 (−14 %) | 0.622× → 0.725× | 10.7 → 8.1 | 11.6 → 9.0 | 1.1 → 0.0 |
| Big | Medium | 27.6 | 24.1 | −3.5 (−13 %) | 0.598× → 0.684× | 11.1 → 8.6 | 11.9 → 9.5 | 1.1 → 0.0 |

**Applied to the fast state:** at the Medium preset, the 18.4 ms step × 0.85 is about 15.6 ms, about 1.07× real time. That is an estimate from the paired ratio; the pairs did not run in the fast state.

In Node (from the seas aged a minute; the per-stage differences are paired medians, so they do not sum exactly to the total):

| Stage | Medium | Big |
|---|---|---|
| Snapshot | −0.75 | −0.58 |
| Front | −0.09 | −0.15 |
| CPU stages, total | −0.84 (14.00 → 13.17) | −0.74 (15.89 → 15.15) |

In the page's worker the snapshot gains more (−2.5 ms). Once the 2.2 MB upload is gone, the device's wait for its readback falls by 2.5 ms too, but the prefetch already hid most of that wait. The step's total falls by about what the snapshot (−2.6 ms) and the packing (−1.1 ms) give back.

**Tried and not kept:**
- **Skipping the foam's and the air's empty blocks within busy rows**, each block of 16 columns bounded by its departures' reach. It skipped 29 % of the wet cells in the busy rows and saved nothing net (+0.10 ms). The finer scan and the per-cell check cost what the skipped cells saved: those loops are already row-skipped.
- **Folding the roar's sums and the breaking fraction's count into the snapshot's pass over the cells.**
  - Folded into the snapshot's loop, the total got worse (+0.6 ms).
  - Folded into one pass of their own, it gained nothing.
  - The passes are memory-bound.

## 4. Options that would change the look or the physics (not built; the owner's call)

| Option | Saving measured here | What changes |
|---|---|---|
| The window back to 260 m (before #158) | The device step 18.4 → 12.1 ms at Medium/Medium (fast state), 26.4 → 17.3 ms at Medium/High; CPU stages −3.2 to −5.6 ms; CPU water −28 to −30 ms; the page's frame −0.9 to −1.4 ms | The beach peaks go: they need the window |
| The render grid at 1.5 m (or 2 m) instead of 1 m | The snapshot's fields 4.09 → 2.70 ms (2.20 at 2 m) in Node, about 1.9× that in the page's worker; fewer nodes for the page to upload and draw (not timed) | The drawn surface's resolution; the swell's crests and the curl drawn on a coarser mesh |
| The beach look off (`?canyonBeachLook=off`) | CPU 0.8–1.0 ms a step (#162) | The beach peaks drawn and felt as before #162 |
| The High preset on the M1: 24 components, or Medium's particles | The pipeline's High and Medium presets were 26.4 and 27.2 ms in the same slow state: the components cost the worker little. High's drawing is the larger cost (perf-2026-10-22: 1.75 density, 2240 × 1260) | Sea detail, or the frame's sharpness |
| The roller look off from far cameras | Under 0.1 ms in throughput at the start camera (0.9 ms in #162's per-frame timer, on another sea and moment) | The bores' look from afar |

**Identity-preserving, not built yet** (the next candidates):
- **The device's readback of the predictor (2 of its 9 fields), kept as f32 and widened only when read** (an export, a CPU fallback, a layout upload): about 0.3–0.5 ms of unpacking.
- **The CFL scan on the device** (a max over cells, read back as one float): it must give the same substep count. A max in f32 on the GPU against f64 on the CPU can round differently, so this needs care.

## 5. Tests

- `npx tsc --noEmit -p .`: TSC
- The main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`): MAIN
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "[Cc]anyon|[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`: SZS
- The GPU parity tests (`src/wave/gpu/*.test.ts`, `src/dev/tierParity.test.ts`, `src/game/SurfZoneWaterPrefetch.test.ts`, `src/game/SurfZoneHost.test.ts`): 169 passed before the main suite's run.
- On the device: the replay hashes above. No rider sessions.

## Tools (all wave only)

- `snapshot-bench.ts`:
  - the snapshot's fields, the whole fill and the status, timed on a held saved sea;
  - `--spacings 1.5,2` times a coarser render grid.
- `substeps60.ts`: the share of the game's 1/60 s steps (or `--rate 30`) split into substeps, and by which limit.
- `age-sea.ts`: steps a saved sea a minute on, for A/Bs on a developed surf zone.
- `empty-probe.ts`: how much of the foam's and the air's per-cell work falls on empty water (the screen behind the block skip above).
- `scripts/m1-cpu-ab.ts` and `scripts/m1-cpu-bench.ts` gained:
  - `--stage 1`;
  - the water's own step in the A/B's table.
- The paired-page recipe is perf-2026-10-22's:
  - `.m1-cpu-base/` for `b11d63ef`, with its `index.html` pointed at `./src/main.ts`;
  - `.m1-cpu-main/` for main, with its `gpu-check.html` pointed at `./src/gpuCheck.ts`;
  - `&baseDir=.m1-cpu-main` for the pipeline.
- An identity A/B against main needs a copy of `m1-cpu-ab.ts` importing from `.m1-cpu-main` (`sed 's#\.\./\.m1-cpu-base/#../.m1-cpu-main/#g'`).

Build each with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`.
