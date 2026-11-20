# What a full steer asks of the lateral contact, traced from the stick to `wantX`

Written 2026-11-19 on branch `claude/steer-demand`, cut from `claude/the-record` at **beaeaf70** (the 2×2's merge).
**Reading and tracing only: `git diff` over `src` is empty, no probe was run, no constant, force, switch or pose was
touched.** Everything below is either read in the code, arithmetic on numbers the 2×2 and the 3.3 rounds already
published, or named as unresolved.

Tags, as the track uses them: **[R]** read in the code · **[M]** measured by a probe, with its population · **[A]**
arithmetic on measured numbers, labelled as such · **[I]** my inference from a stated model.

---

## 0. The answer, in seven sentences

1. **`wantX` is `freeX`** (`AttachedRider.ts:5364`): `local.x − height · j.x / j.y`, where `local` is the body's centre
   of mass in the board's frame, `height` its height above the deck and `j` the contact impulse the solve has just
   asked for. It is **the point where the line of the required contact force, through the centre of mass, meets the
   deck** — a classical required centre of pressure [R].
2. **So `across` is not a position headroom, it is a moment headroom.** Multiply through by the normal load and
   `across = 1 − |the moment the body demands about the feet| / (load × 0.130 m)` — and `load × 0.130 m` is already a
   named quantity in this file: `soleBound()` (`AttachedRider.ts:3235`), *"the moment the soles can transmit"*, 93.1 N·m
   at one body weight on 73 kg [R, A].
3. **The steer reaches that moment through exactly one limb, the ankle.** `steer` → `leanAsked`
   (`:3540`, `:3549`) → the predictor's command → `ankleRest` (`:3740`) → `setAnkle` (`:3741`, `:3262`) → `rhs[7]`
   (`:4731`), the body's own across row. There is no second route: the new rider's three unpaired lateral pulls are
   switched off at the top of `compressAssist` (`:3886`), the balance-shift and sway velocity drives are skipped for a
   free body (`:3421–3426`), `uprightVelocity` returns nothing (`:5318`) and the posture correction is projected out of
   `up`, `across` and `forward` while banking and free (`:3431–3434`) [R].
4. **It is a reaction, not a prescription — by the owner's own test.** Nothing commands a centre of pressure or a
   lateral velocity. What is commanded is a **joint rest angle**, and the ankle is a spring–damper about it whose
   reaction the board takes through `carried`; rows 0–5 of the solve are the *pair's* momentum, so the joint torque
   appears only in the joint's own row [R]. Step 3.3i measured the pairing: **|ankle − the roll ledger's own residual|
   = 0.95 N·m median on 780 unsteered frames and 4.24 on 1 118 full-stick ones, against columns of 16–33 N·m** [M].
5. **What is wrong is not the pairing, it is that the joint's torque is bounded by nothing the contact knows about.**
   The file says so itself: *"it bounds the command and not the moment"* (`:1449`). `HUMAN_ANKLE_STIFFNESS` × the
   command's own stop is **800 × 0.25 = 200 N·m against a 93.1 N·m sole — 2.15×** [R, A].
6. **Which term supplies the 0.9418 → −0.0408 step cannot be settled from the saved columns, and I will not guess.**
   `across`'s numerator is `τ_ankle + τ_swing`, and `τ_ankle` has two parts — the commanded rest and the joint's own
   rate — **either of which is individually large enough to supply the whole step**. What the 2×2 *does* settle is
   numerator against denominator: §4.
7. **And the authority a real rider uses for this is not in the rig.** `across = 0` is exactly the advisor's
   `atan(0.130/L)` ceiling, and the limb that passes it in a real bottom turn is a **lateral centre-of-mass offset
   over the rail**. The game's hip across is a self-centring **rotor** that by construction *"holds no steady torque"*
   (`:3761`), with its drive gain at **0** (`HIP_CAPTURE_GAIN`, `:441`) [R].

---

## 1. The chain, with file:line at every step

Address: `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`. `rider=new` sets
`newRider` (`AttachedRider.ts:2501`), and with no `humanGains` it sets **`predictive`** (`:2527`), so the live bank
path is `predictiveBank`, not `humanBank` and not the old `prepareBank` tail [R].

| # | what | where | what it does with the steer |
|---|---|---|---|
| 1 | the stick arrives | `RideSession.ts:444` | `rider.steer = input.steer`, −1…1, once a frame |
| 2 | the field | `AttachedRider.ts:1885` | `steer = 0` |
| 3 | the lean the player asks for | `:3540` | `wantOwn = steer × railRange + HAND_BEND × handBend × HOLD_BANK`. `railRange` is `RAIL_RANGE` = **50°** unless Snap is held (`:3534`) |
| 4 | the cap on it | `:3524–3531` | `held = min(MAX_BANK, atan(v²/(g·R)))` with `R = askRadius` = `TURN_RADIUS` = **4.5 m** (`:491`); `most = held` while planing, else 0 |
| 5 | the eased reference | `:3546–3549` | `leanAsked` moves toward `clamp(wantOwn, ±most)` with time constant `REFERENCE_TIME` = 0.05 s **and a rate bound `leanPace` = `LEAN_IN_RATE` = 1.4 rad/s = 80.2 °/s** (`:598`, `:2559`) |
| 6 | the predictor's tick | `:3724` | `predictor.tick(sense, speed, yawDepth, −leanAsked, −twistAsked, {ankle: range, twist: …}, rail, faceTilt)` on its own `CONTROL_STEP` clock. `leanAsked` is **the only place the steer enters** |
| 7 | the raw ankle command | `:3727` | `heldAnkleRaw = −predictor.raw[0]`, held until the next tick |
| 8 | the command's stops | `:3731–3734` | `wanted = heldAnkleRaw` (`anklePlumb` = 0); clamped to `[−room, +range]`, `range = restRange()` = **ANKLE_REST_RANGE = 0.25 rad = 14.32°** (`:409`, `:3252`), `room` narrowed by the rail's bite |
| 9 | the hip takes the overflow | `:3739` | `humanSwingStep(−SWING_SERIES × (wanted − ankleShare) + hipDrive, hipRange, swingInertia)`; `ankleShare` is `wanted` clamped to `±HIP_SHARE × 0.25` (HIP_SHARE = 0.8), `hipDrive` ≡ 0 |
| 10 | the rest actually applied | `:3740` | `ankleRest = human.lagRest(h, lean, ankleRestRate)` — `MOTOR_LAG` first order, slew bound `+∞` (`ANKLE_REST_RATE`, `:455`) |
| 11 | **the ankle's torque** | `:3741`, `:3262` | `τ = K(θ − φ − δ) + (Kh + C)·(θ̇ − φ̇)` with `K` = **800 N·m/rad**, `C` = **80 N·m·s/rad** (`humanBalance.ts:50–51`), `δ = ankleRest`, `θ` the body's bank, `φ` the board's roll. **`setAnkle` clamps it to `soleBound()` only with `ankleLimit: 'feet'`, which is off by default** (`:3263`) |
| 12 | into the solve | `:4731` | `rhs[7] += t·f − h(τ_ankle + τ_swing)/L` — row 7 is the body's across rate on the leg. The swing's couple also goes on the board's rows (`:4735–4737`); the **ankle's** reaches the board only through `carried` (`:3408–3415`), because rows 0–5 are the pair's momentum |
| 13 | the solve | `:4793–4808` | `settleStanding`: `velocity = ω′ × carried + v_board + drive + up·ṡ′ + across·u′ + forward·ẇ′ + du`; `impulse = m(velocity − velocity₀) − external·h` |
| 14 | **`wantX`** | `:5364`, `:5367–5370` | `freeX = local.x − height·j.x/j.y`; written to `desiredCop.x` **only while `loaded`** (`j.y > BALANCE_LOAD·m·g·h`, BALANCE_LOAD = 0.1 bw, `:5366`) |
| 15 | the clamp and the flag | `:5371–5373` | `copX = clamp(freeX, support.xMin, support.xMax)`; `limit = 'tip'` as soon as they differ |
| 16 | **`across`** | `:5389` | `1 − |freeX − mid| / half`, `mid` = 0 and `half` = **0.130 m** standing (`riderPosture.ts:96`, `feet: {xMin: −0.13, xMax: 0.13}`) |
| 17 | and what the probe reads | `take-off/stand.ts:450` | `cAcross` from `peekO(r,'desiredCop')`, i.e. step 14's latch, not step 16's live `freeX` |

**Every term in `wantX`, and which the steer touches** [R]:

| term in `freeX = local.x − height · j.x/j.y` | what it is | does the steer touch it |
|---|---|---|
| `local.x` | the centre of mass's own across place in the board's frame | **indirectly** — it is the integral of `bankSpeed`, which the ankle drives |
| `height` | `local.y − deckHeight(shape, local.z)`, 0.711 m standing [M, the evening entry's phase table] | no |
| `j.y` | the normal impulse the motion needs | only through the ride |
| `j.x` ← `rhs[7]`'s `−h(τ_ankle + τ_swing)/L` | **the ankle's and the hip rotor's torque** | ⭐ **yes — this is the whole route** |
| `j.x` ← `ω′ × carried`, `du[0..2]` | the board's own solved motion under the feet | indirectly, after the ankle has rolled the board |
| `j.x` ← `external` = `gravity + waterForce` (+ three terms that are **identically zero** for this rider, `:3886`) | gravity and the water on the *body* | no |
| `j.x` ← `drive` | for a free banking body: `up·flexRate` + `postureRate` + a correction projected out of all three body axes (`:3419–3436`) — **no lateral content** | no |

---

## 2. What `across` actually is: a sole-moment headroom

This is the identity I would put in front of the owner, because it makes the whole result legible [R + I, one
idealisation named].

Standing, the body is a point mass on a leg whose foot is pinned to the deck at `base` (`x = 0`, the support's own
midpoint). For such a body **the only source of moment about the foot is the ankle** — a point contact can make no
couple. `project` encodes exactly that: the lateral force it reports is `tx = (local.x − copX)·normal/height`
(`:5374`), so

```
moment the contact must take about the support's midpoint  =  normal × |freeX − mid|
across  =  1 − (that moment) / (normal × 0.130 m)
        ≈  1 − |τ_ankle + τ_swing| / soleBound()
```

and `soleBound()` is `max(0, legLoad) × (support.xMax − support.xMin)/2` (`:3235–3237`) — the repo's own
*"the moment the soles can transmit"*, **93.1 N·m** at one body weight on 73 kg (`REFERENCE_RIDER.mass`,
`boardReference.ts:11`), the figure `LEAN_IN_RATE`'s note already derives as *"m g d = 716 N × 0.13 m = 93 N·m"*.

Two consequences, both checkable in code and neither of them obvious from the headroom's name:

* **`across < 0` is the sole saturating, not the body leaving the board.** It says the moment demanded of the feet
  exceeds `load × 0.13 m`. It says nothing about where the body is. Step 3.3i measured where the body is through
  exactly this kind of failure: **the centre of mass stays within 0.173 m of the board's centreline over 24 runs,
  inside the feet's own 0.130 m in 22 of 24, and within 2.5 cm through a deck roll of 17° → 90°** [M].
* **`across = 0` is the tolerance, in another unit.** `half/height = 0.130/0.711` gives `atan` = **10.36°** — the
  evening entry's measured 10.362° standing tolerance, and the advisor's `atan(0.130/L)` = 8.2° at L = 0.9 m, are the
  same formula at two leg lengths [A].

One idealisation, named: the leg carries mass and the swing rotor's couple also loads the sole, so the identity is
exact only for the point-mass/massless-leg reading of this rig. The direction and the size are not in doubt — 3.3i
measured the ankle and the board's own roll residual as **one moment read twice**, to 0.95 / 4.24 N·m [M].

---

## 3. Why `grip` follows `across` down instead of leading it

The evening entry recorded this as an observation (0.93 → 0.73 → 0.49 on `cueL`) and asked nothing of it. It is a
consequence of the same two lines [R]:

`frictionUsed = tangential / (FOOT_FRICTION × normal)` with `tangential = hypot(tx, tz)` and
`tx = (local.x − copX)·normal/height` (`:5374–5378`). The **normal cancels**:

```
cGrip = 1 − hypot(local.x − copX, local.z − copZ) / (0.9 × height)
```

So `grip` is a pure geometry of how far the *clamped* centre of pressure sits from under the centre of mass. It
cannot move until `copX` stops tracking `freeX` — that is, until `across` has already gone to the support's edge.
**`grip` is downstream of the clamp by construction and can never be the first failing constraint while the demand is
inside the box.** That retires `grip` as a candidate without a run, and it is also why the stand begins `grip`-limited
(18 of 21) and dies `across` (12 of 14): at the stand the body sits off the clamped point in **z**, which `across`
does not see at all.

---

## 4. Which term supplies the collapse

### 4.1 What the 2×2 settles on its own, once the identity is in hand

`across = 1 − moment / (load × 0.13)`. The steer moves the **numerator**; Compress moves the **denominator**. Running
the brief's own four rows through the identity, at 73 kg (1 bw = 716 N, so `soleBound` = 93.1 × load in bw) [A on
[M]]:

| arm | `across` | load, bw | ⇒ moment demanded of the feet |
|---|---|---|---|
| steer only, the sample before | 0.9418 | — (take 1.0) | **≈ 5.4 N·m** |
| **steer only, the break** | **−0.0408** | 0.733 | **≈ 71.0 N·m** |
| Compress only, +0.60 | 0.9604 | **0.560** | **≈ 2.1 N·m** |
| nothing, worst of 182 frames | 0.3698 | ≥ 0.468 | ≤ 36.8 N·m |

> ⭐ **The numerator moves by a factor of ~13 in one sample; the denominator can move by at most ~1.4 over the same
> ground, and Compress's own arm shows a 1.8× denominator move buying a 0.04 change in `across`.** So *"the steer's
> own lateral demand, not a loss of normal load"* is not just consistent with the 2×2 — **the identity says why the
> 2×2 had to come out that way**, and it puts a number on the demand: about **71 N·m against a 93 N·m sole**, which is
> inside step 3.3i's measured full-stick distribution (median **30.1 %** of the bound, past it in **2.3–10.1 %** of
> substeps, by up to **4.94×**, peak demand **717 N·m**, 12 runs) [M].

### 4.2 What it does NOT settle, and the instrument that would

The numerator is `τ_ankle + τ_swing`, and `τ_ankle = K(θ − φ − δ) + (Kh + C)(θ̇ − φ̇)`. **Three candidates, and at
least two of them are individually sufficient** [A]:

| candidate | what it would take to supply 71 N·m alone | is that in range |
|---|---|---|
| the commanded rest `δ` | `71/800` = **0.089 rad = 5.1°** | yes — step 3.3k measured the applied rest at a **3.41° median** with excursions, so 5° is ordinary [M] |
| the joint's own rate `θ̇ − φ̇` | `71/80` = **0.89 rad/s = 51 °/s** | yes — 3.3i's shipped full-stick roll rates run to **146.7–353.7 °/s** [M] |
| the hip rotor `τ_swing` | 71 N·m of a ±**200 N·m** `SWING_TORQUE` burst | possible, but the rotor self-centres and `hipDrive` ≡ 0 |

**No saved column separates them**, and I am not going to infer it: the brief's own house rule is that one trace is
not a number, and here one trace would not even be a number about the right term.

⭐ **The instrument already ships and nothing needs to be written into `src`.** Step 3.3i built it:
`AttachedRider.ankle` (a public `readonly` ledger) behind `static AttachedRider.ankleLedger`
(`:2357–2358`), booked at the one site the torque is set, carrying `demand`, `torque`, `absorbed`, `angle`, `rest`,
`bound`, `load`, `room`, `bite`, `peak`, `demandPeak` and `over` per step [R]. It is a pure observer: *"it reads
`ankleTorque`, `ankleRest`, `legLoad` and the live support region and writes only into `ankle`"* (`:3202`).

So the attribution needs **probe columns, not a getter**. `stand.ts` already reads private fields by cast
(`peek`/`peekO`, `stand.ts:131–134`), so all of these are reachable today with no source change:

| column | source | why |
|---|---|---|
| `ankleRest` | `peek(r,'ankleRest')` | the spring's `δ` — the steer's own term |
| `ankleTorque` | `peek(r,'ankleTorque')` | the numerator, directly |
| `bankAngle` | `r.bank.angle` (public) | `θ` |
| `roll` | already computed in `stand.ts:428` | `φ` |
| `jointRate` | `peek(r,'bankSpeed') / peek(r,'legLength')` | `θ̇ − φ̇`, the damper's term |
| `swingTorque` | `peek(r,'swingTorque')` | the hip rotor's share of the same moment |
| `legLoad`, `soleBound` | `peek(r,'legLoad')` × `halfAcross` | the denominator, on the ledger's own definition |
| `heldAnkleRaw`, `ankleRoom`, `ankleBite` | `peek` | sent command vs applied rest vs the rail's bite — 3.3k showed these are **three different quantities with one name** |

And two columns are **already in the 2×2's own files and have not been read**: `leanAsk` and `leanCap`
(`stand.ts:500`, from `leanProbe.ask` / `.cap`, `:3552–3553`). They say, for free and with no run at all, whether the
steer's reference had reached its cap at the break. ⭐ **Read those two at +0.50 and +0.60 on the steer-only arm
before scheduling anything.** The arithmetic to check them against: `leanPace` = 80.2 °/s means `leanAsked` can rise
**at most 8.02° between two 0.1 s samples**, and the cap at ~4.9 m/s on R = 4.5 m is `atan(4.9²/(9.81×4.5))` =
**28.6°**, reached about **0.36 s** after the stick goes over — against a steer that starts at +0.30 s and a break at
+0.68 s [A].

---

## 5. Reaction or prescription — answered from code

**The rider leans. It is not a commanded centre of pressure, and it is not a kinematic prescription.** Five readings,
all in `src/physics/AttachedRider.ts` [R]:

1. **Nothing writes a desired position or velocity across the board.** `desiredCop` is written **only inside
   `project`** (`:5368`), **after** the solve, as a *read* of the impulse the solve produced. Its other two writers are
   resets (`:2702`, `:2819`). Nothing consumes it: `grep` shows no reader in `src` outside the probes. The thing the
   brief calls "the demand" is a derived diagnostic, not a setpoint.
2. **The three unpaired lateral pulls are off for this rider, by name.** `compressAssist` returns at its second line
   on `newRider` (`:3886`) — *"none of the three; they act on the body with no reaction on the board"* — which kills
   `COMPRESS_PULL`, `CARVE_CARRY` and `LEAN_OUT_PULL`. `legDriveStep` needs `drives` and is off unless `?legDrive` is
   passed. The owner's address passes neither.
3. **The velocity drives that used to move the body across are skipped.** `prepare`'s balance-shift and sway blocks
   are inside `if (!free)` (`:3421–3426`) — *"the body is a free centre of mass, moved only by forces"* — and
   `uprightVelocity` returns immediately on `freeBody` (`:5318`) — *"none; the body keeps its bank by its own inertia
   and the ankle's forces"*. The posture correction survives, but while banking and free it is projected out of `up`,
   `across` **and** `forward` (`:3431–3434`), i.e. out of a complete basis, so it has no lateral content.
4. **The one thing commanded is a joint rest angle, and that is an equilibrium-point muscle command, not a
   kinematic one.** The ankle is `τ = K(θ − φ − δ) + (Kh + C)(θ̇ − φ̇)`, implicit in the solve (`:3741`). A spring
   about a commanded rest does *not* realise an angle "by whatever force it takes": it delivers a torque proportional
   to the error and the body goes where the dynamics take it. That is how `uprightVelocity` differed, and why it was
   removed: it set a **velocity**.
5. **The reaction is booked, and it has been measured.** The torque enters only the joint's own row
   (`rhs[7]`, `:4731`), because rows 0–5 are the pair's momentum; the board's share of the ankle reaches it through
   `carried`, which while banking carries the body's own across offset (`:3408–3415`). Step 3.3i measured that pairing:
   **|ankle − the roll ledger's own residual| = 0.95 N·m at the median on 780 unsteered frames (per run 0.17–6.52,
   against columns of 16–18 N·m) and 4.24 on 1 118 full-stick frames (1.47–15.52, against 23–33), while
   |ankle + residual| is 34.67 and 60.76** [M]. The hip rotor's couple is booked separately on the board's rows
   (`:4735–4737`) and in the work ledger (`:5071–5075`).

> ⛔ **So there is no cheat here to find, and `?rider=new` is not PR #215.** The honest complaint is a different one,
> and the file states it against itself: **`ANKLE_REST_RANGE` *"bounds the command and not the moment"*** (`:1449`).
>
> ⭐ **The arithmetic of that sentence, which I have not seen written down:** `ANKLE_REST_RANGE` = 0.25 rad is
> `bankAuthority`'s `restRange` = `footReach · m g / series` with `series = k·K_hull/(k + K_hull)` =
> **383 N·m/rad** (k = 800, K_hull ≈ 730; `rollModel.ts:183–191`). That is the **steady-state** rest at which the
> centre of pressure reaches the sole's edge — ankle and hull **in series**, the board having rolled to take its
> share. But `project` sees the **instantaneous** joint torque, which is `k·δ`, not `series·δ`. The two differ by
> **800/383 = 2.09×**, and `800 × 0.25 = 200 N·m` against a **93.1 N·m** sole is **2.15×** [R, A].
>
> **So the command's own stop is calibrated on a compliance the demand does not wait for.** The demand crosses the
> support's edge at a commanded rest of `93.1/800` = **0.116 rad = 6.67°** at one body weight (and **4.9°** at the
> break's 0.733 bw) — **less than half the 14.32° the command is allowed** [A]. That is the structural answer to
> *"why that amount"*.

---

## 6. What a real surfer's equivalent demand is — and the consult-log note does bear on this

I read the entry. `docs/research/water-physics/consult-log.md`, the **2026-11-15** row (the wave-shape advisor's
second ruling, item 2), says, on the authority question [S/R, the advisor's]:

* a residual tilt is a **static** offset, not a torque — *"holding it needs the centre of mass `L·tan(tilt)` to the
  high side of the feet, and the ankle alone caps at `atan(0.130/L)` = **8.2° at L = 0.9 m*** against a measured
  7.4–15.9° at the fall;
* at the real in-plane residual (6.5° at the traced frame) that offset is **0.103 m**, inside both the ankle's ceiling
  and the feet's 0.130 m; at the reported 15.5° it is **0.249 m** — *"past the board's own half-beam of 0.232 m, so no
  posture on a 0.464 m deck holds it"*;
* and, decisively for this round: *"the ankle's torque ceiling is `F_n × 0.130 m`, and `F_n` is the same quantity
  whose collapse inflates the demand … so **the ankle is structurally the wrong authority late in a capsize at any
  gain**; the hip is, and the gain sets only how early it is needed."*

**It bears on this directly, and it is the same quantity.** `atan(0.130/L)` *is* `across = 0`: at the measured
standing `height` of 0.711 m it reads 10.36°, at the advisor's L = 0.9 m it reads 8.2°. `F_n × 0.130 m` *is*
`soleBound()`. So the advisor's ceiling and this round's `across` are one number in two units, and the advisor named
the authority eight days before the 2×2 isolated the input.

**So: is the model right and the authority missing?** On the evidence, yes, with one qualification:

* **Right:** a bottom turn at 2.1 g needs the body's line and the resultant's line to agree to within 10.4°, and
  holding the residual needs the centre of mass `L·tan(residual)` out over the rail. **The game's rider never gets
  there.** 3.3i measured it: through a deck roll of **17° → 90°** the centre of mass stays **within 2.5 cm of the
  board's centreline** and ends 5 mm off it; over 24 runs it is never more than **0.173 m** out, and inside the feet's
  own 0.130 m in **22 of 24** [M].
* **And structurally it cannot get there.** The only limb that could hold a steady lateral offset is the hip across,
  and it is wired as a **rotor**: `humanSwingStep` *"is pushed only while it can still be braked inside its range (a
  rotor holds no steady torque), and brought back upright once nothing is asked"* (`:3755–3762`), with
  `HIP_CAPTURE_GAIN = 0` (`:441`) so the capture point does not drive it at all [R]. ⭐ **A rotor cannot hold a static
  offset, and a bottom turn is a static offset.** That is a kind-of-authority gap, not a gain to be tuned — and it is
  the same conclusion step 3.2x reached from the other side, having swept the rotor's gain from 500 to 8 000 N·m/m and
  found **12 of 12 falling at every gain, with 2 000 falling *sooner* in 36 of 60 paired runs** [M].
* **The qualification:** on the heel side a human's muscle (two ankles ≈ 80 N·m dorsiflexion, Moraux et al. 2013) is
  about 13 % *tighter* than the 93 N·m geometry, so a real rider's ankle ceiling is, if anything, lower than the
  game's sole bound. The ankle being the wrong authority is not a modelling artefact [S, via 3.3i].

---

## 7. Two corrections to the brief, offered because it asked for them

### 7.1 ⚠️ "At the fall the demand sits 1.100 m outside the feet, against a board half-width of 0.232 m"

**That comparison invites a reading the evidence refutes.** `outX` is derived from `freeX`, which is
`local.x − height·j.x/j.y` — it carries `j.y` in a **denominator**. At the fall the load is collapsing, so the
quantity diverges: 1.100 m is a **moment-over-load ratio**, not a place the body is. The evening entry already has the
load-matched figure beside it (*"restricted to escaping frames the feet actually carry (load ≥ 0.5 bw), 127 of 163,
median 0.080 m … since `freeX` diverges as the normal impulse vanishes"*), and `stand.ts`'s own trap 5 says
`desiredCop` is a **latch** that stops moving below `BALANCE_LOAD` = 0.1 bw — which is exactly the regime the fall
frames are in.

And the direct measurement says the body is not there: **0.173 m maximum over 24 runs, inside 0.130 m in 22 of 24**
[M, 3.3i]. ⛔ **So "1.100 m against a board half-width of 0.232 m" should not be put to the owner as an excursion.**
The honest form is *"the moment the feet are asked for, divided by the load left on them, reaches 1.100 m of lever —
and the load is what is vanishing"*. The break frame itself (0.733 bw) is well clear of the latch and stands.

### 7.2 ⚠️ "`across` is `1 − |wantX − midX| / half`, the support half-width **measured** at 0.130 m"

It is not measured, it is a **literal**: `riderPosture.ts:96`, `feet: { xMin: −0.13, xMax: 0.13 }`, for every standing
pose [R]. It also appears three more times as the same constant with different names — `ANKLE_REST_REACH` = 0.13
(`:418`), `soleBound()`'s arm, and `predictiveBalance`'s `feetReach`. Nothing in the ride moves it (`stanceReach: 'keep'`
moves the *hip's* range and the fall test's catching reach, not the support). Worth knowing before anyone proposes
widening the stance: it is one number in four places.

---

## 8. What is already measured, so that nothing here is re-run

The codex log's standing instruction is to read what has been ruled out. On this joint, **three of the four things one
can do to it have been measured and kept off**, and two of them are precisely the fixes this trace invites [M]:

| already tried | result | population |
|---|---|---|
| **`?ankleLimit=feet`** — bound the ankle's torque by `soleBound()` | ⛔ **makes the fall worse.** Ride 1.12–2.67 → **0.83–2.55 s**, roll peak 63.7–91.4 → 73.9–95.2°, roll rate at the fall ±268 → **±961 °/s**, the joint angle opening to 47.3° and the clipped demand climbing to **2 087 N·m**. *"A stiff spring that saturates is not an ankle giving; it is an ankle letting go."* | 12 full-stick runs; 24 of 24 fall in each of four arms (3.3i) |
| **`?ankleRange=wide`** — double the commanded rest's stop | ⛔ **innocent.** The wider bound is really used (sent command past 14.33° in 61 of 72, applied rest to ±28°) and **saves nobody: 72 of 72 and 24 of 24 still fall, median change 0.000 s, no sign in any regime** | 72-run ladder, paired run for run (3.3k) |
| `ANKLE_REST_RATE` (slew bound on the rest) | peak torque 181–290 → 59–162 N·m, **falls unchanged at 0.38–0.45 s against 0.38–0.43**; nothing on the shipped predictor | 12 runs a cell (3.2x) |
| `ANKLE_PLUMB` (carry the deck's roll in the rest) | bank peak 20.7–65.7 → 12.1–34.6°, **12 of 12 still fall** | 12 runs (3.2x) |
| `HIP_CAPTURE_GAIN` as a **rotor** gain, 500–8 000 N·m/m | hip opens, delivers 35–264 N·m and up to 68.8° of swing, board's rail peak falls — **12 of 12 fall at every gain**, 2 000 sooner in 36 of 60 | 60 runs a gain, five face slopes (3.2x) |
| 3.3k's own reading of which quantity saturates | ⭐ **the predictor's *sent* command is at ±14.32° in 62 of 72 falls; the rest the ankle is *given* is at that bound in 1 of 72, median 3.41°.** What bounds the applied rest is the **rail's bite**, shut at the fall in 36 of those 62 | 72-run ladder (3.3k) |

> ⛔ **So "clamp the demand" is not an open proposal: it is `?ankleLimit=feet`, it is built, and it is measured worse.**
> I am therefore **not** proposing it, and not proposing to widen the command either. ⭐ **The live candidate this
> trace points at is the one the advisor named and nobody has built: a limb that can hold a static lateral centre-of-mass
> offset over the rail.** That is a hip joint with a holding authority — a torque it can carry steadily within a sourced
> hip strength, its reaction through the legs on the board, booked where `swingTorque`'s already is — **not** a rotor,
> and **not** a commanded offset. Writing it is a build round's job and a ruling's; this document only establishes that
> the authority is absent in kind, not merely small.

---

## 9. The measurement I would schedule, exactly

In priority order. **None of these is a sweep; the first two cost nothing.**

**(0) Free, no run.** On the 2×2's own saved jsonl, print for the steer-only and `cue` arms at `t+0.40 … +0.70`:
`leanAsk`, `leanCap`, `capLoad`, `loaded`, `copFreeX`, `halfAcross`, `cAcross`, `bLimit`, `friction`. This says
whether the steer's reference had reached its cap at the break, and whether the break frame was `loaded` (it should
be, at 0.733 bw). It tests §4.2's arithmetic without touching the machine.

**(1) Cheap, 3 runs on one wave.** Add the eight `peek` columns of §4.2 to the 2×2's own `stand.ts` and re-run **only
seed 2, wave 1, the three scripts** (steer-only, Compress-only, `cue`), the same address, `TRIAL` unchanged. Nothing
else changes, so the `cue` arm's bit-identity is the control it already is.

```
./node_modules/.bin/rolldown docs/research/new-rider/take-off/stand.ts -o <s>/raw.mjs --format esm --platform node
printf "globalThis.location = { search: '' };\n" > <s>/stand.mjs     # an OBJECT, never a string
cat <s>/raw.mjs >> <s>/stand.mjs
cd <s> && env SEED=2 WAVES=1 SCRIPTS=cue,cueS,cueC PERIODS=12 OUT=<s>/w1.jsonl \
  node --max-old-space-size=3200 stand.mjs
```

(`WAVES` and the script names are whatever the 2×2's branch calls them — this worktree's `stand.ts` predates
`TURN_STEER`/`TURN_COMPRESS`, so the arm names must come from that branch, not from here.)

**What it would settle:** whether `across`'s numerator at the break is the spring's commanded rest, the damper's joint
rate, or the hip rotor — the one question §4.2 leaves open. Pre-registered prediction, so it can fail: the **rest**
term leads, because it is the only one the steer drives directly and because 3.3k found the sent command saturated in
62 of 72 falls; the **damper** term then overtakes it as the roll rate builds, which is why `?ankleLimit=feet` makes
things worse rather than better. If instead the rate term is already dominant at the break, then the demand is
tracking the board's roll and not the stick, and §4.1's attribution of the step to the steer's own term is wrong even
though the 2×2's input attribution stands.

**(2) The structural A/B, only if the owner wants it, and it is the one the night entry already named:** the same
steer/Compress split on **waves 2 and 11**, whose turns hold 10 of 10. If `across` also goes negative there and the
rider survives, then `across < 0` is survivable and the quantity is not the fall; if it does not go negative, the
stand's own geometry (load, `height`, the rail's bite) decides whether the same ask saturates the sole, which is a
much more tractable target than the rider's body. **This needs no new instrument beyond (1).**

---

## 10. Status

* Nothing in `src` changed. No getter was needed: the ankle ledger (`AttachedRider.ankle`, `AttachedRider.ankleLedger`)
  already ships from step 3.3i, and `stand.ts` reads private fields by cast.
* Numbers in §4.1 are **arithmetic on the brief's own measured columns** through an identity read in the code; they are
  labelled **[A]** and they are not a new measurement.
* §4.2's attribution is **open**, and §9(1) is the three-run measurement that closes it.
* §7's two corrections are offered against the brief, as it asked.
