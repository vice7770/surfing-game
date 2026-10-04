# Actual Big capture: native failure, three drawn states retained

The one native attempt **failed** after three consecutive actually drawn Padang Big states. A publication was not drawn, so the requested five-state capture remains unproved. These three frozen states and a later committed export are usable limited evidence; there was no retry, held-camera view, PNG, image comparison, FPS measurement, or tube-quality acceptance. The timing cause is unknown. Synchronous capture overhead could have contributed to a missed publication; this run does not establish that cause.

The actual [capture report](evidence/root-run/capture/report.json.gz), [outer terminal](evidence/root-run/terminal.json.gz), and [console](evidence/root-run/stdout.log.gz) retain the failure verbatim. The child error is `A publication was not drawn: five one-step consecutive states unproven`; the outer wrapper exits 1 after asserting its child should have exited 0. This is one native failure, not two attempts.

## Actual run and retained scope

Root session 27490 closed with exit 1. The outer process ran **2026-10-04 06:18:53.728–06:19:38.363 UTC**, 44.633 seconds; its driver PID was 37772. The child report spans 06:18:53.813–06:19:35.626 UTC. The owned Chrome PID was 37773 and closed. All actual 4240/9650/4200 probes returned `ECONNREFUSED`, including the later independent [ports proof](evidence/root-postproof/ports.json.gz). Port **5173 was untouched**. No deadline expansion or second native attempt occurred.

The ordinary route was Surf → Padang → Big → Paddle out with idle controls: High particles, Rich water, GPU stage 2, seed 8761, significant height 3.8 m, period 18 s, tide/wind 0, dx 2 m, fine spacing 1 m, 64 sea components, 116,000 solver cells, one requested 1/60-second step per publication. Native CSS 1708×879, DPR 2, backing canvas 2989×1538 and render pixel ratio 1.75 were required; no resize override was used. The existing page-only survey RNG bootstrap was disclosed; worker randomness was not overridden. [Native guard metadata](evidence/root-run/capture/native-audit.json.gz) is retained as emitted, including its `valid:false`; it is not relabeled as a passing run.

| Drawn frame | Sea time | Surface revision | Front records | Loft slices |
| --- | ---: | ---: | ---: | ---: |
| 0 | 327.8077132243035 | 1050 | 6 | 28 |
| 1 | 327.82437989097014 | 1051 | 6 | 28 |
| 2 | 327.8410465576368 | 1052 | 6 | 28 |

The three clocks advance by the original exact `previous + 1/60` operation. Each has 3,752 vertices and 21,546 actually drawn indices; actual status spray counts are 4,096 in these three states only. The first eligible four-neighbor OPEN bracket is recorded as **initialSelection**, with front ID 0, initial slice 16, sigma 6.3455729484558105–6.835921287536621. Repeating that initial bracket in later metadata does not identify a persistent material point. Published front records omit `FrontPoint.id` and `jetStrip`.

The [typed-field index](retained-index.json) lists 106 retained fields: front controls; published surface, flow and aeration; actual drawn positions/indices; mask; all captured per-slice typed fields; and the first shared bed. The original 107 transported artifacts comprise those 106 unchanged `.bin.gz` files plus the unchanged deflated export, totaling 6,362,979 stored bytes. Byte-identical artifacts are deduplicated with every original path/byte/SHA alias preserved in [manifest.json](manifest.json). There are 81 unique original compressed transport payloads, totaling 6,362,354 bytes after that exact deduplication. No compressed field was regenerated or numerically altered.

These fields do **not** constitute complete optical replay inputs. Active mesh normals, sheet/throat/tube/ray attributes and other primary fields are hash-only in the raw report. Frame 1's retained published `flow` SHA differs from hash-only `drawnWaterFlow`; frames 0 and 2 match. Hash-only `loftIndices` differs from retained actual `drawnIndices` in all three states. They are distinctly named buffers/stages, and this archive does not infer a geometry defect from their differing hashes. The actual retained drawn positions/indices are the authority for those three drawn geometries. No paused held proof ran after the five-state requirement failed.

## Later export is a separate epoch

The UI was paused and outstanding steps reached 0 before the actual worker export. Its compressed bytes are preserved under [the original deflated payload](evidence/root-run/capture/committed-worker-export.bin.deflate). The independently decoded SET1 header records solver time 52.69999999999905 plus sea-time offset 275.34104655763775 = **328.04104655763683**. That clock is later than the three drawn states; exported point/strip IDs belong solely to this later epoch and cannot retroactively establish their material continuity.

The export is 2,423,908 compressed bytes (SHA256 `dd97ed4b53d1aa78eabdb58534a370e26d03cf553fe1bf26fe18d83d9bad48b3`), expanding to 5,723,732 bytes (SHA256 `5ff85c873bb360c5df127084cb01b84fddd26ed971fa3ca19ddf3ece5bd6db18`). Its arrays contain 1,392,480 F32 words. This is the actual transport encoding, not a complete internal F64 solver snapshot. Header length, padded array length, export clock and declared byte hashes are checked without importing the game.

## Source iterations and checks

The untouched [v0 readiness](evidence/source-v0/ready.json.gz), [seven-payload preservation manifest](evidence/source-v0/manifest.json.gz), original [page observer](evidence/source-v0/page-prelude.js.txt), [driver](evidence/source-v0/capture.mjs.txt), plan and proposal retain their source-only flags and original paths verbatim. The [v0 checks](evidence/root-checks/terminal.json.gz) passed three syntax and two unarmed commands against 625 before/after pins, 06:11:48.756744–06:11:49.121557 UTC. V0 was never run natively.

Root requested one source repair before native execution: require an actual coherent completed paused draw, retain paused proof inputs before yielding, require fresh afterRender marks, distinguish changed drawn flow, qualify mask coverage and label the initial bracket honestly. The exact repaired [page observer](evidence/page-prelude.js.txt), [driver](evidence/capture.mjs.txt), [plan](evidence/plan.json.gz), [proposal](evidence/proposal.md.gz) and [v1 readiness](evidence/ready.json.gz) are preserved. The raw readiness still says source-only; that is its historical preparation status, not the current archive outcome. The [v1 checks](evidence/root-checks-v1/terminal.json.gz) passed the same five commands against 627 pins, 06:18:25.951184–06:18:26.268360 UTC, before this sole native attempt.

Source-ready v0 SHA256: `95acf70b5d0a64f9add071d2d71e30a62b00ed3f7d8eb2ccaa5d3d5d75b4df34`. V1 SHA256: `de7b305819c03bd4ae25b1c8e82081fb13e88b103bf1d5616cd384c6ec7f5ae6`. Shared [source/build authority](evidence/authority.json.gz) SHA256: `400d457150e8dd933ed84d1e7449b8a1e653101813f60a96c7973a17a9f910f4`. Actual report SHA256: `46167994db8c914e2b7be44032e440d74585624dbcc3e68b49cfdcf4ca495988`. Root's separate [postproof](evidence/root-postproof/verification.json.gz) verifies 616 current authority identities, all 107 transported artifacts and all 106 field identities, and explicitly records the native failure.

## Verification and external authority

Run `python3 verify.py` for stored/expanded/alias/closure/field-length/revision/SET1 checks, or `python3 verify.py --external` to additionally verify all external identities. The verifier executes no harness, game import, simulation, rendering, network or benchmark. Its only external command is read-only `git cat-file --batch` for exact committed source bytes. [verification.json](verification.json) records the completed archive byte verification; it does not make the native run pass.

Generated JSON/text compression uses deterministic gzip `mtime=0`. Original gzip/deflate artifacts remain byte-identical. Source/harness files have `.txt` suffixes; no archived live test files are discoverable by Vitest. Original paths are aliases, not instructions. V0 path references that now name v1 files resolve by their original SHA to archived v0 bytes, not by today's path contents.

The compiled 11-file build and 38 public assets remain external SHA-bound references; no bundles, assets, dependency trees or full canonical source tree are duplicated here. Runtime/source identities bind to exact Git blobs at accepted **`b0e003b8670c9d0be83bc9bb24c30b5382a54499`** with BUILD_ID **`306258296`**. Original canonical paths are retained verbatim, while generated verification mappings use that immutable commit or an existing exact durable metadata alias. The original authorities are not rewritten. This archive owns no production changes and supplies no new physics, visual-quality or performance acceptance.

Two separate late inquiries were **source-only**: cosmetic foam coarsening would have to retain fine breaking sources and air's shared advection lookup, with gain unproved after the earlier complete-path rejection; accepted prefetch already holds mapped GPU results without speculative F64 state checkpoints, leaving only a discard-specific layout-upload opportunity with no established normal-FPS gain. Neither inquiry ran a new experiment or changed this capture.
