# One successful live degas-argument observation — v3

The one root-executed v3 attempt succeeded and closed2026-10-03T23:45:18.539Z. Raw report `run/report.json` SHA256 `b68161c00552a4c7d5e7dd00a3c24fe99f7e48ed22612444890da702a779b11e` is the authority. The reviewed original-clock source is56bf750996cd48cdc5ef45954c479a268053c0b9, **not** the later clock checkpoint58ceb. This was one actual material update after five seconds of ordinary wall-time warmup, followed by RAF hold/settlement; it was not a90s FPS sample or steady-state survey.

| Observed item | Exact result |
| --- | --- |
| Per-cell exp calls actually made | 10,153 |
| First eligible argument | 1 |
| Subsequent `===` repeats of last eligible argument | 9,054 |
| Subsequent misses | 1,098 |
| Nonfinite / NaN arguments | 0 / 0 |
| Single-entry hypothetical evaluations | 1,099 (10,153−9,054) |
| Repeat share | 0.8917561311927509 (89.17561311927509%) |

All10,153 original exponentials were still evaluated. The observer counted each final Number argument in actual flat cell order and returned that Number unchanged inside the existing exp expression. No arguments were reconstructed from a post-state export, rounded, binned or scanned a second time. This is evidence of same-update exact repeated arguments, not evidence that a cache saves material time. It does not identify why arguments repeat and supplies no late-tube/lifetime distribution.

The ID/clock guards passed: run6bd08e68-c82e-4c82-8219-1618011c6257; start request1; actual field nonce`:field:1`; arm1; the next observed advance290→291; actual request.steps1 and corresponding status.pipelineMs.batchSteps1; original dt1/60; sea316.17437989097084→316.1910465576375. Captured solver time40.849999999999724, period18 and windowX−159 identify the actual material epoch. Grid160×725/116,000 cells/dx2; first/last dz3.997686296795564/1; x−159…159, z−1231.026067977236…29.5. The stage is after original advection, with all original lip/bore/stir injection ordering retained.

Actual host-port identity and ordinary source/quality guards passed: Padang Big seed8761/Hs3.8/T18/dir0/spreading150/C64, original auto selection with observed GPU water backend, ridertrue/four barrel cases, canonical own renderSpacingundefined options resolving render2/mask1, High/Rich/High particles, pixel normals. Native CSS1708×926/browserDPR2/backing2989×1620 was observed. Air/depth/turbulence retained their actual pre-arm public array identities. The scratch source/build hashes were checked; only the already-reviewed QA field/worker-entry edits differ from frozen56bf.

The six prior toy tests compare original/scratch F64 bytes and exp argument order. The live run verifies the observer's identity mechanism and array identity guards; it does **not** contain a separate paired full-live-state byte oracle. The `fieldNumericalCalculationChanged:false` summary denotes the reviewed no-substitution mechanism, not an additional measured simulation comparison.

Cleanup passed independently: owned Chrome and serverclosedtrue, TCP `{closed:true,reason:'ECONNREFUSED'}`. V1 and v2 failures remain separate, unmodified evidence. Observer work is included in captured aeration/pipeline status and RAF was held for the counted step; no captured timing is treated as passive FPS, cache cost, or a subtraction from an unrelated baseline. A separately reviewed exact-cache parity/cost experiment would be needed before adoption. No cache or further run was performed here.
