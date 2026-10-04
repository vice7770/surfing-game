# Indexed side-feed scan: source and CPU evidence

The one-loop candidate passes the recorded ten-case host proof and the predeclared complete-call CPU cost gate. Its 32 paired complete mock-host steps have a median saving of **1.8648965 ms**, mean **1.8660391 ms**, and approximate paired-mean lower95 bound **1.8134999 ms**. This archive contains source and CPU evidence only. Native GPU physics, native timing, FPS, visual quality and production adoption are unproven here.

The base is runtime `b0e003b8670c9d0be83bc9bb24c30b5382a54499`. The separate component-count cache is excluded. Canonical code, exported `writeParams`, uniforms, queue calls, shaders, fields, substeps and adoption arithmetic are unchanged. Only `SideFeed.deviceShape()` changes from iterating weights with `for-of` to an ascending indexed `weight > 0` scan over the same local array reference. Every original call still recomputes the slots dynamically; there is no cache state or ownership grant.

The original [source proposal](evidence/proposal.md) and [one-loop transform](evidence/patch-source.mjs.txt) are retained verbatim. The [source-ready record](evidence/ready.json.gz) has SHA-256 `dff888a1445e61edf7c96af1148a67c48b07cbde62bcb3b7c5d7c613e6d40d4d`. Its original source-only statements remain unchanged: the author performed no checks or numerical execution during preparation. Root subsequently executed the recorded gates below. No source version or gate attempt was overwritten.

## Recorded root gates

All times are UTC on 2026-10-04. Each gate closes with exit0 and exact before/after input pins.

| Gate | Start → end | Pins | Result |
|---|---|---:|---|
| Strict typing, two syntax checks, bundle, two unarmed entries | 07:22:37.593970 → 07:22:39.963411 | 67 | Six commands pass; no numerical work in this gate |
| One complete host proof | 07:23:08.385232 → 07:23:10.720135 | 71 | Ten cases pass |
| One complete paired CPU cost run | 07:23:20.190847 → 07:23:22.434594 | 73 | 32 measured pairs pass useful-gain condition |

Root parent PIDs are 57406, 57593 and 57675; the proof/cost children are 57632 and 57686. The checks sequence has a 30-second whole-parent deadline; proof and cost each have a 20-second whole-parent deadline. Cost also retains its 15-second internal limit and reports 2105.36575 ms for its complete operation. The [root gate wrapper](evidence/gates.py.txt), original pin ledgers, command logs and terminal records are losslessly retained by [manifest.json](manifest.json). Archive verification does not rerun any command.

## Proof scope

The ten actual canonical SideFeed/solver cases compare ordered queue write element offsets, lengths and payloads; encoder/copy/map protocol; all mock GPU buffer sizes, lifetimes and bytes; all nine CPU destinations and their identities; logical clocks, plunge aging/version, substeps and resulting CFL feedback. Large held-case queue payloads are hashes, alongside exact final buffer/state byte comparisons.

The added native-F64 special-value case requires count 5→4→5→0 under direct public edits without layout invalidation. Positive subnormals, finite positives and +Infinity count; negatives, -Infinity, zero, -0 and NaN do not. Shape calls preserve all weight bits and identities. Public uniform words reflect each mutation. Real weights are restored before any device table upload, then the complete queue/state proof runs. Synthetic positive weights at invalid strip-table locations are never uploaded.

The other nine cases cover component counts 1/7/64, individual/all-zero/restored weights with and without refresh, baseline stale cached-dispatch behavior, window shifts, time offsets and generic uniforms, zero-slot creation/restoration, no-feed, deferred commit with injected recognizable RATEH/NU and actual peak/CFL/plunge feedback, multiple substeps, discard/rebase, map rejection/recovery, diagnostic no-readback, and actual held-size initial/steady steps. [Proof report](evidence/proof-first/report.json) SHA-256 is `361b4dd8fb66f8749239a339df1427759f4cd38a7c2ba34e43e8009285b2a086`.

The supported array is SideFeed's constructor-owned native non-detached Float64Array. This is not a universal JavaScript claim for customized `Symbol.iterator`, runtime replacement of the readonly property, detached buffers or prototype monkey-patching. Those paths are neither used nor supported by the inspected source; deviceTables already indexes the same numerical weights.

## Complete-call CPU measurement

Each arm independently imports the same retained Padang Big committed F32 SET1 export: seed 8761, 64 components, 160×725 = 116,000 cells. Solver time is 52.69999999999905; paused sea time 328.04104655763683 includes offset 275.34104655763775. This export is at a distinct paused epoch from the earlier incomplete five-draw capture. Original capture/report and compressed export are reused through the [parent CPU archive](../feed-components-cache-cpu/manifest.json), with their existing [live-capture archive](../../tube-stability-2026-10-04/live-big-capture/manifest.json) aliases. No large fixture is copied here.

SET1 omits RATEH and NU, so both begin at constructor defaults. Its F32 transport does not restore full historical F64 state. Mock dispatches are no-ops: h/q recirculate and the held fields do not evolve physically. All timed pairs use one substep; the independent injected-output proof exercises multiple-substep feedback but supplies no such timing estimate.

After eight fixed warm pairs, the sole run measures 32 pairs in AB/BA/BA/AB order. Each timed await is the original complete ordinary `GpuBoussinesq.step(1/60)` host path: upload conversions and mock memory queue writes, fresh slot scans, original CFL, actual dispatch bookkeeping, nine readback copies, map microtask, unpack and viscosity/plunge/clock adoption. Intake, construction, byte comparisons, hashing and statistics are outside timed calls. Real WGSL/GPU execution, driver stalls, renderer, worker publication/FPS and post-water physical consumers are excluded.

| Independently recomputed row statistic | Milliseconds |
|---|---:|
| Baseline / candidate complete-call means | 4.98626425 / 3.12022519 |
| Paired mean / median saving | 1.86603906 / 1.86489650 |
| Approximate paired-mean lower95 bound | 1.81349991 |
| AB / BA mean saving, 16 pairs each | 1.85072662 / 1.88135150 |
| First 16 / last 16 mean saving | 1.85415619 / 1.87792194 |
| Minimum / maximum paired saving | 1.546292 / 2.267333 |

All 32 pairs save time and preserve exact final device/solver state, identities and clocks. The stored arithmetic recomputes exactly and exceeds the predeclared 0.1 ms lower-bound and both order-stratum mean thresholds. This normal approximation describes one short fixed CPU sample; it is not a population confidence claim.

Mean stage differences are pack +0.807330 ms, encode +0.811591 ms, CFL +0.278763 ms, map +0.003164 ms and unpack −0.032888 ms. Pack/encode contain the two steady shape scans affected by this b0 candidate. The unchanged CFL phase also times differently, so the full 1.866 ms mean must not be attributed solely to iterator mechanics. No component quantiles are combined to infer total savings. The [raw cost report](evidence/cost-first/report.json.gz), SHA-256 `a572a0699ebfe34ff1eeed3146327586ae07153767716067c21f50140aaa9ef0`, and [independent arithmetic summary](summary.json) preserve that distinction. Passing this CPU gate only supports considering a separate native comparison.

## Archive verification

Run `python3 docs/research/performance-2026-10-04/feed-indexed-scan-cpu/verify.py` from the repository. The verifier checks retained bytes, lossless gzip expansions, hash-bound parent identity declarations, recorded outcomes and stored-row arithmetic only. It also checks the existing archived capture-report and compressed SET1 transport bytes, expanding only the JSON report and never decoding the numerical SET1 arrays. It imports no game modules, performs no replay/build/test/benchmark/browser operation, and does not hash current external compiled bundles or toolchains. Parent-declared b0 Git/package/baseline identities are references, rather than a repeated verification of their entire external closure.

Three new compiled output identities are retained in compiled.json and the manifest; their bundles are not copied. Literal b0 baseline is the original 721,883-byte module, SHA-256 `be402e6324eb89ee70cefc45497f04c4dfbedf674c422f0dd5e09ab89539c262`. Indexed candidate is 721,928 bytes, SHA-256 `ebf2ba1cb014ad3e05d99a476f96459a2f8ec841fdd5a660549b54c5885b3e72`. Transformed SideFeed source is 10,085 bytes, SHA-256 `ac2b896d945ebdaf8b0530bd3ed515a7701d16c078991d93ca3a5870b3687dd2`.

Sources, tests and wrappers have inert `.txt` or `.txt.gz` aliases. Original metadata, logs, reports and source-only status fields are unchanged. Root owns canonical source, index and any later adoption. This archive author performed byte/arithmetic inspection and archival verification only.
