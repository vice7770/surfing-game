# The Point's onset keyed by depth (point-onset, 2026-10-28)

Step 3b of the all-spots survey, first spot (docs/research/all-spots-breaking-2026-10-28): the Point broke in sequence
already, but with the steepest body of any spot (the face's steepest metre where it starts to break: 22–25°). The
survey's screen of a flat 0.45 onset softened it and kept the line, but closed Big's whole window out at once.

**The change** (`POINT_ONSET`, `pointOnset`; `SurfZoneSimulation`'s `onsetAt` at the Point): Kennedy's onset is 0.45 √(g h)
in still water 3 m deep or less, easing (smoothstep) to the spot's 0.65 by 4.5 m, a per-cell field as the Canyon's bars
have (CPU, WGSL and stage 1 share it). Depth is the still water's at the session's tide, levelled across the open edges'
20 m bands as the bed is. Source: the water-physics advisor's rule (consult-log, 2026-10-23): the onset is a calibration,
set per bed region and keyed by depth, not by slope or ξ (Kennedy et al. 2000: 0.65 on a plane beach; FUNWAVE: 0.45 on
Vincent & Briggs's shoal), the face at onset about 27–31° at 0.65 and 20–22° at 0.45; keyed by depth so the big sets,
which break deeper, keep 0.65.

**The switch:** `?onset=old` (`SurfZoneConfig.onsetRule: 'old'`) runs every spot's onset as before step 3b. It is generic:
each spot that gets a new onset rule in step 3b goes back with it; today that is the Point alone. Online rooms run the
default. Every other spot is unchanged (its sea has no onset field; the Beach's and the Pool's Medium runs repeat the
survey's to the digit; the Canyon keeps its own field, the first branch, untouched).

## Results (`spot-probe.ts`, 14 periods; Medium 3 seeds, Small and Big 2 seeds; pooled with `spot-pool.mjs`)

| | waves | steepest metre at first breaks | typical / longest line | patches | +x arm past 40 m | line 2 s in, ≥ 40 m (closing out at the peak) | whole window in 2 s (≥ 100 m) |
|---|---|---|---|---|---|---|---|
| Medium, before | 39 | 24° (22–26) | 49 / 84 m | 0 % | 30 / 39 (77 %) | 41 m, 19 / 38 (50 %) | 0 |
| **Medium, after** | 44 | **19° (17–21)** | 56 / 99 m | 0 % | **37 / 44 (84 %)** | 45 m, **27 / 43 (63 %)** | **0** |
| Small, before | 12 | 22° (19–24) | 31 / 53 m | 0 % | 10 / 12 (83 %) | 38 m, 5 / 11 | 0 |
| **Small, after** | 27 | **19° (16–21)** | 32 / 62 m | 0 % | 20 / 27 (74 %) | 40 m, 13 / 26 | 0 |
| Big, before | 32 | 25° (23–28) | 62 / 109 m | 0 % | 26 / 32 (81 %) | 49 m, 20 / 32 (63 %) | 2 |
| **Big, after** | 31 | **21° (18–25)** | 78 / 109 m | 0 % | 27 / 31 (87 %) | 68 m, **26 / 30 (87 %)** | **2** |

Against the step's goals:

- **A gentler body:** the steepest metre 24° → 19° at Medium, 22° → 19° at Small, 25° → 21° at Big. The breaks start a
  little deeper (Medium's first breaks 1.8 → 2.1 m at the median).
- **In sequence:** no patches (none before), the +x arm past 40 m in 84 % of Medium's waves (77 %) and 87 % of Big's (81 %),
  the lines 7 m longer at Medium. Small's share falls (74 %, 83 %) because twice as many of its waves now break at all
  (27 against 12): 20 of them run 40 m, against 10.
- **No whole-window close-outs at Big:** 2 of 30 waves, as before (2 of 32); a flat 0.45 broke 9 of 9 waves across the
  window (the survey's screen).
- **The cost, plainly: the peak opens wider.** At Medium 27 of 43 waves are 40 m wide 2 s after they start, against 19 of
  38 (63 % against 50 %); at Big 26 of 30 against 20 of 32 (87 % against 63 %), the line 2 s in 68 m against 49 m. A
  lower onset breaks the crest earlier, where it is still straight along the shelf, so more of it starts at once. Two
  variants cost a degree of softness and buy back little (Medium / Big, peak ≥ 40 m in 2 s): the band 2.5–4.0 m, 20° and
  25 / 43, 22° and 25 / 31; 0.50 in the shallows, 21° and 24 / 42, 22° and 25 / 31. The step keeps the advisor's band.
- **Lips:** the game's seas throw as many or more (Medium seed 1, 9 periods: 1161 against 1095; Big 1273 against 1176;
  Small 979 against 427, its waves now breaking). The 40 m test sea the tier-parity test records (Tp 10, s 12) spills
  in its ten seconds and throws none (19 before): that test now pins the old onset, being about the recorder.

## Frames (Medium, Rich, midday, the GPU tier; the same sea time, 43 s and 54 s)

- `point-old-above-strip.jpg` / `point-new-above-strip.jpg`: from above, 10 frames 1 s apart. After, the break starts
  further out (white at the lip in the first frame), and the white runs along the crest as a band from the headland.
- `point-old-start-strip.jpg` / `point-new-start-strip.jpg`: from the start camera. Before, the face catches the sun as a
  bright, steep sheet ahead of the break (frames 4–7); after, it does not, and the line peels as before.

## Tests

- `npx tsc --noEmit -p .`: clean.
- The main suite: 303 files, 2896 passed (18 expected fail, 36 skipped).
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "[Pp]oint|[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`: 14 passed (89 skipped by the filter).
- New: the Point's field (0.45 to 3 m, 0.65 from 4.5 m, at both tides, uniform across the edge bands; none with
  `onsetRule: 'old'` or a set `breakingOnset`, and none at the Beach, the Reef or the Pool); `?onset=old` (every spot, and
  online rooms run the default).
- Changed: the device parity test (`GpuBoussinesq.test.ts`) and the tier recorder's test (`tierParity.test.ts`) run the
  Point's old onset. The first compares the CPU and a device bit for bit: with the new onset its test sea breaks within two
  frames, the eddy viscosity then splits each 1/30 s frame into two CFL substeps, and the CPU's clock, adding two
  substeps, ends a frame about 1e-15 s from the device's, which adds the frame whole, so the offshore zone's sea differs in
  the last bits. That is the two tiers' clocks, not the data flow the test checks.
