# Option C: live coarse 2D fluid slices

**How it works.** A 2D APIC particle solver (MAC grid, cut-cell bed, MIC(0)-PCG pressure) simulates one cross-shore slice over the 1:19 bed, from a solitary wave H 3.6 m on 7 m. Fudges: the initial velocity is boosted 1.5× (without it the wave lost height and did not plunge in the domain), and the sim is shifted 25 m seaward to put the lip in the window. The surface comes from marching squares on particle density every 1/48 s, with the tube pocket spliced in. One sim is swept along x with a (x−5)/11 s offset and lofted; a game would run one sim per crest section.

**Measured cost** (node, 1 thread, 126 × 13.5 m domain):

| dx | cells / particles | CPU per simulated second |
|---|---|---|
| 0.25 m | 27k / 48k | 1.17 s (26 ms/step) |
| 0.10 m | 170k / 303k | 33.5 s (285 ms/step) |

Contour extraction 58 ms (coarse) and 330 ms (fine) per snapshot, unoptimised. WebGPU on an M4 Pro (provisional): about 2–4 ms a frame for one coarse section, 6–10 ms for 8–12 sections; the fine grid is not real time beyond about one section.

**Coarse vs fine.** The coarse grid plunges 0.8 s later and 8.6 m further in, with a too-tall crest (4.3 against 3.1 m), a stubby jet and a small, round cavity. The fine grid throws a thin, far-reaching jet and pinches a large tube (about 6 m²).

**Right:** a real overturning lip, cavity, touchdown foam and peel straight from physics.
**Wrong:** noisy coarse surface (low-passed), repeated spray streaks from sweeping one sim, and the tuning needed a fudged start and a shift.
