# Matched identity-core leaf comparison V2 — source only

This is a new unexecuted recipe copied from the sealed failed `/private/tmp/tube-leaf-identity-core-native-20261005` attempt. No recipe import, syntax/integration check, preparation, build, saved-word calculation, native/browser run or OS/listener observation was performed here. Root owns the first review and all later execution. Pending review/check flags refuse preparation and owner execution; no new dist, source tree, seal, build, owner or native output has been produced.

## Preserved actual failure

Root handle 47462 terminated exit 1. The original owner failed after 44.32070841698442s with `AnchorRejected: fresh_bounded_read_required`. A periodic completed owned-group read took 2.059041958011221s, exceeding the unchanged 2s limit. The real original leader remained exact and live on both sides of that read. An earlier `subprocess.TimeoutExpired` had correctly remained an observation-only event. The parent retained 0 steps and 0 PNGs, so it has no visual comparison result.

The original owner's cleanup used a fresh accepted TERM observation. Root independently verified 690 post-failure pins, group 43952 absence, closed 4301/9711 and all five protected preview identities. The actual owner, incomplete report, launcher/native logs, integration/preparation/build/seal/source receipts and root closure receipt remain unchanged in the parent and are copied byte-exact into `sealed-parent/` where applicable. `parent-copy.json` pins all 99 parent files, including its assets, source and unsuccessful outputs. This V2 recipe does not relabel the first attempt as complete or benign.

## Narrow caller change

`run.py` defines caller-local `OwnedReadExpired`. Immediately before pure observation, it measures the completed read's duration and the age at that invocation. Duration>2s or age>2s raises this exception **before** calling `observe_owned_group`, without refreshing accepted state, latest observation or anchor evidence. Read timing is not inferred from the saved failure or relaxed by tolerance.

A periodic `OwnedReadExpired`, like `subprocess.TimeoutExpired`, records an observation-only note and continues the **same** Popen and HTTP server. Required reads retry only these two expiry types, up to the existing three attempts and inside the same absolute deadline. A genuine `AnchorRejected` is never caught by that retry/periodic path and remains fatal. Deadline, leader/survivor, replay, scope and protected checks still belong to the unchanged pure helper on nonexpired reads. No failed read authorizes a signal or becomes a fallback anchor.

Expiry notes retain all measured ReadWindow fields, duration, age, live-before/after facts, previous accepted observation number, actual Popen PID, member count and at most 16 PIDs with an explicit omitted count. The existing 16-note cap and total count remain. These capped notes report an unaccepted read, not an identity proof. Fresh required reads still precede each TERM/KILL, with the latest accepted observation/state assertion and signal counter consumption only after the actual signal succeeds.

`owned_group_anchor.py` remains exact SHA256 `f79e1098601eb592fe4b0133db40ee9b4ed4999bb238b760b900ba030685fdb0`; its prior root 20 synthetic test results are historical evidence, not a V2 check. The five-port authority remains exact, protecting 4312–4316, including the immutable human preview 4316/PID 38617. Only 4301/9711 are owned. Existing native 635s, active owner 648s, whole 680s, cleanup 20s, OS 2s, poll 5s, three required attempts and image/report caps remain unchanged. The native timer still covers browser close and final save.

## Comparison and authority retained

The preserved full 37 pre-identity baseline remains the completed shared-leaf V2 candidate at checkpoint `2f43b943cfb29419a063c6ee31813e4f116c7a7a`: 80 rows, 10,720 vertices, 61,446 indices. The immutable candidate application is the existing ordinary V4 build `tube-guided-passive-telemetry-20261005`, already mapped by root to held 3e75550c2 source. V2 reuses the exact application/reference authorities; it does not create a build or change production.

The comparison retains epoch 276.3293560552737, zero physical steps, exact prior side/interior cameras, current material/mask, normal actors and four preserved→identity-core→restored pairs, with eight planned PNGs. `geometry-inspection.mjs` is byte-identical. `native.mjs` and `measure.py` change only their WORK path. Measurement/acceptance criteria are unchanged. Neither this source proposal nor the failed parent establishes native appearance, globally C1 geometry, body clearance, ridden passage or FPS.

Only WORK substitutions, caller expired-read handling, pending-review flags and provenance/seal-helper closure change. The complete V2 delta is `owner-expired-read.patch`. The inherited `recipe.patch` and owner-policy documents are unchanged historical parent artifacts. Root must review/check V2, truthfully refresh pending input/freeze flags, run its first-only preparer, then choose whether to execute the finite owner. This directory is not launch-ready.
