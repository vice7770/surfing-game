# The carve carry at 0, 0.2 and 0.4: what it does to the turns (2026-11-10)

A measurement, not a fix. No game code changed. `CARVE_CARRY` (0.4 today) was set to 0, 0.2 and 0.4 by a scratch
override, and the turn-pair probe's Compress-held plans were run again, with flat-water arcs and a trim-only run
added. Leg drive off throughout.

## Result

- **Less carry makes the turn tighter and the pair quicker, but the pair stops linking.** On the Canyon-matched wave,
  with the carry removed, the bottom turn's radius goes from about 12–13 m to about 10 m, the wait on the flat from
  1.45 s to 0.8–1.05 s and bottom turn → top turn from 2.5–2.75 s to 1.9–2.1 s (medians). But one pair is made in 7
  of 16 runs instead of 14 of 16, and two pairs in 1 of 16 instead of 6 of 16. The rider reaches the top too slow and
  the wave carries her over the crest.
- **Halving it (0.2) is in between and not better:** 7 of 16 make one pair (set B); with the early top turn 6 of 8
  make two pairs (7 of 8 today). Times are about the same as today's.
- **The cutback gets worse.** 150–180°: 0 of 16 complete at 0 and at 0.2 (2 of 16 today). 90–120°: 3 of 8 at 0, 5 of
  8 at 0.2, 8 of 8 today.
- **The wave alone holds a rider in trim** at 7.3–7.5 m/s through the water, the same at every carry. The carry does
  nothing in trim (it needs the stick). So the wave does supply the speed for riding along the face.
- **The cause of the trouble is the Compress turn's own drag, not a missing push.** On flat water with no carry the
  turning board slows at about 0.6 g: 7.3 → 4.5 m/s in the first 90° (0.6 of the speed kept), and the arc dies before
  180° at every entry speed tried. The carry hides that loss. A real turn keeps 0.88–0.95 of its speed (Forsyth
  2024, as quoted in the code).
- **At a real surfer's 6 m/s the arc is already tight:** 3.5–4.6 m radius over the first 90° at every carry. The
  wide arcs (9–17 m) come from riding at 9–12 m/s. Radius goes with speed squared.
- **Pumping cannot replace the carry (estimate):** a full leg extension through a turn is worth about 90–220 J,
  +0.2 to +0.5 m/s at 6 m/s. The Compress turn sheds about 1200 J in 90°.

Carry 0.4 reproduced the turn-pair README's rows exactly (set B 14 and 6 of 16, set C 7 of 8, the cutback rows).

Everything below is measured unless it says "estimate". Run counts are the turn-pair README's. They are tens per
setting, so fractions are indications, not rates.

## Set-up

The wave, the start and the scripts are the turn-pair probe's (`../turn-pair-2026-11-10/README.md`): `FaceWater`
matched to the Canyon arm wave, 1.4 m, 16°, 5.7 m/s; start in trim 45° off the fall line, 0.75 of a face length
ahead of the crest, at 7.5 or 9.0 m/s through the water; stick 0.5 and 1; Compress is `compress = 1, crouch = 0.6`.
The face is 7.3 m long. `FaceWater` has no pocket, no breaking part and no white water.

Flat water is `PlaneWater` (still, 3 m deep). The probe is `carryflat.test.ts.txt`; commands in `run.sh.txt`; every
run in `results.txt`; the scratch override in `scratch-carry.diff.txt`. `COMPRESS_PULL` 0.5 and `LEAN_OUT_PULL` 1
were left alone.

The carry only acts with Compress held, the stick off centre and the board planing. With the stick centred (the
waits and the runs down the face in the pair's script, and trim) it is zero at any setting.

## 1. Flat water, Compress held

### One arc (stick held one way, to 180°)

The rider settles for 0.2 s first, so the stick goes on at 5.9, 7.3 and 8.8 m/s. Each cell is stick 0.5 / stick 1.

| Entry | Carry | Arc reached | Speed at 90° | Speed at the end | Radius, first 90° | Mean turn rate | Fall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6.0 | 0 | 96° / 111° | 2.4 / 2.8 | 0.3 / 0.6 | 4.0 / 3.5 m | 41 / 57 °/s | both |
| 6.0 | 0.2 | 109° / 128° | 3.4 / 3.7 | 0.3 / 0.7 | 4.2 / 3.6 m | 42 / 64 °/s | both |
| 6.0 | 0.4 | 134° / 144° | 4.4 / 4.7 | 0.3 / 0.5 | 4.6 / 3.9 m | 46 / 62 °/s | both |
| 7.5 | 0 | 135° / 147° | 4.5 / 4.4 | 0.4 / 0.7 | 6.0 / 4.9 m | 46 / 65 °/s | both |
| 7.5 | 0.2 | 164° / 180° | 5.2 / 5.8 | 0.3 / 0.9 | 6.7 / 5.5 m | 48 / 72 °/s | stick 0.5 |
| 7.5 | 0.4 | 181° / 181° | 5.9 / 7.7 | 4.9 / 8.7 | 7.6 / 6.6 m | 61 / 69 °/s | none |
| 9.0 (extra) | 0 | 161° / 160° | 5.2 / 5.6 | 0.4 / 1.0 | 8.7 / 6.9 m | 45 / 67 °/s | both |
| 9.0 (extra) | 0.2 | 181° / 181° | 6.1 / 7.6 | 3.9 / 4.6 | 9.9 / 8.0 m | 57 / 70 °/s | none |
| 9.0 (extra) | 0.4 | 180° / 180° | 7.3 / 9.7 | 6.5 / 12.5 | 11.7 / 9.3 m | 45 / 53 °/s | none |

The minimum speed is the end speed in every row but two: at 0.4 and full stick the speed never drops below the entry
(7.1 at entry 7.5, 8.5 at entry 9) and then rises. Peak turn rate is 97–124 °/s (65 in one row: carry 0.4, entry 9, half stick). The falls are all the
same kind: the speed runs out, the board drops off the plane and the body, still banked, tips to 70°.

What the carry gives, at 0.4, from 7.5 m/s up: 0.35–0.38 body weights on average at full stick, 0.16 at half stick. Work over the
180° arc: 2000 J (stick 0.5) and 5300 J (stick 1) from 7.5 m/s; 3400 and 9300 J from 9 m/s. The rider's kinetic
energy at 7.3 m/s is about 1950 J.

So on flat water today's carry is a net motor only at full stick from about 7.5 m/s up (7.3 → 8.7 m/s, 8.8 → 12.5).
At half stick it slows the loss. At 6 m/s nothing completes a 180° arc at any setting.

### Linked arcs (stick reversed at 30° or 45° each side of the start heading)

16 runs per carry (two speeds, two sticks, two swings; the 6 m/s and 7.5 m/s rows are 8 each). Every run ends in a
fall when the speed runs out: there is nothing to feed it.

| Carry | Entry 6.0: full arcs made before the fall | Entry 7.5: full arcs made | Linked pairs made | Time per pair | Radius of the full arcs |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 in 4 of 4 | 0 in 2, 1 in 2 | 0 of 8 | – | 4.7–5.1 m |
| 0.2 | 0 in 4 of 4 | 1 in 4 of 4 | 0 of 8 | – | 4.2–5.8 m |
| 0.4 | 0 in 2, 1 in 2 | 1 in 1, 2 in 3 | 3 of 8 (all from 7.5) | 2.13–2.75 s | 4.0–6.8 m |

A full arc takes 1.05–1.63 s at 44–71 °/s, the same at every carry. Speed at each stick reversal, 7.5 m/s, stick 1,
30° swing: 7.4 → 6.9 → 3.8 (carry 0); 7.4 → 7.2 → 5.5 (0.2); 7.4 → 7.5 → 7.1 → 4.4 (0.4).

For linked turns with some speed coming in, see set A in the next section.

## 2. The pair on the Canyon-matched wave, Compress held

### Set B (16 runs: two speeds, two sticks, DROP 20 and 35, top turn begun at 0.5 and 0.7 of the face)

| | Carry 0 | Carry 0.2 | Carry 0.4 (today) |
| --- | --- | --- | --- |
| Top turn begun | 16 | 15 | 15 |
| One pair | 7 | 7 | 14 |
| Two pairs | 1 | 3 | 6 |
| First-pair fails: sudden fall | 4 (in the top turn, at the crest) | 0 | 1 |
| First-pair fails: stall | 2 (in the top turn) | 0 | 0 |
| First-pair fails: carried over the crest | 3 | 8 | 0 |
| First-pair fails: left out in front (the wave never lifts her to the top) | 0 | 1 | 1 |
| Pair 1 time, range (median) | 3.49–4.80 s (4.32) | 3.24–6.55 s (4.00) | 3.29–6.42 s (4.60) |
| Pair 2 time | 4.25 s (one run) | 3.88–4.95 s (4.40) | 4.92–7.22 s (5.83) |
| Bottom turn → top turn | 1.49–2.80 s (2.08) | 1.65–3.05 s (2.25) | 1.85–3.75 s (2.54) |
| Waiting on the flat | 0.65–1.80 s (1.05) | 0.80–2.01 s (1.16) | 0.96–2.68 s (1.45) |
| Bottom turn ends, face lengths ahead of the crest | 0.84–1.14 | 0.87–1.20 | 0.91–1.26 |
| Bottom-turn radius (approximate) | 6.1–12.8 m (9.7) | 7.3–13.2 m (11.2) | 8.3–14.6 m (11.8) |
| Top-turn radius (approximate) | 5.1–12.9 m (9.2) | 5.5–12.7 m (6.8) | 5.1–15.4 m (8.2) |
| Speed at the bottom turn | 7.9–9.6 m/s (8.9) | 8.1–9.9 (9.2) | 8.2–10.3 (9.5) |
| Speed at the top turn | 1.7–6.4 m/s (4.9) | 3.4–6.6 (4.6) | 4.3–6.9 (5.4) |

### Set C (8 runs: top turn begun early, at 0.3 of the face, DROP 20)

| | Carry 0 | Carry 0.2 | Carry 0.4 (today) |
| --- | --- | --- | --- |
| One pair | 3 | 6 | 7 |
| Two pairs | 2 | 6 | 7 |
| First-pair fails | 3 sudden or other falls and 2 stalls (4 in the top turn, 1 on the run down) | 2 carried over the crest | 1 stall on the run down |
| Pair 1 time | 3.55–4.80 s (3.90) | 3.53–6.35 s (4.63) | 3.61–4.74 s (4.29) |
| Pair 2 time | 4.05–4.98 s | 3.59–6.29 s (4.38) | 3.56–5.35 s (4.34) |
| Bottom turn → top turn | 1.43–2.40 s (1.87) | 1.63–2.89 s (2.20) | 1.95–3.35 s (2.75) |
| Waiting on the flat | 0.46–1.43 s (0.80) | 0.63–1.90 s (1.01) | 0.82–2.33 s (1.45) |
| Bottom-turn radius (approximate) | 6.1–12.4 m (9.7) | 7.3–13.9 m (11.4) | 9.1–15.3 m (13.4) |
| Speed at the bottom turn | 8.1–9.6 m/s (8.9) | 8.5–9.9 (9.2) | 8.8–10.3 (9.5) |
| Speed at the top turn | 3.2–4.9 m/s (4.7) | 3.8–5.3 (4.7) | 3.5–5.8 (5.2) |

"Approximate" radius: mean speed × time ÷ heading swung over the stick-up (bottom) or stick-down (top) step, from
the probe's step summaries. It reads a little under the turn-pair README's traced 15 m.

### Set A (8 runs: the same S-turn by heading only, on the flat ahead of the wave, no waiting)

| | Carry 0 | Carry 0.2 | Carry 0.4 (today) |
| --- | --- | --- | --- |
| One pair / two pairs | 8 / 6 | 8 / 8 | 8 / 8 |
| Pair 1 time | 1.57–2.47 s (2.00) | 1.65–2.65 s (2.09) | 1.83–2.90 s (2.31) |
| Pair 2 time | 1.43–2.57 s | 1.42–2.65 s | 1.73–2.63 s |
| Bottom-turn radius / top-turn radius (medians, approximate) | 9.5 / 5.1 m | 11.1 / 7.3 m | 13.1 / 10.6 m |
| Speed at the top turn | 6.5–7.7 m/s | 7.0–8.4 | 7.9–9.6 |
| Speed at the second bottom turn | 4.5–6.5 m/s | 6.1–7.6 | 7.0–9.3 |

Here the first drop down the face supplies the speed (8–10 m/s at the first bottom turn). With no carry the S-turn
still links once in 8 of 8 and is 0.3 s quicker per pair, with the top turn at half the radius. But it loses about
about 3 m/s per pair, so it cannot go on.

### What changes, in plain terms

The carry sets the speed the rider leaves the bottom turn with. Less carry, less speed out of the turn, so the
arc is smaller, she ends less far out on the flat (about 0.1 face lengths less) and waits less. That is the
tightening. The price is at the top: she arrives 0.5–0.8 m/s slower in the median and down to 1.7 m/s in the worst
run, and the top turn at that speed takes longer than the wave takes to lift her over the crest. At 0 that shows as
falls at the crest in the top turn (bank 70°, 2.5–3 m/s); at 0.2 as being carried over it.

Against the reference surfer (pair about 3.5 s, bottom → top about 1.2 s, 5–6 m/s, 3–4 m radius): no setting gets
there. The best medians are carry 0's 3.9–4.3 s and 1.9–2.1 s, still at 8–9.6 m/s into the bottom turn and about 10
m radius.

### One run across the three settings (stick 1, +0, DROP 20, top turn at 0.5; the turn-pair README's trace 2)

| Step | Carry 0 | Carry 0.2 | Carry 0.4 |
| --- | --- | --- | --- |
| Stick up (bottom turn begins) | 0.85 s at 8.4 m/s | 0.85 s at 8.8 | 0.87 s at 9.2 |
| 60° off the fall line, stick centred | 1.82 s at 7.3 m/s | 1.85 s at 8.1 | 2.00 s at 9.1 |
| Top turn begins (0.5 of the face) | 2.47 s at 3.9 m/s, heading 105° | 2.68 s at 4.6, 99° | 3.02 s at 5.4, 96° |
| Then | falls at the crest at 3.53 s (bank 70°, 2.8 m/s) | top turn ends on the crest at 4.15 s; dropped behind | top turn ends at 0.8 of the face at 4.35 s; two pairs made |

## 3. The cutback, Compress held

### 150° and 180° (16 runs per carry)

| | Carry 0 | Carry 0.2 | Carry 0.4 (today) |
| --- | --- | --- | --- |
| Completes | 0 | 0 | 2 (one ends behind the crest at 0.8 m/s) |
| Falls in the first arc | 7 | 1 | 1 |
| Falls or stalls in the second rail change / turn back | 9 | 15 | 10 |
| Dropped behind the crest in the turn back | 0 | 0 | 3 |
| First arc: time | 2.03–4.67 s | 2.23–4.60 s | 2.77–5.30 s |
| First arc: radius, range (median) | 5.2–10.6 m (7.5) | 6.4–13.3 m (9.2) | 9.7–17.1 m (14.3) |
| Speed at the far end of the arc (median) | 0.7–5.2 m/s (2.6) | 1.0–8.7 (5.7) | 5.1–12.1 (7.0) |

At 0 the place it fails moves earlier. The first arc itself runs out of speed at about 150°: the nine "turn back"
falls come within 0.05 s of the stick reversing, at the same moment the 180° runs fall in the arc. So all 16 are the
arc dying. At 0.2 the arc is completed but the rider has too little speed left for the second rail change.

### 90° and 120° (8 runs per carry)

| | Carry 0 | Carry 0.2 | Carry 0.4 (today) |
| --- | --- | --- | --- |
| Completes | 3 (all 90°, all ending at 0.5–0.6 m/s high on the face) | 5 (four 90°, one 120°) | 8 |
| Fails | 4 sudden falls and 1 stall in the turn back | 3 sudden falls in the turn back | none |
| First arc: radius (median) | 6.2–11.5 m (8.6) | 7.6–13.3 m (10.3) | 9.2–15.9 m (13.4) |
| Turn back: radius, completed runs | 4.1–4.3 m | 5.7–7.6 m | 9.3–19.4 m |
| Where the completed runs end | on the face (0.26–0.40 face lengths ahead) | on the face or at its foot (0.54–1.09) | on the flat (0.74–2.8) |

One good sign at lower carry: the completed short cutbacks end on the face and not out on the flat. But they end
nearly stopped.

## 4. Trim only (no turns), 16 s

Entry 7.4 and 8.9 m/s through the water (the wave's pace along the 45° line, +0 and +1.5). "Line held" is a small
stick correction that keeps the heading 45° off the fall line; "hands off" is no stick at all.

| Stance | Stick | Carry 0 | Carry 0.2 | Carry 0.4 |
| --- | --- | --- | --- | --- |
| Standing | line held | holds 16 s, 7.3 m/s (both entries) | same | same |
| Compress | line held | holds 16 s, 7.3–7.4 m/s | holds, 7.3–7.5 | holds, 7.3–7.7 |
| Standing | hands off | +0: holds, 7.4 m/s. +1.5: still on at 16 s but drifted to 0.9 of the face at 3.7 m/s | same | same |
| Compress | hands off | +0: dropped behind the crest at 15.6 s. +1.5: stall fall at 11.7 s | same | same |

Speeds are means over the last 4 s. The held rider sits at 0.12–0.17 of the face, 0.76–0.78 face lengths ahead of
the crest, moving 5.7–6.2 m/s toward the shore: the wave's own pace. The carry under Compress with the line held
is at most 0.01–0.04 body weights (the corrections are small), and the speed is the same with it at 0.

So the wave alone holds a rider in trim at about 7.3 m/s through the water at 45°, standing or in Compress, with no
carry. The hands-off losses are the heading wandering, not the speed running out, and they do not depend on the
carry either.

## Trace: one arc on flat water, 7.5 m/s, full stick

| Time | Carry 0 | Carry 0.4 |
| --- | --- | --- |
| 0.6 s | 7.1 m/s, 11° turned, bank 24° | 7.4 m/s, 11°, bank 24°, carry 0.18 body weights |
| 1.0 s | 6.4 m/s, 52°, bank 37°, load 1.3 | 7.7 m/s, 45°, bank 39°, carry 0.32 |
| 1.4 s | 4.2 m/s, 94°, bank 37°; the lean asked for has fallen to 24° | 7.7 m/s, 77°, bank 45°, carry 0.41 |
| 1.6 s | 2.9 m/s, 112°; off the plane | 7.7 m/s, 93°, bank 47°, carry 0.43 |
| 2.2 s | 1.2 m/s, 139°, bank 70°; falls soon after | 8.3 m/s, 136°, bank 50°, carry 0.47 |
| 2.8 s | – | 8.7 m/s, 181° |

With no carry the board slows by 5.7 m/s per second between 1.0 and 1.4 s (0.58 g) while turning at 100–110 °/s
under 1.3 body weights. That is the turn's own drag: about 1 g of turning force bought with 0.6 g of drag. With the
carry at 0.4 the 0.3–0.5 body-weight push cancels it and leaves a little over.

## Sizing: speed from the legs (estimate, on paper, not built)

Pumping through a turn: the legs extend while the turn loads them and fold again when the load is light. The net
work is the difference in load times the extension.

- Body 75 kg, weight 736 N. Extension 0.30 m (pelvis 0.48 m in Compress to 0.78 m standing).
- Load in a balanced turn is weight ÷ cos(bank): 1.41 body weights at 45°, 1.56 at 50°. The probe measured 1.3–1.6
  in the Compress arc.
- Each body weight of load difference over the full extension is 736 × 0.30 = 221 J.

| Case | Energy per turn | Speed at 6 m/s (kinetic energy 1350 J) |
| --- | --- | --- |
| Extend at 1.41 body weights, fold again at 1.0 | about 90 J | 6.0 → 6.2 m/s (+0.2) |
| Extend at 1.5, fold at 0.5 (a well-timed unweighted rail change) | about 220 J | 6.0 → 6.5 m/s (+0.5) |
| Ceiling: extend at 1.5, fold with no load at all | about 330 J | 6.0 → 6.7 m/s (+0.7) |

For scale (measured unless marked):

- The Compress turn with no carry sheds about 1200 J in its first 90° from 7.3 m/s (7.3 → 4.5 m/s, 73 kg in the
  model).
- Today's carry puts in 1100–1900 J per 90° at 7.5 m/s.
- Dropping the full 1.4 m face is worth about 1000 J (estimate: weight × height), once per pair.

So a real leg extension covers roughly a tenth to a fifth of what the Compress turn sheds. It is the right size for
a turn that keeps 0.9 of its speed (a loss of about 250 J at 6 m/s, estimate), not for one that keeps 0.6.

## What this means for retiring the carry

1. Taking the carry out today does tighten the turn and shorten the wait, as hoped, but breaks the pair (14 → 7 of
   16) and the cutbacks (8 → 3 of 8 short ones, 2 → 0 of 16 long ones). Halving it gives the same loss in set B
   without the gain in time.
2. The carry is not standing in for the wave in trim. The wave holds the rider at 7.3 m/s without it.
3. It is standing in for a turn that costs too much. The Compress carve keeps 0.6 of its speed over 90° where a real
   one keeps about 0.9. The carry at 0.4 is that drag paid back by rule, and at full stick over-paid (7.3 → 8.7 m/s
   on flat water).
4. So the order matters: the turn's drag has to come down first (or the same loss has to be met by something
   visible), then the carry can go. Pumping by the legs can cover a 0.9-kept turn (estimate) but not a 0.6-kept
   one.
5. The wide arc is mostly speed. At 6 m/s the same rider turns on 3.5–4.6 m with or without the carry. The pair on
   the wave starts its bottom turn at 8–10 m/s because the drop from trim and the carry both add to a rider already
   doing 7.5 m/s.

## Not measured

- Where the Compress turn's 0.6 g of drag comes from (hull, fins, rail, the body's pull). Only its size was read.
- Any setting between the three, or a carry that scales with speed or fades in the top turn.
- Leg drive on, the standing climb, and `COMPRESS_PULL` or `LEAN_OUT_PULL` at other values.
- The solver's sea: a pocket, white water, a peeling crest, a steeper lip. No rider sessions were run.
- Waves other than the 1.4 m Canyon arm wave; trim lines other than 45°.
- A pair entered at 5–6 m/s on the wave. The trim start is 7.5 m/s through the water because that is the wave's pace
  on a 45° line.
- Pumping itself: the sizing is arithmetic, nothing was built. The 0.9-kept loss of 250 J is also arithmetic.
- The radii in section 2 are from step summaries (approximate), not from traced paths.
