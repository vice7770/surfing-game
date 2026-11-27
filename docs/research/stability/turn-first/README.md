# 3.6j: turn first — the feet put the board on its rail, the lean follows the turn

*Surfer-track builder, Claude Opus 5.5, high effort, 2026-11-27. Branch `claude/turn-first`, from `22ec9272` (the brief,
on `claude/turn-entry` `a1f22e33`). The brief is `BRIEF.md` in this folder. The owner's words: "I dont want a nudge in the
middle of the turning" (2026-11-27, about 11:45 UTC); "Yes, start 3.6j".*

## 0. Pre-registration (written and committed before any screening run of this round)

**What I had read when writing this.** The brief; the coordinator's page content (`surfer-page/content.md`); 3.6i's
`BRIEF.md` and `README.md` (§0, §6–§8), its probe, `run.py`, `screen.py`, `release.py`, `side.py`, `pair.py`, `measure.sh`;
the coordinator's `aim36i.py` and `stance36i.py`; `PredictiveController` (`tick`, `steadyTurn`, `blend`, `entryReference`,
`tunedCommand`), `design`, `scheduledDesign`, `DEFAULT_WEIGHTS`, `senseMatrix`, `continuousPlant`, `twistRows`;
`AttachedRider`'s `prepareBank`, `predictiveBank`, `captureStep` (the felt vector `pairFelt`), `restRange`, `setAnkle`, the
3.2q note on the lean hold (`leanHeld`), the controller's construction; `StandingBody.bankOf`; `scripts/stability-report.ts`'s
`measure`, `steerOf`, the regression rule. **I have read no ride of this round.** The only game processes before this commit
are two smoke runs of the probe on one test-wave ride each (`tw-catch compress:left`, `turnFirst=on` and `=aim`), run to
check that the build executes and prints its switch: both exited 0 and printed `turnFirst` as asked; I saw their `o`-row
counts (66 and 79 frames) and nothing else. Everything else below is the controller on its own linear model (no game
process), the type check and the named unit tests.

### 0.1 The switch (built before this commit; `src` frozen from here unless an amendment says otherwise)

`?turnFirst=aim|on`, 3.6i's pattern: `PhysicalMode.ts` `turnFirstSwitch` → `SurfZoneConfig.turnFirst` → `SurfZoneRunner` →
`RideSessionOptions.turnFirst` → `AttachedRiderOptions.turnFirst` → `PredictiveController`'s new sixth constructor argument
(`TurnFirst`) and `tick`'s new twelfth (`TurnFirstInput`). Only `aim` and `on`; anything else off. Off by default, the new
rider only (the predictive balance), pinned off online (`main.ts`'s overrides: `turnFirst: undefined`).
`scripts/stability-ride.ts`'s `RIDER_KEYS` and this round's probe carry it. **With the switch unset, `AttachedRider` builds
the controller with the same arguments as before and calls `tick` exactly as before; inside `tick`, `free` is false and
the bank and rail are the caller's own, so every expression is the shipped one** (§0.8 checks it byte for byte).

**Where it acts.** Standing tall, in Compress and in Crouch: on every control tick on which Snap is not held
(`snapping <= 0`). While Snap is held the controller runs the shipped design and the shipped steady turn for the shipped
lean asked (`leanAsked` keeps being computed as it ships under both arms, so Snap's lean is continuous), and only the felt
lean keeps riding the senses' line.

### 0.2 The design as built

Signs: the model's (x forward, y right) inside the controller; the rider's (bank, roll + toward the board's +x, which is
the steer's side for steer +1) in `AttachedRider`. Every angle passed across is negated, as the shipped call already does.

**(1) The designs: the turn left free** (`DesignWeights.turnFree`, both arms). `design` sets `q[4][4] = q[5][5] = 0` (the
board's yaw rate r and slip β) after the shipped diagonal; every other weight as given (his `riderBody: 'two'`,
`plantFloor: 6`; `feetReach`'s bank ranking; no capture cost on his address). The design then also returns its continuous
plant (`a`, `b`), which the controller blends in a slot of its own (`blend(…, 'free')`) with the same eight weights as
every other matrix. Φ, Γ, L, the prediction matrices are the shipped ones (the cost reaches K only): the unit test checks
Φ and L equal and K different. Through `JSON.stringify` the cache key carries the flag, so the shipped designs are untouched.

**(2) The reference: the board's yaw rate and slip free** (`PredictiveController.freeReference`, both arms). With
x̂ the prediction now:
- x_ref = [φ, 0, θ, 0, **x̂₄, x̂₅**, θ_t asked, **x̂₄**, δ, τ]: the yaw rate and slip are the prediction's own, so the
  feedback's r and β columns act on nothing, **whatever their weights**; the upper body's yaw rate is the board's (the
  twist rate nothing: the twist is held, so the upper body is asked to turn with the board, never against it); the rates
  of the roll and the bank nothing; the lags at the commands.
- **The feed-forward** (u = δ, τ at the lags' steady state): the commands that hold the lean and the board's roll **at the
  turn the board is making now** — on the continuous plant `a` (the commands enter rows 1, 3, 7 through the lags only), the
  board's roll acceleration (row 1), the body's bank acceleration (row 3) and the upper body's yaw acceleration (row 7) at
  x_ref are nothing. Rows 4 and 5 (ṙ, β̇) are not held: what the board's turn does next is the water's.
  - `aim`: θ = the lean asked; φ, δ, τ solve the three rows exactly (3 × 3). "The board's roll that goes with the lean
    asked" is the roll that holds it at the turn now, not at the picture's turn.
  - `on`: θ and φ are both set (below), one command short: row 7 is held exactly by τ, and δ is the least squares of rows
    1 and 3, each weighted by the design's own cost on its rate, 1 / stateScale[i]² (φ̇ 0.5 rad/s, θ̇ 0.25 rad/s).
  - In the 'tan' space, as `tick`'s steady turn: solved with the bank at tan(bank) and the roll scaled alike, then φ, θ, δ
    and the ankle's command brought back by f = bank / tan(bank).
  - **Checks** (unit tests): with the board turning and slipping exactly as the shipped steady turn says, `aim`'s
    reference **is** the shipped steady turn (to 10⁻⁸ at the schedule's knots; between knots the blend of the continuous
    plants and of the discrete designs differ, and so do their equilibria: up to 0.11° of roll and 1.1 × 10⁻³ rad of
    ankle command at 7.3 m/s, 0.25 m, 11.5°, `results/model-loop.txt`).
  - **The no-aim check** (unit test "no aim", both arms, on the controller's own design at Compress 7.5 m/s): a change in
    the estimate's yaw rate (with the upper body turning with the board) and in its slip leaves the r, β and twist-rate
    errors exactly as they were; the command changes by exactly the feed-forward's change plus the gains on the moved
    reference entries (the lags at the new commands, and with `aim` the new roll) — the hold of the lean and the tilt at the
    new turn — and at the new turn the held rows are nothing (to 10⁻⁹; with `on` the twist's row exactly). **There is no
    term with a target yaw rate or slip.** The brief's wording "a change in the board's yaw rate alone produces no command"
    cannot hold literally together with "holds the lean and the tilt at the turn the board is making now": holding them
    at a faster turn needs another ankle command, because the turn's own moments reach the roll and the bank (rows 1, 3).
    I built the second sentence and report the size of the first's departure (§0.3, item 3) as a finding.

**(3) `on` only: the stick's ask is the feet's tilt** (`AttachedRider.prepareBank`, the predictive branch). The tilt asked
`tiltAsked` (rider's sign, roll − bank, + with the steer) eases toward steer × `restRange()` (0.25 rad on his address,
unchanged) with the shipped lean's own easing (REFERENCE_TIME 0.05 s, at most `leanPace` = LEAN_IN_RATE 1.4 rad/s), and
with the shipped lean's planing gate (no tilt while `most` = 0, as no lean is asked then). The sign: the shipped convention
leans toward the steer (`wantOwn` = steer × RAIL_RANGE …) and the model's own steady turn at a 30° lean has the board's
roll 6.5° past the bank on the same side (Compress 7.5 m/s); so steer +1 asks the board rolled further onto the steer's
rail than the body is banked. In the model's sign the reference's φ − θ = −tiltAsked (unit test "'on'": φ − θ = the tilt
passed, to 10⁻¹²).

**(4) `on` only: the lean follows the felt vertical.** `AttachedRider.feltLean` is the lean about the heading of the felt
vector the capture point uses (`pairFelt`, the pair's specific force; on his address held on the deck's axes, rotated to
the world by the board's orientation), in `StandingBody.bankOf`'s sense (`feltLeanAbout`: atan2(x, √(y² + z²)) in the
heading's frame) — the bank at which the body's centre of mass lies along the felt vertical. Its filter: **`pairFelt`'s own
low-pass (SPECIFIC_FORCE_TIME 0.1 s) and nothing else**; the brief names that vector, and the low-pass is part of it (the
capture point reads the same one). It is read every substep in `prepareBank`, handed to the controller every control tick
(negated), and **rides the controller's senses' line**: `tick` reads the value `steps` ticks old (6 ticks, 0.1 s; the
designDelay knob's ticks when set), exactly as the filter reads the senses (unit test: a step in the felt lean reaches the
reference bank 6 ticks later, to the tick). The bank reference is that sensed felt lean plus the hand's bend
(HAND_BEND × handBend × HOLD_BANK, unshaped; the bots never use the hand), and the board's roll reference that bank plus the
tilt. The schedule's rail under `on` is min(railCap, |bank + tilt|) (railCap 12° as it ships), in place of the rail the
lean asked would hold.

**Not changed:** the estimate, the filter, the predictor, the bias, the clamps (the ankle's range and the rail's bite, the
twist's ±100 N·m or the grip), the hip's share, the motor lag, the 0.1 s sensing, the board, the water, the body, the stance
depths, Snap's rules, every default. No hidden motor: the two commands are the only ones and go through the shipped clamps.
The turn is not limited by anything new.

**Probe fields** (`first-probe.ts`, read only): `fL`, `fLs` (the felt lean true and sensed), `tA`, `tR` (the tilt asked and
reached, roll − bank), `uRaw` (the raw ankle command), `aSat` (the ankle's rest command at its range or the rail's bite),
`frOn` (the free reference acting), beside 3.6i's (`ask` the old lean asked, `uA`/`uT` the commands sent, `rRoll`, `rBank`,
`rYaw` the reference, `pYaw` the prediction).

### 0.3 The controller on its own model (run before this commit; `tools/model.ts`, `tools/ff-variants.ts`, `tools/eig.ts`)

The controller closed on its own linear model at rail 0 (the true plant the controller's own design there; `on`'s railCap
set to 0 so its schedule agrees), the lean asked ramping at 1.4 rad/s to 40° from tick 0 and back from +1.0 s (`off`,
`aim`), the tilt to 0.25 rad likewise (`on`), the felt lean on the model taken as the coordinated turn's,
atan(v r / g). Bank / roll / yaw rate at +0.25, +0.5, +1.0, +1.5 s, toward the steer (`results/model-loop.txt`):

| design | off | aim | on |
| --- | --- | --- | --- |
| Compress 0.30 m, 7.5 m/s, at +0.5 / +1.0 s | 12.3 / 9.5 / 7, 33.5 / 33.4 / 48 | 11.3 / 10.6 / 7, 31.2 / 28.1 / 45 | −22.6 / −15.4 / 66, −53.7 / −49.0 / −113 |
| the tuck 0.45 m, 7 m/s | 15.7 / 8.3 / 10, 37.3 / 24.4 / 38 | 15.5 / 8.3 / 6, 35.0 / 22.8 / 40 | −39.9 / −29.0 / −48, −41.9 / −25.9 / −43 |
| Compress 0.30 m, 9.5 m/s | 14.7 / 7.9 / 6, 36.7 / 24.7 / 32 | 8.1 / 4.9 / 1, 26.6 / 16.3 / 24 | −32.6 / −23.6 / −4, −43.7 / −28.7 / −47 |
| tall 0 m, 7.9 m/s | 11.8 / 9.2 / 4, 33.3 / 31.4 / 47 | 7.1 / 9.8 / 3, 28.0 / 18.0 / 38 | −15.5 / −9.0 / 100, −46.9 / −40.8 / −31 |
| ankle at its clamp (ticks of 600), Compress 7.5 / tuck / Compress 9.5 / tall | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 25 | 429 / 8 / 276 / 134 |
| the state 8–10 s after (settled?) | 10⁻⁵–10⁻⁷ | 10⁻⁹–4 × 10⁻² | 0.4 µ (tuck) to 3.8 (a limit cycle) |

Items:
1. **`aim` turns about as off does on the model**, a little slower standing tall and at 9.5 m/s (yaw rate at +1.0 s 38
   against 47 deg/s tall, 24 against 32 at 9.5 m/s), and settles.
2. **`on` goes the wrong way on the model.** With the tilt alone (the felt lean held at 0: `results/ff-variants.txt`,
   rows `LS 0.25 zero`) the body and the board go **outward** by 18–54° and the board yaws outward (−46 to −52 deg/s at
   +0.5 s) in all three stances; with the felt lean following, that turn feeds itself outward and the ankle sits at its
   clamp (a limit cycle in Compress 7.5 m/s and tall). The cause on the model: to hold the board past the body the ankle
   pushes the body outward (the bank row), and on this model the ankle's rest yaws the board directly (row 4's δ column,
   +90 to +136 per s² per rad at a 20° rail (`tools/explore.ts`, standing tall to the tuck), outward when the feet roll the board in), and nothing aims the turn back. Every
   feed-forward I tried behaves the same (`ff-variants.txt`: the weighted least squares as built, the roll's row alone, the
   bank's row alone, none of the turn's terms), so it is not the feed-forward's split; with zero references the loop
   settles (10⁻⁸), so it is not the free designs' stability (`eig.txt`: the state loops with the r and β columns removed are
   stable at every point checked, spectral radius 0.958–0.986). **The model is known to be wrong in exactly this channel**:
   3.6d measured the game's board answering an open ankle nudge with −0.38 rad/s per rad within 3 ticks in Compress where
   the model says +0.007. So the model's verdict on `on` is registered as a prediction, and the game decides.
3. **The feed-forward's hold reaches the board's yaw** (the departure in §0.2): per rad/s of the estimate's turn, the
   held lean adds +6 to +17 rad/s² of yaw acceleration per rad/s (against the open loop's own yaw damping −18 to −26), and
   per rad of slip −68 to −251 (against the weathercock +211 to +397), at Compress 7.5 and 9.5, the tuck 7 and tall 7.9
   m/s (`model-loop.txt`, rail 0). Its sign is **with** the turn, not against it (it lowers the yaw damping and the
   weathercock: it holds nothing back), and it is the model's ankle→yaw channel again.
4. A 3.2q note stands in the code: capping the lean at the felt vertical's lean (a loop lean → rail → turn → felt
   vertical → lean through the same 0.1 s low-pass) made Compress "barely turn" on his ride and was removed. `on` closes
   that loop by design (the owner's Q2); the round measures it.

### 0.4 The runs

- **The probe** `first-probe.ts` (3.6i's plus §0.2's fields and two drives) bundled into `36j/bin/first-probe.mjs`; this
  branch's report into `36j/bin/stability-report.mjs`.
- **Configurations:** `off` (no switch; **re-run with this probe**, so off and the arms come from the same bundle and the
  new fields exist in off; its rides are checked against 3.6h's off, §0.8), `aim` (`&turnFirst=aim`), `on`
  (`&turnFirst=on`), each at his address with `&cueLater=on&plantFloor=6`.
- **The screening set** (`run.py --set screen --tw`): Canyon Big, organic seeds 1–3, `PERIODS=12`, scripts
  `compress|crouch:left|right`, `hisway:left|right`, `release0:left|right`, `compress|crouch:straight`,
  `none:left|right`, `snap:left|right`, `twin`; and the test wave's eight deep turns (`tw-catch|tw-ride` ×
  `compress|crouch` × `left|right`), with 3.6i's switch-off `tw-catch:twin` copied in for the cause labels.
- **The extra set** (`run.py --set extra`, Big seeds 1–3, deciding nothing): `release0.2|0.4|0.6:left|right`, `release0`
  (recovery after the let-go, no steer), `none|compress|crouch:rev` (a reversal: +1 for 1 s, then −1 for 1 s) and
  `none|compress|crouch:long` (a continued turn: +1 for 2 s).
- Measured with `stability-report.mjs --mode full --reuse` (`measure.sh`), the benchmark's own `measure` and cause rule.
- At most 8 game processes at once, counted machine-wide before each start.

### 0.5 The pass lines and the readers (switch off is the control)

1. **Regressions** by the standing rule as `scripts/stability-report.ts` implements it, against `baseline-full.json`, in
   the full report: **at most 1**, each explained; tall and Snap rides count; `big:s2:w16:crouch:left` named as on the
   edge if it appears (it regresses under the null nudge, `nullfloor/`). In the screening, `screen.py` counts the
   benchmark's rule over the 80 bench rides it carries (reported, not the line).
2. **Balance falls over the whole ride, halved in each of three places** (`screen.py`, 3.6i's reader unchanged, against
   this round's `off`; the benchmark's cause rule; during = fell in [1.0, 2.0) s, after ≥ 2.0): the bench's 80 deep steer
   rides **≤ 23** (47 in the baseline); `hisway:left|right` on Big **≤ 9 of 36** (19); `release0:left|right` **≤ 11 of
   36** (22). The bench's count comes from the full report for an arm that gets one.
3. **Turns no slower** (`screen.py`): over the 80, the mean paired change of `course05` and of `course10` **≥ 0** each;
   standing tall's (`none:left|right`) beside it (`release.py`-style paired means, `line4.py`'s heading table).
4. **No nudge** (`line4.py`, written for this round before any number): per stance (standing tall `none:left|right`,
   Compress `compress:left|right`, Crouch `crouch:left|right`; Big seeds 1–3), on the rides standing at tS 2.5 in both off
   and the arm, the mean paired heading change toward the steer from tS 1.0 to tS 2.5 **≥ 0**; on the rides standing at
   tS 3.0 in both, the mean paired largest heading change toward the steer between tS 1.0 and tS 3.0 **≥ 0**. The heading
   and sign as `aim36i.py` (`hdg`, wrapped; signed by off's lean asked at tS 1.5). `hisway:left|right` beside Compress,
   with whether its frames are identical to Compress's. The line holds when all three stances hold both.

**Reported, deciding nothing:** the straight swing (`screen.py`, 3.6h's measure); the release offsets 0.2 / 0.4 / 0.6 s
(`release.py`); the peak yaw rate (`screen.py`, `quantities.py`); the felt lean against the old lean asked, the tilt asked
against reached and how often the ankle sits at its range, the least sideways headroom (`quantities.py`); which way the
remaining falls go (3.6i's `side.py --convention geometric`); the Snap turns and the untouched controls (`release.py`'s
identity counts; the reversal and the continued turn by falls and heading); Crouch's dips before the steer (the
coordinator's `crouch36i.py` pattern, if time allows).

**The full reports** (`npm run report:stability`'s two bundles from this branch, `--mode full --jobs 4 --ride-bundle
first-probe.mjs --extra '&cueLater=on&plantFloor=6&turnFirst=<arm>'`): for each arm that meets lines 2–4 in the screening;
if none does, for the closest arm that meets line 4 (the fewest bench balance falls), labelled "closest, not passing"; if
no arm meets line 4, none. Once with no switch (§0.8). The quick report with no switch after each `src` change.

**His feel ride (Q11):** a passing arm; if none, the closest arm that meets line 4, labelled failing; if none meets line 4,
nothing is served. The coordinator serves it.

### 0.6 Predictions (before any game run; low confidence)

1. **`aim`** rides close to off: bench balance falls 38–50 of 80, `hisway` 15–22, `release0` 18–25; turns within ±1° at
   +0.5 s; line 4 at risk standing tall (the model's turn is slower there). It does not pass line 2.
2. **`on`**: the model says it goes outward. In the game I expect the board's own answer to the ankle (3.6d) to turn it the
   right way at least at first, and the felt-vertical loop to make the turn either run on (deeper as it goes) or die (the
   3.2q history); the ankle at its range on much of the steer. Falls not halved; line 3 or 4 fails in at least one stance.
3. **Nothing passes all four lines.** Snap rides identical to off under both arms only where Snap is held for the whole
   ride from before the steer (the controller's estimate is shared, but the felt line and, before Snap, the tall stance
   ride the free reference, so `snap:*` rides will not be identical before Snap is first held; I expect most to differ).

### 0.7 Controls

- **Switch off, byte for byte** (this branch's final `src` and scripts, no switch): the quick report identical to
  `baseline-quick.json` (26 of 26) and the full report's 227 ride lines identical to `baseline-full.json`, its 26 test-wave
  lines identical to the quick's; the Canyon byte check (`m1-cpu-bench.ts`, prelude `?canyonWaves=true`, `--spot canyon
  --steps 3600`, fresh state) at snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`; `npx tsc -b` clean; the gain
  lock `npx vitest run src/physics/stabilityGains` 5 of 5 with its file untouched (`git diff a1f22e33 --
  src/physics/stabilityGains.test.ts` empty); the touched test files; `git diff a1f22e33 --stat -- src scripts`.
- **This probe off against 3.6h's off probe:** the Big rides the two share, identical in every field of `rides.jsonl`.
- **Every switch printed back** in every process's `built` row (the report refuses otherwise).

### 0.8 Guards

Usage at each stage boundary and at least every 45 minutes; at 80 % of the 5-hour window, stop at a clean pushed commit
and hand back. Raw runs in the session scratchpad's `36j/`; only the rows the tables need are archived under `runs/` or
`results/`. Later changes to §0 go in as dated amendments that fix a bug in this build, each committed before the numbers
it governs are read. Decisions that are Vicente's (scope, a bound, realism) stop the round at a clean commit.

### 0.9 Note, 2026-11-27, 18:15 UTC: a diagnostic, not an arm and not an amendment (`src` unchanged)

**What had been read.** The screening of both arms (`screen.py`, `line4.py`, `quantities.py`, `dips.py`) and one ride's
frames (`big:s1:w6:compress:left`, off and `aim`). `aim` already swings before any steer: on the straight and tall rides
at tS 0.3–1.0 s the prediction's yaw rate |`pYaw`| has a median of 24.0 deg/s against off's 9.0 (p90 79.0 against 32.7),
with the ankle at its range on 5.4 % of frames against none. Then two test-wave diagnostics of `aim` (8 deep turns each)
with the probe overriding the feed-forward only (`diag-probe.ts`, `FREE_FF`): with the turn and the slip at nothing in the
feed-forward's solve (`still`), every ride fell at 0.57–1.40 s; with the slip alone at nothing (`noslip`), they fell at
1.72–4.73 s against off's 1.48–3.65 s and the built `aim`'s 1.17–1.72 s.

**What runs next, deciding nothing:** `aim` with `FREE_FF=noslip` on the Big screening set, labelled a diagnostic of which
term breaks the arm (the slip is never sensed; the feed-forward multiplied its estimate by −0.8 to −2.7 rad of ankle per
rad, §0.3 item 3). It is not one of Vicente's arms, gets no full report and is not served; the two arms are judged as
built. It is read with the same readers.
