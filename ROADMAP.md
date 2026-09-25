# Surf Simulator Work Roadmap

This is the project’s working plan and priority tracker. Update it whenever a project task starts, changes scope, becomes blocked, or finishes; reopen this document in Codex at each task handoff so it stays easy to find.

Priority: **P0** = current critical path; **P1** = next; **P2** = later. Status values: `Backlog`, `Ready`, `In Progress`, `Blocked`, `Done`.

## Next milestone — physical wave formation — `In Progress`

Follows [the wave formation plan](docs/research/wave-formation-plan.md) and [ADR 0004](docs/adr/0004-dispersive-surf-zone-solver.md).

### P0 · GPU displacement from the shared field (G1) — `Done`

- [x] Upload per-node height and foam as a float texture; the vertex shader displaces, shades, and colors the surface with the field's own bilinear lookup. `WaterSurface.update()` fell from 3.36 ms to 1.07 ms per frame (merged in PR #1).

### P0 · SI wave foundation (P1) — `Done`

- [x] Airy dispersion with the explicit Guo wavenumber; seeded JONSWAP sea state with cos-2s spreading, linear elevation and depth-averaged flow, and a set predictor verified against the Munk beat period.
- [x] Froude-consistent time-scale (0.4–1.0) in the Wave Lab; physics readout comparing Airy speed with the legacy simulation speed.
- [ ] g = 9.81 in the solver, removal of the Wave speed slider, and the `legacy` flag move to P2 with the new solver, which keeps the legacy wave playable until the P4 board retune.

### P1 · Spots, sliding window and finite-volume solver (P2) — `Done (view only)`

- [x] P2a: composable seabeds for Beach (Dean profile with seeded sandbar and rips), Point (31° headland contours), Reef (0.15 shelf-edge slope), and Canyon. A well-balanced, positivity-preserving finite-volume shallow-water solver with wet/dry cells, Manning friction, and relaxation zones. Validated against lake at rest, conservation, the Stoker dam break, √(gh) speed, relaxation reflection (0.27 %), Green's law, Snell's law and beach run-up.
- [x] P2b-1: in-place typed-array sweeps (7.9 → 6.3 ms per step for 33.6k cells in bundled Node); open along-shore boundaries; a stretched cross-shore grid (4 m to 1 m, reflection under 5 %); an along-shore sliding window that keeps a lake at rest across the headland.
- [x] P2b-2: fused MUSCL-Hancock stepping, 4.05 ms per step on the 36.2k-cell stretched spot domain (budget 4 ms), with validation unchanged or better. A seeded sea-state relaxation boundary: precomputed row and column phases, correct after window shifts, and 0.95 of the linear Hs generated in a flat channel. A column WKB warm start (exact on a flat bed, Green's-law shoaling, γh cap; spin-up peak 1.12× the initial one). Set-run timing.
- [x] P2c (option a, view only): a Water model switch in the Wave Lab (or `?physical`) shows the stage 1 surf zone for Beach, Point, Reef or Canyon with buoy-style inputs. It has a spot seabed, overview, profile and underwater spectator views, and a live solver and next-set readout; the legacy wave stays playable. The in-browser solver runs at 5.7–7.6 ms per step on the main thread, so the Web Worker and bicubic sampling move to P4 with board coupling.
### P1 · Far-field ocean (G2) — `Done`

- [x] The physical sea continues to the horizon from the tank's own components. It is exact at the tank's offshore boundary, Airy-deepening offshore, and shoaled with a breaking-foam proxy beside the window, with Gerstner crests and a sky fade. Shading-only wind chop is on both water meshes.
### P1 · Emergent breaking and Iribarren lip (P3) — `Done`

- [x] P3a: the physical waves break by themselves (Kennedy test plus a stage 1 bore criterion). Whitewater follows breaking, and the Wave Lab shows breaker type, breaking share, measured peel angle with its Hutt skill rating or a close-out explanation, and local wind (chop and onset shift). The surf zone needs cells of 1 m or finer.
- [x] P3b: storm mode derives the swell from wind, fetch, duration and distance (JONSWAP with a PM cap, CEM duration limit, dispersion and angular spreading). Wind's shift of breaking onset is sourced and scaled by the breaker celerity. Plunging breakers (0.4 ≤ ξ_b ≤ 2) throw a mass-conserving lip, once per wave per column. `npm run report:rideability` writes the per-spot [rideability report](docs/research/rideability-report.md). Ride-time distributions wait for the P4 rider.
### P2 · Shading, foam, board consequences (G3, G4, P4) — `In Progress`

- [x] G3: physically based water shading on both water meshes: Fresnel (n = 1.333), per-spot turbidity and bed albedo, shallow-water reflectance from the seabed under every node (sandbars and the reef shelf read turquoise from above, channels blue), and sunlight through thin crests marched toward the sun. Stage 1's broad crests glow only at their tops; P5's peaked crests and the rendered lip will show more. [Record](docs/superpowers/plans/2026-09-25-g3-water-shading.md).
- [x] G4: foam carried by the solver's currents in the physical mode: dense whitewater from bore dissipation and lip splashes decays into a lace that lasts longest on the Beach, drawn as a patchy lace network that drifts with the flow, with bubbles under the bores. The legacy wave keeps its soft foam tint. [Record](docs/superpowers/plans/2026-09-25-g4-advected-foam.md).
- [ ] P4: the board on physical waves, delivered in the sub-phases of the board and surfer physics plan (branch `codex/board-surfer-physics-proposal`, B0–B4):
  - [x] P4a: the physical surf zone runs in a Web Worker behind a snapshot host; the main thread spends 0.10 ms per physical frame (10.8 ms before) and a spot's spin-up no longer freezes the page. The worker step is 5.8 ms against the 4 ms gate, a risk for the board phases. [Record](docs/superpowers/plans/2026-09-25-p4a-surf-zone-worker.md).
  - [x] P4b: one `SurfWater` sampling seam for bodies over legacy and physical water: Catmull-Rom surface agreeing with the rendered vertices, flow at body depth by the §1.10 profile (flagged in bores), explicit dry and outside-domain samples, momentum-conserving reactions. The legacy board and rider fall sample only through it, with golden replays unchanged bit for bit; the reference shortboard and rider are recorded and the [legacy board baseline](docs/research/board-baseline.md) is generated. [Record](docs/superpowers/plans/2026-09-25-p4b-surf-water-seam.md).
  - [x] P4c: a rigid reference shortboard (25.75 L, 2.54 kg, its own inertia) floats, drops and planes on sampled water. The forces are:
    - buoyancy along the surface slope;
    - Savitsky-calibrated planing pressure concentrated behind the spray root;
    - ITTC friction;
    - added mass, water entry and radiation;
    - seabed contact.

    Energy ledgers close. It rides the physical surf zone riderless in the worker, drawn from the same hull curves, and it is the detached surfer's contact body. A towed 75 kg rider planes at 6 m/s but sinks at rest. The worker step is now 6–7 ms against the 4 ms gate. [Record](docs/superpowers/plans/2026-09-25-p4c-board-body.md).
  - [x] P4d: a separate 73 kg rider rides the board through checked contacts: it pushes only along a line through its centre of mass that meets the feet, within friction and a load cap, and it holds on while lying down. It floats and paddles prone at about 1.6 m/s, pops up in 1.2 s when the board planes (and lies back down when it does not), and shifts weight onto a rail to steer. A failed contact separates it into the detached surfer with continuous momentum. The physical mode is now ridden: Space paddles, Enter pops up, the arrows steer and R relaunches; a ride camera follows. Catching a physical wave is not yet possible (P4f), and without fins the board wanders and spins out (P4e). [Record](docs/superpowers/plans/2026-09-25-p4d-rider.md).
  - [ ] P4e–P4f: fins, rails and breaking; catch calibration, practice and natural modes.
  - [ ] Play the surfer, not the board (user request, 2026-09-26): after a fall the camera and controls follow the swimmer; the player swims with the paddle and steer keys and chooses whether to swim back and remount a reachable board or retry (the surfer plan's S3 gate, building on `main`'s `DetachedSurfer` strokes and `BoardRecovery`). The camera already follows the body once it is in the water.
### P2 · Boussinesq objective (P5) and WebGPU tier (P6) — `Backlog`

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
