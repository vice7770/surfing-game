# The M4's two overnight sets: the thin-lip run, the C2 lips, and the flow at level 14 (2026-11-13)

What the owner pushed to main on 2026-11-13 (2703e3f2, 492092bc) and what it says. Five questions, in order.
Marks: [M] measured here, [C] read in the code, [S] sourced, [R] reasoned, [P] provisional.

**The two headlines.**

1. **Yes, the thin-lip run gave a thinner lip** [M]. Compared at the same moment of the throw, the Bo-4000 level-14
   lip is the same thickness for its first 0.3 s and then **20 to 45 % thinner**, it is thrown 12 to 24 % further, and
   it opens a void 1.5 to 2.8 times bigger. The table in the run's own `summary.json` says the opposite (1.6 times
   thicker) because that one number is read at a different instant in each run. Section 1.
2. **The crest water's share curve does not move at level 14** [M]. The two new level-14 cases give 0.60 and 0.62 at
   0.7 s before the throw (level 13 measured 0.58) and 0.75 and 0.81 at the throw (level 13 measured 0.80). Every
   point is within 0.05 of the level-13 pool numbers. **The ramp 0.6 → 0.8 stands; the wave track's bar does not need
   to change.** What is better at level 14 is the measurement, not the answer: the wave's speed fits one straight line
   to 3.5 cm, where the level-13 big case missed by 35 cm. Section 5.

---

## 1. Did the Bond number thin the lip, or did the level?

### 1.1 The pipeline's own number is read at two different instants

`plunge_measure.py` takes one frame per run: the last overturned frame before touchdown whose jet tip is at least
**3 cells** off the face [C]. Three cells is 10.6 cm at level 13 and 5.3 cm at level 14, so the two runs are not
stopped at the same place. Its `lip_m` is then the **jet's area divided by the void's long diameter** [C], and both of
those came out wildly different:

| Run | frame | jet area | void L × W | `lip_m` | cells |
|---|---|---|---|---|---|
| L13, Bo 1000 | 0.025 before touchdown | 0.034 m² | 0.20 × 0.04 m | 0.169 | 4.8 |
| L14, Bo 4000 | 0.100 before touchdown | 0.610 m² | 2.25 × 0.85 m | 0.271 | 15.4 |

[M, from the two `_plunge.json`] An 18-fold difference in jet area over an 11-fold difference in void length gives a
ratio that happens to land within 1.6×. The level-13 frame has a void 20 cm long: a sliver, not a tube. **The 1.6×
"thicker" in the advisor's table is an artefact of the frame choice, not a measurement of the lip.** [M]

### 1.2 The shapes themselves

`docs/research/lip-look-2026-11-11/tools/lip.mjs` measures the sheet properly: the thickness from the underside to the
outer face, at 15 %, 50 % and 90 % of the underside's arc from the tip. Run on both case files at the run's own depth
(`tools/lip_bin.mjs`, that file with the folder and the depth taken from the command line):

| s from the throw | t_mid L13 | t_mid **L14** | | mean 40-60 L13 | **L14** | | reach L13 | **L14** |
|---|---|---|---|---|---|---|---|---|
| 0.20 | 0.155 | **0.162** | +5 % | 0.322 | **0.274** | −15 % | 0.189 | **0.169** |
| 0.30 | 0.225 | **0.226** | 0 % | 0.347 | **0.283** | −18 % | 0.320 | **0.315** |
| 0.40 | 0.313 | **0.252** | −19 % | 0.362 | **0.288** | −20 % | 0.474 | **0.502** |
| 0.50 | 0.366 | **0.220** | **−40 %** | 0.365 | **0.280** | −23 % | 0.638 | **0.715** |
| 0.60 | 0.359 | **0.196** | **−45 %** | 0.352 | **0.265** | −25 % | 0.808 | **0.944** |
| 0.80 | 0.236 | **0.172** | −27 % | 0.312 | **0.227** | −27 % | 1.142 | **1.418** |

[M] Metres. Matching on time is not quite matching on stage (the level-14 lip turns over 0.02 s later), so the same
comparison was made at **the same stage of the throw** — the frame whose underside arc is the same share of the wave's
height (`tools/lip_lib.py stage`). It gives the same answer: at a stage of 0.4 the mid thickness is 0.370 against
0.220, the mean 0.364 against 0.279, the jet's water 0.062 H² against 0.050 H², and the reach 0.652 m against
0.695 m [M].

The void grows with the thinner lip. At the same stage [M]:

| stage (underside arc / H) | void area L13 | **L14** |
|---|---|---|
| 0.4 | 0.0044 H² | **0.0124 H²** |
| 0.6 | 0.0549 H² | **0.0903 H²** |
| 0.8 | 0.1086 H² | **0.1590 H²** |

**In one sentence: the owner's thin-lip run gave a lip that starts at the same thickness, then thins by a quarter to a
half as it is thrown, reaches a quarter further, and opens a tube up to 2.8 times bigger.** [M]

### 1.3 Which of the two changes did it

Level and Bond number moved together and **no control run exists** [M]: nothing in the repo is the same case at two
levels with one Bond number, nor the same level at two Bond numbers. So this part is reasoned, not measured.

- **The level cannot explain it** [R]. At level 13 the mid sheet is 0.37 m across, which is **10.5 cells** of that
  run's 3.52 cm grid. A feature ten cells wide is resolved; halving the cell does not take 40 % off it. Where the
  level does help is the tip: 0.080 m is 2.3 cells at level 13 and 4.6 at level 14.
- **The Bond number explains it, in direction and in size** [R, S]. The capillary length is h0/√Bo: 14.2 cm at
  Bo 1000 and 7.1 cm at Bo 4000 on the run's 4.5 m [M]. Mostert, Popinet and Deike (2022) state that a moderate Bond
  number makes the jet thicker and throws it less far, and put the capillary jet width near π times the capillary
  length [S, as reported in `lip-look-2026-11-11/README.md`]. π × capillary length falls from 0.45 m to 0.22 m, a drop
  of 0.22 m; the measured mid thickness drops 0.15 m. Same direction, same order. The throw lengthening by 12 to 24 %
  is Mostert's second effect, and it is there.
- **The lip's first sheet is not capillary** [M]. At the first overturned frame both runs give a mid thickness of
  0.116 m and 0.121 m — the Bond number made no difference there. So the start is set by the feed from the crest, and
  surface tension only shows once the sheet starts stretching. This corrects the lip-look study's reading that the
  first sheet sits on "a floor of one capillary length" [M].

**[P] Reading: the Bond number did it.** A rerun of one C2 case one level finer at Bo 1000 would settle it, and
section 4 recommends exactly that for other reasons.

### 1.4 The rank-3 bars

`lip-look-2026-11-11/README.md` rank 3 set four headless bars on the new file [C]. Read on it [M]:

| Bar | Result |
|---|---|
| tip thickness at 0.1 s at most 0.025 m | **miss**: 0.041 m at its first overturned frame (0.12 s); level 13 gave 0.040 m. No change. |
| mid at most 0.04 H at 0.1 s | **miss**: 0.046 H; level 13 gave 0.045 H. No change. |
| jet water at touchdown 0.10 to 0.22 H² | **pass**: 0.158 H² at the last open frame (level 13: 0.185). (`plunge_measure.py`'s own frame says 0.094, see 1.1.) |
| tube area not below the present case | **pass**: 1.5 to 2.8 times bigger at matched stage. |

So the run moved the part of the lip the bars do not measure. The bars were written on the lip's **first** 0.1 s, and
that is the one part Bo 4000 left alone [M]. The owner's complaint — "too thick for the size of the wave" — is about
the falling lip, which is the mid and late throw, and that did thin. A new bar should be read from 0.3 s on [R].

**One cost of Bo 4000:** more breakup. Over the open phase the frame flags count up to 49 fragments and 42 droplets,
against 27 and 12 at level 13 [M]. The open phase is still 59 clean frames out of 59 [M, `library_stats`], so the
library is usable, but a thinner sheet tears more and the renderer will see more loose pieces [R].

---

## 2. Is the C2 library's lip spread physical, or is it the measurement?

**Both, about half and half.** [M]

The nine cases at the same stage of the throw (`tools/lip_lib.py stage`; `tip` is the sheet 15 % back from the tip, in
metres and in cells of the run's 7.81 cm grid; `mid/H` is the sheet halfway along the underside, per wave height):

| case | bed slope S1 | A0 | `plunge` lip/H | stage 0.2: tip, cells, mid/H | stage 0.4: tip, cells, mid/H | stage 0.6: tip, cells, mid/H |
|---|---|---|---|---|---|---|
| b1_a1 | 0.036 | 0.151 | (no tube) | 0.008, 0.1, 0.074 | 0.094, 1.2, 0.064 | 0.144, 1.8, 0.053 |
| b1_a2 | 0.036 | 0.250 | 0.077 | 0.067, 0.9, 0.061 | 0.132, 1.7, 0.061 | 0.121, 1.6, 0.060 |
| b1_a3 | 0.036 | 0.355 | 0.265 | 0.093, 1.2, 0.095 | 0.187, 2.4, 0.112 | 0.278, 3.6, 0.095 |
| b2_a1 | 0.068 | 0.152 | 0.480 | 0.067, 0.9, 0.116 | 0.122, 1.6, **0.187** | 0.156, 2.0, 0.213 |
| b2_a2 | 0.068 | 0.252 | 0.504 | 0.082, 1.1, 0.106 | 0.153, 2.0, **0.190** | 0.221, 2.8, 0.181 |
| b2_a3 | 0.068 | 0.359 | 0.522 | 0.094, 1.2, 0.100 | 0.172, 2.2, **0.181** | 0.252, 3.2, 0.205 |
| b3_a1 | 0.105 | 0.153 | 0.246 | 0.059, 0.8, 0.126 | 0.090, 1.2, 0.134 | 0.123, 1.6, 0.147 |
| b3_a2 | 0.105 | 0.253 | 0.295 | 0.079, 1.0, 0.118 | 0.132, 1.7, 0.197 | 0.186, 2.4, 0.258 |
| b3_a3 | 0.105 | 0.358 | 0.306 | 0.094, 1.2, 0.101 | 0.177, 2.3, 0.196 | 0.251, 3.2, 0.226 |

- **The measurement carries about half of the apparent spread.** The `plunge` column spreads 0.077 to 0.522, which is
  **6.8×**. At one stage of the throw the spread is 0.061 to 0.197, which is **3.2×** [M]. The ordering changes too:
  the `plunge` number says b2 ≫ b3 > b1, the stage-matched one says b2 ≈ b3 > b1.
- **What is left is physical, and the bed drives it.** At a stage of 0.4 the gentle bed b1 (S1 0.036) gives 0.061 to
  0.112, and the two steeper beds b2 and b3 give 0.134 to 0.197 [M]. Inside one bed, A0 moves it much less (b2:
  0.181 to 0.190 across the whole A0 row). So **the bed, not A0** [M]. b1_a1, the spilling case with no tube, is the
  thinnest of all (0.053 to 0.074).
- **Two of the nine measures are disturbed.** For b3_a2 and b3_a3 the crest-to-tip run is 2.9 to 3.4 m long, so the
  jet's area and the `mean 40-60` thickness take in water that is not the lip [M]. The local thicknesses (tip, mid)
  are unaffected, which is why this section uses them.
- **No case resolves its own lip's tip.** The tip is 0.8 to 2.4 cells across at level 12 [M]; the pipeline's rule asks
  about 6 across the lip. See section 4.

---

## 3. Does the spread explain the lane-to-lane steps in the lip's white edge?

**No, not along the crest. It amplifies one known place.** [M, R]

The matcher's weights were already measured, by step 3b's own probe
(`wave-strategy-alternatives/c2-step3b-runs/a0-segments.txt`) [M, read]: over 1 257 neighbouring lane pairs of one
wave, the weights' step Σ|Δw| is **median 0.023, 90 % 0.122, 99 % 0.192**, and only **three** pairs step over 0.5. All
three are lanes 6/7, where the lane's bed slope doubles, and there the weights go from `[b1_a1 1.00]` to
`[b1_a1 0.37, b1_a2 0.26, b2_a1 0.37]`.

Putting those weights against the thicknesses in section 2 (at stage 0.4, per wave height) [M, R]:

| lane pair | drawn mid thickness | step | at H = 2 m |
|---|---|---|---|
| the median pair (Σ\|Δw\| 0.023) | — | 0.002 H | 3 mm |
| the 90 % pair (0.122) | — | 0.008 H | 1.7 cm |
| the 99 % pair (0.192) | — | 0.013 H | 2.6 cm |
| lanes 6/7 (the worst three) | 0.064 H → 0.109 H | **0.045 H** | **9 cm** |

Lanes are about **0.7 m apart** [M, step 3b's bars run]. So:

- Along the crest the drawn lip's thickness changes by a few millimetres from lane to lane. The spread cannot make a
  visible step there, because the weights barely move. The stills show the steps **all along** the white edge, so the
  cause is the one step 3b already names: neighbouring **clocks** (at lanes 6/7 the throw times are 1.5 to 2.5 s
  apart) [R, and step 3b §3].
- At lanes 6/7 the spread does bite, and the render makes it worse. `LIP_FRAY` paints full white under 4 cm and no
  white over 15 cm [C, `src/scene/barrel/lipLook.ts`], and the lip's tip across the nine cases runs 0.8 cm to 9.4 cm
  [M] — the whole of that band. A 9 cm thickness step there is a step from nearly all white to about half white [R].

**[R] So: fixing the lip spread would not remove the steps. Smoothing the lanes' slope key or the throw time, which is
step 3b §7 point 1, is still the fix. But where the keys do jump, a narrower spread would make the jump show less.**

---

## 4. Do the C2 cases need finer runs?

**Not all nine. Two of them, at level 13, and for the control they give.** [R]

What a finer level would and would not buy:

- **It would not thin the lip.** At Bo 1000 and the C2 runs' h0 of 5 m the capillary length is **15.8 cm** [M]. That
  is the whole of the renderer's white band (4 to 15 cm) [C]. No refinement removes it; only a higher Bond number
  does [R, S].
- **It would resolve what is there now.** At level 12 the capillary length is only **2.0 cells** [M], so the runs
  cannot properly resolve their own surface tension, and the lip's tip is 0.8 to 2.4 cells [M]. Level 13 puts the
  capillary length at 4.0 cells. Two cases also break the pipeline's own rule: by its `lip_m` measure b1_a2 has
  **2.4 cells** and b3_a1 **4.4**, and the report says to rerun phase 2 one level finer under 4 [C].
- **It would give the control question 1 is missing.** One case at two levels with one Bond number separates the
  level from the Bond number once and for all [R].

**The cost** [M, from the runs' own `wall_s`]:

| what | time | note |
|---|---|---|
| the nine C2 cases at level 12, as run | **18.2 core-hours** of phase 2 on the M1, three at a time, about 7 h on the clock | 0.85 to 3.4 h a case |
| one level finer | **× 5.6** | measured on one case on one machine: `pool_straight_big` 2 h 21 at L13 → 13 h 07 at L14, both on the M4 |
| the nine at level 13 | **about 100 core-hours** on the M1 | 1.5 to 2 days on the clock there. The M4 is some 3 to 5 times quicker a case (its L13 run of the pool's own case took 2 h 21, where the M1's level-12 C2 cases took 0.9 to 3.4 h), so about a day there [P] |
| the nine at level 14 | one case cost **13 h on the M4** | days of the M4, out of reach on the M1 |
| **b1_a2 and b3_a1 at level 13** | **about 17 core-hours** on the M1 | the two cheapest cases; a few hours on the M4 [P] |

**Recommendation** [R]:

1. **Rerun `b1_a2` and `b3_a1` at level 13, Bo 1000.** About 17 core-hours. It repairs the two cases the pipeline's
   own rule rejects, and `b1_a2` at L12 and L13 is the control that settles section 1.3.
2. **Do not spend a day on all nine at level 13.** The lip will not get thinner; surface tension is the floor.
3. **If the owner wants the lip itself fixed at the source, the spend is Bo 4000 at level 14** (the capillary length
   needs 4 cells, which level 13 does not give; under 2 cells the tip tears on the grid [S, the lip-look ruling]).
   That is days of the M4 for the nine, and the thin-lip run shows what it buys: a quarter to a half off the mid and
   late lip, nothing off its first 0.3 s, and two of the four bars still missed [M]. The cheaper routes the lip-look
   study already lists (rank 4, taking the capillary share off the underside; or a render-only change) should be
   judged against that before the compute is booked [R].
4. Nothing should be queued while ruling 31's ten runs hold three cores [R].

---

## 5. The new level-14 velocity data

Folded into `docs/research/pool-tube-flow/README.md` ("Level 14", 2026-11-13). The numbers, from
`tools/velocity_look.py` — the same maths as `velocity_first_look.py` and `velocity_wave_speed.py` with the case and
the level taken from the command line, so the level-14 files can be read without touching the shipped tools. It
reproduces the README's three level-13 rows exactly, which is its check [M].

The crest water's share of **one straight-line wave speed** fitted over the 2 τ before the throw:

| case | level | wave speed | the line misses | −0.69 s | −0.34 s | −0.17 s | **the throw** | +0.17 s | +0.34 s |
|---|---|---|---|---|---|---|---|---|---|
| pool small | 13 | 6.25 m/s | 0.067 m | 0.58 | 0.70 | 0.75 | **0.80** | 0.83 | 0.86 |
| pool big | 13 | 8.10 m/s | 0.348 m (poor) | 0.48 | 0.56 | 0.61 | **0.66** | 0.73 | 0.76 |
| canyon | 13 | 7.90 m/s | 0.073 m | 0.75 | 0.79 | 0.82 | **0.85** | 0.89 | 0.92 |
| **knee big** | **14** | 6.06 m/s | **0.035 m** | **0.60** | **0.67** | **0.71** | **0.75** | **0.81** | **0.87** |
| **kneeface big** | **14** | 5.38 m/s | **0.064 m** | **0.62** | **0.71** | **0.76** | **0.81** | **0.87** | **0.89** |

- **The curve does not move** [M]. Every level-14 point is within 0.05 of the level-13 pool small case, which is the
  one the ramp was read from. The measured ramp is still **about 0.6 at 0.7 s before the throw, rising to about 0.8 at
  the throw**. The wave track's bar stands as it is.
- **The level-14 data is cleaner, which matters more.** The wave's own speed fits one straight line to 3.5 cm and
  6.4 cm, against 35 cm for the level-13 big case, which the earlier note called unsettled. Points with no velocity
  sample: 0 and 31 (level 13: 32 for pool small, 4 928 of 44 288 for the Canyon). The frame-to-cell match is 0.8 cm,
  against 1.6 to 2.1 cm [M]. **So the ramp is now measured on two waves that hold one speed, not one.**
- **The "→ 1" is still not the crest's top.** The crest's own top water never reaches the wave's speed until 1.86 s
  and 2.20 s after the throw. The **fastest water anywhere** on the profile reaches it at +0.08 s and +0.00 s [M].
  This confirms the second look's reading: the water that passes the wave's speed is the lip's front [M].
- **Under the surface.** At the crest's top, the water 45 cm down runs 9 to 15 % slower than the surface, before and
  after the throw, at level 13 and level 14 alike [M]. (The README's "2 to 6 % slower" is a mid-face measure, a
  different place; both stand.)
- **A caveat worth saying plainly.** The two new cases are the **knee** beds, not the straight one, so this is not a
  pure level test: a difference would mix the level and the case [M]. The conclusion is the safe direction — the curve
  did **not** move, on two new beds at a finer level, so nothing the wave track depends on changes [R].

---

## Files and how to run them again

Beside this file, in `pool-lip-and-flow-2026-11-13/tools/`:

- `lip_lib.py` — the lip's shape from a run's `*_library.json` or a C2 case's `*_c2.json.gz`, frame by frame. Same
  geometry as `lip.mjs`. Modes `tau` (one row per time), `open` (shares of the open time), `stage` (the same stage of
  the throw: the frame whose underside arc is a given share of the wave's height) and `all`.
  ```
  python3 docs/research/pool-lip-and-flow-2026-11-13/tools/lip_lib.py stage \
    docs/research/pool-tube-runs/data/periodic_pool_straight_big_L13_library.json \
    docs/research/pool-tube-runs-bo4k/data/periodic_pool_straight_big_L14_library.json
  ```
- `lip_bin.mjs` — `lip-look-2026-11-11/tools/lip.mjs`, verbatim, with the case folder and the run's depth taken from
  the command line, so a case file outside `public/barrels` can be read.
  ```
  node docs/research/pool-lip-and-flow-2026-11-13/tools/lip_bin.mjs public/barrels/ periodic-pool-straight-big-l13:4.5
  node docs/research/pool-lip-and-flow-2026-11-13/tools/lip_bin.mjs \
    docs/research/pool-tube-runs-bo4k/barrels/ periodic-pool-straight-big-l14:4.5
  ```
- `velocity_look.py` — the crest water's share, for any case at any level.
  ```
  python3 docs/research/pool-lip-and-flow-2026-11-13/tools/velocity_look.py pool_knee_big 14 pool_kneeface_big 14
  ```

All three are standard library only (`lip_lib.py` needs no numpy) and are run from the repo root.
