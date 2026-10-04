# Full snapshot writer: CPU and native FPS, provisional adoption

The dedicated required-array writer saved **0.662417 ms paired median** over the original complete three-field writer, with **24/24 positive measured pairs**. The timing included preprocessing all **116,000 solver cells** and interpolation/stores at **101,913 render nodes**. A separate native pair recorded live snapshot-field p50 **2.6 → 1.9 ms** and fresh snapshots **56.82 → 57.92 Hz**. These support provisional adoption of the exact writer. Sustained 60 Hz physics and the late slowdown remain unresolved; the performance goal is not complete.

Only `SurfZoneSimulation.writeUniformSnapshot` changes, in the exact [2,700-byte patch](evidence/candidate.patch.gz). The original generic optional writer and three separate public writers remain unchanged. The dedicated loop preserves Float64 preprocessing, dynamic `this.aeration.voidFraction(i)` calls, coefficient expressions, wet threshold, traversal and Float32 store order. The declared API requires all three Float32 output arrays; missing/null arguments supplied outside the TypeScript signature are not an equivalence claim.

The exact accepted baseline is `e3e630bc45339e0f7564e59cfdd556275c06de92`. Baseline and candidate runtime modules and their import-only QA variants are retained. Their 54 shared canonical source dependencies match accepted originals. No candidate aeration code is imported. Dependency trees, fixture and the compiled cost bundle are external SHA-bound references, not copied trees. [Original source authority](evidence/source-authority.json.gz), [original readiness](evidence/ready.json.gz), [QA rebinding authority](evidence/qa-rebindings.json.gz).

## Actual CPU checks

The first CPU attempt passed all **seven commands** at **05:40:09.776–05:40:15.651 UTC**: two literal source-contract tests, strict TypeScript, six numerical tests, two syntax checks, one standalone cost bundle, and an unarmed driver. The numerical total is **five new tests plus one unchanged existing regression**. There was no numerical failure or test rerun. The source/fixture/package authority's 90 pins matched before and after. [Actual terminal](evidence/checks/terminal.json.gz), [Vitest report](evidence/checks/vitest.json.gz), [checks and actual logs](evidence/checks/).

The tests cover exact full/separate fields, wet/dry threshold and boundary/layout stores, nonfinite/signed-zero values, dynamic callback receiver/replacement/mutation chronology, overlapping outputs and input aliases, the actual retained workload, first-allocation sizes and reusable scratch identity. Two literal tests separately guard the one-method scope and import-only QA derivation. Archived tests have `.txt` suffixes and do not enter production Vitest discovery.

**Workflow limitation:** the Vitest configuration did not declare a private cache directory, and `node_modules` is a symlink to the shared installed tree. Default Vite/Vitest cache writes were therefore not isolated. The reviewer identified this after the successful tests; it is a workflow limitation outside the declared source/fixture pins, not a numerical failure. No corrective rerun or claim that the entire dependency directory stayed untouched is made. The original configuration and completed logs are preserved.

## Actual bounded complete-writer cost

Root ran one separately authorized quiet CPU operation, PID **22157**, at **05:40:47.550–05:40:49.628 UTC**, exit zero, under a 20-second hard bound. Outer duration was approximately **2.08 seconds**; the internal report spans **1,900.242 ms**. There was no retry. Source and compiled inputs matched before/after. [Cost terminal](evidence/root-cost-first/terminal.json.gz), [raw samples and guards](evidence/root-cost-first/cost-report.json.gz), [driver and cost source](evidence/).

Both independent arms import the same fixed F32 poststate once and use persistent original scratch and three reusable output buffers. After preflight and **eight warm pairs**, **24 adjacent measured pairs** follow balanced `AB, BA, BA, AB` blocks: 12 AB and 12 BA. Timers enclose the complete required-array writer, including all velocity/void preprocessing and height/foam/flow/air interpolation/stores. Equality, input-state/clock guards and allocation checks run outside the measured call. The report retains all raw samples and order strata.

| CPU result, ms | Value |
| --- | ---: |
| Paired saving median | 0.662417 |
| Paired saving mean | 0.694161 |
| Positive measured pairs | 24 / 24 |
| AB paired saving median | 0.739688 |
| BA paired saving median | 0.644646 |
| Original marginal median / p95 | 2.307125 / 2.560500 |
| Candidate marginal median / p95 | 1.609979 / 1.928166 |

The paired result is computed from adjacent pair differences, not by subtracting marginal medians. All output and scratch bits matched exactly; input identities, bytes and clocks stayed unchanged; initial scratch allocation sizes and steady scratch identity were checked.

The workload excludes unchanged Runner pose/event/front/particle packing, water/contact/body/front/lip/material stepping, transport, renderer and GPU work. Stable full arguments may already be specialized by an optimizing runtime; this single CPU result does not establish a universal JIT mechanism or ordinary frame saving.

## Fixture and precision limits

The external `render-scale/baseline-held-source.json.gz` is a retained F32 poststate, imported into accepted F64 constructors. The owning plain-Uint8 decoder verifies exact SET1 offsets/counts and raw words; **1,392,480 raw words** were checked. Both arms regenerate the same bed, centers, spacing and render grid from the recorded configuration. The original import's omitted-turbulence reset is retained on both arms. There is no solver step, `BreakingModel.update(0)`, source injection or material evolution.

This is neither a historical F64 prestate nor a late-game trajectory replay. The configuration is Padang, seed 8761, Hs 3.8 m, period 18 s, dx 2 m, fine spacing 1 m and 64 components. The render grid is 161×633 at spacing 2 m; the three paired fields contain **611,478 Float32 words**. The compiled standalone cost bundle is **425,236 bytes**, SHA `73195bf5b502713bb72cca4815af7d7b43e22db2ea297109f75a11c55b4c3402`; it remains external. [Compiled authority](evidence/compiled.json.gz).

## Actual ordinary native FPS

The native pair compared the adopted rowband runtime `d0ab3c51a3ec0d60e11f6c2eb7a598eca5b90736` against that same runtime with only the exact `SurfZoneSimulation.ts` full-writer patch. Its Simulation baseline/candidate hashes match the earlier CPU variants. All accepted renderer, prefetch, material, solver and input behavior stayed unchanged. The baseline eleven-file compilation was reused read-only; the candidate build used an explicit private Vite cache. No Vitest command ran in this FPS preparation. The original shared-cache workflow limitation above is retained without a corrective rerun.

Eight sequential preparation commands passed: candidate strict, candidate-only build, binding, four syntax checks and an unarmed driver. All **1,204 file pins and two read-only-use link targets** matched before/after. Common BUILD_ID was `306258296`; public assets were served from the exact shared whitelist, without copies. [FPS CPU terminal](evidence/fps/checks/terminal.json.gz), [bindings](evidence/fps/bindings.json.gz), [source/build authorities and launcher sources](evidence/fps/).

Root session **97651** completed the valid pair, exit zero, at **05:49:53.299–05:53:54.400 UTC**. Baseline PID **26830** closed before candidate PID **27510** started. Each arm used the unchanged ordinary menu → Padang → Big → Paddle out route, idle rider, High/Rich settings, five warm seconds and 90 passive seconds. Actual GPU physics used 116,000 cells and one 1/60-second step per advance. Both displayed 60 Hz; there was no rider control, resize, worker RNG override, GPU timer query or synthetic stepping. The native viewport/canvas remained 1708×879 / 2989×1538 with DPR 2 and renderer pixel ratio 1.75. [Actual pair report](evidence/fps/root-run/report.json.gz), [raw arm statistics, native guards and cleanup evidence](evidence/fps/root-run/).

| Native metric | Rowband baseline | Dedicated writer |
| --- | ---: | ---: |
| Fresh snapshots / second | 56.82 | 57.92 |
| Simulation / wall time | 0.947 | 0.965 |
| Rendered p95 / p99 / max, ms | 25.3 / 26.2 / 67.2 | 25.4 / 26.2 / 56.8 |
| Snapshot p95 / p99 / max, ms | 22.9 / 28.1 / 65.3 | 23.4 / 27.8 / 64.0 |
| Live snapshot fields p50 / p95, ms | 2.6 / 3.9 | 1.9 / 2.6 |
| Whole pipeline p50 / p95, ms | 16.8 / 22.2 | 16.0 / 22.3 |

These are separately measured distributions; component quantiles are not added. The live field-fill reduction agrees with the controlled CPU saving, while rendering and snapshot p95 did not improve. The six complete late bins at 78, 80, 82, 84, 86 and 88 seconds remained slow: baseline **55.48, 52.90, 48.87, 48.53, 41.93, 41.50 Hz**; candidate **54.81, 52.64, 54.08, 45.92, 40.38, 40.14 Hz**. One fixed-order pair is not phase-matched, and no phase, heat or slowdown cause is assigned. The candidate does not establish steady 60 Hz physics or solve the late-game issue.

The worker necessarily changes with this method: baseline **447,015 bytes**, SHA `e08444a9b72f73d62126a2e4b503092bc6e3cc7536d714a2e49743ed1293f480`; candidate **448,078 bytes**, SHA `b711e16bf2b92e17507b0fccfd2d9a6e6b517a7b9e7f7ce4656fdaf0b95e1114`. No candidate worker byte-equality claim is made. Both eleven-file output manifests and served hash evidence are retained; bundle bytes remain external.

Source/build/public authorities stayed unchanged during the pair. Owned baseline ports **4235/9645** closed before candidate **4236/9646**; their final TCP checks and port **4200** reported `ECONNREFUSED`. Owned Chrome/server processes exited and **5173 was untouched**. The exact post-run status is valid, not merely a planned cleanup.

Root chose provisional production adoption based on exact numerical gates, the controlled CPU result and its live field-fill reduction. The exact candidate Simulation module was replaced atomically. At **05:59:45.693–05:59:53.781 UTC**, root session **86529** exited zero: whole-project strict TypeScript, **four targeted production tests total (one existing and three new)**, and an isolated alternate production build passed. The test command deliberately selected the worker snapshot regression plus dynamic-callback chronology, exact boundary/alias bits and scratch allocation/reuse; it did not run the full Simulation suite. Source bytes stayed unchanged during these checks. [Production terminal](evidence/production/terminal.json.gz), [production test report](evidence/production/vitest.json.gz), [adoption and actual checks/build sources](evidence/production/).

All eleven alternate production outputs matched the measured candidate exactly, including the 448,078-byte `b711e16b…` physics worker. The canonical accepted-e3 `dist` and the previous rowband alternate baseline were preserved. The source and final test bytes are archived and pinned; the generated bundle remains external. This production validation confirms the exact trialed writer, while adoption remains provisional and the late physics slowdown remains unresolved.

## Archive verification

[manifest.json](manifest.json) records exact stored/expanded byte counts and SHA values, original aliases and external identities. JSON/text use deterministic gzip with mtime zero and an empty filename. Source bytes and the patch are unchanged; duplicate files share one stored payload. The original source-only README, proposal and readiness are retained verbatim, including their then-unexecuted status. This current README states the actual completed CPU gates.

The original canonical Simulation reference resolves by its exact old SHA to the archived independent baseline module. Production also extends the existing Simulation test: its historical canonical and old hardlinked-baseline aliases resolve to an archived independent original, copied from the frozen FPS candidate source. It retains the original 73,083 bytes / SHA `638ea27b64593e4c3932f224b720804e4006c67a63b065c5903e6b44430b38ce`. The adopted test is 80,416 bytes / SHA `6b49a17db4d32c87ac4d7dfd49af7121233888f2afc5332c48113cfcd2d34d34`. Historical raw metadata is not rewritten. `python3 verify.py` checks stored and expanded bytes and aliases. `python3 verify.py --external` additionally checks all declared SHA-bound source/package/fixture/bundle references and declared link targets. These are archive-only operations; archived private commands are never executed. [verification.json](verification.json) records the completed check.
