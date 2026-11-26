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
- **On ridden frames the duplicate was small** (`dup.py`, `results/dup-ridden.md`, the base run's Big standing frames
  to tS 3.6 s): 0.50–0.61 N·m median (1.7–2.4 N·m RMS) against a rider term of 4.4–6.7 N·m median (18–40 N·m RMS). So 3.6b's ledger columns were
  about a tenth off on the Canyon, not grossly; they are now exact. The closed entries sum to the board's own I·ΔΩ to the
  rows' rounding (0.003 N·m).
- Every yaw number below is the closed ledger's, about the world's up (+ toward the board's +x), mean over the step.

## 2. Question 1: what carries the 2.5–3 Hz swing, and why it is larger deep

*Base run (knobs off) and the knob runs, Canyon Big seeds 1–3, the straight rides standing through tS 3.0 s (12 tall,
13 tuck, 13 Compress, 13 Snap; his way is Compress frame for frame on Big, its trim released on the first standing
step). Window tS 0.5–3.0 s unless stated. Yaw about the world's up, roll about the board's long axis; works and powers
in the frames of §0.1. Tables: `results/power-straight.md` (M2, M3), `results/freq-w1.md` and `results/freq-w2.md` (M4,
M5, M8), `results/hc-falls.md`, `results/power-steer-falls.md`.*

### 2.1 Who feeds it (M2, M3)

| straight rides, Big | tall | tuck | Compress | Snap |
| --- | --- | --- | --- | --- |
| swing, yaw / roll (deg/s, median std) | 2.5 / 2.6 | 5.8 / 7.1 | 5.4 / 5.6 | 3.5 / 4.1 |
| power into the yaw swing, the twist's reaction (W; rides +) | +0.010 (12/12) | +0.064 (13/13) | +0.081 (13/13) | +0.005 (7/13) |
| … the rest of the rider's coupling (the feet's push, the lower body) | +0.002 (8/12) | +0.053 (13/13) | +0.016 (12/13) | +0.042 (13/13) |
| … the fins | −0.008 (1/12) | −0.087 (0/13) | −0.096 (0/13) | +0.006 (8/13) |
| … the hull's pressure | −0.011 (1/12) | −0.064 (0/13) | −0.033 (0/13) | −0.047 (0/13) |
| … the water's inertia (added mass) / friction | +0.005 / +0.002 | +0.032 / +0.010 | +0.022 / +0.009 | +0.004 / +0.004 |
| power into the roll swing, the rider / the hull's pressure (W) | +0.023 / −0.009 | +0.260 / −0.155 | +0.241 / −0.174 | +0.047 / −0.011 |
| the twist motor's alternating work, exact (J over 2.5 s; rides +) | +0.12 (12/12) | +0.26 (13/13) | +0.40 (13/13) | +0.14 (13/13) |
| … Codex's half-cycle estimate, alternating (J; rides +) | +0.038 (12/12) | +0.161 (11/13) | +0.193 (13/13) | +0.010 (9/13) |
| the ankle's active alternating work (J) | +0.17 | +1.10 | +0.91 | +0.20 |
| the knees' active alternating work (J) | 0.00 | +2.39 | +0.37 | +0.34 |

1. **The rider drives the swing and the water damps it.** In every deep straight ride the twist's reaction feeds the
   board's yaw swing (13 of 13 in the tuck and in Compress) and the fins and the hull's pressure take energy out of it
   (0 of 13 positive). The roll swing is fed by the rider too (12–13 of 13) and damped by the hull. So the swing is not
   the hull's own mode driven by the water (Y3 is out on this evidence); it is the rider's.
2. **The balance's own joints do the work.** The twist motor's alternating work is positive in every ride of every
   stance, 2–3 times tall's in the deep stances; the ankle's moving rest does 5–6 times tall's. The knees' alternating
   work is large only in the tuck, and the knee knob (below) shows the knees do not set the swing.
3. **In the held turn the twist pumps the yaw.** Over the steered balance falls (+1.0 s to the escape), the twist's
   reaction feeds the yaw swing in 12 of 12 Compress and 14 of 14 tuck falls (+4.5 and +2.6 W median), the fins and the
   hull take it out (−1.5 and −1.6 W in Compress) and now the feet's push takes it out too (−1.0 W). The twist motor's
   half-cycle work before the escape is +0.86 J median in the falls (23 of 23 positive) against +0.09 J on the same
   wave's straight ride and +0.19 J on the same wave's tall steer over the same frames (`hc-falls.md`).
4. **What the frames show** (`big:s3:w9:compress:straight`, `series.py`): the yaw rate swings ±10–22 deg/s at 2.9 Hz
   from before +1.0 s with no steer, and the twist's active torque leads it by 0.05–0.07 s (about 50° at 2.9 Hz), its
   peaks ±5–14 N·m with the same sign as the yaw rate that follows. A torque that leads the rate by less than 90° feeds
   it: the balance turns the upper body against the board's turn to steady the head, and the reaction turns the board
   further the same way.

### 2.2 What sets its frequency (M4)

The swing's peak is stance-dependent with the knobs off: 2.31 Hz tall [2.28, 2.42], 2.67 Compress [2.66, 2.69], 2.90
the tuck [2.85, 2.95], 1.93 Snap (window 1, pooled, 90 % bootstrap). The leg's axial mode is the same in every stance,
so it could not give that order even before the knob.

| knob (×0.7 / ×1.3; `senseShift` −2 / +2 ticks) | stance | peak Hz: low / off / high | e | swing amplitude, paired ratio to off: low / high (rides down / up) | verdict (§0.3 M4) |
| --- | --- | --- | --- | --- | --- |
| `knee` (the leg's axial mode) | tall / tuck / Compress | 2.30 / 2.31 / 2.31; 2.88 / 2.90 / 2.87; 2.67 / 2.67 / 2.67 | +0.01 / −0.01 / +0.00 | 1.04 / 0.96; 0.98 / 0.90; 1.03 / 1.03 | does not carry |
| `twistGain` (the twist row of the balance's gains) | tall / tuck / Compress | 2.19 / 2.31 / 2.41; 2.79 / 2.90 / 2.95; 2.52 / 2.67 / 2.80 | +0.15 / +0.09 / +0.18 | 1.19 / 0.91; 0.85 / 1.04; 0.98 / 1.04 | partly (tall, Compress); does not carry (tuck, by the ±0.15 Hz rule) |
| `ankleGain` (the ankle row) | tall / tuck / Compress | 2.31 / 2.31 / 2.33; 2.87 / 2.90 / 2.91; 2.64 / 2.67 / 2.71 | +0.01 / +0.02 / +0.04 | 0.74 (11 of 12 down) / 1.52; 0.80 (11 of 13) / 1.13; **0.70 (13 of 13) / 1.42 (8 of 8 up)** | does not carry the frequency; sets the size |
| `senseShift` (the senses reach the balance 4 / 6 / 8 ticks late; its design still assumes 6) | tall / tuck / Compress | **4.26 / 2.31 / 1.93; 3.73 / 2.90 / 2.33; 3.72 / 2.67 / 2.05** | **−1.15 / −0.68 / −0.86** | 2.33 / 10.49; 1.27 / 2.78; 1.11 / 5.73 (+2: 8 of 8 up) | **carries** (every stance; every ride's zero-crossing frequency moves the same way: 10–12 of 10–12 up at −2, 8–11 of 8–12 down at +2) |
<!-- M4 fins -->

Rides standing through the window, of 12–13 a cell, except `ankleGain` ×1.3 (8 a cell: the firmer ankle throws more
riders before +3.0 s). Intervals and every cell (Snap, his way) in `results/freq-w1.md`; window 2 (tS 0.5–4.5 s) in
`results/freq-w2.md`.

1. **The leg's own bounce is not it.** ±30 % on the knees' stiffness moves the leg's axial mode by −16 % / +14 %
   (2.2 / 3.0 Hz) and the swing's peak by at most 0.03 Hz in any stance (e within ±0.03), its size by 0–10 %. Y2 is out;
   the coordinator's lead 9 (2.46 Hz damped) is a coincidence of numbers.
2. **The twist loop sets its pace.** The twist row's gain moves the peak the same way in every stance, 0.10–0.16 Hz for
   ±30 % (e +0.15 to +0.18 in tall and Compress, 2.52 and 2.80 Hz against 2.67 with both intervals clear of it), and
   barely its size. Below the pre-registered 0.25, so by the rule it is *partly*: the twist's feedback is one of the
   stiffnesses of the mode, not all of it.
3. **The loop's delay sets its frequency.** Two ticks less delay than the design assumes moves the swing from 2.67 to
   3.72 Hz in Compress (2.31 to 4.26 tall, 2.90 to 3.73 in the tuck); two ticks more moves it to 2.05 Hz (1.93, 2.33)
   and makes it 3–10 times as large. The elasticity is −0.7 to −1.2: the swing's period follows the senses' age about in
   proportion (2.67 Hz is a period of 3.7 sensing delays). **This is the carrier**: the 2.5–3 Hz swing is the balance
   loop's own delay-set oscillation, ringing on the real board, not a mode of the leg or of the hull that the loop
   happens to excite. Codex's nominal test (§0, brief item 7) decays on the controller's own model, where the predictor
   cancels the delay exactly; on the board the game actually rides, the same loop leaves this mode lightly damped, and
   any extra delay drives it up.
4. **The ankle loop sets its size.** The ankle row's gain does not move the peak (e +0.01 to +0.04) but scales the
   swing nearly in proportion: ×0.7 takes it to 0.70 of itself in Compress on 13 of 13 rides (0.80 in the tuck, 0.74
   tall), ×1.3 to 1.42 on 8 of 8 (and throws 5 more of 13 before +3.0 s). The ankle's active work is also the largest
   joint work into the swing (§2.1). So the roll loop is what feeds the swing most; the twist loop fixes where in
   frequency it rings.

### 2.3 Why it is larger deep (M8, M5)

**Matched waves (M8).** On the 12 Big waves where tall, Compress and the tuck all stand through the window (same wave,
start and inputs), the swing is 3.21 times tall's in Compress (larger on 10 of 12 waves) and 1.91 times in the tuck
(10 of 12); window 2 (to 4.5 s, 11 waves) 3.40 (11 of 11) and 2.28 (9 of 11). Its zero-crossing frequency: 2.40 Hz
tall, 2.60 Compress, 3.10 the tuck.

**The depth swaps (M5)**, each read on the deep ride against the same wave's tall ride (knobs off):

| swap (the deep body otherwise as it is) | Compress: rides standing / amplitude, paired ratio to off (rides down) / share of the excess over tall removed, median (waves ≥ 0.5) | tuck: the same |
| --- | --- | --- |
| `splitDepth = 0`: the yaw inertia's split read at tall's (board-rigid 1.37, upper 1.44 kg·m², against Compress's 1.24 / 1.96 and the tuck's 0.86 / 2.44) | 13 / 0.70 (12 of 13) / **+0.48** (3 of 10) | 13 / 0.60 (13 of 13) / **+0.69** (8 of 10) |
| `designDepth = 0`: the balance's design (model, gains, filter, reference) scheduled at depth 0 | 3 of 13 stand through 3.0 s; the survivors swing 8 times as much | 0 of 13 stand |
<!-- both0 -->

1. **The yaw inertia's split is about half of it.** Turning the deep body's yaw inertia back to tall's split (more of
   it carried rigid with the board, less on the upper body the twist turns) takes the swing down to 0.70 of itself in
   Compress on 12 of 13 rides and to 0.60 in the tuck on 13 of 13, and removes a median 48 % (Compress) and 69 % (tuck)
   of the excess over tall on the matched waves. By the pre-registered rule (at least half) it explains the tuck's
   excess and narrowly not Compress's; **my prediction 4 (≥ half in Compress) missed by 2 points**. The mechanism is the
   one M2 measures: deep, the board and lower body that take the twist's reaction are lighter (1.80 and 1.42 kg·m²
   against 1.93, the board's own 0.56 with its water included) and the upper body the twist turns is heavier (1.96 and
   2.44 against 1.44, before the arms' 0.87 × `human.arms`), so the same twist torque yaws the board more.
2. **The deep design is not the cause; it is what keeps the deep body up at all.** Scheduled at tall's depth, the
   balance cannot hold the deep body: 10 of 13 Compress and 13 of 13 tuck straight rides fall before +3.0 s. So the
   design's depth schedule is right in direction, and the swap cannot measure a share.
<!-- M5 rest -->

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

## 4. Question 3: a turn started just after letting go of Compress (M7)

*Base run: his way (Compress from 0.2 s, the trim from the stand released at vW ≥ 4.4 m/s) with Compress let go x s
before the steer (±1 from +1.0 s for 1.0 s), against Compress held through the turn (`hisway:<side>`) and the tall
turn (`none:<side>`) on the same waves, both sides. Causes by the benchmark's rule. Depths are the leg's rest below the
riding stance, m. `release.py`, `results/release.md` (every sea); M6's split for the release falls in `results/tip-big.md`.*

| Canyon Big, 36 rides each | tall | Compress held | let go at the steer (x = 0) | x = 0.2 s | x = 0.4 s | x = 0.6 s |
| --- | --- | --- | --- | --- | --- | --- |
| balance falls before +2.0 s | 1 | 12 | **15** | 6 | 3 | 3 |
| … of them also a fall of Compress held on the same wave and side | — | — | 12 (+3 new) | 6 | 3 | 3 |
| balance falls in +2.0–3.5 s | 10 | 3 | 2 | 8 | 8 | 12 |
| wave falls before +2.0 s | 10 | 8 | 10 | 10 | 10 | 10 |
| sideways at the first `beyond` frame / inside the turn | 2 of 2 / 2 of 2 | 12 of 12 / 11 of 12 | 7 of 7 / 9 of 10 | 6 of 6 / 7 of 8 | 3 of 4 / 5 of 5 | 2 of 2 / 4 of 4 |
| the leg's depth at +1.0 s (median) | 0.000 | 0.298 | 0.296 | 0.173 | 0.031 | −0.006 (over) |
| the room's depth (`heldDepth`) at +1.0 s | 0 | 0.300 | 0 | 0 | 0 | 0 |
| the knees' travel: as the room reads it / at the leg's depth | 0.30 / 0.30 | 0.05 / 0.05 | 0.30 / 0.05 | 0.30 / 0.17 | 0.30 / 0.28 | 0.30 / 0.30 |
| the rest's rise rate at +1.0 s / fastest in +1.0–1.5 s (m/s) | 0 / 0 | −0.02 / 0.00 | +0.22 / +0.62 | +0.59 / +0.59 | +0.26 / +0.28 | 0.00 / +0.03 |
| fall time against Compress held, paired (median; later / sooner / same) | | | −0.14 s (7 / 27 / 2) | −0.04 s (13 / 20 / 3) | +0.08 s (20 / 14 / 2) | +0.17 s (22 / 13 / 1) |
| the swing over the steer (median std, deg/s) | 10.6 | 19.2 | 14.2 | 13.2 | 12.0 | 10.9 |

1. **How often.** Let go as the turn starts, the turn falls *more* often than holding Compress: 15 of 36 balance falls
   inside the steer, every one of Compress's 12 among them, and sooner on 27 of 36 waves (median 0.14 s). Let go 0.2 s
   before, it falls on half of Compress's waves (6); 0.4–0.6 s before, on 3, against tall's 1. On Medium no drive falls
   much inside the steer (held 0, x = 0 1, x = 0.2 2, tall 0 of 26); on the test wave's two starts the deep falls are
   `tw-ride`'s placed rail change (held 2, x = 0 2 of 2, the rest 0). **My prediction 6 held for x = 0 and x = 0.6
   and missed x = 0.2** (6, not ≥ 8).
2. **By the same crossing.** The release falls cross sideways (18 of 19 with a `beyond` sample) and to the inside (25 of
   27), with the speed term carrying the capture point as in Compress (`tip-big.md`: Δ speed +0.29 of +0.37 m for
   x = 0; the speed term follows −Ω_alt at +0.99 correlation). Nothing in them is a new kind of fall.
3. **Why: the leg is still deep when the turn starts, and the balance's design follows the leg.** The legs rise no
   faster than the stance's spring can catch (`projectionCatch`, 0.59 m/s for the new rider's 20 kN/m), so the leg is
   still 0.30 m down at a release-at-the-steer turn's start and 0.17 m down 0.2 s after letting go. The controller's
   design and the yaw split are scheduled on the leg (`yawDepth`, fact 3: checked, `yd` = −`leg.rest` on every frame),
   so for the turn's first 0.2–0.5 s the rider balances as Compress does, and falls with its swing. By 0.4 s the leg is
   up (0.03 m) and the turn behaves nearly as tall.
4. **Not the room read tall, not the overshoot.** The room reads tall in every release drive (`heldDepth` 0, the
   knees' travel 0.30 m), including x = 0.4 and 0.6, which fall nearly as tall does; and the rise's overshoot over the
   riding stance (`EXTENSION_TALL`) is under way only at x = 0.6 (+0.02 m at its highest), where 3 of 36 fall. So
   neither explains the release's falls. **Prediction 2's item (the design depth still above 0.15 m at +1.0 s while
   `heldDepth` is 0) holds** for x = 0 (0.30) and x = 0.2 (0.17).
5. **A finding in the rise itself (not pre-registered as a test).** The catch limit applies only while `fromCompress`
   holds, and `fromCompress` is cleared whenever the posture's target is below the riding stance, which includes any
   trace of the balance's own knee drop (`asked = min(asked, −(heldDepth + knees × travel))`; `human.knees` decays
   exponentially and is rarely exactly 0 once it has fired). With the room now reading tall (0.30 m of travel), the
   knees' first 10⁻⁴ of drop at the steer's start clears it, and the leg then rises at up to `MAX_LEG_SPEED`
   (`big:s1:w5:release0:right`: 0.47, 0.84, 1.20, 1.23 m/s at +1.03 to +1.13 s, against the catch's 0.59). It happens in
   14 of 36 x = 0 turns on Big (7 of them fall, against 8 of the 22 that keep the catch) and 6 of 36 at x = 0.2: too few
   to call it a cause here, but the projection's catch is not what the code's note says it is once the balance has
   bent the knees at all. For Vicente as a finding; no bound is changed.

## 5. Controls

| control | result |
| --- | --- |
| The probe inert (§0.6 item 1): the base run's files, filtered to the benchmark's scripts and rows, against the full baseline's raw runs (`runs/full-f2.tar.gz`), both ledgers on and the yaw ledger closed, the `finish` wrapper and the bare boards running | 33 of 33 files identical in every `stand`, `f`, `tw` and `summary` row (`inert.py`); the benchmark's report re-read on them (`--reuse`): exit 0, 227 of 227 ride lines identical to `baseline-full.json` (`same.py`) |
| Knobs off, quick (§0.6 item 2), after the `src` changes (`f5b8ff8e`), 23:42 UTC, 10.5 min | exit 0, 0 regressions, 0 improvements; 26 of 26 ride lines identical to `baseline-quick.json` |
| Knobs off, full, before the report (`1d16497c`'s `src`, the same as `f5b8ff8e`'s), 00:46–01:31 UTC, 44.4 min with 4 at once beside the knob runs | exit 0, 0 regressions, 0 improvements; 227 of 227 ride lines identical to `baseline-full.json`, and its 26 test-wave rides identical to `baseline-quick.json`'s 26 |
| The Canyon byte check, knobs at identity, `yawLedgerClosed` false (`f5b8ff8e`'s `src`) | snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`: identical (`results/byte-check.txt`) |
| `npx tsc -b` | clean |
| The gain lock, `npx vitest run src/physics/stabilityGains` | 5 of 5 |
| The touched files' tests | `yawLedgerClosed` (new, 2), `rollLedger`, `railSection`, `stabilityGains`: 27 passed; `predictiveBalance`, `AttachedRider.test`, `AttachedRider.deepCrouch`, `plantSpeed`: 181 passed and 8 expected failures (`it.fails`, as at `340fc560`), 0 failing |
| Each knob is what it says (§0.6 item 3; `knobcheck.ts`, `results/knobcheck.txt`; the rows) | the gain rows' feedback ×1.3 / ×0.7 exactly, the other row untouched; the senses reach the filter 4 / 6 / 8 ticks late at −2 / 0 / +2; the fins' force and damping ×1.3 / ×0.7 at the same slip; the knees' stiffness 14 / 20 / 26 kN/m in the rows (`lk`); the design and split depths by code |
| The facts of §0.2 | 1: M1. 2: by the code (`coupleYaw`, `finish`). 3: `yd` = max(0, −`leg.rest`) on all 89,308 Big standing frames, and `heldDepth` 0 the frame Compress is let go. 4: the felt vertical's across part follows V·dχ/dt (−0.88 to −0.94) where measurable, but its tilt across the deck barely changes (§3) |

## 7. Where everything is, and how to recompute it

- **The raw runs** (the session scratchpad, about 0.7 GB):
  `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36c/`:
  `base/` (knobs off: the benchmark's full matrix, the straight rides, his way's turns, the release drives, the bare
  boards), `knobs/<setting>/` (13 settings × Big seeds 1–3), `rep/q-off`, `rep/f-off` (the stability reports), the logs
  beside them, `bin/wobble-probe-d16b1f62.mjs` (the probe bundle every run used, sha1 `22a9716e…`).
- **Archived here** (`runs/`): `base.tar.gz` (the base run, `slim.py`: every row but the `w` rows cut to the readers'
  fields and the `w`/`o` rows to tS ≤ 3.6 s) and `knobs.tar.gz` (the knob runs, `slim.py --freq`: their `f` rows cut to
  what `freq.py` reads). Every table in `results/` recomputes from them: unpack beside this folder and pass the
  directories to the readers.
- **The probe:** `wobble-probe.ts` (bundle with `rolldown … --format esm --platform node`), driven by
  `run.py --set base|knobs`; the checks `budget.ts` (M1, plane water) and `knobcheck.ts` (control 3).
- **The readers** (`python3 -I`): `bare.py` and `dup.py` (M1), `power.py` (M2, M3; `--steer` for the falls),
  `hc.py` (M3 against the matched controls), `freq.py` (M4, M5, M8; `--window 2`), `tip.py` (M6), `release.py` (M7),
  `series.py` (one ride frame by frame), `inert.py` and `same.py` (the controls), all on `wob.py`.
- **The results:** `results/*.md`, `results/knobcheck.txt`, `results/byte-check.txt`.
