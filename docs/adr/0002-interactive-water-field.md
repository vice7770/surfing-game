# ADR 0002: CPU-authoritative interactive water field

- Status: Accepted for bulk water; detached-lip extension in [ADR 0003](0003-plunging-sheet-collision.md)
- Date: 2026-09-25

## Context

The analytic baseline could display a wave but had no evolving water state to transfer momentum to the board. The MVP requires the incoming wave to exist in the water simulation from initialization, with rendering and board contact sampling the same state. The Three.js WebGPU compute-water example is a useful finite-difference and water/object-interaction reference, but its GPU state is not directly available to the CPU-side board solver and it is not a surfboard hydrodynamics model.

## Decision

Use a deterministic CPU shallow-water height/velocity field on a regular grid as the MVP's single authoritative water state. Seeded wave shape initializes a right-traveling elevation and flow packet. A fixed 1/60-second simulation step evolves the height and horizontal flow. The water mesh samples the resulting heights; board support, drag, surface velocity, pop-up readiness, and hull reaction sample that same field. Board movement after the pop-up is produced by fluid-relative forces and paddle thrust—not a scripted ride translation.

The renderer remains Three.js WebGL2. Do not introduce a separate WebGPU field until a prototype demonstrates reliable synchronized sampling with board physics and an acceptable compatibility story.

## Rationale and limitations

- CPU ownership makes deterministic replay and synchronous water/board sampling straightforward.
- The current 97 × 161, 0.5 m field is small enough for the browser MVP and deterministic tests.
- A finite-difference shallow-water approximation is qualitative, non-breaking, and not calibrated CFD. It cannot model overturning water, whitewater, or overhangs.
- Hull feedback is intentionally modest; hand/paddle coupling and high-fidelity board hydrodynamics are future work.
- Rendering reflections and sun-position lighting (see the Three.js ocean shader reference in the roadmap) are visual tasks and must not become a second water simulation authority.

## Validation required

Keep tests for deterministic fixed-step evolution, wave propagation, bounded values, same-state rendering/physics sampling, board support, explicit pop-up timing, and forward travel after paddle release. Browser performance and WebGL2 behavior must be checked in the target environment before treating the model as production-ready. Revisit CPU/GPU ownership if the field resolution or performance needs materially increase.

## Initial performance observation

A local Node microbenchmark advanced the coupled board/water simulation by 600 fixed steps (10 simulated seconds) in about 190 ms, approximately 53× faster than real time in that run. A separate sampling-only sweep of 120 water-mesh updates over 97 × 161 vertices (height and slope queries) took about 151 ms total, or 1.26 ms per update. These are machine- and runtime-dependent CPU observations; they exclude Three.js normal recomputation, browser rendering, and GPU work, so they do not replace browser frame-rate profiling.
