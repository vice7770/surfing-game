# The Wave Pool Barrel runs on the CPU solver, so it is slow (handoff, 2026-11-06)

## What the owner saw
The Barrel looks like about 10 fps even though the survey reports 60. The screen redraws at 60; the sea does not keep up.

## Evidence
`npm run survey:barrel` on the M4 Pro at 1.5 m (commit 2b90efd7), files `docs/research/fps/2026-11-06-m4-pro-barrel-1.5m-*.json`:
- Every variant: solver `Boussinesq · CPU · 64 components · 104,720 cells · 34 ms/step`, `simulationSecondsPerWallSecond` 0.432, about 26 publications a second. A step has 16.7 ms to keep real time, so the sea runs at about 0.43x.
- Other spots in earlier surveys run `Boussinesq · GPU · 37,280 cells · about 3 ms/step`.
- The Basilisk rerun was using 2 cores during the survey (load average about 15), so the CPU figures may be a little pessimistic; the cause below does not depend on that.

## Cause
`deviceStepRefusal` (`src/wave/gpu/GpuBoussinesq.ts:45`) returns `periodic along shore (cyclic solves stay on the CPU)` for the Barrel. Checked in Node (bundled probe, `SurfZoneRunner.forWorker`):

| Spot | Refusal |
|---|---|
| Wave Pool, Barrel (straight reef) | periodic along shore |
| Wave Pool, Training | none (GPU ok) |
| Padang, Canyon, Reef | none (GPU ok) |

Not confirmed in the browser for Canyon, only that the GPU code accepts its solver.

## What the pool-barrel-perf notes got wrong for this
`docs/research/pool-barrel-perf-2026-11-06/README.md` reports the worker's CPU stages at about 9-11 ms "well inside the budget", and leaves the water step out as "the GPU's on the device". For the Barrel the water step is on the CPU (about 30 of the 35 ms a step), so the fixes there (loft cache, lazy contact rows) were small gains on the wrong part.

## Options
1. GPU support for the cyclic (along-shore periodic) solves. The real fix; expected a few ms a step. Bigger change.
2. Shrink the Barrel's grid or make it non-periodic. Cheaper test; may change the wave and the tube.
3. Make the CPU step cheaper (coarser grid). Least work; probably only about 0.7x.

Recommended: 1. Start from `deviceStepRefusal`, the periodic branch of the solver (`solver.deviceLayout()`, `xBoundary === PERIODIC`) and the WGSL in `boussinesqWgsl()`.

## To check in the game
Play Wave Pool Training, then Barrel, with `?diagnostics`: the SOLVER row shows CPU/GPU and ms/step, and the WORKER row the whole step against 16.7 ms.

## Other state
- The level-14 rerun of `pool_knee_big` and `pool_kneeface_big` was still running in `../surfing-game-pool-tubes` (log in the session scratchpad); the L13 batch is pushed on `claude/pool-tube-runs-2` (7e327af3). The decision rule is not applied.
- The five survey JSON files in `docs/research/fps/` are uncommitted.
