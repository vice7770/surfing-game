# Surf Simulator Work Roadmap

This is the project’s working plan and priority tracker. Update it whenever a project task starts, changes scope, becomes blocked, or finishes; reopen this document in Codex at each task handoff so it stays easy to find.

Priority: **P0** = current critical path; **P1** = next; **P2** = later. Status values: `Backlog`, `Ready`, `In Progress`, `Blocked`, `Done`.

## Current milestone — sustained wave and physical wipeout — `Done for prototype`

- [x] Replace the playable 20 m finish with an open ended ride while retaining the earlier finite-wave path for regression tests.
- [x] Move the shared water grid forward with its swell and replenish the same simulated crest as it propagates; keep the board driven only by sampled water forces.
- [x] Detach the surfer at wipeout and integrate gravity, water-relative drag, buoyancy, and surface contact while the wave and board continue.
- [x] Validate a 140 m default clean ride, 60 m rides on both alternate spots and three more seeds, a 40 m plus carved demo, reset, wipeout immersion, and moving water/scenery in the desktop browser. The browser remained at about 120 FPS in the observed runs.

## Current milestone — physics-driven wave catch

### P0 · Research the interactive-water foundation — `Done`

- [x] Inspect/adapt the Three.js compute-water example as a prototype reference, not as a complete surfing model.
  - [x] Prototype an evolving height field that contains the generated incoming wave as part of its simulation state from the start.
  - [x] Establish one authoritative water state sampled by rendering and board physics.
  - [x] Select a deterministic CPU reference field and retain WebGL 2 for rendering; WebGPU compute remains a future option pending synchronized board sampling and compatibility tests.
  - [x] Verify deterministic fixed-step evolution, board sampling/synchronization, and bounded field values in automated tests; profile browser performance locally.
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

### P0 · Verify the physics and gameplay together — `Done`

- [x] Add deterministic tests for water evolution, incoming-wave propagation, board/water coupling, and the pop-up transition.
  - [x] Confirm paddle input accelerates the board and on still water release permits drag to reduce paddle-generated speed.
  - [x] Confirm that after entering `riding`, no paddle input yields at least 3 seconds and >0.8 m forward travel through simulated water forces.
  - [x] Rendered surface and board-contact samples query the same field instance.
  - [x] Expose local water speed, board-relative speed, crest distance, and pop-up eligibility in the HUD.
  - [x] Profile browser frame rate: the current Codex in-app browser reports about 115–120 FPS during desktop play and 120 FPS in the checked mobile view on this machine. This is a local observation, not a device-wide guarantee.
  - [x] Review desktop and narrow mobile play, Replay, New Wave, profile view, and tuning controls in the browser; no browser console errors observed.
  - [x] Center the mobile follow camera and provide hold-to-paddle and steer touch buttons alongside the existing Get Up action.
  - [x] Obtain an independent agent audit of the physics and presentation changes; resolve all four concrete findings from the audit.

## Current extension — advanced playable ride and peeling break

### P0 · Make the ride physically sustained and steerable — `Done`

- [x] Project four board-contact water pressures along local surface normals and use direction-dependent water drag; no scripted ride translation.
- [x] Catch on the approaching face. With paddle released, a default no-steer ride reaches 20 m on seeds 1–12 in automated simulation.
- [x] Make rail/fin side force turn the board path, not only its heading. Steering can carve across the face or destabilize the board.
- [x] Check extreme settings with deterministic runs and expose specific terminal failure reasons; continue subjective steering feel tuning with player feedback.

### P0 · Add a shared-field peeling break and readable maneuvers — `Done`

- [x] Advance a deterministic peel front along the crest. Break strength follows local slope and crest proximity, dissipates coherent water motion, and raises board instability.
- [x] Render a synchronized foam lip and board wake/spray from the same water field; expose break, balance, FLOW, and physics-detected CARVE/SNAP feedback.
- [x] Refine the foam/lip appearance and verify synchronized rendering, maneuver diagnostics, and frame rate in desktop and mobile browser runs. A full overturning barrel remains outside the shared height-field representation.

### P1 · Finish the playable prototype presentation — `Done`

- [x] Add a coastline, sunset light, and a one-time captured sky/coastline environment map for restrained water reflections while preserving one physics authority. Narrow mobile view uses centered ride framing.

## Repository state

- [x] The analytic baseline is `1fe7ecc`; the playable prototype and physics increments are committed on local `main`. `origin/main` is still at the baseline.

## Next milestone — physics fidelity and learning tools

### P1 · Depth-varying surf shelf — `Done for prototype`

- [x] Add a gentle, configurable seabed shelf to the shared field and evolve elevation through depth-weighted horizontal fluxes.
- [x] Show the same shelf in the underwater seabed view and expose it as a Wave Lab condition.
- [x] Check still-water balance, wave slowdown over the shelf, bounded energy, the steepest setting, and catch/playability across surf spots. Breaking onset remains an authored peel.

### P1 · Couple spilling strength to local depth — `Done for prototype`

- [x] Let the existing local-slope break respond more strongly in shallower water while retaining the deterministic lateral peel.
- [x] Verify that the effect comes from the shared field, remains bounded, and preserves catch/playability and browser performance. Windy Reef still completes in the local browser at 120 FPS.

### P1 · Account for breaker energy loss — `Done for prototype`

- [x] Express the break's horizontal-flow energy loss in the same relative units as total field energy.
- [x] Verify nonnegative, cumulative loss and reset behavior without changing wave or board trajectories; compare the same seeded field with and without breaker damping.

### P1 · Improve model fidelity and explain failures — `Done for prototype`

- [x] Record terminal catch/ride outcomes, failure reasons, settings, timing, and peak measurements in a bounded local run history visible in the Wave Lab.
- [x] Investigate fuller two-way coupling and force directions in [the calibration note](docs/research/surf-physics-calibration.md); feed contact pressure and vertical hull displacement back into the water, use water-relative planing/fin forces, and track wave energy. Coefficients remain tuned for play.
- [x] Check qualitative relationships from [the calibration note](docs/research/surf-physics-calibration.md): a faster configured wave propagates farther, breaking removes field energy, and board turning weakens out of water. Maintain gameplay-tuned coefficients; no comparable measured board and wave dataset is available for quantitative calibration.

## Future scope

### P1 · Upgrade the surfer and board models — `Done for prototype`

- [x] Replace the stick-like rider with two-segment arms and legs, visible hands and feet, a shaped wetsuit torso/pelvis, neck, face, hair, and a readable head silhouette.
- [x] Blend prone paddling into a bent-knee standing stance, animate alternating paddle strokes, preserve physics-driven lean, and move the rider into a fall pose on wipeout.
- [x] Refine the shortboard outline, colored deck/rails/nose, traction pad, deck stripes, and swept fins. Bring chase/profile cameras closer so the model is readable; verify desktop and narrow browser presentation at local 120 FPS.

### P2 · Breaking-wave behavior — `Done for this height-field prototype`

- [x] Investigate breaking, spilling/reforming waves, whitewater, and overturning/overhang representations in [the decision note](docs/research/breaking-wave-representations.md).
- [x] Keep the height field as bulk-water authority; add a bounded curling lip, decaying whitewater, and pooled spray. The lip now has a separate 3D parcel/collision authority described in [ADR 0003](docs/adr/0003-plunging-sheet-collision.md).

### P2 · Board, rider, and environment fidelity — `Done for prototype`

- [x] Add tapered shortboard geometry with rocker and fins, water-relative fin grip, and rider lean that affects board roll. These are lightweight gameplay approximations.
- [x] Feed cross-current and wind into the shared water field; add Training Beach, Glassy Point, and Windy Reef condition presets with distinct coastline palettes and tested catch paths.

### P2 · Water appearance and underwater view — `Done for prototype`

- [x] Compare reflection/refraction, caustic, and underwater approaches in [the water appearance decision note](docs/research/water-appearance.md); retain the deformed shared-field surface instead of a flat-water add-on.
- [x] Add sun height and direction controls, sky color changes, a recaptured sky/coast environment map, and moving field-derived surface normals for view-dependent reflections. A live planar rider mirror and physical refraction remain outside this prototype.
- [x] Add a below-surface camera mode, wave-height-based waterline detection, blue-green distance fog, and decorative seabed caustic bands tied to the shared wave. The bands are a visual approximation, not refracted light transport.

### Further work after this prototype — `Ready`

- [ ] Gather comparable measured board/fin and wave data if quantitative hydrodynamic validation becomes a goal.
- [x] Prototype a separate 3D plunging-water and collision authority, rendered from the same evolving parcels that contact the rider/board. Keep the height field as bulk-water authority and document the hybrid limit in [ADR 0003](docs/adr/0003-plunging-sheet-collision.md).
- [ ] Decide whether a full interactive barrel needs volumetric water and air flow beyond this bounded sheet.
- [ ] Evaluate a low-resolution live scene reflection pass and physical-looking refraction only if playtesting shows a clear visual benefit and frame-time headroom.

## Existing baseline — `Done`

- [x] Browser-based Three.js prototype with deterministic analytic wave, custom water mesh, floating board, paddle/steer controls, tuning, replay/new wave, and diagnostics.
- [x] Automated baseline tests and production build.
- [x] The analytic baseline and playable prototype are recorded in separate local commits.

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
