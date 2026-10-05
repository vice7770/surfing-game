# Minimal landing reframe correction

Frozen source: `/private/tmp/tube-landing-remap-fix-20261005/source`, exact 588-input diagnostic parent plus runtime `AttachedRider.ts` and its existing authored test file. Apply `runtime.patch` and `tests.patch` independently to ordinary source; do not copy diagnostic instrumentation wholesale.

Entering upright now inverts current **heading**, the destination landing frame. Prone/push frame updates heading but leaves bodyFrame as identity or a prior upright mount's frame. Inverting that stale frame and then applying heading rotates world offsets again. Leaving upright continues using **bodyFrame**, including bank. This reuses the existing scratch quaternion and adds no allocation/query. Thresholds, support, cadence, controls, camera, spawn and seed remain unchanged.

Strict application TypeScript passed. All 15 selected authored checks passed: five new continuity cases and ten existing pop-up/landing/drop checks. The five new cases hold board geometry fixed, read frame operands without private writes, and check nominal target/part world points at landing time zero for fresh headings 0, .2336228303, ±90°, and a prone remount following an older upright heading. They also verify actual COM position/velocity are not directly assigned.

The same five contracts against the exact diagnostic parent produce one pass (zero) and four failures: target jumps .0445492, .2702887, .2702887 and .1888718 m. All failed evidence is retained.

Integrated comparison is **not bitwise identical**: initially zero headings evolve to ~1e-17 rad and cause rounding differences at step223. Reaction-event counts also differ. A proposed 1e-10 numeric force tolerance failed around steps292/293. These failures and original test inputs are preserved. One final already-running measurement completed 360 flat/towed and 330 15°-face CPU steps per variant, checking categorical fields, water query counts and substep counts exactly while reporting numeric differences without equality acceptance. See `complete-motion-comparison.json`. The exact fixed-board zero-heading phase-boundary contract remains unchanged. No further comparison tests were run after root requested freeze.

The diagnostic parent's 197-check run had 190 passes and seven failures, all inherited from its parent. This candidate did not rerun that full set and makes no all-suite claim.

Actual V6 separates in landing at1366/11 through posture-error→flight with error .2509081 m, inContact true and flightTime zero. Early transition error recovers by1356/32; sustained zero projected/applied impulse starts1357/1. The frame contract bug is corrected independently, but this candidate has no native proof that it solves the later unload/loss. Exact projection local normal and COM deck height were not published, so WORLD demandY alone cannot select the rejection operand.

Root's next check is a paired fixed-seed native run, retaining diagnostics in the scratch source. This package launched no build/native/server/Git action, edited no production files and preserved both human servers.
