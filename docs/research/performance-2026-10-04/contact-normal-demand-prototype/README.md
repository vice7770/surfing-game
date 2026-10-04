# Private contact normal-demand prototype

The controlled complete-contact experiment found a **0.118896 ms median paired saving** (mean **0.110595 ms**). This TMP-only prototype is retained as a small foundation for a possible larger height-demand change. It has **not been adopted into production** and establishes no browser FPS, rendering, gameplay trajectory or historical-sea result.

| Complete workload result | Milliseconds |
| --- | ---: |
| Original median | 3.8378335 |
| Private candidate median | 3.6591665 |
| Median paired block saving | 0.1188960 |
| Mean paired block saving | 0.11059475 |

The run retained 240 measured trials in 60 alternating ABBA/BAAB blocks: 43 paired savings were positive and 17 negative. The paired estimator is the original two-trial block mean minus the private two-trial block mean; it is not the difference of the separate medians. All exact guards passed. Raw trials and blocks remain in [cost/report.json.gz](cost/report.json.gz).

## Runtime and contract

The independent oracle is an untouched source export of `ef60d3cee120d6b157fe94386d923b6b4392205b`. Its 547-file closure and original 5,242,880-byte archive hash are preserved in [prototype/original-source-manifest.json.gz](prototype/original-source-manifest.json.gz). The documentation checkpoint supplied by root was `43641bf33654ce8f0954ee9045bcddab28738bc9`; this is context, not a statement that unrelated global production work was unchanged.

[prototype/candidate.patch](prototype/candidate.patch) preserves the five TMP runtime changes and six authored test/cost/config paths. [prototype/runtime-hashes.json](prototype/runtime-hashes.json) pins all five original and candidate runtime files. The private ordinary worker path retains the full eager positions, Y sampling, seals, profiles, mouths and topology. It records the final surviving run bounds and computes the original Float32 central-difference normal only when one of the selected triangle's three vertices needs it, once per epoch. The normal formula and accumulation order are unchanged; the oracle shares no new candidate normal helper.

A frozen query/floor facade keeps private normal storage out of worker publications. Generic public contact instances and direct/default runners remain eager. Existing scoped plain-height memo ownership and callback order remain intact. There is no lazy-height epoch, provider drain or per-update F64 snapshot copy in this candidate. Additional persistent private capacity is 42,458 bytes; the existing Float32 normal buffer remains allocated.

## Verification and retained failures

| Check phase | Actual terminal result |
| --- | --- |
| First strict TS and focused run | TS passed; 109/110 tests passed, one assertion failed |
| Corrected focused run | Strict TS passed; 111/111 tests in four files passed |
| First strict TS including F64 replay | TS7022 failed; replay was not executed |
| Corrected F64 check | Strict TS passed; one separately run actual replay test passed |
| Complete-contact cost check | Strict TS passed; one predeclared cost driver passed |
| Root integration follow-up | 74/74 tests in three files passed separately |
| Root QA build follow-up | First build failed on missing entry; corrected build passed |

The first focused failure came from rejecting the existing numeric `snapshot.status.pipelineMs.contact` timing field. The corrected escape assertion permits that exact numeric path while continuing to reject backend objects, result buffers and posted functions. Original failed source, patch, log and results are preserved under [failures/](failures/). The tenth test adds an actual-API synthetic open-column anomaly fixture, checking false partial hits and reused-hit fields; this is not evidence of an ordinary Padang defect.

The F64 source first failed compilation at line 255 (`before` inferred as any). The sole approved correction was the eight-byte `: number` annotation, with no runtime or assertion change. Both versions and the original failure remain preserved. There was no automatic repair/retry. The separately run Runner/WorkerSurfZone/SurfZoneHost integration follow-up passed 74/74 tests in three files (69.86 seconds); it is separate from the 111-test focused run and the one actual replay. Its raw [terminal log](checks/root-integration-passed.log) is retained.

The first QA Vite build failed because the deliberately minimal source export lacked `index.html`. Root copied only the exact 1,442-byte baseline entry (SHA-256 `60675d1b7e6f739633646d53fd74d07f90d913151f5adb2a65b71fc786372392`), without runtime changes, then the corrected build passed in 312 ms. The [failed log](failures/root-build-first.log), [entry authority](checks/root-build-entry-authority.json), exact baseline entry and [corrected log](checks/root-build-corrected.log) are retained. BUILD_ID was `43641bf33-qa-contact-normal`; inline overrides were `copyPublicDir:false` and `emptyOutDir:false`. The [11-output asset hash manifest](checks/root-build-asset-hashes.json) records the QA build without copying bundles/assets. This was build verification only, with no preview, hardware or FPS measurement.

## One actual F64 epoch

The replay uses only the first epoch of the existing [contact-demand capture](../contact-demand/run/capture.json.gz), sea time `125.99999999999488`: 125 packed records, 187 slices and 25,058 vertices. It restores each recorded initial reused-hit field and retains all **627 original mixed calls: 441 query and 186 floorAt**, with 28 hits and zero actual anomalies. It checks captured results, every hit field, floor results, selected triangles, query geometry, statistics and selected normal bits against both the capture and the independent eager oracle.

All 20,117 ordered plain-height callback triples matched. The original computed 23,852 normals; the private path computed exactly 65 unique selected vertex normals. Fresh oracle/candidate full non-normal geometry matches. Old captured unused normal/mouth/sheet slots carry historical storage and are explicitly outside the actual-read contract, not silently replaced by an invented historical drain requirement. [checks/f64-proof.json.gz](checks/f64-proof.json.gz) contains the full proof. Its original `f64-replay-first-proof.json` alias denotes the first actual successful replay after the corrected compile.

The other 14 captured epochs have demand counts but lack complete F64 inputs for this replay. No 15-epoch parity, body-trajectory, GPU or tube-quality claim follows from this one epoch.

## Complete-path cost scope

Each variant owns independent fixed captured F64 state and uses its respective actual plain PhysicalSurfWater provider, solver interpolation and scoped cache. The timed workload resets statistics, performs the full contact build, then all original mixed calls with hit restores. It includes facade dispatch, lazy contact buckets, normal-ready/final-run resets, selected normal work and common preallocated output sink writes. One outer clock pair surrounds the complete workload; no proxy read tracking, trace spies or internal clocks enter it. Exact output/geometry/normal/statistics and source/prototype guards run outside timing.

There was one empty setup and one full preflight per variant, 16 alternating warmups per variant, and 120 measured complete workloads per variant: 274 full workloads plus two empty setups in total. The temporary QA ownership hook is restored before preflight/warmups/timing. Nineteen imported method identities and 561 source-authority records are pinned. Context construction, fixture decoding, initial packed-record extraction, broader water/body/particle simulation and rendering are excluded. Common sink overhead and module layout/JIT differences limit the result; later owned-height copying would need its own complete-path cost gate.

[Cost plan](cost/plan.md), [ready metadata](cost/ready.json), [authority](cost/authority.json.gz) and [terminal freeze](cost/passed-freeze.json) preserve their original bytes. Their preparation-time “pending”/“not executed” fields remain historical; actual terminal results are in the logs/results and passed report. The report's field named `planSha256` holds the authority JSON hash; the prose plan hash is independently pinned in ready metadata and this archive manifest.

## Archive authority

[manifest.json](manifest.json) maps each portable stored path to its stored and expanded byte counts/SHA-256 and exact original aliases. Large proofs, closures, reports and historical patches use deterministic lossless gzip with mtime zero. [verification.json](verification.json) records archive-only byte/hash/JSON checks; it does not rerun runtime checks. The capture, design, full baseline source, assets, dependencies and bundles are referenced rather than duplicated. See the existing [capture manifest](../contact-demand/manifest.json) and [normal-demand design](../contact-normal-demand-design.md).

Archived test sources use `.test.ts.txt` so default repository-wide Vitest discovery cannot execute them: [focused source](tests/contactNormalDemand.prototype.test.ts.txt), [actual replay source](tests/contactNormalDemand.f64-replay.test.ts.txt) and [cost driver](cost/cost.test.ts.txt). Their bytes and original source aliases are unchanged; original executable scratch names remain in the patch and manifest aliases. The prior pre-fix README/manifest/verification are preserved only in TMP as historical authority.

These are exact evidence sources, not a newly installed benchmark checkout. Reconstructing the original scratch layout requires the pinned baseline, separate oracle, dependencies, patch and original named metadata paths. The replay/cost sources intentionally retain the original TMP fixture path; the durable capture above supplies those bytes for a separately reviewed future run.
