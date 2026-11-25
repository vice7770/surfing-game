# 3.5z: the take-off falls on the ride build (diagnosis)

*Surfer-track builder, Claude Opus 5.5, high effort (a diagnosis with open causes; the instruments exist), 2026-11-25.
Branch `claude/take-off-stall` from `claude/what-fails-first` `b0d19ee8` (the ride build `claude/plant-rows` `1be12ee7`
plus 3.5x's probes). Diagnosis only: no fix ships, nothing under `src/` or `scripts/` changes. The owner rode `1be12ee7`
with `&cueLater=on&plantFloor=6` (2026-11-24): "I tested the code it seem to improve with both option &plantFloor=6
improved the stability. The surfer is able to turn but still not enough balance yet." After 3.5y he chose "Take-off
falls" (2026-11-25). His standing rulings: the turn is not to be limited; the fall comes from a balance that lacks the
ability to stand (no hidden motors, no bound widened); he rides holding Compress (R2) from 0.1–0.3 s after the stand.*

## 0. Pre-registration (written and committed before the baseline's fore/aft rows were read and before any run)

### 0.1 The question

On his address `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on` with
`&cueLater=on&plantFloor=6` (arm **A**, the ride build): **why does a take-off fall within 3 s of the stand? What fails
first, at what speed, and is it within the rider's authority?** In particular:
1. why the board slows after the stand from about 4 to about 2 m/s through the water while its nose rises 20–40°;
2. why some riders go over the nose at planing speed;
3. what separates the stands that fall from those that last, at matched stand speed.

Known before this note (the coordinator's checks and 3.5x): 30 of 68 A take-offs fall within 3 s on seeds 1–9
(seeds 1–3: 5 of 13 `cue`, 4 of 13 `cueC`; seeds 4–9: 11 of 21 and 10 of 21). The fore/aft balance is
`StandingBody.prepare` (`src/physics/standingBody.ts:245–288`), which neither `plantFloor` nor `plantSpeed` reaches. The
bot never sends `trim`.

### 0.2 The probe and the drives

**Probe:** `take-off-stall.ts`, 3.5x's `what-fails-first.ts` verbatim with one drive change and one read-only
instrument (its header):

- **Trim drives on the existing input** (`RideInput.trim`, W/S or the right stick's vertical axis, −1 to +1). It sets
  the feet's pressure target along the board, `copTarget.z = trim × TRIM_PRESSURE × (front − rear) / 2`
  (`AttachedRider.balanceStep`), which reaches the pitch loop as `cop` (the reference's offset asin(cop / L) and the
  command's stretch term). The trim is sent only while standing, only when nonzero, from the first standing frame
  (`since ≥ 0`), so every other script's input is 3.5x's byte for byte.
  - `cueT`: +1 (full forward) **held to the end of the ride**.
  - `cueCT`: the same, with `cueC`'s Compress from +0.2 s (the `startsWith('cueC')` rule).
  - `cueTx`, `cueCTx`: +1 from the stand, **released (0) at `TRIM_UNTIL` = 1.2 s** after it (3.5x's turn-window end;
    the stalls above reach +28–40° by +0.7 s). These separate the take-off's gain from any later cost of holding it.
  - `cueTB`: −1 (full back) held, stick centred: the sign check.
  - None ends in `L` or `R`, so none turns.
- **`never`**, already in the probe (3.5u): pops never, keeps paddling and sprinting until the crest has passed. The
  paddle twin: does the wave carry a (prone) board at the sea times where the stand slows?
- **`z35`** (`Z35=off` drops it), per standing or landing frame:
  - the pitch reference's parts from the latest `StandingBody.prepare` call (deg, forward +): `face`, `sensed` (the
    felt push's pitch less the face, unsmoothed), `dev` (the smoothed deviation, = the row's `feltDev`), `off`
    (asin(cop / L)), `ref`, `lean` (the leg line from the vertical); and the call's `cop`, `L`, `load`, `toe`, `heel`,
    `depth`, with the hip's range there (`hipR`, deg);
  - `fs`: the feet's measured front share (`contact.frontShare`, 0 the back foot, 1 the front);
  - the along-track budget `trk`: each of `BoardBody.forces`' ten step-mean forces (buoyancy, pressure, addedMass,
    radiation, friction, bed, fins, rails, froth, suction) dotted with the horizontal unit of (v_board − flow), N, +
    pushing the board along its track through the water; `trkT` their sum. Gravity is vertical, so these are what change
    the pair's horizontal speed through the water.

**Run:** `MODE=organic`, Canyon B Medium, `PERIODS=12`, `STAND_HOLD=5`, `EXTRA='&cueLater=on&plantFloor=6'`,
`SCRIPTS=cue,cueC,cueT,cueCT,cueTx,cueCTx,cueTB,never`, one seed per process, at most 4 at once.

### 0.3 Populations

1. **The baseline:** A, seeds 1–9, `cue` and `cueC`, from the saved runs (3.5x seeds 1–3, 3.5y seeds 4–9). Every stand:
   a **fall** separates within 3 s of the stand (`fellAfterStand ≤ 3`); a **lasting** stand does not (the contrast;
   its falls at 3–5 s are counted beside it).
2. **The trim arms:** the new probe on seeds 1–9, paired by stand against `cue` (`cueT`, `cueTx`, `cueTB`) and `cueC`
   (`cueCT`, `cueCTx`). The pairs share the stand: trim starts at the first standing frame.
3. **The patch arm** (§0.9), if registered: seeds 1–9.
4. **Out of sample:** seeds 10–15, the same scripts, after a dated prediction (§0.10).
5. **The catch start** (lower priority): only as a no-harm check, if forward trim turns out to matter.

### 0.4 Definitions

- **Times** are seconds after the first `standing` frame (`tS`). **The frame** is the board's: + toward the nose; the
  row's `pitch` is the deck's long axis from the horizontal, + nose up (deg, world).
- **Speeds:** vW = horizontal |v_board − flow| (m/s); sched = the controller's schedule speed on its latest tick.
- **The stand** is the `tS = 0` frame; **the cue** is the first frame with `cue = 1`.
- **Margins** are 3.5x's (§0.3): M1 `headX ≤ 0`, M2 `cps.inf > 0`, M3 `beyond`, F `pastZ > 0` (nose side if `capZ > 0`,
  tail side if < 0). **The first escape** is 3.5x §0.4's; **the final escape** is 3.5x §0.10's (the onset of the last run
  of margin loss ending in the separation, gaps ≤ 0.05 s bridged). The class reads the **final** escape (a transient loss
  the rider stands through is not the failure); the first is reported beside it.

### 0.5 The classes of a take-off's first failure

Marks, on standing frames with `tS > 0`:
- **tW** (the wave leaves him): the first frame with `ahead ≤ 0.5` m (3.5x's S line), or the start of the first run of
  ≥ 6 consecutive frames (0.1 s) with `fall ≤ 0` (the surface flat or rising ahead of the nose along the heading).
- **tT** (a tail stall on the face): the first frame with `pitch ≥ +15°` **and** `vW < 3.0` m/s while `ahead > 0.5` m.
  Sensitivity: the counts also at (+10°, 3.3 m/s) and (+20°, 2.5 m/s).
- **tE**: the final escape's onset and its kind: lateral (M1–M3 at the onset frame), F-nose, F-tail; with no margin
  loss, the separation itself (kind "none").

The class, in order:
1. **P:** no standing frame, or the separation within 0.1 s of the stand.
2. **W:** tW ≤ min(tT, tE).
3. **T:** tT ≤ tE.
4. **N:** the final escape is F-nose.
5. **L:** the final escape is lateral.
6. **X:** anything else (an F-tail without the T marks, no margins), described one by one.

3.5x's registered class (§0.4) is printed beside every fall.

### 0.6 The separators

At the stand, at the cue, and over the first 0.2 s (the change from the stand): vW, sched, `pitch`, `tail`, `nose`,
`footR`, `copZ`, `capZ`, `feltDev`, `ref`, `ank`, `rest`, `hip`, `legBw`, `Fp`, `Fb`, `faceFrac`, `ahead`, `fall`,
`lat.slopeDeg`, `lat.hdgFall`, and from the `stand` row `frontShare` and `landingPeak`; over 0–0.2 s also the pitch
rate, ΔvW and `trkT`.
- **AUC** (fall against lasting; 3.5t §1's form), per drive (`cue` and `cueC` share the stand state, so they are not
  pooled).
- **Matched AUC:** over every (fall, lasting) pair of the same drive whose stand speeds vW differ by ≤ 0.25 m/s, the
  share with the fall's value larger (ties ½).
- **The null is speed:** its own AUC is printed. A separator **beats speed** if its matched AUC is ≥ 0.80 or ≤ 0.20 on
  ≥ 10 matched pairs in both drives.

### 0.7 Authority, fore/aft

Per fall, two windows: **the onset** [tT − 0.2, tT] (for a class without tT: [tE − 0.3, tE − 0.1]) and **the last**
[tE − 0.1, tE]. The recovery direction is forward (weight toward the nose) for T, W and F-tail, aft for N.
- **Saturated toward recovery** on a frame: the feet's pressure at the support's edge on the recovery side
  (`headZ ≤ 0` with `copZ` on that side), or the pitch ankle at `MAX_PITCH` (|`ank`| or |`rest`| ≥ 44.5°), or the hip at
  its range (|`hip`| ≥ `hipR` − 0.5°).
- **Points away from recovery** on a frame: the demanded pressure on the far side of the trim's target
  (`(copZ − copT) × recovery < −0.01` m).
- **Within** the rider's authority: the last window is not saturated on every frame, or the command points away on most
  onset frames, or an existing-input drive rescues the stand (carries ≥ 3 s, or adds ≥ 0.25 s paired). A rescue by the
  patch (§0.9) is reported as within **the balance's** authority (the same bounds hold it), not the rider's input.
- **Outside:** saturated toward recovery on every frame of the last window **and** the leading nose-up source of the
  pitch ledger over the onset (`led.pitchDn`, rad/s, + nose down) is the water's (pressure, buoyancy, suction,
  friction, fins, rails, froth, addedMass, radiation), or the class is W.
- Otherwise **at the edge**, described.

### 0.8 The causes, their tests and my predictions

**The chain's order** (for causes 2, 3 and 5): per fall and per lasting stand, the first `tS` of each event:
(i) `feltDev` ≥ 3° back of its stand value; (ii) `ref` ≥ 3° back; (iii) `copZ − copT` ≤ −0.02 m (aft); (iv) `pitch`
≥ 3° above its stand value; (v) vW ≥ 0.3 m/s below its stand value; (vi) the hip at its range; (vii) `trkT` ≤ −0.1 W.
Reported: each event's median time and how often it comes first, in the falls and in the lasting stands.

1. **The wave cannot carry the board.**
   *Tests:* (a) the `never` twin of the same wave: its vW over the fall's sea times from the stand to +1 s. If it keeps
   ≥ 3.6 m/s through +0.7 s on ≥ 2/3 of the T falls' waves, the wave carries a board there; (b) the along-track budget
   at tT, by force, and the slope ahead (`fall`, `lat.slopeDeg`) against the lasting stands; (c) any rescue (trim or
   patch) rejects it for that stand.
   *Prediction:* rejected for the face stalls (T): the paddle twin keeps its speed, the slope ahead stays > 0, and the
   braking is the hull's (pressure and buoyancy along the track, the nose up). Accepted only for W, at most 3 of the 30.
2. **The landing sets the stall.**
   *Tests:* at matched speed, the stand's `pitch`, `tail`, `footR`, `copZ`, `capZ`, `feltDev`, `frontShare` separate
   (§0.6), and in the chain's order the fall's pitch and speed already diverge by +0.1 s.
   *Prediction:* partly. The falls stand more nose-up and tail-deep (3.5t's AUC 0.97 unmatched), and at matched speed the
   stand's pitch and tail immersion still separate (matched AUC ≥ 0.80); `feltDev`, `copZ` and `capZ` at the stand do
   not. The divergence starts after +0.1 s.
3. **The pitch loop leans the body back as the board decelerates** (felt push → reference → ankle and hip → pressure
   aft → nose up → slower).
   *Tests:* (a) order: on the T falls the felt deviation turns back (i) before the nose rises (iv) and before the
   pressure goes aft (iii), on ≥ 2/3; (b) the pitch ledger over [0, tT]: the `pitch` source (ankle and hip) is among the
   two largest nose-up sources; (c) causal: the patch (§0.9) delays the T falls by ≥ +0.25 s paired on at least half,
   and lowers the pitch at +0.7 s by ≥ 5° median.
   *Prediction:* not the first cause. The nose rises and the speed falls before the felt deviation turns back by 3°;
   the loop follows the deceleration and amplifies it at most. The patch changes the median T fall time by less than
   0.25 s.
4. **Compress narrows the hip's range** (±0.4 rad against ±1.2 tall).
   *Tests:* on the `cueC` falls, the hip at its range in the 0.3 s before the final escape on ≥ half, against their
   `cue` twins; and `cueC − cue` paired fall time ≤ −0.25 s on more than half the pairs.
   *Prediction:* rejected. Compress delays A's take-off falls (3.5x: his way 4 falls against 5, median 1.31 against
   0.92 s), and the hip reaches its range on a minority.
5. **The lateral escapes follow the stall.**
   *Test:* of the falls whose final escape is lateral, the share with the looser T marks (+10°, 3.3 m/s) before it.
   *Prediction:* at least 2/3.
6. **The falls over the nose at planing speed have their own mechanism.**
   *Tests:* for each N fall, over the 0.3 s before its F onset: `nose` immersion, `pitch`, `trkT` (W units), the along
   ledger's leading source (`led.along`), the change in `ref`, `dev` and `rest`, and `capZ`'s rate. Labels:
   **deceleration throw** (`trkT` ≤ −0.15 W and a water source leads the along ledger), **nose dig** (`nose` immersion
   rising ≥ 0.05 m with `pitch` ≤ −10°), **pitch loop** (`ref` forward ≥ 3° before `capZ` passes the nose).
   *Prediction:* a deceleration throw with the nose digging, on a board at ≥ 4 m/s; the pitch loop secondary.

**The trim arms.** Full forward moves the reference forward by asin(cop / L), a few degrees, and the pressure target
about 5 cm toward the nose, against a nose rising 20–40° in 0.7 s. *Prediction:* small. `cueT − cue` and `cueCT − cueC`,
paired fall time censored at 3 s: median within ±0.10 s, later ≥ sooner; rescues (≥ 3 s) of at most 3 of the 30 falls;
at +0.7 s vW higher by 0.0–0.3 m/s and the pitch lower by 0–5° (medians); at most 2 new N falls within 3 s. Held to
5 s, `cueT` gains no more than `cueTx`. `cueTB` falls sooner than `cue` on more pairs than later.

**The verdict per class**, by §0.7's rule. *Prediction:* W outside; T at the edge or outside by the rule (the water's
pressure leads the nose-up as the board slows), unless a drive or the patch rescues; N within (the command unsaturated);
L within (3.5x: the command inside the range).

### 0.9 The probe-level patch

At most one, opt-in, adding no authority, chosen after the baseline read and registered here as a dated addition with
its prediction before it runs. The candidate for cause 3 is **the pitch reference without its felt part**:
`StandingBody.prepare` called with a zero felt vector, so the sensed lean and its deviation are 0 and the reference is
the face's normal plus the trim's offset. Every bound (the ankle's range, `MAX_PITCH`, the hip's torque and range, the
feet's reach) is unchanged.

### 0.10 Out of sample

Before seeds 10–15 run, one prediction from the seeds 1–9 read is added here, dated: which stands fall, read from the
stand state, or what full forward trim does.

### 0.11 Controls (before any finding counts)

- **Reproduction:** the new probe's `cue` and `cueC` frame rows equal the saved A files' rows on every common field,
  keyed by script, wave and time, with the same stand, summary and fall times, on every seed run (1–9).
- **Inertness:** one seed with `Z35=off` gives the same rows (every field but `z35`) and fall times as with it on, for
  every script.
- **Builds:** every run prints back `cueLater`, `plantFloor`, the scripts, `trimUntil` and the probe; one run per
  process.
- `git diff b0d19ee8..HEAD -- src scripts` is empty at every commit.

### 0.12 Guards

Usage read at each phase boundary; at 80 % of the 5-hour window, stop, push what is green and write what is left. Power
checked before each batch; no new batch on battery below 25 % while discharging.

### 0.13 Added 2026-11-25, about 10:21 UTC: the owner trims forward when he stands

The coordinator relayed his answer (asked about 10:15 UTC: "When you stand up, do you push the trim forward (right
stick up, or W)?"): **"Yes, forward."** It arrived after the first trim-arm batch had started (seeds 1–4 launched
10:17:27 UTC; no row of it read). It changes no drive, threshold or prediction above, only how the arms are read:

1. **"His way" is now Compress from +0.2 s and forward trim from the stand.** `cueCT` (held) and `cueCTx` (released at
   +1.2 s) are the drives closest to his way; `cueC` is "Compress only". The take-off falls that remain under `cueCT`
   and `cueCTx` are reported with their classes, mechanism and authority verdict as **the falls he still meets**,
   beside `cueC`'s.
2. **Unknown:** how far he pushes (full or partial) and how long he holds it. The held/released pair brackets the
   duration; full +1 stays as registered. A magnitude arm is added only if the usage guard leaves room, and only as a
   further dated addition before it runs.
3. **A rescue is read per stand:** if `cueCT` or `cueCTx` carries a stand that `cueC` drops, that stand's `cueC` fall is
   not one he would meet, and the note says so stand by stand. If trim barely changes the falls (as predicted in §0.8),
   the falls he meets are `cueC`'s.
4. Seeds 10–15 keep `cueCT` and `cueCTx` in their scripts.

### 0.14 Added 2026-11-25, about 10:24 UTC, after the baseline read and before the patch runs: the patch

**What the baseline read showed** (saved A runs, seeds 1–9, `cue` and `cueC`; full tables in §1–§3 once written):
- By the registered rule the 30 falls class as T 16 (8 per drive), N 4 (all `cue`), L 9, X 1, W 0, P 0.
- On the T falls the chain's first event is the nose rising (+0.08 to +0.13 s, 14 of 16), then the speed (+0.27 to
  +0.35 s), then the pressure aft (+0.18 to +0.43 s), and only then the reference and the felt deviation turning ≥ 3°
  back (+0.42 to +0.73 s). Over [0, tT] the pitch ledger's largest nose-up sources are the rider's own `pitch` (ankle
  and hip) and `leg`, against `addedMass`.
- The divergence starts before the stand, in the pop-up's landing: over the `landing` phase the falls' tail sinks
  (matched AUC 0.89 / 0.96) and the nose rises, from a lower `Fp` at the landing's onset (matched AUC 0.04 / 0.09).
  At the stand the reference of the T falls is already about 12° further back than the lasting stands' (it starts
  from the landing's felt lean), and `feltDev` separates at matched speed (0.20 / 0.11).

**The patch, `PATCH=feltOff`** (`take-off-stall.ts`): `StandingBody.prepare` is handed a zero felt vector, so its
sensed lean and smoothed deviation are 0 and the pitch reference is the face's normal plus the trim's offset. Opt-in,
printed back in the `control` row (`patch`). Every bound (the ankle's ±14.3°, the feet's reach, `MAX_PITCH`, the hip's
`HIP_PITCH_TORQUE` and range, `TRIM_PRESSURE`, `TRIM_FREEDOM`), every gain, the delay and the lag are unchanged: it
changes what the loop aims at, not what it can do. It tests cause 3 (§0.8 test c) and the reference's start from the
landing's felt lean.

**Runs:** seeds 1–9, `SCRIPTS=cue,cueC,cueCT`, `STAND_HOLD=5`, A's `EXTRA`, paired by stand against the same scripts
of the unpatched trim-arm runs.

**Prediction.** With the felt part gone, the T falls' reference at the stand moves forward by their felt deviation
(about +10 to +17°) to the face's normal. The command's feed-forward then moves the ankle's rest forward by about as
much at once, and the ankle pushes the body forward, whose reaction on the board is nose-up. So:
1. on the T falls, the patch gains no time: paired median change (censored at 3 s) ≤ +0.10 s, rescues ≤ 2 of 16, and
   the pitch at +0.7 s within ±5° of unpatched (median);
2. on the stands that last unpatched, it adds at least 2 falls over the nose (N) within 3 s;
3. so cause 3 fails its causal test (§0.8 3c).

### 0.15 Added 2026-11-25, about 10:31 UTC: he lets the trim go once the board is moving

The coordinator relayed his second answer (asked about 10:25 UTC: "Once the board is moving, do you keep the trim
forward or let it go?"): **"Let go once moving."** He releases on speed, not on a clock. Written while seeds 5–9 of the
trim arms were running and before any `cueCTv` run; seeds 1–4 of the trim arms had been read. No drive, threshold or
prediction above changes.

1. **How his rule picks between the registered drives.** His trim is forward from the stand until the board is
   moving, then released. For a fall before +1.2 s, `cueCT` and `cueCTx` are the same input, and both are his way. For a
   stand that lives past +1.2 s, his rule picks **`cueCTx`** if the board's vW at +1.2 s (`cueCTx`'s row) is
   ≥ 4.4 m/s, else **`cueCT`** (a board not yet moving keeps the push). Each such stand is named in the results.
2. **The new drive `cueCTv`:** Compress from +0.2 s (`startsWith('cueC')`), full forward trim from the first standing
   frame, released (0, and latched) from the step after the first standing frame whose vW ≥ **4.4 m/s**. 4.4 m/s is 3.5t's
   line: every organic stand that lasted ≥ 3 s had reached it, so it is the speed at which a board is "moving" in this
   game's own record. A stand already at ≥ 4.4 m/s on its first standing frame gets one trimmed step at most.
   - **Runs:** seeds 1–9 with `SCRIPTS=cue,cueC,cueCT,cueCTv` (cue and cueC reproduce the saved rows; `cueCT` is the
     identity check), and on seeds 10–15 beside the registered scripts.
   - **Control:** `cueCTv`'s frame rows equal `cueCT`'s, every field but `x35`'s input echo and `z35`, up to and
     including its release frame.
   - **Paired** with `cueC` on the same stands (the his-way comparison) and with `cueCT`.
   - **Prediction:** as §0.8's trim arms: within ±0.10 s of `cueC` (median, censored at 3 s), no more than 2 rescues.
3. How far he pushes is still unknown; full +1 stays.

### 0.16 Added 2026-11-25, about 10:50 UTC: the out-of-sample prediction (§0.10), from the seeds 1–9 read, before seeds 10–15 run

Seeds 1–9 have been read: the saved baseline and every trim-arm run (cue, cueC, cueT, cueCT, cueTx, cueCTx, cueTB,
never). The patch runs and the `cueCTv` runs have not started. Seeds 10–15 run with
`SCRIPTS=cue,cueC,cueT,cueCT,cueTx,cueCTx,cueTB,cueCTv,never` on the same build.

**The prediction (main), read from the stand state.** In sample, every stand whose tail is ≥ 0.25 m under the surface
at the stand (the `tail` field, 5 cm in from the tail, `tS = 0`) fell within 3 s as T on every drive (7 of 7 stands),
and every stand at vW ≥ 4.7 m/s with the tail < 0.10 m under lasted 3 s with Compress (`cueC`, 12 of 12). On seeds
10–15:
1. every stand with `tail ≥ 0.25` m falls within 3 s, classed T, on `cue`, `cueC`, `cueCT`, `cueCTx` and `cueCTv`;
2. every stand with vW ≥ 4.7 m/s and `tail < 0.10` m lasts 3 s on `cueC`.
It fails if any stand breaks either line. Stands in neither group are reported, not scored.

**Secondary (scored, reported beside):**
3. full forward trim rescues no T fall: on every T fall of `cueC`, `cueCT` and `cueCTx` fall within 0.25 s of it;
4. on the T falls' waves, the paddle twin (`never`) is below 3.6 m/s at +0.7 s on at least 2/3.

### 0.17 Added 2026-11-25, about 10:51 UTC: he pushes the trim all the way (for reading only)

The coordinator relayed his third answer (asked about 11:05 UTC by the coordinator's clock: "How far do you push the trim
forward when you stand?"): **"All the way."** The coordinator asked for this as addition 0.16; that number was already
taken by the out-of-sample prediction, so it is 0.17. It changes nothing above. His way is now fully specified:
Compress from 0.1–0.3 s after the stand (`C_AT` 0.2), trim at +1 from the stand, released once the board is moving
(0.15), the stick centred. Full +1 is his amount, so no magnitude arm is run. The drive closest to his way is
`cueCTv` (released at vW ≥ 4.4 m/s); `cueCT` and `cueCTx` bracket it.

## 1. The answer

*Arm A (`&cueLater=on&plantFloor=6`) on his address, Canyon B Medium, organic seeds 1–9, 12 periods. A take-off falls
when the rider separates within 3 s of the first standing frame. Speeds are through the water (vW, horizontal
|v_board − flow|, m/s). Times are seconds after the stand. Pitch is the deck's long axis from the horizontal, + nose up,
deg. W is the pair's weight, 741 N. Every number below is recomputed by `take-off-stall.py` from the per-frame runs.*

**Of the 30 take-off falls (16 with the stick centred, 14 with Compress), 16 are one failure, the tail stall (T), and
almost all the rest are a second, the board running into the roller's whitewater at the bottom of the face (N and L).**

1. **The tail stall (T, 8 per drive).** It is set during the pop-up's landing, about 0.4 s before the stand. On these
   waves the wave is already losing the board: the same rider kept prone (the `never` twin) is at a median 2.4 m/s at
   the stand's sea time and 1.7 m/s at +0.7 s, against 4.8 and 5.2 m/s on the waves of the stands that last. The popped
   board lands with its tail sinking (tail 0.38 m under at the stand against 0.05 m) and its nose already rising.
   After the stand the nose keeps rising at about 25°/s from the first frame, and the hull's own pressure, on a deck
   pitched nose-up, pushes the board back along its track: −0.08 W over 0–0.2 s and −0.18 W over 0.2–0.7 s, against
   +0.12 to +0.15 W of drive on the stands that last. The board slows from 4.1 to 3.0 m/s by +0.5 s and to 2.0 m/s
   at the escape. The body falls back with the deck, to 15° behind the vertical at the stall mark and 20° at the
   escape, 9–10° behind its own reference, while the ankle's rest is commanded 14–23° forward. The escape is lateral
   at +0.6 to +0.9 s.
2. **The whitewater brake (N 4 with the stick centred, and most L).** These boards stand fast (4.3–4.6 m/s) and run
   down the face. At the bottom (face fraction 0.2–0.6, 3.5–7 m ahead of the crest) they enter a roller lens's froth:
   the froth term reaches −0.15 to −0.45 W, the water under the board speeds up shoreward, and vW drops 2–3 m/s in
   about 0.3 s. With the stick centred the body is thrown forward and the capture point passes the nose (N). With
   Compress the same boards last longer (+0.7 to +1.4 s; s5w3 lasts the 3 s) and escape sideways (L).
3. **Is it within the rider's authority?** By the registered rule every fall is within it. On every T fall the ankle's
   rest is far inside `MAX_PITCH`, the hip stays at exactly 0 from the stand to the escape on all 16, and the
   feet's pressure never reaches the toe or the heel. But **no existing input rescues a single T fall:** full forward
   trim, held or released, changes their fall time by −0.17 to +0.18 s (median −0.01 s), and Compress by at most
   ±0.25 s. What the balance does with its range is the problem, not the range.
4. **Cause 3 (the pitch reference follows the felt push) is the reason the nose rises, but not the reason he falls.**
   The patch that removes the felt part from the reference keeps the nose down (pitch at +0.7 s halved, 12–15° lower) but rescues no T fall: with the stick centred they fall at the same time, over the nose instead of off the tail, and 17 of the 18 stands that last unpatched then fall too (§7).

**What separates the stands that fall from those that last, at matched stand speed:** the tail's immersion at the stand
(matched AUC 0.80 / 0.87, `cue` / `cueC`), the felt deviation at the stand (0.20 / 0.11), and the distance ahead of the
crest (0.84 / 0.89). Over the pop-up's landing, the tail sinking (0.89 / 0.96) and a low dynamic pressure at the landing's
onset (0.04 / 0.09). Speed alone gives 0.21 / 0.25 inside the matched pairs and 0.07 / 0.04 overall.

## 2. Controls (all passed before any finding was read)

| control | result |
| --- | --- |
| Reproduction: the new probe's `cue` and `cueC` against the saved A runs, seeds 1–9 | every summary, stand row and frame row identical in every common field: 4 292 / 4 022 / 4 977 / 4 719 / 5 351 / 7 568 / 4 180 / 3 240 / 3 924 frame rows (`results/35z/check-reproduction.md`) |
| Inertness: seed 1 with `Z35=off`, every script (the trim drives and `never` included) | 17 713 of 17 713 frame rows identical in every field but `z35`; 96 of 96 summaries (`check-inertness.md`) |
| Builds printed back | every file: `cueLater` on, `plantFloor` 6, probe 3.5z, its scripts, `trimUntil` 1.2; the patch files print `patch: feltOff`, the `cueCTv` files `trimSpeed` 4.4 |
| One run per process, at most 4 at once | yes (one queue; between batches only 1–3 ran) |
| `git diff b0d19ee8..HEAD -- src scripts` | empty at every commit |

**The `cueCTv` control (0.15).** Its `cue` and `cueC` rows reproduce the saved A rows on seeds 1–9 (`v-reproduction.md`).
Its rows equal `cueCT`'s in every field but `z35` up to and including the first standing frame with vW ≥ 4.4 m/s on
108 of 110 riders (66 in sample, 44 out; `v-check.md`, `oos-vcheck.md`). The two exceptions:
- **s2w5:** released one frame early (the frame before reads 4.376 m/s);
- **s12w2:** released on its first standing step, so it never trimmed, although its rows read 2.9–3.0 m/s. A debug
  rerun of that one wave (`v-debug-s12w2.md`) shows why: at the release check the water sampled under the board gave a
  flow of (−0.02, +1.62) m/s and so 4.67 m/s through the water, while the frame rows, from the same board velocity
  (|v| 6.28 m/s), imply about 3.2 m/s of flow along the track. The drive checks the speed before its step and the row
  after it, and the two samples of the water disagree here by 1.6 m/s. I did not isolate the cause. Its outcome equals
  `cueC`'s (1.07 s), so it changes no count.

The baseline was read from the saved files (§0.3); the along-track budget, the reference's parts and the front share
(`z35`) come from the new runs' `cue` and `cueC` rows, which are the saved rows plus `z35`.

## 3. The fall table (`results/35z/base-table.md`, every fall; `s19-tparts.md`, the pitch loop)

| drive | stood | fell ≤ 3 s | P | W | T | N | L | X | median fall (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cue` | 34 | 16 | 0 | 0 | 8 | 4 | 3 | 1 | 0.94 |
| `cueC` | 34 | 14 | 0 | 0 | 8 | 0 | 6 | 0 | 1.14 |

The sensitivity thresholds move at most three falls between T and L (+10°, 3.3 m/s: T 9 and 11; +20°, 2.5 m/s: T 7 and 8).

- **T** (`cue`): s1w8, s3w9, s4w6, s5w5, s5w12, s6w1, s6w10, s7w9; (`cueC`) the same less s7w9, plus s6w11.
- **N** (`cue` only): s2w10, s5w3, s7w4, s7w5. **L:** s2w5, s2w6, s5w4 (`cue`); s2w5, s2w10, s5w4, s7w4, s7w5, s7w9 (`cueC`).
- **X:** s6w11 `cue`, the slowest stand (2.30 m/s), whose capture point passes the tail at +0.48 s.
- **W:** none. s5w5 stands 0.47–1.24 m ahead of the crest, but its stall marks come first (+0.08 s); the crest reaches
  it at +0.58 s.

Medians, at the stand and after (A, `cue` / `cueC`; frame rows at tS = 0, +0.35 and +0.7 s):

| group | n | stand vW | sched | pitch | tail (m) | copZ (m) | capZ (m) | feltDev (deg) | frontShare | +0.35: vW, pitch, Fp (W) | +0.7: vW, pitch, Fp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| falls, `cue` | 16 | 4.15 | 4.07 | −3.5 | 0.15 | +0.107 | −0.027 | −12.0 | 0.76 | 3.71, +0.7, 0.73 | 2.25, +13.4, 0.38 |
| lasting, `cue` | 18 | 4.83 | 5.23 | −10.7 | 0.02 | −0.080 | +0.114 | −6.5 | 0.76 | 6.73, −6.3, 1.06 | 5.65, −9.4, 0.41 |
| falls, `cueC` | 14 | 4.12 | 4.02 | −1.4 | 0.22 | +0.108 | −0.044 | −12.6 | 0.76 | 3.37, +7.1, 0.57 | 2.10, +23.5, 0.35 |
| lasting, `cueC` | 20 | 4.83 | 5.03 | −10.0 | 0.03 | −0.080 | +0.114 | −6.6 | 0.77 | 6.10, −6.8, 0.83 | 6.51, −11.4, 0.56 |

The T falls alone (16 riders; `s19-tparts.md`), medians:

| at | vW | pitch | tail | Fp / Fb (W) | felt dev. | ref | body lean | ref − lean | ankle rest | copZ − copT | front share |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stand | 4.12 | +5.5 | 0.38 | 0.52 / 0.27 | −12.9 | −3.7 | +5.6 | −8.7 | −2.0 | +0.111 | 0.68 |
| +0.35 s | 3.40 | +17.5 | 0.52 | 0.58 / 0.24 | −14.7 | −4.7 | −13.2 | +7.5 | +11.9 | −0.020 | 0.47 |
| tT | 2.97 | +19.9 | 0.56 | 0.49 / 0.23 | −15.6 | −5.7 | −14.9 | +9.1 | +14.1 | −0.044 | 0.43 |
| tE | 2.00 | +32.0 | 0.62 | 0.23 / 0.21 | −17.2 | −8.6 | −20.2 | +10.4 | +22.9 | −0.106 | 0.33 |
| lasting < 4.6 m/s, stand (13) | 4.40 | −6.3 | 0.05 | 0.38 / 0.09 | −8.8 | +7.4 | +6.4 | +1.0 | +1.9 | −0.051 | 0.42 |
| the same at +0.7 s | 5.08 | −11.3 | 0.04 | 0.47 / 0.08 | −7.8 | +8.0 | +7.8 | +1.1 | 0.0 | −0.028 | 0.46 |

The headroom along (`headZ`) is 1.00 on every one of these frames: the feet's pressure never nears the toe or heel.

## 4. The separators (`base-separators.md`, `base-separators-popup.md`)

Falls (≤ 3 s) against lasting stands; matched pairs differ by ≤ 0.25 m/s in stand vW (45 pairs `cue`, 46 `cueC`). An
AUC above 0.5 means the falls' value is larger.

| feature | falls / lasting median (`cue`) | AUC `cue` / `cueC` | matched AUC `cue` / `cueC` | beats speed |
| --- | --- | --- | --- | --- |
| vW at the stand (the null) | 4.15 / 4.83 | 0.07 / 0.04 | 0.21 / 0.25 | — |
| **tail immersion** | 0.145 / 0.022 m | 0.93 / 0.96 | **0.80 / 0.87** | yes |
| **feltDev** | −12.0 / −6.5° | 0.07 / 0.03 | **0.20 / 0.11** | yes |
| **ahead of the crest** | 2.78 / 2.65 m | 0.47 / 0.49 | **0.84 / 0.89** | yes |
| rear foot under | 0.078 / −0.039 m | 0.92 / 0.96 | 0.78 / 0.85 | no (0.78) |
| copZ | +0.107 / −0.080 m | 0.91 / 0.95 | 0.73 / 0.80 | no |
| buoyancy | 0.22 / 0.05 W | 0.92 / 0.96 | 0.76 / 0.83 | no |
| ref | −1.8 / +9.7° | 0.08 / 0.04 | 0.27 / 0.20 | no |
| pitch | −3.5 / −10.7° | 0.87 / 0.89 | 0.62 / 0.67 | no |
| frontShare, landingPeak | 0.76 / 0.76; 1.58 / 1.53 bw | 0.60, 0.43 | 0.49, 0.36 | no |
| at the cue: vW, pitch, face fraction, ahead, slope | — | 0.29–0.67 | 0.17–0.80 | no |
| *descriptive (after the baseline read):* tail sinking over the landing | +0.054 / −0.019 m | 0.87 / 0.90 | 0.89 / 0.96 | yes |
| *descriptive:* `Fp` at the landing's onset | 0.41 / 0.46 W | 0.43 / 0.45 | 0.04 / 0.09 | yes |
| *descriptive:* pitch rate over the first 0.05 s | +0.4 / −40°/s | 0.73 / 0.81 | 0.69 / 0.80 | no |

**Read.** At the cue the falls and the stands that last look the same (every cue column inside 0.17–0.80 matched).
They part during the pop-up's landing: the lasting boards' tails rise and their noses go down; the falls' tails sink.
The pop-up's own report (`frontShare` 0.76 against 0.76, `landingPeak`) does not separate them. Since the twin that
never pops slows on the same waves (§5.1), I read the landing's divergence as the wave's: at matched stand speed the
falls sit further ahead of the crest and get less dynamic pressure as the landing begins. That reading is inferred.

## 5. The mechanism, class by class

### 5.1 T, the tail stall (16 falls)

1. **The first divergence is in the landing** (§4), before the standing balance runs (the pitch loop starts on the
   first standing frame).
2. **On the wave:** the paddle twin (`never`, the same rider kept prone and paddling) on the T falls' waves is at a
   median 2.40 m/s at the stand's sea time and 1.73 m/s at +0.7 s; only 1 of the 8 T waves (s5w5, at the crest)
   keeps it at ≥ 3.6 m/s from the stand through +0.7 s. On the waves of the 15 `cue` stands that last, the twin is at
   4.76 and 5.20 m/s, and 12 of 15 keep it (`s19-never.md`). The slope ahead at the stand is a median 10° on the T
   falls against 16° on the lasting stands.
3. **The chain's order** (`s19-chain.md`; the first `tS` of each event):
   - the hull brakes (`trkT ≤ −0.1 W`) at +0.08 to +0.10 s, first in 6 of 8 per drive;
   - the nose rises 3° at +0.13 s (first in the other 2);
   - vW is 0.3 m/s down at +0.27 to +0.29 s;
   - the pressure goes aft of the trim's target at +0.32 to +0.36 s;
   - the reference and the felt deviation turn 3° back only at +0.52 to +0.58 s.
   
   On the lasting stands the pressure is aft from +0.02 s, the nose rises 3° at a median +0.33 s on 17 of 18 (and then
   falls back), and the speed is 0.3 m/s down on only 10 of 18, at +0.63 s.
4. **The pitch ledger** (the board's pitch-rate change by source, rad/s, + nose down; `s19-pitch-ledger-windows.md`,
   medians of the 8 `cue` T falls, against the 6 lasting stands below 4.6 m/s):

   | window (s) | pressure | added mass | leg | pitch (ankle and hip) | sum |
   | --- | --- | --- | --- | --- | --- |
   | 0–0.15, T | −0.35 | +0.30 | −0.27 | +0.21 | −0.09 |
   | 0.15–0.30, T | −0.16 | +0.44 | −0.15 | −0.55 | −0.26 |
   | 0.30–0.50, T | +0.53 | +0.58 | −0.57 | −1.00 | −0.08 |
   | 0.50–0.70, T | +2.29 | +0.36 | −1.84 | −1.17 | +0.29 |
   | 0–0.15, lasting | −2.90 | −1.07 | +5.56 | −2.28 | −0.04 |
   | 0.30–0.50, lasting | −4.10 | +0.22 | +7.73 | −4.72 | +0.36 |

   On the lasting stands the leg pitches the nose down hard and the hull's pressure and the rider's pitch command hold
   it up. On the T falls the leg pitches the nose **up** from the stand, and from +0.15 s the rider's own pitch command
   (the ankle's torque, the hip being 0) is the largest nose-up source. The hull's pressure turns nose-down only after
   +0.3 s, when the deck is already +15–20°.
5. **The pitch loop's parts** (§3's second table). At the stand the T falls' reference is −3.7° (the face's normal
   +9.8°, plus the felt deviation −12.9°: the board is not accelerating, so the felt push is about vertical), while the
   body leans +5.6°: the body stands 8.7° ahead of what the loop asks. The loop moves it back; by +0.35 s it is at −13°,
   past its reference, and keeps going back with the deck, to −15° at tT and −20° at the escape. The ankle's rest is
   commanded forward the whole time (+12° at +0.35 s, +23° at the escape), so the command points toward recovery and is
   unsaturated; the body still goes back, because the deck under it rotates nose-up faster. The pressure follows the
   body aft (front share 0.68 → 0.33).
6. **The hull's response:** the tail sinks from 0.38 to 0.62 m; dynamic pressure falls from 0.52 to 0.23 W, buoyancy
   holds 0.21–0.27 W.
7. **The along-track budget** (`s19-budget.md`, W, medians of the 8 `cue` T falls; + drives the board along its track):

   | window (s) | pressure | buoyancy | added mass | friction | froth | radiation | total | deck pitch |
   | --- | --- | --- | --- | --- | --- | --- | --- | --- |
   | 0–0.2 | −0.081 | +0.046 | +0.009 | −0.029 | −0.061 | +0.010 | −0.098 | +7.9° |
   | 0.2–0.45 | −0.175 | +0.042 | −0.003 | −0.019 | −0.005 | +0.012 | −0.163 | +16.7° |
   | 0.45–0.7 | −0.180 | +0.033 | 0.000 | −0.008 | 0 | +0.002 | −0.152 | +24.8° |
   | lasting, 0–0.2 | +0.117 | +0.014 | +0.056 | −0.024 | 0 | +0.062 | +0.218 | −13.0° |
   | lasting, 0.2–0.45 | +0.152 | +0.032 | −0.015 | −0.049 | 0 | +0.049 | +0.148 | −7.6° |

   **What decelerates the board is the hull's own pressure.** On a deck pitched nose-down the hull's pressure has a
   forward horizontal part and drives the board (+0.12 to +0.15 W). On the T boards, pitched +8° to +25° nose-up, the
   same pressure points back (−0.08 to −0.18 W). A brief froth contact at +0.08–0.13 s (−0.03 to −0.16 W on 6 of 8)
   adds to it. The flow under the board does not change (vG − vW 2.0 → 2.0 m/s, median).

**Reading (measured to step 7; the link from 1 to 5 is inferred):** the wave is losing these boards as he pops (the
twin slows); the landing leaves the tail sunk and the nose rising, and the hull, nose-up, brakes. The pitch loop then
keeps the body near the felt vertical, which on this slow, tail-deep board puts the leg's push and the ankle's forward
torque behind the board's support, so the rider's own pitch sources raise the nose further. The nose-up hull brakes
harder, the board slows, and the body, carried back by the deck, loses the lateral margin at +0.6 to +0.9 s.

### 5.2 N and L, the whitewater brake

`s19-froth.md`, every fall from the stand to its final escape:
- **N (4, `cue`):** stand at 4.32–4.56 m/s; peak vW 4.5–5.7 m/s at +0.28 to +0.43 s; at the escape (+0.52 to +1.57 s)
  vW 2.4–3.8 m/s, face fraction 0.33–0.58, 3.5–5.3 m ahead of the crest. The froth term reaches −0.16 to −0.25 W, and
  the gap between ground speed and speed through the water (a proxy for the water's own speed along the track) grows
  from 1.8–3.2 to 3.1–4.4 m/s.
- **L:** s5w4 (froth −0.46 W), s2w6 (−0.15 W), s2w10 `cueC` (−0.45 W), s5w4 `cueC` (−0.42 W), s7w4 `cueC` (−0.32 W), s7w9
  (−0.25 W at +0.32 s, a 3.08 m/s stand) and s7w5 `cueC` (−0.28 W at +0.88 s, escape at the face's foot, 0.16). Only s2w5
  (both drives, escape at +1.8 to +2.4 s) has no froth to speak of (−0.04 to −0.09 W); its water speeds up under it
  (vG − vW 1.9 → 3.9 m/s with the stick centred).
- **The lasting stands:** the least froth over 0–1.5 s is a median 0.00 W; 10 of 38 reach −0.05 W.

So these boards plane down the face and meet the roller's whitewater and the faster shoreward water at the bottom.
Hull pressure still drives (+0.07 to +0.13 W); the froth holds the board back (`BoardBody`'s froth drag: a board that
outruns the roller's water is dragged toward its speed).

### 5.3 X (s6w11 `cue`)

The slowest stand (2.30 m/s, tail 0.14 m, felt deviation −24.5°), froth −0.34 W at +0.08 s, vW 0.55 m/s by +0.7 s: the
capture point passes the tail at +0.48 s. With Compress it is a T at 1.23 s.

## 6. The trim arms (`s19-pairs.md`)

Paired by stand on seeds 1–9 (34 stands per drive); the trim is sent from the first standing frame.

| pair | over all 34: later / sooner (0.25 s), median | over the base's falls: n, later / sooner, median (range) | vW, pitch at +0.7 s (falls; median diff) | rescued | lost (lasting → falls ≤ 3 s) | new N ≤ 3 s |
| --- | --- | --- | --- | --- | --- | --- |
| `cueT` − `cue` (held) | 0 / 1, 0.000 | 16, 0 / 0, −0.008 (−0.17 to +0.17) | −0.04 m/s, −1.7° | 0 | 1 (s8w2) | 3 (s2w6, s5w4, s8w2) |
| `cueTx` − `cue` (released at 1.2 s) | 0 / 1, 0.000 | 16, 0 / 0, −0.008 (−0.15 to +0.17) | −0.04, −1.7° | 0 | 1 (s8w2) | 3 |
| `cueTB` − `cue` (back) | 1 / 0, 0.000 | 16, 1 / 0, −0.008 (−0.13 to +1.20) | +0.03, +1.6° | 1 (s2w6) | 0 | 0 |
| `cueCT` − `cueC` (held) | 0 / 1, 0.000 | 14, 0 / 1, +0.025 (−0.57 to +0.18) | −0.02, −1.1° | 0 | 0 | 0 |
| `cueCTx` − `cueC` | 0 / 1, 0.000 | 14, 0 / 1, +0.008 (−0.57 to +0.17) | −0.02, −1.1° | 0 | 0 | 0 |
| `cueC` − `cue` (Compress) | 7 / 0, 0.000 | 16, 7 / 0, +0.217 (−0.15 to +1.40) | +0.15, −2.5° | 2 (s2w6, s5w3) | 0 | 0 |

- **Full forward trim does nothing for the T falls.** It moves the reference forward by its offset (+5.0 to +6.3°,
  asin(cop / L) with cop 0.063 m and L 0.73 m) and the pressure target 6 cm toward the nose. On every T fall the pitch
  at +0.7 s is within a few degrees and the fall time within 0.17 s.
- **It costs on the planing stands without Compress:** three new falls over the nose (s2w6 1.80 → 1.63 s, s5w4 0.75 →
  0.62 s, s8w2 lasting → 0.93 s). Back trim rescues s2w6 (1.80 → 3.80 s). With Compress, forward trim adds no N.
- **Held against released** (`cueT` − `cueTx`): 0 / 0 within 3 s; 2 later beyond 3 s.
- **His way, the trim's losses:** s2w10 (`cueC` 1.52 s → `cueCT` 0.95 s, the only change ≥ 0.25 s) and s6w10 (0.93 →
  0.77 s).
- **His rule (0.15)** picks `cueCTx` for the 19 stands that live past +1.2 s and are moving at ≥ 4.4 m/s there, and
  `cueCT` for 9 (s2w5, s4w6, s5w12, s6w1, s6w11, s7w4, s7w9, s8w2, s8w5; vW at +1.2 s 0.35–4.34 m/s). For every fall
  before +1.2 s the two are the same input. `cueCTv`, his rule run as a drive (Compress, full trim, released at vW ≥ 4.4 m/s), against `cueC` over its base falls:
in sample 14 falls, 0 later / 1 sooner (s2w10, 1.52 → 0.95 s), median +0.008 s, range −0.57 to +0.22 s; 14 falls of 34,
T 8, L 6 (`v-pairs.md`, `v-counts.md`). Out of sample 11 falls, 1 later (s13w3, 2.40 → 3.35 s), 0 sooner, median
0.000 s; 10 falls of 29 (`oos-pairs.md`).

**So the falls he meets, his way, are `cueC`'s, stand for stand.** No `cueC` fall is carried by `cueCT` or `cueCTx`;
under trim the same 14 stands fall, 9 of them T, at a median 1.23 s (`s19-counts.md`).

## 7. The patch: the pitch reference without its felt part (§0.14; `s19-patch.md`)

Seeds 1–9, `cue`, `cueC` and `cueCT` with `PATCH=feltOff`, paired by stand against the unpatched trim-arm runs. With
the felt part gone the reference at the stand moves from −3.7° to +10.1° on the T falls (median) and from +9.7° to
+16.6° on the stands that last.

| drive | unpatched class | n | later / sooner (0.25 s) | median change (s) | rescued | new falls ≤ 3 s | vW, pitch at +0.7 s (median change) | patched classes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cue` | T | 8 | 2 / 1 | 0.000 | 0 | — | +0.14 m/s, −14.3° | T 6, N 2 |
| `cueC` | T | 8 | 4 / 0 | +0.233 | 0 | — | +0.35, −14.6° | T 5, L 3 |
| `cueCT` | T | 9 | 4 / 1 | +0.150 | 0 | — | +0.37, −11.9° | T 5, L 3, N 1 |
| `cue` | N, L, X | 8 | 1 / 5 | −0.23 (N), −0.38 (L), +0.27 (X) | 0 | — | +0.5 to +1.5 m/s, −6.5 to −17.5° | N 6, L 2 |
| `cue` | lasting | 18 | 0 / 17 | −1.458 | — | **17** | +0.51, −3.5° | N 7, L 10, held 1 |
| `cueC` | lasting | 20 | 0 / 7 | 0.000 | — | **7** | +0.07, −1.6° | L 7, held 13 |
| `cueCT` | lasting | 20 | 0 / 12 | −0.933 | — | **12** | +0.07, −1.4° | L 11, N 1, held 8 |

Falls within 3 s, patched against unpatched: `cue` 33 of 34 against 16; `cueC` 21 against 14; `cueCT` 26 against 14.

- **The felt part is what raises the nose on the T falls.** Without it their pitch at +0.7 s is about half (+5 to
  +20° against +21 to +40°; s5w5, at the crest, +31° against +40°), and the board is 0.1–1.1 m/s faster there.
- **But it does not decide the fall.** No T fall is rescued; with the stick centred the median change is 0.00 s and
  the body now goes over the nose (s1w8, s4w6, s6w1: F-nose at +0.63 to +0.87 s). With Compress 4 of 8 come later by
  ≥ 0.25 s (median +0.23 s), and escape sideways.
- **The patch costs every other stand.** The first standing frame already loses 0.3–0.5 m/s through the water (the
  reference's jump forward moves the ankle's rest at once, and pushing the body forward pushes the board back). The
  stands that last without the patch fall: 17 of 18 with the stick centred, 7 of 20 with Compress, 12 of 20 with
  Compress and trim.
- **Against the pre-registration (§0.8 cause 3, test c):** the pitch at +0.7 s is lower by ≥ 5° (yes, by 12–15°);
  ≥ +0.25 s on at least half the T falls: `cue` 2 of 8 (no), `cueC` 4 of 8 (exactly half), `cueCT` 4 of 9 (no). The
  test passes for the nose, not for the fall.
- **Against my patch prediction (§0.14):** (1) no gain on the T falls: right for `cue` (0.00 s) and the rescues (0),
  wrong for `cueC` (+0.23 s) and `cueCT` (+0.15 s), and wrong on the pitch (I predicted ±5°; it is −12 to −15°);
  (2) at least 2 new falls over the nose among the lasting stands: right (7 with the stick centred, plus 10 L); (3)
  cause 3 fails its causal test: it fails on the fall, not on the nose.

**Read:** the felt-following reference is the body's answer to a decelerating board, and on the stands that last it is
what keeps him off the nose. On the boards the wave is losing it leans him back and lets the nose rise; taking it away
keeps the nose down but sends him over it, about as soon. Neither reference holds a board that is losing 1.5 m/s per
second.

## 8. Compress (`s19-pairs.md`, `s19-counts.md`)

- `cueC` − `cue`, paired over the 34 stands: 7 later, 0 sooner; over the 16 base falls a median +0.22 s; 2 rescued
  (s2w6, s5w3, both whitewater brakes), none lost. vW at +0.7 s is a median +1.03 m/s higher over all 34 pairs.
- Compress carries no T fall: their times change by −0.15 to +0.23 s.
- **The hip at its range:** 12 of 4 608 `cueC` standing frames over 0–3 s (30 of 4 048 `cueCT`), and none in the 0.3 s
  before any final escape. On every T fall of `cue`, `cueC` and `cueCT` but one (s7w5 `cueCT`, at 2.38 s) the hip is
  exactly 0 from the stand to the escape; it moves (by up to 5° on the stick centred, 34° with Compress) only on
  stands that are not stalling. The hip only takes
  what passes 0.8 of the feet's reach, and the feet's pressure never got near the heel.
- **Cause 4 is rejected:** the hip is never at its range when a take-off fails, his way or not.

## 9. The falls over the nose (`s19-nose.md`)

All four N falls on the stick centred, and the three forward trim adds (s2w6, s5w4, s8w2 `cueT`), are the whitewater
brake of §5.2 (froth −0.14 to −0.45 W at the onset; on s8w2 only −0.05 W, with the water under the board speeding up,
vG − vW 2.8 → 3.8 m/s):
- the stand is at 4.3–4.6 m/s, the nose stays down (−5 to −13° over the last 0.3 s), and at the F onset vW is 2.3–3.9
  m/s;
- the capture point moves from −0.2 to +0.0 m to +0.38–0.40 m in 0.3 s, while the reference moves 1–5° **back**;
- the along ledger (the body's along-speed change) is led by the leg (−18 to −28 m/s summed) against the froth
  (+5 to +28) and the hull's pressure (+7 to +12): the board is held back and the body is not;
- "nose dig" (the nose immersion rising ≥ 0.05 m with the pitch ≤ −10°) fits 3 of the 7 (s5w3 `cue`, s5w4 `cueT`,
  s7w4 `cue`);
- the registered "deceleration throw" label (`trkT ≤ −0.15 W` averaged over the last 0.3 s) fits none, because hull
  pressure still drives while the froth holds back: the froth term alone reaches −0.16 to −0.25 W;
- the "pitch loop" label fits none.

**Read:** the board's deceleration in the whitewater throws the body forward. Compress lowers the body and turns these
into later, lateral falls (§8); back trim delays them by 0.03–0.09 s and rescues one (s2w6, an L).

## 10. The verdict per class

| class | falls (`cue` / `cueC`) | by §0.7's rule | why | what the arms did |
| --- | --- | --- | --- | --- |
| **T**, the tail stall | 8 / 8 | **within** (16 of 16: nothing saturated; the command points forward on most onset frames) | the ankle's rest at +14–23° against 45°; the hip 0; headZ 1.00 | trim: no change (±0.17 s); Compress: ±0.23 s; the patch: nose 12–15° lower at +0.7 s, 0 rescued, median 0.00 / +0.23 / +0.15 s |
| **N**, over the nose | 4 / 0 | **within** | unsaturated; the capture point passes the nose with the command off its limits | Compress rescues 1 of 4 and delays 3 (+0.7 to +1.4 s); back trim rescues s2w6 (an L) |
| **L** | 3 / 6 | **within** | unsaturated | Compress rescues s2w6 |
| **X** | 1 / 0 | **within** | — | — |

**What the rule does not say.** "Within" here means that the balance had unused range, not that it could have held the
stand with that range. For T, the evidence is against it:
- the twin that stays prone stalls on the same waves;
- no existing input moves a single T fall by 0.25 s;
- the one design change tried (the patch) keeps the nose down but rescues none, and costs most of the stands that last.
So I read T as **at the edge of what the wave gives**: the wave is losing the board, and the balance's choices can only
choose how he falls (tail first or nose first). That is a reading, not the rule's verdict.

The whitewater brake is outside the balance's reach as a cause (the froth and the faster water are the wave's), but
within its authority as a fall: Compress already carries 2 of them and delays the rest.

## 11. Out of sample: seeds 10–15 (§0.16)

Seeds 10–15 ran after the prediction was committed (`2442ee7e`, 10:49:57 UTC; the first of these runs started at
11:18:10), with every script of 0.16 (`results/35z/oos-*.md`). 29 stands per drive.

**The prediction holds.**

| line | stands | result |
| --- | --- | --- |
| P1: tail ≥ 0.25 m at the stand → T within 3 s on `cue`, `cueC`, `cueCT`, `cueCTx`, `cueCTv` | 5 (s11w3, s11w4, s11w7, s12w7, s13w6) | **5 of 5** (all T, 0.85–1.32 s, on every one of the five drives) |
| P2: vW ≥ 4.7 m/s and tail < 0.10 m → lasts 3 s on `cueC` | 11 | **11 of 11** |
| P3 (secondary): on each `cueC` T fall, `cueCT` and `cueCTx` within 0.25 s | 8 | 7 of 8; s13w3 is carried (`cueC` 2.40 s, `cueCT` 3.35 s, `cueCTx` 3.37 s) |
| P4 (secondary): on the T falls' waves the twin is below 3.6 m/s at +0.7 s on ≥ 2/3 | 8 waves | 6 of 8 (s11w3 and s13w3 keep 3.7–4.0 m/s) |

s11w7 shows what the tail adds to speed: it stands at 5.02 m/s, faster than most lasting stands, with the tail 0.31 m
under, and falls as T at 1.13–1.32 s on every drive.

**The picture repeats** (`oos-counts.md`, `oos-separators.md`, `oos-tparts.md`, `oos-budget.md`):
- falls within 3 s: `cue` 11 of 29 (T 7, N 2, L 1, X 1); `cueC` 11 (T 8, L 3); `cueCT` and `cueCTx` 9 (T 6, L 3);
  `cueCTv` 10 (T 7, L 3);
- at matched stand speed, the tail's immersion separates completely (matched AUC 1.00 / 1.00), as do the rear foot's
  depth, `copZ`, buoyancy (0.94–1.00) and the distance ahead of the crest (0.94 / 0.85); the felt deviation less than in
  sample (0.39 / 0.26);
- the T falls stand at +3.3° with the tail 0.36 m under; the hull's pressure brakes the board from the stand (−0.04 W
  over 0–0.2 s, −0.14 W over 0.2–0.45 s); the body falls 10° behind its reference by the stall mark; the ankle's rest is
  commanded 10–19° forward; the feet stay clear of the toe and heel;
- the paddle twin keeps ≥ 3.6 m/s through +0.7 s on 17 of the 18 lasting stands' waves and on 2 of the 7 `cue` T
  falls' waves;
- trim on the base falls (`oos-pairs.md`): `cueT` − `cue` 0 later / 0 sooner, −0.10 to +0.05 s; `cueCT` − `cueC` 2 later
  (s13w3, s14w2), 0 sooner, median +0.02 s.

**His way, stand by stand (0.13, 0.15).** Two `cueC` falls are not ones he would meet: **s13w3** (`cueC` T at 2.40 s;
his rule picks `cueCT`, vW 3.62 m/s at +1.2 s, which lasts to 3.35 s) and **s14w2** (`cueC` L at 2.92 s; his rule picks
`cueCTx`, vW 5.00 m/s at +1.2 s, which lasts to 4.05 s; `cueCTv`, released earlier, falls with `cueC`). Both are late
falls (2.4–2.9 s). Every fall before +1.2 s is the same under every his-way drive.

## 12. Candidates for Vicente (not built), surprises, what is left, reproduce

**Candidates for Vicente (not built; each needs his word, and each but 4 needs a `src` change):**
1. **The pop-up on a wave that is losing the board.** The T falls are decided over the pop-up: at the cue the falls and
   the stands that last look alike, but 1.2 s later the twin that stayed prone is at 2.4 m/s on the T waves and 4.8 m/s
   on the others. A later or conditional cue cannot be read off the cue's own state here (nothing at the cue separates
   at matched speed). What could be measured next is the take-off window itself: on the T waves, does any pop time
   (earlier, later, or none) carry the board, with the bot popping at fixed offsets from the cue?
2. **The pop-up's landing.** Over the landing the falls' tails sink (matched AUC 0.89 / 0.96) and their noses rise; the
   landing holds the feet's pressure at the middle and loads the front foot 0.76 on both groups. A landing that answers
   a sinking tail is a pop-up sequence decision, like 3.5t's candidate 2.
3. **The fore/aft reference at the stand.** It starts from the landing's felt lean on the first frame (§0 of the brief).
   Following the felt push keeps the fast stands off the nose (the patch costs 17 of 18), and lets the nose rise on the
   slow ones (the patch halves it). A reference that starts at the face's normal and takes the felt part in over
   `PITCH_REFERENCE_TIME`, or limits how far back it can lean the body, sits between the two; it is not measured.
4. **The hip in pitch.** On every T fall the hip stays at 0 while the body falls 15–35° behind its reference, because it
   only takes what passes 0.8 of the feet's reach, and the pressure never nears the heel. Whether a hip that answers the
   body's lean error would hold a stalling board is a question for a diagnosis, not a fix: it changes how existing
   authority is used.
5. **The whitewater at the bottom of the face** (a wave-track question). The N falls and most L falls meet a roller
   lens's froth 3.5–7 m ahead of the crest at face fractions 0.2–0.6, with the water there running shoreward 1–2 m/s
   faster. Whether a broken wave's foam should reach that far down and ahead is for the water-physics advisor.
6. **His way already does what helps.** Compress delays every whitewater brake by 0.7–1.4 s and carries 2. Full forward
   trim neither helps nor hurts his way (`cueCT`, `cueCTx` within 0.25 s of `cueC` on 13 of 14 falls); without
   Compress it sends three planing stands over the nose.

**What surprised me.**
- **The wave, not the balance, decides the T falls first.** I predicted the paddle twin would keep its speed; it stalls
  on 7 of the 8 T waves, while the popped board, oddly, stands 1.7 m/s faster than the twin at the same moment (median
  4.12 against 2.40 m/s): the pop-up and its landing gain speed on these waves before the stall takes it.
- **Forward trim is inert on the stall.** Its whole effect is a 5–6° reference offset and 6 cm of pressure target,
  against a deck rotating 25°/s.
- **The patch halves the nose's rise and changes nothing about the fall.** Without the felt part he goes over the nose
  as soon as he went off the tail.
- **The hip is never used on a take-off that fails.**
- **The falls over the nose are not a fore/aft fault of the rider:** they are the board braking in the whitewater.

**What is left.**
- The pop-up's landing (about 0.4 s) is not in the ledger: the solves booked are the standing 9 × 9 ones.
- The twin is prone, so it measures what the wave does with a prone board, not with a standing board at its best trim.
- The catch start was not run: forward trim did not matter (§0.3, item 5).
- The patch was not run out of sample.
- The registered "deceleration throw" label never fired because hull pressure still drives while the froth brakes;
  §9 reads the froth term on its own.

**Reproduce** (bundles from the committed `take-off-stall.ts`: `tos.mjs` for the trim arms on seeds 1–9, `tosP.mjs`
for the patch, `tosV.mjs` for seeds 10–15 and `cueCTv`; with `PATCH` unset and the scripts of 0.2 the three give the
same rows):

    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/take-off-stall.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > <s>/tos.mjs && cat <s>/raw.mjs >> <s>/tos.mjs
    # trim arms, seeds 1-9 (one process per seed, at most 4 at once; ~11 min each with four running)
    env MODE=organic SEED=<1-9> PERIODS=12 STAND_HOLD=5 SCRIPTS=cue,cueC,cueT,cueCT,cueTx,cueCTx,cueTB,never EXTRA='&cueLater=on&plantFloor=6' OUT=<s>/runs/o-s<seed>-T.jsonl node --max-old-space-size=3200 <s>/tos.mjs
    # inertness: the same, seed 1, with Z35=off, OUT=<s>/runs/o-s1-Toff.jsonl
    # the patch: SCRIPTS=cue,cueC,cueCT PATCH=feltOff, OUT=<s>/runs/o-s<seed>-P.jsonl
    # cueCTv, seeds 1-9: SCRIPTS=cue,cueC,cueCT,cueCTv, OUT=<s>/runs/o-s<seed>-V.jsonl
    # out of sample: SEED=<10-15> SCRIPTS=cue,cueC,cueT,cueCT,cueTx,cueCTx,cueTB,cueCTv,never, OUT=<s>/runs/o-s<seed>-T.jsonl
    # the reads (dirs: the saved A baseline linked as o-s<seed>-A.jsonl; the new runs)
    python3 docs/research/new-rider/3.5/take-off-stall.py repro <new dir> T <baseline dir>
    python3 docs/research/new-rider/3.5/take-off-stall.py inert <runs dir> T Toff
    python3 docs/research/new-rider/3.5/take-off-stall.py table|sep|seppop|chain A <baseline dir>
    python3 docs/research/new-rider/3.5/take-off-stall.py chain|budget|froth|never|nose|pairs|counts|tparts|oos T <new dir>
    python3 docs/research/new-rider/3.5/take-off-stall.py patch P T <dir with both>
    python3 docs/research/new-rider/3.5/take-off-stall-ledwin.py A|T <dir>

**Data in the repository** (`results/35z/`, about 0.1 MB, markdown only): the checks, the baseline reads (`base-*`),
the seeds 1–9 reads (`s19-*`), the out-of-sample reads (`oos-*`) and `cueCTv`'s (`v-*`). The per-frame runs (about
0.7 GB) stay in the session scratchpad under `35z/runs/`.
