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

### 0.11 Amendment, 2026-11-25, 19:36 UTC, before any row of the onset run was read: the steer's shape

The coordinator relayed a new owner report (the coordinator gives "about 19:45 UTC"; this machine read 19:36 UTC when this was committed; on `claude/balance-bar` at his address, with a gamepad):
"Playing with the controller stick makes the surfer fall. Im able to turn with my arrows but not with the controller".
In `Controls.rideRequest` the keys' steer (arrows, A/D, the pad's D-pad) goes through `AxisRamp` (`RAMP_TIME` 0.2 s,
linear, in and out); the left stick passes straight through (`shapeAxis`, 0.15 dead zone, linear), so a push asks full
lock in that frame and a spring-centred release asks 0 in that frame. The benchmark's steer is a step in and out, like
the stick.

**Added measurement.** Each steer ride of the deep stances and of the his-way turn also runs with three shapes, the
target being the benchmark's (±1 from +1.0 s to +2.0 s):
- `~ramp`: the keys' `AxisRamp` in and out (1/12 of full lock per 1/60 s step; full at +1.2 s, 0 at +2.2 s);
- `~in`: ramped in, stepped out at +2.0 s;
- `~out`: stepped in at +1.0 s, ramped out (0 at +2.2 s).

The drive applies the same `AxisRamp` arithmetic as `src/game/InputAxes.ts`, every step, on the session's own steer
field (only nonzero values sent, as the probes send them). Scripts: `crouch`, `compress` and `hisway`, left and right,
each shape, on `tw-catch`, `tw-ride` and Canyon Big (seeds 1–3), and `hisway` on Canyon Medium (seeds 1–3). The step
version is the onset run's own ride of the same id; the straight twin is the same as for the step (a shaped ride sends
the step ride's inputs until +1.0 s).

**What it tells apart.**
- *The onset step throws him* if `~in` (and `~ramp`) fall less often, or later, inside the steer (before +2.0 s) than
  the step, while `~out` falls like the step.
- *The release step throws him* if `~out` (and `~ramp`) fall less often after the release (+2.0 to +3.5 s) than the
  step, while `~in` falls like the step.
- *Neither* if all four fall alike (paired, by id).
- Read per shape: falls inside the steer and after the release (balance-labelled, by the benchmark's cause rule with the
  same prone twin), fall time against the step's (paired), the lowest reserve, and the onset metrics of §0.3 (a ramp
  delays the lean asked by up to 0.2 s, so its own onset is read beside the step's, not as an arm).

**An eased stick as a candidate arm.** If the shapes show that a step (in or out) throws him and the ramp does not, an
eased stick is a candidate: input shaping behind its own switch in `Controls` (or the stick's shaping), not in the
physics; the turn's size and authority not limited (full lock still reached); judged like every arm (§0.7), ridden his
way with the stick. It counts toward §0.5's three arms.

**Predictions.** The release step throws more riders than the onset step: `~out` and `~ramp` fall less often in
+2.0–3.5 s than the step on the Big swell (Compress and his way), and `~in` changes falls inside the steer by no more
than 2 of 36. Low confidence.

### 0.12 Amendment, 2026-11-25, 19:55 UTC: the arms chosen, before any arm has run

Written after reading the onset run's Canyon rides (Big and Medium, all three seeds) and the test wave's `tw-catch` none
and crouch rides; the rest of the test wave was still running. §1 reports the diagnosis in full. What it rests on:
- **No bound is reached at the onset** on the Big swell: the ankle's raw ask is past its range on 0 % of the frames of
  +1.0 to +1.5 s (median, every stance), the twist torque at its 100 N·m on 0 %, the hip at its range on 0 %; the hip's
  range is 1.2 rad in every stance and the three assist forces are 0 (§0.2 holds). H3 is out.
- **The body's bank trails the lean asked by 26–28° at +0.5 s in every stance** (Big, median), while the lean asked
  itself is the ramp's 40°: the controller asks less than the body can give. The lean asked is the same in every stance.
- **The wrong way survives the twin**: the twin-subtracted heading and course both turn away for the first 0.35–0.42 s in
  every stance, least in Crouch and Compress. So the deep stances do not drift the wrong way more; they turn in less
  after it (twin-subtracted course at +1.0 s: none 14.2°, Crouch 6.4°, Compress 9.9°, Snap 12.6°; rail at +0.5 s 10.3°,
  6.3°, 7.1°, 17.0°).
- **The deep stances ring**: the yaw rate's ringing over the steer (std about its 0.25 s mean) is 19–25 deg/s in Crouch
  and Compress against 11 with no stance, and their straight twins ring 2.5–3.5 times more than no stance's too.

**The arms (each behind its own switch, each acting only while a lean is asked, so a straight ride is unchanged):**
1. `?leanPace=stance` (H5, the ramp): `LEAN_IN_RATE` × (h_tall / h)², h the stance table's height at the leg's depth
   (Crouch × 1.67, Compress × 2.33, tall × 1). Built before this amendment, from the pre-registered H5.
2. `?turnGains=firm` (H4 generalised: the controller's own tracking): while the bank asked is not 0, the command uses
   the gains of the same design with `rho` 5 instead of 10 (the same plant, filter, predictor, reference and clamps).
   One value, chosen before any run, no sweep.
3. **The eased stick** (amendment 0.11) only if the shape run supports it; it would be input shaping in `Controls`.

The ringing of the deep stances is reported as a finding; no arm targets it this round (its cause is not identified:
the twist torque follows the yaw rate 0.10–0.12 s late with correlation 0.86–0.89, which any delayed feedback would
show, and the straight twins ring too).

**Plumbing needed by the benchmark.** The Canyon rides pass the address's rider switches to the session through
`RIDER_KEYS` in `scripts/stability-ride.ts`, so `leanPace` and `turnGains` are added to that list (and to the probe's).
With the switches absent the config carries neither key, so nothing reaches the session that did not before; the
switch-off controls (§0.6 item 3) check it. The benchmark's scripts, matrix and baselines are unchanged.

---

## 1. The onset, measured (switch off, the ride build)

*Run `onset-off`: the turn probe (`turn-probe.ts` at `d138edc8`, bundle `e15f79f5…`), `EXTRA='&cueLater=on&plantFloor=6'`,
started 19:27 UTC, 37 processes, 32 min. The benchmark's full matrix plus the straight twins (every stance on Canyon Big,
none on Medium) and his-way turns on every sea: 252 steer rides. All numbers are medians over the rides of the cell;
frames and signs as §0.3 (course and heading world x–z, yaw world, roll/rail/bank the rider's, + toward the steer; times
from the steer's start at +1.0 s). Tables: `results/onset-off.md` (every column), `results/ring-off.md`,
`results/hull-<group>.md`. Recompute: `python3 onset.py <run> --md …`, `ring.py`, `hull.py`, `ledger.py`, `series.py`.*

### 1.1 The onset per stance

| sea | stance | rides | fell before +2.0 s | course toward, twin-subtracted, +0.25 / +0.5 / +1.0 s (deg) | heading, twin-subtracted, least over +0–0.5 s (deg) | time turning away (s) | t5 (s; rides reaching it) | peak yaw toward (deg/s) | lean asked / body bank / rail at +0.5 s (deg) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Big | none | 36 | 11 | −3.7 / +0.2 / +14.2 | −4.2 | 0.42 | 0.83 (23) | 90 | 40 / 12.2 / 10.3 |
| Big | Crouch | 36 | 20 | −1.0 / −0.5 / +6.4 | −2.1 | 0.35 | 0.78 (16) | 79 | 40 / 11.8 / 6.3 |
| Big | Compress | 36 | 20 | −2.0 / −0.2 / +9.9 | −3.0 | 0.38 | 0.78 (22) | 77 | 40 / 11.1 / 7.1 |
| Big | Snap | 36 | 13 | −3.7 / +2.5 / +12.6 | −4.3 | 0.38 | 0.58 (24) | 85 | 40 / 16.9 / 17.0 |
| Big | his way + steer | 36 | 20 | −1.9 / −0.3 / +9.9 | −3.0 | 0.37 | 0.78 (21) | 77 | 40 / 11.1 / 7.1 |
| Medium | none | 26 | — | −4.5 / +0.8 / — | −4.9 | 0.45 | 0.77 (17) | — | 40 / 12.3 / 13.6 |
| Medium | his way + steer | 26 | — | −2.9 / −0.1 / — | −3.0 | 0.41 | 0.75 (20) | — | 40 / 10.9 / 9.7 |
| test wave, catch | none / Crouch / Compress / Snap | 2 each | 0 / 1 / 0 / 1 | +0.5 s: +0.2 / −2.6 / −1.8 / +8.0 | −5.9 / −2.2 / −4.1 / −6.7 | 0.48 / 0.40 / 0.35 / 0.34 | 0.75 / 0.64 / 0.70 / 0.41 | — | 41 / 16 / 9 / 10 (bank) |
| test wave, ride | none / Crouch / Compress / Snap | 2 each | 0 / 2 / 2 / 2 | +0.5 s: −2.1 / −0.9 / +8.5 / — | −3.3 / −8.5 / −13.0 / −0.6 | 0.30 / 0.25 / 0.26 / 0.17 | 0.68 / 0.53 / 0.32 / — | — | 40 / 10 / 18 / — (bank) |

(The full columns, Medium's falls and yaw peaks included, are in `results/onset-off.md`; the test-wave rows give both
rides of a cell in `onset-off.jsonl`.) On the test wave and on Big, his way with the steer is the Compress steer ride
frame for frame on 32 of its 40 rides: the stand is already at 4.4 m/s or more, so the trim is released on the first
standing step. Its 8 other rides are slow Canyon stands.

### 1.2 What the frames show

1. **§0.2 holds.** The hip's range is 1.2 rad on every frame of every stance (`stanceReach=keep`), and the lean-out
   pull, the compressed turn's assist and the carve's carry are 0 on every frame (the new rider). Two of the four leads
   (the hip's range, Compress's lean-out pull) do not act on his address.
2. **No limb is at its bound during the onset** on the Canyon: the ankle's raw ask is past its range or the rail's bite
   on 0 % of the frames of +1.0 to +1.5 s (median, every stance, Big and Medium), the twist torque at 100 N·m on 0 %, the
   hip at its range on 0 %. **H3 is out.** (The test wave's `tw-ride` start is different: the rider is placed in a turn
   with the twist at its range, 0.78–0.91 rad, and the ankle past its range on 13–52 % of the onset's frames; §1.3.)
3. **The lean asked is the ramp, the same in every stance:** 20° at +0.23–0.25 s, 40° at +0.5 s (1.4 rad/s); the cap
   (atan(v²/(g·4.5 m))) is 48–64° at the steer's start on Big and does not bind by +0.5 s. The deep stances start the
   steer 0.4–0.9 m/s slower (Big vW 7.0 Crouch, 7.5 Compress, 7.9 none): **H6 is small**.
4. **The body's bank trails the lean asked by 26–28° at +0.5 s in every stance** (Big; 24–43° on the other seas), with
   no limb at its bound (`ring.py`'s last column). The controller's own prediction of the bank (`predicted[2]`) agrees
   with the body's (9.5 against 11.1° in Compress, 12.1 against 12.1° with no stance), so this is the controller asking
   for little, not the body failing to deliver: its raw ankle ask at +0.5 s is 0.07–0.10 rad against a range of 0.25.
   The reference's own board roll is 30–34° by then; the board is at 6–11°. **H1 (the ramp) is not the pace setter**:
   the body is not near the ramp. The pace is the balance's tracking (H4, generalised to every stance).
5. **The wrong way is real and common to every stance (W2, not W1).** After the straight twin is subtracted, the heading
   and the course both turn away from the steer for the first 0.35–0.45 s: the heading by 2–6° at its least, the course
   by 1–6° at +0.25 s. The board rolls outward first (rail at its least −0.5 to −1.5° at +0.07–0.13 s, the controller's
   predicted roll −2 to −4°), the counter-lean that brings the body over its feet. **The deep stances do not turn away
   more**: they turn away least (Big heading −2.1° Crouch, −3.0° Compress, −4.2° none). The raw wrong-way counts of the
   3.6a review (19 and 16 of 32) were the wave's drift plus this.
6. **What the deep stances lack is the turn-in after it.** At the same body bank (11–12° at +0.5 s), the deep stances
   hold the board flatter: rail 6.3° Crouch and 7.1° Compress against 10.3° with no stance, and the body leans past the
   board by 5.8° and 3.7° against 1.9°. Their reference asks for it: at the lean asked of 39°, the steady turn's board roll
   is 28° (Crouch) and 30° (Compress) against 34° (none). Over +0.4 to +0.6 s their yaw rate is 6–9°/s against 19°/s
   with no stance (the controller's prediction: about 0–1 against 10). For the rides still standing at +2.0 s, the
   course per degree of rail over +1.5 to +2.0 s is close (1.18 Compress, 0.95 Crouch, 1.26 none; `hull-big.md`), so the
   hull turns a deep stance's rail nearly as well (**H7 is small**); the deep stances get less rail.
7. **The deep stances ring.** Over the steer, the yaw rate's ringing (std about its centred 0.25 s mean) is 19 and 25
   deg/s in Crouch and Compress against 11 with no stance on Big (30–53 against 7–11 on the test wave), and their straight
   twins ring 2.5–3.5 times as much as no stance's twin (8–11 against 3 deg/s). The twist torque sent follows −yaw 0.10 s
   later with correlation 0.86–0.89 (the senses' delay). In the frames this is a 2.5–3 Hz swing of the yaw rate between
   toward and away (`series.py`, e.g. `big:s1:w9:crouch:left`: −27, +43, −51, +119, −202 deg/s at 0.1–0.15 s intervals,
   the fall at +0.87 s), carried by the rider's yaw coupling against the fins and the hull's pressure (`ledger.py`).
   **H8 as registered (the twist at its range, saturated) holds only on the test wave's `tw-ride` start**; on the Canyon
   the twist is centred and never saturated at the onset. What rings is not identified: the straight twins ring too, so
   it is not the steer's alone.

### 1.3 The test wave's `tw-ride` start

The rider is placed standing on the face in a turn: at +1.0 s the twist is at 0.78–0.91 rad (its range is 0.87), the
board is rolled 8–20° and yawing 30–50°/s. One steer continues that turn and the other is a rail change. Its onset
metrics mix the two, and with two rides a cell they are read ride by ride (`onset-off.jsonl`), not as a stance effect.

### 1.4 The diagnosis, in one paragraph

*What slows the turn in Compress and Crouch* (Canyon Big, the frames above): not a limb at its bound, not the hip's
range, not the lean-out pull, and not the lean asked's ramp. In every stance the balance asks for far less lean than it
is given (the body's bank 27° behind the lean asked at +0.5 s, the ankle at a third of its range), and first rolls the
board out to bring the body over its feet, so for 0.35–0.45 s the board turns away. In Compress and Crouch two things
then hold the board flat: the balance's own steady turn asks 4–6° less board roll for the same lean, so the board
carries 3–4° less rail at +0.5 s and yaws at a third of the rate; and the yaw rings at 2.5–3 Hz, more than twice as much
as with no stance, swinging the board toward and away. 20 of 36 Big rides fall before the release in each deep stance,
against 11 with no stance.

## 2. The steer's shape (amendment 0.11): neither the onset step nor the release step throws the bot

*Run `shape-off`: the probe at `4e08941b` (bundle built from it), switch off, started 20:00 UTC, 43 processes, 34 min.
146 shaped rides per shape (Crouch, Compress and his way, left and right, on `tw-catch`, `tw-ride`, Big seeds 1–3 and his
way on Medium seeds 1–3), each paired with the step ride of the same id from `onset-off`. The drive was checked on its
own rows: `~ramp` sends 0.083, 0.167, …, 1 by +1.2 s and 0.5 at +2.1 s, 0 at +2.2 s; `~in` steps to 0 at +2.0 s; `~out`
steps to 1 at +1.0 s. Causes by the benchmark's rule with the fall standing in for the escape; on the onset run's
benchmark rides this rule agrees with the baseline's labels on 181 of 182 falls. Table: `results/shape-off.md`;
`results/shape-ask.txt`. Recompute: `python3 shape.py <shape run> <onset run>`, `python3 shape_ask.py …`.*

| shape | pairs | falls before +2.0 s, step → shape (balance) | falls +2.0–3.5 s, step → shape (balance) | falls later / sooner than the step |
| --- | --- | --- | --- | --- |
| keys' ramp in and out | 146 | 73 → 73 (43 → 43) | 32 → 30 (20 → 18) | 28 / 29 |
| ramp in, step out | 146 | 73 → 73 (43 → 43) | 32 → 30 (20 → 18) | 27 / 13 |
| step in, ramp out | 146 | 73 → 73 (43 → 43) | 32 → 32 (20 → 20) | 13 / 28 |

The median change of a fall's time is 0.00 s in every cell but two test-wave cells (±0.1–0.2 s, two rides each).
**Why:** the lean asked moves at no more than `LEAN_IN_RATE` (1.4 rad/s, 80°/s) both ways, and the keys' ramp moves the
stick's own ask (50° × steer) at 250°/s, so the rate limit binds under both shapes: the lean asked differs from the
step's by a median 0.16° at most over a ride (`~out`: 0.08°), and the rides diverge only where a fall was already
coming. **My prediction (the release step throws more) was wrong.** For his report ("I'm able to turn with my arrows but
not with the controller"): the stick's step in or out is not what throws him in these rides, so an eased stick would
change nothing the balance sees, and I did not build it (§0.11's condition is not met). What the bots do not do and the
stick does: part deflection (an ask below full lock; the stick is linear past its 0.15 dead zone), a release that
overshoots the centre (a spring-centred thumbstick swings past it), and small reversals while held. Each would reach the
lean asked through the same 80°/s limit, so none is a step either. A recording of his stick's axis while he rides,
replayed by the bot, would tell them apart; that is a probe, not a change, and it needs his session.

## 3. The arms

Both act only while a lean is asked: in both quick runs the 10 straight and his-way rides of the test wave are identical
to the baseline in every field, and only the 16 steer rides move. With no stance the leg still flexes in a carve
(`CARVE_FLEX`), so `leanPace=stance`'s factor is a little above 1 then and the no-stance steer rides move too.

### 3.1 Quick runs (the test wave), against `baseline-quick.json`

*`npm run report:stability -- --extra '&cueLater=on&plantFloor=6&<switch>' --out …` (the report's bundle built from
`4e08941b`), 20:35 and 20:45 UTC, 10.3 min each. The pass lines' test-wave cells (`compare.py`); the regressions with
`regress.py` (the benchmark's own frame rows: the yaw rate's ringing over the steer is its std over +1.0 to +2.0 s).*

**`?leanPace=stance`: exit 1, 5 regressions, 4 improvements.**

| ride | switch off | arm | what the frames show |
| --- | --- | --- | --- |
| `tw-catch:crouch:right` | falls +3.30 s | falls +1.67 s (balance) | the yaw rings 89 deg/s over the steer against 23, up to 216 deg/s; the margin goes at +1.57 s, inside the steer |
| `tw-catch:compress:left` | +3.65 s | +2.90 s (balance) | turns much more (+4.9° / +32.8° at +0.5 / +1.0 s against +0.2° / +6.3°); rings 78 against 50 |
| `tw-ride:none:right` | +4.57 s | +4.27 s (balance) | the carve's knee flex moves the no-stance pace a little; same turn, 0.3 s sooner, late in the ride |
| `tw-ride:crouch:right` | +1.92 s | +1.55 s (balance) | the placed start's rail change; turns −9.5° at +0.5 s against +1.8° and falls inside the steer |
| `tw-catch:snap:right` | lowest reserve 0.192 | 0.051 | falls later (+2.72 s against +2.38 s) but closer to the edge first; rings 44 against 30 |

Improvements: `tw-catch:snap:right` falls later (+2.72 s against +2.38 s), `tw-ride:none:left` (+4.05 against +3.67),
`tw-ride:crouch:left` (+2.88 against +1.67), `tw-ride:compress:left` (+2.98 against +1.70).
Faster on the test wave: Compress on `tw-catch` passes all three metrics (+5.9° at +0.5 s, +19.3° at +1.0 s, +33 deg/s
peak yaw, both rides); Crouch fails at +0.5 s on both seas (one pair falls, one turns away more) and `tw-ride` Compress
fails at +0.5 s.

**`?turnGains=firm`: exit 1, 4 regressions, 3 improvements.**

| ride | switch off | arm | what the frames show |
| --- | --- | --- | --- |
| `tw-catch:crouch:right` | falls +3.30 s | +2.47 s (balance) | turns more (+18.5° at +1.0 s against +15.7°); rings 47 against 23; falls on the margin after the release |
| `tw-catch:compress:left` | +3.65 s | +3.07 s (balance) | turns away more first (−3.9° at +0.5 s against +0.2°); rings 78 against 50, up to 216 deg/s |
| `tw-catch:compress:right` | +3.10 s | +2.22 s (balance) | −10.5° at +0.5 s, then +40.6° at +1.0 s (against −3.9° and +2.0°); the margin goes at +1.53 s |
| `tw-catch:snap:right` | lowest reserve 0.192 | 0.000 | rings 53 against 30, up to 180 deg/s; the same fall time |

Improvements: `tw-catch:none:left` falls later (+3.77 s against +3.50 s), `tw-catch:crouch:right`'s lowest reserve
(0.172 against 0.021, before its sooner fall), `tw-ride:crouch:right` falls later (+2.42 against +1.92).
Faster on the test wave: at +1.0 s and in the peak yaw every Crouch and Compress cell rises (Compress `tw-catch` +19.7°
at +1.0 s); at +0.5 s it fails in three of four cells, because the firmer gains roll the board out harder first (the
counter-lean of §1.2 item 5 grows: −7.2° against −1.8° in `tw-catch` Compress).

**Both arms fail the stability line on the quick run.** The common thread in 7 of the 9 regressions is the deep
stances' ringing (§1.2 item 7): a turn that comes in harder or sooner swings the yaw further (std over the steer up by
11–66 deg/s), and the margin goes on the swing. The other two (`tw-ride:none:right` late in the ride, `tw-ride:crouch:right` in the placed start's rail change) ring no more.

## 4. Controls

| control | result |
| --- | --- |
| The probe inert and deterministic (§0.6 item 1): `onset-off`'s files filtered to the benchmark's scripts against the full baseline's raw runs (`runs/full-f2.tar.gz`) | 33 of 33 files identical in every `stand`, `f`, `tw` and `summary` row (`inert.py`), the yaw and roll ledgers on; the benchmark's report re-read on them (`--reuse`): exit 0, and 227 of 227 ride lines identical to `baseline-full.json` in every field (`same.py`) |
| The twin (§0.6 item 2) | 252 of 252 steer rides identical to their straight twin in every frame row up to +1.0 s (`onset.py --twins`) |
| Switch off (§0.6 item 3), the full report on `581cc326`'s `src` and scripts (21:26 UTC, 30.8 min) | exit 0, 0 regressions, 0 improvements; 227 of 227 ride lines identical to `baseline-full.json`, and its 26 test-wave rides identical to `baseline-quick.json`'s 26 |
| The arms off when straight | in both arms' quick runs, the 10 straight and his-way rides identical to the baseline in every field |
| `npx tsc -b` | clean |
| The gain lock, `npx vitest run src/physics/stabilityGains` | 5 of 5 |
| The touched tests (`PhysicalMode`, `predictiveBalance`, `RideSession`, `AttachedRider`, `AttachedRider.deepCrouch`, `stabilityGains`) | 6 files, 328 passed and 8 expected failures (`it.fails` in `AttachedRider.test.ts`, 8 at `dea549c7` too), 0 failing; the two new switch tests and the two turn-weight tests among them |
| `SurfZoneRunner` and `SurfZoneSimulation` tests (one line each of plumbing) | **not run to the end**: started at 20:05 beside the game runs, stopped at 21:28 after 82 CPU-minutes unfinished, so as not to load the machine past four processes. Their two changed lines are covered by `tsc` and by the switch-off full report, which drives every test-wave ride through `SurfZoneRunner` |
