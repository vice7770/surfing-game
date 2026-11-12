# Step 10: the soft cap on the dig (ruling 22, point 3)

2026-11-12. Branch `claude/pool-dig-cap`, not pushed. One build, one 300 s run, nothing tuned.
The cap lives under `?wallFoot=dug` itself. There is no new switch. The default is unchanged.

Files: `cap.txt` (the run with `&wallFoot=dug`), `crash-probe.ts` (step 9's probe plus the C bars and prints),
`still-cap-front-90s.jpg` (midday), `still-cap-front-sunset-90s.jpg` (sunset). Base: `../step9/dug.txt` and `../step9/base.txt`.

## Misses and open points first

- **C1 passes in wave heights, but not against the ruling's "0.85 m".** The deepest dig is 0.448 H (bar 0.5 H). In metres it is 1.000 m, in a slice whose drawn height is 2.44 m. The ruling's 0.85 m assumed H = 1.7 m. In this run H per slice is 1.46 to 2.90 m (median 1.94 m). I did not tune it.
- **K4's tail moved (C4).** At share 1 the drawn surface less the raw case is still 0.000 / 0.000 m (median / 90 %), as the ruling states the bar. But the 99 % is now 0.007 m and the most 0.078 m (clock 0 to 0.3 s); 0.058 m at 0.3 to 1 s. Step 9 read 0.000 there. That is the cap's own lift: where it acts, the drawn surface is no longer the case's. I read C4 as passing on the stated numbers and did not revert. If the advisor reads "as in `dug.txt`" as the whole row, this is a miss.
- **K3's 90 % moved by 0.1 to 0.2°** in three bins (5.0 → 5.2°, 5.6 → 5.8°, 5.3 → 5.4°; bar 10°). Medians equal.
- **The fold is still there:** 36 folded forward quads of 659 376 (0.0055 %), in 8 of 394 builds, least advance −0.042 m (as step 9). They sit 9.3 to 12.4 m past the toe mark (median 11.6 m): at the mesh's far end, not at the wall.
- **The knee's step between neighbour slices is far over the later bar** (0.15 m at 90 %, to be met after the second library): 0.45 to 0.65 m at 90 % now.
- **K7's old reading is unchanged:** least 0.287 m over the bed. The cap did not change it. The restated bar (C2) passes.
- **Bed reads:** the drawn loft reads the bed from the water's bed data, the contact from the solver's bed. They can differ by millimetres under the bed rule. In this run the bed rule never acted, so it did not show.
- Not run: rider sessions, a second run, the default pool, Canyon, the fps trace.

## The bars

| Bar | Reading | Result |
|---|---|---|
| **C1** deepest dig, 0.5 H at most | 0.448 H (0.672 m, H 1.50 m, t 112.47 s, clock −0.63 s, u 118). In metres the deepest is 1.000 m = 0.410 H (H 2.44 m, t 186.60 s, clock −0.26 s, u 38) | pass in H; over the "0.85 m" figure |
| **C2** drawn over the bed at least half the sea's depth, always | least margin +0.139 m (t 161.53 s, clock +0.93 s, u 91, 6.9 m past the toe, depth 1.48 m); vertices short: 0 | pass |
| **C3** share of dug vertices the cap touches (stop over 5 %) | 9 803 of 1 056 324 = **0.93 %** (1.10 % of those dug over 5 mm). All by the depth cap; the bed rule acted on 0 | pass (expected under 2 %) |
| **C4** K1 to K6 as in `dug.txt` | see below | pass on the stated numbers; K4's tail and K3's 90 % moved |
| **C5** where the old −1.15 m stood | t 186.60 s, clock −0.54 s, u 40.8 m (x 96.4, z −203.3), 0.44 m above the toe mark, H 2.24 m. The sea there 1.005 m over the rest level, 3.47 m deep, foam 0.00. The sea's own turn −2.4°, its slope past it −15.1°, its highest within 6 m 1.26 m. With the cap the dig there is 0.960 m (0.428 H) | printed |

C5 in plain words: the deepest dig stood at the take-off (u 41 to 44), half a second before the throw, on clean water with no foam. The sea was simply high there, about 1 m over the rest level.

## K1 to K6 against step 9 (median / 90 %)

| Bar | Step 9 (`dug.txt`) | Step 10 (`cap.txt`) |
|---|---|---|
| K1 the turn at the old corner less the raw case's, by clock | 0.2 / 0.9°, then 0.0 / 0.0° | equal, every bin and every quantile |
| K2 the same by distance ahead | 0.0 / 0.0, 0.2 / 1.1, 0.9 / 2.1° | equal |
| K3 largest drawn turn, toe to mesh end | 3.8 to 5.5 / 5.0 to 6.1° | 3.8 to 5.5 / 5.2 to 6.1° (three bins +0.1 to +0.2° at 90 %) |
| K4 drawn less the raw case at share 1 | 0.000 / 0.000 m; most 0.000 | 0.000 / 0.000 m; 99 % 0.007, most 0.078 m |
| K5 mesh end: height; normal against the sea's | 0.000 m; 0.2 to 0.4 / 0.5 to 1.1° | equal |
| K6 the contact's surface less the drawn on the dug stretch | 0.001 to 0.003 / 0.001 to 0.005 m; 99 % to 0.009; most 0.162 | equal, every bin and every quantile |
| K11 deepest dig | −1.151 m | −1.000 m |

So the contact follows the capped surface: K6 did not move at all.

Also equal to step 9: lines A to F, J1's bar reading, J3 to J6, the crest's largest step (0.3547 m), K8, K9, K10. J2 moved by 0.01° in one median; J1's whole step by 0.001 m at 95 %.

## The throws' list and the switch-off run

- Switch on: the throws' list is **byte-equal** to step 9's (1 722 jets).
- Switch off: the throws' list is **byte-equal**, and the probe's output equals `../step9/base.txt` line for line (only the wall time and the list's path differ).

## The knee (ruling 22's extra prints)

The knee is the largest hollow turn of the drawn curve from the crest to 0.4 m above the toe mark.

| Ahead of the leading thrown slice | Its turn, median / 90 % | Its place, m above the toe mark, median / 90 % | Step to the next slice along the ray, median / 90 % |
|---|---|---|---|
| 0 to 2.5 m | 13.8 / 19.6° | 1.8 / 1.5 m | 0.21 / 0.65 m |
| 2.5 to 7.5 m | 6.1 / 9.9° | 1.8 / 1.1 m | 0.14 / 0.51 m |
| 7.5 to 15 m | 2.4 / 5.1° | 1.1 / 0.4 m | 0.10 / 0.45 m |

The drawn turn equals the raw case's own turn there at the median (13.8, 6.4, 3.8°). So the knee is the case's, as ruling 22 says.

## The stills (the 90 s front frame)

- **Midday, with the cap:** the same picture as step 9's `still-dug-front-90s.jpg`. The white patches in the hollow are still there, in the same place. The cap touches under 1 % of the dug vertices, so that is expected.
- **Sunset, with the cap:** **the white patches are gone.** The hollow shows only a soft pale sheen on the wave's far shoulder. Nothing white stays in place. So the patches are the sun's highlight, as ruling 22 expected. No fix.

## What was built

- `src/wave/barrel/wallFoot.ts`: `DUG_CAP` (0.35, 0.5, 0.5) and `dugCap(dig, height, depth)`: the ruling's formula, then the bed rule.
- `src/wave/barrel/sweptLoft.ts`: `seamY` caps the dig on the dug stretch, with the slice's drawn height and the sea's depth there. `build` takes an optional bed read. The result counts the capped vertices (`dugCapped`).
- The bed is passed in beside `heightAt`: `SweptBarrel.ts` (drawn), `sweptContact.ts`, `SurfZoneRunner.ts`, `PhysicalSurfWater.ts` (contact). The contact reads the same loft heights, so it follows the cap.
- Tests in `wallFoot.test.ts`: the formula, its continuity at 0.35 H, the bed rule, step 9's numbers exactly under 0.35 H, a high sea kept under 0.5 H, the contact's floor on the capped surface.
- Not touched: the fold, the vertex count, the 8-point crest ramp, everything ruling 21 listed.
