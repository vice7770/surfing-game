# P4b SurfWater Sampling Seam: Design Record

> Built test-first on `claude/charming-sanderson-d9a2c0` after P4a. The implementation plan this record replaces is in the history of this file (`01ec126`). Test code lives in the files listed.

**Goal:** One water-sampling interface for the board and the rider fall, over the legacy field and the physical surf zone, with the legacy board moved onto it and its replays unchanged bit for bit. This is B0 of the board and surfer physics plan (local branch `codex/board-surfer-physics-proposal`), and P4b of the [wave plan](../../research/wave-formation-plan.md) (§1.10, Q10).

## Design

- **`src/physics/SurfWater.ts`**
  - `SurfWater.sampleAt(x, y, z, out)` returns a `WaterSample`:
    - the surface, still depth and actual water depth;
    - explicit `wet` and `outsideDomain` flags;
    - slopes and normal;
    - the flow at height y, with its regime (`surface`, `profile`, `bore`, `shallow`, `dry`, `outside`);
    - breaking.
  - `surfaceAt(x, z)` gives the surface alone.
  - `addReaction(x, z, Jx, Jy, Jz)` hands the water the reaction to the impulse it gave a body this step; the water takes −J.
  - Units are SI: x along shore, z toward the beach, y up.
- **`LegacySurfWater`**
  - Returns exactly what `InteractiveWaterField.sample()` does, with surface velocity whatever the depth.
  - Reports points beyond the grid as `outsideDomain`; the field itself silently returns a flat sea there.
  - `InteractiveWaterField.applyBoardImpulse` takes the reaction as an impulse, with the same arithmetic order, so the replays stay bit-identical.
- **`BoardPhysics` and `RiderFall`** sample the water only through the seam. The legacy-only game rules (crest, packet width, peel phase, stepping the field) stay on the field.
- **`src/physics/PhysicalSurfWater.ts`** answers the seam from the stage 1 solver, in the worker next to it:
  - **Surface:** Catmull-Rom (Q10) over the uniform render nodes. Each node is the solver's bilinear cell sample, exactly the value the renderer uploads. Bodies therefore meet the drawn vertices and the shader's central-difference normal exactly, and the slope stays continuous between nodes. The render mesh has one vertex per node, so the shader's kernel needs no change until the mesh densifies (G1 note).
  - **Flow:** the depth-averaged current reshaped by the linear profile u/ū = kh cosh(k s)/sinh(kh), at height s above the bed (§1.10). k comes from the peak period at the local depth, and the factor is capped at 2. The flow stays depth-averaged where breaking exceeds 0.3 (`bore`) or kh < 0.05 (`shallow`).
  - **Vertical flow** is reconstructed from continuity (∂η/∂t = −∇·q) with the same profile, and is not solver state.
  - **Dry and outside:** samples say so, instead of reusing an edge cell.
  - **Reactions:** Δq = −J/(ρA) over the nearest wet cells (ρ = 1025 kg/m³), conserving momentum. The vertical part cannot enter the depth-averaged water, so it is tallied in `unappliedVerticalImpulse`.
  - **Cost:** about 1.3 µs per sample.
- **`src/physics/boardReference.ts`** records the provisional B0 reference beside the legacy code's effective values:

  | | Value | Source |
  |---|---|---|
  | Rider | 73 kg | Shormann & in het Panhuis 2020 |
  | Board | 1.778 × 0.464 × 0.0667 m, 25.75 L, 2.54 kg, thruster | Connellan et al. 2026, DP-1 |
  | Legacy today | 2.65 m rendered board, 80 kg effective board mass, 74 kg rider | code |

  At rest the reference board floats 26.4 kg of seawater, so 65 % of a standing rider and board must come from planing lift. That is the first requirement of P4c's board body.
- **Traces and baseline**
  - `src/physics/boardTrace.ts` runs scripted legacy scenarios and hashes every step's state (FNV-1a).
  - `npm run report:board-baseline` writes the [legacy board baseline](../../research/board-baseline.md).

## Verification

- **Tests: 227 in the suite, and the build passes.**
  - `BoardTrace.test.ts` (8): seven golden hashes cover the default catch on seeds 1, 5 and 9, a sustained carve to a wipeout and fall, a forced hard-turn wipeout, and the Point and Reef presets. They were taken before the refactor and are unchanged after it. A one-part-in-14,000 change to paddle force changes the hash.
  - `SurfWater.test.ts` (3): the legacy adapter matches `sample()` field by field, flags points beyond the grid, and reproduces the force reaction bit for bit.
  - `PhysicalSurfWater.test.ts` (8):
    - the Catmull-Rom weights interpolate, sum to one and reproduce lines;
    - the surface and normal equal the render data at more than 200 render nodes;
    - the slope is continuous across node lines (to 1e-5);
    - the profile keeps ū as its depth average (to 1e-4), with kh coth kh at the surface and kh/sinh kh at the bed;
    - the bore, shallow and dry regimes are flagged;
    - converging flow reconstructs the rise rate;
    - outside-domain queries are reported;
    - reactions conserve momentum exactly, and the vertical impulse is tallied.
  - `boardReference.test.ts` (3): the volume fraction, the flotation shortfall, and that the legacy values are kept apart.
- **Baseline** (seeds 1–12 on Training, then 3 seeds × 3 presets × 3 steering styles over 60 s):
  - Every seed catches in 3.3–3.6 s and completes the legacy 20 m ride. That is the guarantee natural sets must not inherit.
  - Straight sustained rides last the full 60 s (183–201 m).
  - The carve script wipes out after 13–16 s, except one Reef seed that holds.
  - Hard turns wipe out after about 6 s.

## Deviations and open items

- The board does not yet ride the physical water: P4c builds its body in the worker on `PhysicalSurfWater`.
- Legacy samples ignore the query depth (regime `surface`) to stay bit-identical; the profile applies to the physical water only.
- `main.ts` still reads the legacy field directly for the crest marker and the legacy camera's underwater test (the same `heightAt`). They are rendering, not bodies, and retire with the legacy field.
- The render mesh stays at one vertex per node. If it densifies (G1's 2× near the camera), the shader must evaluate the same Catmull-Rom between nodes.
