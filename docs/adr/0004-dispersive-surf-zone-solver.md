# ADR 0004: SI-consistent dispersive surf-zone solver on 2D bathymetry

- Status: **Accepted for stage 2 physics (P5, 2026-09-26); performance gate open.** Dispersion, shoaling, refraction, group, solitary-wave, breaker-depth and Miche tests pass on the CPU reference. The CPU step (12–15 ms) misses the 4 ms budget, and the fallback is the user's decision. The Celeris benchmark comparison was replaced by analytic benchmarks. Earlier status: **Proposed (draft).** It will supersede the bulk-water parts of [ADR 0002](0002-interactive-water-field.md) once phase P2 of the [wave formation plan](../research/wave-formation-plan.md) passes validation. [ADR 0003](0003-plunging-sheet-collision.md) remains valid, amended by the mass-exchange and Iribarren-spawn rules below.
- Date: 2026-09-25

## Context

`InteractiveWaterField` is a linearized, non-dispersive shallow-water grid. Its water gravity is rescaled so that a slider-chosen speed holds (`g_eff = speed² / depth`, 2.25 m/s² at the defaults), while the board uses 9.81 m/s². Wave period only sets a Gaussian packet width. Depth varies only toward shore, and breaking follows a scripted peel front. This design cannot produce the behaviour the project's physics sources describe: dispersion (`ω² = gk tanh kh`), wave groups and sets, refraction over a reef or canyon, depth-limited breaking at `h_b ≈ 1.28 H_b`, or an emergent peel. The product direction is now "the most realistic waves the engine can afford", with fully emergent breaking and no rideability safety net.

## Decision

1. **Units.** Water, board, rider, lip and spray all use g = 9.81 m/s². The wave-speed control and `effectiveGravity` are removed. Slow motion is a uniform time-scale on simulated time.
2. **Sea state.** The incoming swell is a seeded JONSWAP sea with cos-2s directional spreading, discretized into 24 (CPU) or 64 (WebGPU) components. The seed selects phases, frequency jitter and directions. Components obey the linear dispersion relation (Guo 2002 explicit form).
3. **Domain.** A window slides along shore over a fixed, composable 2D bathymetry and spans from an offshore relaxation zone to the shoreline. The cross-shore grid is stretched: 1 m cells in the surf zone, up to 4 m offshore. Along-shore cells are 1 m on CPU and 0.5 m on WebGPU. The grid is fixed per run.
4. **Boundaries.** The offshore relaxation zone blends the state toward the analytic incoming field. It generates the swell, absorbs reflected waves, and doubles as the rendering seam to the analytic far field. Along-shore edges relax toward the linear analytic field.
5. **Solver.** Stage 1 is a well-balanced, positivity-preserving finite-volume nonlinear shallow-water solver with wet/dry cells. **Stage 2 (the objective)** adds the Madsen–Sørensen (B = 1/15) dispersive terms. Stage 2 uses Kennedy et al. (2000) eddy-viscosity breaking, keyed on ∂η/∂t with a per-spot onset threshold, and switches to shallow water where H/h > 0.8 (Tonelli & Petti 2009). Stage 1 computes the same Kennedy breaking flag for lip, foam, board and readouts.
6. **Breaking consequences.** No peel front is scheduled. Breaker type comes from the local Iribarren number. `PlungingSheet` spawns only on plunging breakers and exchanges volume and momentum with the field. Peel angle is measured and explained in readouts.
7. **Authority and platforms.** The CPU solver is the deterministic reference and runs, with the board, in a Web Worker. A WebGPU tier may own the field on the GPU. Board physics then reads a small patch back asynchronously, one frame old with forward correction, and rendering reads the same buffers. There is still one water state per tier.
8. **Reference implementation.** Celeris-WebGPU (MIT) is the reference for fluxes, tridiagonal solves and breaking. Ported code keeps its notice and attribution.

## Consequences

- Wave speed, wavelength, breaking position, peel and set timing become outputs, which can be tested against Airy dispersion, shoaling, Snell refraction, breaker indices, Miche's limit and beat periods.
- Some waves will close out. Guaranteed-ride tests are replaced by physics validation tests plus a per-spot rideability report.
- Board tuning changes: real wave speeds (about 4–6 m/s at breaking) require real paddle values and a velocity profile at hull depth.
- Cost rises from about 0.5–0.8 ms per step (15.6k cells) to an estimated 2–4 ms (stage 1) and 5–8 ms (stage 2) for about 34k CPU cells. A performance gate at stage 2 decides the CPU-tier fallback.
- The current field stays behind a `legacy` flag until validation passes, then is removed.

## Limits

- The model is depth-averaged. The vertical velocity profile uses linear theory, overturning water is the bounded parcel sheet from ADR 0003, and in the physical mode a mass-conserving lip whose four parcels per metre-wide throw coarsely sample the jet. There is no air entrainment or full tube flow.
- The along-shore edges and the offshore far field are linear approximations. They must stay at least one wavelength from the rider.
- The wind's shift of breaking onset is sourced (Douglass 1990; King & Baker 1996; Feddersen et al. 2023). The stage 2 crest wind-stress term stays qualitative.

## Validation

See [the plan's validation suite](../research/wave-formation-plan.md#42-validation-suite-replaces-guaranteed-ride-tests-q13). This ADR moves from Proposed to Accepted when phase P2 passes. The stage 2 parts are accepted after P5 passes its dispersion and breaking-depth tests and its performance gate is decided.
