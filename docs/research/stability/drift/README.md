# 3.6h: the drift round — stop the deep-stance turns from drifting and throwing him

*Surfer-track builder, Claude Opus 5.5, high effort, 2026-11-26. Branch `claude/drift`, from `57a83402` (the brief, on
`ef4b86c8`, 3.6g reviewed). The brief is `BRIEF.md` in this folder (sha1 `99b208ed0e66825a504a6a2eb4529bb28c1e6f31`,
checked at 19:40 UTC before anything else). The owner's words: "the board starts drifting left and right" (2026-11-25),
and "it seems like there is no improvement" (2026-11-26).*

## 0. Pre-registration (written and committed before any candidate run)

**What I had read when writing this.** The brief; 3.6b's README (`../turns/`), its switch commit `4e08941b`; 3.6c's
README §2–§4 (`../wobble/`) and `src/physics/wobbleKnobs.ts`; 3.6d's README §0.3, §1, §3, §6 (`../response/`); the
benchmark's README and `scripts/stability-ride.ts`, `scripts/stability-report.ts`; `PredictiveController.tick` and
`blend`. I have run no candidate in the game. The only runs before this commit are §0.2's checks of the controller on its
own linear model (vitest, no game process) and the type check.

### 0.1 The switches (built before this commit; `src` frozen from here unless an amendment says otherwise)

Three `devParam` switches, the 3.6b pattern: `PhysicalMode.ts` `driftSwitches` → `SurfZoneConfig` → `SurfZoneRunner` /
`RideSession` → `AttachedRiderOptions` → `PredictiveController`'s new fourth argument, `CommandTuning`. Pinned off online
(`main.ts`'s overrides list: `pushAnkle: undefined, pushTwist: undefined, wobbleNotch: undefined`), off by default, the new
rider only. `scripts/stability-ride.ts`'s `RIDER_KEYS` and this round's probe carry them to the Canyon rides. With none
asked, `AttachedRider` builds the controller with three arguments exactly as before and `tick` runs its shipped loop, so
the switch-off build is the shipped one; §0.7 checks it byte for byte.

**What they change** (the command path only: `tick`'s command `u = ref.u − bias − K (x̂ − x_ref)`):
- Both act in proportion to the **design depth** (the `depth` the controller is scheduled at, the leg's), with
  w = min(1, depth / 0.30 m): nothing at depth 0 (tall; the carve's own knee flex of about 0.07 m gives w ≈ 0.23), in
  full in Compress (0.30 m), Snap (0.30 m) and Crouch (the tuck, 0.45 m on his address), and following the leg as it rises
  after R2 is let go. Why depth-weighted: 3.6d's board answers the ankle 2.75 / 2.05 times the model in roll in Compress
  / the tuck but 0.81 times tall, and the tall turns fall for balance inside the steer on 1 of 36 Big rides against 12
  and 12 (3.6b §5): the deep stances are the target, and leaving tall alone keeps the tall rides' regressions out.
- **C1, the push matched to the board, implementation (a)** (`?pushAnkle=s`, `?pushTwist=s`, s ∈ {0.75, 0.5, 0.35,
  0.25}): the ankle row's and the twist row's feedback `K_q (x̂ − x_ref)` × (1 + (s − 1) w). The feed-forward (`ref.u`),
  the bias, the design, the filter, the predictor and both clamps are unchanged. *Why (a) and not (b):* (a) is the
  brief's screening route and is exactly 3.6c's `ankleGain` / `twistGain` knob in Compress and deeper; (b) needs a plant
  whose command effect matches the board's measured answer, and 3.6d–3.6g found no such plant: the board's answer varies
  along a ride by 26–65 % and no physical correction closes it (3.6e–g). *What the filter and the predictor see:* the
  command actually sent, as today (`this.commands` holds the clamped `u` after the tuning), so the estimate stays
  consistent with what the board was given; the predictor still expects the model's (weaker) board, as today. The
  internal model is unchanged; only the loop's gain on it is lowered, and §0.2 checks that the loop on the model still
  decays.
- **C2, the wobble filter** (`?wobbleNotch=Q`, Q ∈ {2, 1}): the **ankle row's** feedback through a second-order notch
  (RBJ biquad at 60 Hz, unit gain at 0 Hz) centred on 3.6c's measured swing at the design depth (`wobbleHz`: 2.31 Hz at
  0 m, 2.67 at 0.30 m, 2.90 at 0.45 m, linear between), blended in by w. The feed-forward and the bias are not filtered,
  so the steady turn's own command passes untouched; nothing is capped. *Not scheduled by speed* (a deviation from the
  brief's "each stance and speed"): I have no per-speed swing frequencies in hand; Q 2 has a −3 dB band of f0 / Q
  (2.0–3.3 Hz at Compress's 2.67) and Q 1 twice that, which covers the brief's 2.2–3.3 Hz. *Phase cost* (the filter
  alone, Compress's 2.67 Hz notch; the tuck's 2.90 in brackets): Q 2: −2.7° [−2.5°] at 0.25 Hz, −5.5° [−5.0°] at 0.5 Hz,
  −12.2° [−11.0°] at 1 Hz, gain ≥ 0.98; Q 1: −5.4° [−4.9°], −10.9° [−10.0°], −23.4° [−21.2°], gain 0.92 at 1 Hz. The turn's
  command is mostly below 1 Hz (the lean asked ramps at 1.4 rad/s for about 0.5 s).
- **C3** (`?pushAnkle=…&wobbleNotch=…`, and `pushTwist` with them if it helped alone): C1 and C2 together, the scale then
  the notch on the same feedback. Only if each helps on its own (§0.4).
- **R, the quicker rider (reference only, not a candidate):** 3.6d's `designDelay=4` with `captureDelay=4`, probe-side
  (`KNOBS=designDelay=4,captureDelay=4`), no switch.

### 0.2 The controller on its own model (run before this commit; `predictiveBalance.test.ts` "the command tuning")

The controller closed on its own linear model (`scheduledDesign`'s φ, Γ, C; a roll-rate kick; the ankle and twist
clamps of 0.25 rad and 100 N·m), 600–1200 ticks:
- **Both rows notched, the loop does not decay in Compress:** at 0.30 m and 6, 7, 9 m/s, from a kick of 0.2 on the
  state's second entry, the state's norm is still 0.007–0.11 after 10 s and 0.002–0.7 after 20 s with Q 2 (the shipped
  loop: 10⁻⁵ to 10⁻¹⁵), and grows to the clamps with Q 1. The twist row's notch alone is marginal
  at 0.30 m, 5.5 m/s. **The ankle row's notch alone decays** at every cell tried (0.1, 0.2, 0.30, 0.45 m × 4.5, 5.5,
  6, 7, 9, 11 m/s; Q 2 and Q 1), as fast as the shipped loop or faster. So C2 is the ankle row's notch. This was decided
  on the model, before any game run.
- C1 at every scale in the sweep, alone and with the notch, decays at 0.30 and 0.45 m × 5.5–11 m/s (the test asserts it).
  `ankle 0.35, twist 0.5` decays slowly at 0.45 m and 4.5 m/s (its largest over 18–20 s is 0.04 of its first second's).
  The second run's numbers (the ratio of the largest norm over 18–20 s to the first second's): `results/model-loop.txt`.
- At depth 0 every tuning gives the shipped command to 10⁻⁹ (the test asserts it).

### 0.3 The runs

- **The screening probe** (`drift-probe.ts`: 3.6c's `wobble-probe.ts` with the three keys added to `RIDER_KEYS`, nothing
  else). Canyon Big (`swell: 'big'`), organic seeds 1–3, `PERIODS=12`, his address with `&cueLater=on&plantFloor=6` plus
  the switch. Scripts: the benchmark's Big group (`hisway`, every stance's `:left` and `:right`, `twin`) plus
  `compress:straight` and `crouch:straight`. One process per seed (3 per configuration). The benchmark's own
  `stability-report.mjs --mode full --reuse --only big` measures every ride (its `measure`, its cause rule with the twin).
- **The off probe and the finalists' probe** add `hisway:left`, `hisway:right` (3.6b's "his way with a 1 s full steer"),
  `none:straight`, `snap:straight`, `release<x>:left|right` and `release<x>` for x ∈ {0, 0.2, 0.4, 0.6} (3.6c's drives;
  the "three release times" are read as 0, 0.2 and 0.4 s, with 0.6 beside). Also run for R.
- **The full report** (`npm run report:stability -- --mode full --extra '&cueLater=on&plantFloor=6&<switch>'`, 4
  processes) for each finalist, against `baseline-full.json`; and once with every switch off (§0.7).
- At most 8 game processes at once, counted machine-wide before each start.

### 0.4 The screening rule (on the probe's Big rides, against the switch-off rides of the same ids)

The **deep turns** are the 72 Big rides `crouch:left|right`, `compress:left|right` (seeds 1–3); 39 of them fall for
balance in `baseline-full.json`.
- **Still falling:** of those 39, how many fall with cause `balance`. Target ≤ 19 (half of 39, the pass line's ratio).
- **Turns:** the paired mean of `course05` and of `course10` (on − off), over the deep turns that have the value both
  ways; both ≥ 0.
- **Regressions:** the benchmark's rule (lasted now falls or no stand; a balance fall ≥ 0.25 s sooner; lowest reserve
  more than 0.10 lower) on all 162 Big benchmark rides, against `baseline-full.json`.
- **The swing** (reported, deciding nothing): on `compress:straight`, `crouch:straight` and `hisway`, the std of the
  board's yaw rate (`yaw`, world, deg/s) about its centred 15-frame (0.25 s) running mean over tS 0.5–3.0 s, on rides
  standing through +3.0 s with the switch on and off; the paired median ratio on / off, and rides down / up.
- **A configuration "helps"** if its still-falling count is below 39 and both turn means are ≥ 0.
- **Finalists:** the configurations that meet all three (still falling ≤ 19, both turn means ≥ 0, Big regressions ≤ 3);
  ranked by regressions, then still falling; at most two get the full report. If none meets them, the one with the
  fewest still falling among those whose turn means are ≥ 0 gets the full report, so that the round reports one pass-line
  table from the full report; it is labelled "closest, not a finalist".

**The sweep, in order** (adaptive by this rule only):
1. Stage 1: `pushAnkle=0.5`, `pushAnkle=0.35`, `pushTwist=0.5`, `wobbleNotch=2`, `wobbleNotch=1`; the off probe; R.
2. Stage 2: for each command, one step on: if 0.35 has fewer still falling than 0.5 (ties: fewer regressions), 0.25;
   otherwise 0.75. The same for `pushTwist` (0.35 if 0.5 helped, else 0.75).
3. Stage 3: the best ankle scale with the best twist scale, if each helps alone; C3, the best C1 with the better notch,
   if each helps alone.

### 0.5 The pass line (the full report, his address plus the switch; all three)

1. **No regression** by the standing rule: the report's regression list is empty. Each regression is listed and
   explained from its frames. A candidate that meets lines 2 and 3 with regressions is reported as failing line 1.
2. **Of the 47 Compress and Crouch steer rides that fall for balance in `baseline-full.json`** (`tw-catch` 4, `tw-ride`
   4, `big` 39; ids matched), **at most 23 still fall for balance.** A ride with no stand counts as still falling. New
   balance falls among the other 33 Compress and Crouch steer rides are listed beside it.
3. **Turns no slower:** over the 80 Compress and Crouch steer rides, paired by id, the mean of `course05` (on − off) ≥ 0
   and the mean of `course10` (on − off) ≥ 0, each over the rides that have the value with the switch on **and** off
   (rides that fall before the time have it null). Reported beside: the median, the rides up / down, the rides that reach
   the time only on or only off, `yawPeak` the same way, and the `…World` values.
- **Reported beside, deciding nothing:** the swing on the straight deep rides (§0.4), and the turn just after letting go
  of R2 (§0.6).

### 0.6 The turn just after letting go of R2

On Big seeds 1–3, `release0`, `release0.2`, `release0.4` (`:left` and `:right`; 36 rides each) and `release0.6` beside:
balance falls before +2.0 s and over the ride (the benchmark's cause rule), the paired fall time against the off probe,
and `course05` / `course10`, for the off probe, each finalist and R.

### 0.7 Controls

- **Switch off, byte for byte:** the quick report identical to `baseline-quick.json` (26 of 26 ride lines) and the full
  report's 227 ride lines identical to `baseline-full.json`, on this branch's final `src` and scripts with no switch; the
  Canyon byte check identical (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`); `npx tsc -b` clean; the gain lock
  `npx vitest run src/physics/stabilityGains` 5 of 5, untouched.
- **The probe off:** its 162 benchmark ride lines (re-measured by the report) identical to `baseline-full.json`'s Big
  lines.
- **The switches' own tests:** `predictiveBalance.test.ts` "the command tuning (step 3.6h)" and `PhysicalMode.test.ts`
  "scales and notches the balance's feedback …".
- **Every switch printed back:** each ride's `built` row shows the switch as asked (the report refuses it otherwise).

### 0.8 Predictions (before any game run)

1. `pushAnkle=0.5` shrinks the straight deep swing to 0.5–0.7 of off (3.6c: ×0.7 gave 0.70 in Compress) and lowers the
   deep turns' still-falling count from 39 to 22–30. Its turn at +1.0 s is slower (less feedback toward the reference),
   so I expect it to fail the turn line or pass it narrowly. `0.35` shrinks the swing more and slows the turn more.
2. `pushTwist=0.5` changes the swing's size little (3.6c: the twist row moves the frequency, not the size) and the falls
   by fewer than 5 of 39.
3. The ankle notch shrinks the swing less than `pushAnkle=0.5` and leaves the turn within ±1° at +0.5 s; Q 1 more of
   both. Falls: 39 → 28–35.
4. R shrinks the swing most (3.6d: 0.30 of itself in Compress) and takes the deep turns' balance falls below 20.
5. No configuration reaches 0 regressions on the full report on its first try: Snap's steer rides (0.30 m, fully
   weighted) and his way's lasting rides are where I expect them. Low confidence in all of these.

### 0.9 Guards

Usage at each phase; at 90 % I ask, as the project's handoff rule says. Raw runs in the session scratchpad's `36h/`;
only the rows the tables need are archived under `runs/`. Later changes to §0 go in as dated amendments, committed before
the numbers they govern are read.

### 0.10 Amendment 1, 2026-11-26, 20:04 UTC, before any candidate's number was read

The first eight processes (the off probe and R with the wide set, `pushAnkle=0.5` seeds 1–2 with the screening set) run
at about a third of the speed I planned on: 54 of about 162 stands after 12 min for the wide set, 22 of about 66 for the
screening set (eight processes at once). At that pace stage 1's 21 processes take about 80 min. I have read no ride's
outcome, only the count of `stand` rows. So, for the screening processes not yet started (`pushAnkle=0.5` seed 3, and
every later configuration):
- **The screening set is cut to the deep turns and the straight deep rides:** `compress:left|right`,
  `crouch:left|right`, `compress:straight`, `crouch:straight` and `twin` (`run.py --set deep`). `pushAnkle=0.5` seed 3
  keeps the screening set it was queued with, so that its seeds match.
- **§0.4's "Big regressions ≤ 3" is counted over the Big benchmark rides the screening run carries** (the 72 deep turns
  for the cut set). The regressions on tall, Snap and his way are left to the finalists' full reports, which carry them
  all; a finalist whose full report regresses there fails line 1 as before.
- **The swing** is read on `compress:straight` and `crouch:straight` (his way drops out of the cut set).
- Nothing else in §0 changes. The runner is `run.py` at this commit.

### 0.11 Amendment 2, 2026-11-26, 20:46 UTC, before any number of the runs it names was read

Read so far (screening, §0.4): off, R, `pushAnkle=0.5`, `pushAnkle=0.35`, `wobbleNotch=2`, `pushTwist=0.5`. Under §0.4's
definition **neither ankle scale "helps"** (both lower the still-falling count but their `course10` mean is below 0), and
`pushTwist=0.5` and `wobbleNotch=2` do. By the stage rule `pushAnkle=0.25` is queued (0.35 had fewer still falling than
0.5) and `pushTwist=0.35` (0.5 helped). Stage 3's ankle-with-twist run is therefore not made. Stage 3's C3 is "the best C1
with the better notch": the twist scale is the only C1 that helps, and `wobbleNotch=1` is not read yet. So that the slots
are used, **`pushTwist=0.5&wobbleNotch=2` is started now, speculatively**, beside `pushTwist=0.35`. The rule's own C3
(the better of `pushTwist` 0.5 / 0.35 by still falling, then regressions; the better of the two notches likewise) is
the C3 of record: if it is another pair, it is run too, and the speculative run is reported as an extra row.

### 0.12 Amendment 3, 2026-11-26, 20:48 UTC, before any number of the run it names was read

`wobbleNotch=1` is read: it has fewer still falling than `wobbleNotch=2`, so it is the better notch. The C3 of record is
therefore `pushTwist=<0.5 or 0.35>&wobbleNotch=1`; `pushTwist=0.35` is still running. **`pushTwist=0.5&wobbleNotch=1`
is started now**; if `pushTwist=0.35` turns out the better twist scale, `pushTwist=0.35&wobbleNotch=1` is run as well and
is the C3 of record. `pushTwist=0.5&wobbleNotch=2` (amendment 2) is an extra row.

---

## 1. The order of the round (UTC, 2026-11-26)

| time | what | commit |
| --- | --- | --- |
| 19:39:48 | the brief's sha1 checked (`99b208ed…`), on `57a83402` | — |
| 19:42–19:49 | the switches built; the controller on its own model (§0.2): both rows notched fails to decay, the ankle row's notch decays; `npx tsc -b` clean; the switches' tests and the gain lock pass | — |
| 19:50:30 | **the pre-registration and the switches committed and pushed**, before any game run | `712c4cbe` |
| 19:51:12 | stage 1 started: the off probe and R (wide set), `pushAnkle=0.5` seeds 1–2 (screening set); bundle `drift-probe.mjs` sha1 `a8c91dcf…`, the report's `stability-report.mjs` `5cfc032e…`, `stability-ride.mjs` `b24804ad…` (built from `712c4cbe`'s `src`) | — |
| 20:03:55 | **amendment 1** (the cut screening set), before any outcome was read | `cb22bd04` |
| 20:08–20:15 | the rest of stage 1 queued under amendment 1 | — |
| 20:14–20:15 | the off probe done and read: its 162 benchmark ride lines identical to `baseline-full.json` (the probe's control); R read | — |
| 20:27 | `pushAnkle=0.5` read | — |
| 20:29 | `pushAnkle=0.35` read; stage 2's `pushAnkle=0.25` queued (20:29:39) | — |
| 20:31:45 | `wobbleNotch=2` read | — |
| 20:44:38 | `pushTwist=0.5` read | — |
| 20:45:41 | **amendment 2** (`pushTwist=0.35` and a speculative C3, `pushTwist=0.5&wobbleNotch=2`, started 20:44:59–20:47:26) | `af268623` |
| 20:47:33 | `wobbleNotch=1` read | — |
| 20:47:50 | **amendment 3** (the C3 of record pairs Q 1 with the better twist scale); `pushTwist=0.5&wobbleNotch=1` started 20:47:55 | `d75865f4` |
| 20:49:04 | `pushAnkle=0.25` read | — |
| 21:02:39 | `pushTwist=0.35` read: the better twist scale, so the C3 of record is `pushTwist=0.35&wobbleNotch=1`, started 21:03:05 | — |
| 21:05:00 | `pushTwist=0.5&wobbleNotch=2` (extra) read | — |
| 21:06:15 | the switch-off full report started (the control, §0.7) | — |

## 2. The screening (Canyon Big, the probe, §0.4)

*Canyon Big (`swell: 'big'`, Hs 2.4 m, Tp 14 s), organic seeds 1–3, `PERIODS=12`, his address with
`&cueLater=on&plantFloor=6` and the switch; every ride measured by the benchmark's own `measure` (`stability-report.mjs
--mode full --only big --reuse`). The deep turns: the 72 rides `crouch:left|right`, `compress:left|right` (the steer ±1
from +1.0 s for 1.0 s), 39 of them balance falls in `baseline-full.json`. Course: the board's ground track
(atan2(vx, vz)), world x–z, deg, the change from +1.0 s to +1.5 s and to +2.0 s, signed toward the steer, paired by id
against the baseline's own values, over rides with the value both ways. Peak yaw: deg/s toward the steer over +1.0 to
+3.0 s, world. The swing: the std of the yaw rate (world, deg/s) about its centred 0.25 s mean over tS 0.5–3.0 s, on the
straight rides standing through +3.0 s both ways, the paired median ratio on / off and the rides down. Regressions: the
benchmark's rule, over the Big benchmark rides the run carries (amendment 1: the 72 deep turns for the cut set; all 162
for R and `pushAnkle=0.5`, which carried every Big script). `results/screen.json` has every number; `screen.py` and
`table.py` recompute them.*

| configuration | deep turns still falling for balance (of 39) | all deep-turn balance falls (of 72) / new | course +0.5 s, mean on − off (n; up/down) | course +1.0 s, mean (n; up/down; reach only on/off) | peak yaw, mean | regressions on the carried Big rides | swing on / off, Compress straight (down of n) | the tuck straight |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| off (the probe, switch off) | 39 | 39 / 0 | +0.00° (64; 0/0) | +0.00° (32; 0/0; 0/0) | +0.00 | 0 | 1.00 (0 of 13) | 1.00 (0 of 13) |
| `pushAnkle=0.5` | 26 | 27 / 1 | +1.18° (61; 43/17) | -0.34° (31; 13/18; 14/1) | -7.56 | 6 | 0.64 (11 of 13) | 0.67 (11 of 13) |
| `pushAnkle=0.35` | 21 | 22 / 1 | +1.43° (61; 44/17) | -0.66° (31; 10/21; 21/1) | -14.55 | 2 | 0.54 (11 of 13) | 0.59 (11 of 13) |
| `pushAnkle=0.25` | 22 | 24 / 2 | +1.57° (60; 41/19) | -0.33° (30; 12/18; 23/2) | -14.47 | 4 | 0.47 (11 of 13) | 0.55 (11 of 13) |
| `pushTwist=0.5` | 32 | 32 / 0 | +1.19° (62; 40/22) | +0.21° (32; 16/16; 8/0) | -7.61 | 3 | 0.99 (7 of 13) | 0.89 (11 of 13) |
| `pushTwist=0.35` | 30 | 30 / 0 | +1.46° (62; 40/22) | +0.25° (32; 16/16; 10/0) | -8.79 | 4 | 1.04 (6 of 13) | 0.83 (9 of 13) |
| `wobbleNotch=2` | 29 | 30 / 1 | +1.21° (62; 47/15) | +0.09° (32; 21/11; 15/0) | -5.50 | 4 | 0.45 (12 of 13) | 0.65 (13 of 13) |
| `wobbleNotch=1` | 24 | 25 / 1 | +1.52° (62; 44/18) | +0.77° (32; 21/10; 18/0) | -10.77 | 3 | 0.42 (13 of 13) | 0.60 (13 of 13) |
| C3 of record, `pushTwist=0.35&wobbleNotch=1` | 30 | 31 / 1 | +2.02° (62; 40/22) | +0.22° (32; 14/18; 18/0) | -12.75 | 8 | 0.68 (11 of 13) | 0.73 (12 of 13) |
| `pushTwist=0.5&wobbleNotch=1` (amendment 3, extra) | 25 | 26 / 1 | +2.08° (62; 42/20) | +1.04° (32; 18/14; 17/0) | -20.31 | 5 | 0.55 (12 of 13) | 0.67 (12 of 13) |
| `pushTwist=0.5&wobbleNotch=2` (amendment 2, extra) | 31 | 32 / 1 | +2.00° (62; 43/19) | +1.15° (31; 20/11; 12/1) | -15.09 | 4 | 0.79 (11 of 13) | 0.75 (12 of 13) |
| **R, reference** (`designDelay=4`, `captureDelay=4`) | 19 | 19 / 0 | +0.58° (62; 31/31) | +0.12° (32; 16/16; 23/0) | -13.14 | 9 | 0.30 (12 of 13) | 0.49 (13 of 13) |

**The rule's reading (§0.4).**
- **No configuration is a finalist.** None takes the deep turns' still-falling count to 19 or below; the best candidate is
  `wobbleNotch=1` at 24 of 39. R, the reference, reaches exactly 19.
- **The ankle scales do not "help" by the rule**: they take the falls down most among the candidates (26, 21, 22 still
  falling at 0.5, 0.35, 0.25) and shrink the swing (0.47–0.64 of off in Compress), but the board has come round less at
  +1.0 s (−0.33° to −0.66° on the rides that reach it both ways, 18–21 of 31 down at 0.35). So no ankle-with-twist run
  was made (amendment 2). Note that 14–23 more rides reach +1.0 s with the ankle scaled than without, so the paired
  set is the rides that also survive with the switch off.
- **The twist scales help a little** (32 and 30 still falling) and barely touch the straight swing (0.99 and 1.04 in
  Compress): 3.6c's finding that the twist row moves the swing's frequency, not its size, holds here.
- **The notch helps and keeps the turn**: Q 1 takes the still-falling count to 24 with the course at +0.5 s +1.52° and at
  +1.0 s +0.77°, and the straight swing to 0.42 of itself in Compress (13 of 13 down) and 0.60 in the tuck (13 of 13).
  Q 2: 29, the swing 0.45 / 0.65.
- **C3 does not add up**: the C3 of record (`pushTwist=0.35&wobbleNotch=1`) has 30 still falling and 8 regressions, worse
  than the notch alone; with `pushTwist=0.5` (the extra row) 25. The twist scale undoes part of what the notch gives.
- **So by the rule the full report goes to `wobbleNotch=1`, labelled "closest, not a finalist"**: the fewest still
  falling (24) among the configurations whose turn means are ≥ 0.
- **The same rides regress under almost every configuration** (R included): `big:s2:w16:crouch:left` (a wave fall at
  +3.87 s whose lowest reserve, 0.160 in the baseline, now reaches 0–0.05 before a wave fall at +3.52 to +3.98 s, under
  every configuration but `pushTwist=0.5&wobbleNotch=2`), `big:s1:w11:crouch:left` (it lasts its 5 s in the baseline with
  a lowest reserve of 0.043, and now falls for balance at +4.58 to +4.95 s under the ankle scales, Q 1 and both C3 rows
  with Q 1, and at +2.37 / +2.43 s under the Q 2 rows), `big:s3:w3:crouch:left` (lasts with 0.236; now a whitewater
  fall at +4.90 to +4.92 s under both twist scales and Q 2). These are rides that end on the edge either way; any change to the deep stance moves them. Each is
  explained ride by ride for the full report (§3).

## 3. The full report of the closest configuration, `wobbleNotch=1` (closest, not a finalist)

*`npm run report:stability -- --mode full --jobs 4 --extra '&cueLater=on&plantFloor=6&wobbleNotch=1'` (bundles from
`712c4cbe`), 21:20:35–21:53:04 UTC, 32.5 min, exit 1; 227 rides, every process printed `wobbleNotch` 1 as asked. His
address; the test wave (`tw-catch`, `tw-ride`), Canyon B Medium and Big, organic seeds 1–3. Times s after the stand;
course world x–z, deg toward the steer; `passline.py`, `regress.py` (`results/passline-n1.json`, `results/regress-n1.json`).*

| line | result | |
| --- | --- | --- |
| 1. no regression | **13 regressions** | **fails** |
| 2. of the 47 Compress and Crouch steer rides falling for balance today, at most 23 still fall | **32 still fall** (Big 24 of 39; `tw-catch` 4 of 4; `tw-ride` 4 of 4); 1 new balance fall among the other 33 (`big:s1:w11:crouch:left`, below) | **fails** |
| 3. turns no slower (80 rides, paired, rides with the value both ways) | course +0.5 s **+1.41°** mean (median +0.92°; n 69, 49 up / 20 down; 1 reaches it only on, 2 only off); course +1.0 s **+0.81°** (median +0.46°; n 35, 23 up / 11 down; 23 reach it only on); peak yaw −10.5 deg/s (27 up / 53 down) | passes |

**Beside it.** Big's balance falls 77 → 63 (wave 54 → 54, whitewater 4 → 4); lasting rides 27 → 41 (Compress steer 5 →
14, Crouch 4 → 9; tall, Snap and his way unchanged in count); Medium and both test-wave groups unchanged in count.
60 improvements in the report's list (16 baseline falls now last their 5 s). The test wave's eight deep turns all still
fall: on the test wave the notch does not change who falls, only when.

**The 13 regressions, each from its frames** (`regress.py`: the swing is the std of the yaw rate about its centred
0.25 s mean over the steer, +1.0 s to the release or the fall, world deg/s; for the straight rides over 0.5–3.0 s):

| ride | test | baseline | `wobbleNotch=1` | what the frames show |
| --- | --- | --- | --- | --- |
| `big:s1:w5:snap:left` | sooner | balance fall +2.07 s | +1.77 s | Snap at 0.30 m gets the whole notch, but its own swing is at 1.93 Hz (3.6c), below the notch's 2.67 Hz, where the notch (Q 1) passes 0.55 of the feedback with 56° of lag: the escape comes at +1.63 s against +2.00, the swing over the steer the same (13.4 against 13.6) |
| `big:s1:w9:snap:right` | sooner | +2.95 s | +1.98 s | the same: the escape at +1.82 s against +2.55; the knees' term is the lowest at +1.82 s both ways |
| `big:s3:w9:snap:left` | sooner | +3.68 s | +2.73 s | the same; here the swing over the steer grows (33.9 against 27.8) |
| `tw-catch:snap:right` | reserve | lowest 0.192 (balance fall +2.38 s) | 0.061 (falls later, +2.50 s) | Snap again: the margin goes lower before a later fall |
| `big:s1:w9:none:left` | sooner | +2.95 s | +2.08 s | tall, but the carve's knee flex gives w ≈ 0.2 (§0.1): the knees' term is the lowest at +1.83 s both ways; the turn comes round further (+28.8° at +1.0 s against +12.7°) and the escape follows it at once (+1.83 s against +2.75) |
| `big:s3:w6:none:left` | lasted | lasts, lowest 0.038 (knees, +2.20 s) | balance fall +2.63 s | tall, the same weight; the same knees' low at +2.20 s that the baseline survived with 0.038 now reaches 0 |
| `med:s3:w6:none:right` | sooner | +4.27 s | +3.45 s | tall on Medium; the same turn (course +20.7° against +21.3° at +1.0 s), the margin goes 0.8 s sooner |
| `big:s1:w11:crouch:left` | lasted | lasts, lowest 0.043 | balance fall +4.92 s | the tuck on the edge both ways: it ends on the grip term (0.009 at +4.82 s) and falls 0.08 s before the hold ends; it turns further (+10.9° against +7.8° at +1.0 s) |
| `big:s2:w12:crouch:left` | reserve | wave fall +2.87 s, lowest 0.128 | wave fall +2.52 s, lowest 0.013 | a wave fall either way (the twin below 3.6 m/s); the margin goes to 0.013 just before it; the swing over the steer is a tenth of the baseline's (3.4 against 36.5) |
| `big:s2:w16:crouch:left` | reserve | wave fall +3.87 s, lowest 0.160 (grip) | wave fall +3.57 s, lowest 0 (grip) | a wave fall either way; the grip term reaches 0 at +3.50 s, 0.30 s before the baseline's wave fall; it regresses under every configuration screened (§2) |
| `tw-catch:compress:left` | sooner | +3.65 s | +2.90 s | turns further (+11.2° against +6.3° at +1.0 s) with less swing (22.9 against 29.6) and falls 0.75 s after the release, on the margin |
| `tw-ride:compress:straight` | sooner | +4.82 s | +2.70 s | the placed start (standing in a turn, 3.6b §1.3); the straight swing unchanged (10.8 against 10.2); the escape at +2.58 s against +4.55 s; not explained further |
| `tw-ride:hisway` | sooner | +4.82 s | +2.70 s | the same ride frame for frame (his way on `tw-ride` releases the trim on the first step, so it is Compress straight) |

**What they say.** Four are Snap's (0.30 m, the whole notch at the wrong frequency for its own 1.93 Hz mode) and three
tall rides carrying a fifth of the notch through the carve's knee flex: seven of the thirteen are outside the target
stances. Three are the tuck's rides that end on the edge either way (two of them wave falls). Two are Compress on the
test wave's placed start, and one Compress turn that turns further and falls after the release. A version weighted
only by the stance asked (Compress and Crouch), not by the leg's depth, would leave Snap and tall alone; that is a
change of the switch, not tested here.
