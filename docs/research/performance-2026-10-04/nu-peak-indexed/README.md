# Indexed viscosity peak scan — adopted

`BoussinesqSolver.adoptDeviceStep` scans the existing constructor-owned Float64 viscosity array with an ascending indexed loop. Peak still starts at positive zero, uses strict `>`, and is stored between the original clock increment and plunge aging. No water equations, CFL formula, upload/readback fields, geometry, rendering or particle settings change. The prior SideFeed scan/cache experiments are excluded.

The first exact mock-host proof passed ten cases, including the nine-field readback, deferred commit/discard, map failure recovery, array identities, source ordering and special peak values. The complete mock-host CPU cost passed 32 pairs: median saving 0.9123545 ms, mean 0.9382824 ms, with both run orders positive. Kernels are no-ops and held water is used; this is not a real GPU or evolving-wave timing.

The real browser comparison fixed both orders before launch, built once, and used four independent ordinary Padang Big High/Rich sessions. Each warmed five seconds and sampled 90 seconds, with no rider input, GPU timer, resizing or diagnostic stepping. All four were valid. CSS 1708×879, DPR 2, canvas 2989×1538, full particle settings and original fixed 1/60 water steps were verified. The native command completed at 08:05:58 UTC; independent socket checks at 08:06:16.511 UTC found all eight owned ports and play port 4200 closed. Port 5173 was untouched.

| Metric | AB baseline | AB candidate | BA candidate | BA baseline |
| --- | ---: | ---: | ---: | ---: |
| Rendered FPS | 60 | 60 | 60 | 59.9 |
| Fresh simulation updates/s | 58.02 | 58.79 | 59.11 | 58.33 |
| Simulation seconds/wall second | 0.967 | 0.980 | 0.985 | 0.972 |
| Readback processing p50/p95, ms | 0.9/1.2 | 0.5/1.1 | 0.5/1.1 | 0.9/1.4 |
| Whole pipeline p50/p95, ms | 15.7/21.7 | 15.8/21.2 | 16.1/20.6 | 15.7/20.8 |
| Render p95/worst, ms | 25.1/66.6 | 25.4/75.1 | 25.2/66.8 | 18.2/91.2 |
| Snapshot interval p95/worst, ms | 22.4/67.2 | 22.6/73.2 | 21.3/64.0 | 21.8/99.8 |
| Final complete 88–90 s bin, fresh updates/s | 44.13 | 48.99 | 56.49 | 38.41 |

The observed fresh-rate gains are +0.77 and +0.78 Hz. These independent runs are not phase-matched; differing late-bin costs cannot all be attributed to the changed scan. Whole-pipeline medians and stalls are mixed. Adoption rests on the exact transformation, repeated targeted processing reduction and fresh-rate gains, while sustained 60 Hz simulation and tube quality remain unproved.

Canonical whole-project strict typing passed. All eleven canonical build outputs were byte-identical to the measured candidate, including worker SHA `72b459831985855496621becf0ce8c301aa0882f134696b71b3a3ae712f846c2`. Nine relevant existing solver/GPU ownership tests passed, with 38 unrelated tests skipped. An earlier broad two-file solver run exceeded its 120-second bound without results; its output and the attributed timeout observation are retained rather than claimed passing. The known worker was confirmed gone afterward.

The manifest retains 117 compressed payloads: owned prototype/gate sources, original proof and 32-pair cost, both native orders and their passive audits, compiled bindings, canonical validation and the broad-test timeout. Compiler outputs, public assets, dependencies and the held fixture remain referenced through the frozen original authorities; dist trees are not duplicated. Historical scratch paths in those records describe the actual executions. Baseline source is Git `b0e003b8670c9d0be83bc9bb24c30b5382a54499`; adopted source SHA is `c1d87564677e35ece932831139426e31f19b69490d961dccaf8b8e665e3e0910`.

`python3 verify.py` verifies every archived gzip and decoded payload. It does not rerun game code, verify external scratch availability or establish additional performance/quality evidence.
