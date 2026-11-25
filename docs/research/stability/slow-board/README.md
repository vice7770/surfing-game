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
reason the brief named. A closed on the recovered plant against A closed on the known plant, K2 (A's own design plant
closed with A), 14 cells (`dev/rec-*/check*.json` in the scratchpad): the number of cells within 0.04 at both 5 and 7
ticks, and of cells with a real root outside the unit circle ("div") where the known plant has +0.16 to +0.20:

| disturbance injected | direct LS (registered) | IV, states their own instruments (registered) | feasible GLS, AR(2) per row | IV, every regressor on the stick's and lean's lags | grey-box (below) |
| --- | --- | --- | --- | --- | --- |
| none | 14 close, 0 div | 11, 0 | 14, 0 | 11, 0 | 14, 0 |
| white, the game's own RMS per state | 10, 2 | 2, 2 | 9, 2 | — | — |
| the game's own residuals, shuffled in time (12 cells) | 9, 1 | — | — | — | — |
| the game's own residuals, halved | 3, 5 | — | — | — | — |
| the game's own residuals on the selected ticks only | 1, 6 | — | — | — | — |
| **the game's own residuals (registered)** | **1, 8** (3 more negative) | **1, 8** | **2, 9** | **0, 9** | **12, 1** |

The game's residuals are strongly colored (lag-1 autocorrelation 0.6–0.98 on most rows, gone by about 5 ticks, and
correlated across rows): with that color, every black-box fit of the 96 mechanical coefficients turns a disturbance
the controller answers into spurious plant dynamics. Halving the disturbance, or injecting it only on the selected
ticks, does not cure it. Shuffling it in time mostly does: it is the color, not the size.

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

### 0.3b Amendments, 2026-11-25, about 16:31 UTC (`ba33049c`), after reading the training fits and before any held-out file was read

1. **The face enters the grey-box through the model's own face column** (`faceColumn`, 3.5r: the heel terms at φ − τ
   and the support turned through τ), driven by the measured tilt, not through a free coefficient per row. With a free
   tilt coefficient per row the heel derivatives were confounded with it (on the face φ ≈ τ): the training fit put the
   roll moment per roll (`heelRoll`) at 2–22 N·m/rad against the table's −269 to −316. With the face column it is
   still −51 to +21 (training, every cell), so the confound was not the whole story; the column stays because it is
   the physics. The known plants of §0.8 carry their own face column, driven by the same tilt, when the fit is grey.
2. **A closed-loop prediction joins the validation, and the credibility rule.** On the training fit, A closed on the
   identified plant diverges with a real root of 2–4 /s in most cells, **6–7 m/s included**, where A rides for
   seconds in the game and the gain lock's map (table) is stable at every delay. An open-loop prediction with the
   measured commands cannot see that, because the commands it is fed are the game's. So, from each held-out start
   tick, the ride's own controller (the real class, replayed exactly from the logged arguments up to that tick, then
   copied) is closed on each plant with the ride's logged references for n ticks, and the plant's states are compared
   with the game's (φ, θ, r, β at 0.25 and 0.5 s, the same RMS). **A cell is credible for the check and the lock only
   if the identified plant also beats both truths there on all eight of these.** The registered open-loop pass line
   (§0.6) is unchanged and is reported as registered.

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

## 1. The answer

*Seeds 1–3 identify, seeds 4–9 and the test wave are held out. Speeds are the schedule speed, the board's forward speed
through the water (m/s); stances by the controller's depth; "A" is the ride build's controller
(`&cueLater=on&plantFloor=6`); least damping as 3.5x §8 (−1.00, "div", a real root outside the unit circle).*

**No identified plant describes the slow board, so nothing about A's gains below 5 m/s can be read from one, and the
gain lock is not extended.**
- **The registered method fails its own control.** Direct least squares on the fully measured state, closed with the
  game's own controller and fed the game's own residuals, does not return a known plant. A disturbance with the game's
  color (lag-1 autocorrelation 0.6–0.98, gone by about 5 ticks) turns into spurious plant dynamics. On K2, A's own
  design plant, 8 of 14 cells come back "div" where the plant is +0.16 to +0.20 (§0.3a). Neither IV variant cures
  it, nor does AR(2) GLS.
- **The amended grey-box fit recovers known plants but not the game.** It takes the model's own mechanics and
  identifies only the water's twelve derivatives. It passes the recovery on most cells (§4). But on the held-out rides
  it beats both truths on the registered open-loop line in **0 of 16** cells (§5). The registered black-box passes in
  1, 4–4.5 m/s tall, where its own recovery fails.
- **Both identified plants say A diverges at 6–7 m/s,** where the table and the gain lock's map say +0.17 to +0.65
  and where A rides for seconds in the game. A on those plants grows at 2.5–3.8 /s (grey-box) and 0.5–8.5 /s
  (black-box), which would end the rides within a second, so the plants are wrong about the closed loop.
- **The failures have a name.**
  - **The slip is unpredictable** at tick resolution: every model, the two truths included, predicts β no better than
    "it stays where it is" (median RMS ratio 1.00).
  - **The yaw rate** carries 0.04–0.09 rad/s of one-step noise.
  - **The board's roll in the game** is not the model's at any water. The grey-box puts the roll moment per roll at
    −51 to +21 N·m/rad against the table's −269 to −316, and still leaves 1.3–2× the black-box's one-step residual on
    the roll rate, the yaw and the upper body.
- **The 3.5x paradox stands.** A carries stands below 5 m/s that every linear description of the board (table,
  `game`, black-box, grey-box) says it cannot. The descriptive hazard (§7) still shows the benchmark's own picture:
  the balance-fall rate rises as the board slows. Tall, seeds 1–3 and the test wave: 0.04 falls/s at 6–7 m/s, 0–0.12
  at 3–5.5 m/s, 0.21 at 2.5–3 m/s and 0.50 at 2–2.5 m/s. Seeds 4–9: none in 3–7 m/s, 0.37 at 2.5–3 m/s and 0.89 at
  2–2.5 m/s.

## 2. Controls

| control | result |
| --- | --- |
| Pre-registration before any run | `e5fa319f`, 2026-11-25 15:35:41 UTC; the probe `a2628c8b` (15:44:33); the queue launched 15:44:40 |
| Probe determinism | the same test-wave ride (`tw-ride none:left`, `TICKS=on`) three times: 449 of 449 rows identical each time (wall-clock fields left out) |
| Probe inertness | `stand`, `f`, `summary` rows of the benchmark's own scripts against `runs/full-f2.tar.gz`: 55 258 of 55 258 on the six seed-1–3 processes (the dither riders sharing them) and 4 977 of 4 977 on the 26 test-wave rides |
| Controller replay | a fresh `PredictiveController` fed each ride's logged arguments: 428 training rides (72 080 ticks) and 544 held-out rides (81 731 ticks), largest difference from the logged raw command **0** (ankle and twist). So the loop is the code's own, with its 6-tick delay. |
| The lag rows | ankle exact to 3e-16 rad on 71 036 of 71 652 training pairs; the other 616 (0.9 %) are the rail bite past 48° (§0.2 amendment) and were dropped. Twist within 1e-6 N·m on all but 12 pairs, each with infeasible contact substeps, which §0.2 drops anyway. A one-tick-late lag row misses by up to 0.52 (rad, or N·m/100), so the commands act with no input delay. |
| v_fwd against the schedule speed | identical on every tick (largest difference 0) |
| `git diff 3778d3b6 -- src scripts package.json` | empty |
| The two fits, frozen before any held-out read | grey-box `4e238277…`, black-box `80feaf02…` (SHA-256 of `fit.json`); the analysis bundle `ff5cf528…`, the probe bundle `207b553a…` |

## 3. The method, the closed-loop handling and the conditioning

- **The data** (`results/grey-summary.md`, first table): 71 224 selected pairs from 428 training rides, half of them dither
  riders. 16 cells have enough data: tall 3–4.5 and 5–7 m/s, crouch 6–7 m/s, and Compress 2–7 m/s. **Crouch and the
  tuck have no cell below 6 m/s, and the tall stance none below 3 m/s.** Below 5 m/s that leaves nine cells, all tall
  or Compress: the depths of the steer-only rides and his way.
- **Closed loop.**
  - The registered direct fit (one constant per cell) and the registered IV fail the recovery (§0.3a, §4).
  - The amended grey-box fit takes the model's mechanics and identifies the water's twelve derivatives per cell. Its δ
    column is the ankle's spring, not a regression coefficient, and the face enters through the model's own face
    column.
- **Conditioning.**
  - Black-box: κ 36–97, VIF(δ̄) 17–140 and VIF(τ̄) 8–21. VIF(δ̄) passes 100 at 3.5–4 tall (105) and 4–4.5 tall (140):
    there the command is almost a linear function of the state.
  - Grey-box: the water block's κ is 4–18.
  - The ride-block bootstrap of A at 6 ticks is "div" across 5–95 % in 12 of the 16 grey-box cells. So the
    divergence is no sampling accident: it is what the data say, given the structure.
- **Why the closed loop defeats the black-box** (§0.3a, the dev table): with no disturbance, or white noise, it
  recovers the known plants. With the game's own residuals it does not, and shuffling those residuals in time mostly
  restores it. So the problem is the disturbance's color: it is correlated over 2–5 ticks and across rows. The
  controller answers it, and least squares reads the answer as the plant.

## 4. The known-plant recovery (§0.8, `results/<structure>-summary.md`)

- **Grey-box.** K1 (the table, with R's controller) passes 8 of the 14 cells it has data for, and K2 (A's design
  plant, with A) passes 6 of 16. Both pass in 4 cells: Compress 3–3.5 and 5–7 m/s, three of them reference bins.
  - Most failures are (a), the n-step ratio, at 1.26–1.64.
  - K2's other failures are R's "div" against an oscillating divergence (unstable either way, but the registered rule
    asks for the same "div"), and 0.13 at 4.5–5 m/s Compress.
- **Black-box.** It passes K1 in 2 cells and K2 in 1, and never both in one cell.

## 5. The validation (§0.6, held out)

Seeds 4–9, both seas, and the test wave: 359–3 999 start ticks per cell, from 65–332 rides.

| structure | open loop, registered line (12 of 12) | closed loop (§0.3b, 8 of 8) | the states that fail |
| --- | --- | --- | --- |
| grey-box (amended method) | **0 of 16** | 2 of 16 (3–3.5, 3.5–4 tall) | β nearly everywhere; r at 3–4.5 tall against `game`; φ and θ at 0.5 s from 5.5 m/s up |
| black-box (registered) | 1 of 16 (4–4.5 tall) | 2 of 16 (3.5–4, 4–4.5 tall) | β nearly everywhere; φ and θ at 0.5 s |

Typical numbers, grey-box, tall, 3.5–4 m/s, RMS at 0.1 / 0.25 / 0.5 s (identified, `table`, `game`, persistence):

| state | identified | `table` | `game` | persistence |
| --- | --- | --- | --- | --- |
| φ (deg) | 1.0 / 4.7 / 13.0 | 3.2 / 12.8 / 32.6 | 1.6 / 6.8 / 21.8 | 3.5 / 9.6 / 20.3 |
| r (deg/s) | 34 / 46 / 62 | 86 / 257 / 762 | 27 / 34 / 62 | 50 / 41 / 50 |
| β (deg) | 6.3 / 18.4 / 21.5 | 10.4 / 19.7 / 24.5 | 10.3 / 21.6 / 25.6 | 7.9 / 17.6 / 18.3 |

**Read.**
- **The `table` truth is far off the game's yaw below 4.5 m/s,** with errors reaching 760°/s at 0.5 s: it is
  directionally divergent there.
- **The `game` truth (3.5w's rows) is the better yaw predictor** at 3–4.5 m/s, tall.
- **Neither is a good description,** and neither is the identified plant.
- **The slip** is predicted no better than persistence by any model: the median RMS ratio to persistence over 48
  cell-horizons is 1.006 (grey-box), 1.005 (`table`) and 1.004 (`game`).

Per the registered rule, **the check is not run as evidence** and nothing is locked.

## 6. The check, for the record only (not evidence: no cell is validated and recovered)

`results/<structure>-summary.md`, last table: least damping at 5 / 6 / 7 ticks.

| | 2–5 m/s, the nine cells with data | 5–7 m/s, the reference cells |
| --- | --- | --- |
| A on the grey-box plant | "div" in all 9 | "div" or negative in 6 of 7; +0.16 to +0.19 at 5.5–6 tall |
| A on the black-box plant | "div" in 8 of 9, −0.40 at 4–4.5 tall | "div" or negative in all 7 |
| A on `table` (3.5x, the gain lock) | "div" | +0.16 to +0.66 in every cell but 5–5.5 Compress ("div") |
| R on the grey-box plant | "div" | negative or "div", +0.12 to +0.37 at 5.5–6 tall |

The grey-box plants carry a real open-loop root at +1.9 to +6.0 /s in 14 of 16 cells. Where the table is trusted, at
5.5–7 m/s, its own leading mode is an oscillating pair at +0.7 to +1.2 /s. With that root, A diverges even at 6–7 m/s,
against the game, where A holds. This is the evidence that the plants are wrong, not A.

## 7. Against the benchmark's falls (§0.10)

- **The registered comparison** of the hazard against A's least damping **has no checked cell to run on**.
- **The hazard per cell, descriptive** (`results/hazard.md`): balance falls whose final escape begins in the cell, per
  standing second there, on the benchmark's own scripts. The counts per cell are small (0–8 falls), so read the trend,
  not the cells.

| stance | 6–7 m/s | 5–6 m/s | 3.5–5 m/s | 2.5–3.5 m/s | 2–2.5 m/s |
| --- | --- | --- | --- | --- | --- |
| tall, seeds 1–3 + test wave | 0.04 (2 in 49.5 s) | 0–0.08 (1 in 31.6 s) | 0.07–0.12 (3 in 33.8 s) | 0 at 3–3.5, 0.21 at 2.5–3 | 0.50 (2 in 4.0 s) |
| tall, seeds 4–9 | 0 (in 42.9 s) | 0 (in 35.4 s) | 0 (in 41.5 s) | 0 at 3–3.5, 0.37 at 2.5–3 | 0.89 (3 in 3.4 s) |
| Compress, seeds 1–3 + test wave | 0.18 (5 in 28.6 s) | 0 (in 29.8 s) | 0–0.31 (3 in 26.9 s) | 0.10 at 3–3.5, 0.40 at 2.5–3 | 0.40 (3 in 7.5 s) |
| Compress, seeds 4–9 | 0.26 (8 in 31.0 s) | 0–0.12 (1 in 18.4 s) | 0–0.16 (1 in 17.0 s) | 0.40 at 3–3.5, 0 at 2.5–3 | 0.47 (2 in 4.3 s) |

## 8. The lock

**Unchanged.** No cell meets §0.9's credibility rule, so `src/physics/stabilityGains.test.ts` keeps its 5 tests and
its 5–8 m/s map, and no fixture is added.

## 9. What would be needed, and the candidates for Vicente (none built)

**For an identified plant to be usable:**
1. **An excitation the controller does not answer,** i.e. a probe-side perturbation added to the controller's own
   commands. A small pseudo-random ankle-rest offset (1–2°) and twist torque (5 N·m), independent of the state,
   would separate the plant from the loop.
   - The stick dither of this round enters through the reference. It is too weak against the colored disturbance, and
     the IV on it fails the recovery.
   - The perturbation is probe-only and changes no game code. But it is an input the rider does not make, so it needs
     your word.
2. **Tick-mean states.**
   - The slip and the yaw rate read at the tick's first substep carry sub-tick chatter (one-step slip residual up to
     0.13 rad in Compress).
   - Means over the tick's substeps, accumulated probe-side, are what a 60 Hz model can describe.
3. **A structure with the board's heave and pitch** (the 14-state plant of 3.2p). The grey-box's leftover residual
   on the roll rate, yaw and upper body (1.3–2× the black-box's) says the 10-state mechanics miss a coupling, and the
   board's own 1.0–1.4 Hz heave-and-pitch mode is the known candidate.
4. **Stationary data.**
   - The board crosses a 0.5 m/s bin in about 0.25 s (15 ticks), so every cell mixes plants.
   - Crouch and the tuck have no data below 6 m/s, and the tall stance none below 3 m/s.
   - A drive that holds a slow speed (the test wave's flat shoulder, say), in every stance, would fill these cells.
5. **A closed-loop validation line.**
   - An open-loop prediction with the game's own commands cannot see a wrong closed loop.
   - Here the plants that beat the truths on some horizons still make A diverge at 6–7 m/s.
   - Any later identification should be validated with the controller in the loop (§0.3b) and must leave A stable
     where it holds in the game.

**Candidates (each needs Vicente's word):**
- **(a) The command-dither identification round** above (items 1, 2 and 4), probe-side only.
- **(b) 3.5x's candidate 2, a design that knows its delay at 3–5 m/s:** not testable offline yet. No truth is fit to
  test it on, and this round adds none.
- **(c) For 3.6b, the benchmark as the only judge below 5 m/s.** The gain lock covers 5–8 m/s and cannot speak lower.
  Every low-speed gain change is a ridden arm, judged by the regression rule, until a plant passes the controls above.

## 10. Recompute

From the repository root:
- the probe: `rolldown docs/research/stability/slow-board/slow-board-probe.ts -o <s>/probe.mjs --format esm --platform node`;
- the runs: `<s>/runs/jobs.txt`'s 44 lines through `<s>/tools/job.sh` (`TICKS=on`, 4 at once);
- the analysis: `rolldown docs/research/stability/slow-board/identify.ts` (prepend `globalThis.location = { search: '' };`);
  then `bash docs/research/stability/slow-board/pipeline.sh <s>/runs <s>/ana/<grey|cell> <grey|cell> <s>/id.mjs A`, then
  `… B`;
- the tables: `python3 docs/research/stability/slow-board/summarize.py <s>/ana/grey <s>/ana/cell`;
- the hazard: `python3 docs/research/stability/slow-board/hazard.py <s>/ana/grey/final.json docs/research/stability/baseline-full.json <s>/runs/id <s>/runs/tw <s>/runs/hold`.

The compact outputs are under `results/`: each structure's fit, validation, check and recovery (gzipped JSON), the
two summaries, the hazard, and the development recovery diagnostics behind §0.3a (`results/dev/`). The per-tick runs
(about 0.9 GB) stay in the session scratchpad, under `36a2/runs/`.

## 11. Not done

- The registered check as evidence, the lock, and the hazard comparison against A's damping: no cell qualified.
- R against the identified plant is in the tables (§6), but it is not interpreted for the same reason.
- Crouch and tuck below 6 m/s, and the tall stance below 3 m/s, had too few data.
- The command-dither round, the tick-mean states and the 14-state structure (§9) are not built.
