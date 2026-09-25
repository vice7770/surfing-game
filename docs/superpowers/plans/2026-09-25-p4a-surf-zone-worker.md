# P4a Surf Zone Worker: Design Record

> Built test-first on `claude/charming-sanderson-d9a2c0` after G4. The implementation plan this record replaces is in the history of this file (`e1206e3`). Test code lives in the files listed.

**Goal:** Run the physical surf zone in a Web Worker, so the main thread only renders snapshots. This is the first step of P4 (board on physical waves), and it had to come before the physical waves could be played ([plan](../../research/wave-formation-plan.md) §3.2; P2 deferral).

## Where P4a sits

The wave plan's P4 is the board phase. The board and surfer physics plan (`docs/research/board-surfer-physics-plan.md` on the local branch `codex/board-surfer-physics-proposal`; its requirements were confirmed in a 23-question grilling) splits the same work into B0–B5. Its integration handoff (`board-water-integration-handoff.md`, same branch) makes a stable worker and water sampler the precondition. P4 is delivered as:

| Sub-phase | Content | Board plan |
|---|---|---|
| **P4a** ✓ | Surf zone in a Web Worker; host interface; snapshots | P2c handoff: worker, step ownership, budget |
| P4b | `SurfWater` sampling seam over legacy and physical water: surface, normal, wet/dry, outside-domain, flow at body depth by the §1.10 profile, and breaking. Legacy `BoardPhysics` moves onto the seam with bit-identical replays, plus baseline traces and the reference shortboard and rider record. | B0 |
| P4c | Rigid board body in the worker on physical water, with horizontal reactions | B1 |
| P4d | Rider contacts, stance, manual pop-up phases, weight-shift steering | B2 |
| P4e | Fins, rails, stall, breaking and lip impacts | B3 |
| P4f | Continuous fall, paddling and catch calibration, practice-wave forcing and natural sets; the §1.10 board tests | B4 |

## Design

- **`src/wave/SurfZoneRunner.ts`**
  - Owns the `SurfZoneSimulation` and the `BubbleCloud`, and advances both at a fixed 1/60 s (`SURF_ZONE_STEP`). Bubbles now move per physics step, not per render frame, so they are deterministic.
  - `fill(buffers)` writes the render grid's (height, foam) and (u, w), plus packed lip and bubble positions.
  - `status()` returns the Wave Lab values as plain data. The break point and breaker type are fixed per run and cached.
  - `surfZoneSea(config)` builds the seeded sea on either side of the worker boundary.
- **`src/wave/BubbleCloud.ts`** is the bubble simulation, split from `BubblePoints` so the worker needs no three.js; `BubblePoints` only draws positions.
- **`src/game/SurfZoneHost.ts`**
  - `SurfZoneHost` is the main thread's only view of a running surf zone: `ready`, fixed start data (render grid, bed, focus, window, column width), the latest snapshot, `advance(steps)`, and `heightAt`/`bedAt` through the snapshot's render lookups.
  - `LocalSurfZone` runs the runner in the page.
  - `SnapshotSurfZone` feeds a host's snapshots to `PhysicalSurfaceSource`.
- **`src/game/SurfZoneWorkerCore.ts`, `surfZoneWorker.ts`, `WorkerSurfZone.ts`**
  - The worker core answers `start` with `ready` (start data and a first snapshot), and `advance` with `snapshot`. It fills and transfers the buffers the page lends it.
  - `WorkerSurfZone` keeps two buffer sets in turn: one shown, one out at the worker. It keeps one advance in flight and at most six queued steps, so a worker that falls behind drops time instead of lagging further.
  - Worker errors reject `ready`. `dispose` terminates the worker.
- **`PhysicalMode`**
  - Starts asynchronously through a host factory. A later start supersedes an earlier one, and a legacy run cancels a pending start.
  - Rebuilds the spot and sea from the config for the seabed and far field.
  - Draws the water, lip, bubbles, camera and readout from snapshots.
- **`main.ts`**
  - Requests each frame's fixed steps in one `advance`.
  - Switches to the physical mode only once its surf zone is ready, behind the loading overlay.
  - Uses the worker wherever `Worker` exists; `?inpage` keeps the surf zone on the main thread.

## Verification

- **Tests (205 in the suite; the build passes, with a 36.85 kB worker chunk):**
  - `SurfZoneRunner.test.ts` (5):
    - the runner steps bit-identically to the simulation it wraps;
    - its snapshot equals the simulation's own render writes, lip parcels and bubbles;
    - its status equals the simulation's readout methods;
    - the same sea is built on both sides.
  - `BubbleCloud.test.ts` (3) and `BubblePoints.test.ts` (1): the bubble behaviour is unchanged, and the renderer draws what it is given within its pool.
  - `SurfZoneHost.test.ts` (2): the local host snapshots the same surf zone a runner steps, and samples the rendered surface and bed.
  - `WorkerSurfZone.test.ts` (4):
    - the worker core's start data and snapshots are bit-identical to the in-page surf zone's, and it transfers its four buffers;
    - behind an asynchronous fake port, the host keeps one advance in flight, queues the rest, caps the queue and shows the latest snapshot;
    - a worker error fails the start.
  - `PhysicalMode.test.ts`: the tests run on the async host, and a new one shows that only the latest of overlapping starts takes over and that `cancel` supersedes a pending start.
- **Browser (local dev server, measured by calling the physical frame at 1/60 s):**

  | | Main thread per physical frame | Surf zone start |
  |---|---|---|
  | Worker | 0.10 ms median, 0.30 ms p95 | does not block |
  | `?inpage` | 10.8 ms median, 12.3 ms p95 | blocks for 3.1 s |

  - The worker's own step (solver, breaking, foam, lip and bubbles) is 5.8 ms.
  - Every spot renders as before, with no console errors, and physical → legacy → physical round trips work.

## Deviations and open items

- **Worker budget:** 5.8 ms per step against the plan's 4 ms worker gate (§3.1). The bundled-Node solver alone was 4.05 ms; P3's breaking, G4's foam, the lip and the bubbles add the rest. The frame no longer pays for it, and 60 steps/s is about 35 % of one core. But P4c's board adds to the same step, so the gate is an explicit risk. The options stay those of §3.3: a narrower window, keeping 1 m cells (P3a needs them), or WebAssembly/SIMD.
- **Hidden tabs:** the loading wrapper waits for an animation frame before starting, so a page loaded hidden starts its surf zone only once it becomes visible.
- **Readout cadence:** the status is computed every snapshot; it is cheap, but it could drop to the readout's 4 Hz if the budget tightens.
- **Bicubic sampling** (Q10) moves with the `SurfWater` seam to P4b, where the board first samples the physical water. Render and contact must switch kernels together (G1 note).
