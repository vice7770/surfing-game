# Aeration degassing argument observation

**V3 observed one actual `1/60` update on one identified worker field: 10,153 eligible exponential calls, 9,054 immediate exact repeats, 1,098 misses, one first argument and zero nonfinite arguments. That is 89.1756% of eligible calls, not 89% of the whole field and not an FPS gain.** Only 10,153 of 116,000 cells (8.7526%) were eligible in this update. All original exponential evaluations still ran; no cache was implemented.

The [valid raw report](v3/run/report.json) identifies run `6bd08e68-c82e-4c82-8219-1618011c6257`, actual field `6bd08e68-c82e-4c82-8219-1618011c6257:field:1`, arm `1`, start request `1`, and advance request `291` following settled request `290`. The same field advanced sea time `316.17437989097084` → `316.1910465576375`, with original dt `1/60` and actual one-step request/batch. Counter stage was after original advection, before degassing; solver time `40.849999999999724`, period `18` and window x `−159` identify that material epoch.

## Three separately retained attempts

| Version | Outcome and boundary | Cleanup evidence |
| --- | --- | --- |
| [v1 raw report](v1/run/report.json) | Invalid before game/counter arming: the owned blank-page target was unavailable. Cause is unknown; no target inventory or Chrome exit details were retained. | Original booleans report Chrome/server closed; this version has no TCP closure proof. |
| [v2 raw report](v2/run/report.json) | Invalid at the fixed 180-second initialization deadline. It required queue settlement while ordinary RAF was still advancing the game; no warmup, arm, step or counter result was reached. | Chrome/server closed and TCP `ECONNREFUSED`, 2026-10-03 23:42:46 UTC. |
| [v3 raw report](v3/run/report.json) | Valid: actual scene ready/GPU snapshot first, five-second ordinary warmup, RAF hold, queue settlement, then one arm and one original fixed step. | Chrome/server closed and TCP `ECONNREFUSED`, 2026-10-03 23:45:18 UTC. |

The [v2 interpretation](v2/interpretation.md) distinguishes definite driver logic from communicated observations that were not in the raw report. The [v1→v2 delta](v2/adapter-v1-to-v2.patch) changed owned target selection and closure diagnostics. The [v2→v3 delta](v3/adapter-v2-to-v3.patch) changes readiness ordering, preserving post-hold settlement. No failed file was overwritten and no deadline was widened. The declared launch lifetime was 240 seconds, initial readiness 180 seconds, settlement/capture 15 seconds each, and zero retries.

## Scope of the valid observation

V3 used ordinary Padang Big: seed `8761`, Hs `3.8`, T `18`, direction `0`, spreading `150`, 64 components, dx `2`, fine spacing `1`, actual GPU water backend, rider and four barrel cases. Its original `renderSpacing:undefined` option resolved to drawing spacing `2` and mask spacing `1`. Actual High/Rich, High particles, pixel normals, CSS `1708×926`, browser DPR `2` and backing `2989×1620` were checked. Field grid was `160×725` / 116,000 cells. The [source-field audit](v3/source-field-audit.md) identifies the actual private/public access contracts.

The scratch observer returned every final Number argument unchanged inside the original `Math.exp` expression. It counted `===` equality against the previous eligible argument in actual flat-cell order; it neither rounded/binned arguments nor reconstructed them from exported state. The ordinary request/transfer path and intrinsic `Math.exp` were retained. The live report confirms the same public air/depth/turbulence array identities. An ordered historical argument list and full F64 historical fields were **not** retained, and this live run has no separate paired full-field byte oracle. The summary's `fieldNumericalCalculationChanged:false` describes the reviewed identity mechanism, not an additional live numerical comparison.

The [six counter tests](common/counter.test.mjs.txt) and prior pass count in the source/build manifests cover the synthetic observer's F64 output and argument order. Original direct test stdout was not separately retained, so no new test log is invented. The [original build log](common/build.log) records one successful scratch build, including its nonfatal missing-Git metadata diagnostic. No tests or builds were rerun to create this archive. [V3 interpretation](v3/interpretation.md) records further boundaries and exclusions.

Counter work is included in the intrusive diagnostic timing, and RAF was held for the counted step. Diagnostic elapsed milliseconds and pipeline values supply no paired cache cost, steady-state timing acceptance, passive FPS result or performance gain. One early material epoch also supplies no late-tube or lifetime distribution.

## Exact source/build authority and archive

All three runs used the same isolated original-clock source base `56bf750996cd48cdc5ef45954c479a268053c0b9`, not the later `58ceb6a29617c00f93fb3b21eff3058d824319d5` clock runtime. The later runtime is separately documented at [paced throw crossing](../paced-throw-crossing/README.md); these observations must not be presented as its FPS acceptance.

Each retained source/build manifest contains **626 unique source records**: two owned QA edits and 624 unowned records marked unchanged from the explicit base, plus 11 build records. The earlier “625” shorthand is not the count in these raw manifests. The QA worker `assets/surfZoneWorker-BiS1HSwW.js` has SHA256 `6a59a6367a8eb25c4d53fd5a9becdf9c8462d86ebb9b8c9237a1a50ec0b70aef`; the main `assets/index-D_CFvyTQ.js` has SHA256 `c5e70fe12e916607c3711de03b17d95f8c1c752d3ed9b98ad4a1c28ac945b635`. V2/v3 driver changes did not rebuild that runtime.

The [archive manifest](manifest.json) records every original alias, stored byte/hash and decompressed byte/hash. The three large source/build manifests use deterministic gzip (empty filename, mtime `0`, compression level `9`); decompression reproduces original bytes. Drivers and the counter test are `.mjs.txt`, and the two small original source snapshots are `.ts.txt`. The two original [field](common/AerationField.patch) / [worker-entry](common/surfZoneWorker.patch) QA patches, driver deltas, raw reports, readiness/plans, historical preparation READMEs, completed source audit and interpretations are preserved exactly. Prepared READMEs are historical preparation, not run authorization. Full scratch source/build trees and optional earlier planning/combined-patch copies are omitted; exact base/owned patches/source and build hashes remain available without duplicating the runtime. No cache proposal or implementation is included.

Archive creation changed only this new documentation folder. It performed no hardware run, source edit, test, build, commit or push.
