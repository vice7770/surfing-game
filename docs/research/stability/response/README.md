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

1. *2026-11-26 about 10:20 UTC, before any twin row is read:* the closing (§0.6) uses the open-loop responses to 90
   ticks, so an open set that feeds a closing must also stand through 1.5 s and pass the linearity line over 1.5 s
   as well as over the registered 1.0 s. The stage table keeps the registered 1.0 s. The smoke ride used to test the
   pipeline (Big seed 1, PERIODS 3, Compress with its twins) is read for its controls only (the zero twins, the
   pre-kick equality, the held difference at the kick, the masks, the linearity numbers), never for a response; the
   readers are tested on the known plant (§0.6) and committed before any game response is read.
2. *2026-11-26 about 10:32 UTC, before any twin row of the game is read (the readers run only on the known plant so
   far):* **the decay's read-out is Prony's, not the damped sinusoid's.** On the known plant (the design at 7 m/s,
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
