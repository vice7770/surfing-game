# Coarse fallback row bands: provisional renderer adoption

The ordinary native pair recorded fresh snapshots at **58.07 → 59.31 Hz** and rendered-frame p95 at **25.1 → 18.3 ms**. Worst stalls increased: rendered maximum **50.1 → 67.1 ms**, snapshot maximum **38.5 → 76.9 ms**. This is one fixed-order pair with mixed results and unknown stall causes. It supports a reversible, provisional Claude renderer change; it does not establish steady 60 Hz, complete the performance goal, or accept tube quality.

Production adoption copied the exact reviewed seven renderer/runtime files and four test files. Whole-project strict TypeScript, the four focused files (**46 tests**), and an isolated alternate Vite build passed at **05:38:22.116–05:38:30.382 UTC**. All eleven alternate production outputs matched the measured FPS candidate by path, size and SHA. The physics worker remains **447,015 bytes**, SHA `e08444a9b72f73d62126a2e4b503092bc6e3cc7536d714a2e49743ed1293f480`. Canonical accepted-baseline `dist` was preserved. [Production terminal](evidence/production/terminal.json.gz), [output parity](evidence/production/candidate-output-parity.json.gz).

## What changed and what was proved

The coarse fallback uses a private geometry view sharing the original position attributes and index. Its render hook selects a full-width row interval around actual positive mask support; unsupported inputs use the full range. The original water geometry and its draw range remain unchanged. Rich fallback remains full. The normal shaders, captured physical inputs and solver formulas are unchanged. [Candidate patch](evidence/rowband/rowband.patch.gz), [exact final source/test files](evidence/rowband/final-source/).

The moving native gate rendered all **21 consecutive natural-cycle frames, steps 664–684, through two fixed cameras**, in one candidate WebGL context. For each of **42 cases**, it performed four normal draws: initial narrow, repeated narrow, the same private view forced full after its original hook, and restored narrow. All cases had a positive active crop. **Repeated narrow, full and restored narrow framebuffer bytes matched exactly in all 42 cases**. Source, mask, camera, geometry, matrices and observed shader metadata stayed exact within each comparison. The gate retained sixteen checkpoint PNG aliases, all immediate pixel hashes, and the initial-versus-repeat difference separately. It did not substitute an ID shader. [Moving report](evidence/moving/root-native-first/report.json.gz), [moving source and plan](evidence/moving/).

This proves settled, same-context row-range coverage for this captured cycle. It does **not** prove initial-draw or cross-context byte equality, universal grazing-view coverage, Big-wave coverage, live GPU physics, contact correctness, or visual quality. The physical capture is a fresh, small, naturally evolved CPU trajectory, with selected material point 3 / strip 2. The four authored cases, immutable bed and all 132 captured slices remain external SHA-bound inputs. No new physical capture was made for these renderer gates.

## Failure history and diagnostic controls

There are three actual failed gates; their original sources, readiness files, authorities and logs are retained byte-for-byte.

1. The first rowband strict check stopped on four TypeScript diagnostics from two typing defects, before tests. The repaired test setter and erased `Texture.image` structural assertion changed no row-selection arithmetic. The corrected strict check and **46 tests** passed at **04:50:58 UTC**. [Original checks](evidence/rowband/checks/), [corrected checks](evidence/rowband/checks-v2/), [repair](evidence/rowband/repair.patch.gz).
2. The first native gate completed all 42 baseline frames but failed candidate frame 0:0 on exact normal framebuffer SHA equality at **04:59:49 UTC**. Primary inputs, camera and loft hashes matched. The driver threw before retaining candidate PNG/raw pixels, so this attempt cannot localize its pixel difference or establish a coverage hole. The first failed baseline checkpoint is retained; the other seven original baseline images have external hashes. [First native report](evidence/original-native/root-native-first/report.json.gz).
3. The diagnostic's first strict check stopped on `repair` possibly undefined, before bundling or hardware. A single added assertion repaired the harness typing without weakening its condition. The corrected six CPU commands passed. [First diagnostic checks](evidence/diagnostic/checks-first/), [repair](evidence/diagnostic/repair.patch.gz), [corrected checks](evidence/diagnostic/checks-second/).

The subsequent nine-draw diagnostic passed at **05:15:42 UTC**. Within the candidate context, repeated narrow, private full, repeated full, original-geometry alias full and restored narrow all produced the same framebuffer SHA. Both contexts' initial-to-repeat changes affected the same eight pixels / sixteen channels, with identical old/new bytes and maximum channel difference 9. Cross-context full-versus-full still differed at 113,813 pixels. That discrepancy remains unattributed; it is not evidence of a row-range failure at step 664. All raw RGBA and PNGs were retained before comparisons. [Diagnostic report](evidence/diagnostic/root-native-first/report.json.gz).

The moving gate preserved its only initial-to-repeat change, the same eight pixels in view 0 / step 664. The settled equality gate used no tolerance and did not hide that initial difference.

## Ordinary FPS scope and limits

The pair ran the same native menu route, High/Rich settings and Padang Big configuration, with 5 seconds warm-up plus 90 seconds per arm. Both displayed 60 Hz. It used one water step per advance over 116,000 cells, no rider input, no resize or worker RNG override; worker bad advances were zero. The observed viewport was 1708×879, DPR 2, canvas 2989×1538. Common BUILD_ID was `306258296`. [Pair report](evidence/fps/root-run/report.json.gz), [launcher, surveys, passive guards and authorities](evidence/fps/).

| Metric | Accepted baseline | Rowband candidate |
| --- | ---: | ---: |
| Fresh snapshots / second | 58.07 | 59.31 |
| Simulation / wall time | 0.968 | 0.989 |
| Rendered p95 / p99 / max, ms | 25.1 / 26.0 / 50.1 | 18.3 / 25.3 / 67.1 |
| Snapshot p95 / p99 / max, ms | 22.4 / 26.6 / 38.5 | 19.6 / 22.8 / 76.9 |
| Pipeline p50 / p95, ms | 16.3 / 21.5 | 15.4 / 19.0 |
| Draw calls | 54 | 56 |
| Median triangles | 1,149,569 | 1,233,091 |
| p95 triangles | 1,196,137 | 1,430,561 |

Median triangles increased by 83,522 (7.3%); p95 triangles increased by 19.6%. Late full bins improved, but the arms were not phase-matched. No heat, timing or phase cause is assigned to either the improvement or the larger worst stalls.

The final passive candidate observation found an actual coarse crop: full 606,720 indices became start 512,640 / count 54,720, with shared attributes/index; Rich remained 225,792. Earlier ride observation had no repair. These three static observations establish observed active cropping, not its eligibility fraction over the run.

The pair ran at **05:24:56.076–05:28:56.360 UTC**, root session 66932, both arm exits zero. Source/build/public authorities were unchanged. Owned baseline ports 4233/9643 and candidate 4234/9644, plus 4200, were actually refused after cleanup; **5173 was untouched**. The earlier native gates also closed their owned Chrome/server processes and ports. Actual command, PID, UTC, exit and cleanup evidence is preserved in the raw reports and available logs; no missing console files were invented.

## Archive and verification

[manifest.json](manifest.json) maps every stored payload to exact original aliases, byte counts and SHA values. JSON/text use deterministic gzip (mtime 0, empty filename); source and PNG bytes are unchanged. Duplicate bytes share one stored payload. Archived tests end in `.test.ts.txt` and cannot enter default Vitest discovery.

The sixteen moving PNG aliases, nine diagnostic PNG aliases and first failed baseline PNG are retained with exact deduplication. The diagnostic's nine original RGBA files are reconstructible from four unique lossless PNG pixel states; the moving checkpoint PNGs likewise reproduce their immediate bottom-up framebuffer hashes. This uses exact RGBA row reversal, with no resizing or image alteration. The complete 350 MB moving raw-pixel corpus never existed.

The 33 MB capture gzip, unchanged runtime/dependency trees, authored assets and compiled bundles remain external references. Original authority JSON, including stale source-only PLAN status, is preserved verbatim. Current results are stated here. For the eight original canonical source/test paths and eleven accepted compiled aliases, external verification uses the independently frozen pre-adoption copies in `proof-baseline`; it does not compare old hashes to adopted root files. Post-adoption source hashes are also pinned. Production adoption intentionally changed the root source, so historical before/after invariance is scoped to its original experiment.

Run `python3 verify.py` for stored/expanded bytes and exact PNG-derived pixel witnesses. Add `--external` to verify SHA-bound external inputs, including frozen historical aliases. This verifier performs archive bookkeeping only and runs no game tests, builds, simulation or browser. [verification.json](verification.json) records the completed archive verification.

Later writer-adoption epoch: only generated external-reference mappings for the historical Simulation SHA `5b511f7b…` and Simulation-test SHA `638ea27b…` now resolve to exact lossless originals in the [full snapshot writer archive](../../performance-2026-10-04/full-snapshot-writer/README.md). Production subsequently changed those canonical files. Their original paths, sizes, hashes and raw authority JSON remain verbatim; every stored rowband payload is unchanged. This narrow remap keeps `--external` usable after that adoption without expanding this renderer experiment's scope.
