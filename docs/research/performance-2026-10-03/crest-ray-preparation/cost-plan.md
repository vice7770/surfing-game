# CrestRayPlan preparation cost — bounded CPU plan only

2026-10-03. New plan, not executed. No fixture decompression, source calculations, test, build, browser, solver replay or GPU work during the exclusive Rich patch lease. No production edit or cross-owner mutable cache is proposed. Root must release the CPU/GPU boundary and review exact input hashes before one bounded execution.

## Purpose and authority

Measure the current `CrestRayPlan.prepareRecords` cost attributable to the original contact path's visited complete packed-front ranges. This is the exact original Float32-record entry point of the broader preparation operation; timing object-form `prepare` instead would add a different access/closure path. This measures the maximum removable repeated bound-preparation work in that one held contact fixture. It does not measure a borrowed-plan implementation, stale-plan correctness, ray quality, solver fidelity, full contact time, or FPS.

Target retained ordinary baseline:

- Source: `/private/tmp/rich-patch-quality-v2-20261003/baseline-held/source.json.gz`.
- Held report: `/private/tmp/rich-patch-quality-v2-20261003/baseline-held/report.json`.
- Ordinary authority: `/private/tmp/rich-patch-quality-v2-20261003/baseline-fps.json` and `baseline-adapter-meta.json`.
- Prepared capture provenance: `/private/tmp/rich-patch-adapter-v2-readiness.json`; reviewed helper SHA256 `be839453b1555d33b5fd81f17ddf00ab15c327cc70caf0654a09af2823cffabc`. The actual run's final provenance must match this before the measurement proceeds; the file label alone is insufficient.
- Immutable canonical build: `/private/tmp/surf-tube-stability-current-20261003`, served on 4201 during the completed ordinary baseline. Read retained artifact/source-authority metadata, not the running server. Require matching source/runtime ref and source bytes for `crestRays.ts`, `frontRecords.ts`, `ProfileLibrary.ts`, `profileFormat.ts`, `barrelLibrary.ts`, `barrelLibraryIndex.ts`, `barrelSpots.ts`, `sweptLoft.ts`, `lipSheet.ts` and their actual pure dependency graph. Record every included source hash and isolated compiled module hash. Do not silently substitute the latest working-tree algorithm if it differs from the retained runtime.

Exact compressed/decompressed fixture SHA256, byte counts, final source-schema validity, retained clock, front count and asset hashes are PENDING actual-source/root review. No value is guessed or computed now. A preparation note is not an executed authority gate.

## Required source schema and guards (outside timing)

The final reviewed helper exports:

- `source.arrays['snapshot.front'] = {type,length,byteLength,sha256,base64}`. Require `type === 'Float32Array'`, length divisible by the runtime `FRONT_STRIDE === 9`, byteLength exactly four times length, decoded bytes matching its recorded SHA, and full-capacity bytes preserved. Decode raw bytes directly; do not JSON-roundtrip numeric values or turn NaN into null.
- `source.scalars.snapshotScalars.frontCount`: a finite integer in `[0, front.length/9]`. Read only that active prefix. Trailing capacity is not a front.
- `source.scalars.status.seaTime`, `source.scalars.config`, and source init/water-grid metadata. Require the retained ordinary actual config from FPS/worker-start metadata to match source config: Padang Big, seed8761, Hs3.8, T18, direction0, spreading150, tide/wind0, stage2, dx2/fineSpacing1, C64; actual render-grid2/mask1 and native High/Rich authority remain fixture provenance, not inputs to ray math.
- Successful held guard/provenance and ordinary worker-start metadata, including rider/contact construction and actual `barrelCaseCount === 4`. Missing or mismatched authority is an incomplete probe, not a reason to synthesize fronts or spin up another sea.

Library authority has a specific limit: the start observer retains **case count4, not original request case bytes or their hashes**. The source loader contract (`PhysicalMode` → `loadBarrelCaseBytes(barrelCasesFor(spot))`) selects the four Padang default asset entries in index order. Use guarded immutable build copies of exactly these assets and decode them through the matching original `libraryFromBytes`; record all asset and decoded-frame hashes:

1. `barrels/pad19-a20-l12.bin`
2. `barrels/pad19-a30-l12.bin`
3. `barrels/pad19-a45-l12.bin`
4. `barrels/periodic-padang19s-l12.bin`

Require those immutable assets to match the frozen build/default source authority. Source/index/library/asset guard plus an immutable local server establishes the intended library by loader contract; it is **not** a captured-request-byte parity witness. If the immutable served asset authority cannot be established, stop without a timed result. No fresh network fetch, page or case-selection guess is used.

Use the original contact constructor's exact parameters from the matching modules: `BARREL_SLOPE.padang` (1/19, **not** the rounded case-header slope0.0526316), `LOFT.extension === 1.5`, and `minimumCrestRaySpacing(LOFT.extension, LOFT.spacing)` with `LOFT.spacing === 0.5`. Construct/decode the library and allocate plans before timing. The authored envelope cache's first scan is outside the repeated preparation measurement; record that exclusion.

## Exact range selection and why the global budget matters

Do not equate front number with a unique run or collapse repeated IDs across separated ranges. The original loft `fronts` method walks contiguous equal packed-front IDs in source order and keeps a run only when count>=2 and `lastSigma-firstSigma > 1e-6` (`sweptLoft.ts:349–360`). Strict/interior sigma errors are the existing ray-plan diagnostic, not grounds to repair, sort, merge or resample the retained inputs. Preserve duplicates, invalid intervals, NaNs and thrown failure behavior.

Additionally, `SweptLoft.build` may stop processing fronts when its global live-slice budget reaches298. Timing all discoverable packed runs would therefore be an upper bound, not the exact original contact-path total. For the planned exact measurement, discover actual visited `prepareRecords(records,start,end)` scopes using **one untimed invocation of the original `SweptLoft({contact:true}).build`** on the exact packed rows/library/parameters. Temporarily wrap only `CrestRayPlan.prototype.prepareRecords`, preserving original `this`, arguments, execution and return, capture the start/end calls, then restore the original method in finally. Do not instrument production or the browser.

For this range-selection-only invocation, `heightAt` may return the retained still level. This is deliberately a neutral callback, **not reconstructed water or contact geometry**: source shows all front discovery, survey/refinement, profile-time/live decisions, global budget checks and sliceCount increments depend on records/library/times and occur without height-based eligibility. The height-dependent `forwardRest`/vertex heights and later overlap/seal passes run after or independently of these preparation calls. Their output is discarded. The wrapper only records the original method's input scopes. Verify this code-order premise against the exact hashed source before using it; if a new version makes height determine scope visitation, stop and revise the plan rather than guess original heights. No neutral-geometry output is labeled actual contact geometry or quality proof.

Record discovered and visited runs, source-order front IDs, start/end/count, first/last sigma, record-byte hashes, count of original invalid intervals, and whether the last active prefix ends at the transport capacity. If no visited run exists, retain an empty/incomplete result and do not seek a different scene automatically. The full-build selector is outside timing and runs only once; no generic contact benchmark is performed.

## One short timed operation

After input/authority validation and the untimed scope selector:

1. Construct **one** original `CrestRayPlan` with the exact library/slope/extension/minSpacing, matching contact's one reusable plan across ranges. All selected ranges reuse the unchanged same Float32 array.
2. Warm the exact visited range sequence five times. This removes first storage growth, authored-envelope construction and initial JIT effects from the steady work estimate; retain warmup elapsed separately. No clock, profile, coordinate or array is modified.
3. Measure exactly30 full visited-range sequences. Each timed interval contains only the source-order `.prepareRecords(front,start,end)` calls plus their inevitable loop iteration; two `performance.now()` reads bracket the full sequence. No per-front timer, hashing, logging, validation, profile lookup, rayAt, water interpolation, serializer, clone, constructor or explicit GC call occurs inside the measured region. Store the30 elapsed values in a preallocated Float64 array.
4. After timing, retain per-range final diagnostics and exact control-input hashes; require the original full front bytes unchanged. Compare final diagnostics with the untimed selector's same prepare scopes; this checks deterministic repeated preparation only and does not prove borrowed-plan safety. Keep every thrown/authority/deadline failure in a fresh compact JSON, never overwrite prior artifacts.

Hard bound:10 s for decode/guards/selector/warmup/timing/report after module load, plus an outer30 s process deadline including isolated source preparation/startup. A deadline yields incomplete; no automatic repetition, iteration increase, substitute case, hardware start or wider budget. Compilation of the original small pure module graph, if required, happens once outside timing after explicit CPU release and is reported separately. It creates only tmp files. No app build or production API is needed. Tiny range/schema tests, if root requests them, remain outside this one measurement and are not run during the current lease.

Report all30 raw elapsed values, p50/p95/max/mean total preparation ms per original contact range sequence, visited front/control counts, steady allocation exclusion and fixture/library/source hashes. Do not subtract an independently measured loop baseline, sum independent per-front quantiles, multiply into an asserted FPS gain, or infer temporal late-growth from one held state. This estimate is only a prerequisite for deciding whether cross-owner final-plan reuse warrants implementation complexity. A small result rejects the candidate without a broader replay or repeated timing campaign.

## Planned artifacts and review boundary

Fresh output proposal: `/private/tmp/crest-ray-prepare-cost-20261003/` with compact intent, guarded source/asset/module manifest, report and retained original helper/module source. The driver itself is not implemented by this plan. Exact command/fixture hashes will be predeclared after root reviews the actual v2 baseline source. Execute only after root's explicit CPU lease release. The current output is this plan file only.
