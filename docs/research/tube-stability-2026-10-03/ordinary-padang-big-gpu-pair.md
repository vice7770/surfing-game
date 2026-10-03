# Ordinary Padang Big GPU diagnostic pair

The frozen4192 baseline and frozen4201 tube build ran sequentially for60seconds each with five-second warmup and GPU timer queries enabled. Both used the ordinary menu → Surf → Padang → Big → Paddle out route, seed8761, Hs3.8/T18/direction0/spreading150/64components, High/Rich/High particles/numeric60cap, CSS1708×926, browserDPR2 and native buffer2989×1620. No production physics, render-spacing, normals, camera, or recorder overrides were supplied. Other agent probes/builds/tests were paused during the pair. Both passed config/quality/hash guards and exited0 with owned Chrome closed.

These are intrusive diagnostic samples, explicitly labeled baselineComparable=false and ordinaryConfigMatches=true in the raw reports. Their cadence must not replace the90-second passive verification. The60-second window omits the final30seconds of that longer check, including some late-breaking costs.

| Metric | Frozen baseline | Current tube build |
| --- | ---: | ---: |
| Game WebGL GPU p50 (ms) | 8.34 | 8.26 |
| Game WebGL GPU p95 (ms) | 11.24 | 11.32 |
| GPU timestamp samples | 3621 | 3620 |
| Actual rendered frames/s | 60 | 60 |
| Fresh publications/s (diagnostic) | 56.29 | 56.51 |
| Simulation/wall rate (diagnostic) | 0.938 | 0.942 |
| Issued draw calls/frame p50 | 53 | 53 |
| Issued triangles/frame p50 | 1362141 | 1358487 |
| Issued triangles/frame p95 | 1389609 | 1389283 |

WebGPU deviceMap p50/p95 was 3.3/9.4ms baseline and 2.8/9.5ms current. Water p50/p95 was 5.9/12.2ms versus 5.6/12.5ms; total pipeline was 16.5/24.3ms versus 16.6/24.2ms. Timestamp support was available in both contexts; only the game context drew during the ride (1/1 active contexts).

This pair shows no aggregate WebGL GPU increase and no meaningful aggregate deviceMap-tail increase. Diagnostic current cadence slightly exceeded diagnostic baseline cadence. The earlier passive−4.7% fresh-cadence gap remains unresolved: these shorter intrusive measurements neither reproduce it nor prove a cause. No further old/current repeat was run.

## Matching absolute simulation-time bins

Each row groups issued draw calls and TRIANGLES primitives (including instancing and repeated render/shadow passes), game-context GPU query results, and worker pipeline readings by the latest received absolute seaTime. The bins compare wave clocks despite differing wall cadence. Particle points are not counted as triangles. They do not compare identical contact/rider states if physics interactions differ. First315–320s and last370–375s bins are only partially sampled.

| Absolute sea-time (s) | WebGL GPU p50/p95 baseline→current (ms) | Draw calls p50 baseline→current | Triangles p50 baseline→current | WebGPU map p95 baseline→current (ms) |
| --- | --- | --- | --- | --- |
| 315–320 | 8.31/11.06 → 8.18/11.36 | 53 → 53 | 1355029 → 1355029 | 7.3 → 9 |
| 320–325 | 8.68/11.26 → 8.71/11.61 | 53 → 53 | 1355029 → 1355029 | 9.2 → 15.6 |
| 325–330 | 8.61/11.33 → 8.19/11.5 | 53 → 53 | 1355029 → 1355029 | 7.2 → 9.9 |
| 330–335 | 8.59/11.29 → 8.43/11.65 | 53 → 53 | 1355029 → 1355029 | 7.1 → 6.3 |
| 335–340 | 8.19/10.91 → 8.14/11.21 | 53 → 53 | 1355029 → 1355029 | 6.3 → 5.6 |
| 340–345 | 8.57/11.2 → 8.25/11.44 | 53 → 53 | 1355029 → 1355029 | 6.6 → 9.7 |
| 345–350 | 8.07/11.63 → 8/10.6 | 54 → 54 | 1370191 → 1367797 | 16.3 → 8.1 |
| 350–355 | 8.29/11.23 → 8.32/11.33 | 54 → 54 | 1373619 → 1371117 | 15.9 → 15.2 |
| 355–360 | 8.63/11.8 → 8.47/10.62 | 54 → 54 | 1375245 → 1374247 | 16.9 → 7.5 |
| 360–365 | 7.62/10.35 → 7.79/9.68 | 54 → 54 | 1380299 → 1380299 | 8.6 → 8.3 |
| 365–370 | 8.34/11.16 → 8.42/11.35 | 54 → 54 | 1369323 → 1369838 | 12.8 → 11.1 |
| 370–375 | 8.38/12.05 → 8.88/12.15 | 54 → 54 | 1425344 → 1427755 | 12.2 → 12.1 |

In full bins, p50 draw counts match53 or54; triangles are equal before visible tubes and differ by less than0.2% in the later full bins. WebGPU map tails vary in both directions across bins without a consistent scene-GPU increase. These readings do not establish a GPU-rendering cause for the passive slowdown.

ANGLE Metal WebGL elapsed queries follow the GPU timeline and may include overlapping WebGPU/other-process work; they are not isolated shader timings. DeviceMap measures worker readback wait, including prior GPU queue work and scheduling, rather than a single kernel. Stage quantiles are independent and should not be summed.

Artifact aggregates (index/allJS/CSS): baseline 4d702a0e6405ee62eb27a67fc2d89f53d7b4f10008f789d2aa754e7406eab8bd; current 7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3. Source quality audit again matched eea68720f. Full per-bundle hashes, per-stage p50/p95, bins and runtime settings are preserved in [baseline raw](ordinary-padang-big-gpu-baseline.json) and [current raw](ordinary-padang-big-gpu-current.json). Passive verification: [ordinary-padang-big-fps.md](ordinary-padang-big-fps.md).

Reproduce with that passive command plus --gpuTiming=true --diagnosticGpu=true --rideSeconds=60 and a distinct diagnostic output; baseline uses4192 and /private/tmp/surf-pipeline-frame-pacing-20261003, current uses4201 and /private/tmp/surf-tube-stability-current-20261003.
