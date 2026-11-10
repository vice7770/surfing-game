# Calibration on the Canyon's version B wave (2026-11-10)

**Result: gentler, by a little.** A `FaceWater` set to the Canyon's version B wave
(`?canyonWaves=true`) on the arm drops 55 of 72 climbing riders; the default test
wave drops 65 of 72 and the pool-matched wave 66 of 72, same plans, same three
controls. The two kinds of fall are the same, and the untouched rider stays on
everywhere. On the matched bowl and Big rows the falls are as on the default wave
(96 of 108). So version B's face, as far as `FaceWater` can copy it, does not
explain the falls. What `FaceWater` cannot copy is listed in part 2; one of those
(the break running along the arm faster than a rider) could explain falls by
itself and is not tested here.

No game source changed. Solver measurement only: no rider on the solver's sea, no
runner, no browser.

## Part 1: version B's wave, measured from the solver

Script: `wave-measure-canyon.ts.txt` (copy to `scripts/zz-wave-measure-canyon.ts`,
bundle with rolldown, run with `--swell practice|big --seed N --settle 40
--seconds 240 --json out.json`), summary `wave-measure-canyon-summary.py.txt`.
`SurfZoneSimulation` on CPU, spot `canyon`, `canyonBed: 'b'`, direction 0, tide 0,
wind 0, stage 2. Default sea = Practice (Hs 1.4 m at the tank edge, Tp 12 s); Big =
`SWELLS.big` (Hs 2.4 m in deep water, Tp 14 s). The surface is read through
`PhysicalSurfWater.sampleAt`, every 0.25 m along z, every 0.2 s.

Amount measured: Practice seeds 1, 2, 3 and Big seeds 1, 2; each 40 s of settling,
then 264 to 268 s. Ten columns, 10 m apart, from the rider's start column (x -122)
through the take-off (x -112; z -125 Practice, -180.5 Big) along the arm to the
bowl (x -32). A "wave" is one crest followed in one column; its values are medians
over the 3.0 to 0.4 s before it starts to break there. Cells give the median over
waves, with the 10th to 90th percentile in brackets. "Sets" = the biggest quarter
of those waves by height.

### Practice (default), 3 seeds

| quantity | x -122 (start) | x -112 (take-off) | x -102 | x -92 | x -72 | x -52 (bowl) | x -42 (bowl) |
|---|---|---|---|---|---|---|---|
| waves that broke clean / passed unbroken | 24 / 11 | 22 / 16 | 31 / 15 | 35 / 20 | 23 / 29 | 16 / 50 | 7 / 61 |
| crest over the trough ahead, m | 1.43 (1.16-2.05) | 1.39 (1.10-1.79) | 1.33 (1.14-1.98) | 1.38 (1.17-1.88) | 1.60 (1.35-2.00) | 1.96 (1.84-2.23) | 2.20 (2.10-2.36) |
| crest speed down the fall line, m/s | 5.8 (5.4-7.1) | 5.6 (5.2-6.3) | 5.6 | 5.6 (5.1-6.9) | 6.0 (5.5-7.0) | 6.1 (5.7-6.4) | 6.2 |
| steepest slope, median before breaking | 14.7° (13.3-16.3) | 15.5° (13.5-16.6) | 15.3° | 15.4° (13.5-17.4) | 15.8° | 19.6° (17.7-21.7) | 21.6° (20.0-23.1) |
| steepest slope, highest per wave | 17.8° (15.5-19.2) | 18.2° (16.0-19.3) | 18.2° | 17.9° | 19.4° | 23.6° (21.4-24.6) | 24.3° (23.4-25.6) |
| crest to trough, horizontal, m | 14.2 (10.6-17.8) | 11.2 (9.3-17.0) | 11.8 | 11.9 | 13.5 | 12.5 | 13.0 |
| still depth at the steepest point, m | 2.21 (1.96-2.93) | 2.17 (1.86-2.57) | 2.15 | 2.23 | 2.51 | 2.80 | 2.98 |
| water at the crest, toward the beach, m/s | 2.01 (1.67-2.46) | 1.88 (1.71-2.43) | 1.92 | 1.96 | 2.09 | 2.29 | 2.31 |
| water at the steepest point, m/s | 1.34 | 1.26 | 1.23 | 1.21 | 1.12 | 1.25 | 1.19 |
| water at the trough, m/s (minus = seaward) | -0.65 (-1.19 to -0.33) | -0.71 | -0.67 | -0.72 | -1.02 | -1.29 | -1.33 |
| crest line against the x axis | -2° (-14 to 6) | -6° (-14 to 1) | not tabulated | -5° (-20 to 1) | -8° | -13° (-20 to -9) | -12° |
| water along the crest, at crest / steepest, m/s (plus = +x) | 0.02 / 0.06 | -0.10 / -0.03 | not tabulated | not tabulated | not tabulated | -0.24 / -0.11 | -0.15 / -0.11 |

Also measured: x -82 (28 / 29 waves): 1.52 m (1.29-1.97), 5.8 m/s, 15.9°, highest
18.9°. x -62 (18 / 33): 1.78 m (1.53-2.00), 6.4 m/s (5.8-7.1), 15.7°, highest
18.8°. x -32: 0 broke, 67 passed unbroken. The steepest point sits at 0.60 to 0.65
of the height above the trough, 3.0 to 3.6 m ahead of the crest. The trough is
0.33 to 0.36 m below still water at the start and take-off, 0.58 m in the bowl.

Sets (biggest quarter): take-off (5 waves) 1.80 m (1.64-2.05), 6.3 m/s (5.9-7.4),
15.3°, highest 18.9°, crest to trough 16.6 m, depth 2.58 m, water 2.27 / 1.33 /
-0.89 m/s (crest / steepest / trough). x -102 (7 waves) 1.98 m, 6.5 m/s, 14.5°,
highest 18.8°, depth 2.75 m, water 2.34 / 1.39 / -0.96. x -92 (8 waves) 1.88 m,
6.9 m/s, 15.3°, highest 19.2°, depth 2.81 m, water 2.31 / 1.35 / -1.03. x -72
(5 waves) 2.01 m, 7.0 m/s. Bowl x -52 (4 waves) 2.23 m, 6.3 m/s, 20.7°, highest
23.8°, water 2.53 / 1.50.

Where it breaks: the onsets sit at z -98 to -102 (median; range -137 to -85), so
most waves start breaking 20 to 25 m shoreward of the nominal take-off z (-125).

While breaking (0.8 to 2 s after the onset), x -122 to -62: 1.4 to 1.9 m, 15 to
18.5°, crest speed 5.5 to 5.9 m/s, water at the crest 3.6 to 3.8 m/s and at the
steepest point 3.0 to 3.4 m/s (x -112 alone: 2.42 and 1.70), trough -0.6 to
-1.1 m/s. Bowl x -52: 2.02 m, 20.4°, water 4.07 and 3.60 m/s.

Peel (the same wave's onset in two columns 10 m apart; the frame is 0.2 s, so a
median of 0.8 s means 0.6 to 1.0 s, that is 10 to 17 m/s; the speeds are estimates):

| columns | onset later by, s (10th-90th) | pairs | speed along x | onset moves in z |
|---|---|---|---|---|
| -122 to -112 | -0.80 | 7 | runs toward -x (the peak is near x -112 to -102) | |
| -112 to -102 | 0.60 (-0.62 to 1.00) | 14 | 16.7 m/s | 5.4 to 6.5 m per 10 m |
| -102 to -92 | 0.80 (-0.40 to 1.40) | 23 | 12.5 m/s | same |
| -92 to -82 | 0.80 (-1.00 to 1.38) | 22 | 12.5 m/s | same |
| -82 to -72 | 0.80 | 14 | 12.5 m/s | same |
| -72 to -62 | 0.80 (0.38 to 1.02) | 10 | 12.5 m/s | same |
| -62 to -52 | 3.10 (2.14 to 3.46) | 8 | 3.2 m/s | 20.6 m: the break jumps onto the bowl |
| -52 to -42 | 1.40 | 7 | 7.1 m/s | |

The line of onsets lies at about 30° to the x axis (the arm is built at 32°), while
the crest itself is at 2 to 9° to the x axis. A negative 10th percentile means
that in some pairs the next column broke first: the arm often breaks in sections,
not as one running peel.

### Big, 2 seeds

| quantity | x -122 (start) | x -102 | x -92 | x -62 |
|---|---|---|---|---|
| waves that broke clean / passed unbroken | 15 / 35 | 10 broke | 18 broke | 7 broke |
| crest over the trough ahead, m | 2.31 (1.88-2.81) | 2.35 (2.09-2.95) | 2.34 (2.06-2.85) | 2.69 (2.46-2.77) |
| crest speed, m/s | 6.8 (6.1-7.6) | 6.5 (6.1-7.7) | 6.7 (6.0-7.3) | 7.0 |
| steepest slope, median / highest per wave | 18.4° (15.7-21.4) / 19.9° (16.6-23.1) | 19.6° (17.8-20.8) / 20.5° | 19.0° (17.4-20.1) / 19.8° | 20.1° / 21.3° |
| crest to trough, m | 14.8 (12.8-19.6) | 14.1 | 14.1 | not tabulated |
| still depth at the steepest point, m | 3.46 | 3.39 | 3.50 | 3.67 |
| water at crest / steepest / trough, m/s | 2.59 (2.09-3.02) / 1.68 / -0.70 | 2.53 / 1.69 / -0.78 | 2.67 / 1.83 / -0.73 | 2.92 / 1.87 / not tabulated |

x -112: only 2 waves broke clean in the window (36 passed unbroken): 2.16 m,
6.8 m/s, 15.5°. x -82 (15 waves) and x -72 (14): 2.3 m, 6.7 to 6.9 m/s, 18.4°.
x -52 to -32: none broke inside the measured window (61 to 62 passed unbroken).
Sets: x -122 (3 waves) 2.94 m, 7.1 m/s, 21.6°, highest 23.3°, depth 3.83 m, water
2.92 / 1.97; x -92 (4 waves) 2.85 m, 7.4 m/s, 19.9°, highest 22.4°, depth 3.76 m,
water 3.15 / 2.17; x -102 (2 waves) 2.97 m, 7.7 m/s, 20.0°. Onsets at z -143 to
-163. While breaking: 1.6 to 2.2 m, 15.4 to 16.4°, 6.5 to 6.7 m/s, water 3.9 to 4.2
(crest) and 3.3 to 3.6 m/s (steepest); water along the crest -0.3 to -0.6 m/s
(toward -x) at x -92 to -62. Peel: 12.5 m/s (x -102 to -92, 9 pairs), 10.0 (13
pairs), 8.3 (11 pairs), 10.0 m/s (5 pairs); the onset moves 5.8 to 8.5 m in z per
10 m.

### Against the Wave Pool (calibration.md)

| | Canyon B, Practice, arm | Wave Pool, Medium |
|---|---|---|
| height | 1.3 to 1.6 m (sets 1.8 to 2.0) | 1.16 to 1.17 m |
| crest speed | 5.6 to 6.0 m/s (sets 6.3 to 7.0) | 4.8 to 4.9 m/s |
| steepest slope | 15 to 16° (highest per wave 18 to 19°); bowl 20 to 22° (24°) | 18.6 to 19.4° |
| crest to trough | 11 to 14 m | 8 to 8.8 m |
| still depth at the steepest point | 2.2 to 2.5 m | 1.65 to 1.75 m |
| water at the crest | 1.9 to 2.1 m/s | 1.9 to 2.2 m/s |
| water at the trough | -0.65 to -1.0 m/s | -0.4 to -0.5 m/s |
| peel | about 12.5 m/s along x on the arm (estimate) | 6 to 8 m/s (estimate) |

Limits of the measurement: slopes are on the solver's 1 m grid, as the bodies
sample it. The CPU run uses the solver's default number of swell components; the
game on a GPU tier asks for 64, so the game's wave trains differ in detail from
these seeds. Columns where few waves broke clean (Big x -112, Practice x -42) carry
little weight. Waves already white on arrival are left out of the "before
breaking" medians.

## Part 2: the matching `FaceWater`

Probe: `MATCH=canyon HEIGHTS=1.4,1.95,2.1,2.3,2.85` (table `CANYON_B_MATCH` in
`steepface-probe.test.ts.txt`).

| | Practice, typical (arm) | Practice, a set's big one | Practice, bowl | Big, typical | Big, a set's big one |
|---|---|---|---|---|---|
| `height` | 1.4 m | 1.95 m | 2.1 m | 2.3 m | 2.85 m |
| `depth` | 2.6 m | 3.7 m | 3.4 m | 3.5 m | 3.95 m |
| `slope` | 16° | 16° | 21° | 19° | 21° |
| `speed` | 5.7 m/s | 6.8 m/s | 6.1 m/s | 6.7 m/s | 7.4 m/s |
| face length it gives | 7.3 m | 10.2 m | 8.2 m | 10.0 m | 11.1 m |
| water at the crest it gives (measured) | 2.0 (1.9-2.0) m/s | 2.35 (2.3) | 2.33 (2.3) | 2.66 (2.5-2.7) | 3.10 (2.9-3.2) |
| water at the steepest point it gives (measured) | 1.21 (1.2-1.3) m/s | 1.42 (1.35-1.39) | 1.44 (1.19-1.25) | 1.66 (1.7-1.8) | 1.96 (2.0-2.2) |

`depth` is not the measured still depth (2.2, 2.7, 2.9, 3.45, 3.8 m): it is chosen
so that `FaceWater`'s current, c·η/(d+η), gives the measured water speed at the
crest. With the measured depth the crest water would run 0.2 to 0.5 m/s too fast.

What `FaceWater` cannot copy here:

- **The peel.** `FaceWater` is the same along the crest and never breaks. On the
  arm the break runs at about 12.5 m/s along x, faster than any rider of these
  tables travels (entries 7.4 to 10.9 m/s, most of it toward the beach), and often
  in sections. A rider on the arm is overtaken by the broken front, whose water
  runs at 3.0 to 3.8 m/s where the clean face has 1.2 to 1.3 m/s.
- **The long toe and the trough.** Crest to trough is 11 to 14 m (sets 17 m)
  against 7 to 10 m; the trough is 0.3 to 0.6 m below still water with 0.65 to
  1.3 m/s running seaward. `FaceWater` has still water at the trough.
- **The steepest point's place.** 0.60 to 0.65 of the height, 3.0 to 3.6 m ahead of
  the crest; `FaceWater` has it at half height.
- **The spread.** Height varies by a factor of 1.6 between the 10th and 90th
  percentile at the take-off, speed from 5.2 to 6.3 m/s; 16 of 38 waves pass the
  take-off without breaking there. `FaceWater` is one wave, repeated.
- **The bowl's jump** (the break takes 3.1 s to cross from x -62 to -52 and lands
  20.6 m further in), the crest's small angle (2 to 13°) and the weak water along
  the crest (0.1 m/s on the arm, 0.2 to 0.6 m/s in the bowl and on Big).
- **Faces under 1 m of grid.** As in the pool.

## Part 3: the rider tables on the matched wave

Same plans and start as calibration.md: `START=trim AT=0.75 SPEEDS=0,1.5`, 8 s,
controls `release`, `steer`, `compress` (the default and pool rows below are the
same three controls taken out of calibration.md's raw files, which also held
`snap`; so their totals are smaller than the ones printed there). (a) = sudden,
into the face (bank 45° or more at the fall); (b) = slow stall (balance, bank 20°
or less, under 2.5 m/s). Run with `run2.sh` and `kinds.py`.

| table | default wave (H 1.2, 2) | pool match (H 1.17, 1.47) | Canyon B match, all five rows |
|---|---|---|---|
| untouched | 0 of 4 | 0 of 4 | 0 of 10 |
| mild climbs (steer 0.3 and 1, up 55°) | 19 of 24 (5 a, 14 b) | 20 of 24 (6 a, 13 b, 1 other) | 44 of 60 (18 a, 26 b) |
| medium climbs (steer 0.5 and 1, up 65° and 80°) | 46 of 48 (34 a, 12 b) | 46 of 48 (31 a, 15 b) | 107 of 120 (85 a, 22 b) |

Canyon B match by row (mild: 12 runs each; medium: 24 each):

| row | mild | medium |
|---|---|---|
| Practice typical, H 1.4 | 9 (1 a, 8 b) | 20 (11 a, 9 b) |
| Practice set, H 1.95 | 7 (1 a, 6 b) | 19 (13 a, 6 b) |
| Practice bowl, H 2.1 | 10 (4 a, 6 b) | 22 (18 a, 4 b) |
| Big typical, H 2.3 | 8 (4 a, 4 b) | 22 (20 a, 2 b) |
| Big set, H 2.85 | 10 (8 a, 2 b) | 24 (23 a, 1 b) |

By control, Canyon B match: mild `release` 11 of 20, `steer` 13 of 20, `compress`
20 of 20 (18 of them the slow stall); medium `release` 40 of 40, `steer` 38 of 40
(all sudden), `compress` 29 of 40. Sudden falls come 0.4 to 3.5 s after the climb
starts, slow stalls after 3.6 to 7.1 s, as on the other two waves.

Reading:

- The two arm rows (the wave the owner rides) drop 16 of 24 mild and 39 of 48
  medium climbs: 55 of 72, against 65 of 72 on the default wave and 66 of 72 on the
  pool match. Gentler, by about ten riders in 72; the gentler 16° face shifts falls
  from the sudden kind to the slow stall (mild: 2 sudden, 14 stalls).
- The bowl and Big rows (19 to 21°) are as the default wave: 28 of 36 mild, 68 of
  72 medium, and the sudden kind grows with height (Big set: 31 of 34 falls).
- 12 or 24 runs per row: a difference of two or three runs between rows is within
  what one changed start speed does. The claim that holds is "not harsher".

## Conclusion

**Gentler** (a little, on the arm; equal in the bowl and on Big). The face of
version B is lower in slope, taller, faster and longer than the pool's, and a
rider on its `FaceWater` copy falls a little less often and in the same two ways.
The part of version B that could make a rider fall by itself is not in the face's
shape but along the crest: the break crosses the arm at about 12.5 m/s, in
sections, and 3 to 4 m/s white water arrives under a rider who trims at 7 to 9 m/s.
That is outside what `FaceWater` and these tables can show.
