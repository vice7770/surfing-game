# Step 3.5 — the new rider, round five

**This folder's head.** Steps 3.5a, 3.5b and 3.5c are recorded in
`docs/superpowers/handoffs/2026-11-16-surfer-and-wave-handoff.md` and ship as PRs **#389** (the ask cap) and **#392**
(3.5b's fourth stance row and the deepen button, with 3.5c's correction on the same branch), **neither merged** — the
classifier refused those merges, so they are the owner's. The other files beside this one are that work's own:
`stance-frame.md`, `crouch-collision.md`, `depth.ts`, `video-ref-5-dave-rasta.md`, `video-ref-6-mason-ho.md`.

---

# Part 1 — step 3.5d: **the ankle rolls the board, and the 56–84° is the coast afterwards**

## The question, and the answer in four lines

Step 3.5a measured, on the owner's own address and his own test face, with the stick hard over at 1–3 m/s: *the rider
asks for `0.00°` of lean — the shipped cap is exactly 0 below `PLANING_DROP = 3 m/s` — and the board still rails over
to 56–84° and swings 21–36° of heading before it falls.* **What banks the board when nothing is asking it to?**

1. **The 56–84° is the RAIL** — the board's heel against the water under it, `roll − tilt`. The same nine runs read
   **15.7–77.8° of roll** from the world's level and **29.4–70.0° of the body's own bank**. Three quantities, one
   event, and the published figure is the largest of the three on every run.
2. **The term that carries it is the rider's own ANKLE.** Before the fall (`|roll| ≤ 25°`), on the owner's face and
   address at 1–3 m/s, the ankle's torque is the **largest single source of the deck's roll in all three stances —
   45 % / 56 % / 53 %** of the whole traffic of twenty-three sources, **3.6–5.3 × the net**, signed the same way in
   3 of 3 runs of every stance, and **identical on both of the round's two windows** there. It is first or second
   before the fall in every other readable cell as well: **52 / 52 / 54 %** on the same face planing at 4–6 m/s, and
   **15 % (second to planing pressure's 23 %) / 19 % / 32 %** on the 4.650 s glide arm.
3. **It is a CORRECTION that acts as a DRIVE, and in this plant those are the same action — by identity, not by
   correlation.** `mAnkle` is `−τ_ankle` and `dk_ankle` is `ankleDeck × (−τ_ankle)` with `ankleDeck` negative, so
   **"the ankle's moment opposes the body's lean" and "the ankle's deck roll carries the body further the way it is
   already leaning" are the same frames** wherever `ankleDeck` keeps its sign. Measured: the ankle corrects the lean
   in **54.8–92.9 %** of booked frames, it leans the body further in **54.8–92.3 %** of them, and its deck roll goes
   with the deck's own roll rate in **73.7–100 %**. The board rolls out from under the rider *because* the rider is
   trying to stand up straight.
4. **And the 56–84° itself is the capsize, not the cause.** **47–80 %** of the whole roll swing is accumulated after
   the roll rate has reached 90 % of its peak on the owner's own face (**18–55 %** on the Canyon-matched one), with
   the net moment on the board at **0.1–1.6 %** of the traffic throughout — a coast. In the capsize window the
   largest term is no longer the ankle but the hull's planing pressure (**38–43 %**). **Pooled over a whole run this
   round would have named `pressure` in one stance of three.** The brief's instruction to separate the two windows
   changed the answer, and it was right.

**The brief's own leading candidate is refuted.** Added mass and radiation are the **second** largest term in the
board's roll budget and they **oppose** the roll on the median of every arm and every window measured: **−5.4 to
−43.4 N·m** against the rider's **+12.1 to +61.2 N·m**, and in the deck attribution `addedMass` sits against the
ankle in 3 of 3 runs of every stance. It is the water's inertia resisting, which is what an inertia does. 3.4n's
45–56 % was the **side force** in the owner's cell; it does not carry to the roll row.

**Which rider every number belongs to:** every arm below is `RIDER=new FELT=deck BODY=two`, i.e. the owner's own
`?rider=new&feltFrame=deck&riderBody=two`, at the folder's own placement (`AHEAD` 0.75, `SIDE` −45, 9 s a run, the
stance held). Nothing here is the plain `?rider=new`'s.

## 0. The rig, and why it is instrument-only

`3.3/plant.ts`'s `MOUNT=` dump with **three groups of columns added and no byte under `src/` or `server/` changed**
(`git diff --stat` on the merge base: two files, both under `docs/`). So there is no default to keep, no switch to
add and no Canyon hash to check: the round is a read.

The added columns are three reads of instruments the game already has:

| columns | what they are |
| --- | --- |
| `dk_<source>` (23), `dkSum`, `dkClose`, `dkSplit` | `bankLedger.deck` — the **deck's own roll acceleration per source**, rad/s², the exact `A⁻¹` partition of the standing solve's right-hand side |
| `rl…` (13), `apartSub`, `bookSub`, `subs` | `BoardBody.roll` — the **roll ledger's** own N·m budget about the board's long axis, booked on every substep, plus how many of the frame's substeps the standing solve actually decided |
| `rollInerBoard`, `rollRateAxis`, `askDeg`, `capDeg`, `planingNow`, `draftFace`, `trimFace`, `wetShare` | the board's own roll inertia about the ledger's datum, the deck's roll rate on that same axis, `leanProbe`'s ask and cap, and step 3.4l's three hull columns (written until now only by the `TICKS=` dump) |

**The one thing that separates the two ledgers, and it decides where each may be read.** `bankLedger` partitions the
standing solve; where the rider's contact is infeasible the board instead takes the projected push and `solve6`
decides, and the ledger counts those substeps as `apart` [R, `BoardBody.ts:1535–1538`]. So every per-source figure is
read on a window with **no `apart` substep in it**, and the window's size is printed on every row. `BoardBody.roll`
books every substep, so the N·m budget may be read anywhere.

**The windows, named on every table.** `drive` — the run's contiguous leading frames with `apartSub == 0`, whose
cumulative figures are a trajectory. `booked` — every frame with `apartSub == 0`, not contiguous, so read as a mean
and never integrated. `in25` / `out25` — `|roll| ≤ 25°` and the rest, step 3.4l's own cut: **before the fall** and
**the capsize**. Every frame of a `MOUNT` dump is live by construction (`3.3/plant.ts` breaks on `!rider.attached ||
!rider.upright || phase !== 'standing'`), so there are no frozen frames and no `dead*` column is needed — the
artefact that corrupted 3.3e cannot occur here.

**The arms.** `f73` is `FACE=1.4,7.32,5.7`, step 3.4h's closest fit to the owner's own water; `s16` is
`FACE=1.4,16,5.7`, the Canyon-matched arm (PR #223). `-ls` is the stick hard over, `-l` the stick never touched;
`ENTRIES=1..6` absolute, split into the **low cell (1–3 m/s, the ask's cap exactly 0)** and the **high cell (4–6 m/s,
planing)**. `f73-g` is the eight relative glide entries. Reader: `3.5/roll.ts`; raw output and dumps in
`results/35d/`.

**The three reference arms reproduce exactly**, so the added columns move no ride: `f73-l` **18 of 18, 0.617–2.533 s,
median 1.450 s**; `s16-l` **median 1.033 s**; `f73-g` **24 of 24, median 4.650 s**. All three are the figures step
3.5c re-measured.

## 1. The three angles, and the ask — the frame discipline first

**The owner's address, `f73`, entries 1–3, 9 runs (3 a stance), 461 frames:**

| stance | runs | fell at | **\|rail\| peak** | \|roll\| peak | \|bank\| peak | ask med/peak | cap med | planing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tall | 3 | 0.633–1.050 s | **55.2–59.3°** | 48.4–52.6° | 30.4–35.3° | **0.00 / 0.00°** | 0.00° | 0 % |
| crouch | 3 | 0.783–0.850 s | **20.4–75.9°** | 15.7–69.4° | 29.4–70.0° | **0.00 / 0.00°** | 0.00° | 0 % |
| compress | 3 | 0.617–1.283 s | **60.4–84.4°** | 53.5–77.8° | 46.0–70.0° | **0.00 / 0.00°** | 0.00° | 0 % |

**And on the Canyon-matched face, `s16`, entries 1–3, 9 runs, 371 frames:** rail **55.0–80.1°**, roll 37.1–66.4°,
bank 29.4–70.0°, ask 0.00 peak as well as median, planing 0 %.

**So 3.5a's 56–84° reproduces, and it is the `rail` column** — `roll − tilt`, the heel against the water under the
board, which on a 7.32° face runs about 6° larger than the roll from the world's level. The ask is 0.00° to the digit
in every frame of all 18 runs, peak as well as median.

### The stick is INERT at the crawl, and that is measured, not inferred

**The stick-hard-over arm and the stick-never-touched arm are identical frame for frame in the low cell.** `f73-ls`
against `f73-l`: 9 runs, 461 frames, **67 767 column-values compared, 0 mismatches** (every column but the `steer`
input itself). `s16-ls` against `s16-l`: 9 runs, 371 frames, **0 mismatches**. In the high cell the same pair is a
different ride (543 frames against 903).

So the board reaches 56–84° of rail **with the rider asking for nothing and the player's stick making no difference
whatever**. That is the positive control 3.5a's own `askCap=9` arm gave for the ask; this is the same control for the
stick, on the shipped build.

## 2. The plant: a board with 0.0262 kg·m² of roll inertia

| quantity | value | what it is |
| --- | --- | --- |
| `I_board` | **0.02620 kg·m²** | the board ALONE about the roll ledger's datum — `bodyInertia[8]`, which **is** `ẑᵀ R I Rᵀ ẑ` for `ẑ = R e_z` exactly, so there is no frame argument in it |
| | **2 186 °/s² per N·m** | the same number inverted. **One newton-metre of unbalanced roll moment is 2 186 °/s².** |
| `1 / rollDeckPer` | 0.94–1.02 (f73 crawl), 0.22–0.25 (s16 crawl), 1.15–1.31 kg·m² (f73-g) | the **coupled** inertia the integrator meets, with the rider and the water's implicit added mass in it |
| `\|ankleOwn / ankleRel\|` | **0.360–0.455** (f73 crawl), 0.071–0.072 (s16 crawl), 0.405–0.579 (f73-g) | the ankle's authority over the body's **absolute** lean against its authority over the relative one: **42–93 % of every ankle correction is cancelled by the deck rolling the other way.** The ledger's own form of 3.4i's series result (`k/(k+K)` = 0.937–0.985), measured per arm. |

## 3. The board's own roll budget, N·m — a cancellation whose residual is the whole story

Medians of per-run medians on the roll ledger's datum. `rider` is the ledger's **residual** — everything the rider's
coupling carries, the feet and the pair's own inertia together — and is reported as one. `inertial` is added mass plus
radiation damping; `hull` is the four patch totals with the fins and rails; `net` is `rlTotal`, what the board's own
inertia actually took.

| arm, cell | window | stance | runs | frames | rider | **inertial** | hull | net | **net / largest** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `f73`, 1–3 m/s | in25 | tall | 3 | 103 | **+12.12** | −5.40 | −7.70 | +0.013 | **0.0010** |
| | | crouch | 3 | 104 | **+20.40** | −12.73 | −6.39 | +0.083 | **0.0040** |
| | | compress | 3 | 103 | **+15.63** | −7.94 | −6.37 | +0.024 | **0.0015** |
| `s16`, 1–3 m/s | in25 | tall | 3 | 66 | **+61.21** | −43.39 | −14.51 | +0.665 | 0.0109 |
| | | crouch | 3 | 70 | **+50.68** | −37.26 | −13.07 | +0.299 | 0.0059 |
| | | compress | 3 | 69 | **+49.50** | −38.41 | −12.78 | +0.299 | 0.0061 |
| `f73-g`, glide | whole | tall | 8 | 1 717 | +0.07 | −0.13 | +0.81 | −0.000 | 0.0001 |
| | | crouch | 8 | 1 695 | −1.78 | +0.38 | +1.98 | −0.004 | 0.0018 |
| | | compress | 8 | 1 619 | −4.36 | +0.61 | +4.37 | −0.002 | 0.0004 |

**Three readings, and two of them settle candidates from the brief.**

1. **The net is 0.01–1.09 % of the largest term.** The board's whole roll is the residue of a cancellation between
   terms **92 to 1 000 × larger** on the crawl rows above (and 10 000 × on the glide arm's tall). At 2 186 °/s² per N·m, the **0.013–0.665 N·m** that survives is **28–1 450 °/s²** — which is
   why a 1 % error anywhere in this row is a capsize. **The board is a hair trigger, and that is a measured
   constant, not a figure of speech.**
2. **Added mass and radiation OPPOSE, everywhere.** −5.4 to −43.4 N·m against the rider's +12.1 to +61.2, on the
   median of every arm and window. (This is the roll ledger's `addedMass`, which includes the settle loop's own
   twin; 3.4i's **−3.14 to +0.25 N·m** was the bank ledger's *explicit* half, a different and smaller quantity.
   Neither is a driver.)
3. **3.3h's static "+33.47 against −33.40, net +0.04" does not hold dynamically** — confirmed a second time, after
   3.4i: the hull answers only **−6.4 to −14.5 N·m** of the rider's **+12.1 to +61.2**.

**Its control, with no model in it:** the board's own net moment over the board's own roll inertia is a rate change,
so `−rlTotal/I_board·dt` summed over a run must reproduce the rate the board is spinning at. On `f73`'s crawl it
gives **−112…−20 °/s against the measured −82…−27**, ratio **0.66–1.11**, and the frame-to-frame change **agrees in
sign in 90.4 / 95.2 / 95.0 % of 146 / 145 / 161 frames**. The gap is the inertia tensor's off-diagonals and the step's
own averaging, and both are printed rather than corrected for.

## 4. WHO rolls the deck — the ankle, by name, before the fall

`bankLedger.deck` per source, °/s², on the `drive` window and split at 25° of roll. Shares are of **Σ|terms|** (the
sum of all twenty-three magnitudes), because a share of a net that is itself a cancellation residual is not a share.

**`f73`, entries 1–3 — the owner's own face and cell:**

| stance | window | runs | frames | net | Σ\|terms\| | the three largest |
| --- | --- | --- | --- | --- | --- | --- |
| tall | **in25** | 3 | 99 | −80 | 1 344 | **ankle −606 (45 %)** · addedMass +219 (16 %) · pressure +125 (9 %) |
| tall | out25 | 2 | 19 | +40 | 5 191 | **pressure +2 011 (39 %)** · leg −1 401 (27 %) · ankle +517 (10 %) |
| crouch | **in25** | 3 | 85 | −283 | 1 807 | **ankle −1 008 (56 %)** · leg +341 (19 %) · addedMass +179 (10 %) |
| compress | **in25** | 3 | 94 | −202 | 1 728 | **ankle −920 (53 %)** · leg +284 (16 %) · addedMass +204 (12 %) |

`crouch` and `compress` have no `out25` frame inside the *contiguous* window — theirs end before 25° — but on the
`booked` window (every frame with no `apart` substep) they read the same way as tall: **pressure +1 188 (41 %)** for
crouch over 12 frames of 1 run, **pressure +3 048 (38 %)** with the ankle second at −2 125 (26 %) for compress over
22 frames of 3 runs. **Before the fall the ankle, during it the water** — in all three stances.

**`f73`, entries 4–6 — the same water and address with the board planing and the ask a real 22.8°:** ankle
**+412 (52 %)**, **+417 (52 %)**, **+525 (54 %)** before the fall, with `addedMass` second at **17–21 % and
opposing** in all three stances. During the capsize the leg and the ankle lead with pressure against them.

**`f73-g`, the 4.650 s reference arm, 24 runs, 93–308-frame drive windows:** over the whole window ankle **7.1 %
(tall, where pressure's 8.1 % pips it), 17.5 % (crouch), 39.8 % (compress)** and **5.6–19.9 × the net**; split at 25°
of roll, **before the fall** it is **pressure 117 (23 %) / ankle 75 (15 %)** in tall and **ankle first at 117 (19 %)
and 217 (32 %)** in crouch and compress, over **1 373–1 557 frames of 8 runs a stance** — by far the round's largest
population. **During the capsize, pressure again: −1 568 (24 %) / −1 381 (28 %) / −1 577 (39 %).** The traffic itself
is a third to a half of the crawl's (Σ|terms| 519–683 before the fall against 1 344–1 807) and the net is
1.5–2.1 % of it.

**One caveat on the planing cell, stated because the two windows disagree there and nowhere else.** On `f73`'s 4–6 m/s
runs the contiguous window gives the ankle 52 / 52 / 54 % before the fall and the `booked` window 30 / 10 / 59 % —
crouch moves by a factor of five. The two windows agree exactly on the owner's own 1–3 m/s cell (45 / 56 / 53 % both
ways) and on the glide arm, so **the headline rests on those two and the planing cell's own crouch number should not
be quoted.**

**`s16`, entries 1–3 — the Canyon-matched face, and the one place the instrument runs out.** `apartSub ≥ 1` **from
frame 1 in 9 of 9 runs** (median 10–11 of 16 substeps), so the contiguous drive window is **empty** and only
**22 % of frames** are fully booked. On what is left (12–42 frames a stance) the ankle is in the three largest of
every row and the largest in compress's own `in25` (**−3 454, 33 %**), beside the leg and added mass; **12–29 frames
is too thin to rank terms, and this round does not.** That the standing contact is infeasible on two thirds of the
substeps from the mount's first frame on the owner's own test spot is itself a finding, and it is new.

### The one test that says correction or drive

Shares of the `booked` window's frames, `|bank| ≤ 1e-6°` dropped. `bank` is the body's lean over its stance point in
the **heading's** frame, not against the deck [R, `AttachedRider.frame`], and `mAnkle` is the ankle's own moment on
the body (row 7, which is `−τ_ankle`).

| arm, cell | stance | frames | ankle's moment opposes the lean | its deck roll leans the body **further** | with the deck's own roll rate | \|dk_ankle\| > \|net\| |
| --- | --- | --- | --- | --- | --- | --- |
| `f73`, 1–3 | tall | 118 | 66.1 % | **66.1 %** | 73.7 % | 83.1 % |
| | crouch | 98 | 80.6 % | **80.6 %** | 89.8 % | 84.7 % |
| | compress | 116 | 77.6 % | **77.6 %** | 82.8 % | 84.5 % |
| `s16`, 1–3 | tall | 13 | 69.2 % | **69.2 %** | 100.0 % | 92.3 % |
| | crouch | 26 | 84.6 % | **92.3 %** | 80.8 % | 84.6 % |
| | compress | 42 | 92.9 % | **90.5 %** | 90.5 % | 90.5 % |
| `f73-g` | tall | 1 652 | 54.8 % | 54.8 % | 74.9 % | 86.3 % |
| | crouch | 1 622 | 76.1 % | **76.2 %** | 76.0 % | 79.4 % |
| | compress | 1 542 | 83.1 % | **83.1 %** | 74.8 % | 87.1 % |

The first two columns agree row for row on `f73` and on `f73-g`'s tall, and part company only where `A⁻¹`'s own sign
moves (`s16`'s crouch and compress, `f73-g`'s crouch, and the planing cell's `s16` rows) — which is the identity
above, read rather than assumed.

> **The ankle is correcting, and the correction is the drive.** The loop is: the deck rolls → the body's lean over
> its stance point grows (3.3k measured that lag at **+0.100 s in 48 of 48 runs**) → the balance commands ankle
> torque against the lean → 42–93 % of that torque rolls the deck the same way → the lean grows. **The `0.00°` ask is
> not an absence of action: holding plumb against a deck that is rolling is work, and the only place the work can go
> is the board.**

**And the joint that could take it instead is unused.** The upper body's own `swing` — the term a real surfer throws
a correction into, because it acts against his own mass and not against the board — carries **0.1–0.4 %** of the
traffic on every arm and stance measured, against the ankle's 7–56 %.

## 5. Where it starts: the mount's first frame, and it is worse the slower he is

`rollAxis·ω` in °/s, with frame 1 standing alone (t = 0.0167 s):

| arm, cell | rate at frame 1 | share of the peak | ankle τ at frame 1 | `dk_ankle` at frame 1 | net at frame 1 |
| --- | --- | --- | --- | --- | --- |
| `f73`, 1–3 m/s | **−28.1…−27.9 °/s** | 12–23 % | **−12.3…−13.0 N·m** | −2 281…−2 248 °/s² | −1 687…−1 672 °/s² |
| `s16`, 1–3 m/s | **−57.9…−57.1 °/s** | 23–26 % | **−44.7…−45.0 N·m** | −5 231…−5 208 °/s² | −3 836…−3 798 °/s² |
| `f73`, 4–6 m/s | −0.9…−0.6 °/s | 0–1 % | −1.9…−2.0 N·m | −223…−196 °/s² | −52…−34 °/s² |
| `f73-g`, glide | −1.1…−0.4 °/s | 1–2 % | −1.4…−1.9 N·m | −193…−156 °/s² | −67…−25 °/s² |

**A quarter of the whole roll rate is on the board after one frame of the mount at the crawl, and the first ankle
torque there is 6–24 × the planing arms'.** `dk_ankle` alone over-explains frame 1's net on every arm. This is step
3.4f's *"the command the loop asks for at frame 1 is 1.4–2.3 × the bound, and the arm the owner would ride has the
ankle pinned on it for the mount's first seven frames"* seen on the board's roll row, and it is stance-independent to
the tenth of a degree per second — which is what a mount transient looks like and what a stance-dependent fault does
not.

## 6. Before the fall, or part of it — stated plainly

| arm, cell | stance | rate peak | t90 | roll at t90 | roll at the fall | swing after t90 | t90 inside 25° |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `f73`, 1–3 | tall | 84–132 °/s | 0.200–1.017 s | 3.4–46.9° | 48.4–52.6° | **80 %** | 2 of 3 |
| | crouch | 182–264 | 0.433–0.800 | 2.1–40.0° | 15.7–66.8° | **53 %** | 2 of 3 |
| | compress | 202–254 | 0.433–0.783 | 24.3–38.9° | 53.5–62.4° | **47 %** | 2 of 3 |
| `s16`, 1–3 | tall | 234–304 | 0.217–0.550 | 13.0–23.7° | 39.2–64.9° | 55 % | 3 of 3 |
| | crouch | 200–341 | 0.233–0.850 | 9.5–56.3° | 41.0–60.7° | 18 % | 2 of 3 |
| | compress | 194–265 | 0.217–0.750 | 7.5–59.9° | 37.1–66.4° | 37 % | 2 of 3 |

**The angle is the capsize; the drive is before it.** The rate reaches 90 % of its peak while the board is still
inside 25° of roll in **13 of 18 runs**, and **18–80 %** of the swing is accumulated after that, with the net at
**0.1–1.6 %** of the traffic throughout. So the 56–84° is a board spinning at 84–341 °/s with nothing restoring it —
and what put the spin on is § 4's ankle, measured in the `in25` window, before the fall.

**The brief's warning earned its place.** Read over the whole drive window and pooled, `tall`'s largest term is
`pressure` (27.2 %) with the ankle second (25.6 %); split at 25°, the ankle is first at 45 % before the fall and
pressure first at 39 % during it. **One stance of three would have been attributed to the water by a pooled read.**

## 7. Controls

- **`dkClose` and `dkSplit` are `0.0e+0` on every frame of every arm**: the twenty-three-way partition of the solve's
  right-hand side is exact, and `dkSum == deckAcc` by construction.
- **An independent reconstruction of the headline term.** `ankleDeck × (−τ_ankle)` — the deck's roll per unit ankle
  torque-impulse off the same `A⁻¹`, times the torque — reproduces `dk_ankle`'s own median within **0.93–1.08** on
  `f73`'s crawl and **0.94–0.95** on `f73-g`'s crouch and compress. (`f73-g` tall reads 1.85, on a median of −7
  against −4 °/s²: two numbers near zero.) The per-frame maximum gap is large (~1 200 °/s²) because both sides are
  means over substeps on which τ and `A` move; the medians are the honest read and both are printed.
- **The roll ledger against the trajectory:** § 3's `−rlTotal/I_board` control, ratio 0.66–1.11, sign agreeing on
  90.4–95.2 % of 145–161 frames.
- **The reference arms:** `f73-l` 18 of 18 at 0.617–2.533 s, **median 1.450 s**; `s16-l` **1.033 s**; `f73-g` 24 of 24,
  **median 4.650 s** — step 3.5c's own three, to the millisecond.
- **Instrument-only:** no byte under `src/` or `server/` changed, so there is no default to keep and no Canyon hash
  to check. `tsc -b` clean; both probe files typecheck under the repo's own strict options.
- **The stick control** of § 1: 0 mismatches over 67 767 column-values on `f73` and over 371 frames on `s16`.

## 8. What this leaves, and the one thing it does NOT say

**It does not say the ankle's gain is too high.** Nine rounds have moved the ankle's range, bound and datum and
changed nothing (3.4i), the advisor settled that no hull stiffness saves it (step ten), and 3.2y retired the
benchmark that made a plumb-held rider look like success. **A loop whose correction is its own disturbance is not
fixed by changing the loop's gain** — a smaller correction makes a smaller disturbance and the same ride. What this
round names is the **path**: the correction leaves the body through the one joint that is in series with a 100 N·m/rad
hull on a 0.0262 kg·m² board, and the joint that would act against the rider's own mass instead carries 0.1–0.4 % of
the traffic.

**No change was built and none is proposed here**, per this round's brief. The three things a next round could put to
the owner, in order of how much they are already measured:

1. **Does the correction have to go through the deck at all?** The `swing` row exists, is paired, visible and
   essentially unused. Whether the balance may spend its correction there instead is a design question about the
   rider's body, not a tuning constant — and it is the owner's to rule on, because it changes what his surfer does
   with his shoulders.
2. **The mount's own first frame** is worth a quarter of the roll rate at the crawl and 1 % of it at speed, with an
   ankle torque 6–24 × larger. `?mountAgree=deck` is 3.4h's measured *sub-floor mount fix* that lifts the sub-4 m/s
   runs and is bit-identical above 4 m/s — it was wrongly sold to the owner once as the switch that mattered, and it
   is still the only measured handle on this particular frame.
3. **The Canyon-matched face's infeasible contact** (10–11 of 16 substeps `apart` from frame 1, 9 of 9 runs) is a
   separate, unexamined mechanism on the owner's own test spot, and no published figure of this track has ever been
   read on those substeps.
