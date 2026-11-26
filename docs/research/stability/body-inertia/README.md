# 3.6g: which body the board follows — the body's own rotational inertia J in the balance's picture, against the kicked twins

*Surfer-track builder, Claude Opus 5.5, high effort, 2026-11-26. Branch `claude/body-inertia`, from `fc466712` (3.6f,
reviewed) plus the brief (`e3449861`). The brief is `BRIEF.md` in this folder (sha1 `e22adf929c442f2250844a5302d41a48e272d81e`,
checked at 16:59 UTC before starting). Model-side diagnosis only: scripts reading the existing twins and the shipped
model code; no arm, no gain change, no option's default changed, no game behaviour changed, `riderBody=control` not
ridden or benchmarked. His address throughout:
`?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.*

## 0. Pre-registration (written and committed before any P_0, P_control or sweep number exists)

**What I had read when writing this.** The brief; 3.6e's `README.md` §0–§2 and its results' heads
(`results/final/heldout-q2.md`, `q3-lti-c.md`, `fit-summary.md`); its readers `fitLib.ts`, `heldout.ts`, `closures.ts`,
`knownfit.ts`, `knownltv.ts`; 3.6f's `README.md` §3–§6 and §9–§10; `rollModel.ts` (`RiderBody`, `lateralMass`,
`lateralCompliance`, `twoBody`, `yawRows`); `predictiveBalance.ts` (`plantAt`, `bodyInertiaAt`, `stanceAt`,
`continuousPlant`, the `riderBody` weights at `:1500–1502`); `responseLib.ts` (`perturbation`, `ring`, `waveErr`, the
constants); 3.4a's control test (`predictiveBalance.test.ts:251`). **No P_0, P_control or sweep number has been computed
by me**; the only run started is the full stability report (16:59 UTC, `src` unchanged, at `e3449861`). The numbers I know
going in are the published ones the brief quotes (3.6e's held-out e, its closure rows; 3.6f's side-push and yaw-impulse
reads; 3.4a's lean-row and side-mass reads) and 3.6e's fitted (c) multiplier on J (`fit-summary.md`: Compress LTI 1.26 in
the low bin, at its bound 0 in the two upper bins — with the water's twelve scales free beside it).

### 0.1 The pictures (every one through `plantAt`'s own options; no `src` change)

All at his options (`plantFloor: 6`, `stanceDeep: true`), at a set's speed, depth and rail, the water and every other
quantity the shipped ones:
- **P_two**, his picture: 3.6e's `buildPlant(v, d, rail, {})` = `body: bodyInertiaAt(73, d, h, true)`, the feet's roll
  coupling on. Identity: equal to `shippedPlant` (`body: true`) bit for bit.
- **P_0**: `buildPlant(…, { J: 0 })` = `body: 0` → `{ inertia: 0 }`, the feet's roll coupling on (`plantAt:747–748`).
- **P_control**: `plantAt(…, { body: { inertia: 0, feetRoll: false } })`, the pre-3.4a plant (`riderBody=control`'s
  weights, `:1501`), through a small builder in this folder's library (the same call with that object in place of the
  number).
- **The sweep**: `buildPlant(…, { J: s })`, s ∈ {0, 0.25, 0.5, 1, 2}, feet's roll coupling on (s = 0 is P_0, s = 1 is
  P_two). Labelled exploratory.

### 0.2 Question 1: the open twins

- **Sets.** 3.6e's open sets: `fitSets(loadRuns(files))`, mode open, `pass60`, kick-tick speed ≥ 4 m/s, per stance
  (Compress `compress:straight`, the tuck `crouch:straight`, tall `none:straight`). Two seed groups, reported apart:
  **fitting** (`36d/twins/big_s{1,2,3}.jsonl`) and **held-out** (`36e/heldout/big_s{4,5}.jsonl`). Nothing is fitted, so
  both are out of sample for these pictures.
- **Bins and scales.** 3.6e's frozen bins and scales: `results/fit/fit-<stance>.json`'s `edges` and its bins' `sigma`
  (σ per channel and state, from the fitting sets), for both groups, exactly as `heldout.ts` scored them.
- **The metric.** `fitLib`'s `predErr`: e = ‖(G − g) / σ‖ / ‖g / σ‖ over the eight mechanical states and m = 1 … 60,
  G the picture's open response at the kick tick's speed, depth and rail (**frozen**, the registered metric).
  **Speed-following** (secondary, 3.6e's amendment 3): G following the schedule speed tick by tick, depth and rail held
  at the kick tick's (3.6e's `ltvResp`, with the same 0.25 m/s interpolation nodes), scored against P_two speed-following.
- **Reported per stance × seed group × picture:** the median e; the median of e / e_two with its quartiles; the count of
  sets with e < e_two; per **row** (each state alone, σ cancels): ‖G_o − g_o‖ / ‖g_o‖ over m = 1 … 60 for the roll φ,
  the bank θ, the yaw rate Ω (the model's r), the slip β and the twist θ_t (φ̇, θ̇, ω_u in the JSON), as medians and as
  median ratios to P_two; the senses' waveform error (y0–y6, m = 1 … 60, `heldout.ts`'s). Per speed bin: sets and the
  median e / e_two. Per kick channel (ankle, twist): the median e / e_two, as a reference.

### 0.3 Question 2: the closed twins

`closures.ts`'s rules unchanged: closed sets passing over 1.5 s (`pass90`) at ≥ 4 m/s, fitting and held-out seeds; each
picture closed with **the shipped design, unchanged** (`perturbation(W, args)`, the exact perturbation map of the
blended designs, built on P_two through his `riderBody=two` weights), speed-following (the picture re-evaluated at each
tick's speed, depth and rail; primary) and frozen (at the kick tick); a unit kick at m = 0, 90 ticks. Read-outs on Ω:
Prony f and ζ (`ring`), the damped sinusoid (`readout`), the envelope ratio (`envelope`), the waveform error on Ω and on
the senses; the twins' own beside. Per stance, per group and pooled.

### 0.4 Question 3: the method's like-for-like control

- **The picture's own twins.** For a linear plant the open twins' difference is exactly the plant's open impulse
  response whatever the controller does (3.6e's `knownltv.ts` header), so the picture's own open twins at a set are its
  open response at that set's kick point. I simulate them for **P_two and P_0** at the **fitting** seeds' open sets
  (≥ 4 m/s, `pass60`) of each stance, frozen at the kick tick (primary; the speed-following version only if time
  allows, reported without a line). This is the known-plant machinery without the closed-loop rides `knownfit.ts`
  builds (they give the same difference to rounding); a deviation, stated.
- **The picture's own rider yaw term, as a ledger.** The board's yaw row less its water: R_N = I_z,b ṙ − (N_φ φ + N_β β
  + N_r r + N_p φ̇), I_z,b = `boardYawInertia`, N_* = `heelYaw`, `slipYaw`, `yawDamping`, `rollRateYaw` (in 3.6e's
  ledger frame this is exactly the rider's residual: own inertia × ṙ less the water, whose model form carries
  −(I_z,b − I_own) ṙ). Taken, as the game's ledger is, as the **frame mean** over each tick: the tick integrated in 64
  substeps (`discretise` at 1/3840 s, the kick's command held over tick 0), R_N's trapezoidal mean over them.
- **The regression**, 3.6e's unchanged: the frame-mean regressors from the tick samples (`ledgerSet`'s formulas, fed the
  picture's own outputs through `outOf` and R_N as its rider entry), the 14 rider regressors, each set weighted by its
  φ̇ RMS, `regress` (OLS, cluster-robust errors by set, scaled κ, VIFs), per 3.6e bin and pooled ≥ 4 m/s.
- **Beside it:** (i) 3.6e's synthetic control on these regressors (y = X b_kin, noise-free: returns b_kin to ≤ 1e−8);
  (ii) the two exact continuous-time representations of R_N, the **kinematic** b_kin (`modelCoefs`' `riderYaw`: per r
  −x_f m V − c_t = +111 … +188, per β̇ −x_f m V, per ṙ −(I_r + m x_f²) = −5.59 in Compress) and the **ankle form** b_ank
  (H = (−τ + m g h θ − J θ̈) / h from the bank row: per r −c_t = −3, per β̇ 0, per ṙ −I_r, per φ −x_f k / h + F_x k / (m g),
  …), each one's relative residual against the frame-mean R_N on the stacked weighted rows.
- **Its line.** The regression **returns the analytic (kinematic) coefficients** if its per-r and per-ṙ coefficients
  are both within 30 % of b_kin's; it **returns the ankle's form** if its per-r coefficient is within 0.3 |m V x_f| of the
  ankle form's −c_t and its per-φ and per-δ within 30 % of b_ank's; **neither** otherwise. Pooled ≥ 4 m/s decides, per
  stance; the bins reported.

### 0.5 Decision lines (Compress decides; the tuck and tall by the same lines, reported)

- **Open (Q1, Q4).** On P_0 against P_two, frozen metric:
  - **"J = 0 predicts"**: on the held-out Compress sets, e_0 < e_two on ≥ 75 % **and** median e_0 / e_two ≤ 0.5 (3.6e's
    own line);
  - else **"J carries part"**: median e_0 / e_two ≤ 0.8 on **both** seed groups;
  - else **"the twins follow J"**: median e_0 / e_two ≥ 1.0 on both seed groups (removing J makes the picture worse);
  - else **"J does not decide"** (between 0.8 and 1.0, or the groups disagree).
  - P_control is read by the same lines against P_two, and against P_0 (the feet's roll coupling's own share).
- **Per row.** A row **favours J = 0** if its median per-row error ratio (P_0 / P_two) is ≤ 0.8 on both seed groups;
  **favours J** if ≥ 1.25 on both; otherwise neutral.
- **The sweep's best value** (exploratory): the multiplier of the lowest median e on the held-out Compress sets, with the
  fitting group's beside; "between" if it is 0.25 or 0.5 on both groups.
- **The closure (Q2).** 3.6e's line: a picture **reproduces** the closed twins if, pooled, speed-following,
  |median paired Δf| ≤ 0.15 Hz **and** median waveform error on Ω ≤ 0.6. It **rings as the game does** if, pooled,
  speed-following, its median Prony ζ ≤ 0.10 **and** its median envelope ratio ≥ 0.5 (the twins: ζ 0.026–0.033, envelope
  0.90–0.94 in Compress). Frozen reported, deciding nothing.
- **How much of the gap** (Q4): e_two − e_pic (median of the per-set differences and the difference of medians), on the
  held-out Compress sets, beside 3.6e's best fit (c): 1.061 − 0.587 = 0.474.

### 0.6 Controls (each must pass before any P_0 number counts)

1. **P_two identity**: my P_two's discrete Φ and Γ equal `shippedPlant`'s bit for bit (largest |Δ| = 0) at every set's
   kick point used (both groups, all stances); and my P_two scoring reproduces 3.6e's held-out per-set `ship` e in
   `results/final/heldout-q2.json` (largest |Δ| ≤ 1e−12) and the medians **1.061 / 1.140 / 0.802**, and its
   speed-following median 0.987 (Compress).
2. **P_control**: its continuous A and B equal the pre-3.4a plant's (`plantAt` without `body`, his other options) to
   ≤ 1e−12 relative per row at every set's kick point, and 3.4a's own test passes
   (`npx vitest run src/physics/predictiveBalance.test.ts -t "reproduces the shipped plant exactly"`, that one test).
3. **The closure of P_two** reproduces 3.6e's shipped rows per set (`q3-lti-c.json` `shipSF`, `shipFr`: f, ζ, envelope,
   waveform errors, largest |Δ| ≤ 1e−9) and so the published pooled rows (Compress frozen: Prony f 2.73, ζ 0.730;
   speed-following 2.27, 0.576).
4. **Q3's synthetic control** (§0.4 (i)).
5. **The round's controls**: the full stability report (227 of 227 identical to `baseline-full.json`, its 26 test-wave
   lines to `baseline-quick.json`, 3.6c's `same.py`); the Canyon byte check (snapshots `a367d938f15fa934`, state
   `9e5831f80e38abd9`); `npx tsc -b`; the gain lock (`npx vitest run src/physics/stabilityGains`, 5 of 5);
   `git diff fc466712 --stat -- src scripts` (expected empty).

### 0.7 Predictions (made before any number)

1. **Open, overall:** removing J changes the open error little in Compress: median e_0 / e_two between 0.85 and 1.05 on
   both groups — **"J does not decide"**. 3.6e's water alone, (a), took the error to 0.54 of the shipped; J alone cannot
   move the water's terms. P_control within 3 % of P_0.
2. **Per row:** J = 0 helps the yaw rate Ω and the slip β (the board turns 3–5 times as freely under a side push in the
   game as in P_two, 3.6f) — ratio ≤ 0.8 on Ω; and hurts the bank θ (3.4a: J cut the lean row's one-step error about
   threefold) — ratio ≥ 1.25 on θ. φ and the twist roughly neutral.
3. **The sweep:** the overall optimum is interior (0.25–0.5) on held-out Compress, by a small margin over both ends.
4. **Closed:** neither P_0 nor P_control rings as the game does; with the shipped design both decay with Prony ζ above
   0.3, though less than P_two's 0.58 speed-following; neither reproduces.
5. **Q3:** on the picture's own twins the regression does **not** return the kinematic coefficients, for P_two or P_0:
   its per-r coefficient comes out below 30 % of b_kin's, near the ankle form, as 3.6f's C4 found from the game's own H;
   the regression's scaled κ is far larger than the game's (above 1e3), since R_N is exactly in the span of the states.

### 0.8 Guards

Model-only. No game runs beyond the round's controls (the full report, the byte check). At most 8 game processes. Raw
outputs in the session scratchpad's `36g/`; the tables and JSON in `results/`; the scripts here. Later changes go in as
dated amendments below, committed before the numbers they govern are read.

### 0.9 Amendments

1. *2026-11-26, 17:52 UTC, after the first read of `regctl.ts` (17:51), before its rerun.* **A fix to question 3's
   synthetic control, and one exploratory reading.** The registered control (§0.4 (i)) is 3.6e's: y = X b with one b,
   the group's mean b_kin, for every set. My first run built y with **each set's own** b_kin (its own speed in m V x_f)
   and compared the result with the mean; that is not 3.6e's control, and it "failed" (‖b̂ − b̄‖ / ‖b̄‖ 0.4–2.2) for
   that reason. The rerun computes the registered control (one b̄) and keeps the per-set version beside it as an
   **exploratory** reading (labelled so; it decides nothing): what a regression pooled over sets of different speeds
   returns when every set's term is exactly its own kinematic form, noise-free — its per-r and per-ṙ coefficients
   printed with the line of §0.4. The regression of R_N itself, the forms' residuals and every other number of the first
   read are unchanged by this (the rerun must reproduce them; checked).
2. *2026-11-26, about 18:00 UTC, after questions 1–3 were read, before this is run.* **Exploratory, model-only: does J
   matter once the water is fitted?** Questions 1–2 put J in the shipped water; 3.6e's fit (c), with the water free,
   ran J to its bound (0) in two of three Compress bins. So, as a reading that decides nothing: 3.6e's frozen fit (a)
   (the twelve water scales of its bin, `results/fit/fit-<stance>.json`, nothing refitted) with J × 1 (**W_two**) and
   J × 0 (**W_0**), the feet's roll coupling on; scored as question 1 (frozen and speed-following; both groups — the
   fitting group is in-sample for the water, the held-out group out of sample) and closed as question 2 (the shipped
   design). Reported: median e, e_W0 / e_Wtwo, per row; the closure rows. *My prediction:* with the water fitted, J = 0
   is about neutral or better on the held-out Compress open sets (median ratio 0.85–1.0), and W_0 closes lighter than
   W_two.
