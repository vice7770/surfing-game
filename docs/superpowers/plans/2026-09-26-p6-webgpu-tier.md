# P6 WebGPU Tier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the stage 2 surf zone within the frame budget by stepping it on the GPU where WebGPU is available, with the CPU solver unchanged as the reference and fallback. Add the WebGPU tier's richer sea and FFT chop (wave plan §2.2 tier table, §3.1 budgets, Q18, Q19, Q21; ADR 0004).

**Architecture:**
- The CPU `BoussinesqSolver` stays the reference. The same step is written in WGSL, kernel for kernel, in 32-bit floats.
- The device steps the solver's own arrays in place. Each frame it uploads h, qx and qz, runs the CFL substeps and reads the water, breaking and predictor state back. Everything downstream (breaking model, lip, foam, board, snapshots) runs unchanged on the CPU.
- The water steps in the surf-zone worker, which replies once the device has finished. The page renders with WebGL.

**Tech Stack:** TypeScript, WebGPU (WGSL compute) in the worker, three.js WebGL2 render passes for the FFT, Vitest for everything that runs without a GPU, a browser harness for everything that needs one.

**Spec:**
- [Wave formation plan](../../research/wave-formation-plan.md): §1.5 grid, §2.2 tiers, §3.1–3.3 budgets and architecture, Q18, Q19, Q21, Q24;
- [ADR 0004](../../adr/0004-dispersive-surf-zone-solver.md).

## Record (2026-09-26)

- **The GPU step:** 16 WGSL kernels mirror `BoussinesqSolver` in order:
  - the start of the step, the dispersive mask and the modified fluxes;
  - the Hancock predictor, HLL rates and dispersive sources;
  - Kennedy breaking, shear and eddy viscosity, and the update;
  - the row and column tridiagonal solves, whose bands are built in parallel and swept one thread per row or column;
  - Manning friction and the predictor's memory;
  - the offshore relaxation zone. Its phases are folded in double precision on the CPU once per frame, so the device adds only kx(x − x0) + kz z − ωτ.

  All per-cell fields share one packed storage buffer.
- **Agreement:** `/gpu-check.html` steps two identical surf zones side by side:

  | Spot | Run | Largest depth difference | Relative rms of η | Breaking cells that disagree |
  |---|---|---:|---:|---:|
  | Point | 5 s | 4.7 × 10⁻⁵ m | 1.9 × 10⁻⁵ | 0 |
  | Reef | 20 s | 5.7 × 10⁻⁴ m | 1.8 × 10⁻⁴ | 0 |

  This is the tolerance-level replay on one device (Q19). All automated tests still run on the CPU reference; the device's packing, phase folding and refusals are unit-tested.
- **Cost** on the development Mac (Apple M-series, Metal 3), 37,280 cells:
  - a whole frame takes 2.9–3.0 ms: upload, one substep of 16 kernels, and the readback of 8 fields;
  - the frame first took 9.1 ms, of which the one-thread-per-row solves were 3.3 ms. Moving their bands and right-hand sides into parallel kernels cut them to about 0.9 ms;
  - the full surf-zone step (water, breaking, lip, foam, bubbles, spray) is 4.6 ms, against 12–15 ms on the CPU;
  - the worker, with a rider, runs the Point at 2.0× real time on the GPU and 0.68× on the CPU, under the same background load.
- **In the game:** the worker steps on the GPU when a WebGPU adapter answers and the Wave Lab's new Compute setting is left on 'GPU when available'. 'CPU only' forces the reference. A device that fails mid-run is dropped, and the frame is stepped on the CPU. The readout names where the water steps and how many components the sea has.
- **The richer sea:** the GPU tier builds the tank's sea from 64 components instead of 24 (Q21). The page decides before the worker starts, so the far field matches the tank.
- **FFT chop:** the GPU tier shades with a Tessendorf wind sea:
  - a 256² Phillips spectrum over a 64 m patch, from the local wind;
  - without the solver's long waves, and scaled to the procedural chop's rms slope;
  - inverse-transformed every frame in 17 WebGL2 passes into a repeating slope map. Every water shader (tank, far field, caustics) samples it through `waterChopSlope`.

  Against the TypeScript reference, the largest error is 0.19 % of the rms slope, at about 1 ms per transform. The other tiers keep the six analytic waves.
- **Deviations from the plan, and why:**
  - **Readback:** the whole field is read back each frame, with no lag, instead of an async 16 × 16 patch with forward correction (Q18). The page renders with WebGL on the main thread and cannot read the worker's GPU buffers, and the lip, foam and breaking model read the whole grid on the CPU. So there is no lag to test, and the board sees the water of the same step, as on the CPU.
  - **0.5 m cells are not adopted.** Measured on the Point at 0.5 m along and across the surf zone:
    - 134,720 cells, three substeps per frame;
    - 29 ms of GPU water and 58 ms per step in all, a quarter of real time.

    The GPU tier stays at 1 m. Finer cells need the breaking model, lip and foam on the device, and a parallel tridiagonal solver (cyclic reduction) in place of the serial sweeps.
  - **Periodic along-shore edges stay on the CPU** (cyclic solves). The surf zone uses open edges.
- **Not done:**
  - FFT-Jacobian whitecaps and the tier table's other WebGPU extras (SSR, 256² caustics, 16k spray);
  - automatic quality scaling.

## Tasks

### Task 1: The step in WGSL
- [x] `src/wave/gpu/boussinesqWgsl.ts`: one kernel per stage of `BoussinesqSolver.advance`, the relaxation zone, and the packed field layout.
- [x] `BoussinesqSolver.deviceLayout()`, `adoptDeviceStep()` and `predictor`: what a device needs and gives back; `ShallowWaterSolver.relaxationZones`.
- [x] `src/wave/gpu/GpuBoussinesq.ts`: device creation (refusing periodic edges, stage 1 and other zones), per-frame upload, substeps and readback.
- [x] Tests: the device formula reproduces `SeaStateBoundary.target` after a window shift; grid and parameter packing; refusals.

### Task 2: Agreement and cost in the browser
- [x] `/gpu-check.html`: CPU and device side by side, with drift and per-kernel timings. `?mode=worker` measures the worker's throughput; `?mode=chop` checks the FFT; `?mode=fine&dx=0.5` measures a finer grid.
- [x] Parallel band building for the tridiagonal solves.

### Task 3: The worker on the device
- [x] `SurfZoneSimulation.stepAsync` and `device`; `SurfZoneRunner.advanceAsync` and `useDevice`; `SurfZoneWorkerCore` with a device factory, replying when the device finishes.
- [x] The Wave Lab's Compute setting; the readout's GPU or CPU.
- [x] Tests: with a stand-in device, the worker's replies equal the in-page surf zone's; 'CPU only' never asks for a device; a failing device falls back to the CPU for that frame.

### Task 4: Tier extras
- [x] 64 components when the GPU tier runs.
- [x] The FFT chop, with tests of the transform against a direct DFT, a real slope field at the procedural rms, and downwind energy.
- [x] Measure 0.5 m cells; not adopted (see the record).

### Task 5: Record
- [x] ROADMAP, ADR 0004 status, the wave plan's phase table, and this record.
