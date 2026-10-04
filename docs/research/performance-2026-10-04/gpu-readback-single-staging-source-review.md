# GPU readback source review — 2026-10-04

Scope: source-only review of the existing `GpuBoussinesq` path at the parent-provided HEAD `43641bf33` (runtime `4c81983d9`). No repository edits, tests, builds, profiling, CPU timing, browser/server/GPU work, or Git mutation were performed. The supplied FPS/map measurements are context, not measurements made by this review.

## Finding and minimal plan

The proposed consolidation is already implemented. `src/wave/gpu/GpuBoussinesq.ts:178` owns one `staging` GPUBuffer; line 215 creates it once with size `DEVICE_READBACK.length * n * 4` and `MAP_READ | COPY_DST`. Line 338 issues nine `copyBufferToBuffer` calls into successive planes of that same buffer. Line 355 makes exactly one `await staging.mapAsync(READ)` after the last substep submission. Lines 359–364 obtain one whole-buffer mapped range, make nine zero-copy Float32 subarray views, widen/copy them directly into the existing Float64 solver destinations, then unmap.

The GPUBuffer is persistent across steps; its mapped state is not persistent. There are no readback pack compute dispatches to retain or fuse: the existing kernels leave the nine outputs in the field storage buffer and nine copy commands gather them. The desired single-map design therefore has **zero runtime diff and no newly owned runtime files**. Replacing this path with another contiguous staging buffer cannot remove eight map calls, reduce the 4.176 MB copied, or establish a synchronization saving. The supplied map p50/p95 spans cannot be attributed to per-output mapping because that is absent here.

## Exact nine-plane layout

Let `N = nx * nz`, `B = 4N` bytes. Each source plane is `N` f32 values at `FIELD[index] * B`; staging plane `k` is `N` f32 values at `k * B`. The nine fields, order, and destination identities are defined at `GpuBoussinesq.ts:11` and `:26–38`; numeric FIELD indices are at `src/wave/gpu/boussinesqWgsl.ts:11–19`.

| k | Field/index | Source bytes at N=116,000 | Staging bytes at N=116,000 | Existing F64 destination |
|---:|---|---:|---:|---|
| 0 | H / 0 | 0 | 0 | solver.h |
| 1 | QX / 1 | 464,000 | 464,000 | solver.qx |
| 2 | QZ / 2 | 928,000 | 928,000 | solver.qz |
| 3 | RATEH / 8 | 3,712,000 | 1,392,000 | solver.surfaceRiseRate |
| 4 | STRENGTH / 37 | 17,168,000 | 1,856,000 | solver.breakingStrength |
| 5 | AGE / 38 | 17,632,000 | 2,320,000 | solver.breakingAge |
| 6 | NU / 41 | 19,024,000 | 2,784,000 | solver.viscosity |
| 7 | PREDX / 33 | 15,312,000 | 3,248,000 | solver.predictor.x |
| 8 | PREDZ / 34 | 15,776,000 | 3,712,000 | solver.predictor.z |

Every row copies 464,000 bytes in the supplied ordinary Padang Big grid. The staging allocation and full map cover 4,176,000 bytes (`36N`); the field allocation covers `53B = 24,592,000` bytes. No padding is present or needed by this layout: all copy offsets/sizes and Float32 view offsets are multiples of four. The full map/range starts at zero, satisfying the eight-byte mapped-offset constraint, and has a size divisible by four. Even for odd N, a Float32 subarray at `kN` is valid; changing to nine separate mapped ranges at `kB` would introduce an eight-byte offset issue for odd k and odd N. Keep one full mapped range and subarray views. Views must not survive unmap; they currently remain local to the synchronous unpack section.

## Scheduling and state boundaries

- `GpuBoussinesq.ts:287–316` refreshes device layout/plunge uploads, uploads H/QX/QZ and sea/feed time data, then computes `cflSubsteps(dt, solver.maxStableStep())` before GPU dispatch. `ShallowWaterSolver.ts:318–331` reads the CPU H/QX/QZ arrays for the CFL scan; `BoussinesqSolver.ts:404–406` also uses the viscosity peak established by the prior adopted step.
- `GpuBoussinesq.ts:320–344` retains the existing per-substep params write, kernels, and submission order. Only the final substep encoder receives readback copies, after its compute pass ends. Mapping starts after all those submissions.
- `GpuBoussinesq.ts:359–365` writes all nine CPU destinations before `solver.adoptDeviceStep(dt)`. That adoption increments time, derives viscosityPeak from the returned viscosity, and ages the plunge zone (`BoussinesqSolver.ts:395–400`). Do not advance time, run CPU consumers, publish a snapshot, or start the next step before successful unpack and unmap.
- The diagnostics boundaries already isolate pack, CFL, encode, the single map wait, and unpack/adoption (`GpuBoussinesq.ts:201`, `:312–367`). `readback=false` instead waits `onSubmittedWorkDone`, has no copies/unpack, and only adds dt to solver.time (`:347–353`); it is a diagnostic path and cannot substitute for normal fresh-water delivery.
- Normal host use is serialized: `WorkerSurfZone.ts:170–181` allows one advance in flight; `SurfZoneRunner.ts:441–446` awaits each simulation step in a batch; `SurfZoneSimulation.ts:779–788` awaits device.step before afterWater. Export/restore await the in-flight worker promise (`SurfZoneWorkerCore.ts:122–131`). `GpuBoussinesq.step` itself has no concurrent-step lock; a refactor must not introduce overlap of the single staging buffer or queue copies while it is mapped.

## Existing failure/cleanup bounds

Creation refuses unsupported configurations and insufficient field-buffer limits; shader compilation errors destroy the device before throwing (`GpuBoussinesq.ts:264–278`). A rejected map propagates before mapped data is unpacked or the step is adopted. The simulation catches device-step failures, disposes the device, detaches it, and takes that dt on the CPU (`SurfZoneSimulation.ts:780–788`; spin-up has the same policy at `:652–659`). `dispose` is idempotent and destroys the owning device (`GpuBoussinesq.ts:390–393`); later step calls return immediately when disposed.

The successful path unmaps at line 364. There is no `try/finally` around getMappedRange/unpack: an exception after mapping can leave the buffer mapped until device disposal, and an exception after some `.set` calls can leave partial CPU destinations before fallback. This is an existing robustness limit, not evidence of FPS headroom. A standalone future cleanup patch could place unmap in finally and add injected-failure tests, but preserving all-or-nothing CPU publication on arbitrary unpack exceptions would require separately justified handling. Do not fold such behavior changes into a no-op staging optimization.

## Validation gates for any future justified readback change

No checks are warranted for the zero-diff finding. Existing `GpuBoussinesq.test.ts:58–104` checks nine copies and diagnostic/no-readback timing boundaries; it does not currently assert buffer identity, map call count, actual offsets, mapped-view contents, or unmap ordering. Existing data-flow tests use a CPU ShadowDevice rather than real WebGPU (`:24–47`, `:222–269`).

If a new concrete patch is proposed, own only `src/wave/gpu/GpuBoussinesq.ts` and focused host tests in `src/wave/gpu/GpuBoussinesq.test.ts`, leaving other agents' heightTMP/docs files alone. Use a recording fake to verify one staging allocation reused over two steps, nine exact source/destination offsets and lengths, one map per readback step, final-substep-only copies, map-after-submit, correct plane-to-F64 values with distinct signed sentinel values, unmap-before-adoption, unchanged no-readback behavior, and map-rejection/disposal/fallback semantics. Include odd N and multi-substep cases. Injected unpack failure is meaningful only if cleanup behavior changes. Preserve existing parity and CFL/time/snapshot ordering checks; do not use new tests that merely repeat constants without exercising transfer behavior.

A source hypothesis needs a real differential before timing: identify the operation that is actually removed while preserving identical nine outputs, bytes, compute work, adoption, and diagnostics. There is none for this consolidation. If a different patch survives correctness and code review, any later cost/FPS gate should compare the unchanged ordinary Padang Big GPU 116,000-cell, C64, maxBatch1 workload with controlled warm-up, seed/config, view/quality, duration, and interleaved order; report fresh-water cadence alongside display FPS and step/map/unpack distributions. The parent-supplied original baseline is 60 display / ~55.97 fresh with map p50 ~2.9 ms / p95 ~8 ms. Treat existing map timing as end-to-end waiting after submission, not isolated transfer cost, and do not rely on intrusive GPU-clock measurements. Require reproducible fresh cadence improvement without correctness, display cadence, or tail-latency regression before calling the change an FPS improvement. No measured saving is claimed by this note.
