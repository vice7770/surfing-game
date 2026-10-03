# Ordinary Padang Big FPS verification

This 90-second idle-rider sample used the ordinary menu → Surf → Padang → Big → Paddle out route on immutable preview4201. It retained High graphics, Rich water, High particles, numeric frameLimit60, native density, and production pixel normals. No physics, render-spacing, normal, camera, or recorder overrides were supplied. The script inserted passive counters; GPU timer queries were disabled. A five-second warmup preceded the sample.

The observed CSS viewport1708×926, browser DPR2, native render DPR1.75, and drawing buffer2989×1620 match the saved baseline. Both configurations are seed8761, Hs3.8m, peak period18s, direction0°, spreading150,64components, default dx2m/fineSpacing1m. Current runtime reported renderSpacing2m, Rich water, vertexNormals=false, High particles, GPU compute, and ride screen. Every expected config and graphics field passed validation.

| Metric | Saved baseline | Current tube build |
| --- | ---: | ---: |
| Actual rendered frames/s | 60 | 59.9 |
| Draw interval p50 (ms) | 16.7 | 16.7 |
| Draw interval p95 (ms) | 25 | 25.1 |
| Draw interval p99 (ms) | 25.7 | 26.2 |
| Largest draw interval (ms) | 32.8 | 133.5 |
| Fresh snapshots/s | 57.7 | 50.9 |
| Simulation seconds/wall second | 0.962 | 0.848 |
| Solver telemetry p50 (ms) | 12.1 | 13.2 |
| Largest solver telemetry (ms) | 22.6 | 171.1 |

Fresh cadence fell 11.8% in this pass while display FPS remained near60. Current snapshot interval p50/p95/p99/max was 18/29.1/34.2/185.5ms. The older report did not record those interval quantiles. Both runs used AC power,120Hz display, Chrome154 and AppleM5Pro ANGLEMetal. Start load averages were 6.82/7.21/6.64 baseline and 6.87/6.78/6.72 current.

| Pipeline stage | Baseline median (ms) | Current median (ms) | Current p95 (ms) |
| --- | ---: | ---: | ---: |
| water | 6.5 | 7 | 15.3 |
| front | 1.4 | 1.7 | 2.3 |
| foam | 1.9 | 2.2 | 3 |
| aeration | 1.5 | 1.6 | 2.3 |
| contact | 1.1 | 1 | 2.8 |
| spray | 0.3 | 0.3 | 0.5 |
| bubbles | 0.2 | 0.2 | 0.3 |
| snapshotFields | 2.2 | 2.5 | 3.5 |
| snapshot | 2.4 | 2.8 | 3.9 |
| step | 14 | 14.7 | 25.2 |
| total | 16.7 | 17.7 | 28.7 |
| deviceSubsteps | 1 | 1 | 2 |
| devicePack | 0.9 | 1 | 1.4 |
| deviceCfl | 0.2 | 0.3 | 0.4 |
| deviceEncode | 0.4 | 0.5 | 1.1 |
| deviceMap | 4 | 4.6 | 12 |
| deviceUnpack | 0.8 | 0.8 | 1.1 |

Several costs rose, including unchanged foam/advection and snapshot work, and current simulation time fell behind wall time. Contact costs at the same wall-time window therefore describe different sea states. This single sample confirms slower fresh-water cadence under these run conditions; it does not isolate a tube-code causal regression. Pipeline stage quantiles are computed independently and should not be summed. GPU deviceMap measures readback wait, not isolated shader execution.

The served index, all eight JavaScript bundles, and CSS were SHA256-verified against /private/tmp/surf-tube-stability-current-20261003 before Chrome opened. Aggregate index/JS/CSS hash: 7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3. Main: assets/index-Dhp1E5Jm.js, SHA256 cff7f235604df399fe95d2f872a877ca95fca141a66e588c0d9a5eb8efc90cf3. Worker: assets/surfZoneWorker-BH6FhcTP.js, SHA256 eb1a337b66c0eea19035241aee1c46a129a039548e21916d428a6a1a50d2d3c5. The aggregate includes CSS, unlike the older harness's JavaScript-only aggregate. Current graphics/settings/water/particle source hashes match stable base eea68720f; the raw report contains the eight-file source audit. The frozen directory's build.json labels its base commit and is not used as source authority.

Raw current report: [ordinary-padang-big-fps-current.json](ordinary-padang-big-fps-current.json). Saved reference: [padang-live-frame-pacing.json](../performance-2026-10-03/padang-live-frame-pacing.json). Owned Chrome closed cleanly; process exit0. A prior attempt was denied local-network access by the sandbox before Chrome launched; the identical permitted retry produced this sample.

Reproduction (use --plan first to validate local inputs without opening Chrome or contacting the server):

```sh
node scripts/browser/fps-survey.mjs /private/tmp/tube-stability-padang-fps.json \
  '--url=http://127.0.0.1:4201/?diagnostics' \
  --dir=/private/tmp/surf-tube-stability-current-20261003 \
  --baseline=docs/research/performance-2026-10-03/padang-live-frame-pacing.json \
  --qualityBase=eea68720f \
  --features '--only=High (baseline)' --spot=Padang --swell=Big \
  --width=1708 --height=926 --rideSeconds=90 --warmSeconds=5 \
  --gpuTiming=false --cdp=9438 --build=tube-stability-ordinary-padang-big
```

## Controlled sequential repeats

After the first slower current-build sample, the same harness ran frozen4192 baseline followed by frozen4201 current, each with the same90-second sample and five-second warmup. All other agent CPU/GPU probes, builds, tests, and visual diagnostics were paused during the pair. Both passed all config, graphics, viewport, native buffer, normal mode, compute, and served-bundle guards and exited0 with owned Chrome closed. These are separate raw reports; the first sample above has not been overwritten.

| Metric | Adjacent baseline repeat | Current repeat |
| --- | ---: | ---: |
| Actual rendered frames/s | 60 | 60 |
| Draw interval p50 (ms) | 16.7 | 16.7 |
| Draw interval p95 (ms) | 18.1 | 24.9 |
| Draw interval p99 (ms) | 18.4 | 25.9 |
| Largest draw interval (ms) | 32.7 | 74.9 |
| Fresh snapshots/s | 55.81 | 53.2 |
| Simulation seconds/wall second | 0.93 | 0.887 |
| Snapshot interval p50 (ms) | 17 | 17.5 |
| Snapshot interval p95 (ms) | 24.7 | 27.8 |
| Snapshot interval p99 (ms) | 28.1 | 32.8 |
| Largest snapshot interval (ms) | 66.2 | 90.2 |

The current repeat had 4.7% fewer fresh snapshots than the adjacent baseline. The baseline repeat also fell from the earlier57.70Hz reference to55.81Hz; the current improved from50.90Hz to53.20Hz. Run variability accounts for part of the first large gap. The paired current build remains slower in fresh-water cadence and has longer snapshot/draw tails. Performance preservation is unresolved; this pair does not establish that all remaining differences are caused by tube code. No performance-passed claim is made.

| Stage | Baseline repeat p50/p95 (ms) | Current repeat p50/p95 (ms) |
| --- | ---: | ---: |
| water | 5.6/10.9 | 5.7/14.8 |
| front | 1.6/2.3 | 1.6/2.2 |
| foam | 2.3/2.9 | 2.3/3.1 |
| aeration | 1.7/2.2 | 1.7/2.3 |
| contact | 1.1/3.7 | 0.9/3.2 |
| snapshotFields | 2.3/3.1 | 2.4/3.5 |
| snapshot | 2.6/3.5 | 2.7/3.8 |
| step | 13.9/21.3 | 14/24 |
| total | 16.7/24.3 | 17.2/27.2 |
| deviceMap | 2.8/8 | 2.8/11.7 |

Median foam2.3ms and aeration1.7ms match in this pair. Current GPU readback wait p95 rose8.0→11.7ms while its median remained2.8ms, with water p95 rising10.9→14.8ms. Contact p95 fell3.7→3.2ms. These independently computed quantiles are descriptive and do not prove a sole cause. The two-second timeline includes state-dependent late-breaking costs; comparing equal wall times does not compare identical simulation times because cadence differs. Current's final88–90s window had37.5snapshots/s, water10.0ms, contact4.4ms, total25.2ms median; the corresponding baseline window had52.0snapshots/s, water5.8ms, contact2.2ms, total17.4ms.

Baseline index/JS/CSS aggregate SHA256: 4d702a0e6405ee62eb27a67fc2d89f53d7b4f10008f789d2aa754e7406eab8bd; entry assets/index-CD2rQvzE.js; worker assets/surfZoneWorker-C3UNXhgv.js. Current aggregate again 7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3, exactly matching its first pass. Start load averages were 8.06/7.54/7.07 baseline and 8.92/7.84/7.24 current.

Raw reports: [baseline repeat](ordinary-padang-big-fps-baseline-repeat.json), [current repeat](ordinary-padang-big-fps-current-repeat.json). Repeat commands use the reproduction above, changing output names; baseline uses URL4192 and --dir=/private/tmp/surf-pipeline-frame-pacing-20261003. All other sample arguments remain identical.
