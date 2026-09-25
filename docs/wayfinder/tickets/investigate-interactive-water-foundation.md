# Investigate the interactive-water foundation

Status: RESOLVED  
Type: wayfinder:grilling  
Blocked by: none

## Question

Which practical simulation architecture can represent the generated incoming wave inside an evolving interactive water field, expose the same authoritative state to rendering and board physics, produce physical wave-driven board travel with modest two-way hull coupling, remain deterministic, and preserve WebGL 2 browser support?

## Investigation

- Use the [Three.js WebGPU compute-water example](https://github.com/mrdoob/three.js/blob/master/examples/webgpu_compute_water.html) as a reference for height-field propagation and floating-object interaction, not as a complete surfing model.
- Prototype an incoming wave encoded in the simulation state from initialization; do not place a separate visual wave over unrelated water physics.
- Compare a CPU/reference path with optional WebGPU compute and verify whether the compute path's required behavior works on the WebGL 2 backend.
- Demonstrate one source of truth for visible water and board contact/forces; measure synchronization, deterministic replay, and performance.
- Confirm the proposed solver can provide meaningful local water motion so board travel can emerge from board-water forces after pop-up and paddle release.
- Record findings and the selected architecture in an ADR before implementation expands beyond the spike.

## Resolution

The MVP uses a deterministic CPU-authoritative shallow-water height/velocity grid, with the initialized incoming wave evolving in that state. Rendering and board physics sample the same field; board-water coupling and the timed pop-up are implemented as an initial pass. See [ADR 0002](../../adr/0002-interactive-water-field.md). Keep performance profiling, sustained wave-carry tuning, and browser acceptance validation on the active [roadmap](../../../ROADMAP.md). The linked Three.js compute-water example remains a reference, not a drop-in solver.

## Exit criteria

The selected architecture has deterministic tests, shared rendering/physics samples, and a reproducible incoming wave; full performance and browser/backend acceptance remain on the implementation roadmap. If validation invalidates the architecture, reopen this investigation rather than faking transport.
