# Surfing Simulator MVP Plan

## Current baseline and next physics milestone

The repository began with a playable analytic traveling-wave baseline. The current milestone replaces it with an evolving shared water field and a player-timed pop-up; implementation and validation status are tracked in [ROADMAP.md](../ROADMAP.md).

## Technical direction (ADR 0002 selected MVP architecture)

- **Runtime:** Vite + TypeScript + Three.js, as a static single-page app. No backend or physics dependency.
- **Interactive water:** a deterministic CPU shallow-water height/velocity field contains and evolves the incoming wave. See [ADR 0002](adr/0002-interactive-water-field.md). Treat the Three.js compute-water example as a reference for finite differences and water/object interaction, not a drop-in surf model.
- **Shared authority:** rendering and board forces sample one authoritative CPU field at fixed 1/60-second steps. Keep Three.js WebGL 2 as the rendering baseline; revisit WebGPU only if synchronized board sampling and browser compatibility are demonstrated.
- **Incoming wave:** generate repeatable wave conditions/seed, then represent the actual incoming wave within the evolving field rather than as a visual-only overlay.
- **Board coupling:** sample water height, slope, and local motion at board contacts; derive board support and forward force from these values. Apply a modest hull wake/disturbance back into the field. Never add a scripted ride-translation force.
- **Spawn:** place the board ahead of the incoming wave with a useful paddle window; tune spawn once wave propagation is simulated in the field.
- **Rendering:** render the authoritative evolving field as a custom water mesh; preserve lit material, visible crest/cue, horizon, and restrained foam.
- **Physics:** custom small rigid-body approximation with four board sample points. Integrate in a fixed 1/60 s loop. Apply gravity, support/buoyancy, drag relative to local water motion, wave-driven forces, paddle thrust before pop-up, steering torque, and damped alignment. Feed a modest hull wake/disturbance back into water. Clamp forces/velocities and guard against non-finite values.
- **Pop-up:** paddle to build speed; expose Get Up through a button and Enter only when speed and local wave conditions permit. Early attempts do nothing. The cue should come mainly from visible wave/board behavior, not a persistent HUD tutorial.
- **Determinism:** seeded PRNG only for generated wave variation. Run state and tuning snapshot are immutable per attempt. Replay resets all time/state/PRNG inputs. New Wave changes seed; it does not silently overwrite explicit slider values.
- **Visual style:** polished but intentionally stylized surf demo, with a third-person chase camera, visible crest and board, cyan/teal palette, foam accents, and a diagnostic profile mode.
- **Future water rendering:** study reflection/refraction, caustics, disturbances, and underwater appearance from [ThreeJS-water](https://github.com/martinRenou/threejs-water), plus sun/sky controls from the [Three.js ocean shader](https://threejs.org/examples/webgl_shaders_ocean). Adapt pool-demo assumptions carefully for open surf; visual effects must follow the authoritative surface without creating a second water-simulation state.

## Module boundaries

```text
src/
  main.ts                 # boot, renderer, scene, resize, animation loop
  game/Controls.ts        # keyboard and touch input normalization
  wave/WaveModel.ts       # seeded interactive water field and shared sampling
  physics/BoardPhysics.ts # fixed-step board/rider integration and forces
  scene/WaterSurface.ts   # mesh deformation, foam lip, water material
  scene/BoardWake.ts      # visual trail and spray from physical board motion
  scene/Environment.ts    # static sky, sun, and coastline
  scene/Surfer.ts         # board and simple rider meshes
  scene/CameraRig.ts      # third-person follow and profile camera
  ui/Hud.ts               # seed, state, outcome, speed, diagnostics
  style.css               # responsive layout, HUD, focus states
index.html
```

Keep simulation state independently testable and expose the same authoritative water samples to both rendering and board physics. Do not add workers or generalized engine abstractions until the research spike demonstrates a need.

## Work sequence

1. [Done] Prototype and document the selected water-state architecture.
2. [Done] Render the evolving field and couple board contacts/modest hull reaction to the shared state.
3. [Done] Add explicit Get Up timing, visible readiness cue, and miss/wipeout/complete outcomes.
4. [Done] Verify paddle release, three-second wave-driven forward carry, replay determinism, diagnostics, bounded support, and finite field values.
5. [Done] Browser frame-rate and interaction checks pass locally at desktop and narrow mobile sizes; a separate agent audited the code and rechecked resolved findings.
6. [Done] Extend the prototype with contact-normal pressure, rail-driven carving, a deterministic peeling break, readable wake/foam, and maneuver/balance feedback. Verify 20 m paddle-free rides and failure paths across seeds and tuning settings.
7. [Done] Add restrained coastline, sunset, and sky/coastline reflections. Keep the moving surface synchronized to the authoritative water field.
8. [Done] Add run history, stronger board/water coupling, breaking spray, tapered board/rider details, environmental presets, sun controls, and underwater inspection. See the decision notes under `docs/research/` for physical and visual limits.

The analytic baseline is committed as `1fe7ecc` and the playable prototype as `52ede4e` on local `main`. The surf-shelf work is a separate physics change. The GitHub remote still points to the baseline.

## Risks and boundaries

- A height field can depict a peeling, dissipating break but cannot represent an overturning/overhanging barrel. Defer full barrel geometry and reforming whitewater; realism claims remain qualitative until measured calibration is planned.
- A future GPU water state could be difficult to sample synchronously from CPU board physics. Any WebGPU exploration must prove synchronization and avoid rendering a field that differs from the physics field.
- WebGPU compute may constrain browser support. WebGL 2 remains the baseline; do not assume renderer fallback proves compute-example compatibility.
- Recomputing mesh normals and vertices can be expensive. Keep the mesh bounded around the camera/board, choose moderate subdivisions, and profile before increasing resolution.
- Board contact integrated in world Y only can appear slippery on steep faces. Preserve bounded normal-alignment torque and test the diagnostic slope view before adding complex angular dynamics.
- Material reflections should not take priority over correct geometry/physics coupling.

## Technical references

- [Three.js WebGPU compute-water example](https://github.com/mrdoob/three.js/blob/master/examples/webgpu_compute_water.html)
- [Three.js WebGPURenderer guide](https://threejs.org/manual/pages/webgpurenderer)
- [Three.js Water addon](https://threejs.org/docs/pages/Water.html)
- [Three.js ocean shader example](https://threejs.org/examples/webgl_shaders_ocean): future visual reference for sun position, sky lighting, and water reflections; do not conflate with the simulated water state.
- [ThreeJS-water by Martin Renou](https://github.com/martinRenou/threejs-water): future study source for disturbances, reflection/refraction, and underwater caustics (a WebGL port of Evan Wallace's pool-water demo, not an open-ocean surfing solver).
- [Surfing-game video reference (embedded video only)](https://www.reddit.com/r/Unity3D/comments/1ro4tyq/new_surfing_game_made_in_unity/): visual/gameplay inspiration for the target surfing experience. Review only the embedded video; exclude the Reddit post text, comments, and discussion from the source material. Do not copy Unity-specific implementation assumptions; adapt relevant player-facing observations to this browser-based Three.js project.
- [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html)
- [Three.js custom BufferGeometry manual](https://threejs.org/manual/pages/custom-buffergeometry.html)
