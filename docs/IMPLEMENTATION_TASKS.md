# Baseline Delivery and Prototype Implementation Tasks

The first checklist records the delivered analytic-wave baseline. The following sections track the newer shared-field catch and advanced ride. Follow [ROADMAP.md](../ROADMAP.md), [REQUIREMENTS.md](REQUIREMENTS.md), and [PLAN.md](PLAN.md). The playable prototype is committed locally as `52ede4e`.

1. [x] **Scaffold app:** add package scripts/dependencies for Vite, TypeScript, and Three.js; create the HTML entrypoint, responsive canvas, HUD, and minimal start state.
2. [x] **Wave model:** implement deterministic seeded wave parameters and pure height/normal/surface-velocity sampling. Add tests covering repeatability and finite values.
3. [x] **Water scene:** deform custom indexed geometry from the same sampler; add crest indication, foam cue, lighting, follow camera, and diagnostic profile view.
4. [x] **Board simulation:** implement fixed-step board state and four-point buoyancy/contact support, wave-relative drag, planing lift, steering/attitude response, and paddle force. Expose diagnostics in the HUD.
5. [x] **Run flow:** add ready/paddling/riding/missed/wipeout/complete states and thresholds from requirements; freeze terminal state and show outcome controls.
6. [x] **Replay and generation:** snapshot effective parameters and seed, reset all state for replay, and use a distinct deterministic seed for New Wave.
7. [x] **Tuning and polish:** implement all five sliders and values/ranges/defaults, pending settings/Apply & Replay, keyboard focus behavior, viewport resize, button actions, responsive styling, accessibility details, and concise inline instructions.
8. [x] **Validate baseline:** run typecheck/build and manual acceptance checks from the requirements. The baseline was later committed as `1fe7ecc`.

## Current physics-driven catch milestone

1. [x] **Interactive-water research decision:** selected a deterministic CPU field and documented tradeoffs in [ADR 0002](adr/0002-interactive-water-field.md); GPU compute remains deferred until sampling/sync and compatibility are proven.
2. [x] **Water-field foundation:** initialized traveling wave is part of evolving state; render and board sample the same field; deterministic bounded evolution and reset are tested.
3. [x] **Physical board coupling:** board uses water-relative forces and bounded equal-and-opposite hull reaction; tests cover stable contacts and sustained paddle-free carry. Higher-fidelity coupling/calibration remain future work.
4. [x] **Timed pop-up flow:** Get Up button + Enter, local eligibility, early input ignored, rider standing transition, and missed/wipeout/complete outcomes are implemented and covered by simulation tests.
5. [x] **Physics validation:** automated tests prove the three-second carry and a 20 m paddle-free ride across twelve seeds, plus drag, field evolution, replay determinism, hull reaction, and bounded support. Desktop and narrow mobile browser checks cover ride, carving, profile, replay, New Wave, and local frame rate.
6. [x] **Independent validation:** a separate agent audited the extension and rechecked the fixes for solver ordering, maneuver detection, peel-front claims, and setting outcomes.

## Advanced playable prototype extension

1. [x] **Contact and carving forces:** project board-contact pressure along water normals; add direction-dependent drag and rail/fin side force.
2. [x] **Peeling break:** advance a deterministic front across the shared water field; local crest position and slope determine breaking strength, which dissipates wave motion and feeds board stability and rendering.
3. [x] **Ride feedback:** add synchronized foam lip, wake/spray, balance/FLOW, and physics-detected maneuver callouts.
4. [x] **Playtest and tune:** verify maneuvers, break risk, 20 m rides, and browser interaction at multiple settings; refine visuals and performance. Direct touch hardware playtesting remains useful follow-up.
5. [x] **Setting polish:** add coastline, sunset, and a static sky/coastline reflection map. Center the mobile follow camera and add touch paddle/steer controls.

## Physics and appearance extension

1. [x] **Learn from runs:** persist a bounded local history of outcomes, failure reasons, settings, and peak measurements, excluding automatic demo runs.
2. [x] **Calibrate relationships:** document primary-source limits, feed vertical hull pressure into the water, use relative-water planing and fin forces, and test propagation, energy loss, and reduced out-of-water grip.
3. [x] **Render the break:** expand the visual lip, retain decaying whitewater on the surface, and pool soft spray particles from the shared breaking field.
4. [x] **Improve board and rider:** build tapered board geometry with rocker, colored rails/deck, traction pad and swept fins; replace the stick rider with articulated arms/legs, shaped torso/head, paddle and standing poses, and physics-driven lean/fall behavior. Adjust follow and profile cameras for model readability.
5. [x] **Vary conditions:** add current, wind, and three named surf spot presets. Test a catch and ride for each preset.
6. [x] **Improve water appearance:** add adjustable sun height/direction, refreshed sky/coast reflections on moving wave normals, underwater camera/fog, and decorative seabed light bands.
7. [x] **Verify:** run the full test suite and production build; check desktop and narrow browser layouts and local frame rate. Quantitative fluid validation, a true 3D barrel, live rider mirror, and physical refraction remain outside this prototype.

## Surf-shelf physics

1. [x] **Depth-varying water:** add a tunable still-water shelf and update elevation through local-depth horizontal fluxes while leaving the free surface at rest over the bed.
2. [x] **Shared presentation:** derive underwater seabed height from the same depth function, expose Shore shelf in the Wave Lab, and give the named surf spots distinct shelf strengths.
3. [x] **Check behavior:** verify slower crest travel, finite and decaying energy, bounded hull contact at full shelf, and catch/playability for the three spots.
4. [x] **Depth-aware spilling:** scale the existing local-slope spill response with local shelf depth; retain the authored lateral peel and verify bounded strength, preset catches, and a complete Windy Reef browser run.
5. [x] **Breaker energy accounting:** accumulate the exact relative horizontal-flow energy removed by damping in the same units as the field-energy diagnostic; compare otherwise identical broken and unbroken waves and verify cumulative loss resets on Replay.
6. [x] **3D lip and collision prototype:** spawn a bounded ballistic sheet from the shared break, render a thickened mesh from its parcels, and exchange capped rider/parcel collision impulse. Verify determinism, reset, rendered-contact agreement, board response, preset rides, and browser frame rate. See [ADR 0003](adr/0003-plunging-sheet-collision.md) for its limits.

## Sustained ride and physical wipeout

1. [x] **Continuous swell:** scroll the authoritative water grid with the traveling crest and replenish its height and flow after spreading and breaker loss. Keep the swell independent of board position and keep board translation force-driven.
2. [x] **Long ride:** remove the playable 20 m finish, show live ride distance, and retain a legacy finite-wave branch for previous regression tests. A clean default catch can continue beyond 140 m without paddle input.
3. [x] **Detached fall:** release the rider from the board on wipeout and integrate gravity, water-relative drag, buoyancy, and surface contact while the board and water keep moving through the fall.
4. [x] **Lost-face outcome:** let a carve that falls far behind the crest drain balance and trigger a wipeout rather than leaving a stationary board marked as riding.
5. [x] **Browser and release check:** verify the long ride, scrolling water and coastline, wipeout presentation, full tests, and production build. The observed desktop browser run stayed near 120 FPS.

## After MVP acceptance

- [ ] **Publish to GitHub:** `origin` already points to `vice7770/surfing-game`. Local prototype and physics commits remain unpushed; publication is a separate handoff step.

## Initial baseline handoff checklist (not the new physics milestone)

- [x] `npm run build` passes.
- [x] Wave sampler is the only source of water height used by render and physics.
- [x] Replay resets state and preserves the seed/settings snapshot.
- [x] New Wave produces a distinct seed and visible variation.
- [x] Paddle/catch, steering, missed, wipeout, and completion flows are reachable in simulation checks.
- [x] Diagnostic controls and HUD make the mechanics inspectable.
- [x] The baseline was committed as `1fe7ecc`; the playable prototype was committed as `52ede4e`.
