# Render scale 1.75 → 1.5: no material fresh-update gain

The reviewed v3 pair does **not** justify changing production pixel density or defaults. Both ordinary 90-second Padang Big samples drew at 60 FPS. Fresh water updates changed only 56.06 → 56.07 Hz. Some latency tails improved and others worsened; this is not a claim that every metric was unchanged. Production remains at the native cap of 1.75. No further hardware run or repeat was performed.

| Measured metric | High, ratio 1.75 | Custom High × 6/7, ratio 1.5 |
| --- | ---: | ---: |
| Drawn FPS | 60 | 60 |
| Fresh publications / physics steps per second | 56.06 / 56.06 | 56.07 / 56.07 |
| Simulation seconds per wall second | 0.934 | 0.935 |
| Canvas backing pixels | 2989 × 1620 | 2562 × 1389 |
| Publication interval p50 / p95 / p99 / max, ms | 17 / 24.5 / 30.4 / 36.7 | 17.1 / 23.9 / 29.2 / 41.4 |
| Draw interval p50 / p95 / p99 / max, ms | 16.7 / 24.9 / 25.8 / 26.9 | 16.7 / 25.2 / 26.4 / 33.1 |
| Pipeline total p50 / p95, ms | 16.8 / 24 | 16.8 / 23.2 |
| Water p50 / p95, ms | 6 / 11.3 | 5.7 / 10.7 |
| Device map p50 / p95, ms | 3.3 / 8.5 | 2.9 / 7.8 |
| Contact p50 / p95, ms | 1 / 3.5 | 1.1 / 3.5 |
| Foam p50 / p95, ms | 2.1 / 2.8 | 2.1 / 2.7 |
| Aeration p50 / p95, ms | 1.6 / 2.1 | 1.6 / 2.1 |
| Snapshot fields p50 / p95, ms | 2.3 / 2.9 | 2.4 / 3.2 |

These were passive, sequential runs on the M5 Pro, Google Chrome 154.0.8037.93, AC power, native display at 120 Hz, CSS viewport 1708 × 926 and browser DPR 2. No WebGL GPU timestamp query was enabled. This single pair provides neither statistical confidence nor causal separation of GPU execution, queuing and CPU work. Independent stage quantiles must not be summed.

The [predeclared intent](render-scale-intent.md) records exact commands, hashes and guards. Both runs used only `?diagnostics` on immutable 4201, aggregate build SHA-256 `7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3`. Every served index/JS/CSS asset matched the frozen directory and eight quality sources matched `1bcc7c0c9`. This canonical directory has no optional `qa-source.json`; no proof from that absent file is claimed. The exact main factory body was separately checked against `1bcc7c0c9` in the small protocol tests.

Both actual worker starts retained seed 8761, Hs 3.8, T 18, direction 0, spreading 150, default dx 2 / fine spacing 1 and 64 components. Requests retained `rider:true`, four barrel cases, and their canonical own `renderSpacing:undefined` member; the observed render grid used spacing 2 and independent mask spacing 1. Rich water, High particles, production pixel normals and numeric frame limit 60 were unchanged. Every observed advancing publication carried one fixed 1/60 step (5047 / 5049 deltas), with no rewind or nonintegral delta. Custom is explicitly a graphics tradeoff, not native-quality-preserved. Both owned Chrome sessions closed and CDP 9535/9536 had no remaining listeners.

## Late activity still slows the water

The retained timeline uses two-second **wall-time** bins, not matched sea-state bins. It shows the same late slowdown in both runs. Selected bins below are bin medians and bin-local rates; they are not recomputed quantiles for a combined late window. The partial final bin at 90 seconds remains in raw data and is excluded from this table.

| Wall seconds from sample start | Fresh Hz, High → Custom | Total p50 ms, High → Custom | Contact p50 ms, High → Custom |
| --- | ---: | ---: | ---: |
| 76–78 | 54.21 → 53 | 16.9 → 17.3 | 1.4 → 1.6 |
| 78–80 | 46.93 → 47.7 | 20.6 → 19.3 | 2.6 → 2.7 |
| 80–82 | 47.68 → 46.27 | 19.3 → 19.4 | 3 → 3.1 |
| 82–84 | 44.72 → 43.91 | 21.6 → 21.7 | 4.1 → 4.2 |
| 84–86 | 42.26 → 44.57 | 22.4 → 20.7 | 3.6 → 3.5 |
| 86–88 | 46.39 → 46.76 | 19.2 → 19.6 | 2.2 → 2.2 |
| 88–90 | 44.95 → 45.54 | 20.3 → 20.3 | 2.4 → 2.6 |

The 26.508% pixel-count reduction did not remove this late bottleneck. The lower device-map tail alone is insufficient evidence to attribute the remaining cost or claim a material benefit.

## Matched held raster evidence

After passive sampling and validation, the game paused, outstanding steps settled, RAF was held and the real renderer refreshed the complete loaded scene. The baseline scene was drawn at 1.75 → 1.5 → 1.75 with the same camera, physics, geometry, time and lighting. Decompressed SET1 bytes, snapshot/init/water/loft arrays, actual scene attribute/index/skeleton arrays and identities, attribute versions, draw ranges, mesh/world transforms and CSS-aspect camera projection remained unchanged. Actual compiled shaders/defines, light/shadow state and own-surfer Infinity/2048 detail matched. Visible spray 4597 and bubbles 4096 actually drew, and both mandatory resolution-uniform checks passed at each ratio.

The returning native PNG was **byte-identical** to the first (`75519806338b2afce1d948ed7e1b1d9c50c49d89d00fc057cf5f648f0fdb9896`). Its durable representation is an explicit alias to the identical original native image; its original path, hash and byte count remain in the manifest. The 1.5 image differs, as expected from a raster tradeoff. The full-frame pair appears broadly similar, but the viewing tool reduced 3416 × 1852 compositor images to 2048 × 1110. This is not close-tube or close-foam quality proof.

The separate candidate's actual Custom frame also passed its held invariants and particle sizing checks, but its final sea time 400.89104655763265 differs from baseline 400.69104655763266. Those evolving final states are not compared as a physics-parity pair. GPU-only FFT/caustic/shadow texture bytes were not read back; actual shader/lighting checks and the exact native-return PNG provide the available presentation evidence.

The baseline lossless source contains 297 retained array fields and 41,915,068 raw array bytes. Its actual render grid is 161 × 633 at spacing 2, xMin −160 and zMin −1233.0249111256337; its mask is 321 × 1265 at spacing 1. Actual coarse geometry has 101,913 position vertices and 606,720 indices (202,240 triangles); Rich patch geometry has 149,761 vertices and 893,952 indices (297,984 triangles). These source-backed counts corroborate the earlier geometry audit without inferring counts from screenshots. Baseline source gzip SHA-256 is `95f3937160eff73a9c751fcbdc2246a811978b49be7dbbda0e56ed9dea69e584`, decompressed JSON SHA-256 `8e73b4d10d268081891d0bf89b93c6706b37617a6bea5543af443d6963443587`.

[Native held frame](render-scale/baseline-native.png) · [Same scene, ratio 1.5](render-scale/baseline-raster1p5.png) · [Separate actual Custom final frame](render-scale/candidate-actualCustom.png).

## Lossless archive and rejected QA preparations

[Archive manifest](render-scale/manifest.json) retains byte hashes, paths and archive scope. Complete baseline/candidate frozen sources remain as original lossless gzip (15,308,604 / 15,294,775 bytes; decompressed JSON 59,541,184 / 59,547,874 bytes). Three unique native PNGs are retained unchanged. Raw FPS JSON is archived as deterministic gzip; [pure postprocessing](render-scale/summarize.mjs) accepts these files and preserves all timing rows in [summary](render-scale/summary.json). All originals also remain under `/private/tmp/render-scale-quality-default-option-20261003`.

The first baseline completed its sample but an incorrect guard demanded explicit request spacing 2. Its raw report, failure screenshot, exact prepared sources/plans and metadata are preserved under `render-scale/failed-baseline`; it is excluded from the validated comparison. Unexecuted v2 then incorrectly demanded absence of the own property. Root review caught that wrong fixture before any run; exact rejected sources/plans/test data remain under `render-scale/rejected-v2`. Reviewed v3 instead tested the exact game factory and structured clone, with ten protocol cases, and introduced no request override. Original failed/preparation data was never edited.

No production source, settings default, fluid grid or material rule was changed for this experiment.
