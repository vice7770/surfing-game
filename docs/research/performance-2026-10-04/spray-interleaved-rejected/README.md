# Spray interleaving: rejected for insufficient saving

The one bounded CPU experiment passed compatibility checks but saved too little to adopt. At synthetic Rich count 4,096, the paired median complete-update saving was **0.010479 ms**, below the predeclared **0.1 ms** native-gate threshold. All 96 pairs at that condition were positive. The candidate remains scratch-only: no native pixel gate, FPS gate or production adoption followed.

| Synthetic input count | Look | Baseline median (ms) | Candidate median (ms) | Paired median saving (ms) | Positive pairs |
| ---: | --- | ---: | ---: | ---: | ---: |
| 64 | Rich | 0.0009375 | 0.000646 | 0.000250 | 85/96 |
| 64 | Classic | 0.0005415 | 0.0003955 | 0.000125 | 76/96 |
| 512 | Rich | 0.003125 | 0.000750 | 0.001958 | 95/96 |
| 512 | Classic | 0.001125 | 0.0015625 | −0.000167 | 34/96 |
| 4,096 | Rich | 0.012209 | 0.0019795 | 0.010479 | 96/96 |
| 4,096 | Classic | 0.007083 | 0.007250 | −0.0000835 | 24/96 |
| 5,120 | Rich | 0.015250 | 0.002459 | 0.013042 | 96/96 |
| 5,120 | Classic | 0.008833 | 0.008916 | −0.000084 | 28/96 |

Positive means baseline time minus candidate time is greater than zero. The median of paired savings is computed from each pair, separately from the two call medians. Classic filters kind ≥2, so its actual drawn counts are 26, 206, 1,639 and 2,048. Its median differences are below one microsecond and do not establish a large regression or a cause of late worker cadence. The raw rows, outliers, means, p95 and AB/BA strata remain in the [actual cost report](evidence/cost-first.json.gz); [results-summary.json](results-summary.json) is a derived convenience record. This is one CPU experiment, without an FPS or worker-physics claim.

The candidate replaced three owned dynamic particle attributes with one persistent owned stride-6 Float32 interleaved buffer. Position/look/kind use offsets 0/3/5. Rich copies complete records with typed-array `set`; Classic retains stable filtering and scalar Float32 stores. Installed Three.js normalizes shared attributes to their data owner, giving one upload instead of three. GPU payload remains 24 bytes per drawn particle; upload, vertex fetch, rasterization and shaders were excluded from the cost timing.

The complete `SprayPoints.update` call was timed on persistent baseline/candidate instances with capacity 5,120. Eight finite synthetic conditions used 12 warm pairs and 24 ABBA blocks of four pairs each: 96 measured pairs per condition, **768 total**. Equality checks, source construction and constructors were outside call timing. The root parent imposed a 20-second whole-process bound. Its sole process (PID 41352) exited 0 from **06:29:01.407812 to 06:29:01.797924 UTC**; the report's bounded in-process work elapsed **159.88025 ms**. Root retained 126 exact before/after pins. There was no second cost run.

Nine portable tests passed, including the actual installed Three WebGLAttributes implementation through mock GL. They cover shared layout, normal finite word equality, stable Classic filtering, capacity, shrink/zero ranges and versions, look/shader/uniform parity, persistent source-independent ownership and detach, malformed count fallback, logical Float32 special values, and upload count/bytes. All eight cost conditions retained exact active/inactive normal particle words, immutable input, persistent ownership and identical shader bytes. **NaN parity is logical, not universal raw payload parity**: native Float32 copies can preserve NaN payload encodings that scalar Float32 reads/writes quiet. The experiment makes no universal NaN-bit claim.

## Preserved failed gate and repaired preparation

The original [source-only readiness](evidence/source-v0/ready.json.gz) has SHA256 `b6704c3b1b9a3e62f3ffa52bbca9c233ff83f6e2b1f701d59715aa8fd362b892`. Root's first strict command failed with cost.ts TS7034 at line 65 and TS7005 at line 73: `rows` had an implicit `any[]` type. The [original terminal](evidence/root-cpu/terminal.json), [error log](evidence/root-cpu/command-0.log) and 104 before-pins remain verbatim. No portable tests, bundle or cost had run at that failure. The independently frozen `source-v0` contains all 20 original payload aliases plus its preservation manifest; identical bytes are deduplicated while every original path/byte/SHA alias is retained.

The sole harness repair added the explicit measured-row element type. Runtime statements, candidate, baseline, test cases, timing and conditions remained unchanged. Repaired source-ready SHA256 is `8b69b0c0c565ad7b9508bf34277d7757f249bb45d8d065e87f3bd718a87b81b1`; its historical unexecuted flags are preserved, not rewritten after execution. Current actual results are recorded here and in the separate terminals. Root's strict, nine portable tests and bundle passed from **06:28:11.998206 to 06:28:14.910747 UTC**, with 125 unchanged pins. The pinned 59,804-byte cost bundle is retained as inert text (SHA256 `3a698ac71725d62772c9792b100c70545b720c6c51ca907159b39c6efd09a349`). Actual cost report: 174,272 bytes, SHA256 `5bc66bc5f10336e11b9237db33957268cef8eaf6b8bfa818477e5ef8506c8048`.

## Separate observed count

The earlier [actual Big capture](../../tube-stability-2026-10-04/live-big-capture/README.md) retained **three actually drawn status spray counts of 4,096**. Its report SHA256 is `46167994db8c914e2b7be44032e440d74585624dbcc3e68b49cfdcf4ca495988`. That capture failed the requested five-state requirement and supplied no held view, pixel comparison or FPS acceptance. The [separate count supplement](observed-count-supplement.json) points to its existing immutable archive; it does not recopy its geometry or rewrite the original preparation's unknown ordinary-count scope. The cost input at count 4,096 remains synthetic finite data, distinct from those actual particle buffers.

## Archive and verification

[manifest.json](manifest.json) binds stored/expanded hashes, all original aliases, closure authorities and exact external references. Source/test/harness/bundle files have inert `.txt` suffixes; no archived test can be discovered by Vitest. Generated gzip has deterministic `mtime=0`; original payload bytes are reproduced exactly after expansion. Original paths are provenance aliases, not instructions. References to a formerly original cost.ts or ready.json resolve by the original SHA, independently of the later file at that path.

The 75 canonical import sources stay external as immutable Git blobs at **b0e003b8670c9d0be83bc9bb24c30b5382a54499**. Small dependency metadata, original Three plumbing and the two actual Three ESM runtime supplements are frozen here; no full toolchain, public assets or canonical source tree is copied. The existing exact live-capture source-authority and count-report archives are external aliases.

Run `python3 verify.py` to hash stored/expanded/alias/generated records, resolve source-pin closures and derive statistics from the existing 768 report rows. Add `--external` to hash all 75 exact committed Git blobs and the two adjacent archive aliases. The verifier's only external command is read-only `git cat-file --batch`. [verification.json](verification.json) records archive verification, not a new performance experiment. It imports no game module and runs no harness, tests, benchmark, browser or GPU work.

The candidate is rejected solely for failing the declared usefulness gate. Its normal-field compatibility result does not change that decision, establish optical acceptance, or explain the unresolved late ordinary worker cadence around 40 Hz. This archive makes no production change.
