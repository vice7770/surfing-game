# G4 Advected Foam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry foam on the physical surf zone's solver grid, sourced by bore dissipation and lip splashes, moved by the solver's currents, decaying per spot, and render it as a foam network that drifts with the flow ([plan](../../research/wave-formation-plan.md) §2.4, G4).

**Architecture:** A new `FoamField` holds two cell-centred scalars on the solver grid: dense whitewater and a residual lace. Each frame it advects both semi-Lagrangian with the solver's depth-averaged velocity, decays them with exact exponentials (dense foam feeds the lace as it decays), and adds sources: the breaking strength B times the bore's head-loss dissipation, and the volume of landing lip parcels. `SurfZoneSimulation` owns it, and the render resampling writes its total instead of the old breaking-strength foam and per-node memory. A second render texture carries the flow (u, w), and the water shader draws foam as a cellular network whose threshold makes the covered fraction equal the foam value, drifting with the flow by a two-phase flow map.

**Tech Stack:** TypeScript, three.js r186 (`onBeforeCompile`), GLSL ES 3.0, Vitest.

## Global Constraints

- One water state (ADR 0002): foam is carried by the solver's velocity and never feeds back into the water.
- Foam value F ∈ [0, 1] is the fraction of the surface covered by foam; the renderer's threshold keeps that meaning.
- Dense foam decays with τ_dense = 3 s, inside the effective oceanic whitecap foam decay time of 1.4–4.8 s (Callaghan et al. 2012). The residual lace decays with a per-spot τ_residual (surfactant-stabilised foam decays much more slowly: Callaghan et al. 2013, 2017).
- Deterministic: no randomness in the foam physics; the render pattern is a fixed hash of position.
- Budget (§3.1): the foam update adds at most ~1.5 ms per frame on the main thread; the extra flow texture is one more RG float upload per frame.
- Legacy mode keeps its own foam memory (it has no solver grid); it gets the new foam pattern with zero flow.

## Sources (checked 2026-09-25)

- Hydraulic-jump head loss ΔH = (h₂ − h₁)³/(4 h₁ h₂) and bore speed c = √(g h₂ (h₁ + h₂)/(2 h₁)) (standard open-channel hydraulics, e.g. Chow 1959); dissipation per unit crest length / ρ = g q ΔH with q = c h₁.
- Whitecap foam decay: individual events 0.2–10.4 s, effective (area-weighted) 1.4–4.8 s (Callaghan, Deane & Stokes 2012, *JGR Oceans*). Two regimes, bubble-plume controlled and surfactant stabilised (Callaghan et al. 2013, *JPO*; 2017). Laboratory and field foam evolve in similar patterns but differ in absolute durations (Callaghan et al. 2024).
- Nearest-neighbour distance in a planar Poisson point set of density λ: P(d > r) = e^{−λπr²}, which sets the pattern threshold.

## File Structure

- Create `src/wave/FoamField.ts` and `src/wave/FoamField.test.ts`: the transport model.
- Modify `src/wave/PlungingLip.ts`: an `onLand` hook.
- Modify `src/wave/SurfZoneSimulation.ts`: per-spot `FOAM_DECAY`, owning and stepping the field, render foam from it, `writeUniformFlow`.
- Modify `src/scene/PhysicalSurfaceSource.ts`: drop the per-node memory, add `writeFlow`.
- Create `src/scene/foamPattern.ts` and `src/scene/foamPattern.test.ts`: the cellular pattern (CPU mirror and GLSL).
- Modify `src/scene/WaterSurface.ts`, `src/scene/waterOptics.ts`: flow texture and foam shading.
- Optional last task: `src/scene/BubblePoints.ts` for bubbles below bores in the underwater view.

---

### Task 1: FoamField transport model

**Files:** Create `src/wave/FoamField.ts`, `src/wave/FoamField.test.ts`.

**Interfaces:**
- Produces: `interface FoamDecay { dense: number; residual: number }` (e-folding times, s); `boreDissipation(stillDepth, depth): number` (m³/s³, dissipation per unit crest length / ρ); `class FoamField { dense: Float64Array; residual: Float64Array; constructor(solver, decay); update(dt, breaking: ArrayLike<number>); addSplash(x, z, volume); totalAt(i): number }`; constants `FOAM_SOURCE_RATE` (4 s⁻¹ at the reference bore), `REFERENCE_BORE` (a 0.5 m bore on 1 m of still water), `LACE_SHARE` (0.3 of decaying dense foam becomes lace), `SPLASH_DEPTH` (0.05 m of landed water saturates a cell).

- [ ] **Step 1: Failing tests** (`FoamField.test.ts`), on a flat `ShallowWaterSolver` (uniform 2 m depth, open x, `uniformEdges` in z) whose `h`, `qx`, `qz` the test sets directly (the solver is not stepped):
  1. *Uniform current carries foam:* a Gaussian dense blob (σ 2 m) at x = −10 with u = 1 m/s and long decay; after 150 updates of 1/30 s its centroid is at −5 ± 0.2 m and its total is conserved within 5 %.
  2. *The same across stretched rows:* w = 0.8 m/s on `stretchedEdges` rows moves the blob 4 m in z ± 0.2 m.
  3. *Two-regime decay:* with no flow or source, dense = D₀ e^{−t/τ_dense} to 1e-12; the lace rises then, once dense is gone, falls by e^{−1/τ_residual} per second (1e-3).
  4. *Bore dissipation:* `boreDissipation(1, 1.5)` equals g·h₁·c·ΔH from the formulas above; it rises with bore height and is 0 when the depth does not exceed the still depth.
  5. *Source:* one update with B = 1 on a cell carrying the reference bore adds `FOAM_SOURCE_RATE · dt`; a smaller bore adds proportionally less; B = 0 adds none; dry cells hold no foam.
  6. *Splash:* `addSplash` of 0.1 m³ on a 1 m² cell saturates it (F = 1) and leaves its neighbours alone.
  7. *Window slide:* after `solver.shiftAlongShore(3)` the next update keeps the blob at the same world x.
- [ ] **Step 2:** `npx vitest run src/wave/FoamField.test.ts` fails (module missing).
- [ ] **Step 3: Implement.** Update order per call: slide with the solver window if `xCenters[0]` moved (new columns empty); advect both fields from their previous values (departure point x − u dt, z − w dt; one clamped bilinear weight set shared by both fields; rows found by a local search from the cell's own row); decay exactly (`dense' = dense·a_d`, `lace' = lace·a_r + LACE_SHARE·(dense − dense')`); add the bore source `B·FOAM_SOURCE_RATE·boreDissipation/boreDissipation(REFERENCE_BORE)·dt` to dense; clear dry cells (h ≤ 0.01 m); cap dense + lace at 1.
- [ ] **Step 4:** tests pass.
- [ ] **Step 5:** commit `feat: carry foam on the solver grid with the flow`.

### Task 2: Surf zone foam and flow output

**Files:** Modify `src/wave/PlungingLip.ts`, `src/wave/SurfZoneSimulation.ts`, `src/scene/PhysicalSurfaceSource.ts`, tests in `src/wave/SurfZoneSimulation.test.ts`, `src/scene/PhysicalSurfaceSource.test.ts`, `src/scene/WaterSurface.test.ts`.

**Interfaces:**
- Produces: `PlungingLip.onLand?: (x, z, volume) => void`; `FOAM_DECAY: Record<SpotName, FoamDecay>` (dense 3 s everywhere; residual beach 20, canyon 15, point 12, reef 8 s); `SurfZoneConfig.foamDecay?`; `SurfZoneSimulation.foam: FoamField`; `writeUniformFlow(data, grid)` (interleaved u, w per render node, 0 on dry nodes); `SurfaceSource.writeFlow?(data)`; `RenderableSurfZone.writeUniformFlow`.

- [ ] **Step 1: Failing tests:**
  - *SurfZoneSimulation:* after a 20 s breaking Point run (1 m cells), foam covers cells shoreward of the break line, none offshore of the outermost breaking row, and some lace remains 10 s after breaking stops in a column (residual decay); `FOAM_DECAY.beach.residual > FOAM_DECAY.reef.residual`; a lip landing adds foam at its cell.
  - *Render foam:* the foam channel of `writeUniformSurface` equals the bilinear resample of `foam.totalAt` (no slope tint, no per-node memory); `writeUniformFlow` equals the resampled u, w and is 0 on dry nodes.
- [ ] **Step 2:** tests fail.
- [ ] **Step 3: Implement.** Step order: solver → breaking → onsets → lip (landings splash into the foam) → `foam.update(dt, breaking.strength)`. Remove `PhysicalSurfaceSource`'s memory and `FOAM_DECAY` there; its `write` passes through, `writeFlow` calls `writeUniformFlow`. Rewrite the old whitewater-memory test as a pass-through test.
- [ ] **Step 4:** `npx vitest run src/wave src/scene` passes.
- [ ] **Step 5:** commit `feat: source the surf zone foam from bores and lip splashes`.

### Task 3: Foam pattern and flow in the water shader

**Files:** Create `src/scene/foamPattern.ts`, `src/scene/foamPattern.test.ts`; modify `src/scene/WaterSurface.ts`, `src/scene/waterOptics.ts`, `src/scene/FarFieldOcean.ts`; tests in `WaterSurface.test.ts`, `FarFieldOcean.test.ts`.

**Interfaces:**
- Produces: `FOAM_CELL` (0.7 m pattern cell), `FOAM_FLOW_PERIOD` (2 s), `foamDistance(x, z): number` (distance to the nearest jittered feature point, in cells; hash identical to GLSL), `foamCoverage(foam, distance): number` (1 when the distance exceeds r_t = √(−ln F / π), soft over ±0.04), `foamPatternPars` (GLSL mirror plus `waterFoamCover(vec2 p, vec2 flow, float foam, float time)` with the two-phase flow map); `WaterSurface` flow texture `waterFlow` (RG float, uploaded each frame when the source has `writeFlow`, zeros otherwise).

- [ ] **Step 1: Failing tests:**
  - *foamPattern:* over a 60 × 60 m sample grid, mean coverage is within 0.08 of F for F = 0.2, 0.5, 0.8, is 0 at F = 0 and 1 at F = 1, and rises monotonically with F.
  - *Shader patches:* the tank shader declares `waterFlow` and calls `waterFoamCover(`, the far field calls it with zero flow, and every replaced chunk exists.
- [ ] **Step 2:** tests fail.
- [ ] **Step 3: Implement.** `waterBodyFragment` takes the foam cover instead of the raw foam value for the colour mix, and raises `roughnessFactor` toward 0.9 under foam (foam is a matte surface). The crest light is still masked by the raw foam.
- [ ] **Step 4:** tests pass; `npx tsc -b` clean.
- [ ] **Step 5:** commit `feat: draw foam as a network that drifts with the flow`.

### Task 4 (optional): Bubbles below bores

Pooled points (like `LipPoints`) spawned under cells whose bore source is active, rising at 0.2 m/s and fading over 1.5 s, visible in the underwater view. Only if Tasks 1–3 leave budget; otherwise record as deferred to G6's particle pools.

### Task 5: Browser verification, budget and record

- [ ] Physical mode, Beach: foam trails follow the bores shoreward, fade to lace, and the lace drifts with the rip and feeder currents; Reef: lace clears faster than on the Beach.
- [ ] Measure the foam update (ms per frame, bundled Node and in-browser `performance.now`), the upload with the flow texture, and the GPU cost of the pattern (timer queries).
- [ ] Legacy ride still reads; no console errors.
- [ ] Rewrite this plan as the design record, update the plan's §2.4 and §4.1 G4 row and ROADMAP, run the suite and build, commit `docs: record G4 advected foam`.
