# Half-metre patch v2: accepted lower workload, narrow visual evidence

Both serial ordinary90-second samples and the actual-renderer held guards pass. The reviewed decision accepts the single `.25→.5m` patch-spacing change as a **simpler, lower drawing/memory workload**: native default and elevated-close same-state images look very similar, with no obvious new cracks/facets in those selected views. The **56.45→56.56 fresh-Hz difference is not a meaningful physics FPS gain** established by this single pair. Cavity, grazing-skirt, all-grid seam parity and moving lifecycle remain unproved.

This review decision is separate from the raw automated flags: both held reports retain `qualityAccepted:false`, and candidate retains `nativeQualityPreserved:false` / `fullNativeGeometryPreserved:false`. Those bytes were never relabeled. [Root adoption validation](root-adoption-validation.json) records the exact two owned source/test hunks,53 passing tests across6 actually matched files, strict TypeScript/Vite success and byte-exact canonical physics worker hash. It preserves the absent test-filter detail and is tool-transcript authority, not fabricated stdout or a whole-suite claim. Production integration and the main performance index are parent-owned; this archive changes no production source.

## Passive FPS and late activity

[Baseline raw FPS](baseline-fps.json.gz) and [candidate raw FPS](candidate-fps.json.gz) retain the full ordinary reports. Same menu route, actual seed8761/Hs3.8/T18/spreading150, dx2/fine1/C64, rider/four barrel cases, render2/mask1, High/Rich/pixel normals and native ratio1.75 remain guarded. Source/build/worker authority is the unchanged [prototype manifest](../prototype/source-manifest.json). No GPU timestamp query, solver quality change, pixel-density override or benchmark replay was added.

| Retained metric | Quarter-metre | Half-metre |
| --- | ---: | ---: |
| Drawn FPS | 60 | 60 |
| Fresh snapshots / fixed steps per wall second | 56.45 / 56.45 | 56.56 / 56.56 |
| Simulation seconds per wall second | .941 | .943 |
| Advancing publications, all one fixed1/60 step | 5,081 | 5,090 |
| Drawn interval p50 / p95 / p99 / max, ms | 16.7 / 25 / 26 / 34.9 | 16.7 / 24.6 / 25.8 / 33 |
| Publication interval p50 / p95 / p99 / max, ms | 17 / 24.1 / 28.1 / 43.4 | 17 / 23.2 / 26.3 / 35.3 |
| Complete recorded pipeline p50 / p95, ms | 16.8 / 23.7 | 16.7 / 22.8 |
| Passive callback work p50 / p95, ms | .1 / 3.8 | .6 / 4.1 |
| Rendered triangle median | 1,371,737 | 1,149,067 |
| Recorded rendered draw calls | 54 | 54 |

Each advancing publication carries one fixed step, with no nonintegral delta or comparison failure. Draw/callback timing and asynchronous worker throughput are separate. The passive callback fields include capped scheduling and cannot stand in for complete draw or worker/GPU cost. The legacy baseline `drawCalls` field is0, while its held actual renderer records36/default and29/close; the raw discrepancy is retained rather than treated as absence of drawing. `renderedDrawCalls` is a distinct recorded field. Stage quantiles must not be summed, and this adjacent pair provides no confidence interval or causal speed attribution.

Two-second wall-time bins still slow late. These are bin-local rates/medians, not combined-window quantiles or matched sea-state windows; the partial final bin is excluded below and retained in raw data.

| Wall seconds | Fresh Hz quarter→half | Total pipeline p50 ms quarter→half |
| --- | ---: | ---: |
| 76–78 | 57.95→56.18 | 16.6→17.2 |
| 78–80 | 48.33→47.02 | 19.5→20.6 |
| 80–82 | 46.91→46.30 | 20.7→21.0 |
| 82–84 | 42.01→43.06 | 23.7→22.9 |
| 84–86 | 44.77→48.33 | 21.4→19.7 |
| 86–88 | 48.61→50.61 | 19.4→18.7 |
| 88–90 | 48.20→48.28 | 19.7→20.0 |

[Pure summary](summary.json) retains all wall bins, whole-run metrics, fixed-step distribution, actual held render counts and material ledgers. [Summarizer](summarize.py) only extracts retained data and checks ledger equations; it performs no simulation, rendering or timing. Its output reproduces byte-exactly from these archived reports.

## Same-state held geometry and exact returns

Baseline's [eight-frame held report](baseline-held-report.json) captures quarter→half→original identity restored→original repeat for both actual default and elevated close-crest views. Candidate's [four-frame report](candidate-held-report.json) captures native-half and repeat per view. Original material/shaders/uniforms, all unowned arrays/objects/geometry/transforms, serialized physics and original patch identity/signature stay strict. Within baseline, actual color-pass triangles drop by **exactly222,720 per view** with unchanged36/default and29/close draw calls; baseline temporary geometry is disposed without disposing the original. Candidate's `candidateOwnedGeometryDisposed:false` is N/A: no extra swap geometry was allocated, and its native half remained original.

Material versions are not tolerated or generally ignored. Installed Three's native transparent/DoubleSide/two-pass color path increments `needsUpdate` twice per eligible call. V2 records actual object/material/group callbacks, flags and exact expected raw versions. Two baseline materials each finish with20 eligible calls/40 native increments; candidate finishes12/24. All ledgers and owner pairing pass, while raw programs/material references/static flags remain strict. Positive transmission or extra callback/preparation changes are unsupported and fail. This source-supported path does **not** retroactively identify v1's missing after-state failure cause.

The complete lossless sources remain original gzip: [baseline](baseline-held-source.json.gz),17,543,451 bytes /70,059,127 decompressed; [candidate](candidate-held-source.json.gz),14,414,178 /54,138,824. Baseline sea clock401.074379890966 differs from separately initialized candidate401.324379890966. Only baseline's quarter/half/return pairs compare **one physical state and camera**; separately initialized candidate images are repeat evidence, not cross-run physics parity. Actual FFT/caustic/shadow targets stay in the loaded renderer; their GPU-only bytes are not read back or reconstructed. All owned Chromes/CDP9543/9544 and the already stopped play4200 are closed.

- Default same-state [quarter](baseline/default.nativeQuarter.png) · [half](baseline/default.half.png).
- Elevated close same-state [quarter](baseline/closeCrest.nativeQuarter.png) · [half](baseline/closeCrest.half.png).
- Separate native-half candidate [default](candidate/default.nativeHalf.png) · [elevated close](candidate/closeCrest.nativeHalf.png).

The [manifest](manifest.json) stores six unique native PNGs and records **all twelve original paths/checksums**, including four baseline return aliases and two candidate repeats. Every original alias matches its retained PNG bytes exactly. No image was edited or recompressed.

## Descriptive pixel comparison and acceptance limits

[Offline comparison](pixel-comparison.json) and the [exact script](pixel-diff.py.txt) hash-check the baseline same-state PNGs and exact returns. The browser PNG is **3416×1852** (CSS1708×926 at browser DPR2), distinct from the unchanged **2989×1620 render buffer** at renderer ratio1.75; browser composition/resampling is part of these images.

| Absolute encoded uint8 RGB-channel difference | Default | Elevated close |
| --- | ---: | ---: |
| Full-image RMS | .28653 | .35009 |
| Full-image p99 / maximum | 1 / 26 | 1 / 23 |
| Pixels with any changed RGB byte | 6.038% | 15.148% |
| Fixed lower-half ROI RMS | .36511 | .38678 |

These are encoded0–255 byte differences, not linear radiance, error tolerances or pass thresholds. The fixed lower-half ROI `[0,926,3416,1852]` is water-dominated but includes small rider/particle pixels and has no semantic water mask. Original/restored/repeat PNG and decodedRGBA are exact. The recorded counters and native presentation returns provide narrower evidence than complete appearance parity; the elevated close view is not an indexed-air/cavity or grazing-rim witness.

The unchanged [source audit](../source-audit.md) retains conditional source-node nesting and skirt/overlap limits. Vertex and primitive reductions are certain:149,761→38,017 vertices,297,984→75,264 triangles per patch draw, and5,359,104 fewer geometry payload bytes in the counted arrays. This motivates the selected-view adoption even without a material fresh-update gain. It does not fix the separate seam, fog or moving source/lifecycle defects, nor prove every narrow/clamped grid is visually equivalent.

The exact twelve v2 readiness records,11-test/syntax/plan authority, installed Three source bytes and original commands are retained under [preparation](preparation/readiness.json), separate from immutable [v1 failure/history](../README.md). No extra rendering or physics trial was performed to create this archive.
