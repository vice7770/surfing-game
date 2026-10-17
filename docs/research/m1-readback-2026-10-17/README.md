# The M1 readback study · 2026-10-17

Branch `claude/m1-readback`, from the main line `claude/wave-pool` at `18bfbe9f`. The work covers two items from the owner's plan, which borrows from web-ocean (Noniv/web-ocean, MIT):

1. Stop the GPU water step from stalling the sea on an M1.
2. Make Auto pick the level an M1 can hold at 60 fps with the sea in real time.

Every timing here was taken on the shared Apple M1 (8 GB, on battery) **with the browser pane hidden**. Other agents' processes were running at the same time (load average 5–12). The same configuration timed 13.7 ms in a calm spell and 23.2 ms in a busy one. Before/after comparisons therefore use paired runs inside one page (`&arms=both`, below), which drive the old and new paths in alternating 2 s turns. These are hidden-pane numbers. The visible-pane M1 timings are the coordinator's.

## How a water step flows

Each fixed 1/60 s request to the worker (`SurfZoneWorkerCore` → `SurfZoneRunner.advanceAsync` → `SurfZoneSimulation.stepAsync` → `GpuBoussinesq`) goes through these stages:

1. **Pack and upload.** H, QX and QZ are converted from Float64 to Float32 and written to the device: 1.22 MB at Canyon Medium's 101,760 cells. The sea components, the side-feed time block and the Params are written too. After a window shift, import or restore, the bed and carried state follow, and the plunge holds follow when they change.
2. **CFL scan.** This reads the CPU's H, QX and QZ, plus the viscosity peak from the last step.
3. **Encode and submit.** There are 17 kernels per CFL substep, followed by nine copies to staging.
4. **Map.** `await staging.mapAsync(READ)`. This is where the worker blocks. The wait covers queued GPU work and the compute, as well as the copy and the map. On an idle M1 GPU it is about 4.5 ms. When the page's drawing keeps the GPU busy, it is 16–40 ms.
5. **Unpack.** Nine planes are widened to Float64 and copied into the solver arrays (3.66 MB read). `adoptDeviceStep` then scans NU for the CFL peak.
6. **CPU consumers.** These run in order: breaking, the spilling front and roller, the swept front and crash, the lip, foam, aeration, the swept contact, the board and rider, bubbles, spray and sounds. Next come the snapshot fill and publication. The main page then turns around and requests the next step.

### Why H, QX and QZ go up every step

The CPU changes the water between device steps. The edits are sparse (tens of cells), but they come every step while a body is in the water:

- **Board, rider and fallen-body reactions.** `PhysicalSurfWater.push` changes qx and qz in four cells per contact point.
- **Lip throws.** `PlungingLip` takes h and q out of rings of cells at the launch.
- **Lip landings.** `PlungingLip.deposit` adds h, qx and qz in a cell.
- **Online pushes.** Other players' boards act through `applyRemoteReaction`.
- **Whole-array changes.** Warm start, sea import (N1) and lesson restore replace the arrays and re-send the layout.
- **Plunge holds.** These are sent only when `plungeVersion` changes.

The window shift (`shiftAlongShore`) is not called in production.

### The nine read-back fields

| Field | Read every step by | Could it be read less often? | Precision |
|---|---|---|---|
| H | Everything: breaking, fronts, lip, foam, aeration, board, contact, gauge, snapshot | No | f32. f16 is unusable: 1.6 cm steps at 16–32 m depth |
| QX, QZ | Board, foam and aeration advection, lip, snapshot flow | No | f32 |
| RATEH (η_t) | `columnCrests` over the whole fine zone (fronts), `crestMotion` (lip) | No | f32 |
| STRENGTH, AGE | `Breaking.update` copies both every step. Foam, spilling, fronts and crash read them | No | f32. AGE in f16 would round seconds to about 0.01 s and change onsets |
| NU | Only `adoptDeviceStep`'s peak for the next CFL limit | Yes: a GPU max-reduction could send back 4 bytes. The CPU fallback recomputes NU | The peak is exact under an integer atomicMax on the bit pattern |
| PREDX, PREDZ | Nothing per step. Needed by export (N1), by the CPU fallback, and to rebase after a discarded prefetch | Yes, on demand. The rebase would need a GPU-side copy of the committed values | f32 |

So only three of the nine planes (2/9 of the bytes are the predictor and 1/9 the viscosity) have no consumer each step. Unpacking all nine costs 0.5–0.6 ms on a calm M1, so dropping three would save at most about 0.2 ms a step. That is a small saving, and dropping the predictor would make the discard/rebase and fallback contracts more complicated. Neither cut was built (see "Not built").

## What was built

The cuts are ranked by latency saved per unit of effort. Both are byte-identical.

**1. The solo water prefetch at every spot (`38ff9ef3`).** The prefetch from `e3e630bc` submits step N+1 to the GPU while the worker fills and publishes step N. The next request then commits it. Until now it ran only for Padang's ridden sea. It now runs for every default offline host, at every spot, ridden or not (the menu's sea too). Rooms, recordings and CPU seas keep the ordinary path. The future step reads only committed water, and only the next requested step publishes it, so the sea steps exactly as before.

**2. One submission per water frame (`834d0e02`).** Previously a frame of S CFL substeps went to the queue as S command buffers. A GPU that is busy drawing the page schedules each of those separately. Now each substep's Params sit in their own 256-byte block of a single buffer, bound at a dynamic offset. All the passes and the readback copies go in one submission. The kernels, their parameters and their order are unchanged. Padang Medium goes from 1.20 to 1.00 submits per step.

**Physics identity.** `gpu-check.html?mode=replay` steps the game's ridden sea on the real WebGPU device and then hashes every array that carries it, plus the clock, lip, front and board:

- **Canyon Medium, 240 frames:** baseline, new without prefetch, and new with prefetch give identical hashes (`h d693da8d…`, summary `6aa0ad3b…`).
- **Padang Medium, 300 frames:** this run includes 36 frames with two substeps. The baseline and the new code with prefetch give identical hashes (`h 8c17c180…`, summary `169e6e4c…`).

`SurfZoneWaterPrefetch.test.ts` gains ridden and riderless Canyon cases. These compare every field, the export and the snapshot against the ordinary path. `GpuBoussinesq.test.ts` checks that a frame with more than 4 substeps makes one submission with per-pass offsets, that the Params blocks match `writeParams`, and that the buffer grows.

## Hidden-pane numbers (M1)

These come from `gpu-check.html?mode=pipeline&spot=canyon&size=medium&arms=both`: Canyon Medium, ridden, High's 64-component sea and High particles. "Solo" is the new path. "Ordinary" is the old one (and today's path for rooms).

| Condition | Real time, ordinary → solo | Snapshots/s | Worker per step, total ms | Water on the critical path, ms |
|---|---|---|---|---|
| Calm | 0.865 → **1.112** | 52.4 → 67.2 | 18.6 → 14.6 | 6.0 → 0.6 |
| Page busy 6 ms per step (`&hop=6`), loaded machine | 0.468 → 0.535 | 28.6 → 32.6 | 29.1 → 24.8 | 7.7 → 1.5 |
| Synthetic GPU-bound drawing at 19 fps (`&gpuLoad=600`), loaded | 0.219 → 0.260 | 13.8 → 16.2 | 84.6 → 68.4 | 20.5 → 4.0 |
| Menu sea (practice, riderless, 24 components), loaded | 0.550 → 0.687 | 33.5 → 41.7 | 31.5 → 21.8 | 9.1 → 1.6 |

Bytes are the same in both arms: 1,223 kB up and 3,663 kB back per step, with 1 map and 1 submission.

A harness rate above 1 means the worker could outrun the clock. In the game the host caps it at 1.

**Padang Medium is CPU-bound and has nothing to do with the readback.** It ran at 0.35× (calm) and 0.19× (loaded). In those runs the swept-barrel contact took 21 ms and 40 ms per step, and the front took 6.5 ms and 12.5 ms. Spin-up took 50–54 s.

**The calm M1's Canyon step without the GPU wait** breaks down as foam 2.8–3.2 ms, aeration 1.9–2.3, board 0.9, breaking 0.7, snapshot 4.4–5.8, and pack, CFL and unpack about 1.7.

## Auto (item 2, `2d0974d0`)

The old rule measured 6 s of menu frames at Medium's values and named High whenever at most 5 % of frames were late. It saw neither the sea nor High's own drawing. The new rule applies whenever the benchmark sees the sea's clock and the worker's time per step (`status.seaTime`, `pipelineMs.total`):

- **Low:**
  - when the menu's sea runs under **0.9×** real time, which is a step of about 18.5 ms against the 16.7 ms budget;
  - or when **1.2 ×** the menu's median worker step overruns 16.7 ms.

  The 1.2 is a ride's step over the menu's on the same M1: Canyon Medium ridden at 64 components took 16.4 ms, against 13.7 ms for the menu's riderless practice Canyon. Busy pairs came out at 1.0–1.14.
- **High is tried for 6 s on High's own values.** It is kept only if two things hold:
  - its frames stay on time against the refresh seen on Medium (a steady 14 fps does not count as on time);
  - its sea still keeps real time with room for a ride.

  Otherwise the verdict is Medium. Leaving the menu mid-trial also gives Medium.
- **Auto always benchmarks on Medium's values.** Stage 1 verdicts, CPU seas and hosts without the clock keep the frame-only rule, and every old test passes unchanged.
- **`?diagnostics` logs each part.** Look for `console.info('Auto benchmark', …)` with `seen: [{ values, late, seaRate, workerMs }]`.

On the calm M1 the menu's 13.7 ms passes the first part. High's trial should then fail on its frames, which were measured at 13.8 fps, so the M1 lands on Medium. In busy spells it lands on Low. The 0.9 and 1.2 constants are provisional, because they come from one noisy shared machine. The High trial is the part that is measured on the machine itself.

## Not built (open)

- **A one-step lag pipeline** (k steps in flight; board, lip and remote edits applied one step late, as deltas). This is the only option that lets the water take more than one step per GPU slot while the drawing saturates the GPU. It changes the coupling timing, so the physics would no longer be identical, and it was not built.
- **Byte cuts.** The NU peak on the GPU would save 11 % of the readback. Reading PREDX and PREDZ on demand would save 22 %. Uploading only the dirty rows would save about 99 % of the upload but still needs a full compare scan. Each saves at most about 0.2–0.6 ms of the M1's CPU per step, against 4–20 ms of overlap that the prefetch already won.
- **The M1's real limits beyond the readback.** Padang's contact (21–40 ms) and front (6–12 ms), foam and aeration (about 5 ms), and the snapshot (about 5 ms).
- **Cut 2's benefit** was not measured: the hidden pane cannot show it. It applies only to frames with 2 or more substeps, under contention.
