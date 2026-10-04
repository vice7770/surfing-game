# Overlap the next water step with snapshot work

The selected candidate keeps the water arithmetic and all 17 GPU passes unchanged. After completing the current water/contact/material/particle step, the ordinary single-player Padang worker starts one future GPU water operation while the CPU fills and publishes the current snapshot. The future mapped result stays private until the next requested single step. Current arrays, simulation time, exports and snapshots remain committed state. Controls are applied at the same point in the requested step.

The frozen five-file patch is `62208970993401ccc61361b2f7bdaa209419f8b5b9c32be62b7930e83b1936ab`, against runtime baseline `6f321d704269f9f1afc73750ab2b1f4a86f61122`. The exact five runtime files are now adopted. Strict typing, all 92 focused tests across six existing/new suites and the production build pass. The compiled worker is byte-identical to the measured candidate: 447,015 bytes, SHA-256 `e08444a9b72f73d62126a2e4b503092bc6e3cc7536d714a2e49743ed1293f480`. All 552 source/config inputs remain unchanged during the final checks. Sparse uploads, kernel fusion, renderer changes and lowered graphics settings are absent from this candidate.

## Ordinary native comparison

The sole fixed-order baseline → candidate pair ran on the M5 Pro from 2026-10-04 03:26:38 to 03:30:33 UTC. Each arm entered Surf → Padang → Big → Paddle out through the ordinary menu, warmed for five seconds and sampled an idle rider for 90 seconds. Both used High graphics, Rich water, high particles, 60 FPS cap, unchanged 116,000-cell GPU physics, one fixed 1/60-second step per publication, native CSS 1708×879, browser DPR 2 and backing 2989×1538. GPU timer queries, ride input, synthetic stepping, resize overrides and worker RNG overrides were absent. The disclosed page-only menu RNG seed was the same in both arms.

| Measurement | Baseline | Prefetch |
|---|---:|---:|
| Rendered frames/s | 60.00 | 60.00 |
| Fresh physics snapshots/s | 58.25 | 59.98 |
| Simulation seconds/wall second | 0.971 | 1.000 |
| Rendered interval p95, ms | 25.0 | 17.5 |
| Rendered interval p99, ms | 25.5 | 17.6 |
| Rendered interval maximum, ms | 34.2 | 32.7 |
| Snapshot interval p95, ms | 21.3 | 17.9 |
| Snapshot interval p99, ms | 28.0 | 19.2 |
| Whole recorded pipeline p50, ms | 16.6 | 12.1 |
| Whole recorded pipeline p95, ms | 20.9 | 17.0 |

Synchronous future preparation, including packing, CFL work and command encoding, is included in the recorded pipeline; the shorter water await is not treated as the full cost. Component quantiles are not added or subtracted to infer whole-request latency. Both arms have zero duplicate, backward or nonintegral physics publications. Their actual scene, graphics, native bounds and served bundle guards pass. All 1,199 root-pinned inputs have identical before/after bytes. Both owned Chrome instances and their HTTP/CDP listeners close, and play port 4200 remains closed.

The six complete wall-time bins beginning at 78, 80, 82, 84, 86 and 88 seconds contain baseline rates 52.03, 50.22, 52.55, 55.94, 52.39 and 54.61 Hz; candidate rates are 59.79, 59.36, 60.03, 59.96, 60.09 and 59.89 Hz. These are wall-time bins: the faster candidate advances to different sea phases. This single sequence supports adopting the candidate but does not establish a repeated population estimate, interactive ride performance, moving cavity quality or fixed-state image equivalence.

## Correctness and lifecycle evidence

The successful scoped CPU checks pass strict typing and 17 targeted tests. They use a common F32 transport stand-in to test publication and lifecycle behavior; they do not establish native WGSL correctness. The first four failed attempts are retained unchanged. They exposed QA oracle precision/cached-CFL assumptions and missing or overly duplicated fixture witnesses. The final scoped correction removes only an additional untubed fixture's positive-body assertion; the original eight-call fixture still requires positive body feedback, front and tube witnesses, and the 30-call untubed landing fixture retains its actual landing, full reaction bytes and state comparisons. The five runtime files do not change between those attempts.

A separate actual WebGPU replay compares original and candidate Core/Simulation/GPU implementations on 48 paired calls. It includes 47 positive physical steps, 46 native nine-plane packet pairs and one explicitly injected next-request CPU fallback. Native mapped bytes, all nine committed arrays, plunge state, clocks, serialized exports and reused snapshots match exactly. Ordered controls, held/pending exports, zero/remote/multi-step invalidation, restore, superseding starts, untubed lip landings and resource retirement are covered. All eight owned GPU devices are disposed. The injected failure is a mapped-prepare rejection, not an induced device loss.

The first replay launch fails before Chrome because the sandbox denies a local TCP preflight connection. Its original result and logs are retained; it makes no GPU or listener-closure claim. The unchanged reviewed driver subsequently runs with the local TCP permission required for owned Chrome. The native replay passes, reports no errors, and closes its HTTP/CDP listeners and Chrome. This bounded small-grid replay establishes numerical/ownership parity for its cases; the separate ordinary comparison supplies live throughput evidence.

The production regressions add nine portable ownership/lifecycle cases using production-relative imports. Their first strict attempt fails on a new export assertion's transport signature; the next focused attempt fails on an API return-value assumption and a missing positive held-result setup after a remote reaction. Both original attempts, source versions and narrow test-only repairs are retained. No runtime byte or numerical tolerance changes to accommodate these assertions. The final portable suite and the subsequent 92-test integration run pass. These portable transport tests complement the independent native replay rather than replacing its numerical authority.

## Archive

[manifest.json](manifest.json) maps every original pathname to a deduplicated lossless gzip payload. It records both stored and decompressed SHA-256 values and byte lengths. There are 323 original aliases and 163 payloads. Every payload has been decompressed and compared with all original aliases. All readiness versions, QA patches and test versions, original failed logs, successful CPU logs, portable production tests/adoption manifests and final integration/build logs, source pin ledgers, replay source/driver/plan/results, FPS source/build authorities, full per-arm reports/native audits/launchers and root terminal evidence are retained. Canonical source trees, dependencies, public assets, caches and compiled binaries are referenced by their archived identities rather than copied.
