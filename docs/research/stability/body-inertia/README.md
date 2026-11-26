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
2. *2026-11-26, 17:54 UTC, after questions 1–3 were read, before this is run.* **Exploratory, model-only: does J
   matter once the water is fitted?** Questions 1–2 put J in the shipped water; 3.6e's fit (c), with the water free,
   ran J to its bound (0) in two of three Compress bins. So, as a reading that decides nothing: 3.6e's frozen fit (a)
   (the twelve water scales of its bin, `results/fit/fit-<stance>.json`, nothing refitted) with J × 1 (**W_two**) and
   J × 0 (**W_0**), the feet's roll coupling on; scored as question 1 (frozen and speed-following; both groups — the
   fitting group is in-sample for the water, the held-out group out of sample) and closed as question 2 (the shipped
   design). Reported: median e, e_W0 / e_Wtwo, per row; the closure rows. *My prediction:* with the water fitted, J = 0
   is about neutral or better on the held-out Compress open sets (median ratio 0.85–1.0), and W_0 closes lighter than
   W_two.

### 0.10 The order of the round (UTC, 2026-11-26; commit times from `git log`)

| time | step | commit |
| --- | --- | --- |
| 16:59:42 | the brief's sha1 checked (`e22adf92…`, as given) | `e3449861` (the brief, 16:59:01) |
| 17:00:25 | the full stability report started in the background at `e3449861` (`src` as `fc466712`); §0 said 16:59, the report's own stamp is 17:00:25 | — |
| 17:05–17:06:15 | the pre-registration written, committed and pushed | `4453290a` |
| 17:07:59–17:08:10 | the controls (§0.6 items 1–3; P_two's scores and P_control's matrices only) | — |
| 17:08:16 | 3.4a's own control test (that one test) | — |
| 17:09:33 | the controls' results and the readers of questions 1–2 committed | `0912a3f5` |
| 17:09:39 | **the first P_0, P_control and sweep numbers**: `open.ts` (done 17:09:41) and `closed.ts` (done 17:20:30) | — |
| 17:50:16 | questions 1–2's tables committed | `1d179b52` |
| 17:51:34 | `regctl.ts`'s first read (question 3) | — |
| 17:52:18 | amendment 1 committed (the synthetic control as registered), before the rerun | `f6cdfc39` |
| 17:52:27 | `regctl.ts` rerun: every regression number identical to the first read (largest difference 0, JSON compared) | — |
| 17:53:29 | the Canyon byte check started; `npx tsc -b`, the gain lock and the diff stat (17:53:29–17:53:38) | — |
| 17:54:34 | question 3's tables and amendment 2 committed, before amendment 2 ran | `974bc53e` |
| 17:55:27 | amendment 2's reader committed; run 17:55:27–17:55:58 | `2b690902` |
| 17:56:28 | amendment 2's tables committed | `7f8f5579` |

## 1. Controls (before any P_0 number)

| control | data | result |
| --- | --- | --- |
| P_two's identity | `buildPlant(…, {})` against `shippedPlant` (`body: true`), discrete Φ and Γ at every distinct kick point of both groups' sets (253) | largest \|Δ\| **0** (bit for bit) |
| P_two's held-out e | `results/final/heldout-q2.json`'s per-set `ship` and `shipL` | per set largest \|Δ\| **0**; medians **1.061 / 1.140 / 0.802** (Compress / tuck / tall), speed-following 0.987 / 1.073 / 0.754; the same 24 / 24 / 31 sets |
| P_control is the pre-3.4a plant | `plantAt` with `{ inertia: 0, feetRoll: false }` against `plantAt` without `body`, his other options, continuous A and B, at the 253 points | A **9.4 × 10⁻¹⁵**, B 0 (row-relative); 3.4a's own test passes (1 of 1, `results/test-34a.txt`) |
| P_two's closures | `results/final/q3-lti-c.json`'s per-set `shipSF` and `shipFr` (Prony f, ζ, damped-sinusoid f and ζ, envelope, both waveform errors) | per set largest \|Δ\| **0** on all 91 / 80 / 115 sets; pooled Compress frozen f **2.73**, ζ **0.730**; speed-following 2.27, 0.576 |
| question 3's synthetic control (as registered, amendment 1) | y = X b̄_kin on the picture's own regressors | ‖b̂ − b̄‖ / ‖b̄‖ ≤ 1.8 × 10⁻¹⁰ in every stance, picture and group |
| question 3's simulation | the 64-substep tick samples against the 1/60 s plant (`openFrozen`); R_N against both exact forms in continuous time | ≤ 1.1 × 10⁻¹² relative; the kinematic form ≤ 4.7 × 10⁻¹⁴, the ankle form ≤ 4.0 × 10⁻¹⁵ of the largest \|R_N\| |
| the twins read only | sha1 of the five twin files before (`36g/twins-sha1-before.txt`) and after the round | identical (§8) |

## 2. Question 1: the open twins

*Open sets passing over 1.0 s at ≥ 4 m/s (kick-tick schedule speed), Canyon Big seeds 1–3 (fitting: Compress 63, tuck
69, tall 59) and 4–5 (held-out: 24, 24, 31), his address, knobs off; 3.6e's frozen bins and σ; the eight mechanical
states over m = 1 … 60 (1.0 s at 60 Hz), per unit model-sign command; frozen at the kick tick's speed, depth and rail
(the registered metric), speed-following (SF) beside. Ratios are per set against P_two on the same set: median
[25–75 %], and the count of sets better than P_two. Full tables, per bin and per kick channel:
`results/open.md`.*

**The pictures against P_two, frozen (SF in brackets):**

| stance, seeds | P_two median e | P_0: e_0 / e_two [25–75 %], better | P_control: ratio, better | J × 0.25 | J × 0.5 | J × 2 |
| --- | --- | --- | --- | --- | --- | --- |
| Compress, fitting | 1.041 (1.009) | **1.107** [0.901, 1.300], 19 of 63 (1.128) | 1.112, 19 (1.121) | 1.041 (1.062) | 1.022 (1.037) | 0.971, 38 (0.971) |
| Compress, held-out | 1.061 (0.987) | **1.241** [1.100, 1.366], 3 of 24 (1.140) | 1.251, 3 (1.145) | 1.143 (1.058) | 1.080 (1.034) | 0.927, 19 (0.958) |
| tuck, fitting | 1.069 (1.057) | 0.915 [0.723, 1.127], 40 of 69 (0.940) | 0.907, 40 (0.917) | 0.979 (0.974) | 0.994 (1.001) | 0.958, 46 (0.961) |
| tuck, held-out | 1.140 (1.073) | 0.983 [0.809, 1.091], 12 of 24 (0.759) | 0.978, 12 (0.739) | 1.023 (0.887) | 1.028 (0.961) | 0.935, 18 (0.977) |
| tall, fitting | 0.787 (0.792) | **1.353** [1.010, 1.678], 15 of 59 (1.370) | 1.393, 14 (1.421) | 1.088 (1.103) | 1.023 (1.036) | 1.031, 19 (1.030) |
| tall, held-out | 0.802 (0.754) | **1.529** [1.307, 1.756], 3 of 31 (1.480) | 1.567, 3 (1.506) | 1.197 (1.166) | 1.065 (1.055) | 1.017, 14 (1.033) |

**Per row, P_0 / P_two** (median of the per-set row-error ratios, frozen; fitting / held-out). The rows' own errors are in
`results/open.md`.

| stance | roll φ | bank θ | yaw rate Ω | slip β | twist θ_t | the senses' waveform |
| --- | --- | --- | --- | --- | --- | --- |
| Compress | 0.983 / 1.226 | 0.985 / 1.267 | 1.204 / 1.366 | 1.266 / 1.201 | 1.139 / 1.167 | 1.147 / 1.205 |
| tuck | 0.783 / 0.916 | 0.768 / 0.880 | 1.014 / 1.018 | 1.090 / 1.090 | 0.961 / 0.976 | 0.944 / 0.990 |
| tall | **1.424 / 1.582** | **1.398 / 1.511** | **1.481 / 1.639** | 0.931 / 0.892 | **1.549 / 1.707** | 1.590 / 1.687 |

By speed bin (Compress, P_0 / P_two frozen): fitting 1.220 / 1.092 / 1.057 at medians 6.0 / 9.3 / 10.5 m/s; held-out
1.286 / 1.339 / 0.955 at 7.4 / 9.4 / 10.3 m/s. By kick channel (Compress): ankle kicks 1.021 / 1.131, twist kicks
1.243 / 1.338 (fitting / held-out). P_control against P_0: within 5 % on every open median (largest 4.7 %; the feet's
roll coupling is not what the twins separate).

**Read by the registered lines (§0.5):**
- **Compress: "the twins follow J"** — median e_0 / e_two ≥ 1.0 on both groups (1.107, 1.241); J = 0 better on 19 of 63
  and 3 of 24 sets. Tall the same (1.353, 1.529). The tuck: **"J does not decide"** (0.915, 0.983).
- **Per row:** no Compress row passes either line (the largest, Ω 1.204 / 1.366 and β 1.266 / 1.201, miss 1.25 on one
  group each); every Compress row moves the same way on the held-out seeds (1.17–1.37). Tall: φ, θ, Ω and θ_t
  **favour J** (1.40–1.71); β neutral (0.93 / 0.89). The tuck: every row neutral (θ 0.77 / 0.88 the nearest to J = 0).
- **The sweep's best value (exploratory):** Compress **J × 2** on both groups (0.971 / 0.927), the sweep's top end, and
  monotone over the five values; tall J × 1 (J × 2 1.031 / 1.017); the tuck J × 0 on the fitting seeds, J × 2 held out.
  Never 0.25 or 0.5 on both groups: not "between".
- **The speed-following variant** reads the same in Compress and tall; it moves the tuck's held-out P_0 to 0.759 (17 of
  24 better), the one place J = 0 looks better, on one seed group.

## 3. Question 2: the closed twins

*Closed sets passing over 1.5 s at ≥ 4 m/s, both groups pooled (Compress 91, tuck 80, tall 115; by group in
`results/closed.md`, which read the same); a unit kick at m = 0, 90 ticks; the shipped design unchanged; read-outs on Ω,
m = 1 … 90. Speed-following (primary) shown; frozen in the file.*

| stance: closure (speed-following) | Prony f | f − f_twin, paired | waveform Ω | Prony ζ | envelope | reproduces | rings as the game |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Compress: the closed twins** | 2.54 | | | 0.033 | 0.91 | | |
| P_two | 2.27 | −0.26 | 0.98 | 0.576 | 0.13 | no | no |
| **P_0** | 2.02 | **−0.53** | **1.30** | **0.040** | **0.76** | no | **yes** |
| P_control | 2.04 | −0.50 | 1.42 | 0.015 | 0.95 | no | yes |
| J × 0.25 / 0.5 / 2 | 1.83 / 1.65 / 2.91 | −0.74 / −0.80 / +0.39 | 1.06 / 1.01 / 0.97 | 0.166 / 0.327 / 0.446 | 0.23 / 0.05 / 0.17 | no | no |
| **tuck: the closed twins** | 2.73 | | | 0.054 | 0.72 | | |
| P_two | 2.90 | +0.20 | 0.99 | 0.587 | 0.19 | no | no |
| P_0 | 2.18 | −0.51 | 1.11 | 0.120 | 0.35 | no | no |
| P_control | 2.21 | −0.48 | 1.14 | 0.096 | 0.43 | no | no |
| J × 0.25 / 0.5 / 2 | 1.92 / 1.73 / 2.74 | −0.74 / −0.92 / +0.11 | 1.05 / 1.02 / 0.97 | 0.218 / 0.335 / 0.511 | 0.13 / 0.04 / 0.16 | no | no |
| **tall: the closed twins** | 2.24 | | | 0.057 | 0.76 | | |
| P_two | 2.30 | +0.09 | 0.95 | 0.597 | 0.13 | no | no |
| P_0 | 1.88 | −0.36 | 1.37 | 0.038 | 0.80 | no | yes |
| P_control | 1.89 | −0.34 | 1.51 | 0.009 | 1.03 | no | yes |
| J × 0.25 / 0.5 / 2 | 1.73 / 1.60 / 3.07 | −0.51 / −0.60 / +0.86 | 1.02 / 0.99 / 0.94 | 0.184 / 0.366 / 0.446 | 0.20 / 0.04 / 0.15 | no | no |

- **Nothing reproduces** (3.6e's line), in any stance, frozen or speed-following.
- **P_0 and P_control ring as the game does in Compress and tall** — ζ 0.040 and 0.015 against the twins' 0.033 in
  Compress, envelope 0.76 and 0.95 against 0.91 — where P_two decays (ζ 0.58, envelope 0.13). But they ring **0.5 Hz
  low** (2.02 against 2.54 Hz in Compress; 1.88 against 2.24 tall) and **out of phase**: the waveform error on Ω is
  1.30–1.51, worse than predicting no response at all (1.0). Tall's P_control is at the edge of decaying (envelope 1.03).
  The tuck's P_0 decays at ζ 0.12. Frozen reads the same (Compress P_0: 2.03 Hz, ζ 0.048, envelope 0.68).
- **No J in the sweep gives both the twins' frequency and their damping**: the frequency runs 2.02 → 1.83 → 1.65 → 2.27 →
  2.91 Hz over J × 0 … 2 (the read frequency jumps between × 0.5 and × 1) while ζ runs 0.04 → 0.17 → 0.33 → 0.58 → 0.45.
  The light ring comes only with J ≈ 0, the right frequency only near J × 1–1.5.

## 4. Question 3: the method's like-for-like control

*The fitting seeds' open sets passing over 1.0 s at ≥ 4 m/s; the picture's own open twins at each kick point (frozen),
64 substeps per tick; R_N = I_z,b ṙ − (N_φ φ + N_β β + N_r r + N_p φ̇) as frame means; 3.6e's 14 rider regressors and
weights, OLS, cluster-robust errors by set; pooled ≥ 4 m/s shown (bins in `results/regctl.md`); model signs; per r in
N·m per rad/s, per ṙ in kg·m², per φ and δ in N·m per rad.*

| stance, picture | R², κ | per r: OLS / b_kin / b_ank | per β̇: OLS / b_kin | per ṙ: OLS / b_kin / b_ank | per φ: OLS / b_ank | per δ: OLS / b_ank | line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compress, P_two | 0.998, 80 | **+1.7 ± 1.0** / +154.7 / −3.0 | −2.8 / +157.7 | **−1.67** / −5.59 / −1.24 | 417 / 521 | 384 / 521 | **ankle form** |
| Compress, P_0 | 0.999, 120 | **−2.0 ± 0.5** / +154.7 / −3.0 | −2.1 / +157.7 | −1.19 / −5.59 / −1.24 | 501 / 521 | 498 / 521 | **ankle form** |
| tuck, P_two | 0.999, 85 | +8.7 ± 1.7 / +158.2 / −3.0 | +2.3 / +161.2 | −1.62 / −5.21 / −0.86 | 409 / 652 | 345 / 652 | neither (φ, δ at 53–63 % of the ankle's) |
| tuck, P_0 | 1.000, 140 | +2.1 ± 0.6 / +158.2 / −3.0 | −0.4 / +161.2 | −1.11 / −5.21 / −0.86 | 553 / 652 | 527 / 652 | ankle form |
| tall, P_two | 0.999, 68 | −2.0 ± 1.8 / +168.3 / −3.0 | +1.0 / +171.3 | −1.56 / −5.72 / −1.37 | 378 / 398 | 368 / 398 | ankle form |
| tall, P_0 | 0.999, 76 | −5.9 ± 0.9 / +168.3 / −3.0 | −4.1 / +171.3 | −1.39 / −5.72 / −1.37 | 407 / 398 | 401 / 398 | ankle form |
| *the game (3.6e §1, Compress, bins 1 / 2 / 3)* | | *+4 / +10 / +10* | *−1.0 / −0.6 / +0.4* | *−1.08 / −1.28 / −1.31* | *unread* | *+75 / +92 / +130* | |

1. **On the picture's own twins, where R_N is exactly the kinematic form (to 5 × 10⁻¹⁴ in continuous time), 3.6e's
   regression does not return it**: per r −6 … +9 against +155 … +168 (≤ 5.5 %), per β̇ ≈ 0 against +158 … +171, per ṙ
   −1.1 … −1.7 against −5.2 … −5.7. It returns **the ankle's form** in 5 of 6 pooled cases (the sixth, the tuck's P_two,
   has the ankle form's per r and per ṙ but its φ and δ at 53–63 %), for P_two and P_0 alike. This is the game's own
   pattern (+4 … +10 per r, ≈ 0 per β̇, −1.1 … −1.3 per ṙ): the 0–9 % 3.6e read on the game is what the method returns
   from the picture itself. It carries no evidence about J, or about the lever.
2. **Why** (amendment 1's exploratory reading): with each set's term built **exactly** as its own kinematic form,
   noise-free, the pooled regression still returns the ankle form (Compress P_two: per r +0.8, per ṙ −1.50, per φ 440;
   R² 0.997). The kinematic coefficients carry the speed (m V x_f per r and per β̇), the ankle form's do not; the
   regressors are close to collinear (VIF up to 5 × 10⁴: in continuous time the four accelerations are functions of the
   ten states), so least squares over sets at 6–11 m/s takes the representation whose coefficients are the same at
   every speed. Both forms fit the frame means to a few per cent (kinematic 1.2–4.9 %, ankle 1.4–7.0 % relative
   residual); the regression's choice between them is not a measurement.
3. My prediction 5 held on the coefficients; the κ part did not (scaled κ 68–650, under 1e3: the near-collinearity is
   in the VIFs, 536–53,017, not in κ).

## 5. Amendment 2 (exploratory): J with 3.6e's fitted water

*3.6e's frozen fit (a), its bin's twelve water scales, with J × 1 (W_two) and J × 0 (W_0); `results/amend2.md`. The
fitting group is in-sample for the water.*

- **W_two**, (a)'s water with J sourced, open: median e 0.495 / 0.608 (Compress fitting / held-out), as 3.6e's (a);
  **closed with the shipped design it comes near the twins in Compress**: Prony f 2.44 Hz (Δf −0.04), ζ 0.081,
  envelope 0.60 (it meets the registered "rings" line), though its waveform error on Ω is 0.95, so it does not reproduce
  (speed-following, 91 sets); the tuck Δf +0.07, ζ 0.092; tall
  Δf −0.27, ζ 0.100.
- **W_0**, the same water without J: **the responses grow** — open median e 9.2–1,252 (every set worse than W_two), and
  the closed loops grow (Prony ζ −0.23 to −0.42, envelope 95–860 in every stance). The registered "rings" line
  (ζ ≤ 0.10, envelope ≥ 0.5) is met only vacuously by a growing loop; I read W_0 as **not** ringing as the game.
- So the fitted water is not separable from J: (a) was fitted with J in the plant and relies on it to stay bounded. My
  prediction for this amendment failed (I expected W_0 neutral or better).

## 6. The verdict (question 4), with sizes

| | answer | the numbers (median per-set ratio to P_two, fitting / held-out, frozen; Compress unless said) |
| --- | --- | --- |
| **which body the open twins follow** | **J** (sourced or more), not J = 0, in Compress and tall; the tuck undecided | P_0 1.107 / 1.241 (19 of 63, 3 of 24 better); tall 1.353 / 1.529; tuck 0.915 / 0.983. P_control within 5 % of P_0 |
| the sweep (exploratory) | monotone in Compress, best at its top end, **J × 2** | 1.107 → 1.041 → 1.022 → 1 → 0.971 (fitting), 1.241 → 1.143 → 1.080 → 1 → 0.927 (held-out); tall's best J × 1 |
| **on which rows** | no row of Compress is better without J; the yaw rate and the slip lose most | Ω 1.204 / 1.366, β 1.266 / 1.201, φ 0.983 / 1.226, θ 0.985 / 1.267, θ_t 1.139 / 1.167; tall φ, θ, Ω, θ_t 1.40–1.71 |
| **how much of the open gap** | removing J **opens** it; doubling J closes a little | e_two − e_0 = −0.27 (median of per-set differences; −0.29 as a difference of medians), held-out; J × 2: +0.08 (+0.06), **13–17 %** of 3.6e's fit (c)'s 1.061 − 0.587 = 0.474 |
| **the closed ring** | J = 0 gives the game's light damping, at the wrong frequency and phase | P_0 ζ 0.040, envelope 0.76 (twins 0.033, 0.91; P_two 0.576, 0.13), but Δf −0.53 Hz and waveform error 1.30; nothing reproduces; no J gives both |
| **3.6e's term table (question 3)** | the method returns the ankle's form from the picture's own twins | per r +1.7 (P_two) and −2.0 (P_0) against +154.7 analytic, as the game's +4 … +10 |
| **what is left** | the water's terms, and how they and J share the work | 3.6e's (a) (water alone) reaches 0.543 of the shipped held-out e; (a) closes near the twins with J (Δf −0.04, ζ 0.081) and grows without it |

**So:** the kicked twins do not say the game's board follows a J-less body. With the shipped water, every reading of the
open responses in Compress and tall is worse without J, by 11–53 % in the median, and best with J at or above its
sourced size; the yaw rate and the slip rows lose most. 3.6f's side-push difference (the game's board turns 3–5 times
as far under a side push) is real at the substep, but over the 1.0 s of a kicked response the picture with J follows
the board better. The one reading that favours J = 0 is the closed ring's damping: without J the shipped design rings
as lightly as the game does, but 0.5 Hz low and out of phase, so it is not the game's ring. And the method 3.6e used to
read the rider's yaw term returns the same "missing lever" from the picture's own twins, so that reading says nothing
about J. What remains is the water: 3.6e's water fit with J kept is the nearest to the twins both open and closed.

**My predictions** (§0.7): 1 failed (Compress and tall are "the twins follow J", not "J does not decide"; P_control
within 3 % of P_0 failed narrowly, 4.7 %); 2 failed (J = 0 hurts Ω and β, not helps; θ hurt only on the held-out seeds); 3 failed (the
optimum is at the sweep's top end in Compress, not interior); 4 failed for Compress and tall (P_0 and P_control do ring
lightly; their frequency does not match) and held for the tuck (ζ 0.10–0.12); 5 held on the coefficients, not on κ.

## 7. For Vicente

The balance's picture of the board gives your rider's body its own weight distribution: a body that resists being tipped
sideways, like a person rather than a weight on a stick. The game's own rider is closer to a weight on a stick, and the
last round found that this makes the game's board turn more easily when the body pushes sideways. So the question was:
should the picture drop that "person-like" resistance to match the game?

The recorded nudges say **no**. When I take the resistance out of the picture, it predicts how the board answers a nudge
worse, not better — about 10–25 % worse in Compress and 35–50 % worse standing tall; in the tuck it is a wash. The
board's turning and sliding are the parts that get worse. Doubling the resistance helps a little in Compress (about
3–7 %).

There is one twist. Without the resistance, the balance's loop would wobble about as long as the game's does, where the
shipped picture calms quickly. But it wobbles at the wrong speed (two wobbles a second instead of two and a half) and
in the wrong rhythm, so that is not a match either.

So the body's resistance is not the gap. The board's contact with the water is still the leading suspect. There is no
game change to try from this round.

## 8. The round's controls

| control | result |
| --- | --- |
| the full stability report, `npm run report:stability -- --mode full`, from 17:00:25 UTC at `e3449861` | PENDING |
| the Canyon byte check (`scripts/m1-cpu-bench.ts` bundled with rolldown, prelude `globalThis.location = { search: '?canyonWaves=true' };`, `--spot canyon --steps 3600`, a fresh state file); the bundle is byte-identical to 3.6f's past its first line | PENDING |
| `npx tsc -b` (17:53:29) | exit 0 |
| the gain lock, `npx vitest run src/physics/stabilityGains` | **5 of 5** |
| `git diff fc466712 --stat -- src scripts` | **empty** (`src` and `scripts` unchanged; the quick report is not needed) |
| the twins read only | PENDING |

## 9. What I could not settle

- **Why the picture without J rings lightly with the shipped design.** It is a property of the loop with a mismatched
  design, not of the board alone; I did not trace which of the loop's modes it is, or why its frequency falls 0.5 Hz.
- **Where the open optimum in J lies above × 2** in Compress. The brief kept the sweep to five values, so I did not
  extend it; J × 2's gain is small (3–7 %), and the frequency of the closed ring overshoots at × 2 (+0.39 Hz).
- **Whether J and the water can be told apart.** Amendment 2 shows that 3.6e's fitted water depends on J being there;
  3.6e's joint fit (c) ran J to 0 in two of three Compress bins with the water free. A joint fit of the water with J held
  at 0, then tested on the held-out seeds, would answer it. That needs a fit (3.6e's machinery), which is beyond this
  round.
- **The tuck**, where J = 0 is neutral frozen and better speed-following on the held-out seeds (0.759, 17 of 24); one
  seed group only.
- **3.6f's C4b** (why the measured regressors do not rebuild the body's sideways acceleration): question 3 shows that
  even the picture's exact regressors do not lead least squares to the kinematic form. So C4b's failure need not be
  a measurement problem.

## 10. Where everything is, and how to recompute it

- **The scripts** (this folder; bundle with `./node_modules/.bin/rolldown <file> --file <out>.mjs --format esm
  --platform node`, then prepend `globalThis.location = { search: '' };`):
  - `inertiaLib.ts`: the pictures, the open responses (frozen and speed-following) and the closure read-outs;
  - `controls.ts <fitting dir> <held-out dir> <board-fit/results/fit> <board-fit/results/final> <out.json>`;
  - `open.ts <fitting dir> <held-out dir> <board-fit/results/fit> <out prefix>` (question 1);
  - `closed.ts <fitting dir> <held-out dir> <out prefix>` (question 2);
  - `regctl.ts <fitting dir> <board-fit/results/fit> <out prefix>` (question 3, with amendment 1);
  - `amend2.ts <fitting dir> <held-out dir> <board-fit/results/fit> <out prefix>` (amendment 2).
  The fitting dir is `scratchpad/36d/twins/`, the held-out dir `scratchpad/36e/heldout/`; both are archived in
  `../board-fit/runs/` (`fitting.tar.gz`, `heldout.tar.gz`).
- **The results** (`results/`): `controls.json`, `controls.txt`, `test-34a.txt`, `open.md` and `.json`, `closed.md` and
  `.json`, `regctl.md` and `.json` (the rerun), `regctl-first-read.md` (the first read, before amendment 1),
  `amend2.md` and `.json`, `report-full.txt`, `byte-check.txt`, `readonly-check.txt`.
- **Raw scratch** (session scratchpad, `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36g/`):
  `bin/` (the bundles), `out/` (every output and log, `status.txt`), `rep/full/` (the full report's rides), `byte/` (the
  byte check), `twins-sha1-before.txt`.
