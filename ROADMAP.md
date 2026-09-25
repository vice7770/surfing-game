# Surf Simulator Work Roadmap

This is the project’s working plan and priority tracker. Update it whenever a project task starts, changes scope, becomes blocked, or finishes; reopen this document in Codex at each task handoff so it stays easy to find.

Priority: **P0** = current critical path; **P1** = next; **P2** = later. Status values: `Backlog`, `Ready`, `In Progress`, `Blocked`, `Done`.

## Current milestone — physics-driven wave catch

### P0 · Research the interactive-water foundation — `Done`

- [x] Inspect/adapt the Three.js compute-water example as a prototype reference, not as a complete surfing model.
  - [x] Prototype an evolving height field that contains the generated incoming wave as part of its simulation state from the start.
  - [x] Establish one authoritative water state sampled by rendering and board physics.
  - [x] Select a deterministic CPU reference field and retain WebGL 2 for rendering; WebGPU compute remains a future option pending synchronized board sampling and compatibility tests.
  - [x] Verify deterministic fixed-step evolution, board sampling/synchronization, and bounded field values in automated tests; browser performance still needs manual review.
  - [x] Record selected architecture and limitations in [ADR 0002](docs/adr/0002-interactive-water-field.md).

### P0 · Couple the board to the simulated wave — `Done`

- [x] Derive local water motion from the evolving wave state; the incoming wave is part of the simulated field, not a visual overlay.
  - [x] Apply support/buoyancy and water-relative drag using samples from the shared water field.
  - [x] Make post-pop-up forward travel emerge from water-relative forces and timing—no scripted ride translation or animation.
  - [x] Add modest equal-and-opposite hull momentum feedback; defer detailed paddle/hand fluid interaction.
  - [x] Keep board support bounded with a penetration assertion.

### P0 · Make wave catching an explicit timed action — `Done`

- [x] Keep the run flow `ready → paddling → pop-up window → riding → terminal outcome`.
  - [x] Paddle builds entry speed; local wave/board behavior gates readiness.
  - [x] On-screen **Get Up** and Enter are enabled only when speed and local wave conditions are suitable.
  - [x] Ignore premature attempts; missed and wipeout outcomes are represented.
  - [x] Accepted input stands the rider; tests sustain water-driven travel with paddle released.
  - [x] Preserve Replay (same seed/settings) and New Wave (new seed).

### P0 · Verify the physics and gameplay together — `In Progress`

- [x] Add deterministic tests for water evolution, incoming-wave propagation, board/water coupling, and the pop-up transition.
  - [x] Confirm paddle input accelerates the board and on still water release permits drag to reduce paddle-generated speed.
  - [x] Confirm that after entering `riding`, no paddle input yields at least 3 seconds and >0.8 m forward travel through simulated water forces.
  - [x] Rendered surface and board-contact samples query the same field instance.
  - [x] Expose local water speed, board-relative speed, crest distance, and pop-up eligibility in the HUD.
  - [ ] Profile browser frame rate and obtain Astra validation; desktop and two mobile viewport visual/interaction checks have passed.

## After the MVP — GitHub publication

- [ ] After MVP validation, publish the project to the user's GitHub. The local repository currently has no remote; confirm the target repository name/owner and public/private visibility before creating or pushing. Keep the implementation uncommitted until the MVP is accepted.

## Next milestone — physics fidelity and learning tools

### P1 · Improve model fidelity and explain failures — `Backlog`

- [ ] Record attempt/catch failure reasons and relevant simulation measurements for later comparison.
- [ ] Investigate fuller two-way board-water coupling and more complete physical water/board forces.
- [ ] Calibrate qualitative model parameters against documented physical references when an appropriate data source is selected.

## Future scope

### P2 · Breaking-wave behavior — `Backlog`

- [ ] Investigate breaking, spilling/reforming waves, whitewater, and overturning/overhang representations.
- [ ] Decide whether a height-field model remains adequate or a different representation is needed.

### P2 · Board, rider, and environment fidelity — `Backlog`

- [ ] Higher-fidelity board geometry, fin effects, and rider mass/pose coupling.
- [ ] Environmental conditions such as wind and current; expand locations/surf conditions after core physics is useful.

### P2 · Water appearance and underwater view — `Backlog`

- [ ] Study reflection/refraction, caustics, surface disturbances, and underwater rendering techniques from the ThreeJS-water project; adapt only what fits an open-ocean surf scene.
- [ ] Add sun-position/sky-light controls and dynamic water reflections, using the Three.js ocean shader example as a visual reference; keep visual effects independent of and synchronized to the authoritative physics field.
- [ ] Add a below-surface view with underwater light/caustic patterns and depth/color attenuation; do not introduce a competing water simulation.

## Existing baseline — `Done`

- [x] Browser-based Three.js prototype with deterministic analytic wave, custom water mesh, floating board, paddle/steer controls, tuning, replay/new wave, and diagnostics.
- [x] Automated baseline tests and production build.
- [x] No commits created.

## Design references

- [Three.js WebGPU compute-water example](https://github.com/mrdoob/three.js/blob/master/examples/webgpu_compute_water.html): GPU-updated height field and floating-object response are useful concepts; this is not a surfboard hydrodynamics solution.
- [Three.js ocean shader example](https://threejs.org/examples/webgl_shaders_ocean): future reference for sun position, sky illumination, and reflective water appearance; not a source for wave or board physics.
- [ThreeJS-water (Martin Renou)](https://github.com/martinRenou/threejs-water): Three.js implementation of Evan Wallace's WebGL water demo; study its surface disturbances, reflection/refraction, and underwater caustics. Its pool-demo assumptions are references to evaluate, not a ready-made open-surf physics model.
- [ThreeJS-water live demo](https://martinrenou.github.io/threejs-water): visual reference for surface and underwater behavior.
- [Surfing-game video reference (embedded video only)](https://www.reddit.com/r/Unity3D/comments/1ro4tyq/new_surfing_game_made_in_unity/): use the video as a visual/gameplay reference for the intended surfing experience. Do not use the surrounding Reddit post, comments, or discussion as design or technical requirements. Unity-specific implementation details are not applicable; translate only relevant observed player-facing qualities to our browser/Three.js game.
- [Three.js WebGPURenderer guide](https://threejs.org/manual/pages/webgpurenderer): renderer backend/fallback guidance; the compute-water path still requires a compatibility and coupling prototype.

## Source documents

- [Requirements](docs/REQUIREMENTS.md) define target behavior and acceptance.
- [Technical plan](docs/PLAN.md) describes the architecture direction and implementation sequence.
- [Implementation tasks](docs/IMPLEMENTATION_TASKS.md) track delivered baseline and execution slices.
- [Wayfinder map](docs/wayfinder/MAP.md) records decisions and unresolved investigations.
- [Domain glossary](CONTEXT.md) and [ADRs](docs/adr/) record shared language and durable decisions.
