# 3.6e: fitting the balance's picture of the board to the measured board, tested on nudges it has not seen

*Surfer-track builder, Claude Opus 5.5, xhigh effort, 2026-11-26. Branch `claude/board-fit`, from `claude/board-response`
`4a50e650` (3.6d, reviewed). The brief is `BRIEF.md` in this folder, verbatim (sha1 `94e987b4…`). Diagnosis only: docs,
probes, scripts and fits, no arm, no change to the game. His address throughout:
`?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.*

## 0. Pre-registration (written and committed before any run of this round and before any held-out row exists)

**What I had read when writing this.** The brief; 3.6d's write-up (`../response/README.md`, all of it), the head of its
`BRIEF.md`, its readers (`responseLib.ts`, `analyse.ts` through the closings, `known.ts`, `response.ts`), its probe
(`response-probe.ts`: the twin, tick, frame and row code, and the main loop's order of tick, step and frame record),
`run.py`, `slim.py`, and the heads of its `results/response.md` and `results/shapes.md` (published tables); 3.6a part 2's
write-up (`origin/claude/slow-board`, all of it); the consult log on `claude/the-record` from the 3.6d dispatch
(`ae22e9bb`) through this round's dispatch (`4144ff19`); and the code: `predictiveBalance.ts` (`senseMatrix`,
`continuousPlant`, `PLANT_SPEEDS`, `RAIL_PLANT`, `railCorrection`, `STANCE_TABLE`, `STANCE_TUCK`, `BOARD_INERTIA`,
`boardInertiaAt`, `bodyInertiaAt`, `stanceAt`, `labAt`, `plantAt`, `DEFAULT_WEIGHTS`, `design`, `closedLoop`,
`leastDamping`, `scheduledDesign`, `PredictiveController` `blend` and `tick`), `rollModel.ts` (`YawPlant`, `RiderBody`,
`lateralMass`, `twoBody`, `yawRows`, `TwistPlant`, `twistRows`, `boardDerivatives`), `BoardBody.ts` (the yaw and roll
ledgers' definitions and their close in `step`) and `AttachedRider.ts` (`coupleYaw`). **No row of 3.6d's raw twin runs
has been opened by me, and no held-out run exists.** The only bytes I have produced are the probe's bundle, rebuilt from
this worktree: sha1 `b91bb540…`, identical to the bundle every 3.6d run used.

### 0.1 Frames, signs, data (3.6d's, unchanged)

- *The model's signs*, state x = [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a] and commands u = [u_a, u_t], as `predictiveBalance.ts`.
  The game's signals map to it as 3.6d §0.5: φ = y0 − y5, φ̇ = y1 − y6, θ = y0, θ̇ = y1, r = y2 − y4, θ_t = y3, ω_u = y2,
  β the logged β, δ = −`ankleRest`, τ_a = −`twistBody.active`; Ω is the board's world-up yaw rate (+ nose to its left) and
  p its roll rate about its own long axis (= +φ̇, 3.6d §2.3 and the review's sign note).
- *A twin set* is one base ride × mode × channel × kick time with its three sizes; its per-unit response g[m] (m = 0 … 90
  ticks after the kick tick) is 3.6d's ℓ / κ, built by **3.6d's own `group()`**, unchanged, which also applies 3.6d's
  registered checks (complete, bit-for-bit before the kick, held difference δ, no clamp, standing, linearity
  e_sym ≤ 0.05 and e₂ ≤ 0.10). *Open sets for fitting* are those passing over 1.0 s (`pass60`); *closed sets* and
  open sets feeding a closure those passing over 1.5 s (`pass90`), as 3.6d registered.
- *Speed* is the schedule speed at the kick tick (`kbase` `args.speed`, the board's forward speed through the water);
  depth and rail the same tick's arguments. **Sets whose kick-tick speed is below 4 m/s (the schedule's lowest knot) are
  excluded from every fit, prediction and decision**, and counted.
- *The fitting set*: 3.6d's raw twin runs, `scratchpad/36d/twins/big_s{1,2,3}.jsonl` (read-only). *The held-out set*:
  fresh twin runs on Canyon Big seeds 4 and 5 (§0.5).
- *Frame alignment* (checked at run time, before any regression is read): the probe tags a tick with the frame whose
  step it falls in, at that step's first substep, and the ledger row of frame f is the mean over that step, so ledger
  frame m spans ticks m to m + 1. Check: the frame-end yaw rate `OmE` at frame m against the tick yaw rate `Om` at
  tick m + 1, largest difference printed; and the ledger's `yTot` against the board's own yaw inertia times
  (OmE[m] − OmE[m − 1]) × 60, giving the own inertia the bookkeeping below uses (expected 0.449 kg·m² yaw; 0.026 roll,
  `BOARD_INERTIA`'s comment).

### 0.2 Question 1: the term-level comparison (no fit across terms)

**Data.** Per stance, the open sets passing over 1.0 s, both channels pooled, with kick speed ≥ 4 m/s, grouped into
the speed bins of §0.3 (and one pool of all speeds ≥ 4, reported). For each set, the frames m = 0 … 59 after the kick.
The ledger terms' twin differences per unit model-sign command are built as g is: (e₊ − e₋) / (2κ) from the raw `kick`
rows' `e` arrays. **Model signs:** a yaw-ledger term N = −e_y (the ledger's + is nose to the board's left, the model's r
is + nose right); a roll-ledger term K = +e_q (the ledger's + about the board's +z lifts its +x, left, rail: the model's
+φ).

**Regressors** (per unit command, at the frame's mean): x̄[m] = (x[m] + x[m + 1]) / 2 for the states; rates' derivatives
(x[m + 1] − x[m]) × 60. For the yaw ledger the board's own rate r_b = −Ω and ṙ_b; for the roll ledger the board's own
roll rate p and ṗ; φ = y0 − y5 and β as logged.
- **Each water term** (buoyancy, pressure, addedMass, radiation, friction, bed, fins, rails, froth, suction) and **their
  sum**, in yaw and in roll, on [φ, β, r_b, φ̇ (= p), and the accelerations φ̈ (= ṗ), ṙ_b, β̇] (7 regressors, no
  intercept: every difference is zero before the kick).
- **The rider's term** (the ledger's residual `rider`), in yaw and in roll, on [φ, φ̇, θ, θ̇, r_b, β, θ_t, ω_u, δ, τ_a,
  φ̈, θ̈, ṙ_b, β̇] (14 regressors).
- **The gyro term** reported beside (the model has none).
- **Weighting:** each set's rows are divided by the RMS over its 60 frames of its own φ̇ response, so that ankle sets
  (per rad) and twist sets (per N·m) weigh alike. Ordinary least squares on the stacked rows.

**The bookkeeping (what the model carries as inertia and what as derivatives).** The ledger's `total` is the board's
*own* inertia times its change of rate (0.449 yaw, 0.026 roll, as checked above); the model's board inertias
(`BOARD_INERTIA`, by speed) are its own plus the water's implicit share. So, in the ledger's frame:
- **Water, yaw**, the model's prediction: N = N_φ φ + N_β β + N_r r + N_p φ̇ − (I_z,eff − I_z,own) ṙ, with N_* =
  `plantAt`'s `heelYaw`, `slipYaw`, `yawDamping`, `rollRateYaw` (the lab table plus the rail's correction, moved to the
  board's centre of mass by `boardDerivatives`) and I_z,eff = `boardYawInertia`.
- **Water, roll**: K = K_φ φ + K_β β + K_r r + K_p φ̇ − (I_x,eff − I_x,own) φ̈ (`heelRoll`, `slipRoll`, `yawRoll`,
  `rollDamping`; I_x,eff = `boardRollInertia`). The model has no water term on β̇ or the other acceleration (0).
- **The rider's coupling**, the model's (the two-body solve, `twoBody`, `feetRoll` on): with the ankle's torque
  τ = k (θ − φ − δ) + c (θ̇ − φ̇) (k 800, c 80) and the body's lateral force on the board H = m [V (β̇ + r) + z_d φ̈ +
  x_f ṙ + h θ̈] (m 73, z_d 0.031, x_f −0.244, h the stance's),
  - roll: R_K = τ − z_d H;
  - yaw: R_N = −I_r ṙ − x_f H − (F_x / (m g)) τ + k_t θ_t + c_t (ω_u − r) + τ_a (I_r the stance's `lower`, F_x
    `feetForward`, k_t 20, c_t 3).
- The comparison table gives, per term, bin and state, the game's coefficient (with its standard error) against the
  model's at the bin's sets' own speeds, depths and rails (the mean over the bin's sets).

**Conditioning**, per regression: the condition number of the column-scaled regressor matrix (each column unit RMS)
and each regressor's variance inflation factor. A coefficient is *read* only where its VIF ≤ 30 and the scaled κ ≤ 1e3;
otherwise it is printed and marked unread.

**The synthetic control** (before any game coefficient is read): on the same stacked regressors of every bin, synthetic
ledger terms y = X b with b the model's own coefficients above; the regression must return b to a relative error
≤ 1e−8 (noise-free), and with white noise of 10 % of y's RMS added, return each coefficient within 3 of its reported
standard errors in ≥ 90 % of coefficients (reported).

### 0.3 Question 2: the grey-box fit, by output error on the open twins

**The parameters**, multipliers on `plantAt`'s own quantities at the set's speed, depth and rail, his options
(`body: true`, `plantFloor: 6`, `stanceDeep: true`); nested:
- **(a)** the twelve water scales, `plantAt`'s `scales` (multipliers on the lab table plus the rail's correction, in the
  lab's order [roll N, Y, K; slip N, Y, K; yaw-rate N, Y, K; roll-rate N, Y, K]);
- **(b)** (a) plus the board's roll and yaw inertia (`rollInertia`, `yawInertia` = `boardInertiaAt(v)` × multiplier);
- **(c)** (b) plus the body's frontal inertia (`body` = `bodyInertiaAt` × multiplier), the twist's stiffness and damping
  (`twistStiffness`, `twistDamping` × multipliers) and the yaw split: the rider's lower yaw inertia (`riderYawInertia`)
  and the twist rotor's (`TwistPlant.inertia`), one multiplier each, set on the objects `plantAt` returns (no `src`
  change).
- **(d), exploratory only, never selected:** (c) plus the pendulum's height h and the ankle's stiffness and damping
  (multipliers). Reported, to say what (c) lacks if it fails.
- The water scales are free reals; every other multiplier is fitted as its logarithm (kept positive).

**The model's response.** For a set at speed v, depth d, rail ρ: (A, B) = `continuousPlant(plantAt(v, d, …p))`,
discretised by `discretise` at 1/60 s; the open-loop response to a unit command on the set's channel is
G[m] = Φ^{m−1} Γ (m ≥ 1), the full state. Stage (i) is the model's exactly (3.6d), so this equals the model's mechanics
driven by the measured actuators.

**The objective.** Over the bin's open sets (both channels), m = 1 … 60, and the eight mechanical states
[φ, φ̇, θ, θ̇, r, β, θ_t, ω_u]: the residual (G[m]_o − g[m]_o) / σ_{o,ch}, with σ_{o,ch} the RMS of the measured
responses of state o on channel ch over the bin's sets and the 60 ticks (frozen with the fit). Levenberg–Marquardt,
central-difference Jacobian, from two starts: (1) every multiplier 1 (the shipped model); (2) for (a), the water's N
and K scales solved from question 1's water-sum derivatives where those regressions are read (§0.2; the Y scales at 1),
otherwise 1; (b), (c), (d) start from the previous set's fit and from 1. The fit with the lower cost is kept. Stop at a
relative cost change below 1e−10 or 200 iterations.

**Pooling: by speed bin, per stance.** The bins are the terciles of the kick-tick speeds of the stance's fitting sets
(open, passing over 1.0 s, ≥ 4 m/s, both channels), rounded to 0.1 m/s; the lowest bin runs from 4 m/s, the highest is
open above. A held-out set takes the bin its kick speed falls in. Per bin and nested set: one parameter vector. Beside
it, **per (base, kick time) fits** of set (a) with both channels (where both open sets pass) are reported against
their speed, descriptively.

**Uncertainty and conditioning**, per fit: the singular values of the scaled Jacobian at the solution (its condition
number and the parameters loading on the two smallest), and a set-block bootstrap (30 resamples of the bin's sets with
replacement, each refitted from the fit), its 5–95 % per parameter.

**The black-box ceiling** (reference, no decision), per bin and channel: (i) **the FIR**, the mean measured per-unit
response of the bin's fitting sets; (ii) **free mechanical rows**: the eight mechanical rows of Φ (10 columns each) by
one-step least squares on the bin's open responses (x[m + 1] on x[m], m = 1 … 59), with the model's Γ and lag rows,
simulated as G[m] = Φ^{m−1} Γ. Both scored on the held-out sets like the grey box.

**The known-plant control comes first** (`known.ts`'s pattern, before any game fit is read; it must pass before any
game fit counts):
- **The plant:** `plantAt` at Compress (depth 0.30, rail 0, his options) with **known perturbed multipliers**
  p* (§0.3a), as the true plant, discretised; **closed with the shipped `PredictiveController`** at his weights (whose
  model is the shipped one: the mismatch the game has), driven by `known.ts`'s AR(1) disturbance on the five rates;
  per bin centre v₀ ∈ {6.0, 8.5, 10.5} m/s, four rides at v₀ − 0.75, v₀ − 0.25, v₀ + 0.25, v₀ + 0.75 m/s, each with
  the 50 twins (the same kick and replay rules), made into `kick` and `kbase` rows and read through the same `group()`
  and **the same fit code** as the game.
- **It recovers** if, for each nested set (a), (b), (c), every fitted parameter is within **1 %** (relative) of p* and
  the fitted response's relative error is ≤ 1e−6; **and on the unperturbed plant** (p* = 1) every fitted parameter is
  within 1 % of 1 (**no gap**).
- **A parameter it cannot recover** (outside 1 % with the response matched) is unidentifiable from such data: it is
  then held at 1 in that nested set for the game, its known value set to 1 too, and the control rerun, which must pass.
  Each such holding is reported.
- **A time-varying variant** (reported, no pass line, if time allows): the same perturbed plant re-evaluated at each
  tick's speed along the speed profiles of the fitting set's own kick windows, fitted by the same LTI fit; the
  parameters' bias is the cost of the speed's change inside a window.

**§0.3a the known multipliers p\***: water scales [1.6, 0.7, 2.2, 0.5, 1.4, 0.8, 1.9, 0.6, 1.3, 0.75, 1.5, 2.5]; roll
inertia ×2.0, yaw ×0.8; body ×1.3, twist stiffness ×0.7, damping ×1.5, lower ×0.9, upper ×1.2 (for (d), h ×0.9, ankle
×1.2, ×0.8).

**The held-out prediction** (question 2's rule). For each held-out open set passing over 1.0 s with kick speed
≥ 4 m/s: e = ‖(G − g) / σ‖ / ‖g / σ‖ over the eight states and m = 1 … 60 (σ the bin's frozen scales), for the fitted
model (its bin's parameters at the set's own speed, depth and rail) and for **the shipped model** (`plantAt` at the
same point with every multiplier 1). **A fitted set predicts** if, in Compress, e_fit < e_shipped on **≥ 75 %** of the
held-out sets **and** the median of e_fit / e_shipped is **≤ 0.5**. Tall and the tuck are reported by the same rule.
Each of (a), (b), (c) is frozen and committed before the held-out read and scored once; **the selected set is the
smallest that predicts**; if none does, question 2's answer is no, and question 3 proceeds with the set of the lowest
held-out median ratio, labelled as having failed question 2. Reported beside: the same with the blended design A used
at the kick tick in place of the shipped `plantAt`; the senses' waveform error (raw units, y0–y6, 3.6d's `waveErr`);
the in-sample errors; the black-box ceiling's.

### 0.4 Question 3: the fitted model closed with the shipped design

**The closures** (per closed set passing over 1.5 s with kick speed ≥ 4 m/s, fitting and held-out seeds, each set's
plant its bin's fitted parameters):
- **speed-following (primary):** the fitted plant re-evaluated at each tick's own speed, depth and rail (A's `kbase`
  arguments, m = 0 … 90), the controller **the exact perturbation map** of the blended designs (3.6d's `perturbation`,
  A's own arguments per tick), the kick at m = 0, simulated in state space for 90 ticks;
- **frozen (secondary):** the plant at the kick tick's arguments and the perturbation map with its arguments frozen at
  the kick tick.
- References on the same sets: the shipped model through the same two closures; 3.6d's S0 (the measured open response
  closed) where both open sets pass over 1.5 s.

**The read-outs** on Ω's response (the model's −r) over m = 1 … 90: Prony's dominant mode in 1.5–5 Hz (3.6d amendment
2, `ring`): f, ζ, q₂; the damped sinusoid (`fitDamped`): f, ζ; and **the envelope ratio** q_env = max |Ω| over
[t₀ + 2T, t₀ + 3T) / max |Ω| over [t₀, t₀ + T), t₀ = 2 ticks, T = 1 / f of the series' own Prony mode (2.67 Hz if it has
none). The pooled peak of the sets' Ω power spectra (3.6d's `power`, `peakOf`). The waveform error ‖pred − twin‖ / ‖twin‖
on Ω and on the stacked senses.

**It reproduces** (per stance, Compress decides) if, for the primary closure: (1) the median over sets of the paired
difference f_pred − f_twin (Prony) is within **±0.15 Hz**; and (2) the median waveform error on Ω is **≤ 0.6**. The
pooled peaks' difference, the three decay read-outs and the frozen closure are reported and decide nothing (the brief:
not ζ's sign).

**The delay sweeps.** The fitted model closed (primary: speed-following; frozen reported) with the designs rebuilt for
4 and 8 ticks (`designDelay`, through `perturbation`'s options) and with the 6-tick design and the senses shifted ±2
(`senseShift`), on the closed sets above. **It predicts** if, per stance, the median Prony f of each closing is within
**±0.25 Hz** of the measured peak (3.6d §1: Compress 3.08 / 2.67 / 2.36 at 4 / 6 / 8, tuck 3.26 / 2.90 / 2.54, tall
2.90 / 2.31 / 2.11; 3.6c's `senseShift` −2 / +2: Compress 3.72 / 2.05, tuck 3.73 / 2.33, tall 4.26 / 1.93) and the
order is right (4 > 6 > 8; −2 > 0 > +2). The pooled peaks are reported beside.

### 0.5 The held-out runs

This round's probe is **3.6d's `response-probe.ts`, unchanged** (bundle sha1 `b91bb540…`, rebuilt from this worktree
and identical). Canyon Big seeds **4 and 5**, PERIODS 12, HOLD 5, his address, knobs off, `compress:straight`,
`none:straight` and `crouch:straight`, each with its 50 twins (`TWINS` the same three), one process per seed, into
`scratchpad/36e/heldout/big_s{4,5}.jsonl`. **Not opened** (no read of any byte of their rows) until the fits, the
scales σ, and every reader that touches them are committed; then read once by the frozen readers. I watch them only by
their processes' exit and the files' sizes. The time each file is first opened is reported.

### 0.6 Question 4 (only if question 3's primary closure reproduces in Compress; model-only)

At each bin's median speed and the stance's median depth, rail 0: `design` on the fitted plant with the shipped weights
(his options), closed on the fitted plant (`closedLoop`, 6 ticks; 5 and 7 reported): its least damping and frequency
(`leastDamping`); and the shipped design (`design` on the shipped `plantAt` at the same point) on the fitted plant, the
same. No game run; no change to any design, gain or bound.

### 0.7 Controls

- The known-plant recovery (§0.3) and question 1's synthetic control (§0.2), before any game result counts.
- The frame alignment and own-inertia checks (§0.1).
- `src` is not expected to change. Whether or not it does: the full stability report before review (`npm run
  report:stability -- --mode full`), its 227 ride lines against `baseline-full.json` and its 26 test-wave lines against
  `baseline-quick.json` (3.6c's `same.py`); the quick report too if `src` changes; the Canyon byte check (snapshots
  `a367d938f15fa934`, state `9e5831f80e38abd9`); `npx tsc -b`; the gain lock (`npx vitest run src/physics/stabilityGains`,
  5 of 5).

### 0.8 Predictions (made before any data)

1. **Q1:** the fins' yaw per roll rate and per roll (N_p, N_φ) are several times the model's and of the sign that
   turns the board at once (the ledger lead); the water's roll moment per roll is far smaller than the table's
   (3.6a part 2: −51 to +21 against −269 to −316); the rider's terms are the model's within 30 % on the ankle's spring
   and damper, and depart on the body's lateral force (H).
2. **Known plant:** (a) and (b) recover within 1 %; in (c) the twist's damping or the yaw split may be unidentifiable
   (they act through the same rotor) and be held.
3. **Q2:** (a) alone does not predict (the body's bank rises 2–3× as fast as the model's per unit of ankle, 3.6d's
   shapes: that is the body, not the water); (b) or (c) predicts in Compress with a median ratio near 0.4; the roll
   inertia's multiplier comes out below 1.
4. **Q3:** the fitted model closed with the shipped design rings at the twins' frequency within 0.15 Hz with ζ < 0.15;
   the waveform error is ≤ 0.6 speed-following and larger frozen; the sweeps predict within 0.25 Hz except possibly
   −2 ticks.

### 0.9 Guards

At most 8 game processes at once (14 cores): the two held-out runs, the full report's 4. Raw runs, bundles and fits in
`scratchpad/36e/`; the rows the tables need archived into `runs/` here (the held-out runs whole, with their ledgers,
and the fitting rows the fits read). Later changes to §0 go in as dated amendments, committed before the rows they
govern are read. I stop at a clean commit if the coordinator says so.

### 0.10 Amendments

1. *2026-11-26, about 12:50 UTC, after the first pass of `fit.ts` on the fitting set (question 1's tables and the
   in-sample fits of (a)–(d), all three stances) and before any byte of the held-out runs is read:*
   - **An order deviation, stated.** Question 1's synthetic control ran in the same pass as the game's regressions,
     and I read both together. Its noise-free line failed: largest relative error 2 × 10⁻⁷ (water) to 5 × 10⁻⁵ (the
     rider's yaw), against the registered 10⁻⁸. The cause is numerical: the normal equations were solved on unscaled
     columns (φ̈ and β differ by about 10⁴ in size). **Fix (numerics only, the estimator unchanged):** the normal
     equations are solved on unit-RMS columns and scaled back. The second pass reruns the control; question 1's
     coefficients are reported from that pass and only if the control passes there.
   - **Question 1's standard errors** are cluster-robust by set (the registration said "its standard error" and left
     the form open; the residuals are correlated within a set).
   - **The bootstrap** is one Gauss–Newton step per resample from the fit (3.6a part 2's), not a full refit, for time.
   - **A log multiplier that runs to its bound.** In the first pass the board's inertias (and in places the body's)
     ran to zero (their logarithms to about −700, their Jacobian columns exactly zero). Such a parameter is reported
     as *at its bound (0)*, and the scaled κ is taken over the others. Nothing about the fit changes.
   - **An exploratory set (e)**, never selected: (c) plus multipliers on the feet's station x_f (`feetStation`,
     −0.244 m) and the deck's height z_d (`deckHeight`, 0.031 m), free reals. Why: question 1's first pass puts the
     game's rider-yaw coefficients on r and β̇ at about −0.4 and +0.7 N·m per unit (Compress, all speeds), where the
     model's lateral-force lever −x_f m V gives +155 and +158; the feet's station is the term the table points at,
     and no registered set can move it. The known-plant control is extended to (e) (p* x_f × 0.6, z_d × 1.5) and
     must pass as the others.
   - Rules unchanged: the bins, the objective, the starts, the held-out rule and the selection among (a)–(c).
2. *2026-11-26, about 12:55 UTC, after the second pass and before any byte of the held-out runs is read:* **the
   synthetic control's "relative error" is the vector's, ‖b̂ − b‖ / ‖b‖.** Amendment 1's diagnosis was only part of
   it: the code took, per coefficient, |b̂ᵢ − bᵢ| / max(|bᵢ|, 10⁻⁹ max|b|), so a coefficient that is 0 in the model
   (the water's β̇, the rider's β) turned a rounding error of 10⁻¹³ into 10⁻⁴. The third pass prints the vector's
   relative error (the registered line) and, beside it, the largest per-coefficient relative error over the
   coefficients that are not 0. Every fit, every coefficient and every other number of the second pass is identical in
   the third (checked: the JSONs' `bins`, `edges`, `perPair` and question 1's coefficients equal). The frozen fits are
   the third pass's, committed with this amendment (`results/fit/`, sha1 `bb70d1b2…` Compress, `dc5183b0…` tuck,
   `e4a6260b…` tall), with the held-out reader (`heldout.ts`) and the closures (`closures.ts`).
   - **What I read of question 3 before the held-out set, stated.** To test `closures.ts`, I ran it on the fitting
     set's closed twins with set (c), chosen for the test only (`results/dev/closures-fitting-c-dev.md`). Question 3's
     rule, its read-outs and its sets are unchanged by it; the registered run uses the set question 2 selects on the
     held-out set, on the fitting and the held-out seeds pooled.
3. *2026-11-26, about 13:00 UTC, before any byte of the held-out runs is read and before the speed-following fits'
   outputs are read:* **a second, speed-following fit beside the registered one.**
   - **Why.** The registered time-varying known-plant variant (§0.3, `knownltv.ts`, run at 12:56 on the fitting set's
     own kick windows) shows that the registered LTI fit cannot recover a known plant whose speed changes along the
     window as the game's does: on the shipped model itself (every multiplier 1), re-evaluated at each tick's speed,
     depth and rail, the LTI fit leaves a relative residual of 0.17–0.35 and returns multipliers off by 50 % to ×11
     (the roll-rate roll moment ×5–11 in the lowest bins, the board's yaw inertia ×2–3 or at its bound). So the game
     fits' large multipliers and inertias at their bounds may be the time variation's, not the board's.
   - **The second fit** (`fit.ts --ltv`, `fitLib.ts` `FIT_MODE.ltv`): the same parameters, objective, bins, σ (the
     same sets give the same σ), nested sets and uncertainty, with the model's response following the set's own kick
     window: x[1] = Γ(v₀) e, x[m + 1] = Φ(v_m) x[m], v_m A's schedule speed at tick m, the depth and the rail held at
     the kick tick's, Φ and Γ interpolated linearly in the speed between discretisations at the multiples of
     0.25 m/s. Starts: (a) from 1 and from the registered fit's (a); each later set from the previous speed-following
     set and from the registered fit of the same set.
   - **Its known-plant control** (`knownltv.ts --ltv --held`): the shipped model and p* (restricted to each nested
     set) re-evaluated at each tick's speed along the same windows, the depth and the rail held as the fit holds them.
     Run first on Compress at 12:58 (bins 0 and 1, before this text): relative residual 2.4 × 10⁻⁴ – 1.4 × 10⁻³ (the
     interpolation), multipliers within 0.1–5.2 % (the board's yaw inertia the worst). **Its pass line, set after
     seeing that run and stated as such:** every multiplier within 5 % and the residual ≤ 2 × 10⁻³, in every bin of
     every stance; the registered LTI fit's own control (1 %) is unchanged and already passed.
   - **The held-out rule for the second fit** is the registered one (≥ 75 % of the held-out Compress sets better and
     the median ratio ≤ 0.5), against **the shipped model following the speed the same way** (like for like); against
     the registered shipped model (held at the kick tick) it is reported beside. Its selected set is the smallest of
     (a)–(c) that predicts.
   - **Precedence, so that nothing is chosen after the held-out read:** the registered LTI fit's answer to question 2
     is reported as registered. **Question 3's primary run uses the speed-following fit's selected set** (or, if none
     predicts, its set of the lowest held-out median ratio, labelled), because question 3's primary closure follows the
     speed and a plant fitted with the speed held would carry the bias above into it; the registered LTI fit's
     selected set is closed too and reported beside. Question 4 follows question 3's primary.
   - `heldout.ts` scores both fits in the same single read.

### 0.11 The order of the round (UTC, 2026-11-26)

| time | step |
| --- | --- |
| 2026-11-26 | Vicente approves the round: "Yes, start 3.6e" (relayed by the coordinator, consult log `4144ff19`) |
| (this commit) | the brief, verbatim, and this pre-registration, before any run |
