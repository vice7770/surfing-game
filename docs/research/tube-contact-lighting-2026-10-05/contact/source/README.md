# Diagnostic-only ordinary pop-up contact source

This prepared source adds read-only, bounded contact telemetry to diagnose the first ordinary landing failure. It changes **only `AttachedRider.ts` and `SurfZoneRunner.ts`** over the frozen retirement-boundary cap-prefix V2 source. Physics, cue thresholds, inputs, camera, spawn, seed policy, contact/water queries and all existing status fields remain as authored. No app build, browser capture, server, Git action or production edit was performed. Play servers 4312 and 4313 are outside this task.

The optional descriptive field is:

```ts
host.snapshot.status.ride?.contactDiagnostics
```

The existing worker snapshot route publishes `runner.status()` directly; the added field needs no new message type, array layout, private worker access, or HUD/UI change. Source is at `/private/tmp/tube-pop-up-contact-diagnostics-20261005/source`.

## Cadence, resets and latch

- `mount` increments on every existing rider mount; that mount clears diagnostic step counters and the loss latch. A reset/remount therefore starts a new diagnostic epoch. This is not a history retained across a same-step automatic reset.
- `step` increments at existing `AttachedRider.beginStep`, including board steps after separation while the board still holds the rider reference. `substeps` and `elapsedStepSeconds` count only actual attached-rider `finish` calls in that step. Remaining riderless board substeps after separation are excluded.
- `last` is the latest finished substep. `firstLimited` is the first substep with `feasible === false`; `firstNonContact` is the first with `inContact === false`. Those current records become null when their corresponding counters reset and no new substep qualifies.
- `loss` captures the **first selected finish separation** since mount, before `separate` and any reef relabel. It remains unchanged across later steps and relabeling until mount. External releases have no fabricated finish-loss record.
- The trigger is `flight-time` when existing `flightTime > .4`; `sway-error` for the existing sway branch; or `posture-error` when existing posture error exceeds .25 m and a contact limit is active. The posture-error record retains the actual single `dominantLimit()` result and selected original cause. Thus the two “lost board” routes are explicitly distinct.
- Four fixed sample objects are reused internally; there is no substep trajectory array. Publication returns bounded detached plain copies, so a reader cannot mutate the latch or physics.

## Scalar semantics

Each substep sample has its phase and existing phase/pop-up clocks; contact feasibility/in-contact flag; flight time/posture error; limit and recent decayed limit times; support bounds and centre of pressure; leg extension/rate/rest; demanded, projected and applied world impulses (N·s); prefix step peak normal load (body weights) and existing front share; and rider-minus-board COM velocity (m/s). It also includes substep length and elapsed attached-contact time within the board step.

Demand is copied from the original settle impulse immediately before `finish` can overwrite it. Projected is the original projection; applied is the impulse actually used by finish. Capture happens after existing finish integration/error/limit-memory updates and immediately before separation conditions. Top-level mean force (world N), step peak load, landing peak and landing front share are copies of existing public contact/pop-up values after the ordinary board endStep.

Leg extension/rate are values measured during prepare-leg, not fresh measurements after finish. Front share can be stale on the early flight-projection return, matching the existing contact property. COM velocity difference excludes board angular velocity at the foot/contact point and must not be called slip velocity. Sway magnitude is not exported; the two requested lost-board branches do carry their decisive flight-time/posture-error operands. No extra local water sample is taken.

## Validation and limits

Strict application TypeScript passed. Four focused diagnostic checks passed. Three controlled PlaneWater trajectories compare the parent and observed physical words and water sample/surface/reaction counts **exactly at each of 990 paired steps**: towed pop-up (360), 15° face pop-up (330), and unsupported standing (300). Returned-copy mutation does not change motion or the stored latch. A fourth check verifies original loss survival across reef relabel and clearing on mount. The controlled fall exercised posture-error/tip → balance; **neither V4 lost-board path nor seed 6238 was replayed**. Equality is limited to those measured CPU trajectories and queried/public state, not every private solver word, native sea, GPU timing, FPS or real-time schedule.

The four existing suites ran 197 checks: **190 passed, 7 failed**. All deep-crouch 9, RideSession 26 and Runner 43 passed; AttachedRider passed 112/119. All seven failing Compress/carve assertion names and first failure values/messages reproduced on the unchanged frozen parent runtime. Two are expected-failure tests whose bodies already pass. No assertion, physics constant or runtime behavior was changed to accommodate them. Original failure reports, the incomplete initial baseline selection and the separate missing-leaf check are retained. `failure-comparison.json` records the final comparison.

An independent narrow source review found no observer blocker; its timing and semantic limits are in `observer-review.md`.

## Root integration

`source-delta.json` is a compact override of the pinned **588-input parent manifest**, with only two before/after records; there is no redundant exhaustive manifest. Derive effective build input pins by reading that exact parent manifest, retaining its paths, and replacing those two records with their `after` values under this source directory. `verify.py` verifies every parent and effective source file, exact file inventory, the two-file runtime patch, and frozen local payloads without running tests or launching resources.

Root can build this source and extend its ordinary first-pop-up/landing capture later. Read the descriptive field on each actual worker snapshot, especially the fallen output, and retain loss samples rather than infer the branch from balance. A declared replay of V4 seed 6238 is permitted later to diagnose the observed failure; this prep performs no seed search or replay. Preserve both existing play ports and keep any such future diagnostic build/capture separate. This source fixes no landing or tube physics and makes no adoption or tube-quality claim.
