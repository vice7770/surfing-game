# Component-count cache: native passive pair held unadopted

Root's decision is **HOLD / unadopted**. The packing bin improved, but displayed FPS stayed at 60 and the pair did not show a whole-path improvement. This archive records the completed experiment; it does not adopt the cache or claim a main-branch merge.

| Recorded metric | b0 baseline | Component cache |
| --- | ---: | ---: |
| Rendered FPS | 60 | 60 |
| Fresh snapshots/s | 59.31 | 58.61 |
| Simulation seconds/wall second | 0.988 | 0.977 |
| Device pack p50 / p95, ms | 1.1 / 1.4 | 0.7 / 1.0 |
| Worker total p50 / p95, ms | 15.3 / 19.3 | 16.0 / 20.8 |
| Render interval p95 / worst, ms | 18.2 / 68.5 | 25.2 / 66.7 |
| Snapshot interval p95 / worst, ms | 20.0 / 72.4 | 22.3 / 78.7 |
| Fresh snapshots/s, bin starting 86 s | 59.60 | 47.96 |
| Fresh snapshots/s, bin starting 88 s | 54.57 | 50.39 |

These are original report summaries. This was one serial pair, baseline first, with five warm seconds and 90 passive sample seconds per arm. Wall-time bins are not matched physical phases. It establishes neither a causal regression nor an order/temperature-independent result. Last-step stage quantiles are neither request latency nor additive headroom. Rendered cadence, fresh publications and sea-time progression measure different things; the roughly 120 callback/s counter is not displayed FPS.

Both arms used the ordinary Surf → Padang → Big → Paddle out route and an idle rider, High/Rich graphics, seed 8761, 64 components and 116,000 GPU cells. Native inner size was 1708×879, DPR 2, canvas backing 2989×1538 and render pixel ratio 1.75, with no resize. Fixed publication steps remained 1/60, max batch one and actual advancement one; internal device CFL substeps could vary. Original page RNG bootstrap remained; worker RNG was unchanged. There was no profiler, GPU timer query, contact intervention, synthetic stepping, held-state replay or active player-input workload.

## Source, build and served authority

The runtime baseline is `b0e003b8670c9d0be83bc9bb24c30b5382a54499`; docs checkpoint `4a2657bea` is historical context. The [CPU archive](../feed-components-cache-cpu/README.md) owns the three-edit source transform, proof and local CPU cost evidence. The supported cache scope is the real constructor-fixed SideFeed class; dynamic `deviceShape()` overrides are outside it. Mutable public weights/window/layout behavior and literal exported `writeParams` are preserved.

The native source manifest retains 554 literal baseline source identities in each arm. The candidate build virtually substitutes only [GpuBoussinesq.ts](../../../../src/wave/gpu/GpuBoussinesq.ts): original 23,863 B / `41e212604f0d7b889445edb17a05f38edf5044f66dceaa9eddaee4ebf69d8094`, candidate 24,025 B / `c3fd4e6c7b5f21411cea25caad13bc54ceae31c1ad0ade9fffc0c454172cde92`. The recorded load is in the worker realm. Source arrays remain literal b0; the virtual target is described separately. No source tree was copied or changed for the native build.

Both arms use BUILD_ID `306258296`. Baseline directly reused all 11 accepted b0 outputs from [full-snapshot-writer](../full-snapshot-writer/README.md). Its actual worker was `surfZoneWorker-XSUZFAPK.js`, 448,078 B / `b711e16bf2b92e17507b0fccfd2d9a6e6b517a7b9e7f7ce4656fdaf0b95e1114`. Candidate's worker was `surfZoneWorker-B3bMoB5b.js`, 448,124 B / `9f6d1618678ecf8679c6bea160a0398afc90db3a0d372ca129cf6a6876256819`. All 11 output identities per arm are bound through ready → source manifest → build terminal → arm manifests → bindings → compiled-served rows → actual worker URL/audit/FPS artifact records. Dependent chunk filenames change with import-link rewriting; that does not imply additional runtime edits. [identity-map.json](identity-map.json) preserves this chain and original dist aliases. Compiled contents are identity references, not duplicated bundle bytes.

New provenance sources and wrappers are inert `.txt` files. Byte-identical survey/native-owned/passive-guard/public-assets metadata, CPU inputs and prior build authority are reused through their existing archive aliases. The archive stores original ready/freeze/plan/derivation/bindings/build/check metadata and logs, final pair report and both FPS/native-audit/launcher/stdout sets. It contains no source tree, dependencies, public assets, dist tree or capture fixture copies. Historical source-only flags describe preparation before root's later execution.

## Completion and closure

The pair report is valid and complete: 2026-10-04 **07:18:00.899–07:21:59.243 UTC**. Root reports outer session 1168 `CLOSED0`; each stored arm terminal exited zero. Baseline fully closed before candidate began. The stored pair and launcher evidence records `ECONNREFUSED` for owned server/CDP closure and port 4200 checks.

[root-coordination.json](root-coordination.json) separately attributes root's independent elevated TCP verification after **07:21:59.243** and before **07:22:37.593970 UTC**: ports **4241, 9651, 4242, 9652 and 4200** each reported `closed: true, reason: ECONNREFUSED`. Root corrected its earlier approximate time using the tool sequence. No standalone timestamp artifact was saved, so this is an attributed bounded interval rather than a fabricated tool log. Earlier sandbox checks returned `EPERM` and supplied no closure evidence. This archive performs no new port/browser/native checks. Root owns the performance index, Git and any future adoption decision.

## Byte and arithmetic verification

`python3 docs/research/performance-2026-10-04/feed-components-cache-fps/verify.py` checks archived and reused byte identities, b0 Git identities, the exact literal source transformation without importing it, pin-reference closure, recorded strict/build/check outcomes, all build/served identities, native/idle/one-step/closure guards, publication-count and 1/60-step arithmetic, summary values and the two retained final full bins. Optional `--originals` also checks original scratch/tool/dist files where they remain available. It never imports or executes game/experiment code, builds a project, opens a port or replays physics.

The retained FPS reports contain quantiles and per-bin counts/summaries, not individual frame samples or publication timestamps. Verification checks those recorded summaries and available count arithmetic; it cannot independently reconstruct the percentiles or exact wall-span denominators. The trailing bin at 90 seconds is partial and is preserved but excluded from the two final full-bin comparison. [summary.json](summary.json) records that limitation and the HOLD decision explicitly.
