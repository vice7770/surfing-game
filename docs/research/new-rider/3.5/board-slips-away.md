# The board slips away from his feet — the mechanism, and what each option costs

> **The board does not slide across his soles and it does not fly off them: it ROTATES out from under them. A turn
> banks the deck past 20° in 0.68 s, the body does not bank with it, and his stance is only about 11° wide — so the
> line from his centre of mass to the deck runs off the edge of his feet, the centre of pressure pins at that edge
> (`limit = 'tip'`, 90 of 90 riders turning on his own spot, 0.08 s after the roll), and from there the contact can
> no longer put force where the body needs it while the board goes on rotating away.**

**The number that makes it inevitable:** the foot support is **0.260 m across — identically in all three stances** —
with the centre of mass a median **0.676 m** above the deck, so **the body's lean and the deck's bank may differ by
only 10.9° before the centre of pressure pins**. **A turn is worth 20°+.** And because that width is the same in
tall, crouch and compress, the clamp that fires cannot depend on stance — **which is exactly what he reported:
*"either in compress or not."***

**It is not friction**, although his words name friction exactly. `AttachedRider` has a tangential clamp called
`slip` whose separation is named **`foot slip`** — and on his own spot **that cause fired in 0 of 180 riders.** The
cone did bind at all in **6 of 90 turning and 21 of 90 with the stick at zero**, so it is a real participant and not
an absence; **but it was never the first condition in any run, and turning it arrives at 1.008 s against `tip`'s
0.767 s.** The game names these falls `balance` — **89 of 90 turning, 84 of 90 not.**

**It is not the board study's energy leak either.** The brief's hypothesis was that his report and #285's
*"4–23 kW, 17–58 g throws above 26° up / 30–38° down"* are the same event. **On his own spot not one of those bands
is reached: slope > +26° in 0 of 180, slope < −30° in 0 of 180, feet above 17 g in 0 of 180, power above 4 kW in 1 of
180.** The steepest water under the board anywhere in the sweep is **−11.6° to +6.8°**; #285 is about 26–50°. **The
Canyon has not got the water #285 is about.**

**⚠️ And there is a reason for that which matters more than the refutation: A-lite is ALREADY ON for the rider he
plays.** `AttachedRider.powerCapped` is `capsLegs || freeBody` (`:2625`), and `freeBody` is true for `rider: 'new'`
standing, so `BoardBody.ts:1531`'s A-lite branch is taken by his rider **by default**. Proved, not argued: **his
address run with and without `?legPower=cap` is bit-for-bit identical — 5 344 frames × 78 columns = 416 832 values,
0 differences, all 96 run summaries identical in `(fellAt, cause, frames)`.** **The one remedy #285 proposed for this
mechanism is built, shipped, already in effect in what he rides — and he still falls.**

**His "1 second" is exact. His "speed increases" is not.** Turning, the median ride is **0.92–1.45 s** across 4–8 m/s.
But across **180 riders in two stick arms, faster rides last LONGER** (0.95 s at 2 m/s → 3.62 s at 10 with the stick
at zero; 0.95 → 2.28 s hard over). **What halves the ride is committing the stick, not gaining speed.**

---

## The options, and what each costs

Nothing below is built, tuned or recommended. **The owner rules.** The verdict to respect is his own —
***"Looks quite realistic, but unplayable"*** — so the table is ordered by **how much realism each option keeps**,
not by how well it stops the effect. **Row 0 is not an option; it is the one this round had to retire.**

| # | Option | What it changes | Keeps the realism? | Cost, measured or named | Needs a ruling? |
|---|---|---|---|---|---|
| **0** | ~~Ride `?legPower=cap`~~ | **nothing — VOID** | — | **Bit-for-bit no-op on his address** (416 832 values, 0 differences): A-lite is already on for `rider: 'new'` standing. **Do not spend a ride on it** | no |
| **1** | **Let the body BANK with the deck** (spec step 3.1's body lean) | the body's attitude as the deck rolls, so the weight line stays inside the feet through a turn | **Yes — it is what a real surfer does, and the only option that removes the cause** | **Unbuilt and large.** A-lite's own L3 analysis reached the same place from the other side: *"The body stands plumb on a deck 25–50° off, its weight line passes outside the feet (tip) … Only the body lean can fix this."* It is the balance track's own open problem; 3.2y retired its benchmark and no route has held the climb. **The measured gap is 11° of stance against 20°+ of turn** | **Yes**, and it is the honest fix |
| **2** | **Widen the standing foot support** (`riderPosture.ts:96`, `xMin/xMax = ±0.130 m`) | how far the CoP may travel across the deck before it pins — i.e. the 10.9° | **Arguably, and the file answers it itself.** ±0.13 m is defensible *if the feet lie along the stringer*; real surfers **angle** both feet, and an angled 0.26 m foot projects further across. **The same function already uses ±0.18 m (prone) and ±0.23 m (push)** — the rail of a 0.464 m board — so neither number would be invented | Cheap and aimed at **the clamp that actually fires (90 of 90)**: **±0.18 m buys 14.9°, ±0.23 m buys 18.8°** at the median 0.676 m CoM. ⚠️ **It buys angle, not authority** — the body still will not bank, so it moves the boundary and leaves the mechanism; and 18.8° still does not cover a 20° turn | **Yes** — it is a geometry constant and only he can say what a stance is |
| **3** | **Let the ankle and sole carry a roll moment the support's width cannot** | the bound on the ankle's torque, currently the feet's half-width × load | **Yes if it stays an ankle.** A real surfer's sole and the rail's bite do transmit a moment; this bounds an existing channel rather than inventing one | Named, not measured here. 3.5d found the ankle already carries **45–56 %** of the deck's roll acceleration, so the channel exists | **Yes** |
| **4** | **Make the turn bank the deck less** | the roll a given stick earns | **No for the surfing, yes for the rider.** Rolling the board *is* turning it | Cheap. But memory `steep-faces-for-tricks` wants more authority, not less, and this is the one option that directly fights the thing he enjoys | **Yes**, and it contradicts a standing requirement |
| **5** | **Gentler water in the first second** | the spot's face steepness at the take-off | **Yes for the rider, no for the wave** | **Pushing on the wrong end:** the water is already −11.6° to +6.8° and reaches none of #285's bands. **It is not the water that is steep, it is the board** | **Yes** |
| **6** | **Limit the catch-up push, or hold the body plumb kinematically** | the coupled solve's catch-up term | **No.** A prescription realised by whatever force it takes — what `uprightVelocity` did on the old rider, what 3.2y retired, and the shape of change rejected in #215 | Would work and would be a cheat | **It should not be offered** |
| **7** | **Leave the physics; change what the take-off asks** | where and how fast the rider stands up, and what the first second demands | **Yes entirely** | Does not touch the mechanism, so it returns on every turn | **Yes** |

**The honest reading: the option that looked free is a no-op; the real fix (row 1) is unbuilt and is the balance
track's own open problem; and row 2 is the only cheap change aimed at the clamp that actually fires — 10.9° of
stance against a 20° turn, on a support that is the same width in every stance.**

---

## 0. What was run, and the instrument's own faults first

**Read-only. No byte under `src/` or `server/` is changed** — the diff against the merge base touches only `docs/`.
The probe is `3.5/slip.ts` beside this file. Fields TypeScript calls private (`frictionUsed`, `kneeUsed`, `rawMargin`,
`limit`, `limitTime`, `legLoad`, `desiredCop`, `sway`) are read through one getter that never writes.

**The probe is inert, proved rather than asserted.** The same bench with every extra read-out on and off:
**3 263 frames × 25 shared columns = 81 575 values compared, 0 differences**, and all **36** run summaries identical
in `(fellAt, cause, frames)`. A broken probe here would read a column that is never written, or compare against
`NaN`; both controls below exist to catch that.

### The controls

| Control | Cell | What it must show | What it showed |
|---|---|---|---|
| **negative** | 0.5° face, planing at 6 m/s, stick never touched | **No contact channel may bind** | `tipBind`, `flightBind`, `coneBind`, `overhang` all **absent**; the cone never bound. ✅ |
| **positive** | 30° face, 12 m/s | **The cone detector must fire** | `tipBind` and `flightBind` from frame 1, `fricSat` and `coneAt09` at frame 40, and **`coneTan` sat at exactly 0.900** = `FOOT_FRICTION`. ✅ |
| **two independent reads of the cone** | every frame | `frictionUsed` (the class's own saturating ratio) and `coneTan` (`tan` of the angle between the **public** `contact.force` and the deck normal) must agree | They do; **neither is used alone as the discriminator**, per the brief |

⚠️ **`coneTan` is `NaN`, not 0, when there is no contact force at all.** That is the brief's own trap and it is guarded
explicitly (`Number.isFinite(coneTan) && …`); a run in flight contributes nothing to the cone count rather than a zero.

### ☠️ THREE FAULTS IN MY OWN FIRST READ, FOUND BY THE CONTROLS AND CORRECTED

These matter more than any single number below, because two of them would have produced a confident wrong answer.

1. **The flush placement every rig in this track uses starts the board DRY and the leg UNLOADED.** `3.5/foam.ts` and
   `3.3/plant.ts` place the board's centre of mass one `shape.centerOfMass.y` along the surface normal — the hull's
   bottom exactly **on** the water. Measured: **frame 1 is fully dry (0 of 48 patches submerged) in 480 of 480 runs**,
   `clear` +0.028 to +0.053 m; the pair then took a median **32 frames (0.53 s)** to reach a frame that was both wet
   and loaded, and **101 of 480 runs fell before they ever got there.** Against median ride times of 0.5–1.8 s, **a
   fifth of that bench was never a ride and the rest spent half its life settling.** `SINK` drops the placement so the
   hull starts at a draft; at **`SINK=0.06`** every run is wet and loaded on **frame 1, 480 of 480, 0 failures**.
   *(The board displaces 25.75 L against 75.5 kg of board-and-rider, so a fully submerged hull **is** the static
   equilibrium — 65 % of the weight must come from planing.)*
2. **`limit` is ONE SUBSTEP of 32, not the step.** `project` runs per substep and leaves `limit` at whatever the last
   one asked for. Read as a step summary it reported `limit == 'flight'` for frames whose **peak normal load was 0.89
   body weights with `inContact == 1`**. The class's own answer is **`limitTime`**, the per-limit memory decaying over
   `CAUSE_MEMORY = 0.2 s`, which is what `dominantLimit()` and therefore the separation's own **name** are built on.
   **Every bind counted in this document is read off `limitTime`.**
3. **My first "slip rate" was measuring the LEAN.** The body's centre of mass moving relative to the deck point under
   the stance read > 0.10 m/s on frame 1 of every run including the quiet control, because a body that merely leans
   over planted feet has a large one. It is kept as **`comRel`**, correctly named, and **nothing here rests on it.**

**And one proposed mechanism of mine that the data REFUTED.** I predicted flight from
`demand = a_deck·û + g(ŷ·û) < 0` — the deck accelerating down its own normal faster than gravity can carry the body.
Measured over **32 100 frames: 64.3 % agreement, and only 16.5 % of frames in flight had `demand < 0`.** It fails
because it is a frame difference over 32 substeps and the contact's loss is a substep event. **It is not a usable
predictor and is reported here only so that nobody builds on it.**

---

## 1. Which build, and what `?physical` actually gates

The owner's address, his words:

```
?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on
```

- **`?rider=new` is strictly opt-in** (`riderSwitch`, `PhysicalMode.ts:1094`), so his address **is** the new rider and
  the balance track is aimed at the rider he plays. *(An earlier worry that "plain main" meant the shipped rider is
  settled by his own address, not by this bench.)*
- **⚠️ `?physical` gates NO physics.** It is read once, at `main.ts:89` — `const startRide = devFlag('physical') || demoMode !== null`
  — and its only use is `main.ts:1360`, choosing `start: 'ride'` instead of `start: 'menu'`. **It is a start-screen
  shortcut.** Every shot list this session has handed him began with it, and its absence from his address changes
  nothing about the code path. **The benches have not been running a mode he does not use.**
- **`?legPower=cap` EXISTS.** The brief could not find `legPower` in `src/` and asked which. It is in
  `PhysicalMode.ts:1083` (`legPowerSwitch`), `SurfZoneConfig.legPower`, `SurfZoneRunner.ts`,
  `RideSessionOptions.legPower` (`RideSession.ts:159`), `AttachedRider.capsLegs` (`:2500`) with the physics at
  `:4824–5013` and `BoardBody.ts:1529/1689`, tested in `src/physics/legPower.test.ts` and
  `PhysicalMode.test.ts:1436–1454`, and documented at `docs/research/board-in-water/a-lite/`. **The switch is off by
  default — but the behaviour is not**, because `powerCapped` is `capsLegs || freeBody` and `freeBody` is true for
  `rider: 'new'` standing. **So setting the switch changes nothing on his address, proved bit for bit** (§0's method,
  416 832 values, 0 differences). **A-lite is on in what he plays whether he asks for it or not.**

---

## 2. WHAT FAILS FIRST — the ordering, with the full signal set paired

Every figure in this section is `RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on`, `SINK=0.06`, the settled
placement, **480 runs** = 5 slopes × 16 entry speeds × 3 stances × 2 sticks on `FaceWater` (H 1.4 m, depth 6 m,
heading 45° off the fall line), each cut at its first `attached == 0` with that frame emitted and nothing after it
read. **Separation freezes every rider column** (`separate` sets `attached`/`climbing`/`inContact`/`separation` and
never `phase` or `upright`), so the cut is what keeps this document off frozen frames.

### In the 0.2 s before the release, of 480 runs

| Signal | Runs | What it means |
|---|---|---|
| **CoP clamped — `tip`** | **480** | the body's weight line falls **outside the feet**. Universal. |
| board at ≥ 0.97 g | 448 | ⚠️ **not by itself free fall** — 1 g on a 2.54 kg board is a 25 N imbalance, ~3 % of what it transmits. It *is* free fall in the cells where it coincides with a dry hull and zero load |
| **leg in tension** (`legForce < 0`) | **407** | the leg is being **pulled**, not pushing — the board is leaving |
| normal load zero | 377 | the deck has left the soles |
| leg stretched > 2 cm | 311 | measurably pulled apart |
| hull fully out of the water | 271 | the board has launched |
| knee cap bound (`impact`) | 1 | |
| **friction cone bound (`slip`)** | **7** | **the thing his words name, and it is not firing** |

**Causes as the game itself names them: `balance` 274, `lost board` 205, `foot slip` 1, `impact` 0.**

### The order, measured

**The hull leaves the water BEFORE the contact loses its load in 434 of 480 runs** (plus 28 where the hull left and
the contact never failed, 7 the same frame, and **4** the other way). Median gap: the load falls to zero **5 frames
(0.083 s) after** the hull goes dry.

> **So the answer to the brief's ordering question is: the CONTACT fails, and it fails because the BOARD has already
> gone. `tip` is present from the start and is the clamp that lets the drift grow; the launch and the load loss are
> downstream of it.** ⚠️ **This ordering is stated on the analytic face. §4 reads the real Canyon sea, where it
> differs, and the sea is the water he rides.**

---

## 3. Speed or slope — they are separable, and the answer is NEITHER ALONE

His words name **speed**; #285 names **slope**. On a real wave they rise together, so this was measured on
`FaceWater`, where the face's `slope` is a free parameter and the board's entry speed is set at placement, **with the
wave's own height and celerity held**. The quantity read is the **flight duty cycle** — `limitTime.flight / 0.2`, the
share of substeps in which the contact had to pull and could not — median over the mid-ride frames, pooled over 3
stances × 2 sticks, **12 runs a cell**.

| slope \ entry | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|
| **12°** | 0.00 | 0.00 | 0.00 | 0.02 | 0.00 | 0.00 | 0.00 | 0.00 | **0.65** | **0.64** |
| **14°** | 0.00 | 0.00 | 0.00 | 0.06 | 0.04 | 0.04 | **0.75** | **0.78** | **0.74** | **0.64** |
| **16°** | 0.05 | 0.11 | 0.06 | **0.42** | **0.68** | **0.76** | **0.80** | **0.77** | **0.70** | — |
| **18°** | 0.16 | 0.13 | 0.31 | **0.74** | **0.81** | **0.81** | **0.77** | **0.72** | — | — |
| **20°** | **0.46** | **0.66** | **0.78** | **0.82** | **0.81** | **0.79** | **0.77** | **0.73** | — | — |

**It is a step, not a gradient**, and the step coincides exactly with the hull leaving the water: the fraction of
frames with the hull **fully dry** is **0.00 below the step and 1.00 above it**, in every cell, and the board's
acceleration goes to exactly **1.00 g** — free fall — above it.

**The boundary, as the lowest entry whose median duty exceeds 0.25, with the achieved speed there:**

| slope | 12° | 14° | 16° | 18° | 20° |
|---|---|---|---|---|---|
| achieved speed at the crossing, m/s | **8.60** | **6.95** | **4.67** | **3.73** | < 2.03 |

- **His "speed increases" is right**: at any fixed slope, raising speed crosses the boundary.
- **#285's "slope" is right**: at any fixed speed, raising slope crosses it, and the threshold speed falls as slope
  rises.
- **Neither is the variable on its own.** ⚠️ **Robustness: measured at two placements, the crossing agrees to within
  0.15 m/s at 12° and 14° and moves by 0.9–1.7 m/s at 16° and 18°** (flush vs `SINK=0.06`), so the boundary is solid
  at low slope and placement-sensitive at high slope. **5 slopes is 5 points, not a law**, and no closed form is
  offered for it.

### His ~1 second, confirmed

**Median time from standing to separation, 480 runs: 0.43 s to 1.82 s across the cells**, with most cells at
**0.5–0.85 s** once the boundary is crossed and **1.0–1.8 s** below it. On the **real Canyon sea** the first three
riders read **1.37 s, 1.77 s and 1.40 s**. **His "stands 1 second in the board" is the right order of magnitude and
this bench reproduces it.** Figures are **plain medians**; this track's `qt(v, 0.5)` is the **upper middle** element
and has already moved a published headline, so it is not used anywhere in this document.

---

## 4. HIS OWN SPOT — the real Canyon, and it does not agree with the analytic face

§2 and §3 are `FaceWater`, an analytic face, chosen because it is the only way to cross speed with slope. **§4 is the
water he rides**, and where the two differ **this section wins.**

**The rig.** `MODE=sea`, the Canyon as `?canyonWaves=true` builds it: `physicalSettingsFor('canyon', …)` at stage 2
with `canyonBed: 'b'`, `compute: 'cpu'`, seed 1, medium swell, the bundle run under a wrapper that **prepends an
object** `globalThis.location = { search: '?canyonWaves=true' }` (a bare string silently benches the default Canyon
via `devTools.ts:9`). **Seatbelt read off the solver: grid `400 × 451 = 180 400` cells — Canyon B, not the default
Canyon's 400 × 507 = 202 800 — spun up on the CPU in 115.6 s.** 90 riders = 10 entry speeds × 3 stances × 3 trials,
placed 0.75 m seaward of the break point at 45° off the fall line, `SINK=0.06`, **11 182 live frames**, every run cut
at its first `attached == 0`.

### WHAT FAILS FIRST, on his spot, with the full signal set paired

Median first frame of each condition, over 90 riders. **This is the brief's ordering question answered on his own
water.**

| condition | riders | median first frame | s |
|---|---|---|---|
| hull out of the water | **3 / 90** | 20 | 0.333 |
| **CoP clamped — `tip`** | **89 / 90** | **70** | **1.167** |
| CoP overhang > 5 cm | 57 / 90 | 76 | 1.267 |
| friction cone bound (`slip`) | 21 / 90 | 76 | 1.267 |
| **off the plane** (`planing == 0`) | 81 / 90 | 86 | 1.433 |
| bank cap at exactly 0 | 81 / 90 | 86 | 1.433 |
| board roll > 20° | 83 / 90 | 94 | 1.567 |
| local rail > 20° | 83 / 90 | 94 | 1.567 |
| balance margin < 0.1 | 40 / 90 | 94.5 | 1.575 |
| friction fully used (`fric = 1`) | 32 / 90 | 99.5 | 1.658 |
| leg in tension | 42 / 90 | 99.5 | 1.658 |
| normal load zero | 30 / 90 | 100.5 | 1.675 |
| posture error > 0.25 m | 24 / 90 | 133 | 2.217 |
| **stick asked** | **0 / 90** | — | — |

**The first condition of each run: off the plane in 55, `tip` in 24, roll > 20° in 8, rail > 20° in 3.**

**Causes as the game names them: `balance` 84, `lost board` 5, `foot slip` 0, one rider still attached at 5 s.**

> **The order is: the board drops off the plane or the weight line leaves the feet → the CoP pins at the support edge
> → the overhang grows → the board rolls → the load goes → he is released.** **The contact's failure is LATE in the
> chain, and the launch that dominates the analytic face is 3 of 90 here.** Nothing in it is a friction slide.

### The peaks, against the board study's own bands

| quantity | this bench, his spot | #285 with the leak open | reached? |
|---|---|---|---|
| contact power, peak per run | median **1.68 kW**, max **3.82 kW** | 4–23 kW (31 kW/frame) | **0 of 90 above 4 kW** |
| acceleration at the feet | median **2.93 g**, max **5.9 g** | 17–58 g throws | **0 of 90 above 17 g** |
| slope under the board, up | max **+6.8°** | > +26° | **0 of 90** |
| slope under the board, down | min **−11.6°** | −30 to −38° | **0 of 90** |
| peak normal load | median **1.31**, max **1.96** body weights | (cap 4) | — |

**3.82 kW sits just under A-lite's own instant cap of 4 380 W at 73 kg**, which is independent evidence that the cap
is live on his rider — as the bit-for-bit no-op above proves directly.

### At the moment he is released

Speed **median 1.40 m/s** (range 0.27–9.07) — **the board has already slowed right down by the time he comes off**;
board roll **range −91.4° to +90.8°** — it has rolled over; CoP overhang in the last 0.2 s **median 0.089 m, max
16.6 m** — the line of action ends metres off the board; friction used **median 0.786** of the cone.

### ⚠️⚠️ THE SPEED DEPENDENCE ON HIS SPOT IS THE OPPOSITE WAY ROUND — with the stick never touched

| entry speed, m/s | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|
| median fall time, s | **0.95** | 1.15 | 1.37 | 1.83 | 1.87 | 2.23 | 2.73 | 3.27 | **3.62** | **0.13** |
| cone bound in the last 0.2 s | 2/9 | 4/9 | 5/9 | 3/9 | 1/9 | 0/9 | 0/9 | 2/9 | 4/9 | 0/9 |

**From 2 to 10 m/s the ride gets monotonically LONGER — 0.95 s to 3.62 s, a factor of 3.8 — which is the reverse of
*"he falls when the speed increases."*** 9 riders a cell, 3 stances × 3 trials.

⚠️ **The 12 m/s cell is excluded from that reading and flagged, not smoothed:** all 9 riders ended at **0.133 s = 8
frames**, which is a placement that fails immediately rather than a ride, and I do not claim it as a speed effect.

**This is measured with the stick at zero, and he was playing.** §5 is the same sweep with the stick hard over,
because a rider who is turning is asking for bank, the bank he may ask for is capped at `atan(v² / g·4.5)` which
**grows with speed**, and that is the one channel in the code through which rising speed could plausibly produce his
report. **Until §5 the speed clause of his report is not reproduced, and that has to be said plainly.**

### His stance claim, checked

He said it happens *"either in compress or not"*. **Every stance fell, and the ride length barely moves:**
**tall 1.87 s (29 of 30 fell), crouch 1.73 s (30 of 30), compress 2.15 s (30 of 30).** **His stance-independence
claim holds on his own spot.** The two leg switches in his address were therefore checked as a control rather than a
suspect, and `?stanceReach=keep` / `?deepen=on` are not the variable.

---

## 5. ⭐ THE STICK OVER — the same sweep, turning, and THIS is his ride

§4 held the stick at zero. **He was playing, so he was turning.** Same spot, same seatbelt, same 90 riders, the only
change `STICKS=1` (hard over, held). **This is the arm that reproduces what he described**, and the order changes.

| condition | riders | median first frame | s |
|---|---|---|---|
| stick asked | 90 / 90 | 1 | 0.017 |
| hull out of the water | 1 / 90 | 21 | 0.350 |
| **board roll > 20°** | **80 / 90** | **41** | **0.683** |
| **local rail > 20°** | **80 / 90** | **41** | **0.683** |
| off the plane | 55 / 90 | 45 | 0.750 |
| bank cap at exactly 0 | 55 / 90 | 45 | 0.750 |
| **CoP clamped — `tip`** | **90 / 90** | **46** | **0.767** |
| CoP overhang > 5 cm | 76 / 90 | 50.5 | 0.842 |
| friction cone bound (`slip`) | **6 / 90** | 60.5 | 1.008 |
| friction fully used (`fric = 1`) | 13 / 90 | 63 | 1.050 |
| leg in tension | 32 / 90 | 66 | 1.100 |
| balance margin < 0.1 | 52 / 90 | 69 | 1.150 |
| normal load zero | 11 / 90 | 73 | 1.217 |
| posture error > 0.25 m | 21 / 90 | 99 | 1.650 |

**The first condition of each run: `tip` in 35, off the plane in 24, rail > 20° in 19, roll > 20° in 12.**
**Causes: `balance` 89, `lost board` 1, `foot slip` 0.**

> **THE ORDER, TURNING: the deck banks past 20° at 0.68 s → the weight line leaves the feet 0.08 s later at 0.77 s,
> in 90 of 90 → the overhang grows → and the board goes on rotating out from under him. The friction cone binds in 6
> of 90 and always LAST. The deck leaves the soles in 11 of 90, last of all.**

### The number that makes it inevitable, and it is why his report is stance-independent

**The foot support is 0.260 m across (±0.130 m) and 0.750 m along — IDENTICALLY in all three stances**
(read off 7 208 frames: tall, crouch and compress all 0.2600 × 0.7500). **And that is by construction, not
coincidence:** `riderPosture.ts:96` sets `feet = { xMin: −0.13, xMax: 0.13, … }` once and hands the same object to
both the `standing` and `landing` phases, while the crouch and Compress are **leg-depth** changes that never leave
`phase === 'standing'`. **So no stance a player can hold changes the width of the support at all.** *(For scale, the
same function gives `prone` ±0.18 m and `push` ±0.23 m — both wider than the stance a rider surfs on.)* The body's centre of mass
sits a median **0.676 m** above the deck (range 0.430–0.925). So the line from the centre of mass to the deck leaves
the support when the body's lean and the deck's bank differ by

| CoM height over the deck | 0.600 m | **0.676 m (median)** | 0.857 m |
|---|---|---|---|
| mismatch at which the CoP pins | 12.2° | **10.9°** | 8.6° |

**A turn rolls the deck past 20° in 0.68 s. The stance allows about 11° of mismatch.** Measured lean of the centre of
mass over the deck: **median 6.3°, max 56.7°.**

> **So the board does not slide out from under his feet; it ROTATES out from under them, and the stance runs out of
> width at about 11° while the turn is worth 20°+. Because the support is the same 0.26 m in every stance, the clamp
> that fires cannot depend on stance — which is exactly what he reported: *"either in compress or not."***

### ⚠️ His speed clause is NOT reproduced in either arm, and the stick does not rescue it

| entry speed, m/s | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|
| median fall, **stick 0** | 0.95 | 1.15 | 1.37 | 1.83 | 1.87 | 2.23 | 2.73 | 3.27 | 3.62 | *0.13* |
| median fall, **stick hard over** | 0.95 | 1.15 | **0.92** | **1.00** | **1.42** | **1.33** | **1.45** | 2.08 | 2.28 | *0.13* |

**The stick roughly halves the ride at every speed above 3 m/s — 1.37 → 0.92 s at 4, 3.62 → 2.28 s at 10 — but the
trend with speed still RISES in both arms.** 9 riders a cell, 3 stances × 3 trials, 180 riders in all.

> **His ~1 second is reproduced exactly: turning, the median ride is 0.92–1.45 s across 4–8 m/s. His
> "falls when the speed increases" is NOT: in 180 riders over two stick arms, faster rides last LONGER.** What
> actually shortens the ride by about half is **turning**, not speed. ⚠️ **The honest caveat: a held-hard-over stick
> is not playing either, and he modulates. What this round can say is that the monotone speed effect his words
> describe does not appear in either arm, and that something a player does — commit the stick — does.**

**Peaks, turning:** contact power median **1.86 kW**, max **4.42 kW** (**1 of 90 above 4 kW**); feet median **3.45
g**, max **6.9 g** (**0 of 90 above 17 g**); slope still **0 of 90** in either of #285's bands.

---

## 6. WHAT REFUTES THE BRIEF THIS ROUND WAS GIVEN

Five premises were handed to me. **None survived intact — four were refuted outright and one was superseded by the
owner himself — and they are listed before anything is claimed.**

1. **"`legPower` may never have been built — check, and say which."** It was built, in full, with its own study. **And
   it is already active for the rider he plays** (`powerCapped = capsLegs || freeBody`), proved by a bit-for-bit
   no-op over 416 832 values. **So the brief's strongest lead — "the one proposed fix for this exact mechanism has
   been sitting unbuilt" — is wrong in the most useful possible way: it is not unbuilt, it is already running, and it
   does not solve his problem.**
2. **"His report and #285's mechanism are the same event."** **Refuted on his own spot.** None of #285's four bands is
   reached by any of 90 riders. The Canyon's face under the board is −11.6° to +6.8°; #285 is about 26–50°. The two
   are not the same event, and #285's regime is reachable only inside a tube.
3. **"The trigger is increasing speed."** **Not reproduced in either stick arm — the opposite happened in both.**
   Stick at zero, the ride lengthens 0.95 → 3.62 s from 2 to 10 m/s; stick hard over, 0.95 → 2.28 s. **180 riders,
   and faster is longer every time.** What halves the ride is **committing the stick** (1.37 → 0.92 s at 4 m/s,
   3.62 → 2.28 s at 10). **His ~1 s is exactly right and his speed clause is not**, and the most likely reconciliation
   — which this round did NOT test and should not be read as having tested — is that in play he reaches speed and
   turns at the same moment, so the turn is what he is feeling. ⚠️ **A held stick is not play either.**
4. **"`?stanceReach=keep` and `?deepen=on` are the primary axis — if the effect only appears with these on, nobody
   would have found it."** Superseded by his own correction (*"either in compress or not"*), and the control agrees
   with him: every stance fell, within 0.42 s of one another.
5. **"The board leaves his FEET — this report is about the contact itself, not the body's attitude over a contact
   that holds."** **Refuted, and this is the most consequential one.** Turning, the deck leaves the soles in **11 of
   90** riders and does so **last** (frame 73); the friction cone binds in **6 of 90**, also last (frame 60.5). What
   fires is **`tip` in 90 of 90 at frame 46** — and `tip` is *precisely* a statement about **the body's attitude over
   a contact that is still holding**: the weight line has left the feet while the feet are still loaded. **So the
   balance track is aimed at exactly the right thing, and the brief's instruction to look past it was wrong.**
   The contact failure is the last link in the chain, not the first.

**And one premise of my own that the data refuted:** I predicted contact loss from
`demand = a_deck·û + g(ŷ·û) < 0`. **64.3 % agreement over 32 100 frames, and only 16.5 % of frames in flight had
`demand < 0`.** Frame differences cannot see a substep event. **Nobody should build on it.**

---

## 7. KNOWN GAPS, stated

- **No figure here is a ride.** Every rider is placed, holds one stance, and either never touches the stick or holds
  it hard over for the whole run. **A player modulates.** The owner's own standing instruction is that bot rides are
  not evidence of feel, and nothing here is offered as such — only as the mechanism's identification.
- **The placement is still an initial condition, not a take-off.** `SINK=0.06` removes the dry-and-unloaded start,
  but the pair still appears on the water at a chosen speed rather than standing up out of a paddle. **His window is
  the first second after standing, and a real pop-up is not benched here at all.** That is the single largest gap
  between this document and his report.
- **Five slopes is five points.** §3's boundary is not a law and no closed form is offered for it. It reproduces to
  within 0.15 m/s at 12–14° across two placements and moves 0.9–1.7 m/s at 16–18°.
- **One seed, one swell, one spot.** `SEED=1`, medium, Canyon B. The sea sweep is 3 trials 1.5 s apart, so it samples
  three phases of one swell, not three swells.
- **Frame-rate measurement of substep events.** `feetG`, `boardG` and `powerW` are differences over 1/60 s across 32
  substeps, so **they read lower than any substep peak** and none of them refutes #285's substep figures. What
  refutes #285's relevance here is the **slope**, which is not a rate.
- **`comRel` is not slip** and nothing rests on it; see §0.
- **The 12 m/s sea cell** fails at 8 frames in all 9 riders and is excluded and flagged, not averaged in.
- **Populations are stated with every number and every median is a PLAIN median.** This track's `qt(v, 0.5)` is the
  **upper middle** element and has already moved a published headline, so it is used nowhere in this document.

---

## 8. Verification

| check | result |
|---|---|
| `git diff --numstat` vs the merge base | **two new files, `+456/-0` and `+624/-0`, both under `docs/`** |
| `git diff vs origin/main -- src server` | **empty — not one byte of `src/` or `server/` touched** |
| `./node_modules/.bin/tsc -b` | **clean, exit 0** |
| `vitest run src/physics --maxWorkers=1` | **58 files, 638 passed, 21 expected fail**, 267 s ⚠️ *(the 2026-11-16 handoff quotes 60 files / 651 passed / 21 expected fail from a different invocation; mine is `src/physics` alone and I do not claim parity with that figure)* |
| probe builds | `rolldown` clean |
| probe inert | **81 575 values over 3 263 frames × 25 columns, 0 differences**; 36 run summaries identical |
| `?legPower=cap` no-op on his address | **416 832 values over 5 344 frames × 78 columns, 0 differences**; 96 run summaries identical |
| Canyon seatbelt | wrapper **prepended as an object**; grid read off the solver as **`400 × 451 = 180 400`** (Canyon B, not the default's 202 800); spun up on the CPU in **115.6 s** |
| no ledger turned on | `bankLedger` left off; the probe reads only, through one getter |

**Scratch files were deleted.** Nothing was installed; `node_modules` is a symlink to the main checkout's; `tsc` was
run as `./node_modules/.bin/tsc`; every bench ran one worker.
