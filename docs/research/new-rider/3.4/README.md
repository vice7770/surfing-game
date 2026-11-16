# Step 3.4 — the two-body rider

The owner, asked directly with the alternatives and their costs, chose to build the two-body rider over patching the
balance's numbers. Their bar is unchanged and is the acceptance test: **in Compress the surfer must never fall at the
low speeds of getting into position — 100 %, not "fewer".** Tall may legitimately fall on a sharp turn.

Step 3.3's Parts 35–39 are this folder's base (`docs/research/new-rider/3.3/README.md`). Tags as in 3.2 and 3.3:
**[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source; **[I]** my inference from a stated
model; **[A]** arithmetic on measured numbers, labelled as such.

# Part 1 — the shipped plant is a body with no inertia of its own, the invented foot force is the residue of that, and
putting the inertia back triples the accuracy of the row the fall is in

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-two-body-a`, cut from `main` at
**c8461904** (step 3.3p's merge), so Part 39 is its base. It ships **the lateral block of the balance's internal plant
re-assembled as two bodies with one real joint** (`YawPlant.body`, `RiderBody`, `lateralMass`, `lateralCompliance`),
**one new opt-in switch with three values** (`?riderBody=two|control|symmetric`, off by default and pinned off for
online rooms), **six new tests**, and **504 rides over twenty-four arms**: step 3.3p's own five, the same five with the
switch on, the same five with the switch on its control value, the same five with its third value, and four more arms
sweeping the body's own inertia over a sixteen-fold range. **43 373 control ticks read, 36 078 of them live.**

**The controller is untouched.** The cost function, the senses, the delay, the filter's noises, `captureRow`'s own
point-mass ω₀ and `feetReach`'s own `feetReach / L` are all exactly what shipped. Only the plant changed.

**And the brief's own scope question, answered straight: the body's shape CAN be fixed without the controller, and it
was — but fixing it does not reach the bar with the shipped controller, and the cost function is now inconsistent
with the plant in two named places.** `captureRow`'s ω₀ = √(g/L) and `feetReach`'s bank limit `feetReach / L` are both
the point-mass body's, on a plant whose bank coordinate now meets **seven times** the inertia (§6 reading 3). That is
step two, it is named in §15, and it is not something this round is entitled to infer the size of.

## 0. The nine sentences the round is for

1. **The owner's bar is NOT met and this step does not come close to meeting it.** On the owner's own low-speed cell —
   entries set **absolutely** at 1–6 m/s through the water × three stances, the stick never touched — the two-body
   plant ridden ends **18 of 18 at 0.500–6.233 s** on the deck filter (median 1.033, against the shipped 1.033) and
   **18 of 18 at 0.117–6.250 s** on the world one (0.733 against 0.767), with **Compress 6 of 6 on each** [M].
   **Across the twenty-four arms, 504 of 504 rides ended before nine seconds and Compress fell in every one.**
2. **The plant came right on the row the fall is in, and that is this step's result.** Scored on 3.3p's own rows — the
   same recorded states, the same commands, the plant swapped — the **lean row's** relative error against the bank
   ledger falls from **3.515 → 1.039** on the unsteered deck arm, **3.269 → 1.109** world, **3.713 → 1.413** on the
   owner's cell, **3.901 → 1.284** world, **7.475 → 1.967** steered [M]. **Better in 96 of 96 live runs, on all five
   arms, with no exception.** The one-step residual on the body's bank rate — 3.3o's own headline instrument — falls
   from **2.552 → 0.884**, **3.097 → 0.993**, **4.620 → 1.395**, **3.634 → 1.318**, **5.131 → 1.342**, and goes
   **under one at the median in 44 of 96 runs** where 3.3o's four plants and 3.3p's two took **neither row under one
   in a single run of 96**.
3. **The roll row is unchanged at the median and worse where the bar is.** **10.300 → 10.066**, **9.385 → 9.922**,
   **2.797 → 3.982**, **7.423 → 9.065**, **3.851 → 3.267** [M] — better in **39 of 96** runs, and worst on the owner's
   own low-speed cell. **This step buys one row and not the other**, which is the shape every repair this folder has
   measured has had, and §4 reading 3 measures what is left of 3.3p's cancellation argument on the new plant: about
   half of the unsteered arms' error and all of the owner's cell's, the same as before.
4. **The invented foot force is gone, and it was never invented: it is the residue of a body with no inertia.** The
   shipped plant's `push = τ / h − m g θ` is **exactly** the constraint force of a point mass on a massless leg — from
   its own two lines, `m h² θ̈ = m g h θ − τ − m h a_f` and `H = m (a_f + h θ̈)`, the feet's own acceleration cancels
   identically [R + A]. In the assembly the ankle's generalised force is `(+1, −1, 0, 0) τ` — a torque on the board,
   its reaction on the body, **zero on the sway row and zero on the yaw row** — and the force at the feet is an
   **outcome of the solve**. Measured on the same rides, that outcome is **0.584–0.883 (0.749)** of the shipped closed
   form on the unsteered deck arm and **0.089–0.816 (0.629)** on the owner's cell [M]. **P2 holds, by a test, at
   nine decimals.**
5. **The control is exact, and it is the step's strongest single number.** The same assembly with the body's inertia at
   **zero** and the shipped coupling reproduces the shipped plant's own `A` to **1.2 × 10⁻¹⁴ of each row's largest
   entry over all 306 points of the schedule the game reads** [M, tested], its roll row's relative error to
   **5.2 × 10⁻¹⁰**, its force at the feet to **4.8 × 10⁻¹¹**, and its side→roll cross term to within **1 × 10⁻¹⁵** of the exact zero it must be; and
   **ridden** it matched the shipped rider on `fell`, `fellAt`, `rollFall`, `bankFall`, `railFall`, `frames`, `stance`
   and `steer` over **102 runs and 816 column reads with 0 mismatches** [M]. **The shipped plant is the zero-inertia
   limit of a two-body system, measured, not argued.**
6. **And my own control refuted my own prediction, which is the second finding.** I predicted the limit would hold at
   `inertia = 0` outright. It does not: the shipped coupling is **asymmetric**. The feet sit `z_d` = 0.031 m over the
   board's centre of mass, so the board's roll moves them across at `z_d φ̈` — which the shipped `feet` row omits
   **while its roll row still carries `z_d F`** [R]. One lever on the force path and none on the kinematic path is
   half of a pair, and `lateralMass` is asymmetric by exactly `m z_d` = **2.263 kg·m** [M, tested]. Correcting it
   alone is a per-cent effect: the roll row **10.300 → 10.142**, the lean row **3.515 → 3.082**, the ride ×1.03 [M].
7. **The brief's second "independent measurement" is refuted, and replaced by a bigger one in the same direction.**
   3.3o §2.3 reading 3 compared the model's **line** `g/h · θ` (121–453 °/s²) with the game's **whole** lean
   acceleration (20–206). Against the game's own matching source — the bank ledger's `gravity` column on the body's
   own lean row — **the line is right to 0.924–1.103, median 0.982** [M]. What is wrong is what the lateral solve does
   with it: the shipped plant's **solved** answer to the body's own weight is **29.6–35.4× the game's own
   (median 31.5)**, and the two-body plant's is **4.0–5.3× (4.401)** [M]. **A line read and a solved row are two
   quantities, and this folder has now made that mistake in both directions.**
8. **Two new disagreements the step creates, both measured and both reported with the win.** The effective mass a side
   force meets goes from **2.54 kg** (the game's own: 2.796–3.787, so 1.10–1.49× under) to **10.407–11.377 kg** (3.4×
   over); and the ankle's own authority over the body's absolute lean goes from **1.21–1.95× the game's** to
   **0.185–0.312×** — the new plant **understates the ankle by three to five times** [M]. The step trades two reads it
   had right for one row it had wrong.
9. **The lean row's gain is not an artefact of one value: it is monotone in the body's inertia over a sixteen-fold
   sweep.** At ×0.25, ×0.5, ×1 (the sourced value), ×2 and ×4 of it the lean row reads **2.022 / 1.584 / 1.039 /
   0.836 / 0.800** and the bank-rate residual **1.669 / 1.229 / 0.884 / 0.749 / 0.823**, while the roll row stays
   **9.680 / 9.649 / 10.066 / 10.238 / 10.402** [M]. The sourced value sits just inside the knee; at ×4 the lean row
   is **under 1 in 24 of 24 runs** and **×4 the sourced inertia is not a body**, so that is reported and not offered.

## 1. (A) The four reads that had to come first

**R1 [R]. The game's rider is a point mass too, so "the model's body is a point mass" is not by itself the mismatch.**
`AttachedRider.coupleStanding` carries the rider as a point mass `m` at `carried` with three **scalar** freedoms — the
leg along `up`, the bank across `across`, the body's own forward — and **no rotational inertia of the rider's own
appears anywhere in the 9×9** [R, `:4365–4440`]. The rider's `yawInertia` is `coupleYaw`'s, about the leg line, and is
a different coupling. So this step makes the plant's body **less** like the game's rider in one respect while making it
more like a body; §6 is where that bites and §11 is what it means for the game's own rider.

**R2 [R]. For a standing free rider `carried` equals `arm`**, because `off = position − target` is resolved on the
orthonormal `up`/`across`/`forward` basis and added back [R, `:3179–3186`], so the game's own coupling is symmetric and
the ankle's internal force (`rhs[7] += −h τ / L`) acts between the board and the rider **at the rider's own centre of
mass**, 0.55–0.85 m up — not at the feet.

**R3 [R + A]. The shipped `push` is the exact constraint force of a zero-inertia body.** `yawRows` writes
`push = torque / h` with `push[2] −= m g` [R, `rollModel.ts:510–511`]. Take the model's own bank row,
`m h² θ̈ = m g h θ − τ − m h a_f`, and the body's own lateral equation, `H = m (a_f + h θ̈)`: substituting the first
into the second cancels `a_f` **identically** and leaves `H = m g θ − τ / h`. So the famous horizontal force at the
feet is not a force someone bolted on; it is what is left when a body that **cannot resist being accelerated
sideways** is eliminated in closed form. *The brief asked whether the new body produces a force with no counterpart in
the game. The answer turned out to be about the old body: it produces one, and the reason is the missing inertia.*

**R4 [A on R3]. So the shipped lateral block is the `J → 0` limit of**

> `M q̈ = f`, `M = diag(I_x, J, I_z, m_b) + m v_f v_kᵀ`, `v_k = v_f = [z_d, h, x_f, 1]`,
> `f = [K + τ, −τ + m g h θ, N − F_x y_c, Y]`, `q = [φ̈, θ̈, ṙ, a_y]`, `a_y = V (β̇ + r)`

— the kinetic energy's own Hessian for one mass rigidly jointed through one point, a **rank-one** coupling through one
lever, with the ankle as a torque and its reaction and **no constraint force written down anywhere**. `lateralMass`
and `twoBody` are that, and §2 is the control that says the limit is exact.

**R5 [S + A]. The body's own frontal-plane inertia, sourced, posed in the game's own stances.** de Leva 1996's segment
table, in the same `posture` and the same three stances the rider's **yaw** inertia already shipped from
(`3.2/inertia.probe.ts`, extended here with one new block and nothing removed): about the board's long axis through
the body's own centre of mass, **9.686 / 7.010 / 5.620 kg·m²** tall / crouch / Compress at the game's own arm pose,
against `m h²` of 47.79 / 29.56 / 21.16 — a share of **0.1685 / 0.1917 / 0.2099** [S + A]. The **share** is what the
plant carries (`BODY_FRONTAL_SHARE`, `bodyInertiaAt`), so the plant's own `height` sets the scale; the arms in or out
move the share by less than 0.01. The raw read is `results/34a/34a-body-inertia.txt`.

## 2. (B) The control, and the asymmetry it refuted

The cells are step 3.3k's, 3.3l's, 3.3m's, 3.3n's, 3.3o's and 3.3p's own, unchanged: the Canyon-matched `FaceWater`
(1.4 m / 16° / 5.7 m/s, 2.6 m deep, the board 0.75 fronts ahead of the crest, 45° off the fall line), the stance held,
9 s a run. Every window starts after 0.2 s and excludes the `MAX_BANK` clamp's frames, which are counted and
published. The datum for every acceleration is **°/s² about `AttachedRider.rollAxis`**, as every `deck` reading on this
ledger is, and every state is the model's own (`φ = −roll`, `θ = −bank`).

| **[M]** the assembly at `inertia: 0` against the shipped plant | over 306 schedule points, tested | over 36 078 live ticks of 24 arms |
|---|---|---|
| `A`, entry by entry, over its own row's largest entry | **< 1 × 10⁻¹²** | **≤ 1.2 × 10⁻¹⁴** |
| its roll row's relative error against the shipped one | — | **≤ 5.2 × 10⁻¹⁰** |
| the force at the feet | — | **≤ 4.8 × 10⁻¹¹** |
| its side→roll cross term, which must be exactly nothing | — | **≤ 1 × 10⁻¹⁵** |
| **ridden**: `fell`, `fellAt`, `rollFall`, `bankFall`, `railFall`, `frames`, `stance`, `steer` | — | **102 runs, 816 column reads, 0 mismatches** |
| the same, at `inertia: 0` with the coupling made **consistent** | — | **differs in 98 of 102 runs** |

**Four readings.**

1. **The control holds, and it is what makes everything else in this document a comparison.** The shipped plant is the
   zero-inertia limit of R4's system to fourteen decimals in the matrix and **to the bit in the ride**. Nothing below
   can be the assembly reaching a different plant by accident.
2. **My own P1 is refuted as written, and the refutation is the second finding.** I predicted the limit at
   `inertia = 0` alone. It needs `feetRoll: false` as well, because the shipped coupling is **not symmetric**: the
   feet's own lateral acceleration omits `z_d φ̈` while the roll row carries `z_d F`. `lateralMass` without a body is
   asymmetric by exactly **m z_d = 2.263 kg·m** [M, tested]. At `J = 0` the omission is invisible in the **force**
   (`H` has no `a_f` in it at all) and visible in `θ̈`, which keeps `− z_d φ̈ / h` — 3.7 % of the roll row, on a bank
   row whose own `β` entry is **−2.61 against the −41.2 the term supplies** at 8 m/s crouched at 20° of rail [M]. *A
   term sixteen times the entry it corrects is the shape Part 35 first described, one level further in.*
3. **The symmetry on its own is a per-cent effect, measured rather than assumed.** Roll **10.300 → 10.142**, lean
   **3.515 → 3.082** on the unsteered deck arm; ridden, the median **1.183 → 1.217** (×1.03), **0.950 → 0.967**,
   **1.033 → 1.050**, **0.767 → 0.767**, **3.067 → 3.000** [M]. It ships as `?riderBody=symmetric` because it is a
   defect I can show by pointing at two lines, not because it does anything.
4. **And `symmetric` is the control on the control.** It differs from the shipped ride in **98 of 102** runs, so
   `control`'s byte-identical ride is a property of that plant and not of the switch failing to arrive. *The first
   draft of this round did fail to arrive — `?riderBody=symmetric` fell through a type guard and rode the shipped
   plant, and this column is what caught it, not the eye.*

## 3. (B) The force at the feet: an input in the shipped plant, an outcome in this one

| **[M]** per-run medians | unsteered deck 24 | unsteered world 24 | the owner's low deck 18 | the same world 18 | steered 18 |
|---|---|---|---|---|---|
| the shipped plant's own closed form `τ / h − m g θ`, N | 122.4–263.2 (**214.7**) | 122.3–240.4 (172.7) | 63.5–613.1 (308.9) | 8.0–235.0 (135.3) | 37.3–406.7 (214.5) |
| the two-body plant's **outcome** `m a_m`, N | 91.5–218.8 (**157.7**) | 89.5–193.4 (126.3) | 49.5–208.4 (126.4) | 47.2–158.9 (112.8) | 60.9–289.6 (173.6) |
| the ratio | 0.584–0.883 (**0.749**) | 0.593–0.948 (0.804) | 0.089–0.816 (0.629) | **−16.934**–16.043 (0.790) | 0.680–1.393 (0.847) |
| the water's **side force** group on the roll row, °/s², shipped | 1356.5–5058.1 (**3950.4**) | 1334.6–5016.8 (3047.5) | 829.2–3160.5 (2048.8) | 783.5–2767.5 (1865.6) | 498.4–3801.2 (1952.7) |
| … on the two-body plant | 237.6–866.0 (**596.8**) | 235.0–789.0 (496.5) | 120.4–505.6 (215.7) | 119.5–494.9 (329.8) | 118.2–797.8 (389.1) |

**Three readings.**

1. **The ankle is a torque with a reaction and nothing else, and that is a test and not a claim.** The assembly's
   ankle column on the four coordinates is `(+1, −1, 0, 0) τ`, asserted to **nine decimals** against the plant's own
   `δ` column put through `lateralCompliance`; the shipped plant's slip row reads **exactly** `−k / (h m_b V)`, the
   horizontal force `τ / h` divided by the dry board's mass, and the assembly's reads
   `(c[3][0] − c[3][1]) (−k) / V`, which is **under half** of it [M, tested]. **The number `1 / h` appears nowhere in
   the new lateral block.**
2. **The closed form overstates the honest force by a quarter to a third at the median**, and on the owner's own cell
   by up to eleven times (0.089) — the arm where the body is lowest, the ankle's lever shortest and `τ / h` largest.
   The **−16.934** is one low-world run where the shipped closed form passes through zero while the outcome does not;
   it is the whole population's edge and it is printed rather than trimmed.
3. **And the biggest single group 3.3o found in the roll row drops by five to ten times.** 3.3o's headline per-part
   number was *"the model's largest single roll-row group is the water's SIDE force at 3 950 °/s²"* — larger than its
   own roll moments. With the body's inertia resisting the slip, that group is **596.8** [M]. **The group is fixed and
   the row is not** (§4), which is the honest shape of this result.

## 4. (B) The two rows, on 3.3p's own rows, with the blend separated out

The counterfactual is 3.3p's: the same recorded states, the same commands, the plant swapped, scored against the bank
ledger's own `deckTotal` and `ownTotal`. **The shipped column here is the plant rebuilt at the controller's own exact
point**, which is what the three body plants are built at too; the controller's own eight-point **blend** differs from
it by 0.001–0.056 [M, 3.3p P0h] and is printed separately so the comparison is like for like. The blended column
reproduces 3.3p's published figures to the digit (§9).

| **[M]** per-run medians, **the ROLL row's relative error** | shipped (exact point) | the coupling consistent | **the two-body rider** | two better in |
|---|---|---|---|---|
| unsteered, deck, 24 | 4.323–16.203 (**10.300**) | 4.248–15.931 (10.142) | 5.654–18.730 (**10.066**) | **10 of 24** |
| unsteered, world, 24 | 4.046–22.981 (9.385) | 3.960–22.678 (9.217) | 4.339–26.943 (9.922) | 10 of 24 |
| **the owner's low speed, deck, 18** | 0.902–16.618 (**2.797**) | 0.903–16.362 (2.746) | 0.847–19.283 (**3.982**) | **6 of 18** |
| the same, world, 12 | 0.891–18.459 (7.423) | 0.893–18.190 (7.326) | 0.870–20.104 (9.065) | 2 of 12 |
| steered, deck, 18 | 2.336–8.773 (3.851) | 2.297–8.596 (3.771) | 1.773–11.330 (**3.267**) | 11 of 18 |

| **[M]** per-run medians, **the LEAN row's relative error** | shipped (exact point) | the coupling consistent | **the two-body rider** | two better in | under 1 at the median |
|---|---|---|---|---|---|
| unsteered, deck, 24 | 1.863–9.601 (**3.515**) | 1.470–10.817 (3.082) | 0.487–2.738 (**1.039**) | **24 of 24** | **10 of 24** (shipped 0) |
| unsteered, world, 24 | 2.307–9.723 (3.269) | 1.569–10.976 (3.290) | 0.561–2.827 (**1.109**) | **24 of 24** | 10 of 24 (0) |
| **the owner's low speed, deck, 18** | 2.295–9.126 (3.713) | 1.997–9.200 (4.007) | 0.622–3.970 (**1.413**) | **18 of 18** | 3 of 18 (0) |
| the same, world, 12 | 2.414–14.023 (3.901) | 2.032–14.490 (3.990) | 0.622–3.194 (**1.284**) | **12 of 12** | 1 of 12 (0) |
| steered, deck, 18 | 3.654–18.941 (**7.475**) | 3.588–18.807 (8.077) | 0.849–6.645 (**1.967**) | **18 of 18** | 3 of 18 (0) |

| **[M]** the share of ticks whose **sign** the plant gets right | shipped | two-body |
|---|---|---|
| the board's roll acceleration, unsteered deck | 0.190–0.462 (0.338) | 0.190–0.448 (**0.338**) |
| … unsteered world / low deck / low world / steered | 0.333 / 0.579 / 0.378 / 0.609 | 0.339 / 0.549 / 0.378 / 0.624 |
| the body's lean acceleration, unsteered deck | 0.474–0.845 (0.696) | 0.627–0.852 (**0.785**) |
| … unsteered world / low deck / low world / steered | 0.738 / 0.625 / 0.686 / 0.650 | **0.758** / 0.625 / **0.759** / 0.650 |

**Four readings.**

1. **The lean row is better in 96 of 96 live runs and there is no arm, and no run, where it is not.** A factor of
   **2.6 to 3.8** at the median on the five arms. Against 3.3o §6's own table — *"no variant takes the lean row under
   1 in a single run of 96"* — this one takes it under 1 at the median in **10 of 24, 10 of 24, 3 of 18, 1 of 12 and
   3 of 18**. **That is the first time either row has gone under one anywhere in this folder outside the low-speed
   roll column that was already there before any change.**
2. **The roll row does not move at the median and gets worse where the bar is.** 10.300 → 10.066 is nothing; the
   owner's own cell goes **2.797 → 3.982** and its world twin 7.423 → 9.065. The arm it helps is the steered one
   (3.851 → 3.267, 11 of 18), which is the arm the owner is not asking about. **The arm where the correction is
   biggest is the arm where it does least, for the fifth time in this folder.**
3. **And the roll row's conditioning barely moved either, so 3.3p's own bound explains exactly as much as it did
   before and no more.** The row's largest single term over the net it produces goes **2.37 → 2.08** on the unsteered
   deck arm and **2.12 → 1.38** on the owner's cell, against the game's own **3.64** and **2.78** [M] — so the model's
   roll row is now **better conditioned than the game's own** and still wrong by ten times. 3.3p's arithmetic — a term
   wrong by a factor `f` makes a net error of about `(f − 1) ×` the conditioning — with 3.3p's own measured
   roll-moment ratios (medians 3.302 / 2.638 / 4.166 / 3.479 on the four unsteered and low arms) accounts for
   **4.8 of the measured 10.07**, 3.9 of 9.92, **4.4 of 3.98** and 4.0 of 9.07 [A]: all of the owner's cell and
   **about half** of the unsteered arms', which is what it accounted for on the shipped plant too (5.5 of 10.30).
   **So the body's shape is not what was left over, and what is left over is unchanged.** This round narrows the roll
   row's residue to something that is not the inertias (3.3p), not the side force (3.3p), not the body's shape (here)
   and not newly explained by the conditioning (here).
4. **The sign agreement moves on the lean row and not on the roll row**, which is the same split: 0.696 → 0.785 and
   0.338 → 0.338 on the unsteered deck arm.

## 5. (B) The one-step residual, 3.3o's own headline instrument

`resid = Φ x_k + Γ u_k − x_{k+1}` over the component's own one-step change, with the plant swapped and the previous
tick's own Φ, Γ and command — the same shape 3.3p used for its tilt plant and nothing of this tick in it.

| **[M]** per-run medians | the board's **roll rate**, shipped → two | the body's **bank rate**, shipped → two | bank rate under 1 at the median |
|---|---|---|---|
| unsteered, deck, 24 | 4.155–15.915 (10.641) → 5.454–18.440 (**10.332**) | 1.415–9.497 (2.552) → 0.535–3.321 (**0.884**) | **19 of 24** (shipped 0) |
| unsteered, world, 24 | 3.796–19.418 (9.092) → 4.319–21.420 (9.964) | 2.022–10.029 (3.097) → 0.619–3.452 (**0.993**) | **13 of 24** (0) |
| the owner's low speed, deck, 18 | 1.441–18.771 (3.980) → 2.028–20.387 (5.369) | 1.970–22.273 (4.620) → 0.602–5.122 (**1.395**) | 4 of 18 (0) |
| the same, world, 12 | 2.999–19.753 (7.857) → 4.567–23.064 (10.732) | 1.099–5.060 (3.634) → 0.139–1.846 (**1.318**) | 4 of 12 (0) |
| steered, deck, 18 | 2.471–9.084 (3.934) → 1.820–11.599 (3.821) | 3.966–23.179 (5.131) → 0.880–6.492 (**1.342**) | 4 of 18 (0) |

**Two readings.**

1. **Two independent instruments agree, as they did in 3.3o.** The ledger's rows (§4) and the state line here give the
   lean row's gain as ×0.30 and ×0.35 on the unsteered deck arm. **3.3o's own sentence — *"it is above 1 at the median
   in 96 of 96 live runs, on both rows, in every arm"* — is now false on the bank row in 44 of 96 runs.**
2. **The roll rate is the same number it was.** 10.641 → 10.332, 9.092 → 9.964, 3.980 → 5.369, 7.857 → 10.732,
   3.934 → 3.821. **The model still does not know which way the board is about to roll**, and nothing in this step was
   ever going to tell it.

## 6. (B) The four lateral reads, against the game's own `A⁻¹` — what the step buys and what it costs

The bank ledger publishes the whole 4×4 lateral compliance of the game's own matrix (3.3p); `lateralCompliance` is the
same four reads off the model's own, and both sides are reads.

| **[M]** per-run medians, unsteered deck 24 | the GAME, off its own `A⁻¹` | shipped | two-body | game/shipped | game/two |
|---|---|---|---|---|---|
| **the mass a side force meets**, kg | 2.796–3.787 (3.225) | **2.540** | 10.407–11.377 (11.097) | 1.101–1.491 (**1.270**) | 0.260–0.336 (**0.297**) |
| **a side impulse's own roll**, rad/s per N·s | −0.1192 to −0.0372 (−0.0708) | **exactly 0** | −0.0355 to −0.0202 (**−0.0310**) | — | 1.807–3.999 (**2.708**) |
| the board's roll inertia, kg·m² | — | — | — | 0.747–1.184 (0.929) | 0.746–1.182 (0.926) |
| its yaw inertia, kg·m² | — | — | — | 0.964–1.061 (1.021) | 0.908–0.999 (0.959) |
| **the inertia the BANK coordinate meets**, kg·m² | — | 0.688–1.611 (0.964) | 5.324–10.287 (6.874) | — | — |
| **the ankle's own authority over the lean**, \|model/game\| | the ledger's `ankleOwn` | 1.213–1.949 (**1.537**) | 0.185–0.312 (**0.233**) | — | — |

**Five readings.**

1. **The structural term the model had none of is there, with the right sign and two to eleven times too small.**
   3.3p reading 5: *"a water side force on the board produces no roll acceleration at all in the model."* It now
   produces **−0.0202 to −0.0363** rad/s per N·s against the game's **−0.3363 to −0.0360**; game/two medians by arm
   **2.708 / 2.256 / 10.694 / 2.398 / 3.532** [M]. **P3 holds in sign and in order and is refuted at its own upper
   edge** (I wrote −0.015 to −0.030; the span reaches −0.0363).
2. **And the sway mass, which the shipped plant had right, is now wrong the other way.** 2.54 kg was 1.10–1.49× under
   the game's; 11.097 kg is **3.4× over**. **P4 holds in direction and is refuted in magnitude** — I predicted 7–9 kg.
   The cause is in the algebra: a body with inertia `J` about its own centre resists having its feet moved sideways
   with an effective mass `m J / (J + m h²)`, about 11 kg here, **and the game's rider does not, because the game's
   rider is a point mass with a nearly free slider** (R1). *The more physical body is the one that disagrees with the
   game, and that sentence is the round's own warning label.*
3. **The ankle's authority over the lean goes from 1.5× too strong to 4× too weak.** This is the same fact as the bank
   inertia: the shipped plant's bank coordinate meets **0.964 kg·m²** against the two-body's **6.874**, and the
   ankle's torque divides by it. 3.3m measured the game's as 1.00–2.52 kg·m² off `A⁻¹`, which is the shipped plant's
   neighbourhood and not the new one's — **so the plant that predicts the lean ROW three times better meets a bank
   inertia seven times larger than the game's.** I do not have a mechanism for that and I am not inventing one; §8
   says what the sweep says about it.
4. **The two inertias 3.3p found already right stay right.** The board's roll inertia 0.929 → 0.926 and its yaw
   inertia 1.021 → 0.959 of the game's [M]. **The step did not disturb what was correct**, which is the control on it
   not being a wholesale rescaling.
5. **The datum, stated once more because it is the round's own frame risk.** The ledger's `ankleOwn` is the response
   to `b[7] = 1/L` as `coupleStanding` books it, and the model's is `c[1][0] − c[1][1]` for the ankle's own
   `(+1, −1, 0, 0)` column; the units agree (rad/s per N·m·s is rad/s² per N·m) and **the sign conventions do not**, so
   only the magnitudes are divided and the signs are printed. A sign error there flips a ratio, not its size.

## 7. (B) The body's own weight on its own lean: the line is right, the solved row is thirty times out

| **[M]** per-run medians, °/s² | unsteered deck | unsteered world | low deck | low world | steered |
|---|---|---|---|---|---|
| the game's own `gravity` source on the lean row | 114.2–495.0 (320.7) | 113.0–434.6 (269.4) | 50.3–505.9 (327.3) | 23.3–273.4 (199.3) | 100.4–670.5 (318.3) |
| 3.3o's **line** read, `g/h · θ` | 121.1–452.7 (318.2) | — | — | — | — |
| … its ratio to the game's own source | 0.924–1.103 (**0.982**) | 0.930–1.079 (0.962) | 0.785–1.259 (0.955) | 0.714–9.763 (1.013) | 0.631–1.000 (0.922) |
| the shipped plant's **solved** answer | 3871–14541 (**10231**) | — | — | — | — |
| … its ratio to the game's own source | 29.572–35.406 (**31.470**) | 29.778–34.651 (30.845) | 25.011–40.165 (30.413) | 22.724–310.884 (32.511) | 20.189–32.142 (29.494) |
| the **two-body** plant's solved answer, ratio | 4.022–5.272 (**4.401**) | 3.942–5.302 (4.360) | 3.593–6.300 (4.283) | 3.514–46.312 (4.544) | 2.695–4.625 (3.874) |

**Three readings.**

1. **The brief's second independent measurement does not survive, as a comparison.** The line `g/h · θ` is the
   model's own coefficient as written, with none of the coupling the row then does; the game's 20–206 °/s² was its
   **whole** lean acceleration. Against the game's own matching source the line is **right to 2 %**. 3.3o's
   `mPendulum` column reproduces here to the digit (121.1–452.7), so this is a correction to the comparison and not to
   the number.
2. **The defect is larger than the brief said, in the same direction, and the step removes seven times of it.**
   Shipped **31.5× the game's**; two-body **4.4×** [M]. *The point-mass body was not over-answering by a factor of
   two; it was over-answering by a factor of thirty, and the reason is the bank inertia of §6 reading 3, not the
   gravity coefficient.*
3. **I will not net the two.** §6 reading 3 says the two-body bank inertia is seven times the game's and §7 says its
   weight response is four times instead of thirty-one. Both are measured; they do not compose into one verdict, and
   I am not going to pretend they do.

## 8. (B) The sweep, because one value is not a measurement

`BODYJ` scales the sourced inertia on the `Two` plant alone, on the unsteered deck arm (24 runs), scored as a
counterfactual on the shipped ride.

| **[M]** the body's own inertia | J, kg·m² | the ROLL row | the LEAN row | the bank-rate residual | the sway mass, kg | side→roll | \|ankle authority\| |
|---|---|---|---|---|---|---|---|
| the shipped point mass | 0 | **10.300** | **3.515** | **2.552** | 2.540 | 0 | 1.537 |
| ×0.25 | 1.478 | 9.680 | 2.022 | 1.669 | 5.569 | −0.0213 | 0.655 |
| ×0.5 | 2.956 | 9.649 | 1.584 | 1.229 | 7.858 | −0.0271 | 0.413 |
| **×1, the sourced value** | **5.913** | **10.066** | **1.039** | **0.884** | 11.097 | −0.0310 | 0.233 |
| ×2 | 11.825 | 10.238 | 0.836 | **0.749** | 14.853 | −0.0336 | 0.125 |
| ×4 | 23.651 | 10.402 | **0.800** | 0.823 | 18.135 | −0.0350 | 0.065 |

**Three readings.**

1. **The lean row's gain is monotone over a sixteen-fold range and the roll row is flat across all of it.** So the
   result of §4 is not a coincidence at one value, and the roll row's immunity is not either.
2. **The bank-rate residual has a minimum near ×2 and the sourced value sits just inside the knee** (0.884 against
   0.749). **The sourced number is not the best-fitting number**, which is the only thing that would have made me
   suspicious of it; it is near it and it is sourced, and that is the combination this folder wants.
3. **At ×4 the lean row is under 1 in 24 of 24 runs, and ×4 the sourced inertia is not a body.** 23.7 kg·m² about a
   73 kg body's own centre of mass is a radius of gyration of 0.57 m — a body with its mass out at arm's length in
   the frontal plane, in every stance. **It is reported because the monotonicity is the finding and withheld as a
   value because the source is the point.**

## 9. (B) Ridden — the fall, as a separate fact

| **[M]** arm | n | shipped | `?riderBody=control` | `?riderBody=symmetric` | **`?riderBody=two`** | Compress |
|---|---|---|---|---|---|---|
| unsteered, deck | 24 | 1.100–2.067 (**1.183**) | 1.100–2.067 (**1.183**) | 1.050–2.100 (1.217) | 1.083–2.683 (**1.450**) | **8 of 8 in all four** |
| unsteered, world | 24 | 0.767–1.950 (0.950) | 0.767–1.950 (0.950) | 0.767–2.000 (0.967) | 0.733–2.567 (**1.283**) | 8 of 8 |
| **the owner's low speed, deck** | 18 | 0.517–7.100 (**1.033**) | 0.517–7.100 (**1.033**) | 0.517–7.183 (1.050) | 0.500–6.233 (**1.033**) | **6 of 6 in all four** |
| the same, world | 18 | 0.117–6.900 (0.767) | 0.117–6.900 (0.767) | 0.117–7.200 (0.767) | 0.117–6.250 (0.733) | 6 of 6 |
| steered, deck | 18 | 1.367–4.117 (3.067) | 1.367–4.117 (3.067) | 1.367–4.083 (3.000) | 1.317–3.183 (**2.500**) | 6 of 6 |

**Four readings.**

1. **The owner's bar is not met and barely moves.** The low-speed deck cell's median is **1.033 s both before and
   after**, its world twin **0.767 → 0.733**, and Compress falls **6 of 6** on each. **504 of 504 rides over the
   twenty-four arms ended before nine seconds.**
2. **The unsteered ride lengthens by a quarter to a third** (×1.23 deck, ×1.35 world; longer in 15 of 24 and 14 of 24)
   and **the steered ride shortens by a fifth** (×0.82, longer in 6 of 18). That is the shape of every ride effect
   this track has measured: a trade.
3. **The plant ridden is the plant scored, which is worth one line.** On its **own** ride the two-body plant's lean
   row reads **0.648–4.129 (1.609)** and its bank-rate residual **0.658–2.978 (1.079)** on the unsteered deck arm —
   worse than the 1.039 and 0.884 it scores on the shipped ride, because the ride it produces visits a different
   state. **Both are printed; neither is the other.**
4. **And nothing here is evidence of feel.** No bot ride is offered as such anywhere in this document.

## 10. What I refuted

- **The brief's second independent measurement**, as a comparison: *"the point mass's own gravity term alone is
  121–453 °/s² where the game's whole lean acceleration is 20–206."* The line is right to **0.924–1.103** against the
  game's own `gravity` source; the **solved** row is **29.6–35.4×**. A line and a row are two quantities. **The defect
  is seven times bigger than the brief said and in the same direction**, so the brief's conclusion stands on a
  measurement the brief did not make.
- **My own P1, which was the round's own control, as written.** The shipped plant is **not** the `J = 0` limit of a
  symmetric system; its coupling is asymmetric by `m z_d` = 2.263 kg·m, and the control needs `feetRoll: false`.
  **Sixth consecutive round to find its error in the half its brief called settled** — and this time the half was
  mine.
- **My own P4, in magnitude**: the sway mass goes to **10.4–11.4 kg**, not the 7–9 I predicted, so the step's cost on
  that read is larger than I wrote.
- **My own P3, at its upper edge**: the cross term reaches **−0.0363**, outside the −0.030 I wrote; it holds in sign
  and in order.
- **My own P5 and my own P6, which I wrote opposed to each other so that one had to fail — and both did.** The roll
  row's median landed at **10.066**, outside P5's 5.0–10.0 by 0.7 % and above P6's 5.0 outright. The honest statement
  is the one neither prediction made: **the roll row does not move.**
- **My own P7, by the largest margin of the round and in the direction of the step working.** I predicted the lean row
  would move by less than 25 %. It fell by **70 %**, in 96 of 96 runs.
- **My own P8**: the pendulum term does not fall by the factor `1 / (1 + J/m h²)`, because that factor is the **line's**
  and the quantity that matters is the **solved row's**.
- **A defect in step 3.3p's own probe, found by type-checking it separately as the brief's seatbelt asks.**
  `RiderInner.schedTilt` was declared **twice** (TS2300) and `Tick` had no `schedTilt` member at all while the probe
  wrote one and the summary read it (TS2353, TS2345) — so **3.3p's probe does not type-check on 3.3p's own tree.**
  Fixed here (one duplicate line removed, one member added). **Its run-time effect is none**: rolldown does not
  type-check, the field was written and read under the same name, and 3.3p's published `schedTilt` columns are
  reproduced here unchanged.
- **The first build of this round's own switch, before any number was reported.** `?riderBody=symmetric` fell through
  a type guard in `AttachedRider` that only named `'two'` and `'control'`, so the symmetric arm rode the **shipped**
  plant and came out identical to it in every ride-dependent column. Caught by §2 reading 4's own column, not by
  reading the diff.

## 11. What I will not claim

- **I will not claim the owner's bar is any closer.** 504 of 504, Compress in every arm, and the low-speed cell's
  median unmoved to the millisecond.
- **I will not claim the plant is right.** The roll row is still wrong by ten times at the median on the arm 3.3o led
  with, and its sign is still worse than a coin. **One row of two.**
- **I will not claim the two-body plant is more like the game's own solve.** On two of the four reads it is further
  away (the sway mass, the ankle's authority), and the reason is read, not guessed: **the game's own rider is a point
  mass with a nearly free slider across** (R1). A plant can be more faithful to a body and less faithful to this game
  at the same time, and both of those were measured here.
- **I will not claim this step needs the controller to be touched, or that it does not.** What I measured is that the
  cost function now disagrees with the plant in two named places — `captureRow`'s ω₀ = √(g/L) and `feetReach`'s bank
  limit `feetReach / L` are both the **point-mass** body's, on a plant whose bank coordinate now meets seven times the
  inertia — and that the ride moved by a quarter with them left alone. **Whether fixing them meets the bar is step
  two's measurement, not an inference I am entitled to here.**
- **I will not claim the ×2 or ×4 inertias**, for the reason in §8 reading 3.
- **I will not claim anything from the low-world arm's per-source numbers.** Its ledger control degrades to 12.470
  relative (3.3p §9) and six of its eighteen runs have no live tick; its force-at-the-feet ratio spans −16.934 to
  16.043 for that reason and its median is what is read.
- **The `FaceWater` is a fit to Canyon, not Canyon**; the rider is **placed**, not paddled or popped up; every span
  above is **the whole population of its arm**, not a confidence interval.
- **No bot ride is offered as evidence of feel anywhere in this document.**
- **Carried, not mine, not touched**: `steadyTurn`'s `ref.u[0]` peaking at 2 675° in 1 of 18 steered runs (Part 37
  §6); the `cos³` added-mass frame defect; `AttachedRider.frame`'s hard clamp of the measured bank at 70° at three
  sites; `?waterHeel`, which trades and is not a fix.

## 12. The controls

**C1, the state is a read**: the reconstruction pushed back through the controller's own `C`, all seven rows, **peak
over every tick of every one of the 504 runs: exactly 0**; tick spacing exactly `CONTROL_STEP`, **0.000e+0 off** [M].

**C2, the zero-inertia limit, in the matrix**: the assembly at `{ inertia: 0, feetRoll: false }` against the shipped
`continuousPlant` over **all 306 points of the schedule** (17 speeds × 3 depths × 6 rails), **worst entry
< 1 × 10⁻¹² of its own row's largest**, asserted by `predictiveBalance.test.ts`; over the rides, **≤ 1.2 × 10⁻¹⁴** [M].

**C3, the zero-inertia limit, in the ride**: `?riderBody=control` against the shipped rider on `fell`, `fellAt`,
`rollFall`, `bankFall`, `railFall`, `frames`, `stance` and `steer` — **102 runs, 816 column reads, 0 mismatches** [M].
And it is not vacuous: `?riderBody=symmetric` differs in **98 of 102** runs.

**C4, the assembly is a mass matrix and its compliance is symmetric**: with `feetRoll` on, `|M − Mᵀ|` and
`|M⁻¹ − M⁻ᵀ|` are **0 to twelve decimals** [tested], and over the rides the compliance's two roll–sway corners agree
to **≤ 1 × 10⁻¹⁵** [M]. With it off, `M` is asymmetric by exactly `m · deckHeight` [tested].

**C5, the ankle is a torque with a reaction**: the assembly's ankle column on the four coordinates is
`(+1, −1, 0, 0) τ` to **nine decimals**, the shipped plant's slip row is **exactly** `−k / (h m_b V)`, and the
assembly's is under half of it [tested].

**C6, the groups still sum to the row** on the two-body plant: the six zeroable groups plus the named remainder
against the row's own implied mean acceleration, **peak 1.2 × 10⁻¹² (roll)** and **7.4 × 10⁻¹³ (bank)** over every
live tick of every run of every arm [M].

**C7, 3.3p and 3.3o reproduced on this tree, which is what makes §4 a comparison**: the shipped arms' blended roll row
**10.050 / 9.366 / 2.725 / 7.420 / 4.035**, the lean row **3.540 / 3.310 / 3.833 / 3.722 / 8.298**, the one-step roll
rate **10.641 / 9.092 / 3.980 / 7.857 / 3.934** and bank rate **2.552 / 3.097 / 4.620 / 3.634 / 5.131**, the roll
sign **0.338 / 0.333 / 0.579 / 0.378 / 0.605**, the pendulum line **121.1–452.7 °/s²**, and the falls
**1.183 / 0.950 / 1.033 / 0.767 / 3.067 s** — **every one of them 3.3p's or 3.3o's published figure to the digit**
[M]. The median convention is the probe's own (`s[⌊p n⌋]`), stated because with 18 runs the other convention reads
0.950 where 3.3p reads 1.033.

**C8, the ledger's own control, carried**: `−deckTotal` against the game's own `φ̇` change, **0.009–0.046** (unsteered
deck) and **0.008–0.044** (world), the lean column 0.092–0.455, the owner's cell 0.009–29.763 — 3.3o's and 3.3p's own
spans to the digit, and the reason no per-source ledger number is reported for that arm [M].

**C9, a positive control predicted before it ran.** Over the first six ticks the filter has not run, so a probe
reading `x̂` would be small there and one reading the game's own state must not be. The roll-rate ratio over ticks 1–6
is **4.809–65.259** on the low-world arm against 2.999–19.753 over the rest [M]. **Held** — 3.3p's own number, since
the instrument is unchanged.

**C10, `lateralMass`'s own rank-one structure read rather than asserted**: the board's roll inertia and its yaw
inertia off the two-body compliance are **0.926** and **0.959** of the game's against the shipped plant's 0.929 and
1.021 [M], so the assembly did not rescale what 3.3p found already right.

## 13. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- the probe type-checked **separately** on a throwaway project extending the root's options with `types: ["node"]` and
  an **absolute** `typeRoots`: **exit 0**, with `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/plant.ts`, `src/physics/rollModel.ts`, `src/physics/predictiveBalance.ts`,
  `src/physics/AttachedRider.ts`, `src/physics/bankLedger.ts` and `@types/node` (668 files). **This is what found
  3.3p's three type errors** (§10).
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **58 files, 630 passed, 21 expected fail** — step 3.3p's 624 plus this round's six.
  `vitest run src/game src/scene/rig`: **70 files, 734 passed** — 3.3p's 733 plus the switch's own.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail** —
  identical to 3.3p's.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: this round touches no solver, no wave and no spot file,
  and its one `SurfZoneSimulation.ts` change is a new optional config field threaded through `SurfZoneRunner` to the
  rider.
- **The Canyon byte check, run because `src/` DID change**, with the brief's three checks read rather than assumed —
  the wrapper prepends `globalThis.location = { search: '?canyonWaves=true' }` to the bundle, the grid line is read,
  and the "spun up on the CPU in … s" line is read so that no kept `.sea` was imported:
  - Canyon B (`?canyonWaves=true`), **400 × 451 = 180 400 cells**, spun up on the CPU in **47.9 s**: snapshots
    **a367d938f15fa934**, state **9e5831f80e38abd9** — **the same as main.**
  - the default Canyon, **400 × 507 = 202 800 cells**, spun up on the CPU in **59.6 s**: snapshots
    **ea3d57a4d49f4b48**, state **a1a2555739210f96** — **the same as main.**

  **All four match.** `src/` did change — ten files, two of them tests — but every behavioural line is behind
  `DesignWeights.riderBody`, which is unset by default and pinned off for online rooms; no solver, no wave, no spot
  file and no hull law is touched. The raw output is `results/34a/34a-canyon-byte-check.txt`.
- **the shipped rider is proved unchanged with the switch off**: the five shipped arms reproduce 3.3p's and 3.3o's
  published rows and falls to the digit (C7), and the switch's control value is byte-identical ridden over 102 runs
  and 816 column reads (C3).

## 13b. The deletions column, read line by line

`git diff --cached --numstat origin/main` before the commit, read file by file: **65 files, 2 907 insertions and 16
deletions** (this section included), and **all sixteen deletions read one by one.**

```
 52   0  docs/research/new-rider/3.2/inertia.probe.ts
301   4  docs/research/new-rider/3.3/plant.ts
 31   1  src/game/PhysicalMode.test.ts
 19   0  src/game/PhysicalMode.ts
  2   2  src/main.ts
 17   2  src/physics/AttachedRider.ts
  8   0  src/physics/RideSession.ts
115   2  src/physics/predictiveBalance.test.ts
 53   4  src/physics/predictiveBalance.ts
144   0  src/physics/rollModel.ts
  1   1  src/wave/SurfZoneRunner.ts
 11   0  src/wave/SurfZoneSimulation.ts
```

`src/physics/rollModel.ts` (**+144**), `src/game/PhysicalMode.ts` (**+19**), `src/physics/RideSession.ts` (**+8**),
`src/wave/SurfZoneSimulation.ts` (**+11**), `docs/research/new-rider/3.2/inertia.probe.ts` (**+52**),
`docs/research/new-rider/3.4/README.md` (**+674**) and the fifty-two files under `results/34a/` are **insertions only,
zero deletions.**

- **`plant.ts`, 4**: its two `import` lines, both re-added extended (`bodyInertiaAt`; `lateralCompliance` and
  `RiderBody`); and **the only real removal of the round** — `RiderInner`'s **duplicate** `schedTilt` declaration and
  its comment line, which were a TypeScript error (TS2300) in 3.3p's own probe. The identifier survives: it is still
  declared once in `RiderInner` above and is now also a member of `Tick`, which it was written to and read from
  without one. §10 has its measured run-time effect, which is none.
- **`predictiveBalance.ts`, 4**: the `rollModel` import (re-added with `RiderBody`), `plantAt`'s signature (re-added
  with `body`), and `scheduledDesign`'s two `plantAt(...)` calls (each re-added with the body option spread in).
- **`AttachedRider.ts`, 2**: the two lines of the `weights` expression, both re-added with `bodyWeights` in them and
  nothing dropped — `options.balance?.weights`, `heelWeights` and `DEFAULT_WEIGHTS` are all still there, in order.
- **`predictiveBalance.test.ts`, 2**: both import lines, extended (`lateralCompliance`, `lateralMass`;
  `SCHEDULE_DEPTHS`, `SCHEDULE_RAILS`, `SCHEDULE_SPEEDS`, `bodyInertiaAt`).
- **`main.ts`, 2**: the online-room override line and its comment line, both re-added with `riderBody` in them.
- **`PhysicalMode.test.ts`, 1** and **`SurfZoneRunner.ts`, 1**: the import line and the config spread line, each
  re-added with one more name.

**A token-by-token check was run rather than trusted to the eye**: every identifier on every one of the sixteen
deleted lines was searched for in the round's insertions, and all of them are present, with the one intended
exception named above (the duplicate declaration, whose identifier survives in two places).

## 14. Files (3.4a)

- `src/physics/rollModel.ts` — `RiderBody` (`inertia`, `feetRoll`), `YawPlant.body`, `lateralMass` (the lateral
  block's own 4×4, `diag(I_x, J, I_z, m_b) + m v_f v_kᵀ`), `lateralCompliance` (its inverse, the four reads the ledger
  publishes for the game), `solve4`, and `twoBody` — the lateral block assembled and **solved** instead of
  eliminated, with the ankle as a torque and its reaction and no constraint force written down. `yawRows` takes the
  assembly only when `y.body` is set; without it every line is the one that shipped.
- `src/physics/predictiveBalance.ts` — `BODY_FRONTAL_SHARE` and `bodyInertiaAt` (de Leva 1996 posed in the game's own
  stances), `plantAt`'s `body` option (`true` the sourced inertia, a number or a `RiderBody` outright, **and `0` the
  control, which is why the test is not truthiness**), `DesignWeights.riderBody` and its one line in
  `scheduledDesign`.
- `src/physics/AttachedRider.ts` — `AttachedRiderOptions.riderBody`, reaching the same weights route `waterHeel` does.
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts`, `src/main.ts` — the switch's own chain and its pin for online rooms.
- `src/physics/predictiveBalance.test.ts`, `src/game/PhysicalMode.test.ts` — **six new tests**: the zero-inertia limit
  over all 306 schedule points, its non-vacuity, the shipped coupling's asymmetry and the consistent one's symmetry,
  the ankle's own column with no horizontal force at the feet, the sourced inertia at each stance, and the switch's
  address with its room pin.
- `docs/research/new-rider/3.2/inertia.probe.ts` — **one new function and one new block, nothing removed**: the body's
  own frontal-plane inertia about its own centre of mass, from the same sourced table and the same posed stances the
  yaw inertia already shipped from.
- `docs/research/new-rider/3.3/plant.ts` — step 3.3p's probe, extended: the three body plants as counterfactuals on
  every ride, the control's own per-tick number, the force at the feet both ways, the four lateral reads off
  `lateralCompliance`, the groups and the conditioning on the two-body plant, the body's weight solved through each
  plant's own compliance against the ledger's own `gravity` source, `BODY=two|control|symmetric` so the ridden arm is
  the same probe on the same cells, and `BODYJ` for §8's sweep. Its two pre-existing type errors are fixed (§10).
- `docs/research/new-rider/3.4/results/34a/` — **52 files**: the twenty-four arms as `.jsonl` and `.txt`,
  `34a-summary.txt`, `34a-body-inertia.txt`, `34a-canyon-byte-check.txt` and `34a-predictions.md` (every prediction as
  written before its read, each with its own falsification, plus the five reads R1–R5 made before anything ran).
- `docs/research/new-rider/3.4/README.md` — this Part.

## 15. For the owner, in plain words — and the shot list

**You chose the two-body rider. This is step one of it, and here is what it bought and what it did not.**

**One: his balance's model of his own body was a stick with a weight on top and no stiffness of its own.** A real body
resists being twisted about itself; a weight on a stick does not. I put that resistance in — nine kilogram-metres
squared standing, five crouched, taken from the same anthropometric table his turning inertia already comes from — and
re-solved the four sideways motions together instead of one at a time.

**Two: the thing I was sent to delete was never a bug, it was a symptom.** The balance had a sideways shove at his
feet that the game has no counterpart for. It turns out that shove is **exactly** what you get when you eliminate a
body with no stiffness of its own: the arithmetic leaves it behind. Put the stiffness back and it disappears on its
own — and the honest force that replaces it is **a quarter smaller** than the invented one, and up to eleven times
smaller when he is low and slow.

**Three: the half of the model that is about HIS BODY is now three times more accurate, everywhere, with no
exceptions.** Every sixtieth of a second the balance predicts how fast his body is about to lean. Measured against
what the game then does: **wrong by three and a half times the whole movement before, wrong by one times it after** —
and better in **ninety-six of ninety-six** test rides. For the first time in this whole investigation that prediction
is **as good as the thing it is predicting** rather than several times worse, in nearly half the rides.

**Four: the half that is about THE BOARD did not move at all.** Still wrong by ten times, still gets the direction of
the board's roll right only a third of the time. Last round I told you that error survives because the sum is a
near-cancellation; on this new model the cancellation is **slightly milder and the error is the same size**, and the
same arithmetic still accounts for about **half** of it on the straight rides and **all** of it on your own slow cell.
So the board's half is not his body's shape — and after six rounds of clearing suspects it is now the whole of what is
left.

**Five: and there is a price, which I found by looking for it.** Two numbers the old model had right, the new one has
wrong the other way: how heavy the board feels when the water shoves it sideways (two and a half kilos was a bit
light; eleven is three times too heavy) and how much authority his ankle has over his lean (half again too much
before, four times too little now). The reason is almost funny: **the game's own rider is also a weight on a stick.**
So a model that describes a real body better describes *this game's* rider worse. That is a thing to fix in the game,
not in the model, and it is on the list for later steps.

**Six: your bar is not met and it barely moved.** Getting into position slowly in Compress: he still falls, six of six,
and the median time is **one point zero three three seconds before and one point zero three three after**. Riding
straight and not steering he stays on **a quarter longer**; holding a turn, a fifth shorter. Five hundred and four
test rides, every one of them ended inside nine seconds.

**My own honest summary: this was the right thing to build, it came right where it was supposed to, and it is not the
fall.** The fall is in the board's half.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot, and `?rider=new&feltFrame=deck` as always.

1. **`?riderBody=two`, no stick, just glide.** The bench says he stays on about a quarter longer. **Does his body feel
   steadier under you — less of a flick, more of a lean?** That is the half that got three times better, and it is the
   half you feel in your own body rather than in the board.
2. **The same, then get into position slowly in Compress.** The bench says it changes **nothing** — same median, still
   six of six. **I want to know whether it feels different even though it falls at the same time**, because on this
   track "falls at the same moment" and "feels the same" have come apart before.
3. **The same, and hold a turn.** The bench says a held turn goes from three seconds to two and a half. If the turn
   gives way earlier, that is this number.
4. **`?riderBody=control` once, for one minute, and tell me if you can tell.** It is the same new code with the body's
   stiffness set to zero, which my measurements say is **exactly** the rider that ships. If it feels any different at
   all, something is wrong that 816 machine comparisons did not catch, and I want to know.
5. **And a ruling, not a ride.** Step one is done and measured. What I think step two is, in order:
   - **The cost function still thinks he is a stick with a weight on top.** Two constants in the balance's own
     objective — the one that says how fast a lean runs away (√(g/L)) and the one that says how far he can lean before
     his feet run out — are the old body's. The plant under them has changed by a factor of seven in one place. **This
     is the smallest honest next step and it is the one that could turn a better model into a better ride.**
   - **The board's half, which is now the whole of the problem.** Six rounds have cleared the inertias, the side
     force, the rail schedule, the speed clamp, the free-versus-held table, the body's shape and the conditioning. I
     would stop guessing and measure the roll row against the game **per source**, the way the lean row already is.
   - **The game's own rider is a weight on a stick too** (point five above). Making *it* two bodies is a much bigger
     job than making the model's two bodies, it is the route the parked duck-dive work named as the faithful one, and
     it is the only version of this that fixes the two reads this step made worse.
   **My recommendation is the first, then the second, and the third when you want the duck-dive back.** Your call.

# Part 2 — neither of the cost function's two named constants is in the shipped cost function, only one of them was
the point mass's, and that one was already five times wrong on the plant that shipped

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-two-body-b`, cut from `main` at
**99854a51** (Part 1's merge), so Part 1 is its base. Its brief is Part 1 §8 item 1 and §15's first ruling item:
*"the cost function's two point-mass constants — the smallest honest step, and the only one that could turn a better
plant into a better ride."*

It ships **`captureOmega`** (`'line' | 'fixed' | 'solved'`, the three definitions of the lean's own divergence rate),
**`captureOmega()`** as the one place in the cost function that holds one, **`costWeights()`** and
**one new opt-in switch with three values** (`?riderCost=point|fixed|plant`, off by default and pinned off for online
rooms), **four new tests**, and **1 008 rides over forty-eight arms**: the shipped plant and the two-body plant × the
shipped cost function and the three cost arms × five cells, plus eight arms on a common one-second window.
**119 947 control ticks read, 106 313 of them live.**

**The plant is untouched.** Φ, Γ, the senses, the delay, the filter's noises, the twelve derivatives, the rail
schedule and `?riderBody`'s own assembly are exactly what Part 1 merged; a test asserts Φ and Γ are identical across
all four cost arms on both plants. **Only the cost changed.**

## 0. The nine sentences the round is for

1. **The owner's bar is NOT met and no arm of this round comes close.** On the owner's own low-speed cell — entries
   set **absolutely** at 1–6 m/s through the water × three stances, the stick never touched — the eight arms end
   **18 of 18** every time, with medians on the deck filter of **1.033 s shipped, 1.267 with the two costs on,
   1.217 with the constant corrected**, and on the two-body plant **1.033 → 0.850 → 0.883**; **Compress falls 6 of 6
   in all eight** [M]. **Across the forty-eight arms, 1 008 of 1 008 rides ended before nine seconds and Compress
   fell in every one.**
2. **Neither constant the brief sent me to fix is in the shipped cost function, so the step as named cannot change
   the shipped ride by one bit.** `DEFAULT_WEIGHTS` holds `stateScale`, `commandScale`, `rho`, `processNoise`,
   `senseNoise`, `bias` and `heaveSense` — and **neither `feetReach` nor `captureScale`** [M, read off the object, not
   the source]. `captureRow`'s ω₀ is read only inside `if (capture)` and the bank limit only inside
   `if (w.feetReach)`. The round's own correction applied to the shipped weights is byte-identical at **every one of
   the 306 points of the schedule the game reads — worst entry exactly 0** [M, tested], and non-vacuous with the two
   weights on (smallest relative move over the 306 points **1.19 × 10⁻²**). 3.2j built `captureScale` and did not keep
   it; 3.2n built `feetReach` and did not keep it; both of those rounds' own READMEs say so in as many words.
   **The brief's "the only one that could turn a better plant into a better ride" is refuted as written.**
3. **Of the two, only one was ever the point mass's.** `feetReach / L` is where the centre of mass sits over the feet,
   `h sin θ`, and a rigid body's centre of mass sits at `h` whatever its own `J` is — so the bank limit is
   **kinematic, inertia-free, and the same number for a point mass and for a body** [A, tested on the capture row's
   own θ coefficient at all three stances]. **I did not change it, and Part 1's §8 item 1 is half the size it says.**
4. **The one that is a plant constant was already wrong on the plant that SHIPPED, by two and a half times more than
   Part 1's plant made it wrong.** `√(g/L)` is **3.417–4.223 rad/s** (3.885) over the 306 points. The **shipped**
   plant's own solved lean divergence — the body's own weight `m g h θ` through the plant's own lateral compliance —
   is **19.284–23.952 (21.971)**, which is **5.656×** it; the two-body plant's is **7.644–8.605 (8.229)**, **2.118×**
   [M]. *The inconsistency the brief attributes to step 3.4a is the smaller half of an inconsistency that was already
   in the shipped design.*
5. **And there is no unique lean rate on this plant to be consistent with — three honest definitions disagree by
   5.7× and the matrices cannot choose between them.** Held feet and no body: 3.885. Held feet with the body's own
   inertia: 3.559 (**0.916×**, the `fixed` arm). The plant's own freedoms: 8.229 (**2.118×**, the `plant` arm). And the
   plant's own whole `θ̈` per `θ` — the thing a divergence rate would be read from — is **negative at 306 of 306
   points on both plants** (−641 to −147, median −379 rad/s² per rad shipped; −92 to −27, −60 two-body), because the
   ankle's own 800 N·m/rad spring is in the plant and dominates gravity by one to two orders [M]. **The capture
   point's own premise — a lean that runs away at ω₀ — is false on this plant's own A**, which is why the switch ships
   three values and the ride decides rather than the algebra.
6. **Turning the two weights on is a factor of three to four on the ride; correcting the constant is per cent to tens
   of per cent.** Unsteered deck: **1.183 → 4.317 s** with the weights on (×3.65), and **4.317 → 4.000** when the
   constant is corrected (×0.93). Every `plant`-against-`point` ratio over the ten plant × cell combinations sits in
   **0.74–1.64** [M]. **P7 held.** *The brief asked for the constant and the constant is the small term.*
7. **The ROLL ROW MOVED — the row six rounds called immovable — and the plant did not change.** With Φ and Γ identical
   and only the gains different, the roll row's relative error against the bank ledger falls **10.050 → 2.622** on the
   shipped plant and **9.087 → 2.259** on the two-body one, and its sign goes **0.338 → 0.673** and **0.321 → 0.679**;
   better in **10 of 10** plant × cell combinations on both reads, and in the five of ten where the sign started below
   a coin it crossed above it [M].
8. **And a control I predicted before it ran splits that finding in half.** On a window every arm survives
   (`SECONDS=1`, so the window is 0.2–1.0 s and **nobody has fallen in any of 192 runs**), the shipped plant's gain
   **disappears** — 9.774 → 9.418, **×1.04** against ×3.83 at nine seconds — and the two-body plant's **keeps 55 %**
   — 6.512 → 2.944, **×2.21** against ×4.02 [M]. **So on the shipped plant the roll row's gain is the trajectory and
   not the gains; on the two-body plant about half of it is the gains. P9 is refuted on one plant and held on the
   other, and I will not report the nine-second number without this one beside it.**
9. **The gain is not the rider doing less.** In the weighted two-body arms the game's **own** lean acceleration is
   **168–220 °/s² against 83** and its own roll acceleration **349–411 against 162**, while the measured rail falls
   from **15.6° to 8.0°** and the speed from **8.7 to 6.5 m/s** [M]. The relative error halves to quarters while the
   motion it is measured against **doubles**.

## 1. (A) The four reads that had to come first

**R1 [M, not R].** `DEFAULT_WEIGHTS`'s own keys, printed from the object rather than read off the source:
`stateScale, commandScale, rho, processNoise, senseNoise, bias, heaveSense`. `'feetReach' in DEFAULT_WEIGHTS` is
**false** and `'captureScale' in DEFAULT_WEIGHTS` is **false**. Both constants the brief names live behind `if`s that
no default opens.

**R2 [R].** 3.2's own README says it twice and in its own merge table: *"`captureScale` is absent from
`DEFAULT_WEIGHTS`; 3.2j built it and did not keep it"*; *"`feetReach` is an available weight, absent from
`DEFAULT_WEIGHTS`"*; *"`feetReach` is absent from `DEFAULT_WEIGHTS` and every use of it is behind
`if (w.feetReach)`"*. **This was not hidden. Part 1 wrote "the cost function is now inconsistent with the plant in two
named places" and that sentence is true of two weights; the brief read it as true of the shipped cost function.**

**R3 [R]. A documentation defect in the brief's own quoted place, now corrected.** `DesignWeights.feetReach`'s own
comment said *"It also sets the capture point's own cost (`captureScale`) to the same metres unless that is given
separately"*. **It does not**: `design` reads `const capture = w.captureScale` with no fallback, and the comment eight
lines below it says the opposite — *"`feetReach` sets the bank's ranking and nothing else"*. Two comments in one file
disagreed about one `if`. The sentence is replaced by what the code does.

**R4 [R]. A third site of the point-mass ω₀, and it is the only live one.** `HumanBalance.capture` computes
`ω₀ = √(g_eff / h)` from the felt gravity and the centre of mass's height and it is **on by default** — it drives the
knees and the arms through `sensedCapturePast` (`strategies`), while the hip's own gain `HIP_CAPTURE_GAIN` is **0**
[R]. It is **consistent there**, because the game's own rider *is* a point mass on a scalar leg (Part 1 R1) — so it
is Part 1 §8 **item 3** that would make it wrong, not item 1, and that is a thing to carry into item 3 rather than a
defect now.

## 2. (B) Whether either constant is in the shipped cost function — the column, not the code read

| **[M]** over the 306 schedule points (17 speeds × 3 depths × 6 rails) | result |
|---|---|
| the correction (`captureOmega: 'fixed'` and `'solved'`) on the **shipped** weights, against the shipped design's `K` | **worst entry exactly 0**, 306 of 306 |
| the same correction with the two weights **on**, smallest relative move of `K` over the 306 points | **1.19 × 10⁻²** |
| `'feetReach' in DEFAULT_WEIGHTS` / `'captureScale' in DEFAULT_WEIGHTS` | **false / false** |

**Two readings.** The first line is the refutation and the second is what stops it being a refutation of the whole
step: the constant is dead in the shipped design and alive the moment the weights are set, so the round's question is
answerable but only on an arm that sets them. The tests assert both, and the non-vacuity bound is the one that would
have caught a `captureOmega` that fell through a type guard — 3.4a's own first build did exactly that.

## 3. (B) The lean's own divergence rate, by every definition that has one

| **[M]** rad/s, 306 schedule points, medians in brackets | the SHIPPED plant | the TWO-BODY plant | two/shipped | against `line` |
|---|---|---|---|---|
| `line` = `√(g/L)` — a point mass, feet nailed down (what ships) | 3.4174–4.2233 (**3.8849**) | the same | 1.0000 | 1.0000 |
| `fixed` = `√(m g L / (J + m L²))` — the body's own inertia, feet still nailed | 3.4174–4.2233 (3.8849) | 3.1614–3.8395 (**3.5587**) | 0.9160 | **0.9160** |
| `solved` = `√(C₁₁ m g L)` — the plant's own lateral compliance, the board free | 19.2841–23.9523 (**21.9711**) | 7.6443–8.6045 (**8.2290**) | **0.3745** | **5.6555 / 2.1182** |
| the plant's **whole** `θ̈` per `θ` (`A[3][2]`), rad/s² per rad | −641.4 to −147.0 (−378.8) | −92.1 to −27.1 (−59.9) | — | **positive at 0 of 306** |
| the plant's largest real **unstable eigenvalue** of its own 10×10 `A` | 0.4226–7.1585 (3.8213) | 0.3397–6.0141 (2.3513) | 0.6153 | 0.9836 / 0.6053 |
| … the share of that eigenvector's own norm on `(θ, θ̇)` / on `(φ, φ̇)` | 0.735 / 0.663 | 0.718 / 0.649 | — | — |

**Five readings.**

1. **`√(g/L)` is the rate of a pendulum whose feet are nailed down, and this plant's feet are not nailed down.** On
   the **shipped** plant — a point mass, no body inertia at all — the free reading is already **5.656×** the line,
   because the board's own sway mass is 2.54 kg against the rider's 73 and the lean's own weight shoves the board
   out from under the feet. **The ω₀ in the cost function was never this plant's.**
2. **The body's inertia moves the held reading by 8.4 % and the free one by a factor of 2.67.** `0.9160` and
   `0.3745` [M] — and `1/0.3745 = 2.670 = √7.13`, which is Part 1 §6 reading 3's seven-fold bank inertia, arrived at
   from the other side. **P4 and P5 both held**, at 2.67× and 8.4 %.
3. **The held reading is the mass matrix's own bank diagonal and nothing else, and that is the one quantity a
   diagonal honestly is.** `|√(m g h / M₁₁) − fixed| = 0.0000` at all 306 points on both plants [M, tested]. Stated
   because this folder has twice read a diagonal of `A` as a physical quantity it was not: a diagonal **is** the
   coordinate's inertia **with the others held**, which is exactly the definition `fixed` carries and exactly what
   `solved` does not.
4. **The plant's own whole lean coefficient is negative everywhere, so the quantity ω₀ is supposed to be does not
   exist on this plant with the sign the formula needs.** The ankle's 800 N·m/rad spring is in the plant at every
   tick and beats gravity by one to two orders. The capture point is a theorem about a body falling about a support
   under gravity alone; the internal model's lean is a **sprung** coordinate. **I am not going to call any of the
   three "the right one" from the matrices.**
5. **The plant's unstable mode is a coupled one, so it is not a lean rate.** Three-quarters of its eigenvector sits
   on the lean and two-thirds on the board, at 0.42–7.16 rad/s. Its median, 3.821, happens to sit within 1.7 % of the
   line's 3.885 on the shipped plant. **I will not net that against reading 1.** They are two quantities and this
   folder has made that mistake in both directions already.

## 4. (B) What the correction does to the gains, before any ride

| **[M]** the two weights ON, `plant`'s constant against `point`'s, 306 points | the SHIPPED plant | the TWO-BODY plant |
|---|---|---|
| `\|ΔK\| / \|K\|` | 0.0119–2.1237 (**0.1795**) | 0.0074–0.2858 (**0.1064**) |
| the ankle's own gain on the **bank** | 0.7709–1.1367 (0.9496) | 0.8642–1.0098 (0.9510) |
| the ankle's own gain on the bank's **rate** | 0.4602–1.0289 (**0.6828**) | 0.6738–0.9911 (**0.8262**) |
| the capture row's own `θ̇` coefficient, m per rad/s (tall / crouch / Compress) | line **0.2458 / 0.1673 / 0.1302**; solved **0.0435 / 0.0296 / 0.0230** | fixed **0.2657 / 0.1826 / 0.1432**; solved **0.1098 / 0.0790 / 0.0639** |

**Two readings.** A faster ω₀ weights the lean's **rate** less, so the corrected cost asks the ankle for **32 % less
gain on the bank rate** on the shipped plant and 17 % less on the two-body one, with the gain on the bank itself
within 5 %. And the capture row's `θ` coefficient is `L` in all four — §5's kinematic reading, in the row itself.

## 5. (B) The bank limit is kinematic, and that is half the brief gone

`feetReach / L` is the lean at which the capture point leaves the feet. The capture point's own lean coefficient is
where the centre of mass sits over the feet: `h sin θ`, about `h θ`. **A rigid body's centre of mass sits at `h`
whatever its own inertia about it is**, so the limit is the same for a point mass and for a body with any `J`, and
the shipped `stateScale[2] × (L_tall / L)` ranking carries no inertia to correct. Measured in the row itself: the
`θ` coefficient is **0.8400 / 0.6500 / 0.5500 m per rad** — exactly `L` — in all three modes and on both plants, and
every other entry of the row is 0 [M, tested]. The limits themselves are **8.87° / 11.46° / 13.54°** against the
shipped ranking's **2.86° / 3.70° / 4.38°**, which is 3.2n's own "the ranking, not the level" and is not touched here.

**So Part 1 §8 item 1 names two constants and one of them was not a constant of the body at all.** *The brief's half
that called itself settled is the half that was wrong, for the seventh consecutive round.*

## 6. (B) The fall, every arm — the owner's bar first

| **[M]** median s (span), ×/× the arm above | shipped plant: off → point → fixed → plant | two-body plant: off → point → fixed → plant |
|---|---|---|
| **the owner's low speed, deck (18)** | **1.033** → **1.267** → 1.267 → **1.217** | **1.033** → **0.850** → 0.850 → **0.883** |
| the same, world (18) | 0.767 → 1.233 → 1.233 → 1.133 | 0.733 → 0.600 → 0.600 → **0.983** |
| unsteered, deck (24) | 1.183 → **4.317** → 4.317 → 4.000 | 1.450 → 4.050 → 3.950 → 3.933 |
| unsteered, world (24) | 0.950 → **4.467** → 4.467 → 3.317 | 1.283 → 3.883 → 3.983 → 3.883 |
| steered, deck (18) | 3.067 → **1.967** → 1.967 → 2.033 | 2.500 → **1.300** → 1.300 → **1.667** |
| **Compress, every cell** | **6 of 6 / 8 of 8 in all four** | **6 of 6 / 8 of 8 in all four** |

**Five readings.**

1. **The bar is not met and it is not close.** 18 of 18 on the owner's cell in all eight arms; Compress 6 of 6 in all
   eight; **1 008 of 1 008 rides over the forty-eight arms ended**. **P6 held.**
2. **The weights are a factor of three to four on the straight arms and a third off the held turn, on both plants.**
   ×3.65 and ×4.70 unsteered; ×0.64 and ×0.52 steered. **That is the same trade every repair this folder has
   measured** — and it is the *weights*, measured in 3.2j and 3.2n and rejected there on the same shape of evidence.
3. **Turning the weights on is better than leaving them off on the shipped plant's own low-speed cell and WORSE on the
   two-body plant's.** 1.033 → 1.267 and 0.767 → 1.233 against 1.033 → 0.850 and 0.733 → 0.600 [M]. **P8 is refuted
   on one plant and held on the other**, which is the second time this round a prediction split by plant.
4. **Correcting the constant lengthens the ride where the ride is shortest and shortens it where it is longest — on
   the plant it was derived for.** On the two-body plant `plant` against `point` is longer on the owner's deck cell
   (×1.04), on its world twin (**×1.64**) and on the held turn (**×1.28**), level unsteered world and ×0.97 unsteered
   deck. On the **shipped** plant it is shorter in four cells of five (×0.96, ×0.92, ×0.93, ×0.74) and longer in one
   (×1.03) [M]. **Four of five each way, in opposite directions, by the plant the constant was read from** — which is
   the round's own best evidence that consistency between the cost and the plant is a real effect. **It is also five
   cells, not a population of cells, and I am not going to call it a mechanism.**
5. **`fixed` is `point` on the shipped plant, byte for byte, and that is a control rather than a result.** With no
   body the held reading **is** the point mass's, so the two arms must be one arm: **1 260 ride-column reads over six
   cells, 0 mismatches** [M], the assertion written before the columns were read. On the two-body plant they differ
   in every cell.

## 7. (B) The rows, per arm — and the row six rounds called immovable

| **[M]** per-run medians, unsteered deck 24 | lean row | roll row | one-step bank-rate residual | lean sign | roll sign |
|---|---|---|---|---|---|
| shipped plant, shipped cost (3.3p's own) | 3.540 | **10.050** | 2.552 | 0.696 | **0.338** |
| shipped plant + the weights, `point` | 4.764 | **2.622** | 4.925 | 0.674 | **0.673** |
| shipped plant + the weights, `plant` | 4.565 | 4.449 | 4.888 | 0.645 | 0.618 |
| two-body plant, shipped cost (3.4a's own) | 1.638 | 9.087 | 1.097 | 0.716 | 0.321 |
| two-body + the weights, `point` | 1.026 | 2.259 | 1.051 | 0.702 | 0.679 |
| two-body + the weights, **`fixed`** | **0.899** | **2.135** | **0.982** | 0.719 | 0.680 |
| two-body + the weights, `plant` | 1.137 | 2.957 | 1.270 | 0.669 | 0.643 |

| **[M]** the common one-second window, 0.2–1.0 s, **nobody fallen in 192 runs** | lean row | roll row | residual | roll sign |
|---|---|---|---|---|
| shipped plant, shipped cost | 3.190 | 9.774 | 2.948 | 0.354 |
| shipped plant + the weights, `point` | 4.650 | **9.418** | 4.822 | 0.500 |
| two-body plant, shipped cost | 1.301 | 6.512 | 1.244 | 0.417 |
| two-body + the weights, `point` | **0.740** | **2.944** | 0.788 | 0.583 |
| two-body + the weights, `fixed` | 0.746 | 3.105 | **0.750** | 0.583 |
| two-body + the weights, `plant` | 0.825 | 3.510 | 0.823 | 0.563 |

**Six readings.**

1. **The roll row's error and its sign are not properties of the model alone.** The model is byte-identical across
   the four cost arms — Φ, Γ and the ledger's own controls unchanged, asserted and read — and the roll row still
   falls from 10.050 to 2.622 and its sign crosses a coin. **Six rounds have cleared the inertias, the side force,
   the rail schedule, the speed clamp, the free-versus-held table, the body's shape and the conditioning on the
   premise that the roll row is the model's; part of it is where the controller takes the rider.**
2. **And at nine seconds that part is most of it on the shipped plant and about half of it on the two-body one.** The
   common window is the instrument: the shipped plant keeps **×1.04** of a ×3.83 and the two-body plant **×2.21** of a
   ×4.02 [M]. **P9 refuted on one plant, held on the other.** *The arm with a body in its plant is the arm where the
   gains themselves buy a better row; the arm without one only rides somewhere gentler.*
3. **The weights buy the lean row and the residual only on the plant that has the body.** Lean row with the weights
   on: **worse in 3 of 5 cells** on the shipped plant (3.540 → 4.764, 3.310 → 4.290, 3.833 → 4.931) and **better in
   4 of 5** on the two-body plant; the one-step bank-rate residual **worse in 4 of 5** shipped and **better in 5 of 5**
   two-body [M]. **The consistency that buys the rows is the plant's having a body at all, not which ω₀ is used.**
4. **The best rows this folder has measured are `two-fixed`'s, and I will not call them a better plant.** 0.899 /
   2.135 / 0.982 with both signs above a coin, against Part 1's 1.039 / 10.066 / 0.884 — but those were scored as a
   counterfactual on the **shipped** ride and these are scored on **their own**, which is 2.7× longer and visits
   different states. **Both are printed; neither is the other**, which is Part 1 §9 reading 3's own warning applied to
   this round.
5. **The most plant-consistent ω₀ is the worst of the three on the rows and the best of the three on the fall where
   the fall is shortest.** `plant` reads 1.137 / 2.957 / 1.270 against `fixed`'s 0.899 / 2.135 / 0.982, and rides
   longer than both on the owner's world cell (0.983 against 0.600) and on the held turn (1.667 against 1.300) [M].
   **Those two facts point opposite ways and I am not going to resolve them with an argument.**
6. **The rider is not riding less.** §0 sentence 9's numbers: the game's own lean and roll accelerations roughly
   double in the weighted two-body arms while the measured rail halves. A relative error that falls while its
   denominator doubles is not a quiet ride.

## 8. What I refuted

- **The brief's own premise, as written**: *"the cost function's two point-mass constants — the smallest honest step,
  and the only one that could turn a better plant into a better ride."* **Neither constant is in the shipped cost
  function** (§2, worst entry exactly 0 over 306 points), so correcting them cannot turn anything into a better ride
  until two weights that 3.2j and 3.2n each measured and rejected are turned on. **Seventh consecutive round to find
  its error in the half its brief called settled.**
- **Half of "two point-mass constants"**: `feetReach / L` is **kinematic** and carries no inertia (§5), so there was
  one constant, not two.
- **The size and the ownership of the one that was real**: `√(g/L)` is **5.656×** out on the **shipped** plant and
  **2.118×** out on the two-body one (§3). The defect is not something Part 1 created; Part 1 made it **2.7× smaller**.
- **My own P8, on one plant.** I predicted the two weights would be worse than leaving them off on the owner's
  low-speed cell on **both** plants, because that is what 3.2j and 3.2n measured in the game. On the shipped plant
  they are **better** (1.033 → 1.267 deck, 0.767 → 1.233 world). On the two-body plant they are worse. **A prediction
  that splits by plant is a prediction I should not have written as one sentence.**
- **My own P9, on one plant, and it is the round's most useful refutation.** I predicted the roll row's whole gain
  would be the trajectory. On the shipped plant it is (×1.04 of ×3.83). **On the two-body plant 55 % of it survives a
  window nobody falls in**, so the gains themselves do buy a better roll row there — which no round of this folder
  has measured before.
- **A documentation defect in the brief's own quoted sentence** (§1 R3): `feetReach` does **not** set `captureScale`,
  and the file said both.
- **My own first reading of the Canyon byte check, refuted by my own control within the hour.** From a run that had
  silently imported a kept `.sea` I wrote that Part 1's published hashes were stale. **A fresh spin-up reproduces them
  exactly, on `main` and on this branch, on both arms** (§11b). The stale thing was the state file in a shared
  scratchpad, and the brief's own instruction to read the "spun up on the CPU" line is what exposed it.
- **"Six rounds say the roll row does not move."** It moves, by 2–4× and across its sign, with the plant
  byte-identical (§7). What has not moved is the roll row **at a fixed trajectory on the shipped plant** — which is a
  narrower statement than the one the folder has been carrying.

## 9. What I will not claim

- **I will not claim the owner's bar is any closer.** 1 008 of 1 008, Compress in every arm, the low-speed deck cell
  at 1.033 s shipped against 1.267 at best and **0.850 at worst**.
- **I will not claim the two weights should ship.** They are a factor of 3.7 on straight running and a **third off
  the held turn**, and 3.2j and 3.2n each rejected them in the game on the lower stances' saved shove, which this
  round did not re-measure.
- **I will not claim which ω₀ is right.** Three definitions, 5.7× apart, the plant's own whole lean coefficient
  negative at 306 of 306 points, and the best-on-the-rows arm (`fixed`) and the best-on-the-fall-where-it-matters arm
  (`plant`) are different arms.
- **I will not claim the roll row's gain is a repair.** Half of it is the trajectory even on the two-body plant, and
  all of it is on rides that are three to four times longer than the ones the row was measured on before.
- **I will not claim anything from five cells as a mechanism** — §6 reading 4's four-of-five-each-way is a direction,
  not a population of spots, and the low-world arm's own ledger control still degrades as Part 1 §11 says.
- **I will not claim the live `ω₀` in `HumanBalance` is wrong.** It is right for the rider the game has (a point
  mass); it becomes wrong exactly when Part 1 §8 item 3 is done.
- **Carried, not mine, not touched**: `steadyTurn`'s `ref.u[0]` peaking at 2 675°; the `cos³` added-mass frame
  defect; `AttachedRider.frame`'s 70° bank clamp at three sites; the roll row per source against the game (Part 1 §8
  item 2); the game's own rider as two bodies (item 3).
- **No bot ride is offered as evidence of feel anywhere in this document.**

## 10. The controls

**C1, the state is a read**: the reconstruction pushed back through the controller's own `C`, **peak over every tick
of every one of the 1 008 runs: exactly 0**; tick spacing **0.000e+0 s** off `CONTROL_STEP` [M].

**C2, the plant is untouched by the cost**: `Φ` and `Γ` identical across all four cost arms on both plants, at the
schedule point the test reads, and `K` different in all of them [tested]. Over the rides, the ledger's own control
(`−deckTotal` against the game's own `φ̇` change) reads **0.009–0.046 (0.020)** on the shipped arm and
**0.005–0.050 (0.026)** on the two-body one — 3.3o's, 3.3p's and Part 1's own spans.

**C3, the fix cannot move the shipped rider**: `captureOmega: 'fixed'` and `'solved'` on `DEFAULT_WEIGHTS` against the
shipped design's `K`, **306 of 306 points, worst entry exactly 0** [M, tested].

**C4, and it is not vacuous**: with the two weights on, the same change moves `K` by at least **1.19 × 10⁻²** relative
at every one of the 306 points [M, tested], and the `?riderCost` values are named exhaustively in `AttachedRider`
rather than passed through, because 3.4a's own first build had a value fall into the default arm.

**C5, `fixed` is `point` with no body, in the matrices and in the ride**: `captureOmega(y, g, 'fixed')` equals
`'line'` to twelve decimals on every plant without a body [tested], the designs are `toEqual`-identical [tested], and
**ridden, 1 260 column reads over six cells with 0 mismatches** [M] — written as an assertion before the columns were
read.

**C6, the held reading is the mass matrix's own diagonal**: `|√(m g h / M₁₁) − fixed| = 0.0000` at all 306 points on
both plants [M], and `'solved'` is `√(C₁₁ m g h)` off `lateralCompliance` to twelve decimals [tested].

**C7, the groups still sum to the row**: peak **6.8 × 10⁻¹²** (roll) and **7.1 × 10⁻¹²** (bank) over every live tick
of every run of every one of the forty-eight arms [M].

**C8, 3.3p and Part 1 reproduced on this tree, which is what makes §6 and §7 comparisons**: the shipped arms' roll row
**10.050 / 9.366 / 2.725 / 7.420 / 4.035**, lean row **3.540 / 3.310 / 3.833 / 3.722 / 8.298**, bank-rate residual
**2.552 / 3.097 / 4.620 / 3.634 / 5.131**, roll sign **0.338 / 0.333 / 0.579 / 0.378 / 0.605** and falls
**1.183 / 0.950 / 1.033 / 0.767 / 3.067 s** — **every one 3.3p's published figure to the digit**; and the two-body
arms' falls **1.450 / 1.283 / 1.033 / 0.733 / 2.500 s** — **every one Part 1 §9's, to the digit** [M].

**C9, a positive control predicted before it ran**: §0 sentence 8's common window. I predicted the roll row's gain
would mostly vanish there. It vanished on one plant and did not on the other, which is why it is a control and not a
decoration.

**C10, the capture row's own support**: every entry outside `θ` and `θ̇` is **0** in all three modes at all three
stances, and the two-argument call is the shipped row byte for byte [tested].

## 11. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`: **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`: **exit 0**
- the probes type-checked **separately** on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/plant.ts`, `docs/research/new-rider/3.4/cost.ts`, `src/physics/rollModel.ts`,
  `src/physics/predictiveBalance.ts`, `src/physics/AttachedRider.ts`, `src/physics/bankLedger.ts` and `@types/node`
  (672 files). **It found three unused-binding errors in this round's own probe**, which are fixed.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **58 files, 634 passed, 21 expected fail** — Part 1's 630 plus this round's four.
  `vitest run src/game src/scene/rig`: **70 files, 735 passed** — Part 1's 734 plus the switch's own.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail** —
  identical to Part 1's.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: this round touches no solver, no wave and no spot file,
  and its one `SurfZoneSimulation.ts` change is one more optional config field threaded to the rider.
- **the shipped rider is proved unchanged with every switch off**: the five shipped arms reproduce 3.3p's published
  rows and falls to the digit (C8), and the correction itself is byte-identical on the shipped weights over all 306
  schedule points (C3).

### 11b. The Canyon byte check — it passes, and reading the "spun up" line is what made it mean anything

`src/` changed (ten files, three of them tests), so the check was run with the brief's three reads **done** rather
than assumed: the wrapper prepends `globalThis.location = { search: … }` to the bundle, the grid line is read, and the
**"spun up on the CPU in … s" line is read** so that no kept `.sea` is imported silently.

| **[M]** 3 600 steps | grid | spin-up | snapshots | state |
|---|---|---|---|---|
| **fresh**, Canyon B (`?canyonWaves=true`), **this branch** | 400 × 451 | **44.4 s** | **`a367d938f15fa934`** | **`9e5831f80e38abd9`** |
| **fresh**, Canyon B, **`main` at `99854a51`**, tree clean | 400 × 451 | 47.9 s | `a367d938f15fa934` | `9e5831f80e38abd9` |
| **fresh**, the default Canyon, **this branch** | 400 × 507 | **68.7 s** | **`ea3d57a4d49f4b48`** | **`a1a2555739210f96`** |
| *the first attempt*, Canyon B, **a kept `.sea` imported** (no spin-up line), this branch | 400 × 451 | — | `d236d12d682dc4f6` | `ab2156bcafecc1c0` |
| *the same kept `.sea`* on **`main`**, as the control | 400 × 451 | — | `d236d12d682dc4f6` | `ab2156bcafecc1c0` |
| *the same kept `.sea`*, the default Canyon, branch **and** `main` | 400 × 507 | — | `a8ac71b70eac2add` | `6319ed883e54b32e` |

**All four fresh hashes are the brief's own references, to the character** — Canyon B `a367d938f15fa934` /
`9e5831f80e38abd9` on **both** the branch and a clean `main`, and the default Canyon `ea3d57a4d49f4b48` /
`a1a2555739210f96`. **The check passes.**

**And the way it nearly did not is worth the three lines.** The first run printed **no "spun up" line**, so it had
imported a kept `.sea` from the scratchpad path Part 1's own run names — a path **another session has been writing
benches into**, so the state there was no longer Part 1's — and it produced hashes that match neither reference.
I wrote, from that run alone, that *"the reference is stale"*. **It is not: a fresh spin-up on `main` reproduces it
exactly, and so does the branch's.** What was stale was the kept state. **The brief's instruction to read the spin-up
line is the whole reason that was caught**, and the control that settled it was branch-against-`main` on the **same**
sea (identical on both arms) followed by a fresh spin-up on each. The raw record of all four runs, in order, is
`results/34b/34b-canyon-byte-check.txt`.

**And it cannot differ, for a reason that is read and not inferred**: every behavioural line of this round is behind
`DesignWeights.captureScale` and `DesignWeights.feetReach`, which no default sets (§2, worst entry exactly 0 over all
306 schedule points), `captureOmega`'s `'line'` branch is `Math.sqrt(gravity / y.height)` — the expression that
shipped — and `riderCostSwitch()` returns `{}` for every address but its own three values.

## 12. Files (3.4b)

- `src/physics/predictiveBalance.ts` — `CaptureOmega` and **`captureOmega()`**, the one place in the cost function
  that holds a lean divergence rate, with its three definitions each stated and each derivable from the plant it is
  handed; `captureRow`'s fourth argument (`'line'` by default, so the two-argument call is byte for byte the row that
  shipped); `DesignWeights.captureOmega`; `COST_FEET_REACH`, `COST_CAPTURE_SCALE` and `costWeights()`, the switch's
  two weights at the values 3.2n and 3.2j measured; and the corrections to `DesignWeights.feetReach`'s own comment
  (§1 R3 — it does **not** set `captureScale`, and the ω₀ in the sentence that followed was the nailed-feet one).
- `src/physics/AttachedRider.ts` — `AttachedRiderOptions.riderCost`, reaching the same weights route `waterHeel` and
  `riderBody` do, with the three values **named exhaustively** rather than passed through.
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts` (`riderCostSwitch`), `src/main.ts` — the switch's own chain and its pin for online rooms.
- `src/physics/predictiveBalance.test.ts`, `src/game/PhysicalMode.test.ts` — **four new tests**: the correction is
  byte-identical on the shipped weights over all 306 schedule points **and** non-vacuous with the two weights on; the
  three definitions each against their own statement (including `fixed` against the mass matrix's own bank diagonal
  and `fixed` ≡ `line` with no body); the capture row's own support and its `L` coefficient in every mode (§5's
  kinematic reading); and the switch's address with its room pin.
- `docs/research/new-rider/3.4/cost.ts` — **the round's own matrix probe**: the liveness column, the five candidate
  ω₀ with the two reads that say what the plant's own instability is, the gains both ways, and the capture row and
  bank limit per stance. Read-only.
- `docs/research/new-rider/3.3/plant.ts` — step 3.3p's probe, extended with **`COST=point|fixed|plant`** so the
  ridden arm is the same probe on the same cells, and with the arm's own ω₀ printed in every run's row so no arm's
  number is ever reported against another arm's constant.
- `docs/research/new-rider/3.4/results/34b/` — the forty-eight arms as `.jsonl` and `.txt`, `34b-summary.txt`,
  `34b-omega.txt`/`.jsonl`, `34b-canyon-byte-check.txt` and `34b-predictions.md` (every prediction as written before
  its read, each with its own falsification, plus the four reads R1–R4 made before anything ran, and P9 written
  after the forty arms and before the control that tests it).
- `docs/research/new-rider/3.4/README.md` — this Part.

## 13. For the owner, in plain words — and the shot list

**I was sent to fix two numbers in his balance's rulebook. One of them was not broken, and neither of them is
switched on.**

**One: the two numbers live in two rules the balance does not use.** His balance scores every possible move against a
list of what it minds — how far he is leaning, how fast, how hard his ankle is working. Two extra items were written
for that list in earlier rounds and **neither was kept**: one that says each stance has its own lean limit, and one
that scores where his weight is heading rather than only where it is. They are in the code, with their measurements,
switched off. So "fix the two constants in those rules" cannot change the rider that ships **at all** — and I proved
that rather than argued it: with the fix applied, his gains come out identical at all 306 points of the table he
reads, to the last bit.

**Two: of the two numbers, only one was ever about his body.** The other one is where his weight sits over his feet,
and that is the same distance whether you model him as a weight on a stick or as a real body — **it is geometry, not
inertia**. So last round's "two point-mass constants" was one.

**Three: and the one that was real was already five times wrong before last round touched anything.** The number is
how fast a lean runs away from you. The rulebook says **3.9 a second**. On the plant that *ships* — a weight on a
stick, as it always was — it is **22 a second**, because his board weighs two and a half kilos sideways and his lean
shoves it out from under his feet. Last round's two-body plant made it **8**. So last round did not create this
problem: **it made it two and a half times smaller.**

**Four: and I cannot tell you which number is right, because the lean in his model does not actually run away.** His
ankle is a stiff spring in that model and it always wins: the model's own lean coefficient is **negative at every one
of the 306 table points**, on both plants. The whole idea the number comes from — a body toppling about its feet
under gravity alone — **is not what his model describes.** So I shipped all three readings as a switch and let the
riding decide, instead of picking one with an argument.

**Five: and then the real result, which I did not go looking for.** When I turned those two unused rules **on**, the
straight ride went from **1.2 seconds to 4.3** — three and a half times — and the held turn got a third *shorter*.
That is the trade this track has measured a dozen times. But the thing worth your attention is the other half:
**the board's half of the model, the half I told you last round was now the whole problem, got four times more
accurate and started getting the direction of the board's roll right more often than a coin** — and the model itself
did not change by one byte. Only the gains did. **Part of what six rounds have blamed on the model is where the
controller takes him.** I then built the control that tests that: on a one-second window nobody falls in, the gain
**vanishes** on the old plant and **half of it survives** on the two-body one. So: on the plant with a real body in
it, better gains really do buy a better model; on the old plant, he was just riding somewhere gentler.

**Six: your bar is not met, and on your own slow cell one of these arms is worse than what ships.** Getting into
position slowly in Compress: still six of six, and the median time is **1.033 s shipped**, 1.267 with the rules on,
**0.850** with the rules on top of the two-body plant. One thousand and eight test rides this round, every one ended
inside nine seconds.

**My honest summary: the step I was sent to do was half a step, it is measured, and the fall did not move. The thing
I would chase next is the accident — that the gains move the board's half of the model at all.**

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot, and `?rider=new&feltFrame=deck` as always.

1. **`?rider=new&feltFrame=deck&riderCost=point`, no stick, just glide.** The bench says he stays up **three and a
   half times longer** than what ships. **That is the biggest ride effect this track has produced, and it comes from
   two rules two earlier rounds rejected** — on probes, not on your ride. **Does he feel steadier, or does he feel
   like he is refusing to turn?** That is the question those two rounds answered with "it costs the lower stances
   their save", and your ride is the only thing that can overrule them.
2. **The same, and hold a turn.** The bench says the held turn goes from 3.07 s to 1.97 — **a third shorter**. If the
   turn gives way much earlier, that is this number and it is the reason not to ship these two rules.
3. **`?riderBody=two&riderCost=plant` against `?riderBody=two&riderCost=point`.** This is the actual question I was
   sent to answer — the corrected constant against the old one, on the plant that has a body. The bench says the
   difference is **tens of per cent, not a factor**: the corrected one rides **longer** on your own slow cell and on
   a held turn and slightly shorter running straight. **Can you feel a difference at all?** If you cannot, that is
   worth knowing: it would say the constant is not where the next effort goes.
4. **`?riderBody=two&riderCost=fixed` once.** On the shipped plant this is **byte-identical** to `point` (1 260
   machine comparisons, 0 mismatches) — on the two-body plant it is the arm with **the best model accuracy this whole
   investigation has recorded** (lean row 0.899, board row 2.135, both signs better than a coin). **If the best
   numbers feel worst, I want to know that before I chase them further.**
5. **And a ruling, not a ride.** What I think step three is, in order:
   - **The accident, which is the biggest thing this round found: the gains move the board's row.** Six rounds have
     been measuring the roll row as if it were a property of the model. It is partly a property of the trajectory,
     and on the two-body plant about half of it is the gains themselves. **I would measure the roll row per source
     against the game at a FIXED trajectory** — the same recorded ride, three sets of gains — which is Part 1 §8
     item 2's measurement with this round's control built into it. That is the first thing I would do.
   - **The two rules themselves, properly, against your bar and not against a probe.** They are the factor of three
     and a half in the ride and nobody has ridden them. Shot 1 and shot 2 are that measurement, and they are yours.
   - **The game's own rider as two bodies** (Part 1 §8 item 3). It is still the only thing that fixes the two reads
     Part 1 made worse, it is still the route the parked duck-dive work named as the faithful one — **and this round
     found that the live capture point in the game's own rider, the one that lowers his knees, carries the same
     nailed-feet ω₀. It is right today because the game's rider is a weight on a stick. It stops being right the day
     item 3 lands**, so it belongs in item 3's own scope.
   **My recommendation is the first, then your two shots, then the third. Your call.**

## 14. The deletions column, read line by line

`git diff --cached --numstat origin/main` before the commit, read file by file: **113 files, 5 637 insertions and 19
deletions** (this section included), and **all nineteen deletions read one by one.**

```
 22   2  docs/research/new-rider/3.3/plant.ts
 31   1  src/game/PhysicalMode.test.ts
 18   0  src/game/PhysicalMode.ts
  2   2  src/main.ts
 23   3  src/physics/AttachedRider.ts
  8   0  src/physics/RideSession.ts
115   1  src/physics/predictiveBalance.test.ts
 76   9  src/physics/predictiveBalance.ts
  1   1  src/wave/SurfZoneRunner.ts
 10   0  src/wave/SurfZoneSimulation.ts
```

`src/game/PhysicalMode.ts` (**+18**), `src/physics/RideSession.ts` (**+8**), `src/wave/SurfZoneSimulation.ts`
(**+10**), `docs/research/new-rider/3.4/cost.ts` (**+294**), `docs/research/new-rider/3.4/README.md` (**+557**) and
the **101** files under `results/34b/` are **insertions only, zero deletions.**

- **`predictiveBalance.ts`, 9** — and **five of them are the only real removal of the round**: the `rollModel` import
  (re-added with `lateralCompliance`); **the five comment lines of `DesignWeights.feetReach` that said it sets
  `captureScale` and that each stance's ω₀ is `√(g/L)`** — both false of the code (§1 R3), replaced by what the code
  does and by the measured rate; `captureRow`'s signature (re-added with `mode`); `row[3] = y.height / Math.sqrt(…)`
  (re-added as `y.height / captureOmega(y, gravity, mode)`, whose `'line'` branch **is** that expression); and
  `design`'s own `captureRow(y, 9.81, nState)` call (re-added with `w.captureOmega ?? 'line'`).
- **`AttachedRider.ts`, 3**: the `predictiveBalance` import (re-added with `costWeights` and `type CaptureOmega`) and
  the two lines of the `weights` expression, both re-added with `costs` in them and nothing dropped —
  `options.balance?.weights`, `heelWeights`, `bodyWeights` and `DEFAULT_WEIGHTS` are all still there, in order.
- **`plant.ts`, 2**: its `predictiveBalance` import (re-added with `captureOmega`) and the summary's header line
  (re-added with the arm's own `body` and `cost`).
- **`main.ts`, 2**: the online-room override comment and the override line itself, both re-added with `riderCost` in
  them.
- **`PhysicalMode.test.ts`, 1**, **`predictiveBalance.test.ts`, 1** and **`SurfZoneRunner.ts`, 1**: one import line
  each and the config spread line, each re-added with one more name.

**A token-by-token check was run rather than trusted to the eye**: every identifier on every one of the nineteen
deleted lines was searched for across the round's insertions. **Every code identifier is present.** The only tokens
that are not are twelve ordinary English words (`carries`, `coming`, `difference`, `express`, `faster`, `going`,
`larger`, `matters`, `most`, `radians`, `share`, `delay`) and all twelve are from the five removed comment lines —
the intended removal named above.
