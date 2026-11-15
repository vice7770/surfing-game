# Step 3.3 — the board's side

`3.2/README.md` Parts 1–24 are this folder's base and are not repeated. Part 24 (step 3.2z) closed the body's side of
the new rider's trim fall — three roll authorities spent, the hull measured and in the right physical band, the fall
test shown kinder than a human's — and named one unmeasured mechanism to open 3.3 with. This folder is that side.

Tags as in 3.2: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

---

# Part 25 — the board's across authority, measured; and the gain that cannot reach one

Written 2026-11-15 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33a`, cut from `main` at
**50f43025** (step 3.2z's merge), so Part 24 is its base.

**The round had one job**, in the coordinator's words: *"Your job is to find out whether the board can deliver it,
before anyone builds a controller"* — what across-acceleration the board can produce under this rider at the trim
condition where it capsizes, how fast, and through what inputs; and to resolve as a first-class question the
discrepancy Part 24 §6 handed over between 3.2y's hull side force of **−384 N/rad** and Part 24's own measured net
base drift of **0.00–0.38 m/s²**. The brief named its own likeliest error: *"the likeliest candidate is my framing of
steering as the answer."*

**That is the error, and the discrepancy is not one.** The two numbers were never the same quantity, and when the
base's across acceleration is measured as an acceleration the board turns out to be **already aimed, already carrying
1.58–3.47 m/s² of it in one direction, and already within 0.23–1.45 m/s² of the body it is supposed to chase** [M].
What the board cannot do is produce that authority **on command, in time, or with a gain of one** — and the third of
those is the round's result and is structural, not a tuning failure. This round ships **no change to the game and no
change to any source file**: one probe, three ladders over fourteen cells, **168 runs**, and a diagnosis.

## 0. The datums, and the quantities, stated once

Three axes and three "across accelerations" are in play and Part 24's reading turned on telling them apart.

- **The across axis** is the board's own **+x** — the surfer's toes-to-heels, the direction the feet's half-width is
  0.130 m in. `latPair`, `latWater` and the `bySource` ledger are taken on its **horizontal projection**
  (`side = (fwd.z, 0, −fwd.x)`, `trimbank.ts`'s own `side`), positive toward the board's **level-left**. `feetAccel`
  and `bodyAccel` are Part 24's own columns and are taken on the **full** +x axis as it is at that frame.
- **Every angle** is `trimbank.ts`'s: `roll` is the deck's roll about the heading **from the world's level**, positive
  with the level-left side down; `rail` is that less the water's own normal. `tilt` is the capture test's
  `tiltAcross`, the felt vertical against the **deck**, and **its sense is opposite** to `roll`'s — measured, not
  assumed: `roll − feltWorld + tilt` closes to **0.18–1.59°** over the twelve where `roll − feltWorld − tilt` read
  32.0° (§5).
- **The three accelerations.** `latPair` is the **pair's** (board + body) horizontal acceleration on that axis, from
  differencing the pair's momentum exactly as `captureStep` builds `pairFelt`. Only the water and gravity move the
  pair's centre of mass and gravity is vertical, so **`latPair` is the water's net horizontal side force over the
  pair's 75.5 kg**, with the rider's own pushes cancelled inside the pair — every force with its reaction, nothing
  prescribed. `latWater` is that same quantity read off `BoardBody.forces`' ten water entries instead, and the two
  agree to a median **0.000** and a peak **0.011 m/s²** over 780 frames [M] — a seatbelt, not a result.
  `baseMeanAccel` is **Part 24's** "net across rate" and is **not an acceleration at all**: §1.

The harness is `trimbank.ts`'s cell, copied into `3.3/across.ts` so 3.2's published probes are untouched — the
Canyon-matched `FaceWater` (1.4 m, 2.6 m deep, 16°, 5.7 m/s), the board placed 0.75 fronts ahead of the crest and 45°
off the fall line, the entry speed the face's own plus −3, −2, −1, 0, +1.5 or +3 m/s, the stances Compress and tall,
`water.advance(STEP)` every frame, 9 s a run. **Twelve runs a cell.** That it is the same cell is not asserted: at
`STEER=0` the probe reproduces **every one of Part 24's published columns to the digit** — 12 of 12 at 0.77–1.70 s,
bank peak 20.7–65.7°, roll peak 20.9–63.0°, rail peak 10.9–62.9°, drift peak 1.9–4.9°, `feetAccel` median absolute
1.17–3.00 with peak 6.93–25.55, `baseMeanAccel` 0.00–0.38 against the body's 0.42–1.41, the felt tilt at the fall
−15.9 to −7.4°, and the across-speed 0.754–1.406 m/s split body 0.715–1.272 / feet −0.302–0.401 [M]. On `RIDER=old`
it reproduces Part 21 §2's old-rider column as well (3 of 12 at 7.78–8.87 s, bank peak 2.5–66.6°, roll peak
8.3–71.6°, drift peak 2.5–103.1° — Part 21 prints the bank peak as 2.5° over the nine that stand and 66.6° over the
three that fall, which is the same span).

## 1. The six sentences the round is for

1. **The discrepancy does not exist, and the reason is a quantity's name.** Part 24's "the base's **net** across rate
   of 0.00–0.38 m/s²" is `trimbank.ts`'s `baseMeanAccel = |feetAcross| / t` [R], and `feetAcross` is the base's
   velocity **in the board's rotating frame with the component along the felt vertical removed** — the right quantity
   for the fall test's velocity term and **not an acceleration in any frame**. A board accelerating hard and steadily
   sideways in the world carries a `feetAcross` that never grows, because the frame it is resolved in rolls with the
   board (to 63° at up to 98 °/s) and the vertical it is projected against rotates with the acceleration itself.
   Measured as an acceleration, **the pair's horizontal across acceleration is a mean signed 1.58–3.47 m/s², a median
   1.64–3.34 and a peak 1.79–8.82, the same sign in all twelve runs** [M]. The momentum route and the force ledger
   agree to 0.000.
2. **So 3.2y's −384 N/rad was right all along, and this round's own slope brackets it.** Pooled over the twelve runs'
   **768 frames**, `latPair` per unit of **sin(rail)** is **7.24 m/s² (R² 0.862)** — on the pair's 75.5 kg,
   **547 N per unit sine**, which at small angle is 547 N/rad — against 3.2y's captive flat-water **−384 N/rad** and
   `PLANT_SPEEDS`' **−429.7** [M, R]. Three measurements of the hull's side force inside a factor of 1.4, one of them
   free-running on the face over 0–63° of rail. **Nothing was cancelling and no frame was wrong**; the side force was
   being compared with a book-keeping rate.
3. **And Part 24's conclusion from it — "the base is busy and unaimed" — is refuted by Part 24's own column.** Read
   `feetAccel` as a **signed mean** instead of an absolute median and it is **0.48–2.89 m/s²** [M], against the body's
   **1.71–3.15**. The base is not oscillating about zero while the body drifts one way; both drift the same way, and
   **the whole of what the base owes the body is 0.23–1.45 m/s²** — the `deficitMean` column, which is the demand
   stated in the supply's own units and is a fifth to a half of what the base is already delivering.
4. **The board's supply is three to twenty times that demand, and it is measured, not inferred.** Under a full steer
   the old rider — who holds a rail for seconds instead of falling inside one — puts the pair at a median absolute
   **1.33–9.16 m/s²** of lateral acceleration with peaks of **4.07–28.70**, a heading rate peaking at **195.9 °/s**
   and `v · ω` at a median up to **10.75** and a peak **43.88 m/s²**, which straddles Forsyth et al.'s 13.9–20.1 [M;
   the comparison is to 3.2z's `v·ω` identity on their measured columns, not to a measured acceleration]. **The board
   can deliver the magnitude.**
5. **It cannot deliver it in time, and the limit is a slew, not an authority.** The steer's own increment, run by run
   against the same stance and entry speed at `STEER=0` (the runs are deterministic and identical to `STEER_FROM`), is
   **−0.06 to +0.18 m/s² at 0.1 s (median −0.04)** and **−0.35 to +0.15 at 0.2 s (median −0.05)**; it first leaves the
   no-steer spread at **0.3 s** (−1.19 to −0.18, median −0.54) and reaches **−3.75 to −0.33 (median −1.62) at 0.5 s**
   [M, 72 runs]. Against the capsize's **τ 0.245 s** (Part 21 §1.2) that is a correction arriving after the event. And
   the rows for stick 0.25, 0.5 and 1 are **identical to the digit for the first 0.3 s**, because the lean is bounded
   by `leanPace = LEAN_IN_RATE = 1.4 rad/s` and `REFERENCE_RATE = 5 rad/s` [R] — **a bigger stick buys nothing early.**
   Put as the one number the brief asked for: **the chain's dead time is about 0.25 s and its rise to 1.6 m/s² takes
   0.5 s**, so a whole capsize time constant is spent before the board does anything a steer asked for, and two before
   it does enough.
6. **And the gain cannot reach one, which is the result.** The felt vertical's own tilt per **extra** degree of the
   deck's roll — **the bank gain**, a least-squares slope with a fitted intercept, so it is the *marginal* return on
   rolling further and not the absolute tilt (which `tilt` measures directly); 1.000 being a turn that pays back every
   degree it is leaned and leaves the body nothing to slide down — is
   **0.625 to 0.832 pooled (R² 0.751–0.946) across seven cells of twelve runs each**, 768 to 2317 frames a cell, and
   **0.446–0.836 run by run at the fall on the shipped twelve** [M] (−1.0 to +4.8 across the steered cells, where a
   run whose roll passes through zero has no ratio at all, which is why the pooled slope is the quoted instrument).
   It is never 1 in any cell's pool. Every degree of roll the board takes
   to make side force leaves **0.17–0.37° of residual tilt**, and `g · sin(that residual)` is the **1.26–2.69 m/s²**
   Part 24 measured as the body's forcing. **The demand and the supply are the same lever**, which is why steering is
   not a new authority: on this plant steering **is** leaning, leaning is the roll, and the roll is what 3.2w, 3.2x and
   3.2y already spent.

## 2. The ladder: 84 runs of steering, and 12 of 12 in every cell

`STEER` holds the stick at a constant value from `STEER_FROM = 0.3 s` — after the mount's 0.17 s contact transient.
`STEER_SIGN=roll` multiplies it by the sign of the deck's roll at that moment, so **a positive stick steers into the
capsize** (the way the board is already going over, the cyclist's "steer into the fall") and a negative one fights it.
The two are different experiments and are never averaged. `results/33a/ladder-new.txt` in full.

| stick | fell | at, s | `latPair` mean, m/s² | \|median\| | peak | heading rate, °/s | `v·ω` median | `v·ω` peak | the deficit |
|---|---|---|---|---|---|---|---|---|---|
| 0 (shipped) | **12/12** | **0.77–1.70** | 1.58–3.47 | 1.64–3.34 | 1.79–8.82 | 9.5–27.6 | 1.07–3.82 | 3.01–17.21 | 0.23–1.45 |
| +0.25 into | 12/12 | **1.05–5.08** | 1.20–4.01 | 1.15–3.54 | 2.13–8.48 | 10.5–29.0 | 1.07–3.67 | 2.96–30.26 | −1.38–1.18 |
| +0.5 into | 12/12 | 0.97–3.23 | 1.73–5.64 | 1.73–4.75 | 2.27–16.94 | 9.4–40.9 | 0.97–6.58 | 2.51–23.48 | −0.09–1.33 |
| +1 into | 12/12 | 0.93–2.42 | 1.73–5.67 | 1.73–4.74 | 2.33–26.04 | 8.3–37.4 | 0.84–5.59 | 2.36–29.41 | −0.25–1.25 |
| −0.25 against | 12/12 | 1.53–4.63 | −1.03–2.67 | 0.75–1.86 | 1.92–9.07 | −8.1–22.3 | −1.01–2.67 | 5.96–30.01 | −1.46–−0.04 |
| −0.5 against | 12/12 | **1.48–5.33** | −1.26–2.07 | 0.66–1.87 | 2.68–11.73 | −13.2–24.6 | −1.22–2.97 | 6.60–23.49 | −0.92–0.09 |
| −1 against | 12/12 | 1.55–3.92 | −3.59–−0.15 | 0.81–2.06 | 3.91–16.57 | −24.4–10.7 | −3.90–1.22 | 7.03–22.90 | −1.13–0.34 |

Four readings.

- **Every steer delays the fall and none of them stands him up.** The best cells are a quarter-stick into the capsize
  (1.05–5.08 s) and a half-stick against it (1.48–5.33 s) — **three times the shipped 0.77–1.70 s** — and both are
  **12 of 12**. So the stick is a real authority on the fall's *timing*, which nothing in 3.2w–3.2z was, and it is
  still not a fix. A fourth authority joins the three.
- **A full stick into the capsize is worse than a quarter of one** (0.93–2.42 against 1.05–5.08), and the reason is
  measured: a full steer asks for **35.7–50.0° of lean** (`RAIL_RANGE = 50°`, capped per run by
  `most = atan(v²/(g · TURN_RADIUS))` [R]), and the shipped capsize already banks **20.7–65.7°**. The stick's whole
  travel is **smaller than the lean the fall already has.** Its increment on the roll half a second in is a median
  **+0.8 to +1.3°** (−3.5 to +5.1) [M]. **Steering into the fall is saturated by the fall.**
- **Steering against it is the one that reaches the plant**, and it reaches it by taking the roll *off*: the roll at
  0.8 s is down a median **13.4°** (−19.9 to −5.4) and the lateral acceleration goes down with it, to a mean of
  **−1.26–2.07** from the shipped 1.58–3.47. That is the bank gain seen from the other side: you cannot have the roll
  down and the side force up, because the second is made of the first.
- **The board turns, and at real rates.** The heading rate peaks at 114.5 °/s unsteered and 201.1 steered, and `v·ω`
  peaks at 17.2 and 30.3 m/s² [M]. Part 24 was right that a real surfer's turn is ten times the demand; what it could
  not know is that **ours is too, already, with the stick at zero.**

## 3. The inputs: what makes the side force, and what does not

The lateral force by source, every entry of `BoardBody.forces` projected on the same horizontal across axis, pooled
over the shipped twelve's 780 frames — median signed, then peak absolute, N:

| source | median signed, N | peak absolute, N |
|---|---|---|
| **pressure** (the planing hull's own) | **81.6** | **674.3** |
| added mass | 23.9 | 80.4 |
| buoyancy | 10.7 | 22.6 |
| radiation | 9.5 | 25.3 |
| **fins** | **5.5** | **72.4** |
| rails (the side-face foils) | −2.2 | 14.6 |
| friction | −0.2 | 1.6 |
| bed · froth · suction | 0.0 | 0.0 |

- **The rail makes the side force, through the planing pressure, and almost nothing else does.** The hull's pressure
  carries **81.6 N** of the median against the fins' **5.5** — a factor of **15** — and the rails' own side faces
  carry **−2.2 N**, a fortieth of it and with the wrong sign. The fins' peak (72 N) is a ninth of the pressure's
  (674 N), and against the whole median side force (the pair's 1.64–3.34 m/s² on 75.5 kg is **124–252 N**, and the
  medians above sum to 129) the fins are **4 %**. So "rail, fins or weight placement" has a measured answer: **the
  rail**, and the fins are a fifteenth of it at these drift angles (peak 1.9–4.9°).
- **What commands it, with its reaction.** `steer × RAIL_RANGE` → `leanAsked`, the balance's own lean reference, eased
  at `leanPace` and capped by `most`; the rider then leans on the deck through the ankle and the hip, the deck rolls,
  and the rolled wetted bottom meets the flow at an angle whose pressure has a horizontal component. Every step is a
  force with its reaction: the lean's torque is booked on the board, the pressure's on the water. **There is no other
  steer** — nothing in the plant applies a yaw moment or a lateral force to the board directly, and the only lateral
  channel that does not run through the roll is **sideslip on the fins**, which in these runs is 1.9–4.9° of drift and
  5.5 N. A controller that wanted side force without roll would have to command drift, and drift at these angles is
  worth a fifteenth of the rail.
- **And the shaped rail is not the lever either — my own candidate, refuted in the same round I raised it.** The
  default board's section is a flat sheet with a knife edge; `hull: 'rail'` (step 3.2u's band, `?hull=rail`, opt-in and
  off) is the one existing switch that moves where the lateral force comes from. Measured on the same twelve: the bank
  gain is **0.444–0.713 pooled** against the flat sheet's 0.625–0.832, the slope per unit sin(rail) is **3.22 m/s²**
  at zero stick against 7.24, the pair's mean lateral acceleration is **1.33–2.08 m/s²** against 1.58–3.47 and so the
  deficit the base owes the body goes **up**, to **1.05–1.85 m/s²** from 0.23–1.45, and the rider falls **sooner —
  0.50–1.00 s against 0.77–1.70** [M, 36 runs].
  The band's suction never fires (median −0.0 N, peak 0.4) because there is no sideslip to bury a rail with.
  **I am not recommending the band**, and this is why.

## 4. The bank gain, and why it is the structural answer

The capture test's `tiltAcross` is the angle between the deck's normal and **`pairFelt`**, the pair's low-passed
specific force `a + g ŷ` [R, `AttachedRider.captureStep`] — so **the tilt the body slides down is not the deck's roll.
It is the deck's roll less whatever the board's own lateral acceleration has already rotated the felt vertical by.**
That split, on the shipped twelve:

| | the span over the twelve |
|---|---|
| the deck's roll at the fall, ° | 20.9–63.0 |
| **`pairFelt`'s tilt from the WORLD vertical at the fall, °** | **11.1–46.8** |
| the test's own tilt (felt against the deck), ° | −15.9 to −7.4 |
| the identity `roll − feltWorld + tilt`, ° | 0.181–1.591 |
| `pairFelt`'s lateral part at the fall, m/s² | 1.44–7.98 |
| `pairFelt`'s vertical part at the fall, m/s² | 7.15–9.04 (median over the run 8.87–9.67) |
| the bank gain run by run at the fall, °/° | 0.446–0.836 |

Every row is the whole population — twelve runs, min to max, not a confidence interval.

**The felt vertical has already swung 11.1–46.8° off the world's.** That is not a small-denominator artefact: the
vertical part of `pairFelt` is **7.15–9.04 m/s²** at the fall and a median **8.87–9.67** over the run, so `g` is still
most of it and the tilt is genuine lateral acceleration. **The board has already done 45–84 % of the banking its own
lean asks for** and the residual 7.4–15.9° of tilt is all that is left.

And the gain is below one in every cell, measured two ways — `pairFelt`'s own tilt (which carries
`SPECIFIC_FORCE_TIME`'s 0.1 s lag) and the probe's own un-lagged `atan2(latPair, g + pairAy)`. **It is a marginal
slope with a fitted intercept**, so what it says is how much of each *extra* degree of roll the turn pays back; the
intercept is not quoted and the absolute tilt is the `tilt` column in the table above, which is measured directly:

| cell | frames | bank gain, lagged | bank gain, un-lagged | R² | `latPair` per unit sin(rail), m/s² |
|---|---|---|---|---|---|
| stick 0 (shipped) | 768 | 0.768 | **0.832** | 0.918 | 7.24 (R² 0.862) |
| +0.25 | 2033 | 0.547 | 0.625 | 0.751 | 6.91 (R² 0.597) |
| +0.5 | 1364 | 0.664 | 0.739 | 0.933 | 9.29 (R² 0.786) |
| +1 | 1001 | 0.764 | 0.823 | 0.918 | 10.18 (R² 0.730) |
| −0.25 | 2277 | 0.660 | 0.740 | 0.885 | 7.83 (R² 0.792) |
| −0.5 | 2305 | 0.653 | 0.746 | 0.946 | 8.23 (R² 0.833) |
| −1 | 2010 | 0.674 | 0.770 | 0.919 | 9.35 (R² 0.775) |
| `hull: 'rail'`, stick 0 | 520 | 0.496 | 0.444 | 0.705 | 3.22 (R² 0.336) |

**Why below one is the right physical answer and not a bug.** A rolled planing surface whose lift stayed normal to
the deck at `W / cos φ` would put `W tan φ` on the horizontal and rotate the felt vertical **exactly** onto the deck's
normal — gain 1.000, and the body would have nothing to slide down at any roll angle. Ours is not deck-normal: the
pressure is normal to each wetted patch on a hull that is also on a 16° face and losing wetted area as it rolls, and
the pooled slope says what survives — **7.24 m/s² per unit of sin(rail) against g's 9.81, 0.74 of it** [M, 768
frames]. **The board makes about three quarters of the side force its own lean asks for, and never more.**

**One sourced comparison, with its caveat said first.** Forsyth et al. 2024's bottom turn is 7.3 ± 0.2 m/s at
1.9 ± 0.1 rad/s with the rail at **42 ± 3°** (n = 6, 835 turns over 227 waves), and its cutback 6.7 ± 0.1 at
3.0 ± 0.1 with the rail at **75 ± 3°** [S]. `v · ω` on those columns is 13.9 and 20.1 m/s² — **a steady-turn
identity, not an acceleration anybody measured, and 3.2z was careful about that** — and the felt vertical those would
carry is `atan(13.9/9.81) = 54.8°` and `atan(20.1/9.81) = 64.0°`, against rails of 42 and 75°. Those are **absolute
ratios** of **1.30 and 0.85** [I, my arithmetic on their two measured columns].

**Three reasons that is a comparison of orders and not a test, said before it is used.** Their 13.9 is `v·ω`, a
steady-turn identity and not a measured acceleration, and their boards reported none. Their 42 and 75° are **means
over a 0.96 s turn** and so an absolute ratio, where my 0.74–0.83 is a **marginal slope** over a trajectory — the two
are different quantities, and the one of mine that *is* an absolute ratio is **0.446–0.836 at the fall** on the
shipped twelve. And their rail is against the water's surface while my `roll` is against the world's level, which on
a 16° face is not the same datum. **With all three said: on the only numbers anybody has, a real board sits near or
above one on both readings and ours sits below one on both.** If that survives a proper look, the honest lever is the
hull's lateral force at a given rail — a wave-and-hull question, not a balance one — and it is the first thing in five
rounds that is not a limb and not a gain.

## 5. The method, and the five things it had to get right

Each of these was a wrong number this probe printed first.

1. **`cap.omega > 0`, and a guard that guarded nothing.** 3.2z's own trap in a new place. `AttachedRider.captureFeet`
   is a **constructed** `Vector3`, so `if (!inner.captureFeet)` is always false and resets nothing: on the old rider,
   whose `captureStep` never runs, the split block is skipped and `feetVel` keeps the zero it was built with — so
   `feetAccel` printed a tidy **0.00 m/s² for twelve runs** and `deficitMean` silently became the body's own mean. The
   guard is `cap.omega > 0`, the one test that says the capture state is live. **The old rider has no capture point, so
   it has no feet velocity here and none is quoted**; its `latPair`, `latWater`, roll, rail and heading columns are
   unaffected because they are the pair's and the board's, not the test's.
2. **The tilt's sense is opposite to the roll's, and the identity is how you find out.** `tiltAcross` is taken on the
   board's +x in the board's frame and `roll`/`feltWorld` on the horizontal projection of that axis. With a minus the
   identity residual read **32.029°**; with a plus it reads **0.181–1.591°** over the twelve. Printed every frame, so
   the datums are pinned by a number and not by a sentence. **3.2y's §0 counted eight frame errors in two weeks; this
   is another, and the reason it was caught in minutes rather than published is that the identity was printed from the
   first run.**
3. **A side force read two ways, because one way can be wrong quietly.** `latPair` comes from differencing the pair's
   momentum; `latWater` from summing `BoardBody.forces`' ten water entries. They are the same Newton's-third-law
   quantity from opposite ends and they agree to a median **0.000** and a peak **0.011 m/s²**. Had the rider's
   coupling been leaking momentum, or had a force entry been double-booked, this column would have said so — **and it
   has the resolution to**: dropping the smallest entry that is not already zero (`friction`, a median 0.2 N) would
   move it by 0.003 m/s², and dropping `addedMass` (23.9 N) by **0.32**, both against an observed peak of 0.011. The
   agreement is a test, not an identity I arranged.
4. **A pooled slope, because the per-run ones are not numbers.** The per-run regression of `latPair` on the rail
   returns **−1.4 to 7.7 m/s²/rad with R² 0.001 to 0.961** on the shipped twelve — because a run that never leaves
   20° of roll has no slope in it. The quoted slopes are over the **pool** of every frame of every run in the cell,
   with n and R² beside them, and the per-run spread printed so a reader can see how much of the pool is one run's.
   The same applies to the bank gain, whose per-run fits run 0.214–0.894 with R² 0.172–0.979 and whose pooled value is
   0.832 with R² 0.918.
5. **And a fifth, in the *seatbelt* rather than the measurement, which is worse.** The Canyon byte check's Canyon B leg
   needs `?canyonWaves=true`, and 3.2y's and 3.2z's notes write that as `globalThis.location = '?canyonWaves=true'`.
   `devTools.ts`'s `currentSearch()` reads **`globalThis.location?.search`** [R], so set as a bare **string** it reads
   `undefined ?? ''` and the bench silently runs the **default** Canyon instead — no error, no warning, and a
   plausible pair of hashes at the end. This round did exactly that on its first leg, and what gave it away was the
   grid printed in the output: **400 × 507 = 202800 cells**, which is the default Canyon's, against Canyon B's
   **400 × 451 = 180400**. The wrapper is `globalThis.location = { search: '?canyonWaves=true' }`, and
   `canyon-bytes-33a.txt` carries it in full so the next round does not have to find this again. **A seatbelt that
   quietly measures the wrong thing is worse than no seatbelt**, and the only reason it was caught is that the bench
   prints its grid.

And one that cost nothing: `Math.max(...)` over a column holding a NaN returns NaN, which `r` turns into null and
`Number` into **zero** — 3.2z's sixth trap, carried over as a `peak` helper from the start.

## 6. What I refuted, plainly

- **The brief's own premise, which it asked me to look for.** *"A real surfer keeps their feet under their weight by
  putting the board there… Our rider is forbidden from trying."* **He is not forbidden.** The stick is a
  physics-honest channel to exactly that — `steer → leanAsked → the ankle and the hip → the deck's roll → the hull's
  pressure` — and this round drove it over **84 runs at seven settings**, 72 of them steered. He is **saturated** (the
  capsize already leans further than the stick's whole 50° travel), **late** (the lean slews at 1.4 rad/s against a
  τ of 0.245 s) and **short** (the bank gain 0.63–0.83).
  `predictiveBalance.ts:855`'s *"it does not pretend to steer it"* says the
  **balance** does not write `steer`; it does not say the plant cannot be steered, and the plant can.
- **"Steering is the missing authority."** It is not a new authority at all. On this plant steering **is** leaning,
  leaning is the roll, and the roll is the authority 3.2w (the ankle), 3.2x (the hip) and 3.2y (the whole-body
  counter-roll) each measured and found insufficient. The bank gain is why: the loop roll → side force → felt vertical
  has a gain below one, so it can never close by itself, and 3.2z's three rounds of "it lowered the roll and did not
  move the fall" are the same fact read from the body's end.
- **Part 24 §1.5 and §3's reading, "the base's across-acceleration is busy and unaimed … oscillating about zero while
  the body drifts one way."** The two columns it compares are different quantities — an absolute median of a world
  acceleration against a frame-relative velocity over a time. The base's **own** acceleration is a mean signed
  **1.58–3.47 m/s²**, one sign in all twelve, and Part 24's own `feetAccel` column read as a signed mean is
  **0.48–2.89** against the body's 1.71–3.15.
- **Part 24 §6's discrepancy, which the brief promoted to a first-class question.** There is nothing to resolve: the
  pooled slope is **7.24 m/s² per unit sin(rail) = 547 N per unit sine** on 75.5 kg, which brackets 3.2y's −384 N/rad
  and `PLANT_SPEEDS`' −429.7 from above. The side force was real, the 0.00–0.38 was real, and only the comparison was
  wrong.
- **My own candidate, the shaped rail.** `hull: 'rail'` lowers the bank gain (0.444 against 0.832), lowers the slope
  (3.22 against 7.24 m/s² per unit sine), lowers the lateral acceleration (mean 1.33–2.08 against 1.58–3.47), **raises**
  the deficit (1.05–1.85 against 0.23–1.45) and brings the fall **forward** to 0.50–1.00 s. Raised and refuted inside
  one round, on 36 runs.
- **The idea that a bigger stick would arrive faster.** Sticks 0.25, 0.5 and 1 give **identical** increments for the
  first 0.3 s, to the digit, because `leanPace` and `REFERENCE_RATE` bound the lean. The limit is a slew.
- **Three of my own, each in §5**: a tilt identity off by 32°, a feet acceleration of 0.00 m/s² on a rider that has no
  capture point, and a Canyon B seatbelt leg that was measuring the default Canyon.

## 7. What follows — and the smallest honest controller, named and not built

The brief's instruction was: *"If the measurement says the board can deliver it, say what the smallest honest
controller would be and stop."* The measurement splits, so both halves are owed.

**On magnitude the board can deliver**, by three to twenty times (§1.4). **On aim and on time it cannot**: the chain's
dead time is about **0.25 s**, which is one whole capsize time constant, and its gain into the felt vertical is
**0.63–0.83**, which is below the one a bank needs. The second of those is the structural half — the only channel is
the roll, and the lean that commands it slews at 1.4 rad/s.

**The smallest honest controller, if one is built anyway**, is a term the balance adds to the **lean reference** and
nothing else: `leanAsked += k × (the capture point's across excursion)`, clipped inside `most` so it never asks for
more lean than a turn at the board's own speed holds, realised by the same ankle and hip the stick's lean is realised
by, with the board's answer the water's. No new force, no new contact, no prescribed velocity — the one thing it adds
is a *reason* for the lean. Its first parameter is not a gain but **`leanPace`**, because the measurement says it will
be rate-bound before it is authority-bound. **And I would not predict it stands him up**: on a bank gain of 0.63–0.83
the lean it commands adds residual tilt faster than the turn it buys closes it, which is the ladder in §2 — all
**72** steered runs fell. **I did not build it and I am not recommending it.**

**What I would measure next, and it is not on the rider.** The bank gain is a **hull** number: how much horizontal
force the wetted bottom makes at a given rail. Ours is 0.74 of `g` per unit sine; Forsyth's two measured columns
suggest a real board near or above 1 (§4, with its caveat). If that comparison survives a proper look, then five
rounds of rider work have been pulling on the wrong end, and the thing to change is the hull's lateral force — which
is the water track's question and the wave-shape advisor's to rule on, not the balance's. **That is a measurement I
did not take and a claim I am not making**; what I measured is our side of it.

## 8. What I will not claim

- **I will not claim the board cannot be steered hard enough.** It can: 1.33–9.16 m/s² of median and 4.07–28.70 of
  peak under a full stick. What I claim is that it cannot be steered **in time** (the increment is inside the
  no-steer spread for 0.2 s) or **with a gain of one** (0.625–0.832 over seven cells).
- **I will not claim 13.9 or 20.1 m/s² is a measured surfboard acceleration**, nor that 1.30 and 0.85 are measured
  bank gains, nor that they are the same quantity as my 0.74–0.83. They are `v·ω` and `atan(v·ω/g)` on Forsyth's two
  measured columns, a steady-turn identity; their boards reported no acceleration; theirs is an absolute ratio of
  turn-mean angles and mine a marginal slope; and their rail's datum is the water where mine is the world's level.
  §4 says all three before it uses them.
- **I will not claim the old rider's cell is the board's own authority under *this* rider.** It is the same hull, the
  same water and the same stances, and it is quoted because the old rider holds a rail for seconds where the new one
  falls inside one — but his coupling is the kinematic counter-roll 3.2y named, so his *roll* is not the new rider's.
  The number it gives is the **board's** supply with a rail held, not a prediction about the new rider.
- **I will not claim the bank gain to three digits.** The pooled fits run 0.625–0.832 over seven cells; the per-run
  ratios at the fall run 0.446–0.836 on the shipped twelve and −1.0 to +4.8 over the steered cells, because a run
  whose roll passes through zero has no ratio. The claim I will defend is **below one in every cell's pool, with
  R² 0.75–0.95 over 768–2317 frames**, and that the gap is the residual tilt the body slides down.
- **I will not claim the lateral force by source outside this cell.** The fins carry 5.5 N of the median *at drift
  angles of 1.9–4.9°*; a board actually sliding would read differently, and the old rider's steered cells reach 103°
  of drift. The ledger says what makes the side force in **trim**, which is the condition the fall happens in.
- **I will not claim this is the owner's fall.** The owner rode Canyon and reported falls that slide out sideways; the
  shipped twelve drift 1.9–4.9° and the steered cells only slide out once the stick is over. Their balance HUD is the
  instrument for what they rode.
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed and not paddled in, the first ~0.17 s of
  every run carries a contact transient, and every span above is the whole population — twelve runs a cell, two
  stances × six entry speeds, one face slope — and not a confidence interval.

## 9. Seatbelts

- **No source file changed at all.** `git diff --stat origin/main HEAD -- src/` is empty; everything shipped is under
  `docs/research/new-rider/3.3/`. **Nothing new ships on**: `STEER`, `STEER_SIGN`, `STEER_FROM`, `RISE` and `HULL` are
  the probe's own environment and `STEER=0` with no `HULL` is the game's own configuration; `hull: 'rail'` is already
  opt-in and off in `BoardBody` [R] and this round did not touch its default. There is no switch to leave on by
  mistake because there is no switch in `src/`.
- **The shipped rider unchanged, proved against Part 24's published figures and not asserted.** At `STEER=0` the probe
  reproduces **every** column Part 24 printed for the same twelve — the fall times, the three angle peaks, the drift
  peak, `feetAccel`'s median and peak, `baseMeanAccel`, `bodyMeanAccel`, the felt tilt at the fall, the across-speed
  and both its halves — **to the digit** (§0). On `RIDER=old` it reproduces Part 21 §2's old-rider column as well. The
  probe reads off the live instance and sets only `rider.steer`, which is the player's own stick, so at `STEER=0` the
  rider's behaviour is unchanged by construction and the reproduction is the proof of it.
- `npx tsc --noEmit -p .`: **exit 0**, read from `tsc`'s own exit status on its own line, never through a pipe.
  `npx tsc --noEmit -p server/tsconfig.json`: **exit 0**. The root project includes only `src`, so the probe was
  type-checked separately on a throwaway project extending the root's options: **exit 0**.
- The rider, board, HUD and runner test files, `PhysicalMode` (`src/game/`), `RideHud` (`src/ui/`), `SurfZoneRunner`
  and `SprayCloud` (`src/wave/`) included — `SurfZoneRunner` is outside the merge suite, so a red there is news:
  **58 files passed, 783 tests passed and 21 expected fail (804), vitest exit 0**, 90 s. The whole of `src/physics` is
  in it. `src/wave/SurfZoneSimulation.test.ts` is deliberately not in it (`c2-step5g.md` §7.4), closed by reading.
  `results/33a/suite-33a.txt`.
- **The Canyon bench, all four hashes, fresh spin-ups on the tree that merges**: Canyon B **`a367d938f15fa934`** /
  **`9e5831f80e38abd9`**, default Canyon **`ea3d57a4d49f4b48`** / **`a1a2555739210f96`** — the same command and the
  same reference as C2 step 5f's and 3.2t–3.2z's. **All four identical**, and Canyon B twice over from two independent
  spin-ups. `results/33a/canyon-bytes-33a.txt` has all three legs in full, **and the wrapper written out**, because
  the string-versus-object trap in §5.5 made this round's first leg measure the default Canyon while believing it was
  measuring B. With no source file touched this is the only possible result, and it is run anyway because that is what
  a seatbelt is for.
- **No rebase was needed.** `origin/main` was **50f43025** when the round started and still 50f43025 at the push,
  checked twice with a fresh `git fetch`, so nothing of the wave track's was inherited or reverted across one — and
  the deletions column below is the check that says so rather than `merge-base --is-ancestor`, which has caught none
  of the eight.
- **The deletions column, checked before the push**: `git diff --stat origin/main HEAD`, deletions read off the
  summary line — **0 deletions**, every file new, and `src/` not among them. The insertion count is the half that moves
  with every edit to this very bullet, so it is left to the PR's own summary line rather than frozen here in a number
  that goes stale; **0 deletions is the half that is a seatbelt.** It has caught a silent revert on eight consecutive
  rounds, and `merge-base --is-ancestor` has caught none of them.
- No force was added or removed anywhere, and no gain, clip or threshold was changed. The round adds instrument and
  prose.

## 10. Files (3.3a)

- `docs/research/new-rider/3.3/across.ts` (new): the pair's own horizontal across acceleration from the differenced
  momentum (`latPair`) and the same from the water force ledger (`latWater`) with their residual printed as a
  seatbelt, the lateral force **by source** on that axis, the felt vertical in the **world** (`pairFelt` read off the
  instance, and the probe's own un-lagged `atan2(latPair, g + pairAy)` so the old rider has one too), the tilt
  identity `roll − feltWorld + tilt`, the bank gain pooled over every frame of a cell with n and R², the hull's slope
  per unit of sin(rail) and sin(roll), the heading rate and `v·ω`, the steer's rise at absolute times for a run-by-run
  diff against the unsteered cell, 3.2z's across-speed split carried over for the cross-check, and the `cap.omega > 0`
  guard that keeps the old rider out of columns it has no state for. Switches: `STEER`, `STEER_SIGN`, `STEER_FROM`,
  `RISE`, `HULL=rail`, and `trimbank.ts`'s own `RIDER`, `STANCES`, `EXTRAS`, `SECONDS`, `SIDE`, `AHEAD`, `FACE`,
  `DEPTH`, `SUBSTEPS`. Its header carries the commands.
- `docs/research/new-rider/3.3/results/33a/`: `ladder-new.txt` (the seven new-rider cells, 84 runs), `ladder-old.txt`
  (the four old-rider cells, 48 runs), `ladder-rail.txt` (`hull: 'rail'`, three cells, 36 runs), `ladder-table.txt`
  (§2's table), `increment.txt` (the steer's own increment, run by run), `extra-table.txt`, the **fourteen** `*.jsonl`
  cells (**168 rows**), `suite-33a.txt`, `canyon-bytes-33a.txt`.
- No source file.

## 11. For the owner, in plain words

**Four rounds told you your surfer's board tips him over, his limbs can't stop it, the board is as stiff as a real
surfboard, and the game's fall test is already kinder than a real person's. Last round's parting thought was that the
one thing he never does is *steer* — that a surfer stays up by putting the board back under himself, and ours isn't
allowed to try. I went to measure whether the board could even do that. It turns out he is allowed, the board can, and
it still doesn't save him — and the reason why is the clearest thing this thread has found.**

**First, a number from last round was being read wrong, and it was mine to catch.** Last round said the board "swings
sideways as hard as his body does, but never goes anywhere on purpose". That came from a column that is not actually a
sideways acceleration — it is a bookkeeping figure measured in a frame that is itself rolling over with the board, so a
board shoving hard and steadily to one side can show up in it as doing nothing. Measured properly: **the board is
accelerating sideways at about two to three and a half metres per second squared, the whole time, all in one
direction.** It is not wandering. It is already going where the body is going, and it is only about **a fifth to a
half of a metre per second squared short** of keeping up. So the gap was never big.

**Second, he can steer, and I steered him.** The stick reaches the board through his own body — he leans, his ankles
roll the board, the water pushes on the tilted bottom. That is all honest; there is no hidden motor anywhere in it. I
held the stick over at six different settings, both into the fall and against it, twelve rides each — **seventy-two
steered rides, plus the twelve with the stick at rest, and he falls on every single one of the eighty-four.** Steering
does buy him time — the best setting keeps him up three times as long, five seconds instead of one and a half — but it
never saves him. Part of why is simple: **from the moment the stick goes over, about a quarter of a second passes
before the board does anything at all**, because the stick has to move his body first and a body takes that long to
lean. A quarter of a second is exactly how long the capsize takes to double. So the help arrives one doubling late.

**Third, here is why, and it is one sentence.** When a surfer leans into a turn, the turn's own push swings "down"
around until it points through his feet again — that is what banking *is*, and it is why a leaning surfer isn't
falling over. **Our board only swings "down" about three quarters of the way.** For every degree he leans, the turn he
gets back is worth about 0.7 of a degree. The missing quarter is a slope he is permanently standing on, and that slope
is exactly the push that slides him off his feet. **So leaning to get the turn always costs him more tilt than the
turn gives back.** I measured that on more than eleven thousand frames across seven settings and it is never once
above one. That is the same fact as "his ankles, his hips and his whole body all reduced the roll and didn't stop the
fall" — those three rounds were pulling on one end of the same rope.

**Two more things, both of them me being wrong on the record.** The board's sideways push and the board's sideways
motion looked like they disagreed by a factor of five last round; they don't — measured as the same kind of quantity,
the three separate measurements of it agree inside 40 %, and the disagreement was between a force and a bookkeeping
figure. And I thought the shaped rail we built back in step 3.2u might be the answer — a real rail makes a real bite.
**It is worse**: the turn-for-lean ratio drops to about 0.45 and he falls *sooner*, in half a second. So I am not
asking you to turn it on.

**Where I think this leaves it.** Every lever on the *rider* is now measured and spent: ankles, hips, whole-body
counter-roll, and now the stick. The one number left that isn't a limb is the board's own bite — how hard the water
pushes sideways on a board tilted a given amount. Ours gives about three quarters of what its own lean asks for.
Researchers with trackers in six good surfers' boards recorded turns that imply a real board gives **the same or a bit
more** than its lean asks. If that holds up — and I am being careful, because their figure is calculated from speed
and turn rate rather than measured directly — then the thing to fix isn't your surfer at all. **It is how hard the
water pushes on a tilted board**, which is the wave-and-hull side of the project, not the balance side. That is the
first lead in five rounds that isn't another limb and isn't another dial.

**Nothing in this round changes the game.** There is nothing new to ride, and the game is byte-for-byte what you have.

---

# Part 26 — the water force on the deck's own axes: the advisor's diagnosis half confirmed, and the half that is not a force

Written 2026-11-15 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33b`, cut from `main` at
**e2dc402c** (the advisor's bank-gain consult), so Part 25 and that consult are its base. **This round ships no change
to the game and no change to any source file**: one probe, nine cells of twelve runs (**108 runs**), and an
attribution.

**The round was built to break its own brief.** The wave-shape advisor's ruling on Part 25
(`docs/research/water-physics/consult-log.md`, top row) is that a bank gain below one is **our artefact and a
direction, not a size**: on the deck's own axes `tilt = atan(F_s / F_n)`, so a force locked to the deck normal gives a
gain of exactly **1.000** at any magnitude, and the whole 0.17–0.37° residual must be the water force's **in-plane**
across part. It named three suspects, all pointed along the **water-surface** normal — `buoyancy`
(`hullForces.ts:264`) and `radiation` + `addedMass` (`BoardBody.ts:1501–1506`) — and it named its own falsification:
*"if `pressure` shows up in the in-plane column, the hull geometry is the suspect and I am wrong."*

## 0. The identity, and why it is checkable rather than assumed

`humanBalance.ts:435` takes `tiltAcross = atan2(felt.x, felt.y)` on `AttachedRider.captureFelt`, which is
`pairFelt` rotated into the **board's** frame [R]; `pairFelt` is the pair's specific force, which is the water force
over the pair's mass because gravity cancels inside the pair. So with `n̂` the board's local **+y** in the world and
`ŝ` its local **+x** — the across axis **in the plane of the deck**, which Part 25's `side` is only the horizontal
*projection* of — the identity `tilt = atan(F_s/F_n)` is not an assumption, it is this code read forward, and the
probe prints it three ways and makes them agree.

**Two seatbelts say the attribution is exact and is of the right quantity.**

- **The ledger against the momentum route.** `atan(F_s/F_n)` summed off `BoardBody.forces`' ten water entries, against
  the same tilt from the pair's own differenced momentum: they agree to a per-run median of **0.000–0.050°** in every
  cell, and on the
  traced run the residual is **1 × 10⁻¹³ °** on every frame **except the separation frame** — the one frame where the
  rider's velocity has already been re-set (3.2z's own effect), which is what the 0.0–57.4° "peak" column is, start to
  finish. **So no at-the-fall number is quoted off the instantaneous routes**, and nothing else in the pool is
  affected [M, `results/33b/trace-tall-0-33b.jsonl`].
- **The felt split against the test itself.** Each entry low-passed over `SPECIFIC_FORCE_TIME` = 0.1 s **in the world**
  and only then projected — the order `pairFelt` itself uses — reproduces the test's own `tiltAcross` to a median
  **0.003–0.983°** per run across the nine cells [M] (0.003–0.468 over the eight on the default hull). The
  decomposition is of the angle the body actually stands on.

## 1. The four sentences the round is for

1. **`pressure` does not show up in the in-plane column, so the advisor's falsification does not fire.** Over the
   seven shipped-hull cells, `pressure`'s marginal contribution to the residual tilt is **0.003–0.022 degrees of tilt
   per degree of roll** against a measured deficit of **0.234–0.442**, i.e. **0.7–9.4 %**; in newtons it is **−0.04 to
   −0.28 N per degree of roll** against its own deck-normal **393 N** [M, 780–2317 frames a cell]. The code says why,
   and it is one line: for the default `'flat'` section every bottom patch normal is `{x: 0, y: −1/norm, z: slope/norm}`
   [R, `boardShape.ts:190`], and the only normals in the model with any `x` at all are the rail band's, built solely
   when `bandWidth > 0` [R, `boardShape.ts:208–211`, which says so in its own comment]. **The advisor's named
   prediction holds.** And the small residue that is there is not a force either: it goes as the **roll rate**, at
   **−0.077 to −0.106 N per °/s** with R² **0.795–0.934** over the seven cells, against the crudest estimate of the
   ledger's own within-step rotation, `F_n,pressure · h/2` = **0.057–0.085 N per °/s** — the same order and the sign of
   a lag, because the ten entries are accumulated over the step's substeps at each substep's own rotation and read
   against the end-of-step orientation. Exactly `h/2` is not claimed; that the residue is a rotation and not a
   geometry is.
2. **And the instrument can see in-plane pressure where the geometry has it — the positive control.** Turn the
   athwartships shape on (`HULL=rail`, step 3.2u's band, opt-in and off in the game) and `pressure`'s marginal
   contribution jumps to **0.149 °/°** and **−1.81 N per degree of roll**, a factor of **6.5** on the same twelve runs,
   while the whole deficit goes to **0.499** and the gain to **0.444–0.496** — which is what Part 25 measured and what
   TN 4187 predicts for a deadrise surface [M, 532 frames]. **A null result with a positive control is worth more than
   either alone**, and this is the one the round can offer.
3. **But only one of the advisor's three suspects carries weight, and it does not carry the whole deficit.**
   `buoyancy` is the largest named in-plane term in **every** cell, **0.111–0.181 °/°**; `radiation` is **−0.004 to
   0.059** and `addedMass` **−0.094 to 0.051** over the seven, and both change sign between cells. The three together
   are **0.067–0.233** against a measured deficit of **0.234–0.442**, i.e. **29–75 %** of what is to be explained. So
   the mechanism is real, it is **buoyancy's**, and it is between under a third and three quarters of the deficit —
   not all of it.
4. **The rest is not a force at all, and nobody had named it: the felt vertical's own 0.1 s lag against a rolling
   deck.** `pairFelt` is low-passed in the **world** and then projected on the deck's **current** axes, so a force
   locked exactly to the deck normal still reads an across component of order `Ω · T` the moment the deck rolls. Its
   share of the deficit is **0.084–0.132 °/° in all seven shipped-hull cells** — remarkably steady where everything
   else moves — and its law is measured: the test's tilt per degree-per-second of **roll rate** is **−0.047 to −0.133°**
   against the filter's own **−T = −0.100**, over roll-rate peaks of **65–330 °/s** [M]. On the traced run, one
   frame before the fall: the real in-plane force gives **−6.5°** of tilt and the test reads **−15.5°**, at a roll rate
   of 130 °/s — the missing 9° is the filter, and `0.1 s × 130 °/s = 13°` [M].

## 2. The attribution, in newtons and in degrees per degree

The water force on the deck's axes, the shipped cell, medians signed over the pool of 780 frames, N:

| source | on the deck normal `n̂` | in the deck's plane `ŝ` | `ŝ` peak absolute |
|---|---|---|---|
| **pressure** | **393.1** | **−1.04** | 18.30 |
| addedMass | 153.4 | −0.35 | 226.85 |
| buoyancy | 93.7 | −4.86 | 95.20 |
| radiation | 63.4 | −1.83 | 27.86 |
| fins | 0.0 | 5.60 | 92.11 |
| rails | −0.0 | −2.35 | 19.19 |
| friction | 0.9 | −0.40 | 2.85 |
| bed · froth · suction | 0.0 | 0.00 | 0.00 |
| **total** | **722.6** | **−7.2** | — |

`pressure` carries **54 %** of the deck-normal load and **0.26 %** of its own magnitude in the deck's plane. The
fins' 5.60 N is the largest single in-plane median in the ledger and is still worth only **0.4°** of tilt — and their
**0.0** on the deck normal is not a measurement but a construction: every foil's normal is the board's local ±x
[R, `BoardBody.ts:664, 674`], so the fins and the rail foils are the two entries whose force is **entirely** `F_s`,
which is why they appear in this column at all and why they cannot be the bank gain.

**Two cautions on that table, said before it is used.** The in-plane **medians** are a poor instrument on their own:
`F_s` is only −7.2 N at the median because the median of a 9 s run is dominated by the early frames where the roll,
and so the tilt, is still nothing, while at the fall the same quantity is **−210 to −67 N** on the low-passed force.
And the raw step-mean entries swing by tens of newtons a frame (`addedMass` peaks at **227 N** in-plane against a
153 N normal median), so the *marginal* slope over the pool is the number to quote, not any single frame's.

The marginal attribution — degrees of tilt per degree of roll, each a pooled least-squares slope of that entry's
in-plane force on the deck's roll divided by the measured `F_n`, so the columns add — is
`results/33b/ladder-table-33b.txt` in full:

| cell | frames | measured | the force's share | the FILTER's lag | buoyancy | **pressure** | addedMass | radiation | fins | rails |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 (shipped) | 780 | 0.234 | 0.111 | 0.124 | 0.165 | **0.022** | −0.094 | −0.004 | 0.031 | 0.010 |
| +0.25 into | 2045 | 0.442 | 0.345 | 0.098 | 0.132 | **0.003** | 0.042 | 0.059 | 0.045 | 0.026 |
| +0.5 into | 1376 | 0.337 | 0.239 | 0.099 | 0.140 | **0.012** | 0.036 | 0.028 | 0.017 | 0.017 |
| +1 into | 1013 | 0.243 | 0.158 | 0.084 | 0.150 | **0.015** | 0.005 | 0.028 | −0.033 | 0.011 |
| −0.25 against | 2289 | 0.334 | 0.232 | 0.102 | 0.133 | **0.006** | 0.044 | 0.051 | −0.019 | 0.017 |
| −0.5 against | 2317 | 0.347 | 0.217 | 0.129 | 0.116 | **0.010** | 0.051 | 0.038 | −0.012 | 0.017 |
| −1 against | 2022 | 0.326 | 0.194 | 0.132 | 0.111 | **0.008** | 0.040 | 0.036 | −0.012 | 0.019 |
| `vertical:'particle'`, stick 0 | 1048 | 0.237 | 0.167 | 0.070 | 0.181 | **0.013** | −0.036 | −0.009 | 0.001 | 0.011 |
| `hull:'rail'`, stick 0 | 532 | **0.499** | 0.478 | 0.020 | 0.153 | **0.149** | −0.011 | 0.072 | 0.063 | 0.000 |

The per-source columns sum to **0.131–0.427** against the instantaneous ledger's own fitted **0.111–0.478** in the
same cell — the linearisation's error, and it is smaller than the spread between cells. `rails` reads 0.000 on the
`hull:'rail'` row because the band replaces the side-face foils rather than adding to them [R, `boardShape.ts:124–126`].

**`measured` here is the gain deficit taken on the DECK-frame tilt**, which is not numerically Part 25's
`1 − 0.768 = 0.232` taken on the world-frame `feltWorld`; both are published, the two differ by the horizontal
projection, and on the shipped cell they happen to agree to 0.002. **They are not the same quantity and neither is
quoted as the other.**

## 3. The datum correction: 547 N was the wrong datum, and on the right one the hull is not low

The advisor's own note was that Part 25's **547 N per unit sine** was regressed on `sin(rail)`, while the force's
*direction* is set by the deck's **roll** — the pressure is normal to the hull — and only its *magnitude* by the rail.
`across.ts` computed the `sin(roll)` slope and printed it in its pool line; Part 25 did not publish it. **Published:**

| cell | per unit sin(**roll**), m/s² | the same in N on 75.54 kg | R² | per unit sin(rail), N |
|---|---|---|---|---|
| 0 (shipped) | **9.38** | **709** | 0.844 | 547 |
| +0.25 / +0.5 / +1 | 7.37 / 10.36 / 12.38 | 557 / 782 / 935 | 0.650 / 0.775 / 0.715 | 522 / 702 / 769 |
| −0.25 / −0.5 / −1 | 8.00 / 8.32 / 9.36 | 604 / 628 / 707 | 0.873 / 0.904 / 0.837 | 592 / 622 / 706 |
| `particle` | 8.70 | 657 | 0.813 | 516 |
| `hull:'rail'` | 4.13 | 312 | 0.396 | 243 |

**Against the advisor's bar of 741 N** (`W` on 75.54 kg, rising as `1/cos φ`): the shipped cell is **709 N, 4 % low**,
and the seven cells span **557–935 N**, i.e. the bar sits inside the population. **The sourced 26 % shortfall was the
rail datum, exactly as the advisor suspected; it is not a shortfall on the roll datum.**

And one correction *to* the bar, because the identity does not need the equilibrium the bar assumes: a force locked to
the deck normal of **measured** magnitude `F_n` gives `a_lat = (F_n/m) sin φ` whatever the board is doing vertically.
Measured `F_n` is **722.6 N = 9.57 m/s²** in the shipped cell, so the `sin(roll)` slope is **98.1 %** of what a
deck-normal force of the size actually present would give (74–128 % over the seven cells; **44.8 %** with the deadrise
band on). `W/cos φ` is the right bar only where the vertical closes, and over 0–63° of roll it runs 741 → 1632 N, so
no single slope can be read against it at one number.

## 4. The consistency check the advisor offered as its own test: it holds

`(1 − gain) × roll` against the measured absolute tilt, run by run at the fall, on the shipped twelve:
**6.59–16.10°** against **7.37–15.92°**, per-run difference **0.06–1.59°** [M]. And the pooled fit's **intercept**,
which Part 25 did not compute at all: **0.008°** lagged and **0.995°** un-lagged on the shipped cell. **So essentially
none of the tilt hides behind an intercept — the gain deficit is the tilt**, which is what the advisor said it should
be. In the **steered** cells the per-run check is worth much less (differences to 16.94°) for Part 25 §4's own reason:
a run whose roll passes through zero has no ratio, so the pooled slope is the instrument there and the per-run ratio
is not.

## 5. The advisor's caveat, answered: `'particle'` does not flatter the gain

The advisor noted that Part 25 ran `FaceWater`'s default `vertical:'surface'`, which over-reads the upwelling by ~26 %
against the kinematic `'particle'` (1.63 against 1.29 m/s), so the measured gain would if anything be flattered.
**Re-run with `VERTICAL=particle`**: the deficit is **0.237** against `'surface'`'s **0.234**, the lagged gain
**0.762** against **0.768**, the un-lagged **0.817** against **0.832**, and `pressure`'s in-plane share **0.013**
against **0.022** [M, 12 runs, 1048 frames]. The sea is kinder — the falls move out to **0.87–3.30 s** from
0.77–1.70 — but **the gain is the same number**, so the vertical law is not where this lives.

## 6. What the fix would be worth, as an inference and not a measurement

The advisor's item 2 — resolving the hydrostatic support along the **hull** normal while the deck is dry and the board
planes — is the owner's call and this round did not build it. What the measurement adds is a **size**: removing
`buoyancy`'s in-plane term from the fitted decomposition leaves **0.069–0.310** of deficit across the seven cells,
i.e. a predicted gain of **0.69–0.93** rather than the advisor's **0.95–1.00**, because the filter's lag
(**0.084–0.132**) survives any change to a force and `radiation`, `addedMass`, `fins` and `rails` carry
**−0.094 to 0.059** each. **This is arithmetic on a decomposition, not a run** [I]: re-pointing the force changes the
trajectory, so the real figure needs the change built. The point is only that **the fix is worth 30–71 % of the
deficit cell by cell, not all of it**, and the owner should decide knowing that.

## 7. What I refuted, plainly

- **The advisor's own falsification criterion, in its favour**: `pressure` is **not** in the in-plane column
  (0.003–0.022 °/° over seven cells, 0.26 % of its own magnitude), and `boardShape.ts:190` says why. The hull geometry
  is **not** the suspect on the default board — and the positive control shows the instrument would have seen it.
- **"The whole 0.17–0.37° residual is the water force's in-plane across part, and nothing else can contribute."**
  The identity is exact, but the *instrument* contributes: `pairFelt` is low-passed in the world and read on the
  deck's current axes, so **0.084–0.132 °/° of the deficit is the 0.1 s filter against a deck rolling at 65–330 °/s**,
  in all seven cells, and no change to any force removes it.
- **"Two rounds, two probes, one mechanism" — the vertical-ledger prediction of 0.79–0.88 from `B/(P+B)` = 0.12–0.21.**
  That ratio predicts the gain only if the whole of `buoyancy` is in-plane and nothing else is. Measured on the deck's
  axes, `buoyancy`'s in-plane share of the deficit is 0.111–0.181 of 0.234–0.442, `addedMass` works the **other way** in
  the shipped cell (−0.094) and with `'particle'` (−0.036), and the filter is a term the ratio has no room for. **Right suspect, right order, wrong accounting.**
- **Part 25's 547 N per unit sine as a statement about the hull.** On the roll datum it is **709 N** (557–935 over the
  seven cells) against the sourced 741, and **98.1 %** of what the measured deck-normal load would give. The hull's
  across force was never 26 % low.
- **My own first instrument.** The run-median of the in-plane force (−7.2 N, −0.6° of tilt) looked like a refutation of
  the whole diagnosis until the low-passed split showed the same quantity at **−210 to −67 N at the fall**: a median
  over a run whose roll starts at zero is not the quantity the fall is made of. Said here because the first draft of
  this part had it the other way round.
- **And a trap worth the next round's time**: the low-passed per-source split attributes **0.193 °/°** to `pressure`
  on the shipped cell — nine times its real in-plane share — purely because low-passing a deck-normal force in the
  world and projecting it on a rolled deck manufactures an across component. Both columns are printed, the lagged one
  labelled **not an attribution of forces**. Another frame error of the same family as the nine of the last fortnight,
  caught only by having two instruments rather than one.

## 8. What I will not claim

- **I will not claim the lag is the owner's fall, or that it is a bug.** It is the instrument the balance was designed
  with: a real inner ear low-passes too, and `SPECIFIC_FORCE_TIME` has a reason (3.2i's shove). What I measured is
  that **it accounts for a quarter to a half of the gain deficit at these roll rates**, so a gain of 1.000 is not
  reachable by re-pointing forces alone.
- **I will not claim the lag's share to better than its own arithmetic.** It is a **residual** — the measured slope
  less the instantaneous ledger's — so it carries both fits' error, and the instantaneous fit is the weaker of the two
  (R² 0.168–0.652). What is measured about the lag *directly* is its own law: the test's tilt per °/s of roll rate,
  **−0.047 to −0.133°** over seven cells with R² 0.178–0.677, against the filter's own **−T = −0.100** — and that is
  what I would defend, together with the traced frame where the force gives −6.5° and the test reads −15.5°.
- **I will not claim a per-source attribution outside this cell.** The ledger says what makes the in-plane force at
  drift angles of 1.9–4.9° in the trim the fall happens in; the fins' 5.60 N and the rails' −2.35 N are *that*
  condition's, and a board actually sliding would read differently.
- **I will not claim the gain deficit to three digits.** The deck-frame deficit is 0.234–0.442 over seven cells with
  R² 0.481–0.713; the claim I will defend is **buoyancy first, pressure negligible, the filter a steady tenth, and the
  three never summing to the whole**.
- **I will not claim this round measured the fix.** §6 is arithmetic on a decomposition [I]. Nothing was re-pointed.
- **I will not claim this is the owner's fall.** They rode Canyon and reported falls that slide out sideways; these
  twelve drift 1.9–4.9°. Their balance HUD is the instrument for what they rode.
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed and not paddled in, the first ~0.17 s of
  every run carries a contact transient, and every span above is a whole population — twelve runs a cell, two stances
  × six entry speeds, one face slope — and not a confidence interval.

## 9. Seatbelts

- **No source file changed at all.** `git diff --stat origin/main HEAD -- src/` is empty; everything shipped is under
  `docs/research/new-rider/3.3/`. **Nothing new ships on**: `VERTICAL` and `HULL` are the probe's own environment,
  `STEER=0` with neither set is the game's own configuration, and `hull: 'rail'` is already opt-in and off in
  `BoardBody` [R]. There is no switch to leave on by mistake because there is no switch in `src/`.
- **The shipped rider unchanged, proved against Part 24's and Part 25's published figures and not asserted.** At
  `STEER=0` the probe reproduces **every** shared column **to the digit**: fell 12 of 12 at **0.77–1.70 s**, bank peak
  **20.7–65.7°**, roll peak **20.9–63.0°**, rail peak **10.9–62.9°**, drift peak **1.9–4.9°**, `latPair` mean
  **1.58–3.47** / median 1.64–3.34 / peak 1.79–8.82, the `latPair − latWater` residual **0.000 median / 0.011 peak**,
  `feetAccel` **1.17–3.00** with peak **6.93–25.55** and mean signed **0.48–2.89**, `baseMeanAccel` **0.00–0.38**
  against the body's **0.42–1.41**, the felt tilt at the fall **−15.9 to −7.4°**, the identity residual
  **0.181–1.591°**, the across-speed **0.754–1.406 m/s** = body 0.715–1.272 − feet −0.302–0.401, the pooled
  `sin(rail)` slope **7.24 m/s² (R² 0.862)** and the bank gain **0.768 lagged / 0.832 un-lagged (R² 0.929 / 0.918)**.
  The probe reads off the live instance and sets only `rider.steer`, the player's own stick.
- `npx tsc --noEmit -p .`: **exit 0**, read from `tsc`'s own exit status on its own line, never through a pipe.
  `npx tsc --noEmit -p server/tsconfig.json`: **exit 0**. The root project includes only `src`, so `deck.ts` was
  type-checked separately on a throwaway project extending the root's options (with `types: ["node"]` and an absolute
  `typeRoots`, because a tsconfig outside the tree resolves `@types` from its own folder): **exit 0**.
- The rider, board, HUD and runner test files, `PhysicalMode` (`src/game/`), `RideHud` (`src/ui/`), `SurfZoneRunner`
  and `SprayCloud` (`src/wave/`) included — `SurfZoneRunner` is outside the merge suite, so a red there is news:
  **58 files passed, 783 tests passed and 21 expected fail (804), vitest exit 0**, 101 s — the same counts as 3.3a's.
  `src/wave/SurfZoneSimulation.test.ts` is deliberately not in it (`c2-step5g.md` §7.4), closed by reading.
  `results/33b/suite-33b.txt`.
- **The Canyon bench, all four hashes, fresh spin-ups on the tree that merges**, with Part 25 §5.5's wrapper written
  out and **the grid read before the hashes** (Canyon B **400 × 451 = 180400**, the default **400 × 507 = 202800**):
  Canyon B **`a367d938f15fa934`** / **`9e5831f80e38abd9`**, default Canyon **`ea3d57a4d49f4b48`** /
  **`a1a2555739210f96`** — **all four identical** to the reference unchanged from C2 step 5f through 3.3a. The two legs
  overlapped on the machine, so the step times carry that load and are not comparable with 3.3a's; the hashes are the
  invariant. `results/33b/canyon-bytes-33b.txt` has both legs in full.
- **The deletions column, checked before the push**: `git diff --stat origin/main HEAD`, deletions read off the
  summary line — **0 deletions**, every file new, and `src/` not among them; the insertion count moves with every edit
  to this bullet, so it is left to the PR's summary line. It has caught a silent revert on eight consecutive rounds and
  `merge-base --is-ancestor` has caught none of them.
- No force was added or removed anywhere, and no gain, clip or threshold was changed. The round adds instrument and
  prose.

## 10. Files (3.3b)

- `docs/research/new-rider/3.3/deck.ts` (new): step 3.3a's `across.ts` with the deck-axis measurement added and
  nothing taken away — every water entry projected on the deck's normal `n̂` and its in-plane across axis `ŝ`, both raw
  and low-passed over `SPECIFIC_FORCE_TIME` in the world the way `pairFelt` is; the deck-frame tilt from the ledger,
  from the momentum route and from the test, with their residuals; the per-source attribution in newtons and as a
  marginal slope in degrees of tilt per degree of roll; the deck's own roll rate and the lag's law; the `sin(roll)`
  slope in newtons against `W` and against the measured `F_n`; the fits' intercepts; and `VERTICAL=particle` for
  `FaceWater`'s kinematic vertical. Its header carries the commands.
- `docs/research/new-rider/3.3/results/33b/`: `cell-*.txt` (the nine cells' full output), the nine `*.jsonl` cells
  (**108 rows**), `trace-tall-0-33b.jsonl` (one run frame by frame, which is where the seatbelt's peak was pinned to
  the separation frame), `ladder-table-33b.txt` (§2's table), `suite-33b.txt`, `canyon-bytes-33b.txt`.
- No source file.

## 11. For the owner, in plain words

**Last round found that your surfer's board only swings "down" about three quarters of the way when he leans, and
that the missing quarter is the slope that slides him off his feet. The water-physics advisor read that and said it
was our bug, in one line of code: the floating part of the water's push is aimed at the water's surface instead of at
the bottom of the board. It also said exactly what would prove it wrong. I went and did that test.**

**It is half right, and the half that is wrong is more interesting than the half that is right.**

The advisor's test was: if the board's *planing* push — the big one, the one that holds him up — turns out to be
pushing sideways along the deck, then the shape of the board's bottom is the culprit and the advisor is wrong. It
isn't. It is pushing **0.26 %** sideways, which is nothing, and the reason is written in our own board file: our
default board's bottom is flat across, so its push can only go straight up through the deck. To be sure the test could
even detect a sideways push, I turned on the shaped-rail board we built months ago and never shipped — and there the
same measurement lights up seven times brighter. **So the instrument works, and the answer is no.**

The advisor's own suspect, the floating push, **is** the biggest sideways culprit, in every one of the nine conditions
I ran. But it is only **a third to seven tenths** of the missing quarter, depending on the condition. And the rest is
not a force at all.

**Here is what it is.** Our surfer's sense of "which way is down" is deliberately slow — it averages the last tenth of
a second, the way a real inner ear does. When he is capsizing, the board is rolling at **65 to 330 degrees a second**.
A tenth of a second at 130 degrees a second is **13 degrees** — so his sense of down is pointing where the deck
*was*, not where it is, and that lag alone is a slope he is standing on. Measured, it is a steady tenth of a degree
per degree in all seven conditions, and no change to any force in the water will remove it.

**What that means for the decision in front of you.** The advisor asked for one change — aim the floating push at the
bottom of the board instead of at the water's surface — and said it would take the turn-for-lean ratio from 0.75 up to
0.95–1.00. On my numbers it would take it to about **0.7 to 0.9**, because the slow sense of down survives it. That is
still the single biggest fix available, and it is still your call, because that same push is how the wave shoves the
board down the line, so re-aiming it changes how every spot rides. I did not build it. I measured what it is worth.

**Also worth knowing**: "the hull's sideways bite is 26 % weaker than the textbook" was last round's number measured
against the wrong reference — the advisor spotted that itself and asked for the right one. Measured against the right
reference, the bite is **709 newtons where the textbook says 741** — four per cent, not twenty-six, and 98 % of what
the push actually on the board could give. **The board's bite is fine.**

**Nothing in this round changes the game.** There is nothing new to ride, and the game is byte-for-byte what you have.
