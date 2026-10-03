# Ordinary Padang Big catchup-batch2 verification

**Rejected as the offline default.** The~29Hz fresh-publication cadence, with98.4% two-step advances, traded away water update cadence for the modest simulation-progress gain from.887× to.947× in these separate samples. Default maxBatchSteps returned to1; frozen4202 preserves this experiment. No threshold tuning or further FPS experiment was selected.

One authorized90-second passive sample ran on immutable preview4202 after all other owned Chrome, CPU/GPU probes, tests, and builds were paused. It used ordinary menu → Surf → Padang → Big → Paddle out, idle rider, five-second warmup, High/Rich/High particles, numeric60cap, CSS1708×926, browserDPR2, native renderDPR1.75, buffer2989×1620, and production pixel normals. No physics, render-spacing, normal, particle, camera, or recorder overrides were supplied.

All original configuration and quality guards passed: seed8761, Hs3.8m, T18s, direction0°, spreading150,64components, ordinary default dx2/fineSpacing1/renderSpacing2, GPU compute, Rich water, vertexNormals=false, High particles. Runtime host maxBatchSteps=2 matched the catchup edition. Every served index/JS/CSS bundle and qa-source.json matched the immutable directory. The eight graphics/water/particle source hashes still match eea68720f; all five frozen production hashes in qa-source.json match the working tree.

| Measure | Earlier current single-step publication pass | Catchup2 pass |
| --- | ---: | ---: |
| Actual rendered frames/s | 60 | 60 |
| Fresh water publications/s | 53.2 | 28.64 |
| Fixed physics steps/s | ≈53.2 (one step/publication) | 56.8 |
| Simulation seconds/wall second | 0.887 | 0.947 |
| Publication interval p50/p95 (ms) | 17.5/27.8 | 33.8/47.1 |
| Publication interval p99/max (ms) | 32.8/90.2 | 54.8/70.6 |
| Draw interval p50/p95 (ms) | 16.7/24.9 | 16.7/25 |
| Draw interval p99/max (ms) | 25.9/74.9 | 26.1/33.8 |

The catchup edition achieved higher average simulation progress in this sample, but not60Hz published water. It delivered 2578 publication events (28.64/s), 2577 clock advances, zero duplicates or rewinds, and 85.2s of physics over the sampled publication wall span. Fixed-step rates are inferred from seaTime increments divided by unchanged1/60s physics step. All increments were integral1/60 steps: 42 one-step advances and 2535 two-step advances (98.4% two-step).

The observed~29Hz publication cadence is distinct from60Hz drawing and56.8Hz physics. This trades fewer geometry publications for better physics catchup; it must not be presented as60Hz fresh-water animation. The earlier single-step pass was separate rather than a randomized paired experiment, so its improvement is descriptive rather than a precise causal estimate. Performance target attainment remains unproven; no visual/gameplay smoothness verdict was taken from this passive counter run.

| Sample wall window start (s) | Fresh publications/s | Fixed physics steps/s |
| --- | ---: | ---: |
| 0 | 34.68 | 60.32 |
| 10 | 29.72 | 59.43 |
| 20 | 29.62 | 59.24 |
| 30 | 29.77 | 59.55 |
| 40 | 29.95 | 59.9 |
| 50 | 30.32 | 60.63 |
| 60 | 29.53 | 59.06 |
| 70 | 29.2 | 58.4 |
| 80 | 23.42 | 46.84 |
| 88 | 24.42 | 48.84 |

Physics stayed near59–60steps/s over many early/middle windows, but late-breaking windows fell below that:80–82s 46.84steps/s;88–90s 48.84steps/s. Short-window rates may exceed60 during catchup. Publication arrival intervals and overall sea-time/wall progress are the direct cadence evidence.

Pipeline semantics are explicitly recorded in the raw report. Physics/device/step fields describe the final step of each batch. batch measures the whole advance loop (30.7/43.6ms p50/p95 here), while snapshot and summary happen once per publication. total=(batch+snapshot+summary)/batchSteps is amortized per physics step (16.8/23.4ms p50/p95), not complete request/publication latency. Independent stage quantiles must not be summed. Passive sampling submitted no WebGL GPU timestamp queries.

Frozen directory: /private/tmp/surf-tube-catchup-20261003. Entry assets/index-zc85wl9q.js; unchanged physics worker assets/surfZoneWorker-BH6FhcTP.js. Aggregate index/JS/CSS SHA256 47757baa7d819dc43f8406e11d14b70dc634273a6344580f60f5e0100eca400d. qa-source.json SHA256 3db2cc9196e456d29631839f4da32a7a9e728a7ea403829b2dcc33f2639a1b6f. All11 served artifacts verified. Raw full report: [ordinary-padang-big-fps-catchup-batch2.json](ordinary-padang-big-fps-catchup-batch2.json). Process exited0 and owned Chrome closed. No repeat was run.

Reproduction (add --plan to validate local inputs without launching Chrome):

```sh
node scripts/browser/fps-survey.mjs /private/tmp/tube-stability-padang-fps-catchup-batch2.json \
  '--url=http://127.0.0.1:4202/?diagnostics' \
  --dir=/private/tmp/surf-tube-catchup-20261003 \
  --baseline=docs/research/performance-2026-10-03/padang-live-frame-pacing.json \
  --qualityBase=eea68720f --edition=catchup-batch2 \
  --features '--only=High (baseline)' --spot=Padang --swell=Big \
  --width=1708 --height=926 --rideSeconds=90 --warmSeconds=5 \
  --gpuTiming=false --cdp=9438 --build=tube-stability-catchup-batch2
```
