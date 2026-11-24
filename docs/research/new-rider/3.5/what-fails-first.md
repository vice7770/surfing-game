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

### 0.10 Added after A's seeds 1 and 3 were read, before R seeds 1 and 3 and B seed 2 ran (2026-11-24)

B seeds 1 and 3 and A and R seed 2 were already running, and none of them had been read. A's turn riders often lose a
margin briefly and stand on: s1w6 `cueL` loses the contact (M2, an `impact` limit) at +1.40 s and separates at
+3.07 s. The first escape of §0.4 stays the rule and is reported as registered. **One descriptive read is added beside
it, and it changes no class:** the **final escape**, the onset of the last run of margin loss (any of M1–M3, F on
consecutive frames, gaps of at most 0.05 s bridged) that ends in the separation, with the speed through the water, the
schedule speed and the lean asked there. Where the two differ by more than 0.3 s the table shows both.

## 1. The answer

*Seeds 1–3, Canyon B Medium, 12 periods; every rider rode 5 s after the stand. Speeds are horizontal |v_board − flow|
(vW, m/s, world) and the controller's schedule speed (its forward speed through the water, m/s); roll is 3.5o's
(`rollS`, + with the +x rail down), so for a left turn + is the inside; times are seconds after the stand.*

**On take-offs, A's first failure is no longer the balance's loop. On turns, it is the board slowing below about
4 m/s after the stick is released, with the balance asking too little. On B with Compress held, it is the loop again,
inside the turn, at 4.4–7.5 m/s, where B's design differs from A's.**

1. **Take-offs (A).** Of 13 stands per script, 5 fall with the stick centred and 4 his way, against R's 6 and 5. The
   rows reproduce 3.5v's exactly (§2). Two of A's falls are 3.5v's fore/aft pair (s2w6, s2w10 `cue`), unchanged by
   every arm. The two that remain sideways are the slowest landings, s1w8 and s3w9, and they are no longer a growing
   loop. Their first ankle overflow comes at the first tick after the blind start (+0.10 and +0.12 s). Then the board's
   nose rises from +7° to +28° (s1w8) and from −1° to +40° (s3w9) by +0.7 s. Its speed through the water halves, from
   3.8 and 4.3 to 2.3 and 1.8 m/s, and hull pressure falls from 0.70 to 0.33 of the pair's weight. The sideways escape
   comes at +0.72 to +0.83 s at vW 1.9–2.5 m/s. The command at that escape is small: median |raw| 8.5°, inside the
   ±14.3° range on every A take-off fall. The pitch-up and the speed loss are the same on R, A and B to within a few
   degrees and a few tenths of a m/s. Neither switch changes them (§4.1).
2. **Turns, steer only (A).** 24 of 26 turn riders fall within 5 s on A, 23 on R and 22 on B. On A, 9 of the 24 share
   their stick-centred twin's take-off failure. 14 are caused by the turn (the twin outlives the rider by ≥ 0.5 s),
   and none of those comes in the turn window. They fall at a median 2.52 s, about 1.3 s after the stick is released at
   +1.2 s. The schedule speed at their final escape is a median
   3.8 m/s. With the later cue the stands are faster, so the full stick asks a lean of 45–50° at 7–9 m/s, not
   3.5o's 21°. After the release, the lean asked eases to 0 by about +1.9 s. The board keeps yawing at up to 130°/s
   (median of the largest) and slows to a median least speed of 2.4 m/s through the water. It then rolls 20° or more,
   to the inside of the turn in 16 of A's 24 falls and to the outside in 6. The command never reaches the range: at
   the final escape it is inside the range or pointing away from the fall in 24 of 24, median |raw| 10°.
3. **Turns, his way (A).** Compress held from +0.2 s carries A's turn riders a median +0.6 to +0.9 s further than steer
   only (18 later, 0 sooner of 26 pairs; §5). The failure is the same kind, later: final escape a median 3.1 s at a
   schedule speed of 1.6 m/s.
4. **R (the shipped design with the later cue)** fails by 3.5v's loop growth at take-off (9 sideways falls, every one
   3.5v's, plus the two fore/aft) and, in turns, mostly at the turn-back. It falls at a median 1.93 s at a schedule
   speed of 4.2 m/s, with the command past the range: median |raw| 39° at the final escape, 20 of 23 overflowing.
5. **B (taper)** steer only lasts longest of the three: B − A median +0.27 s, 14 later, 2 sooner. **His way, B fails in
   the turn.** 16 of its 23 falls are caused by the turn. 11 of them come inside +0.3 to +1.5 s, 10 of those at
   schedule speeds of 4.4–7.5 m/s: the plateau, where it reads the 7.8 m/s water. The command there overflows (median
   |raw| 27°, 21 of 23 past the range): the loop's own growth. Compress makes B worse, median −0.28 s, and moves its
   final escape from about 2.6 s to about 1.0 s. A his way outlasts B his way by a median +0.51 s (15 later, 4 sooner).

**Within the balance's authority.**
- **Every class the arms touch is within it** by the pre-registered rule. Over the last 0.1 s before the escape the
  command is either unsaturated or pointing away from the fall.
- **R and B (with Compress)** drive an oscillation past the range, as 3.5v found: an over-gained loop.
- **A** under-uses the range on the slow board after a turn.
- **Untouched by any arm:** the take-off pitch-up stall and the two fore/aft falls. They are fore/aft, which neither
  switch changes, and were not diagnosed here.

**The climb (3.5w's question).** On the climb the stick is centred, so the lean asked is 0 and the reference asks no
bank. Meanwhile the board is still turning: its measured yaw rate at its true speed implies a coordinated bank of
5–56° (median of per-rider medians about 25°). Swapping R's reference into A's or B's command at the same state
changes it by 0.00° (median over 1 785 ticks). Swapping R's gains changes it by a median 2.1°, up to 10° on single
riders. **So the roll-out is not the reference asking too little bank for the real speed.** The reference asks none,
because the stick asks none. On the climb the arms differ only in their gains. The stiffer-water designs ask less
ankle than R's would at the same state. Whether R's gains would hold the climb cannot be read off a frozen state, and
R mostly falls before the climb: 4 R climbers against 8 A and 12 B.

**The delay check** (§8) predicts two of the failures and misses one:
- **It predicts B's plateau weakness.** At the true 0.1 s delay, B's least damping at 5.25–6 m/s is −0.06 (tall) and
  −0.04 (crouch), against A's +0.20 and R's +0.50.
- **It predicts R's edge below 4.5 m/s.** R is stable at its own 6-tick delay but unstable one frame off either way,
  −0.07 to −0.20.
- **It misses A's low-speed failure.** Below 5 m/s it gives A and B a real divergence in yaw and sideslip, on both
  truths the repository holds. In the game, A and B carry those very stands further than R. The linear truths do not
  describe the game's board below 5 m/s.

## 2. Controls (all passed before any finding was read)

| control | result |
| --- | --- |
| builds printed back (`control` row's `cueLater`, every `stand` row's `plantFloor`/`plantSpeed`/weights) | every file its arm's: A `on`/6/–, B `on`/–/`taper`, R `on`/–/–, S0 –/–/– |
| take-off rows, R against 3.5v `o-s<seed>-on-base` | riders 24 / 22 / 24 identical (stand, pop, fall ≤ 3 s); frame rows 3 972 / 3 216 / 4 244 identical in every common field |
| take-off rows, A against 3.5v `o-s<seed>-on-pf6` | riders 24 / 22 / 24; frame rows 3 996 / 3 401 / 4 497 identical |
| take-off summaries, B against 3.5w `o-s<seed>-on-tp` | riders 24 / 22 / 24 identical (3.5w kept no frames) |
| turns with `cueLater` off (S0), seed 2, 12 periods, against 3.5o's population (shipped, steer only) | 33 of 33 riders, identical stand and fall times (to 1.5e-4 s: 3.5o rounds to 5 decimals) |
| the seed-2 wave-2 left climb, S0 | 0.50 m at +2.067 s, course 48.6°; 0.90 m at +2.783 s, course 46.4°: 3.5o's numbers |
| inertness: S0 with `LAT=off X35=off LEDGER=off` | 33 of 33 fall times identical |
| `git diff 1be12ee7..HEAD -- src scripts` | empty at every commit |
| frozen-state split, (arm K, arm ref) against the logged raw | worst 0.04° over 1 785 climb ticks |

**What the switch does not reach.** Every pair has the same stand on every arm. `cueLater` moves the pop; A, B and R
differ only after the stand.

Run note: twice, for a few minutes, a fifth process ran beside four. The take-off queue and the organic queue each
counted free slots and both launched. Every run is still one per process, and none of its results depend on the
others.

## 3. The population as measured (`results/35x/summary.md`, `classify.md`)

| arm | drive | stood | fell in hold | median fall (s) | final escape, median t (s) | median vW / sched there (m/s) | sched < 4.5 at the final escape | rolled ≥ 20° inside / outside | median \|raw\| last 0.1 s (deg); over the range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R | take-off, centred (3 s) | 13 | 6 | 0.90 | 0.37 | 3.81 / 3.65 | 5 of 6 | – | 36 (both scripts); 9 of 11 |
| R | take-off, his way | 13 | 5 | 1.00 | 0.32 | 3.91 / 3.99 | 4 of 5 | – | |
| R | turn, steer only (5 s) | 26 | 23 | 0.93 | 0.62 | 4.18 / 3.96 | 18 of 23 | 2 / 1 | 39; 20 of 23 |
| R | turn, his way | 26 | 22 | 1.17 | 0.80 | 3.73 / 3.51 | 18 of 22 | 2 / 2 | 37; 22 of 22 |
| A | take-off, centred | 13 | 5 | 0.92 | 0.80 | 2.25 / 1.78 | 5 of 5 | – | 8.5 (both); 0 of 9 |
| A | take-off, his way | 13 | 4 | 1.31 | 0.94 | 2.22 / 1.40 | 4 of 4 | – | |
| A | turn, steer only | 26 | 24 | 2.42 | 2.12 | 3.37 / 2.59 | 19 of 24 | 16 / 6 | 10.3; 1 of 24 |
| A | turn, his way | 26 | 19 | 3.27 | 3.10 | 2.39 / 1.59 | 18 of 19 | 14 / 4 | 9.6; 0 of 19 |
| B | take-off, centred | 13 | 5 | 1.38 | 0.82 | 2.43 / 2.51 | 5 of 5 | – | 6.4 (both); 2 of 8 |
| B | take-off, his way | 13 | 3 | 1.35 | 0.88 | 1.83 / 1.30 | 3 of 3 | – | |
| B | turn, steer only | 26 | 22 | 2.74 | 2.61 | 2.44 / 2.50 | 18 of 22 | 10 / 4 | 17.0; 14 of 22 |
| B | turn, his way | 26 | 23 | 1.38 | 1.05 | 3.35 / 3.28 | 13 of 23 | 5 / 5 | 27.3; 21 of 23 |

"Fell in hold" counts the riders that separated within 3 s (take-offs, 3.5v's hold) or 5 s (turns). The final escape
is §0.10's descriptive read. "Over the range" counts the falls whose |raw| exceeded the ±14.3° ankle range in the
last 0.1 s before it.

**The registered classes (§0.4, first escape)** (`classify.md`, every rider listed):

| arm | drive | stood | held | P | S | F | O | L-gain | L-ref | U | N |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R | take-off, centred | 13 | 7 | 0 | 0 | 2 | 0 | 4 | 0 | 0 | 0 |
| R | take-off, his way | 13 | 8 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 |
| R | turn, steer only | 26 | 3 | 0 | 0 | 1 | 0 | 9 | 2 | 10 | 1 |
| R | turn, his way | 26 | 4 | 0 | 0 | 0 | 1 | 15 | 2 | 0 | 4 |
| A | take-off, centred | 13 | 8 | 0 | 0 | 2 | 0 | 1 | 0 | 1 | 1 |
| A | take-off, his way | 13 | 9 | 0 | 0 | 1 | 0 | 2 | 0 | 1 | 0 |
| A | turn, steer only | 26 | 2 | 0 | 0 | 2 | 0 | 5 | 0 | 14 | 3 |
| A | turn, his way | 26 | 7 | 0 | 0 | 2 | 1 | 10 | 0 | 5 | 1 |
| B | take-off, centred | 13 | 8 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 2 |
| B | take-off, his way | 13 | 10 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 |
| B | turn, steer only | 26 | 4 | 0 | 0 | 3 | 0 | 4 | 0 | 11 | 4 |
| B | turn, his way | 26 | 3 | 0 | 0 | 0 | 2 | 7 | 0 | 0 | 14 |

**How to read the registered classes for turns.**
- **U carries most of A's turns.** The first escape of many turn riders on every arm is a transient loss of contact
  (M1/M2) at +0.67 to +0.72 s, when the lean asked passes about 30°. He stands on through it, for 1–2 s on A and B.
  Hence the dated final-escape read (§0.10).
- **L-gain at +0.28 to +0.42 s on a turn rider** is in most cases the take-off's own loop: his stick-centred twin falls
  at the same frame.
- **B's 14 N with Compress** are oscillations past the range whose three 0.1 s maxima do not rise monotonically,
  e.g. 19.8, 31.2, 19.3°: §0.4's "grows" test misses an overflowing oscillation that has already peaked.

**Turn-caused against the take-off's own failure** (`turn-twins.md`, the same stand's stick-centred twin, both ridden
5 s):

| arm | drive | turn riders | fell in 5 s | twin falls too (within 0.25 s, or first) | turn-caused (twin outlives by ≥ 0.5 s) | turn-caused: median fall (s); median sched at the final escape (m/s); final escape inside +0.3–1.5 s |
| --- | --- | --- | --- | --- | --- | --- |
| R | steer only | 26 | 23 | 9 | 13 | 1.93; 4.17; 5 of 13 |
| R | his way | 26 | 22 | 10 | 10 | 2.36; 3.51; 4 of 10 |
| A | steer only | 26 | 24 | 9 | 14 | 2.52; 3.83; **0 of 14** |
| A | his way | 26 | 19 | 8 | 9 | 3.70; 2.31; 0 of 9 |
| B | steer only | 26 | 22 | 8 | 12 | 2.90; 3.37; 3 of 12 |
| B | his way | 26 | 23 | 4 | 16 | 1.41; 4.91; **11 of 16** |

## 4. What fails first, class by class, and the evidence chain

### 4.1 Take-offs

- **R: 3.5v's loop growth, reproduced row for row.** s1w8, s2w5, s3w6, s3w9 (both scripts) and s2w10 `cueC`:
  - first M4 at +0.13 to +0.28 s (s2w10 `cueC` at 0.73);
  - first escape at +0.28 to +0.37 s, at a schedule speed of 3.3–4.8 m/s;
  - |raw| grows through the three windows, e.g. s3w6 `cue` 10 → 12 → 43°;
  - the board's centre-of-mass acceleration is the largest capture-point channel in all 9 (s3w6: −0.68 m, 3.5v's
    number);
  - the first-overflow term is twist-rate or bank-rate.

  s2w6 and s2w10 `cue` are fore/aft (F): capture point past the nose first, at +0.65 and +0.52 s.
- **A** carries s3w6 (both scripts) for 3 s. It delays s2w5 (1.05 → 2.15 / 2.47 s), s2w10 `cueC` (1.02 → 1.52 s) and
  s1w8 (0.78 → 0.90 / 1.10 s). s3w9 changes by about +0.1 s. That is 3.5v's 2 rescued and 4 delayed.
- **The slowest landings, s1w8 and s3w9 (A).** At the stand they move 3.76 and 4.34 m/s through the water, at schedule
  speeds of 3.45 and 3.86.
  - The first tick already overflows (+0.10, +0.12 s).
  - Under A the command then stays small: |raw| windows 5 → 6 → 10° and 2 → 2 → 2°.
  - By +0.7 s the deck pitch has risen +7 → +28° (s1w8) and −1 → +40° (s3w9). vW has fallen to 2.3 and 1.8 m/s, and
    hull pressure from 0.70–0.76 to 0.33–0.35 W. The board is 1.5–2.7 m ahead of the crest, so this is not 3.5t's
    stall over the crest.
  - The fore/aft ledger over 0–0.7 s (pitch-rate change, + nose down, rad/s):
    - s3w9: the pitch balance −6.6 and the leg −4.3 against hull pressure +6.6.
    - s1w8: the pitch balance −2.3 and the leg −1.0 against added mass +1.5 and the fins +1.0.
    - A lasting stand (s1w10): the leg +26 nose down.
  - **Read (inferred, not tested):** on these two the rider's own fore/aft balance and the leg pitch the nose up while
    the board decelerates. The lateral design cannot reach that, and neither switch changes it.

  Class N or L-gain by the rule; recorded here as a **fore/aft stall on the face** (new).
- **B** is A's picture on the same stands (s1w8, s3w9 fall at 0.97 and 1.35–1.38 s). It carries s2w5 to 2.80 /
  3.28 s, and s2w6 and s2w10 `cue` stay F.

### 4.2 Turns, steer only

The sequence is the same on every arm. Here it is on A s2w2 `cueL` (`ticks` read, `results/35x/climb-ticks.md`):
- **The turn.** The stand is at 7.1 m/s through the water. The lean asked ramps to 50° by +0.98 s against a cap of
  about 59° at 9 m/s, and the board banks to 45–48°.
- **The release.** At +1.2 s the stick centres and the lean asked eases to 0 by +1.9 s. Its yaw rate swings from +153
  to −101°/s between +1.53 and +1.93 s, and by +1.98 s it has slowed to 3.3 m/s.
- **The roll-in.** From +2.0 s, at 3.3–5.0 m/s, it rolls back in, +4 → +45° by +2.33 s. The command grows only to
  +12.7° by +2.43 s (the model's sign), inside the range.
- **The separation** comes at +2.47 s.

| arm | turn-caused falls | where the final escape sits | the command there | evidence chain |
| --- | --- | --- | --- | --- |
| R | 13 | median 1.93 s, sched 4.17 m/s; 5 of 13 in the turn window | overflows, median 39° | release → slowing below 4.5 → 3.5v's loop (bank, bank-rate, twist-rate terms) → board CoM acceleration |
| A | 14 | median 2.52 s, sched 3.83; **none** in the window | inside the range, median 10° | release → yaw swing 129°/s (median of the largest) → slowing to 2.4 m/s → roll ≥ 20° (16 of 24 inside) with the range unused |
| B | 12 | median 2.90 s, sched 3.37; 3 in the window | 17°; 14 of 22 overflow | between the two |

### 4.3 His way (Compress held from +0.2 s)

| arm | Compress − steer only, paired turn riders | change in the first failure |
| --- | --- | --- |
| R | +0.15 (L) / +0.48 (R) s; 13 later, 0 sooner of 26 | in-window first escapes 11 → 6 (each side); still the loop |
| A | **+0.90 / +0.60 s; 18 later, 0 sooner** | in-window first escapes 10/9 → 3/3; the final escape moves from 2.1 to 3.0–3.1 s; same kind, later |
| B | **+0.00 / −0.28 s; 6 later, 12 sooner** | the final escape moves from 2.6 to 1.0–1.1 s: B collapses inside the turn (11 of 16 turn-caused) at schedule speeds of 4.4–7.5 m/s, with the command past the range |

On take-offs Compress changes no first failure on any arm: 0 sooner, 2–4 later of 13 pairs each.

## 5. Where A and B differ (`results/35x/diverge-AB.md`)

The first frame at which the same rider's roll differs by more than 2° between A and B:

| drive | riders that part | median time (s) | median schedule speed there (m/s) | at 4.6–7.8 m/s | below 4.6 |
| --- | --- | --- | --- | --- | --- |
| take-offs | 21 | 1.13 | 3.47 | 5 | 16 |
| turns, steer only | 26 | 0.62 | 5.20 | 16 | 10 |
| turns, his way | 26 | 0.59 | 5.56 | 11 | 12 (3 above 7.8) |

Paired fall times, A − B:
- take-offs: +0.00 s (0 later, 2 sooner of 13, each script);
- turns, steer only: **−0.27 s** (2 later, 14 sooner);
- turns, his way: **+0.51 s** (15 later, 4 sooner).

**Measured:** Vicente rides holding Compress, and that is where A beats B. B's losses with Compress are the loop
overflowing inside the turn at schedule speeds of 4.4–7.5 m/s. In turns the two rides part at a median 5.2–5.6 m/s, so
the difference sits largely on the 4.6–7.8 m/s plateau. In take-offs they part below it, at 3.5 m/s, and the take-off
outcomes are the same. **Inferred:** his "A steadier" is B's Compress turn on the plateau.

## 6. The climb (`results/35x/climb.md`, `climbsplit.md`)

Climbers by §0.6's rule (seeds 1–3): R 4, A 8, B 12. B's three s3w9 entries are slow take-offs rising on the face,
not bottom turns; the rule admits them.

3.5o's 0.90 m line is reached by:

| arm | rider | at (s) | vW (m/s) |
| --- | --- | --- | --- |
| R | s1w6 L | 2.87 | 2.2 |
| A | s1w6 L | 2.85 | 2.0 |
| A | s2w11 R | 3.07 | 1.7 |
| B | s1w6 R | 2.75 | 3.0 |
| B | s2w2 L | 2.80 | 3.5 (course 69°) |
| B | s2w2 R | 2.92 | 3.0 |

Note that s1w6 L lasts the whole 5 s on R.

**3.5w's survivor under the later cue.** With `cueLater` the pop on seed 2 wave 2 comes 0.43 s later (7.72 against
7.28 s), and the stand is faster: 8.3 against 6.7 m/s through the water at +0.32 s.
- R falls at 1.98 s and never climbs.
- A reaches 0.50 m at +2.18 s (3.9 m/s) and falls at 2.47 s without 0.90 m.
- B reaches 0.90 m at +2.80 s and falls at 2.83 s.

Without `cueLater` (S0) it reaches 0.90 m at +2.78 s and falls at 3.70 s, as 3.5o recorded.

**The frozen-state split over every A and B climber**, from +1.2 s to the final escape, 1 785 ticks. The check is
within 0.04° throughout.

| | median |
| --- | --- |
| lean asked | 0.0–0.4° on 14 of 17 riders (19.9° and 32.6° on two still easing out, 4.5° on one) |
| the reference's bank | the same as the lean asked |
| coordinated bank for the measured yaw rate at vW | 5–56° (per-rider medians) |
| change in the command from swapping in R's reference | **0.00°** |
| change from swapping in R's gains | **2.1°** (per rider 0.0–10.4°; larger than the reference swap on 1 244 of 1 785 ticks) |

**Answer.**
- **Measured.** The reference plays no part on the climb. With the stick centred it asks 0 bank, on every arm and at
  every speed. A and B differ from R only through the gains. The stiffer-water designs ask less ankle there.
- **Inferred.**
  - **The roll-out is the slowing board.** It is not a reference asking too little bank for the real speed. After the
    release the board falls through 4.5 m/s on the climb, still turning, at a bank the stick no longer asks for.
  - **The two designs fail it in opposite ways.** A's 6 m/s-row gains and B's 7.8 m/s-water gains correct too little.
    R's own gains oscillate past the range.
  - **This is a property of the drive.** 3.5o's 0.9 s steer pulse releases the stick at +1.2 s. 3.5w's taper climb
    used the same drive.

## 7. Verdict: within the balance's authority?

| class | arms | within? | evidence chain |
| --- | --- | --- | --- |
| loop growth at take-off (3.5v) | R; B and A on s1w8 / s3w9 at the first tick | **within**, a defect of its own low-speed design (3.5v §7) | overflow at +0.13–0.28 s → |raw| grows → board CoM acceleration leads; A/B change it (rescue / delay as 3.5v) |
| fore/aft stall on the face (new) | all (s1w8, s3w9 after A's and B's correction) | **not within what A or B change**; the fore/aft balance's own authority **not tested** | nose up 21–40°, vW halves, pressure 0.70 → 0.33 W, identical on every arm; the lateral command is small at the escape |
| fore/aft F (s2w6, s2w10 `cue`) | all | not tested (3.5v did not diagnose them either) | capture point past the nose at +0.65 / +0.52 s |
| pop-up separation (catch run 3) | all | outside (3.5v) | §9 |
| turn: loop at the turn-back | R | **within** (over-gained: median 39° past a 14.3° range, oscillating, not toward recovery) | release → < 4.5 m/s → bank/bank-rate terms grow |
| turn: slow roll after the release | A (and B steer only) | **within** (the range unused: median |raw| 10°, 24 of 24 inside the range or away) | release → yaw swing → < 3 m/s → roll ≥ 20° with a small command; R's gains would ask 2–10° more (frozen split) |
| turn with Compress: loop on the plateau | B | **within** (over-gained: median 27°, 21 of 23 past the range) | Compress + 4.4–7.5 m/s → the 7.8 m/s-water design → overflowing oscillation; the delay check flags B there |

No class needs more authority to explain it. Each falls with the ankle range either unused (A) or spent on an
oscillation the balance drives itself (R, and B with Compress). The two fore/aft classes are the exception: what limits
them was not measured.

## 8. The delay question (`what-fails-first-model.ts`; `results/35x/model-summary.md`, `model-table.jsonl`, `model-game.jsonl`)

The controller each arm builds (rail 0) was closed on the plant at the true speed, with the true 6-tick delay and a
frame off each way. The truth was either the shipped table at v (`table`) or 3.5w's measured flat-water rows at
3–4.5 m/s (`game`). The table below gives the worst least damping over 5, 6 and 7 ticks, with the value at the true
6 ticks in brackets. "div" marks a real root outside the unit circle.

| truth | stance | arm | 3–4.25 m/s | 4.5–5 m/s | 5.25–6 m/s | 6.5–8 m/s |
| --- | --- | --- | --- | --- | --- | --- |
| table | tall | R | −0.07 (+0.23) | +0.00 (+0.46) | +0.06 (+0.50) | +0.17 (+0.65) |
| table | tall | A | div | div | +0.16 (+0.20) | +0.17 (+0.65) |
| table | tall | B | div | div | **−0.06 (−0.06)** | +0.15 (+0.36) |
| table | compress | R | −0.13 (+0.20) | −0.03 (+0.46) | +0.07 (+0.52) | +0.18 (+0.66) |
| table | compress | A | div | div | div at 5.25, else ≥ +0.16 | +0.18 (+0.66) |
| table | compress | B | div | div | div at 5.25; −0.004 at 5.5 | +0.11 (+0.28) |
| game | every stance | R, A, B | div | div (2–3 of 3 cells; B crouch to tuck +0.18 to +0.20 at 4.75) | as `table` | as `table` |

**Measured.**
- **R.** Stable at its own delay at 3–5 m/s, but one frame either way makes it unstable below 4.5 m/s (tall) to 5 m/s
  (tuck).
- **B.** Its plateau design is marginal even at the true delay at 5.25–6 m/s. Its minimum over ±1 frame there is
  −0.06 to +0.07 (tall), against A's +0.16 and R's +0.06 to +0.16.
- **A and B below 5 m/s.** Both have a real divergence there on both truths. The growing mode is yaw rate and
  sideslip (each state over the design's `stateScale`): the table's rows 4 and 4.5 are directionally unstable (3.5w's
  weathercock), and a design on stiffer water does not hold that.

**Read.**
- **It predicts R's take-off loop.** The 4.5 m/s edge is where 3.5v put the falls.
- **It predicts B's Compress-turn loop** on the plateau.
- **It does not predict A.** In the game, A carries the very stands the model says it cannot. So neither truth in the
  repository is the game's board below 5 m/s. The question cannot be closed with the existing tools without a truth
  identified from the game's own ticks.
- **No `src` change was needed** to run the check, and no new design was built.

## 9. The catch start and seeds 4–9

### 9.1 Seeds 4–9, A, steer only (`results/35x/s49-summary.md`, `classify-s49.md`, `climb-s49.md`)

Every file printed back `cueLater` on and `plantFloor` 6. R and B were not run on these seeds, so nothing here is
attributed between arms.

| | stood | fell in hold | the picture |
| --- | --- | --- | --- |
| take-offs (`cue`, 3 s) | 21 | 11 | median fall 0.95 s; registered classes F 4, U 3, N 2, S 1, L-gain 1. Final escape at a median vW of 2.15 m/s and schedule speed of 1.88 m/s. The board has slowed from about 4 m/s at the stand. Three are seeds 1–3's pitch-up stall again (s5w5 +14 → +38°, which the rule classes S since the crest is 0.47 m behind it; s5w12 +8 → +25°; s6w10 −2 → +39°). |
| turns (`cueL`, `cueR`, 5 s) | 42 | 41 | 21 share their twin's take-off failure. 19 are caused by the turn: median fall 3.18 s, schedule speed 2.83 m/s at the final escape, 2 of 19 in the turn window, rolled ≥ 20° inside 8 and outside 8, median \|raw\| 9.8° (3 of 19 past the range) |

**Read.** Seeds 4–9 repeat seeds 1–3's A picture, out of sample:
- Most turn falls caused by the turn come after the release, on a board that has slowed below 3–4 m/s, with the ankle
  range largely unused.
- About half the turn riders on these seeds fall first by their take-off: the slow board or a fore/aft escape.

### 9.2 The test wave's catch start, `cueLater` on (`results/35x/catch.md`; 3.5v's `sideways-falls.ts` unchanged)

Runs 0–9, `cue` and `cueC`, on A and B. R is 3.5v's committed `c-*-on-base`. Every A and B run printed back its build
(`on`/6/– and `on`/–/`taper`), and every stand is R's stand to the frame.

- **A and B carry all 18 stands for 3 s,** as R does.
- **Run 3 separates in the pop-up on every arm (P),** unchanged, with no stand. This is 3.5v's pop-up separation, the
  only first failure on this wave with the later cue.

## 10. Candidates for Vicente (not built), surprises, what is left, reproduce

**Candidates (none built; each needs his word, and every one that changes the balance needs a `src` change):**
1. **Keep A's low-speed rows and take the plateau out of B.** A map that is `face` below 4.64 m/s and returns to the
   true speed by about 6 m/s, instead of holding 7.8 m/s water to 7.8 m/s. 3.5w §9.11 item 1 proposed the same shape.
   *Evidence:*
   - B's Compress turn collapses at 4.4–7.5 m/s, where A's design (shipped at ≥ 6 m/s) holds.
   - The delay check marks B's plateau at −0.06 at the true delay.
   - B steer only is the best arm on the slow board after the turn.
2. **A design that knows its delay at 3–5 m/s.** R's low-speed design is stable at exactly 6 ticks and unstable a frame
   either way. A's is too soft after the turn. A design built with the delay's uncertainty in it (or the robustness
   gate 3.5s used, across ±1 frame) sits between them. Before it can be tested, it needs a truth for the slow board
   (candidate 4).
3. **The fore/aft stall at take-off.** Diagnose why the nose rises 21–40° on the slowest landings. The pitch balance
   and the leg pitch it up while the board decelerates; nothing in this round changes that.
4. **Identify the slow board's plant from the game's ticks** (probe-side least squares on the logged states and
   commands; no `src` change). Neither linear truth in the repository reproduces the game below 5 m/s, so no low-speed
   design can be checked offline until one does.
5. **A question for him about the drive:** does he release the stick as he comes off the bottom? Every climb here
   centres it at +1.2 s, and the roll-out follows that release. A drive that holds the stick through the bottom turn
   is the next test of the climb, not a code change.

**What surprised me.**
- **The later cue changes the turn.** The stands are faster, and the full stick now asks 45–50° of lean at 7–9 m/s,
  not 3.5o's 21°.
- **The shipped balance still loses 23 of 26 turn riders** steer only, even from these faster stands.
- **Compress helps A and hurts B.** It carries A a median +0.6 to +0.9 s further and costs B −0.28 s.
- **A's take-off falls are not the loop any more.** The two that remain are a fore/aft stall, identical on every arm.
- **3.5w's climb survivor (s2w2 L) is a different ride with the later cue.** It falls on R at 1.98 s, and reaches 0.90 m
  only on B.

**What is left.**
- R and B on seeds 4–9 (only A ran there, steer only), and his way on seeds 4–9.
- The fore/aft stall and the two F falls, not diagnosed.
- A climb with the stick held.
- A game-identified plant for the delay check.
- The registered "grows" test misses B's peaked oscillations (14 N). The final-escape read shows them, but the class
  table understates the loop on B with Compress.

**Reproduce** (the probe's bundle SHA-256 `bf3405991c454606fdf86317299e0b3389404b5fb4d6b3a21b2393b0b423ccc9`, built from
the committed `what-fails-first.ts`):

    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/what-fails-first.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > <s>/wff.mjs && cat <s>/raw.mjs >> <s>/wff.mjs
    # arms A, B, R (one process per arm per seed, ~10.5 min each with four running)
    env MODE=organic SEED=<1-3> PERIODS=12 STAND_HOLD=5 SCRIPTS=cue,cueC,cueL,cueR,cueCL,cueCR EXTRA='&cueLater=on&plantFloor=6' OUT=<s>/runs/o-s<seed>-A.jsonl node --max-old-space-size=3200 <s>/wff.mjs
    env ... EXTRA='&cueLater=on&plantSpeed=taper' OUT=<s>/runs/o-s<seed>-B.jsonl ...
    env ... EXTRA='&cueLater=on' OUT=<s>/runs/o-s<seed>-R.jsonl ...
    # the controls
    env MODE=organic SEED=2 PERIODS=12 STAND_HOLD=5 SCRIPTS=cue,cueL,cueR EXTRA='' OUT=<s>/runs/o-s2-S0.jsonl node ... <s>/wff.mjs
    env ... LAT=off X35=off LEDGER=off OUT=<s>/runs/o-s2-S0-off.jsonl ...
    # seeds 4-9, A, steer only
    env MODE=organic SEED=<4-9> PERIODS=12 STAND_HOLD=5 SCRIPTS=cue,cueL,cueR EXTRA='&cueLater=on&plantFloor=6' OUT=<s>/runs/o-s<seed>-A.jsonl ...
    # the catch start, on 3.5v's sideways-falls.ts unchanged
    env MODE=catch RUN=<0-9> SCRIPT=<cue|cueC> EXTRA='&cueLater=on&plantFloor=6' OUT=<s>/catch/c-<script>-on-pf6-<run>.jsonl node ... <s>/sf.mjs
    # the reads (seeds 1-3 in one directory)
    python3 docs/research/new-rider/3.5/what-fails-first.py <dir> checks|classify|summary|climb|diverge
    python3 docs/research/new-rider/3.5/what-fails-first.py <dir> ticks A 2 cueL 2 0.3
    node <s>/split.mjs <s>/runs/o-s<seed>-<arm>.jsonl <script> <wave> 1.2 <t>      # what-fails-first-split.ts, bundled
    python3 docs/research/new-rider/3.5/what-fails-first-climbsplit.py <dir> <s>/split.mjs A B   # climbsplit.md
    python3 docs/research/new-rider/3.5/what-fails-first-catch.py <s> docs/research/new-rider/3.5/results/35v/data   # catch.md
    env TRUTH=table|game [MODES=1 MODE_TS=5|6|7] node <s>/m.mjs                   # what-fails-first-model.ts, bundled, from the repository root

**Data in the repository** (`results/35x/`, 0.3 MB):
- `checks.md`, `classify.md`, `summary.md`, `turn-twins.md`, `compress-pairs.md`, `climb.md`, `climb-ticks.md`,
  `climbsplit.md`, `diverge-AB.md`, `catch.md`, and the seeds 4–9 counterparts;
- `classification.json.gz`: every rider's first-failure record, seeds 1–3;
- `run-summaries.jsonl.gz`: every run's control, stand (weights once per file), summary and done rows, catch included;
- `model-*.jsonl`, `model-summary.md`: the delay check.

The per-frame runs (about 300 MB) stay outside the repository, in the session scratchpad under `35x/runs/` and
`35x/catch/`. Every number in this note is recomputed from them by the readers above; re-running one organic seed
takes about 10.5 minutes.
