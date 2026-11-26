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
4. *2026-11-26, about 13:12 UTC, before any byte of the held-out runs is read and before the rerun's outputs are read:*
   **§0.3's holding rule applied to the speed-following fit.** Its known-plant control on all three stances
   (`results/known/ltv-held-*.json`): sets (a) and (b) pass in every bin (largest error 1.9 % and 1.1 %, residual
   ≤ 1.6 × 10⁻³), but in (c) the board's yaw inertia `Iz` misses the 5 % line in five bins (5.2–11.7 %; it trades
   with the rider's lower yaw inertia, the pair loading on (c)'s weakest direction). By §0.3's rule `Iz` is held at 1
   in the speed-following fit's (c), and so in (d) and (e) which contain (c); (b) keeps it. The control is rerun with
   `Iz` held (truth and fit), and must pass; the game's speed-following fits are rerun the same way (`--holdc Iz`),
   and those reruns are the speed-following fits that are frozen. I read the first speed-following fits' progress
   lines (their costs) before this, not their tables.

### 0.11 The order of the round (UTC, 2026-11-26)

| time | step |
| --- | --- |
| 2026-11-26 | Vicente approves the round: "Yes, start 3.6e" (relayed by the coordinator, consult log `4144ff19`) |
| 12:32 | the probe's bundle rebuilt from this worktree: sha1 `b91bb540…`, identical to 3.6d's (no run) |
| **12:34:41** | **the brief, verbatim, and this pre-registration** (`a4d17162`), before any run |
| 12:34:56 | the held-out twin runs start (Big seeds 4 and 5, `run.sh`, 3.6d's bundle) |
| 12:35:06 | the full stability report starts (knobs off, `src` untouched) |
| 12:38–12:42 | the known-plant control (LTI): smoke at 8.5 m/s, then all three centres: 15 of 15 pass |
| 12:42–12:44 | the first pass of `fit.ts` on the fitting set (question 1 with its synthetic control in the same pass; the fits (a)–(d)); read |
| 12:47 | the known-plant control for (e): 3 of 3 pass |
| **12:49:11** | **amendment 1** (`087462da`): the order deviation stated, numerics, cluster-robust se, the one-step bootstrap, bounds, set (e) |
| 12:48–12:51 | the second pass; the closures' development run on the fitting set, set (c) (`results/dev/`) |
| 12:51–12:54 | the third pass (the synthetic control's vector metric); fits identical to the second |
| **12:55:33** | **amendment 2 and the first freeze** (`d36e9416`): the frozen LTI fits, `heldout.ts`, `closures.ts` |
| 12:56 | the time-varying known-plant variant (registered, reported): the LTI fit defeated |
| 12:58–12:59 | the speed-following fit's known plant (Compress); the speed-following game fits launched (not read) |
| **13:11:04** | **amendment 3** (`39df8b51`): the speed-following fit, its control, its held-out rule, the precedence |
| 13:09–13:11 | the full report done (33.9 min): 227 of 227 and 26 of 26 identical |
| 13:11 | the speed-following control on all stances: (c) fails on `Iz` in five bins |
| **13:12:01** | **amendment 4** (`9e4297f1`): `Iz` held in the speed-following (c)–(e); control and fits rerun |
| 13:12–13:16 | `tsc` clean, the gain lock 5 of 5, the byte check identical; the held-`Iz` control: 9 of 9 bins pass |
| 13:18:39, 13:21:58 | the held-out runs exit 0 (2,623 s and 2,822 s) |
| 13:19–13:23 | the speed-following fits (`Iz` held) done; bins and σ checked equal to the registered fit's |
| **13:24:03** | **the second freeze** (`d36af85a`): the speed-following fits, the controls, question 1's write-up |
| **13:24:40** | **the held-out files first opened**, by the frozen `heldout.ts`: it crashed on its first set before printing or writing anything (the senses' waveform error indexed to 90 ticks on a 60-tick response) |
| 13:25:04 | the fix, on its own (`df0c07ec`) |
| **13:25:06** | **the held-out read** (`heldout.ts`, both fits, once): question 2 |
| 13:25:10–13:25:51 | question 3's closures (`closures.ts`, unchanged since the first freeze; set (c) of each fit, by the rule), fitting and held-out seeds |
| 13:26–13:30 | the archive (`runs/`), checked by rerunning the registered fit on the slim fitting rows; the write-up |

---

## 1. Question 1: the board's mechanics term by term, from the twins' ledgers

*Fitting set (3.6d's raw twin runs, Canyon Big seeds 1–3, his address, knobs off); the open sets passing over 1.0 s at
≥ 4 m/s (Compress 63, tuck 69, tall 59), both channels pooled, frames 0–59 after the kick tick (1.0 s, 60 Hz); per unit
model-sign command; model signs (N = −yaw ledger, K = +roll ledger; r_b = −Ω about the world's up, φ̇ = p about the
board's own long axis); least squares with cluster-robust (by set) standard errors. Every coefficient, its error, κ,
the VIFs and the model's value per bin and pooled are in `results/fit/fit-<stance>.md` (third pass). The model's value
is `plantAt`'s at each set's own kick-tick speed, depth and rail, averaged over the bin.*

**Controls.** The synthetic control (amendments 1–2): on the game's own regressors, y = X b with b the model's
coefficients is returned with ‖b̂ − b‖ / ‖b‖ ≤ 2.8 × 10⁻¹² in every bin and stance (largest error on a nonzero
coefficient ≤ 1 × 10⁻¹²); with 10 % white noise, 0.71–1.00 of the coefficients fall within 3 standard errors (1.00 in
33 of 48 cases; the shortfalls are in bins of 19–24 sets, where 20 clusters make the cluster-robust error small). The
frame alignment: the frame-end yaw rate against the next tick's, per unit, differs by at most 0.095 of a largest
|Ω| of 3.9 (Compress); the ledger's `total` against the change of the frame-end rate gives the board's own inertia
0.444 kg·m² in yaw and 0.025 in roll (medians over sets; the bookkeeping uses 0.449 and 0.026). The water's terms are
well conditioned (scaled κ 3.5–9.2, every VIF ≤ 18); the rider's term less so (κ 25–54), and its φ, φ̇, θ, θ̇
coefficients are unread (VIF 50–102: the ankle's θ − φ).

**The water's moments** (the sum of the ten water entries), Compress, by speed bin (median 6.0 / 9.3 / 10.5 m/s),
game against model:

| moment, per | game, bins 1 / 2 / 3 | model | read |
| --- | --- | --- | --- |
| roll, per roll φ (N·m/rad) | −149 ± 25 / −193 ± 26 / −290 ± 15 | −266 / −308 / −352 | the water rights the board at 56–82 % of the table |
| roll, per slip β | +4 ± 14 / −517 ± 149 / −414 ± 160 | −538 / −855 / −992 | 0 at the low speeds, 40–60 % above |
| roll, per yaw rate r | −10 ± 4 / +12 ± 8 / +20 ± 7 | +55 / +64 / +67 | a fifth to a third, the wrong sign at the low speeds |
| roll, per roll acceleration φ̈ (the water's roll inertia, kg·m²) | +0.06 ± 0.08 / −0.18 ± 0.04 / −0.28 ± 0.03 | −0.97 / −0.72 / −0.61 | **0 to 46 % of the model's: the board's roll inertia in the game is about 0.03–0.3 kg·m², the model's 0.63–1.0** |
| roll, per yaw acceleration ṙ | −0.94 ± 0.29 / −0.74 ± 0.26 / −0.89 ± 0.30 | 0 | a coupling the model lacks |
| yaw, per roll rate φ̇ | **+6.9 ± 1.3** / −1.8 ± 2.7 / −3.2 ± 2.6 | −6.8 / −11.5 / −13.6 | the wrong sign at the low speeds (the fins, +8.0 ± 0.8 pooled: the coordinator's lead) |
| yaw, per yaw rate r (the yaw damping) | −9 ± 1 / −40 ± 12 / −57 ± 10 | −49 / −77 / −91 | 18–63 % |
| yaw, per slip β | +3 ± 10 / +667 ± 171 / +870 ± 185 | +609 / +1231 / +1634 | 0 at the low speeds, 53–54 % above |
| yaw, per roll φ | −60 ± 9 / −8 ± 21 / +96 ± 17 | +7 / +32 / +49 | turns over with the speed |
| yaw, per yaw acceleration ṙ (the water's yaw inertia) | +1.00 ± 0.16 / +0.98 ± 0.16 / +0.80 ± 0.19 | −0.12 | **negative added inertia: the water lightens the board's yaw by about 0.9 kg·m²** |

The tuck reads the same way (roll per roll −128 / −140 / −231 against −255 / −300 / −357; the water's roll inertia
+0.08 / −0.14 / −0.25 against −0.89 / −0.72 / −0.60; yaw per roll rate +10.0 ± 1.5 in the low bin; yaw per ṙ
+0.5 to +0.8). Tall is the nearest to the model: roll per roll −405 / −289 / −365 against −263 / −312 / −374, roll per
slip −970 / −401 / −1071 against −664 / −943 / −1019, the water's roll inertia −0.16 / −0.45 / −0.60 against
−0.82 / −0.69 / −0.58.

**The rider's coupling** (the ledger's residual), Compress, the read coefficients:

| term, per | game, bins 1 / 2 / 3 | model | read |
| --- | --- | --- | --- |
| roll, per ankle rest δ (N·m/rad) | −686 ± 82 / −536 ± 49 / −519 ± 45 | −800 | the ankle's torque per rest at 65–86 % |
| roll, per slip rate β̇ | −3.0 ± 0.9 / −6.4 ± 2.7 / −0.8 ± 0.6 | −14 / −21 / −24 | the body's lateral push at the deck: 3–30 % |
| roll, per body bank acceleration θ̈ | −0.89 / −1.10 / −0.71 | −1.25 | 57–88 % |
| yaw, per twist θ_t, per upper-body rate ω_u, per twist torque τ_a | 17.8–23.8; 2.7–3.3; 0.91–1.03 | 20; 3; 1 | **the twist joint is the model's** |
| yaw, per yaw rate r | +4 ± 2 / +10 ± 6 / +10 ± 4 | +111 / +164 / +188 | **5–9 %** |
| yaw, per slip rate β̇ | −1.0 ± 0.8 / −0.6 ± 0.9 / +0.4 ± 0.7 | +114 / +167 / +191 | **0** |
| yaw, per yaw acceleration ṙ | −1.08 / −1.28 / −1.31 | −5.59 | 19–23 % |
| yaw, per body bank acceleration θ̈ | +0.23 / +0.16 / +0.17 | +9.8 | 2 % |
| yaw, per slip β | −3 ± 10 / −253 ± 77 / −274 ± 56 | 0 | a coupling the model lacks, above 8.7 m/s |
| yaw, per ankle rest δ | +75 / +92 / +130 | +176 / +160 / +164 | 43–79 % |

1. **The rider's yaw coupling through the feet is almost absent in the game.** The model's yaw row carries the body's
   lateral force H = m [V (β̇ + r) + z_d φ̈ + x_f ṙ + h θ̈] at the feet's station x_f = −0.244 m behind the board's centre
   of mass, which gives the board a yaw moment of 110–190 N·m per rad/s of yaw rate and per rad/s of slip rate, 9.8 N·m
   per rad/s² of the body's bank and 4.35 kg·m² of the 5.6 in its rider yaw inertia. In the game the same entries are
   0–9 % of the model’s in Compress (the tuck 0–14 %, tall 1–20 %). The twist joint, by contrast, is the
   model’s within 20 % (tall’s θ_t ×1.4–2.0). So the model's board is held in yaw by the rider's mass at a lever the game's
   board does not have, and the game's board turns more freely: this is the board's heading "answering the ankle at once"
   of 3.6d.
2. **The board is far lighter in roll than the model says.** The water's implicit roll inertia, which `BOARD_INERTIA`
   puts at 0.6–1.0 kg·m² (measured standing tall on a steady glide, 3.2e), is 0 to 0.28 in Compress and the tuck and
   0.16–0.60 tall. With the board's own 0.026, the deep stances' board rolls as a body of 0.03–0.3 kg·m², not 0.63–1.0.
3. **The water's derivatives are 20–80 % of the table's, two change sign, and two couplings are new.** The yaw moment
   per roll rate is +6.9 at 6 m/s in Compress (the fins), against the table's −6.8; the water lightens the board's yaw
   by about 0.9 kg·m² (+0.8 to +1.0 per ṙ); the yaw acceleration rolls the board (−0.7 to −0.9 per ṙ). At the low bin
   (4–8.7 m/s, median 6) the slip's moments are 0 in both axes, where the plant (read at the 6 m/s row, `plantFloor`)
   gives 540–610.
4. **My prediction 1** (§0.8): the fins' yaw per roll rate departs with the sign that turns the board at once — held
   (+6.9 against −6.8 at 6 m/s; +6.0 pooled); the water's roll per roll far below the table — partly (56–82 %, not
   3.6a part 2's near zero); the ankle's spring and damper within 30 % — held (65–86 %); the body's lateral force
   departs — held, and by far more than I guessed (0–9 % in yaw).

## 2. The known-plant controls (before any game fit counts)

| control | data | result |
| --- | --- | --- |
| **the registered LTI fit's** (`knownfit.ts`, `results/known/known-*.json`) | `plantAt` at Compress (0.30 m, rail 0) with p* as the true plant, closed with the shipped `PredictiveController`, AR(1) disturbance, A and its 50 twins on four rides at v₀ ± 0.25, ± 0.75 m/s, v₀ = 6.0, 8.5, 10.5; read through 3.6d's `group()` and this round's fit code; 32 open sets per centre | **18 of 18 pass** (unperturbed with (c)'s 19 parameters, and (a)–(e) at p*, at each centre): largest parameter error 7.8 × 10⁻¹¹ ((c), `Iz`, 6.0 m/s), largest response error 7.8 × 10⁻¹³; the multipliers at 1 build his plant bit for bit (largest \|ΔΦ\| 0) |
| **the time-varying variant, LTI fit** (`knownltv.ts`, registered as reported; `results/known/ltv-lti-*.json`) | the same plants re-evaluated at each tick's speed, depth and rail along the fitting set's own kick windows (Compress 63, tuck 69, tall 59), fitted by the LTI fit at the kick speed | **the LTI fit is defeated by the speed's change inside a window**: on the shipped model itself, relative residual 0.17–0.35 and multipliers off by 50 % to ×11 (the roll-rate roll moment ×10.3–11.6 in the lowest bin, the board's yaw inertia ×2.1–3.2, or to its bound tall); at p*, ×2–8 |
| **the speed-following fit's** (amendments 3–4; `results/known/ltv-held-*.json`, `ltv-held-holdIz-*.json`) | the same windows, the truth following the speed with the depth and rail held (as the fit does) | (a) and (b) pass in all nine bins (largest 1.9 % and 1.1 %, residual ≤ 1.6 × 10⁻³); (c) failed on `Iz` in five bins (5.2–11.7 %); **with `Iz` held at 1 (§0.3's rule), (c) passes in all nine (largest 0.8 %, residual ≤ 1.6 × 10⁻³)** |
| question 1's synthetic control | §1 | passes (‖b̂ − b‖ / ‖b‖ ≤ 2.8 × 10⁻¹²) |

My prediction 2 held in part: (a) and (b) recover; the unidentifiable one in (c) is the board's yaw inertia against the
rider's lower yaw inertia (the speed-following fit only), not the twist's damping.

## 3. Question 2: does a model fitted to the twins predict nudges it has not seen?

*The fits: per stance and speed bin (terciles of the fitting set's kick speeds: Compress [4, 8.7), [8.7, 10.1),
[10.1, ∞) m/s with 21 / 20 / 22 sets, medians 5.97 / 9.28 / 10.50; the tuck [4, 8.5), [8.5, 10), [10, ∞) with
24 / 23 / 22; tall [4, 9.2), [9.2, 10.4), [10.4, ∞) with 19 / 20 / 20), the eight mechanical states over 1.0 s, each
state and channel scaled by its own RMS. Every fit, its multipliers, bootstrap, singular values and in-sample errors:
`results/fit/` (registered, LTI) and `results/fit-ltv/` (speed-following); set (c)'s multipliers in
`results/final/fit-summary.md`. The held-out read: `results/final/heldout-q2.md` (Big seeds 4 and 5, read once at
13:25:06 UTC; §0.11).*

### 3.1 The fits on the fitting set (in-sample)

| stance | shipped e (median) | (a) / (b) / (c) e, LTI | ratio to shipped, (c) LTI, by bin | (c) speed-following, ratio to the shipped speed-following, by bin | the FIR (bin mean) e, by bin |
| --- | --- | --- | --- | --- | --- |
| Compress | 1.12 / 0.97 / 1.02 | 0.60 / 0.58 / 0.56; 0.51 / 0.51 / 0.50; 0.33 / 0.34 / 0.32 (by bin) | 0.49 / 0.59 / 0.30 | 0.51 / 0.47 / 0.29 | 0.75 / 0.52 / 0.34 |
| tuck | 1.23 / 1.02 / 1.03 | (c) 0.51 / 0.58 / 0.39 | 0.40 / 0.58 / 0.34 | 0.40 / 0.51 / 0.35 | 0.61 / 0.59 / 0.35 |
| tall | 0.88 / 0.75 / 0.73 | (c) 0.38 / 0.37 / 0.34 | 0.46 / 0.47 / 0.45 | 0.41 / 0.51 / 0.51 | 0.45 / 0.36 / 0.37 |

- **The fitted multipliers are not physical constants.** In Compress the water's per-slip and per-roll-rate scales
  run to ×10–36 above 8.7 m/s, the board's roll inertia ×1–54, and in every stance some inertia runs to its bound
  (0): the board's yaw inertia, the body's frontal inertia or the rider's lower yaw inertia, by bin; the
  speed-following fit's middle Compress bin puts the slip's three scales at ±10⁶ (κ 1.1 × 10⁴). The bootstrap ranges
  are wide: 15 of Compress's 36 water-scale intervals (set (c), registered) cross zero. The time-varying known plant (§2) shows that the LTI fit
  produces multipliers of this kind from the speed's change alone; the speed-following fit removes that source and
  still finds them. So the fits are descriptions of the responses, not a measurement of the board's terms; question 1
  is the term-level measurement.
- **Each extra set buys almost nothing.** From (a) to (c) the relative residual falls by 0.01–0.06 in every bin; (d)
  (the pendulum's height and the ankle) and (e) (the feet's station and the deck's height) by another 0.00–0.03. The
  in-sample fits are about as good as the bin's mean response (the FIR): the 0.3–0.6 left over is the spread between
  sets of one bin, which one LTI or speed-following model per bin cannot follow.
- **Per (base, kick time) fits of (a)** (descriptive, `results/fit/fit-<stance>.md` last table; Compress, 25 pairs with
  both channels): one plant per kick leaves a relative residual of 0.15–0.36 (median 0.22 on the 22 pairs above
  5.5 m/s), against 0.34–0.65 for one plant per bin, so most of the bins' misfit is the plant changing from one kick to
  the next. Above 5.5 m/s the pairs agree on a pattern: the roll damping per roll rate ×2–15 the table's (21 of 22),
  the roll moment per yaw rate of the other sign (21 of 22), the slip's yaw and side force ×1–5, the roll moment per
  roll ×0–0.9. Two pairs at 4.9–5.0 m/s run to multipliers of 10²–10⁴.

### 3.2 The held-out prediction (the registered rule; Compress decides)

| stance (held-out open sets) | shipped e, median | (a) / (b) / (c): median e / e_shipped; sets better | the FIR's ratio | speed-following (a) / (b) / (c): ratio to the shipped speed-following; better | predicts? registered / speed-following |
| --- | --- | --- | --- | --- | --- |
| **Compress (24; 10 ankle)** | 1.061 | **0.543 / 0.563 / 0.514; 24 / 24 / 24 of 24** | 0.483 | **0.573 / 0.542 / 0.540; 23 / 24 / 24** | **no / no** |
| tuck (24; 11 ankle) | 1.140 | 0.523 / 0.530 / 0.545; 24 / 23 / 22 | 0.401 | 0.456 / 0.444 / 0.443; 24 / 24 / 24 | no / **yes, (a)** |
| tall (31; 8 ankle) | 0.802 | 0.416 / 0.393 / 0.411; 31 / 31 / 30 | 0.404 | 0.478 / 0.466 / 0.474; 29 / 29 / 29 | **yes, (a)** / **yes, (a)** |

- **Question 2's answer is no, narrowly.** In Compress every nested set of both fits predicts every held-out set
  better than the shipped model (24 of 24 for (a)–(c) of the registered fit), and halves the error, but the median
  ratio is 0.51–0.57, above the registered 0.5. The registered fit's (c) is the closest, 0.514 [0.443, 0.636]. The
  tuck passes with the speed-following fit (0.44–0.46) and fails with the registered one (0.52–0.55); tall passes with
  both. The exploratory (d) and (e) do no better (Compress 0.52–0.55).
- **The ceiling.** The fitting bin's mean response (the FIR) reaches 0.483 in Compress, 0.401 the tuck and 0.404 tall:
  a single response per bin is as good as any fitted plant here, and only just under the line. The free mechanical
  rows (one-step least squares) are unstable when simulated (median ratio 1.2–5.9). The blended design A used is the
  shipped `plantAt` to 10⁻³ (ratio 1.000).
- **By speed** (Compress, registered (c)): 0.48 below 8.7 m/s (12 sets), 0.56 at 8.7–10.1 (6), 0.58 above (6).
- **The selected set**: none predicts in Compress, so by the rule question 3 proceeds with each fit's set of the lowest
  held-out median ratio: (c) for both, labelled as having failed question 2.
- **My prediction 3** was wrong: (a) is as good as (b) and (c) (the body's bank is not the missing piece the shapes
  suggested), the median ratio is 0.51–0.57, not 0.4, and the roll inertia's multiplier is not consistently below 1.

## 4. Question 3: the fitted model closed with the shipped design

*Closed twins passing over 1.5 s at ≥ 4 m/s, the fitting and held-out seeds pooled (Compress 66 + 25, the tuck
61 + 19, tall 73 + 42); Ω's response (the model's −r) to a unit kick on either channel over 1.5 s; the fitted plant set
(c) of its bin; the controller the exact perturbation map of the blended designs, A's own speed, depth and rail per
tick. `results/final/q3-ltv-c.md` (primary, the speed-following fit) and `q3-lti-c.md` (the registered fit), with
the fitting and held-out seeds apart.*

| Compress, pooled (91 sets) | Prony f, median | f − f_twin, median paired | waveform error Ω | Prony ζ | damped-sinusoid ζ | envelope ratio |
| --- | --- | --- | --- | --- | --- | --- |
| **the closed twins** (the game) | 2.54 | | | 0.033 | −0.036 | 0.91 |
| speed-following fit (c), speed-following closure (**primary**) | 2.52 | +0.12 | **2.02** | −0.059 | −0.083 | 1.94 |
| … frozen | 2.57 | +0.17 | 2.56 | −0.079 | −0.098 | 2.70 |
| registered fit (c), speed-following closure | 2.66 | +0.12 | **0.90** | 0.072 | 0.007 | 0.62 |
| … frozen | 2.65 | +0.12 | 0.87 | 0.053 | 0.000 | 0.56 |
| the shipped model, speed-following | 2.27 | −0.26 | 0.98 | 0.576 | 0.112 | 0.13 |
| … frozen | 2.73 | +0.23 | 0.99 | 0.730 | 0.127 | 0.26 |
| 3.6d's S0 (the measured open response closed; 50 sets) | 2.71 | +0.17 | 1.58 | −0.051 | | 1.49 |

| stance, pooled | primary: Δf, waveform, ζ (Prony) | registered fit: Δf, waveform, ζ | the twins' ζ | the shipped model: Δf, ζ |
| --- | --- | --- | --- | --- |
| tuck (80) | +0.14, **0.70**, 0.083 | +0.11, 0.88, 0.078 | 0.054 | +0.20, 0.587 |
| tall (115) | −0.18, 1.05, 0.180 | −0.13, 0.93, 0.127 | 0.057 | +0.09, 0.597 |

1. **The fitted models put the loop's mode where the game's is, and nearly undamped; the shipped model does not.**
   Closed with the balance's own design, both fits ring at the twins' frequency within +0.12 Hz in Compress (+0.11 to
   +0.14 the tuck) with Prony ζ −0.06 to +0.08 against the twins' +0.03 to +0.05, where the shipped model, closed the
   same way, gives ζ 0.58–0.73 and a frequency 0.23–0.26 Hz off. The registered fit's closure is the closer in decay
   (ζ +0.07, envelope 0.62 against 0.91); the speed-following fit's grows (ζ −0.06; below 8.7 m/s it diverges:
   ζ −0.135, waveform 17.8 on 37 sets).
2. **It does not reproduce the waveform, so question 3's answer is no** (registered: |Δf| ≤ 0.15 Hz and the median
   waveform error ≤ 0.6). Compress: the primary's waveform error is 2.02 (the registered fit's 0.90); the tuck 0.70
   (0.57 on its 19 held-out sets) and tall 1.05. A waveform error near 0.9 means the predicted ring is as far from the
   twin's as no ring at all: a 0.1 Hz error is half a cycle of phase by the end of 1.5 s, and the sets' own
   frequencies spread.
3. **The delay sweeps** (the fitted model with the designs rebuilt for 4 and 8 ticks and with the senses shifted ±2;
   Prony f, median over the sets, against 3.6d's and 3.6c's measured peaks):

   | | Compress: primary / registered fit / measured | tuck: primary / measured | tall: primary / measured |
   | --- | --- | --- | --- |
   | 4 ticks | 2.78 / 2.87 / **3.08** | 3.14 / 3.26 | 2.13 / 2.90 |
   | 6 ticks | 2.52 / 2.66 / 2.67 | 2.78 / 2.90 | 1.95 / 2.31 |
   | 8 ticks | 2.32 / 2.52 / 2.36 | 2.53 / 2.54 | 1.92 / 2.11 |
   | senses −2 | 3.41 / 3.44 / **3.72** | 3.65 / 3.73 | 2.04 / 4.26 |
   | senses +2 | 2.14 / 2.19 / 2.05 | 2.31 / 2.33 | 1.72 / 1.93 |
   | predicts (all within ±0.25, order right) | **no** (4 ticks −0.30, −2 −0.31) / no (−2 −0.28) | **yes** | no |

   In the tuck the speed-following fit predicts all five peaks within 0.12 Hz, in order. In Compress both fits get
   6, 8 and +2 within 0.16 Hz and the order right, and fall short on the short-delay side by 0.21–0.31 Hz (the
   registered fit's 4-tick peak, −0.21, is inside the line; its −2 peak, −0.28, is not), as 3.6d's measured response
   did (2.51 pooled, 3.02 Prony, at 4 ticks). Tall misses: its fitted loop is too slow (1.9–2.1 Hz against 2.3) and
   insensitive to the senses' shift.
4. **My prediction 4** was right on the frequency and the near-zero damping in Compress and the tuck, wrong on the
   waveform (≤ 0.6) and on tall.

## 5. Question 4

**Not reached**: question 3's primary closure does not reproduce in Compress (§0.6). No design was built on the fitted
plant.

## 6. Controls (knobs off; `src` untouched)

| control | result |
| --- | --- |
| `git diff 4a50e650 --stat -- src scripts` | empty: no `src` or `scripts` change, so no knob |
| The full stability report, `npm run report:stability -- --mode full`, 12:35:06–13:09 UTC, 33.9 min, beside the two held-out runs and the fits | exit 0, 0 regressions, 0 improvements; **227 of 227** ride lines identical to `baseline-full.json`, its 26 test-wave lines identical to `baseline-quick.json`'s (3.6c's `same.py`; `results/report-full.txt`). The quick report was not run (`src` unchanged; the brief asks for it after a `src` change only) |
| The Canyon byte check | snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`: **identical** (`results/byte-check.txt`) |
| `npx tsc -b` | clean |
| The gain lock, `npx vitest run src/physics/stabilityGains` | **5 of 5** |
| The probe | 3.6d's `response-probe.ts` unchanged; the bundle rebuilt here is bit for bit 3.6d's (sha1 `b91bb540…`) |
| The known-plant controls, question 1's synthetic control | §2, §1 |
| The archive | the registered fit rerun on the slim fitting rows (`runs/fitting.tar.gz`) gives its JSON (bins, edges, per-pair fits, question 1) and its table identical |
| No arm, no hidden motor, no bound touched | the round ran the shipped game; the fits and closures are offline models |

## 7. For Vicente

**What the board does that the balance's picture of it does not**, measured term by term from the nudged twins, in
Compress and the tuck (tall is nearer the picture):
- **The rider's weight does not hold the board's heading the way the picture says.** In the balance's model the body's
  sideways inertia, carried by the feet 0.24 m behind the board's centre, resists every turn of the board; in the game
  that effect is a twentieth of the model's or less. The twist between the hips and the legs, by contrast, is exactly
  the model's.
- **The board is several times lighter in roll than the picture says**, and the water's grip on it is a fifth to four
  fifths of the table's, with two of its terms of the other sign (the fins turn the board the other way when it rolls,
  at the lower speeds).
- So the real board rolls and turns more and sooner for the same push, which is what 3.6d saw.

**What fitting the picture to the nudges gives.**
- A model fitted to the nudges predicts fresh nudges (seeds 4 and 5, never seen) better than the shipped picture on
  every one of 24 Compress nudges, with about half the error; by the bar set in advance (better on 75 % and at most half
  the error, in the median) it falls just short in Compress (0.51–0.57 of the error), and passes tall and, with the
  speed-following fit, the tuck.
- Closed with the balance's own, unchanged design, the fitted model rings at the game's frequency (2.5–2.7 Hz in
  Compress, within 0.12 Hz) and barely decays, as the game does, where the shipped picture decays within a swing. In
  the tuck it also predicts how the swing's frequency moves with the reaction time, every case within 0.12 Hz. But it
  does not reproduce the swing's waveform nudge by nudge (the registered bar), so it is not yet a model the balance can
  be rebuilt on.
- The fitted numbers themselves are not physical: they move a lot from bin to bin and some inertias run to zero. The
  term-by-term measurement (above) is the part to trust.

**No change is proposed** and none was made: no arm, the shipped design and gains untouched, the lock unchanged. What
this suggests, each needing his word:
1. The rider's yaw coupling through the feet and the board's roll inertia are the two terms of the balance's picture
   most at odds with the game; a picture rebuilt with those two from the ledgers (not from a whole-response fit) is the
   next candidate to test, model-only, before any arm.
2. The board's answer changes from one nudge to the next more than any one picture per speed can follow (one fitted
   plant per nudge leaves a fifth of the response unexplained, one per speed band a third to two thirds); a balance that
   assumes one picture will keep meeting that gap.

## 8. What I could not settle, and what I would test next

- **Question 2 fails by a hair, and the ceiling is close to the line.** In Compress the best ratio is 0.514 against
  the 0.5 bar, and the fitting bins' own mean response only reaches 0.483. With 24 held-out Compress sets (two seeds),
  that margin is inside the sampling noise; I would not read "fails" as "far from passing".
- **Question 3's waveform.** The fitted closures find the ring's frequency and its near-zero damping, but the waveform
  errors are 0.70–2.0 (registered bar 0.6). The speed-following fit's Compress plant below 8.7 m/s makes the loop
  grow (ζ −0.135), the registered fit's does not; which is nearer the board is not settled, since both miss the
  waveform.
- **Why the fitted multipliers are unphysical.** The time-varying known plant shows the LTI fit manufactures them from
  the speed's change; the speed-following fit removes that source and still produces some (the slip scales at 10⁶ in
  one bin). The remaining candidates: the board's heave and pitch (3.6a part 2's leftover; the 10-state model has none),
  the plant changing between kicks for reasons other than speed (depth, the face), and the β measured in the rider's
  heading frame. Next: per-kick fits with the term-level structure of §1 imposed (the feet's lever and the roll
  inertia from the ledgers), and the 14-state plant with heave and pitch, scored on the same held-out set.
- **The game's yaw "negative added inertia"** (+0.8 to +1.0 N·m per rad/s² in the water's yaw ledger) and the yaw
  acceleration rolling the board (−0.7 to −0.9) are measured, not explained: they may be the implicit added-mass solve
  booked against the board's own rate, or a sub-frame timing of the ledger. A check against the bare board's ledger
  (3.6c M1) would separate them.
- **The registered rule on the synthetic control was misread by my code**, and question 1 was read before the control
  was confirmed (amendments 1–2): stated, fixed, and the coefficients unchanged.

## 9. Where everything is, and how to recompute it

- **Raw runs** (session scratchpad):
  `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36e/`:
  `heldout/big_s{4,5}.jsonl` (the held-out twin runs, whole, with `status.txt`), `rep/f-off/` (the full report),
  `byte/` (the byte check), `fit3/`, `fitltv2/` (the frozen fits as run), `known2/`, `ltv/`, `ltv2/`, `ltv3/` (the
  controls), `final/` (the held-out read and the closures), `bin/` (every bundle; `response-probe-b91bb540.mjs` the
  probe). The fitting set is 3.6d's `scratchpad/36d/twins/` (read-only).
- **Archived here** (`runs/`): `heldout.tar.gz` (the held-out runs whole, every row, with their ledgers; 21 MB) and
  `fitting.tar.gz` (the fitting set's `weights`, `kbase` and `kick` rows, the ledgers' `e` kept on the open kicked rows
  of sizes ±1, which is all question 1 reads; `slim.py`; 27 MB; checked to give the registered fit again).
- **The scripts** (bundle with `./node_modules/.bin/rolldown <file> --file <out>.mjs --format esm --platform node`,
  then prepend `globalThis.location = { search: '' };`):
  - `run.sh <probe bundle> <out dir>`: the held-out runs;
  - `knownfit.mjs <centre> <out.json> [sets]`: the LTI known plant;
  - `knownltv.mjs <stance> <fit dir> <twins dir> <out.json> [--ltv] [--held] [--holdc Iz]`: the time-varying known plant;
  - `fit.mjs <stance> <out dir> <twins dir>` (registered) and `… --ltv --from <registered fit dir> --holdc Iz`
    (speed-following): question 1 and the fits;
  - `heldout.mjs <registered fit dir> <held-out dir> <out dir> <speed-following fit dir>`: question 2;
  - `closures.mjs <fit dir> c <out prefix> fitting=<twins dir> heldout=<held-out dir>`: question 3.
- **The results**: `results/fit/`, `results/fit-ltv/` (the frozen fits and their tables), `results/known/` (the
  controls), `results/final/` (`heldout-q2.md`, `q3-ltv-c.md`, `q3-lti-c.md`, `fit-summary.md`, `heldout-opened.txt`),
  `results/dev/` (the closures' development run), `results/report-full.txt`, `results/byte-check.txt`.
