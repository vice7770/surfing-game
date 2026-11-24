# 3.5x: what fails first now, on the owner's address with the later cue (diagnosis)

*Surfer-track builder, Claude Opus 5.5, high effort (a diagnosis with open causes; the instruments exist), 2026-11-24.
Branch `claude/what-fails-first` from `claude/plant-rows` `1be12ee7`. Diagnosis only: no fix ships, nothing under `src/`
or `scripts/` changes. The owner (2026-11-24), after riding `1be12ee7` with `&cueLater=on` and each of `&plantSpeed=taper`
and `&plantFloor=6`: "I tested the code it seem to improve with both option &plantFloor=6 improved the stability. The
surfer is able to turn but still not enough balance yet." His standing rulings: the turn is not to be limited; the fall
comes from a balance that lacks the ability to stand (no hidden motors, no bound widened); he rides holding Compress (R2)
from 0.1–0.3 s after the stand until the fall.*

## 0. Pre-registration (written and committed before any arm ran)

### 0.1 The question

On his address `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`, with
`&cueLater=on&plantFloor=6` (his preference) as the base and `&cueLater=on&plantSpeed=taper` beside it: **what fails
first now, on take-offs, in turns, and on the climb after a turn; at what speed; and is it within the balance's
authority?** Plus 3.5w's open question on the climb: is the board's roll to the outside the turn reference asking too
little bank for the real speed, or the roll terms of the stiffer-water design?

### 0.2 The probe, the arms and the drives

**Probe:** `what-fails-first.ts`, 3.5v's `sideways-falls.ts` verbatim (both drives, every row field and instrument) with
two drive changes and one read-only instrument (its header):

- **The turn pops at the player's cue.** 3.5o's `sharp-steer.ts:456` pops on `popUpCue || inTakeOffWindow(frame)`, which
  ignores `cueLater`. The turn scripts here ride 3.5u's organic drive, which pops on `playerCue` (`takeOffCue.ts`), so
  `cueLater=on` moves their pop as it moves the take-offs'. With `cueLater` off the two rules are the same function.
- **Compress his way.** `cueC`, `cueCL`, `cueCR` hold Compress (1) from `C_AT` = 0.2 s after the stand to the end of the
  ride, through the turn and the climb. 3.5o's `TURN_COMPRESS` pressed it only inside the turn window (`sharp-steer.ts:471`).
- **The turn** is 3.5o's: `cueL` / `cueR` (and `cueCL` / `cueCR`) hold the stick at +1 / −1 from `TURN_AT` 0.3 s for
  `TURN_FOR` 0.9 s after the stand; `STAND_HOLD` 5 s.
- **`x35`** (read-only): the stick and Compress sent, the board's course, heading, yaw rate and roll in 3.5o's sign
  (`rollS`, + with the +x rail down), the lean asked, and from the latest controller tick its arguments (depth, bank and
  twist asked, rail, tilt, face), the whole reference state and the whole gain row. The `stand` row prints the
  predictor's whole weights.

**How the switches arrive.** The organic drive appends `EXTRA` to the address and parses it through the game's own
`surfZoneConfigFor` (`EXTRA='&cueLater=on&plantFloor=6'`); `plantFloor` and `plantSpeed` reach `RideSession` through the
drive's `RIDER_KEYS` (both listed) and `cueLater` is read from the config by the drive's cue. (`sharp-steer.ts`'s
`EXTRA` is a JSON object merged over the rider options at line 121: it can carry `plantFloor` and `plantSpeed` but not
`cueLater`, which is not a rider option, so 3.5o's drive could never have ridden the later cue.) Every run prints back
`cueLater` (the `control` row) and the predictor's `plantFloor`, `plantSpeed` and whole weights (every `stand` row); the
reader refuses a file whose printed switches are not its arm's.

**Arms** (one process per arm per seed, all six scripts in one process: riders read the water and never push it, as in
every organic bench, so they share one sea):

| arm | `EXTRA` | role |
| --- | --- | --- |
| **A** | `&cueLater=on&plantFloor=6` | his preference, the base |
| **B** | `&cueLater=on&plantSpeed=taper` | beside it |
| **R** | `&cueLater=on` | the shipped balance with the later cue: attributes each failure to what A and B change |

**Populations:**

1. **Organic take-offs**, Canyon B Medium seeds 1–3, `PERIODS=12`: `cue` (stick centred) and `cueC` (his way). The take-off
   rows over the first 3 s must reproduce 3.5v's (`results/35v/data/o-s<seed>-on-base` for R, `-on-pf6` for A) and 3.5w's
   (`results/35w/data-taper/o-s<seed>-on-tp` summaries for B); where they do, 3.5v's classification is reused.
2. **The test wave's catch start**, runs 0–9, `cue` and `cueC`, on 3.5v's `sideways-falls.ts` unchanged (R is 3.5v's
   `c-*-on-base`; A and B are new). Lower priority than 1, 3 and 4 (power).
3. **Turns**, the same seeds and processes: `cueL`, `cueR` (steer only), `cueCL`, `cueCR` (his way); `cue` and `cueC` are
   the neutral controls of each. Seeds 4–9 steer only on A only if the usage and power guards allow.
4. **The climb after a turn** (§0.6), from the same turn riders, including seed 2 wave 2 left (3.5w's survivor).

### 0.3 Margins (3.5v §0.3, unchanged, plus the fore/aft and climb marks)

All in the board's frame, + toward its +x (left rail), times after the first `standing` frame.

- **M1** CoP demand: `headX = 1 − |copX| / halfwidth ≤ 0`. **M2** infeasible contact (`settleStanding` false; `cps.inf`).
  **M3** capture point across past reach (`beyond`). **M4** ankle overflow (`|raw| > limits.ankle`, `ctl.over > 0`), a
  mechanism marker, not an escape.
- **F** fore/aft: the capture point past the nose or tail (`pastZ > 0`), 3.5t's measure.
- **The first escape** is the earliest of M1–M3 and F at `tS > 0` (after the stand's own frame). Its axis is the engine's
  capture state on the last attached standing frame (`pastX` against `pastZ`, 3.5v's `axis`).
- **O** roll-out (turn riders only): the first frame after the turn window's end (+1.2 s) with the board rolled 20° or
  more to the outside of the turn (`rollS × turn ≤ −20°`, turn +1 left, −1 right).

### 0.4 The classification of the first failure, and what "first" means

For every rider that stood and separated within its hold (3 s for take-offs, as 3.5v; 5 s for turn riders), in this
order:

1. **P, pop-up separation:** no `standing` frame, or the separation within 0.1 s of the stand.
2. **S, stall over the crest:** at the first escape the board moves < 3.0 m/s through the water and the crest is at or past
   it (`ahead ≤ 0.5 m`).
3. **F, fore/aft:** the axis at the last attached frame is along.
4. **O, roll-out on the climb:** a turn rider whose first escape comes after +1.2 s and is preceded by O.
5. **L, the loop's own growth (3.5v):** M4 before the first escape, and the largest |raw ankle command| in each of the
   three 0.1 s windows before the escape grows (each larger than the one before). Labelled **L-ref** if at the first
   M4 the reference asks more than 15° of sideslip (3.5o's phantom), else **L-gain**; and "in the turn" when the escape
   falls inside +0.3 to +1.5 s on a turn rider.
6. **U, sideways with the range unused:** a sideways escape with no M4 before it.
7. **N, new:** anything else, described one by one.

**"First"** is the first of these events on the rider's own clock after the stand. A rider that lasts its hold has no
failure. Reported at the first failure: the time after the stand, the speed through the water (horizontal
|v_board − flow|, world, m/s), the schedule speed the controller was called with (its forward speed through the water),
the design speed the water tables are read at (R: the schedule speed; A: max(that, 6) for the tables; B:
max(v, min(1.68 v, 7.8))), and the leading channel: the capture-point split's largest channel over the last 0.15 s
before the escape (3.5v §5) and the controller's largest |term| at the first M4.

**Within the balance's authority** (3.5v §0.5): within when, over the last 0.1 s before the escape, the command is
unsaturated or points away from the fall side (the ankle and hip it had were not used), or when an arm rescues it
(carries ≥ 3 s, take-offs; or adds ≥ 0.25 s); outside when the command is saturated toward recovery for that 0.1 s and
the leading term is the water's (hull pressure, rails, fins, buoyancy) or the pop-up's landing.

### 0.5 Controls (before any finding counts)

- **Reproduction:** (a) R's and A's `cue`/`cueC` rows over 0–3 s against 3.5v's committed files, every common field,
  keyed by script, wave and time; B's stand and fall times against 3.5w phase 3's summaries. (b) With `cueLater` off
  (`EXTRA=''`), `SCRIPTS=cue,cueL,cueR`, `STAND_HOLD=5`, seed 2's 12 periods: every fall time against 3.5o's population
  (`results/35o/population-summaries.jsonl.gz`, shipped, steer only).
- **Inertness:** the same seed-2 run with `LAT=off X35=off LEDGER=off` gives every fall time of the instrumented run.
- One run per process; every run prints its build.

### 0.6 The climb

**Rule:** a turn rider is a **climber** when he is attached at +1.2 s (the turn window's end) and his climb (the wave
frame's face height × face fraction, m, as 3.5o defines it) later rises at least 0.20 m above its least value over
+0.3 to +1.2 s while he is attached. For each climber: the time, speed through the water and course at 0.50 m and at
3.5o's 0.90 m line, whether 0.90 m is reached, the peak climb, and O's time and speed.

**Instruments through the roll-out**, per tick from +1.2 s to the fall: the board's roll (`rollS`), the body's bank, the
lean asked, the reference's bank (`x_ref[2]`, which `tick` sets to the bank asked), roll (`x_ref[0]`) and yaw rate
(`x_ref[4]`), the coordinated bank `atan(v r / g)` for the board's measured yaw rate r at the true speed through the water
and at the design speed the arm reads (v_eq for B, the floored row's speed for A), and the controller's terms.

**The decision on 3.5w's question**, by 3.5o's frozen-state split (offline, at each logged tick, the arm's own predicted
state): recompute the raw ankle command with (the arm's gains, the arm's reference), which must reproduce the logged raw
within 0.2°; (the arm's gains, R's reference at the same lean, speed, depth and rail); and (R's gains, the arm's
reference). **"The reference asks too little bank"** if the reference's bank and roll targets sit inside the
coordinated bank for the measured turn and swapping in R's reference moves the command further toward the inside of the
turn than swapping in R's gains does; **"the roll terms of the stiffer-water design"** if the gains' swap does more.

### 0.7 The delay question (if the first failure is the loop's own growth)

Offline, on the code's own `closedLoop` and `leastDamping` (exported from `predictiveBalance.ts`; a new probe-side
script, no `src` change): for R, A and B, the controller each arm builds (`PredictiveController.blend` with the arm's
weights, rail 0) at schedule speeds 3–8 m/s, three stances (depths 0, 0.195, 0.30) and the tuck (0.45) apart, closed on
the plant at the TRUE speed (`plantAt(v, depth)`, the shipped table read at v) with the true delay of 6 ticks and a frame
off each way (5, 7). Reported: the least damping per cell (3.5s's gate's form). A second truth, 3.5w's measured
flat-water rows at 3–4.5 m/s (`results/35w/rows.jsonl`, tag `ride`), if the existing code reads them without a `src`
change. **The test:** does the least damping fall to ≤ 0 at the speeds and stances where the L failures sit, and stay
above 0 where the stands last?

### 0.8 Predictions (before any arm runs)

1. **Take-offs (A):** the falls left are 3.5v's roughest and slowest landings (s1w8, s3w9; schedule speed 3.2–3.9 m/s,
   first M4 ≤ +0.3 s), class **L-gain**, led by the board's centre-of-mass acceleration, at the edge of authority; the two
   fore/aft falls (s2w6, s2w10 `cue`) stay **F**; s3w2 stays **P**. B the same set within one stand; R is 3.5v's.
   Compress changes no take-off class.
2. **Turns, steer only:** with the later cue the stands are faster, so R shows fewer than half of 3.5o's sharp-steer
   collapses per seed; R's that remain are **L-ref in the turn** at 3.85–4.4 m/s. On A and B the first failure moves to
   after the turn window: **O** on the climbs and **L-gain** when the board slows below about 4 m/s.
3. **His way:** Compress held fails earlier than steer only on every arm (the deep stance reads the Compress and tuck
   knots); A carries his way further than B (3.5w: +1.13 s against +0.37 s on 3.5o's Compress collapses).
4. **The climb:** B rolls out (**O**) at 5–6.5 m/s; A falls on the climb below 6 m/s, where it reads the 6 m/s row; R
   reaches 0.90 m on s2w2 left as 3.5o. **The mechanism:** the roll terms of the stiffer-water design, not the
   reference. The stick is centred from +1.2 s, so the lean asked eases to 0 and the reference asks no bank on the climb
   whatever the speed; the reference is the same function of the lean on every arm.
5. **A against B:** every difference in first failure between A and B sits at schedule speeds of 4.6–7.8 m/s, where the
   two designs differ (A is shipped at ≥ 6 m/s, B reads the 7.8 m/s water up to 7.8 m/s).
6. **The delay check:** R's least damping is ≤ 0 below 4.5 m/s at the tall and crouch stances with the true delay or a
   frame more, and A's and B's stay above 0 there; at 5–6.5 m/s B's is lower than A's.

### 0.9 Guards

Usage checked at each phase boundary; at 80 % of the 5-hour window, stop, push what is green and write what is left.
Power: the laptop is on battery (36 % at the pre-registration); no new batch below 25 % while discharging. The order of
batches is therefore: A seeds 1–3 with the seed-2 reproduction; then B seeds 1–3 and R seed 2; then R seeds 1 and 3 and
the catch start.
