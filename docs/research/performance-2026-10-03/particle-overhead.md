# Particle overhead report

2026-10-03T16:32:51.634Z · Apple M5 Pro · Node v23.10.0 · 7 trials of 360 fixed steps after 90 warm-up steps. Median wall-clock milliseconds per physics step.

The sparse case isolates finding 128 bore sources in a 320 × 725 grid. The busy case uses the deterministic whitewater fixture with every source active. No water solver or browser rendering runs. Indexed and full-grid paths, and all presentation read schedules, produce identical final Float32 arrays.

| Work | Spray ms/step | Bubbles ms/step | Final particles / bubbles |
|---|---:|---:|---:|
| Sparse: full-grid scan | 1.0471 | 0.9961 | 75 / 1888 |
| Sparse: indexed sources | 0.0098 | 0.0397 | 75 / 1888 |
| Busy: read every step | 0.3279 | 0.0451 | 4689 / 2159 |
| Busy: read every fourth step | 0.3020 | 0.0435 | 4689 / 2159 |
| Busy: no intermediate reads | 0.2993 | 0.0437 | 4689 / 2159 |

Source indexing is produced during FoamField’s existing pass in the game; this benchmark excludes that pass. Four physics steps per presentation read models a worker batch. Timings depend on machine load and are reported, not asserted.
