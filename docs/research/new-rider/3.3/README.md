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
early it is needed** — by the 0.14–0.94° §4 measures, which is between a seventh and a twentieth of the residual the
body is standing on when it goes.

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
  `planeSens`), and §8's report. Its header carries the commands.
- `docs/research/new-rider/3.3/results/33d/`: `cell-*-{world,deck}-{off,hull}.txt` (the thirty-six cells' full output),
  their thirty-six `*.jsonl` (**432 rows**), `frames-world-off.jsonl` (**13,422 frames**, §2's and §4's population —
  trimmed to the eleven columns those two tables are computed from, because the full record is 42 MB; every number in
  §2 and §4 was re-derived from the trimmed file and is unchanged, and `ladder-table-33d.txt` carries the command that
  rebuilds the full one),
  `trace-tall-0-world-{off,hull}.jsonl` (§4's traced run frame by frame), `ladder-table-33d.txt`, `suite-33d.txt`,
  `canyon-bytes-33d.txt`.

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
he is flat to about **seventeen degrees** when he is going over, this switch takes off **a seventh to a twentieth**. It
peaks at about **one degree** of correction around thirty to forty degrees of lean and then falls away.

**Does he stay on? No.** Twelve of twelve fell in all thirty-six conditions I ran. What he gets is time — about
**a sixth of a second** on its own, and **half a second** together with last round's inner-ear fix, which do add. He
does not lean any less far before he goes.

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
