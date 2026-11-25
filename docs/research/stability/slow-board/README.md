# 3.6a part 2: the slow board's plant, identified from the game's own ticks

*Surfer-track builder, Claude Opus 5.5, xhigh effort (closed-loop identification: the controller's own feedback can bias
a fit, and a wrong plant would mislead 3.6b), 2026-11-25. Branch `claude/slow-board` from `claude/stability-report`
`3778d3b6` (the ride build's `src`, `claude/plant-rows` `1be12ee7`). Docs and probes only: no game behaviour changes. The
only `src` file this round may touch is `src/physics/stabilityGains.test.ts`, and only under §0.9. 3.5x's candidate 4.*

## 0. Pre-registration (written and committed before any identification run or fit is read)

### 0.1 The question

Below 5 m/s the gain lock asserts nothing: both linear truths in the repository, the shipped table (`table`,
`plantAt(v, depth)`) and 3.5w's measured flat-water rows (`game`, `results/35w/rows.jsonl` tag `ride`, patched in as
3.5x's `what-fails-first-model.ts` does), give the ride build's design (A: his address with `&cueLater=on&plantFloor=6`)
a real divergence there (3.5x §8), yet in the game A carries those stands. **Does a plant identified from the game's own
ticks describe the slow board, and what does it say about A's gains below 5 m/s?**

### 0.2 The model structure

- **The state and the commands are the design's own** (`predictiveBalance.ts`, model signs, rad and rad/s):
  x = [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a] (the board's roll and rate, the body's bank and rate, the board's yaw rate,
  its sideslip, the twist, the upper body's yaw rate, the ankle's lagged rest, the twist's lagged torque);
  u = [u_a, u_t] (the ankle's rest and the twist torque the game applies, held over the tick).
- **The plant is discrete, at the controller's own tick** (`CONTROL_STEP` = 1/60 s): x[k+1] = Φ x[k] + Γ u[k], with no
  input delay. The sensing delay is the controller's own: `PredictiveController` delays the senses by
  `d.steps` = round(0.1 / (1/60)) = **6 ticks** inside `tick`, so the game hands it undelayed senses and the loop's true
  delay is 6 by construction. This is verified, not assumed (§0.7: the controller is replayed offline from the logged
  inputs and must reproduce every logged command). The check closes the loop at **6 ticks, with 5 and 7** as a frame of
  timing error either way, as 3.5x §8 and the gain lock do.
- **Which states are measured and which estimated: all ten are measured**, read from the game at the tick's own
  instant (the substep the controller ticks on, before that substep's lags update). None is estimated; the controller's
  own estimate x̂ is logged but not used in the fit.
  - θ, θ̇, ω_u, θ_t and θ̇_t from the controller's own sense vector (`sense[0..4]`), r = ω_u − θ̇_t, φ = θ − `sense[5]`,
    φ̇ = θ̇ − `sense[6]` (the sense matrix's own rows, so the states are exactly the model's);
  - β = atan2(v_right, v_fwd) from the rider's own `boardVelocity − waterFlow` in its `heading` frame (v_fwd must equal
    the schedule speed the controller is called with: a check printed per file);
  - δ = −`ankleRest`, τ_a = −`twistBody.active` (the game's lagged ankle rest and twist torque, model signs);
  - u_a = −(the command the game's ankle lag follows that tick, `HumanBalance.lagRest`'s `command`, after the rail-bite
    clamp), u_t = the controller's sent twist torque.
- **The two lag rows are known and fixed:** δ[k+1] = a δ[k] + (1 − a) u_a[k] and the same for τ_a, a = e^{−h/0.05}
  (`MOTOR_LAG`, `PREDICT_LAG`). Checked on the data (largest error printed; it must be below 1e-9).
- **The eight mechanical rows are identified**, each by least squares on twelve regressors: the eight mechanical states,
  the step-mean ankle rest δ̄ = (1 − f) δ + f u_a and twist torque τ̄ = (1 − f) τ_a + f u_t (f = 1 − (0.05/h)(1 − a) =
  0.1496, the mean of the lagged command over the tick; it fixes Γ's mechanical entries to Φ's δ and τ_a columns by the
  known lag, so the closed loop's near-collinearity of u with x cannot inflate them), and two measured exogenous inputs:
  **the face's tilt** across the heading (model sign, from the rider's `waterUp` and `heading`) and **the hip's swing
  torque** (`swingTorque`, the actuator the design does not model, active when the ankle is asked past 11.5°). Plus an
  **intercept per segment** (a segment is one rider's maximal run of consecutive selected ticks in one cell; segments
  under 12 ticks are dropped), which absorbs the face's slow push and the trim's offset. Φ and Γ are then assembled:
  Φ's δ column = c_δ̄ (1 − f), Γ's ankle column = c_δ̄ f, and the same for the twist. The exogenous terms and intercepts
  are not part of the plant and are not used in the check or in the validation's prediction.
- **Cells.** Speed: the schedule speed (the board's forward speed through the water, the `speed` the controller is
  called with, which is the model's V), bins **1.5–2, 2–2.5, 2.5–3, 3–3.5, 3.5–4, 4–4.5, 4.5–5** m/s, plus reference
  bins **5–5.5, 5.5–6, 6–7** (where the gain lock's map holds; a sanity check of the method). vW, the horizontal speed
  through the water, is reported beside it. Depth: the controller's `depth` argument (`yawDepth`), groups **tall
  [0, 0.1), crouch [0.1, 0.25), Compress [0.25, 0.375), tuck [0.375, ∞)**, checked at the knots 0, 0.195, 0.30, 0.45.
- **The ticks used** (the same rules for fit, validation and the controls): standing, attached, from the 10th tick after
  the stand (the controller's 6-tick blind start and settling), both ends of the pair logged for the same rider, the
  lean asked |θ_ref| ≤ 8° (the rail-0 plant: the stick centred or dithered, not the full turn), and no infeasible
  contact substep (`settleStanding` false) between the two ticks. The share of used ticks with |φ| > 20° is reported.
  A cell needs **≥ 600 training pairs from ≥ 8 rides**, and for validation **≥ 300 held-out start ticks from ≥ 5
  rides**; otherwise it is "no data" and nothing is claimed there.
- *Amended 2026-11-25, about 15:49 UTC (`adc24d11`), after the probe's determinism ride and before any identification file was
  read:* a pair is also dropped when the ankle's lag row does not hold on it (|δ[k+1] − a δ[k] − (1 − a) u_a[k]| > 1e-9).
  The command the lag follows then changed inside the tick, which the game does when the rail's bite passes 48° and the
  ankle's room shrinks substep by substep (`predictiveBank`'s `room`). On the determinism ride it was 2 of 220 pairs,
  both in the last 0.3 s before the fall; every other pair holds the lag row to 2e-16 (ankle) and 5e-14 N·m (twist).
- *Amended 2026-11-25, about 16:00 UTC, after reading the cell counts of the first identification file (Medium seed 1,
  training data) and before any held-out file or any validation was read:* **the intercept is one constant per cell**,
  not one per segment. The board passes a 0.5 m/s bin in about 0.25 s (15 ticks; it decelerates at about 2 m/s²), and
  the balance's own knee drop moves the depth across the tall/crouch border tick by tick, so the registered segments
  were 12–15 ticks long or broken: an intercept per segment would remove almost all of a cell's slow motion (the yaw,
  the slip, the roll-out), which is what the check needs. The face's push is carried by the face's tilt, which is a
  regressor. The per-segment structure (gaps up to 30 ticks bridged, at least 12 pairs) is kept as the **secondary**
  fit and taken through the same recovery, validation and check; a cell where the two structures disagree on the sign
  of A's least damping at 6 ticks is marked structure-sensitive and is not credible. The rows' R² is reported on the
  increment x[k+1] − x[k].

### 0.3 The closed-loop bias, and how it is handled

The command is a function of the state, so the fit's regressors are correlated with whatever the plant model leaves
out (colored: the face, the waves' forcing, the speed changing inside a bin, the pitch and heave, the large angles).
That is the bias to fear. It is handled in four ways, and the first is the method:

1. **The method: direct least squares on the fully measured state**, with the face's tilt and the hip's torque as
   measured inputs and the per-segment intercepts (§0.2). Measuring every state removes errors in the regressors; the
   exogenous terms and intercepts remove the largest known colored disturbances; and δ̄ and τ̄ carry the command's whole
   effect, so the only closed-loop question left is whether δ̄ and τ̄ are correlated with the remaining residual.
2. **The stick's excitation.** The identification adds **dither** riders (§0.5): after the turn (or from +0.6 s on a
   straight ride and on his way), the stick at ±0.12 (about ±6° of lean asked where the board planes), its sign held for
   6–18 ticks drawn from a fixed pseudo-random sequence per rider. The dither is an external signal, independent of the
   water, and reaches the command through the reference.
3. **An instrumental-variables cross-check:** two-stage least squares on the same rows, with the steer input's lags
   0–30 ticks as instruments for δ̄ and τ̄ (the exogenous columns and intercepts instrument themselves). Reported
   beside the direct fit with its check map; it is not the method unless §0.8's recovery control fails the direct fit
   and passes this one in a cell.
4. **A known-plant recovery control (§0.8):** the same pipeline applied to closed-loop data simulated from known plants
   with the same controller code, driven by the game's own logged references and the game fit's own colored
   disturbance sequences. This measures the method's closed-loop bias rather than assuming it away.

**The conditioning check, reported per cell:** the condition number κ of the regressor matrix (each column scaled to
unit RMS after the segment demeaning); the variance inflation factors VIF of δ̄ and τ̄ (1 / (1 − R²) of each on the other
regressors: how much of the command the state already explains); and a ride-block bootstrap (200 resamples of whole
rides) of A's least damping at 6 ticks, 5–95 %. A cell with κ > 1e4 or VIF(δ̄) > 100 is flagged ill-conditioned.

### 0.3a Amendment: the registered method fails its own control; the grey-box fit becomes the method (2026-11-25, about 16:20 UTC, before any held-out file was read)

The known-plant recovery (§0.8) was run during development on five of the six training files (Medium seeds 1–2, Big
seeds 1–3; their own black-box fit supplied the disturbance), as a test of the code. It fails, and it fails for the
reason the brief named. Least damping of A at 5 / 6 / 7 ticks, K2 (A's own design plant closed with A), on the
recovered plant against the known one, typical cells:

| disturbance injected | direct LS (registered) | IV, states as their own instruments (registered) | feasible GLS, AR(2) per row | IV, every regressor on the stick and lean lags | grey-box (below) |
| --- | --- | --- | --- | --- | --- |
| none | 5 and 7 ticks within 0.04 in every cell | as direct | within 0.04 | within 0.04 but one cell | within 0.02 |
| white, the game's own RMS | within 0.04 in 12 of 14 cells, div in 2 | div or off in 4 of 11 | div in 3 of 14 | — | — |
| the game's own residuals, time-shuffled | 10 of 12 cells close | — | — | — | — |
| **the game's own residuals (registered)** | **div (a real root outside the unit circle) in 9 of 14 cells** where the known plant is +0.16 to +0.20 | **div in 8 of 11** | **div in 8 of 14** | **div in 9 of 12** | **5 and 7 ticks within 0.04 in 12 of 14; div in 1** |

The game's residuals are strongly colored (lag-1 autocorrelation 0.6–0.98 on most rows, gone by about 5 ticks, and
correlated across rows): with that color, every black-box fit of the 96 mechanical coefficients turns a disturbance
the controller answers into spurious plant dynamics. Halving the disturbance, or injecting it only on the selected
ticks, does not cure it. Shuffling it in time does: it is the color, not the size.

**The method from here (amended):** a **grey-box fit**. The plant is the model's own (`plantAt` at each tick's own
speed and depth: the two-body rider, the ankle's 800 N·m/rad spring and 80 N·m·s/rad damper, the twist rotor, the
muscles' lags), and **only the water's twelve derivatives** (`heelYaw` … `rollDamping`, the model's axes) are
identified, shared by the cell, by Gauss–Newton on the eight mechanical rows (each row with its own face and hip inputs
and constant, rows weighted by their residual variance, 6 iterations from the table's water at the cell's median). The
δ column is then physics (the ankle spring), not a regression coefficient, so the closed-loop collinearity of the
command with the state cannot inflate it. The ride-block bootstrap is one Gauss–Newton step per resample from the fit.
**The assumption is that the game's rider mechanics are the model's**; the held-out validation tests it, because the two
truths share exactly these mechanics and differ from the grey-box plant only in the water.

- The registered black-box fit (direct LS, one constant per cell) is still taken through the whole pipeline and
  reported, with its recovery result; it is not credited where its recovery fails.
- **§0.8 (b) amended:** the 6-tick value is compared by sign and "div" only, and the 5- and 7-tick values within 0.10.
  When the controller's own model is the plant (K2, and K1 nearly so) its 6-tick least damping is the separation
  principle's (the LQR and filter poles, 0.34–0.53), and any mismatch at all, the bin's own spread of speed and depth
  included, takes it down: with no disturbance at all the recovered value was 0.26–0.32 against 0.34–0.53, while 5 and 7
  ticks matched within 0.04.
- Everything else stands: the cells, the data rules, the split, the validation and its pass line, the check, the
  credibility rule and the lock.

### 0.4 The data split

- **Identification:** seeds 1–3, Canyon Medium and Big (the benchmark's seas, `PERIODS=12`), every ride the benchmark's
  full mode runs on that sea (Medium: `hisway`, `none:left`, `none:right`, the twin; Big: `hisway`, the four stances
  × left and right, the twin), plus the dither riders (§0.5) in the same process.
- **Held out:** seeds 4–9 on both seas with the same scripts, and the test wave (`tw-catch` and `tw-ride`, the
  benchmark's 13 rides each). Nothing held out is read until the fit is frozen (its coefficients written to a file whose
  hash is printed). The held-out rides are used for the validation (§0.6) and for the hazard repeat (§0.10).
- **Runs:** one process per sea and seed (one per ride on the test wave), at most 4 at once, each
  `node --max-old-space-size=3200`, on the new probe (§0.5).

### 0.5 The probe

`docs/research/stability/slow-board/slow-board-probe.ts`: `scripts/stability-ride.ts` verbatim (both drives, every row),
plus, with `TICKS=on`:
- **a read-only tick row `k`** per controller tick while standing: x (§0.2), u, the controller's sent and raw commands,
  its call arguments (sense, speed, depth, bank and twist asked, the limits, the schedule's rail), vW, the face's tilt,
  the hip's torque and the swing's angle, the steer sent, the load and pitch-rate senses, the controller's prediction x̂,
  and the infeasible substeps since the previous tick. Through call-through wrappers on
  `PredictiveController.prototype.tick`, `HumanBalance.prototype.lagRest` and `AttachedRider.prototype.settleStanding`,
  which only read.
- **dither scripts**, a `:dither` suffix on any script (`none:left:dither`, `compress:right:dither`,
  `hisway:dither`, `none:straight:dither`): the script as before, plus the stick dither of §0.3 item 2 from +2.6 s on a
  turn (the lean asked has eased out of the turn by then) and from +0.6 s otherwise. Medium adds `none:left:dither`,
  `none:right:dither`, `compress:left:dither`, `compress:right:dither`, `hisway:dither`; Big adds the four stances × left
  and right with the dither, and `hisway:dither`.

**Controls on the probe (before any finding counts):**
- **Determinism:** two runs of the same test-wave ride with `TICKS=on` are identical in every row.
- **Inertness:** with `TICKS=on`, the benchmark scripts' `stand`, `f` and `summary` rows equal the full baseline's raw
  runs (`runs/full-f2.tar.gz`) field by field, for every seed-1–3 process and every test-wave ride (the dither riders
  share the processes, which also re-checks that riders in one process do not interact).
- **The controller replay:** a fresh `PredictiveController` with the ride build's weights, fed each rider's logged
  call arguments in order, reproduces every logged raw command within 1e-9 rad (ankle) and 1e-7 N·m (twist).

### 0.6 The validation test and its pass line

On the held-out rides, for each cell with enough data: from each start tick k (selected by §0.2's rules at k, the rider
attached through k + n and no infeasible contact inside the horizon), the state is predicted n ticks ahead from the
measured x[k] by iterating x̂ ← Φ x̂ + Γ u[j] with the **measured** commands u[j] (all ten states; the lag rows are the
same known rows for every model), for n = 6, 15, 30 (0.1, 0.25, 0.5 s). Three plants, each without exogenous terms or
intercepts:
- **identified:** the cell's Φ, Γ;
- **`table`:** `plantAt(v_k, depth_k, { rail: 0, body: true, stanceDeep: true })` at the start tick's own speed and
  depth, `continuousPlant`, `discretise(·, CONTROL_STEP)`;
- **`game`:** the same with `PLANT_SPEEDS` patched by 3.5w's four `ride` rows (3, 3.5, 4, 4.5 m/s), as 3.5x's model
  script does.

The error is the RMS over start ticks, per state and horizon, each state in its own units and over the design's
`stateScale` for the tables. **The deciding states are φ, θ, r and β** (the roll-out is the board rolling with the
body while it yaws and slides).

**The pass line, per cell:** the identified plant's RMS error is lower than both truths' at every horizon (0.1, 0.25,
0.5 s) on each of φ, θ, r and β: twelve comparisons, all must hold. The other four states are reported. A persistence
predictor (x̂[k + n] = x[k]) is reported beside the three as a floor. The check (§0.9) runs only on cells that pass.
**The plant describes the slow board** if every cell from 2.5 to 5 m/s with enough held-out data at the tall and
Compress depths passes; cells that fail are named with the states, horizons and conditioning that failed.

### 0.7 Controls on the identification

- **Determinism** and **inertness** of the probe, and **the controller replay** (§0.5).
- **The lag rows** fit the data within 1e-9 (§0.2), and a one-tick input lag on them does not.
- **v_fwd equals the schedule speed** on every tick (largest difference printed).

### 0.8 The known-plant recovery control (before the identified plant is read against the truths)

The same pipeline (selection, cells, segments, fit, conditioning) on simulated closed-loop rides, one per logged
training ride and one per held-out ride: x_sim[0] = the game's x at the ride's first logged tick; a fresh
`PredictiveController` (the real class) ticks on the senses C x_sim with the ride's own logged speed, depth, bank and
twist asked, limits and rail; the plant steps x_sim[k+1] = Φ_K x_sim[k] + Γ_K u[k] + d[k], where d[k] is the game's
own disturbance on that ride and tick (x[k+1] − Φ̂ x[k] − Γ̂ u[k] from the game fit's plant part, so it carries the
face, the intercepts and the residual, colored as in the game; zero on ticks outside every cell). A ride stops if
|φ| or |θ| passes 60° or a value is not finite. Two known plants, at each tick's own speed and depth:
- **K1, the `table` plant closed with R's controller** (the shipped design with `&cueLater=on`; A diverges on the table
  below 5 m/s, so only R gives closed-loop data from it there);
- **K2, the plant A's own design is built on** (`plantAt` with `plantFloor: 6`), **closed with A's controller**.

**Pass, per cell, for each of K1 and K2:** (a) on the simulated held-out rides, the recovered plant's n-step RMS error
on φ, θ, r and β is at most 1.25 × the known plant's own (which is not zero, because of d) at all three horizons; and
(b) the check's least damping (A and R, 5, 6 and 7 ticks) on the recovered plant is within 0.10 of the known plant's at
the cell's median speed and depth, with the same sign wherever the known value is outside ±0.05 and "div" (a real root
outside the unit circle) on both or neither. The method is credited in a cell only if K1 and K2 both pass there.

### 0.9 The check, the lock and the candidates

- **The check** (only on cells that pass §0.6 and §0.8): A's controller (`PredictiveController.blend` with the ride
  build's weights, rail 0, at the bin's centre speed and the group's knot depth; below 4 m/s the blend holds the 4 m/s
  design, as in the game) closed on the cell's identified Φ, Γ through the code's own `closedLoop` at 5, 6 and 7 ticks;
  `leastDamping` of `eigenvalues(…, { balance: true, maxIterations: 400 })`, reported in 3.5x §8's form (−1.00 marks a
  real root outside the unit circle). The same for R. Plus the IV fit's map, and the bootstrap's 5–95 % at 6 ticks.
  Sensitivity: the design at the cell's median speed and depth instead.
- **Credible for the lock** in a cell: it passes §0.6 and §0.8, its κ ≤ 1e4 and VIF(δ̄) ≤ 100, the identified plant
  beats persistence at 0.25 s on φ, θ and r there, and the bootstrap's 5–95 % at 6 ticks lies on one side of 0.
- **The lock** (only for credible cells): `stabilityGains.test.ts` gains a test that closes A on each credible cell's
  identified plant (a fixture under `docs/research/stability/`) and asserts that every cell stable today (least damping
  > 0 at a delay) stays stable at that delay. No other `src` change.
- **Candidates for Vicente** (not built): any low-speed design the check suggests, tested offline on the identified
  plants (3.5x's candidate 2, a design that knows its delay at 3–5 m/s, first), each with its map.

### 0.10 Against the benchmark's falls

For every cell, from the full baseline's rides on seeds 1–3 and the test wave (its cause labels and `escapeAt`, joined to
this round's tick rows of the same rides): the **balance-fall hazard** = balance falls whose final escape begins in
the cell ÷ standing seconds ridden in the cell. **The plant says where A rolls out** if the cells where A's least
damping at 6 ticks is ≤ 0 have a higher hazard than the cells where it is > 0.10, and the hazard falls as the least
damping rises across the checked cells (Spearman ρ < 0). Repeated on seeds 4–9 with the same labels computed by this
round's reader from the same definitions (README §4.1).

### 0.11 Predictions (written before any run)

1. **The game's board is not the table's below 5 m/s.** The identified plant's open loop has no real root outside the
   unit circle in yaw and slip at 2.5–5 m/s (the table's rows 4–4.5 are directionally unstable; the game's board is not),
   and it beats both truths on the validation at every cell 2.5–5 m/s with data.
2. **A on the identified plant:** stable at the true 6 ticks at 3–5 m/s at the tall and Compress depths, least damping
   0.05–0.4; marginal (|least damping| < 0.10, possibly a slow real root, growth under 1.2 /s) at 2.5–3 m/s tall. A
   frame either way moves A's least damping by under 0.05 (its gains are soft).
3. **R on the identified plant:** stable at 6 ticks, and negative at 5 or 7 ticks at 3–4.5 m/s in at least one stance,
   as on the table: R's own delay sensitivity, which 3.5x found behind its take-off loop.
4. **The slow mode is the roll-out:** A's least damped mode on the identified plant at 2.5–4 m/s is below 1 Hz and
   involves the board's roll with the body's bank and the yaw, not the fast ankle loop.
5. **Against the benchmark:** the balance-fall hazard is highest in the lowest speed bins and falls as A's least damping
   rises (ρ < 0), which is the benchmark's picture: A carries stands below 5 m/s, and the steered rides roll out slowly
   after the release once the board slows below about 4 m/s, with the ankle range unused.
6. **The reference bins (5–7 m/s):** A's least damping on the identified plant is positive at all three delays, as on
   the table in the gain lock's map.
7. **The recovery control passes** for K2 everywhere with data, and for K1 at 3.5–5 m/s; it may fail for K1 below
   3.5 m/s, where R's own loop on the table is fast and the data are dominated by its feedback.

### 0.12 The evidence and the guards

- `npx tsc -b` clean; `npx vitest run src/physics/stabilityGains` only.
- After the probe runs, not alongside: `npm run report:stability` quick (26 ride lines identical to
  `baseline-quick.json`, 0 regressions) and full (227 identical to `baseline-full.json`, 0 regressions), and the Canyon
  byte check (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`).
- Usage checked at every phase boundary; stop at 80 % of the 5-hour window with what is green pushed. Power checked
  before every batch (none below 25 % while discharging). Raw runs stay in the session scratchpad (`36a2/`); compact
  results go under `docs/research/stability/slow-board/`.
