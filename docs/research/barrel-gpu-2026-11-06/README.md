# The Wave Pool Barrel's sea on the GPU (barrel-gpu, 2026-11-06)

The ask (the coordinator, 2026-11-06): the Barrel runs at about 10 fps on the owner's M4 Pro. The owner's survey showed
why: every variant, the pre-tube one too, reported `Boussinesq · CPU · 104,720 cells · 34 ms/step`, the worker 37–41 ms a
step and the sea at 0.40–0.45× real time. `deviceStepRefusal` refused the straight Barrel's periodic sides, so its sea
never ran on the GPU. Task: run the periodic sea on the device, matched to the CPU within the GPU tier's tolerance, with
a switch back. The first brief (cut the jets' uploads to the device) is kept where it helps the other GPU spots.
Branch `claude/pool-gpu-traffic` from `main` at `0aa04154` (#202). No browser, dev server, rider session, catch report
or autopilot check was run: everything below is Node on the M1 Air.

## Status

- **The Barrel's sea now steps on the GPU.** The device solves each row's cyclic system by Sherman–Morrison, as the CPU
  does; nothing else was missing. Only the periodic sea compiles the new code: every other spot compiles the shader text
  `main` compiled, byte for byte.
- **Checked in Node, not on a GPU.** Node has no WebGPU. The shader's own text runs here translated to JavaScript:
  - one substep in doubles matches the CPU to rounding (≤ 3e-13) on the Barrel's own grid and on small open, wall and
    periodic grids with breaking and plunge zones; the shader before this change misses by 1.5e-2 m²/s on a periodic row;
  - through `GpuBoussinesq` with 32-bit fields, the Barrel drifts from the CPU as the A-frame floor does, which the GPU
    already ran: 1.7e-5 against 1.4e-5 m after 4 s, no breaking cell disagreeing.
- **Switch:** `?barrelGpu=off` keeps the CPU path. Online rooms run the default (the GPU, as at every spot).
- **Expected on the M4 (an estimate, not a measure):** the water from 30–35 ms a step to about 3–8 ms, the worker's step
  from 37–41 ms to about 8–15 ms, under the 16.7 ms that keeps real time. The owner's run (§7) measures it.
- **The upload fixes are kept** (output-identical, each behind its switch): with the jets the device was sent 451 kB a
  step at the Barrel (7 kB before the tube work), now 11 kB; 580 → 15 kB on the A-frame. They help every GPU spot whose
  lips throw jets, and the Barrel now that it is on the GPU.
- **Added for the owner:** a DEVICE telemetry row, a "water on" column and `barrelgpuoff` and `uploadsold` variants in
  `npm run survey:barrel`, and the reading guide in `../pool-barrel-perf-2026-11-06/M4-RUN.md`.

## 1. What the periodic sea needs on the device

Every periodic branch of the CPU solver, against the shader (`boussinesqWgsl.ts`):

| CPU | What it does periodic along shore | Shader before | Now |
|---|---|---|---|
| `derivativeX`, the Hancock faces, the fluxes, the eddy viscosity | the stencils wrap across the two sides | wrap (`nbx`, `dzAt`, `predict`, `rates`, `viscous`) | unchanged |
| `erodeX` (the dispersive mask) | wraps | wraps (`wetAt`) | unchanged |
| `carryCurvatureAcrossOpenEdges` | open edges only | open edges only (`etaXX`) | unchanged |
| `inheritedAge` (breaking age from behind the face) | does not wrap | does not wrap | unchanged (the same rule) |
| `recoverRows` (P from P̄ along x) | **cyclic tridiagonal solve** (`cyclic`, Sherman–Morrison) | Thomas, with wall or open ghosts at the ends | **`cyclicRow`** |
| `recoverColumns` (Q from Q̄ along z) | walls at both ends | walls | unchanged |
| the offshore zone | the sea's components, their kx a multiple of 2π / W | the same packed sea | unchanged |

So only the row solves were missing. The Barrel has no side feed (its only zone is the offshore one), so the device's
zone rule covers it.

## 2. The method: Sherman–Morrison on the existing row solve

`cyclicRow` (one row per thread, as `rows` already ran) does what `BoussinesqSolver.cyclic` does, in the same order:
- the corners β = a₀ and α = c₍ₙ₋₁₎ folded into the diagonal: b₀ − γ and b₍ₙ₋₁₎ − αβ/γ, with γ = −b₀;
- one Thomas sweep for the right side and one for u = (γ, 0, …, 0, α), on the same bands (they share c′);
- then P = x − z (x₀ + βx₍ₙ₋₁₎/γ) / (1 + z₀ + βz₍ₙ₋₁₎/γ).

`rowTerms` keeps the edge cells' bands when periodic, as the CPU does. The second sweep's scratch is `ZHS`, a face field
dead between the rates and the next substep's predictor, transposed as the bands are.

Why this method:
- **It is the CPU's own algorithm.** The same operations in the same order, so the 32-bit device stays as close to the
  CPU here as at every other spot, and the one-substep check below can compare them to rounding.
- **It is small.** One more sweep and a correction pass in the kernel that already solves the rows: about 1.5× that
  kernel's work, on 374 rows of 280 cells.
- **Parallel cyclic reduction** would be a different algorithm (different rounding, log₂ n passes with workgroup
  barriers) for a speed this kernel does not need: the rows already run one per thread like the other spots' rows.
- **A halo wrap** is not needed: the stencils wrap by index already.

The new code is emitted only for a periodic sea (`boussinesqWgsl(true)`, chosen in `GpuBoussinesq.create`). The text the
other spots compile is the same as `main`'s, byte for byte (compared in Node). So a mistake in the new code touches the
Barrel alone: a compile error sends it back to the CPU (`create` throws, the runner steps on the CPU, as today, and the
DEVICE row says "the WebGPU device failed"); a wrong result would show at the Barrel only.

## 3. Checked against the CPU

Node has no WebGPU, and no WGSL compiler or validator was on this machine. So `src/wave/gpu/wgslTestSupport.ts`
translates `boussinesqWgsl()`'s own text into JavaScript, mechanically: the same statements in the same order, integer
indices as integers, `select` evaluating both sides. Two runs:
- **one substep in doubles** (`stepKernels`): the host's packing, unrounded, against the CPU's step: the algorithm alone;
- **a stand-in WebGPU device** (`emulatedGpu`) for `GpuBoussinesq` itself (its uploads, Params blocks, dispatches,
  readback), with 32-bit fields: each stored value rounded to f32; the arithmetic between stores in doubles.

The other spots' GPU tier was matched to the CPU this way only in a browser (`gpu-check.html`, and SwiftShader's WebGPU
in `../gpu-tier-parity.md`, where the tiers' lips, tubes and whitewater agree within a few percent a minute). Its
tolerance is "the same activity, not the same wave": the device steps in 32-bit floats and breaking is chaotic. Here the
periodic Barrel is held to the A-frame's figures under the same emulator.

**One substep in doubles, max |device − CPU|** (`drift.ts`, `runs/drift-*.txt`, rerun on the final head for 1 s with the
same lines; and the tests):

| Sea | h | qx | qz | breaking | ν | predictor |
|---|---|---|---|---|---|---|
| The straight Barrel, 1.5 m, its sea at 50 s (696 breaking cells) | 7.1e-15 | 3.6e-14 | 4.4e-14 | 2.9e-15 | 1.4e-14 | 2.5e-13 |
| The A-frame floor, open sides | 1.8e-15 | 8.9e-16 | 1.4e-14 | 5.8e-15 | 1.0e-14 | 1.7e-13 |
| Small grids (40 × 60), open, wall, periodic, ~140 breaking cells, plunge zones held | ≤ 4.4e-16 | ≤ 2.2e-16 | ≤ 1.8e-15 | ≤ 4.0e-15 | ≤ 1.3e-14 | ≤ 4.7e-14 |
| The same periodic grid on the shader before this change | 4.4e-16 | **1.5e-2** | **1.9e-3** | 4.0e-15 | 5.8e-15 | **0.46** |

**With 32-bit fields through `GpuBoussinesq`, against the CPU** (the check page's figures; 1/60 s frames; plunge zones
held on both every 0.5 s as `&plunge` does):

| | after | max \|Δh\|, m | rms Δh / rms η | max \|Δq\|, m²/s | breaking disagrees |
|---|---|---|---|---|---|
| Straight Barrel, 1.5 m | 1 s | 1.1e-5 | 2.0e-6 | 7.7e-5 | 0.00 % |
| | 4 s | 1.7e-5 | 5.7e-6 | 1.6e-4 | 0.00 % |
| A-frame, 1.5 m (the GPU ran it before) | 1 s | 7.3e-6 | 1.9e-6 | 6.0e-5 | 0.00 % |
| | 4 s | 1.4e-5 | 5.9e-6 | 1.1e-4 | 0.00 % |
| Straight Barrel, 1.8 m | 1 s | 9.4e-6 | 1.9e-6 | 9.2e-5 | 0.00 % |
| | 4 s | 1.8e-5 | 5.8e-6 | 1.6e-4 | 0.00 % |
| A-frame, 1.8 m | 1 s | 6.6e-6 | 1.9e-6 | 6.1e-5 | 0.00 % |
| | 4 s | 1.3e-5 | 6.2e-6 | 1.5e-4 | 0.00 % |

What this does and does not show:
- It shows the shader's algorithm is the CPU's, periodic rows included, and that 32-bit storage keeps the periodic sea
  as close to the CPU as an open one.
- It does not show the GPU's own rounding (every operation in f32, its `sqrt` and `cos`), its compiler, or the WGSL
  compiling at all. The new code was read against WGSL's rules (no reserved words, declarations in module scope) and
  mirrors the existing `rows` kernel's statements; the owner's M4 run is its first real compile. If it fails, the Barrel
  steps on the CPU as before and the DEVICE row says why.

## 4. The switch and online rooms

- **`?barrelGpu=off`** (`SurfZoneConfig.barrelGpu`): the runner does not ask for a device for a periodic sea
  (`SurfZoneRunner.useDevice`); the water steps on the CPU, as on `main`. Parsed at the Barrel alone, like `?contactRows`.
- **Online rooms** run `compute: 'auto'`, as every spot: each client steps its own sea on its own tier (the GPU where
  WebGPU is, else the CPU), and a joining client takes the room's sea over (`importState`). A handed-over sea marks the
  whole water and the layout for the device (`markAllWater`, `invalidateDeviceLayout`), so the device takes it whole on
  its next step, as at the other GPU spots. The room's clients never step in lockstep (the sea is handed over, not
  simulated jointly), and tiers already mix in a room at the other spots. Online rooms pin `?barrelGpu` to the default
  (`main.ts`), as every dev switch. They do not use the solo worker's water prefetch.

## 5. What the device step will cost on the M4 (an estimate)

What is measured:
- M4 Pro, 37,280 cells on the GPU (Beach, Point, Reef, Canyon in September): 2.9–3.5 ms a step (`../fps/2026-09-26-*`).
- M4 Pro, the Barrel's 104,720 cells on the CPU: 34 ms a step, water 30–35 ms of a 37–41 ms worker step (the owner's run).
- M1 Air, about 100 k cells on its 8-core GPU: the Canyon's (108,240 cells) readback wait 6.0–6.4 ms; the Wave Pool's
  Training floor (100,520 cells) a whole worker step of 14.4–16.0 ms, at real time (`../perf-2026-10-22/README.md`).

The estimate:
- The cell kernels scale with the cells (2.8×); the row and column solves with the rows' and columns' lengths; the readback
  with the cells (3.7 MB a step against 1.3 MB). Part of the 3 ms at 37 k cells is fixed (the submission, the map's round
  trip). The M1 ran 100 k cells' device step in about 6 ms; the M4 Pro's 20-core GPU has about 2.5–3× its compute
  (published figures).
- So **about 3–8 ms a step on the M4 Pro**, most likely near 5 ms. The cyclic rows add about 1.5× one kernel of 15.
- The worker's step would then be 3–8 ms of water plus its CPU stages (37–41 minus 30–35 ms, so 5–7 ms): **about
  8–15 ms, under 16.7**. The sea would keep real time, where it ran at 0.43×. The solo worker's prefetch also overlaps
  the next device step with the page's round trip.
- An estimate from other spots' measures, not a measure of this code.

## 6. The uploads (the first brief; kept)

What the CPU writes into the water between device steps at the Barrel, and how it went up (`traffic.ts`, `fakeGpu.ts`:
the worker's runner with its prefetch on `GpuBoussinesq` and a stand-in device whose step is a second CPU solver):
- **A lip's launch** (`PlungingLip.drawFromCrest`) takes water and momentum from one column's cells around the crest,
  and marked the whole water changed (canyon-perf's rule): the device got all 1.26 MB, 5–6 times a second (the crash's
  jets, none before the tube work).
- **A jet's landing** (`deposit`) and **a board's push** marked their cells, but the device took the span from the
  first marked cell to the last: landings at either end of the window and a push between spanned 12–19 thousand cells,
  158–171 kB a step at p50.
- **The plunge zone** (`holdPlunge`, where the jets land): each cell entering or leaving it sent the whole zone, 419 kB,
  on 45–54 % of steps. The pool-barrel-perf notes did not count this one.
- About 10 cells a step really changed (p50; 14–20 at p95, 78 at most on the A-frame).

The fixes, each output-identical and on by default:

| Change | Switch | What it does |
|---|---|---|
| The changed cells' runs | `?deviceWater=old` | The solver lists each marked cell once (`waterChangedCells`, up to 8,192); the device sends their runs, merged across gaps of up to 1,024 cells (`RUN_GAP`: about 12 kB of water already on the device costs less than three more writes, an estimate). Past the list, the span as before |
| A launch marks its cells | `?launchWater=old` | `drawFromCrest` marks the cells of its rings, which hold every cell it changes, in place of the whole water |
| The plunge zone's changed cells | `?devicePlunge=old` | The solver lists the cells that entered or left the zone since the device took it; the device sends those (as runs). The kernels read only whether a hold runs, which no other cell's has changed |

Per step, 600 steps after 30 warm, mean (p50 / p95 / max) — readback, maps and submits are the same in every arm:

| 1.5 m | Before the tube (`old-a38`) | `main`, a38 | Fixed, a38 | `main`, pool cases | Fixed, pool | `main`, A-frame | Fixed, A-frame |
|---|---|---|---|---|---|---|---|
| uploaded, kB | 7.0 (6.9 / 10.1 / 10) | **451** (524 / 1228 / 1637) | **11.4** (6.9 / 43.0 / 76) | 425 (416 / 1228 / 1637) | 11.8 (6.9 / 36.5 / 53) | 580 (442 / 1637 / 1637) | 15.3 (8.0 / 53.1 / 109) |
| whole water, per 100 steps | 0 | 9.3 | 0 | 10.0 | 0 | 11.3 | 0 |
| whole plunge zone, per 100 steps | 0 | 53.5 | 0 | 44.5 | 0 | 69.7 | 0 |
| writes a step | 5.0 | 5.3 | 8.2 | 5.2 | 8.1 | 5.5 | 8.3 |
| read back, kB a step | 3,682 | 3,682 | 3,682 | 3,682 | 3,682 | 3,682 | 3,682 |
| maps, submits a step | 1, 1 | 1, 1 | 1, 1 | 1, 1 | 1, 1 | 1, 1 | 1, 1 |
| launches a second | 0 | 5.8 | 5.8 | 6.0 | 6.0 | 15.7 | 15.7 |

| 1.8 m | `main`, a38 | Fixed, a38 | Fixed, pool cases | Fixed, A-frame |
|---|---|---|---|---|
| uploaded, kB | **490** (547 / 1637 / 1637) | **11.6** (8.0 / 39.7 / 54) | 11.9 (8.0 / 36.4 / 53) | 18.1 (10.4 / 57.3 / 100) |
| whole water, per 100 steps | 8.5 | 0 | 0 | 0 |
| whole plunge zone, per 100 steps | 61.5 | 0 | 0 | 0 |
| writes a step | 5.4 | 8.6 | 8.6 | 8.5 |
| launches a second | 5.1 | 5.1 | 5.6 | 17.3 |

`main` at 1.8 m, the other arms (`runs/traffic-main-big.txt`): pool cases 480 kB, 9.3 whole water and 55.8 whole plunge
zones per 100 steps; A-frame 654 kB, 14.2 and 78.7; before the tube work 7.3 kB.

- No layout upload and no discarded prefetch in any arm.
- The read-back (9 fields, 3.68 MB a step) is now the device's largest traffic by far; see §8.
- **What it means for the device step (an estimate):** 0.45 MB a step less to write is about 27 MB a second; on Apple
  silicon's shared memory that is a fraction of a millisecond of copying a step, but each whole upload also converts
  314 k doubles to floats on the worker (about 0.3 ms on the M1) and queues ahead of the step on a GPU busy drawing.
  Expect tenths of a millisecond a step, not milliseconds. `uploadsold` in the survey measures it.

**Identity** (`traffic.ts --hash 1`): every step, the solver's water after the step, the snapshot (`fill`'s buffers and
counts) and, at every submission, the device's water, carried breaking and predictor fields and the plunge zone's held
cells. The three switches old against all on, and against `main`'s code: the same hashes at 1.5 m (a38, the pool's cases,
the A-frame) and 1.8 m (a38 with the switches old; a38, the pool's cases and the A-frame against `main`), 600 steps each
(`runs/traffic-*.txt`; `main`'s runs bundled from the tree before these changes). The final head again at 1.5 m (a38,
the switches on and old): `main`'s hashes (`runs/traffic-final-medium.txt`).

## 7. The owner's check on the M4

`npm run survey:barrel` (`scripts/browser/barrel-fps.sh`; `../pool-barrel-perf-2026-11-06/M4-RUN.md` has the steps):
- the table's new **water on** column: GPU in every row but `barrelgpuoff`;
- **`barrelgpuoff`** (`?barrelGpu=off`): the Barrel as before, on the CPU. The gain is `default` against it, in worker ms,
  water ms, sea × and snap ms p95;
- **`uploadsold`** (`?deviceWater=old&launchWater=old&devicePlunge=old`): the uploads as before. Upload kB and whole/s
  show the traffic; worker and water ms what it costs;
- **whole/s**: the last second's whole-water and whole-plunge-zone uploads.

In the game (Settings → Show telemetry, Wave Pool → Barrel):
- SOLVER: "Boussinesq · GPU · … · 104,720 cells · … ms/step";
- WORKER: under 16.7 ms a step if the estimate holds;
- DEVICE (new): "GPU · … kB up (… mean), 3,682 kB back a step · whole water 0, plunge zone 0, layout 0 in the last
  second"; with `?barrelGpu=off`, "CPU · the water steps here: periodic along shore, kept on the CPU (?barrelGpu=off)".

## 8. Options (not built)

- **Read back less.** 9 fields, 3.68 MB a step at the Barrel. The predictor (PREDX, PREDZ) and the eddy viscosity (NU)
  are read on the CPU only for its own step, a window shift, a sea's export and a device's rebase after a discarded
  prefetch, and the viscosity's peak (one number, the CFL limit). Reading them only when one of those needs them would
  save 1.26 MB a step (a third), but needs a second, occasional map and care to stay identical. Worth measuring after the
  owner's run, if the map is still a large share of the water's ms.
- **A finer `RUN_GAP`** (fewer bytes, more writes): the gap's cost is an estimate; the survey's upload kB and water ms
  can tune it.

## 9. Tests

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- The main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`):
  325 files passed (34 skipped), 3134 tests passed (23 expected fail, 40 skipped), 602 s. It ran before the last change
  (the changes' labels renamed pool-gpu-traffic → barrel-gpu in comments and test names); the 11 changed test files
  again on the committed head: 220 passed.
- The SurfZoneSimulation subset (`-t "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"`): 37 passed, 70
  skipped, 6,569 s, on the head before the label rename.
- `src/wave/SurfZoneRunner.test.ts`: 39 passed, 4 failed. The same 4 fail on `main` (`0aa04154`, run from a copy of its
  tree): the spray buffer's size (G9), the leash and duck-dive snapshot, the rider's start, the ride report. None touches
  the device.
- New:
  - `src/wave/gpu/GpuBoussinesq.periodic.test.ts`: the shader against the CPU in doubles at open, wall and periodic edges
    with breaking and plunge zones (≤ 1e-12); the cyclic code in the periodic shader alone, and the shader before it
    wrong on a periodic row; the straight Barrel's own grid; 32-bit fields through `GpuBoussinesq`, the periodic drift
    within 1e-4 m and within 10× the open one's after a second (1.5 and 1.6 µm when written); the refusal (rows of 3
    columns or more).
  - `src/wave/gpu/GpuBoussinesq.traffic.test.ts`: a launch's marks hold every cell it changes; the list and its overflow;
    the runs, the span with `deviceWater` old and past the list, the device holding the CPU's bits; the plunge zone's
    cells, the device reading the same holds at every submission, the whole zone with `devicePlunge` old; a lip's sea on
    a device whose step is a second solver, the same water and device fields with each old path. Each checked to fail
    with its fix broken.
  - `src/wave/SurfZoneRunner.device.test.ts`: the switches reach the device; the DEVICE row's reasons and window; the
    Barrel asks for a device unless `barrelGpu` is off.
  - `src/game/PhysicalMode.test.ts`: the four switches parse, reach the config (`barrelGpu` at the Barrel alone) and are
    pinned online; the DEVICE row.
  - `src/wave/gpu/GpuBoussinesq.test.ts`: the refusal test now expects periodic seas accepted.

## Tools

- `drift.ts`: the device (translated WGSL) against the CPU on the Barrel's floors, as `gpu-check.html` reports it.
- `traffic.ts` with `fakeGpu.ts`: the uploads and their identity hashes.
- Build either with `rolldown docs/research/barrel-gpu-2026-11-06/<tool>.ts -o dist/scripts/<tool>.mjs --format esm --platform node`.
  They load the saved seas of the pool-barrel-perf bench (50 s) from the scratch directory named in the file; the
  traffic bench saves the A-frame's on its first run.
