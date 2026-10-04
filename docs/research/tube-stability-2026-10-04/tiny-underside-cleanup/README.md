# Tiny underside drawing cleanup: offline proof only

The bounded drawing prototype removes the three tiny underside folds present in 12 fully formed OPEN profiles from three retained actual Big Padang drawn states. The nine clean controls remain exact. The whole **LOFT + full MASK** CPU gate reports mean paired overhead **0.0242467 ms**, with approximate upper 95% paired-mean bound **0.0511506 ms**, below the predeclared 0.1 ms limit. Paired p95 overhead is **0.324916 ms**; passing the mean bound does not establish a frame-time tail guarantee. **No native render, FPS experiment or production adoption was performed.**

These are the same three consecutive drawn states from the [failed five-state native capture](../live-big-capture/README.md), at sea times 327.8077132243035, 327.82437989097014 and 327.8410465576368. They do not supply the missing fourth/fifth states or a persistent material lifecycle. The [source-cause audit](../underside-source-cause/README.md) establishes centimeter-wide, millimeter-high local source folds; this cleanup does not explain or claim to fix the user's major tube behavior. It retains the source profile clocks. It is neither a physics simplification nor an FPS result.

## Candidate and exact proof scope

The [original proposal](evidence/proposal.md.gz), [helper source](evidence/tinyUndersideCleanup.ts.txt.gz) and [literal patch transformation](evidence/patch-source.mjs.txt.gz) are preserved without edits. The transformation targets exact accepted Git checkpoint `b0e003b8670c9d0be83bc9bb24c30b5382a54499` SweptLoft anchors. It adds a reusable helper and one explicit drawing-only hook requiring `!contact`, OPEN phase and full weight, after the original material tables and before world placement. It searches only underside segments 64..87, accepts one strict proper crossing with the entire replacement interval within 4 cm × 1 cm, and changes only interior points between unchanged endpoints. Multiple crossings, large intervals, collapse/duplicates or new intersections/touches/overlaps reject the proposal unchanged. This is a bounded local line replacement, with no phase warp or asset rewrite.

The [actual proof report](evidence/verify-first/report.json.gz) is 37,199 original bytes, SHA-256 `99f78a40c68f28637ab4cb2c8b82463e5243b38475434eb89e570b6b65c0c949`. It reports all 12 source profiles and three rebuilt drawing states:

- Three folds disappear at frame/slice 0/16, 1/17 and 2/18; each changes exactly three vertices. The nine clean source profiles retain their original hashes. No new crossing, touch, overlap, duplicate or zero-length segment is accepted.
- The baseline reproduces captured positions, slice arrays and source index bytes. Candidate changes are confined to those interior vertices and the existing normal stencil (11 changed vertex normals per frame); all other active arrays/scalars, material data and indices remain exact. Zero-area triangles remain zero.
- All three actual native masks remain byte-exact. The 93 source field planes plus three mask planes decode to 3,808,479 bytes.
- Eager and fully materialized deferred contact remain byte-exact against independent baseline active arrays/scalars for each state: six contact comparisons. Drawing-only edits do not alter the physical contact surface.

This numerical proof does not establish the appearance of changed normals, initial rendering, shader/framebuffer parity, tube motion quality or general safety on other profiles. The candidate's altered mesh winding/normal appearance still requires separate review. The original renderer and contact arithmetic are not replaced with fixture formulas.

## Actual execution and whole-path cost

The [original readiness](evidence/ready.json.gz) SHA is `9aa8072c37d9180ea6e768074cdbf560ccb714d0ae89d05845fde782075fb61a`. Its `sourceOnly` and unexecuted flags record preparation time and remain verbatim; the following later root gates actually ran. The source-only proposal is historical, not the current gate status. No failure/retry is recorded for these completed gates.

| Gate | Actual UTC / process | Result and preserved evidence |
| --- | --- | --- |
| Strict, two syntax checks, eight focused regressions, pinned bundles, two unarmed drivers | 2026-10-04 06:49:52.387237–06:49:55.095411; PID 48019 | Seven commands exit 0; eight tests pass; 153 input pins unchanged. [Terminal](evidence/root-checks/terminal.json.gz), [test JSON](evidence/root-checks/vitest.json.gz), all seven original logs. |
| One bounded actual proof | 06:50:41.974724–06:50:42.278585; parent 48230, child 48231 | Exit 0; 158 pins unchanged; outer bound 20 s. [Outer terminal](evidence/root-proof-first/terminal.json.gz), [gate terminal](evidence/verify-first/terminal.json.gz), original command log. |
| One bounded whole LOFT + MASK cost | 06:50:48.633859–06:50:49.214210; parent 48268, child 48269 | Exit 0; 160 pins unchanged; outer bound 20 s/internal trial limit 8 s. [Outer terminal](evidence/root-cost-first/terminal.json.gz), [gate terminal](evidence/cost-first/terminal.json.gz), original command log. |

The [cost source](evidence/cost.ts.txt.gz) and [raw cost report](evidence/cost-first/report.json.gz) preserve 18 warm pairs and 180 measured alternating BC/CB pairs, in three 60-pair blocks over the retained states. Each timed trial includes complete original SweptLoft construction, material tables, normals and full 321 × 1265 mask clear/rasterization/count. Decoding, hashing, imports, assertions, mesh copies, GPU execution, simulation and native rendering are excluded. Mask bytes are checked after timing.

| Reported paired overhead | Milliseconds |
| --- | ---: |
| Mean | 0.02424671111111299 |
| Median | 0.012875000000008185 |
| p95 | 0.32491599999997334 |
| Approximate upper 95% paired-mean bound | 0.051150626862037446 |
| Predeclared mean-bound threshold | 0.1 |

Cost report: 39,120 original bytes, SHA-256 `c4edc719716a3198de158397c2881d3dee693393e83a8735dd65e68bc19f0ebf`. The interval is an approximate normal interval on one bounded CPU run, not a population guarantee. No resampling, extra candidate, retry or native FPS run follows it here.

## Preservation and verification

[Manifest](manifest.json) records every stored/expanded byte count and SHA, original absolute aliases, and external verification routes. All source, tests, drivers, configs, readiness, root wrappers, first logs/reports and input inventories are losslessly compressed with gzip `mtime=0`; exact equal payloads share aliases. JS/TS/Python source aliases carry `.txt.gz`, so they do not enter normal Vite/TypeScript/Vitest discovery. Raw commands retain their original private paths as provenance and are not portable execution instructions. The standalone [byte verifier](verify.py) imports no game/test/helper code and reruns no proof or cost workload.

The four compiled module identities are preserved in [compiled metadata](evidence/compiled.json.gz) and verified externally. No bundled runtime/source tree is duplicated. The actual field planes, four authored cases, tested geometry helper and parent authority/report bytes resolve through the frozen [profile-phase](../profile-phase/README.md), [live capture](../live-big-capture/README.md), [drawn audit](../drawn-section-audit/README.md) and [source-cause](../underside-source-cause/README.md) archives. Canonical source/package identities resolve to immutable `b0e003b8670c9d0be83bc9bb24c30b5382a54499` Git blobs, rather than depending on future working-tree contents. A small Rolldown entry and four compiled modules retain explicit original external path/hash identities. Original authority JSON and aliases remain unchanged.

Manual byte verification, without simulation or numerical execution:

```sh
python3 docs/research/tube-stability-2026-10-04/tiny-underside-cleanup/verify.py --external
```

[Verification record](verification.json) records the archive-only result. Native quality, general coverage, contact trajectories, performance/FPS adoption and completion of the user's goal remain unproved.
