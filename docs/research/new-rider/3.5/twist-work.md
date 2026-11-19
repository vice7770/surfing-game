# Step 3.5i — the automatic twist: it DOES add work, the reviewers' ≈ +10 J reproduces to 0.01 J, and the pump is not a gain, not the motor lag and not an instability. It is the actuator's reaction mass.

**The owner's complaint, in his own words.** He rode `claude/ride-everything` with
`?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on` and reported, in **tall,
crouch and Compress alike**: *"the board starts going left and right and the surfer cannot stabilize it and falls.
Like a skate board going down the lane"*, and *"weaving start starts on its own, no turn needed."*

⚠️ **His ride is a feel report and not a zero-input measurement.** Every number in this file is from the saved `cue`
trace of step 3.5h — zero steer and zero asked lean, and **zero twist asked on all 684 recorded control ticks,
measured at `0.0000°`**. His ride and the trace are kept apart throughout.

**The question this round was handed, both halves:**

> Audit why the automatic twist keeps ADDING work through the pre-ankle interval — **while retaining useful free
> torso rotation on deliberate turns.**

---

## 0. The answers, in the order they were asked

| the question | the answer |
| --- | --- |
| **Does the automatic twist add work through `+1.000 → +1.533 s` on wave 1?** | ⭐⭐ **Yes, and the reviewers' number reproduces.** Independently, on my own instrument: **raw +9.377 J, 29 of 32 intervals positive; lagged +10.126 / +10.020 / +9.914 J** at the interval's beginning / mean / end, **32 of 32 positive.** On the wider `+0.900 → +1.533` window **+10.493 / +10.370 / +10.247 J** against the reviewer's **+10.49 / +10.36 / +10.25** — **three sampling variants, agreement to 0.01 J.** Wave 6 over the same window: **raw −0.086 J, lagged +0.043 J** against its ≈ +0.007. |
| ⭐⭐ **What is the phase relationship?** | ⭐⭐ **There is no cycle to be in phase with — and that is the finding.** Over `+0.900 → +1.533` on wave 1 the joint's relative rate is **positive on 38 of 38 intervals**, rising 23.3 → 124.0 °/s with the angle going 4.68° → 46.07° **monotonically**. It is **not a pump in phase with an oscillation; it is a one-way wind-up with the command sitting on the winding side of it for 35 of 38 intervals.** Wave 6's joint *does* oscillate (its rate reverses twice, 20 of 38 positive) about 1.1–5.3°, and there the same actuator nets ≈ 0. |
| ⛔ **Is it the `MOTOR_LAG` filter?** | ⛔ **No. Confirmed refuted, on my instrument too.** The raw command's work is **already +9.377 J before any filtering**, and on wave 6 the raw work is **negative** (−0.084 J) while the filter lifts it only to +0.008. The lag **prolongs** the winding and matters at the final reversal; it does not create the pump. *(This was the coordinator's own lead and its own countercheck; the figures above are a second reproduction of both.)* |
| ⛔ **Is it an unstable gain — a negative spring on the joint?** | ⛔ **No, and this retired my own first headline.** `k[1][θ_t]` is **positive at all 17 schedule knots** (+57.19 at 4.0 m/s down to +16.02 at 12.0), which is the sign that pushes the joint **further out**, and it exceeds the passive `TWIST_STIFFNESS` of 20 N·m/rad from 4.0 to 7.5 m/s. **But the designed loop is stable at every knot** (spectral radius **0.961–0.985**) and **released from a pure 10° torso twist it RESTORES the joint and takes energy OUT of it: −0.216 to −0.258 J, 0–18 of 120 intervals positive, at every knot.** The positive entry is a short overshoot (1.6–1.9° further out in 0.27–0.38 s) inside a converging loop, **not a divergence**, and it must not be called one. |
| ⭐⭐⭐ **Then why does the same law pump the joint on the ride?** | ⭐⭐⭐ **Because the twist torque is the balance's BOARD-level actuator, and the torso is its reaction mass.** The command's torque reaches the board through the planted feet, and the design's own matrices say that is most of what it is for: per N·m per frame it moves the **board's** yaw rate **0.00118 rad/s** against the upper body's own **0.00170** — **69 %** — and the gain row's largest entries are on the **bank (−388.9)** and the **slip (−408.5)**, not on the joint. **Released with no water at all from the upper body's own yaw rate at 1 rad/s, the designed loop winds the torso to 37.6° and puts +2.886 J INTO the joint** at 5.0 m/s; from the board's yaw rate at 0.2 rad/s, **+0.109 J**; from the bank at 0.05 rad, **+0.063 J**; from the roll rate, **+0.031 J**. **Every joule the law pushes into the board this way passes through the torso joint.** |
| ⭐⭐ **Why positive on wave 1 and negative on wave 6, with zero twist asked on both?** | ⭐⭐ **An interaction of the operating point with the state, measured two ways and neither alone.** (1) **The design alone:** the pumping release flips sign with speed — the upper-rate release does **+1.080 J at 4.5 m/s, +2.886 J at 5.0, −0.173 J at 8.5.** (2) **The saved ride, gain row frozen one speed at a time, everything else held:** wave 1's own work goes **+16.387 J at the table's slowest knot (4.0 m/s), +7.481 at 4.5, +2.910 at 5.0, −22.115 at 5.5, and −0.67 to −1.62 at 8.5–10.0** — and **wave 6's own state and motion flip from −0.086 J to +0.858 J when handed the slow-knot gain row.** **Wave 1's median scheduling speed in the window is 4.718 m/s; waves 2 and 11 run at 8.24 and 8.41; wave 6 at 5.74.** |
| **Does a deliberate turn still get free torso rotation?** | ⛔⛔ **NO — and the first two versions of this answer were both wrong.** The torso is **not free in a turn; it is actively pushed.** In ordinary play **nobody asks for twist** (`rotate` is undefined at `Controls.ts:147`, NaN at `RideSession.ts:449`, and `twistStep` asks zero absent Snap), and an ordinary steer asks for **bank**. But the bank and the twist **share one active torque channel**: the command is `raw[1] = ref.u[1] − b1 − Σ k[1][j](x̂[j] − ref.x[j])`, and a bank ask puts a **non-zero reference STATE** in it, so the gain row issues real twist torque with the twist ask at zero. ⭐ **Measured: a 1.3369° bank ask gives ±4.588 N·m at 6.7 m/s / rail 0.192° — 3.432 N·m per degree — reproducing the reviewer's independent figure to the digit; and 7.977 N·m per degree at 5.0 m/s / rail 0.** ⭐⭐ **And `ref.x[θ_t]` is 0.000° at EVERY bank ask: the design asks the torso to stay square to the board through the whole turn while pushing it with up to 354 N·m.** So the torso is reaction mass in **both** regimes, and **anything that quiets the neutral pump through this channel will also change the turn.** |
| ⛔ **Is there a weight that removes the pump?** | ⛔ **Not among the ones the mechanism points at — I tried and they failed.** Tightening the torso's own cost (`stateScale[6]` 0.5 → 0.15) leaves the pumping release at **+2.170 J** (−25 %) and makes `k[1][θ_t]` **larger** (42.4 → 51.9). Tightening the upper body's rate cost (`stateScale[7]` 1 → 0.2, the loosest weight in the whole cost) leaves it at **+2.584 J** (−10 %) and also raises `k[1][θ_t]` (→ 52.8). **The pump is not in the cost.** If the owner wants the wind-up gone, the change is in the plant or in the actuator's authority — **and that is his ruling, not mine.** |

---

## 1. What this file may and may not be read as

⛔ **Everything here is a decomposition of ONE controller output on SAVED motion, and a read of the design's own
matrices.** It is not a set of independent energy sources and it is not a closed-loop ride. A changed command
changes the next sense, and **no arm here closes that loop** — so nothing below predicts what a different rider would
do or how a ride would feel.

⛔ **The axis.** The joint measured is the **upper body's yaw relative to the board, about the board's own up axis**.
It is **not** the board's roll axis, so **these joules must not be added to step 3.5h's roll partition** — a
different axis and a different ledger. And **nothing is attributed to the shipped yaw ledger's `rider` residual**,
which books `y.addedMass += waterTy` [R, `BoardBody.ts:1483`] and whose own source says that is why it cannot close
[R, `:1496–1503`].

⛔ **What initiates the disturbance is open and stays open.** This file says what the actuator does once the board is
being disturbed. It says nothing about what displaced the board first.

⛔ **"Free torso rotation on a deliberate turn" turns out not to exist in the reference** (§5.1), so the brief's
second half is answered against itself rather than satisfied. ⛔ **And the twist channel's BENEFIT in a real turn is
unmeasured** — the applied twist torque was never recorded on the steered arms.

⛔ **And the weave is not the fall.** Wave 1 weaves 24.30° and **survives** its 3 s window; wave 6 settles to 1.32°
and **falls at +2.300 s**. They are separate faults and this file is about the first.

⚠️ **The soft stop is not the trigger, and that was measured elsewhere, not here.** `TWIST_BODY_RANGE` is 0.87 rad
(49.85°) and the first sample past it is at **+1.683 s**, roughly 0.14 s *after* the +1.533 s ankle reversal. It is
registered in §5 as a plant mismatch, not as a cause.

---

## 2. The instrument, and why nothing under `src/` moved

`git diff claude/the-record -- src/` is **empty**. Three files are added under `docs/research/new-rider/3.5/` and
nothing else:

| file | what it is |
| --- | --- |
| `twist-work.ts` | the probe. Calls **the shipped `PredictiveController.tick`** on the saved arguments — not a rewrite of it — and reads the public `predicted`, `reference` and `bias` it leaves behind, plus the design through its own `blend`. |
| `results/35i/35i-twist-work.txt` | its whole output, every table in this file. |
| `results/35i/35i-cue-ticks.jsonl.gz` | step 3.5h's saved `cue` control-tick record, carried here so the run reproduces without it. |

### 2.1 ⭐ The positive control, and the round is void without it

| `cue` wave | ticks | plant states | **max \|replay − recorded\|** on `u0`, `u1`, `raw0`, `raw1` | `raw1` clipped on |
| --- | --- | --- | --- | --- |
| 1 | 182 | 10 | **0.0e+0** | **0 ticks** |
| 2 | 182 | 10 | **0.0e+0** | **0 ticks** |
| 6 | 139 | 10 | **0.0e+0** | **0 ticks** |
| 11 | 181 | 10 | **0.0e+0** | **0 ticks** |

**All four waves exact.** The weights are read off a **live** rider built on the owner's own address through the
game's own switch parsing, never retyped:
`{"stateScale":[0.05,0.5,0.05,0.25,0.2,0.02,0.5,1],"commandScale":[0.09,30],"rho":10,…,"riderBody":"two"}`,
`turn: 'tan'`. **And `raw1` is never clipped on any tick of any wave** — the reviewer's "no torque clipping" is
confirmed, so no table below is a saturation artefact.

### 2.2 Signs, units, frames and the AXIS, stated once and then anchored by measurement

* **`tb.angle`, rad**, is the physical relative twist in the game's own sign. `sense[3] = −tb.angle` and
  `sense[4] = −tb.rate` [R, `AttachedRider.ts:3706–3707`].
* **`u[1]`, N·m**, is the twist command in `predictiveBalance.ts`'s signs. `heldTwist = −u[1]`
  [R, `AttachedRider.ts:3728`] is the torque the feet put on the **board**; `tb.active` chases it through
  `MOTOR_LAG` [R, `:3742`]; `tb.spring = tb.active + TWIST_STIFFNESS·tb.angle (+ stop)` [R, `:4618`] enters the
  board's `kick` with a **plus** [R, `:4621`] and the upper body's update as `−h·spring` [R, `:5004`]. So **the
  moment on the upper body is `−tb.spring`, its active part is `−tb.active`, and that chases `+u[1]`** — the command,
  read as a moment on the upper body, is **`+u1` in `tb.angle`'s own sign**.
* **The actuator's generalised work**, J: `+M` on the upper body and `−M` on the board through the planted feet
  (*"a limb's force with its reaction"* [R, `:553`]), so the work is `M·(ω_upper − ω_board) = M·ω_rel`, i.e.

      W = Σ u1 · Δ(tb.angle)        [J, about the board's up axis]

  ⭐ **This is the reviewers' own recipe** (`−Δsense[3]`, sign checked against `−sense[4]`), which is why the numbers
  are comparable rather than a second convention.
* **The lag** is exact at the frame rate: `tb.active` filters per **substep** in `src/`, but `heldTwist` is held
  constant across a frame, so 16 substeps compose to one frame step of `1 − e^(−CONTROL_STEP/MOTOR_LAG)` =
  **0.283469**.
* **`speed`** is the **through-water along-heading** speed on the rider's 3-D heading [R, `:3714`], **not** an
  over-ground magnitude. **`depth`** is `yawDepth`, m. Degrees appear in `*Deg` columns, converted exactly once.
* ⭐ **The clock, named once, because there are now several in play.** Every window in this file is **seconds after
  the STAND**, read off the `cue` record's own `stand` field. **There is no steer release in it** — the script never
  steers, so the *steer-release* clock (first zero-stick frame, +1.2167 s on the saved seed-2 wave-2 arms) and the
  Logbook's *fast-nose end* (+1.633 / +1.617 s there) are **different clocks and no figure here uses either**. Any
  comparison against a steered arm must say which.
* ⚠️ **The record's `stand` is written rounded**, so a literal window edge misses its own tick by ~3 × 10⁻⁶ s. Every
  edge here **snaps to the nearest tick** (half a control step). Without that the `+1.533` edge drops the spike tick
  and the window reads 31 intervals and +9.83 J instead of 32 and +10.02 — **this is how the first run of this file
  was wrong, and it is recorded rather than quietly fixed.**

### 2.3 ⭐ The index and sign anchor, measured rather than taken from a comment

`predictiveBalance.ts` states its state order in a docstring [R, `:18`]; a decomposition that trusted a comment
would be worthless. The design's own `c` and `gamma`, at 5.0 m/s, depth 0, rail 0:

| row | what it reads | reads |
| --- | --- | --- |
| `c[3]` | `sense[3] = −tb.angle` | **state 6, coefficient +1** → **state 6 is `−tb.angle`** |
| `c[2]` | `sense[2] = −upper` | state 7, +1 → state 7 is the upper body's absolute yaw rate, negated |
| `c[4]` | `sense[4] = −tb.rate` | **state 7 minus state 4** → state 4 is the board's yaw rate, negated |
| `gamma[·][1]` | the twist command's column | **+0.28347 into state 9** — exactly the frame's lag factor, so **state 9 is the lagged twist torque and `u1` is its target** |
| `gamma[6][1]`, `gamma[7][1]`, `gamma[4][1]` | the command's one-frame authority | **−0.00002** (its own angle, rad), **−0.00170** (upper rate, rad/s), **+0.00118** (board yaw rate, rad/s) |

⭐ **The last row is the mechanism in the plant's own numbers:** the twist torque moves the **board's** yaw rate
**69 %** as much as it moves the upper body's own yaw rate — the two are comparable because both are rad/s. It is a
**dual-purpose actuator**, and `twistRows` books exactly that split: the legs' torque on the board as
`+stiffness·θ_t + damping·θ̇_t + τ` and the upper body's row as the same over `−inertia` [R,
`rollModel.ts:842–850`] — the game's `tb.spring` with the upper body taking `−spring`, with the model's whole yaw
axis negated against the engine's.

---

## 3. Part 1 — the work, reproduced, and the phase

### 3.1 ⭐⭐ The actuator's work on the joint. Joules, about the board's up axis.

**`+1.000 → +1.533 s` after the stand (32 intervals, the reviewer's own window):**

| `cue` wave | twist, deg | **raw J** | **+raw** | lag@beg | **lag@mean** | lag@end | **+lag** | rate signs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1** (weaves 24.3°) | **7.65 → 46.07** | ⭐ **+9.377** | **29/32** | +10.126 | ⭐ **+10.020** | +9.914 | ⭐ **32/32** | ⭐ **32+ 0−** |
| 2 (settles to 0.63°) | −9.67 → −7.12 | −0.093 | 15/32 | −0.034 | −0.043 | −0.051 | 15/32 | 17+ 15− |
| 6 (settles, falls) | 2.87 → 2.14 | −0.084 | 17/32 | +0.023 | **+0.008** | −0.007 | 18/32 | 14+ 18− |
| 11 (settles to 0.26°) | 0.50 → 1.67 | +0.005 | 20/32 | +0.010 | +0.009 | +0.009 | 22/32 | 28+ 4− |

**`+0.900 → +1.533 s` (38 intervals, the reviewer's wider window):**

| `cue` wave | twist, deg | raw J | +raw | **lag@beg** | **lag@mean** | **lag@end** | +lag | rate signs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1** | **4.68 → 46.07** | **+9.626** | 35/38 | ⭐ **+10.493** | ⭐ **+10.370** | ⭐ **+10.247** | ⭐ **38/38** | ⭐ **38+ 0−** |
| 2 | −8.88 → −7.12 | −0.064 | 21/38 | +0.006 | −0.004 | −0.014 | 21/38 | 17+ 21− |
| 6 | 1.10 → 2.14 | −0.086 | 20/38 | +0.064 | +0.043 | +0.021 | 23/38 | 20+ 18− |
| 11 | 0.30 → 1.67 | +0.008 | 26/38 | +0.010 | +0.010 | +0.010 | 26/38 | 34+ 4− |

> ⭐⭐ **The reviewers' ≈ +10 J reproduces.** Their three sampling variants on the wider window were **+10.49 /
> +10.36 / +10.25 J**; mine are **+10.493 / +10.370 / +10.247** — **agreement to 0.01 J by an independent route**,
> and the raw figure **+9.377 J with 29 of 32 positive** matches the coordinator's countercheck exactly. The
> reversal tick is reproduced to the digit as well: at **+1.5333 s** the command is **−45.846 N·m** while the lagged
> torque entering that interval is **+17.534 N·m** — the reviewer's −45.85 against +17.53.
>
> ⛔ **The lag is not the pump, confirmed twice over.** The raw command's work is already +9.377 J, and **on wave 6
> the raw work is NEGATIVE (−0.084 J) while the filter lifts it to +0.008** — so on the calm wave the requested work
> damps and the filter barely moves it. **Whatever distinguishes wave 1 is in the commanded work.**

### 3.2 ⭐⭐ The phase: there is no cycle. It is a one-way wind-up.

**Wave 1's relative twist rate is positive on 38 of 38 intervals of the wider window** — 23.27 °/s at +0.900,
rising through 82.29 at +1.233 and 124.02 at +1.400, still +38.90 at the +1.533 spike — while the angle climbs
4.68° → 46.07° with **no reversal anywhere**. The command's *magnitude* ripples over the window (+3.8 → +26.4 → +7.2
→ +36.0 → +4.0 → −7.5 → +29.2 → −45.8 N·m), but it sits on the **winding** side for 35 of 38 intervals.

> ⭐⭐ **So "a pump in phase with the twist rate" is the wrong picture, and so is "chasing a target it never
> reaches".** A pump needs a cycle, and there is none: the joint goes one way for 0.63 s and the command goes with
> it. ⚠️ **The honest name for it is a co-directional drive on a monotone excursion.**
>
> ⭐ **And the contrast is what makes it a finding.** Wave 6's joint *does* oscillate over the same window — its rate
> reverses twice, 18 of 38 intervals negative, the angle turning about 1.1–5.3° — and **there the same actuator nets
> −0.086 J raw.** The actuator that pumps a one-way excursion damps an oscillation.

### 3.3 ⭐ `u1`'s own terms, and the cancellation that must be printed beside them

With zero bank and zero twist asked, `steadyTurn` returns the zero equilibrium, so
`u1 = −b1 − Σ_j k[1][j]·x̂[j]` [R, `predictiveBalance.ts:1602–1607`] — pure feedback on the **predicted** state plus
the estimated bias. Each state's share of the raw work is `Σ_i (−k[1][j]·x̂[j])_i · Δθ_i`, and **the shares sum to
the raw work exactly, to the digit printed**, on all four waves. Wave 1, `+1.000 → +1.533` s:

| bias | φ roll | φ̇ | θ bank | θ̇ bank rate | **r board yaw** | β slip | **θ_t twist** | **ω_u upper rate** | δ ankle lag | τ_a twist lag | **Σ** | raw |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| +0.724 | +3.048 | −0.982 | +7.608 | +4.726 | ⛔ **−26.499** | −4.385 | ⭐ **+17.031** | ⭐ **+17.859** | +0.186 | −9.940 | **+9.377** | **+9.377** |

> ⚠️⚠️ **Read the net, never a term.** The two largest positive shares (+17.9 and +17.0 J) and the largest negative
> (−26.5 J) are each **two to three times the net +9.4 J**, so **the net is a small residue of large opposing terms**
> and attributing it to any one of them is reading a difference of big numbers as a cause. *(This caution is the
> coordinator's, and it is adopted rather than restated.)*
>
> ⚠️ **In particular, `θ_t`'s +17.0 J is NOT "the twist feedback winding the twist".** §4.2 shows the designed loop
> **restores** a pure twist and takes 2.0 J **out** of it. The share is positive here only because the angle was
> **growing** while that term sat on the winding side — the motion in `Δθ` is everything's, not that term's.
>
> On waves 2, 6 and 11 every share is small (|·| ≤ 0.52 J on either window): **their actuator is quiet because their state is quiet**,
> which is a different statement from "their actuator damps".

---

## 4. Part 2 — why. ⭐⭐⭐ The torso is the actuator's reaction mass.

### 4.1 The cost the command is optimal against

`q[i][i] = 1 / stateScale[i]²` for the first eight states [R, `predictiveBalance.ts:1124`]:

| state | `stateScale` | as an angle / rate | `q[i][i]` |
| --- | --- | --- | --- |
| φ roll | 0.050 | 2.86° | **400.0** |
| φ̇ roll rate | 0.500 | 28.6 °/s | 4.0 |
| θ bank | 0.050 | 2.86° | **400.0** |
| θ̇ bank rate | 0.250 | 14.3 °/s | 16.0 |
| r board yaw rate | 0.200 | 11.5 °/s | 25.0 |
| β slip | 0.020 | 1.15° | ⭐ **2500.0** |
| **θ_t torso twist** | 0.500 | ⭐ **28.65°** | ⭐ **4.0** |
| **ω_u upper yaw rate** | 1.000 | ⭐ **57.3 °/s** | ⭐ **1.0** |

> ⭐ **The cost declares 28.65° of torso twist and 57.3 °/s of upper-body yaw acceptable, against 2.86° of roll and
> 1.15° of slip** — the torso is **100×** cheaper than the roll and **625×** cheaper than the slip, and the upper
> body's rate is the **loosest weight in the whole cost**. The `cue` wave-1 ride reached **51.10°** (1.8× its own
> declared limit) and **218.33 °/s** (3.8×). ⚠️ This is a statement about the ranking the designer wrote, **not** a
> claim that changing it fixes anything — §4.4 tried that and it failed.

### 4.2 ⛔ The designed loop is STABLE and it RESTORES a pure twist. My first headline, retired.

The design's own discrete plant under its own law `u = −k x`, released from a pure 10° torso twist. **No water, no
disturbance, no estimator, no game:**

| speed m/s | spectral radius | peak twist | at s | twist at 1.0 s | **actuator work** | intervals + |
| --- | --- | --- | --- | --- | --- | --- |
| 4.0 | **0.968** | 10.45° | 0.233 | 3.59° | ⛔ **−0.227 J** | 11/120 |
| 4.5 | **0.975** | 10.46° | 0.267 | 4.83° | ⛔ **−0.236 J** | 12/120 |
| 5.0 | **0.982** | 10.57° | 0.383 | 7.66° | ⛔ **−0.244 J** | 18/120 |
| 6.0 | 0.980 | 10.00° | — | 4.49° | −0.250 J | 0/120 |
| 8.5 | 0.966 | 10.00° | — | 1.64° | −0.220 J | 16/120 |
| 12.0 | 0.961 | 10.00° | — | 1.13° | −0.214 J | 10/120 |

*(All 17 knots are in the result file; the spectral radii run 0.961–0.985 and **every one is below 1**.)*

> ⛔ **I was going to report that `k[1][θ_t]` is a negative spring, and that would have been wrong.** It is positive
> at all 17 knots (+57.19 at 4.0 m/s to +16.02 at 12.0) and exceeds the passive `TWIST_STIFFNESS` of 20 N·m/rad from
> 4.0 to 7.5 m/s, so **the own-angle term does push the joint further out** — measurably, but **small**: the 10°
> release overshoots **0.445 / 0.460 / 0.573°** at 4.0 / 4.5 / 5.0 m/s (peaks 10.445 / 10.460 / 10.573°) in
> 0.23–0.38 s, and not at all from 5.5 m/s up. ⚠️ **An earlier draft of this file put that overshoot at 1.6–1.9°,
> which was wrong: those are §4.3's `28.65°` release (peaks 29.97° at 4.5 and 30.29° at 5.0 m/s), a different
> release read off a different table.** Both are the same **4.5–5.7 % of whatever it is released from**, which is
> what a linear model must give. **And the loop converges at every knot and removes 0.21–0.26 J from the joint.** It
> is a small overshoot inside a stable loop, **not a divergence and not an instability**, and the word must not be
> used for it.
>
> ⭐ **And this is what makes the ride's +10 J a real question rather than a restatement:** given a torso excursion
> and nothing else, this controller puts the torso back. So **what it is answering on wave 1 is not a torso.**

### 4.3 ⭐⭐⭐ Released from each costed state in turn: the pump appears when the law answers the BOARD

The same designed loop, released from each costed state at that state's own `stateScale` — **the torso starting at
zero on every row but the twist's own**:

**Design at 5.0 m/s, depth 0, rail 0:**

| released state | start | peak twist | at s | twist at 1 s | **actuator work** | intervals + |
| --- | --- | --- | --- | --- | --- | --- |
| φ roll | 0.050 rad | +2.60° | 1.117 | +2.55° | −0.007 J | 55/120 |
| φ̇ roll rate | 0.500 rad/s | −4.22° | 0.900 | −4.17° | ⭐ **+0.031 J** | 51/120 |
| θ bank | 0.050 rad | −9.74° | 1.133 | −9.51° | ⭐ **+0.063 J** | 58/120 |
| θ̇ bank rate | 0.250 rad/s | +7.18° | 0.300 | −2.05° | −0.124 J | 53/120 |
| **r board yaw rate** | 0.200 rad/s | **−11.75°** | 0.717 | −10.74° | ⭐ **+0.109 J** | 41/120 |
| β slip | 0.020 rad | +2.83° | 0.367 | +0.77° | −0.003 J | 54/120 |
| θ_t torso twist | 0.500 rad | −30.29° | 0.383 | −21.93° | ⛔ **−2.001 J** | 18/120 |
| ⭐ **ω_u upper yaw rate** | 1.000 rad/s | ⭐ **−37.57°** | 0.817 | **−36.28°** | ⭐⭐ **+2.886 J** | 49/120 |

**The same releases at two other speeds, the two that matter:**

| released state | work at **4.5 m/s** | work at **5.0 m/s** | work at **8.5 m/s** |
| --- | --- | --- | --- |
| **ω_u upper yaw rate** | ⭐ **+1.080 J** (torso to 24.59°) | ⭐⭐ **+2.886 J** (37.57°) | ⛔ **−0.173 J** (11.15°) |
| r board yaw rate | −0.070 J | +0.109 J | −0.031 J |
| θ bank | −0.079 J | +0.063 J | +0.055 J |
| θ̇ bank rate | −0.203 J | −0.124 J | +0.072 J |
| θ_t torso twist | −1.939 J | −2.001 J | −1.805 J |

> ⭐⭐⭐ **This is the mechanism, and it needs no ride at all.** The designed loop **puts energy into the twist joint
> when it is answering something that is not a twist** — above all the upper body's own yaw rate, and then the
> board's yaw rate, the bank and the roll rate — and **takes energy out when it is answering a twist.** The reason is
> in §2.3's `gamma` row: **the command's route to the board is the reaction through the planted feet, so every joule
> it pushes into the board passes through the torso joint.** The torso is not the thing being positioned; it is the
> **reaction mass** the board is pushed against.
>
> ⭐ **And the speed carries the sign.** The pumping release is **+1.08 J at 4.5 m/s, +2.89 J at 5.0 and −0.17 J at
> 8.5** — so the same law that winds the torso 37.6° at wave 1's operating point damps it at waves 2 and 11's.
>
> ⚠️ **Limits, stated rather than buried.** This is the **design's own linear model**: no water, no sensing delay, no
> estimator, no soft stop (the game's `TWIST_STOP` is 2000 N·m/rad past 0.87 rad; the design carries only
> `TWIST_STIFFNESS` 20) and no actuator bound. It says what the control **law** does with a state. It does not say
> what a ride does, and the magnitudes are sized by an arbitrary release and are not predictions.

### 4.4 ⭐⭐ The same conclusion from the saved ride: the gain row frozen one speed at a time

Each wave's own saved state, reference, bias and motion held; **only `k` moves** — the gain row taken from the design
at one fixed speed instead of the ride's own. Raw work over `+0.900 → +1.533 s`, J:

| wave | **shipped** | **4.0** | 4.5 | 5.0 | 5.5 | 6.0 | 6.5 | 7.0 | 7.5 | 8.0 | **8.5** | 9.0 | 9.5 | 10.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1** | **+9.626** | ⭐ **+16.387** | +7.481 | +2.910 | ⛔ **−22.115** | −7.515 | −3.700 | −2.057 | +2.473 | +0.743 | **−0.666** | −1.343 | −1.415 | −1.624 |
| 2 | −0.064 | +0.324 | −0.046 | −0.079 | −0.278 | −0.146 | −0.113 | −0.095 | −0.010 | −0.047 | −0.075 | −0.098 | −0.094 | −0.099 |
| **6** | **−0.086** | ⭐ **+0.858** | +0.321 | +0.186 | −0.359 | −0.055 | +0.006 | +0.029 | +0.169 | +0.090 | +0.037 | +0.002 | −0.011 | −0.018 |
| 11 | +0.008 | +0.081 | +0.049 | +0.031 | −0.012 | +0.008 | +0.010 | +0.010 | +0.016 | +0.010 | +0.007 | +0.006 | +0.004 | +0.004 |

> ⭐⭐ **A two-way substitution, and neither factor alone does it** — the same shape as the ankle finding of the
> previous round. **Wave 1's own state and motion, handed a high-speed gain row, stop pumping** (−0.67 to −1.62 J at
> 8.5–10.0). **Wave 6's own state and motion, handed the slow-knot row, start pumping** (−0.086 → **+0.858 J**, a
> sign flip). **Wave 1's median scheduling speed over the window is 4.718 m/s; wave 6's is 5.740; waves 2 and 11 run
> at 8.239 and 8.406.**
>
> ⚠️ **The table is not monotone and must not be read as a threshold.** The 5.5 m/s row is −22.1 J, far more negative
> than its neighbours, and 7.5 m/s is +2.5 J against 7.0's −2.1. The gain row is interpolated between designs that
> were each solved independently, and it is not smooth in speed.
>
> ⚠️ **The 4.0 m/s column is the table's slowest knot.** `SCHEDULE_SPEEDS` runs 4–12 m/s and anything slower is
> **clamped onto the first knot** [R, `predictiveBalance.ts:1304, 1467`], so there is no design below 4 m/s — only
> that one, used for every slower speed.
>
> ⛔ **Open-loop.** It changes the command and nothing else. It does **not** say a fixed-gain rider would weave less.

### 4.5 The gain row across the schedule, for the record

| speed m/s | `k[1][θ_t]` | **net own-angle** = `k[1][θ_t] − 20` | `k[1][ω_u]` | `k[1][r]` | `k[1][φ]` | `k[1][θ]` | `k[1][β]` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **4.0** | **57.19** | ⭐ **+37.19** | **+22.65** | +161.81 | −184.87 | −457.35 | −993.27 |
| **4.5** | **52.55** | ⭐ **+32.55** | **+17.72** | +120.04 | +21.78 | −266.56 | −523.94 |
| **5.0** | **42.42** | ⭐ **+22.42** | **+8.24** | +93.87 | +110.68 | −388.94 | −408.52 |
| 5.5 | 19.23 | −0.77 | **−27.65** | +43.92 | +140.06 | −602.10 | −451.56 |
| 6.0 | 26.36 | +6.36 | −7.31 | +58.54 | +145.35 | −458.27 | −327.90 |
| 7.0 | 24.51 | +4.51 | −1.31 | +50.995 | +161.87 | −391.98 | −207.60 |
| 8.5 | 21.14 | +1.14 | −0.94 | +41.75 | +177.32 | −382.48 | −151.28 |
| 10.0 | 18.53 | −1.47 | −1.46 | +35.56 | +187.29 | −342.75 | −111.13 |
| 12.0 | 16.02 | −3.98 | −1.61 | +29.78 | +178.07 | −292.07 | −48.94 |

*(All 17 knots in the result file.)* ⭐ **The row's two largest entries are always board-level ones and never the
joint's own angle**: the board's **slip** leads at 4.0–5.0 m/s (−993 to −409) with the body's **bank** next, and from
5.5 m/s up the **bank** leads (−602 to −292) with the slip or the board's **roll** next, while `k[1][θ_t]` stays at
16–57 throughout — one to two orders smaller. **That is §4.3's conclusion read off the design instead of simulated:
this is a board actuator's gain row.** **And `k[1][ω_u]` changes sign across the schedule**:
positive (+8.2 to +22.6) at 4.0–5.0 m/s, negative from 5.5 up. Wave 1 rides in the positive band at 4.718 m/s; waves
2, 6 and 11 ride above it.

---

## 5. The other half: does a deliberate turn still get free torso rotation? ⛔ **No — it is actively pushed.**

⛔⛔ **This section was wrong twice and both versions are recorded rather than quietly replaced.**

**Version 1** read a **direct 20° twist ask**, found the reference echoing it, and concluded the channel is a
tracking law that cannot suppress a deliberate rotation. ⛔ **That tests plumbing, not a turn.** In ordinary play
**nothing ever asks for twist**, each link measured:

* `Controls.ts:147` leaves `rotate` **undefined** — the camera swing took that stick (the owner, 2026-10-22) — and
  `RideSession.ts:449` defaults it to **`Number.NaN`**; `AttachedRider.rotate` is `NaN` by declaration [R, `:1881`].
* `twistStep` is `rotate`-gated: `phase === 'standing' && !Number.isNaN(this.rotate) ? … : snap > 0 ? … : 0`
  [R, `AttachedRider.ts:3825`], so **absent Snap the direct ask is 0**.
* An ordinary steer asks for **bank** (`leanAsked`), which `tick` receives as `bankAsked`.
* And `steadyTurn` assigns **`x[6] = twist` outright** [R, `predictiveBalance.ts:1413`] — so a 20° ask coming back as
  20° of reference twist is an assignment being echoed, **not a loop shown to track.**

**Version 2** then printed `ref.u[1]`, the reference's own feed-forward, found it ≈ 0 for every bank ask, and was
about to conclude the twist actuator is **idle** in a turn. ⛔ **Also wrong, and it is the more dangerous error.**

### 5.1 ⭐⭐ The bank and the twist share ONE active torque channel, and the reference asks the torso to stay square

The command issued is `raw[1] = ref.u[1] − b1 − Σ_j k[1][j]·(x̂[j] − ref.x[j])` [R, `predictiveBalance.ts:1602–1607`].
A bank ask leaves `ref.u[1]` at zero but puts a **non-zero reference STATE** in — the bank, the board's yaw rate, the
ankle's rest — so **the gain row acting on `−ref.x` issues a real twist torque with the direct twist ask at zero.**
First ticks, zero senses (so `x̂` = 0 and the figure isolates the reference's own contribution):

| bank asked | **`ref.x[θ_t]`** | ref board yaw | `ref.u[1]` | ⭐ **`raw[1]`** | **N·m per degree** |
| --- | --- | --- | --- | --- | --- |
| **5.00 m/s, rail 0°** | | | | | |
| 1.3369° | ⭐ **0.0000°** | 0.115 °/s | 0.000 | **+10.665 N·m** | ⭐ **7.977** |
| −1.3369° | ⭐ **0.0000°** | −0.115 °/s | −0.000 | **−10.665 N·m** | 7.977 |
| 10° | ⭐ **0.0000°** | 0.869 °/s | −0.000 | **+80.214** | 8.021 |
| 20° | ⭐ **0.0000°** | 1.794 °/s | −0.000 | ⛔ **+163.252** | 8.163 |
| 40° | ⭐ **0.0000°** | 4.135 °/s | −0.000 | ⛔ **+354.247** | 8.856 |
| **6.70 m/s, rail 0.192°** | | | | | |
| **1.3369°** | ⭐ **0.0000°** | 1.555 °/s | 0.000 | ⭐ **+4.588 N·m** | ⭐ **3.432** |
| **−1.3369°** | ⭐ **0.0000°** | −1.555 °/s | −0.000 | ⭐ **−4.588 N·m** | 3.432 |
| 20° | 0.0000° | 24.259 °/s | 0.000 | +67.325 | 3.366 |
| 40° | 0.0000° | 55.926 °/s | 0.000 | ⛔ **+124.841** | 3.121 |
| **8.00 m/s, rail 0°** | 1.3369° | 0.0000° | 1.321 °/s | +4.698 | 3.514 |

> ⭐⭐ **An ordinary steer drives the twist actuator, and the reviewer's independent figure reproduces to the digit:
> ±4.588 N·m at ±1.3369°, 6.7 m/s, rail 0.192° — 3.432 N·m per degree of bank ask, re-derived here rather than
> taken.** At the slow operating point where the neutral pump lives it is **7.977 N·m per degree**, **2.3× steeper**.
>
> ⭐⭐⭐ **And `ref.x[θ_t]` is 0.000° at every bank ask on every operating point.** So the design asks the torso to
> stay **square to the board through the entire turn** while commanding up to **354 N·m** of twist torque to hold the
> board round. **There is no "free torso rotation on a deliberate turn" in this reference at all** — the torso is
> reaction mass in the turn exactly as it is at neutral, and §4.3's mechanism covers both regimes with one statement.
> ⚠️ **That is a finding against the footage**, where a real surfer's torso leads the turn — but it is a read of the
> reference, not a measurement of a ride, and `engine-target.md`'s rows are where it belongs.
>
> ⛔ **So nothing can be proposed for the neutral pump without checking the turn**, because they are one actuator with
> one gain row. ⚠️ **And the hips' own bound bites in the turn**: `TWIST_BODY_TORQUE` is **100 N·m** [R,
> `AttachedRider.ts:559`], so at 5.0 m/s the channel's demand passes it at about **12.5° of bank ask**, and at 6.7 m/s
> at about **31°**. **Where the neutral trace never clipped (0 of 684 ticks), a steer would.**
>
> ⚠️ **Limits of this table.** First ticks with zero senses: no estimator, no delay, no ride. `rail` is the SCHEDULE
> rail, which `AttachedRider` derives from the lean asked in two passes [R, `:3722–3723`]; each block states the rail
> it used instead of pretending to model it. The levels would move on a properly railed design; the **signs**, the
> **zeros in `ref.x[θ_t]`** and the **slope's ratio between operating points** are what it is for.

### 5.1b ⛔ And the weight that the mechanism points at does NOT remove the pump. I tried; it failed.

Design at 5.0 m/s. `ω_u work` is §4.3's 1 rad/s upper-body-rate release:

| `stateScale[6], [7]` | `k[1][θ_t]` | `k[1][ω_u]` | **`ω_u` work** | peak twist | pure-twist work |
| --- | --- | --- | --- | --- | --- |
| **0.50, 1.00 SHIPPED** | 42.42 | +8.24 | ⭐ **+2.886 J** | 37.57° | −2.001 J |
| 0.15, 1.00 *torso tighter* | **51.92** | +19.06 | ⛔ **+2.170 J** | 32.46° | −1.828 J |
| 0.50, 0.35 *upper rate tighter* | **47.08** | +15.04 | ⛔ **+2.719 J** | 35.20° | −1.976 J |
| 0.50, 0.20 *upper rate tighter* | **52.82** | +25.53 | ⛔ **+2.584 J** | 32.76° | −1.811 J |

> ⛔ **The pump is not in the cost.** Tightening the torso's own weight 3.3× leaves the pumping release at 75 % of its
> shipped value; tightening the upper body's rate weight 5× — it is the **loosest weight in the whole cost** — leaves
> it at 90 %. **Both make `k[1][θ_t]` larger, not smaller**, which is the opposite of the first thing one would try.
>
> ⛔ **So this file proposes no change and recommends no weight.** If the owner wants the wind-up gone, the lever is in
> the **plant** or in the actuator's **authority** — how much of the board's yaw the balance may buy through the feet
> — **and it has to be judged in the turn as well as at neutral** (§5.1). ⚠️ The project's own precedent is against a
> saturating bound: `?ankleLimit=feet` measured **worse**, and *"a stiff spring that saturates is not an ankle giving;
> it is an ankle letting go."* ⛔ A command that prescribed the torso's angle or rate directly would be the kinematic
> cheat this track has already rejected. ⛔⛔ **And nothing here may be read as a case for suppressing command
> reversals as a class**: on the saved seed-2 wave-2 steer arms both *successful* direction changes contain a large
> opposite ankle reversal after the steer went back to centre (first zero-stick frame **+1.2167 s**, ground course
> **L +13.81° / R −6.87°** there, **+54.06° / −42.13°** by **+1.6167 s** against neutral's **+3.84°**), so **a blanket
> veto on reversals would conflate turn RECOVERY with the wobble.** *(That control is the reviewer's, on its data, and
> is carried here rather than re-measured.)*

### 5.2 One plant mismatch found in passing, registered and not claimed as a cause

The game's twist joint has a **soft stop**: past `TWIST_BODY_RANGE` = 0.87 rad (49.85°) it adds `TWIST_STOP` =
2000 N·m/rad and `TWIST_STOP_DAMPING` = 50 [R, `AttachedRider.ts:560–564, 4607–4618`]. **The controller's design
carries only `TWIST_STIFFNESS` = 20 N·m/rad and no stop at all** [R, `rollModel.ts:842`, `predictiveBalance.ts:587`]
— so past 49.85° the balance is predicting a joint **100× softer** than the one it meets. The `cue` wave-1 ride
peaked at **51.10°**, inside that region.

⛔ **It is not the trigger and is not claimed as one.** The reviewer measured the first sample past the stop at
**+1.683 s**, roughly **0.14 s after** the +1.533 s ankle reversal, so the wind-up does its damage before the stop is
reached. ⚠️ It is recorded because the **rebound** happens inside the mismatch and nothing has looked there.

---

## 6. What I could not separate, stated as gaps and not as caveats

1. ⛔ **What initiates the disturbance.** Untouched, and still open. Everything here describes what the actuator does
   once the board is already being disturbed.
2. ⛔ **The estimator.** §4.3's releases hand the law the **true** state; the ride's law acts on `x̂`, a Kalman
   estimate propagated over a 0.1 s delay. **So the pump does not NEED a bad estimate — but I cannot say the estimate
   is not making it worse**, and the brief's question *"is the twist state the predictor is reacting to one it created
   itself?"* is only half answered: its **own** twist feedback is net restoring (§4.2), while the **loop** does wind
   the torso when answering the board (§4.3). Which of those the estimate amplifies is not measured.
3. ⚠️⛔ **The within-frame covariance — and the near-zero waves' SIGNS are not robust to it.** `u1` is held across a
   frame and `Δ(tb.angle)` is the frame's total change, so the work is exact at 60 Hz but the covariance of the
   command with the rate **inside** the 16 substeps is not separated. The three sampling variants (the lag at the
   interval's beginning, mean and end) bracket it at **±0.11 J on wave 1's +10.02, whose sign never moves**. ⛔ **But
   wave 6's narrow window (+0.023 / +0.008 / −0.007 J) and wave 2's wide window (+0.006 / −0.004 / −0.014 J) BOTH
   CHANGE SIGN across those variants.** So **only wave 1's sign may be leaned on**, and no contrast in this file
   rests on a settling wave's sign — the settling waves' claim is that their work is **small** (|·| ≤ 0.09 J against
   wave 1's +10), not that it is negative. *(An earlier draft wrote "no sign moves between them on any wave". That
   was true of step 3.5h's roll partition and is **false** of this one.)*
4. ⛔ **The board's half of the reaction.** Only the joint's generalised work is measured. The reaction's work on the
   board's **yaw** is the other half, and it lives on the axis where the shipped ledger's `rider` residual cannot
   close — so it is **not measured and nothing is attributed to it.**
5. ⛔ **The acceptance condition's second half, and it is now sharper rather than closed.** Every ride arm has the
   stick at zero. §5.1 establishes that the twist channel **is live in a turn** and that the reference asks the torso
   to stay **square** through it — but **the applied twist torque was never recorded on the steered arms**, so the
   channel's **benefit** in a real turn is unmeasured. ⭐ **That asymmetry is the shape of the next round: this file
   can show the channel pumps at neutral; it cannot yet show what it is worth when the player actually turns.**
6. ⛔ **And nothing here measures whether quieting the neutral pump would hurt the turn.** It is one actuator and one
   gain row (§5.1), so the question is real; the arms that would answer it do not exist yet.
7. ⚠️ **One wave, one window, one seed.** The ride figures are `cue` seed 2 waves 1, 2, 6 and 11 — **four crests,
   one of which winds up.** §4.2–§4.5 are design reads with a population of 17 schedule knots and 8 release states,
   which is why the mechanism rests on them and not on wave 1.

---

## 7. Reproduction

```sh
./node_modules/.bin/rolldown docs/research/new-rider/3.5/twist-work.ts -o <s>/raw.mjs --format esm --platform node
printf "globalThis.location = { search: '' };\n" > <s>/twist-work.mjs && cat <s>/raw.mjs >> <s>/twist-work.mjs
gunzip -c docs/research/new-rider/3.5/results/35i/35i-cue-ticks.jsonl.gz > <s>/cue-ticks.jsonl
cd <s> && env TICKS=<s>/cue-ticks.jsonl node twist-work.mjs
```

The whole output is `docs/research/new-rider/3.5/results/35i/35i-twist-work.txt`. `git diff claude/the-record --
src/` is **empty**: no constant, no switch, no pose and no force moved, and no read-only getter was needed — the
probe reads `PredictiveController`'s own public `predicted`, `reference`, `raw` and `bias`, and its `blend` through
one cast.
