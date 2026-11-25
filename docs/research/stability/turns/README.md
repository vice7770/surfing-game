# 3.6b: faster turns in Compress and Crouch

*Surfer-track builder, Claude Opus 5.5, high effort, 2026-11-25. Branch `claude/faster-turns`, from `claude/balance-bar`
`dea549c7` (the ride build's `src`, the stability benchmark, the sooner-fall rule and the balance bar). The owner's
question, 2026-11-25: "the turning is too slow for compress and croach". The agreed plan (consult log, 2026-11-25):
measure the turn's onset per stance, find what slows it in the deep stances, build an opt-in switch checked against
3.6a's benchmark; the turn is not to be limited, and the balance falls must not rise.*

## 0. Pre-registration (written and committed before any run of this round)

**What I had read when writing this.** The code (`AttachedRider.ts` `prepareBank`, `predictiveBank`, `compressAssist`,
`legDriveStep`; `predictiveBalance.ts` `tick`, `steadyTurn`, `blend`; `humanBalance.ts` `stanceRoom`), the benchmark's
README and its committed baselines' summary table (§8.2), 3.5x §1 and §4.2, the 3.6a part 2 review, and the consult log
from 2026-11-25. I have not opened any raw frame row of the committed runs. Everything below the line "Predictions" is a
guess made before data.

### 0.1 The question

In Compress and in Crouch, what holds the board's course still (or turns it the wrong way) for the first half second
of a full steer, and can a switch that uses only the rider's own limbs and the water make the turn start sooner without
any balance fall rising?

### 0.2 Two facts from the code, to be checked at run time, not assumed

1. **The hip's range is not stance-dependent on his address.** `stanceRoom(depth, 'keep')` returns `hipRange` 1.2 rad
   and `arms` 1 at every depth, and his address carries `stanceReach=keep`. The lead "the hip's range (±0.4 rad in
   Compress)" applies only without `stanceReach=keep`. The probe logs the hip range and the swing angle every frame.
2. **Compress's lean-out pull and its assist do not act on the new rider.** `compressAssist` returns before computing
   `COMPRESS_PULL`, `CARVE_CARRY` or `LEAN_OUT_PULL` when `newRider` is set (ruling 29: no force on the body without its
   reaction on the board), and `legDriveStep` acts only with `legDrive`. The probe logs the three forces' magnitudes every
   frame.

If either is contradicted by the frames, I record it as a finding before reading anything else.

### 0.3 How the onset is measured (every quantity with its frame)

*Times* are s after the ride's first standing frame (`tS`), as the benchmark's; the step is 1/60 s. *The steer* starts at
+1.0 s and is released at +2.0 s. *Toward the steer* means multiplied by the steer's sign (`RideInput.steer` +1 is the
board's left, its +x rail; a left turn takes the nose from +z toward +x, which raises the course and is a positive
`angularVelocity.y`).

| quantity | definition | frame, unit |
| --- | --- | --- |
| course | atan2(v_x, v_z) of the board's velocity over the ground (the benchmark's `crs`) | the sea's (world) x–z, deg |
| Δcourse(t) | course(t) − course(+1.0 s), wrapped to ±180, × steer | deg toward the steer |
| twin-subtracted Δcourse | Δcourse of the steer ride − Δcourse of its **straight twin** at the same tS, × steer | deg toward the steer |
| heading | atan2(f_x, f_z) of the board's nose (its +z axis in the world) | world x–z, deg |
| yaw rate | the board's `angularVelocity.y` × steer | world, deg/s toward the steer |
| board roll | the rider's `prepareBank` roll: the board's up about the heading, from the world's level, + with the +x rail down; × steer | deg, + to the inside of the turn |
| rail | board roll less the water surface's tilt under the board about the same axis (`prepareBank`'s `rail`), × steer | deg, + inside |
| body bank | the rider's `bank.angle` (the body's lean about the heading on its leg), × steer | deg, + inside |
| lean asked | the rider's `leanAsked` (the balance's reference), × steer; and its cap (`leanProbe.cap`) | deg, + inside |
| ankle | the controller's raw ankle ask (`heldAnkleRaw`) and the rest sent (`ankleRest`), with the range (`ankleRoom`) and the rail's bite (`ankleBite`) | rad, the rider's sign |
| hip swing | `swing.angle`, `swingTorque`, and the stance's `hipRange` | rad, N·m |
| twist | the twist torque sent (`heldTwist`) and the twist body's angle | N·m, rad |
| reference | the controller's steady-turn reference: board roll, body bank, yaw rate (`reference.x[0, 2, 4]`), and the prediction now (`predicted[0, 2, 4]`) | the model's sign (x forward, y right), converted to toward-the-steer |
| yaw ledger | `BoardBody.yaw` by source (rails, fins, pressure, rider residual, total), N·m | about the world's up, + nose to the board's left; × steer |
| speed | vW, horizontal \|v_board − flow\| | m/s |

**The onset metrics per steer ride:**
- Δcourse at +0.25, +0.5 and +1.0 s after the steer starts, raw and twin-subtracted;
- the peak yaw rate toward the steer over +1.0 to +2.0 s (and the benchmark's own, +1.0 to +3.0 s);
- **t5**: the time from +1.0 s to the first frame with the twin-subtracted Δcourse ≥ 5° (censored at the release or the
  fall, whichever is first);
- **the wrong-way phase**: the least twin-subtracted Δcourse over +1.0 to +1.5 s, and how long it stays below 0;
- the rail's least value over +1.0 to +1.5 s (an outward rail is negative), and its time.

**The straight twin.** On every sea, every stance's steer rides get a straight twin: the same stance, the same wave, no
steer. On the test wave the benchmark already has one per stance. On Canyon Big I add `crouch:straight`,
`compress:straight`, `snap:straight` and `none:straight` to the same process; on Medium `none:straight`. His way's twin
is `hisway`. A steer ride and its twin send identical inputs until +1.0 s and the riders never push the water, so up to
+1.0 s they must be identical frame for frame; I check that (§0.6). After +1.0 s the twin is the exact counterfactual of
the same ride with the stick centred, so subtracting it removes the wave's own drift.

### 0.4 Hypotheses

**For the slow onset (all stances):**
- **H1, the ramp.** The lean asked moves at no more than `LEAN_IN_RATE` (1.4 rad/s) and no further than the cap
  atan(v² / (g · 4.5 m)), so a full stick asks 40° only at about +0.5 s. *Tells it apart:* the body bank and the rail
  track the lean asked with a lag under 0.1 s, and the course follows the rail; the onset then scales with the ramp.
- **H2, the counter-lean (non-minimum phase).** To lean the body in, the feet must first push the board out: the
  controller rolls the board onto its outside rail, so the board yaws away from the steer before it turns in. *Tells it
  apart:* in the first 0.3–0.5 s the rail and the yaw rate are outward (negative toward the steer), the ankle's command
  is outward, and the twin-subtracted Δcourse dips below 0 while the body bank rises inward.
- **H3, the bound.** The ankle's command is at its range (|raw| > `ankleRoom`, or past the rail's bite) or the hip at
  its range during the onset, so the body cannot lean faster. *Tells it apart:* the fraction of onset frames saturated.
  If this is the cause, I report it and do not build (no bound may be widened).

**For what makes Compress and Crouch slower than no stance:**
- **H4, the deep-stance design.** The controller's design at 0.195 and 0.30 m (its model and gains) tracks the lean
  asked more slowly or spends longer on the counter-lean. *Tells it apart:* with the same lean asked, the body bank's lag
  behind it and the length of H2's outward phase grow with depth; the ankle is not saturated.
- **H5, the ramp's own derivation.** `LEAN_IN_RATE`'s note derives 1.4 rad/s from the body's own bound, g d / h² over
  0.5 s, with h = 0.68 m, the tall stance's centre-of-mass height. A deeper stance has a lower h, so by the same
  derivation its own bound is higher, and the fixed 1.4 holds the deep stances further below what their bodies can do.
  *Tells it apart:* the body bank follows the lean asked closely in the deep stances (H1 holds there) and the ankle is not
  saturated, so the ramp, not the body, is the pace.
- **H6, the speed.** The deep stances arrive at +1.0 s slower through the water, so the cap is lower and the lean asked
  less. *Tells it apart:* vW and the cap at +1.0 s per stance.
- **H7, the hull.** The same rail yaws the board less in a deep stance (the load's position, the rail's bite).
  *Tells it apart:* yaw rate per degree of rail, and the yaw ledger's rails and fins terms, per stance at matched rail.
- **Leads already excluded by the code on his address** (§0.2): the hip's range and the lean-out pull.

**For the wrong-way drift:**
- **W1, the wave's own drift.** It is gone once the straight twin is subtracted.
- **W2, the counter-lean** (H2). It survives the subtraction, with the rail and yaw outward.
- **W3, the stance's own settling** (Compress or Crouch from +0.2 s still moving the board at +1.0 s). It is in the twin
  as well, so the subtraction removes it; if the raw drift is the stance's, raw and subtracted differ by it.

### 0.5 How the arms are chosen

- An arm is built only for a cause the frames support (a hypothesis whose discriminating measurement came out as stated),
  and each arm targets one cause. At most three arms.
- Every arm acts only while the stick is off centre (or while the lean asked is not 0), so a straight ride is
  byte-identical with it on; I check that on the straight rides.
- Every arm is behind its own `?<name>=<value>` dev switch: off by default, pinned off online (the room's address clears
  it, as every rider switch is), byte-identical when off.
- The rules of the brief bind: no cap on the turn, its rate or the steer's authority; no force or torque that no limb or
  the water makes; no bound widened (the ankle's range, the hip's range, `MAX_BANK` and the other physical limits). A
  change of the controller's gains or of the reference's pace is allowed behind a switch; the default gains and the gain
  lock stay unchanged.
- **H5 and the "no bound widened" rule.** `LEAN_IN_RATE` is the pace of the balance's *reference* (the rider's intent),
  not a limit on the body: the body's own limits stay enforced by the ankle's range and the feet's grip, which no arm
  touches. If H5's arm is built, it computes the same derivation at the stance's own height and changes nothing else; I
  flag it to the coordinator as a reading of the rule for Vicente to confirm, not as settled.
- If the diagnosis points only at a bound (H3), no arm is built for it and the finding goes to Vicente.

### 0.6 Controls (before any finding counts)

1. **Inert and deterministic.** The probe (`turn-probe.ts`, a copy of `scripts/stability-ride.ts` with added drives
   and read-only `o` rows) run on the full benchmark matrix plus the added scripts must give, for the benchmark's own
   rides, every `f`, `stand`, `summary` and `tw` row identical to the full baseline's raw runs (`runs/full-f2.tar.gz`),
   and the benchmark's report re-read on its files (filtered to the benchmark's scripts) must give 227 of 227 ride lines
   identical to `baseline-full.json`. The yaw and roll ledgers are switched on in the probe; this control is what shows
   that they are inert.
2. **The twin.** Every steer ride and its straight twin identical frame for frame up to tS = +1.0 s (the last frame
   before the steer's first step).
3. **Switch off.** For every `src` change: the quick and full reports with the switch absent give 26 of 26 and 227 of
   227 ride lines identical to the baselines; the Canyon byte check identical (snapshots `a367d938f15fa934`, state
   `9e5831f80e38abd9`); `npx tsc -b` clean; the gain lock 5 of 5; the touched tests pass.

### 0.7 The pass lines

**"Faster" (per arm, against switch off, ride for ride).** The cells are Compress and Crouch steer-only on `tw-catch`,
`tw-ride` and `big`, and the his-way turn (Compress, so it counts for Compress) on `tw-catch`, `tw-ride`, `med` and
`big`. The three metrics are the twin-subtracted Δcourse at +0.5 s and at +1.0 s after the steer starts, and the peak
yaw rate toward the steer over +1.0 to +2.0 s. Rides are paired by id; a metric is compared where both rides have it.
- **A cell passes a metric** when its paired median difference (on − off) is above 0 **and** more pairs rise than fall.
  On the test wave (two rides per cell) both pairs must rise.
- **The arm is "faster"** only if every cell passes every metric.
- The raw (not subtracted) Δcourse and the benchmark's own `course05`, `course10` and `yawPeak` are reported beside it.

**Stability (per arm).**
- The benchmark's rule, quick and full: exit 0 against `baseline-quick.json` and `baseline-full.json` (no lasting ride
  falls; no balance fall 0.25 s or more sooner; no lowest reserve 0.10 lower).
- **The balance falls must not rise:** per group (`tw-catch`, `tw-ride`, `med`, `big`), the count of falls labelled
  `balance` no higher than the baseline's.
- The same three tests on the his-way turn drives (not in the baseline), against switch off.
- Every regression and every new balance fall is listed ride by ride with its cause.

An arm that is faster and passes stability is a candidate for Vicente. An arm that is faster and fails stability is
reported with its regressions and is not proposed as is. Nothing is adopted until he rides it.

### 0.8 Predictions (made before any data)

1. Both facts of §0.2 hold: the hip range is 1.2 rad in every stance, and the three assist forces are 0.
2. The wrong-way drift survives the twin subtraction in Crouch and Compress (W2, not W1): on Big the median least
   twin-subtracted Δcourse over +1.0 to +1.5 s is below −0.5° in both, with the rail outward in the first 0.3 s.
3. The ankle is not saturated on most onset frames (below 30 % of frames in +1.0 to +1.5 s) in any stance: H3 is not
   the main cause.
4. The lean asked is the same in every stance at the same speed; the deep stances' body bank lags it more (H4), by
   0.05–0.15 s more than no stance at the time it reaches 20°.
5. vW at +1.0 s differs by less than 0.5 m/s between stances on the test wave (H6 is small there).
6. t5 (twin-subtracted) is a median 0.6–0.8 s in Crouch and Compress on Big, and 0.1 s or more shorter with no stance.
7. A stance-height ramp (H5's arm) makes the onset faster by the pass line in Compress but costs balance falls in
   Crouch; a deep-stance design change (H4's arm) is the one most likely to pass both lines. I hold both at low
   confidence.

### 0.9 Guards

Usage checked at each phase boundary; at 80 % of the 5-hour window I stop, push what is green and write the state here.
Power checked before each batch (none started below 25 % on battery). At most 4 game processes at once. Raw runs go to
the session scratchpad (`…/scratchpad/36b/`); compact results under this folder. Later changes to this section go in as
dated amendments, written before the data they affect are read.

### 0.10 Amendment, 2026-11-25, about 19:31 UTC, before any row of the onset run was read

Written after one smoke ride of the probe (`tw-ride:compress:left`, run to check the probe's rows; its benchmark rows
equal the baseline's, 105 of 105) and before the onset run's data. In that ride the twist torque sent (`heldTwist`) sits
at the hips' ±100 N·m and changes sign every 0.15–0.2 s through the steer, the twist angle starts the steer at 0.83–0.92
rad against `TWIST_BODY_RANGE` 0.87, and the first 0.25 s of the steer has the twist torque away from the steer. The
twist's reaction acts on the board's yaw (`coupleYaw`: + yaws the nose to the board's left), and the stance table's
upper-body yaw inertia grows with depth (1.44, 1.68, 1.96 kg·m² at 0, 0.195, 0.30 m). So one more hypothesis, with its
measurement, is added. Nothing else in §0 changes.

- **H8, the twist channel.** The upper body's yaw (the twist) is at or near its range when the steer starts, or the
  controller's twist torque is saturated and points away from the steer, so its reaction yaws the board the wrong way
  or holds it straight; larger in the deep stances. *Tells it apart:* the twist angle at +1.0 s against its range, the
  fraction of onset frames with the twist torque at its bound, the sign of the twist torque × steer over +1.0 to
  +1.25 s, and the yaw ledger's rider residual against the rails and fins, per stance. One ride is not a finding; the
  prediction is that it holds on most deep-stance onsets on the test wave and on the Big swell.
- The reader adds, per ride: the twist angle at +1.0 s, the mean twist torque × steer over +1.0 to +1.25 s, and the
  saturated fraction (|torque| ≥ 99.5 N·m; the feet's grip bound is not logged by this run and is checked in a later
  run if it matters).
