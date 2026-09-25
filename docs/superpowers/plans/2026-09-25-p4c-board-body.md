# P4c Board Body Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A rigid shortboard body that floats, drops and planes on water sampled through `SurfWater`, with its own mass and inertia from the reference geometry. It runs in the worker on the physical surf zone (visible there, drifting, riderless). This is B1 of the board and surfer physics plan, and P4c of the wave plan (§1.10).

**Architecture:**
- `boardShape.ts` builds the reference shortboard (1.778 × 0.464 × 0.0667 m, 25.75 L, 2.54 kg) as a parametric outline, rocker and thickness. Its hull is a 12 × 4 grid of bottom patches, and the rail taper is solved so the volume is exactly 25.75 L.
- `BoardBody` is a rigid body: position, quaternion, and linear and angular velocity, plus the mass and inertia from the patches. Optional rigid payloads stand in for the rider's weight until P4d. Each substep it samples the water at every patch and sums the patch forces and moments:
  - buoyancy ρgV_submerged;
  - planing/impact pressure p = ½ρ·C_n·|v_rel|·max(0, v_rel·n) on the wetted area;
  - ITTC 1957 skin friction on the tangential relative flow.

  It integrates semi-implicitly with 4 substeps per 1/60 s. The horizontal hydrodynamic impulses go back to the water through `addReaction`.
- `SurfZoneRunner` optionally carries one body; snapshots add its pose, and `PhysicalMode` draws a board mesh there.

**Tech Stack:** TypeScript, three.js math (`Vector3`, `Quaternion`, `Matrix3`), Vitest.

## Sources (checked 2026-09-25)

- **Savitsky 1964 (planing surfaces):**
  - C_L0 = τ^1.1·[0.012 λ^0.5 + 0.0055 λ^2.5/C_V²] with τ in degrees, λ the mean wetted length/beam and C_V = V/√(g b);
  - lift L = ½ρV²b²C_L0;
  - valid for 0.6 ≤ C_V ≤ 13, λ ≤ 4 and 2° ≤ τ ≤ 15°.

  The first term is the dynamic lift; the second is buoyancy.
- **ITTC 1957 friction line:** C_F = 0.075/(log₁₀ Re − 2)² with Re = V·L_wet/ν, and ν ≈ 1.19 × 10⁻⁶ m²/s for seawater at 15 °C.
- **Reference board and rider:** as recorded in P4b (`boardReference.ts`).

## Modelling choices (not measured, stated)

- **Outline:** a squash tail 0.26 m wide, a wide point at mid-length, 0.29 m wide at 83 % of the length, and a pointed nose.
- **Rocker:** 3.5 cm at the tail and 12.5 cm at the nose, typical of shortboards.
- **Thickness:** peaks at the stringer; rails taper across the width.
- **Hull:** a flat bottom across (no vee or concave). The shell's mass is spread in proportion to volume.
- **C_n:** calibrated once against Savitsky's dynamic lift for a flat plate (λ = 3, τ = 4°, C_V = 5), not tuned for feel.
- **No lateral resistance yet:** there are no fins or rails; they are P4e.

## Tasks

### Task 1: Board shape
- `src/physics/boardShape.ts` with `buildBoardShape(reference)`, giving `{ patches, volume, planformArea, mass, centerOfMass, inertia }`.
- Tests:
  - the volume is 25.75 L (to 0.1 %), and the maximum thickness, length and width match the reference;
  - the planform area is 0.55–0.65 m²;
  - the centre of mass sits near mid-length on the centreline;
  - the inertia is symmetric positive definite, with pitch ≈ yaw ≫ roll;
  - patch normals point down, tilted by the rocker.
- Commit `feat: build the reference shortboard hull`.

### Task 2: Planing calibration
- `src/physics/hullForces.ts`:
  - `patchForces(patch, pose, water sample, relative velocity)` returns (buoyancy, pressure, friction) and the application point;
  - `savitskyLift(τ, λ, C_V)`;
  - `ittcFriction(Re)`;
  - `PRESSURE_COEFFICIENT`.
- Tests:
  - a flat test plate towed at C_V = 5, λ = 3 and τ = 4° matches Savitsky's dynamic lift to 10 %;
  - lift rises with trim;
  - friction follows ITTC;
  - no force on a dry or outside-domain patch;
  - pressure only when flow meets the hull.
- Commit `feat: add planing, buoyancy and friction forces on hull patches`.

### Task 3: BoardBody
- `src/physics/BoardBody.ts`: state; `step(dt, water)` with substeps; payloads; reactions; an energy ledger (work by gravity, water pressure and buoyancy, and friction).
- Tests (a flat still channel, and an analytic tilted-plane `SurfWater` stub):
  - the bare board floats at m/ρ displaced volume (to 3 %) and settles level;
  - a +20 kg payload floats deeper, and a +75 kg payload sinks: the board floats 26.4 kg at most;
  - a +75 kg payload stays up while moving at 6 m/s but sinks at 0.5 m/s, so planing carries the rider;
  - a 1 m drop settles without blow-up, and its energy ledger closes to 1 %;
  - a slide down the tilted plane reaches 0.9–1.0 × √(2gΔh), with the ledger closed (§1.10 drop test);
  - the board drifts to a uniform current's velocity;
  - 1/60 and 1/120 s steps agree to tolerance;
  - identical runs are bit-identical.
- Commit `feat: float, drop and plane a rigid board body on sampled water`.

### Task 4: A board in the physical surf zone
- The runner (and worker) carry an optional `BoardBody` on `PhysicalSurfWater`, spawned in the lineup offshore of the break; snapshots add its pose. `PhysicalMode` draws a reference-size board mesh there.
- Tests:
  - worker and local snapshots stay bit-identical with the board;
  - the board floats on every spot's still water at its draft;
  - on the Beach it is moved by passing waves and stays finite.
- Commit `feat: float a board on the physical surf zone`.

### Task 5: Browser check and record
- The board visibly bobs and drifts in the physical mode; measure the worker step with the board. Then write the record, update the ROADMAP and plan, run the suite and build, and commit `docs: record P4c board body`.
