# Step 3.5h — the uncommanded weave: the stale sense is refuted, the gains are re-weighted by a 46° torso nobody asked for, and the energy comes in through the ankle

**The owner's complaint, in his own words.** He rode `claude/ride-everything` and reported, in **tall, crouch and
Compress alike**: *"the board starts going left and right and the surfer cannot stabilize it and falls. Like a skate
board going down the lane"*, and *"there should not really be a difficulty keeping the board stable."* He has since
clarified: *"weaving start starts on its own, no turn needed."*

⚠️ **His ride is a feel report and not a zero-input measurement.** The sampled gamepad values in it are unknown; his
pad could have been contributing something he did not intend, and this week's Compress finding shows the input layer
can differ from what a player believes he asked for. **The clean zero-command comparison is the saved `cue` trace —
zero steer and zero asked lean, measured at `0.0000°` on every one of 682 ticks — and every number in this file is
from that.** The two are kept apart throughout, and his ride is never quoted as a zero-input trace.

**The acceptance condition this file is scored against** (the coordinator's, adopted):

> With the steering centred after standing, an incidental roll should **settle** — without repeated rail-to-rail or
> course reversals that need countersteering to stop — while a deliberate rail input **still starts a turn**.

⚠️ **It has two halves and only the first is measured here.** Every row below is the `cue` script, so nothing in this
file says whether a deliberate rail input still turns the board. **A change that settled the roll by making a rail
input stop turning would pass this file and fail the condition.**

---

## 0. The answers, in the order they were asked

| the question | the answer |
| --- | --- |
| **Does the stale-sense / present-design mismatch produce the command?** | ⛔ **No. Refuted on all four waves, on matched observations, with two bit-identical positive controls.** Propagating the 0.1 s-old sense with the design in force when it was *taken* leaves the 15.59° one-tick jump intact — **16.40°, slightly larger** — and freezing both design tables for the whole ride leaves it at **15.22°**. |
| **Then what in that file does?** | ⭐⭐ **The feedback COEFFICIENTS being re-weighted as the operating point moves.** Freezing the gain row alone cuts wave 1's jump from **15.595° to 3.141°** with the command's own span preserved, and an independent exact decomposition attributes **+14.228° of the +15.595° to changing coefficients and only +1.374° to changing state — 91 % gains — of which +14.217° is the SPEED axis.** Two methods, one answer. |
| ⭐⭐ **Then why does wave 6 stay flat with a BIGGER speed jump?** | ⭐⭐ **Because the state those coefficients re-weight is the TORSO, and wave 6 has not got one.** At the spike the coefficients on upper-body yaw rate contribute +5.717° and on torso twist +4.586°. **Wave 1's torso is wound to 46.07° at that tick (peak 51.10°) with 0.0000° of twist ever requested; waves 2, 6 and 11 stay inside 11.16°.** Upper-body yaw rate peaks at **218.33 °/s** against 20.99 / 68.39 / 34.42. |
| **Which forces add energy to the roll, and which oppose it?** | ⭐⭐ **On the heeling half-cycle, on all four waves, the hull, the water and the foils all OPPOSE the roll and the rider's coupling is the only source** (its power is 13–108× the largest non-rider positive). ⚠️ **Over the WHOLE ride two non-rider entries are positive** — wave 1's foils at **+0.156 J** and wave 2's hull at **+0.077 J** — so the honest statement is a **net roll-channel transfer with a residual**, not "every water term is negative". The parts close to the board's own angular impulse at **≤ 3.6 × 10⁻⁷ J**. |
| **Does that separate generation from response?** | ⚠️ **Partly, and less than it looks.** A rider *opposing* a roll would do negative work, and it does positive work while the water does the negative work — so **the water is not driving the roll at the moment measured.** ⛔ **But a positive return can follow an initial water disturbance**, and nothing here says what displaced the board first. **The energy split must NOT be read as proving the controller originates the weave.** |
| **Which channel of the rider?** | ⭐⭐ **The ankle.** On the heading's own roll axis the bank ledger's exact partition gives the ankle **+23.74 J** on wave 1 against the roll ledger's independent residual of **+23.88 J** — two instruments, two partitions, **0.6 % apart**. Inside the ankle, **the commanded rest term pumps +75.54 J and the ankle's own damper removes −63.33 J.** |

---

## 1. The instrument, and why nothing under `src/` moved

`git diff claude/the-record -- src/` is **empty**. Four files are added under `docs/research/new-rider/3.5/` and
nothing else:

| file | what it is |
| --- | --- |
| `weave-split.ts` | `3.5/cap-terms.ts` copied **verbatim** and extended with peek-only columns. Two statics that already ship are switched on, and the controller's own tick arguments are recorded by a wrapper on the **probe's** side. |
| `weave-replay.ts` | the offline, matched-observation replay of the controller. Reads the recorded ticks; simulates nothing. |
| `weave-read.py` | the reader. Computes nothing about the physics: every column is the game's own ledger. |
| `weave.md` | this file. |

### The two observers were already in `src/`, with their own inertness tests

* **`BoardBody.rollLedger`** (step 3.3h, `BoardBody.ts:375`) — *"a measurement tool and not part of the sim"*. Its
  own test asserts it *"is off by default and changes nothing about the board when it is on"* (`rollLedger.test.ts`).
* **`bankLedger.on`** (step 3.3l, `bankLedger.ts:178`) — its own test asserts *"the trajectory is identical to the
  digit with it on and off"* (`bankLedger.test.ts:171`).
* **`AttachedRider.ankleLedger`** (step 3.3i) — the parent probe already switches this on.

### The tick wrapper is mine and has no shipped test, so it is controlled by REPRODUCTION

`AttachedRider` calls `this.predictor.tick(sense, speed, yawDepth, −leanAsked, −twistAsked, limits, rail, faceTilt)`
once per control step [R, `AttachedRider.ts:3724`], and **every one of those eight is a local at that call site** —
none is a field a probe can read afterwards. The probe therefore shadows the method **on the instance**; the wrapper's
only statements are a record before and after calling the original with the same arguments and returning what it
returned.

⭐ **Its inertness, and the wave selection's, are established together against an independent earlier run**
(`w211.jsonl`, from `cap-terms.ts`, 3 scripts, a rider on every crest, no wrapper and no ledgers):

| `cue` wave | roll peak-to-peak — **w211** | **this run** | fell after the stand — **w211** | **this run** |
| --- | --- | --- | --- | --- |
| 1 | 24.30° | **24.30°** | — (survives) | **—** |
| 2 | 3.49° | **3.49°** | — | **—** |
| 6 | 2.89° | **2.89°** | 2.300 s | **2.300 s** |
| 11 | 1.79° | **1.79°** | — | **—** |

**Four waves, every figure identical to the digit.** That covers the two ledgers, the tick wrapper, and `WAVES=`
(which places riders on four crests only and lets the sea run on — the parent's own note that *the riders never push
the water and never see each other* is what allows it, and this table is what confirms it).

⚠️ **One provenance note, stated rather than hidden.** The committed `weave-split.ts` removes a duplicate `wetted`
column that the run's own binary emitted; the parent emits `wetted` at the identical expression on a later line and
that later line won, so **every emitted value is unchanged** and only the key's position in the JSON moves. Also
rewritten: one comment. No other difference.

---

## 2. Part 1 — the stale-sense / present-design mismatch. ⛔ REFUTED.

### 2.1 What the suspect line actually does

```ts
const d = this.blend(speed, depth, rail);                 // the design at the speed the board has NOW
...
const yk  = this.senses[this.senses.length - 1 - N];      // the sense from N ticks (0.1 s) AGO
const old = this.commands[this.commands.length - 1 - N];  // the command from N ticks ago
// and `yk` and `old` are then propagated through d.phiE / d.gammaE / d.cE / d.l — all from `d`.
```

[R, `predictiveBalance.ts:1531–1578`]. So **a measurement taken 0.1 s ago is propagated by a model built for the
speed the board has now.** `N` is `Design.steps` = `round(PREDICT_DELAY / CONTROL_STEP)` = **6 ticks**, and it is the
same for every design because `delay` and `step` come from the weights and not from the speed [R, `:1202`].

### 2.2 The matched-observation design, which is the only version that isolates the schedule

Every arm is fed **the same saved tick inputs in the same order**, so the arms differ in the design table and in
nothing else. **No arm re-simulates** — a re-simulation would change the state the next tick sees and the comparison
would no longer be of the schedule. The tick has **three independent blocks**, and each arm moves one:

| arm | estimator (`phiE`, `gammaE`, `cE`, `l`) | predictor (`phiN`, `pred`, `predD`) | gain `k`, reference |
| --- | --- | --- | --- |
| `ships` | the design at the speed **NOW** | NOW | NOW |
| `harness` | NOW, through this round's own rewrite of `tick` | NOW | NOW |
| **`estThen`** — the hypothesis | **the design at the speed the sense was TAKEN at** | NOW | NOW |
| **`chainThen`** | **TAKEN** | **TAKEN** | NOW |
| **`frozTbl`** | **one FIXED design for the whole ride** | **FIXED** | NOW |
| **`gain@med` / `@lo` / `@hi`** | NOW | NOW | **FIXED, at the ride's median / lowest / highest speed** |

**Both positive controls passed bit-identically on all four waves**, which is what makes the counterfactuals readable:

* `ships` reproduced the recorded `u0`, `u1` and `raw0` with a maximum difference of **0.0e+0** — it is the real
  `PredictiveController.tick` fed the real inputs, so any difference would have been a harness fault.
* `harness` — the same arithmetic by a different route, with the historical design set equal to the current one —
  equalled `ships` to **0.0e+0**. Without this, `estThen` would measure the rewrite's bug and not the schedule.

The weights are the shipped ones, read off a **live** rider built on the owner's own address through the game's own
switch parsing, not retyped:
`{"stateScale":[0.05,0.5,0.05,0.25,0.2,0.02,0.5,1],"commandScale":[0.09,30],"rho":10,"processNoise":[2,1,1,0.2,1],"senseNoise":[0.017,0.009,0.017,0.017,0.05,0.009,0.02],"bias":[0.01,5],"heaveSense":false,"stanceDeep":true,"riderBody":"two"}`,
`turn: 'tan'`.

### 2.3 ⛔ The result: every figure is the largest ONE-TICK jump in the ankle command, degrees

| `cue` wave | ticks | **`ships`** | **`estThen`** | `chainThen` | **`frozTbl`** | `gain@med` | `gain@hi` | `gain@lo` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1** (weaves 24.3°) | 182 | **15.595** | ⛔ **16.396** | 15.318 | ⛔ **15.219** | ⭐ **3.141** | ⭐ **3.392** | 8.873 |
| 2 (settles) | 182 | 1.940 | ⛔ 1.958 | 2.213 | 1.221 | ⚠️ 2.408 | 2.075 | 2.705 |
| 6 (settles, falls) | 139 | 4.751 | 4.613 | 3.926 | 4.735 | 3.398 | 2.955 | ⚠️ 9.110 |
| 11 (settles) | 181 | 1.393 | ⛔ 1.513 | 1.423 | 0.976 | ⚠️ 2.179 | 1.819 | 1.768 |

**1. ⛔ The hypothesis is refuted.** `estThen` is **larger** than `ships` on **3 of the 4 waves** (16.396 vs 15.595;
1.958 vs 1.940; 1.513 vs 1.393) and 3 % lower on wave 6. A mechanism that produced the command would have to shrink
when it is removed. It does not.

**2. ⛔ And it is not the design tables in any form.** `frozTbl` — the estimator's and the predictor's tables frozen
at one speed for the whole ride — leaves wave 1's jump at **15.219°** against 15.595°. **So no version of the delay
chain's schedule, re-timed or removed, produced that command.**

**3. ⭐⭐ The GAIN ROW does cut it, and an independent method puts a number on exactly how much.** On wave 1, freezing
`k` drops the jump to **3.141°** and **3.392°** at two of three fixed points, **with the command's own span
preserved** (19.4–21.5° against the shipped 25.3°) — a smoother command, not a smaller one. ⛔ On waves 2, 6 and 11
freezing `k` is no better or worse, because those boards are flat and there is nothing for a coefficient to
re-weight.

⭐⭐ **And the reviewer's own replay — all 684 saved ticks through the combined production controller, max raw ankle
mismatch ZERO on all four waves, references zero — decomposes the same spike exactly.** At `+1.533 s` the raw ankle
target moves **−13.491° → +2.104°**, and a two-tick midpoint decomposition of the actual `−raw[0]` attributes:

| contribution to the +15.595° step | degrees |
| --- | --- |
| ⭐ **changing feedback COEFFICIENTS** | ⭐ **+14.228** |
| changing estimated body/board state | +1.374 |
| bias | −0.007 |
| **total** | **+15.595** |

**and splitting the coefficient term across the operating point: +14.217° on the SPEED axis, +0.011° on depth.**

> ⭐⭐ **91 % gains, 9 % state — so it IS the speed schedule, but not by the stale-propagation mechanism this round
> was handed. The gains themselves are re-weighted as the operating point moves.** My frozen-gain arm (−12.45° of the
> jump) and the reviewer's decomposition (+14.228° of it) are two different instruments on the same tick and they
> agree on which block of the controller it is. ⚠️ **The suspect file was right; the mechanism inside it was the
> wrong shape, and that was my framing to correct.**

**And the gain arms differ from `ships` in `k` alone — measured, not assumed.** `tick` solves the reference from the
same design as the gain, so freezing one would normally freeze both. On the `cue` script the ask is **0.0000° on
every tick**, `steadyTurn` on a zero ask gives the zero equilibrium, and the `'tan'` correction is gated off by
`|bankAsked| > 1e-6` — so **the reference is not all zeros on 0 of 682 ticks.** The replay counts this and prints it.

### 2.4 ⭐⭐⭐ THE DISCRIMINATOR: WAVE 1'S TORSO IS WOUND TO 51° WITH NOTHING ASKED OF IT

**This is the centre of the round.** The coefficients that do the +14.228° are not generic: inside that term, the
coefficients on **upper-body yaw rate** contribute **+5.717°** and on **torso twist** **+4.586°** — 10.3° of the
14.2°. So the question becomes *what state is there for them to re-weight*, and the four waves answer it.

**Measured off the controller's own recorded sense vector** — `sense[2] = −upper` (upper-body yaw **rate**) and
`sense[3] = −tb.angle` (torso **twist** angle) [R, `AttachedRider.ts:3708–3711`], in `predictiveBalance`'s own
negated signs, converted to degrees exactly once:

| `cue` wave | ⭐ **torso twist, median** | ⭐ **torso twist, PEAK** | **at the spike tick** | upper-body yaw rate, median | ⭐ **PEAK** | twist REQUESTED, max |
| --- | --- | --- | --- | --- | --- | --- |
| **1** | **8.54°** | ⭐ **51.10°** | ⭐ **46.07°** at **t+1.5333** | **35.93 °/s** | ⭐ **218.33 °/s** | **0.0000°** |
| 2 | 3.38° | 10.86° | 0.09° at t+0.1000 | 6.29 | 20.99 | **0.0000°** |
| **6** | 2.99° | **11.16°** | 0.05° at t+0.1167 | 14.24 | 68.39 | **0.0000°** |
| 11 | 1.49° | 5.91° | 0.04° at t+0.1000 | 2.45 | 34.42 | **0.0000°** |

> ⭐⭐⭐ **Wave 1 winds its torso to 51.10° — 46.07° at the very tick the command reverses — with ZERO twist ever
> requested, on any wave, on any tick. The three waves that settle never pass 11.16°.** A **4.6×** separation in the
> angle and **3.2–10.4×** in the rate, where the speed, its span, the wetted area, the face tilt and the course
> reversals all separate nothing (§3.8).
>
> ⭐ **This is what answers wave 6.** Wave 6's schedule crosses almost the same speed and jitters it 2.1× harder, and
> **its torso is at 4.5° instead of 46°** — so the re-weighted coefficients have nothing to multiply and the ankle
> command moves 3.3× less. **The speed change was never the discriminator; the state it multiplies is.**
>
> ⭐ **Independently reproduced.** The reviewer's replay reports 46.1° at that tick against 4.5° on wave 6; this
> round's own read of the same saved senses gives **46.07°** and **4.5°** — agreement to 0.03°, by two routes.

⚠️ **Note where each wave's largest jump falls.** Wave 1's is at **t+1.5333 s**, mid-ride. Waves 2, 6 and 11 have
theirs at **t+0.10–0.12 s** — the first ticks, a start-up transient. **So only wave 1 has a mid-ride command event at
all**, and comparing its 15.6° against their 1.4–4.8° is comparing a mid-ride reversal against a start-up.

### 2.4b ⛔ And the schedule's own jitter is LARGEST on a wave that stays flat

This is wave 6 doing to my own follow-up what it did to the original hypothesis, and it is why §2.4 and not the
jitter is the discriminator.

| `cue` wave | largest one-tick move in the speed fed to `blend` | largest one-tick move in the ankle gain row's norm | that row's range over the ride | the command's own jump |
| --- | --- | --- | --- | --- |
| 1 | 0.627 m/s | 0.83 | 1.0 – 2.9 | **15.595°** |
| 2 | 0.461 | 0.56 | 1.0 – 2.2 | 1.940° |
| ⛔ **6** | ⛔ **1.285 m/s** | ⛔ **1.29** | 1.0 – 2.9 | **4.751°** |
| 11 | 0.553 | 0.54 | 1.0 – 2.6 | 1.393° |

> ⛔ **Wave 6 jitters its scheduling speed 2.1× harder than wave 1 and its gain row 1.6× harder, and its command
> jumps 3.3× LESS and its deck stays inside 2.89°.** So the gain's jitter is present, is larger on a flat wave, and
> **cannot be the cause of the weave.** It is the multiplier of §2.3 note 3 and nothing more.

**The jitter's own source, decomposed on the engine's own expression.** `speedThrough` is
`(boardVelocity · forward) − (waterFlow · forward_xz)` [R, `AttachedRider.ts:3714`]; the probe rebuilds it term by
term and reproduces the engine's stored value on **682 of 682 frames**:

| `cue` wave | the engine's own `speedThrough` | the probe's rebuild | **the board term** | **the flow term** | implied rate |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.534 m/s | 0.534 | 0.223 | ⭐ **0.580** | 32.1 m/s² |
| 2 | 0.480 | 0.480 | ⭐ **0.473** | 0.030 | 28.8 |
| 6 | 1.315 | 1.315 | 0.332 | ⭐ **1.329** | **78.9** |
| 11 | 0.437 | 0.437 | ⭐ **0.432** | 0.036 | 26.2 |

> ⭐ **A board cannot accelerate at 32–79 m/s²; a sampled flow can change that fast.** On waves **1 and 6** the jitter
> is the **sampled water flow** (0.580 and 1.329 m/s per tick against the board's 0.223 and 0.332); on waves **2 and
> 11** it is almost entirely the **board** (0.473 and 0.432 against the flow's 0.030 and 0.036). **So the flow-driven
> jitter is real and it does not discriminate either: wave 6 has the most of it and stays flat.**

⚠️ The 0.627 m/s and the 0.534 m/s are **the same quantity at different instants inside one frame** — the bank step
runs once per substep (16), the control tick fires on one of them, and the row's columns are read at the frame's end.
The 0.627 is the argument actually handed to `blend`; the decomposition is the frame-end one.

### 2.5 ⚠️ The limit on the whole of §2, and it is the important one

**The replay is OPEN-LOOP on saved senses.** It says: *given the measurements the shipped ride actually produced, a
fixed-gain controller would have commanded a far smoother ankle rest on wave 1.* ⛔ **It does NOT say that a
fixed-gain rider would weave less.** A changed command changes the ride, which changes the next sense, and nothing
here simulates that. **Treat §2.3 as an attribution of the command and not as a prediction about a ride.**

---

## 3. Part 2 — which forces add energy to the roll. ⭐⭐

### 3.1 The signs, stated once, because this round would be unreadable without them

Copied from `3.5/roll.ts`, whose conventions this round was told to use:

* **`rl_*` — `BoardBody.roll`**: N·m about **the board's own long axis** (board frame **+z** in the world,
  `(rotation[2], rotation[5], rotation[8])`), **positive in the right-hand sense, which LIFTS the board's +x rail.**
  Booked on **every substep** (16 per frame) and reported as the step mean. `rl_total` is the board's own `(I·Δω)·ẑ`.
* **`dk_*` — `bankLedger.deck`**: rad/s² about `AttachedRider.rollAxis` (world `(0,0,−1)` turned by the heading),
  **positive rolling the +x rail DOWN.**
* ⚠️ **They are OPPOSITE senses.** A positive `rl_*` and a negative `dk_*` are the same physical direction. They are
  never pooled in this file. `rollEng` / `railEng` / `tiltEng` are **degrees** in the `dk_*` sense.
* The probe rebuilds the roll axis two ways — the private `rotation` array and `(0,0,1).applyQuaternion(orientation)`
  — and emits their dot product. It reads **1** on every frame.

### 3.2 The residual, and the trap that was named before it was read

`rl_rider` is **the roll ledger's residual** — `total` less every water entry and the gyroscopic term. It is
**everything the rider's coupling carries**: the feet's push on the deck **and** the pair's own inertia resisting the
roll, together. **It is reported as a residual and never as a measured contact torque.**

⛔ **The YAW ledger's residual must not be used for this and is not.** It books `y.addedMass += waterTy`
[R, `BoardBody.ts:1483`] beside its settle entries and so counts the surface-normal push twice, and its own source
says that *"is why its `rider` residual cannot close"* [R, `:1496–1503`]. The roll ledger leaves `waterT` out, and its
positive control reads `rider` = **0.0000 N·m on a total of 0.463** for a bare board heeled 20° in still water.
**Nothing on the yaw axis is attributed to anything in this file** — see §4.

### 3.3 The energy, and its one honest limit, with the control for it

Power from source *s* is `rl_s × ω_roll` watts in the `rl` frame's own sign: **positive adds energy to the board's
roll, negative removes it.** ⚠️ **`rl_s` is a step mean of 16 per-substep bookings and the roll rate is read once a
frame**, so `rl_s × ω × dt` is the step's work only up to **the within-step covariance of that source's moment with
the roll rate, which this instrument does not separate.**

⭐ **The control for it is printed on every row**: the same work with the rate taken at the step's **start**,
**middle** and **end**. **No group's sign moves between the three, on any wave.** Wave 1's rider term reads
+21.76 / +23.88 / +26.00 J; its hull −13.49 / −13.04 / −12.58; its water −8.41 / −10.91 / −13.41. And the partition's
own closure — the parts against the board's own angular impulse — is **≤ 3.6 × 10⁻⁷ J against totals of tens of
joules**, on all four waves.

### 3.4 ⭐⭐ The result, over the whole stand. Joules.

| `cue` wave | **hull** | **water** | **foils** | gyro | ⭐ **rider (residual)** | total | closure |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **1** (weaves 24.3°) | **−13.0372** | **−10.9118** | +0.1564 | −0.0025 | ⭐ **+23.8799** | +0.0849 | −3.6e−07 |
| 2 (settles to 0.63°) | +0.0774 | −0.0261 | −0.0143 | −0.0000 | ⭐ **−0.0356** | +0.0013 | −7.7e−08 |
| 6 (settles, falls) | −0.1428 | −0.4534 | −0.0650 | −0.0003 | ⭐ **+0.6641** | +0.0027 | −1.1e−07 |
| 11 (settles to 0.26°) | −0.0625 | −0.0861 | −0.0191 | −0.0001 | ⭐ **+0.1690** | +0.0012 | +3.5e−08 |

`hull` = buoyancy + pressure + suction + friction. `water` = added mass + radiation + froth. `foils` = fins + rails.
The five groups partition the ledger's entries exactly and `bed` is 0.0000 throughout.

**And the half-cycle that matters — only the frames where |roll| is RISING, i.e. the board heeling further from level,
where anything driving the weave must be pushing. Watts, mean:**

| `cue` wave | hull | water | foils | ⭐ **rider** | frames |
| --- | --- | --- | --- | --- | --- |
| **1** | **−4.7233** | **−0.4503** | +0.3013 | ⭐ **+4.8525** | 111 |
| 2 | −0.0263 | −0.0164 | −0.0023 | ⭐ **+0.0450** | 86 |
| 6 | −0.2229 | −0.1345 | −0.0228 | ⭐ **+0.3797** | 69 |
| 11 | −0.0613 | −0.0214 | −0.0094 | ⭐ **+0.0921** | 85 |

> ⭐⭐ **On the heeling half-cycle, on all four waves and in every sampling variant, the hull, the water and the foils
> all OPPOSE the roll and the rider's coupling is the only source.** Its power is **13–108×** the largest non-rider
> positive anywhere in that table (wave 1's foils, +0.30 W).
>
> ⚠️ ⛔ **BUT "every water term is negative on every wave" IS WRONG and must not be written.** Over the **whole
> ride**, two non-rider entries are **positive**: **wave 1's foils at +0.1564 J** and **wave 2's hull at +0.0774 J**.
> The honest description of the whole-ride table is a **net roll-channel transfer with a residual**, and the clean
> unanimity belongs to the heeling half-cycle alone. *(This correction came from the reviewer against my own first
> summary, which over-generalised the half-cycle table.)*
>
> ⭐ **And over the whole ride the waves differ in whether the rider gives it back.** Wave 1 pumps +4.85 W out and
> nets **+23.88 J**; wave 2 pumps +0.045 W out and nets **−0.036 J** — it takes back more than it puts in, which is
> what a damping rider does, and it is the wave that settles to 0.63°. Waves 6 and 11 sit between at +0.66 and
> +0.17 J.
>
> ⚠️ **What this does and does not separate.** A rider *opposing* a roll would do **negative** work on it; the water
> is doing the negative work here and the rider the positive, **so the water is not driving the roll at the moment
> measured.** ⛔ **It does NOT follow that the controller originates the weave.** A positive return through the feet
> can follow an **initial water disturbance** — the loop is wave → board → rider → board's roll, and this instrument
> sees only the board's end of it. **The energy split must not be read as proof of generation.** The characterisation
> that the evidence supports is the one the coordinator set: **a leading candidate for AMPLIFICATION, with the
> initiation open.**

### 3.5 ⭐⭐ Naming the channel: it is the ANKLE, and two instruments agree to 1.5 %

The roll ledger's `rider` is one residual and cannot say which channel. The bank ledger can: its partition of the
standing solve's right-hand side is **exact**, and its three positive controls (`split`, `closure`, `residual`) read
**0.00e+00 on all four waves**. `dk_s / rollDeckPer` is the moment, in N·m; times the deck's roll rate it is watts.
**Joules over the window:**

**On the heading's own roll axis** — the axis `dk_*` is booked about, see the caveat below. Joules:

| `cue` wave | ⭐ **ankle** | pressure | added mass | leg | pitch | yawCouple | fins | all 23 | roll ledger's `rider`, for comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1** | ⭐ **+23.7405** | **−13.7106** | **−8.5441** | −0.8257 | +0.7867 | −0.9724 | +0.2070 | +0.8551 | ⭐ **+23.8799** — **0.6 % apart** |
| 2 | **−0.1157** | −0.1884 | −0.0292 | +0.2718 | +0.0412 | −0.0104 | −0.0001 | +0.0012 | −0.0356 |
| 6 | **+0.5533** | −0.3424 | −0.4787 | +0.2839 | −0.0449 | −0.0512 | +0.0207 | −0.0367 | +0.6641 |
| 11 | **+0.1320** | −0.1175 | −0.0838 | +0.0821 | −0.0138 | −0.0168 | +0.0080 | −0.0031 | +0.1690 |

> ⭐⭐ **Two different instruments, two different partitions, one answer.** The roll ledger's residual over the board's
> whole roll budget and the bank ledger's `ankle` entry off the standing solve's right-hand side agree on wave 1 at
> **+23.88 against +23.74 J — 0.6 %**. And **the ankle's sign tracks the outcome**: +23.74 J on the wave that weaves,
> **−0.116 J (it damps) on the wave that settles best**, +0.55 and +0.13 J on the two between.

⚠️ **THE AXIS, AND A BUG OF MINE THAT THE REVIEWER CAUGHT.** `dk_*` is booked about `AttachedRider.rollAxis` (the
heading's, yaw only) while the roll ledger's rate is about the board's own **+z**, so multiplying one by the other is
a projection. **An earlier version of the reader printed a column called `axisDeg` and described it as the axis
separation. It was `max|rollEng|` and was not one — the label was wrong.** It never entered any arithmetic (the work
was always `dk_s / rollDeckPer × rate`), **but a better caption is not the fix: the fix is the right rate.** The
reader now computes the work **twice** — once with the board's +z rate and once with the dk axis's **own signed
rate**, `d(rollEng)/dt`, since `rollEng` *is* the deck's roll about the heading's axis in the dk sense, rebuilt on the
engine's own expression. **The table above is the heading-axis one**, and the two agree:

| `cue` wave | ankle, heading axis | ankle, board +z | ratio | sign |
| --- | --- | --- | --- | --- |
| 1 | **+23.7405** | +23.5314 | **1.009** | same |
| 2 | **−0.1157** | −0.0758 | 1.527 | same |
| 6 | **+0.5533** | +0.4589 | 1.206 | same |
| 11 | **+0.1320** | +0.1237 | 1.066 | same |

**Same sign on all four, and within 0.9 % on the wave that carries the finding.** ⚠️ Neither rate is exact: a finite
difference of a frame-end angle is not an instantaneous rate, and the heading itself yaws.

⚠️ **Two further caveats.** (1) These are the **drive's** terms, the explicit right-hand side: the water's added
mass, its radiation damping and the ankle's implicit spring are in `A`, the denominator, and are **not** entries
[R, `bankLedger.ts`, *"What is a source and what is not"*]. (2) Wave 6 has **12 frames** the standing solve did not
decide (`apart`), excluded from its row; the other three have **0**.

### 3.6 ⭐ Inside the ankle: the commanded rest pumps, the ankle's own damper absorbs

`dk_ankle` is `ankleDeck × (−τ_ankle)` and is **linear** in that torque, so the work splits linearly over the three
terms `setAnkle` is built from [R, `AttachedRider.ts:3736`]:

```
τ = K·(θ − φ − rest) + (K·h + C)·relative
  = [K·(θ−φ)]        + [−K·rest]          + [(K·h + C)·relative]
    termJoint          termRest             termRate
```

with K = 800 N·m/rad, C = 80 N·m·s/rad. **`termRest` is the command** — the rest angle the predictor asks for;
`termJoint` is the ankle's own spring on the body-minus-deck angle and `termRate` its damper on the body's across
rate. **Joules:**

On the heading's own roll axis, joules:

| `cue` wave | ankle, total | `termJoint` | ⭐ **`termRest` (THE COMMAND)** | `termRate` (the damper) | closure |
| --- | --- | --- | --- | --- | --- |
| **1** | **+23.7405** | +11.5366 | ⭐ **+75.5352** | **−63.3313** | 1.3e−04 |
| 2 | −0.1157 | +0.0414 | +0.0744 | −0.2316 | 1.0e−03 |
| 6 | +0.5533 | +1.3302 | +0.9181 | −1.6950 | 9.5e−04 |
| 11 | +0.1320 | +0.3889 | +0.2075 | −0.4644 | 1.5e−02 |

> ⭐ **The structure is the same on every wave: the two spring terms PUMP the roll and the ankle's own damper
> ABSORBS.** On wave 2 the damper wins (−0.232 against +0.116) and the roll settles to 0.63°. On wave 1 it does not
> (−63.33 against +87.07) and the roll reaches 24.3°. **And the commanded rest is the larger of the two pumping terms
> on three of the four waves**, by 6.5× on wave 1.
>
> ⚠️ **On wave 1 the net is a difference of two large opposing numbers (+75.54 and −63.33).** The **net** is
> independently corroborated by the roll ledger to **0.6 %**; the **individual term magnitudes** carry more
> uncertainty than the net and must not be quoted as if they had the net's precision. (They moved 18 % when the axis
> was corrected, while the net moved 0.9 % — which is the point.)

### 3.7 ⭐ The reviewer's own precondition, met — and it confirms wave 1 rather than explaining it away

The condition was: *compare measured cross-face tilt, deck-relative roll and the board-versus-rider response before
touching stability*, because a wobble in the world frame on a tilting face is not the same quantity as a wobble
relative to the water's own surface. All three are rebuilt on the engine's own expressions [R, `prepareBank:3516–19`]
with `waterUp`, the water's own normal under the board. **Degrees, peak-to-peak over the ride:**

| `cue` wave | **world-frame deck roll** | ⭐ **deck roll against the WATER under it** (`rail`) | **the face's own cross-face tilt** |
| --- | --- | --- | --- |
| **1** | **24.30** | ⭐ **23.53** | **2.09** |
| 2 | 3.49 | 2.31 | ⭐ **2.70** |
| 6 | 2.89 | 3.00 | 0.98 |
| 11 | 1.79 | 1.71 | 0.50 |

> ⭐ **The weave is real in the water's own frame and the caveat is CLOSED.** Wave 1's deck rolls **23.53°** against
> the water's own surface while the face's own tilt spans only **2.09°** — and **wave 2's face tilts MORE (2.70°)
> while its deck stays inside 2.31°.** So the water's tilt is not what the deck is following; the quantity the
> reviewer asked for is the one that makes wave 1 **worse**, not better, and the reviewer has confirmed the same two
> numbers independently. **Nothing downstream needs to hedge the frame any more.**

### 3.8 ⛔ And four candidate discriminators died on the same table

| what was offered | what it reads | verdict |
| --- | --- | --- |
| **course reversals** | **11.0 / 10.5 / 10.0 / 9.5** on waves 1 / 2 / 6 / 11 | ⛔ **no discrimination at all.** The owner's *"going left and right"* reads as roll AMPLITUDE, not as more frequent reversals. |
| the weave's **frequency** | 1.82 / **3.48** / 2.63 / 2.67 Hz | ⛔ **wave 1 is the SLOWEST.** Wave 2 reverses nearly twice as often, at 3.49° |
| **wetted area** doubling | span 0.275 / 0.355 / 0.457 / 0.248 m² | ⛔ **wave 1's is the SMALLEST of the three that matter.** Waves 2 and 6 move their wetted area more and stay flat |
| **through-water speed** and its span | median 5.56 / **7.92** / 5.46 / **7.95**; span 4.33 / 4.28 / **4.93** / 4.85 m/s | ⛔ waves 2 and 11 are **faster** and wave 6's span is **larger**; all three stay flat |

`load`, `legLoad`, `planing` and `faceFraction` separate nothing either (load 1.10/1.02/1.03/1.02; planing 1.0
throughout).

⭐⭐ **Two things DO discriminate, and they are the round's findings:**

| what discriminates | wave 1 | 2 | 6 | 11 |
| --- | --- | --- | --- | --- |
| ⭐⭐ **torso twist, peak — with 0.0000° ever asked** (§2.4) | **51.10°** | 10.86° | 11.16° | 5.91° |
| ⭐⭐ **the ankle's work on the board's roll** (§3.5) | **+23.74 J** | **−0.12 J** | +0.55 J | +0.13 J |

**Every state variable in the first table separates nothing; the torso's own wind-up separates 4.6× and the ankle's
energy separates by three orders of magnitude and a sign change.**

### 3.9 The acceptance condition's first half, scored

| `cue` wave | roll peak-to-peak | ⭐ **in the LAST 0.5 s** | course reversals | verdict on half one |
| --- | --- | --- | --- | --- |
| **1** | 24.30° | ⛔ **14.10°** | 11.0 | ⛔ **FAILS — it has not settled at 3 s** |
| 2 | 3.49° | ✅ **0.63°** | 10.5 | ✅ passes |
| 6 | 2.89° | ✅ 1.32° | 10.0 | ✅ passes — **and the rider falls at 2.300 s anyway** |
| 11 | 1.79° | ✅ **0.26°** | 9.5 | ✅ passes |

> ⚠️ **A correction to the framing this round was handed.** `cue` wave 6 was described as *passing* the acceptance
> condition at a bigger speed jump than wave 1's. **It passes the roll half and the rider still comes off at
> 2.300 s.** A settled roll is **not** sufficient for a ride. ⭐ **And the inverse holds on the same four waves:
> wave 1 weaves 24.30° and SURVIVES its 3 s window.** Nothing here connects the weave to a fall in either direction,
> and the handoff's own timing result stands: the steer arms died at **+0.700 / +0.717 s** and the wobble does not
> begin until **+1.700**.

---

## 4. What this round could NOT separate — named, not buried

1. **Within-step covariance.** The moment is a step mean of 16 substep bookings and the roll rate is read once a
   frame. The start/middle/end control (§3.3) moves no sign, but it does not *separate* the covariance.
2. **The feet's push from the pair's own inertia.** `rl_rider` is one residual carrying both. §3.5 narrows it to a
   named channel through a second, exact partition; an exact split of the residual itself is not in this instrument.
3. ⛔ **The YAW axis entirely.** The task named "roll-yaw moments". The roll axis is done completely; **the yaw axis
   is not attempted**, because the shipped yaw ledger's `rider` residual double-counts `waterT` and its own source
   says it cannot close [R, `BoardBody.ts:1483`, `:1496–1503`]. Its *water* entries are booked and would be usable, but
   a rider attribution on the yaw axis needs an instrument this project does not yet have, and building one is more
   than a no-`src`-change round can do. **So the course reversals in §3.8 are reported as an outcome and never
   attributed.**
4. ⛔ **What INITIATES the roll — and this is the big one.** The energy split says the water is not driving the roll
   *at the moment measured* and the ankle is feeding it. **It does not say what first displaced the board.** ⚠️ **A
   positive return through the feet is perfectly consistent with an initial water disturbance**, which is the
   "response, not generation" reading and is not excluded by anything here. §2.4 pushes the question back one step —
   *why is the torso at 46° with nothing asked of it?* — but does not answer it either. **The initiation is open and
   must be described as open.**
5. **Whether the ankle channel is an active driver or a passive conduit.** The rider's own energy comes from the wave
   through the board, so the loop is wave → board → rider → board's roll, and this instrument sees only the board's
   end of it. A net flux of +23.88 J into the roll while the water removes 23.95 J is not what a passive spring does
   over a periodic motion — but the measurement is of the flux, not of what makes it. **The supported
   characterisation is a leading candidate for AMPLIFICATION, not generation.**
6. **Closed-loop behaviour.** §2.5. The replay is open-loop on saved senses throughout.
7. **The second half of the acceptance condition.** Nothing here is measured with a steer, so nothing here says a
   deliberate rail input would still turn the board.
8. **Population.** Four `cue` waves, one sea (seed 2), one address, one run per wave, 640 standing frames and 682
   control ticks in total. The structure carries this — a four-way discrimination with bit-identical controls and two
   independent partitions agreeing — **not the n**.

---

## 5. What follows, as a recommendation and not a change

⛔ **Nothing here is a tuning change and none is made.** This file changes no force, constant, switch or pose;
`git diff` over `src` is empty. ⛔ **And nothing here is a gain reduction or a global damper** — §2.3 and §2.4 are the
reasons why neither would be aimed at what was measured.

### ⭐⭐⭐ THE NARROW ENGINE QUESTION THIS ROUND LEAVES, AND IT SHOULD BE THE NEXT ONE ASKED

> **Why is the torso already winding up to 46° at NEUTRAL — with `0.0000°` of twist requested on every tick of every
> wave — and why does the 5.0–5.5 m/s design row re-weight that yaw state into an ankle reversal?**

Both halves are measured: the 51.10° peak and the 218.33 °/s upper-body yaw rate off the controller's own sense
vector (§2.4), and the **+5.717° from upper-body-yaw-rate coefficients plus +4.586° from torso-twist coefficients**
inside the +14.228° gain term, at the tick the command reverses. **Wave 6 crosses nearly the same speed with 4.5° of
twist and nothing happens**, so the two halves are one question and not two.

⚠️ **This isolates the COMMAND. It is not a cure for the ride** — see §2.5, and see the next list's first item for
what the energy measurement adds that the command decomposition cannot.

**What the measurement says should change, and why, for a later round and the owner's ruling:**

1. ⭐ **The thing with the wrong sign is the ankle channel's work on the board's roll.** It is positive on the heeling
   half-cycle on all four waves while the water, the hull and the foils are all negative there, and its net sign is
   what separates the wave that weaves from the wave that settles. **The target is that sign, not any gain's size.**
   ⚠️ And it is the half the command decomposition cannot reach: §2.3 says *which block of the controller moves the
   command*, and only the energy says *which way the resulting torque pushes the board*.
2. ⭐ **Inside the ankle, the commanded rest is the pumping term and the ankle's own damper is the only thing
   absorbing it** (+64.00 against −59.22 J on wave 1). That is a phase relationship between a commanded setpoint and
   the deck it is commanded against — **which is a structural question about where the correction leaves the body, not
   a question about how hard it is applied.** It is the same question `consult-codex-2026-11-18.md` Q3 asks
   (*"must the correction leave through the ankle at all?"*), now with an energy sign on it instead of a share.
3. ⚠️ **The scheduling speed is noisy and the noise is the sampled flow, not the board** (0.580 against 0.223 m/s per
   tick on wave 1; 1.329 against 0.332 on wave 6). ⛔ **This is NOT offered as the cause** — §2.4 shows wave 6 has
   more of it and stays flat. It is offered as a separate defect worth knowing about: a design re-solved at
   32–79 m/s² of apparent acceleration is being scheduled on a quantity no board can follow.
4. ⚠️ **Before anything is judged fixed, both halves of the acceptance condition must be scored**, and §3.9's
   last-half-second column is the first half's own number. **Wave 6 is the reminder that passing it is not surviving.**

---

## 6. The runs, and the commands that made them

```
./node_modules/.bin/rolldown docs/research/new-rider/3.5/weave-split.ts -o <s>/raw.mjs --format esm --platform node
printf "globalThis.location = { search: '' };\n" > <s>/weave-split.mjs      # an OBJECT, never a string
cat <s>/raw.mjs >> <s>/weave-split.mjs
cd <s> && env MODE=takeoff SEED=2 PERIODS=12 SCRIPTS=cue WAVES=1,2,6,11 LOG=window \
  OUT=<s>/cue.jsonl TICKOUT=<s>/cue-ticks.jsonl node --max-old-space-size=3200 weave-split.mjs
# 863 s, 11 crests detected, 4 ridden, 1136 rows, 4 tick blocks.

./node_modules/.bin/rolldown docs/research/new-rider/3.5/weave-replay.ts -o <s>/rraw.mjs --format esm --platform node
printf "globalThis.location = { search: '' };\n" > <s>/weave-replay.mjs
cat <s>/rraw.mjs >> <s>/weave-replay.mjs
cd <s> && env TICKS=<s>/cue-ticks.jsonl WAVES=1,2,6,11 SCRIPT=cue node weave-replay.mjs

python3 -I docs/research/new-rider/3.5/weave-read.py <s>/cue.jsonl --waves 1,2,6,11 --script cue
```

`BANK=off` drops the bank ledger (it factors the standing solve once per source per substep and is what makes the
drive about three times slower); `LEDGERS=off` and `TICKS=off` are the inertness controls. `FROM`/`TO` on the replay
print the window tick by tick.
