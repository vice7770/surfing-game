# Calibration: is the test wave the game's wave? (2026-11-10)

**Result: for the rider, the default test wave and the game's wave give the same
falls.** The default `FaceWater` is a little faster (5.6 against 4.9 m/s) and its
H 2 m row is bigger than any Wave Pool wave, but a `FaceWater` set to the measured
pool wave drops the same share of climbing riders, in the same two kinds. The
falls of the README are not an artefact of the test wave's speed, height or slope.
What `FaceWater` cannot copy is listed below; those are the open differences.

No game source changed. Solver measurement only (no rider on the solver's sea).

## Part 1: the pool's wave, measured from the solver

Script: `wave-measure.ts.txt` (copy to `scripts/zz-wave-measure.ts`, bundle with
rolldown, run with `--size medium|big --settle 50 --seconds 20 --json out.json`),
summary `wave-measure-summary.py.txt`. `SurfZoneSimulation` on CPU, spot `pool`,
regular wave, T 10 s, tide 0, wind 0, stage 2; the surface read through
`PhysicalSurfWater.sampleAt`, as the bodies read it, every 0.25 m along z, every
0.1 s, for 40 s (4 waves). Medians over the 3.0 to 0.4 s before the crest starts
to break, in the columns where the wave breaks while still clean (x 20 to 35 m;
the take-off is at x 27). Ranges are the spread over those frames.

| quantity | Medium (default) | Big |
|---|---|---|
| height at the pool edge (`POOL_EDGE_HEIGHT`) | 0.81 m | 1.05 m |
| crest over the trough ahead | 1.16 m (x 20), 1.17 (x 27), 1.11 (x 35) | 1.50, 1.44, 1.26 m |
| crest speed over ground, along the face's fall line | 4.9, 4.8, 5.0 m/s | 5.6, 5.2, 5.5 m/s |
| steepest slope | 19.4° (18.0-20.7), 18.6° (16.2-21.8), 14.1° (13.2-16.1) | 21.3° (18.9-23.9), 20.4° (17.3-22.4), 17.3° |
| where the steepest point is | 0.59-0.62 of the height up from the trough; 2.2 m ahead of the crest | 0.64; 2.5 m ahead of the crest |
| crest to trough, horizontal | 8.8, 8.0, 12.5 m | 9.2, 8.8 m |
| still depth at the steepest point | 1.65, 1.75, 1.88 m | 1.83, 1.95 m |
| still depth at the trough | 1.49, 1.62 m | 1.65 m |
| water speed at the crest (toward the beach) | 2.18, 1.92, 1.60 m/s | 2.79, 2.31, 1.80 m/s |
| water speed at the steepest point | 1.48, 1.25, 1.12 m/s | 1.98, 1.56, 1.27 m/s |
| water speed at the trough | -0.41, -0.47, -0.14 m/s (seaward) | -0.40, -0.54, -0.41 m/s |
| trough level against still water | -0.34 m | not tabulated |
| fall line against +z | -7° | not tabulated |

After breaking (0.8 to 2 s after the onset): Medium 0.90-0.93 m and 15-16°, Big
1.10-1.15 m and 17-20°; crest speed about 5.1 m/s; the water at the steepest point
runs at 3.6-4.0 m/s (the broken front pushing). Beyond x 35 the Medium wave arrives
already white: 0.6-0.8 m, 8-13°.

The break point moves along the crest at roughly 6-8 m/s over ground (estimate,
from 8 onsets in 3 columns; `pool.ts` states 6-6.5 m/s along the arm).

Limits of the measurement: slopes are on the solver's 1 m grid, as sampled by the
bodies, so a face sharper than the grid cannot show. Small was not measured with
the final window. One seed, four waves; x 35 has one clean wave.

## Part 2: the matching `FaceWater`

`FaceWater` options (probe: `MATCH=pool HEIGHTS=1.17,1.47`, table `POOL_MATCH`):

| | Medium match | Big match | default H 1.2 | default H 2 |
|---|---|---|---|---|
| `height` | 1.17 m | 1.47 m | 1.2 m | 2 m |
| `depth` | 1.65 m | 1.65 m | 2 m | 2.6 m |
| `slope` | 19° | 21° | 20° | 20° |
| `speed` | 4.9 m/s | 5.4 m/s | 5.6 m/s | 6.72 m/s |
| face length (`front`) | 5.1 m | 5.74 m | 4.95 m | 8.24 m |

How close the match is (game, x 20-27, against the matched `FaceWater`):

| quantity | Medium: game / match | Big: game / match |
|---|---|---|
| crest speed | 4.8-4.9 / 4.9 m/s | 5.2-5.6 / 5.4 m/s |
| height | 1.16-1.17 / 1.17 m | 1.44-1.50 / 1.47 m |
| steepest slope | 18.6-19.4 / 19° | 20.4-21.3 / 21° |
| crest to steepest point | 2.2 / 2.55 m | 2.5 / 2.9 m |
| crest to trough | 8.0-8.8 / 5.1 m | 8.8-9.2 / 5.7 m |
| water speed at the crest | 1.9-2.2 / 2.03 m/s | 2.3-2.8 / 2.55 m/s |
| water speed at 0.6 of the height | 1.25-1.48 / 1.47 m/s | 1.56-1.98 / 1.92 m/s |
| water speed at the trough | -0.4 to -0.5 / 0 m/s | -0.4 to -0.5 / 0 m/s |

So `FaceWater`'s current law u = c·η/(d+η) fits the game's face from the steepest
point to the crest within about 0.2 m/s once the depth is the measured 1.65 m.

What `FaceWater` cannot match:

- The toe. The game's face runs out over 8-9 m, with a long shallow lower third;
  `FaceWater` reaches the flat in 5.1-5.7 m. The upper face (crest to steepest
  point) matches.
- The trough. The game's trough sits 0.3-0.4 m under still water with the water
  running seaward at 0.4-0.5 m/s; `FaceWater`'s is at still level with no flow.
- The steepest point is at 0.6 of the height in the game, 0.5 in `FaceWater`.
- The peel. `FaceWater` is the same all along the crest and never breaks. The game's
  wave breaks along the crest at 6-8 m/s (estimate), with a broken front behind
  the rider whose water runs at 3.6-4 m/s.
- The slope across the pool: the game's wave loses height and slope with x (19° at
  x 20, 14° at x 35 on Medium).

The default `FaceWater` against the game: H 1.2 has the right height and slope and
is 14 % too fast (5.6 against 4.9 m/s); its current is the same (crest 2.1 m/s,
1.5 m/s at 0.6 of the height, computed from the law). H 2 at 6.7 m/s is larger and
faster than any pool wave (Big is 1.47 m at 5.4 m/s).

## Rider tables: default wave next to the matched wave

Probe: `steepface-probe.test.ts.txt` at main (95ae96d6), no levers. Runner:
`run2.sh.txt`, classifier `kinds.py.txt`. Rider heading 45° off the fall line.
Kinds of fall: **(a) sudden**, into the face: bank 45° or more at the fall (in
practice -70°, limit `flight` or cause `lost board`), 0.4-2.4 s after the stick
turns back; **(b) slow stall**: cause `balance`, bank within 20° of level, under
2.5 m/s through the water, 3.3-7.2 s after.

Two starts:

- `START=trim AT=0.75`: low on the face (0.75 of its length ahead of the crest),
  at trim speed, (crest speed - water speed there) / cos 45°, plus 0 or 1.5 m/s.
  Entry through the water: default 7.2, 8.7 m/s (H 1.2) and 8.5, 10 (H 2); matched
  6.2, 7.7 (Medium) and 6.7, 8.2 (Big).
- `START=flat`: the README's start, on the flat ahead of the toe, the wave
  overtaking at 0.7 or 1.7 m/s.

Mild = stick 0.3 and 1 up the face until 55° off the fall line (32 runs). Medium =
stick 0.5 and 1 until 65° and 80° (64 runs). Controls after: `release`, `steer`,
`compress`, `snap` in equal shares.

### Trim start (the fair comparison)

| table | wave | falls | (a) sudden | (b) stall | other | stay on | come round |
|---|---|---|---|---|---|---|---|
| untouched (`PLANS=none`) | default | 0 of 4 | 0 | 0 | 0 | 4 | - |
| untouched | matched | 0 of 4 | 0 | 0 | 0 | 4 | - |
| mild | default | 27 of 32 | 8 | 19 | 0 | 5 | 1 (79°, peak 147°/s); 4 keep trimming 50-62° off the fall line |
| mild | matched | 28 of 32 | 11 | 16 | 1 | 4 | 0; 4 keep trimming 52-68° off the fall line |
| medium | default | 61 of 64 | 49 | 12 | 0 | 3 | 3 (50-108°, peak 103-146°/s) |
| medium | matched | 62 of 64 | 47 | 15 | 0 | 2 | 2 (47-49°, peak 140-165°/s) |

The riders that stay on without coming round are all `release` runs of the mild
climb: the rider keeps its line across the face (4 of 8 on each wave). The one
"other" fall is a `balance` fall at 3.4 m/s, bank -8°.

By height, falls (a / b): default mild H 1.2 13 of 16 (3 / 10), H 2 14 of 16
(5 / 9); matched mild Medium 14 of 16 (5 / 8, 1 other), Big 14 of 16 (6 / 8).
Default medium H 1.2 30 of 32 (22 / 8), H 2 31 of 32 (27 / 4); matched medium
Medium 31 of 32 (21 / 10), Big 31 of 32 (26 / 5). The faster entry (+1.5 m/s)
changes no count by more than 2.

By control, falls (a / b), default then matched: mild `release` 4 of 8 (2 / 2),
4 of 8 (3 / 1); `steer` 7 of 8 (3 / 4), 8 of 8 (3 / 4, 1 other); `compress` 8 of 8
(0 / 8), 8 of 8 (0 / 8); `snap` 8 of 8 (3 / 5), 8 of 8 (5 / 3). Medium `release`
16 of 16 (13 / 3), 16 of 16 (14 / 2); `steer` 16 of 16 (16 / 0), 15 of 16 (15 / 0);
`compress` 14 of 16 (5 / 9), 15 of 16 (2 / 13); `snap` 15 of 16 (15 / 0), 16 of 16
(16 / 0).

### Flat start (the README's start)

| table | wave | falls | (a) sudden | (b) stall | stay on | come round |
|---|---|---|---|---|---|---|
| untouched | default | 1 of 4 | 0 | 1 | 3 | - |
| untouched | matched | 4 of 4 | 1 | 3 | 0 | - |
| mild | default | 29 of 32 | 27 | 2 | 3 | 3 (28-42°, peak 98-209°/s, `compress`) |
| mild | matched | 32 of 32 | 24 | 8 | 0 | 0 |
| medium | default | 62 of 64 | 61 | 1 | 2 | 2 (50-60°, peak 187-216°/s, `compress`) |
| medium | matched | 64 of 64 | 48 | 16 | 0 | 0 |

The flat start is not usable on the matched wave: untouched riders fall 4 of 4 from
it (the slower, shallower wave does not pick them up cleanly), and the (b) falls of
the climbing tables come 0.1-1.4 s after the stick, on Medium at the faster
overtaking speed only (24 of 24 there), so they are the start's fall, not the
climb's. Read the matched wave from the trim start.

A third start, `START=trim AT=0.5` (mid-face), drops untouched riders within
0.5-1 s on both waves (default 3 of 4, matched 4 of 4): a placement artefact, not
used.

## Conclusion

- **Equal.** From the same fair start, the default test wave and the matched wave
  give the same result: mild climbs fall 27 and 28 of 32, medium climbs 61 and 62
  of 64, with the same split (mild mostly slow stalls, medium mostly sudden falls
  into the face). The default wave is neither harsher nor gentler for the rider
  than the pool's wave as far as `FaceWater` can copy it.
- The share of slow stalls depends on the start more than on the wave: from the
  flat start nearly all falls are sudden, from the trim start 19 of 27 mild falls
  are stalls, on the default wave too. Lowering the crest speed from 5.6 to 4.9
  m/s does not by itself turn sudden falls into stalls.
- Untouched riders hold their line on both waves from the trim start, so the wave
  alone does not drop them; the steer toward the face does.
- Not tested, because `FaceWater` cannot represent it: the game's long shallow toe
  (8-9 m against 5 m), the seaward trough flow, the peel and the broken front. If
  the owner turns on real waves where the probe falls, the difference is in that
  list or in what the owner's hands do, not in crest speed, height or slope.
  This sentence is reasoning, not a measurement.
- **Use for future probes:** `MATCH=pool HEIGHTS=1.17,1.47 START=trim AT=0.75
  SPEEDS=0,1.5` (Medium: `height 1.17, depth 1.65, slope 19, speed 4.9`; Big:
  `height 1.47, depth 1.65, slope 21, speed 5.4`). Drop the H 2 m row: no pool wave
  is that big. Keep the default wave only to compare with the README's numbers.
