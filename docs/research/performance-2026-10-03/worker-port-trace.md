# Worker receipt/flush trace: little time outside the pipeline

Root ran one 90-second observational diagnostic on immutable port 4201; owned Chrome closed cleanly. Ordinary Padang Big validation passed: seed 8761, High/Rich/High particles, 64 components, original pixel normals, browser DPR 2 and render pixel ratio 1.75, viewport 1708 × 926 and buffer 2989 × 1620. Default one-step publication remained unchanged. The observer reported 60 drawn FPS, 57.13 fresh publications/physics steps per wall second and 0.952 simulation progress. **This is an instrumented diagnostic, not a passive cadence comparison.** No third buffer, worker queue or production source change was tested.

The [QA driver](worker-port-trace-driver.mjs) forwards original requests and transfer lists. It records sends and receipts on the same main-thread clock, and wraps the actual `onmessage` callback through the native setter, preserving getter/`this`/event/return behavior. `try/finally` records its exact callback boundaries; the earlier microtask design was removed. Its timestamp/metadata allocations and forwarding callback perturb execution.

The [pure postprocessor](worker-port-trace-analysis.mjs) validated all **5,140 recorded rows**: matching host port, one worker, request steps = pipeline batch steps = in-flight steps = 1, increasing request IDs/sea clocks, fixed-step clock deltas, timestamp order, pending counts and every retained inline next-send ID/time against the next request row. No negative paired residual occurred. It analyzed **5,138 interior rows**, excluding recorded boundary requests 276 and 5415 conservatively. The final inline send 5416 has no retained receipt. The driver had already omitted any response whose request predates sampling; it did not record that omitted count. There were 5,133 valid backlogged cycles and five interior receipts with no pending step.

Each difference is formed on its matched request before quantiles are calculated. In particular, independent latency/pipeline medians must not be subtracted.

| Overall milliseconds | p50 | p95 | p99 | Mean |
| --- | ---: | ---: | ---: | ---: |
| Send → receipt | 16.900 | 23.500 | 26.400 | 17.489 |
| Matched worker pipeline | 16.600 | 23.100 | 26.100 | 17.234 |
| **Paired latency − pipeline** | **0.200** | **0.500** | **1.200** | **0.255** |
| Queued receipt → inline next send | 0.000 | 0.100 | 0.100 | 0.012 |
| Actual host callback duration | 0.000 | 0.100 | 0.100 | 0.031 |
| Backlogged cycle − pipeline | 0.200 | 0.500 | 1.300 | 0.267 |

Zero callback/gap medians reflect approximately 0.1 ms clock granularity, not literally zero work. Across complete backlogged cycles, only **1.527% of summed cycle wall time** lies outside the recorded worker pipeline. That remainder includes send transfer/serialization, worker receive scheduling, reply transport, main delivery scheduling, uninstrumented bookkeeping and observer effects. It is not a separated worker-idle measurement. The pipeline includes device/map wall waiting and is not CPU-active time.

All ten-second sea bins are retained. Late analysis was declared as relative sea ≥60 seconds, rather than chosen from large residuals. In those 1,538 rows, paired non-pipeline latency p50/p95/p99/mean was 0.200/0.600/1.400/0.276 ms; queued handoff mean was 0.0099 ms and outside-pipeline cycle share was 1.531%. The growing late cost was mostly inside the matched pipeline:

| Relative sea bin | Rows | Pipeline mean | Paired non-pipeline mean | Queued gap mean |
| --- | ---: | ---: | ---: | ---: |
| 60–70 s | 600 | 16.752 ms | 0.235 ms | 0.0085 ms |
| 70–80 s | 600 | 18.981 ms | 0.289 ms | 0.0118 ms |
| 80–90 s, partial | 338 | 20.292 ms | 0.328 ms | 0.0089 ms |

**Conclusion:** this trace does not establish a large round-trip opportunity or justify the additional serial queue, buffer ownership, earlier input commitment and event/barrier complexity described in the [source audit](worker-pipeline-audit.md). Even the measured outside-pipeline time is not all necessarily removable. No queue saving or future FPS guarantee is asserted, and no repeat diagnostic was run.

The [raw capture](worker-port-trace.json.gz) and [summary](worker-port-trace-summary.json.gz) are deterministic gzip archives; decompression reproduces the original JSON bytes exactly. They occupy 397,390 and 195,426 bytes, respectively. The summary contains every paired interior row, p50/p95/p99/means, all sea bins, guards, source manifest and limitations. [Archival hashes and byte-parity verification](worker-port-trace-archive.json) distinguish content hashes from compressed-file hashes. The tmp plaintext originals remain. Provenance:

| Artifact | SHA-256 |
| --- | --- |
| Raw capture | `30dfce43514acc964d288b514ee07e96724f654a5680b89eddfac6f9c54ad406` |
| QA callback/driver | `25baf3bacb3ffb4c924cab8485bed1a0dde71d50f2925ac17b3e3399ba6d6a38` |
| Original FPS harness source | `84e580b651e8ec1dcd028599d1c931b5d96a4e50c1299f9cdf38ee78dbf5d5cd` |
| Derived observational harness | `0d7804b6a531af0dfe5c71c227a545e285a4f5e2d4d8562b7b10494f8ffee53c` |
| Original summary-producing postprocessor | `5d0b5ee5f6c1bac75b649c7383635e7bbc0c885ba7f889e45466fd158b5ecb39` |
| Updated gzip-reading postprocessor | `1c095d954d724f4807d320e046be5afa3e7aaf8ec576f61c8ccbd946c6e9aaa1` |
| Compressed raw file | `c96d14393e5ac3ed24196f9632527bb7b4c0199e227faac201182c220fbf6109` |
| Compressed summary file | `f57f782c4ef3fdbff11231618e163f02c8ecdbce7e75b89ccb6bff4adeb2b6af` |
| Frozen aggregate index/JS/CSS | `7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3` |
| Frozen worker `surfZoneWorker-BH6FhcTP.js` | `eb1a337b66c0eea19035241aee1c46a129a039548e21916d428a6a1a50d2d3c5` |

Recompute statistics without opening a browser:

```sh
node docs/research/performance-2026-10-03/worker-port-trace-analysis.mjs --in=docs/research/performance-2026-10-03/worker-port-trace.json.gz --out=/private/tmp/worker-port-trace-summary-regenerated.json
```
