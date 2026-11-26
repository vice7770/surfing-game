# 3.6d: why the balance rings on the board when it decays on its own model

*Surfer-track builder, Claude Opus 5.5, xhigh effort, 2026-11-26. Branch `claude/board-response`, from `claude/wobble`
`5f69e9dc` (3.6c, reviewed). The brief is `BRIEF.md` in this folder, verbatim. Diagnosis only: docs, probes and
diagnostic knobs, no arm. His address throughout: `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.*

## 0. Pre-registration (written and committed before any run of this round)

**What I had read when writing this.** The brief; 3.6c's write-up (`../wobble/README.md`, all of it), its probe
(`wobble-probe.ts`), runner (`run.py`) and readers (`freq.py`, `wob.py`, `same.py`, `inert.py`, the head of
`knobcheck.ts`); 3.6a part 2's write-up (`origin/claude/slow-board`, all of it); the consult log on `claude/the-record`
from Codex's `27b026f5` entry through the 3.6d dispatch (`ae22e9bb`); and the code: `predictiveBalance.ts` (`senseMatrix`,
`continuousPlant`, `design`, `closedLoop`, `leastDamping`, `scheduledDesign`, `blend`, `steadyTurn`, `tick`),
`AttachedRider.ts` (`humanBank`, `predictiveBank` with the senses and the commands' path, `hipDrive`,
`humanSwingStep`, `coupleYaw`, `finish`, the constructor's weights), `humanBalance.ts` (`DelayLine`, `HumanBalance.sense`,
the `BALANCE_DELAY` readers, `lagRest`, `strategies`), `wobbleKnobs.ts`. Of the raw runs I have opened only the `done`
row and the `control` row of `36c/base/big_s1.jsonl` and `36c/knobs/ankle0.7/big_s1.jsonl` (for timing: 1,242 s and
1,149 s for 13 waves, so the water, not the riders, sets a process's time). **No frame row of any run has been read.**
Everything under "Predictions" is a guess made before data.

### 0.1 Frames, signs and the swing (3.6c's, unchanged)

- *Times* are s after the ride's first standing frame (`tS`), 60 Hz frames. The controller ticks once a frame
  (`CONTROL_STEP` = 1/60 s, on the first of the frame's 16 substeps).
- *Yaw rate* Ω: `board.angularVelocity.y`, world up, + takes the nose toward the board's +x (its left). *The swing*:
  Ω less its centred 15-frame mean; its size, the std over the window; the window tS 0.5–3.0 s on the rides standing
  through it (3.6c §0.1). Peaks and elasticities by 3.6c's `freq.py` and its rule (3.6c §0.3 M4), unchanged.
- *The model's signs* are the design's: x forward, y right; the state x = [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a] (the
  board's roll and rate, the body's bank and rate, the board's yaw rate, its slip, the twist, the upper body's yaw
  rate, the ankle's lagged rest, the twist's lagged torque) and the commands u = [u_a, u_t] (the ankle's rest, rad, and
  the twist's torque, N·m). Every response below is per unit **model-sign** command.

### 0.2 Code facts, checked at reading time (to be re-checked at run time where marked)

1. **The design's delay.** `design(y, t, w, delay = PREDICT_DELAY)` sets `steps = round(delay / step)` = 6 and uses
   `delay` for nothing else; `steps` sets `pred` (Φ^{N−1−j} Γ) and `phiN`. `scheduledDesign` calls `design(y, t, w)`
   (and, only with `heaveSense`, a second time for the padded gains) and keys its cache by speed, depth, rail and
   weights. `blend` copies the first design's shapes once per controller and mixes 8 designs. `tick` keeps the senses'
   line at `max(N, N + senseShift) + 1`, reads the sense `N + senseShift` old, keeps `N + 1` commands, and runs the
   predictor over the last `N` commands sent (the clamped ones). So a design built at another delay carries its own
   `N` into the line, the filter's age and the predictor together. *Run-time check:* control 3 (§0.7).
2. **At his address** the weights are `DEFAULT_WEIGHTS` + `riderBody: 'two'` + `plantFloor: 6` (`stanceDeep` true by
   default); no `faceTrim`, `holdLine`, `waterHeel`, `plantSpeed`, `heaveSense` or `turnGains`, so the faces' and the
   headings' lines are empty, `turnWeights` is undefined and the design has 10 states, 7 senses and the bias (12
   estimated states).
3. **The commands' path** (`predictiveBank`, per substep): `heldAnkleRaw` = −`raw[0]` (before the clamps) and
   `heldTwist` = −`sent[1]` (after them), set at the tick. Then `wanted = heldAnkleRaw − anklePlumb × roll` with
   **`ANKLE_PLUMB` = 0**; the rest asked is `wanted` within the room (±0.25 rad; less past the rail's 48° bite);
   the hip's swing rotor is asked `−SWING_SERIES (wanted − ankleShare) + hipDrive` with `ankleShare` the rest within
   ±`HIP_SHARE` × 0.25 = ±0.2 rad, and **`HIP_CAPTURE_GAIN` = 0**, so `hipDrive` is 0 and the rotor is asked nothing
   until the rest asked passes 0.2 rad; `lagRest` follows the rest asked through `MOTOR_LAG` 0.05 s with no rate bound
   (`ANKLE_REST_RATE` = ∞); the twist's active torque follows `heldTwist` through `MOTOR_LAG` and enters the coupled
   twist (`coupleYaw`, `finish`) with no grip clamp downstream (only the stop past `TWIST_BODY_RANGE`). The design's
   model has one lag, `PREDICT_LAG` = 0.05 s, on each command. So on straight rides the two paths should agree up to
   the substeps' sampling.
4. **The second 0.1 s line** (`HumanBalance.line`, a time-stamped `DelayLine` of the bank, its rate and three capture
   distances, span `BALANCE_DELAY` + 0.02 s, read at `clock − BALANCE_DELAY`). With the predictive balance, its only
   reader that acts is `strategies` (`sensedCapturePast`: the knees' drop and the arms out once the capture point was
   past the feet's edge); `hipDrive` reads it only when `hipCapture` ≠ 0, which it is not at his address;
   `sensedBank`/`sensedBankRate` are read only by the non-predictive `humanBank`.
5. **The sense vector** (`predictiveBank`, model signs): y0 = −bank, y1 = −(bank speed / leg + roll rate), y2 = −upper,
   y3 = −twist, y4 = −(upper − turn), y5 = −(bank − roll), y6 = −bank speed / leg, with `turn` = the leg's up · the
   board's spin and `rollRate` = the roll axis · the board's spin. So the senses are the design's C on the states
   φ = y0 − y5 (= −roll), φ̇ = y1 − y6, θ = y0, θ̇ = y1, r = y2 − y4 (= −turn), θ_t = y3, ω_u = y2, and β is never sensed.
6. **The controller's perturbation map is linear.** At his address, with the lean and twist asked unchanged by a kick,
   the reference (`steadyTurn` on the blended Φ, Γ) is unchanged, and `u − u_A = −K (x̂ − x̂_A) − (b̂ − b̂_A)` with x̂
   and b̂ linear in the senses and the commands sent, for the blended design of each tick. So a fresh
   `PredictiveController` with the same weights, fed the sense differences with the lean and twist asked at 0, A's own
   speed, depth and rail at each tick, and limits it never meets, *is* that map (after N + 1 ticks of zeros to fill its
   lines). *Run-time check:* the lean and twist asked, speed, depth and rail are logged on the twins and their
   differences from A reported (§0.7).

### 0.3 Question 1: the matched delay (M1)

**The knobs** (one `src` change, committed on its own; `WOBBLE` gains two fields, each at its identity by default,
read by no address, each use guarded so the shipped expression runs at the identity):
- `designDelay` (ticks; **−1 = off, the shipped `PREDICT_DELAY`**). `scheduledDesign` builds every design, and the
  padded gains' design, with `design(…, designDelay × CONTROL_STEP)`, and its cache key carries the ticks. The senses
  then reach the filter `d.steps` old through the existing line (`senseShift` 0), and the predictor runs over
  `d.steps` commands. Settings **4 and 8**.
- `captureDelay` (ticks; **−1 = off, `BALANCE_DELAY`**): every reader of `HumanBalance.line` reads it
  `captureDelay / 60` s ago, and the line's span is `max(BALANCE_DELAY, captureDelay / 60) + 0.02` s. Settings
  **4 and 8**, alone (designDelay off).

**Runs:** 3.6c's knob runs' rides exactly (`none`, `crouch`, `compress`, `snap` straight and `hisway`, Canyon Big seeds
1–3, PERIODS 12, `HOLD` 5), one process per setting and seed: `design4`, `design8`, `capture4`, `capture8`, each on
this round's probe (§0.4) with no twins.

**First, the identity on one seed.** This round's probe at identity (every knob off, no twins) on Big seed 1, the
same five scripts: its `f` rows must equal 3.6c's base run's (`36c/base/big_s1.jsonl`) for those scripts, row for row,
as JSON with sorted keys. Only then are 3.6c's base and `sense±2` runs used as the references (`freq.py`'s base and
knob directories), unchanged.

**Reading.** `freq.py` unchanged (window 1 primary, window 2 secondary), on a knob directory holding this round's four
settings beside 3.6c's `sense-2` and `sense+2` (links to its raw runs). The elasticity e = ln(f₈ / f₄) / ln(8 / 4) and
the verdict by 3.6c's rule (carries: |e| ≥ 0.25, both shifts on opposite sides of off and both 90 % intervals clear of
the off peak; does not carry: |e| < 0.10 and both peaks within ±0.15 Hz of off; otherwise partly), from `freq.py`'s
printed peaks by `q1.py`. Per stance (tall, the tuck, Compress primary; Snap and his way reported):

| | matched (`designDelay`) | mismatched (`senseShift`, 3.6c) | the second line (`captureDelay`) |
| --- | --- | --- | --- |
| peak at 4 / off / 8 ticks, e, verdict, paired size ratio at 4 and 8 (rides up/down), rides | … | … | … |

**What separates the two readings of `senseShift`** (decided per stance, Compress first):
- **The builder's reading stands** (the loop's delay, as designed, sets the frequency) if the matched shift
  *carries* by the rule.
- **The coordinator's reading stands** (only the senses' age against the design moves it) if the matched shift
  *does not carry*.
- *Partly* otherwise, and then the size ratios are read beside it: a matched delay that sets the frequency through the
  loop's margin on a mismatched plant should give a swing that grows with the delay one way (smaller at 4, larger at 8),
  where `senseShift` grew it both ways.
- **The second line carries the swing** only if `captureDelay` carries by the same rule; it is *inert* if it does not
  carry and both paired size ratios are within 0.90–1.10.

### 0.4 Question 2: the board's response as the balance sees it, by kicked twins (M2, M3)

**Vicente's approval** of the probe-only nudges: "Yes, use the nudges", 2026-11-26 about 10:05 UTC (relayed by the
coordinator); it covers `kick` and `replay` as the brief sets them and nothing else.

**The probe** (`response-probe.ts`): 3.6c's `wobble-probe.ts` with these additions and nothing else changed.
1. `KNOBS` reaches the two new fields as it reaches the others.
2. **Kick and replay are probe-only**, in the probe's own read-and-write wrapper of `PredictiveController.prototype.tick`
   (no `src` change): the wrapper calls the shipped `tick`, and only for a twin it then writes the two outputs the rider
   reads (`raw[0]`, so `heldAnkleRaw` = −`raw[0]`; `sent[1]`, so `heldTwist` = −`sent[1]`). With no twins in a process the
   wrapper only reads. The controller's own line of commands sent is never touched, so in a closed-loop twin the kick
   is unknown to it and its predictor is fed what it sent.
   - **`replay`** (open loop): at every tick, A's `raw[0]` and `sent[1]` of the same tick index, bit-exact (held in
     memory as doubles; A steps before its twins in every frame), in place of the twin controller's own (which still
     runs, unread).
   - **`kick`** (channel, frame, size): at the first tick of the frame whose row is `tS` = the kick time, `heldAnkleRaw`
     += δ (`raw[0]` −= δ) or `heldTwist` += δ (`sent[1]` −= δ), for that one tick, on top of the twin's own (closed) or
     A's replayed (open) command. Sizes: **δ_a = 0.005 rad** on the ankle, **δ_t = 1 N·m** on the twist, each at
     **+1, −1 and +2 × δ**. In model signs the kick is κ = −δ.
3. **Twins** (`TWINS=<script>,…`): for each named script, per wave, beside its rider A, the twins of every
   (mode ∈ {open, closed}) × (channel ∈ {ankle, twist}) × (kick time ∈ {1.0, 1.5, 2.0, 2.5} s) × (size ∈ {+1, −1, +2}),
   plus one zero-kick twin per mode: 50 per ride. Every twin is a `RideSession` placed with A on the same wave at the
   same time and sent A's inputs (the scripts' inputs depend only on the script, the session's own time and its own
   speed). Twins emit no `f`, `o`, `w` or `summary` row, so every reader of 3.6c's rows sees only A.
4. **Recorded per tick** (inside the wrapper, before the shipped `tick` runs, on A and every twin): the senses as built
   (y0–y6, before the line); β = atan2(v·right, v·forward) of the board's velocity through the water in the rider's
   heading frame (model sign); the actuators as realised at the tick: δ = −`ankleRest`, τ_a = −`twistBody.active`, the
   hip's `swingTorque` and `swing.angle`; the board's Ω (world up), its roll rate p (the board's own long axis) and
   `turn`; the tick's arguments (speed, depth, rail, lean and twist asked, the limits) and its outputs (`raw`, `sent`);
   after each frame's step: every term of the closed yaw ledger and of the roll ledger (as 3.6c's `w` row books them).
   **Clamp flags per substep** (a read-only wrapper of `predictiveBank`, after the shipped code): the rest asked at the
   room, the rest past the hip's share (0.2 rad), the rotor's demand at `SWING_TORQUE`, the rotor at its range or its
   braking stop, the twist past `TWIST_BODY_RANGE`; and at the tick, `raw` ≠ `sent` on either channel.
5. **Rows**, per twin, at the end of the ride: the checks (below), and its differences from A, frame by frame from the
   kick frame − 2 to + 90 (1.5 s), of every recorded channel, at full precision; per base ride and kick time, A's tick
   arguments over the kick frame − 8 to + 90, and **the blended design A's controller used at the kick tick** (Φ, Γ, C,
   K, Φe, Γe, Ce, L, Φ^N, the predictor's matrices, N, the bias flag), copied at that tick.

**Rides.** Canyon Big seeds 1–3, PERIODS 12, `HOLD` 5, his address: `compress:straight` (primary) and `none:straight`
(tall, the contrast), each with its 50 twins; `crouch:straight` (the tuck) with its twins as a secondary set, reported
and in no decision rule. One process per seed.

**Controls, before any twin counts** (per base ride, per twin set = base × mode × channel × kick time, with its three
sizes):
- **Zero kick:** both zero twins equal A bit for bit in every recorded channel on every tick and frame until either
  stops (every ride where A stands).
- **Before the kick:** each kicked twin equals A bit for bit on every channel for every frame before the kick frame and
  on the kick tick's own senses; and the twin's held command less A's at the kick tick is exactly δ.
- **Linearity** over the window (open 1.0 s, closed 1.5 s from the kick), on the stacked responses of y0–y6 and Ω
  (rad, rad/s): with ℓ = (r₊ − r₋)/2, e_sym = ‖r₊ + r₋‖ / ‖r₊ − r₋‖ ≤ **0.05** and e₂ = ‖r₂ − 2ℓ‖ / ‖2ℓ‖ ≤ **0.10**.
- **No clamp:** every clamp flag clear on every substep of A and of the set's twins over the window.
- **Standing:** A and the set's twins stand through the window.
A set that fails any of these is excluded and counted; its response is not read. The response of a passing set is
ℓ / κ (per unit model-sign command).

### 0.5 The model's response at the same tick (M3)

From the blended design copied at the kick tick:
- **open loop:** G_m[j] = C Φ^{j−1} Γ (senses) and −[Φ^{j−1} Γ]₄ (Ω ≈ −r), j = 1 … 90;
- **closed loop:** `closedLoop(Φ, Γ, N, d)`'s M, the kick entering the true plant's state alone (z₁ = [Γ κ; 0]), the
  senses C x and Ω = −x₄ over 90 ticks;
- **`plantAt` at the exact speed, depth and rail** of the tick (`body: true`, `plantFloor: 6`, `stanceDeep: true`, the
  controller's weights), discretised by `design`, open loop the same way, so the blend's own share of a gap is seen.

**The map of the model's states to the game's signals** (§0.2 item 5): φ ↔ y0 − y5 (−roll), φ̇ ↔ y1 − y6, θ ↔ y0
(−bank), θ̇ ↔ y1, r ↔ y2 − y4 (−turn), β ↔ the logged β, θ_t ↔ y3 (−twist), ω_u ↔ y2 (−upper), δ ↔ −`ankleRest`,
τ_a ↔ −`twistBody.active`; Ω ↔ −r for the comparison of the swing's own signal. The hip's torque has no model state.

### 0.6 Question 3: closing the loop on what was measured (M4, M5)

**The known-plant control (before any game result counts).** `known.ts`: a simulation of a model's Φ, Γ, C (the
blended design at 7.0 m/s, 0.30 m, rail 0, his weights) driven by an AR(1) disturbance on its five rates, closed with
the same `PredictiveController` code at his weights (speed 7.0, depth 0.30, asks 0), with A and the same 50 twins (the
same kick and replay rules, in the same row format), read by **the same reader** (`response.ts`) that reads the game.
It must recover, to a relative error ≤ 10⁻⁸ (rounding): the open loop C Φ^{j−1} Γ from the open twins; the closed
loop from `closedLoop` from the closed twins; and the closed twins from the reproduction below.

**The reproduction (M4).** For each base ride and kick time with both open-loop sets passing: the loop on the measured
response, Δy[k] = Σ_{m=1}^{k−k₀} G[m] Δu[k − m] (G the measured per-unit responses of both channels; LTI over the
window), Δu = the perturbation controller of §0.2 item 6 (A's own speed, depth and rail per tick) plus the kick at k₀.
Ω's response the same way from G_Ω. Compared with the closed-loop twin of the same channel and kick time, on Ω over
1.5 s:
- the response's peak (its zero-padded spectrum, rectangular, 0.05 Hz, the peak in 1.5–5 Hz refined by a parabola);
- a damped sinusoid A e^{−σt} cos(2πft + ϕ) + c fitted by least squares over tS = kick + 1/30 to kick + 0.8 s (a grid
  over f 1.5–5 Hz by 0.01 and σ −10 to 40 /s by 0.1, linear in the rest): f, σ, the decay over two periods
  q₂ = e^{−2σ/f} and ζ = σ / √(σ² + (2πf)²);
- the waveform error ‖pred − twin‖ / ‖twin‖ on Ω and on the stacked senses (reported).

**It reproduces** if, per stance, the pooled peak (the sets' power spectra summed) is within **±0.15 Hz** of the
closed twins' pooled peak, the median q₂ within **±25 %** of the twins' median q₂, and ≥ 75 % of the sets pass both on
their own (Compress decides; tall and the tuck reported). As a secondary line, the same with the design frozen at the
kick tick.

**Does the measured response make the ring?** The same loop with the design frozen at the kick tick, on: (S0) the
measured G; (S1) the model's G (it must equal `closedLoop`'s response over the window: a check); and the swaps:
- **stages:** (i) the command's path to the actuators: the measured G with its actuator stage replaced by the model's
  lag (G_meas ∗ A_meas⁻¹ ∗ A_model, 2 × 2 FIR deconvolution on δ and τ_a); (ii) the actuators to the board and the
  body: the model's mechanical rows driven by the measured actuators, read through C; (iii) the board and the body to
  the senses: C applied to the measured states with r = −Ω and φ̇ = −p (the board's own yaw and roll rates in place
  of `turn` and `rollRate`);
- **columns:** the ankle column model's and the twist column measured, and the reverse;
- **blocks:** each of (ankle → the roll senses y0, y1, y5, y6), (ankle → the yaw senses y2, y3, y4), (twist → roll),
  (twist → yaw) replaced by the model's alone, and the roll rows and the yaw rows each replaced whole.

Per closing: the fit of Ω's response (f, ζ, q₂), medians over the sets (kicks on both channels), per stance.
- **The measured response makes the ring** if S0's median ζ < 0.15 with its pooled peak within ±0.3 Hz of the
  stance's swing peak (3.6c: 2.67 Compress, 2.31 tall, 2.90 the tuck), while S1's ζ ≥ 0.25.
- **A swap carries the ring** if it moves the median ζ at least half the way from S0's to S1's; the departure that
  makes the ring is the smallest swap that does (stages before columns before blocks).

**The prediction (M5).** The measured G (6-tick rides), closed with the designs rebuilt at 4 and at 8 ticks (matched,
`designDelay`, the design frozen at the kick tick), and, secondarily, with the 6-tick design and the senses shifted ±2
(`senseShift`): each stance's predicted peak (pooled Ω spectra of the responses) against question 1's measured peaks
(and 3.6c's `senseShift` peaks). **It predicts** if each is within **±0.25 Hz** and the order is right.

**The stage table** (open twins, per unit model-sign command, impulse responses over 60 ticks, their DFT at the
stance's swing frequency against the model's over the same 60 ticks): (i) command → δ, τ_a and the hip's torque;
(ii) δ → each mechanical state (ankle column) and τ_a → each (twist column), as the ratio of the state's DFT to the
actuator's; (iii) the sensed r and φ̇ against −Ω and −p; and command → each sense. Per entry: the gain ratio
(measured / model), the phase difference, and the delay Δt = −(phase difference) / (2πf). **A stage departs** in a
channel if the median gain ratio is outside 0.75–1.33 or the median phase difference beyond ±20°, the same sign in
≥ 75 % of the sets.

### 0.7 Controls (all with the knobs off unless stated)

1. **The probe at identity**: §0.3's seed-1 `f` rows identical to 3.6c's; and in the twin runs, A's `f` rows equal
   the identity run's for the same scripts (the twins do not touch A).
2. **Knobs off**: the quick report 26 of 26 and the full report 227 of 227 ride lines identical to
   `baseline-quick.json` and `baseline-full.json` (the quick run after the `src` change, the full run before the
   report); the Canyon byte check identical (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`); `npx tsc -b`
   clean; the gain lock 5 of 5 (`npx vitest run src/physics/stabilityGains`).
3. **Each knob is what it says** (`knobcheck.ts`): a design at `designDelay` 4 / 8 has `steps` 4 / 8 and `pred` of that
   length, and a controller with it moves its estimate first on the tick 4 / 8 ticks after a step in a sense; at 6
   it is bit for bit the shipped design; `captureDelay` 4 / 8 makes `sensedCapturePast` read a step 4 / 8 ticks late.
4. **The twins' controls** (§0.4) and **the known-plant recovery** (§0.6), reported with their largest errors.
5. **§0.2 item 6 at run time**: the twins' lean and twist asked equal A's; their speed, depth and rail differences
   reported (largest, and the gains' first-order share they imply).

### 0.8 Predictions (made before any data)

1. **Q1.** The matched shift *carries* in Compress (e between −0.3 and −1.0), with the swing smaller at 4 ticks and
   larger at 8 (paired ratios < 0.9 and > 1.3): the builder's reading stands, and `senseShift`'s growth at −2 was the
   mismatch's. `captureDelay` is inert (it acts only through the knees' strategies at his address).
2. **The twins' controls** pass: zero twins bit for bit in every ride; linearity in ≥ 80 % of the sets at these sizes.
3. **Stage (i) does not depart** (within 2 % and 2°): both paths are a 0.05 s lag, the plumb term is 0, the hip idle.
4. **Stage (ii) departs on the ankle column, in roll**: per unit of ankle rest the game's board and body roll more and
   later than the model's (3.6a part 2 found the game's roll moment per roll far below the table's), gain ratio
   > 1.33 on φ and θ at the swing's frequency; the twist column within the band on r and ω_u.
5. **Q3.** The measured response closed with the design rings in Compress at 2.4–3.0 Hz with ζ < 0.15, the model's
   ζ ≥ 0.3; the reproduction passes; the ankle column's swap carries the ring and the twist column's does not; the
   4- and 8-tick predictions fall within ±0.25 Hz.

### 0.9 Guards

At most 8 game processes at once (14 cores); the stability report runs its own 4 beside at most 4 others. Raw runs
in `…/scratchpad/36d/`; the ones the tables need archived into `runs/` here. Later changes to §0 go in as dated
amendments, written before the rows they govern are read. Nothing is fitted to the game's rows except the damped
sinusoid's read-out, which has no held-out role. I stop at a clean commit if the coordinator says so.

### 0.11 Amendments

1. *2026-11-26, committed 10:19:03 UTC (`549952d3`), before any twin row is read:* the closing (§0.6) uses the open-loop responses to 90
   ticks, so an open set that feeds a closing must also stand through 1.5 s and pass the linearity line over 1.5 s
   as well as over the registered 1.0 s. The stage table keeps the registered 1.0 s. The smoke ride used to test the
   pipeline (Big seed 1, PERIODS 3, Compress with its twins) is read for its controls only (the zero twins, the
   pre-kick equality, the held difference at the kick, the masks, the linearity numbers), never for a response; the
   readers are tested on the known plant (§0.6) and committed before any game response is read.
2. *2026-11-26, committed 10:28:58 UTC (`5d0c3483`), before any twin row of the game is read (the readers had run
   only on the known plant):* **the decay's read-out is Prony's, not the damped sinusoid's.** On the known plant (the design at 7 m/s,
   0.30 m, rail 0, its own model as the plant), the registered fit on Ω's response puts f at the grid's edge
   (1.55–1.65 Hz) with ζ −0.01 to 0.21, because Ω's response carries a slow part the single sinusoid cannot separate,
   while the loop's own modes in 1.5–5 Hz have ζ 0.73–0.80 (`closedLoop`'s eigenvalues; e.g. 2.24 Hz, 0.764). So the
   read-out of every closing, reproduction and twin is now **the dominant mode in 1.5–5 Hz of Ω's response over
   m = 1 … 90 by Prony's method** (a least-squares linear prediction of order 16, its poles from the companion
   matrix's eigenvalues, each mode's part of the response by least squares; dominant = the largest energy): its f, ζ
   and q₂ = e^{−2σ/f}. Checked before any game row: on synthetic rings (2.67 Hz at ζ 0.05 and 0.15, 3.5 Hz at 0.30,
   each under two slow exponentials) it returns f and ζ to three decimals; on the model's closed loop at 7 m/s
   (0, 0.30, 0.45 m), 6 and 8 m/s it returns 2.22–2.86 Hz at ζ 0.70–0.81, against the eigenvalues' 2.08–2.62 Hz at
   0.73–0.80. Every rule of §0.6 stands with this read-out in place of the fit (ζ, q₂ and f per response; medians;
   the pooled peak of Ω's raw spectrum as registered). The damped sinusoid is still reported beside it, in no rule.

### 0.10 The order of the round (UTC, 2026-11-26)

| time | step |
| --- | --- |
| about 10:05 | Vicente approves the probe-only nudges: "Yes, use the nudges" (relayed by the coordinator) |
| (this commit) | the brief, verbatim, and this pre-registration, before any run |

---

## 1. Question 1: the matched delay

*Canyon Big seeds 1–3, PERIODS 12, the five straight scripts of 3.6c's knob runs, one process per setting and seed,
this round's probe at identity except the knob named (bundle sha1 `b91bb540…`). Ω about the world's up; window 1
tS 0.5–3.0 s on the rides standing through it (window 2, 0.5–4.5 s, in `results/q1-w2.md`). Read by 3.6c's `freq.py`,
unchanged, on a knob directory holding this round's settings beside 3.6c's `sense±2` raw runs; its table is
`results/freq-w1.md`, and `q1.py` applies 3.6c's rule to it (`results/q1-w1.md`). Base (off): 3.6c's base run, after
the identity control (§2.1).*

| knob, 4 / 6 / 8 ticks | stance | peak Hz at 4 / off / 8 [90 %] | e | verdict | the swing at 4 ; at 8, paired ratio to off (rides up/down) | rides at 4 / off / 8 |
| --- | --- | --- | --- | --- | --- | --- |
| **matched** (`designDelay`: the design, the filter, the predictor and the senses' age together) | tall | 2.89 [2.60, 3.12] / 2.31 / 2.11 [2.07, 2.14] | −0.45 | carries | **0.37 (0/12) ; 2.40 (12/0)** | 12 / 12 / 12 |
| | tuck | 3.26 [3.20, 3.35] / 2.90 / 2.54 [2.49, 2.60] | −0.36 | carries | **0.50 (1/12) ; 1.58 (11/2)** | 13 / 13 / 13 |
| | Compress | 3.08 [3.01, 3.15] / 2.67 / 2.36 [2.32, 2.39] | −0.38 | carries | **0.30 (1/12) ; 2.36 (13/0)** | 13 / 13 / 13 |
| **mismatched** (`senseShift`, 3.6c: the senses only; the design at 6) | tall | 4.26 [3.89, 4.39] / 2.31 / 1.93 [1.83, 2.01] | −1.14 | carries | 2.33 (9/3) ; 10.49 (8/0) | 12 / 12 / 8 |
| | tuck | 3.73 [3.73, 3.79] / 2.90 / 2.33 [2.30, 2.37] | −0.68 | carries | 1.27 (6/4) ; 2.78 (12/0) | 10 / 13 / 12 |
| | Compress | 3.72 [3.70, 3.77] / 2.67 / 2.05 [2.01, 2.10] | −0.86 | carries | 1.11 (6/4) ; 5.73 (8/0) | 10 / 13 / 8 |
| **the second line** (`captureDelay`: `HumanBalance`'s own line, alone) | tall | 2.31 / 2.31 / 2.31 | +0.00 | does not carry | 1.00 (2/1) ; 1.00 (2/1) | 12 / 12 / 12 |
| | tuck | 2.91 / 2.90 / 2.87 | −0.02 | does not carry | 1.01 (7/4) ; 1.00 (7/4) | 13 / 13 / 13 |
| | Compress | 2.67 / 2.67 / 2.67 | +0.00 | does not carry | 1.00 (3/2) ; 1.00 (3/2) | 13 / 13 / 13 |

Snap and his way are in `results/q1-w1.md` (his way is Compress frame for frame on Big; Snap's matched shift is
*partly*, e +0.25, its swing 0.42 and 1.66). Window 2 gives the same verdicts in every row (matched e −0.57, −0.37,
−0.40; the second line ±0.02).

1. **The swing's frequency follows the delay as designed.** With the design, the filter, the predictor and the
   senses all moved together, the peak moves the same way in every stance and every ride's zero-crossing frequency
   with it (Compress 12 of 13 up at 4 ticks, 12 of 13 down at 8, the 13th unchanged), both intervals clear of off: the matched shift
   *carries* by 3.6c's rule. So **the builder's reading stands, in a weaker form**: the loop's delay sets the
   frequency, but with an elasticity of −0.36 to −0.45, about half of the mismatched shift's −0.68 to −1.14. The
   period is not simply a multiple of the delay; the rest of the frequency is the loop on the board (§4).
2. **The swing's size grows with the delay, one way.** Matched, 4 ticks take the swing down to 0.30 of itself in
   Compress (12 of 13 rides down; 0.37 tall, 0.50 the tuck) and 8 ticks up to 2.36 (13 of 13 up), with every ride
   standing through the window in every cell. The mismatched shift grew it *both* ways (×1.1–2.3 at −2 ticks). So
   3.6c's growth at −2 was the mismatch's (the coordinator's point holds for that half), and the delay's own effect
   is monotonic: the shorter the loop's delay, the smaller the swing.
3. **The second line is inert.** `HumanBalance`'s own 0.1 s line, moved alone to 4 and 8 ticks, moves no peak
   (±0.03 Hz) and no size (paired ratios 1.00–1.01). At his address it feeds only the knees' and arms' strategies
   (`HIP_CAPTURE_GAIN` = 0, §0.2 item 4), so this is as expected.
4. **My prediction 1 held**: the matched shift carries in Compress with e −0.38 (inside the predicted −0.3 to −1.0),
   the swing smaller at 4 ticks (0.30 < 0.9) and larger at 8 (2.36 > 1.3), and `captureDelay` inert.

## 2. Before any twin counts: the identity, the knobs, the known plant and the twins' controls

### 2.1 The identity and the knobs

- **The probe at identity** (§0.3; `ident.py`, `results/ident.txt`): Big seed 1, the five straight scripts, every knob
  off and no twins: 6,912 `f`, 30 `stand` and 65 `summary` rows identical to 3.6c's base run's for those scripts, row
  for row within each script (the files interleave the scripts in their own order). So 3.6c's base and `sense±2` runs
  are this round's references.
- **Each knob is what it says** (`knobcheck.ts`, `results/knobcheck.txt`): a design at `designDelay` 4 / 8 has
  `steps` 4 / 8 and a predictor of that length, its K and L bit for bit the shipped design's (the delay enters only the
  predictor and the line), and at 6 every matrix is bit for bit the shipped design's; a controller's estimate first
  moves on the 4th / 6th / 8th tick after a step in a sense (6 at −1). `captureDelay` 4 / 8 makes `sensedCapturePast`
  read a step 64 / 128 substeps (0.067 / 0.133 s) late, against 96 (0.1 s) off.

### 2.2 The known plant (§0.6; `known.ts`, `results/known-plant.md`)

The blended design at 7.0 m/s, 0.30 m, rail 0 (his weights) as its own plant, closed with the same
`PredictiveController`, four disturbed rides each with the same 50 twins, turned into the probe's rows and read by the
same `analyse.ts`:

| recovery | largest relative error |
| --- | --- |
| the zero twins against A | 0 (bit for bit) |
| the open loop C Φ^{j−1} Γ, from the open twins (32 sets, 1.5 s) | 1.7 × 10⁻¹³ |
| `closedLoop`'s response to the kick, from the closed twins (32 sets) | 7.7 × 10⁻¹³ |
| the reproduction of the closed twins from the open twins and the controller's map | 1.7 × 10⁻¹² (Ω), 1.5 × 10⁻¹² (senses) |
| the FIR loop on the model's own response (S1) against `closedLoop` | 4.5 × 10⁻¹⁵ |

So the pipeline (the kick's sign and tick, the replay, the per-unit scaling, the perturbation controller, the
closing) recovers a known plant and its closed loop to rounding. The same loop read by amendment 2's Prony mode: 2.46
Hz at ζ 0.75 on the known plant, against `closedLoop`'s own least damped mode in 1.5–5 Hz, 2.24 Hz at 0.76
(`results/readout-check.txt`).

### 2.3 The twins' controls (§0.4; `results/response.md`, "Controls")

*Canyon Big seeds 1–3, PERIODS 12, his address, knobs off; per stance 18 base rides stood (A reached its first
tick), each with its 50 twins (bundle sha1 `b91bb540…`). A set is one base ride × mode × channel × kick time, with its
three sizes; 144 per stance and mode.*

| control | Compress | tuck | tall |
| --- | --- | --- | --- |
| zero-kick twins bit for bit (every channel, every tick and frame, both modes) | 18 of 18 rides | 18 of 18 | 18 of 18 |
| sets complete (A and all three twins reach the kick tick) | 124 | 122 | 112 |
| equal to A bit for bit before the kick, and the held command less A's exactly δ at the kick tick | 124 of 124 | 122 of 122 | 112 of 112 |
| no clamp met by A or a twin over the window | 102 | 102 | 102 |
| standing through 1.0 s / 1.5 s after the kick | 106 / 102 | 106 / 102 | 96 / 94 |
| open loop: linear over 1.0 s (the stage table's sets), of those passing the rest | 65 of 102 | 69 of 102 | 61 of 94 |
| open loop: linear over 1.0 s and 1.5 s (the closings' sets, amendment 1) | 53 | 56 | 53 |
| closed loop: linear over 1.5 s | 68 of 102 | 61 of 102 | 75 of 94 |
| the median e_sym / e₂, open, 1.0 s, of the standing unclamped sets | 0.032 / 0.048 | 0.027 / 0.043 | 0.027 / 0.040 |
| the same, closed | 0.019 / 0.030 | 0.022 / 0.032 | 0.009 / 0.013 |

- **The twins are A until the kick, and the kick is what it says.** Every zero-kick twin is its ride bit for bit in
  both modes, every kicked twin is its ride bit for bit before the kick tick, and the held command differs from A's
  by exactly δ on the kicked channel and 0 on the other.
- **The clamps** (`maskReasons`, overlapping): in Compress, of the 124 complete sets, 22 meet the rest at the room's
  edge, 21 the twist past its range, 20 the controller's own clamp, 13 the rest past the hip's share, 5 the hip rotor at
  its torque and 3 a kicked twist past its limit; they are excluded (their causes were not read).
- **Linearity fails in about a third of the open sets and a quarter of the closed.** The second smoke ride (§5.3)
  showed that a fifth of δ does not cure it (e₂ 0.048 against 0.060): the failures are the ride's own non-smooth
  events, not the kick's size. They are excluded by the registered rule and counted.
- **§0.2 item 6 at run time:** the twins' lean and twist asked equal A's on every tick of every passing set (largest
  difference 0), and the rail 0 throughout (straight rides). The speed through the water differs by at most 0.038 m/s
  per kick of δ in Compress (0.15 tuck, 0.31 tall; largest over the 1.5 s window, either mode) and the
  depth by at most 0.00015 m (0.019 m tall, a knee drop): the gains' dependence on them is a second-order share the
  perturbation map leaves out.
- **The senses' map** (§0.5, on A's own ticks around the kicks, 14,928 ticks): φ̇ = y1 − y6 against the board's roll
  rate p, correlation 0.987, slope 0.98; r = y2 − y4 against −Ω, 0.857 and 0.73. So `p` is the model's +φ̇, and the
  sensed yaw rate (about the leg's line) and the world's Ω differ on the ride itself; the stage table below reads
  their transfer at the swing's frequency, where they agree within 7 %.

## 3. Question 2: the board's response as the balance sees it

*Open-loop twins (A's commands replayed, the kick on one command for one tick), per unit model-sign command, the
impulse responses' DFT over the 60 ticks after the kick at the stance's swing frequency (2.67 Hz Compress, 2.90 the
tuck, 2.31 tall) against the model's over the same 60 ticks (the blended design A's controller used at the kick
tick). Kick times tS 1.0, 1.5, 2.0, 2.5 s; the kicks' schedule speed median 9.1 m/s (0.5–11.9; 9 of 62 Compress kick
ticks below the schedule's 4 m/s), depth 0.30 m in Compress (0.445 the tuck, 0–0.02 tall), rail 0. `results/response.md`
has every entry and its quartiles.*

| stage and entry (measured / model at the swing's frequency) | Compress: gain ratio, phase difference (sets) | tuck | tall |
| --- | --- | --- | --- |
| (i) ankle command → the ankle's rest δ | 1.00, 0.0° (30) | 1.00, 0.0° (31) | 1.00, 0.0° (19) |
| (i) twist command → the twist's torque τ_a | 1.00, 0.0° (35) | 1.00, 0.0° (38) | 1.00, 0.0° (42) |
| (i) either → the hip's swing torque | 0 (no model state; idle) | 0 | 0 |
| (ii) δ → the board's roll φ | **2.75**, −6° | **2.05**, +62° | 0.81, **+97°** |
| (ii) δ → the body's bank θ | 1.29, −79° (no: spread) | 1.21, −92° (no: spread) | **0.48**, **+115°** |
| (ii) δ → the board's yaw rate r | **2.05**, **+44°** | **1.72**, **+58°** | **1.41**, **+38°** |
| (ii) δ → the slip β | **1.60**, +16° | **2.11**, **+37°** | **2.17**, −1° |
| (ii) δ → the twist θ_t | 1.29, **+99°** | 1.20, **+56°** | 1.15, **+78°** |
| (ii) δ → the upper body's yaw rate ω_u | **0.45**, **+84°** | 0.62, −32° (no) | **1.57**, +20° |
| (ii) τ_a → φ | **0.60**, **+100°** | 0.65, +5° (no) | **1.71**, **+49°** |
| (ii) τ_a → θ | 0.71, **+104°** | 0.74, −125° (no) | **2.21**, **+33°** |
| (ii) τ_a → r | 1.31, +14° (no) | **1.52**, +4° | 1.23, +10° (no) |
| (ii) τ_a → β | **3.88**, −28° | **2.22**, **−65°** | **2.60**, **−41°** |
| (ii) τ_a → θ_t | 1.17, +17° (no) | 1.02, +8° (no) | **0.65**, 0° |
| (ii) τ_a → ω_u | **0.78**, **+30°** | 1.05, +7° (no) | 1.03, −12° (no) |
| (iii) the sensed r (y2 − y4) against −Ω (ankle kicks / twist kicks) | 1.04, −5° / 1.03, −3° | 1.06, −10° / 1.05, −5° | 1.07, −4° / 1.01, −2° |
| (iii) the sensed φ̇ (y1 − y6) against p | 1.01, +2° / 1.02, +4° | 1.01, +3° / 0.99, +3° | 1.01, +2° / 1.07, +3° |

Bold: outside the registered band (gain 0.75–1.33, phase ±20°) with the same side in ≥ 75 % of the sets, which is the
rule for "departs"; "no" marks a median outside the band whose sets do not agree on the side.

1. **The response departs from the model at stage (ii), the actuators to the board and the body, and nowhere else.**
   - **Stage (i) is the model's to rounding:** per unit of command the ankle's rest and the twist's torque follow the
     model's 0.05 s lag exactly (gain 1.00, phase 0.0° in every set), and the hip's rotor is never asked (0 N·m), as
     the code facts of §0.2 item 3 say. My prediction 3 held.
   - **Stage (iii) is the model's within 7 % and 10°:** the senses read the board and the body as the model's C says,
     the leg's-line yaw rate and the roll axis included.
   - **Stage (ii) departs in every stance and on both channels:** the board's roll, yaw rate and slip and the body's
     bank, twist and upper-body yaw answer the ankle's rest and the twist's torque with gains of 0.45–3.9 times the
     model's and phases up to 100–115° off it at the swing's frequency.
2. **What the departure is like** (`shapes.ts`, `results/shapes.md`; *a descriptive addition, written after the stage
   table was first read*):
   - **The ankle rolls the board and the body faster and harder, and the roll comes back.** Per radian of rest asked,
     Compress: the body's bank rises 2–3 times as fast as the model's (0.115 against 0.047 rad at 0.15 s), peaks at
     0.35 s (21 ticks; the model's at 0.61 s), and is back through zero by 0.8 s, where the model's is then still near its
     peak; the board's roll the same (peak 22 ticks against 36.5). Tall, the same shape slower (peak 32 against 60).
   - **The board's heading answers the ankle at once.** Per radian of rest, Compress: the board's yaw rate is
     −0.38 rad/s after 3 ticks (0.05 s) where the model's is +0.007, and swings to +0.73 at 24 ticks: the hull's
     roll-to-yaw coupling is far stronger and faster than the model's.
   - **The twist's own joint is the model's at first.** Per N·m of twist torque, the upper body's yaw rate and the
     twist follow the model within 1–4 % for the first 12 ticks (0.2 s); the departure comes later, through the
     board's slip and roll (τ_a → β 2.2–3.9 times).
3. **The board's response also changes along a ride** (descriptive, `results/shapes.md` last table): the open
   responses at two kick times of the same ride differ by a median 26–65 % of themselves (ankle 0.53–0.65, twist
   0.26–0.45), against 9–27 % for the model's own schedule between the same ticks. The plant the balance rides is
   strongly time-varying along the swing; the model's moves far less.
4. **The model's response describes the board poorly overall:** over 1.5 s the largest difference between the
   measured and the model's open-loop sense responses is a median 1.01 of the model's largest (Compress, 65 sets;
   0.60 tall, 0.89 the tuck). **The blend is not the gap:** the blended design against `plantAt` at the exact speed,
   depth and rail differs by a median 0.002 of itself (0.003 tall, 0.001 tuck); at the 155 kick ticks at 4 m/s or more the
   largest is 0.072; the 24 below the schedule's lowest knot (4 m/s, where the blend holds the 4 m/s design) all
   exceed 0.09, up to 2.18 at 0.24 m/s (`blendgap.ts`, a check written after this table was read). Those slow kicks are
   in the medians above.
5. **My prediction 4 held in part:** the ankle column departs in roll in Compress and the tuck (φ 2.75 and 2.05), but
   the twist column departs too (τ_a → β 2.2–3.9; in Compress τ_a → φ, θ +100°), and tall's ankle departs in phase
   (+97°, +115°) rather than gain. The departure is the mechanics as a whole, not one channel.

## 4. Question 3: does the departure make the ring?

### 4.1 The reproduction of the closed twins (M4)

*Closed-loop twins (the balance live, the kick unknown to it): Ω's response per unit model-sign command, 1.5 s, read
by Prony's dominant mode in 1.5–5 Hz (amendment 2). The reproduction: the measured open-loop responses of both channels
at the same kick time closed with the controller's exact perturbation map (A's own speed, depth and rail per tick).*

| | Compress (38 sets) | tuck (37) | tall (26) |
| --- | --- | --- | --- |
| **the closed twins** (the game's own loop around its ride): pooled peak; Prony f; ζ; q₂ (medians) | 2.55 Hz; 2.56 Hz; **+0.019**; 0.79 | 2.84; 2.73; **+0.039**; 0.61 | 2.17; 2.13; **+0.058**; 0.48 |
| the model's own closed loop at the same ticks (S1) | —; 2.78; **0.727**; 0.000 | —; 3.25; **0.656**; 0.000 | —; 2.36; **0.806**; 0.000 |
| the reproduction: pooled peak; f; ζ; q₂ | 2.16; 2.70; −0.056; 2.03 | 2.89; 3.01; +0.011; 0.87 | 2.36; 2.20; −0.075; 2.57 |
| … the waveform error, Ω / the senses (median) | 1.58 / 1.51 | 0.88 / 0.79 | 2.17 / 1.96 |
| … sets passing (±0.15 Hz and ±25 % on q₂) | 2 of 38 | 1 of 37 | 0 of 26 |
| **reproduces** (registered) | **no** | **no** | **no** |

1. **The game's own loop rings and barely decays.** A one-tick nudge to either command, unknown to the balance, leaves
   a ring in the board's yaw rate at 2.56 Hz in Compress (2.73 the tuck, 2.13 tall) with a damping ratio of 0.02–0.06:
   two periods later it is still 0.79 of itself in Compress (0.61, 0.48). On the model, the same balance rings at
   2.4–3.3 Hz with ζ 0.66–0.81 and is gone within a period. This is the ring 3.6c measured, now as an impulse response:
   the frequencies sit within 0.1–0.2 Hz of 3.6c's swing peaks (2.67, 2.90, 2.31).
2. **The measured response, closed with the balance's own design, does not reproduce it within the registered
   tolerance.** It rings at the right frequency to 0.07–0.28 Hz (Prony 2.70 against 2.56 in Compress), but it is less
   damped than the twins (ζ −0.056 against +0.019: it grows), its pooled peak is off by 0.05–0.39 Hz, and its waveform
   misses the twins' by 0.9–2.2 of their size. The frozen design gives the same (Compress ζ −0.051), so it is not the
   controller's schedule. **My prediction 5's "the reproduction passes" was wrong.**
3. **The likely reason is the plant's time variation** (descriptive, §3 item 3): the closure assumes the response to a
   nudge at the kick tick is the response to a nudge at every later tick, and on the game's ride it changes by 26–65 %
   between kicks 0.5 s apart. A loop this close to its margin turns that error into the difference between ζ +0.02
   and −0.06. Not tested: it needs kicks at every tick of a window (an LTV closure), not four per ride.

### 4.2 The closings and the swaps (M4)

*The design frozen at the kick tick; Ω's response to a unit kick on either channel, 1.5 s; per (base, kick time) with
both open sets passing over 1.5 s; medians of Prony's ζ; share = how far a swap moves ζ from S0 to S1. `results/response.md`
has every closing's f, ζ quartiles, q₂ and the fit beside them.*

| closing | Compress: ζ (share) | tuck | tall |
| --- | --- | --- | --- |
| **S0, the measured response** (pooled peak; Prony f) | **−0.051** (2.39 Hz; 2.69) | **−0.014** (3.06; 2.99) | **−0.078** (2.37; 2.25) |
| **S1, the model's** (no in-band peak; Prony f) | **0.727** (—; 2.78) | **0.656** (—; 3.25) | **0.806** (—; 2.36) |
| (i) the actuators the model's | −0.051 (0.00) | −0.014 (0.00) | −0.078 (0.00) |
| **(ii) the mechanics the model's** | **0.727 (1.00)** | **0.656 (1.00)** | **0.807 (1.00)** |
| (iii) the senses of the board's own rates | −0.027 (0.03) | −0.009 (0.01) | −0.073 (0.01) |
| the ankle column the model's | 0.050 (0.13) | 0.111 (0.19) | 0.082 (0.18) |
| the twist column the model's | 0.047 (0.13) | 0.073 (0.13) | −0.082 (0.00) |
| ankle → roll senses | 0.026 (0.10) | 0.059 (0.11) | 0.067 (0.16) |
| ankle → yaw senses | −0.010 (0.05) | 0.028 (0.06) | −0.011 (0.07) |
| twist → roll senses | 0.064 (0.15) | 0.054 (0.10) | −0.013 (0.07) |
| twist → yaw senses | −0.010 (0.05) | −0.013 (0.00) | −0.070 (0.01) |
| the roll rows (y0, y1, y5, y6) | 0.207 (**0.33**) | 0.166 (0.27) | 0.121 (0.22) |
| the yaw rows (y2, y3, y4, Ω) | 0.004 (0.07) | 0.028 (0.06) | −0.035 (0.05) |
| responses | 40 | 42 | 28 |

S1's pooled spectrum has no peak inside 1.5–5 Hz in any stance (it falls through the band); the reader's first full
read extrapolated one (−3.19 Hz and so on) and was corrected to report none (§5.3); no rule reads it.

1. **The measured response makes the ring; the model's does not.** Closed with the balance's own design, the board as
   measured has its least damped 2–3 Hz mode at ζ −0.05 in Compress (−0.01 the tuck, −0.08 tall: growing), at
   2.69 Hz Prony (pooled peak 2.39; 2.99 and 2.25 for the other two), while the model's own response closed with the
   same design decays (ζ 0.66–0.81). By the registered rule (S0's ζ < 0.15 with its peak within ±0.3 Hz of the
   stance's swing, S1's ≥ 0.25) **yes, in all three stances** (Compress 2.39 against 2.67: 0.28 Hz).
2. **The departure that makes it is the mechanics (stage ii), as a whole.** Putting the model's mechanics back
   (driven by the measured actuators) removes all of the ring (share 1.00 in every stance); the actuators (0.00) and
   the sensing (0.01–0.03) remove none. **No smaller part carries half:** each command's column 0.00–0.19, each of the
   four blocks 0.00–0.16, the yaw rows 0.05–0.07; the roll rows carry the most, 0.22–0.33. So the ring is not one wrong
   derivative or one wrong channel; it is the board's and the body's roll and yaw together answering both commands
   unlike the model, with the roll side the larger share. **My prediction 5's "the ankle column carries the ring and
   the twist column does not" was wrong**: neither column carries it alone, and they carry equal shares in Compress.
3. **Why the frozen-design closure grows where the game holds at ζ ≈ 0** is §4.1 item 3: a lightly damped loop, a
   strongly time-varying plant. The ring in the game's own ride is a mode at the edge of stability, kept from growing
   by whatever nonlinearity the linear closure leaves out; the swing's size (3.6c's 5 deg/s std in Compress) is then
   that limit's, which is consistent with the ankle gain scaling it in proportion (3.6c) and with a shorter delay
   shrinking it to a third (§1).

### 4.3 The 4- and 8-tick prediction (M5)

*The measured response (6-tick rides) closed with the design rebuilt at 4 and 8 ticks (matched) and, secondarily, with
the 6-tick design and the senses shifted ±2; the predicted peak is the pooled spectrum of Ω's responses (registered),
with Prony's f beside it (no rule); against question 1's measured peaks (§1) and 3.6c's `senseShift` peaks.*

| | Compress: predicted pooled (Prony) / measured | tuck | tall |
| --- | --- | --- | --- |
| 4 ticks, matched | **2.51** (3.02) / 3.08 | **3.53** (3.47) / 3.26 | **2.56** (2.62) / 2.89 |
| 6 ticks (S0) | 2.39 (2.69) / 2.67 | 3.06 (2.99) / 2.90 | 2.37 (2.25) / 2.31 |
| 8 ticks, matched | 2.22 (2.42) / 2.36 | 2.69 (2.68) / 2.54 | 1.92 (2.01) / 2.11 |
| senses −2 (design 6) | **4.81** (3.93) / 3.72 | **4.26** (3.82) / 3.73 | 4.40 (3.47) / 4.26 |
| senses +2 (design 6) | 2.16 (2.17) / 2.05 | 2.42 (2.47) / 2.33 | 1.82 (1.90) / 1.93 |

Bold: outside ±0.25 Hz.

1. **By the registered line it does not predict**: the 8-tick and the +2 peaks fall within ±0.25 Hz in every stance,
   but the 4-tick peaks miss in all three (by 0.27–0.57 Hz) and the −2 peaks in two. **The order is right in every
   stance and on both knobs** (4 > 6 > 8, −2 > 0 > +2). My prediction 5's "within ±0.25 Hz" was wrong for the short
   delays.
2. **Prony's frequency, which is not the registered read-out, does better:** 10 of 12 within ±0.25 Hz (Compress 3.02
   against 3.08 at 4 ticks, 2.42 against 2.36 at 8; the misses tall at 4 ticks, 0.27, and tall at −2, 0.79). The
   pooled spectrum is broad where the predicted loop is better damped, which is the 4-tick side.
3. **The mismatch's own signature is in the measured response too:** at −2 the predicted pooled peak jumps to
   4.3–4.8 Hz and at +2 the loop grows fastest (ζ −0.07 to −0.18), as 3.6c's runs showed (3.7–4.3 Hz; the swing ×5.7
   at +2). The model's own loop with a 4- or 8-tick mismatch had its least damped mode at 4.9 or 7.0 Hz (`5d832318`);
   the measured response puts it where the game does.

### 4.4 Predictions against the result (§0.8)

| # | prediction | result |
| --- | --- | --- |
| 1 | the matched shift carries in Compress (e −0.3 to −1.0), smaller at 4, larger at 8; `captureDelay` inert | **held** (e −0.38; 0.30 and 2.36; inert) |
| 2 | the twins' controls pass; linearity in ≥ 80 % of the sets | zero twins and pre-kick **held**; linearity **missed** (64 % open, 67 % closed in Compress over 1.0 s and 1.5 s) |
| 3 | stage (i) within 2 % and 2° | **held** (1.00, 0.0°) |
| 4 | stage (ii) departs on the ankle column in roll (> 1.33 on φ and θ), the twist column within the band on r and ω_u | **partly**: φ 2.75 (θ 1.29, spread); the twist column departs too (β 3.9; Compress ω_u 0.78 at +30°) |
| 5 | the measured response rings at 2.4–3.0 Hz with ζ < 0.15 in Compress, the model's ≥ 0.3; the reproduction passes; the ankle column carries the ring and the twist column not; the 4/8 predictions within ±0.25 Hz | ring **held** (2.69 Hz, ζ −0.05; model 0.73); reproduction **missed**; the columns **missed** (0.13 each; only the mechanics as a whole carries it); predictions **missed** at 4 ticks (order held) |

## 5. Controls (knobs off unless stated)

| control | result |
| --- | --- |
| The probe at identity, Big seed 1, the five straight scripts (§2.1) | 6,912 `f`, 30 `stand`, 65 `summary` rows identical to 3.6c's base run (`results/ident.txt`) |
| Knobs off, quick report, after the `src` change (`ed9ab674`), 10:12–10:24 UTC, 11.3 min | exit 0, 0 regressions, 0 improvements; **26 of 26** ride lines identical to `baseline-quick.json` (3.6c's `same.py`; `results/report-quick.txt`) |
| Knobs off, full report, before the report (the same `src`), 11:13:47–11:44 UTC, 30.0 min, 4 at once beside the last twin runs | exit 0, 0 regressions, 0 improvements; **227 of 227** ride lines identical to `baseline-full.json`, and its 26 test-wave rides identical to `baseline-quick.json`'s 26 (`results/report-full.txt`) |
| The Canyon byte check (`ed9ab674`'s `src`, knobs off) | snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`: **identical** (`results/byte-check.txt`) |
| `npx tsc -b` | clean |
| The gain lock, `npx vitest run src/physics/stabilityGains` | **5 of 5** |
| The touched files' tests (`humanBalance`, `predictiveBalance`, `yawLedgerClosed`, by path filter) | 54 passed, 0 failing |
| Each knob is what it says (`knobcheck.ts`) | §2.1 |
| The twins' controls and the known plant | §2.2, §2.3 |
| No address reads a knob | `git grep -l 'WOBBLE\|wobbleKnobs' -- src scripts`: `AttachedRider.ts`, `BoardBody.ts` (3.6c's guarded uses), `humanBalance.ts`, `predictiveBalance.ts`, `wobbleKnobs.ts`, all in `src/physics`; no entry file, option, address switch or saved setting; only the probe and the readers write a field |
| `git diff 5f69e9dc --stat -- src scripts` | `src/physics/humanBalance.ts`, `src/physics/predictiveBalance.ts`, `src/physics/wobbleKnobs.ts` only (§5.2) |

### 5.2 The `src` change and its knobs

One commit, `ed9ab674`, diagnostic only:
- `wobbleKnobs.ts`: two fields, `designDelay: -1` and `captureDelay: -1`, and `wobbleOff()` checks them.
- `predictiveBalance.ts` (`scheduledDesign`): at `designDelay` −1 the shipped key and the shipped `design(y, t, w)`
  calls; otherwise the ticks in the key and `design(…, designDelay × CONTROL_STEP)` (both the design and the padded
  gains' design).
- `humanBalance.ts`: at `captureDelay` −1 the shipped span (`BALANCE_DELAY + 0.02`) and the shipped read time
  (`clock − BALANCE_DELAY`) through one private `sensedAt()`; otherwise the span widened and the line read
  `captureDelay / 60` s late. Its five readers call `sensedAt()`.
- The kick and the replay are not in `src`: they are the probe's wrapper of `PredictiveController.prototype.tick`.

## 6. For Vicente, and what is still open

**What drifts the board left and right, one level down from 3.6c.** 3.6c found the drift is the balance's own
oscillation. This round measured the board the balance actually rides, by nudging its commands for a single tick and
watching a twin ride that differs only by that nudge, and set it beside the board the balance believes it rides:
- **The muscles do what the balance thinks** (the ankle's rest and the hips' twist follow its commands exactly as its
  model says), **and the senses tell it what is there.**
- **The board and the body do not answer as its model says.** Per nudge of the ankle the board and the body roll two
  to three times as fast, peak in about a third of a second instead of six tenths, and swing back; the heading jumps
  within a twentieth of a second, where the model says it barely moves; and the board's sideways slip answers both
  commands two to four times as much. That answer also changes by a quarter to two thirds from one moment of the ride to the next.
- **On the board as measured, the balance's own gains leave a 2.2–3 Hz mode undamped**, and in the game itself a nudge
  rings at that frequency and has barely faded after two swings (in Compress it keeps 79 % of itself). On its own
  model the same balance damps the nudge within one swing. That is why it rings in the game and not in the tests.
- **No single part of the board's answer is to blame.** Putting back the model's roll answer alone takes away a
  third of the ring at most; either command's answer alone, a fifth. It is the board and the body as a whole.
- **The delay matters as designed.** Rebuilding the balance for a shorter reaction time (0.067 s instead of 0.1) makes
  the swing a third of its size in Compress (a half in the tuck) and raises it from 2.7 to 3.1 Hz; a longer one (0.133
  s) makes it 2.4 times as large and lower (2.4 Hz). The delay is a human's reaction time, set on purpose, so this is a
  measurement of how much margin the loop has, not a proposal to shorten it.

**No change is proposed.** This round only measured. What it suggests, each needing Vicente's word before any build:
1. **The balance's internal model of the board is the thing to fix**, not its gains, its delay or the steer: its
   mechanics (the board's roll, heading and slip as the ankle and the twist move them) are far from the board the game
   rides, and closing the loop on the measured board reproduces the ring. A model rebuilt from these measurements is
   the candidate; it needs an identification that the measured responses' time variation does not defeat (below).
2. **A shorter designed delay shrinks the swing in proportion** (×0.30 at 4 ticks in Compress, every ride standing
   through the window): reported as a measurement of the margin, not proposed.
3. **The second sensing line is inert** at his address (it feeds only the knees' and arms' moves).

**What I could not settle, and what I would test next.**
- **The reproduction failed its tolerance.** The measured response closed with the design rings at the right
  frequency but grows (ζ −0.05) where the game's own loop holds at ζ +0.02. I attribute it to the board's response
  changing along the ride (by 26–65 % between kicks 0.5 s apart), which an LTI closure cannot carry; this is not
  tested. Next: kicks at every tick of a 1.5 s window on a few rides (an LTV closure), which the same probe supports
  with a longer kick list.
- **Which part of the mechanics, precisely.** The swaps only bound it: the roll rows carry 22–33 %, each column
  13–19 %. Next: swap the model's water derivatives and body terms one at a time inside `plantAt` (the grey-box
  route 3.6a part 2 took, now with clean responses from the twins instead of closed-loop ticks) and refit the twelve
  water derivatives to the measured responses, read blind on held-out kicks.
- **A third of the open sets and a quarter of the closed fail linearity**, and a smaller kick does not help: the
  rides' own non-smooth events (contact, the settle iterations) sit inside the windows. They are excluded, not
  explained.
- **The 4-tick prediction misses** by 0.27–0.57 Hz on the registered read-out (Prony's frequency is within 0.25 Hz in
  10 of 12 cases), which is the better-damped side where a pooled spectrum is broad.
### 5.3 The order of the round (UTC, 2026-11-26)

| time | step |
| --- | --- |
| about 10:05 | Vicente approves the probe-only nudges ("Yes, use the nudges", relayed by the coordinator) |
| 10:10:44 | **the brief, verbatim, and the pre-registration** (`48fac216`), before any run |
| 10:11:59 | the `src` change, on its own (`ed9ab674`: `designDelay`, `captureDelay`) |
| 10:12–10:24 | the quick report, knobs off (26 of 26 identical); the byte check (identical) |
| 10:16–10:22 | a pipeline smoke ride (Big seed 1, PERIODS 3, a development bundle of the probe as it was then committed): no wave stood; its `control` and `summary` rows read |
| 10:17 | the knob check (`results/knobcheck.txt`) |
| 10:18:41 | the probe, its runner and the knob check as run (`71a13f6d`; bundle sha1 `b91bb540…`, used by every run of the round) |
| 10:18:49 | the identity run and the question 1 runs start |
| 10:19:03 | **amendment 1** (`549952d3`) |
| 10:21–10:28 | the readers written and tested on the known plant only; the damped sinusoid found to misread it |
| 10:26:52 | the three twin runs start (Big seeds 1–3); a second smoke ride (PERIODS 6) |
| 10:28:58 | **amendment 2** and the readers frozen (`5d0c3483`; the read-out check `41119815`) |
| 10:35–10:38 | the identity control: first read as one interleaved stream (it differs at row 0 only because the scripts are stepped in another order), then per script: identical (`78f7e425`) |
| 10:38 | the second smoke ride's controls read (one standing Compress ride): zero twins bit for bit, pre-kick 8 of 8, held 8 of 8, no clamp; linearity passed in 4 of 8 open and 5 of 8 closed sets (median e_sym 0.053 open) |
| 10:39–10:51 | the same ride at δ / 5 (`DELTA_A=0.001`, `DELTA_T=0.2`): 5 of 8 open and 5 of 8 closed, median e_sym 0.020 / 0.015 but e₂ 0.048 open: the failures do not scale away with δ (they are the ride's own non-smooth events), so δ stays as registered, no amendment |
| 10:52 | the first game responses read, with the frozen readers, on the twin runs' first 6–7 waves per seed |
| 10:54 | `shapes.ts`, a descriptive reader of the open responses' shapes and their change along a ride (written after the stage table was read; §3 labels it) |
| 11:13 | question 1's twelve runs done (870–1,154 s each, 13 or 16 waves); `freq.py` and `q1.py` read them (`6ef61eaf`, 11:14:30) |
| 11:13:47 | the full report starts, knobs off, once the question 1 runs are done |
| 11:20–11:27 | the twin runs done (2,799, 3,599 and 3,120 s; 13, 16 and 13 waves); the frozen readers on all of them (35 s) |
| 11:29–11:30 | **a correction after that first full read**, in the read-out of no rule: the pooled peak's parabola on a spectrum with no peak inside 1.5–5 Hz (the model's own closings, S1) returned −3.19, 1.05 and −0.85 Hz; it now reports none (—). On the known plant, whose every spectrum has none, the reproduction's peak criterion then reads "none against none" as met (it had compared two extrapolations). Every other number in `results/response.md` is unchanged (`diff` before and after) |
| 11:33 | the archive (`runs/twins.tar.gz`, `runs/q1.tar.gz`), checked: the slim twins give `results/response.md` and `results/shapes.md` again line for line, and the slim question 1 runs `results/freq-w1.md`; `tsc`, the gain lock, the touched files' tests |
| 11:44 | the full report done: exit 0, 0 regressions, 227 of 227 identical |

## 7. Where everything is, and how to recompute it

- **The raw runs** (the session scratchpad):
  `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36d/`:
  `twins/big_s{1,2,3}.jsonl` (the twin runs: A's `f`/`o`/`w` rows, every twin's `kick` row with its ledger
  differences, the `kbase` rows), `q1/<setting>/big_s{1,2,3}.jsonl`, `ident/big_s1.jsonl`, `smoke/` (the three
  pipeline rides), `rep/q-off`, `rep/f-off` (the stability reports), `byte/` (the byte check), the logs beside them,
  and `bin/response-probe-71a13f6d.mjs` (the probe bundle every run used, sha1 `b91bb540…`).
- **Archived here** (`runs/`): `twins.tar.gz` (`slim.py`: `o` and `w` rows dropped, `f` rows cut to `freq.py`'s
  fields, `kick` rows without their ledger arrays `e`) and `q1.tar.gz` (the question 1 runs and the identity run, the
  same slimming). Every table in `results/` recomputes from them; 3.6c's base run and `sense±2` runs, which `freq.py`
  needs as the reference, are 3.6c's own archive (`../wobble/runs/base.tar.gz`, `knobs.tar.gz`).
- **The probe:** `response-probe.ts` (bundle with `rolldown … --format esm --platform node`), driven by
  `run.py --set ident|q1|twins`; `knobcheck.ts` (control 3).
- **The readers:** `ident.py` (the identity), 3.6c's `../wobble/freq.py` with `q1.py` (question 1), and, bundled with
  `globalThis.location = { search: '' };` prepended: `response.ts` (the twins: controls, stage table, model, closings,
  reproduction, predictions; on `responseLib.ts` and `analyse.ts`), `known.ts` (the known plant, through the same
  `analyse.ts`), `readoutcheck.ts` (amendment 2's check), `shapes.ts` (descriptive).
  - `node response.mjs results/response.md results/q1-w1.json <twins dir>`
  - `node known.mjs results/known-plant.md`; `node shapes.mjs results/shapes.md <twins dir>`
  - `python3 -I ../wobble/freq.py <36c base> <knob dir> --md results/freq-w1.md` then `python3 -I q1.py …`
- **The results:** `results/*.md`, `results/q1-w1.json`, `results/knobcheck.txt`, `results/byte-check.txt`,
  `results/ident.txt`, `results/readout-check.txt`, `results/report-quick.txt`, `results/report-full.txt`.
