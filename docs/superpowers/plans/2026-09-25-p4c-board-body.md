# P4c Rigid Board Body: Design Record

> Built test-first on `claude/charming-sanderson-d9a2c0` after P4b, with `main`'s surfer physics plan merged in. The implementation plan this record replaces is in the history of this file (`64d4dd2`, aligned with the surfer plan in `7d9c8e3`). Test code lives in the files listed.

**Goal:** A rigid shortboard that floats, drops and planes on water sampled through `SurfWater`, with its own mass and inertia from the reference geometry. It runs in the worker on the physical surf zone, visible there and riderless. This is B1 of the [board and surfer physics plan](../../research/board-surfer-physics-plan.md) and P4c of the [wave plan](../../research/wave-formation-plan.md) (§1.10).

## Sources (checked 2026-09-25)

- **Savitsky 1964 (planing surfaces):**
  - lift coefficient C_L0 = τ^1.1·[0.012 λ^0.5 + 0.0055 λ^2.5/C_V²] and lift L = ½ρV²b²C_L0, with τ in degrees, λ the mean wetted length over beam and C_V = V/√(g b); the first term is dynamic lift, the second buoyancy;
  - centre of pressure 0.75 − 1/(5.21 C_V²/λ² + 2.39) of the wetted length ahead of the transom;
  - valid for 0.6 ≤ C_V ≤ 13, λ ≤ 4 and 2° ≤ τ ≤ 15°.
- **ITTC 1957 friction line:** C_F = 0.075/(log₁₀ Re − 2)², with ν ≈ 1.19 × 10⁻⁶ m²/s for seawater at 15 °C.
- **Added mass of a planing section:** ρπb²/8 per unit length for a flat section wetted over beam b, the strip-theory value (Zarnick 1978). Water entry shares momentum with the added mass it gains (von Kármán 1929).
- **Hydrostatic pressure under a sloping surface:** p = ρg(η − y), so a displaced volume V is pushed by ρgV(−∂η/∂x, 1, −∂η/∂z). This is the Froude–Krylov force of shallow-water theory.
- **Reference board and rider:** recorded in P4b (`boardReference.ts`).

## Design

- **`boardShape.ts`: the hull**
  - The reference board as a parametric outline, rocker and stringer thickness (monotone PCHIP curves), with a flat bottom.
  - 12 × 4 bottom patches. The rail taper t(1 − a u²) is solved so they hold exactly 25.75 L.
  - Mass 2.54 kg, spread in proportion to volume. Inertia about the centre of mass: pitch 0.426, yaw 0.449, roll 0.026 kg·m².
  - The curves and taper are exported, so the renderer draws the same hull.
- **`hullForces.ts`: forces on one patch**, treated as a slab from its bottom face to its deck:
  - **Buoyancy:** from the part of the slab under the surface, along the hydrostatic gradient. It pushes a board down a sloping face and floats a capsized board on its deck.
  - **Planing pressure:** p = ½ρ C_n |v| max(0, v·n) on the wetted face that meets the flow, never suction.
    - C_n ≈ 0.46 is calibrated once against Savitsky's dynamic lift (τ 4°, λ 3, C_V 5).
    - `planingScales` concentrates it behind each strip's spray root as p ∝ 1/√x, with x counted in wetted length. That gives Savitsky's √λ lift and a centre of pressure about two thirds of the wetted length ahead of the tail.
    - The distribution relaxes to uniform when the flow meets the hull head-on, as in a drop.
    - The patch reports ∂p/∂v_n for the implicit integrator.
  - **Skin friction:** ITTC friction on the tangential flow over both wetted faces.
  - **Wetting ramp:** a patch wets over 1 cm centred on the waterline, so the force stays continuous without shortening a sloping hull's wetted length.
- **`BoardBody.ts`: the rigid body**
  - It carries optional rigid payloads, which stand in for the rider until P4d.
  - Each substep samples the water at every patch (48 samples) and applies the forces there, with gravity at the centre of mass.
  - **Water inertia:** three terms act on each wetted patch's motion into the local surface (along its normal ν), weighted by the patch's projection on it:
    - added mass, ρπb/8 per unit area;
    - water entry: added mass gained in a substep meets the patch inelastically;
    - radiation damping, at half the critical heave damping of a floating strip (a modelling choice).

    Planing and sliding along a face move no point into the surface, so their lift stays with the calibrated pressure.
  - **Integration:** semi-implicit Euler at 4 substeps per 1/60 s, solving one 6 × 6 system per substep.
    - The pressure is linearly implicit along each normal, and the water inertia is implicit.
    - A substep halves, up to 4 times, while a face approaching the water would cross more than a quarter of the wetting ramp within it.
  - **Seabed:** sequential-impulse contact (restitution 0, Coulomb friction 0.6) at every bottom and deck point, against `WaterSample.bedY`, which the seam now reports.
  - **Reactions:** each patch's hydrodynamic impulse over a step goes to `SurfWater.addReaction` once, after the step, at the patch's mean position.
  - **Energy ledger:** work by gravity, buoyancy, pressure, added mass, radiation, friction and the bed.
  - **Contact seam:** it implements the detached surfer's `BoardContactBody`. The contact box is centred on the board's own centre of mass, and moves of `position` made between steps are carried into the body.
- **`SurfWaterBodyField.ts`:** the detached surfer's `BodyWaterField`, answered through `SurfWater`, so the surfer and the board sample the same water.
- **In the surf zone**
  - `SurfZoneRunner(config, { board: true })` steps, in order: water → board (sample, integrate, react) → bubbles; then the snapshot.
  - The riderless board spawns level, nose to the beach, 25 m seaward of the break line. If it leaves the water's domain it goes back to the lineup, counted in `status.board.resets`.
  - Snapshots carry its pose in a transferred `Float64Array`: position, quaternion, and a present flag.
  - `stepMs` now includes the board.
  - Both hosts take the option and the game turns it on. `PhysicalMode` draws `createBoardMesh(shape)`, built from the same curves with its origin at the centre of mass, and shows a BOARD row in the Wave Lab.

## Verification

- **Tests: 292 in the suite, and the build passes.**
  - `hullForces.test.ts` (10):
    - the calibration matches Savitsky;
    - a trimmed plate wets exactly its calm-water length;
    - uniform pressure holds within ±25 % over τ 3–7°, λ 2–4;
    - the spray-root distribution holds within ±15 % over τ 3–10°, λ 2–4, with its centre of pressure at 0.62–0.72 of the wetted length;
    - ITTC friction; buoyancy on dry, outside and rising patches;
    - buoyancy follows the surface slope, and a capsized patch floats on its deck;
    - the reported damping equals the finite-difference derivative.
  - `BoardBody.test.ts` (11):
    - bare flotation at m/ρ, level;
    - a 20 kg payload floats deeper; a 75 kg rider sinks at rest;
    - towed at 6 m/s, pressure carries the 75 kg rider, but at 0.5 m/s the board sinks;
    - the 1 m drop and the steep-face slide close their energy ledgers;
    - drift with a current, handing the water its momentum;
    - it samples, then reacts, once per patch per step;
    - 1/60 and 1/120 s steps agree, and repeats are bit-identical;
    - it rests on dry ground, feels no water outside the domain, and takes a detached surfer's strike conserving momentum.
  - `SurfZoneRunner.test.ts` (+4): calm-water draft on all four spots; Beach waves move the board and it stays finite; reset from beyond the window; the snapshot pose.
  - Also: the worker and in-page snapshots stay bit-identical with the board, and so do the board mesh, adapter, shape-curve and `PhysicalMode` tests.
- **Measured** (`BoardBody`, analytic water):

  | Case | Result |
  |---|---|
  | Bare board at rest | Displaces 2.478 L (= m/ρ). Lowest point 11.5 mm under water, trim −0.75°. |
  | +20 kg over the centre | Displaces 22.0 L, draft 62 mm. |
  | +75 kg rider at 6 m/s (stance 0.64 m from the tail) | Trim 11.3°. Planing pressure carries 83 %, buoyancy 17 %. Drag 153 N. |
  | Same rider at 8 m/s | A slow 3 s pitch–heave cycle between 5° and 10° (porpoising-like; the same at 4 and 16 substeps). |
  | 31° face, rider, v₀ 4 m/s, drop 1 m | 0.93 of the frictionless speed. Energy ledger closed to 10⁻¹⁵. |
  | 1 m flat drop | Settles in about 2 s. Water entry absorbs 18.5 J of 25 J. Ledger closed to 10⁻¹⁴. |
  | Rolled 0.5 m drop in a current | 4, 8 and 16 substeps land within 7 mm of each other and 7 cm of 64 substeps (1.2 m apart before entry refinement). |

  Savitsky for this load predicts about 7° on a flat plate of the full 0.46 m beam. The wetted tail of the reference board averages about 0.35 m and carries 3.5 cm of rocker, which puts his prediction near 10°.
- **Cost:**
  - The board step takes 0.26–0.45 ms per 1/60 s on the physical water (bundled Node).
  - The whole worker step is 5.1–6.7 ms with or without the board, noisy at machine load 15. The browser readout shows 6.0–7.2 ms.
  - The 4 ms gate was already missed before the board (P4a).
- **Browser** (Beach, Hs 1.4 m, Tp 10 s, worker):
  - The board floats at its waterline in a foam patch, bobs ±0.2 m with the swell and surges with each wave.
  - With no fins, it slowly turns broadside.

## Deviations and open items

- **Beyond the plan:**
  - Slope buoyancy, capsized faces, water inertia, the spray-root pressure distribution, entry refinement and seabed contact. Each fixed a failure the plan's tests exposed:
    - no drive down a face;
    - ringing at 8 Hz and a sideways launch after a rail-first landing;
    - 60 % extra planing drag from a mis-placed centre of pressure;
    - radiation lifting a steady planing board (hence motion *into the surface*, not along the normal).
  - The planing test tows the board at a held speed, as a towing tank does. Settle tests bound the slow glide that a rockered hull's asymmetric landing leaves, under 1 % of the landing momentum, instead of requiring zero.
- **Still modelling choices:**
  - the radiation damping (ζ = 0.5);
  - the 1 cm wetting ramp;
  - the 1/√x distribution, whose centre of pressure (⅔) sits a little aft of Savitsky's high-speed 0.75;
  - the seabed normal, which stays vertical.
- **For later phases:**
  - Yaw is almost free until fins and rail grip (P4e).
  - The rigid payload's porpoising is left to the P4d rider's balance.
  - The window does not follow the board yet; the ride phase moves it.
- **From the surfer plan:**
  - `PhysicalBodyWaterField` still duplicates `PhysicalSurfWater` with other bounds.
  - `DetachedSurfer` still uses 1000 kg/m³.

  `SurfWaterBodyField` is ready to replace the duplicate. That change and the density fix touch the surfer's files, which are under active work.
- **Worker budget:** the step is now 6–7 ms against the 4 ms gate. The P4d rider's contacts and the surfer kernel need it profiled: water, sampling and constraints separately, as the surfer plan asks.
