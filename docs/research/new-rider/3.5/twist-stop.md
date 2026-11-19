# Step 3.5j — the twist joint's END STOP, carried by the plant the balance is designed on (`?twistStop=model|design`)

⛔⛔ **THIS IS NOT AN EIGHTH CANDIDATE FIX FOR THE FALL, AND IT IS NOT OFFERED AS ONE.** Seven were measured and
closed in one day: `?askCap` **inert** both at the stick's zero and at a full steer, `?ankleLimit=feet` **worse**,
`?ankleRange=wide` **innocent**, `?buoyFrame=hull` **12 of 12 in all 36 cells**, the hip rotor's gain swept
**500 → 8 000 with 12 of 12 at every value and SOONER in 36 of 60 paired runs**, `?swing=mass` **no help**, and every
reweighting of the twist cost (**torso ×3.3 → 75 %, upper-rate ×5 → 90 %, and both make the offending gain LARGER**).

⭐ **Its justification stands on its own, and it is arithmetic rather than a theory:**

> The design's twist spring is `TWIST_STIFFNESS` = **20 N·m/rad** and carries **no stop**
> [R, `predictiveBalance.ts:587`, `plantAt`, `rollModel.twistRows`]. The game adds `TWIST_STOP` = **2000 N·m/rad**
> past `TWIST_BODY_RANGE` = **0.87 rad (49.85°)** [R, `AttachedRider.ts:578, 4806–4816`]. The measured `cue` ride
> reached **51.10°** of twist.
>
> **So the controller's internal model of the rider's torso disagrees with the game's own torso by a factor of a
> hundred, and the ride enters the region where they disagree.**

Found and registered by step 3.5i (`3.5/twist-work.md` §5.2), which **recorded it without claiming it as a cause** —
and this round keeps that discipline. ⛔ **Nothing here is tuned to a bar.** §6 says plainly whether the fall moves,
and the answer is **it does not**, which was the expected answer.

---

## 0. The answers, in the order they were asked

| the question | the answer |
| --- | --- |
| **How big is the disagreement, in force rather than in ratio?** | ⭐ **At the ride's own peak, 51.10°, the shipped model is wrong by 43.726 N·m** — the game's joint pushes **61.564** where the model says **17.837**, a factor of **3.451 in torque** against the headline's **100× in stiffness**. **43.726 N·m is 43.7 % of the whole authority the hips have** (`TWIST_BODY_TORQUE` = 100 N·m). Both ratios are printed because they are different numbers and only one of them is a force. |
| ⭐⭐ **What form did the predictor's own structure carry?** | ⭐⭐ **A fifth axis on the gain schedule — the twist stiffness, read at the joint's own angle — beside the speed, the depth and the rail it already carries.** The rail axis is the precedent and the shape is identical. And **the stiffness carried is the SECANT, which is forced by the plant's form and not chosen**: the game's joint torque past the stop is **affine** (slope `k + TWIST_STOP`, offset `−TWIST_STOP·R`) while `twistRows` can only carry `stiffness · θ_t`, a line through the origin. The secant is the **unique** stiffness that reproduces the game's torque **exactly** at the angle the joint is at — verified at **2.3 × 10⁻¹³ N·m** worst error over 0–90° in 0.01° steps — and it is continuous at the stop, so the schedule does not step. |
| ⭐⭐⭐ **Why TWO values and not one `on`?** | ⭐⭐⭐ **Because the brief's own hard constraint splits them.** `'model'` rebuilds Φ, Γ, the filter's L and the reference on the corrected plant and **leaves the gain row alone**: it is purely a change of what the controller BELIEVES. `'design'` re-solves the gain row too — and the LQR answers a stiff joint by wanting the twist handle used **21× harder** (`k[1][θ_t]` **42.418 → 888.505 N·m/rad** at 5.0 m/s). **That is scaling a torque, not correcting a model**, so it is named separately, measured separately, and is **not** the recommended arm. The precedent for a plant correction whose gains are deliberately left alone is already in this file: `heaveSense` with `heaveGains: 'free'`. |
| **Does the correction do what it is for?** | ⭐ **Yes, measured as a prediction error.** One control step from 51.10° of twist on the true joint, the shipped Φ mispredicts the upper body's yaw rate by **0.353 rad/s (20.2 °/s)** and the board's by **0.246 rad/s (14.1 °/s)**; the corrected Φ by **0.136** and **0.095** — **2.6× less**. At 60° it is **2.998 → 0.903** and **2.087 → 0.630**. From a state **inside** the range both are **exactly equal**. |
| ⛔ **Does re-solving the gain row quiet the wind-up?** | ⛔ **NO, and on this instrument it mostly makes it worse.** 3.5i §4.3's pumping release, integrated with the game's stop in the truth and **both commands bounded as the body bounds them**: of 16 cells, **7 reach the stop and 9 do not; the 9 that do not are bit-identical between the arms**, and of the 7 that do, `design` ends with a **larger peak twist in 6** and puts **more work into the joint in 4**. The mechanism is in the saturation column: the stiffer design wants **200–800 N·m** of twist, the hips have **100**, and its command clips on **up to 96 of 120 ticks**. |
| ⭐ **Does the switch REACH the physics?** | ⭐⭐ **Yes, and it was measured THREE WAYS.** Through the **fixture** (`AttachedRider` built directly), through the **real session path** on a calibrated face (search string → `surfZoneConfigFor` → `SurfZoneConfig` → `SurfZoneRunner`'s forwarding expression → `RideSession`), and through **the real Canyon B solver** on the owner's own spot. Over 27 + 27 + 54 runs: **0 ticks where the stiffness handed over disagreed with the secant this probe computed for itself**, **0 ticks where the schedule's own coordinate disagreed with the body's**, and **0 ticks with a non-zero handover off the switch**. ⭐⭐ **And on the Canyon, 54 of 54 runs entered the mismatch region** — 15 of 27 and 9 of 27 on the two face paths — so no read is vacuous. |
| ⭐ **What does it do at NEUTRAL?** | ⭐ **Across all cells, both arms are bit-identical to the default wherever the joint never passes 49.85° of twist — 4 of 9 fixture cells, 6 of 9 session cells and, on the Canyon where 54 of 54 runs DO pass it, only 3 of 18 (`model`) and 2 of 18 (`design`)** — because the axis's first knot IS `TWIST_STIFFNESS`. At the stick's zero where it DOES pass: the joint's delivered work over the run moves **−65.108 → −63.990 J** (`model`) and **−64.242** (`design`) in the fixture's crouch, and **−54.906 → −54.400 / −55.169** in Compress. ⚠️ **These are whole-run works on a 1.0–2.2 s capsize, NOT 3.5i's +10 J wind-up window**, which is a `cue`-trace quantity over a named 0.633 s window and is not reproduced here. |
| ⭐ **What does it do THROUGH A STEER?** | ⭐⭐ **The steer's own twist demand is unchanged by `model` and moved by `design`, which is the asymmetry that matters.** Through the shipped `tick` with the torso held past the stop: `model` leaves the commanded twist per degree of bank ask **exactly** where the shipped controller put it (**1.000× on every one of 12 asks**), while `design` moves it **0.624× to 1.038×** — up at 5.0 m/s, **down** at 6.7 m/s. ⚠️ And the **reference still asks the torso to stay square** (|ref θ_t| = **0.00 × 10⁰°** over 48 asks), so neither arm changes what is ASKED of the torso, only what the loop believes it will do. |
| ⛔⛔ **Does the fall move?** | ⛔⛔ **NO. The fall does not move.** On the two face paths (18 cells) **both arms** fall **later in 2, sooner in 5 and on the same frame in 11**, largest shift **0.17 s**, in both directions, and **10 of the 18 whole runs are bit-identical to the default**. ⭐ **On the real Canyon (18 cells, 54 runs)** `model` is **same in 11, sooner in 4, later in 3** and `design` **same in 5, SOONER in 10, later in 3**; largest shift 0.317 s. **Every cell of every arm falls, 54 of 54 on the Canyon, all within 2.2 s.** **That is the expected outcome and it is fine: the justification is the model's correctness, not the fall.** |
| **The default arm** | ⭐ **BYTE-IDENTICAL, proved and not asserted.** The whole live trace of the default rider — **1 235 lines**, both paths, 3 stances × 3 steers, every frame's twist, delivered torque, command, bank, roll, speed and heading to 12 decimals, plus each fall's own time and cause — against the same trace on the base branch: **md5 `e0604f81e4c360dd5e54314eb1af7c9e` both sides, 0 diff lines.** |

---

## 1. What this round may and may not be read as

⛔ **It is a CORRECTNESS fix, ruled on by the owner, and nothing below is evidence about the cause of the fall.**

⛔ **§2–§5 are reads of the DESIGN's own model, not rides**: full state, no estimator, no 0.1 s sensing delay, no
water, no reference. That is 3.5i §4.2–§4.3's own method and scope line, kept so the numbers are comparable. The
rides are §6: §6.1–§6.3 on a **calibrated analytic face** (Canyon B's own 1.4 m / 16° / 5.7 m/s, which is **not the
Canyon** — no peel, no crest line, no lip) and §6.4 on **the real Canyon B solver**.

⛔ **The ride analyzer's own bottom-turn columns — `Maneuver.roll`, `pathYaw` and the `Carrying` heights, which is
where the owner's 42° / 40° / 0.296 → 0.995 m target lives — are NOT measured here**, on the face or on the Canyon.
§6.3 and §6.4 print the same three physical quantities off their own runs and say, on the table, that they are not
those columns: a rider PLACED on a crest is not a turn the analyzer named, and every placed run's climb came out
NEGATIVE. ⚠️ **The gap is stated rather than papered over**, and it is the first thing a next round should close —
with an autopilot that rides a named bottom turn, not a steeper placement.

⛔ **The stop's DAMPING is not carried, and that is a stated gap.** `TWIST_STOP_DAMPING` = 50 N·m·s/rad rides on top
of `TWIST_DAMPING` = 3 past the same range — a **17×** mismatch on the rate. It is linear in the rate with no offset,
so unlike the stiffness it has **no continuous secant**: it jumps 3 → 53 the instant the stop engages, and blending it
along an axis whose coordinate is a stiffness would read 3 just past the stop where the truth is 53. One correction,
one axis.

⚠️⚠️ **And the two values exist because the brief's own two requirements pull apart once they are measured, which is
worth saying out loud rather than resolving quietly.** *"The plant the predictor is designed on carries the same
stiffness the body actually has"* read literally is `'design'` — the law re-solved on the corrected plant. *"You are
changing what the controller BELIEVES, not adding an actuator… if your change ends up adding or scaling a torque
rather than correcting a model, stop and say so"* excludes it, because re-solving the law is exactly what multiplies
`k[1][θ_t]` by 21. **So `'design'` is built, measured and reported — §5.1 and §5.2 say what it does — and `'model'`
is the arm that satisfies both sentences at once, by correcting the prediction, the filter and the reference while
leaving the push alone.** Which one to keep is the owner's call, and the tables are what it should be made on.

⛔ **No torque was added, scaled or clamped in the game by either arm.** `TWIST_STOP` is the game's own joint and was
already pushing before this flag existed; the twist command's bound (`TWIST_BODY_TORQUE` and the feet's grip) is
untouched. ⚠️ **What `'design'` scales is a gain INSIDE the controller** — 21× on `k[1][θ_t]` — and that is why it is
a second value with its own name and its own table rather than hidden inside one `on`.

⚠️ **Every N·m in §5 is REQUESTED**, before `MOTOR_LAG`, before the 100 N·m bound and before the feet's grip, exactly
as 3.5i §5.1's 354 N·m row was. Every joule in §4 and §6 is **DELIVERED**, booked on the plant's own lagged torque
state (§4) or on `tb.active` (§6), and the column says which.

⚠️ **Short runs, and every one of them falls.** §6's runs last **0.6–2.2 s** and the rider falls in **every cell of
every arm**, the default included — on the calibrated face and on the real Canyon alike. A population of 27 + 27 + 54
runs is what carries the handover check; it does not carry a claim about a ride, and §6.4's Canyon riders are
**placed** on a crest rather than paddled into a wave.

---

## 2. The instrument, and the positive controls that make it worth reading

Two files are added under `docs/research/new-rider/3.5/` and the source change is small and listed in §7.

| file | what it is |
| --- | --- |
| `twist-stop.ts` | the design read. Calls `scheduledDesign`, `plantAt`, `continuousPlant`, `steadyTurn`, `closedLoop` and **the shipped `PredictiveController.tick`** — not rewrites of them. |
| `twist-stop-ride.ts` | the ride. `MODE=parse` the switch chain, `MODE=fixture` an `AttachedRider` built directly, `MODE=session` the same water through **`RideSession`**, `MODE=sea` **the real Canyon B solver** through `RideSession`, `MODE=bytes` the default arm's whole trace. |
| `results/35j/*` | every table below, as the probes printed them, plus the byte check. |

### 2.1 ⭐ The positive controls, and the round is void without them

Every one of these is a **published figure from another round, reproduced on this round's instrument**:

| control | published | this file | verdict |
| --- | --- | --- | --- |
| ⭐⭐ **3.5i §5.1's shared bank/twist channel**, N·m per degree of bank ask, through the shipped `tick` | 7.977 / 8.163 / 8.856 at 5.0 m/s and 1.3369° / 20° / 40°; 3.432 and 3.121 at 6.7 m/s / rail 0.192°; 3.514 at 8.0 m/s | **7.977 / 8.163 / 8.856 / 3.432 / 3.121 / 3.514**, on raw commands of **10.665 / 163.252 / 354.247 / 4.588 / 124.841 / 4.698 N·m** | ⭐⭐ **all six TO THE DIGIT** |
| ⭐⭐ **3.5i §4.5's gain row**, `k[1][θ_t]` by speed | 57.19 / 52.55 / 42.42 / 19.23 / 21.14 / 16.02 at 4.0 / 4.5 / 5.0 / 5.5 / 8.5 / 12.0 m/s | **57.186 / 52.547 / 42.418 / 19.234 / 21.141 / 16.016** | ⭐⭐ **to the digit — and it is what established the DEPTH** (see below) |
| ⭐ **3.5i §4.3's pumping release**, the upper body's own yaw rate at 1 rad/s, 5.0 m/s | peak **−37.57°**; a **requested** +2.886 J, which the brief prices at **2.1–2.3 J delivered** through the lag | **\|peak\| 37.574°** (0.01 % apart) and **+2.228 J DELIVERED** | ⭐ **inside the delivered band, on a different integrator** |
| **3.5i's designed-loop stability**, spectral radius | 0.961–0.985 over 17 knots | **0.963–0.985** at the shipped knot over the same 17 | reproduced |
| **the secant's own identity** | — | worst \|secant·θ − the game's joint torque\| over 0–90° = **2.3 × 10⁻¹³ N·m** | exact |

⭐ **The depth was not chosen, it was established.** 3.5i's gain row reproduces only at **depth 0, standing tall**
(at 0.195 / 0.30 / 0.45 m `k[1][θ_t]` at 5.0 m/s reads 48.60 / 53.02 / 61.52 against the published 42.42), so every
design figure in this file is a **tall** design and a crouch or Compress ride is scheduled on a different one.

### 2.2 The signs, units, frames and axes, stated once

* **The axis** is the **upper body's yaw relative to the board about the board's own up axis** (`tb.angle`, rad). It
  is **not** a roll axis, so **none of these joules may be added to step 3.5h's roll partition.**
* 3.5i §2.3 measured that **the model's whole yaw axis is the negation of the engine's** — its state 6 is
  `−tb.angle`. §4 works in the model's frame, which is why its peak twists carry the opposite sign to 3.5i's; a work
  is a frame-free scalar and is reported in the physical sign.
* The joint's **generalised work**, J, is `Σ M · Δθ_t` with `+M` on the upper body and `−M` on the board through the
  planted feet — 3.5i §2.2's own recipe.
* **Speed** is the along-heading speed through the water, m/s, as the schedule's own is. **Depth** is `yawDepth`, m.
* The two read-out fields: `AttachedRider.twistModelK` is the **body's** side of the handover (N·m/rad, **0** on a
  tick that handed over nothing), `PredictiveController.schedTwistK` the **schedule's** (the axis coordinate,
  `TWIST_STIFFNESS` = 20 when the axis is off or the stop is not engaged). Both are written on **every** tick of
  **both** arms, so an unmoved number is evidence rather than an absence.

---

## 3. §1–§2 — the disagreement, and the error it actually causes

### 3.1 ⭐ The disagreement in N·m, and the two ratios that must not be confused

`results/35j/35j-design.txt` §1. `game` is `coupleYaw`'s own spring; `shipped` is 20 θ.

| deg | rad | game N·m | shipped N·m | error N·m | torque ratio | of the hips' 100 N·m | secant N·m/rad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 45.00 | 0.7854 | 15.708 | 15.708 | **0.000** | 1.000 | 0.000 | 20.000 |
| 49.85 (the stop) | 0.8700 | 17.400 | 17.400 | **0.000** | 1.000 | 0.000 | 20.000 |
| ⭐ **51.10** (the ride) | 0.8919 | **61.564** | **17.837** | ⭐ **43.726** | **3.451** | ⭐ **0.437** | 69.028 |
| 55.00 | 0.9599 | 199.061 | 19.199 | 179.862 | 10.368 | 1.799 | 207.370 |
| 60.00 | 1.0472 | 375.339 | 20.944 | 354.395 | 17.921 | 3.544 | 358.422 |

> ⚠️⚠️ **The 100× of the headline is a STIFFNESS ratio (2020/20). At the angle the ride actually reached the TORQUE
> ratio is 3.451×** and the error is 43.726 N·m. Both are true and they are different numbers; only one of them is a
> force, and the force is the one worth 44 % of the hips' whole authority.
>
> ⭐ **The two models agree exactly at 0.87 rad**, which is why the axis's first knot is `TWIST_STIFFNESS` itself and
> why nothing below the stop can move.

### 3.2 ⭐ The error it causes: one control step, from the ride's own angle

The state the loop's own Φ predicts one control step (1/60 s) ahead, against the state the game's joint actually
produces, from a state whose only non-zero entry is the twist, under a zero command.

| from | model | Δθ_t rad | Δω_u rad/s | Δr rad/s (the board's yaw) |
| --- | --- | --- | --- | --- |
| 45.00° | shipped | 0.000 | 0.000 | 0.000 |
| 45.00° | corrected | 0.000 | 0.000 | 0.000 |
| ⭐ **51.10°** | shipped | 0.006 | ⭐ **0.353** (20.2 °/s) | ⭐ **0.246** (14.1 °/s) |
| ⭐ **51.10°** | corrected | 0.001 | ⭐ **0.136** | ⭐ **0.095** |
| 55.00° | shipped | 0.024 | 1.512 | 1.053 |
| 55.00° | corrected | 0.004 | 0.484 | 0.338 |
| 60.00° | shipped | 0.048 | 2.998 | 2.087 |
| 60.00° | corrected | 0.008 | 0.903 | 0.630 |

> ⭐ **This is the quantity the flag changes, and it is 2.6× smaller at the angle the ride reached.** Both arms carry
> the same corrected Φ, so this table is `model`'s and `design`'s together.
>
> ⛔ **It does not go to zero, and that is honest rather than a defect:** the secant is exact at the angle it is read
> at and the angle moves during the step. ⚠️ **And these are ONE step.** The loop predicts over
> `PREDICT_DELAY` = 0.1 s — six of them — and over six the error compounds; that is not computed here, because the
> six-step prediction also carries the commands already sent.

---

## 4. §3 — the designs at the axis's knots, and the gain row's answer

`SCHEDULE_TWIST_K = [20, 60, 180, 540, 2020]`, **geometric at about ratio 3**, because the gain row's entries go
roughly as the logarithm of the stiffness over this range, so geometric knots carry a near-uniform interpolation
error. **Both ends are physical and neither is a choice:** 20 is `TWIST_STIFFNESS` (so a sub-stop tick lands on the
shipped design), and 2020 is `TWIST_STIFFNESS + TWIST_STOP`, the stop's own tangent, which the secant approaches from
below and **never exceeds** — so nothing is clamped away at the top. The angles the three middle knots are the secant
of are **50.9°, 55.5° and 66.3°**, and the `cue` ride's own peak, 51.10°, sits between the first two.

`k[1][θ_t]`, N·m/rad of the joint's own angle, depth 0:

| m/s | 20 | 60 | 180 | 540 | 2020 |
| --- | --- | --- | --- | --- | --- |
| 4.0 | 57.186 | 153.496 | 395.986 | 726.602 | 835.972 |
| ⭐ **5.0** | ⭐ **42.418** | 125.952 | 351.248 | 698.929 | ⭐ **888.505** |
| 8.5 | 21.141 | 64.293 | 138.097 | 251.812 | 439.373 |
| 12.0 | 16.016 | 50.705 | 107.966 | 198.197 | 331.206 |

**Controls:** the spectral radius of the **whole designed loop** (`closedLoop`: the law, its filter and its delay
line) is **0.963–0.985 over all 17 × 5 cells, every one below 1** — so every knot is a design and the shipped column
reproduces 3.5i's own 0.961–0.985 band. And **the first knot IS the shipped design: Φ, Γ, K and L compared entry by
entry at all 17 speeds, bit-identical on every entry**, in both arms.

> ⛔⛔ **This table is the whole case for the two values.** Correcting the model and then re-solving the law on it
> makes the LQR want the twist handle used **21× harder at 5.0 m/s**. That is not a change of belief; it is a change
> of how hard the rider pushes, and it is exactly the thing `uprightVelocity` and PR #215 were rejected for being.
> ⭐ **So `'model'` keeps the shipped gain row** — **verified bit-for-bit over 85 cells (17 speeds × 5 knots)** — and
> `'design'` is kept as the comparison the measurement needed.

---

## 5. §4–§5 — the two regimes, because the twist channel is ONE actuator

### 5.1 ⛔ The closed loop on the TRUE joint: re-solving the gain row does not quiet the wind-up

3.5i §4.3's pumping release — the upper body's own yaw rate, the torso starting square — integrated with the game's
stop in the truth, **both commands bounded as the body bounds them** (twist 100 N·m, ankle 0.25 rad), 2 s, 120 ticks.

| m/s | release rad/s | law | \|peak\| ° | work J | ticks past 0.87 rad | twist command clipped |
| --- | --- | --- | --- | --- | --- | --- |
| 4.5 | 1.00–1.80 | both | identical | identical | 0 | 0 |
| 4.5 | 2.50 | shipped | 86.530 | +438.180 | 102 | 34 |
| 4.5 | 2.50 | design | **84.989** | **+419.533** | 89 | 93 |
| 5.0 | 1.00 | both | 37.574 | +2.228 | 0 | 0 |
| 5.5 | 1.00 | both | 36.614 | +2.662 | 0 | 0 |
| ⭐ **5.0** | **1.40** | shipped | **50.423** | **+4.402** | 25 | **0** |
| ⭐ **5.0** | **1.40** | design | ⛔ **71.210** | ⛔ **+83.943** | 70 | ⛔ **49** |
| 5.0 | 1.80 | shipped | 54.085 | +15.766 | 96 | 0 |
| 5.0 | 1.80 | design | 76.810 | +104.946 | 84 | 77 |
| 5.0 | 2.50 | shipped | 71.389 | +55.229 | 103 | 14 |
| 5.0 | 2.50 | design | 82.450 | +221.990 | 90 | 96 |
| 5.5 | 1.40 | shipped | 50.194 | +5.111 | 19 | 0 |
| 5.5 | 1.40 | design | 51.530 | +5.004 | 28 | 0 |
| 5.5 | 1.80 | shipped | 52.740 | +11.711 | 65 | 0 |
| 5.5 | 1.80 | design | 62.737 | +31.651 | 41 | 12 |
| 5.5 | 2.50 | shipped | 58.081 | +63.286 | 74 | 0 |
| 5.5 | 2.50 | design | 80.301 | **+34.173** | 74 | 62 |
| 8.5 | 1.00–2.50 | both | identical | identical | 0 | 0 |

**All sixteen cells are in `results/35j/35j-design.txt` §4**; this is the whole set of stop-reaching rows, so the two
cells where `design` comes out ahead on one column (4.5 / 2.50 on both, 5.5 / 2.50 on the work) are in it too.

> ⛔ **Counted rather than eyeballed: of 16 cells, 7 reach the stop and 9 do not. The 9 that do not are BIT-IDENTICAL
> between the arms.** Of the 7 that do, `design` ends with a **larger \|peak twist\| in 6** and puts **more work into
> the joint in 4**.
>
> ⛔ **So re-solving the gain row on the corrected plant does NOT quiet this release; on this instrument it mostly
> makes it worse** — and the mechanism is in the last column. The stiffer design wants 200–800 N·m of twist, the hips
> have 100, and **a law whose command saturates for most of a second is no longer the law that was designed.**
>
> ⭐ **`'model'` is absent from this table as a property of the section, not as an omission**, and it is verified
> rather than asserted: the release is driven by `u = −K x` on the true state, so on an instrument whose only channel
> is K, `model` **is** the shipped arm — **K bit-identical to the shipped row in all 85 cells.** `model` acts only
> through the prediction, the filter and the reference, which is §3.2 and §5.2.
>
> ⚠️ **The first version of this table had no command bound and was therefore a requested-torque study dressed as a
> trajectory** (releases running to 139° and 347° of twist, works of −2 393 and −28 912 J). It is recorded rather than
> quietly replaced.

### 5.2 ⭐⭐ The steer regime: `model` leaves the turn's twist demand exactly where it was, `design` moves it

3.5i §5.1 measured that **an ordinary bank ask drives the twist actuator with zero twist requested** — the two share
one active torque channel. So a change that quiets the neutral wind-up by stiffening the torso in a turn has broken
the turn, and the turn has to be read beside the neutral. Through the **shipped `tick`**, first tick, every sense
zero, the axis read at a held twist angle. REQUESTED N·m.

| m/s | rail ° | bank ask ° | torso at ° | arm | axis k | raw N·m | N·m / deg | vs shipped |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5.00 | 0 | 1.3369 | — | shipped | 20.0 | 10.665 | 7.977 | 1.000× |
| 5.00 | 0 | 1.3369 | 51.1 | **model** | 69.0 | 10.665 | 7.977 | ⭐ **1.000×** |
| 5.00 | 0 | 1.3369 | 51.1 | design | 69.0 | 10.705 | 8.008 | 1.004× |
| 5.00 | 0 | 1.3369 | 60.0 | **model** | 358.4 | 10.665 | 7.977 | ⭐ **1.000×** |
| 5.00 | 0 | 1.3369 | 60.0 | design | 358.4 | 10.968 | 8.204 | **1.028×** |
| 5.00 | 0 | 20 | 60.0 | **model** | 358.4 | 163.252 | 8.163 | ⭐ **1.000×** |
| 5.00 | 0 | 20 | 60.0 | design | 358.4 | 169.374 | 8.469 | **1.038×** |
| 6.70 | 0.192 | 1.3369 | — | shipped | 20.0 | 4.588 | 3.432 | 1.000× |
| 6.70 | 0.192 | 1.3369 | 60.0 | **model** | 358.4 | 4.588 | 3.432 | ⭐ **1.000×** |
| 6.70 | 0.192 | 1.3369 | 60.0 | design | 358.4 | 2.862 | 2.141 | ⛔ **0.624×** |
| 6.70 | 0.192 | 40 | 55.0 | design | 207.4 | 99.906 | 2.498 | ⛔ **0.800×** |
| 6.70 | 0.192 | 40 | 60.0 | design | 358.4 | 79.245 | 1.981 | ⛔ **0.635×** |

> ⭐⭐ **`model` is 1.000× on every one of the twelve asks**, at every knot and every operating point: the pure belief
> correction **does not touch what a steer asks of the twist channel.** ⛔ **`design` moves it 0.624× to 1.038×, and
> not in one direction** — up at 5.0 m/s, **down** at 6.7 m/s, which is where an ordinary ride lives. ⛔⛔ **A steer
> that gets 62 % of its twist torque at 6.7 m/s with the torso at 60° is a changed turn, and it was not asked for.**
>
> ⚠️ **Neither arm changes what is ASKED of the torso.** `ref θ_t` is **0.00 × 10⁰° over all 48 asks** — the design
> still asks the torso to stay square to the board through the whole turn, which 3.5i §5.1 established and this flag
> does not touch. What changes is what the loop believes the torso will DO when it pushes it.
>
> ⭐ **CONTROL — with either switch set but the torso INSIDE the range, the steer is the shipped steer**: largest \|Δ\|
> in **either** command over 4 asks × 2 arms × 4 sub-stop angles = **0**, bit-identical.

---

## 6. §6 — ridden. The switch reaches the physics, TWO WAYS, and ⛔ the fall does not move

`FaceWater` at **1.4 m, 16°, depth 6 m, entry 5.7 m/s, −45° off the fall line** — **Canyon B's own calibration
(#223)**, the spot the owner rides the rider work on. The cell is `3.5/bank.ts`'s own, down to the flush placement's
`SINK` and the face being advanced each step. ⚠️ **It is a calibrated analytic face and not the Canyon:** no peel, no
crest line, no lip.

### 6.1 ⭐⭐ The handover, verified through the real session path AND through a fixture

| path | cells | ticks where the body's handover ≠ the secant | ticks where the schedule's coordinate ≠ the body's | ticks with a non-zero handover OFF the switch | cells that reached the stop |
| --- | --- | --- | --- | --- | --- |
| **fixture** (`AttachedRider` built directly) | 27 | ⭐ **0** | ⭐ **0** | ⭐ **0** | **15 of 27** |
| **real session** (search → `surfZoneConfigFor` → config → runner's forwarding → `RideSession`) | 27 | ⭐ **0** | ⭐ **0** | ⭐ **0** | **9 of 27** |

The secant the two were checked against is **computed in the probe from `tb.angle` and the stop's own constants**, not
read off the class, and the comparison is made at the angle the **control tick** saw (the frame's start), because
`tb.angle` moves on through the other fifteen substeps.

⭐ **That is also how the two paths are shown to AGREE, and it is stronger than comparing them with each other.** The
two paths do not ride the same trajectory, so their tick-by-tick numbers cannot be lined up; what can be lined up is
the **function** — and both paths reproduce *the same* independently computed secant at *every* angle they visit, with
the handover's two sides (the body's and the schedule's) agreeing with each other on every tick as well. A path that
had dropped the option would read 0 and 20 everywhere, which is exactly what the switch-off arm reads. The session path printed the config it was built from live:
`{"twistStop":"model"}`. The stiffness actually handed over reached **329 N·m/rad** in the fixture and **321** through
the session.

⛔ **Neither read is vacuous**, which is why the last column is there: a mode that never passes 0.87 rad proves nothing
about the handover, and both modes passed it in a third or more of their cells.

**The switch chain, hop by hop** (`results/35j/35j-switch-chain.txt`): `?twistStop=model` and `=design` reach the
switch, the `SurfZoneConfig` and the runner's forwarding expression; **`on`, `off`, `yes`, `1`, `stop`, a bare
`?twistStop` and an empty value all reach none of them.** `Model` and `DESIGN` are lower-cased.

### 6.2 ⛔⛔ The fall does not move

Fall time, s, by cell and arm. **`=` is the same frame as the default** (which is not always the same RUN: `design`
on the fixture's Compress / −1 falls on the identical frame with a different work, −46.045 J against −45.278 J).

| path | cell | off | model | design |
| --- | --- | --- | --- | --- |
| fixture | tall, neutral | 0.633 | **=** | **=** |
| fixture | tall, steer +1 | 0.633 | **=** | **=** |
| fixture | tall, steer −1 | 2.050 | 2.017 | 1.633 |
| fixture | crouch, neutral | 1.583 | 1.550 | 1.267 |
| fixture | crouch, +1 | 1.383 | **=** | **=** |
| fixture | crouch, −1 | 1.317 | **1.483** | 1.383 |
| fixture | compress, neutral | 1.750 | 1.733 | 1.300 |
| fixture | compress, +1 | 1.483 | **=** | **=** |
| fixture | compress, −1 | 1.333 | **1.350** | **=** |
| session | tall ×3, crouch −1, compress +1/−1 | 0.617–0.783 | **=** (6 cells) | **=** (6 cells) |
| session | crouch, neutral | 1.233 | **=** | 1.133 |
| session | crouch, +1 | 1.783 | 1.767 | **1.850** |
| session | compress, neutral | 1.183 | 1.167 | 1.100 |

> ⛔⛔ **Over 18 cells, BOTH arms fall later in 2, sooner in 5 and at the same frame in 11 — and 10 of the 18 whole
> runs are bit-identical to the default. The largest shift is 0.17 s and it goes both ways. THE FALL DOES NOT MOVE.**
>
> ⭐ **The 10 bit-identical runs are not a weak result, they are the design working:** those cells never reach
> 49.85° of twist, and below the stop the axis's first knot **is** `TWIST_STIFFNESS`, so the arms are bit-identical to
> the default by construction — and the probe measures that rather than assuming it.

### 6.3 The sharpness, and what these three columns are NOT

Peak body lean, net heading change and net surface rise over the run — **the same three quantities the owner's target
is about, read off these runs.** ⚠️ **They are NOT the ride analyzer's bottom-turn columns** (`Maneuver.roll`,
`pathYaw` and `Carrying`'s heights), which need a wave frame this analytic face has not got, so **they must not be set
beside the owner's 42° / 40° / 0.296 → 0.995 m target.**

| cell | arm | peak bank ° | swing ° | climb m |
| --- | --- | --- | --- | --- |
| fixture crouch, neutral | off | **−70.000** (the clamp) | +10.132 | +0.038 |
| fixture crouch, neutral | model | **−70.000** | +14.326 | +0.063 |
| fixture crouch, neutral | design | −42.589 | +21.777 | +0.258 |
| fixture compress, neutral | off | **−70.000** | +37.531 | −0.056 |
| fixture compress, neutral | design | −39.525 | +21.439 | +0.235 |
| fixture tall, steer −1 | off | −38.669 | −35.020 | −0.239 |
| fixture tall, steer −1 | model | −48.532 | −37.931 | −0.221 |
| fixture tall, steer −1 | design | **+41.017** (the other way) | −20.708 | +0.075 |

> ⚠️⚠️ **A smaller bank here is NOT a gentler turn and must not be read as one.** `−70.000°` is the measured bank's
> own clamp: the body is on its side. So `design`'s −42.6° in that cell is **less capsized**, not less committed —
> and it still falls, 0.32 s sooner. ⛔ **And in the steered cell `design` flips the bank's SIGN**, −38.7° to +41.0°:
> that is a different capsize, not a better turn.
>
> ⛔ **So the owner's question — "does the turn stay sharp?" — is not answered by this face.** §6.4 reads the same
> three quantities on his own water, and they are not the ride analyzer's columns either. `model` is the arm with the
> case for being safe on that question, and the case is §5.2's **1.000× on every ask**, which is an argument about
> the law and not a ride.

### 6.4 ⭐⭐ AND ON THE REAL CANYON — his own spot, `?canyonWaves=true`, bed B, through `RideSession`

54 placed riders on the real Canyon B solver (**seatbelt read and printed: 400 × 451 = 180 400 cells**, spun up on the
CPU in 66.1 s, focus −112.00 / −125.00), 3 arms × 3 stances × 3 steers × 2 trials, each placed 0.75 m ahead of the
break point and ridden until it came off.

| what | result |
| --- | --- |
| ⭐⭐ **runs that entered the mismatch region (\|θ_t\| > 0.87 rad)** | ⭐⭐ **54 of 54** |
| ticks where the body's handover ≠ the secant the probe computed | ⭐ **0** |
| ticks where the schedule's coordinate ≠ the body's | ⭐ **0** |
| ticks with a non-zero handover OFF the switch | ⭐ **0** |
| runs that fell, in every arm | **54 of 54**, all within 2.2 s |
| ⛔ **the fall, `model` against the default, over 18 cells** | ⛔ **same frame in 11, sooner in 4, later in 3** |
| ⛔ **the fall, `design` against the default** | ⛔ **same in 5, SOONER in 10, later in 3** |
| cells whose whole run is bit-identical to the default | **3 of 18** (`model`), **2 of 18** (`design`) — because 54 of 54 runs pass the stop |

> ⭐⭐⭐ **54 of 54 is the headline this round did not expect to get.** The 100× disagreement is not an exotic corner
> of the state space on the owner's own spot: **every single Canyon run goes there.** That is the strongest form the
> justification takes, and it is a measurement rather than an argument.
>
> ⛔⛔ **And the fall still does not move.** `model` leaves 11 of 18 cells falling on the identical frame and moves
> the rest by at most 0.317 s in both directions; `design` falls **sooner in 10 of 18**. **Every cell of every arm
> falls.** This is the expected outcome and it is reported as the answer, not as a disappointment.
>
> ⚠️ **The sharpness on his own water, and it is not an improvement.** `design` drives the peak body lean **to the
> ±70° clamp** where the default sat at −45.4° (tall, neutral, trial 1) and flips that run's net heading change from
> **−19.2° to +3.8°**; `model` pushes Compress's neutral trial 2 from **−16.4° to −70.0°**. ⛔ **A bank that reaches
> its own clamp is a capsize, not a committed turn**, so these are not "sharper" and not "gentler" — they are
> different capsizes. And **48 of the 54 runs' climb is NEGATIVE** (the range is **−0.299 to +0.073 m**): a rider
> placed on a crest descends, which is exactly why §6.3's warning stands — ⛔ **these three columns are not the ride
> analyzer's bottom-turn record and the owner's 42° / 40° / 0.296 → 0.995 m target still has no reading against it.**

---

## 7. The source change, and what it does NOT touch

| file | what moved |
| --- | --- |
| `predictiveBalance.ts` | `DesignWeights.twistStop?: 'model' \| 'design'`; `SCHEDULE_TWIST_K` and `twistKnots`; `scheduledDesign`'s fifth argument (and `'model'`'s shipped gain row, the same shape as `heaveGains: 'free'`); `blend`'s fifth axis; `tick`'s ninth argument; the read-only `schedTwistK`. |
| `AttachedRider.ts` | `AttachedRiderOptions.twistStop`; the weights route beside `stanceDeep`'s and `plantFloor`'s; the **secant, computed at the control tick from the same `over` and the same `TWIST_STOP` that `coupleYaw` applies**; the read-only `twistModelK`. |
| `PhysicalMode.ts`, `SurfZoneSimulation.ts`, `SurfZoneRunner.ts`, `RideSession.ts`, `main.ts` | the switch, the config field, the two forwarding hops, and the online room's pin. |
| `twistStop.test.ts`, `PhysicalMode.test.ts` | 11 tests: the knots, the secant's identity, the first knot's bit-identity, `model` against `design`, the controller's byte-identity below the stop, the reference's square torso, the handover through the game and through a `RideSession`, and the whole carve frame for frame. |

### 7.1 The cost, measured

A design solve is **1.6–11 ms** and is cached, so the first control tick that crosses the stop at a new
(speed, depth, rail, knot) cell pays up to **eight** of them — **one frame's hitch, once per cell** — and every tick
after it is a cache hit at **0.017 ms**. The per-tick mixing goes from eight designs to sixteen, about 16 000
multiplies a tick. The cache's own ceiling goes from 17 × 4 × 6 = **408** designs per weights set to 17 × 4 × 6 × 5 =
**2 040**, and only the cells a ride visits are ever built. ⚠️ **Off the switch none of this happens at all:** the
eight-design path is taken and the arrays are the ones `blend` always built.

⛔ **No force, torque, bound, gain, pose or constant in the game moved.** `TWIST_STOP`, `TWIST_BODY_RANGE`,
`TWIST_BODY_TORQUE`, `TWIST_STIFFNESS`, `TWIST_DAMPING` and `coupleYaw` are **untouched**. The two new fields are
read-outs and are written in both arms.

---

## 8. What I could not separate, as gaps and not as caveats

1. ⛔ **The Canyon's own sharpness.** The ride analyzer's bottom-turn bank, course swing and carry were not measured,
   so the owner's 42° / 40° / 0.296 → 0.995 m target has **no reading against it in this round**. It is the first
   thing to close, and it needs a sea run with a wave frame, not a steeper analytic face.
2. ⛔ **3.5i's +10 J wind-up window is not reproduced here.** That figure is a `cue`-trace quantity over a named
   0.633 s window of one saved ride; §6's works are whole-run works on 0.6–2.1 s capsizes and the two are **not
   comparable**. What this round says about the neutral regime is that **4 of 9 fixture cells and 6 of 9 session cells
   are bit-identical** there, and that where they are not the work moves by about 1 J in 55–65.
3. ⛔ **The six-step prediction.** §3.2's error is one control step. The loop predicts over 0.1 s, and over six steps
   the error compounds with the commands already sent; that is the number that would price the correction properly.
4. ⛔ **The stop's damping** (§1), **the estimator** (whether a corrected Φ makes the Kalman estimate better or worse
   is not separated), and **the board's half of the reaction**, which lives on the axis where the shipped yaw ledger's
   `rider` residual cannot close.
5. ⚠️ **One face, one seed, 0.6–2.1 s runs, and the rider falls in every cell of every arm.** The handover check rests
   on 54 cells; nothing else here does.
6. ⛔ **`design` is measured and not recommended**, and this file does not have the ride that would settle it. It is
   shipped reachable because the comparison needed it and because the owner may want to ride it.

---

## 9. Reproduction

```sh
S=<a scratch dir>
./node_modules/.bin/rolldown docs/research/new-rider/3.5/twist-stop.ts -o $S/raw.mjs --format esm --platform node
printf "globalThis.location = { search: '' };\n" > $S/ts.mjs && cat $S/raw.mjs >> $S/ts.mjs
node $S/ts.mjs                                          # results/35j/35j-design.txt

./node_modules/.bin/rolldown docs/research/new-rider/3.5/twist-stop-ride.ts -o $S/rr.mjs --format esm --platform node
printf "globalThis.location = { search: '?canyonWaves=true' };\n" > $S/tsr.mjs && cat $S/rr.mjs >> $S/tsr.mjs
MODE=parse   node $S/tsr.mjs                            # results/35j/35j-switch-chain.txt
MODE=fixture node $S/tsr.mjs                            # results/35j/35j-ride-fixture.txt
MODE=session node $S/tsr.mjs                            # results/35j/35j-ride-session.txt
MODE=sea SECONDS=4 TRIALS=2 node $S/tsr.mjs             # results/35j/35j-ride-canyon.txt (66 s of CPU spin-up)
MODE=bytes   node $S/tsr.mjs                            # the byte check's own trace; diff against the base branch
```

The wrapper prepends an **object**, never a bare string: a bare string silently benches the default Canyon through
`devTools.ts:9`.
