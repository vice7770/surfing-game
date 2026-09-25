# Baseline Delivery and Next Luna Implementation Tasks

The checked items record the delivered analytic-wave prototype only. They do not satisfy the new physics-driven catch milestone. For new work, follow [ROADMAP.md](../ROADMAP.md), [REQUIREMENTS.md](REQUIREMENTS.md), and [PLAN.md](PLAN.md). Keep all changes uncommitted.

1. [x] **Scaffold app:** add package scripts/dependencies for Vite, TypeScript, and Three.js; create the HTML entrypoint, responsive canvas, HUD, and minimal start state.
2. [x] **Wave model:** implement deterministic seeded wave parameters and pure height/normal/surface-velocity sampling. Add tests covering repeatability and finite values.
3. [x] **Water scene:** deform custom indexed geometry from the same sampler; add crest indication, foam cue, lighting, follow camera, and diagnostic profile view.
4. [x] **Board simulation:** implement fixed-step board state and four-point buoyancy/contact support, wave-relative drag, planing lift, steering/attitude response, and paddle force. Expose diagnostics in the HUD.
5. [x] **Run flow:** add ready/paddling/riding/missed/wipeout/complete states and thresholds from requirements; freeze terminal state and show outcome controls.
6. [x] **Replay and generation:** snapshot effective parameters and seed, reset all state for replay, and use a distinct deterministic seed for New Wave.
7. [x] **Tuning and polish:** implement all five sliders and values/ranges/defaults, pending settings/Apply & Replay, keyboard focus behavior, viewport resize, button actions, responsive styling, accessibility details, and concise inline instructions.
8. [x] **Validate:** run typecheck/build and manual acceptance checks from the requirements; fix review findings before handoff. No commit created.

## Current physics-driven catch milestone

1. [x] **Interactive-water research decision:** selected a deterministic CPU field and documented tradeoffs in [ADR 0002](adr/0002-interactive-water-field.md); GPU compute remains deferred until sampling/sync and compatibility are proven.
2. [x] **Water-field foundation:** initialized traveling wave is part of evolving state; render and board sample the same field; deterministic bounded evolution and reset are tested.
3. [x] **Physical board coupling:** board uses water-relative forces and bounded equal-and-opposite hull reaction; tests cover stable contacts and sustained paddle-free carry. Higher-fidelity coupling/calibration remain future work.
4. [x] **Timed pop-up flow:** Get Up button + Enter, local eligibility, early input ignored, rider standing transition, and missed/wipeout/complete outcomes are implemented and covered by simulation tests.
5. [ ] **Physics validation:** automated tests prove at least 3 seconds of forward travel after entering riding and verify drag, field evolution, replay determinism, hull impulse direction, and bounded support. Desktop/mobile visual checks pass; browser FPS profiling and Astra review remain.
6. [ ] **Astra validation and handoff:** request review when reviewer capacity is available; fix findings; no commit unless requested.

## After MVP acceptance

- [ ] **Publish to GitHub:** no Git remote is configured yet. Before creating a repository or pushing, confirm the owner/repository name and whether it should be public or private. The user requested publication after the MVP is finished.

## Initial baseline handoff checklist (not the new physics milestone)

- [x] `npm run build` passes.
- [x] Wave sampler is the only source of water height used by render and physics.
- [x] Replay resets state and preserves the seed/settings snapshot.
- [x] New Wave produces a distinct seed and visible variation.
- [x] Paddle/catch, steering, missed, wipeout, and completion flows are reachable in simulation checks.
- [x] Diagnostic controls and HUD make the mechanics inspectable.
- [x] No commit was created.
