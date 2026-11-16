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


# Part 27 — the felt vertical's filter moved into the deck's frame, and the along-board column that refutes the advisor's geometry

Written 2026-11-15 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33c`, cut from `main` at
**c3ae0147** (the advisor's second ruling), so Part 26 and both rulings are its base. **This round ships one change to
the game, opt-in and off by default** — `?feltFrame=deck`, 72 inserted and 8 replaced lines over six source files
plus the switch's own test, every behavioural line gated on the switch — plus one probe, **eighteen** cells of twelve
runs (**216 runs**) and a paired instrument the cells could not give.

## 0. What was built, in one line of physics

`AttachedRider.captureStep` low-passes the pair's specific force over `SPECIFIC_FORCE_TIME` = 0.1 s **in the world**
and only then projects it onto the deck's **current** axes [R]. `feltFrame: 'deck'` keeps the filter's state on the
**deck's own axes** instead — `dG/dt = (A − G)/T` in the board's frame, which is what a body-fixed sensor does. The
time constant, the reading and the smoothing are identical; only the frame the state is held in changes. **No force was
added, removed or re-pointed; no hull law, no spot's drive and nothing the online rooms share is touched.** The mount's
first reading is the same vector either way (the world vertical, rotated into the deck's axes when that is where the
state lives), so the switch changes nothing on the first loaded substep.

Its warrant is the advisor's second ruling, from Laurens 2022 (Front. Syst. Neurosci. 16:886284): the brain's gravity
estimate is built in **egocentric** coordinates and the otolith is a **body-fixed** sensor, so in body coordinates a
0.1 s lag costs `T · d(tilt)/dt` ≈ 0.65° on this trajectory where the world frame's `Ω · T` costs 13° — a factor of
twenty for the same time constant [S + I]. **It is not only a readout**: `humanBalance`'s `px = offset.x − height · nx`
puts the same filtered vertical into the capture point, so it moves the fall margin itself. The cells below are
therefore **re-runs on a changed trajectory**, not re-reads, and every comparison between them is a comparison of two
populations. That is why §2 exists.

## 1. The five sentences the round is for

1. **The world frame's rate-proportional term is real, systematic and one-signed, and the deck frame removes half to
   nearly all of it.** On the **paired** instrument (two shadow filters on one trajectory, §2) the test's tilt per
   degree per second of roll rate goes from **−0.047 to −0.134° (R² 0.178–0.658)** in the world to **+0.002 to −0.066
   (R² 0.000–0.392)** on the deck, **in all nine cells**, over roll-rate peaks of 57–330 °/s. Cell by cell that is
   **51–97 % of the term removed, median 72 %**. Against the filter's own `−T = −0.100`, the world frame runs at
   **47–134 %** of it and the deck frame at **1–66 %**, and the correlation collapses with it: R² 0.178–0.658 → 
   0.000–0.392, and in two cells the sign flips at R² ≈ 0.
2. **And the thing the world frame does to the tilt is a one-signed over-read that the deck frame turns into a
   two-signed attenuation.** Paired, per degree of **roll**: the un-lagged in-plane truth `atan(F_s/F_n)` is
   **0.111–0.478 °/°**, the world-frame filter reads **0.226–0.476** and the deck-frame filter **0.050–0.271**. The
   world frame's error is **+0.064 to +0.136 in eight of the nine cells and never negative** — the steadiest column in
   two rounds, and the same 0.084–0.132 Part 26 measured a different way. The deck frame's error is
   **−0.072 to +0.022 in eight cells** and **−0.339 in the ninth** (`hull:'rail'`, §6). **One is a bias; the other is a
   lag.**
3. **3.3b's live trap closes, and that is the mechanism confirmed by its own disappearance.** Part 26 §7's last bullet
   warned that the low-passed per-source split attributes **0.193 °/°** to `pressure` on the shipped cell — nine times
   its real in-plane share of 0.022 — purely because low-passing a deck-normal force in the **world** and projecting it
   on a rolled deck manufactures an across component. Low-passed **in the deck's frame** on the same cell, `pressure`
   reads **0.010**. With the deadrise band on, where `pressure` has a real in-plane share of 0.149, it goes
   **0.345 → 0.059**; with `'particle'`, **0.142 → 0.010**. **The manufactured component is gone, by name, in the one
   entry whose true in-plane force is ≈ 0.**
4. **The deficit falls in all nine cells and the falls move later — and no fall was prevented in any of the eighteen.**
   The deck-frame gain deficit goes from **0.234–0.499** to **0.141–0.291**; 12 of 12 still fall in every cell, at
   **1.10–1.93 s** against **0.77–1.70** on the shipped cell and **0.83–1.27** against **0.50–1.00** with the band on.
   **What the rider buys is 0.1–0.4 s and a deeper roll before the same fall.** Over all **108 runs a frame**, not
   the shipped cell alone: the roll peak goes from **11.0–90.8°** to **11.0–119.2°**, the fall from **0.50–5.33 s** to
   **0.83–5.65 s**, and the capture point ends **0.091–0.750 m** past the feet in the world against
   **0.115–1.251 m** on the deck. The fall is later and, when it comes, further gone.
5. **The advisor's along-board geometry claim does not hold, and the reason is the trim angle it left out — but its
   *across* half is confirmed exactly.** §5.

## 2. The paired instrument, because the cells cannot answer the question

The filter feeds the capture point, so turning it on changes the ride: the deck cells fall later, roll further and
reach roll rates of 85–419 °/s against the world cells' 57–330. **Every world→deck column in §3 is therefore a
comparison of two populations, not a paired measurement**, and on its own it cannot separate "the instrument changed"
from "the ride changed". Part 26's own rule 4, and this round nearly broke it.

So the probe runs **two shadow copies of the rider's own filter side by side on one trajectory**, read-only, off the
same momentum difference `captureStep` low-passes: one held in the **world** and read on the deck's current axes (the
shipped order), one held on the **deck's** axes. Neither touches the rider; the difference between them is the
instrument's alone, with no trajectory confound at all.

**Its seatbelt**: the world shadow reproduces the rider's own `tiltAcross` to a per-run median of **0.002–0.347°** in
all nine cells (0.002–0.073 over the eight on the default hull). **The shadow is the rider's filter**, so what it says
about the other frame is about the other frame.

| cell | frames | world shadow vs the test's own, ° | tilt per °/s of roll rate, world → **deck** (R²) | tilt per ° of roll, world → **deck**, against the un-lagged truth |
|---|---|---|---|---|
| 0 (shipped) | 780 | 0.009–0.073 | −0.0779 (0.498) → **−0.0135** (0.034) | −0.226 → **−0.050** vs −0.111 |
| +0.25 into | 2045 | 0.003–0.028 | −0.0472 (0.178) → **+0.0022** (0.001) | −0.441 → **−0.271** vs −0.345 |
| +0.5 into | 1376 | 0.006–0.027 | −0.1276 (0.658) → **−0.0585** (0.381) | −0.335 → **−0.198** vs −0.239 |
| +1 into | 1013 | 0.008–0.034 | −0.1055 (0.555) → **−0.0413** (0.228) | −0.237 → **−0.115** vs −0.158 |
| −0.25 against | 2289 | 0.002–0.025 | −0.0656 (0.253) → **−0.0157** (0.031) | −0.339 → **−0.234** vs −0.232 |
| −0.5 against | 2317 | 0.006–0.023 | −0.1340 (0.633) → **−0.0657** (0.392) | −0.351 → **−0.228** vs −0.217 |
| −1 against | 2022 | 0.007–0.020 | −0.1173 (0.552) → **−0.0501** (0.286) | −0.330 → **−0.216** vs −0.194 |
| particle | 1048 | 0.008–0.041 | −0.0503 (0.224) → **+0.0014** (0.000) | −0.231 → **−0.095** vs −0.167 |
| `hull:'rail'` | 532 | 0.021–0.347 | −0.0891 (0.514) → **−0.0247** (0.078) | −0.476 → **−0.139** vs −0.478 |

**Read the last column as signed error against the truth and the result is one sentence.** World:
**+0.115, +0.096, +0.096, +0.079, +0.107, +0.134, +0.136, +0.064, −0.002** — positive in eight of nine, in a band of
0.07. Deck: **−0.061, −0.074, −0.041, −0.043, +0.002, +0.011, +0.022, −0.072, −0.339** — signed, smaller in seven
cells, and much larger in the one cell where the real in-plane force is both large and fast (§6). **The world frame's
cost is a bias with a law; the deck frame's is a lag without one.** That is the change, and it is the free half of the
diagnosis the advisor asked for.

## 3. The nine cells, both frames — a population comparison, labelled as one

| cell | frames w/d | fell at, world | fell at, **deck** | measured deficit | force's own share | residual | tilt per °/s of roll rate (R²) |
|---|---|---|---|---|---|---|---|
| 0 (shipped) | 780/965 | 0.77–1.70 s | **1.10–1.93 s** | 0.234 → **0.141** | 0.111 → 0.458 | +0.124 → −0.317 | −0.0831 (0.613) → −0.0329 (0.206) |
| +0.25 into | 2045/2322 | 1.05–5.08 | **1.17–4.98** | 0.442 → **0.244** | 0.345 → 0.317 | +0.098 → −0.073 | −0.0467 (0.178) → −0.0045 (0.004) |
| +0.5 into | 1376/1628 | 0.97–3.23 | **1.22–3.48** | 0.337 → **0.226** | 0.239 → 0.266 | +0.099 → −0.040 | −0.1288 (0.677) → −0.0585 (0.440) |
| +1 into | 1013/1211 | 0.93–2.42 | **1.18–2.85** | 0.243 → **0.184** | 0.158 → 0.236 | +0.084 → −0.053 | −0.1095 (0.600) → −0.0447 (0.259) |
| −0.25 against | 2289/2434 | 1.53–4.63 | **1.58–4.85** | 0.334 → **0.234** | 0.232 → 0.369 | +0.102 → −0.135 | −0.0646 (0.254) → −0.0310 (0.139) |
| −0.5 against | 2317/2521 | 1.48–5.33 | **1.63–5.65** | 0.347 → **0.291** | 0.217 → 0.399 | +0.129 → −0.108 | −0.1326 (0.643) → −0.0684 (0.227) |
| −1 against | 2022/2173 | 1.55–3.92 | **1.57–4.02** | 0.326 → **0.274** | 0.194 → 0.245 | +0.132 → +0.029 | −0.1163 (0.557) → −0.0452 (0.138) |
| particle | 1048/1232 | 0.87–3.30 | **1.25–3.47** | 0.237 → **0.224** | 0.167 → 0.362 | +0.070 → −0.138 | −0.0525 (0.254) → −0.0235 (0.050) |
| `hull:'rail'` | 532/741 | 0.50–1.00 | **0.83–1.27** | 0.499 → **0.164** | 0.478 → 0.445 | +0.020 → −0.281 | −0.0975 (0.668) → −0.0406 (0.478) |

Three things in that table are **not** results and are said so here.

- **"The force's own share rose"** (0.111 → 0.458 on the shipped cell) is a different trajectory, not a worse force.
  Worse, in the deck cells the instantaneous fit is a bad instrument: `F_n` per run at the fall runs **7.3–653.6 N**
  against the world cells' 100.9–766.4, so `atan(F_s/F_n)` blows up on the frames where the hull unloads — 3.2s's own
  `pressure↑ 0.807 → 0.011 W` collapse, arriving in a regression. The **per-source** attribution, which divides by the
  pooled median `F_n`, puts `buoyancy` at **0.067–0.120 °/°** over the nine deck cells against **0.111–0.181** over the
  nine world ones: **buoyancy is still the largest named in-plane term in every cell of both frames**, at the same
  order, and that is the claim I will defend about the force half.
- **The residual's sign flip** (+0.020 to +0.132 in the world, −0.317 to +0.029 on the deck) is the whole point said
  twice: a world-frame lag **adds** tilt proportional to roll rate, a deck-frame lag **attenuates** it, which is what a
  smoothing filter does.
- **Nothing here reaches the advisor's expected 0.04–0.15 °/° residual.** The deck cells' measured deficit is
  **0.141–0.291**. The part that *is* in that band is the paired instrument's own error, **−0.072 to +0.022 in eight
  of nine cells** — so the advisor's number was right about the **instrument** and not about the **deficit**, and the
  deficit is now mostly a real force.

## 4. `F_s` in newtons and `F_s/F_n` in degrees, un-lagged — the advisor's instructed columns

The bank gain is retired as the headline on the advisor's instruction: it conflates a force, a filter and a hull
unload. These carry no 0.1 s anywhere in them. `F_s` is the water force's across component **in the plane of the
deck** and `F_n` its deck-normal component; the pool is the whole cell, 532–2521 frames.

| cell | `F_s` pooled median, N w → d | `F_s` pooled \|median\|, N | `F_s` at the fall, N (world) | `F_s` per unit sin(**rail**), N (R²) | `F_s/F_n`, ° pooled median | ° \|median\| |
|---|---|---|---|---|---|---|
| 0 (shipped) | −7.2 → −17.9 | 9.7 → 17.9 | −65.3–100.6 | −79.7 (0.353) → −74.1 (0.397) | −0.61 → −1.39 | 0.78 → 1.46 |
| +0.25 into | −11.1 → −11.2 | 17.2 → 19.7 | −122.6–189.4 | −228.2 (0.454) → −177.9 (0.429) | −0.82 → −0.85 | 1.28 → 1.46 |
| +0.5 into | −23.2 → −28.5 | 28.9 → 32.4 | −216.0–39.6 | −189.4 (0.643) → −158.7 (0.589) | −1.66 → −2.03 | 2.01 → 2.40 |
| +1 into | −33.3 → −40.3 | 35.6 → 41.3 | −147.7–89.6 | −117.4 (0.447) → −126.0 (0.499) | −2.28 → −2.86 | 2.39 → 3.01 |
| −0.25 against | +2.4 → +2.8 | 18.7 → 20.9 | −40.0–116.3 | −199.3 (0.567) → −168.4 (0.591) | +0.20 → +0.24 | 1.40 → 1.61 |
| −0.5 against | +6.1 → +9.4 | 23.4 → 26.7 | −77.7–180.2 | −191.8 (0.734) → −169.6 (0.685) | +0.47 → +0.72 | 1.77 → 2.06 |
| −1 against | +9.3 → +14.1 | 35.1 → 37.2 | −85.2–170.5 | −171.5 (0.549) → −164.0 (0.518) | +0.67 → +1.09 | 2.77 → 2.90 |
| particle | −8.6 → −15.0 | 11.8 → 17.8 | −97.8–73.1 | −100.6 (0.381) → −93.5 (0.438) | −0.63 → −1.09 | 0.87 → 1.33 |
| `hull:'rail'` | −7.2 → −20.1 | 9.1 → 20.1 | −127.1–46.1 | −263.5 (0.766) → −89.0 (0.419) | −0.62 → −2.08 | 0.79 → 2.08 |

**And the advisor's warning about chaining, honoured and now sized.** `F_s` per unit `sin(rail)` is **−80 to −264 N**
over the nine world cells (R² 0.353–0.766, intercept −5.8 N on the shipped cell). The pooled `sin(roll)` slope of the
**total** lateral force is **709 N** (Part 26 §3). These are **not the same quantity by a factor of nine**: one is the
water's whole side force per unit bank, the other is only the part lying in the plane of the deck. Chaining them
manufactures the tenfold discrepancy the advisor warned of, and printing both in newtons in the same table is the only
way I know to stop it being chained again.

**`F_s/F_n` in degrees, pooled, is 0.78–2.77° un-lagged over the nine world cells** — the real in-plane residual the
body stands on when the filter is honest, against the **7.4–15.9°** the shipped test reads at the fall. That gap is the
subject of §2, and the traced frames below are it one frame at a time.

## 4b. The traced frames, both frames, at an equal or higher roll rate

Part 26's traced run (tall, entry +0, the shipped cell) reproduced to the digit, and the same run with the deck filter:

| frame | roll ° | roll rate °/s | `atan(F_s/F_n)` ° | the test reads ° | the instrument's gap ° |
|---|---|---|---|---|---|
| world, t 1.583 | 56.04 | 135.5 | −6.27 | −14.21 | **7.94** |
| world, t 1.600 | 58.37 | 139.6 | −6.50 | −14.89 | **8.40** |
| world, t 1.617 | 60.73 | 141.6 | −6.51 | −15.50 | **8.99** |
| world, t 1.633 (fall) | 62.95 | 133.5 | −3.91 | −15.92 | 12.02 |
| **deck**, t 1.700 | 70.70 | **157.1** | −5.46 | −4.92 | **−0.54** |
| **deck**, t 1.717 | 73.38 | **161.1** | −5.28 | −5.86 | **+0.58** |
| **deck**, t 1.733 | 76.17 | **167.1** | −5.34 | −7.70 | **+2.35** |
| deck, t 1.750 (fall) | 76.10 | −3.9 | −1.59 | −8.65 | 7.06 |

At an **18 % higher** roll rate the gap is **0.5–2.4°** where the world frame's was **8.0–9.0°**. That is one run, and
it is quoted as one run; §2's nine-cell paired columns are the population. The fall frame is excluded from the claim in
both, for Part 26 §0's reason.

## 5. The advisor's along-board geometry claim: the across half holds exactly, the along half does not

The advisor's ruling §1(b), quoted in full in the brief: *"the rail rotation is about the board's own long axis, so
re-pointing `buoyancy` leaves its **along-board** component — the wave's push down the line — unchanged to first order,
and rotates only the across part, by the rail angle. At trim, where rail ≈ 0, the two directions coincide exactly and
nothing changes at all."* **This round did not build item 2**; it printed the column.

**How.** After every step the probe re-walks the board's patches off the live instance's own **last-substep** arrays —
`normal`, `point`, `samples`, `area`, `thickness`, `bandSide`, `localUp`, the arrays `BoardBody.substep` itself wrote,
so no rotation and no water sample is re-derived — and calls **`hullForces.patchForce` itself** on them with a zero
relative velocity, because that function sets `buoyancy` before its `speed > 0` gate. So the shipped buoyancy is exact
by construction, not re-derived. Then each patch's force is re-pointed along the **hull** normal (`−patch.normal`, or
the station's own `band.up` on a band facet) at the same magnitude, and both are projected on the board's own three
axes.

**Its seatbelt, run and reported rather than assumed.** The walk's water-normal sum against the ledger's own
`forces.buoyancy` differs by **0.3–69 %** per run, because the ledger is a **mean over the step's 32 substeps** and the
walk is the **last** substep's. Driven to **one** substep the same comparison is **0.00 N median** — exact — and it
rises monotonically with the substep count (1 → 0.00 %, 2 → 10.5, 4 → 17.7, 8 → 21.7, 32 → 24.9 on one run). **So the
walk is the engine's own buoyancy and the gap is time-averaging, measured, not asserted.**

**And the walk has a positive control of its own.** On the default board it finds **16–28 wet patches and 0 band
facets** in all eight cells; with the deadrise band on it finds **36–71 wet patches of which 43–53 are band facets**,
and takes the band's own `up` branch for them (`patchForce`'s trap 1: a near-vertical facet's deck is not along its own
normal). So the walk sees the athwartships geometry where the board has it — the same shape of check Part 26 §1.2 used
for `pressure`. It also took the `buoyancyNormal` overhang branch in **0 frames** and found the deck hollow open in
**0 frames** over all 216 runs, so no untaken branch is hiding in it.

| cell | along-board, shipped → **hull**, N (pooled median) | per-frame \|difference\|, N median / peak | as a share of \|buoyancy\| | across, shipped → **hull**, N (per-run medians) | the water normal against the deck's: **roll** part ° / **TRIM** part ° (per-run medians) |
|---|---|---|---|---|---|
| 0 (shipped) | 4.0 → **1.9** | 1.70 / 13.02 | **2.4 %** | −25.5–0.2 → **−0.1–0.0** | −14.5–0.2 / **1.72–4.59** |
| +0.25 into | 11.9 → **3.3** | 8.93 / 96.45 | 8.1 % | −33.9–−0.4 → **0.0–0.0** | −20.4–−1.7 / **1.60–8.78** |
| +0.5 into | 8.7 → **2.4** | 6.00 / 33.83 | 6.1 % | −45.9–−1.1 → **−0.1–0.0** | −24.6–−1.3 / **2.37–6.65** |
| +1 into | 5.1 → **1.7** | 2.74 / 35.06 | 3.7 % | −43.0–−0.5 → **−0.1–0.0** | −26.5–−0.7 / **2.10–5.37** |
| −0.25 against | 11.2 → **3.5** | 7.67 / 78.74 | 7.5 % | −8.6–12.0 → **0.0–0.0** | −8.3–12.8 / **2.81–7.28** |
| −0.5 against | 11.3 → **3.4** | 7.67 / 33.52 | 7.9 % | −6.7–22.1 → **0.0–0.0** | −6.0–21.0 / **2.68–7.34** |
| −1 against | 8.5 → **2.7** | 5.82 / 43.80 | 6.7 % | 0.2–18.0 → **0.0–0.0** | −0.1–15.5 / **3.49–6.06** |
| particle | 14.7 → **3.4** | 11.15 / 76.60 | 9.2 % | −35.7–3.6 → **−0.1–0.0** | −15.3–1.0 / **2.98–19.24** |
| `hull:'rail'` | 2.9 → **1.6** | 0.89 / 11.52 | 1.6 % | −5.6–0.3 → **0.0–0.0** | −5.6–0.3 / **0.48–3.15** |

**The across half is confirmed, exactly and in every cell.** `buoyancy`'s in-deck-plane across force is
**−45.9 to +22.1 N** per-run median as shipped and **−0.1 to 0.0 N** on the hull normal. Re-pointing removes
**essentially all** of it, which is item 2's whole payoff and the force half of Part 26's diagnosis.

**The along half does not hold.** The along-board component falls from a pooled median of **2.9–14.7 N** to
**1.6–3.5 N**, a cut of **45–77 %** cell by cell, and the hull-on-shipped regression slope is **0.182 (R² 0.462)** on
the shipped cell, not 1. "Unchanged to first order" is false as a statement about the component; what is true is the
**absolute** size — the per-frame difference is **0.89–11.15 N** at the median, **1.6–9.2 %** of `|buoyancy|` and under
**1.5 %** of the pair's 741 N weight. **So the claim's conclusion survives on magnitude and its premise does not.**

**And the premise is why.** The deck normal differs from the water's by a **rail** rotation about the long axis *and* a
**trim** rotation about the across axis, and it is the trim one that moves the along-board component. Measured on the
deck's own axes, the trim part's per-run median is **0.48–19.24°** (peaks 3.07–143.6°) and the roll part's
**−26.5 to +21.0°** (peaks 7.1–100.7°). The trim part is the planing angle of attack: **it is never zero on a board
that planes, because it is what makes the lift.** So the ruling's last sentence — *"at trim, where rail ≈ 0, the two
directions coincide exactly and nothing changes at all"* — **is false**: at rail 0 the two normals still differ by the
trim angle, and they coincide only at zero trim and zero rail, which a planing board never has.

**One thing moves the other way, and the owner should hear it before the rest.** Measured as a **world-horizontal**
force, `buoyancy` does not lose its push when re-pointed — it **gains** magnitude: **2.9–15.8 N** per-run median as
shipped against **11.0–39.3 N** on the hull normal, and the component **down the water's own slope**, which is the
direction the shipped term literally points in, goes **1.6–15.8 → 1.8–20.0 N** at the median and **0.0–9.1 → 0.0–23.9 N**
at the fall. On a rolled board the hull normal is further from vertical than the water's is, so it has the longer
horizontal lever. **The feared loss of "the wave's push down the line" is not what the geometry says would happen.**
What would happen is a *redirection* of a 76–122 N force whose horizontal part roughly doubles and whose across-deck
part vanishes — which is still a change to every spot's drive, still needs the recalibration the owner objected to in
3.2s, and is still their call. **It is not, on this measurement, a change that removes drive.**

## 6. The cost of the fix, stated where it is largest

The deck frame's filter still lags. In eight of the nine cells the lag costs **−0.072 to +0.022 °/°** against the
un-lagged truth — negligible, and the advisor's own expected band. In the ninth, `hull:'rail'`, it costs **−0.339**:
there the real in-plane force is both large (truth 0.478 °/°) and fast (the fall comes at 0.50–1.00 s), so a 0.1 s
smoothing attenuates **71 %** of it, and the world frame's manufactured over-read happened to cancel almost exactly
(+0.476 against a truth of 0.478 — **coincidence, in one cell, and not a reason to keep a bias**).

**Two things follow and neither is a recommendation to stop.** First, the deadrise band is **not** the shipped board
and is off in the game [R]; the owner's board is the flat section whose real in-plane `pressure` is 0.003–0.022 °/°.
Second, **this is the generic cost of smoothing and no frame avoids it** — it is the price the filter was bought for,
and 3.2i's reason for buying it (the body's own shove on a 2.5 kg board) is largely superseded by the move to the
**pair's** specific force, so the time constant itself is now the open question and not its frame. **I did not touch
the time constant and I am not asking for it to be touched on this evidence.**

Late in a capsize none of this is the authority anyway: the ankle's ceiling is `F_n × 0.130 m` and `F_n` is the same
quantity whose collapse inflates the demand (3.2s: `pressure↑` 0.807 → 0.011 W between 49° and 83° of roll). The deck
cells make that worse, not better, because their deepest rolls run **87.9–119.2°** cell by cell — `F_n` at the fall
runs down to **7.3 N**. **The hip is the authority there, and the filter frame changes only how early it is needed.**

## 7. What I refuted

- **The advisor's §1(b) geometry, in its along-board half.** Re-pointing `buoyancy` cuts its along-board component by
  **45–77 %** in all nine cells (pooled medians 2.9–14.7 → 1.6–3.5 N, hull-on-shipped slope 0.182), because the deck
  normal and the water normal differ by a **trim** rotation about the across axis as well as a rail rotation about the
  long axis, and the trim part is **0.48–19.24°** at the per-run median. Its *across* half is confirmed exactly
  (−45.9…+22.1 N → −0.1…0.0 N), and its conclusion survives on absolute size (1.6–9.2 % of `|buoyancy|`).
- **"At trim, where rail ≈ 0, the two directions coincide exactly and nothing changes at all."** They coincide only at
  zero trim *and* zero rail. The trim angle is the planing angle of attack; a board that planes always has one.
- **The feared direction of item 2's cost to the spots' drive.** Buoyancy's world-horizontal magnitude **rises**
  (2.9–15.8 → 11.0–39.3 N median) and its down-slope component rises with it (1.6–15.8 → 1.8–20.0 N). Re-pointing does
  not remove the push down the line; it redirects it and makes it larger. That is still a recalibration and still the
  owner's call — but the objection should be to a change, not to a loss.
- **3.3b's own trap, by closing it.** `pressure`'s lagged in-plane share goes **0.193 → 0.010** on the shipped cell
  when the low pass is held in the deck's frame instead of the world's (0.345 → 0.059 with the band on, where its real
  share is 0.149; 0.142 → 0.010 with `'particle'`). The 0.193 was the projection, and nothing else.
- **My own instrument, twice.** (a) The probe read `pairFelt`'s components as a **world** vector in the deck cells,
  where the field is board-frame by construction — it printed a bank gain of **−0.346** before that was found, and
  every `feltWorld`-derived column was nonsense in exactly the nine cells the round is about, while the headline
  columns (off the test's own board-frame `tiltAcross`) stayed right. (b) The per-source **low-passed** split was still
  low-passing in the world while the rider low-passed on the deck, which is the same family of error as the trap above;
  the split's own seatbelt against `tiltAcross` caught it at 0.63–4.97° before the fix and 0.06–1.16° after.
- **And a seatbelt I could not explain until I read the code — plus my own first answer to it, which was wrong.** The
  momentum route and the force ledger agree to a median of **0.000 m/s²** in every one of the eighteen cells, but they
  do part company on some frames: over all 216 runs, **0–115 frames of 30–320** a run in the world and **0–128 of
  50–339** on the deck (on the shipped cell, **0–1 of 46–102** against **0–20 of 66–116**), to a peak of
  **11.9 m/s²** = 896 N. **My first explanation was the rider's hand in the water, and the probe refuted it**: the
  probe now reads `AttachedRider.handSupport` — a water force on the **pair** that is genuinely not in
  `BoardBody.forces` — and it is worth at most **7.2 N** across over all 216 runs, in 0–243 frames a run, present in
  **both** frames. Two orders short. The cause is `BoardBody.pushCapped` [R]: with the standing rider's power window
  the board takes only a **share** of the feet's push, so on a capped substep the pair's momentum is **not** the
  water's alone, by construction — ruling 27's A-lite, present in the shipped rider and simply reached more often the
  deeper the roll goes. **No at-the-fall number is quoted off the instantaneous momentum route**, in either frame, as
  Part 26 refused to quote one off the separation frame.

## 8. What I will not claim

- **I will not claim this fixes the fall.** 12 of 12 fell in all **eighteen** cells. Over all 108 runs a frame the
  rider holds **0.83–5.65 s** instead of **0.50–5.33 s**, rolls to **11.0–119.2°** instead of **11.0–90.8°**, and ends
  **0.115–1.251 m** past the feet instead of **0.091–0.750 m**. On this evidence the filter frame makes the fall
  **later and deeper**, not absent.
- **I will not claim the deck cells' force numbers against the world cells' as a paired result.** They are two
  populations with different falls, rolls and roll rates. Only §2 is paired, and only §2's columns are quoted as the
  instrument's own change.
- **I will not claim the deck frame is better in every cell.** It is closer to the un-lagged truth in seven of nine,
  a wash in one, and **worse by 0.339 °/°** in `hull:'rail'`, which is not the shipped board. What I will defend is
  that the world frame's error is **one-signed and rate-proportional** (+0.064…+0.136, R² 0.178–0.658 on the roll rate)
  and the deck frame's is **not** (−0.072…+0.022 in eight cells, R² 0.000–0.392).
- **I will not claim the residual is "nothing meaningful".** The advisor offered 0.04–0.15 °/° as the expected
  remainder. The measured deck-frame **deficit** is 0.141–0.291, and `buoyancy`'s own in-plane share is
  **0.067–0.120** of it — so after the free half, **the deficit is mostly a real force again**, and item 2 is the
  thing that would move it.
- **I will not claim the walk's buoyancy is the ledger's.** It is the **last substep's**, the ledger is a 32-substep
  mean, and the gap is 0.3–69 % per run — demonstrated to be exactly that by driving the substep count to 1, where it
  is 0.00 N. Every §5 number is a last-substep geometry.
- **I will not claim this measured item 2.** Nothing was re-pointed. §5 is the geometry of what re-pointing would do
  to one force on the shipped rider's own trajectory; re-pointing it would change the trajectory, so the real figure
  still needs the change built, and that is the owner's call.
- **I will not claim this is the owner's fall**, and here I have to correct a caveat this thread has carried for
  several rounds. "Every probe measures drift peaks inside 5°" is true of the **unsteered** cell only: there the drift
  peak is **1.9–4.9°** in the world and **2.1–11.2°** on the deck. Over all 108 runs a frame, including the six
  steered cells, the drift peak reaches **0.8–69.3°** in the world and **1.9–60.4°** on the deck. Those large drifts
  are in and after the capsize, not a controlled slide, so they are still not evidence that this is the owner's
  sideways slide-out — but the "inside 5°" figure should not be quoted as the population again. Their balance HUD is
  the instrument for what they rode.
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed and not paddled in, the first ~0.17 s of
  every run carries a contact transient, and every span above is a whole population — twelve runs a cell, two stances
  × six entry speeds, one face slope — and **not** a confidence interval.

## 9. Seatbelts

- **The new behaviour ships off**, and the shipped rider is proved unchanged rather than asserted. The code diff is
  **72 insertions and 8 replaced lines over the six source files, plus 29 and 1 in the switch's own test**, and every
  behavioural line is gated on `this.deckFelt`; the
  one ungated edit replaces `ax, ay, az` with `a.x, a.y, a.z` off a scratch vector set to the same three numbers.
  **At `FELT=world` the probe reproduces Part 26's whole table to the digit**: the measured deficit
  **0.234 / 0.442 / 0.337 / 0.243 / 0.334 / 0.347 / 0.326 / 0.237 / 0.499**, the force's share
  **0.111 / 0.345 / 0.239 / 0.158 / 0.232 / 0.217 / 0.194 / 0.167 / 0.478** and the filter's residual
  **0.124 / 0.098 / 0.099 / 0.084 / 0.102 / 0.129 / 0.132 / 0.070 / 0.020** and Part 26 §3's whole datum table,
  **709 / 557 / 782 / 935 / 604 / 628 / 707 / 657 / 312 N** per unit `sin(roll)`, cell for cell — and Parts 24 and 25's
  shared columns too: fell 12 of 12 at **0.77–1.70 s**, bank peak **20.7–65.7°**, roll peak **20.9–63.0°**, rail peak
  **10.9–62.9°**, drift peak **1.9–4.9°**, `latPair` mean **1.58–3.47**, `feetAccel` **1.17–3.00** peak
  **6.93–25.55**, the felt tilt at the fall **−15.9 to −7.4°**, the identity residual **0.181–1.591°**, the pooled
  `sin(rail)` slope **7.24 m/s² (R² 0.862)**, the `sin(roll)` slope **9.38 = 709 N (R² 0.844)**, the bank gain
  **0.768 lagged / 0.832 un-lagged (R² 0.929 / 0.918)** and its intercepts **0.008° / 0.995°**.
- `npx tsc --noEmit -p .`: **exit 0**, read from `tsc`'s own exit status on its own line, never through a pipe.
  `npx tsc --noEmit -p server/tsconfig.json`: **exit 0**. The probe was type-checked separately on a throwaway project
  extending the root's options (with `types: ["node"]` and an absolute `typeRoots`, because a tsconfig outside the tree
  resolves `@types` from its own folder — 3.3b's note): **exit 0**, and `--listFiles` confirmed `felt.ts` and
  `AttachedRider.ts` were both in it rather than trusting a bare pass.
- The rider, board, HUD and runner test files, `PhysicalMode` (`src/game/`), `RideHud` (`src/ui/`), `SurfZoneRunner`
  and `SprayCloud` (`src/wave/`) included — `SurfZoneRunner` is outside the merge suite, so a red there is news:
  **58 files passed, 784 tests passed and 21 expected fail (805), vitest exit 0**, 119 s. That is **one more passing
  test** than 3.3a's and 3.3b's 783/804, and it is this round's own: `PhysicalMode.test.ts` gains a case for
  `?feltFrame=deck` in the shape `riderSwitch`'s and `legPowerSwitch`'s cases already use — the parsing, every spot's
  config through `surfZoneConfigFor`, and **the online-room pin read out of `main.ts`, so removing that pin fails
  here**. `src/wave/SurfZoneSimulation.test.ts` is deliberately not in it (`c2-step5g.md` §7.4), closed by reading.
  `results/33c/suite-33c.txt`.
- **The Canyon byte check, all four hashes, fresh spin-ups on the tree that merges, with Part 25 §5.5's wrapper
  written out and the grid read before the hashes** (Canyon B **400 × 451 = 180400**, the default **400 × 507 =
  202800**): Canyon B **`a367d938f15fa934`** / **`9e5831f80e38abd9`**, default Canyon **`ea3d57a4d49f4b48`** /
  **`a1a2555739210f96`** — **all four identical** to the reference, unchanged from C2 step 5f through 3.3b.
  **And a new trap, which cost this round twenty minutes and is written up in full in
  `results/33c/canyon-bytes-33c.txt`: a kept `.sea` does not reproduce the reference.** The first attempt reused
  3.3b's own `b1.sea`/`c1.sea`, still on disk because the scratchpad path is per **project**, and printed
  `d236d12d682dc4f6` / `ab2156bcafecc1c0` — a plausible-looking byte-check **failure** off a clean tree.
  `m1-cpu-bench.ts` imports an existing `--state` instead of spinning up, and a cold import of an exported state is
  not the same sea as a build-then-import, because the solver keeps internals `exportState()` does not carry. **The
  tell is the missing "spun up on the CPU in … s" line: read it before the hashes, as the grid is read before the
  hashes.**
- **The deletions column, checked before the push**: `git diff --numstat origin/main HEAD`, deletions read off per
  file — **10 in all, 9 of them in `src/`**, and every one a line replaced in place:
  `AttachedRider.ts` **5** (the three `pairFelt` blend lines, the `const felt` line, one reflowed doc-comment line),
  `main.ts` **2** (the online-room override line and its comment line), `SurfZoneRunner.ts` **1** (the spread line),
  `PhysicalMode.test.ts` **1** (the import line, extended), and `consult-log.md` **1** (the outcome cell).
  `PhysicalMode.ts`, `RideSession.ts` and `SurfZoneSimulation.ts` are **+13 / +3 / +8 with 0 deletions**. No file and
  no block removed. It has caught a silent revert on nine consecutive rounds and `merge-base --is-ancestor` has caught
  none of them.
- No force was added, removed or re-pointed; no gain, clip or threshold was changed; no hull law and no spot's drive is
  touched; nothing the online rooms share moves, because `main.ts` pins `feltFrame: undefined` for them as it does
  every other dev switch.

## 10. Files (3.3c)

- `src/physics/AttachedRider.ts`: `AttachedRiderOptions.feltFrame?: 'deck'`, the `deckFelt` flag, a scratch vector, and
  the three gated lines in `captureStep`.
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts` (`feltFrameSwitch`), `src/main.ts`: the switch's wiring, in the shape every other opt-in
  uses, including the online-room override.
- `src/game/PhysicalMode.test.ts`: the switch's own case, in the shape `riderSwitch`'s and `legPowerSwitch`'s already
  use — including the assertion that `main.ts` still pins `feltFrame: undefined` for an online room.
- `docs/research/new-rider/3.3/felt.ts` (new): step 3.3b's `deck.ts` with `FELT`, the two **shadow filters** (§2), the
  per-source low-passed split made to follow the rider's own frame, `pairFelt` rotated back into the world so every
  published column is the same quantity in both frames, the un-lagged `F_s`/`F_n` columns in newtons and degrees with
  `F_s` on `sin(rail)`, the `patchForce` re-walk and its two re-pointings with the roll/trim decomposition (§5), and
  the `handSupport` and parted-routes seatbelts (§7). Its header carries the commands.
- `docs/research/new-rider/3.3/results/33c/`: `cell-*-{world,deck}.txt` (the eighteen cells' full output), their
  eighteen `*.jsonl` (**216 rows**), `trace-tall-0-{world,deck}.jsonl` (§4b's two runs frame by frame),
  `ladder-table-33c.txt` (§2–§5's tables), `suite-33c.txt`, `canyon-bytes-33c.txt`.

## 11. For the owner, in plain words

**Two rounds ago we found your surfer's board only swings "down" about three quarters of the way when he leans, and
that the missing quarter is the slope that slides him off his feet. Last round found half of that missing quarter is
not a force at all — it is his own sense of "which way is down" being slow in the wrong way. This round fixed that
half, and measured what is left.**

Here is what was wrong, in one sentence. His sense of down averages the last tenth of a second — which is right, a real
inner ear does that — but we were doing the averaging **in the world** and then asking "where is that relative to the
board?" The board moves in that tenth of a second. So when he was capsizing at a hundred and forty degrees a second,
his sense of down was pointing where the deck *was*, and that alone was nine degrees of slope he was standing on that
no water was actually making. A real inner ear is **bolted to your head**: it averages in your own frame, so the lag
costs you less than a degree instead of nine. That is the whole change, and it is five lines. **Nothing in the water
moved.**

**It works, and I measured it the one way that cannot cheat.** I ran two copies of his sense of balance side by side on
the *same* ride — one the old way, one the new — so nothing else could differ. The old way invents **0.06 to 0.14
degrees of slope for every degree the board rolls**, in eight of the nine conditions I ran, always in the same
direction. The new way invents between nothing and two hundredths. On the run I traced frame by frame, at an *even
faster* roll, the error went from **nine degrees to half a degree**.

**And here is the part you should hear before the good news.** He still falls. Twelve of twelve, in all eighteen
conditions. What he buys is about a **third of a second** and a much deeper lean before he goes — and when he does go,
he goes **further**: the old rider fell at sixty degrees of roll, the new one holds on to ninety and past. So this
removes a lie from his inner ear; it does not give him a way to stay on. It is **worth your ride** mainly to feel
whether the extra third of a second reads as "he fought it" or as "he fell anyway, later" — and it is behind
`?feltFrame=deck`, off unless you type it, so you can switch it on and off on the same wave.

**On the decision the advisor put in front of you — aiming the floating push at the bottom of the board instead of at
the water's surface — I have one measurement that changes the question.** You objected that the same push is how the
wave shoves the board down the line, so re-aiming it changes how every spot rides. That objection stands. But the
advisor told me the along-the-board part wouldn't change at all, and **that is not true**: it drops by about half to
three quarters, because the board sits at an angle to the water fore-and-aft as well as side-to-side, and the advisor's
argument only accounted for side-to-side. The amounts are small in newtons — a few, out of about a hundred — and the
*sideways* part, the part that is actually sliding him off his feet, goes to **essentially zero**, which is the whole
point of the change.

**The surprise is the direction.** Measured as a plain horizontal push, that floating force does not get *weaker* when
re-aimed. It gets **two to three times stronger**, because a rolled board's bottom points further from straight-up
than the water's surface does. So re-aiming it is still a change you would have to re-feel every spot for — but it is
not a change that takes the wave's push away. If that is what you were worried about losing, you were worried about
the wrong sign.

# Part 28 — the hydrostatic support on the hull's own normal, built behind a switch; and the gate that withdraws it exactly where the fall is

Written 2026-11-15 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33d`, cut from `main` at
**2d37193a** (step 3.3c's merge), so Part 27 is its base. **This round ships one change to the game, opt-in and off by
default** — `?buoyFrame=hull`, **135 inserted and 5 replaced lines over six source files plus 107 and 1 in two test
files**, every behavioural line gated on the switch — plus one probe, **thirty-six** cells of twelve runs (**432 runs**),
a paired instrument on one trajectory and a frame-level population of **13,422 frames** over 108 runs.

## 0. What was built, in one line of physics

`hullForces.patchForce` resolves each wet patch's hydrostatic support along the **water-surface** normal,
`ρg(−∂η/∂x, 1, −∂η/∂z)·V` [R, `hullForces.ts:264`]. `buoyFrame: 'hull'` turns that resultant onto the **hull's** own
normal — `−patch.normal`, or the station's `band.up` on a band facet — **at the same magnitude**, by a blend
`(1 − deck) · F_d²/(1 + F_d²)` of the patch's own **dry-deck share** and a local **planing** share on the Froude
number of its immersion depth. **Nothing was added or removed: one existing force is rotated.** Its reaction on the
water is as implicit as it already was (the coupling is one-way, ruling 27's open item), the force still acts at the
same `buoyancyPoint`, so its moment turns with it, as a bottom-pressure resultant's must, and no gain, clip, threshold
or other hull term is touched.

Its warrant is the wave-shape advisor's **item 2** (`docs/research/water-physics/consult-log.md`, 2026-11-15): in
Savitsky's own method the whole load, the buoyant term included, is the bottom-pressure resultant **normal to the
bottom** — that is what makes his pressure drag `Δ tan τ` — because hydrostatic pressure on a bottom wetted on one side
under a **dry deck** has no wetted side walls to turn it vertical [S]. The shipped law does the closed-body thing, and
for a **closed** immersed volume that is correct and not a bug: by the divergence theorem the pressure on the wetted
hull alone integrates to Archimedes' vertical `ρgV`, because the waterplane that closes it carries `p = 0` and the
horizontal part is carried by the side walls — which the default flat section does not have as patches at all.

**The owner's terms, and they are met.** They were given step 3.3c's measured numbers and said: *"Yes, behind a
switch — build it opt-in and off by default, measure it, and show me an A/B on one wave. Nothing changes for me until I
say so."* So the switch is off unless typed, pinned off for online rooms (`main.ts`, asserted in
`PhysicalMode.test.ts`), and §10 proves the shipped rider unchanged against Part 27's published figures rather than
asserting it.

## 1. The five sentences the round is for

1. **It does not fix the fall.** **12 of 12 fell in every one of the thirty-six cells.** What it buys is time: the
   median fall goes **1.58 → 1.73 s** with the shipped filter and **1.76 → 2.10 s** with `?feltFrame=deck`, over 108
   runs a configuration, and the rider rolls **no shallower** (peaks 11.0–90.8 → 12.3–91.6° in the world frame,
   11.0–119.2 → 12.6–134.8° on the deck). **Later and deeper, not absent** — the same sentence Part 27 had to write.
2. **The blend is not a constant, and one of its two factors is.** Over **13,422 frames** of 108 runs the **planing**
   share is **0.9921 at the median** (min 0.6769; only **204 frames of 13,422** below 0.9) — a constant 1 for 98.5 % of
   the ride — while the **dry-deck** share runs the whole range, **0.000 to 1.000, median 0.464**. **The deck's dry
   share is the blend, and nothing else is.** 2,781 frames of 13,422 sit at 0.9 or above and 4 at exactly 0.
3. **And the gate withdraws the correction exactly as the thing it corrects grows.** The blend falls through the roll
   bands — **0.55 at 0–20°, 0.33 at 20–30°, 0.13 at 50–60°, 0.03 past 70°** (not quite monotone: 0.552 then 0.565 in
   the first two) — while the across force rises through them (§4's ladder): the switch removes **49–54 %** of
   buoyancy's in-plane across force below 20° of roll and **6–13 %** past 50°, where these falls happen. An
   **unconditional** re-pointing removes **100 %** in every band. **The fix and the fault are anti-correlated, by the
   geometry of the gate.**
4. **So the payoff is a quarter of Part 27's prediction — and so is the cost the owner objected to.** Paired on one
   trajectory, of a real in-plane residual of **0.72–17.09°** by roll band the switch removes **0.14–0.94°** (pooled
   0.331° of 1.57°, 21 %) where the unconditional one would remove **0.35–9.53°** (pooled 0.839°, 53 %). On the drive,
   the along-board component falls **5–33 %** (switch-on-shipped slope **0.666–0.954** over eighteen cells) against the
   unconditional's **45–77 %** (slope 0.182), and the world-horizontal push down the slope moves **1.6–15.8 →
   1.8–17.1 N** against the unconditional's **1.8–20.0**. **Item 2, built as physics rather than unconditionally, is a
   much smaller change than either its payoff or its cost was quoted as.**
5. **The deficit does not fall, and `buoyancy` is still the largest named in-plane term on the shipped board.** Its
   in-plane share is **0.089–0.147 °/°** over the nine world cells (against 0.111–0.181 off) and **0.061–0.119** over
   the nine deck cells (against 0.067–0.120) — the same order, and the largest named term in all **thirty-two**
   default-hull cells. (It is **not** the largest in three of the four `hull:'rail'` cells, which refutes a sentence of
   Part 27's: §7.) The measured gain deficit **rises** in 7 of 9 world cells (0.234–0.499 → 0.249–0.498) and falls in
   5 of 9 deck cells (0.141–0.291 → 0.155–0.389) — on two populations with different falls, which is why §3 is labelled
   as one and §4 is the claim.

## 1b. Against the owner's own three causes, from their ride of 2026-11-15

**Primary evidence, and it outranks every number above.** While this round was building, the owner rode
`?physical&canyonWaves=true&rider=new&feltFrame=deck` on Canyon's spilling waves and wrote: *"has some improvement in
both turning and balance. But its not playable… in Compress the surfer is not down enough, or in Snap. So the surfer
doesn't turn fast enough and its balance is fixed mid turn resulting in the same problem as before. Its improved but
the root cause is still there."* Their three causes, in their words: **slow turn / low balance / correction balance
while turning, which is incorrect.** (Their *"some improvement, still not playable"* is the ride-side of Part 27's own
**later and deeper, not absent**, which is worth recording as a confirmed prediction.)

**1. The turn, which they rank first: this change does not touch it.** `vOmega` — speed × heading rate, the
acceleration a turn actually delivers — over the six **steered** cells, 72 runs a configuration: the median goes
**1.080 → 1.015 m/s²** with the shipped filter and **1.135 → 1.135** with `?feltFrame=deck`; the per-run peak median
**10.71 → 10.68** and **13.48 → 13.38**. Cell by cell it moves **both ways** (−14 % to +27 %) with no sign. **If the
owner's first-ranked complaint is that the turn is slow, this is not the change that answers it, and I will not let
§4's force numbers imply otherwise.**

**2. Low balance, which is this change's target — and §4 is the size of it.** 0.14–0.94° off a 0.72–17.09° residual: a
fifth of it at trim, a twentieth to a sixtieth at the rolls they go over at. **Real, small, and smallest exactly where
they feel it.**

**3. "In Compress the surfer is not down enough": crouching still buys almost nothing.** Step 3.2x measured Compress
carrying the centre of mass **25–30 % lower** than tall with the two falling at the **same** rate (318 of 318 each,
median 1.02 s against 1.00) — in the sport, getting low is the main thing a surfer does to hold a turn, and in this
model it bought nothing. The coordinator asked for this prominently if the re-pointed buoyancy changed it. **It does
not.** 54 runs a stance a configuration, and **54 of 54 fall in every one of the eight**:

| configuration | Compress median fall | tall median fall | the gap | Compress roll peak | tall roll peak |
|---|---|---|---|---|---|
| world filter, shipped hull | 1.60 s | 1.54 s | **+0.06** | 11.0–70.3° | 11.0–90.8° |
| world filter, **hull buoyancy** | 1.77 | 1.64 | **+0.13** | 13.2–71.5° | 12.3–91.6° |
| deck filter, shipped hull | 1.83 | 1.69 | **+0.15** | 11.0–95.6° | 11.0–119.2° |
| deck filter, **hull buoyancy** | 2.11 | 1.98 | **+0.13** | 15.1–134.8° | 12.6–92.5° |

The gap roughly doubles in the world frame (+0.06 → +0.13 s) and **does not move** on the deck frame (+0.15 → +0.13),
on 54 runs each. **Two frames disagreeing on a 0.07 s difference is not the model starting to behave like the sport**,
and I will not report it as one. What *does* separate the stances, and did before this change, is how far they go: tall
rolls to **90.8–119.2°** where Compress stops at **70.3–95.6°**.

**4. Correction while turning — the column the coordinator asked for, and the two readings of it that do not hold.**
`AttachedRider.predictor.sent` and `.raw` are public "for probes", so the ankle command is free to read (`buoy.ts` §9).
What it supports:

- **the command is driven in a commanded turn and idle in an uncommanded roll.** Its slope on the deck's roll is
  **−0.00035 rad/° at R² 0.007** in the unsteered cell and **+0.00188 to +0.00517 at R² 0.158–0.543** in the six
  steered ones. It reaches its clamp (0.250 rad) and the clamp binds in **0–28 frames of 58–194** a run.

What it does **not** support, and both of these are mine to own:

- **"the command carries no information about the lean the player asked for."** Its R² on `leanAsked` is 0.000–0.084
  against 0.158–0.543 on the roll, which looks decisive and is not: `leanAsked` **ramps for about 0.55 s and then sits
  flat for the rest of the run** (0 → 25.00° by 0.85 s, then 25.00 for 2.3 s), so it is a near-constant regressor and
  most of that R² gap is the regressor. **Withdrawn.**
- **"the rail never reaches the lean the steer asked, and falls back while the ask is still on."** That is what one
  traced run shows between 1.0 and 2.0 s (rail 15.4 → 5.6° while the ask is pinned at 25°) and **the population
  refutes it**: over 72 runs a configuration the rail **peak** is **1.7–3.1× the ask** at the median and **60–71 of
  72** runs pass 90 % of it. The peak is in the capsize, so "peak" is the wrong statistic for "does it hold the turn".
  **Withdrawn, and it was a window promoted to a run.**

**So what the next round needs is a specified measurement this round cannot give**: the rail against the ask in a
**window** — after the steer's 0.55 s ramp and before the capsize — plus the predictor's command over that window with
the output pinned to zero as its control, which is 3.2w's own comparison (it found the shipped predictor does no better
than zero, 0.63–3.08 s against 0.77–1.70). Two instruments that look like they answer it do not, and that is the most
useful thing I can hand over about it.

## 2. The blend, and why this one

The advisor's spec is *"while the deck is dry and the board planes, blending to the surface normal as it floats or
submerges"*, and the brief's instruction was to **measure what fraction of the ride each regime covers before choosing
the criterion**, because our draft is **0.085 m on a 0.0667 m board** (`predictiveBalance.ts:211`, 7.5 m/s) against
Savitsky's 0.056 m, which puts the undisturbed waterline over the deck.

Two factors, both local to the patch, both measurable, neither fitted:

- **the dry-deck share, `1 − deck`.** `patchForce` already computes `deck = wettedShare(surfaceY − deckY) · deckWet`.
  Where the deck is under the surface line the slab is closed above and the vertical answer is the right one. This is
  also what stops a **capsized** board being driven under by its own buoyancy: inverted, its bottom face is clear of
  the water and its deck face is beneath, so `deck → 1`, the blend → 0, and the hull normal — which points **down** —
  is never followed. `hullForces.test.ts` asserts exactly that case.
- **the planing share, `F_d²/(1 + F_d²)` on `F_d = |v_rel|/√(g·d)`** at the patch's own immersion depth `d`. 0 at rest,
  so a board floating heeled on flat water keeps Archimedes and does not acquire a sideways push; ≈0.985 at 7.5 m/s and
  0.085 m. There is no constant in it to tune: it is the dimensionless group of Savitsky's own buoyant term
  (`0.0055 λ^2.5/C_V²`) with the beam replaced by the local depth.

**Measured, over 13,422 frames of 108 runs on the nine shipped-trajectory cells:**

| factor | median | min | max | frames below 0.9 |
|---|---|---|---|---|
| planing `F_d²/(1+F_d²)` | **0.9921** | 0.6769 | ≈1 | **204 of 13,422** |
| dry-deck `1 − deck` | **0.464** | 0.000 | 1.000 | 8,935 |
| the blend | **0.461** | 0.000 | 1.000 | 8,936 (and **2,781 at ≥0.9**) |

**So the planing factor is a constant and is reported as one**, as the brief required: it is 1 for the whole ride and
only dips in the capsize's last frames. It still earns its place in the law, because it is what makes the switch right
at rest and in a wipeout, and because the sensitivity it exposes is the walk's own seatbelt (§10). **The dry-deck share
is the design, and it is the thing the model gets least well**: the draft that sets it is 1.5× Savitsky's.

**The hack is not shipped and is named as one.** The brief's narrow variant — keep `buoyancy`'s magnitude and its
along-face thrust and resolve *only* its across component on the hull normal — is a hack, the advisor called it one,
and there is nothing in it to measure: its across component is 0 and its along component is the shipped one, **both by
construction**, which the `bh` and `bn` columns below already print. The switch's behaviour is the physical version.

## 3. The thirty-six cells — a population comparison, labelled as one

Part 27's nine cells (the Canyon-matched `FaceWater` 1.4 m / 16° / 5.7 m/s, two stances × six entry speeds, 9 s a run,
twelve runs a cell), run at both filter frames **and** both hull laws, because the brief's instruction was to measure
with the filter both ways: they are the two halves of one deficit, and the owner will want to know whether they add.

| configuration | fell | median fall | fall range | roll peak | ends past the feet |
|---|---|---|---|---|---|
| world filter, shipped hull | 108/108 | 1.58 s | 0.50–5.33 s | 11.0–90.8° | 0.091–0.750 m |
| world filter, **hull buoyancy** | 108/108 | **1.73** | 0.52–**6.65** | 12.3–91.6° | 0.105–0.706 m |
| deck filter, shipped hull | 108/108 | 1.76 | 0.83–5.65 | 11.0–119.2° | 0.115–1.251 m |
| deck filter, **hull buoyancy** | 108/108 | **2.10** | 0.87–**7.93** | 12.6–134.8° | 0.000–1.054 m |

**They add.** The filter alone buys 0.18 s of median fall, the hull law alone 0.15 s, and the two together **0.52 s** —
more than the sum, on a population comparison and not a paired one. The per-cell medians rise in **8 of 9** cells with
the hull law on at either filter frame. **No fall was prevented in any of the thirty-six cells.**

And three things in this table are **not** results:

- **the speed at the fall falls** (6.21 → 5.82 m/s in the world, 5.56 → 5.15 on the deck) and that is not lost drive:
  the falls come later, so the board has had longer to decelerate, and §4's own drive columns say the opposite about the
  force. Two populations.
- **the drift peak reaches 93.6° and 123.8°** with the switch on. Those are in and after the capsize, as Part 27's
  0.8–69.3° were, and they are not a controlled slide.
- **the gain deficit** (world 0.234–0.499 → 0.249–0.498; deck 0.141–0.291 → 0.155–0.389) is a regression over a
  different trajectory with deeper rolls. §4 is the paired measurement and §4 is the claim.

## 4. The paired instrument: what the switch does to the force, on one trajectory

Step 3.3c's technique, because the switch changes the ride. After every step the probe re-walks the board's patches off
the live instance's own **last-substep** arrays and calls **`hullForces.patchForce` itself** on them three times: with
`hullBuoyancy = 0` (**shipped**), with `hullBuoyancy = 1` (**the switch**, so the blend is read out of the shipped law
and not re-derived) and once re-pointed **unconditionally** on the hull normal at the same magnitude (Part 27's own
convention, so this round reproduces its table). The difference between the first two is the switch's own change, with
no trajectory confound at all.

**The roll ladder, 13,422 frames of 108 runs, the nine cells on the shipped trajectory.** `buoyancy`'s across force in
the plane of the deck, median |N| by roll band:

| roll | frames | the blend | shipped | **the switch** | unconditional | removed by the switch | by the unconditional |
|---|---|---|---|---|---|---|---|
| 0–10° | 6683 | 0.552 | 4.4 N | **2.3** | 0.02 | **49 %** | 100 % |
| 10–20° | 4103 | 0.565 | 13.3 | **6.1** | 0.03 | **54 %** | 100 % |
| 20–30° | 1339 | 0.329 | 39.9 | **27.0** | 0.06 | **32 %** | 100 % |
| 30–40° | 637 | 0.254 | 54.5 | **40.4** | 0.09 | **26 %** | 100 % |
| 40–50° | 299 | 0.185 | 72.2 | **58.4** | 0.13 | **19 %** | 100 % |
| 50–60° | 220 | 0.127 | 87.1 | **75.6** | 0.12 | **13 %** | 100 % |
| 60–70° | 114 | 0.087 | 102.8 | **94.2** | 0.16 | **8 %** | 100 % |
| 70–140° | 27 | 0.034 | 115.9 | **109.3** | 0.31 | **6 %** | 100 % |

The blend's own regression on `|roll|` is **−0.0096 per degree at R² 0.149** — low, and quoted as low: roll is not the
only thing setting the immersion, so the **band medians are the statement and the line is not**. What the bands say is
not in doubt: the blend is 0.55 at trim and 0.03 past 70°, and the force it is meant to remove is 26× larger there.

**And the same thing in the units the body feels.** The real in-plane residual `atan(F_s/F_n)` off the **total** water
force, and what each re-pointing takes off it, median by band over the same 13,422 frames:

| roll | the residual, ° | **the switch removes** | the unconditional would remove | the switch, m/s² on 75.54 kg |
|---|---|---|---|---|
| 0–10° | 0.72 | **0.14** | 0.35 | 0.023 |
| 10–20° | 1.89 | **0.39** | 0.99 | 0.070 |
| 20–30° | 4.81 | **0.85** | 2.89 | 0.153 |
| 30–40° | 5.80 | **0.94** | 3.94 | 0.171 |
| 40–50° | 8.56 | **0.88** | 5.09 | 0.163 |
| 50–60° | 10.28 | **0.68** | 5.49 | 0.138 |
| 60–70° | 11.92 | **0.60** | 6.79 | 0.120 |
| 70–140° | 17.09 | **0.29** | 9.53 | 0.036 |

Pooled over all 13,422 frames: the residual **1.57°**, the switch takes **0.331°** (21 %) and the unconditional
**0.839°** (53 %). **The switch's correction peaks at 0.94° around 30–40° of roll and then falls away**, while the
residual keeps climbing to 17.09°.

**There is a negative feedback in the gate by construction, and I could not measure it.** Turning the support onto the
hull normal moves part of it out of the vertical, so the board should sit a little deeper, wet more deck and re-point
less — a self-limiting law. On the shipped cell the blend's per-run median goes **0.402–0.998** on the shipped
trajectory to **0.272–0.998** on its own, which is the predicted direction; but over the nine cells the low end of that
range **falls in five and rises in four** (0.259 → 0.282, 0.317 → 0.333, 0.380 → 0.401, 0.863 → 0.870). **So the
feedback is in the law and is not in the measurement**, on two populations whose falls differ, and I will not claim it
either way.

**The positive control that makes the gate the mechanism and not a guess.** With the deadrise band on (`hull:'rail'`,
not the shipped board) the deck's dry share is **0.868–1.000** per-run median instead of 0.10–1.00, and there the
switch removes **96 %** of the across force — pooled |median| **1.17 → 0.05 N**, switch-on-shipped slope **0.601**,
against 0.748–0.886 on the eight default-hull cells. **Where the deck is dry the switch is the unconditional
re-pointing. Where it is not, it is a fraction of it.**

Per-run medians, the shipped trajectory, nine cells (the shipped and unconditional columns reproduce Part 27 §5 to the
digit):

| cell | across: shipped → **switch** → unconditional, N | at the fall | along-board: shipped → **switch** → uncond. | switch slope |
|---|---|---|---|---|
| 0 (shipped) | −25.5–0.2 → **−15.0–0.0** → −0.1–0.0 | −94.0–−4.6 → **−83.6–0.0** → −0.2–0.1 | 1.3–9.9 → **1.1–6.8** → 1.1–2.5 | 0.748 |
| +0.25 into | −33.9–−0.4 → **−21.3–0.0** → 0.0–0.0 | −78.4–65.4 → **−69.6–62.5** → −0.9–0.7 | 0.7–17.5 → **0.6–12.5** → 0.6–3.9 | 0.821 |
| +0.5 into | −45.9–−1.1 → **−31.2–0.0** → −0.1–0.0 | −150.5–−8.2 → **−150.3–−6.8** → −0.1–0.4 | 2.4–16.0 → **1.9–10.9** → 1.0–3.5 | 0.886 |
| +1 into | −43.0–−0.5 → **−29.9–0.0** → −0.1–0.0 | −194.0–−12.0 → **−188.5–−9.0** → −0.2–0.3 | 2.1–12.4 → **1.6–8.4** → 1.2–3.0 | 0.879 |
| −0.25 against | −8.6–12.0 → **−3.2–6.6** → 0.0–0.0 | −45.6–184.2 → **−36.7–177.7** → −0.2–0.8 | 3.9–15.7 → **2.7–10.8** → 1.7–4.0 | 0.834 |
| −0.5 against | −6.7–22.1 → **−2.0–12.5** → 0.0–0.0 | −15.4–146.5 → **−10.6–133.1** → −0.5–0.3 | 3.9–14.1 → **2.6–9.5** → 1.4–3.9 | 0.807 |
| −1 against | 0.2–18.0 → **0.0–10.5** → 0.0–0.0 | 22.5–200.9 → **18.7–186.5** → −0.3–0.4 | 4.9–13.2 → **3.7–9.0** → 1.2–3.5 | 0.796 |
| particle | −35.7–3.6 → **−23.9–2.7** → −0.1–0.0 | −116.6–6.5 → **−108.9–6.4** → −0.6–0.4 | 6.5–56.4 → **4.0–50.7** → 1.9–4.1 | 0.808 |
| `hull:'rail'` | −5.6–0.3 → **−0.5–0.0** → 0.0–0.0 | −48.1–−1.8 → **−36.9–0.0** → −0.2–0.0 | 0.1–4.3 → **0.1–2.9** → 0.1–2.8 | 0.601 |

## 5. The drive — the owner's own objection, sized for the switch rather than for the unconditional version

Part 27 found that an **unconditional** re-pointing does not weaken the wave's push: as a world-horizontal force
`buoyancy` **strengthens**, 2.9–15.8 → 11.0–39.3 N per-run median, and its down-slope component with it. **The switch
does the same thing about a third as hard**, measured on the shipped cell with the deck filter — the same twelve runs
Part 27 §5 published that row from — as per-run medians:

| | shipped | **the switch** | unconditional |
|---|---|---|---|
| world-horizontal magnitude | 2.9–15.8 N | **7.4–19.1** | 11.0–39.3 |
| down the water's own slope | 1.6–15.8 | **1.8–17.1** | 1.8–20.0 |
| the same at the fall | 0.0–9.1 | **0.0–10.8** | 0.0–23.9 |
| along-board (the push down the line) | 2.0–10.1 | **1.7–7.4** | 0.9–2.1 |
| the deck normal's own load | 20.2–87.8 | **21.4–91.8** | 26.2–100.6 |

**And the no-hidden-motors question, answered rather than waved at.** Rotating a force at constant magnitude does
change the work it does — `F · v` depends on the direction, and pretending otherwise would be the dodge. What it cannot
do is make energy from nothing: it is the same water force, acting at the same point, with its reaction on the water
as implicit as it already was (ruling 27's one-way coupling, unchanged). The measurable question is whether the ride
runs away, and it does not: the speed at the fall **falls**, 6.21 → 5.82 m/s in the world frame and 5.56 → 5.15 on the
deck, over 108 runs a configuration — later falls on slower boards, not faster ones. Two populations, so it is a
negative result and not a number.

So the recalibration the owner objected to in 3.2s is real but small: the along-board component falls **5–33 %**
(slope 0.666–0.954 over the eighteen world and deck cells) where the unconditional version cut it **45–77 %**
(slope 0.182), and the horizontal push grows at the low end rather than shrinking — by **3.3 N** at the top of the
per-run median range where the unconditional version grows it by **23.5 N**. **On this measurement the switch redirects
a few newtons out of about a hundred; it does not take the wave's push away, and it does not take a third of it
either.**

## 6. `F_s` in newtons and `F_s/F_n` in degrees, un-lagged — the advisor's instructed columns

The bank gain stays retired. These carry no 0.1 s in them; the pool is the whole cell, 46–339 frames a run.

| cell | `F_s/F_n` °, \|median\|: world off → **on** | deck off → **on** | `F_s` per unit sin(**rail**), N: world off → **on** |
|---|---|---|---|
| 0 (shipped) | 0.78 → **0.93** | 1.46 → **1.31** | −79.7 → **−115.6** |
| +0.25 into | 1.28 → **0.90** | 1.46 → **1.04** | −228.2 → **−244.5** |
| +0.5 into | 2.01 → **1.53** | 2.40 → **1.86** | −189.4 → **−171.5** |
| +1 into | 2.39 → **2.00** | 3.01 → **2.52** | −117.4 → **−128.4** |
| −0.25 against | 1.40 → **1.27** | 1.61 → **1.37** | −199.3 → **−196.4** |
| −0.5 against | 1.77 → **1.70** | 2.06 → **1.77** | −191.8 → **−186.7** |
| −1 against | 2.77 → **2.64** | 2.90 → **2.85** | −171.5 → **−179.4** |
| particle | 0.87 → **0.78** | 1.33 → **1.08** | −100.6 → **−119.9** |
| `hull:'rail'` | 0.79 → **0.85** | 2.08 → **2.28** | −263.5 → **−235.8** |

`F_s/F_n` falls in **7 of 9** world cells and **8 of 9** deck cells, by **0.03–0.54°** — a tenth to a third of the
residual, and the same size §4's paired ladder gives. **`F_s` per unit `sin(rail)` does not move in one direction**
(−79.7…−263.5 → −115.6…−244.5): it is a pooled slope on a changed trajectory and it is printed here because the
advisor's instruction was to keep the column in newtons so it is never chained to a pooled `sin(roll)` slope again, not
because it is a result.

## 7. What I refuted

- **Part 27's own payoff figure, as a statement about a shippable change.** 3.3c measured the across force going
  **−45.9…+22.1 N → −0.1…0.0 N** and called it "item 2's whole payoff". That is true of an **unconditional**
  re-pointing and this round reproduces it to the digit — but the unconditional version is not physics: it drives a
  capsized board under by its own buoyancy and pushes a heeled board sideways at rest. The physical version removes
  **49–54 %** of that force below 20° of roll and **6–13 %** past 50°. **The payoff I inherited was measured on a
  version that cannot ship.**
- **The advisor's own predicted outcome for item 2** — "predicted gain 0.95–1.00, residual tilt 0.4–1.3° instead of
  5.4–16.4°, the body's forcing 1.26–2.69 → ~0.1–0.3 m/s²". Built, the residual is **0.72–17.09°** by roll band and the
  switch takes **0.14–0.94°** off it. The residual past 40° of roll is **8.6–17.1°**.
- **The brief's own worry that the blend would be a constant at one end.** It is not: **median 0.461, 0.000 to 1.000**,
  2,781 frames of 13,422 at ≥0.9. But **one of its two factors is** — the planing share is **0.9921** at the median
  with 204 frames of 13,422 below 0.9 — so *"while the board planes"* is not a condition on this ride at all, and the
  whole gate is *"while the deck is dry"*.
- **That buoyancy would stop being the in-plane term that matters.** With the switch on it is still the **largest named
  in-plane term in all thirty-two default-hull cells** (0.089–0.147 °/° in the world frame, 0.061–0.119 on the deck).
- **And a sentence of Part 27's own, which this round's probe refutes off the same instrument that reproduces Part 27's
  table to the digit.** Part 27 §3 wrote that `buoyancy` "is still the largest named in-plane term in every cell of
  both frames". It is not, in the `hull:'rail'` cell: at `BUOY=off` on the deck frame `fins` reads **0.123 °/°**
  against buoyancy's **0.070**, and in the world frame with the switch on `pressure` reads **0.150** against **0.099**.
  That is consistent rather than surprising — a deadrise section has a real in-plane `pressure` share, Part 26's own
  positive control measured it at 0.149 — but the claim should have carried "on the shipped board", and now does.
- **The feared direction of the cost, again, and now for the shipped switch.** The world-horizontal push **rises**
  (2.9–15.8 → 7.4–19.1 N) and the down-slope component rises with it (1.6–15.8 → 1.8–17.1). **Re-pointing does not
  remove the drive at either strength.**
- **My own first instinct about where to put the planing test.** A per-board planing fraction off `savitskyLift` would
  have been a single number for the whole hull; the gate that matters is **per patch**, because the rockered board's
  nose patches are dry-decked while its mid patches are not, and a board-level number cannot see that. The measured
  dry-deck share runs 0.000–1.000 **within a single run**.

## 8. What I will not claim

- **I will not claim this fixes the fall.** 12 of 12 fell in all **thirty-six** cells. It buys **0.15–0.34 s** of
  median fall and rolls no shallower.
- **I will not claim the hull cells' deficits against the shipped cells' as a paired result.** They are two populations
  with different falls, rolls and roll rates; §3 says so and §4 is the only paired measurement in the round.
- **I will not claim the roll ladder's linear slope.** `hullShare` on `|roll|` is −0.0096 per degree at **R² 0.149**.
  The band medians are the result; the line is not one.
- **I will not claim the walk's blend is the engine's to the last digit.** `patchForce` needs the patch's relative
  velocity, and the engine's own per-patch scratch does not survive the step, so the walk rebuilds it from the board's
  **post-step** velocity: one substep of acceleration, 1/(60·32) s. The sensitivity is printed —
  `d(planing)/d(ln v) = 2·planing·(1 − planing)` is **0.0046–0.023** at the median and **0.104** at its worst frame, so
  a 1 % velocity error is a hundredth of that in the share. The *engine's* own blend, in the `BUOY=hull` cells, carries
  none of this.
- **I will not claim the walk's buoyancy is the ledger's.** It is the **last substep's** and the ledger is a 32-substep
  mean: **10.6–48.7 %** per run, exactly as Part 27 measured and demonstrated by driving the substep count to 1.
- **I will not claim this is the right draft.** The gate is the deck's dry share and the draft that sets it is
  **0.085 m on a 0.0667 m board** against Savitsky's 0.056 m and Oggiano 2017's 0.182 m² immersed where ours runs
  0.35 m². **The switch's reach is set by a number the model over-predicts by about half**, and a board that floated at
  Savitsky's draft would re-point more of its support. That is the next thing to question, not this law.
- **I will not claim the band facet's direction is derived.** On a rail-band facet the law takes the station's own
  `band.up`, which is step 3.3c's convention and keeps this round's figures comparable with Part 27's — but a
  near-vertical band facet is the one surface on this hull that genuinely *is* a wetted side wall closing the immersed
  volume, so its own normal may be the better answer. **It is a choice, it is named in the code, and nothing on the
  shipped board turns on it**: the default flat section has **0 band facets** in all eight default-hull cells against
  43–53 with `hull: 'rail'`, which is off in the game.
- **I will not claim the deadrise cell as the shipped board.** `hull:'rail'` is off in the game and TN 4187 predicts
  what 3.3a measured about it. It is in the round as the **positive control** on the gate and as nothing else.
- **I will not claim the two switches' 0.52 s as additive physics.** 0.18 + 0.15 = 0.33 against a measured 0.52, on
  three population comparisons and no paired one.
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed and not paddled in, the first ~0.17 s of
  every run carries a contact transient, and every span above is a whole population — twelve runs a cell, two stances
  × six entry speeds, one face slope — and **not** a confidence interval. **Do not assume the measured fall is the
  owner's fall**, and do not quote Part 27's corrected caveat the other way either: the drift peak over all 108 runs a
  configuration reaches **0.7–123.8°**, not "inside 5°".

## 9. Where the authority is, unchanged

Late in a capsize none of this is the authority. The ankle's ceiling is `F_n × 0.130 m` and `F_n` is the same quantity
whose collapse inflates the demand; with the switch on `F_n` at the fall still runs down to **7.3 N** in the deck cells
and the deepest rolls reach **134.8°**. **The hip is the authority there, and a re-pointed buoyancy changes only how
early it is needed** — by the 0.14–0.94° §4 measures, which is a fifth of the residual at trim and a twentieth to
a sixtieth of it at the rolls the body goes over at.

## 10. Seatbelts

- **The new behaviour ships off, and the shipped rider is proved unchanged rather than asserted.** Every behavioural
  line is gated on `hullBuoyancy > 0`, which `BoardBody` sets to 0 without the option, and `patchForce`'s own test
  asserts the default is bit-for-bit identical. **At `BUOY=off` the probe reproduces Part 27's whole table to the
  digit, in both filter frames**: the falls **0.77–1.70 / 1.05–5.08 / 0.97–3.23 / 0.93–2.42 / 1.53–4.63 / 1.48–5.33 /
  1.55–3.92 / 0.87–3.30 / 0.50–1.00 s** in the world and **1.10–1.93 / 1.17–4.98 / 1.22–3.48 / 1.18–2.85 / 1.58–4.85 /
  1.63–5.65 / 1.57–4.02 / 1.25–3.47 / 0.83–1.27** on the deck; the measured deficit **0.234 / 0.442 / 0.337 / 0.243 /
  0.334 / 0.347 / 0.326 / 0.237 / 0.499** and **0.141 / 0.244 / 0.226 / 0.184 / 0.234 / 0.291 / 0.274 / 0.224 /
  0.164**; the force's own share **0.111 / 0.345 / 0.239 / 0.158 / 0.232 / 0.217 / 0.194 / 0.167 / 0.478** and
  **0.458 / 0.317 / 0.266 / 0.236 / 0.369 / 0.399 / 0.245 / 0.362 / 0.445**; `buoyancy`'s own in-plane share
  **0.165 / 0.132 / 0.140 / 0.150 / 0.133 / 0.116 / 0.111 / 0.181 / 0.153** and **0.067 / 0.111 / 0.117 / 0.100 /
  0.120 / 0.097 / 0.110 / 0.119 / 0.070**; `F_s` pooled median **−7.2 / −11.1 / −23.2 / −33.3 / +2.4 / +6.1 / +9.3 /
  −8.6 / −7.2 N** and **−17.9 / −11.2 / −28.5 / −40.3 / +2.8 / +9.4 / +14.1 / −15.0 / −20.1**; `F_s/F_n` |median|
  **0.78 / 1.28 / 2.01 / 2.39 / 1.40 / 1.77 / 2.77 / 0.87 / 0.79°** and **1.46 / 1.46 / 2.40 / 3.01 / 1.61 / 2.06 /
  2.90 / 1.33 / 2.08**; Part 24's and 25's shared columns (bank peak **20.7–65.7°**, roll peak **20.9–63.0°**, rail
  peak **10.9–62.9°**, drift peak **1.9–4.9°**, `latPair` mean **1.58–3.47**); and Part 27 §5's own unconditional
  columns, including the world-horizontal **2.9–15.8 → 11.0–39.3 N** and down-slope **1.6–15.8 → 1.8–20.0** (0.0–9.1 →
  0.0–23.9 at the fall).
- `./node_modules/.bin/tsc --noEmit -p .`: **exit 0**, read from `tsc`'s own exit status on its own line, never through
  a pipe. `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`: **exit 0**. (The worktree's `node_modules` is a
  symlink to the main checkout's, because `npx tsc` in a tree without one prints an install banner and has exited **0**
  on this project before.) The probe was type-checked separately on a throwaway project extending the root's options
  with `types: ["node"]` and an absolute `typeRoots`: **exit 0**, and `--listFiles` confirmed `buoy.ts`,
  `hullForces.ts` and `BoardBody.ts` were all in it rather than trusting a bare pass.
- The rider, board, HUD and runner test files, `PhysicalMode` (`src/game/`), `RideHud` (`src/ui/`), `SurfZoneRunner`
  and `SprayCloud` (`src/wave/`) included — `SurfZoneRunner` is outside the merge suite, so a red there is news:
  **58 files passed, 790 tests passed and 21 expected fail (811), vitest exit 0**, 94 s. That is **six more passing
  tests** than 3.3c's 784/805 and they are this round's own: five cases in `hullForces.test.ts` (the default
  bit-for-bit, the hull-normal limit at the same magnitude, the floating case, the **capsized** case, and the blend's
  magnitude on the way) and one in `PhysicalMode.test.ts` for `?buoyFrame=hull` — the parsing, every spot's config
  through `surfZoneConfigFor`, and **the online-room pin read out of `main.ts`, so removing that pin fails here**.
  `src/wave/SurfZoneSimulation.test.ts` is deliberately not in it (`c2-step5g.md` §7.4), closed by reading.
  `results/33d/suite-33d.txt`.
- **The Canyon byte check, all four hashes, fresh spin-ups on the tree that merges**, with Part 25 §5.5's wrapper
  written out, the grid read before the hashes and Part 27's kept-`.sea` trap checked by reading the "spun up on the
  CPU in … s" line: `results/33d/canyon-bytes-33d.txt`.
- **The deletions column, checked before the push**: `git diff --numstat origin/main HEAD`, deletions read off per
  file — **6 in all, 5 of them in shipped source**, and every one a line replaced in place: `hullForces.ts` **1** (the
  `patchForce` signature line, extended), `BoardBody.ts` **1** (the `patchForce` call line, extended), `main.ts` **2**
  (the online-room override line and its comment line), `SurfZoneRunner.ts` **1** (the spread line),
  `PhysicalMode.test.ts` **1** (the import line, extended). `PhysicalMode.ts`, `RideSession.ts`,
  `SurfZoneSimulation.ts` and `hullForces.test.ts` are **+14 / +3 / +9 / +78 with 0 deletions**, and the whole diff is
  **+242 / −6** over nine files in `src/`. No file and no block removed. It has caught a silent revert on ten consecutive rounds and `merge-base --is-ancestor` has caught none.
- No force was added or removed; one existing force's **direction** is rotated behind a switch that is off by default.
  No gain, clip or threshold changed; no other hull term touched; nothing the online rooms share moves, because
  `main.ts` pins `buoyFrame: undefined` for them as it does every other dev switch.

## 11. Files (3.3d)

- `src/physics/hullForces.ts`: `HULL_BUOYANCY` and its note (the derivation above), `PatchForce.hullShare` (a
  diagnostic, always 0 without the switch), `patchForce`'s ninth parameter `hullBuoyancy = 0`, and the one gated block
  that turns the support.
- `src/physics/BoardBody.ts`: `BoardBodyOptions.buoyFrame?: 'hull'`, the `buoyHull` flag and the call that passes it.
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts` (`buoyFrameSwitch`), `src/main.ts`: the switch's wiring, in the shape every other opt-in
  uses, including the online-room override.
- `src/physics/hullForces.test.ts`, `src/game/PhysicalMode.test.ts`: the six new cases.
- `docs/research/new-rider/3.3/buoy.ts` (new): step 3.3c's `felt.ts` with `BUOY`, the walk's **third** resolution
  through `patchForce` itself, the regime columns (`hullShare`, `dryShare`, `planeShare`, `hullShareHigh`,
  `planeSens`), the predictor's own command (§1b.4, with the two readings of it that do not hold written into the field's
  own doc comment), and §8–§9's report. Its header carries the commands.
- `docs/research/new-rider/3.3/results/33d/`: `cell-*-{world,deck}-{off,hull}.txt` (the thirty-six cells' full output),
  their thirty-six `*.jsonl` (**432 rows**), `frames-world-off.jsonl` (**13,422 frames**, §2's and §4's population —
  trimmed to the eleven columns those two tables are computed from, because the full record is 42 MB; every number in
  §2 and §4 was re-derived from the trimmed file and is unchanged, and `ladder-table-33d.txt` carries the command that
  rebuilds the full one),
  `trace-tall-0-world-{off,hull}.jsonl` (§4's traced run frame by frame),
  `trace-steered-05-world-off.jsonl` (§1b.4's steered run, 191 frames, with `leanAsked`, `rail` and the predictor's
  command — the file that both refutes its own first reading and shows why), `ladder-table-33d.txt` (§1b's tables too),
  `suite-33d.txt`, `canyon-bytes-33d.txt`.

## 12. For the owner, in plain words — and the shot list

**You said: build it behind a switch, measure it, show me an A/B on one wave, and nothing changes until I say so. That
is what this is.** `?buoyFrame=hull`. Off unless you type it, and off for everybody in an online room.

**What it does.** Your board's float — the push the water gives it for being in the water — currently points *straight
up the way the water's surface is tilted*. The advisor's point was that under a planing board whose deck is out of the
water, that push really points **square out of the bottom of the board**, like everything else the bottom feels. That
is Savitsky's own convention and it is almost certainly right. **But it is only right while the deck is dry** — once
water closes over the deck the old answer is the right one again, and if we ignored that, a board that flipped over
would be pushed *down* by its own float. So the switch fades between the two.

**And here is the finding, which is not the one I expected.** The fade is the whole story. Measured over thirteen
thousand frames: while your board sits near flat, about **half** of its float gets re-aimed. By the time it is leaned
over past fifty degrees — which is where your surfer actually falls — only **a tenth** of it does, because by then the
deck is under water. **The correction backs off exactly as the thing it is correcting grows.** Last round's number for
this fix — "it removes essentially all of the sideways force" — was measured on a version that re-aims the float *all
the time*, and that version is not physics: it would push a flipped board under.

So the honest size, in your terms: of the sideways slope the surfer is standing on, which runs from under a degree when
he is flat to about **seventeen degrees** when he is going over, this switch takes off about **a fifth while he is
flat, a twentieth past fifty degrees of lean, and a sixtieth past seventy**. In absolute terms its correction peaks at
about **one degree** around thirty to forty degrees of lean and then falls away.

**Does he stay on? No.** Twelve of twelve fell in all thirty-six conditions I ran. What he gets is time — about
**a sixth of a second** on its own, and **half a second** together with last round's inner-ear fix, which do add. He
does not lean any less far before he goes.

**And against the three things you named after your last ride** (*slow turn, low balance, correction while turning*),
measured rather than guessed — §1b has it in full:

- **the turn: this does nothing for it.** The turn's own acceleration over the six steered conditions is 1.08 → 1.02
  and 1.14 → 1.14, and cell by cell it moves both ways. **You ranked the slow turn first and this is not the change
  that answers it.** Say the word and the turn is the next round rather than the draft.
- **low balance: this is that, and it is small.** A fifth of the sideways slope at trim, a twentieth to a sixtieth
  where you actually go over.
- **"in Compress the surfer is not down enough": still true.** Crouching carries him 25–30 % lower and still buys him
  **0.06 to 0.15 s** — the same before and after this change, 54 runs each way. In the sport getting low is *the*
  thing you do to hold a turn. **In the game it is still nearly free of consequence**, and that gap is bigger than
  anything this switch moves.
- **"its balance is fixed mid turn": I could not measure it, and I tried twice.** Both readings that looked like they
  showed it fell over when I checked them against all the runs instead of one — the write-up says exactly how, so the
  next round does not spend the same hour. What I can say is that the balance controller is **idle when the board
  rolls on its own and busy when you ask for a lean**, and that it runs into its own limit on 0–28 frames of a run.
  That smells like what you are feeling. It needs the measurement I have specified, not another guess.

**And the thing you were worried about is small.** You objected that this same float is how the wave shoves the board
down the line, so re-aiming it changes how every spot rides. It does change it, but by much less than the version last
round measured: the push along the board drops by **5 to 33 %** instead of **45 to 77 %**, and the horizontal push down
the face gets slightly *bigger*, not smaller. A few newtons out of about a hundred.

**What I think is actually wrong, now that this is built.** The switch is gated on whether the deck is dry, and our
board floats about **half again as deep as it should** — eight and a half centimetres of draft on a six-and-a-half
centimetre board, where the textbook says five and a half. That is why the deck goes under as soon as he leans. **The
draft is the next thing to question, not this law.**

### The shot list for your A/B

One wave, Canyon, `?canyonWaves=true` and `?rider=new` as usual. Same wave, same entry, four runs:

1. `?rider=new` — your baseline.
2. `?rider=new&buoyFrame=hull` — this round. **Look for: does the board feel like it holds a rail better going into a
   bottom turn, before the lean gets deep?** That is where the correction is biggest (half the float re-aimed under
   twenty degrees of lean).
3. `?rider=new&feltFrame=deck` — last round, on its own.
4. `?rider=new&feltFrame=deck&buoyFrame=hull` — both. **This is the one with the longest measured ride.** Look for
   whether the extra half-second reads as "he fought it" or "he fell anyway, later".

And two things to feel for that the probe cannot judge:

- **the drive.** Trim along the face in 1 and 2 and tell me whether the board runs the same. The numbers say it
  should, very nearly; a few newtons is what the switch moves, and the one who can feel a few newtons is you.
- **the flip.** Take a wipeout on purpose in 2 and watch the board once it is upside down in the water. The switch is
  built so that a flipped board is never pushed under by its own float, and there is a test that holds that — but a
  test is not a wipeout.

---

# Part 29 — the probe that could not see a fall, the turn we already have, and the knees' travel priced where the leg is

Written 2026-11-15 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33f`, cut from `main` at
**058588b9** (step 3.3e's merge), so Part 28 and `3.3/stance-depth.md` are its base. **This round ships one change to
the game, opt-in and off by default** — `?kneeRoom=achieved` — plus one read-only probe getter, one new probe
(`3.3/turn.ts`), a corrected citation in `AttachedRider`, and **96 runs** over twelve cells, four stances and two
riders, with a 48-run A/B of the switch on top.

Tags as in 3.2 and 3.3: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source; **[I]** my
inference from a stated model.

## 0. The five sentences the round is for

1. **Step 3.3e's probe could not see a fall, and 96 of 96 runs in this round fall.** `AttachedRider.separate` sets
   `attached = false` and leaves `phase` and `upright` exactly as they were [R], so a **balance separation while
   standing** moves neither; 3.3e's fall test was `!upright || phase !== 'standing'`, which **never fires for one**.
   Its *"84 of 84 runs stood"* is the test, not the rides. On the identical cell and movement, **48 of 48 runs fall on
   `?rider=new` at 1.08–4.15 s and 48 of 48 on the default rider at 1.55–7.07 s** [M]. Once the rider is off, `prepare`
   is no longer called at all, so every rider column **freezes at its last value** while the probe keeps reading the
   heading of a riderless board — and **22.7–92.7 % of 3.3e's own 0.5–9 s window is those dead frames** [M]. Every
   other probe in this folder (`across.ts`, `deck.ts`, `felt.ts`, `buoy.ts`, `3.2/turnpath.ts`) tests `!attached`;
   **`3.3/stance.ts` is the only one that does not**, so the trap is step 3.3e's alone.
2. **So the brief's build half is refuted at the measured level, and resized rather than deleted.** Paired tall →
   Compress over twelve cells, the hips drop **0.067–0.299 m in 12 of 12 on `?rider=new`** against **0.296–0.300 m in
   12 of 12** on the default rider [M] — **22–100 % of the button's designed 0.30 m, not the 0.03–0.12 m (a tenth to a
   third) 3.3e reported.** The loss is real and it tracks the balance's knees cell by cell (0.285–0.299 m where
   `knees` ≤ 0.04, 0.067–0.168 m where it is ≥ 0.6), and its cause is one line of the design table: **`stanceRoom(0)`
   leaves the knees 0.30 m, which *is* `CROUCH_DEPTH`**, so a saturated correction reaches the button's own depth while
   still being granted the tall stance's hip range and free arms.
3. **And the brief's measure half is refuted the other way: we already have the turn, on the rider the owner rides.**
   On `?rider=new` at a **full stick**, pooled over four stances, the heading rate runs at a median of **57.7 °/s** in
   a **median arc of 1.00** — one monotone turn, no wag — and the 18 runs of 48 whose arc is ≥ 0.99 put **37.2–88.1° on
   the board in 0.87–2.33 s** [M]. The best is **87.5° in 1.117 s**, against Forsyth et al. 2024's **99 ± 4° in
   0.96 ± 0.04 s** on 835 turns [S]. **Our turn is within about 15 % of a measured professional bottom turn's clock.**
   3.3e's 2.30–3.53 s is the **default** rider's, which the owner does not ride, and its 2.97–3.17 s for the new rider
   was read off a board the rider had already left.
4. **What we do not have is a rider who survives it, and the trade is monotone in the stick.** Over 48 new-rider runs,
   as the stick goes 0.25 → 0.5 → 0.75 → 1 the median rate goes **14.2 → 22.8 → 41.3 → 57.7 °/s**, the median arc
   **0.54 → 0.61 → 0.99 → 1.00**, and the median time on the board **3.07 → 2.76 → 1.71 → 1.43 s** [M]. Of the 18
   monotone arcs, the rider comes off **0.22–0.73 s after the turn ends** in every one. **The rate and the arc are
   bought with the ride**, and that is the owner's own third cause — *"its balance is fixed mid turn"* — arriving as a
   number.
5. **The brief's named mechanism is refuted, and its named candidate switch does nothing.** The lean cap — `most =
   planing ? min(MAX_BANK, atan(v²/(g·TURN_RADIUS))) : 0`, which falls as the square of the speed and is **exactly
   zero off the plane** [R] — binds in **0.00–0.01** of commanded frames in the default rider's tall and Compress runs
   and **0.00–0.13** in the new rider's, with the board off the plane in **0.00–0.10**; the board's forward speed
   through the water holds at **7.0–10.4 m/s** at the median, so **the turn does not scrub itself out of its own
   ceiling on this cell** [M]. (It *is* live in Snap: off the plane in up to **0.19** of frames, cap binding in up to
   **0.23**, the speed through the water reaching 0 — §5.) And `snapLegs: 'drive'`, measured against a plain `snap`
   control this round added for the purpose, is **indistinguishable from it on every column** [M]: §6.

## 1. The instrument, and the trace that found it

The round began by reproducing 3.3e's table byte-for-byte on the rebuilt probe (tall hips **0.48–0.73 m**, Compress
**0.44–0.48**, tall asking 0.09–0.30 m of crouch and getting 0.05–0.29) [M]. The new probe then traced one Compress
run frame by frame, and at **t = 2.217 s** four unrelated quantities froze at once and stayed frozen for 6.8 s: the
speed through the water at 6.450 m/s, the lean cap at 43.528°, the lean asked at 43.238°, the balance's knees at 0.505,
the leg's rest at 0.304 m (`results/33f/33f-dead-frames-trace.tsv`). A board decelerating from 5.75 to 2.61 m/s cannot
hold a constant forward speed through the water, so `prepareBank` was not running. `upright` was `true`, `phase` was
`'standing'`, `freeBody` was `1`, the sample under the board was wet and inside the domain — and `attached` was
**false**, with `separation` reading **`'balance'`** [M].

```
  prepare()      →  if (this.attached)  …   (BoardBody.substep)
  separate(cause) →  this.attached = false;  // phase and upright untouched
  banking         →  this.upright && this.phase === 'standing' && this.banked
```

**That is the whole of it.** A balance fall takes the rider off the board and leaves the two fields 3.3e tested
untouched, so its loop ran on to 9 s every time. The consequences, in order of how much they cost:

- **`stance.ts`'s stance medians are dominated by dead frames.** The dead share of its 0.5–9 s window is
  **0.571–0.918 (median 0.709)** for the new rider's tall runs and **0.590–0.927 (median 0.790)** for its Compress
  runs; on the default rider **0.367–0.769** and **0.227–0.418** [M]. In those frames the leg's rest holds whatever the
  correction had it at when the rider let go — on a tall run, a deep balance crouch — for the rest of the window, which
  is why 3.3e's tall column reads 0.48–0.73 m where the same runs' **live** frames read 0.518–0.780 (§3).
- **Its "to 85°" column is not a turn time wherever the fall came first.** Reached **before** the fall: default rider
  12 of 12 in Compress and 11 of 12 tall (3.3e's clock for that rider **survives**, and that is said as plainly as the
  rest); new rider **2 of 12 in Compress, 3 of 12 tall** [M].
- **Its 84 of 84 is not a fall population and its peak-rate pool is not one rider's.** §5.

**What this does not touch.** The game itself checks both (`this.phase !== 'standing' || !this.attached`, and
`const standing = this.phase === 'standing' && this.attached` [R]), so this is a probe trap and not a bug in the
shipped rider. And it does **not** reach back into Parts 25–28: their probes test `!attached`.

## 2. What was built, in one line of physics

`stanceRoom(depth)` is the design's table of **what a stance leaves the balance** — the knees' travel left, the hip's
range, the arms free or committed — and `prepareLeg` reads it at the depth **the player commands**, with its own
comment stating the consequence: *"The balance's own knee drop is not counted: it spends the stance's travel"* [R].
`kneeRoom: 'achieved'` reads the **knees' entry only** at `max(commanded, the leg's own depth)` instead. **No force is
added, removed or re-pointed; no hull law, no spot's drive and nothing the online rooms share is touched**, and the
hip's range and the arms are deliberately left on the commanded stance so the switch moves exactly one quantity.

**Why that is the honest key and not a knob.** The table's rows are a body's own geometry: a body whose knees are
already bent 0.30 m has the room of a body bent 0.30 m, whoever bent them. Read at the commanded depth, a **standing**
rider at `knees` = 1 rests its leg at `0 + 1 × stanceRoom(0).kneeTravel` = **0.30 m = `CROUCH_DEPTH`** — the button's
whole depth, reached by the correction, at none of the button's price (`stanceRoom(0)` still grants ±1.2 rad of hip and
free arms). Read where the leg is, the drop has a **fixed point**: `d = kneeTravel(d)` iterates to **0.1696 m** [I],
so the correction keeps **57 %** of its travel and stops short of the stance. **Nothing is deleted.** `kneeRoom.test.ts`
asserts the two table values, the fixed point, that the default rider is byte-identical with the switch on, and that
the new rider is byte-identical wherever `knees` never leaves 0.

**What the knee drop is for, since the brief asked and 3.3e's §1.4 bears on it.** In *our* model it is not a static
balance term — 3.3e's arithmetic is right that `h` is absent from `m·g·(d − x)` — but it is a **dynamic margin** term
twice over: `humanBalance`'s capture point is `px = offset.x − height · nx` and its `ω₀ = √(g/h)` [R], so a shorter leg
both shortens the lever on the filtered vertical and pulls the capture point in. That is 3.3e's own rows 2 and 3
(lateral tolerance ∝ 1/h, velocity tolerance ∝ 1/√h), and it is why this round prices the drop rather than removing it.

## 3. The contrast, paired, twelve cells — and the figure that was an artefact

The water and the movement are 3.3e's, so the columns are comparable: the **Canyon-matched** `FaceWater` (1.4 m, 2.6 m
deep, 16°, 5.7 m/s, PR #223's fit to Canyon B's arm — **a fit to Canyon, not Canyon**), the board placed 0.75 face
lengths onshore of the crest 45° off the fall line, the stance held and the stick over from the first frame until the
board is 85° round, then centred. **Twelve cells** (3 entry speeds × 4 sticks) a stance a rider, 9 s each, the stance
columns from 0.5 s — `stance.ts`'s own window, so that the **only** difference left is the fall test.

| cell (entry, stick) | `knees` tall | hips tall, m | hips Compress, m | **Δ, m** | hips tall with **`kneeRoom=achieved`** | **Δ with it** |
|---|---|---|---|---|---|---|
| 0, 0.25 | 0.000 | 0.780 | 0.481 | **0.299** | 0.780 | 0.299 |
| 0, 0.5 | 0.009 | 0.777 | 0.480 | 0.297 | 0.777 | 0.297 |
| 0, 0.75 | 0.612 | 0.647 | 0.479 | **0.168** | 0.686 | **0.207** |
| 0, 1 | 0.630 | 0.620 | 0.479 | **0.141** | 0.668 | **0.189** |
| 1.5, 0.25 | 0.016 | 0.776 | 0.480 | 0.296 | 0.776 | 0.296 |
| 1.5, 0.5 | 0.180 | 0.731 | 0.470 | 0.261 | 0.737 | 0.266 |
| 1.5, 0.75 | 0.978 | 0.518 | 0.451 | **0.067** | 0.618 | **0.162** |
| 1.5, 1 | 0.997 | 0.575 | 0.454 | **0.121** | 0.615 | **0.156** |
| 3, 0.25 | 0.039 | 0.765 | 0.480 | 0.285 | 0.766 | 0.286 |
| 3, 0.5 | 0.317 | 0.692 | 0.476 | 0.216 | 0.708 | 0.232 |
| 3, 0.75 | 0.654 | 0.613 | 0.462 | **0.151** | 0.660 | **0.195** |
| 3, 1 | 0.960 | 0.518 | 0.451 | **0.067** | 0.621 | **0.166** |

**Read it three ways.**

1. **The defect is real and it has a law.** Where the balance's knees are effectively down at nothing the button
   delivers its full travel (0.285–0.299 m in the four cells with `knees` ≤ 0.04, against the default rider's
   0.296–0.300 m in 12 of 12). Where they saturate it delivers **0.067–0.168 m**. The relation is monotone in `knees`
   across the twelve cells [M], and the mechanism is read in the code, not inferred: `stanceRoom(0).kneeTravel` **is**
   `CROUCH_DEPTH`.
2. **But it is half the size 3.3e reported, and the difference is the dead frames.** 3.3e's figure — *"Compress adds
   only 0.03–0.12 m in 4 of 6 paired runs"*, which its own §0.4 calls *"the one actionable defect of the round"* — is
   **0.067–0.299 m in 12 of 12** when the frames after the rider has come off are dropped. Nothing else changed: same
   water, same movement, same inputs, same 0.5 s window, the same probe reproducing 3.3e's published table to the digit
   before the test was corrected. **57–92 % of 3.3e's tall sample is a frozen leg on a riderless board.**
3. **The switch does what it was built to do, and only that.** The contrast **grows in 9 of 12 cells and is unchanged
   in the 3 where `knees` ≈ 0** — which is the right shape for a change that prices a correction — and the span goes
   **0.067–0.299 → 0.156–0.299 m**: the floor goes from **22 % to 52 %** of the designed 0.30 m. **Compress itself is
   untouched** (0.451–0.481 m either way, every cell within 0.005 m): what moves is the **standing** stance, which
   comes back up from 0.518 to 0.615–0.621 m in the saturated cells — so the surfer also stops looking permanently
   crouched when nothing is pressed. And the measured standing depth at `knees` = 1, **0.159–0.165 m**, lands within
   0.01 m of the fixed point predicted from the table alone (0.1696 m), which is the mechanism confirming itself.

**And the cost, stated where it would be.** The correction loses 43 % of its travel, so the obvious price is falling
sooner. Over the same 24 runs the fall is **1.117–4.15 s with the switch off and 1.067–4.15 s with it on**, medians
**2.63 and 2.59 s**, later in 6 of 24 and earlier in 10 [M]. **I will not call that a cost and I will not call it
free**: it is a 0.04 s difference in a median over 24 runs that already fall 24 of 24, which is inside this cell's own
spread. The turn columns do not move either (Compress's mean rate 7.9–55.9 → 7.9–53.3 °/s, the arc's span identical,
85° reached by the same 2 of 12 at the same 2.967 and 3.167 s). **The switch restores a contrast. It does not fix the
turn and it does not fix the fall, and nothing here should be read as claiming either.**

## 4. The turn, measured as a shape — and the arc we already have

3.3e's handover was *"we have the rate in spikes, not in an arc"*. The probe measures that directly: **`arc`** is the
net heading change over the total absolute heading travel through the **commanded** turn (1 is one monotone turn, 0 a
wag), and **`mean`** is the net heading over that turn's own duration — the rate a turn actually delivers, which is the
quantity Forsyth's 99° in 0.96 s is. Both are restricted to the frames where the stick is still asking, because pooling
the drift after the stick centres deflates the arc and fills a spike census with spikes that ended because the turn was
over.

| | to 85° | `mean` rate | 0.25 s peak | peak/mean | `arc` | against the turn |
|---|---|---|---|---|---|---|
| **[S] Forsyth 2024, bottom turn** (n = 6, 835 turns) | **99 ± 4° in 0.96 ± 0.04 s** | **103 °/s** (1.80 rad/s) | 109 °/s (1.9 ± 0.1) | **1.06** | — | — |
| **[M] default rider, Compress** (12) | 1.72–4.85 s, **12 of 12** | 18.6–59.3 | 45.8–81.9 | 1.13–2.59 | **0.92–1.00** | 0.00–0.11 |
| **[M] default rider, tall** (12) | 1.70–4.43 s, 11 of 12 | 1.9–62.6 | 46.7–88.6 | 1.42–24.63 | 0.19–1.00 | 0.00–0.39 |
| **[M] new rider, Compress** (12) | 2.97–3.17 s, **2 of 12** | 7.9–55.9 | 45.7–142.4 | 1.70–12.74 | 0.20–1.00 | 0.00–0.33 |
| **[M] new rider, tall** (12) | 1.67–3.13 s, 3 of 12 | 4.7–65.7 | 61.4–199.7 | 1.67–21.38 | 0.12–1.00 | 0.00–0.29 |
| **[M] default rider, Snap** (12) | 2.88–4.55 s, 4 of 12 | 1.9–45.9 | 36.2–186.7 | 3.11–31.61 | **0.10–0.71** | 0.25–0.46 |

**Four things come out of that table, and the fourth is the round's answer.**

1. **"Spikes, not an arc" is false for the stances the owner turns in and true for Snap.** The default rider's Compress
   runs are **0.92–1.00** on the arc with **0.00–0.11** of their frames turning the wrong way: one clean monotone turn,
   twelve times. Snap is **0.10–0.71** with **a quarter to nearly half** of its frames turning against the turn — and
   that is where 3.3e's spiky picture lives.
2. **The one-frame peak was not the artefact I expected.** Smoothed to 0.10 s and 0.25 s — what a board IMU would
   report — the peak holds at 70–95 % of the single-frame figure in every stance [M], so 3.3e's peak rate is not frame
   noise. **The pooling is the problem instead**: 3.3e's 72.7–228.6 °/s pools Snap, `snapdeep` and both riders.
   **Taken apart, 0 of 24 default-rider runs in tall or Compress reach Forsyth's 109 °/s peak, and 0 of 12 Compress
   runs reach even its 103 °/s *mean*.** On that rider we have neither the peak nor the mean, and 3.3e's *"our peak
   rate is not the problem"* does not hold for it.
3. **The arc's shape is the right way to say what is slow about the default rider.** A real bottom turn runs at
   essentially its own peak for the whole 0.96 s (peak/mean **1.06**); ours in Compress runs at **1.13–2.59**, i.e. the
   arc spends most of itself at 40–90 % of a peak that is already 0.42–0.75 of the measured one. Its mean rate is
   **0.32–1.03 rad/s** against 1.80.
4. **And on the rider the owner actually rides, the turn is already there.** Pooled over the four stances, 12 runs a
   stick:

| stick | median `mean` rate | median `arc` | median time on the board | net heading, span |
|---|---|---|---|---|
| 0.25 | 14.2 °/s | 0.54 | **3.07 s** | 7.5–89.3° |
| 0.5 | 22.8 | 0.61 | **2.76 s** | 3.7–87.3° |
| 0.75 | 41.3 | 0.99 | **1.71 s** | 4.4–87.3° |
| **1** | **57.7** | **1.00** | **1.43 s** | 37.2–88.1° |

   **The rate quadruples and the arc closes to monotone exactly as the time on the board falls by half.** Of the 48
   runs, **18 have an arc ≥ 0.99**, and they put **37.2–88.1° on the board in 0.87–2.33 s** — the fastest **87.5° in
   1.117 s**, which is Forsyth's clock within about 15 % and the owner's own *"around two seconds turning"* with room
   to spare. **In every one of the 18 the rider comes off the board 0.22–0.73 s after the turn ends.** On the default
   rider the same ladder is nearly flat (median rate 19.5 → 32.7 °/s, median fall 5.33 → 3.87 s): it turns slowly and
   stays on. **The two riders fail in opposite ways, and the one the owner rides does not fail on the turn's clock.**

**The caveat this rests on, said before anyone quotes the number.** `mean` is measured over the commanded turn, which
ends at the fall, so a run that falls early shows only its opening and a correlation between "fast" and "falls soon"
could be that selection. Two things answer it and neither is a defence of the correlation: the ladder above is on the
**stick**, which is an input and not an outcome, and the 18 monotone runs reached **37–88° of net heading**, which is a
turn and not an opening. **I claim the dose-response on the stick. I do not claim a per-run correlation.**

## 5. What ends a spike, and the candidate that is refuted

The census: a spike is a maximal run of frames whose 0.10 s rate is over half that run's own peak, at least 0.05 s
long, inside the commanded turn; at the frame each one ends on, five named terminators are read. **The brief's named
candidate was the lean cap**, and it is the one thing here that is cleanly refuted.

`prepareBank` caps the lean at `most = planing ? min(MAX_BANK, atan(v²/(g·TURN_RADIUS))) : 0`, `TURN_RADIUS` = 4.5 m
[R]. It falls as the square of the speed (36° at 5.7 m/s, 20° at 4, 11° at 3) and is **exactly zero off the plane**,
which latches off under `PLANING_DROP` = 3 m/s and back on over 4 — so a turn that scrubs itself under 3 m/s is
allowed no lean at all. On this cell it does not happen. Over the commanded turns:

| | board off the plane | cap under the ask | cap under the rail | speed through the water, least |
|---|---|---|---|---|
| **[M]** default rider, tall / Compress | 0.00 / 0.00 | 0.00–0.01 / 0.00 | 0.00–0.10 / 0.00 | 3.25 / 4.08 m/s |
| **[M]** new rider, tall / Compress | 0.00–0.10 / 0.00 | 0.00–0.11 / 0.00–0.13 | 0.00–0.17 / 0.00–0.12 | 0.70 / 3.01 m/s |
| **[M]** default rider, Snap / `snapdrive` | 0.00–0.19 / 0.00–0.17 | 0.00–0.23 / 0.00–0.11 | 0.00–0.19 / 0.00–0.18 | 1.33 / −0.01 m/s |

**The board does not slow out of its own ceiling on this cell**: the forward speed through the water holds at
7.0–10.4 m/s at the median in tall and Compress, the cap sits at 48–68°, and the ask (12.5–50°) is under it in all but
a few per cent of frames. **The cap is live in Snap** — off the plane in up to 19 % of frames there, with the speed
through the water reaching 0 — which is worth carrying forward, but Snap is not the stance the owner's bottom turn is
in. **I will not claim the cap is harmless in general**; on this cell, in these stances, it is not what takes the turn
away.

**What the census does show is unsatisfying and is reported as such.** Of the default rider's **23** Compress spikes
(median duration 0.62–1.43 s, median gap 0.47–2.50 s), **none** ends on any of the five: not the plane, not the cap
under the rail, not the rail past `RAIL_BITE`, not the stick centring, not the knees. With the arc at 0.92–1.00 that is
the honest reading — **there is no "between the spikes" on that rider**; the rate simply rises and falls inside one
smooth arc, and a 50 %-of-peak threshold cuts a bell into pieces. **The spike census answers its question by
dissolving it**, and §4's peak/mean is what replaces it.

**One column that does separate the stances, offered as a measurement and not yet a mechanism.** `unwind` counts
commanded frames where the rail is coming **down** at 2 °/s or more while the stick is still asking for 5° more lean
**and** the cap is above the rail — so neither the player nor the ceiling can be what took it. Default rider, paired
over twelve cells: tall **0.03–0.22** with a rail median of 4.3–41.5° and a rail/ask of 1.02–5.78; Compress
**0.10–0.37** with a rail median of **2.7–27.8°** and a rail/ask of **0.61–1.45** [M]. **Compress carries a lower rail
in 12 of 12 and unwinds more often in 10 of 12.** That is a candidate for 3.3e's unfound mechanism for why the crouch
costs rate — 3.3e looked at the roll and rail **peaks** and got 4 of 6, which it rightly refused to call a finding; the
rail **held**, and the unwind, separate the stances. **It is one round's column on one cell, nothing in the code is
named as its cause, and Part 28 §1b already withdrew a neighbouring claim ("the rail falls back while the ask is on")
for being one trace. I am not promoting this one either. It is the next thing to measure.**

## 6. `snapLegs: 'drive'`, against a control: nothing

3.3e named the owner's *"crouching, not compressing"* as mapping onto the ski and skate finding — crouch into the arc,
extend through it — which is what `snapLegs: 'drive'` was built for, and asked for it in the ladder. It is in, **and so
is a plain `snap` control this round added for the purpose**, because `snapdrive` also turns Snap on (which changes the
turn radius to `SNAP_RADIUS` = 2.2 m and the rail range) and comparing it with Compress would have confounded the drive
with Snap itself.

| | `arc` | `mean` rate | 0.25 s peak | to 85° | hips, m |
|---|---|---|---|---|---|
| **[M]** default rider, `snap` (12) | 0.10–0.71 | 1.9–45.9 | 36.2–186.7 | 2.88–4.55 s, 4 of 12 | 0.48–0.49 |
| **[M]** default rider, `snapLegs: 'drive'` (12) | 0.17–0.72 | 3.2–43.7 | 45.9–199.3 | 3.00–4.18 s, 4 of 12 | 0.49–0.58 |
| **[M]** new rider, `snap` (12) | 0.05–1.00 | 1.9–77.8 | 63.8–195.9 | 1.33–3.02 s, 2 of 12 | 0.46–0.48 |
| **[M]** new rider, `snapLegs: 'drive'` (12) | 0.06–1.00 | 0.4–75.2 | 62.6–197.8 | 1.35–3.03 s, 4 of 12 | 0.49–0.53 |

**On every column the two overlap, and the drive's mean rate is higher in 5 of 12 cells on the default rider and 7 of
12 on the new one — which is a coin.** The one thing it reliably does is what it is built to do: the hips sit 0.01–0.10 m
higher through the turn, because the legs extend. **So the ski/skate sequence, as this switch implements it, buys
nothing measurable in the turn on this cell.** That is not a refutation of the ski finding; it is a refutation of this
switch as a way of getting it, and the difference matters because the real version of "extend through the arc" would
have to be paired against something — a reaction — and `SNAP_DRIVE_DEPTH` only lets the rest length out.

## 7. What I will not claim

- **I will not claim the turn is fast enough.** §4's 87.5° in 1.117 s is **one run of 48**, and the stance-by-stance
  medians at a full stick (57.7 °/s) are still about **half** Forsyth's mean. What I claim is the **ladder** — the rate
  and the arc rising monotonically with the stick while the time on the board halves — and that the *gap on the clock*
  is smaller than 3.3e's 2.3–3.5 s made it look, because that figure is the other rider's.
- **I will not claim the switch improves the ride, or that the owner will feel it.** It restores **0.035–0.099 m** of contrast in the
  nine cells where the balance's knees fire, and the worst cell's 0.067 m becomes 0.166 m. The turn and the fall do not move. Whether a stance that changes by 16 cm instead of
  7 reads as *"down enough"* is the owner's to say and nobody else's, and **no bot ride is offered as evidence of feel
  anywhere in this document.**
- **I will not claim the knee drop's balance payoff is now priced correctly, only that it is priced in one currency.**
  The hip's range and the arms are still granted at the commanded stance while the leg is deeper than it, which is the
  same inconsistency this switch fixes for the knees. Extending it to the whole room is a bigger change with a
  feedback through `strategies`' own `hip` term, and it is deliberately not in this round.
- **I will not claim the fall population moved.** 24 runs, 24 falls either way, medians 2.63 and 2.59 s. That is not a
  measurement of a cost; it is a measurement that says this cell cannot see one.
- **I will not claim the cap is harmless.** §5 refutes it **on this cell, in tall and Compress**. In Snap the board is
  off the plane in up to 19 % of commanded frames and the speed through the water reaches 0.
- **I will not claim the unwind is a mechanism** (§5), and I will not re-promote Part 28's withdrawn rail claim.
- **I will not re-open 3.3e's depth conclusions.** Its Seixas conversion, its stance-gauge cross-check and its finding
  that our Compress is deeper than every measured surfing posture bar an elite aerial landing are **not** touched by
  the instrument error: those are depths read in frames the leg was being driven in, and the Compress column barely
  moves when the dead frames are dropped (0.44–0.48 → 0.451–0.481 m). **It is the *tall* column and the fall
  population that the test cost it.**
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed rather than paddled in, and every span above
  is **the whole population of twelve runs**, not a confidence interval.

## 8. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- The probe type-checked separately on a throwaway project extending the root's options with `types: ["node"]` and an
  **absolute** `typeRoots`:
  **exit 0**, and `--listFiles` confirmed it covered `docs/research/new-rider/3.3/turn.ts`,
  `src/physics/AttachedRider.ts` and `@types/node`.
- The worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and the exit codes above
  are `tsc`'s own, read on their own line and never through a pipe.
- `vitest run src/physics`: **55 files, 600 passed, 21 expected fail** — the new `kneeRoom.test.ts` (5) included.
  `vitest run src/game src/scene/rig`: **70 files, 729 passed**, `PhysicalMode.test.ts` 96 of 96 with the switch's own
  test. `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts` (the HUD among them): **56 files, 482
  passed, 2 expected fail**. `vitest run src/wave/SurfZoneRunner.test.ts`, which is outside the merge suite and was run
  by hand: **43 of 43** — so a red there would be news, as `runner-test-file-excluded` has it. `src/wave/SurfZoneSimulation.test.ts` is closed by reading, as `c2-step5g.md` §7.4 requires: this round
  touches no solver, no wave and no spot file.
- **The shipped rider proved unchanged, against a published baseline rather than by assertion.** `3.3/stance.ts` —
  3.3e's own probe, untouched by this round — was rebuilt and re-run on this branch for **both** riders and **all
  seven** stances with the shipped defaults, and **every number it prints reproduces `stance-depth.md`'s published
  table**: new rider tall hips **0.48–0.73** and Compress **0.44–0.48**, `snapdeep` **0.34–0.36**; default rider tall
  **0.78–0.82**, Compress **0.48** with 85° in **2.30–3.53 s, 6 of 6**, `snapdeep` **−0.05–0.37**; and the pooled yaw
  peak **72.7–228.6 °/s** to the digit, whose two ends are the default rider's *crouch* (72.7) and the new rider's
  `snapdrive` (228.6) — which is §4.2's point about the pooling, arriving from 3.3e's own instrument. So the gated line
  and the read-only `leanProbe` change nothing on the shipped path, and `kneeRoom.test.ts` holds that for the default
  rider and for the new rider wherever `knees` never leaves 0.
- **The Canyon byte check** (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, **fresh** spin-ups into new state paths),
  with the brief's three checks read rather than assumed — the wrapper sets `globalThis.location = { search:
  '?canyonWaves=true' }` (a prepended line on the bundle, because a dynamic import makes rolldown split the chunk), the
  grid line read, and the "spun up on the CPU in … s" line read so that no kept `.sea` was imported:
  - Canyon B (`?canyonWaves=true`), **400 × 451 = 180,400 cells**, spun up on the CPU in **44.3 s**: snapshots
    **a367d938f15fa934**, state **9e5831f80e38abd9** — **the same as main.**
  - the default Canyon, **400 × 507 = 202,800 cells**, spun up on the CPU in **54.4 s**: snapshots
    **ea3d57a4d49f4b48**, state **a1a2555739210f96** — **the same as main.**

  All four match, which they must: this round touches no solver, no wave, no spot file and no hull law, and the two
  rider lines it does touch are gated or read-only. The raw output is `results/33f/33f-canyon-byte-check.txt`.
- **The deletions column**, read before the push and after the rebase check (`git diff --stat origin/main HEAD`):
  **16 files, 1,382 insertions and 9 deletions** — and **all nine deletions read, one by one**: four are the
  `CARVE_FLEX` comment lines §10 rewrites, one is `prepareLeg`'s own `asked = Math.min(…)` line replaced by the gated
  version, and four are long single-line lists (`PhysicalMode.test.ts`'s import, `main.ts`'s comment and its room
  overrides, `SurfZoneRunner.ts`'s rider-options spread) replaced in place with the switch added. **Nothing was
  inherited and nothing was reverted**: `origin/main` is still **058588b9**, the branch's own base, so unlike 3.3e
  there was no mid-round merge to rebase onto — and the column was read rather than that being assumed.

## 9. Files (3.3f)

- `docs/research/new-rider/3.3/turn.ts` — the probe. Read-only: it drives the shipped inputs and reads public fields.
- `docs/research/new-rider/3.3/results/33f/` — `33f-new-shipped.jsonl`, `33f-old-shipped.jsonl`,
  `33f-new-kneeroom.jsonl` (48 rows each), `33f-tables.txt`, and `33f-dead-frames-trace.tsv`, the trace of §1 where
  the rider's columns freeze at 2.217 s.
- `src/physics/AttachedRider.ts` — the `kneeRoom` option and its one behavioural line in `prepareLeg`; the read-only
  `leanProbe`; and the `CARVE_FLEX` citation correction (§10).
- `src/physics/kneeRoom.test.ts` — the switch's own test (5).
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts`, `src/main.ts`, `src/game/PhysicalMode.test.ts` — the switch's wiring, pinned off for
  online rooms and asserted there.

## 10. The citation correction, as the brief instructed

`CARVE_FLEX`'s comment justified its 0.12 m as *"the deep end of the surf stance's half-squat (knees flexed 30–80°,
Borgonovo-Santos et al. 2021; de Sousa 2022's preparation, knees 90–110°)"*. **Both attributions were wrong in
different ways and the comment now says what the number actually rests on.** The 30–80° is **Everline 2007**
(*Strength Cond J* 29(3):32–40), *quoted* by Borgonovo-Santos as their reference — a practitioner review whose own
title calls it a qualitative assessment, with no population, protocol or datum, which step 3.3e could not obtain.
Borgonovo-Santos measured a **laboratory pop-up landing** (n = 23) and **no riding stance at all**, and their own knee
figures carry no stated datum. de Sousa 2022 is a **master's thesis observation tool validated by seven coaches with no
surfers measured** — a coaches' consensus, cited as if it were a measurement, and that clause is removed. The Weiß
et al. 2025 citation in the same comment **is** correct and now carries its population. **So a number load-bearing in
our physics traces to an unsourced practitioner claim plus our own stance map**, and the comment says so.

## 11. For the owner, in plain words

**Two things, and the first one is good news.**

**You already have the turn.** On your rider (`?rider=new`), with the stick all the way over, I measured the board
putting **87 degrees of heading on in 1.1 seconds, in one clean sweep** — that is your "around two seconds", and it is
within about 15 % of what instrumented professionals do on a real bottom turn. The "2.3 to 3.5 seconds" from last
round was measured on the **old** rider, which you do not play, and the new rider's number from last round was read off
a board **you had already fallen off**, which brings me to the second thing.

**Last round's probe could not see you fall.** When our surfer loses his balance the code takes him off the board but
leaves two flags saying "standing, upright", and last round's test looked at exactly those two flags. So it reported
"84 of 84 runs stood" when in truth every run falls, and it kept measuring the board drifting along with nobody on it —
**between 57 % and 93 % of what it averaged was dead time.** I fixed that and re-ran everything: **96 runs out of 96
fall.** On your rider, between **1.1 and 4.2 seconds** in.

**And that is the real problem, in one line: the harder you turn, the sooner you come off.** Quarter stick: slow turn,
3.1 seconds on the board. Full stick: four times the turn rate, a perfectly clean arc — and **1.4 seconds** on the
board. In every one of the eighteen clean turns I measured, he fell **within 0.2 to 0.7 seconds of finishing it**. So
it is not that he turns too slowly. It is that he cannot survive the turn he already does. That is your own words — *"its
balance is fixed mid turn"* — arriving as a number, and it is the thing I would go after next.

**On "not down enough", you were right and I had the size wrong.** His standing stance really was sinking on its own,
because his balance system is allowed to bend his knees by **exactly** the amount the Compress button is for — so
pressing it added almost nothing. Last round put that at 3 to 12 cm; measured without the dead frames it is **7 to
30 cm** against the old rider's steady 30. I built a switch, **`?kneeRoom=achieved`**, that makes his balance pay for
its own knee bend out of the room it is using, so it stops reaching all the way down to the Compress depth by itself.
With it on, the button's worst case goes from **7 cm to 17 cm**, Compress itself is unchanged, and his **standing**
stance stands back up (from 52 cm to 62 cm over the board) — so he should also stop looking permanently crouched when
you are not pressing anything.

**It is off until you type it, and it does not fix the turn or the falling.** I measured that too, and I would rather
tell you than let you find out: the turn's numbers do not move, and the falls come at the same times (median 2.63
seconds without, 2.59 with, on 24 runs that all fall either way).

**Your shot list**, on Canyon with `?canyonWaves=true`:

1. `?physical&canyonWaves=true&rider=new&feltFrame=deck` — **unchanged from what you rode last time.** Ride it once so
   the next three have a baseline in your hands and not just in mine.
2. Add `&kneeRoom=achieved`. **Press and release Compress in trim, before you turn at all.** The question is only
   whether the stance *changes* visibly now. Ignore the turn for this one.
3. Same, and watch him **standing with nothing pressed** while he gets bounced about. He should stand taller than
   before. If he looks stiff or starts falling in places he did not, that is the switch's cost and I want to hear it.
4. Then turn hard with it on, full stick. **I expect no difference in the turn and no difference in the falling.** If
   you feel one, my 24-run A/B missed it and that is worth more than the A/B.

**One warning about what I did not do.** I did not go after the falling, because the brief for this round was the
stance and the turn's clock, and because I would rather hand you a measured diagnosis than a second change I could not
attribute. The falling is now the whole of the problem, and it is a bigger job than a switch.

# Part 30 — the fall is not after the turn, the board goes over, and the in-plane column is three forces on the wrong normal

Written 2026-11-15 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33g`, cut from `main` at
**cc3f6c59** (step 3.3f's merge), so Part 29 is its base. **This round ships no behavioural change to the game.** It
adds two read-only report fields to `CaptureState`, one probe (`3.3/fall.ts`), two off-by-default env switches to the
published 3.3b instrument (`3.3/deck.ts`), one test, and **180 runs** over ten arms.

Tags as in 3.2 and 3.3: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source; **[I]** my
inference from a stated model; **[A]** arithmetic on measured numbers, labelled as such.

The owner's re-aim arrived mid-round and the round is reported against it: *"at this low speed, when the surfer gets
the wave, on a compress close to the board stance, a professional surfer — which is what I'm trying to simulate — is
never going to fall on a turn."* Taken as a ruling, that makes 96 of 96 falls a **falsified model**, so the question is
not what could save him but **what is pushing him over that should not be there**. §4 and §5 answer that one in
newtons, by source.

## 0. The six sentences the round is for

1. **The post-turn timing does not exist.** Part 29's *"in every one of the 18 monotone runs the rider comes off
   0.22–0.73 s after the turn ends"* is `fellAt − turnFor`, and `turnFor` is a **duration** over a window that opens at
   the probe's own 0.2167 s mount guard — so the published span is the gap **plus 0.2167 s**. Recomputed from 3.3f's
   own 48 rows, the gap is `fellAt − (first.t + turnFor)` = **−0.001 to 0.517 s, median 0.000, and 13 of the 18
   monotone runs are exactly 0.000** [M]: the fall **is** the last commanded frame. Over all 48, **37 of 48 are
   exactly zero**. Only the **5** monotone runs that actually reached 85° and centred the stick have a gap at all, and
   theirs is 0.100–0.517 s. **He comes off during the turn**, and the round's brief question — why *after* rather than
   *during* — was the frame error's question, not the rider's. My own probe reproduces it independently: 19 of 24.
2. **What he comes off is not a balance task he failed; it is a board that has gone over.** At a full stick, over
   `deck.ts`'s twelve runs (two stances × six entry speeds, the deck-frame filter the owner rides with), the **lean
   anyone asked for peaks at 40.8–50.0°** and the **deck's roll at the fall is 63.7–91.4° from the world vertical in
   12 of 12**, with roll rates peaking at **146.7–353.7 °/s** [M]. `MAX_BANK` is 70° and `RAIL_RANGE` is 50° [R], so
   the last 14–41° of roll is asked for by nobody. On the mixed-stick population (`fall.ts`, 24 runs, three entry
   speeds) the same column reads **2.0–89.2°**, over 50° in 15 of 24 and rising with the stick (0.25 → 9.3–53.8°,
   1 → 25.2–89.2°).
3. **And the across force that is in the plane of the deck — the one the advisor's test says must be zero for a force
   locked to the deck normal — is, in the main, three water entries resolved on the water's surface normal rather than
   the hull's.** Pooled over the commanded run at a full stick with the deck filter, 12 runs, `F_s` is **−43.1 N** on `F_n` 718.4 N (a −3.4° residual tilt), and per source, in
   newtons: **buoyancy −34.88 (81.0 % of it)**, radiation −6.32 (14.7 %), addedMass −4.47 (10.4 %), rails −4.11,
   `pressure` **−2.47 (5.7 %)**, friction −0.46, fins **+6.09** (the other way) [M]. At the fall itself `F_s` is
   **−20.5 to −182.9 N** and **buoyancy is the largest single in-plane entry in 12 of 12 runs** (−37.3 to −165.3 N).
4. **Buoyancy, radiation and added mass are all applied along the WATER-SURFACE normal; `pressure` is the only one of
   the four applied along the hull's** [R, `BoardBody.ts:1507–1518` for radiation and added mass, `:1512` for pressure;
   `hullForces.ts:264` for the hydrostatic support]. So the entry already on the hull's normal contributes **5.7 %** — which is the advisor's own
   falsification test (*"a flat athwartships bottom cannot make any `F_s`"*) **passing** — and the three on the
   surface normal are essentially the whole column: zero their in-plane share and the pooled column goes
   **−43.1 → −0.95 N** [A]. Step 3.3d's `?buoyFrame=hull` already exists for the biggest of the three and is **still
   the largest entry in 12 of 12 with it on**, because its gate (the dry-deck share, median 0.464) withdraws it
   exactly where the fall is: buoyancy's pooled in-plane median goes −34.88 → **−18.79 N** (46 % off, the gate's own
   median), `F_s` −43.1 → −33.7 N, and the falls 1.12–2.67 → 1.15–2.80 s, **12 of 12 either way**.
5. **The owner's rule about Compress is right, it is already in the fall test, and it works — and a second gate takes
   it back.** `a_max = g·d/h`, so measured over the commanded turn Compress holds its centre of mass at 0.504–0.548 m
   against tall's 0.636–0.843 and tolerates **2.33–2.53 m/s² of residual against tall's 1.51–2.00** (1.26–1.67×, the
   owner's "half again"), and its held residual is over its own bar in **3 of 12** runs against tall's **9 of 12** [M].
   It still falls 12 of 12 because `fallen` is `beyond && weightPast` and `beyond` is measured against the room's
   catching reach, which the design's own `stanceRoom` table cuts from **0.252–0.354 m** (tall: ±1.2 rad of hip, free
   arms) to **0.161–0.181 m** (Compress: ±0.4 rad, arms committed) [M]. **The crouch wins the moment bar by 1.3–1.7×
   and loses the reach by 1.4–2.2×**, and that trade is a ruling for the owner and the design, not a bug. §2b.
6. **Step 3.3c's filter switch did its job and the residual the owner rides with is the force's own.** The bank-gain
   deficit splits, at a full stick, into the force's share and the filter's: **world filter 0.123 force / 0.077 filter
   of the measured 0.200 °/°; deck filter 0.200 force / −0.030 filter of 0.170** [M]. With `feltFrame=deck` the
   filter's share of the deficit is **gone**. So nothing further is to be had from the frame the filter is held in, and
   what remains is §4's in-plane force.

## 1. The timing, and why it had to be the first thing measured

Part 29's handover rested on one sentence, and the brief called it *"the sharpest thing anyone has measured on this
track"*. It is arithmetic, so it was checked before anything was built.

`turn.ts` computes `turnFor: last.t − first.t`, where `first` is the first frame of the **commanded** turn after the
probe's own 0.2 s mount guard — so `first.t` is 0.2167 s in every run of every cell [R]. The gap between the turn's
end and the fall is `end.t − last.t`, which is `fellAt − (first.t + turnFor)`. Part 29 reported `fellAt − turnFor`.

| from 3.3f's own `33f-new-shipped.jsonl`, 48 rows | monotone (arc ≥ 0.99), n = 18 | all 48 |
|---|---|---|
| **[M]** `fellAt − turnFor` (as published) | **0.216–0.734 s** | 0.216–0.983 |
| **[M]** the gap itself, `fellAt − (first.t + turnFor)` | **−0.001 to 0.517 s** | −0.001 to 0.766 |
| **[M]** runs whose gap is exactly 0.000 | **13 of 18** | **37 of 48** |
| **[M]** runs that reached 85° and centred the stick | 5 of 18 | 11 of 48 |
| **[M]** of those, the gap from 85° to the fall | 0.100–0.517 s | 0.017–0.767 |

The published span and the recomputed one differ by 0.2167 s at both ends, to the digit, which is the window's own
start. **Part 29's §4 and §11 both state the 0.22–0.73 s, and both are wrong by that offset.** The round's own probe
(`3.3/fall.ts`, an independent implementation on the same cell) reads the gap as **0.000–0.517 s with 19 of 24 exactly
zero** [M].

**And the owner's ride agrees with the corrected ladder, which it did not with the published one.** Their words from
this evening are *"the balance is of the surfer falls full turn"* — at or near a full stick, which is exactly where the
corrected timing puts the fall **inside** the turn: at stick 1 the fall is at **1.12–2.18 s** and the commanded turn is
still running in 5 of 6 of those runs [M]. **So the answer to "do the ride and the ladder still disagree about when" is
no, and the disagreement was between the ride and an arithmetic slip.** The ladder, recomputed, says *during*, and so
does the owner.

**What survives it.** The minority that do finish the turn — 5 of 18 monotone runs, 11 of 48 overall — fall
0.100–0.517 s after the stick centres, so there **is** a post-centring fall and the coordinator's question about what
is released as the turn ends is a real question **about 11 runs of 48**, not 18 of 18. Nothing in this round pursues
it, and the `unwind` column is left exactly where Part 29 left it: a column, not an answer.

## 2. What the fall is, measured on the balance's own terms

`HumanBalance.fallen` is `beyond && weightPast` [R]: the capture point past the feet's edge by more than the room left
can catch, **and** the centre of mass's own push line past that edge. Both are read across the **felt vertical**, so
the quantity the test is against is

```
  px = offset.x − height · nx           (`CaptureState.pointAcross`)
```

— the body's across place **less the across place the turn demands of it**, because in a banked turn the felt vertical
leans toward the turn's inside. This round adds the two halves as report fields (`offsetAcross`, `feltAcross`, §9's
one source change) so the error can be attributed instead of inferred: `height · nx` is **the demand** and `offset.x`
is **what the body holds**. The feet's half-width across is **0.13 m** [R, `riderPosture.ts:96`].

Over 24 runs (`?rider=new`, shipped filter, 3 entry speeds × 4 sticks × 2 stances), every column signed so that **+ is
toward the turn's own inside**:

| | tall (12) | Compress (12) | stick 0.25 (6) | stick 1 (6) | all 24 |
|---|---|---|---|---|---|
| **[M]** fell | 12 of 12 | 12 of 12 | 6 of 6 | 6 of 6 | **24 of 24, all `'balance'`** |
| **[M]** at, s | 1.20–4.15 | 1.12–3.98 | 2.08–4.15 | 1.12–2.18 | 1.12–4.15 (median 2.88) |
| **[M]** `px`, m | 0.13–0.20 | 0.13–0.16 | 0.13–0.14 | 0.13–0.16 | **0.130–0.202, positive in 24 of 24** |
| **[M]** the demand `h·nx`, m | −0.28–0.06 | −0.27–−0.05 | −0.27–0.06 | −0.16–−0.09 | −0.282–0.063 |
| **[M]** the body holds `offset.x`, m | −0.11–0.19 | −0.13–0.08 | −0.13–0.19 | −0.01–0.05 | −0.132–0.193 |
| **[M]** the **deck's** share of \|px\| | 0.02–0.97 | 0.40–0.99 | 0.02–0.68 | 0.66–0.97 | 0.016–0.993 |
| **[M]** height at the fall, m | 0.45–0.81 | 0.47–0.53 | 0.52–0.81 | 0.47–0.70 | 0.451–0.805 |
| **[M]** the tolerance, ° (0.13 m at that height) | 9.2–16.1 | 13.7–15.4 | 9.2–13.9 | 10.5–15.4 | **9.2–16.1** |
| **[M]** the error, ° | 9.2–19.6 | 13.8–17.4 | 9.2–15.1 | 10.5–18.6 | 9.2–19.6 |
| **[M]** the capture point's velocity part, m | 0.22–0.71 | 0.10–0.34 | 0.13–0.71 | 0.13–0.25 | **0.104–0.714** |
| **[M]** the body's across speed, m/s | 0.81–2.28 | 0.50–1.35 | 0.55–2.28 | 0.68–1.75 | **0.499–2.278** |

**Five readings, and the fifth is the one that matters.**

1. **He always falls to the inside of his own turn** — `px` positive in 24 of 24 — i.e. over the rail he is leaning on,
   into the face. Not thrown outward.
2. **The budget is small and he is only just past it.** The tolerance is 0.13 m, which at the height the balance has
   crouched to is **9.2–16.1°**, and the error at the fall is **9.2–19.6°**: he crosses the line and goes, he does not
   sail past it.
3. **The error is mostly not the body's own place.** At sticks ≥ 0.5 the deck's term (`−height·nx`) carries
   **66–99 %** of it; at stick 0.25 it carries 2–68 % and the body's own drift carries the rest. So *at the stick the
   owner turns with, the across error is the deck's, not the rider's.*
4. **It is as much a speed as a place.** The capture point's velocity term (0.10–0.71 m) is the same size as its
   position term (0.13–0.20 m), with the body crossing at 0.50–2.28 m/s. The two conditions arrive together:
   `weightPast` was the last to turn true in 10 of 24, `beyond` in 11, both on the same frame in 3, and each had been
   standing for 0.017–0.383 s.
5. **And in 8 of 12 full-stick runs it is the FEET that are moving, not the body.** `deck.ts`'s own split at the fall:
   relative across speed **1.399–2.432 m/s = body −0.153 to 1.680 minus feet −2.379 to −0.241** [M]. **The board
   slides out from under him more often than he topples off it**, which is why §4 asks what pushes the *board* across
   and not what fails in the *rider*.

**What is not involved.** The capture point's validity condition (CAPTURE_LOAD, step 3.2h) is **not** a factor on the
shipped filter: the frozen share of the last 0.2 s before the fall is **0.000–0.083** and the longest light window of
the whole run is **0.000–0.002 s** [M]. On the deck filter it does appear (frozen share up to 0.538, longest light
window up to 0.101 s), and there **7 of 24 falls are not the capture point at all** — `weightPast` is false at the last
frame, so those separations come from the other `'balance'` branch, the sway past `RECOVERABLE_ERROR` = 0.25 m [R] —
and all 7 are at **82.2–91.1° of roll**. Same picture, different gate.

## 2b. The owner's own rule, measured: the crouch's benefit is in the test, it works, and it is paid back somewhere else

The owner's ruling of 2026-11-16: *"In compress the surfer should not fall in the lower speed of getting positioning
in a wave. Normal and maybe Crouch if the turn is too sharp but not compress because the centre of gravity is supposed
to do that."* That is a prediction with a number. Topple about the loaded edge: the restoring moment is `m·g·d`
against an overturning `m·a·h`, so the lateral acceleration a stance tolerates is **`a_max = g·d/h`** — inversely
proportional to the centre of mass's height, which the **static** criterion (`m·g·(d − x)`, 3.3e §1.4, and the "do not
reach for CoM height" line in my own brief) does not contain. **The brief was wrong for the turning case and the owner
is right.**

**And the fall test already contains the bar.** `weightPast` is `|offset.x − height · nx| > d` with `d` = 0.13 m [R],
so with the body stacked on the deck it fires at `|nx| > d/h` — at a **residual** lateral acceleration of `g·d/h`
exactly. The residual is the right quantity and not the raw one: the deck's own bank carries the turn, and only the
part the bank does not support lands on the feet. **By the advisor's identity that residual IS §4's in-plane force in
other units**: `tilt = atan(F_s/F_n)`, so `g·tan(tilt) = g·F_s/F_n ≈ F_s/m_pair`. The pooled `F_s` of −43.1 N over the
pair's 75.54 kg is **0.57 m/s²**, and §4's attribution is therefore an attribution of the owner's own `a_max`
violation.

Measured over the **commanded turn** (the height the balance actually holds, not the fall frame's), 12 runs a stance:

| **[M]** `?rider=new`, shipped filter | tall (12) | Compress (12) | Compress ÷ tall |
|---|---|---|---|
| the centre of mass over the feet, m | 0.636–0.843 | **0.504–0.548** | 0.65–0.79 |
| **`a_max = g·d/h`, m/s²** | **1.51–2.00** | **2.33–2.53** | **1.26–1.67×** |
| the turn's own lateral acceleration, held 0.2 s | 9.81–27.85 | 6.33–23.06 | — |
| **the RESIDUAL, held 0.2 s, m/s²** | 0.91–4.56 | 0.86–3.69 | — |
| **residual ÷ `a_max`** | **0.56–2.98** | **0.37–1.58** | — |
| **runs whose held residual is over their own bar** | **9 of 12** | **3 of 12** | — |
| the tolerance in degrees, `atan(d/h)` | 9.2–16.1° | 13.7–15.4° | — |
| **the room's catching reach `reachAcross`, m** | **0.252–0.354** | **0.161–0.181** | **0.46–0.72×** |

**Four readings.**

1. **The crouch's mechanical benefit is real, it is in the test, and it is the size the owner says.** Compress holds
   its centre of mass 0.50–0.55 m over the feet against tall's 0.64–0.84 and therefore tolerates **1.26–1.67×** the
   residual, which is "roughly half again". **It is not a benefit that fails to reach the fall test** — the coordinator's
   candidate (*"a velocity criterion does not contain `h` the way a moment criterion does"*) is refuted as stated: the
   capture point's velocity term is `vx/ω₀ = vx·√(h/g)`, which **is** height-sensitive, but as `√h` (1.23× between
   these stances) where the moment bar goes as `h` (1.67×). **The crouch's benefit is diluted in that term, not
   erased.**
2. **And it works, in the only way a bar can be seen to work:** the held residual is over Compress's own bar in **3 of
   12** runs against tall's **9 of 12**. The crouch is three times as often inside its limit.
3. **It still falls 12 of 12, because the moment bar is not the only gate.** `fallen` is `beyond && weightPast`, and
   `beyond` measures the capture point against the room's own **reach** — which `stanceRoom` cuts from ±1.2 rad of hip
   with free arms (tall) to ±0.4 rad with the arms committed (Compress), measured here as **0.252–0.354 m against
   0.161–0.181 m** [M]. **The crouch wins the moment bar by 1.3–1.7× and loses the catching reach by 1.4–2.2×.** That
   is a trade written into the design's own table, it is the honest answer to *"what benefit of the crouch is not
   reaching the test"* — the benefit reaches it and a second gate takes it back — and **it is a ruling for the owner
   and the design, not a bug I should fix.**
4. **The raw turn is 3–14× either bar, and that is as it should be.** The turn's own lateral acceleration held for
   0.2 s is 6.3–27.9 m/s² (0.65–2.8 g), which no stance could carry on its feet alone; the deck's bank carries nearly
   all of it, which is what banking is for. **The whole of the balance's problem is the 0.86–4.56 m/s² the bank does
   not carry**, and that is §4's −43.1 N in other units.

**And 3.3f's switch, since the stance separation is exactly what it was built for.** With `?kneeRoom=achieved` the
heights go tall 0.67–0.84 / Compress 0.51–0.55, `a_max` 1.51–1.90 / 2.33–2.50, and the falls 1.22–4.15 s / 1.07–3.97 s
against the shipped 1.20–4.15 / 1.12–3.98 [M]. **It changes neither the bar nor the fall measurably on this cell**,
which is what Part 29 said of it, said again from the other side. One honest note against it: by keeping the standing
stance taller it makes tall's own tolerance *smaller* (9.2–16.1° → 9.0–11.6° at the fall), which is the price of
standing up.

## 3. The roll nobody asked for

This is the measurement the owner's bar turns into a falsification, and it is one column.

| **[M]** `?rider=new`, deck filter, **full stick**, 12 runs (2 stances × 6 entry speeds) | span |
|---|---|
| the lean the stick asked for, peak | **40.8–50.0°** |
| the deck's roll from the world vertical, peak | **63.7–91.4°** |
| the rail against the water, peak | 75.7–90.1° |
| the deck's roll at the fall | **63.7–91.4° in 12 of 12** |
| the roll rate, peak | **146.7–353.7 °/s** |
| the drift (the board's slip angle), peak | 3.2–20.9° |
| fell | 12 of 12, at 1.12–2.67 s |

`RAIL_RANGE` is 50° and `MAX_BANK` is 70° [R], and the lean cap sat at 48–68° through these turns in Part 29's own
measurement. **The roll goes 14–41° past the largest lean any input can command, and reaches or passes 90° in 7 of the
12.** A surfboard under a standing rider in a 1.4 m wave does not lie on its side at 350 °/s, and no stick asked it
to. Under the owner's ruling this is the falsification, stated as a number: *the rider is not failing to balance, the
board is capsizing underneath him.*

**Said against the other populations, so it is not one cell.** On `fall.ts`'s three entry speeds the same column is
2.0–89.2° over 24 runs — over 50° in 15 of 24, over 70° in 5 — and it rises monotonically with the stick (0.25 →
9.3–53.8°, 0.5 → 2.0–83.4°, 0.75 → 39.6–87.5°, 1 → 25.2–89.2°) [M]. The runs that reach 90° are concentrated in the
**slower** entries (`deck.ts`'s −3, −2, −1 m/s, which `fall.ts` does not carry), which is why the two probes' spans
differ at the bottom end. **I am not claiming every fall is a 90° capsize. I am claiming the roll at the fall exceeds
what anything commanded, in every full-stick run of twelve, by 14–41°.**

**And this is why §2's over-bank is not the mechanism** (§7): through the commanded turn the deck is over-banked by
only 0.5–8.5° as the balance reads it and −2.5 to +5.2° as an independent reading has it, and then in the **last
0.25 s** the felt over-bank runs to 4.7–22.1°. The turn is survivable right up until it is not; what ends it is the
roll running away in a quarter of a second, not a steady lean error.

## 4. The in-plane force at the fall, per source, in newtons — the coordinator's own question

The instrument is 3.3b's (`3.3/deck.ts`), unchanged except for two off-by-default env switches (§9). Its identity is
exact and prior to any source [R, Part 27 §4]: the pair's felt vertical is the water force over the pair's mass, so on
the deck's own axes `tilt = atan(F_s / F_n)`, and **a force locked to the deck normal has `F_s` = 0 at any
magnitude**. `FELT=deck` moves both ends of the reading onto the deck's axes — the rider is built with
`feltFrame: 'deck'`, which is what the owner rides, and the probe's per-source low pass is held there too, because
filtering in the world and projecting afterwards charges the reading `Ω · T` of in-plane force at up to 354 °/s of
roll and would **manufacture its own biggest source**.

**Pooled over the commanded run, full stick, deck filter, 12 runs** (the number to design on, because the fall frame
is already inside the capsize):

| **[M]** in the deck's plane, `ŝ` | N, median signed | share of `F_s` | on the deck normal `n̂`, N |
|---|---|---|---|
| **buoyancy** | **−34.88** | **81.0 %** | 81.1 |
| radiation | −6.32 | 14.7 % | 39.8 |
| addedMass | −4.47 | 10.4 % | 48.6 |
| rails | −4.11 | 9.5 % | −0.0 |
| **pressure** | **−2.47** | **5.7 %** | 447.7 |
| friction | −0.46 | 1.1 % | 0.8 |
| fins | **+6.09** | −14.1 % | 0.0 |
| bed, froth, suction | 0.00 | 0 | 0 |
| **total `F_s`** | **−43.1** | on `F_n` **718.4 N** | = **−3.4°** of residual tilt |

**One arithmetic caveat on that table, because it does not quite add up and should not be made to.** Each entry's
figure is **its own median over the pool**, and medians do not sum: the seven sum to −46.62 N against the median of the
sum, −43.1 N, an 8 % spread. Every share quoted as a percentage is against the −43.1, which is why they do not total
100 % either (the signs differ, and `fins` is negative share).

**At the fall frame itself**, per run, in the deck's plane (12 runs): buoyancy **−165.3 to −37.3**, pressure −23.4 to
−4.7, addedMass −20.8 to +94.0, fins −49.6 to +62.5, radiation −9.1 to +7.0, rails −14.9 to −0.9, friction −1.9 to
+0.9, against `F_n` 249.5–1063.0 N and a total `F_s` of **−20.5 to −182.9 N** [M]. **Buoyancy is the largest single
in-plane entry in 12 of 12 runs**, and in 12 of 12 again with `?buoyFrame=hull` on. −43.1 N over the pair's 75.54 kg
is **0.57 m/s²** of across acceleration through the turn and **−1.43 m/s² at the fall** (median) — against a budget of
0.13 m, which 1.43 m/s² crosses from rest in 0.43 s [A].

## 4b. The drift, and the fins — the coordinator's spin-out question, answered on the steered cells

Every arm in §4 is a **steered** cell: the stick is held from the first frame, which is the owner's own fall. The
unsteered `STEER=0` arm is carried only as the instrument's reproduction check (§10). The coordinator's correction is
right and it is worth the number: the drift (the board's slip angle) peaks at **1.9–4.9°** unsteered and at
**1.5–20.7°** (world filter) and **3.2–20.9°** (deck filter) at a full stick [M] — four to five times as much, so the
owner's slide-out is the steered fall and the probes have been measuring it.

**But 69° is not this population.** Part 27's 0.8–69.3° is a frame-level pool over all runs, and 3.3d §3 already said
of its own 93.6–123.8° that those frames are *"in and after the capsize ... not a controlled slide"*. On the steered
cells the drift peak is 20.9°, and the frames that reach it are the last ones.

**And the fins are not the pusher; they are the only resister.** `fins` is the one in-plane entry whose sign opposes
the net: its in-plane median goes **−2.32–+11.49 N unsteered → +2.53–+21.86 N at a full stick** while `F_s` goes
−31.7–+2.4 → **−72.0–−27.1 N** [M]. At the fall it is the **second largest** entry in 9 of 12 runs and the largest in
**0 of 12** (buoyancy is the largest in 12 of 12), spanning −36.5 to +62.5 N — both signs, because by then the board
is at 63.7–91.4° of roll and the fins are no longer doing what fins do. **So 3.3a's remark that the fins' sideslip
channel "is what a spin-out is" is not what the in-plane column says on this cell: the fins grow with the steer, as
they must, and they push back against the slide.** Whatever is sliding the board out, the fins are resisting it.

## 5. Physics or artefact, source by source

The advisor's test is exact and it is the only test used here: **an in-plane component is either a real in-plane force
(a lifting surface, a rail with geometry, skin friction along the flow) or a frame error.**

| source | what it is in the code | verdict |
|---|---|---|
| **buoyancy** | the hydrostatic support resolved along the **water-surface** normal, `ρg(−∂η/∂x, 1, −∂η/∂z)·V` [R, `hullForces.ts:264`] | **the frame question, already ruled on.** Step 3.3d's advisor item 2: in Savitsky's method the whole load, the buoyant term included, is the bottom-pressure resultant **normal to the bottom**, because hydrostatic pressure on a bottom wetted on one side under a **dry** deck has no wetted side walls to turn it vertical [S]. `?buoyFrame=hull` is built, off by default, and **gated to 46 %** by the dry-deck share. |
| **radiation** | applied along `surfaceNormal` [R, `BoardBody.ts:1514–1516`] | **the same frame question, not ruled on.** `BoardWaterNormal.test.ts` asserts that direction deliberately, so changing it is a ruling for the owner and the advisor, not a bug fix. 14.7 % of `F_s`. |
| **addedMass** | applied along `surfaceNormal` [R, `BoardBody.ts:1507–1509, 1517`] | the same, 10.4 %. A flat plate's added-mass reaction is normal to the **plate**; ours is normal to the water. Same test asserts it. |
| **pressure** | applied along the **hull patch** normal [R, `BoardBody.ts:1512`] | **physics, and the advisor's falsification test passes**: its in-plane share is **5.7 %** (−2.47 of −43.1 N), where a flat athwartships bottom predicts ≈0. The residue it does carry tracks the roll **rate** (−0.102 N per °/s, R² 0.873, against the ledger's own within-step rotation of 0.057 N per °/s [M, 3.3b]) — a within-step rotation, not a hull force. |
| **fins** | a lifting surface at drift | **physics**, +6.09 N, and it is the only entry pushing the other way. |
| **rails** | the rail band's geometry; the default section is a **flat sheet with a knife edge** and `?hull=rail` is opt-in [R] | **physics by construction, and small for the same reason**: −4.11 N. |
| **friction** | skin friction along the flow | **physics**, −0.46 N. |
| bed, froth, suction | not active on this cell | — |

**So the answer to the coordinator's question, in one line: the in-plane across column is not physics we failed to
counter. It is three of our ten water entries resolved on the water-surface normal instead of the hull's, and they are
essentially all of it** — zero their in-plane share and the pooled column goes **−43.1 → −0.95 N**, a 98 % reduction
[A], the remainder being fins, rails, pressure and friction, every one of which a real board makes.

**And the honest size of the prize, because it is not a surviving turn.** 3.3d already measured what removing 46 % of
buoyancy's share buys: the median fall over 108 runs goes 1.76 → **2.10 s** on the deck filter, and **no fall was
prevented in any of 36 cells**. This round's own A/B agrees: at a full stick with the deck filter, 12 of 12 fall at
1.12–2.67 s shipped and 12 of 12 at 1.15–2.80 s with `?buoyFrame=hull`. Time to cross a fixed 0.13 m goes as
`1/√a` [A], so deleting the whole in-plane column should lengthen the ride by about **√(1.43/0.03) ≈ 7×** if the
in-plane force were the only thing moving the body across — and 3.3d's measured 1.19× for a 46 % cut on one of three
entries says it is **not** the only thing. **I report the attribution as measured and the payoff as unmeasured.**

## 6. The filter, and what step 3.3c settled

The bank-gain deficit (°of residual tilt per ° of roll, pooled, full stick, 12 runs) splits into the force's own share
and the filter's lag:

| **[M]** | the force's share | the filter's lag | the measured deficit |
|---|---|---|---|
| world filter (shipped) | 0.123 | **0.077** | 0.200 |
| **deck filter** (`?feltFrame=deck`, what the owner rides) | 0.200 | **−0.030** | 0.170 |

And the lag's own law goes with it: the test's tilt per °/s of roll rate is **−0.0970 (R² 0.531)** in the world against
−T = −0.1000, and **−0.0293 (R² 0.126)** on the deck [M]. **The filter's share of the residual is gone on the deck
frame.** Step 3.3c's switch does what it was built to do, and nothing further is to be had from it; what the owner
rides with now is the force's own residual, which is §4.

## 7. What I refuted

- **Part 29's post-turn timing**, §1. The fall is the last commanded frame in 13 of 18 monotone runs and 37 of 48
  overall. My brief's central premise, refuted from the brief's own published rows before anything was built.
- **My own first mechanism, and the test that killed it is in this round.** I measured the deck over-banked past the
  bank its delivered turn supports — 0.5–8.5° through the turn as the balance reads it, −2.5 to +5.2° from an
  independent reading of the board's own lateral acceleration, the two agreeing in size and in their rise with the
  stick — and the tolerance is only 9.2–16.1°, so it looked like the whole of it. **So I took it out of the stick.**
  The **balanced hand** (`HAND=balanced`, §9: an integrating thumb that commands only as much turn as can be had
  without banking the deck past what the turn supports — an input, not a force) cut the felt over-bank through the turn
  from 0.5–8.5° to **−1.3 to +4.1°**, and **24 of 24 still fell, at 1.150–4.583 s against the fixed hand's
  1.117–4.150 s, medians 2.87 against 2.88, with the net heading down from 12.6–88.1° to 3.0–59.2°** [M]. It removed
  the over-bank, delivered a third of the turn, and bought nothing. **The over-bank is a companion of the fall, not
  its cause**, and I would have published it as the cause if I had not tested it.
- **The capture point's freeze as a factor**, on the shipped filter: 0.000–0.083 of the last 0.2 s frozen, longest
  light window 0.000–0.002 s over 24 runs. (It is present on the deck filter and is reported there, §2.)
- **My own first sign convention**, which signed every across column by `sign(nx)` — the felt vertical's own sense,
  which is the deck's **bank error** and not the turn's side. It read 22 of 24 falls as "outboard"; signed by the
  turn's own direction, the same 24 runs are **inboard in 24 of 24**. The columns were rebuilt and the old reading is
  withdrawn here rather than carried.
- **`pressure` as the in-plane suspect**: 5.7 % of `F_s`, where the advisor predicted ≈0 for a flat athwartships
  bottom. That is the advisor's test passing, and it is reported as such rather than as a finding of mine.

## 8. What I will not claim

- **I will not claim the in-plane column is the whole of the fall.** §5's arithmetic says deleting it would take the
  pooled across forcing from **0.57 to 0.013 m/s²** (−43.1 → −0.95 N over the pair's 75.54 kg), and the fall frame's
  own 1.43 m/s² with it; 3.3d's measured A/B on 46 % of one of the three entries moved the median fall by 19 % and
  prevented none. Those two cannot both be the whole story, and the one that is measured
  is the smaller. **The attribution is measured; the payoff is not.**
- **I will not claim radiation and added mass are artefacts.** They are the **same frame question** as buoyancy, their
  direction is asserted by a test as a deliberate choice, and resolving it is the advisor's and the owner's, not mine.
  What I claim is their size: 14.7 % and 10.4 % of `F_s`.
- **I will not claim every fall is a capsize.** 12 of 12 full-stick runs are at 63.7–91.4° of roll; the mixed-stick
  population is 2.0–89.2°, and at a quarter stick the roll at the fall is 9.3–53.8°. What is true in every full-stick
  run of twelve is that the roll at the fall exceeds the largest commandable lean by 14–41°.
- **I will not claim `a_max = g·d/h` is a human's limit.** It is **our fall test's** bar, read off our own geometry:
  `d` is the feet's modelled half-width across (0.13 m) and the criterion is a static moment about that edge, with no
  ankle, no hip and no step in it. 3.2z already measured that the test as a whole is **more generous** than a human's
  at the edge of the base (Hof; Pai & Patton). What §2b claims is the **ratio** between our own stances and that it
  behaves as `1/h`, which is the owner's point, not that 1.5–2.5 m/s² is what a surfer can take.
- **I will not claim the stance table's reach penalty is wrong**, only that it is 1.4–2.2× and that it is the second
  gate. Whether a compressed surfer really has ±0.4 rad of hip and committed arms is the design's question and the
  owner's.
- **I will not claim what rolls the board.** I measured the in-plane **force** and the roll it accompanies; I did not
  attribute the roll **moment**, and an in-plane force at the hull is not the same thing as a roll moment about the
  pair's centre of mass. That instrument does not exist yet and is the next one.
- **I will not re-promote Part 29's `unwind` column**, and I will not claim the post-centring fall of the 11 runs that
  reach 85° has a cause: I did not measure it.
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed rather than paddled in, `deck.ts`'s six entry
  speeds and `fall.ts`'s three are different populations and are never pooled, and every span above is **the whole
  population of its arm**, not a confidence interval.
- **No bot ride is offered as evidence of feel anywhere in this document.** The balanced hand in particular is a 60 Hz
  loop on a quantity no player can see, and it is a diagnostic input and nothing else.

## 9. What changed, and why each piece is allowed

- **`src/physics/humanBalance.ts`, two report fields.** `CaptureState.offsetAcross` (the body's own across place from
  the feet, `offset.x` as it comes in) and `CaptureState.feltAcross` (the felt vertical's across component, so the
  demand is `height × feltAcross`). Two assignments after the freeze's early return, so they are held through a light
  window with the rest of the state; nothing in the game reads either. They exist because `px = offset.x − height·nx`
  is the fall test's own quantity and §2's attribution of it must be read, not re-derived from `tiltAcross` with `nz`
  unknown. `humanBalance.test.ts` asserts the identity, both ends, the level case and the freeze (5 new assertions in
  one test, 20 of 20 in the file).
- **`docs/research/new-rider/3.3/fall.ts`**, the probe: read-only, drives the shipped inputs, reads public fields.
  `HAND=balanced` moves the **stick** and nothing else.
- **`docs/research/new-rider/3.3/deck.ts`**, two env switches, both default off: `FELT=deck` (the rider's
  `feltFrame: 'deck'` **and** the probe's own low pass held on the deck's axes) and `BUOY=hull` (step 3.3d's
  `?buoyFrame=hull` on the board). With both unset the probe's whole printed report is **byte-identical** to the
  pre-change build on the same arm, checked by `diff` and not asserted (§10).

## 10. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- the two probes type-checked separately on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, with `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/fall.ts`, `docs/research/new-rider/3.3/deck.ts`, `src/physics/humanBalance.ts` and
  `@types/node`.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **55 files, 601 passed, 21 expected fail** (the new `humanBalance.test.ts` assertions
  included: **20 of 20** in that file). `vitest run src/game src/scene/rig`: **70 files, 729 passed**.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail**.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**, the reference, so
  a red there would be news as `runner-test-file-excluded` has it. `src/wave/SurfZoneSimulation.test.ts` is closed by
  reading, as `c2-step5g.md` §7.4 allows: this round touches no solver, no wave and no spot file.
- **the published instrument reproduces its own record, and that is also the proof that the shipped rider is
  unchanged.** `deck.ts` at `STEER=0` with no switches gives bank peak **20.7–65.7°**, roll peak **20.9–63.0°**, rail
  peak **10.9–62.9°**, drift peak **1.9–4.9°** and 12 of 12 falls at **0.77–1.70 s** — Part 24's published twelve to
  the digit — run on **this** branch, with the two new `CaptureState` fields in place. A report field that changed
  behaviour would move those falls. Its whole printed report is also byte-identical before and after this round's two
  env switches were added, with both unset (`diff`, not an assertion).
- **nothing is gated because nothing behavioural ships**, so there is no switch to pin off for the online rooms this
  round; `main.ts` and `PhysicalMode.test.ts` are untouched.
- **the Canyon byte check** (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, **fresh** spin-ups into new state paths),
  with the brief's three cautions read rather than assumed — the wrapper is one **prepended** line on the bundle
  (`globalThis.location = { search: '?canyonWaves=true' }`, because a dynamic import makes rolldown split the chunk),
  the grid line read, and the "spun up on the CPU in … s" line read so that no kept `.sea` was imported:
  - Canyon B (`?canyonWaves=true`), **400 × 451 = 180,400 cells**, spun up on the CPU in **50.4 s**: snapshots
    **a367d938f15fa934**, state **9e5831f80e38abd9** — **the same as main.**
  - the default Canyon, **400 × 507 = 202,800 cells**, spun up on the CPU in **54.9 s**: snapshots
    **ea3d57a4d49f4b48**, state **a1a2555739210f96** — **the same as main.**

  All four match, which they must: this round touches no solver, no wave, no spot file and no hull law, and the only
  two source lines it adds are report assignments. The raw output is `results/33g/33g-canyon-byte-check.txt`.
- **the deletions column**, read line by line before the push (`git diff --cached --stat origin/main`): **26 files,
  2,094 insertions and 8 deletions** — and **all eight deletions read, one by one**: one is `deck.ts`'s `BoardBody`
  construction, replaced in place with `BUOY=hull` added; four are the four lines of its per-source low-pass loop,
  replaced in place with the `FELT=deck` branch; two are its header and FELT-SPLIT `console.log`s, replaced with the
  filter's frame named in them; and one is `humanBalance.ts`'s `state` initialiser, replaced in place with the two new
  report fields. **Nothing was inherited and nothing was reverted**: `origin/main` is still **cc3f6c59**, the branch's
  own base, so there was no mid-round merge to rebase onto — and the column was read rather than that being assumed.

## 10b. Files (3.3g)

- `docs/research/new-rider/3.3/fall.ts` — the probe. Read-only on the game; `HAND=balanced` moves the stick and
  nothing else.
- `docs/research/new-rider/3.3/deck.ts` — 3.3b's instrument, plus `FELT=deck` and `BUOY=hull`, both off by default and
  checked byte-identical when unset (§10).
- `docs/research/new-rider/3.3/results/33g/` — five `fall.ts` arms (`new-world`, `new-deck`, `new-balancedhand`,
  `new-kneeroom`, `old-world`, 24 rows each) and five `deck.ts` arms (`deck-s0-world`, `deck-s0-deck`, `deck-s1-world`,
  `deck-s1-deck`, `deck-s1-deck-hullbuoy`, 12 rows each), each with its printed tables beside its rows, and
  `33g-canyon-byte-check.txt`.
- `src/physics/humanBalance.ts` — the two report fields (§9). `src/physics/humanBalance.test.ts` — their test.

## 11. For the owner, in plain words

**You were right, and it is worse than "he falls too easily". He is falling off a board that has rolled on its side.**

I measured the board's own lean at the moment he comes off. With the stick all the way over, on twelve runs, the most
any input can ask for is **50 degrees** of lean — and the board is at **64 to 91 degrees** when he goes, rolling at up
to **350 degrees a second**. Seven of the twelve are flat on their side. Nobody asked for that. So this is not a rider
who needs a better sense of balance; it is a board going over, and your bar — a professional in a crouch on a wave he
has just caught does not fall — says the thing to find is what pushes it over, not what could catch him.

**And on "falls full turn": the ride and the measurement now say the same thing, which they did not this morning.**
You said he falls on the full turn. The measurement says the same: at full stick he comes off **1.1 to 2.2 seconds**
in, **while the turn is still being asked for**. Last round I told you it was 0.2 to 0.7 seconds *after* the turn, and
that was my arithmetic and not your board.

**Two things I have to correct from last round, both mine.**

First, **"he falls just after the turn" was an arithmetic mistake of mine** — I subtracted a duration from a time and
forgot the 0.22 seconds the measuring window starts at. He falls **during** the turn: in 13 of the 18 clean turns the
fall *is* the last frame of the turn. Only 5 of them actually finish the turn and then fall.

Second, I found what looked like the answer and then killed it myself. The board leans a few degrees further than its
own turn can hold, and his whole margin is only 9 to 16 degrees, so that looked like the whole story. I wrote a
diagnostic "perfect thumb" that only ever asks for as much turn as the board can hold level — and **he still fell, all
24 times, at the same times, after only a third as much turn.** So that was a passenger, not the cause.

**What I did find is a number, and it names one thing.** The sideways force **in the plane of the deck** — the force
that slides the board out from under his feet, and in 8 of 12 runs it really is the board moving and not him — is
**43 newtons through the turn and up to 183 newtons at the moment he goes**. Broken down by where it comes from, **81 %
of it is buoyancy**, and buoyancy in our code pushes straight up in the world even when the board is on its side. A
real planing board's support pushes square out of its **bottom** — and a force square out of the bottom cannot slide
him sideways at all, at any size. Of the ten water forces we model, **three** (buoyancy, the water's added mass, and
the waves it radiates) push along the water's surface instead of out of the hull, and those three are **essentially
the whole sideways column**: the one force that already pushes out of the hull contributes **6 %**. Take the three
off and that column goes from 43 newtons to **about 1**.

**The honest part.** The fix for the biggest of the three already exists from two rounds ago (`?buoyFrame=hull`), and
it only gets half of it, because it switches itself off wherever the deck is under water — which is exactly where he
falls. With it on: the falls move from 1.12–2.67 s to 1.15–2.80 s, and **all twelve still fall**. So I am not telling
you this is the fix. I am telling you it is the first thing in the list that is **ours and not the sport's**, and that
the other two are the same question and have never been ruled on.

**Nothing changed in the game this round.** No switch, no force, no new number in the physics — two read-only
measurements in the balance code so the next round can see what it is doing, and nothing you can type.

**On Compress, you were right and my own brief was wrong.** I had a standing instruction not to look at how low the
surfer's weight is, because for a rider standing still it makes no difference to where he tips. In a **turn** it makes
all the difference, and the sum is the one you named: the sideways pull a stance can take is `gravity × (half the
foot's width) ÷ (how high the weight is)`, so **lower weight, more pull**. Measured through the turn, Compress holds
his weight at **50–55 cm** over his feet against **64–84 cm** standing, and so takes **1.3 to 1.7 times** the sideways
pull — your "half again", to the number. And it shows: the pull goes over Compress's limit in **3 of 12** runs against
**9 of 12** standing. **The crouch is doing exactly what you said it should.**

**And here is why it still falls, which is a decision for you rather than a bug for me.** The fall needs *two* things
to go wrong at once: his weight past his feet (the sum above, which Compress wins) **and** the capture point past what
his body can still catch. That second one is the hip and the arms, and our own stance table gives Compress **±0.4
radians of hip with the arms committed** against standing's **±1.2 with the arms free** — so Compress's catching reach
is **16–18 cm** against standing's **25–35 cm**. **The crouch wins the tipping sum by up to 1.7× and loses the
catching reach by up to 2.2×.** That trade is written into the design we chose, not into the physics, and whether a
compressed surfer should really have that little left to catch with is your call and the design's. It is the one place
in this round where I could change something and chose to ask instead.

**One more thing you said that I checked rather than assumed**: that it slides out sideways. On the steered runs the
board's sideways slip angle peaks at **3 to 21 degrees**, against 2 to 5 when nobody is turning — so yes, the turn is
where the sliding is. But the **fins** are not what is sliding him: they are the one force in the whole list that
pushes **back** against it, and they grow stronger as you turn harder. It is the three that push along the water's
surface that do the sliding.

**What I would ask you for, and it is a decision rather than a ride.** The two remaining ones (the water's added mass
and the waves it radiates) have a test in the codebase that asserts they point along the water's surface, deliberately,
so for those two I am not calling it a mistake — I am asking.
Changing that is a ruling, not a bug fix, and it is yours and the water advisor's. If you want it, the next round
measures all three on the hull's normal together and tells you what the sideways column and the falls do. If you would
rather I chase what actually rolls the board to 90 degrees — which is a **moment**, not this force, and I have not
measured it — say so and I will build that instrument instead. **I would pick the roll.**

# Part 31 — the crouch keeps its reach and still falls, and the board is rolled by the rider's own feet against a hull that answers him to one part in a thousand

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33h`, cut from `main` at
**5147f559** (step 3.3g's merge), so Part 30 is its base. It ships **one opt-in behavioural switch**
(`?stanceReach=keep`, the owner's ruling of 2026-11-16), **one read-only instrument** (`BoardBody.rollLedger`, the
yaw ledger's twin one axis over), two probe additions, two new test files' worth of assertions, and **108 runs** over
nine arms.

Tags as in 3.2 and 3.3: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source; **[I]** my
inference from a stated model; **[A]** arithmetic on measured numbers, labelled as such.

## 0. The five sentences the round is for

1. **The owner's ruling is built and it does what they asked, exactly and only.** `?stanceReach=keep` gives a deep
   crouch the riding stance's hip range and free arms, and Compress's catching reach goes from **0.156–0.181 m to
   0.305–0.372 m** over 24 runs an arm on two filters — a factor **1.8–2.0**, and **above the standing stance's own
   0.251–0.354** — while Compress's centre-of-mass height (**0.50–0.55 m**) and its moment bar
   (`a_max` **2.33–2.53 m/s²**) do not move at all [M]. The standing stance is **identical to the digit in all eight
   of its cells on both filters**, which is the internal control: the switch is a no-op where the room was already the
   riding stance's.
2. **And he still falls, in every run of every arm.** **24 of 24**, and **12 of 12 Compress runs**, in each of the
   four `fall.ts` arms. Compress's falls come later in **8 of 8 cells** — the gentlest stick moves furthest,
   **2.08–3.98 s → 3.63–4.35 s** on the shipped filter — and the gate that fires moves from the reach to the moment
   (Compress's last-to-turn-true count goes `beyond` 5 / `weightPast` 5 / together 2 → **5 / 2 / 4**) [M]. **The
   owner's bar is not met: at a quarter stick, which is the low speed of getting into position, Compress falls 6 of
   6.** That is the headline, as the brief required it to be if the reach were restored and he still fell.
3. **What rolls the board is the rider's own feet, and every water force of consequence resists it.** Pooled over
   1,118 commanded frames of the twelve full-stick runs that reproduce 3.3g's own twelve to the digit, in N·m about
   the board's long axis, positive meaning further over the way the run went: **the rider residual +33.47**, and
   against it **pressure −20.46, buoyancy −3.81, radiation −1.65, addedMass −1.16, fins −0.47**, with only `rails`
   (+0.09) and `friction` (+0.04) pushing the roll on at all [M]. **The whole water column is −33.40 N·m and the net
   is +0.04** — one part in a thousand of either column.
4. **So the 14–41° of roll nobody commanded is not an unanswered force; it is the error in a near-cancellation on an
   inertia of 0.0262 kg·m², where 1 N·m is 2,187 °/s².** The measured roll acceleration over the turn is
   **21–234 °/s²** [M]. And the residual is not a mystery: divided by the contact's own normal load it implies the
   load presses **0.0525 m** off the board's centreline (peak 0.309), against the feet's own modelled half-width
   across of **0.13 m** [R] — exactly what a foot-borne load off the centreline makes. An independent reading of the
   same moment, from `contact.force` and `contact.centreOfPressure`, gives **+39.19 N·m** against the residual's
   +33.47, agreeing to **4.72 N·m at the median** on this arm and 2.13 on the unsteered one.
5. **My brief's carried-forward attribution does not transfer to this axis, and the two orders are opposite.**
   Buoyancy is **81.0 %** of the in-plane force column (3.3g §4) and **11 %** of the water's roll column, where it
   *resists*; `pressure` is **5.7 %** of the in-plane column and **61 %** of the roll column. The three entries on the
   water-surface normal together are **−6.62 of −33.40 N·m = 20 %** of the column that is holding the board up [A].
   **Re-pointing them would move a fifth of the force resisting the capsize, in a direction nobody has measured.**

## 1. (A) The build — what `stanceRoom`'s limits are, and what the switch overrides

The brief set two honesty requirements on this build and they are answered first.

**`stanceRoom`'s limits exist for three reasons, and all three are named in the code the switch touches**
(`humanBalance.ts`'s `stanceRoom` doc, rewritten this round):

1. **The hip's range is not only a credit, it is a stop.** `AttachedRider.humanSwingStep` clamps the hip's actual
   lateral swing to the same number the fall test credits [R, `AttachedRider.ts:3141, 3243`]. So a switch that
   restored the *credit* without the *stop* would be a fall test believing in a save the body cannot make — which is
   the brief's rule 1, a kinematic prescription with no force behind it. **All five `stanceRoom` call sites in
   `AttachedRider` take the switch**, so the trunk really can swing to ±1.2 rad in a crouch.
2. **The arms are a rotor, not a decoration.** `arms` raises `swingInertia` from **6 to 10 kg·m²** and
   `riderYawInertia` by `RIDER_YAW_ARMS_OUT` = 0.85 kg·m² [R]. Free arms in a crouch therefore buy reach and cost the
   board's yaw agility, both really, and both happen with the switch on.
3. **The design bar it crosses is `design.md` §3.2's** *"push recovery on a 7 m/s glide is ordered tall > crouch >
   Compress"* — which is **why** the tall stance has the larger range at all. That bar and `design.md` §3.3's *"the
   order tall < crouch < Compress"* for the lateral g at the fall have pulled opposite ways since the design was
   written, and 3.3g measured the trade. **Two measured consequences of a larger range are already on the record and
   both are costs**: step 3.2h found that with a hip *drive* on, *"the more range the rider has to throw, the more harm
   a pumped hip does"* (the tall stance's largest saved shove collapsed 1.887 → 0.615 where the crouch's rose), and
   step 3.2z found that `reachAcross` is credited on the range **remaining**, so *"a rider who has used the whole hip
   to slow his weight is credited with no reserve to catch it"* — the hip's correction and the test's reserve are the
   same budget.

**So what the switch overrides is a design ordering bar, not a physical limit, and the override is behavioural.** It
is therefore **opt-in, off by default, and pinned off for online rooms** in the shape `?feltFrame=deck`,
`?buoyFrame=hull` and `?kneeRoom=achieved` use (§7), exactly as the brief specified — because only the owner can
retire a design bar, and they have ruled on which side of this one to keep but not on the bar.

**The one line of physics**: `stanceRoom(depth, 'keep')` reads `hipRange` and `arms` at the riding stance (depth 0:
±1.2 rad, arms free) and leaves `kneeTravel` at the stance's own, so the switch moves one family of quantities and
`kneeRoom`'s quantity is untouched. `humanBalance.test.ts` asserts it at eight depths, asserts the knees' travel is
unchanged at each, asserts the default is the table, and asserts the ratio the credit changes by: Compress's rotor
impulse against the tall stance's is `√(2·6·τ·0.4) / √(2·10·τ·1.2)` = **1/√5**, so restoring the room is a factor
**√5 = 2.236** on the credit at the same height and ω — the top of 3.3g's measured 1.4–2.2× span, the rest of which is
the swing already spent.

## 2. (A) What the restored reach does to the owner's bar — the headline

`fall.ts`, four arms of 24 runs (3 entry speeds × 4 sticks × 2 stances), the shipped (world) filter and the deck
filter the owner rides with, `?stanceReach` shipped against `keep`. **Every number below is the whole population of
its cell**, not an interval.

### 2.1 The reach, which is what was asked for

| **[M]** Compress's `reachAcross`, m, 3 runs a cell | shipped (world) | keep (world) | shipped (deck) | keep (deck) |
|---|---|---|---|---|
| stick 0.25 | 0.177–0.181 | **0.313–0.319** | 0.171–0.181 | **0.313–0.319** |
| stick 0.5 | 0.162–0.178 | **0.312–0.329** | 0.162–0.178 | **0.305–0.322** |
| stick 0.75 | 0.165–0.176 | **0.315–0.362** | 0.165–0.176 | **0.308–0.359** |
| stick 1 | 0.161–0.174 | **0.325–0.372** | 0.156–0.175 | **0.307–0.368** |
| **pooled** | **0.156–0.181** | **0.305–0.372** | — | — |
| the tall stance's own, for scale | 0.251–0.354 | 0.251–0.354 | 0.251–0.338 | 0.251–0.338 |

**The ruling is delivered.** Compress's catching reach rises by **1.8–2.0×** and ends **above** the standing stance's.

**And only the reach moves.** Compress's centre of mass over the feet is **0.50–0.55 m** and its moment bar
`a_max = g·d/h` is **2.33–2.53 m/s²** in both arms, to the digit [M]. The switch moved the gate 3.3g named as the
second one and left the one the owner's own sum is about, which is what it was designed to do.

**The internal control passes.** The standing stance is **identical in every column of all eight cells on both
filters** — same falls, same reach, same height, same roll. It must be, because the tall stance's room already *is*
the riding stance's, and a switch that changed it would be a switch doing something other than what it says.

### 2.2 The falls, which is what was asked about

| **[M]** Compress's fall, s, 3 runs a cell | shipped (world) | keep (world) | shipped (deck) | keep (deck) |
|---|---|---|---|---|
| stick 0.25 | 2.08–3.98 | **3.63–4.35** | 3.58–4.05 | **3.87–4.23** |
| stick 0.5 | 3.07–3.35 | 3.35–3.47 | 3.33–3.42 | 3.35–3.50 |
| stick 0.75 | 1.22–2.38 | 1.47–2.72 | 1.42–2.73 | 1.47–2.75 |
| stick 1 | 1.12–2.18 | 1.33–2.65 | 1.30–2.65 | 1.33–2.65 |
| **fell** | **12 of 12** | **12 of 12** | **12 of 12** | **12 of 12** |
| the whole arm | **24 of 24** | **24 of 24** | **24 of 24** | **24 of 24** |

**The ride gets longer in 8 of 8 cells and nothing is saved.** The gentlest stick — the owner's own case, the low
speed of getting into position — moves furthest, **2.08 → 3.63 s** at the bottom of its span on the shipped filter,
and **6 of 6 of those runs still fall**. Under the owner's ruling, read as the brief instructs, **96 of 96 falls
across this round's four arms remain a falsified model**.

### 2.3 What else moved, because it is not free

**The gate that fires changes, which is the one piece of mechanism in §2.** Over Compress's twelve runs, counting
which condition was the last to turn true before `fallen`:

| **[M]** Compress, last to turn true | shipped | keep |
|---|---|---|
| `beyond` (the reach) / `weightPast` (the moment) / both on one frame, world filter | 5 / 5 / 2 | **5 / 2 / 4** |
| the same, deck filter | 0 / 9 / 0 | **4 / 1 / 3** |
| how far past the feet at the fall, m, world | 0.11–0.34 | 0.14–0.52 |
| the same, deck | 0.19–1.04 | **0.20–0.45** |

On the deck filter the shipped Compress runs are a reach that was **already** blown in 9 of 12 — `weightPast` was the
last thing to go — and with the reach restored four of them become the reach again and three arrive together. **The
fall has moved from "he had nothing left to catch with" toward "his weight went past his feet", which is the owner's
own sum, and he still goes over it.**

**Three costs, measured and not hidden.**

| **[M]** Compress, 12 runs | shipped | keep |
|---|---|---|
| the residual held 0.2 s, m/s² (world) | 0.86–3.69 | **1.64–56.96** |
| residual ÷ its own `a_max` | 0.37–1.58 | **0.69–24.45** |
| the tolerance at the fall, ° | 13.7–15.4 | 13.6–**33.0** |
| the deck's roll at the fall, ° (deck filter) | −43.6–89.8 | −62.5–**102.2** |
| the felt over-bank at the fall, ° (deck filter) | −53.5–38.7 | −65.7–**115.5** |
| the frozen share of the last 0.2 s (deck) | 0.00–0.54 | 0.00–**1.00** |
| the longest light window, s (deck) | 0.00–0.10 | 0.00–**0.21** |

A held residual of 57 m/s² is not a gentle turn; it is the freed hip and arms throwing hard, and the capture point
goes light under them (a whole 0.2 s frozen in one run). **So the restored reach buys time and spends violence**, and
on the deck filter it takes the board past 90° more often than before. I report that as a cost of the switch and not
as a reason to withhold it: the owner ruled, and the switch is theirs to ride.

## 3. (B) The instrument — the roll ledger, and the ledger bug the positive control found

`BoardBody.roll` is the yaw ledger's exact twin one axis over, built the same way, filled at the same seven sites,
and off by default behind `BoardBody.rollLedger`.

**The datum, stated, as the brief required.** Each entry is a mean torque over the step about **the board's own long
axis** — board frame +z in the world, `(rotation[2], rotation[5], rotation[8])` at the substep that books it, the
same axis and the same expression `bandLedger.rollMoment` has used since step 3.2u — **positive in the right-hand
sense, which lifts the +x rail**. The axis is the instantaneous one, which is exact because torque balance is
instantaneous; at the fastest roll this track has measured (354 °/s) the axis itself moves 0.37° across a 1/960 s
substep [A]. `total` is the board's own `I·Δω` on that axis and `rider` is the residual: `total` less every water
entry and the gyroscopic term.

**The probe's own sign is one convention, applied once, and signed by the run's outcome.** `deck.ts` negates every
entry into its own `roll` sense (its `roll = atan2(boardUp·side, boardUp.y)` is `−θ` for a rotation `θ` about +z,
checked frame by frame) and multiplies by the sign of the deck's roll at the **last** frame, so **positive means
pushing the board further over the way it actually went**. It is signed at the end rather than latched at `STEER_FROM`
because at `STEER_FROM` = 0 the roll is still 0.0° and `Math.sign(0) || 1` would pick a sign at random — the same
shape of trap as 3.3f's `Number(null) === 0`, and caught by running it rather than by reasoning about it. Step 3.3g
had to withdraw an across column signed by `sign(nx)`; this is the lesson applied.

**The positive control** (`src/physics/rollLedger.test.ts`, written before it was run). A bare board heeled in still
water has a **righting** moment, because the submerged volume shifts to the buried side; heel it so the **+x rail is
buried** and the prediction is a **positive** net moment and a roll rate that turns positive.

| **[M]** a bare board, `PlaneWater`, one step at 1/60 s | heel −20° (+x rail buried) | heel +20° |
|---|---|---|
| buoyancy's roll moment, N·m | **+5.474** | −5.474 |
| the net | **+0.463** | −0.463 |
| the board's own roll **rate** change, rad/s | **+0.2979** | −0.2979 |
| the `rider` residual, N·m | **0.0000** | −0.0000 |

All three predictions held: the sign, the mirror to nine decimals, and the sign against an independent reading (the
board's own measured rate). The control is deliberately **not** the sum identity, which is true by construction
because `rider` is defined as the residual; it is the sign against a physical prediction, the sign against the rate,
and that the residual **closes to zero when there is no rider for it to belong to**. The test also asserts the ledger
is a pure observer — 30 steps of a moving, heeled, spinning board give an identical trajectory to the digit with it
on — and that it is off by default.

**And the control found a bug in the existing yaw ledger, which is why the roll ledger is not a copy.** `waterT`
holds the explicit half of the surface-normal push, `−(h·radiation + entrained)·intoSurface`, and the settle loop's
`radiated` and `inertia` already carry that same half: their sum works out to `push − (D·Δu)_surface`. So booking
`waterT` **as well** counts `push` twice. The yaw ledger does exactly that (`y.addedMass += waterTy` beside its settle
entries). Measured on the control: with `waterT` in, the no-rider residual reads **0.086 N·m on a total of 0.463**
(19 %); with it out, **0.0000 on 0.463** [M]. The roll ledger leaves it out and books the two `waterT` entries that
have **no** settle twin — ruling 3's wall push and `plateWall` — at their own sites. **The yaw ledger is not touched
and the fix is not claimed for it**: nothing in this round reads yaw, step 3.2q's own numbers were published with
that residual in them, and correcting a published instrument is its own round. It is written down here and in
`BoardBody.roll`'s own doc so the next reader of `yaw.rider` knows.

## 4. (B) What rolls the board, per source, in newtons-metres

The arm is 3.3g's own: full stick, the deck filter, twelve runs (two stances × six entry speeds), on the
Canyon-matched `FaceWater`. **It reproduces 3.3g's published twelve to the digit** — 12 of 12 falls at
**1.12–2.67 s**, bank peak **63.5–70.0°**, roll peak **63.7–91.4°**, rail peak **75.7–90.1°**, drift peak
**3.2–20.9°** — so these roll moments belong to the same population as that round's in-plane forces and can be read
beside them.

| **[M]** N·m about the board's long axis, + = further over the way the run went, **1,118 commanded frames pooled** | median signed | peak absolute |
|---|---|---|
| **rider (a RESIDUAL)** | **+33.47** | 118.74 |
| **pressure** | **−20.46** | 115.07 |
| buoyancy | −3.81 | 7.08 |
| radiation | −1.65 | 8.68 |
| addedMass | −1.16 | 47.70 |
| fins | −0.47 | 12.61 |
| rails | +0.09 | 0.48 |
| friction | +0.04 | 0.22 |
| gyro | −0.00 | 0.30 |
| bed, froth, suction | 0.00 | 0.00 |
| **the water, all of it (the ten + gyro)** | **−33.40** (per run −57.81 to −21.72) | — |
| **the NET** | **+0.04** (per run **0.01–0.11, positive in 12 of 12**) | — |
| the sum of the medians, for the caveat | +6.06 | — |

**Four readings, and the third is the mechanism.**

1. **Nothing in the water rolls the board over.** Every entry of consequence resists; the only two with the roll's
   own sign are `rails` (+0.09) and `friction` (+0.04), which are rounding. The thing rolling the board is the
   **rider's own contact**.
2. **And the contact's moment is exactly what a foot-borne load off the centreline makes, which is the falsification
   test passing rather than my claim.** Divide the residual by the contact's own normal load and it implies the load
   presses **0.0525 m** off the board's centreline at the median (peak 0.309), against the feet's modelled half-width
   across of **0.13 m** [R, `riderPosture.ts:96`]. It is inside the feet. A residual implying an arm the feet do not
   have would have meant the residual was holding something else.
3. **So the net is a one-part-in-a-thousand difference between two 33 N·m columns, on a roll inertia of
   0.0262 kg·m² where 1 N·m is 2,187 °/s².** The measured roll acceleration over the turn is **21–234 °/s²** and the
   measured roll rate peaks at **146.7–353.7 °/s** [M]. **That is the answer to "the last 14–41° of roll is asked for
   by nobody": it is asked for by the rider's feet, and it is the error in the hull's answer.** `MAX_BANK` (70°) and
   `RAIL_RANGE` (50°) cap what the rider's **body** asks for; **nothing caps the moment the contact then delivers to a
   2.5 kg board**, and the hull has to find the last tenth of a percent.
4. **The percentage caveat, and why no share of the net is printed.** Each entry's figure is its own median over the
   pool and medians do not sum: the eleven sum to +6.06 against the median of the sum, +0.04. And the net is **0.1 %
   of the larger column**, so a share of it would divide by a near-zero — the printed table says so in those words
   and quotes shares of **the water column** instead, where the denominator is 33 N·m. 3.3g's §4 had to add that
   caveat after the fact; here it is in the instrument.

**The residual, checked against an independent reading.** `rollBy.rider` is a residual, so it is not evidence of a
contact torque on its own. `deck.ts` therefore also computes the contact's roll moment **directly**, from two public
fields the ledger never touches — `AttachedRider.contact.force` (the mean force on the rider over the step, N, world)
and `AttachedRider.contact.centreOfPressure` (where it acts, board frame) — as `(P − C) × F` on the board's long
axis, about the same composite centre the ledger's torques are taken about.

| **[M]** | full stick, deck filter (12 runs) | unsteered (12 runs) |
|---|---|---|
| the residual's median, N·m | +33.47 | +17.84 |
| the direct reading's median, N·m | **+39.19** | **+20.81** |
| \|direct − residual\|, median | **4.72** | **2.13** |
| the same, peak | 143.20 | 28.74 |
| the implied arm, m (median · peak) | 0.0525 · 0.309 | 0.0228 · 0.122 |

**The two agree in sign, in order and within 14 % at the median on two populations, and disagree by up to 143 N·m
frame by frame.** So the residual **is** the rider's contact in the main, and is not the contact exactly: it also
carries the pair's own inertia resisting the roll inside the 9×9 solve, and `contact.force` is a step mean on the
rider where the residual is accumulated per substep on the board. It is reported as a residual everywhere in this
document for that reason.

**The second population, which is why this is not one cell.** The unsteered twelve — Part 24's own twelve, 12 of 12
falls at **0.77–1.70 s**, bank peak 20.7–65.7°, roll peak 20.9–63.0°, rail peak 10.9–62.9°, drift peak 1.9–4.9°, all
reproduced to the digit — give **rider +17.84 against the water's −17.78, a net of +0.03 (per run 0.00–0.06, positive
in 11 of 12)**, with `pressure −5.85`, `buoyancy −2.23`, `addedMass −1.33`, `radiation −1.19`, `fins −0.39`, and a
roll acceleration of 4–128 °/s² [M]. **The same shape, and the contact's moment scales with the steer, 17.8 → 33.5
N·m, as it must.**

**The two runs of twelve that do not fit it, named rather than averaged away.** Both are the slowest entry (−3 m/s),
which barely rolls: the Compress one reads a net of +0.02 with the **columns reversed** (water +0.32, rider −0.30) and
the tall one a net of 0.00 at the printed precision (water −0.40, rider +0.41), at roll peaks of 23.7° and 24.8°
against the arm's 20.9–63.0° [M]. At a third of a newton-metre neither column is a contact pressing on a rail; they
are two runs where almost nothing is twisting the board, and they are why the unsteered arm's sign count is **11 of 12
and not 12**. On the full-stick arm, where the board does go over, the per-run net is positive in **12 of 12** at
0.01–0.11 N·m.

**And at the fall frame**, per run, the water's resistance is still there and the rider's push has largely spent
itself: rider **+1.9 to +32.6**, pressure **−30.0 to −2.8**, buoyancy −1.6 to +0.5, addedMass −0.8 to +0.8,
radiation −0.6 to 0.0, fins −3.3 to +3.1, for a net of **−11.0 to +0.9 N·m** [M]. By then the board is at 63.7–91.4°
of roll and the fall frame is inside the capsize, which is why §4's number to design on is the commanded turn's.

## 5. (B) What the roll moment does to step 3.3g's attribution — the refutation

**The two attributions are in opposite orders, and this is the round's second result.**

| **[M]** source | share of the in-plane force `F_s` (3.3g §4, same cell) | share of the water's roll column (here) | which way it pushes the roll |
|---|---|---|---|
| **buoyancy** | **81.0 %** | **11.4 %** | resists |
| radiation | 14.7 % | 4.9 % | resists |
| addedMass | 10.4 % | 3.5 % | resists |
| rails | 9.5 % | −0.3 % | pushes it on |
| **pressure** | **5.7 %** | **61.3 %** | resists |
| friction | 1.1 % | −0.1 % | pushes it on |
| fins | −14.1 % | 1.4 % | resists |

- **Buoyancy is 81 % of the force that slides the board out and 11 % of the moment that holds it up.** `pressure` —
  the one entry already resolved along the **hull's** own normal, and the one whose 5.7 % was 3.3g's falsification
  test *passing* — is **61 %** of the roll column.
- **The three entries on the water-surface normal together are −6.62 of the water's −33.40 N·m, 20 %** [A]. So
  re-pointing them onto the hull normal, which my brief parked for this round and 3.3d measured at 46 % of buoyancy
  alone, would move **a fifth of the force resisting the capsize**, in a direction nobody has measured. **That is a
  reason to measure it before ruling on it, and the opposite of a reason to assume it helps**: on this axis the three
  are on the side that keeps the board under him.
- **I am not claiming the force attribution was wrong.** It was right about the force; `tilt = atan(F_s/F_n)` is exact
  and 3.3g's column is the residual tilt in newtons. What is refuted is **transferring its ranking to the roll**, which
  my brief invited by carrying the force column forward as the thing to design on — and which 3.3g itself warned
  against in its own §8: *"an in-plane force at the hull is not the same thing as a roll moment about the pair's
  centre of mass."* It was right to warn, and the warning now has numbers.

## 6. What I refuted

- **My brief's premise that the last 14–41° of roll is "asked for by nobody".** It is asked for by the rider's own
  feet: **+33.47 N·m** median through the commanded turn, pressing 5.25 cm off the centreline, inside the feet's own
  13 cm. What nobody commands is the **cap**: `MAX_BANK` and `RAIL_RANGE` bound the body's lean reference, and nothing
  bounds the contact moment that follows from it onto a 0.0262 kg·m² board. Sixteen consecutive rounds have now
  refuted their brief's premise, and this one is mine.
- **Transferring 3.3g's in-plane force ranking to the roll axis**, §5. Buoyancy 81 % → 11 %, `pressure` 5.7 % → 61 %,
  and every water entry of consequence on the resisting side.
- **The idea that restoring the crouch's reach could meet the owner's bar.** It restores the reach by 1.8–2.0× to
  above the standing stance's, moves the gate from the reach to the moment, lengthens the ride in 8 of 8 cells — and
  **24 of 24 still fall in each of four arms**. The brief named this outcome in advance and required it as the
  headline; it is §0 item 2.
- **The yaw ledger's `rider` residual as a closing one**, §3: `waterT`'s explicit half is booked twice, measured at
  **0.086 N·m on a total of 0.463** with no rider on a static heel. Reported, not fixed, because nothing here reads
  yaw and 3.2q's published numbers carry it.
- **My own first sign plan for the roll columns**, which latched the run's sense at `STEER_FROM` the way `steerSign`
  does. At `STEER_FROM` = 0 the roll is 0.0° and `Math.sign(0) || 1` picks +1 regardless, so every run's columns would
  have been signed by nothing. Found by running it on 3.3g's own arm, where the arm's own setting is `STEER_FROM=0`.

## 7. What I will not claim

- **I will not claim the residual IS a contact torque.** It is a residual. The independent reading agrees in sign, in
  order and to **4.72 N·m at the median** on one population and **2.13** on the other, and disagrees by up to
  **143 N·m** on a single frame, because the residual also carries the pair's inertia inside the solve. Everything in
  §4 calls it a residual.
- **I will not claim the near-cancellation is a bug.** A surfer standing on his inside rail and a planing hull holding
  him up **is** a near-cancellation; that is what planing is. What I claim is its size — two ~33 N·m columns, net
  0.1 % — and that the over-roll lives in its error on an inertia of 0.0262 kg·m².
- **I will not claim `pressure`'s −20.46 N·m is all hull force.** Its peak absolute is **115 N·m** against a median of
  −20.46, and 3.3g measured its *in-plane* residue tracking the roll **rate** at −0.102 N per °/s (R² 0.873) — a
  within-step rotation, not a hull force. The same question is open on this axis and **I did not measure it here**.
  Until it is measured, `pressure`'s 61 % share of the roll column is an upper bound on its hull part.
- **I will not claim the restored reach is free.** Compress's held residual goes 0.86–3.69 → **1.64–56.96 m/s²**, its
  roll at the fall −43.6–89.8 → **−62.5–102.2°**, and its longest light window 0.10 → 0.21 s. §2.3.
- **I will not claim the stance table can meet the owner's bar.** Both of its gates are now measured — the moment bar
  Compress wins by 1.26–1.67× (3.3g) and the reach it now wins by 1.8–2.0× (here) — and he falls 12 of 12 either way.
  Whatever meets that bar is not in this table.
- **I will not claim the roll ledger's `rider` column names what a *human* would do.** It is our contact's moment on
  our board, with our feet's 0.13 m and our 2.5 kg board's 0.0262 kg·m². No source is offered for any of the three.
- **I will not re-promote 3.3g's `unwind` column, or 3.3f's**, and I did not measure the post-centring fall of the
  runs that finish the turn.
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed rather than paddled in, `deck.ts`'s six
  entry speeds and `fall.ts`'s three are different populations and are **never pooled**, and every span above is the
  **whole population of its arm**, not a confidence interval.
- **No bot ride is offered as evidence of feel anywhere in this document.**

## 8. What changed, and why each piece is allowed

- **`src/physics/humanBalance.ts`** — `stanceRoom(depth, reach?)`. One optional argument; with `'keep'` the hip range
  and arms are read at the riding stance and the knees' travel is the stance's own. The default call is byte-for-byte
  the table it always was, which `humanBalance.test.ts` asserts (`stanceRoom(0.3, undefined)` equals
  `stanceRoom(0.3)`).
- **`src/physics/AttachedRider.ts`** — the `stanceReach?: 'keep'` option, one private field, one constructor line, and
  **all five `stanceRoom` call sites** threaded, so the hip's stop moves with the test's credit (§1).
- **`src/physics/BoardBody.ts`** — `static rollLedger` (off), the `roll` ledger object, one private `rollOf` helper,
  and the seven fill sites plus the reset and the residual. **Nothing is applied, nothing is read by the game**, and
  `rollLedger.test.ts` asserts the trajectory is identical to the digit with it on.
- **The plumbing**, in the shape the three existing rider switches use: `RideSessionOptions.stanceReach`,
  `SurfZoneConfig.stanceReach`, `SurfZoneRunner`'s pass-through, `PhysicalMode`'s `stanceReachSwitch`
  (`?stanceReach=keep`, case-insensitive, anything else the default), and **`main.ts`'s online-room override pins it
  to `undefined`** — which `PhysicalMode.test.ts` enforces by reading `main.ts` and failing if the pin is removed.
- **`docs/research/new-rider/3.3/deck.ts`** — `ROLL=on` (the ledger, §6's block, and the independent contact reading)
  and `REACH=keep`, both off by default. **With both unset the probe reproduces its own published record**: at
  `STEER=0` with no switches it gives bank peak 20.7–65.7°, roll peak 20.9–63.0°, rail peak 10.9–62.9°, drift peak
  1.9–4.9° and 12 of 12 falls at **0.77–1.70 s** — Part 24's published twelve to the digit, run on this branch with
  the new source fields in place.
- **`docs/research/new-rider/3.3/fall.ts`** — `REACH=keep`, off by default; its shipped arm reproduces 3.3g's own
  (24 of 24 at 1.12–4.15 s on the world filter, tall 1.20–4.15 / Compress 1.12–3.98, heights 0.64–0.84 / 0.50–0.55,
  `a_max` 1.51–2.00 / 2.33–2.53, reach 0.25–0.35 / 0.16–0.18 — 3.3g §2b's table, to the digit).

## 9. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- the two probes type-checked separately on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, with `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/deck.ts`, `docs/research/new-rider/3.3/fall.ts`, `src/physics/BoardBody.ts`,
  `src/physics/humanBalance.ts` and `@types/node`.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **56 files, 606 passed, 21 expected fail** (55/601/21 in 3.3g; the five new passes are
  `rollLedger.test.ts`'s four and `humanBalance.test.ts`'s one, which is **21 of 21** in that file).
  `vitest run src/game src/scene/rig`: **70 files, 730 passed** (729 in 3.3g; the one new pass is
  `PhysicalMode.test.ts`'s switch test, **97 of 97** in that file).
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail**.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**, the reference,
  so a red there would be news as `runner-test-file-excluded` has it. `src/wave/SurfZoneSimulation.test.ts` is closed
  by reading, as `c2-step5g.md` §7.4 allows: this round touches no solver, no wave and no spot file.
- **the shipped rider is proved unchanged against a published baseline**, as the brief required: `deck.ts` at
  `STEER=0` with no switches reproduces Part 24's twelve to the digit on this branch (§8), and `fall.ts`'s shipped
  world-filter arm reproduces 3.3g §2b's own table to the digit. A behavioural leak in `stanceRoom`'s new default
  path, or a report field that changed behaviour, would move those falls.
- **the switch is pinned off for the online rooms** in `main.ts`'s room overrides, and `PhysicalMode.test.ts` reads
  `main.ts` and fails if the pin is removed — the same assertion `?kneeRoom` carries.
- **the Canyon byte check** (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, **fresh** spin-ups into new state paths),
  with the brief's three cautions read rather than assumed — the wrapper is one **prepended** line on the bundle
  (`globalThis.location = { search: '?canyonWaves=true' }`, because a dynamic import makes rolldown split the chunk),
  the grid line read, and the "spun up on the CPU in … s" line read so that no kept `.sea` was imported (both state
  files were written by this run, into a `bench33h/` directory that did not exist before it):
  - Canyon B (`?canyonWaves=true`), **400 × 451 = 180,400 cells**, spun up on the CPU in **42.9 s**: snapshots
    **a367d938f15fa934**, state **9e5831f80e38abd9** — **the same as main.**
  - the default Canyon, **400 × 507 = 202,800 cells**, spun up on the CPU in **61.3 s**: snapshots
    **ea3d57a4d49f4b48**, state **a1a2555739210f96** — **the same as main.**

  All four match, which they must: this round touches no solver, no wave, no spot file and no hull law, and its one
  behavioural change is an opt-in balance switch that is off by default and off in the bench. The raw output is
  `results/33h/33h-canyon-byte-check.txt`.
## 9b. The deletions column, read line by line

`git diff --cached --stat origin/main`: **31 files, 1,915 insertions and 15 deletions** — and **all fifteen
deletions read, one by one. Every one is a line replaced in place; nothing was removed and nothing was reverted.**

- `humanBalance.ts`, **4**: `stanceRoom`'s signature and its three `return` lines, replaced in place with the
  `const room = …` form plus the `reach === 'keep'` branch.
- `AttachedRider.ts`, **5**: the five `stanceRoom(...)` call sites, each replaced in place with `this.stanceReach`
  passed.
- `main.ts`, **2**: the online-pin comment and the overrides object, replaced with `?stanceReach` named and
  `stanceReach: undefined` added.
- `SurfZoneRunner.ts`, **1**: the config pass-through line, replaced with `stanceReach` added.
- `PhysicalMode.test.ts`, **1**: the import list, replaced with `stanceReachSwitch` added.
- `fall.ts`, **2**: its row label and its header `console.log`, replaced with `stanceReach` named in both.

`origin/main` is still **5147f559**, which is this branch's own merge base, so there was no mid-round merge to rebase
onto — and the column was read rather than that being assumed. `humanBalance.test.ts`, `rollLedger.test.ts`,
`BoardBody.ts`, `RideSession.ts`, `SurfZoneSimulation.ts`, `PhysicalMode.ts` and `deck.ts` are **pure additions**,
zero deletions each.

## 10. Files (3.3h)

- `src/physics/humanBalance.ts` — `stanceRoom(depth, reach?)` and the doc that states what the table's limits are and
  which design bar `'keep'` crosses. `src/physics/humanBalance.test.ts` — eight depths, the knees' travel untouched,
  the default unchanged, and the √5 ratio (21 of 21 in the file).
- `src/physics/AttachedRider.ts` — `stanceReach?: 'keep'`, one field, one constructor line, five threaded call sites.
- `src/physics/BoardBody.ts` — `rollLedger`, the `roll` ledger, `rollOf`, the seven fill sites, the reset and the
  residual, and the `waterT` double-count note (§3). `src/physics/rollLedger.test.ts` — the positive control, the
  no-rider closure, the per-entry impulse bound, and off-by-default + pure-observer (4 tests).
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts`, `src/main.ts` — the plumbing and the online pin. `src/game/PhysicalMode.test.ts` — the
  switch, the spots, and the pin read out of `main.ts`.
- `docs/research/new-rider/3.3/deck.ts` — `ROLL=on`, `REACH=keep`, the roll columns, the independent contact reading,
  the implied arm, §6's and §A's blocks. `docs/research/new-rider/3.3/fall.ts` — `REACH=keep`.
- `docs/research/new-rider/3.3/results/33h/` — nine arms with their printed tables beside their rows
  (`deck-s0-baseline`, `deck-s0-roll`, `deck-s1-deck-roll`, `deck-s1-deck-roll-reach`, `fall-world-shipped`,
  `fall-world-reach`, `fall-deck-shipped`, `fall-deck-reach`) and `33h-canyon-byte-check.txt`.

## 11. For the owner, in plain words — and the shot list

**You ruled that a deep crouch keeps its arms and hip swing. I built it, it does exactly that, and he still falls
every single time.**

The number you were owed: in a crouch his catching reach was **16 to 18 centimetres** and it is now **31 to 37** —
**about double**, and **more than he has standing** (25 to 35). And it moved only that: his weight still sits
**50 to 55 cm** over his feet in the crouch, so the tipping sum you were right about is untouched. Standing is
**identical in every single column**, which is how I know the switch does what it says and nothing else.

**What it bought.** He rides longer in **every one of the eight cases** I measured. The gentlest turn — your own case,
the low speed of getting into position — goes from falling at **2.1 seconds to 3.6**. And the *reason* he falls
changed: before, in a crouch, he had already run out of reach and was just waiting for his weight to cross his feet;
now it is his weight crossing his feet that goes first. **That is your sum becoming the thing that decides it.**

**What it did not buy, and this is the headline.** **He still falls, 24 out of 24, in all four tests.** At the
gentlest stick, in a crouch, 6 of 6. **So your bar is not met, and the stance table cannot meet it** — I have now
measured both of its gates, he wins both in the crouch, and he goes over anyway.

**It is also not free.** With his arms and hips loose in a crouch he throws them hard: the sideways pull he holds goes
from about 4 m/s² to as much as **57**, and the board goes past flat-on-its-side more often than before (to 102°).
You may well feel that as jerky. The switch is yours and off by default — add **`?stanceReach=keep`** to try it.

**And now the thing I said last time I would go and find: what actually rolls the board onto its side.**

**It is him. It is his own feet, and every force in the water is pushing the other way.**

I built the instrument and measured the twisting force on the board, in newton-metres, one source at a time, on the
same twelve runs as last round. Through the turn: **his feet twist the board over with about 33 newton-metres**, and
the water pushes back with **33** — the hull's planing pressure doing most of it (20), with buoyancy, the water's
added mass and its radiated waves all on the **same side as the hull**, holding him up. The difference between those
two numbers is **0.04**. One part in a thousand.

**That is why it goes to 90 degrees.** A surfboard weighs 2.5 kg, and twisting it about its own length is easy: its
resistance to rolling is **0.026** in the units that matter, so **one newton-metre spins it at 2,200 degrees per
second squared**. He is standing about **5 centimetres** off its centreline — well inside his own feet, so this is
not a modelling error, it is just where a surfer stands — and that alone would flip the board instantly. The hull
cancels it to a tenth of a percent, and a tenth of a percent is still enough to put the board on its side in a
second. **Nobody caps that.** The game limits how far the *rider* can lean (50 degrees, 70 at most). Nothing limits
the twist his feet then put into the board.

**Two corrections to what I told you last round, both mine.**

First, last round I told you **81 % of the sideways force is buoyancy** and that it was the first thing in the list
that was ours. That is still true **of the sideways force**. But on the twisting force — the one that actually puts
the board on its side — buoyancy is **11 %** and it is on the **helping** side, and the hull's own pressure, which was
only 6 % of the sideways force, is **61 %**. **The two lists are in opposite orders**, and the one that matters for
the capsize is the one I had not measured. I was carrying last round's ranking forward as if it answered this
question, and it does not.

Second, and this changes what I would ask of you: **the three forces I asked you to rule on** (buoyancy, the water's
added mass, the waves it radiates) are, on the twisting axis, a **fifth of the force that is holding the board under
him**. Turning them onto the hull's own direction would move a fifth of what is keeping him upright, in a direction
I have not measured. **So I withdraw the recommendation to do it next. It needs measuring first, and it is no longer
obviously a fix.**

**What I would do next, and it follows straight from the number.** The board is rolled by his feet and stopped by the
hull, and the two agree to a thousandth. Two things follow and both are testable:

1. **A real surfboard is not 2.5 kg of roll resistance with a rigid man bolted to it.** A surfer's legs are a joint:
   when the board rolls under him, his ankles and knees give, which is exactly the thing that stops a board rolling
   out from under a person. Our rider is rigid at that joint, so the full 33 newton-metres goes straight into a board
   that cannot resist it. **That is the two-body rider**, which is already on the list from the duck-dive round, and
   this is now a second measurement pointing at it.
2. **Or something caps the twist.** Nothing in the code limits the moment his feet put into the board, only the angle
   his body leans at. That is not a motor — it is the ankle he does not have.

**Nothing in the game changed by default this round.** One thing to type (`?stanceReach=keep`), one measuring tool
that does nothing unless a probe turns it on, and no force, no hull law and no number in the physics moved.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, which is your test spot. One change at a time, as always.

1. **`?rider=new&canyonWaves=true`** — the crouch as it ships. Catch a wave, get into position at low speed, press
   Compress, make one gentle turn. How long before he goes, and does it feel like his arms are stuck?
2. **`?rider=new&stanceReach=keep&canyonWaves=true`** — the same wave, the same gentle turn, with the crouch's arms
   and hips free. **Two questions:** does he stay on noticeably longer at that gentle speed (the measurement says
   about 1.5 seconds longer), and **does it feel loose or jerky** — because the measurement says his hips and arms
   now throw much harder, and that may read as a surfer flailing rather than crouching.
3. **The same two with `?feltFrame=deck` added**, which is the filter you have been riding, if you want them matched
   to your last sessions.
4. **And a shot I would like for the roll finding, not the switch:** on any of the above, when he goes over, **say
   whether the board goes out from under him or he falls off it.** The measurement says the board rolls, hard, and in
   8 of 12 runs his feet move across faster than his body. If that is not what it looks like to you, the instrument
   and the ride disagree and I want to know.

**One decision I would like from you**, and it is a ruling, not a ride: **do you want the crouch's reach kept on by
default?** It lengthens every ride I measured and prevents no fall, and it makes the crouch throw harder. I would
leave it opt-in until you have ridden shot 2 and told me whether it feels right, because the only thing it is clearly
better at is the thing the measurement sees and you cannot.

# Part 32 — the ankle is already there, it is already carrying the whole 33 N·m, and bounding it to what the soles can transmit makes the fall worse

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33i`, cut from `main` at
**730e71ac** (step 3.3h's merge), so Part 31 is its base. It ships **one opt-in behavioural switch**
(`?ankleLimit=feet`), **one read-only instrument** (`AttachedRider.ankle`, `AttachedRider.ankleLedger`), **one new
probe** (`3.3/stills.ts`, which draws the fall), two probe additions, one new test file, and **156 runs** over eleven
arms.

Tags as in 3.2 and 3.3: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source; **[I]** my
inference from a stated model; **[A]** arithmetic on measured numbers, labelled as such.

## 0. The seven sentences the round is for

1. **The owner's bar is not met, and nothing in this round moves it.** `fall.ts`, four arms of 24 runs: **24 of 24
   fall in each**, and **the quarter-stick Compress cell — their own case, the low speed of getting into position —
   falls 3 of 3 on each filter, 6 of 6 across the two, shipped and bounded alike** [M]. That is the headline, first,
   as the brief required.
2. **My brief's premise is false, and reading the code was enough to refute it before anything was built.** *"Not a
   cap, an ankle he does not have"* — he has one. `AttachedRider` carries the body's bank θ as the **eighth unknown of
   the board's own solve**, and the ankle is a spring–damper on the joint's own angle,
   `τ = K(θ − φ − δ) + (Kh + C)(θ̇ − φ̇)`, with `K = HUMAN_ANKLE_STIFFNESS` = **800 N·m/rad** and
   `C = HUMAN_ANKLE_DAMPING` = **80 N·m·s/rad** for the new rider, the rest δ bounded to ANKLE_REST_RANGE = 14.32°,
   implicit in the solve and with its reaction in place [R]. Its stiffness is **already sourced, and already above a
   human's**: measured intrinsic ankle stiffness in standing is 0.44–0.93 m g h (Vlutters et al. 2015), 0.91 (Loram
   and Lakie 2002), 0.08–0.75 across postures (Amiri and Kearney 2020), and 800 is about **1.4 m g h** [S, R,
   `humanBalance.ts:43`].
3. **And the ankle is not merely present — it is the whole of the 33.47 N·m.** Rows 0–5 of the coupled solve the
   standing rider actually runs are **the pair's** momentum (`solveStep`'s own comment [R]), so an internal joint
   torque must not appear in them and does not; the board's roll comes out of that solve through the point the body is
   carried at, which while banking carries the body's **own across offset** [R]. **So the ankle's couple reaches the
   board with no separate term**, and the two should be one moment read twice [I]. Measured, on two populations:
   **|ankle − the roll ledger's own residual| = 0.95 N·m at the median (per run 0.17–6.52) against columns of
   16–18 N·m unsteered, and 4.24 (per run 1.47–15.52) against 23–33 N·m at a full stick** — while |ankle **+**
   residual| is **34.67** and **60.76** [M]. **The question "how much of the 33 N·m does a real ankle absorb" has the
   answer "all of it, and it is already doing so".**
4. **The joint's own angle is small, so the roll is not running away through an open ankle.** θ − φ is **0.76°** at
   the median unsteered (peak 1.1–11.3° per run) and **0.06°** at a full stick (peak 13.1–20.5°) [M] — not the 14–41°
   by which the roll exceeds the commanded lean. **The body goes over WITH the deck**, tracking it to within a few
   degrees the whole way down (bank 23.1° against roll 21.3°, 32.4 against 32.3, 44.2 against 45.6, 59.5 against
   61.3) [M].
5. **What IS unenforced is the sole's own bound, and it is breached at the peaks and nowhere else.** The moment the
   soles can transmit is `legLoad × the feet's half-width across` = **91.7 N·m** at the median on a 705 N load — the
   bound `AttachedRider`'s own LEAN_IN_RATE note derives as *"m g d = 716 N × 0.13 m = 93 N·m"* and which nothing
   applies [R]. The ankle's demand uses **17.4 % of it at the median unsteered and 30.1 % at a full stick**, is
   **never past it in 12 of 12 unsteered runs**, and goes past it in **2.3–10.1 % of substeps at a full stick, by up
   to 4.94×, with a peak demand of 717 N·m** [M].
6. **So I built the bound — `?ankleLimit=feet`, opt-in, off by default, pinned off online — and it makes the fall
   worse.** Twelve full-stick runs: the ride goes **1.12–2.67 s → 0.83–2.55 s**, the roll peak **63.7–91.4° →
   73.9–95.2°**, the roll rate at the fall **−268 to +255 °/s → −961 to +875 °/s** (peak 146.7–353.7 → 466.9–979.9),
   and the joint's own angle opens from a 20.5° peak to **47.3°** while the clipped demand climbs to **2 087 N·m**
   [M]. Over 24 runs the rider's centre of mass ends outside his own feet in **16 of 24 against the shipped 5 of 24**,
   and a whole foot-width (0.26 m) out in **6 of 24 against 0** [M]. **A stiff spring that saturates is not an ankle
   giving; it is an ankle letting go.**
7. **And the stills settle the coordinator's question, with a refutation of step 3.3g's own reading of its own
   column.** Through the last half-second of the full-stick fall the deck rolls **17° → 90°** while the rider's centre
   of mass stays **within two and a half centimetres of the board's own centreline** and ends five millimetres off it;
   over 24 runs it is never more than **0.173 m** out, **inside** the feet's own 0.13 m in 22 of 24, and inside
   **0.113 m** in all 17 runs whose roll passes 60° [M]. **The board does not go out from under him; it tips him
   off.** 3.3g's *"the board slides out from under him"* cannot be what its column says, because
   `deck.ts`'s `feetAcross` is `board.velocityAt(captureFeet)` and `captureFeet` is **a point fixed in the board's
   frame** [R] — that column can contain no sliding, only carrying. **The owner's "I think the surfer falls over" and
   the roll measurement are the same event.**

## 1. (A) What already exists, read before anything was built

The brief's rule 3 says *"assume this brief contains an error — the likeliest is that one joint is the answer."* The
error was earlier than that: the joint is already built, and here is what it is [R].

| **[R]** the shipped ankle (`AttachedRider`) | |
|---|---|
| the coordinate | the body's bank θ from the **world vertical** toward the board's **+x** side, the **eighth unknown** of the board's 9×9 solve (`system[7N+7] += m + h(Kh + C)/L²`) |
| the joint's angle | **θ − φ**, φ the board's roll about the heading, the same axis the roll ledger books |
| the torque | `τ = K(θ − φ − δ) + (Kh + C)(θ̇ − φ̇)`, backward Euler, implicit in the solve and *"at once and with no lag"* |
| the generalized force | `rhs[7] += t·f − h(τ_ankle + τ_swing)/L`, row 7 being the body's across rate on the leg |
| the reaction | the live path for a standing rider is the coupled 9×9 (`coupleStanding`), whose **rows 0–5 are the pair's momentum** (`solveStep`'s own comment), so an internal joint torque must not appear in them and does not — the board's roll comes out of the coupled solve through `carried`, the point the body is carried at, which **while banking carries the body's own across offset** (`prepare`: `carried.addScaledVector(across, off.dot(across))`). On the fallback path (`pushBoard`, used when the contact is infeasible) the reaction is applied at the **rider's centre of mass** |
| K, C, new rider | **800 N·m/rad**, **80 N·m·s/rad** (`HUMAN_ANKLE_STIFFNESS`, `HUMAN_ANKLE_DAMPING`) |
| the rest the balance may command | ±**ANKLE_REST_RANGE** = 0.25 rad = **14.32°**, further narrowed past the rail's bite |
| the surfer's axis, named in the code | *"the ankle across (toes and heels: the surfer stands side-on, so this is the human's own **sagittal** ankle)"* |

**That last row is the brief's second error, and it changes which source is the right one.** The brief asked for *"a
human ankle's inversion/eversion range and its stiffness"*. A surfer stands **across** the board, so the board's roll
axis is the human's **toe–heel** axis: **plantarflexion and dorsiflexion**, not inversion and eversion. Inversion and
eversion would be the board's **pitch**. Sourced on the right axis, maximal isometric sagittal ankle torque in men
aged 20–29 is **121.9–131.0 N·m plantarflexion and 39.5–41.9 N·m dorsiflexion per ankle**, left and right means,
n = 27 of a study of 345 healthy people aged 5–80, seated with hip, knee and ankle at right angles, two 2–4 s maximal
contractions [S, Moraux et al., *BMC Musculoskelet Disord* 2013;14:104, Table 1]. Two ankles together therefore give
roughly **250 N·m on the toes and 80 N·m on the heels**. One honesty note on that fetch: the adult rows of the
extracted table sum to 274 subjects against the text's 288, which the extraction flagged, so the **band** is what I
use and not any single digit.

**Which puts the sole's own geometry, not the muscle, in charge.** `legLoad × 0.13 m` = **91.7 N·m** at the measured
median load sits *inside* the two-ankle dorsiflexion band (80 N·m) and far under the plantarflexion one (250), so
whichever way he leans **the foot's own edge binds before the muscle does**, and `?ankleLimit=feet` needs no
hand-picked constant. Against it: on the heel side a human's muscle is about **13 % tighter** than the geometry, and
this switch is the geometry alone.

**Two earlier rounds already swept the two obvious knobs on this joint, and both are in the code with their numbers**
[R, `3.2/README.md` Part 22]: `ANKLE_REST_RATE` (the rest's slew bound — at 1.5 rad/s it cut the ankle's peak torque
from 181–290 to 59–162 N·m and *"the falls are unchanged at 0.38–0.45 s against 0.38–0.43"*) and `ANKLE_PLUMB` (the
deck's roll carried in the rest — it brought the bank peak from 20.7–65.7° to 12.1–34.6° and *"12 of 12 still fall"*).
Doubling the stiffness to a braced 1 600/160 *"did not damp the free roll"*. **So three of the four things one can do
to this ankle had already been measured and kept off before my brief asked for an ankle to be built.**

## 2. (B) The instrument, and the prediction it was written to test

`AttachedRider.ankle` is the roll ledger's twin one joint over, off behind `AttachedRider.ankleLedger`, booked at the
**one** site the torque is now set (`setAnkle`, called from all three `prepareBank` paths), reset in `beginStep` as the
board resets its own.

**The datum, stated.** Every entry is about the board's **roll axis along the heading**, the axis `ankleTorque` is
computed on. `angle` is the joint's own **θ − φ**, positive when the body leans further toward the board's **+x** than
the deck is rolled. `torque` is `ankleTorque` in the sign the solve uses. `torque`, `demand`, `angle`, `rest`, `bound`
and `load` are **running means over the step's substeps** (32 of them, standing), so nothing divides by anything;
`peak`/`demandPeak`/`anglePeak` are the step's largest absolutes and `over` counts substeps past the bound.

**The probe's sign is `rollSense` and nothing else.** `deck.ts` multiplies the ankle columns by the sense of the
deck's roll at the **last** frame, the one convention its roll columns use, and **applies no second negation to make
the pairing come out** — which is the trap 3.3g fell into with `sign(nx)` and 3.3h caught in its own first sign plan.
Whether the ankle's torque is then in `rollBy.rider`'s own sense is **printed as a measurement**: §7 of the probe
gives the median of (ankle + residual) *and* of (ankle − residual), signed and absolute.

**The prediction, written before the instrument had run once** (`33i-stills/`'s own note and this round's scratch
record; reproduced here verbatim in substance):

> **P1.** The ankle's booked mean torque will be of the same order and the same sign as the roll ledger's `rider`
> residual, +33.47 N·m, because the ankle's couple reaches the board with **no separate term**: rows 0–5 of the solve
> are the pair's momentum, so an internal torque belongs only in the joint's own row, and the board's roll comes out
> of the coupled solve through a carried point that moves across with the body's bank. (The same statement on the
> fallback path, where the reaction is applied at the **rider's centre of mass**: for a massless leg, moments about
> the foot give `τ_ankle = (r_cm − r_foot) × F`, so
> `(r_foot − r_board) × F − τ_ankle ≡ (r_cm − r_board) × F` — applying the reaction at the centre of mass with no
> separate couple **is** the foot force plus the ankle's couple.) Predicted within a factor 2 of 33 N·m.
> **P2.** The demand will be inside the soles' own bound at the median (33 N·m over 720 N is an arm of 0.046 m against
> the feet's 0.13 m) and will breach at the peaks, where 3.3h's implied arm reaches 0.309 m.
> **P3.** The joint's own angle will be of order τ/K = 2.4° plus the rest, **not** the 14–41° of excess roll.
> **The falsification, stated in advance:** if the booked torque came out at hundreds of N·m, P1 is wrong, the
> identity does not hold in this code, and **the ankle torque is an unpaired torque and a hidden motor** — which would
> be the finding instead.

**All three held, and the falsification did not fire** (§3). The positive control is
`src/physics/ankleLedger.test.ts`, five tests written before they were run: the pairing's **sign and size against an
independent reading** (the roll ledger, which the ankle ledger never touches), the bound's own arithmetic against the
posture's published 0.13 m half-width (a factor-of-two slip between half-width and width is the shape of error this
track keeps catching), that the clamp clamps and that `absorbed` is exactly **0** without the switch, that the joint's
angle is small, and that the ledger is off by default and a pure observer to the digit.

## 3. (B) What the ankle carries, on two populations

The arms are 3.3h's own, re-run on this branch, and both reproduce their published records to the digit: the unsteered
twelve give Part 24's **bank peak 20.7–65.7°, roll peak 20.9–63.0°, rail peak 10.9–62.9°, drift peak 1.9–4.9° and 12
of 12 falls at 0.77–1.70 s**, and the full-stick twelve give 3.3g's **63.5–70.0 / 63.7–91.4 / 75.7–90.1 / 3.2–20.9°
and 12 of 12 at 1.12–2.67 s** [M].

| **[M]** N·m about the board's roll axis, + = the sense `rollBy.rider` is printed in | **unsteered**, 780 commanded frames | **full stick**, 1 118 frames |
|---|---|---|
| **the ankle's torque**, median · \|median\| · peak absolute | **+16.04** · 16.04 · 92.95 | **+22.92** · 29.58 · **717.06** |
| the same, per run (median · \|median\|) | 0.22–30.77 · 6.67–30.77 | 13.09–40.30 · 18.72–43.40 |
| **the roll ledger's `rider` residual**, median | **+17.84** | **+33.47** |
| **\|ankle − residual\|**, median · per run | **0.95** · 0.17–6.52 | **4.24** · 1.47–15.52 |
| \|ankle **+** residual\|, median · per run | 34.67 · 13.34–73.74 | 60.76 · 38.61–99.83 |
| the signed median of (ankle − residual) | **−0.86** | **−4.17** |
| **the joint's angle θ − φ**, median · peak absolute | **0.76°** · 11.33° | **0.06°** · 20.46° |
| the same, per run median · per-run peak | 0.10–3.37° · 1.1–11.3° | −1.68–4.30° · 13.1–20.5° |
| the **rest** the balance commanded, median · per run | 0.22° · −0.45–1.84° | −0.20° · −3.31–1.25° |
| **the moment the soles can transmit**, median (on a load of) | **90.9 N·m** (699.2 N) | **91.7 N·m** (705.3 N) |
| **\|demand\| / that bound**, median · per run · peak | **0.174** · 0.073–0.314 · 0.41–0.91 | **0.301** · 0.187–0.411 · **1.02–4.94** |
| **the share of substeps past the bound**, per run | **0.000–0.000** | **0.023–0.101** |

**Five readings.**

1. **The ankle's torque and the board's roll moment are one quantity.** The difference column is **0.95 and
   4.24 N·m** against the sum column's **34.67 and 60.76**, on two populations, with the signed difference at −0.86
   and −4.17. P1 held, and with it the structure: **the 33 N·m my brief wanted a joint to absorb is the joint's own
   torque.** There is nothing for a second joint to take off it that is not already the first one's.
2. **It is therefore not a mystery force and not a missing one — it is a load standing off the centreline, and the
   ankle is what holds it there.** 3.3h's implied arm of 0.0525 m, the feet's 0.13 m and the ankle's 22.92 N·m are the
   same statement in three units [A].
3. **The joint barely opens.** 0.06–0.76° at the median and 20.5° at the worst peak, against a commanded rest bounded
   at 14.32°. An ankle at 800 N·m/rad carrying 23 N·m deflects 1.6°; it is, in effect, rigid — **and it is rigid
   because it is strong, not because it is absent.** The body therefore rides the roll down with the deck, which is
   what §6's pictures show.
4. **The one unenforced limit is the sole's, and it is breached only at the peaks.** 30 % of the bound at the median;
   never past it in any of 780 unsteered frames; past it in 2.3–10.1 % of a full stick's substeps, at up to 4.94× and
   a peak of 717 N·m. **So a bound has something to bite on, and it is small and concentrated** — which is exactly
   what P2 predicted and is the reason the build in §4 was worth running rather than reasoning about.
5. **The two populations scale together**, 16.0 → 22.9 N·m of ankle against 17.8 → 33.5 N·m of residual as the steer
   goes on, which is the same scaling 3.3h measured for the residual alone.

## 4. (B) The build, and what it does — which is make the fall worse

`?ankleLimit=feet` clamps the ankle's torque to `legLoad × the feet's half-width across`. **It is a joint's own limit
and not a cap on a number**: the clamp is on the torque the joint delivers, in the one place the joint's torque is
set, and the board's share of it rides where it always did, out of the coupled solve's own pair-momentum rows —
which §3 measured pairing with the ankle to 4.24 N·m. **Past the clamp the sole is on its own edge and the body is no
longer held: it accelerates across, which is a topple, and is what a sole on its edge does.** No second force is
added anywhere.

| **[M]** full stick, deck filter, 12 runs | shipped | `?ankleLimit=feet` |
|---|---|---|
| fell | 12 of 12 at **1.12–2.67 s** | 12 of 12 at **0.83–2.55 s** |
| the deck's roll peak | 63.7–91.4° | **73.9–95.2°** |
| the rail's peak | 75.7–90.1° | 69.1–94.0° |
| the bank peak | 63.5–70.0° | **39.5–70.0°** |
| the roll **rate** at the fall | −268.2–255.0 °/s (peak 146.7–353.7) | **−960.6–874.7 °/s (peak 466.9–979.9)** |
| the roll acceleration over the turn | 21–234 °/s² | 22–263 °/s² |
| **the joint's angle, peak absolute** | 20.46° | **47.27°** |
| **the demand, peak absolute** | 717 N·m | **2 087 N·m** |
| what the bound took off it, median · per-run peak | **0.00** · 0.0–0.0 | 0.00 · **608.6–1 685.2** |
| the share of substeps past the bound | 0.023–0.101 | 0.013–0.197 |
| the residual's implied arm, median · peak | 0.0525 · 0.3092 m | **0.0508 · 0.1641 m** |
| the rider residual / the water column, median | +33.47 / −33.40 | +33.05 / −32.98 |

**Four readings, and the second is why it is off by default.**

1. **The bound does what it was built to do.** The residual's implied arm — where the contact presses — is capped from
   a peak of 0.309 m to **0.164 m**, i.e. the moment the board feels really is held near the feet's own edge. The
   clamp bites, hard, where it bites: 608–1 685 N·m taken off a single substep's demand.
2. **And the fall gets worse on every axis that matters.** Shorter ride, higher roll peak, and a roll rate at the fall
   **three times** the shipped one — 980 °/s, which is nearly three turns a second. **The mechanism is visible in the
   demand column: clipping a 800 N·m/rad spring lets the joint open (20.5° → 47.3°), and an open joint on a stiff
   spring demands more, not less (717 → 2 087 N·m).** A saturating stiff spring is a relaxation oscillator, not a
   compliant ankle.
3. **It also takes the body off the board** (§6): the centre of mass ends outside the feet in **10 of 24** runs
   against the shipped **2 of 24**, a whole foot-width out in **3 of 24** against **0**, and as far as **0.418 m** out
   against the shipped **0.173** [M].
4. **Nothing in the water column moves**, which is the control: rider +33.05 against water −32.98, net +0.05, the same
   near-cancellation 3.3h measured, because this switch touches no force and no hull law.

**So the switch ships opt-in, off by default and pinned off for online rooms, and I am not recommending it.** It is
kept for the same reason `ANKLE_REST_RATE` and `ANKLE_PLUMB` are kept at their measured-and-not-adopted values: *a
human's sole does have this limit and this is where it would go*, and the next round should not have to rebuild the
apparatus to find that out again.

## 5. The owner's bar, measured — the headline restated with its population

`fall.ts`, four arms of 24 runs (3 entry speeds × 4 sticks × 2 stances), the shipped world filter and the deck filter
the owner rides with, `?ankleLimit` shipped against `feet`. The shipped world arm **reproduces step 3.3g's own
published table to the digit** (tall 1.20–4.15, Compress 1.12–3.98, all 24 at 1.12–4.15 s, nets 12.6–88.1°) [M].

| **[M]** fell, and when | world shipped | world feet | deck shipped | deck feet |
|---|---|---|---|---|
| all 24 | **24 of 24**, 1.12–4.15 s | **24 of 24**, 1.12–4.07 | **24 of 24**, 1.30–4.05 | **24 of 24**, 1.30–3.88 |
| tall (12) | 12 of 12, 1.20–4.15 | 12 of 12, 1.20–4.07 | 12 of 12, 1.32–3.85 | 12 of 12, 1.33–3.85 |
| Compress (12) | 12 of 12, 1.12–3.98 | 12 of 12, 1.12–3.80 | 12 of 12, 1.30–4.05 | 12 of 12, 1.30–3.88 |
| **Compress at a quarter stick (3)** | **3 of 3**, 2.08–3.98 | **3 of 3**, 2.08–3.80 | **3 of 3**, 3.58–4.05 | **3 of 3**, 3.77–3.88 |
| … its held residual, m/s² | 0.86–3.69 | 0.86–1.95 | 1.57–2.30 | 0.53–2.13 |
| … its roll at the fall, ° | 10.3–53.8 | −12.0–10.1 | −43.6–13.4 | −18.6–8.3 |

**The owner's bar is "Compress must never fall at the low speeds of getting into position", 100 %, not fewer. It falls
6 of 6 across the two filters shipped and 6 of 6 bounded.** 96 of 96 falls across this round's four arms remain a
falsified model, as they were in Part 31's.

## 6. The fall, drawn — and step 3.3g's own reading of its own column, refuted

The coordinator's deliverable, and it answers the one open ride-versus-bench question.
`docs/research/new-rider/3.3/33i-stills/` holds two SVG sequences, their numbers, and the fall frame of 24 runs an
arm; its README is the one to read. The short of it, and all of it measured:

**(a) The deck rolls under him; the board does not go out from under him.** Through the last half-second of the
full-stick Compress fall the roll goes **16.7 → 26.6 → 38.6 → 53.4 → 70.5 → 89.8°** while the rider's centre of mass
sits at **+0.025, +0.011, −0.002, −0.015, −0.016, −0.005 m** across the board's **own** centreline [M]. Over
**24 runs** (3 entry speeds × 4 sticks × 2 stances, deck filter) that offset is **0.002–0.173 m**, **inside** the
feet's own 0.13 m in 22 of 24 and never past 1.33× of it; in the 17 whose roll passes 60° it is **0.003–0.113 m**,
inside the feet, in all 17 [M]. **For the board to be going out from under him that offset would have to grow, and
it does not.**

**The frame is 3.2z's, not the separation frame.** `deck.ts` reads its own across split on the **latest frame where
the two halves still reconstruct the capture point's velocity term**, because on the separation frame the rider's
velocity and the feet's point have already been re-set [R]. The sequences follow that rule, and with it the last
shipped full-stick panel reproduces `deck.ts`'s published split **to the digit** — body **0.95** / feet **−1.44** m/s
at its own `splitAtS` of 2.600 s — which is the check that the picture and the published column are the same number.
Each leg's separation-frame time and roll are printed in its heading.

**(b) And it structurally cannot.** `deck.ts`'s `feetAcross` column is `board.velocityAt(captureFeet)`, and
`AttachedRider.captureStep` builds `captureFeet` as `board.toWorld(midX, deckHeight(midZ), midZ)` — **the middle of
the support region, a point fixed in the board's frame**, re-expressed in the world each substep [R]. So that column
is the velocity of a board-fixed point **by construction**, and it cannot contain any sliding of the feet on the deck.
While the rider is attached there is none: the feet do not move in the board's frame at all.

**(c) So 3.3g's measurement stands and its reading does not.** *"In 8 of 12 full-stick runs it is the FEET that are
moving, not the body ... The board slides out from under him more often than he topples off it"* — `relAcross` really
does run 1.399–2.432 m/s with the feet's term the larger, and **the sequences reproduce it to the digit** (body
**0.95** / feet **−1.44** m/s on the Compress entry-0 run, `deck.ts`'s own published pair) [M]. Two things make the
feet's term large, and neither is sliding: that
board-fixed point is **carried** by a board rolling at up to 354 °/s and turning at up to 234 °/s, and the split is
taken in the **felt** frame, where at 89° of roll the felt vertical is nowhere near the deck's up, so the subtraction
moves a large share of the carried velocity from one column to the other. **In the board's own geometric frame the
body is the faster one in 21 of 24 runs** (body 0.49–2.84 m/s against the feet's 0.05–2.01) [M].

**(d) The owner's words and the measurement are the same event.** A deck rolling from 20° to 89° under a man whose
weight never leaves it looks, from outside, exactly like *"the surfer falls over"*. The coordinator's inference was
right, and it now has a picture and 24 runs behind it rather than an argument.

**(e) But their own cell is a different fall, and this is the find of §6.** At a **quarter** stick the separation
roll is only −43.6° and what crosses the line is the **body**: at the last panel the bank is **−34.1°** against a
roll of −29.8°, the centre of mass reaches **−0.127 m** — the feet's own edge — on the way, and the ankle's demand
runs to **151 N·m**, 1.6× what the soles can transmit [M]. **And the difference holds over the population, which is
what makes it a finding and not a trace:** taking `|bank| − |roll|` at that frame, the **17** runs whose separation
roll passes 60° give **−20.0 to +0.6°** — the body is never ahead of the deck by more than half a degree — and the
**7** whose roll stays under 60° give **−8.0 to +15.4°** [M]. **The roll finding of Part 31 is about the hard-turn
fall, where the body goes over with the deck; the owner's bar is about the other one, where the body goes over the
deck**, and no round has yet measured the gentle one on its own terms. One honest caution: each drawn sequence is
**one run**, and the population claim is the sweep, not the panels.

**(f) And the bound makes the picture worse**, which is §4's cost in a form the owner can see: with
`?ankleLimit=feet` the quarter-stick separation roll is only **−18.6°** and the body ends **−0.217 m** off the
centreline, and over the 24 runs it is outside the feet in 10 against the shipped 2 and as far as **0.418 m** out.

## 7. What I refuted

- **My brief's premise, twice over.** *"Not a cap, an ankle he does not have"*: he has one, it is the eighth unknown
  of the board's own solve, its stiffness is sourced and already above a braced human's, and **it is already carrying
  the entire 33.47 N·m** — ankle against residual agreeing to 0.95 N·m at the median on one population and 4.24 on the
  other. Seventeen consecutive rounds have now refuted their brief's premise.
- **My brief's axis.** It asked for inversion/eversion; a surfer stands side-on, so the board's roll axis is the
  human's **sagittal** ankle (the code already says so), and inversion/eversion is the board's **pitch**. The sourced
  numbers that matter are plantarflexion and dorsiflexion, and they put the **sole's geometry**, not the muscle, in
  charge of the bound.
- **My own build, by measurement.** I built the one limit that was genuinely unenforced and it **shortens the ride,
  raises the roll peak, trebles the roll rate at the fall and takes the body off the board three times as often.** I
  would have shipped it as a recommendation if I had not run it.
- **Step 3.3g's reading of its own 8-of-12**, §6(b)–(c). The column is a board-fixed point's carried velocity in the
  felt frame; it cannot measure the feet sliding, and in the board's own frame the body is the faster one in 21 of 24.
- **The idea that a strength or geometry limit on the ankle is what the fall was waiting for.** The demand is at
  **17–30 % of the sole's own bound at the median** and never breaches it at all on 780 unsteered frames.
- **The "hidden motor" reading I went in prepared to publish.** `ankleTorque` appears in `rhs[7]` and in no board row,
  which looks like an unpaired torque. It is not: rows 0–5 are the **pair's** momentum, so an internal joint torque
  must be absent from them, and the board's roll comes out of the coupled solve through a carried point that moves
  across with the body's bank — and §3 measured the pairing to 0.95 and 4.24 N·m. **I had the probe, the derivation
  and the A/B ready for the opposite result, and the falsification was stated in advance.**

## 8. What I will not claim

- **I will not claim the residual IS the ankle's torque exactly.** It is a residual and the two disagree by up to
  15.52 N·m per run and more frame by frame, because the residual also carries the pair's own inertia inside the solve
  and the feet's own small lever about the board's centre of mass. **0.95 and 4.24 N·m at the median is what I claim.**
- **I will not claim a human ankle's stiffness is 800 N·m/rad.** The sourced quantity is intrinsic standing stiffness
  at 0.08–0.93 m g h across three studies; 800 is about 1.4 m g h, i.e. **above** them, and whoever chose it said so.
  What is **not** sourced anywhere is how a surfer's ankle behaves on a planing board at 7 m/s, and I did not find it.
- **I will not claim the sole's bound is a human's own limit on this axis.** It is the geometric one. On the heel side
  a young man's two ankles are about 13 % under it (80 against 92 N·m) and on the toe side nearly 3× over it; I apply
  the geometry and say so, and I did not pick a muscle constant.
- **I will not claim `?ankleLimit=feet` is wrong physics.** It is a sole that cannot press past its edge, which is
  true. What is measured is that **in this model it makes the fall worse**, and the mechanism I offer for that —
  clipping a stiff spring opens the joint and raises its demand — is **an inference from two measured columns**
  (angle peak 20.5 → 47.3°, demand peak 717 → 2 087 N·m), not a separate measurement.
- **I will not claim one joint is enough, and I will not claim the second joint from this round's data.** §10 names
  what I would measure and why, and names what I am **not** entitled to say about it.
- **I will not promote either drawn sequence to a mechanism.** Each is one run; the population is the 24-run fall-frame
  sweep, and the two readings it supports are the two stated in §6(a) and §6(e).
- **I will not re-promote 3.3h's `rollRiderArm` peak of 0.309 m as "a surfer standing outside his feet"** — on this
  round's reading it is the residual's peak, the bound caps it to 0.164 m, and the median was always 0.0525 m.
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed rather than paddled in, `deck.ts`'s six
  entry speeds and `fall.ts`'s three are different populations and are **never pooled**, and every span above is the
  **whole population of its arm**, not a confidence interval.
- **No bot ride is offered as evidence of feel anywhere in this document.**

## 9. What changed, and why each piece is allowed

- **`src/physics/AttachedRider.ts`** — the `ankleLimit?: 'feet'` option with one private field and one constructor
  line; `static ankleLedger` (off) and the `ankle` ledger object; `soleBound()`; `setAnkle(demand, angle)`, which is
  now the **only** place `ankleTorque` is assigned, replacing the three in-line assignments; `bookAnkle`; and the
  ledger's reset in `beginStep`. **With the switch off, `setAnkle` assigns the identical expression** — the clamp's
  bound is `Infinity` — which the shipped-rider reproductions in §10 prove behaviourally.
- **The plumbing**, in the shape the four existing rider switches use: `RideSessionOptions.ankleLimit`,
  `SurfZoneConfig.ankleLimit`, `SurfZoneRunner`'s pass-through, `PhysicalMode`'s `ankleLimitSwitch`
  (`?ankleLimit=feet`, case-insensitive, anything else the default), and **`main.ts`'s online-room override pins it to
  `undefined`** — which `PhysicalMode.test.ts` enforces by reading `main.ts` and failing if the pin is removed.
- **`src/physics/ankleLedger.test.ts`** — five tests, the positive control among them (§2).
- **`docs/research/new-rider/3.3/deck.ts`** — `ANKLE=on` (the ledger and §7's block) and `ANKLE_LIMIT=feet`, both off
  by default. **With both unset the probe reproduces its own published record**: at `STEER=0` with no switches, Part
  24's twelve to the digit; at `STEER=1 FELT=deck ROLL=on`, 3.3h's §4 table to the digit.
- **`docs/research/new-rider/3.3/fall.ts`** — `ANKLE_LIMIT=feet`, off by default; its shipped world arm reproduces
  3.3g's own table to the digit.
- **`docs/research/new-rider/3.3/stills.ts`** — new, read-only, and it touches no source file: it draws the fall as a
  section across the board from the live state and prints every number on every panel.

## 10. If one joint is not enough — what the second would be, and what I am not entitled to say

**One joint is not enough, and the reason is structural rather than a shortfall of this one.** The ankle's torque *is*
the board's roll moment. Reducing it means putting the body's line of force back over the board's centreline, which
means **moving the body across** — and the capture point charges across speed at 1/ω₀ ≈ 0.29 m per m/s. That is step
3.2w's measured ankle trade, step 3.2x's hip ladder (*"12 of 12 fall at every gain from 500 to 8 000 N·m/m"*), and now
this. **Whatever helps is not another limb pushing the same 33 N·m around.**

**The quantity I would measure next, and it is not a joint: the board's own roll inertia against the water's.** The
ledger's own arithmetic is that `I_zz` = **0.0262 kg·m²**, so **1 N·m is 2 187 °/s²** [M, 3.3h], and the whole of the
capsize lives in a 0.1 % error between two 33 N·m columns on that number. The game's `addedMass` entry contributes
**−1.78 N·m of the water's −32.98** on the roll axis, 5 % [M] — i.e. the water in this model barely resists the
board's *rotation*, only the force. **For a flat plate rolling about its long axis the added moment of inertia per
unit length is of order ρπa⁴/8** (strip theory, a the half-beam), which at a = 0.25 m over 2 m of board is **order
1 kg·m², tens of times the board's own** [I, A].

**What I am not entitled to say about that**, and it matters because my brief warns of exactly this error — *a correct
equation applied to the wrong regime*: **that formula is for a deeply submerged plate, and a planing surfboard is a
surface-piercing body mostly out of the water.** The submerged fraction, the free-surface correction and the speed
dependence all cut it, possibly by a large factor, and I **did not measure any of them**. So this is a **question for
the water track and the wave-shape advisor, with a sourced order of magnitude and a stated regime mismatch** — not a
finding, not a recommendation, and not a thing the surfer track should build. If it survives, it changes the
denominator every roll number on this track divides by; if it does not, the 0.0262 stands and the capsize is honest.

**The second thing, and it is the one the owner's own bar points at:** the gentle fall of §6(e) has never been
measured on its own terms. Every roll number on this track comes from the hard-turn arm; the quarter-stick fall has a
**modest roll and a body that banks past the deck**, which is a different failure and may have a different cause. **I
would measure that before building anything.**

## 11. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- the three probes type-checked separately on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, with `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/deck.ts`, `.../fall.ts`, `.../stills.ts`, `src/physics/AttachedRider.ts` and
  `@types/node`.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **57 files, 611 passed, 21 expected fail** (56/606/21 in 3.3h; the five new passes are
  `ankleLedger.test.ts`'s).
  `vitest run src/game src/scene/rig`: **70 files, 731 passed** (730 in 3.3h; the one new pass is
  `PhysicalMode.test.ts`'s switch test, **98 of 98** in that file).
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail**.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**, the reference,
  so a red there would be news as `runner-test-file-excluded` has it. `src/wave/SurfZoneSimulation.test.ts` is closed
  by reading, as `c2-step5g.md` §7.4 allows: this round touches no solver, no wave and no spot file.
- **the shipped rider is proved unchanged against published baselines**, which is the one seatbelt that matters for a
  round that moved the line `ankleTorque` is assigned on: `deck.ts` at `STEER=0` with no switches reproduces **Part
  24's twelve to the digit**, `deck.ts` at `STEER=1 FELT=deck ROLL=on` reproduces **3.3h §4's whole per-source table
  to the digit** (rider +33.47, pressure −20.46, buoyancy −3.81, radiation −1.65, addedMass −1.16, fins −0.47, rails
  +0.09, friction +0.04, water −33.40, net +0.04, implied arm 0.0525 / 0.3092 m, direct reading 39.19, |direct −
  residual| 4.721 / 143.196), and `fall.ts`'s shipped world arm reproduces **3.3g §2b's own table to the digit**.
  A behavioural leak in `setAnkle`'s default path would move all three.
- **the switch is pinned off for the online rooms** in `main.ts`'s room overrides, and `PhysicalMode.test.ts` reads
  `main.ts` and fails if the pin is removed — the same assertion `?kneeRoom` and `?stanceReach` carry.
- **the Canyon byte check** (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, **fresh** spin-ups into a new state
  directory), with the brief's three cautions read rather than assumed — the wrapper is one **prepended** line on the
  bundle (`globalThis.location = { search: '?canyonWaves=true' }`, because a dynamic import makes rolldown split the
  chunk), the grid line read, and the "spun up on the CPU in … s" line read so that no kept `.sea` was imported (both
  state files were written by this run, into a `bench33i/` directory that did not exist before it):
  - Canyon B (`?canyonWaves=true`), **400 × 451 = 180 400 cells**, spun up on the CPU in **47.8 s**: snapshots
    **a367d938f15fa934**, state **9e5831f80e38abd9** — **the same as main.**
  - the default Canyon, **400 × 507 = 202 800 cells**, spun up on the CPU in **54.5 s**: snapshots
    **ea3d57a4d49f4b48**, state **a1a2555739210f96** — **the same as main.**

  All four match.

  This round touches no solver, no wave, no spot file and no hull law, and its one behavioural change is an opt-in
  balance switch that is off by default and off in the bench. The raw output is
  `results/33i/33i-canyon-byte-check.txt`.

## 11b. The deletions column, read line by line

`git diff --cached --shortstat origin/main`: **29 files, 2 835 insertions and 9 deletions** — and **all nine deletions
read, one by one. Every one is a line replaced in place; nothing was removed and nothing was reverted.**

- `AttachedRider.ts`, **3**: the three `this.ankleTorque = …` assignments, each replaced in place by a
  `this.setAnkle(<the identical expression>, this.bank.angle − roll)` call, so the demand is the same expression it
  always was and the default path's bound is `Infinity`.
- `main.ts`, **2**: the online-pin comment and the overrides object, replaced with `?ankleLimit` named and
  `ankleLimit: undefined` added.
- `SurfZoneRunner.ts`, **1**: the config pass-through line, replaced with `ankleLimit` added.
- `PhysicalMode.test.ts`, **1**: the import list, replaced with `ankleLimitSwitch` added.
- `fall.ts`, **2**: its row label and its header `console.log`, replaced with `ankleLimit` named in both.

`origin/main` is still **730e71ac**, which is this branch's own merge base, so there was no mid-round merge to rebase
onto — and the column was read rather than that being assumed. `ankleLedger.test.ts`, `stills.ts`, `RideSession.ts`,
`SurfZoneSimulation.ts`, `PhysicalMode.ts`, `deck.ts` and the two new directories are **pure additions**, zero
deletions each.

## 12. Files (3.3i)

- `src/physics/AttachedRider.ts` — `ankleLimit?: 'feet'`, `static ankleLedger`, the `ankle` ledger, `soleBound`,
  `setAnkle`, `bookAnkle`, the reset in `beginStep`. `src/physics/ankleLedger.test.ts` — the positive control, the
  bound's arithmetic, the clamp, the joint's angle, off-by-default and pure-observer (5 tests).
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts`, `src/main.ts` — the plumbing and the online pin. `src/game/PhysicalMode.test.ts` — the
  switch, the spots, and the pin read out of `main.ts`.
- `docs/research/new-rider/3.3/deck.ts` — `ANKLE=on`, `ANKLE_LIMIT=feet`, the ankle columns, §7's block.
  `docs/research/new-rider/3.3/fall.ts` — `ANKLE_LIMIT=feet`. `docs/research/new-rider/3.3/stills.ts` — new.
- `docs/research/new-rider/3.3/33i-stills/` — the two SVG sequences, their numbers, the 24-run fall-frame sweep and a
  README that says how to read a panel and what the pictures settle.
- `docs/research/new-rider/3.3/results/33i/` — eleven arms with their printed tables beside their rows and
  `33i-canyon-byte-check.txt`.

## 13. For the owner, in plain words — and the shot list

**You asked whether the surfer falls over or the board goes away from him. I drew it, and you are right: the surfer
falls over — and the reason is that the board tips up under him.**

Through the last half-second before he goes, on a hard turn, the board rolls from **17 degrees to 90**, and his weight
never leaves it: his middle stays within **two and a half centimetres** of the board's centreline the whole way, and
ends half a centimetre off it. Over 24 runs it is never more than **17 centimetres** out, and **inside his own feet in
22 of them**. **The board does not slide away. It rolls, and he goes over the side of it with it.** The pictures are
in
`docs/research/new-rider/3.3/33i-stills/` — look at `compress-full-stick.svg` first.

And I have to correct something I told you last round: I said *"in 8 of 12 runs his feet move across faster than his
body"*, and implied the board was sliding out. **That was my mistake, not the measurement's.** The thing I was
measuring is the speed of a spot on the deck — which is glued to the board — so it can never show his feet sliding; it
was showing the deck being swung around by a board rolling at 350 degrees a second. **In the board's own frame his
body is the faster one in 21 of 24 runs.**

**Then the ankle, which is what this round was sent to build. It was already there, and it is already doing the whole
job.**

Last round I told you nothing caps the twist his feet put into the board. **I was wrong.** The game already has an
ankle: a spring and a damper between his body and the deck, inside the same solve as everything else, at
**800 newton-metres per radian** — which is already **stiffer than a braced human's**, measured in three separate
laboratory studies. And when I measured what it carries, it is **the whole 33 newton-metres** I told you about last
round: the ankle's torque and the board's twist are **the same number**, agreeing to **1 newton-metre** on one test
and **4** on the other. There was never a missing joint. The twist you were told nothing caps **is** his ankle,
working.

**One thing really was unenforced, so I built it.** A foot cannot press further out than its own edge, so the most it
can twist the board is its load times its half-width — about **92 newton-metres** for him. Nothing in the game applied
that. His ankle asks for **more than 92** in about 2 to 10 per cent of the instants of a hard turn, and at the worst
moment it asks for **717**.

**So I capped it at what his soles can actually transmit. It makes things worse, and I am not recommending it.** The
ride gets *shorter* (from 1.1–2.7 seconds to 0.8–2.6), the board rolls *further* (to 95 degrees), and it spins in roll
**three times faster** — nearly a thousand degrees a second. And it takes him off the board: in your own gentle case
he ends up **87 centimetres** to the side of a board that is barely tilted, which will look ridiculous. The reason is
simple once you see it: capping a very stiff spring doesn't make the ankle soft, it makes it **let go** — his middle
ends up as far as **42 centimetres** to the side, against **17** as it ships. It is behind `?ankleLimit=feet` if you
ever want to see it, and it is off.

**Your bar is still not met: 24 out of 24 fall in all four tests, and in Compress at the gentlest stick, 6 of 6.**

**But the pictures found something I think matters more than anything else this round.** Your gentle case is a
**different fall from the hard one.** On a hard turn the board rolls to 90 degrees and his body goes with it — his
lean is always a degree or two *behind* the deck. At a quarter stick — your own case, getting into position — **the
board only reaches 30 to 44 degrees and it is his body that goes past it**: he leans about 4 degrees further than the
deck is rolled, and his weight walks out to the edge of his feet. Over 24 runs: in the 17 hard falls his lean never
gets more than half a degree ahead of the deck; in the 7 gentle ones it gets up to **15 degrees** ahead. **Everything
this track has measured about rolling boards comes from the hard turn. Nobody has yet measured your fall on its own
terms**, and I would do that next, before building anything else.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot. One change at a time, as always.

1. **`?rider=new&feltFrame=deck&canyonWaves=true`** — as it ships, your usual address. Get into position at low speed,
   press Compress, make one gentle turn. **The question: when he goes, does the board tip up under him, or does his
   body lean over past the board while the board stays fairly flat?** The measurement says that at a gentle stick it
   is the second one, and at a hard stick the first. **If both feel the same to you, say so** — that would mean the
   two falls I have measured separately are one thing to ride, and it changes what I measure next.
2. **The same, then a HARD turn (full stick) from the same position.** Same question. The measurement says this one is
   the board rolling to 90 degrees with you still on it.
3. **`?rider=new&feltFrame=deck&ankleLimit=feet&canyonWaves=true`** — the capped ankle, only if you are curious. The
   measurement says it is worse and more absurd; **what I would like to know is whether it looks wrong in the way the
   numbers say** (he slides off the side of a barely tilted board) or wrong in some other way.
4. **And a ruling I would like, not a ride:** given that the two falls are different, **which one do you want fixed
   first?** Your bar names the gentle one. Every roll number on this track is from the hard one. I will measure
   whichever you name.

# Part 33 — the gentle fall is three falls, the stick does not choose between them, and the one the owner's own stance gets is the capsize

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33j`, cut from `main` at
**5481822d** (the advisor's roll-inertia consult), so Part 32 is its base. It ships **no source change and no switch** —
`git diff --stat` touches `docs/` only — **one new read-only probe** (`3.3/inertia.ts`), additions to two existing
probes, and **324 runs over fourteen arms** — six `fall.ts` arms (228 runs), seven `deck.ts` arms (84) and
`inertia.ts`'s own ride arm (12), plus its four control rows, which are not runs.

Tags as in 3.2 and 3.3: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source; **[I]** my
inference from a stated model; **[A]** arithmetic on measured numbers, labelled as such.

## 0. The eight sentences the round is for

1. **The owner's bar is not met, and this round says why their own framing of it cannot be the route.** Across the
   round's fall arms: **72 of 72** on the gentle stick ladder with six entry speeds, **36 of 36** on three,
   **36 of 36** on the world filter, **36 of 36** with the probe's stick never centred, **24 of 24** on step 3.3i's
   own grid, and **12 of 12 in each of seven `deck.ts` arms** [M]. **And the decisive one: with the stick UNTOUCHED he
   falls 12 of 12 at 1.10–1.93 s on the owner's own filter and 0.77–1.70 s on the world one** [M, Part 24's arm
   reproduced]. **The gentle turn is not what is killing him; he falls without one.**
2. **My brief's premise is false, and the error it warns about is the one it made: the gentle fall is not one
   population.** On 72 runs at sticks 0.06–0.30 it is **three**, separated by the deck's roll at the fall with **no
   overlap in the roll peak**: **A, flat** (|roll| < 10° at the fall, peak **10.0–49.3°**) — 19 runs; **B, partial**
   (10–60°, peak 13.8–59.9°) — 17; **C, capsize** (≥ 60°, peak **62.0–92.1°**) — 36 [M].
3. **And the stick does not choose which one you get. The stance does.** Across sticks 0.06 → 0.30 the flat count
   runs **1, 4, 3, 5, 4, 2** and the capsize count **10, 7, 4, 5, 3, 7** — no ordering at all. By stance it is
   **tall A17 / B5 / C14** against **Compress A2 / B12 / C22** [M]. **The owner's bar is about Compress, and Compress
   at a gentle stick capsizes the board in 22 of 36 and rolls it past 10° in 34 of 36.** The entry speed is the second
   term: at **−2 m/s** the split is **A0 / B1 / C11**.
4. **So the one thing my brief said was already known about the gentle fall does not survive its own population.**
   *"The body gets ahead of the deck in this fall, which is the opposite of the hard one"* is true of the **flat**
   regime — `|bank| − |roll|` is **−7.8 to +19.3°, median +7.7, positive in 15 of 19** — and that regime is **17 of 19
   the tall stance's**. In the capsize it is **−54.1 to +5.2°, median −7.9, positive in 4 of 36** [M]. **Step 3.3i's
   7-run observation is not wrong and it is not the owner's fall**; its own grid reproduces here to the digit (§2.1).
5. **What goes first is measured, and it is a monotone ordering over 72 runs, not a story.** The fall test's error is
   `px = offset.x − height·nx`, so the share **|demand| / (|demand| + |offset.x|)** is the share the **deck's** bank
   error brings. Its median is **0.20 in the flat regime, 0.40 in the partial one and 0.72 in the capsize** [M]. **In
   the flat fall four fifths of the error is the body's own place and the deck never goes; in the capsize three
   quarters of it is the deck.** Two different first movers, one probe, one datum.
6. **The gentle fall is sudden, not a stall, and that refutes the other half of the brief's picture.** `px` is inside
   the feet's own bound 0.3 s before the fall in **every one of the 72 runs** (−0.126 to +0.111 m against 0.13), and
   the flat regime is the **fastest** of the three: the capture point's position term moves at a median **0.72 m/s**
   over the last 0.2 s against 0.36 and 0.21, and `weightPast` has been true for **0.017–0.050 s** when he goes [M].
7. **The advisor's three free reads: (a) held and is the round's most useful number, (b) is refuted by its own
   method on six arms, (c)'s premise is refuted arithmetically.** (a) The solve's own roll inertia is
   **0.498–1.140 kg·m² per run, 0.582–1.196 near trim, falling to 0.053–0.167 past 60° of rail** — the advisor
   predicted 0.6–1.2 at trim falling to ~0.15, and **their falsification (0.03, the matrix not reaching the roll
   equation) did not fire**. So step 3.3h's *"1 N·m = 2 187 °/s²"* is wrong by **19.0–43.5×**: the real figure is
   **50.2–115.1 °/s²** [M]. (b) The angle part of `pressure`'s roll moment is **12.4–32.9 N·m/rad on six arms and
   never near zero**, against the prediction of "near zero"; the rate part is **3.17–15.19 N·m·s/rad** across the same
   six, spanning a factor five, so the regression cannot measure it — and read (a) measures it **structurally**
   instead, off the matrix, at **9.4–16.2 N·m·s/rad over the ride and 13.8–18.2 near trim** against the sourced 12.7
   [M, S]. (c) Nothing is omitted from Part 31's column: in **means**, which sum, the eleven water entries give
   **−33.856**, the rider residual **+33.834**, all twelve **−0.022** against the total's own mean **−0.022**, and
   `bed + froth + suction` add **0.000000000** [M]. The 6 N·m the advisor found missing is the non-additivity of
   medians, **which Part 31 stated in its own §4 item 4**.
8. **Nothing is built, and that is the round.** The one limit that is **at its stop** when he goes is the balance's own
   commanded ankle rest: `ANKLE_REST_RANGE` = ±14.32°, saturated at the fall in **62 of 72** runs (flat 16 of 19)
   while the hip is at its ±1.2 rad stop in **3 of 72** [M]. In the flat regime the saturation **precedes** the
   capture point's departure by a median **0.067 s, in 14 of 19**; in the capsize it does not lead at all (median
   −0.083 s, 14 of 31) [M]. **That is a candidate with a timing, not a cause**, and §8 says what I am not entitled to
   claim about it.

## 1. (A) What was read before anything was measured, and the one thing it changed

My brief's own ranking put the gentle fall first and the advisor's reads second, and said *"start from a read, not from
a hypothesis."* Two reads moved the design before a probe ran.

**(i) `system` survives the step on the path a standing rider takes, so read (a) needs no source change** [R].
`BoardBody.system` is a `private readonly Float64Array(36)`, which TypeScript hides and the run time does not. On the
standing path `coupleStanding` copies rows 0–5 into `system8`/`system9` and `solveLinear` eliminates on **that** copy
(`BoardBody.ts:1500–1506`), so the assembled matrix is intact when `step` returns. It is destroyed in place only on
the two fallback paths — `pushCapped` and `rider.pushBoard` then `solve6` — and on the no-rider path, which is
`solve6(system, rhs)` outright. **So this round touches no `src/` file, which is why there is no Canyon byte check in
§9: there is nothing for it to check.**

**(ii) And the assembly gives the probe its own validity test for free: every term of it is symmetric** [R]. Rows 0–5
are built as `Σ coefficient · a_i a_j` over patches (`:1017`, `:1340`, `:1398`, `:2076`) plus `mass` on the
translational diagonal and the world inertia tensor on the rotational block (`:1486–1488`). Gaussian elimination with
partial pivoting is not symmetric. So `inertia.ts` prints `max|A_ij − A_ji| / max|A|`, pools only the steps that pass
at **1e-12**, and **reports the share that passed** — 0.833–0.977 per run [M] — rather than assuming it.

**The one thing this changed**: my plan had been to add a `static inertiaLedger` to `BoardBody`, which would have put
a source change and a Canyon byte check into a read the advisor had called *"free, read-only"*. It is free.

## 2. (B) The gentle fall, on its own terms

**The cell is `fall.ts`'s own** — the Canyon-matched `FaceWater` (1.4 m / 16° / 5.7 m/s, 2.6 m deep, the board 0.75
fronts ahead of the crest and 45° off the fall line), the stance held and the stick over from the first frame until the
board is 85° round, then centred, 9 s a run. **The new population is the stick ladder**: sticks
**0.06, 0.1, 0.15, 0.2, 0.25, 0.3** (0.06 is the smallest past `STEER_DEADBAND` = 0.05) × **six entry speeds**
(−3, −2, −1, 0, +1.5, +3 m/s) × **two stances** = **72 runs**, on `?feltFrame=deck`, the owner's own address. A
36-run arm on `fall.ts`'s own three entry speeds is run beside it and the two are **never pooled**.

**The datum, stated, and it is not the rest of this probe's.** Every angle in §2 is the **raw board-frame** one — `+`
means the deck normal, or the body's lean, toward the board's own **+x** — and **not** the `dir`-signed "toward the
turn's inside" convention `fall.ts`'s other columns use. The reason is in the measurement: the gentle fall's defining
feature is that the roll **reverses**, and a column signed by the run's final direction cannot show a reversal. The two
conventions are kept apart in the probe and nothing below mixes them.

### 2.1 The reproduction, first, because the whole round turns on one of 3.3i's columns

`fall.ts` with no new switch set reproduces **step 3.3g's and 3.3i's published world arm to the digit** — tall
1.20–4.15 s, Compress 1.12–3.98, all 24 at **1.12–4.15 s**, nets 12.6–88.1° — and on the deck filter **3.3i's own
grid to the digit**, all 24 at **1.30–4.05 s** [M].

**And the new column reproduces 3.3i's find on 3.3i's own grid**, which is what makes the rest of §2 a disagreement
about meaning and not about numbers:

| **[M]** `fall.ts`, deck filter, sticks 0.25–1, 24 runs | step 3.3i published | measured here |
|---|---|---|
| runs whose roll at the fall passes 60° | 17 (at its **separation** frame) | **16** (at the **fall** frame) |
| `\|bank\| − \|roll\|` in those | **−20.0 to +0.6°** | **−21.1 to +0.3°**, positive in 1 of 16 |
| the same in the runs under 60° | **−8.0 to +15.4°** (7 runs) | **−7.3 to +15.4°** (8 runs) |

The one-run difference is the frame and is named: 3.3i's stills read the separation frame, this probe reads the fall
frame. **Its bands are 3.3i's.**

### 2.2 Three regimes, and the roll peak separates them with no overlap

| **[M]** 72 runs, deck filter, sticks 0.06–0.30 | **A flat** | **B partial** | **C capsize** |
|---|---|---|---|
| the classifier: \|roll\| at the fall | **< 10°** | 10–60° | **≥ 60°** |
| **n** | **19** | **17** | **36** |
| the deck's roll **peak**, ° | **10.0–49.3** | 13.8–59.9 | **62.0–92.1** |
| the stance | **17 tall / 2 Compress** | 5 / 12 | 14 / **22 Compress** |
| fell at, s | 0.60–4.30 | 1.12–4.40 | 1.20–5.07 |
| `\|bank\| − \|roll\|` at the fall, ° | **−7.8–+19.3** (median **+7.7**) | −16.4–+17.7 (+4.0) | **−54.1–+5.2** (**−7.9**) |
| … positive, i.e. the body ahead of the deck | **15 of 19** | 12 of 17 | **4 of 36** |
| **the deck's share of the fall-test error** (median) | **0.20** | 0.40 | **0.72** |
| the body across the board's own centreline, peak over the last 0.5 s, m | 0.084–**0.224** | 0.047–0.179 | 0.035–**0.782** |
| … past the feet's own 0.13 m | **17 of 19** | 8 of 17 | 16 of 36 |
| `px`'s rate over the last 0.2 s, median m/s | **0.72** | 0.36 | 0.21 |
| the trigger: `beyond` / `weightPast` / together | **5 / 12 / 2** | 0 / 16 / 1 | **0 / 26 / 0** |
| the body the faster one (raw board frame) | **3 of 19** | 9 of 17 | **27 of 36** |
| the test held because the feet went light, any frame of the last 0.2 s | **0 of 19** | 4 of 17 | 10 of 36 |
| the ankle's demand over the soles' own bound, peak | 0.97–7.75 | 0.56–20.41 | 0.22–**27.10** |
| the residual held 0.2 s over the stance's own `a_max` | 0.25–1.31 | 0.18–1.58 | 0.39–2.72 |
| the roll **rate** peak, °/s | 119.1–262.3 | 92.5–341.7 | 116.8–**1 992.3** |

**Five readings.**

1. **The roll peak separates A from C with a gap** — 49.3° against 62.0° — on a classifier built from a *different*
   frame's roll, which is what makes "three regimes" a measurement and not a cut I chose. B overlaps both, as a middle
   band must.
2. **They are two different first movers and the deck-share column is the measurement of it.** `px` is
   `offset.x − height·nx`, so `height·nx` is the across place the turn **demands** and `offset.x` is what the body
   **holds**; the share the demand brings is **0.20 in A and 0.72 in C** at the median. In the flat fall **four fifths
   of the error is the body's own place**, and the deck's peak roll never reaches 50°. In the capsize **three quarters
   is the deck's bank**.
3. **So my brief's hypothesis about the instrument is half right, and the half matters.** *"The roll ledger may be the
   wrong instrument for it, and the capture point's own split may be the right one"* — the roll ledger **is** the
   wrong instrument for regime A, where the deck does not go; it is the **right** one for regime C, which is
   **22 of 36 of the owner's own stance at a gentle stick**. The capture point's split is the right instrument for A.
4. **And in neither regime does the board go out from under him**, which keeps 3.3i's §6 standing: the body is the
   faster one in only 3 of 19 flat falls and 27 of 36 capsizes, and in the flat falls the body's offset from the
   centreline **grows** to 1.1–1.7× the feet's own half-width, which is a body walking off a flat deck, not a deck
   leaving.
5. **The freeze is clean in regime A**: 0 of 19 runs had the capture point held for any frame of the last 0.2 s, so
   nothing in the flat fall is a reading resumed on a body already gone. In the capsize it is 10 of 36.

### 2.3 The stick does not choose the regime, and here is the whole cross-tabulation

| **[M]** 72 runs | A flat | B partial | C capsize |
|---|---|---|---|
| **stick 0.06** | 1 | 1 | 10 |
| stick 0.10 | 4 | 1 | 7 |
| stick 0.15 | 3 | 5 | 4 |
| stick 0.20 | 5 | 2 | 5 |
| stick 0.25 | 4 | 5 | 3 |
| stick 0.30 | 2 | 3 | 7 |
| **entry −3 m/s** | 4 | 5 | 3 |
| **entry −2** | **0** | 1 | **11** |
| entry −1 | 2 | 2 | 8 |
| entry 0 | 6 | 2 | 4 |
| entry +1.5 | 4 | 4 | 4 |
| entry +3 | 3 | 3 | 6 |
| **tall** | **17** | 5 | 14 |
| **Compress** | **2** | 12 | **22** |

**The stick's column has no ordering in it at all**, and the gentlest stick of the ladder is the **most** likely to
capsize (10 of 12). What orders the table is the **stance** and the **entry speed**. That is the round's answer to the
brief's framing, and it is why "the gentle fall" cannot be a single mechanism: *gentle* names the stick, and the stick
is not what the fall is about.

### 2.4 Two artefacts ruled out, both by running them rather than arguing

**(a) The probe's own script is not what makes the gentle fall.** `fall.ts` centres the stick once the board is 85°
round, which in 6 of the 36 three-entry runs happens 0.067–1.017 s before the fall — a plausible way for a probe to
manufacture a fall out of a release. Run with `ACROSS=9999`, so the stick is **never** centred, **exactly 1 of 36 runs
changes at all**: Compress, entry +3, stick 0.06, whose 85° came 1.017 s early, falls 0.13 s later at 74.8° instead of
89.3° [M]. Every other run is identical in fall time, roll, bank, lead, centre of mass, trigger and `px`. **The
release is exonerated.**

**(b) The deck filter does not make the flat fall, but it does make the capsize.** The same 36-run gentle ladder on
the shipped **world** filter still falls **36 of 36**, and the regime mix moves hard: **A 10 / B 25 / C 1** against the
deck filter's **A 13 / B 9 / C 14** [M]. So `?feltFrame=deck` — which step 3.3c and 3.3g established is the *correct*
frame, because filtering in the world and projecting afterwards charges the reading `Ω·T` of in-plane force that is a
frame error and not a force — **turns the partial roll into a capsize in about a third of the gentle ladder.** I report
that as a measured property of the filter the owner rides with, not as a reason to change it: the frame is right and
the fall count is 36 of 36 either way.

### 2.5 The gentle stick is where the board is asked for the LEAST, and he falls anyway

`deck.ts`, the roll ledger on, the deck filter, twelve runs an arm (two stances × six entry speeds), the stick held
fixed from the first frame — so this is a **different population** from `fall.ts`'s and the two are never pooled. Six
arms, one ladder:

| **[M]** `deck.ts`, deck filter, 12 runs an arm | **the rider's roll drive**, median N·m | per run | fell | the deck's roll peak, ° |
|---|---|---|---|---|
| **stick 0 (untouched)** | **+24.37** | 0.12–43.32 | 12 of 12 at **1.10–1.93 s** | 27.5–95.6 |
| stick 0.10 | **+6.64** | **−6.87**–35.63 | 12 of 12 at 0.92–4.30 | 14.6–92.1 |
| **stick 0.25** | **+7.92** | **−12.58**–35.60 | 12 of 12 at 1.12–4.05 | 19.1–90.8 |
| stick 0.50 | +23.23 | 15.00–36.89 | 12 of 12 at 1.18–3.55 | 53.1–91.1 |
| stick 0.75 | +30.90 | 18.20–57.71 | 12 of 12 at 1.12–3.32 | 70.8–92.4 |
| stick 1 | **+33.47** | 21.55–57.81 | 12 of 12 at 1.12–2.67 | 63.7–91.4 |

**Three readings, and the first is the one for the owner.**

1. **The drive is not monotone in the stick: it DIPS at the gentle sticks.** At 0.10 and 0.25 the rider's own roll
   moment is **6.64 and 7.92 N·m** — a **third** of what he puts into the board with the stick untouched and a
   **quarter** of the full stick's — and he falls 12 of 12 in each. **The gentle turn asks less of the board than no
   turn at all, and it is still 12 of 12.** So "the gentle turn asks too much" is not available as an explanation.
2. **The gentle sticks are the only arms where the per-run drive changes sign** (−6.87 to +35.63 and −12.58 to
   +35.60): the twelve runs split into a group pressing the board over and a group pressing the other way, which is
   §2.2's regime split seen in the moment column rather than the angle one.
3. **The unsteered arm is the headline against the owner's bar.** On the world filter it reproduces Part 24's twelve
   to the digit — 12 of 12 at **0.77–1.70 s**, bank peak 20.7–65.7°, roll peak 20.9–63.0°, rail peak 10.9–62.9°, drift
   peak 1.9–4.9°, rider **+17.84** against the water's −17.78, the direct reading **+20.81**, |direct − residual|
   2.134 / 28.735, the implied arm 0.0228 / 0.1218 m — and on the deck filter it falls 12 of 12 at **1.10–1.93 s**
   with a roll peak of 95.6° and a drive of **+24.37 N·m** [M].

### 2.6 The one limit that is at its stop when he goes

| **[M]** 72 runs, deck filter, sticks 0.06–0.30 | A flat | B partial | C capsize | all |
|---|---|---|---|---|
| the predictor's ankle command at `ANKLE_REST_RANGE` (±14.32°) at the fall | **16 of 19** | 14 of 17 | 32 of 36 | **62 of 72** |
| how long it had been there, s | 0.000–0.283 (median 0.133) | 0.000–0.367 (0.100) | 0.000–0.717 (0.150) | — |
| the hip at its own ±1.2 rad stop | 0 of 19 | 1 of 17 | 2 of 36 | **3 of 72** |
| the catching reach the stance had left, m | 0.158–0.278 | 0.125–0.272 | 0.168–0.303 | 0.125–0.303 |
| **the saturation's lead on `px` leaving half the feet's bound**, s | **+0.067 median, 14 of 19 positive** | +0.017, 9 of 17 | **−0.083, 14 of 31** | — |

**Two readings.** The commanded rest is **at its stop in 62 of 72 runs** while the hip — the authority steps 3.2x and
3.3h swept — has room left in 69 of 72. And the saturation **leads** the capture point's departure in the flat regime
(median +0.067 s, 14 of 19) and **does not lead at all** in the capsize (median −0.083 s, 14 of 31), which is a
discriminator with a consistent sign in one regime and none in the other. **It is also four frames at 60 Hz, inside a
0.283 s window, and §8 says why I will not call it the cause.**

## 3. (B) Read (a) — the solve's own roll inertia, and what it does to every roll number on this track

The advisor's ranked (a), and their prediction, both quoted in `inertia.ts`'s own header before it ran once:
**0.6–1.2 kg·m² at trim, falling as cos³ of the deck-to-surface roll to ~0.15 past 60°; if it reads 0.03, the
added-mass matrix is not reaching the roll equation and that is the bug.**

**The datum.** `x̂ᵀ A x̂` over `A_rot[i][j] = system[(3+i)·6 + (3+j)]`, with x̂ **the board's long axis in the world**,
`(rotation[2], rotation[5], rotation[8])` — **the same datum `BoardBody.rollOf` uses for every entry of the roll
ledger**, so this inertia and that ledger's moments are about one axis and nothing has to be re-projected to divide one
by the other. Rows 3–5 of the solve are `(dωx, dωy, dωz)` in the world and `rhs[3..5]` the angular impulses, so this
is the generalized inertia the integrator divides the roll moment by. kg·m².

### 3.1 The controls, and the one prediction of mine that failed

| **[M]** a board on `PlaneWater` | asymmetry | `x̂ᵀAx̂` | `x̂ᵀIx̂` (dry) | `ŷᵀAŷ` | wetted m² | the gate |
|---|---|---|---|---|---|---|
| **dry**, standing rider | 0.0037 | 0.0262 | 0.026205 | **2.54** | 0 | **rejected** |
| dry, no rider | 0.0037 | 0.0260 | 0.026205 | **2.54** | 0 | rejected |
| **float**, standing rider | **0** | **1.8114** | 0.026205 | 152.37 | 0.5169 | **accepted** |
| float, no rider | 0.0475 | 0.9354 | 0.026205 | 63.88 | 0.3414 | rejected |

- **The gate's own negative control held as predicted**: with no rider the solve eliminates `system` in place, and both
  no-rider reads come back asymmetric (0.0037 dry, 0.0475 floating), so the gate throws them out.
- **My P1 failed, and the reason is a measurement.** I predicted that the dry board with a standing rider would read
  `rollSolve` **exactly** equal to `rollDry` and `heaveSolve` exactly the board's 2.54 kg. **The heave half held to the
  digit on all four rows.** The roll half was **not testable on the path I chose**: a dry board cannot give a standing
  contact the impulse it asks for, so the solve takes `pushBoard` + `solve6` and eliminates the matrix — which the
  asymmetry of 0.0037 is reporting. **So the dry control tests the read's block offsets (2.54 kg exactly, four times)
  and not the roll element**, and I say so rather than quoting the 0.0262 it happens to return.
- **P2 held**: floating with a rider, the water adds **1.785 kg·m²** to the board's 0.0262, and the read is
  **symmetric to the last bit** — asymmetry exactly 0, which is the gate's positive side.

### 3.2 The closure, which is the control that does work

Reconstructed by hand, patch by patch, out of the same private arrays the assembly read (`arm`, `normal`,
`surfaceNormal`, `damping`, `addedMass`, `entrained`, `radiation`, and `substepSpan` for h):

| **[M]** kg·m² about the board's long axis | float + rider | the ride, 12 runs (median per run) |
|---|---|---|
| **`x̂ᵀAx̂`, the solve's own** | **1.8114** | **0.498–1.140** |
| the dry tensor `x̂ᵀIx̂` | 0.026205 | 0.0262–0.0262 |
| `Σ (addedMass + entrained)·((r × û)·x̂)²`, **a real inertia** | 1.7829 (with h·radiation) | **0.434–1.088** |
| `Σ h·radiation·((r × û)·x̂)²`, **h × a damping** | — | 0.0022–0.0058 |
| `Σ damping·((r × n̂)·x̂)²`, **h × a damping** (`damping = pressureDamping · h`) | 0.0022 | 0.0073–0.0112 |
| the **rest** — foils, the duck plate, the rider's own yaw inertia | **0.0001** | 0.0032–0.0226 (peak \|rest\| 0.0158–0.0573) |
| the substep h, s | 0.00104167 | 0.00104167 |

**The two routes close to 0.0001 kg·m² on 1.81 on the control and leave 0.3–2 % unaccounted over the ride**, which is
the foils and the rider's yaw coupling. **That is the control that says the read is on the right block and the right
axis** — an off-by-three in the block index would have read a translational element of tens of kilograms into the
roll, and a wrong axis would have read the pitch or yaw inertia, which is the *same order* as the answer and is why the
closure and not the magnitude is the test.

**And it separates what is an inertia from what is h times a damping**, which the advisor's own wording warned about:
`inertia = h·radiation + addedMass + entrained` in the assembly, so a third of its name is a damping. The inertia
proper is **0.434–1.088 kg·m²**.

### 3.3 The answer, and what it costs every roll number on this track

| **[M]** 12 runs (2 stances × 2 sticks × 3 entries), deck filter | |
|---|---|
| clean steps, share per run | 0.833–0.977 (asymmetry **exactly 0** in every accepted step; 0.18–0.29 in the rejected ones) |
| **`x̂ᵀAx̂`, median per run** | **0.498–1.140 kg·m²** (over all accepted steps, 0.037–1.771) |
| … **near trim** (\|rail\| < 10°) | **0.582–1.196** |
| … **past 60° of rail** | **0.053–0.167** |
| the ratio to step 3.3h's `I_zz` = 0.0262 | **19.0–43.5×** |
| **1 N·m is** | **2 186 °/s² on 3.3h's I_zz · 50.2–115.1 °/s² on the solve's own** |
| the hull's roll **damping** off the same assembly, pressure only | 7.0–10.7 N·m·s/rad (near trim 9.3–13.0) |
| … **pressure + radiation** | **9.4–16.2 N·m·s/rad (near trim 13.8–18.2)** |
| the cos power fitted per run | −3.35 to +3.71 — **not claimed** |

**Four readings.**

1. **The advisor's prediction held on both halves, and their falsification did not fire.** 0.582–1.196 near trim
   against a predicted 0.6–1.2; 0.053–0.167 past 60° against a predicted ~0.15. **The generalized added-mass matrix
   does reach the roll equation. There is no bug, and the inertia hypothesis is closed for the third time.**
2. **But it closes step 3.3h's denominator, which was wrong by a factor 19 to 44.** *"1 N·m = 2 187 °/s² on a roll
   inertia of 0.0262 kg·m²"* has been the arithmetic behind *"the whole of the capsize lives in a 0.1 % error between
   two 33 N·m columns"* since Part 31. **On the inertia the integrator actually uses, 1 N·m is 50–115 °/s²**, and the
   measured roll acceleration over the turn (21–234 °/s², Part 31) needs **0.2–4.7 N·m** of net moment, not
   0.01–0.11. The net of +0.04 N·m is still small against 33; what is no longer true is that it is *astronomically*
   small, and no conclusion on this track should rest on that ratio again.
3. **I will not claim the cos³ law.** The per-run power fit spans −3.35 to +3.71, which is noise; what is measured is
   the **direction and the size of the fall-off**, trim 0.582–1.196 → past-60° 0.053–0.167, a factor 7–10 against
   cos³60° = 0.125's factor 8. Consistent, not fitted.
4. **The damping comes out of the same read, structurally, and it supersedes read (b)'s regression** (§4). It is
   `Σ pressureDamping·((r × n̂)·x̂)²` and `Σ radiation·((r × û)·x̂)²` — coefficients, read off the matrix, prior to any
   fit: **9.4–16.2 N·m·s/rad over the ride and 13.8–18.2 near trim**, which **brackets the advisor's predicted 11–19
   and the sourced 12.7** (ITTC 7.5-02-07-04.5 4.2.4).

## 4. (B) Read (b) — the rate part and the angle part, and why its own method cannot answer it

The advisor's prediction, quoted: **a rate slope of 11–19 N·m·s/rad bracketing the sourced 12.7, and an angle slope
near zero on the flat section.** Regressed per-frame on six `deck.ts` arms, `rollBy.pressure` on roll rate (rad/s) and
rail angle (rad), with the probe's own sign convention stated in the code and the sign flipped so that a positive
figure is a damping.

| **[M]** `deck.ts`, deck filter, 12 runs an arm | the joint fit's **rate** part, N·m·s/rad | its **angle** part, N·m/rad | R² | the rate **alone** | the angle **alone** |
|---|---|---|---|---|---|
| stick 0 | 5.58 … | **20.14** | 0.553 | **15.19** (R² 0.465) | 35.12 (0.432) |
| stick 0.10 | … | **31.79** | 0.560 | 7.14 (0.270) | 37.14 (0.529) |
| stick 0.25 | −0.02 | **32.86** | 0.291 | 3.17 (0.047) | 32.83 (0.291) |
| stick 0.50 | … | **12.35** | 0.325 | 6.35 (0.252) | 19.36 (0.240) |
| stick 0.75 | … | **31.38** | 0.515 | 10.82 (0.266) | 36.26 (0.504) |
| **stick 1** (3.3h's own 1 118 frames) | **5.96** | **30.93** | 0.533 | **12.49** (0.316) | 39.24 (0.487) |
| the whole water column, stick 1 | 9.75 | 19.11 | 0.419 | — | — |

**Four readings, and the method is the finding.**

1. **The "angle slope near zero" prediction is refuted on 6 of 6 arms**: 12.4–32.9 N·m/rad, every one of them, with
   the angle-alone slope 19.4–39.2. **`pressure`'s roll moment has a substantial angle part on this flat section.**
2. **The rate slope cannot be measured this way, and its own numbers say so**: 3.17–15.19 across the six arms, a
   factor of five, and the joint fit drops the full-stick arm's 12.49 to 5.96 and the quarter-stick's 3.17 to −0.02.
   **That is the signature of collinearity** — in a monotone roll the rate and the angle rise together — **and not two
   measurements.** The predicted 11–19 is met on 2 of 6 arms and only when the angle is left out of the model.
3. **So read (a) answers read (b)'s question better than read (b) does**, because the damping is a *coefficient in the
   assembly* and not a slope to be fitted: 9.4–16.2 N·m·s/rad over the ride, 13.8–18.2 near trim (§3.3).
4. **And the terminal-rate framing the advisor asked for instead of the net does not survive two populations either.**
   `ω = drive / C` with the structural C: full stick **33.47 / 9.4–16.2 = 118–204 °/s** against a measured roll-rate
   peak of **146.7–353.7**; quarter stick **7.92 / 9.4–16.2 = 28–48 °/s** against a measured peak of **92.5–326.3**
   [A, M]. **It is the right order on the hard arm and 2–10× low on the gentle one.** I publish it as asked and do not
   adopt it as the headline.

**The equilibrium that the angle part implies, offered as a consistency check and withdrawn as a law.** With the
damping **held** at read (a)'s structural value — a number that was not fitted — the stiffness comes out at
17.10–26.29 N·m/rad on the full-stick arm, and `drive / stiffness` is **73.0–112.1° of rail** against that arm's
measured **rail peak of 75.7–90.1°**. That is a striking agreement and **it fails its own second-population test**: on
the quarter-stick arm the same procedure gives a stiffness of 5.55–17.00 with R² **0.026–0.291** and an equilibrium of
**26.7–81.9°** against a measured rail peak of **10.5–94.1°** — a band too wide to be a test, from a fit that has
degenerated. **So I do not claim that the capsize is the board going to its own roll equilibrium.** One arm agreed;
the second does not confirm it; a two-parameter linear model with R² 0.03–0.56 fitted across 0–90° of roll is not a
mechanism. §8 keeps it.

## 5. (B) Read (c) — the full roll column, in means, which do sum

The advisor's premise: *"Part 31's eight entries sum to −27.42, not −33.40 — about 6 N·m is in `froth`, `suction`,
`bed` and `gyro`, which the published table omits."*

| **[M]** `deck.ts`, stick 1, deck filter, **1 118 frames**, N·m, **means** | |
|---|---|
| buoyancy · pressure · addedMass · radiation | −3.398 · **−25.250** · −2.865 · −1.813 |
| friction · bed · fins · rails · froth · suction · gyro | +0.055 · **0.000** · −0.669 · +0.103 · **0.000** · **0.000** · −0.019 |
| **rider (a residual)** | **+33.834** |
| the eleven water entries + gyro, **summed** | **−33.856** |
| all twelve, summed | **−0.022** |
| the total's own mean | **−0.022** |
| **\|difference\|** | **0.000000000** |
| what `bed + froth + suction` add | **0.000000000** |

**The premise is refuted, arithmetically and on two populations** (the quarter-stick arm closes the same way: water
−7.083, rider +7.079, all twelve −0.004 against a total of −0.004, |difference| 0.000000000). **No column is omitted
from Part 31's table.** The 6 N·m is the non-additivity of medians, and Part 31 said so in its own §4 item 4: *"the
eleven sum to +6.06 against the median of the sum, +0.04."* The means are additive **by construction** — every ledger
entry is accumulated as an angular impulse over the substeps and divided by `dt` once, and `rider` is defined as the
per-step residual — so this block could not have failed to close, and that is exactly why it settles the question.

## 6. The owner's bar, measured, with every population named

| **[M]** arm | n | fell | when, s |
|---|---|---|---|
| `fall.ts`, deck filter, sticks **0.06–0.30**, 6 entry speeds, 2 stances | **72** | **72 of 72** | 0.60–5.07 |
| the same on `fall.ts`'s own 3 entry speeds | 36 | **36 of 36** | 1.53–5.07 |
| the same, **world** filter | 36 | **36 of 36** | 1.27–4.48 |
| the same, deck filter, the stick **never centred** | 36 | **36 of 36** | 1.53–5.07 |
| `fall.ts`, deck filter, step 3.3i's own grid (sticks 0.25–1) | 24 | **24 of 24** | 1.30–4.05 |
| `fall.ts`, world filter, step 3.3g's own grid | 24 | **24 of 24** | 1.12–4.15 |
| `deck.ts`, deck filter, **stick 0 (untouched)** | 12 | **12 of 12** | **1.10–1.93** |
| `deck.ts`, world filter, stick 0 (Part 24's own twelve) | 12 | **12 of 12** | **0.77–1.70** |
| `deck.ts`, deck filter, sticks 0.10 · 0.25 · 0.50 · 0.75 · 1 | 12 each | **12 of 12** each | 0.92–4.30 |

**The owner's bar is "in Compress the surfer should not fall at the low speeds of getting into position", 100 %, not
fewer. Compress falls 36 of 36 on the 72-run gentle ladder, 18 of 18 on each 36-run arm, and 6 of 6 in each
`deck.ts` arm.** And the sentence that matters most for what to do next: **he falls 12 of 12 with the stick
untouched**, in 1.10–1.93 s, at a roll peak of 95.6°, with a larger roll drive (+24.37 N·m) than either gentle stick
puts in. **The turn is not the cause, so making the turn gentler is not the route.**

## 7. What I refuted

- **My brief's premise, and it is the error my brief told me to look for.** *"My assumption that the gentle fall has a
  single mechanism, or that it is even one population"* — it is **three** regimes on 72 runs, separated with no
  overlap in the roll peak, and **the stick does not choose between them**. Nineteen consecutive rounds have now
  refuted their brief's premise.
- **The brief's one carried-forward fact about the gentle fall.** *"The body gets ahead of the deck in this fall,
  which is the opposite of the hard one"* holds in the **flat** regime (lead positive in 15 of 19) and that regime is
  **17 of 19 the tall stance's**; the owner's Compress gets the capsize in 22 of 36, where the lead is positive in
  4 of 36. **Step 3.3i's 7-run band reproduces to the digit and does not mean what it was taken to mean.**
- **The framing that the gentle turn asks too much of the board.** The rider's own roll drive is **lowest at the
  gentle sticks** — 6.64 and 7.92 N·m against 24.37 with the stick untouched and 33.47 at a full stick — and he falls
  12 of 12 in every arm of the ladder.
- **The advisor's read (b), by its own method.** The "angle slope near zero" prediction fails on 6 of 6 arms
  (12.4–32.9 N·m/rad); the rate slope spans 3.17–15.19 across the six and collapses when the angle enters the model,
  so the regression cannot measure it. Read (a)'s structural read does, at 9.4–16.2 N·m·s/rad.
- **The advisor's read (c), arithmetically.** Nothing is missing from Part 31's column: in means the twelve entries
  sum to the total to **nine decimal places** on two populations and `bed + froth + suction` add exactly zero.
- **Step 3.3h's denominator, which is the one correction this round makes to a published number.** The solve's roll
  inertia is **0.498–1.140 kg·m², 19.0–43.5× the 0.0262 kg·m²** that *"1 N·m = 2 187 °/s²"* divides by. The right
  figure is **50.2–115.1 °/s²**.
- **Two artefacts, by running them.** The probe's own stick centring changes **1 of 36** runs; the deck filter does
  not make the flat fall (the world filter falls 36 of 36 too), though it does turn the partial roll into a capsize in
  about a third of the ladder.
- **My own P1.** I predicted the dry control would read the roll element exactly; a dry board cannot feed a standing
  contact, so that path eliminates the matrix and the prediction was not testable. The heave half of the same
  prediction held to the digit four times, and §3.2's closure is the control that does the work.

## 8. What I will not claim

- **I will not claim the ankle's commanded rest is the cause of the flat fall.** What is measured is that it is at its
  ±14.32° stop in **62 of 72** runs while the hip has room in 69 of 72, and that in the flat regime it **precedes**
  the capture point's departure by a median **0.067 s in 14 of 19**. That is four frames at 60 Hz inside a 0.283 s
  window, with no A/B behind it, and a lead is not a cause. §10 names the test.
- **I will not claim the capsize is the board reaching its own roll equilibrium**, although one arm's
  `drive / stiffness` of 73–112° brackets its measured 75.7–90.1° of rail. The second population does not confirm it
  and the fit degenerates there (R² 0.026–0.291). One arm is not a law.
- **I will not claim a `cos³` fall-off of the added roll inertia.** The per-run power fit is −3.35 to +3.71. The
  direction and the factor (7–10 from trim to past 60°) are measured; the exponent is not.
- **I will not claim the three regimes are exactly three, or that the 10° and 60° cuts are physical.** 60° is step
  3.3i's own cut, kept so the two rounds can be read together; 10° is mine, chosen because the roll **peak** separates
  with a gap there (49.3° against 62.0°) on a classifier built from a different frame. **B is a middle band and it
  overlaps both**, and 17 of 72 runs are in it.
- **I will not claim the stance *causes* the regime.** It predicts it strongly on 72 runs (tall A17/C14 against
  Compress A2/C22) and so does the entry speed (−2 m/s gives C in 11 of 12), and I did not vary one with the other
  held — the grid is complete but the mechanism is not measured.
- **I will not claim the structural damping is a sourced hull damping.** It is this model's own coefficient read off
  this model's own matrix. That it lands on the sourced 12.7 (ITTC) is a consistency the advisor predicted and not a
  validation of the hull law.
- **I will not re-promote the net roll moment as a headline**, as the advisor asked; and I will not replace it with
  the terminal rate either, because that is 2–10× low on the gentle arm (§4).
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed rather than paddled in, **`deck.ts`'s six
  entry speeds and `fall.ts`'s three are different populations and are never pooled**, `inertia.ts`'s ride arm is its
  own third population, and every span above is **the whole population of its arm**, not a confidence interval.
- **No bot ride is offered as evidence of feel anywhere in this document.**

## 9. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- the four probes type-checked separately on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, with `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/fall.ts`, `.../deck.ts`, `.../inertia.ts`, `.../stills.ts`,
  `src/physics/AttachedRider.ts`, `src/physics/BoardBody.ts`, `src/physics/PlaneWater.ts` and `@types/node`. **This
  check caught a real error the root project cannot see** (`WATER_KEYS.concat(['gyro'])` in `deck.ts`, since
  `WATER_KEYS` is a narrowed literal tuple), which is why it is run and not assumed.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **57 files, 611 passed, 21 expected fail** — identical to Part 32's.
  `vitest run src/game src/scene/rig`: **70 files, 731 passed** — identical.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail** —
  identical.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**, the reference.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: this round touches no solver, no wave and no spot file.
- **the shipped rider is proved unchanged against four published baselines**, which is the seatbelt that matters for a
  round whose whole output is numbers off the shipped rider:
  - `fall.ts` with no switch set reproduces **3.3g's and 3.3i's world arm to the digit** (tall 1.20–4.15, Compress
    1.12–3.98, all 24 at 1.12–4.15 s, nets 12.6–88.1°);
  - `fall.ts` on the deck filter reproduces **3.3i's own grid to the digit** (all 24 at 1.30–4.05 s);
  - `deck.ts` at `STEER=1 FELT=deck ROLL=on ANKLE=on` reproduces **3.3h §4's whole per-source table to the digit**
    (rider +33.47, pressure −20.46, buoyancy −3.81, radiation −1.65, addedMass −1.16, fins −0.47, rails +0.09,
    friction +0.04, water −33.40, net +0.04, the implied arm 0.0525 / 0.3092 m, the direct reading 39.19,
    |direct − residual| 4.721 / 143.196, 1 118 commanded frames);
  - `deck.ts` at `STEER=0 ROLL=on ANKLE=on` reproduces **Part 24's and Part 31's unsteered twelve to the digit**
    (12 of 12 at 0.77–1.70 s, bank peak 20.7–65.7°, roll peak 20.9–63.0°, rail peak 10.9–62.9°, drift peak 1.9–4.9°,
    rider +17.84, water −17.78, direct +20.81, |direct − residual| 2.134 / 28.735, arm 0.0228 / 0.1218 m).
- **a positive control for the new instrument, predicted before it ran** (`inertia.ts`'s header, §3.1–3.2): the gate's
  negative control (no rider ⇒ asymmetric ⇒ rejected) held; the heave element read the board's own 2.54 kg exactly on
  all four control rows; the floating read is symmetric to the last bit; and the hand reconstruction closes on
  `x̂ᵀAx̂` to **0.0001 kg·m² on 1.81**. My own P1 on the dry roll element **failed and is reported as failed**, with the
  measured reason.
- **no Canyon byte check, because there is nothing to check**: `git diff --stat` against `main` touches
  **`docs/` only** — no `src/`, no solver, no wave, no spot file, no hull law, and **no switch reaches the game**.
  The check's own purpose is to catch a behavioural change in shipped code, and this round ships none; the four
  reproductions above are the evidence in its place.

## 9b. The deletions column, read line by line

`git diff --cached --numstat origin/main`, read file by file: **35 files changed, 3 879 insertions and exactly ONE
deletion.** The one deletion is read and quoted:

- `docs/research/new-rider/3.3/fall.ts`, **1**: the row object's first line,
  `rider: RIDER, stance: st, extra, steer, felt: …, ankleLimit: ANKLE_LIMIT ?? 'shipped', hand: HAND,` — replaced in
  place by **the identical line plus `ankle: ANKLE ? 'on' : 'off'`** at its end, so the round's own switch is named in
  every row. Nothing was removed and nothing was reverted. Every other change to this file is an insertion beside the
  line it belongs to.
- `docs/research/new-rider/3.3/deck.ts`, **0**: §6b and §6c are inserted before §6's closing brace.
- `docs/research/new-rider/3.3/README.md`, **0** — this Part is appended.
- `docs/research/new-rider/3.3/inertia.ts` and the 31 files of `docs/research/new-rider/3.3/results/33j/` — **pure
  additions, zero deletions each.**

The behavioural proof that the one replaced line changed nothing is §9's four reproductions: `fall.ts`'s two arms and
`deck.ts`'s two reproduce their published records to the digit.

`origin/main` is still **5481822d**, this branch's own merge base, so there was no mid-round merge to rebase onto —
and the column was read rather than that being assumed.

## 10. Files (3.3j)

- `docs/research/new-rider/3.3/inertia.ts` — **new**: the solve's own roll inertia, its symmetry gate, its dry and
  floating controls, the hand reconstruction that closes it, and the hull's own roll damping off the same assembly.
  No source file is touched by it.
- `docs/research/new-rider/3.3/fall.ts` — `ANKLE=on` (off by default) and step 3.3j's gentle-fall columns: the raw
  board-frame roll and bank, `|bank| − |roll|` and its peak and share, the roll rate, the reversal times, the body's
  place across the board's own centreline against the live support half-width, step 3.2z's split at its own last
  consistent frame, the ankle ledger's four columns, the stick-centring gap, and the ankle command's saturation and
  its lead on `px`. Four new printed tables, split by regime.
- `docs/research/new-rider/3.3/deck.ts` — **§6b** (read (c): the same roll column in means, which sum) and **§6c**
  (read (b): the rate/angle split, the collinearity, the stiffness with the damping held, and the terminal rate). Both
  print only when `ROLL=on`, and the two published arms reproduce to the digit with them on.
- `docs/research/new-rider/3.3/results/33j/` — eleven arms with their printed tables beside their rows,
  `33j-predictions.md` (every prediction as written before its read), `33j-regimes.txt` and the script that made it.

## 11. For the owner, in plain words — and the shot list

**You asked me to fix the gentle fall first. I measured it on 72 runs instead of 6, and the first thing I have to tell
you is that there isn't one gentle fall. There are three, and the gentleness of the turn is not what decides which one
you get.**

I ran him at six different stick positions from a feather-touch (0.06 of full) up to a third of full, at six entry
speeds, in both stances — 72 rides. **All 72 fell.** Sorting them by how far the board had rolled over when he went:

- in **19** of them the board was essentially **flat** — never past 50°, and within 8° of level when he went — and
  what crossed the line was **his body**, walking out to 1.1 to 1.7 times his own foot-width off the centreline;
- in **36** of them the board **capsized**, past 60° and often to 90°, and he went over with it;
- **17** were in between.

**And here is the part that changes what to do next: which one you get is decided by the stance, not by the stick.**
The flat "he walks off a level board" fall is almost entirely the **tall** stance's — 17 of the 19. **Your own stance,
Compress, capsizes the board in 22 of 36 and rolls it past 10° in 34 of 36.** So the thing I was sent to go and
measure — the fall where his body gets ahead of the deck — is real, and it is *not the one your Compress rides into*.

**Two more measurements that I think settle the direction.**

**First: he falls with the stick untouched.** Not gently steering — not steering at all. **12 of 12, in 1.1 to 1.9
seconds.** And when I measure how hard his feet twist the board, the *gentle* stick positions twist it the **least** of
anything on the ladder: about 7 newton-metres, against 24 with no stick at all and 33 at a full stick. **So the gentle
turn is not what is killing him. Making the turn gentler cannot be the fix, because he already falls without one.**

**Second: it is sudden, every time.** A third of a second before he goes, his weight is comfortably inside his feet in
all 72 runs. The flat fall is the **fastest** of the three — his balance point travels at about 0.7 m/s in the last
fifth of a second — and the fall test's second condition is true for only **two or three frames** before he is off.
Whatever is going wrong goes wrong late and quickly, which is not a man slowly losing his balance.

**One thing I found that is at its limit when he goes, and I am being careful about it.** The game lets his balance
ask his ankles to shift his weight by up to **14.3 degrees**. In **62 of the 72 runs** that request is **maxed out**
when he falls — while his hips, the thing two earlier rounds spent themselves on, still have room in 69 of 72. In the
flat fall the ankle request maxes out about **0.07 s before** his weight starts leaving his feet, in 14 of 19 runs.
**That is a suspect with a stopwatch on it, not a cause** — four frames is not proof — but it is the first limit I have
found that is actually *at its stop* in your own failing case, and testing it is one switch.

**And three bits of housekeeping on numbers you have been told before.** The board's resistance to being rolled is
**19 to 44 times** what Part 31 divided by — I read it off the matrix the physics actually solves, and the wave advisor
predicted the figure almost exactly. So the old line *"1 newton-metre spins this board at 2 187 degrees per second
squared"* was wrong; it is 50 to 115. Second, the advisor thought a column was missing from the roll table; it isn't —
I added them up a different way and they close to nine decimal places. Third, they predicted the board has essentially
no resistance to *sitting* at a roll angle; it has a real one, on all six of my tests.

**Your bar is still not met: 72 of 72, and 36 of 36 in Compress.**

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot. One change at a time, as always. Nothing new to turn on — everything
below is the game as it ships.

1. **`?rider=new&feltFrame=deck&canyonWaves=true`, and DON'T TOUCH THE STICK.** Get into position at low speed, press
   Compress, and ride straight. **The question: does he fall anyway, and does it look like the board tipping over or
   like him stepping off a flat board?** The measurement says he falls in about 1 to 2 seconds with the board rolling
   past 90°. **This is the shot I most want your eyes on**, because if it is true on the wave as well as the bench,
   the gentle *turn* is a red herring and I should stop measuring turns.
2. **The same, then the feather-touch turn** (barely move the stick). Measurement says this is the *least* twist he
   ever puts into the board and he still goes, 12 of 12.
3. **The same in the TALL stance, gentle turn.** Measurement says this is where the other fall lives — **a nearly flat
   board and his body leaning out past his feet**. **The question: does that one feel different from Compress's?** If
   the two feel like one thing to you, my three regimes are one thing to ride and I will say so and stop splitting
   them.
4. **And a ruling I would like, not a ride.** Given that he falls with the stick untouched, **do you want me to drop
   the turn entirely and work on standing still first?** Every round on this track for a fortnight has measured a
   turn. If the answer is yes, the next measurement I would run is the one limit that is at its stop in your own
   case — the 14.3° the balance may ask of his ankles — which is one switch, one A/B and a stated prediction: **if it
   is the binding limit, widening it moves the flat fall and leaves the capsize alone; if it moves neither, it is
   innocent and I will publish that.**

# Part 34 — the command saturates and the rest does not, the bound is innocent, and standing still the body goes first and the deck follows it

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33k`, cut from `main` at
**6b94c922** (step 3.3j's merge), so Part 33 is its base. It ships **one opt-in behavioural switch**
(`?ankleRange=load|wide`, off by default, pinned off in the online rooms), two new read-only ledger columns, the
probe's own unsteered window, and **360 runs over nine arms** — four 24-run `fall.ts` arms on the stick untouched,
three 72-run gentle ladders, and two 24-run reproduction arms.

Tags as in 3.2 and 3.3: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source; **[I]** my
inference from a stated model; **[A]** arithmetic on measured numbers, labelled as such.

## 0. The seven sentences the round is for

1. **The owner's bar is not met, and this round adds the stick-untouched population to the record.** `fall.ts` on the
   owner's own address, the stick never touched, three stances × eight entry speeds: **24 of 24 fall at 1.10–2.07 s**
   on the deck filter and **24 of 24 at 0.77–1.95 s** on the world one, and Compress on the deck filter capsizes the
   board past 60° in **7 of 8** [M]. Across the round's nine arms, **360 of 360 fall**, with the switch off, on
   `'load'` and on `'wide'` alike.
2. **My brief's redirection is half refuted by its own target: there is no flat fall standing still.** Step 3.3j's
   regime A (|roll| < 10° at the fall) is **0 of 24 on the deck filter and 0 of 24 on the world one** [M]; the deck's
   roll at the fall is **27.5–89.0°** and **20.9–68.8°**. The flat fall — the one the brief sent me to fix by
   dropping the turn — **needs the stick**. On the gentle ladder it is 19 of 72; with the stick untouched it does not
   occur. **So "drop the turn and the job is standing still" trades the owner's fall for a different population, not
   for a simpler one.**
3. **The candidate step 3.3j named is measured and it is NOT at its stop. The quantity that saturates is the
   predictor's command, not the rest the ankle gets.** On step 3.3j's own 72-run ladder, reproduced here, the
   predictor's sent ankle command is at ±14.32° in **62 of 72 — 3.3j's own figure, to the run.** The rest the ankle is
   actually given is at that bound in **1 of 72**, its median absolute value is **3.41°**, and standing still it is
   **0 of 24 on both filters**, with a median absolute value of **5.19°** (deck) and **2.42°** (world) [M]. **Two different quantities, one name.**
4. **What bounds the rest instead is the rail's bite, and it is read in the code, not inferred.** The clamp is
   `[−room, +range]` with `room = range × max(0, 1 − (|rail| − RAIL_BITE)/RAIL_EASE)`, **zero at |rail| ≥ 52°** [R].
   It is **shut at the fall in 19 of 24** unsteered runs on the deck filter (13 of 13 capsizes) and **40 of 72** on
   the ladder [M]; of the 62 runs whose command saturated, the bite was shut in **36** [M].
5. **The A/B ran as specified, and step 3.3j's prediction fails in both of its halves — and in the direction it did
   not offer.** Doubling the bound to ±28.65° is really used (the sent command passes 14.33° in **61 of 72** runs and
   the applied rest reaches **−27.02 to +28.03°**), and paired run for run it **saves nobody: 72 of 72 and 24 of 24
   still fall**, the median change in fall time is **0.000 s**, and the moves have **no sign in any regime** (A 7
   later / 10 sooner, B 5/7, C 13/10) [M]. The one thing it does move is the **wrong regime**: the flat count goes
   **19 → 18** and the capsize count **36 → 29** [M]. *"Widening it moves the flat fall and leaves the capsize alone"*
   is **backwards**, and the branch that holds is the one that matters: **the bound is innocent of the fall.**
6. **Standing still, the body goes first and the deck follows it through the ankle.** The ankle's own identity
   `φ = θ − δ − (θ − φ − δ)` closes with a residual of **−2.573 to +0.748°**, and that residual **is** the ledger's
   substep averaging — it equals `−(probe's joint angle − ledger's)` in **120 of 120** rows of three arms (72 + 24 +
   24), to the rounding the files are written at [M]. The spring angle is within ±10° in **20 of 24** (deck) and **24 of 24**
   (world), so the deck sits where the body's bank puts it less a rest of a few degrees. And the clock agrees: the
   **body's bank** passes 10° for good at **0.217–0.667 s**, the **deck's roll** at **0.317–0.750 s**, and the bank
   leads in **24 of 24 on each filter — 48 of 48 — at a median of +0.100 s** [M].
7. **And the two stops I found myself are refuted by their own clock, which is why neither is offered as a cause.**
   `MAX_BANK`'s hard 70° clamp on the body's bank is reached in **13 of 24**, and its lead on the weight leaving half
   the feet's bound is **negative in 13 of 13** (median −0.200 s). The rail's bite shutting leads in **2 of 18**
   (median −0.166 s) [M]. **Both arrive after the fall is already under way. They are consequences.**

## 1. (A) What ±14.32° is, read before it was moved

My brief's one instruction about the switch was *"find out what the ±14.32° is for before you widen it."* It is not a
tuning constant [R]:

`rollModel.bankAuthority` derives **`restRange = footReach · m g / series`**, with
`series = k·K_hull/(k + K_hull)` the ankle and the hull in series, and its own doc says what it is: *"the rest, rad, at
which the feet's pressure reaches their edges (`footReach`, m, out from the middle, **under one body weight**)"*.
`ANKLE_STIFFNESS`'s note says what happens past it: *"the feet's pressure reaches their edges and more only rolls the
board away onto its rail."*

So **±0.25 rad is the geometry of the sole at one body weight** — `footReach` = 0.13 m, which is
`riderPosture.ts`'s own standing support (`feet: { xMin: −0.13, xMax: 0.13 }`), the 0.13 m `soleBound` and
`predictiveBalance`'s `feetReach` already use — on a hull of about **730 N·m/rad** [A: `series = 0.13 × 75 × 9.81 /
0.25 = 382.6`, and `k H/(k+H) = 382.6` at `H = 733` for `k = 800`]. The carve lab's own hull is **850–1 700**
N·m/rad, which would put the same formula at **0.231–0.178 rad**, so the shipped 0.25 is already at the generous end
of its own derivation [A].

**Two things follow, and the second is why the round could widen it at all.**

1. **The honest form of "widen it" is not a bigger number: it is the same formula with the live numbers.** That is
   `?ankleRange=load`: `ANKLE_REST_RANGE × soleBound() / (m g × 0.13)`, the live load through the legs and the live
   support's own half-width in place of one body weight and 0.13 m. At exactly one body weight on the standing
   support it is **identically** the shipped 0.25 rad, which is the switch's own positive control (§6, and
   `ankleLedger.test.ts`).
2. **The bound is not in fact keeping the centre of pressure inside the sole, and steps 3.3i and 3.3j already
   measured that.** With the shipped range in place, the ankle's **demand** runs at **0.22–27.10× the soles' own
   bound** (Part 33 §2.2). The range bounds the **command**; `ankleLimit: 'feet'` is the switch that bounds the
   **moment**. So `?ankleRange=wide` — twice the bound, paid for by no geometry — does not introduce a violation that
   was not already there, and it is the literal widening step 3.3j's §10 item 4 wrote its prediction against. It is
   reported as a measurement and **not** offered as something to ship.

## 2. (B) Standing still, measured on its own population

**The cell is `fall.ts`'s own** — the Canyon-matched `FaceWater` (1.4 m / 16° / 5.7 m/s, 2.6 m deep, the board 0.75
fronts ahead of the crest and 45° off the fall line), the stance held, 9 s a run. **The population is new**: the stick
**never touched** (`STEERS=0`, so `rider.steer` is 0 on every frame of every run), **eight** entry speeds
(−3, −2, −1, 0, +1, +1.5, +2, +3 m/s) × **three** stances (tall, crouch, Compress) = **24 runs**, run twice, once on
`?feltFrame=deck` (the owner's address) and once on the shipped world filter. Step 3.3j's gentle ladder is run beside
it unchanged and **the two are never pooled**; `deck.ts`'s six entry speeds are a third population and are not pooled
with either.

**The datum**: every angle in §2 is the **raw board-frame** one, `+` meaning the deck normal, or the body's lean,
toward the board's own **+x** — not the `dir`-signed convention, which standing still has no meaning at all, since
there is no commanded turn to have an inside. The probe says so in its own row (`steered: 0`).

**One honest caveat about the cell, before any number.** The entry speed is `(5.7 − alongFlow)/cos 45° + extra`, so at
`extra = 0` the board runs at **7.7–8.3 m/s** and the speed at the fall across the 24 runs is **4.99–10.00 m/s** [M].
**This arm is "the stick untouched", which is not the same thing as "the low speeds of getting into position."** The
low end of it (entry −3, **5.82–6.88 m/s at the fall**) is the nearest this cell comes to the owner's words, and it
falls there too — **6 of 6 across the two filters, at 0.95–1.60 s** [M].

### 2.1 There is no flat fall standing still

| **[M]** `fall.ts`, the stick never touched, 24 runs an arm | deck filter | world filter |
|---|---|---|
| fell | **24 of 24** | **24 of 24** |
| at, s | **1.10–2.07** | **0.77–1.95** |
| **A flat** (\|roll\| < 10° at the fall) | **0** | **0** |
| B partial (10–60°) | 11 | 22 |
| **C capsize** (≥ 60°) | **13** | 2 |
| the deck's roll at the fall, ° | **27.5–89.0** | **20.9–68.8** |
| the body's bank at the fall, ° | 28.4–**70.0** | 20.7–**70.0** |
| the deck's roll peak, ° | 27.5–95.6 | 20.9–68.8 |
| Compress: A / B / C | **0 / 1 / 7** | 0 / 8 / 0 |
| tall | 0 / 5 / 3 | 0 / 7 / 1 |
| crouch | 0 / 5 / 3 | 0 / 7 / 1 |
| the trigger: `beyond` / `weightPast` / together | 1 / **20** / 0 | 15 / 8 / 1 |
| \|px\| 0.3 s before the fall, inside the feet's 0.13 m | **24 of 24** | **24 of 24** |
| the deck's share of the fall-test error, median | 0.32 | **0.83** |

**Four readings.**

1. **Regime A is empty on both filters.** The classifier is step 3.3j's own and the roll at the fall never comes
   within 10° of level: the nearest is 27.5° (deck) and 20.9° (world). **The fall the brief carried forward as the
   one to work on — the body walking off a flat board — is a fall that needs a stick**, and on the gentle ladder it
   is 17 of 19 the tall stance's anyway (Part 33 §2.3). This refutes my brief's premise that dropping the turn keeps
   the same problem and removes a complication: it removes **that** problem and leaves the capsize.
2. **Compress on the owner's own filter capsizes in 7 of 8**, which is Part 33's finding arriving from a second
   probe, a third stance and a different population.
3. **It is sudden here too.** `|px|` is inside the feet's own bound 0.3 s before the fall in **all 48 runs**
   (0.030–0.110 m deck, 0.025–0.127 m world, against 0.13), and the deck-filter arm's `px` rate over the last 0.2 s
   reaches 1.23 m/s. Nothing in this arm is a slow stall.
4. **The two filters are two different falls and the deck-share column is the measurement of it**: the world arm's
   fall is three quarters the deck's bank (median 0.83) and the deck arm's only a third (0.32), while the deck arm is
   the one that capsizes. I report that as a measured property of the filter the owner rides with, as Part 33 did, and
   not as a reason to change it: the frame is right (steps 3.3c, 3.3g) and the fall count is 24 of 24 either way.

### 2.2 The deck's roll is the body's bank, less the rest, less a few degrees of spring

**The identity, which is why this is a measurement and not a model.** The ankle is a spring on the joint's own angle
about a commanded rest, so **by definition**

> `φ = θ − δ − (θ − φ − δ)`

— the deck's roll is the body's bank, less the rest the balance commanded, less the ankle's own **spring angle**,
which is `τ_spring / K` and is 2.4° at 33 N·m on K = 800 N·m/rad. The three add to `φ` exactly, so the content is
their **sizes**.

| **[M]** at the fall, raw board frame | deck, 24 runs | world, 24 runs | the ladder, 72 runs |
|---|---|---|---|
| the deck's roll φ, ° | 27.5–89.0 | 20.9–68.8 | — |
| the body's bank θ, ° | 28.4–70.0 | 20.7–70.0 | — |
| **the commanded rest δ, °** | **−3.62–13.85** | **−9.87–7.63** | **−13.11–14.07** |
| … \|δ\| inside the ±14.32° bound | **24 of 24** | **24 of 24** | **72 of 72** |
| … \|δ\| at 98 % of its own bound | **0 of 24** | **0 of 24** | **1 of 72** |
| … median \|δ\| | 5.19 | 2.42 | **3.41** |
| the spring angle θ − φ − δ, ° | −54.98–9.26 | −1.97–8.54 | −68.11–27.40 |
| … within ±10° | **20 of 24** | **24 of 24** | 39 of 72 |
| **the identity's residual, °** | **−2.573–0.748** | **−0.508–1.551** | — |
| … equal to the ledger's own substep gap | **24 of 24** | **24 of 24** | **72 of 72** (120 of 120 in all) |

**Three readings.**

1. **The residual is the instrument and nothing else.** It equals `−(the probe's joint angle − the ledger's)` in
   **72 of 72 rows across the three arms**, to the rounding the result files are written at: the probe reads φ and θ
   at the frame's end off the board's and the rider's own geometry, the ledger reads θ − φ and δ as means over the
   step's substeps, and at 85–264 °/s of roll a step is 1.4–4.4° of difference. **That is the positive control for
   this round's new reading**, and it is why the split can be read as a split.
2. **So the deck sits where the body's bank puts it.** With the spring angle inside ±10° in 20 of 24 and 24 of 24,
   `φ ≈ θ − δ` with δ itself a few degrees: the body and the deck go over **locked**, and the deck's 27–89° is the
   body's 28–70° carried through a stiff ankle. The spring angle is large only in the **five**
   deepest capsizes (−8.86, −13.21, −18.16, −18.93 and −54.98°, at rolls of 76.1 to 89.0°) — and those are the runs where the **body** has
   already hit its 70° stop and cannot follow the deck any further (§4).
3. **And the clock says which of the two goes first.** The body's bank passes 10° for good at **0.217–0.667 s** and
   the deck's roll at **0.317–0.750 s**; the bank leads in **24 of 24 on the deck filter and 24 of 24 on the world
   one — 48 of 48 — at a median of +0.100 s** [M]. Through the last half second before the fall the body is the
   further over of the two in **77–100 % of frames in every one of the 24 world runs**.

**What I take from §2.2, and what I do not.** What is measured is an identity with its sizes and an order in time: the
body's bank leads, the deck follows it through the ankle, and the rest the balance commands is a few degrees of trim
on the difference between them. The inference that **the balance's only authority is over the split and not over the
pair's roll** follows from the identity [I] — an internal joint cannot change the pair's own angular momentum — but I
did not measure the pair's roll equation and **§7 keeps it out of the findings.** What I *did* do instead is the one
experiment that tests it: §3.

## 3. (B) The A/B, against the prediction as step 3.3j wrote it

> *"If it is the binding limit, widening it moves the flat fall and leaves the capsize alone; if it moves neither, it
> is innocent and I will publish that."* — Part 33 §10 item 4, quoted here before the read.

**One switch, `?ankleRange`, two settings, paired run for run against the same cell with it off** — the same stance,
entry speed and stick in each pair, so every row below is a difference and not two populations compared.

### 3.1 Does the switch bind? (It would say nothing if it did not)

| **[M]** the ladder, 72 runs an arm, deck filter | shipped | `load` | `wide` |
|---|---|---|---|
| the range applied to δ, ° (median over each ride) | **14.32** everywhere | **13.62–15.33** | **28.65** everywhere |
| … narrower than shipped / wider, runs | — | **31 / 41** | **0 / 72** |
| the predictor's sent command past 14.33°, runs | **0 of 72** | 24 of 72 | **61 of 72** |
| the sent command's span, ° | 3.47–**14.32** | 0.00–38.16 | 0.33–**28.65** |
| **the applied rest δ at the fall, °** | −13.11–14.07 | −15.03–14.63 | **−27.02–28.03** |

**The `wide` arm is tested**: the extra room is asked for in 61 of 72 runs and the rest really reaches 28°.
**`load` is not a widening** — it is narrower in 31 of 72 and wider in 41, so it brackets the bound rather than
pushing one way, and my own **P2 (that it would be mostly narrower) fails on the ladder and holds on the unsteered
arm** (17 of 24 narrower there).

### 3.2 And it saves nobody

| **[M]** paired, deck filter | the ladder, 72 pairs | the stick untouched, 24 pairs |
|---|---|---|
| **`load`**: fell | **72 of 72** (off: 72) | **24 of 24** (off: 24) |
| … the fall time identical / later / sooner | 25 / 18 / 29 | **22** / 1 / 1 |
| … Δ fell at, s | −2.133–+0.784, **median 0.000** | −0.283–+0.017, **median 0.000** |
| **`wide`**: fell | **72 of 72** | **24 of 24** |
| … the fall time identical / later / sooner | 20 / 25 / 27 | **22** / 2 / 0 |
| … Δ fell at, s | −1.133–+1.700, **median 0.000** | 0.000–+0.017, **median 0.000** |

| **[M]** `wide` against shipped, by the SHIPPED arm's regime | A flat, n=19 | B partial, n=17 | C capsize, n=36 |
|---|---|---|---|
| runs whose fall time moved at all | **17** | 12 | 23 |
| … later / sooner | **7 / 10** | 5 / 7 | **13 / 10** |
| the median of the moves, s | −0.017 | −0.042 | +0.017 |
| the regime it moved to | A14 / B3 / **C2** | A2 / B14 / C1 | **A2 / B8** / C26 |
| the arm's own regime count, shipped → `wide` | **19 → 18** | 17 → 25 | **36 → 29** |

**Four readings, and the first is the answer.**

1. **The bound is innocent.** Doubling it saves **0 of 96 runs** across the two arms, and `load` saves 0 of 96 as
   well: **360 of 360 runs in this round fall.** The median change in fall time is **0.000 s** in every arm, and
   neither setting turns a fall into a ride anywhere.
2. **Step 3.3j's prediction fails in its specifics, and backwards.** It said widening would move the flat fall and
   leave the capsize alone. Measured: **the flat count barely moves (19 → 18)** and **the capsize count moves most
   (36 → 29)**, with 8 of 36 capsizes becoming partial rolls and 2 becoming flat. The moves that happen have no
   sign — 7 later against 10 sooner in A, 13 against 10 in C — so **nothing here is a direction, only a reshuffle.**
3. **Standing still it is almost perfectly inert**: 22 of 24 pairs fall at the **identical** time on each setting, to
   the frame, which is what §2.2 predicts — the rest is nowhere near its bound there (0 of 24 at 98 % of it), so a
   bigger bound is a bound on nothing.
4. **The one effect worth a sentence, and it is not a fix**: a doubled bound changes the **kind** of fall on the
   ladder (fewer capsizes, more partial rolls) without changing the fall. If the owner finds the capsize uglier to
   ride than a partial roll, that is a feel question for them and not a number for me.

## 4. (B) Where the rest's bound actually is, and the two stops that are not causes

### 4.1 The rail's bite, which the brief's candidate did not know about

The clamp on the rest is not symmetric and it is not the range [R]:

```
room  = restRange() × max(0, 1 − (|rail| − RAIL_BITE) / RAIL_EASE)     RAIL_BITE = 48°, RAIL_EASE = 4°
lean  = rail > 0 ? max(−room, min(range, wanted)) : max(−range, min(room, wanted))
```

So **past |rail| ≥ 52° the room on one side is exactly zero**, and that side is the one that would roll the board
further onto the rail it is already on — the design's own rule, from the rail-change study: *"the feet never roll the
board away from it."*

| **[M]** at the fall | deck, 24 | world, 24 | the ladder, 72 |
|---|---|---|---|
| the rail, ° | 17.7–88.9 | 10.8–68.8 | — |
| **the bite's room shut (≤ 0 at the fall)** | **19 of 24** | 3 of 24 | **40 of 72** |
| … in the capsize regime | **13 of 13** | 2 of 2 | — |
| of the runs whose COMMAND saturated, the bite was shut in | 6 of 6 | — | **36 of 62** |
| … and the applied rest was at the range in | **0** | — | **1** |
| … and under 0.2° in | 1 | — | 10 |

**This is the refutation of the brief's candidate, in one line**: *the command saturates against ±14.32° in 62 of 72;
the rest the ankle gets is at that bound in 1 of 72, because in 36 of those 62 the rail had already shut the room on
the side the balance was asking for.* The two numbers were read as one quantity, and they are two.

### 4.2 And the bite is not a cause either, by its own clock

| **[M]** deck filter, the stick untouched, 24 runs | |
|---|---|
| `px` left half the feet's bound (0.065 m) for good at, s | **0.800–1.850** |
| the bite shut at, s | 1.000–1.817 |
| **its lead on that departure**, s | median **−0.166**, positive in **2 of 18** |
| the body's bank reached MAX_BANK's 70° stop, runs | **13 of 24** |
| it got there at, s | 1.067–1.950 |
| **its lead on that departure**, s | median **−0.200**, positive in **0 of 13** |

**Both of my own candidates arrive after the weight has already left the feet.** A limit that is reached 0.17–0.20 s
*after* the quantity the fall test is built on has gone is a **consequence of the fall**, not a candidate for its
cause, and I am not entitled to either of them. §7 keeps them there.

**One thing I found on the way and am flagging without claiming.** `AttachedRider.frame` **hard-clamps the measured
body bank at MAX_BANK = 70°** (`this.bank.angle = max(−MAX_BANK, min(MAX_BANK, angle))`, three sites) [R], and the
clamped value is what the body's own frame, its centre-of-mass target and the ankle's torque
`K (θ − φ − δ)` are then built on. Past 70° the geometry the ankle's spring is computed from is **not the body's
actual lean**, so the torque is not the torque that geometry would give. It is reached in 13 of 24 unsteered runs and
27 of 72 ladder runs [M] — always after the fall is under way, so it cannot be this fall's cause, and it is a **real
force consequence of a clamped reading** that belongs to a round of its own.

## 5. The owner's bar, measured, with every population named

| **[M]** arm | n | fell | when, s |
|---|---|---|---|
| `fall.ts`, deck filter, **the stick never touched**, 8 entries × 3 stances | **24** | **24 of 24** | **1.10–2.07** |
| the same, **world** filter | 24 | **24 of 24** | **0.77–1.95** |
| the same, deck filter, `?ankleRange=load` | 24 | **24 of 24** | 1.10–2.07 |
| the same, deck filter, `?ankleRange=wide` | 24 | **24 of 24** | 1.10–2.07 |
| `fall.ts`, deck filter, step 3.3j's gentle ladder (6 sticks × 6 entries × 2 stances) | 72 | **72 of 72** | 0.60–5.07 |
| the same, `?ankleRange=load` | 72 | **72 of 72** | 0.58–5.12 |
| the same, `?ankleRange=wide` | 72 | **72 of 72** | 0.60–4.78 |
| `fall.ts`, world filter, step 3.3g's own grid (the reproduction) | 24 | **24 of 24** | 1.12–4.15 |
| `fall.ts`, deck filter, step 3.3i's own grid (the reproduction) | 24 | **24 of 24** | 1.30–4.05 |

**The owner's bar is "in Compress the surfer should not fall at the low speeds of getting into position", 100 %, not
fewer. It is not met.** Compress falls 8 of 8 in each unsteered arm and 36 of 36 on the ladder, and **nothing this
round built changes a single one of those outcomes.**

## 6. The switch, and its positive control predicted before it ran

`?ankleRange=load|wide` (`AttachedRiderOptions.ankleRange` → `RideSessionOptions` → `SurfZoneConfig` →
`ankleRangeSwitch`), **off by default, pinned off in the online rooms**, the new surfer only, in the shape
`?feltFrame=deck`, `?kneeRoom=achieved`, `?stanceReach=keep` and `?ankleLimit=feet` already use.

**It moves one thing.** Only the bound on the commanded rest: the rail-bite easing's `room`, the clamp on the
predictor's raw ankle command, and the `limits.ankle` the predictor is told — which is also what its own forward model
is fed, so the two must agree or the loop is predicting a command it did not send. `HIP_SHARE × ANKLE_REST_RANGE`,
which sets what the hip takes, and the `lagging` test's `ANKLE_REST_RANGE / BANK_GAIN` are **left at the shipped
constant on purpose**, so the hip's demand is untouched and the A/B is one change. The old rider's `bankStep` is
untouched.

**The control, written in the test file before it ran** (`ankleLedger.test.ts`, step 3.3k's block):

- **P0a** With `'load'` the booked bound is `0.25 × legLoad / (m g)` in **every** step, to nine decimals, because the
  live support is exactly ±0.13 m and the two 0.13 m cancel — **so at one body weight it is the shipped 0.25 rad
  identically**, which is what makes this an A/B on a bound and not a second rider. **Held.**
- **P0b** `'wide'` books exactly 0.5 rad and the switch off exactly 0.25, in every step. **Held.**
- **P0c** The doubled bound moves the trajectory after 60 frames (otherwise the arm is untested). **Held.**
- And the clamp clamps: `|δ| ≤` the bound applied, every step, all three settings. **Held.**

**One thing left in rather than floored, and named**: `soleBound()` is zero until the contact ledger has run once, so
on `'load'` the first step's bound is zero and the rest is pinned at nothing for that step. That is the physics —
unloaded feet shift no pressure — and a floor would be a constant nothing measured. The probe prints the first
frame's bound so it can be seen (`ankleRoomFirst`).

## 7. What I refuted

- **My brief's premise, which is the nineteenth round running.** *"Drop the turn. The job is standing still"* — the
  fall standing still is **not the flat fall it was sent to fix**: regime A is **0 of 24 on both filters** and the
  deck's roll at the fall is 27.5–89.0° / 20.9–68.8°. Dropping the turn drops that population entirely.
- **Step 3.3j's one named candidate, and the reason is a quantity confusion, not a wrong number.** Its 62 of 72 is
  **reproduced to the run** — but it is the predictor's **sent command** at its bound, and the **rest the ankle gets**
  is at that bound in **1 of 72** and **0 of 24** standing still, with a median absolute value of 3.41° and 5.19°.
  The clamp that stands between them is the rail's bite, shut in 40 of 72 and 19 of 24.
- **Step 3.3j's own prediction for the A/B, in both halves and in the direction it did not offer.** Widening moves the
  **capsize** (36 → 29) and barely touches the **flat** fall (19 → 18), with no sign to the moves in any regime, and
  it **saves nobody** in 96 paired runs. The bound is innocent.
- **My own P2**, that `'load'` would be a tightening: it is narrower in 31 of 72 on the ladder and wider in 41. It
  holds only on the unsteered arm (17 of 24 narrower).
- **My own P3's second half.** I predicted the ankle's spring angle would be small *and* the identity's residual under
  1°. The spring angle is within ±10° in 20 of 24 and 24 of 24 — but it reaches −54.98° in the deepest capsize, and
  the residual is within 1° in only 17 of 24, because it is the ledger's substep averaging at up to 264 °/s of roll.
  **The residual is an instrument, not an error, and it was predicted as an error.**
- **My own two candidates, by their own clock.** The rail's bite shutting and `MAX_BANK`'s 70° stop are both **at
  their stop** at the fall (19 of 24 and 13 of 24) and both arrive **0.17–0.20 s after** the weight has left half the
  feet's bound, positive in 2 of 18 and 0 of 13. Neither is offered as a cause.

## 8. What I will not claim

- **I will not claim the rail's bite is the cause of the fall**, although it is the bound that actually binds the
  rest. Its own clock refutes it: median lead −0.166 s, positive in 2 of 18.
- **I will not claim `MAX_BANK`'s clamp is a cause**, for the same reason (median −0.200 s, positive in 0 of 13). That
  the clamped reading feeds the ankle's own torque is **read in the code** and is a candidate for a later round, not
  a finding here.
- **I will not claim the balance has no authority over the pair's roll**, although the identity in §2.2 implies it
  and the A/B is consistent with it. I did not measure the pair's roll equation; what is measured is an identity with
  its sizes, an order in time, and a switch that changes nothing.
- **I will not claim the body's bank leading the deck's roll is a cause either.** It is a clock on 48 of 48 runs with
  a median of +0.100 s and it is the strongest ordering this track has measured — and an order is not a mechanism.
  What makes the body's bank run away from 0.22 s is the next question and this round does not answer it.
- **I will not claim the three regimes are physical**, or re-open them: A, B and C are step 3.3j's cuts, kept so the
  two rounds read together, and A being empty standing still is a measurement about this cell and this stance set.
- **I will not claim `'load'` is better or worse than the shipped bound.** It saves nobody, it moves the fall time
  with no sign, and it is narrower in some runs and wider in others. It is the honest form of the bound and that is
  all it is.
- **The `FaceWater` is a fit to Canyon, not Canyon**, the rider is placed rather than paddled in, and **the stick
  untouched is not "low speed"**: this arm runs at 4.99–10.00 m/s at the fall. `fall.ts`'s eight entry speeds and
  `deck.ts`'s six are different populations and are never pooled. Every span above is **the whole population of its
  arm**, not a confidence interval.
- **No bot ride is offered as evidence of feel anywhere in this document.**

## 9. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- the probes type-checked separately on a throwaway project extending the root's options with `types: ["node"]` and an
  **absolute** `typeRoots`: **exit 0**, with `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/fall.ts`, `.../deck.ts`, `.../inertia.ts`, `.../stills.ts`,
  `src/physics/AttachedRider.ts`, `src/physics/BoardBody.ts`, `src/physics/PlaneWater.ts` and `@types/node`.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **57 files, 612 passed, 21 expected fail** — step 3.3j's 611 **plus this round's one new
  test** (`ankleLedger.test.ts`'s `ankleRange` block).
  `vitest run src/game src/scene/rig`: **70 files, 732 passed** — step 3.3j's 731 plus this round's one new switch
  test (`PhysicalMode.test.ts`).
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail** —
  identical to step 3.3j's.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand because this round touches
  `SurfZoneRunner.ts`: **43 of 43**, the reference.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: the one line this round adds to that file is a config
  field, no solver, no wave and no spot file is touched.
- **the shipped rider is proved unchanged against three published baselines**, which is the seatbelt that matters for
  a round that moves a line in the bank step:
  - `fall.ts` with no switch set reproduces **3.3g's and 3.3i's published world arm to the digit** — tall
    **1.20–4.15 s**, Compress **1.12–3.98**, all 24 at **1.12–4.15**, nets **12.6–88.1°**;
  - `fall.ts` on the deck filter reproduces **3.3i's own grid to the digit** — all 24 at **1.30–4.05 s**;
  - `fall.ts`'s 72-run gentle ladder reproduces **3.3j's own** — **72 of 72 at 0.60–5.07 s**, and its ankle column
    reproduces 3.3j's **62 of 72** saturated commands exactly.
- **the Canyon byte check, because `src/` changed** (`scripts/m1-cpu-bench.ts`, medium, 3 600 steps, **fresh**
  spin-ups into new state paths), with the three checks read rather than assumed — the wrapper prepends
  `globalThis.location = { search: '?canyonWaves=true' }` to the bundle (a prepended line, because a dynamic import
  makes rolldown split the chunk), the grid line read, and the "spun up on the CPU in … s" line read so that no kept
  `.sea` was imported:
  - Canyon B (`?canyonWaves=true`), **400 × 451 = 180 400 cells**, spun up on the CPU in **45.8 s**: snapshots
    **a367d938f15fa934**, state **9e5831f80e38abd9** — **the same as main.**
  - the default Canyon, **400 × 507 = 202 800 cells**, spun up on the CPU in **57.1 s**: snapshots
    **ea3d57a4d49f4b48**, state **a1a2555739210f96** — **the same as main.**

  All four match, which they must: this round touches no solver, no wave, no spot file and no hull law, and the five
  rider lines it does touch read `ANKLE_REST_RANGE` through `restRange()`, which returns that constant with the switch
  off. The raw output is `results/33k/33k-canyon-byte-check.txt`.

## 9b. The deletions column, read line by line

`git diff --cached --numstat origin/main`, read file by file: **30 files changed, 3 165 insertions and exactly
FIFTEEN deletions** — and **all fifteen read, one by one. Every one is a single line replaced in place**, and not one
is a removal:

- `src/physics/AttachedRider.ts`, **5**: the `room` and the `reachRest`/`lean` clamp lines in each of `humanBank` and
  `predictiveBank` (4), each replaced by the identical line with `ANKLE_REST_RANGE` read through `range`
  (= `restRange()`, which **is** ANKLE_REST_RANGE with the switch off), and the `predictor.tick` call, whose
  `{ ankle: ANKLE_REST_RANGE, … }` becomes `{ ankle: range, … }`.
- `src/physics/ankleLedger.test.ts`, **4**: the harness's signature, its rider construction, its `seen` type and its
  push, each replaced by the identical line plus the `range` option and the two new ledger columns.
- `src/main.ts`, **2**: the room-overrides comment and the overrides object, each replaced in place with
  `ankleRange` named.
- `docs/research/new-rider/3.3/fall.ts`, **2**: the `turn` window line, replaced by `steered` plus the same filter
  (and only reached differently when the stick is inside its deadband — which is why §9's three reproductions hold),
  and the header `console.log`, replaced with the same line plus two printed fields.
- `src/game/PhysicalMode.test.ts`, **1**, and `src/wave/SurfZoneRunner.ts`, **1**: long single-line lists (the import,
  the rider-options spread) replaced in place with the switch added.
- Every other file — `RideSession.ts`, `SurfZoneSimulation.ts`, `PhysicalMode.ts`, the README and the 20 files of
  `results/33k/` — is a **pure addition, zero deletions each**.

**Nothing was removed and nothing was reverted**, and the behavioural proof of the five `AttachedRider.ts` lines is
§9's three reproductions: with the switch off `restRange()` returns the constant those lines used to read, and the
world arm, the deck grid and the 72-run ladder all come back to the digit. `origin/main` is still **6b94c922**, this
branch's own merge base, so there was no mid-round merge to rebase onto — and the column was read rather than that
being assumed.

## 10. Files (3.3k)

- `src/physics/AttachedRider.ts` — `AttachedRiderOptions.ankleRange`, `ANKLE_REST_REACH`, `ANKLE_RANGE_WIDE`, the
  `restRange()` method and its doc on what ±14.32° is made of, the range read once a frame in `predictiveBank` and
  `humanBank`, and two new read-only ledger columns (`room`, the range allowed; `bite`, the same range after the
  rail's bite).
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts`, `src/main.ts` — the switch's plumbing and its pin to the default in the online rooms.
- `src/physics/ankleLedger.test.ts` — step 3.3k's block: the switch's positive control, its four predictions, and
  that the clamp clamps on all three settings.
- `src/game/PhysicalMode.test.ts` — `?ankleRange=load|wide` parsed, every other spelling ignored, and the online
  room's pin asserted against `main.ts`'s own text.
- `docs/research/new-rider/3.3/fall.ts` — `ANKLE_RANGE=load|wide` (off by default), the **unsteered window** (with no
  commanded turn the ride itself is the window, so the ride's columns are not NaN and `dir` is not
  `Math.sign(0) || 1`), and step 3.3k's columns: the roll's split by the ankle's identity and its residual, the
  probe-against-ledger control on the joint angle, the clock of the two first movers, the rail's bite on the rest's
  room, the rest at its own applied bound, and `MAX_BANK`'s 70° stop with its lead on `px`. Three new printed tables.
- `docs/research/new-rider/3.3/results/33k/` — nine arms with their printed tables beside their rows,
  `33k-predictions.md` (every prediction as written before its read) and `33k-canyon-byte-check.txt`.

## 11. For the owner, in plain words — and the shot list

**You asked whether to drop the turn and work on standing still. I did, and the first thing I owe you is that it is
not the same fall.**

I ran him with the stick **never touched** — twenty-four rides, three stances, eight entry speeds. **All
twenty-four fell**, in 1.1 to 2.1 seconds. But the fall I was sent to fix — the one where the board stays nearly flat
and his **body** walks off it — **does not happen at all without the stick**: not once in twenty-four, and not once
in another twenty-four on the other setting. Standing still, the board always goes over, 27° at the least and 89° at
the worst. In your own stance, Compress, it capsized past 60° in **seven of eight**. So dropping the turn does not
simplify the problem; it deletes the *other* problem and leaves yours.

**And the suspect I told you about last round is not guilty. Worse, I had the wrong number on it.**

Last round I said the game lets his balance ask his ankles for up to 14.3°, and that in 62 of 72 rides that request
was **maxed out** when he fell. That is true — and it is the request, not what his ankles are actually given. **What
they are actually given is at its limit in 1 of those 72 rides**, and typically about three and a half degrees. In
between sits a rule I had not read: **once the board is more than 52° on its rail, the game allows his feet no shift
at all in the direction his balance is asking for.** That rule had already shut in 36 of the 62. Two numbers, one
name, and I reported them as one thing.

**So I tested it anyway, exactly as I promised — and doubled the limit.**

I doubled it to 28.6° and checked that he really uses the extra room (he does, in 61 of 72 rides). **It saves nobody.
Ninety-six paired rides, the same wave and the same entry each time: he still falls in every single one**, and the
fall comes at the identical moment in most of them. The one thing it changes is the *shape* of the fall — on the
gentle-turn ladder it turns 7 of 36 capsizes into partial rolls — but it never turns a fall into a ride. **The limit
is innocent, and I am publishing that, as I said I would.**

**What I can tell you about why he goes over standing still.**

The ankle is a spring between his body and the board, and the arithmetic of that spring is exact: **the board's roll
is his body's lean, minus whatever his balance has shifted, minus two or three degrees of spring.** Measured, the
spring part really is small — within ten degrees in 20 of 24 rides and in all 24 of the other set. **So the board sits
wherever his body's lean puts it.** And the clock says which of the two moves first: **his body's lean passes 10°
before the board's roll does, in 48 out of 48 rides, by a tenth of a second.** The board is not throwing him; he is
leaning, and a board that light follows.

I also found two things that *are* jammed solid when he goes — the rail rule above, and a hard 70° cap the game puts
on how far his body may be measured as leaning. **Both of them arrive about two tenths of a second AFTER his weight
has already left his feet.** They are what the fall looks like on the way down, not what starts it. I am not going to
sell you either one as the cause.

**Your bar is still not met: 360 of 360 rides in this round fell, and 36 of 36 in Compress on the ladder.**

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot. One change at a time, as always.

1. **`?rider=new&feltFrame=deck&canyonWaves=true`, and DON'T TOUCH THE STICK.** Get into position, press Compress,
   ride straight, hands off. **The question: does the board tip over under him within a couple of seconds, and does
   it look like he is leaning it over or like the water rolling it?** The measurement says he leans first, every
   time, by a tenth of a second — **this is the shot I most want your eyes on**, because if on the wave it looks like
   the water rolling the board instead, my clock is measuring the bench and not your ride.
2. **The same, in the TALL stance.** Measurement says tall goes over too (8 of 8) but less far — it capsizes in 3 of
   8 against Compress's 7 of 8. **The question: does tall feel more survivable to you, or just differently bad?**
3. **`?rider=new&feltFrame=deck&canyonWaves=true&ankleRange=wide`, gentle turns.** This is the doubled limit. The
   measurement says it will not stop him falling — it did not in 96 rides — but that it turns some capsizes into
   partial rolls. **The question is only about feel: when he goes, is a partial roll less horrible than a capsize?**
   If it is, that is worth something on its own and I will say so; if you cannot tell the two apart, I will drop the
   switch rather than carry it.
4. **And a ruling I would like, not a ride.** Everything I can reach at the ankle is now measured and innocent: the
   bound, the sole's own moment (3.3i), the hip (3.2x), the knee, the stance's reach. The next honest place to look
   is **the one limit this round found jammed that I could not exonerate for the right reason** — the 70° cap, which
   is a *clamp on a measurement* that the ankle's force is then computed from, so past 70° the game's ankle is
   pulling against a lean his body is not actually at. **Do you want me to go after that, or do you want me to stop
   measuring the ankle altogether and go after the thing that makes his body lean in the first place?** I can only
   run one.

# Part 35 — the lean is inherited from the face, sustained by a dozen terms that nearly cancel, and the ankle keeps a quarter of its own authority

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-new-33l`, cut from `main` at
**c3e87e2a** (step 3.3k's merge), so Part 34 is its base. It ships **one read-only ledger** (`bankLedger`, off by
default, no behavioural switch of any kind), its six-test positive control, one new probe, and **174 runs over eight
arms** — **108 with the ledger on** (24 unsteered trajectories read on both fall filters, 18 on the owner's own
low-speed cell read on both, and 24 on a flat-across counterfactual) and **66 with it off**, as the reproduction and
the purity check.

Tags as in 3.2, 3.3 and 3.4: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source;
**[I]** my inference from a stated model; **[A]** arithmetic on measured numbers, labelled as such.

## 0. The eight sentences the round is for

1. **The owner's bar is not met, and this round is the first to test it on a cell built for the owner's own words.**
   *"The lower speed of getting positioning in a wave"*: entry speeds set **absolutely** at 1, 2, 3, 4, 5 and 6 m/s
   through the water × three stances, the stick never touched. **18 of 18 rides ended on the deck filter at
   0.52–7.10 s — seventeen of them a balance fall — and 18 of 18 on the world one at 0.12–6.90 s, all eighteen a
   balance fall; Compress falls 6 of 6 on each** [M]. And it is **worse**, not gentler,
   than step 3.3k's arm: at 1–3 m/s the fall comes at a median **0.600 s** (deck) and **0.183 s** (world) against
   3.3k's own minimum of 1.10 s.
2. **The brief's question had a datum error in it, and it is mine as much as 3.3k's.** *"What makes his body lean,
   standing still?"* assumes the lean is created. It is **inherited**: the board is placed square to the water's
   surface and the body is mounted square to the deck [R], so on a 16° face taken 45° off the fall line **the body's
   bank from the world vertical is 8.69–8.71° at the first frame in 24 of 24 runs, with the joint at −0.18 to −0.14°
   and the rail at −0.4 to +0.9°** [M]. **Step 3.3k's headline — "the body's bank passes 10° for good at 0.217–0.667 s"
   — is one and a third degrees of movement from a standing start of 8.7°**, and this round reproduces that clock to
   the digit (24 of 24, median lead +0.100 s) while refusing to read it as a lean developing.
3. **The attribution is exact, and that is the round's one piece of engineering.** The bank is the eighth unknown of a
   linear solve, so `A x = b` can be split by source and solved once per part, and the parts sum to the solve's own
   answer identically. Measured over the 24 unsteered trajectories at their full length, to the exponent rather than
   to the result files' twelfth decimal: the partition of `b` closes at **1.110e-15** (N·s and N·m·s), the sum of the
   per-source solutions closes against `A⁻¹ b` at **5.329e-15** (m/s and rad/s), and this file's own factorisation
   agrees with the game's `solveLinear` at **exactly 0 — to the last bit, on every substep** [M]. **P0 held, as
   written, with two orders of magnitude to spare.**
4. **And there is no single cause, because the lean is a residual of terms ten to a hundred times its size.** In the
   first 0.2 s the fourteen live entries total **411–820 °/s² gross** for a net of **+2.4 to +68.7** — a cancellation
   ratio of **7–266, median 12** — and from 0.4 s the median ratio is **90** [M]. Any sentence of the form "X makes
   him lean" is false on this measurement unless it names X's partner.
5. **The one source with a lawful form is the pendulum's own, and it matches its closed form to within 14 %.** The
   rider's weight on a leg that is not plumb books **+96.9 °/s² (91.2–100.0) in the first 0.2 s and +134.2 (93.3–157.7)
   over the next 0.2**, **driving the lean that happened in 24 of 24 in every window of the ride**, and its ratio to
   `g sin θ / L` computed from the window's own measured bank and leg length is **0.862–1.127, median 0.93–1.05** [M].
   **He leans because he is an inverted pendulum whose only reference is a deck.** But its net is nearly cancelled by
   the board's own weight (the two weights together are **+8.5 °/s²** of the first window's +39.9), so it is a
   mechanism identified and **not** a majority of the drive — §8 keeps that line.
6. **The ankle keeps about a quarter of its own authority over the body, and that is the measured reason nine rounds
   of ankle limits all came back innocent.** Booked alone, the ankle's torque moves the leg's own angle a lot and the
   body's absolute lean little, because the rest goes into rolling the deck the other way:
   **`|own / relative|` is 0.004–0.691 with a median of 0.312 in the first 0.2 s, 0.353–0.484 (median 0.400) over the
   next 0.2, 0.151–0.478 (0.250) from 0.4 to 1.0 s and 0.056–1.779 (0.127) over the ride** [M]. The board's roll
   inertia in the solve is **0.498–1.140 kg·m²** (step 3.3j's read (a)) against the body's `m L²` ≈ **52–54 kg·m²** at
   the measured L of 0.834–0.850 m [A]. **60–75 % of everything the ankle does rolls the board instead of righting the
   man.**
7. **The joints drive the lean before the balance wakes up and resist it after, and they lose either way.** In the
   first 0.2 s — with the commanded rest at **−0.26 to +0.24°**, the joint at **−0.39 to +0.05°** and the delivered
   ankle torque at **−7.0 to +2.6 N·m**, i.e. before the balance has asked for anything — the joints as a group book
   **+105.2 °/s², driving in 24 of 24.** From 0.4 to 1.0 s they book **−838.8, resisting in 24 of 24**, and the leg
   with the water it stands on books **+528.4** and the two weights **+246.8** [M]. The net is positive — toward the
   lean he fell with — in **24 of 24 of the first window, 23 of 24 of the next two and 24 of 24 of the last** [M].
8. **The counterfactual says the across tilt is the starting value and nothing else starts the lean.** The same water
   and stances with the board straight down the fall line (`SIDE=0`, a third population): the across tilt, the roll,
   the bank, the joint and the body's own rate are **0.0 at the first frame and still 0.0 at 0.200 s**, and the rail
   does not pass 2° until **3.650–5.950 s** against the 45° arm's 0.217–0.983 [M]. **The across degree of freedom
   does not move at all** until the cell's own symmetry breaks. All 24 rides still end before nine seconds and
   **later than their own 45° twin in 23 of 24** — but only **15 of 24 end as a balance fall**; the other **9 lose
   the board**, which runs straight down the face and stalls at **0.04–0.91 m/s** through the water. **P9 held in all
   three of its parts, including the one I did not want**, and §5 withdraws the regime reading I first put on it.

## 1. (A) The read that had to come first, and the three things it changed

My brief said *"start from a read"*, and the read is in `AttachedRider.coupleStanding` and `AttachedRider.finish`.

**(i) The bank's own equation is one row of a linear system, so its attribution can be exact.** Standing, the board's
solve is **8 × 8** (9 × 9 for the new surfer) over `x = (Δv, Δω, Δṡ, Δu̇[, Δẇ])`: the board's six, the leg's rate, the
bank's speed across the leg, and the body's speed along it [R]. `A` holds the **plant** — the two masses, the board's
inertia tensor, the water's added mass and damping, and the ankle's and the leg's own stiffness taken implicitly over
the substep. `b` holds the **sources** — every explicit force and torque. Because `x = A⁻¹ b` is linear in `b`,
splitting `b` into named parts and back-substituting once per part gives a decomposition that **sums to the solve's own
answer identically**. That is not a regression and not a correlation, and it is why §2's tables carry no error bars:
they are an identity with sizes, as Part 34 §2.2's was.

**(ii) The body's own lean rate is the sum of TWO of those unknowns, and a ledger on either one alone would be
wrong.** `AttachedRider.finish` builds it in the code [R]:

```
angularVelocity = (0, ω_board.y, 0) + rollAxis · (bankSpeedAfter / L)      and, the new surfer,
                                    + rollAxis · (ω_board · rollAxis)
```

so

> `θ̇_body = Δu̇ / L + ω_board · rollAxis`

— **the leg's own angle opening at the ankle, plus the deck rolling underneath it.** Every entry below is therefore
booked three times: `own`, `relative` (the ankle half) and `deck` (the board half), with `own = relative + deck` per
source and in total by construction (asserted to 1e-12 in `bankLedger.test.ts`). A ledger of the eighth unknown alone
would have missed the half of the lean that is the board turning under the feet; the roll ledger (step 3.3h) alone
missed the ankle.

**(iii) And the quantity to check the ledger against is public, so the control did not have to be invented.**
`rider.angularVelocity · rollAxis` **is** `Δu̇/L + ω·rollAxis` by the two lines above, so the ledger's total is the
time derivative of a number the probe can read off the rider. §9 reports that check and **says plainly that it does not
close**, and names why.

**The three things these reads changed.** My plan had been (a) to attribute only the eighth unknown — which would have
produced a ledger that explained a third of the lean and said nothing about the lock Part 34 measured; (b) to compare
the ledger against the **geometric** bank angle, which is a different quantity (the lean of the centre of mass over the
stance point, not the body's own angular velocity) and differs from it by a median **−1.1 to +0.1 °/s** [M]; and (c) to
treat `carry` — the constraint's own momentum gap — as a candidate, which it cannot be: for the new surfer the body's
velocity is **defined** as the rigid carry plus the three joint rates projected on an orthonormal triad, so the gap is
zero by construction and books **under 1e-11 rad/s²** [M, R]. §7 keeps that as a refutation of my own brief.

## 2. (B) Standing still, attributed — the unsteered arm on its own population

**The cell is `fall.ts`'s and step 3.3k's own**: the Canyon-matched `FaceWater` (1.4 m / 16° / 5.7 m/s, 2.6 m deep,
the board 0.75 fronts ahead of the crest and 45° off the fall line), the stance held, the stick **never touched**,
eight relative entry speeds × three stances, 9 s a run.

**The population is 24 TRAJECTORIES, not 48.** `?feltFrame=deck` changes only the **fall test's** reading, not a force
[R], so the deck and world arms are the same 24 rides and differ only in when the test fires — which this round
confirms: every column of §2.1 and §2.2 before the first fall is identical between the two arms to the digit [M]. Step
3.3k reported them as two arms of 24, which is right for a fall count and wrong for an attribution, and I report one
population of 24 here.

**The datum, stated.** Every angle and every acceleration is in the **raw board frame**: `+` is the body's lean, or the
deck's roll, toward the board's own **+x** (its left), about `AttachedRider.rollAxis` — the heading's own roll axis,
yaw only, no roll and no pitch, the axis `roll`, `rail`, `bank.angle` and `rollRate` are all measured about [R].
Beside it, each entry is also given **signed by the lean that actually happened** (`× sign(bank at the fall)`), so
positive means *drives the lean he fell with*; the column's name says which (`LEAN-signed`). With the stick never
touched there is no commanded turn to have an inside, so the `dir`-signed convention is not used anywhere in this part.

### 2.1 The datum is 8.7°, and it is not a motion

| **[M]** the unsteered arm, 24 trajectories | first frame | at 0.200 s |
|---|---|---|
| the face's own across tilt at the board, ° | **8.7–8.9** | 7.4–10.0 |
| the deck's roll from the world vertical, ° | **8.8–8.9** | 9.0–9.7 |
| **the body's bank from the world vertical, °** | **8.69–8.71** | **8.9–9.9** |
| the joint's own angle θ − φ, ° | **−0.18–−0.14** | −0.7–0.7 |
| **the rail** (roll less the face's tilt), ° | **−0.4–0.9** | — |
| the body's own lean rate, °/s | 0 | 0.9–13.9 |

**Three readings.**

1. **The board is placed flat on the water and the body plumb to the deck, so both start at the face's own tilt.**
   `fall.ts`, `deck.ts`, `stills.ts` and this probe all place the board with
   `makeBasis(left, normal, forward)` on the sampled surface normal [R], and `AttachedRider.frame`'s unmeasured branch
   mounts the body *square to the deck across* [R]. On a 16° face taken 45° off the fall line the across component of
   that normal is **8.7–8.9°**, and that is what both angles read at t = 0.
2. **So "the bank passes 10°" is 1.3° of movement.** This round reproduces step 3.3k's clock exactly — the bank passes
   10° for good at **0.217–0.667 s**, the roll at **0.317–0.750**, the bank leading in **24 of 24 at a median +0.100 s**
   [M] — and that clock is now a clock on a degree and a third.
3. **The clock that is about motion is the rail's and the joint's, and it runs the other way round.** The **rail**
   passes 2° at **0.217–0.983 s** and 10° at **0.500–1.183**; the **joint** passes 2° at **0.317–1.983** and 5° at
   **0.983–2.000**; and the rail reaches 2° **before** the joint does in **18 of 20** runs where both clocks fire, at a
   median lead of **0.650 s** [M]. **The pair leaves the face before the body leaves the deck.** Part 34's "the body
   goes first" is true of the world-vertical angles, which both start 8.7° over; it is false of the motion.

### 2.2 The lean is a residual, and the cancellation ratio is the first number to read

| **[M]** 24 trajectories, °/s², the body's own lean | mount 0.017–0.200 | early 0.217–0.400 | mid 0.417–1.000 |
|---|---|---|---|
| the substeps the standing solve did **not** decide | **0.000** | **0.000** | 0.000–0.001 |
| the net, LEAN-signed, mean of the runs' means | **+39.9** | **+60.9** | **+95.9** |
| … its span | **+2.4–+68.7** | −2.4–+146.2 | −0.7–+191.3 |
| … **positive — toward the lean he fell with** | **24 of 24** | **23 of 24** | **23 of 24** |
| the gross, Σ \|entry\| | **411–820** | 641–3 796 | 582–17 958 |
| **the cancellation ratio, gross / \|net\|** | **7–266 (median 12)** | 12–528 (33) | 19–12 483 (90) |

**Two readings, and the first governs everything after it.**

1. **Nothing here is a cause on its own.** A dozen entries of 100–8 000 °/s² produce a net of 40–96, so the lean is
   the **few percent by which they fail to cancel**. The attribution is still exact — that is §9's P0 — but the right
   way to read §2.3 is pairs and groups, not a winner.
2. **The net is nevertheless one-signed from the very first frame.** +2.4 to +68.7 °/s² toward the lean he fell with in
   **24 of 24** of the first 0.2 s, with the solve deciding every substep of it. There is no window in which the drive
   is neutral and then turns.

### 2.3 The sources, per entry, in °/s² of the body's own lean

The full tables are in `results/33l/33l-unsteered-deck.txt`; the entries that are not identically zero are below,
ordered by the mount window. Each cell is the **mean over the window of each run's own mean** (means sum; medians do
not, which is this folder's own named error), and `driving` counts the runs whose LEAN-signed entry is positive.

| **[M]** °/s², 24 trajectories | mount, own | driving | its `relative` half | its `deck` half | early, own | driving | mid, own | driving |
|---|---|---|---|---|---|---|---|---|
| **`gravity`** the rider's weight | **+96.9** (91.2–100.0) | **24/24** | **+88.2** | +8.7 | **+134.2** | **24/24** | **+341.8** | **24/24** |
| **`weight`** the board's own | **−88.4** (−98.0–−79.4) | **0/24** | −63.3 | −25.1 | −93.2 | 0/24 | −95.0 | 0/24 |
| `leg` the leg spring | −86.1 (−306.7–+61.9) | 4/24 | −73.5 | −12.6 | **+550.2** | 18/24 | **+3 814.6** | **24/24** |
| **`ankle`** | **+58.2** (−78.6–+205.9) | 18/24 | **+166.3** | **−108.0** | −186.0 | 6/24 | **−904.2** | **0/24** |
| `pressure` the planing hull | −48.1 (−159.7–+22.6) | 6/24 | −249.1 | +201.0 | −270.9 | 4/24 | **−3 320.4** | **0/24** |
| `pitch` the pitch ankle and hip | +44.2 (9.6–86.5) | **24/24** | +175.3 | −131.1 | +69.7 | **24/24** | +82.1 | 16/24 |
| `rails` | +34.2 (16.9–53.0) | **24/24** | +27.5 | +6.6 | +53.7 | **24/24** | +107.0 | **24/24** |
| `fins` | +12.6 (−18.2–+51.0) | 18/24 | +0.7 | +11.9 | −227.8 | 3/24 | +75.5 | 18/24 |
| `friction` | +9.3 (5.8–12.5) | **24/24** | −5.8 | +15.1 | +5.3 | 17/24 | −22.7 | 12/24 |
| `addedMass` the explicit half | +4.2 (−1.1–+9.6) | 21/24 | −36.4 | +40.6 | +17.4 | 21/24 | −3.3 | 12/24 |
| `yawCouple` the body's yaw and twist | +2.8 (0.3–5.9) | **24/24** | +14.2 | −11.4 | +4.6 | 22/24 | −2.3 | 9/24 |
| `buoyancy` | −0.0 (−0.8–+0.9) | 13/24 | −9.2 | +9.2 | +3.7 | 21/24 | +37.5 | **24/24** |
| `gyro` | −0.0 | 0/24 | −0.0 | +0.0 | −0.0 | 0/24 | −0.2 | 0/24 |
| **`carry`** the constraint's own gap | **0** (< 1e-11) | — | 0 | 0 | **0** | — | **0** | — |
| `riderWater`, `assist`, `drive`, `limbs`, `swing`, `twist`, `hand`, `suction`, `froth` | 0 or absent | — | — | — | — | — | — | — |

**Five readings.**

1. **`gravity` is the one entry with a sign, a size and a law.** Driving in **24 of 24 in every window**, at
   **+96.9 → +134.2 → +341.8 °/s²** as the bank grows, and its ratio to the inverted pendulum's own `g sin θ / L`,
   computed from the window's own measured bank and the window's own measured leg length (0.834–0.850 m), is
   **0.906–0.952 (median 0.933)** in the mount window, **0.878–1.031 (0.978)** early and **0.952–1.127 (1.050)** in
   mid [M]. The shortfall is the solve's own denominator — the water's added mass and the ankle's implicit stiffness
   in `A` — and the agreement is what makes the identification a reading and not a story.
2. **Its partner is the board's own weight, and that entry is not small.** −79.4 to −98.0 °/s², **opposing in 24 of
   24**, and **32–92 % of the largest entry in the mount window (median 80 %)** [M]. The pendulum's base is a 7 kg
   board on water, and pushing the base down un-leans the body about as fast as the rider's weight leans it: the two
   weights together are **+8.5 °/s²** of the window's +39.9 net. **P5 is refuted for `weight` and held for `gyro`.**
3. **From 0.4 s the biggest pair in the table is the leg against the water it stands on**: `leg` **+3 814.6** (driving
   in 24 of 24) against `pressure` **−3 320.4** (opposing in 24 of 24), **7 135 °/s² gross for 495 net** [A on
   measured means]. The leg presses the rider's weight onto the deck and the planing water holds it up, and the lean
   is where the two lines of force fail to meet. It is also the largest **driving** entry in the window in
   **24 of 24** runs, which is the half of my own P2 that failed.
4. **The ankle's sign flips at the window where the balance wakes up.** +58.2 (driving in 18 of 24) through the first
   0.2 s, −186.0 (6 of 24) over the next, −904.2 (**0 of 24**) from 0.4 to 1.0 s. And the first window is exactly the
   one in which the balance has commanded **nothing**: the commanded rest is **−0.26 to +0.24°**, the joint
   **−0.39 to +0.05°** and the delivered torque **−7.0 to +2.6 N·m** [M, step 3.3j's own ankle ledger, read beside
   this one]. So the ankle's first 0.2 s is its passive damper on a joint that is closed, and its sign is not the
   balance's choice.
5. **Every term that is identically zero is in the table on purpose.** `carry` (< 1e-11), `assist` (COMPRESS_PULL,
   CARVE_CARRY, LEAN_OUT_PULL — `compressAssist` returns at once on `newRider` [R]), `drive` (no leg drive),
   `limbs` (`?agile` off), `suction` (0.0 N on every cell this track rides, Part 19) and `froth`. They are measured at
   zero rather than assumed at zero, which is what makes the partition's own closure meaningful.

### 2.4 The two halves swap over at 0.2 s, which is Part 34's clock in accelerations

| **[M]** which half of `ownTotal` is larger in absolute value, 24 trajectories | mount | early | mid | last 0.5 s | last 0.2 s |
|---|---|---|---|---|---|
| **`relative`** (the leg's own angle at the ankle) | **17 of 24** | 7 | 8 | 4 | 5 |
| **`deck`** (the board rolling under the feet) | 7 | **17** | **16** | **20** | **19** |

**One reading.** Through the first 0.2 s the body's lean is mostly its own angle changing at the ankle; from 0.2 s on it
is mostly the deck rolling underneath it. That is Part 34's *"the bank leads the roll by a median +0.100 s"* seen in
the drive rather than in the angles, measured on the same 24 rides, and it is the strongest version of that ordering
this track has: **the body's own half leads, the deck's half carries it.**

### 2.5 The five groups, and the sentence they make

The grouping is declared in the probe before the read (`bank.ts`'s `GROUP`): `support` is the leg's force with the
water the hull stands on; `weightAll` the two weights; `foils` the fins, rails, friction and froth; `joints` every
torque inside the body or between it and the deck; `other` the rider's own water force, the gyroscopic term and the
entries that are zero.

| **[M]** °/s², LEAN-signed, mean of the runs' means (positive of 24) | mount | early | mid |
|---|---|---|---|
| `support` the leg and the water under the hull | **−130.0** (0) | **+300.4** (18) | **+528.4** (22) |
| `weightAll` the two weights | +8.5 (18) | +41.0 (21) | **+246.8** (24) |
| `foils` fins, rails, friction | **+56.1** (**24**) | −168.8 (3) | +159.8 (20) |
| **`joints`** every joint in the body | **+105.2** (**24**) | −111.7 (7) | **−838.8** (**0**) |
| `other` | −0.0 (0) | −0.0 (0) | −0.2 (0) |
| **the net** | **+39.9** (**24**) | **+60.9** (23) | **+95.9** (23) |

**Two readings.**

1. **Before the balance acts, the joints drive the lean in 24 of 24; after it acts, they resist it in 24 of 24 — and
   lose.** From 0.4 to 1.0 s the joints book **−838.8 °/s²** against **+528.4 + 246.8 + 159.8 = +935.0** from the
   standing contact, the weights and the foils, for a net of **+95.9** toward the lean. Every joint the body has,
   pulling together, is 90 % of what it would need.
2. **The ride window's own means are carried by one run and I am not reporting them as a group result.** `joints` over
   the live unclamped ride has a mean of +6 266 °/s² and is **positive in 1 of 24**: one capsize books +165 089 and
   drags the mean across zero. The mid window is the representative one and the ride window's means are in the result
   files for completeness only.

## 3. (B) The ankle's own authority, which is the answer to nine rounds of innocent verdicts

Booked alone, the ankle's torque is an **internal** torque: it cannot change the pair's angular momentum, only move it
between the body and the board. So its effect on the body's **absolute** lean is its effect on the joint minus
whatever the deck does in answer, and the split is set by the two inertias.

| **[M]** the ankle's entry, 24 trajectories, means of the runs' means | mount | early | mid |
|---|---|---|---|
| `relative`, °/s² | **+166.3** | **−466.9** | **−3 541.8** |
| `deck`, °/s² | **−108.0** | **+280.9** | **+2 637.6** |
| `own` = the two together | **+58.2** | **−186.0** | **−904.2** |
| … driving the lean he fell with | 18 of 24 | 6 of 24 | **0 of 24** |
| **`\|own / relative\|` per run, median** | **0.312** | **0.400** | **0.250** |
| … its span over the 24 | 0.004–0.691 | 0.353–0.484 | 0.151–0.478 |
| the same median over the live unclamped ride | | | **0.127** (0.056–1.779) |

**The ride window's own `relative` and `deck` means are not in the table on purpose**: the ankle's `own` entry there
averages +3 480 °/s² and is **positive in 1 of 24** — one capsize books +99 165 and carries the mean across zero, so
the mean is that one run. The three windows above are the representative ones, and only the `|own/relative|` **median**
is quoted for the ride.

*(An earlier draft of this table carried −2 170.6 / +1 132.1 for `mid` and −4 691.3 / +3 777.0 for the ride. Those were
**one Compress run's** figures read off the first smoke test and not the 24-run means; they are corrected above. The
`|own/relative|` medians, which are the row the section's claim rests on, were per-run from the start and are
unchanged.)*

**And the inertias say why** [A on measured numbers]: the solve's own **board** roll inertia is **0.498–1.140 kg·m²**
(step 3.3j's read (a), measured off the assembled matrix) while the **body's** about the stance point is
`m L²` = 75 × (0.834–0.850)² = **52.2–54.2 kg·m²**. A torque between them moves the lighter one, and the lighter one is
the board by a factor of **46–109**.

**What this is and is not.** It **is** the measured reason the last nine rounds found every ankle limit innocent: the
rest's own bound (Part 34), the sole's transmissible moment (3.3i), the hip (3.2x), the knee, the stance's reach, the
whole-body counter-roll. **Widening, narrowing or bounding a torque that keeps a quarter of its authority cannot
change the outcome**, and the A/B that proved it saved 0 of 96 runs. It is **not** a claim that the balance has no
authority at all — a quarter is not zero, and §8 keeps the stronger version out. **P1 is half held and half refuted**:
the two halves are large and opposite as predicted, but `|own/relative|` is **0.25–0.40 at the median in the three
windows that matter**, not the under-0.25 I wrote, so the ankle keeps **more** of its authority than I predicted and
still nothing like enough.

## 4. (B) The owner's own low-speed cell, built here for the first time

Step 3.3k's §8 named the gap in its own caveat: its unsteered arm runs at **4.99–10.00 m/s at the fall**, which is not
*"the lower speed of getting positioning in a wave"*. This cell sets the entry **absolutely** — the board is placed on
the flow, so the speed through the water at the first frame **is** the entry — at **1, 2, 3, 4, 5 and 6 m/s** ×
three stances, the stick never touched, everything else `fall.ts`'s own. **It is a different population from
§2's and nothing below is pooled with it.**

| **[M]** the owner's cell, 18 runs an arm | deck filter | world filter |
|---|---|---|
| **the ride ended** | **18 of 18** | **18 of 18** |
| … as a balance fall / “lost board” | **17 / 1** | **18 / 0** |
| at, s | **0.52–7.10** | **0.12–6.90** |
| **Compress** | **6 of 6**, 0.52–4.25 s | **6 of 6**, 0.13–4.03 s |
| entry 1–3 m/s: fell | **9 of 9** | **9 of 9** |
| … at, s (median) | 0.517–0.867 (**0.600**) | 0.117–0.483 (**0.183**) |
| entry 4–6 m/s: fell | 9 of 9 | 9 of 9 |
| … at, s (median) | 1.033–7.100 (1.267) | 0.767–6.900 (1.050) |
| the speed through the water at the fall, m/s | 0.56–7.39 | 1.01–6.63 |
| the rail at the fall, ° | **−82.8–+100.3** | −97.8–+27.0 |
| the substeps the standing solve did not decide | **0.021–0.461** | 0.000–0.317 |

**Four readings.**

1. **The bar is not met and the cell is worse, not gentler.** At 1–3 m/s the fall comes at a median **0.600 s** on the
   owner's own filter and **0.183 s** on the other, against step 3.3k's whole-arm minimum of **1.10 s**. **P6 and P7
   both held.**
2. **Below 4 m/s the board goes over the OTHER way.** The rail at the fall is **negative** (−17.0 to −82.8°, the −x
   rail down) in every 1–3 m/s run and **positive** (+20.6 to +63.4°) in every 5–6 m/s one [M]. Entry 4 m/s is the
   crossover and holds the two longest rides in the cell (4.25 s and 7.10 s on the deck filter). I have not measured
   what sets the side and §8 keeps me off it.
3. **And at those speeds the attribution does not describe the motion, so it is not reported for this cell.** The
   contact goes infeasible and the board and rider are solved apart for **2.1–46.1 %** of the substeps on the deck
   filter; the per-source entries have no consistent sign there (`gravity` spans **−469.3 to +426.0** over the ride
   against §2.3's 24-of-24 at a tenth the spread). **The low-speed cell is reported as a fall count and a clock, and
   nothing else.**
4. **One honest limit of the cell.** At an asked entry of 1 m/s the board is already at **2.06–2.16 m/s** through the
   water by 0.2 s — it accelerates down the face — so the cell's true floor is about 2 m/s, and the "1 m/s" rows are
   named by what was asked, not by what was ridden. Both numbers are printed for every run.

## 5. (B) The counterfactual, predicted before it ran, and it held in all three parts

P0–P8's reads produced the 8.7° of §2.1, and the attribution then makes a falsifiable claim about a cell nobody had
run: `gravity`'s entry is `g sin θ / L`, which is **zero at θ = 0**. So: the same water, the same stances, the stick
never touched, the board placed **straight down the fall line** (`SIDE=0`) so the face's slope is all pitch.

| **[M]** the flat-across cell, 24 runs (a THIRD population) | |
|---|---|
| the face's across tilt / the roll / the bank / the joint, first frame **and at 0.200 s**, ° | **0.0 / 0.0 / 0.0 / 0.0** |
| the body's own lean rate at 0.200 s, °/s | **0.0** |
| **the rail passes 2°** at, s (the 45° arm: 0.217–0.983) | **3.650–5.950** |
| the bank passes 10° at, s (the 45° arm: 0.217–0.667) | 3.817–6.200 |
| the ride ended | **24 of 24** |
| … **as a balance fall** | **15 of 24** |
| … as **"lost board"** — the board stalls and leaves him | **9 of 24**, at 0.04–0.91 m/s through the water |
| at, s | **0.517–6.383** |
| **later than the 45° arm's own run** | **23 of 24** |

**Three readings, and the third is the one I did not want.**

1. **P9a held exactly.** With no across tilt there is no lean: every angle is 0.0 at the first frame and still 0.0 at
   0.200 s, and the cell stays exactly symmetric across for **3.65–5.95 s** before any rail appears. **The 8.7° is the
   starting value, and nothing in the solve starts a lean without it.**
2. **P9b held.** The fall comes later in 23 of 24, and the lean itself is delayed by about **3.5 s** against the 45°
   arm's 0.217 s.
3. **P9c held: he does not stand. 15 of 24 are still a balance fall** — so taking the tilt away buys 2–4 seconds and
   not a ride. The other 9 of 24 **lose the board** rather than fall off it: pointed straight down the face the board
   runs off the wave and stalls at **0.04–0.91 m/s** through the water, and the rider is left standing on nothing.

**The caveat the cell has to carry, and it cost me a reading.** Pointed straight down the fall line the cell is
**exactly** symmetric across, which is why the zeros are zeros — and the first version of this section read its
`|roll| < 10°` count (4 of 24) as step 3.3j's **flat fall**, the regime Part 34 found 0 of 24 in the 45° cell.
**That reading is withdrawn.** Three of those four are **"lost board"** endings with **neither** fall-test condition
true, and the fourth is a balance fall whose across place `pointAcross` is **exactly 0** — so its fall is in the
along/pitch direction, which this probe's across columns cannot see at all. **The flat-across cell is a counterfactual
about the datum and nothing else: not a spot, not a playable cell, not a population to compare regimes or fall counts
on.**

## 6. The owner's bar, measured, with every population named

**`fell` is read as the ride ending, and the two ways it can end are counted apart**, because the flat-across cell
(§5) ends 9 of its 24 rides the second way and no previous Part had to separate them: **a balance fall** is
`HumanBalance.fallen`, the two fall-test conditions together; **"lost board"** is the rider separating because the
board has got away from him.

| **[M]** arm | n | the ride ended | balance fall / lost board | when, s |
|---|---|---|---|---|
| **`bank.ts`, deck filter, the owner's own low-speed cell** (6 absolute entries × 3 stances) | **18** | **18 of 18** | **17 / 1** | **0.52–7.10** |
| the same, **world** filter | 18 | **18 of 18** | **18 / 0** | **0.12–6.90** |
| the same, deck filter, the ledger **off** (the purity check) | 18 | **18 of 18** | 17 / 1 | 0.52–7.10 |
| `bank.ts`, deck filter, step 3.3k's unsteered arm (8 relative entries × 3 stances) | 24 | **24 of 24** | **23 / 1** | 1.10–2.07 |
| the same, world filter | 24 | **24 of 24** | **24 / 0** | 0.77–1.95 |
| the same, deck filter, the ledger **off** (the reproduction) | 24 | **24 of 24** | 23 / 1 | 1.10–2.07 |
| the same, world filter, the ledger **off** | 24 | **24 of 24** | 24 / 0 | 0.77–1.95 |
| `bank.ts`, deck filter, the flat-across counterfactual (`SIDE=0`) | 24 | **24 of 24** | **15 / 9** | 0.52–6.38 |

**The owner's bar is "in Compress the surfer should not fall at the low speeds of getting into position", 100 %, not
fewer. It is not met, and this round is the first to test it on a cell built for those words.** Compress's ride ends
**6 of 6** in each low-speed arm and **8 of 8** in each unsteered one — every one of those 28 a **balance fall** — and
**174 of 174 rides in this round ended before nine seconds, 161 of them as a balance fall and 13 by losing the
board** (nine of those thirteen in the straight-down-the-face cell).

## 7. What I refuted

- **My brief's own question, by its datum.** *"What makes his body lean, standing still?"* — the lean is **not
  created**. The body's bank from the world vertical is **8.69–8.71° at the first frame in 24 of 24** because the
  board is placed flat on a face tilted 8.7–8.9° across and the body is mounted plumb to the deck. Step 3.3k's
  48-of-48 clock is reproduced to the digit and is a clock on **1.3°** of movement.
- **My brief's own ordering, in the only frame where it is about motion.** *"The body's bank passes 10° before the
  deck's roll does"* holds (24 of 24, +0.100 s median) — but the **rail** passes 2° **before the joint** does in
  **18 of 20**, at a median lead of **0.650 s**. In the angles that start at zero, **the pair leaves the face before
  the body leaves the deck.**
- **My own P3, and it was not even close.** I predicted `carry` — the constraint's own momentum gap — would be the
  largest entry in the first measured window. It is **under 1e-11 rad/s² in 24 of 24 and 18 of 18**, and
  **structurally so**: the body's velocity is defined as the rigid carry plus the three joint rates on an orthonormal
  triad, so the gap cannot be anything else. A term I named as a candidate does not exist.
- **My own P2's first half.** Gravity is **not** the largest driving entry over the last 0.5 s: the **leg spring** is,
  in **20 of 24** runs (and in 24 of 24 of the mid window). Gravity is the largest driving entry only in the first
  0.2 s, and only in 15 of 24. **P2's second half — the size — held at 0.862–1.127 of `g sin θ / L`.**
- **My own P5, for `weight`.** The board's own weight is **32–92 % of the largest entry** in the first 0.2 s (median
  80 %), not the under-5 % I predicted. `gyro` held at under 0.03 %.
- **My own P1, half of it.** The ankle's two halves are large and opposite as predicted, but its `own` entry is
  **0.25–0.40 of its `relative` half at the median** in the three windows that matter, not under 0.25.
- **My own P8, as a bar.** The ledger's total, integrated over the ride, does **not** reproduce the body's own lean
  rate to 20 %: the signed gap is **−153.2 to +4.8 °/s** on a rate reaching 74.8–186.8, and adding the two kinematic
  terms I could measure moves it only to −150.5 to +6.0. §9 says what is missing and why it is not a missing force.
- **Step 3.3k's reporting of its two filters as two populations**, for the purpose of an attribution. `?feltFrame=deck`
  moves no force [R]; the 24 deck rides and the 24 world rides are the **same 24 trajectories** and differ only in
  when the fall test fires, which every pre-fall column here confirms to the digit. Its 48-of-48 is right as a fall
  count and is 24 trajectories as a mechanism.

## 8. What I will not claim

- **I will not claim gravity is "the cause" of the lean.** It is the one entry with a consistent sign in 24 of 24, a
  consistent size and a closed form it matches to 14 % — and its net is nearly cancelled by the board's own weight
  (the two together are +8.5 °/s² of the first window's +39.9 net), and the whole net is 1/12th of the gross. **The
  measurement supports "the lean is a residual, and gravity is its one lawful term", and not a cause.**
- **I will not claim the balance has no authority over the pair's roll.** Part 34 refused that inference without
  measuring it; this round measures **a quarter to two fifths** of the ankle's authority surviving to the body, which
  is small and is not zero. The stronger claim stays out.
- **I will not claim the across tilt is the cause either.** Removing it delays the lean by 3.5 s and the fall by a
  median of about 2.5 s, and **24 of 24 still fall**, 4 of them with the roll exactly zero. The tilt is the starting
  value of an unstable quantity, which is a different thing from a cause.
- **I will not report the low-speed cell's attribution.** The contact goes infeasible for up to 46 % of its substeps
  and the per-source signs do not hold there. That cell gives a fall count, a clock and a side, and no mechanism.
- **I will not claim the leg-against-pressure pair is a defect.** It is the standing contact doing its job: 3 815
  against −3 320 °/s² is what holding 736 N up on a planing hull looks like through a board whose roll inertia is
  0.5–1.1 kg·m². That the lean is the 500 °/s² they miss by is a **sensitivity**, and whether it is wrong is a
  question for the round that tries to change it.
- **I will not claim the ledger explains the lean rate's evolution.** It attributes the **drive**, exactly, on every
  substep the standing solve decided. The step from the drive to the state does not close (§9), and the three terms
  between them are kinematic re-projections, not forces.
- **The `FaceWater` is a fit to Canyon, not Canyon**; the rider is **placed**, not paddled or popped up, and §2.1's
  8.7° is a property of being placed; `SIDE=0` is a third population; every span above is **the whole population of
  its arm**, not a confidence interval.
- **No bot ride is offered as evidence of feel anywhere in this document.**

## 9. The controls, and the one that does not close

**P0, the three closures, on every substep of all 108 ledger runs** [M]:

- `split`, `max |Σ parts − b|` over the rows, N·s and N·m·s: **1.110e-15** — the worst substep of the 24 unsteered
  trajectories at full length, measured to the exponent and not to the result files' twelfth decimal, where every arm
  prints **0.000000000000**.
- `closure`, `max |Σ_source A⁻¹ part − A⁻¹ b|` on rows 3, 4, 5 and 7, m/s and rad/s: **5.329e-15**.
- `residual`, this file's own `A⁻¹ b` against the game's `solveLinear` on the same rows: **exactly 0 — to the last
  bit, on every substep.** An LU with partial pivoting written here and `legSpring`'s own `solveLinear` return the
  identical doubles, which is the strongest form this control can take: the denominator every entry is divided by is
  demonstrably the game's own.
- `singular`: **0**. And the per-window sum of the per-source means against the window's own total:
  **0.000000–0.005000 °/s²**, which is the result file's own rounding.
- `bankLedger.test.ts` asserts all three under **1e-9** over 50 steps of an unsteered and a steered ride, and
  `own = relative + deck` per source under **1e-12**.

**P0b, the rider unchanged** [M]: `bank.ts` with the ledger **off** reproduces step 3.3k's published unsteered arm to
the digit — **24 of 24 at 1.10–2.07 s** (deck) and **0.77–1.95 s** (world), roll at the fall **27.45–89.0°** and
**20.9–68.8°**, bank **28.4–70.0°** and **20.7–70.0°**, rail **17.7–88.9°** and **10.8–68.8°**, regimes **A 0 / B 11 /
C 13** and **A 0 / B 22 / C 2**, Compress past 60° in **7 of 8** — and with the ledger **on** every one of the 24 rows
is identical in fall time, roll, bank and frame count on both filters, and 18 of 18 on the low-speed cell.
`bankLedger.test.ts` asserts the bank, the body's own rate and the board's position **bit-identical** over 80 steps
with the ledger on and off.

**The control that does not close, named rather than buried.** `rider.angularVelocity · rollAxis` is the quantity the
ledger is the derivative of, so `Σ ownTotal · dt` should reproduce its change. It does not: the signed gap is
**−153.2 to +4.8 °/s** over the unsteered arm's unclamped frames, on a rate that reaches **74.8–186.8 °/s** [M]. Three
terms sit between the drive and the state, and **none of them is a force**:

1. **the leg's own length changing** — `bankSpeed / L` moves when `L` does, and Compress shortens the leg through its
   first second;
2. **the roll axis turning with the heading** — `d/dt (ω · u) = α · u + ω · u̇`;
3. **the body's own `across` axis turning** — `bankSpeed` is **re-projected** onto the banked `across` at the start of
   every substep [R], so a body whose velocity has not changed reads a different speed across once it has banked.

The first two are measured here from frame differences of public fields and together close **half** the gap on a single
Compress run (−60.5 → −29.2 °/s) and almost none of it over the arm (−153.2 → −150.5). The third is read in the code
and **not** measured: it needs a substep-resolution ledger of its own. Against this, **the drive's own partition is
exact to 1e-12 on every substep**, which is the claim §2 and §3 rest on, and the solve-apart paths — the substeps the
standing system did not decide — are **0 of 1 048–2 112 in the mount and early windows of 24 of 24** and 0–586 over the
whole ride [M].

## 10. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- the probe type-checked separately on a throwaway project extending the root's options with `types: ["node"]` and an
  **absolute** `typeRoots`: **exit 0**, with `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/bank.ts`, `src/physics/bankLedger.ts`, `src/physics/AttachedRider.ts`,
  `src/physics/BoardBody.ts`, `src/physics/testing/FaceWater.ts` and `@types/node`.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **58 files, 618 passed, 21 expected fail** — step 3.3k's 612 **plus this round's six new
  tests** (`bankLedger.test.ts`), one new file.
  `vitest run src/game src/scene/rig`: **70 files, 732 passed** — identical to step 3.3k's.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail** —
  identical to step 3.3k's.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**, the reference.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: this round touches no solver, no wave and no spot file.
- **the shipped rider is proved unchanged against step 3.3k's three published baselines, to the digit** (§9, P0b), and
  `bankLedger.test.ts` proves the ledger is a pure observer bit for bit.
- **the Canyon byte check, because `src/` changed** (`scripts/m1-cpu-bench.ts`, medium, 3 600 steps, **fresh**
  spin-ups into new state paths), with the three checks **read** rather than assumed — the wrapper prepends
  `globalThis.location = { search: '?canyonWaves=true' }` to the bundle (a prepended line, because a dynamic import
  makes rolldown split the chunk), the grid line read, and the "spun up on the CPU in … s" line read so that no kept
  `.sea` was imported:
  - Canyon B (`?canyonWaves=true`), **400 × 451 = 180 400 cells**, spun up on the CPU in **43.4 s**: snapshots
    **a367d938f15fa934**, state **9e5831f80e38abd9** — **the same as main.**
  - the default Canyon, **400 × 507 = 202 800 cells**, spun up on the CPU in **54.7 s**: snapshots
    **ea3d57a4d49f4b48**, state **a1a2555739210f96** — **the same as main.**

  All four match, which they must: this round touches no solver, no wave, no spot file and no hull law, and every line
  it adds to `BoardBody` and `AttachedRider` sits inside `if (bankLedger.on)`, which is false in the game. The raw
  output is `results/33l/33l-canyon-byte-check.txt`.

## 10b. The deletions column, read line by line

`git diff --cached --numstat origin/main`, read file by file: **24 files changed, 3 113 insertions and EXACTLY ZERO
deletions.** Every one of the 24 files has a `0` in the deletions column, and `--shortstat` prints
`3 113 insertions(+)` with no deletions at all. **Nothing was removed, nothing was replaced in place and nothing was
reverted.** That is possible because this round adds a ledger instead of threading one through existing arithmetic:

- `src/physics/bankLedger.ts`, **+336 / −0** — a new file.
- `src/physics/bankLedger.test.ts`, **+173 / −0** — a new file.
- `src/physics/AttachedRider.ts`, **+53 / −0** — three `if (bankLedger.on)` blocks and one import line, all added
  **beside** the shipped lines and never through them, so the arithmetic that writes `rhs` keeps its own
  floating-point order with the ledger on and off (which is what makes §9's bit-identical purity check pass).
- `src/physics/BoardBody.ts`, **+24 / −0** — one `if (bankLedger.on)` booking block, the `begin`/`close` calls, the
  `verify` call after `solveLinear`, two `apart` counters and one import line.
- `docs/research/new-rider/3.3/bank.ts`, **+641 / −0** — a new probe.
- `docs/research/new-rider/3.3/README.md`, **+685 / −0** — this Part.
- `docs/research/new-rider/3.3/results/33l/`, 18 files, **every one a pure addition**.

`origin/main` is still **c3e87e2a**, this branch's own merge base, so there was no mid-round merge to rebase onto —
and the column was read rather than that being assumed.

## 11. Files (3.3l)

- `src/physics/bankLedger.ts` — the bank ledger: 23 named sources, the split of `b`, an LU with partial pivoting, the
  per-source back-substitution, the three closure tests, and the `own` / `relative` / `deck` split. **Off by default,
  no behavioural switch of any kind, and the game pays one branch per substep while it is off.**
- `src/physics/BoardBody.ts` — the board's own rows of `b` booked by source where `advance` assembles them, the
  ledger's step begin/close, the `verify` call that checks this file's factorisation against `solveLinear`, and the
  two counters for the substeps the standing system did not decide.
- `src/physics/AttachedRider.ts` — the rider's own entries: `coupleYaw`'s kick, the four parts of `f`
  (`gravity`, `riderWater`, `assist`, `carry`), the joints' rows (`leg`, `ankle`, `swing`, `twist`, `hand`, `pitch`,
  `drive`, `limbs`), and the call that attributes the substep at the end of `coupleStanding`, before `solveLinear`
  destroys `A` or `b`.
- `src/physics/bankLedger.test.ts` — the six tests: the three closures at machine precision on an unsteered and a
  steered ride, `own = relative + deck` per source, `carry` at floating-point zero, that nothing is booked while the
  ledger is off, and that the trajectory is **bit-identical** with it on and off.
- `docs/research/new-rider/3.3/bank.ts` — the probe: the datum columns (the face's across tilt, the rail, the joint),
  the three clocks, the per-source attribution per window with the cancellation ratio and the five groups, the
  inverted pendulum's own yardstick `g sin θ / L` computed from the window's own measured bank and leg length, the
  two kinematic terms, the apart share per window, step 3.3j's ankle ledger read beside this one, and `ENTRIES` — the
  **absolute** entry speed the owner's low-speed cell is built on.
- `docs/research/new-rider/3.3/results/33l/` — five arms with their printed tables beside their rows, the three
  reproduction arms with the ledger off, `33l-predictions.md` (every prediction as written before its read, P9
  included and marked as written after P0–P8's reads and before its own) and `33l-canyon-byte-check.txt`.

## 12. For the owner, in plain words — and the shot list

**You asked me to go after the thing that makes his body lean. I did, and the first thing I owe you is that his body
does not start plumb.**

The wave face is a slope. Your test spot's face is tilted about **nine degrees sideways** where the board sits, the
game puts the board flat on that slope, and it stands the man square to the board. So **before anything moves, his
body is already nine degrees off upright** — twenty-four rides out of twenty-four, measured at the very first frame.
Last round I told you his body's lean "passes ten degrees" a fifth of a second in. That is true and it is **one and a
third degrees of actual leaning**. I reported a starting value as a motion, and I am sorry.

**And when I took the tilt away, nothing happened — for three and a half seconds.**

I ran the same wave with the board pointed straight down the face instead of across it, so there is no sideways tilt.
His lean, the board's roll and the angle at his ankle all read **exactly zero** for the first fifth of a second and
stay there: the board does not get two degrees onto a rail until **three and a half to six seconds** in, against a
fifth of a second before. **The nine degrees is where it starts.** But it only buys him two to four seconds: fifteen
of those twenty-four rides still end with him falling off, and the other nine end with the board running off the wave
and leaving him, because straight down the face is away from the wave. **So the tilt is the starting push and not the
whole story.**

**Now the honest bad news about "the cause": there isn't one.**

I built an exact ledger of who leans him. It is exact — I can take the game's own equation apart source by source and
the pieces add back up to the game's own answer to twelve decimal places, which is the one thing I am certain of in
this round. And what it shows is that **a dozen forces of a few hundred to a few thousand degrees-per-second-squared
produce a net of about forty**. They nearly cancel. His lean is the small amount by which they miss.

The one piece that behaves like a law is **his own weight on a leg that is not upright**. It drives the lean in
twenty-four rides out of twenty-four in every window of every ride, and its size matches the textbook formula for a
balancing pole — `g·sin(lean)/leg length` — to within about ten per cent. **He leans because he is a pole balanced on
a board, and the only thing he is referenced to is the board.** But even that is nearly cancelled by the board's own
weight, so I will not sell it to you as *the* cause.

**And here is the number I think is the real find, because it explains nine rounds of me telling you the ankle is
innocent.**

**His ankle keeps only about a quarter of its own strength.** When his ankle pushes to right him, it also pushes the
board the other way — and the board, in the water, is between **forty-six and a hundred and nine times easier to roll
than his body is**. So three quarters of everything his ankle does goes into rolling the board under him instead of
standing him up. Measured: a median of **0.31, 0.40, 0.25 and 0.13** of the ankle's effort surviving to his body, in
the four windows of the ride.

**That is why widening the ankle's limit last round saved nobody in ninety-six rides, and why the sole's limit, the
hip, the knee and the stance's reach were all innocent too.** You cannot fix a muscle that keeps a quarter of its
force by changing how far it is allowed to reach. **If you want him to stand up, the next change has to be about
something other than the ankle's command — the board has to be harder to roll, or he needs a second thing to push
against.**

**Your bar: still not met, and I tested it on your own words this time.**

You said *"in compress the surfer should not fall at the lower speed of getting positioning in a wave."* Every round
so far ran him at seven to ten metres a second, which is not that. I built the cell you described — **one, two, three,
four, five and six metres a second through the water**, stick never touched. **Seventeen of eighteen rides on your own
setting end with him falling off (the eighteenth ends with the board getting away), and all eighteen on the other
setting are falls.** In Compress, **six of six on each, every one a fall**. And it is **worse** down there, not
gentler: below three metres a second he goes over in **about six tenths of a second**, against a best of 1.1 seconds at
the faster speeds. One odd thing I can see but cannot explain yet: **below four metres a second he falls onto the
other rail** — the opposite side from the fast rides. I am not going to guess why.

**174 of 174 rides in this round ended before nine seconds — 161 of them with him falling off, and thirteen with the
board getting away from him, nine of those thirteen in the straight-down-the-face cell.**

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot. One change at a time, as always. **Nothing in this round changes the
game**, so these are all about your eyes on things I measured on the bench.

1. **`?rider=new&feltFrame=deck&canyonWaves=true`, hands off the stick, Compress. Watch the first half second.** The
   measurement says he is already nine degrees out of upright before he has done anything, and that the **board's rail
   bites before his body leaves the deck** — the opposite order from what I told you last round. **The question: when
   he goes, does it look like the board tipping and taking him, or like him toppling off a board that stays put?** If
   it looks like the board, my clock is right this time; if it looks like him, I have the frames wrong again.
2. **The same, pointed straight DOWN the face instead of across it** — take off and go straight, no angle. The
   measurement says this is the one cell where he stands plumb, and that he lasts **two to four seconds longer**;
   it also says you will probably run off the front of the wave before much else happens, which is what it did on the
   bench in nine of twenty-four. **The question: in the seconds before you lose the wave, does going straight feel
   noticeably more stable than angling across?** If it does, the nine-degree start is something you can feel and not
   just something I can measure.
3. **Get into position slowly and don't take off** — paddle up, stand, trim at walking pace. The measurement says this
   is the **worst** case, not the easiest: six tenths of a second. **The question: is that what it feels like — that
   the slow part is where he is least stable?** This is your own bar and it is the cell I most want your eyes on.
4. **And a ruling, not a ride.** Everything at the ankle is now measured and the reason it was all innocent is
   measured too: the ankle keeps a quarter of its force because the board rolls too easily. There are three honest
   next moves and I can only run one:
   - **make the board harder to roll** — its roll resistance in the solve is 0.5 to 1.1 kg·m², and I can measure what
     a real board's is and whether ours is short;
   - **give him a second thing to push against** — the two-body rider, which is the route the parked duck-dive work
     already named as the faithful one;
   - **go after the 70° clamp** from last round, which is still a real defect but which I showed arrives after the
     fall has started.
   **My own recommendation is the first**, because it is a measurement before it is a change, and because if the
   board's roll resistance is right then the second is the only route left and we should stop looking for a tuning fix.
   **Your call.**
