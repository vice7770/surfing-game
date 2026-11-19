# Step 3.5j — `?swing=mass`: the hip gets a weight to shift, and on the turn that fails it never shifts it

**The owner's ruling this round answers (2026-11-19):** *"The turn should not be limited, the turn is good, the fall is
a result of the inbuilt balance that lack the ability to stand."*

So nothing here touches the turn. **No command law changes at all** — not the ask, not `LEAN_IN_RATE`, not the lean
cap, not the ankle's reach, rest, spring or damper. The change is a **capability**: the hip's lateral swing now moves
the body's mass instead of only the drawing.

> ## ⛔⭐ THE HEADLINE, AND IT IS A NEGATIVE ONE: **THE HIP DOES NOT SWING IN TIME, SO MASS COUPLING ALONE CANNOT SAVE THIS TURN.**
>
> On seed 2 wave 1 — the turn the whole day's diagnosis points at — the hip is at **0.00° for the first 0.6 s after
> the stand** and reaches **−4.53° / +3.13°** in the same 0.1 s band the rider comes off. That is **1.24 cm** of
> lateral leverage against a **0.130 m** sole. **The two arms are equal to two decimals and both fall at 0.700 s
> and 0.717 s.** The capability is built, sized and verified; on this turn it is measurably inert.
>
> ⭐ **And where the hip DOES reach its range, the capability is delivered in full and the ride gets SHORTER.** Wave 2
> `cueL`: a **settled** lateral centre of mass of **−0.14625 m = 1.12× the sole half-width**, held through the last
> 0.2 s of the window — exactly the sustained weight shift the ruling asked for — and the ride ends **0.5 s earlier**
> (3.700 → 3.183 s). `cueR`: 0.97× of the sole, 3.133 → 2.600 s.
>
> **So the mechanism is not refuted by being absent. It is refuted by being present and not helping.**

---

## 1. What was actually missing, verified at the line

The swing rotor's angle moved the **drawing** (`AttachedRider.swung`, at `SWING_DRAWN_CHEST` = 0.35 of it) and exerted
a **torque** whose reaction was already paired and already booked (`rhs[7] -= h·swingTorque/length`,
`rhs[3..5] -= h·swingTorque·rollAxis`). **Nothing displaced any mass sideways:** `localCenter` is
`postureCenter(this.parts, …)`, taken after the parts receive only `balance.x + lean.x + armsGive` and after
`foldTrunk()`, which is the **nose-ward** fold (step 3.5h). So the shipped rotor pushed the body one way with **no mass
going the other** — a torque with half of its pair's geometry missing.

`?swing=mass` supplies that half, as the lateral twin of `?trunk=mass`: the same parts (torso, head, both arms), the
same pivot (the physical pelvis), the other axis. **Geometry, not force** — no torque, no drive, no constant, and
`postureRate` deliberately left at 0, exactly as `foldTrunk` leaves it, because feeding the fold's own centre-of-mass
motion to `this.drive` would be a hidden kinematic motor.

### Sized off the posture, not by hand

The rotor carries **38 of the 73 kg** at `Σ m·Δy = 11.459 kg·m` above the pelvis, so `localCenter.x` moves
`−0.15698·sin ψ` m:

| hip angle ψ | lateral centre-of-mass offset | as a share of the 0.130 m sole |
| --- | --- | --- |
| 4.53° (**what the failing turn reaches**) | **0.0124 m** | **0.10×** |
| 20° | 0.0537 m | 0.41× |
| 30° | 0.0785 m | 0.60× |
| 68.75° (the 1.2 rad hip range) | **0.1463 m** | **1.13×** |

`frame()` subtracts the posture's own `atan2(cx, hypot(cy, cz))` from the lean line to get the **leg's** bank
(`AttachedRider.ts:5457`), so that offset is credited as up to **11.6°** of lean the leg never has to supply — taken at
the 0.711 m standing centre-of-mass height the take-off probe measured, or **13.5°** once the fold's own 0.100 m drop
in that height is counted. Beside the **10.4°** the sole itself allows, the geometry roughly **doubles** the lean
available. ⚠️ **That is arithmetic about the geometry and was never a prediction that the turn survives** — and the
measurement below is why the distinction mattered.

### ⚠️ The axis, which was a real bug in the first draft

`bodyFrame` is `heading · Rx(framePitch) · Rz(−bank)` while the reaction is booked on `rollAxis`, the **heading's**
`−z`. Those are one line **only on a level-pitch rider** — at 20° of pitch, `(0, −0.342, 0.940)` against `(0, 0, 1)` —
and **a climb is exactly where a bottom turn ends**. A mass that moved about one line while its reaction was booked
about another would not be a paired rotor on a climb, which is the owner's own rule.

The fold therefore turns about `rollAxis`'s own image in the parts' frame,
`u = (−sin p·sin b, sin p·cos b, cos p)`, which is local `+z` at zero pitch for every bank. `swingFoldAxis` publishes
it so a probe can project it rather than trust the note. **One frame of lag remains and is stated:** `updatePosture()`
runs one line before `frame(board)`, so `p` and `b` are the previous call's — the same lag `foldTrunk` already lives
with, measured at under 5e−3 of axis error on a live ride.

### ⚠️ And a wiring bug that would have made every number meaningless

The first draft parsed `?swing=mass` and forwarded it through `SurfZoneRunner`, but `RideSession`'s own
`AttachedRider` options **dropped it**. A fixture moved 5.4 cm of mass at 20° of swing; a real `RideSession` with the
very same parsed options moved **0 m**. Fixed at `RideSession.ts:341`, and `swingMass.test.ts` now asserts the two
creation paths agree — this trap has cost this project a ride attribution before (`?bodyBank=hip` was parsed 0 times
on `main`).

---

## 2. The A/B

**Population: Canyon B, Medium, seed 2, the owner's own address through the game's own switch parsing, steer only
(`TURN_COMPRESS=0`), `STAND_HOLD=4`, `PERIODS=4`, `ARMS=ships,swing`, `SCRIPTS=cue,cueL,cueR`. 9 wave×script cells
that produced a stand (waves 1, 2 and 5), one run per cell, 2 220 standing frames.** Probe:
`take-off/four-numbers.ts` with three additions — the arm suffix, `'swing'` in `RIDER_KEYS`, and two peek-only columns
(`foldA`, the fold the mass model carries, and `comX`, the posture centre's lateral offset from the stance point).

✅ **Controls.** `seaDiffs` is **empty** — the two arms ride the same sea. The `ships` arm reads `foldA` **0 on all
1 143 standing frames** with `|comX|` never past **0.00077 m**; the `swing` arm reaches `foldA` **68.7549°** and
`|comX|` **0.14631 m** on **447 of 1 077** standing frames. **And the run reproduces the committed numbers: the falls
at 0.700 and 0.717 s on wave 1, and the 4.53° of trunk travel, both to the digit.**

### 2.1 The exits — nothing is saved

| wave | script | `ships` | `swing=mass` | |
| --- | --- | --- | --- | --- |
| 1 | `cue` | fell 3.900 | fell 3.833 | −0.067 |
| **1** | **`cueL`** | **fell 0.700** | **fell 0.700** | **identical** |
| **1** | **`cueR`** | **fell 0.717** | **fell 0.717** | **identical** |
| 2 | `cue` | **rode 4.017 out** | **rode 4.017 out** | identical |
| **2** | **`cueL`** | fell 3.700 | ⛔ **fell 3.183** | **−0.517** |
| **2** | **`cueR`** | fell 3.133 | ⛔ **fell 2.600** | **−0.533** |
| 5 | `cue` | fell 0.950 | fell 0.967 | +0.017 |
| 5 | `cueL` | fell 0.767 | fell 0.817 | +0.050 |
| 5 | `cueR` | fell 1.150 | fell 1.100 | −0.050 |

⛔ **Not one turn survives in either arm.** Two cells are bit-equal, two improve by ≤ 0.05 s, four are worse and two of
those by half a second. **The first half of the acceptance — "a full-stick turn must survive" — FAILS.**

### 2.2 ⭐ The hip against time from the steer — why wave 1 is bit-equal

The steer is applied at **+0.300 s** after the stand. Peak hip angle (°) and rate (°/s) per band, wave 1 `cueL`:

| band after the stand | 0.0–0.3 | 0.3–0.4 | 0.4–0.5 | 0.5–0.6 | **0.6–0.8** |
| --- | --- | --- | --- | --- | --- |
| `ships` | 0.00 | 0.00 | 0.00 | −0.01 | **−4.53 (−106.9 °/s)** |
| `swing=mass` | 0.00 | 0.00 | 0.00 | −0.01 | **−4.53 (−106.9 °/s)** |

**The hip is motionless for the first 0.6 s of a ride that ends at 0.700 s.** `cueR` is the same shape: 0.00° through
+0.6 s, then +3.13° in the band it falls in. The settled `comX` on wave 1 `cueL` is **0.00001 m** with a **peak of
0.0120 m** — so the measured weight shift on the failing turn is **1.2 cm at its peak and nothing at the end.**

⭐ **The located cause, and it is a dead band, not a gain.** `humanSwingStep` is driven by
`−SWING_SERIES · (wanted − clamp(lean, ±HIP_SHARE·ANKLE_REST_RANGE))` with `HIP_SHARE` **0.8** and
`ANKLE_REST_RANGE` **0.25 rad** — so **the hip is asked for nothing at all until the ankle's command passes 0.2 rad =
11.46°**, and then 430 N·m/rad past it, clipped at `SWING_TORQUE` 200 N·m. On wave 1 that threshold is crossed about
**0.07 s before the fall.** And the rotor is inertia-limited: 200 N·m on 6–10 kg·m² needs **0.145–0.187 s** to reach
20° from rest. ⭐ **The window from the steer to the fall is 0.400 s — wide enough, if the demand arrived with the
steer instead of with the ankle's saturation.**

### 2.3 ⭐⭐ Where the capability IS delivered, it does not buy survival

Settled lateral centre of mass — the median of `comX` over the **last 0.2 s** of the standing window, so a transient
cannot carry it:

| wave | script | `ships` settled | `swing` settled | share of the 0.130 m sole | exit, ships → swing |
| --- | --- | --- | --- | --- | --- |
| **2** | `cueL` | 0.00000 | ⭐ **−0.14625 m** | **1.12×** | ⛔ 3.700 → **3.183** |
| **2** | `cueR` | 0.00000 | ⭐ **+0.12597 m** | **0.97×** | ⛔ 3.133 → **2.600** |
| 5 | `cueL` | 0.00003 | **−0.08581 m** | 0.66× | 0.767 → 0.817 |
| 5 | `cueR` | 0.00000 | −0.03592 m | 0.28× | 1.150 → 1.100 |
| 1 | `cue` | 0.00000 | +0.04126 m | 0.32× | 3.900 → 3.833 |
| 1 | `cueL` / `cueR` | −0.00001 | **0.00001 / −0.00002 m** | **0.00×** | identical |

⛔ **A full sole-width of sustained lateral weight shift, held to the last frame, on the two cells where the hip
reaches its range — and both of those rides are half a second shorter.** This is the measurement that decides the
design, and it decides against it as a fall fix.

### 2.4 Sharpness — the switch does not make the turn gentler, and on one cell it costs the climb

| wave | script | arm | bank peak | roll peak | course change | face fraction | through-water speed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `cueL` | ships | 4.24° | 10.60° | +18.5° | 0.674 → 0.465 | 4.64 → 3.83 |
| 1 | `cueL` | swing | 4.23° | 10.55° | +18.4° | 0.674 → 0.465 | 4.64 → 3.82 |
| **2** | `cueL` | ships | 42.83° | 54.76° | +15.6° | ⭐ **0.711 → 0.916** | 4.52 → **1.30** |
| **2** | `cueL` | swing | ⭐ **60.89°** | **68.29°** | +13.4° | ⛔ **0.711 → 0.660** | 4.52 → **3.49** |
| **2** | `cueR` | ships | 40.36° | 38.90° | +13.7° | 0.711 → 0.370 | 4.52 → 0.21 |
| **2** | `cueR` | swing | ⭐ **69.00°** | **78.66°** | ⚠️ **−24.1°** | 0.711 → 0.350 | 4.52 → **4.70** |
| 5 | `cueL` | ships | 35.49° | 18.04° | −10.2° | 0.905 → 0.945 | 3.73 → 2.60 |
| 5 | `cueL` | swing | 46.01° | 27.44° | −8.2° | 0.905 → 0.950 | 3.73 → 2.65 |
| 5 | `cueR` | ships | 63.53° | 73.26° | +12.1° | 0.905 → 0.952 | 3.73 → 4.27 |
| 5 | `cueR` | swing | 46.63° | 58.10° | +8.1° | 0.905 → 0.954 | 3.73 → 4.15 |

* ⭐ **It is not a gentler turn.** Bank peak **rises** on 5 of 9 cells, by up to 28° (wave 2 `cueR`, 40.36 → 69.00°),
  and the board rolls with it (38.90 → 78.66°). So this does not fail the acceptance by softening the turn — it is a
  **harder** lean that still falls.
* ⚠️ **But it costs the climb on the one cell that climbed.** Wave 2 `cueL` ships goes **0.711 → 0.916** of the face;
  with the switch it goes **0.711 → 0.660**. **The surviving-and-climbing exit is the thing the owner's shape asks
  for, and the switch removed it on the cell that had it.**
* ⚠️ **And it keeps far more speed** on that cell (1.30 → 3.49 m/s at the end) and reverses the course change on wave 2
  `cueR` (+13.7 → −24.1°). **These are genuinely different rides, not noise around the same one.**
* `hAcross` goes negative in **both** arms on 8 of 9 cells (to −14.3 on wave 5). The lateral headroom still leaves the
  sole either way.

---

## 3. What this establishes, and what it does not

1. ⭐ **The missing half of the pair is now built, measured and verified.** 38 kg of real mass, up to 0.1463 m of
   sustained lateral offset, about the exact axis the reaction is booked on at any pitch, through the switch, in a real
   session. **The default is inert on 1 143 standing frames.**
2. ⛔ **It is not a fix for the fall.** 0 of 9 turns survive, 4 of 9 cells are worse, and the two cells that deliver a
   full sole-width of settled weight shift are the two that lose half a second.
3. ⛔ **"The hip does not swing in time" is the measured reason on the failing wave**, and it is a **dead band** in the
   hip's demand (nothing until the ankle's command passes 11.46°), not a gain — which is why the earlier 500 → 8 000
   N·m/m sweep of `HIP_CAPTURE_GAIN` fell 12 of 12 at every value. **Same shape of gap, located in a different line.**
4. ⚠️ **What it does NOT establish.** Whether an early hip demand would save the turn — nothing here asked the hip
   early, and §2.3 is a reason for real doubt, because the two cells with the most weight shift are the worst exits.
   Nor whether the owner would *like* the harder lean it produces: he rides and judges feel, and this is a bench.
5. ⚠️ **Population: one sea, one seed, 9 wave×script cells, one run per cell, 18 stands.** The structure carries this —
   a bit-identical default arm, a reproduced positive control, and a liveness column — **not the n**
   ([[one-trace-is-not-a-number]]). Wave 1 `cueL`/`cueR` being bit-equal across arms is the strongest single line here
   and it needs no statistics.

## 3b. ⛔ And the design that was briefed — "a commanded rest angle with a spring and a damper about it" — would have made the hip WEAKER

Worth recording, because it is derivable from the shipped law and it was the round's original instruction.

`humanSwingStep`'s drive is `burst = clamp(−SWING_SERIES·overflow, ±SWING_TORQUE)` — a torque that **does not depend on
the rotor's angle at all**. So **the shipped burst already *is* "a spring about a rest of `overflow`", evaluated at
ψ = 0 and never re-evaluated.** Adding the rotor's actual angle to it — which is what a rest with a spring about it
means — gives `−SWING_SERIES·(overflow − ψ)`:

| overflow | shipped drive, at every angle | a rest-spring at ψ = 0 | at ψ = overflow/2 | at ψ = overflow | its equilibrium |
| --- | --- | --- | --- | --- | --- |
| 0.100 rad | −43.0 N·m | −43.0 | −21.5 | **0** | 5.73° |
| 0.300 rad | −129.0 N·m | −129.0 | −64.5 | **0** | 17.19° |
| 0.465 rad | −200.0 N·m (clipped) | −200.0 | −100.0 | **0** | **26.64°** |
| 0.600 rad | −200.0 N·m (clipped) | −200.0 | −129.0 | **0** | 26.65° |

⛔ **Strictly less torque at every angle on the way out, and an equilibrium at 26.6° where the shipped constant-torque
drive runs on to the 68.75° range.** And a rotor at its rest holds **zero** torque by definition, so it gives no steady
lateral moment either. ⭐ **The measurement above settles it from the other side: 68.75° of fold and 1.12 sole-widths of
settled weight shift were already not enough. A design that caps the fold at 26.6° could not have done better.**

The project's own file had said the same thing in another register: `project`'s step-3.5i note
(`AttachedRider.ts:5569–5578`) — *"it asserts dH/dt = 0 … true of a point mass and false of a body with a trunk, and
it is why a hip strategy costs this rider sole pressure instead of buying it."*

## 4. The question this leaves, which nobody has asked

> ⭐⭐ **What makes the hip swing EARLY?** The hip's lateral authority is handed over by the **overflow of the ankle's
> command past 0.8 × `ANKLE_REST_RANGE`**, so the hip is recruited only once the ankle has already run out — about
> 0.07 s before the rider comes off, against a rotor that needs 0.145–0.187 s to reach 20°. **A control-allocation
> question, measurable with no new instrument**, and a separate round with its own switch and its own A/B.

⛔ **It must not be answered by prescribing the motion.** Commanding the hip to a position or a rate would be the
`uprightVelocity` mistake again. The legitimate shape is a different **allocation** of one lean demand between two
joints, with both joints' torques paired as they already are — and §2.3 says plainly that it may still not help.

## 5. Reproducing it

```
./node_modules/.bin/rolldown docs/research/new-rider/take-off/four-numbers.ts -o <s>/raw.mjs --format esm --platform node
printf "globalThis.location = { search: '' };\n" > <s>/four-numbers.mjs   # an OBJECT, never a string
cat <s>/raw.mjs >> <s>/four-numbers.mjs
cd <s> && env MODE=takeoff SEED=2 PERIODS=4 ARMS=ships,swing SCRIPTS=cue,cueL,cueR \
  TURN_COMPRESS=0 STAND_HOLD=4 OUT=<s>/ab.jsonl node --max-old-space-size=3200 four-numbers.mjs
python3 -I docs/research/new-rider/3.5/swing-mass-read.py <s>/ab.jsonl
```

⚠️ **The probe is not on this branch.** `take-off/four-numbers.ts` belongs to PR #437/#438's line and is the owner's
to merge; this round used it with three additions (the `swing` arm suffix `'&swing=mass'`, `'swing'` in `RIDER_KEYS`,
and the `foldA` / `comX` columns) and did not fork it. `swing-mass-read.py` is this round's reader and ships here.
