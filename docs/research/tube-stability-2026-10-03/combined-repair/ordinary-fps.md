# Combined tube repair: ordinary throughput remains provisional

The isolated combination of the late water-gap repair and bounded cavity-air fog correction passes 70 focused tests in six files and the strict TypeScript/Vite build. No production source has been changed. The [combined patch](combined.patch) and [complete source/build manifest](source-manifest.json) preserve the candidate boundary; the physics worker remains byte-identical to canonical port 4201.

Root ran the ordinary menu → Surf → Padang → Big → Paddle out route serially on canonical 4201 and candidate 4208. Each used five seconds of warmup followed by 90 seconds of passive counters, with no GPU timer queries or runtime overrides. Both retained seed 8761, 64 components, dx 2, fine spacing 1, render spacing 2, High/Rich/High particles, original pixel normals and one-step publication. Browser DPR 2, effective render ratio 1.75 and the 2989 × 1620 buffer matched. Every served index/JS/CSS file matched its frozen directory; all 551 candidate source/config hashes matched the isolated source tree. Both owned Chromes closed afterward; the user play server stayed closed.

| Ordinary result | Canonical | Combined candidate |
| --- | ---: | ---: |
| Display FPS | 60.0 | 59.7 |
| Fresh physics states/steps per wall second | 55.48 | 56.54 |
| Simulation seconds per wall second | 0.925 | 0.942 |
| Drawn interval p50 / p95 / p99, ms | 16.7 / 25.1 / 26.2 | 16.7 / 18.2 / 25.1 |
| **Maximum drawn interval, ms** | **26.9** | **375.7** |
| Maximum publication interval, ms | 42.2 | 382.2 |
| Actual drawn calls, median | 54 | 56 |
| Actual drawn triangles, median | 1,371,717 | 1,871,941 |
| Complete worker pipeline p50 / p95, ms | 16.9 / 24.5 | 16.7 / 23.4 |

The candidate's average fresh-step rate is 1.91% higher in this single sequence; that is not a causal speed improvement. Neither runtime sustains 60 Hz physics, and late full two-second bins still fall to roughly 40–50 fresh states per second. Callback counts also include undrawn callbacks; the table uses actual drawn-frame statistics.

The candidate has an unexplained 375.7 ms stall and adds **500,224 median triangles, or 36.5%, plus two draw calls**. Average FPS alone cannot accept that worst-case result. The experiment did not capture compile/allocation timing or retain a frame-by-frame fallback-activation trace, so the stall is not attributed to shader compilation, fog transitions or a particular repair event. The unchanged worker, complete passive [before](ordinary-before-fps.json) and [candidate](ordinary-candidate-fps.json) reports, all late bins and the [summary](ordinary-fps-summary.json) remain available. Independent stage medians are not summed.

The repair preserves original foreground coverage in the separate held-view proof, and its fog correction clears the two held lower-air witnesses. Those checks do not establish the moving same-front lifecycle, arbitrary collapse, listener behavior or reference-level tube quality. Actual moving draw/cache checks and a possible conservative reduction of the additional repair geometry remain pending. This is a provisional prototype result, not a rollout or a steady-60 claim.

The [archive manifest](archive-manifest.json) records original bytes and hashes. The source patch applies to the recorded canonical source hashes; later documentation-only commits do not alter that source boundary.
