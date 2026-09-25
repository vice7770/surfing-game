# P4b SurfWater Sampling Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One water-sampling interface for the board and the rider fall, over the legacy field and the physical surf zone, with the legacy board moved onto it and its replays unchanged bit for bit. This is B0 of the board and surfer physics plan (branch `codex/board-surfer-physics-proposal`), P4b of the [wave plan](../../research/wave-formation-plan.md) (§1.10, Q10).

**Architecture:**
- A `SurfWater` interface samples the water at a world point, including a depth below the surface: surface, normal, slopes, still and actual depth, wet and outside-domain flags, flow at that depth with its profile regime, and breaking. It also takes horizontal and vertical reaction impulses.
- `LegacySurfWater` wraps `InteractiveWaterField` and returns exactly what `sample()` did, so the legacy board's traces are unchanged. They are locked first by golden hashes of whole runs.
- `PhysicalSurfWater` wraps a `SurfZoneSimulation` in the worker:
  - **Surface:** Catmull-Rom (Q10) over the uniform render nodes, where each node is the solver's bilinear cell sample, exactly the value the renderer uploads. At vertices the board and the rendered mesh agree exactly, in height and in the shader's central-difference normal.
  - **Flow:** the §1.10 linear profile, bounded and flagged in bores and in very shallow water. Vertical flow is a labelled reconstruction.
  - **Reactions:** they become Δq = −J/(ρA) over the four nearest cells, which conserves momentum.

**Tech Stack:** TypeScript, three.js `Vector3` (legacy only), Vitest.

## Global Constraints

- Legacy gameplay is unchanged: identical inputs give bit-identical legacy traces before and after (golden hashes).
- SI units; x along shore, z toward the beach, y up; one sample and the force applied from it belong to the same fixed step.
- Outside the physical window or tank, samples say so (`outsideDomain`) and never silently reuse an edge cell.
- The linear velocity profile applies only where it is valid: flagged as `'bore'` (depth-averaged, factor 1) where breaking is above 0.3, and as `'shallow'` for kh < 0.05. The factor is capped at 2.
- A depth-averaged solver cannot take a vertical impulse; the physical adapter records it but does not apply it.

## Tasks

### Task 1: Golden legacy traces
- `src/physics/boardTrace.ts`: scripted scenarios (paddle to the pop-up window, get up, then scripted steering) that hash every step's board, rider-fall and diagnostic state (FNV-1a over the float bytes).
- Test `BoardTrace.test.ts`: a default catch-and-ride on seeds 1, 5 and 9; the sustained carve to a wipeout and fall; and the Point and Reef presets. Each is locked to the hash the current code produces.
- Commit `test: lock legacy board traces with golden hashes`.

### Task 2: SurfWater and the legacy adapter
- `src/physics/SurfWater.ts`: `SurfWater { sampleAt(x, y, z, out); surfaceAt(x, z); addReaction(x, z, impulse) }` and `WaterSample`.
- `LegacySurfWater` returns `sample()`'s values; flow is the legacy surface velocity, with regime `'surface'`. `InteractiveWaterField.applyBoardImpulse` does the reaction with the same arithmetic order.
- `BoardPhysics` and `RiderFall` sample only through the seam; the legacy-only game rules (crest, packet, peel) stay on the field.
- Tests: the golden hashes are unchanged; the adapter matches `sample()` field by field.
- Commit `refactor: sample the legacy water through the SurfWater seam`.

### Task 3: The physical adapter
- `src/physics/PhysicalSurfWater.ts` over `SurfZoneSimulation`: Catmull-Rom surface and gradient over render nodes, depth and wet by the render convention, outside-domain, the §1.10 flow profile (k from Tp at the local depth), vertical reconstruction w = −∇·q·(z + h)/h, breaking, and `addReaction`.
- Tests:
  - nodes equal the render data;
  - C¹ across cell edges, and linear fields reproduced;
  - the profile's depth average equals ū, and its surface value is kh·coth kh times ū;
  - `'bore'` and `'shallow'` regimes are flagged;
  - outside-domain queries are reported;
  - `Σ ρ A Δq = −J`;
  - samples at the wet/dry edge are finite.
- Commit `feat: sample the physical surf zone for the board`.

### Task 4: Reference record and baseline report
- `src/physics/boardReference.ts`: the provisional B0 shortboard and rider (73 kg rider; 1.778 × 0.464 × 0.0667 m, 25.75 L, 2.54 kg thruster) with sources. It is recorded, not yet used.
- `npm run report:board-baseline` writes `docs/research/board-baseline.md`: legacy catch, ride, turn and wipeout statistics across seeds and presets, as the B0 baseline the new board will be compared with.
- Commit `docs: record the reference board and the legacy board baseline`.

### Task 5: Record
- Rewrite this plan as the record; update the ROADMAP and the plan's §1.10; run the suite and build; commit `docs: record P4b SurfWater seam`.
