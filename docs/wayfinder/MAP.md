# Surf Game Wayfinder Map

## Destination

A playable browser-based Three.js surfing simulator where the incoming wave lives in an evolving interactive water field; the player paddles, times a Get Up/pop-up, and rides forward through physical board-water interaction. No scripted ride transport. Replay reproduces the same seed/settings; New Wave changes the seed.

## Notes

- Domain: browser game and interactive wave/board simulation.
- Use the repository's `CONTEXT.md` glossary for project terms.
- Orchestration: GPT-6 Astra at light effort for planning and validation; GPT-6 Luna at xhigh for implementation.
- This local Markdown map is the tracker fallback because no issue tracker is configured in this repository.
- Wayfinder tickets record decisions and investigations; [`ROADMAP.md`](../../ROADMAP.md) is the user-facing prioritized feature tree and implementation tracker.
- Local ticket metadata: `Status` is `OPEN` or `RESOLVED`; `Type` is a Wayfinder ticket type; `Blocked by` lists linked ticket titles. An open ticket with no unresolved blockers is on the frontier.

## Decisions so far

- [Choose the wave simulation representation](tickets/choose-wave-simulation.md): baseline analytic wave is superseded by the evolving shared water field selected in ADR 0002.
- [Define spawn, paddling, and wave catch behavior](tickets/define-catch-behavior.md): paddle to build speed, then explicitly trigger a timed pop-up; the wave must physically carry the board after paddle release.
- [Define water appearance and shared surface behavior](tickets/define-water-surface.md): render the evolving authoritative field sampled by board physics.
- [Specify replay reset and reproducibility](tickets/specify-replay-contract.md): replay resets simulation and PRNG state to the captured seed/settings; identical inputs in the same build reproduce the run.
- [Set control mappings and tuning ranges](tickets/set-controls-and-tuning.md): use keyboard controls and explicit SI-unit tuning ranges with a named steering-response gain.
- [Set run transition and outcome criteria](tickets/set-run-criteria.md): add the explicit eligibility window/Get Up action and physical ride outcome.
- [Set MVP physics calibration checks](tickets/set-physics-validation.md): test shared-state consistency, board/water forces, paddle release, 3-second wave carry, stability, and replay.
- [Choose the MVP's surfing experience](tickets/choose-mvp-experience.md): build a realistic surfing simulator centered on wave and board physics.
- [Set the initial wave and board physics scope](tickets/set-initial-physics-scope.md): start with a deterministic parameterized wave and simplified board forces; include paddling into the incoming wave.
- [Define replay and wave generation](tickets/define-replay-and-generation.md): replay the same seed and settings; New Wave generates a different seed.
- [Set MVP interaction and inspection tools](tickets/set-controls-and-inspection.md): keyboard paddle/steer/balance controls, third-person view, diagnostic wave view, and a five-parameter tuning panel.
- [Set MVP run outcomes](tickets/set-run-outcomes.md): end each run with ride complete or wipeout and offer replay/new wave actions.
- [Define the future physics roadmap](tickets/define-physics-roadmap.md): document future fidelity work separately from MVP requirements.

## Open tickets

- [Investigate the interactive-water foundation](tickets/investigate-interactive-water-foundation.md): selected the CPU-authoritative MVP field; performance, sustained wave-carry tuning, and browser validation remain on the active roadmap.

## Not yet specified

- Production calibration against measured ocean data and cross-hardware bitwise determinism.
- More physically detailed breaking, spilling, and reforming waves, whitewater, and overhangs.
- Fuller board-water coupling, failure recording, board flex, fin hydrodynamics, detailed rider biomechanics, and environmental effects such as wind/current.
- Future water appearance work: sun/sky-driven reflections, reflection/refraction, surface disturbances, and an underwater view with caustics/depth attenuation. Sources are listed in `ROADMAP.md` and `docs/PLAN.md`; evaluate pool-specific assumptions before adapting them to open surf.
- Visual/gameplay inspiration: the embedded video in the surfing-game Reddit link listed in `ROADMAP.md` and `docs/PLAN.md` only. Ignore the post text, comments, and discussion; translate observations rather than copying Unity-specific implementation details.
- Multiplayer, progression, additional surfers/locations, touch controls, and production-grade CFD.

## Out of scope

- The exact water solver/source-of-truth architecture and calibrated pop-up thresholds remain subject to the open interactive-water research ticket.
