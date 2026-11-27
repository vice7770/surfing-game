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

### 0.11 Amendment 3, 2026-11-27, 02:36 UTC, after E1 and E2 (s = 0.25) were read, before any other screening number

By §0.5 step 2, E2 at s = 0.25 does not help (§2), so **s = 0.5** is run (`e2h`). E12 at 0.25 (`e12`) was queued under
§0.5 step 1 and is read as registered. So that the slots are used, **E12 at s = 0.5 (`e12h`) is started now,
speculatively**: it is the E12 of record only if E2 at 0.5 turns out better than at 0.25 (§0.5 step 2); otherwise it is an
extra row. The second runner starts at most 7 processes machine-wide (`--cap 7`) so that the two runners together never
exceed 8.

## 2. The screening (interim; handed back at 03:08 UTC before E2 at s = 0.5 and E12 at 0.5 were read)

*Canyon Big seeds 1–3, `PERIODS=12`, and the test wave's eight deep turns; his address with `&cueLater=on&plantFloor=6`
and the switch; measured by the benchmark's own report (`--reuse`); `screen.py` (`results/screen.md`, `results/screen.json`).
Off, `notch` (`?wobbleNotch=1` as built) and R are 3.6h's runs (§0.3). Course: world x–z, deg toward the steer, paired
by id against off. Regressions: the benchmark's rule against `baseline-full.json`, over the 80 bench rides, per ride.*

| configuration | bench balance falls of 80 (during / after / before; still of 47; new) | hisway of 36 (during / after) | release0 of 36 (during / after) | sum (off 88) | course +0.5 s mean (n; up/down) | course +1.0 s mean (n; up/down; only on/off) | peak yaw | regressions (bench rides carried) | swing Compress / tuck (down of n) | helps / finalist |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| off | 47 (29 / 18 / 0; 47; 0) | 19 (12 / 7) | 22 (15 / 7) | 88 | +0.00° (71; 0/0) | +0.00° (35; 0/0; 0/0) | +0.0 | 0 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| e1 | 33 (13 / 20 / 0; 33; 0) | 15 (6 / 9) | 16 (13 / 3) | 64 | +0.94° (71; 47/17) | -2.76° (35; 7/28; 15/0) | +5.1 | 2 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| e2 | 49 (33 / 16 / 0; 44; 5) | 19 (13 / 6) | 22 (20 / 2) | 90 | -0.70° (70; 26/37) | +5.36° (23; 21/2; 6/12) | +10.8 | 23 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| e12 | 39 (18 / 21 / 0; 36; 3) | 15 (6 / 9) | 19 (16 / 3) | 73 | -0.01° (71; 36/29) | +4.83° (31; 24/7; 11/4) | +11.3 | 11 (80) | +1.00 (0 of 13) / +1.00 (0 of 13) | no / no |
| n1 | 38 (11 / 27 / 0; 37; 1) | 11 (8 / 3) | 20 (12 / 8) | 69 | +1.69° (69; 51/18) | +1.91° (35; 21/14; 18/0) | -9.6 | 5 (80) | +0.42 (13 of 13) / +0.60 (13 of 13) | yes / no |
| n2 | 33 (6 / 27 / 0; 33; 0) | 11 (5 / 6) | 18 (11 / 7) | 62 | +1.37° (71; 52/19) | +0.94° (35; 25/10; 23/0) | -7.6 | 2 (80) | +0.42 (13 of 13) / +0.60 (13 of 13) | yes / no |
| notch | 33 (6 / 27 / 0; 32; 1) | 10 (5 / 5) | 18 (11 / 7) | 61 | +1.41° (69; 49/20) | +0.81° (35; 23/11; 23/0) | -10.5 | 4 (80) | +0.42 (13 of 13) / +0.60 (13 of 13) | yes / no |
| R | 25 (3 / 22 / 0; 25; 0) | 6 (0 / 6) | 16 (2 / 14) | 47 | +0.11° (69; 34/35) | +0.82° (35; 19/16; 26/0) | -16.5 | 4 (80) | +0.30 (12 of 13) / +0.49 (13 of 13) | yes / no |
e1 regressions: big:s2:w16:crouch:left (reserve 0.160->0.045); tw-catch:compress:left (sooner 3.65->3.33)
e2 regressions: big:s1:w5:compress:right (sooner 1.78->1.32); big:s1:w6:crouch:left (sooner 4.87->3.42); big:s1:w6:crouch:right (sooner 2.28->1.72); big:s1:w6:compress:left (sooner 4.77->2.32); big:s1:w11:crouch:left (lasted); big:s1:w11:crouch:right (sooner 4.68->4.27); big:s1:w11:compress:left (sooner 3.77->1.82); big:s1:w11:compress:right (lasted, reserve 0.242->0.003); big:s2:w6:crouch:left (sooner 2.15->1.68); big:s2:w6:crouch:right (lasted); big:s2:w6:compress:left (sooner 4.28->1.82); big:s2:w6:compress:right (lasted, reserve 0.265->0.157); big:s2:w12:crouch:left (reserve 0.128->0.000); big:s2:w15:crouch:left (sooner 2.02->1.57); big:s2:w15:compress:left (sooner 2.55->1.57); big:s2:w15:compress:right (lasted, reserve 0.187->0.024); big:s3:w3:crouch:left (lasted, reserve 0.236->0.000); big:s3:w3:compress:left (lasted, reserve 0.350->0.054); big:s3:w7:crouch:right (sooner 1.85->1.53); big:s3:w13:crouch:left (sooner 1.90->1.53); tw-catch:crouch:right (sooner 3.30->1.95); tw-catch:compress:left (sooner 3.65->1.98); tw-catch:compress:right (sooner 3.10->1.65)
e12 regressions: big:s1:w6:crouch:left (sooner 4.87->4.58); big:s1:w6:compress:right (sooner 4.65->4.18); big:s1:w11:compress:right (lasted, reserve 0.242->0.025); big:s2:w6:crouch:right (lasted); big:s2:w12:crouch:left (reserve 0.128->0.026); big:s2:w15:compress:right (lasted, reserve 0.187->0.040); big:s2:w16:crouch:left (reserve 0.160->0.033); big:s3:w3:crouch:left (lasted, reserve 0.236->0.000); big:s3:w3:compress:left (lasted, reserve 0.350->0.000); tw-catch:compress:left (sooner 3.65->2.62); tw-catch:compress:right (sooner 3.10->1.72)
n1 regressions: big:s1:w11:crouch:left (lasted); big:s1:w11:crouch:right (sooner 4.68->3.93); big:s1:w11:compress:left (sooner 3.77->2.82); big:s3:w3:crouch:left (lasted); tw-catch:compress:left (sooner 3.65->3.30)
n2 regressions: big:s2:w12:crouch:left (reserve 0.128->0.013); tw-catch:compress:left (sooner 3.65->2.95)
notch regressions: big:s1:w11:crouch:left (lasted); big:s2:w12:crouch:left (reserve 0.128->0.013); big:s2:w16:crouch:left (reserve 0.160->0.000); tw-catch:compress:left (sooner 3.65->2.90)
R regressions: big:s2:w12:crouch:left (reserve 0.128->0.000); big:s2:w16:crouch:left (reserve 0.160->0.046); big:s3:w3:compress:left (reserve 0.350->0.131); tw-catch:compress:left (sooner 3.65->3.20)

**Read by §0.5.** No configuration is a finalist. E1 cuts the falls (sum 64) but turns slower at +1.0 s (−2.76°, 28 of
35 down), so it does not "help". E2 at 0.25 makes things worse (sum 90, 23 regressions: the planned lean puts the body
in sooner, every fall during the steer into the turn). E12 at 0.25: sum 73, course +0.5 s −0.01°, 11 regressions. N1
helps (sum 69, turns +1.69° / +1.91°, 5 regressions). N2 helps (sum 62, turns +1.37° / +0.94°, 2 regressions) and is
the notch as built on the falls (61) with its tall/Snap reach removed by construction. Every fall during the steer in
every configuration is still into the turn (`side.py` per configuration).

**Not yet done:** E2 at 0.5 (`e2h`) and E12 at 0.5 (`e12h`, speculative) were running at hand-back; the combination
(§0.5 step 4) and any full report are not run.

## 6. Controls (done)

- **Switch off, the full report** (this branch's bundles from `b92cb490`, no switch, `--mode full --jobs 4`,
  01:55:52–02:28:33 UTC): exit 0, 0 regressions; **227 of 227 ride lines identical to `baseline-full.json`**; its 26
  test-wave lines **identical to `baseline-quick.json`'s 26**.
- **The Canyon byte check** (`m1-cpu-bench.ts`, prelude `?canyonWaves=true`, `--spot canyon --steps 3600`, fresh state,
  03:02:22–03:07:12 UTC): snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`, **identical** (`results/byte-check.txt`).
- `npx tsc -b` clean; the gain lock and the touched test files (`predictiveBalance`, `PhysicalMode`, `RideSession`,
  `stabilityGains`): 4 files, 195 of 195 (01:55 UTC); the gain-lock test untouched.

