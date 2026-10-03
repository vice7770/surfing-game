# Rich patch half-metre trial: v1 held comparison invalid

This archive preserves the first trial and its preparations. **The canonical ordinary 90-second sample is valid; the held comparison is invalid.** It fails before the first default-view frame, with zero geometry swaps and no half-metre candidate run. No graphics/default/source change was accepted **from v1**. The later [successful v2 guards and selected-view root adoption](v2/README.md) are recorded separately; the raw v1 files and flags remain unchanged.

[Archive manifest](manifest.json) retains 37 file records with every original path, stored/original bytes and hashes, plus decompressed hashes where applicable. All copies and original bytes were verified. The original gzip and PNG are byte-identical copies; only raw FPS JSON is compressed with deterministic gzip. Source/test programs are archived as `.txt` to keep their bytes without adding runnable repository tests. Originals remain under `/private/tmp`; this archival step runs no test, kernel, build, browser, GPU or water replay.

## Valid ordinary sample, failed held gate

The [raw FPS report](v1-baseline/fps.json.gz) retains both the valid sample and the subsequent failure row. Its [failure audit](v1-baseline/failure-audit.json) separates them:

| Canonical ordinary sample | Observed |
| --- | ---: |
| Displayed/rendered FPS | 60 |
| Fresh water states / fixed physics steps per wall second | 57.12 / 57.12 |
| Simulation seconds per wall second | .952 |
| Advancing publications / steps per publication | 5,169 / 1 |
| Drawn interval p95 / p99 / max | 18 / 18.4 / 26 ms |
| CSS viewport / native drawing buffer | 1708×926 / 2989×1620 |

Actual High/Rich/pixel-normal settings, native ratio1.75/DPR2, seed8761/Hs3.8/T18/spreading150, dx2/fine1/C64, rider=true/four barrel cases and default render2/mask1 are retained. This is a **baseline only**, with no paired candidate performance result. The raw callback rate is distinct from the rendered60-frame cap.

The [held report](v1-baseline/held-report.json) fails with `Cross-view unowned scene geometry/transforms changed` during its first `setView(default)`. It has `valid=false`, `qualityAccepted=false`, no successful frames and no deadline expiration. Native factory binding and quarter-metre byte matching had passed; the [complete initial source](v1-baseline/held-source.json.gz) was saved before the failure. No after-failure scene snapshot or object-level diff identifies the change. The exact changed row is unknown. Installed Three's native transparent/DoubleSide two-pass color path increments `material.version` twice per eligible draw, a source-supported counter hypothesis only: the missing after-state cannot prove that caused v1's failure. Shadow following depends on the board, which does not move merely because a held view changes; camera-dependent patch placement is the permitted owned placement. The exact exception/stack is preserved. The [failure PNG](v1-baseline/failure-native.png) is the post-error native screenshot, not a matched normal scene or spacing-quality frame. The owned Chrome closed; the recorded CDP port has no listener.

## Preparation authority and superseded plan

The initial [prototype patch](prototype/half-metre.patch) changes only `PATCH_SPACING` .25→.5 and the matching test title; its [source/build manifest](prototype/source-manifest.json) records canonical `1bcc7c0c9`, literal BUILD_ID `eea68720f`, all552 source/config hashes and the inherited unrelated root test difference. Both owned before/after source files are retained in [before](prototype/before/richPatch.ts.txt) and [after](prototype/after/richPatch.ts.txt), with corresponding test bytes. Archival verification confirms all552 candidate source hashes, all11 built assets and byte-exact canonical `surfZoneWorker-BH6FhcTP.js`. Asset/source hashes are preserved without duplicating the whole immutable build/source directory.

[Actual CPU geometry counts](prototype/geometry-counts.json) are 149,761 vertices / 297,984 triangles / Uint32 indices before and 38,017 / 75,264 / Uint16 after, at the same96m extent and .3m skirt. This removes222,720 triangles per patch draw; the two-draw figure in the manifest is conditional on both original and isolated fallback being active. Counts are not a performance measurement. The manifest records48 focused tests and strict TypeScript/Vite success; standalone stdout logs were not supplied, and none is fabricated or rerun here.

The [v1 readiness file](v1-preparation/readiness.json) and **all ten exact named preparation files** are retained, including the actual revised plan, helper/test output, adapter, derived scripts, owner launcher and both plans. Eight helper tests/syntax/plan-only checks are recorded there. [Actual same-renderer plan](v1-preparation/rich-patch-actual-trial-plan.md) supersedes the [generic reconstruction draft](prototype/trial-plan-superseded.md); the old draft remains preparation history, not executable visual authority. Candidate adapter metadata is plan-only evidence: the candidate did not run in v1.

## CPU v1 height supplement on the invalid held source

The separate [actual-input intent](cpu-v1/actual-input-intent.json), [height report](cpu-v1/height-report.json), [kernel](cpu-v1/kernel.mjs.txt), [seven-test source](cpu-v1/kernel.test.mjs.txt) and [plan](cpu-v1/plan.md) remain exact. Seven tiny tests and syntax passed in the original tool transcript; no separate stdout file was retained. The plan's earlier “not run” wording is preserved verbatim, with this intent/report documenting the later one authorized calculation.

The input is the pre-failure native source at sea **402.8410465576326**, with actual `waterTubeCount=0`, Rich/pixel normals, patch rect `[-102,-301.0249111256337,-6,-205.0249111256337]`, render2 grid161×633 and bound native factory arrays. Original gzip is **17,485,636 bytes**, SHA256 `e5fecacb1bd9646d635dab18443733d6ff91038587d7101c20d8d8a25e801eff`; decompressed JSON is **70,027,931 bytes**, SHA256 `f6b1e3f09d41200fef1075aac9572a7c0091bc335ba480709ae010ab11c3e4ea`. The compressed/content hashes agree with the intent, held report and height result.

One bounded CPU/F64 calculation compares the two **indexed planar top surfaces** against the same cubic heights, without a solver or GPU. Across the fixed .125m lattice of **591,361 samples**, `.5−.25` height difference has **4.284mm maximum absolute** and **.514mm RMS**. At148,225 original quarter-metre top nodes, RMS is .593mm. The raw report retains quantiles, signs, maximum location, triangle IDs and underlying Float32 nodes. Skirt interiors are excluded; endpoint drop remains .3m.

These millimetre values are **height-only evidence from one invalid held capture**, not GPU/raster parity or a successful quality verdict. They do not validate F32 GLSL arithmetic, silhouettes, depth/discards, mask gaps, foam/air/flow interpolation, caustics, skirt coverage, cavity/mouth/touchdown or FPS. No comparison images or native repeats exist in v1.

## Source-contract limits

The [read-only source audit](source-audit.md) is an exact copy of `/private/tmp/patch-half-density-source-audit-20261003.md`, SHA256 `47f547063f56745cb75a0945405b909569fecde123892a6ae3984c81b89d1c0b`. Every candidate local patch/rim vertex is an old vertex at the fixed96m size, under any ordinary clamped/narrowed rectangle scale. All **source/coarse** nodes are not universally included: a128-interval narrow axis preserves every source node at.25 but loses alternate nodes at.5. Shared samples do not preserve the planes between them.

The .3m downward curtain requires a signed bound on actual coarse-vs-patch rim heights; the .5m horizontal overlap alone cannot guarantee a hidden gap in arbitrary/grazing views. Current arbitrary source heights publish no universal curvature, ordering or seam bound. Future default/selected-close-view evidence must retain that scope label instead of claiming all-grid seam/depth parity. Production source and proof originals are unchanged.
