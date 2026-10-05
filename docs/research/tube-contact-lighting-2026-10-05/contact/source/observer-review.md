Independent explorer source review, completed after implementation; no edits or tests performed.

No blocker found in the two-file diagnostic delta. Added code reads primitives and writes diagnostic-owned records; no new water/contact queries or physics scratch mutation. Separation conditions retain their evaluation order; dominantLimit() remains one call on the selected posture-error branch.

At AttachedRider.ts line 2121, demand is copied before finish overwrites the impulse. Projected is the original settle projection. Applied at 2225 is finish's actual impulse, including feasible recomputation after board motion or projected impulse when limited.

At 2200–2209 both lost-board paths are distinguished: flight-time threshold and posture-error/dominant-flight latch trigger/original cause before separation. Later reef relabel cannot overwrite the latch. Per-step counters reset at beginStep (1379); first limited/non-contact records retain their first substep. Loss persists until mount. readContactDiagnostics (2245) returns detached primitive copies and masks stale current records as null after counters reset.

Interpretation limits: legExtension/legRate are prepare-leg values (1760), not freshly measured after finish. FrontShare may retain the preceding projection's value when flight returns early (2351). Relative velocity is rider minus board COM velocity, without angular contact-point velocity. Current substeps/elapsed count attached-contact finishes only; later board substeps after separation are excluded. Sway separation is labeled, but sway magnitude is not exported. Both requested lost-board branches have decisive operands recorded.
