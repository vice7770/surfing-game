# The Wave Pool Barrel's surfable tube: step 7, Q1, the wall (2026-11-04)

Step 7, Q1 of the surfable-tube plan (`docs/superpowers/plans/2026-11-03-pool-surfable-tube.md`): build the water-physics
advisor's ruling (`advisor-ruling.md` §1.4, the change; §4, the re-ruled bars) on a38 at the Wave Pool's straight Barrel,
and measure it. Branch `claude/pool-tube-wall` from main c4bbb823 (step 6, the tube face, PR #190). No rider sessions,
catch reports or autopilot checks were run, and no browser pane or dev server: the bodies in the bars are placed on the
water by the probe with no input. The bigger tube's floor and the M4 case lines are untouched (they wait on the owner).

## Where it stands

- **Built (pool only, each piece behind its own switch, all on by default):**
  1. the anchor's continuity (`?tubeAnchor=old`);
  2. formation by distance, with the throw at the contour (`?tubeForm=old`; `?tubeThrow=break` for the old throw rule);
  3. the wall's water (`?wallFlow=old`).
  With the first three switches old, the build is main's byte for byte (the pin check, below). Online rooms pin all four.
- **Measured:** the re-ruled bars at 1.5 and 1.8 m on a38 and on the pool's own cases, 12 periods each; step 6 (main)
  beside each; each piece's switch alone at a38, both sizes; the 40 largest rises by cause; the cost on this M1; the pin
  check; the tests.
- **Passes:**
  - bar 1 (never under the solver);
  - bar 4a (below the anchor: rise p99 0.0004–0.009 m a step, against 0.066–0.097 on step 6);
  - no crest-anchor fallbacks after a point's first face anchor (0, against 60–199 points on step 6);
  - the pre-throw clock (100 % within 0.5–1.5×, no holds over 0.1 s; step 6: 2.5–3.4 % within, 1,420–1,519 holds);
  - the weight's change (p99 and max 1/18 a step; step 6's max 0.99);
  - the formation bar (the first clock within 0.1 s of its case's τ_e on 97–98 %; step 6: none);
  - bar 6 on a38 (on the solver's breaking within ±0.5 H_s on 100 %; step 6: 87–89 %) and on the pool's cases within
    ±1 H_s;
  - bar 7 after the throw;
  - the meter (within 2 % of main);
  - the pin check.
- **Fails:**
  - **bar 2:** bodies are still run over (2a p99 0.54–0.96 m). 2b passes only with the pool's cases at 1.5 m (85 %).
  - **bar 3:** p50 0.06–0.19 H_s, worse than step 6 before the throw, where the case's own early frames sit under the
    solver's lower face.
  - **bar 4b's** 0.03 m: the shift's change sits at its cap at p50, and p99 is 0.050–0.053 m, the cap at the faster crests.
  - **bar 8:** holes 0.011–0.035 a build (step 6: 0.061–0.343), folds 0.13–0.34 (step 6: 0.54–1.35). The saddle passes
    with the pool's cases and is at its edge on a38 (0.20–0.21 H_s).
  - **the ledger:** 46–79 % more jets than main, from the throw at the contour; the meter stays within 2 %.
- **Information:** bar 2c, bar 5 (usable clearance 0.29 / 0.42 m on a38), the max gap.
- **Not measured:** the M4 Pro's cost; ride-camera strips (they need the page's renderer).

## The bars (the ruling's §4), step 7 against step 6 (main)

12 periods after 50 s, CPU, 1/60 s steps, reef columns s 30–95, bodies at s 55. Each cell is **step 7** (step 6). Step 6
is main's build (`tubeAnchor=old,tubeForm=old,wallFlow=old`); its numbers reproduce step 6's recorded runs (for example
412 jets, 181.8 of 192.2 m³ and the meter 1.592 m at a38 1.5 m). Runs: `runs/wall-*.txt` (step 7), `runs/s6-*.txt`
(step 6).

| Bar (the ruling's value) | a38, 1.5 m | a38, 1.8 m | pool's cases, 1.5 m | pool's cases, 1.8 m | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1. Support ≥ solver − 0.02 m on 100 % | **100 %** (100 %) | **100 %** (100 %) | **100 %** (100 %) | **100 %** (100 %) | **Pass** |
| 2a. No overrun outside the lip's water: bottom ≤ 0.15 m under the support at p99, never over 0.1 s | **0.78 m**, 77 of 216 over 0.1 s (0.58 m, 44 of 150) | **0.96 m**, 105 of 222 (0.84 m, 76 of 264) | **0.54 m**, 57 of 216 (0.58 m, 53 of 156) | **0.62 m**, 54 of 228 (0.96 m, 73 of 240) | **Fail** |
| 2b. Boards and prone riders at 0.3 H_s, ahead and at the throw, within 0.1 m of the support to touchdown on ≥ 80 % (lip hits apart) | **21 %** of 47, 1 lip hit (6 %) | **4 %** of 47, 1 (11 %) | **85 %** of 39, 9 (10 %) | **66 %** of 38, 10 (21 %) | **Fail**, but **pass** with the pool's cases at 1.5 m |
| 2c. (Information) 0.6 H_s bodies pitched into the lip's water | 5.6 % of 108 (0 %) | 1.8 % (2.3 %) | 5.6 % (1.3 %) | 7.0 % (2.5 %) | Information |
| 3. Case − solver over 0.05–0.25 H_s through life 0.6: p50 ≤ 0.05, p95 ≤ 0.15 H_s | **0.062 / 0.298** (0.053 / 0.215) | **0.116 / 0.396** (0.080 / 0.271) | **0.119 / 0.366** (0.070 / 0.241) | **0.187 / 0.476** (0.095 / 0.290) | **Fail** (worse; see below) |
| 3. (Information) over 0.3–0.4 H_s, p50 / p95 | 0.094 / 0.355 (0.109 / 0.362) | 0.110 / 0.406 (0.110 / 0.437) | 0.194 / 0.467 (0.097 / 0.330) | 0.238 / 0.543 (0.090 / 0.325) | Information |
| 4a. Below the anchor (0.5–1.5 m shoreward of the 0.3 H_s crossing): rise ≤ 0.02 m a step at p99 | **0.0066** (0.078) | **0.0086** (0.097) | **0.0006** (0.066) | **0.0004** (0.068) | **Pass** |
| 4b. The shift's change ≤ 0.03 m a step at p99 (in the wave's frame: \|ΔW − C Δt\|) | **0.050** (0.86) | **0.053** (0.87) | **0.049** (0.85) | **0.051** (0.85) | **Fail** by 0.02 m: the cap itself (see below) |
| 4b. No crest-anchor fallbacks after a point's first face anchor | **0** (2,655 steps, 89 of 741 points) | **0** (4,562; 199 of 770) | **0** (1,975; 60 of 745) | **0** (4,837; 143 of 769) | **Pass** |
| 4b. The pre-throw clock at 0.5–1.5× real time, no holds over 0.1 s | **100 %**, p50 1.01×, 0 holds (2.5 %, 1,420 holds) | **100 %**, 0.91×, 0 (3.4 %, 1,485) | **100 %**, 1.07×, 0 (2.7 %, 1,451) | **100 %**, 1.04×, 0 (3.2 %, 1,519) | **Pass** |
| 4b. The weight's change ≤ 1/18 a step | **max 0.0556** (max 0.997) | **0.0556** (0.999) | **0.0556** (0.989) | **0.0556** (0.999) | **Pass** |
| 4b. The 40 largest rises by cause | below | | | | Information |
| 4c. Never under the solver | **0.0 %** of fixed reads under by 0.02 m | **0.0 %** | **0.0 %** | **0.0 %** | **Pass** |
| (Step 6's bar 4, information) rise at points fixed in the wave's frame, p99 a step | 0.050 m (0.379) | 0.061 (0.435) | 0.043 (0.300) | 0.046 (0.352) | Information: 6–8× smaller |
| 5. Usable clearance (held over 0.3 m along the ray), p50 at life 0.3–0.9 | **0.29 m** (0.30) | **0.42 m** (0.42) | **0.00 m** (0.00) | **0.01 m** (0.00) | Information against the ruling's expectation (below) |
| 5. (Information) the max gap, p50 at life 0.3–0.9; the air at life 0.1–0.8 over the case's own | 0.53 m; air 0.53 of own 0.64 (0.53; 0.48 of 0.65) | 0.67; 0.65 of 0.78 (0.61; 0.59 of 0.82) | 0.22; 0.30 of 0.40 (0.11; 0.21 of 0.36) | 0.27; 0.38 of 0.50 (0.13; 0.27 of 0.43) | Information |
| 6. On the solver's breaking ≥ 0.3 within ±0.5 H_s on ≥ 85 %, or within ±1 H_s on ≥ 90 %; 0.6–1.5 H ahead | **100 % / 100 %**; 0.92 H_s ahead (88.5 / 89.6 %; 1.02) | **100 / 100 %**; 0.93 (86.9 / 89.4 %; 1.08) | **97.0 / 100 %**; 1.73 (93.6 / 97.6 %; 1.79) | **94.3 / 98.9 %**; 1.86 (90.3 / 93.3 %; 1.92) | **Pass** on a38; the pool's cases pass on breaking, **fail** on distance (as step 6) |
| 7. The clock after the throw p50 0.95–1.05×, p95 ≤ 1.25×; open ±15 % of the case's | **1.000 / 1.250×**; 0.70 s against 0.71 (1.000 / 1.250; 0.68 / 0.70) | **1.000 / 1.250**; 0.78 / 0.79 | **1.000 / 1.057**; 1.24 / 1.26 | **1.000 / 1.042**; 1.38 / 1.40 | **Pass** |
| 7. Formation: the first clock within 0.1 s of τ_e | **98.3 %** of 744 (0 %; first clock 1.32 s after τ_e) | **97.4 %** of 802 (0 %) | **97.9 %** of 752 (0 %) | **97.1 %** of 814 (0 %) | **Pass** (the rest join late, past their first frame) |
| 8. Holes ≤ 0.01 a build, folds ≤ 0.05, saddle p95 ≤ 0.2 H_s | **0.028 / 0.337 / 0.207** (0.061 / 0.538 / 0.227) | **0.022 / 0.255 / 0.202** (0.180 / 1.348 / 0.223) | **0.011 / 0.133 / 0.143** (0.343 / 1.030 / 0.177) | **0.035 / 0.187 / 0.131** (0.243 / 1.177 / 0.170) | **Fail** (holes, folds; 2–8× fewer than step 6), saddle **pass** on the pool's cases, at its edge on a38 |
| 8. Ray advance ≥ 0 | 0.0034 m (0.0039) | 0.0037 (0.0034) | 0.0045 (0.0024) | 0.0046 (0.0043) | **Pass** |
| Ledger: jets thrown and poured; the meter, within ±5 % of main | **634** jets, 269.1 of 278.4 m³; 1.561 m (412; 181.8 of 192.2; 1.592) | **675**, 466.2 of 482.8; 1.884 (463; 331.6 of 353.4; 1.885) | **643**, 184.7 of 185.1; 1.605 (379; 117.2 of 118.8; 1.612) | **693**, 332.1 of 334.1; 1.920 (388; 193.4 of 197.5; 1.897) | Meter **pass** (−2.0 to +1.2 %); jets **fail** (+46 to +79 %: the throw at the contour) |
| Pin: identical for every other spot; step 7 off = main | `runs/pin-main.txt`, `runs/pin-branch.txt` | | | | **Pass** |

### What each piece does (a38, its switch alone)

The bars each piece moves, step 7 against step 7 with that piece's switch old (`runs/anchorOld-*`, `formOld-*`,
`wallOld-*`, `throwBreak-*`). Cells are 1.5 m / 1.8 m.

| Bar | Default (step 7) | `?tubeAnchor=old` | `?tubeForm=old` | `?wallFlow=old` | `?tubeThrow=break` |
| --- | --- | --- | --- | --- | --- |
| 2a. Under the support, p99 (m); bodies over 0.15 m for over 0.1 s | 0.78 / 0.96; 77 / 105 | 0.83 / 1.01; 46 / 49 | 1.00 / 0.86; 71 / 90 | **2.06 / 1.25; 123 / 120** | 0.95 / 0.93; 69 / 88 |
| 2b. Held to touchdown | 21 / 4 % | 5 / 16 % | 20 / 28 % | **6 / 4 %** | 26 / 6 % |
| 3. Case − solver over 0.05–0.25 H_s, p50 / p95 | 0.062 / 0.298; 0.116 / 0.396 | 0.066 / 0.297; 0.118 / 0.388 | **0.046 / 0.197; 0.074 / 0.247** | as the default | 0.058 / 0.292; 0.102 / 0.375 |
| 4a. Below the anchor, rise p99 (m a step) | 0.0066 / 0.0086 | **0.072 / 0.078** | 0.0105 / 0.0125 | as the default | 0.0069 / 0.0091 |
| (Step 6's bar 4) fixed-point rise p99 (m) | 0.050 / 0.061 | **0.239 / 0.242** | 0.111 / 0.165 | as the default | 0.055 / 0.068 |
| 4b. \|ΔW − C Δt\| p99 (m) | 0.050 / 0.053 | **0.886 / 0.878** | 0.037 / 0.040 | as the default | 0.053 / 0.054 |
| 4b. Crest-anchor fallbacks (points) | 0 / 0 | **11 / 81** | 0 / 0 | as the default | 0 / 0 |
| 4b. Pre-throw clock within 0.5–1.5×; holds over 0.1 s | 100 %, 0 / 100 %, 0 | 100 %, 0 / 100 %, 0 | **2.6 %, 1,438 / 3.4 %, 1,474** | as the default | 81.5 %, 426 / 84.6 %, 427 (held for the break) |
| The 40 largest rises, p50 (m a step) | 0.17 / 0.31 | **0.44 / 0.45** | 0.28 / 0.42 | as the default | 0.20 / 0.36 |
| 6. On breaking within ±0.5 H_s | 100 / 100 % | 100 / 100 % | **87.4 / 90.2 %** | as the default | 99.5 / 99.2 % |
| 7. Formation (first clock within 0.1 s of τ_e) | 98.3 / 97.4 % | 98.3 / 97.3 % | **0 / 0 %** | as the default | 97.0 / 97.0 % |
| 8. Holes / folds a build | 0.028 / 0.337; 0.022 / 0.255 | 0.004 / 0.249; 0.000 / 0.249 | **0.095 / 0.980; 0.182 / 1.976** | as the default | 0.000 / 0.217; 0.005 / 0.346 |
| Jets in 12 periods (main: 412 / 463) | 634 / 675 | 630 / 674 | 416 / 459 | as the default | **409 / 490** |

- **The anchor's continuity** carries bar 4: the rises below the anchor, the fixed-point rises, the 40 largest, and the
  fallbacks. It costs a few holes (0.03 a build against 0.00–0.004 without it).
- **Formation by distance** carries the formation bar, the pre-throw clock and bar 6. It removes most folds and holes
  (0.98–1.98 folds a build without it), and makes bar 3 worse (the case's early frames, above) and the jets more (with
  the throw at the contour).
- **The wall's water** carries the bodies: without it, bar 2a's p99 is 1.25–2.06 m and 2b 4–6 %. It changes nothing in
  the sea or the drawing (the probe applies no body reactions).
- **The throw at the contour** carries the jets (409 / 490 with `?tubeThrow=break`, near main's 412 / 463). The break
  rule holds about 1 point in 6's clock short of 0 for up to 0.5 s (426 holds).

### The 40 largest rises, by cause

At the fixed points (bar 4's, step 6's measure), the 40 largest single-step rises in each run, by what changed between their
two reads. In order of the test: the read's slice on the crest anchor in one read and not the other; the drawn crest's
place along the column moving against the solver's lower face by more than 0.035 m a step (the anchor, the solver's
crossing jumping, or the read passing to another slice); the slice's weight changing by more than 0.05 a step; its clock
outside 0.4–1.6×; within 5.3 m of its front's end (the end's blend); else, after the throw, the overturn passing, and
before it, the wall forming.

| Cause (step 7, with step 6 in brackets) | a38 1.5 m | a38 1.8 m | pool 1.5 m | pool 1.8 m |
| --- | --- | --- | --- | --- |
| A crest-anchor fallback | 0 (0) | 0 (0) | 0 (0) | 0 (0) |
| The drawn crest moving against the solver's lower face | 28 (35) | 33 (30) | 22 (36) | 32 (37) |
| The weight changing | 3 (1) | 2 (1) | 5 (0) | 1 (1) |
| A clock jump or hold | 1 (2) | 0 (6) | 3 (3) | 1 (0) |
| Within a front end's blend | 7 (0) | 1 (0) | 8 (0) | 2 (0) |
| The overturn passing (after the throw) | 1 (2) | 4 (3) | 2 (1) | 4 (2) |
| The wall forming (before the throw) | 0 (0) | 0 (0) | 0 (0) | 0 (0) |
| Rise p50, m a step | 0.168 (0.521) | 0.307 (0.611) | 0.169 (0.443) | 0.230 (0.493) |
| At weight ≥ 0.9 | 15 (24) | 30 (28) | 15 (22) | 32 (30) |
| After the throw | 38 (23) | 39 (33) | 39 (20) | 39 (31) |
| From the solver's own surface the read before | 2 (12) | 3 (17) | 7 (12) | 6 (8) |
| Within 5.3 m of the front's start | 7 (2) | 2 (0) | 5 (0) | 4 (0) |

- **They are 2–4× smaller:** p50 0.17 / 0.31 / 0.17 / 0.23 m a step, against 0.52 / 0.61 / 0.44 / 0.49 on step 6.
- **They come after the throw** (38–39 of 40), mostly as the drawn crest moves against the solver's lower face. The kept
  anchor moves at most 0.05 m a step against the wave, so these are the solver's crossing moving under the thrown lip
  (the solver breaking) or the read passing to the next slice, plus the real overturn crossing a fixed point.
- **None is before the throw** (the wall forming no longer steps).
- **Fewer come from the solver's own surface** the read before: 2–7, against 8–17 on step 6.

## Against the ruling's expected values

| | Expected (the ruling §1.4) | a38, 1.5 / 1.8 m | pool's cases, 1.5 / 1.8 m |
| --- | --- | --- | --- |
| The wall's growth | from ≤ 0.1 m at τ_e to 0.8 / 1.0 m at the throw over 1.7 / 1.9 s, about 0.008 m a step | τ −1…−0.5 s: 0.42 / 0.51 m; τ −0.5…−0.1 s: 0.65 / 0.79 m; at the throw 0.92 / 1.07 m; from first seen to the throw 1.48 / 1.70 s (p50) | 0.18 / 0.25; 0.38 / 0.47; 0.62 / 0.76 m; 1.57 / 1.80 s |
| τ_e | −1.69 / −1.91 s | −1.60 / −1.78 s (each case's earliest frame, p50) | −1.71 / −1.91 s |
| The join | at D = \|τ_e\| C_p, equal to the 0.45 / 0.50 m lead on a plane face | each point's first clock 0.025 s past τ_e (p50) | the same |
| Usable clearance (today's floor at the game's crest, the pool's own case: the ruling's §2.4) | 0.35–0.45 / 0.45–0.55 m | a38: 0.29 / 0.42 m (its own unclamped: 0.30 / 0.44) | 0.00 / 0.01 m (the level-13 runs have no clear cavity at these faces, as the ruling's table says) |
| Bodies (the ruling's §1.3) | carried, not overrun; high at the throw pitched; low under the lip covered | still overrun (bar 2); 2c 2–6 % pitched | 2b passes at 1.5 m (85 %) |

## Why bars 2, 3, 4b and the ledger fail (named causes, measured)

- **Bar 2, the bodies.** A no-input body is placed in trim, moving along the line at the peel (5.5–7 m/s). Within about
  0.3 s its board loses most of that speed (traced: −6.7 → −3.2 m/s along x), so the peel leaves it behind. It falls back
  up the face into the case's wall.
  - **What the wall's water changed:** it climbs the face, up to 2–4 m/s at the boards. With it, bar 2a's p99 falls from
    2.06 to 0.78 m at a38 1.5 m (`wallOld` against default), and 2b rises from 6 % to 21 %.
  - **What remains:** at a fixed point the wall's surface rises up to about 12 m/s as its steep part passes (0.6 m in
    three steps, traced). The contact takes a point's flow from the swept surface directly above it, not from the
    near-vertical face just ahead, so a board under the foot of the wall rises at the flow there (about 2 m/s) while the
    wall runs over it. This is the single-valued support's limit, not a parameter. *Inferred:* a body needs the flow of the
    nearest face, not the one above, under a steep wall.
  - **On the pool's own cases** (a thicker, lower curl with no clear cavity), 2b passes at 1.5 m (85 %) and reaches 66 % at
    1.8 m.
- **Bar 3, the lower face.**
  - **After the throw step 7's tails are closer** and its medians about the same (a38 1.5 m, at 0.2 H_s, p10 / p50: life
    0–0.3 −0.17 / −0.07 m against step 6's −0.20 / −0.04; life 0.3–0.6 −0.16 / −0.04 against −0.23 / −0.06).
  - **The worse overall figure comes from formation.** Step 7 now draws the case's frames from its earliest, and there its
    own lower face sits under the solver's: at τ < −1 s, at 0.2–0.25 H_s, p50 −0.11 to −0.13 m and p10 −0.34 to −0.36 m
    (a38 1.5 m). Step 6 had no reads before τ −0.38 s.
  - **Nothing of it is felt:** the union raises the support to the solver's surface. With formation off (`formOld`), bar 3
    reads 0.046 / 0.197 at a38 1.5 m.
  - *Inferred:* the case's early 2D frames are a gentler wave than the game's solver face at the same τ. Matching them at
    0.3 H leaves their lower 0.2–0.25 H under it.
- **Bar 4b, the shift's change.**
  - **The cap is the ruling's:** 0.3 C·Δt + 0.005 m. The kept shift sits at it at p50 (0.029 m), and its p99 of
    0.050–0.053 m is the cap at the faster crests: C along the ray runs up to about 8 m/s, and 0.3 × 8 / 60 + 0.005 =
    0.045 m.
  - **The target runs at or past the cap's ceiling.** The case's crest moves 1.24–1.35× the wave's advance (p50) and
    1.37× at p95, so the cap engages on about 65 % of steps. Near the throw the drawn crest therefore lags the case's own
    frames by up to the cap's shortfall.
  - **Tried, not kept:** capping the lower-face anchor instead and putting the case's crest offset back exactly (4 periods,
    a38 1.5 m and pool 1.8 m). The crest followed its frames (p50 1.02–1.14×), but the anchor's own place still sat at its
    cap at p50, and bar 3 did not improve (0.057 against 0.048). The ruling's literal cap stays, and this is for the advisor
    (below).
  - **Literally on δ** (the shift from the point), its change is 0.86 m at p99. The point is its crest cell's centre and
    steps 1 m rows along its column, so δ steps with it while the case's crest's place does not. That is why the cap is held
    in the wave's frame.
- **The ledger.**
  - **Step 7 throws 46–79 % more jets than main:** 634 against 412 at a38 1.5 m. With `?tubeThrow=break` it throws
    409 at 1.5 m and 490 at 1.8 m (main: 412 / 463); with formation off (`formOld`), 416.
  - **The cause:** every joined crest now throws at its contour, where step 6 waited for the solver's break and retired the
    unbroken ones before they threw.
  - **Where they land:** on the solver's breaking within ±0.5 H_s on 100 % at a38 (bar 6), and the meter is within 2 %.
  - This is the owner's call 5 (throw at the contour, without waiting for the solver's break).

## Cost (this M1, Node, under the probes' load)

The COST=1 A/B: step 7 against step 6 on the same a38 sea, 600 steps each in alternating blocks of 25 (`runs/cost-a38-*.txt`).
Values are p50.

| | a38, 1.5 m | a38, 1.8 m |
| --- | --- | --- |
| The contact's update (the worker) | 3.76 ms against 2.92 (+0.84) | 3.86 against 2.53 (+1.33) |
| The drawing's loft build (the page) | 3.32 against 2.60 (+0.72) | 3.36 against 2.33 (+1.03) |
| The sea's step (the CPU solver, with the front's anchors and distances) | 58.6 against 57.9 (+0.65) | 58.9 against 58.6 (+0.23) |

- **Against the estimate:** the ruling estimated +0.1–0.3 ms a step. Measured: +0.8–1.3 ms on the contact, +0.7–1.0 ms on
  the drawing and up to +0.65 ms on the sea's step.
- **Where it goes:**
  - the contact: the wall's water's extra profile per slice and its per-vertex velocities;
  - the drawing: more live slices, which now form from τ_e (about 1.6 s before the throw rather than about 0.3 s;
    *inferred*);
  - the sea's step: the anchor's reads per point (moved from the lofts) and the contour's bed reads.
- The M4 Pro was not measured (not this machine).

## For the advisor and the owner

1. **Bodies under a steep wall:** the contact takes a point's water from the swept surface directly above it. A body under
   the foot of a near-vertical wall gets the flow of the gentle patch above it, not of the face just ahead, which rises at
   up to 12 m/s at a fixed point. Should the wall's water use the nearest face's kinematics (a horizontal search along the
   ray)?
2. **The cap's ceiling:** the case's crest outruns the wave's advance by 1.24–1.35× (p50) and 1.37× at p95. Is the 0.3 C
   cap on the crest's place right near the throw, or should it hold the lower-face anchor and leave the case's crest to its
   frames? (Tried on 4 periods: the anchor still pins, bar 3 unchanged.)
3. **The case's early frames** sit 0.1–0.13 m (p50) under the solver's lower face at 0.2–0.25 H_s before τ −1 s. The union
   hides it. Is a match at 0.3 H right this early?
4. **Jets +46–79 %** from the throw at the contour (call 5). `?tubeThrow=break` gives 409 at 1.5 m and 490 at 1.8 m (main: 412 / 463).

## How to verify

- **Types:** `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- **Tests:**
  - `src/wave/barrel/tubeWall.test.ts`: the contour distance, the distance clock and its weight, `?tubeThrow=break`
    against the contour's throw and guard, the join by distance, the place smoothing, the extrapolation's blend, the
    wall's water, the records' fields;
  - `src/wave/barrel/faceAnchor.test.ts`: each switch alone, the three old together giving step 6, the continuity step in
    the wave's frame;
  - `src/game/PhysicalMode.test.ts`: the URL switches and the online pin;
  - then the main suite and the SZS subset.
  - **This head:** TESTS_LINE
- **The bars:**
  `PROBE=1 H=1.05 CASE=a38 LOG=runs/wall-a38-1.05.txt npx vitest run src/wave/probes/poolTubeFace.probe.test.ts --maxWorkers=2`
  - `H=1.32`; `CASE=pool`;
  - `SWITCHES=tubeAnchor=old,tubeForm=old,wallFlow=old` for step 6 (main's build);
  - `SWITCHES=tubeAnchor=old` (and `tubeForm=old`, `wallFlow=old`, `tubeThrow=break`) for each piece alone;
  - `COST=1` for the cost A/B against step 6;
  - `TRACE_BODIES=1` writes the first lone boards step by step beside the log (`<log>.bodies`).
  - About 10 min a run on this M1, two at a time.
- **The pin check:** `pin-wall.ts` (its header has the command). Bundle it against main (a `git archive` of c4bbb823's
  `src` with `node_modules` and `public` linked in) and against the branch, then compare. Every line matches but the Barrel's
  defaults: every other spot, the old switches on both case lists, and "step 7 off" (`tubeAnchor=old,tubeForm=old,
  wallFlow=old`) at both sizes on both case lists, which equals main's default. The branch's default runs twice
  identically.

## What was built

The ruling's §1.4, in its order, at the Wave Pool's straight Barrel only (`BarrelSpot.faceAnchor`), each piece behind its
own switch. Where the ruling left something open, or where a measurement showed its words needed a frame, the choice is
marked *(built so)* with its cause.

### 1. Anchor continuity (`?tubeAnchor=old` turns it off)

- **Where the shift lives:** in the simulation, per front point, step to step (`CrashCurve.prepareAnchors`,
  `src/wave/barrel/crashCurve.ts:393`, called from `SweptCrash.update`, `src/wave/barrel/SweptCrash.ts:287`). Each point's
  raw shift is read under the contact's hold (the shape the drawing, with its clear-roof hold, and the contact both draw),
  smoothed along σ with the 2 m biweight, then kept by `continueAnchor` (`src/wave/barrel/faceAnchor.ts:144`). The records
  carry it (`FRONT_FIELD.anchor`, `src/wave/barrel/frontRecords.ts:18`) and the loft reads it instead of reading the solver
  again (`src/wave/barrel/sweptLoft.ts:1605`). Page and worker draw and feel the same anchor.
- **The cap:** `ANCHOR_CONTINUITY` (`faceAnchor.ts:116`): 0.3 C·Δt + 0.005 m a step. *(Built so)* in the wave's frame: the
  cap holds the place the case's crest stands along the point's ray, W = S·n + δ, within that of the wave's own advance
  there, C·Δt (C the crest's pace along its column projected on the ray, `crashCurve.ts:433`).
  - **Cause:** a front's point is its crest cell's centre and steps along its column in the solver's 1 m rows (traced: z
    −199.5 → −198.5 → …, one step every ~0.18 s, while the wave moves on). A cap on δ relative to that point fought those
    steps: traced, the kept shift climbed at its cap (±1.9 m/s, alternating) for 1.5 s and the wall moved with the point.
    On a 4-period run its change sat at the cap at p50 (0.027 m), and the fixed-point rise p99 was 0.23 m against 0.05 m
    after this change.
  - **The smoothing too** *(built so)*: the shifts are smoothed as the places they put the case's crest
    (`smoothPlaces`, `faceAnchor.ts:451`): a neighbour's row step changes its own shift but not where its case's crest
    stands, so it stays out of the point's.
- **A miss:** W runs on at its last rate for up to 0.5 s, then the shift stands with the point. A point never returns to
  the crest anchor once it has had a face anchor.
- **No anchor yet:** a point that first stood on the crest anchor eases to the face anchor over 0.3 s (smoothstep).
- **The life-0.5 extrapolation:** blended over life 0.45–0.55 (`FaceAnchor.blendedFace`, `faceAnchor.ts:315`). Measured:
  at the contact's hold on both case lists the old switch stepped by under 1 mm, so this changes little.
- **The drawn crest's speed along the ray** (W's rate) and each point's clock rate go in the records too
  (`FRONT_FIELD.crestSpeed`, `.tauRate`) for the wall's water.

### 2. Formation by distance (`?tubeForm=old` turns it off; `?tubeThrow=break` the throw alone)

- **The clock** (`distanceClocks`, `src/wave/barrel/sliceClock.ts:300`; `OnsetTiming.distance`, `:137`):
  - before its throw, τ = −D/C_p, within [τ_e, 0), never falling, at 0.5–1.5× real time (`FORMATION`, `:151`);
  - **τ_e is each point's case's earliest frame at its size** (the library's `startSeconds`,
    `src/wave/barrel/ProfileLibrary.ts:465`): on a38, −1.73 / −1.60 / −1.50 s (p10 / p50 / p90) at 1.5 m and
    −1.87 / −1.78 / −1.70 s at 1.8 m, as the ruling's −1.69 / −1.91 s. The timing's own `earliest` (−3 √(h0/g) = −2.01 s on the 4.4 m
    platform) would have held the slice on the case's first frame for its first 0.3 s.
  - **D and C_p along the point's own path, its column** *(built so)*: D is the distance along +z to where the still
    depth is the point's throw depth (`throwContourDistance`, `sliceClock.ts:266`, the bed read every 0.5 m), C_p its
    crest's pace along the column (`pathPace`, `:364`: its measured speed held to 0.5–1.5 × √(g(d + η)), over its travel's
    z component). Cause: a front's points travel along their columns, and that is where each crosses its contour; along the
    crest's travel direction instead, the distance fell 1.45 m per metre the point moved (traced at a38 1.5 m), so −D/C ran
    at about 1.47× and the clock sat at its 1.5× bound in half its steps.
  - **The smoothing:** the contour's place along the columns and the front's own place, each by the clock's 2 m biweight
    line along σ, D the one less the other (the points' row steps kept out, as for the anchor).
  - **The throw** (contour, the default): when τ reaches 0, by the clock; the crest's own crossing no longer sets it
    (`BreakingFront.ts:425`), and the post-throw fit uses the clock's throw times (`sliceClock.ts:411`). After it, as
    step 6: the fit over thrown neighbours, at most 1.25× real time.
  - **The retire guard:** a point the solver still hasn't broken 0.3 s after its throw retires over 0.5 s.
    `?tubeThrow=break`: an unbroken point holds just short of 0 until the solver breaks it, and retires 0.3 s past its
    foreseen throw, as step 6's rule.
- **The join** (`BreakingFront.ts:458`): a sized crest joins when D ≤ |τ_e|·C_p along its column, its clock starting at its
  τ_e. The crest's travel direction is carried on the samples (`CrestSample.dirX`, `src/wave/barrel/crestOnset.ts:47`) for
  its pace.
- **The weight:** a smoothstep over the case's first 0.3 s of τ, changing by at most 1/18 a 1/60 s step, never falling
  (`FORMATION.weightRate`); it replaces the step-6 fallback ramp from the join.

### 3. The wall's water (`?wallFlow=old` turns it off)

- **Where:** in the case's water above the solver's surface with no air under it (`PhysicalSurfWater`, `sweptWall`,
  `src/physics/PhysicalSurfWater.ts:147`; set in `unionContact`, `:691`, applied at `:510`).
- **What the contact carries** (`LoftResult.wall`, `src/wave/barrel/sweptLoft.ts:1141, 1316, 1392`; `ContactHit.wall…`,
  `src/wave/barrel/sweptContact.ts:98, 353`): per vertex, the case's surface's own velocity along its ray and up (its frames
  a frame apart at its clock's rate, carried by its anchor: the drawn crest's speed less the case's own crest's lab-frame
  motion); per slice, the anchor's height (the case's 0.3 H crossing level), its crest's height, the drawn crest's speed C,
  and B (`WALL_FLOW`, `sweptLoft.ts:264`: 0.85 before the throw, 1 from it; Derakhti et al. 2020, §4).
- **The flow** (`wallWaterFlow`, `PhysicalSurfWater.ts:847`): in the ray–vertical plane,
  - the component normal to the case's surface is that surface's own normal speed (the kinematic condition);
  - the along-ray component ramps from the solver's at the anchor's height to B·C at the crest;
  - so the component along the face, up it toward the crest, follows from those two: the water climbs a face that moves
    forward faster than it does.
  - *(Built so)* faces steeper than 78° from level (and overhangs) are taken at 78° for the climb, and the climb is held to
    C either way (water at a wave face moves no faster than the wave; inferred), so a near-vertical face has no blow-up.
  - Weighed by the slices' weight; along the crest the solver's flow is kept.
  - A first build projected the ramp's vector onto the kinematic condition instead; on a steep face that left almost no
    climb, which is not the ruling's spec, and was replaced.

### The switches and the records

- `TubeFace` (`src/wave/barrel/faceAnchor.ts:35`) gains `continuity`, `distance`, `contour` and `wallFlow`
  (`tubeFaceOf`, `:83`); `SurfZoneConfig.tubeAnchor`, `.tubeForm`, `.tubeThrow`, `.wallFlow`
  (`src/wave/SurfZoneSimulation.ts:335`); the URL reader `tubeFaceSwitches` (`src/game/PhysicalMode.ts:528`); online rooms
  pin all four (`src/main.ts:527`).
- Formation by distance needs the lag (`?tubeLag=0` turns it off with it); the wall's water needs the union
  (`?tubeFace=old` turns it off with it). `?tubeFrom=piece` turns all of step 7 off.
- The records grow from 10 to 13 floats (`FRONT_STRIDE`); the three new ones are NaN at every other spot and with the
  switches off.

## The owner's shot list

Wave Pool → Waves: **Barrel**, at **1.5 m** and at **1.8 m**, dev build (the URL switches are read). Record each. The probe's
bodies have no input, so everything below about riding is the owner's to judge.

1. **The default (step 7, a38).**
   - **The face standing up:** watch one section from about 2 s before it throws. The top of the face should stand up
     steadily over about 1.5 s (1.5 m) or 1.7 s (1.8 m), from nothing to a wall about 0.9 m (1.5 m) or 1.05 m (1.8 m) over
     the slope at the throw. Step 6's wall appeared in its last second, already 0.4–0.6 m high.
   - **No flicker or steps:** the wall should slide along with the wave, not hop. Watch the steep upper face side-on for
     jumps of a hand's width or more, especially just after the throw and at the ends of a section.
   - **Riding up from the shoulder:** take off on the shoulder and let the face steepen under you. With step 7 the wall's
     water climbs the face (up to about 4 m/s on the board in the probe), so a board low on the face should be lifted
     rather than buried. Say whether you rise with it or the face runs over you.
   - **Too high at the throw:** sit high (above about half the face) as it throws. Expected (the ruling): drawn up and
     pitched over the falls with the lip. Say if that happens and whether it reads as fair.
   - **Low under the lip:** sit in the lower third as it throws and stall. Expected: covered, the lip landing about one
     face height ahead of the drawn crest, on whitewater (100 % of landings in the probe). Is there room to crouch
     (about 0.3 m held at 1.5 m and 0.4 m at 1.8 m in the probe)?
2. **`?tubeAnchor=old`** (step 7 without the anchor's continuity): the wall should hop and flicker as it did on step 6.
   Compare the steps against the default.
3. **`?tubeForm=old`** (without formation by distance): the wall appears late and fast, held near vertical before the
   throw, as on step 6. Compare how the face stands up.
4. **`?wallFlow=old`** (without the wall's water): the same wall, but its water carries the solver's flow. Compare whether
   a board low on the steep face rises with it or is run over.
5. **`?tubeThrow=break`** (the throw waits for the solver's break as well): compare where the lip lands against the
   whitewater.
6. **`?poolTubeCase=pool`** (the pool's own runs, with step 7): a thicker, lower curl. The same checks, and whether 1.8 m
   feels bigger than 1.5 m.
7. **`?tubeAnchor=old&tubeForm=old&wallFlow=old`**: step 6 (main's build), for the A/B.
8. For each: where you fell and why, how the face felt as it stood up, any hop or flicker in the wall, and whether the
   tube looked like the wave's own water.
