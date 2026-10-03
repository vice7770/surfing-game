# V2 attempted observation — no counter result

The one root-executed v2 attempt started2026-10-03T23:39:45.412Z. It ended at its predeclared initialization180s deadline and closed2026-10-03T23:42:46.294Z. Raw report: `run/report.json`, SHA256 `d9ee175d299e969f49ea44deaefcbff9dc25da9e4921fd7544c0e8da1749788c`. Driver and manifest remained the reviewed `a2ddda05…` / `e2ba5443…` versions.

The report has no rideReady/warm/arm/step/collected/summary fields. No update was armed and no exponential arguments were counted. Consequently no eligible/repeat/epoch/one-advance/material-identity result, live quality-guard pass, cache gain or FPS conclusion exists. Source/build hash checks passed before launch; they must not be called completed live quality checks.

Cleanup is positively recorded: `ownedChromeClosed:true`, `ownServerClosed:true`, and TCP `{closed:true,reason:'ECONNREFUSED'}`. The failure and all original v2 report/source/manifest bytes are retained. No retry or live patch was made.

The root separately reported one read-only peek at23:41:36UTC showing a ride screen, `mode.ready:true`, GPU snapshot, sea401.607 and no scene-pending overlay. That observation is communicated evidence, not a raw phase trace in this report. It did not include an outstandingSteps sample, so it cannot establish a precise pending/in-flight depth or prove zero never occurred. It does establish that the observed scene was ready; the attempt should not be described as blocked water/worker initialization.

The definite source defect is narrower. V2 awaited `host.outstandingSteps===0` **before** warmup, while ordinary RAF continued requesting steps. The frozen WorkerSurfZone getter returns pending+in-flight steps, and the receipt handler flushes pending work immediately. Queue quiescence is not scene readiness and can remain unavailable under continuous ordinary load. The correct place for this guard is after the existing RAF hold. A separately prepared v3 changes only the initial condition to actual ready GPU scene and preserves the post-warm hold/settle requirement. This is a driver correction, not a runtime performance fix.
