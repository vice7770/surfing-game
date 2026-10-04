# Full late water fallback: ordinary FPS gate on hold

The single ordinary native baseline→fallback pair is valid, but the candidate remains **HOLD, not adopted**. It preserves the accepted prefetch worker and uses only the six retained renderer overlays. The separate [prescribed component proof](../screen-fallback-current/README.md) establishes sampled coverage/lifecycle behaviour, with explicit uncertain-air limits; this performance trial provides no additional visual or physical acceptance.

| Metric | Accepted baseline | Full fallback |
| --- | ---: | ---: |
| Rendered frames/s | 60 | 60 |
| Fresh snapshots/s | 57.51 | 57.06 |
| Simulated/wall time | .959 | .951 |
| Render p95 / p99 / maximum, ms | 24.3 / 25.6 / 41.8 | 25.0 / 26.1 / 83.9 |
| Snapshot interval maximum, ms | 53.6 | 69.8 |
| Pipeline total p50 / p95, ms | 16.5 / 21.7 | 16.3 / 21.7 |
| Median rendered triangles | 1,149,313 | 1,426,305 |
| Rendered draw calls | 54 | 56 |

The median triangle increase is 276,992 (+24.1%), with two added draw calls. One baseline-first pair does not isolate the cause of either the small throughput decrease or maxima. The original survey's RAF `fps` is about 120; rendered-frame counters above measure actual capped 60 Hz draws. Pipeline totals are worker-reported and distinct from render intervals.

Late complete two-second **wall-time** bins from 80–88 s slow in both arms: baseline fresh rates 50.56, 50.77, 46.88, 40.24, 42.17 Hz; fallback 51.21, 48.32, 50.53, 43.25, 44.77 Hz. They are independent elapsed-time bins, not matched sea clocks or exact tube phases. The boundary bin at 90 s is excluded from this comparison. These observations reopen sustained-throughput questions; they do not reverse the separately validated historical prefetch result.

Both arms preserve the ordinary route, five warm seconds and 90 measured seconds, High/Rich/high-particles/pixel-normals settings, native CSS1708×879/DPR2/render-pixel-ratio1.75/canvas2989×1538, Padang Big seed8761/Hs3.8/T18/spread150/C64, dx2/fine1/render2, GPU116,000 cells, maxBatch1 and actual `soloOneStep:true`. The actual worker is byte-exact `e08444a9b72f73d62126a2e4b503092bc6e3cc7536d714a2e49743ed1293f480` in both arms. Every observed publication advances one unchanged 1/60-second physics step; no duplicate/backward/nonintegral deltas occur. The canonical page-only seed bootstrap is disclosed in retained survey/preparation metadata; the worker RNG and actual input arguments are unmodified. Menu practice workers are excluded by the native guard.

The root-owned operation runs 04:21:06.575–04:25:06.859 UTC, baseline before candidate, with no profiler/GPU timer, input or reflex override, runtime query injection or contact drains. Exact guards, served hashes, source before/after and both owned Chrome/server/CDP/4200 closures pass. User port5173 is untouched. This is one sample, not steady60 physics proof.

[Summary](summary.json) is derived from exact retained raw results. [Manifest](manifest.json) preserves all small preparation sources/notes, ready/launch/build/source/public/dependency authority, checks/logs, actual root-run records and both arm build manifests with original/stored/decompressed hashes and deduplication. It copies no baseline/candidate source trees, compiled bundles, caches, node_modules or public assets. The 552/553 source records, 11+11 compiled outputs and 38 shared public assets remain metadata references. `python3 verify.py --originals` verifies archived bytes and still-available originals without running the game, a benchmark or numerical replay.
