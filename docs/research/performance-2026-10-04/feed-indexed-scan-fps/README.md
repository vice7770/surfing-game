# Indexed SideFeed: native FPS held unadopted after both orders

Root's final decision is **HOLD / unadopted**. Device packing improved in both orders, but these ordinary native pairs showed no useful whole-game gain. Runtime remains `b0e003b8670c9d0be83bc9bb24c30b5382a54499`; no production source, adoption checks or build is claimed here.

Values in each cell below are **b0 baseline / indexed candidate**, irrespective of run order.

| Actual order | Fresh snapshots/s | Simulation/wall | Worker total p50, ms | Worker total p95, ms | Complete 88s bin, fresh/s |
| --- | ---: | ---: | ---: | ---: | ---: |
| AB: baseline → candidate | 59.58 / 58.72 | 0.993 / 0.979 | 15.6 / 16.2 | 19.2 / 20.9 | 60.07 / 46.98 |
| BA: candidate → baseline | 58.3 / 59.14 | 0.972 / 0.986 | 15.7 / 15.7 | 20.7 / 20.6 | 43.67 / 55.82 |

Candidate minus baseline fresh cadence was −0.86 Hz in AB and +0.84 Hz in BA. The simple equal-weight means of the already rounded per-run rates are baseline 58.94/candidate 58.93 Hz. This is descriptive only: it is not a pooled event rate, pooled timestamps, quantiles, matched-phase result or confidence estimate. Both displayed at 60 FPS. Ordering/session variation is unresolved; no temperature, causal regression or single-mechanism claim follows. Sustained60 physics and the user’s overall goal remain unproved.

In AB, device pack p50/p95 improved1.1/1.4→0.8/1.0ms and encode0.6/1.0→0.5/1.0ms, while map3.9/8.1→5.1/9.8ms. Render p95/worst18.3/66.8→25.0/65.4ms and snapshot p95/worst19.8/59.7→21.6/67.1ms. In BA, candidate versus baseline pack was0.8/1.0 versus1.2/1.5ms, encode0.5/1.0 versus0.6/1.2ms, and map4.6/9.5 versus3.7/8.6ms. Candidate versus baseline render p95/worst was25.3/75.0 versus24.6/74.2ms; snapshot p95/worst21.7/81.3 versus21.5/68.6ms. Stage quantiles are neither request latency nor additive headroom. [summary.json](summary.json) preserves each order's full reported stage dictionaries and late78–88s bins; the original reports retain every bin, including the partial trailing90s bin. No percentiles are pooled.

## Ordinary scope and reverse-order control

Both orders used Surf→Padang→Big→Paddle out, an idle rider, five warm seconds and90 passive sample seconds, numeric60 cap, High/Rich graphics, 116,000 GPU cells, dx2/fine1,64 components/render2/mask1/four authored cases, accepted prefetch and actual one-step publication. Native inner1708×879, DPR2, canvas2989×1538/render pixel ratio1.75 remained exact without resizing. Original page-only RNG bootstrap was retained; worker RNG was unchanged. No diagnostic GPU profiler/timer, lowered resolution, contact intervention, synthetic stepping or active rider inputs were introduced.

The separately predeclared reverse runner reused the same source, compiled outputs, BUILD_ID306258296 and unchanged survey/native launcher/passive guard. Candidate-first used the prior AB baseline FPS solely for exact native tuple/settings validation; baseline-second used the just-produced candidate FPS likewise. The unchanged survey's BASELINE_RIDE value is otherwise unused. No prior measurement samples or historical fields were merged. The narrow runner diff and its self-SHA/readiness guard are retained alongside the original runner; the reverse pair is an order control, not a selective retry or phase match.

## Source, build and parent evidence

Only SideFeed.deviceShape's for-of loop becomes an ascending indexed scan over the same native Float64Array and strict `weight > 0` predicate. Every original call still scans the current mutable weights. Original SideFeed10,038B/ebdfb692… becomes virtual10,085B/ac2b896d… . GpuBoussinesq remains literal41e21260… and the prior component-cache candidate is excluded. Whole-project TypeScript uses one compiler-host readFile substitution; Vite uses canonical paths and fresh main/worker pre-load instances, private outDir/cache and configLoader=runner, without public or source copies. [identity-map.json](identity-map.json) binds the single virtual target through original readiness, strict/build/load metadata, arm manifests, bindings, served outputs, actual worker URLs and both orders' FPS records.

Baseline directly reused eleven accepted [full-writer](../full-snapshot-writer/README.md) ALT outputs. Its worker is448,078B/b711e16b…; candidate448,098B/3d48c3c1… . All22 output identities remain external; changed import-linked filenames are not additional source edits. The [indexed CPU archive](../feed-indexed-scan-cpu/README.md) owns ten protocol cases and32/32 positive complete mock-host cost pairs. Its1.866ms mean gain is not native GPU/FPS evidence; the unchanged CFL phase also differed. Those cases/cost were not rerun by this archive or native gate. The [component-cache native archive](../feed-components-cache-fps/README.md) supplies unchanged survey/native/guard/public/dependency/source identity aliases, while its runtime candidate remains unadopted and excluded.

Actual indexed preparation completed eight commands: strict→candidate-only build→binding→four syntax checks→unarmed runner, 07:26:16.48–07:26:23.61 UTC, root session10126 closed0;668 input pins and zero links stayed unchanged. Reverse syntax and unarmed commands passed07:35:00.124–07:35:00.427 UTC. Historical source-only flags in original readiness/plan/freeze payloads describe preparation before those gates; they are preserved verbatim. Unused scratch adoption-plan work is excluded and supplies no old production-test claim.

## Completion, closure and storage

AB completed valid07:26:53.782–07:30:52.323 UTC, root session90735 closed0; BA completed valid07:35:10.606–07:39:07.883 UTC, root session91537 closed0. Each stored arm terminal exited0 and the first arm fully closed before the second began. Original launcher/pair evidence retains owned browser closure and server/CDP `ECONNREFUSED`. Separate root closure files are retained:07:31:07.784 UTC for4243/9653/4244/9654/4200, and07:39:38.863 UTC for4245/9655/4246/9656/4200. Port5173 was untouched. This archive opens no port and performs no new closure probe. [root-coordination.json](root-coordination.json) attributes outer sessions and links exact persisted evidence.

Original gate/reverse source, preparation/compiled metadata, command logs, pair reports and all four FPS/native-audit/launcher/stdout sets are exact inert .txt/.gz payloads. Equal raw bytes and before/after inventories are deduplicated by alias. Unchanged source/helper/CPU inputs reuse hash-bound parent archive aliases. No dist/public/dependency/canonical source tree or capture/export is copied; original absolute aliases and parent identity declarations remain recorded.

## Byte verification

`python3 docs/research/performance-2026-10-04/feed-indexed-scan-fps/verify.py` checks stored/expanded/original aliases, pinned parent declarations, source/compiled/served chains, actual gate outcomes and native/config/idle/one-step/resource guards, available publication-count/1/60 arithmetic and per-order reported summaries. Optional `--originals` checks retained original paths too. It performs no game import, replay, build, metric reconstruction, browser, network or FPS rerun.

Retained reports contain quantiles and aggregate bins, not all individual frame samples/publication timestamps. The verifier cannot reconstruct percentiles or exact wall-span denominators. It does not pool rates/timestamps/quantiles or infer a new confidence interval. All actual late bins remain available and the partial90s bin is distinguished from complete88s.
