# Crest-ray preparation: rejected

Sharing finalized scalar crash ray plans with contact was rejected. One bounded CPU measurement of the existing preparation path took **0.056834 ms median** for the entire visited front sequence, too little to justify cross-owner mutable state. No production cache or API was added, and no additional measurement was run.

| Preparation-only metric | ms per full sequence |
| --- | ---: |
| Mean | 0.084764 |
| Median | 0.056834 |
| p95 | 0.205958 |
| Maximum | 0.230750 |

The [exact report](measurement.json) retains all 30 samples. The frozen ordinary High/Rich Padang Big source was at seaTime 401.074379890966, seed 8761, Hs 3.8/T 18, C64, dx 2/fineSpacing 1, render spacing 2 and independent mask 1. Its packed Float32 front had 136 active records; contact visited 30 complete contiguous runs containing120 controls, with no budget skips or transport-capacity truncation. Packed input bytes and repeated preparation diagnostics remained exact.

The isolated driver called the original `prepareRecords` in source order using one reusable plan, after 5 warm sequences. Constructors, library decoding, initial allocation, range selection and final diagnostic checking were excluded from the 30 timed sequences. One untimed original contact build selected scopes; its pure constant-height callback cannot change scope eligibility under the [source proof](range-selector-proof.md), and its geometry was discarded. This is neither an original contact geometry replay nor borrowed-plan correctness proof. The cost belongs to one held fixture and establishes no FPS saving or cause of late contact growth.

[Driver](driver.mjs), [guard manifest](guard-manifest.json), [guard helper](guard.mjs), [eight tiny guard tests](guard.test.mjs.txt), [plan](cost-plan.md) and [pre-run intent](prepared-intent.md) are preserved byte-exact. The pre-run intent/manifest still describe unexecuted timing; the completed report is the execution authority. Original 15 pure source modules match canonical 1bcc7c0c9 and are retained alongside their TypeScript 5.9.3 type-erased modules. The [initial unavailable-esbuild preparation](preparation-failure.md) and its [original preparer](prepare-esbuild-unavailable.mjs) are retained; that failure executed no numerical selector or timer.

The [archive manifest](manifest.json) and [checksums](SHA256SUMS) retain hashes, original absolute paths and external authority. The 73,728-byte [front.bin](front.bin) preserves full capacity bytes; only 4,896 bytes/136 records are active. The large [baseline held source](../rich-patch-half-metre/v2/baseline-held-source.json.gz), [held report](../rich-patch-half-metre/v2/baseline-held-report.json), [FPS report](../rich-patch-half-metre/v2/baseline-fps.json.gz) and [source manifest](../rich-patch-half-metre/prototype/source-manifest.json) are linked rather than duplicated. Source compressed SHA256 is 10b2651ef6b7f2a6a701ec98f0e266fe411a3c2e2e3ada8190ddd1fea1ca2783; raw JSON SHA256 is c4e6987fdeb7a53aad9316efe299aa56b0118d297390ee3981c727bec04c0d4c.

Library inputs were immutable build copies byte-equal to the canonical public [a20](../../../../public/barrels/pad19-a20-l12.bin), [a30](../../../../public/barrels/pad19-a30-l12.bin), [a45](../../../../public/barrels/pad19-a45-l12.bin) and [periodic](../../../../public/barrels/periodic-padang19s-l12.bin) assets, selected in original loader order with exact slope 1/19. The start observer captured case count 4, not request case-byte hashes; this is explicit loader/build-contract authority. Original paths, asset hashes and ref are retained. These large inputs were not copied again. The [archive script](archive.py) performs byte-preserving archival/checksum work only; archived driver paths remain those of the reviewed tmp experiment.
