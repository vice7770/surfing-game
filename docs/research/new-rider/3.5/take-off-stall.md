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
