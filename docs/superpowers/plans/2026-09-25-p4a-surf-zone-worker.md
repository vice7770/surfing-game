# P4a Surf Zone Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the physical surf zone in a Web Worker, so the main thread only renders snapshots. This is the first step of P4 (board on physical waves), required before the physical waves can be played ([plan](../../research/wave-formation-plan.md) §3.2, P2 deferral; board plan's P2c handoff).

**Architecture:** A pure `SurfZoneRunner` owns the `SurfZoneSimulation` and the bubble cloud, steps them at a fixed 1/60 s, and fills a snapshot: the render grid's (height, foam) and (u, w) arrays, lip and bubble positions, and a plain-data status for the Wave Lab readout. A `SurfZoneHost` interface is the main thread's only view of a running surf zone. `LocalSurfZone` runs the runner in-thread (tests, fallback), and `WorkerSurfZone` runs it in `surfZoneWorker.ts`, exchanging transferable buffers. `PhysicalMode` renders from the host's latest snapshot. It rebuilds the spot and sea state from the config (both pure and seeded) for the seabed and far field.

**Tech Stack:** TypeScript, Vite module workers (`new Worker(new URL(…), { type: 'module' })`), transferable `ArrayBuffer`s, three.js r186, Vitest.

## Context: where P4a sits

The wave plan's P4 is the board phase. The agreed board and surfer physics plan (`docs/research/board-surfer-physics-plan.md` on the local branch `codex/board-surfer-physics-proposal`, requirements confirmed in a 23-question grilling) splits the same work into B0–B5. Its integration handoff (`board-water-integration-handoff.md`, same branch) makes a stable worker and water sampler the precondition. P4 is therefore delivered as:

| Sub-phase | Content | Board plan |
|---|---|---|
| **P4a** (this plan) | Surf zone in a Web Worker; host interface; snapshots | P2c handoff: worker, step ownership, budget |
| P4b | `SurfWater` sampling seam (surface, normal, wet/dry, outside-domain, flow at body depth by the §1.10 profile, breaking) over legacy and physical water; legacy `BoardPhysics` on the seam with bit-identical replays; baseline traces; reference shortboard and rider record | B0 |
| P4c | Rigid board body (separate board and rider mass, quaternion, buoyancy, drag, bounded planing) in the worker on physical water, with horizontal reactions | B1 |
| P4d | Rider contacts, stance, manual pop-up phases, weight-shift steering | B2 |
| P4e | Fins, rails, stall, breaking and lip impacts | B3 |
| P4f | Continuous fall, paddling and catch calibration, practice-wave forcing and natural sets; the §1.10 board tests | B4 |

## Global Constraints

- One water state; the worker is the authority, and the main thread never steps physics.
- Determinism: the runner is pure. The worker and `LocalSurfZone` produce bit-identical snapshots for the same config and step sequence, and the tests run on the local runner.
- Fixed step 1/60 s; the main thread decides how many steps each frame requests (the existing accumulator, at most 3 per frame), so pacing is unchanged.
- Budget (§3.1): water step ≤ 4 ms in the worker (measured, not assumed), main-thread upload ≤ 0.5 ms.
- No gameplay change: the physical mode stays view-only, and the legacy mode is untouched.

## File Structure

- Create `src/wave/SurfZoneRunner.ts` (+ test): runner, `SurfZoneStatus`, `surfZoneSea(config)`.
- Create `src/wave/BubbleCloud.ts` (+ test): the bubble simulation split from `BubblePoints` (no three.js in the worker).
- Modify `src/scene/BubblePoints.ts`: render positions only.
- Create `src/game/SurfZoneHost.ts` (+ test): `SurfZoneHost`, `SurfZoneSnapshot`, `LocalSurfZone`.
- Create `src/game/surfZoneWorker.ts` and `src/game/WorkerSurfZone.ts`, with a pure `SurfZoneWorkerCore` message handler (+ test).
- Modify `src/game/PhysicalMode.ts`, `src/main.ts`, `src/scene/PhysicalSurfaceSource.ts` users, and tests.

---

### Task 1: SurfZoneRunner, status and bubble cloud

**Interfaces:**
- Produces:
  - `surfZoneSea(config: SurfZoneConfig): SeaState`, used by `SurfZoneSimulation`'s constructor too.
  - `interface SurfZoneStatus { seaTime; timeToSet; stepMs; cells; breakPoint; breakDepth; breaker; breakingFraction; peel?; lipLaunches; lipVolume; lipAirborne; onsetScale }`.
  - `class BubbleCloud { constructor(seed, capacity); update(scene, dt); count; positions: Float32Array; clear() }`.
  - `class SurfZoneRunner { constructor(config); readonly simulation; readonly grid; readonly bed: Float32Array; readonly focus; windowXMin; advance(steps); fill(snapshot: SurfZoneBuffers): void; status(): SurfZoneStatus }`, where `SurfZoneBuffers = { surface: Float32Array; flow: Float32Array; lip: Float32Array; bubbles: Float32Array; lipCount; bubbleCount }`.
  - `formatPhysicalReadout(config, status, storm?)`.
- [ ] Tests: `fill` equals `writeUniformSurface` and `writeUniformFlow` of the same simulation; `status()` equals the simulation's methods; the lip and bubble arrays hold the active positions; the readout strings from status are unchanged (existing `PhysicalMode` readout tests move onto status); `BubbleCloud` keeps the `BubblePoints` behaviour tests.
- [ ] Implement, run, and commit `refactor: step the surf zone in a runner that fills snapshots`.

### Task 2: SurfZoneHost and PhysicalMode on snapshots

**Interfaces:**
- Produces:
  - `interface SurfZoneSnapshot extends SurfZoneBuffers { status: SurfZoneStatus }`.
  - `interface SurfZoneHost { readonly config; readonly grid; readonly bed; readonly focus; readonly windowXMin; readonly snapshot?: SurfZoneSnapshot; advance(steps): void; heightAt(x, z); bedAt(x, z); dispose() }`; `heightAt` and `bedAt` read the snapshot through `sampleSurfaceHeight` and `sampleSurfaceBed`.
  - `class LocalSurfZone implements SurfZoneHost` (a synchronous `advance`).
  - `PhysicalMode.start(settings, seed, water, overrides?, host?)` takes a host factory. The render source, lip points, bubble points, camera and readout all read the host.
- [ ] Tests: `PhysicalMode` tests pass on `LocalSurfZone`; the render data after N steps equals a direct `SurfZoneSimulation` run of N steps (bit-identical); `heightAt` matches the snapshot sampler.
- [ ] Implement, run, and commit `refactor: render the physical mode from surf zone snapshots`.

### Task 3: Web Worker host

**Interfaces:**
- Produces:
  - Message protocol `{ type: 'start', config } → { type: 'ready', grid, bed, focus, windowXMin }` and `{ type: 'advance', steps, buffers } → { type: 'snapshot', snapshot }`, with transferred buffers returned to a pool of two.
  - `SurfZoneWorkerCore` (pure handler: `handle(message, post)`).
  - `surfZoneWorker.ts` (binds the core to `self`).
  - `WorkerSurfZone implements SurfZoneHost`: `start()` resolves on `ready`; one advance in flight, with requested steps accumulating while busy.
  - `main.ts` uses `WorkerSurfZone` when `Worker` exists, and shows its loading state until `ready`.
- [ ] Tests: the core's snapshots are bit-identical to `LocalSurfZone`'s for the same steps; buffers round-trip, and a busy core queues steps; `WorkerSurfZone` against a fake worker port handles ready, one-in-flight and dispose.
- [ ] Implement, run, and commit `feat: run the physical surf zone in a Web Worker`.

### Task 4: Browser verification and record

- [ ] Every spot starts without console errors, the loading overlay covers the spin-up, and the visuals match the in-thread build.
- [ ] Measure main-thread time per frame before and after (physical frame, upload), the worker step (ms per fixed step at the game grid), snapshot transfer, and FPS.
- [ ] Rewrite this plan as the record; update the wave plan's §3.2/§4.1 and the ROADMAP (P4 in progress, P4a done); run the suite and build; commit `docs: record P4a surf zone worker`.
