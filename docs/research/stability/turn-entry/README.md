# 3.6i: the turn round — stop the deep-stance turns tipping him over as he steers

*Surfer-track builder, Claude Opus 5.5, high effort, 2026-11-27. Branch `claude/turn-entry`, from `75f1d449` (the brief,
on `claude/drift` `d5c8ccf9`). The brief is `BRIEF.md` in this folder; its amendment 1 (the coordinator's checked verdicts
on Codex's `8aa48d38`, received 2026-11-27 about 01:45 UTC) is folded in there. The owner's words: "the surfer still falls
on turn ... As I steer" (2026-11-27, about 00:40 UTC).*

## 0. Pre-registration (written and committed before any game run of this round)

**What I had read when writing this.** The brief and its amendment; the consult log's last two entries (`8aa48d38`,
`b1c2dc7d`); 3.6h's README in full and its probe and runner; 3.6b's README §1, §5; 3.6d's README's response table (§3,
the stage (ii) ratios); `PredictiveController.tick`, `steadyTurn`, `scheduledDesign`'s weights path, `design`'s cost;
`humanBalance.ts`'s `CaptureState` and `capture`; `AttachedRider`'s lean asked, the predictor's call and the stance's
`crouchAsked` / `compressAsked` / `snapping`; `scripts/stability-report.ts`'s matrix and `measure`. **I have read no ride
of this round and no stage-1 quantity** (the side of any fall, the capture state at any escape). The only runs before
this commit are the controller on its own linear model (§0.4; no game process) and the type check.

### 0.1 The switches (built before this commit; `src` frozen from here unless an amendment says otherwise)

Three `devParam` switches, 3.6b's and 3.6h's pattern: `PhysicalMode.ts` `entrySwitches` → `SurfZoneConfig` →
`SurfZoneRunner` / `RideSession` → `AttachedRiderOptions` → `PredictiveController`'s new fifth argument, `EntryTuning`,
and `CommandTuning.scope`. Pinned off online (`main.ts`'s overrides: `turnAim: undefined, turnPlan: undefined,
notchScope: undefined`), off by default, the new rider only. `scripts/stability-ride.ts`'s `RIDER_KEYS` and this round's
probe carry them. **With none asked, `AttachedRider` builds the controller with the same arguments as before and calls
`tick` exactly as before** (the entry mark is not even kept), so the switch-off build is the shipped one; §0.8 checks it
byte for byte.

**The entry mark** (`AttachedRider.entryOn`, kept only when one of the switches asks): **on** on every control tick on
which Compress or Crouch is asked (`compressAsked > 0` or `crouchAsked > 0`; Snap not held); **kept** after they are let
go until no lean is asked (`|leanAsked| < 1e-6`) **and** the leg is back above `ENTRY_TALL_DEPTH` = 0.10 m
(`yawDepth`; above the tall carve's own knee flex of about 0.07 m); **off at once** while Snap is held. So a turn begun in
Compress or Crouch keeps its fix while the legs extend after R2 is let go (the `release0` drive lets go on the steer's
first frame, with the leg still 0.30 m down), a turn standing tall never gets one, and Snap never does.

**What they change** (`PredictiveController.entryReference`, the reference only; never `K`, the filter, the predictor,
the clamps or a bound; the same lean asked):
- **E1, the aim matched to the board** (`?turnAim=board`). While the mark is on and a lean is asked, the steady turn the
  reference uses is the **depth-0 design's** at the same speed and rail (its board roll, yaw rate, slip, lagged states
  and both commands together; the same 'tan' correction and face trim as `tick` applies), in place of the deep design's.
  - *How it is measured:* the board is the same hull on the same water whatever the rider's depth, and 3.6b measured the
    deep stances' course per degree of rail close to standing tall's (1.18 Compress, 0.95 Crouch against 1.26 tall, Big,
    +1.5 to +2.0 s, `hull-big.md`), while their steady turn asks less roll per degree of lean (3.6b §5 item 5: 0.88 /
    0.86 against 0.96 at 8–9.5 m/s; 0.75 / 0.70 against 0.84 at 9.5–12 m/s). The board's answer, measured, is the tall
    stance's; the tall design's steady turn is the model's own statement of that answer.
  - *Consistency with the design's model: it is not an equilibrium of the deep design's model, and I found none that
    is.* On the deep design (Compress 7.5 and 9.5 m/s, the tuck 7 m/s, rail 0, a 40° lean) the steady turn is unique for
    a lean: holding the board roll at the tall design's (2–7° higher) and solving the rest by least squares asks 117–336
    deg/s of yaw rate (the shipped solve: 33–55 deg/s), and freeing the twist as well does not help (the twist runs away
    in the tuck). So E1 takes the tall design's whole steady turn, which is a coherent steady turn of a model, and the game
    is its test. On the deep design's own model loop (§0.4) E1 **leans the body less**, not more (bank at +1.0 s 29°
    against 34° in Compress at 7.5 m/s; 14° against 37° in the tuck at 7 m/s), as a reference the model cannot hold must.
    I register that as the model's prediction, and the game's answer decides.
- **E2, a planned lean** (`?turnPlan=s`, s ∈ {0.5, 0.25, 0.15}). While the mark is on, from the first tick a lean is
  asked: the reference is a **plan run on the design's own model** — the state z (every state: the bank and its rate,
  the board's roll and its rate, the yaw rate, the slip, the twist and its rate, both lagged commands), started at the
  reference of the tick before, advanced each tick as z ← Φ z + Γ v on the same blended design, with the plan's command
  v = u_ss − K_p (z − x_ss) clamped to today's ankle and twist limits, where (x_ss, u_ss) is the steady turn of the lean
  asked now (`tick`'s, or E1's with both). The command sent is v − b̂ − K (x̂ − z): the plan's command is the
  feed-forward and the shipped feedback acts on the plan. K_p is the LQR gain of the design's own weights with the
  body bank's acceptable error (`stateScale[2]`, 0.05 rad) times s: the plan cares s⁻² as much about the bank being at
  the lean asked. The plan ends once no lean is asked and every state of it is within 10⁻⁴ of the steady reference.
  - *What it is:* the anticipatory postural adjustment of a chosen movement, as a trajectory the model can follow exactly
    (x_{k+1} = Φ x_k + Γ v_k) and the limbs can deliver (v within the clamps). On a perfect model the body follows the
    plan exactly with u = v; the feedback K, unchanged, corrects only what the board does differently from the plan.
    With K_p = K the plan is the identity (u = u_ss − K (x̂ − x_ss), algebraically), so the plan's own gain is the whole
    of the fix, and it acts on the model's plan only, never on the sensed state (this is not 3.6b's `turnGains=firm`,
    whose firmer gains acted on the sensed state, wobble included).
  - *The board's measured answer (amendment 1, C5):* 3.6d measured the board answering the ankle's rest 2.75 times in
    roll and 2.05 in yaw rate (+44°) in Compress, but τ_a → roll at 0.60 and δ → the upper body's yaw rate at 0.45, with
    phases up to about 100° off, **at the swing's frequency (2.3–2.9 Hz)**. E2 builds the plan on the design's model,
    as the brief says, and does not rescale it by those ratios: they disagree by channel in size and side, and none is
    measured at the entry's own frequencies (the lean asked ramps for 0.5 s, below 1 Hz). What the board does
    differently is left to the feedback, which is today's. §0.6 measures the planned against the achieved bank and roll
    at +0.25 and +0.5 s on the game's rides, so the mismatch is reported, not assumed.
  - *Chosen on the model, before any game run* (§0.4): s = 0.25 brings the model's body bank at +0.5 s from 12–16° to
    21–26° (lean asked 40°) in Compress at 7.5 and 9.5 m/s, the tuck at 7 m/s and tall at 7.9 m/s, with the ankle's
    command at most 0.10–0.16 rad (its clamp 0.25) and a larger first roll outward (−2.0 to −2.8° against −0.8 to
    −1.1°). s = 0.1 reaches the ankle's clamp in Compress (16 ticks), so 0.15 is the furthest value allowed. Lowering
    the effort weight instead (ρ 10 → 1) moved the bank at +0.5 s by only 2–4°.
- **E12, the two together** (`?turnAim=board&turnPlan=s`): the plan driven toward E1's steady turn — one transient
  entry reference with the bank, the board roll, their rates and the board's lateral states compatible on the model.
- **N1, the notch on the state feedback only** (`?wobbleNotch=1&notchScope=state`): the ankle row's `K x̂` through 3.6h's
  notch (Q 1, centred by depth, weighted by w = min(1, depth / 0.30 m)) and `K x_ref` sent directly: the same steady-state
  gain, the changing reference unfiltered.
- **N2, the shipped notch scoped to the stance asked** (`?wobbleNotch=1&notchScope=stance`): 3.6h's notch exactly, only
  while the entry mark is on; with the mark off the shipped loop runs (bit for bit) and the notch's history is cleared.
- **`?wobbleNotch=1`** as built (3.6h), for reference; **R**, the quicker rider (`KNOBS=designDelay=4,captureDelay=4`),
  the yardstick only.

### 0.2 Stage 1: which way the body goes over (switch off; recorded before any fix is chosen)

- **The data.** No new run is needed: 3.6h's off probe (`36h/scr/off/big_s1..3.jsonl`, the drift probe with PROBE on,
  whose 162 benchmark ride lines are identical to `baseline-full.json`'s) carries the capture state in its `w` rows on
  every standing frame of Big's `compress|crouch:left|right`, `hisway:left|right` and `release0:left|right`; the test
  wave's eight deep turns come from 3.6c's committed base archive (`wobble/runs/base.tar.gz`, as extracted by the
  coordinator's review; all eight match `baseline-full.json`'s fall times), measured by this round's
  `stability-report.mjs --reuse` into `36i/s1tw/`.
- **The reader** is `side.py` (this commit). For every balance fall (the benchmark's cause rule) in the three places, on
  the **first beyond-recovery frame** (`bey` = 1) at or after the final escape's onset (the report's `escapeAt`), or with
  none the last `w` row before the fall ("no beyond frame", counted): the side is **nose/tail** if the margin's nearest
  edge (`cT`) is the nose or the tail; otherwise **into the turn** if the capture point across (`cA`, board +x) is on the
  steer's side (steer +1 is the board's left, its +x rail), else **thrown outward**. The convention is **checked**:
  the felt vertical leans to the turn's inside, so sign(`feltAcross`) × steer at +0.3 to +0.5 s into the steer must have
  median +1; if it is −1 the two labels are swapped.
- **Recorded** on that frame and at +0.25 / +0.5 s into the steer, signed toward the turn's inside: the lean asked
  (`ask`), the body's bank (`bank`), the board's roll and rail (`roll`, `rail`; the rider's angles, deg), the yaw rate
  (`yaw`, world, deg/s), the course from the onset (`crs`, world x–z, deg), the body's sideways speed relative to the
  feet across the felt vertical (`cSA`, m/s, the force frame of the feet: the board frame along the felt vertical), the
  capture point and the centre of mass across (`cA`, `cPA`, m), the sideways headroom ((half-width + reach) − |`cA`|,
  m), and the delivered ankle and twist commands (`aRaw`, rad, `tw`, N·m, the rider's sign). Medians per side, and per
  drive, stance and during / after the steer.
- **During the steer** is a fall at or after the steer's onset (the first frame with `st` ≠ 0, +1.00 s) and before
  onset + 1.0 s; after it, later.
- **One named paired fall and one survivor**, step by step at 0.05 s from the onset to the fall: the fall is the bench
  ride falling during the steer whose fall time is nearest the median of those falls (Big first, the lower seed and
  wave on a tie); the survivor is the ride of the same stance and steer on the same seed that stands through the steer,
  nearest in stand speed.
- **The rule:** the side with more of the **bench** falls during the steer sets the order (into the turn: E1 first;
  thrown outward: E2 first). A tie goes to the pooled count of the three places. If more than half of the bench falls
  during the steer go over the nose or tail, I report it and stop: no fix is screened. Both E1 and E2 are screened in
  any case; the order sets which is screened first and which leads E12 and the combination (§0.5).

### 0.3 The runs

- **The probe** `entry-probe.ts`: 3.6h's drift probe with the three switches added to `RIDER_KEYS` and five read-only
  fields on the `o` row (the mark, whether the plan runs, the reference's roll and bank rates, the command sent).
  Bundled into `36i/bin/entry-probe.mjs`; this round's report into `36i/bin/stability-report.mjs`.
- **The screening set** per configuration: **Canyon Big** (`swell: 'big'`), organic seeds 1–3, `PERIODS=12`, his
  address with `&cueLater=on&plantFloor=6` plus the switch, scripts `compress:left|right`, `crouch:left|right`,
  `hisway:left|right`, `release0:left|right`, `compress:straight`, `crouch:straight`, `twin` (one process per seed);
  and **the test wave's eight deep turns** (`tw-catch` and `tw-ride` × `compress|crouch` × `left|right`, one process
  each, `MODE=tw`), with the switch-off `tw-catch:twin` copied in for the cause labels (the twin never stands; no switch
  reaches it). Measured by `stability-report.mjs --mode full --reuse --only big` and `--only tw-` (the benchmark's own
  `measure` and cause rule).
- **Switch off and the references** are not re-run: switch off is 3.6h's off probe (Big, wide set) and 3.6h's
  switch-off full report (`36h/full/off`, the test wave); `?wobbleNotch=1` is 3.6h's `n1w` probe and `full/n1`; R is
  3.6h's `R` probe and `full/R`. All three were made with 3.6h's bundles from `712c4cbe`, whose `src` the switch-off build
  here reproduces byte for byte (§0.8 checks it again on this branch).
- **The full report** (`stability-report.mjs --mode full --jobs 4 --ride-bundle entry-probe.mjs --extra
  '&cueLater=on&plantFloor=6&<switch>'`) for each finalist (at most two), and once with no switch (§0.8).
- **His other drives for finalists** (deciding nothing): `release0.2|0.4|0.6:left|right` on Big seeds 1–3; and three
  untouched controls on Big seeds 1–3 that need no new drive: the release with no steer (`release0`, recovery after the
  let-go), the tall turns and the Snap turns (no contribution expected, so their rides should be identical to off).
  A continued turn and a reversal need new drives; they are not run unless time allows, and §6 says so if not.
- At most 8 game processes at once, counted machine-wide before each start.

### 0.4 The controller on its own model (run before this commit; `predictiveBalance.test.ts` "the entry tuning … (step 3.6i)")

The controller closed on its own linear model (`scheduledDesign` with his weights, `riderBody: 'two'`, `plantFloor: 6`),
the lean asked ramping at 1.4 rad/s to 40° from tick 0 and back from +1.0 s, the ankle clamp 0.25 rad, the twist 100 N·m;
the body bank, board roll and yaw rate at +0.25 / +0.5 / +1.0 / +1.5 s, toward the lean (`36i/tools/e2model.ts`):

| design | off | E1 | E2 s = 0.25 | E12 s = 0.25 |
| --- | --- | --- | --- | --- |
| Compress 0.30 m, 7.5 m/s: bank / roll at +0.5 s, +1.0 s (deg) | 12.3 / 9.5, 33.5 / 33.4 | 10.7 / 8.4, 29.1 / 29.1 | 22.4 / 19.2, 39.0 / 39.1 | 21.1 / 18.3, 36.8 / 36.8 |
| the tuck 0.45 m, 7 m/s | 15.7 / 8.3, 37.3 / 24.4 | 6.2 / 3.3, 14.2 / 9.3 | 26.4 / 15.9, 39.6 / 25.2 | 19.9 / 12.0, 29.5 / 18.7 |
| Compress 0.30 m, 9.5 m/s | 14.7 / 7.9, 36.7 / 24.7 | 9.9 / 5.7, 24.4 / 16.3 | 25.1 / 15.4, 39.6 / 26.1 | 21.7 / 13.6, 34.1 / 22.3 |
| tall 0 m, 7.9 m/s | 11.8 / 9.2, 33.3 / 31.4 | (identical to off) | 21.4 / 18.1, 39.1 / 37.0 | 21.4 / 18.1, 39.1 / 37.0 |
| least roll over the first second (outward, deg), Compress 7.5 | −1.1 | −0.9 | −2.8 | −2.6 |
| largest ankle command (rad), Compress 7.5 / tuck 7 | 0.064 / 0.130 | 0.044 / 0.050 | 0.147 / 0.163 | 0.140 / 0.131 |

The tests assert: with the mark off, every entry tuning gives the shipped command bit for bit, and N2 does too (and with
the mark on, N2 is 3.6h's notch bit for bit); E1 at depth 0 is the shipped reference to 10⁻⁹; E2 at s = 0.25 leans the
model body at least 5° further by +0.5 s in Compress 7.5 and 9.5 m/s and the tuck at 7 m/s, never past the ankle's
clamp, and the loop settles (the state's norm at 10 s under 5 % of its first two seconds' largest) with the plan ended;
N1 differs from the shipped notch while the reference moves and its loop settles; the plan is forgotten on a reset.

### 0.5 The screening rule and the order

On each configuration's screening set, paired by id with switch off:
- **Line 2's three counts**, over the whole ride (the benchmark's cause rule): the bench's 80 deep steer rides (Big 72 +
  test wave 8) falling for balance (today 47; the line ≤ 23); `hisway:left|right` (today 19; ≤ 9 of 36); `release0:left|right`
  (today 22; ≤ 11 of 36), each with its during / after split and new falls among the rides that stood.
- **Line 3:** the paired means of `course05` and `course10` over the 80 (rides with the value both ways), both ≥ 0.
- **Regressions** by the benchmark's rule against `baseline-full.json`, over the benchmark rides the screening set
  carries (the 80); ≤ 3 for a finalist here (line 1 proper is the full report's).
- **Reported beside:** the straight swing (3.6h's measure on `compress:straight`, `crouch:straight`), peak yaw, the
  largest outward roll and course excursion over the steer's first 0.5 s, the least sideways headroom inside the steer,
  the planned against the achieved bank and roll at +0.25 / +0.5 s (E2, E12).
- **"Helps"**: the sum of the three counts below switch off's (88) and both turn means ≥ 0.
- **A finalist** meets all three counts' lines, both turn means ≥ 0 and ≤ 3 regressions; at most two (fewest
  regressions, then fewest of the sum) get the full report. If none, the configuration with the smallest sum among those
  whose turn means are ≥ 0 gets the full report, labelled "closest, not a finalist", if usage allows (below 60 % of the
  5-hour window when it would start); otherwise the round stops with the screening table.

**The order** (adaptive by this rule only):
1. **Stage 2a:** the fix stage 1 puts first (E1 or E2 at s = 0.25), then the other; then E12 (`turnAim=board&turnPlan=0.25`).
2. **Stage 2b, E2's one step:** if E2 at 0.25 helps and is not a finalist, s = 0.15; if it does not help, s = 0.5. E12
   follows E2's better s if that is not 0.25.
3. **Stage 3:** N1 and N2, each alone.
4. **Stage 3b, the combination:** the best entry fix (the fewest of the sum among E1, E2 and E12 variants with both turn
   means ≥ 0; ties by regressions; with none, the fewest of the sum) with the best filter variant (the same rule among N1,
   N2 and `wobbleNotch=1` as built, whose numbers are 3.6h's `n1w`).
In practice the runs may be queued together to use the 8 slots; the order is the order they are **read and decided**,
and every decision's commit or note in §1 names what had been read.

### 0.6 The pass lines (the full report at his address with the switch, plus the probe drives; all three)

As the brief: (1) regressions by the standing rule, as `scripts/stability-report.ts` implements it, against
`baseline-full.json`: **at most 1**, each explained, the ones that also regress under a null nudge named as on the edge
(`nullfloor/`: `big:s2:w16:crouch:left`); (2) balance falls over the whole ride **halved in each of three places**:
the bench's 80 (47 → ≤ 23; the full report's rows), `hisway:left|right` on Big (19 → ≤ 9 of 36; the probe), `release0:left|right`
on Big (22 → ≤ 11 of 36; the probe), each with its during / after split; (3) the mean paired change of `course05` and of
`course10` over the 80 at least 0.

### 0.7 Predictions (before any game run; low confidence throughout)

1. **Stage 1:** most bench falls during the steer go **into the turn** (the inside rail): the body is leant 11–12° while
   the board, at 6–7° of rail, has not come round (3.6b §1.2 items 4 and 6), so the felt vertical stays near upright
   and the capture point runs to the inside. The sideways speed term (`cSA` / ω₀) is most of the capture point (Codex's
   0.403 m). Few or none over the nose or tail.
2. **E1** does little or harm in the game: bench falls 40–50 of 47's 80, the turn ±1°. The model says it leans less.
3. **E2 (0.25)** takes the falls during the steer down in all three places (bench 47 → 30–40) and turns faster at +0.5 s
   (+1 to +3°), with a deeper first outward roll; some falls move after the steer. It does not reach the half line alone.
4. **E12** lies between E1 and E2.
5. **N1** ≈ the notch as built on the falls (bench 30–34 still), and turns at least as fast. **N2** keeps the notch's
   line 2 (32–34) and drops its tall and Snap regressions.
6. **No configuration passes all three lines**; the combination comes closest. R stays the largest lever.

### 0.8 Controls

- **Switch off, byte for byte:** this branch's final `src` and scripts with no switch: the quick report identical to
  `baseline-quick.json` (26 of 26) and the full report's 227 ride lines identical to `baseline-full.json`; the Canyon byte
  check identical (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`); `npx tsc -b` clean; the gain lock
  `npx vitest run src/physics/stabilityGains` 5 of 5, untouched (`git diff d5c8ccf9 -- src/physics/stabilityGains.test.ts`
  empty); the switches' own tests; `git diff d5c8ccf9 --stat -- src scripts`.
- **Every switch printed back** in every process's `built` row (the report refuses otherwise).
- **The probe off** reproduces the benchmark's Big lines (3.6h's check; this probe differs from 3.6h's by read-only `o`
  fields and keys only).

### 0.9 Guards

Usage at each stage boundary and at least every 45 minutes; at 80 % of the 5-hour window, stop at a clean pushed commit
and hand back. Raw runs in the session scratchpad's `36i/`; only the rows the tables need are archived under `runs/`.
Later changes to §0 go in as dated amendments, committed before the numbers they govern are read. Decisions that are
Vicente's (scope, a bound, realism) stop the round at a clean commit.

### 0.10 Amendment 2, 2026-11-27, about 02:00 UTC, after stage 1's side counts were first read (the order only)

**What happened.** `side.py` as committed (`b92cb490`) checks the across axis by the felt vertical: sign(`feltAcross`) ×
steer at +0.3 to +0.5 s into the steer must be +1. It came out **−1** (1792 frames), so the reader swapped the labels and
printed "outward 26, into 3 → E2 first". **The check's premise is false**: 3.6b (§1.2 item 5) measured the board turning
*away* from the steer for the first 0.35–0.45 s, so at +0.3 to +0.5 s the felt vertical follows the board's wrong-way turn
and says nothing about the axis. I registered a check that cannot do its job.

**The axis, settled without a turn in it** (`side.py --convention geometric`; `tools/conv.py`): the centre of mass's own
offset across (`cOA`, board +x) has the sign of the body's bank (the rider's sign) on 6626 of 9569 frames with |bank| > 5°
(on the bench, hisway and release0 rides of the off probe), and the lean asked (`ask`, the rider's sign) × steer has median
+1 at +0.3 to +0.5 s. So the rider's + is the steer's side and board +x is the steer's side for steer +1 — as
`CaptureState.toward`'s note says ("'left' is the board's +x rail, `RideInput.steer` +1"). With the labels as first
assumed, the counts read **into the turn 26, outward 3** (bench, during the steer).

**What changes.** Stage 1's side is read with the geometric convention. **By the registered rule that puts E1 first.**
The order changes no outcome: every fix is screened in any case (§0.2), and the combination's entry fix is chosen by
its numbers, not its place (§0.5 step 4). Both readings are reported in §1. Nothing else in §0 changes. The reader's two
other edits after the first run: it tolerates `w` rows without `cPA` (3.6c's archive, the test wave) and `o` rows without
`bank` (the frame before the stand), and it adds the +0.25 / +0.5 s records §0.2 registered but the first version left out.

### 0.11 Amendment 3, 2026-11-27, 02:36 UTC, after E1 and E2 (s = 0.25) were read, before any other screening number

By §0.5 step 2, E2 at s = 0.25 does not help (§2), so **s = 0.5** is run (`e2h`). E12 at 0.25 (`e12`) was queued under
§0.5 step 1 and is read as registered. So that the slots are used, **E12 at s = 0.5 (`e12h`) is started now,
speculatively**: it is the E12 of record only if E2 at 0.5 turns out better than at 0.25 (§0.5 step 2); otherwise it is an
extra row. The second runner starts at most 7 processes machine-wide (`--cap 7`) so that the two runners together never
exceed 8.

### 0.12 Amendment 4, 2026-11-27, about 03:15 UTC, after E2 at s = 0.5 was read, before E12 at 0.5 was read

- **E2 at 0.5 is better than at 0.25** (sum 85 against 90), so by §0.5 step 2 **E12 at 0.5 (`e12h`) is the E12 of
  record**; E12 at 0.25 stays as a row.
- **The best filter** by §0.5 step 4 (the fewest of the sum among N1, N2 and `wobbleNotch=1` as built with both turn
  means ≥ 0) is **`wobbleNotch=1` as built** (61; N2 62, N1 69).
- **The combination of record** is the best entry fix by §0.5 step 4, decided once `e12h` is read, with
  `&wobbleNotch=1`. **A labelled extra, reported only and chosen by no rule:** the same entry fix with N2
  (`&wobbleNotch=1&notchScope=stance`), because N2 is one fall behind the notch on the sum with half its regressions (the
  coordinator's suggestion, 2026-11-27 about 03:12 UTC).
- The full report goes to the configuration §0.5 names after the combination is read (a finalist, or the closest, not a
  finalist), with `--ride-bundle entry-probe.mjs`; then `release0.2|0.4|0.6:left|right` on Big for it. The round was
  resumed by the coordinator at about 03:11 UTC after an early hand-back at 03:07 that nobody had asked for.

### 0.13 Note, 2026-11-27, 03:18 UTC: the combination of record named (by §0.5 step 4, nothing new decided)

E12 at 0.5 read (03:17:50): sum 58, course +0.5 s +0.65°, +1.0 s −1.28°. No entry fix has both turn means ≥ 0, so by
§0.5 step 4's fallback the best entry fix is the one with the fewest of the sum: **E12 at 0.5** (58; E1 64, E12 at 0.25
73, E2 at 0.5 85, E2 at 0.25 90). **The combination of record is `c3` = `&turnAim=board&turnPlan=0.5&wobbleNotch=1`**;
the labelled extra is `c3x` = `&turnAim=board&turnPlan=0.5&wobbleNotch=1&notchScope=stance`. Both started 03:18 UTC.

### 0.14 Amendment 5, 2026-11-27, about 03:47 UTC, after the combination was read, before any full report

- **The combination `c3` is not a finalist**: bench 26 of 80 (line ≤ 23), hisway 9 of 36 (meets ≤ 9), release0 15 of 36
  (line ≤ 11), course +1.0 s −1.73° (line ≥ 0), 9 regressions. Nothing screened is a finalist.
- **By §0.5 the full report goes to the closest, not a finalist: the smallest sum among the configurations whose turn
  means are both ≥ 0.** Of this round's candidates that is **N2** (`&wobbleNotch=1&notchScope=stance`, sum 62; N1 69).
  (`wobbleNotch=1` as built, 61, is 3.6h's reference and already has its full report: 13 regressions, 32 of 47.)
- **A labelled extra, chosen by no rule: the full report of `c3`** as well, because it has the fewest falls of any
  candidate (sum 50, beside R's 47) and its line-3 failure is at +1.0 s only. Both full reports run at once (4 processes
  each, 8 in all).
- Then `release0.2|0.4|0.6:left|right` (and `release0`, `none`/`snap` turns as untouched controls) on Big seeds 1–3 for
  N2 and for `c3` (`run.py --set extra`).

### The order of the round (UTC, 2026-11-27)

| time | what | commit |
| --- | --- | --- |
| 01:40–01:55 | the brief read; the switches built; the controller on its own model (§0.4); tsc and the named tests | — |
| 01:55:38 | **the pre-registration, the switches, `side.py`, the brief's amendment 1**, before any game run | `b92cb490` |
| 01:55:52 | the switch-off full report started (§6) | — |
| 01:56 | stage 1 read (3.6h's off probe, 3.6c's test-wave archive); the felt check printed "outward" | — |
| 01:58 | the screening runner started (E1, E2 0.25, E12 0.25, N1, N2 queued in that order) | — |
| 02:00:07 | **stage 1 and amendment 2** (the axis settled geometrically: into the turn, E1 first) | `d2baba4d` |
| 02:01:13 | the screening reader, `measure.sh`, `run.py`, before any screening number | `d578145c` |
| 02:16:42 | E1 read | — |
| 02:28:33 | the switch-off full report done: 227 / 227, 26 / 26 identical | — |
| 02:34:42 | E2 (0.25) read | — |
| 02:35:23 | **amendment 3** (E2 at 0.5; E12 at 0.5 speculative) | `2ab6d23c` |
| 02:46:27 / 02:51:33 / 03:02:08 | E12 (0.25), N1, N2 read | — |
| 03:02:22–03:07:12 | the Canyon byte check: identical | — |
| 03:07:41 | an interim hand-back nobody asked for (the harness's); the round resumed at about 03:11 by the coordinator | `79a346d9` |
| 03:11:34 | E2 (0.5) read | — |
| 03:15:01 | **amendment 4** (E12 at 0.5 of record; the best filter; the combination and its N2 extra declared) | `a653e4bc` |
| 03:17:50 | E12 (0.5) read | — |
| 03:18:13 | the combination of record named (`c3`) and `c3x`; both started | `02ae5ada` |
| 03:45:57 | `c3`, `c3x` read: no finalist | — |
| 03:46:21 | **amendment 5** (the full report to N2 as the closest; `c3`'s as a labelled extra) | `0e8d8486` |
| 03:46:33–04:19:33 | the two full reports | — |
| 04:20–04:38 | the release drives and untouched controls for N2 and `c3` | — |
| this commit | the write-up | — |

## 1. Stage 1: the body goes over into the turn (switch off)

*Canyon Big seeds 1–3 (3.6h's off probe, `36h/scr/off`) and the test wave (3.6c's base archive, measured into `36i/s1tw`);
his address with `&cueLater=on&plantFloor=6`; the benchmark's cause rule; the classing frame is the first beyond-recovery
frame (`bey`) of the final escape. Across quantities signed toward the inside of the asked turn; the capture state in the
feet's frame (board x across, the felt vertical's projection); angles the rider's (deg), yaw world (deg/s), course world
x–z from the onset (deg). `side.py --convention geometric`, `results/side-off.json`.*

| place (stance) | balance falls | during the steer: into / outward / nose–tail | after: into / outward | no beyond frame |
| --- | --- | --- | --- | --- |
| bench, Compress (40 rides) | 23 | 13 / 1 / 0 | 7 / 2 | 5 (all after) |
| bench, Crouch (40 rides) | 24 | 13 / 2 / 0 | 7 / 2 | 11 (4 during) |
| **bench, both (80; today 47)** | **47** | **26 / 3 / 0** | 14 / 4 | 16 |
| hisway:left\|right, Big (36) | 19 | 11 / 1 / 0 | 6 / 1 | 4 (all after) |
| release0:left\|right, Big (36) | 22 | 14 / 1 / 0 | 7 / 0 | 10 (8 during) |
| pooled | 88 | 51 / 5 / 0 | 27 / 5 | 30 |

("No beyond frame": the ride detached with no sampled capture crossing in its final escape; it is classed on its last `w`
row before the fall, as §0.2 registered.)

(As first printed under the registered felt check, the same counts with the labels swapped: bench during "outward 26,
into 3"; §0.10.) **Nobody goes over the nose or tail.** **By the rule (§0.2, §0.10): into the turn, so E1 is screened first.**

**What the falling frames show** (the 51 pooled falls into the turn during the steer; medians):

| when | lean asked | body bank | board roll / rail | yaw rate toward the steer | course | body's sideways speed (cSA) | capture point across / headroom | ankle sent (aRaw) / twist sent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| +0.25 s | 21.4° | 6.1° | 3.7° / 2.8° | +6 deg/s | −2.5° | +0.42 m/s | +0.12 m / +0.36 m | −0.05 rad / +5 N·m |
| +0.5 s | 41.4° | 11.4° | 5.6° / 6.1° | **−32 deg/s** | −3.2° | +0.72 m/s | +0.24 m / +0.27 m | +0.15 rad / −32 N·m |
| the first beyond frame (median +0.55–0.7 s) | 45.5° | 14.1° | 4.3° / 3.7° | **−84 deg/s** | **−9.1°** | **+1.71 m/s** | +0.51 m / −0.02 m | +0.07 rad / −2 N·m |

So the body leans into the asked turn as it should (14° by the escape) while the board **does not come round**: it rolls
only 4–6°, and at the escape it is yawing 84 deg/s *away* from the steer with the course 9° away. The body's own speed
across the feet toward the inside (1.7 m/s, from 0.4 at +0.25 s) carries the capture point past the inside rail. The five
outward falls are the opposite case: the board does come round (roll 10.5°, yaw +178 deg/s, course +28°) under a body at 5°.

**The named pair** (`pair.py`; the bench falls during the steer have a median fall time of +1.75 s): the fall
`big:s3:w9:crouch:left` (stand 6.09 m/s, a balance fall at +1.75 s) and the survivor `big:s3:w3:crouch:left` (same
seed, stance and steer; stand 5.07 m/s; lasts 5 s). Step by step from the onset (`results/pair-off.txt`):
- **The fall.** The lean asked ramps at 1.4 rad/s (21° at +0.25 s, 41° at +0.5 s). The board's yaw swings with growing
  size at about 2.5 Hz: −47 (+0.20 s), +100 (+0.35), −154 (+0.50), −228 deg/s (+0.55). The commands swing with it and
  reach their limits: the twist sent −100 N·m (its clamp) at +0.45 and +0.50 s, the ankle's raw ask +0.40 and +0.62 rad
  (its range 0.25) — the balance is fighting the swing, not leaning the body. The body is at 0.5–3° of bank at
  +0.40–0.50 s; on the yaw's big swing away the body's speed across jumps to +2.66 m/s toward the inside at +0.55 s, the
  capture point to +0.63 m, the headroom to −0.08 m: beyond. The board rolls up to 25–37° only after that.
- **The survivor** asks less (its slower board caps the lean asked at 35°), and its yaw swings at most ±53 deg/s; the
  commands stay inside their limits (ankle within ±0.15 rad, twist within ±27 N·m); the body comes to 11° by +0.5 s and
  14–17° by +1.0 s with the board at 12–18°, the headroom never below 0.38 m.

**The diagnosis, in one paragraph.** On the falling deep turns the body goes over **into the turn**, in 51 of 56 falls
during the steer (bench 26 of 29) and 27 of 32 after it, never over the nose or tail. What throws it is the board
swinging away under it: the yaw's 2.5 Hz swing grows through the entry until a half-swing away from the steer (−84 deg/s
at the escape, median) drives the body across the feet toward the inside at 1.7 m/s, while the board carries 4–6° of roll
against a body at 11–14° and a lean asked of 41–46°. In the named fall the balance's commands reach their limits on the
swing before the escape.

## 2. The screening

*Canyon Big (`swell: 'big'`, Hs 2.4 m, Tp 14 s), organic seeds 1–3, `PERIODS=12`, and the test wave's eight deep turns;
his address with `&cueLater=on&plantFloor=6` and the switch; every ride measured by the benchmark's own report
(`stability-report.mjs --mode full --reuse`; the test-wave measure exits 2 because the other 18 test-wave scripts are
absent by design). Off, `notch` (`?wobbleNotch=1` as built) and R are 3.6h's runs (§0.3). Balance falls over the whole
ride (during the steer = +1.0 to +2.0 s after the stand). Course: the board's ground track, world x–z, deg toward the steer,
paired by id against off over rides having the value both ways. Peak yaw: deg/s toward the steer, world, mean on − off.
Regressions: the benchmark's rule against `baseline-full.json` over the 80 bench rides, per ride. The swing: 3.6h's
measure on the straight deep rides, paired median ratio on / off. `screen.py`; `results/screen.md`, `results/screen.json`.*

| configuration | bench balance falls of 80 (during / after / before; still of 47; new) | hisway of 36 (during / after) | release0 of 36 (during / after) | sum (off 88) | course +0.5 s mean (n; up/down) | course +1.0 s mean (n; up/down; only on/off) | peak yaw | regressions (bench rides carried) | swing Compress / tuck (down of n) | helps / finalist |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| off | 47 (29 / 18 / 0; 47; 0) | 19 (12 / 7) | 22 (15 / 7) | 88 | +0.00° (71; 0/0) | +0.00° (35; 0/0; 0/0) | +0.0 | 0 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| e1 | 33 (13 / 20 / 0; 33; 0) | 15 (6 / 9) | 16 (13 / 3) | 64 | +0.94° (71; 47/17) | -2.76° (35; 7/28; 15/0) | +5.1 | 2 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| e2 | 49 (33 / 16 / 0; 44; 5) | 19 (13 / 6) | 22 (20 / 2) | 90 | -0.70° (70; 26/37) | +5.36° (23; 21/2; 6/12) | +10.8 | 23 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| e2h | 46 (24 / 22 / 0; 44; 2) | 18 (10 / 8) | 21 (19 / 2) | 85 | -0.18° (70; 28/35) | +3.96° (32; 24/8; 8/3) | +4.3 | 12 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| e12 | 39 (18 / 21 / 0; 36; 3) | 15 (6 / 9) | 19 (16 / 3) | 73 | -0.01° (71; 36/29) | +4.83° (31; 24/7; 11/4) | +11.3 | 11 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| e12h | 31 (14 / 17 / 0; 30; 1) | 11 (6 / 5) | 16 (15 / 1) | 58 | +0.65° (70; 48/16) | -1.28° (35; 12/23; 15/0) | +1.6 | 4 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| n1 | 38 (11 / 27 / 0; 37; 1) | 11 (8 / 3) | 20 (12 / 8) | 69 | +1.69° (69; 51/18) | +1.91° (35; 21/14; 18/0) | -9.6 | 5 (80) | +0.42 (13 of 13) / +0.60 (13 of 13) | yes / no |
| n2 | 33 (6 / 27 / 0; 33; 0) | 11 (5 / 6) | 18 (11 / 7) | 62 | +1.37° (71; 52/19) | +0.94° (35; 25/10; 23/0) | -7.6 | 2 (80) | +0.42 (13 of 13) / +0.60 (13 of 13) | yes / no |
| c3 | 26 (1 / 25 / 0; 22; 4) | 9 (0 / 9) | 15 (11 / 4) | 50 | +1.71° (69; 50/19) | -1.73° (35; 16/19; 28/0) | +4.5 | 9 (80) | +0.42 (13 of 13) / +0.60 (13 of 13) | no / no |
| c3x | 26 (1 / 25 / 0; 22; 4) | 9 (0 / 9) | 15 (11 / 4) | 50 | +1.67° (71; 52/19) | -1.77° (35; 16/19; 28/0) | +4.7 | 8 (80) | +0.42 (13 of 13) / +0.60 (13 of 13) | no / no |
| notch | 33 (6 / 27 / 0; 32; 1) | 10 (5 / 5) | 18 (11 / 7) | 61 | +1.41° (69; 49/20) | +0.81° (35; 23/11; 23/0) | -10.5 | 4 (80) | +0.42 (13 of 13) / +0.60 (13 of 13) | yes / no |
| R | 25 (3 / 22 / 0; 25; 0) | 6 (0 / 6) | 16 (2 / 14) | 47 | +0.11° (69; 34/35) | +0.82° (35; 19/16; 26/0) | -16.5 | 4 (80) | +0.30 (12 of 13) / +0.49 (13 of 13) | yes / no |
e1 regressions: big:s2:w16:crouch:left (reserve 0.160->0.045); tw-catch:compress:left (sooner 3.65->3.33)
e2 regressions: big:s1:w5:compress:right (sooner 1.78->1.32); big:s1:w6:crouch:left (sooner 4.87->3.42); big:s1:w6:crouch:right (sooner 2.28->1.72); big:s1:w6:compress:left (sooner 4.77->2.32); big:s1:w11:crouch:left (lasted); big:s1:w11:crouch:right (sooner 4.68->4.27); big:s1:w11:compress:left (sooner 3.77->1.82); big:s1:w11:compress:right (lasted, reserve 0.242->0.003); big:s2:w6:crouch:left (sooner 2.15->1.68); big:s2:w6:crouch:right (lasted); big:s2:w6:compress:left (sooner 4.28->1.82); big:s2:w6:compress:right (lasted, reserve 0.265->0.157); big:s2:w12:crouch:left (reserve 0.128->0.000); big:s2:w15:crouch:left (sooner 2.02->1.57); big:s2:w15:compress:left (sooner 2.55->1.57); big:s2:w15:compress:right (lasted, reserve 0.187->0.024); big:s3:w3:crouch:left (lasted, reserve 0.236->0.000); big:s3:w3:compress:left (lasted, reserve 0.350->0.054); big:s3:w7:crouch:right (sooner 1.85->1.53); big:s3:w13:crouch:left (sooner 1.90->1.53); tw-catch:crouch:right (sooner 3.30->1.95); tw-catch:compress:left (sooner 3.65->1.98); tw-catch:compress:right (sooner 3.10->1.65)
e2h regressions: big:s1:w6:compress:left (sooner 4.77->3.32); big:s1:w6:compress:right (sooner 4.65->4.28); big:s1:w11:crouch:left (lasted); big:s1:w11:crouch:right (sooner 4.68->4.17); big:s1:w11:compress:left (sooner 3.77->2.77); big:s1:w11:compress:right (reserve 0.242->0.076); big:s2:w6:compress:left (sooner 4.28->2.98); big:s2:w6:compress:right (reserve 0.265->0.000); big:s2:w15:compress:left (sooner 2.55->1.77); big:s2:w15:compress:right (lasted, reserve 0.187->0.003); big:s3:w3:crouch:left (lasted, reserve 0.236->0.000); big:s3:w3:compress:left (lasted, reserve 0.350->0.000)
e12 regressions: big:s1:w6:crouch:left (sooner 4.87->4.58); big:s1:w6:compress:right (sooner 4.65->4.18); big:s1:w11:compress:right (lasted, reserve 0.242->0.025); big:s2:w6:crouch:right (lasted); big:s2:w12:crouch:left (reserve 0.128->0.026); big:s2:w15:compress:right (lasted, reserve 0.187->0.040); big:s2:w16:crouch:left (reserve 0.160->0.033); big:s3:w3:crouch:left (lasted, reserve 0.236->0.000); big:s3:w3:compress:left (lasted, reserve 0.350->0.000); tw-catch:compress:left (sooner 3.65->2.62); tw-catch:compress:right (sooner 3.10->1.72)
e12h regressions: big:s1:w6:crouch:left (sooner 4.87->4.53); big:s1:w6:compress:left (sooner 4.77->4.48); big:s2:w6:crouch:right (lasted); big:s2:w16:crouch:left (reserve 0.160->0.000)
n1 regressions: big:s1:w11:crouch:left (lasted); big:s1:w11:crouch:right (sooner 4.68->3.93); big:s1:w11:compress:left (sooner 3.77->2.82); big:s3:w3:crouch:left (lasted); tw-catch:compress:left (sooner 3.65->3.30)
n2 regressions: big:s2:w12:crouch:left (reserve 0.128->0.013); tw-catch:compress:left (sooner 3.65->2.95)
c3 regressions: big:s1:w6:crouch:left (sooner 4.87->4.40); big:s1:w6:compress:left (sooner 4.77->4.47); big:s1:w6:compress:right (sooner 4.65->4.35); big:s1:w11:crouch:left (lasted); big:s1:w11:compress:right (lasted, reserve 0.242->0.012); big:s2:w6:crouch:right (lasted); big:s2:w6:compress:right (lasted, reserve 0.265->0.000); big:s2:w16:crouch:left (reserve 0.160->0.034); tw-catch:compress:left (sooner 3.65->3.37)
c3x regressions: big:s1:w6:crouch:left (sooner 4.87->4.38); big:s1:w6:compress:right (sooner 4.65->4.35); big:s1:w11:crouch:left (lasted); big:s1:w11:compress:right (lasted, reserve 0.242->0.014); big:s2:w6:crouch:right (lasted); big:s2:w6:compress:right (lasted, reserve 0.265->0.000); big:s2:w16:crouch:left (reserve 0.160->0.000); tw-catch:compress:left (sooner 3.65->3.33)
notch regressions: big:s1:w11:crouch:left (lasted); big:s2:w12:crouch:left (reserve 0.128->0.013); big:s2:w16:crouch:left (reserve 0.160->0.000); tw-catch:compress:left (sooner 3.65->2.90)
R regressions: big:s2:w12:crouch:left (reserve 0.128->0.000); big:s2:w16:crouch:left (reserve 0.160->0.046); big:s3:w3:compress:left (reserve 0.350->0.131); tw-catch:compress:left (sooner 3.65->3.20)

**Read by §0.5 (every row in the order §1's table gives).**
- **No configuration is a finalist.** None meets all three falling lines (bench ≤ 23, hisway ≤ 9, release0 ≤ 11) with
  both turn means ≥ 0. Only `c3` and `c3x` meet any of them (hisway 9).
- **E1, the aim matched to the board** (`turnAim=board`): the falls during the steer 29 → 13 and the sum 88 → 64, with no
  change to the straight swing (E1 acts only while a lean is asked), but the board has come round less at +1.0 s
  (−2.76°, 28 of 35 rides down). It does not "help" by the rule.
- **E2, the planned lean**, makes things worse at both strengths: s = 0.25 sum 90 and 23 regressions, s = 0.5 sum 85 and
  12. The planned lean gets the body over sooner (bank at +0.25 s 12° against 6° off, `side.py`), every fall during the
  steer is into the turn, and the falls come sooner. The model's plan outruns what the real board carries.
- **E12**: at 0.25, sum 73, course +0.5 s −0.01°; at 0.5 (of record), **sum 58, the fewest of any entry fix**, course
  +0.5 s +0.65° but +1.0 s −1.28°. By §0.5 step 4's fallback (no entry fix has both turn means ≥ 0), E12 at 0.5 is the
  best entry fix.
- **N1** (the notch on `K x̂` only) helps: sum 69, the fastest turns of all (+1.69° / +1.91°), 5 regressions; fewer
  falls saved than the notch as built.
- **N2** (the notch only under the entry mark) helps: sum 62, turns +1.37° / +0.94°, 2 regressions on the bench; on the
  falls it is the notch as built less one ride. The best filter by the rule is the notch as built (61).
- **The combination of record, `c3` (E12 at 0.5 with the notch)**: sum **50**, beside R's 47: bench 26 (only 1 during the
  steer; 25 after), hisway 9 (0 during), release0 15. Course +0.5 s +1.71°, **+1.0 s −1.73°** (19 of 35 down). 9
  regressions on the bench. The extra `c3x` (with N2) is the same on every count (sum 50, 8 regressions).
- **Every configuration's falls during the steer still go into the turn** (`side.py` on each; e.g. `c3`: the 12 pooled
  falls during the steer are all into the turn); what the fixes change is how many and when.

## 3. The full reports

*`stability-report.mjs --mode full --jobs 4 --ride-bundle entry-probe.mjs --extra '&cueLater=on&plantFloor=6&<switch>'`,
both at once, 03:46:33–04:19:33 UTC (32.8 and 33.0 min), exit 1 (regressions); 227 rides each; every process printed its
switches as asked (none refused). His address; the test wave, Canyon B Medium and Big, seeds 1–3. The bench's rows are
identical to the screening probe's for the same switches. Hisway and release0 are the probe's (§0.6).*

| line | N2 (closest, not a finalist) | `c3` (extra; the combination) | `wobbleNotch=1` (3.6h) | R (3.6h) |
| --- | --- | --- | --- | --- |
| 1. regressions (≤ 1) | **4 rides (3 distinct; 2 bench): fails** | **18 rides (20 test lines; 9 bench): fails** | 13 | 14 |
| 2a. bench falls of 80 (≤ 23; during / after) | **33 (6 / 27): fails** | **26 (1 / 25): fails** | 33 (6 / 27) | 25 (3 / 22) |
| 2b. hisway, Big (≤ 9 of 36) | 11 (5 / 6): fails | **9 (0 / 9): meets** | 10 | 6 |
| 2c. release0, Big (≤ 11 of 36) | 18 (11 / 7): fails | 15 (11 / 4): fails | 18 | 16 |
| 3. course +0.5 / +1.0 s, mean (≥ 0) | +1.37° / +0.94°: **meets** | +1.71° / **−1.73°: fails** | +1.41° / +0.81° | +0.11° / +0.82° |

**N2's regressions, each from its frames** (`drift/regress.py` against the baseline's raw run; times after the stand):
- `big:s2:w12:crouch:left` (reserve 0.128 → 0.013): a wave fall either way (+2.87 s off, +2.52 s), the reserve's low on
  the margin just before it; the swing over the steer a tenth of off's (3.4 against 36.5 deg/s). The same regression as
  the notch's in 3.6h. Its straight twin `big:s2:w12:crouch:straight` is a wave fall at +2.30 s both ways, its lowest
  reserve 0.053 → 0.019 with N2, so the straight ride loses its reserve the same way.
- `tw-catch:compress:left` (+3.65 → +2.95 s, balance): turns further (+11.2° against +6.3° at +1.0 s) with less swing,
  and falls 0.95 s after the release, on the margin. The notch's regression in 3.6h too (+2.90 s). Its straight twin
  `tw-catch:compress:straight` does not regress.
- `tw-ride:compress:straight` and `tw-ride:hisway` (+4.82 → +2.68 s): one ride counted twice (frame for frame the same; the
  placed start is already beyond recovery at +0.317 s, before any steer, amendment 1, C7). A straight ride in Compress, so
  only N2's notch acts on it; its swing unchanged (10.8 against 10.2). Not explained further; the notch did the same in 3.6h.
- **None is the null floor's edge ride.** `big:s2:w16:crouch:left` does not regress under N2. N2 removes all seven of the
  notch's tall and Snap regressions, as built to (the mark is never on standing tall or in Snap).

**`c3`'s regressions** (`results/full-c3-regress.txt`):
- **Seven are tall or Snap, and they are the notch's own, ride for ride and to the frame** (`big:s1:w5:snap:left`,
  `big:s1:w9:none:left`, `big:s1:w9:snap:right`, `big:s3:w6:none:left`, `big:s3:w9:snap:left`, `med:s3:w6:none:right`,
  `tw-catch:snap:right`, at the same fall times as 3.6h's): the entry fix gives those rides nothing, and the notch as
  built reaches them through its depth weight. With N2's scope (`c3x`) they would not be touched; `c3x`'s full report
  was not run.
- **Seven are deep turns that now fall late, 4.25–4.67 s after the stand** (2.3–2.7 s after the steer ends):
  `big:s1:w6:crouch:left`, `big:s1:w6:compress:left`, `big:s1:w6:compress:right` (sooner by 0.30–0.47 s; their straight
  twins fall at +4.65–4.85 s both ways), `big:s1:w11:crouch:left`, `big:s1:w11:compress:right`, `big:s2:w6:crouch:right`,
  `big:s2:w6:compress:right` (lasted 5 s off, now fall; their straight twins last both ways). The notch alone lets five
  of these seven last; on all seven `c3`'s board has come round less at +1.0 s (+1.6° to +10.3° against +7.8° to +14.4°
  off) and the swing over the steer is up (13–26 against 8–13 deg/s). They are the entry fix's: a slower turn that ends in a
  late fall.
- `big:s2:w16:crouch:left` (reserve 0.160 → 0.034, a wave fall at +3.90 s either way): **the null floor's edge ride**.
- `tw-catch:compress:left` and `tw-ride:compress:straight` / `tw-ride:hisway`: as under N2.

## 4. The turn just after letting go of R2, and the untouched controls

*3.6c's drives `release<x>:left|right` (his way: Compress from +0.2 s, the trim released at 4.4 m/s; Compress let go x s
before the steer, ±1 from +1.0 s for 1.0 s), Canyon Big seeds 1–3, 36 rides each; release0 from the screening runs, 0.2–0.6
from `run.py --set extra` (04:20–04:38 UTC). Balance falls before +2.0 s and over the ride; course paired against off,
world x–z, deg toward the steer (n). `release.py`; `results/release.md`.*

| drive | off: falls < +2.0 s / over the ride (n); course +0.5 / +1.0 s mean | notch: falls < +2.0 s / over the ride (n); course +0.5 / +1.0 s mean | R: falls < +2.0 s / over the ride (n); course +0.5 / +1.0 s mean | n2: falls < +2.0 s / over the ride (n); course +0.5 / +1.0 s mean | c3: falls < +2.0 s / over the ride (n); course +0.5 / +1.0 s mean |
| --- | --- | --- | --- | --- | --- |
| release0:left\|right (the screening runs) | 15 / 22 (36); +0.00° (29) / +0.00° (11) | 11 / 18 (36); +0.57° (29) / -0.35° (11) | 2 / 16 (36); -0.91° (27) / -2.07° (11) | 11 / 18 (36); +0.57° (29) / -0.36° (11) | 11 / 15 (36); +0.88° (29) / -0.40° (10) |
| release0.2:left\|right | 6 / 18 (36); +0.00° (29) / +0.00° (20) | 4 / 15 (36); +0.81° (28) / -0.14° (19) | 0 / 12 (36); -0.28° (28) / -2.34° (19) | 4 / 15 (36); +0.80° (28) / -0.18° (19) | 5 / 14 (36); +0.86° (27) / +1.77° (16) |
| release0.4:left\|right | 3 / 15 (36); +0.00° (32) / +0.00° (23) | 1 / 14 (36); +0.30° (32) / +0.37° (23) | 0 / 12 (36); -0.65° (32) / -2.43° (23) | 1 / 14 (36); +0.23° (32) / +0.04° (23) | 1 / 14 (36); +0.30° (32) / +0.37° (23) |
| release0.6:left\|right | 3 / 18 (36); +0.00° (32) / +0.00° (23) | 2 / 18 (36); +0.07° (32) / +0.65° (23) | 0 / 12 (36); -1.23° (32) / -2.45° (23) | 3 / 18 (36); +0.00° (32) / -0.01° (23) | 2 / 18 (36); +0.07° (32) / +0.65° (23) |

release0: notch: 2 of 18 identical to off, 1 balance falls (off 2); R: 1 of 18 identical to off, 1 balance falls (off 2); n2: 2 of 18 identical to off, 1 balance falls (off 2); c3: 2 of 18 identical to off, 1 balance falls (off 2)
none:left/none:right: notch: 2 of 36 identical to off, 15 balance falls (off 15); R: 0 of 36 identical to off, 13 balance falls (off 15); n2: 36 of 36 identical to off, 15 balance falls (off 15); c3: 2 of 36 identical to off, 15 balance falls (off 15)
snap:left/snap:right: notch: 0 of 36 identical to off, 22 balance falls (off 22); R: 0 of 36 identical to off, 22 balance falls (off 22); n2: 36 of 36 identical to off, 22 balance falls (off 22); c3: 0 of 36 identical to off, 22 balance falls (off 22)

- **N2 follows the leg:** at x = 0 it acts through the turn (the mark kept while the leg rises), at 0.2 s still partly,
  and by 0.4–0.6 s the leg is back above 0.10 m before the steer, so N2's turn is the shipped one (0.6 s: courses within
  0.01° of off).
- **`c3` at x = 0** takes the falls over the ride 22 → 15, the fewest of any configuration, R included (16), but its falls
  before +2.0 s stay at the notch's 11 (R: 2). At x = 0.4 and 0.6 its numbers are the notch's
  exactly: the entry mark has cleared before the steer, so only the notch (as built) acts, as registered.
- **The untouched controls.** N2's tall turns (`none:left|right`) and Snap turns (`snap:left|right`) are **36 of 36 and 36
  of 36 identical to off** in every field: turning tall or in Snap gets no contribution, as built. `c3`'s are not (2 and 0
  of 36), because the notch as built reaches them by its depth weight (§3). The release with no steer (`release0`) rides
  Compress until the let-go, so every filter changes it (2 of 18 identical); its balance falls are 1 against off's 2 for
  every configuration. A continued turn and a reversal were not run (they need new drives).

## 5. For Vicente

**Nothing passes, so nothing is proposed for your ride.** What I found and tried, on the Big swell's Compress and Crouch
turns, your way:

- **Which way you go over.** When the deep turns throw you as you steer, the body goes over **into the turn**, never
  out of it and never over the nose or tail (51 of 56 such falls). The body leans in as it should, but the board does
  not come round under it: it swings away from the steer at about 2.5 times a second, and one big swing away carries
  the body over the inside rail.
- **Matching the board's aim** (`?turnAim=board`, asking the board for the roll it carries standing tall) halves the
  falls *as you steer* (29 → 13 of 80) but the board comes round about 3° less a second into the turn. Fails the
  "no slower" line.
- **Starting the lean at once** (`?turnPlan`, a planned lean) makes it worse: the body gets in faster than the board
  carries it and you go over sooner.
- **Both together** (`?turnAim=board&turnPlan=0.5`) saves the most of any single change (88 → 58 falls over the three
  sets), still about 1° slower at a second.
- **The wobble filter, only in Compress and Crouch** (`?wobbleNotch=1&notchScope=stance`) keeps everything the filter
  gave in 3.6h on your deep turns and no longer touches standing tall or Snap: 4 rides worse on the full benchmark instead
  of 13, the turns as fast or faster. But 33 of the 80 deep turns still fall (the line is 23).
- **Everything together** (aim, planned lean and filter) nearly empties the falls *during* the steer (1 of 80; your way 0
  of 36) and comes close to the quicker rider's count (50 against 47 over the three sets), but the falls move to after the
  steer (25), the turn is about 2° slower at a second, and 18 rides get worse.
- **The quicker rider** (67 ms, the yardstick) still has the fewest falls (47).

**What it says.** The deep turns fall because the board swings away under a body that is already leaning in. Changing the
aim or adding the filter takes falls out of the steer, but they come back after it, or the turn comes round more slowly. None of the
switches here reaches your half line without slowing the turn. **If you want to feel one anyway** (each fails at least one
line; port 5177 serves `claude/drift`, which does not have these switches, so this branch would need serving):
- the filter in Compress and Crouch only (fails lines 1 and 2; turns as fast or faster):

      http://localhost:5177/?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6&wobbleNotch=1&notchScope=stance

  What you should feel: the drift on a straight Compress line about halved, turns that come in at least as fast, most
  throws as you steer still there; standing tall and Snap exactly as today.
- everything together (fails lines 1, 2 and 3), the version that takes the throws out of the steer itself:

      http://localhost:5177/?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6&turnAim=board&turnPlan=0.5&wobbleNotch=1&notchScope=stance

  What you should feel: the body leaning in sooner and the board rarely throwing you while you hold the stick, a turn
  that comes round a little less far, and some falls a second or two after you let the stick go.

**Decisions that are yours:** whether a turn that comes round about 1–2° less at a second is acceptable if it stops the
throws as you steer (line 3 as it stands says no); whether the falls after the steer, which these changes move rather than
remove, are next; and the quicker rider, as before.

## 6. Controls

- **Switch off, the full report** (this branch's bundles from `b92cb490`, no switch, `--mode full --jobs 4`,
  01:55:52–02:28:33 UTC): exit 0, 0 regressions; **227 of 227 ride lines identical to `baseline-full.json`**; its 26
  test-wave lines **identical to `baseline-quick.json`'s 26**.
- **The Canyon byte check** (`m1-cpu-bench.ts`, prelude `?canyonWaves=true`, `--spot canyon --steps 3600`, fresh state,
  03:02:22–03:07:12 UTC): snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`, **identical** (`results/byte-check.txt`).
- `npx tsc -b` clean; the gain lock and the touched test files (`predictiveBalance`, `PhysicalMode`, `RideSession`,
  `stabilityGains`): 4 files, 195 of 195 (01:55 UTC); the gain-lock test untouched.
- **Every switch printed back**: every process of every screening run and of both full reports printed its switches as
  asked (`built` rows; the report refuses otherwise, and none was refused).
- **The touched source after the pre-registration:** none. `src` is as committed at `b92cb490`; the later commits touch
  only `docs/research/stability/turn-entry/`. `git diff d5c8ccf9 --stat -- src scripts`: 10 files, +320 / −17
  (`PhysicalMode.ts` +22 and its test +25, `main.ts`, `AttachedRider.ts` +52, `RideSession.ts` +9,
  `predictiveBalance.ts` +151 and its test +86, `SurfZoneRunner.ts`, `SurfZoneSimulation.ts` +8, `stability-ride.ts`).

## 7. The predictions (§0.7) against the result

1. Stage 1, into the turn — **held** (bench 26 of 29); the sideways speed term most of the capture point — **held**
   (at the escape `cA` 0.51 m = `cPA` 0.11 m + `cSA`/ω₀ 0.40 m, medians). Nose or tail few or none — **held** (none).
2. E1 does little or harm, 40–50 of 80 — **missed**: 33, half the falls during the steer gone; the turn ±1° — **missed**
   (−2.76° at +1.0 s).
3. E2 (0.25) takes the falls during the steer down, 30–40 of 80 — **missed** (49; worse); faster at +0.5 s — **missed**
   (−0.70°); a deeper first outward roll — not read.
4. E12 between E1 and E2 — **held** at 0.25 (73 between 64 and 90); at 0.5 it beat both (58).
5. N1 ≈ the notch on the falls, at least as fast — **held** for the speed (+1.69 / +1.91), **missed** for the falls (38
   against 33). N2 keeps the notch's line 2 and drops its tall and Snap regressions — **held** (33; 4 regressions, none
   tall or Snap).
6. Nothing passes; the combination comes closest; R stays the largest lever — **held**.

## 8. Where everything is

- **Raw runs** (not committed), the session scratchpad
  `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36i/`:
  `scr/<config>/` (the screening: `big_s1..3.jsonl`, `tw-*.jsonl`, `rides.jsonl`, `tw/rides.jsonl`), `ext/<config>/`
  (the release drives and controls), `full/off`, `full/n2`, `full/c3` (the full reports, with `report.md`), `s1tw/` (the
  stage-1 test-wave measure), `byte/`, `bin/` (the bundles: `entry-probe.mjs` sha1 `0a37781177c2…`, `stability-report.mjs`
  `5cfc032ef19c…`, `stability-ride.mjs` `bc4dfab0bed5…`, built from `b92cb490`), the logs `scr/stage2a.log`, `stage2b.log`,
  `stage3b.log`, `ext.log`.
- **Readers:** `side.py` (stage 1, every configuration), `pair.py`, `screen.py`, `release.py`, `measure.sh`, `run.py`;
  3.6h's `drift/regress.py` for the regressions' frames; `tools/` (the model checks).
- **Results:** `results/side-off.json`, `results/pair-off.txt`, `results/screen.md|json`, `results/full-lines.json`,
  `results/full-c3-regress.txt`, `results/release.md`, `results/model-loop.txt`, `results/e1-equilibrium.txt`,
  `results/byte-check.txt`.
- **The switches:** `src/game/PhysicalMode.ts` `entrySwitches`; `src/physics/predictiveBalance.ts` `EntryTuning`,
  `PredictiveController.entryReference`, `CommandTuning.scope`; `src/physics/AttachedRider.ts` (`turnAim`, `turnPlan`,
  `notchScope`, the entry mark, `ENTRY_TALL_DEPTH`); pinned off in `src/main.ts`.

