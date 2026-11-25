# Step 3.5g — what sets the lean cap, and which term supplies the collapse

**Measurement only. `git diff` over `src/` is empty.** The probe is
`docs/research/new-rider/3.5/cap-terms.ts`: `take-off/four-numbers.ts` at `claude/the-record`, copied verbatim and
extended with peek-only columns. No source change was needed — the ankle ledger already ships as a pure observer
(`AttachedRider.ankleLedger` / `bookAnkle`, step 3.3i), and every other read goes through the parent's own `peek`
casts.

**Population.** One sea (Canyon B, `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`),
**seed 2, wave 1**, the three scripts `cue` / `cueL` / `cueR`, `TURN_STEER=1 TURN_COMPRESS=0` — steer only, no
Compress. **267 standing frames in all: 182 for `cue`, 42 for `cueL`, 43 for `cueR`.** Every number below is from that
one run (`results/35g/35g-s2-w1-steer-only.jsonl.gz`). Where a claim rests on a structure rather than an `n`, it says so.

**Reproduction.** `PERIODS=1` keeps wave 1 only, and the window reproduces the committed table to the digit: `cueL` at
`t+0.500` gives ask 16.04°, cap 30.21°, `across` 0.9418; at `t+0.550` 20.05 / 25.45 / 0.8830; at `t+0.600`
21.14 / 20.12 / **−0.0408**; at `t+0.650` 19.77 / 18.67 / −0.1879. The falls land at 0.700 s (`cueL`) and 0.71667 s
(`cueR`), `cue` rides the 3 s out. The ask climbs at **80.20–80.25 °/s = 1.4006 rad/s**, i.e. `LEAN_IN_RATE`.

---

## 1. The binding term: the formula is right, the SPEED in it was wrong

### 1.1 The term, with file:line

`AttachedRider.prepareBank`, `src/physics/AttachedRider.ts3523–3531`:

```ts
const forward = this.localScratch.set(0, 0, 1).applyQuaternion(this.heading);              // :3523
const speed = this.boardVelocity.dot(forward)                                              // :3524
              - this.waterFlow.x * forward.x - this.waterFlow.z * forward.z;               // :3524
const radius = this.snapping > 0 ? this.askRadius + this.snapping * (SNAP_RADIUS - this.askRadius) : this.askRadius;
const held = Math.min(MAX_BANK, Math.atan((speed * speed) / (WATER.gravity * radius)));     // :3528
const most = this.askUngated || this.planing ? held : 0;                                    // :3531
```

`MAX_BANK = 70°` (`:474`), `TURN_RADIUS = 4.5` (`:491`), `askRadius = TURN_RADIUS` with no `askCap` switch (`:2514`),
`WATER.gravity = 9.81` (`hullForces.ts:7`).

**Ruled in and out, each explicitly, on the 267 standing frames:**

| candidate | verdict | evidence |
| --- | --- | --- |
| `MAX_BANK` (70°) | **never binds** | `held ≥ 70°` on **0 of 267** frames; the largest cap in the whole run is 54.36° |
| `R` is really `TURN_RADIUS` | **yes, 4.5 m, constant** | `leanProbe.radius` takes exactly one value, **4.5**, on 267 of 267 (`snapping = 0`, no Snap) |
| a face-slope, planing or load factor multiplies it | **no such factor exists** | the only non-`atan` term on the path is the planing **gate** at `:3531`, a 0/1 switch, and `planing = 1` on **267 of 267**, so it never gated. `min(MAX_BANK, atan(speedThrough²/(g·radius)))` reproduces `leanProbe.held` on **267 of 267** frames (`capExactOk`), max residual 1e-12 rad. **There is no room left for a factor.** |
| `leanProbe.cap` is a second reading of the bound | **no — it is the same variable** | `:3552` writes `this.leanProbe.cap = most`, and `most` is the very local clamped against two lines earlier (`asked = max(-most, min(most, wantRef))`, `:3537`) and four lines earlier for the predictor (`own = max(-most, min(most, wantOwn))`, `:3545`), in the same scope and the same substep |
| **the speed in the expression** | ⚠️ **this is the fault** | below |

### 1.2 Two quantities under one name — `speed`

The handoff's measured speeds of **7.04–8.85 m/s** are `four-numbers.ts`'s own `speed` column,
`hypot(board.velocity.x, board.velocity.z)` — **the over-ground magnitude**. The cap's `speed` is
`boardVelocity · forward − waterFlow · forward` — **the along-heading component, through the water**. On
`cueL`'s window they are different numbers:

| t+s | over-ground `speed` | along-heading `capFwd` | water's along-heading flow `capFlow` | the cap's own `speedThrough` | measured cap | cap the over-ground speed would give | cap the shoreward speed would give |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.350 | 8.846 | 8.845 | 2.604 | **6.241** | **41.42°** | 60.6° | 60.4° |
| 0.500 | 7.886 | 7.895 | 2.826 | **5.070** | **30.21°** | 54.6° | 55.5° |
| 0.600 | 7.036 | 7.019 | 2.997 | **4.022** | **20.12°** | 48.3° | 48.9° |
| 0.683 | 7.219 | 7.032 | 3.200 | **3.826** | **18.34°** | 49.7° | 47.8° |

So the handoff's "**low by about 1.5×**" is **the whole of the water-flow subtraction** and nothing else: the
along-heading water under the board runs at **2.60–3.20 m/s** with the board, and taking it out of 8.85 m/s leaves
6.24 m/s, which is exactly the speed the measured 41.42° cap wants. The two other readings are ruled out numerically:
**over-ground** gives 48.3–60.6° and **shoreward** (`frame.speedShoreward`) gives 47.8–60.6°, both ~30° too high at
the fall; **through-the-water along the heading** gives 18.3–41.4°, the measured cap to the digit.

Two smaller checks while the question was open. The engine's `forward` is 3-D and **not** flattened, unlike the
probe's own `fwd` — but `forward.y = 0` on **267 of 267** frames (the rider's `heading` carries no pitch), so the
distinction is immaterial here, and it is checked rather than assumed. And the sideslip is small where it matters:
`course − heading` is **−0.63°** at the cap's peak and only reaches 13.28° by `cueL`'s last frame.

### 1.3 Why the cap falls — and it is the WAVE's fall, not the turn's

`R` is constant and `MAX_BANK` never binds, so **the cap's fall is the speed's fall, all of it.** From the cap's peak
at `t+0.350` to the crossing frame at `t+0.600`, on `cueL`:

* `speedThrough` **6.241 → 4.022 m/s**, −2.219;
* of which the board's own along-heading velocity falls 8.845 → 7.019 = **−1.826 m/s, 82%**;
* and the along-heading water flow rises 2.604 → 2.997 = **+0.393 m/s, 18%**;
* and the cap goes **41.42° → 20.12°**.

⭐ **The decisive control is the arm with the stick at zero.** `cue` over the same frames: `speedThrough`
6.240 → 3.991 (−2.250), capFwd −1.840 (82%), capFlow +0.410 (18%), cap **41.42° → 19.84°**. Up to the crossing frame
the three arms' caps agree to within **0.285°** and their through-water speeds to within **0.031 m/s**.

**So the cap collapses by 21.3° in 0.25 s whether or not the rider asks for anything.** It is a property of the wave
and the board's run on it at this phase, not of the turn: the steer costs at most 0.03 m/s of through-water speed
before the break. `cue`'s cap bottoms at **16.39°** at `t+0.667` and recovers to 32.06° by `t+0.933`, and that rider
never falls — because its ask is 0.

The ride ends, then, because a **fixed-rate ask** (1.4 rad/s, blind to all of this) is driven into a **cap trough that
would have happened anyway**. Both halves of the collision are measured; neither is caused by the other.

### 1.4 A caveat on the ordering, stated against the headline

The headline "the ask crosses the cap and the ride is over" survives, but this probe's 60 Hz resolution **cannot order
the two**. On `cueL` the ratio reaches **0.99** at `t+0.583`, and that is already the frame on which `across` halves
(0.8392 → 0.4502) and on which the predictor's ankle command saturates its clamp (below). The ratio passes 1 one frame
later, at `t+0.600`, where `across` completes its fall to −0.0408. Collapse and crossing are **simultaneous to within
one 16.7 ms frame**, with the collapse's first frame marginally *ahead*. Do not promote either to cause of the other
on this run.

---

## 2. Which term supplies the collapse

### 2.1 The pre-registered prediction, and how it fared

> **The REST term leads at the break and the DAMPER term overtakes as the roll rate builds.**

The ankle's demand is `τ = K·(θ−φ−rest) + (K·h + C)·relative` (`:3741`), `K = 800`, `C = 80`, split by the ledger's
own step means into `termJoint = K·(θ−φ)`, `termRest = −K·rest`, `termRate` (the residual, which is exact arithmetic
because all three means are over the same substeps).

`cueL`, N·m, the ledger's step means:

| t+s | ask÷cap | `across` | termJoint | termRest | termRate | net demand | implied joint rate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.550 | 0.79 | 0.8830 | +13.3 | +4.9 | −10.0 | 8.2 | −7.1 °/s |
| 0.567 | 0.90 | 0.8392 | +11.4 | +13.0 | −13.4 | 11.0 | −9.5 |
| **0.583** | **0.99** | **0.4502** | +8.1 | **+43.6** | −29.5 | 22.2 | −20.9 |
| **0.600** | **1.05** | **−0.0408** | −0.1 | **+88.0** | −67.6 | 20.3 | −47.9 |
| 0.617 | 1.06 | −0.1704 | −16.4 | +119.7 | **−131.9** | −28.6 | −93.5 |
| 0.650 | 1.06 | −0.1879 | −79.2 | +158.8 | **−215.9** | −136.3 | −153.0 |

**`cueL`: the prediction HELD, exactly as written.** The rest term leads on the collapse frame (43.6 against 29.5 and
8.1) and on the crossing frame (88.0 against 67.6 and 0.1), and the damper overtakes it one frame later, at `t+0.617`.
The implied joint rate is **47.9 °/s** at the break — just short of the 51 °/s the three-candidate round priced for
the rate term acting alone — and the rest reaches **6.30°**, past that round's 5.1°.

**`cueR`: the prediction FAILED on the leading term.** At its own break (`t+0.600`, ratio 1.07, `across` 0.6614) the
largest term is `termJoint` at **−37.8** N·m — the ankle's passive spring on its own working angle — with rest second
(+25.0) and rate smallest (−5.6); and the rate term overtakes the rest term immediately, at `t+0.617` (+30.3 against
−22.6), not after. **So the term attribution is not direction-symmetric on this wave: 1 of 2 turn directions.**

### 2.2 The finding that supersedes the term question: the ankle's terms CANCEL, and the HIP carries it

The three terms are **large and opposed**, so the net they hand the sole is small. At `cueL`'s break the rest term is
+88.0 and the rate term −67.6, and the **net demand is 20.3 N·m against a sole bound of 108.0** — and `akOver`, the
count of substeps whose demand passed that bound, is **0 until `t+0.633`**, two frames *after* `across` has already
gone negative. **No term of the ankle's demand is near the sole's limit when the ride ends.**

What is near it is the **hip rotor**. `cueL`, live frame-end values, N·m:

| t+s | `across` | ankle `τ` | **hip rotor `τ`** | sum | sole bound | implied sole moment `(1−across)·bound` |
| --- | --- | --- | --- | --- | --- | --- |
| 0.567 | 0.8392 | +11.9 | **0.0** | 11.9 | 109.5 | 17.6 |
| 0.583 | 0.4502 | +25.2 | **+14.6** | 39.8 | 108.4 | 59.6 |
| 0.600 | −0.0408 | +12.8 | **+54.4** | 67.2 | 107.7 | **112.1** |
| 0.617 | −0.1704 | −56.2 | **+120.6** | 64.4 | 108.5 | 127.0 |
| 0.650 | −0.1879 | −132.9 | **+175.8** | 42.9 | 105.3 | 125.1 |

(The implied sole moment and the live sum are not an identity — the implied figure carries whatever else `project`'s
demand line contains, and runs 1.4–1.7× the named sum — so it is reported as implied and nothing is built on the gap.)

**The chain the ledger makes visible, with each link measured:**

1. **The predictor's sent ankle command blows through its clamp.** `heldAnkleRaw` goes
   **−3.09° → −18.86° → −33.79° → −53.28°** over `t+0.567…0.617`, against a flat bound of **±14.32°**
   (`ANKLE_REST_RANGE = 0.25 rad`). First saturation: `t+0.583` on `cueL`, `t+0.617` on `cueR`. `anklePlumb = 0`
   (`:469`), so the sent command and `wanted` are the same number.
2. **What the ankle is actually *given* is three names away from that.** `heldAnkleRaw` (sent, to −56°) → `lean`
   (clamped, ±14.32°) → `ankleRest` (lagged, reaching only −12.81°). The ledger's `rest` is the third of these. This
   is the collision the handoff already named, confirmed here on its own columns.
3. **The hip rotor is driven by the clamp's OVERFLOW.** `humanSwingStep(h, −SWING_SERIES·(wanted − ankleShare) + hipDrive(…), …)`
   (`:3739`), with `ankleShare = clamp(lean, ±HIP_SHARE·ANKLE_REST_RANGE) = ±11.46°` and `SWING_SERIES = 430` N·m/rad.
   So the rotor is silent until the command passes 11.46° and then takes 430 N·m per radian of everything past it:
   demand +55.6 N·m at `t+0.583`, +167.6 at `t+0.600`, +313.8 (clipped to `SWING_TORQUE = 200`) from `t+0.617`.
   Delivered, through `MOTOR_LAG`: **0 → 14.6 → 54.4 → 120.6 → 171.8 N·m in four frames** — while the trunk itself
   moves **0.00° → −0.07° → −0.78° → −4.53°** of a 68.8° `hipRange`, so the rotor is nowhere near its travel limit
   and what it delivers is a couple rather than a displacement.
4. **The board then rolls out from under the body, and the ankle's joint term follows it down.** The body's bank peaks
   at 4.24° and then *falls* (4.24 → 2.64 → 1.26 → −0.67) while the deck's roll runs away (4.74 → 6.19 → 8.02 → 9.66
   → 10.60). The joint angle θ−φ goes −0.01° → −10.23° and `termJoint` with it, to −142.8 N·m. That is the capsize,
   not its cause.

**Answer to Task 2, stated plainly.** Of the ankle's three candidates, **the commanded rest leads at the break** in
one of the two turn directions and the joint's own angle leads in the other; the damper opposes both and overtakes one
frame after. But **none of them supplies the collapse**: the ankle's net demand is 20.3 N·m against a 108 N·m bound on
the breaking frame. The sole moment that takes `across` negative is carried by **the hip rotor**, and the rotor is
fired by the *same* rest command, as its overflow past a clamp the command crosses in one frame.

### 2.3 Two more quantities sharing a name, both new and both measured

* ⚠️ **`rail` is shadowed inside `predictiveBank`.** The method's parameter `rail` is the board's *measured* rail
  (`roll` less the water's own tilt, `:3519`). At `:3721` a `let rail` shadows it with **the schedule's rail** — built
  from `leanAsked` and then `rail = Math.min(this.railCap, rail)`, `railCap = SCHEDULE_RAIL_CAP = 12°` (`:628`,
  `:2563`, `:3723`). The rail's-bite clamp two lines on (`:3732`) therefore tests the **schedule's** rail against
  `RAIL_BITE = 48°`. Measured consequence: `|schedRail|` never exceeds **12.00°** on any of the 267 frames, so
  `room` and `bite` are both a flat **14.3239°** on all 267 — **the rail's bite can never fire on this path.** Whether
  that is intended is the owner's or the designer's call; it is reported, not changed.
* **`railCap` is a second ceiling, and it is not the cap.** `schedRail` pins at 12.00° from `t+0.450` on both turning
  arms, while the ask runs on to 21.45° — so from 0.133 s before the crossing the controller's plant schedule stops
  following the lean it is being asked for. The pinning is **0.133 s ahead of the break and the command blow-up**, so
  it is correlated and **not** shown to trigger either. Named so it is not mistaken for "the cap" later.

---

## 3. The cheapest change that would let a rider hold a turn

**There is no cheap one. The next step is the hip's authority, and it is not a tuning parameter.** The measurement
says why, in its own terms:

* **Nothing on the cap side can help.** `R`, `MAX_BANK` and the planing gate are each ruled out above; `?askCap=4.5`
  is already measured inert; and the cap's fall is the wave's — it is identical with the stick at zero, so there is no
  turn behaviour to tune out of it. Raising the cap would only move the crossing, and the 54° cap this wave hands the
  rider at `t+0.350` did not help it then.
* **Nothing on the ankle side can help.** Its three terms cancel to 20 N·m of a 108 N·m bound at the break; clamping
  the demand (`?ankleLimit=feet`) is measured worse; widening its range (`?ankleRange=wide`) is measured innocent.
* **The hip is already the authority at the fall** — 54.4 of the 67.2 N·m named at the breaking frame, 81% — which is
  exactly what the advisor's 2026-11-15 bank-gain entry concluded structurally. This round adds *how* it arrives: as
  the ankle's **overflow**, through a 430 N·m/rad series spring, going 0 → saturated in four frames.
* **And the rotor supplies a couple, not an offset.** ⚠️ **One correction to my own first reading, from the rotor's
  own code**: `humanSwingStep` (`:3764–3777`) is *not* self-centring while the demand is large —
  `back = max(0, 1 − |swingLagged| / (0.1 × SWING_TORQUE))` zeroes the spring to `swing.angle = 0` as soon as the
  lagged demand passes 20 N·m, which it does from `t+0.600` (delivered 54.4 N·m at an angle of −0.07°, so
  `swingTorque ≈ burst ≈ swingLagged`, hence `back = 0`). The rotor is therefore not fighting itself here. What it
  *is* is a transient: the spring returns the moment the demand drops back under 20 N·m, and **the trunk has swung
  only 4.53° of its 68.8° `hipRange`** by `cueL`'s last frame (0.00° → −0.07° → −0.78° → −4.53°), which at the
  measured CoM height is a few centimetres of lateral offset. **A bottom turn is a static lateral CoM offset** (the
  advisor's 2026-11-15 entry); 160–176 N·m held for 0.1 s against a trunk that moves 4.5° is a short couple, not
  that offset. `HIP_CAPTURE_GAIN = 0` (`:441`) and its gain has already been swept 500 → 8000 N·m/m with 12 of 12
  falls at every value, so the existing signal is not the missing piece either.

**So the recommendation is the structural one: give the hip a commanded rest of its own.** Not a prescribed position
and not a velocity — *a joint rest angle with a spring and damper about it*, the identical construction the ankle
already has, and the one this project has already ruled is not a cheat (the 0.95 / 4.24 N·m pairing against 16–33 N·m
columns). It is what a rotor driven by an overflow cannot be: an angle the trunk is *asked to sit at* while the turn
lasts, instead of a torque that exists only while the ankle's command is over its clamp. **The limb that pays is the
trunk and hip**, and its reaction is already booked and already paired: the rotor's couple goes onto the body's across
row and onto the board's roll in the same step (`rhs[7] -= h·swingTorque/length`,
`rhs[3..5] -= h·swingTorque·rollAxis`, `:4731` and the note at `:3635`), and into the work ledger. Nothing new has to
be invented to make it honest; what is missing is a rest for it to hold.

**One cheap lever exists and should not be oversold.** `HIP_SHARE = 0.8` (`humanBalance.ts:53`) means the hip does not
begin until the command passes **11.46°** — 80% of a clamp the command crosses in a single frame — which is why the
rotor goes from silent to saturated in four frames, 0.017 s before `across` goes negative. Lowering it would start the
hip earlier and more gradually, and it is not on the do-not-retry list. But it is a tuning parameter, it does not give
the hip a rest to hold, and on this evidence it buys a softer onset of the same failure, not a held turn.

---

## What is measured and what is inferred

**Measured** (267 standing frames, seed 2 wave 1, three scripts, one sea): every number in §1 and §2, the
`capExactOk` identity 267/267, `planing` 267/267, `leanProbe.radius` = 4.5 on 267/267, `held ≥ MAX_BANK` on 0/267,
`forward.y = 0` on 267/267, `room = bite = 14.3239°` on 267/267, `|schedRail| ≤ 12.00°` on 267/267, the term tables,
the hip rotor's delivered torques and its trunk angle (peak 4.53° of a 68.8° range), and the no-steer control's cap
trace.

**Inferred, and labelled as such:** that the rotor's delivered torque is its clipped demand seen through `MOTOR_LAG`
(the arithmetic agrees — 430·overflow clipped at 200 against 120.6–175.8 delivered, and the near-zero trunk angle
makes `swingTorque ≈ burst` — but `swingLagged` itself is not a column, so `back = 0` is arithmetic, not a read);
that the deck rolling away is a consequence of the rotor's reaction rather than a parallel cause (the sign and the
site are read from `:4731`, not measured apart); and §3's judgement that a hip rest would hold what the present rotor
cannot, which is a design claim on the advisor's structural argument and **not** something this run tested.

**Not tested and worth saying so:** waves 2 and 11, whose turns hold, are the test that would break §1.3's
"the cap's fall is the wave's" — if their caps do *not* collapse through the same phase, the reading is confirmed on a
second population; if they do, something else separates a holding turn from a failing one.
