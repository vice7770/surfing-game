# Height-demand contact: passive native FPS pair

One ordinary High / Padang Big baseline→candidate pair passed all runtime, compiled-source, input, native-window and cleanup guards. Both arms displayed **60 FPS**. The candidate published **57.87 fresh water updates/s**, compared with **56.77** for eager contact: **+1.10 Hz** in this sequence. This is a modest improvement, not steady 60 Hz physics or production acceptance. Adoption was being prepared separately when this evidence was archived.

| Retained measurement | Eager baseline | Height-demand candidate |
| --- | ---: | ---: |
| Rendered FPS | 60.0 | 60.0 |
| Fresh water snapshots/s | 56.77 | 57.87 |
| Simulation seconds/wall second | 0.946 | 0.965 |
| Contact p50 / p95, ms | 1.1 / 3.5 | 0.5 / 1.6 |
| Worker total-stage p50 / p95, ms | 16.7 / 22.6 | 16.5 / 21.5 |
| Rendered interval p95 / maximum, ms | 24.9 / 34.2 | 25.0 / 32.8 |
| Snapshot interval p95 / maximum, ms | 23.1 / 41.4 | 22.0 / 54.3 |

Contact time roughly halved, but the longest snapshot interval increased **41.4→54.3 ms**. Component quantiles are last-step observations and cannot be added as full-request latency or available headroom. These are one serial A-then-B samples, sensitive to order, machine scheduling and GPU load; no repeated statistical isolation is claimed.

## Matching conditions and actual execution

Both native windows retained CSS **1708×879**, DPR **2**, render ratio **1.75** and canvas **2989×1538** from High menu through sample end, without fitting, emulated metrics or resizing. The same ordinary menu→Surf→Padang→Big→Paddle out route, five-second warmup and nominal 90-second passive sample ran with seed 8761, Hs 3.8, period 18, 64 components, GPU 116,000 physical cells, dx2/fineSpacing1, renderSpacing2/maskSpacing1, four barrel cases, idle rider, High particles, Rich water and pixel normals. Max batch and actual advance requests stayed one step. All observed publication differences were exactly one fixed 1/60 step, with no duplicate, backward or nonintegral publication deltas. Menu practice-worker rows were excluded from Ride measurements.

The original survey's numerical statistics, passive sampling, settings/menu load and route/quit blocks remain exact source spans. Its disclosed page-only `Math.random` bootstrap 0x5eed remains; worker RNG and original postMessage arguments were untouched. No profiler, GPU timer query, contact observer or forced contact-height materialization ran.

[Exact execution reference](execution.json) records exec session 56059 and the authorized command. The [raw pair terminal](run/report.json.gz) pins survey child PIDs 54560 and 55141, zero exits, UTC start/end and elapsed arm times 118.379 /119.126 seconds, including setup and cleanup. Both CDP ports 9626/9627 and servers 4216/4217 closed with ECONNREFUSED; 4200 stayed closed, and user 5173 was untouched. Authority hashes remained unchanged. There was one execution and no repair or retry.

## Late slowdown and unavailable sea-clock matching

The original retained `simulationTimeline` contains **two-second wall-time bins** relative to each arm's first publication. The following matching complete wall intervals exclude the partial tail beginning at 90 seconds:

| Wall interval, s | Fresh Hz A→B | Contact median ms A→B | Total-stage median ms A→B |
| --- | ---: | ---: | ---: |
| 78–80 | 47.74→52.87 | 3.2→1.5 | 19.9→17.6 |
| 80–82 | 43.57→48.14 | 4.2→1.9 | 22.1→19.6 |
| 82–84 | 41.96→47.96 | 3.7→1.3 | 22.2→20.1 |
| 84–86 | 49.54→59.02 | 2.1→0.9 | 18.9→16.5 |
| 86–88 | 45.77→56.50 | 2.3→1.2 | 20.3→17.0 |
| 88–90 | 47.57→48.03 | 2.9→1.5 | 20.4→20.0 |

Both arms still slowed late. These intervals are **not matched wave phases**: different publication cadence advances different sea clocks. Absolute `seaTimeBins` are emitted by the survey only in diagnostic GPU mode, which was intentionally disabled; raw per-publication streams and absolute starting sea clocks were not retained. Exact same-sea-time bins cannot be reconstructed from this archive. [Derived summary](summary.json) preserves selected wall bins, partial tails and their source hashes without relabeling them.

## Durable authority and limits

[source](source/) contains the exact harness, guarded survey derivation/patch, ready 7176fb1e… authority, historical prepared plan, public whitelist and build bindings. Preparation's NOT_RUN language is unchanged history; later evidence records the executed phases. [Checks](checks/verification-proof.json) retain four sequential successful syntax checks and both local plan checks, actual commands/logs, and the 575-input before/after inventory. Empty logs and identical inventories use exact aliases.

[Baseline raw FPS](run/baseline/fps.json.gz) and [candidate raw FPS](run/candidate/fps.json.gz), native audits, launcher records and original stdout are losslessly compressed with gzip mtime 0. [Manifest](manifest.json) pins30 original payloads /34 original paths by stored and expanded SHA-256. It references the existing [two-arm compiled archive](../contact-height-demand-build/README.md), source closure and [functional/cost](../contact-height-demand-prototype/README.md) /[integration](../contact-height-demand-integration/README.md) checkpoints instead of copying their sources or bundles. The 38 public Git assets are pinned by `source/public-assets.json` and were served read-only; they are not copied.

This pair does not prove moving-tube quality, cavity/seam behavior, later physics-epoch equivalence, steady 60 Hz simulation or default adoption. Archival bookkeeping introduced no runtime change, new test, benchmark, browser/server/GPU operation or Git mutation.
