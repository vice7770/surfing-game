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


---

# Step 3.5a — the ask-cap (merged from PR #389)

**Folder note, written at the merge:** this document and the one above were created independently by two rounds (3.5d on `main`, 3.5a on its own branch) and are concatenated rather than interleaved, so nothing is lost.


The owner's bar is unchanged and is still the acceptance test: **in Compress the surfer must never fall at the low
speeds of getting into position — 100 %, not "fewer".** Tall may legitimately fall on a sharp turn.

This folder holds the two changes the **owner explicitly authorised** on 2026-11-17 — the first the whole new-rider
track has had. **Ruling A, the ask cap, is step 3.5a and is Part 1 below.** Ruling B, the stance rework, is queued
behind it and its prep round is `stance-frame.md` in this folder.

Ruling A: asked whether the game may limit what the rider *asks* for to what its speed can hold, they answered
**"Yes — cap the ask"**, on the water-physics advisor's recommendation
(`docs/research/water-physics/board-roll-stiffness.md` §7), and the option they chose says the bound applies
*"whether the request came from your stick or from its own balance"* — so both reference lines, not one.

Tags as in 3.2, 3.3 and 3.4: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source;
**[I]** my inference from a stated model; **[A]** arithmetic on measured numbers, labelled as such.

# Part 1 — step 3.5a: the cap the owner authorised is **already in the game, and tighter**, so building it can only
loosen what the rider asks for — and on the stick-untouched falls it is provably inert, bit for bit

**The question the owner was asked carried a false premise, and finding that is this round's result.** They were told
their *"rider's balance targets 42–52° of lean at 1.3 m/s"* and asked whether the game may cap the ask at
`θ_max = atan(v²/(g R_min))`. It may, and it already does. `AttachedRider.prepareBank` has bounded **both** of the
lines the ruling names — the balance's own reference (`leanAsked`, which is what the predictor is handed) and the
steer's request (`bankReference`) — by exactly that formula since 2026-10, at `TURN_RADIUS = 4.5 m`, **and the bound
is 0 whenever the board is not planing** [R, `AttachedRider.ts` on `main` at `1a2cfd65`: `:3434–3448` the expression,
`:474` MAX_BANK, `:491` TURN_RADIUS, `:342–343` the planing latch]. The 42–52° is
the bank the body **reaches** at the fall, not the lean it requests.

**So the advisor's `R_min = 2.0 m` is a loosening, not a cap.** It allows ×2.25 the lean at 1.3 m/s (4.92° against
2.19°) and ×1.76 at 5 m/s (51.88° against 29.52°), and it is no tighter than the shipped radius at any of twelve
speeds from 0.5 to 10 m/s [A, `3.5/cap.ts` §3, from `WATER.gravity` and `MAX_BANK` as the code holds them]. And in
the band the owner's complaint is about the shipped cap is not 2.19° but **exactly zero**: below `PLANING_DROP = 3 m/s`
the rider already asks to stand perfectly plumb, however hard the stick is held.

**Measured, on the arms this folder judges everything on:**

- **With the stick centred the cap never binds and the switch cannot move anything — not "barely", identically.** On
  3.4i's own `f73-l`, the requested bank is **0.00° on every live tick of all 18 runs**, so the clip share is
  **0.000 in every speed band** (n = 418 / 351 / 343 live ticks, tall / crouch / compress). Every value of the switch
  — 1.5, 2, 4, 4.5 and 9 m — reproduces the arm with **0 differing values across 6 966 column-values of 18 runs**,
  the only exceptions being the two instrument columns that *describe* the cap. Same on `s16-l` (18 runs) and `f73-g`
  (24 runs). **The 626-of-626 falls, and the 20–45° balance-fall population inside them, are untouched by
  construction, and that is measured rather than argued.**
- **Where the stick is held the shipped cap clips everything, and loosening it shortens the ride.** At full stick on
  `f73-l` the request is a flat **50.00°** (`RAIL_RANGE`) and the shipped cap clips **1.000 of live ticks in every
  band**, holding the ask at 18–23°. At `R_min = 2 m` the clip share falls to **0.649–0.693** and the ask reaches
  25–36° — and **Compress's median ride goes 1.283 → 0.817 s**. At 1.5 m, 0.504–0.578 and 0.833 s.
- **Falls: 18 of 18, 18 of 18, 24 of 24 and Compress 6 of 6 / 8 of 8 on every arm at every value, stick centred or
  hard over.** **28 arms, 540 runs, 540 of 540 fell, Compress 180 of 180.** The owner's bar is not met at any radius.
- **The advisor's first prediction is refuted and its second is refuted too, in the same arms.** The Compress rider
  does not stand through slow positioning (6 of 6 still fall, at the same millisecond with the stick centred); and he
  is **not** locked upright and unable to initiate, because *shipped* he is already asking for zero lean below 3 m/s
  and the board still reaches 20° of rail in 0.30–0.75 s and swings 21–36° of heading there. **Neither branch of the
  advisor's "quick, clear read" happens, because the quantity it reasons about was already pinned.**
- **The opposite direction is the only one with any sign of life, and it is not a fix either.** `?askCap=9` — double
  the shipped radius, a genuinely *tighter* cap wherever the board planes — holds the ask at 9–12° instead of 18–23°
  and **lengthens** the steered rides: Compress 1.283 → **1.133 s** on `f73-l`, 2.150 → **2.483 s** on the glide
  cell. Still 6 of 6 and 8 of 8. On the 12.1° face it is **mixed**: Compress 0.783 → 0.850 s, but tall 1.000 → 0.617
  and crouch 0.883 → 0.617. Three cells of six the right way, 6–8 runs each — a lead, not a result.

**Nothing here re-opens** the hull's ≈100 N·m/rad, the 70° clamp, the wave, the placement, the ankle's own range,
3.4j's across-acceleration finding, the 4 m/s plant floor as a cause (3.4m closed it) or 3.4l's `tall` sign share.
**No `yModel`-derived sign share is quoted anywhere in this round**, so 3.4n's slip-sign correction (`SLIP=lab`) is
not in the measurement path at all.

## 0. What was built, by line

One mechanism, one constant: **the minimum carved radius the commanded lean is bounded by.**

- `AttachedRider.prepareBank` — `TURN_RADIUS` in the `most` expression becomes `this.askRadius`, and the planing gate
  becomes `this.askUngated || this.planing`. Both privates are set once in the constructor from `options.askCap`,
  matched **as strings** against the five values and never parsed (`Number(null) === 0`), so with the switch unset
  `askRadius === TURN_RADIUS` and `askUngated === false` and the expression is the shipped one **by construction**.
  Snap's blend toward `SNAP_RADIUS` is unchanged: it now blends from the switch's radius instead of the constant.
- `AttachedRiderOptions.askCap?: '1.5' | '2' | '4' | '4.5' | '9'` → `RideSessionOptions` → `SurfZoneConfig` →
  `SurfZoneRunner`'s passthrough → `PhysicalMode.ts`'s `askCapSwitch()` with its line in the switch-list comment, its
  own test, and **`askCap: undefined` in `main.ts`'s online-room overrides**, which the test asserts by reading
  `main.ts` — the route `?plantFloor`, `?bankClamp`, `?mountAgree` and `?riderBody` each travel.
- `AttachedRider.leanProbe` gains three **read-only** members — `want` (the request before the cap), `held` (the
  formula before the planing gate) and `radius` — beside the `cap`, `ask`, `speedThrough` and `planing` step 3.3f
  already put there. Nothing in the game reads any of them. Their additivity is measured in §1.
- `3.3/plant.ts` — the `ASKCAP=1.5|2|4|4.5|9` arm, eight per-tick columns off `leanProbe` (one of them the single
  comparison `|want| > cap`, taken in **radians**), the clip shares by speed band on the per-run row, and eight
  turn-initiation columns. Probe-only.
- `3.5/cap.ts` — the arithmetic: θ_max at the five radii, the advisor's four quoted cells reproduced, the direction of
  the change, and the planing gate's own band. Model only, no ride.

**Why the switch carries the radius rather than a boolean.** The owner authorised the *shape* of the bound, not a
number, and the number is the one thing in the advisor's recommendation that is **not sourced**: nobody has published a
shortboard's minimum carved radius, and §7 says so itself. 2.0 m is the advisor's judgement [I] from a 1.778 m board's
rail line; 1.5 and 4 m are the bracket it offered beside it; **4.5 m is the constant the game already chose** in
2026-10 from a Canyon ride report and Forsyth et al. 2024's measured 3.8 m bottom turns [R, `:476–491`]; and **9 m is
this round's own addition**, because the loosening direction measured worse and the tightening one had to be measured
too rather than assumed.

**It is not a hidden motor, and the check is structural rather than a promise.** The change is two factors inside one
`Math.min`/`Math.max` pair that bound a *commanded angle*. No torque, damper, brake, yaw moment or force appears
anywhere in the diff; `git diff` touches no force function, no ledger and no solver. The only thing downstream of the
two reference lines that moves is the rail the gain schedule is read at, which is already a pure function of
`leanAsked` [R, `:3619–3622`]. **At no point did making the bound "stick" tempt a force**: with the stick centred the
bound has nothing to bind, and the honest finding is that it is inert, not that it needs help.

## 1. The default is byte-identical, and the instrument is additive — both measured, neither asserted

1. **The ride, switch unset.** `f73-l` reproduces step 3.4i's, 3.4l's, 3.4m's and 3.4n's published arm **exactly:
   18 of 18 fell, 0.617–2.533 s, median 1.450 s.** `s16-l` reproduces **18 of 18, median 1.033 s** and `f73-g`
   **24 of 24, median 4.650 s** — 3.4h's own two other published cells.
2. **The 37 new probe columns move no ride** (8 per tick, 29 per run). The same `f73-l` command before and after the
   columns were added:
   **0 mismatches over 6 966 column-values of 18 runs**, and the log's 73 non-JSON lines **identical**.
3. **The switch is inert with the stick centred, at every value.** Against `f73-l.ships`: `a15`, `a2`, `a4` and `a9`
   differ in **two columns only** (`askCapMed`, `askHeldMed` — both instrument columns describing the cap), `a45` in
   **one** (`askCapMed`; the radius is unchanged so `askHeldMed` cannot move, which is the check that `4.5` isolates
   the gate). Every physics column — `fell`, `fellAt`, `bankFall`, `rollFall`, `railFall` and the rest — is identical.
   Same on `s16-l` and `f73-g`.
4. **The Canyon byte check, fresh spin-up on both legs.** Protocol as 3.4i requires it, since a fresh spin-up and an
   imported `--state` give different hashes on `main` alone: the wrapper
   `globalThis.location = { search: '?canyonWaves=true' }` **prepended to the bundle**, the grid read as **B,
   400 × 451 = 180 400 cells**, `--spot canyon --steps 3600`, a `--state` path deleted first so the
   "spun up on the CPU in … s" line is present on both (48.9 s on `main`, 47.0 s on the branch — wall clock, which
   the hash does not depend on). **`main` gives `a367d938f15fa934` / `9e5831f80e38abd9` — the handoff's own recorded B reference, to the
   digit — and the branch gives the same two.** A second, cheap leg covers the doc-comment edits made to
   `AttachedRider.ts` after that bundle was built: **from the same imported `.sea` over 240 steps, the `main` bundle,
   the branch bundle and the final branch bundle all give `548f3db7ca81d898` / `475f8c56c9debccc`**, which is also
   3.4m's own recorded 240-step pair.
5. **The model's own identity.** `3.5/cap.ts` reproduces the advisor's four quoted cells at `R = 2 m` (4.92 / 24.64 /
   51.88 / 65.09° against 4.9 / 25 / 52 / 65) and checks the direction claim over twelve speeds.

## 2. What the cap actually binds — and the request is not a distribution, it is the stick

**The brief asked for "the distribution of requested bank against θ_max". There is no distribution.** The request the
cap bounds is, for the new rider, exactly

> `want = steer × RAIL_RANGE + HAND_BEND × handBend × HOLD_BANK` = **steer × 50° + handBend × 5.73°**  [R, `AttachedRider.ts` on `main` at `1a2cfd65`, `:3440–3448`]

— a deterministic function of the stick. On these arms the hand is never used, so the request is **steer × 50°**, and
the measurement confirms it to the printed digit: `want` is **0.00°** at stick 0, **15.00°** at 0.3, **25.00°** at 0.5
and **50.00°** at 1.0, with peak equal to median in every run. **So the clip share is a function of two things only:
how far the stick is pushed, and the speed.** [M]

**The clip share, tick-weighted over live ticks, per stance, never pooled.** Ranges are across the three stances, 6
runs a stance on the `-l` cells and 8 on the glide cell; the bracketed numbers are the live-tick populations
(tall / crouch / compress), and a band with no ticks prints as an em dash:

| stick | arm | overall clip | < 2 m/s | 2–3 | 3–4 | 4–6 | ≥ 6 |
|---|---|---|---|---|---|---|---|
| **centred** | `f73-l.ships` | **0.000** | 0.000 (82/74/75) | 0.000 (103/54/74) | 0.000 (109/90/54) | 0.000 (116/122/140) | 0.000 (8/11/0) |
| 0.3 | `f73-l.s0.3.ships` | 0.351–0.439 | **1.000** | **1.000** | 0.500–0.727 | 0.000 | — |
| 0.5 | `f73-l.s0.5.ships` | 0.573–0.612 | **1.000** | **1.000** | **1.000** | 0.142–0.267 | — |
| **hard over** | `f73-ls.ships` | **1.000** | **1.000** (45/52/52) | **1.000** (48/31/50) | **1.000** (30/36/43) | **1.000** (102/102/129) | 1.000 (20/13/0) |
| hard over | `f73-ls.a2` | 0.649–0.693 | 1.000 | 1.000 | 1.000 | 0.320–0.523 | 0.000 |
| hard over | `f73-ls.a15` | 0.504–0.578 | 1.000 | 1.000 | 1.000 | 0.054–0.220 | 0.000 |
| hard over | `f73-ls.a9` | **1.000** | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| hard over | `f73-gs.ships` (glide) | 0.494–0.525 | — | 1.000 | 1.000 | 1.000 | 0.310–0.344 |
| hard over | `f73-gs.a2` (glide) | 0.114–0.155 | 1.000 | 1.000 | 0.289–0.555 | 0.000 | 0.000 |

**Three readings.**

1. **Shipped, the cap binds EVERY live tick when the stick is hard over — at every speed, 6 m/s and above included —
   and nothing at all when the stick is centred.** That is the whole answer to "what does the cap bind": at full stick
   the rider gets 18–23° of ask where it asked for 50°; with the stick centred it asks for 0° and the cap is a no-op.
   At partial stick it binds from the slowest band upward and releases where the speed catches the request: at 0.3 it
   is 1.000 below 3 m/s, 0.50–0.73 at 3–4 and 0.000 at 4–6.
2. **The shipped cap is already the strictest thing in the chain below 3 m/s**, because the planing gate makes it
   exactly 0 there, and **38–48 % of the live ticks of the owner's own low cell are off the plane** (`askPlaningShare`
   0.382 / 0.462 / 0.480). Those are the ticks the advisor's 4.9° was aimed at, and they currently allow 0.0°.
3. **The 4–6 m/s band is where the switch has real authority** and it is the band where the clip share moves most:
   1.000 → 0.32–0.52 at 2 m, → 0.05–0.22 at 1.5 m, and stays 1.000 at 9 m.

## 3. The falls and the ride times, on 3.4i's and 3.4h's own arms

**Stick centred — the arms the published figures were taken on. Every value of the switch is bit-identical here; the
single row is the measurement, not a shorthand.**

| arm (all five switch values) | runs | fell | median s | span | Compress | Compress med | published |
|---|---|---|---|---|---|---|---|
| `f73-l` | 18 | **18 of 18** | **1.450** | 0.617–2.533 | **6 of 6** | 1.450 | 18/18, 1.450 ✔ |
| `s16-l` | 18 | **18 of 18** | **1.033** | 0.500–6.233 | **6 of 6** | 1.167 | 18/18, 1.033 ✔ |
| `f73-g` | 24 | **24 of 24** | **4.650** | 1.667–5.183 | **8 of 8** | 4.650 | 24/24, 4.650 ✔ |

**Stick hard over — where the cap is live. Compress medians in bold; the fall count never moves.**

| arm | runs | fell | tall med | crouch med | **Compress** med |
|---|---|---|---|---|---|
| `f73-ls.ships` | 18 | 18 of 18 | 0.933 | 0.850 | **1.283** |
| `f73-ls.a45` (gate off only) | 18 | 18 of 18 | 0.883 | 0.917 | **0.833** |
| `f73-ls.a4` | 18 | 18 of 18 | 0.883 | 0.900 | **0.817** |
| `f73-ls.a2` (the advisor's) | 18 | 18 of 18 | 1.233 | 0.833 | **0.817** |
| `f73-ls.a15` | 18 | 18 of 18 | 1.233 | 0.833 | **0.833** |
| **`f73-ls.a9`** (tighter) | 18 | 18 of 18 | 0.933 | 1.000 | **1.133** |
| `f73-gs.ships` (glide) | 24 | 24 of 24 | 2.017 | 1.967 | **2.150** |
| `f73-gs.a2` | 24 | 24 of 24 | 2.017 | 1.967 | **2.133** |
| **`f73-gs.a9`** | 24 | 24 of 24 | 2.333 | 2.650 | **2.483** |
| `s16-ls.ships` (12.1°) | 18 | 18 of 18 | 1.000 | 0.883 | **0.783** |
| `s16-ls.a2` | 18 | 18 of 18 | 0.900 | 0.683 | **0.617** |
| `s16-ls.a9` | 18 | 18 of 18 | 0.617 | 0.617 | **0.850** |

**Half stick and a third, for the shape across the stick** (`f73-l`, 18 runs an arm): at 0.3 the Compress median goes
1.283 → 0.817 s under `a2`; at 0.5, 1.283 → 0.817. **Every stick setting moves the same way: looser is shorter.**

**And one control worth more than its cost.** At `askCap=9` the half-stick arm (`STEERS=0.5`, request 25°) and the
full-stick arm (`STEERS=1`, request 50°) are **bit-identical over all 18 runs** — the only two columns that differ are
`askWantMed` and `askWantPeak`, the instrument's record of the request itself. Both sticks saturate a 9 m cap, so the
rider acts on the **ask** and not on the stick, and the cap is demonstrably the binding constraint on that arm. It is
the positive control the stick-centred arms cannot give, since there the cap binds nothing. [M]

**540 of 540 runs fell across the 28 arms, and Compress 180 of 180.** No arm, no stick setting and no radius produced
a single standing Compress run. **The owner's bar is not met, and nothing here is close to meeting it.**

## 4. The advisor's two predictions, scored

> **"If I am right, the Compress rider stands up and stays up through the slow positioning … the 1.2–1.5 s topple
> stops being how the run ends, and the third fall population (the 20–45° balance fall, 10 of 24 on his own face)
> should mostly go."**

**REFUTED, and not narrowly.** With the stick centred — which is the condition that population was measured under —
the whole ride is **bit-identical** at every radius, so the 20–45° balance-fall population is unchanged *by
measurement*, not by inference: no column of any of the 18 runs differs. With the stick held, Compress still falls
6 of 6 and 8 of 8 at every radius, and at the advisor's own 2.0 m the topple arrives **sooner** (1.283 → 0.817 s).

> **"If I am wrong, he will feel locked upright and unable to initiate at low speed — refusing to bank when the owner
> asks — and runs will end by running out of wave instead of by falling. That is a quick, clear read."**

**Also refuted, and this is the more interesting half: the failure mode it describes is the SHIPPED game, and it is
not what the ride looks like.** Shipped, with the stick hard over at entries 1–3 (1–3 m/s), the cap is **0.00°** and
the ask is **0.00° at the peak as well as the median, with `planing` 0.000 over the whole live window of all nine
runs** — the rider does refuse to bank, exactly as predicted for the "wrong" branch, and it refuses completely rather
than reluctantly. And yet:

| `f73-ls`, entries 1–3, stick hard over | shipped cap ° | shipped ask ° | to rail 5° | to rail 20° | rail peak ° | turned ° | fell at |
|---|---|---|---|---|---|---|---|
| tall 1 / 2 / 3 | 0.00 | 0.00 | 0.15 / 0.17 / 0.18 s | 0.30 / 0.37 / 0.73 s | 56.0 / 55.2 / 59.3 | 22.4 / 21.2 / 23.9 | 0.633 / 0.800 / 1.050 s |
| compress 1 / 2 / 3 | 0.00 | 0.00 | 0.17 / 0.18 / 0.18 s | 0.35 / 0.43 / 0.75 s | 67.0 / 60.4 / 84.4 | 21.3 / 24.1 / 36.4 | 0.617 / 0.833 / 1.283 s |

**The board rails to 56–84° and swings 21–36° of heading while the rider asks for nothing at all, and the run ends in
a fall, never by running out of wave.** So "locked upright" is not observable as a *ride* symptom here: the rail and
the turn below the planing speed do not come from the ask, and the run is over in 0.6–1.3 s either way. **Both of the
advisor's branches are predictions about a quantity that has no authority on this water.**

## 5. Turn initiation, measured — and the one thing this instrument cannot say

The brief asked for initiation measured as carefully as the fall count. Columns, all over **every** tick from the
mount: the first time the board's rail against the water reaches 5, 10 and 20°, how many runs reach each, the rail and
bank peaks, the peak yaw rate and `turned` = ∫|yaw rate| dt.

| `f73-l`, stick hard over | to 5° | to 10° | to 20° | reached 20° | rail peak ° | yaw peak °/s | turned ° |
|---|---|---|---|---|---|---|---|
| ships, tall / crouch / compress | 0.333 / 0.317 / 0.333 s | 0.367 / 0.417 / 0.383 | 0.667 / 0.583 / 0.600 | 5/6, 5/6, **6/6** | 56.0 / 57.9 / 81.0 | 100.1 / 147.9 / 115.9 | 31.6 / 35.6 / 38.9 |
| `a2` | 0.333 / 0.317 / 0.333 | 0.367 / 0.350 / 0.367 | 0.683 / 0.433 / 0.433 | **4/6**, 5/6, 6/6 | 46.0 / 75.9 / 76.0 | 175.6 / 192.8 / 165.4 | 34.9 / 51.1 / 39.5 |
| `a9` | 0.350 / 0.317 / 0.317 | 0.383 / 0.367 / 0.367 | 0.667 / 0.667 / 0.667 | 5/6, **6/6**, 6/6 | 57.5 / 83.5 / 81.5 | 177.3 / 177.6 / 167.4 | 49.5 / 56.7 / 62.2 |

**Initiation did not get worse at any radius** — the times to 5° and 10° are the same to within one or two
ticks (0.317–0.350 s and 0.350–0.417 s on all three arms), the peak yaw rate goes **up** at both ends
(100–148 °/s shipped against 165–193 at 2 m and 167–178 at 9 m) and the heading turned goes up at both ends too.
The only column that degrades is **"reached 20°" for tall at `a2`, 5 of 6 → 4 of 6**, and that is the ride ending
sooner, not the turn failing to start.

**The limit, stated rather than buried.** Three things this instrument genuinely cannot settle:

1. **The stick is on from t = 0 on these arms**, so "time to rail 5°" contains the mount transient and is not a
   latency from a stick *change*. A stepped-stick probe would measure that properly — but the runs end in 0.4–1.7 s,
   so there is no window to step in. **An honest initiation latency needs a rider that survives first.**
2. **The rail reaching a threshold is not proof of a commanded turn.** On an arm where the rider falls, the board
   rails over because it is capsizing, and the two cannot be separated by this column. The columns that *are* clean
   are `cap` and `ask`, which are the command itself.
3. **The threshold medians are over different sub-populations** (a run that never reaches 20° contributes nothing), so
   they are not monotone in the threshold — on the stick-CENTRED `f73-l.ships`, compress reads 1.017 s to 10° and
   0.750 s to 20° with only 5 of 6 reaching 20°. The "reached" column carries that and must be read beside the time.

## 6. What I refuted, and what I will not claim

**Refuted:**

- **The brief's and the advisor's premise that the rider's balance targets 42–52° of lean at 1.3 m/s.** It targets
  **0°** with the stick centred (18 runs, peak as well as median) and **0°** with the stick hard over below 3 m/s
  (the 9 sub-planing runs, peak as well as median). 42–52° is where the body ends up, not what it asks for.
- **"The cap would fix both the stick-untouched falls and the ones where you are steering."** It cannot touch the
  stick-untouched falls at all: `f73-l` bit-identical at all five radii (6 966 column-values an arm), `s16-l` at 2 m,
  `f73-g` at 2 and 9 m (9 288 an arm).
- **Both halves of the advisor's own if-right/if-wrong read** (§4).
- **My own first instinct, that the `?askCap=4.5` arm would be a pure no-op.** It is not: removing the planing gate
  alone moves the steered rides (Compress 1.283 → 0.833 s), because below 3 m/s the gate is the binding constraint and
  nothing else is.

**Not claimed:**

- **That `?askCap=9` is a fix or a direction.** It lengthens three steered Compress cells (1.283 → 1.133, 2.150 →
  2.483, 0.783 → 0.850) and shortens two other stances on the 12.1° face. **Three cells of six moving the right way,
  on 6–8 runs each, with the fall count pinned at 100 %, is a lead and not a result**, and the arm also removes the
  planing gate, so its two effects are not separated.
- **That the planing gate is wrong.** It is the reason the shipped game is the strictest possible cap below 3 m/s, and
  the falls happen anyway. Whether a surfer may ask for a few degrees at walking pace is a *feel* question, and the
  owner is the only one who can answer it from a ride.
- **Anything about what the owner will feel.** Every number here is headless, with the stance held, on `FACE` rows
  that are 3.4h's and not his spot's five.
- **That 2.0 m or 9 m is the right R_min.** `R_min` remains the one unsourced number in the chain.

## 7. What this round did NOT do

- No force, torque, damper, brake or yaw moment was added anywhere, and no force function, ledger or solver is in the
  diff. **The temptation the brief warned about never arose**, because the bound's problem is that it has nothing to
  bind, not that it fails to hold.
- No probe was weakened, suspended or re-cut. `3.3/plant.ts` gains one arm, eight per-tick columns and 29 per-run
  ones, and loses nothing; its published arm is reproduced to the millisecond.
- No fall classifier was re-run under `bankClamp=off`, because the stick-centred rides are bit-identical and the mix
  is therefore identical by measurement. Re-running it would have produced the same table at the cost of 10 minutes.
- No new face, placement, hull law, ankle range or plant row was touched.
- The owner's spot's own five `FACE` rows (PR #223) are still unrun in this folder, as they were in 3.4.
- **The full `vitest run` in one process did NOT complete, and that is an environment limit rather than a result.**
  This machine has 8 GB and was down to ~60 MB of free pages; two attempts at the whole suite (the default worker
  count, then `--maxWorkers=4`) **died with no summary line at all** — an OOM kill. **Run in pieces it passes:**
  - **`src/physics` at `--maxWorkers=2`: 21 files, 352 passed + 16 expected-fail (368).** Vitest's own exit code was
    1 because worker *starts* kept being killed after the files had finished, so the exit code is the machine and the
    summary is the result; both are in `results/35a/`.
  - **`src/game/PhysicalMode.test.ts` 106 of 106** — the switch's own test, including the `main.ts` online-room pin.
  - **`src/wave/SurfZoneRunner.test.ts` 43 of 43**, by hand, as the standing note requires.
  - **`src/wave/uniformSnapshot.test.ts` + `src/wave/barrel/poolBarrelPerf.test.ts` 10 of 10.** Both had failed in the
    saturated run, at 270 s and 102 s against a 60 s timeout, and both pass alone — **load timeouts, not findings**,
    and one of them is the Canyon byte-identity test.
  - `tsc -b` clean.
  - **Not run: the rest of `src/wave`, `src/scene`, `src/game` beyond `PhysicalMode`, `server/` and `scripts/`.** A
    caller with more RAM should run the whole suite in one process before merging.

## 8. Files (3.5a)

- `src/physics/AttachedRider.ts` — `askCap`, `askRadius`, `askUngated`, the two factors in `prepareBank`, and the
  three read-only `leanProbe` members.
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts` — the passthrough.
- `src/game/PhysicalMode.ts` — `askCapSwitch()` and its line in the switch-list comment.
- `src/game/PhysicalMode.test.ts` — the switch's own test, including the online-room pin read out of `main.ts`.
- `src/main.ts` — the switch-list line and `askCap: undefined` in the online-room overrides.
- `docs/research/new-rider/3.3/plant.ts` — the `ASKCAP` arm, the eight `ask*` tick columns, the clip shares by band
  and the eight turn-initiation columns. Identity-checked against step 3.4i's published arm.
- `docs/research/new-rider/3.5/cap.ts` — the model-only arithmetic; `results/35a/35a-model.txt` is its output.
- `docs/research/new-rider/3.5/read.py` — every table above, rebuilt from the dumps (gunzip them first).
- `docs/research/new-rider/3.5/results/35a/*.log.gz` — the 28 arms, raw; `35a-read.txt` the read;
  `35a-canyon-main.txt` and `35a-canyon-branch.txt` the two fresh 3 600-step Canyon legs, `35a-canyon-240.txt` the
  three-bundle 240-step leg, `35a-tests-physics.txt` the `src/physics` suite run with its own summary line.

## 9. The handoff's own caveat about Ruling B, answered

The handoff records: *"the cap may change how Compress behaves enough that Ruling B looks different afterwards … if
3.5a's result materially changes Compress's behaviour, say so before building B rather than building it blind."*

**It does not, and the answer is as strong as it can be: on the default rider the diff is byte-identical by
construction and measured identical on 60 runs, and with the stick centred it is identical at every radius too.**
Compress falls 6 of 6 at the same millisecond on `f73-l` at all five radii. **Ruling B can be built on exactly the
Compress that was measured when it was ruled.** The only caveat left is a file one: 3.5a edits `prepareBank`, which is
in the same method as the stance's bank handling, so B should start from this branch or from main after it lands.

## 10. For the owner, in plain words

**The thing you said yes to is already in the game, and it is stricter than what you were offered.** Your rider has
never been allowed to ask for a big lean at walking pace: since October it has been limited to the lean a 4.5-metre
turn can hold, and below about 3 m/s it is limited to **nothing at all** — it asks to stand perfectly straight even
with the stick pushed all the way over. The 42-to-52 degrees in the question was how far the body had already
toppled, not what it was trying to do. I am sorry the question was put to you on a wrong fact; the fact was checkable
and nobody checked it.

**So I built the switch anyway, because the useful version of your ruling is the number in it**, and the number the
advisor picked — a 2-metre turn — lets the rider ask for *more* lean than it can now, not less. Here is what the
measurements say:

- **With the stick untouched the switch changes nothing whatsoever.** Not "a little": the eighteen runs come out
  identical to the last digit at every setting. Your rider falls while asking to stand up straight.
- **With the stick held over, the looser setting makes it worse** — Compress rides 1.28 s now and 0.82 s with the
  advisor's number.
- **The opposite setting, a tighter cap, is the only one that helped at all** — Compress 1.28 → 1.13 s, and 2.15 →
  2.48 s on the faster cell. It still fell in every single run.

**To ride it:**

> `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&askCap=9`

and the same address with **`&askCap=2`** for the advisor's own number, and without the `askCap` at all for the game
as it ships. **I expect `askCap=2` to feel looser and sloppier at slow speed and `askCap=9` to feel stiffer and
slower to bank; I do not expect either to stop a fall.** If `askCap=9` feels better in the water, that is news and it
points the next round at the cap's radius rather than at the cap's existence.

**The one thing only you can decide, and it is a feel question, not a physics one:** below 3 m/s your rider is
currently forbidden to lean at all. Physics says a turn that slow holds about 2°, and a real surfer at walking pace
does stay nearly plumb. Should the game let it ask for those 2–5° anyway — `&askCap=4.5` is exactly that and nothing
else — or keep the zero? Nothing I can measure answers that; it is whether the board feels dead in your hands.

---

# Step 3.5 — the stance ladder: the fourth rung and the deepen button (merged from PR #392)

**Folder note, written at the rebase of 2026-11-17:** the section below was written on PR #392's own branch (steps 3.5b and 3.5c), independently of the two documents above. PR #389 (step 3.5a) landed on `main` first, so #392 was rebased onto it; the section is **appended rather than interleaved, so nothing is lost**, and its own top-level title is kept verbatim as this heading. The rebase itself, and the seatbelts re-run on the rebased tree, are the last section of this document.

Rounds in this folder, newest last. Step 3.5a's own section arrives with PR #389, which was still open when 3.5b was
cut; 3.5b branched from `main` at **183c4828** and touches nothing 3.5a touches except `AttachedRider`'s options block.

---

## Step 3.5b (2026-11-17) — the fourth `STANCE_TABLE` row and the deepen button, both opt-in

Built on the owner's **ruling C** — *"keep the held compress, both patterns are real"* — so **nothing is taken away**:
no stance's depth is changed, Compress stays held, and the dip is an addition. Crouch's value is out of scope (it waits
on the owner's ride of `?kneeRoom=achieved`).

**The two switches, spelled exactly:**

| | URL | what it turns on |
|---|---|---|
| the fourth rung | **`?stanceDeep=on`** | `STANCE_TUCK` is read by the balance's plant **and** the gain schedule gains a fourth knot at 0.45 m |
| the dip | **`?deepen=on`** | full manual crouch (the owner's existing crouch key) reaches the tuck's 0.45 m **anywhere**, and Compress no longer fades it |

Both are off by default, pinned `undefined` for online rooms in `main.ts` (asserted by a test that reads `main.ts`), and
each has its own `…Switch()` in `PhysicalMode.ts` with its own test. They are independent: either can be ridden alone.

### 1. THE FOURTH ROW, MEASURED — and a second clamp the brief did not know about

**The row, from `docs/research/new-rider/3.2/inertia.probe.ts`** (de Leva 1996's segment table, the game's own arm
pose, posed at the tuck's hip height of 0.78 − 0.45 = **0.33 m** over the deck — the same probe, the same table and the
same two readings the three shipped rows were taken from, which it reproduces to the thousandth):

```
STANCE_TUCK = { depth: 0.45, height: 0.40, lower: 0.857, upper: 2.440 }   BODY_FRONTAL_SHARE_TUCK = 0.2624
```

| field | value | where it came from |
|---|---|---|
| `depth` | **0.45 m** | `AttachedRider.MANUAL_CROUCH_DEPTH`, already in the code and already shipped as `?snapDepth=deep` |
| `height` | **0.40 m** | `design.md`'s own tube-tuck row (its ladder 0.85 / 0.65 / 0.55 / **0.40** is where the three shipped rows came from), **confirmed by the probe at 0.394 m** above its ankle line — the same reading sits 0.012–0.031 m under the three shipped rows, so 0.40 is both the design's number and the measurement's |
| `lower` | **0.857 kg·m²** | `yawSplit(posture(0.33, 0.13, 0.714), 'com').withBoard`, arms in the game's pose |
| `upper` | **2.440 kg·m²** | the same call's `twist` |
| frontal share | **0.2624** | `frontalInertia(...).share`, absolute 4.026 kg·m² against `m h²` = 11.318 |

**The row's error bar is the POSTURE, and it was swept rather than asserted.** The hip height is fixed by the leg
depth; how far the hips sit back (`back`) and how far the trunk leans (`lean`) are the ladder's own trend carried on —
**0.13 m and 0.714 rad** from the last segment's slopes, 0.131 and 0.661 from a straight fit through all three. Swept
over `back` 0.10–0.16 m × `lean` 0.50–0.90 rad (nine postures, the new `it` block *the tuck posture's own spread*):

| | taken | swept range |
|---|---|---|
| CoM above the ankle | 0.394 m | 0.363–0.423 (**±8 %**) |
| `lower` | 0.857 | 0.748–1.027 (**±14 %**) |
| `upper` | 2.440 | 1.973–2.873 (**±18 %**) |
| frontal share | 0.2624 | 0.2527–0.2811 (**±7 %**) |

So `upper` is the soft number and nothing here is tuned to the thousandth.

**Two things the row says.** Compress → tuck, the rider's yaw inertia **on the board falls 31 %** (1.241 → 0.857) while
the **twist rotor's rises 25 %** (1.958 → 2.440), because the thighs' share moves from the board onto the twist as the
knees fold. And the pendulum shortens 0.55 → 0.40 m: ω₀ = √(g/L) **4.22 → 4.95 rad/s**, `m h²` **22.1 → 11.7 kg·m²**.
Measured in the plant (`predictiveBalance.test.ts`): the missing row made the pendulum **37.5 % high**, ω₀ **15 % low**
and the point mass's inertia **1.89×** — the handoff's three figures, now checked against the code.

> **⚠ THE SECOND CLAMP, which the brief's list of three places did not include and which refutes part of its premise.**
> `SCHEDULE_DEPTHS = [0, 0.195, 0.3]` and `PredictiveController.blend` clamps the depth to its last knot *before*
> picking the two designs to blend — and **a design is only ever built at a knot.** So **a fourth `STANCE_TABLE` row on
> its own would have changed no gain at all**: every design would still have been built at depth 0.30 and read
> Compress's row. The row reaches the gains only through a fourth knot, which is why one switch turns both on
> (`SCHEDULE_DEPTHS_DEEP`). `stanceRoom` and `hipRange` were indeed already done, as the brief said.

### 2. WHAT THE ROW DOES TO EXISTING COMPRESS — it is NOT additive, and the cost is 0.7 s of median ride

**Population for every number below:** the Canyon-matched `FaceWater` (1.4 m, 16°, 5.7 m/s, 2.6 m deep — **a fit to
Canyon, not Canyon**), **5 entry speeds × 4 sticks = 20 runs per stance per leg**, 9 s each, live window 0.5 s → the
frame before `attached` goes false (`AttachedRider.separate` writes neither `phase` nor `upright`, so every rider
column freezes after it — that trap already corrupted a published figure, and this window avoids it). Probe
`3.5/depth.ts`; rows in `3.5/results/35b-row-{off,on}.jsonl`. **Per stance, never pooled.**

| leg | stance | **fell** | ride, s (range) | **median, s** | rows bit-identical to the off leg | ride moved |
|---|---|---|---|---|---|---|
| `?rider=new` | tall | 20 of 20 → 20 of 20 | 1.200–4.150 → 1.200–4.150 | **2.883 → 2.883** | **20 of 20** | 0 of 20 |
| `?rider=new` | crouch | 20 of 20 → 20 of 20 | 1.317–4.250 → 1.317–4.250 | **2.950 → 2.950** | 8 of 20 | 3 of 20, by **±0.017 s** (one frame) |
| `?rider=new` | **Compress** | **20 of 20 → 20 of 20** | 1.117–3.983 → **0.933–3.900** | **3.067 → 2.367** | **0 of 20** | **17 of 20, −1.633 to +0.233 s** |
| default rider | all three | 20 of 20 ea → 20 of 20 ea | unchanged | unchanged | **60 of 60** | 0 of 60 |

**The headline, with its population: on 20 runs of this one cell the fourth row shortens Compress's median ride from
3.067 s to 2.367 s — 0.70 s, 23 % — and does not change the fall count, which was already 20 of 20 and stays 20 of 20
with `balance` the cause in every run.** Seventeen of the twenty runs move; the worst single cell loses **1.633 s**, and
three runs gain up to 0.233 s. **The owner must hear this: the row is correct physics and it makes the ride they already
have shorter on this cell.** It is one cell and one rider; it is not a claim about every wave.

The plant under Compress, same runs, read at each tick's **achieved** depth: pendulum L **0.550 m pinned → 0.522–0.550**,
ω₀ **4.223 → 4.224–4.341 rad/s**, `riderCost`'s bank limit **4.38° → 4.38–4.62°**. The achieved depth passes the 0.30 m
ceiling in **0.11–0.96 of Compress's live ticks, 20 of 20 runs** — which is why the clamp was already biting, and why
"default byte-identical" would have been false while appearing true had the row been merged on by default.

**Crouch is the quiet case worth naming:** its ride is identical to the millisecond in 17 of 20 and one frame off in 3,
with the same median — so the row is not a free-for-all, it is proportional to how far past 0.30 m the leg actually got.

### 3. THE DIP — it lands in the footage's band, and it does NOT self-release

`?deepen=on` ungates one existing posture target. `manualCrouchShare(1, 0) × CROUCH_DEPTH` = **0.45 m**, so full crouch
commands the tuck over whatever stance is held, and Compress stops fading it away. No new input, no new force, no new
quantity, **no clock, no timer, no fatigue and no stamina anywhere in it.**

Same cell, same 20 runs a leg (`35b-dip-{off,on}.jsonl`, `35b-dip-on-row-on.jsonl`):

| leg | commanded | leg holds | hips | **% of the 0.88 m straight leg** | footage |
|---|---|---|---|---|---|
| shipped (tuck inputs, no curl) | 0.300 m | 0.300–0.333 | 0.451–0.481 m | **51–55 %** | the sustained crouch band |
| **`?deepen=on`** | **0.450 m** | 0.447–0.450 | **0.331–0.353 m** | **38–40 %** | **inside the 35–50 % spike band ✔** |
| `?deepen=on&stanceDeep=on` | 0.450 m | 0.389–0.450 | 0.331–0.416 m | 38–47 % | inside it ✔ |

Without the fourth row, **0.98–1.00 of the dip's live ticks are clamped onto Compress's plant** — the dip is exactly the
case the row is for, and the two want riding together.

> **DOES IT SELF-RELEASE WITHOUT A CLOCK? NO — and I did not build one.**
>
> Measured with a momentary press (`DIP=<from>,<hold>`: the crouch key pressed over Compress and let go), 20 runs a
> hold length, four hold lengths, base depth read in 19 of 20 each:
>
> | hold | reached 0.45 m | time to reach it | **ROSE WHILE STILL HELD** | back to its pre-press depth after the release |
> |---|---|---|---|---|
> | 0.25 s | **0 of 19** | — | **0 of 19 runs, 0 ticks** | 0.300–0.533 s (14 of 19 lasted that long) |
> | 0.50 s | 7 of 19 | 0.450–0.483 s | **0 of 19 runs, 0 ticks** | 0.333–1.300 s (10 of 19) |
> | 0.70 s | 15 of 19 | 0.450–0.517 s | **0 of 19 runs, 0 ticks** | 0.350–0.533 s (7 of 19) |
> | 1.50 s | 15 of 19 | 0.450–0.517 s | **0 of 19 runs, 0 ticks** | 0.350–0.483 s (5 of 19) |
>
> **The dip's duration is the press's duration, full stop.** The depth is a commanded leg-spring rest length; nothing in
> the code can raise it. **`kneeStrength` cannot**, and this is worth stating plainly because the brief offered it as the
> reason: it falls with depth (3.0 / 2.25 / 2.1 / 1.9 body weights, `standingBody.ts:113–117`) but it bounds the **force
> the legs may push with**, not the length they are held at — too much load makes the body sink *below* the rest, never
> rise. A static strength curve limits how deep and how hard, not how long.
>
> **So if the owner wants the dip to come back up on its own, that needs a mechanism we do not have, and it would be a
> clock or a new rule. I have not built, proposed or hidden one.** What the measurement does say is that the leg's own
> pace is the real floor on the dip's duration: it needs **0.45–0.52 s** to cover the last 0.15 m (`CROUCH_ACCELERATION`
> 6 m/s², `CROUCH_SPEED` 1.5 m/s), so a **0.25 s press never arrives** and the footage's 0.25–0.7 s spike band is only
> half-reachable. The whole tall → low → tall cycle, pressed for 0.5–0.7 s, is **0.85–1.05 s** — which does land inside
> the footage's 1–1.5 s cycle.

**Still unasked, and the default stands:** whether the dip should fire **automatically at turn entry**, as all five clips
show it. An automatic dip is the game moving the owner's body for them — the boundary ruling A sits on — so it is on
their input only until they say otherwise.

**What the dip costs on this cell, stated rather than buried:** dipping over Compress (with the row on) leaves the fall
count at 20 of 20 at every hold length and moves the median ride by **−0.084 / −0.200 / −0.150 / −0.133 s** for holds of
0.25 / 0.5 / 0.7 / 1.5 s, against shipped Compress's 3.067 s, with single runs between −2.033 and +0.817 s. Held at the
tuck for the whole ride, the median is **1.650 s** (`?deepen=on`) or **1.750 s** (with the row) against 3.067 s. **The
deep stance is a worse place to live on this cell, and that is a finding, not a bug to smooth over.** One cell, one
rider, 20 runs an arm.

### 4. SEATBELTS

- **Default byte-identity MEASURED, not asserted.** The same probe built on `main` (183c4828) and on this branch, no
  switch set: **120 runs (60 on `?rider=new`, 60 on the default rider), 38 columns each — 4 560 column-values, 0
  mismatches.** The tuck arm adds **20 more runs, 0 mismatches**. The default rider is inert under `?stanceDeep=on` too:
  **60 of 60 rows bit-identical with the switch on**, because the row reaches only `coupleYaw` (gated on `freeBody`) and
  the predictive controller's own weights.
- **Canyon byte check PASSED on BOTH paths** (`3.5/results/35b-canyon-byte-check.txt`). Wrapper
  `globalThis.location = { search: '?canyonWaves=true' }` **prepended to the bundle**; grid read: **B 400 × 451 =
  180 400**, render 401 × 511, solver t 22.000; 240 steps.
  - **fresh spin-up** on each leg (47.7 s / 44.6 s): `e3dbec2465df6c10` / `abb6419d6cca4c3a` — **identical**.
  - **both legs importing the same kept `.sea`** (neither printed the spin-up line): `548f3db7ca81d898` /
    `475f8c56c9debccc` — **identical**, and the same pair the handoff recorded for a 240-step imported leg.
  - Caution (3) reproduced here: the same bundle gives those two different pairs on the two paths, so they are never
    compared with each other.
- **No hidden motors.** The diff adds **no force, no torque, no damper and no brake.** Piece 1 replaces two table
  lookups with longer-table lookups; piece 2 widens the gate on an existing posture target. No force function, ledger
  or solver is in the diff, and no kinematic prescription is realised by whatever force it takes.
- **Suites, all run on this branch with `--maxWorkers=1`:** `src/physics` **58 files, 637 passed** (21 expected fails,
  the suite's own); `src/scene/rig` + `src/game` **70 files, 740 passed**; `src/wave/SurfZoneRunner.test.ts` by hand
  (it is outside the merge suite) **43/43**. Inside those: `predictiveBalance.test.ts` 22/22 and `PhysicalMode.test.ts`
  107/107. `tsc -b` clean. `src/wave/SurfZoneSimulation.test.ts` declares 644.5 minutes of timeout and was not run.

---

## Step 3.5c (2026-11-17) — ruling D built: the row SHIPS. And the 0.70 s it was said to cost is the plain rider's, not the owner's

The owner's **ruling D** — *"keep the row"* — read as **the correct physics ships by default**, since keeping it
behind a switch is indistinguishable from holding it. This round flips the default and then does the job the ruling
made necessary: **re-measure the three standing reference arms**, because every ride time this track has published was
taken on a pendulum 37.5 % too long and an inertia 1.89 × out.

**The switch, spelled exactly:**

| URL | what it does |
|---|---|
| *(nothing)* | **the fourth rung — what now ships.** `STANCE_TUCK` in the balance's plant and the gain schedule's fourth knot at 0.45 m |
| **`?stanceDeep=off`** | the old three-row ladder and `stanceAt`'s 0.30 m clamp, kept so a ride can still be priced against this track's published history |
| `?stanceDeep=on` | the shipped behaviour said out loud, so step 3.5b's own addresses keep working |

`?deepen=on` is **untouched and still opt-in** — the owner has not ruled it in, and its two questions are still open.
Compress's and Crouch's **depth values are untouched** (ruling C; Crouch waits on the `?kneeRoom=achieved` ride).

### 1. THE HEADLINE, AND IT REFUTES THE PRICE THE OWNER WAS QUOTED

The owner accepted the row **knowing it costs 0.70 s (23 %) of Compress's median ride**. That figure is real, it
reproduces here exactly, and **it belongs to a rider they do not ride.**

| cell, Compress's row, 20 runs | OLD plant | NEW default | Δ median | runs moved |
|---|---|---|---|---|
| **plain `?rider=new`** (3.5b's own probe and cell) | 3.067 s | **2.367 s** | **−0.700 s** | 17 of 20, −1.633 … +0.233 s |
| **plain `?rider=new`** (this round's probe, same face/entries/sticks) | 3.083 s | **2.367 s** | **−0.716 s** | 16 of 20, −1.684 … +0.416 s |
| **`?rider=new&feltFrame=deck&riderBody=two`** — *the address the owner rode on 2026-11-16* — s16 face | 2.517 s | **2.567 s** | **+0.050 s** | 15 of 20, −0.900 … +1.533 s |
| the same, **f73 face** (the owner's own slope) | 2.200 s | **2.250 s** | **+0.050 s** | 17 of 20, −1.450 … +0.833 s |

> **On the rider the owner actually rides, the row does not cost 0.70 s. It is +0.050 s — a hair LONGER — on both
> faces, and 0.000 s on all three reference arms.** The row is just as *active* on their rider (15 and 17 of 20 runs
> move, single runs by as much as −1.450 and +1.533 s); what is absent is the net loss.

**The cause, read in the code and then measured, not inferred:** `3.5/depth.ts` passes **neither `feltFrame: 'deck'`
nor `riderBody: 'two'`** (`depth.ts:180–187`). So step 3.5b's whole cell — and its headline — is the plain predictive
rider with a **point-mass body and a world-frame felt vertical**, not the two-body deck-filter rider of the 2026-11-16
ride. Swapping only that one thing on this round's probe, same face, same five entries, same four sticks, moves the
row's effect from **−0.716 s to +0.050 s**. The probes themselves agree: plain-rider plant.ts gives −0.716 against
depth.ts's −0.700, 16 ms apart on 20 runs.

**I am not calling 3.5b wrong.** Its arm is correctly measured and correctly labelled `?rider=new`. What was wrong was
carrying that number to the owner as the price of the row **without saying which rider it was on** — and I would have
repeated it had this round not re-measured. The honest statement from here on:

> **The row's net cost is a property of the cell AND the rider, not of the row.** It is **−0.70 s** on the plain
> rider, **+0.05 s** on the owner's rider in a turn, and **0.000 s** on all three published reference arms.
> **Falls are 20 of 20 → 20 of 20 and 18/18, 24/24 everywhere; no fall count moves anywhere in this round.**

### 2. THE THREE REFERENCE ARMS, RE-MEASURED — they re-base to themselves

**Population, said in full:** `3.3/plant.ts`, the probe steps 3.4i/3.4l/3.4m/3.4n published these arms from, with one
added env switch (`STDEEP=on|off`) and nothing else changed. `RIDER=new FELT=deck BODY=two`, `AHEAD` 0.75, `SIDE` −45,
9 s a run, the stance **held**, the stick **never touched**. `f73` = `FACE=1.4,7.32,5.7`; `s16` = `FACE=1.4,16,5.7`;
`-l` = absolute entries 1–6 m/s × 3 stances = 18 runs; `-g` = the glide cell's eight absolute entries 4.435–10.435 m/s
× 3 = 24. The live window and the fall classifier are the probe's own. **Per stance, never pooled** — the pooled `ALL`
row is printed only because that is the row the handoff quotes. Full tables in `3.5/results/35c-reference-arms.txt`.

| arm | published (old plant) | **NEW default** | fell | runs moved | span of the moves |
|---|---|---|---|---|---|
| **`f73-l`** | **18 of 18, 0.617–2.533 s, median 1.450 s** | **18 of 18, 0.617–2.533 s, median 1.450 s** | 18/18 → 18/18 | **2 of 18** (both Compress) | −0.084 … +0.017 s |
| **`s16-l`** | 18 of 18, median **1.033 s** | 18 of 18, 0.500–6.233 s, median **1.033 s** | 18/18 → 18/18 | **2 of 18** (both Compress) | −0.034 … −0.017 s |
| **`f73-g`** | 24 of 24, median **4.650 s** | 24 of 24, 1.667–5.183 s, median **4.650 s** | 24/24 → 24/24 | **1 of 24** (Compress) | −0.200 s |

Per stance, every median and every range is identical to the digit on all three arms:

| arm | tall | crouch | Compress |
|---|---|---|---|
| `f73-l` | 1.483 → **1.483** s | 1.500 → **1.500** | 1.450 → **1.450** |
| `s16-l` | 1.050 → **1.050** | 1.033 → **1.033** | 1.167 → **1.167** |
| `f73-g` | 4.950 → **4.950** | 4.833 → **4.833** | 4.650 → **4.650** |

> **So the three figures every round cites do not need replacing. They are the same numbers on the new plant.** The
> handoff's instruction — *"re-measure the reference arms and replace those numbers"* — is carried out, and the answer
> is that the replacement equals the original. **The new plant's figures are, for the record, `f73-l` 18 of 18 at
> 0.617–2.533 s median 1.450 s; `s16-l` 18 of 18 at 0.500–6.233 s median 1.033 s; `f73-g` 24 of 24 at 1.667–5.183 s
> median 4.650 s** — quote these from now on, and note they are measured on the shipped row.
>
> **The old numbers are records of a different plant, not errors** — and on these three arms the two plants happen to
> read the same.

**Why they do not move, and it is only half an explanation.** The row can only act where the achieved leg depth passed
the old 0.30 m ceiling. Measured on `3.5/depth.ts` (`ceilingShare`, the share of live ticks past 0.3005 m, 5 entries ×
the stick shown, per stance):

| face | stick | tall | crouch | **Compress** |
|---|---|---|---|---|
| s16 (16°) | 0 | 0.00 | 0.00–0.12 | **0.44–0.61** |
| s16 | 0.25–1 | 0.00 | 0.00–0.42 | **0.11–0.96** |
| f73 (7.32°) | 0 | 0.00 | 0.00–0.01 | **0.00–0.16** |
| f73 | 0.25–1 | 0.00 | 0.00–0.40 | **0.00–0.95** |

**Tall is 0.00 everywhere, on every arm and every cell, which is why tall is bit-identical in 20 of 20 and 6 of 6 and
8 of 8 runs.** On the gentle `f73` face at stick 0 the ceiling barely bites (0.00–0.16), which explains `f73-l` and
`f73-g`. **It does NOT explain `s16-l`**, where the ceiling bites in 0.44–0.61 of Compress's ticks and the ride still
does not move at the median. **So on these arms the row changes the plant and not the outcome, and "ceilingShare
predicts the cost" is refuted as stated** — it is necessary, not sufficient.

### 3. THE SEATBELT, in the other direction — and it is stronger than byte-identity of a default

"Default byte-identical" no longer applies, because the default is *meant* to move. The replacement check is that
**`?stanceDeep=off` reproduces the old plant exactly**, and it does, in the strongest form available:

- **`?stanceDeep=off` on the new build is byte-identical to the pre-flip default**, file for file, on all three
  reference arms: **54 runs × 359 summary columns, 0 mismatches** (`cmp` on the whole `.jsonl`, not a column subset).
  And the pre-flip default reproduces the **published** figures to the digit, which is how the chain closes to the
  printed numbers rather than to a re-run of itself.
- **The new default is byte-identical to the pre-flip `?stanceDeep=on`**, the same 54 runs × 359 columns, 0
  mismatches. **So the flip is a default change and nothing else: no third behaviour appeared.**
- **Second instrument, independently:** `3.5/depth.ts` on 3.5b's own cell. `?stanceDeep=off` reproduces 3.5b's
  published `off` leg **run for run, 60 of 60**, and the new default reproduces its published `on` leg **run for run,
  60 of 60** — including Compress's 3.067 → 2.367 s.
- **A probe control that is worth recording:** `plant.ts`'s own measurement ledgers (`LEDGER=on`, its default —
  `bankLedger`, `BoardBody.rollLedger`, `BoardBody.yawLedger`, all off in the game) **do not move the ride**:
  `LEDGER=off` gives identical medians on all three stances of the 20-run turn cell. The folder had asserted this;
  it is now measured.

**One discrepancy I could not close, recorded rather than smoothed over.** On nominally the same face, entries and
sticks, `plant.ts` and `depth.ts` give **different old-plant Compress medians for the plain rider** — 3.083 s against
3.067 s, which is one frame and fine — but for the owner's rider the two probes cannot be compared at all, because
`depth.ts` has no `FELT`/`BODY` switches. The two probes also differ in the manoeuvre: `depth.ts` holds the stick over
until the board has turned `ACROSS` = 85° and then **releases** it (`depth.ts:251`), while `plant.ts` holds it for the
whole run. **Both differences are reads, not guesses, and the rider difference alone is enough to carry the −0.716 s,
so I did not isolate the manoeuvre.** Anyone comparing a `depth.ts` figure with a `plant.ts` figure should check both.

### 4. THE CANYON BYTE CHECK — at the 3 600-step reference, and the path named

**The reference pair does not move, and it was verified at its own step count rather than assumed.**
`3.5/results/35c-canyon-byte-check.txt`.

- Wrapper `globalThis.location = { search: '?canyonWaves=true' }` **prepended to the bundle** (checked by reading the
  bundle's first line, because a bare string silently benches the *default* Canyon via `devTools.ts:9`).
- Grid read: **B 400 × 451 = 180 400** cells, render 401 × 511, solver t 22.000.
- **The path is named: FRESH SPIN-UP** — the bench printed `spun up on the CPU in 49.0 s`, which is the same path the
  3 600-step reference was taken on (`wave-strategy-alternatives/c2-step5a.md`, *"medium, 3600 steps, fresh
  spin-ups"*). A fresh spin-up and an imported `--state` give different pairs on `main` alone (step 3.4i measured it),
  so the two are never compared.

| | snapshots | state |
|---|---|---|
| reference (3 600 steps, fresh) | `a367d938f15fa934` | `9e5831f80e38abd9` |
| **this branch, 3 600 steps, fresh** | **`a367d938f15fa934`** | **`9e5831f80e38abd9`** |

**Identical in both columns.** Expected — the row changes the rider's balance plant and the sea's solver imports
nothing from the rider — but verified live. **This is a stronger check than step 3.5b's**, which ran a 240-step A/B
and explicitly refused to quote the 3 600-step reference because a different step count cannot be compared with it.

### 5. SEATBELTS, the rest

- **No hidden motors.** The `src/` diff is **five executable lines** plus two switch functions and their docs:
  `stanceDeep?: 'on' | 'off'`, `this.stanceDeepRow = options.stanceDeep !== 'off'`, `ladderWeights` saying `false`
  only on `'off'`, `DEFAULT_WEIGHTS.stanceDeep = true`, and the two `?? true` defaults at the plant's and the
  schedule's read sites. **No force, torque, damper, brake, impulse or velocity assignment anywhere in it** —
  grepped over every added line. **All 50 `src/` deletions were read individually: every one is a comment line or a
  type/assignment line replaced in place.** No clock, timer, fatigue or stamina is added, proposed or hidden.
- **The default rider is untouched by construction and by measurement** — step 3.5b measured it inert under the row
  (60 of 60 bit-identical), and the flip changes which branch of the same gate the new rider takes, not whether the
  gate exists.
- **`?deepen=on` is byte-unchanged** — not a line of it is in this diff.
- **Suites, all on this branch with `--maxWorkers=1`:** `src/physics` **58 files, 638 passed** (21 expected fails, the
  suite's own — 637 on 3.5b, +1 for this round's policy test); `src/scene/rig` + `src/game` **70 files, 740 passed**;
  `src/wave/SurfZoneRunner.test.ts` by hand, since it is outside the merge suite, **43/43**. Inside those:
  `predictiveBalance.test.ts` **23/23** and `PhysicalMode.test.ts` **107/107**. `tsc -b` **clean**.
  `src/wave/SurfZoneSimulation.test.ts` declares 644.5 minutes of per-test timeout and was not run; it cannot gate.
- **The new test is the one that makes the flip visible.** Every pre-existing `stanceAt`/`plantAt` test passes either
  way, because those take an explicit flag. The added test pins the **policy** instead — `DEFAULT_WEIGHTS.stanceDeep`
  and the two places that decide what `undefined` means, checked at the plant (`scheduledDesign`) and at the gain
  schedule's knots (through `PredictiveController.tick`, the public route into `blend`). It also pins that at depths
  0, 0.195 and 0.3 the two legs are identical, so the row's whole effect is on the ticks that were being clamped.
- **An error this round made and caught, worth recording because the type checker caught it and the test runner did
  not:** the first draft of that test called `scheduledDesign(7, 0.45, { ...DEFAULT_WEIGHTS })` — **three arguments,
  so the weights object landed in the `rail` slot and every gain came back `NaN`**, and the test failed with a
  confusing diff rather than a type error, because vitest does not type-check. `scheduledDesign(speed, depth, rail,
  weights)`. **Run `tsc -b`, not just the suite.**

### 6. WHAT THIS ROUND DID NOT DO

- **Did not touch `?deepen=on`** — not a line of it is in the diff. The owner has not ruled it in and its two
  questions are open: does it fire automatically at turn entry, and do they want a self-release at all.
- **Did not touch Compress's or Crouch's depth values** (ruling C; Crouch waits on the `?kneeRoom=achieved` ride).
- **Did not add a clock, timer, fatigue or stamina.** The owner cancelled that explicitly, and `kneeStrength` returns
  `2·KNEE_TORQUE/d` — **a force bound, not a length** — so it still cannot raise the body and is not re-proposed.
- **Did not change the row's own numbers.** `STANCE_TUCK` and `BODY_FRONTAL_SHARE_TUCK` are step 3.5b's measured
  values to the digit.
- **Did not edit the handoff.** This branch is behind `main` on that file by 140 lines, so editing it here would hand
  the owner a conflict. The replacement figures and the Canyon result are in the hand-back for the orchestrator.
- **Did not re-run Parts 1–6 of step 3.4's ride tables.** They were taken on the old plant and they are *records of a
  different plant*. On the three arms checked here the two plants read the same, which is a reason to expect most of
  them to survive — **not a demonstration that they do.** Anything quoted from them should still say which plant.

### 7. WHAT THE OWNER SHOULD BE TOLD, in one line each

1. **The row ships. Their ruling is built.** `?stanceDeep=off` gets the old plant back for comparison.
2. **The 0.70 s they accepted does not exist on the rider they ride.** It is +0.05 s on their rider on two faces and
   0.000 s on all three reference arms. **I quoted them a price measured on a different rider, and that was my error,
   not theirs.**
3. **No fall count moves anywhere in this round.** The acceptance bar is untouched: Compress still falls.
4. **Nothing else about the ride changes** — the three published reference numbers are the same on the new plant, and
   the Canyon sea is byte-identical at the folder's own 3 600-step reference.
---

# The rebase onto 3.5a, and the seatbelts re-run on the rebased tree (2026-11-17)

**Why this section exists.** Every number steps 3.5b and 3.5c published was taken on a tree based at **183c4828**.
PR **#389** (step 3.5a, the ask-cap) then squash-merged to `main` as **660cc94e**, and PR #392 stopped applying:
**nine files conflicted, seven of them source.** A seatbelt measured on a different base is not a seatbelt, so all of
them were re-run on the rebased tree. Full tables in `3.5/results/35c-rebase-seatbelts.txt`.

## What the conflicts were, and that nothing was chosen between

Both rounds add a dev switch, so both edit the same anchors — the import list and the switch assertions in
`PhysicalMode.test.ts`, the roll-call comment and the `undefined` pin list in `main.ts`, the `SurfZoneConfig`
passthrough in `SurfZoneRunner.ts`, and the options plumbing in `AttachedRider`, `RideSession` and
`SurfZoneSimulation`. **Every conflict was additive and both sides were kept.** The resolved tree is a strict union:
**every line either side deletes is one the OTHER side replaced in place**, checked line by line, and the switch
order is `bankClamp, askCap, stanceDeep, deepen, buoyFrame` in every list that carries it.

`AttachedRider.ts` was the one to be careful with, because #389 refactored `prepareBank` around new `askRadius` and
`askUngated` fields while #392 touched the stance and plant plumbing. **Main's `askCap` code there is byte-identical
to main's own** — `askRadius`, `askUngated`, `prepareBank`'s `most`/`held`/`want` and `leanProbe`'s three new columns
— and 3.5c's five policy lines all survive (`DEFAULT_WEIGHTS.stanceDeep = true` and both `?? true` read sites).

`3.5/README.md` was an add/add conflict: `main` held two concatenated documents (3.5d's, then 3.5a's) and the branch
held its own. **The branch's is appended, not interleaved** — main's 709 lines and the branch's 373 are both present
whole. Nothing was dropped.

**`main` moved again mid-round**, from 660cc94e to **73b17ddb**, which touches only
`.claude/skills/surf-video-read/SKILL.md`. `src/` and `docs/research` are byte-identical across that step, so every
figure below stands on both.

## The seatbelts, re-measured

| seatbelt | on the rebased tree | verdict |
|---|---|---|
| **`f73-l`** | **18 of 18, 0.617–2.533 s, median 1.450 s** | the published figure, to the digit |
| **`s16-l`** | **18 of 18, 0.500–6.233 s, median 1.033 s** | the published figure, to the digit |
| **`f73-g`** | **24 of 24, 1.667–5.183 s, median 4.650 s** | the published figure, to the digit |
| **`?stanceDeep=off` vs main's own default** | **60 runs × 388 columns, 0 mismatches** | byte-identical |
| the flip still live (default vs `off`) | 7 / 4 / 10 rows of 18 / 18 / 24 move | no third behaviour |
| **`?askCap` inert, stick centred, row ON** | only `askCapMed`/`askHeldMed` move; `4.5` moves `askCapMed` alone | **#389's claim 3, reproduced** |
| the ask-cap arm, stick over, old plant both sides | 18 runs × 388 columns, 0 mismatches | identical to main's |
| **Canyon B, 3 600 steps, fresh spin-up** | **`a367d938f15fa934` / `9e5831f80e38abd9`** | **the reference pair does not move** |

So 3.5c's two central findings both survive #389 landing underneath them: the arms **re-base to themselves**, and
`?stanceDeep=off` reaches the old plant. The second is now measured against a *stronger* reference than 3.5c had —
not its own pre-flip default, but **`main` with the branch absent altogether**, two bundles from two trees.

**The two switches do not interact.** With `stanceDeep` default-on, `?askCap` at all five radii still moves nothing
but the two instrument columns that describe the cap, exactly as #389 measured it. The positive control says the cap
is not merely dead: with the stick hard over, `ASKCAP=2` moves all 18 rows and the median ride 0.850 → 0.817 s.

**A method error worth recording, because it first looked like a failed seatbelt.** My first version of the `askCap`
check compared **whole rows** and read all 18 as differing. #389 never claimed whole-row identity with the switch
*set* — it claimed identity on **every physics column**, with the cap's own instrument columns free to move. The test
was wrong, not the tree; the column-wise check is the claim #389 actually made.

**Suites, all `--maxWorkers=1`:** `src/physics` **58 files, 638 passed | 21 expected fail (659)**; `src/scene/rig` +
`src/game` **70 files, 741 passed**; `src/wave/SurfZoneRunner.test.ts` by hand **43/43**; `tsc -b` **clean**. The
rig+game **+1 against 3.5c's 740 is accounted for**: `PhysicalMode.test.ts` now holds 108 `it` blocks, 3.5c's 107
plus the one `askCap` test #389 added. `src/wave/SurfZoneSimulation.test.ts` declares 644.5 minutes of per-test
timeout and cannot gate anything; it was not run.

**No hidden motors.** This round resolves conflicts and adds no force: no impulse, force, torque assignment, brake,
damper or yaw moment on any added `src/` line, and the seven `clock|timer|fatigue|stamina` hits are all comment lines
saying there is none.
