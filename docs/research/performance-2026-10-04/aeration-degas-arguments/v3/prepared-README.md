# Aeration capture v3 — readiness guard correction, preparation only

V1 and v2 artifacts are immutable. V2 launched and reached a real ready GPU ride, according to root's one read-only peek at23:41:36UTC (readytrue, sea401.607, scene-pendingfalse, two observed workers). Its saved report had not entered rideReady/warm. This is not evidence of blocked worker initialization. The peek did **not** retain an outstandingSteps sample, so it does not prove a particular queue depth or that zero never occurred.

The source defect is in the pre-warm wait: it requires `host.outstandingSteps===0` while ordinary RAF continues to enqueue work. `WorkerSurfZone.outstandingSteps` includes pending+in-flight work, and its reply handler immediately flushes the pending request. Quiescence is unsuitable as an ordinary loaded scene's initialization condition. PhysicalMode.ready is set only after host.ready completes and the real host is installed.

V3 changes the initial wait to actual ride screen + mode.readytrue + actual host GPU snapshot. The existing normal five-second wall warmup, RAF hold and subsequent zero-outstanding settlement remain. One armed1/60 step, quality/config/request/window/array identity guards, original56bf worker build, TCP closure proof and bounds are unchanged. No live patch or retry of v2 is made.

The only runtime behavior delta is this initial readiness condition; other small source changes select a separate v3 manifest/version/output path. `adapter-v2-to-v3.patch` is the exact delta. No build/hardware/argument count has run for v3. After root lease release, syntax and the default no-launch plan branch passed. Source-field access was audited against actual frozen56bf APIs; see source-field-audit.md.

After stable review and exclusive release only:

```
node /private/tmp/aeration-live-arguments-20261004/v3/adapter.mjs --run=true --out=/private/tmp/aeration-live-arguments-20261004/v3/run
```

Bounds remain100 target attempts with150ms sleeps plus500ms fetch caps; initialization180s/overall240s from owned spawn; settle15s/capture15s; no retries. Counter timing is observational; no FPS/cache-saving or steady-state conclusion.

V2 final report is retained byte-exact and ended at Initialization180s, with no counter and TCP ECONNREFUSED closure proof. See ../v2/interpretation.md for the result/limits.
