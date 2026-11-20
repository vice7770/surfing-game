# The body already banks with the deck — what fails is a term the contact threw away

> **⭐ THE BRIEF'S PREMISE IS REFUTED, AND THE REFUTATION IS THE FIX.** *"The body does not bank with it"* is not what
> the two columns say when they are read on the same frames. On the **shipped** rider, on the owner's own address and
> his own spot, **`d(body bank)/d(deck bank) = 0.8748`** through the origin over **7 208 live frames**, the body is
> banked the **same way** as the deck in **5 844 of the 5 987 frames** in which the deck is banked past 2°, and at a
> deck bank of **28.7°** the body's own bank is **26.0°**. The body is riding the deck round. **What it is is LATE:
> the follow gain reaches 1.000 at a lag of exactly 6 frames = 0.100 s**, which is `BALANCE_DELAY`, and on the
> analytic face **the mismatch IS the deck's roll rate times 73–104 ms over five rate bands and 4 374 frames.**
>
> **So the quantity that pins the stance is `lag × roll rate`, not a plumb posture.** At the Canyon's median roll rate
> of 55.1 °/s that is 5.5° — half the stance's 10.9° — and at its median *peak* of 194.7 °/s it is 19.5°, which is
> the 20°+ the fall needs. **The stance is not too narrow for a banked deck; it is too narrow for a deck that banks
> fast.**

**And what shipped is smaller than the brief asked for, because the measurement took the rest away.**
`AttachedRider.project` constrains the contact force to a line **through the body's centre of mass**. That is the
moment balance of a body with **no angular momentum of its own**, and this body has a trunk rotor. The identity is

```
p_x = com_x − height · F_x / N − (dH/dt)_roll / N
```

and the code had the first two terms. **`?bodyBank=hip` adds the third and nothing else: no force, no torque, no
gain, no drive, no constant.** On his own spot, turning, it takes **`limit = 'tip'` from 90 of 90 riders to 66 of 90**
and the share of live frames in which the centre of pressure is pinned from **52.0 % to 32.3 %**.

**It needed no hip drive, because the rotor was never torque-idle.** Step 3.5d's *"the swing carries 0.1–0.4 % of the
traffic"* is about the **rest command** the hip takes over from the ankle, not about its torque: `humanSwingStep` adds
the rotor's own return and damping term **outside** its ±SWING_TORQUE clamp, so on the **shipped** rider `swingTorque`
already reaches a per-rider **median peak of 165 N·m and a maximum of 303 N·m** — and `project` was discarding every
newton-metre of it. The new term fires in **3 061 of 6 425 live frames with the hip gain at zero.**

**The costs, measured and not softened:** the friction cone binds in **28 of 90 riders against 6 of 90**, two riders
are released as `foot slip` where none was, and the **median ride is 1.083 s against 1.333 s**. 90 of 90 still fall.

---

## 0. What this round did not do, said first

- **It did not add the body lean the spec's step 3.1 describes**, because the bench says the body already leans. What
  it added is one missing term in the contact's own bound.
- **It did not reduce the lag**, which is now the named cause. §6 says why that is not a thing a joint can do without
  a prescription, and §7 is the staged plan.
- **It did not widen the foot support.** `riderPosture.ts:96`'s ±0.130 m is untouched, as the owner ruled.
- **It did not stop the falls.** Per Ruling F (`engine-target.md`, 2026-11-18) a survival rate is not a metric here;
  the acceptance test used is the brief's own — *"does `tip` still fire 90 of 90?"*
- **One prediction of mine it refuted:** I wrote, before measuring, that the board's roll *"is expected to get worse,
  not better."* It got **better** — per-rider median roll peak **65.7° → 52.4°**, median roll rate **55.1 → 45.2 °/s**
  — because a contact that stays feasible lets the ankle's own counter-roll reach the board at all, where before the
  solve went apart and dropped it. §5.
- **One design of mine the measurement removed.** It was built with a hip drive beside the term, at the one gain its
  units derive (`m g` = 716 N·m/m). §4 is the three-way A/B that took it out.

---

## 1. The term, and why it is a bound and not a force

### What `project` asserts today

```ts
const freeX = local.x - (height * j.x) / j.y;     // :5449, before
```

`local.x` is the rider's centre of mass across the board, `height` its height over the deck, `j` the contact impulse
in the board's frame. So `freeX` is **where the line from the centre of mass along the contact force meets the deck**,
and the clamp then holds it inside the foot support (`limit = 'tip'`). The function's own header says it: *"the nearest
impulse a body on a deck can give: pushing only, **along a line through its centre of mass**, that meets the deck
inside the support."*

### Why that line is wrong for a body with a trunk

Take the whole body — legs, trunk, head, arms — with its centre of mass at `(com_x, com_y)` and the ground reaction at
the centre of pressure `p` on the deck. The angular impulse about the centre of mass, resolved about the board's own
**−z** (the axis the `swing` rotor turns on), is

```
(p_x − com_x) · N  +  height · F_x  =  −(dH/dt)_roll
```

so

```
p_x = com_x − height · F_x / N − (dH/dt)_roll / N
```

`freeX` is that with `dH/dt ≡ 0`. **That is exactly true of a point mass and exactly false of a hip strategy**, whose
whole mechanism in the human-balance literature is that the trunk's angular momentum rate takes up the moment so the
centre of pressure does *not* have to travel: it is the term behind Hof, Gazendam and Sinke's (2005) own capture point,
behind Vukobratović and Borovac's (2004) zero-moment point, and Herr and Popović (2008) measure that walkers regulate
precisely this `H`. Without it **the model's rider pays for his own hip strategy at the sole and can never profit from
it** — which is why step 3.2x, driving the hip hard with the bound uncorrected, found *"the more range the rider has
to throw, the more harm a pumped hip does"* and *"falls sooner on 36 of 60 rides."*

### What the switch writes

```ts
const moment = this.banksBody && this.swingTorque !== 0
  ? -h * this.swingTorque * this.rollLocal.copy(this.rollAxis).applyQuaternion(this.spin).z : 0;
const freeX = moment === 0 ? local.x - (height * j.x) / j.y : local.x - (height * j.x + moment) / j.y;
...
let tx = moment === 0 ? ((local.x - copX) * normal) / height : ((local.x - copX) * normal - moment) / height;
```

- **`d(H_rotor · rollAxis)/dt = +swingTorque`**, and the two signs that compose to it are both read in the code: the
  drawn swing turns about **+z** of the body frame (`swung`, `:3063`) while `rollAxis` is **−z** of the heading
  (`prepareBank`, `:3520`), and `humanSwingStep` writes `swing.rate -= h·swingTorque / I`.
- `rollAxis` is resolved into the **board's** frame (`this.spin` already holds `q⁻¹`) and its `−z` component taken, so
  the term is exact at any roll and pitch rather than assuming the heading's axis is the board's.
- The second line is the same term **inverted**, so the tangential that realises a *clamped* centre of pressure carries
  the rotor's moment too; unclamped it returns `j.x` identically, as it does off the switch.
- **`moment === 0` is the shipped expression, character for character**, so with the switch off not one extra
  floating-point operation runs.

**Nothing is prescribed and nothing is invented.** The rotor's torque is bounded, its travel is bounded by the
stance's own hip range, it must be brakeable inside that range, and its couple was **already** booked on the board at
`rhs[3..5]`, in row 7, and in the work ledger (`finish`, `:5074`). What changed is the bound the contact is held to.

### Deliberately not corrected

The roll axis's component about the board's own **along** axis is second order (`sin(pitch) · sin(roll)`), and the
pitch rotor (`StandingBody.hip.torque`) has a moment about the across axis that would correct `freeZ` the same way.
**Both are left exactly as they ship**, so this is one change on one axis — the axis the mechanism was diagnosed on.
`projectHold` (not upright) is untouched: there is no standing rotor there.

---

## 2. The instrument, and its own faults first

The probe is **`3.5/bank.ts`** beside this file, built on `3.5/slip.ts`'s rig (PR #419) with its three settled
corrections kept: every bind read off **`limitTime`** and never off the last substep's `limit`; every run **cut at its
first `attached == 0`** because `separate` (`:5227–5232`) never clears `phase` or `upright` and freezes every rider
column; and **`SINK=0.06`**, without which the flush placement every rig in this track uses starts the hull dry and
the leg unloaded, costs a median 32 frames of settling, and loses a fifth of the bench before it is a ride. **Every
figure below is `SINK=0.06`, and it is used in every arm.**

Fields TypeScript calls private (`limit`, `limitTime`, `desiredCop`, `rawMargin`, `legLoad`, `hipCapture`) are read
through one accessor that only gets. Two read-only fields were added to `AttachedRider`: `copRelief` (the term as a
length, m) and `copMoment` (the same as a torque, N·m).

### ☠️ Three faults of my own, found by my own controls, and two of them would have produced a wrong number

1. **A control whose denominator was the wrong load.** The first bound check compared `|copRelief|` in metres against
   `SWING_TORQUE / (contact.load · m g)` — **the step's load against a relief computed from the substep's own normal
   impulse** — and flagged 6 frames at a **67 m** relief. The relief really is metres wide when the feet go light
   (`h·τ / j_y` with `j_y` near zero), and **that is the correct statement**: a hip strategy on unweighted feet buys
   nothing, the clamp binds, and the solve goes apart. The quantity that **is** bounded is the moment, and the exact
   bound is `|copMoment| ≤ |swingTorque|` — load-free, and the one a control can check. **0 breaches in 15 238 live
   frames across three arms.**
2. **And `|copMoment| ≤ SWING_TORQUE` is NOT the bound** — a second version of the control assumed it and flagged
   2 frames. `humanSwingStep` clamps only its `burst` to ±SWING_TORQUE and then **adds the rotor's own return and
   damping term on top**, so `swingTorque` reaches **303 N·m on the shipped rider**. That is a pre-existing fact about
   the class, found by this control, reported rather than smoothed — and §3 is where it turns out to matter.
3. **My positive control tested the wrong thing.** `CONTROL=pos` at 20° of face and 10 m/s puts the pair **in flight
   from frame 10** (`limit = 'flight'`, `load = 0`, hull launched), which is `board-slips-away.md` §3's launch regime
   and not the clamp at all. In that cell the switch is a **complete no-op** and all three arms are identical to the
   third decimal — a true reading of a useless cell. The loaded cells in §5 are the positive evidence instead.

### The controls, and what a broken result would have looked like

| control | what a break would look like | what it showed |
|---|---|---|
| **relief must be 0 off the switch** | a non-zero `copRelief` on the shipped rider would mean the gate leaks | **0 in 4 446 of 4 446** grid frames and **0 in 5 292 of 5 292** byte-bench frames ✅ |
| **the `tip` detector must fire** | `tip` reading 0 on the shipped arm would mean the detector is broken (fault: `limit` is **one substep of 32**) | **3 803 of 4 446** grid frames; **90 of 90** sea riders at frame 46 ✅ |
| **the term's own bound** | `|copMoment| > |swingTorque|` would be a bug in the projection | **0 breaches, 15 238 frames** ✅ |
| **`mismatch` must not be a tautology** | the two columns being one read would make it identically 0 | `bank` is the body's centre-of-mass lean (`frame`, `:5256`), `roll` the board's orientation (`prepareBank`); neither is computed from the other, and the shipped arm's own spread is 0.16–9.48° per rider ✅ |
| **no filter against `NaN`** | tonight's own published zero | every threshold is `Number.isFinite(x) && …`, and **every share is printed beside its count** so an empty filter reads as 0 of N rather than as a clean 0.00 ✅ |
| **negative control** — 0.5° face, planing at 6 m/s, stick never touched, 1.5 s | a bound cone or a large relief in quiet trim | nothing bound, relief 0, and **the two arms are identical** (misMed 0.274°, misPeak 1.443°, 90 frames each) ✅ |
| **the probe is inert** | the extra read-outs changing the solve | **76 296 values over 3 468 frames × 22 shared columns, 0 differences**; **72 of 72** run outcomes identical in `(fellAt, cause, frames)` ✅ |

### The default, proven byte-identical rather than asserted

The probe was built **twice** — once against this branch's `src`, once against the merge base `1a29a6c7`'s own `src`,
checked out into the same worktree and restored — and both bundles run on the same 96 cells (4 slopes × 4 speeds ×
3 stances × 2 sticks):

> **5 292 frames × 53 shared columns = 280 476 values, 0 differences, and all 96 run summaries identical in
> `(fellAt, cause, frames, misMed, misPeak, rollPeak, bankPeak, nTip)`.**

The four columns excluded are `relief`, `copNm` and the two derived from them (`tol`, `inTol`): the base build has no
such fields, so `Math.abs(undefined)` is `NaN` there and they are `null`/`false` **by construction**, carrying no
physics. `relief` and `copNm` are **0 in all 5 292 frames** of the switched build's default arm.

### The Canyon seatbelt, read and printed

The bundle is run under a wrapper that **prepends an OBJECT** `globalThis.location = { search: '?canyonWaves=true' }`
— a bare string silently benches the default Canyon through `devTools.ts:9`. **Read off the solver: grid
`400 × 451 = 180 400` cells — Canyon B, not the default Canyon's 400 × 507 = 202 800 — spun up on the CPU in
59.1–64.5 s** on each of the five sea runs, `search` echoed as `?canyonWaves=true`. No ledger was turned on.

---

## 3. ⭐ THE BODY ALREADY BANKS WITH THE DECK — the quantity the last round said was absent

`MODE=sea`, the Canyon as `?canyonWaves=true` builds it, `canyonBed: 'b'`, seed 1, medium swell, stage 2,
`compute: 'cpu'`; **90 riders = 10 entry speeds × 3 stances × 3 trials**, placed 0.75 m seaward of the break point at
45° off the fall line, **stick hard over** (the arm `board-slips-away.md` §5 showed is the owner's ride), each run cut
at its first `attached == 0`. `RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on`, `SINK=0.06`. **7 208 live frames.**

**`bank` is `AttachedRider.bank.angle`** — how far the body's centre of mass leans over its feet from the **world's
vertical** about the heading's side axis. **`roll` is the deck's own** from the **world's level** about the same axis,
computed in the probe as `atan2(up · side, up.y)` with `side = (fwd.z, 0, −fwd.x)`, which **is** `X` turned by the
heading and therefore is `prepareBank`'s own `roll` to the digit. Their difference **is the ankle's own angle**, the
datum of `HUMAN_ANKLE_STIFFNESS × (bank.angle − roll − ankleRest)`.

### The follow, on the SHIPPED rider

| deck bank band | frames | median \|deck bank\| | median body bank, signed with the deck | median \|mismatch\| |
|---|---|---|---|---|
| 0–5° | 2 128 | 1.91° | 1.20° | 1.51° |
| 5–10° | 652 | 7.50° | **8.30°** | 2.92° |
| 10–20° | 1 313 | 14.44° | **14.26°** | 3.65° |
| **20–40°** | **1 578** | **28.73°** | **25.98°** | **3.86°** |
| 40–180° | 1 537 | 55.82° | 49.84° | 7.40° |

> **`d(body bank)/d(deck bank)` through the origin = 0.8748 over 7 208 frames**, and the body is banked the **same way
> as the deck in 5 844 of the 5 987 frames** with the deck past 2° (0.976). **The shipped body is not standing plumb
> on a tilted board.** A body that stood plumb would give a slope of 0 and a median body bank of 0 in every band.

**`board-slips-away.md` is not wrong about anything it measured** — it measured the mismatch at the fall and the
stance's width, and both reproduce here exactly (§5). It said of this quantity, correctly, *"the body's bank against
the deck's — the quantity that is currently absent."* **It is no longer absent, and it does not say what the brief
built on it.**

### What the body is instead: 0.100 s late

The same 90 runs, grouped **by rider** (a first version grouped the whole file as one run, because the summaries come
at the end of the file — found by reading the run count, 1 instead of 90, and fixed):

| lag, frames | frames | slope `d(body)/d(deck at t − lag)` | median \|mismatch at that lag\| |
|---|---|---|---|
| **0** | 7 208 | 0.8748 | **2.950°** |
| 2 | 7 028 | 0.9182 | 3.356° |
| 4 | 6 848 | 0.9580 | 3.611° |
| **6 = 0.100 s** | 6 668 | **0.9987** | 4.490° |
| 10 | 6 322 | 1.0821 | 7.301° |
| 24 | 5 146 | 1.4085 | 16.118° |

> **The follow gain reaches 1.000 at a lag of 6 frames = 0.100 s**, which is `BALANCE_DELAY` and `PITCH_DELAY` to the
> millisecond. ⚠️ **Lag 0 still minimises the mismatch**, so this is a gain-and-lag trade and not a pure transport
> delay — the body is in phase and short, not late and full. Both readings are given; neither alone is the law.

### The decisive form: the mismatch is the roll RATE times a time

`|mismatch| = τ · |deck roll rate|` through the origin, per rate band:

| rate band, °/s | FaceWater: frames | median rate | median \|mismatch\| | **ratio, ms** | Sea: frames | ratio, ms |
|---|---|---|---|---|---|---|
| 0–20 | 1 404 | 6.69 | 0.49° | 72.8 | 1 907 | 228.4 |
| 20–50 | 913 | 32.96 | 2.41° | 73.2 | 1 421 | 79.9 |
| 50–100 | 863 | 74.96 | 6.46° | 86.2 | 2 065 | 45.7 |
| 100–200 | 737 | 139.74 | 12.22° | 87.5 | 1 385 | 50.2 |
| > 200 | 457 | 235.02 | 24.38° | 103.7 | 340 | 40.0 |
| **all** | **4 374** | 43.61 | 3.68° | **106.1** | **7 118** | **38.7** |

> **On the analytic face, where the roll is sustained, the mismatch is the deck's roll rate times 73–104 ms across
> five bands and 4 374 frames — `BALANCE_DELAY`.** ⚠️ **On the real sea it is 40–80 ms worth above 20 °/s and the
> ratio is not flat**, because the sea's roll excursions are briefer than the lag: the body never falls the full
> 0.1 s behind. **So "the mismatch is the lag times the rate" is a law on the face and a direction on the sea**, and
> the sea is the water he rides.

**The arithmetic that closes `board-slips-away.md`'s number.** The stance tolerates **10.9°** at the median 0.676 m
centre of mass. A 0.100 s lag reaches 10.9° at a roll rate of **109 °/s**. Measured on his spot, turning: the median
roll rate is **55.1 °/s** (half of it) and the median per-rider **peak** is **194.7 °/s** (nearly double it), and
**1 495 of 7 118 frames (21.0 %) are above 109 °/s.** **The stance is not too narrow for a banked deck. It is too
narrow for a deck that banks fast.**

---

## 4. The three-way A/B that removed the hip drive

Built with a drive beside the term, at the one gain its units derive: `HIP_CAPTURE_GAIN`'s unit is N·m per metre, and
`m g × d` = **716 N·m/m** at 73 kg is the rotor torque whose own angular momentum rate relieves the demanded centre of
pressure by exactly `d` — so it is derived, not swept (3.2x swept 35–2 000 by hand). Same 90 riders, same spot, same
seatbelt, four arms:

| | **ships** | **the term alone** (what shipped) | **the drive alone** 716 N·m/m | **term + drive** |
|---|---|---|---|---|
| live frames | 7 208 | 6 425 | 6 116 | 4 845 |
| fell | 90/90 | 90/90 | 90/90 | 90/90 |
| median fall | **1.333 s** | 1.083 s | 1.158 s | **0.917 s** |
| **`tip` fired** | **90/90** | **66/90** | **90/90** | 76/90 |
| first `tip` frame | 46 (0.767 s) | 38.5 (0.642 s) | 23.5 (0.392 s) | 37 (0.617 s) |
| **frames `tip` binding** | 3 745 = **52.0 %** | 2 072 = **32.3 %** | 3 432 = **56.1 %** | 1 206 = 24.9 % |
| \|mismatch\| past the stance's own tolerance | 74/90 | **36/90** | 63/90 | 35/90 |
| frames past tolerance | 0.101 | **0.025** | — | 0.037 |
| follow gain | 0.8748 | **0.8718** | — | **0.7955** |
| friction cone bound | 6/90 | 28/90 | 9/90 | 23/90 |
| `foot slip` releases | 0 | 2 | 0 | 2 |
| relief non-zero frames | 0 | 3 061 | 0 | 2 894 |

> **The ordering is `term < term + drive < drive alone` on every column that matters.** 3.2x's *"the more the hip
> throws, the sooner he falls"* **survives the correction that was supposed to pay for it**, and step 3.2z already
> named why: `reachAcross` credits the fall test on the hip range **remaining**, so a rider who spends the range to
> move his weight is credited with nothing left to catch it. **The gain is left at 0 for the third time, with the
> third measurement**, reachable only through `balance.hipCapture` for the probes.
>
> ⭐ **And the drive alone made `tip` fire EARLIER than the shipped rider — frame 23.5 against 46 — while leaving it
> at 90 of 90.** That is the clearest statement available of what the missing term was doing: driving the hip without
> it is strictly worse than not driving it at all.

**`?bodyBank=hip` is now the term-alone arm, proved rather than asserted:** rebuilt after the restructure and run on
the same 90 riders, it reproduces the `HIPGAIN=0` arm over **6 425 frames × 54 shared columns = 346 950 values, 0
differences**, with all 90 run summaries identical.

### ⭐ The sign, checked WITHIN one run — no second arm, so no trajectory divergence can confound it

`freeX_new = freeX_old + copRelief` by construction, so **`wantX − relief` is the demand the shipped code would have
had on the very same frame.** Over the **3 061 frames in which the term fires** on the 90-rider Canyon bench:

| | with the term | without it, same frame |
|---|---|---|
| median \|demanded centre of pressure\| from the stance's middle | **0.0355 m** | 0.0800 m |
| demand **inside** the ±0.130 m support | **2 739 / 3 061 = 0.895** | 1 914 / 3 061 = 0.625 |

> **The term moved the demand INWARD in 2 330 of 3 061 frames (76.1 %) and outward in 731 (23.9 %)**, and it more
> than **halves the median demand**, bringing it inside the feet on **27 percentage points more** of the frames in
> which it fires. **That is the sign, proved on matched frames rather than inferred from an arm comparison.**
>
> ⚠️ **The 23.9 % that goes the wrong way is real and is the honest other side**: the rotor's torque includes its own
> return and damping term, which sometimes points away from where the body needs to go, and the term faithfully books
> that too. **It is not a one-way credit.**

---

## 5. What shipped, measured on his own spot

### The shipped baseline reproduces PR #419 exactly

`tip` in **90 of 90** at a median first frame of **46 = 0.767 s**; board roll past 20° in **80 of 90** at frame **41 =
0.683 s**; causes **balance 89, lost board 1**; median fall **1.333 s**; the friction cone bound in **6 of 90** at
frame 60.5. Every one of those is `board-slips-away.md` §5's own figure. **The baseline is the same bench.**

### With the term

| quantity, per-rider medians over 90 riders | ships | `?bodyBank=hip` |
|---|---|---|
| `tip` fired | **90/90** | **66/90** |
| frames with `tip` binding | 3 745/7 208 = **52.0 %** | 2 072/6 425 = **32.3 %** |
| frames inside the stance's own tolerance | 0.900 | **0.976** |
| \|mismatch\| median / per-rider peak | 2.982° / 17.413° | **2.572° / 17.545°** |
| \|mismatch\| worst rider | **9.483°** | **7.011°** |
| \|mismatch\| at a deck bank of 20–40° | 3.86° | **3.39°** |
| \|mismatch\| at a deck bank of 40°+ | 7.40° | **5.17°** |
| the stance's tolerance, median peak | 12.447° | **38.581°** |
| board roll, median peak | 65.651° | **52.432°** |
| board roll rate, median | 55.140 °/s | **45.240 °/s** |
| body bank, median peak | 64.879° | 34.508° |
| the ±70° bank-reading clamp hit | 271 frames, 42/90 riders | **101 frames, 14/90** |
| balance margin < 0.1 | 52/90 | **14/90** |
| friction cone bound | 6/90 | **28/90** |
| median ride | **1.333 s** | **1.083 s** |
| causes | balance 89, lost board 1 | balance 88, **foot slip 2** |

**The tolerance column is the mechanism, stated as geometry.** `atan((0.130 + |relief|) / height)` is the mismatch the
stance can take **now**: **10.887° median off the switch** — `board-slips-away.md`'s own 10.9°, recovered
independently — and a **median per-rider peak of 38.6°** on the switch, which covers the 20°+ a turn demands in the
frames where the trunk is actually turning. ⚠️ **Its own median stays at 11.678°**, because the relief is zero or near
it most of the time: **the term widens the stance exactly when the trunk is moving and never otherwise.**

### Second population: the analytic face

`FaceWater`, 72 riders = 3 slopes (12/16/20°) × 4 entry speeds (4/6/8/10 m/s) × 3 stances × 2 sticks, 4 446 and 3 968
live frames. **The face is much harsher than the sea and the term buys much less there**, which is worth stating
plainly:

| | ships | `?bodyBank=hip` |
|---|---|---|
| `tip` fired | 72/72 | 71/72 |
| frames with `tip` binding | 3 803/4 446 = **85.5 %** | 3 241/3 968 = **81.7 %** |
| frames inside tolerance | 0.701 | **0.792** |
| frames past tolerance | 0.304 | **0.212** |
| \|mismatch\| median per rider | 6.325° | **4.006°** |
| board roll, median peak | 50.014° | **28.462°** |
| friction cone bound | 2/72 | **37/72** |
| median ride | 0.733 s | 0.733 s |

**On the face the cone's cost is at its worst — 2 of 72 to 37 of 72 — and the ride does not move at all.** The sea is
the water he rides, but this is the honest other population.

---

## 6. Where the reaction goes, and the prediction it refuted

**The reaction was already paired before this round.** The rotor's couple is booked three ways and none of them is
new: the body takes `−h·τ/L` across on row 7 (`rhs[7] -= h × swingTorque / length`, `:4731`), the pair takes
`−h·τ·rollAxis` on its angular rows (`rhs[3..5]`, `:4735–4737`), and `finish` books the work on the board at the mean
of its spins (`:5072–5075`). The bank ledger books both (`:4760`, `:4763`). **This round adds no entry to any of
them**, because it adds no force — it corrects the bound a force was being tested against.

**What the term does to the board is therefore indirect, and it is the opposite of what I predicted.** I wrote that
the board's roll would get worse. Measured:

| | ships | `?bodyBank=hip` |
|---|---|---|
| board roll, median peak | 65.651° | **52.432°** |
| board roll, worst rider | 92.383° | 96.944° |
| board roll rate, median | 55.140 °/s | **45.240 °/s** |
| board roll rate, median peak | 194.660 °/s | 172.355 °/s |

**The mechanism, and it follows from the code rather than from the numbers.** `tip` firing makes
`projected ≠ impulse`, so `feasible = false`, so `BoardBody` takes the `pushCapped` branch and **the two are solved
apart** — and apart, the body is driven by the projected impulse and `external` alone (`finish`, `:5042–5049`): **the
ankle's torque, the rotor's torque and the pitch hip all vanish from that substep.** So the shipped rider loses his
own joints in **52.0 %** of his frames. With the bound corrected he loses them in **32.3 %**, and the ankle's own
counter-roll — which 3.5d measured at **45–56 % of the deck's roll acceleration** — reaches the board instead of
being dropped. **The board rolls less because the contact holds long enough for the ankle to act.**

⚠️ **That is a cost as well as a gain, against a standing requirement.** Memory `steep-faces-for-tricks` wants *more*
roll authority, not less, and rolling the board **is** turning it: a median peak of 52° instead of 66° is a less
committed turn. **Only the owner can price that**, and it is why nothing here is proposed as a default.

---

## 7. The stages, now that the cause has a name

**Stage 1 (this PR, `?bodyBank=hip`): the contact's bound stops discarding the trunk's angular momentum.** Done,
opt-in, default byte-identical over 280 476 values.

**Stage 2: the same term on the other axis.** `StandingBody.hip.torque` is a rotor about the **across** axis with its
own 200 N·m and its own couple already booked (`:4769`), and `freeZ` discards it exactly as `freeX` discarded the
roll. It is three lines and the same identity. Not done here because this round is one change on the axis the
mechanism was diagnosed on, and `board-slips-away.md` found the along direction is not what pins
(`pastZ` never led).

**Stage 3: the lag, which is now the named cause — and the honest statement is that it may not be reducible.** The
mismatch is `lag × roll rate` with the lag at `BALANCE_DELAY = 0.100 s`, which is sourced (leg postural responses
start at 90–100 ms; Nashner 1977) and is not a number to tune away. What *is* open:
- **The passive ankle acts at once and already carries the fast part.** Its spring is 800 N·m/rad against the body's
  toppling 484, so the free body's own period is `2π√(I/(k − mgL))` = `2π√(33.6/316)` ≈ **2.05 s** — and a deck that
  banks 20° in 0.68 s is a third of that period. **The body cannot follow a 0.68 s roll with a 2 s pendulum**, and
  raising the spring is step 3.2's own settled dead end (doubled to 1 600/160 and swept, it did not damp the roll).
- **So the reachable lever is the roll RATE, not the lag.** The term in this PR already cut the median rate 55 → 45
  °/s as a side effect. A rate that a rider can hold is the honest version of `board-slips-away.md`'s option 4, and
  it contradicts `steep-faces-for-tricks`. **It is a ruling, not a build.**
- **The one thing that would genuinely reduce the lag is a feed-forward on the rider's own command.** The player asks
  for the bank (`bankReference`, `leanAsked`); a body that anticipates its own steering input does not need to sense
  the deck first. `HUMAN_BANK_FORWARD` is **already that term, at 0.1 rad of rest per rad asked**. Raising it is a
  one-constant change inside an existing, sourced loop — and it is a **command**, not a motor. **This is the next
  thing I would measure**, and I have not.

**Stage 4: the fall test's own double count.** Step 3.2z measured that the hip's correction and the fall test's
reserve are the same budget (`reachAcross` credits the range *remaining*), which is what makes every hip drive cost
more than it buys. **Until that is settled, no hip drive can be judged fairly**, and §4's ordering should be read with
that caveat.

---

## 8. Known gaps, stated

- **No figure here is a ride.** Every rider is placed, holds one stance, and holds the stick hard over for the whole
  run. **A player modulates**, and the owner's own standing instruction is that bot rides are not evidence of feel.
  Nothing here is offered as such.
- **The stick-zero arm was not re-run on the switch.** §3–§6 are the hard-over arm, which `board-slips-away.md` §5
  established is the one that reproduces his report. The quiet arm is a gap.
- **One seed, one swell, one spot.** `SEED=1`, medium, Canyon B, 3 trials 1.5 s apart — three phases of one swell,
  not three swells.
- **The 12 m/s cell fails at 8 frames in all 9 riders in every arm** and is in the medians as published; it is a
  placement that fails immediately rather than a ride, and it is flagged here rather than dropped.
- **`relief` is metres wide in a light-footed substep** — up to 10.5 m on one rider. That is the correct statement of
  the identity (a hip strategy on unweighted feet buys nothing) and the clamp and the friction cone are what the
  solve then acts on, not that number. **It is not gated**, deliberately: a gate would be an extra assumption.
- **Overshoot is real and counted:** the relief carried the demand past the support's **far** edge in **278 of 6 425
  frames (4.3 %)**. Throwing the trunk too hard tips you the other way, and the model now says so.
- **The rotor's torque exceeds its own named bound** (303 N·m against SWING_TORQUE = 200) on the **shipped** rider,
  because `humanSwingStep`'s return term sits outside the clamp. Found here, not fixed here, and every relief figure
  above is read against the live torque rather than against the constant.
- **Populations are stated with every number, every median is a PLAIN median** (the mean of the two middle elements at
  even length), and this track's `qt(v, 0.5)` — the **upper middle** — is used **nowhere** in this document.

---

## 9. Verification

| check | result |
|---|---|
| `./node_modules/.bin/tsc -b` | **clean, exit 0** |
| `vitest run src/physics --maxWorkers=1` | **58 files, 638 passed, 21 expected fail (659)**, 253 s, one worker (before the new test file) |
| `vitest run src/physics/bodyBank.test.ts` | **3 passed** — the gate off by default (the rotor turns, every newton-metre discarded), `|copMoment| ≤ |swingTorque|` and zero exactly when the torque is, and the option matched as a string |
| `vitest run src/game/PhysicalMode.test.ts` | **109 passed** (108 before), the new one covering `?bodyBank=hip`, its rejections, all three spots and the online-room pin |
| `vitest run src/wave/SurfZoneRunner.test.ts` | **43 passed**, run by hand (it is outside the merge suite; memory `runner-test-file-excluded`) |
| probe builds | `rolldown` clean, 2 201 kB |
| **default byte-identical** | **280 476 values over 5 292 frames × 53 shared columns, 0 differences**; 96 of 96 run summaries identical; `relief`/`copNm` 0 in 5 292 of 5 292 |
| **probe inert** | **76 296 values over 3 468 frames × 22 shared columns, 0 differences**; 72 of 72 outcomes identical |
| **switch == the measured arm** | **346 950 values over 6 425 frames × 54 columns, 0 differences** against the `HIPGAIN=0` run it was chosen from |
| the term's own bound | `|copMoment| ≤ |swingTorque|`: **0 breaches in 15 238 frames** |
| the term's own **sign**, within one run | demand moved inward in **2 330 of 3 061** firing frames; median demand **0.0800 → 0.0355 m**; inside the support **0.625 → 0.895** |
| Canyon seatbelt | wrapper **prepended as an object**; grid read off the solver as **`400 × 451 = 180 400`** (Canyon B); CPU spin-up **59.1–64.5 s** on five runs |
| deletions vs the merge base | **5 lines, all replaced in place**: three one-line switch lists that gained `bodyBank`, and `project`'s `freeX` and `tx`, each of which gained a ternary whose `moment === 0` branch is the old expression character for character |
| no ledger turned on | `bankLedger` left off; the probe reads only, through one accessor |

**Scratch files were deleted.** Nothing was installed; `node_modules` is a symlink to the main checkout's; `tsc` was
run as `./node_modules/.bin/tsc`; every bench ran one worker and one process at a time.
