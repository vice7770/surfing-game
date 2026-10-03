# Isolated GPU kernel attribution

The bounded probe passed on immutable4201 on2026-10-03. It changes no production source, API, shader, or flags. Run only in a coordinated GPU slot; neither its headless viewport nor its held animation is an FPS experiment.

```sh
node scripts/browser/gpu-kernel-probe.mjs \
  --url='http://127.0.0.1:4201/?diagnostics' \
  --dir=/private/tmp/surf-tube-stability-current-20261003 \
  --out=/private/tmp/gpu-kernel-probe --plan
```

The plan command reads and hashes the frozen directory without launching Chrome or fetching the page. Removing `--plan` launches a temporary headless Chrome profile with a 120-second sample deadline and cleanup on errors. It checks every served JS/CSS bundle and index against the declared directory. It uses the ordinary menu → Surf → Padang → Big → Paddle out route and the existing seeded menu RNG. Guards require seed8761, Hs3.8/T18/direction0/spreading150, dx2/fineSpacing1,64components, Rich/Highparticles and numeric60 display cap. RAF is suppressed before game startup; ordinary spin-up and one further fixed warmup step complete before the eight fixed steps. Existing WebGL work is drained, then drawing is held. No physics or normal-quality override is accepted.

A Blob-module worker prelude imports the original immutable worker and requests the standard optional `timestamp-query` feature. Lack of support is a clear unavailable result. Three fresh ordinary seas use the same chronological warmup and fixed-step inputs:

1. **Untimed, unsplit:** original compute pass and queue submission topology, with upload/readback recording.
2. **Timed, unsplit:** beginning/end timestamps around that same full17-kernel pass, for each CFL substep.
3. **Timed, split:** a separate pass around each dispatch, named by its original pipeline entry point. The encoder and submissions stay in the same order. This variant is intrusive and serves kernel classification, not a claim that those timings describe the original topology.

The wrapper permits only the original observed `setBindGroup(0, group)`, `setPipeline`, one-dimensional `dispatchWorkgroups`, and `end` calls. It validates all17 kernel names and ordering. Query results are mapped once after all eight steps, avoiding an additional map fence per physics step. Initial/final mapped staging fields **H,QX,QZ,RATEH,STRENGTH,AGE,NU,PREDX,PREDZ** are saved as raw bytes. All actual queue uploads, including each CPU H/Qx/Qz block and parameter uniforms, are saved with per-step metadata/hashes. Bit parity, upload parity and clocks must pass after each timed variant; a failure aborts the remaining comparison.

Existing map wall time includes prior queue work, GPU execution, readback copies, mapping and host scheduling. GPU timestamps isolate pass execution, but subtracting that duration from map wall time does not by itself prove queue-wait cost. Readback copies lie outside the compute-pass timestamp. CPU recording also copies uploads in every variant. Timestamp precision can be quantized, and zero small-kernel durations are retained.

Source inspection makes the Thomas solves credible candidates, without establishing dominance: on the ordinary160×725 grid, rows use725 threads each doing160 dependent forward and159 backward iterations; columns use only160 threads each doing725 forward and724 backward iterations. Offshore relaxation's64 component cosines per cell are another candidate. No earlier retained report has per-kernel WebGPU timestamps. The eight-step warm fixture will settle costs for this exact state, not late-breaking tail behavior.


## Recorded result

The [raw timing/metadata report](gpu-kernel-probe.json) records the exact ordinary seed8761/config, Apple/Metal3 adapter, headless user agent, original worker and every bundle hash. Aggregate frozen-source hash is `7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3`; original worker `surfZoneWorker-BH6FhcTP.js` is `eb1a337b66c0eea19035241aee1c46a129a039548e21916d428a6a1a50d2d3c5`. Report SHA256: `e74dfd34245d2c9868ac157cfc1b4cb89b74b66fb9707b2271dfbba9127d1095`.

All three fresh seas reached the same warmed sea time311.3577132243044 and ended after eight fixed steps at311.49104655763773. There were11 CFL substeps: five steps with one and three with two. Both timed variants passed initial/final nine-field byte parity, all35 captured actual CPU upload blocks, and every clock. Each variant recorded two suppressed RAF requests, zero actual WebGL draws and zero attempted draws during its sample. All owned Chrome closed normally in about40seconds. A sandbox localhost EPERM occurred before any browser/sample; its preflight failure is preserved separately under the raw directory, and the authorized local-network escalation then succeeded.

| Measure | Untimed unsplit | Timed unsplit | Timed17-pass split |
| --- | ---: | ---: | ---: |
| Instrumented water wall median, ms/step |4.55|4.45|4.80|
| Native field map wall median, ms/step |1.75|1.70|1.95|
| Compute-pass GPU total over11substeps, ms |unavailable|10.616832|11.599872|
| GPU compute median per substep, ms |unavailable|0.917504|intrusive classification below|

Timed-unsplit per-step compute totals range0.917504–2.162688ms. Its median per step is1.081344ms. The corresponding map wall range is1.4–2.1ms. Execution already overlaps CPU encoding/submission, so one two-substep GPU span exceeds the subsequent map wait; subtracting them would produce a meaningless negative “queue wait.” Readback copies and mapping remain outside the compute timestamp.

| Split-pass kernel | GPU aggregate over11substeps, ms | Share of split GPU total | Median/substep, ms |
| --- | ---: | ---: | ---: |
| columns |4.587520|39.55%|0.393216|
| rows |1.310720|11.30%|0.131072|
| sources |0.720896|6.21%|0|
| rates |0.655360|5.65%|0.065536|
| predict |0.589824|5.08%|0.065536|
| rowTerms |0.524288|4.52%|0.065536|
| relaxSides |0.327680|2.82%|0|
| relax |0.196608|1.69%|0|

Observed timestamps are quantized in65.536µs increments; small stages frequently read zero. Aggregate percentages classify this intrusive split, not original-pass stage durations. Columns are the largest isolated kernel in this state, agreeing with the low parallelism/long dependency-chain source hypothesis. Their absolute warm cost is about0.4ms per CFL substep. This does **not** show that Thomas solves dominate the ordinary live critical path or explain its9–12ms map tails. Nor does it justify treating64-component offshore trig as the dominant work: relaxation is small here. The warm sample has contact median0ms and does not represent later active tubes.

The binary oracle directory `/private/tmp/gpu-kernel-probe-20261003` retains58.9MB of initial/final staging bytes and every actual CPU upload, with exact file hashes and parameter dimensions/tau in the report. Initial9-field SHA256 is `6b734800fa44c134010625edf983c20ccc7c8b9a57c1225576b14bd6fd89bd71`; final is `55d9c077d5b196bf7d0338f39add7316fb3dfad78aa3e45b5f18ad0087a41594`. No production optimization follows from this one attribution run, and no further browser experiment was run.
