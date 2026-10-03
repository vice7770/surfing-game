# Paced own-throw crossing repair — 2026-10-04

A front point can start pacing when its smoothed neighborhood clock reaches zero before its own crest reaches the throw depth. The paced-holder matching path subsequently updated depth and observation time but skipped the own-crossing recorder used by ordinary matching. Its `thrown` stayed null, so the clock kept using a moving forecast even after an observed crossing.

The repair shares the crossing recorder between ordinary and paced matching. `SweptCrash.pace` retains the actual observed crest Z before resetting the point to its paced anchor. Continuous observations interpolate the same depth-crossing time/Z as ordinary matching. Coasting invents no observation; after a coast or legacy import lacking the previous actual crest, the first crossing is pinned to its current observed time/Z. Existing own throws are never rewritten. Pacing position, base, speed, start/end times, smoothing, and watchdog predicates keep their existing rules.

## Evidence and limits

[Original synthetic reproduction](reproduction.json) uses seven controls and original tracker/clock source from `56bf750996cd48cdc5ef45954c479a268053c0b9`, retained under [original](original/src/wave/barrel/BreakingFront.ts). At 1.3 s target ID 3 has a positive neighborhood-fitted clock while its own depth is still above throw depth. On the same observed crossing at 1.4 s, ordinary matching records throw time 1.3688 s and Z 10.7064; original paced matching leaves both unset. At 2 s its clock lags the ordinary twin by 0.0864623 s.

This is a small tracker/clock fixture with explicitly supplied documented pacing fields. It does not run a solver, library geometry, crash, rider or GPU, and does not assign a cause to the old captured tube disappearance. The watchdog can remove overdue prelanding points, but this reproduction does not demonstrate such removal. A rendered phase 1 slice is not sufficient proof of a particular scalar point's phase or identity.

The portable [driver](reproduce.mjs) retains the original functions and only changes input/output locations from the [original driver](original-reproduction.mjs.txt). Its result exactly matches the original retained JSON. Reproduce from the repository root with:

```sh
node --experimental-transform-types --no-warnings docs/research/performance-2026-10-04/paced-throw-crossing/reproduce.mjs
```

The repair passed **62 tests in three focused files**, including six new regressions: first paced read after a real neighborhood fit; actual versus paced crest position; coast/reacquisition; old state without observed crestZ; recorded-throw immutability; actual pace capture before anchor reset. The ordinary tracker switch-off fingerprint still passes. See [focused validation](focused-validation.json). Root separately passed `npm run build` (strict TypeScript and Vite, 249 modules); its existing bundle-size warning remains. This is not a full-suite or flawless-tube claim; inherited rider failures remain unresolved.

## Performance follow-up

The last accepted ordinary High/Rich Padang Big run averaged 60 drawn FPS and 56.56 fresh fixed physics steps/s; late two-second intervals fell to roughly43–51 steps/s. This clock correction is a physics fix, not an isolated FPS optimization.

An eager-contact shortcut was considered because contact build rose to 4.4 ms later in that run. The rider's own points can lie outside a conservative tube box, but the wave gauge scans 185 positions from 40 m behind to 52 m ahead and also queries swept contact. One retained ordinary gauge locus intersects the tube bounds, so the proposed lazy whole-build gate would still build the mesh. It was dropped before implementation. Existing draw-interval quantiles also do not identify a frame-cap bug: the limiter already has 1 ms slack and raw callback decisions were not retained. No cap change was made.

The [separate ordinary gameplay sanity run](gameplay-fps.json) completed once on the M5 Pro using the frozen new-clock [build](gameplay-build-manifest.json): normal menu → Padang → Big → Paddle out, five-second warmup, 90-second passive sample, native High/Rich/High particles, GPU water, 116,000 cells, one fixed 1/60 step per publication, 1708×926 CSS, DPR 2, backing 2989×1620. It averaged **60 drawn FPS, 55.97 fresh physics steps/s and 0.933 simulation seconds/wall second**. Completed late bins 78–88 s were 49.00/47.19/45.24/43.89/46.25/44.84 steps/s. The final partial 90 s bin has no usable interval and is excluded. Draw interval p95/p99/max was 25.4/26.3/31.8 ms; publication p95/max 24.2/51.6 ms. Actual rendered draw-call median remained 54 (the generic observer-bucket median 36 is a different statistic).

The raw report's `baselineComparable:true` means the existing ordinary configuration/quality guards passed; it does **not** establish identical physics, matched chronological states or an isolated speed comparison. This run includes the new clock correction and the already accepted half-metre patch. The prior half-metre run's 56.56 versus this run's55.97 steps/s is not evidence of a measured saving or a separately established regression. The remaining late slowdown is unresolved. No rendered tube-lifecycle/quality acceptance was performed by this sanity check.

The owned Chrome exited, CDP 9545 closed, and the play port 4200 remained closed. Frozen QA preview 4211 is idle for the next CPU profiling step; it is separate from the stopped play server.
