# Step 3.3n — every prediction, written before its read

Written on `claude/rider-new-33n`, cut from `main` at **fe48c7c2** (step 3.3m's merge), **before the probe was run
once**. Each prediction names what would falsify it. The report quotes this file and says which held.

The round is a **read of the loop that writes the balance's command** (`src/physics/predictiveBalance.ts`), not a
build. No source file is touched, so there is no behavioural arm at all except the two that already exist as shipped
options (`humanGains`, the "no control" arm 3.2w used; `FELT=deck`, the owner's own fall filter).

## P0 — the controls, which must hold or nothing below is readable

- **P0a (the command's identity).** The code computes `u[0] = ref.u[0] − b̂₀ − Σ_j K[0][j] (x̂[j] − ref.x[j])` and
  stores it in `raw[0]` before the clamp [R, `predictiveBalance.ts:1230–1239`]. So the probe's own decomposition
  `ff + bias + fb` must reproduce `raw[0]` **to floating-point**, on every tick of every run. Falsified by any tick
  whose residual exceeds 1e-9 rad relative to the largest of the three terms. *If this fails, the probe is reading
  the wrong `K` (the blend is refilled in place every tick) and no decomposition below means anything.*
- **P0b (the clamp is the saturation).** `sent[0] = clamp(raw[0], ±limits.ankle)` and `limits.ankle = restRange()`,
  which is `ANKLE_REST_RANGE = 0.25 rad = 14.324°` with no `ankleRange` switch [R]. So `|sent[0]| ≤ 0.25` on every
  tick, and `|sent[0]| = 0.25` exactly when `|raw[0]| ≥ 0.25`. Falsified by any tick where the two disagree.
- **P0c (the rider is unchanged).** The probe writes nothing and changes no source. So the unsteered 24 and the
  owner's low-speed 18 must reproduce step 3.3m's and step 3.3l's **published** fall time, fall kind, roll, bank and
  rail at the fall and frame count **to the digit**. Falsified by one mismatched column.
- **P0d (the positive control for the prediction-error instrument, predicted before it runs).** The filter only
  updates once the sense line is longer than `N = 6` ticks [R, `tick`: `if (this.senses.length > N)`], and the
  estimate starts at all zeros. So on **ticks 1–6** the predictor's `x̂` carries no sense at all: it is
  `Σ_j Φ^{N−1−j} Γ (u + b̂)` on commands that are themselves built from `x̂ ≈ 0`. **Prediction:** over ticks 1–6 the
  predicted bank is within 1° of zero and the prediction error on the bank is therefore **the sensed bank itself**,
  which the inherited lean puts at 8.69–8.71° [Part 35]. Falsified if the predicted bank is not near zero there, or
  if the error is not the sense.

## P1 — why the command saturates while the joint is free (my brief's question 1)

- **P1a.** My brief says *"the command is pinned and the joint is not"* on Part 34's **62 of 72 against 1 of 72**. I
  predict those two counts are **not the same window**: 62 of 72 is a run that saturated **at any time**, and 1 of 72
  is the applied rest **at the fall frame**. Measured per tick on one window, I predict the saturated share and the
  applied-rest-at-bound share are **equal wherever the rail's bite is open**, because `lean = clamp(−raw[0], −range,
  range) = −sent[0]` identically while `|rail| < RAIL_BITE = 48°` [R, `AttachedRider.ts:3458–3461`]. Falsified if the
  two per-tick shares differ by more than the bite's own frames.
- **P1b.** The saturating term is the **feedback**, not the reference and not the bias: on the unsteered arm
  `ref.u[0]` is a function of `leanAsked` alone, which is 0 with the stick untouched, so `|ff| < 0.001 rad` in every
  tick of that arm and the whole command is `fb − b̂`. Falsified by a non-zero `ff` on an unsteered run.
- **P1c.** The bias `b̂₀` is an **integrator with no anti-windup**: it is a random-walk state of the Kalman filter
  (`bias: [0.01, 5]` per √s), it is subtracted from the command, and **nothing tells it the command was clamped**
  [R]. I predict it ramps monotonically in the second before the fall and reaches **at least 2°** (a seventh of the
  bound) in a majority of runs. Falsified if its median peak is under 1° or its sign flips as often as not.

## P2 — the prediction error (question 2)

- **P2a.** The honest benchmark for a predictor is **not zero error**, it is the error of not predicting: the stale
  sense the filter is fed, `sense(k−N) − sense(k)`. I predict the predictor **beats** the stale sense near trim
  (the first 0.4 s) and **loses to it** over the last 0.2 s before the fall, because the forward model is linear about
  a trim the rider has left. Falsified if it beats the stale sense in the last 0.2 s, or loses near trim.
- **P2b.** The prediction error on the bank reaches **5°** before the fall in a majority of runs — comparable with
  the whole 8.7° of inherited lean, so the loop is acting on a state that is wrong by about as much as the thing it is
  answering. Falsified if the median peak error is under 2°.
- **P2c.** The prediction's **own contribution to the command** is large: the counterfactual
  `u_stale = ref.u − b̂ − K(ê − ref.x)` (acting on the delayed estimate instead of the forward prediction) differs from
  the shipped command by more than the bound itself (0.25 rad) in a majority of runs. Falsified if the median
  difference is under a quarter of the bound.

## P3 — is it worse than nothing (question 3)

- **P3a.** 3.2w measured the shipped predictor at 0.77–1.70 s against a dead ankle's 0.63–3.08 s on **its** cell. On
  **this** round's cells I predict the dead ankle (`humanGains` all zero: the rest pinned at 0, a passive spring and
  damper and nothing else) falls at a **time whose span overlaps** the shipped loop's on both the unsteered arm and
  the owner's low-speed arm — that is, no separation. Falsified if either arm separates cleanly.
- **P3b.** On the owner's own low-speed cell the dead ankle is **no worse than** the shipped loop at the median.
  Falsified if the shipped loop's median is later by more than 0.2 s.
- **P3c.** 100 % of both arms still fall. Falsified by one run surviving nine seconds.

## P4 — does it fight the rider's own input (question 4)

- **P4a.** With a lean asked, the reference's feedforward `ref.u[0]` has the **same** sign as the ask (it is the
  steady turn's own ankle rest), and the feedback `fb` has the **opposite** sign for as long as the predicted bank
  lags the reference's. I predict the feedback **cancels more than half** of the feedforward at the median tick of a
  steered run, so the net command delivers under half the rest the asked lean's own steady turn calls for. Falsified
  if the feedback's median share of the feedforward is under 0.5 in magnitude, or if it has the same sign.
- **P4b.** The command's slope on the deck's roll is the **same sign and within a factor of two** in a steered cell
  and an unsteered one — buoy.ts's own test, which it could not complete because `leanAsked` is nearly constant
  (3.3d). Here it is taken on the decomposition instead of a regression. Falsified if the two slopes differ in sign.
- **P4c.** The thing the owner feels as *"correction balance while turning"* is **not** the loop refusing the lean:
  I predict `ref.u[0]` tracks the asked lean monotonically and the applied rest reaches the asked turn's own value
  within 0.3 s on at least half the steered runs. Falsified if it does not. *(P4a and P4c are deliberately opposed:
  one of them is wrong.)*

## What this round will not claim, written now

- It will not claim a mechanism for the fall from any single run, cell or window.
- It will not claim the predictor is the cause of the fall. The plant is innocent (3.3m) and the command is the next
  thing in the chain; that is a place to look, not a verdict.
- It will not offer a bot ride as evidence of feel.
- It will not build a controller. If the read names a defect, the smallest honest change is named and nothing is
  built.
