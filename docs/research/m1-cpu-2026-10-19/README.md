# The M1 CPU study · 2026-10-19

Branch `claude/m1-cpu`, stacked on `claude/m1-readback` (PR #114, `a999e3e2`). The aim is to cut the worker's per-step CPU time on the owner's Apple M1 (8 GB) with the physics byte-identical. The water's GPU step and the readback were the previous study's subject. This one covers the CPU stages that run after the water moves: breaking, the spilling front, the swept front and crash, foam, aeration, the swept contact, the board and rider, particles and the snapshot.

Every number here comes from the shared M1 while the coordinator's full test suite was running in another worktree (load average 2–6). Absolute times therefore read high. The comparisons are paired: the old and new code ran in the same process on the same sea, stepping alternately.

## How it was measured

- **`scripts/m1-cpu-bench.ts`** steps the game's ridden sea in Node, at a given spot and size, one 1/60 s request at a time. The water steps on the CPU solver, and a snapshot and status are filled after every step, as the worker replies. The first run spins the sea up and saves it (`--state`), and later runs start from that sea. The script reports each stage's p50/p95 and hashes every snapshot and the final state. `node --cpu-prof` on it gave the profiles that picked each change.
- **`scripts/m1-cpu-ab.ts`** builds two runners, one from the baseline tree (`git archive a999e3e2 src` into `.m1-cpu-base/`) and one from this tree, on the same saved sea. It steps them alternately with the same input, swapping the order every step. It reports both arms' p50/p95, their ratio and the paired median difference. It also compares every step's snapshot buffers and the final state byte for byte. The commit messages carry this A/B against the previous commit.
- **`gpu-check.html?mode=replay&fill=1`** (new) also fills a snapshot and its status after every step and hashes the stream of snapshots. This checks the snapshot writer to the byte on the real WebGPU device.
- **`gpu-check.html?mode=pipeline`** now also prints the snapshot fields, the summary and every stage's p95. With **`&arms=base`** (dev server only), the second arm runs an older tree's worker from `.m1-cpu-base/`, or from the folder `&baseDir=` names.

The CPU solver stands in for the GPU in Node. The stages measured here run after the water and do not depend on where it stepped. The GPU's water is checked separately by the replay hashes.

## Results (Node A/B, M1, against `a999e3e2`, stages alternated in one process)

Canyon Medium, 300 steps, ridden (idle, then paddling). ms p50/p95:

| Stage | Before | After | Ratio (p50) |
|---|---|---|---|
| Snapshot (fill) | 3.81 / 4.14 | 2.65 / 2.88 | 0.70 |
| of which the fields | 3.52 / 3.83 | 2.35 / 2.56 | 0.67 |
| Foam | 2.50 / 2.73 | 1.48 / 1.66 | 0.59 |
| Aeration | 1.54 / 1.69 | 0.92 / 1.06 | 0.60 |
| Board | 1.26 / 2.21 | 0.82 / 1.80 | 0.66 |
| Breaking (with the spilling front) | 0.75 / 0.82 | 0.53 / 0.61 | 0.71 |
| Roller, bubbles, spray, summary | 0.18, 0.18, 0.10, 0.27 | unchanged | 1.0 |
| **CPU stages per step** | **11.23 / 12.71** | **7.52 / 8.79** | **0.67** |

Padang Padang Medium, 240 steps, ridden:

| Stage | Before | After | Ratio (p50) |
|---|---|---|---|
| Swept contact | 18.44 / 21.27 | 3.16 / 4.69 | 0.17 |
| Front (crests, front, crash) | 5.99 / 7.18 | 2.06 / 3.16 | 0.34 |
| Foam | 2.49 / 2.65 | 1.53 / 1.67 | 0.62 |
| Aeration | 1.63 / 1.71 | 1.02 / 1.19 | 0.63 |
| Board | 1.09 / 2.42 | 0.73 / 2.08 | 0.67 |
| Snapshot (fill) | 2.47 / 2.65 | 2.33 / 2.54 | 0.94 |
| Spray, breaking, summary | 0.56, 0.15, 0.21 | unchanged | 1.0 |
| **CPU stages per step** | **33.51 / 38.52** | **12.76 / 15.96** | **0.38** |

"CPU stages per step" is the step's wall time minus the water's, plus the snapshot and the summary. It includes the wave gauge, which belongs to no named stage. Every snapshot of both runs (320 and 260 steps, warm-up included) and both final states were byte-identical between the arms.

## Results in the browser (hidden pane, M1, the old and new workers alternated in one page)

`gpu-check.html?mode=pipeline&arms=base` drives this tree's worker and the baseline's (`a999e3e2`, extracted to `.m1-cpu-base/`) on the same solo host. The two take turns in 2 s slots for 12 s each, so a busy machine's drift falls on both alike. These are hidden-pane numbers. The worker's own stage times hold better than the wall-clock rates, but whole runs moved between a fast state and a slow one (Canyon's unpack read 0.6 ms in one and 1.4 ms in the other), so each row compares within one run. ms p50/p95, new vs old:

| Run | Real time | Snapshots/s | Worker total | Snapshot (fields) | Foam | Aeration | Board | Contact | Front |
|---|---|---|---|---|---|---|---|---|---|
| Canyon Medium, calm | 1.422× vs 1.030× | 85.8 vs 62.3 | 11.5/12.4 vs 15.8/17.6 | 3.2 (2.9) vs 5.5 (5.1) | 1.9/2.2 vs 3.2/3.5 | 1.4/1.7 vs 2.2/2.4 | 0.6/0.7 vs 1.0/1.5 | — | — |
| Canyon Medium, calm (slow state) | 1.021× vs 0.702× | 61.8 vs 42.6 | 16.1/17.3 vs 23.3/25.5 | 5.7 (5.3) vs 7.1 (6.8) | 2.4/2.7 vs 4.4/4.6 | 1.8/2.0 vs 3.9/4.2 | 0.9/1.5 vs 1.6/2.3 | — | — |
| Canyon Medium, `&gpuLoad=600` | 0.664× vs 0.513× | 40.4 vs 31.3 | 25.5/31.0 vs 33.3/37.8 | 6.2 (5.8) vs 8.0 (7.6) | 2.6/3.1 vs 5.0/5.8 | 1.9/2.3 vs 4.4/5.0 | 1.1/1.8 vs 1.8/2.5 | — | — |
| Padang Medium | 0.635× vs 0.302× | 38.6 vs 18.7 | 25.4/33.6 vs 53.4/72.7 | 5.1 (4.6) vs 5.2 (4.7) | 2.3/2.6 vs 4.3/4.5 | 1.9/2.2 vs 4.0/4.2 | 0.7/1.3 vs 1.3/2.3 | 5.5/9.3 vs 25.6/39.2 | 2.7/6.8 vs 7.7/14.3 |

At Padang the new arm's sea was further along, with 1.57 CFL substeps a step against 1.00. The comparison there is therefore conservative for the new code. Under `&gpuLoad=600` the water map is 14.7 vs 16.3 ms, so the GPU still bounds the step. Canyon's earlier calm run gave 1.448× against 1.072×.

## Physics identity

The device replay (`gpu-check.html?mode=replay&prefetch=1&fill=1`) hashes every array that carries the sea after the run, plus the clock, lip, front, board and the stream of filled snapshots:

- **Canyon Medium, 240 frames:** `h d693da8d…`, summary `6aa0ad3b…` and snapshots `e2d8750d…` match the baseline (run at `bb10573c`, before any change) at `42a6ead3`, `a5634f39` and `cf7c6cef` (the last code change).
- **Padang Medium, 300 frames (36 with two substeps):** `h 8c17c180…`, summary `169e6e4c…` and snapshots `4774f32b…` match at `42a6ead3`, `d81c3f7a`, `a5634f39` and `cf7c6cef`.

The `h` and summary hashes also equal the readback study's. Each commit was also checked in Node: the A/B harness compared every snapshot of 170–320 steps and the final state against the previous commit, and they matched. Where a rewrite replaced arithmetic, a scratch build ran the old and new forms side by side on every call of a Padang run and compared them with `Object.is`:

- `arcBound`: 1,250,880 calls, 0 differences.
- The Bezier and vector helpers: 4,222,640 calls, 0 differences.
- `root`: 6,075 calls, 0 differences.

## What was built (each its own commit)

1. **The lifecycle clock cache keeps every slice (`868ce009`).** Padang's front and contact ask `ProfileLibrary.analyticClock` for about 200 distinct slices a step, nearly the same ones each step (428 over 40 steps). The cache was a FIFO of 64, so it thrashed, and every step rebuilt about 400 clocks. Each rebuild is a 64-step bisection over the roof Bezier. The clock is a pure function of the slice, so 4096 entries return the same values. Contact 17.2 → 6.7 ms.
2. **The snapshot's lens tops get a pass of their own (`3f5f8d15`).** At the Canyon, `riseAt` ran for 27,000 nodes inside the node loop, and the call also kept V8 from holding the loop's arrays in registers. A new pass now visits the lens rows. Within them it asks only where `SpillingRoller.reachAt` puts a lens, and outside that span `riseAt` returns +0. Fields 3.7 → 2.4 ms.
3. **Foam and aeration each make one pass, and rows with nothing to carry take no departures (`42a6ead3`).** Each field now advects and decays in one pass. A row whose departures can only read rows with no foam (or no air, plume or turbulence) skips the departure computation. `DepartureRows` bounds where the departures can land: the row's fastest across-shore current over its shallowest wet depth, times dt. Rounding is monotonic, so the bound holds, and a pad goes far past rounding. 405 of Canyon's 636 rows are skipped, and 364 of Padang's 617. The checkpoint oracle replay gains a sparse case; a window that ignores the current fails it at step 9.
4. **`arcBound` runs on scalars (`19f9d443`).** The root guard's arc bound used to build a dozen arrays per call, at about 120 calls per profile.
5. **The roof envelope bisects to the facets that hold each x (`0036d210`).** It used to make about 3,400 facet tests per profile.
6. **The front's crests are found row by row (`d81c3f7a`).** The column scan had read a cache line per cell. The crests are now found in row order and then visited in column order through a counting sort.
7. **The spilling front clears its rows with `fill` (`9c3baebb`).**
8. **The loft keeps one cap probe per x while refining a front (`e6be1d3c`).** About 280 probes a step held 190 distinct x.
9. **The analytic caches are keyed by number (`ae7477e4`).** Each lookup used to turn three or four doubles into a joined string. Nested Maps keyed by the numbers join keys exactly as the strings did: SameValueZero joins ±0 and NaN, as `String` does. Front −0.94 ms.
10. **`ulp32` uses shared scratch (`5c12068f`).**
11. **The board step and the gauge share PhysicalSurfWater's render-node cache (`a5634f39`).** The bodies push only discharge, so the node heights hold through the step. Board −0.4 ms, and the gauge's time drops too.
12. **The C profile's Bezier and vector helpers build one array each (`3bc47ae9`).**
13. **A cheaper finiteness test in the departure scan (`4515e333`).**
14. **The C contour's points start empty (`436810ef`).**
15. **The root turn's guards reuse their end points, and `faceBound` runs on scalars (`cf7c6cef`).**

## Not built

- **Hoisting `breakingFraction`'s arrays and flattening its loop.** This made the summary slower (0.30 → 0.38 ms), so it was reverted.
- **A per-cell foam sum in the snapshot's prepass.** It was byte-identical and saved 0.02–0.05 ms, too little to keep.
- **A cached bed interpolation in the snapshot.** It would save about 15 % of the node pass. It breaks the writer's contract under input aliasing (a test mutates the bed mid-pass), and the bed has no version to invalidate on.
- **The snapshot node pass in general (about 2 ms for 112,000 nodes).** It is now 32 loads and 6 stores per node, with no calls. The options left all change the page's bytes:
  - Skip fields the page does not need every frame. The roar, front, roller and particle copies are already under 0.1 ms each; only the three render fields cost.
  - Pack them as f16.
  - Interpolate them on the GPU from solver-grid textures.

  Each would save 1–2 ms, but it would be a visual change, not an exact one.
- **Further exact work in the bounded-C profile.** Padang's remaining contact and front (about 5 ms together) are spread over `sampleBoundedC`, the roof, `frameAt` and `withinSpan`'s atan2 (each 0.2–0.5 ms). More scalar rewrites of the same kind might save about 1 ms. The atan2 test cannot be replaced exactly, because of its 1e-12 tolerances.
- **Spray flight.** Its 3-argument `Math.hypot` per particle would be faster as a `sqrt`, but the rounding differs, so it is not exact.
- **Power-of-two divisions as multiplications in the departures** (dx and the row gaps). This would be exact for dx 1 or 2 and the 1 m or 4 m rows. The expected gain is about 0.1 ms, so it was not built.
- **The one-step lag pipeline** from the readback study remains the only way past a GPU saturated by drawing. It is not byte-identical.

## Confirming on the visible pane

First extract the baseline next to `src`: `git archive a999e3e2 src | (mkdir -p .m1-cpu-base && tar -x -C .m1-cpu-base)`. Delete the folder afterwards.

- `gpu-check.html?mode=pipeline&spot=canyon&size=medium&seconds=12&arms=base`
- `gpu-check.html?mode=pipeline&spot=canyon&size=medium&seconds=12&arms=base&gpuLoad=600`
- `gpu-check.html?mode=pipeline&spot=padang&size=medium&seconds=12&arms=base`
- `gpu-check.html?mode=pipeline&spot=canyon&size=medium&arms=both&seconds=10`
- `gpu-check.html?mode=pipeline&spot=canyon&size=medium&arms=both&seconds=10&gpuLoad=600`
- `gpu-check.html?mode=pipeline&spot=padang&size=medium&seconds=10`
- `gpu-check.html?mode=replay&spot=canyon&size=medium&frames=240&prefetch=1&fill=1`. Expect `snapshots e2d8750d987da680`.
- `gpu-check.html?mode=replay&spot=padang&size=medium&frames=300&prefetch=1&fill=1`. Expect `snapshots 4774f32b7106dc17`.

## After merging the Canyon spilling lip (`claude/playtest-2026-10-17`)

The merge commit is `bbd8c226`. The lip (#113) gives the drawn foam a shoreward surface drift on top of the current, at most 0.4 m/s. The drift moves the foam's own departure points only; the stencil the air reuses stays the current's. The lip also draws a whitewater of its own beside the felt one, sources the drawn foam from it, and clears each shoulder ahead of a front before the foam step.

How each conflict was resolved:

- **`FoamField.update`.** The lip's rules are folded into the one-pass update:
  - After the stencil records the current's departure, the foam's own departure moves drift·dt further seaward wherever drift·dt > 0.
  - The source follows the drawn breaking (a rate wherever strength > 0 and drawn > 0). The bore measurement still follows the felt breaking.
  - `DepartureRows.quiet` takes the drift and widens a row's window downward by the row's largest drift·dt over its wet cells. The air keeps the current-only window.
  - A new oracle case replays sparse fields against the lip's own two-pass foam (`78f5c2c9`). The drift varies by row: fast (some of it carries foam a row or more in a step), slow, zero, NaN and negative. The case also uses a drawn breaking. It is byte exact over 90 steps with rows skipped, and without the widening it fails at step 9.
  - On the real Canyon sea the widening never changed a decision in 140 steps: 0.4 m/s moves a departure under 1 cm, and the window already reaches the next row down.
- **`SpillingFront.update`.** Each row now clears the drawn whitewater with `fill`, beside the felt and whitewater rows. Every branch for a breaking cell writes all three, as before.
- **`SpillingRoller`.** Both `reachAt` and `lensOf` are kept.
- **The snapshot prepass.** It keeps the curl's air share.

Identity against `claude/playtest-2026-10-17` itself:

- **Node A/B.** The base tree comes from `git archive origin/claude/playtest-2026-10-17 src`, and both arms start from freshly spun-up seas. Canyon (320 steps) and Padang (260 steps) matched on every snapshot, including the curls, and on the final state.
- **Device replay with `&fill=1`.** The base ran from a page served out of `.m1-cpu-base/`.
  - Canyon, 240 frames: `h ec90a18d…`, summary `a012ccbf…`, snapshots `97c00275e82408b5`, the same on both trees.
  - Padang, 300 frames: `h a3183978…`, summary `33a5d783…`, snapshots `d35276fb39b35270`, the same on both trees.
- **Tests.** The lip's felt-identity and shoulder tests pass, as do the FoamField, SpillingFront, roller, stencil and oracle tests and the earlier focused set (17 files, 288 tests, plus 15 targeted simulation tests).

Node A/B against the merged playtest tree (ms p50/p95, alternated in one process, under the suite's load):

| Stage | Canyon Medium (300 steps) | Ratio | Padang Medium (240 steps) | Ratio |
|---|---|---|---|---|
| Foam | 2.94/3.22 → 1.88/2.09 | 0.64 | 2.68/2.92 → 1.63/1.77 | 0.61 |
| Aeration | 1.55/1.70 → 0.96/1.08 | 0.62 | 1.63/1.77 → 1.04/1.25 | 0.64 |
| Snapshot | 4.36/4.77 → 3.13/3.42 | 0.72 | 2.61/2.84 → 2.60/2.81 | 1.00 |
| Board | 1.27/2.70 → 0.87/2.23 | 0.69 | 1.10/2.45 → 0.74/2.19 | 0.67 |
| Breaking | 0.81/0.89 → 0.56/0.64 | 0.68 | 0.15 → 0.15 | 1.00 |
| Contact | — | — | 18.79/21.99 → 3.20/4.87 | 0.17 |
| Front | — | — | 6.12/7.41 → 2.11/3.17 | 0.34 |
| **CPU stages** | **12.45/14.43 → 8.59/10.73** | **0.69** | **34.92/39.44 → 13.27/16.05** | **0.38** |

In the page (hidden pane, `&arms=base` against the playtest worker, slow-state runs):

- **Canyon Medium:** 0.953× vs 0.674× real time; worker total 17.2/18.9 vs 24.3/26.7 ms (0.71); foam 2.9 vs 4.8, aeration 1.7 vs 3.8, snapshot 6.4 vs 7.9.
- **Padang Medium:** 0.692× vs 0.353× real time; total 23.4/31.8 vs 44.9/67.1 ms; contact 4.9/8.8 vs 21.3/35.0, front 2.5/6.2 vs 6.4/10.2. The new arm's sea took 1.60 substeps a step against 1.00.

To run the replay on a base tree, extract it, then add a page and the barrel cases beside it:

- `sed 's#/src/gpuCheck.ts#/.m1-cpu-base/src/gpuCheck.ts#' gpu-check.html > .m1-cpu-base/gpu-check.html`
- `cp src/gpuCheck.ts .m1-cpu-base/src/`
- `ln -s ../public/barrels .m1-cpu-base/barrels`

Then open `/.m1-cpu-base/gpu-check.html?mode=replay&…`. `.m1-cpu-base/` is in `.gitignore`.
