# 3.6c: what makes the deep stances wobble and tip the rider sideways, and why a turn just after letting go of Compress falls

*Surfer-track builder, Claude Opus 5.5, xhigh effort, 2026-11-25. Branch `claude/wobble`, from `claude/faster-turns`
`340fc560` (3.6b, reviewed). The brief is `BRIEF.md` in this folder, verbatim. Diagnosis only: docs, probes and
diagnostic knobs, no arm. His address throughout: `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.*

## 0. Pre-registration (written and committed before any run of this round)

**What I had read when writing this.** The brief; 3.6b's write-up (`../turns/README.md`, all of it) and its probe
(`turn-probe.ts`) and runner (`run.py`, `shape.py`); the consult log from Codex's lateral-support entry on (through
this round's dispatch); the coordinator's `review36b/spectrum.py`; and the code: `BoardBody.ts` (the yaw and roll
ledgers, `applyFoils`, `settleFoils`, the settle loop), `finForces.ts` (`finForce`), `AttachedRider.ts`
(`coupleYaw`, `finish`, `predictiveBank`, the leg's posture step around `projectionCatch`, `captureStep`),
`predictiveBalance.ts` (`PredictiveController.tick`, `STANCE_TABLE`, `BOARD_INERTIA`), `humanBalance.ts`
(`capture`, `stanceRoom`). **I have opened no raw frame row of 3.6b's runs or of the baselines' runs**; I know them only
through the tables printed in 3.6b's README, the consult log and the brief. Everything under "Predictions" is a guess
made before data.

### 0.1 Frames, signs and the swing

- *Times* are s after the ride's first standing frame (`tS`), 60 Hz frames, as the benchmark's.
- *Yaw rate* Ω: `board.angularVelocity.y`, about the world's up, rad/s (deg/s in tables); + takes the nose from +z
  toward +x (the board's left, the steer's +1).
- *Roll rate* p: the board's angular velocity on its own long axis (board +z in the world), + lifts the +x rail (the
  roll ledger's datum).
- *The swing* is the alternating part of a signal: the signal less its centred 15-frame (0.25 s) mean, the benchmark's
  and 3.6b's ringing. Every torque is split the same way, so "alternating torque" means torque less its centred 0.25 s
  mean; "sustained" is the mean.
- *Swing amplitude*: the std of Ω's alternating part over the window.
- *The window* for straight rides: tS 0.5–3.0 s, rides standing through it (the coordinator's spectrum's window);
  secondary 0.5–4.5 s, rides standing through it. For steered rides: +1.0 s to the escape (`escapeAt` as the
  benchmark defines it, or the fall when no escape is labelled).
- *Matched* rides: the organic drive places every script of a process on the same wave at the same time; a ride's id
  is (sea, seed, wave, script). Paired comparisons pair by (sea, seed, wave) across stances, or by the full id across
  knob settings.
- *The capture point across*: `human.state.across`, m, board frame x (+ the +x rail), with its parts as `capture`
  builds it: `across = pointAcross + speedAcross / omega`, `pointAcross = offset.x − height · felt.x`
  (`offsetAcross` the centre of mass from the feet's middle across the deck; `feltAcross` the felt vertical's
  across component, unit vector, deck frame; its tilt `tiltAcross` = atan2(n_x, n_y)). The feet's half-width across
  and the reach left (`reach` when across) set the edge. The *sideways crossing* is the first `beyond` frame with
  `pastZ` = 0 (3.6b's `m3`=1, `mf`=0).

### 0.2 Facts from the code, to be checked at run time, not assumed

1. **The yaw ledger's duplicate.** `y.addedMass += waterTy` books the explicit half of the surface-normal push, which
   the settle loop's `radiated` and `inertia` entries carry again; the roll ledger leaves `waterT` out except ruling 3's
   wall push and `plateWall`, booked at their own sites, and puts `suction` in its residual. The yaw ledger's
   `rider` residual omits `suction`.
2. **The twist joint's work sign.** `coupleYaw` puts τ_b = τ_a + kθ_t + cθ̇_t on the board about the leg's line `up`
   and −τ_b on the upper body; θ_t is the upper body's yaw less the board's. So the active torque's power on the pair is
   −τ_a θ̇_t, and Codex's estimate −mean(τ_a) × Δθ_t over a half-cycle is its work (`finish`: `tb.torque` is τ_b
   realised over the substep).
3. **The balance's design depth is the leg's rest, not the commanded stance.** `predictor.tick` and the yaw inertia's
   split (`coupleYaw`'s `stanceAt`) read `yawDepth` = max(0, −`leg.rest`); the stance room (`stanceRoom`, the knees'
   travel for the balance's own knee drop) reads `heldDepth` = the commanded depth. So when Compress is let go, the room
   reads tall at once while the controller's design and the yaw split follow the rising leg.
4. **The felt vertical is the pair's specific force**, low-passed 0.1 s, on the deck's axes (`feltFrame=deck`). Any
   sideways acceleration of the pair (board and rider) tilts it across; a yaw swing of the course at speed V makes a
   sideways acceleration of about V × dχ/dt.

If any of these is contradicted by the frames, I record it before reading anything else.

### 0.3 The method, in the brief's order

**M1. The riderless yaw budget.** A diagnostic-only `src` change: `BoardBody.yawLedgerClosed` (static, false by
default, read only inside the existing `yawLedger` branches). With it on, the yaw ledger books as the roll ledger does
(no wholesale `waterTy`; ruling 3's wall push and `plateWall` at their own sites; `suction` in the residual), and books
the part it leaves out in a new entry `duplicate`, so the shipped residual is the closed one less `duplicate` (plus the
omitted `suction`) and both can be read from one run. The physics is untouched (ledger branches only). Tests:
- *Bare board, plane water*: `new BoardBody({})`, no rider, `PlaneWater` slopes (0.20, −0.08), placed at the centre of
  mass's height, velocity (0.4, 0, 6) m/s, heels −20°, −10°, 0°, +10°, +20° about +z, 60 steps of 1/60 s each; the
  largest |`rider`| over the steps, shipped and closed, and the first step's both (Codex's +38.43 N·m at −20°).
- *Bare board, Canyon water*: on Canyon Big seeds 1–3, for each wave where the `none:straight` rider stands to
  tS 0.5 s, a fresh bare board placed with that ridden board's pose and velocities at that frame and stepped 120 steps
  on the same water beside the ride (the organic drive's water never takes a reaction). The largest |`rider`| per board,
  shipped and closed.
- **Closes** if the closed residual is below 10⁻⁶ N·m on every step of every bare board, against a total of the order
  of the hull's own torques.
- Then, on ridden frames (closed ledger): the signed contributions on the common axis (world up): fins, rails, the
  hull's pressure (`pressure`), buoyancy, the water's inertia (`addedMass` + `radiation`), friction, froth, bed, gyro,
  and the rider's coupling (`rider`, now honest: the feet's push, the lower body's yaw inertia, the twist's reaction,
  the swing's couple). The twist's reaction on the board is also logged separately (from `finish`, τ_b on `up`
  projected on world y, mean over the step), so the rider's term splits into twist and the rest.

**M2. Who feeds the swing: power into the alternating yaw, by source.** For each source s on the closed ledger,
P_s = mean over the window of τ_s,alt × Ω_alt (W; Ω at the step's mean, the average of the frame and the one before).
The sources sum to the board's own d/dt(½ I Ω²) (zero on average over a stationary swing), so a positive P_s feeds the
swing and a negative one takes energy out of it. The same for the board's roll swing on the roll ledger (closed
already), P_s = mean(q_s,alt × p_alt). Read per stance on the straight rides (medians, and per-wave matched
differences), and on the steered rides over +1.0 s to the escape.

**M3. The rider's joint work per half-cycle (Codex's method).** Half-cycles are the intervals between successive zero
crossings of Ω_alt (each one swing from a yaw extreme to the other). Over each:
- W_tw = −mean(τ_a) × Δθ_t, J (`twAct`, `twA`), and its alternating part −mean(τ_a,alt) × Δθ_t,alt; and the exact
  integral −Σ τ_a θ̇_t h over the substeps (accumulated by the probe in a read-only wrapper of `finish`), total and
  alternating at frame level.
- The ankle's active work: the power of moving the ankle's rest, τ_ankle × d(rest)/dt (the spring's moving end), and the
  knees': F_spring × d(`leg.rest`)/dt with F_spring = −k(`leg.extension` − `leg.rest`); frame level, J per half-cycle.
- Sustained turning is the mean parts; the alternating parts are the swing's. Positive alternating work means the
  joint feeds the swing. Per ride: the sum over the window's half-cycles, and the series of successive half-cycles
  before the escape (growing or not) in the falling rides against their matched straight and tall rides.

**M4. Frequency tracking.** Diagnostic knobs, a second `src` change committed on its own: one module-level object
`WOBBLE` (`src/physics/wobbleKnobs.ts`), every field at its identity by default (factors 1, shifts 0, depths −1 = off).
No address reads it: only a probe can set it, so it is off online by construction. Each use is guarded so that at the
identity the shipped expression runs unchanged. The knobs, each moving one candidate's own frequency:
- `knee`: `KNEE_STIFFNESS` × f for the new rider (the leg's damping follows at the same ratio, so the axial mode's
  damping ratio stays 0.35 and its frequency moves by √f). The leg's own axial mode.
- `twistGain` and `ankleGain`: the controller's feedback gain row for the twist torque (K[1]) or the ankle's rest
  (K[0]) × f; the reference's feed-forward and the bias are untouched. The balance loop's own mode.
- `senseShift`: the senses reach the controller ±2 ticks off what the design assumes (8 or 4 ticks against 6; the
  design, the filter and the predictor unchanged). The loop's delay.
- `fins`: every fin's force and its implicit damping × f (the fin's lift slope). The hull's yaw stiffness and damping.

Settings: each knob at ×0.7 and ×1.3 (`senseShift` at +2 and −2), one process per setting and seed, all knobs else at
identity. Rides: Canyon Big seeds 1–3, the straight scripts `none`, `crouch`, `compress`, `snap` and `hisway`, the
same drives as the benchmark's (stance from 0.2 s; his way's trim).

*The peak frequency.* Pooled over the rides of a cell (stance × setting) standing through the window: Ω's linear
detrend, Hann window, spectrum zero-padded to 0.05 Hz, summed over rides, the peak in 1.5–5 Hz refined by a parabola
through its three bins; a 90 % interval by 1,000 bootstrap resamples of the rides (fixed seed). Beside it, per ride, the
zero-crossing frequency of Ω_alt over the window, paired by ride id against the knobs-off ride.

*The elasticity* e = ln(f₊ / f₋) / ln(k₊ / k₋) from the two settings' pooled peaks (k the knob's factor; for
`senseShift`, the delay 8 / 4 ticks, so a delay-set mode has e near −1). A spring–mass mode carried by a knob's
stiffness has e = +0.5 (×1.3 → +14 %, ×0.7 → −16 %).

*Decision rule.* A knob **carries** the swing in a stance if |e| ≥ 0.25 with both settings' shifts in the same
direction and both intervals excluding the knobs-off peak; it **does not carry** it if |e| < 0.10 and both settings'
peaks lie within ±0.15 Hz of knobs off; otherwise **partly**. The swing's amplitude under each setting is read beside it.

**M5. Why deeper rings more.** The ingredients that change with depth, swapped one at a time to tall's while the body
holds Compress or the tuck (further `WOBBLE` fields, the same guards):
- `designDepth = 0`: the controller's design (its model, gains, filter and reference) scheduled at depth 0;
- `splitDepth = 0`: the rider's yaw inertia split (`coupleYaw`'s lower and upper shares) read at depth 0;
- both at 0.

The same rides and readings as M4 (frequency, amplitude, M2's power by source). The ingredient whose swap brings the
deep stance's swing amplitude down toward tall's is the one that makes it larger. A swap "explains" the excess if it
removes at least half of the deep stance's amplitude excess over tall on the matched waves (median of per-wave ratios).

**M6. The sideways tip in a held turn (question 2).** In the balance falls inside the steer (+1.0 to +2.0 s; Big
seeds 1–3, Compress, Crouch, Snap and his way left and right; causes by the benchmark's rule as 3.6b's `shape.py`
applies it), from the steer's start to the escape, frame by frame:
- `across` split into `offsetAcross` (the body's place across the deck), −`height`·`feltAcross` (the felt vertical's
  tilt, from the pair's sideways acceleration) and `speedAcross`/`omega`, each as its change from +1.0 s to the escape;
- the pair's sideways acceleration on the deck's x and the board's V × dχ/dt (χ the course over the ground), to check
  fact 4;
- the swing's half-cycles before the escape (Ω_alt's amplitude per half-cycle, growing or not) and their phase against
  the felt tilt;
- the side of the crossing against the turn (inside or outside);
- the matched controls: the same wave's tall steer and the deep stance's straight ride.

**M7. The release (question 3).** New drives `release<x>:left|right`, x ∈ {0, 0.2, 0.4, 0.6}: his way (Compress held
from 0.2 s, the trim from the stand released at vW ≥ 4.4 m/s), Compress let go at tS = 1.0 − x (x = 0.6 holds it
0.2 s), the steer ±1 from +1.0 s to +2.0 s. On the same processes: `hisway:left|right` (Compress held through the turn)
and `none:left|right` (tall), and the straight `hisway`, `release<x>` (no steer) for the leg's own rise. Seas: Big seeds
1–3, Medium seeds 1–3, the test wave's `tw-catch` and `tw-ride`. Read per drive:
- falls before +2.0 s and in +2.0 to +3.5 s, by the benchmark's cause rule (balance, wave, whitewater);
- the crossing's direction (sideways or fore-aft; inside or outside the turn) at the first `beyond` frame;
- the leg's height (`leg.rest`, `leg.extension`; depth = −rest) at +1.0 s and at the fall, its rise rate and any
  overshoot over the riding stance (`EXTENSION_TALL`);
- the room's depth (`heldDepth`) against the design's (`yawDepth`) at +1.0 s;
- the swing's amplitude over the steer, and M6's capture split for the release falls.
Paired with `hisway:<side>` and `none:<side>` on the same wave.

**M8. Matched comparisons.** For every Big wave where `none`, `compress` and `crouch` straight rides all stand through
the window: per wave, the swing amplitude, the peak frequency (zero crossings), M2's powers and M3's works, tall against
Compress against the tuck; reported as per-wave ratios and the count of waves where the deep stance exceeds tall.

### 0.4 Hypotheses (for question 1)

- **Y1, the twist loop pumps the board.** The balance's twist command (the head's yaw rate, the twist and its rate fed
  back 0.1 s late) acts on the board as the reaction of the upper body's turn, and with the board's light rigid share
  (board 0.56 kg·m² + lower body 1.24–0.86 kg·m² against an upper body of 1.96–2.44 deep, 1.37 against 1.44 tall) the
  reaction swings the board. *Tells it apart:* positive alternating twist work (M3) and positive twist power into Ω_alt
  (M2), the water's terms negative; `twistGain` (and `senseShift`) move the peak (M4); `splitDepth` or `designDepth`
  removes the deep excess (M5).
- **Y2, the leg's axial mode.** The knees' 20 kN/m under 73 kg bounce at 2.46 Hz damped, and the bounce reaches yaw
  through the deck's load (the hull's pressure moment, the twist's grip `FOOT_FRICTION × legLoad × 0.315`).
  *Tells it apart:* `knee` carries the peak (e ≈ 0.5); the knees' active work feeds the bounce; the twist's grip binds
  at the bounce's light phase.
- **Y3, the hull's own yaw mode.** The fins and the hull's pressure against the board's and the rigid body's yaw
  inertia, driven by the water. *Tells it apart:* `fins` carries the peak; the water's terms (fins, pressure) feed Ω_alt
  in M2 while the rider's coupling takes energy out.
- **Y4, the roll loop through the hull.** The ankle's roll loop swings the board's roll, and the rolled hull's pressure
  and rails turn it into yaw. *Tells it apart:* the roll swing leads the yaw swing; the ankle's active work feeds the
  roll swing (M2 on the roll ledger, M3's ankle); `ankleGain` carries the peak; `pressure` or `rails` feed Ω_alt.

### 0.5 Predictions (made before any data)

1. **M1.** The closed residual is below 10⁻⁹ N·m on every bare-board step on plane water and on the Canyon; the shipped
   residual is +38.43 N·m on the first −20° step (Codex's) and tens of N·m on the Canyon.
2. **The facts of §0.2 hold**, item 3 included: at +1.0 s of a `release0` ride the design depth is still above
   0.15 m while `heldDepth` is 0.
3. **Y1 is the carrier** (low-to-moderate confidence). On the Big straight rides in Compress: the twist's alternating
   work is positive in most half-cycles (median > 0 per ride, in ≥ 10 of the rides standing through the window); the
   twist's reaction is the largest positive P_s into Ω_alt and the fins' P_s is negative; `twistGain` moves the peak
   with |e| ≥ 0.25; `knee` does not carry it (|e| < 0.10); `fins` partly.
4. **M5.** `splitDepth = 0` removes at least half of Compress's amplitude excess over tall; `designDepth = 0` removes
   less than half.
5. **M6.** In ≥ 8 of the Compress balance falls inside the steer, the felt vertical's tilt term (−height·feltAcross)
   changes more than the body's offset across from +1.0 s to the escape; the swing's last two half-cycles before the
   escape are larger than its first two after +1.0 s.
6. **M7.** On Big, balance falls before +2.0 s: `release0` and `release0.2` like Compress (≥ 8 of 36 each),
   `release0.6` like tall (≤ 4 of 36), `release0.4` between. Their crossings are sideways in ≥ 80 % of those with a
   `beyond` sample. The rise's overshoot (EXTENSION_TALL) is under way at +1.0 s only for x ≥ 0.4.

### 0.6 Controls (before any finding counts)

1. **The probe inert.** The probe (`wobble-probe.ts`, a copy of 3.6b's `turn-probe.ts` with the added drives, rows and
   read-only wrappers) run on the benchmark's full Canyon matrix and the test-wave rides with every knob at identity and
   both ledgers on (the yaw ledger closed) must give the benchmark's `f`, `stand`, `summary` and `tw` rows identical to
   the full baseline's raw runs (`runs/full-f2.tar.gz`), by 3.6b's `inert.py`.
2. **Knobs off.** With every `WOBBLE` field at identity and `yawLedgerClosed` false: the quick report 26 of 26 and the
   full report 227 of 227 ride lines identical to `baseline-quick.json` and `baseline-full.json` (the quick run after
   each `src` change, the full run before the report); the Canyon byte check identical (snapshots `a367d938f15fa934`,
   state `9e5831f80e38abd9`); `npx tsc -b` clean; the gain lock 5 of 5 (`npx vitest run src/physics/stabilityGains`);
   the touched files' tests (`rollLedger`, `railSection`, `predictiveBalance`, `AttachedRider` by path filter).
3. **The knob is what it says.** Each knob's own quantity read in its run's rows (the leg's stiffness, the fins' force
   ratio at the same slip, the gains' ratio in one tick, the sense's age), so a knob that did not act is caught.

### 0.7 Guards

At most 8 game processes at once (the machine has 14 cores; nothing else heavy runs on it); the stability report runs
its own 4 and nothing else beside it. Raw runs in the session scratchpad (`…/scratchpad/36c/`), and the ones the tables
need archived into `runs/` here. Later changes to §0 go in as dated amendments, written before the rows they govern are
read. If I fit anything, the held-out rows are read blind. I stop at a clean commit if the coordinator says so.

---

## 1. The riderless yaw budget closes (M1)

*Plane water: `budget.ts` (`results/budget-plane.md`), and the switch's own test (`src/physics/yawLedgerClosed.test.ts`,
5 heels × 30 steps). Canyon water: the base run's bare boards (`bare.py`, `results/budget-canyon.md`). Frame: the world's
up, N·m, + the nose toward the board's +x; mean torque over the 1/60 s step.*

| water | boards | steps | closed residual, largest \|·\| | shipped residual |
| --- | --- | --- | --- | --- |
| plane, slopes (0.20, −0.08), 6 m/s, heels −20° to +20° | 5 | 60 each | 4.8 × 10⁻¹⁴ N·m | 38.43, 51.04, 73.61, 92.16, 93.93 N·m on the first step (heels −20, −10, 0, +10, +20°); Codex's +38.43 and +93.93 |
| Canyon Big seeds 1–3, a bare board copied from the `none:straight` ride at tS 0.5 s (5.3–10.0 m/s) | 18 | 120 each | 1.9 × 10⁻¹⁴ N·m | 0.51–40.76 N·m per board (its largest step) |

- **The budget closes.** With the duplicate impulse left out (and `suction` in), a board with no rider shows no rider
  torque, on plane water and on the Canyon's own water, to 10⁻¹⁴ N·m. The shipped residual is recovered exactly from the
  closed one (`rider − duplicate + suction`, the switch's test), and the board's state is bit for bit the same with the
  ledger off, shipped and closed (the test; and control 1 below: the probe's benchmark rows equal the baseline's).
- **On ridden frames the duplicate was small** (`dup.py`, `results/dup-ridden.md`, the base run's Big standing frames):
  0.4–0.5 N·m median (2 N·m RMS) against a rider term of 4.5 N·m median (17–40 N·m RMS). So 3.6b's ledger columns were
  about a tenth off on the Canyon, not grossly; they are now exact. The closed entries sum to the board's own I·ΔΩ to the
  rows' rounding (0.003 N·m).
- Every yaw number below is the closed ledger's, about the world's up (+ toward the board's +x), mean over the step.

## 3. Question 2: how the swing becomes the sideways tip (M6)

*Base run, Canyon Big seeds 1–3, the balance falls whose escape (the benchmark's `escapeAt`) is inside the steer
(+1.0 to +2.0 s), causes by the benchmark's rule. Frames: the capture point and its parts in the board frame (x across,
+ the +x rail), m; Ω about the world's up. From the steer's start (frame 60) to the escape's frame. `tip.py`,
`results/tip-big.md` (every fall listed).*

| drive (both sides) | balance falls, escape inside the steer | sideways at the first `beyond` frame | inside / outside the turn | Δ across | Δ body offset | Δ felt tilt term | Δ speed term | swing std over the same frames: the fall / the same wave's tall steer / the same wave's straight ride (deg/s) | half-cycle peaks grow (last two > first two) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Compress (= his way on Big) | 12 | 12 of 12 | 11 / 1 | +0.500 | +0.099 | −0.000 | +0.403 | 36.0 / 12.6 / 18.2 | 7 of 9 |
| tuck (Crouch, `deepen=on`) | 14 | 9 of 9 (5 with no sample) | 13 / 1 | +0.458 | +0.076 | +0.006 | +0.363 | 33.2 / 11.8 / 8.8 | 12 of 14 |
| Snap | 13 | 11 of 11 | 12 / 1 | +0.471 | +0.065 | +0.017 | +0.372 | 11.7 / 13.4 / 3.2 | 8 of 13 |
| tall | 2 | 2 of 2 | 2 / 0 | +0.286 | +0.110 | −0.000 | +0.177 | 19.5 / — / 9.2 | 2 of 2 |

1. **The crossing is the body's speed across the feet, not the felt vertical.** Of the capture point's 0.46–0.50 m
   move toward the edge (median, Compress and the tuck), 0.36–0.40 m is the speed term (`speedAcross / omega`, the body's
   velocity across relative to the feet), 0.08–0.10 m the body's offset across the deck, and the felt vertical's tilt
   term changes by 0.000–0.006 m. In 0 of 12 Compress falls is the felt term the largest. **My prediction 5 (the felt
   tilt carries it) was wrong.** The felt vertical does follow the pair's sideways acceleration where it could be
   measured (correlation of its across part with V·dχ/dt −0.88 to −0.94, 2 and 5 falls), but the deck rolls with it,
   so its tilt across the deck stays near zero.
2. **The speed term is the yaw swing itself.** *Described after the table was read, not pre-registered:* the speed
   term's alternating part follows −Ω_alt 3–4 frames (0.05–0.07 s) later with a median correlation of +0.97
   (Compress) and +0.99 (tuck), at 0.64 and 0.58 m/s of body speed across per rad/s of yaw rate. A yaw swing turns the
   deck under the body, the feet go sideways with it, and the body, far heavier than the board, does not follow at once.
   At the swing's last half-cycles (median peak 45 deg/s in Compress, 58 in the tuck, 0.8–1.0 rad/s) that is 0.5–0.6
   m/s across, enough with the turn's lean to carry the point past the feet's edge and the hip's reach.
3. **The swing grows into the fall.** The half-cycle peaks of Ω_alt grow from a median 17 (Compress) and 13 deg/s
   (tuck) in the steer's first half-cycle to 45 and 58 deg/s in the last two before the escape (7 of 9 and 12 of 14
   falls with four or more half-cycles), in 0.5–0.9 s. Codex's `big:s1:w9:compress:left`, frame by frame
   (`series.py`): Ω_alt peaks −49, +79, −105 deg/s at +1.12, +1.28, +1.48 s (2.8 Hz), the speed term +0.82, −0.50,
   +1.80 m/s 0.03–0.07 s after each, the margin gone at +1.517 s.
4. **It goes to the inside** (11 of 12, 13 of 14): the lean of the turn already has the point on the inside half of
   the feet, so the first half-cycle to reach the edge is an inside one.
5. **On the same wave the deep stance's straight ride already swings** (18.2 deg/s over the same frames in Compress,
   against the tall steer's 12.6): the steer grows a swing that is there before it. The tuck's straight ride swings
   less over those frames (8.8) and its steer more (33.2).
6. **Snap is different.** Its falls cross the same way (sideways, inside, the speed term), but its swing over the fall
   is no larger than the tall steer's on the same wave (11.7 against 13.4 deg/s), and its straight ride barely swings
   (3.2): Snap's falls inside the steer are not this swing's. Not pursued here.
