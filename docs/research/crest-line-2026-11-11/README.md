# The crest line (ruling 7, step 1) — 2026-11-11

Ruling 7 (`docs/research/surface-rise-2026-11-11/ruling-7/README.md`) said the Barrel's forming wave must first hand
over smoothly from the sea to the tube's shape, and that the hand-over is rough because of one thing: before its throw,
each point of the breaking front stood at the centre of a 1 m cell and hopped a whole cell at a time. Step 1 is to place
those points where the crest really is, continuously. This is that step, built behind `?crestLine=sub` or
`?crestLine=top`.

**Result in one line: the hops are gone and the hand-over is smoother (the surface's own rise before the throw, largest
5 %: 3.50 → 1.84 m/s with `crestLine=sub&formClock=c1`, which passes the ruling's bar C), the smooth clock
(`formClock=c1`) is now safe to use, the throw and the surf meter hold, and no fall changes, as the ruling predicted
for this step. Two of the ruling's bars (A and B) are still missed, so it ships opt-in. The default build is unchanged,
byte for byte.**

## What was built

Before its throw a front point now stands at its crest's place inside its cell, the same way a thrown point already
does. The distance join (which point belongs to which crest) reads that place too, and under `formClock=c1` the clock's
own sub-cell term is zero so the place is not counted twice.

There are two ways to read "where the crest is", and both are switch values, because they trade off (below):

- **`sub`**: the top of the parabola through the crest's cell and its two neighbours along the column.
- **`top`**: the centre of the water in the top quarter of the wave's height (crest over trough) about the highest cell.

Online rooms pin the switch off. With the switch absent nothing reads the new values: 26 of 26 pinned lines identical
(`runs/pin-final.txt` against `docs/research/tube-seam-2026-11-11/runs/pin-branch.txt`).

## Why two ways: the parabola leaps on a flat crest

With `sub` alone the place still leapt, once per wave, just before the throw. Traced on one column (x = 83.5 m, the
sea's surface over rest in metres, `runs/d3.dump.txt`):

| t (s) | z −198.5 | z −197.5 | z −196.5 | z −195.5 | highest cell | parabola's top |
|---|---|---|---|---|---|---|
| 69.983 | 0.702 | 0.697 | 0.586 | 0.279 | −198.5 | −198.0 |
| 70.017 | 0.681 | 0.689 | 0.631 | 0.350 | −197.5 | −197.75 |
| 70.033 | 0.672 | 0.683 | 0.650 | 0.385 | −197.5 | −197.41 |
| 70.050 | 0.664 | 0.677 | 0.668 | 0.420 | −197.5 | −196.94 |
| 70.067 | 0.657 | 0.670 | 0.684 | 0.454 | −196.5 | −196.7 |

The crest is broad and flat on 1 m cells: three cells within 2 cm of each other. The front rises about 0.03 m a step
and the back falls about 0.01 m, so the highest cell moves 2 m in five steps, and the three-point parabola follows it
in steps of 0.34 and 0.47 m where the crest's usual step is 0.10 m (*measured*). It is a measuring cause, not a move of
the water. A wider parabola (five points, least squares) still leaps 0.40 m (*measured offline on the same dump*). The
centre of the water in the top quarter steps 0.06–0.14 m through the same frames (*measured*; at the top 0.15 of the
height 0.04–0.16, at 0.4 0.05–0.11). That is `top`.

On such a skewed crest the top's centre stands 0.3–0.9 m behind the parabola's peak, so under `top` the throw comes
0.3–0.5 m later along the crest's path (*measured*: the throw's distance to its contour, typical −0.35 m against −0.05).

## Measured

Wave Pool Barrel at 1.5 m with `tubeSeam=blend,wallBody=stream`, four waves, `ruling7.probe.test.ts` (prone and
scripted riders only; no runner, no autopilot). Sizes in m/s unless said.

| | n1 base | n2 +c1 | n3 +sub | n4 +sub+c1 | n5 +top | n6 +top+c1 |
|---|---|---|---|---|---|---|
| Surface's own rise, τ −1..0: p50 / p95 / p99 / max | 1.10 / 3.50 / 3.96 / 4.72 | 1.40 / 4.35 / 12.31 / 12.45 | 1.04 / 2.47 / 2.85 / 3.36 | 0.88 / 1.75 / 2.26 / 2.26 | 0.94 / 3.42 / 5.16 / 5.36 | 1.08 / 2.41 / 2.58 / 2.82 |
| its clock-share part: p95 / max | 3.15 / 5.78 | 3.03 / 10.92 | 1.71 / 1.93 | 1.82 / 1.91 | 1.20 / 1.84 | 1.36 / 1.80 |
| its shape part: p95 / max | 2.04 / 5.11 | 1.37 / 11.85 | 0.79 / 2.69 | 0.89 / 2.34 | 0.73 / 0.95 | 1.05 / 7.15 |
| its anchor-slip part: p95 / max | 2.29 / 3.22 | 2.74 / 3.56 | 2.71 / 3.13 | 2.19 / 2.31 | 3.06 / 4.70 | 3.11 / 3.38 |
| **Bar A**: steps the share falls at a carried point [0] | 18 of 124 | 19 of 126 | 13 of 123 | 10 of 94 | **6 of 130** | **4 of 101** |
| **Bar B**: implied clock rate p5 / p50 / p95 | −1.94 / 0.79 / 1.65 | −3.47 / 1.22 / 1.44 | −1.20 / 0.61 / 1.00 | −1.08 / 0.65 / 1.00 | −0.37 / 0.65 / 1.21 | −0.79 / 0.65 / 0.97 |
| the point's own rate p5 / p50 / p95 | 0.50 / 1.16 / 1.50 | 1.21 / 1.27 / 1.30 | 0.89 / 1.19 / 1.50 | 1.14 / 1.26 / 1.33 | 0.80 / 1.27 / 1.50 | 1.16 / 1.31 / 1.37 |
| **Bar C**: own rise τ −0.5..0, p95 / max [2.0 / 3.5] | 3.50 / 4.72 | 7.17 / 12.45 | 2.55 / 3.36 | **1.84 / 2.26** | 3.42 / 5.36 | 2.41 / 2.82 |
| Bar D: miss τ −0.5..0, p50 / p95 [0.3 / 1.0] | 1.14 / 3.90 | 1.61 / 7.00 | 1.39 / 5.26 | 1.27 / 4.12 | 1.27 / 5.08 | 1.44 / 2.80 |
| Felt water's change in the case, p99 / max [0.6] | 0.548 / 0.764 | 1.043 / 1.173 | 0.527 / 0.536 | 0.532 / 0.546 | 0.591 / 0.768 | 0.469 / 0.607 |
| Jumps over 0.2 m/s [≤ 0.6 %] | 0.33 % | 0.39 % | 0.31 % | 0.29 % | 0.27 % | 0.28 % |
| Jumps at a source switch [0] | 0 of 35 | 0 of 30 | 0 of 22 | 0 of 22 | 0 of 27 | 1 of 23 |
| Passive boards fell (before / after the throw) | 5 of 32 (1 / 4) | 5 (1 / 4) | 5 (1 / 4) | 5 (1 / 4) | 6 (1 / 5) | 5 (1 / 4) |
| Failed pop-ups / stood | 8 of 22 / 14 | 6 of 20 / 14 | 8 of 22 / 14 | 8 of 22 / 14 | 6 of 22 / 16 | 8 of 22 / 14 |
| Throw's distance to its contour, typical; within 1 m | −0.06; 95.6 % | −0.16; 93.7 % | −0.05; 96.8 % | −0.11; 91.3 % | −0.35; 96.4 % | −0.52; 90.9 % |
| Surf meter, typical (m) | 1.597 | 1.604 | 1.591 | 1.608 | 1.603 | 1.612 |

Bars E and F (the board's depth under the forming face, and its steps on the flight limit) belong to the carried rise,
step 3; this step does not change what the water does to a board, and they were not read.

### Reading it

- **The smooth clock's bad tail is cured.** `formClock=c1` alone (n2) had single rises of 12 m/s. With either crest
  line they are gone (n4: 2.26, n6: 2.82). Ruling 7's order (crest line first, then c1) holds.
- **`sub` with c1 passes bar C** (1.84 / 2.26 against 2.0 / 3.5). It is the only column that does.
- **`top` halves bar A's misses** (13 → 6, and 10 → 4 with c1) and has the calmest clock-share part. But the anchor's
  slip part grows with it (p95 3.1 against 2.2–2.7) and takes bar C's pass away (2.41 against 2.0). The slip is the
  anchor running on its speed cap on nearly every sample before the throw, in every column: that is the ruling's step 4,
  and it is now the largest part of what is left.
- **Bar A is not met by either.** The drops left under `top` all sit at one place, x 82–85 m on waves 1 and 2 (where
  the break begins, by the take-off), not along the line.
- **Falls do not change**, as the ruling said of this step ("at most 3 falls to gain", and only after the rise is
  carried). The throw stays within 1 m on over 90 %, and the meter within 1 % (bar: ±5 %).
- One jump at a source switch under `top` with c1 (n6); none in the others.
- **Neither is plainly better.** At 1.5 m `sub` with c1 is the one that passes bar C; at 1.8 m `top` with c1 is the
  one that costs no fall (below). Both stay as switch values until the owner has ridden them and the anchor's cap
  (step 4) is traced, since the cap is what separates them.

### Bar B is partly geometry (a question for the advisor)

Bar B reads the hand-over's share at a point carried with the wave and asks that the clock it stands for run within
±20 % of the front point's own clock. It misses in every column by a steady factor: about 0.65 against 1.2–1.3.

Most of that is geometry, not noise. The share is the same all along a slice's ray, and slices stand at fixed columns.
A point carried with the wave moves along the ray, and the ray is not along the columns: *measured*, 25–28° off them
(p5–p95 21–30°). So the carried point crosses toward columns that throw later, at c·sin(angle) ≈ 2.1 m/s, and the clock
it sees runs slower by that crossing times the clock's slope along x (*measured* 0.22–0.23 s/m):

| run | implied, typical | point's own | geometric rate (own less the crossing) | implied less geometric, p25 / p50 / p75 | over 20 % off the geometric rate |
|---|---|---|---|---|---|
| n3-like (`sub`) | 0.62 | 1.20 | 0.71 | −0.28 / −0.13 / −0.01 | 65 of 122 |
| n5 (`top`) | 0.64 | 1.27 | 0.83 | −0.30 / −0.14 / +0.04 | 79 of 129 |
| n6 (`top`, c1) | 0.65 | 1.31 | 0.73 | −0.19 / −0.06 / +0.03 | 41 of 97 |

So the bar as written cannot pass on a peeling wave: a place riding the wave does see a slower clock than a column
does. Against the geometric rate the middle half of the steps sit within about 0.2 of it, and `top` with c1 is the
closest (41 of 97 off). **Open question for the advisor: restate bar B against the geometric rate (and what share of
steps may miss), or drop it in favour of bar A.** Not consulted yet; no shape was settled on it.

## 1.8 m

Same probe at 1.8 m (`H=1.32`), three columns.

| | h1 base | h4 +sub+c1 | h6 +top+c1 |
|---|---|---|---|
| Own rise τ −0.5..0: p95 / p99 / max | 5.97 / 12.24 / 23.10 | 2.64 / 3.77 / 4.75 | 3.11 / 4.40 / 5.71 |
| Bar A: steps the share falls | 32 of 265 | 13 of 193 | 15 of 237 |
| Bar B: implied p50 (point's own p50) | 0.91 (1.50) | 0.75 (1.17) | 0.74 (1.20) |
| Miss τ −0.5..0: p50 / p95 / max | 1.45 / 7.43 / 18.96 | 1.26 / 3.60 / 5.75 | 1.35 / 4.20 / 24.33 |
| Felt water's change in the case, p99 / max | 2.47 / 6.25 | 2.31 / 3.93 | 1.84 / 2.84 |
| Jumps over 0.2 m/s | 0.73 % | 0.63 % | 0.72 % |
| Jumps at a source switch | 0 of 48 | 1 of 54 | 2 of 44 |
| Passive boards fell (before the throw) | 11 of 32 (2) | 13 of 32 (2) | 11 of 32 (2) |
| Failed pop-ups / stood | 4 of 24 / 20 | 4 of 24 / 20 | 2 of 24 / 22 |
| Throw's distance, typical; within 1 m | −0.12; 89.0 % | −0.30; 85.6 % | −0.54; 85.3 % |
| Surf meter, typical (m) | 1.935 | 1.932 | 1.922 |

The bigger wave gains more: the surface's worst single rises fall from 23 m/s to about 5, and the largest 5 % halve.
Bar C is not met at 1.8 m by either (2.64 and 3.11 against 2.0). `sub` with c1 has two more passive boards falling
after the throw (13 against 11), which misses ruling 6's "no worse" bar there; `top` with c1 has the same 11 and two
more riders standing (22 against 20). Both have jumps at a source switch (1 and 2) where the base has none. The throw
lands within 1 m a little less often (85 % against 89 %).

## What ships

- `?crestLine=sub` and `?crestLine=top`, opt-in, at the Barrel only (they need the distance front, so not with
  `tubeForm=old` or `tubeFrom=piece`). Online rooms pin them off.
- Not on by default: bars A and B are missed, and the owner has not ridden it.
- The probe, `src/wave/probes/ruling7.probe.test.ts`, with the rise's parts, bars A and B, the ray's direction in the
  rise log, and an optional column dump (`DUMPX…`).

## Next (the advisor's ruling 8, `ruling-8/README.md`)

The advisor read these logs the same day. In short:

- **Bar B is restated, not failed.** The geometric reading above is right, and it is also the physical clock: a piece
  of crest breaks where its own ray meets the throw depth, later than the column it stands on. The new bar B′ compares
  with the geometric rate over 0.1 s windows (pass: 90 % of windows within ±20 %, median ratio 0.9–1.1). Today:
  `sub` 12 of 15 windows, `top` 8 of 19, `top`+c1 11 of 13, 1.8 m `top`+c1 26 of 31. It gates the carried rise, not
  this step. The carried rise must use the place's rate, not the point's (the point's is about 1.6× too large).
- **`top` is the crest place to build on.** It steps at the wave's pace; the parabola leaps on the solver's flat crest.
  Without the anchor's slip part the two are equal. `top`'s late throw (about 0.3 H) is to be sized out.
- **The anchor is next.** In the case's water before the throw the anchor is at its speed cap on 97–99 % of samples
  (42–71 % outside it): the case is catching up with its target while the rider is on it. The drops left in bar A sit
  beside thrown slices, late in the hand-over, not at the take-off end as such (that is only where the riders are).

The order:

1. Trace the anchor (log only): its gap to the target against τ, and carried places every 5 m along the crest.
2. Let the anchor take its target while the share is zero (τ under −0.5 s: nothing is drawn or felt there); keep the cap
   from then on. Expected: capped share in the case under 20 %, bar C near 2.0 at both sizes, fewer drops in bar A.
3. `top`'s 0.3 H throw offset: the throw's distance back to the base's, meter within ±5 %.
4. Carry the rise, first as a probe run, with the place's rate. Gates: bar A at 0 drops, B′, C.

Not to be done: any smoothing in time; raising or removing the cap while the case is shown; a hidden force on the
rider; moving the throw depth; carrying the catch-up slip into the water.

The owner's calls it leaves: `top` as the one crest place (retire `sub` once `top` passes bar C); removing the anchor's
catch-up before the share starts; B′ in place of B; and whether "bar C near 2.0" is enough to start carrying the rise
or to wait for the Basilisk velocity run.

## Shot list for the owner

Wave Pool, Barrel, 1.5 m, from the default start. Paddle a little, catch, pop up, ride the face toward the tube.

1. `?tubeSeam=blend&wallBody=stream` (today's opt-in build, to compare).
2. `?tubeSeam=blend&wallBody=stream&crestLine=sub&formClock=c1`
3. `?tubeSeam=blend&wallBody=stream&crestLine=top&formClock=c1`
4. Shots 2 and 3 again at 1.8 m.

What to look for: does the face rise more evenly under the board in the last half second before the lip throws (less
of a sudden jack); does the lip throw at the same place as before (under `top` about 0.3–0.5 m later); any visible hop
or ripple running along the crest as it forms. Falls are expected to be the same as shot 1.

## Runs

`runs/`: `n1`–`n6` (the table's columns; `.txt` the probe's report, `.rise.tsv.gz` its rise log), `d3` (n3's build
again with the column dump and the ray's direction), `h1`, `h4`, `h6` (1.8 m), `.fronts.tsv.gz` for `d3`, `n5`, `n6`
(the front points near their throw, which the bar B script reads), `pin-final.txt` (the default build's pinned lines),
`barb.py` (the bar B geometry: `python3 barb.py 0.85 d3.rise.tsv …` on the unzipped logs), `peak.py` (the estimators
on the dump).
